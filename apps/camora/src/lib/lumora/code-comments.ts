/**
 * Put the line-by-line INSIDE the code.
 *
 * The explanations used to render as a Walkthrough card beside the editor: a
 * row per line, each row repeating the line's source text so you could find it
 * again. Reading it meant holding a line of code in one pane and hunting for
 * its row in the other, and the row's code text was a second copy of something
 * already on screen. Appended to the line it describes, the same words cost no
 * card, no scroll, and no matching by eye.
 *
 * Done here rather than by asking the model for pre-commented code, because:
 *   - it is deterministic, so answers cached before this change get comments too;
 *   - the model cannot drop a `#` inside a string literal and break the program
 *     the candidate is about to run;
 *   - the comment marker follows the language, not the model's habit.
 */

export type Explanation = { line?: number; code?: string; explanation?: string };

const HASH_LANGS = new Set([
  'python', 'python3', 'py', 'ruby', 'rb', 'bash', 'sh', 'shell', 'zsh',
  'perl', 'r', 'yaml', 'yml', 'elixir', 'julia',
]);
const DASH_LANGS = new Set(['sql', 'mysql', 'postgres', 'postgresql', 'plsql', 'lua', 'haskell', 'ada']);

/** Python-shaped source, for when `language` is 'auto' or missing. */
const looksPython = (code: string) =>
  /^\s*(?:def|class)\s+\w+[^\n]*:\s*$/m.test(code) ||
  /^\s*(?:from\s+[\w.]+\s+)?import\s+\w/m.test(code);

export const commentTokenFor = (language?: string, code = ''): string => {
  const l = (language || '').toLowerCase().trim();
  if (HASH_LANGS.has(l)) return '#';
  if (DASH_LANGS.has(l)) return '--';
  // 'auto' / unset / a name we don't know: guess from the source rather than
  // defaulting to `//` and commenting Python out of existence.
  if (!l || l === 'auto') return looksPython(code) ? '#' : '//';
  return '//';
};

type Block = null | "'''" | '"""' | '/*' | '`';

/**
 * One line of a single-pass scan. Reports where the line LEAVES us (inside a
 * docstring, template literal or block comment), whether it already carries a
 * comment, and whether a quote opened and never closed — all three mean the
 * line cannot take a trailing comment.
 */
const scanLine = (line: string, block: Block, token: string) => {
  let comment = false;
  let unterminated = false;
  let i = 0;

  while (i < line.length) {
    if (block) {
      if (line.startsWith(block, i)) { i += block.length; block = null; }
      else i++;
      continue;
    }
    if (line[i] === '\\') { i += 2; continue; }
    if (line.startsWith("'''", i) || line.startsWith('"""', i)) {
      block = line.slice(i, i + 3) as Block;
      i += 3;
      continue;
    }
    if (line.startsWith('/*', i)) { block = '/*'; i += 2; continue; }
    if (line.startsWith(token, i)) { comment = true; break; }
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let closed = false;
      i++;
      while (i < line.length) {
        if (line[i] === '\\') { i += 2; continue; }
        if (line[i] === quote) { i++; closed = true; break; }
        i++;
      }
      if (!closed) {
        // A template literal legitimately spans lines; anything else that runs
        // off the end is a continuation we should not touch either way.
        if (quote === '`') block = '`';
        else unterminated = true;
        break;
      }
      continue;
    }
    i++;
  }

  return { block, comment, unterminated };
};

/**
 * Which lines can safely take a trailing comment.
 *
 * Excluded: blank lines, lines already commented, lines inside (or opening) a
 * docstring / block comment / template literal, and explicit `\` continuations,
 * where a comment would either land inside a string or break the statement.
 */
const safeLines = (lines: string[], token: string): boolean[] => {
  const safe: boolean[] = [];
  let block: Block = null;
  for (const line of lines) {
    const openedBefore = block !== null;
    const r = scanLine(line, block, token);
    block = r.block;
    safe.push(
      !openedBefore && !r.block && !r.comment && !r.unterminated &&
      Boolean(line.trim()) && !line.trimEnd().endsWith('\\'),
    );
  }
  return safe;
};

/**
 * Brackets of one kind, dropped entirely if they do not balance.
 *
 * Downstream tooling scans this code with cheap character heuristics — the
 * runner's module-level `print(...)` stripper balances parens across the whole
 * file — and one stray bracket in prose makes those miscount. Balanced pairs
 * are harmless and worth keeping: `O(1)` and `O(n log n)` are most of what
 * these comments say.
 */
const dropUnbalanced = (s: string, open: string, close: string): string => {
  let depth = 0;
  for (const ch of s) {
    if (ch === open) depth++;
    else if (ch === close && --depth < 0) break;
  }
  if (depth === 0) return s;
  return s.split(open).join('').split(close).join('');
};

/**
 * The explanation as a comment body: one line, no markup, no quote characters
 * (an odd apostrophe trips the same class of scanner), brackets only where they
 * balance, and short enough to sit at the end of a line of code.
 */
const commentText = (value: unknown): string => {
  const s = String(value ?? '')
    .replace(/[`*"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  // Truncate BEFORE balancing — cutting the tail is itself a way to strand an
  // opening bracket.
  const capped = s.length > 88 ? `${s.slice(0, 87).trimEnd()}…` : s;
  return ['()', '[]', '{}'].reduce((acc, [o, c]) => dropUnbalanced(acc, o, c), capped);
};

/**
 * Which line an explanation belongs to.
 *
 * `code` (the line's verbatim text) wins over `line` — the model's line numbers
 * drift when it reformats, but it quotes the line it meant. `line` breaks ties
 * between identical lines and is the fallback when the quote matches nothing.
 */
const resolveLine = (
  lines: string[],
  safe: boolean[],
  used: Set<number>,
  ex: Explanation,
  index: number,
): number => {
  const hint = typeof ex.line === 'number' && ex.line >= 1 ? ex.line - 1 : index;
  const target = (ex.code || '').trim();

  if (target) {
    let best = -1;
    for (let i = 0; i < lines.length; i++) {
      if (!safe[i] || used.has(i) || lines[i].trim() !== target) continue;
      if (best < 0 || Math.abs(i - hint) < Math.abs(best - hint)) best = i;
    }
    if (best >= 0) return best;
  }
  return safe[hint] && !used.has(hint) ? hint : -1;
};

/**
 * `code` with each explanation appended to the line it describes.
 *
 * Returns the code untouched when there is nothing to add, when nothing
 * resolves, or when the input is too long to be a solution someone is reading
 * line by line.
 */
export function annotateSolutionCode(
  code: string,
  explanations?: Explanation[] | null,
  language?: string,
): string {
  if (!code || !Array.isArray(explanations) || explanations.length === 0) return code;

  const lines = code.split('\n');
  if (lines.length > 400) return code;

  const token = commentTokenFor(language, code);
  const safe = safeLines(lines, token);
  const used = new Set<number>();
  const out = [...lines];

  explanations.forEach((ex, i) => {
    const text = commentText(ex?.explanation);
    if (!text) return;
    const target = resolveLine(lines, safe, used, ex, i);
    if (target < 0) return;
    used.add(target);
    // Two spaces before the marker — PEP 8's inline-comment rule, and the
    // convention everywhere else too.
    out[target] = `${out[target].trimEnd()}  ${token} ${text}`;
  });

  return out.join('\n');
}
