// Camora Desktop — screen-share leak plugging.
//
// mainWindow.setContentProtection(true) sets the NSWindow's sharingType to
// none. That hides exactly one window: ours. Chromium renders two things in
// their OWN OS-level windows, which keep painting into a screen share while
// the app itself is invisible:
//
//   1. Native tooltips (from a `title` attribute) — macOS NSToolTip.
//   2. HTML5 drag images — the ghost that follows the cursor during a drag,
//      drawn by the system NSDraggingSession.
//
// Neither is reachable from the main process, so this runs in the preload and
// removes them at the source: `title` attributes are moved to a data attribute
// and re-rendered as an in-window tooltip (inside the protected surface, so it
// stays visible to the user and invisible to the share), and every drag gets a
// transparent drag image.
//
// This is unconditional, not gated on the stealth toggle. Gating would leave a
// leak open during the toggle race, and an in-window tooltip is strictly better
// than the OS one anyway.
//
// Scope: the main frame's document only. A <webview> (the Claude tab) has its
// own document and would need this preload attached to it too.

'use strict';

const TIP_ATTR = 'data-camora-tip';
const SHOW_DELAY_MS = 450;
const EDGE_PAD = 8;

// ── Native tooltip removal ────────────────────────────────────────────────

function stripTitle(el) {
  const text = el.getAttribute('title');
  if (text === null) return;
  el.removeAttribute('title'); // re-enters the observer; getAttribute is null, so it stops here
  if (text) el.setAttribute(TIP_ATTR, text);
  else el.removeAttribute(TIP_ATTR);
}

function sweep(root) {
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (root.hasAttribute('title')) stripTitle(root);
  for (const el of root.querySelectorAll('[title]')) stripTitle(el);
}

function watchTitles() {
  sweep(document.documentElement);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') stripTitle(r.target);
      else for (const node of r.addedNodes) sweep(node);
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title'],
  });
}

// ── In-window replacement tooltip ─────────────────────────────────────────
// Lives in a closed shadow root so the app's global CSS can't restyle it and
// its own styles can't leak out.

let tipEl = null;
let showTimer = null;
let anchor = null;

function ensureTip() {
  if (tipEl || !document.body) return tipEl;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    .tip {
      position: fixed;
      max-width: 280px;
      padding: 5px 8px;
      border-radius: 6px;
      background: #12161d;
      color: #e8eaed;
      border: 1px solid rgba(255,255,255,.14);
      box-shadow: 0 4px 16px rgba(0,0,0,.45);
      font: 500 11px/1.4 -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif;
      white-space: pre-wrap;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .tip[data-show] { opacity: 1; visibility: visible; }
  `;
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  shadow.append(style, tipEl);
  document.body.appendChild(host);
  return tipEl;
}

function hideTip() {
  clearTimeout(showTimer);
  showTimer = null;
  anchor = null;
  if (tipEl) tipEl.removeAttribute('data-show');
}

function showTip(el) {
  const tip = ensureTip();
  if (!tip || !el.isConnected) return;
  const text = el.getAttribute(TIP_ATTR);
  if (!text) return;

  tip.textContent = text;
  // Make it measurable without flashing at the wrong position.
  tip.style.left = '0px';
  tip.style.top = '0px';
  tip.setAttribute('data-show', '');

  const target = el.getBoundingClientRect();
  const self = tip.getBoundingClientRect();

  let left = target.left + target.width / 2 - self.width / 2;
  left = Math.max(EDGE_PAD, Math.min(left, window.innerWidth - self.width - EDGE_PAD));

  // Below the target, unless that would run off the bottom.
  let top = target.bottom + 6;
  if (top + self.height > window.innerHeight - EDGE_PAD) top = target.top - self.height - 6;
  top = Math.max(EDGE_PAD, top);

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function watchHover() {
  document.addEventListener('mouseover', (e) => {
    const el = e.target instanceof Element ? e.target.closest(`[${TIP_ATTR}]`) : null;
    if (!el || el === anchor) return;
    hideTip();
    anchor = el;
    showTimer = setTimeout(() => showTip(el), SHOW_DELAY_MS);
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!anchor) return;
    const to = e.relatedTarget;
    if (to instanceof Node && anchor.contains(to)) return;
    hideTip();
  }, true);

  // Any interaction or viewport change dismisses it — a stale tooltip pinned
  // over moved content is worse than none.
  for (const ev of ['mousedown', 'keydown', 'wheel', 'scroll', 'blur']) {
    document.addEventListener(ev, hideTip, true);
  }
  window.addEventListener('blur', hideTip);
}

// ── Drag ghost removal ────────────────────────────────────────────────────
// Images and links are draggable by default, so brushing an avatar while
// dragging the frameless window by its header starts a real drag session and
// paints a ghost into the share. Dragging them out of the app means nothing
// here, so those are cancelled outright.
//
// Everything else keeps its drag and just loses the ghost: explicit reorder DnD
// (draggable="true", e.g. SQLPlayground's cards) and — importantly — dragging a
// text selection, which is how CodeMirror/Monaco move code within the editor.
// Cancelling those would be a silent regression in Coding/CoFix.

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function watchDrag() {
  const ghost = new Image();
  ghost.src = TRANSPARENT_PIXEL;
  if (ghost.decode) ghost.decode().catch(() => {});

  document.addEventListener('dragstart', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    const opted = el && el.closest('[draggable="true"]');

    if (el && !opted && el.closest('img, a[href]')) {
      e.preventDefault();
      return;
    }
    try {
      e.dataTransfer.setDragImage(ghost, 0, 0);
    } catch {
      /* no dataTransfer on some synthetic events — the drag still runs */
    }
  }, true);

  document.addEventListener('dragend', hideTip, true);
}

// ── Cursor shape ──────────────────────────────────────────────────────────
// The pointer is composited by the OS into every capture, and the window under
// it still gets to choose its shape even when that window is excluded from the
// share. So hovering the invisible panel turned the cursor into a hand (or an
// I-beam, or a resize arrow) over what looks to the viewer like empty desktop.
//
// Forcing the plain arrow makes the pointer indistinguishable from idle desktop
// use. This one IS gated on the stealth toggle: it costs the user every hover
// affordance in the app, which is only worth paying while hiding.

const STEALTH_ATTR = 'data-camora-stealth';

function installCursorMask() {
  const style = document.createElement('style');
  // `html[attr] body *` (0,1,2) outranks anything the app ships — verified no
  // `cursor: … !important` exists in the frontend.
  style.textContent = `
    html[${STEALTH_ATTR}] body, html[${STEALTH_ATTR}] body *,
    html[${STEALTH_ATTR}] body *::before, html[${STEALTH_ATTR}] body *::after {
      cursor: default !important;
    }
  `;
  document.head.appendChild(style);
}

function setStealth(on) {
  const html = document.documentElement;
  if (!html) return;
  if (on) html.setAttribute(STEALTH_ATTR, '');
  else html.removeAttribute(STEALTH_ATTR);
}

// ── Install ───────────────────────────────────────────────────────────────

function install() {
  installCursorMask();
  // main.js calls setContentProtection(true) at launch and the renderer store
  // defaults isStealthActive to true, so start masked rather than leaking one
  // hand-cursor frame before the renderer's first setStealthMode() lands.
  setStealth(true);
  watchTitles();
  watchHover();
  watchDrag();
}

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// setStealth only toggles an attribute on <html>, which exists from preload
// time, so it is safe to call before install() has run.
module.exports = { install: () => ready(install), setStealth };
