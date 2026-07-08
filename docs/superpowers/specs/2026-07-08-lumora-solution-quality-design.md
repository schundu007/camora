# Project A — Solution Quality Contract

**Date:** 2026-07-08
**Status:** Approved (design)
**Surface:** `apps/lumora-backend/src/routes/coding.js`
**Ships in two parts:** `A0` (one-line policy, lands with the readiness gate) then `A1` (full contract)

## Measured baseline

Designed against an observed failure, not against a reading of the prompt file.

**Input:** "Reverse a singly linked list — iterative and recursive."
**Camora output:** Python 3, fresh solve, 2/2 local tests green.
**Screenshot evidence:** `Could not extract problem from screenshots — try a clearer
screenshot`, displayed directly above a live **Coding** button that ran anyway.

Findings, each verified by execution (`python3`), not asserted:

| # | Defect | Verified |
|---|---|---|
| A | `except EOFError: pass` catches nothing — `sys.stdin.read()` returns `''` at EOF, never raises | `-> returned '' — NO exception raised` |
| B | Destructive input `abc` → `ValueError`, escapes the `except EOFError` | `-> ValueError ESCAPES the except EOFError guard` |
| C | `head.next, prev, head = prev, head, head.next` is correct… | `-> [5, 4, 3, 2, 1]` |
| D | …but `narration` calls it *"atomically rewire"*. It is sequential left-to-right assignment from a pre-evaluated RHS tuple. The prose describes semantics the code does not have | reading |
| E | One `solutions[]` entry contains **two** algorithms plus a driver that runs both. Prompt demands one approach per entry | screenshot |
| F | `reverse_recursive` recurses once per node; Python's default limit is 1000. `TRADEOFFS` **states this** and the code does nothing. Both answers share one process, so the recursive crash destroys the iterative output | reading |
| G | **No problem statement was captured.** With nothing to constrain it, the generator took the *"stdin/print (HackerRank-style)"* branch on zero evidence and invented the output labels `"Iterative:"` / `"Recursive:"` | screenshot |

**G is the root cause. A–F are downstream.**

The 2/2 green tests are a trap: the generator wrote the code, then wrote the tests
that grade it. Both agree. Neither was ever shown the problem.

**Corrected assumption from the original design.** Decomposition and naming in
the baseline are *good* — `reverse_iterative` / `reverse_recursive` /
`build_list` / `to_list`. Axis 3 is not the disaster `coding.js:527-541`
predicted. The debt is concentrated, not diffuse. Do not rewrite the style rules
as though the model cannot decompose; it can.

---

## A0 — Least-committed artifact (ships with the readiness gate)

Absent a problem statement **and** absent starter code, `shape` is **unknown**.
Today the prompt resolves that ambiguity by guessing `stdin/print`.

> **Absent evidence, emit the least-committed artifact.**
> `shape: unknown` → a pure function. No driver. No `input()`. No `print()`.
> No invented labels. Populate `assumptions[]`.

**Correction, 2026-07-08 (found in final review).** An earlier draft of this spec
required `hackerrank_compatible: false` here. **`/solve`'s JSON schema has no such
field** — it belongs to `/cofix` (`coding.js:2033, 2079, 2090`). Instructing the
model to emit it would have violated the prompt's own *"Respond with valid JSON in
EXACTLY this format"* contract, which is the precise failure class A0 exists to
eliminate. If `/solve` ever needs the flag, it must be **declared in the schema
first**, not smuggled in via a rule.

The asymmetry is total: a pure function is trivially wrappable in any driver; an
invented print contract is a Wrong Answer the candidate cannot see.

One policy block in `buildCodingSystemPrompt()`. No schema change beyond
`assumptions[]`. Ships immediately.

---

## A1 — The contract

### `inferSubmissionContext(problem, starterCode, language, platformOverride)`

Four orthogonal inferred fields. **Never branch on a platform name.**

| Field | Values | Governs |
|---|---|---|
| `shape` | `locked-template` · `pure-function` · `full-program` · `query` · `mcq` · **`unknown`** | Helper placement, harness sanctity, I/O contract |
| `inputTrust` | `guaranteed` · `adversarial` · `unknown` | Where validation lives. `unknown` → `adversarial` |
| `qualityGraded` | `true` · `false` | Decomposition, naming, docstrings. Defaults `true` |
| `concurrencySurface` | `true` · `false` | Whether `platformDiscipline` is emitted **at all** |

An **explicit platform chip overrides inference** (Project D repairs the inert
`<select>` at `Header.tsx:198` that already carries
`hackerrank | coderpad | codility`). Heuristics are the fallback, not the
mechanism.

Evidence table — adding CodeSignal or HackerEarth means adding a row:

```
class Solution                       → shape:pure-function, inputTrust:guaranteed
^Constraints:\s*\n\s*1 <=            → inputTrust:guaranteed
starterCode + __main__/fptr          → shape:locked-template, inputTrust:adversarial
starterCode + Scanner/BufferedReader → shape:locked-template
SELECT|CREATE TABLE                  → shape:query
detectMcq()  (exists, coding.js:854) → shape:mcq
api\.|https?://|thread|queue|
  rate.limit|concurren|async         → concurrencySurface:true
no problem statement, no starter     → shape:unknown  ← A0
(no signal)                          → adversarial + qualityGraded
```

### Rule 1 — Error containment lives in the driver

This resolves the Axis 1 ↔ Axis 3 conflict without a platform split. It is a
**location** rule, not a platform rule.

> The algorithm function is **total over its declared domain**. Validation happens
> at the I/O boundary and nowhere else.

**A base case is not a guard.** `if not head or not head.next: return head` is a
recursion's terminating condition — semantic, load-bearing, required under every
`inputTrust`. Deleting it as "dead defensive code" breaks the algorithm.
`int(token)` validation is a guard, and belongs only to the driver.

| | `guaranteed` | `adversarial` |
|---|---|---|
| Driver validates parse | Forbidden (unreachable → debt) | Required, with a **defined failure output**, never a traceback |
| Algorithm base cases | Required | Required |
| Algorithm input validation | Forbidden | Forbidden — the driver did it |
| Boundary behavior | Stated in `edgeCases` | Stated **and** enforced |

### Rule 2 — Every `except` must be reachable

> An exception handler must name an exception the guarded block can actually
> raise.

`except EOFError` around `sys.stdin.read()` (verified: never raises) scores as
error containment while providing none. **Worse than no handler, because it looks
handled.** Mechanically checkable.

### Rule 3 — One entry, one algorithm, one runnable artifact

> A `solutions[]` entry contains exactly one algorithm. Alternatives are siblings
> in the array, never co-residents of a file.

Two algorithms in one submission is never what a platform wants — you submit one.
Seeing three approaches is a **UI** concern served by three cards. It is not a
codegen concern. (Defect E, and the proximate cause of F.)

### Rule 4 — Narration may not describe semantics the code lacks

Defect D. The `narration` field must be true to the emitted code. No claim of
atomicity, thread-safety, laziness, or short-circuiting the code does not have.

### Rule 5 — Clever beats nothing; plain beats clever

Multi-target assignment (`a, b, c = c, a, b.next`) is forbidden where a plain
sequential form exists. Correct, unobvious, and — per defect D — the generator
itself mis-describes it.

### Schema changes

Appended **after** `examples`. Truncation kills the tail (obs 14509); it must cost
the coaching fields, never `solutions[].code`.

Per solution:

```json
"optimality":  { "required": "O(n)", "achieved": "O(n^2)", "tleRisk": true,
                 "why": "n ≤ 1e5 ⇒ 1e10 ops" },
"submittable": false,
"reason":      "Recurses once per node. Python's default limit is 1000; constraints admit n ≤ 50000."
```

`required` is derived **from the stated constraints**, never from the model's own
solution. Today nothing checks this.

`submittable: false` is the fix for defect F: the tool already *knew* about the
recursion limit — `TRADEOFFS` said so — and shipped it anyway. **The diagnosis
existed and never reached the code.** Making it a field forces the connection.

Top level:

```json
"assumptions":        ["No problem statement provided; assumed a pure function returning the reversed head"],
"platformDiscipline": { … }   // OMITTED ENTIRELY when concurrencySurface:false
"edgeScenarios":      [ …2… ],
"assistantPrompts":   [ …2-3… ]
```

`platformDiscipline` is **omitted**, not populated with `applicable: false`.
Emitting "no concurrency concerns" on a linked-list reversal is noise, and noise
is what makes people stop reading the field.

### No verifier pass

The four axes fold into the existing silent STEP A–D reasoning as a STEP E
self-check. A second LLM call doubles live-interview latency — the same trade, in
reverse, as shrinking prompts for speed. If STEP E proves insufficient under the
regression fixture, a verifier goes behind a flag.

---

## Non-goals

- No frontend changes. Rendering `submittable: false` and `assumptions[]` is
  Project B's job.
- No line-count rules. The baseline proved the model decomposes well unprompted.
- No `max_tokens` increase without measurement — see Risks.

## Verification

**Regression fixture, from the baseline.** Freeze the linked-list problem as a
test case. Assert on generated output:

1. `shape: unknown` (no problem, no starter) → **no `print(`, no `input(`, no
   `sys.stdin` in `code`**; `assumptions[]` non-empty. *(defect G)*
   The prompt must **not** mention `hackerrank_compatible` — see the correction above.
2. Exactly one algorithm per `solutions[]` entry. *(defect E)*
3. No `except` clause naming an exception the guarded block cannot raise.
   *(defects A, B)*
4. Recursive variant carries `submittable: false` when the constraint's `n` exceeds
   the language's recursion headroom. *(defect F)*
5. `narration` contains no claim of atomicity for a multi-target assignment —
   and Rule 5 should mean no multi-target assignment exists to describe.
   *(defects C, D)*

Then, with a problem statement supplied, assert the same problem produces a
driver **matching the stated output format** rather than invented labels.

## Known hole in A0's guarantee (pre-existing; A1 must close it)

`coding.js:1167-1169` resolves `starterCode` with a fallback:
`detectPlatformTemplate(problem) ? problem : undefined`. That predicate is
**strictly looser** than the client's `isCodeTemplate`: it fires on a bare
`\bTODO\b`, or on any line ending `return 0;`, with **no structure gate**.

Consequence: a prose problem statement containing the word *TODO* makes the
backend treat the entire statement as locked starter code, set
`ioContract: 'template'`, and **suppress RULE #2.7** — exactly where a bare prompt
most needs it.

```
"Reverse a singly linked list.\nTODO: handle empty list."   → backend: template
"Write a function. On failure return 0;"                     → backend: template
```

Fix in A1: gate `detectPlatformTemplate`'s `TODO` / `return 0` clauses behind a
`hasStructure` test, as `isCodeTemplate` already does. Not a B0/A0 blocker — the
behaviour predates this work (`git show a370558e`).

## Risks

- **Generated code gets longer, and `code` is the field least affordable to
  truncate.** Field ordering protects the tail; it does nothing if `code` itself
  runs long. **Measure `max_tokens` against a decomposed Java locked-template
  solution before shipping A1.** This is the single unverified assumption in this
  spec.
- **`submittable: false` reads as the tool second-guessing itself.** Some users
  will submit anyway. Ship it regardless: a wrong answer you were warned about
  beats a wrong answer you weren't.
- **Rule 2 is checkable but not enumerable.** "Can this block raise `X`?" is
  decidable for `EOFError`/`sys.stdin.read()` and undecidable in general. The
  prompt states the rule; the fixture tests the known cases. It will not catch
  every unreachable handler.
- **`inputTrust: guaranteed` emits code that crashes on malformed input.** Correct
  for the platform, wrong if pasted into a different runner. The explicit platform
  chip (D3) is what makes this safe; heuristics alone are not.
