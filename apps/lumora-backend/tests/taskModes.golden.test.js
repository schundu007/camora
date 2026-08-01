/**
 * Golden fixtures for the situation registry.
 *
 * These exist because "it rewrote my code again" kept arriving as a bug report
 * instead of a failing test. Each fixture is a real capture from a live
 * interview session, and asserts the CONTRACT of its situation — not the exact
 * text of the answer.
 *
 * The prompt-shape tests run offline on every `vitest` run. The live model
 * checks only run when RUN_LIVE_PROMPT_TESTS=1 and a key is present, so CI stays
 * hermetic and free.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTask,
  normalizeTask,
  buildSituationBlock,
  TASK_IDS,
  WALKTHROUGH_BUDGET,
} from '../src/services/taskModes.js';

// The capture that started this: interviewer asks "what's wrong with this?".
// Two defects — `<=` is an off-by-one, and the last line is over-indented.
export const DIAGNOSE_FIXTURE = `people = ["Alice", "Bob", "Bob"]
counter = 0
while counter <= len(people):
  print(people[counter])
    counter = counter + 1`;

describe('situation registry', () => {
  it('maps the wire aliases an older client still sends', () => {
    // Client and server deploy independently — yesterday's bundle must not 500.
    expect(normalizeTask('review')).toBe('diagnose');
    expect(normalizeTask('complete')).toBe('fill');
    expect(normalizeTask('solve')).toBe('explore');
    expect(normalizeTask('EXPLAIN')).toBe('explain');
    expect(normalizeTask('nonsense')).toBeNull();
    expect(normalizeTask(undefined)).toBeNull();
  });

  it('lets a locked platform skeleton win over a generic fill/explore', () => {
    expect(resolveTask({ requested: 'fill', isTemplate: true })).toBe('template');
    expect(resolveTask({ requested: 'solve', isTemplate: true })).toBe('template');
    expect(resolveTask({ requested: undefined, isTemplate: true })).toBe('template');
  });

  it('keeps an explicit user choice when the code is not a template', () => {
    for (const id of TASK_IDS.filter(t => t !== 'template')) {
      expect(resolveTask({ requested: id, isTemplate: false })).toBe(id);
    }
  });

  it('still honours diagnose on a template — faults can live in one too', () => {
    expect(resolveTask({ requested: 'review', isTemplate: true })).toBe('diagnose');
  });

  it('defaults to diagnose, never to a rewrite', () => {
    expect(resolveTask({ requested: undefined, isTemplate: false })).toBe('diagnose');
    expect(resolveTask({ requested: 'garbage', isTemplate: false })).toBe('diagnose');
  });
});

describe('composed prompt — exactly one situation, never stacked', () => {
  const blocks = TASK_IDS.map(t => ({ t, text: buildSituationBlock({ task: t, templateShape: 'SHAPE' }) }));

  it('emits one and only one SITUATION header per request', () => {
    for (const { t, text } of blocks) {
      const headers = text.match(/^SITUATION: /gm) || [];
      expect(headers.length, `${t} should declare exactly one situation`).toBe(1);
    }
  });

  it('never ships two contradictory contracts in the same prompt', () => {
    for (const { t, text } of blocks) {
      const forbidsRewrite = /FORBIDDEN TO REWRITE/.test(text);
      const allowsRestructure = /you SHOULD restructure it/.test(text);
      expect(forbidsRewrite && allowsRestructure, `${t} contradicts itself`).toBe(false);
    }
  });

  it('keeps the execution contract OUT of diagnose — this was the live bug', () => {
    // "don't add any new lines" lost to the EXECUTION CONTRACT sitting lower in
    // the old monolith, which restructures print-based code into a function.
    const diagnose = buildSituationBlock({ task: 'diagnose' });
    expect(diagnose).not.toMatch(/EXECUTION CONTRACT/);
    expect(diagnose).not.toMatch(/you SHOULD restructure/);
    expect(diagnose).toMatch(/SAME NUMBER OF LINES/);
    expect(diagnose).toMatch(/convert print\(\) output into a return value/);
  });

  it('gives explain room to actually explain', () => {
    expect(WALKTHROUGH_BUDGET.explain.max).toBeGreaterThan(WALKTHROUGH_BUDGET.diagnose.max);
  });

  it('tells fill to locate the gap and preserve everything else', () => {
    const fill = buildSituationBlock({ task: 'fill' });
    expect(fill).toMatch(/FIND THE GAP FIRST/);
    expect(fill).toMatch(/Keep EVERY existing line VERBATIM/);
  });

  it('threads the template shape into the platform-stub block', () => {
    expect(buildSituationBlock({ task: 'template', templateShape: 'SHAPE' })).toContain('SHAPE');
  });
});
