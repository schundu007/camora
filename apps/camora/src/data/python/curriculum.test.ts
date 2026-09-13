import { describe, it, expect } from 'vitest';
import { PYTHON_TOPICS } from './index';
import { CHAPTERS, CHAPTER_IDS, type Topic } from './types';

const MD_BOLD   = /\*\*\S[\s\S]*?\S\*\*/;
const MD_FENCE  = /```/;
const MD_HEAD   = /^#{1,6}\s/m;
const EMOJI     = /\p{Extended_Pictographic}/u;

function proseOf(t: Topic): string[] {
  return [
    t.summary, t.intro, t.gotcha, t.tip,
    ...t.edgeCases,
    ...t.walkthrough.map(w => w.explain),
    ...(t.sections    ?? []).flatMap(s => [s.heading, s.body]),
    ...(t.keyTerms    ?? []).flatMap(k => [k.term, k.meaning]),
    ...(t.interviewQs ?? []).flatMap(q => [q.q, q.a]),
    ...(t.cheatSheet  ?? []).flatMap(c => [c.does, c.returns]),
  ];
}

const EXISTING_IDS = [
  'variables', 'operators', 'control-flow', 'loops',
  'functions', 'closures', 'decorators',
  'lists', 'dicts-sets', 'strings', 'comprehensions',
  'oop-basics', 'dataclasses', 'generators',
  'errors', 'file-io', 'context-managers', 'modules',
  'async', 'concurrency', 'type-hints', 'performance',
];

describe('PYTHON_TOPICS', () => {
  it('carries all 22 pre-existing topics across the split', () => {
    const ids = new Set(PYTHON_TOPICS.map(t => t.id));
    for (const id of EXISTING_IDS) expect(ids.has(id), `lost topic ${id}`).toBe(true);
  });

  it('has unique topic ids', () => {
    const ids = PYTHON_TOPICS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills every required field on every topic', () => {
    for (const t of PYTHON_TOPICS) {
      expect(t.id, `${t.id}: id`).toBeTruthy();
      expect(t.title, `${t.id}: title`).toBeTruthy();
      expect(t.summary, `${t.id}: summary`).toBeTruthy();
      expect(t.intro, `${t.id}: intro`).toBeTruthy();
      expect(t.cleanCode, `${t.id}: cleanCode`).toBeTruthy();
      expect(t.gotcha, `${t.id}: gotcha`).toBeTruthy();
      expect(t.tip, `${t.id}: tip`).toBeTruthy();
      expect(t.estimatedMins, `${t.id}: estimatedMins`).toBeGreaterThan(0);
      expect(t.walkthrough.length, `${t.id}: walkthrough`).toBeGreaterThan(0);
      expect(t.examples.length, `${t.id}: examples`).toBeGreaterThan(0);
      expect(t.edgeCases.length, `${t.id}: edgeCases`).toBeGreaterThan(0);
    }
  });

  it('assigns every topic to a declared chapter', () => {
    for (const t of PYTHON_TOPICS) {
      expect(CHAPTER_IDS.has(t.chapter), `${t.id}: chapter ${t.chapter}`).toBe(true);
    }
  });

  it('orders topics by chapter, matching CHAPTERS order', () => {
    const order = CHAPTERS.map(c => c.id);
    const seen = PYTHON_TOPICS.map(t => order.indexOf(t.chapter));
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i], `topic ${PYTHON_TOPICS[i].id} out of chapter order`)
        .toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it('keeps markdown syntax and emoji out of prose fields', () => {
    for (const t of PYTHON_TOPICS) {
      for (const s of proseOf(t)) {
        expect(MD_BOLD.test(s),  `${t.id}: markdown bold in "${s.slice(0, 60)}"`).toBe(false);
        expect(MD_FENCE.test(s), `${t.id}: code fence in "${s.slice(0, 60)}"`).toBe(false);
        expect(MD_HEAD.test(s),  `${t.id}: markdown heading in "${s.slice(0, 60)}"`).toBe(false);
        expect(EMOJI.test(s),    `${t.id}: emoji in "${s.slice(0, 60)}"`).toBe(false);
      }
    }
  });

  it('gives every reference an absolute https url', () => {
    for (const t of PYTHON_TOPICS) {
      for (const r of t.references ?? []) {
        expect(r.label, `${t.id}: reference label`).toBeTruthy();
        expect(r.url, `${t.id}: reference url ${r.url}`).toMatch(/^https:\/\//);
      }
    }
  });
});
