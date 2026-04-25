/* ── MicButtonLarge — centered prominent mic for behavioral panel one-shots
   Self-contained: opens the user mic, accumulates audio, posts to the
   transcription API on stop. AUTO-mode continuous capture lives in
   AudioCapture; this is the explicit single-question button. */
import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionAPI } from '@/lib/api-client';
import { useAudioDevices } from '@/components/lumora/audio/hooks/useAudioDevices';

const ACCENT = 'var(--cam-primary)';
const ACCENT_BG = 'rgba(59,54,220,0.08)';
const MUTED = '#64748B';

export function MicButtonLarge({ onResult, disabled }: { onResult: (text: string) => void; disabled: boolean }) {
  const { token } = useAuth();
  const { selectedDeviceId } = useAudioDevices();
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      // Same audio config as the main AudioCapture so device selection works.
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      chunks.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size === 0) return;
        setBusy(true);
        try {
          const r = await transcriptionAPI.transcribe(token!, blob, 'audio.webm', false);
          if (r.text?.trim()) onResult(r.text.trim());
        } catch { /* swallow — UI shows idle if transcription fails */ }
        setBusy(false);
      };
      mr.start(500);
      mrRef.current = mr;
      setRec(true);
    } catch { /* permissions denied — UI already shows the disabled state */ }
  }, [token, onResult, selectedDeviceId]);

  const stop = useCallback(() => { mrRef.current?.state === 'recording' && mrRef.current.stop(); setRec(false); }, []);

  if (busy) return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: ACCENT_BG }}>
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: MUTED, borderTopColor: ACCENT }} />
    </div>
  );
  return (
    <button onClick={rec ? stop : start} disabled={disabled}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40 shadow-md hover:shadow-lg hover:scale-105"
      style={rec
        ? { background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.2)' }
        : { background: ACCENT, boxShadow: `0 0 0 4px ${ACCENT_BG}` }
      }
      title={rec ? 'Stop recording' : 'Voice input'}
    >
      {rec
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
      }
    </button>
  );
}
