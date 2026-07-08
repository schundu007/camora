import { describe, it, expect } from 'vitest';
import { langCandidates, pickHackerRankTemplate, pickLeetcodeSnippet } from '../src/routes/coding.js';

// The exact editor stub HackerRank's REST API returns for "Finding the Percentage".
const HR_PY3_TEMPLATE = `if __name__ == '__main__':
    n = int(input())
    student_marks = {}
    for _ in range(n):
        name, *line = input().split()
        scores = list(map(float, line))
        student_marks[name] = scores
    query_name = input()`;

// Shape mirrors the real REST `model`: per-language *_template fields + languages.
const hrModel = {
  languages: ['pypy3', 'python3'],
  default_language: null,
  python3_template: HR_PY3_TEMPLATE,
  python_template: '# py2 stub',
  pypy3_template: HR_PY3_TEMPLATE,
  java_template: 'public class Solution { }',
};

describe('langCandidates — language label → platform prefixes', () => {
  it('maps python to python3-first roots (py2 is EOL)', () => {
    expect(langCandidates('python')).toEqual(['python3', 'pypy3', 'python', 'pypy']);
  });
  it('maps cpp / c++ to cpp, and c to c only', () => {
    expect(langCandidates('cpp')).toEqual(['cpp']);
    expect(langCandidates('c++')).toEqual(['cpp']);
    expect(langCandidates('c')).toEqual(['c']);
  });
  it('falls back to the raw label for unknown languages, [] for empty', () => {
    expect(langCandidates('haskell')).toEqual(['haskell']);
    expect(langCandidates('')).toEqual([]);
    expect(langCandidates(undefined)).toEqual([]);
  });
});

describe('pickHackerRankTemplate — extract the editor stub the candidate must fill', () => {
  it('returns the python3 template verbatim for a python request', () => {
    expect(pickHackerRankTemplate(hrModel, 'python')).toBe(HR_PY3_TEMPLATE);
  });
  it('returns the java template for a java request', () => {
    expect(pickHackerRankTemplate(hrModel, 'java')).toBe('public class Solution { }');
  });
  it('matches a version-suffixed field when no exact <lang>_template exists', () => {
    // cpp requested, only cpp20_template present → version-suffixed fallback
    const m = { cpp20_template: 'int main(){}', languages: ['cpp20'] };
    expect(pickHackerRankTemplate(m, 'cpp')).toBe('int main(){}');
  });
  it('never confuses c with cpp/csharp — returns null rather than a wrong-language stub', () => {
    const m = { cpp_template: 'CPP', csharp_template: 'CS' };
    // No c_template and no c<digits>_template → null, NOT a cpp/csharp stub.
    expect(pickHackerRankTemplate(m, 'c')).toBeNull();
  });
  it('returns null for a language with no matching template (no wrong-language fallback)', () => {
    // HackerRank omits python templates for many problems; must not return a C stub.
    expect(pickHackerRankTemplate(hrModel, 'brainfuck')).toBeNull();
    expect(pickHackerRankTemplate({ c_template: 'int main(){}', java_template: 'X' }, 'python')).toBeNull();
  });
  it('returns null when no template fields are present', () => {
    expect(pickHackerRankTemplate({ problem_statement: 'x', languages: [] }, 'python')).toBeNull();
  });
});

describe('pickLeetcodeSnippet — pick the right codeSnippet by langSlug', () => {
  const snippets = [
    { lang: 'Python3', langSlug: 'python3', code: 'class Solution:\n    def f(self): pass' },
    { lang: 'Java', langSlug: 'java', code: 'class Solution { }' },
    { lang: 'C++', langSlug: 'cpp', code: 'class Solution { };' },
  ];
  it('returns the python3 snippet for a python request', () => {
    expect(pickLeetcodeSnippet(snippets, 'python')).toContain('class Solution:');
  });
  it('returns the cpp snippet for a cpp request', () => {
    expect(pickLeetcodeSnippet(snippets, 'cpp')).toBe('class Solution { };');
  });
  it('falls back to the first snippet for an unknown language', () => {
    expect(pickLeetcodeSnippet(snippets, 'ocaml')).toBe(snippets[0].code);
  });
  it('returns null for empty / missing snippets', () => {
    expect(pickLeetcodeSnippet([], 'python')).toBeNull();
    expect(pickLeetcodeSnippet(undefined, 'python')).toBeNull();
  });
});
