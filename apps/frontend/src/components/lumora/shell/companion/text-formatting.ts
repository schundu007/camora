/**
 * Pure helpers for parsing the streaming token buffer into renderable text.
 *
 * Lifted out of AICompanionPanel so the same helpers can be reused by the
 * STAR / RichText renderers without dragging in the panel's React tree.
 */

export function extractAnswer(parsed: any): string {
  if (!parsed) return '';
  if (Array.isArray(parsed)) {
    return parsed.filter((b: any) => b.content).map((b: any) => b.content).join('\n\n');
  }
  return '';
}

/**
 * Strip both bracketed section tags and JSON-stream artifacts so the
 * live-streaming token buffer reads as prose even mid-stream.
 *
 * Handles three messy cases:
 *   1. Backend wraps the whole answer in a ```json ... ``` fence.
 *   2. Backend streams raw `{"overview":"…","requirements":…}`.
 *   3. Leading/trailing `{"` / `"}` crumbs from partial JSON.
 */
export function cleanTags(text: string): string {
  let t = text;

  // Tag markers.
  t = t.replace(/\[\/?(?:FOLLOWUP|HEADLINE|ANSWER|CODE|DIAGRAM|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS|PROBLEM|APPROACH|COMPLEXITY|WALKTHROUGH|TESTCASES)\]/gi, '');

  // Fenced JSON — ```json { ... } ``` or plain ``` { ... } ``` — keep inner content.
  t = t.replace(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/g, '$1');

  // If the whole payload looks like a JSON object/array, try to pull readable
  // text values out of it. This catches the case where the model streams
  // `{"overview":"The rate limiter…","requirements":{…}}` character by
  // character — during streaming we want to show the prose, not the braces.
  const stripped = t.trim();
  if (stripped.startsWith('{') || stripped.startsWith('[')) {
    // Scrape each `"key": "value"` pair and flatten to key-prose lines.
    const pairs = stripped.match(/"[A-Za-z][A-Za-z0-9_]*"\s*:\s*"(?:\\.|[^"\\])*"/g) || [];
    if (pairs.length > 0) {
      const lines = pairs.map((p) => {
        const m = p.match(/"([A-Za-z][A-Za-z0-9_]*)"\s*:\s*"((?:\\.|[^"\\])*)"/);
        if (!m) return '';
        const key = m[1].replace(/([a-z])([A-Z])/g, '$1 $2');
        const value = m[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        return `**${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}`;
      }).filter(Boolean);
      if (lines.length > 0) t = lines.join('\n\n');
    }
  }

  // Drop any dangling structural crumbs that survived.
  t = t.replace(/^[\s`]*(?:json|JSON)?\s*[\{\[]/, '');     // leading { or [
  t = t.replace(/[\}\]][\s`]*$/, '');                      // trailing } or ]
  t = t.replace(/"[A-Za-z_][A-Za-z0-9_]*"\s*:\s*(?:\[|\{)/g, ''); // `"key": {` / `"key": [`
  t = t.replace(/^\s*"|"\s*,?\s*$/gm, '');                 // stray quote-wrapped lines

  // Collapse excessive whitespace introduced by the strip.
  t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ');

  return t.trim();
}
