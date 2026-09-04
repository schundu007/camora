/**
 * InterviewerListenButton — the Ask composer's mic button while a dedicated
 * interviewer stream is live.
 *
 * It opens no microphone of its own. The stream that already carries the
 * interviewer (electron-loopback / tab-share / virtual-mic, owned by
 * SpeakerAudioProvider) is transcribed once for the whole shell, and arming
 * this button subscribes the Ask composer to it.
 *
 * That is the whole point: the dictation mic it replaces was one microphone in
 * the room, so during an interview it heard the interviewer through the
 * candidate's speakers AND the candidate answering, and sent both as a single
 * question. Nothing here can hear the candidate — they are not on this stream.
 *
 * Presentational only. Arm/disarm state, coalescing and submission live in
 * AskLayout next to the composer they act on.
 */
interface Props {
  /** Subscribed to the interviewer stream right now. */
  listening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const InterviewerListenButton = ({ listening, onToggle, disabled = false }: Props) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    data-tip={listening
      ? 'Listening to the interviewer — each question is sent to Sona as it finishes. Click to stop.'
      : 'Listen to the interviewer — their questions go straight to Sona. Your own voice is not on this stream.'}
    aria-label={listening ? 'Stop listening to the interviewer' : 'Listen to the interviewer'}
    aria-pressed={listening}
    className="relative w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 hover:opacity-85"
    style={{
      background: listening ? 'var(--lum-accent)' : 'var(--bg-app)',
      border: '1px solid var(--cam-gold-leaf-dk)',
    }}
  >
    {/* Broadcast waves — the same mark the SpeakerAudioPill uses for "this is
        the interviewer's stream", so the two controls read as one system. */}
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={listening ? '#0a0e1a' : 'var(--cam-gold-leaf)'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
    {listening && (
      <span
        aria-hidden="true"
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse"
        style={{ background: 'var(--cam-gold-leaf)' }}
      />
    )}
  </button>
);

export default InterviewerListenButton;
