/**
 * Sona follow-ups must stay attached to the coding session on screen.
 *
 * Two independent defects made every Sona follow-up read like a cold start:
 *
 *   1. The coding branch of every provider built its system prompt from
 *      CODING_SYSTEM_PROMPT + retrievedContext + resumeContext, and never read
 *      `resume` — the only variable carrying the caller's systemContext. The
 *      "CURRENT CODING SESSION" block that CodingSonaSidebar assembles (the
 *      on-screen problem, code and complexity) was built, shipped, and dropped
 *      on the floor. Asked to add test cases for a sort, Sona answered
 *      "assuming a sum operation" — it had never seen the problem.
 *
 *   2. /stream opened a fresh lumora_conversations row per request and passed
 *      [] as history, so turn 5 of a thread arrived at the model as turn 1.
 *
 * These tests pin the contracts that fix them. They are prompt-assembly and
 * cache-key tests on purpose — no network, no model.
 */
import { describe, it, expect } from 'vitest';
import { buildSessionContextBlock } from '../src/services/claude.js';
import { buildAnswerCacheKey } from '../src/services/answerCache.js';

const LIVE_BLOCK = [
  '##############################################################################',
  '# CURRENT CODING SESSION (live, on-screen right now)',
  '##############################################################################',
  'PROBLEM:',
  'Sort a list of integers in ascending order.',
  '',
  'CODE (python):',
  '```python',
  'def merge_sort(nums): ...',
  '```',
].join('\n');

describe('buildSessionContextBlock', () => {
  it('returns nothing when there is no context to inject', () => {
    expect(buildSessionContextBlock(null)).toBe('');
    expect(buildSessionContextBlock('')).toBe('');
  });

  it('carries the live coding session into the prompt verbatim', () => {
    const block = buildSessionContextBlock(LIVE_BLOCK);
    expect(block).toContain('CURRENT CODING SESSION');
    expect(block).toContain('Sort a list of integers in ascending order.');
    expect(block).toContain('def merge_sort(nums): ...');
  });

  it('instructs the model to answer against that session rather than a generic one', () => {
    const block = buildSessionContextBlock(LIVE_BLOCK);
    expect(block).toMatch(/never invent a different one/i);
  });

  it('keeps the live-session tail when the context is oversized', () => {
    // The client appends the live block LAST, so a head-only truncation would
    // drop precisely the problem the user is asking about.
    const oversized = `${'x'.repeat(40_000)}\n${LIVE_BLOCK}`;
    const block = buildSessionContextBlock(oversized);
    expect(block.length).toBeLessThan(oversized.length);
    expect(block).toContain('CURRENT CODING SESSION');
    expect(block).toContain('def merge_sort(nums): ...');
  });
});

describe('answer cache key — conversation history', () => {
  const base = { question: 'what about duplicates?', mode: 'coding', route: 'stream', plan: 'free' };

  it('separates the same follow-up asked in two different threads', () => {
    // "what about duplicates?" means nothing without the turns before it.
    // Sharing a slot would replay thread A's answer inside thread B.
    const a = buildAnswerCacheKey({ ...base, history: [{ role: 'user', content: 'sort a list' }] });
    const b = buildAnswerCacheKey({ ...base, history: [{ role: 'user', content: 'find two sum' }] });
    expect(a).not.toBe(b);
  });

  it('still shares a slot for identical threads', () => {
    const history = [{ role: 'user', content: 'sort a list' }];
    expect(buildAnswerCacheKey({ ...base, history })).toBe(buildAnswerCacheKey({ ...base, history }));
  });

  it('leaves first-question keys unchanged by an empty history', () => {
    expect(buildAnswerCacheKey({ ...base, history: [] })).toBe(buildAnswerCacheKey(base));
  });
});
