# Lumora Tooling Overhaul — Decomposition

**Date:** 2026-07-08
**Status:** Approved (design). Specs D and B written; A deferred pending baseline.

## Origin

Started as a single request: make `/solve` and `/cofix` output satisfy four
grading axes (functional correctness, algorithmic optimality, code-quality
"Time-Debt", operational discipline). Exploration surfaced three further,
independent bodies of work. Mixing them into one change would make regressions
unbisectable — a prompt regression and a layout regression landing in the same
commit.

## The projects

| | Project | Surface | Depends on |
|---|---|---|---|
| **B0** | Readiness gate | `CodingLayout.tsx`, `CoFixLayout.tsx`, `useToolReadiness.ts` | — |
| **A0** | `shape: unknown` → least-committed artifact | `coding.js` (one policy block) | — |
| **D** | Dead and broken controls | Multiple | — |
| **B1** | Layout redesign + prerequisite chips | `CodingLayout.tsx`, `CoFixLayout.tsx`, `DesignLayout.tsx`, `globals.css` | D |
| **A1** | Full solution-quality contract | `coding.js`, `inferSubmissionContext` | D3 (platform chip) |

**C folds into D.** Both are "a control that is wrong or shouldn't be there."

## Order: B0 + A0 → D → B1 → A1

**Reordered 2026-07-08 after the baseline measurement.** The readiness gate was
originally scheduled inside B1 as part of the layout work. The baseline proved it
is the highest-value item in all four projects, and it does not depend on the
redesign.

Camora displayed `Could not extract problem from screenshots` and offered a live
**Solve** button directly beneath it. With no problem statement, `coding.js` guessed
the `stdin/print` branch on zero evidence, invented the output labels `"Iterative:"`
and `"Recursive:"`, and emitted a program that solves the problem twice. Two local
tests passed — because the generator wrote the code, then wrote the tests that grade
it. Neither was ever shown the problem.

Every defect in that submission flows from one un-gated moment. B0 and A0 close it;
both are small, and neither waits on anything.

D next, because it deletes code B1 would otherwise waste effort restyling — no point
giving the timer block a chip-dropdown in two places before merging the two copies.
D3 also repairs the inert `<select>` at `Header.tsx:198`, whose options
(`hackerrank | coderpad | codility`) are precisely the explicit override A1 wants.

A1 last: its central mechanism is strictly improved by that selector existing.

## Settled decisions

Approved during brainstorming; not to be relitigated without new evidence.

1. **Error containment lives in the driver; the algorithm stays total over its
   declared domain.** This is a *location* rule, not a platform rule — it
   dissolves the apparent Axis 1 ↔ Axis 3 conflict (guard clauses score as
   resilience but read as dead code) without splitting on HackerRank vs LeetCode.
   A base case is not a guard: `if not head` in a recursion is load-bearing and
   required under every `inputTrust`.

   *Supersedes the original decision ("code style flips globally"). The baseline
   measurement showed the model already decomposes and names well unprompted —
   `reverse_iterative` / `build_list` / `to_list`. The debt was concentrated in
   four specific places, not diffuse. Do not rewrite the style rules as though the
   model cannot decompose; it can.*

2. **Infer the submission context, never branch on a platform name.** Four
   orthogonal inferred fields (`shape`, `inputTrust`, `qualityGraded`,
   `concurrencySurface`). Platform names are *evidence* that populates those
   fields via a lookup table. Adding CodeSignal or Codility means adding a row,
   not a code path.

3. **An explicit platform chip overrides inference.** Heuristics are the
   fallback, not the mechanism.

4. **New JSON fields append after `examples`.** Truncation kills the tail
   (obs 14509). It must cost the coaching fields, never `solutions[].code`.

5. **No verifier LLM pass.** The four axes fold into the existing silent
   STEP A–D reasoning as a STEP E self-check. A second call doubles
   live-interview latency.

6. **Explanations bind to editor lines.** Code renders exactly once, in Monaco.
   Two-way highlight via `createDecorationsCollection` + `onMouseMove`.

7. **One-open accordion** for the six solution sections.

8. **Every toolbar control is a Prerequisite, an Action, or a Status.**
   Only Actions belong in the toolbar. Prerequisites live in an in-page strip
   that collapses to a summary chip once the action has run. Status annotates;
   it is not a control.

9. **The gate never blocks mid-session.** Blocking checks (tool cannot run)
   disable the primary button. Degrading checks (runs, silently worse) turn the
   button amber and surface a `▲ N` readiness chip. No modal, no
   `window.confirm`. Dismissal is per-session and resets on reload.

10. **Extraction is split from redesign** into two commits per file, so the
    redesign diff is reviewable.

## Why the gate exists

The failures being guarded against are *invisible*, which is what makes them
expensive:

- `sse-client.ts:531` — `...(problem && problem.trim() ? { problem } : {})`.
  Forget to snap the problem and the key is silently dropped. `coding.js:1908`
  then falls back to guessing what the stub should compute. No error.
- Missing `starter_code` → solution generated from scratch → "not matching
  HackerRank" (the bug chased on 2026-07-07, obs 14553).
- Behavioral: interviewer audio not connected → the candidate's own mic becomes
  the question source.

## Deferred

**Anti-paste typing cadence.** A large paste into HackerRank trips plagiarism
and integrity warnings on keystroke playback. Streaming the accepted solution
into the editor at human cadence is an Electron/editor concern with zero overlap
with prompt or layout work. Separate spec, later.

## Specs

- `2026-07-08-lumora-dead-controls-design.md` — D (absorbs C)
- `2026-07-08-lumora-layout-redesign-design.md` — B0 + B1
- `2026-07-08-lumora-solution-quality-design.md` — A0 + A1, with the measured baseline

## Open

**One unverified assumption, in A1.** Generated code gets longer, and `code` is the
field least affordable to truncate. Field ordering protects the tail; it does
nothing if `code` itself runs long. `max_tokens` must be measured against a
decomposed Java locked-template solution before A1 ships.

**One design guess, in B0.** Amber chrome that appears every session becomes
wallpaper. Per-session dismissal mitigates it, but that is a guess about users,
not a fact — the part of the design most likely to be wrong.
