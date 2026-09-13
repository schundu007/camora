/**
 * useInterviewerListen — subscribe a composer to the interviewer's stream.
 *
 * Extracted so the Gemini and Claude tabs get the behaviour Ask Sona already
 * had, rather than each growing its own copy of a rule about whose voice
 * becomes a question. That rule is the whole point and it is easy to get
 * subtly wrong: see lib/lumora/ask-listen-source.ts for why a room mic does
 * NOT count as an interviewer stream unless the voice filter is actually on.
 *
 * This opens no microphone. A dedicated capture stream (electron-loopback,
 * tab-share, virtual-mic) is already transcribed once for the whole shell and
 * republished as `lumora:ask-question` window events; arming this hook just
 * subscribes to them. The candidate is not on that stream, so their answers
 * cannot be picked up as questions — removed by construction rather than
 * separated after the fact.
 *
 * Utterances are coalesced: an interviewer asking a question in two breaths
 * should be one question, so text accumulates until the stream goes quiet for
 * COALESCE_MS and only then submits.
 *
 * AskLayout still carries its own inlined copy of this logic. It is a larger
 * surface with a send queue and conversation persistence tangled into the same
 * effect, so converting it is a separate change with its own risk — not a
 * drive-by on top of this one.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeakerAudio } from '@/components/lumora/audio/SpeakerAudio';
import { useSessionStore } from '@/stores/session-store';
import { resolveAskListenSource } from '@/lib/lumora/ask-listen-source';

// Matches AskLayout's LISTEN_COALESCE_MS. A live interviewer pauses mid
// question; anything shorter cuts them off mid-thought.
const COALESCE_MS = 1200;

interface Options {
  /** Fired with a finished interviewer question, once the stream goes quiet. */
  onQuestion: (text: string) => void;
  /** Show what is being heard as it arrives, without clobbering a typed draft. */
  onPreview?: (text: string) => void;
  /** Current composer text, so a preview never overwrites something typed. */
  draft?: string;
  /** Only bind while the owning tab is on screen — these panels stay mounted. */
  enabled?: boolean;
}

export function useInterviewerListen({ onQuestion, onPreview, draft = '', enabled = true }: Options) {
  const speaker = useSpeakerAudio();
  const { voiceEnrolled, voiceFilterEnabled } = useSessionStore();
  const listenSource = resolveAskListenSource({
    speakerActive: speaker.active,
    method: speaker.method,
    voiceFilterActive: voiceEnrolled && voiceFilterEnabled,
  });
  const available = listenSource === 'interviewer';
  const [listening, setListening] = useState(false);

  /* Why the control cannot be armed, in the user's terms. Mirrors
   * resolveAskListenSource's branches — if that says 'mic', exactly one of
   * these explains it. Kept as prose the button can show, because "the chip is
   * missing" was previously a bug report rather than something the UI said. */
  const unavailableReason = available
    ? null
    : !speaker.active
    ? 'Interviewer audio is not connected. Connect it from the speaker pill in the toolbar.'
    : speaker.method === 'room-mic'
    ? 'Room mic carries you as well as the interviewer, so your questions cannot be separated until your voice print is enrolled and the filter is on.'
    : speaker.method === 'mic-only'
    ? 'This setup has no separate interviewer stream — mic-only captures one microphone. Switch capture method in Audio settings.'
    : 'The connected audio is not a dedicated interviewer stream, so listening would pick up your voice too.';

  // A stream that stops, drops, or loses its voice filter mid-session must not
  // leave the button claiming to listen to something that is no longer there.
  useEffect(() => {
    if (!available) setListening(false);
  }, [available]);

  // Nor may a hidden tab keep listening: two armed panels would both answer.
  useEffect(() => {
    if (!enabled) setListening(false);
  }, [enabled]);

  const toggle = useCallback(() => {
    if (!available) return;
    setListening(v => !v);
  }, [available]);

  // Refs so the subscription below does not resubscribe on every keystroke —
  // re-binding mid-utterance would drop the coalesce buffer with it.
  const onQuestionRef = useRef(onQuestion);
  const onPreviewRef = useRef(onPreview);
  const draftRef = useRef(draft);
  useEffect(() => { onQuestionRef.current = onQuestion; }, [onQuestion]);
  useEffect(() => { onPreviewRef.current = onPreview; }, [onPreview]);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const bufRef = useRef('');
  const previewRef = useRef('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!listening || !available || !enabled) return;

    const flush = () => {
      timerRef.current = null;
      const full = bufRef.current.trim();
      bufRef.current = '';
      previewRef.current = '';
      if (full) onQuestionRef.current(full);
    };

    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text?.trim();
      if (!text) return;
      const buf = bufRef.current;
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      // The same utterance arriving twice must not be appended to itself.
      if (!buf) bufRef.current = text;
      else if (!norm(buf).includes(norm(text))) bufRef.current = `${buf} ${text}`;
      // Mirror what is being heard, but never over a draft the user typed:
      // only replace text this hook itself put there.
      if (draftRef.current === previewRef.current) {
        previewRef.current = bufRef.current;
        onPreviewRef.current?.(bufRef.current);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, COALESCE_MS);
    };

    window.addEventListener('lumora:ask-question', handler);
    return () => {
      window.removeEventListener('lumora:ask-question', handler);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      bufRef.current = '';
      previewRef.current = '';
    };
  }, [listening, available, enabled]);

  return { listening, toggle, available, unavailableReason };
}
