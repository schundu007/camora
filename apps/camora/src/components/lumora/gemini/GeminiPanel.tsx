// Embedded Google AI Studio — a second opinion alongside the Claude tab, loaded
// INSIDE Lumora so the user never leaves the app mid-interview.
//
// Why AI Studio and not gemini.google.com: AI Studio exposes a real System
// instructions field. claude.ai has no system-prompt hook reachable from
// outside (the Claude tab seeds its first turn through /new?q= instead), so
// AI Studio is the only Google surface where "customised for a live interview"
// can mean actual system instructions rather than a first user message.
//
// Desktop only. A <webview> is a separate top-level browsing context, so
// aistudio.google.com's frame-ancestors CSP (which blocks a normal <iframe>)
// does not apply. Login persists via a `persist:gemini` partition, and the
// webview inherits the window's content-protection, so stealth hides it from a
// screen share like everything else in the shell. The rail hides this tab in
// the web build and the route redirects, so there is no browser fallback here.
import { createElement, useCallback, useEffect, useRef, useState } from 'react';

const AISTUDIO_URL = 'https://aistudio.google.com/prompts/new_chat';

// System instructions for a LIVE interview: the answer is read at a glance,
// mid-sentence, while the candidate is speaking. The coding half carries the
// house solution contract — the solution the interviewer already recognises,
// not the cleverest one.
const INTERVIEW_SEED = [
  'You are supporting me during a live technical interview. I will paste or dictate',
  'questions as they are asked, so answer for someone reading you while speaking.',
  '',
  'Every answer:',
  '- Lead with the answer in one sentence. No preamble, no restating the question.',
  '- Then at most 4 short bullets I can expand out loud.',
  '- If the question is ambiguous, state the assumption you made and answer anyway.',
  '  Do not ask me clarifying questions — there is no time to relay them.',
  '',
  'Coding questions — approach first, then code, then time and space complexity.',
  'Write the solution the interviewer already recognises, not the cleverest one:',
  '- Solve the problem as asked. Do not pattern-match the title to a similar',
  '  well-known problem and answer that one instead.',
  '- Plain built-ins over exotic ones: dict, not OrderedDict; list, not deque,',
  '  unless the problem genuinely needs the queue.',
  '- Import only what you use. No import you can avoid.',
  '- Read stdin line by line in the order the problem states. Never slurp all of',
  '  stdin and slice it, and never wrap reads in try/except EOFError.',
  '- Print results in the driver. Do not return a pre-formatted string.',
  '- Match the accepted community solution on HackerRank, CodeSignal, CoderPad or',
  '  Glider. Familiar beats short; a shorter line count never buys unfamiliarity.',
  '',
  'System design — start with the constraint that drives the design, then components.',
  'Behavioural — use STAR, and keep the Result concrete and quantified.',
].join('\n');

// Injected to fit AI Studio — a developer console — into a panel far narrower
// than a browser window. HIDE-ONLY BY DESIGN: AI Studio's class names are
// generated at build time and change without notice, so these selectors are
// brittle. Keeping every rule to display/width means a stale selector degrades
// to "the drawer came back" — never to a broken or blank panel. Expect
// occasional upkeep; that is inherent to restyling someone else's app.
const PANEL_CSS = `
  /* Left nav and prompt library — the panel is too narrow to spare them. */
  ms-navbar,
  ms-side-navigation,
  nav[aria-label*="navigation" i] { display: none !important; }

  /* Right-hand run-settings drawer: model picker, temperature, token counts.
     Set once, then it is pure width. */
  ms-run-settings,
  [data-test-id*="run-settings" i] { display: none !important; }

  /* Marketing and upsell strips waste vertical space we do not have. */
  [class*="banner" i],
  [data-test-id*="upgrade" i] { display: none !important; }

  /* Reclaim the gutters those panels used to occupy. */
  main, ms-prompt-page { padding-left: 0 !important; padding-right: 0 !important; max-width: 100% !important; }

  /* Match the shell: never let the embed scroll sideways inside the panel. */
  html, body { overflow-x: hidden !important; }
`;

// Fills AI Studio's System instructions field with the interview framing.
//
// Two tiers on purpose. AI Studio is Angular, so a bare `el.value = x` is
// invisible to it — the native setter plus a real `input` event is what makes
// the binding notice. If the system-instructions selector has rotted, we fall
// back to typing the framing into the prompt box, which is exactly what the
// Claude tab does today. Returns which tier landed so the UI can say so
// honestly rather than claim success it cannot see.
const seedScript = (seed: string) => `
(function () {
  var seed = ${JSON.stringify(seed)};
  function fill(el) {
    var setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (setter && setter.set) { setter.set.call(el, seed); } else { el.value = seed; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.focus();
  }
  function find(sels) {
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) return el;
    }
    return null;
  }

  // The field is behind a collapsed "System instructions" control on a fresh
  // prompt — open it first, otherwise there is nothing in the DOM to fill.
  var sys = find([
    'textarea[aria-label*="System instructions" i]',
    'textarea[placeholder*="System instructions" i]',
    'ms-system-instructions textarea'
  ]);
  if (!sys) {
    var toggles = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]'));
    for (var j = 0; j < toggles.length; j++) {
      if ((toggles[j].textContent || '').toLowerCase().indexOf('system instruction') !== -1) {
        toggles[j].click();
        break;
      }
    }
    sys = find([
      'textarea[aria-label*="System instructions" i]',
      'textarea[placeholder*="System instructions" i]',
      'ms-system-instructions textarea'
    ]);
  }
  if (sys) { fill(sys); return 'system'; }

  var prompt = find([
    'textarea[aria-label*="Type something" i]',
    'textarea[placeholder*="Type something" i]',
    'ms-autosize-textarea textarea',
    'ms-prompt-input-wrapper textarea',
    'textarea'
  ]);
  if (prompt) { fill(prompt); return 'prompt'; }

  return 'none';
})();
`;

const ZOOM_MIN = -3;
const ZOOM_MAX = 2;

type SeedResult = 'system' | 'prompt' | 'none';

const SEED_MESSAGE: Record<SeedResult, string> = {
  system: 'Interview framing set as system instructions.',
  prompt: 'System instructions not found — framing typed into the prompt instead.',
  none: 'Couldn’t reach either field. Use Copy prompt and paste it in.',
};

export function GeminiPanel() {
  const webviewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Wire webview lifecycle events. did-finish-load hides the spinner;
  // did-fail-load surfaces a retry. Guard every access — the element only
  // exists in the Electron build.
  useEffect(() => {
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
    // AI Studio is an SPA: a single injection at first load is lost the moment
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
  }, []);

  // Clear the seed/copy status after a few seconds so it never becomes chrome.
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const reload = useCallback(() => {
    setFailed(false);
    try { webviewRef.current?.reload?.(); } catch { /* not ready */ }
  }, []);
  const goHome = useCallback(() => {
    try { webviewRef.current?.loadURL?.(AISTUDIO_URL); } catch { /* not ready */ }
  }, []);
  const goBack = useCallback(() => {
    try { if (webviewRef.current?.canGoBack?.()) webviewRef.current.goBack(); } catch { /* not ready */ }
  }, []);

  const startInterviewChat = useCallback(async () => {
    const wv = webviewRef.current;
    if (!wv?.executeJavaScript) return;
    try {
      const result: SeedResult = await wv.executeJavaScript(seedScript(INTERVIEW_SEED), true);
      setStatus(SEED_MESSAGE[result] ?? SEED_MESSAGE.none);
    } catch {
      setStatus(SEED_MESSAGE.none);
    }
  }, []);

  const copySeed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(INTERVIEW_SEED);
      setCopied(true);
    } catch {
      setStatus('Clipboard unavailable.');
    }
  }, []);

  const stepZoom = useCallback((delta: number) => {
    setZoom(prev => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta));
      try { webviewRef.current?.setZoomLevel?.(next); } catch { /* not ready */ }
      return next;
    });
  }, []);

  const strip = 'flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--lum-surface-hover)] transition-colors';

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
        <button type="button" onClick={goHome} data-tip="New prompt" aria-label="New prompt"
          className="flex items-center gap-1.5 px-2 h-7 rounded hover:bg-[var(--lum-surface-hover)] transition-colors text-[12px] font-semibold"
          style={{ color: 'var(--lum-text-2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New prompt
        </button>

        {/* Fills System instructions so answers come back interview-shaped:
            answer first, four bullets, platform-idiomatic code, STAR. */}
        <button type="button" onClick={startInterviewChat}
          data-tip="Set system instructions for a live interview" aria-label="Interview mode"
          className="flex items-center gap-1.5 px-2 h-7 rounded transition-colors text-[12px] font-semibold"
          style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /></svg>
          Interview mode
        </button>

        {/* Escape hatch: if AI Studio's selectors have rotted, the framing is
            always one paste away rather than a dead end. */}
        <button type="button" onClick={copySeed}
          data-tip="Copy the interview framing to paste in manually" aria-label="Copy prompt"
          className="flex items-center gap-1.5 px-2 h-7 rounded hover:bg-[var(--lum-surface-hover)] transition-colors text-[12px] font-semibold"
          style={{ color: 'var(--lum-text-2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          {copied ? 'Copied' : 'Copy prompt'}
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
          <span className="text-[12px] font-mono tabular-nums pl-1" style={{ color: 'var(--lum-text-2)' }}>ai studio</span>
        </div>
      </div>

      {/* Says which tier of the seed actually landed — never claims a success
          the injection could not confirm. */}
      {status && (
        <div className="px-3 py-1.5 text-[12px] shrink-0"
          style={{ background: 'var(--lum-surface)', borderBottom: '1px solid var(--lum-border)', color: 'var(--lum-text-2)' }}>
          {status}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        {loading && !failed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ color: 'var(--lum-text-2)' }}>
            <span className="text-sm">Loading AI Studio…</span>
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: 'var(--lum-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--lum-text-2)' }}>Couldn’t reach aistudio.google.com.</p>
            <button type="button" onClick={reload} className="px-4 py-2 rounded text-sm font-semibold"
              style={{ background: 'var(--lum-accent-bg)', color: 'var(--lum-accent-sm)' }}>Retry</button>
          </div>
        )}
        {/* <webview> is an Electron intrinsic element not in React's JSX types —
            create it via createElement. The persist:gemini partition keeps the
            Google login across restarts; allowpopups lets OAuth open. */}
        {createElement('webview', {
          ref: webviewRef,
          src: AISTUDIO_URL,
          className: 'gemini-webview',
          partition: 'persist:gemini',
          allowpopups: 'true',
          // Present a standard desktop-Chrome UA so Google doesn't reject sign-in
          // with "this browser may not be secure" (its embedded-webview block).
          useragent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          style: { width: '100%', height: '100%' },
        })}
      </div>
    </div>
  );
}
