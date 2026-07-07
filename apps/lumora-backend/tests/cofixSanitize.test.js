import { describe, it, expect } from 'vitest';
import { stripInjectedComments, sanitizeCofixResult } from '../src/routes/coding.js';

describe('CoFix output sanitizer — strips model chain-of-thought comments', () => {
  it('removes a trailing block of reasoning comments but keeps the code', () => {
    const code = [
      'def find_second_largest(n, scores):',
      '    unique_scores = sorted(list(set(scores)))',
      '    if len(unique_scores) < 2:',
      '        return None',
      '    return unique_scores[-2]',
      '# The problem description implicitly defines find_second_largest.',
      '# The NameError in the traceback indicates the test runner...',
      '# For the given test the function definition is sufficient.',
    ].join('\n');
    const { code: out } = stripInjectedComments(code, 'python');
    expect(out).not.toMatch(/^\s*#/m);
    expect(out).toContain('return unique_scores[-2]');
    expect(out.split('\n')).toHaveLength(5);
  });

  it('never strips a # that lives inside a triple-quoted string', () => {
    const code = [
      'def f(x):',
      '    """',
      '    # this is data, not a comment',
      '    """',
      '    return x',
    ].join('\n');
    const { code: out, lineMap } = stripInjectedComments(code, 'python');
    expect(out).toContain('# this is data, not a comment');
    expect(lineMap).toBeNull(); // nothing removed
  });

  it('keeps // inside a JS template literal, drops a dumped // note', () => {
    const code = [
      'function h() {',
      '// dumped note',
      '  const s = `',
      '// not a comment inside template',
      '`;',
      '  return s;',
      '}',
    ].join('\n');
    const { code: out } = stripInjectedComments(code, 'javascript');
    expect(out).toContain('// not a comment inside template');
    expect(out).not.toContain('// dumped note');
  });

  it('preserves a shebang line', () => {
    const code = '#!/usr/bin/env python3\nx = 1\n# junk note\nprint(x)';
    const { code: out } = stripInjectedComments(code, 'python');
    expect(out).toContain('#!/usr/bin/env python3');
    expect(out).not.toContain('# junk note');
  });

  it('remaps changes[] and walkthrough[] line numbers after removal', () => {
    const parsed = {
      fixed_code: 'def g(a):\n# injected reasoning\n    return a + 1',
      changes: [{ line: 3, badge: 1, type: 'fix', label: 'x', note: 'y' }],
      walkthrough: [{ lines: '3', text: 'I return a+1' }],
    };
    sanitizeCofixResult(parsed, 'python');
    expect(parsed.fixed_code).toBe('def g(a):\n    return a + 1');
    expect(parsed.changes[0].line).toBe(2); // line 3 -> 2 after removing line 2
    expect(parsed.walkthrough[0].lines).toBe('2');
  });

  it('leaves clean code (no injected comments) untouched', () => {
    const parsed = { fixed_code: 'def g(a):\n    return a + 1', changes: [], walkthrough: [] };
    const before = parsed.fixed_code;
    sanitizeCofixResult(parsed, 'python');
    expect(parsed.fixed_code).toBe(before);
  });
});
