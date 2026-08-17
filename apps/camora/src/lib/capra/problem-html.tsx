/* Renders LeetCode-style problem statement HTML as React nodes.
 *
 * The statements stored in `coding_problems.content` are raw HTML from LeetCode
 * (or the doocs mirror). Rather than inject them with dangerouslySetInnerHTML,
 * we parse them and rebuild an allowlisted subset — same approach the companion
 * inline-renderer took when it dropped its innerHTML path.
 */
import type { ReactNode } from 'react';

/** Tags we keep. Everything else is unwrapped (children kept, tag dropped). */
const ALLOWED = new Set([
  'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'strong', 'b', 'em', 'i',
  'sup', 'sub', 'u', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
]);

/** Tags dropped wholesale, contents and all. */
const STRIPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta']);

/** Block tags that render as their own paragraph-ish element. */
const BLOCK_STYLES: Record<string, React.CSSProperties> = {
  p: { margin: '0 0 12px' },
  ul: { margin: '0 0 12px', paddingLeft: 22, listStyle: 'disc' },
  ol: { margin: '0 0 12px', paddingLeft: 22, listStyle: 'decimal' },
  li: { margin: '0 0 4px' },
  pre: {
    margin: '0 0 12px', padding: 12, borderRadius: 8, overflowX: 'auto',
    background: 'var(--bg-elevated, rgba(255,255,255,0.04))',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
    fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12.5, lineHeight: 1.6,
  },
  code: {
    padding: '1px 5px', borderRadius: 4, fontSize: '0.92em',
    background: 'var(--bg-elevated, rgba(255,255,255,0.06))',
    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  },
  table: { margin: '0 0 12px', borderCollapse: 'collapse', fontSize: 13 },
  th: { border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))', padding: '4px 10px', textAlign: 'left' },
  td: { border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))', padding: '4px 10px' },
};

function toNodes(node: Node, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  node.childNodes.forEach((child, i) => {
    const key = `${keyPrefix}-${i}`;

    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) out.push(text);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (STRIPPED.has(tag)) return;
    if (tag === 'br') { out.push(<br key={key} />); return; }
    if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      // Only remote images from the statement itself; no data:/javascript: URLs.
      if (!/^https?:\/\//i.test(src)) return;
      out.push(<img key={key} src={src} alt={el.getAttribute('alt') ?? ''} style={{ maxWidth: '100%', borderRadius: 6, margin: '4px 0' }} />);
      return;
    }

    const children = toNodes(el, key);
    if (!ALLOWED.has(tag)) { out.push(...children); return; }

    // <div>/<span> carry no meaning here — keep their children inline.
    if (tag === 'div' || tag === 'span') { out.push(...children); return; }

    const Tag = tag as keyof React.JSX.IntrinsicElements;
    out.push(<Tag key={key} style={BLOCK_STYLES[tag]}>{children}</Tag>);
  });
  return out;
}

/**
 * The stored statement repeats the examples, constraints and follow-up that we
 * also hold as structured columns. Cut the statement at the first of those
 * headings so the detail page renders each section exactly once.
 */
export function statementBody(html: string): string {
  // Each heading is matched both bare and with its wrapping <p>, longest first,
  // so the cut never lands inside an open tag and leaves a dangling "<p>".
  const markers = [
    /<p[^>]*>\s*<strong class="example">/i,
    /<p[^>]*>\s*<strong>\s*Example\s*\d*\s*:?\s*<\/strong>/i,
    /<p[^>]*>\s*<strong>\s*Constraints:?\s*<\/strong>/i,
    /<p[^>]*>\s*<strong>\s*Follow[- ]?up:?\s*<\/strong>/i,
    /<strong class="example">/i,
    /<strong>\s*Constraints:?\s*<\/strong>/i,
    /<strong>\s*Follow[- ]?up:?\s*<\/strong>/i,
  ];
  let cut = html.length;
  for (const m of markers) {
    const idx = html.search(m);
    if (idx !== -1 && idx < cut) cut = idx;
  }
  return html
    .slice(0, cut)
    // Trailing spacer paragraphs, then any tag left hanging open by the cut.
    .replace(/(<p[^>]*>\s*(&nbsp;|\s)*<\/p>\s*)+$/i, '')
    .replace(/<[a-z][^>]*>\s*$/i, '')
    .trim();
}

/** Parse + allowlist a statement HTML fragment into React nodes. */
export function renderProblemHtml(html: string | null | undefined): ReactNode {
  if (!html) return null;
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  return root ? toNodes(root, 'n') : null;
}
