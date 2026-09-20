import { describe, it, expect } from 'vitest';
import { toTurns, lastTurns, type QaMsg } from './qaTurns';

const u = (content: string): QaMsg => ({ role: 'user', content });
const a = (content: string): QaMsg => ({ role: 'assistant', content });

describe('toTurns', () => {
  it('pairs each question with the answer that follows it', () => {
    expect(toTurns([u('q1'), a('a1'), u('q2'), a('a2')])).toEqual([
      { key: 0, question: u('q1'), answer: a('a1') },
      { key: 2, question: u('q2'), answer: a('a2') },
    ]);
  });

  it('leaves the turn being answered open, so the stream can render in it', () => {
    const turns = toTurns([u('q1'), a('a1'), u('q2')]);
    expect(turns[turns.length - 1]).toEqual({ key: 2, question: u('q2') });
  });

  it('gives a second answer in a row its own turn instead of overwriting', () => {
    expect(toTurns([u('q1'), a('a1'), a('a2')])).toEqual([
      { key: 0, question: u('q1'), answer: a('a1') },
      { key: 2, answer: a('a2') },
    ]);
  });

  it('keeps keys unique and stable as messages append', () => {
    const grown = toTurns([u('q1'), a('a1'), u('q2')]);
    expect(grown.map(t => t.key)).toEqual([0, 2]);
    expect(toTurns([])).toEqual([]);
  });
});

describe('lastTurns', () => {
  const u = (c: string) => ({ role: 'user' as const, content: c });
  const a = (c: string) => ({ role: 'assistant' as const, content: c });

  it('keeps the last two turns', () => {
    const msgs = [u('q1'), a('a1'), u('q2'), a('a2'), u('q3'), a('a3')];
    expect(lastTurns(msgs).map((m) => m.content)).toEqual(['q2', 'a2', 'q3', 'a3']);
  });

  it('keeps a turn that is still being answered', () => {
    const msgs = [u('q1'), a('a1'), u('q2'), a('a2'), u('q3')];
    expect(lastTurns(msgs).map((m) => m.content)).toEqual(['q2', 'a2', 'q3']);
  });

  it('returns everything when there are fewer than two turns', () => {
    expect(lastTurns([u('q1'), a('a1')]).map((m) => m.content)).toEqual(['q1', 'a1']);
    expect(lastTurns([])).toEqual([]);
  });

  it('does not split a turn across the boundary', () => {
    // The answer must never outlive the question it answers.
    const msgs = [u('q1'), a('a1'), u('q2'), a('a2'), u('q3'), a('a3')];
    const kept = lastTurns(msgs);
    expect(kept[0].role).toBe('user');
  });
});
