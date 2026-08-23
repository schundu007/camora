/**
 * Scraped and OCR'd problem text, tidied into something readable.
 *
 * A statement arrives from three places that all mangle whitespace differently:
 * a URL scrape carries the page's markup rhythm (blank line between every
 * paragraph, sometimes between every LINE), a DOM injection carries whatever
 * the site's layout produced, and OCR carries the column gaps of the screenshot
 * it read. Pasted straight into the textarea, all three read as a sparse mess —
 * and the model sees the same mess.
 *
 * Deliberately conservative about two things:
 *
 * Leading indentation is preserved. Examples and code blocks in a statement
 * ("    Input: nums = [1,2]") carry meaning in their indent, and flattening it
 * turns a worked example into a paragraph.
 *
 * Single blank lines survive. They are the paragraph breaks; only RUNS of them
 * collapse. Stripping every blank line would weld the constraints onto the end
 * of the examples.
 */
export function normalizeProblemText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  return raw
    .replace(/\r\n?/g, '\n')
    // Non-breaking and figure spaces render as spaces but do not behave like
    // them — they survive trims and break word wrapping.
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    // Zero-width characters: invisible, and they defeat every whitespace rule
    // below by sitting between the things those rules try to collapse.
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .split('\n')
    .map((line) => {
      const indent = /^[ \t]*/.exec(line)?.[0] ?? '';
      const body = line.slice(indent.length).replace(/[ \t]{2,}/g, ' ').trimEnd();
      // A whitespace-only line becomes empty so the blank-run collapse below
      // can see it as blank.
      return body ? indent + body : '';
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
