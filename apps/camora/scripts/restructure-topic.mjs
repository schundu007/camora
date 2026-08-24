#!/usr/bin/env node
/**
 * Restructure one topic from "essays in figure captions" into chapters.
 *
 * The DevOps catalogue was authored with prose stored inside
 * `visualizations[].description` — entries that carry no image at all, just a
 * 1.5–3 KB essay or an interview Q&A list. Rendered, those became captions
 * under a figure, so 212 of 232 topics had no Deep Dive sections and the page
 * read as a stack of captions rather than a chapter.
 *
 * This performs the mechanical half of the fix, which is the half that is
 * error-prone by hand: drop the image-less visualization entries, and insert
 * `topics: [...]` and `quickFire: [...]` in their place. The prose itself is
 * rewritten by hand — this only moves the furniture.
 *
 * Usage:
 *   node scripts/restructure-topic.mjs <datafile> <topicId> <payload.json>
 *
 * payload.json:
 *   { "sections": [{ "title": "...", "content": "..." }],
 *     "quickFire": [{ "q": "...", "a": "..." }] }
 *
 * Both keys are optional; omitting one leaves any existing value alone.
 */
import fs from 'node:fs';

/**
 * Scan JS source from `i`, returning the index just past the region that
 * balances `open`/`close`. Quote- and template-literal-aware, because the
 * topic data is almost entirely backtick strings containing braces and
 * brackets that must not be counted.
 */
function matchDelimiter(src, i, open, close) {
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        // A template literal can nest ${ ... } holding arbitrary code; the
        // topic data does not use them, so treat the quote as opaque.
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  throw new Error(`unbalanced ${open}${close} from index ${i}`);
}

/** Split a JS array body into its top-level elements. */
function splitElements(body) {
  const out = [];
  let i = 0, start = 0, depth = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < body.length) {
        if (body[i] === '\\') { i += 2; continue; }
        if (body[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(body.slice(start, i)); start = i + 1; }
    i++;
  }
  if (body.slice(start).trim()) out.push(body.slice(start));
  return out;
}

/** Render a JS string literal, preferring a template literal for prose. */
function jsString(s) {
  if (s.includes('\n')) {
    return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
  }
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const [dataFile, topicId, payloadFile] = process.argv.slice(2);
if (!dataFile || !topicId || !payloadFile) {
  console.error('usage: restructure-topic.mjs <datafile> <topicId> <payload.json>');
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
let src = fs.readFileSync(dataFile, 'utf8');

// Locate the topic object: find its id line, then walk back to the `{` that opens it.
const idRe = new RegExp(`\\n(\\s*)id: '${topicId.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}',`);
const idM = src.match(idRe);
if (!idM) { console.error(`topic id not found: ${topicId}`); process.exit(1); }
const idIdx = idM.index + 1;
const objStart = src.lastIndexOf('{', idIdx);
const objEnd = matchDelimiter(src, objStart, '{', '}');
let obj = src.slice(objStart, objEnd);

// ── visualizations: drop the image-less essay entries ──────────────────
const vizKey = obj.indexOf('visualizations:');
let removed = 0, kept = 0;
if (vizKey !== -1) {
  const arrStart = obj.indexOf('[', vizKey);
  const arrEnd = matchDelimiter(obj, arrStart, '[', ']');
  const elements = splitElements(obj.slice(arrStart + 1, arrEnd - 1));
  const keepers = elements.filter((el) => {
    // `image:` or `svg:` at the entry's own level means it is a real figure.
    const isFigure = /(^|\n)\s*(image|svg|video):/.test(el);
    if (isFigure) kept++; else removed++;
    return isFigure;
  });
  // arrEnd is just past `]`; the source comma that follows is preserved by
  // the slice, so the rebuilt text must not carry one of its own.
  const rebuilt = keepers.length
    ? `visualizations: [${keepers.join(',').replace(/\s+$/, '')}\n    ]`
    : 'visualizations: []';
  obj = obj.slice(0, vizKey) + rebuilt + obj.slice(arrEnd);
}

// ── insert topics[] / quickFire[] ──────────────────────────────────────
function renderSections(sections) {
  const body = sections.map((s) =>
    `      {\n        title: ${jsString(s.title)},\n        content: ${jsString(s.content)},\n      }`).join(',\n');
  return `    topics: [\n${body},\n    ],\n`;
}
function renderQuickFire(qf) {
  const body = qf.map((x) => `      { q: ${jsString(x.q)}, a: ${jsString(x.a)} }`).join(',\n');
  return `    quickFire: [\n${body},\n    ],\n`;
}

/** Replace an existing top-level array key, or return null if absent. */
function replaceKey(source, key, rendered) {
  const re = new RegExp(`\\n(\\s*)${key}: \\[`);
  const m = source.match(re);
  if (!m) return null;
  const arrStart = source.indexOf('[', m.index);
  let end = matchDelimiter(source, arrStart, '[', ']');
  if (source[end] === ',') end++;
  return source.slice(0, m.index + 1) + rendered.replace(/\n$/, '') + source.slice(end);
}

for (const [key, rendered] of [
  ['topics', payload.sections ? renderSections(payload.sections) : null],
  ['quickFire', payload.quickFire ? renderQuickFire(payload.quickFire) : null],
]) {
  if (!rendered) continue;
  const replaced = replaceKey(obj, key, rendered);
  if (replaced) { obj = replaced; continue; }
  // Not present — insert after the visualizations array, or before `id` as a
  // fallback so the key always lands inside the object.
  const anchor = obj.indexOf('visualizations:');
  if (anchor !== -1) {
    let insertAt = matchDelimiter(obj, obj.indexOf('[', anchor), '[', ']'); // past `]`
    if (obj[insertAt] === ',') insertAt++;                                   // past `],`
    obj = obj.slice(0, insertAt) + '\n' + rendered.replace(/\n$/, '') + obj.slice(insertAt);
  } else {
    const line = obj.indexOf('\n', obj.indexOf('id:'));
    obj = obj.slice(0, line + 1) + rendered + obj.slice(line + 1);
  }
}

fs.writeFileSync(dataFile, src.slice(0, objStart) + obj + src.slice(objEnd));
console.log(`${topicId}: kept ${kept} figure(s), removed ${removed} essay-caption(s)` +
  `${payload.sections ? `, ${payload.sections.length} section(s)` : ''}` +
  `${payload.quickFire ? `, ${payload.quickFire.length} quick-fire` : ''}`);
