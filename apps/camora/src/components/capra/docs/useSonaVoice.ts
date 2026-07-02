/**
 * useSonaVoice — Sona's spoken output for the Topic Voice Agent.
 *
 * Thin wrapper over the browser Web Speech API (window.speechSynthesis). This
 * is the ONLY place that knows how speech is produced, so a premium cloud TTS
 * can be swapped in later without touching TopicVoiceAgent or the topic UI.
 *
 * `enqueue` appends to a spoken queue (used to speak streamed sentences in
 * order); `speak` cancels everything and speaks immediately (barge-in safe);
 * `flushSentences` pulls complete sentences out of a streaming buffer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SonaVoice {
  supported: boolean;
  speaking: boolean;
  speak(text: string): void;
  speakOne(text: string, onDone?: () => void): void;
  enqueue(text: string): void;
  flushSentences(buffer: string): string;
  cancel(): void;
}

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voices = synth.getVoices();
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /natural|samantha|google/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

export function useSonaVoice(opts: { rate?: number; onEnd?: () => void } = {}): SonaVoice {
  const { rate = 1, onEnd } = opts;
  const [speaking, setSpeaking] = useState(false);
  const queue = useRef<string[]>([]);
  const draining = useRef(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  // Voices can populate asynchronously; nudge them to load.
  useEffect(() => {
    if (!synth) return;
    const load = () => { pickVoice(); };
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);

  const drain = useCallback(() => {
    if (!synth || draining.current) return;
    const next = queue.current.shift();
    if (next == null) { setSpeaking(false); onEndRef.current?.(); return; }
    draining.current = true;
    setSpeaking(true);
    const u = new SpeechSynthesisUtterance(next);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    const advance = () => { draining.current = false; drain(); };
    u.onend = advance;
    u.onerror = advance;
    synth.speak(u);
  }, [rate]);

  const enqueue = useCallback((text: string) => {
    const t = text.trim();
    if (!synth || !t) return;
    queue.current.push(t);
    drain();
  }, [drain]);

  const speak = useCallback((text: string) => {
    if (!synth) return;
    synth.cancel();
    queue.current = [];
    draining.current = false;
    enqueue(text);
  }, [enqueue]);

  // Speak exactly one utterance and fire onDone when it finishes. Used by the
  // read-along loop so highlighting stays in lock-step with the audio.
  const speakOne = useCallback((text: string, onDone?: () => void) => {
    const t = text.trim();
    if (!synth || !t) { onDone?.(); return; }
    synth.cancel();
    queue.current = [];
    draining.current = false;
    setSpeaking(true);
    const u = new SpeechSynthesisUtterance(t);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    let fired = false;
    const finish = () => { if (fired) return; fired = true; onDone?.(); };
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  }, [rate]);

  const cancel = useCallback(() => {
    if (!synth) return;
    queue.current = [];
    draining.current = false;
    synth.cancel();
    setSpeaking(false);
  }, []);

  // Enqueue any COMPLETE sentences in `buffer`; return the trailing remainder.
  const flushSentences = useCallback((buffer: string): string => {
    const parts = buffer.split(/(?<=[.!?])\s+/);
    if (parts.length <= 1) return buffer;
    const remainder = parts.pop() as string;
    for (const p of parts) enqueue(p);
    return remainder;
  }, [enqueue]);

  // Stop any speech if the component using this hook unmounts.
  useEffect(() => () => { if (synth) synth.cancel(); }, []);

  return { supported: !!synth, speaking, speak, speakOne, enqueue, flushSentences, cancel };
}
