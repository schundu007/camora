# Project B — Coding / CoFix / Design Layout Redesign

**Date:** 2026-07-08
**Status:** Approved (design)
**Depends on:** Project D (dead controls removed first)

## Problem

Screenshots of the embedded Coding and CoFix surfaces show the same failure:
**the editor — the thing the user is actually looking at — gets under a third of
the viewport**, while auxiliary content and empty placeholders take the rest.

### Coding

The left panel is six stacked bordered cards, each with its own caps header and
icon: `FRESH SOLVE` → solution card → three per-line code cards →
`SAY THIS OUT LOUD` → `DRY-RUN TRACE` → `TRADEOFFS` → `EDGE CASES`.
Chrome-to-content ratio is roughly 1:1.

Three specific failures:

1. **The code is on screen twice** — full source in Monaco, and exploded
   line-by-line on the left. A 3-line solution renders 3 bordered cards to
   explain 3 lines.
2. **Explanations stack under their code**, violating the project's
   card-side-by-side rule. `words = s.split()` is 16 characters; its caption
   wraps beneath it, leaving the card's right half empty.
3. **The test log accumulates** — `0/3 Passed` / `3/3 Passed` / `3/3 Passed` as
   three full-width rows, with the chat FAB overlapping them.

Note: Coding's `<header>` (timer, Back) is suppressed when `embedded`. What
appears at top-left in the shell is `ScreenshotStrip` injected as
`captureControls` — shared chrome pushed into a tool that needs little of it.

### CoFix

**~40% of the viewport renders nothing.** A third pane right of `FIXED CODE`
with no header and no content; three bottom panels (`PROBLEM`, `TESTS`,
`OUTPUT`) all reading "Run CoFix first". The toolbar carries eight controls, two
of which (`Filter On`, `Remove Enrollment`) belong to speaker verification —
removed by Project D.

---

## Architecture

`CodingLayout.tsx` is **3,467 lines**; `CoFixLayout.tsx` is **1,612**.
Restructuring one file's entire left panel at that size is how regressions enter.
Decomposition is part of the work:

```
coding/
  CodingLayout.tsx          shell + state            (~300 lines, from 3,467)
  panel/SolutionPanel.tsx   accordion host
  panel/WhyList.tsx         line-bound explanations
  panel/NarrationCard.tsx · TraceTable.tsx · TradeoffsList.tsx · EdgeCasesList.tsx
shared/
  Accordion.tsx             chevron sections, one-open
  BottomDrawer.tsx          tabbed, collapsible
  ChipSelect.tsx            chip that shows its value and opens a menu
  PrereqStrip.tsx           prerequisite chips + readiness
  ReadinessChip.tsx         ▲ N
  useLineBinding.ts         Monaco ↔ panel two-way sync
  useToolReadiness.ts       per-tool checks
```

`useLineBinding` and `useToolReadiness` are the only genuinely new logic.
Everything else moves existing JSX behind a chevron.

---

## Geometry

Editor goes from ~⅓ of the viewport to ~⅔.

```
┌─rail─┬── SOLUTION PANEL (380px, resizable) ──┬─── EDITOR (hero) ──────────┐
│  ⌘   │ [CODE][EXPLAIN][ISSUES][DEEP DIVE]    │ Python 3 ▾  ▶Run   →CoFix  │
│      ├──────────────────────────────────────┤├───────────────────────────┤
│      │ ▾ WHY                    O(n) · O(n) ││ 1 def reverseWords(s):     │
│      │    1  signature                      ││ 2   words = s.split()   ◄──┤
│      │    2  splits on whitespace  ◄────────┼┤ 3   return ' '.join(...)   │
│      │    3  reverse + rejoin               ││                            │
│      │ ▸ SAY THIS OUT LOUD                  ││                            │
│      │ ▸ DRY-RUN TRACE              5 steps ││                            │
│      │ ▸ TRADEOFFS                        2 │├───────────────────────────┤
│      │ ▸ EDGE CASES                       3 ││ ▾ TESTS 3/3 · OUTPUT   ⌃⌥↓ │
└──────┴──────────────────────────────────────┴┴───────────────────────────┘
```

`FRESH SOLVE` / `REGENERATE` collapses to a single `⟳` icon button whose tooltip
carries the cache state. It is a status line, not a card.

### CoFix

Empty third column deleted. `BROKEN | FIXED` split full width.
`PROBLEM / TESTS / OUTPUT` become one `<BottomDrawer>`, **collapsed until CoFix
runs** — the "Run CoFix first" placeholders stop occupying 40% of the screen to
say nothing. `AnnotationPanel.tsx` becomes the FIXED pane's gutter renderer.

---

## Interaction: line binding

The single highest-leverage change. Monaco supports it natively —
`createDecorationsCollection`, `onMouseMove(e.target.position.lineNumber)`,
`revealLineInCenter`. No custom gutter.

- Hover a `WHY` row → Monaco line highlights.
- Hover a Monaco line → row highlights and scrolls into view.
- Click a row → `revealLineInCenter`.

The code renders **once**. This deletes the three per-line cards, the
duplication, and the side-by-side wrapping problem in one move.

---

## Toolbar grammar

Every control is exactly one of three things, and only one belongs in the
toolbar.

| Kind | Example | Placement |
|---|---|---|
| **Prerequisite** — meaningful only *before* the action | language, platform, company, problem source, starter template | In-page `<PrereqStrip>`. Collapses to a summary chip row once the action has run |
| **Action** — fires the thing | Run, Fix, Solve, Regenerate, Reset | Toolbar. Permanent |
| **Status** — reports state | cache freshness, test pass count, page count | Not a control. Inline text, or a badge on the related action |

A `<ChipSelect>` shows its current value and opens a menu on click — a status
readout and a control at once, at roughly ⅓ the width of a labelled `<select>`.

```
CODING   [Python 3 ▾] [HackerRank ▾] [Snap · 1 ▾] [▲ 2]      ⟳   [ Solve ]
CoFix    [Python 3 ▾] [HackerRank ▾] [Snap · 1 ▾] [▲ 2]      ⟳   [ Fix ]
DESIGN   [Basic ▾]    [AWS ▾]        [Snap · 1 ▾] [● Ready]  ⟳   [ Analyze ]
BEHAV    [Short ▾]    [Company ▾]    [Mic ●]      [▲ 1]      ⟳   ── always-on
         └──────────── prerequisite chips ────────────┘   action  primary
```

**CoFix's empty state becomes the prerequisite strip.** Instead of three panels
reading "Run CoFix first" across 40% of the viewport, that space is where you
pick language, snap the problem, and set company — collapsing to a summary chip
row the moment Fix is pressed, handing the viewport to `BROKEN | FIXED`.

`Auto` and `Stealth` are **modes**, not prerequisites — they change behaviour
during the run and stay as toggles. Stealth is already global in the icon rail
and must not reappear per-page.

---

## Readiness gate

The failures being guarded against are invisible. `sse-client.ts:531` silently
drops `problem` when unset; `coding.js:1908` then guesses what the stub should
compute. Missing `starter_code` generates from scratch. Neither warns.

Two severities. **Nothing ever blocks mid-session.**

| | Meaning | Behaviour |
|---|---|---|
| **Blocking** | Tool cannot run | Primary button disabled, reason on the button |
| **Degrading** | Runs, silently worse | Button stays live and turns amber; `▲ N` chip |

| Tool | Blocking | Degrading |
|---|---|---|
| CoFix | code pasted · language | **problem statement** · company |
| Coding | problem captured · language | **`starter_code`** · platform · company |
| Behavioral | mic permission | **interviewer audio connected** · resume / story anchor · company + JD |
| Design | problem text | detail level · cloud provider |

Checks run on tool entry. Once a session is live they downgrade to a passive
chip. No modal; no `window.confirm` — popover only, per the in-app-dialogs rule.
Dismissal is **per-session, resets on reload**.

```
[▲ 2 checks]          ⟳   [ Fix ▲ ]
   │
   ├ ▲ No problem statement → Fix will guess what the stub computes.
   │     [Snap] [Paste] [Ignore this session]
   └ ▲ No company set → Answers stay generic.
         [Set…] [Ignore this session]
```

---

## Non-goals

- **No prompt, SSE, or backend changes.** Zero files under
  `apps/lumora-backend/`. A layout regression must never be confusable with a
  prompt regression.
- **No palette change.** Navy + gold-leaf. `.tab-group` / `.chip` / `.badge-*` /
  `.btn-*` from `globals.css`. 11px bold pills, 10px labels. No invented chrome.
- **No `X` that hides chrome with no way back.** Every collapse is a chevron
  with restore.
- **No gesture controls.** Click-once affordances only.

---

## Commit sequence

1. Extraction only — `CodingLayout.tsx` 3,467 → ~300 lines. Zero behaviour
   change. Build green, screenshots identical.
2. Redesign — accordion, line binding, `BottomDrawer`, `PrereqStrip`.

Splitting these is non-negotiable: a 3,000-line mechanical move reviewed
alongside a redesign is not reviewable at all.

---

## Risks

- **Monaco decorations + React re-render.** `onMouseMove` closes over
  `explanations`; read directly, the handler goes stale on regenerate and
  highlights the *previous* solution's lines. Mitigation: callback ref, and the
  decorations collection stored in a ref, cleared on unmount and on solution
  change. This is the one place a stale closure or double-fire will bite.
- **One-open accordion costs a click.** On first paint the user sees `WHY` and
  nothing else. Anyone who scanned `EDGE CASES` at a glance mid-interview now
  clicks for it. Accepted; reversible.
- **Amber chrome becomes wallpaper.** If a user always skips "company", the `▲`
  stops meaning anything and hides the check that mattered. Per-session dismissal
  mitigates this, but it is a guess about users, not a fact — **the part of this
  design most likely to be wrong.**
- **Collapsing prerequisites costs a click on change.** Changing language after a
  solve becomes: click summary chip → expand → change → re-run. Right trade for a
  tool configured once and stared at for 40 minutes; a regression for anyone who
  language-hops constantly.
- **`highlight.js` may go dead in the coding panel** once the per-line cards die.
  It is almost certainly still used by Sona answers. Verify before removing the
  import; do not assume.

---

## Verification

1. `npx vite build` from `apps/camora` — full build, not grep-filtered `tsc`.
2. Drive it in the real app: paste a 3-line solution; hover each line in both
   directions; regenerate; **confirm decorations track the new solution and not
   the old one** (the stale-closure case above).
3. CoFix with no problem statement → `▲` chip appears, Fix stays enabled and
   amber, popover offers Snap/Paste.
4. Resize to the narrowest supported viewport — the CoFix toolbar overlap
   originally reported must not recur.
5. Before/after screenshots at identical viewport for Coding and CoFix.
