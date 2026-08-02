/* ── Inline markdown renderer ──────────────────────────────────────────────
   Replaces an earlier `dangerouslySetInnerHTML` path that ran a regex over
   user/AI-supplied strings and dropped the result into innerHTML. That was
   an XSS waiting to happen — a malformed JSON answer like
   `**<img src=x onerror=alert(1)>**` would have escaped any wrapper.

   This tokenizer walks the string, emits React nodes for **bold**, `code`,
   and [text](url) segments, and lets React's auto-escaping handle every
   character of plain text. Links are restricted to http(s) URLs so a
   `javascript:` / `data:` payload can't hide inside `[click](javascript:…)`.
*/
import React from 'react';

export interface InlineStyles {
  bold?: React.CSSProperties;
  code?: React.CSSProperties;
  link?: React.CSSProperties;
  allowLinks?: boolean;
  /** When set, acronyms (ETL, SQL, CI/CD) and metrics (3, 40%, 2TB) inside
   *  plain text get this style so the candidate's eye lands on the proof
   *  points while skimming mid-sentence. Purely structural — no keyword list,
   *  so it works for any resume/domain. */
  term?: React.CSSProperties;
}

/* Acronym (2-7 caps, optional /SLASH half) or number with an optional unit.
   Leading \b stops it firing inside PostgreSQL / MySQL — there is no word
   boundary between "g" and "S", so only standalone tokens match. */
const TERM_RE = /\b([A-Z][A-Z0-9]{1,6}(?:\/[A-Z][A-Z0-9]{0,5})?|\d+(?:[.,]\d+)*(?:\s?(?:%|x|×|K|M|B|GB|TB|MB|ms))?\+?)/g;

export const renderInlineSafe = (s: string, opts: InlineStyles = {}): React.ReactNode[]  => {
  if (!s) return [];
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const len = s.length;
  let buf = '';
  /* Split the plain-text buffer on terms. Every character of `buf` is
     re-emitted — the matched slice styled, the gaps verbatim — so this can
     never drop content the way a .replace() sweep would. */
  const pushPlain = (text: string) => {
    if (!opts.term) { nodes.push(text); return; }
    TERM_RE.lastIndex = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = TERM_RE.exec(text)) !== null) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      nodes.push(<span key={`t-${k++}`} style={opts.term}>{m[0]}</span>);
      last = m.index + m[0].length;
    }
    if (last < text.length) nodes.push(text.slice(last));
  };
  const flush = () => { if (buf) { pushPlain(buf); buf = ''; } };
  while (i < len) {
    if (s[i] === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        nodes.push(<strong key={`b-${k++}`} style={opts.bold}>{s.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        nodes.push(<code key={`c-${k++}`} style={opts.code}>{s.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    if (opts.allowLinks && s[i] === '[') {
      const closeBracket = s.indexOf(']', i + 1);
      if (closeBracket !== -1 && s[closeBracket + 1] === '(') {
        const closeParen = s.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const text = s.slice(i + 1, closeBracket);
          const url = s.slice(closeBracket + 2, closeParen);
          // Allow only http/https — never javascript:, data:, vbscript:, etc.
          if (/^https?:\/\//i.test(url)) {
            flush();
            nodes.push(
              <a key={`a-${k++}`} href={url} target="_blank" rel="noopener noreferrer" style={opts.link}>{text}</a>
            );
            i = closeParen + 1;
            continue;
          }
        }
      }
    }
    buf += s[i++];
  }
  flush();
  return nodes;
}
