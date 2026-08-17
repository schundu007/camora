import { describe, it, expect } from 'vitest';
import { parsePartialJson, hasRenderableAnswer } from './partial-json';

// The coding answer is one large JSON document and the card view waited for all of
// it, so a long answer looked like the app had stalled while tokens were arriving
// the whole time. These cover the half-arrived shapes the parser actually meets.

const FULL = {
  language: 'python',
  solutions: [
    { name: 'Two Pointers', approach: 'Track running maxima', code: 'def trap(h):\n    return 0' },
  ],
  pitch: { opener: 'Classic two-pointer scan' },
};

describe('parsePartialJson', () => {
  it('parses a complete document unchanged', () => {
    expect(parsePartialJson(JSON.stringify(FULL))).toEqual(FULL);
  });

  it('skips a leading fence or preamble', () => {
    expect(parsePartialJson('```json\n{"a": 1}')).toEqual({ a: 1 });
    expect(parsePartialJson('Here you go:\n{"a": 1}')).toEqual({ a: 1 });
  });

  it('closes an unfinished object', () => {
    expect(parsePartialJson('{"language": "python", "solutions": [')).toMatchObject({ language: 'python' });
  });

  it('surfaces fields that have arrived while the rest streams', () => {
    const partial = '{"language": "python", "solutions": [{"name": "Two Pointers", "approach": "Track maxima", "code": "def trap';
    const got = parsePartialJson(partial);
    expect(got.language).toBe('python');
    expect(got.solutions[0].name).toBe('Two Pointers');
    expect(got.solutions[0].approach).toBe('Track maxima');
  });

  // A code block rendered mid-token flickers and reads as corrupt output.
  it('drops the value that is still being written', () => {
    const got = parsePartialJson('{"a": "done", "b": "half-writ');
    expect(got.a).toBe('done');
    expect(got.b).toBeUndefined();
  });

  it('drops a trailing key that has no value yet', () => {
    const got = parsePartialJson('{"a": 1, "approach":');
    expect(got).toEqual({ a: 1 });
  });

  it('handles escaped quotes and newlines inside a streaming string', () => {
    const got = parsePartialJson('{"code": "print(\\"hi\\")\\n", "next": "x');
    expect(got.code).toBe('print("hi")\n');
  });

  it('handles nested arrays of objects', () => {
    const got = parsePartialJson('{"solutions": [{"code": "a"}, {"code": "b"}, {"code": "c');
    expect(got.solutions.length).toBeGreaterThanOrEqual(2);
    expect(got.solutions[0].code).toBe('a');
  });

  it('returns null when there is nothing parseable yet', () => {
    expect(parsePartialJson('')).toBeNull();
    expect(parsePartialJson('thinking about it')).toBeNull();
    expect(parsePartialJson(null as any)).toBeNull();
  });

  it('never throws on arbitrary truncations of a real document', () => {
    const s = JSON.stringify(FULL);
    for (let i = 1; i < s.length; i++) {
      expect(() => parsePartialJson(s.slice(0, i))).not.toThrow();
    }
  });
});

describe('hasRenderableAnswer', () => {
  it('waits until there is something a reader can use', () => {
    expect(hasRenderableAnswer({ language: 'python' })).toBe(false);
    expect(hasRenderableAnswer({ solutions: [] })).toBe(false);
    expect(hasRenderableAnswer({ solutions: [{}] })).toBe(false);
  });

  it('renders once a solution has a name, approach or code', () => {
    expect(hasRenderableAnswer({ solutions: [{ name: 'Two Pointers' }] })).toBe(true);
    expect(hasRenderableAnswer({ solutions: [{ approach: 'scan' }] })).toBe(true);
    expect(hasRenderableAnswer({ code: 'x = 1' })).toBe(true);
  });

  it('renders an MCQ once it has options', () => {
    expect(hasRenderableAnswer({ mcq: { options: ['a', 'b'] } })).toBe(true);
    expect(hasRenderableAnswer({ mcq: { options: [] } })).toBe(false);
  });

  it('is false for junk', () => {
    expect(hasRenderableAnswer(null)).toBe(false);
    expect(hasRenderableAnswer('nope')).toBe(false);
  });
});
