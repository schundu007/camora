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
import { readFileSync } from 'node:fs';
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

describe('the frontend vocabulary matches this one', () => {
  // The client sends these names as `mode` on the wire. When the two lists drift
  // the failure is silent and remote: the chip posts a situation the server has
  // never heard of, normalizeTask returns null, and the request quietly falls
  // back to diagnose — the candidate gets a defect audit instead of the answer
  // they asked for, with nothing logged as wrong.
  const SHARED_TYPES = new URL('../../camora/src/lib/lumora/task-modes.ts', import.meta.url);
  const src = readFileSync(SHARED_TYPES, 'utf8');

  const names = (s) => (s.match(/'([a-z]+)'/g) || []).map(x => x.replace(/'/g, ''));
  const listIn = (re) => names(src.match(re)?.[1] ?? '');

  it('names every utterance situation exactly as this registry does', () => {
    // The ask half shares its names with the server verbatim — there are no
    // aliases to hide a typo behind, so a mismatch here is a dead chip.
    for (const t of UTTERANCE_TASKS) {
      expect(src, `${t} missing from the frontend union`).toContain(`'${t}'`);
    }
  });

  it('sends screen modes as the wire aliases the server maps back', () => {
    // Asymmetry worth stating: the screen half crosses the wire under its OLD
    // names (review→diagnose, complete→fill, solve→explore) because the client
    // and server deploy independently, while the ask half is new on both sides
    // and shares one vocabulary. Compare through normalizeTask, not by string.
    // 'template' is deliberately absent: it is proven server-side by
    // detectPlatformTemplate reading the code, never claimed by a client. A
    // client that could ask for it would be asserting something only the
    // server can observe.
    const screen = listIn(/SCREEN_MODES[^=]*=\s*\[([^\]]*)\]/);
    const clientReachable = SCREEN_TASKS.filter(t => t !== 'template');
    expect(screen.map(normalizeTask).sort()).toEqual([...clientReachable].sort());
  });

  it('splits ask modes the same way', () => {
    expect(listIn(/ASK_MODE_IDS[^=]*=\s*\[([^\]]*)\]/).sort()).toEqual([...UTTERANCE_TASKS].sort());
  });

  it('agrees on which situations leave the code untouched', () => {
    const fn = src.match(/isAnswerOnlyMode[\s\S]*?;/)?.[0] ?? '';
    expect(names(fn).map(normalizeTask).sort()).toEqual([...ANSWER_ONLY_TASKS].sort());
  });
});

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

describe('diagnose scores the process, not just the patch', () => {
  const text = blockFor('diagnose');

  it('tags every defect with a trackable category', () => {
    // The tags double as the per-user weakness dimension: you cannot tell a
    // candidate they are weak on concurrency if findings arrive untyped.
    for (const cat of ['boundary', 'null_type', 'state', 'error_handling',
      'concurrency', 'resource', 'security', 'performance']) {
      expect(text, `${cat} missing from the category list`).toContain(cat);
    }
  });

  it('orders findings by severity, because only the first two get spoken', () => {
    expect(text).toMatch(/ORDER THE DEFECTS BY SEVERITY/);
    expect(text).toMatch(/nitpick listed above a wrong result/);
  });

  it('requires location, reason, and the runtime failure for every defect', () => {
    expect(text).toMatch(/WHERE/);
    expect(text).toMatch(/WHY IT IS WRONG/);
    expect(text).toMatch(/WHAT BREAKS AT RUNTIME/);
    // A finding you cannot demonstrate is a guess wearing a finding's clothes.
    expect(text).toMatch(/you have not found a defect yet/);
  });

  it('names suppression as suppression', () => {
    expect(text).toMatch(/FIX THE CAUSE, NEVER THE SYMPTOM/);
    expect(text).toMatch(/try\/except/);
    expect(text).toMatch(/SUPPRESSION/);
  });

  it('keeps every constraint the original block already earned', () => {
    // The upgrade must not reopen the bug the registry was built to close.
    expect(text).toMatch(/SAME NUMBER OF LINES/);
    expect(text).toMatch(/FORBIDDEN TO REWRITE/);
    expect(text).not.toMatch(/EXECUTION CONTRACT/);
    expect(text).not.toMatch(/you SHOULD restructure/);
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
