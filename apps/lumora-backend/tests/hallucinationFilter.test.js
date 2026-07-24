import { describe, it, expect } from 'vitest';
import { classifyTranscript } from '../src/services/hallucinationFilter.js';

const kept = (t) => expect(classifyTranscript(t).filtered, `expected KEPT: "${t}"`).toBe(false);
const dropped = (t) => expect(classifyTranscript(t).filtered, `expected DROPPED: "${t}"`).toBe(true);

describe('THE REGRESSION: long real questions were discarded as hallucinations', () => {
  // The filter counted every word over 2 chars, so "the"/"and"/"you" voted for
  // "Whisper is looping". Any utterance long enough to say "the" four times died
  // — which is precisely the shape of a behavioral question. Production logs
  // showed every surviving transcript was 2-41 chars.
  it('keeps a long behavioral question that repeats "the" five times', () => {
    kept(
      'So tell me about a time when you had to deal with a difficult stakeholder on the team, ' +
      'and walk me through what the situation was, what you did about it, and what the outcome ' +
      'was for the team and for the product.',
    );
  });

  it('keeps a long system-design question', () => {
    kept(
      'How would you design a rate limiter that works across multiple servers, and what would ' +
      'you do if the traffic doubled overnight and the cache went down at the same time?',
    );
  });

  it('keeps a rambling multi-part question with natural phrase repetition', () => {
    kept(
      'Walk me through a project where you had to make a tradeoff, and I want to understand ' +
      'how you made the tradeoff, who you talked to about the tradeoff, and how you knew the ' +
      'tradeoff was the right call for the business.',
    );
  });

  it('keeps interviewer chatter captured during screen sharing', () => {
    kept('Okay, now on your report, so. Okay, basically. If you are on first and we have the report and then you can see the next step in the flow');
  });
});

describe('genuine hallucinations are still rejected', () => {
  it('drops a single-content-word decoder loop', () => {
    dropped('Marvin Marvin Marvin Marvin Marvin');
  });

  it('drops a phrase loop repeated many times', () => {
    dropped('subscribe now subscribe now subscribe now subscribe now subscribe now');
  });

  it('drops YouTube outro text', () => {
    dropped('Thanks for watching!');
    dropped('Please like and subscribe');
  });

  it('drops bare acknowledgements', () => {
    dropped('Okay.');
    dropped('you');
    dropped('Thank you.');
  });

  it('drops short noise with no punctuation', () => {
    dropped('lanja');
  });

  it('drops foreign-script noise', () => {
    dropped('ありがとうございました');
  });
});

describe('short real speech still survives', () => {
  it('keeps a short question', () => {
    kept('What is Bazel?');
  });

  it('keeps a one-word question that carries punctuation', () => {
    kept('Really?');
  });

  it('collapses a stuttered question instead of dropping it', () => {
    const r = classifyTranscript('What is Bazel? What is Bazel?');
    expect(r.filtered).toBe(false);
    expect(r.text).toBe('What is Bazel?');
  });
});

describe('dominance rule', () => {
  it('keeps a long answer that legitimately names one system repeatedly', () => {
    kept(
      'The ingestion service writes to Kafka, then the ingestion service batches records ' +
      'before the ingestion service hands off to the warehouse loader, and I tuned the ' +
      'ingestion service to cut latency by forty percent across the pipeline.',
    );
  });

  it('drops a loop where the repeated word dominates the whole transcript', () => {
    dropped('Marvin are you there Marvin Marvin Marvin Marvin');
  });
});
