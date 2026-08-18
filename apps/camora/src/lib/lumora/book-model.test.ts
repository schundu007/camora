import { describe, it, expect } from 'vitest';
import { docFromSolution, docFromBlocks, docFromCoFix, complexityBeat, condensePoints } from './book-model';

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
    // The order the WORK happens in: what you did, then the dry run, then what
    // you run it against, then what you say when pushed. No walkthrough — the
    // line-by-line rides the code itself as inline comments now — and no
    // complexity, which is written above the code (complexityBeat).
    expect(ids(docFromSolution(SD))).toEqual([
      'approach', 'trace', 'edgecases', 'tradeoffs',
    ]);
  });

  it('drops the walkthrough card — explanations are the code comments', () => {
    expect(ids(docFromSolution(SD))).not.toContain('walkthrough');
  });

  // Diagnose reuses the field name for a different thing: one entry per defect
  // in the candidate's own code, which has no other home on screen.
  it('keeps the walkthrough card for a diagnose answer', () => {
    const doc = docFromSolution({ ...SD, type: 'diagnose' });
    const walk = doc.sections.find(s => s.id === 'walkthrough');
    expect(walk).toBeTruthy();
    expect(walk!.blocks[0].kind).toBe('walk');
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

    // The alternatives you weighed belong under the one you picked — and with
    // the Complexity card gone, this table is the only place bounds appear in
    // the book at all.
    it('sits directly after the solution', () => {
      const order = ids(docFromSolution(THREE));
      expect(order[order.indexOf('approach') + 1]).toBe('comparison');
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

  // Complexity is not a card any more. It was the same two bounds the code
  // header already carried, one pane away from the loops they count.
  it('has no complexity card', () => {
    expect(ids(docFromSolution(SD))).not.toContain('complexity');
  });

  // The Solution card is scanned mid-interview, so its four sources render as
  // bullets rather than four stacked paragraphs.
  // Book format: the spoken narration is a paragraph — it is read aloud in one
  // breath, and as bullets it looked like four unrelated facts — and the terse
  // written sources below it are bullets.
  it('leads with the spoken paragraph, then bullets the written sources', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    expect(s.blocks[0]).toMatchObject({ kind: 'prose' });
    expect(s.blocks[1]).toMatchObject({ kind: 'list' });
  });

  // Bullets put duplication on display in a way stacked paragraphs hid — the
  // sources genuinely overlap (narration often restates pitch.approach).
  it('collapses sources that repeat each other into one bullet', () => {
    const dup = {
      solutions: [{ narration: 'Same sentence.', approach: 'Same sentence.' }],
      pitch: { opener: 'Same sentence.', approach: 'Different one.' },
    };
    const s = docFromSolution(dup).sections.find(x => x.id === 'approach')!;
    // The narration takes the sentence as its paragraph; the three sources that
    // restate it contribute only what it did not already say.
    expect(s.blocks[0]).toEqual({ kind: 'prose', text: 'Same sentence.' });
    expect(s.blocks[1]).toEqual({ kind: 'list', items: ['Different one.'] });
  });

  it('drops sections with no content instead of emitting empty boxes', () => {
    const bare = { solutions: [{ approach: 'x' }] };
    expect(ids(docFromSolution(bare))).toEqual(['approach']);
  });

  it('accepts a pitch that is a bare string', () => {
    const strPitch = { solutions: [{ approach: 'x' }], pitch: 'just a sentence' };
    const s = docFromSolution(strPitch).sections.find(x => x.id === 'approach')!;
    // Sentence-cased on the way out, like every other bullet in the book.
    expect(s.blocks).toContainEqual({ kind: 'list', items: ['X', 'Just a sentence'] });
  });

  it('selects the requested solution index', () => {
    const two = { solutions: [{ approach: 'first' }, { approach: 'second' }] };
    const s = docFromSolution(two, 1).sections.find(x => x.id === 'approach')!;
    expect(s.blocks.find(b => b.kind === 'list')!).toMatchObject({ items: expect.arrayContaining(['Second']) });
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
      items: expect.arrayContaining(['Scan from both ends, shrinking inward.']),
    });
    // "So" is gone from the spoken paragraph: a warm-up word is three
    // characters the eye skips before the sentence starts.
    expect(s.blocks.find(b => b.kind === 'prose')).toMatchObject({ text: 'My instinct is a two-pointer scan.' });
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
  expect(overlap).toEqual(expect.arrayContaining(['approach', 'edgecases', 'tradeoffs']));
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
    // Sentence-cased: the evidence is quoted from the statement, so it arrives
    // however the statement wrote it, and the card renders it as a sentence.
    expect(kvs[1].pairs[0]).toEqual(['Is it a graph? — yes', 'Grid, move to 4 adjacent cells']);

    // Ruled out left this card: the techniques you did NOT pick answer "why not
    // a heap?", which is asked while the approach is on screen, not while the
    // reader is still following how the pattern was recognised.
    expect(sec!.blocks.some(b => b.kind === 'callout')).toBe(false);
    const ruled = doc.sections.find(s => s.id === 'ruledout')!;
    expect(ruled.heading).toBe('Ruled out');
    expect(ruled.blocks[0]).toEqual({ kind: 'list', items: ['Dijkstra — edges are unweighted'] });
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

  it('renders each card with its content', () => {
    const doc = docFromSolution({ solutions: [{ code: 'x' }], interview });
    const ids = doc.sections.map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['budget', 'signals', 'probes']));

    const budget = doc.sections.find(s => s.id === 'budget')!;
    expect((budget.blocks[0] as any).pairs).toContainEqual(['This solution', 'O(n) hash pass — fits']);
    expect(budget.heading).toBe('Constraint budget');

    // The phrase is quoted from the statement and its reading is a sentence of
    // its own; both open with a capital, like every other line in the book.
    const signals = doc.sections.find(s => s.id === 'signals')!;
    expect((signals.blocks[0] as any).pairs[0]).toEqual(['Contiguous subarray', 'Sliding window or prefix sums']);

    // Topic & review is gone: a curriculum section and a reading list are for
    // afterwards, and its Pattern line was already on two other cards.
    expect(ids).not.toContain('topic');

    const probes = doc.sections.find(s => s.id === 'probes')!;
    expect((probes.blocks[0] as any).pairs[0][0]).toBe('Can you do it in O(1) space?');
    expect((probes.blocks[1] as any).label).toBe('Common mistakes');
  });

  it('renders nothing when the backend dropped the cards', () => {
    const doc = docFromSolution({ solutions: [{ code: 'x' }] });
    for (const id of ['budget', 'signals', 'probes']) {
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
      identification: {
        path: [{ question: 'Compute a max/min?', answer: 'yes', evidence: 'water' }],
        technique: 'Two Pointers',
        ruledOut: ['Sorting — order matters'],
      },
      interview: {
        budget: { n: 'n<=2e4', ceiling: 'O(n)' },
        signals: [{ phrase: 'trapped water', implies: 'two pointers' }],
        probes: [{ q: 'O(1) space?', a: 'no' }],
        topic: { section: 'Two Pointers' },
      },
      pitch: { tradeoffs: ['t'], edgeCases: ['empty'] },
    });
    const ids = doc.sections.map(s => s.id);
    const at = (id: string) => ids.indexOf(id);

    // You read the statement first, so the phrases that gave the pattern away
    // come before the walk they led to.
    expect(at('signals')).toBe(0);
    expect(at('signals')).toBeLessThan(at('identification'));
    // What you considered and dropped sits between how you spotted it and what
    // you chose — it is asked about the moment the approach is on screen.
    expect(at('identification')).toBeLessThan(at('ruledout'));
    expect(at('ruledout')).toBeLessThan(at('approach'));
    // Then what you run it against, then what you say when pushed on it. The
    // constraint budget follows Tradeoffs because the two are stacked into one
    // cell: what you gave up, and the ceiling that made you give it up.
    expect(at('approach')).toBeLessThan(at('edgecases'));
    expect(at('edgecases')).toBeLessThan(at('tradeoffs'));
    expect(at('tradeoffs')).toBeLessThan(at('budget'));
    expect(at('budget')).toBeLessThan(at('probes'));
    // Nothing follows the questions — the study-plan card that used to sit
    // after them is gone.
    expect(at('probes')).toBe(ids.length - 1);
  });

  it('keeps unlisted sections in their original relative order', () => {
    // docFromSolution emits no `code` section — the code lives in the editor.
    const doc = docFromSolution({ solutions: [{ code: 'x', approach: 'a' }] });
    expect(doc.sections.map(s => s.id)).toEqual(['approach']);
  });
});

// House style: bullets are sentence case regardless of which schema hint the
// model was mirroring. "Key points" arrived capitalized and "Common mistakes"
// lowercase in the same answer, which reads as two different documents.
describe('bullet casing', () => {
  const cased = (sd: any, id: string) => {
    const block = docFromSolution(sd).sections.find(s => s.id === id)!.blocks[0];
    if (block.kind === 'list') return block.items;
    if (block.kind === 'callout') return block.items;
    throw new Error(`unexpected ${block.kind}`);
  };

  it('capitalizes prose bullets', () => {
    const sd = { ...SD, pitch: { ...SD.pitch, edgeCases: ['empty array', 'all equal'] } };
    expect(cased(sd, 'edgecases')).toEqual(['Empty array', 'All equal']);
  });

  it('capitalizes callout items too', () => {
    const sd = {
      ...SD,
      interview: { pitfalls: ['forgetting to evict on every call', 'off-by-one at the boundary'] },
    };
    const items = docFromSolution(sd).sections.find(s => s.id === 'probes')!
      .blocks.find(b => b.kind === 'callout')!;
    if (items.kind !== 'callout') throw new Error('expected a callout');
    expect(items.items[0]).toBe('Forgetting to evict on every call');
  });

  // Capitalising an identifier does not tidy it, it renames it.
  it('leaves a code first-word alone', () => {
    const sd = {
      ...SD,
      pitch: { ...SD.pitch, edgeCases: ['getHits() before any hit', 'self.hits is empty', 'nums[i] overflows', 'O(1) lookups assumed'] },
    };
    expect(cased(sd, 'edgecases')).toEqual([
      'getHits() before any hit', 'self.hits is empty', 'nums[i] overflows', 'O(1) lookups assumed',
    ]);
  });

  it('leaves an already-capitalized bullet untouched', () => {
    const sd = { ...SD, pitch: { ...SD.pitch, edgeCases: ['Empty array'] } };
    expect(cased(sd, 'edgecases')).toEqual(['Empty array']);
  });
});

// Deep Dive and Issues are folded into the cards that already hold their
// subject, rather than rendered in a panel of their own.
describe('solution extras', () => {
  const probesOf = (doc: any) => doc.sections.find((s: any) => s.id === 'probes');

  it('appends Deep Dive questions to Interviewer will ask', () => {
    const sd = { ...SD, interview: { probes: [{ q: 'Why a deque?', a: 'Front eviction.' }] } };
    const doc = docFromSolution(sd, 0, { probes: [['Distributed?', 'Shard by client.']] });
    const kv = probesOf(doc)!.blocks.find((b: any) => b.kind === 'kv')!;
    expect(kv.pairs).toEqual([['Why a deque?', 'Front eviction.'], ['Distributed?', 'Shard by client.']]);
  });

  it('appends Issues under Common mistakes', () => {
    const sd = { ...SD, interview: { pitfalls: ['forgetting to evict on read'] } };
    const doc = docFromSolution(sd, 0, { pitfalls: ['CRITICAL — f() — breaks on empty → guard it'] });
    const callout = probesOf(doc)!.blocks.find((b: any) => b.kind === 'callout')!;
    expect(callout.label).toBe('Common mistakes');
    expect(callout.items).toEqual([
      'Forgetting to evict on read',
      'CRITICAL — f() — breaks on empty → guard it',
    ]);
  });

  // Every answer cached before the interview cards existed has no `interview`
  // object at all — the chips still have to be able to fill the card.
  it('creates the card from extras alone', () => {
    const doc = docFromSolution(SD, 0, { probes: [['Q?', 'A.']], pitfalls: ['watch the boundary'] });
    expect(probesOf(doc)).toBeTruthy();
    expect(probesOf(doc)!.blocks).toHaveLength(2);
  });

  it('does not duplicate what the answer already said', () => {
    const sd = { ...SD, interview: { probes: [{ q: 'Why a deque?', a: 'Front eviction.' }], pitfalls: ['Watch the boundary'] } };
    const doc = docFromSolution(sd, 0, {
      probes: [['why a deque?', 'Restated.']],
      pitfalls: ['watch  the boundary'],
    });
    expect(probesOf(doc)!.blocks.find((b: any) => b.kind === 'kv')!.pairs).toHaveLength(1);
    expect(probesOf(doc)!.blocks.find((b: any) => b.kind === 'callout')!.items).toHaveLength(1);
  });

  it('renders unchanged when no extras are passed', () => {
    expect(probesOf(docFromSolution(SD, 0))).toBeUndefined();
  });
});

// "Interviewer will ask" and "Follow-up Q&A" were the same thing under two
// names, split only by which field of the answer they arrived in.
describe('one interview-questions card', () => {
  const card = (doc: any) => doc.sections.find((s: any) => s.id === 'probes');

  it('merges probes, Deep Dive and follow-ups in that order', () => {
    const sd = {
      ...SD,
      interview: { probes: [{ q: 'Why a stack?', a: 'Order matters.' }] },
      followups: [{ q: 'How would you scale it?', a: 'Shard by key.' }],
    };
    const doc = docFromSolution(sd, 0, { probes: [['What about threads?', 'Use a lock.']] });
    const kv = card(doc)!.blocks.find((b: any) => b.kind === 'kv')!;
    expect(kv.pairs.map((p: any) => p[0])).toEqual([
      'Why a stack?', 'What about threads?', 'How would you scale it?',
    ]);
  });

  it('is titled Interview questions and there is no separate follow-up card', () => {
    const sd = { ...SD, followups: [{ q: 'Scale?', a: 'Shard.' }] };
    const doc = docFromSolution(sd);
    expect(card(doc)!.heading).toBe('Interview questions');
    expect(doc.sections.map((s: any) => s.id)).not.toContain('followup');
  });

  it('drops a follow-up that repeats a probe, whatever its case', () => {
    const sd = {
      ...SD,
      interview: { probes: [{ q: 'Why a stack?', a: 'Order matters.' }] },
      followups: [{ q: 'why a  stack?', a: 'Restated.' }],
    };
    const kv = card(docFromSolution(sd))!.blocks.find((b: any) => b.kind === 'kv')!;
    expect(kv.pairs).toHaveLength(1);
    expect(kv.pairs[0][1]).toBe('Order matters.');
  });

  it('still builds the card from follow-ups alone', () => {
    const doc = docFromSolution({ ...SD, followups: [{ q: 'Scale?', a: 'Shard.' }] });
    expect(card(doc)!.blocks.find((b: any) => b.kind === 'kv')!.pairs).toEqual([['Scale?', 'Shard.']]);
  });
});

// The spoken walk-through is written above the code as a comment header
// (prependWalkthrough) rather than shown as a card beside it.
describe('the Explain chip is not a card', () => {
  it('renders no section even when the beats are present', () => {
    const doc = docFromSolution(SD, 0, { explain: [['Approach', 'Use a stack.']] });
    expect(doc.sections.map((x: any) => x.id)).not.toContain('explain');
  });
});

// The Complexity card states both bounds and derives them, so a probe asking
// what they are is the same answer twice.
describe('complexity probes are filtered out', () => {
  const questions = (sd: any) => {
    const card = docFromSolution(sd).sections.find(s => s.id === 'probes');
    const kv = card?.blocks.find((b: any) => b.kind === 'kv');
    return kv && kv.kind === 'kv' ? kv.pairs.map(p => p[0]) : [];
  };

  it('drops questions that ask for the bounds', () => {
    const sd = { ...SD, interview: { probes: [
      { q: 'What is the time and space complexity of your solution?', a: 'O(n) / O(1)' },
      { q: "What's the time complexity here?", a: 'O(n)' },
      { q: 'Why a stack?', a: 'Order matters.' },
    ] } };
    expect(questions(sd)).toEqual(['Why a stack?']);
  });

  // Changing the complexity is a different question with a different answer.
  it('keeps questions about improving or trading complexity', () => {
    const sd = { ...SD, interview: { probes: [
      { q: 'Could you get this under O(n) space?', a: 'Two pointers.' },
      { q: 'What would you trade to make it faster?', a: 'Memory.' },
    ] } };
    expect(questions(sd)).toHaveLength(2);
  });
});

/* Complexity left the book and became the comment header above the code, so
 * everything the card carried — and the parts it never had room for — has to
 * come out of here. */
describe('complexityBeat', () => {
  const SOLS = {
    solutions: [
      { name: 'Brute Force', complexity: { time: 'O(n^2)', space: 'O(1)' } },
      {
        name: 'Hash Map',
        complexity: {
          time: 'O(n)', space: 'O(n)',
          timeWhy: 'One pass over nums; each lookup is constant time.',
          spaceWhy: 'The map holds up to n entries.',
        },
        optimality: { required: 'O(n log n) or better', achieved: 'O(n)', tleRisk: false, why: 'n reaches 1e4.' },
      },
    ],
  };

  it('leads with each bound and puts its derivation underneath', () => {
    const [label, body] = complexityBeat(SOLS, 1)!;
    expect(label).toBe('Complexity');
    expect(body).toContain('Time — O(n)');
    expect(body).toContain('  One pass over nums; each lookup is constant time.');
    expect(body).toContain('Space — O(n)');
    expect(body).toContain('  The map holds up to n entries.');
  });

  // "Why not just sort it?" is asked far more often than "what is the bound?".
  it('prices the alternatives it was chosen over', () => {
    const [, body] = complexityBeat(SOLS, 1)!;
    expect(body).toContain('Brute Force: O(n^2) time, O(1) space');
    expect(body).not.toContain('Hash Map:');
  });

  it('checks the bound against what the constraints demand', () => {
    const [, body] = complexityBeat(SOLS, 1)!;
    expect(body).toContain('The constraints demand O(n log n) or better — O(n) fits.');
    expect(body).toContain('  n reaches 1e4.');
  });

  it('says so when the bound is over budget', () => {
    const tle = { solutions: [{ complexity: { time: 'O(n^2)' }, optimality: { required: 'O(n log n)', achieved: 'O(n^2)', tleRisk: true } }] };
    expect(complexityBeat(tle)![1]).toContain('O(n^2) is over that budget');
  });

  // Answers cached before optimality existed, and problems that gave no
  // constraints, simply have no verdict paragraph — not an empty one.
  it('degrades to the bounds alone', () => {
    const bare = { solutions: [{ complexity: { time: 'O(n)' } }] };
    expect(complexityBeat(bare)![1]).toBe('Time — O(n)');
  });

  it('is null when there is no bound to state', () => {
    expect(complexityBeat({ solutions: [{ approach: 'x' }] })).toBeNull();
    expect(complexityBeat(null)).toBeNull();
  });
});

describe('condensePoints', () => {
  // Grouped by source: the caller renders the first group as a paragraph and
  // the rest as bullets, which it cannot do from one flat list.
  it('splits each source into its sentences', () => {
    expect(condensePoints(['Build the map first. Then scan it once.']))
      .toEqual([['Build the map first.', 'Then scan it once.']]);
  });

  it('drops a sentence already said in an earlier source', () => {
    expect(condensePoints([
      'Check every pair. That is n squared.',
      'That is n squared! So we do better.',
    ])).toEqual([['Check every pair.', 'That is n squared.'], ['We do better.']]);
  });

  it('strips spoken filler and hedges from the front of a sentence', () => {
    // They stack, so the strip loops: "So, basically …" is two markers deep.
    expect(condensePoints(['So, basically the map holds each value.']))
      .toEqual([['The map holds each value.']]);
    expect(condensePoints(['The obvious approach here is to just compare every pair.']))
      .toEqual([['Compare every pair.']]);
  });

  // Cutting the hedge must never cut the whole sentence: "The key idea is that"
  // followed by nothing means the original was carrying the point.
  it('never empties a sentence', () => {
    expect(condensePoints(['The key idea is.'])).toEqual([['The key idea is.']]);
  });

  it('keeps a rhetorical question with its answer', () => {
    expect(condensePoints(['Why two passes? Because it explains cleanly.']))
      .toEqual([['Why two passes? Because it explains cleanly.']]);
  });
});

/* The pitch describes the SET of approaches — it is top-level, not per-solution
 * — so on a multi-solution answer it was appended, verbatim, to every card. */
describe('the Solution card drops the shared pitch when there are alternatives', () => {
  const pitch = { opener: 'The brute force checks every pair.', approach: 'Start brute, then hash.' };
  const items = (sd: any, i = 0) => {
    const block = docFromSolution(sd, i).sections.find(s => s.id === 'approach')!.blocks[0];
    return block.kind === 'list' ? block.items : [];
  };

  it('leaves only this solution\'s own words on a multi-solution answer', () => {
    const sd = { solutions: [{ approach: 'Compare pairs.' }, { approach: 'Use a map.' }], pitch };
    expect(items(sd, 1)).toEqual(['Use a map.']);
  });

  it('keeps the pitch when it is the only description there is', () => {
    const sd = { solutions: [{ approach: 'Compare pairs.' }], pitch };
    expect(items(sd)).toEqual(['Compare pairs.', 'The brute force checks every pair.', 'Start brute, then hash.']);
  });
});

/* Half the filler words are ordinary openers in this domain, so they only count
 * as filler when punctuated. */
describe('condensePoints leaves real sentences alone', () => {
  it('keeps a right pointer a right pointer', () => {
    expect(condensePoints(['Right pointer moves inward until they meet.']))
      .toEqual([['Right pointer moves inward until they meet.']]);
    expect(condensePoints(['Now walk the array once.'])).toEqual([['Now walk the array once.']]);
  });

  it('still cuts them when they are punctuated filler', () => {
    expect(condensePoints(['Right, the map holds each value.'])).toEqual([['The map holds each value.']]);
  });
});

/* A statement's PROSE carries requirements the numeric constraints never
 * mention — a mandated bound, a banned operation, the target in a Follow-up
 * line — and they rule approaches out rather than merely slowing them down. */
describe('stated requirements', () => {
  const SD_REQ = {
    solutions: [
      { name: 'Brute Force', complexity: { time: 'O(n^2)', space: 'O(1)' },
        requirementCheck: { ok: false, violates: ['O(n) time — this is O(n^2)'] } },
      { name: 'Prefix and Suffix Arrays', complexity: { time: 'O(n)', space: 'O(n)' },
        requirementCheck: { ok: false, violates: ['Follow-up O(1) extra space — allocates two n-sized arrays'] } },
      { name: 'Running Suffix', complexity: { time: 'O(n)', space: 'O(1)' },
        requirementCheck: { ok: true, violates: [] } },
    ],
    interview: { requirements: ['Must run in O(n) time', 'Without using the division operation'] },
  };

  it('lists what the statement demands, above the solution', () => {
    const doc = docFromSolution(SD_REQ);
    const card = doc.sections.find(s => s.id === 'mandates')!;
    expect(card.heading).toBe('What the statement demands');
    expect(card.blocks[0]).toEqual({
      kind: 'list',
      items: ['Must run in O(n) time', 'Without using the division operation'],
    });
    const order = doc.sections.map(s => s.id);
    expect(order.indexOf('mandates')).toBeLessThan(order.indexOf('comparison'));
  });

  it('marks the rows that break one, and only those', () => {
    const block = docFromSolution(SD_REQ).sections.find(s => s.id === 'comparison')!.blocks[0];
    if (block.kind !== 'matrix') throw new Error('expected a matrix');
    expect(block.rows.map(r => r.violates)).toEqual([
      ['O(n) time — this is O(n^2)'],
      ['Follow-up O(1) extra space — allocates two n-sized arrays'],
      undefined,
    ]);
  });

  it('names the broken requirement in the code header', () => {
    const [, body] = complexityBeat(SD_REQ, 1)!;
    expect(body).toContain('Does not meet the statement —');
    expect(body).toContain('  Follow-up O(1) extra space — allocates two n-sized arrays');
  });

  // Answers cached before the field existed must read as "meets everything",
  // not as a wall of warnings on every row.
  it('says nothing when the backend supplied no check', () => {
    const old = { solutions: [{ name: 'A', complexity: { time: 'O(n)' } }, { name: 'B', complexity: { time: 'O(n^2)' } }] };
    const block = docFromSolution(old).sections.find(s => s.id === 'comparison')!.blocks[0];
    if (block.kind !== 'matrix') throw new Error('expected a matrix');
    expect(block.rows.every(r => r.violates === undefined)).toBe(true);
    expect(complexityBeat(old)![1]).not.toContain('Does not meet');
  });

  it('has no card when the statement demands nothing', () => {
    const doc = docFromSolution({ solutions: [{ complexity: { time: 'O(n)' } }], interview: { requirements: [] } });
    expect(doc.sections.find(s => s.id === 'mandates')).toBeUndefined();
  });
});
