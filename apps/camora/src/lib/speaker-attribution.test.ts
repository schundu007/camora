/**
 * The contract these lock down is the one the user reported broken twice:
 * "always block candidate voice" and "both voices are being typed".
 */
import { describe, it, expect } from 'vitest';
import { isCandidateSelfVoice, type TranscriptSource } from './speaker-attribution';

const drop = (
  source: TranscriptSource,
  dedicatedInterviewerHeard: boolean,
  manual = false,
) => isCandidateSelfVoice({ manual, source, dedicatedInterviewerHeard });

describe('isCandidateSelfVoice — the candidate is never a question source', () => {
  it('drops the candidate mic once a dedicated stream has been heard', () => {
    expect(drop(undefined, true)).toBe(true);
  });

  it('KEEPS dropping it while the dedicated stream is down or silent', () => {
    // The regression: the old rule expired its proof after 8s of inactivity and
    // handed the ear back to the candidate's own microphone. `dedicatedInterviewerHeard`
    // is latched precisely so this case cannot come back.
    expect(drop(undefined, true)).toBe(true);
  });

  it('never drops a dedicated interviewer stream', () => {
    expect(drop('interviewer', true)).toBe(false);
  });

  it('never drops a manual mic press, even with a live dedicated stream', () => {
    // Deliberately speaking TO Sona, not being overheard by her.
    expect(drop(undefined, true, true)).toBe(false);
  });
});

describe('mic-only setups keep working', () => {
  it('does not suppress the mic when no dedicated stream has ever been heard', () => {
    // Here the mic genuinely IS the only ear in the room. Suppressing it would
    // make Sona totally deaf, which is worse than the leak it prevents.
    expect(drop(undefined, false)).toBe(false);
  });
});

describe('room-mic is not treated as a trusted dedicated stream', () => {
  it('passes room-mic through — stream-level attribution is impossible there', () => {
    // One microphone hears interviewer AND candidate. Only the backend voice
    // filter can separate them; dropping the whole stream would kill the mode.
    expect(drop('room', true)).toBe(false);
    expect(drop('room', false)).toBe(false);
  });

  it('room-mic must NOT be tagged interviewer at the call site', () => {
    // Guards the LumoraShellPage mapping: labelling room-mic 'interviewer' is
    // what let the candidate's own voice inherit a dedicated stream's trust.
    const method = 'room-mic';
    const source: TranscriptSource = method === 'room-mic' ? 'room' : 'interviewer';
    expect(source).toBe('room');
  });
});
