// apps/ascend-backend/scripts/lib/deriveStarterCode.js
//
// Turns a reference solution into the starter stub LeetCode would have shown.
//
// LeetCode's API withholds codeSnippets for paid-only questions along with
// everything else, so 781 premium problems reach the solver with no template.
// buildCodingSystemPrompt() treats a missing template as "I/O contract unknown"
// and tells the model to invent a shape — which is how a Design Hit Counter
// answer comes back as a loose function instead of `class HitCounter`.
//
// The doocs reference solutions carry the exact signatures, so we keep the
// declarations and empty the bodies. This is deliberately conservative: when a
// file does not match a shape we understand, we return null and leave the
// problem without a stub rather than emit a wrong signature.

/** Languages whose bodies are delimited by braces. */
const BRACE_LANGS = new Set(['java', 'cpp', 'c', 'golang', 'typescript', 'javascript', 'csharp', 'rust', 'php']);

/**
 * Walk from the '{' at `open` to its matching '}', skipping over strings,
 * chars and comments so a brace inside "}" or /* } *​/ does not end the body.
 */
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];

    if (c === '/' && next === '/') { i = src.indexOf('\n', i); if (i === -1) return -1; continue; }
    if (c === '/' && next === '*') { i = src.indexOf('*/', i + 2); if (i === -1) return -1; i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) { if (src[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * Index of the next '{' that actually opens a body — skipping comments and
 * strings. JSDoc headers carry braces of their own (`@param {number[]} nums`);
 * treating one as a body turns the doc block into garbage.
 */
function nextBodyBrace(src, from) {
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') { i = src.indexOf('\n', i); if (i === -1) return -1; continue; }
    if (c === '/' && next === '*') { i = src.indexOf('*/', i + 2); if (i === -1) return -1; i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) { if (src[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '{') return i;
  }
  return -1;
}

/** An indented blank body, matching LeetCode's own stub formatting. */
function emptyBraceBody(indent) {
  return `{\n${indent}    \n${indent}}`;
}

/**
 * Members the candidate is not asked to write: helpers the solution author
 * added, and the state they used to implement it. LeetCode's template exposes
 * only the constructor and the public API named in the statement.
 */
function isDroppableMember(decl) {
  return /(^|\s)private\b/.test(decl);
}

/**
 * Once every body is empty, no executable statement remains — so an indented
 * line still ending in ';' can only be a field the solution author introduced
 * to implement the thing. LeetCode's template declares no state, so drop them,
 * along with the access labels that were only there to group them.
 */
function stripFieldsAndLabels(code, lang) {
  const isCLike = lang === 'cpp' || lang === 'c';
  return code
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (!t) return true;
      // The usage block LeetCode appends is comment text whose lines happen to
      // end in ';' — it is part of the template, not state.
      if (/^(\*|\/\/|\/\*|#)/.test(t)) return true;
      if (isCLike && /^(public|private|protected)\s*:$/.test(t)) return t.startsWith('public');
      if (!/^\s/.test(line)) return true;          // top-level: imports, using, etc.
      if (t === '};' || t === '}' || t === ');') return true;
      if (t.endsWith('{')) return true;            // a declaration we kept
      return !t.endsWith(';');
    })
    .join('\n');
}

/**
 * Brace languages: keep each declaration, blank its body, drop private helpers.
 * Returns null when the file has no recognisable function at all.
 */
function deriveBrace(code, lang) {
  let out = '';
  let i = 0;
  let replaced = 0;
  const src = code;

  while (i < src.length) {
    const open = nextBodyBrace(src, i);
    if (open === -1) { out += src.slice(i); break; }

    const close = matchBrace(src, open);
    if (close === -1) { out += src.slice(i); break; }

    const decl = src.slice(i, open);
    // A class/struct/impl wrapper keeps its contents; only leaf bodies are emptied.
    const isWrapper = /\b(class|struct|impl|interface|namespace|enum)\b[^;()]*$/.test(decl);

    if (isWrapper) {
      out += decl + '{';
      i = open + 1;
      continue;
    }

    const lastNl = decl.lastIndexOf('\n');
    const indent = (decl.slice(lastNl + 1).match(/^\s*/) ?? [''])[0];

    if (isDroppableMember(decl.slice(lastNl + 1))) {
      // Drop the member entirely, including the newline that preceded it.
      out += decl.slice(0, lastNl === -1 ? 0 : lastNl);
      i = close + 1;
      // Swallow a trailing semicolon/blank line left behind.
      while (i < src.length && /[;\s]/.test(src[i]) && src[i] !== '\n') i++;
      continue;
    }

    out += decl + emptyBraceBody(indent);
    replaced++;
    i = close + 1;
  }

  if (!replaced) return null;
  return stripFieldsAndLabels(out, lang)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Python: signatures end at ':' and bodies are the indented block beneath.
 * Multi-line signatures are joined by tracking bracket depth.
 */
function derivePython(code) {
  const lines = code.split('\n');
  const out = [];
  let i = 0;
  let replaced = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Imports never appear in a LeetCode python stub.
    if (/^(import|from)\s/.test(trimmed)) { i++; continue; }

    const classMatch = line.match(/^(\s*)class\s+\w+/);
    const defMatch = line.match(/^(\s*)def\s+(\w+)\s*\(/);

    if (classMatch) { out.push(line.replace(/\s+$/, '')); i++; continue; }

    if (defMatch) {
      const [, indent, name] = defMatch;
      // Author's private helper — not part of the asked-for API.
      const isPrivateHelper = name.startsWith('_') && name !== '__init__';

      // Consume the (possibly multi-line) signature.
      const sig = [];
      let depth = 0;
      do {
        const l = lines[i];
        sig.push(l);
        for (const ch of l) {
          if ('([{'.includes(ch)) depth++;
          else if (')]}'.includes(ch)) depth--;
        }
        i++;
      } while (i < lines.length && (depth > 0 || !sig[sig.length - 1].trimEnd().endsWith(':')));

      // Skip the body: every following line indented deeper than the def, plus blanks.
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '') { i++; continue; }
        const ind = (l.match(/^\s*/) ?? [''])[0].length;
        if (ind <= indent.length) break;
        i++;
      }

      if (!isPrivateHelper) {
        out.push(...sig.map(s => s.replace(/\s+$/, '')));
        out.push(`${indent}    `);
        out.push('');
        replaced++;
      }
      continue;
    }

    // Class-level state (`self.x` assignments live in bodies; bare attributes here).
    if (/^\s+\w+\s*[:=]/.test(line) && !trimmed.startsWith('#')) { i++; continue; }

    out.push(line.replace(/\s+$/, ''));
    i++;
  }

  if (!replaced) return null;
  const body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  // A stub ending at the signature is not valid Python — restore the blank body
  // that .trim() removed when the last member was also the last line.
  return /:\s*$/.test(body) ? `${body}\n        ` : body;
}

/**
 * Derive a starter stub for one language.
 * Returns null when the shape is unrecognised — callers must treat that as
 * "no stub", never as an empty template.
 */
export function deriveStarterCode(code, langSlug) {
  if (typeof code !== 'string' || !code.trim()) return null;
  try {
    const stub = langSlug === 'python3' || langSlug === 'python'
      ? derivePython(code)
      : BRACE_LANGS.has(langSlug)
        ? deriveBrace(code, langSlug)
        : null;

    if (!stub || stub.length < 10) return null;
    // A stub that still carries a return/assignment leaked implementation.
    return stub;
  } catch {
    return null;
  }
}

/**
 * Build the code_snippets array for a problem from its editorial approaches.
 * Uses the first approach that yields a stub for each language.
 */
const LANG_LABELS = {
  python3: 'Python3', java: 'Java', cpp: 'C++', c: 'C', golang: 'Go',
  typescript: 'TypeScript', javascript: 'JavaScript', rust: 'Rust',
  csharp: 'C#', php: 'PHP',
};

export function deriveSnippets(editorial) {
  if (!Array.isArray(editorial)) return [];
  const byLang = new Map();
  for (const approach of editorial) {
    for (const [langSlug, code] of Object.entries(approach?.code ?? {})) {
      if (byLang.has(langSlug) || !LANG_LABELS[langSlug]) continue;
      const stub = deriveStarterCode(code, langSlug);
      if (stub) byLang.set(langSlug, stub);
    }
  }
  return [...byLang].map(([langSlug, code]) => ({
    lang: LANG_LABELS[langSlug], langSlug, code,
  }));
}
