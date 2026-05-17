# Design: Snap + Stealth Mode for DesignLayout

**Date:** 2026-05-17
**Status:** Approved

## Overview

Port the Snap and Stealth Mode features from `CodingLayout.tsx` to `DesignLayout.tsx` so that desktop users have the same screenshot-capture and tracker-neutralization workflow during system design interviews.

## Scope

**In scope:**
- Snap button with visual state machine (idle → capturing → done/error → idle)
- Stealth mode button with toggle state and auto-reinject heartbeat
- Session folder routing on mount (`setSessionFolder`)
- Screenshot watcher integration with auto-generate on arrival
- Screen recording permission check interval

**Out of scope:**
- Solution overlay (`showSolutionOverlay` / `hideSolutionOverlay`) — code-specific, not applicable to design answers
- Any changes to `main.js`, `preload.js`, or backend — all required IPC APIs already exist

## State

Three new state variables, added alongside existing DesignLayout state:

```ts
const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
const [isStealthActive, setIsStealthActive] = useState(false);
const [screenPermStatus, setScreenPermStatus] = useState<string | null>(null);
```

## Effects

### 1. Permission check (port from CodingLayout lines 227–238)

Poll `camo.getMediaAccessStatus('screen')` every 10 seconds. Store result in `screenPermStatus`. Run unconditionally (design interviews don't require a specific platform flag).

```ts
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

### 2. Session folder routing (port from CodingLayout lines 788–797)

On mount, route screenshots to `~/Documents/Camora/{company}/screenshots/`. Clean up on unmount by passing `null`.

```ts
useEffect(() => {
  const camo = (window as any).camo;
  if (!camo?.setSessionFolder) return;
  const company = getActiveAssistant()?.company || getActiveAssistant()?.name || '';
  camo.setSessionFolder(company || null);
  return () => { camo.setSessionFolder(null); };
}, []);
```

### 3. Stealth auto-reinject (port from CodingLayout lines 814–822)

When stealth is active, silently re-inject every 30 seconds to survive page reloads in the target browser tab.

```ts
useEffect(() => {
  const camo = (window as any).camo;
  if (!isStealthActive || !camo?.injectTrackingNeutralizer) return;
  const silentReinject = () => camo.injectTrackingNeutralizer().catch(() => null);
  silentReinject();
  const interval = setInterval(silentReinject, 30000);
  return () => clearInterval(interval);
}, [isStealthActive]);
```

### 4. Screenshot watcher (port from CodingLayout lines 769–786)

Listen for Cmd+Shift+3/4 screenshots while the app is in the foreground. On receipt, convert the dataUrl to a File, set the image input, and auto-trigger design generation (equivalent to coding's `extractAndMaybeGenerate(file, true)`).

The exact auto-generate call must match the existing image submission path in DesignLayout — identify the function that handles image-based problem submission and call it with `autoGenerate: true` (or its equivalent parameter).

```ts
useEffect(() => {
  const camo = (window as any).camo;
  if (!camo?.onScreenshotWatcher) return;
  const handler = async ({ dataUrl, filename }: { dataUrl: string; filename: string }) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      // Set image input mode + auto-generate (match DesignLayout's image submission path)
      await handleImageAutoSubmit(file);
    } catch (err: any) {
      setError(err.message || 'Failed to process screenshot.');
    }
  };
  camo.onScreenshotWatcher(handler);
  return () => camo.offScreenshotWatcher?.();
}, []);
```

> **Implementation note:** During implementation, read the existing image upload and submit flow in DesignLayout to wire `handleImageAutoSubmit` correctly — it should mirror whatever the "Image" tab + Design button does, but triggered programmatically.

## Handlers

### handleSnap (port from CodingLayout lines 986–1004)

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

### handleStealthMode (port from CodingLayout lines 967–984)

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

## UI — Toolbar Buttons

Both buttons are added to the DesignLayout header toolbar. They render only when the respective `window.camo` API is present (desktop-only gate).

### Snap button

Identical markup to CodingLayout — same 4 visual states (idle/capturing/done/error), same colors (#00ea64 green, #ef4444 red, gray default), same icons (camera/clock/checkmark/X).

### Stealth button

Identical markup to CodingLayout — gray when inactive, #00ea64 green with "Stealth ON" label when active. Eye-slash icon inactive, open-eye icon active.

**Placement:** After the existing toolbar controls (timer buttons, reset, audio). Mirror the exact position from CodingLayout's toolbar.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Screen recording not granted | Opens System Settings → Screen & Recording |
| `takeScreenshot` fails | `snapState → 'error'`, shows "Failed" for 3s |
| Stealth needs Chrome dev menu | `dialogAlert` with step-by-step instructions |
| Screenshot watcher delivery fails | `setError(...)` with message |
| `injectTrackingNeutralizer` fails | `dialogAlert` with error message |

## Files Changed

| File | Change |
|------|--------|
| `apps/camora/src/components/lumora/design/DesignLayout.tsx` | Add state, effects, handlers, buttons |

No other files require changes — all IPC APIs are already wired in `preload.js` and `main.js`.
