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
import { useSpeakerAudio } from './SpeakerAudio';
import { useSessionStore } from '@/stores/session-store';
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
 * follow-up commit). Components like SpeakerAudioProvider read the
 * same prefs and honor the user's chosen method.
 */

interface DeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

const SESSION_KEY = 'lumora_audio_wizard_dismissed';

export const AudioSetupWizard = ({
  forceOpen,
  onClose,
  autoPrompt = true,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
  /** Open itself when setup looks incomplete. False on tabs where audio is not
   *  the job — the wizard still mounts there so the rail's Audio Check button
   *  has something listening, it just waits to be asked. */
  autoPrompt?: boolean;
}) => {
  const speaker = useSpeakerAudio();
  const { token } = useAuth();
  const setSpeakerAudio = useSessionStore((s) => s.setSpeakerAudio);
  const everConnected = useSessionStore((s) => s.speakerAudio.everConnected);
  const voiceEnrolled = useSessionStore((s) => s.voiceEnrolled);
  const voiceFilterEnabled = useSessionStore((s) => s.voiceFilterEnabled);
  // The candidate-mic AudioCapture might already be running (continuous
  // mode auto-starts on tab load). The wizard's mic-level monitor must
  // not also open getUserMedia on the same device — concurrent streams
  // on the same physical mic fail unpredictably and were the actual
  // source of the "AudioContext encountered an error" spam.
  const candidateMicActive = useSessionStore((s) => s.isRecording);
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
  const [micLevel, setMicLevel] = useState(0);
  const [speakerTestPlaying, setSpeakerTestPlaying] = useState(false);
  // Virtual-loopback and room-mic are power-user paths (need a driver install or
  // voice enrollment), so they live behind an "Advanced" toggle to keep the
  // everyday choice to auto / desktop / tab / mic-only. Start expanded if the
  // saved method is one of them, so the user can still see their selection.
  const [showAdvancedMethods, setShowAdvancedMethods] = useState(
    () => prefs.captureMethod === 'virtual-mic' || prefs.captureMethod === 'room-mic',
  );
  const [permissionGranted, setPermissionGranted] = useState(false);
  // sessionDismissed must be STATE — using a ref meant the dismiss
  // handler set the value but never triggered a re-render, so the
  // open-useMemo wouldn't recompute and Skip / X / Escape all looked
  // dead from the user's perspective.
  const [sessionDismissed, setSessionDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  // External force-open trigger (e.g. icon-rail "Audio check" entry).
  const [externalForceOpen, setExternalForceOpen] = useState(false);
  useEffect(() => {
    const handler = () => {
      setSessionDismissed(false);
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      setExternalForceOpen(true);
    };
    window.addEventListener('lumora:open-audio-wizard', handler);
    return () => window.removeEventListener('lumora:open-audio-wizard', handler);
  }, []);

  /* ── visibility ─────────────────────────────────────────────────── */
  const open = useMemo(() => {
    // An explicit request always opens it, on any tab. This is what the rail's
    // "Audio Check" button fires, and it must outrank autoPrompt: the button
    // exists precisely so you can reach setup from wherever you are.
    if (forceOpen || externalForceOpen) return true;
    // autoPrompt=false → mounted purely to listen for that request. The wizard
    // now mounts on every Lumora tab (it used to mount on four, so the button
    // was a no-op everywhere else — nothing was listening), but it should not
    // ambush someone reading Prep Kit or editing their profile.
    if (!autoPrompt) return false;
    if (sessionDismissed) return false;
    // Mic-only never sets `everConnected` (no second stream), so trust
    // setupCompleted on its own. For other methods we want a live
    // connection before we suppress the wizard.
    if (prefs.setupCompleted && (everConnected || prefs.captureMethod === 'mic-only')) return false;
    return true;
  }, [forceOpen, externalForceOpen, sessionDismissed, prefs.setupCompleted, everConnected, prefs.captureMethod]);

  const dismiss = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    setSessionDismissed(true);
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
  const [permissionError, setPermissionError] = useState<string | null>(null);
  // True when TCC says 'granted' but Chromium's audio device list is
  // still empty — only fixable by relaunching the Electron process.
  // Surfaces the "Restart Camora" button.
  const [needsRelaunch, setNeedsRelaunch] = useState(false);
  // macOS Screen Recording TCC status — required by getDisplayMedia
  // (the Connect-system-audio path). Read-only on macOS; you can't
  // programmatically prompt for it, so the wizard surfaces a CTA to
  // open System Settings before the user clicks Connect.
  const [screenRecordingStatus, setScreenRecordingStatus] = useState<string>('unknown');

  const requestPermission = useCallback(async () => {
    setPermissionError(null);
    const camo = (window as any).camo;
    const isDesktop = !!camo?.isDesktop;

    // Step 1 — read TCC status on macOS Electron. The renderer can't
    // poll AVCaptureDevice authorization itself, so we route through
    // the main-process bridge. On non-macOS / browsers, this is a
    // no-op and we fall straight to getUserMedia.
    let tcc: string | undefined;
    if (camo?.getMediaAccessStatus) {
      try { tcc = await camo.getMediaAccessStatus('microphone'); }
      catch { /* unknown */ }
    }

    // Step 2 — pre-empt sticky 'denied'. Chromium's getUserMedia would
    // just throw NotAllowedError without ever showing the OS prompt.
    // Open System Settings to the right pane and tell the user what
    // to flip; needsRelaunch=false because the relaunch button only
    // helps after they've actually granted permission.
    if (tcc === 'denied') {
      camo?.openSystemPrivacy?.('Microphone');
      setNeedsRelaunch(false);
      setPermissionError(
        'Microphone access was denied for Camora. We just opened System Settings → Privacy & Security → Microphone — toggle Camora ON, then come back and click Refresh.',
      );
      setPermissionGranted(false);
      return false;
    }

    // Step 3 — first-launch prompt. macOS only shows the dialog once
    // per 'not-determined' state; subsequent calls return the cached
    // answer immediately so this is safe to invoke unconditionally.
    if (camo?.askForMediaAccess && tcc !== 'granted') {
      try { await camo.askForMediaAccess('microphone'); }
      catch { /* fall through to getUserMedia */ }
    }

    // Step 4 — actually attempt to acquire a stream.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionGranted(true);
      setNeedsRelaunch(false);
      return true;
    } catch (err: any) {
      // Stuck-state detection. macOS doesn't surface a freshly-granted
      // device to the running Chromium audio service — the device list
      // stays empty until the next process launch, so getUserMedia
      // throws NotFoundError despite TCC saying 'granted'. The only
      // reliable recovery is a relaunch.
      let postGrantTcc: string | undefined = tcc;
      if (err?.name === 'NotFoundError' && isDesktop && camo?.getMediaAccessStatus) {
        try { postGrantTcc = await camo.getMediaAccessStatus('microphone'); }
        catch { /* keep old value */ }
      }
      if (err?.name === 'NotFoundError' && postGrantTcc === 'granted') {
        setNeedsRelaunch(true);
        setPermissionError(
          'Camora is allowed in System Settings, but macOS only gives the running app the new permission after a restart. Click Restart Camora — you\'ll be back here in a second with your mic working.',
        );
        setPermissionGranted(false);
        return false;
      }

      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone permission was denied. On macOS, check System Settings → Privacy & Security → Microphone. In the browser, click the lock icon in the address bar → Site settings → Microphone → Allow.'
        : err?.name === 'NotFoundError'
        ? isDesktop
          ? 'macOS hasn\'t granted Camora microphone access yet. We just opened System Settings — toggle Camora ON under Privacy & Security → Microphone, then click Refresh.'
          : 'No microphone found. Plug one in or check your audio device settings.'
        : err?.name === 'NotReadableError'
        ? 'Another app is using your mic. Close Zoom/Teams/Slack/QuickTime and try again.'
        : `Microphone access failed: ${err?.message || err?.name || 'unknown error'}`;
      if (err?.name === 'NotFoundError' && isDesktop) {
        camo?.openSystemPrivacy?.('Microphone');
      }
      setNeedsRelaunch(false);
      setPermissionError(msg);
      setPermissionGranted(false);
      return false;
    }
  }, []);

  const enumerate = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    // Always request permission so labels are populated. We previously
    // swallowed the failure and ended up with an empty mic dropdown
    // when the user denied or the OS hadn't granted permission.
    await requestPermission();
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
  }, [requestPermission]);

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

  const stopMicMonitor = useCallback(async () => {
    if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
    micRafRef.current = null;
    // Stop tracks BEFORE awaiting close — track.stop() releases the
    // underlying device synchronously; ctx.close() is async and
    // sometimes lingers. Doing it in this order avoids the device
    // being briefly held open by an old AudioContext while a new
    // getUserMedia call tries to acquire it (which produced the
    // "AudioContext encountered an error" spam).
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    try { await micCtxRef.current?.close(); } catch {}
    micCtxRef.current = null;
    setMicLevel(0);
  }, []);
  useEffect(() => { stopMicMonitorRef.current = () => { void stopMicMonitor(); }; }, [stopMicMonitor]);

  const startMicMonitor = useCallback(async (deviceId: string | null) => {
    // Wait for the previous stream + AudioContext to fully tear down
    // before grabbing the device again — a half-released device flap
    // is what triggered the AudioContext-error console spam.
    await stopMicMonitor();

    // Helper: try a getUserMedia call with these constraints, return the
    // resulting stream or rethrow.
    const tryAcquire = (constraints: MediaStreamConstraints) =>
      navigator.mediaDevices.getUserMedia(constraints);

    // eslint-disable-next-line no-useless-assignment
    let stream: MediaStream | null = null;
    try {
      // `ideal` (not `exact`) so a stale/missing saved deviceId falls
      // back to the system default instead of throwing — the previous
      // `exact` constraint produced an OverconstrainedError loop that
      // re-fired the deps-driven effect on every render and spammed
      // the AudioContext-error log.
      stream = await tryAcquire({
        audio: deviceId ? { deviceId: { ideal: deviceId } } : true,
      });
    } catch (err: any) {
      // Belt-and-suspenders: if the browser still rejects despite the
      // ideal constraint (e.g. some Chromium builds treat ideal as
      // exact when nothing else matches), clear the saved id and retry
      // with the default mic. NotFoundError covers macOS, Overconstrained
      // covers Linux / older Chromium.
      const stale = !!deviceId && (
        err?.name === 'NotFoundError' ||
        err?.name === 'OverconstrainedError' ||
        err?.name === 'ConstraintNotSatisfiedError'
      );
      if (stale) {
        console.warn('[AudioWizard] saved mic unavailable; clearing and retrying with default', deviceId, err?.name);
        try {
          setPrefs((p) => patchAudioPrefs({ ...p, micDeviceId: null }));
        } catch { /* ignore */ }
        try {
          stream = await tryAcquire({ audio: true });
        } catch (err2: any) {
          console.warn('[AudioWizard] mic monitor fallback failed', err2);
          return;
        }
      } else {
        console.warn('[AudioWizard] mic monitor failed', err);
        return;
      }
    }

    if (!stream) return;
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
  }, [stopMicMonitor]);

  useEffect(() => {
    if (!open) {
      void stopMicMonitor();
      return;
    }
    if (!permissionGranted) return;
    // Don't open a second stream on the same mic if the live capture
    // (candidate or interviewer) is already running. The wizard's
    // level meter just shows static "0%" in this case; the user can
    // pause the live capture from the topbar to test.
    if (candidateMicActive || speaker.active) {
      void stopMicMonitor();
      return;
    }
    // Defer the wizard's getUserMedia by ~400 ms so the live AudioCapture
    // (which auto-starts on mount with its own 200 ms delay) wins the
    // race for the device. If candidateMicActive flips true during the
    // wait, abort — that's the live capture already taking the stream
    // and our second getUserMedia call would emit the AudioContext
    // "encountered an error" log entry on Chromium / macOS.
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void startMicMonitor(prefs.micDeviceId);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      void stopMicMonitor();
    };
  }, [open, permissionGranted, candidateMicActive, speaker.active, prefs.micDeviceId, startMicMonitor, stopMicMonitor]);

  /* ── Screen Recording TCC status (macOS only, electron-loopback) ── */
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.isDesktop || camo.platform !== 'darwin') return;
    if (!camo.getMediaAccessStatus) return;
    if (!open) return;
    let cancelled = false;
    const check = async () => {
      try {
        const s = await camo.getMediaAccessStatus('screen');
        if (!cancelled) setScreenRecordingStatus(s || 'unknown');
      } catch { /* ignore */ }
    };
    check();
    // Re-poll every 2s while the wizard is open so the UI reflects
    // the toggle state when the user grants permission and switches
    // back. Cheap (one IPC call).
    const t = window.setInterval(check, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [open]);

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
      // OfflineAudioContext has been unprefixed since Chrome 46. The
      // webkit fallback was dead code that, if it had ever evaluated,
      // would throw "undefined is not a constructor" and silently
      // break the test-sound feature.
      const ctx = new OfflineAudioContext(1, 44100 * 0.5, 44100);
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
      // Plays through the OS default output. Per-device routing (setSinkId)
      // was removed along with the output-device picker — it only mattered
      // for choosing a speaker, which has no effect on the interview.
      setSpeakerTestPlaying(true);
      audio.onended = () => {
        setSpeakerTestPlaying(false);
        URL.revokeObjectURL(audio.src);
      };
      await audio.play();
    } catch (err: any) {
      // AbortError fires when play() is interrupted by an implicit pause()
      // (e.g. component unmounts before the promise resolves). Not a real
      // failure — just clean up state silently.
      if (err?.name === 'AbortError') {
        setSpeakerTestPlaying(false);
        return;
      }
      console.error('[AudioWizard] sound test failed', err);
      setSpeakerTestPlaying(false);
    }
  }, [speakerTestPlaying]);

  /* ── method controls ───────────────────────────────────────────── */
  const setMethod = (m: CaptureMethod) => setPrefs((p) => patchAudioPrefs({ ...p, captureMethod: m }));
  const setMic = (id: string) => setPrefs((p) => patchAudioPrefs({ ...p, micDeviceId: id }));
  const setVirtualMic = (id: string) => setPrefs((p) => patchAudioPrefs({ ...p, virtualMicDeviceId: id }));

  /* ── connect speaker audio (delegates to provider) ────────── */
  const connectSpeaker = useCallback(async () => {
    setSpeakerAudio({ error: null });
    await speaker.start();
  }, [speaker, setSpeakerAudio]);

  /* ── done ──────────────────────────────────────────────────────── */
  const finish = useCallback(() => {
    patchAudioPrefs({ ...prefs, setupCompleted: true, lastKnownGood: speaker.active });
    dismiss();
  }, [prefs, speaker.active, dismiss]);

  if (!open) return null;

  /* ── derived UI bits ───────────────────────────────────────────── */
  const env = isElectron() ? 'desktop' : supportsTabShare() ? 'chromium' : 'limited';
  const detectedVirtualMic = findVirtualMic(inputs);
  const speakerReady = speaker.active;
  const canFinish =
    prefs.captureMethod === 'mic-only' || speakerReady;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio setup"
      /* lumora-shell-root on the overlay. This mounts as a SIBLING of the
         shell, so no --lum-* remap reached it and it drew itself in the global
         Capra palette — a white card over a dark interview. */
      className="lumora-shell-root fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(6,9,14,0.66)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        data-overlay-keep
        className="w-full rounded-xl flex flex-col overflow-hidden"
        style={{
          maxWidth: 720,
          maxHeight: 'min(88vh, 860px)',
          background: 'var(--lum-surface)',
          border: '1px solid var(--lum-border-strong)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Fixed, so close and the connection state stay reachable. */}
        <div
          className="relative shrink-0 px-5 py-3.5 flex items-center gap-3"
          style={{ background: 'var(--lum-bg)', borderBottom: '1px solid var(--lum-border)' }}
        >
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--lum-accent)' }} />
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-1.5"
            style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </div>
          {/* Title only — the paragraph under it listed hardware that the
              picker below already lists. */}
          <h2 className="flex-1 min-w-0 text-[15px] font-semibold tracking-tight" style={{ color: 'var(--lum-text)' }}>
            Set up audio
          </h2>
          {/* The state the window exists for. It was buried in step 4. */}
          <StatusPill
            ok={speakerReady}
            label={speakerReady
              ? speaker.level > 0.012 ? 'Hearing the speaker' : 'Connected'
              : prefs.captureMethod === 'mic-only' ? 'Mic only' : 'Not connected'}
          />
          {/* Explicit X close — the bottom-left "Skip for this session" link
              was the only dismiss affordance and users were missing it,
              especially on tall layouts where the footer scrolls offscreen
              before the modal finishes mounting. */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Side by side — stacked, these two short steps alone pushed
              Connect and the footer below the fold. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* ── Microphone ──────────────────────────────────── */}
          <Section num={1} title="Your microphone">
            {/* Permission / no-devices diagnostics. Until permission is
                granted, Chrome returns audioinputs with empty labels
                (or none at all), so the dropdown is useless. Surface a
                clear retry path instead of silently showing an empty
                "System default" option. */}
            {(permissionError || (!permissionGranted && inputs.length <= 1)) && (
              <Notice tone="warning" title="Microphone access needed" body={permissionError || null}>
                <button
                  type="button"
                  onClick={() => { needsRelaunch ? (window as any).camo?.relaunch?.() : void enumerate(); }}
                  className="px-2.5 py-1 text-[12px] font-semibold rounded-md"
                  style={{ background: 'var(--lum-accent)', color: 'var(--lum-accent-bg)' }}
                >
                  {needsRelaunch ? 'Restart Camora' : 'Grant access'}
                </button>
              </Notice>
            )}
            <div className="flex gap-2">
              <Select value={prefs.micDeviceId || ''} onChange={setMic} className="flex-1 min-w-0">
                <option value="">System default</option>
                {inputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}{isVirtualMicLabel(d.label) ? ' — virtual loopback' : ''}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => { void enumerate(); }}
                className="px-2.5 h-9 text-[12px] font-semibold rounded-lg shrink-0"
                style={{ background: 'var(--lum-bg)', color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
                data-tip="Re-enumerate devices"
              >
                Refresh
              </button>
            </div>
            <LevelMeter level={micLevel} label="Speak to test" active={micLevel > 0.012} />
          </Section>

          {/* No output-device picker: Sona has no audio output, so the choice
              did nothing. Confirming you can hear at all is the useful part. */}
          <Section num={2} title="Your speakers">
            <button
              onClick={playSoundTest}
              disabled={speakerTestPlaying}
              className="px-3 h-9 text-[12px] font-semibold rounded-lg disabled:opacity-60"
              style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)', border: '1px solid var(--lum-accent)' }}
            >
              {speakerTestPlaying ? '♪ Playing' : 'Test sound'}
            </button>
            <p className="text-[12px] mt-2" style={{ color: 'var(--lum-text-2)' }}>
              Use headphones so the speaker's voice doesn't leak into your mic.
            </p>
          </Section>
          </div>

          {/* ── Speaker audio method ────────────────────── */}
          <Section num={3} title="How Camora hears the speaker">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <MethodCard
                value="auto"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Auto"
                desc={env === 'desktop' ? 'Uses desktop loopback.' : env === 'chromium' ? 'Uses tab share.' : 'Uses mic only.'}
              />
              <MethodCard
                value="electron-loopback"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Desktop loopback"
                desc="All system audio — Zoom, Teams, anything."
                badge="best"
                disabled={!isElectron()}
                disabledNote={!isElectron() ? 'Needs the desktop app.' : undefined}
              />
              <MethodCard
                value="tab-share"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Share a browser tab"
                desc="Pick the meeting tab, check Share tab audio."
                disabled={!supportsTabShare()}
                disabledNote={!supportsTabShare() ? 'Needs Chrome or Edge.' : undefined}
              />
              <MethodCard
                value="mic-only"
                current={prefs.captureMethod}
                onPick={setMethod}
                title="Mic-only fallback"
                desc="No second stream. Your voice is filtered server-side."
                badge="lossy"
              />
            </div>

            {/* Advanced methods — power-user paths that need a driver install or
                voice enrollment. Hidden by default so the common choice stays simple. */}
            <button
              type="button"
              onClick={() => setShowAdvancedMethods((v) => !v)}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold"
              style={{ color: 'var(--lum-text-2)' }}
              aria-expanded={showAdvancedMethods}
            >
              <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: showAdvancedMethods ? 'rotate(90deg)' : 'none' }}>▸</span>
              Advanced
            </button>
            {showAdvancedMethods && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <MethodCard
                  value="virtual-mic"
                  current={prefs.captureMethod}
                  onPick={setMethod}
                  title="Virtual loopback"
                  desc="Route the call into BlackHole, VoiceMeeter or Loopback."
                  badge={detectedVirtualMic ? 'detected' : undefined}
                />
                <MethodCard
                  value="room-mic"
                  current={prefs.captureMethod}
                  onPick={setMethod}
                  title="Room mic"
                  desc="Hears the speaker through your laptop mic."
                  badge={voiceEnrolled && voiceFilterEnabled ? 'filter on' : 'needs enrollment'}
                  disabled={!voiceEnrolled || !voiceFilterEnabled}
                  disabledNote={!voiceEnrolled
                    ? 'Enroll your voice first.'
                    : !voiceFilterEnabled
                      ? 'Turn the voice filter on first.'
                      : undefined}
                />
              </div>
            )}

            {prefs.captureMethod === 'virtual-mic' && (
              <div className="mt-3">
                <label className="text-[12px] font-semibold block mb-1" style={{ color: 'var(--lum-text-2)' }}>
                  Virtual loopback device
                </label>
                <Select value={prefs.virtualMicDeviceId || ''} onChange={setVirtualMic} className="w-full">
                  <option value="">— pick a virtual loopback input —</option>
                  {inputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}{isVirtualMicLabel(d.label) ? ' ✓' : ''}
                    </option>
                  ))}
                </Select>
                {!detectedVirtualMic && (
                  <div className="mt-2">
                    <Notice tone="warning" title="No loopback driver detected" body="Install BlackHole, VoiceMeeter or Loopback, then refresh." />
                  </div>
                )}
              </div>
            )}

            {/* Only the part that bites: without the filter, Sona answers you. */}
            {prefs.captureMethod === 'room-mic' && (!voiceEnrolled || !voiceFilterEnabled) && (
              <div className="mt-3">
                <Notice
                  tone="danger"
                  title={!voiceEnrolled ? 'Voice not enrolled' : 'Voice filter is off'}
                  body="Sona will answer your own voice."
                />
              </div>
            )}
          </Section>

          {/* ── Connect & verify ────────────────────────────── */}
          {prefs.captureMethod !== 'mic-only' && (
            <Section num={4} title="Connect and verify">
              {/* Method-mismatch warnings. Without them, Connect silently
                  fails and the user has no idea why. */}
              {prefs.captureMethod === 'electron-loopback' && !isElectron() && (
                <Notice tone="warning" title="Desktop loopback needs the desktop app" body="Pick Share a browser tab instead." />
              )}
              {prefs.captureMethod === 'tab-share' && !supportsTabShare() && (
                <Notice tone="warning" title="Tab share needs Chrome or Edge" body="Pick Virtual loopback or Mic-only instead." />
              )}
              {prefs.captureMethod === 'virtual-mic' && !prefs.virtualMicDeviceId && (
                <Notice tone="warning" title="Pick a virtual loopback device above" />
              )}
              {/* macOS-only: Screen Recording permission is required for
                  system-audio loopback (it goes through getDisplayMedia,
                  which on macOS sits behind the Screen Recording TCC).
                  We can't programmatically prompt; the user has to flip
                  the toggle in System Settings and relaunch — surface
                  this BEFORE they click Connect so they don't hit a
                  silent failure. */}
              {prefs.captureMethod === 'electron-loopback' && isElectron() && screenRecordingStatus !== 'granted' && screenRecordingStatus !== 'unknown' && (
                <Notice
                  tone="warning"
                  title="Screen Recording permission needed"
                  body="macOS routes system audio through it. Toggle Camora on, then restart."
                >
                  <button
                    type="button"
                    onClick={() => { (window as any).camo?.openSystemPrivacy?.('ScreenCapture'); }}
                    className="px-2.5 py-1 text-[12px] font-semibold rounded-md"
                    style={{ background: 'var(--lum-accent)', color: 'var(--lum-accent-bg)' }}
                  >
                    Open System Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => { (window as any).camo?.relaunch?.(); }}
                    className="px-2.5 py-1 text-[12px] font-semibold rounded-md"
                    style={{ background: 'var(--lum-bg)', color: 'var(--lum-text)', border: '1px solid var(--lum-border)' }}
                  >
                    Restart Camora
                  </button>
                </Notice>
              )}

              <div className="flex gap-2 items-center mb-2">
                {!speakerReady ? (
                  <button
                    onClick={connectSpeaker}
                    className="px-3 h-9 text-[12px] font-semibold rounded-lg"
                    style={{ background: 'var(--lum-accent)', color: 'var(--lum-accent-bg)' }}
                  >
                    {prefs.captureMethod === 'electron-loopback' ? 'Connect system audio'
                      : prefs.captureMethod === 'tab-share' ? 'Share speaker tab'
                      : prefs.captureMethod === 'virtual-mic' ? 'Connect virtual mic'
                      : 'Connect'}
                  </button>
                ) : (
                  <button
                    onClick={() => speaker.stop()}
                    className="px-3 h-9 text-[12px] font-semibold rounded-lg"
                    style={{ background: 'var(--lum-bg)', color: 'var(--lum-text)', border: '1px solid var(--lum-border)' }}
                  >
                    Stop and reconnect
                  </button>
                )}
              </div>
              <LevelMeter level={speaker.level} label="Speaker level" active={speakerReady && speaker.level > 0.012} />
              {speaker.error && (
                <div className="mt-2">
                  <Notice
                    tone="danger"
                    title={`Connect failed: ${speaker.error}`}
                    body={prefs.captureMethod === 'electron-loopback'
                      ? 'On macOS this usually means Screen Recording is denied. Enable Camora there, then relaunch.'
                      : null}
                  />
                </div>
              )}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-5 py-3"
          style={{ background: 'var(--lum-bg)', borderTop: '1px solid var(--lum-border)' }}
        >
          <button
            onClick={dismiss}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md"
            style={{ color: 'var(--lum-text-2)', border: '1px solid var(--lum-border)' }}
          >
            Skip for this session
          </button>
          <button
            onClick={finish}
            disabled={!canFinish}
            className="px-3.5 py-1.5 text-[12px] font-semibold rounded-md disabled:opacity-50"
            style={{ background: 'var(--lum-accent)', color: 'var(--lum-accent-bg)' }}
            data-tip={canFinish ? '' : 'Verify the speaker level meter is moving first.'}
          >
            {canFinish ? 'Save and continue' : 'Waiting for audio…'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

const Section = ({ num, title, children }: { num: number; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <span
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded text-[12px] font-semibold tabular-nums"
        style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)' }}
      >
        {num}
      </span>
      <h3 className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--lum-text)' }}>{title}</h3>
    </div>
    {children}
  </div>
);

/* Live connection state, in the header. */
const StatusPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className="shrink-0 hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-semibold"
    style={{
      background: 'var(--lum-bg)',
      border: `1px solid ${ok ? 'var(--lum-ok)' : 'var(--lum-border)'}`,
      color: ok ? 'var(--lum-ok)' : 'var(--lum-text-2)',
    }}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? 'var(--lum-ok)' : 'var(--lum-text-2)' }} />
    {label}
  </span>
);

/* One box for every warning and error. They were five hand-rolled divs with
   the same hardcoded rgba, so none of them followed the theme. */
const Notice = ({
  tone, title, body, children,
}: {
  tone: 'warning' | 'danger';
  title: string;
  body?: string | null;
  children?: React.ReactNode;
}) => {
  const c = tone === 'danger' ? 'var(--danger)' : 'var(--warning)';
  return (
    <div
      className="mb-2 p-2.5 rounded-lg text-[12px] flex items-start gap-2"
      style={{
        background: `color-mix(in srgb, ${c} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 45%, transparent)`,
        color: 'var(--lum-text)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: c }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title}</div>
        {body && <div className="mt-0.5" style={{ color: 'var(--lum-text-2)' }}>{body}</div>}
        {children && <div className="flex flex-wrap gap-2 mt-2">{children}</div>}
      </div>
    </div>
  );
};

const Select = ({
  value, onChange, className = '', children,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`h-9 px-2.5 rounded-lg text-[13px] ${className}`}
    style={{ background: 'var(--lum-bg)', border: '1px solid var(--lum-border)', color: 'var(--lum-text)' }}
  >
    {children}
  </select>
);

const MethodCard = ({
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
}) => {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => !disabled && onPick(value)}
      disabled={disabled}
      className="text-left p-2.5 rounded-lg transition-[background-color,border-color,opacity] duration-150 active:scale-[0.98] disabled:cursor-not-allowed"
      style={{
        background: selected ? 'var(--lum-accent-bg)' : 'var(--lum-bg)',
        border: `1px solid ${selected ? 'var(--lum-accent)' : 'var(--lum-border)'}`,
        opacity: disabled ? 0.5 : 1,
      }}
      data-tip={disabled ? disabledNote : ''}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {/* A tick, not colour alone. */}
        <span
          aria-hidden
          className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
          style={{
            border: `1px solid ${selected ? 'var(--lum-accent)' : 'var(--lum-border-strong)'}`,
            background: selected ? 'var(--lum-accent)' : 'transparent',
          }}
        >
          {selected && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--lum-accent-bg)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
        <span className="text-[12px] font-semibold flex-1 min-w-0" style={{ color: selected ? 'var(--lum-accent-sm)' : 'var(--lum-text)' }}>
          {title}
        </span>
        {badge && (
          <span
            className="text-[12px] font-semibold px-1.5 rounded shrink-0"
            style={{ background: 'var(--lum-surface)', color: 'var(--lum-text-2)' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="text-[12px] pl-5" style={{ color: 'var(--lum-text-2)' }}>{desc}</div>
      {disabledNote && disabled && (
        <div className="text-[12px] pl-5 mt-0.5" style={{ color: 'var(--warning)' }}>{disabledNote}</div>
      )}
    </button>
  );
};

const LevelMeter = ({ level, label, active }: { level: number; label: string; active: boolean }) => (
  <div className="mt-2">
    <div className="text-[12px] mb-1" style={{ color: 'var(--lum-text-2)' }}>{label}</div>
    <div className="flex items-end gap-px h-4">
      {Array.from({ length: 28 }).map((_, i) => {
        const t = i / 28;
        const lit = active && level > t * 0.5;
        return (
          <span
            key={i}
            className="flex-1 rounded-[1px] transition-all duration-75"
            style={{
              height: `${30 + t * 70}%`,
              background: lit ? 'var(--lum-accent)' : 'var(--lum-border)',
              opacity: lit ? 1 : 0.6,
            }}
          />
        );
      })}
    </div>
  </div>
);

/* ── Tiny WAV encoder for the sound test ─────────────────────────── */
const audioBufferToWavBlob = (buffer: AudioBuffer): Blob  => {
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
