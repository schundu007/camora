# Library Page — Type Tabs + Cascading Filters

## Goal

Two improvements to `/capra/library`:
1. **Type-segregation tabs** — prominent tabs (All / MCQ / Coding / Design) above the filter row for fast category switching.
2. **Cascading filters** — when any filter is active, the option lists in all other dropdown filters narrow to only values that exist in the current filtered set.

---

## Tab Bar

### Placement
Between the search input and the filter pill row.

### Tabs and type groups

| Tab | Types included |
|-----|----------------|
| All | (no restriction) |
| MCQ | `mcq`, `multiple_mcq` |
| Coding | `code`, `database`, `fullstack`, `coderepo_task`, `sudorank`, `code_review`, `prompt_engineering`, `approx`, `complete` |
| Design | `design`, `whiteboard`, `diagram`, `textAns` |

### URL param
Active tab stored as `?tab=all|mcq|coding|design`. Default: `all`. Linkable and preserved on refresh.

### Interaction rules
- Selecting a tab clears the Type filter dropdown and resets to page 1.
- The Type filter dropdown, when shown, lists only types within the active tab's group.
- All other filters (Role, Skill, Difficulty, Duration) remain active across tab switches.

### Visual style
Inline tab bar matching the existing pill/elevated-surface design language — underline-style active indicator or filled pill, not a full-width bordered tab strip.

---

## Cascading Filters

### Principle
Each filter's option list reflects *what exists in the result set defined by all other active filters*. Selecting Role narrows Skill and Type options. Selecting a tab narrows Skill and Role options. And so on.

### Backend change — extend `/api/library/meta`

Accept the same filter params as `/api/library` (no new params — `tab` is frontend-only state):
```
GET /api/library/meta?role=...&type=...&skills=...&difficulty=...&duration=...&q=...
```

The frontend translates `activeTab → typeList` (same `TAB_GROUPS` map) and sends `type=mcq,multiple_mcq` etc. to both `/meta` and `/api/library`. The `?tab=` URL param stays in the browser URL for shareability but is never sent to the backend.

When any param is present:
1. Apply those filters to `_cache` (same logic as `GET /api/library`).
2. Re-derive skills, roles, and types from the filtered subset only.
3. Return narrowed `{ skills, roles, types, total }`.

When no params: return full meta (current behavior, no regression).

### Frontend change — re-fetch meta on filter change

- Replace the one-time meta fetch on mount with a reactive fetch that re-fires whenever `q`, `selectedRoles`, `selectedSkills`, `selectedDiffs`, `selectedDurs`, or `activeTab` changes.
- Debounce 200 ms (same debounce ref as search).
- The re-fetched meta updates `metaSkills` and `metaRoles` state; the Type dropdown options are also narrowed to the meta types (union with the active tab's group).
- If a currently-selected filter value is no longer in the narrowed options, it stays in the URL but is visually marked as inactive (no UX change needed — the backend simply won't match anything for it).

---

## Files to Change

| File | Change |
|------|--------|
| `apps/ascend-backend/src/routes/library.js` | Extend `GET /meta` to accept + apply filter params |
| `apps/camora/src/pages/capra/HRLibraryPage.tsx` | Add tab bar UI + state; make meta fetch reactive; narrow Type dropdown options per tab |

---

## Out of Scope
- Persisting tab preference across sessions (URL param is sufficient).
- Animated tab transitions.
- Changing the card layout or sort order per tab.
