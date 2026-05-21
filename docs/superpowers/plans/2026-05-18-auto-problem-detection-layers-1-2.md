# Auto Problem Detection — Layers 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop app auto-detect HackerRank, LeetCode, and CoderPad problems without any user action, and recover blank screenshots using a native macOS fallback.

**Architecture:** The existing 3-second URL poll in `startHackerrankAutoDetect` is extended with an `'auto'` mode that tries all known platform URL patterns instead of one. When `desktopCapturer` returns a blank thumbnail, a new `captureWindowByIdFallback()` function retries via `/usr/sbin/screencapture -l <CGWindowID>`, which uses a different macOS capture path. The UI dropdown defaults to `'auto'` so users never need to touch it.

**Tech Stack:** Electron 41, Node.js (main process), React 19 + TypeScript (renderer)

---

## What Already Exists (do not reimplement)

- `PLATFORM_URL_MATCH` in `main.js` already has `hackerrank`, `leetcode`, `coderpad` patterns (line ~339)
- `set-coding-platform` IPC handler already exists at line ~890
- LumoraShellPage dropdown already has HackerRank, LeetCode, CoderPad options (line ~470)
- CodingLayout already renders status badges for all three platforms (lines ~1530–1549)
- preload.js `setCodingPlatform` bridge already exists (line ~37)

---

## Files Changed

| File | What changes |
|------|-------------|
| `apps/desktop/main.js` | Default `_codingPlatform` → `'auto'`; poll tries all platforms when `'auto'`; add `captureWindowByIdFallback()`; wire fallback into `captureExactBrowserWindow()` and `captureWindowByName()` |
| `apps/camora/src/pages/lumora/LumoraShellPage.tsx` | Add `'auto'` option to dropdown; change localStorage default from `'hackerrank'` to `'auto'` |

---

## Task 1 — Add `'auto'` mode to main process poll

**Files:**
- Modify: `apps/desktop/main.js` (lines ~337, ~433–435, ~891)

- [ ] **Step 1: Change the `_codingPlatform` default from `'hackerrank'` to `'auto'`**

  In `main.js` around line 337, find:
  ```js
  let _codingPlatform = 'hackerrank'; // default on: most users are using HackerRank
  ```
  Replace with:
  ```js
  let _codingPlatform = 'auto';
  ```

- [ ] **Step 2: Update the `set-coding-platform` IPC handler default**

  Around line 891, find:
  ```js
  _codingPlatform = platform || 'none';
  ```
  Replace with:
  ```js
  _codingPlatform = platform || 'auto';
  ```

- [ ] **Step 3: Update the poll to try all platforms when `_codingPlatform === 'auto'`**

  In `startHackerrankAutoDetect`, around lines 433–435, find:
  ```js
  const matchFn = PLATFORM_URL_MATCH[_codingPlatform];
  if (!matchFn || !matchFn(url)) return;
  ```
  Replace with:
  ```js
  let matched = false;
  if (_codingPlatform === 'auto') {
    matched = Object.values(PLATFORM_URL_MATCH).some(fn => fn(url));
  } else {
    const matchFn = PLATFORM_URL_MATCH[_codingPlatform];
    matched = !!(matchFn && matchFn(url));
  }
  if (!matched) return;
  ```

- [ ] **Step 4: Syntax-check main.js**

  ```bash
  node --check apps/desktop/main.js && echo "OK"
  ```
  Expected: `OK`

- [ ] **Step 5: Commit**

  ```bash
  git add apps/desktop/main.js
  git commit -m "feat(desktop): add auto-detect mode — poll tries all platforms automatically"
  ```

---

## Task 2 — Add `captureWindowByIdFallback` and wire it in

**Files:**
- Modify: `apps/desktop/main.js` (after line ~420 for new function; lines ~404–406 and ~952–954 for wiring)

- [ ] **Step 1: Add `captureWindowByIdFallback` after `captureExactBrowserWindow`**

  In `main.js`, find the end of the `captureExactBrowserWindow` function (around line 420, ends with `return \`data:image/png;base64,...\``). Immediately after the closing `}`, insert:

  ```js
  async function captureWindowByIdFallback(cgWindowId) {
    const tmpFile = path.join(os.tmpdir(), `camora-win-${cgWindowId}-${Date.now()}.png`);
    return new Promise((resolve) => {
      execFile('/usr/sbin/screencapture', ['-l', cgWindowId, '-o', '-x', tmpFile], (err) => {
        if (err) {
          try { fs.unlinkSync(tmpFile); } catch {}
          resolve(null);
          return;
        }
        try {
          const buf = fs.readFileSync(tmpFile);
          try { fs.unlinkSync(tmpFile); } catch {}
          if (buf.length < 5000) { resolve(null); return; } // blank/empty file guard
          const MAX_BASE64 = 4_800_000;
          const base64Size = (b) => Math.ceil(b.length / 3) * 4;
          let finalBuf = buf;
          let mime = 'png';
          if (base64Size(buf) > MAX_BASE64) {
            let img = nativeImage.createFromBuffer(buf);
            img = img.resize({ width: Math.min(img.getSize().width, 1920), quality: 'best' });
            finalBuf = img.toPNG();
            if (base64Size(finalBuf) > MAX_BASE64) {
              finalBuf = img.toJPEG(85);
              mime = 'jpeg';
            }
          }
          resolve(`data:image/${mime};base64,${finalBuf.toString('base64')}`);
        } catch {
          try { fs.unlinkSync(tmpFile); } catch {}
          resolve(null);
        }
      });
    });
  }
  ```

- [ ] **Step 2: Wire fallback into `captureExactBrowserWindow`**

  In `captureExactBrowserWindow`, around line 404–406, find:
  ```js
  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) return null;
  ```
  Replace with:
  ```js
  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) {
    const cgWindowId = target.id.split(':')[1] ?? null;
    if (cgWindowId) {
      const fallbackUrl = await captureWindowByIdFallback(cgWindowId);
      if (fallbackUrl) return fallbackUrl;
    }
    return null;
  }
  ```

- [ ] **Step 3: Wire fallback into `captureWindowByName`**

  In `captureWindowByName`, around line 952–954, find:
  ```js
  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) return null;
  ```
  Replace with:
  ```js
  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) {
    const cgWindowId = target.id.split(':')[1] ?? null;
    if (cgWindowId) {
      const fallbackUrl = await captureWindowByIdFallback(cgWindowId);
      if (fallbackUrl) return fallbackUrl;
    }
    return null;
  }
  ```

- [ ] **Step 4: Syntax-check main.js**

  ```bash
  node --check apps/desktop/main.js && echo "OK"
  ```
  Expected: `OK`

- [ ] **Step 5: Commit**

  ```bash
  git add apps/desktop/main.js
  git commit -m "feat(desktop): add screencapture -l fallback for blank desktopCapturer thumbnails"
  ```

---

## Task 3 — Add `'auto'` to the platform dropdown in LumoraShellPage

**Files:**
- Modify: `apps/camora/src/pages/lumora/LumoraShellPage.tsx` (lines ~49–50, ~470–473)

- [ ] **Step 1: Change the default platform from `'hackerrank'` to `'auto'`**

  Around line 49–50, find:
  ```tsx
  try { return localStorage.getItem('lumora_coding_platform') || 'hackerrank'; } catch { return 'hackerrank'; }
  ```
  Replace with:
  ```tsx
  try { return localStorage.getItem('lumora_coding_platform') || 'auto'; } catch { return 'auto'; }
  ```

- [ ] **Step 2: Add `'auto'` as the first option in the platform dropdown**

  Around line 470–473, find:
  ```tsx
  <option value="none">No Coding Tool</option>
  <option value="hackerrank">HackerRank</option>
  <option value="leetcode">LeetCode</option>
  <option value="coderpad">CoderPad</option>
  ```
  Replace with:
  ```tsx
  <option value="auto">Auto-detect</option>
  <option value="none">Disabled</option>
  <option value="hackerrank">HackerRank</option>
  <option value="leetcode">LeetCode</option>
  <option value="coderpad">CoderPad</option>
  ```

- [ ] **Step 3: Build the frontend to verify no TypeScript errors**

  ```bash
  cd apps/camora && npx vite build 2>&1 | tail -10
  ```
  Expected: `✓ built in` with no errors

- [ ] **Step 4: Commit**

  ```bash
  git add apps/camora/src/pages/lumora/LumoraShellPage.tsx
  git commit -m "feat(lumora): default coding platform to auto-detect, add Auto-detect dropdown option"
  ```

---

## Task 4 — Pull, push, and verify

- [ ] **Step 1: Pull latest then push**

  ```bash
  git pull --rebase origin main && git push origin main
  ```

- [ ] **Step 2: Build and install the desktop app to test**

  ```bash
  cd apps/desktop && npm run build 2>&1 | tail -15
  ```
  Open the resulting DMG, install, and verify:

  1. Launch Camora desktop — platform dropdown shows "Auto-detect" selected by default
  2. Open Chrome on a LeetCode problem (`leetcode.com/problems/...`) — within 5 seconds Camora should auto-capture and show AI solution (no key press, no click)
  3. Open Chrome on a CoderPad pad — same auto-capture behavior
  4. Open Chrome on a HackerRank contest — same (regression check)
  5. Press F9 with a browser window open — should still work, and if thumbnail was blank should now recover

- [ ] **Step 3: Verify no temp files accumulate**

  After several captures:
  ```bash
  ls /tmp/camora-win-* 2>/dev/null | wc -l
  ```
  Expected: `0` (all temp files cleaned up)
