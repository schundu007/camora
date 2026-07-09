# Lumora Answer Book Layout

**Date:** 2026-07-09
**Status:** Approved (design)
**Supersedes:** the *accordion* section of `2026-07-08-lumora-layout-redesign-design.md` (B1).
B1's other goals — line binding, deleting the duplicated per-line code cards, and
decomposing `CodingLayout.tsx` — are retained and folded into this work.

## Problem

The Lumora answer surfaces render as a field of bordered, tinted boxes. Reading an
answer means parsing chrome before content.

| Surface | Boxes | Structure |
|---|---|---|
| Coding (live) | 7 collapsible cards + 3 MCQ cards | `space-y-3 solution-cards-appear` stack in `CodingLayout` |
| CoFix (live) | ~10 across 3 regions | Allotment 3-pane + bottom tab drawer |
| History — coding | 7 `GridCard`s | 2-col grid in `AnswerBlocks` → `CodingView` |
| History — design | 12 `GridCard`s | nested 2-col grids in `AnswerBlocks` → `SystemDesignView` |

> **Anchors are symbol names, not line numbers.** These files are under concurrent
> edit; line numbers drift within minutes. Locate by symbol.

Two failures compound:

1. **Chrome-to-content ratio.** Every semantic section pays for a border, a tinted
   background, a caps header, and an icon. A two-line complexity note costs the same
   frame as a thirty-line walkthrough.
2. **Nested scroll traps.** Each `GridCard` body carries `overflow-y-auto` with
   `max-h-[420px]` (or `max-h-[280px]` when `compact`). Seven independent scrollers on
   one screen means content is hidden inside boxes that give no indication they scroll.

Underneath both: **the four surfaces share zero rendering code.** Coding derives its
sections from `sd` (the `jsonSolution` object); history derives them from
`ParsedBlock[]` tag blocks. The same answer is parsed twice, differently. That
divergence is the direct cause of the recently-fixed "saved coding sessions render
empty edge-case and test-case cards" bug — history dropped fields the live path kept.

## Goals

- One reading surface per answer: a single card, top-to-bottom, all sections expanded.
- A deliberate heading hierarchy so sections and subsections read as distinct levels.
- Important points highlighted **structurally**, from data, never by markdown injection.
- One answer→sections mapping shared by live and history, so the two cannot drift.

## Non-goals

- Behavioral answers. `BehavioralView` keeps its `GridCard`s; `GridCard` therefore stays.
- The CoFix Monaco editors. They are the working surface, not prose.
- The CoFix Tests and Output drawer tabs. Those are inputs and logs, not reading.

---

## Architecture

### 1. The shared answer model

A single normalizer is the load-bearing piece. It is the reason this redesign also
fixes the live/history divergence rather than re-encoding it in a new skin.

```ts
// apps/camora/src/lib/lumora/book-model.ts
export type BookBlock =
  | { kind: 'prose';   text: string }
  | { kind: 'callout'; label: string; items: string[] }      // highlighted key points
  | { kind: 'list';    items: string[] }
  | { kind: 'code';    lang: string; code: string }
  | { kind: 'kv';      pairs: [string, string][] }           // complexity strip
  | { kind: 'trace';   rows: { step: string; action: string; state: string }[] }
  | { kind: 'walk';    rows: { line?: number; code?: string; explanation: string }[] }

export type BookSection = { id: string; heading: string; blocks: BookBlock[] }
export type BookDoc = { title?: string; sections: BookSection[] }

export function docFromSolution(sd: unknown): BookDoc      // live Coding JSON
export function docFromBlocks(blocks: ParsedBlock[]): BookDoc  // history tag blocks
export function docFromCoFix(answer: CoFixAnswer, analysis?: Analysis): BookDoc
```

Empty sections are dropped by the normalizer, not by the renderer. A section that has
no blocks does not exist, so `EmptyBlock` placeholders disappear along with the boxes.

### 2. Presentation primitives

`apps/camora/src/components/lumora/shared/book/` — one bordered card containing one
reading column that scrolls **once**, at the column.

| Primitive | Renders |
|---|---|
| `<AnswerBook doc>` | the card + column; maps sections → `<Section>` |
| `<Section>` | Tier-1 heading, Fraunces 2rem, accent, hairline rule beneath |
| `<Subsection>` | Tier-2 heading, Fraunces 1.4rem, neutral |
| `<MicroLabel>` | Tier-3, IBM Plex Mono 0.75rem, uppercase, accent |
| `<Callout>` | accent left rule — the highlight treatment |
| `<BookCode>` | breaks out wider than the text measure; keeps hljs + copy button |
| `<Trace>` / `<Walk>` | borderless tables, hairline row rules |

Styling lives in a **new `.lumora-book` block** in `globals.css`, mirroring the
existing three-tier scale at `globals.css:1121–1160` and the pull-quote rule at
`:1037`. Scoping a new class rather than widening `.prep-content.flex-1` means prep
pages cannot regress.

Per the project's token rules: navy-gold in dark, blue-only in light. The existing
`--accent` overrides handle this; the book block introduces no new colour tokens.

### 3. Highlighting is structural

`pitch.keyPoints[]`, `pitch.tradeoffs[]`, and `pitch.edgeCases[]` are already discrete
arrays on the answer object. They map to `callout` and `list` blocks directly.

No `**bold**` is ever written into a content string. Several render paths emit markdown
literally, and `cleanText()` in `lib/text-utils.ts` strips `*` and deletes whole
`#`-heading lines — so a heading smuggled into prose is silently destroyed. Headings
come from `BookSection.heading`, never from the text.

### 4. Per-surface wiring

**Coding** (`CodingLayout.tsx`)
- Replace the JSON card stack (the `analysisTab === 'code'` branch, container
  `div.space-y-3.solution-cards-appear`) with `<AnswerBook doc={docFromSolution(sd)} />`.
- Delete `LegacySolutionCards` — `docFromBlocks` subsumes it.
- Delete the now-unreachable collapse state: `collapsedCards` and `openSection`, plus
  their chevron `<svg>` toggles.
- The MCQ branch (`isMcqAnswer`) keeps a distinct highlighted verdict block. Folding a
  right/wrong answer into flat prose would bury it.
- Preserve hover-to-highlight-line on walkthrough rows (`highlightLine` / `clearHighlight`).

**History** (`AnswerBlocks.tsx`)
- `CodingView` and `SystemDesignView` render `<AnswerBook>`.
- `GridCard` survives for `BehavioralView`.
- The list renderers (`ComplexityList`, `WalkthroughList`, `TestCasesList`,
  `EdgeCasesList`, `TradeoffsList`, `RequirementsList`, `ScaleMathList`,
  `DeepDesignList`, `SimpleLinesList`) collapse into `BookBlock` kinds. `RichContent`
  is retained for inline prose formatting.
- `SystemDesignView` recently gained `APIDESIGN` / `DATAMODEL` / `TECHNOLOGIES` /
  `CLOUDSERVICES` cards. `docFromBlocks` must cover all of them, or the redesign
  silently drops sections that were just fixed.

**CoFix** (`CoFixLayout.tsx`, `AnnotationPanel.tsx`)
- The `BROKEN | FIXED` Monaco panes are untouched.
- `AnnotationPanel` (walkthrough + changes) renders `<AnswerBook>` sections.
- The Problem and Learn drawer tabs become `<AnswerBook>` sections.
- The Tests and Output drawer tabs keep their interactive cards.
- `inlineFormat` in `AnnotationPanel.tsx` parses `**bold**`; it is replaced by the
  structural callout path.

---

## Geometry

The live Coding answer column is **42% of the viewport**, resizable (the
`.coding-left-panel` rule in `globals.css`) — not the 380px B1 assumed. At typical
widths that is a 500–700px reading measure: narrower than the 66rem prep column, but a
legitimate book column.

Prose wraps to the measure. Code, the trace table, and diagrams break out wider, as
they do in `.prep-content`. The width lives on the **column**, never on `<p>` — putting
a max-width on paragraphs is what previously produced half-width left-aligned text.

---

## Error handling

- A malformed or partially-streamed answer yields a `BookDoc` with whatever sections
  parsed. Missing sections are absent, not empty-boxed.
- `docFromSolution` and `docFromBlocks` must agree: a fixture answer passed through both
  produces the same section ids and block kinds. This is the regression guard against
  the empty-history-cards bug class.
- Streaming keeps its existing skeleton state; `AnswerBook` renders sections as they
  arrive, appending rather than reflowing.

## Testing

- Unit: `book-model.test.ts` — `docFromSolution` and `docFromBlocks` over a shared
  fixture produce identical section ids; empty inputs produce zero sections; a `pitch`
  that is a bare string and one that is an object both normalize.
- Unit: no `BookBlock` text field contains `**` or a leading `#` after normalization.
- Visual: live Coding, saved coding session, saved design session, CoFix annotation
  panel — one scrollbar per answer, no nested `overflow-y-auto`.
- `npx vite build` must pass before push (project rule: full build, not grep-filtered tsc).

## Risks

- **Scroll length.** All-expanded means a long multi-solution answer is a long scroll.
  Accepted knowingly. The solution-tab pill row still renders one solution at a time.
- **Visual change.** Coding's answer column narrows to a reading measure; today's cards
  are full-bleed.
- **File size.** `CodingLayout.tsx` is ~3,600 lines. Extracting `AnswerBook` removes
  ~450 lines of inline card JSX and is the first real step toward B1's decomposition
  goal, but does not complete it.

- **Concurrent edits (blocking).** At the time of writing, another session holds
  uncommitted changes to `CodingLayout.tsx` and `CoFixLayout.tsx`, and has landed five
  `fix(lumora)` batches touching `AnswerBlocks.tsx`. All windows share one HEAD and one
  working tree, so implementing this in-place risks clobbering that work. Implementation
  must either wait for that tree to settle, or run in a dedicated `git worktree`.
