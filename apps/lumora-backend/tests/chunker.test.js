import { describe, it, expect } from 'vitest';
import { chunkTopic, estimateTokens } from '../src/services/chunker.js';

const sampleTopic = {
  id: 'sli-slo-sla',
  title: 'SLI / SLO / SLA',
  description: 'Service Level Indicator, Objective, Agreement.',
  introduction: 'An SLI is a quantitative measure. An SLO is a target. An SLA is a contract with consequences.',
  whenToUse: [
    'Setting reliability targets for a new service',
    'Negotiating with product on launch criteria',
  ],
  keyConcepts: [
    { term: 'SLI', definition: 'A direct measurement of one aspect of service health.' },
    { term: 'SLO', definition: 'A target value for an SLI over a window.' },
  ],
  questions: [
    { question: 'What is an error budget?', answer: 'The remaining acceptable failure for the SLO window.' },
    { question: 'Who owns SLOs?', answer: 'Product + engineering jointly.' },
  ],
};

describe('chunkTopic', () => {
  it('emits one chunk per logical section', () => {
    const chunks = chunkTopic(sampleTopic, { source: 'capra-sre' });
    const sections = chunks.map((c) => c.section);
    expect(sections).toContain('summary');
    expect(sections).toContain('whenToUse');
    expect(sections).toContain('keyConcepts');
    expect(sections.filter((s) => s.startsWith('question:'))).toHaveLength(2);
  });

  it('attaches topic + source metadata to every chunk', () => {
    const chunks = chunkTopic(sampleTopic, { source: 'capra-sre' });
    for (const c of chunks) {
      expect(c.source).toBe('capra-sre');
      expect(c.sourceKind).toBe('capra-topic');
      expect(c.topicId).toBe('sli-slo-sla');
      expect(c.topicTitle).toBe('SLI / SLO / SLA');
      expect(c.content.length).toBeGreaterThan(0);
      expect(c.tokenCount).toBeGreaterThan(0);
    }
  });

  it('produces stable contentHash for unchanged input', () => {
    const a = chunkTopic(sampleTopic, { source: 'capra-sre' });
    const b = chunkTopic(sampleTopic, { source: 'capra-sre' });
    expect(a.map((c) => c.contentHash)).toEqual(b.map((c) => c.contentHash));
  });

  it('handles a topic missing optional sections', () => {
    const t = { id: 't1', title: 'Bare', description: 'desc only' };
    const chunks = chunkTopic(t, { source: 'capra-sre' });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].section).toBe('summary');
  });

  it('splits an overlong introduction into multiple summary chunks', () => {
    const big = 'An SLI is measured.\n\n'.repeat(400);
    const t = { id: 'big', title: 'Big', introduction: big };
    const chunks = chunkTopic(t, { source: 'capra-sre' });
    const summaries = chunks.filter((c) => c.section.startsWith('summary'));
    expect(summaries.length).toBeGreaterThan(1);
    for (const c of summaries) {
      expect(c.tokenCount).toBeLessThanOrEqual(740);
    }
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
  it('approximates ~4 chars per token', () => {
    expect(estimateTokens('a'.repeat(400))).toBeGreaterThan(80);
    expect(estimateTokens('a'.repeat(400))).toBeLessThan(120);
  });
});

describe('rehash', () => {
  it('produces a different hash when content changes', async () => {
    const { chunkTopic, rehash } = await import('../src/services/chunker.js');
    const topic = { id: 't1', title: 'T1', introduction: 'i' };
    const [c] = chunkTopic(topic, { source: 'x' });
    const original = c.contentHash;
    const mutated = rehash({ ...c, content: 'mutated content' });
    expect(mutated.contentHash).not.toBe(original);
  });
  it('produces the same hash for unchanged content', async () => {
    const { chunkTopic, rehash } = await import('../src/services/chunker.js');
    const topic = { id: 't1', title: 'T1', introduction: 'i' };
    const [c] = chunkTopic(topic, { source: 'x' });
    expect(rehash(c).contentHash).toBe(c.contentHash);
  });
});
