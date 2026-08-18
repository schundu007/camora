/**
 * The demo call the model keeps adding, removed from the code you actually see.
 *
 * The prompt says not to emit `print(Solution().reverseList([1,2,3]))` and the
 * model does it anyway. The backend already strips module-level prints before
 * RUNNING the code — otherwise their output lands in stdout ahead of the
 * harness's and every test compares "6\n9" against "6" — but nothing strips
 * them from the program shown in the editor, so the candidate is looking at a
 * hardcoded call they would have to notice and delete themselves.
 *
 * Deliberately narrow. A module-level print is NOT automatically demo code: on
 * a stdin/print problem it IS the program's output. What gives a demo away is
 * calling the solution's own entry point with LITERAL arguments — a real
 * program prints a computed variable, never `f([1,2,3])`. Both halves must be
 * true, so `print(result)` and `print(f(nums))` are left alone.
 */

/** `print(...)` / `console.log(...)` / `System.out.println(...)` at column 0. */
const OUTPUT_CALL = /^(?:print|console\.log|System\.out\.println|fmt\.Println|std::cout\s*<<)\s*\(?/;

/** A literal argument: a number, a string, a list or an object. */
const HAS_LITERAL = /\(\s*[[{"'\d-]/;

/** Calls the solution itself — `Solution().foo(`, `new Solution()`, or `foo(`. */
const callsEntryPoint = (line: string, names: string[]) =>
  /\bSolution\s*\(\s*\)\s*\./.test(line)
  || /\bnew\s+Solution\s*\(/.test(line)
  || names.some(n => n && new RegExp(`\\b${n}\\s*\\(`).test(line));

/** Entry-point names declared in the code — `def foo(`, `function foo(`, `foo = (`. */
export function entryPointNames(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/^[ \t]*def[ \t]+([A-Za-z_]\w*)[ \t]*\(/gm)) out.add(m[1]);
  for (const m of code.matchAll(/^[ \t]*function[ \t]+([A-Za-z_]\w*)[ \t]*\(/gm)) out.add(m[1]);
  for (const m of code.matchAll(/^[ \t]*(?:const|let|var)[ \t]+([A-Za-z_]\w*)[ \t]*=[ \t]*(?:function|\()/gm)) out.add(m[1]);
  out.delete('main');
  return [...out].filter(n => !n.startsWith('__'));
}

export function stripDemoCalls(code: string): string {
  if (!code || !code.includes('(')) return code;
  const names = entryPointNames(code);
  const lines = code.split('\n');

  const kept = lines.filter((line) => {
    if (!OUTPUT_CALL.test(line)) return true;         // not an output call at column 0
    if (!HAS_LITERAL.test(line)) return true;         // prints a variable, not a literal
    return !callsEntryPoint(line, names);             // only drop calls to the solution
  });

  if (kept.length === lines.length) return code;
  // Collapse the hole the removal leaves, and never end on a run of blanks.
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n';
}
