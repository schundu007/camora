/**
 * Speaker attribution — decides whether a transcribed line in behavioral mode is
 * the INTERVIEWER (a question Sona should answer) or the CANDIDATE (their own
 * voice, which must never come back as a question).
 *
 * Lifted out of LumoraShellPage for the same reason question-routing.ts was
 * lifted out of AICompanionPanel: this is the single control point for a rule
 * that has regressed more than once, and it needs to be testable without
 * mounting the whole shell.
 *
 * Three kinds of transcript reach the decision:
 *
 *   'interviewer' — a DEDICATED capture stream (electron-loopback, tab-share,
 *     virtual-mic). The candidate's microphone is not part of it, so it is the
 *     interviewer by construction. Trusted.
 *
 *   'room'        — room-mic. ONE microphone hearing the whole room, so it
 *     carries the interviewer AND the candidate mixed together. Nothing at the
 *     stream level can separate them — only the backend's voice filter can, and
 *     that needs an enrolled voice print (see SpeakerAudio.handleAudioData).
 *
 *   undefined     — the candidate's own mic (ScreenshotStrip's AudioCapture,
 *     autoStart, locked). This is the candidate, always.
 */
export type TranscriptSource = 'interviewer' | 'room' | undefined;

export interface AttributionInput {
  /** The user explicitly pressed the mic button for this utterance. */
  manual: boolean;
  source: TranscriptSource;
  /** A dedicated interviewer stream has delivered at least one transcript this
   *  session. Latched by the caller — never cleared while mounted. */
  dedicatedInterviewerHeard: boolean;
}

/**
 * True when this line is the candidate's own voice arriving on the candidate's
 * own microphone, and must be dropped rather than treated as a question.
 *
 * The rule is deliberately absolute: once a dedicated interviewer stream has
 * proven it can hear, the candidate mic is NEVER an automatic question source
 * again for the rest of the session — not while the stream is briefly down, not
 * while it is live but silent.
 *
 * The previous rule expired that proof 8s after the stream went inactive so the
 * mic could take over as a fallback. That fallback is precisely what put the
 * candidate's own answers into the question panel: a loopback that goes quiet
 * (wrong output sink, meeting audio on another device, ScreenCaptureKit dropping
 * signal) is indistinguishable from one that died, so the mic — which hears the
 * candidate loud and close — silently became "the interviewer" while the real
 * interviewer's questions kept arriving on the real stream. Both voices were
 * typed, and the coalescer fused them into one unanswerable blob.
 *
 * Recovery from a genuinely dead stream is the user's job now, not something we
 * fake by repurposing their microphone: SilentStreamBanner surfaces both the
 * dead and the live-but-silent case with a reconnect button.
 *
 * Manual mic presses always survive — that is the candidate deliberately
 * speaking TO Sona, not being overheard by her. And when no dedicated stream has
 * ever been heard (pure mic-only setups) the mic genuinely is the only ear in the
 * room, so nothing is suppressed.
 */
export const isCandidateSelfVoice = ({
  manual,
  source,
  dedicatedInterviewerHeard,
}: AttributionInput): boolean => {
  if (manual) return false;
  if (source) return false;
  return dedicatedInterviewerHeard;
};
