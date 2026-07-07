import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { executeCode } from '../src/services/codeRunner.js';

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
