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

## The four projects

| | Project | Surface | Depends on |
|---|---|---|---|
| **A** | Solution-quality contract | `apps/lumora-backend/src/routes/coding.js` | Baseline measurement; platform chip from B |
| **B** | Layout redesign + prerequisite chips + readiness gate | `CodingLayout.tsx`, `CoFixLayout.tsx`, `DesignLayout.tsx`, `globals.css` | D |
| **C** | Stray `VoiceEnrollment` in CoFix toolbar | `CoFixLayout.tsx:992` | — |
| **D** | Dead and broken controls | Multiple | — |

**C folds into D.** Both are "a control that is wrong or shouldn't be there."

## Order: D → B → A

D first because it deletes code that B would otherwise waste effort restyling.
There is no point giving the timer block a chip-dropdown in two places before
merging the two copies of it.

A last because its central mechanism — `inferSubmissionContext()` — is
strictly improved by an explicit platform selector, and that selector is a dead
`<select>` that D repairs and B relocates into a chip.

## Settled decisions

Approved during brainstorming; not to be relitigated without new evidence.

1. **Code style flips globally.** The current prompt forbids helper functions,
   comments, and defensive branches (`coding.js:527-541`). Three of the four
   grading axes reward exactly those. Minimal-code rules are replaced, not
   toggled — no "graded mode" switch.

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

## Open

**Project A cannot be specced yet.** It needs a measured baseline: one real
problem plus Camora's current output for it, assessed cold against the four
axes. Designing against a reading of the prompt file rather than against
observed failures would encode assumptions, not fixes.
