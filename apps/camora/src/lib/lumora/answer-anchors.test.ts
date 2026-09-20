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

describe('parseAnchors — what the rail declines', () => {
  it('keeps an interviewer follow-up question out of the rail', () => {
    // "### If they push" emits `**<question>** — <reply>`. A whole question set
    // as a rail label wraps across three lines; it belongs in the body.
    const [b] = parseAnchors('**What about HTTP/3 and QUIC?** — QUIC over UDP cuts handshake time.');
    expect(b.kind).toBe('prose');
    expect(b.lines[0].text).toContain('**What about HTTP/3 and QUIC?**');
  });

  it('keeps a long lead-in out of the rail', () => {
    const [b] = parseAnchors('**A lead-in far longer than three words and then some** — body.');
    expect(b.kind).toBe('prose');
  });

  it('still rails a short anchor', () => {
    const [b] = parseAnchors('**The path** — a step.');
    expect(b.kind).toBe('anchor');
  });
});

// Both screenshots that came back from production, as regression cases.
describe('parseAnchors — what production actually sent', () => {
  it('folds a model\'s own numbered steps into the anchor above them', () => {
    // The model numbered its own path, so every step arrived as its own anchor
    // line. Each became a rail row, and "3. Authentication/Authorization" ran
    // out of the column and onto the text beside it.
    const blocks = parseAnchors([
      '**The path**',
      '**1. `kubectl apply`** — reads your YAML manifest.',
      '**2. API request** — kubectl converts YAML to JSON.',
      '**3. Authentication/Authorization** — API server checks your credentials.',
    ].join('\n'));
    expect(blocks).toHaveLength(1);
    const b = blocks[0];
    expect(b.kind === 'anchor' && b.anchor).toBe('The path');
    expect(b.kind === 'anchor' && b.ordered).toBe(true);
    expect(b.kind === 'anchor' && b.lines.map((l) => l.n)).toEqual([1, 2, 3]);
    // Our numbering replaces the model's, rather than printing "3." beside a 3.
    expect(b.kind === 'anchor' && b.lines[2].text).toContain('**Authentication/Authorization**');
    expect(b.kind === 'anchor' && b.lines[2].text).not.toContain('3.');
  });

  it('never puts a backtick in a rail label', () => {
    // The label is CSS-uppercased, so a code span in it rendered as SHOUTING
    // CODE with the ticks showing.
    const [b] = parseAnchors('**`kubectl apply`** — reads the manifest.');
    expect(b.kind === 'anchor' && b.anchor).toBe('kubectl apply');
  });
});

describe('parseAnchors — a bare anchor is a header', () => {
  it('nests the hops under a lone **The path** and numbers them', () => {
    // Without this each hop became its own rail row: eighteen labels, no
    // numbers, and no way to see it was one sequence.
    const blocks = parseAnchors([
      '**The path**',
      '**kubectl** — reads the file, converts YAML to JSON.',
      '**apiserver** — authenticates, authorizes, runs admission.',
      '**etcd** — the object is persisted; nothing is running yet.',
    ].join('\n'));
    expect(blocks).toHaveLength(1);
    const b = blocks[0];
    expect(b.kind === 'anchor' && b.anchor).toBe('The path');
    expect(b.kind === 'anchor' && b.ordered).toBe(true);
    expect(b.kind === 'anchor' && b.lines.map((l) => l.n)).toEqual([1, 2, 3]);
    // The lead-in survives, so it still renders bold inside the step.
    expect(b.kind === 'anchor' && b.lines[0].text).toContain('**kubectl**');
  });

  it('keeps anchors that carry their own content as siblings', () => {
    // A skeleton is not a sequence: "In short" and "The catch" each say
    // something on their own line, so neither adopts the other.
    const blocks = parseAnchors([
      '**In short** — the answer.',
      '**The catch** — a warning.',
      '**In practice** — what I do.',
    ].join('\n'));
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.kind === 'anchor')).toBe(true);
  });
});

describe('parseAnchors — where a header stops adopting', () => {
  it('a blank line ends the walk, so the next anchor is its own row', () => {
    const blocks = parseAnchors([
      '**The path**',
      '**kubectl** — reads the file.',
      '**apiserver** — validates it.',
      '',
      '**The catch** — it is declarative.',
    ].join('\n'));
    expect(blocks.map((b) => b.kind === 'anchor' && b.anchor)).toEqual(['The path', 'The catch']);
    expect(blocks[0].kind === 'anchor' && blocks[0].lines).toHaveLength(2);
  });
});

describe('parseAnchors — only a walk gets numbered', () => {
  const withLeads = (anchor: string) => parseAnchors([
    `**${anchor}**`,
    '**Declarative vs. Imperative** — you define the desired state.',
    '**Admission** — mutating webhooks can alter the object.',
    '**Controllers** — the control loop reconciles continuously.',
  ].join('\n'))[0];

  it('numbers a path', () => {
    const b = withLeads('The path');
    expect(b.kind === 'anchor' && b.ordered).toBe(true);
  });

  it('does not number caveats that merely look like steps', () => {
    // Production sent exactly this: four caveats, each with a bold lead-in,
    // structurally identical to a nine-hop walk, numbered 1-4 as though the
    // reader should do them in order.
    const b = withLeads('The catch');
    expect(b.kind === 'anchor' && b.ordered).toBe(false);
  });

  it('recognises the other wordings the prompts use for a walk', () => {
    for (const a of ['How it flows', 'The steps', 'Request lifecycle']) {
      const b = withLeads(a);
      expect(b.kind === 'anchor' && b.ordered, a).toBe(true);
    }
  });
});
