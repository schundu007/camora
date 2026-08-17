// apps/extension/content.js
//
// The page↔extension relay, injected only into camora.cariara.com.
//
// The page and the extension cannot call each other directly, so they talk over
// window.postMessage. Every inbound message is checked to have come from this exact
// window (not an iframe) and to carry our own marker, so an embedded third-party
// frame cannot ask the extension where you are browsing.

const PAGE = 'camora-page';
const EXT = 'camora-extension';

window.addEventListener('message', event => {
  // Only this document, on this origin. event.source !== window rules out iframes.
  if (event.source !== window || event.origin !== window.location.origin) return;

  const msg = event.data;
  if (!msg || msg.source !== PAGE || msg.type !== 'CAMORA_GET_ACTIVE_URL') return;

  const reply = payload =>
    window.postMessage({ source: EXT, type: 'CAMORA_ACTIVE_URL', id: msg.id, ...payload }, window.location.origin);

  try {
    chrome.runtime.sendMessage({ type: 'CAMORA_GET_ACTIVE_URL' }, res => {
      // A reloaded/updated extension leaves an orphaned content script whose
      // sendMessage rejects via lastError rather than throwing.
      if (chrome.runtime.lastError) {
        reply({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      reply(res ?? { ok: false, error: 'no response' });
    });
  } catch (err) {
    reply({ ok: false, error: String(err?.message ?? err) });
  }
});

// Announce the bridge so the page can tell "extension not installed" apart from
// "installed, but no problem tab is open" — they need different wording in the UI.
function announce() {
  window.postMessage({ source: EXT, type: 'CAMORA_BRIDGE_READY' }, window.location.origin);
}
announce();
// The page's listener may mount after document_start, so repeat once it is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', announce, { once: true });
} else {
  setTimeout(announce, 0);
}
