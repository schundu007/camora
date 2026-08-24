#!/usr/bin/env node
/**
 * Move essay-captions out of `visualizations[]` and into chapters.
 *
 * 212 of 232 DevOps topics were authored with their prose inside
 * `visualizations[].description` on entries carrying no figure at all. The
 * renderer draws those as captions under a diagram, so the substance of a
 * topic sat below a picture and the Deep Dive section was empty — the reason
 * the category does not read like a book.
 *
 * This is the mechanical pass. For every image-less visualization entry:
 *
 *   - a "Quick-fire interview answers — X" entry, whose body is a run of
 *     Q:/A: pairs, becomes `quickFire: [{ q, a }]`
 *   - anything else becomes a `topics[]` chapter, title and prose preserved
 *
 * Text is moved verbatim; the wording is upgraded separately, per batch. Real
 * figures (image/svg/video) stay in `visualizations[]` and keep their caption.
 *
 * Usage:
 *   node scripts/convert-essay-captions.mjs <datafile> [--dry] [--only id,id]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const dataFile = args[0];
const dry = args.includes('--dry');
const onlyArg = args.indexOf('--only');
const only = onlyArg !== -1 ? new Set(args[onlyArg + 1].split(',')) : null;
if (!dataFile) { console.error('usage: convert-essay-captions.mjs <datafile> [--dry] [--only ids]'); process.exit(1); }

const abs = path.resolve(dataFile);
const mod = await import(pathToFileURL(abs).href);
const topics = Object.values(mod).filter(Array.isArray).flat().filter((t) => t && t.id && t.title);

/**
 * Parse a quick-fire essay body into Q/A pairs. The convention in the data is
 * a lead-in line, then alternating "Q: ..." / "A: ..." blocks which may wrap
 * over several lines.
 */
function parseQuickFire(body) {
  const out = [];
  let cur = null, field = null;
  for (const line of body.split('\n')) {
    const q = line.match(/^Q:\s*(.*)$/);
    const a = line.match(/^A:\s*(.*)$/);
    if (q) { if (cur && cur.a) out.push(cur); cur = { q: q[1], a: '' }; field = 'q'; continue; }
    if (a) { if (!cur) cur = { q: '', a: '' }; cur.a = a[1]; field = 'a'; continue; }
    if (cur && line.trim()) cur[field] = `${cur[field]} ${line.trim()}`.trim();
  }
  if (cur && cur.a) out.push(cur);
  return out.filter((x) => x.q && x.a);
}

const isQuickFire = (v) =>
  /quick[- ]?fire/i.test(v.title || '') && parseQuickFire(v.description || '').length >= 3;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const restructure = path.join(scriptDir, 'restructure-topic.mjs');
const tmp = path.join(scriptDir, '.convert-payload.json');

let changed = 0, skipped = 0;
const { execFileSync } = await import('node:child_process');

for (const t of topics) {
  if (only && !only.has(t.id)) continue;
  const essays = (t.visualizations || []).filter((v) => !v.image && !v.svg && !v.video && v.description);
  if (!essays.length) { skipped++; continue; }

  const sections = [];
  let quickFire = null;
  for (const v of essays) {
    if (isQuickFire(v)) {
      const parsed = parseQuickFire(v.description);
      quickFire = [...(quickFire || []), ...parsed];
    } else {
      sections.push({ title: v.title, content: v.description });
    }
  }

  const payload = {};
  if (sections.length) payload.sections = [...(t.topics || []), ...sections];
  if (quickFire) payload.quickFire = [...(t.quickFire || []), ...quickFire];
  if (!payload.sections && !payload.quickFire) { skipped++; continue; }

  console.log(`${t.id}: ${sections.length} chapter(s)` +
    (quickFire ? `, ${quickFire.length} quick-fire` : '') +
    ` from ${essays.length} caption(s)`);
  if (dry) { changed++; continue; }

  fs.writeFileSync(tmp, JSON.stringify(payload));
  execFileSync('node', [restructure, abs, t.id, tmp], { stdio: 'pipe' });
  changed++;
}
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
console.log(`\n${dry ? '[dry] ' : ''}${changed} topic(s) converted, ${skipped} already clean.`);
