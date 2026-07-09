import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { inferInputTrust, buildCodingSystemPrompt } from '../src/routes/coding.js';

// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────
const LEETCODE_CLASS_SOLUTION = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        pass`;

const CONSTRAINTS_BLOCK_PROBLEM = `Given an array nums and a target, return indices of the two numbers.

Constraints:
1 <= nums.length <= 10^5
-10^9 <= nums[i] <= 10^9`;

const BARE_PROBLEM = 'Reverse a singly linked list. Do it iteratively and recursively.';

const HACKERRANK_STDIN_PROBLEM = `Given an array of integers, find the sum.

Input Format
The first line contains an integer n.
The second line contains n space-separated integers.

Output Format
Print the sum.

Sample Input
3
1 2 3

Sample Output
6`;

describe('inferInputTrust', () => {
  it('class Solution means guaranteed', () => {
    expect(inferInputTrust(LEETCODE_CLASS_SOLUTION)).toBe('guaranteed');
  });

  it('an explicit Constraints block with a bound means guaranteed', () => {
    expect(inferInputTrust(CONSTRAINTS_BLOCK_PROBLEM)).toBe('guaranteed');
  });

  it('a bare prompt with no signal means adversarial', () => {
    expect(inferInputTrust(BARE_PROBLEM)).toBe('adversarial');
  });

  it('a HackerRank stdin problem (no class Solution, no Constraints bound) means adversarial', () => {
    expect(inferInputTrust(HACKERRANK_STDIN_PROBLEM)).toBe('adversarial');
  });

  it('tolerates a non-string problem, defaulting to adversarial', () => {
    expect(inferInputTrust(undefined)).toBe('adversarial');
    expect(inferInputTrust(null)).toBe('adversarial');
    expect(inferInputTrust(123)).toBe('adversarial');
  });
});

describe('buildCodingSystemPrompt — RULE #2.8 (solution quality contract)', () => {
  const adversarial = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'unknown', 'adversarial');
  const guaranteed = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'pure-function', 'guaranteed');
  const legacy5 = () => buildCodingSystemPrompt('python', undefined, undefined, true, null);
  const legacy6Null = () => buildCodingSystemPrompt('python', undefined, undefined, true, null, null);
  const legacy4 = () => buildCodingSystemPrompt('python', undefined, undefined, true);

  it('emits RULE #2.8 when inputTrust is set (adversarial or guaranteed)', () => {
    expect(adversarial()).toContain('RULE #2.8: SOLUTION QUALITY');
    expect(guaranteed()).toContain('RULE #2.8: SOLUTION QUALITY');
  });

  it('omits RULE #2.8 entirely when inputTrust is null (legacy default)', () => {
    expect(legacy5()).not.toContain('RULE #2.8');
    expect(legacy6Null()).not.toContain('RULE #2.8');
    expect(legacy4()).not.toContain('RULE #2.8');
  });

  it('the adversarial guard sentence tells the driver to validate malformed input', () => {
    const p = adversarial();
    expect(p).toContain('Input may be malformed (hidden/destructive tests)');
    expect(p).toContain('produce a DEFINED failure output — never an uncaught exception/traceback');
    // must NOT contain the guaranteed-path sentence
    expect(p).not.toContain('Input is guaranteed well-formed by the stated constraints');
  });

  it('the guaranteed guard sentence forbids dead-code validation guards', () => {
    const p = guaranteed();
    expect(p).toContain('Input is guaranteed well-formed by the stated constraints');
    expect(p).toContain('unreachable DEAD CODE and cost quality points');
    // must NOT contain the adversarial-path sentence
    expect(p).not.toContain('Input may be malformed (hidden/destructive tests)');
  });

  it('always states the four other quality axes when RULE #2.8 fires', () => {
    for (const p of [adversarial(), guaranteed()]) {
      expect(p).toContain('EVERY EXCEPTION HANDLER MUST BE REACHABLE');
      expect(p).toContain('ONE ALGORITHM PER SOLUTION');
      expect(p).toContain('DECOMPOSE AND NAME HONESTLY');
      expect(p).toContain('NARRATION MUST BE TRUE TO THE CODE');
      expect(p).toContain('STEP E (silent, internal — after STEP D)');
    }
  });

  it('RULE #2.8 is placed after RULE #2.7 and before RULE #3', () => {
    const p = adversarial(); // ioContract='unknown' + no starterCode => RULE #2.7 also fires
    const idx27 = p.indexOf('RULE #2.7');
    const idx28 = p.indexOf('RULE #2.8');
    const idx3 = p.indexOf('RULE #3: CODE STRUCTURE');
    expect(idx27).toBeGreaterThan(-1);
    expect(idx28).toBeGreaterThan(idx27);
    expect(idx3).toBeGreaterThan(idx28);
  });
});

describe('buildCodingSystemPrompt — new output fields (optimality/submittable/edgeScenarios/assistantPrompts)', () => {
  const withTrust = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'pure-function', 'guaranteed');
  const legacy = () => buildCodingSystemPrompt('python', undefined, undefined, true, null, null);

  it('adds optimality + submittable + submittableReason to the solution schema when set', () => {
    const p = withTrust();
    expect(p).toContain('"optimality"');
    expect(p).toContain('"required": "O(?) the constraints demand"');
    expect(p).toContain('"achieved": "O(?) this code is"');
    expect(p).toContain('"tleRisk"');
    expect(p).toContain('"submittable"');
    expect(p).toContain('"submittableReason"');
  });

  it('adds top-level edgeScenarios + assistantPrompts when set', () => {
    const p = withTrust();
    expect(p).toContain('"edgeScenarios"');
    expect(p).toContain('"assistantPrompts"');
  });

  it('omits ALL new output fields entirely when inputTrust is null (legacy default)', () => {
    const p = legacy();
    expect(p).not.toContain('"optimality"');
    expect(p).not.toContain('"submittable"');
    expect(p).not.toContain('"submittableReason"');
    expect(p).not.toContain('"edgeScenarios"');
    expect(p).not.toContain('"assistantPrompts"');
  });

  it('edgeScenarios appears AFTER examples in the rendered string', () => {
    const p = withTrust();
    const idxExamples = p.indexOf('"examples"');
    const idxEdge = p.indexOf('"edgeScenarios"');
    expect(idxExamples).toBeGreaterThan(-1);
    expect(idxEdge).toBeGreaterThan(idxExamples);
  });

  it('edgeScenarios appears AFTER assumptions in the rendered string', () => {
    const p = withTrust();
    const idxAssumptions = p.indexOf('"assumptions"');
    const idxEdge = p.indexOf('"edgeScenarios"');
    expect(idxAssumptions).toBeGreaterThan(-1);
    expect(idxEdge).toBeGreaterThan(idxAssumptions);
  });

  it('assistantPrompts appears AFTER edgeScenarios (both after examples/assumptions)', () => {
    const p = withTrust();
    const idxEdge = p.indexOf('"edgeScenarios"');
    const idxAssistant = p.indexOf('"assistantPrompts"');
    expect(idxAssistant).toBeGreaterThan(idxEdge);
  });

  it('edgeScenarios/assistantPrompts appear AFTER solutions[].code in the rendered string (truncation costs coaching fields, never code)', () => {
    const p = withTrust();
    const idxCode = p.indexOf('"code"');
    const idxEdge = p.indexOf('"edgeScenarios"');
    expect(idxCode).toBeGreaterThan(-1);
    expect(idxEdge).toBeGreaterThan(idxCode);
  });
});

describe('legacy byte-identical guarantee', () => {
  it('5-arg call and 6-arg call with inputTrust=null produce byte-identical output', () => {
    const fiveArg = buildCodingSystemPrompt('python', undefined, undefined, true, null);
    const sixArgNull = buildCodingSystemPrompt('python', undefined, undefined, true, null, null);
    expect(sixArgNull).toBe(fiveArg);
  });

  it('4-arg call (no ioContract/inputTrust) is byte-identical to explicit nulls', () => {
    const fourArg = buildCodingSystemPrompt('python', undefined, undefined, true);
    const sixArgNull = buildCodingSystemPrompt('python', undefined, undefined, true, null, null);
    expect(fourArg).toBe(sixArgNull);
  });

  it('the legacy (inputTrust=null) path contains no RULE #2.8 and no new fields', () => {
    const p = buildCodingSystemPrompt('python', undefined, undefined, true, null, null);
    expect(p).not.toContain('RULE #2.8');
    expect(p).not.toContain('"optimality"');
    expect(p).not.toContain('"edgeScenarios"');
    expect(p).not.toContain('"assistantPrompts"');
    expect(p).not.toContain('"submittable"');
  });

  it('non-singleSolution (3-solution) schema also stays byte-identical for legacy null inputTrust', () => {
    const legacyTriple5 = buildCodingSystemPrompt('python', undefined, undefined, false, null);
    const legacyTriple6 = buildCodingSystemPrompt('python', undefined, undefined, false, null, null);
    expect(legacyTriple6).toBe(legacyTriple5);
    expect(legacyTriple6).not.toContain('RULE #2.8');
    expect(legacyTriple6).not.toContain('"optimality"');
  });
});

describe('/solve wiring — inputTrust threaded through', () => {
  const src = readFileSync(new URL('../src/routes/coding.js', import.meta.url), 'utf8');

  it('computes inputTrust from problem + starterCode, null for MCQ', () => {
    expect(src).toMatch(/const inputTrust = isMcq \? null : inferInputTrust\(problem, starterCode\);/);
  });

  it('logs trust= in the [solve] log line', () => {
    expect(src).toMatch(/\[solve\][^`]*trust=\$\{inputTrust\}/);
  });

  it('passes inputTrust as the 6th argument to buildCodingSystemPrompt in /solve', () => {
    expect(src).toMatch(/buildCodingSystemPrompt\(lang,[^)]*true, ioContract, inputTrust\)/s);
  });
});
