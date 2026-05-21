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
  it('maps Python3 to python', () => expect(mapLanguage('Python3', null)).toBe('python'));
  it('maps C++ to cpp', () => expect(mapLanguage('C++', null)).toBe('cpp'));
  it('maps JavaScript to javascript', () => expect(mapLanguage('JavaScript', null)).toBe('javascript'));
  it('maps Angular to javascript', () => expect(mapLanguage('Angular', null)).toBe('javascript'));
  it('maps Cross to general', () => expect(mapLanguage('Cross', null)).toBe('general'));
  it('falls back to domain.name when programmingLanguageId absent', () => {
    expect(mapLanguage(null, { name: 'Python 3' })).toBe('general'); // 'Python 3' (with space) not in LANG_ID_MAP
    expect(mapLanguage(undefined, { name: 'Go' })).toBe('go'); // 'Go' IS in LANG_ID_MAP → 'go'
  });
  it('handles null/undefined gracefully', () => {
    expect(mapLanguage(null, null)).toBe('general');
    expect(mapLanguage(undefined, undefined)).toBe('general');
  });
});

describe('extractDifficulty (from points)', () => {
  it('maps 20 pts to easy', () => expect(extractDifficulty(20)).toBe('easy'));
  it('maps 40 pts to easy', () => expect(extractDifficulty(40)).toBe('easy'));
  it('maps 60 pts to medium', () => expect(extractDifficulty(60)).toBe('medium'));
  it('maps 150 pts to medium', () => expect(extractDifficulty(150)).toBe('medium'));
  it('maps 200 pts to hard', () => expect(extractDifficulty(200)).toBe('hard'));
  it('maps 300 pts to hard', () => expect(extractDifficulty(300)).toBe('hard'));
  it('handles null/undefined as easy', () => {
    expect(extractDifficulty(null)).toBe('easy');
    expect(extractDifficulty(undefined)).toBe('easy');
  });
});

describe('stripHtml', () => {
  it('strips tags', () => expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world'));
  it('handles empty string', () => expect(stripHtml('')).toBe(''));
  it('handles null', () => expect(stripHtml(null)).toBe(''));
});

describe('deriveCategory', () => {
  it('maps python to python', () => expect(deriveCategory('python')).toBe('python'));
  it('maps cpp to dsa', () => expect(deriveCategory('cpp')).toBe('dsa'));
  it('maps typescript to javascript', () => expect(deriveCategory('typescript')).toBe('javascript'));
  it('maps general to general', () => expect(deriveCategory('general')).toBe('general'));
  it('maps unknown to general', () => expect(deriveCategory('cobol')).toBe('general'));
});

describe('transformCodeQuestion', () => {
  const raw = {
    id: 1106742,
    title: 'Find the temperature',
    type: 'CODE',
    programmingLanguageId: 'Python3',
    domain: { id: 39, name: 'Python 3', category: 'LANGUAGE', keywords: [] },
    points: 300,
    difficultyMultiplier: 2,
    duration: 1200,
  };

  it('sets id to coderpad-{id}', () => expect(transformCodeQuestion(raw).id).toBe('coderpad-1106742'));
  it('sets coderpadId as string', () => expect(transformCodeQuestion(raw).coderpadId).toBe('1106742'));
  it('sets source to coderpad', () => expect(transformCodeQuestion(raw).source).toBe('coderpad'));
  it('maps language from programmingLanguageId', () => expect(transformCodeQuestion(raw).language).toBe('python'));
  it('extracts difficulty from points', () => expect(transformCodeQuestion(raw).difficulty).toBe('hard'));
  it('generates slug', () => expect(transformCodeQuestion(raw).slug).toBe('find-the-temperature'));
  it('leaves description empty (not in list response)', () => expect(transformCodeQuestion(raw).description).toBe(''));
  it('includes empty solutions/boilerplate/testCases', () => {
    const q = transformCodeQuestion(raw);
    expect(q.solutions).toEqual({});
    expect(q.boilerplate).toEqual({});
    expect(q.testCases).toEqual([]);
  });
  it('uses Cross language as general', () => {
    const crossRaw = { ...raw, programmingLanguageId: 'Cross' };
    expect(transformCodeQuestion(crossRaw).language).toBe('general');
  });
});

describe('transformMcqQuestion', () => {
  const raw = {
    id: 615946,
    title: 'Default environment value',
    type: 'MCQ',
    domain: { id: 948, name: '.NET platform', category: 'BACKEND', keywords: ['c#', 'entity framework'] },
    points: 20,
    difficultyMultiplier: 1,
    duration: 30,
  };

  it('sets id to mcq-coderpad-{id}', () => expect(transformMcqQuestion(raw).id).toBe('mcq-coderpad-615946'));
  it('sets domain from domain.name', () => expect(transformMcqQuestion(raw).domain).toBe('.NET platform'));
  it('sets difficulty from points', () => expect(transformMcqQuestion(raw).difficulty).toBe('easy'));
  it('leaves choices empty (not in list response)', () => expect(transformMcqQuestion(raw).choices).toEqual([]));
  it('leaves question empty (not in list response)', () => expect(transformMcqQuestion(raw).question).toBe(''));
  it('sets durationSeconds', () => expect(transformMcqQuestion(raw).durationSeconds).toBe(30));
  it('includes tags from domain keywords', () => expect(transformMcqQuestion(raw).tags).toContain('c#'));
});
