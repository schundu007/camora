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
    .replace(/\*\*/g, '')                      // bold
    .replace(/(^|[\s(])\*(?=\S)/g, '$1')       // italic / "* " bullet openers
    .replace(/\*/g, '')                        // any stray asterisks
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
    // Strip block tags from AI responses (HEADLINE, REQUIREMENTS, etc.)
    .replace(/\[?\/?(?:HEADLINE|REQUIREMENTS|FUNCTIONAL|NON-FUNCTIONAL|SCALE|ARCHITECTURE|COMPONENTS|DEEP_DIVE|TRADEOFFS|EDGE_?CASES|SUMMARY|CODE|TESTCASES|COMPLEXITY|WALKTHROUGH|FOLLOWUP|API_DESIGN|DATA_MODEL|MONITORING)\]?/gi, '')
    .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough markdown
    .trim();
}
