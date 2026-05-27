#!/usr/bin/env node
// apps/ascend-backend/scripts/migrate-problems-json.js
// One-shot: reads problems-full.json and seeds coding_problems with source='custom'.
// Safe to re-run (ON CONFLICT DO NOTHING).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, closePool } from '../src/lib/shared-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '../../camora/src/data/capra/problems-full.json');

const raw = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const entries = Object.entries(raw); // [slug, {slug, topic, description, boilerplate, ...}]

let inserted = 0;
let skipped = 0;

for (const [key, prob] of entries) {
  const slug = prob.slug || key;
  // Derive a human-readable title from slug: "two-sum" → "Two Sum"
  const title = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const topicTags = prob.topic
    ? JSON.stringify([{ name: prob.topic, slug: prob.topic }])
    : JSON.stringify([]);

  // Convert boilerplate {lang: code} → [{lang, langSlug, code}]
  const codeSnippets = prob.boilerplate
    ? JSON.stringify(
        Object.entries(prob.boilerplate).map(([langSlug, code]) => ({
          lang: langSlug.charAt(0).toUpperCase() + langSlug.slice(1),
          langSlug,
          code,
        }))
      )
    : JSON.stringify([]);

  const content = prob.description
    ? `<p>${prob.description.replace(/\n/g, '</p><p>')}</p>`
    : null;

  const { rowCount } = await query(
    `INSERT INTO coding_problems
       (slug, title, content, topic_tags, code_snippets, source)
     VALUES ($1, $2, $3, $4, $5, 'custom')
     ON CONFLICT (slug) DO NOTHING`,
    [slug, title, content, topicTags, codeSnippets]
  );

  if (rowCount > 0) inserted++;
  else skipped++;
}

console.log(`\nMigration complete`);
console.log(`  Inserted : ${inserted}`);
console.log(`  Skipped  : ${skipped} (already existed)`);
console.log(`  Total    : ${entries.length}`);

await closePool();
