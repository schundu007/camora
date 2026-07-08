// Global stealth (screen-share invisibility) control. Stealth = the desktop
// window's content protection (kCGWindowSharingState = None on macOS): the whole
// Camora window — every tab, including the embedded Claude webview — is excluded
// from screen sharing / recording / screenshots.
//
// One source of truth: the persisted `isStealthActive` flag in session-store.
// Every entry point (the rail toggle, the ScreenshotStrip button) reads/writes
// the same flag, so they stay in lockstep automatically.
import { useCallback, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { dialogAlert } from '@/components/shared/Dialog';

export function useStealth() {
  const isStealthActive = useSessionStore(s => s.isStealthActive);
  const setIsStealthActive = useSessionStore(s => s.setIsStealthActive);
  const available = typeof window !== 'undefined' && !!(window as any).camo?.setStealthMode;

  const setStealth = useCallback(async (next: boolean, opts?: { silent?: boolean }) => {
    const camo = (window as any).camo;
    if (!camo?.setStealthMode) {
      if (!opts?.silent) {
        await dialogAlert({
          title: 'Desktop only',
          message: 'Stealth mode (hiding Camora from your screen share) requires the Camora desktop app.',
        });
      }
      return;
    }
    await camo.setStealthMode(next);
    setIsStealthActive(next);
  }, [setIsStealthActive]);

  const toggleStealth = useCallback(() => { void setStealth(!isStealthActive); }, [isStealthActive, setStealth]);

  return { isStealthActive, available, toggleStealth, setStealth };
}

// Push the PERSISTED stealth choice down to the desktop window once on mount.
// main.js applies content protection at window creation (default ON), but the
// renderer's persisted flag is the user's actual choice — reconcile them so the
// toggle UI and the real window protection never disagree (the long-standing
// "React vs Electron stealth mismatch"). Runs once; safe on the web build (no-op).
export function useSyncStealthOnLaunch() {
  const isStealthActive = useSessionStore(s => s.isStealthActive);
  useEffect(() => {
    const camo = (window as any).camo;
    if (camo?.setStealthMode) { try { camo.setStealthMode(isStealthActive); } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
