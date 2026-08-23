import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidApiKey, validateRequest } from './security.js';

test('compares API keys without accepting missing or malformed values', () => {
  assert.equal(hasValidApiKey('secret', 'secret'), true);
  assert.equal(hasValidApiKey('wrong', 'secret'), false);
  assert.equal(hasValidApiKey(undefined, 'secret'), false);
});

test('rejects oversized and malformed execution requests', () => {
  assert.throws(() => validateRequest({ code: 'x', language: 'python', test_cases: [{}] }), /Each test case/);
  assert.throws(() => validateRequest({
    code: 'x'.repeat(256 * 1024 + 1),
    language: 'python',
  }), /byte limit/);
});
