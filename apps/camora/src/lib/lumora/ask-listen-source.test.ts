import { describe, it, expect } from 'vitest';
import {
  resolveAskListenSource,
  isDedicatedInterviewerStream,
  type ResolvedCaptureMethod,
} from './ask-listen-source';

describe('isDedicatedInterviewerStream', () => {
  it('accepts the three streams that carry only the interviewer', () => {
    expect(isDedicatedInterviewerStream('electron-loopback')).toBe(true);
    expect(isDedicatedInterviewerStream('tab-share')).toBe(true);
    expect(isDedicatedInterviewerStream('virtual-mic')).toBe(true);
  });

  it('rejects room-mic — one microphone hearing the candidate too', () => {
    // Structural vs statistical: room-mic can be made usable by the enrolled
    // voice filter, but it is never DEDICATED.
    expect(isDedicatedInterviewerStream('room-mic')).toBe(false);
  });

  it('rejects mic-only and the unresolved null', () => {
    expect(isDedicatedInterviewerStream('mic-only')).toBe(false);
    expect(isDedicatedInterviewerStream(null)).toBe(false);
  });
});

describe('resolveAskListenSource', () => {
  it('listens to the interviewer when a dedicated stream is live', () => {
    for (const method of ['electron-loopback', 'tab-share', 'virtual-mic'] as const) {
      expect(resolveAskListenSource({ speakerActive: true, method, voiceFilterActive: false }))
        .toBe('interviewer');
    }
  });

  it('falls back to dictation when the dedicated stream is not running', () => {
    expect(resolveAskListenSource({
      speakerActive: false, method: 'electron-loopback', voiceFilterActive: false,
    })).toBe('mic');
  });

  it('accepts a live room-mic once the enrolled voice filter is removing the candidate', () => {
    expect(resolveAskListenSource({
      speakerActive: true, method: 'room-mic', voiceFilterActive: true,
    })).toBe('interviewer');
  });

  it('refuses an unfiltered room-mic — that stream demonstrably carries both voices', () => {
    expect(resolveAskListenSource({
      speakerActive: true, method: 'room-mic', voiceFilterActive: false,
    })).toBe('mic');
  });

  it('does not let the voice filter promote a stream that is not running', () => {
    expect(resolveAskListenSource({
      speakerActive: false, method: 'room-mic', voiceFilterActive: true,
    })).toBe('mic');
  });

  it('does not let the voice filter promote mic-only', () => {
    // mic-only means there is no second stream at all — the filter has nothing
    // to be applied to, and Ask's own mic is the candidate dictating.
    expect(resolveAskListenSource({
      speakerActive: true, method: 'mic-only', voiceFilterActive: true,
    })).toBe('mic');
  });

  it('is dictation when nothing has been set up at all', () => {
    expect(resolveAskListenSource({
      speakerActive: false, method: null, voiceFilterActive: false,
    })).toBe('mic');
  });

  it('never returns interviewer for a method it does not know', () => {
    const bogus = 'bluetooth-headset' as unknown as ResolvedCaptureMethod;
    expect(resolveAskListenSource({
      speakerActive: true, method: bogus, voiceFilterActive: true,
    })).toBe('mic');
  });
});
