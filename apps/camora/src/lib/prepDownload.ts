/**
 * Prep packet download — desktop bridge with browser fallback.
 *
 * Desktop path uses Electron IPC:
 *   • PDF — main process renders styled HTML via Chromium printToPDF.
 *   • DOCX — main process generates a real .docx via the `docx` package.
 *
 * Browser path uses real libs (no print dialog hacks):
 *   • PDF — jsPDF rendering paragraphs / headings / lists / code blocks.
 *   • DOCX — `docx` + file-saver in the renderer.
 */

// Loaded lazily on first download — keeps docx + file-saver out of the
// eager LumoraShellPage chunk (static imports caused a Rolldown TDZ crash).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Document: any, Packer: any, Paragraph: any, HeadingLevel: any, TextRun: any,
    AlignmentType: any, Table: any, TableRow: any, TableCell: any, WidthType: any,
    BorderStyle: any, ShadingType: any, Header: any, Footer: any, PageNumber: any,
    _saveAs: any;

async function ensureDocx(): Promise<void> {
  if (Document) return;
  const [docx, fileSaver] = await Promise.all([
    import('docx'),
    import('file-saver'),
  ]);
  ({ Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType,
     Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
     Header, Footer, PageNumber } = docx);
  _saveAs = fileSaver.saveAs;
}

export interface DocxBlock {
  type: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'li' | 'code' | 'field' | 'spacer' | 'table' | 'callout' | 'qa' | 'lead';
  text: string;
  // Only set on 'field' / 'callout' blocks — bold label that prefixes the value.
  label?: string;
  // Only set on 'table' blocks — first row is the header.
  rows?: string[][];
  // Only set on 'qa' blocks — `text` holds the question; `answer` the body.
  answer?: string;
}

export interface PrepSection {
  heading: string;
  blocks: DocxBlock[];
}

interface SectionInput {
  id: string;
  label: string;
  content: any;
}

// ── Tree → blocks ───────────────────────────────────────────────────────
// Recursively walks the prep section payload (which is a deeply nested
// object/array shape from the LLM) and produces a flat blocks list with
// real heading semantics rather than just dumping JSON.
function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// jsPDF's standard fonts (Helvetica/Times/Courier) only support WinAnsi.
// Any code point outside that range renders as a missing-glyph box, which
// users perceive as a "corrupted" PDF. Map the offenders to ASCII before
// the PDF writer sees them.
function pdfSafe(s: string): string {
  return String(s)
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●◦⁃∙·]/g, '*')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '?');
}

// docx XML rejects control chars (U+0000..U+001F except \t \n \r) and the
// non-character pair U+FFFE/U+FFFF. Strip them so the resulting .docx isn't
// rejected by Word as "corrupted".
function docxSafe(s: string): string {
  return String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g, '');
}

// ── Content sanitization ────────────────────────────────────────────────
// LLM payloads are noisy: they embed metadata, version stamps, scoring
// fields, AI disclaimers, markdown markers, JSON-string values, single-
// key wrappers ({data:{...}}), and headings that just echo the section
// label we're already going to print. Dump those raw and the user opens a
// 30-page Word doc full of cruft. Run cleanContent BEFORE valueToBlocks.

const NOISE_KEYS = new Set([
  // identifiers / persistence
  'id', '_id', '__id', 'uuid', 'slug',
  'createdat', 'updatedat', 'created_at', 'updated_at', 'created', 'updated',
  // model / provider plumbing
  'metadata', 'meta', '__type', '_type', 'type_', '_class',
  'version', '_version', 'schema', 'schemaversion',
  'model', 'provider', 'engine', 'runner',
  'tokens', 'tokencount', 'token_count', 'inputtokens', 'outputtokens',
  'reasoning', 'chain_of_thought', 'chainofthought', 'thinking', 'analysis_steps',
  // ranking / status / debug
  'order', 'index', 'position', 'priority', 'rank', 'sortkey',
  'isvisible', 'visible', 'enabled', 'hidden', 'draft',
  'status', 'state', 'done', 'complete', 'completed', 'success',
  'confidence', 'score', 'rating', 'score_breakdown', 'scorebreakdown',
  // raw payload / cache plumbing
  'raw', '_raw', 'rawcontent', 'raw_content', 'raw_text', 'rawtext', 'rawjson',
  'cachekey', 'cache_key', 'hash', '_hash', 'etag',
  'embedding', 'embeddings', 'vector',
]);

const WRAPPER_KEYS = new Set([
  'data', 'content', 'result', 'response', 'output',
  'payload', 'body', 'value', 'item', 'doc', 'document',
]);

const BOILERPLATE_PATTERNS: RegExp[] = [
  /^here['']?s?\s+(is\s+)?(your|the|a|an)\s+/i,
  /^below\s+(is|you['']?ll|are)/i,
  /^this\s+(section|document|guide|packet|brief)\s+(covers|includes|contains|provides)/i,
  /^as\s+(an?\s+)?(ai|llm|language\s+model|assistant)/i,
  /^i\s+(hope|trust)\s+this\s+(helps|is\s+useful)/i,
  /^let\s+me\s+know\s+if/i,
  /^i['']?m\s+(an?|happy\s+to|here\s+to)/i,
  /^please\s+(let\s+me\s+know|note|remember)\s+/i,
  /^certainly[!.]?\s/i,
  /^sure[!.]?\s/i,
  /^absolutely[!.]?\s/i,
  /^great\s+question[!.]/i,
  /^of\s+course[!.]/i,
  /^thank\s+you\s+for/i,
];

const TRAILING_DISCLAIMERS: RegExp[] = [
  /\s*\b(let\s+me\s+know\s+if\s+(you|i\s+can)|i\s+hope\s+(this|that)\s+helps|feel\s+free\s+to|good\s+luck\s+(with|on)|best\s+of\s+luck)[^.!?]*[.!?]?\s*$/i,
  /\s*\bif\s+you\s+(have|need)\s+(any\s+)?(more|further|additional)[^.!?]*[.!?]?\s*$/i,
  /\s*\bplease\s+(don['']?t\s+hesitate|reach\s+out)[^.!?]*[.!?]?\s*$/i,
];

function isLikelyBoilerplate(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  // Whole-line boilerplate (entire short paragraph that's an AI greeting).
  if (t.length < 240 && BOILERPLATE_PATTERNS.some((p) => p.test(t))) return true;
  return false;
}

function cleanString(raw: string): string | null {
  let t = raw.trim();
  if (!t) return null;
  if (isLikelyBoilerplate(t)) return null;
  // Trailing disclaimers — strip even from longer paragraphs.
  for (const p of TRAILING_DISCLAIMERS) t = t.replace(p, '').trim();
  // Markdown bold/italic markers — render as plain text (no inline-style
  // support in our block model). Keep emphasis intent by leaving the word.
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  t = t.replace(/__([^_\n]+)__/g, '$1');
  t = t.replace(/(?<![*\w])\*([^*\n]+)\*(?!\w)/g, '$1');
  t = t.replace(/(?<![_\w])_([^_\n]+)_(?!\w)/g, '$1');
  // Markdown links — keep visible text only.
  t = t.replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, '$1');
  // Leading markdown heading marks inside paragraph text.
  t = t.replace(/^#{1,6}\s+/gm, '');
  // Collapse runs of blank lines and trailing-space lines.
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // Unwrap a fully-quoted string ("...") when it contains no inner quote.
  if (t.length > 1 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    const inner = t.slice(1, -1);
    if (!inner.includes(t[0])) t = inner;
  }
  return t || null;
}

function cleanContent(value: any, parentKey: string | undefined, sectionLabel: string): any {
  if (value == null) return null;
  if (typeof value === 'string') {
    // Re-parse JSON-string values that slipped through.
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return cleanContent(parsed, parentKey, sectionLabel);
      } catch { /* fall through */ }
    }
    return cleanString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    const cleaned = value
      .map((v) => cleanContent(v, parentKey, sectionLabel))
      .filter((v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0));
    // Dedupe identical strings (case-insensitive, whitespace-normalized).
    const seen = new Set<string>();
    const out: any[] = [];
    for (const item of cleaned) {
      const key = typeof item === 'string'
        ? item.toLowerCase().replace(/\s+/g, ' ').trim()
        : JSON.stringify(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    if (out.length === 0) return null;
    return out;
  }

  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const lk = k.toLowerCase().replace(/[_-]/g, '');
      if (NOISE_KEYS.has(lk)) continue;
      if (k.startsWith('_')) continue; // private/internal fields
      const cleaned = cleanContent(v, k, sectionLabel);
      if (cleaned == null) continue;
      if (typeof cleaned === 'string' && !cleaned.trim()) continue;
      if (Array.isArray(cleaned) && cleaned.length === 0) continue;
      // Echo: a key whose humanized name matches its scalar value.
      if (typeof cleaned === 'string' && cleaned.trim().toLowerCase() === humanize(k).toLowerCase()) continue;
      // Echo: a key whose humanized name matches the section label.
      if (typeof cleaned === 'string' && humanize(k).toLowerCase() === sectionLabel.toLowerCase() && cleaned.length < 80) continue;
      out[k] = cleaned;
    }
    const keys = Object.keys(out);
    if (keys.length === 0) return null;
    // Unwrap single-key wrappers like {data:{...}} / {result:[...]}.
    if (keys.length === 1) {
      const only = keys[0].toLowerCase();
      if (WRAPPER_KEYS.has(only)) return out[keys[0]];
      // Section-label echo wrapper: {elevatorPitch:{...}} when label is
      // "Elevator Pitch" — peel one layer so we don't double-print.
      if (humanize(keys[0]).toLowerCase() === sectionLabel.toLowerCase()) return out[keys[0]];
    }
    return out;
  }
  return value;
}

// Strip a heading from the front of a section's blocks if it just repeats
// the section label (which we already rendered as the chapter title).
function dropEchoHeading(blocks: DocxBlock[], sectionLabel: string): void {
  const isHeading = (t: DocxBlock['type']) => t === 'h1' || t === 'h2' || t === 'h3' || t === 'h4';
  while (blocks.length > 0 && isHeading(blocks[0].type) &&
         blocks[0].text.trim().toLowerCase() === sectionLabel.trim().toLowerCase()) {
    blocks.shift();
  }
  // Trailing empties.
  while (blocks.length > 0 && (blocks[blocks.length - 1].type === 'spacer' ||
         (!blocks[blocks.length - 1].text && !blocks[blocks.length - 1].label))) {
    blocks.pop();
  }
}

// Some sections still hit us as a raw JSON string (older cached entries
// from before the parser was hardened). Re-parse so we render the tree
// instead of dumping a wall of escaped JSON text.
function maybeReparse(content: any): any {
  if (typeof content !== 'string') return content;
  const s = content.trim().replace(/^"|"$/g, '');
  if (!s.startsWith('{') && !s.startsWith('[')) return s;
  try {
    return JSON.parse(s);
  } catch {
    try {
      return JSON.parse(s.replace(/\\n/g, '\n').replace(/\\"/g, '"'));
    } catch {
      return s;
    }
  }
}

// ── Type helpers ────────────────────────────────────────────────────────
const isScalar = (v: any) => v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const isPlainObject = (v: any) => v != null && typeof v === 'object' && !Array.isArray(v);
const isScalarArray = (v: any) => Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean');
// "Flat" = every value is a scalar or a flat array of scalars. Renders well
// as a stack of bold-label paragraphs without further nesting.
const isFlatObject = (v: any) =>
  isPlainObject(v) && Object.values(v).every((val) => isScalar(val) || isScalarArray(val));
const isArrayOfFlatObjects = (v: any) =>
  Array.isArray(v) && v.length > 0 && v.every(isFlatObject);

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// When rendering an array of flat objects as numbered items, promote one
// field to be the item title (e.g. "Technology: GitLab CI" becomes "1.
// GitLab CI" so it isn't repeated as a label below). Order matters — first
// match wins.
const TITLE_KEY_PRIORITY = [
  'question', 'name', 'title', 'header', 'topic',
  'technology', 'tech', 'tool', 'language', 'framework',
  'company', 'role', 'position', 'category',
];

// Keys whose values become callout boxes ("Tip", "Coaching note", etc.).
// String values render as the callout body; arrays become bulleted list
// inside the callout.
const CALLOUT_KEYS: Record<string, string> = {
  tip: 'Tip',
  tips: 'Coaching Tips',
  note: 'Note',
  notes: 'Notes',
  coaching: 'Coaching',
  warning: 'Watch Out',
  warnings: 'Watch Out',
  pitfall: 'Pitfall',
  pitfalls: 'Pitfalls',
  reminder: 'Reminder',
  reminders: 'Reminders',
};

function pickItemTitle(obj: Record<string, any>): { key: string; value: string } | null {
  for (const k of TITLE_KEY_PRIORITY) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return { key: k, value: v.trim() };
  }
  return null;
}

function pushFieldOrList(
  label: string,
  value: any,
  blocks: DocxBlock[],
): void {
  if (value == null || value === '') return;
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    if (isScalarArray(value)) {
      blocks.push({ type: 'field', label: label + ':', text: '' });
      for (const it of value) {
        const t = String(it).trim();
        if (t) blocks.push({ type: 'li', text: t });
      }
    } else {
      blocks.push({ type: 'field', label: label + ':', text: '' });
      for (const it of value) {
        if (isPlainObject(it) && isFlatObject(it)) {
          for (const [k, v] of Object.entries(it)) {
            pushFieldOrList(humanize(k), v, blocks);
          }
          blocks.push({ type: 'spacer', text: '' });
        } else {
          valueToBlocks(it, 3, blocks);
        }
      }
    }
    return;
  }
  if (isPlainObject(value)) {
    blocks.push({ type: 'field', label: label + ':', text: '' });
    for (const [k, v] of Object.entries(value)) {
      pushFieldOrList(humanize(k), v, blocks);
    }
    return;
  }
  blocks.push({ type: 'field', label: label + ':', text: String(value).trim() });
}

function valueToBlocks(value: any, depth: number, blocks: DocxBlock[]): void {
  // depth → heading level. Top-level keys want h2 (h1 is the section title);
  // anything deeper becomes h3/h4 so Word's TOC and PDF outline still work.
  const HMAP: Array<DocxBlock['type']> = ['h1', 'h2', 'h3', 'h4', 'h4', 'h4'];
  if (value == null) return;

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return;
    const fence = text.match(/^```[a-z]*\n([\s\S]+?)```$/);
    if (fence) { blocks.push({ type: 'code', text: fence[1].trimEnd() }); return; }
    blocks.push({ type: 'p', text });
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    blocks.push({ type: 'p', text: String(value) });
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return;
    // Pure list of strings → bullets.
    if (value.every((v) => typeof v === 'string')) {
      for (const item of value) {
        const t = item.trim();
        if (t) blocks.push({ type: 'li', text: t });
      }
      return;
    }
    // Q&A array — items with `question` + `answer` keys → render as styled
    // Q/A pairs so the reader's eye lands on the question first. Anything
    // beyond Q/A on the item folds into the answer as a labeled line.
    if (Array.isArray(value) && value.every((it) => isPlainObject(it) && typeof it.question === 'string' && typeof it.answer === 'string')) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i] as Record<string, any>;
        let answer = String(item.answer).trim();
        for (const [k, v] of Object.entries(item)) {
          if (k === 'question' || k === 'answer') continue;
          if (v == null || v === '') continue;
          if (Array.isArray(v) && isScalarArray(v) && v.length > 0) {
            answer += '\n\n' + humanize(k) + ':\n' + v.map((x) => '• ' + String(x)).join('\n');
          } else if (isScalar(v)) {
            answer += '\n\n' + humanize(k) + ': ' + String(v).trim();
          }
        }
        blocks.push({ type: 'qa', text: String(item.question).trim(), answer });
        if (i < value.length - 1) blocks.push({ type: 'spacer', text: '' });
      }
      return;
    }
    // Array of flat objects → numbered book-style entries. NOT tables —
    // a printed book never tabulates narrative content; it uses prose
    // with bold labels. Each item gets:
    //   • a numbered subheading (the title-like field promoted out)
    //   • bold-label paragraphs for every other field, full prose flow
    //   • a thin dotted divider between entries
    // This matches how reference books, manuals, and research briefs
    // present grouped records; the eye scans titles, dives into prose.
    if (isArrayOfFlatObjects(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i] as Record<string, any>;
        const title = pickItemTitle(item);
        const titleText = title ? `${i + 1}. ${title.value}` : `${i + 1}.`;
        blocks.push({ type: 'h3', text: titleText });
        for (const [k, v] of Object.entries(item)) {
          if (title && k === title.key) continue;
          pushFieldOrList(humanize(k), v, blocks);
        }
        if (i < value.length - 1) blocks.push({ type: 'spacer', text: '' });
      }
      return;
    }
    // Mixed array — recurse, separating items with a spacer so the reader
    // can tell where one element ends and the next begins.
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === 'string') blocks.push({ type: 'li', text: item });
      else valueToBlocks(item, depth + 1, blocks);
      if (i < value.length - 1 && !isScalar(item)) blocks.push({ type: 'spacer', text: '' });
    }
    return;
  }

  if (typeof value === 'object') {
    // Flat object → render keys as inline `Label: value` fields, no
    // headings. Stops a {category, relevance, experience, technology}
    // record from blowing up into four h3s per item.
    if (isFlatObject(value)) {
      for (const [k, v] of Object.entries(value)) {
        pushFieldOrList(humanize(k), v, blocks);
      }
      return;
    }
    for (const [k, v] of Object.entries(value)) {
      if (v == null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === 'string' && !v.trim()) continue;
      const calloutLabel = CALLOUT_KEYS[k.toLowerCase()];
      if (calloutLabel) {
        if (typeof v === 'string') {
          blocks.push({ type: 'callout', label: calloutLabel, text: v.trim() });
        } else if (Array.isArray(v) && isScalarArray(v)) {
          blocks.push({ type: 'callout', label: calloutLabel, text: v.map((x) => '• ' + String(x).trim()).join('\n') });
        } else {
          blocks.push({ type: HMAP[Math.min(depth, HMAP.length - 1)], text: humanize(k) });
          valueToBlocks(v, depth + 1, blocks);
        }
        continue;
      }
      // Promote a `summary`/`overview` string at the top of a section to
      // a "lead" paragraph — book-style opener that sets the stage.
      if ((k === 'summary' || k === 'overview' || k === 'intro') && typeof v === 'string' && depth <= 1) {
        blocks.push({ type: 'lead', text: v.trim() });
        continue;
      }
      blocks.push({ type: HMAP[Math.min(depth, HMAP.length - 1)], text: humanize(k) });
      valueToBlocks(v, depth + 1, blocks);
    }
  }
}

export function sectionsToPrepSections(input: SectionInput[]): PrepSection[] {
  return input
    .map((s) => {
      const cleaned = cleanContent(maybeReparse(s.content), undefined, s.label);
      if (cleaned == null) return { heading: s.label, blocks: [] };
      const blocks: DocxBlock[] = [];
      valueToBlocks(cleaned, 1, blocks);
      dropEchoHeading(blocks, s.label);
      return { heading: s.label, blocks };
    })
    .filter((s) => s.blocks.length > 0);
}

// ── HTML for PDF ────────────────────────────────────────────────────────
// Book-style template: cover page, table of contents, chapter openers
// with running page numbers + chapter headers via @page rules. Chromium's
// printToPDF supports @page CSS, paged-media counters, and string-set, so
// the whole thing falls out of the renderer with no per-section wiring.
const PDF_STYLE = `
  @page {
    size: Letter;
    margin: 1in 0.85in 1in 0.85in;
    @bottom-center {
      content: counter(page);
      font-family: -apple-system, "Helvetica Neue", sans-serif;
      font-size: 9pt;
      color: #888;
    }
    @top-right {
      content: string(chapter);
      font-family: -apple-system, "Helvetica Neue", sans-serif;
      font-size: 8.5pt;
      color: #999;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
  }
  @page :first {
    @bottom-center { content: ""; }
    @top-right { content: ""; }
  }
  @page cover {
    margin: 0;
    @bottom-center { content: ""; }
    @top-right { content: ""; }
  }
  @page toc {
    @top-right { content: "Contents"; }
  }

  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Charter", "Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "Times New Roman", serif;
    color: #1a1a1a;
    line-height: 1.65;
    font-size: 11pt;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* ── Cover page ─────────────────────────────────────────────────── */
  .cover { page: cover; page-break-after: always; height: 11in; box-sizing: border-box; padding: 1in 1in; display: flex; flex-direction: column; justify-content: space-between; background: #FAFAF7; }
  .cover-top, .cover-bot { display: flex; align-items: center; gap: 12pt; }
  .cover-bar { width: 60pt; height: 3pt; background: #0047AB; }
  .cover-eyebrow { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 10pt; font-weight: 700; color: #0047AB; letter-spacing: 0.32em; text-transform: uppercase; }
  .cover-mid { display: flex; flex-direction: column; gap: 18pt; }
  .cover-title { font-size: 52pt; font-weight: 700; color: #0a0a0a; line-height: 1.05; letter-spacing: -0.01em; margin: 0; }
  .cover-subtitle { font-size: 16pt; color: #555; font-style: italic; line-height: 1.4; margin: 0; }
  .cover-meta { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 9.5pt; color: #888; letter-spacing: 0.2em; text-transform: uppercase; }
  .cover-brand { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 11pt; font-weight: 700; color: #0a0a0a; letter-spacing: 0.06em; }

  /* ── Table of contents ──────────────────────────────────────────── */
  .toc { page: toc; page-break-after: always; padding-top: 0.4in; }
  .toc-eyebrow { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 10pt; font-weight: 700; color: #0047AB; letter-spacing: 0.32em; text-transform: uppercase; margin-bottom: 8pt; }
  .toc-h { font-size: 36pt; font-weight: 700; color: #0a0a0a; margin: 0 0 28pt; line-height: 1.05; }
  .toc-rule { width: 80pt; height: 3pt; background: #0047AB; margin-bottom: 32pt; }
  .toc-row { display: flex; align-items: baseline; padding: 9pt 0; border-bottom: 0.5pt dotted #ccc; font-size: 12pt; }
  .toc-num { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 9.5pt; color: #0047AB; font-weight: 700; letter-spacing: 0.18em; width: 36pt; }
  .toc-name { flex: 1; color: #1a1a1a; }
  .toc-page { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 10pt; color: #666; }
  .toc-page::after { content: target-counter(attr(href), page); }

  /* ── Chapter opener ─────────────────────────────────────────────── */
  .chapter { page-break-before: always; string-set: chapter attr(data-chapter-name); }
  .chapter-num { font-family: -apple-system, "Helvetica Neue", sans-serif; font-size: 10pt; font-weight: 700; color: #0047AB; letter-spacing: 0.32em; text-transform: uppercase; margin-top: 0.4in; }
  .chapter-title { font-size: 38pt; font-weight: 700; color: #0a0a0a; margin: 10pt 0 16pt; line-height: 1.1; letter-spacing: -0.01em; page-break-after: avoid; }
  .chapter-rule { width: 80pt; height: 3pt; background: #0047AB; margin-bottom: 30pt; }

  /* ── Body typography ────────────────────────────────────────────── */
  h1 { font-size: 22pt; font-weight: 700; margin: 28pt 0 10pt; color: #0a0a0a; page-break-after: avoid; }
  h2 { font-size: 16pt; font-weight: 700; margin: 22pt 0 8pt; color: #0a0a0a; page-break-after: avoid; }
  h3 {
    font-family: -apple-system, "Helvetica Neue", sans-serif;
    font-size: 11pt; font-weight: 700; color: #0047AB;
    text-transform: uppercase; letter-spacing: 0.12em;
    margin: 22pt 0 8pt; page-break-after: avoid;
  }
  h4 { font-size: 12pt; font-weight: 700; color: #333; margin: 16pt 0 4pt; page-break-after: avoid; }
  p  { margin: 0 0 9pt; orphans: 3; widows: 3; }

  .lead {
    font-size: 13pt; line-height: 1.55; color: #2a2a2a; margin: 0 0 18pt;
    padding: 14pt 0 14pt 18pt; border-left: 3pt solid #0047AB;
    font-style: italic;
  }

  ul { margin: 6pt 0 14pt; padding-left: 16pt; }
  li { margin: 3pt 0; padding-left: 4pt; }
  li::marker { color: #0047AB; }

  pre {
    background: #F5F5F0; border-left: 3pt solid #0047AB;
    padding: 10pt 14pt; font-family: "SF Mono", "Menlo", "Consolas", monospace;
    font-size: 9.5pt; margin: 12pt 0; white-space: pre-wrap;
    page-break-inside: avoid;
  }

  .field { margin: 0 0 5pt; font-size: 11pt; }
  .field b { color: #0047AB; font-weight: 700; margin-right: 6pt; }

  .spacer { border-top: 0.5pt dotted #C0C0C0; margin: 14pt 30%; }

  /* ── Tables (Tech Stack etc.) ───────────────────────────────────── */
  table.dt {
    border-collapse: collapse; width: 100%; margin: 12pt 0 18pt;
    font-family: -apple-system, "Helvetica Neue", sans-serif;
    font-size: 10pt; page-break-inside: auto;
  }
  table.dt th {
    background: #0047AB; color: #FFFFFF; font-weight: 700;
    text-align: left; padding: 9pt 11pt; letter-spacing: 0.04em;
    text-transform: uppercase; font-size: 9pt;
  }
  table.dt td {
    padding: 8pt 11pt; border-bottom: 0.5pt solid #E2E8F0;
    vertical-align: top; color: #2a2a2a;
  }
  table.dt tr:nth-child(even) td { background: #F4F7FB; }
  table.dt tr { page-break-inside: avoid; }

  /* ── Callout boxes (Tips, Coaching, Warnings) ───────────────────── */
  .callout {
    margin: 16pt 0; padding: 14pt 18pt 14pt 18pt;
    background: #EEF4FB; border-left: 4pt solid #0047AB;
    page-break-inside: avoid;
  }
  .callout.warn { background: #FFF8EC; border-left-color: #C77A00; }
  .callout-label {
    font-family: -apple-system, "Helvetica Neue", sans-serif;
    font-size: 9pt; font-weight: 700;
    color: #0047AB; letter-spacing: 0.22em;
    text-transform: uppercase; margin-bottom: 7pt; display: block;
  }
  .callout.warn .callout-label { color: #C77A00; }
  .callout-body { font-size: 11pt; line-height: 1.55; color: #2a2a2a; white-space: pre-wrap; }

  /* ── Q & A pairs (HR, Hiring Manager) ───────────────────────────── */
  .qa { margin: 14pt 0 18pt; padding: 0 0 0 16pt; border-left: 3pt solid #C5D4E8; page-break-inside: avoid; }
  .qa-q {
    font-family: -apple-system, "Helvetica Neue", sans-serif;
    font-size: 12pt; font-weight: 700; color: #0a0a0a;
    margin: 0 0 6pt; line-height: 1.4;
  }
  .qa-q-tag {
    display: inline-block; background: #0047AB; color: #FFFFFF;
    font-size: 8.5pt; font-weight: 700; letter-spacing: 0.12em;
    padding: 2pt 7pt; border-radius: 3pt; margin-right: 8pt;
    vertical-align: 1pt;
  }
  .qa-a { font-size: 11pt; color: #2a2a2a; line-height: 1.6; white-space: pre-wrap; margin: 0; }
  .qa-a-tag {
    display: inline-block; background: #E2E8F0; color: #0047AB;
    font-size: 8.5pt; font-weight: 700; letter-spacing: 0.12em;
    padding: 2pt 7pt; border-radius: 3pt; margin-right: 8pt;
    vertical-align: 1pt;
  }
`;

function blocksToHtml(blocks: DocxBlock[]): string {
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { out.push(`<ul>${buf.join('')}</ul>`); buf = []; } };
  for (const b of blocks) {
    const t = escape(b.text);
    const lbl = escape(b.label || '');
    if (b.type === 'li') { buf.push(`<li>${t}</li>`); continue; }
    flush();
    switch (b.type) {
      case 'h1': out.push(`<h1>${t}</h1>`); break;
      case 'h2': out.push(`<h2>${t}</h2>`); break;
      case 'h3': out.push(`<h3>${t}</h3>`); break;
      case 'h4': out.push(`<h4>${t}</h4>`); break;
      case 'lead': out.push(`<p class="lead">${t}</p>`); break;
      case 'code': out.push(`<pre>${t}</pre>`); break;
      case 'field':
        out.push(t ? `<p class="field"><b>${lbl}</b>${t}</p>` : `<p class="field"><b>${lbl}</b></p>`);
        break;
      case 'spacer': out.push(`<div class="spacer"></div>`); break;
      case 'callout': {
        const warn = /watch|warn|pitfall/i.test(b.label || '') ? ' warn' : '';
        const body = (b.text || '').split('\n').map((line) => escape(line)).join('<br/>');
        out.push(`<div class="callout${warn}"><span class="callout-label">${lbl}</span><div class="callout-body">${body}</div></div>`);
        break;
      }
      case 'qa': {
        const ans = (b.answer || '').split('\n').map((line) => escape(line)).join('<br/>');
        out.push(`<div class="qa"><p class="qa-q"><span class="qa-q-tag">Q</span>${t}</p><p class="qa-a"><span class="qa-a-tag">A</span>${ans}</p></div>`);
        break;
      }
      case 'table': {
        const rows = b.rows || [];
        if (rows.length === 0) break;
        const [head, ...body] = rows;
        const headHtml = `<thead><tr>${head.map((c) => `<th>${escape(c)}</th>`).join('')}</tr></thead>`;
        const bodyHtml = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
        out.push(`<table class="dt">${headHtml}${bodyHtml}</table>`);
        break;
      }
      default: out.push(`<p>${t}</p>`);
    }
  }
  flush();
  return out.join('');
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

function splitTitle(fullTitle: string): { main: string; sub: string } {
  // "<Company> — Interview Prep" → main: "<Company>", sub: "Interview Prep"
  const dashIdx = fullTitle.search(/[—–-]/);
  if (dashIdx > 0) {
    return {
      main: fullTitle.slice(0, dashIdx).trim(),
      sub: fullTitle.slice(dashIdx + 1).trim(),
    };
  }
  return { main: fullTitle, sub: '' };
}

export function prepSectionsToHtml(fullTitle: string, sections: PrepSection[]): string {
  const { main, sub } = splitTitle(fullTitle);
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const cover = `
    <div class="cover">
      <div class="cover-top">
        <div class="cover-bar"></div>
        <div class="cover-eyebrow">Camora · Interview Prep</div>
      </div>
      <div class="cover-mid">
        <div class="cover-eyebrow">Briefing</div>
        <h1 class="cover-title">${escape(main)}</h1>
        ${sub ? `<p class="cover-subtitle">${escape(sub)}</p>` : ''}
      </div>
      <div class="cover-bot">
        <div class="cover-bar"></div>
        <div class="cover-meta">${escape(today)}</div>
        <div style="flex:1"></div>
        <div class="cover-brand">CAMORA</div>
      </div>
    </div>
  `;

  const tocRows = sections.map((s, i) =>
    `<a class="toc-row" href="#chap-${i}" style="text-decoration:none;color:inherit;">
       <span class="toc-num">${ROMAN[i] || String(i + 1)}</span>
       <span class="toc-name">${escape(s.heading)}</span>
       <span class="toc-page" href="#chap-${i}"></span>
     </a>`
  ).join('');
  const toc = `
    <div class="toc">
      <div class="toc-eyebrow">Table of Contents</div>
      <h1 class="toc-h">Inside this briefing</h1>
      <div class="toc-rule"></div>
      ${tocRows}
    </div>
  `;

  const body = sections.map((s, i) => {
    const num = ROMAN[i] || String(i + 1);
    return `
      <section class="chapter" id="chap-${i}" data-chapter-name="${escape(s.heading)}">
        <div class="chapter-num">Chapter ${num}</div>
        <h1 class="chapter-title">${escape(s.heading)}</h1>
        <div class="chapter-rule"></div>
        ${blocksToHtml(s.blocks)}
      </section>
    `;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escape(fullTitle)}</title><style>${PDF_STYLE}</style></head><body>
    ${cover}
    ${toc}
    ${body}
  </body></html>`;
}

// ── Browser DOCX (fallback) ─────────────────────────────────────────────

// Builds a Word table where the first row is a styled header. Used when
// the prep block is array-of-flat-objects with short scalar fields —
// matches how the in-app UI tabulates Tech Stack and similar.
function buildDocxTable(rows: string[][]): any {
  const [header, ...body] = rows;
  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map((cell) => new TableCell({
      width: { size: Math.floor(100 / header.length), type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0047AB' },
      children: [new Paragraph({
        children: [new TextRun({ text: docxSafe(cell), bold: true, color: 'FFFFFF' })],
      })],
    })),
  });
  const bodyRows = body.map((r, idx) => new TableRow({
    children: r.map((cell) => new TableCell({
      width: { size: Math.floor(100 / header.length), type: WidthType.PERCENTAGE },
      shading: idx % 2 === 1
        ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F7FB' }
        : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: docxSafe(cell) })] })],
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    },
  });
}

// ── Single-cell wrapper used for callout boxes ──────────────────────────
// docx-js doesn't have a "callout" primitive, so we fake it with a single-
// cell, single-row Table that has a thick navy left border and a subtle
// blue fill — visually identical to the PDF callout.
function buildCallout(label: string, body: string, tone: 'info' | 'warn'): any {
  const accent = tone === 'warn' ? 'C77A00' : '0047AB';
  const fill = tone === 'warn' ? 'FFF8EC' : 'EEF4FB';
  const lines = body.split('\n');
  const paragraphs: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: label.toUpperCase(), bold: true, color: accent, size: 16, characterSpacing: 22 })],
    }),
    ...lines.map((line) => new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: docxSafe(line), color: '2A2A2A', size: 22 })],
    })),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill },
        margins: { top: 200, bottom: 200, left: 280, right: 280 },
        children: paragraphs,
      })],
    })],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.SINGLE, size: 24, color: accent },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
  });
}

// ── Q&A pair as styled paragraphs ───────────────────────────────────────
function buildQA(question: string, answer: string): any[] {
  const out: InstanceType<typeof Paragraph>[] = [];
  out.push(new Paragraph({
    spacing: { before: 200, after: 80 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'C5D4E8', space: 8 } },
    children: [
      new TextRun({ text: ' Q ', bold: true, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0047AB' }, size: 18 }),
      new TextRun({ text: '  ' + docxSafe(question), bold: true, color: '0A0A0A', size: 24 }),
    ],
  }));
  for (const line of answer.split('\n')) {
    out.push(new Paragraph({
      spacing: { after: 80 },
      indent: { left: 360 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'C5D4E8', space: 8 } },
      children: line.trim()
        ? [new TextRun({ text: docxSafe(line), color: '2A2A2A', size: 22 })]
        : [new TextRun({ text: '' })],
    }));
  }
  return out;
}

// ── Lead paragraph (book-style intro) ───────────────────────────────────
function buildLead(text: string): any {
  return new Paragraph({
    spacing: { before: 200, after: 280 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 12 } },
    children: [new TextRun({ text: docxSafe(text), italics: true, color: '2A2A2A', size: 26 })],
  });
}

function blocksToDocxChildren(blocks: DocxBlock[]): any[] {
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  for (const b of blocks) {
    const t = docxSafe(b.text);
    const lbl = docxSafe(b.label || '');
    if (b.type === 'h1') children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 140 }, children: [new TextRun({ text: t, bold: true, color: '0A0A0A' })] }));
    else if (b.type === 'h2') children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: t, bold: true, color: '0A0A0A' })] }));
    else if (b.type === 'h3') children.push(new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 280, after: 100 },
      children: [new TextRun({ text: t, bold: true, color: '0A0A0A', size: 28 })],
    }));
    else if (b.type === 'h4') children.push(new Paragraph({ heading: HeadingLevel.HEADING_4, spacing: { before: 160, after: 60 }, children: [new TextRun({ text: t, bold: true, color: '333333' })] }));
    else if (b.type === 'lead') children.push(buildLead(t));
    else if (b.type === 'li') children.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text: t, color: '2A2A2A', size: 22 })],
    }));
    else if (b.type === 'code') children.push(new Paragraph({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F5F0' },
      children: [new TextRun({ text: t, font: 'Menlo', size: 19, color: '2A2A2A' })],
    }));
    else if (b.type === 'field') children.push(new Paragraph({
      spacing: { after: 80 },
      children: t
        ? [new TextRun({ text: lbl, bold: true, color: '0047AB', size: 22 }), new TextRun({ text: ' ' + t, color: '2A2A2A', size: 22 })]
        : [new TextRun({ text: lbl, bold: true, color: '0047AB', size: 22 })],
    }));
    else if (b.type === 'spacer') children.push(new Paragraph({
      spacing: { before: 120, after: 120 },
      border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: 'C0C0C0', space: 1 } },
      children: [new TextRun({ text: '' })],
    }));
    else if (b.type === 'table' && b.rows && b.rows.length > 0) {
      children.push(buildDocxTable(b.rows));
      children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 80, after: 120 } }));
    }
    else if (b.type === 'callout') {
      const tone: 'info' | 'warn' = /watch|warn|pitfall/i.test(lbl) ? 'warn' : 'info';
      children.push(buildCallout(lbl || 'Note', b.text || '', tone));
      children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 80, after: 120 } }));
    }
    else if (b.type === 'qa') {
      for (const p of buildQA(t, b.answer || '')) children.push(p);
    }
    else children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t, color: '2A2A2A', size: 22 })] }));
  }
  return children;
}

async function browserSaveDocx(fullTitle: string, sections: PrepSection[], filename: string): Promise<void> {
  await ensureDocx();
  const { main, sub } = splitTitle(fullTitle);
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Cover page — its own section with no header/footer.
  const coverChildren: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ spacing: { before: 1200, after: 0 }, children: [new TextRun({ text: 'CAMORA · INTERVIEW PREP', bold: true, color: '0047AB', size: 20, characterSpacing: 32 })] }),
    new Paragraph({ spacing: { before: 200, after: 600 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
    new Paragraph({ spacing: { before: 2400, after: 0 }, children: [new TextRun({ text: 'BRIEFING', bold: true, color: '0047AB', size: 18, characterSpacing: 32 })] }),
    new Paragraph({ spacing: { before: 200, after: 240 }, children: [new TextRun({ text: docxSafe(main), bold: true, color: '0A0A0A', size: 84 })] }),
    sub ? new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: docxSafe(sub), italics: true, color: '555555', size: 30 })] }) : new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ spacing: { before: 3200, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
    new Paragraph({ spacing: { before: 200, after: 0 }, children: [new TextRun({ text: docxSafe(today.toUpperCase()), bold: true, color: '888888', size: 18, characterSpacing: 32 })] }),
  ];

  // Table of contents.
  const tocChildren: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({ spacing: { before: 480, after: 100 }, children: [new TextRun({ text: 'TABLE OF CONTENTS', bold: true, color: '0047AB', size: 20, characterSpacing: 32 })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Inside this briefing', bold: true, color: '0A0A0A', size: 56 })] }),
    new Paragraph({ spacing: { after: 320 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
    ...sections.map((s, i) => new Paragraph({
      spacing: { before: 80, after: 80 },
      tabStops: [{ type: 'right' as any, position: 9000, leader: 'dot' as any }],
      border: { bottom: { style: BorderStyle.DOTTED, size: 2, color: 'CCCCCC', space: 1 } },
      children: [
        new TextRun({ text: (ROMAN[i] || String(i + 1)) + '   ', bold: true, color: '0047AB', size: 20, characterSpacing: 24 }),
        new TextRun({ text: docxSafe(s.heading), color: '1A1A1A', size: 24 }),
      ],
    })),
  ];

  // Body — one section per chapter so each gets its own header (chapter
  // name in top-right) while page numbers run continuously in the footer.
  const bodySections = sections.map((s, i) => ({
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: (ROMAN[i] || String(i + 1)) + '  ·  ' + docxSafe(s.heading).toUpperCase(),
            color: '999999', size: 16, characterSpacing: 28,
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], color: '888888', size: 16 })],
        })],
      }),
    },
    properties: {
      page: { margin: { top: 1440, right: 1224, bottom: 1440, left: 1224 } },
    },
    children: [
      new Paragraph({ spacing: { before: 720, after: 120 }, children: [new TextRun({ text: 'CHAPTER ' + (ROMAN[i] || String(i + 1)), bold: true, color: '0047AB', size: 20, characterSpacing: 32 })] }),
      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: docxSafe(s.heading), bold: true, color: '0A0A0A', size: 60 })] }),
      new Paragraph({ spacing: { after: 320 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
      ...blocksToDocxChildren(s.blocks),
    ] as (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[],
  }));

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [
      { properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children: coverChildren },
      { properties: { page: { margin: { top: 1080, right: 1224, bottom: 1080, left: 1224 } } }, children: tocChildren },
      ...bodySections,
    ],
  });
  const blob = await Packer.toBlob(doc);
  _saveAs(blob, filename);
}

// ── Browser PDF (fallback) ──────────────────────────────────────────────
async function browserSavePdf(fullTitle: string, sections: PrepSection[], filename: string): Promise<void> {
  const { main, sub } = splitTitle(fullTitle);
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 64;
  const marginY = 72;
  const innerW = pageW - marginX * 2;
  // eslint-disable-next-line no-useless-assignment
  let runningChapter = '';

  const drawChrome = (skipFirst: boolean) => {
    const total = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      if (skipFirst && p === 1) continue;
      doc.setPage(p);
      // Footer page number
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(140);
      doc.text(String(p - 1), pageW / 2, pageH - 28, { align: 'center' });
    }
  };

  let y = marginY;
  const newPage = () => { doc.addPage(); y = marginY; };
  const need = (h: number) => { if (y + h > pageH - marginY) newPage(); };

  // ── Cover ────────────────────────────────────────────────────────────
  doc.setFillColor(250, 250, 247); doc.rect(0, 0, pageW, pageH, 'F');
  doc.setDrawColor(0, 71, 171); doc.setLineWidth(3);
  doc.line(marginX, 96, marginX + 60, 96);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 71, 171);
  doc.text(pdfSafe('CAMORA  ·  INTERVIEW PREP'), marginX + 78, 100, { charSpace: 3 });

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 71, 171);
  doc.text(pdfSafe('BRIEFING'), marginX, pageH / 2 - 60, { charSpace: 3 });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(46); doc.setTextColor(10, 10, 10);
  const mainLines = doc.splitTextToSize(pdfSafe(main), innerW);
  let coverY = pageH / 2 - 30;
  for (const ln of mainLines) { doc.text(ln, marginX, coverY); coverY += 52; }
  if (sub) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(15); doc.setTextColor(85);
    doc.text(pdfSafe(sub), marginX, coverY + 10);
  }
  doc.setDrawColor(0, 71, 171); doc.setLineWidth(3);
  doc.line(marginX, pageH - 110, marginX + 60, pageH - 110);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(140);
  doc.text(pdfSafe(today.toUpperCase()), marginX + 78, pageH - 106, { charSpace: 3 });
  doc.setTextColor(10, 10, 10);
  doc.text('CAMORA', pageW - marginX, pageH - 106, { align: 'right', charSpace: 1 });

  // ── TOC ──────────────────────────────────────────────────────────────
  newPage();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 71, 171);
  doc.text(pdfSafe('TABLE OF CONTENTS'), marginX, y, { charSpace: 3 });
  y += 24;
  doc.setFontSize(28); doc.setTextColor(10);
  doc.text(pdfSafe('Inside this briefing'), marginX, y);
  y += 18;
  doc.setDrawColor(0, 71, 171); doc.setLineWidth(2);
  doc.line(marginX, y, marginX + 80, y);
  y += 30;
  for (let i = 0; i < sections.length; i++) {
    need(24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 71, 171);
    doc.text(pdfSafe(ROMAN[i] || String(i + 1)), marginX, y, { charSpace: 2 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(20);
    doc.text(pdfSafe(sections[i].heading), marginX + 36, y);
    doc.setDrawColor(204, 204, 204); doc.setLineWidth(0.4);
    doc.setLineDashPattern([1, 2], 0);
    doc.line(marginX, y + 6, marginX + innerW, y + 6);
    doc.setLineDashPattern([], 0);
    y += 22;
  }

  // ── Chapters ─────────────────────────────────────────────────────────
  for (let si = 0; si < sections.length; si++) {
    const s = sections[si];
    newPage();
    runningChapter = s.heading;
    // Top-right running header
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(160);
    doc.text(pdfSafe(`${ROMAN[si] || String(si + 1)}  ·  ${runningChapter.toUpperCase()}`), pageW - marginX, 36, { align: 'right', charSpace: 2 });
    // Chapter opener
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 71, 171);
    doc.text(pdfSafe(`CHAPTER ${ROMAN[si] || String(si + 1)}`), marginX, y, { charSpace: 3 });
    y += 28;
    doc.setFontSize(34); doc.setTextColor(10);
    const titleLines = doc.splitTextToSize(pdfSafe(s.heading), innerW);
    for (const ln of titleLines) { doc.text(ln, marginX, y); y += 38; }
    y += 4;
    doc.setDrawColor(0, 71, 171); doc.setLineWidth(2.5);
    doc.line(marginX, y, marginX + 80, y);
    y += 28;

    for (const b of s.blocks) {
      const text = pdfSafe(b.text || '');
      const labelText = pdfSafe(b.label || '');
      if (b.type === 'h1' || b.type === 'h2') {
        const size = b.type === 'h1' ? 17 : 14;
        doc.setFontSize(size); doc.setFont('helvetica', 'bold'); doc.setTextColor(10);
        const lines = doc.splitTextToSize(text, innerW);
        for (const ln of lines) { need(size + 6); doc.text(ln, marginX, y); y += size + 4; }
        y += 6;
      } else if (b.type === 'h3') {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 71, 171);
        const lines = doc.splitTextToSize(text.toUpperCase(), innerW);
        for (const ln of lines) { need(16); doc.text(ln, marginX, y, { charSpace: 1.5 }); y += 14; }
        y += 4;
      } else if (b.type === 'h4') {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
        const lines = doc.splitTextToSize(text, innerW);
        for (const ln of lines) { need(15); doc.text(ln, marginX, y); y += 14; }
        y += 4;
      } else if (b.type === 'field') {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 71, 171);
        const labelW = doc.getTextWidth(labelText + ' ');
        need(14);
        doc.text(labelText, marginX, y);
        if (text) {
          doc.setFont('helvetica', 'normal'); doc.setTextColor(42);
          const valueW = innerW - labelW;
          const valueLines = doc.splitTextToSize(text, valueW);
          doc.text(valueLines[0] || '', marginX + labelW, y);
          y += 14;
          for (let i = 1; i < valueLines.length; i++) {
            need(13);
            doc.text(valueLines[i], marginX, y);
            y += 13;
          }
        } else {
          y += 14;
        }
        y += 2;
      } else if (b.type === 'spacer') {
        need(14);
        doc.setDrawColor(192, 192, 192); doc.setLineWidth(0.5);
        doc.setLineDashPattern([1, 2], 0);
        doc.line(marginX + innerW * 0.3, y + 2, marginX + innerW * 0.7, y + 2);
        doc.setLineDashPattern([], 0);
        y += 14;
      } else if (b.type === 'table' && b.rows && b.rows.length > 0) {
        const rows = b.rows;
        const cols = rows[0].length;
        const colW = innerW / cols;
        const rowPad = 7;
        const computed = rows.map((r) => {
          const cellLines = r.map((c) => doc.splitTextToSize(pdfSafe(c || ''), colW - rowPad * 2));
          const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
          return { cellLines, height: maxLines * 12 + rowPad * 2 };
        });
        for (let ri = 0; ri < computed.length; ri++) {
          const isHeader = ri === 0;
          const { cellLines, height } = computed[ri];
          if (y + height > pageH - marginY) newPage();
          if (isHeader) {
            doc.setFillColor(0, 71, 171);
            doc.rect(marginX, y, innerW, height, 'F');
          } else if (ri % 2 === 0) {
            doc.setFillColor(244, 247, 251);
            doc.rect(marginX, y, innerW, height, 'F');
          }
          doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
          doc.line(marginX, y + height, marginX + innerW, y + height);
          doc.setFontSize(isHeader ? 9 : 10);
          doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
          if (isHeader) doc.setTextColor(255, 255, 255); else doc.setTextColor(42);
          for (let c = 0; c < cols; c++) {
            const lines = cellLines[c];
            for (let li = 0; li < lines.length; li++) {
              doc.text(isHeader ? lines[li].toUpperCase() : lines[li], marginX + c * colW + rowPad, y + rowPad + 10 + li * 12, isHeader ? { charSpace: 0.5 } : undefined);
            }
          }
          y += height;
        }
        y += 8;
      } else if (b.type === 'li') {
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(30);
        const lines = doc.splitTextToSize('* ' + text, innerW - 16);
        for (let i = 0; i < lines.length; i++) {
          need(14);
          doc.text(lines[i], marginX + (i === 0 ? 0 : 16), y);
          y += 14;
        }
      } else if (b.type === 'code') {
        doc.setFontSize(9); doc.setFont('courier', 'normal'); doc.setTextColor(20);
        const lines = doc.splitTextToSize(text, innerW - 16);
        const blockH = lines.length * 12 + 14;
        need(blockH);
        doc.setFillColor(245, 245, 240);
        doc.rect(marginX, y - 8, innerW, blockH, 'F');
        doc.setDrawColor(0, 71, 171);
        doc.setLineWidth(2);
        doc.line(marginX, y - 8, marginX, y - 8 + blockH);
        for (const ln of lines) { doc.text(ln, marginX + 12, y); y += 12; }
        y += 8;
      } else if (b.type === 'lead') {
        doc.setFontSize(13); doc.setFont('helvetica', 'italic'); doc.setTextColor(42);
        const lines = doc.splitTextToSize(text, innerW - 24);
        const blockH = lines.length * 18 + 12;
        need(blockH);
        doc.setDrawColor(0, 71, 171); doc.setLineWidth(3);
        doc.line(marginX, y - 6, marginX, y - 6 + blockH - 8);
        for (const ln of lines) { doc.text(ln, marginX + 18, y); y += 18; }
        y += 10;
      } else if (b.type === 'callout') {
        const isWarn = /watch|warn|pitfall/i.test(b.label || '');
        const accent = isWarn ? [199, 122, 0] as const : [0, 71, 171] as const;
        const fill = isWarn ? [255, 248, 236] as const : [238, 244, 251] as const;
        doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        const wrapped = (b.text || '').split('\n').flatMap((line) => doc.splitTextToSize(pdfSafe(line) || ' ', innerW - 36));
        const blockH = 24 + wrapped.length * 14 + 16;
        need(blockH);
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.rect(marginX, y - 8, innerW, blockH, 'F');
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.rect(marginX, y - 8, 4, blockH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text(pdfSafe((b.label || 'NOTE').toUpperCase()), marginX + 16, y + 4, { charSpace: 2.5 });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(42);
        let cy = y + 22;
        for (const ln of wrapped) { doc.text(ln, marginX + 16, cy); cy += 14; }
        y = y - 8 + blockH + 6;
      } else if (b.type === 'qa') {
        // Question
        const qLines = doc.splitTextToSize(pdfSafe(b.text), innerW - 36);
        const aLines = (b.answer || '').split('\n').flatMap((line) => doc.splitTextToSize(pdfSafe(line) || ' ', innerW - 36));
        const blockH = 6 + qLines.length * 16 + 6 + aLines.length * 14 + 12;
        need(blockH);
        doc.setDrawColor(197, 212, 232); doc.setLineWidth(2);
        doc.line(marginX, y - 4, marginX, y - 4 + blockH - 12);
        // Q tag
        doc.setFillColor(0, 71, 171); doc.rect(marginX + 12, y - 2, 18, 14, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255);
        doc.text('Q', marginX + 21, y + 8, { align: 'center' });
        doc.setFontSize(12); doc.setTextColor(10);
        let qy = y + 8;
        for (let i = 0; i < qLines.length; i++) {
          doc.text(qLines[i], marginX + 38, qy);
          qy += 16;
        }
        // A tag
        const aStartY = qy + 4;
        doc.setFillColor(226, 232, 240); doc.rect(marginX + 12, aStartY - 10, 18, 14, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 71, 171);
        doc.text('A', marginX + 21, aStartY, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(42);
        let ay = aStartY;
        for (const ln of aLines) { doc.text(ln, marginX + 38, ay); ay += 14; }
        y = ay + 8;
      } else {
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(42);
        const lines = doc.splitTextToSize(text, innerW);
        for (const ln of lines) { need(15); doc.text(ln, marginX, y); y += 15; }
        y += 6;
      }
    }
  }
  drawChrome(true);
  doc.save(filename);
}

// ── Public API ──────────────────────────────────────────────────────────
type Camo = {
  isDesktop?: boolean;
  savePdf?: (opts: { html: string; filename: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string }>;
  saveDocx?: (opts: { sections: PrepSection[]; filename: string; title: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string }>;
};

function getCamo(): Camo | undefined {
  return (window as any).camo as Camo | undefined;
}

export async function downloadPrepAsPdf(title: string, sections: PrepSection[]): Promise<{ ok: boolean; via: 'desktop' | 'browser'; error?: string }> {
  const filename = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Prep.pdf`;
  const camo = getCamo();
  if (camo?.isDesktop && camo.savePdf) {
    const html = prepSectionsToHtml(title, sections);
    const result = await camo.savePdf({ html, filename });
    if (result.canceled) return { ok: false, via: 'desktop' };
    return { ok: result.ok, via: 'desktop', error: result.error };
  }
  try {
    await browserSavePdf(title, sections, filename);
    return { ok: true, via: 'browser' };
  } catch (err: any) {
    return { ok: false, via: 'browser', error: String(err?.message || err) };
  }
}

export async function downloadPrepAsDocx(title: string, sections: PrepSection[]): Promise<{ ok: boolean; via: 'desktop' | 'browser'; error?: string }> {
  const filename = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Prep.docx`;
  const camo = getCamo();
  if (camo?.isDesktop && camo.saveDocx) {
    const result = await camo.saveDocx({ sections, filename, title });
    if (result.canceled) return { ok: false, via: 'desktop' };
    return { ok: result.ok, via: 'desktop', error: result.error };
  }
  try {
    await browserSaveDocx(title, sections, filename);
    return { ok: true, via: 'browser' };
  } catch (err: any) {
    return { ok: false, via: 'browser', error: String(err?.message || err) };
  }
}
