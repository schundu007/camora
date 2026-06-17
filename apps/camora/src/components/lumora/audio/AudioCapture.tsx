import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useSessionStore } from '@/stores/session-store';
import { transcriptionAPI, speakerAPI } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { isQuestion } from '@/lib/questionDetector';
import { SpeakerAudioPill } from './SpeakerAudio';

// Backward-compatible alias for the old SystemAudioButton — the
// implementation now lives in SpeakerAudio.tsx as SpeakerAudioPill,
// which consumes the shared SpeakerAudioProvider.
export const SystemAudioButton = (_props: { onTranscription?: (text: string) => void; disabled?: boolean }) => {
  return <SpeakerAudioPill />;
};

// Keyboard shortcuts — use Cmd/Ctrl+M to avoid conflict with typing.
// Backquote (` / ~) toggles the mic push-to-talk-style. We match by
// `e.code === 'Backquote'` rather than `e.key` so the binding fires
// regardless of whether Shift is held (the user thinks of it as the
// "tilde key" but the unshifted glyph is `). Same physical position
// across QWERTY/Dvorak/AZERTY layouts.
const SHORTCUTS = {
  STOP_MIC: ['Escape'] as string[],
  TOGGLE_MIC_CODE: 'Backquote',
};

// Debug logger — gated behind localStorage.lumora_mic_debug === 'on'.
// Off by default. Flip it on in DevTools when the mic misbehaves and
// every state transition (start, speech, silence, stop, restart,
// error, heartbeat-recover, visibility-recover) shows up in the
// console with a single grep target: `[mic]`.
const dlog = (event: string, data?: Record<string, unknown>) => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('lumora_mic_debug') !== 'on') return;
    console.log(`[mic] ${event}`, data ?? {});
  } catch { /* noop */ }
}

// Whisper hallucinates on near-silence with random short tokens that
// the backend's regex filter doesn't catch ("lanja", "you", "uh",
// foreign-language fragments, etc.). We discard these on the frontend
// before they pollute the question accumulator.
//
// Heuristic: a real interview question is rarely a single short word.
// We require either:
//   • >= 3 words, OR
//   • >= 14 chars, OR
//   • ends with `?` or `!` (decisive — punctuation almost never appears
//     in hallucinated chunks)
//
// This is intentionally conservative: false negatives (rejecting a
// legitimate "what?" follow-up) are recoverable — the user just speaks
// a fuller sentence. False positives (passing through "lanja") wreck
// the QUESTIONS panel and waste an LLM call.
// Minimal set of common English words that appear in virtually every real
// interview question. Used to reject Whisper garbage that passes length/
// punctuation checks (e.g. "Totserrk 3P-1-2" — 2 tokens, no common words).
const COMMON_EN = new Set([
  'a','an','the','is','are','was','were','be','been','have','has','had',
  'do','does','did','can','could','would','should','will','may','might',
  'how','what','when','where','why','who','which','tell','me','you','your',
  'we','our','i','my','to','for','with','in','on','at','and','or','not',
  'its','this','that','it','if','as','but','by','from','so','let','go',
  'get','make','use','give','take','say','know','see','think','work','try',
  'run','help','need','want','like','just','then','more','about','also',
  'some','any','all','one','please','describe','explain','walk','share',
  'talk','discuss','time','experience','team','project','example','situation',
]);

const isLikelyRealSpeech = (raw: string): boolean  => {
  if (typeof raw !== 'string') return false;
  const text = raw.trim();
  if (!text) return false;
  if (text.includes('[object Object]')) return false;
  const allWords = text.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 1);
  if (allWords.length > 0) {
    const freq: Record<string, number> = {};
    for (const w of allWords) freq[w] = (freq[w] || 0) + 1;
    if (Math.max(...Object.values(freq)) >= 4) return false;
    if (allWords.length >= 6) {
      const seen = new Set<string>();
      for (let i = 0; i <= allWords.length - 3; i++) {
        const tg = `${allWords[i]} ${allWords[i+1]} ${allWords[i+2]}`;
        if (seen.has(tg)) return false;
        seen.add(tg);
      }
    }
  }
  const nonAscii = [...text].filter(c => c.charCodeAt(0) > 0x7f).length;
  if (nonAscii / text.length > 0.08) return false;
  const last = text.slice(-1);
  if (last === '?' || last === '!') return true;
  // Require at least one common English word for short unponctated text.
  // Filters garbage like "Totserrk 3P-1-2" that has no real English words.
  const hasCommonWord = allWords.some(w => COMMON_EN.has(w));
  if (!hasCommonWord && allWords.length <= 5) return false;
  const words = text.split(/\s+/);
  if (words.length >= 2) return true;
  if (text.length >= 8) return true;
  return false;
}

interface AudioCaptureProps {
  // `manual: true` means the user explicitly pressed the mic button — the
  // intent is unambiguous, so downstream `isQuestion()` filters MUST be
  // bypassed. Manual press = direct user action; auto = system guess.
  onTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  // Fires after every accepted Whisper chunk with the current running
  // accumulation so the UI can show a live preview before the final flush.
  onLiveTranscription?: (accumulated: string) => void;
  autoStart?: boolean;
  // When false: suppresses all keyboard shortcuts and immediately releases
  // the mic if it was recording. When it flips back to true, AUTO resumes
  // if continuousMode was on. Used by coding/design tabs so they don't
  // compete for the mic when the user switches to behavioral or home.
  active?: boolean;
  // When true, renders without the outer navy box (background/border/shadow)
  // so the control integrates flat into whatever toolbar embeds it.
  // Coding/Design toolbars are already navy — the box-in-a-box creates
  // an unwanted "overlay" look.
  compact?: boolean;
  // When true, AUTO is always on and the toggle button is replaced with a
  // non-interactive LIVE indicator. Used for behavioral tab so the user
  // can never accidentally toggle off listening during an interview.
  locked?: boolean;
}

export const AudioCapture = ({ onTranscription, onLiveTranscription, autoStart = true, active, compact, locked }: AudioCaptureProps) => {
  // Use centralized auth
  const { token } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  // Persist so the user sets Auto ON/OFF once before the interview and
  // never has to click (audible!) during the call. Stored under a
  // dedicated key; read synchronously at mount so there is no flicker.
  //
  // When autoStart=false (coding/design embedded AudioCaptures): always
  // start as OFF regardless of the saved preference. These tabs must not
  // auto-grab the mic on mount, and restoring a saved 'on' state would
  // show a lit-gold AUTO button that isn't actually recording (the button
  // click would then turn it off — a confusing UX inversion).
  // Behavioral (autoStart=true) instances always start with AUTO ON — Sona
  // listens the moment the panel opens, no button press needed. The AUTO
  // button still works as an in-session toggle but we no longer persist the
  // 'off' state; next launch always starts listening again.
  const [continuousMode, setContinuousMode] = useState<boolean>(() => {
    if (!autoStart) return false;
    return true;
  });
  const startRecordingRef = useRef<(() => Promise<boolean>) | null>(null);
  const continuousModeRef = useRef(continuousMode);

  // Recording mode is the SOLE source of truth for who owns the
  // MediaRecorder. AUTO and MIC each have their own intent and their
  // own blob-handling path; without this flag they share state and
  // step on each other (clicking MIC while AUTO is on used to "pause
  // Sona" instead of recording a manual question).
  //
  //   'idle'   — recorder is not running
  //   'auto'   — AUTO loop owns the recorder; blob feeds the live
  //              accumulator + question detector
  //   'manual' — MIC button owns the recorder; blob is sent as a
  //              one-shot transcription with { manual: true }
  //
  // Always set this BEFORE calling startRecording/stopRecording so
  // every async callback (onstop → handleAudioData, handleRecordingStop)
  // sees the correct mode.
  const recordingModeRef = useRef<'idle' | 'auto' | 'manual'>('idle');
  const [recordingModeUI, setRecordingModeUI] = useState<'idle' | 'auto' | 'manual'>('idle');
  const setRecordingMode = useCallback((m: 'idle' | 'auto' | 'manual') => {
    recordingModeRef.current = m;
    setRecordingModeUI(m);
    // Update the chunk-mode snapshot only on non-idle modes, so the
    // value sticks across the eventual flip back to 'idle' that
    // happens when handleRecordingStop fires. handleAudioData reads
    // this in its async microtask AFTER mode is already 'idle' — so
    // it needs the last *active* mode, not the live one.
    if (m !== 'idle') chunkModeRef.current = m;
  }, []);

  // When MIC interrupts AUTO mid-chunk, the AUTO recorder's onstop
  // still fires async with whatever audio it captured. Without this
  // flag, that orphan blob would be sent to the transcription API and
  // injected into the question accumulator a second after the user
  // already started a manual recording.
  const discardNextBlobRef = useRef(false);

  // Tracks WHY stopRecording was called so the async onstop →
  // handleRecordingStop can choose whether to reset state. Without
  // this flag, an AUTO→manual handoff stop (toggle handler stops the
  // AUTO recorder, sets mode='manual', schedules manual start in
  // 300ms) races with onstop firing first and resetting mode to
  // 'idle' — the 300ms timer then sees the wrong mode and aborts
  // the manual start. Net effect: click does nothing, mic looks
  // stuck. With this flag, mode-switch stops short-circuit
  // handleRecordingStop and let the toggle handler stay in control.
  const stopReasonRef = useRef<'mode-switch' | null>(null);

  // Counts consecutive chunks the backend filter dropped as
  // "user-voice match" without any chunk getting through. When this
  // climbs past a threshold while filter is on, the filter is almost
  // certainly mis-classifying the interviewer as the candidate (too
  // similar voice / mic / accent) — we surface a one-click escape
  // hatch via the status bar. Reset on every accepted chunk.
  const consecutiveFilteredRef = useRef(0);
  const STUCK_FILTER_THRESHOLD = 5;

  // Snapshots which recording-mode each blob belongs to. Set
  // synchronously inside handleRecordingStop BEFORE we flip mode to
  // 'idle'; read by handleAudioData when the async onstop later
  // delivers the blob. Without this snapshot, handleAudioData would
  // always read mode='idle' (because handleRecordingStop has already
  // flipped it by the time the microtask fires) and every AUTO chunk
  // would silently fall through to the MANUAL branch — no
  // accumulation, no question detection, fragments fired to Sona one
  // chunk at a time.
  const chunkModeRef = useRef<'idle' | 'auto' | 'manual'>('idle');

  // Get store values first (must be before any useEffect that uses them)
  const {
    threshold,
    setStatus,
    setAudioLevel,
    isRecording: storeIsRecording,
    setIsRecording,
    setError,
    startListenTimer,
    stopListenTimer,
    voiceMode,
    voiceEnrolled,
    voiceFilterEnabled,
    autoEnrollPending,
    setAutoEnrollPending,
    setVoiceEnrolled,
    setVoiceFilterEnabled,
    setIsEnrolling,
  } = useSessionStore();

  // Get selected audio device
  const { selectedDeviceId } = useAudioDevices();

  // Accumulated transcription text for Live mode (chunks build up a full question)
  const accumulatedTextRef = useRef('');
  const lastChunkTimeRef = useRef(0);
  const questionCheckTimerRef = useRef<number | null>(null);

  // "User manually paused mid-Auto" flag — when set, handleRecordingStop
  // and the heartbeat/visibility safety nets honor it instead of yanking
  // the mic back on. Cleared the moment the user manually resumes (or
  // turns Auto off entirely).
  const userPausedRef = useRef(false);

  // Heartbeat plumbing — declared up here so handleAudioLevel can bump
  // the timestamp on every analyser tick. See the heartbeat useEffect
  // below for the full rationale.
  const lastHealthyAtRef = useRef(Date.now());
  const isStartingRef = useRef(false);

  // Wall-clock timestamp of when the *current* accumulation started.
  // Without this, scheduleQuestionCheck's per-chunk timer reset means
  // continuous speech (chunks arriving faster than `wait`) holds the
  // accumulator forever and Sona never fires until the user stops
  // AUTO. With this we force-flush after a hard ceiling so Q&A
  // streams continuously even when the user keeps speaking.
  const accumulationStartedAtRef = useRef<number>(0);
  // Last wall-clock instant the speaker crossed the speech threshold.
  // The flush logic uses this to keep a question open while the
  // interviewer is mid-sentence — so an utterance spoken across a pause
  // longer than the VAD silence window survives as ONE question instead
  // of being split into truncated fragments.
  const lastSpeechAtRef = useRef(0);
  // Hard cap on how long we'll hold an accumulation before force-flushing.
  // Behavioral (locked): 6 s ceiling — interviewer questions are short; a
  // 6 s hard cap means the worst-case flush is 6 s after the first chunk,
  // not 15 s. Coding/design keep 15 s to handle long mid-thought pauses.
  const MAX_ACCUM_MS = locked ? 6000 : 45000;
  // How long after the speaker's last audible moment we keep a flush
  // pending. Reduced from 4000/900 ms — the original values were tuned
  // for the user answering a question (long pauses, mid-thought gaps)
  // but behavioral uses this for the *interviewer* asking, where
  // questions are complete sentences. Faster flush = faster Sona answer.
  // Behavioral mode (locked=true) flushes faster: the interviewer speaks
  // in complete sentences with no mid-thought gaps, so the 1500/350 ms
  // coding/design defaults add dead time without benefit.
  const GLUE_HOLD_MS = locked ? 600 : 1500;
  const SHORT_HOLD_MS = locked ? 250 : 350;

  const flushAccumulatedText = useCallback(() => {
    const text = accumulatedTextRef.current.trim();
    onLiveTranscription?.(''); // clear live preview
    if (locked) window.dispatchEvent(new CustomEvent('lumora:behavioral-live-transcript', { detail: { text: '' } }));
    if (text.length > 5) {
      onTranscription?.(text);
      setStatus('ready', 'Question sent');
    }
    accumulatedTextRef.current = '';
    accumulationStartedAtRef.current = 0;
    if (questionCheckTimerRef.current) {
      clearTimeout(questionCheckTimerRef.current);
      questionCheckTimerRef.current = null;
    }
  }, [onTranscription, setStatus]);

  const scheduleQuestionCheck = useCallback(() => {
    // After receiving a chunk, wait briefly for "no new chunks" before
    // flushing. Two failure modes to balance:
    //   (a) flush too early → one question becomes 2-3 fragments
    //   (b) flush too late  → user keeps talking, timer keeps
    //                         resetting, Sona never fires
    //
    // The hard ceiling below (MAX_ACCUM_MS) bounds (b) absolutely so
    // continuous speech still produces continuous Q&A. These per-
    // chunk waits are only the "natural pause" detector for short
    // questions.
    //
    //   ends with `?` or `!`              →  400 ms (decisive)
    //   ends with `.`  AND looks-question →  500 ms
    //   ends with `.`                     →  800 ms
    //   long (>140 chars) + looks-question →  600 ms
    //   looks-question                    →  900 ms
    //   no signals                        → 1200 ms
    if (questionCheckTimerRef.current) clearTimeout(questionCheckTimerRef.current);

    // Hard ceiling: if we've been accumulating longer than MAX_ACCUM_MS
    // total, flush right now instead of rescheduling. This is the
    // primary defense against "user keeps talking, timer never fires."
    const heldFor = accumulationStartedAtRef.current
      ? Date.now() - accumulationStartedAtRef.current
      : 0;
    if (heldFor >= MAX_ACCUM_MS && accumulatedTextRef.current.trim().length > 5) {
      flushAccumulatedText();
      return;
    }

    const accumulated = accumulatedTextRef.current.trim();
    const lastChar = accumulated.slice(-1);
    const endsSentence = lastChar === '?' || lastChar === '!' || lastChar === '.';
    const looksQuestion = isQuestion(accumulated);
    const longEnough = accumulated.length > 140;
    const wordCount = accumulated ? accumulated.split(/\s+/).length : 0;
    // A short, unpunctuated capture is most likely the front half of a
    // sentence the speaker hasn't finished — e.g. the VAD cut "Tell me
    // about a time" off at a thinking pause. Hold these open longer so the
    // rest of the question can glue on; everything else flushes at
    // conversational speed.
    const likelyFragment = !endsSentence && wordCount < 6;
    const wait = locked ? (
      lastChar === '?' || lastChar === '!' ? 200 :
      lastChar === '.' && looksQuestion ? 250 :
      lastChar === '.' ? 400 :
      likelyFragment ? 350 :
      longEnough && looksQuestion ? 300 :
      looksQuestion ? 450 :
      600
    ) : (
      lastChar === '?' || lastChar === '!' ? 400 :
      lastChar === '.' && looksQuestion ? 500 :
      lastChar === '.' ? 800 :
      likelyFragment ? 700 :
      longEnough && looksQuestion ? 600 :
      looksQuestion ? 900 :
      1200
    );

    // Backstop timer in case heldFor catches up to MAX_ACCUM_MS in
    // the gap between chunks: cap the per-chunk wait so even if no
    // more chunks come, the soft timer fires before the ceiling.
    const remainingToCeiling = Math.max(200, MAX_ACCUM_MS - heldFor);
    const effectiveWait = Math.min(wait, remainingToCeiling);

    // Hold window after the speaker's last audible moment. Fragments wait
    // out a full VAD silence + transcription round-trip so a resumed
    // sentence glues on; complete utterances barely wait at all.
    const holdMs = likelyFragment ? GLUE_HOLD_MS : SHORT_HOLD_MS;

    // Self-polling flush: only commit the question once the speaker has
    // actually stopped (no audible speech for `holdMs`). While they're
    // still talking we re-check every 300 ms, bounded by MAX_ACCUM_MS so
    // the accumulator can never hang. This is what lets one question
    // survive a pause longer than the 2.5 s VAD silence window — the next
    // VAD segment's text appends (via handleAudioData → scheduleQuestionCheck)
    // before this ever flushes a half-question.
    const attemptFlush = () => {
      if (accumulatedTextRef.current.trim().length <= 5) return;
      const held = accumulationStartedAtRef.current
        ? Date.now() - accumulationStartedAtRef.current
        : 0;
      if (Date.now() - lastSpeechAtRef.current < holdMs && held < MAX_ACCUM_MS) {
        questionCheckTimerRef.current = window.setTimeout(attemptFlush, 300);
        return;
      }
      flushAccumulatedText();
    };

    questionCheckTimerRef.current = window.setTimeout(attemptFlush, effectiveWait);
  }, [flushAccumulatedText]);

  // Auto-enroll user's voice from first audio chunk in record-speaker mode
  const autoEnrollRef = useRef(false);
  const handleAutoEnroll = useCallback(async (blob: Blob) => {
    if (autoEnrollRef.current) return; // prevent double-fire
    autoEnrollRef.current = true;
    setIsEnrolling(true);
    setStatus('transcribe', 'Learning your voice...');
    try {
      const result = await speakerAPI.enroll(token!, blob, 'auto-enroll.webm');
      if (result.success) {
        setVoiceEnrolled(true);
        setVoiceFilterEnabled(true);
        setAutoEnrollPending(false);
        setStatus('listen', 'Voice learned — now filtering your voice');
      } else {
        setStatus('warn', 'Voice enrollment failed — transcribing everything');
        setAutoEnrollPending(false);
      }
    } catch (err: any) {
      console.error('[AutoEnroll] Failed:', err.message);
      setStatus('warn', 'Voice service unavailable — transcribing everything');
      setAutoEnrollPending(false);
    } finally {
      setIsEnrolling(false);
    }
  }, [token, setIsEnrolling, setVoiceEnrolled, setVoiceFilterEnabled, setAutoEnrollPending, setStatus]);

  const handleAudioData = useCallback(async (blob: Blob) => {
    if (!token) { setError('Not authenticated'); return; }

    // Read the live values at the moment the blob arrives, NOT the
    // closure'd ones from when this callback was memoized. Without
    // this, an auto-enrollment that just landed would still be
    // invisible to handleAudioData's deps (React batches), and the
    // very next blob would re-fire the "filter without enrollment"
    // branch and turn the filter back off — undoing the enrollment
    // immediately after it succeeded.
    const live = useSessionStore.getState();
    const voiceEnrolled = live.voiceEnrolled;
    const voiceFilterEnabled = live.voiceFilterEnabled;
    const voiceMode = live.voiceMode;
    const autoEnrollPending = live.autoEnrollPending;
    void live; // silence unused-variable lint when only fields above are read

    // Drop blobs that belong to a recording we already abandoned
    // (e.g., AUTO chunk interrupted because the user clicked MIC).
    if (discardNextBlobRef.current) {
      discardNextBlobRef.current = false;
      dlog('blob_discarded_for_mode_switch');
      return;
    }

    // Record Interviewer: auto-enroll user's voice from first chunk
    if (autoEnrollPending && !voiceEnrolled && voiceMode === 'record-speaker') {
      handleAutoEnroll(blob);
      // Also transcribe this first chunk (no filtering yet)
    }

    // Filter ON without enrollment is a stuck state — the toggle says
    // ON but there's no voice profile to compare against, so nothing
    // can be classified. We previously fail-closed (drop the audio
    // entirely) which produced "no voice recorded when filter is on"
    // because it looked like the mic was broken. Now: auto-disable
    // the filter, surface a clear warning, and let audio pass through
    // unfiltered so transcription still works. The user can re-enroll
    // if they want filtering back.
    if (voiceFilterEnabled && !voiceEnrolled && !(autoEnrollPending && voiceMode === 'record-speaker')) {
      setVoiceFilterEnabled(false);
      setStatus('warn', 'Filter auto-disabled — no voice enrolled. Audio is being transcribed unfiltered.');
      // fall through to non-filtered transcription
    }

    const shouldFilterVoice = voiceEnrolled && voiceFilterEnabled;
    // Read the mode the BLOB was recorded under, not the live mode.
    // handleRecordingStop runs synchronously before this microtask
    // and has already flipped recordingModeRef to 'idle', so reading
    // it directly always misroutes AUTO chunks to the MANUAL branch.
    // chunkModeRef is the snapshot taken before that flip.
    const isLiveMode = chunkModeRef.current === 'auto';

    if (isLiveMode) {
      // LIVE MODE: accumulate chunks, detect question completion
      setStatus('transcribe', shouldFilterVoice ? 'Analyzing speakers...' : 'Transcribing...');
      try {
        const result = await transcriptionAPI.transcribe(token, blob, 'audio.webm', shouldFilterVoice);
        if (result.skipped) {
          if (result.reason === 'hallucination_filtered') {
            // Whisper hallucination — mic is already restarting via
            // handleRecordingStop. No-op here.
            setStatus('listen', 'Listening...');
            dlog('chunk_skipped', { reason: 'hallucination' });
          } else {
            consecutiveFilteredRef.current += 1;
            const ratio = result.interviewer_ratio;
            // After N consecutive drops, the filter is stuck. Auto-
            // disable so the user isn't left wondering why no voice
            // is recorded. They can re-enable from VoiceEnrollment.
            if (consecutiveFilteredRef.current >= STUCK_FILTER_THRESHOLD && shouldFilterVoice) {
              setVoiceFilterEnabled(false);
              consecutiveFilteredRef.current = 0;
              setStatus('warn', `Filter dropped ${STUCK_FILTER_THRESHOLD}+ chunks in a row — auto-disabled. Re-enroll if your voice profile is stale.`);
            } else {
              const msg = ratio !== undefined
                ? `Your voice (${Math.round((1 - ratio) * 100)}%) - filtering... (${consecutiveFilteredRef.current})`
                : `Your voice detected - filtering... (${consecutiveFilteredRef.current})`;
              setStatus('listen', msg);
            }
            dlog('chunk_skipped', { reason: 'voice_match', ratio, streak: consecutiveFilteredRef.current });
          }
          return;
        }
        if (result.text && isLikelyRealSpeech(result.text)) {
          consecutiveFilteredRef.current = 0;
          // Stamp accumulation start on the first chunk so the
          // ceiling-based force-flush in scheduleQuestionCheck has a
          // clock to count from.
          if (!accumulatedTextRef.current.trim()) {
            accumulationStartedAtRef.current = Date.now();
          }
          accumulatedTextRef.current += ' ' + result.text;
          lastChunkTimeRef.current = Date.now();
          const accumulated = accumulatedTextRef.current.trim();
          setStatus('listen', `Heard: "${accumulated.slice(-60)}..."`);
          onLiveTranscription?.(accumulated);
          if (locked) window.dispatchEvent(new CustomEvent('lumora:behavioral-live-transcript', { detail: { text: accumulated } }));
          dlog('chunk_accepted', { len: result.text.length, accumLen: accumulatedTextRef.current.length });
          scheduleQuestionCheck();
        } else if (result.text) {
          // Suspected hallucination on a near-silent chunk — log and
          // discard. The transcript is shown in status briefly so the
          // user can tell we're still alive, but it never reaches the
          // accumulator and never gets sent to Sona.
          dlog('chunk_discarded_short', { text: result.text });
          setStatus('listen', 'Listening...');
        }
      } catch (err: any) {
        console.error('[Live] Transcription error:', err.message);
        setStatus('warn', 'Transcription error - retrying');
        dlog('chunk_error', { msg: err?.message });
      }
    } else {
      // MANUAL MODE: send entire recording as one question
      setStatus('transcribe', shouldFilterVoice ? 'Analyzing speakers...' : 'Transcribing...');
      try {
        const result = await transcriptionAPI.transcribe(token, blob, 'audio.webm', shouldFilterVoice);
        if (result.skipped) {
          if (result.reason === 'hallucination_filtered') {
            setStatus('ready', 'No speech detected - try again');
          } else {
            const ratio = result.interviewer_ratio;
            const msg = ratio !== undefined
              ? `Your voice (${Math.round((1 - ratio) * 100)}%) - filtering...`
              : 'Your voice detected - filtering...';
            setStatus('listen', msg);
            return;
          }
        }
        if (result.text) {
          onTranscription?.(result.text, { manual: true });
          setStatus('ready', 'Transcription complete');
        } else {
          console.warn('[mic] manual transcription returned empty', result);
          setStatus('ready', "Didn't catch that - try again");
        }
      } catch (error: any) {
        console.error('[mic] manual transcribe failed:', error?.message, error);
        const status = error?.status;
        if (status === 500 || status === 506) {
          setStatus('warn', 'Service unavailable - retrying');
        } else {
          setError(error.message || 'Transcription failed');
          setStatus('error', 'Transcription error');
        }
      }
    }
    // voiceEnrolled / voiceFilterEnabled / voiceMode / autoEnrollPending are
    // read live from the store inside the callback (above), so they're
    // intentionally NOT in the deps array — putting them here would
    // recreate this callback on every flag flip and re-bind the
    // recorder's onstop listener mid-recording.
  }, [token, setStatus, setError, onTranscription, handleAutoEnroll, scheduleQuestionCheck]);

  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
    // Ground-truth heartbeat: this callback only fires while the analyser
    // loop is actually running, which means the AudioContext is alive
    // and the MediaRecorder is wired up. If 4s pass without one of these
    // bumps, the heartbeat effect treats the recorder as stalled and
    // forces a fresh restart.
    lastHealthyAtRef.current = Date.now();
    // Track when the speaker is actually talking so the question
    // accumulator can hold a flush open across a mid-question pause and
    // glue the resumed sentence on. Mirror the VAD's own threshold
    // (floored at 0.003) so "speech" here means the same thing it does to
    // the recorder's silence gate.
    const speechRms = Math.max(useSessionStore.getState().threshold ?? 0.01, 0.003);
    if (level > speechRms) lastSpeechAtRef.current = Date.now();
  }, [setAudioLevel]);

  const handleRecordingStop = useCallback(() => {
    // Sync store state when VAD/maxDuration/onerror stops recording.
    // This is the SOLE owner of auto-mode restart — any other restart
    // path (e.g. transcription completion) caused the mic to be killed
    // mid-utterance via cleanup(). One owner = one deterministic loop.
    setIsRecording(false);
    stopListenTimer();

    // Mode-switch stops are owned by the toggle handler — it has
    // already set the next mode and will start the new recorder. If
    // we touched mode here, we'd race with the toggle handler and
    // freeze the mic on a stale state. See stopReasonRef comment.
    if (stopReasonRef.current === 'mode-switch') {
      stopReasonRef.current = null;
      dlog('recorder_stopped_mode_switch');
      return;
    }

    const stoppedMode = recordingModeRef.current;
    // chunkModeRef was already snapshotted by setRecordingMode the
    // last time the mode flipped to a non-idle value, so we don't
    // need to write it here.
    setRecordingMode('idle');
    setStatus('transcribe', 'Processing...');
    dlog('recorder_stopped', { stoppedMode, continuous: continuousModeRef.current, paused: userPausedRef.current });

    if (stoppedMode === 'manual') {
      // Manual one-shot just finished. If AUTO is configured ON,
      // resume the continuous loop from where it left off — but only
      // after a beat so the manual blob's transcription request has
      // a clean shot at the network without a sibling AUTO chunk
      // racing it.
      if (continuousModeRef.current && !userPausedRef.current) {
        setTimeout(async () => {
          if (!continuousModeRef.current || userPausedRef.current) return;
          if (recordingModeRef.current !== 'idle') return;
          setRecordingMode('auto');
          const ok = await (startRecordingRef.current?.() ?? Promise.resolve(false));
          if (!ok) {
            setRecordingMode('idle');
            setIsRecording(false);
            stopListenTimer();
            setStatus('warn', 'Mic unavailable — will retry');
            dlog('auto_resume_after_manual_failed');
            return;
          }
          setIsRecording(true);
          startListenTimer();
          setStatus('listen', 'Live - listening...');
          dlog('auto_resumed_after_manual');
        }, 400);
      } else {
        setStatus('ready', 'Ready');
      }
      return;
    }

    if (stoppedMode === 'auto' && continuousModeRef.current && !userPausedRef.current) {
      // 100 ms: gives the old recorder's onstop event time to fire and
      // deliver the blob before startRecording() creates the new recorder.
      // useAudioCapture now keeps the MediaStream alive across VAD cycles
      // (stream reuse), so startRecording() takes the fast path and the
      // actual dead zone is only these 100 ms — not 100 ms + getUserMedia.
      setTimeout(async () => {
        // Re-check inside the timeout: the user may have flipped Auto
        // off, paused, or pressed MIC (mode→manual) during the gap.
        if (!continuousModeRef.current || userPausedRef.current) {
          dlog('restart_aborted', { continuous: continuousModeRef.current, paused: userPausedRef.current });
          return;
        }
        if (recordingModeRef.current !== 'idle') {
          dlog('restart_aborted_mode_changed', { mode: recordingModeRef.current });
          return;
        }
        dlog('restart_after_chunk');
        setRecordingMode('auto');
        const ok = await (startRecordingRef.current?.() ?? Promise.resolve(false));
        if (!ok) {
          // getUserMedia failed — fall back to idle so the heartbeat
          // can recover cleanly instead of being stuck on a ghost
          // isRecording=true with no actual recorder running.
          setRecordingMode('idle');
          setIsRecording(false);
          stopListenTimer();
          setStatus('warn', 'Mic unavailable — will retry');
          dlog('restart_failed');
          return;
        }
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      }, 50);
    }
  }, [setIsRecording, stopListenTimer, startListenTimer, setStatus, setRecordingMode]);

  const {
    isSupported,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioCapture({
    onAudioData: handleAudioData,
    onAudioLevel: handleAudioLevel,
    onRecordingStop: handleRecordingStop,
    // Surface MediaRecorder/track errors in the status bar so the user
    // knows the mic dropped (e.g., USB unplug, permission revoked,
    // codec failure). The heartbeat will retry automatically; this is
    // just to break the silent-failure mode.
    onRecorderError: (msg) => setStatus('warn', `Mic: ${msg} — recovering...`),
    silenceThreshold: Math.max(threshold, 0.003),
    // Auto mode: 2500 ms of trailing silence ends a chunk. Background
    // noise from the interviewer briefly trips speechStartTimeRef; if
    // the window is too short (was 1500 ms) the recording stops before
    // the user has a chance to start their answer. 2500 ms covers the
    // natural "interviewer finishes → user gathers thoughts → speaks"
    // gap while still feeling live for back-to-back questions.
    // Manual mode: 3 s silence window — long enough to ride through
    // natural mid-thought pauses but short enough that the recording
    // closes itself when the user is genuinely done speaking.
    // Behavioral (locked): 1 s silence window — interviewer questions
    // end cleanly; shorter window means the chunk fires faster and Sona
    // can start answering sooner. Other modes keep the longer windows.
    silenceDuration: locked ? 2000 : (continuousMode ? 7000 : 3000),
    minSpeechDuration: 300,
    // Auto mode: 30 s ceiling. The prior 5 s ceiling force-fragmented
    // every behavioral question (which routinely run 20-45 s) and made
    // the double-restart kill window fire 6+ times per answer. 30 s
    // covers nearly all real interview questions while still preventing
    // a runaway recording if VAD silence detection misfires.
    // Manual mode: 5 min — a forgotten hot mic eventually closes itself.
    maxRecordingDuration: continuousMode ? 30000 : 300000,
    deviceId: selectedDeviceId,
  });

  // Store startRecording in ref for auto-restart
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  // Keep continuousMode ref in sync
  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  // Stable ref for active prop — used inside keyboard listeners so they
  // always read the current value without needing to re-bind on every change.
  const activeRef = useRef(active !== false);
  useEffect(() => { activeRef.current = active !== false; }, [active]);

  // Pause / resume when the owning tab becomes inactive / active.
  // active === undefined means "always active" (default for AICompanionPanel
  // and other always-visible AudioCaptures). Only coding/design pass false.
  const prevActiveRef = useRef(active !== false);
  useEffect(() => {
    if (active === undefined) return; // not controlled — skip
    const isNowActive = active !== false;
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isNowActive;
    if (wasActive === isNowActive) return;

    if (!isNowActive) {
      // Tab went inactive — immediately release the mic without sending audio.
      // This frees the MediaRecorder so the incoming tab's AudioCapture can
      // claim getUserMedia without fighting a concurrent MediaRecorder.
      if (recordingModeRef.current !== 'idle') {
        setRecordingMode('idle');
        setIsRecording(false);
        stopListenTimer();
        cancelRecording();
        setAudioLevel(0);
        dlog('tab_inactive_cancelled');
      }
    } else {
      // Tab became active — resume AUTO if it was running before.
      // Give the previous tab's AudioCapture 150 ms to finish releasing the
      // mic before we try to claim it, avoiding a double getUserMedia race.
      if (continuousModeRef.current && recordingModeRef.current === 'idle' && !isStartingRef.current) {
        isStartingRef.current = true;
        window.setTimeout(() => {
          if (!continuousModeRef.current || recordingModeRef.current !== 'idle') {
            isStartingRef.current = false;
            return;
          }
          setRecordingMode('auto');
          startRecordingRef.current?.();
          setIsRecording(true);
          startListenTimer();
          setStatus('listen', 'Live - listening...');
          window.setTimeout(() => { isStartingRef.current = false; }, 1000);
          dlog('tab_active_resumed');
        }, 150);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Auto-start recording on mount. Token is NOT required here — getUserMedia
  // needs no auth. handleAudioData guards on token when it sends to the API.
  useEffect(() => {
    if (autoStart && !hasAutoStarted && startRecordingRef.current && !storeIsRecording && continuousMode) {
      setHasAutoStarted(true);
      // Delay to ensure everything is ready
      const timer = setTimeout(() => {
        if (recordingModeRef.current !== 'idle') return;
        setRecordingMode('auto');
        startRecordingRef.current?.();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
        dlog('mount_autostart');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasAutoStarted, storeIsRecording, continuousMode, setIsRecording, startListenTimer, setStatus, setRecordingMode]);

  // Heartbeat: detect when Auto is on but the recorder has actually
  // stopped (encoder error swallowed, MediaRecorder internal failure,
  // OS sleep/wake, USB device reattach, permission revoked-then-restored).
  // Without this, the store and the actual recorder state can diverge —
  // UI says "listening" but no chunks ever arrive, and the only fix is
  // for the user to manually toggle Auto off/on. Heartbeat closes that
  // gap automatically within ~4 seconds. Ground-truth signal is
  // lastHealthyAtRef which is bumped from handleAudioLevel (only fires
  // while the analyser loop is actually running).
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!continuousModeRef.current || userPausedRef.current) {
        lastHealthyAtRef.current = Date.now();
        return;
      }
      // Reading store directly inside the interval avoids re-running
      // this effect on every isRecording flip (which would cancel and
      // re-create the timer in a tight loop).
      // lastHealthyAtRef is bumped from handleAudioLevel — it only
      // fires while the analyser loop is actually running. So even
      // when the store says isRecording=true, a stale lastHealthyAt
      // means the analyser stopped (laptop sleep/wake, OS audio
      // context suspended). Only short-circuit when BOTH the store
      // says recording AND we got a recent level bump.
      const state = useSessionStore.getState();
      const stalledMs = Date.now() - lastHealthyAtRef.current;
      if (state.isRecording && stalledMs < 4000) return;
      if (stalledMs > 4000 && !isStartingRef.current) {
        // Only the AUTO loop is self-healing. A stalled MANUAL
        // recording belongs to the user — they pressed the button,
        // they decide when to retry.
        if (recordingModeRef.current === 'manual') return;
        isStartingRef.current = true;
        dlog('heartbeat_recover', { stalledMs });
        // Async: await the result so we only mark healthy on success.
        // If startRecording fails, lastHealthyAtRef stays stale and the
        // heartbeat fires again in another 4 s — creating a proper retry
        // loop instead of a 4 s blind window on every failed attempt.
        (async () => {
          try {
            setRecordingMode('auto');
            const ok = await (startRecordingRef.current?.() ?? Promise.resolve(false));
            if (ok) {
              setIsRecording(true);
              startListenTimer();
              setStatus('listen', 'Live - listening...');
              lastHealthyAtRef.current = Date.now();
            } else {
              setRecordingMode('idle');
              setIsRecording(false);
              stopListenTimer();
              dlog('heartbeat_recover_failed');
              // lastHealthyAtRef intentionally NOT bumped → retries in 4 s
            }
          } finally {
            window.setTimeout(() => { isStartingRef.current = false; }, 1500);
          }
        })();
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [setIsRecording, startListenTimer, setStatus, setRecordingMode]);

  // Tab visibility: Chrome auto-suspends AudioContext when the tab is
  // backgrounded. While suspended, the analyser produces all-zero
  // frequency data — VAD never sees speech, no chunks fire, and the
  // current recording will eventually drop (no speechStartTime → blob
  // discarded by useAudioCapture). On refocus, do a clean restart so
  // the next chunk lands on a fresh AudioContext + MediaRecorder pair.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (!continuousModeRef.current || userPausedRef.current) return;
      // Don't yank the recorder away from a manual recording in
      // progress just because the tab regained focus.
      if (recordingModeRef.current === 'manual') return;
      const state = useSessionStore.getState();
      if (state.isRecording) {
        // Even if the store says "recording", the AudioContext likely
        // got suspended. Force a fresh start to be safe.
        dlog('visibility_refresh_active');
      } else {
        dlog('visibility_recover_idle');
      }
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      (async () => {
        try {
          setRecordingMode('auto');
          const ok = await (startRecordingRef.current?.() ?? Promise.resolve(false));
          if (ok) {
            setIsRecording(true);
            startListenTimer();
            setStatus('listen', 'Live - listening...');
            lastHealthyAtRef.current = Date.now();
          } else {
            setRecordingMode('idle');
            setIsRecording(false);
            stopListenTimer();
            dlog('visibility_recover_failed');
          }
        } finally {
          window.setTimeout(() => { isStartingRef.current = false; }, 1500);
        }
      })();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [setIsRecording, startListenTimer, setStatus, setRecordingMode]);

  // MIC button — ALWAYS does a one-shot manual recording, regardless
  // of AUTO state. Click once to start, click again to stop+send. If
  // AUTO is on and currently recording when the user clicks MIC, the
  // in-flight AUTO chunk is discarded (its blob would otherwise race
  // the manual transcription) and a fresh manual recording begins.
  // After manual completes, handleRecordingStop resumes the AUTO loop
  // if the user still has it on.
  const handleToggle = useCallback(() => {
    if (recordingModeRef.current === 'manual') {
      // Stop manual; the recorded blob will be sent as a manual
      // transcription via onstop → handleAudioData.
      stopRecording();
      setIsRecording(false);
      stopListenTimer();
      setStatus('transcribe', 'Sending...');
      // Defensive reset: if the recorder was already 'inactive' when
      // stopRecording was called (rare race during cleanup), onstop
      // never fires and handleRecordingStop never runs to flip mode
      // back to 'idle'. The button would stay on the stop icon
      // forever and clicking it would just hit this branch again.
      // 700 ms is past the 500 ms cleanup delay in useAudioCapture so
      // a normal stop has already cleared mode by then; this only
      // fires in the orphan-state case.
      window.setTimeout(() => {
        if (recordingModeRef.current === 'manual') {
          dlog('manual_stop_force_idle');
          setRecordingMode('idle');
          setStatus('ready', 'Ready');
        }
      }, 700);
      return;
    }

    if (recordingModeRef.current === 'auto') {
      // Interrupt AUTO: discard its in-flight blob, switch the
      // recorder over to MANUAL ownership, then start fresh. The
      // mode-switch flag tells handleRecordingStop to stay out of
      // our way — without it, onstop racing ahead of our 300 ms
      // timer would reset mode to 'idle' and the timer would abort
      // (button stuck on stop icon, click does nothing).
      stopReasonRef.current = 'mode-switch';
      discardNextBlobRef.current = true;
      stopRecording();
      setRecordingMode('manual');
      window.setTimeout(() => {
        // Re-assert manual in case anything cleared it during the
        // 300 ms gap; idempotent if already 'manual'.
        setRecordingMode('manual');
        startRecording();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Recording your question...');
      }, 300);
      return;
    }

    // recordingModeRef.current === 'idle'
    setRecordingMode('manual');
    startRecording();
    setIsRecording(true);
    startListenTimer();
    setStatus('listen', 'Recording your question...');
  }, [stopRecording, startRecording, setIsRecording, startListenTimer, stopListenTimer, setStatus, setRecordingMode]);

  // AUTO toggle — controls the continuous-listen loop ONLY. Does not
  // touch a manual recording; MIC owns its own state. If the user
  // toggles AUTO off while a manual capture is in flight, the manual
  // capture continues; we just won't restart auto when it finishes.
  const handleModeToggle = useCallback(() => {
    // Functional setState reads the LATEST continuousMode at execution
    // time. The previous closure-based read snapshotted the value at
    // the time handleModeToggle was created — when the keyboard
    // listener fires faster than React commits the next render (Cmd+
    // Shift+A pressed in rapid succession), the listener saw stale
    // continuousMode and the recording state desynced from the UI
    // (orange mic dot in OS menu bar without the AUTO pill lighting
    // up gold). Using `prev` keeps state in sync regardless of timing.
    let shouldStartRecording = false;
    setContinuousMode(prev => {
      const newMode = !prev;
      if (newMode) {
        userPausedRef.current = false;
        if (recordingModeRef.current === 'idle') {
          setRecordingMode('auto');
          setIsRecording(true);
          startListenTimer();
          setStatus('listen', 'Live - listening...');
          shouldStartRecording = true;
        } else {
          // Manual recording in flight — don't disturb it. AUTO
          // resumes when manual completes.
          setStatus('listen', 'Auto on — resumes after manual');
        }
      } else {
        // Turning AUTO off — only the AUTO recorder owner stops.
        if (recordingModeRef.current === 'auto') {
          stopRecording();
          setRecordingMode('idle');
          setIsRecording(false);
          stopListenTimer();
          setStatus('ready', 'Auto off');
        }
      }
      return newMode;
    });
    // Start recording outside the updater so it isn't called twice in
    // StrictMode. Roll back all state if it fails (e.g. mic permission
    // denied in browser) so the AUTO pill doesn't stay lit with no mic.
    if (shouldStartRecording) {
      startRecording().then(ok => {
        if (!ok) {
          setContinuousMode(false);
          setRecordingMode('idle');
          setIsRecording(false);
          stopListenTimer();
          setStatus('ready', 'Mic access denied — check browser settings');
        }
      });
    }
  }, [startRecording, stopRecording, setIsRecording, startListenTimer, stopListenTimer, setStatus, setRecordingMode]);

  // Keyboard shortcuts — Backquote toggles AUTO, Escape stops AUTO.
  // The manual one-shot mic was removed per user request, so Cmd+M
  // and the manual-press path are gone too. Only AUTO needs hotkeys.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable ||
        el.closest('.monaco-editor') ||
        el.getAttribute('role') === 'textbox'
      ) {
        return;
      }

      if (SHORTCUTS.STOP_MIC.includes(e.key) && storeIsRecording && recordingModeRef.current === 'auto') {
        e.preventDefault();
        handleModeToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [continuousMode, handleModeToggle, storeIsRecording]);

  // Global AUTO shortcuts — capture phase so they fire from anywhere:
  // textareas, Monaco, contenteditable, the behavioral companion input.
  // Two bindings: Cmd/Ctrl+Shift+A (silent/hidden) and Backquote (~/`)
  // which the user uses mid-interview. Neither conflicts with normal
  // typing since Cmd+Shift+A is OS-reserved and ` is not a useful
  // character to type in any interview panel.
  //
  // When `active === false` (coding/design tab hidden), suppress the
  // shortcut entirely so it doesn't toggle a background AudioCapture.
  // We use activeRef (a ref) so this effect never re-binds just because
  // the active prop changed — the ref is always up to date.
  useEffect(() => {
    const handleAutoShortcut = (e: KeyboardEvent) => {
      if (!activeRef.current) return; // ignore when owning tab is inactive
      // Cmd/Ctrl+Shift+A
      const isCmdShiftA = (e.metaKey || e.ctrlKey) && e.shiftKey &&
        (e.key === 'A' || e.key === 'a' || e.code === 'KeyA');
      // Backquote (` / ~) without modifier
      const isBackquote = e.code === 'Backquote' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
      if (!isCmdShiftA && !isBackquote) return;
      e.preventDefault();
      e.stopPropagation();
      handleModeToggle();
    };
    document.addEventListener('keydown', handleAutoShortcut, true);
    return () => document.removeEventListener('keydown', handleAutoShortcut, true);
  }, [handleModeToggle]);

  // Hydration: set mounted after all hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show nothing during SSR to prevent hydration mismatch
  if (!mounted) {
    return <div className="flex items-center gap-1 h-6" />;
  }

  if (!isSupported) {
    return (
      <div className="text-xs text-[var(--danger)]">
        Audio recording not supported in this browser
      </div>
    );
  }

  // Reference handleToggle so the keydown listener wiring above doesn't
  // get tree-shaken complaints — the manual mic button has been
  // removed from the UI per user request, but the underlying
  // function stays reachable for the Cmd+M / backtick shortcuts
  // (kept in case power users want them).
  void handleToggle;
  void recordingModeUI;
  return <UnifiedMicButton
    continuousMode={continuousMode}
    audioLevel={audioLevel}
    handleModeToggle={handleModeToggle}
    compact={compact}
    locked={locked}
  />;
}

/**
 * AUTO-only mic control. Per user request the manual one-shot mic
 * button is removed; the only entry point is the AUTO toggle which
 * starts/stops continuous listening. The audio meter sits beside it.
 *
 * compact=false (default): renders in a navy box with border — used in
 *   the global LumoraTopBar where it floats on its own.
 * compact=true: renders flat with no wrapper background/border — used
 *   when embedded in the coding/design toolbar strips that are already
 *   styled navy; the box-in-a-box otherwise looks like a popup overlay.
 */
const UnifiedMicButton = ({
  continuousMode, audioLevel,
  handleModeToggle, compact, locked,
}: {
  continuousMode: boolean;
  audioLevel: number;
  handleModeToggle: () => void;
  compact?: boolean;
  locked?: boolean;
}) => {
  const isAutoOn = continuousMode;

  const inner = (
    <>
      {/* MIC label — hidden in compact mode (toolbar already has enough labels) */}
      {!compact && (
        <span
          className="hidden md:inline font-mono text-[9px] font-bold tracking-[0.18em] uppercase shrink-0"
          style={{ color: 'var(--cam-strip-text)' }}
          aria-hidden="true"
        >
          MIC
        </span>
      )}

      {/* Behavioral locked mode — always-on LIVE pill, not a toggle */}
      {locked ? (
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1.5 rounded select-none"
          style={{
            color: '#0a0e1a',
            background: 'var(--cam-gold-leaf)',
            border: '1px solid var(--cam-gold-leaf)',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 0 0 2px rgba(201,162,39,0.45)',
          }}
          title="Sona is always listening during behavioral interviews"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary-dk)', animation: 'mic-pulse 1.4s ease-out infinite' }} />
          LIVE
        </span>
      ) : (
        /* AUTO toggle — coding/design tabs */
        <button
          type="button"
          onClick={(e) => { handleModeToggle(); e.currentTarget.blur(); }}
          className="relative text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1.5 rounded transition-colors"
          style={{
            color: isAutoOn ? '#0a0e1a' : 'var(--cam-strip-text)',
            background: isAutoOn ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${isAutoOn ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.18)'}`,
            fontFamily: 'var(--font-mono)',
            boxShadow: isAutoOn ? '0 0 0 2px rgba(201,162,39,0.45)' : 'none',
          }}
          title={isAutoOn
            ? 'AUTO is ON — Sona listens continuously. Click or press ` to stop.'
            : 'Turn on AUTO — Sona listens continuously and answers each question. Click or press `.'}
          aria-pressed={isAutoOn}
        >
          {isAutoOn ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary-dk)', animation: 'mic-pulse 1.4s ease-out infinite' }} />
              AUTO
            </span>
          ) : 'AUTO'}
        </button>
      )}

      {/* Audio-level meter */}
      <div
        className="flex items-end gap-[3px] shrink-0 px-1 py-0.5 rounded"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const lit = audioLevel > i * 0.02;
          return (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75"
              style={{
                height: `${8 + i * 2}px`,
                background: lit ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.25)',
                opacity: lit ? 1 : 0.6,
              }}
            />
          );
        })}
      </div>

    </>
  );

  if (compact) {
    // Flat — no wrapper box; the parent toolbar provides the container.
    return (
      <div className="flex items-center gap-2 shrink-0" aria-label="Audio controls">
        {inner}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 shrink-0 pl-2 pr-2.5 py-1 rounded-lg"
      style={{
        background: 'var(--cam-hero-strip)',
        border: '1px solid var(--cam-primary-dk)',
        boxShadow: 'inset 0 -2px 0 var(--cam-gold-leaf)',
      }}
      aria-label="Audio controls"
    >
      {inner}
    </div>
  );
}
