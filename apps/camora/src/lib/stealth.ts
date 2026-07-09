// Global stealth (screen-share invisibility) control. Stealth = the desktop
// window's content protection (kCGWindowSharingState = None on macOS): the whole
// Camora window — every tab, including the embedded Claude webview — is excluded
// from screen sharing / recording / screenshots.
//
// One source of truth: the persisted `isStealthActive` flag in session-store.
// Every entry point (the rail toggle, the ScreenshotStrip button) reads/writes
// the same flag, so they stay in lockstep automatically.
//
// Invariant: stealth is ON by default and is only ever OFF while a 30-minute
// countdown is running. Switching it off starts that countdown; when it elapses
// stealth turns back on automatically. The deadline is persisted, so it holds
// even across an app restart — stealth is never off longer than the window.
import { useCallback, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { dialogAlert } from '@/components/shared/Dialog';

// Stealth auto-re-enables this long after being switched off.
const AUTO_REENABLE_MS = 30 * 60 * 1000;

// Module-level so a single timer is shared no matter how many components call
// useStealth(), and so it survives component re-renders (but not a full window
// reload — that's what the persisted deadline + useSyncStealthOnLaunch handle).
let reenableTimer: ReturnType<typeof setTimeout> | null = null;

function clearReenableTimer() {
  if (reenableTimer !== null) {
    clearTimeout(reenableTimer);
    reenableTimer = null;
  }
}

// Schedule the auto-re-enable for `deadline` (epoch ms). Fires immediately when
// the deadline is already in the past (e.g. the app was closed past it).
function scheduleReenable(deadline: number) {
  clearReenableTimer();
  const delay = Math.max(0, deadline - Date.now());
  reenableTimer = setTimeout(() => {
    reenableTimer = null;
    void applyStealth(true);
  }, delay);
}

// Single choke point for changing stealth: pushes protection to the Electron
// window, updates the persisted flag, and manages the auto-re-enable
// deadline/timer — so the UI toggle, the persisted state, and the real window
// protection can never drift apart.
async function applyStealth(on: boolean) {
  const store = useSessionStore.getState();
  const camo = (window as any).camo;
  if (camo?.setStealthMode) {
    try { await camo.setStealthMode(on); } catch { /* ignore */ }
  }
  store.setIsStealthActive(on);
  if (on) {
    store.setStealthOffUntil(null);
    clearReenableTimer();
  } else {
    const deadline = Date.now() + AUTO_REENABLE_MS;
    store.setStealthOffUntil(deadline);
    scheduleReenable(deadline);
  }
}

export function useStealth() {
  const isStealthActive = useSessionStore(s => s.isStealthActive);
  const available = typeof window !== 'undefined' && !!(window as any).camo?.setStealthMode;

  const setStealth = useCallback(async (next: boolean, opts?: { silent?: boolean }) => {
    if (!(window as any).camo?.setStealthMode) {
      if (!opts?.silent) {
        await dialogAlert({
          title: 'Desktop only',
          message: 'Stealth mode (hiding Camora from your screen share) requires the Camora desktop app.',
        });
      }
      return;
    }
    await applyStealth(next);
  }, []);

  // Read the live value via getState() so rapid toggles never act on a stale
  // closure of isStealthActive.
  const toggleStealth = useCallback(() => {
    void setStealth(!useSessionStore.getState().isStealthActive);
  }, [setStealth]);

  return { isStealthActive, available, toggleStealth, setStealth };
}

// Reconcile the persisted stealth choice with the desktop window once on mount.
// main.js applies content protection at window creation (default ON), but the
// renderer's persisted flag is the user's actual choice. Enforce the invariant:
// stealth is only OFF while a live countdown is running — otherwise turn it back
// on. Runs once; safe on the web build (no camo → no-op).
export function useSyncStealthOnLaunch() {
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.setStealthMode) return;

    const { isStealthActive, stealthOffUntil } = useSessionStore.getState();
    if (isStealthActive) {
      try { camo.setStealthMode(true); } catch { /* ignore */ }
      return;
    }
    // Stealth is persisted OFF. Resume the countdown for its remaining time; if
    // the deadline already elapsed while the app was closed — or there is none
    // (legacy off-state from before auto-re-enable existed) — turn it back on.
    if (stealthOffUntil && Date.now() < stealthOffUntil) {
      try { camo.setStealthMode(false); } catch { /* ignore */ }
      scheduleReenable(stealthOffUntil);
    } else {
      void applyStealth(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
