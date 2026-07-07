// Frameless-window controls for the desktop build. The Electron window is now
// `frame: false` (so it can be transparent), which removes the native traffic
// lights — so these min/close buttons are REQUIRED for the window to be usable.
// The same cluster hosts the overlay ⇄ docked toggle. Pinned top-right inside the
// existing 28px drag strip (globals.css `body.electron-desktop::before`).
//
// Gated on Electron: renders nothing in the web build.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  isElectron,
  useOverlayMode,
  toggleOverlayMode,
  setOverlayInteractive,
  initOverlayModeBridge,
} from '../../../lib/overlayMode';

export function DesktopWindowControls() {
  const mode = useOverlayMode();
  useEffect(() => {
    initOverlayModeBridge();
  }, []);

  const camo = (window as any).camo;
  // Only render when the desktop window was actually created frameless (opt-in
  // overlay build). A normal framed window keeps its native traffic lights, so
  // these custom controls would be a duplicate/overlap.
  if (!isElectron() || !camo?.overlayEnabled || typeof document === 'undefined') return null;
  const overlay = mode === 'overlay';

  // Portal to <body> so the cluster sits outside #root — it stays visible even
  // if overlay mode later hides the shell, and always paints above app content.
  return createPortal(
    <div
      className={`desktop-winctl${overlay ? ' desktop-winctl--overlay' : ''}`}
      // In overlay mode the window is click-through by default; keep this cluster
      // clickable while the pointer is over it, then release on leave.
      onPointerEnter={() => setOverlayInteractive(true)}
      onPointerLeave={() => setOverlayInteractive(false)}
    >
      <button
        type="button"
        className="desktop-winctl__toggle"
        onClick={() => toggleOverlayMode()}
        title={overlay ? 'Dock the window (⌘⇧O)' : 'Float over the meeting (⌘⇧O)'}
      >
        {overlay ? 'Dock' : 'Overlay'}
      </button>
      <button
        type="button"
        className="desktop-winctl__btn"
        onClick={() => camo?.window?.minimize?.()}
        title="Minimize"
        aria-label="Minimize"
      >
        {/* minus */}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="4.5" width="8" height="1" rx="0.5" fill="currentColor" /></svg>
      </button>
      <button
        type="button"
        className="desktop-winctl__btn desktop-winctl__btn--close"
        onClick={() => camo?.window?.close?.()}
        title="Close"
        aria-label="Close"
      >
        {/* x */}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
      </button>
    </div>,
    document.body,
  );
}
