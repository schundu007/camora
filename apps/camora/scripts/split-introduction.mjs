#!/usr/bin/env node
/**
 * Split a long `introduction` into chapters at its own headings.
 *
 * Many DevOps topics have no `topics[]` but carry a 1.5-3 KB introduction
 * already organised under `##` headings — "What a release manifest is", "Why
 * LKG exists", "The promotion pipeline". The chapters exist; they are in the
 * wrong field, so the whole topic renders as one undifferentiated Overview
 * card with no contents entries and nothing to navigate.
 *
 * This moves each heading's body into a chapter of the same name, leaving the
 * Overview as the lead-in it was meant to be. Text is preserved exactly.
 *
 * Only touches topics that have no chapters yet and whose introduction has at
 * least two headings with enough body to stand alone.
 *
 * Usage: node scripts/split-introduction.mjs <datafile> [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const MIN_CHAPTER = 220;   // shorter than this is a lead-in, not a chapter
const MIN_CHAPTERS = 2;    // one heading is not a structure

const dataFile = process.argv[2];
const dry = process.argv.includes('--dry');
if (!dataFile) { console.error('usage: split-introduction.mjs <datafile> [--dry]'); process.exit(1); }

const abs = path.resolve(dataFile);
const mod = await import(pathToFileURL(abs).href);
const topics = Object.values(mod).filter(Array.isArray).flat().filter((t) => t && t.id && t.title);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const RESTRUCTURE = path.join(scriptDir, 'restructure-topic.mjs');
const TMP = path.join(scriptDir, '.split-payload.json');

/** Split markdown into { heading, body } blocks at level-2/3 headings. */
function blocks(md) {
  const out = [];
  let cur = { heading: null, lines: [] };
  for (const line of md.split('\n')) {
    const h = line.match(/^#{2,3}\s+(.+?)\s*$/);
    if (h) { out.push(cur); cur = { heading: h[1], lines: [] }; }
    else cur.lines.push(line);
  }
  out.push(cur);
  return out.map((b) => ({ heading: b.heading, body: b.lines.join('\n').trim() }));
}

let changed = 0, skipped = 0;
for (const t of topics) {
  if ((t.topics || []).length) { skipped++; continue; }
  if (!t.introduction) { skipped++; continue; }

  const parts = blocks(t.introduction);
  const headed = parts.filter((p) => p.heading && p.body.length >= MIN_CHAPTER);
  if (headed.length < MIN_CHAPTERS) { skipped++; continue; }

  // The lead-in is any preamble plus a leading "Overview" heading, which is a
  // summary rather than a chapter. Everything after becomes a chapter.
  const lead = [];
  const chapters = [];
  for (const p of parts) {
    if (!p.heading) { if (p.body) lead.push(p.body); continue; }
    const isOverview = /^(overview|introduction)$/i.test(p.heading);
    if (isOverview && !chapters.length) { lead.push(p.body); continue; }
    if (p.body.length < MIN_CHAPTER && chapters.length) {
      // Too short to stand alone — fold into the previous chapter.
      chapters[chapters.length - 1].content += `\n\n**${p.heading}**\n\n${p.body}`;
      continue;
    }
    if (p.body.length < MIN_CHAPTER) { lead.push(`**${p.heading}**\n\n${p.body}`); continue; }
    chapters.push({ title: p.heading, content: p.body });
  }
  if (chapters.length < MIN_CHAPTERS) { skipped++; continue; }

  const introduction = lead.join('\n\n').trim();
  console.log(`${t.id}: ${chapters.length} chapter(s) from the introduction` +
    `${introduction ? `, ${introduction.length}-char lead kept` : ', lead now empty'}`);
  chapters.forEach((c) => console.log(`    § ${c.title} (${c.content.length})`));
  if (dry) { changed++; continue; }

  fs.writeFileSync(TMP, JSON.stringify({ sections: chapters, introduction }));
  execFileSync('node', [RESTRUCTURE, abs, t.id, TMP], { stdio: 'pipe' });
  changed++;
}
if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
console.log(`\n${dry ? '[dry] ' : ''}${changed} topic(s) split, ${skipped} skipped.`);
