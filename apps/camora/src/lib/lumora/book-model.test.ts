import { describe, it, expect } from 'vitest';
import { docFromSolution, docFromBlocks, docFromCoFix} from './book-model';

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
  // Order is layout: the two-column grid pairs cells as they arrive, so
  // Tradeoffs sits beside Approach comparison and Dry-run trace beside Edge
  // cases — each row a pair that is read together.
  it('emits sections in reading order', () => {
    // Interview reading order: what you did, what it costs, the line-by-line,
    // then the material you reach for when questioned.
    expect(ids(docFromSolution(SD))).toEqual([
      'approach', 'complexity', 'walkthrough', 'trace', 'edgecases', 'tradeoffs',
    ]);
  });

  describe('approach comparison', () => {
    const THREE = {
      solutions: [
        { name: 'Brute Force', patternTag: 'Brute Force', approach: 'a',
          complexity: { time: 'O(n^2)', space: 'O(1)', timeWhy: 'nested loops' },
          optimality: { tleRisk: true, why: 'n reaches 1e5' } },
        { name: 'Sorting', patternTag: 'Sorting', approach: 'b',
          complexity: { time: 'O(n log n)', space: 'O(n)' } },
        { name: 'Hash Map', patternTag: 'Hash Map', approach: 'c',
          complexity: { time: 'O(n)', space: 'O(n)' } },
      ],
      pitch: { tradeoffs: ['space vs time'] },
    };

    it('sits directly after tradeoffs', () => {
      const order = ids(docFromSolution(THREE));
      expect(order[order.indexOf('tradeoffs') + 1]).toBe('comparison');
    });

    it('carries one row per approach with both bounds and the pattern', () => {
      const s = docFromSolution(THREE).sections.find(x => x.id === 'comparison')!;
      const block = s.blocks[0];
      expect(block.kind).toBe('matrix');
      if (block.kind !== 'matrix') throw new Error('expected a matrix');
      expect(block.rows.map(r => [r.name, r.pattern, r.time, r.space])).toEqual([
        ['Brute Force', 'Brute Force', 'O(n^2)', 'O(1)'],
        ['Sorting', 'Sorting', 'O(n log n)', 'O(n)'],
        ['Hash Map', 'Hash Map', 'O(n)', 'O(n)'],
      ]);
      expect(block.rows.map(r => r.verdict)).toEqual(['baseline', undefined, 'best']);
      expect(block.rows[0].tleRisk).toBe(true);
      expect(block.rows[0].timeWhy).toBe('nested loops');
    });

    it('marks the approach the rest of the page is showing', () => {
      const s = docFromSolution(THREE, 1).sections.find(x => x.id === 'comparison')!;
      const block = s.blocks[0];
      if (block.kind !== 'matrix') throw new Error('expected a matrix');
      expect(block.activeIndex).toBe(1);
    });

    // A comparison of one is a table with nothing to compare.
    it('is absent for a single-solution answer', () => {
      expect(ids(docFromSolution(SD))).not.toContain('comparison');
    });
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

  // The Solution card is scanned mid-interview, so its four sources render as
  // bullets rather than four stacked paragraphs.
  it('renders the solution as bullets, not paragraphs', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    expect(s.blocks.some(b => b.kind === 'prose')).toBe(false);
    expect(s.blocks[0]).toMatchObject({ kind: 'list' });
  });

  // Bullets put duplication on display in a way stacked paragraphs hid — the
  // sources genuinely overlap (narration often restates pitch.approach).
  it('collapses sources that repeat each other into one bullet', () => {
    const dup = {
      solutions: [{ narration: 'Same sentence.', approach: 'Same sentence.' }],
      pitch: { opener: 'Same sentence.', approach: 'Different one.' },
    };
    const s = docFromSolution(dup).sections.find(x => x.id === 'approach')!;
    expect(s.blocks[0]).toEqual({ kind: 'list', items: ['Same sentence.', 'Different one.'] });
  });

  it('drops sections with no content instead of emitting empty boxes', () => {
    const bare = { solutions: [{ approach: 'x' }] };
    expect(ids(docFromSolution(bare))).toEqual(['approach']);
  });

  it('accepts a pitch that is a bare string', () => {
    const strPitch = { solutions: [{ approach: 'x' }], pitch: 'just a sentence' };
    const s = docFromSolution(strPitch).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'list', items: ['x', 'just a sentence'] });
  });

  it('selects the requested solution index', () => {
    const two = { solutions: [{ approach: 'first' }, { approach: 'second' }] };
    const s = docFromSolution(two, 1).sections.find(x => x.id === 'approach')!;
    expect(s.blocks.find(b => b.kind === 'list')!).toMatchObject({ items: expect.arrayContaining(['second']) });
  });

  it('never leaves markdown in a text field', () => {
    const md = { solutions: [{ approach: '**bold** and *ital*' }] };
    const s = docFromSolution(md).sections.find(x => x.id === 'approach')!;
    const list = s.blocks.find(b => b.kind === 'list') as { items: string[] };
    expect(list.items.join(' ')).not.toMatch(/\*/);
  });

  it('keeps pitch.approach (the summary paragraph), not just opener', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    expect(s.blocks.find(b => b.kind === 'list')!).toMatchObject({ items: expect.arrayContaining(['Two pointers converge.']) });
  });

  it('keeps both sol.approach and sol.narration when they differ', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    expect(s.blocks.find(b => b.kind === 'list')!).toMatchObject({
      items: expect.arrayContaining(['So my instinct is a two-pointer scan.', 'Scan from both ends, shrinking inward.']),
    });
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

describe('identification section', () => {
  const ident = {
    path: [
      { node: 'graph', question: 'Is it a graph?', answer: 'yes', evidence: 'grid, move to 4 adjacent cells' },
      { node: 'tree', question: 'Is it a tree?', answer: 'no', evidence: 'cells revisit — cycles exist' },
    ],
    dataStructure: 'implicit graph over grid cells',
    technique: 'DFS/backtracking',
    ruledOut: ["Dijkstra — edges are unweighted"],
  };

  // The interviewer's real question is "how did you know?", so the trail has to
  // survive into the rendered answer rather than only the technique name.
  // A full walk answers "no" a dozen times before the branch that matters, and
  // that wall of negatives buries the reasoning the card exists to show.
  it('shows only the decisive yes steps', () => {
    const doc = docFromSolution({
      solutions: [{ code: 'x' }],
      identification: {
        path: [
          { question: 'Is it a graph?', answer: 'no', evidence: 'plain array' },
          { question: 'kth smallest/largest?', answer: 'no', evidence: 'no k' },
          { question: 'Compute a max/min?', answer: 'yes', evidence: 'how much water it can trap' },
          { question: 'Need nearest greater/smaller bounds?', answer: 'yes', evidence: 'min(leftMax, rightMax) per index' },
        ],
        technique: 'Two Pointers',
      },
    });
    const rows = (doc.sections.find(s => s.id === 'identification')!.blocks
      .filter(b => b.kind === 'kv')[1] as any).pairs;
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('Compute a max/min? — yes');
    expect(rows[1][0]).toBe('Need nearest greater/smaller bounds? — yes');
    expect(rows.some((r: [string, string]) => r[0].includes('— no'))).toBe(false);
  });

  // A path can legitimately end on a no-branch; showing nothing would be worse.
  it('keeps the last step when nothing was answered yes', () => {
    const doc = docFromSolution({
      solutions: [{ code: 'x' }],
      identification: {
        path: [
          { question: 'Is it a graph?', answer: 'no', evidence: 'plain array' },
          { question: 'Sorted input?', answer: 'no', evidence: 'unsorted' },
        ],
        technique: 'Simulation',
      },
    });
    const rows = (doc.sections.find(s => s.id === 'identification')!.blocks
      .filter(b => b.kind === 'kv')[1] as any).pairs;
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe('Sorted input? — no');
  });

  it('renders the walk, the verdict and what was ruled out', () => {
    const doc = docFromSolution({ solutions: [{ code: 'x' }], identification: ident });
    const sec = doc.sections.find(s => s.id === 'identification');
    expect(sec).toBeDefined();
    expect(sec!.heading).toBe('How to spot it');

    const kvs = sec!.blocks.filter(b => b.kind === 'kv') as any[];
    expect(kvs[0].pairs).toContainEqual(['Technique', 'DFS/backtracking']);
    expect(kvs[0].pairs).toContainEqual(['Data structure', 'implicit graph over grid cells']);
    // Only the yes step survives the decisive filter.
    expect(kvs[1].pairs).toHaveLength(1);
    expect(kvs[1].pairs[0]).toEqual(['Is it a graph? — yes', 'grid, move to 4 adjacent cells']);

    const callout = sec!.blocks.find(b => b.kind === 'callout') as any;
    expect(callout.label).toBe('Ruled out');
    expect(callout.items).toEqual(['Dijkstra — edges are unweighted']);
  });

  // Answers cached before the field existed, and walks the backend rejected as
  // invalid, must render nothing rather than an empty card.
  it('renders no section when identification is absent or empty', () => {
    for (const sd of [
      { solutions: [{ code: 'x' }] },
      { solutions: [{ code: 'x' }], identification: {} },
      { solutions: [{ code: 'x' }], identification: { path: [] } },
    ]) {
      expect(docFromSolution(sd).sections.find(s => s.id === 'identification')).toBeUndefined();
    }
  });

  it('skips malformed steps but keeps the good ones', () => {
    const doc = docFromSolution({
      solutions: [{ code: 'x' }],
      identification: { path: [{ question: 'Is it a graph?', answer: 'yes' }, { answer: 'no' }] },
    });
    const sec = doc.sections.find(s => s.id === 'identification')!;
    const rows = (sec.blocks.find(b => b.kind === 'kv') as any).pairs;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(['Is it a graph? — yes', '—']);
  });
});

describe('interview cards', () => {
  const interview = {
    budget: { n: 'n <= 10^5', ceiling: 'O(n log n) or better', verdict: 'O(n) hash pass — fits' },
    signals: [{ phrase: 'contiguous subarray', implies: 'sliding window or prefix sums' }],
    topic: {
      section: 'Two Pointers',
      concepts: ['sliding window'],
      review: [{ section: 'Two Pointers', lesson: 'Sliding Window - Longest' }],
    },
    probes: [{ q: 'Can you do it in O(1) space?', a: 'Not while counting distinct values.' }],
    pitfalls: ['forgetting to shrink the window when the condition breaks'],
  };

  it('renders all four cards with their content', () => {
    const doc = docFromSolution({ solutions: [{ code: 'x' }], interview });
    const ids = doc.sections.map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['budget', 'signals', 'topic', 'probes']));

    const budget = doc.sections.find(s => s.id === 'budget')!;
    expect((budget.blocks[0] as any).pairs).toContainEqual(['This solution', 'O(n) hash pass — fits']);
    expect(budget.heading).toBe('Constraint budget');

    const signals = doc.sections.find(s => s.id === 'signals')!;
    expect((signals.blocks[0] as any).pairs[0]).toEqual(['contiguous subarray', 'sliding window or prefix sums']);

    // "Review" resolves against the real curriculum on the backend, so the
    // lesson and its section both survive into the card.
    const topic = doc.sections.find(s => s.id === 'topic')!;
    expect((topic.blocks[0] as any).pairs).toContainEqual(['Pattern', 'Two Pointers']);
    expect((topic.blocks[1] as any).items).toEqual(['Sliding Window - Longest — Two Pointers']);

    const probes = doc.sections.find(s => s.id === 'probes')!;
    expect((probes.blocks[0] as any).pairs[0][0]).toBe('Can you do it in O(1) space?');
    expect((probes.blocks[1] as any).label).toBe('Common mistakes');
  });

  it('renders nothing when the backend dropped the cards', () => {
    const doc = docFromSolution({ solutions: [{ code: 'x' }] });
    for (const id of ['budget', 'signals', 'topic', 'probes']) {
      expect(doc.sections.find(s => s.id === id)).toBeUndefined();
    }
  });

  it('renders only the cards that survived validation', () => {
    const doc = docFromSolution({
      solutions: [{ code: 'x' }],
      interview: { budget: { n: 'n <= 20', ceiling: 'exponential is fine' } },
    });
    expect(doc.sections.find(s => s.id === 'budget')).toBeDefined();
    expect(doc.sections.find(s => s.id === 'signals')).toBeUndefined();
    expect(doc.sections.find(s => s.id === 'probes')).toBeUndefined();
  });

  it('drops half-formed probe and signal entries', () => {
    const doc = docFromSolution({
      solutions: [{ code: 'x' }],
      interview: {
        signals: [{ phrase: 'kth largest' }, { phrase: 'top k', implies: 'heap' }],
        probes: [{ q: 'Why a heap?' }],
      },
    });
    expect((doc.sections.find(s => s.id === 'signals')!.blocks[0] as any).pairs).toHaveLength(1);
    expect(doc.sections.find(s => s.id === 'probes')).toBeUndefined();
  });
});

describe('card order', () => {
  // The sections used to appear in whatever order the builder pushed them, which
  // put reference material above the answer. This is the order the interview
  // itself goes in: recognise the pattern, say the plan, show the code.
  it('leads with how you spotted it, then the solution and its code', () => {
    const doc = docFromSolution({
      solutions: [{ name: 'Two Pointers', approach: 'scan', code: 'x', complexity: { time: 'O(n)', space: 'O(1)' }, explanations: [{ line: 1, code: 'x', explanation: 'e' }] }],
      identification: { path: [{ question: 'Compute a max/min?', answer: 'yes', evidence: 'water' }], technique: 'Two Pointers' },
      interview: {
        budget: { n: 'n<=2e4', ceiling: 'O(n)' },
        probes: [{ q: 'O(1) space?', a: 'no' }],
        topic: { section: 'Two Pointers' },
      },
      pitch: { tradeoffs: ['t'], edgeCases: ['empty'] },
    });
    const ids = doc.sections.map(s => s.id);
    const at = (id: string) => ids.indexOf(id);

    expect(at('identification')).toBeGreaterThanOrEqual(0);
    expect(at('identification')).toBeLessThan(at('approach'));
    expect(at('approach')).toBeLessThan(at('complexity'));
    expect(at('complexity')).toBeLessThan(at('walkthrough'));
    // Reference material a candidate reaches for when questioned comes after.
    expect(at('walkthrough')).toBeLessThan(at('probes'));
    expect(at('edgecases')).toBeLessThan(at('probes'));
    // What to study afterwards is last.
    expect(at('topic')).toBe(ids.length - 1);
  });

  it('keeps unlisted sections in their original relative order', () => {
    // docFromSolution emits no `code` section — the code lives in the editor.
    const doc = docFromSolution({ solutions: [{ code: 'x', approach: 'a' }] });
    expect(doc.sections.map(s => s.id)).toEqual(['approach']);
  });
});
