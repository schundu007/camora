# Global Screenshot Strip + Company Context + Multi-Snap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Snap/Stealth into a single global strip below the tab nav row, support multi-screenshot append for multi-page problems, surface company context in all 4 AI tabs, upgrade CoFix design, and enforce a unified `text-[11px] font-bold` chip/tab token across all Lumora chrome.

**Architecture:** `isStealthActive` moves into the Zustand interview store for app-wide sync. A new `ScreenshotStrip` component mounts in `LumoraShellPage` between the tab nav and tab content — showing Snap + thumbnail chips on Coding/Design/CoFix, Stealth-only on Behavioral, hidden on Home. `CompanyContextPicker` (the gold company pill) moves from `AICompanionPanel` into the `LumoraShellPage` top bar. Screenshot OCR text is routed to the active tab's problem field via refs, same pattern as `onVoiceProblemRef`.

**Tech Stack:** React 19, TypeScript, Zustand, Vite 8, Tailwind 4, CSS variables (design tokens), lumora-backend `/api/v1/coding/extract-from-image`

---

## Design Token Standard (apply everywhere in this plan)

| Element | Class |
|---|---|
| Nav pills / action chips | `text-[11px] font-bold uppercase tracking-[0.12em]` |
| Secondary labels / thumbnail captions | `text-[10px] font-semibold` |
| Minimum visible text | `text-[10px]` — never below |
| Active chip background | `var(--cam-gold-leaf)` text `var(--cam-primary-dk)` |
| Inactive chip | `background: rgba(255,255,255,0.08)` border `rgba(255,255,255,0.18)` text `rgba(255,255,255,0.85)` |
| Strip row background | `var(--cam-hero-strip)` border-bottom `1px solid var(--cam-gold-leaf)` |

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/stores/interview-store.ts` | Add `isStealthActive` + `setIsStealthActive` |
| **Create** | `src/components/lumora/shell/ScreenshotStrip.tsx` | Global Snap + thumbnail + Stealth strip |
| Modify | `src/pages/lumora/LumoraShellPage.tsx` | Mount strip, CompanyContextPicker in topbar, screenshot routing refs |
| Modify | `src/components/lumora/coding/CodingLayout.tsx` | Remove local Snap/Stealth, add screenshot append ref + onNewProblem prop, always show URL/Image, company context in prompts |
| Modify | `src/components/lumora/design/DesignLayout.tsx` | Remove local Snap/Stealth, add screenshot append ref |
| Modify | `src/components/lumora/shell/AICompanionPanel.tsx` | Remove Snap button + local stealth state + CompanyContextPicker (all moved global) |
| Modify | `src/components/lumora/cofix/CoFixLayout.tsx` | Navy-gold design upgrade, company context in prompts, screenshot append ref |

---

## Task 1: Add `isStealthActive` to interview store

**Files:**
- Modify: `apps/camora/src/stores/interview-store.ts`

- [ ] **Step 1: Find the store slice definition**

Open `apps/camora/src/stores/interview-store.ts`. Find where the store state interface and `create(...)` call are. Look for the pattern `voiceEnrolled` or `voiceFilterEnabled` — stealth slots in beside these.

- [ ] **Step 2: Add state and action to the store**

In the state interface (wherever `voiceEnrolled: boolean` is defined), add:

```ts
isStealthActive: boolean;
setIsStealthActive: (v: boolean) => void;
```

In the `create(...)` implementation object, add:

```ts
isStealthActive: false,
setIsStealthActive: (v) => set({ isStealthActive: v }),
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | tail -20
```

Expected: no TypeScript errors. If `isStealthActive` is referenced in any component that has its own local copy, you'll see "already declared" — that's fine for now, those get removed in later tasks.

- [ ] **Step 4: Commit**

```bash
cd /Users/chundu/camora && git pull && git add apps/camora/src/stores/interview-store.ts && git commit -m "feat(lumora): add isStealthActive to interview store for app-wide stealth"
```

---

## Task 2: Create `ScreenshotStrip` component

**Files:**
- Create: `apps/camora/src/components/lumora/shell/ScreenshotStrip.tsx`

This component owns:
- Snap button → `camo.snapActiveBrowser()` or `mediaDevices` capture → POST to OCR → call `onSnapped`
- Thumbnail chips for each completed screenshot (with × to remove)
- Loading spinner chip while OCR is in flight
- Stealth toggle (reads/writes store's `isStealthActive`)
- Shows Snap+thumbnails on `coding | design | cofix`; only Stealth on `behavioral`

- [ ] **Step 1: Create the file**

```tsx
// apps/camora/src/components/lumora/shell/ScreenshotStrip.tsx
import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { dialogAlert } from '@/components/shared/Dialog';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

export interface ScreenshotEntry {
  id: string;
  dataUrl: string;
  text: string;
}

interface ScreenshotStripProps {
  surface: 'coding' | 'design' | 'behavioral' | 'cofix';
  screenshots: ScreenshotEntry[];
  onSnapped: (entry: ScreenshotEntry) => void;
  onRemove: (id: string) => void;
}

/** Shared pill chrome — matches the LumoraShellPage tab nav exactly. */
const pillBase = 'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,opacity] active:scale-[0.97]';

export function ScreenshotStrip({ surface, screenshots, onSnapped, onRemove }: ScreenshotStripProps) {
  const { token } = useAuth();
  const isStealthActive = useInterviewStore(s => s.isStealthActive);
  const setIsStealthActive = useInterviewStore(s => s.setIsStealthActive);
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const handleStealthMode = useCallback(async () => {
    const camo = (window as any).camo;
    if (!camo?.setStealthMode) {
      await dialogAlert({ title: 'Desktop only', message: 'Stealth mode requires the Camora desktop app.' });
      return;
    }
    const next = !isStealthActive;
    await camo.setStealthMode(next);
    setIsStealthActive(next);
  }, [isStealthActive, setIsStealthActive]);

  const handleSnap = useCallback(async () => {
    const camo = (window as any).camo;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    try {
      let dataUrl: string;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (result?.error) throw new Error(result.error);
        const blob = await fetch(result.dataUrl || result).then(r => r.blob());
        dataUrl = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        track.stop();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
        dataUrl = canvas.toDataURL('image/png');
      }
      // Show loading spinner for this snap
      const tempEntry: ScreenshotEntry = { id, dataUrl, text: '' };
      setPendingIds(prev => [...prev, id]);
      setSnapState('idle');
      // OCR
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', new File([blob], 'snap.png', { type: 'image/png' }));
        const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await resp.json();
        const text = data.text || data.problem_text || '';
        onSnapped({ ...tempEntry, text });
      } catch {
        onSnapped({ ...tempEntry, text: '' });
      } finally {
        setPendingIds(prev => prev.filter(pid => pid !== id));
      }
    } catch {
      setSnapState('error');
      setTimeout(() => setSnapState('idle'), 3000);
    }
  }, [token, onSnapped]);

  const showSnap = surface !== 'behavioral';

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar"
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
        minHeight: 36,
      }}
    >
      {/* Snap button */}
      {showSnap && (
        <button
          onClick={handleSnap}
          disabled={snapState === 'capturing'}
          title={snapState === 'error' ? 'Snap failed — check Screen Recording permission' : 'Snap screen (append to problem)'}
          className={pillBase}
          style={snapState === 'error'
            ? { background: '#ef4444', color: '#fff' }
            : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)' }
          }
        >
          {snapState === 'capturing'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            : snapState === 'error'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
          }
          {snapState === 'error' ? 'Failed' : snapState === 'capturing' ? 'Capturing…' : 'Snap'}
        </button>
      )}

      {/* Pending (OCR in flight) thumbnails */}
      {showSnap && pendingIds.map(pid => (
        <div
          key={pid}
          className="relative w-10 h-7 rounded shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
        >
          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      ))}

      {/* Completed screenshot thumbnails */}
      {showSnap && screenshots.map((s, i) => (
        <div key={s.id} className="relative group shrink-0" title={s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
          <img
            src={s.dataUrl}
            alt={`Screenshot ${i + 1}`}
            className="h-7 w-10 object-cover rounded"
            style={{ border: '1px solid rgba(255,255,255,0.20)' }}
          />
          <span
            className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}
          >
            {i + 1}
          </span>
          <button
            onClick={() => onRemove(s.id)}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex"
            style={{ background: '#ef4444', color: '#fff' }}
            title="Remove screenshot"
          >
            <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ))}

      {/* Screenshot count label when >0 */}
      {showSnap && screenshots.length > 0 && (
        <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
          {screenshots.length} page{screenshots.length > 1 ? 's' : ''}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stealth — desktop only */}
      {!!(window as any).camo?.isDesktop && (
        <button
          onClick={handleStealthMode}
          title={isStealthActive ? 'Stealth ON — mouse tracking blocked app-wide' : 'Block mouse tracking (app-wide)'}
          className={pillBase}
          style={isStealthActive
            ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }
            : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }
          }
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {isStealthActive
              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
              : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
            }
          </svg>
          {isStealthActive ? 'Stealth ON' : 'Stealth'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors (the component isn't mounted yet, so only type-check matters).

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/components/lumora/shell/ScreenshotStrip.tsx && git commit -m "feat(lumora): add global ScreenshotStrip component with multi-snap and app-wide stealth"
```

---

## Task 3: Update LumoraShellPage — mount strip + CompanyContextPicker + screenshot routing

**Files:**
- Modify: `apps/camora/src/pages/lumora/LumoraShellPage.tsx`

- [ ] **Step 1: Add imports at the top of LumoraShellPage.tsx**

After the existing imports, add:

```tsx
import { ScreenshotStrip, type ScreenshotEntry } from '../../components/lumora/shell/ScreenshotStrip';
import CompanyContextPicker from '../../components/lumora/shell/CompanyContextPicker';
```

- [ ] **Step 2: Add screenshot state + refs inside `LumoraShellPage` function**

After the `const [pendingHackerrankText, setPendingHackerrankText]` declaration, add:

```tsx
// Global screenshot strip state
const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
// Per-layout refs: set by each layout to receive screenshot OCR text
const codingScreenshotRef = useRef<((text: string) => void) | null>(null);
const designScreenshotRef = useRef<((text: string) => void) | null>(null);
const cofixScreenshotRef = useRef<((text: string) => void) | null>(null);
// Called by CodingLayout's "New Problem" to clear the screenshot strip
const codingNewProblemRef = useRef<(() => void) | null>(null);

const handleSnapped = useCallback((entry: ScreenshotEntry) => {
  setScreenshots(prev => {
    const existing = prev.findIndex(s => s.id === entry.id);
    if (existing >= 0) { const next = [...prev]; next[existing] = entry; return next; }
    return [...prev, entry];
  });
  if (!entry.text) return;
  if (activeTab === 'coding') codingScreenshotRef.current?.(entry.text);
  else if (activeTab === 'design') designScreenshotRef.current?.(entry.text);
  else if (activeTab === 'cofix') cofixScreenshotRef.current?.(entry.text);
}, [activeTab]);

const handleRemoveScreenshot = useCallback((id: string) => {
  setScreenshots(prev => prev.filter(s => s.id !== id));
}, []);
```

- [ ] **Step 3: Add CompanyContextPicker to the top bar**

Inside the top bar `<div className="flex items-center h-12 px-4 ...">`, in the RIGHT section (the `<div className="flex items-center gap-2 shrink-0">` after the spacers), add CompanyContextPicker as the first element:

```tsx
<div className="flex items-center gap-2 shrink-0">
  {/* Company context — always visible, applies to all 4 AI tabs */}
  <div className="hidden md:block">
    <CompanyContextPicker />
  </div>
  {/* existing meeting/coding platform pickers follow... */}
```

- [ ] **Step 4: Mount ScreenshotStrip between tab nav row and tab content**

Find the `{/* Tab content — display toggling preserves state */}` comment. Immediately ABOVE it (but still inside the `<div className="flex-1 flex flex-col min-h-0 ...">` column), add:

```tsx
{/* Global screenshot strip — below tab nav, above all tab content */}
{(activeTab === 'coding' || activeTab === 'design' || activeTab === 'behavioral' || activeTab === 'cofix') && (
  <ScreenshotStrip
    surface={activeTab as 'coding' | 'design' | 'behavioral' | 'cofix'}
    screenshots={screenshots}
    onSnapped={handleSnapped}
    onRemove={handleRemoveScreenshot}
  />
)}
```

- [ ] **Step 5: Pass new props to CodingLayout**

Find the `<CodingLayout` JSX block and add:

```tsx
onScreenshotAppendRef={codingScreenshotRef}
onNewProblemCallback={() => setScreenshots([])}
```

- [ ] **Step 6: Pass new props to DesignLayout**

Find the `<DesignLayout` JSX block and add:

```tsx
onScreenshotAppendRef={designScreenshotRef}
```

- [ ] **Step 7: Pass new props to CoFixLayout**

Find the `<CoFixLayout` JSX block and add:

```tsx
onScreenshotAppendRef={cofixScreenshotRef}
```

- [ ] **Step 8: Build check**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | grep -E "error TS|Error" | head -30
```

Expected: TypeScript errors saying props don't exist on CodingLayout/DesignLayout/CoFixLayout — that's correct, those get added in the next tasks.

- [ ] **Step 9: Commit**

```bash
git add apps/camora/src/pages/lumora/LumoraShellPage.tsx && git commit -m "feat(lumora): mount ScreenshotStrip below tab nav, CompanyContextPicker in topbar, screenshot routing"
```

---

## Task 4: Update CodingLayout — remove local Snap/Stealth, add screenshot ref, always show URL/Image, company context

**Files:**
- Modify: `apps/camora/src/components/lumora/coding/CodingLayout.tsx`

- [ ] **Step 1: Add new props to `CodingLayoutProps` interface**

Find the `interface CodingLayoutProps {` block and add these fields:

```ts
/** Ref that parent sets to receive screenshot OCR text — appended to problem textarea. */
onScreenshotAppendRef?: React.MutableRefObject<((text: string) => void) | null>;
/** Called when user clicks New Problem — parent uses this to clear the screenshot strip. */
onNewProblemCallback?: () => void;
```

- [ ] **Step 2: Destructure new props in the component signature**

Add `onScreenshotAppendRef, onNewProblemCallback` to the destructured props in `export function CodingLayout({...})`.

- [ ] **Step 3: Wire up the screenshot append ref**

Find the `useEffect` block that handles `onVoiceProblemRef` (it sets `onVoiceProblemRef.current = ...`). Add a similar effect right after it:

```tsx
useEffect(() => {
  if (onScreenshotAppendRef) {
    onScreenshotAppendRef.current = (text: string) => {
      setProblemText(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
      setInputMode('paste');
      setIsInputCollapsed(false);
    };
  }
}, [onScreenshotAppendRef]);
```

- [ ] **Step 4: Call `onNewProblemCallback` inside `handleNewProblem`**

Find `const handleNewProblem = useCallback(() => {` and at the end of its function body, before the closing `}, [...]`, add:

```ts
onNewProblemCallback?.();
```

Also add `onNewProblemCallback` to the `useCallback` deps array.

- [ ] **Step 5: Remove local `isStealthActive` + `handleStealthMode` state/function**

Remove these local declarations:
```ts
const [isStealthActive, setIsStealthActive] = useState(false);
```
and the entire `const handleStealthMode = async () => { ... }` function.

Add this instead (reads from store):
```ts
const isStealthActive = useInterviewStore(s => s.isStealthActive);
```

- [ ] **Step 6: Remove Snap button + Stealth button from autopilot Row 2**

Find `{/* ── Row 2: Snap | Stealth | mic controls | collapse ── */}` (around line 1826). Remove the entire Snap `<button>` and the Stealth `<button>`. Keep only the mic controls (AudioCapture, enrollment button) and the collapse chevron.

The resulting Row 2 left side should be just an empty `<div className="flex items-center gap-1.5">` (kept for layout balance) or remove the left div entirely and let mic controls span the full width.

- [ ] **Step 7: Remove Snap + Stealth from manual mode Row 1 and Row 2**

Find `{/* ── Row 1: input-type selector + Snap ── */}` (around line 1956). Remove the Snap `<button>` from Row 1 (keep the Text/URL/Image pill selector).

Find `{/* ── Row 2: Stealth + mic controls + collapse ── */}` in manual mode. Remove the Stealth `<button>` block. Keep the mic controls and collapse chevron.

- [ ] **Step 8: Always show URL/Image picker in autopilot mode**

In the autopilot mode block (`codingPlatform && codingPlatform !== 'none'`), after Row 1 (monitoring status), add the Text/URL/Image pill selector as a secondary row:

```tsx
{/* Input mode picker — available even in autopilot (manual override) */}
<div className="flex items-center gap-1 px-3 pb-1.5">
  <div
    className="flex items-center gap-0.5 px-0.5 py-0.5"
    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999 }}
  >
    {(['paste', 'url', 'image'] as const).map(mode => (
      <button
        key={mode}
        onClick={() => { setInputMode(mode); setIsInputCollapsed(false); }}
        className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color] active:scale-[0.98]"
        style={inputMode === mode
          ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', borderRadius: 999 }
          : { color: 'rgba(255,255,255,0.70)', borderRadius: 999 }
        }
      >
        {mode === 'paste' ? 'Text' : mode === 'url' ? 'URL' : 'Image'}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 9: Normalize existing Text/URL/Image pill in manual mode to use design token text sizes**

In manual mode Row 1, find the existing `(['paste', 'url', 'image'] as const).map(...)` buttons. Change their className to:

```tsx
className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform] active:scale-[0.98]"
```

- [ ] **Step 10: Add company context to solve prompt**

Find `handleGenerateSolution` (or the `onSubmit` call site) where it calls `onSubmit(text, resolveLanguage(text), ...)`. Before that call, build a context prefix:

```tsx
const buildProblemWithContext = (text: string): string => {
  const assistant = getActiveAssistant();
  const company = assistant?.company || assistant?.name || '';
  if (!company) return text;
  return `[Company: ${company}]\n\n${text}`;
};
```

Import `getActiveAssistant` at the top of the file:
```ts
import { getActiveAssistant } from '@/lib/lumora-assistant';
```

Then in `handleGenerateSolution`, wrap `text` with `buildProblemWithContext(text)` before calling `onSubmit`.

- [ ] **Step 11: Build check**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | grep -E "error TS" | head -20
```

Expected: errors about DesignLayout/CoFixLayout props not existing — that's fine, those come next.

- [ ] **Step 12: Commit**

```bash
git add apps/camora/src/components/lumora/coding/CodingLayout.tsx && git commit -m "feat(coding): remove local snap/stealth, add screenshot append ref, restore URL/Image in autopilot, inject company context"
```

---

## Task 5: Update DesignLayout — remove local Snap/Stealth, add screenshot append ref

**Files:**
- Modify: `apps/camora/src/components/lumora/design/DesignLayout.tsx`

DesignLayout follows the same two-row pattern as CodingLayout (confirmed in code: Row 1 has Text/URL/Image + Snap, Row 2 has Stealth + mic).

- [ ] **Step 1: Add new prop to DesignLayout's props interface**

Find the props interface (look for `DesignLayoutProps` or the function signature) and add:

```ts
onScreenshotAppendRef?: React.MutableRefObject<((text: string) => void) | null>;
```

Destructure it in the function signature.

- [ ] **Step 2: Wire up the screenshot append ref**

After the existing `onVoiceProblemRef` effect (if present), add:

```tsx
useEffect(() => {
  if (onScreenshotAppendRef) {
    onScreenshotAppendRef.current = (text: string) => {
      // DesignLayout uses `problemText` state — find its setter
      setProblemText(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
      setInputTab('text');
      setIsInputCollapsed?.(false);
    };
  }
}, [onScreenshotAppendRef]);
```

Note: DesignLayout uses `inputTab` (not `inputMode`) and `urlInput`/`imagePreview` — use the correct state setter names from the actual file.

- [ ] **Step 3: Remove local `isStealthActive` + `handleStealthMode`**

Same as Task 4 Step 5 — remove `const [isStealthActive, setIsStealthActive] = useState(false)` and the `handleStealthMode` function. Add:

```ts
const isStealthActive = useInterviewStore(s => s.isStealthActive);
```

- [ ] **Step 4: Remove Snap button from Row 1 and Stealth from Row 2**

Find `{/* ── Row 1: input-type tabs + Snap ── */}` (around line 910 in DesignLayout). Remove the Snap `<button>`.

Find `{/* ── Row 2: Stealth + mic controls + collapse ── */}` (around line 959). Remove the Stealth `<button>` block.

- [ ] **Step 5: Normalize pill text sizes to design token standard**

In the Text/URL/Image pill selector in DesignLayout, change button className to:

```tsx
className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform] active:scale-[0.98]"
```

- [ ] **Step 6: Build check + commit**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | grep -E "error TS" | head -20
git add apps/camora/src/components/lumora/design/DesignLayout.tsx && git commit -m "feat(design): remove local snap/stealth, add screenshot append ref, normalize chip text sizes"
```

---

## Task 6: Update AICompanionPanel — remove Snap button, remove local stealth, remove CompanyContextPicker

**Files:**
- Modify: `apps/camora/src/components/lumora/shell/AICompanionPanel.tsx`

- [ ] **Step 1: Remove local Snap state + handleSnap**

Find and delete:
```ts
const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
```
And the entire `const handleSnap = useCallback(async () => { ... }, [...]);` function body (it's around lines 655-740 based on grep output).

- [ ] **Step 2: Remove local stealth state + handleStealthMode**

Find and delete:
```ts
const [isStealthActive, setIsStealthActive] = useState(false);
```
And the `const handleStealthMode` function that calls `camo.setStealthMode`.

Replace with a store read (needed if any remaining code references it — but after removing Snap and Stealth UI, it shouldn't be needed):
```ts
// isStealthActive is now app-wide in the interview store — no local copy needed
```

- [ ] **Step 3: Remove the Snap button JSX**

Find `{/* Snap — navy-gold pill, matching the voice chip style */}` (around line 1108) and delete the entire Snap `<button>` element.

- [ ] **Step 4: Remove the Stealth button JSX**

Find `{/* Stealth — desktop only, navy-gold pill */}` (around line 1131) and delete the entire Stealth `<button>` element.

- [ ] **Step 5: Remove CompanyContextPicker from AICompanionPanel header**

Find `<CompanyContextPicker />` (around line 1150) and delete it. Also remove the `import CompanyContextPicker` line if it's no longer used elsewhere in AICompanionPanel.

Keep the `import { getActiveAssistant, buildSystemContext }` — the behavioral AI still uses company context in its prompts, it just doesn't need to show the picker widget (that's now in the shell topbar).

- [ ] **Step 6: Build check + commit**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | grep -E "error TS" | head -20
git add apps/camora/src/components/lumora/shell/AICompanionPanel.tsx && git commit -m "feat(behavioral): remove local snap/stealth/company-picker — all moved to global shell"
```

---

## Task 7: Update CoFixLayout — design upgrade + company context + screenshot append ref

**Files:**
- Modify: `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx`

CoFixLayout is 368 lines with no existing Snap/Stealth/company context.

- [ ] **Step 1: Add imports**

Add at the top of CoFixLayout.tsx:

```ts
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT } from '@/lib/companyContext';
```

- [ ] **Step 2: Add new prop + screenshot ref + company context reactivity**

Add to the props interface (or create one if not present):

```ts
interface CoFixLayoutProps {
  onScreenshotAppendRef?: React.MutableRefObject<((text: string) => void) | null>;
}
```

Inside the component, add:

```tsx
// Re-render when company context changes
const [assistantVersion, setAssistantVersion] = useState(0);
useEffect(() => {
  const handler = () => setAssistantVersion(v => v + 1);
  window.addEventListener(ASSISTANT_UPDATED_EVENT, handler);
  return () => window.removeEventListener(ASSISTANT_UPDATED_EVENT, handler);
}, []);
const activeAssistant = useMemo(() => getActiveAssistant(), [assistantVersion]);

// Screenshot append ref — appends OCR text to the left pane input
useEffect(() => {
  if (onScreenshotAppendRef) {
    onScreenshotAppendRef.current = (text: string) => {
      // CoFixLayout uses a state variable for the left-pane code/problem text
      // Find the setter and append:
      setInputText(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
    };
  }
}, [onScreenshotAppendRef]);
```

Note: `setInputText` is the actual setter name for CoFix's left pane — find it in the file and use the correct name.

- [ ] **Step 3: Inject company context into the CoFix analyze/fix prompts**

Find where CoFixLayout calls its AI endpoint (POST to `/api/v1/coding/fix` or similar). Before building the request body, add:

```ts
const company = activeAssistant?.company || activeAssistant?.name || '';
const systemPrefix = company ? `[Company context: ${company}]\n\n` : '';
// Prepend systemPrefix to the prompt/problem field in the request body
```

- [ ] **Step 4: Apply navy-gold design upgrade to CoFix header/toolbar**

Find the CoFix toolbar/header area. Replace any flat gray background with the navy-gold treatment:

```tsx
{/* CoFix toolbar */}
<div
  className="flex items-center gap-2 px-3 py-2 shrink-0"
  style={{
    background: 'var(--cam-hero-strip)',
    borderBottom: '1px solid var(--cam-gold-leaf)',
    boxShadow: '0 2px 8px rgba(3,19,46,0.35)',
  }}
>
  {/* Company context badge — read-only display, picker is in shell topbar */}
  {activeAssistant?.company && (
    <span
      className="text-[11px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded shrink-0"
      style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', border: '1px solid var(--cam-gold-leaf)' }}
    >
      {activeAssistant.company}
    </span>
  )}
  {/* rest of existing toolbar buttons — normalize to text-[11px] font-bold */}
</div>
```

Normalize ALL button text in CoFix to `text-[11px] font-bold uppercase tracking-[0.12em]` per the design token standard.

- [ ] **Step 5: Apply navy-gold to CoFix analysis output panel**

Find any analysis result/output area in CoFixLayout. Apply:

```tsx
style={{
  background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(38,97,156,0.07), transparent 70%), var(--bg-elevated)',
  border: '1px solid var(--cam-gold-leaf)',
  borderRadius: 12,
}}
```

Section labels inside the output panel: `text-[11px] font-bold uppercase tracking-[0.12em]` with `color: var(--cam-gold-leaf-lt)`.

- [ ] **Step 6: Build check + commit**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | grep -E "error TS" | head -20
git add apps/camora/src/components/lumora/cofix/CoFixLayout.tsx && git commit -m "feat(cofix): navy-gold design upgrade, company context in prompts, screenshot append ref"
```

---

## Task 8: Final build, visual check, and push

- [ ] **Step 1: Full production build**

```bash
cd /Users/chundu/camora && pnpm build:camora 2>&1 | tail -30
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 2: Check for leftover dead code**

```bash
grep -rn "handleStealthMode\|setIsStealthActive" apps/camora/src/components/lumora/coding/CodingLayout.tsx apps/camora/src/components/lumora/design/DesignLayout.tsx apps/camora/src/components/lumora/shell/AICompanionPanel.tsx
```

Expected: no matches. If any remain, remove them.

```bash
grep -n "const \[isStealthActive" apps/camora/src/components/lumora/coding/CodingLayout.tsx apps/camora/src/components/lumora/design/DesignLayout.tsx apps/camora/src/components/lumora/shell/AICompanionPanel.tsx
```

Expected: no matches (all local copies removed, now reads from store).

- [ ] **Step 3: Verify Snap button is gone from behavioral window**

```bash
grep -n "Snap\|snapState\|handleSnap" apps/camora/src/components/lumora/shell/AICompanionPanel.tsx
```

Expected: no matches.

- [ ] **Step 4: Verify CompanyContextPicker is only in LumoraShellPage + ScreenshotStrip region**

```bash
grep -rn "CompanyContextPicker" apps/camora/src/
```

Expected: imports in `LumoraShellPage.tsx` only. No match in `AICompanionPanel.tsx`.

- [ ] **Step 5: Verify ScreenshotStrip is mounted**

```bash
grep -n "ScreenshotStrip" apps/camora/src/pages/lumora/LumoraShellPage.tsx
```

Expected: import line + JSX usage (2 lines).

- [ ] **Step 6: Git pull + final commit + push**

```bash
cd /Users/chundu/camora && git pull && git add -p && git commit -m "feat(lumora): global screenshot strip, multi-snap, app-wide stealth, company context in all tabs, CoFix design upgrade

- ScreenshotStrip below tab nav (Snap+thumbnails on Coding/Design/CoFix, Stealth-only on Behavioral)
- isStealthActive lifted to interview store — one toggle applies everywhere
- Multi-screenshot append: each Snap OCRs and appends page text to problem field
- CompanyContextPicker moved to shell topbar — active in all 4 AI tabs
- URL/Image picker always visible in CodingLayout even in autopilot mode
- Snap removed from behavioral AICompanionPanel
- CoFix: navy-gold design, company context injection, screenshot ref
- Unified text-[11px] font-bold chip/tab token across all Lumora chrome

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" && git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ Remove Snap from behavioral → Task 6 Step 3+4
- ✅ Stealth app-wide → Task 1 (store) + ScreenshotStrip reads store
- ✅ Screenshot strip below tab nav → Task 2 + Task 3 Step 4
- ✅ Same for coding + design + cofix → Tasks 4, 5, 7
- ✅ URL/Image back in coding autopilot mode → Task 4 Step 8
- ✅ Multi-screenshot append → Task 2 (ScreenshotStrip), Task 3 (routing refs), Task 4 Step 3
- ✅ Company context in all 4 tabs → Task 3 Step 3, Task 4 Step 10, Task 7 Step 3
- ✅ CompanyContextPicker in topbar → Task 3 Step 3
- ✅ CoFix design upgrade → Task 7 Steps 4+5
- ✅ Design consistency tokens → Task 4 Step 9, Task 5 Step 5, Task 7 Step 4 (text-[11px] font-bold everywhere)

**Placeholder scan:** No TBD or TODO in the plan. All code blocks are complete. Task 5 Step 2 notes to find the correct state setter name in DesignLayout — this is intentional since DesignLayout uses `inputTab` not `inputMode`, and the agent must read the actual file.

**Type consistency:**
- `ScreenshotEntry` defined in Task 2, imported in Task 3 ✓
- `onScreenshotAppendRef` prop type is `React.MutableRefObject<((text: string) => void) | null>` — matches `onVoiceProblemRef` pattern already in the codebase ✓
- `onNewProblemCallback` is `() => void` — used in Task 3 and Task 4 ✓
- `handleSnapped` in LumoraShellPage takes `ScreenshotEntry` — matches what ScreenshotStrip calls `onSnapped` with ✓
