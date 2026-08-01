/**
 * LIVE contract check for the DIAGNOSE situation — runs the composed prompt
 * against the real model with the capture that shipped the bug: "list the
 * issues, don't add any new lines", which used to come back as a different
 * program (wrapped in def, invented output list, print turned into return).
 *
 * Opt-in so the normal suite stays hermetic and free:
 *   RUN_LIVE_PROMPT_TESTS=1 ANTHROPIC_API_KEY=... npx vitest run tests/taskModes.live.test.js
 */
import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { buildSituationBlock, WALKTHROUGH_BUDGET } from '../src/services/taskModes.js';

const LIVE = process.env.RUN_LIVE_PROMPT_TESTS === '1' && !!process.env.ANTHROPIC_API_KEY;

const CODE = `people = ["Alice", "Bob", "Bob"]
counter = 0
while counter <= len(people):
  print(people[counter])
    counter = counter + 1`;

const buildPrompt = (task) => {
  const walk = WALKTHROUGH_BUDGET[task];
  return `You are CoFix, a code repair specialist. Fix the python code below.

${buildSituationBlock({ task })}

CODE:
\`\`\`python
${CODE}
\`\`\`

Return ONLY a JSON object (no markdown fences) with this exact structure:
{
  "fixed_code": "complete fixed code as a string",
  "changes": [{ "line": 1, "badge": 1, "type": "fix", "label": "2-4 words", "note": "<= 8 words" }],
  "complexity": { "time": "O(...)", "space": "O(...)", "timeWhy": "one sentence", "spaceWhy": "one sentence" },
  "hackerrank_compatible": true,
  "walkthrough": [{ "lines": "1-3", "text": "first person, <= 15 words" }]
}

RULES:
- line numbers refer to the FIXED code, not the original
- If code has no issues, return changes: [] and fixed_code equal to the input
- fixed_code MUST be submission-ready: the corrected program ONLY. Add ZERO comments.
- walkthrough: ${walk.min}-${walk.max} entries MAX, <= 15 words each, first person.`;
};

const ask = async (task) => {
  const msg = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: buildPrompt(task) }],
  });
  const raw = msg.content.map(b => b.text || '').join('').trim()
    .replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '');
  return JSON.parse(raw);
};

describe.skipIf(!LIVE)('LIVE: diagnose returns the same program, corrected', () => {
  it('fixes both defects without rewriting anything', async () => {
    const out = await ask('diagnose');
    const inLines = CODE.split('\n');
    const outLines = out.fixed_code.split('\n');

    // The contract the user stated: don't add lines, don't change the code.
    expect(outLines.length).toBe(inLines.length);
    expect(out.fixed_code).toMatch(/while counter < len\(people\)/);   // off-by-one
    expect(outLines[4]).toMatch(/^ {2}counter = counter \+ 1\s*$/);      // re-indented
    expect(out.fixed_code).not.toMatch(/^\s*def /m);                    // no wrapper
    expect(out.fixed_code).toMatch(/print\(people\[counter\]\)/);       // print kept
    expect(out.fixed_code).not.toMatch(/return /);                      // not converted
    expect(out.fixed_code).not.toMatch(/\b(output|result)\s*=/);        // nothing invented
    expect(out.fixed_code).not.toMatch(/!=\s*["']Error["']/);
    expect(out.changes.length).toBeGreaterThanOrEqual(2);               // both reported
  }, 90_000);

  it('explain changes nothing at all', async () => {
    const out = await ask('explain');
    expect(out.fixed_code.trim()).toBe(CODE.trim());
    expect(out.changes).toEqual([]);
    expect(out.walkthrough.length).toBeGreaterThanOrEqual(WALKTHROUGH_BUDGET.explain.min);
  }, 90_000);
});
