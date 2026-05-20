# CoFix — Design Spec
**Date:** 2026-05-19  
**Status:** Approved  

## Overview

CoFix is a new top-level tab in the Lumora header (alongside Interview, Coding, Design) that lets users paste broken or incomplete code, optionally describe the issue, and receive a fixed version with numbered badge annotations explaining every change. The fix preserves existing logic and produces HackerRank-compatible output.

**Route:** `/lumora/fix`  
**Tab label:** `CoFix`  
**Active state:** Navy `#0047AB` pill, same as other active Lumora tabs

---

## Layout

Split left/right pane filling the viewport below the header bar.

### Left Panel — Broken Code

- **Monaco editor** (editable, full height minus hint/button strip) — user pastes their code with errors or missing blocks. Language auto-detected via the same `detectLanguage()` helper used in CodingLayout; user can override via dropdown in the header.
- **Hint textarea** (optional, bottom strip) — plain text field, placeholder: "Describe the issue or what's missing (optional)". Non-blocking.
- **"⚡ Fix with CoFix" button** (full-width, navy) — disabled until `code.trim().length >= 5`. Triggers SSE stream.

### Right Panel — Fixed Code + Annotations

Split internally into two columns:

**Left column — Fixed code with badges**
- Monaco editor (read-only)
- Changed lines have numbered badge overlays (amber `①②` for fixes, green `③④` for additions)
- Badges rendered via Monaco `deltaDecorations` with `glyphMarginClassName` — not absolute positioning

**Right column — Annotation panel (fixed width ~180px)**
- Header: `CHANGES` label
- List of `{ badge, label, note }` entries matching the badges in the code
- Amber badge = fix to existing code; green badge = new code added
- Scrollable independently of the code editor

**Bottom strip (right panel)**
- Time complexity, Space complexity
- `HackerRank: ✓ Compatible` or `⚠ Contains I/O boilerplate` badge
- Change count (`N changes`)
- `Copy` button — copies `fixed_code` to clipboard
- `Send to Coding →` button — pushes `fixed_code` into the Coding tab

---

## Backend

### New Route

`POST /api/v1/coding/cofix/stream` — lumora-backend  
Auth: bearer token (same `authenticate` middleware as other coding routes)

**Request body:**
```json
{
  "code": "string",
  "hint": "string (optional)",
  "language": "string (optional, default: auto-detect)"
}
```

**SSE event stream** (same envelope as existing `/api/v1/coding/stream`):
```
event: token   → streaming text chunks (for loading shimmer)
event: answer  → final structured payload (see below)
event: done    → stream complete
event: error   → { message: string }
```

**Answer payload:**
```json
{
  "fixed_code": "string",
  "changes": [
    {
      "line": 3,
      "badge": 1,
      "type": "fix | added",
      "label": "Short label (2-4 words)",
      "note": "One sentence explanation of why this change was made."
    }
  ],
  "complexity": {
    "time": "O(...)",
    "space": "O(...)"
  },
  "hackerrank_compatible": true
}
```

### Claude Prompt Strategy

The system prompt instructs Claude to:
1. Fix only what is broken or missing — preserve all existing logic unchanged
2. Respect the existing code style and naming conventions
3. Return `changes[]` with line numbers mapped to the **fixed** code (not the original)
4. Set `hackerrank_compatible: true` only when the function signature is clean (correct return type, no `stdin`/`input()` boilerplate that HackerRank doesn't expect)
5. Set `type: "fix"` for corrections to existing lines, `type: "added"` for newly inserted lines
6. Keep badge labels concise (2-4 words); explanations one sentence each

---

## Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| `CoFixPage` | `pages/lumora/CoFixPage.tsx` | Route component, renders `CoFixLayout` |
| `CoFixLayout` | `components/lumora/cofix/CoFixLayout.tsx` | Split-pane shell, all state management |
| `AnnotationPanel` | `components/lumora/cofix/AnnotationPanel.tsx` | Renders `changes[]` badge list |
| `streamCoFixResponse` | `lib/sse-client.ts` (new function) | SSE client for `/cofix/stream` |

Reuses:
- `SharedCodeEditor` — both left (editable) and right (read-only) Monaco panes
- `Header` — existing Lumora header with CoFix tab added

### State (CoFixLayout)

```typescript
const [inputCode, setInputCode] = useState('')
const [hint, setHint] = useState('')
const [language, setLanguage] = useState('auto')
const [isLoading, setIsLoading] = useState(false)
const [fixedCode, setFixedCode] = useState('')
const [changes, setChanges] = useState<Change[]>([])
const [complexity, setComplexity] = useState<{ time: string; space: string } | null>(null)
const [hackerrankCompatible, setHackerrankCompatible] = useState<boolean | null>(null)
const [error, setError] = useState<string | null>(null)
```

No Zustand store needed — CoFix is self-contained. The only cross-page interaction is "Send to Coding →" which uses the existing `interview-store` to set `starterCode` and navigates to `/lumora/coding`.

### Header Tab Addition

`Header.tsx` updated to add `cofix` to `TabType`, `TAB_ROUTES`, and `TABS`:
```typescript
type TabType = 'interview' | 'coding' | 'design' | 'cofix';
TAB_ROUTES.cofix = '/lumora/fix';
TABS.push({ id: 'cofix', label: 'CoFix' });
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty code (<5 chars) | Fix button disabled |
| Language auto-detect fails | Falls back to Python, user can override |
| Claude returns no changes | Right panel: "No issues found — code looks correct" green banner, empty annotation list |
| Stream error / network drop | Inline error in right panel header with Retry button |
| Code >500 lines | Inline warning "CoFix works best on focused snippets" — submission still allowed |
| HackerRank `stdin` boilerplate detected | `hackerrank_compatible: false` → bottom strip shows "⚠ Contains I/O boilerplate — strip before submitting" |

---

## Data Flow

1. User pastes code into left Monaco editor
2. Types optional hint in hint textarea
3. Clicks "⚡ Fix with CoFix"
4. `CoFixLayout` opens SSE stream to `POST /api/v1/coding/cofix/stream`
5. `token` events arrive — right panel shows a pulsing "Analyzing…" overlay (fixed_code is structured JSON, not streamable line-by-line, so no partial rendering)
6. `answer` event arrives → right panel snaps atomically: populate Monaco editor with `fixed_code`, apply badge decorations, render `AnnotationPanel` with `changes[]`, update complexity strip
7. `done` event → clear loading state, enable Copy and Send to Coding buttons
8. "Send to Coding →" → set `starterCode` in interview-store → navigate to `/lumora/coding`

---

## Out of Scope

- Code execution / running tests (use the Coding tab for that via "Send to Coding →")
- Saving fix history / sessions
- Multi-file support
- Diff view (change from original to fixed) — the badge system serves this purpose
