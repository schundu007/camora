/**
 * FILL: locate the hole in an otherwise-complete file, and guarantee that
 * everything outside it survives byte-for-byte.
 *
 * "Keep every existing line VERBATIM" is an instruction, and instructions get
 * disobeyed — that is exactly how a 5-line snippet came back as a different
 * program. Over 120 lines the odds are worse and the damage is harder to spot.
 *
 * So preservation here is structural, not prompted: we find the gap ourselves,
 * we tell the model where it is, and when the answer comes back we splice its
 * new block into the ORIGINAL text. Lines outside the gap are never taken from
 * the model at all, so they cannot drift.
 */

/** Body placeholders that mean "nothing is written here yet". */
const MARKER = /(^|\s)(TODO|FIXME)\b|your code here|your solution here|implement (this|me|the)\b|write your code|fill in|complete (this|the) (function|method|body)/i;
const STUB_BODY = /^\s*(pass|\.\.\.|;)\s*$/;
const NOT_IMPLEMENTED = /^\s*(raise\s+NotImplementedError|throw\s+new\s+(UnsupportedOperationException|Error)\s*\(|panic\s*\(|todo!\s*\(|unimplemented!\s*\()/;
/** A line that opens a body: def/class/function/method signature. */
const SIGNATURE = /^\s*((async\s+)?(def|function|fn|func)\s+\w+|class\s+\w+|(public|private|protected|static|final|\s)*[\w<>\[\],\s]+\s+\w+\s*\([^)]*\)\s*\{?\s*$)/;

const indentOf = (line) => line.match(/^[ \t]*/)[0].length;

/**
 * Find the single region the candidate is expected to write.
 * Returns 1-indexed inclusive { startLine, endLine, kind, what } or null.
 *   kind 'replace' — those lines ARE the placeholder and get swapped out.
 *   kind 'insert'  — a signature with no body; new lines go after startLine-1.
 */
export function detectGap(code) {
  if (typeof code !== 'string' || !code.trim()) return null;
  const lines = code.split('\n');

  // 1. An explicit marker is the strongest signal — the interviewer put it there.
  //    Take the whole contiguous run of placeholder lines around it.
  for (let i = 0; i < lines.length; i++) {
    if (!MARKER.test(lines[i])) continue;
    let start = i, end = i;
    while (end + 1 < lines.length && (MARKER.test(lines[end + 1]) || STUB_BODY.test(lines[end + 1]) || NOT_IMPLEMENTED.test(lines[end + 1]))) end++;
    return { startLine: start + 1, endLine: end + 1, kind: 'replace', what: describeEnclosing(lines, start) };
  }

  // 2. A stub body: pass / ... / raise NotImplementedError, indented under something.
  for (let i = 0; i < lines.length; i++) {
    if (!STUB_BODY.test(lines[i]) && !NOT_IMPLEMENTED.test(lines[i])) continue;
    if (indentOf(lines[i]) === 0 && STUB_BODY.test(lines[i])) continue; // a bare top-level `pass` is not a gap
    let end = i;
    while (end + 1 < lines.length && (STUB_BODY.test(lines[end + 1]) || NOT_IMPLEMENTED.test(lines[end + 1]))) end++;
    return { startLine: i + 1, endLine: end + 1, kind: 'replace', what: describeEnclosing(lines, i) };
  }

  // 3. A signature with no body under it at all.
  for (let i = 0; i < lines.length; i++) {
    if (!SIGNATURE.test(lines[i]) || !lines[i].trim()) continue;
    const sigIndent = indentOf(lines[i]);
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const bodyMissing = j >= lines.length || indentOf(lines[j]) <= sigIndent;
    if (!bodyMissing) continue;
    // Ignore a brace-language signature whose body opened on the same line.
    if (/\{\s*\S/.test(lines[i])) continue;
    return { startLine: i + 2, endLine: i + 1, kind: 'insert', what: describeSignature(lines[i]) };
  }

  return null;
}

/** Name the thing the gap sits inside, for the "filled X" report. */
function describeEnclosing(lines, idx) {
  const target = indentOf(lines[idx]);
  for (let i = idx - 1; i >= 0; i--) {
    if (!lines[i].trim()) continue;
    if (indentOf(lines[i]) < target && SIGNATURE.test(lines[i])) return describeSignature(lines[i]);
  }
  return 'the missing block';
}

function describeSignature(line) {
  const m = line.match(/(?:def|function|fn|func)\s+(\w+)/) || line.match(/class\s+(\w+)/) || line.match(/\b(\w+)\s*\(/);
  const kind = /class\s+/.test(line) ? 'class' : 'function';
  return m ? `${kind} ${m[1]}` : 'the missing block';
}

/**
 * Rebuild the file as: original before the gap + the model's new block +
 * original after the gap. Lines outside the gap come from the ORIGINAL, so
 * they are preserved by construction rather than by obedience.
 *
 * `filled` is the model's own report of which fixed_code lines are new
 * (1-indexed inclusive). When it is missing or implausible we fall back to
 * deriving the block from the shared prefix/suffix of the two texts.
 */
export function spliceFill({ original, fixedCode, gap, filled }) {
  if (typeof original !== 'string' || typeof fixedCode !== 'string' || !gap) {
    return { code: fixedCode, preserved: false, reason: 'no gap detected' };
  }
  const orig = original.split('\n');
  const fixed = fixedCode.split('\n');

  let block = null;
  const s = Number(filled?.start_line ?? filled?.startLine);
  const e = Number(filled?.end_line ?? filled?.endLine);
  if (Number.isInteger(s) && Number.isInteger(e) && s >= 1 && e >= s && e <= fixed.length) {
    block = fixed.slice(s - 1, e);
  } else {
    block = deriveBlock(orig, fixed, gap);
    if (!block) return { code: fixedCode, preserved: false, reason: 'could not locate the new block' };
  }
  // The placeholder must not survive inside the new block. Models like to keep
  // the interviewer's "# TODO: ..." line as documentation above the code they
  // wrote — which leaves a file that still advertises an unfinished hole. Drop
  // any line that is byte-identical to a placeholder we replaced, plus any bare
  // pass/.../NotImplementedError. Structural, so no prompt wording can lose it.
  const placeholders = new Set(
    orig.slice(gap.startLine - 1, gap.kind === 'insert' ? gap.startLine - 1 : gap.endLine).map(l => l.trim())
  );
  block = block.filter(l => {
    const t = l.trim();
    if (!t) return true;
    return !(placeholders.has(t) || STUB_BODY.test(l) || NOT_IMPLEMENTED.test(l));
  });

  // An empty block would silently delete the stub and leave a hole.
  if (!block.some(l => l.trim())) return { code: fixedCode, preserved: false, reason: 'model returned an empty block' };

  const before = orig.slice(0, gap.startLine - 1);
  const after = orig.slice(gap.kind === 'insert' ? gap.startLine - 1 : gap.endLine);
  const code = [...before, ...block, ...after].join('\n');
  return {
    code,
    preserved: true,
    filled: { startLine: before.length + 1, endLine: before.length + block.length, what: gap.what },
  };
}

/**
 * Fallback when the model does not report its range: everything the two texts
 * share at the head and tail is untouched, so what remains in the middle of
 * fixed_code is the new block.
 */
function deriveBlock(orig, fixed, gap) {
  let head = 0;
  while (head < orig.length && head < fixed.length && orig[head] === fixed[head]) head++;
  let tail = 0;
  while (
    tail < orig.length - head &&
    tail < fixed.length - head &&
    orig[orig.length - 1 - tail] === fixed[fixed.length - 1 - tail]
  ) tail++;
  const block = fixed.slice(head, fixed.length - tail);
  if (!block.length) return null;
  // The divergence should start at or near the gap; if it starts somewhere else
  // entirely, the model rewrote unrelated code and splicing would paper over it.
  if (Math.abs(head - (gap.startLine - 1)) > 2) return null;
  return block;
}

/** Tell the model exactly where the hole is, so it does not have to guess. */
export function gapDirective(gap, code) {
  if (!gap) return '';
  const lines = code.split('\n');
  const excerpt = lines
    .slice(Math.max(0, gap.startLine - 3), Math.min(lines.length, gap.endLine + 2))
    .map((l, i) => `${Math.max(1, gap.startLine - 2) + i}| ${l}`)
    .join('\n');
  return `
THE GAP HAS ALREADY BEEN LOCATED FOR YOU — do not look for another one.
  • It is ${gap.kind === 'insert' ? `the missing body of ${gap.what}, which starts at line ${gap.startLine}` : `lines ${gap.startLine}-${gap.endLine} (${gap.what})`}.
  • Those placeholder lines are REPLACED by your implementation. The TODO /
    "your code here" marker, the \`pass\`, the \`raise NotImplementedError\` must
    NOT appear anywhere in fixed_code — they are the hole, not content to keep.
  • Context:
${excerpt}
Write ONLY that block. Report the lines of YOUR fixed_code that are new in
"filled": { "start_line": <int>, "end_line": <int> }. Everything else in
fixed_code must be the input reproduced character for character.
`;
}
