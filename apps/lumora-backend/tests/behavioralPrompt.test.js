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

describe('behavioral answer contract — Detailed mode (the regression)', () => {
  it('carries the same contract without the [SHORT] prefix', async () => {
    const sys = await systemPromptFor(`[DETAILED] ${STORY_Q}`, { mode: 'behavioral' });
    expect(sys).toContain('ARCHETYPE');
    expect(sys).toContain('REBUTTALS');
    expect(sys).toMatch(/Situation/i);
    expect(sys).toMatch(/Result/i);
  });

  it('adds the depth override rather than switching prompt shape', async () => {
    const sys = await systemPromptFor(`[DETAILED] ${STORY_Q}`, { mode: 'behavioral' });
    expect(sys).toContain('DETAILED MODE');
    expect(sys).toMatch(/30 words instead of 20/);
    // The override must reassert the labels, not merely permit more text.
    expect(sys).toMatch(/Do NOT switch to paragraphs/i);
  });

  it('does NOT apply the depth override in short mode', async () => {
    const sys = await systemPromptFor(`[SHORT] ${STORY_Q}`, { mode: 'behavioral' });
    expect(sys).not.toContain('DETAILED MODE — MORE ROOM');
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
