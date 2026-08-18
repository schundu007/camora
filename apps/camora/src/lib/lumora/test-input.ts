/**
 * Test-case inputs, unwrapped from the code the model keeps putting there.
 *
 * The solve prompt is explicit that `input` is the RAW program input and never
 * a code statement — it even names the failure ("will fail with NameError").
 * The model writes `print(Solution().minWindow('ADOBECODEBANC', 'ABC'))` into
 * the input field anyway. The runner then treats that whole string as an
 * ARGUMENT expression, evaluates it, and compares the result of the wrong thing
 * against `expected` — which is why the tests fail rather than error.
 *
 * Peeling it here, where the cases are stored, fixes it for answers already
 * cached and for whatever the user runs next. Only leading CALLS are peeled, so
 * genuine stdin ("2000"), argument text ("nums = [2,7], target = 9") and JSON
 * ("[1,2,3]") pass through untouched.
 */

/** `Solution().method(` or `new Solution().method(` — the receiver-chain form. */
const RECEIVER_CALL = /^(?:new\s+)?[A-Za-z_]\w*\s*\(\s*\)\s*\.\s*[A-Za-z_]\w*\s*\(/;
/** `print(`, `console.log(`, `solve(`, `obj.method(` — a plain call. */
const PLAIN_CALL = /^[A-Za-z_][\w.]*\s*\(/;

/**
 * Remove one layer of call syntax, returning the argument text — but only when
 * the call's closing paren is the LAST character, so `f(1) + g(2)` is not
 * mistaken for a single wrapped call.
 */
function peelCall(raw: string): string | null {
  const s = raw.trim();
  if (!s.endsWith(')')) return null;

  const head = RECEIVER_CALL.exec(s) ?? PLAIN_CALL.exec(s);
  if (!head) return null;

  const open = head[0].length - 1; // index of the '(' the match ends on
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i === s.length - 1 ? s.slice(open + 1, i) : null;
    }
  }
  return null;
}

export function normalizeTestInput(raw: unknown): string {
  let s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return '';
  // `print(Solution().reverseList([1,2,3]))` is two layers deep. Bounded so a
  // pathological string cannot spin.
  for (let i = 0; i < 4; i++) {
    const inner = peelCall(s);
    if (inner === null) break;
    s = inner.trim();
  }
  return s;
}

/** Applied to a whole examples array on the way into state. */
export function normalizeExamples(
  examples: any[],
): { input: string; expected: string }[] {
  return (Array.isArray(examples) ? examples : []).map((ex) => ({
    input: normalizeTestInput(ex?.input),
    expected: typeof ex?.expected === 'string' ? ex.expected.trim() : String(ex?.expected ?? ''),
  }));
}
