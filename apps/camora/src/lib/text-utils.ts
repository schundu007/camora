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
