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
const CAPTION_MAX = 900;   // above this, a caption is really a chapter
const LEAD_MAX = 420;      // a lead paragraph short enough to keep as caption
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

  // A real figure whose "caption" runs to thousands of characters is a
  // chapter with a picture at the top, not a caption. Deep Dive sections
  // render their own diagram, so move the figure into the chapter it
  // illustrates: the reader gets the diagram beside the prose explaining it,
  // instead of a wall of text under a picture in a separate section.
  const figures = (t.visualizations || []).filter((v) => v.image || v.svg || v.video);
  const promoted = [];
  for (const v of figures) {
    const desc = v.description || '';
    if (desc.length <= CAPTION_MAX) continue;          // a genuine caption
    if (!v.image) continue;                             // only raster/vector refs move
    const para = desc.indexOf('\n\n');
    // Lead paragraph stays as the caption when it is short enough to read as
    // one; the rest becomes the chapter body.
    const caption = para > 0 && para <= LEAD_MAX ? desc.slice(0, para).trim() : '';
    const rest = caption ? desc.slice(para).trim() : desc;
    promoted.push({ title: v.title, image: v.image, content: rest, caption });
  }

  const payload = {};
  const promotedImages = new Set(promoted.map((p) => p.image));
  const newSections = [
    ...promoted.map((p) => ({ title: p.title, image: p.image, content: p.content })),
    ...sections,
  ];
  // Idempotent: never re-add a chapter this topic already has.
  const have = new Set((t.topics || []).map((s2) => s2.title));
  const fresh = newSections.filter((s2) => !have.has(s2.title));
  if (fresh.length) payload.sections = [...(t.topics || []), ...fresh];

  if (quickFire) {
    const haveQ = new Set((t.quickFire || []).map((x) => x.q));
    const freshQ = quickFire.filter((x) => !haveQ.has(x.q));
    if (freshQ.length) payload.quickFire = [...(t.quickFire || []), ...freshQ];
  }

  // Rebuild visualizations: keep only genuine figures with a real caption.
  // Promoted figures move into their chapter; essay entries are gone.
  const keepViz = (t.visualizations || []).filter(
    (v) => (v.image || v.svg || v.video) && !promotedImages.has(v.image));
  if (keepViz.length !== (t.visualizations || []).length) payload.visualizations = keepViz;

  if (!payload.sections && !payload.quickFire && !payload.visualizations) { skipped++; continue; }

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
