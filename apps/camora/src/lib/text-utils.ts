import { blockTagStripRe } from './constants';

/**
 * Strip inline markdown artifacts (**, *, `code`, headings, strikethrough,
 * list markers) from LLM-generated doc/prep content that must render as clean
 * prose. Also heals the "sentence., next" artifact produced when arrays of
 * full sentences are comma-joined for display. Kept separate from cleanText so
 * answer/code renderers that rely on backticks aren't affected.
 */
export function stripInlineMarkdown(s: string): string {
  return (s || '')
    .replace(/`+/g, '')                       // inline-code backticks
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)') // [text](url) -> text (url)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [text](anything-else) -> text
    .replace(/\*\*/g, '')                      // bold
    .replace(/\b__([^_]+)__\b/g, '$1')         // __bold__
    .replace(/(^|[\s(])\*(?=\S)/g, '$1')       // italic / "* " bullet openers
    .replace(/\*/g, '')                        // any stray asterisks
    .replace(/^\s{0,3}[-+]\s+/gm, '')          // "- " / "+ " list markers
    .replace(/^\s{0,3}>\s?/gm, '')             // blockquote markers
    .replace(/^#{1,6}\s+/gm, '')               // ATX headings
    .replace(/~~([^~]+)~~/g, '$1')             // strikethrough
    .replace(/([.!?])\s*,\s+/g, '$1 ')         // "experience., My" -> "experience. My"
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * A displayed bullet, in sentence case.
 *
 * The model's case is inherited from whichever schema hint it was mirroring —
 * "Key insight 1" produces capitalized key points, "a mistake people actually
 * make" produces lowercase pitfalls — so two cards in the same answer disagree
 * about whether a bullet starts with a capital. Normalising at render time is
 * the only fix that also covers answers already cached.
 *
 * Left alone when the first word is CODE: `getHits()`, `self.hits`, `nums[i]`,
 * `n_max`, `iOS`. Capitalising an identifier does not tidy it, it renames it.
 */
const CODE_FIRST_WORD = /[(.[\]_=:/]|^[a-z]+[A-Z]/;

export function sentenceCase(s: string): string {
  const t = (s || '').trim();
  if (!t) return t;
  const first = t.split(/\s+/, 1)[0].replace(/[,;]$/, '');
  // A backticked opener renders as code, and an all-caps opener (O(n), API,
  // BFS) is already the case its author meant.
  if (t.startsWith('`') || CODE_FIRST_WORD.test(first) || first === first.toUpperCase()) return t;
  return t[0].toUpperCase() + t.slice(1);
}

/** True when a string is a plain http(s) URL pointing at an image file. */
export function isImageUrl(s: string): boolean {
  return typeof s === 'string' && /^https?:\/\/\S+\.(png|jpe?g|svg|webp|gif|avif)(\?\S*)?$/i.test(s.trim());
}

/**
 * Strip markdown artifacts from Claude response text.
 */
export function cleanText(s: string): string {
  return (s || '')
    .replace(/^#{1,4}\s+.*$/gm, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Strip leaked block tags ([HEADLINE], [/CODE], …) from the canonical list.
    // Brackets are MANDATORY (built into blockTagStripRe) so bare prose words
    // like architecture/code/scale/summary are never touched.
    .replace(blockTagStripRe(), '')
    .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough markdown
    .trim();
}
