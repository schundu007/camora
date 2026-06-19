# Unified Playground Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the Code Playground, SQL Playground, and VM Playground into a single `/playground` route with three tabs, accessible from both Capra and Lumora.

**Architecture:** A new `PlaygroundPage.jsx` renders a 44px sticky header with a `.tab-group` pill switcher (`Code | SQL | VM`) and routes to the three existing components based on a `?tab=` URL param. The three components themselves are unchanged except for height fixes (`height: 100%` instead of hardcoded viewport math). `/capra/playground` becomes a redirect to `/playground?tab=vm`, and `PracticePage` drops its embedded playground/SQL tabs in favour of small CTA link chips.

**Tech Stack:** React 19, React Router DOM v7 (`useSearchParams`), Vite 8, Tailwind 4, existing design system classes (`tab-group`, `tab-group-item`, `chip`)

## Global Constraints

- File naming: React components PascalCase `.jsx`, hooks/utils camelCase
- Internal navigation: `<Link>` or `useNavigate()` — never `<a>` for internal routes
- Design tokens: `var(--cam-hero-strip)` header background, `var(--cam-gold-leaf)` border-bottom, `var(--accent)` active tab
- Tab classes: `.tab-group` / `.tab-group-item` / `.tab-group-item-active` — no inline style equivalents
- Lazy-load all three tab components with `React.lazy` + `Suspense`
- No new npm packages

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/pages/PlaygroundPage.jsx` | Tab shell — reads `?tab`, renders header + active component |
| Modify | `src/App.tsx:80,578` | Remap import + route; add `/playground`; redirect `/capra/playground` |
| Modify | `src/components/shared/SiteNav.tsx:126,129,218` | Update two Playground links to `/playground` |
| Modify | `src/components/shared/cara/CaraBar.tsx:20` | Add `/playground` to VALID_PATHS |
| Modify | `src/components/capra/playground/PlaygroundShell.jsx` | Root div height → `100%`; nav target fix |
| Verify | `src/components/lumora/playground/PlaygroundLayout.tsx:244` | Already `h-full` — confirm only |
| Modify | `src/components/capra/sql/SQLPlayground.tsx:479` | Change `calc(100vh - 220px)` → `100%` |
| Modify | `src/pages/capra/PracticePage.jsx:17-18,730-731,787-803` | Remove sql-editor + playground tabs/views; add CTA chips |

---

## Task 1: Fix component heights

**Files:**
- Modify: `src/components/capra/playground/PlaygroundShell.jsx`
- Modify: `src/hooks/usePlaygroundSession.js`
- Modify: `src/components/capra/sql/SQLPlayground.tsx:479`
- Verify: `src/components/lumora/playground/PlaygroundLayout.tsx:244`

**Interfaces:**
- Produces: Three components that size to `height: 100%` — consumed by `PlaygroundPage` in Task 2

- [ ] **Step 1: Fix PlaygroundShell root div height**

In `src/components/capra/playground/PlaygroundShell.jsx`, the outermost return div currently reads:
```jsx
<div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden', background: '#0d1117' }}>
```
Change to:
```jsx
<div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1117' }}>
```

- [ ] **Step 2: Fix destroySession navigation target**

Check `src/hooks/usePlaygroundSession.js` for any hardcoded `/capra/playground` navigate call:
```bash
grep -n "capra/playground" /Users/chundu/camora/apps/camora/src/hooks/usePlaygroundSession.js
```
If found, change:
```js
navigate('/capra/playground');
```
to:
```js
navigate('/playground?tab=vm');
```

Also update the comment in `PlaygroundShell.jsx` that references `/capra/playground`:
```js
if (ok) destroySession(); // destroySession navigates to /playground?tab=vm automatically
```

- [ ] **Step 3: Fix SQLPlayground hardcoded height**

In `src/components/capra/sql/SQLPlayground.tsx` at line 479:
```tsx
<div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
```
Change to:
```tsx
<div className="flex flex-col md:flex-row" style={{ height: '100%', minHeight: '500px' }}>
```

- [ ] **Step 4: Verify PlaygroundLayout height**

Confirm `PlaygroundLayout.tsx` line 244 already uses `h-full`:
```bash
sed -n '244,246p' /Users/chundu/camora/apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx
```
Expected output contains `h-full`. No change needed.

- [ ] **Step 5: Commit**

```bash
git add src/components/capra/playground/PlaygroundShell.jsx src/components/capra/sql/SQLPlayground.tsx src/hooks/usePlaygroundSession.js
git commit -m "fix(playground): use height:100% in all three playground components"
```

---

## Task 2: Create PlaygroundPage.jsx

**Files:**
- Create: `src/pages/PlaygroundPage.jsx`

**Interfaces:**
- Consumes: `PlaygroundLayout` named export from `components/lumora/playground/PlaygroundLayout`, `SQLPlayground` default export from `components/capra/sql/SQLPlayground`, `PlaygroundShell` default export from `components/capra/playground/PlaygroundShell`
- Produces: `default export PlaygroundPage` — consumed by `App.tsx` in Task 3

- [ ] **Step 1: Create the file**

Create `src/pages/PlaygroundPage.jsx`:

```jsx
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

const PlaygroundLayout = lazy(() =>
  import('../components/lumora/playground/PlaygroundLayout').then(m => ({ default: m.PlaygroundLayout }))
);
const SQLPlayground = lazy(() => import('../components/capra/sql/SQLPlayground'));
const PlaygroundShell = lazy(() => import('../components/capra/playground/PlaygroundShell'));

const TABS = [
  { key: 'code', label: 'Code' },
  { key: 'sql',  label: 'SQL'  },
  { key: 'vm',   label: 'VM'   },
];

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <div style={{
      width: 24, height: 24,
      border: '2px solid var(--accent)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  </div>
);

export default function PlaygroundPage() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab = TABS.some(t => t.key === rawTab) ? rawTab : 'code';

  const setTab = (key) => setParams({ tab: key }, { replace: false });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12, fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⌨</span>
          Playground
        </span>

        <div className="tab-group">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`tab-group-item${tab === t.key ? ' tab-group-item-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span style={{ width: 100 }} />
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<Spinner />}>
          {tab === 'code' && <PlaygroundLayout />}
          {tab === 'sql'  && <SQLPlayground />}
          {tab === 'vm'   && <PlaygroundShell />}
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/chundu/camora && npx vite build --outDir /tmp/pg-build-check 2>&1 | tail -20
```
Expected: clean build. The new file must not appear in error output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PlaygroundPage.jsx
git commit -m "feat(playground): new PlaygroundPage with Code/SQL/VM tabs"
```

---

## Task 3: Wire App.tsx routes

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `PlaygroundPage` default export from Task 2
- Produces: `/playground` route live; `/capra/playground` redirects to `/playground?tab=vm`

- [ ] **Step 1: Update the lazy import (line 80)**

Change:
```tsx
const PlaygroundPage = lazy(() => import('./pages/capra/PlaygroundPage'));
```
to:
```tsx
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage'));
```

- [ ] **Step 2: Ensure Navigate is imported**

Find the React Router import line near the top of `App.tsx` and confirm `Navigate` is included:
```tsx
import { BrowserRouter, Routes, Route, Navigate, ... } from 'react-router-dom';
```
Add `Navigate` if missing.

- [ ] **Step 3: Replace the /capra/playground route (line 578)**

Change:
```tsx
<Route path="/capra/playground" element={<ShellRoute><PlaygroundPage /></ShellRoute>} />
```
to:
```tsx
<Route path="/playground" element={<ShellRoute><PlaygroundPage /></ShellRoute>} />
<Route path="/capra/playground" element={<Navigate to="/playground?tab=vm" replace />} />
```

- [ ] **Step 4: Add page title entry**

In the `fallbacks` array inside the `PageTitle` component (the `useEffect` around line 423), add before the `/capra/prepare` entry:
```tsx
['/playground', 'Playground — Camora'],
```

- [ ] **Step 5: Build check**

```bash
cd /Users/chundu/camora && npx vite build --outDir /tmp/pg-build-check 2>&1 | tail -20
```
Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(playground): add /playground route, redirect /capra/playground"
```

---

## Task 4: Update SiteNav and CaraBar

**Files:**
- Modify: `src/components/shared/SiteNav.tsx`
- Modify: `src/components/shared/cara/CaraBar.tsx`

**Interfaces:**
- Produces: "Playground" nav link points to `/playground`; CaraBar shows on `/playground`

- [ ] **Step 1: Update SiteNav desktop link (line 126 + 129)**

Change `to="/capra/playground"` → `to="/playground"`:
```tsx
to="/playground"
```

Change the `isActive` check on the next line:
```tsx
background: isActive('/playground') ? 'rgba(212,160,67,0.22)' : 'rgba(212,160,67,0.10)',
```

- [ ] **Step 2: Update SiteNav mobile link (line 218)**

Change:
```tsx
to="/capra/playground"
```
to:
```tsx
to="/playground"
```

- [ ] **Step 3: Update CaraBar VALID_PATHS (line 20)**

Change:
```tsx
'/capra/prepare', '/capra/practice', '/capra/playground', '/capra/mcq',
```
to:
```tsx
'/capra/prepare', '/capra/practice', '/playground', '/capra/mcq',
```

- [ ] **Step 4: Build check**

```bash
cd /Users/chundu/camora && npx vite build --outDir /tmp/pg-build-check 2>&1 | grep -E "error|Error" | head -10
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/SiteNav.tsx src/components/shared/cara/CaraBar.tsx
git commit -m "feat(playground): update SiteNav + CaraBar to /playground"
```

---

## Task 5: Clean up PracticePage

**Files:**
- Modify: `src/pages/capra/PracticePage.jsx`

**Interfaces:**
- Produces: PracticePage no longer embeds Code or SQL playgrounds; shows CTA chips instead

- [ ] **Step 1: Remove lazy imports (lines 17–18)**

Delete these two lines:
```jsx
const SQLPlayground = lazy(() => import('../../components/capra/sql/SQLPlayground'));
const PlaygroundLayout = lazy(() => import('../../components/lumora/playground/PlaygroundLayout').then(m => ({ default: m.PlaygroundLayout })));
```

- [ ] **Step 2: Remove the two tabs from the tab array**

In the tabs array (around line 727), remove the two entries:
```jsx
{ key: 'sql-editor', label: 'SQL Editor', icon: <Icon name="database" size={12} /> },
{ key: 'playground', label: 'Playground', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> },
```

- [ ] **Step 3: Remove the SQL Editor render block**

Remove (lines ~787–795):
```jsx
{/* ── SQL Editor View — fills remaining height ── */}
{activeView === 'sql-editor' && (
  <div className="flex-1 min-h-0 overflow-hidden">
    <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
      <SQLPlayground />
    </Suspense>
  </div>
)}
```

- [ ] **Step 4: Remove the Playground render block**

Remove (lines ~796–803):
```jsx
{/* ── Playground View ── */}
{activeView === 'playground' && (
  <div className="flex-1 min-h-0 overflow-hidden">
    <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
      <PlaygroundLayout />
    </Suspense>
  </div>
)}
```

- [ ] **Step 5: Remove dead state for sql-editor**

Fix `initialView` (line ~398) — remove the SQL detection default:
```jsx
// Change from:
const initialView = urlView || (detectSqlFromStorage() ? 'sql-editor' : 'practice');
// To:
const initialView = urlView || 'practice';
```

Remove the `useEffect` that auto-switches to `sql-editor` on storage events (lines ~411–419) — delete the entire effect block.

Update the Reset button condition (line ~752) — remove `|| activeView === 'sql-editor'`:
```jsx
// Change from:
{(activeView === 'code-solver' || activeView === 'design-solver' || activeView === 'sql-editor') && (
// To:
{(activeView === 'code-solver' || activeView === 'design-solver') && (
```

- [ ] **Step 6: Add CTA chips**

Confirm `Link` is already imported from `react-router-dom`:
```bash
grep -n "from 'react-router-dom'" /Users/chundu/camora/apps/camora/src/pages/capra/PracticePage.jsx | head -3
```
Add it to the import if missing.

Inside the tab bar container, right-aligned after the existing tabs/Reset button, add:
```jsx
{/* Playground shortcuts */}
<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', paddingLeft: 12 }}>
  <Link
    to="/playground?tab=code"
    className="chip"
    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}
  >
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
    Code Playground
  </Link>
  <Link
    to="/playground?tab=sql"
    className="chip"
    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}
  >
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
    SQL Editor
  </Link>
</div>
```

- [ ] **Step 7: Full build check**

```bash
cd /Users/chundu/camora && npx vite build --outDir /tmp/pg-build-check 2>&1 | tail -20
```
Expected: clean build, no references to `SQLPlayground` or `PlaygroundLayout` in errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/capra/PracticePage.jsx
git commit -m "refactor(practice): remove embedded playground/sql tabs, add /playground CTA chips"
```

---

## Task 6: Final verification and deploy

- [ ] **Step 1: Full production build**

```bash
cd /Users/chundu/camora && npx vite build 2>&1 | tail -20
```
Expected: clean build, no errors.

- [ ] **Step 2: Manual smoke test checklist**

Start dev server: `pnpm dev:camora` from the monorepo root.

- [ ] `/playground` loads → Code tab active by default, Monaco editor visible
- [ ] `/playground?tab=sql` → SQL playground visible
- [ ] `/playground?tab=vm` → VM idle picker visible (environment selection)
- [ ] `/capra/playground` in browser → redirects to `/playground?tab=vm`
- [ ] SiteNav "Playground" link → navigates to `/playground`, gold highlight activates on `/playground/*`
- [ ] Mobile nav "Playground" link → navigates to `/playground`
- [ ] `/capra/practice` → Playground and SQL Editor tabs gone from tab bar
- [ ] `/capra/practice` → "Code Playground" and "SQL Editor" chips visible right-aligned
- [ ] Clicking "Code Playground" chip → lands on `/playground?tab=code`
- [ ] Clicking "SQL Editor" chip → lands on `/playground?tab=sql`
- [ ] Browser back/forward between tabs changes URL and swaps content
- [ ] VM: start a session, switch to Code tab, switch back to VM → terminal reconnects

- [ ] **Step 3: Push and deploy**

```bash
git pull --rebase && git push && vercel --prod
```

- [ ] **Step 4: Confirm deploy is live**

```bash
curl -sI https://camora.cariara.com | grep -i "x-vercel-cache\|age\|date"
```
A fresh response (`age: 0` or recent date) confirms the new deploy is serving.
