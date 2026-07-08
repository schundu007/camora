import { describe, it, expect } from 'vitest';
import {
  detectPlatformTemplate,
  templateHasFillableFunction,
  isMinimalInlineTemplate,
  buildTemplateShapeDirective,
  buildCodingSystemPrompt,
} from '../src/routes/coding.js';

// The confirmed HackerRank numpy "Zeros and Ones" editor template — a MINIMAL
// skeleton with NO function stub. The expected answer is inline stdin-read +
// numpy call + print, NOT a wrapper function.
const NUMPY_MINIMAL = 'import numpy\n';

// The confirmed HackerRank "count_substring" template — a function stub the
// candidate fills, plus a LOCKED __main__ harness that must be preserved.
const COUNT_SUBSTRING_STUB = [
  'def count_substring(string, sub_string):',
  '    return',
  '',
  "if __name__ == '__main__':",
  '    string = input().strip()',
  '    sub_string = input().strip()',
  '    count = count_substring(string, sub_string)',
  '    print(count)',
].join('\n');

describe('isMinimalInlineTemplate', () => {
  it('is TRUE for an imports-only numpy skeleton', () => {
    expect(isMinimalInlineTemplate(NUMPY_MINIMAL)).toBe(true);
    expect(isMinimalInlineTemplate('import numpy as np\nimport sys\n')).toBe(true);
    expect(isMinimalInlineTemplate('import numpy # keep this\n')).toBe(true);
  });
  it('is FALSE when there is real logic to run/fix', () => {
    expect(isMinimalInlineTemplate(COUNT_SUBSTRING_STUB)).toBe(false);
    expect(isMinimalInlineTemplate('import numpy\nprint(numpy.zeros(3))')).toBe(false);
    expect(isMinimalInlineTemplate('')).toBe(false);
  });
});

describe('templateHasFillableFunction', () => {
  it('is FALSE for a minimal imports-only template (→ inline completion)', () => {
    expect(templateHasFillableFunction(NUMPY_MINIMAL)).toBe(false);
  });
  it('is TRUE when the template defines a fillable function (→ fill the body)', () => {
    expect(templateHasFillableFunction(COUNT_SUBSTRING_STUB)).toBe(true);
    expect(templateHasFillableFunction('function solve(a){\n}')).toBe(true);
  });
  it('does NOT count a lone main() as a fillable function', () => {
    expect(templateHasFillableFunction('func main() {\n}')).toBe(false);
    expect(templateHasFillableFunction('if (x) {\n  y();\n}')).toBe(false);
  });
});

describe('detectPlatformTemplate', () => {
  it('triggers for a minimal imports-only numpy template', () => {
    expect(detectPlatformTemplate(NUMPY_MINIMAL)).toBe(true);
  });
  it('triggers for a function-stub + __main__ harness template', () => {
    expect(detectPlatformTemplate(COUNT_SUBSTRING_STUB)).toBe(true);
  });
  it('does NOT trigger for ordinary broken code', () => {
    expect(detectPlatformTemplate('def solution(n):\n  retrun n * 2')).toBe(false);
  });
});

describe('buildTemplateShapeDirective', () => {
  it('forbids inventing a wrapper for a minimal inline template', () => {
    const d = buildTemplateShapeDirective(NUMPY_MINIMAL);
    expect(d).toMatch(/NO function to fill/i);
    expect(d).toMatch(/DO NOT invent a wrapper function/i);
    expect(d).toMatch(/create_arrays/); // the exact anti-pattern we saw
  });
  it('instructs fill-the-body for a function-stub template', () => {
    const d = buildTemplateShapeDirective(COUNT_SUBSTRING_STUB);
    expect(d).toMatch(/DEFINES a function\/method to complete/i);
    expect(d).toMatch(/Fill ONLY its body/i);
  });
});

describe('buildCodingSystemPrompt threads the shape directive when starter code is present', () => {
  it('minimal numpy template → INLINE guidance, no invented function', () => {
    const p = buildCodingSystemPrompt('python', undefined, NUMPY_MINIMAL, true);
    expect(p).toMatch(/MINIMAL \/ INLINE skeleton/i);
    expect(p).toMatch(/DO NOT invent a wrapper function/i);
  });
  it('function-stub template → fill-the-body guidance', () => {
    const p = buildCodingSystemPrompt('python', undefined, COUNT_SUBSTRING_STUB, true);
    expect(p).toMatch(/Fill ONLY its body/i);
    // preservation of the harness is still demanded
    expect(p).toMatch(/PRESERVATION RULES/);
  });
  it('omits the shape directive entirely when there is no starter code', () => {
    const p = buildCodingSystemPrompt('python', undefined, undefined, true);
    expect(p).not.toMatch(/TEMPLATE SHAPE/);
  });
});
