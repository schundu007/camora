// Frameless-window controls for the desktop build. The Electron window is now
// `frame: false` (so it can be transparent), which removes the native traffic
// lights — so these min/close buttons are REQUIRED for the window to be usable.
// The same cluster hosts the overlay ⇄ docked toggle. Pinned top-right inside the
// existing 28px drag strip (globals.css `body.electron-desktop::before`).
//
// Gated on Electron: renders nothing in the web build.
import { useEffect } from 'react';
import {
  isElectron,
  useOverlayMode,
  toggleOverlayMode,
  initOverlayModeBridge,
} from '../../../lib/overlayMode';

// READABILITY FLOOR for the transparency slider. Stealth comes from
// setContentProtection (the window is already excluded from screen capture), NOT
// from being see-through — so there is no reason to allow an opacity that makes
// the app unusable. The old floor of 0.3 painted the whole shell onto the
// desktop wallpaper: chrome bands vanished and code became unreadable. Anything
// below this is clamped, including a value persisted from the old range.
const MIN_OVERLAY_OPACITY = 0.75;
const DEFAULT_OVERLAY_OPACITY = 0.9;

const clampOpacity = (v: number) =>
  Number.isFinite(v) && v > 0 ? Math.min(1, Math.max(MIN_OVERLAY_OPACITY, v)) : DEFAULT_OVERLAY_OPACITY;

export function DesktopWindowControls() {
  const mode = useOverlayMode();
  useEffect(() => {
    initOverlayModeBridge();
    // Restore the saved overlay transparency, clamped to the readability floor.
    try {
      const saved = localStorage.getItem('lumora.overlayOpacity');
      if (saved) {
        const v = clampOpacity(Number(saved));
        document.documentElement.style.setProperty('--overlay-opacity', String(v));
        // Rewrite the stored value so a pre-floor setting doesn't keep re-clamping.
        localStorage.setItem('lumora.overlayOpacity', String(v));
      }
    } catch { /* ignore */ }
  }, []);

  const setOpacity = (v: number) => {
    const next = clampOpacity(v);
    document.documentElement.style.setProperty('--overlay-opacity', String(next));
    try { localStorage.setItem('lumora.overlayOpacity', String(next)); } catch { /* ignore */ }
  };
  const savedOpacity = (() => {
    try { return clampOpacity(Number(localStorage.getItem('lumora.overlayOpacity'))); } catch { return DEFAULT_OVERLAY_OPACITY; }
  })();

  const camo = (window as any).camo;
  // Only render when the desktop window was actually created frameless (opt-in
  // overlay build). A normal framed window keeps its native traffic lights, so
  // these custom controls would be a duplicate/overlap.
  if (!isElectron() || !camo?.overlayEnabled || typeof document === 'undefined') return null;
  const overlay = mode === 'overlay';

  // Rendered in the React tree (NOT portaled to body — that put it outside React's
  // event root #root, so the grip's onMouseDown never fired). position:fixed keeps
  // it pinned top-right and above app content regardless of DOM position.
  return (
    <div
      className={`desktop-winctl${overlay ? ' desktop-winctl--overlay' : ''}`}
      // Overlay mode keeps the WHOLE window clickable (set once on overlay entry in
      // overlayMode.ts), so no per-element click-through toggling here — that was
      // what locked the rest of the UI out.
    >
      {/* Wide drag handle — a non-button element so -webkit-app-region:drag actually
          catches (buttons are no-drag). This is the reliable way to move the window. */}
      <div
        className="desktop-winctl__grip"
        data-tip="Drag to move the window"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          const onMove = (ev: MouseEvent) => camo?.window?.dragMove?.(ev.movementX, ev.movementY);
          const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><circle cx="3" cy="3" r="1.3"/><circle cx="8" cy="3" r="1.3"/><circle cx="13" cy="3" r="1.3"/><circle cx="3" cy="9" r="1.3"/><circle cx="8" cy="9" r="1.3"/><circle cx="13" cy="9" r="1.3"/></svg>
      </div>
      {overlay && (
        <input
          type="range"
          className="desktop-winctl__slider"
          min={MIN_OVERLAY_OPACITY}
          max={1}
          step={0.01}
          defaultValue={savedOpacity}
          data-tip="Transparency (left = more see-through, right = more solid)"
          onInput={(e) => setOpacity(Number((e.target as HTMLInputElement).value))}
        />
      )}
      <button
        type="button"
        className="desktop-winctl__toggle"
        onClick={() => toggleOverlayMode()}
        data-tip={overlay ? 'Dock the window (⌘⇧O)' : 'Float over the meeting (⌘⇧O)'}
        aria-label={overlay ? 'Dock the window' : 'Float over the meeting'}
      >
        {overlay ? (
          /* Dock — collapse the floating panel back into the docked shell. */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 15h18" />
          </svg>
        ) : (
          /* Overlay — float a small panel over the meeting (picture-in-picture). */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="desktop-winctl__btn"
        onClick={() => camo?.window?.minimize?.()}
        data-tip="Minimize"
        aria-label="Minimize"
      >
        {/* minus */}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="4.5" width="8" height="1" rx="0.9" fill="currentColor" /></svg>
      </button>
      <button
        type="button"
        className="desktop-winctl__btn desktop-winctl__btn--close"
        onClick={() => camo?.window?.close?.()}
        data-tip="Close"
        aria-label="Close"
      >
        {/* x */}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
