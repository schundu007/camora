import { describe, it, expect } from 'vitest';
import { chunkProblem } from '../src/services/problemChunker.js';

describe('chunkProblem — leetcode-style', () => {
  const p = {
    id: 1,
    slug: 'two-sum',
    name: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    description: 'Given an array of integers...',
    examples: [{ input: 'nums=[2,7], target=9', output: '[0,1]' }],
    constraints: ['2 <= nums.length <= 10^4'],
    solutions: {
      python: { code: 'def twoSum(...): pass', timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
      javascript: { code: 'function twoSum(...) {}', timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
    },
  };

  it('emits a summary chunk including title, difficulty, description, and best (python) solution', () => {
    const chunks = chunkProblem(p, { source: 'capra-coding-problems', kind: 'leetcode' });
    expect(chunks.length).toBeGreaterThan(0);
    const summary = chunks.find((c) => c.section === 'summary');
    expect(summary).toBeDefined();
    expect(summary.content).toContain('Two Sum');
    expect(summary.content).toContain('Easy');
    expect(summary.content).toContain('Given an array');
    expect(summary.content).toContain('def twoSum'); // Python solution included
    expect(summary.content).toContain('O(n)');
  });

  it('uses slug as topicId for stable citation links', () => {
    const chunks = chunkProblem(p, { source: 'capra-coding-problems', kind: 'leetcode' });
    expect(chunks[0].topicId).toBe('two-sum');
    expect(chunks[0].topicTitle).toBe('Two Sum');
  });

  it('handles missing solutions gracefully', () => {
    const noSol = { ...p, solutions: {} };
    const chunks = chunkProblem(noSol, { source: 'x', kind: 'leetcode' });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('Two Sum');
  });
});

describe('chunkProblem — lld', () => {
  const p = {
    id: 'lru-cache',
    title: 'LRU Cache',
    description: 'Design a cache with eviction.',
    introduction: 'The LRU Cache is a fundamental data structure problem.',
    keyInsight: 'Store the key in each Node so eviction is O(1).',
    implementation: 'class Node: ...',
    keyQuestions: [
      { question: 'Why store key in Node?', answer: 'For O(1) eviction.' },
      { question: 'Tradeoff doubly linked list vs OrderedDict?', answer: 'OrderedDict hides the structure.' },
    ],
  };

  it('emits one chunk per keyQuestion plus a summary', () => {
    const chunks = chunkProblem(p, { source: 'capra-lld-problems', kind: 'lld' });
    expect(chunks.find((c) => c.section === 'summary')).toBeDefined();
    expect(chunks.find((c) => c.section === 'question:0')).toBeDefined();
    expect(chunks.find((c) => c.section === 'question:1')).toBeDefined();
    const q0 = chunks.find((c) => c.section === 'question:0');
    expect(q0.content).toContain('Why store key');
    expect(q0.content).toContain('O(1) eviction');
  });

  it('emits separate chunks for keyInsight and implementation when present', () => {
    const chunks = chunkProblem(p, { source: 'x', kind: 'lld' });
    expect(chunks.find((c) => c.section === 'keyInsight')).toBeDefined();
    expect(chunks.find((c) => c.section === 'implementation')).toBeDefined();
  });
});

describe('chunkProblem — sd (system design)', () => {
  const p = {
    id: 'url-shortener',
    title: 'URL Shortener',
    subtitle: 'TinyURL / Bit.ly',
    difficulty: 'Easy',
    description: 'Design a service that creates short aliases.',
    productMeta: {
      keyChallenge: 'Generating collision-free short codes at scale.',
    },
    introduction: 'URL shortener is one of the most frequently asked SD questions.',
  };

  it('emits a summary chunk with title and key challenge', () => {
    const chunks = chunkProblem(p, { source: 'capra-sd-problems', kind: 'sd' });
    const summary = chunks.find((c) => c.section === 'summary');
    expect(summary).toBeDefined();
    expect(summary.content).toContain('URL Shortener');
    expect(summary.content).toContain('collision-free');
  });

  it('emits an introduction chunk separately when introduction exceeds the summary', () => {
    const chunks = chunkProblem(p, { source: 'x', kind: 'sd' });
    expect(chunks.find((c) => c.section === 'introduction')).toBeDefined();
  });
});

describe('chunkProblem — invariants', () => {
  it('returns empty array for unknown kind rather than throwing', () => {
    const out = chunkProblem({ id: 'x', title: 'X' }, { source: 's', kind: 'unknown' });
    expect(out).toEqual([]);
  });

  it('every chunk carries source, topicId, topicTitle, section, content, contentHash', () => {
    const p = { id: 'x', title: 'X', description: 'd', solutions: {} };
    const chunks = chunkProblem(p, { source: 'src', kind: 'leetcode' });
    for (const c of chunks) {
      expect(c.source).toBe('src');
      expect(c.topicId).toBeTruthy();
      expect(c.topicTitle).toBeTruthy();
      expect(c.section).toBeTruthy();
      expect(c.content).toBeTruthy();
      expect(c.contentHash).toMatch(/^[a-f0-9]+$/);
      expect(c.sourceKind).toBe('capra-problem');
    }
  });
});
