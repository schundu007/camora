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
// stealth turns back on automatically. The countdown is in-memory only — quitting
// and reopening the app always relaunches with stealth ON (see useSyncStealthOnLaunch).
import { useCallback, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { dialogAlert } from '@/components/shared/Dialog';

// Stealth auto-re-enables this long after being switched off.
const AUTO_REENABLE_MS = 30 * 60 * 1000;

// Module-level so a single timer is shared no matter how many components call
// useStealth(), and so it survives component re-renders. It is NOT persisted and
// dies with the process — a relaunch always starts fresh with stealth ON.
let reenableTimer: ReturnType<typeof setTimeout> | null = null;

function clearReenableTimer() {
  if (reenableTimer !== null) {
    clearTimeout(reenableTimer);
    reenableTimer = null;
  }
}

// Single choke point for changing stealth: pushes protection to the Electron
// window, updates the persisted flag, and manages the auto-re-enable timer — so
// the UI toggle, the stored state, and the real window protection can't drift.
async function applyStealth(on: boolean) {
  const store = useSessionStore.getState();
  const camo = (window as any).camo;
  if (camo?.setStealthMode) {
    try { await camo.setStealthMode(on); } catch { /* ignore */ }
  }
  store.setIsStealthActive(on);
  clearReenableTimer();
  if (!on) {
    // Start the 30-min countdown that flips stealth back on. In-memory only, so
    // quitting mid-countdown and reopening relaunches with stealth ON instead of
    // resuming the timer.
    reenableTimer = setTimeout(() => {
      reenableTimer = null;
      void applyStealth(true);
    }, AUTO_REENABLE_MS);
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

// Force stealth ON once on mount. main.js already applies content protection at
// window creation (default ON); this makes the renderer's state agree and, more
// importantly, overrides any previously-persisted OFF choice — so quitting and
// reopening the app always relaunches with stealth ON, never off. Runs once;
// safe on the web build (no camo → no-op).
export function useSyncStealthOnLaunch() {
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.setStealthMode) return;
    void applyStealth(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
