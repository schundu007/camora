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
}

export function renderInlineSafe(s: string, opts: InlineStyles = {}): React.ReactNode[] {
  if (!s) return [];
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const len = s.length;
  let buf = '';
  const flush = () => { if (buf) { nodes.push(buf); buf = ''; } };
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
