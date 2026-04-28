import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AudioPreferences,
  type CaptureMethod,
  loadAudioPrefs,
  patchAudioPrefs,
  pickAutoMethod,
  isElectron,
  supportsTabShare,
  isVirtualMicLabel,
  findVirtualMic,
} from '@/lib/audio-preferences';
import { useInterviewerAudio } from './InterviewerAudio';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { audioPrefsAPI } from '@/lib/api-client';

/**
 * Universal audio setup screen. Replaces the old "Connect interviewer
 * audio" gate with a full mic + speaker + capture-method picker so
 * Camora works for any customer setup — AirPods, USB mics, audio
 * interfaces, virtual-loopback rigs (BlackHole/VoiceMeeter), Zoom
 * desktop, Teams desktop, browser meetings, you name it.
 *
 * Flow:
 *   1. Auto-detect environment (Electron / Chromium / other)
 *   2. List input devices, flag any virtual-loopback mics
 *   3. List output devices, offer a sound-test
 *   4. Pick capture method (default: auto)
 *   5. Connect → live level meter on the interviewer stream
 *   6. Save & close → prefs persisted, won't auto-open next session
 *
 * Show/hide is controlled by:
 *   • `forceOpen` prop, or
 *   • internally: opens once per session if prefs.setupCompleted is false.
 *
 * Persisted via lib/audio-preferences (localStorage now, backend in a
 * follow-up commit). Components like InterviewerAudioProvider read the
 * same prefs and honor the user's chosen method.
 */

interface DeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

const SESSION_KEY = 'lumora_audio_wizard_dismissed';

export function AudioSetupWizard({
  forceOpen,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const interviewer = useInterviewerAudio();
  const { token } = useAuth();
  const setInterviewerAudio = useInterviewStore((s) => s.setInterviewerAudio);
  const everConnected = useInterviewStore((s) => s.interviewerAudio.everConnected);
  const [prefs, setPrefs] = useState<AudioPreferences>(loadAudioPrefs);

  // Hydrate prefs from backend on mount so the user's mic/speaker/method
  // choices follow them across devices and browsers.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!token || hydratedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await audioPrefsAPI.getState(token);
        if (cancelled) return;
        if (r.data && typeof r.data === 'object') {
          const merged = { ...loadAudioPrefs(), ...(r.data as Partial<AudioPreferences>) };
          patchAudioPrefs(merged);
          setPrefs(merged);
        }
      } catch {
        // Backend offline — local prefs already loaded.
      } finally {
        hydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Debounced write-through after hydration.
  const writeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!token || !hydratedRef.current) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = window.setTimeout(() => {
      audioPrefsAPI.putState(token, prefs).catch((err) => {
        console.warn('[AudioWizard] putState failed', err);
      });
    }, 800);
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [prefs, token]);
  const [inputs, setInputs] = useState<DeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<DeviceInfo[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerTestPlaying, setSpeakerTestPlaying] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const sessionDismissed = useRef<boolean>((() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  })());
  // External force-open trigger (e.g. icon-rail "Audio check" entry).
  const [externalForceOpen, setExternalForceOpen] = useState(false);
  useEffect(() => {
    const handler = () => {
      sessionDismissed.current = false;
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      setExternalForceOpen(true);
    };
    window.addEventListener('lumora:open-audio-wizard', handler);
    return () => window.removeEventListener('lumora:open-audio-wizard', handler);
  }, []);

  /* ── visibility ─────────────────────────────────────────────────── */
  const open = useMemo(() => {
    if (forceOpen || externalForceOpen) return true;
    if (sessionDismissed.current) return false;
    // Mic-only never sets `everConnected` (no second stream), so trust
    // setupCompleted on its own. For other methods we want a live
    // connection before we suppress the wizard.
    if (prefs.setupCompleted && (everConnected || prefs.captureMethod === 'mic-only')) return false;
    return true;
  }, [forceOpen, externalForceOpen, prefs.setupCompleted, everConnected, prefs.captureMethod]);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    sessionDismissed.current = true;
    setExternalForceOpen(false);
    // Stop the wizard's mic-monitor stream immediately so it can't
    // overlap with the live AudioCapture's getUserMedia call. Without
    // this, on some hardware the second getUserMedia returned a
    // silent track for a few hundred ms.
    stopMicMonitorRef.current?.();
    onClose?.();
  }, [onClose]);

  // Escape closes the wizard — every other modal in the app honors it
  // and users were getting trapped here without an obvious dismiss.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  /* ── device enumeration ────────────────────────────────────────── */
  const enumerate = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionGranted(true);
    } catch {
      // continue without permission — labels will be missing
    }
    const devs = await navigator.mediaDevices.enumerateDevices();
    setInputs(
      devs
        .filter((d) => d.kind === 'audioinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || (d.deviceId === 'default' ? 'Default microphone' : `Microphone ${i + 1}`),
          groupId: d.groupId,
        })),
    );
    setOutputs(
      devs
        .filter((d) => d.kind === 'audiooutput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || (d.deviceId === 'default' ? 'Default speakers' : `Speakers ${i + 1}`),
          groupId: d.groupId,
        })),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    enumerate();
    const handler = () => enumerate();
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
  }, [open, enumerate]);

  /* ── candidate-mic level monitor (drives the green bars) ──────── */
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micRafRef = useRef<number | null>(null);
  // Ref so `dismiss` (declared above) can call the latest stopMicMonitor
  // without a circular dependency.
  const stopMicMonitorRef = useRef<(() => void) | null>(null);

  const stopMicMonitor = useCallback(() => {
    if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
    micRafRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicLevel(0);
  }, []);
  useEffect(() => { stopMicMonitorRef.current = stopMicMonitor; }, [stopMicMonitor]);

  const startMicMonitor = useCallback(async (deviceId: string | null) => {
    stopMicMonitor();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      micCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 255;
          sum += v * v;
        }
        setMicLevel(Math.sqrt(sum / data.length));
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn('[AudioWizard] mic monitor failed', err);
    }
  }, [stopMicMonitor]);

  useEffect(() => {
    if (!open) {
      stopMicMonitor();
      return;
    }
    if (!permissionGranted) return;
    startMicMonitor(prefs.micDeviceId);
    return () => stopMicMonitor();
  }, [open, permissionGranted, prefs.micDeviceId, startMicMonitor, stopMicMonitor]);

  /* ── auto-resolve method when devices are enumerated ──────────── */
  useEffect(() => {
    if (prefs.captureMethod !== 'auto') return;
    if (inputs.length === 0) return;
    const auto = pickAutoMethod(inputs);
    if (auto === 'virtual-mic') {
      const vm = findVirtualMic(inputs);
      if (vm) {
        setPrefs((p) => patchAudioPrefs({ ...p, virtualMicDeviceId: vm.deviceId }));
      }
    }
  }, [prefs.captureMethod, inputs]);

  /* ── speaker sound test ────────────────────────────────────────── */
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const playSoundTest = useCallback(async () => {
    if (speakerTestPlaying) return;
    try {
      const audio = new Audio();
      // Tiny inline beep: 880 Hz, 0.4s, generated via WebAudio offline.
      const ctx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100 * 0.5, 44100);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(0.25, 0.05);
      gain.gain.linearRampToValueAtTime(0, 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      const buf = await ctx.startRendering();
      const wav = audioBufferToWavBlob(buf);
      audio.src = URL.createObjectURL(wav);
      audioElRef.current = audio;
      // Apply chosen output device (Chrome/Edge)
      if (prefs.speakerDeviceId && (audio as any).setSinkId) {
        try { await (audio as any).setSinkId(prefs.speakerDeviceId); } catch (err) {
          console.warn('[AudioWizard] setSinkId failed', err);
        }
      }
      setSpeakerTestPlaying(true);
      audio.onended = () => {
        setSpeakerTestPlaying(false);
        URL.revokeObjectURL(audio.src);
      };
      await audio.play();
    } catch (err) {
      console.error('[AudioWizard] sound test failed', err);
      setSpeakerTestPlaying(false);
    }
  }, [prefs.speakerDeviceId, speakerTestPlaying]);

  /* ── method controls ───────────────────────────────────────────── */
  const setMethod = (m: CaptureMethod) => setPrefs((p) => patchAudioPrefs({ ...p, captureMethod: m }));
  const setMic = (id: string) => setPrefs((p) => patchAudioPrefs({ ...p, micDeviceId: id }));
  const setSpeaker = (id: string) => setPrefs((p) => patchAudioPrefs({ ...p, speakerDeviceId: id }));
  const setVirtualMic = (id: string) => setPrefs((p) => patchAudioPrefs({ ...p, virtualMicDeviceId: id }));

  /* ── connect interviewer audio (delegates to provider) ────────── */
  const connectInterviewer = useCallback(async () => {
    setInterviewerAudio({ error: null });
    await interviewer.start();
  }, [interviewer, setInterviewerAudio]);

  /* ── done ──────────────────────────────────────────────────────── */
  const finish = useCallback(() => {
    patchAudioPrefs({ ...prefs, setupCompleted: true, lastKnownGood: interviewer.active });
    dismiss();
  }, [prefs, interviewer.active, dismiss]);

  if (!open) return null;

  /* ── derived UI bits ───────────────────────────────────────────── */
  const env = isElectron() ? 'desktop' : supportsTabShare() ? 'chromium' : 'limited';
  const detectedVirtualMic = findVirtualMic(inputs);
  const interviewerReady = interviewer.active;
  const canFinish =
    prefs.captureMethod === 'mic-only' || interviewerReady;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio setup"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Set up audio</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Pick your microphone, speakers, and how Camora should hear the interviewer. Works with any device — AirPods, USB mics, audio interfaces, virtual loopback (BlackHole / VoiceMeeter / Loopback).
            </p>
          </div>
          {/* Explicit X close — the bottom-left "Skip for this session" link
              was the only dismiss affordance and users were missing it,
              especially on tall layouts where the footer scrolls offscreen
              before the modal finishes mounting. */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="w-8 h-8 -mr-1 -mt-1 rounded-md flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-3 space-y-5">
          {/* ── Microphone ──────────────────────────────────── */}
          <Section
            num={1}
            title="Your microphone"
            subtitle="The mic that captures your voice."
          >
            <select
              value={prefs.micDeviceId || ''}
              onChange={(e) => setMic(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">System default</option>
              {inputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}{isVirtualMicLabel(d.label) ? ' — virtual loopback' : ''}
                </option>
              ))}
            </select>
            <LevelMeter level={micLevel} label="Speak now to test" active={micLevel > 0.012} />
          </Section>

          {/* ── Speakers / headphones ───────────────────────── */}
          <Section
            num={2}
            title="Your speakers"
            subtitle="Where Sona's audio cues play (and what you hear during the call). Use headphones to keep the interviewer's voice from leaking back into your mic."
          >
            <div className="flex gap-2">
              <select
                value={prefs.speakerDeviceId || ''}
                onChange={(e) => setSpeaker(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">System default</option>
                {outputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
              <button
                onClick={playSoundTest}
                disabled={speakerTestPlaying}
                className="px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-60"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
              >
                {speakerTestPlaying ? '♪ Playing' : 'Test sound'}
              </button>
            </div>
            {outputs.length === 0 && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                Output device selection requires Chrome or Edge (setSinkId). On Safari/Firefox, sound plays through your OS default.
              </div>
            )}
          </Section>

          {/* ── Interviewer audio method ────────────────────── */}
          <Section
            num={3}
            title="How Camora hears the interviewer"
            subtitle="Pick the method that matches your setup. Auto picks the best option for your environment."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <MethodCard
                value="auto"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Auto"
                desc="Uses the best path for your environment."
                badge={env === 'desktop' ? 'desktop loopback' : env === 'chromium' ? 'tab share' : 'mic only'}
              />
              <MethodCard
                value="electron-loopback"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Desktop loopback"
                desc="Captures all system audio. Works for Zoom desktop, Teams desktop, anything."
                badge="best"
                disabled={!isElectron()}
                disabledNote={!isElectron() ? 'Requires the Camora desktop app.' : undefined}
              />
              <MethodCard
                value="tab-share"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Share a browser tab"
                desc="You'll pick the meeting tab and check Share tab audio."
                disabled={!supportsTabShare()}
                disabledNote={!supportsTabShare() ? 'Requires Chrome or Edge.' : undefined}
              />
              <MethodCard
                value="virtual-mic"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Virtual loopback"
                desc="Route your call's audio to a virtual mic (BlackHole, VoiceMeeter, Loopback) and pick it below."
                badge={detectedVirtualMic ? 'detected' : undefined}
              />
              <MethodCard
                value="mic-only"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Mic-only fallback"
                desc="No second stream. Server-side diarization tries to filter out your voice from the mic."
                badge="lossy"
              />
            </div>

            {prefs.captureMethod === 'virtual-mic' && (
              <div className="mt-3">
                <label className="text-[11px] uppercase font-bold tracking-wider block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Virtual loopback device
                </label>
                <select
                  value={prefs.virtualMicDeviceId || ''}
                  onChange={(e) => setVirtualMic(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="">— pick a virtual loopback input —</option>
                  {inputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}{isVirtualMicLabel(d.label) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
                {!detectedVirtualMic && (
                  <div className="text-[11px] mt-1.5" style={{ color: 'var(--warning-text, #f59e0b)' }}>
                    No common loopback driver detected. Install BlackHole (macOS), VoiceMeeter (Windows), or Loopback, route your call into it, then refresh this list.
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── Connect & verify ────────────────────────────── */}
          {prefs.captureMethod !== 'mic-only' && (
            <Section
              num={4}
              title="Connect and verify"
              subtitle="Hit connect, then have the interviewer say something. The bars should rise."
            >
              <div className="flex gap-2 items-center mb-2">
                {!interviewerReady ? (
                  <button
                    onClick={connectInterviewer}
                    className="px-4 py-2 text-xs font-bold rounded-lg"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {prefs.captureMethod === 'electron-loopback' ? 'Connect system audio'
                      : prefs.captureMethod === 'tab-share' ? 'Share interviewer tab'
                      : prefs.captureMethod === 'virtual-mic' ? 'Connect virtual mic'
                      : 'Connect'}
                  </button>
                ) : (
                  <button
                    onClick={() => interviewer.stop()}
                    className="px-4 py-2 text-xs font-bold rounded-lg"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    Stop and reconnect
                  </button>
                )}
                <span className="text-[11px] font-mono" style={{ color: interviewerReady ? 'var(--accent)' : 'var(--text-dimmed)' }}>
                  {interviewerReady
                    ? interviewer.level > 0.012 ? 'voice detected ✓' : 'connected, waiting…'
                    : 'not connected'}
                </span>
              </div>
              <LevelMeter level={interviewer.level} label="Interviewer level" active={interviewerReady && interviewer.level > 0.012} />
              {interviewer.error && (
                <div
                  className="mt-2 rounded-lg p-2.5 text-xs"
                  style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}
                >
                  {interviewer.error}
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-b-2xl"
          style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}
        >
          <button onClick={dismiss} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Skip for this session
          </button>
          <div className="flex gap-2">
            <button
              onClick={finish}
              disabled={!canFinish}
              className="px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
              title={canFinish ? 'Save and start interview' : 'Verify the interviewer level meter is moving first.'}
            >
              {canFinish ? 'Save and continue' : 'Waiting for audio…'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function Section({
  num, title, subtitle, children,
}: {
  num: number; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
        >
          {num}
        </span>
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {subtitle && (
        <p className="text-[12px] mb-2" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

function MethodCard({
  value, current, onPick, title, desc, badge, disabled, disabledNote,
}: {
  value: CaptureMethod;
  current: CaptureMethod;
  onPick: (v: CaptureMethod) => void;
  title: string;
  desc: string;
  badge?: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => !disabled && onPick(value)}
      disabled={disabled}
      className="text-left p-3 rounded-lg transition-all disabled:cursor-not-allowed"
      style={{
        background: selected ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        opacity: disabled ? 0.5 : 1,
      }}
      title={disabled ? disabledNote : ''}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>
          {title}
        </span>
        {badge && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
      {disabledNote && disabled && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--warning-text, #f59e0b)' }}>{disabledNote}</div>
      )}
    </button>
  );
}

function LevelMeter({ level, label, active }: { level: number; label: string; active: boolean }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div className="flex items-end gap-0.5 h-5">
        {Array.from({ length: 28 }).map((_, i) => {
          const t = i / 28;
          const lit = active && level > t * 0.5;
          return (
            <span
              key={i}
              className="flex-1 rounded-sm transition-all duration-75"
              style={{
                height: `${20 + t * 80}%`,
                background: lit ? 'var(--accent)' : 'var(--border)',
                opacity: lit ? 1 : 0.55,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Tiny WAV encoder for the sound test ─────────────────────────── */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, length - 44, true);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
