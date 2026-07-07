# Custom Input (stdin) for Live Coding — Design

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan
**Author:** Chundu + Claude

## Summary

Add a "Test against custom input" capability — a checkbox that reveals a
standard-input (stdin) textarea — to **all three** coding surfaces in Camora, so
a user can run their code once against arbitrary stdin and see raw stdout/stderr,
exactly like the CodeSignal/HackerRank "custom input" pattern. When the toggle is
off, Run behaves exactly as today (zero regression). Submit (where present) is
never affected — it always grades against the real hidden test cases.

## Motivation

During a live coding problem there is currently no way to feed arbitrary input to
the program and observe its output. Candidates need to sanity-check their solution
against their own inputs before submitting. The reference UX is a checkbox
labeled "Test against custom input" that toggles a stdin textarea, alongside the
existing Run Code / Submit Code buttons.

## Surfaces (current state, from recon)

Three distinct coding surfaces, each on a different backend:

| Surface | Component | Run endpoint | stdin today |
|---|---|---|---|
| **Lumora live coding** | `apps/camora/src/components/lumora/coding/CodingLayout.tsx` (`handleRun`, ~line 620) | `POST {VITE_LUMORA_API_URL}/api/v1/coding/execute` → **lumora-backend** `src/routes/coding.js` (~line 1352) → local `src/services/codeRunner.js` `executeCode` (line 868) | ❌ none end-to-end |
| **Capra practice (Blind75)** | `apps/camora/src/pages/Blind75PracticePage.tsx` (`runCode`, ~line 5684) | `POST {CAPRA_API_URL}/api/run` → **ascend-backend** `src/routes/run.js` (line 341) | ✅ backend threads stdin (`run.js:42-43`); frontend hardcodes `input: ''` (line 5689) |
| **Playground scratchpad** | `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx` (~line 180) | `POST /api/v1/playground/run` via `playgroundAPI.run` (`capra-api.ts:90`, type already allows `stdin?`) → **ascend-backend** `src/routes/playground.js` (line 406) | ❌ backend ignores stdin |

Notes that constrain the design:
- The live path (Surface 1) hits **lumora-backend**, whose `codeRunner.js` is a
  local `child_process` sandbox we fully control. `executeCode` already writes
  `opts.stdin` to the child (`codeRunner.js:105-107`) but the public signature
  `executeCode(code, language, testCases=[])` exposes no stdin parameter.
- The ascend-backend `lumora/routes/coding.js` `/execute` (which proxies to the
  in-repo `apps/code-runner` microservice via `CODE_RUNNER_URL`) is the **mirror**
  path, NOT the live path. It is left untouched.
- No custom-input UI exists anywhere today (grep for "custom input"/"stdin"/
  "Test against" returns only comments).
- State in all three surfaces is component-local `useState` (`code`, `language`,
  `output`, `testCases`, `isRunning`). The only Zustand store,
  `apps/camora/src/stores/session-store.ts`, holds just `code`/`language` for
  grounding follow-up Q&A. No run-result or input state lives in a store.

## Design

### UX (identical on all three surfaces)

- A `☑ Test against custom input` checkbox in the run toolbar.
- Checked → a collapsible stdin textarea appears (placeholder e.g. "Standard
  input — one value per line").
- **Run Code** with the toggle ON: execute the code **once**, feeding the textarea
  contents as raw stdin; render raw stdout/stderr. The problem's test-case harness
  is bypassed for this run.
- **Run Code** with the toggle OFF: unchanged from today.
- **Submit Code** (Surface 1 has no separate Submit for grading; Blind75 does):
  always grades against real hidden test cases, never the custom input.

### Shared component

New `apps/camora/src/components/shared/CustomInputPanel.tsx`, styled with the
navy-gold design-system utility classes. Controlled/presentational:

```
props: {
  enabled: boolean
  value: string
  onToggle: (enabled: boolean) => void
  onChange: (value: string) => void
  disabled?: boolean   // e.g. while a run is in flight
}
```

Reused in all three surfaces so behavior/styling never drift (design-consistency
rule). State (`customInputEnabled: boolean`, `customInput: string`) stays
component-local in each surface — matches the existing pattern; no store (YAGNI).

### Per-surface wiring

1. **Capra practice (Blind75)** — frontend only.
   Render `CustomInputPanel`; in `runCode`, replace `input: ''` (line 5689) with
   `input: customInputEnabled ? customInput : ''`. Backend `run.js` already threads
   stdin, so no backend change.

2. **Playground** — frontend + small backend.
   Pass `stdin: enabled ? value : undefined` to `playgroundAPI.run` (type already
   declares `stdin?`). In ascend `playground.js` `/run` (line 408), destructure
   `stdin` and forward it to the `python3`/`bash` spawn. `docker`/`terraform`
   branches ignore stdin (n/a).

3. **Lumora live coding (CodingLayout)** — frontend + lumora-backend only.
   Render `CustomInputPanel`; when enabled, `handleRun` adds `stdin` to the
   `/execute` payload. In lumora-backend `coding.js` `/execute` (line 1352), parse
   an optional `stdin` (string) and pass it through:
   `executeCode(code, language, testCases, { stdin })`. In `codeRunner.js`, extend
   `executeCode` with an optional 4th `opts` arg; when `opts.stdin` is a non-null
   string, run the code **once** feeding raw stdin (bypassing the base64 test-case
   param harness) and return `{ stdout, stderr, exitCode }`. When absent, behavior
   is byte-for-byte unchanged.

### Behavior & edge cases

- Toggle ON with empty textarea → send `''` (valid; some programs read nothing).
- Cap custom input at **64 KB**; truncate with a visible note beyond that.
- Append a trailing newline if the input does not end with one (most stdin readers
  expect line-terminated input).
- Input persists across a language switch.
- Toggle ON + Submit → Submit still uses the real test cases.
- Run errors (compile/runtime) render as today in the output area.

### Collision strategy (multi-window)

Another window is concurrently editing both backends' `coding.js` (observed in the
pull that preceded this work). Therefore:
- Every backend change here is **purely additive** — a new optional `stdin`
  parameter that is ignored when absent — so it rebases cleanly.
- `git pull` immediately before editing `lumora-backend/src/routes/coding.js`;
  resolve/coordinate if a conflict appears.
- Ascend-backend `lumora/routes/coding.js` and `apps/code-runner` are NOT touched.

## Testing

- **Backend (vitest):**
  - `codeRunner.executeCode` raw-stdin path: a program that echoes stdin returns
    it; empty stdin; multi-line stdin; stdin ignored when `opts.stdin` absent
    (regression guard on the test-case harness).
  - lumora `coding.js /execute` accepts and forwards `stdin`.
  - ascend `playground.js /run` forwards `stdin` to python3/bash.
  - ascend `run.js` (already supports stdin) — add a coverage test for non-empty
    input if missing.
- **Frontend:** per-surface manual verification (toggle reveals textarea; Run
  feeds input; output shows; toggle-off unchanged), plus the mandatory full
  `vite build` before push.

## Out of scope (YAGNI)

- Persisting custom input across sessions / to a store.
- Multiple named custom-input tabs.
- Custom input on the ascend mirror `/execute` path or the `apps/code-runner`
  microservice.
- Streaming stdout for long-running custom runs.
