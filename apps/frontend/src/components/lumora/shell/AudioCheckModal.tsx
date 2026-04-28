import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAudioPrefs, patchAudioPrefs } from '@/lib/audio-preferences';
import { useInterviewStore } from '@/stores/interview-store';

/* ── AudioCheckModal ─────────────────────────────────────────
   Full audio configuration panel for Lumora. Reachable from the
   sidebar "Audio Check" item. Covers:
   - Input (mic) selection with live RMS level meter
   - Output (speaker) selection with test-tone + sample clip playback
     (uses HTMLMediaElement.setSinkId when the browser supports it)
   - Processing toggles: echo cancellation, noise suppression, auto-gain
   - Record + playback loopback test
   - Permission status and a quick "refresh devices" action

   The modal owns its own MediaStream so opening/closing is cheap and
   doesn't fight with the live transcription capture pipeline. */

type AudioOutputDevice = { deviceId: string; label: string };
type AudioInputDevice = { deviceId: string; label: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioCheckModal({ isOpen, onClose }: Props) {
  const interviewerActive = useInterviewStore((s) => s.interviewerAudio.active);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [inputs, setInputs] = useState<AudioInputDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioOutputDevice[]>([]);
  // Initialize from canonical prefs so the modal shows whatever the
  // wizard / live capture is using, not just the OS default.
  const [selectedInput, setSelectedInput] = useState<string>(() => loadAudioPrefs().micDeviceId || '');
  const [selectedOutput, setSelectedOutput] = useState<string>(() => loadAudioPrefs().speakerDeviceId || '');
  const [echoCancel, setEchoCancel] = useState(true);
  const [noiseSuppress, setNoiseSuppress] = useState(true);
  const [autoGain, setAutoGain] = useState(true);
  const [level, setLevel] = useState(0); // 0..1
  const [recState, setRecState] = useState<'idle' | 'recording' | 'ready'>('idle');
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Live objects (refs so they survive re-render without re-creating)
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const supportsSinkId = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

  const stopStream = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    try { analyserRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    analyserRef.current = null;
    audioCtxRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLevel(0);
  }, []);

  const enumerate = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const ins: AudioInputDevice[] = [];
      const outs: AudioOutputDevice[] = [];
      devs.forEach((d, i) => {
        if (d.kind === 'audioinput') ins.push({ deviceId: d.deviceId, label: d.label || (d.deviceId === 'default' ? 'Default microphone' : `Microphone ${i + 1}`) });
        else if (d.kind === 'audiooutput') outs.push({ deviceId: d.deviceId, label: d.label || (d.deviceId === 'default' ? 'Default speaker' : `Speaker ${i + 1}`) });
      });
      setInputs(ins);
      setOutputs(outs);
      // Honor the canonical prefs first; fall back to OS default if the
      // saved device isn't connected anymore.
      const prefs = loadAudioPrefs();
      if (ins.length) {
        if (!selectedInput && prefs.micDeviceId && ins.some(d => d.deviceId === prefs.micDeviceId)) {
          setSelectedInput(prefs.micDeviceId);
        } else if (!selectedInput) {
          setSelectedInput(ins[0].deviceId);
        }
      }
      if (outs.length) {
        if (!selectedOutput && prefs.speakerDeviceId && outs.some(d => d.deviceId === prefs.speakerDeviceId)) {
          setSelectedOutput(prefs.speakerDeviceId);
        } else if (!selectedOutput) {
          setSelectedOutput(outs[0].deviceId);
        }
      }
    } catch (err: any) {
      setToast(err?.message || 'Could not list audio devices');
    }
  }, [selectedInput, selectedOutput]);

  const startMic = useCallback(async (deviceId: string) => {
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: echoCancel,
          noiseSuppression: noiseSuppress,
          autoGainControl: autoGain,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermission('granted');

      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        setLevel(Math.min(1, rms * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      // After permission, re-enumerate so labels populate
      enumerate();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') setPermission('denied');
      setToast(err?.message || 'Could not open microphone');
    }
  }, [echoCancel, noiseSuppress, autoGain, enumerate, stopStream]);

  // Open / close lifecycle
  useEffect(() => {
    if (!isOpen) { stopStream(); return; }
    // Check permission where supported
    (navigator as any).permissions?.query?.({ name: 'microphone' as PermissionName })
      .then((st: PermissionStatus) => setPermission((st.state as any) || 'unknown'))
      .catch(() => {});
    enumerate();
    return () => { stopStream(); };
  }, [isOpen, enumerate, stopStream]);

  // Start/restart mic when selected device or processing toggles change.
  // Skip the test stream entirely when the live interviewer-audio
  // capture is active — opening a second getUserMedia on the same
  // physical mic mid-interview can corrupt buffers on Chrome/macOS
  // and silently fail on iOS Safari. The user can still pick a new
  // device (it persists), they just won't see a level meter until
  // they pause the interview.
  useEffect(() => {
    if (!isOpen || !selectedInput) return;
    if (interviewerActive) return;
    startMic(selectedInput);
    return () => { stopStream(); };
  }, [isOpen, interviewerActive, selectedInput, echoCancel, noiseSuppress, autoGain, startMic, stopStream]);

  // Persist mic + speaker choices to the canonical prefs store so the
  // wizard, live AudioCapture, and this modal stay in sync.
  useEffect(() => {
    if (!isOpen || !selectedInput) return;
    patchAudioPrefs({ micDeviceId: selectedInput });
  }, [isOpen, selectedInput]);
  useEffect(() => {
    if (!isOpen || !selectedOutput) return;
    patchAudioPrefs({ speakerDeviceId: selectedOutput });
  }, [isOpen, selectedOutput]);

  // Close on Escape — backdrop click was the only escape path before.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Swap <audio>.sinkId when user picks a different speaker
  useEffect(() => {
    const el = testAudioRef.current as any;
    if (!el || !selectedOutput || !supportsSinkId) return;
    el.setSinkId?.(selectedOutput).catch((err: any) => setToast(`Can't switch speaker: ${err?.message || 'not supported'}`));
  }, [selectedOutput, supportsSinkId]);

  const playTestTone = useCallback(async () => {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new Ctx();
      // Chromium sometimes spawns the context in 'suspended' state even
      // inside a user-gesture click handler — resume() is a no-op when
      // already running, but unblocks the silent-but-not-erroring case.
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }
      if (supportsSinkId && selectedOutput && 'setSinkId' in (ctx as any)) {
        try { await (ctx as any).setSinkId(selectedOutput); } catch {}
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440; // A4
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
      osc.onended = () => ctx.close();
    } catch (err: any) {
      console.error('[AudioCheck] test tone failed', err);
      setToast(err?.message || 'Could not play test tone');
    }
  }, [supportsSinkId, selectedOutput]);

  const toggleRecording = useCallback(async () => {
    if (recState === 'recording') {
      recorderRef.current?.stop();
      return;
    }
    if (!streamRef.current) { setToast('Grant mic access first'); return; }
    try {
      recChunksRef.current = [];
      if (recUrl) { URL.revokeObjectURL(recUrl); setRecUrl(null); }
      const rec = new MediaRecorder(streamRef.current);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size) recChunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecUrl(url);
        setRecState('ready');
      };
      rec.start();
      setRecState('recording');
      // Hard cap at 8s so the user can't accidentally run forever
      setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 8000);
    } catch (err: any) {
      setToast(err?.message || 'Recording failed');
    }
  }, [recState, recUrl]);

  if (!isOpen) return null;

  const levelPct = Math.round(level * 100);
  const levelColor = level < 0.15 ? 'var(--text-dimmed)' : level < 0.6 ? '#10B981' : level < 0.85 ? '#F59E0B' : 'var(--danger)';

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Audio check"
    >
      <div className="w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontFamily: "'Inter', var(--font-sans)", maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary-dk)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Audio check</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pick devices, verify levels, test mic + speaker before your interview.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Active-capture warning. The modal cannot open its own
              getUserMedia stream while the live interviewer audio
              capture is running — concurrent streams on the same
              device can corrupt buffers on Chrome/macOS and silently
              fail on iOS Safari. We let the user change device
              selection (which persists), but suppress the test stream
              until they stop the live capture. */}
          {interviewerActive && (
            <div
              className="px-3 py-2.5 rounded-md text-[12px] flex items-start gap-2"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)', color: 'var(--text-primary)' }}
            >
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#F59E0B' }} />
              <div>
                <div className="font-bold">Live interview is recording</div>
                <div className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Device changes here are saved and apply immediately, but the level meter and recording test are paused so we don't fight with the live capture. Stop the live capture from the topbar pill if you want to test in real time.
                </div>
              </div>
            </div>
          )}

          {/* Permission status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px]" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: permission === 'granted' ? 'var(--success)' : permission === 'denied' ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            <span className="w-2 h-2 rounded-full" style={{ background: permission === 'granted' ? 'var(--success)' : permission === 'denied' ? 'var(--danger)' : 'var(--text-dimmed)' }} />
            {permission === 'granted' ? 'Microphone permission granted' :
             permission === 'denied' ? 'Microphone blocked — update your browser site settings and reload' :
             permission === 'prompt' ? 'Waiting for microphone permission' : 'Checking microphone…'}
            <button onClick={enumerate} className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded hover:bg-black/5" style={{ color: 'var(--cam-primary-dk)' }}>Refresh</button>
          </div>

          {/* Input — Microphone */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Microphone</h3>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{inputs.length} device{inputs.length !== 1 ? 's' : ''}</span>
            </div>
            <select
              value={selectedInput}
              onChange={(e) => setSelectedInput(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-md"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {inputs.length === 0 && <option value="">No microphones found</option>}
              {inputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>

            {/* Live level meter */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Input level</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{levelPct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-[width] duration-75" style={{ width: `${levelPct}%`, background: levelColor }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Speak normally — you want the bar staying mostly green with occasional amber peaks.</p>
            </div>

            {/* Processing toggles */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                ['Echo cancellation', echoCancel, setEchoCancel, 'Removes your own voice coming back through the speaker.'],
                ['Noise suppression', noiseSuppress, setNoiseSuppress, 'Dampens keyboard, fans, and background chatter.'],
                ['Auto-gain', autoGain, setAutoGain, 'Normalises your voice volume so the interviewer hears you consistently.'],
              ] as [string, boolean, (b: boolean) => void, string][]).map(([label, val, set, hint]) => (
                <button
                  key={label}
                  onClick={() => set(!val)}
                  className="text-left px-3 py-2 rounded-md transition-colors"
                  style={{ background: val ? 'var(--accent-subtle)' : 'var(--bg-surface)', border: `1px solid ${val ? 'var(--cam-primary-lt)' : 'var(--border)'}` }}
                  title={hint}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
                    <span className="w-8 h-4 rounded-full relative transition-colors" style={{ background: val ? 'var(--cam-primary)' : 'var(--text-dimmed)' }}>
                      <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-[left]" style={{ left: val ? 18 : 2 }} />
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Output — Speaker */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Speaker</h3>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{outputs.length} device{outputs.length !== 1 ? 's' : ''}</span>
            </div>
            <select
              value={selectedOutput}
              onChange={(e) => setSelectedOutput(e.target.value)}
              disabled={!supportsSinkId}
              className="w-full px-3 py-2 text-[13px] rounded-md"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {outputs.length === 0 && <option value="">No speakers found</option>}
              {outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>
            {!supportsSinkId && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Your browser (likely Safari/Firefox) doesn't let web pages pick the speaker — use the OS output picker instead.</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={playTestTone}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider rounded-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  color: '#FFFFFF',
                  background: 'var(--cam-primary)',
                  border: '1px solid var(--cam-primary)',
                  boxShadow: '0 4px 12px rgba(38,97,156,0.32)',
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Play test tone
              </button>
              <audio ref={testAudioRef} preload="none" />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>A 1-second 440 Hz tone. You should hear it clearly in the selected speaker.</p>
            </div>
          </section>

          {/* Record + playback */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-primary)' }}>Record + playback</h3>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Say a sentence, then play it back — confirms both the mic and speaker end-to-end. Capped at 8 seconds.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={toggleRecording}
                disabled={permission === 'denied' || interviewerActive}
                title={interviewerActive ? 'Stop the live interview from the topbar to use the recording test.' : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors disabled:opacity-40"
                style={recState === 'recording'
                  ? { color: '#FFFFFF', background: 'var(--danger)', border: '1px solid var(--danger)' }
                  : { color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                {recState === 'recording' ? (
                  <><span className="w-2 h-2 rounded-full bg-white animate-pulse" />Stop recording</>
                ) : (
                  <><span className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />{recState === 'ready' ? 'Record again' : 'Start recording'}</>
                )}
              </button>
              {recUrl && (
                <audio controls src={recUrl} className="h-8" />
              )}
            </div>
          </section>

          {/* Zoom / virtual-audio tip */}
          <section className="rounded-md p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-primary)' }}>Interview-platform settings</h3>
            <ul className="text-[12px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>• <strong>Zoom / Teams / Meet:</strong> match the mic and speaker above to the same devices in the meeting app's audio settings — otherwise Lumora will transcribe a different stream than the interviewer hears.</li>
              <li>• <strong>Auto-adjust volume:</strong> turn OFF in Zoom when running Lumora — it fights with our auto-gain and causes level pumping.</li>
              <li>• <strong>Original sound / music mode:</strong> leave OFF — Lumora is tuned for standard speech.</li>
              <li>• <strong>Headphones recommended:</strong> prevents the interviewer's audio from bleeding back into your mic and confusing the transcript.</li>
            </ul>
          </section>

          {toast && (
            <div className="px-3 py-2 rounded-md text-[12px]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              {toast}
              <button onClick={() => setToast(null)} className="ml-2 font-bold hover:underline">Dismiss</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Settings apply immediately to the main Lumora mic pipeline.</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors"
            style={{ color: '#FFFFFF', background: 'var(--cam-primary-dk)', border: '1px solid var(--cam-primary-dk)' }}
          >Done</button>
        </div>
      </div>
    </div>
  );
}

export default AudioCheckModal;
