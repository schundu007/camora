# Auto Problem Detection — Layers 1 & 2

**Date:** 2026-05-18  
**Status:** Draft  
**Scope:** `apps/desktop/main.js`, `apps/camora/src/components/lumora/coding/CodingLayout.tsx`

---

## Problem

The Snap button and F9 auto-detect return blank screenshots for some HackerRank contest
modes and any DRM-protected window. Auto-detect only covers HackerRank; LeetCode and
CoderPad interviewers are not captured at all.

---

## Solution Overview

Two focused changes to the Electron desktop app:

**Layer 1** — extend the existing URL-poll + screenshot pipeline to cover LeetCode and
CoderPad, and switch the poll to try all known platforms automatically (no platform
selection required from the user).

**Layer 2** — when `desktopCapturer` returns a blank thumbnail, silently retry using
`/usr/sbin/screencapture -l <CGWindowID>` which runs in a privileged macOS context and
can capture windows that Electron's API cannot.

Both are fully automatic. Zero user action during the interview.

---

## Layer 1 — Platform Extension

### What changes

**`PLATFORM_URL_MATCH` in `main.js`** — add two entries:

```js
leetcode: (url) => url.includes('leetcode.com/problems/'),
coderpad: (url) => url.includes('coderpad.io/'),
```

**Poll logic in `startHackerrankAutoDetect`** — rename to `startPlatformAutoDetect`.
Currently only tries the platform the user has selected (`_codingPlatform`). Change to
try ALL known platform patterns in order, first match wins:

```
if _codingPlatform === 'none' → skip (user has disabled auto-detect)
else → try hackerrank, leetcode, coderpad patterns in sequence
```

This makes detection truly automatic — no platform dropdown selection needed during
the interview.

**IPC event `hackerrank-capture-result`** — name is kept unchanged to avoid renderer
changes. The renderer processes any `dataUrl` the same way regardless of source.

**`set-coding-platform` IPC handler** — add `'leetcode'`, `'coderpad'`, and `'auto'`
as valid values alongside `'hackerrank'` and `'none'`.

**Poll logic** — when `_codingPlatform === 'auto'` (the new default), the poll tries
all known platform URL patterns in sequence, first match wins. Individual platform
values (`'hackerrank'`, `'leetcode'`, `'coderpad'`) restrict detection to that platform
only. `'none'` disables detection entirely.

**Platform dropdown in `CodingLayout.tsx`** — add `Auto (detect any)` as the first
and default option, then HackerRank, LeetCode, CoderPad, Disabled. Default is `'auto'`
so the user never needs to touch the dropdown during an interview.

### Data flow (unchanged)

```
3s poll → getActiveBrowserInfo() → URL matches platform? → captureExactBrowserWindow()
→ dataUrl → IPC: hackerrank-capture-result → renderer → Claude Vision OCR → AI solve
```

---

## Layer 2 — screencapture -l Fallback

### Why desktopCapturer returns blank

`desktopCapturer.getSources()` with `thumbnailSize` calls ScreenCaptureKit under the
hood. Some windows (certain HackerRank contest modes, protected browser content) set
an IOSurface `protectedContent` flag that makes ScreenCaptureKit return a blank surface.

`/usr/sbin/screencapture -l <CGWindowID>` uses a different ScreenCaptureKit code path
that does NOT respect the `protectedContent` flag in the same way. It will capture
content that `desktopCapturer` thumbnails miss.

Note: this does NOT bypass Microsoft Teams DRM. Teams' hardware overlay is protected at
a deeper GPU level. Layer 2 helps HackerRank and similar browser-based platforms, not
Teams video feeds.

### New function: `captureWindowByIdFallback(cgWindowId)`

Added to `main.js`. Called only when thumbnail is blank. Parses the CGWindowID from the
desktopCapturer source ID (format: `"window:12345678:0"` → `"12345678"`), runs
screencapture, reads the output file, applies the same resize logic as the existing
thumbnail path, returns a `dataUrl` or `null`.

```
source.id = "window:12345678:0"
                    ↑
              CGWindowID
```

Temp file: `os.tmpdir()/camora-win-{cgWindowId}-{timestamp}.png` — always cleaned up,
even on error.

Blank-file guard: if the output file is under 5 KB, treat as blank and return `null`.
This catches cases where screencapture succeeds but the window was minimized or off-screen.

### Where it's called

Inside `captureExactBrowserWindow()`, in the existing blank-check block:

```
// BEFORE (returns null immediately on blank thumbnail):
if (!thumbnail || thumbnail.isEmpty()) return null;

// AFTER (tries screencapture -l before giving up):
if (!thumbnail || thumbnail.isEmpty()) {
  const cgWindowId = source.id.split(':')[1] ?? null;
  if (cgWindowId) {
    const fallbackUrl = await captureWindowByIdFallback(cgWindowId);
    if (fallbackUrl) return fallbackUrl;
  }
  return null;
}
```

No change to callers of `captureExactBrowserWindow`. The rest of the pipeline
(resize, OCR, IPC event) is identical.

---

## File Changes

| File | Change |
|------|--------|
| `apps/desktop/main.js` | Add LeetCode + CoderPad to `PLATFORM_URL_MATCH`; rename `startHackerrankAutoDetect` → `startPlatformAutoDetect`; change poll to try all platforms; add `captureWindowByIdFallback()`; modify `captureExactBrowserWindow()` blank-check block |
| `apps/camora/src/components/lumora/coding/CodingLayout.tsx` | Add LeetCode + CoderPad to platform dropdown; add `'auto'` as default option; sends `'auto'` to main via `set-coding-platform` IPC so all-platforms loop activates |

---

## What This Does NOT Fix

- Teams screen-share video: GPU-level DRM, no solution exists anywhere.
- HackerRank pages that require browser login: the screenshot is captured but Claude
  Vision sees the login wall, not the problem. Existing behavior — no regression.
- CoderPad pads that are password-protected: same as above.

---

## Testing Plan

1. Open LeetCode problem in Chrome → press F9 → confirm problem screenshot captured and
   AI solution generated without pressing any button.
2. Open CoderPad pad in Chrome → same as above.
3. Set platform dropdown to "Auto" → navigate between HackerRank and LeetCode tabs →
   confirm the detector follows the URL automatically.
4. Verify HackerRank still works (no regression).
5. Force a blank thumbnail scenario (minimize a HackerRank window briefly then restore) →
   confirm Layer 2 fallback fires and a valid screenshot is returned.
6. Verify no temp files accumulate in `os.tmpdir()` after multiple captures.
