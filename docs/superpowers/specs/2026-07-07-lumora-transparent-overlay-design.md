# Lumora Transparent Overlay — Design Spec

**Date:** 2026-07-07
**Status:** Approved (proceed to implementation)

## Problem

Today the Lumora desktop window is opaque with a native macOS title bar. It has
`setContentProtection(true)` (invisible to screen-share) but, being opaque and a
normal window, the candidate must park it **side-by-side** with the meeting.
Competitor CTRLpotato floats answers **above** the meeting. We want Lumora to do
the same: a transparent overlay whose answer panel lies on top of the meeting,
with everything else clicking through — while staying invisible to screen-share.

## Chosen Approach — "Unified transparent window, mode is renderer-only"

The window is **always** created `transparent + frameless + hasShadow:false`.
The two user-facing modes are a **renderer concern only** — no window recreation,
no reload, no lost live state. Toggling is instant and safe mid-interview.

- **Docked mode (default, ≈ today):** renderer paints a solid app background and a
  custom title bar (drag region + min/close). Window is not click-through and not
  forced always-on-top. Behaves like the current window.
- **Overlay mode:** renderer paints a transparent body; only the floating Sona /
  answer panel is opaque. Main process turns on click-through
  (`setIgnoreMouseEvents(true, {forward:true})`), `alwaysOnTop:'screen-saver'`, and
  `setVisibleOnAllWorkspaces(true, {visibleOnFullScreen:true})` so it floats above
  fullscreen Zoom without stealing focus (`showInactive`).

`setContentProtection(true)` stays on in **both** modes — always invisible to
screen-share.

Rejected: "recreate window on toggle" (reloads the SPA, drops live transcription/
streaming) and "whole-window semi-transparent" (no true click-through).

## Window configuration (`apps/desktop/main.js`)

Change `createWindow()`:
- `transparent: true`, `frame: false`, `hasShadow: false`, remove `backgroundColor`
  (or set to `#00000000`).
- Keep `setContentProtection(true)`.
- Keep saved bounds (width/height/x/y), minWidth/minHeight.
- Overlay-specific window state (alwaysOnTop level, visibleOnFullScreen, ignore-
  mouse) is applied/cleared by the `set-overlay-mode` IPC handler, not at creation.

## IPC surface (`main.js` + `preload.js`)

Renderer → main:
- `overlay:set-mode` `(mode: 'docked' | 'overlay')` — main applies/reverts
  alwaysOnTop level, `setVisibleOnAllWorkspaces`, and base click-through. In docked
  mode click-through is off; in overlay mode it defaults ON.
- `overlay:set-interactive` `(interactive: boolean)` — while in overlay mode, the
  renderer calls this on pointer enter/leave of the answer panel:
  `interactive=true` → `setIgnoreMouseEvents(false)` (panel is clickable);
  `interactive=false` → `setIgnoreMouseEvents(true, {forward:true})` (clicks pass
  through to the meeting).
- `window:minimize`, `window:close` — for the custom (frameless) title bar controls.

Main → renderer:
- `overlay:mode-changed` `(mode)` — emitted when a global hotkey toggles the mode so
  the renderer re-renders. Renderer is the source of truth for CSS; main is the
  source of truth for window flags; the hotkey path keeps them in sync via this
  event + the renderer echoing `overlay:set-mode`.

`preload.js` exposes these on the existing `window.camo` bridge:
`camo.overlay = { setMode, setInteractive, onModeChanged }` and
`camo.window = { minimize, close }`.

## Hotkey

Register a global shortcut (e.g. `CommandOrControl+Shift+O`) in main that toggles
mode and emits `overlay:mode-changed`. Reuses the existing `globalShortcut` setup.
Chosen to avoid colliding with the existing capture shortcuts (num0 / F9).

## Renderer (`apps/camora`)

1. **Mode state + detection.** A small hook/store `useOverlayMode()` holds
   `'docked' | 'overlay'`, defaulting to `docked`. Only active under Electron
   (`window.camo` present). Subscribes to `camo.overlay.onModeChanged`; on user
   toggle (in-app button or hotkey echo) calls `camo.overlay.setMode(next)`.
2. **Transparent background.** In overlay mode add a root class (e.g.
   `data-overlay="on"` on `<html>`) that sets `background: transparent` on
   `html/body/#root` and hides the docked chrome. Docked mode keeps the current
   solid background. Must not leak into the web (non-Electron) build.
3. **Frameless title bar.** Because the window is now frameless in **both** modes,
   add a slim custom title bar (only under Electron): a `-webkit-app-region: drag`
   strip with `no-drag` min/close buttons wired to `camo.window.*`. Shown in docked
   mode; hidden (or minimal) in overlay mode. This replaces the native traffic
   lights the old config relied on (`main.js:77-78`).
4. **Overlay layout.** In overlay mode, render only the floating answer panel
   (reuse the existing draggable `AICompanionPanel`, which already floats and clamps
   on-screen) on the transparent canvas; hide the rest of the shell.
5. **Click-through wiring.** The floating panel (and any interactive control visible
   in overlay mode) fires `camo.overlay.setInteractive(true)` on `pointerenter` and
   `(false)` on `pointerleave`, so only the panel captures clicks and the rest passes
   through. A single shared `OverlayInteractive` wrapper component encapsulates this.

## Coexistence / safety

- Web (non-Electron) build is unaffected: all overlay code is gated on
  `window.camo`. `data-overlay` is never set in the browser.
- Content protection remains on throughout — screen-share never sees the overlay.
- Toggling never recreates the window, so live transcription/streaming survive.

## Testing / verification

- Renderer compiles: `npx vite build` in `apps/camora` (green).
- `node --check apps/desktop/main.js` and `preload.js`.
- Full behavioral verification (transparency, click-through, float-over-fullscreen-
  Zoom, focus, content-protection) requires a **real DMG build + run** — handed to
  the user, since a transparent OS overlay can't be exercised headlessly.

## Out of scope (future)

- Windows-specific overlay tuning (this spec targets macOS first).
- Per-region opacity theming / user-adjustable transparency level.
- Remembering last mode across launches (can be added to window-state persistence).
