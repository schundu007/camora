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

export function ClaudePanel({ isActive }: { isActive: boolean }) {
  const webviewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
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
    wv.addEventListener('did-start-loading', onStart);
    wv.addEventListener('did-stop-loading', onStop);
    wv.addEventListener('did-finish-load', onStop);
    wv.addEventListener('did-fail-load', onFail);
    return () => {
      wv.removeEventListener('did-start-loading', onStart);
      wv.removeEventListener('did-stop-loading', onStop);
      wv.removeEventListener('did-finish-load', onStop);
      wv.removeEventListener('did-fail-load', onFail);
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

  // ── Web build — no embedding possible, offer to open in a browser tab ──
  if (!desktop) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Open Claude</h2>
        <p className="text-sm max-w-md" style={{ color: 'var(--text-secondary)' }}>
          Claude can be embedded directly inside the Camora <strong>desktop app</strong>. In the
          browser, claude.ai blocks embedding, so it opens in a new tab instead.
        </p>
        <a
          href={CLAUDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary px-5 py-2.5 rounded-lg text-sm font-bold"
          style={{ background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)' }}
        >
          Open claude.ai ↗
        </a>
      </div>
    );
  }

  // ── Desktop build — embed claude.ai in a webview ──
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Slim control strip: back / reload / new chat. Matches rail chrome. */}
      <div
        className="flex items-center gap-1 px-2 h-9 shrink-0"
        style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
      >
        <button type="button" onClick={goBack} title="Back" aria-label="Back"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          style={{ color: 'var(--cam-strip-heading)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button type="button" onClick={reload} title="Reload" aria-label="Reload"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          style={{ color: 'var(--cam-strip-heading)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
        </button>
        <button type="button" onClick={goHome} title="New chat" aria-label="New chat"
          className="flex items-center gap-1.5 px-2 h-7 rounded hover:bg-[var(--bg-elevated)] transition-colors text-[11px] font-bold"
          style={{ color: 'var(--cam-strip-heading)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New chat
        </button>
        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cam-strip-heading)', opacity: 0.7 }}>claude.ai</span>
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading && !failed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ color: 'var(--text-muted)' }}>
            <span className="text-sm">Loading Claude…</span>
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: 'var(--bg-app)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Couldn’t reach claude.ai.</p>
            <button type="button" onClick={reload} className="px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)' }}>Retry</button>
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
