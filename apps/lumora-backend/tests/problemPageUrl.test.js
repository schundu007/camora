import { describe, it, expect } from 'vitest';
import { isProblemPageUrl, isAutoFetchableUrl } from '../src/routes/coding.js';

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

// Mirror of the frontend isAutoFetchableUrl cases. Recognising a page and being
// able to fetch it are different questions: session pages return a sign-in screen,
// which the generic fetch would otherwise serve as if it were the problem.
describe('isAutoFetchableUrl', () => {
  const FETCHABLE = [
    'https://leetcode.com/problems/two-sum/',
    'https://leetcode.cn/problems/add-two-numbers/',
    'https://www.hackerrank.com/challenges/simple-array-sum/problem',
    'https://www.hackerrank.com/contests/w37/challenges/maximize-it',
  ];
  const SESSION_ONLY = [
    'https://app.coderpad.io/ABC123XYZ',
    'https://codesignal.com/interview/abc123/',
    'https://app.glider.ai/test/xyz789',
  ];

  it.each(FETCHABLE)('fetches %s', u => expect(isAutoFetchableUrl(u)).toBe(true));
  it.each(SESSION_ONLY)('refuses %s', u => expect(isAutoFetchableUrl(u)).toBe(false));
  it.each(SESSION_ONLY)('but still recognises %s', u => expect(isProblemPageUrl(u)).toBe(true));
  it('refuses junk', () => {
    expect(isAutoFetchableUrl('https://github.com/foo')).toBe(false);
    expect(isAutoFetchableUrl('')).toBe(false);
  });
});
