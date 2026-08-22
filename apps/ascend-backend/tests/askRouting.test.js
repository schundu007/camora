/**
 * Ask Sona template routing.
 *
 * The bug these pin down: "Explain each line of this code and fix any bugs"
 * (with the code pasted, or on screen in a screenshot) was routed to the
 * spoken-interview prose template, so Sona answered with generic notes about
 * the topic instead of a review of the code in front of it.
 */
import { describe, it, expect } from 'vitest';
import { looksLikeCodeTask } from '../src/routes/ask.js';

const withImage = { hasImages: true };

describe('looksLikeCodeTask', () => {
  it('routes a pasted snippet to the code template', () => {
    expect(looksLikeCodeTask('class ParkingLot:\n    def __init__(self):\n        pass')).toBe(true);
    expect(looksLikeCodeTask('```py\nprint(1)\n```')).toBe(true);
  });

  it('routes the reported question to the code template', () => {
    // The exact prompt that regressed: a conceptual opener ("Explain") over a
    // concrete reference ("this code") plus a plural noun ("bugs").
    const q = 'Explain each line of this code and fix any bugs';
    expect(looksLikeCodeTask(q, withImage)).toBe(true);
    expect(looksLikeCodeTask(`${q}\n\nclass ParkingLot:\n    pass`)).toBe(true);
  });

  it('matches plural code nouns', () => {
    // `bug\b` never matched "bugs" — every "fix the bugs" phrasing fell through.
    expect(looksLikeCodeTask('fix any bugs', withImage)).toBe(true);
    expect(looksLikeCodeTask('debug these errors in my methods')).toBe(true);
  });

  it('treats a screenshot as the question', () => {
    expect(looksLikeCodeTask('', withImage)).toBe(true);
    expect(looksLikeCodeTask('what is this error?', withImage)).toBe(true);
    expect(looksLikeCodeTask('why does the output look like that?', withImage)).toBe(true);
  });

  it('keeps genuine discussion questions in prose', () => {
    expect(looksLikeCodeTask('how would you implement a rate limiter')).toBe(false);
    expect(looksLikeCodeTask('explain how a B-tree works')).toBe(false);
    expect(looksLikeCodeTask('what are the tradeoffs of sharding')).toBe(false);
    expect(looksLikeCodeTask('tell me about yourself')).toBe(false);
  });

  it('still routes bare imperatives to the code template', () => {
    expect(looksLikeCodeTask('implement an LRU cache')).toBe(true);
    expect(looksLikeCodeTask('write a function that reverses a linked list')).toBe(true);
  });
});
