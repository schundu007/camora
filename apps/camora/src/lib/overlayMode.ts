// Transparent-overlay mode manager (desktop/Electron only).
//
// The Electron window is created transparent + frameless. "Docked" mode paints a
// solid background and behaves like a normal window; "overlay" mode paints a
// transparent canvas and floats click-through above the meeting. The main process
// owns the window flags (always-on-top, click-through, bounds); this module owns
// the renderer side — the `data-overlay` attribute that drives CSS, and the bridge
// calls that tell main to flip the flags. All of it is gated on `window.camo` so
// the web build is never affected.
import { useSyncExternalStore } from 'react';

export type OverlayMode = 'docked' | 'overlay';

const camo = (): any => (typeof window !== 'undefined' ? (window as any).camo : undefined);
export const isElectron = (): boolean => !!camo()?.isDesktop;

let mode: OverlayMode = 'docked';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function applyDom(m: OverlayMode) {
  if (typeof document === 'undefined') return;
  if (m === 'overlay') document.documentElement.setAttribute('data-overlay', 'on');
  else document.documentElement.removeAttribute('data-overlay');
}

export function getOverlayMode(): OverlayMode {
  return mode;
}

/** Set the mode from the renderer (button click). Tells main to flip window flags. */
export function setOverlayMode(next: OverlayMode) {
  if (next === mode) return;
  mode = next;
  applyDom(mode);
  camo()?.overlay?.setMode?.(mode);
  // Keep the WHOLE window clickable in overlay mode (semi-transparent, not
  // click-through) — otherwise only the tiny control cluster captures clicks and
  // the app is unusable. Runs after setMode so it overrides main's default.
  if (mode === 'overlay') camo()?.overlay?.setInteractive?.(true);
  emit();
}

export function toggleOverlayMode() {
  setOverlayMode(mode === 'overlay' ? 'docked' : 'overlay');
}

/**
 * Sync the renderer when the GLOBAL HOTKEY (Cmd/Ctrl+Shift+O) toggles the mode in
 * the main process — main has already flipped the window flags, so here we only
 * mirror the state + DOM. Idempotent; safe to call once on mount.
 */
let hotkeyHandler: unknown = null;
export function initOverlayModeBridge() {
  const c = camo();
  if (!c?.overlay) return;
  // ALWAYS OPEN IN OVERLAY on packaged (overlay-capable) builds — user preference.
  // The renderer otherwise defaults to 'docked' on every (re)load.
  if (c.overlayEnabled && mode !== 'overlay') {
    mode = 'overlay';
    applyDom(mode);
    emit();
  }
  // Sync main → renderer on (re)load. The renderer + main can otherwise disagree
  // across reloads (main keeps its last state), leaving the window click-through
  // while the UI shows the other mode. Force main to match the renderer's mode.
  c.overlay.setMode?.(mode);
  if (mode === 'overlay') c.overlay.setInteractive?.(true);
  if (!c.overlay.onModeChanged || hotkeyHandler) return;
  hotkeyHandler = c.overlay.onModeChanged((m: OverlayMode) => {
    const next: OverlayMode = m === 'overlay' ? 'overlay' : 'docked';
    if (next === mode) return;
    mode = next;
    applyDom(mode);
    if (mode === 'overlay') c.overlay?.setInteractive?.(true);
    emit();
  });
}

/**
 * In overlay mode, tell main whether the pointer is over an interactive element:
 * true → the element captures clicks; false → clicks pass through to the meeting.
 * No-op in docked mode.
 */
export function setOverlayInteractive(interactive: boolean) {
  if (mode !== 'overlay') return;
  camo()?.overlay?.setInteractive?.(interactive);
}

export function useOverlayMode(): OverlayMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getOverlayMode,
    getOverlayMode,
  );
}
