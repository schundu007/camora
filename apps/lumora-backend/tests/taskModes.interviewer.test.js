/**
 * Contract tests for the INTERVIEWER-QUESTION situations.
 *
 * The five original situations answer "what is on the candidate's screen?".
 * These answer "what did the interviewer just ask?" — and the failure mode is
 * different. A screen situation fails by editing the wrong lines; an utterance
 * situation fails by giving a fluent answer that is missing the one part the
 * question was actually testing for (the bottleneck, the reverse trade-off, the
 * accepted cost). Each test below pins one of those load-bearing parts, because
 * every one of them is something a model will happily drop under token pressure.
 *
 * Like taskModes.golden.test.js these assert the CONTRACT of the prompt, never
 * the wording of an answer, so they run offline on every `vitest`.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTask,
  normalizeTask,
  buildSituationBlock,
  isAnswerOnly,
  classifyUtterance,
  TASK_IDS,
  SCREEN_TASKS,
  UTTERANCE_TASKS,
  ANSWER_ONLY_TASKS,
  WALKTHROUGH_BUDGET,
  UTTERANCE_SPEC,
} from '../src/services/taskModes.js';

const blockFor = (task) => buildSituationBlock({ task, templateShape: 'SHAPE' });

describe('registry shape', () => {
  it('splits every situation into exactly one of screen or utterance', () => {
    expect([...SCREEN_TASKS, ...UTTERANCE_TASKS].sort()).toEqual([...TASK_IDS].sort());
    for (const t of SCREEN_TASKS) expect(UTTERANCE_TASKS).not.toContain(t);
  });

  it('gives every situation a walkthrough budget', () => {
    // A missing budget silently falls back to undefined downstream and the
    // model gets no step count at all.
    for (const t of TASK_IDS) {
      expect(WALKTHROUGH_BUDGET[t], `${t} has no budget`).toBeDefined();
      expect(WALKTHROUGH_BUDGET[t].min).toBeLessThanOrEqual(WALKTHROUGH_BUDGET[t].max);
    }
  });

  it('offers the utterance classifier every utterance situation and no screen one', () => {
    for (const t of UTTERANCE_TASKS) {
      expect(UTTERANCE_SPEC, `${t} missing from the classifier menu`).toContain(`'${t}'`);
    }
    // 'diagnose'/'template' are screenshot verdicts — offering them to the
    // utterance classifier is how the two classifiers start disagreeing.
    expect(UTTERANCE_SPEC).not.toContain("'template'");
  });

  it('maps the words interviewers actually use onto situations', () => {
    expect(normalizeTask('bottleneck')).toBe('optimize');
    expect(normalizeTask('why')).toBe('justify');
    expect(normalizeTask('scale')).toBe('extend');
    expect(normalizeTask('concurrency')).toBe('extend');
    expect(normalizeTask('worstcase')).toBe('edge');
    expect(normalizeTask('dry')).toBe('refactor');
    expect(normalizeTask('stuck')).toBe('hint');
  });
});

describe('precedence — a direct question outranks the screen', () => {
  it('answers the question even when a locked template is on screen', () => {
    // The regression this prevents: interviewer asks "why a hash map?" while a
    // HackerRank stub is open, and the candidate gets a filled-in template.
    expect(resolveTask({ utterance: 'justify', isTemplate: true })).toBe('justify');
    expect(resolveTask({ utterance: 'optimize', isTemplate: true, requested: 'complete' })).toBe('optimize');
    expect(resolveTask({ utterance: 'edge', isTemplate: true, requested: 'review' })).toBe('edge');
  });

  it('leaves the old screen-only behaviour exactly as it was', () => {
    expect(resolveTask({ requested: 'fill', isTemplate: true })).toBe('template');
    expect(resolveTask({ requested: 'review', isTemplate: true })).toBe('diagnose');
    expect(resolveTask({ requested: undefined, isTemplate: false })).toBe('diagnose');
  });

  it('ignores an unrecognised utterance rather than dropping to diagnose', () => {
    expect(resolveTask({ utterance: 'mumble', requested: 'complete', isTemplate: false })).toBe('fill');
  });
});

describe('answer-only situations never touch the code', () => {
  it('tells each one to reproduce the input and return no changes', () => {
    for (const t of ANSWER_ONLY_TASKS) {
      const text = blockFor(t);
      expect(text, `${t} must pin fixed_code`).toMatch(/EXACTLY as given|byte for byte/i);
      expect(text, `${t} must empty changes[]`).toMatch(/"changes" to \[\]|changes: \[\]/);
    }
  });

  it('never asks an answer-only situation to emit an edited program', () => {
    for (const t of ANSWER_ONLY_TASKS) {
      expect(blockFor(t), `${t} leaks an edit instruction`)
        .not.toMatch(/fixed_code is the (IMPROVED|refactored|ADAPTED)/);
    }
  });

  it('does ask the code-producing utterance situations for one', () => {
    for (const t of ['optimize', 'refactor', 'extend']) {
      expect(isAnswerOnly(t)).toBe(false);
      expect(blockFor(t)).toMatch(/fixed_code is the/);
    }
  });
});

describe('each situation keeps the part the question is actually testing', () => {
  it('optimize demands the bottleneck be named, not just the Big-O', () => {
    const text = blockFor('optimize');
    expect(text).toMatch(/NAME THE BOTTLENECK/);
    expect(text).toMatch(/is not an answer/);
    // Constant-factor wins dressed up as asymptotic ones is the classic miss.
    expect(text).toMatch(/constant/i);
  });

  it('justify demands both directions and the condition that flips it', () => {
    const text = blockFor('justify');
    expect(text).toMatch(/cut both ways/i);
    expect(text).toMatch(/FLIPS the decision/);
    expect(text).toMatch(/strawman/);
  });

  it('extend requires the accepted trade-off, not just the upside', () => {
    const text = blockFor('extend');
    for (const part of ['(a)', '(b)', '(c)', '(d)']) expect(text).toContain(part);
    expect(text).toMatch(/WON OR LOST/);
    expect(text).toMatch(/most common senior-level miss/);
  });

  it('edge reports what the code really does, ranked by severity', () => {
    const text = blockFor('edge');
    expect(text).toMatch(/ACTUAL behaviour/);
    expect(text).toMatch(/Rank by SEVERITY/);
    expect(text).toMatch(/gets WRONG/);
  });

  it('trace refuses to smooth over a divergence', () => {
    const text = blockFor('trace');
    expect(text).toMatch(/AS WRITTEN, not as intended/);
    expect(text).toMatch(/unforgivable/);
  });

  it('hint makes the model take the nudge instead of arguing with it', () => {
    const text = blockFor('hint');
    expect(text).toMatch(/NEVER argue with the hint/);
    expect(text).toMatch(/NAME WHAT THE HINT IS POINTING AT/);
  });

  it('clarify pairs every question with the assumption to fall back on', () => {
    const text = blockFor('clarify');
    expect(text).toMatch(/would ASSUME/);
    // Questions that change nothing are noise and cost interview time.
    expect(text).toMatch(/does not change the code is noise/);
  });
});

describe('classifyUtterance — things interviewers actually say', () => {
  // Phrasings collected from the five interviewer stages. Each is the wording a
  // real interviewer uses, not the situation's name — the classifier never gets
  // to see a tidy label.
  const CASES = [
    ['optimize', 'Can we do better than that?'],
    ['optimize', "That's O(n squared). Where's the bottleneck in your current approach?"],
    ['optimize', 'Can you get this under O(n log n)?'],
    ['justify', 'Why did you use a Hash Map here instead of a balanced Binary Tree?'],
    ['justify', 'Why not just sort it first?'],
    ['extend', 'What if the input array cannot fit into memory?'],
    ['extend', 'How would you design this if we had a billion users instead of a hundred?'],
    ['extend', 'Say N threads call this simultaneously — what happens?'],
    ['extend', 'This is now an API used by 50 teams. What changes?'],
    ['extend', 'Can you optimize this for faster runtime if I give you unlimited memory?'],
    ['extend', 'The input is now a stream instead of a batch.'],
    ['trace', 'Can you trace through your code line-by-line using this test case?'],
    ['trace', 'Walk me through it with nums = [3,1,2].'],
    ['trace', 'Prove to me that this loop always terminates.'],
    ['edge', 'What are the absolute worst-case inputs for this code?'],
    ['edge', 'What happens to your algorithm if the input is an empty string?'],
    ['edge', 'What inputs would break your solution?'],
    ['refactor', 'How could you rewrite this section to make it cleaner or more modular?'],
    ['refactor', 'You have repeated logic here and there. How would you abstract this?'],
    // Stage 4 of the interviewer taxonomy files "why a string builder?" under
    // code review, but the ANSWER it wants is justify's: defend the choice
    // against the named alternative, both directions, name the input size that
    // flips it. Routing it to refactor would rewrite code nobody said was
    // wrong. Classified by answer shape, not by which stage it was listed in.
    ['justify', 'Why did you use normal string concatenation instead of a string builder?'],
    ['clarify', 'Any questions before you start?'],
    ['clarify', 'What would you want to know before writing any code?'],
    ['hint', 'What property of a sorted array are we not using yet?'],
    ['hint', "Let's go back to our initial assumption."],
    ['hint', 'Have you considered what happens with duplicate numbers?'],
  ];

  for (const [expected, utterance] of CASES) {
    it(`${expected} ← "${utterance.slice(0, 52)}"`, () => {
      expect(classifyUtterance(utterance)).toBe(expected);
    });
  }

  it('stays silent on text that is not an interview probe', () => {
    // A false positive here hijacks a real solve request, so silence is the
    // safe default — the screen classifier still gets its turn.
    for (const noise of ['', 'ok', 'sounds good', 'let me share my screen', 'Two Sum', 'yeah that works']) {
      expect(classifyUtterance(noise), `misrouted: "${noise}"`).toBeNull();
    }
    expect(classifyUtterance(undefined)).toBeNull();
    expect(classifyUtterance(null)).toBeNull();
  });

  it('keeps a resource trade in extend rather than plain optimize', () => {
    // "make it faster" alone is optimize; the unlimited-memory clause makes it
    // a trade-off question, and the ordering of the rules is what decides it.
    expect(classifyUtterance('Make it faster.')).toBe('optimize');
    expect(classifyUtterance('With unlimited memory, can you make it faster?')).toBe('extend');
  });

  it('routes an explicit mode chip ahead of the heuristic', () => {
    // The candidate clicking "Edge cases" must win over whatever the transcript
    // happens to look like.
    expect(resolveTask({ utterance: 'edge', isTemplate: false })).toBe('edge');
  });
});

describe('refactor and diagnose stay distinct', () => {
  it('refactor treats the code as correct and forbids behaviour changes', () => {
    const text = blockFor('refactor');
    expect(text).toMatch(/PRODUCES CORRECT OUTPUT/);
    expect(text).toMatch(/Do not hunt for defects/);
    expect(text).toMatch(/behaviour-identical/);
  });

  it('does not import diagnose\'s defect hunt into refactor', () => {
    // Two situations that both audit for faults is exactly the drift the
    // registry exists to prevent.
    expect(blockFor('refactor')).not.toMatch(/wrong operators|off-by-one/);
    expect(blockFor('diagnose')).toMatch(/wrong operators/);
  });

  it('teaches the classifier where the line between them is', () => {
    expect(UTTERANCE_SPEC).toMatch(/'refactor' vs 'diagnose'/);
  });
});
