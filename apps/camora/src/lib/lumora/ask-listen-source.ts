/**
 * Ask Sona listening source — decides where the Ask mic button gets its audio.
 *
 * Lifted into lib/ for the same reason speaker-attribution.ts was: this is the
 * single control point for a rule that decides whose voice becomes a question,
 * and it needs to be testable without mounting the shell.
 *
 * Two sources:
 *
 *   'interviewer' — a DEDICATED capture stream (electron-loopback, tab-share,
 *     virtual-mic) is live. The candidate's microphone is not part of that
 *     stream, so what it carries is the interviewer by construction. The Ask
 *     button listens to it and never opens the mic at all.
 *
 *   'mic'         — no dedicated stream. The button is the dictation mic it has
 *     always been: you speak your question, it types and sends.
 *
 * WHY this exists: the Ask mic was `getUserMedia({ audio: true })` — one
 * microphone in the room. During an interview it heard the interviewer through
 * the candidate's speakers AND the candidate answering, and since the utterance
 * only ended after 2s of true silence (which a live interview never has), the
 * two voices were transcribed into one clip and sent as a single question:
 * "interviewer question and my answer both typed as a question". Sourcing from
 * the dedicated stream removes the candidate's voice by construction rather
 * than trying to separate it after the fact.
 *
 * room-mic sits between the two. It is one microphone hearing the whole room,
 * so on its own it reintroduces the exact mixing this fixes — the same
 * distinction speaker-attribution.ts draws. But when the candidate has enrolled
 * a voice print AND the filter is on, SpeakerAudio transcribes that stream with
 * `filter_user_voice: true` and the backend removes the candidate's voice
 * server-side, which is what behavioral already leans on for room-mic setups.
 * So it counts as an interviewer source only while that filter is actually
 * active.
 *
 * The two are not equally strong and the code should not pretend they are: a
 * dedicated stream is STRUCTURAL (the candidate is not on the wire, so nothing
 * can leak), the enrolled filter is STATISTICAL (a voice-similarity threshold
 * that can miss). Dedicated wins whenever both are available.
 */
import type { CaptureMethod } from '@/lib/audio-preferences';

export type AskListenSource = 'interviewer' | 'mic';

export type ResolvedCaptureMethod = Exclude<CaptureMethod, 'auto'> | null;

/** Capture methods that carry the interviewer and ONLY the interviewer. */
const DEDICATED: ReadonlySet<string> = new Set([
  'electron-loopback',
  'tab-share',
  'virtual-mic',
]);

export const isDedicatedInterviewerStream = (m: ResolvedCaptureMethod): boolean =>
  !!m && DEDICATED.has(m);

export interface ListenSourceInput {
  /** The shared speaker capture is running right now. */
  speakerActive: boolean;
  /** The method that capture actually resolved to (null until it starts). */
  method: ResolvedCaptureMethod;
  /** The candidate has an enrolled voice print AND the filter is switched on,
   *  so a room-mic stream is transcribed with the candidate's voice removed
   *  server-side. Irrelevant to the dedicated methods — they never carried it. */
  voiceFilterActive: boolean;
}

/**
 * Which source should the Ask mic button use right now?
 *
 * A live dedicated stream always wins. A live room-mic counts only while the
 * enrolled voice filter is removing the candidate from it. Anything else —
 * stopped, errored, mic-only, or an unfiltered room-mic — falls back to
 * dictation, which is what the button has always done and what someone testing
 * alone expects.
 */
export const resolveAskListenSource = ({
  speakerActive,
  method,
  voiceFilterActive,
}: ListenSourceInput): AskListenSource => {
  if (!speakerActive) return 'mic';
  if (isDedicatedInterviewerStream(method)) return 'interviewer';
  if (method === 'room-mic' && voiceFilterActive) return 'interviewer';
  return 'mic';
};
