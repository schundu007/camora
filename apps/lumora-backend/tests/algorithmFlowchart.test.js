import { describe, it, expect } from 'vitest';
import { NODES, ROOT, isLeaf, validatePath, renderTreeForPrompt, leafTechniques } from '../src/lib/algorithmFlowchart.js';

// The identification trail is shown to a candidate who will repeat it to an
// interviewer, so an invented or skipped step is worse than showing nothing.
// validatePath is the gate: the model proposes a walk, the chart decides.

describe('chart shape', () => {
  it('is a single tree rooted at the graph question', () => {
    expect(NODES[ROOT].q).toBe('Is it a graph?');
    const targets = new Set();
    for (const n of Object.values(NODES)) {
      if (n.yes) targets.add(n.yes);
      if (n.no) targets.add(n.no);
    }
    const roots = Object.keys(NODES).filter(id => !targets.has(id));
    expect(roots).toEqual([ROOT]);
  });

  it('every branch points at a node that exists', () => {
    for (const [id, n] of Object.entries(NODES)) {
      for (const branch of ['yes', 'no']) {
        if (n[branch]) expect(NODES[n[branch]], `${id}.${branch}`).toBeDefined();
      }
    }
  });

  it('every decision node carries cues for reading a statement', () => {
    const missing = Object.entries(NODES)
      .filter(([, n]) => n.q && !n.cues)
      .map(([id]) => id);
    expect(missing).toEqual([]);
  });

  it('separates decision nodes from technique leaves', () => {
    expect(isLeaf('graph')).toBe(false);
    expect(isLeaf('connectivity-dsu')).toBe(true);
    expect(NODES['connectivity-dsu'].technique).toBe('Disjoint Set Union');
    expect(leafTechniques()).toContain("Dijkstra's Algorithm");
  });
});

describe('validatePath', () => {
  // The exact walk from the flowchart link: graph yes, tree no, DAG no,
  // shortest-path no, connectivity no, small constraints yes.
  const GOOD = [
    { node: 'graph', answer: 'yes', evidence: 'grid, move to 4 adjacent cells' },
    { node: 'tree', answer: 'no', evidence: 'cells can revisit — cycles exist' },
    { node: 'directed-graph', answer: 'no', evidence: 'movement is symmetric' },
    { node: 'shortest-path', answer: 'no', evidence: 'asks for all paths, not the shortest' },
    { node: 'connectivity', answer: 'no', evidence: 'no components or islands asked for' },
    { node: 'graph-smallcontraints', answer: 'yes', evidence: 'grid is at most 10 x 10' },
  ];

  it('accepts a real root-to-leaf walk and names the leaf technique', () => {
    const v = validatePath(GOOD);
    expect(v.ok).toBe(true);
    expect(v.technique).toBe('DFS/backtracking');
    expect(v.steps).toHaveLength(6);
  });

  it('takes the question text from the chart, not from the model', () => {
    const v = validatePath([{ node: 'graph', answer: 'no', evidence: 'plain array', question: 'Totally made up?' }]);
    expect(v.steps[0].question).toBe('Is it a graph?');
  });

  it('keeps the evidence the model supplied', () => {
    expect(validatePath(GOOD).steps[0].evidence).toBe('grid, move to 4 adjacent cells');
  });

  it('rejects a walk that does not start at the root', () => {
    const v = validatePath([{ node: 'connectivity', answer: 'yes' }]);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/expected graph/);
  });

  it('rejects a skipped node', () => {
    const v = validatePath([
      { node: 'graph', answer: 'yes' },
      { node: 'shortest-path', answer: 'yes' },   // skips `tree` and `directed-graph`
    ]);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/expected tree/);
  });

  it('rejects an invented node id', () => {
    const v = validatePath([{ node: 'is-it-vibes', answer: 'yes' }]);
    expect(v.ok).toBe(false);
  });

  it('rejects an answer that is not yes or no', () => {
    const v = validatePath([{ node: 'graph', answer: 'maybe' }]);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/answered/);
  });

  it('rejects a walk that stops before reaching a technique', () => {
    const v = validatePath([{ node: 'graph', answer: 'yes' }]);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/without a conclusion/);
  });

  it('rejects an empty path', () => {
    expect(validatePath([]).ok).toBe(false);
    expect(validatePath(null).ok).toBe(false);
  });

  // Four nodes in the chart have only one branch; a walk that answers the
  // missing side ends there legitimately rather than being thrown away.
  it('ends cleanly on a branch the chart does not model', () => {
    const v = validatePath([
      { node: 'graph', answer: 'no', evidence: 'plain array' },
      { node: 'sorted-search', answer: 'no', evidence: 'unsorted' },
      { node: 'kth-smallest', answer: 'no', evidence: 'no k' },
      { node: 'linked-list', answer: 'no', evidence: 'no list' },
      { node: 'hash-table', answer: 'no', evidence: 'no lookups' },
      { node: 'intervals', answer: 'no', evidence: 'no ranges' },
      { node: 'partition-array', answer: 'no', evidence: 'no partitioning' },
      { node: 'string-segmentation', answer: 'no', evidence: 'no dictionary' },
      { node: 'small-constraints', answer: 'no', evidence: 'n up to 1e5' },
      { node: 'sums', answer: 'no', evidence: 'not additive' },
      { node: 'subarrays', answer: 'no', evidence: 'not contiguous' },
      { node: 'max/min', answer: 'no', evidence: 'not an optimisation' },
      { node: 'counting', answer: 'no', evidence: 'not counting ways' },
      { node: 'sequence-count', answer: 'no', evidence: 'single sequence' },
      { node: 'find-indices', answer: 'yes', evidence: 'count pairs i < j' },
      { node: 'find-indices-monotonic', answer: 'no', evidence: 'no monotonic property' },
    ]);
    expect(v.ok).toBe(true);
    expect(v.technique).toBeNull();
  });
});

describe('renderTreeForPrompt', () => {
  const rendered = renderTreeForPrompt();

  it('emits one line per decision node and none for leaves', () => {
    const decisions = Object.values(NODES).filter(n => n.q).length;
    expect(rendered.split('\n')).toHaveLength(decisions);
    expect(rendered).not.toContain('Disjoint Set Union |');
  });

  it('carries the branch targets and cues the model needs', () => {
    const line = rendered.split('\n').find(l => l.startsWith('connectivity |'));
    expect(line).toContain('yes->connectivity-dsu');
    expect(line).toContain('no->graph-smallcontraints');
    expect(line).toContain('island');
  });
});
