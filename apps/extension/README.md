# Camora Problem Bridge

Lets **camora.cariara.com** read the coding-problem tab you already have open, so
the problem loads without copy-pasting a URL.

## Why it exists

A web page cannot read another window's address bar — no browser allows it. That is
why auto-fetch has only ever worked in the Camora desktop app, which reads the URL
over Electron IPC (`window.camo.getActiveBrowserUrl`). This extension is the
browser-side equivalent, so the web app behaves the same way.

## What it can and cannot see

It requests **no `tabs` permission** — only host permissions for the five supported
problem sites:

- `leetcode.com` / `leetcode.cn` (`/problems/*`)
- `hackerrank.com`
- `coderpad.io`
- `codesignal.com`
- `glider.ai`

Chrome therefore populates `tab.url` only for tabs on those hosts and leaves it
`undefined` for everything else, so the extension **cannot see the rest of your
browsing** even if it tried. `background.js` then applies the same
`isProblemPageUrl()` allowlist the app and backend use, as an independent second
check.

The content script runs only on `camora.cariara.com` (and `localhost:3000` for dev),
and ignores any message that did not come from that top-level window — an embedded
iframe cannot ask it anything.

## Install (unpacked)

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** → select this `apps/extension` directory
4. Reload `camora.cariara.com`

Open a problem in any tab, then switch to the Coding page: the URL fills in and
fetches on its own. It re-checks whenever the Camora tab regains focus.

## How it fits together

```
LeetCode tab ──▶ background.js ──▶ content.js ──▶ page
                 (tabs.query,      (postMessage    (activeUrlBridge.ts →
                  allowlisted)      relay)          CodingLayout auto-fetch)
```

The page side lives in `apps/camora/src/lib/lumora/activeUrlBridge.ts`, which tries
the desktop IPC bridge first and falls back to this extension, so callers get one
shape back either way.

## Keeping the allowlist in sync

`isProblemPageUrl` exists in three places and they must agree:

- `apps/extension/background.js`
- `apps/camora/src/lib/problemPageUrl.ts`
- `apps/lumora-backend/src/routes/coding.js`
