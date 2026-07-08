import { describe, it, expect } from 'vitest';
import { isProblemPageUrl } from '../src/routes/coding.js';

// SHARED CASES — apps/camora/src/lib/problemPageUrl.test.ts asserts the
// same strings against the frontend copy. Keep both in sync.
const ALLOW = [
  'https://leetcode.com/problems/two-sum/',
  'https://leetcode.com/problems/two-sum/description/',
  'https://leetcode.cn/problems/add-two-numbers/',
  'https://www.hackerrank.com/challenges/simple-array-sum/problem',
  'https://www.hackerrank.com/contests/w37/challenges/maximize-it',
  'https://app.coderpad.io/ABC123XYZ',
  'https://coderpad.io/sandbox',
  'https://codesignal.com/interview/abc123/',
  'https://app.glider.ai/test/xyz789',
];
const BLOCK = [
  'https://leetcode.com/',
  'https://leetcode.com',
  'https://leetcode.com/problemset/all/',
  'https://leetcode.com/problems',
  'https://leetcode.com/problems/',
  'https://leetcode.com/explore/learn/',
  'https://www.hackerrank.com/dashboard',
  'https://www.hackerrank.com/domains/algorithms',
  'https://www.hackerrank.com/',
  'https://coderpad.io/',
  'https://coderpad.io/pricing',
  'https://codesignal.com/',
  'https://glider.ai/',
  'https://github.com/foo/bar',
  'https://www.youtube.com/watch?v=x',
  '',
  'not a url',
  'javascript:alert(1)',
];

describe('isProblemPageUrl — allowlist', () => {
  it.each(ALLOW)('ALLOWS %s', (u) => expect(isProblemPageUrl(u)).toBe(true));
  it.each(BLOCK)('BLOCKS %s', (u) => expect(isProblemPageUrl(u)).toBe(false));
});
