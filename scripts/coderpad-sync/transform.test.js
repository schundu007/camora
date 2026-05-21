import { describe, it, expect } from 'vitest';
import {
  slugify,
  mapLanguage,
  extractDifficulty,
  stripHtml,
  deriveCategory,
  transformCodeQuestion,
  transformMcqQuestion,
} from './transform.js';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Two Sum')).toBe('two-sum');
  });
  it('strips leading/trailing dashes', () => {
    expect(slugify(' Hello World ')).toBe('hello-world');
  });
  it('collapses multiple non-alphanumeric chars', () => {
    expect(slugify('Rate Limiter (10M req/day)')).toBe('rate-limiter-10m-req-day');
  });
});

describe('mapLanguage', () => {
  it('maps Python 3 to python', () => expect(mapLanguage('Python 3')).toBe('python'));
  it('maps JavaScript to javascript', () => expect(mapLanguage('JavaScript')).toBe('javascript'));
  it('maps C++ to cpp', () => expect(mapLanguage('C++')).toBe('cpp'));
  it('maps unknown to lowercase no-spaces', () => expect(mapLanguage('COBOL')).toBe('cobol'));
  it('handles null', () => expect(mapLanguage(null)).toBe('general'));
  it('handles undefined', () => expect(mapLanguage(undefined)).toBe('general'));
});

describe('extractDifficulty', () => {
  it('maps 0 or 1 to easy', () => {
    expect(extractDifficulty(0)).toBe('easy');
    expect(extractDifficulty(1)).toBe('easy');
  });
  it('maps 2 to medium', () => expect(extractDifficulty(2)).toBe('medium'));
  it('maps 3+ to hard', () => {
    expect(extractDifficulty(3)).toBe('hard');
    expect(extractDifficulty(5)).toBe('hard');
  });
  it('handles null/undefined as easy', () => {
    expect(extractDifficulty(null)).toBe('easy');
    expect(extractDifficulty(undefined)).toBe('easy');
  });
});

describe('stripHtml', () => {
  it('strips tags', () => expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world'));
  it('collapses whitespace', () => expect(stripHtml('<p>  lots   of   space  </p>')).toBe('lots of space'));
  it('handles empty string', () => expect(stripHtml('')).toBe(''));
  it('handles null', () => expect(stripHtml(null)).toBe(''));
});

describe('deriveCategory', () => {
  it('maps python language to python category', () => expect(deriveCategory('python', [])).toBe('python'));
  it('maps cpp to dsa', () => expect(deriveCategory('cpp', [])).toBe('dsa'));
  it('maps typescript to javascript', () => expect(deriveCategory('typescript', [])).toBe('javascript'));
  it('falls back to general for unknown', () => expect(deriveCategory('cobol', [])).toBe('general'));
});

describe('transformCodeQuestion', () => {
  const raw = {
    id: 12345,
    title: 'Two Sum',
    language: 'Python 3',
    puzzle_count: 1,
    description: '<p>Find two numbers</p>',
    tags: ['arrays'],
  };

  it('sets id to coderpad-{id}', () => expect(transformCodeQuestion(raw).id).toBe('coderpad-12345'));
  it('sets coderpadId as string', () => expect(transformCodeQuestion(raw).coderpadId).toBe('12345'));
  it('sets source to coderpad', () => expect(transformCodeQuestion(raw).source).toBe('coderpad'));
  it('maps language', () => expect(transformCodeQuestion(raw).language).toBe('python'));
  it('strips html from description', () => expect(transformCodeQuestion(raw).description).toBe('Find two numbers'));
  it('derives difficulty from puzzle_count', () => expect(transformCodeQuestion(raw).difficulty).toBe('easy'));
  it('generates slug', () => expect(transformCodeQuestion(raw).slug).toBe('two-sum'));
  it('includes empty solutions/boilerplate/testCases', () => {
    const q = transformCodeQuestion(raw);
    expect(q.solutions).toEqual({});
    expect(q.boilerplate).toEqual({});
    expect(q.testCases).toEqual([]);
  });
  it('falls back to prompt field if description absent', () => {
    const r = { ...raw, description: null, prompt: '<p>Use prompt</p>' };
    expect(transformCodeQuestion(r).description).toBe('Use prompt');
  });
  it('caps meta at 160 chars', () => {
    const r = { ...raw, description: 'x'.repeat(200) };
    expect(transformCodeQuestion(r).meta.length).toBe(160);
  });
});

describe('transformMcqQuestion', () => {
  const raw = {
    id: 99,
    title: 'What does Array.flat() do?',
    language: 'JavaScript',
    puzzle_count: 1,
    description: 'Choose the correct answer.',
    choices: [
      { text: 'Flattens nested arrays', correct: true },
      { text: 'Sorts the array', correct: false },
      { text: 'Reverses the array', correct: false },
      { text: 'Maps over elements', correct: false },
    ],
  };

  it('sets id to mcq-coderpad-{id}', () => expect(transformMcqQuestion(raw).id).toBe('mcq-coderpad-99'));
  it('produces 4 choices with letter ids', () => {
    const q = transformMcqQuestion(raw);
    expect(q.choices).toHaveLength(4);
    expect(q.choices[0].id).toBe('a');
    expect(q.choices[3].id).toBe('d');
  });
  it('identifies correct answer by index', () => expect(transformMcqQuestion(raw).correctAnswer).toBe('a'));
  it('sets domain from language', () => expect(transformMcqQuestion(raw).domain).toBe('javascript'));
  it('does not leak correct flag into output choices', () => {
    const q = transformMcqQuestion(raw);
    expect(q.choices[0]).not.toHaveProperty('correct');
  });
});
