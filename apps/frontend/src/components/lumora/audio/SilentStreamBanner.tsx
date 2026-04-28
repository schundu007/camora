import { useCallback, useEffect, useRef, useState } from 'react';
import { useInterviewerAudio } from './InterviewerAudio';

/**
 * Watchdog that warns the user when the interviewer-audio stream has
 * been technically connected but silent for an unusually long time —
 * the most common silent failure is the user's screen-share dialog
 * timing out and the picker auto-stopping the stream after a tab
 * close, leaving Camora's UI green but the audio dead.
 *
 * Logic:
 *   • Watch level every animation frame the provider updates.
 *   • Reset the silent-since timer whenever level crosses the speech
 *     threshold.
 *   • If the stream is `active === true` and silent-since is older
 *     than STALE_AFTER_MS, surface a banner with one-click reconnect.
 *   • The banner is dismissable; once dismissed for the current
 *     active session, it stays dismissed until the next reconnect.
 */

const STALE_AFTER_MS = 5 * 60 * 1000;     // 5 minutes
const SPEECH_THRESHOLD = 0.012;
const SAMPLE_INTERVAL_MS = 5000;          // sample the level every 5s — cheap

export function SilentStreamBanner() {
  const { active, level, start, stop } = useInterviewerAudio();
  const [silentForMs, setSilentForMs] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const lastHeardRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<number>(0);

  // Reset when the stream goes inactive or restarts.
  useEffect(() => {
    if (active) {
      sessionIdRef.current += 1;
      lastHeardRef.current = Date.now();
      setSilentForMs(0);
      setDismissed(false);
    } else {
      setSilentForMs(0);
    }
  }, [active]);

  // Track most recent moment the level crossed the speech threshold.
  useEffect(() => {
    if (!active) return;
    if (level > SPEECH_THRESHOLD) {
      lastHeardRef.current = Date.now();
      // Once we hear something again, undismiss so a future stale
      // window can re-prompt.
      if (dismissed) setDismissed(false);
    }
  }, [active, level, dismissed]);

  // Periodically re-evaluate the silent duration.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setSilentForMs(Date.now() - lastHeardRef.current);
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active]);

  const reconnect = useCallback(async () => {
    stop();
    // Tiny delay so the picker UI doesn't flash on top of the old stream.
    await new Promise((r) => setTimeout(r, 100));
    await start();
  }, [start, stop]);

  if (!active) return null;
  if (dismissed) return null;
  if (silentForMs < STALE_AFTER_MS) return null;

  const minutes = Math.floor(silentForMs / 60000);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-md w-[92%] rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: 'rgba(245,158,11,0.14)',
        border: '1px solid rgba(245,158,11,0.55)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        color: 'var(--text-primary)',
      }}
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12.25a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">Interviewer audio has been silent for {minutes || 'several'} min</div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          The capture is technically connected but no voice has been detected. The most common cause is the screen-share picker stopping in the background. Reconnect to be safe.
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={reconnect}
            className="px-3 py-1 text-[11px] font-bold rounded-md"
            style={{ background: '#f59e0b', color: '#000' }}
          >
            Reconnect now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1 text-[11px] font-bold rounded-md"
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
