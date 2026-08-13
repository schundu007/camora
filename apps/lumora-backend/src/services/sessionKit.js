/**
 * Session-warm prefetch kit.
 *
 * On Prep save, derive a small set of "seed" queries from the JD and
 * resume — most-distinctive technical terms — and run hybrid retrieval
 * against KB+user docs for each seed. Merge, dedupe by id, take top-30,
 * store as JSONB in lumora_session_kit.
 *
 * At question time, inference can read this kit (5ms vs 150-1100ms for
 * a live query) and re-rank the kit against the actual question. The
 * full kit goes inside the Anthropic prompt-cache prefix, so the
 * cache stays hot across the whole interview.
 */
import { query } from '../lib/shared-db.js';
import { hybridSearchKb, hybridSearchUserDocs } from './hybridRetrieval.js';

const KIT_SIZE = 30;
const PER_SEED_KB = 8;
const PER_SEED_USER = 4;
const SEED_MAX = 8; // bound the parallel search count

// Crude keyword extractor — pulls 2-4-word noun phrases of capitalized
// terms, library names, and acronyms. Good enough as a seed; not a
// full NLP step.
const TECHNICAL_TOKEN = /\b([A-Z][a-zA-Z0-9+#]+(?:[-/][A-Za-z0-9+#]+)*|[A-Z]{2,}(?:\.js)?|kubernetes|terraform|graphql|grpc|kafka|redis|postgres|mongodb|prometheus|grafana|opentelemetry|argo|flux|cilium|airflow|spark|flink|kotlin|rust|golang|typescript|jenkins|gitlab|github actions|circleci|cloudbuild|cloudfunctions|lambda|fargate|cloudrun|cosmos db|dynamodb|firestore|bigquery|snowflake|databricks|s3|gcs|azure blob|sqs|sns|pubsub|eventbridge|kinesis)\b/g;

function extractSeeds(text) {
  if (typeof text !== 'string') return [];
  const tokens = (text.match(TECHNICAL_TOKEN) || []).map((t) => t.toLowerCase());
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SEED_MAX)
    .map(([t]) => t);
}

function dedupeById(chunks, max) {
  const seen = new Set();
  const out = [];
  for (const c of chunks) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Drop the stored kit. Used both on explicit prep deletion and whenever a
 * rebuild cannot produce a kit — see the skip paths in buildSessionKit.
 */
export async function clearSessionKit(userId) {
  if (!userId) return;
  await query('DELETE FROM lumora_session_kit WHERE user_id = $1', [userId]);
}

export async function buildSessionKit({ userId, prepData }) {
  // EVERY early return must clear the existing kit first.
  //
  // These used to return { skipped: true } and leave the previous kit in place,
  // which let a kit outlive the prep data it was derived from. Switching the
  // active company to one with no JD/resume yet hit exactly that path: the
  // build skipped, the OLD company's kit stayed, and since retrieve() prefers
  // the warm kit and short-circuits live retrieval, every answer for the new
  // company was still grounded on the old one's material. A stale kit is worse
  // than no kit — no kit merely costs a live query.
  if (!userId) return { skipped: true };
  const company = prepData?.activeCompany;
  const doc = company ? prepData.data?.[company] : null;
  // Study docs are the densest source of distinctive technical terms a user
  // ever supplies — an interview kit names the exact systems the round will
  // cover. Seeding only from jd/resume/coverLetter left the kit blind to them.
  // Bounded: seeds are counted, not concatenated in full, but a 600 KB GitHub
  // fetch would still make the regex scan pointlessly expensive.
  const STUDY_SCAN_CHARS = 200_000;
  const studyText = Array.isArray(doc?.studyDocs)
    ? doc.studyDocs.map((d) => (typeof d?.content === 'string' ? d.content : '')).join('\n\n').slice(0, STUDY_SCAN_CHARS)
    : '';
  const haystack = doc
    ? [doc.jd, doc.resume, doc.coverLetter, doc.prepMaterials, studyText].filter(Boolean).join('\n\n')
    : '';
  const seeds = haystack.trim() ? extractSeeds(haystack) : [];
  if (seeds.length === 0) {
    await clearSessionKit(userId).catch(() => {});
    return { skipped: true, cleared: true };
  }

  // Run hybrid search against each seed in parallel, then merge.
  const all = [];
  await Promise.all(seeds.map(async (seed) => {
    const [kb, user] = await Promise.all([
      hybridSearchKb(seed, PER_SEED_KB).catch(() => []),
      hybridSearchUserDocs(userId, seed, PER_SEED_USER).catch(() => []),
    ]);
    all.push(...kb, ...user);
  }));
  const chunks = dedupeById(all, KIT_SIZE);

  // `company` is stamped so a kit is always traceable to the workspace it came
  // from — without it, a kit grounded on the wrong company is indistinguishable
  // from a correct one in the DB or in the retrieval logs.
  const kit = { company, seeds, chunks, builtAt: Date.now() };
  const version = Date.now();
  await query(
    `INSERT INTO lumora_session_kit (user_id, kit, prep_state_version, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET kit = EXCLUDED.kit,
           prep_state_version = EXCLUDED.prep_state_version,
           updated_at = NOW()`,
    [userId, JSON.stringify(kit), version],
  );
  return { kitSize: chunks.length, seedCount: seeds.length, version };
}

export async function readSessionKit(userId) {
  const r = await query(
    'SELECT kit, updated_at FROM lumora_session_kit WHERE user_id = $1',
    [userId],
  );
  if (r.rows.length === 0) return null;
  return r.rows[0].kit;
}
