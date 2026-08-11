/**
 * Pins the behavioral auto-answer routing policy.
 *
 * This tradeoff has churned repeatedly: blanket auto-answer floods the panel
 * with Whisper garbage (2026-06-29), and blanket tap-to-answer means a live
 * interviewee has to tap every question mid-interview (45d885ae, 2026-07-10).
 * The two-tier split is the settlement — these tests exist so a future tweak to
 * either gate can't silently collapse it back into one of the two failure modes.
 */
import { describe, it, expect } from 'vitest';
import { passesNoiseFilter, shouldAutoAnswer, looksLowContent } from './question-routing';

/** The routing decision as submitCoalesced applies it. */
const route = (t: string): 'drop' | 'auto' | 'tap' => {
  if (!passesNoiseFilter(t)) return 'drop';
  return shouldAutoAnswer(t) ? 'auto' : 'tap';
};

describe('passesNoiseFilter — the shared floor under BOTH tiers', () => {
  it('drops hallucinated URLs so they can never reach the LLM', () => {
    expect(passesNoiseFilter('you can find it at www.Versa.gbias.com right now')).toBe(false);
    expect(passesNoiseFilter('go to https://example.com and tell me what you see')).toBe(false);
  });

  it('drops short fragments left over from VAD splits', () => {
    expect(passesNoiseFilter('of the')).toBe(false);
    expect(passesNoiseFilter('with the')).toBe(false);
  });

  it('drops pure acknowledgment / filler', () => {
    expect(passesNoiseFilter('yeah okay got it makes sense')).toBe(false);
    expect(passesNoiseFilter('thank you so much')).toBe(false);
  });

  it('drops repetitive low-content loops', () => {
    expect(looksLowContent('the next thing the next thing the next step')).toBe(true);
    expect(passesNoiseFilter('the next thing the next thing the next step')).toBe(false);
  });

  it('lets a real interviewer prompt through', () => {
    expect(passesNoiseFilter('Tell me about a time you led a project through ambiguity')).toBe(true);
  });
});

describe('routing — auto-answer vs tap', () => {
  it('auto-answers clear interrogatives', () => {
    expect(route('What was the hardest tradeoff you made on that project?')).toBe('auto');
    expect(route('How did you handle the disagreement with your manager?')).toBe('auto');
  });

  it('auto-answers recall prompts even without a question mark', () => {
    // Whisper routinely drops terminal punctuation — requiring "?" would miss
    // most real questions.
    expect(route('Tell me about a time you disagreed with your manager')).toBe('auto');
  });

  it('parks softer, ambiguous prompts in the tap list rather than guessing', () => {
    // Clears the noise floor (it is plausibly a prompt) but not the strict gate.
    const soft = 'I would love to hear more about the reliability work you mentioned';
    expect(passesNoiseFilter(soft)).toBe(true);
    expect(route(soft)).toBe('tap');
  });

  it('never routes noise to auto — the flood guard', () => {
    for (const noise of [
      'you can find it at www.Versa.gbias.com right now',
      'yeah okay got it makes sense',
      'the next thing the next thing the next step',
      'of the',
    ]) {
      expect(route(noise)).toBe('drop');
    }
  });
});
