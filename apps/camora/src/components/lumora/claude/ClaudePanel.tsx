// Embedded Claude — loads claude.ai INSIDE Lumora so the user never leaves the app.
//
// Desktop (Electron): renders a real <webview> — a separate top-level browsing
// context, so claude.ai's `frame-ancestors 'none'` CSP / X-Frame-Options (which
// block a normal <iframe>) do NOT apply. Login persists via a `persist:claude`
// partition, and the webview inherits the window's content-protection, so when
// stealth is on the embedded Claude is hidden from screen share too.
//
// Web (browser build): claude.ai cannot be iframed, so we show a one-click card
// that opens it in a real browser tab instead.
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { isElectron } from '../../../lib/overlayMode';

const CLAUDE_URL = 'https://claude.ai/new';

// Opening prompt for "Interview mode". claude.ai has no system-prompt hook we
// can reach from outside, but /new?q=<text> seeds the first turn — which is the
// one stable, documented way to frame the conversation without touching its DOM.
// Written for a LIVE interview: the answer is read at a glance, mid-sentence.
const INTERVIEW_SEED = [
  'You are supporting me during a live technical interview. I will paste or dictate',
  'questions as they are asked, so answer for someone reading you while speaking.',
  '',
  'Every answer:',
  '- Lead with the answer in one sentence. No preamble, no restating the question.',
  '- Then at most 4 short bullets I can expand out loud.',
  '- Coding: give the approach first, then code, then time and space complexity.',
  '- System design: start with the constraint that drives the design, then components.',
  '- Behavioral: use STAR, and keep the Result concrete and quantified.',
  '- If the question is ambiguous, state the assumption you made and answer anyway.',
  '  Do not ask me clarifying questions — there is no time to relay them.',
  '',
  'Acknowledge in one line, then wait for my first question.',
].join('\n');

// Injected into the webview to fit claude.ai into a panel far narrower than a
// browser window. HIDE-ONLY BY DESIGN: claude.ai's class names are generated at
// build time and change without notice, so these selectors are brittle. Keeping
// every rule to display/width means a stale selector degrades to "the sidebar
// came back" — never to a broken or blank panel. Expect occasional upkeep; that
// is inherent to restyling someone else's app, not a bug in this file.
const PANEL_CSS = `
  /* Conversation sidebar and recents — the panel is too narrow to spare it. */
  aside,
  [data-testid*="sidebar" i],
  nav[aria-label*="sidebar" i],
  nav[aria-label*="conversation" i] { display: none !important; }

  /* Marketing and upsell strips waste vertical space we do not have. */
  [class*="banner" i],
  [data-testid*="upgrade" i] { display: none !important; }

  /* Reclaim the gutters the sidebar used to occupy. */
  main { padding-left: 0 !important; padding-right: 0 !important; max-width: 100% !important; }

  /* Match the shell: never let the embed scroll sideways inside the panel. */
  html, body { overflow-x: hidden !important; }
`;

const ZOOM_MIN = -3;
const ZOOM_MAX = 2;

export function ClaudePanel({ isActive }: { isActive: boolean }) {
  const webviewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(0);
  const desktop = isElectron();

  // Wire webview lifecycle events (Electron only). did-finish-load hides the
  // spinner; did-fail-load surfaces a retry. Guard every access — the element
  // only exists in the Electron build.
  useEffect(() => {
    if (!desktop) return;
    const wv = webviewRef.current;
    if (!wv) return;
    const onStart = () => { setLoading(true); setFailed(false); };
    const onStop = () => setLoading(false);
    const onFail = (e: any) => {
      // -3 (ABORTED) fires on normal in-app navigations — ignore it.
      if (e?.errorCode === -3) return;
      setLoading(false);
      setFailed(true);
    };
    // claude.ai is an SPA: a single injection at first load is lost the moment
    // it navigates. Re-apply on every navigation, and swallow failures — the
    // panel must work whether or not the styling lands.
    const applyCss = () => { try { wv.insertCSS?.(PANEL_CSS); } catch { /* styling is best-effort */ } };

    wv.addEventListener('did-start-loading', onStart);
    wv.addEventListener('did-stop-loading', onStop);
    wv.addEventListener('did-finish-load', onStop);
    wv.addEventListener('did-fail-load', onFail);
    wv.addEventListener('dom-ready', applyCss);
    wv.addEventListener('did-navigate', applyCss);
    wv.addEventListener('did-navigate-in-page', applyCss);
    return () => {
      wv.removeEventListener('did-start-loading', onStart);
      wv.removeEventListener('did-stop-loading', onStop);
      wv.removeEventListener('did-finish-load', onStop);
      wv.removeEventListener('did-fail-load', onFail);
      wv.removeEventListener('dom-ready', applyCss);
      wv.removeEventListener('did-navigate', applyCss);
      wv.removeEventListener('did-navigate-in-page', applyCss);
    };
  }, [desktop]);

  const reload = useCallback(() => {
    setFailed(false);
    try { webviewRef.current?.reload?.(); } catch { /* not ready */ }
  }, []);
  const goHome = useCallback(() => {
    try { webviewRef.current?.loadURL?.(CLAUDE_URL); } catch { /* not ready */ }
  }, []);
  const goBack = useCallback(() => {
    try { if (webviewRef.current?.canGoBack?.()) webviewRef.current.goBack(); } catch { /* not ready */ }
  }, []);
  const startInterviewChat = useCallback(() => {
    try { webviewRef.current?.loadURL?.(`${CLAUDE_URL}?q=${encodeURIComponent(INTERVIEW_SEED)}`); } catch { /* not ready */ }
  }, []);
  const stepZoom = useCallback((delta: number) => {
    setZoom(prev => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta));
      try { webviewRef.current?.setZoomLevel?.(next); } catch { /* not ready */ }
      return next;
    });
  }, []);

  // ── Web build — no embedding possible, offer to open in a browser tab ──
  if (!desktop) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-lg font-bold" style={{ color: 'var(--lum-text)' }}>Open Claude</h2>
        <p className="text-sm max-w-md" style={{ color: 'var(--lum-text-2)' }}>
          Claude can be embedded directly inside the Camora <strong>desktop app</strong>. In the
          browser, claude.ai blocks embedding, so it opens in a new tab instead.
        </p>
        <a
          href={CLAUDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary px-5 py-2.5 rounded-lg text-sm font-bold"
          style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)' }}
        >
          Open claude.ai ↗
        </a>
      </div>
    );
  }

  const strip = 'flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--lum-surface-hover)] transition-colors';

  // ── Desktop build — embed claude.ai in a webview ──
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Slim control strip: back / reload / new chat / interview mode / zoom. */}
      <div
        className="flex items-center gap-1 px-2 h-9 shrink-0"
        style={{ background: 'var(--lum-surface)', borderBottom: '1px solid var(--lum-border)' }}
      >
        <button type="button" onClick={goBack} data-tip="Back" aria-label="Back"
          className={strip} style={{ color: 'var(--lum-text-2)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button type="button" onClick={reload} data-tip="Reload" aria-label="Reload"
          className={strip} style={{ color: 'var(--lum-text-2)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
        </button>
        <button type="button" onClick={goHome} data-tip="New chat" aria-label="New chat"
          className="flex items-center gap-1.5 px-2 h-7 rounded hover:bg-[var(--lum-surface-hover)] transition-colors text-[12px] font-semibold"
          style={{ color: 'var(--lum-text-2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New chat
        </button>

        {/* Seeds the first turn so answers come back interview-shaped: answer
            first, four bullets, complexity for code, STAR for behavioral. */}
        <button type="button" onClick={startInterviewChat}
          data-tip="New chat framed for a live interview" aria-label="New interview chat"
          className="flex items-center gap-1.5 px-2 h-7 rounded transition-colors text-[12px] font-semibold"
          style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /></svg>
          Interview mode
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => stepZoom(-0.5)} disabled={zoom <= ZOOM_MIN}
            data-tip="Zoom out" aria-label="Zoom out"
            className={strip} style={{ color: 'var(--lum-text-2)', opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M20 20l-3.5-3.5" /></svg>
          </button>
          <button type="button" onClick={() => stepZoom(0.5)} disabled={zoom >= ZOOM_MAX}
            data-tip="Zoom in" aria-label="Zoom in"
            className={strip} style={{ color: 'var(--lum-text-2)', opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M8 11h6M11 8v6M20 20l-3.5-3.5" /></svg>
          </button>
          <span className="text-[12px] font-mono tabular-nums pl-1" style={{ color: 'var(--lum-text-2)' }}>claude.ai</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading && !failed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ color: 'var(--lum-text-2)' }}>
            <span className="text-sm">Loading Claude…</span>
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: 'var(--lum-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--lum-text-2)' }}>Couldn’t reach claude.ai.</p>
            <button type="button" onClick={reload} className="px-4 py-2 rounded text-sm font-semibold"
              style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)' }}>Retry</button>
          </div>
        )}
        {/* <webview> is an Electron intrinsic element not in React's JSX types —
            create it via createElement. The persist:claude partition keeps the
            Claude login across restarts; allowpopups lets Google OAuth open. */}
        {createElement('webview', {
          ref: webviewRef,
          src: CLAUDE_URL,
          className: 'claude-webview',
          partition: 'persist:claude',
          allowpopups: 'true',
          // Present a standard desktop-Chrome UA so Google doesn't reject sign-in
          // with "this browser may not be secure" (its embedded-webview block).
          useragent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          // Keep it mounted but let the parent's display:none hide it when the
          // tab is inactive — reloading on every switch would drop the chat.
          style: { width: '100%', height: '100%', display: isActive ? 'inline-flex' : 'inline-flex' },
        })}
      </div>
    </div>
  );
}
