import { describe, it, expect } from 'vitest';
import { docFromSolution, docFromBlocks } from './book-model';

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
