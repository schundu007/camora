import { describe, it, expect } from 'vitest';
import { deriveStarterCode, deriveSnippets } from '../scripts/lib/deriveStarterCode.js';

// LeetCode withholds codeSnippets for paid-only questions, so 781 premium problems
// reached the solver with no template. buildCodingSystemPrompt() reads a missing
// template as "I/O contract unknown" and instructs the model to invent a shape —
// which is why Design Hit Counter came back as a loose function instead of the
// `class HitCounter` the grader calls. These stubs are rebuilt from the reference
// solution's signatures, so getting a signature wrong is worse than emitting none.

const PY_DESIGN = `class HitCounter:

    def __init__(self):
        self.ts = []

    def hit(self, timestamp: int) -> None:
        self.ts.append(timestamp)

    def getHits(self, timestamp: int) -> int:
        return len(self.ts) - bisect_left(self.ts, timestamp - 300 + 1)


# Your HitCounter object will be instantiated and called as such:
# obj = HitCounter()
# obj.hit(timestamp)`;

const JAVA_DESIGN = `class HitCounter {
    private List<Integer> ts = new ArrayList<>();

    public HitCounter() {
    }

    public void hit(int timestamp) {
        ts.add(timestamp);
    }

    private int search(int x) {
        int l = 0;
        while (l < 1) { l++; }
        return l;
    }
}`;

const CPP_DESIGN = `class HitCounter {
public:
    HitCounter() {

    }

    void hit(int timestamp) {
        ts.push_back(timestamp);
    }

private:
    vector<int> ts;
};`;

describe('deriveStarterCode — python', () => {
  const stub = deriveStarterCode(PY_DESIGN, 'python3');

  it('keeps every public signature verbatim', () => {
    expect(stub).toContain('class HitCounter:');
    expect(stub).toContain('def __init__(self):');
    expect(stub).toContain('def hit(self, timestamp: int) -> None:');
    expect(stub).toContain('def getHits(self, timestamp: int) -> int:');
  });

  it('removes the implementation', () => {
    expect(stub).not.toContain('self.ts = []');
    expect(stub).not.toContain('bisect_left');
    expect(stub).not.toContain('append');
  });

  it('keeps the usage comment LeetCode appends', () => {
    expect(stub).toContain('# obj = HitCounter()');
  });

  it('drops imports, which never appear in a LeetCode python stub', () => {
    const s = deriveStarterCode('from typing import List\n\nclass Solution:\n    def f(self) -> int:\n        return 1', 'python3');
    expect(s).not.toContain('import');
    expect(s).toContain('def f(self) -> int:');
  });

  // Regression: trimming the output removed the indented blank body when the last
  // member was the last line, leaving `def f():` with no body — a SyntaxError.
  it('always leaves a body under the final signature', () => {
    const s = deriveStarterCode('class Solution:\n    def twoSum(self, nums, target):\n        return []', 'python3');
    expect(s.endsWith(':')).toBe(false);
    expect(s.split('\n').at(-1).trim()).toBe('');
  });

  it('handles a signature split across lines', () => {
    const s = deriveStarterCode(
      'class Solution:\n    def f(\n        self,\n        nums: List[int],\n    ) -> int:\n        return 0',
      'python3');
    expect(s).toContain('nums: List[int],');
    expect(s).not.toContain('return 0');
  });

  it('drops the author\'s private helpers', () => {
    const s = deriveStarterCode('class Solution:\n    def f(self):\n        return self._g()\n\n    def _g(self):\n        return 1', 'python3');
    expect(s).toContain('def f(self):');
    expect(s).not.toContain('_g');
  });
});

describe('deriveStarterCode — brace languages', () => {
  it('empties java bodies and drops private members and fields', () => {
    const stub = deriveStarterCode(JAVA_DESIGN, 'java');
    expect(stub).toContain('public HitCounter() {');
    expect(stub).toContain('public void hit(int timestamp) {');
    expect(stub).not.toContain('ts.add');
    expect(stub).not.toContain('search');           // private helper
    expect(stub).not.toContain('new ArrayList<>');  // private field
  });

  it('keeps the public section of a c++ class and drops the private one', () => {
    const stub = deriveStarterCode(CPP_DESIGN, 'cpp');
    expect(stub).toContain('public:');
    expect(stub).toContain('void hit(int timestamp) {');
    expect(stub).not.toContain('push_back');
    expect(stub).not.toContain('vector<int> ts;');
    expect(stub).not.toContain('private:');
    expect(stub.trimEnd().endsWith('};')).toBe(true);
  });

  // Regression: JSDoc carries braces of its own (`@param {number[]} nums`), and
  // treating one as a body rewrote the doc block into nonsense.
  it('does not mistake a JSDoc type annotation for a function body', () => {
    const src = `/**
 * @param {number[]} nums
 * @return {number}
 */
var f = function (nums) {
    return 1;
};`;
    const stub = deriveStarterCode(src, 'javascript');
    expect(stub).toContain('@param {number[]} nums');
    expect(stub).toContain('@return {number}');
    expect(stub).not.toContain('return 1;');
  });

  it('does not treat a brace inside a string as a body', () => {
    const stub = deriveStarterCode('function f(): string {\n    return "{";\n}', 'typescript');
    expect(stub).toContain('function f(): string {');
    expect(stub).not.toContain('return "{"');
  });

  it('returns null when there is no function to stub', () => {
    expect(deriveStarterCode('const x = 1;', 'typescript')).toBeNull();
  });
});

describe('deriveStarterCode — refusals', () => {
  it('returns null rather than guessing for unknown languages', () => {
    expect(deriveStarterCode('SELECT 1', 'mysql')).toBeNull();
    expect(deriveStarterCode('x', 'brainfuck')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(deriveStarterCode('', 'python3')).toBeNull();
    expect(deriveStarterCode(null, 'python3')).toBeNull();
  });
});

describe('deriveSnippets', () => {
  it('builds one entry per language in code_snippets shape', () => {
    const snips = deriveSnippets([{ title: 'S1', explanation: '', code: { python3: PY_DESIGN, java: JAVA_DESIGN } }]);
    expect(snips.map(s => s.langSlug).sort()).toEqual(['java', 'python3']);
    const py = snips.find(s => s.langSlug === 'python3');
    expect(py.lang).toBe('Python3');
    expect(py.code).toContain('def getHits');
  });

  it('takes the first approach that yields a stub for a language', () => {
    const snips = deriveSnippets([
      { title: 'S1', explanation: '', code: { python3: 'x = 1' } },       // unstubattable
      { title: 'S2', explanation: '', code: { python3: PY_DESIGN } },
    ]);
    expect(snips).toHaveLength(1);
    expect(snips[0].code).toContain('class HitCounter:');
  });

  it('returns an empty list when nothing can be derived', () => {
    expect(deriveSnippets([{ title: 'S', explanation: '', code: { mysql: 'SELECT 1' } }])).toEqual([]);
    expect(deriveSnippets(null)).toEqual([]);
  });
});
