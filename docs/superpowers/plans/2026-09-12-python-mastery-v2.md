# Python Mastery v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/capra/learn/python` into the single complete Python surface — 50 topics across 7 chapters, with the structure a reader can revise from — and retire the duplicate Programiz page into it.

**Architecture:** The `Topic` interface gains seven fields (five optional), the single 1,904-line data file splits into seven chapter modules behind an `index.ts` barrel, and `PythonLearnPage.tsx` gains five conditionally-rendered cards plus a chapter-grouped sidebar. New cards are extracted as small pure components so they are unit-testable without router context; existing cards stay inline and untouched. A data-integrity test guards the 50 topics, and a slug-coverage assertion in that test is what makes deleting the Programiz surface safe.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, vitest 4 (jsdom, `globals: true`, configured inside `apps/camora/vite.config.ts`), @testing-library/react 16, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-09-12-python-mastery-v2-design.md` — the per-topic "must cover" tables in spec section 3 are the content contract for Tasks 9 through 15. Read the spec alongside this plan.

## Global Constraints

- Run all commands from `apps/camora/`. Tests: `npx vitest run <path>`. There is no `test` script in `package.json`; invoke vitest directly.
- `npx tsc --noEmit && npx vite build` must both pass before every commit that touches `.ts`/`.tsx`.
  The `build` script is a bare `vite build`, which strips types WITHOUT checking them — so
  `vite build` alone is not a type gate. `tsc --noEmit` is. Baseline verified clean (exit 0)
  before any of this work began, so any error is ours.
- Prose fields render as plain text nodes. No markdown syntax (`**bold**`, `#` headings, fenced blocks) and no emoji in `summary`, `intro`, `gotcha`, `tip`, `edgeCases[]`, `sections[].body`, `keyTerms[].meaning`, `interviewQs[].a`, or `walkthrough[].explain`. Code fields (`cleanCode`, `examples[].code`, `sections[].code`) are exempt.
- New cards reuse the card pattern already on the page: `rounded-2xl`, `background: var(--bg-surface)`, `border: 1px solid var(--border)`, and a header strip of `background: color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))` with `font-mono text-[12px] font-bold uppercase tracking-widest` label in `var(--cam-primary)`.
- Minimum font size is 12px. No inline Tailwind colour literals — use CSS custom properties.
- Do not restructure existing cards in `PythonLearnPage.tsx`. Additive changes only.
- Commit to `main`. Do not push without explicit approval.
- Every code example must be runnable as written and every `# Output:` comment must
  match real stdout. Verify with `node scripts/verify-python-examples.mjs` (added by
  Ruling 9) before each content commit. It executes every `cleanCode`,
  `sections[].code` and `examples[].code` string under python3 and diffs the asserted
  output against the real one. It is a script, not a vitest test, because it shells
  out to python3 and a suite that fails on a missing interpreter is worse than none.
- Never assert output that is true on one machine but not universally: `id()` values,
  hash values, set iteration order, small-integer interning boundaries, or exception
  message wording (Python 3.14 reworded the dict-key `TypeError`, for one). Quote only
  version-stable text.
- `sections[].body` may contain blank lines; they render as separate paragraphs
  (Ruling 8). Before that ruling a blank line silently collapsed into one run-on
  paragraph.
- Never stage `apps/camora/src/components/lumora/gemini/GeminiPanel.tsx` or `apps/desktop/main.js` — both carry unrelated uncommitted work.

---

# PHASE 1 — Foundation and pilot

Exit criteria: the page shows 23 topics in 7 chapters, the two pilot topics render every new card, and the layout is confirmed before content volume lands.

---

### Task 1: Topic schema and chapter metadata

**Files:**
- Create: `apps/camora/src/data/python/types.ts`
- Test: `apps/camora/src/data/python/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ChapterId`, `Section`, `KeyTerm`, `CheatRow`, `InterviewQ`, `Reference`, `WalkthroughStep`, `Example`, `Topic`, and `CHAPTERS: readonly Chapter[]`. Every later task imports from here.

- [ ] **Step 1: Write the failing test**

```ts
// apps/camora/src/data/python/types.test.ts
import { describe, it, expect } from 'vitest';
import { CHAPTERS, CHAPTER_IDS } from './types';

describe('CHAPTERS', () => {
  it('declares seven chapters in curriculum order', () => {
    expect(CHAPTERS.map(c => c.id)).toEqual([
      'getting-started',
      'functions',
      'data-structures',
      'oop',
      'errors-files',
      'stdlib',
      'advanced',
    ]);
  });

  it('gives every chapter a label and an accent token', () => {
    for (const c of CHAPTERS) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.accent).toMatch(/^var\(--/);
    }
  });

  it('exposes CHAPTER_IDS as a lookup set matching CHAPTERS', () => {
    expect(CHAPTER_IDS.size).toBe(CHAPTERS.length);
    for (const c of CHAPTERS) expect(CHAPTER_IDS.has(c.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/types.test.ts`
Expected: FAIL — cannot resolve `./types`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/camora/src/data/python/types.ts

export type ChapterId =
  | 'getting-started'
  | 'functions'
  | 'data-structures'
  | 'oop'
  | 'errors-files'
  | 'stdlib'
  | 'advanced';

export interface Chapter {
  id: ChapterId;
  label: string;
  accent: string;
}

/** Curriculum order. The sidebar, the barrel, and the hero all read from this. */
export const CHAPTERS: readonly Chapter[] = [
  { id: 'getting-started', label: 'Getting Started',           accent: 'var(--cam-primary)' },
  { id: 'functions',       label: 'Functions',                 accent: 'var(--cam-gold-leaf)' },
  { id: 'data-structures', label: 'Data Structures',           accent: 'var(--cam-primary)' },
  { id: 'oop',             label: 'Object-Oriented Python',    accent: 'var(--cam-gold-leaf)' },
  { id: 'errors-files',    label: 'Errors, Files & Modules',   accent: 'var(--cam-primary)' },
  { id: 'stdlib',          label: 'Standard Library & Tooling', accent: 'var(--cam-gold-leaf)' },
  { id: 'advanced',        label: 'Runtime & Advanced',        accent: 'var(--cam-primary)' },
] as const;

export const CHAPTER_IDS: ReadonlySet<ChapterId> = new Set(CHAPTERS.map(c => c.id));

export interface WalkthroughStep { code: string; explain: string }
export interface Example         { label: string; code: string }

/** A headed prose block. Replaces the single wall-of-text intro. */
export interface Section  { heading: string; body: string; code?: string }
export interface KeyTerm  { term: string; meaning: string }
export interface CheatRow { call: string; does: string; returns: string }
export interface InterviewQ { q: string; a: string }
export interface Reference  { label: string; url: string }

export interface Topic {
  id: string;
  title: string;
  chapter: ChapterId;
  track: 'beginner' | 'advanced';
  estimatedMins: number;
  /** One line: what it is, and why an interviewer asks about it. */
  summary: string;
  intro: string;
  sections?: Section[];
  keyTerms?: KeyTerm[];
  cleanCode: string;
  walkthrough: WalkthroughStep[];
  examples: Example[];
  cheatSheet?: CheatRow[];
  interviewQs?: InterviewQ[];
  references?: Reference[];
  edgeCases: string[];
  gotcha: string;
  tip: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/data/python/types.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python/types.ts apps/camora/src/data/python/types.test.ts
git commit -m "feat(python-learn): topic schema and chapter metadata"
```

---

### Task 2: Data-integrity test harness

**Files:**
- Create: `apps/camora/src/data/python/curriculum.test.ts`
- Create: `apps/camora/src/data/python/index.ts` (stub, real content in Task 3)

**Interfaces:**
- Consumes: `Topic`, `CHAPTERS`, `CHAPTER_IDS` from `./types`.
- Produces: `PYTHON_TOPICS: Topic[]` from `./index`. This is the test every content task extends.

The markdown check deliberately does **not** reject a bare `__`, because dunder names (`__init__`, `__name__`) appear constantly in legitimate prose. Bold is matched only when the asterisks hug non-space characters, so the Python power operator written as `x ** 2` does not false-positive.

- [ ] **Step 1: Write the failing test**

```ts
// apps/camora/src/data/python/curriculum.test.ts
import { describe, it, expect } from 'vitest';
import { PYTHON_TOPICS } from './index';
import { CHAPTERS, CHAPTER_IDS, type Topic } from './types';

const MD_BOLD   = /\*\*\S[\s\S]*?\S\*\*/;
const MD_FENCE  = /```/;
const MD_HEAD   = /^#{1,6}\s/m;
const EMOJI     = /\p{Extended_Pictographic}/u;

function proseOf(t: Topic): string[] {
  return [
    t.summary, t.intro, t.gotcha, t.tip,
    ...t.edgeCases,
    ...t.walkthrough.map(w => w.explain),
    ...(t.sections    ?? []).flatMap(s => [s.heading, s.body]),
    ...(t.keyTerms    ?? []).flatMap(k => [k.term, k.meaning]),
    ...(t.interviewQs ?? []).flatMap(q => [q.q, q.a]),
    ...(t.cheatSheet  ?? []).flatMap(c => [c.does, c.returns]),
  ];
}

describe('PYTHON_TOPICS', () => {
  it('has unique topic ids', () => {
    const ids = PYTHON_TOPICS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills every required field on every topic', () => {
    for (const t of PYTHON_TOPICS) {
      expect(t.id, `${t.id}: id`).toBeTruthy();
      expect(t.title, `${t.id}: title`).toBeTruthy();
      expect(t.summary, `${t.id}: summary`).toBeTruthy();
      expect(t.intro, `${t.id}: intro`).toBeTruthy();
      expect(t.cleanCode, `${t.id}: cleanCode`).toBeTruthy();
      expect(t.gotcha, `${t.id}: gotcha`).toBeTruthy();
      expect(t.tip, `${t.id}: tip`).toBeTruthy();
      expect(t.estimatedMins, `${t.id}: estimatedMins`).toBeGreaterThan(0);
      expect(t.walkthrough.length, `${t.id}: walkthrough`).toBeGreaterThan(0);
      expect(t.examples.length, `${t.id}: examples`).toBeGreaterThan(0);
      expect(t.edgeCases.length, `${t.id}: edgeCases`).toBeGreaterThan(0);
    }
  });

  it('assigns every topic to a declared chapter', () => {
    for (const t of PYTHON_TOPICS) {
      expect(CHAPTER_IDS.has(t.chapter), `${t.id}: chapter ${t.chapter}`).toBe(true);
    }
  });

  it('orders topics by chapter, matching CHAPTERS order', () => {
    const order = CHAPTERS.map(c => c.id);
    const seen = PYTHON_TOPICS.map(t => order.indexOf(t.chapter));
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i], `topic ${PYTHON_TOPICS[i].id} out of chapter order`)
        .toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it('keeps markdown syntax and emoji out of prose fields', () => {
    for (const t of PYTHON_TOPICS) {
      for (const s of proseOf(t)) {
        expect(MD_BOLD.test(s),  `${t.id}: markdown bold in "${s.slice(0, 60)}"`).toBe(false);
        expect(MD_FENCE.test(s), `${t.id}: code fence in "${s.slice(0, 60)}"`).toBe(false);
        expect(MD_HEAD.test(s),  `${t.id}: markdown heading in "${s.slice(0, 60)}"`).toBe(false);
        expect(EMOJI.test(s),    `${t.id}: emoji in "${s.slice(0, 60)}"`).toBe(false);
      }
    }
  });

  it('gives every reference an absolute https url', () => {
    for (const t of PYTHON_TOPICS) {
      for (const r of t.references ?? []) {
        expect(r.label, `${t.id}: reference label`).toBeTruthy();
        expect(r.url, `${t.id}: reference url ${r.url}`).toMatch(/^https:\/\//);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write the stub barrel**

```ts
// apps/camora/src/data/python/index.ts
import type { Topic } from './types';

export * from './types';

/** Populated in Task 3 by concatenating the seven chapter modules. */
export const PYTHON_TOPICS: Topic[] = [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: PASS, 6 tests (vacuously — the array is empty; Task 3 fills it).

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python/curriculum.test.ts apps/camora/src/data/python/index.ts
git commit -m "test(python-learn): data-integrity harness for the curriculum"
```

---

### Task 3: Split the curriculum into chapter modules

Move all 22 existing topics out of `python-curriculum.ts` into seven chapter files, adding only `chapter` and `summary` to each. Do not otherwise edit their content — deepening happens in Phase 2 and 3.

`dicts-sets` moves across as a single topic and is split into `dicts` and `sets` in Task 11.

Chapter assignment for the 22 existing topics:

| Chapter file | Existing topic ids |
|---|---|
| `01-getting-started.ts` | `variables`, `operators`, `control-flow`, `loops` |
| `02-functions.ts` | `functions`, `closures`, `decorators` |
| `03-data-structures.ts` | `lists`, `dicts-sets`, `strings`, `comprehensions` |
| `04-oop.ts` | `oop-basics`, `dataclasses`, `generators` |
| `05-errors-files.ts` | `errors`, `file-io`, `context-managers`, `modules` |
| `06-stdlib.ts` | none — every topic in this chapter is new (Task 14) |
| `07-advanced.ts` | `async`, `concurrency`, `type-hints`, `performance` |

**Files:**
- Create: `apps/camora/src/data/python/01-getting-started.ts` … `07-advanced.ts`
- Modify: `apps/camora/src/data/python/index.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`
- Modify: `apps/camora/src/pages/capra/PythonLearnPage.tsx:5`
- Delete: `apps/camora/src/data/python-curriculum.ts`

**Interfaces:**
- Consumes: `Topic`, `ChapterId` from `./types`.
- Produces: seven named exports — `GETTING_STARTED_TOPICS`, `FUNCTIONS_TOPICS`, `DATA_STRUCTURES_TOPICS`, `OOP_TOPICS`, `ERRORS_FILES_TOPICS`, `STDLIB_TOPICS`, `ADVANCED_TOPICS` — each `Topic[]`. `PYTHON_TOPICS` concatenates them in `CHAPTERS` order.

- [ ] **Step 1: Extend the test to assert the migrated set**

Add to `curriculum.test.ts`:

```ts
const EXISTING_IDS = [
  'variables', 'operators', 'control-flow', 'loops',
  'functions', 'closures', 'decorators',
  'lists', 'dicts-sets', 'strings', 'comprehensions',
  'oop-basics', 'dataclasses', 'generators',
  'errors', 'file-io', 'context-managers', 'modules',
  'async', 'concurrency', 'type-hints', 'performance',
];

it('carries all 22 pre-existing topics across the split', () => {
  const ids = new Set(PYTHON_TOPICS.map(t => t.id));
  for (const id of EXISTING_IDS) expect(ids.has(id), `lost topic ${id}`).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `lost topic variables`, and 21 more.

- [ ] **Step 3: Create the chapter modules**

Each file follows this shape. Copy each topic object verbatim from `python-curriculum.ts`, add a `chapter` line after `title` and a `summary` line after `estimatedMins`, and change nothing else.

```ts
// apps/camora/src/data/python/01-getting-started.ts
import type { Topic } from './types';

export const GETTING_STARTED_TOPICS: Topic[] = [
  {
    id: 'variables',
    title: 'Variables & Data Types',
    chapter: 'getting-started',
    track: 'beginner',
    estimatedMins: 15,
    summary: 'How Python stores values without type declarations, and why mutable and immutable types behave so differently when you assign them.',
    intro: `...verbatim from python-curriculum.ts...`,
    // ...every other field verbatim...
  },
  // operators, control-flow, loops
];
```

`06-stdlib.ts` is created now so the barrel imports resolve, and stays empty until Task 14:

```ts
// apps/camora/src/data/python/06-stdlib.ts
import type { Topic } from './types';

/** Every topic in this chapter is new. Populated in Task 14. */
export const STDLIB_TOPICS: Topic[] = [];
```

- [ ] **Step 4: Wire the barrel**

```ts
// apps/camora/src/data/python/index.ts
import type { Topic } from './types';
import { GETTING_STARTED_TOPICS } from './01-getting-started';
import { FUNCTIONS_TOPICS }       from './02-functions';
import { DATA_STRUCTURES_TOPICS } from './03-data-structures';
import { OOP_TOPICS }             from './04-oop';
import { ERRORS_FILES_TOPICS }    from './05-errors-files';
import { STDLIB_TOPICS }          from './06-stdlib';
import { ADVANCED_TOPICS }        from './07-advanced';

export * from './types';

/** Concatenated in CHAPTERS order — the curriculum-order test depends on this. */
export const PYTHON_TOPICS: Topic[] = [
  ...GETTING_STARTED_TOPICS,
  ...FUNCTIONS_TOPICS,
  ...DATA_STRUCTURES_TOPICS,
  ...OOP_TOPICS,
  ...ERRORS_FILES_TOPICS,
  ...STDLIB_TOPICS,
  ...ADVANCED_TOPICS,
];
```

- [ ] **Step 5: Update the one consumer and delete the old file**

In `apps/camora/src/pages/capra/PythonLearnPage.tsx` line 5, replace:

```ts
import { PYTHON_TOPICS, type Topic } from '../../data/python-curriculum';
```

with:

```ts
import { PYTHON_TOPICS, type Topic } from '../../data/python';
```

`CHAPTERS` is deliberately NOT imported here — nothing uses it until Task 8,
and the repo runs eslint-plugin-unused-imports. Task 8 adds it.

Then:

```bash
git rm apps/camora/src/data/python-curriculum.ts
```

- [ ] **Step 6: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python/ && npx tsc --noEmit && npx vite build`
Expected: PASS, 7 tests. Build succeeds. Confirm no remaining references:
`grep -rn "python-curriculum" apps/camora/src` returns nothing.

- [ ] **Step 7: Commit**

```bash
git add apps/camora/src/data/python apps/camora/src/pages/capra/PythonLearnPage.tsx
git commit -m "refactor(python-learn): split curriculum into seven chapter modules"
```

---

### Task 4: Per-chapter build chunks

`vite.config.ts` already splits `data/capra/topics/` per file so editing one dataset does not invalidate the browser cache for the rest. The chapter modules deserve the same treatment as they grow toward 9,000 lines.

**Files:**
- Modify: `apps/camora/vite.config.ts:62-73`

**Interfaces:**
- Consumes: the `apps/camora/src/data/python/` paths created in Task 3.
- Produces: build chunks named `python-<chapter-file>`.

- [ ] **Step 1: Add the chunk rule**

Inside `manualChunks`, directly after the `data/capra/topics/` block:

```ts
          // Python curriculum chapters — same rationale as topic data above:
          // per-chapter chunks so editing one chapter does not invalidate
          // the cached bytes for the other six.
          if (id.includes('/data/python/')) {
            const m = id.match(/\/data\/python\/([^/]+?)(?:\.\w+)?$/);
            if (m && /^\d\d-/.test(m[1])) return `python-${m[1]}`;
          }
```

- [ ] **Step 2: Verify the chunks appear**

Run: `cd apps/camora && npx vite build 2>&1 | grep python-`
Expected: six `python-NN-*` chunks listed (`06-stdlib` is empty and may be elided).

- [ ] **Step 3: Commit**

```bash
git add apps/camora/vite.config.ts
git commit -m "build(python-learn): per-chapter chunks for the curriculum"
```

---

### Task 5: Shared card shell and Concept sections

New cards live in their own module so they are unit-testable without router context. Existing cards in `PythonLearnPage.tsx` are not touched.

**Files:**
- Create: `apps/camora/src/components/capra/python/SurfaceCard.tsx`
- Create: `apps/camora/src/components/capra/python/ConceptSections.tsx`
- Test: `apps/camora/src/components/capra/python/ConceptSections.test.tsx`

**Interfaces:**
- Consumes: `Section` from `@/data/python`.
- Produces: `SurfaceCard({ label, accent?, children })` and `ConceptSections({ sections })`. `SurfaceCard` is reused by Tasks 6, 7 and 8. `ConceptSections` returns `null` when `sections` is empty or undefined.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/camora/src/components/capra/python/ConceptSections.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConceptSections from './ConceptSections';

describe('ConceptSections', () => {
  it('renders nothing when there are no sections', () => {
    const { container } = render(<ConceptSections sections={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a heading and body for each section', () => {
    render(<ConceptSections sections={[
      { heading: 'Why tuples exist', body: 'A tuple is a fixed record.' },
      { heading: 'The trailing comma', body: 'One item needs a comma.' },
    ]} />);
    expect(screen.getByText('Why tuples exist')).toBeInTheDocument();
    expect(screen.getByText('A tuple is a fixed record.')).toBeInTheDocument();
    expect(screen.getByText('The trailing comma')).toBeInTheDocument();
  });

  it('renders the optional code block when a section has one', () => {
    render(<ConceptSections sections={[
      { heading: 'Packing', body: 'Commas make the tuple.', code: 'point = 1, 2' },
    ]} />);
    expect(screen.getByText('point = 1, 2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/capra/python/ConceptSections.test.tsx`
Expected: FAIL — cannot resolve `./ConceptSections`.

- [ ] **Step 3: Write SurfaceCard**

```tsx
// apps/camora/src/components/capra/python/SurfaceCard.tsx
import type { ReactNode } from 'react';

/** The card shell already used throughout PythonLearnPage, extracted so the
 *  new cards stop repeating twelve lines of inline style each. */
export default function SurfaceCard({
  label,
  accent = 'var(--cam-primary)',
  children,
}: { label: string; accent?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div
        className="px-6 py-3"
        style={{
          background: `color-mix(in oklab, ${accent} 8%, var(--bg-surface))`,
          borderBottom: `1px solid color-mix(in oklab, ${accent} 20%, var(--border))`,
        }}
      >
        <span className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: accent }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Write ConceptSections**

```tsx
// apps/camora/src/components/capra/python/ConceptSections.tsx
import type { Section } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function ConceptSections({ sections }: { sections?: Section[] }) {
  if (!sections?.length) return null;
  return (
    <SurfaceCard label="Concept">
      <div className="divide-y divide-[var(--border)]/40">
        {sections.map((s, i) => (
          <div key={i} className="px-6 py-5">
            <h3 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{s.heading}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.body}</p>
            {s.code && (
              <pre
                className="mt-3 px-4 py-3 rounded-xl overflow-x-auto text-[12px] leading-relaxed"
                style={{ fontFamily: 'var(--font-mono)', background: '#0d1117', color: '#e6edf3', margin: 0 }}
              >
                <code>{s.code}</code>
              </pre>
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/capra/python/ConceptSections.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/capra/python
git commit -m "feat(python-learn): concept sections card"
```

---

### Task 6: Key Terms and Cheat Sheet tables

**Files:**
- Create: `apps/camora/src/components/capra/python/KeyTermsTable.tsx`
- Create: `apps/camora/src/components/capra/python/CheatSheetTable.tsx`
- Test: `apps/camora/src/components/capra/python/Tables.test.tsx`

**Interfaces:**
- Consumes: `KeyTerm`, `CheatRow` from `@/data/python`; `SurfaceCard` from Task 5.
- Produces: `KeyTermsTable({ terms })` and `CheatSheetTable({ rows })`. Both return `null` when their data is empty or undefined.

Both tables wrap in `overflow-x-auto` so they scroll independently at phone width instead of forcing the page to scroll sideways.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/camora/src/components/capra/python/Tables.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyTermsTable from './KeyTermsTable';
import CheatSheetTable from './CheatSheetTable';

describe('KeyTermsTable', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<KeyTermsTable terms={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a row per term', () => {
    render(<KeyTermsTable terms={[
      { term: 'Immutable', meaning: 'Cannot be changed after creation.' },
      { term: 'Hashable',  meaning: 'Usable as a dictionary key.' },
    ]} />);
    expect(screen.getByText('Immutable')).toBeInTheDocument();
    expect(screen.getByText('Usable as a dictionary key.')).toBeInTheDocument();
  });
});

describe('CheatSheetTable', () => {
  it('renders nothing when undefined', () => {
    const { container } = render(<CheatSheetTable rows={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders call, does and returns for each row', () => {
    render(<CheatSheetTable rows={[
      { call: 't.count(x)', does: 'Counts how many times x appears.', returns: 'int' },
    ]} />);
    expect(screen.getByText('t.count(x)')).toBeInTheDocument();
    expect(screen.getByText('Counts how many times x appears.')).toBeInTheDocument();
    expect(screen.getByText('int')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/capra/python/Tables.test.tsx`
Expected: FAIL — cannot resolve `./KeyTermsTable`.

- [ ] **Step 3: Write KeyTermsTable**

```tsx
// apps/camora/src/components/capra/python/KeyTermsTable.tsx
import type { KeyTerm } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function KeyTermsTable({ terms }: { terms?: KeyTerm[] }) {
  if (!terms?.length) return null;
  return (
    <SurfaceCard label="Key Terms">
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {terms.map((t, i) => (
              <tr key={i} style={{ borderTop: i ? '1px solid color-mix(in oklab, var(--border) 40%, transparent)' : 'none' }}>
                <th
                  scope="row"
                  className="px-6 py-3 align-top font-mono text-[12px] font-bold whitespace-nowrap"
                  style={{ color: 'var(--cam-primary)' }}
                >
                  {t.term}
                </th>
                <td className="px-6 py-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {t.meaning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
```

- [ ] **Step 4: Write CheatSheetTable**

```tsx
// apps/camora/src/components/capra/python/CheatSheetTable.tsx
import type { CheatRow } from '@/data/python';
import SurfaceCard from './SurfaceCard';

const TH = 'px-6 py-2.5 text-left font-mono text-[12px] font-bold uppercase tracking-widest';

export default function CheatSheetTable({ rows }: { rows?: CheatRow[] }) {
  if (!rows?.length) return null;
  return (
    <SurfaceCard label="Cheat Sheet" accent="var(--cam-gold-leaf)">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
              <th className={TH} style={{ color: 'var(--text-muted)' }}>Call</th>
              <th className={TH} style={{ color: 'var(--text-muted)' }}>Does</th>
              <th className={TH} style={{ color: 'var(--text-muted)' }}>Returns</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: i ? '1px solid color-mix(in oklab, var(--border) 40%, transparent)' : 'none' }}>
                <td className="px-6 py-3 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--cam-gold-leaf-dk)' }}>{r.call}</td>
                <td className="px-6 py-3 align-top text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.does}</td>
                <td className="px-6 py-3 align-top font-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{r.returns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/capra/python/Tables.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/capra/python
git commit -m "feat(python-learn): key terms and cheat sheet tables"
```

---

### Task 7: Interview Questions and Go Deeper cards

**Files:**
- Create: `apps/camora/src/components/capra/python/InterviewQuestions.tsx`
- Create: `apps/camora/src/components/capra/python/ReferenceLinks.tsx`
- Test: `apps/camora/src/components/capra/python/InterviewQuestions.test.tsx`

**Interfaces:**
- Consumes: `InterviewQ`, `Reference` from `@/data/python`; `SurfaceCard` from Task 5.
- Produces: `InterviewQuestions({ questions })` and `ReferenceLinks({ references })`. Both return `null` when empty.

Answers collapse using the `hidden` attribute rather than `style.display`, and each toggle carries `aria-expanded`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/camora/src/components/capra/python/InterviewQuestions.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InterviewQuestions from './InterviewQuestions';
import ReferenceLinks from './ReferenceLinks';

const QS = [
  { q: 'Is a tuple comprehension possible?', a: 'No. Parentheses produce a generator expression.' },
  { q: 'Why does (5) not make a tuple?',     a: 'The comma makes the tuple, not the parentheses.' },
];

describe('InterviewQuestions', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<InterviewQuestions questions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows every question with its answer collapsed', () => {
    render(<InterviewQuestions questions={QS} />);
    expect(screen.getByText('Is a tuple comprehension possible?')).toBeInTheDocument();
    expect(screen.getByText(QS[0].a)).not.toBeVisible();
  });

  it('reveals one answer on click without revealing the others', async () => {
    const user = userEvent.setup();
    render(<InterviewQuestions questions={QS} />);
    await user.click(screen.getByRole('button', { name: /tuple comprehension/i }));
    expect(screen.getByText(QS[0].a)).toBeVisible();
    expect(screen.getByText(QS[1].a)).not.toBeVisible();
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    render(<InterviewQuestions questions={QS} />);
    const btn = screen.getByRole('button', { name: /tuple comprehension/i });
    await user.click(btn);
    await user.click(btn);
    expect(screen.getByText(QS[0].a)).not.toBeVisible();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('ReferenceLinks', () => {
  it('renders nothing when undefined', () => {
    const { container } = render(<ReferenceLinks references={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each reference as an external link', () => {
    render(<ReferenceLinks references={[
      { label: 'Programiz — Python Tuple', url: 'https://www.programiz.com/python-programming/tuple' },
    ]} />);
    const link = screen.getByRole('link', { name: /Programiz/ });
    expect(link).toHaveAttribute('href', 'https://www.programiz.com/python-programming/tuple');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
```

`@testing-library/user-event` is not currently in `devDependencies`. Install it first:

```bash
cd apps/camora && pnpm add -D @testing-library/user-event
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/capra/python/InterviewQuestions.test.tsx`
Expected: FAIL — cannot resolve `./InterviewQuestions`.

- [ ] **Step 3: Write InterviewQuestions**

```tsx
// apps/camora/src/components/capra/python/InterviewQuestions.tsx
import { useState } from 'react';
import type { InterviewQ } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function InterviewQuestions({ questions }: { questions?: InterviewQ[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!questions?.length) return null;

  return (
    <SurfaceCard label="Interview Questions" accent="var(--cam-gold-leaf)">
      <ul className="divide-y divide-[var(--border)]/40">
        {questions.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full text-left px-6 py-3.5 flex items-start gap-3 transition-colors"
                style={{ background: 'transparent' }}
              >
                <span
                  className="font-mono text-[12px] shrink-0 mt-0.5 transition-transform"
                  style={{ color: 'var(--cam-gold-leaf-dk)', transform: isOpen ? 'rotate(90deg)' : 'none' }}
                  aria-hidden
                >
                  ▸
                </span>
                <span className="text-[13px] font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {item.q}
                </span>
              </button>
              <p
                hidden={!isOpen}
                className="px-6 pb-4 pl-[3.1rem] text-[13px] leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.a}
              </p>
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
```

- [ ] **Step 4: Write ReferenceLinks**

```tsx
// apps/camora/src/components/capra/python/ReferenceLinks.tsx
import type { Reference } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function ReferenceLinks({ references }: { references?: Reference[] }) {
  if (!references?.length) return null;
  return (
    <SurfaceCard label="Go Deeper">
      <ul className="divide-y divide-[var(--border)]/40">
        {references.map((r, i) => (
          <li key={i}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-6 py-3 text-[13px] transition-opacity hover:opacity-70"
              style={{ color: 'var(--cam-primary)' }}
            >
              <span>{r.label}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/capra/python/InterviewQuestions.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/package.json pnpm-lock.yaml apps/camora/src/components/capra/python
git commit -m "feat(python-learn): interview questions and reference links cards"
```

---

### Task 8: Chapter sidebar, summary line, and card wiring

Wire the five new cards into `TopicView`, replace the two `track` groups in the sidebar with seven collapsible chapter groups, and extend search to the new fields.

**Files:**
- Create: `apps/camora/src/components/capra/python/ChapterNav.tsx`
- Test: `apps/camora/src/components/capra/python/ChapterNav.test.tsx`
- Modify: `apps/camora/src/pages/capra/PythonLearnPage.tsx`

**Interfaces:**
- Consumes: `Topic`, `CHAPTERS` from `@/data/python`; all five card components.
- Produces: `ChapterNav({ topics, selectedId, onSelect })`. Renders only chapters that have at least one topic. The chapter containing `selectedId` starts expanded.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/camora/src/components/capra/python/ChapterNav.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterNav from './ChapterNav';
import type { Topic } from '@/data/python';

const t = (id: string, chapter: Topic['chapter']): Topic => ({
  id, title: id, chapter, track: 'beginner', estimatedMins: 10,
  summary: 's', intro: 'i', cleanCode: 'c',
  walkthrough: [{ code: 'c', explain: 'e' }],
  examples: [{ label: 'l', code: 'c' }],
  edgeCases: ['e'], gotcha: 'g', tip: 'p',
});

const TOPICS = [t('variables', 'getting-started'), t('loops', 'getting-started'), t('lists', 'data-structures')];

describe('ChapterNav', () => {
  it('renders only chapters that have topics', () => {
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={vi.fn()} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
    expect(screen.queryByText('Standard Library & Tooling')).not.toBeInTheDocument();
  });

  it('expands the chapter holding the selected topic and collapses the others', () => {
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /variables/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /lists/ })).not.toBeVisible();
  });

  it('toggles a chapter open on click', async () => {
    const user = userEvent.setup();
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Data Structures/ }));
    expect(screen.getByRole('button', { name: /lists/ })).toBeVisible();
  });

  it('calls onSelect with the topic id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /loops/ }));
    expect(onSelect).toHaveBeenCalledWith('loops');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/capra/python/ChapterNav.test.tsx`
Expected: FAIL — cannot resolve `./ChapterNav`.

- [ ] **Step 3: Write ChapterNav**

Move the existing `TopicButton` out of `PythonLearnPage.tsx` into this file unchanged and reuse it — it is the one existing piece that must move, because the sidebar no longer renders it directly.

```tsx
// apps/camora/src/components/capra/python/ChapterNav.tsx
import { useState, useEffect } from 'react';
import { CHAPTERS, type Topic } from '@/data/python';

export const TopicButton = ({ topic, active, onClick }: { topic: Topic; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2"
    style={{
      background: active ? 'color-mix(in oklab, var(--cam-gold-leaf) 12%, var(--bg-elevated))' : 'transparent',
      border: active ? '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)' : '1px solid transparent',
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
    <span className={`text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}
      style={{ color: active ? 'var(--cam-gold-leaf-dk)' : 'var(--text-secondary)' }}>
      {topic.title}
    </span>
    <span className="font-mono text-[12px] shrink-0" style={{ color: 'var(--text-muted)' }}>{topic.estimatedMins}m</span>
  </button>
);

export default function ChapterNav({ topics, selectedId, onSelect }: {
  topics: Topic[]; selectedId: string; onSelect: (id: string) => void;
}) {
  const activeChapter = topics.find(t => t.id === selectedId)?.chapter;
  const [open, setOpen] = useState<string | null>(activeChapter ?? null);
  useEffect(() => { if (activeChapter) setOpen(activeChapter); }, [activeChapter]);

  return (
    <div className="space-y-4">
      {CHAPTERS.map(ch => {
        const inChapter = topics.filter(t => t.chapter === ch.id);
        if (!inChapter.length) return null;
        const isOpen = open === ch.id;
        return (
          <div key={ch.id}>
            <button
              onClick={() => setOpen(isOpen ? null : ch.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-2 mb-2 px-1"
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ch.accent }} />
              <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-left flex-1" style={{ color: ch.accent }}>
                {ch.label}
              </span>
              <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>{inChapter.length}</span>
            </button>
            <div className="space-y-0.5" hidden={!isOpen}>
              {inChapter.map(t => (
                <TopicButton key={t.id} topic={t} active={t.id === selectedId} onClick={() => onSelect(t.id)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/capra/python/ChapterNav.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire the page**

In `PythonLearnPage.tsx`:

1. Delete the local `TopicButton` and `TopicGroup` definitions; import `ChapterNav, { TopicButton }` from `@/components/capra/python/ChapterNav`.
2. Import the five cards.
3. In the header card, add the summary directly under the title row, inside the `px-6 py-5` block and above the intro paragraph:

```tsx
<p className="text-[13px] leading-relaxed mb-3 font-medium" style={{ color: 'var(--text-primary)' }}>{topic.summary}</p>
```

4. In `TopicView`, place the cards in this order: header, `<ConceptSections sections={topic.sections} />`, `<KeyTermsTable terms={topic.keyTerms} />`, Reference Code, How It Works, Examples, `<CheatSheetTable rows={topic.cheatSheet} />`, Edge Cases, `<InterviewQuestions questions={topic.interviewQs} />`, Gotcha + Tip, `<ReferenceLinks references={topic.references} />`.
5. Replace the two `<TopicGroup>` calls with `<ChapterNav topics={PYTHON_TOPICS} selectedId={selectedId} onSelect={setTopic} />`. Delete the now-unused `beginnerTopics`/`advancedTopics` memos.
6. Extend the search memo to match the new fields:

```tsx
return PYTHON_TOPICS.filter(t =>
  t.title.toLowerCase().includes(q) ||
  t.summary.toLowerCase().includes(q) ||
  t.intro.toLowerCase().includes(q) ||
  (t.keyTerms    ?? []).some(k => k.term.toLowerCase().includes(q)) ||
  (t.interviewQs ?? []).some(iq => iq.q.toLowerCase().includes(q))
);
```

7. Update the hero subtitle:

```tsx
<p className="text-sm mb-5" style={{ color: 'var(--cam-strip-text)' }}>
  {PYTHON_TOPICS.length} topics across {CHAPTERS.filter(c => PYTHON_TOPICS.some(t => t.chapter === c.id)).length} chapters — ~{Math.round(totalMins / 60)}h of material
</p>
```

8. Replace the two track chips in the hero chip row with a single `Real Interview Questions` chip alongside the existing `Real-world Examples` and `Google · Netflix · NVIDIA` chips.

- [ ] **Step 6: Run the suite and build**

Run: `cd apps/camora && npx vitest run src/data/python src/components/capra/python && npx tsc --noEmit && npx vite build`
Expected: all PASS, build succeeds. Grep for dead code: `grep -n "TopicGroup\|beginnerTopics\|advancedTopics" src/pages/capra/PythonLearnPage.tsx` returns nothing.

- [ ] **Step 7: Commit**

```bash
git add apps/camora/src/components/capra/python apps/camora/src/pages/capra/PythonLearnPage.tsx
git commit -m "feat(python-learn): chapter sidebar and the five new topic cards"
```

---

### Task 9: Pilot topics — `variables` and `tuples`

Two topics written to the full schema, one migrated and one new, so the layout is confirmed before 48 more are written against it.

**Files:**
- Modify: `apps/camora/src/data/python/01-getting-started.ts`
- Modify: `apps/camora/src/data/python/03-data-structures.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `variables` gains `sections`, `keyTerms`, `cheatSheet`, `interviewQs`, `references`. `tuples` is a new topic in `data-structures`.

Content contract from spec section 3:
- `variables` — built-in types, mutable vs immutable, naming, multiple assignment. Interview questions 4 and 5 from the GeeksforGeeks list. Reference: `https://www.programiz.com/python-programming/variables-datatypes`.
- `tuples` — immutability, single-element trailing comma, packing and unpacking, hashability, why there is no tuple comprehension, `namedtuple`. Interview questions 31 and 33. Reference: `https://www.programiz.com/python-programming/tuple`.

- [ ] **Step 1: Extend the test to require the pilot shape**

Add to `curriculum.test.ts`:

```ts
const FULLY_WRITTEN: string[] = ['variables', 'tuples'];

describe('fully written topics', () => {
  it.each(FULLY_WRITTEN)('%s carries every optional field', (id) => {
    const t = PYTHON_TOPICS.find(x => x.id === id);
    expect(t, `missing topic ${id}`).toBeDefined();
    expect(t!.sections?.length,    `${id}: sections`).toBeGreaterThanOrEqual(2);
    expect(t!.keyTerms?.length,    `${id}: keyTerms`).toBeGreaterThanOrEqual(3);
    expect(t!.cheatSheet?.length,  `${id}: cheatSheet`).toBeGreaterThanOrEqual(3);
    expect(t!.interviewQs?.length, `${id}: interviewQs`).toBeGreaterThanOrEqual(3);
    expect(t!.examples.length,     `${id}: examples`).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `missing topic tuples`, and `variables: sections` undefined.

- [ ] **Step 3: Write the two topics**

Fill `variables` with the five optional fields and add the `tuples` object to `DATA_STRUCTURES_TOPICS`, positioned after `lists`. Follow the content contract above and the Global Constraints on prose. Worked shape:

```ts
{
  id: 'tuples',
  title: 'Tuples',
  chapter: 'data-structures',
  track: 'beginner',
  estimatedMins: 15,
  summary: 'An ordered collection that cannot be changed after you build it — which is exactly why it can be a dictionary key and a list cannot.',
  intro: `A tuple holds a fixed sequence of values. ...`,
  sections: [
    { heading: 'The comma makes the tuple, not the parentheses',
      body: `Writing (5) is just the number 5 in brackets. ...`,
      code: `single = (5,)\nnot_a_tuple = (5)` },
    // at least one more
  ],
  keyTerms: [
    { term: 'Immutable', meaning: 'Cannot be changed after creation. There is no append, no remove, no item assignment.' },
    { term: 'Packing',   meaning: 'Building a tuple by listing values separated by commas.' },
    { term: 'Hashable',  meaning: 'Usable as a dictionary key or a set member, because its value can never change.' },
  ],
  cleanCode: `...`,
  walkthrough: [ /* ... */ ],
  examples: [ /* at least 3 */ ],
  cheatSheet: [
    { call: 't.count(x)', does: 'Counts how many times x appears in the tuple.', returns: 'int' },
    { call: 't.index(x)', does: 'Finds the first position of x. Raises ValueError if absent.', returns: 'int' },
    { call: 'tuple(it)',  does: 'Builds a tuple from any iterable.',             returns: 'tuple' },
  ],
  interviewQs: [
    { q: 'What is the difference between a list and a tuple?',
      a: `A list is mutable and a tuple is not. ...` },
    // at least 2 more
  ],
  references: [
    { label: 'Programiz — Python Tuple', url: 'https://www.programiz.com/python-programming/tuple' },
  ],
  edgeCases: [ /* ... */ ],
  gotcha: `...`,
  tip: `...`,
}
```

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python
git commit -m "feat(python-learn): pilot topics for variables and tuples"
```

- [ ] **Step 6: PHASE 1 GATE — stop for review**

Report to the user: 23 topics in 7 chapters, `variables` and `tuples` showing every new card. Do not start Phase 2 until the layout is approved.

---

# PHASE 2 — Chapters 1 to 3

26 topics. Each task follows the same cycle: add the chapter's ids to `FULLY_WRITTEN` in `curriculum.test.ts`, watch it fail, write the topics against the spec's "must cover" table, watch it pass, build, commit.

The spec's per-topic contract in section 3 is the definition of done for each topic. Every topic needs `summary`, at least 2 `sections`, at least 3 `keyTerms`, at least 3 `cheatSheet` rows, at least 3 `interviewQs`, and at least 3 `examples`, on top of the fields that were already required.

---

### Task 10: Chapter 1 — Getting Started

**Files:**
- Modify: `apps/camora/src/data/python/01-getting-started.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `GETTING_STARTED_TOPICS` with 8 topics in this order: `how-python-runs`, `variables`, `type-conversion`, `input-output`, `keywords`, `operators`, `control-flow`, `loops`.

New topics: `how-python-runs`, `type-conversion`, `input-output`, `keywords`. Deepened: `variables` (done in Task 9), `operators`, `control-flow`, `loops`.

GeeksforGeeks interview questions this chapter must answer: 1, 2, 3, 4, 5, 7, 8, 12, 13, 51.
Programiz slugs absorbed: `pz-introduction`, `pz-variables-datatypes`, `pz-type-conversion`, `pz-input-output`, `pz-operators`, `pz-if-elif-else`, `pz-for-loop`, `pz-while-loop`, `pz-break-continue`, `pz-pass-statement`. Each contributes a `references` entry on its absorbing topic, using the URL from the deleted `programizPaths.js` (recover it with `git show HEAD:apps/camora/src/data/capra/programizPaths.js` if already deleted).

- [ ] **Step 1: Add the chapter's ids to `FULLY_WRITTEN`**

```ts
const FULLY_WRITTEN: string[] = [
  'how-python-runs', 'variables', 'type-conversion', 'input-output',
  'keywords', 'operators', 'control-flow', 'loops',
  'tuples',
];
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `missing topic how-python-runs`, and the deepened topics missing optional fields.

- [ ] **Step 3: Write the four new topics and deepen the three existing ones**

Follow the spec's Chapter 1 table for what each must cover. Keep `estimatedMins` honest: 8 to 12 for `keywords` and `type-conversion`, 15 to 20 for the rest.

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python
git commit -m "feat(python-learn): complete Getting Started chapter"
```

---

### Task 11: Chapter 2 — Functions

**Files:**
- Modify: `apps/camora/src/data/python/02-functions.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `FUNCTIONS_TOPICS` with 7 topics in this order: `functions`, `args-kwargs`, `scope-namespaces`, `recursion`, `lambda-hof`, `closures`, `decorators`.

New: `args-kwargs`, `scope-namespaces`, `recursion`, `lambda-hof`. Deepened: `functions`, `closures`, `decorators`.

GeeksforGeeks questions: 14, 15, 16, 17, 18, 19, 20, 21, 22, 46, 47.
Programiz slugs absorbed: `pz-functions`, `pz-function-arguments`, `pz-recursion`, `pz-lambda`, `pz-global-local`, `pz-namespace`, `pz-closures`, `pz-decorators`.

- [ ] **Step 1: Add this chapter's 7 ids to `FULLY_WRITTEN`**

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `missing topic args-kwargs`, and three more.

- [ ] **Step 3: Write the four new topics and deepen the three existing ones**

Follow the spec's Chapter 2 table. `functions` must carry the mutable-default-argument trap in `gotcha`; `closures` must carry the late-binding loop trap.

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python
git commit -m "feat(python-learn): complete Functions chapter"
```

---

### Task 12: Chapter 3 — Data Structures

The largest chapter. `dicts-sets` splits here into `dicts` and `sets`; its existing content is divided between them and both are deepened.

**Files:**
- Modify: `apps/camora/src/data/python/03-data-structures.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `DATA_STRUCTURES_TOPICS` with 11 topics in this order: `lists`, `tuples`, `strings`, `slicing`, `dicts`, `sets`, `comprehensions`, `sorting`, `copying`, `matrices`, `collections-module`. The id `dicts-sets` no longer exists.

New: `slicing`, `dicts`, `sets`, `sorting`, `copying`, `matrices`, `collections-module`. Deepened: `lists`, `strings`, `comprehensions`. Already done: `tuples`.

GeeksforGeeks questions: 9, 10, 11, 23, 24, 25, 26, 30, 31, 32, 33, 34, 38, 39.
Programiz slugs absorbed: `pz-list`, `pz-tuple`, `pz-string`, `pz-dictionary`, `pz-set`, `pz-list-comprehension`, `pz-matrix`.

- [ ] **Step 1: Update the test for the split and the new ids**

Add this chapter's 11 ids to `FULLY_WRITTEN`, remove `dicts-sets` from `EXISTING_IDS`, and add an explicit assertion that the split happened:

```ts
it('splits dicts-sets into two topics', () => {
  const ids = PYTHON_TOPICS.map(t => t.id);
  expect(ids).not.toContain('dicts-sets');
  expect(ids).toContain('dicts');
  expect(ids).toContain('sets');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `dicts-sets` still present, `missing topic slicing`, and six more.

- [ ] **Step 3: Write the seven new topics, split `dicts-sets`, deepen the rest**

Follow the spec's Chapter 3 table. `copying` must include the nested-structure aliasing demonstration; `sorting` must name Timsort and explain stability.

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python
git commit -m "feat(python-learn): complete Data Structures chapter"
```

- [ ] **Step 6: PHASE 2 GATE — stop for review**

Report: 26 topics complete across Chapters 1 to 3. Do not start Phase 3 until approved.

---

# PHASE 3 — Chapters 4 to 7 and Programiz retirement

24 topics, then the deletion. The retirement is last because the slug-coverage test that makes it safe depends on every absorbing topic existing.

---

### Task 13: Chapter 4 — Object-Oriented Python

**Files:**
- Modify: `apps/camora/src/data/python/04-oop.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `OOP_TOPICS` with 8 topics in this order: `oop-basics`, `inheritance-mro`, `oop-pillars`, `methods-types`, `dunder-methods`, `dataclasses`, `iterators`, `generators`.

New: `inheritance-mro`, `oop-pillars`, `methods-types`, `dunder-methods`, `iterators`. Deepened: `oop-basics`, `dataclasses`, `generators`.

GeeksforGeeks questions: 35, 36, 37, 40, 41, 42, 43, 44, 45, 55, 56, 57, 58.
Programiz slugs absorbed: `pz-oop`, `pz-class`, `pz-inheritance`, `pz-multiple-inheritance`, `pz-operator-overloading`, `pz-property`, `pz-iterators`, `pz-generators`. Note `pz-property` lands on `oop-pillars`, not a topic of its own.

- [ ] **Step 1: Add this chapter's 8 ids to `FULLY_WRITTEN`**

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `missing topic inheritance-mro`, and four more.

- [ ] **Step 3: Write the five new topics and deepen the three existing ones**

Follow the spec's Chapter 4 table. `inheritance-mro` must show `__mro__` output for a diamond; `oop-pillars` must cover `@property` and name mangling; `iterators` must distinguish iterable from iterator and show exhaustion.

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python
git commit -m "feat(python-learn): complete Object-Oriented Python chapter"
```

---

### Task 14: Chapter 5 — Errors, Files & Modules

**Files:**
- Modify: `apps/camora/src/data/python/05-errors-files.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `ERRORS_FILES_TOPICS` with 6 topics in this order: `errors`, `file-io`, `os-pathlib`, `serialization`, `context-managers`, `modules`.

New: `os-pathlib`, `serialization`. Deepened: `errors`, `file-io`, `context-managers`, `modules`.

GeeksforGeeks questions: 27, 28, 29, 49, 52, 59, 61.
Programiz slugs absorbed: `pz-exceptions`, `pz-file-io`, `pz-modules`.

- [ ] **Step 1: Add this chapter's 6 ids to `FULLY_WRITTEN`**

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `missing topic os-pathlib`, `missing topic serialization`.

- [ ] **Step 3: Write the two new topics and deepen the four existing ones**

Follow the spec's Chapter 5 table. `errors` must add custom exception classes, `raise from`, and the bare-except anti-pattern. `serialization` must carry the pickle security warning in `gotcha`.

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python
git commit -m "feat(python-learn): complete Errors, Files and Modules chapter"
```

---

### Task 15: Chapters 6 and 7 — Standard Library and Runtime

Chapter 6 is entirely new, which is why the empty-chapter assertion could not exist before now. It is added here.

**Files:**
- Modify: `apps/camora/src/data/python/06-stdlib.ts`
- Modify: `apps/camora/src/data/python/07-advanced.ts`
- Modify: `apps/camora/src/data/python/curriculum.test.ts`

**Interfaces:**
- Consumes: `Topic` from `./types`.
- Produces: `STDLIB_TOPICS` with 4 topics — `regex`, `itertools-functools`, `testing`, `datetime`. `ADVANCED_TOPICS` with 6 in this order: `memory-model`, `gil-concurrency`, `async`, `type-hints`, `modern-python`, `performance`. The id `concurrency` is renamed to `gil-concurrency`.

New: all four in Chapter 6, plus `memory-model` and `modern-python`. Deepened: `gil-concurrency` (renamed), `async`, `type-hints`, `performance`.

GeeksforGeeks questions: 6, 48, 50, 53, 54, 60, 62, 63, 64, 65, 66, 67, 68.
Programiz slugs absorbed: `pz-regex`.

- [ ] **Step 1: Add the 10 ids and the empty-chapter assertion**

Add all 10 ids to `FULLY_WRITTEN`, replace `concurrency` with `gil-concurrency` in `EXISTING_IDS`, and add:

```ts
it('leaves no declared chapter empty', () => {
  for (const c of CHAPTERS) {
    expect(PYTHON_TOPICS.some(t => t.chapter === c.id), `empty chapter ${c.id}`).toBe(true);
  }
});

it('reaches the full 50-topic curriculum', () => {
  expect(PYTHON_TOPICS.length).toBe(50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — `empty chapter stdlib`, `missing topic regex`, and five more.

- [ ] **Step 3: Write the six new topics and deepen the four existing ones**

Follow the spec's Chapter 6 and 7 tables. `memory-model` must explain `is` vs `==` through small-integer interning; `modern-python` must cover the walrus operator, `match`, and `except*`; `testing` must cover `breakpoint()` and logging over print, which is where GeeksforGeeks question 50 lands.

Renaming `concurrency` to `gil-concurrency` changes its deep link. Add the old id to the legacy-alias handling in `PythonLearnPage.tsx` so `?topic=concurrency` still resolves:

```tsx
const LEGACY_TOPIC_IDS: Record<string, string> = { concurrency: 'gil-concurrency' };
const rawId = params.get('topic') || PYTHON_TOPICS[0].id;
const selectedId = LEGACY_TOPIC_IDS[rawId] ?? rawId;
```

- [ ] **Step 4: Run tests and build**

Run: `cd apps/camora && npx vitest run src/data/python && npx tsc --noEmit && npx vite build`
Expected: PASS, including `reaches the full 50-topic curriculum`. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/data/python apps/camora/src/pages/capra/PythonLearnPage.tsx
git commit -m "feat(python-learn): complete Standard Library and Runtime chapters"
```

---

### Task 16: Retire the Programiz surface

Safe only now that all 50 topics exist. The slug-coverage test is written first and is what authorises the deletion.

**Files:**
- Modify: `apps/camora/src/data/python/curriculum.test.ts`
- Delete: `apps/camora/src/pages/capra/ProgramizLearnPage.tsx`
- Delete: `apps/camora/src/data/capra/programizPaths.js`
- Delete: `apps/camora/public/learn-content/programiz/` (37 files)
- Modify: `apps/camora/src/App.tsx:88-ish, 490, 657`
- Modify: `apps/camora/src/components/layout/Sidebar.tsx:347`
- Delete: `apps/camora/src/pages/capra/LearnTopicPage.tsx`
- Delete: `apps/camora/public/learn-content/` (now empty of both sources)

**Interfaces:**
- Consumes: `PYTHON_TOPICS` and its `references` field.
- Produces: nothing new.

> **Amended by Ruling 3 (preflight).** The spec said "LearnTopicPage.tsx stays —
> CodeSignal depends on it." That stopped being true before this plan ran:
> CodeSignal was retired in commit `15328b38`, and `LearnTopicPage`'s only
> remaining consumer is `ProgramizLearnPage.tsx` plus its own route. Retiring
> Programiz therefore leaves it with zero consumers, so it is deleted outright
> rather than re-defaulted. Verify before deleting:
> `grep -rn "learn/topic" apps/camora/src` should show only `App.tsx` and
> `ProgramizLearnPage.tsx`, both of which this task removes.

- [ ] **Step 1: Write the slug-coverage test**

```ts
// add to curriculum.test.ts
/** Every retired Programiz slug, mapped to the topic that absorbed it.
 *  Recover the original URLs with:
 *    git show <commit-before-deletion>:apps/camora/src/data/capra/programizPaths.js */
const PROGRAMIZ_ABSORBED: Record<string, string> = {
  'pz-introduction': 'how-python-runs',
  'pz-variables-datatypes': 'variables',
  'pz-input-output': 'input-output',
  'pz-operators': 'operators',
  'pz-type-conversion': 'type-conversion',
  'pz-namespace': 'scope-namespaces',
  'pz-if-elif-else': 'control-flow',
  'pz-for-loop': 'loops',
  'pz-while-loop': 'loops',
  'pz-break-continue': 'loops',
  'pz-pass-statement': 'loops',
  'pz-functions': 'functions',
  'pz-function-arguments': 'args-kwargs',
  'pz-recursion': 'recursion',
  'pz-lambda': 'lambda-hof',
  'pz-global-local': 'scope-namespaces',
  'pz-modules': 'modules',
  'pz-list': 'lists',
  'pz-tuple': 'tuples',
  'pz-string': 'strings',
  'pz-dictionary': 'dicts',
  'pz-set': 'sets',
  'pz-list-comprehension': 'comprehensions',
  'pz-matrix': 'matrices',
  'pz-oop': 'oop-basics',
  'pz-class': 'oop-basics',
  'pz-inheritance': 'inheritance-mro',
  'pz-multiple-inheritance': 'inheritance-mro',
  'pz-operator-overloading': 'dunder-methods',
  'pz-iterators': 'iterators',
  'pz-generators': 'generators',
  'pz-closures': 'closures',
  'pz-decorators': 'decorators',
  'pz-property': 'oop-pillars',
  'pz-exceptions': 'errors',
  'pz-file-io': 'file-io',
  'pz-regex': 'regex',
};

describe('Programiz retirement', () => {
  it('covers all 37 retired slugs', () => {
    expect(Object.keys(PROGRAMIZ_ABSORBED)).toHaveLength(37);
  });

  it('points every retired slug at a topic that exists', () => {
    const ids = new Set(PYTHON_TOPICS.map(t => t.id));
    for (const [slug, topicId] of Object.entries(PROGRAMIZ_ABSORBED)) {
      expect(ids.has(topicId), `${slug} -> missing topic ${topicId}`).toBe(true);
    }
  });

  it('carries a programiz reference on every absorbing topic', () => {
    const absorbing = new Set(Object.values(PROGRAMIZ_ABSORBED));
    for (const id of absorbing) {
      const t = PYTHON_TOPICS.find(x => x.id === id)!;
      const hasRef = (t.references ?? []).some(r => r.url.includes('programiz.com'));
      expect(hasRef, `${id}: no programiz reference`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: FAIL — topics missing their `programiz.com` reference.

- [ ] **Step 3: Add the missing references**

For each of the 31 distinct absorbing topics, add a `references` entry using the URL from `programizPaths.js`. Where two slugs land on one topic (`loops` takes four, `oop-basics` takes two, `inheritance-mro` takes two, `scope-namespaces` takes two), add each as its own labelled entry.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/data/python/curriculum.test.ts`
Expected: PASS, all three retirement tests.

- [ ] **Step 5: Delete the surface**

```bash
cd /Users/chundu/camora
git rm apps/camora/src/pages/capra/ProgramizLearnPage.tsx
git rm apps/camora/src/data/capra/programizPaths.js
git rm -r apps/camora/public/learn-content/programiz
```

- [ ] **Step 6: Redirect the route**

In `App.tsx`: delete the `ProgramizLearnPage` lazy import and the `['/capra/learn/programiz', 'Programiz Python — Camora']` title-map entry, and replace the route with a redirect matching the legacy-alias pattern already used in the file:

```tsx
<Route path="/capra/learn/programiz" element={<Navigate to="/capra/learn/python" replace />} />
```

In `Sidebar.tsx:347`, delete the Programiz nav entry.

Delete `LearnTopicPage.tsx`, its lazy import, its `['/capra/learn/topic', 'Learn — Camora']` title entry, and its `/capra/learn/topic/:slug` route. Per Ruling 3 it has no consumers left once `ProgramizLearnPage.tsx` goes. Also remove the now-empty `apps/camora/public/learn-content/` directory.

- [ ] **Step 7: Verify nothing dangles**

Run: `cd /Users/chundu/camora && grep -rni "programiz" apps/camora/src apps/camora/public`
Expected: only the `programiz.com` URLs inside `references` and the slug map in the test file. No imports, no routes, no nav entries.

Run: `cd apps/camora && npx vitest run src/data/python src/components/capra/python && npx tsc --noEmit && npx vite build`
Expected: PASS. Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A apps/camora/src apps/camora/public
git commit -m "refactor(learn): retire the Programiz surface into Python Mastery"
```

- [ ] **Step 9: PHASE 3 GATE — stop for review**

Report: 50 topics across 7 chapters, Programiz retired behind a redirect, all tests green, build clean. Ask before pushing to `main`.

---

## Self-review notes

**Spec coverage.** Every section of the spec maps to a task: schema → Task 1; file layout → Task 3; topic map → Tasks 9 to 15; coverage guarantees → the GeeksforGeeks question lists and Programiz slug lists carried on each content task, plus the slug map in Task 16; renderer → Tasks 5 to 8; retirement → Task 16; testing → Tasks 2, 9, and the per-chapter test extensions; phases → the three phase gates. The one spec item with no home in the original draft was the per-chapter build chunk, which is why Task 4 exists.

**Type consistency.** `Topic`, `Section`, `KeyTerm`, `CheatRow`, `InterviewQ`, `Reference`, `ChapterId`, `Chapter`, `CHAPTERS`, `CHAPTER_IDS` are defined once in Task 1 and used under those exact names in every later task. Component props are `sections`, `terms`, `rows`, `questions`, `references`, matching their call sites in Task 8. `PYTHON_TOPICS` keeps its name from the old module, so the page's existing references to it do not change.

**Known judgment call.** Tasks 10 through 15 do not inline the prose for 48 topics — that would reproduce the ~9,000-line deliverable inside the plan. Instead each task carries the exact topic ids, their order, the GeeksforGeeks questions they must answer, the Programiz slugs they absorb, and a test that fails until the fields are filled. The spec's per-topic "must cover" table is the content contract. Task 9 is a fully worked example of the target shape for a writer to pattern-match against.
