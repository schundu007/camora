import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { App } from './App';
import { ErrorBoundary } from './components/shared/ui/ErrorBoundary';
import './styles/globals.css';
// highlight.js theme for code blocks. Atom One Dark pairs with the
// VSCode-style code surfaces in the docs panel and the live answer view.
import 'highlight.js/styles/atom-one-dark.css';
import { bootstrapTheme } from './hooks/useTheme';

// Apply the persisted theme synchronously, before React paints, so the
// page never flashes the wrong substrate.
bootstrapTheme();

// Vite fires this when a lazy import chunk 404s (stale HTML after deploy).
// Guard: only reload once per tab session — prevents an infinite reload loop
// if the chunk consistently fails (broken asset, SW serving stale HTML, etc.).
window.addEventListener('vite:preloadError', () => {
  const RELOAD_KEY = 'vite_preload_reload';
  if (sessionStorage.getItem(RELOAD_KEY)) {
    sessionStorage.removeItem(RELOAD_KEY);
    return;
  }
  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
});

// PWA removed. Actively unregister any previously-installed service worker and
// purge its caches — returning users who installed the old PWA cached a
// network-first SW that would otherwise keep serving stale '/' indefinitely.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
if (typeof caches !== 'undefined') {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
}

// Self-heal a stale client.
//
// The desktop shell and browsers both cache index.html. Chunk filenames are
// content hashes, so a cached index.html keeps pointing at OLD chunks — which
// are immutable and still served — and the user sits on a months-old UI while
// every deploy succeeds and changes nothing they can see. Clearing the cache at
// the shell level is racy (a window can load before the clear runs), so the app
// checks for itself.
//
/**
 * Last resort, and deliberately hard to miss: the app is running code that is
 * not what is deployed, and reloading did not fix it. Built with DOM calls
 * rather than React because this runs before the app mounts — and because a
 * stale bundle is exactly the situation where you cannot trust the app.
 */
function showStaleBanner(running: string, deployed: string) {
  if (document.getElementById('camora-stale-banner')) return;
  const el = document.createElement('div');
  el.id = 'camora-stale-banner';
  el.style.cssText = [
    'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483647',
    'padding:10px 14px', 'background:#7A2E2E', 'color:#fff',
    'font:600 12px/1.45 Inter,system-ui,sans-serif', 'display:flex',
    'gap:12px', 'align-items:center', 'justify-content:center',
  ].join(';');
  el.textContent =
    `This window is running an old build (${running}); ${deployed} is deployed. `
    + 'Quit and reopen the app — what you are seeing is out of date.';
  const dismiss = document.createElement('button');
  dismiss.textContent = 'Dismiss';
  dismiss.style.cssText = 'margin-left:8px;padding:3px 10px;border:1px solid rgba(255,255,255,0.5);'
    + 'background:transparent;color:#fff;border-radius:5px;cursor:pointer;font:inherit';
  dismiss.onclick = () => el.remove();
  el.appendChild(dismiss);
  document.body.appendChild(el);
}

// version.json is emitted by the build next to index.html and fetched with
// no-store, so it always reflects what is actually deployed.
(function checkForStaleBuild() {
  const RELOAD_FLAG = 'camora:stale-reload';
  fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v?.build || v.build === __BUILD_ID__) {
        sessionStorage.removeItem(RELOAD_FLAG);
        return;
      }
      // Reload AT MOST ONCE per session. If the reload does not resolve the
      // mismatch — a CDN still serving stale HTML, a proxy, a broken build —
      // looping would leave the user staring at a page that never finishes.
      if (sessionStorage.getItem(RELOAD_FLAG)) {
        /* The reload did not take. Say so ON THE SCREEN: a console.warn is
         * invisible to anyone without devtools open, so the app knew it was
         * serving stale code and told nobody — which is how a fixed layout
         * gets reported as still broken. */
        console.warn(`[camora] still stale after reload: running ${__BUILD_ID__}, deployed ${v.build}`);
        showStaleBanner(__BUILD_ID__, v.build);
        return;
      }
      sessionStorage.setItem(RELOAD_FLAG, '1');
      console.warn(`[camora] stale build ${__BUILD_ID__} (deployed ${v.build}) — reloading`);
      /* caches.delete() clears the Cache Storage API — service-worker caches —
       * and nothing else. Stale chunks usually sit in the HTTP disk cache,
       * which it cannot reach and a plain reload() may still serve: the cached
       * index.html comes back naming the OLD chunk hashes and the reload
       * achieves nothing. Navigating to a URL the cache has never seen forces
       * a fresh document, and the fresh document names the new chunks. */
      const bust = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('_b', v.build);
        window.location.replace(url.toString());
      };
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {})
          .finally(bust);
      } else {
        bust();
      }
    })
    .catch(() => { /* offline or blocked — never block boot on this */ });
})();

// Tag the body when running inside the Electron desktop build so CSS can
// add a drag region and exempt interactive elements without each component
// having to detect Electron individually. macOS uses titleBarStyle:
// 'hiddenInset', so we get a slim drag strip at the top; Windows / Linux
// use a slightly taller strip behind the titleBarOverlay symbol color.
if (typeof window !== 'undefined') {
  const camo = (window as any).camo;
  if (camo?.isDesktop) {
    document.body.classList.add('electron-desktop');
    if (camo.platform === 'darwin') document.body.classList.add('electron-mac');
    else document.body.classList.add('electron-win');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={(err, info) => {
        // Surface in console for now; wire to Sentry/etc later. Without this
        // top-level boundary, any render exception below produced React's
        // default white-screen-with-stack-in-DevTools, indistinguishable
        // from a network outage to most users.
        // TODO(observability): wire Sentry/remote sink
        console.error('[root] uncaught render error:', err, info);
      }}
    >
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
// deploy 1781780114
