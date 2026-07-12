/**
 * Tracks whether the app is running in Electron transparent-overlay mode,
 * i.e. <html data-overlay="on"> (set by the desktop shell when the window
 * is floated as an always-on-top overlay; never set in the web build).
 *
 * Why a hook: the overlay surface is a DARK graphite frost in BOTH light and
 * dark app themes (see globals.css `html[data-overlay='on']` rules), and it
 * strips inner editor backgrounds to transparent. So Monaco editors sitting
 * on the overlay must render with a DARK theme (light tokens) regardless of
 * the app's light/dark theme — otherwise light-theme 'vs' dark tokens land on
 * dark graphite and become invisible. Components read this to pick the Monaco
 * theme. Reactive via MutationObserver so docking/undocking flips it live.
 */
import { useEffect, useState } from 'react';

function readOverlay(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.overlay === 'on';
}

export function useOverlayMode(): boolean {
  const [overlay, setOverlay] = useState<boolean>(readOverlay);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setOverlay(root.dataset.overlay === 'on');
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['data-overlay'] });
    return () => obs.disconnect();
  }, []);

  return overlay;
}
