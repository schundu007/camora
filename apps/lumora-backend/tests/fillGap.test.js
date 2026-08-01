import { describe, it, expect } from 'vitest';
import { detectGap, spliceFill, gapDirective } from '../src/services/fillGap.js';

// The scenario this exists for: interviewer hands over a long working file with
// one piece missing. Everything outside the hole must come back untouched.
const LONG_FILE = [
  'import json',
  'from dataclasses import dataclass',
  '',
  '',
  '@dataclass',
  'class Order:',
  '    id: int',
  '    total: float',
  '    status: str',
  '',
  '',
  'def load_orders(path):',
  '    with open(path) as f:',
  '        return [Order(**row) for row in json.load(f)]',
  '',
  '',
  'def total_revenue(orders):',
  '    return sum(o.total for o in orders if o.status == "paid")',
  '',
  '',
  'def orders_by_status(orders):',
  '    # TODO: group the orders into a dict keyed by status',
  '    pass',
  '',
  '',
  'def report(path):',
  '    orders = load_orders(path)',
  '    return {',
  '        "revenue": total_revenue(orders),',
  '        "by_status": orders_by_status(orders),',
  '    }',
].join('\n');

describe('detectGap', () => {
  it('finds an explicit TODO marker and the stub under it', () => {
    const gap = detectGap(LONG_FILE);
    expect(gap).not.toBeNull();
    expect(gap.kind).toBe('replace');
    // The marker line plus the `pass` beneath it are both placeholder.
    expect(LONG_FILE.split('\n')[gap.startLine - 1]).toMatch(/TODO/);
    expect(LONG_FILE.split('\n')[gap.endLine - 1]).toMatch(/pass/);
    expect(gap.what).toBe('function orders_by_status');
  });

  it('finds a bare stub body with no marker', () => {
    const gap = detectGap('def solve(n):\n    pass\n');
    expect(gap).toMatchObject({ startLine: 2, endLine: 2, kind: 'replace', what: 'function solve' });
  });

  it('finds raise NotImplementedError', () => {
    const gap = detectGap('class A:\n    def run(self):\n        raise NotImplementedError\n');
    expect(gap.kind).toBe('replace');
    expect(gap.what).toBe('function run');
  });

  it('finds a signature with no body at all', () => {
    const gap = detectGap('def helper(a, b):\n');
    expect(gap).toMatchObject({ kind: 'insert', what: 'function helper' });
  });

  it('returns null for a complete file — nothing to fill', () => {
    expect(detectGap('def add(a, b):\n    return a + b\n')).toBeNull();
  });

  it('does not treat a top-level bare `pass` as a gap', () => {
    expect(detectGap('x = 1\npass\n')).toBeNull();
  });
});

describe('spliceFill — preservation is structural, not prompted', () => {
  const gap = detectGap(LONG_FILE);
  const NEW_BODY = [
    '    grouped = {}',
    '    for o in orders:',
    '        grouped.setdefault(o.status, []).append(o)',
    '    return grouped',
  ];

  it('keeps every line outside the gap byte-for-byte, even when the model rewrites them', () => {
    // A deliberately badly-behaved answer: it "improved" unrelated code.
    const misbehaving = LONG_FILE
      .replace('def total_revenue(orders):\n    return sum(o.total for o in orders if o.status == "paid")',
               'def total_revenue(orders):\n    paid = [o for o in orders if o.status == "paid"]\n    return sum(o.total for o in paid)')
      .replace('    # TODO: group the orders into a dict keyed by status\n    pass', NEW_BODY.join('\n'));

    const filledStart = misbehaving.split('\n').findIndex(l => l.includes('grouped = {}')) + 1;
    const out = spliceFill({
      original: LONG_FILE,
      fixedCode: misbehaving,
      gap,
      filled: { start_line: filledStart, end_line: filledStart + NEW_BODY.length - 1 },
    });

    expect(out.preserved).toBe(true);
    // The unrelated "improvement" is gone — those lines came from the original.
    expect(out.code).toContain('    return sum(o.total for o in orders if o.status == "paid")');
    expect(out.code).not.toContain('paid = [o for o in orders');
    // The gap really was filled.
    expect(out.code).toContain('grouped.setdefault(o.status, []).append(o)');
    expect(out.code).not.toContain('TODO');
    // Every other line survives.
    for (const line of ['import json', '@dataclass', 'class Order:', 'def report(path):']) {
      expect(out.code).toContain(line);
    }
  });

  it('reports which lines it wrote, so the candidate can check before pasting', () => {
    const fixed = LONG_FILE.replace('    # TODO: group the orders into a dict keyed by status\n    pass', NEW_BODY.join('\n'));
    const start = fixed.split('\n').findIndex(l => l.includes('grouped = {}')) + 1;
    const out = spliceFill({ original: LONG_FILE, fixedCode: fixed, gap, filled: { start_line: start, end_line: start + 3 } });
    expect(out.filled.what).toBe('function orders_by_status');
    expect(out.code.split('\n').slice(out.filled.startLine - 1, out.filled.endLine)).toEqual(NEW_BODY);
  });

  it('derives the block when the model forgets to report its range', () => {
    const fixed = LONG_FILE.replace('    # TODO: group the orders into a dict keyed by status\n    pass', NEW_BODY.join('\n'));
    const out = spliceFill({ original: LONG_FILE, fixedCode: fixed, gap, filled: undefined });
    expect(out.preserved).toBe(true);
    expect(out.code).toContain('grouped.setdefault');
  });

  it('refuses to splice an empty block rather than deleting the stub', () => {
    // The model dropped the placeholder and wrote nothing in its place. Splicing
    // that would silently leave a hole in the file the candidate pastes back.
    const blanked = LONG_FILE.replace('    # TODO: group the orders into a dict keyed by status\n    pass', '\n');
    const out = spliceFill({ original: LONG_FILE, fixedCode: blanked, gap, filled: { start_line: gap.startLine, end_line: gap.startLine + 1 } });
    expect(out.preserved).toBe(false);
    expect(out.reason).toMatch(/empty block/);
  });

  it('strips a placeholder the model kept inside its own block', () => {
    // Models like to keep the interviewer's TODO as a doc comment above their
    // code, which leaves a file still advertising an unfinished hole.
    const kept = ['    # TODO: group the orders into a dict keyed by status', ...NEW_BODY];
    const fixed = LONG_FILE.replace('    # TODO: group the orders into a dict keyed by status\n    pass', kept.join('\n'));
    const start = fixed.split('\n').findIndex(l => l.includes('TODO')) + 1;
    const out = spliceFill({ original: LONG_FILE, fixedCode: fixed, gap, filled: { start_line: start, end_line: start + kept.length - 1 } });
    expect(out.preserved).toBe(true);
    expect(out.code).not.toContain('TODO');
    expect(out.code).toContain('grouped.setdefault');
  });

  it('inserts a body for a signature-only gap without eating the signature', () => {
    const src = 'def helper(a, b):\n';
    const g = detectGap(src);
    const out = spliceFill({ original: src, fixedCode: 'def helper(a, b):\n    return a + b\n', gap: g, filled: { start_line: 2, end_line: 2 } });
    expect(out.preserved).toBe(true);
    expect(out.code.split('\n')[0]).toBe('def helper(a, b):');
    expect(out.code).toContain('    return a + b');
  });
});

describe('gapDirective', () => {
  it('tells the model where the hole is and demands a range back', () => {
    const d = gapDirective(detectGap(LONG_FILE), LONG_FILE);
    expect(d).toMatch(/ALREADY BEEN LOCATED/);
    expect(d).toMatch(/orders_by_status/);
    expect(d).toMatch(/"filled"/);
  });

  it('is empty when there is no gap, so nothing is injected', () => {
    expect(gapDirective(null, 'x = 1')).toBe('');
  });
});
