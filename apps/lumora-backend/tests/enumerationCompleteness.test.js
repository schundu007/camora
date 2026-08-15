/**
 * Enumerations must be complete.
 *
 * Reported live: "explain Big O" came back listing O(1), O(n), O(log n) and
 * O(n^2) — and silently dropped O(n log n), the class every sorting, heap and
 * divide-and-conquer question turns on. The candidate reads that aloud and
 * sounds like they do not know sorting.
 *
 * The cause was a rule conflict, not a token limit: rule 6 caps a technical
 * answer at "3-4 factual bullets" and even cites CAP theorem — itself an
 * enumeration — as an example. A budget that is correct for prose is wrong for
 * a closed set, where a partial list is not brief but incorrect.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/services/claude.js', import.meta.url), 'utf8');

describe('the enumeration rule exists and outranks the line budget', () => {
  it('states that completeness beats the budget', () => {
    expect(src).toMatch(/ENUMERATIONS ARE COMPLETE/);
    expect(src).toMatch(/completeness OUTRANKS the line budget/);
    expect(src).toMatch(/A partial list is not a concise answer, it is a WRONG one/);
  });

  it('names the omission that was actually reported', () => {
    expect(src).toMatch(/Never omit O\(n log n\)/);
  });

  it('lists the full complexity ladder, not a sample of it', () => {
    for (const cls of ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)']) {
      expect(src, `${cls} missing from the canonical ladder`).toContain(cls);
    }
  });

  it('covers the other closed sets that fail the same way', () => {
    for (const set of ['SOLID', 'ACID', 'CAP', 'normal forms', 'isolation levels']) {
      expect(src, `${set} not covered`).toContain(set);
    }
  });

  it('makes rule 6 defer instead of contradicting', () => {
    // Two rules disagreeing about the bullet count is how the model ends up
    // choosing, and it chose wrong.
    expect(src).toMatch(/EXCEPT when the question names a closed set[^)]*rule 7w overrides this count/);
  });

  it('does not turn every technical answer into a lecture', () => {
    // The guard on the guard: this must fire only for a closed, named set.
    // Whitespace-tolerant: the rule sits in a wrapped paragraph, so a literal
    // match breaks on a reflow rather than on a behaviour change.
    expect(src).toMatch(/it applies only when the set is closed and\s+named/);
    expect(src).toMatch(/still governed by 7z/);
  });
});
