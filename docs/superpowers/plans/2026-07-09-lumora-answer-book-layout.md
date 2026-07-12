# Lumora Answer Book Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-box card grids in Lumora's Coding, CoFix, and saved-session answer views with a single top-to-bottom book-style reading column.

**Architecture:** One normalizer (`book-model.ts`) converts every answer source — the live JSON solution object, history `ParsedBlock[]`, and the CoFix answer — into a shared `BookDoc`. One renderer (`AnswerBook`) draws a `BookDoc` as a single card containing one reading column with a three-tier heading scale. Live and history therefore render from one mapping and cannot drift.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, vitest 4 (jsdom, `globals: true`, configured in `apps/camora/vite.config.ts`), highlight.js.

## Global Constraints

- **Work in an isolated git worktree.** Another session holds uncommitted edits to `CodingLayout.tsx` and `CoFixLayout.tsx`; all windows share one HEAD and one working tree. A branch does NOT isolate.
- **Never commit another window's files.** Every `git add` in this plan is path-scoped. Never `git add -A` or `git add .`.
- **Anchors are symbol names, not line numbers.** These files are under concurrent edit. Locate by symbol.
- **No markdown in content strings.** Never write `**bold**` or `# heading` into a `BookBlock` text field. `cleanText()` strips `*` and deletes `#`-heading lines outright. Headings come from `BookSection.heading`.
- **Navy-gold in dark, blue-only in light.** Use existing `--accent` / `--cam-gold-leaf` tokens. Introduce no new colour tokens.
- **No max-width on `<p>`.** The reading measure lives on the column. Max-width on paragraphs produces half-width left-aligned text.
- **Preserve:** `GridCard` (still used by `BehavioralView`), the MCQ verdict block, hover-to-highlight-line on walkthrough rows, and the `APIDESIGN` / `DATAMODEL` / `TECHNOLOGIES` / `CLOUDSERVICES` design sections that were added recently.
- **Build gate:** `npx vite build` from `apps/camora` must pass before any push. Not a grep-filtered `tsc`.
- **Do not push.** Commit locally only. The user approves pushes explicitly.

---

### Task 0: Create the isolated worktree

**Files:**
- Create: a new worktree directory outside the main checkout

**Interfaces:**
- Produces: an isolated working copy where Tasks 1–6 run.

- [ ] **Step 1: Confirm the main checkout is the one under concurrent edit**

```bash
cd /Users/chundu/camora
git status --porcelain | wc -l
```

Expected: a large number (hundreds). This confirms why isolation is required. Do not attempt to clean it.

- [ ] **Step 2: Create the worktree from current HEAD**

```bash
cd /Users/chundu/camora
git worktree add ../camora-book -b feat/answer-book HEAD
```

Expected: `Preparing worktree (new branch 'feat/answer-book')`.

Note: this branch exists only to give the worktree a checkout of its own. Per project convention the work lands on `main`; the merge back is a fast-forward or cherry-pick once the other session's tree settles.

- [ ] **Step 3: Verify the worktree is clean**

```bash
cd ../camora-book && git status --porcelain | wc -l
```

Expected: `0`

- [ ] **Step 4: Install dependencies**

```bash
cd ../camora-book && pnpm install --frozen-lockfile
```

Expected: completes without error.

**All subsequent tasks run in `../camora-book`.**

---

### Task 1: The `BookDoc` model and normalizers

**Files:**
- Create: `apps/camora/src/lib/lumora/book-model.ts`
- Create: `apps/camora/src/lib/lumora/book-model.test.ts`

**Interfaces:**
- Consumes: `ParsedBlock` from `@/types` (`{ type: string; content: string; lang?: string }`).
- Produces:
  - `type BookBlock`, `type BookSection`, `type BookDoc`
  - `docFromSolution(sd: any, solIdx?: number): BookDoc`
  - `docFromBlocks(blocks: ParsedBlock[]): BookDoc`
  - `SECTION_TITLES: Record<string, string>`

**Reference — the live solution shape** (from `apps/lumora-backend/src/routes/coding.js`):

```
{ language, solutions: [ { name, patternTag, approach, code, complexity: {time, space},
                           narration, trace: [{step, action, state}],
                           explanations: [{line, code, explanation}] } ],
  pitch: { opener, approach, keyPoints: [], tradeoffs: [], edgeCases: [] },
  examples: [{input, expected}] }
```

- [ ] **Step 1: Write the failing test**

Create `apps/camora/src/lib/lumora/book-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { docFromSolution, docFromBlocks } from './book-model';

const SD = {
  language: 'python',
  solutions: [{
    name: 'Two Pointers',
    patternTag: 'Two Pointers',
    approach: 'Scan from both ends, shrinking inward.',
    code: 'def f(a):\n    return a',
    complexity: { time: 'O(n)', space: 'O(1)' },
    narration: 'So my instinct is a two-pointer scan.',
    trace: [{ step: 1, action: 'init', state: 'l=0, r=n-1' }],
    explanations: [{ line: 1, code: 'def f(a):', explanation: 'signature' }],
  }],
  pitch: {
    opener: 'A single pass suffices.',
    approach: 'Two pointers converge.',
    keyPoints: ['Pointers never cross', 'One pass'],
    tradeoffs: ['O(1) space vs readability'],
    edgeCases: ['Empty array', 'All equal'],
  },
};

const ids = (doc: { sections: { id: string }[] }) => doc.sections.map(s => s.id);

describe('docFromSolution', () => {
  it('emits sections in reading order', () => {
    expect(ids(docFromSolution(SD))).toEqual([
      'approach', 'complexity', 'walkthrough', 'trace', 'tradeoffs', 'edgecases',
    ]);
  });

  it('renders keyPoints as a callout, not prose', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'approach')!;
    const callout = s.blocks.find(b => b.kind === 'callout');
    expect(callout).toEqual({ kind: 'callout', label: 'Key points', items: ['Pointers never cross', 'One pass'] });
  });

  it('renders complexity as a kv strip', () => {
    const s = docFromSolution(SD).sections.find(x => x.id === 'complexity')!;
    expect(s.blocks[0]).toEqual({ kind: 'kv', pairs: [['Time', 'O(n)'], ['Space', 'O(1)']] });
  });

  it('drops sections with no content instead of emitting empty boxes', () => {
    const bare = { solutions: [{ approach: 'x' }] };
    expect(ids(docFromSolution(bare))).toEqual(['approach']);
  });

  it('accepts a pitch that is a bare string', () => {
    const strPitch = { solutions: [{ approach: 'x' }], pitch: 'just a sentence' };
    const s = docFromSolution(strPitch).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'just a sentence' });
  });

  it('selects the requested solution index', () => {
    const two = { solutions: [{ approach: 'first' }, { approach: 'second' }] };
    const s = docFromSolution(two, 1).sections.find(x => x.id === 'approach')!;
    expect(s.blocks).toContainEqual({ kind: 'prose', text: 'second' });
  });

  it('never leaves markdown in a text field', () => {
    const md = { solutions: [{ approach: '**bold** and *ital*' }] };
    const s = docFromSolution(md).sections.find(x => x.id === 'approach')!;
    const prose = s.blocks.find(b => b.kind === 'prose') as { text: string };
    expect(prose.text).not.toMatch(/\*/);
  });
});

describe('docFromBlocks', () => {
  it('maps coding blocks to sections', () => {
    const blocks = [
      { type: 'PROBLEM', content: 'Reverse words.' },
      { type: 'APPROACH', content: 'Split and join.' },
      { type: 'CODE', content: 'print(1)', lang: 'python' },
      { type: 'COMPLEXITY', content: 'Time: O(n)\nSpace: O(n)' },
      { type: 'EDGECASES', content: '- empty\n- single word' },
    ];
    expect(ids(docFromBlocks(blocks))).toEqual(['problem', 'approach', 'code', 'complexity', 'edgecases']);
  });

  it('parses a COMPLEXITY block into kv pairs', () => {
    const doc = docFromBlocks([{ type: 'COMPLEXITY', content: 'Time: O(n)\nSpace: O(1)' }]);
    expect(doc.sections[0].blocks[0]).toEqual({ kind: 'kv', pairs: [['Time', 'O(n)'], ['Space', 'O(1)']] });
  });

  it('covers every design block type the renderer supports', () => {
    const designTypes = [
      'REQUIREMENTS', 'SCALEMATH', 'DEEPDESIGN', 'TRADEOFFS', 'EDGECASES',
      'APIDESIGN', 'DATAMODEL', 'TECHNOLOGIES', 'CLOUDSERVICES', 'FOLLOWUP',
    ];
    const blocks = designTypes.map(type => ({ type, content: 'x' }));
    // Every supported type must produce exactly one section — none silently dropped.
    expect(docFromBlocks(blocks).sections).toHaveLength(designTypes.length);
  });

  it('ignores unknown block types rather than throwing', () => {
    expect(docFromBlocks([{ type: 'WAT', content: 'x' }]).sections).toEqual([]);
  });

  it('drops blocks whose content is whitespace', () => {
    expect(docFromBlocks([{ type: 'APPROACH', content: '   ' }]).sections).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/camora && npx vitest run src/lib/lumora/book-model.test.ts
```

Expected: FAIL — `Failed to resolve import "./book-model"`.

- [ ] **Step 3: Implement the model**

Create `apps/camora/src/lib/lumora/book-model.ts`:

```ts
import type { ParsedBlock } from '@/types';
import { cleanText } from '@/lib/text-utils';

export type BookBlock =
  | { kind: 'prose'; text: string }
  | { kind: 'callout'; label: string; items: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'kv'; pairs: [string, string][] }
  | { kind: 'trace'; rows: { step: number; action: string; state: string }[] }
  | { kind: 'walk'; rows: { line?: number; code?: string; explanation: string }[] };

export type BookSection = { id: string; heading: string; blocks: BookBlock[] };
export type BookDoc = { title?: string; sections: BookSection[] };

/** Heading text per section id. Headings live here, never inside content strings. */
export const SECTION_TITLES: Record<string, string> = {
  problem: 'Problem',
  approach: 'Solution',
  code: 'Code',
  complexity: 'Complexity',
  walkthrough: 'Walkthrough',
  trace: 'Dry-run trace',
  tradeoffs: 'Tradeoffs',
  edgecases: 'Edge cases',
  testcases: 'Test cases',
  followup: 'Follow-up Q&A',
  requirements: 'Requirements',
  scalemath: 'Scale math',
  deepdesign: 'Layer design',
  apidesign: 'API design',
  datamodel: 'Data model',
  technologies: 'Technologies',
  cloudservices: 'Cloud services',
};

const txt = (v: unknown): string => (typeof v === 'string' ? cleanText(v) : '');

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(txt).filter(Boolean) : [];

/** Split a block body into bullet lines, tolerating `-`, `*`, and bare lines. */
const bullets = (content: string): string[] =>
  content
    .split('\n')
    .map(l => cleanText(l.replace(/^\s*[-•]\s*/, '')))
    .filter(Boolean);

/** `Time: O(n)` / `Space: O(1)` → kv pairs. Lines without a colon become bullets. */
const parseKv = (content: string): BookBlock => {
  const pairs: [string, string][] = [];
  const rest: string[] = [];
  for (const raw of content.split('\n')) {
    const line = cleanText(raw.replace(/^\s*[-•]\s*/, ''));
    if (!line) continue;
    const i = line.indexOf(':');
    if (i > 0) pairs.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    else rest.push(line);
  }
  return pairs.length ? { kind: 'kv', pairs } : { kind: 'list', items: rest };
};

/** Append a section only when it has at least one block. */
const push = (out: BookSection[], id: string, blocks: (BookBlock | null)[]) => {
  const kept = blocks.filter(Boolean) as BookBlock[];
  if (kept.length) out.push({ id, heading: SECTION_TITLES[id] ?? id, blocks: kept });
};

const proseOrNull = (v: unknown): BookBlock | null => {
  const t = txt(v);
  return t ? { kind: 'prose', text: t } : null;
};

const listOrNull = (v: unknown): BookBlock | null => {
  const items = strList(v);
  return items.length ? { kind: 'list', items } : null;
};

/** Live Coding: the parsed `jsonSolution` object. */
export function docFromSolution(sd: any, solIdx = 0): BookDoc {
  const sections: BookSection[] = [];
  if (!sd) return { sections };

  const sol = Array.isArray(sd.solutions) ? sd.solutions[solIdx] ?? sd.solutions[0] : null;
  const pitch = sd.pitch;
  const pitchObj = pitch && typeof pitch === 'object' ? pitch : null;
  const pitchStr = typeof pitch === 'string' ? txt(pitch) : '';

  // Solution — narration is the spoken script and reads best; fall back to approach.
  const keyPoints = strList(pitchObj?.keyPoints);
  push(sections, 'approach', [
    proseOrNull(sol?.narration || sol?.approach),
    pitchStr ? { kind: 'prose', text: pitchStr } : proseOrNull(pitchObj?.opener),
    keyPoints.length ? { kind: 'callout', label: 'Key points', items: keyPoints } : null,
  ]);

  const time = txt(sol?.complexity?.time);
  const space = txt(sol?.complexity?.space);
  const pairs: [string, string][] = [];
  if (time) pairs.push(['Time', time]);
  if (space) pairs.push(['Space', space]);
  push(sections, 'complexity', [pairs.length ? { kind: 'kv', pairs } : null]);

  const walk = Array.isArray(sol?.explanations)
    ? sol.explanations
        .map((e: any) => ({ line: e.line, code: e.code, explanation: txt(e.explanation) }))
        .filter((r: any) => r.explanation || r.code)
    : [];
  push(sections, 'walkthrough', [walk.length ? { kind: 'walk', rows: walk } : null]);

  const trace = Array.isArray(sol?.trace)
    ? sol.trace
        .map((r: any) => ({ step: r.step, action: txt(r.action), state: txt(r.state) }))
        .filter((r: any) => r.action || r.state)
    : [];
  push(sections, 'trace', [trace.length ? { kind: 'trace', rows: trace } : null]);

  push(sections, 'tradeoffs', [listOrNull(pitchObj?.tradeoffs)]);
  push(sections, 'edgecases', [listOrNull(pitchObj?.edgeCases)]);

  return { title: txt(sol?.name) || undefined, sections };
}

/** Block types the history renderer supports, in reading order. */
const BLOCK_ORDER = [
  'PROBLEM', 'APPROACH', 'CODE', 'COMPLEXITY', 'WALKTHROUGH',
  'REQUIREMENTS', 'SCALEMATH', 'DEEPDESIGN', 'APIDESIGN', 'DATAMODEL',
  'TECHNOLOGIES', 'CLOUDSERVICES', 'TRADEOFFS', 'EDGECASES', 'TESTCASES', 'FOLLOWUP',
] as const;

/** Saved sessions: the tag-block array. */
export function docFromBlocks(blocks: ParsedBlock[]): BookDoc {
  const byType: Record<string, ParsedBlock> = {};
  for (const b of blocks || []) {
    if (b && typeof b.content === 'string' && b.content.trim()) byType[b.type] = b;
  }

  const sections: BookSection[] = [];
  for (const type of BLOCK_ORDER) {
    const b = byType[type];
    if (!b) continue;
    const id = type.toLowerCase();
    const body = b.content;

    if (type === 'CODE') {
      push(sections, id, [{ kind: 'code', lang: b.lang || 'python', code: body }]);
    } else if (type === 'COMPLEXITY') {
      push(sections, id, [parseKv(body)]);
    } else if (type === 'WALKTHROUGH') {
      const rows = bullets(body).map(explanation => ({ explanation }));
      push(sections, id, [rows.length ? { kind: 'walk', rows } : null]);
    } else if (type === 'PROBLEM' || type === 'APPROACH') {
      push(sections, id, [proseOrNull(body)]);
    } else {
      const items = bullets(body);
      push(sections, id, [items.length ? { kind: 'list', items } : null]);
    }
  }
  return { sections };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/camora && npx vitest run src/lib/lumora/book-model.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/lib/lumora/book-model.ts apps/camora/src/lib/lumora/book-model.test.ts
git commit -m "feat(lumora): add BookDoc answer model shared by live and history"
```

---

### Task 2: The `.lumora-book` stylesheet

**Files:**
- Modify: `apps/camora/src/styles/globals.css` (append a new block; do not edit `.prep-content` rules)

**Interfaces:**
- Produces: classes `.lumora-book`, `.lumora-book-section`, `.lumora-book-sub`, `.lumora-book-label`, `.lumora-book-callout`, `.lumora-book-breakout`.

The three-tier scale already exists for `.prep-content.flex-1` (Fraunces section → Fraunces subsection → IBM Plex Mono micro-label) and the accent pull-quote rule. Mirror it under a new class so prep pages cannot regress.

- [ ] **Step 1: Append the block to `globals.css`**

```css
/* ── Lumora answer book ───────────────────────────────────────────────────
   A single reading column for Coding / CoFix / saved-session answers,
   replacing the old multi-box GridCard grids. Mirrors the .prep-content
   three-tier heading scale, scoped to its own class so prep is untouched.
   One scroll lives on the column — never on individual sections. */
.lumora-book {
  max-width: 68ch;
  margin-inline: auto;
  padding: 1.25rem 1.5rem 2.5rem;
}

/* Tier 1 — section heading */
.lumora-book-section {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--accent-text);
  margin: 2.25rem 0 0.9rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
}
.lumora-book-section:first-child { margin-top: 0; }

/* Tier 2 — subsection */
.lumora-book-sub {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 1.4rem 0 0.5rem;
}

/* Tier 3 — micro-label */
.lumora-book-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-text);
  margin: 1.2rem 0 0.4rem;
}

/* Highlighted key points — a book-style aside with an accent rule. */
.lumora-book-callout {
  border-left: 2px solid var(--accent);
  padding: 0.2rem 0 0.2rem 1.1rem;
  margin: 1.25rem 0;
  color: var(--text-primary);
}

/* Code, traces and diagrams break out wider than the text measure. */
.lumora-book-breakout {
  width: min(100%, calc(68ch + 6rem));
  margin-inline: calc(50% - min(50%, calc(34ch + 3rem)));
}

.lumora-book p { line-height: 1.75; color: var(--text-primary); }
.lumora-book li { line-height: 1.7; }
```

- [ ] **Step 2: Verify no `.prep-content` rule was touched**

```bash
git diff -- apps/camora/src/styles/globals.css | grep -c '^-' 
```

Expected: `0` — the change is purely additive.

- [ ] **Step 3: Verify the build compiles the CSS**

```bash
cd apps/camora && npx vite build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/camora/src/styles/globals.css
git commit -m "feat(lumora): add .lumora-book reading-column styles"
```

---

### Task 3: The `AnswerBook` renderer

**Files:**
- Create: `apps/camora/src/components/lumora/shared/book/AnswerBook.tsx`
- Create: `apps/camora/src/components/lumora/shared/book/AnswerBook.test.tsx`

**Interfaces:**
- Consumes: `BookDoc`, `BookBlock` from `@/lib/lumora/book-model`.
- Produces: `<AnswerBook doc={BookDoc} onLineHover?={(line?: number) => void} onLineClick?={(line: number) => void} />`

`onLineHover` / `onLineClick` carry the existing Coding line-binding. They are optional so history can omit them.

- [ ] **Step 1: Write the failing test**

Create `apps/camora/src/components/lumora/shared/book/AnswerBook.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerBook } from './AnswerBook';
import type { BookDoc } from '@/lib/lumora/book-model';

const doc: BookDoc = {
  sections: [
    { id: 'approach', heading: 'Solution', blocks: [
      { kind: 'prose', text: 'Two pointers converge.' },
      { kind: 'callout', label: 'Key points', items: ['One pass'] },
    ]},
    { id: 'complexity', heading: 'Complexity', blocks: [
      { kind: 'kv', pairs: [['Time', 'O(n)']] },
    ]},
  ],
};

describe('AnswerBook', () => {
  it('renders one column, not one card per section', () => {
    const { container } = render(<AnswerBook doc={doc} />);
    expect(container.querySelectorAll('.lumora-book')).toHaveLength(1);
  });

  it('renders section headings as tier-1 headings', () => {
    render(<AnswerBook doc={doc} />);
    expect(screen.getByRole('heading', { name: 'Solution' })).toHaveClass('lumora-book-section');
  });

  it('renders a callout with its label and items', () => {
    render(<AnswerBook doc={doc} />);
    expect(screen.getByText('Key points')).toBeTruthy();
    expect(screen.getByText('One pass')).toBeTruthy();
  });

  it('renders kv pairs', () => {
    render(<AnswerBook doc={doc} />);
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('O(n)')).toBeTruthy();
  });

  it('creates no nested scroll containers', () => {
    const { container } = render(<AnswerBook doc={doc} />);
    expect(container.querySelectorAll('.overflow-y-auto')).toHaveLength(0);
  });

  it('renders nothing for an empty doc', () => {
    const { container } = render(<AnswerBook doc={{ sections: [] }} />);
    expect(container.querySelector('.lumora-book')?.children.length ?? 0).toBe(0);
  });
});
```

`@testing-library/react` is not yet a dependency. Add it in Step 2.

- [ ] **Step 2: Add the test dependency**

```bash
cd apps/camora && pnpm add -D @testing-library/react @testing-library/jest-dom
```

Then create `apps/camora/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

And add `setupFiles` to the `test` block in `apps/camora/vite.config.ts`:

```ts
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd apps/camora && npx vitest run src/components/lumora/shared/book/AnswerBook.test.tsx
```

Expected: FAIL — `Failed to resolve import "./AnswerBook"`.

- [ ] **Step 4: Implement the renderer**

Create `apps/camora/src/components/lumora/shared/book/AnswerBook.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import type { BookBlock, BookDoc } from '@/lib/lumora/book-model';

type Props = {
  doc: BookDoc;
  onLineHover?: (line?: number) => void;
  onLineClick?: (line: number) => void;
};

const CodeBlock = ({ lang, code }: { lang: string; code: string }) => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (ref.current) hljs.highlightElement(ref.current); }, [code, lang]);
  return (
    <div className="lumora-book-breakout my-4 rounded-lg overflow-hidden border border-[var(--border)]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent-text)]">{lang}</span>
        <button
          className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-3 m-0">
        <code ref={ref} className={`language-${lang} text-[13px] leading-relaxed`}>{code}</code>
      </pre>
    </div>
  );
};

const Block = ({ block, onLineHover, onLineClick }: { block: BookBlock } & Omit<Props, 'doc'>) => {
  switch (block.kind) {
    case 'prose':
      return <p className="mb-3">{block.text}</p>;

    case 'callout':
      return (
        <div className="lumora-book-callout">
          <div className="lumora-book-label !mt-0">{block.label}</div>
          <ul className="space-y-1">
            {block.items.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
      );

    case 'list':
      return (
        <ul className="list-disc pl-5 space-y-1 mb-3">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );

    case 'code':
      return <CodeBlock lang={block.lang} code={block.code} />;

    case 'kv':
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
          {block.pairs.map(([k, v]) => (
            <span key={k} className="flex items-baseline gap-2">
              <span className="lumora-book-label !my-0">{k}</span>
              <span className="font-mono text-[13px] text-[var(--text-primary)]">{v}</span>
            </span>
          ))}
        </div>
      );

    case 'trace':
      return (
        <div className="lumora-book-breakout my-3 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 pr-3 font-mono text-[var(--accent-text)] align-top">{r.step}</td>
                  <td className="py-1.5 pr-3 align-top">{r.action}</td>
                  <td className="py-1.5 font-mono text-[var(--text-muted)] align-top">{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'walk':
      return (
        <div className="my-3">
          {block.rows.map((r, i) => (
            <div
              key={i}
              className="py-2 border-b border-[var(--border)] last:border-0"
              style={r.line != null ? { cursor: 'pointer' } : undefined}
              onMouseEnter={() => r.line != null && onLineHover?.(r.line)}
              onMouseLeave={() => onLineHover?.(undefined)}
              onClick={() => r.line != null && onLineClick?.(r.line)}
            >
              {(r.line != null || r.code) && (
                <div className="flex items-center gap-2 mb-1">
                  {r.line != null && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-text)] shrink-0">
                      L{r.line}
                    </span>
                  )}
                  {r.code && <code className="font-mono text-[12px] text-[var(--text-muted)] truncate">{r.code}</code>}
                </div>
              )}
              <span className="text-[13px] leading-relaxed">{r.explanation}</span>
            </div>
          ))}
        </div>
      );
  }
};

export const AnswerBook = ({ doc, onLineHover, onLineClick }: Props) => (
  <div className="lumora-book">
    {doc.sections.map(section => (
      <section key={section.id}>
        <h2 className="lumora-book-section">{section.heading}</h2>
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} onLineHover={onLineHover} onLineClick={onLineClick} />
        ))}
      </section>
    ))}
  </div>
);
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd apps/camora && npx vitest run src/components/lumora/shared/book/AnswerBook.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/lumora/shared/book/ apps/camora/src/test-setup.ts apps/camora/vite.config.ts apps/camora/package.json ../../pnpm-lock.yaml
git commit -m "feat(lumora): add AnswerBook book-style answer renderer"
```

---

### Task 4: Convert the saved-session views

`AnswerBlocks.tsx` is currently clean in the main checkout, so this is the safest conversion and validates the model against real history data.

**Files:**
- Modify: `apps/camora/src/components/lumora/session/AnswerBlocks.tsx` — replace the bodies of `CodingView` and `SystemDesignView`

**Interfaces:**
- Consumes: `docFromBlocks` (Task 1), `AnswerBook` (Task 3).
- Produces: nothing new.

**Preserve:** `GridCard`, `BehavioralView`, `RichContent`, and the `ArchitectureCard` diagram in `SystemDesignView`.

- [ ] **Step 1: Replace `CodingView`'s body**

Find `const CodingView = ` and replace the whole component with:

```tsx
const CodingView = ({ blocks, question }: { blocks: ParsedBlock[]; question?: string }) => {
  const withQuestion = useMemo(() => {
    const hasProblem = blocks.some(b => b.type === 'PROBLEM');
    return hasProblem || !question
      ? blocks
      : [{ type: 'PROBLEM', content: question }, ...blocks];
  }, [blocks, question]);

  return <AnswerBook doc={docFromBlocks(withQuestion)} />;
};
```

- [ ] **Step 2: Replace `SystemDesignView`'s body**

Find `const SystemDesignView = ` and replace with:

```tsx
const SystemDesignView = ({ blocks, question }: { blocks: ParsedBlock[]; question?: string }) => (
  <div className="flex flex-col gap-3">
    {question && <ArchitectureCard question={question} />}
    <AnswerBook doc={docFromBlocks(blocks)} />
  </div>
);
```

- [ ] **Step 3: Add the imports**

At the top of `AnswerBlocks.tsx`:

```tsx
import { useMemo } from 'react';
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromBlocks } from '@/lib/lumora/book-model';
```

- [ ] **Step 4: Remove the now-orphaned renderers**

Delete these, which no longer have callers. Verify each with grep before deleting:

```bash
cd apps/camora
for s in ComplexityList WalkthroughList TestCasesList EdgeCasesList TradeoffsList \
         RequirementsList ScaleMathList DeepDesignList SimpleLinesList FollowupList EmptyBlock; do
  echo "$s: $(grep -c "<$s" src/components/lumora/session/AnswerBlocks.tsx) usages"
done
```

Delete only those reporting `0` usages. `GridCard`, `RichContent`, `parseRichContent`, `RichTable`, `Shimmer`, and `ArchitectureCard` are still used by `BehavioralView` / `SystemDesignView` — keep them. If `FollowupList` is still used by `BehavioralView`, keep it.

- [ ] **Step 5: Verify the build and the whole suite**

```bash
cd apps/camora && npx eslint src/components/lumora/session/AnswerBlocks.tsx && npx vitest run && npx vite build
```

Expected: no lint errors, all tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/lumora/session/AnswerBlocks.tsx
git commit -m "refactor(lumora): render saved coding + design sessions as a book"
```

---

### Task 5: Convert the live Coding answer panel

**Files:**
- Modify: `apps/camora/src/components/lumora/coding/CodingLayout.tsx`

**Interfaces:**
- Consumes: `docFromSolution` (Task 1), `AnswerBook` (Task 3).

**Preserve:** the solution-tab pill row, the MCQ branch, the analysis-tab bar and its content card, the cache-status row, the error-retry card, the streaming skeleton, `highlightLine` / `clearHighlight`.

- [ ] **Step 1: Add the imports**

```tsx
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromSolution, docFromBlocks } from '@/lib/lumora/book-model';
```

- [ ] **Step 2: Replace the JSON card stack**

Locate the branch gated by `analysisTab === 'code' && sd && !isMcqAnswer`, whose container is `<div className="space-y-3 solution-cards-appear">`. Keep the solution-tab pill row that opens it. Replace every card after the pill row — the End-to-End Approach card, the Active Solution Approach card (including its nested dry-run trace), the Overall Pitch card, the Tradeoffs card, the Edge Cases card, and the Code Walkthrough card — with:

```tsx
<AnswerBook
  doc={docFromSolution(sd, activeSolutionIdx)}
  onLineHover={(line) => (line == null ? clearHighlight() : highlightLine(line))}
  onLineClick={(line) => highlightLine(line)}
/>
```

- [ ] **Step 3: Replace the legacy block branch**

Locate `{!sd && parsedBlocks && Array.isArray(parsedBlocks) && parsedBlocks.length > 0 && (` and replace the `<LegacySolutionCards ... />` element with:

```tsx
<AnswerBook doc={docFromBlocks(parsedBlocks)} />
```

- [ ] **Step 4: Delete `LegacySolutionCards` and the collapse state**

```bash
cd apps/camora
grep -n "LegacySolutionCards\|collapsedCards\|openSection" src/components/lumora/coding/CodingLayout.tsx
```

Delete the `function LegacySolutionCards(...)` definition, the `collapsedCards` / `setCollapsedCards` `useState`, and the `openSection` / `setOpenSection` `useState`. Remove the chevron `<svg>` toggles that referenced `openSection`.

Re-run the grep. Expected: no matches.

**Note on `onTestCaseClick`:** `LegacySolutionCards` passed parsed test-case rows up via `onTestCaseClick`, which fills the test-case inputs. `AnswerBook` has no such hook. Preserve the behaviour by leaving that handler in place and wiring it from the `testcases` section, or — if the interactive test-case rows are wanted — keep rendering them outside the book column. Do not silently drop it.

- [ ] **Step 5: Verify**

```bash
cd apps/camora && npx eslint src/components/lumora/coding/CodingLayout.tsx && npx vite build
```

Expected: no lint errors, build succeeds. The file should be roughly 450 lines shorter.

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/lumora/coding/CodingLayout.tsx
git commit -m "refactor(lumora): render the live Coding answer as a book"
```

---

### Task 6: Convert the CoFix annotation panel and Problem/Learn tabs

**Files:**
- Modify: `apps/camora/src/components/lumora/cofix/AnnotationPanel.tsx`
- Modify: `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx`
- Modify: `apps/camora/src/lib/lumora/book-model.ts` (add `docFromCoFix`)
- Modify: `apps/camora/src/lib/lumora/book-model.test.ts`

**Interfaces:**
- Produces: `docFromCoFix(answer: { changes; walkthrough }, analysis?: Analysis): BookDoc`

**Preserve:** the `BROKEN | FIXED` Monaco panes, the Tests tab, the Output tab, the complexity strip, the streaming log popup, the refine modal.

- [ ] **Step 1: Write the failing test**

Append to `book-model.test.ts`:

```ts
import { docFromCoFix } from './book-model';

describe('docFromCoFix', () => {
  it('maps changes and walkthrough to sections', () => {
    const doc = docFromCoFix({
      changes: [{ line: 3, type: 'fix', badge: '1', label: 'Off-by-one', note: 'Use <=' }],
      walkthrough: [{ lines: '3-4', context: 'loop', text: 'Bounds corrected.' }],
    });
    expect(doc.sections.map(s => s.id)).toEqual(['walkthrough', 'changes']);
  });

  it('prepends analysis sections when analysis is supplied', () => {
    const doc = docFromCoFix(
      { changes: [], walkthrough: [] },
      { title: 'Two Sum', problem: 'Find a pair.', concepts: ['Hash Map'], steps: [], examples: [] } as any,
    );
    expect(doc.sections.map(s => s.id)).toEqual(['problem', 'concepts']);
  });

  it('returns no sections for an empty answer', () => {
    expect(docFromCoFix({ changes: [], walkthrough: [] }).sections).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd apps/camora && npx vitest run src/lib/lumora/book-model.test.ts
```

Expected: FAIL — `docFromCoFix is not a function`.

- [ ] **Step 3: Implement `docFromCoFix`**

Append to `book-model.ts`, and add `changes: 'Changes'`, `concepts: 'Concepts'`, `steps: 'Step by step'` to `SECTION_TITLES`:

```ts
export function docFromCoFix(
  answer: { changes?: any[]; walkthrough?: any[] },
  analysis?: { title?: string; problem?: string; concepts?: string[]; steps?: { code?: string; text?: string }[] },
): BookDoc {
  const sections: BookSection[] = [];

  if (analysis) {
    push(sections, 'problem', [proseOrNull(analysis.problem)]);
    push(sections, 'concepts', [listOrNull(analysis.concepts)]);
    const steps = (analysis.steps || [])
      .map(s => ({ code: s.code, explanation: txt(s.text) }))
      .filter(s => s.explanation || s.code);
    push(sections, 'steps', [steps.length ? { kind: 'walk', rows: steps } : null]);
  }

  const walk = (answer.walkthrough || [])
    .map((w: any) => ({
      explanation: [txt(w.context) && `(${txt(w.context)})`, txt(w.text)].filter(Boolean).join(' '),
      code: typeof w.lines === 'string' ? `L${w.lines}` : undefined,
    }))
    .filter((r: any) => r.explanation);
  push(sections, 'walkthrough', [walk.length ? { kind: 'walk', rows: walk } : null]);

  const changes = (answer.changes || [])
    .map((c: any) => [txt(c.label), txt(c.note)].filter(Boolean).join(' — '))
    .filter(Boolean);
  push(sections, 'changes', [changes.length ? { kind: 'list', items: changes } : null]);

  return { title: txt(analysis?.title) || undefined, sections };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd apps/camora && npx vitest run src/lib/lumora/book-model.test.ts
```

Expected: PASS.

- [ ] **Step 5: Rewrite `AnnotationPanel`**

Replace the whole component body with:

```tsx
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromCoFix } from '@/lib/lumora/book-model';

export default function AnnotationPanel({ changes, walkthrough }: { changes: any[]; walkthrough: any[] }) {
  return (
    <div className="w-full h-full overflow-y-auto border-l border-[var(--cam-gold-leaf-dk)]">
      <AnswerBook doc={docFromCoFix({ changes, walkthrough })} />
    </div>
  );
}
```

Delete `inlineFormat` — the structural callout path replaces it. Verify it has no other caller:

```bash
grep -rn "inlineFormat" apps/camora/src
```

Expected: no matches after deletion.

- [ ] **Step 6: Convert the Problem and Learn drawer tabs**

In `CoFixLayout.tsx`, replace the Problem tab body (the title/problem prose, the Input/Output format cards, and the Examples rows) and the Learn tab body (the concept pills, the "Why this approach" card, and the step cards) with:

```tsx
<div className="h-full overflow-y-auto">
  <AnswerBook doc={docFromCoFix({ changes, walkthrough }, analysis)} />
</div>
```

Render it in the Problem tab. Leave the Tests and Output tabs untouched.

**Note:** the Problem tab's Input/Output format and Examples have no `BookBlock` equivalent yet. Add them as a `kv` block (`Input format` / `Output format`) and a `list` block of `input → output` strings inside `docFromCoFix`, with tests, rather than dropping them.

- [ ] **Step 7: Verify**

```bash
cd apps/camora && npx eslint src/components/lumora/cofix/ && npx vitest run && npx vite build
```

Expected: no lint errors, all tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/camora/src/components/lumora/cofix/ apps/camora/src/lib/lumora/book-model.ts apps/camora/src/lib/lumora/book-model.test.ts
git commit -m "refactor(lumora): render CoFix annotations and analysis as a book"
```

---

### Task 7: Verify in the real app, then merge back

- [ ] **Step 1: Run the full suite and build**

```bash
cd apps/camora && npx vitest run && npx vite build
```

Expected: all green.

- [ ] **Step 2: Drive the app and observe each surface**

Use the `verify` skill, or run the dev server in the worktree and exercise:
- Live Coding: solve a problem → one column, one scrollbar, headings render, hovering a walkthrough row highlights the Monaco line.
- Live Coding MCQ: the verdict block still stands out.
- Saved coding session: reopen from `/lumora/sessions` → sections match the live view; edge cases and test cases are present.
- Saved design session: `APIDESIGN` / `DATAMODEL` / `TECHNOLOGIES` / `CLOUDSERVICES` sections all render.
- CoFix: run a fix → annotation panel and Problem tab read as prose; the two editors are untouched.
- Behavioral answer: still renders as `GridCard`s, unchanged.
- Toggle light/dark: dark is navy-gold, light is blue-only.

- [ ] **Step 3: Confirm the main checkout has settled before merging**

```bash
cd /Users/chundu/camora && git status --porcelain | wc -l
```

If non-zero, the other session is still working. **Stop and ask the user** before merging. Do not merge into a dirty tree.

- [ ] **Step 4: Merge back to main and clean up**

```bash
cd /Users/chundu/camora
git pull
git merge --no-ff feat/answer-book
cd .. && git worktree remove camora-book
```

- [ ] **Step 5: Ask the user before pushing**

Per project convention, do not push without explicit approval. Report what landed and ask.

---

## Self-Review

**Spec coverage.** Shared model → Task 1. `.lumora-book` styles → Task 2. Primitives → Task 3. Structural highlighting (callout from `keyPoints`) → Tasks 1 and 3. Per-surface wiring: history → Task 4, Coding → Task 5, CoFix → Task 6. Preservation of `GridCard`/MCQ/line-binding → constraints, plus Tasks 4–6. Worktree isolation → Task 0. Build gate → every task's verify step.

**Known gaps carried as explicit sub-steps, not silent drops:**
- `onTestCaseClick` (Task 5, Step 4 note) — the clickable test-case rows have no book equivalent; the plan requires deciding, not dropping.
- CoFix Input/Output format and Examples (Task 6, Step 6 note) — must be added to `docFromCoFix` as `kv` + `list` blocks with tests.
- The spec's "identical section ids from both normalizers" invariant is weakened, correctly: `docFromSolution` and `docFromBlocks` read different sources with different fields. The enforced invariant is instead **no supported field is silently dropped** (Task 1's `covers every design block type` test).

**Type consistency.** `docFromSolution(sd, solIdx)`, `docFromBlocks(blocks)`, `docFromCoFix(answer, analysis?)` all return `BookDoc`. `AnswerBook` consumes `BookDoc` and the optional `onLineHover(line?: number)` / `onLineClick(line: number)`. `BookBlock.kind` values — `prose` / `callout` / `list` / `code` / `kv` / `trace` / `walk` — are used consistently in the model, the renderer's `switch`, and every test.
