# Design Snap + Stealth Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Snap button and Stealth Mode from `CodingLayout.tsx` to `DesignLayout.tsx` so desktop users get identical screenshot-capture and tracker-neutralization capabilities during system design interviews.

**Architecture:** All IPC APIs (`takeScreenshot`, `injectTrackingNeutralizer`, `setSessionFolder`, `onScreenshotWatcher`, `getMediaAccessStatus`) already exist in `preload.js` and `main.js` — no backend or desktop changes required. The entire implementation is a single-file change to `DesignLayout.tsx`, adding state, 4 effects, 2 handlers, and 2 toolbar buttons that are conditionally rendered only when `window.camo` is present (desktop-only gate, web unaffected).

**Tech Stack:** React 19, TypeScript, Electron IPC via `window.camo` preload bridge

---

### Task 1: Add imports and state variables

**Files:**
- Modify: `apps/camora/src/components/lumora/design/DesignLayout.tsx:6` (imports)
- Modify: `apps/camora/src/components/lumora/design/DesignLayout.tsx:147–150` (state block)

- [ ] **Step 1: Add missing imports**

In `DesignLayout.tsx`, the import on line 6 is:
```ts
import { getSystemContext } from '@/lib/lumora-assistant';
```

Replace it with:
```ts
import { getSystemContext, getActiveAssistant } from '@/lib/lumora-assistant';
```

Then add after line 8 (`import { AudioCapture ...}`):
```ts
import { dialogAlert } from '@/components/shared/Dialog';
```

- [ ] **Step 2: Add snap/stealth state variables**

After the existing timer state block (around line 150, after `const timerRef = ...`), add:
```ts
// Desktop snap + stealth
const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
const [isStealthActive, setIsStealthActive] = useState(false);
const [screenPermStatus, setScreenPermStatus] = useState<string | null>(null);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to the new state or imports.

---

### Task 2: Add the four effects

**Files:**
- Modify: `apps/camora/src/components/lumora/design/DesignLayout.tsx` — insert effects after the last existing `useEffect` before the JSX return (around line 550)

- [ ] **Step 1: Add screen recording permission check (every 10s)**

After the last existing `useEffect` before the `return (` statement, insert:

```ts
// Screen recording permission check — needed to gate Snap button
useEffect(() => {
  const camo = (window as any).camo;
  if (!camo?.getMediaAccessStatus) return;
  let cancelled = false;
  const check = async () => {
    const status = await camo.getMediaAccessStatus('screen').catch(() => null);
    if (!cancelled) setScreenPermStatus(status);
  };
  check();
  const interval = setInterval(check, 10000);
  return () => { cancelled = true; clearInterval(interval); };
}, []);
```

- [ ] **Step 2: Add session folder routing**

Immediately after the permission check effect:

```ts
// Route screenshots to ~/Documents/Camora/{company}/screenshots/ for interview isolation
useEffect(() => {
  const camo = (window as any).camo;
  if (!camo?.setSessionFolder) return;
  const company = getActiveAssistant()?.company || getActiveAssistant()?.name || '';
  camo.setSessionFolder(company || null);
  return () => { camo.setSessionFolder(null); };
}, []);
```

- [ ] **Step 3: Add stealth auto-reinject heartbeat**

Immediately after the session folder effect:

```ts
// Re-inject stealth every 30s while active so it survives page reloads in Chrome
useEffect(() => {
  const camo = (window as any).camo;
  if (!isStealthActive || !camo?.injectTrackingNeutralizer) return;
  const silentReinject = () => camo.injectTrackingNeutralizer().catch(() => null);
  silentReinject();
  const interval = setInterval(silentReinject, 30000);
  return () => clearInterval(interval);
}, [isStealthActive]);
```

- [ ] **Step 4: Add screenshot watcher**

Immediately after the stealth reinject effect:

```ts
// Listen for Cmd+Shift+3/4 screenshots while the app is in the foreground
// and auto-extract + generate the design answer from the captured image.
useEffect(() => {
  const camo = (window as any).camo;
  if (!camo?.onScreenshotWatcher) return;
  const handler = async ({ dataUrl, filename }: { dataUrl: string; filename: string }) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      setInputTab('image');
      await handleImageUpload(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process screenshot.');
    }
  };
  camo.onScreenshotWatcher(handler);
  return () => camo.offScreenshotWatcher?.();
}, [handleImageUpload]);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/chundu/camora && git add apps/camora/src/components/lumora/design/DesignLayout.tsx && git commit -m "$(cat <<'EOF'
feat(design): add snap/stealth state, imports, and 4 desktop effects

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add handleSnap and handleStealthMode

**Files:**
- Modify: `apps/camora/src/components/lumora/design/DesignLayout.tsx` — add handlers after `handleImageUpload` callback (around line 253)

- [ ] **Step 1: Add handleSnap**

After the closing of `handleImageUpload` (the `useCallback` that ends around line 253), add:

```ts
const handleSnap = useCallback(async () => {
  const camo = (window as any).camo;
  if (!camo?.takeScreenshot) return;
  const perm = await camo.getMediaAccessStatus?.('screen').catch(() => null);
  if (perm && perm !== 'granted') {
    camo.openSystemPrivacy?.('ScreenCapture');
    return;
  }
  setSnapState('capturing');
  try {
    const result = await camo.takeScreenshot();
    if (!result?.ok) throw new Error(result?.error || 'Capture failed');
    setSnapState('done');
    setTimeout(() => setSnapState('idle'), 2500);
  } catch {
    setSnapState('error');
    setTimeout(() => setSnapState('idle'), 3000);
  }
}, []);
```

- [ ] **Step 2: Add handleStealthMode**

Immediately after `handleSnap`:

```ts
const handleStealthMode = async () => {
  const camo = (window as any).camo;
  if (!camo?.injectTrackingNeutralizer) {
    await dialogAlert({ title: 'Desktop only', message: 'Stealth mode requires the Camora desktop app.' });
    return;
  }
  const result = await camo.injectTrackingNeutralizer();
  if (result.ok) {
    setIsStealthActive(true);
  } else if (result.needsDevMenu) {
    await dialogAlert({
      title: 'One-time setup needed',
      message: `Enable "Allow JavaScript from Apple Events" in ${result.browser || 'Chrome'}:\n\n1. Open ${result.browser || 'Chrome'}\n2. Menu bar → View → Developer (or More Tools)\n3. Click "Allow JavaScript from Apple Events"\n4. Click Stealth again`,
    });
  } else {
    await dialogAlert({ title: 'Stealth failed', message: result.error || 'Could not inject into browser tab.' });
  }
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora && git add apps/camora/src/components/lumora/design/DesignLayout.tsx && git commit -m "$(cat <<'EOF'
feat(design): add handleSnap and handleStealthMode handlers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add Snap and Stealth buttons to the header toolbar

**Files:**
- Modify: `apps/camora/src/components/lumora/design/DesignLayout.tsx:698–703` (after Reset button, before AudioCapture)

The right side of the header toolbar looks like this (around line 698–719):
```jsx
{/* Reset */}
<button onClick={handleReset} ...>...</button>

{/* Voice Input */}
<AudioCapture ... />
```

- [ ] **Step 1: Insert Snap and Stealth buttons between Reset and AudioCapture**

Replace:
```jsx
          {/* Reset */}
          <button onClick={handleReset} className="p-1.5 text-white/75 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Reset">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Voice Input — no more hacky getElementById */}
          <AudioCapture
```

With:
```jsx
          {/* Reset */}
          <button onClick={handleReset} className="p-1.5 text-white/75 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Reset">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Snap — desktop only */}
          {(window as any).camo?.takeScreenshot && (
            <button
              onClick={handleSnap}
              disabled={snapState === 'capturing'}
              title={snapState === 'error' ? 'Snap failed — check Screen Recording in System Settings' : 'Snap screen — silently captures and extracts the design problem'}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all hover:opacity-90 active:scale-[0.97]"
              style={snapState === 'done'
                ? { background: '#00ea64', color: '#000', border: '1px solid #00ea64' }
                : snapState === 'error'
                ? { background: '#ef4444', color: '#fff', border: '1px solid #ef4444' }
                : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              {snapState === 'capturing' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              ) : snapState === 'done' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : snapState === 'error' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
              {snapState === 'capturing' ? 'Capturing…' : snapState === 'done' ? 'Got it' : snapState === 'error' ? 'Failed' : 'Snap'}
            </button>
          )}

          {/* Stealth — desktop only */}
          {(window as any).camo?.injectTrackingNeutralizer && (
            <button
              onClick={handleStealthMode}
              title={isStealthActive ? 'Stealth active — mouse tracking blocked' : 'Stealth mode — block mouse tracking on design platform'}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors hover:opacity-90 active:scale-[0.97]"
              style={isStealthActive
                ? { background: '#00ea64', color: '#000' }
                : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }
              }
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                {isStealthActive ? (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                )}
              </svg>
              {isStealthActive ? 'Stealth ON' : 'Stealth'}
            </button>
          )}

          {/* Voice Input — no more hacky getElementById */}
          <AudioCapture
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /Users/chundu/camora/apps/camora && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Run Vite build**

```bash
cd /Users/chundu/camora/apps/camora && npx vite build 2>&1 | tail -20
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora && git add apps/camora/src/components/lumora/design/DesignLayout.tsx && git commit -m "$(cat <<'EOF'
feat(design): add Snap + Stealth buttons to design toolbar

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Push and deploy

- [ ] **Step 1: Pull, then push**

```bash
cd /Users/chundu/camora && git pull --rebase && git push
```

- [ ] **Step 2: Deploy to Vercel**

```bash
cd /Users/chundu/camora && vercel --prod 2>&1 | tail -10
```
Expected: deployment URL printed, no errors.
