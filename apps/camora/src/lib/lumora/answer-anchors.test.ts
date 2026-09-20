import { describe, it, expect } from 'vitest';
import { parseAnchors } from './answer-anchors';

describe('parseAnchors', () => {
  it('splits an anchor line into its anchor and its first child', () => {
    const [b] = parseAnchors('**In short** — kubectl apply persists desired state.');
    expect(b).toEqual({
      kind: 'anchor',
      anchor: 'In short',
      lines: [{ text: 'kubectl apply persists desired state.' }],
      ordered: false,
    });
  });

  it('numbers a block whose children each name their own step', () => {
    const [b] = parseAnchors([
      '**The path**',
      '- **kubectl apply** — reads main.yaml locally.',
      '- **HTTP POST** — sends the YAML to the API server.',
      '- **API server** — authenticates, authorizes, validates.',
    ].join('\n'));
    expect(b.kind === 'anchor' && b.ordered).toBe(true);
    expect(b.kind === 'anchor' && b.lines.map((l) => l.n)).toEqual([1, 2, 3]);
  });

  it('leaves a prose block unnumbered', () => {
    const [b] = parseAnchors([
      '**The catch**',
      '- kubectl apply is declarative.',
      "- It doesn't execute steps like a script.",
      '- Controllers reconcile continuously.',
    ].join('\n'));
    expect(b.kind === 'anchor' && b.ordered).toBe(false);
    expect(b.kind === 'anchor' && b.lines.every((l) => l.n === undefined)).toBe(true);
  });

  it('does not number two steps — numbering that short adds chrome, not orientation', () => {
    const [b] = parseAnchors([
      '**The path**',
      '- **One** — first.',
      '- **Two** — second.',
    ].join('\n'));
    expect(b.kind === 'anchor' && b.ordered).toBe(false);
  });

  it('keeps each anchor separate and in order', () => {
    const blocks = parseAnchors([
      '**In short** — the answer.',
      '**The path** — a step.',
      '**The catch** — a warning.',
    ].join('\n'));
    expect(blocks.map((b) => b.kind === 'anchor' && b.anchor)).toEqual(['In short', 'The path', 'The catch']);
  });

  it('carries a lead paragraph that arrives before any anchor', () => {
    const blocks = parseAnchors('A direct answer with no anchor.\n**In short** — then this.');
    expect(blocks[0]).toEqual({ kind: 'prose', lines: [{ text: 'A direct answer with no anchor.' }] });
    expect(blocks[1].kind).toBe('anchor');
  });

  it('does not eat a bolded phrase that is mid-sentence', () => {
    // The regex anchors to start-of-line and requires the dash, so an emphasised
    // term inside a sentence stays part of the sentence.
    const blocks = parseAnchors('The **API server** validates the schema before the write.');
    expect(blocks[0].kind).toBe('prose');
    expect(blocks[0].lines[0].text).toContain('**API server**');
  });

  it('survives an empty answer and a whitespace-only one', () => {
    expect(parseAnchors('')).toEqual([]);
    expect(parseAnchors('   \n\n  ')).toEqual([]);
  });
});

describe('parseAnchors — list provenance', () => {
  it('remembers that an anchorless line arrived as a bullet', () => {
    const [b] = parseAnchors('- first bullet\n- second bullet');
    expect(b.kind).toBe('prose');
    expect(b.lines).toEqual([
      { text: 'first bullet', bullet: true },
      { text: 'second bullet', bullet: true },
    ]);
  });

  it('does not mark a plain sentence as a bullet', () => {
    const [b] = parseAnchors('A direct answer.');
    expect(b.lines[0].bullet).toBeUndefined();
  });
});
