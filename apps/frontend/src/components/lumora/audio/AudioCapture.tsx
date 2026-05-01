import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioDevices } from './hooks/useAudioDevices';
import { useInterviewStore } from '@/stores/interview-store';
import { transcriptionAPI, speakerAPI } from '@/lib/api-client';
import { MicrophoneSelector } from './MicrophoneSelector';
import { useAuth } from '@/contexts/AuthContext';
import { isQuestion } from '@/lib/questionDetector';
import { InterviewerAudioPill } from './InterviewerAudio';

// Backward-compatible alias for the old SystemAudioButton — the
// implementation now lives in InterviewerAudio.tsx as InterviewerAudioPill,
// which consumes the shared InterviewerAudioProvider.
export const SystemAudioButton = (_props: { onTranscription?: (text: string) => void; disabled?: boolean }) => {
  return <InterviewerAudioPill />;
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
function dlog(event: string, data?: Record<string, unknown>) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('lumora_mic_debug') !== 'on') return;
    // eslint-disable-next-line no-console
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
function isLikelyRealSpeech(raw: string): boolean {
  // Defensive: if a non-string slips through (Whisper backend edge
  // case — see the matching guard in lumora-backend transcription.js),
  // reject. Whisper has never legitimately produced "[object Object]"
  // text; if it appears, it is upstream pollution, not speech.
  if (typeof raw !== 'string') return false;
  const text = raw.trim();
  if (!text) return false;
  if (text.includes('[object Object]')) return false;
  const last = text.slice(-1);
  if (last === '?' || last === '!') return true;
  const words = text.split(/\s+/);
  if (words.length >= 3) return true;
  if (text.length >= 14) return true;
  return false;
}

interface AudioCaptureProps {
  // `manual: true` means the user explicitly pressed the mic button — the
  // intent is unambiguous, so downstream `isQuestion()` filters MUST be
  // bypassed. Manual press = direct user action; auto = system guess.
  onTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  autoStart?: boolean;
}

export function AudioCapture({ onTranscription, autoStart = true }: AudioCaptureProps) {
  // Use centralized auth
  const { token } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  // Persist so the user sets Auto ON/OFF once before the interview and
  // never has to click (audible!) during the call. Stored under a
  // dedicated key; read synchronously at mount so there is no flicker.
  const [continuousMode, setContinuousMode] = useState<boolean>(() => {
    try { return localStorage.getItem('lumora_sona_auto') === 'on'; } catch { return false; }
  });
  const startRecordingRef = useRef<(() => void) | null>(null);
  const continuousModeRef = useRef(continuousMode);
  useEffect(() => {
    try { localStorage.setItem('lumora_sona_auto', continuousMode ? 'on' : 'off'); } catch {}
  }, [continuousMode]);

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
  }, []);

  // When MIC interrupts AUTO mid-chunk, the AUTO recorder's onstop
  // still fires async with whatever audio it captured. Without this
  // flag, that orphan blob would be sent to the transcription API and
  // injected into the question accumulator a second after the user
  // already started a manual recording.
  const discardNextBlobRef = useRef(false);

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
  } = useInterviewStore();

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

  const flushAccumulatedText = useCallback(() => {
    const text = accumulatedTextRef.current.trim();
    if (text.length > 5) {
      console.log('[Live] Flushing accumulated question:', text.slice(0, 100));
      onTranscription?.(text);
      setStatus('ready', 'Question sent');
    }
    accumulatedTextRef.current = '';
    if (questionCheckTimerRef.current) {
      clearTimeout(questionCheckTimerRef.current);
      questionCheckTimerRef.current = null;
    }
  }, [onTranscription, setStatus]);

  const scheduleQuestionCheck = useCallback(() => {
    // After receiving a chunk, wait for "no new chunks" before flushing
    // the accumulated transcript. We balance two failure modes:
    //   (a) flush too early → one question becomes 2-3 fragments
    //   (b) flush too late  → users wait 2-3 extra seconds for Sona
    //
    // Heuristic: punctuation + question-shape + length signals.
    //
    //   ends with `?` or `!`              →  500 ms   (decisive)
    //   ends with `.`  AND looks-question →  700 ms   (sentence boundary on
    //                                                  a question stem)
    //   ends with `.`                     →  1100 ms  (might continue)
    //   long (>140 chars) + looks-question →  900 ms  (Whisper-no-punct)
    //   looks-question                    →  1300 ms  (interview verbs)
    //   no signals                        →  2000 ms  (mid-sentence pause)
    //
    // Whisper rarely emits `?`, so we lean on isQuestion() to decide
    // whether the stem is the WHOLE question (length > 140 chars in a
    // questionable shape ≈ a complete utterance).
    if (questionCheckTimerRef.current) clearTimeout(questionCheckTimerRef.current);
    const accumulated = accumulatedTextRef.current.trim();
    const lastChar = accumulated.slice(-1);
    const looksQuestion = isQuestion(accumulated);
    const longEnough = accumulated.length > 140;
    const wait =
      lastChar === '?' || lastChar === '!' ? 500 :
      lastChar === '.' && looksQuestion ? 700 :
      lastChar === '.' ? 1100 :
      longEnough && looksQuestion ? 900 :
      looksQuestion ? 1300 :
      2000;
    questionCheckTimerRef.current = window.setTimeout(() => {
      if (accumulatedTextRef.current.trim().length > 5) {
        flushAccumulatedText();
      }
    }, wait);
  }, [flushAccumulatedText]);

  // Auto-enroll user's voice from first audio chunk in record-interviewer mode
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

    // Drop blobs that belong to a recording we already abandoned
    // (e.g., AUTO chunk interrupted because the user clicked MIC).
    if (discardNextBlobRef.current) {
      discardNextBlobRef.current = false;
      dlog('blob_discarded_for_mode_switch');
      return;
    }

    // Record Interviewer: auto-enroll user's voice from first chunk
    if (autoEnrollPending && !voiceEnrolled && voiceMode === 'record-interviewer') {
      handleAutoEnroll(blob);
      // Also transcribe this first chunk (no filtering yet)
    }

    // FAIL-CLOSED: if the user has the voice filter ON but never enrolled,
    // we cannot actually filter their voice. Previously we silently sent
    // filter_user_voice=false and transcribed everything (including the
    // user's own speech) — the toggle showed ON but did nothing. That
    // produced "filter is on but Sona still answers my voice."
    // Now: skip transcription entirely and surface a clear status that
    // points the user to the enrollment flow. Better to drop a real
    // question than to feed user-voice noise to Sona.
    if (voiceFilterEnabled && !voiceEnrolled && !(autoEnrollPending && voiceMode === 'record-interviewer')) {
      setStatus('warn', 'Voice filter is ON — enroll your voice in Audio Check first.');
      return;
    }

    const shouldFilterVoice = voiceEnrolled && voiceFilterEnabled;
    // Routing now keys off the RECORDER OWNER, not the AUTO toggle. A
    // user who clicks MIC while AUTO is on still gets a one-shot
    // manual transcription — the blob is theirs, not the loop's.
    const isLiveMode = recordingModeRef.current === 'auto';

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
            const ratio = result.interviewer_ratio;
            const msg = ratio !== undefined
              ? `Your voice (${Math.round((1 - ratio) * 100)}%) - filtering...`
              : 'Your voice detected - filtering...';
            setStatus('listen', msg);
            dlog('chunk_skipped', { reason: 'voice_match', ratio });
          }
          return;
        }
        if (result.text && isLikelyRealSpeech(result.text)) {
          accumulatedTextRef.current += ' ' + result.text;
          lastChunkTimeRef.current = Date.now();
          setStatus('listen', `Heard: "${accumulatedTextRef.current.trim().slice(-60)}..."`);
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
          console.log('[mic] manual transcription:', result.text.slice(0, 120));
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
  }, [token, setStatus, setError, onTranscription, voiceEnrolled, voiceFilterEnabled, voiceMode, autoEnrollPending, handleAutoEnroll, scheduleQuestionCheck]);

  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
    // Ground-truth heartbeat: this callback only fires while the analyser
    // loop is actually running, which means the AudioContext is alive
    // and the MediaRecorder is wired up. If 4s pass without one of these
    // bumps, the heartbeat effect treats the recorder as stalled and
    // forces a fresh restart.
    lastHealthyAtRef.current = Date.now();
  }, [setAudioLevel]);

  const handleRecordingStop = useCallback(() => {
    // Sync store state when VAD/maxDuration/onerror stops recording.
    // This is the SOLE owner of auto-mode restart — any other restart
    // path (e.g. transcription completion) caused the mic to be killed
    // mid-utterance via cleanup(). One owner = one deterministic loop.
    setIsRecording(false);
    stopListenTimer();

    const stoppedMode = recordingModeRef.current;
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
        setTimeout(() => {
          if (!continuousModeRef.current || userPausedRef.current) return;
          if (recordingModeRef.current !== 'idle') return;
          setRecordingMode('auto');
          startRecordingRef.current?.();
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
      // 250 ms gives the browser time to finalize the previous blob
      // dispatch (onstop → ondataavailable) before we tear down audio
      // resources for the next recording.
      setTimeout(() => {
        // Re-check inside the timeout: the user may have flipped Auto
        // off, paused, or pressed MIC (mode→manual) during the 250 ms
        // window. Without this gate, AUTO would re-arm and steal the
        // recorder back from a manual recording in flight.
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
        startRecordingRef.current?.();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      }, 250);
    }
  }, [setIsRecording, stopListenTimer, startListenTimer, setStatus, setRecordingMode]);

  const {
    isSupported,
    error,
    audioLevel,
    startRecording,
    stopRecording,
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
    // Auto mode: 1500 ms of trailing silence ends a chunk. The previous
    // 800 ms was too aggressive — natural mid-sentence breath / pause
    // breaks ("Tell me about a time… [breath]… I handled conflict")
    // were tripping the silence stop, fragmenting one question into
    // 2-3 transcription cycles, each of which lost ~200 ms of audio
    // across the restart. 1500 ms holds through a normal pause but
    // still feels live (Sona starts answering ~1.5 s after the
    // interviewer finishes).
    // Manual mode: 3 s silence window — long enough to ride through
    // natural mid-thought pauses but short enough that the recording
    // closes itself when the user is genuinely done speaking.
    silenceDuration: continuousMode ? 1500 : 3000,
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

  // Auto-start recording on mount when token is available
  useEffect(() => {
    if (autoStart && token && !hasAutoStarted && startRecordingRef.current && !storeIsRecording && continuousMode) {
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
  }, [autoStart, token, hasAutoStarted, storeIsRecording, continuousMode, setIsRecording, startListenTimer, setStatus, setRecordingMode]);

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
      const state = useInterviewStore.getState();
      if (state.isRecording) {
        // Note: lastHealthyAtRef is bumped from the audio-level
        // callback in handleAudioLevel — that fires only while the
        // analyser loop is actually running. We treat store-says-
        // recording as a soft signal; the audio-level bump is the
        // ground truth.
        return;
      }
      const stalledMs = Date.now() - lastHealthyAtRef.current;
      if (stalledMs > 4000 && !isStartingRef.current) {
        // Only the AUTO loop is self-healing. A stalled MANUAL
        // recording belongs to the user — they pressed the button,
        // they decide when to retry.
        if (recordingModeRef.current === 'manual') return;
        isStartingRef.current = true;
        dlog('heartbeat_recover', { stalledMs });
        try {
          setRecordingMode('auto');
          startRecordingRef.current?.();
          setIsRecording(true);
          startListenTimer();
          setStatus('listen', 'Live - listening...');
        } finally {
          // Release the lock after a beat so we don't re-fire on the
          // next tick before getUserMedia resolves.
          window.setTimeout(() => { isStartingRef.current = false; }, 1500);
        }
        lastHealthyAtRef.current = Date.now();
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
      const state = useInterviewStore.getState();
      if (state.isRecording) {
        // Even if the store says "recording", the AudioContext likely
        // got suspended. Force a fresh start to be safe.
        dlog('visibility_refresh_active');
      } else {
        dlog('visibility_recover_idle');
      }
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      try {
        setRecordingMode('auto');
        startRecordingRef.current?.();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      } finally {
        window.setTimeout(() => { isStartingRef.current = false; }, 1500);
      }
      lastHealthyAtRef.current = Date.now();
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
      return;
    }

    if (recordingModeRef.current === 'auto') {
      // Interrupt AUTO: discard its in-flight blob, switch the
      // recorder over to MANUAL ownership, then start fresh.
      discardNextBlobRef.current = true;
      stopRecording();
      // useAudioCapture's stopRecording schedules a 500 ms cleanup,
      // and startRecording itself runs a synchronous cleanup on the
      // current recorder. We need a beat between the two so the
      // browser can finalize the AUTO recorder's onstop (which fires
      // async) before we ask for a new MediaStream.
      setRecordingMode('manual');
      setTimeout(() => {
        if (recordingModeRef.current !== 'manual') return;
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
    const newMode = !continuousMode;
    setContinuousMode(newMode);

    if (newMode) {
      userPausedRef.current = false;
      // Only seize the recorder if nothing else owns it.
      if (recordingModeRef.current === 'idle') {
        setRecordingMode('auto');
        startRecording();
        setIsRecording(true);
        startListenTimer();
        setStatus('listen', 'Live - listening...');
      } else {
        // Manual recording is in flight — don't disturb it. AUTO will
        // pick up automatically when manual completes.
        setStatus('listen', 'Auto on — resumes after manual');
      }
      return;
    }

    // Turning AUTO off
    if (recordingModeRef.current === 'auto') {
      stopRecording();
      setRecordingMode('idle');
      setIsRecording(false);
      stopListenTimer();
      setStatus('ready', 'Auto off');
    }
    // If a manual recording is in flight, leave it alone.
  }, [continuousMode, startRecording, stopRecording, setIsRecording, startListenTimer, stopListenTimer, setStatus, setRecordingMode]);

  // Keyboard shortcuts — Cmd+M (toggle) + Escape (stop) work regardless
  // of Auto state. The user needs silent, instant mute mid-interview;
  // gating these on continuousMode trapped them when Auto was on.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in any editable element
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

      // Cmd/Ctrl+M: Toggle mic (no conflict with typing)
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        handleToggle();
        return;
      }

      // Backquote (` / ~): hard mic on/off across Coding, Design, and
      // Behavioral views. Routes to handleModeToggle (Auto) rather than
      // handleToggle (single-shot) so the mic stays on until the user
      // presses ` again — single-shot's VAD stops on 1.5s of silence,
      // which made the backtick feel "unstable" (mic would die mid-thought).
      // Ignored when any modifier is held (Cmd+`/Ctrl+` belong to the OS).
      if (e.code === SHORTCUTS.TOGGLE_MIC_CODE && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleModeToggle();
        return;
      }

      // Escape: Stop mic. Routes through the same handlers so AUTO
      // and MANUAL stay isolated — a manual capture stops as a
      // manual capture, and an AUTO loop turns off cleanly.
      if (SHORTCUTS.STOP_MIC.includes(e.key) && storeIsRecording) {
        e.preventDefault();
        if (recordingModeRef.current === 'manual') {
          handleToggle();
        } else if (recordingModeRef.current === 'auto') {
          handleModeToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [continuousMode, handleToggle, handleModeToggle, storeIsRecording, stopRecording, setIsRecording, stopListenTimer, setStatus]);

  // Silent Auto toggle: Cmd/Ctrl+Shift+A works from anywhere on the Lumora
  // page, including while Auto is ON. A keystroke is inaudible to the
  // interviewer where a mouse click isn't, so the user can flip Sona on/off
  // mid-call without raising suspicion. Never fires inside editable fields.
  useEffect(() => {
    const handleAutoShortcut = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;
      if (e.key !== 'A' && e.key !== 'a') return;
      const el = e.target as HTMLElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable ||
        el.closest?.('.monaco-editor') ||
        el.getAttribute?.('role') === 'textbox'
      ) return;
      e.preventDefault();
      handleModeToggle();
    };
    window.addEventListener('keydown', handleAutoShortcut);
    return () => window.removeEventListener('keydown', handleAutoShortcut);
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

  return <UnifiedMicButton
    continuousMode={continuousMode}
    recordingMode={recordingModeUI}
    audioLevel={audioLevel}
    handleToggle={handleToggle}
    handleModeToggle={handleModeToggle}
  />;
}

/**
 * Single mic control replacing the old Live/Manual mode selector.
 *
 *   Mic button  → one-shot recording toggle (tap to start, tap to stop)
 *   AUTO pill   → continuous-listening toggle (one click to turn on,
 *                 one click to turn off — Sona keeps listening and fires
 *                 only on real interview questions)
 *
 * No long-press, no hold-to-activate — every action is a single click
 * so it works reliably across mice, trackpads, and touch. */
function UnifiedMicButton({
  continuousMode, recordingMode, audioLevel,
  handleToggle, handleModeToggle,
}: {
  continuousMode: boolean;
  recordingMode: 'idle' | 'auto' | 'manual';
  audioLevel: number;
  handleToggle: () => void;
  handleModeToggle: () => void;
}) {
  // AUTO indicator lights up purely on the AUTO toggle state — even
  // when MIC has temporarily seized the recorder for a manual capture,
  // AUTO stays "on" because the user wants it back when manual finishes.
  const isAutoOn = continuousMode;
  // MIC indicator lights up only when MANUAL owns the recorder.
  const isManualRec = recordingMode === 'manual';

  return (
    // LeetCode pillbox groups MIC + AUTO + meter into one tool-window
    // unit, matching the Sona panel header and tab bar. Navy hero-strip
    // background + 2px gold-leaf underline so the audio controls read
    // as first-class chrome instead of fading into the surrounding bar.
    <div
      className="flex items-center gap-2 shrink-0 pl-2 pr-2.5 py-1 rounded-lg"
      style={{
        background: 'var(--cam-hero-strip)',
        border: '1px solid var(--cam-primary-dk)',
        boxShadow: 'inset 0 -2px 0 var(--cam-gold-leaf)',
      }}
      aria-label="Audio controls"
    >
      {/* Group label — tiny mono "MIC" tag tells the user what this
          cluster is, even when no controls are active. Hidden on the
          narrowest screens to save horizontal room. White-on-navy now
          that the container uses cam-hero-strip. */}
      <span
        className="hidden md:inline font-mono text-[9px] font-bold tracking-[0.18em] uppercase shrink-0"
        style={{ color: 'rgba(255,255,255,0.85)' }}
        aria-hidden="true"
      >
        MIC
      </span>

      {/* Mic button — always clickable. When Auto is ON, click pauses
          Sona's listening (mute) and another click resumes. Manual
          override is critical mid-interview when the user needs to
          stop Sona on a dime — disabling the button traps the user.
          Sized 36×36 at all breakpoints (was 32–40 reversed) so the
          target is consistent on touch and mouse. Active state lights
          up gold-leaf to match the AUTO toggle and SHORT/DETAILED
          tabs — one consistent active grammar across Lumora. */}
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={handleToggle}
          className="relative flex items-center justify-center rounded-full transition-all select-none w-9 h-9"
          style={{
            background: isManualRec ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${isManualRec ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.20)'}`,
            color: isManualRec ? 'var(--cam-primary-dk)' : 'rgba(255,255,255,0.90)',
            boxShadow: isManualRec ? '0 0 0 3px rgba(201,162,39,0.35)' : 'none',
            cursor: 'pointer',
          }}
          aria-pressed={isManualRec}
          title={
            isManualRec
              ? 'Recording your question — click or press ` to stop and send to Sona.'
              : 'Click or press ` to record a one-shot question (works whether AUTO is on or off).'
          }
        >
          {isManualRec ? (
            // Manual recording: filled stop square
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          ) : (
            // Idle: outlined mic
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}

          {/* Pulsing halo when MANUAL is recording. AUTO has its own
              indicator on the AUTO pill — they no longer share this
              halo, so the user can see at a glance which mode is
              currently capturing audio. */}
          {isManualRec && (
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: '1px solid var(--cam-gold-leaf)',
                animation: 'mic-pulse 1.4s ease-out infinite',
                opacity: 0.7,
              }}
            />
          )}
        </button>
      </div>

      {/* AUTO toggle — independent of the MIC button. Lights up based
          on whether continuous-listen is enabled, regardless of which
          mode currently owns the recorder. */}
      <button
        type="button"
        onClick={handleModeToggle}
        className="text-[11px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded transition-colors relative"
        style={{
          color: isAutoOn ? 'var(--cam-primary-dk)' : 'rgba(255,255,255,0.85)',
          background: isAutoOn ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${isAutoOn ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.20)'}`,
          fontFamily: 'var(--font-mono)',
          boxShadow: isAutoOn && recordingMode === 'auto' ? '0 0 0 2px rgba(201,162,39,0.45)' : 'none',
        }}
        title={isAutoOn
          ? 'Auto is ON — Sona listens continuously. Click or press ⌘⇧A to stop.'
          : 'Turn on Auto — Sona listens continuously and answers each question. Click or press ⌘⇧A.'}
        aria-pressed={isAutoOn}
      >
        {isAutoOn ? '● AUTO' : 'AUTO'}
      </button>

      {/* Audio-level meter — bars light up gold-leaf as the rolling
          RMS crosses each threshold. Track is a translucent white
          well on the navy strip so silent bars are still visible. */}
      <div
        className="flex items-end gap-[3px] shrink-0 px-1 py-0.5 rounded"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
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
                background: lit ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.45)',
                opacity: lit ? 1 : 0.6,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes mic-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
