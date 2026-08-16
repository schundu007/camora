import { describe, it, expect } from 'vitest';
import { docFromSolution, docFromBlocks, docFromCoFix } from './book-model';

const SD = {
  language: 'python',
  solutions: [{
    name: 'Two Pointers',
    patternTag: 'Two Pointers',
    approach: 'Scan from both ends, shrinking inward.',
    code: 'def f(a):\n    return a',
    complexity: { time: 'O(n)', space: 'O(1)' },
    narration: 'So my instinct is a two-pointer scan.',
    trace: [{ step: 1, action: 'init', state: 'l=0, r=n-1' }],
    explanations: [{ line: 1, code: 'def f(a):', explanation: 'signature' }],
  }],
  pitch: {
    opener: 'A single pass suffices.',
    approach: 'Two pointers converge.',
    keyPoints: ['Pointers never cross', 'One pass'],
    tradeoffs: ['O(1) space vs readability'],
    edgeCases: ['Empty array', 'All equal'],
  },
};

const ids = (doc: { sections: { id: string }[] }) => doc.sections.map(s => s.id);

describe('docFromSolution', () => {
  it('emits sections in reading order', () => {
    expect(ids(docFromSolution(SD))).toEqual([
      'approach', 'complexity', 'walkthrough', 'trace', 'tradeoffs', 'edgecases',
    ]);
  });

  it('renders keyPoints as a callout, not prose', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    const callout = s.blocks.find(b => b.kind === 'callout');
    expect(callout).toEqual({ kind: 'callout', label: 'Key points', items: ['Pointers never cross', 'One pass'] });
  });

  it('renders complexity as a kv strip', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'complexity')!;
    expect(s.blocks[0]).toEqual({ kind: 'kv', pairs: [['Time', 'O(n)'], ['Space', 'O(1)']] });
  });

  // A bare bound is the half the interviewer already assumes — "why" is the
  // next question, and the derivation used to be dropped on the floor here even
  // when the backend supplied it.
  it('renders the complexity derivation alongside the bounds', () => {
    const withWhy = {
      solutions: [{
        approach: 'x',
        complexity: {
          time: 'O(n log n)', space: 'O(n)',
          timeWhy: 'log n levels of recursion, n work merging at each level.',
          spaceWhy: 'One n-sized merge buffer plus log n stack frames.',
        },
      }],
    };
    const s = docFromSolution(withWhy).sections.find(x => x.id === 'complexity')!;
    expect(s.blocks[1]).toEqual({
      kind: 'callout',
      label: 'Why these bounds',
      items: [
        'Time — log n levels of recursion, n work merging at each level.',
        'Space — One n-sized merge buffer plus log n stack frames.',
      ],
    });
  });

  // Answers cached before the field existed must degrade to the bounds alone,
  // not render an empty aside.
  it('omits the derivation aside when the backend supplied none', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'complexity')!;
    expect(s.blocks).toHaveLength(1);
  });

  it('keeps the derivation when only one of the two is present', () => {
    const partial = { solutions: [{ approach: 'x', complexity: { time: 'O(n)', timeWhy: 'One pass.' } }] };
    const s = docFromSolution(partial).sections.find(x => x.id === 'complexity')!;
    expect(s.blocks[1]).toMatchObject({ kind: 'callout', items: ['Time — One pass.'] });
  });

  it('drops sections with no content instead of emitting empty boxes', () => {
    const bare = { solutions: [{ approach: 'x' }] };
    expect(ids(docFromSolution(bare))).toEqual(['approach']);
  });

  it('accepts a pitch that is a bare string', () => {
    const strPitch = { solutions: [{ approach: 'x' }], pitch: 'just a sentence' };
    const s = docFromSolution(strPitch).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'just a sentence' });
  });

  it('selects the requested solution index', () => {
    const two = { solutions: [{ approach: 'first' }, { approach: 'second' }] };
    const s = docFromSolution(two, 1).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'second' });
  });

  it('never leaves markdown in a text field', () => {
    const md = { solutions: [{ approach: '**bold** and *ital*' }] };
    const s = docFromSolution(md).sections.find(x => x.id === 'approach')!;
    const prose = s.blocks.find(b => b.kind === 'prose') as { text: string };
    expect(prose.text).not.toMatch(/\*/);
  });

  it('keeps pitch.approach (the summary paragraph), not just opener', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'Two pointers converge.' });
  });

  it('keeps both sol.approach and sol.narration when they differ', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'So my instinct is a two-pointer scan.' });
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'Scan from both ends, shrinking inward.' });
  });
});

describe('docFromBlocks', () => {
  it('maps coding blocks to sections', () => {
    const blocks = [
      { type: 'PROBLEM', content: 'Reverse words.' },
      { type: 'APPROACH', content: 'Split and join.' },
      { type: 'CODE', content: 'print(1)', lang: 'python' },
      { type: 'COMPLEXITY', content: 'Time: O(n)\nSpace: O(n)' },
      { type: 'EDGECASES', content: '- empty\n- single word' },
    ];
    expect(ids(docFromBlocks(blocks))).toEqual(['problem', 'approach', 'code', 'complexity', 'edgecases']);
  });

  it('parses a COMPLEXITY block into kv pairs', () => {
    const doc = docFromBlocks([{ type: 'COMPLEXITY', content: 'Time: O(n)\nSpace: O(1)' }]);
    expect(doc.sections[0].blocks[0]).toEqual({ kind: 'kv', pairs: [['Time', 'O(n)'], ['Space', 'O(1)']] });
  });

  it('keeps a bare line in a COMPLEXITY block instead of dropping it', () => {
    const doc = docFromBlocks([{ type: 'COMPLEXITY', content: 'Time: O(n)\nAmortized over all ops' }]);
    expect(doc.sections[0].blocks).toEqual([
      { kind: 'kv', pairs: [['Time', 'O(n)']] },
      { kind: 'list', items: ['Amortized over all ops'] },
    ]);
  });

  it('covers every design block type the renderer supports', () => {
    const designTypes = [
      'REQUIREMENTS', 'SCALEMATH', 'DEEPDESIGN', 'TRADEOFFS', 'EDGECASES',
      'APIDESIGN', 'DATAMODEL', 'TECHNOLOGIES', 'CLOUDSERVICES', 'FOLLOWUP',
    ];
    const blocks = designTypes.map(type => ({ type, content: 'x' }));
    // Every supported type must produce exactly one section — none silently dropped.
    expect(docFromBlocks(blocks).sections).toHaveLength(designTypes.length);
  });

  it('ignores unknown block types rather than throwing', () => {
    expect(docFromBlocks([{ type: 'WAT', content: 'x' }]).sections).toEqual([]);
  });

  it('drops blocks whose content is whitespace', () => {
    expect(docFromBlocks([{ type: 'APPROACH', content: '   ' }]).sections).toEqual([]);
  });
});

describe('docFromCoFix', () => {
  it('maps changes and walkthrough to sections', () => {
    const doc = docFromCoFix({
      changes: [{ line: 3, type: 'fix', badge: '1', label: 'Off-by-one', note: 'Use <=' }],
      walkthrough: [{ lines: '3-4', context: 'loop', text: 'Bounds corrected.' }],
    });
    expect(doc.sections.map(s => s.id)).toEqual(['walkthrough', 'changes']);
  });

  it('prepends analysis sections when analysis is supplied', () => {
    const doc = docFromCoFix(
      { changes: [], walkthrough: [] },
      { title: 'Two Sum', problem: 'Find a pair.', concepts: ['Hash Map'], steps: [], examples: [] } as any,
    );
    expect(doc.sections.map(s => s.id)).toEqual(['problem', 'concepts']);
  });

  it('returns no sections for an empty answer', () => {
    expect(docFromCoFix({ changes: [], walkthrough: [] }).sections).toEqual([]);
  });

  // Note: the brief's Step 1 tests only exercise `problem`/`concepts` text and bare
  // arrays. Per the brief's own Step 3 note, Input/Output format and Examples must
  // NOT be dropped — they fold into the `problem` section as a `kv` block and a
  // `list` block respectively, alongside the prose. This test asserts that richer,
  // no-drop behavior explicitly since the Step 1 tests don't cover it.
  it('folds Input/Output format and Examples into the problem section instead of dropping them', () => {
    const doc = docFromCoFix(
      { changes: [], walkthrough: [] },
      {
        title: 'Two Sum',
        problem: 'Find a pair that sums to target.',
        input_format: 'Array of ints, target int',
        output_format: 'Indices of the two numbers',
        examples: [{ input: '[2,7,11,15], target=9', output: '[0,1]', explanation: 'nums[0]+nums[1]==9' }],
        concepts: [],
        steps: [],
      } as any,
    );
    const problem = doc.sections.find(s => s.id === 'problem')!;
    expect(problem.blocks).toContainEqual({
      kind: 'kv',
      pairs: [['Input format', 'Array of ints, target int'], ['Output format', 'Indices of the two numbers']],
    });
    expect(problem.blocks).toContainEqual({
      kind: 'list',
      items: ['[2,7,11,15], target=9 → [0,1] — nums[0]+nums[1]==9'],
    });
  });

  it('drops the Input/Output kv block entirely when neither format string is present', () => {
    const doc = docFromCoFix(
      { changes: [], walkthrough: [] },
      { problem: 'x', input_format: '', output_format: '', examples: [], concepts: [], steps: [] } as any,
    );
    const problem = doc.sections.find(s => s.id === 'problem')!;
    expect(problem.blocks.some(b => b.kind === 'kv')).toBe(false);
  });

  it('problem view shows problem/examples but not concepts/steps or fix changes', () => {
    const doc = docFromCoFix(
      { changes: [{ line: 1, label: 'x', note: 'y' }], walkthrough: [{ lines: '1', text: 'w' }] },
      { title: 'T', problem: 'P', concepts: ['C'], steps: [{ text: 'S' }], examples: [{ input: 'i', output: 'o' }] } as any,
      'problem',
    );
    const ids = doc.sections.map(s => s.id);
    expect(ids).toContain('problem');
    expect(ids).not.toContain('concepts');
    expect(ids).not.toContain('steps');
    expect(ids).not.toContain('walkthrough');
    expect(ids).not.toContain('changes');
  });

  it('learn view shows concepts/steps but not problem or fix changes', () => {
    const doc = docFromCoFix(
      { changes: [{ line: 1, label: 'x', note: 'y' }], walkthrough: [{ lines: '1', text: 'w' }] },
      { title: 'T', problem: 'P', concepts: ['C'], steps: [{ text: 'S' }] } as any,
      'learn',
    );
    const ids = doc.sections.map(s => s.id);
    expect(ids).toContain('concepts');
    expect(ids).toContain('steps');
    expect(ids).not.toContain('problem');
    expect(ids).not.toContain('walkthrough');
    expect(ids).not.toContain('changes');
  });
});

it('live and history agree on the section ids they both emit (parity guard)', () => {
  const solDoc = docFromSolution(SD);
  const blockDoc = docFromBlocks([
    { type: 'APPROACH', content: 'Scan from both ends.' },
    { type: 'COMPLEXITY', content: 'Time: O(n)\nSpace: O(1)' },
    { type: 'EDGECASES', content: '- empty\n- all equal' },
    { type: 'TRADEOFFS', content: '- space vs readability' },
  ]);
  const solIds = new Set(solDoc.sections.map(s => s.id));
  const blockIds = new Set(blockDoc.sections.map(s => s.id));
  const overlap = [...solIds].filter(id => blockIds.has(id));
  // every shared id must be produced by BOTH paths — neither silently drops it
  for (const id of overlap) {
    expect(solIds.has(id)).toBe(true);
    expect(blockIds.has(id)).toBe(true);
  }
  // and they genuinely share the core answer sections
  expect(overlap).toEqual(expect.arrayContaining(['approach', 'complexity', 'edgecases', 'tradeoffs']));
});
