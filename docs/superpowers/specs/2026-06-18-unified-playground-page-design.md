# Unified Playground Page — Design Spec
**Date:** 2026-06-18  
**Status:** Approved  
**Author:** Sudhakar Chundu + Claude

---

## 1. Problem

Three playground surfaces exist in Camora today, scattered across different routes and embedded views:

| Surface | Where it lives today | What it does |
|---|---|---|
| Code Playground | Embedded tab inside `/capra/practice` | Monaco editor — run Python, Bash, Docker, Terraform; AI explain per line |
| SQL Playground | Embedded tab inside `/capra/practice` | In-browser sql.js execution, no server needed |
| VM Playground | `/capra/playground` | Full Docker container via SSH, real terminal, 90s boot, save/restore VMs |

Users have to navigate to different places for different tools, and Lumora has no clean way to link to any of them. Goal: consolidate all three under one canonical URL accessible from both Capra and Lumora.

---

## 2. Solution

A single `/playground` route with three tabs — **Code**, **SQL**, **VM** — reusing all three existing components unchanged (except height adjustments so they fill the parent container). The page has a compact 44px sticky header containing the tab switcher.

---

## 3. URL & Route Structure

| URL | Behaviour |
|---|---|
| `/playground` | Lands on Code tab (lightest, instant — best default) |
| `/playground?tab=code` | Code tab |
| `/playground?tab=sql` | SQL tab |
| `/playground?tab=vm` | VM tab |
| `/capra/playground` | `<Navigate to="/playground?tab=vm" replace />` — preserves existing bookmarks |

Tab state is driven by `useSearchParams`. Browser back/forward navigates between tabs.

---

## 4. Page Architecture

```
┌────────────────────────────────────────────────────────┐
│  SiteNav  (60px, existing)                             │
├────────────────────────────────────────────────────────┤
│  ⌨ Playground      [Code] [SQL] [VM]     (header 44px)│
│  bg: var(--cam-hero-strip)                             │
│  border-bottom: 1px solid var(--cam-gold-leaf)         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Tab content area — height: calc(100vh - 60px - 44px) │
│                                                        │
│  Code tab → <PlaygroundLayout />                       │
│  SQL tab  → <SQLPlayground />                          │
│  VM tab   → <PlaygroundShell />                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Header (44px)
- **Left:** `⌨` glyph + `Playground` wordmark in IBM Plex Mono, `var(--text-primary)`
- **Center:** `.tab-group` pill with 3 items: `Code`, `SQL`, `VM`. Active = `var(--accent)`. Uses canonical design system classes — no inline styles.
- **Right:** empty (tab-specific controls remain inside each tab component)

### Tab content area
- `display: flex; flex-direction: column; flex: 1; overflow: hidden`
- Each tab component receives `height: 100%` from the parent flex context
- VM tab: `PlaygroundShell` renders its own 32px sub-header (timer, End, Save buttons) — unchanged. The page header handles only tab switching.
- Code/SQL tabs: component fills the space; both handle their own internal layout

---

## 5. Component Height Adjustments

`PlaygroundShell` currently sets `height: calc(100vh - 60px)` on its root div. Change to `height: 100%` so the parent tab container controls the size. Audit `PlaygroundLayout` and `SQLPlayground` for the same pattern.

No other changes to any of the three playground components.

---

## 6. New File

**`src/pages/PlaygroundPage.jsx`** — single new file, ~60 lines.

Responsibilities:
- Read `?tab` from `useSearchParams`, default to `'code'`
- Render the 44px header with `.tab-group` tab switcher
- Conditionally render the active tab component
- Lazy-import all three: `PlaygroundLayout`, `SQLPlayground`, `PlaygroundShell`

Follow the same `lazy(() => import(...))` pattern used throughout App.tsx.

---

## 7. Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Add `/playground` route under `ShellRoute + ProtectedRoute`. Change `/capra/playground` to `<Navigate to="/playground?tab=vm" replace />`. Add `PlaygroundPage` lazy import. Update page title map entry. |
| `src/components/shared/SiteNav.tsx` | Update "Playground" link from `/capra/playground` → `/playground` (both desktop and mobile nav). |
| `src/components/shared/cara/CaraBar.tsx` | Add `/playground` to the path allowlist array. |
| `src/components/capra/playground/PlaygroundShell.jsx` | Root div: `height: calc(100vh - 60px)` → `height: 100%`. Update `destroySession` navigation target from `/capra/playground` → `/playground?tab=vm`. |
| `src/components/lumora/playground/PlaygroundLayout.tsx` | Audit root div height; change to `height: 100%` if hardcoded. |
| `src/components/capra/sql/SQLPlayground.tsx` | Audit root div height; change to `height: 100%` if hardcoded. |
| `src/pages/capra/PracticePage.jsx` | Remove `playground` and `sql-editor` tabs from the tab bar and their `activeView` render blocks. Remove lazy imports of `PlaygroundLayout` and `SQLPlayground`. Add two CTA chips right-aligned in the tab strip: `⌨ Code Playground →` linking to `/playground?tab=code` and `🗃 SQL Editor →` linking to `/playground?tab=sql`. |

---

## 8. PracticePage CTA Design

The two removed tabs are replaced with small inline chips in the existing tab bar row (right-aligned), so no vertical space is added:

```
[Coding] [System Design] [Behavioral]   ·   ⌨ Code Playground →   🗃 SQL Editor →
```

Both use the `.chip` class and link via `<Link>` to `/playground?tab=code` and `/playground?tab=sql`.

---

## 9. VM Session Lifecycle Across Tab Switches

When a VM session is active and the user switches to Code or SQL:
- `PlaygroundShell` unmounts; WebSocket closes
- On switching back, `PlaygroundShell` remounts and `usePlaygroundSession` reconnects — session stays alive server-side (TTL keeps ticking)

This is the same behaviour as a page refresh. No changes to `usePlaygroundSession`.

---

## 10. Navigation from Lumora

Any Lumora page can deeplink to `/playground?tab=code` or `/playground?tab=vm` via `<Link>` or `useNavigate`. No Lumora routing changes are part of this spec.

---

## 11. Access Control

`/playground` is wrapped in `ProtectedRoute` (login required). Each tab component enforces its own internal auth/quota gates unchanged.

---

## 12. Out of Scope

- Lumora nav additions (Lumora teams add deeplinks as needed)
- Changes to playground component internals beyond height fixes
- Mobile VM support (PlaygroundShell already shows "desktop only" on mobile)
- New environments or features (see `2026-06-18-playgrounds-design.md`)
