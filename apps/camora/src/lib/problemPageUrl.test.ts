import { describe, it, expect } from 'vitest';
import { isProblemPageUrl, isAutoFetchableUrl } from './problemPageUrl';

// SHARED CASES — apps/lumora-backend/tests/problemPageUrl.test.js asserts the
// same strings against the backend copy. Keep both in sync.
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

// Recognising a page and being able to FETCH it are different questions. CoderPad
// rooms, CodeSignal interviews and Glider tests are real problem pages that live
// inside the candidate's own session, so a server-side fetch reaches a sign-in
// screen. Auto-fetching them fires a request that cannot succeed — which on the web
// (no screenshot fallback) is exactly what "the feature is broken" looks like.
describe('isAutoFetchableUrl — only what the backend can actually read', () => {
  const FETCHABLE = [
    'https://leetcode.com/problems/two-sum/',
    'https://leetcode.com/problems/two-sum/description/',
    'https://leetcode.cn/problems/add-two-numbers/',
    'https://www.hackerrank.com/challenges/simple-array-sum/problem',
    'https://www.hackerrank.com/contests/w37/challenges/maximize-it',
  ];
  const SESSION_ONLY = [
    'https://app.coderpad.io/ABC123XYZ',
    'https://coderpad.io/sandbox',
    'https://codesignal.com/interview/abc123/',
    'https://app.glider.ai/test/xyz789',
  ];

  it.each(FETCHABLE)('FETCHES %s', u => expect(isAutoFetchableUrl(u)).toBe(true));
  it.each(SESSION_ONLY)('does NOT auto-fetch %s', u => expect(isAutoFetchableUrl(u)).toBe(false));

  // The narrower test must never widen the allowlist.
  it.each(SESSION_ONLY)('still recognises %s as a problem page', u => expect(isProblemPageUrl(u)).toBe(true));
  it.each(BLOCK)('rejects non-problem page %s', u => expect(isAutoFetchableUrl(u)).toBe(false));
});
