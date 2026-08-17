// apps/ascend-backend/scripts/import-doocs-problems.js
//
// Backfills coding_problems from a local checkout of https://github.com/doocs/leetcode.
//
// Why this exists: LeetCode's GraphQL API returns `content: null` for every paid-only
// question unless the caller holds a Premium session cookie, so scrape-leetcode.js left
// all ~770 premium problems in the library as a bare title. The doocs repo carries the
// English statement HTML, examples, constraints and a worked editorial for those same
// problems, keyed by LeetCode problem number.
//
// Usage:
//   DATABASE_URL=… node scripts/import-doocs-problems.js --repo /path/to/doocs [options]
//
//   --repo <path>     Local doocs/leetcode checkout (required)
//   --dry-run         Report what would change; write nothing
//   --force-content   Overwrite `content` even where we already have LeetCode's copy
//                     (default: only fill rows whose content is missing)
//   --limit <n>       Process only the first n problems (smoke tests)
//
// Matching is by LeetCode problem number (lc_id), falling back to slug.

import fs from 'fs';
import path from 'path';
import { query, closePool } from '../src/lib/shared-db.js';
import { parseDoocsReadme } from './lib/parseDoocsReadme.js';
import { deriveSnippets } from './lib/deriveStarterCode.js';

const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const opt = name => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};

const REPO = opt('--repo');
const DRY = flag('--dry-run');
const FORCE_CONTENT = flag('--force-content');
const LIMIT = parseInt(opt('--limit') ?? '0', 10) || 0;

if (!REPO) {
  console.error('Missing --repo <path to doocs/leetcode checkout>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL env var');
  process.exit(1);
}

const solutionDir = path.join(REPO, 'solution');
if (!fs.existsSync(solutionDir)) {
  console.error(`No solution/ directory under ${REPO} — is that a doocs/leetcode checkout?`);
  process.exit(1);
}

// ── Collect every README_EN.md under solution/<range>/<NNNN.Title>/ ──────────
function collectReadmes() {
  const out = [];
  for (const range of fs.readdirSync(solutionDir)) {
    const rangeDir = path.join(solutionDir, range);
    if (!fs.statSync(rangeDir).isDirectory()) continue;
    for (const problem of fs.readdirSync(rangeDir)) {
      const file = path.join(rangeDir, problem, 'README_EN.md');
      if (fs.existsSync(file)) out.push(file);
    }
  }
  return out.sort();
}

console.log('Scanning doocs checkout…');
let files = collectReadmes();
if (LIMIT) files = files.slice(0, LIMIT);
console.log(`Found ${files.length} problem READMEs`);

// ── Parse ────────────────────────────────────────────────────────────────────
const parsed = [];
let parseFailures = 0;
for (const file of files) {
  try {
    const rec = parseDoocsReadme(fs.readFileSync(file, 'utf8'));
    if (rec) parsed.push(rec);
    else parseFailures++;
  } catch (err) {
    parseFailures++;
    console.warn(`  [parse] ${file.replace(solutionDir, '')}: ${err.message}`);
  }
}
console.log(`Parsed ${parsed.length} problems (${parseFailures} unparseable)`);

// ── Index what we already have, so we only touch what needs touching ─────────
const { rows: existingRows } = await query(
  `SELECT id, lc_id, slug, content, topic_tags, code_snippets FROM coding_problems`
);
const byLcId = new Map();
const bySlug = new Map();
for (const r of existingRows) {
  if (r.lc_id != null) byLcId.set(r.lc_id, r);
  bySlug.set(r.slug, r);
}
console.log(`DB currently holds ${existingRows.length} problems\n`);

const stats = {
  contentFilled: 0,   // had no statement, now does — the actual bug being fixed
  contentReplaced: 0, // --force-content only
  enriched: 0,        // examples/constraints/editorial added to a row that had a statement
  inserted: 0,        // present in doocs, absent from our library
  unchanged: 0,
  errors: 0,
  snippetsFilled: 0,
};

function hasContent(row) {
  return row?.content != null && row.content.trim() !== '';
}

for (const p of parsed) {
  const existing = byLcId.get(p.lcId) ?? bySlug.get(p.slug);

  const editorial = p.editorial.length ? JSON.stringify(p.editorial) : null;
  const examples = p.examples.length ? JSON.stringify(p.examples) : null;
  const constraints = p.constraints.length ? JSON.stringify(p.constraints) : null;
  const topicTags = p.topicTags.length ? JSON.stringify(p.topicTags) : null;
  // The starter template the platform would have shown, rebuilt from the reference
  // signatures. Without it the solver is told the I/O contract is unknown and
  // invents a shape instead of filling in the class the grader calls.
  const derived = deriveSnippets(p.editorial);
  const snippets = derived.length ? JSON.stringify(derived) : null;

  try {
    if (!existing) {
      if (!DRY) {
        await query(
          `INSERT INTO coding_problems
             (lc_id, slug, title, difficulty, content, examples, constraints, follow_up,
              editorial, topic_tags, company_tags, hints, code_snippets, is_premium,
              source, content_source, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'[]'::jsonb,'[]'::jsonb,
                   COALESCE($12::jsonb,'[]'::jsonb),$11,
                   'leetcode','doocs',NOW())
           ON CONFLICT (slug) DO NOTHING`,
          [p.lcId, p.slug, p.title, p.difficulty ?? 'Medium', p.content, examples,
           constraints, p.followUp, editorial, topicTags, p.isPremium, snippets]
        );
      }
      stats.inserted++;
      continue;
    }

    const needsContent = !hasContent(existing) || FORCE_CONTENT;
    const replacing = hasContent(existing) && FORCE_CONTENT;

    if (!DRY) {
      // COALESCE on the existing side keeps LeetCode's own copy authoritative unless
      // it is missing (or --force-content is set); the enrichment columns are always
      // written because nothing has ever populated them.
      await query(
        `UPDATE coding_problems SET
           content      = CASE WHEN $2 THEN $3 ELSE COALESCE(NULLIF(content, ''), $3) END,
           examples     = COALESCE($4::jsonb, examples),
           constraints  = COALESCE($5::jsonb, constraints),
           follow_up    = COALESCE($6, follow_up),
           editorial    = COALESCE($7::jsonb, editorial),
           topic_tags   = CASE
                            WHEN topic_tags IS NULL
                              OR jsonb_typeof(topic_tags) <> 'array'
                              OR jsonb_array_length(topic_tags) = 0
                            THEN COALESCE($8::jsonb, topic_tags)
                            ELSE topic_tags
                          END,
           code_snippets = CASE
                             WHEN code_snippets IS NULL
                               OR jsonb_typeof(code_snippets) <> 'array'
                               OR jsonb_array_length(code_snippets) = 0
                             THEN COALESCE($9::jsonb, code_snippets)
                             ELSE code_snippets
                           END,
           content_source = CASE WHEN $2 OR content IS NULL OR content = ''
                                 THEN 'doocs' ELSE content_source END,
           updated_at   = NOW()
         WHERE id = $1`,
        [existing.id, needsContent, p.content, examples, constraints,
         p.followUp, editorial, topicTags, snippets]
      );
    }

    const hadSnippets = Array.isArray(existing.code_snippets) && existing.code_snippets.length > 0;
    if (snippets && !hadSnippets) stats.snippetsFilled++;

    if (replacing) stats.contentReplaced++;
    else if (!hasContent(existing)) stats.contentFilled++;
    else if (editorial || examples || constraints) stats.enriched++;
    else stats.unchanged++;
  } catch (err) {
    stats.errors++;
    console.warn(`  [db] ${p.lcId} ${p.slug}: ${err.message}`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`${DRY ? 'Would apply' : 'Applied'}:`);
console.log('─'.repeat(52));
console.log(`  statements filled (were empty) : ${stats.contentFilled}`);
console.log(`  statements replaced (--force)  : ${stats.contentReplaced}`);
console.log(`  enriched (examples/editorial)  : ${stats.enriched}`);
console.log(`  starter templates filled       : ${stats.snippetsFilled}`);
console.log(`  new problems inserted          : ${stats.inserted}`);
console.log(`  unchanged                      : ${stats.unchanged}`);
console.log(`  errors                         : ${stats.errors}`);
console.log('─'.repeat(52));

if (!DRY) {
  const { rows } = await query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE content IS NOT NULL AND content <> '') AS with_content,
           COUNT(*) FILTER (WHERE examples IS NOT NULL)    AS with_examples,
           COUNT(*) FILTER (WHERE constraints IS NOT NULL) AS with_constraints,
           COUNT(*) FILTER (WHERE editorial IS NOT NULL)   AS with_editorial,
           COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(NULLIF(code_snippets::text,'null')::jsonb,'[]'::jsonb)) > 0) AS with_starter,
           COUNT(*) FILTER (WHERE is_premium AND (content IS NULL OR content = '')) AS premium_still_empty
    FROM coding_problems`);
  console.log('\nLibrary coverage now:', rows[0]);
}

await closePool();
