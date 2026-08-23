import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeakerAudio } from './SpeakerAudio';

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
 *   • If the stream DIED on its own (`droppedUnexpectedly`), surface the
 *     banner IMMEDIATELY — a dead stream is `active === false`, which the
 *     old `active`-only guard silently skipped, so the exact failure this
 *     watchdog exists for (share picker stopping) produced no warning at all.
 *   • If the stream is `active === true` and silent-since is older
 *     than STALE_AFTER_MS, surface a banner with one-click reconnect.
 *   • The banner is dismissable; once dismissed for the current
 *     active session, it stays dismissed until the next reconnect.
 */

// Live-but-silent ceiling.
//
// 4 minutes was wrong in practice. Silence on a LIVE stream is not evidence of
// anything: the candidate talks for minutes at a stretch, a take-home stretch
// or a coding round can run half an hour with the interviewer muted, and the
// banner fired through all of it — an interruption, mid-interview, over a
// stream that was working. The genuine failure this watchdog exists for is the
// share picker stopping in the background, and that arrives as
// `droppedUnexpectedly`, which still surfaces IMMEDIATELY (see below) and does
// not wait on this timer at all.
//
// So this is now a long backstop rather than a nag: an hour of live-but-silent
// audio is genuinely odd and worth one prompt, and it cannot fire twice within
// a session anyone is actually using.
const STALE_AFTER_MS = 60 * 60 * 1000;    // 1 hour
const SPEECH_THRESHOLD = 0.012;
const SAMPLE_INTERVAL_MS = 5000;          // sample the level every 5s — cheap

export const SilentStreamBanner = () => {
  const { active, level, droppedUnexpectedly, start, stop } = useSpeakerAudio();
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

  // A dead stream (dropped on its own) takes priority and shows instantly —
  // this is the failure that leaves Sona permanently deaf mid-interview.
  // Otherwise fall back to the live-but-silent watchdog.
  const dead = droppedUnexpectedly && !active;
  if (dismissed) return null;   // honored for both paths; auto-resets on reconnect
  if (!dead) {
    if (!active) return null;
    if (silentForMs < STALE_AFTER_MS) return null;
  }

  // "silent for 63 min" is arithmetic the reader has to do; past an hour, say
  // hours. The threshold is an hour now, so this is the normal case.
  const minutes = Math.floor(silentForMs / 60000);
  const silentFor = minutes >= 60
    ? `${Math.floor(minutes / 60)} hr${minutes >= 120 ? 's' : ''}`
    : `${minutes || 'several'} min`;
  const accent = dead ? 'var(--danger)' : 'var(--warning)';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 max-w-md w-[92%] rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: dead ? 'rgba(219,0,0,0.16)' : 'rgba(251,211,50,0.14)',
        border: `1px solid ${dead ? 'rgba(219,0,0,0.6)' : 'rgba(251,211,50,0.55)'}`,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        color: 'var(--text-primary)',
      }}
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M4.93 19h14.14a2 2 0 001.74-3l-7.07-12.25a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">
          {dead ? 'Speaker audio disconnected — Sona can’t hear the interviewer' : `Speaker audio has been silent for ${silentFor}`}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {dead
            ? 'The capture stream stopped (usually the screen-share picker closing in the background). Sona won’t answer new questions until you reconnect.'
            : 'The capture is technically connected but no voice has been detected. The most common cause is the screen-share picker stopping in the background. Reconnect to be safe.'}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={reconnect}
            className="px-3 py-1 text-[12px] font-bold rounded-md"
            style={{ background: 'var(--warning)', color: '#000' }}
          >
            Reconnect now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1 text-[12px] font-bold rounded-md"
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
