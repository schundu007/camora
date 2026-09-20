/**
 * Pins the behavioral ANSWER CONTRACT to the Behavioral tab in BOTH answer modes.
 *
 * The bug this guards: the contract used to live behind `else if (isShortMode)`,
 * keyed on the literal '[SHORT] ' prefix the panel sends only when answerMode is
 * 'short'. In Detailed mode the request fell past every branch to the generic
 * prompt, which emits no ARCHETYPE line — so answer-view.tsx had nothing to
 * parse and rendered plain prose: no archetype badge, no STAR cards, no
 * rebuttals panel. Nothing errored, which is why it went unnoticed.
 *
 * These assertions are deliberately about the LABELS the frontend parses, not
 * about answer quality (that's an eval problem). If a future prompt edit drops
 * ARCHETYPE / STAR / REBUTTALS from either mode, the renderer silently degrades
 * again — so that's exactly what's pinned.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const capturedCalls = [];

vi.mock('@google/generative-ai', () => {
  function GoogleGenerativeAI() {
    return {
      getGenerativeModel(cfg) {
        capturedCalls.push({ systemInstruction: cfg?.systemInstruction, args: cfg });
        return {
          async generateContentStream() {
            return {
              stream: (async function* () { yield { text: () => 'ok' }; })(),
              response: Promise.resolve({
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1 },
              }),
            };
          },
        };
      },
    };
  }
  return { GoogleGenerativeAI };
});

vi.mock('../src/services/companyContext.js', () => ({
  getCompanyContext: vi.fn().mockResolvedValue(null),
  detectCompanyFromContext: vi.fn().mockReturnValue(null),
}));
vi.mock('../src/services/companyCulture.js', () => ({
  getCultureFrame: vi.fn().mockReturnValue(''),
}));
vi.mock('../src/services/cloudHint.js', () => ({
  cloudHintFor: vi.fn().mockReturnValue(''),
  default: vi.fn().mockReturnValue(''),
}));

beforeEach(() => { capturedCalls.length = 0; });

const lastSystem = () => {
  const call = capturedCalls[capturedCalls.length - 1];
  if (!call) throw new Error('model client was not called');
  const sys = call.systemInstruction ?? call.args?.system;
  if (Array.isArray(sys)) return sys.map((b) => b.text).join('\n');
  return String(sys || '');
};

/** Drive streamResponse to completion and return the assembled system prompt. */
async function systemPromptFor(question, options) {
  const { streamResponse } = await import('../src/services/claude.js');
  const gen = streamResponse(question, [], options);
  for await (const _ of gen) { /* drain */ }
  return lastSystem();
}

// A question that asks for a past episode, so the STAR path is the relevant one.
const STORY_Q = 'Tell me about a time you disagreed with your manager';

describe('behavioral answer contract — Short mode (the path that already worked)', () => {
  it('carries the ARCHETYPE + STAR + REBUTTALS contract', async () => {
    const sys = await systemPromptFor(`[SHORT] ${STORY_Q}`, { mode: 'behavioral' });
    expect(sys).toContain('ARCHETYPE');
    expect(sys).toContain('REBUTTALS');
    expect(sys).toMatch(/Situation/i);
    expect(sys).toMatch(/Result/i);
  });
});

/* The Short / Detailed pair is gone — one averaged depth now applies to every
   behavioral answer. What these pin has not changed: the depth block must
   reassert the labels the renderer parses, and it must apply whatever prefix
   the question happens to arrive with, because the UI no longer sends one. */
describe('behavioral answer contract — one depth, every prefix', () => {
  for (const [name, q] of [
    ['no prefix (what the UI sends now)', STORY_Q],
    ['a stale [DETAILED] prefix', `[DETAILED] ${STORY_Q}`],
    ['a [SHORT] prefix from another surface', `[SHORT] ${STORY_Q}`],
  ]) {
    it(`carries the full contract with ${name}`, async () => {
      const sys = await systemPromptFor(q, { mode: 'behavioral' });
      expect(sys).toContain('ARCHETYPE');
      expect(sys).toContain('REBUTTALS');
      expect(sys).toMatch(/Situation/i);
      expect(sys).toMatch(/Result/i);
    });

    it(`applies the depth block with ${name}`, async () => {
      const sys = await systemPromptFor(q, { mode: 'behavioral' });
      expect(sys).toContain('DEPTH — FULL LINES, SAME SHAPE');
      expect(sys).toMatch(/about 25 words/);
      // It must reassert the labels, not merely permit more text — dropping one
      // collapses the answer into prose the renderer cannot parse.
      expect(sys).toMatch(/Do NOT switch to paragraphs/i);
    });
  }

  it('no longer branches on a mode the UI cannot set', async () => {
    const withPrefix = await systemPromptFor(`[SHORT] ${STORY_Q}`, { mode: 'behavioral' });
    const without = await systemPromptFor(STORY_Q, { mode: 'behavioral' });
    expect(withPrefix.includes('DEPTH — FULL LINES')).toBe(without.includes('DEPTH — FULL LINES'));
  });
});

describe('blast radius — non-behavioral modes are untouched', () => {
  it('a plain general question still gets the generic prompt, no ARCHETYPE', async () => {
    const sys = await systemPromptFor('what is an SLO?', { systemContext: 'JD: SRE role.' });
    expect(sys).not.toContain('ARCHETYPE');
  });

  it('detailed mode outside behavioral does not pick up the behavioral contract', async () => {
    const sys = await systemPromptFor('[DETAILED] what is an SLO?', { mode: 'general' });
    expect(sys).not.toContain('DETAILED MODE — MORE ROOM');
  });
});
