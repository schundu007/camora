import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { executeCode, stripModuleLevelPrints} from '../src/services/codeRunner.js';

// These tests exercise the real Python test-case harness in codeRunner.js.
// They require a `python3` runtime; when absent (rare CI images) they self-skip
// so the suite stays green everywhere.
let hasPython = false;
beforeAll(async () => {
  hasPython = await new Promise((resolve) => {
    execFile('python3', ['--version'], (err) => resolve(!err));
  });
});

const py = (name, fn) => it(name, async (ctx) => {
  if (!hasPython) return ctx.skip();
  await fn();
});

describe('codeRunner Python harness — input/output correctness', () => {
  // Regression: the auto-invoke harness used to `print(_result)` unconditionally,
  // so a stdin/print solution (which returns None) got "None" appended to every
  // line of output and failed all test cases. Guarded with `if _result is not None`.
  py('does not append "None" for stdin/print solutions that return None', async () => {
    const code = [
      'def solve():',
      '    n = int(input())',
      "    print('Weird' if n % 2 else 'Not Weird')",
    ].join('\n');
    const res = await executeCode(code, 'python', [
      { input: '3', expected: 'Weird' },
      { input: '4', expected: 'Not Weird' },
    ]);
    expect(res.results.map((r) => r.output)).toEqual(['Weird', 'Not Weird']);
    expect(res.all_passed).toBe(true);
  });

  // Regression: the `class Solution` entry-point detector regex was written with a
  // single-backslash `(\w+)` inside a JS template literal, which JS collapses to a
  // literal `(w+)`. That made the detector match only method names made of "w",
  // so every real LeetCode-style method (twoSum, reverseWord, …) fell through to
  // the simulation path and produced "(no output)". Fixed to `(\\w+)`.
  py('detects a class Solution method with a normal name and prints its return', async () => {
    const code = [
      'class Solution:',
      '    def reverseWord(self, s):',
      '        return s[::-1]',
    ].join('\n');
    const res = await executeCode(code, 'python', [{ input: 'hello', expected: 'olleh' }]);
    expect(res.results[0].output).toBe('olleh');
    expect(res.all_passed).toBe(true);
  });

  py('runs a standalone function that returns a value', async () => {
    const code = ['def add(a, b):', '    return a + b'].join('\n');
    const res = await executeCode(code, 'python', [{ input: '2 3', expected: '5' }]);
    expect(res.results[0].output).toBe('5');
    expect(res.all_passed).toBe(true);
  });

  // A function returning a falsy-but-not-None value must still be printed.
  py('prints falsy-but-not-None return values (0, False)', async () => {
    const zero = await executeCode('def f(a, b):\n    return a - b', 'python', [
      { input: '5 5', expected: '0' },
    ]);
    expect(zero.results[0].output).toBe('0');
    const bool = await executeCode('def is_even(n):\n    return n % 2 == 0', 'python', [
      { input: '3', expected: 'False' },
    ]);
    expect(bool.results[0].output).toBe('False');
  });

  // "Test against custom input": opts.stdin runs the code once feeding raw stdin,
  // bypassing the test-case harness, and returns direct output.
  py('runs against custom stdin via opts.stdin (bypasses test cases)', async () => {
    const single = await executeCode('n = int(input())\nprint(n * n)', 'python', [], { stdin: '7\n' });
    expect(single.direct_output).toBe('49');
    const multi = await executeCode(
      'import sys\nprint(sum(int(x) for x in sys.stdin.read().split()))',
      'python', [], { stdin: '1 2 3\n4 5\n' },
    );
    expect(multi.direct_output).toBe('15');
    // No opts → unchanged direct execution (regression guard).
    const plain = await executeCode('print(1 + 1)', 'python', []);
    expect(plain.direct_output).toBe('2');
  });
});

// A model that appends its own demo driver made every test case fail:
//
//     print(Solution().trap([0,1,0,2,1,0,1,3,2,1,2,1]))
//     print(Solution().trap([4,2,0,3,2,5]))
//
// Those execute at module level, so the captured stdout is "6\n9\n<result>"
// while `expected` is just "<result>". The existing footer cleanup only removed a
// trailing call to a function the code itself defined, and `print` is not one of
// those — so both lines survived and every case compared unequal.
describe('stripModuleLevelPrints', () => {
  const SOLUTION = [
    'class Solution:',
    '    def trap(self, height):',
    '        return 6',
  ].join('\n');

  it('removes the appended demo driver', () => {
    const out = stripModuleLevelPrints(
      `${SOLUTION}\n\nprint(Solution().trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))\nprint(Solution().trap([4, 2, 0, 3, 2, 5]))\n`,
    );
    expect(out).not.toContain('print(Solution()');
    expect(out).toContain('class Solution:');
    expect(out).toContain('return 6');
  });

  // An indented print is inside a function body — possibly the solution's actual
  // output. Removing it would change what the code does.
  it('keeps prints inside function bodies', () => {
    const code = 'def f(x):\n    print(x)\n    return x\n';
    expect(stripModuleLevelPrints(code)).toContain('    print(x)');
  });

  it('removes a print spanning several lines whole', () => {
    const out = stripModuleLevelPrints(
      `${SOLUTION}\n\nprint(\n    Solution().trap(\n        [4, 2, 0, 3, 2, 5]\n    )\n)\n`,
    );
    expect(out).not.toContain('print(');
    expect(out).toContain('class Solution:');
  });

  it('removes several drivers and leaves the solution intact', () => {
    const out = stripModuleLevelPrints(`${SOLUTION}\nprint(1)\nprint(2)\nprint(3)\n`);
    expect(out.trim()).toBe(SOLUTION);
  });

  // Truncating a program on unbalanced parens would be worse than leaving the
  // stray line in — the syntax error at least says what is wrong.
  it('leaves an unterminated print alone rather than truncating', () => {
    const code = `${SOLUTION}\nprint(Solution().trap([1, 2\n`;
    expect(stripModuleLevelPrints(code)).toContain('print(Solution().trap([1, 2');
  });

  it('is a no-op for code with no module-level print', () => {
    expect(stripModuleLevelPrints(SOLUTION)).toBe(SOLUTION);
    expect(stripModuleLevelPrints('')).toBe('');
  });
});
