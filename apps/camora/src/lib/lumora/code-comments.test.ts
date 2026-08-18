import { describe, it, expect } from 'vitest';
import { annotateSolutionCode, commentTokenFor, prependWalkthrough } from './code-comments';

const PY = [
  'class HitCounter:',
  '    def __init__(self):',
  '        self.hits = []',
  '',
  '    def getHits(self, timestamp):',
  '        return sum(1 for t in self.hits if t > timestamp - 300)',
].join('\n');

const EX = [
  { line: 3, code: 'self.hits = []', explanation: 'unbounded list holding every hit ever recorded' },
  { line: 5, code: 'def getHits(self, timestamp):', explanation: 'recomputes the answer from scratch each call' },
  { line: 6, code: 'return sum(1 for t in self.hits if t > timestamp - 300)', explanation: 'counts timestamps within the last 300 seconds' },
];

describe('commentTokenFor', () => {
  it('follows the language', () => {
    expect(commentTokenFor('python')).toBe('#');
    expect(commentTokenFor('java')).toBe('//');
    expect(commentTokenFor('sql')).toBe('--');
  });

  // 'auto' is a real value of the Coding tab's language select, so it reaches
  // here on every solve where the user never picked a language.
  it('falls back to the source shape when the language is auto', () => {
    expect(commentTokenFor('auto', PY)).toBe('#');
    expect(commentTokenFor('', 'function f(a) {\n  return a;\n}')).toBe('//');
  });
});

describe('annotateSolutionCode', () => {
  it('appends each explanation to the line it names', () => {
    const out = annotateSolutionCode(PY, EX, 'python').split('\n');
    expect(out[2]).toBe('        self.hits = []  # unbounded list holding every hit ever recorded');
    expect(out[4]).toBe('    def getHits(self, timestamp):  # recomputes the answer from scratch each call');
    expect(out[5]).toContain('  # counts timestamps within the last 300 seconds');
  });

  it('leaves blank lines and unmatched entries alone', () => {
    const out = annotateSolutionCode(PY, EX, 'python').split('\n');
    expect(out[3]).toBe('');
    expect(out[0]).toBe('class HitCounter:');
  });

  it('is a no-op without explanations', () => {
    expect(annotateSolutionCode(PY, [], 'python')).toBe(PY);
    expect(annotateSolutionCode(PY, undefined, 'python')).toBe(PY);
  });

  // The model's line numbers drift when it reflows the code; the quoted line
  // does not, so the quote decides and the number only breaks ties.
  it('prefers the quoted line over a stale line number', () => {
    const out = annotateSolutionCode(PY, [
      { line: 1, code: 'self.hits = []', explanation: 'the store' },
    ], 'python');
    expect(out.split('\n')[2]).toContain('# the store');
    expect(out.split('\n')[0]).toBe('class HitCounter:');
  });

  it('never puts two explanations on one line', () => {
    const out = annotateSolutionCode('a = 1\nb = 2', [
      { code: 'a = 1', explanation: 'first' },
      { code: 'a = 1', explanation: 'second' },
    ], 'python');
    expect(out.split('\n')[0]).toBe('a = 1  # first');
    expect(out.split('\n')[1]).toBe('b = 2  # second');
  });

  // The whole reason this is not done by the model: a marker dropped inside a
  // docstring is not a comment, it is program text.
  it('skips lines inside a docstring', () => {
    const src = 'def f():\n    """\n    notes\n    """\n    return 1';
    const out = annotateSolutionCode(src, [
      { line: 3, code: 'notes', explanation: 'should not land here' },
      { line: 5, code: 'return 1', explanation: 'the answer' },
    ], 'python');
    expect(out).toContain('    notes\n');
    expect(out).not.toContain('notes  #');
    expect(out).toContain('    return 1  # the answer');
  });

  it('skips a line that already carries a comment', () => {
    const out = annotateSolutionCode('x = 1  # given', [
      { line: 1, code: 'x = 1  # given', explanation: 'mine' },
    ], 'python');
    expect(out).toBe('x = 1  # given');
  });

  it('is not fooled by a marker inside a string', () => {
    const out = annotateSolutionCode('s = "#1"', [
      { line: 1, code: 's = "#1"', explanation: 'label' },
    ], 'python');
    expect(out).toBe('s = "#1"  # label');
  });

  it('skips an explicit line continuation', () => {
    const src = 'total = 1 + \\\n    2';
    const out = annotateSolutionCode(src, [
      { line: 1, code: 'total = 1 + \\', explanation: 'continues' },
    ], 'python');
    expect(out).toBe(src);
  });

  // Balanced brackets survive — "O(1)" is most of what these comments say.
  it('keeps balanced brackets and drops quote characters', () => {
    const out = annotateSolutionCode('print(x)', [
      { line: 1, code: 'print(x)', explanation: 'shows x (finally), not "y" — O(1)' },
    ], 'python');
    expect(out).toBe('print(x)  # shows x (finally), not y — O(1)');
  });

  // The runner's module-level print stripper balances parens character by
  // character over the whole file, so a stray one would make it miscount.
  it('drops brackets that do not balance', () => {
    const out = annotateSolutionCode('print(x)', [
      { line: 1, code: 'print(x)', explanation: 'window is timestamp - 300, i.e. (last 300s' },
    ], 'python');
    expect(out).toBe('print(x)  # window is timestamp - 300, i.e. last 300s');
  });

  it('collapses newlines and caps runaway explanations', () => {
    const out = annotateSolutionCode('x = 1', [
      { line: 1, code: 'x = 1', explanation: `a\nb ${'long '.repeat(40)}` },
    ], 'python');
    expect(out.split('\n')).toHaveLength(1);
    expect(out.length).toBeLessThan(110);
    expect(out.endsWith('…')).toBe(true);
  });

  it('uses // for c-family code', () => {
    const out = annotateSolutionCode('let a = 1;', [
      { line: 1, code: 'let a = 1;', explanation: 'seed' },
    ], 'javascript');
    expect(out).toBe('let a = 1;  // seed');
  });

  it('does not comment inside a template literal', () => {
    const src = 'const s = `\nline\n`;\nreturn s;';
    const out = annotateSolutionCode(src, [
      { line: 2, code: 'line', explanation: 'nope' },
      { line: 4, code: 'return s;', explanation: 'yes' },
    ], 'javascript');
    expect(out).toContain('\nline\n');
    expect(out).toContain('return s;  // yes');
  });
});

describe('prependWalkthrough', () => {
  const BEATS: [string, string][] = [
    ['Approach', 'Use a stack to track the closing bracket we expect next.'],
    ['Complexity', 'O(n) time because each character is pushed and popped once.'],
  ];

  it('writes the beats above the code, labelled', () => {
    const out = prependWalkthrough('def f():\n    return 1', BEATS, 'python');
    const lines = out.split('\n');
    expect(lines[0]).toBe('# APPROACH');
    expect(out).toContain('# COMPLEXITY');
    expect(out).toContain('def f():');
    expect(out.indexOf('APPROACH')).toBeLessThan(out.indexOf('def f():'));
  });

  it('separates beats with a blank comment line and the code with a blank line', () => {
    const out = prependWalkthrough('x = 1', BEATS, 'python');
    expect(out).toContain('#\n# COMPLEXITY');
    expect(out).toMatch(/\n\nx = 1$/);
  });

  it('wraps long prose instead of running off the pane', () => {
    const long: [string, string][] = [['Walkthrough', 'word '.repeat(60).trim()]];
    const out = prependWalkthrough('x = 1', long, 'python');
    for (const line of out.split('\n')) expect(line.length).toBeLessThanOrEqual(82);
  });

  it('uses the language comment marker', () => {
    expect(prependWalkthrough('let a = 1;', BEATS, 'javascript')).toContain('// APPROACH');
  });

  it('is a no-op without beats', () => {
    expect(prependWalkthrough('x = 1', [], 'python')).toBe('x = 1');
    expect(prependWalkthrough('x = 1', undefined, 'python')).toBe('x = 1');
  });
});

describe('prependWalkthrough is idempotent', () => {
  const A: [string, string][] = [['Approach', 'Sort descending and index in.']];
  const B: [string, string][] = [
    ['Approach', 'Sort descending and index in.'],
    ['Complexity', 'O(n log n) for the sort.'],
  ];

  // The beats stream in, so a second call with a fuller set is legitimate —
  // it must replace the header, never stack a second one on top.
  it('replaces an existing header rather than stacking', () => {
    const once = prependWalkthrough('nums.sort()', A, 'python');
    const twice = prependWalkthrough(once, B, 'python');
    expect(twice.match(/# APPROACH/g)).toHaveLength(1);
    expect(twice).toContain('# COMPLEXITY');
    expect(twice).toContain('nums.sort()');
  });

  it('re-applying the same beats changes nothing', () => {
    const once = prependWalkthrough('x = 1', B, 'python');
    expect(prependWalkthrough(once, B, 'python')).toBe(once);
  });

  // A starter template's own comments have no ALL-CAPS label line.
  it("leaves a starter template's own comments alone", () => {
    const starter = '# Complete the function below\n# Do not modify the driver\ndef solve(n):\n    pass';
    const out = prependWalkthrough(starter, A, 'python');
    expect(out).toContain('# Complete the function below');
    expect(out).toContain('# Do not modify the driver');
    expect(out.match(/# APPROACH/g)).toHaveLength(1);
  });
});
