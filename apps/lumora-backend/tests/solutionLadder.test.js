/**
 * The brute→optimal ladder, and the near-duplicate guard that protects it.
 *
 * The failure this exists to stop is specific and expensive: three tabs labelled
 * "Brute Force / Hash Map / Optimal" that all hold the same algorithm. The
 * candidate sees three tabs, believes they have a baseline to talk through, and
 * discovers in front of the interviewer that they do not. One honest approach
 * beats three where two are restatements.
 */
import { describe, it, expect } from 'vitest';
import { buildCodingSystemPrompt, dedupeSolutions, solutionSkeleton } from '../src/routes/coding.js';

const sol = (name, patternTag, code) => ({ name, patternTag, code });

describe('dedupeSolutions', () => {
  it('keeps genuinely distinct strategies', () => {
    const kept = dedupeSolutions([
      sol('Brute Force', 'Brute Force', 'def f(a,t):\n for i in range(len(a)):\n  for j in range(i+1,len(a)):\n   if a[i]+a[j]==t: return [i,j]'),
      sol('Hash Map', 'Hash Map', 'def f(a,t):\n s={}\n for i,x in enumerate(a):\n  if t-x in s: return [s[t-x],i]\n  s[x]=i'),
      sol('Two Pointers', 'Two Pointers', 'def f(a,t):\n a=sorted(a)\n i,j=0,len(a)-1\n while i<j:\n  s=a[i]+a[j]\n  if s==t: return [i,j]\n  if s<t: i+=1\n  else: j-=1'),
    ]);
    expect(kept).toHaveLength(3);
  });

  it('drops a second solution that reuses the same patternTag', () => {
    // patternTag is a closed enum in the prompt, which makes "same strategy" a
    // decidable test rather than a judgement call.
    const kept = dedupeSolutions([
      sol('Hash Map', 'Hash Map', 'def f(a):\n s={}\n for x in a: s[x]=1\n return len(s)'),
      sol('Dictionary', 'Hash Map', 'def f(a):\n d={}\n for y in a: d[y]=True\n return len(d)'),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].name).toBe('Hash Map');
  });

  it('drops a restatement even when the tags were faked to look different', () => {
    // Renaming variables and relabelling the tag is the model's usual way of
    // satisfying "give me three" without having three ideas.
    const kept = dedupeSolutions([
      sol('Brute Force', 'Brute Force', 'def f(nums):\n total = 0\n for n in nums:\n  total = total + n\n return total'),
      sol('Optimized', 'Math', 'def g(items):\n acc = 0\n for it in items:\n  acc = acc + it\n return acc'),
    ]);
    expect(kept).toHaveLength(1);
  });

  it('treats a comprehension rewrite of the same loop as the same idea', () => {
    const a = solutionSkeleton('def f(a):\n out = []\n for x in a:\n  out.append(x * 2)\n return out');
    const b = solutionSkeleton('def f(b):\n res = []\n for y in b:\n  res.append(y * 2)\n return res');
    expect(a).toBe(b);
  });

  it('does not collapse a nested scan into a single pass', () => {
    const nested = solutionSkeleton('for i in a:\n for j in a:\n  pass');
    const single = solutionSkeleton('for i in a:\n pass');
    expect(nested).not.toBe(single);
  });

  it('never returns an empty array', () => {
    // Downstream promotes solutions[0] to the top-level `code` field; returning
    // nothing would render a blank solution card.
    const kept = dedupeSolutions([sol('A', 'Hash Map', 'x=1'), sol('B', 'Hash Map', 'x=1')]);
    expect(kept.length).toBeGreaterThan(0);
  });

  it('passes through inputs too short to have duplicates', () => {
    expect(dedupeSolutions([])).toEqual([]);
    const one = [sol('A', 'Greedy', 'x=1')];
    expect(dedupeSolutions(one)).toBe(one);
    expect(dedupeSolutions(undefined)).toBeUndefined();
  });

  it('survives malformed entries without throwing', () => {
    const kept = dedupeSolutions([sol('A', 'Greedy', 'x=1'), null, { name: 'no code' }, 'nonsense']);
    expect(kept[0].name).toBe('A');
  });
});

describe('the ladder is actually requested', () => {
  const plain = buildCodingSystemPrompt('python', undefined, undefined, false, null, null);

  it('asks for three approaches when nothing forces a single one', () => {
    // The regression: forceSingle was hardcoded true at the call site, so this
    // branch of the prompt was unreachable and the UI's solution tabs were dead.
    expect(plain).toMatch(/EXACTLY 3 SOLUTIONS REQUIRED/);
    expect(plain).toMatch(/Solution 1 = Brute Force/);
  });

  it('demands the approaches differ in strategy, not in spelling', () => {
    expect(plain).toMatch(/GENUINELY DISTINCT/);
    expect(plain).toMatch(/patternTags must therefore all be different/);
    expect(plain).toMatch(/Do not dress up the optimal solution and call it brute force/);
  });

  it('asks for the transition sentence the interviewer listens for', () => {
    expect(plain).toMatch(/naming what the PREVIOUS solution wasted/);
  });

  it('still collapses to one solution for a locked platform template', () => {
    const withStarter = buildCodingSystemPrompt('python', undefined, 'def solve(n):\n    pass', false, null, null);
    expect(withStarter).toMatch(/EXACTLY 1 SOLUTION REQUIRED/);
  });

  it('still collapses to one solution for bash', () => {
    expect(buildCodingSystemPrompt('bash', undefined, undefined, false, null, null))
      .toMatch(/EXACTLY 1 SOLUTION REQUIRED/);
  });

  it('honours an explicit single-solution opt-out', () => {
    expect(buildCodingSystemPrompt('python', undefined, undefined, true, null, null))
      .toMatch(/EXACTLY 1 SOLUTION REQUIRED/);
  });
});

describe('follow-ups are demanded, and demanded to be specific', () => {
  const plain = buildCodingSystemPrompt('python', undefined, undefined, false, null, null);

  it('names all five families', () => {
    for (const family of ['scale', 'requirement', 'resource', 'concurrency', 'production']) {
      expect(plain, `${family} missing`).toMatch(new RegExp(`\\b${family}\\b`));
    }
  });

  it('requires them to be derived from the emitted code', () => {
    expect(plain).toMatch(/derived from the code you just wrote/);
    expect(plain).toMatch(/generic filler/);
  });

  it('requires the new cost, which is the part that gets dropped', () => {
    expect(plain).toMatch(/must reach the NEW COST/);
    expect(plain).toMatch(/most common senior-level miss/);
  });
});
