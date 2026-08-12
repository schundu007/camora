/**
 * Pins model selection to modelPolicy.js.
 *
 * The bug this guards: selectModel used to carve out questionType 'behavioral'
 * and return Haiku even for paid users, contradicting modelPolicy.js — whose
 * LIVE_ANSWER_MODEL doc names "behavioral answers" first. The carve-out was
 * wider than it read, because gemini-stream.js maps isShortMode to 'behavioral'
 * as well, so it also downgraded every [SHORT] Ask Sona request on any tab.
 *
 * A per-type exception here is invisible at the call site — nothing errors, the
 * answers are just quietly worse. So the property pinned is the absence of any
 * per-type branch: paid gets the live answer model for EVERY type.
 */
import { describe, it, expect } from 'vitest';
import { selectModel } from '../src/services/claude.js';
import { LIVE_ANSWER_MODEL } from '../src/services/modelPolicy.js';

// Every questionType gemini-stream.js:128 can produce.
const TYPES = ['coding', 'design', 'behavioral', 'general'];
const PAID_PLANS = ['pro_monthly', 'pro_yearly', 'team', 'lifetime'];

describe('selectModel — paid users', () => {
  it.each(TYPES)('routes %s to the live answer model', (type) => {
    expect(selectModel('pro_monthly', type)).toBe(LIVE_ANSWER_MODEL);
  });

  it('applies to every paid plan type', () => {
    for (const plan of PAID_PLANS) {
      expect(selectModel(plan, 'behavioral')).toBe(LIVE_ANSWER_MODEL);
    }
  });

  it('never varies by question type — no per-type carve-outs', () => {
    const picks = new Set(TYPES.map((t) => selectModel('pro_monthly', t)));
    expect(picks.size).toBe(1);
  });
});

describe('selectModel — free users', () => {
  it.each(TYPES)('keeps %s on the cheap model', (type) => {
    expect(selectModel('free', type)).not.toBe(LIVE_ANSWER_MODEL);
  });

  it('treats a missing plan as free', () => {
    expect(selectModel(undefined, 'behavioral')).toBe(selectModel('free', 'behavioral'));
    expect(selectModel(null, 'behavioral')).toBe(selectModel('free', 'behavioral'));
  });
});
