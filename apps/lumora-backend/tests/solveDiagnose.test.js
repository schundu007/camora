/**
 * /solve must never rewrite code it was asked to review.
 *
 * The live failure this pins: a screenshot of five buggy lines went into the
 * Coding tab and came back as
 *
 *     def collect_people(people):
 *         result = []
 *         ...
 *         return result
 *
 * — loose top-level statements wrapped in a function, a parameter invented,
 * print() converted to a return, a new accumulator introduced. Every one of
 * those is explicitly forbidden by DIAGNOSE, which means DIAGNOSE never ran:
 * the payload reached /solve, and /solve's EXECUTION CONTRACT ("write ONE
 * function whose PARAMETERS are the parsed inputs and that RETURNS the answer")
 * did exactly what it says.
 *
 * The client-side hand-off that was supposed to prevent this can be missed by
 * any path that forgets to thread the verdict, so the guard has to live here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { looksLikeCodeToReview, buildDiagnoseSolvePrompt } from '../src/routes/coding.js';

// The exact capture from the bug report.
const BUGGY_SNIPPET = `people = ["Alice", "Bob", "Bob"]
counter = 0
while counter <= len(people):
  print(people[counter])
    counter = counter + 1`;

describe('looksLikeCodeToReview', () => {
  it('recognises the capture that was rewritten', () => {
    expect(looksLikeCodeToReview(BUGGY_SNIPPET)).toBe(true);
  });

  it('recognises code in other shapes', () => {
    expect(looksLikeCodeToReview('def f(a):\n  for x in a:\n    print(x)\n  return None')).toBe(true);
    expect(looksLikeCodeToReview('function f(a) {\n  let s = 0;\n  for (const x of a) { s += x; }\n  return s;\n}')).toBe(true);
  });

  it('leaves real problem statements alone', () => {
    // A false positive here is worse than the bug it fixes: a genuine problem
    // statement would come back "reviewed" instead of solved.
    expect(looksLikeCodeToReview('Given an array of integers, return the indices of the two numbers that add up to target.')).toBe(false);
    expect(looksLikeCodeToReview('Write a function that reverses a linked list in place.')).toBe(false);
    expect(looksLikeCodeToReview('Design a URL shortener that handles 100M writes per day.')).toBe(false);
  });

  it('defers to an explicit statement format even when code is shown', () => {
    // HackerRank problems quote sample code inside the statement; the Input
    // Format marker proves it is a statement regardless of the ratio.
    const hr = `Input Format\nThe first line contains n.\n\nfor i in range(n):\n  print(i)\n\nSample Input\n3`;
    expect(looksLikeCodeToReview(hr)).toBe(false);
  });

  it('ignores junk and oversized payloads', () => {
    expect(looksLikeCodeToReview('')).toBe(false);
    expect(looksLikeCodeToReview('hi')).toBe(false);
    expect(looksLikeCodeToReview(null)).toBe(false);
    expect(looksLikeCodeToReview('x = 1\n'.repeat(3000))).toBe(false);
  });
});

describe('the diagnose prompt forbids exactly what went wrong', () => {
  const p = buildDiagnoseSolvePrompt('python', undefined);

  it('carries the same situation block CoFix uses', () => {
    // One definition of "review this", so the two routes cannot drift.
    expect(p).toMatch(/SITUATION: DIAGNOSE/);
    expect(p).toMatch(/FORBIDDEN TO REWRITE/);
    expect(p).toMatch(/SAME NUMBER OF LINES/);
  });

  it('names each thing the bad output actually did', () => {
    // Whitespace-tolerant: these sit in a wrapped paragraph, so a literal match
    // would break the next time the line width changes rather than when the
    // rule does.
    const ws = (s) => new RegExp(s.replace(/ /g, '\\s+'));
    expect(p).toMatch(ws('a function the input did not have'));
    expect(p).toMatch(ws('a parameter the input did not have'));
    expect(p).toMatch(ws('a return where the input printed'));
    expect(p).toMatch(ws('a variable the input never declared'));
  });

  it('revokes the execution contract that caused the rewrite', () => {
    expect(p).toMatch(/There is NO execution contract here/);
    expect(p).toMatch(/If it printed, it prints/);
    // The solve prompt's contract must not appear anywhere in this one.
    expect(p).not.toMatch(/whose PARAMETERS are the parsed inputs/);
  });

  it('asks for one explanation per defect, not per line', () => {
    expect(p).toMatch(/One "explanations" entry per DEFECT — not per line/);
    expect(p).toMatch(/boundary, null_type, state/);
  });

  it('does not invent faults in correct code', () => {
    expect(p).toMatch(/return explanations: \[\] and "code" identical/);
  });
});

describe('/solve routes reviews away from the solve prompt', () => {
  const src = readFileSync(new URL('../src/routes/coding.js', import.meta.url), 'utf8');

  it('decides for itself, not only on the client verdict', () => {
    // The client-side hand-off is an optimisation; this is the guarantee.
    expect(src).toMatch(/requestedTask === 'diagnose' \|\| \(!requestedTask && looksLikeCodeToReview\(problem\)\)/);
  });

  it('never diagnoses an MCQ or a real starter template', () => {
    // A template with an empty body is a FILL — its own rules apply, and
    // repairing it in place would leave the stub unfilled.
    expect(src).toMatch(/const isDiagnose = !isMcq && !starterCode &&/);
  });

  it('keeps review answers out of the solve cache slot', () => {
    expect(src).toMatch(/isDiagnose \? 'solve_diagnose' : 'solve'/);
  });

  it('returns a single corrected program, never a ladder', () => {
    expect(src).toMatch(/forceSingle \|\| isDiagnose \|\|/);
  });
});
