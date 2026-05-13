# Library Tabs + Cascading Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add All/MCQ/Coding/Design type-tabs above the filter row and make all filter dropdowns narrow their options to reflect the current filtered set.

**Architecture:** Backend `/api/library/meta` is extended to accept the same filter params as `/api/library` and returns narrowed skills/roles/types. Frontend derives `effectiveTypes` from the active tab + selected types, uses it in both API calls, and replaces the one-time meta fetch with a debounced reactive fetch.

**Tech Stack:** Express 5 (Node.js), React 19 + TypeScript, React Router DOM v7 URL-state pattern, Vitest (no existing tests — no test step required).

---

## Files

| File | Change |
|------|--------|
| `apps/ascend-backend/src/routes/library.js` | Extend `GET /meta` to accept filter params + return narrowed meta |
| `apps/camora/src/pages/capra/HRLibraryPage.tsx` | Add TAB_GROUPS constants, activeTab URL state, tab bar UI, reactive meta fetch, effectiveTypes wiring |

---

### Task 1: Extend `GET /api/library/meta` with filter support

**File:** `apps/ascend-backend/src/routes/library.js`

- [ ] **Step 1: Replace the `/meta` handler** (lines 106–114) with the version below that applies filters when params are present and recomputes skills/roles/types from the filtered subset. The no-params path returns `_meta` unchanged (existing behavior).

```js
/** GET /api/library/meta — with optional filter params for cascading dropdowns */
router.get('/meta', async (req, res) => {
  try {
    const problems = await getLibrary();

    const q         = (req.query.q         || '').trim().toLowerCase();
    const rolesF    = req.query.role       ? req.query.role.split(',').map(r => r.trim())                : [];
    const types     = req.query.type       ? req.query.type.split(',').map(t => t.trim())                : [];
    const diffs     = req.query.difficulty ? req.query.difficulty.split(',').map(d => d.trim())          : [];
    const skills    = req.query.skills     ? req.query.skills.split(',').map(s => s.trim().toLowerCase()): [];
    const durations = req.query.duration   ? req.query.duration.split(',').map(d => d.trim())            : [];

    const hasFilters = q || rolesF.length || types.length || diffs.length || skills.length || durations.length;
    if (!hasFilters) return res.json(_meta);

    // Apply the same filter logic as GET /api/library
    let filtered = problems;
    if (q) filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.summary  && p.summary.toLowerCase().includes(q)) ||
      (p.preview  && p.preview.toLowerCase().includes(q)) ||
      p.skills.some(s => s.toLowerCase().includes(q)) ||
      (p.skills_full || []).some(s => s.toLowerCase().includes(q)) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
    if (rolesF.length)    filtered = filtered.filter(p => rolesF.some(r => p._roles.includes(r)));
    if (types.length)     filtered = filtered.filter(p => types.includes(p.type));
    if (diffs.length)     filtered = filtered.filter(p => diffs.includes(p.difficulty));
    if (skills.length)    filtered = filtered.filter(p => {
      const all = [...(p.skills_full?.length ? p.skills_full : p.skills), ...p.skills].map(s => s.toLowerCase());
      return skills.some(f => all.some(ps => ps.includes(f)));
    });
    if (durations.length) filtered = filtered.filter(p => durations.some(d => DURATION_BUCKETS[d]?.(p)));

    // Recompute meta from filtered subset
    const sfFreq = {};
    for (const p of filtered) {
      for (const s of (p.skills_full?.length ? p.skills_full : p.skills)) {
        sfFreq[s] = (sfFreq[s] || 0) + 1;
      }
    }
    const filteredSkills = Object.entries(sfFreq).sort((a, b) => b[1] - a[1]).map(([s]) => s);

    const roleFreq = {};
    for (const p of filtered) for (const r of p._roles) roleFreq[r] = (roleFreq[r] || 0) + 1;
    const filteredRoles = Object.entries(roleFreq).sort((a, b) => b[1] - a[1]).map(([r]) => r);

    const filteredTypes = [...new Set(filtered.map(p => p.type).filter(Boolean))].sort();

    res.json({
      skills:       filteredSkills,
      roles:        filteredRoles,
      types:        filteredTypes,
      difficulties: ['Easy', 'Medium', 'Hard'],
      durations:    ['quick', 'short', 'long', 'extended'],
      total:        filtered.length,
    });
  } catch (err) {
    console.error('[library] meta error:', err.message);
    res.status(500).json({ error: 'Failed to load library metadata' });
  }
});
```


- [ ] **Step 2: Verify locally**

```bash
cd apps/ascend-backend && node src/index.js &
# No filters — should return full meta
curl "http://localhost:3009/api/library/meta" | jq '{total,roleCount: (.roles|length), skillCount: (.skills|length)}'
# With role filter — should return narrowed skills/types
curl "http://localhost:3009/api/library/meta?role=Front-End%20Developer" | jq '{total,roles,typeCount:(.types|length)}'
# With tab (type) filter
curl "http://localhost:3009/api/library/meta?type=mcq,multiple_mcq" | jq '{total,typeCount:(.types|length)}'
kill %1
```

Expected: total decreases when filters are applied; roles/skills/types reflect filtered subset.

- [ ] **Step 3: Commit**

```bash
git add apps/ascend-backend/src/routes/library.js
git commit -m "feat(library): extend /meta endpoint with filter params for cascading dropdowns"
```

---

### Task 2: Add TAB_GROUPS constants and activeTab state to HRLibraryPage

**File:** `apps/camora/src/pages/capra/HRLibraryPage.tsx`

- [ ] **Step 1: Add TAB_GROUPS and TAB_LABELS constants** after the `DURATION_LABELS` block (around line 70):

```tsx
const TAB_GROUPS: Record<string, string[]> = {
  all:    [],
  mcq:    ['mcq', 'multiple_mcq'],
  coding: ['code', 'database', 'fullstack', 'coderepo_task', 'sudorank',
           'code_review', 'prompt_engineering', 'approx', 'complete'],
  design: ['design', 'whiteboard', 'diagram', 'textAns'],
};

const TAB_LABELS: Record<string, string> = {
  all: 'All', mcq: 'MCQ', coding: 'Coding', design: 'Design',
};
```

- [ ] **Step 2: Read `activeTab` from URL params** — add this line alongside the other `searchParams.get(...)` reads (around line 376):

```tsx
const activeTab = searchParams.get('tab') || 'all';
```

- [ ] **Step 3: Compute `effectiveTypes`** — add after `activeTab` is read:

```tsx
// Types sent to API: explicit type selection OR the active tab's group
const tabTypes = TAB_GROUPS[activeTab] ?? [];
const effectiveTypes = selectedTypes.length > 0 ? selectedTypes : tabTypes;
```

- [ ] **Step 4: Add `setActiveTab` helper** — alongside `updateParam` and `toggleList`:

```tsx
function setActiveTab(tab: string) {
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (tab === 'all') next.delete('tab'); else next.set('tab', tab);
    next.delete('type');   // clear explicit type selection on tab switch
    next.delete('page');
    return next;
  });
}
```

- [ ] **Step 5: Add `metaTypes` state + `metaDebounceRef`** — alongside existing state declarations:

```tsx
const [metaTypes, setMetaTypes] = useState<string[]>([]);
const metaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 6: Commit checkpoint**

```bash
git add apps/camora/src/pages/capra/HRLibraryPage.tsx
git commit -m "feat(library): add TAB_GROUPS constants, activeTab URL state, effectiveTypes"
```

---

### Task 3: Replace one-time meta fetch with reactive cascading fetch

**File:** `apps/camora/src/pages/capra/HRLibraryPage.tsx`

- [ ] **Step 1: Replace the existing one-time meta `useEffect`** (the one that calls `fetch(\`${API}/api/library/meta\`)` with no dependencies, around line 382) with this reactive version:

```tsx
useEffect(() => {
  if (metaDebounceRef.current) clearTimeout(metaDebounceRef.current);
  metaDebounceRef.current = setTimeout(() => {
    const params = new URLSearchParams();
    if (q)                      params.set('q',          q);
    if (selectedRoles.length)   params.set('role',       selectedRoles.join(','));
    if (effectiveTypes.length)  params.set('type',       effectiveTypes.join(','));
    if (selectedDiffs.length)   params.set('difficulty', selectedDiffs.join(','));
    if (selectedSkills.length)  params.set('skills',     selectedSkills.join(','));
    if (selectedDurs.length)    params.set('duration',   selectedDurs.join(','));

    fetch(`${API}/api/library/meta?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setMetaTotal(d.total ?? null);
        setMetaSkills(d.skills ?? []);
        setMetaRoles(d.roles ?? []);
        setMetaTypes(d.types ?? []);
      })
      .catch(() => {});
  }, 200);
}, [q,
    selectedRoles.join(','), effectiveTypes.join(','), selectedDiffs.join(','),
    selectedSkills.join(','), selectedDurs.join(',')]);
```

- [ ] **Step 2: Update the main library fetch `useEffect`** — replace `if (selectedTypes.length) params.set('type', ...)` with `effectiveTypes`:

```tsx
// BEFORE (around line 397):
if (selectedTypes.length)  params.set('type',       selectedTypes.join(','));

// AFTER:
if (effectiveTypes.length) params.set('type',       effectiveTypes.join(','));
```

Also update the dependency array for the library fetch (remove `selectedTypes.join(',')`, add `effectiveTypes.join(',')`):

```tsx
// BEFORE:
}, [q,
    selectedRoles.join(','), selectedTypes.join(','), selectedDiffs.join(','),
    selectedSkills.join(','), selectedDurs.join(','), page]);

// AFTER:
}, [q,
    selectedRoles.join(','), effectiveTypes.join(','), selectedDiffs.join(','),
    selectedSkills.join(','), selectedDurs.join(','), page]);
```

- [ ] **Step 3: Compute narrowed Type dropdown options** — add this derived value after `effectiveTypes`:

```tsx
// Type options: within active tab's group (further narrowed by cascaded meta)
const typeOptions = activeTab !== 'all'
  ? TAB_GROUPS[activeTab].filter(t => metaTypes.length === 0 || metaTypes.includes(t))
  : (metaTypes.length > 0 ? metaTypes : ALL_TYPES);
```

- [ ] **Step 4: Update the Type `FilterDropdown`** — change its `options` prop from `ALL_TYPES` to `typeOptions`:

```tsx
// BEFORE:
<FilterDropdown
  label="Type" options={ALL_TYPES} selected={selectedTypes}

// AFTER:
<FilterDropdown
  label="Type" options={typeOptions} selected={selectedTypes}
```

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/pages/capra/HRLibraryPage.tsx
git commit -m "feat(library): reactive cascading meta fetch + type options narrowed by tab/filters"
```

---

### Task 4: Add the tab bar UI

**File:** `apps/camora/src/pages/capra/HRLibraryPage.tsx`

- [ ] **Step 1: Insert the tab bar** between the search input `</div>` and the filter-pill row `<div>` (around line 513 — after the search box closing `</div>` and before the `{/* Filter row */}` comment):

```tsx
{/* ── Tab bar ──────────────────────────────────────────────────────────── */}
<div style={{
  display: 'flex', gap: 0,
  borderBottom: '1px solid var(--border)',
  marginBottom: 14,
}}>
  {(['all', 'mcq', 'coding', 'design'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '8px 18px',
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${activeTab === tab ? 'var(--cam-gold-leaf, #d4af37)' : 'transparent'}`,
        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: 13,
        fontWeight: activeTab === tab ? 700 : 500,
        cursor: 'pointer',
        transition: 'color 0.12s, border-color 0.12s',
        whiteSpace: 'nowrap',
        marginBottom: -1,
      }}
    >
      {TAB_LABELS[tab]}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Build and smoke-test**

```bash
cd apps/camora && npx vite build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/camora/src/pages/capra/HRLibraryPage.tsx
git commit -m "feat(library): add All/MCQ/Coding/Design tab bar"
```

---

### Task 5: Deploy and verify

- [ ] **Step 1: Push backend to Railway**

```bash
git push
```

Railway auto-deploys from `main`. Watch logs confirm ascend-backend restarts cleanly:
```
[library] Loaded N problems from hr_library.json
```

- [ ] **Step 2: Deploy frontend to Vercel**

```bash
vercel --prod
```

- [ ] **Step 3: Manual smoke test on production**

Open `https://camora.cariara.com/capra/library` and verify:

| Action | Expected |
|--------|----------|
| Click **MCQ** tab | List shows only MCQ/Multi-MCQ problems; Type dropdown shows only `MCQ`, `Multi-MCQ`; URL has `?tab=mcq` |
| Click **Coding** tab | List shows coding problem types only |
| Select a Role (e.g. "Front-End Developer") while on **Coding** tab | Skill dropdown narrows to skills used by Front-End Coding problems |
| Select a Skill while a Role is active | Type dropdown narrows further |
| Click **All** tab | All filters reset; full library shown |
| Refresh with `?tab=mcq&role=Front-End%20Developer` in URL | Page restores tab + role filter correctly |
