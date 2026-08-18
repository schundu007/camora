import { describe, it, expect } from 'vitest';
import { stripDemoCalls } from './demo-calls';

const SOL = 'class Solution:\n    def reverseList(self, head):\n        return head\n';

describe('stripDemoCalls', () => {
  it('removes the demo call the model keeps adding', () => {
    const out = stripDemoCalls(`${SOL}\nprint(Solution().reverseList([1, 2, 3, 4, 5]))\n`);
    expect(out).not.toContain('print(Solution()');
    expect(out).toContain('def reverseList');
  });

  it('removes a bare function demo call with literal args', () => {
    const src = 'def trap(height):\n    return 0\n\nprint(trap([0,1,0,2]))\n';
    expect(stripDemoCalls(src)).not.toContain('print(trap(');
  });

  // A module-level print is not automatically demo code — on a stdin/print
  // problem it IS the program's output.
  it('keeps a print of a computed value', () => {
    const src = 'n = int(input())\nresult = solve(n)\nprint(result)\n';
    expect(stripDemoCalls(src)).toBe(src);
  });

  it('keeps a call whose arguments are variables, not literals', () => {
    const src = 'def solve(nums):\n    return nums\n\nnums = read()\nprint(solve(nums))\n';
    expect(stripDemoCalls(src)).toBe(src);
  });

  it('leaves an indented print inside a function alone', () => {
    const src = 'def f(a):\n    print(f([1,2]))\n    return a\n';
    expect(stripDemoCalls(src)).toBe(src);
  });

  it('handles console.log demos', () => {
    const src = 'function twoSum(n, t) { return []; }\n\nconsole.log(twoSum([2,7], 9));\n';
    expect(stripDemoCalls(src)).not.toContain('console.log(twoSum');
  });

  it('is a no-op on code with no output calls', () => {
    expect(stripDemoCalls(SOL)).toBe(SOL);
  });
});
