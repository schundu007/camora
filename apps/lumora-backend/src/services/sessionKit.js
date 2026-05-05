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

export async function buildSessionKit({ userId, prepData }) {
  if (!userId || !prepData?.activeCompany) return { skipped: true };
  const company = prepData.activeCompany;
  const doc = prepData.data?.[company];
  if (!doc) return { skipped: true };
  const haystack = [doc.jd, doc.resume, doc.coverLetter].filter(Boolean).join('\n\n');
  if (!haystack.trim()) return { skipped: true };
  const seeds = extractSeeds(haystack);
  if (seeds.length === 0) return { skipped: true };

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

  const kit = { seeds, chunks, builtAt: Date.now() };
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
