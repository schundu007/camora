import { describe, it, expect } from 'vitest';
import { parseDeepDive, parseIssues, notAlreadyIn } from './analysis-parse';

describe('parseDeepDive', () => {
  // The shape the deepdive prompt asks for.
  const CANON = `Q: How would you handle a distributed counter?
I'd shard by client and aggregate on read, so no single node owns the window.

Q: What if timestamps arrive out of order?
I'd switch the deque for a bucketed array indexed by second, which tolerates any order.`;

  it('pairs each question with its spoken answer', () => {
    expect(parseDeepDive(CANON)).toEqual([
      ['How would you handle a distributed counter?', "I'd shard by client and aggregate on read, so no single node owns the window."],
      ['What if timestamps arrive out of order?', "I'd switch the deque for a bucketed array indexed by second, which tolerates any order."],
    ]);
  });

  // The model drifts on markers; the card should not care.
  it('tolerates numbering, bold markers and an A: prefix', () => {
    const drifted = `1. **Q:** Why a deque?
**A:** Because eviction is from the front.`;
    expect(parseDeepDive(drifted)).toEqual([['Why a deque?', 'Because eviction is from the front.']]);
  });

  it('joins a multi-line answer and ignores blank lines', () => {
    const multi = 'Q: Why?\nFirst part.\n\nSecond part.';
    expect(parseDeepDive(multi)).toEqual([['Why?', 'First part. Second part.']]);
  });

  it('drops a question with no answer, and preamble before the first Q', () => {
    expect(parseDeepDive('Here are the follow-ups:\nQ: Dangling?')).toEqual([]);
  });

  it('returns nothing for empty or failed generations', () => {
    expect(parseDeepDive('')).toEqual([]);
    expect(parseDeepDive('Error: Request failed')).toEqual([]);
  });
});

describe('parseIssues', () => {
  const CANON = `CRITICAL — getHits() — returns stale counts when no hit arrives → evict on read too
HIGH — hit() — deque grows unbounded between queries → cap it at the window`;

  it('keeps one bullet per finding, severity included', () => {
    expect(parseIssues(CANON)).toEqual([
      'CRITICAL — getHits() — returns stale counts when no hit arrives → evict on read too',
      'HIGH — hit() — deque grows unbounded between queries → cap it at the window',
    ]);
  });

  it('skips fenced code, headers and bare list markers', () => {
    const noisy = `Issues:\n- CRITICAL — f() — breaks on empty input → guard it\n\`\`\`python\nx = 1\n\`\`\`\nnone`;
    expect(parseIssues(noisy)).toEqual(['CRITICAL — f() — breaks on empty input → guard it']);
  });

  // "an empty-ish list is a fine answer if the code is sound" — the prompt's
  // own words, so prose without a severity marker still has to survive.
  it('keeps an unmarked line when it reads as a finding', () => {
    const prose = 'The code is sound; the only risk is unbounded memory on a long-lived counter.';
    expect(parseIssues(prose)).toEqual([prose]);
  });

  it('returns nothing for empty or failed generations', () => {
    expect(parseIssues('')).toEqual([]);
    expect(parseIssues('Error: Request failed')).toEqual([]);
  });
});

describe('notAlreadyIn', () => {
  it('matches case- and whitespace-insensitively', () => {
    const fresh = notAlreadyIn(['Evict on read', 'Cap the deque']);
    expect(fresh('evict  on read')).toBe(false);
    expect(fresh('Shard by client')).toBe(true);
  });
});

// stripInlineMarkdown treats __x__ as bold, which renamed __init__ to init in a
// bullet whose whole job is naming the method at fault.
describe('code identifiers survive markdown stripping', () => {
  it('keeps Python dunder names intact', () => {
    expect(parseIssues('MEDIUM — __init__ — no validation of monotonic timestamps → assert it'))
      .toEqual(['MEDIUM — __init__ — no validation of monotonic timestamps → assert it']);
    expect(parseDeepDive('Q: Why __slots__?\nIt cuts per-instance memory.'))
      .toEqual([['Why __slots__?', 'It cuts per-instance memory.']]);
  });

  it('still strips real markdown emphasis and backticks', () => {
    expect(parseDeepDive('**Q:** Why a `deque`?\n*Because* eviction is O(1).'))
      .toEqual([['Why a deque?', 'Because eviction is O(1).']]);
  });
});
