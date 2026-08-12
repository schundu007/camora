/**
 * Pins the behavioral auto-answer routing policy.
 *
 * This tradeoff has churned repeatedly: blanket auto-answer floods the panel
 * with Whisper garbage (2026-06-29), and blanket tap-to-answer means a live
 * interviewee has to tap every question mid-interview (45d885ae, 2026-07-10).
 *
 * The settlement is ONE filter and ONE visible switch: passesNoiseFilter() is
 * the flood guard, and the Auto-answer toggle decides what happens to whatever
 * survives it — answered hands-free when ON, parked for a tap when OFF.
 *
 * A second heuristic gate inside the ON path was tried and removed: deferring
 * to isQuestion() (precision-first) silently withheld 40% of real behavioral
 * prompts, because interviewers phrase them as invitations ("I'd love to hear
 * about a time you led") rather than interrogatives. The candidate saw nothing
 * happen and could not tell why. These tests pin BOTH directions: noise never
 * reaches the LLM, and a prompt that clears the floor is never silently
 * withheld from a user who asked for hands-free answers.
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

  it('auto-answers invitation-phrased prompts — the 40% that used to vanish', () => {
    // None of these are interrogatives, none carry a "?", and every one is a
    // real behavioral question. The old isQuestion() tier parked all of them in
    // a list the candidate cannot read while an interviewer is watching, which
    // is indistinguishable from Sona being broken.
    for (const soft of [
      'I would love to hear more about the reliability work you mentioned',
      "I'd love to hear about a time you led a project end to end",
      "Let's talk about a failure, something that didn't go the way you planned",
      'Maybe we can start with a quick overview of your current role and what you own',
      'Share an experience where you had to push back on a deadline',
      'Talk to me about a project you are most proud of',
    ]) {
      expect(passesNoiseFilter(soft)).toBe(true);
      expect(route(soft)).toBe('auto');
    }
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
