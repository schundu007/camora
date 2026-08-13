/**
 * Seed curated STAR stories into lumora_user_stories for one user.
 *
 * Why this exists: today the ONLY writer of that table is POST /api/v1/stories/parse,
 * which asks Haiku to extract stories from raw resume text. That is fine as a
 * default, but it has two properties you do not want the day before a specific
 * interview — it re-derives generic stories, and it cannot know which of them
 * matters for THIS interviewer. storyAnchor.js then injects whatever it picked
 * into every behavioral answer.
 *
 * This script writes a hand-curated set instead, so the anchor injects the
 * intended story for each archetype. Same table, same shape, same read path —
 * see storyAnchor.loadBestStory().
 *
 * Usage:
 *   node apps/lumora-backend/scripts/seed-user-stories.js \
 *     --email chundubabu@gmail.com \
 *     --file apps/lumora-backend/scripts/data/nvidia-gfn-stories.json
 *
 *   ... --dry-run     validate and print, write nothing
 *
 * Requires DATABASE_URL.
 */
import { readFileSync } from 'node:fs';
import { query, closePool } from '../src/lib/shared-db.js';

// Must match ARCHETYPES in routes/stories.js — storyAnchor matches on these
// exact strings, so a typo silently makes a story unreachable.
const ARCHETYPES = [
  'Conflict', 'Leadership', 'Failure', 'Ambiguity',
  'Influence', 'Innovation', 'Collaboration', 'Growth',
  'Career', 'Fit',
];

function parseArgs(argv) {
  const args = { email: null, userId: null, file: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--email') args.email = argv[++i];
    else if (argv[i] === '--user-id') args.userId = Number(argv[++i]);
    else if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

/** Mirrors the sanitisation in routes/stories.js so seeded rows are identical
 *  in shape to parsed ones — otherwise the anchor reads fields that were never
 *  truncated and the prompt block grows unboundedly. */
function sanitize(raw) {
  const stories = raw.map((s, i) => ({
    id: String(s.id || `story-${i}`).slice(0, 48),
    title: String(s.title || '').slice(0, 80),
    summary: String(s.summary || '').slice(0, 300),
    archetypes: (Array.isArray(s.archetypes) ? s.archetypes : [])
      .filter((a) => ARCHETYPES.includes(a))
      .slice(0, 3),
    impact: String(s.impact || '').slice(0, 80),
  }));

  const problems = [];
  stories.forEach((s, i) => {
    if (!s.title) problems.push(`story ${i}: missing title`);
    if (!s.summary) problems.push(`story ${i}: missing summary`);
    const declared = raw[i].archetypes || [];
    const dropped = declared.filter((a) => !ARCHETYPES.includes(a));
    if (dropped.length) problems.push(`story ${i} (${s.id}): unknown archetype(s) ${dropped.join(', ')}`);
    if (!s.archetypes.length) problems.push(`story ${i} (${s.id}): no valid archetype — unreachable by anchor`);
  });
  return { stories, problems };
}

async function main() {
  const { email, userId, file, dryRun } = parseArgs(process.argv);
  if (!file || (!email && !userId)) {
    console.error('Usage: seed-user-stories.js (--email <addr> | --user-id <n>) --file <json> [--dry-run]');
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const raw = Array.isArray(payload) ? payload : payload.stories;
  if (!Array.isArray(raw) || raw.length === 0) {
    console.error('File must contain a non-empty `stories` array.');
    process.exit(1);
  }

  const { stories, problems } = sanitize(raw);
  if (problems.length) {
    console.error('Validation failed:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  // Report archetype coverage. A gap here means behavioral questions of that
  // kind fall back to the first story, which is usually the wrong one.
  const covered = new Set(stories.flatMap((s) => s.archetypes));
  const missing = ARCHETYPES.filter((a) => !covered.has(a));
  console.log(`${stories.length} stories, ${covered.size}/${ARCHETYPES.length} archetypes covered.`);
  if (missing.length) {
    console.log(`  uncovered (will fall back to "${stories[0].title}"): ${missing.join(', ')}`);
  }
  for (const s of stories) {
    console.log(`  ${s.id.padEnd(28)} [${s.archetypes.join(', ')}]`);
  }

  if (dryRun) {
    console.log('\n--dry-run: nothing written.');
    return;
  }

  let id = userId;
  if (!id) {
    const r = await query('SELECT id, email FROM users WHERE lower(email) = lower($1)', [email]);
    if (r.rows.length === 0) {
      console.error(`No user found for ${email}.`);
      process.exit(1);
    }
    id = r.rows[0].id;
  }

  await query(
    `INSERT INTO lumora_user_stories (user_id, stories_json, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET stories_json = $2::jsonb, updated_at = NOW()`,
    [id, JSON.stringify(stories)],
  );
  console.log(`\nSeeded ${stories.length} stories for user ${id}.`);
  console.log('Note: re-running "Parse stories" from the resume in the UI OVERWRITES this row.');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => closePool().catch(() => {}));
