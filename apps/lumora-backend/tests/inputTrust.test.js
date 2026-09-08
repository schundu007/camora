import { describe, it, expect } from 'vitest';
import { inferInputTrust, buildCodingSystemPrompt } from '../src/routes/coding.js';

// The exact 2026-09-07 report: HackerRank "Word Order", pasted with its markdown
// intact. The bolded "**Constraints:**" header and the Unicode ≤ signs both made
// the old detector miss a statement that plainly states its bounds, so the prompt
// asked for validation guards and the model emitted a try/except EOFError driver.
const WORD_ORDER = `Word Order

You are given n words. Some words may repeat. For each word, output its number of occurrences.

**Note:** Each input line ends with a "\\n" character.

**Constraints:**
1≤ n≤ 10^5
The sum of the lengths of all the words do not exceed 10^6

Input Format
The first line contains the integer, n.
The next n lines each contain a word.

Output Format
Output 2 lines.`;

describe('inferInputTrust', () => {
  it('reads bounds through markdown bold and Unicode ≤ (Word Order)', () => {
    expect(inferInputTrust(WORD_ORDER, null)).toBe('guaranteed');
  });

  it('still reads a plain ASCII constraints block', () => {
    expect(inferInputTrust('Constraints:\n2 <= nums.length <= 10^4', null)).toBe('guaranteed');
  });

  it('reads a markdown-heading constraints block', () => {
    expect(inferInputTrust('### Constraints\n1 <= n <= 500', null)).toBe('guaranteed');
  });

  it('trusts a class Solution signature', () => {
    expect(inferInputTrust('class Solution:\n  def twoSum(self, nums, target):', null)).toBe('guaranteed');
  });

  it('stays adversarial with no stated bounds', () => {
    expect(inferInputTrust('Reverse a singly linked list.', null)).toBe('adversarial');
  });

  it('does not mistake prose comparisons for a bounds block', () => {
    expect(inferInputTrust('Constraints:\nthe left value must be smaller than the right one', null)).toBe('adversarial');
  });
});

describe('RULE #3.6 — platform-idiomatic solutions', () => {
  const prompt = buildCodingSystemPrompt('python', undefined, undefined, false, 'stdin-print', 'guaranteed');

  it('demands the accepted community solution, not a clever one', () => {
    expect(prompt).toContain('RULE #3.6');
    expect(prompt).toContain('ACCEPTED COMMUNITY SOLUTION');
    expect(prompt).toMatch(/HackerRank, CodeSignal, CoderPad or Glider/);
  });

  it('forbids the three tells from the reported answer', () => {
    expect(prompt).toContain('NO DRIVER WRAPPED IN try/except');
    expect(prompt).toContain('Do NOT slurp the whole');
    expect(prompt).toContain('USE THE PLAIN BUILT-IN WHEN IT ALREADY DOES THE JOB');
  });

  it('tells the model that line count never buys unfamiliarity', () => {
    expect(prompt).toContain('line count never buys unfamiliarity');
  });

  it('no longer tells the model to inline every intermediate variable', () => {
    expect(prompt).not.toContain('NO intermediate variables if you can inline');
    expect(prompt).not.toContain('- Combine operations where possible\n');
  });
});

describe('RULE #3 — stdin/print is the contract, not an exception', () => {
  it('leads with the stdin+print contract when the statement states its I/O format', () => {
    const p = buildCodingSystemPrompt('python', undefined, undefined, false, 'stdin-print', 'guaranteed');
    expect(p).toContain('THIS PROBLEM STATES ITS OWN I/O FORMAT');
    expect(p).toContain('never one solution that prints and another that returns a');
    // The pure-function contract must still be BELOW it, for contrast.
    expect(p.indexOf('THIS PROBLEM STATES ITS OWN I/O FORMAT'))
      .toBeLessThan(p.indexOf('The test runner PARSES'));
  });

  it('stays silent on the other contracts', () => {
    for (const io of [null, 'unknown', 'pure-function']) {
      expect(buildCodingSystemPrompt('python', undefined, undefined, false, io, 'guaranteed'))
        .not.toContain('THIS PROBLEM STATES ITS OWN I/O FORMAT');
    }
  });

  it('starter code still wins — no stdin preamble when a template is locked', () => {
    const p = buildCodingSystemPrompt('python', undefined, 'def solve():\n    pass', false, 'stdin-print', 'guaranteed');
    expect(p).not.toContain('THIS PROBLEM STATES ITS OWN I/O FORMAT');
  });
});
