/**
 * Turn the worked examples in a problem statement into RUNNABLE test cases.
 *
 * The statement already contains ground truth — "Input: nums = [2,7,11,15],
 * target = 9 / Output: [0,1]" is the interviewer telling you exactly what the
 * program must produce. The old extractor lifted those two lines verbatim, so
 * the test case came out as input `nums = [2,7,11,15], target = 9`, which is a
 * pair of assignments: the runner executes it, nothing is printed, and the case
 * can never pass. The expected side was wrong too — Python prints `[0, 1]`, not
 * the `[0,1]` the statement writes — so even a correct solution mismatched.
 *
 * Here an example is PARSED into values and then RE-EMITTED in the two forms the
 * runner actually needs: a `print(fn(...))` statement, and the exact stdout that
 * statement produces. Anything that cannot be parsed with confidence is dropped
 * rather than guessed, which is the same rule the solve prompt already applies
 * to expecteds ("DROP that test case rather than emit a blank or wrong one").
 */

/** A value recovered from an example, in a shape both emitters understand. */
type Val =
  | { t: 'num'; v: string }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'null' }
  | { t: 'list'; v: Val[] };

export interface CallExample {
  kind: 'call';
  args: Val[];
  expected: Val | null;
  /** The raw Output text, kept when it could not be parsed into a value. */
  expectedRaw: string;
}

export interface StdinExample {
  kind: 'stdin';
  stdin: string;
  expected: string;
}

export type ParsedExample = CallExample | StdinExample;

export interface TestCase {
  input: string;
  expected: string;
}

// ── Value parsing ────────────────────────────────────────────────────────────

/**
 * Recursive-descent reader over one example value. Deliberately small: it
 * covers the literals that actually appear in LeetCode-style statements
 * (arrays, nested arrays, quoted strings, numbers, booleans, null) and refuses
 * everything else. A `null` return means "I do not understand this", which the
 * caller turns into a dropped test case — never a guess.
 */
class ValReader {
  private i = 0;
  constructor(private readonly s: string) {}

  static parse(text: string): Val | null {
    const r = new ValReader(text.trim());
    const v = r.value();
    if (v === null) return null;
    r.ws();
    return r.i === r.s.length ? v : null; // trailing junk → not understood
  }

  private ws() { while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++; }

  private value(): Val | null {
    this.ws();
    const c = this.s[this.i];
    if (c === undefined) return null;
    if (c === '[') return this.list();
    if (c === '"' || c === "'") return this.str(c);
    return this.bare();
  }

  private list(): Val | null {
    this.i++; // consume [
    const items: Val[] = [];
    this.ws();
    if (this.s[this.i] === ']') { this.i++; return { t: 'list', v: items }; }
    for (;;) {
      const v = this.value();
      if (v === null) return null;
      items.push(v);
      this.ws();
      const c = this.s[this.i];
      if (c === ',') { this.i++; continue; }
      if (c === ']') { this.i++; return { t: 'list', v: items }; }
      return null; // unterminated or malformed
    }
  }

  private str(quote: string): Val | null {
    this.i++; // consume opening quote
    let out = '';
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === '\\') {
        const n = this.s[this.i + 1];
        if (n === undefined) return null;
        out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
        this.i += 2;
        continue;
      }
      if (c === quote) { this.i++; return { t: 'str', v: out }; }
      out += c;
      this.i++;
    }
    return null; // unterminated
  }

  /** A number, boolean or null — anything else is refused. */
  private bare(): Val | null {
    const start = this.i;
    while (this.i < this.s.length && !/[,\]]/.test(this.s[this.i])) this.i++;
    const raw = this.s.slice(start, this.i).trim();
    if (!raw) return null;
    if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(raw)) return { t: 'num', v: raw };
    if (/^(true|True)$/.test(raw)) return { t: 'bool', v: true };
    if (/^(false|False)$/.test(raw)) return { t: 'bool', v: false };
    if (/^(null|None|nil)$/.test(raw)) return { t: 'null' };
    return null;
  }
}

/** The value as a Python literal, for building the call. */
function toPythonLiteral(v: Val): string {
  switch (v.t) {
    case 'num': return v.v;
    case 'bool': return v.v ? 'True' : 'False';
    case 'null': return 'None';
    case 'str': return `'${v.v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    case 'list': return `[${v.v.map(toPythonLiteral).join(', ')}]`;
  }
}

/**
 * Exactly what `print()` writes for this value. This is the half the old
 * extractor got wrong: a list prints with a space after each comma, booleans
 * capitalise, and a bare string prints WITHOUT quotes — `print("ab")` is `ab`.
 */
function toPrinted(v: Val): string {
  switch (v.t) {
    case 'num': return v.v;
    case 'bool': return v.v ? 'True' : 'False';
    case 'null': return 'None';
    case 'str': return v.v;                       // print() strips the quotes
    case 'list': return `[${v.v.map(toReprInList).join(', ')}]`;
  }
}

/** Inside a container, print() uses repr() — so strings KEEP their quotes. */
function toReprInList(v: Val): string {
  if (v.t === 'str') return `'${v.v}'`;
  if (v.t === 'list') return `[${v.v.map(toReprInList).join(', ')}]`;
  return toPrinted(v);
}

// ── Splitting an argument list ───────────────────────────────────────────────

/** Split on commas that sit at depth 0 and outside quotes. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, quote: string | null = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += s[i + 1] ?? ''; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === '[' || c === '(' || c === '{') depth++;
    if (c === ']' || c === ')' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map(p => p.trim()).filter(Boolean);
}

/**
 * "nums = [2,7,11,15], target = 9" → the values, in order.
 *
 * Names are dropped on purpose: the call is positional, and a statement that
 * writes `target = 9` is naming the parameter, not asking for a keyword call.
 * Bare values ("Input: [1,2,3]") are accepted too.
 */
function parseArgs(inputText: string): Val[] | null {
  const parts = splitTopLevel(inputText);
  if (!parts.length) return null;
  const vals: Val[] = [];
  for (const part of parts) {
    // Strip a leading `name =`, but never mistake `==` or `>=` for it.
    const m = part.match(/^[A-Za-z_]\w*\s*=(?!=)\s*([\s\S]+)$/);
    const v = ValReader.parse(m ? m[1] : part);
    if (v === null) return null;   // one unparseable arg poisons the example
    vals.push(v);
  }
  return vals;
}

// ── Statement parsing ────────────────────────────────────────────────────────

/**
 * HackerRank-style blocks:
 *   Sample Input 0
 *   4
 *   1 2 3 4
 *   Sample Output 0
 *   10
 * The body is raw stdin, so it is taken verbatim — no value parsing at all.
 */
export function parseStdinExamples(text: string): StdinExample[] {
  const out: StdinExample[] = [];
  const re = /^[ \t]*sample[ \t]+input[ \t]*\d*[ \t]*:?[ \t]*$/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const rest = text.slice(m.index + m[0].length);
    const outM = rest.match(/^[ \t]*\n([\s\S]*?)\n[ \t]*sample[ \t]+output[ \t]*\d*[ \t]*:?[ \t]*\n([\s\S]*?)(?=\n[ \t]*(?:sample[ \t]+input|explanation|note)\b|$)/i);
    if (!outM) continue;
    const stdin = outM[1].replace(/\s+$/, '');
    const expected = outM[2].replace(/\s+$/, '').replace(/^\n+/, '');
    if (stdin.trim() && expected.trim()) out.push({ kind: 'stdin', stdin, expected });
  }
  return out;
}

/**
 * LeetCode-style examples: an `Input:` line followed by an `Output:` line,
 * usually under an `Example N:` header. The Explanation line is ignored.
 */
export function parseCallExamples(text: string): CallExample[] {
  const out: CallExample[] = [];
  const re = /^[ \t]*input[ \t]*:?[ \t]*(.+?)[ \t]*$\s*^[ \t]*output[ \t]*:?[ \t]*(.*?)[ \t]*$/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const args = parseArgs(m[1]);
    if (!args) continue;                       // ambiguous → skip, never guess
    const expectedRaw = m[2].trim();
    out.push({ kind: 'call', args, expected: ValReader.parse(expectedRaw), expectedRaw });
  }
  return out;
}

export function parseProblemExamples(text: string): ParsedExample[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  // stdin first: a HackerRank statement carries BOTH a "Sample Input" block and
  // bare "Input:" lines, and only the former says how the program is invoked.
  const stdin = parseStdinExamples(text);
  if (stdin.length) return stdin;
  return parseCallExamples(text);
}

// ── Locating the function to call ────────────────────────────────────────────

export interface SolutionFn {
  name: string;
  arity: number;
  /** True for a LeetCode `class Solution:` method — needs an instance. */
  isMethod: boolean;
}

/**
 * Find the entry point in the candidate's code. When several defs are present,
 * the one whose parameter count matches the example wins — a deterministic
 * tiebreak that beats "assume the first one" on any problem with helpers.
 */
export function detectSolutionFn(code: string, argCount?: number): SolutionFn | null {
  if (typeof code !== 'string' || !code.trim()) return null;
  const fns: SolutionFn[] = [];
  const re = /^([ \t]*)def[ \t]+([A-Za-z_]\w*)[ \t]*\(([^)]*)\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const [, indent, name, rawParams] = m;
    if (name.startsWith('__')) continue;
    const params = splitTopLevel(rawParams).filter(p => p && !p.startsWith('*'));
    const isMethod = indent.length > 0 && params[0] === 'self';
    if (indent.length > 0 && !isMethod) continue;   // nested helper, not an entry point
    fns.push({ name, arity: params.length - (isMethod ? 1 : 0), isMethod });
  }
  if (!fns.length) return null;
  if (typeof argCount === 'number') {
    const exact = fns.find(f => f.arity === argCount);
    if (exact) return exact;
  }
  return fns[0];
}

// ── Emitting runnable cases ──────────────────────────────────────────────────

/**
 * Build `{input, expected}` pairs the runner can actually execute.
 *
 * Call-style synthesis is Python-only on purpose: the solve contract already
 * specifies `print(function_name(arg))`, and every other language would need its
 * own literal syntax and its own printed form. For those, stdin examples still
 * work (they are language-agnostic) and call examples are skipped.
 */
export function buildTestCases(
  examples: ParsedExample[],
  opts: { code?: string; language?: string } = {},
): TestCase[] {
  const out: TestCase[] = [];
  const isPython = !opts.language || /^py/i.test(opts.language);

  for (const ex of examples) {
    if (ex.kind === 'stdin') {
      out.push({ input: ex.stdin, expected: ex.expected });
      continue;
    }
    if (!isPython) continue;
    const fn = detectSolutionFn(opts.code || '', ex.args.length);
    if (!fn) continue;                     // no code yet → nothing to call
    if (fn.arity !== ex.args.length) continue; // signature disagrees → skip
    const call = `${fn.isMethod ? 'Solution().' : ''}${fn.name}(${ex.args.map(toPythonLiteral).join(', ')})`;
    // An unparseable Output still runs — the candidate sees actual vs stated.
    const expected = ex.expected ? toPrinted(ex.expected) : ex.expectedRaw;
    out.push({ input: `print(${call})`, expected });
  }
  return out;
}

/** Ground-truth examples first, then any generated case that adds something new. */
export function mergeTestCases(fromProblem: TestCase[], generated: TestCase[], max = 10): TestCase[] {
  const seen = new Set(fromProblem.map(t => t.input.trim()));
  const merged = [...fromProblem];
  for (const g of generated) {
    const key = g.input.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(g);
  }
  return merged.slice(0, max);
}
