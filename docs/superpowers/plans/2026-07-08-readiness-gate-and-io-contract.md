# Readiness Gate (B0) + I/O Contract Inference (A0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Camora from silently solving a problem it never saw — warn the user before the solve, and make the backend emit a pure function instead of an invented stdin/print contract when it has no evidence of one.

**Architecture:** Two independent halves that ship together. **A0** adds a pure `inferIoContract(problem, starterCode)` to `coding.js` and a new highest-priority prompt block that fires only when the contract is `'unknown'`. **B0** adds a pure `evaluateChecks()` + a `useToolReadiness` hook + a `<ReadinessChip>` popover, wired next to the existing Coding and CoFix submit buttons. Neither half depends on the other; A0 fixes the generation, B0 warns the human.

**Tech Stack:** Express 5 + ES modules (`apps/lumora-backend`), React 19 + TypeScript + Vite (`apps/camora`), vitest in both.

## Global Constraints

- **Never `window.confirm` / `window.alert` / `window.prompt`.** In-app popover only. `dialogConfirm` / `dialogAlert` via `DialogProvider` if a dialog is ever needed.
- **Never an `X` that hides chrome with no way back.** Chevron collapse with restore.
- **Navy + gold-leaf.** Reuse `--cam-chip-active-bg`, `--cam-strip-text`, `--cam-gold-leaf`, `--warning`, `--warning-text` from `globals.css`. Do not invent colors. Light mode is blue-only — never restore gold there.
- **Nothing blocks mid-session.** Degrading checks turn the primary button amber. They never disable it.
- **Chip typography:** `11px` bold for pills, `10px` for labels. Match `CoFixLayout.tsx:1011`.
- **Full build before any push:** `cd apps/camora && npx vite build`. Not a grep-filtered `tsc`.
- **Work on `main`.** Never create a feature branch. Never push without explicit approval.
- **`git pull --rebase` before every commit** — other Claude windows share this HEAD.

## Baseline being fixed

Verified by execution against the linked-list solve in
`docs/superpowers/specs/2026-07-08-lumora-solution-quality-design.md`:

- The frontend displayed `Could not extract problem from screenshots` (`CodingLayout.tsx:1487`) and left the **Coding** button enabled (`CodingLayout.tsx:2506`).
- With no I/O evidence, `coding.js` took its `EXCEPTION — stdin/print` branch (`coding.js:653-660`) and invented the output labels `"Iterative:"` / `"Recursive:"`.
- `coding.js:1322` passes `forceSingle = true` **unconditionally**, so the 3-solution path is dead in `/solve`. The model crammed two algorithms into the single allowed slot.

## File Structure

| File | Responsibility |
|---|---|
| `apps/lumora-backend/src/routes/coding.js` | **Modify.** Add `hasStdinEvidence`, `hasExampleEvidence`, `inferIoContract`; add `ioContract` param + RULE #2.7 block to `buildCodingSystemPrompt`; add `assumptions` to the JSON schema; thread at the `/solve` call site |
| `apps/lumora-backend/tests/ioContract.test.js` | **Create.** Unit tests for the three pure functions + prompt assembly |
| `apps/camora/src/components/lumora/shared/readiness.ts` | **Create.** Types, `hasIoEvidence`, `codingChecks`, `cofixChecks`, `summarize` — all pure |
| `apps/camora/src/components/lumora/shared/readiness.test.ts` | **Create.** Unit tests, sharing fixture strings with the backend test |
| `apps/camora/src/components/lumora/shared/useToolReadiness.ts` | **Create.** Per-session dismissal state |
| `apps/camora/src/components/lumora/shared/ReadinessChip.tsx` | **Create.** Chip + popover. No test — jsdom has no RTL in this repo |
| `apps/camora/src/components/lumora/coding/CodingLayout.tsx` | **Modify** near `:2494-2515`. Mount chip, amber the button |
| `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx` | **Modify** near `:1008-1016`. Mount chip, amber the button |

**Known duplication, accepted.** `hasIoEvidence` in `readiness.ts` mirrors `hasStdinEvidence`/`hasExampleEvidence` in `coding.js`. The gate must warn *before* the request, so the client cannot ask the server. Both test files use the **same fixture strings** (Task 1 and Task 4) so drift is caught. `coding.js` is the source of truth; the client copy carries a comment saying so.

---

## Task 1: `inferIoContract` — the pure classifier

**Files:**
- Modify: `apps/lumora-backend/src/routes/coding.js` (add functions near `detectMcq`, ~`:854`; add to the export at `:2737`)
- Test: `apps/lumora-backend/tests/ioContract.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `hasStdinEvidence(problem: string) => boolean`
  - `hasExampleEvidence(problem: string) => boolean`
  - `inferIoContract(problem: string, starterCode?: string) => 'template' | 'pure-function' | 'stdin-print' | 'unknown'`

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/ioContract.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { hasStdinEvidence, hasExampleEvidence, inferIoContract } from '../src/routes/coding.js';

// ─────────────────────────────────────────────────────────────────────────
// SHARED FIXTURES — apps/camora/src/components/lumora/shared/readiness.test.ts
// asserts the SAME strings against its own hasIoEvidence(). Keep in sync.
// ─────────────────────────────────────────────────────────────────────────
export const HACKERRANK_PROBLEM = `Given an array of integers, find the sum.

Input Format
The first line contains an integer n.
The second line contains n space-separated integers.

Output Format
Print the sum.

Sample Input
3
1 2 3

Sample Output
6`;

export const LEETCODE_PROBLEM = `Given an array nums and a target, return indices of the two numbers such that they add up to target.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]

Constraints:
2 <= nums.length <= 10^4`;

// The exact case from the 2026-07-08 baseline: OCR failed, user typed a bare
// prompt. No I/O format, no examples, no starter code.
export const BARE_PROBLEM = 'Reverse a singly linked list. Do it iteratively and recursively.';

describe('hasStdinEvidence', () => {
  it('detects HackerRank Input Format / Sample Input', () => {
    expect(hasStdinEvidence(HACKERRANK_PROBLEM)).toBe(true);
  });
  it('does not fire on a LeetCode worked example', () => {
    expect(hasStdinEvidence(LEETCODE_PROBLEM)).toBe(false);
  });
  it('does not fire on a bare prompt', () => {
    expect(hasStdinEvidence(BARE_PROBLEM)).toBe(false);
  });
  it('detects an explicit stdin mention', () => {
    expect(hasStdinEvidence('Read n from stdin and print n*2.')).toBe(true);
  });
});

describe('hasExampleEvidence', () => {
  it('detects a LeetCode Example block', () => {
    expect(hasExampleEvidence(LEETCODE_PROBLEM)).toBe(true);
  });
  it('does not fire on a bare prompt', () => {
    expect(hasExampleEvidence(BARE_PROBLEM)).toBe(false);
  });
  it('requires BOTH Input: and Output: when there is no Example header', () => {
    expect(hasExampleEvidence('Input: 5')).toBe(false);
    expect(hasExampleEvidence('Input: 5\nOutput: 25')).toBe(true);
  });
});

describe('inferIoContract', () => {
  it('starter code always wins', () => {
    expect(inferIoContract(BARE_PROBLEM, "if __name__ == '__main__':\n    n = int(input())")).toBe('template');
    expect(inferIoContract(HACKERRANK_PROBLEM, 'def solve():\n    pass')).toBe('template');
  });
  it('class Solution means pure function', () => {
    expect(inferIoContract('class Solution:\n    def twoSum(self, nums, target):')).toBe('pure-function');
  });
  it('HackerRank phrasing means stdin-print', () => {
    expect(inferIoContract(HACKERRANK_PROBLEM)).toBe('stdin-print');
  });
  it('stdin evidence is checked BEFORE example evidence', () => {
    // HackerRank problems often contain both "Sample Input" and "Input:".
    expect(inferIoContract(HACKERRANK_PROBLEM + '\nInput: 3\nOutput: 6')).toBe('stdin-print');
  });
  it('a LeetCode worked example means pure function', () => {
    expect(inferIoContract(LEETCODE_PROBLEM)).toBe('pure-function');
  });
  it('THE BASELINE: a bare prompt with no starter code is unknown', () => {
    expect(inferIoContract(BARE_PROBLEM)).toBe('unknown');
    expect(inferIoContract(BARE_PROBLEM, undefined)).toBe('unknown');
    expect(inferIoContract(BARE_PROBLEM, '')).toBe('unknown');
  });
  it('tolerates a non-string problem', () => {
    expect(inferIoContract(undefined)).toBe('unknown');
    expect(inferIoContract(null)).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/ioContract.test.js
```

Expected: FAIL — `hasStdinEvidence is not a function` (the import resolves, the binding is undefined).

- [ ] **Step 3: Write minimal implementation**

In `apps/lumora-backend/src/routes/coding.js`, insert immediately **after** the `detectMcq` function (ends ~`:875`):

```javascript
// ---------------------------------------------------------------------------
// I/O contract inference
// ---------------------------------------------------------------------------

/**
 * Positive evidence that the problem describes a stdin → stdout contract.
 * HackerRank / CoderPad phrasing. Checked BEFORE hasExampleEvidence, because
 * HackerRank problems routinely contain both "Sample Input" and a bare
 * "Input:" line, and only the former tells us how the program is invoked.
 */
export function hasStdinEvidence(problem) {
  const t = typeof problem === 'string' ? problem : '';
  return /(^|\n)\s*(input|output)\s+format\b/i.test(t)
    || /(^|\n)\s*sample\s+(input|output)\b/i.test(t)
    || /\bstdin\b|\bstandard input\b/i.test(t)
    || /\bthe first line contains\b/i.test(t)
    || /\bprints?\b[^.\n]{0,40}\boutput\b/i.test(t);
}

/** LeetCode-style worked example: an "Example N:" header, or Input: + Output:. */
export function hasExampleEvidence(problem) {
  const t = typeof problem === 'string' ? problem : '';
  if (/(^|\n)\s*example\s*\d*\s*:/i.test(t)) return true;
  return /(^|\n)\s*input\s*:/i.test(t) && /(^|\n)\s*output\s*:/i.test(t);
}

/**
 * Classify how the generated program will be invoked and graded.
 *
 * 'unknown' is the important one. It means we have NO evidence of an I/O
 * format — no starter code, no stdin phrasing, no worked example. The prompt
 * must then emit a pure function rather than inventing a print contract,
 * because a pure function wraps into any driver while an invented print
 * contract is a Wrong Answer the candidate cannot see.
 */
export function inferIoContract(problem, starterCode) {
  if (typeof starterCode === 'string' && starterCode.trim()) return 'template';
  const t = typeof problem === 'string' ? problem : '';
  if (/\bclass\s+Solution\b/.test(t)) return 'pure-function';
  if (hasStdinEvidence(t)) return 'stdin-print';
  if (hasExampleEvidence(t)) return 'pure-function';
  return 'unknown';
}
```

Then extend the export at `coding.js:2737`:

```javascript
export { detectPlatformTemplate, templateHasFillableFunction, isMinimalInlineTemplate, buildTemplateShapeDirective, buildCodingSystemPrompt };
export { hasStdinEvidence, hasExampleEvidence, inferIoContract };
```

> Note: the three functions above already carry `export`. Remove the `export` keyword from each `function` declaration if you prefer the trailing-export style, but do not export twice — that is a `SyntaxError`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/ioContract.test.js
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/lumora-backend/src/routes/coding.js apps/lumora-backend/tests/ioContract.test.js
git commit -m "$(cat <<'EOF'
feat(coding): infer the I/O contract from problem evidence

inferIoContract() returns 'unknown' when there is no starter code, no stdin
phrasing, and no worked example. Today the prompt guesses stdin/print in that
case and invents an output format.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: RULE #2.7 — the least-committed artifact

**Files:**
- Modify: `apps/lumora-backend/src/routes/coding.js:450` (signature), `~:595` (insert block), `~:719-796` (schema), `~:816-832` (rules list)
- Test: `apps/lumora-backend/tests/ioContract.test.js` (append)

**Interfaces:**
- Consumes: `inferIoContract` from Task 1
- Produces: `buildCodingSystemPrompt(language, systemContext, starterCode, forceSingle = false, ioContract = null) => string`
  - New 5th parameter. `null` preserves today's exact output for every existing caller.

- [ ] **Step 1: Write the failing test**

Append to `apps/lumora-backend/tests/ioContract.test.js`:

```javascript
import { buildCodingSystemPrompt } from '../src/routes/coding.js';

describe('buildCodingSystemPrompt — RULE #2.7 (unknown I/O contract)', () => {
  const unknown = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'unknown');
  const known = () => buildCodingSystemPrompt('python', undefined, undefined, true, 'stdin-print');
  const legacy = () => buildCodingSystemPrompt('python', undefined, undefined, true);

  it('emits RULE #2.7 only when the contract is unknown', () => {
    expect(unknown()).toContain('RULE #2.7: I/O CONTRACT UNKNOWN');
    expect(known()).not.toContain('RULE #2.7');
  });

  it('forbids drivers and invented labels when unknown', () => {
    const p = unknown();
    expect(p).toContain('NO input(), NO sys.stdin, NO print()');
    expect(p).toContain('ONE algorithm. Never two algorithms in one file.');
    expect(p).toContain('"hackerrank_compatible": false');
  });

  it('a null ioContract preserves the legacy prompt byte-for-byte', () => {
    expect(legacy()).toBe(buildCodingSystemPrompt('python', undefined, undefined, true, null));
    expect(legacy()).not.toContain('RULE #2.7');
  });

  it('starter code and unknown never co-occur, but starter wins if they do', () => {
    const p = buildCodingSystemPrompt('python', undefined, 'def solve():\n    pass', true, 'unknown');
    expect(p).not.toContain('RULE #2.7');
    expect(p).toContain('STARTER CODE — THIS IS THE EXACT TEMPLATE FROM THE PLATFORM');
  });

  it('declares the assumptions field in the JSON schema', () => {
    expect(unknown()).toContain('"assumptions"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/ioContract.test.js -t "RULE #2.7"
```

Expected: FAIL — `expected '...' to contain 'RULE #2.7: I/O CONTRACT UNKNOWN'`.

- [ ] **Step 3: Write minimal implementation**

**3a.** Change the signature at `coding.js:450`:

```javascript
function buildCodingSystemPrompt(language, systemContext, starterCode, forceSingle = false, ioContract = null) {
```

**3b.** Immediately after `const singleSolution = ...` (`:454`), add:

```javascript
  // Starter code means we HAVE a contract — the template is it. RULE #2.7 only
  // fires when we have no evidence at all.
  const ioUnknown = ioContract === 'unknown' && !starterCode;
```

**3c.** Immediately after the RULE #2.6 template block (the line ending `` : ''}`` at `:595`), insert:

```javascript
${ioUnknown ? `
##############################################################################
# RULE #2.7: I/O CONTRACT UNKNOWN — DO NOT INVENT ONE (HIGHEST PRIORITY)
##############################################################################
The problem statement specifies NO input/output format, and NO starter code was
captured. You have NO evidence of how this program is invoked or graded.

Emit the LEAST-COMMITTED artifact:
- ONE pure function. Its PARAMETERS are the inputs. It RETURNS the answer.
- NO input(), NO sys.stdin, NO print(), NO if __name__ block, NO driver.
- NO invented output labels. Printing "Iterative:" before a result is FORBIDDEN.
- ONE algorithm. Never two algorithms in one file. If several approaches exist,
  pick the one you would submit and describe the others in "tradeoffs".
- Set "hackerrank_compatible": false
- Populate "assumptions" with exactly what you assumed about the inputs and the
  expected return value.

This OVERRIDES the stdin/print EXCEPTION in RULE #3. A pure function wraps into
any driver; an invented print contract is a Wrong Answer the candidate cannot see.
` : ''}
```

**3d.** In the JSON schema, immediately after the `"examples": [...]` array (`~:792-795`) and before the closing `}`, add:

```javascript
  ,"assumptions": ${ioUnknown
    ? `["Each assumption you made about the input types or the expected return value. REQUIRED — at least one entry."]`
    : `[]`}
```

> Placement is deliberate. `assumptions` sits **after** `examples` so a truncated
> response loses it rather than `solutions[].code`. See obs 14509.

**3e.** In the trailing rules list (`~:816-832`), append one bullet:

```javascript
${ioUnknown ? `- The I/O contract is UNKNOWN. Return a pure function with no driver, no print, no invented labels, and populate "assumptions".` : ''}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run tests/ioContract.test.js
```

Expected: PASS, 18 tests. Then confirm nothing else regressed:

```bash
cd apps/lumora-backend && npx vitest run
```

Expected: all suites PASS. `templateShape.test.js` and `fetchProblemStarter.test.js` exercise `buildCodingSystemPrompt` indirectly — the `null` default must have kept them green.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/lumora-backend/src/routes/coding.js apps/lumora-backend/tests/ioContract.test.js
git commit -m "$(cat <<'EOF'
feat(coding): RULE #2.7 — emit a pure function when the I/O contract is unknown

Absent a problem statement and starter code, the prompt used to guess the
stdin/print branch and invent output labels. It now emits a pure function,
sets hackerrank_compatible:false, and records what it assumed.

assumptions[] is appended after examples so truncation costs it, not code.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Thread `ioContract` into `/solve`

**Files:**
- Modify: `apps/lumora-backend/src/routes/coding.js:1105-1130` (compute + log), `:1320-1322` (pass)

**Interfaces:**
- Consumes: `inferIoContract` (Task 1), `buildCodingSystemPrompt` 5-arg form (Task 2)
- Produces: nothing new. This is the wiring task.

- [ ] **Step 1: Write the failing test**

There is no HTTP-level test harness for `/solve` in this repo, and adding one is
out of scope. Assert the wiring by reading it back — append to
`apps/lumora-backend/tests/ioContract.test.js`:

```javascript
import { readFileSync } from 'node:fs';

describe('/solve wiring', () => {
  const src = readFileSync(new URL('../src/routes/coding.js', import.meta.url), 'utf8');

  it('computes ioContract from problem + starterCode', () => {
    expect(src).toMatch(/const ioContract = isMcq \? null : inferIoContract\(problem, starterCode\);/);
  });

  it('passes ioContract as the 5th argument to buildCodingSystemPrompt', () => {
    expect(src).toMatch(/buildCodingSystemPrompt\(lang,[^)]*starterCode \|\| undefined, true, ioContract\)/s);
  });
});
```

> This is a source-shape assertion, not a behavior test. It is worth exactly what
> it costs: it catches the 5th argument being dropped in a later refactor. It
> proves nothing about runtime.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/lumora-backend && npx vitest run tests/ioContract.test.js -t "solve wiring"
```

Expected: FAIL — both regexes unmatched.

- [ ] **Step 3: Write minimal implementation**

In `coding.js`, after the `isMcq` assignment (`:1128`), add:

```javascript
  const ioContract = isMcq ? null : inferIoContract(problem, starterCode);
```

Change the existing log line (`:1129`) to carry it:

```javascript
  console.log(`[solve] lang=${lang} mcq=${isMcq} io=${ioContract} bypass=${!!bypassCache} starter=${starterCode ? starterCode.slice(0, 60).replace(/\n/g, '↵') : 'null'}`);
```

Change the call at `:1322`:

```javascript
    : buildCodingSystemPrompt(lang, typeof systemContext === 'string' ? systemContext : undefined, starterCode || undefined, true, ioContract);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/lumora-backend && npx vitest run
node --check src/routes/coding.js
```

Expected: all suites PASS; `node --check` silent.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/lumora-backend/src/routes/coding.js apps/lumora-backend/tests/ioContract.test.js
git commit -m "$(cat <<'EOF'
feat(coding): thread ioContract into /solve and log it

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `readiness.ts` — the pure check evaluator

**Files:**
- Create: `apps/camora/src/components/lumora/shared/readiness.ts`
- Test: `apps/camora/src/components/lumora/shared/readiness.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type Severity = 'blocking' | 'degrading'`
  - `interface Check { id: string; label: string; consequence: string; severity: Severity; satisfied: boolean }`
  - `hasIoEvidence(problem: string) => boolean`
  - `codingChecks(input: { problemText: string; starterCode: string | null; company: string | null }) => Check[]`
  - `cofixChecks(input: { inputCode: string; problemContext: string; company: string | null }) => Check[]`
  - `summarize(checks: Check[], dismissed: ReadonlySet<string>) => { blocking: Check[]; degrading: Check[]; ready: boolean }`

- [ ] **Step 1: Write the failing test**

Create `apps/camora/src/components/lumora/shared/readiness.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { hasIoEvidence, codingChecks, cofixChecks, summarize } from './readiness';

// ─────────────────────────────────────────────────────────────────────────
// SHARED FIXTURES — these strings are duplicated verbatim in
// apps/lumora-backend/tests/ioContract.test.js. coding.js is the source of
// truth for the regexes; this copy exists because the gate must warn BEFORE
// the request is sent. If these two files ever disagree, coding.js wins.
// ─────────────────────────────────────────────────────────────────────────
const HACKERRANK_PROBLEM = `Given an array of integers, find the sum.

Input Format
The first line contains an integer n.
The second line contains n space-separated integers.

Output Format
Print the sum.

Sample Input
3
1 2 3

Sample Output
6`;

const LEETCODE_PROBLEM = `Given an array nums and a target, return indices of the two numbers such that they add up to target.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]

Constraints:
2 <= nums.length <= 10^4`;

const BARE_PROBLEM = 'Reverse a singly linked list. Do it iteratively and recursively.';

describe('hasIoEvidence — must agree with coding.js', () => {
  it('true for HackerRank stdin phrasing', () => {
    expect(hasIoEvidence(HACKERRANK_PROBLEM)).toBe(true);
  });
  it('true for a LeetCode worked example', () => {
    expect(hasIoEvidence(LEETCODE_PROBLEM)).toBe(true);
  });
  it('THE BASELINE: false for a bare prompt', () => {
    expect(hasIoEvidence(BARE_PROBLEM)).toBe(false);
  });
  it('false for empty input', () => {
    expect(hasIoEvidence('')).toBe(false);
  });
  // These four mirror the same cases in ioContract.test.js. If either side's
  // regex is edited without the other, exactly one of the two suites goes red.
  it('does not fire on an output-prediction quiz prompt', () => {
    expect(hasIoEvidence('Print the output of the following program.')).toBe(false);
  });
  it('fires when the PROGRAM is the thing that prints', () => {
    expect(hasIoEvidence('Your program prints True or False.')).toBe(true);
    expect(hasIoEvidence('The function prints each element on its own line.')).toBe(true);
  });
  it('fires on an explicit stdout target', () => {
    expect(hasIoEvidence('Print the sum to standard output.')).toBe(true);
  });
});

describe('codingChecks', () => {
  const base = { problemText: LEETCODE_PROBLEM, starterCode: 'def f(): pass', company: 'Salesforce' };

  it('all satisfied when everything is present', () => {
    const { blocking, degrading, ready } = summarize(codingChecks(base), new Set());
    expect(blocking).toHaveLength(0);
    expect(degrading).toHaveLength(0);
    expect(ready).toBe(true);
  });

  it('an empty problem is BLOCKING', () => {
    const { blocking } = summarize(codingChecks({ ...base, problemText: '   ' }), new Set());
    expect(blocking.map(c => c.id)).toEqual(['problem']);
  });

  it('THE BASELINE: a bare prompt with no starter is two DEGRADING checks', () => {
    const checks = codingChecks({ problemText: BARE_PROBLEM, starterCode: null, company: null });
    const { blocking, degrading, ready } = summarize(checks, new Set());
    expect(blocking).toHaveLength(0);
    expect(degrading.map(c => c.id).sort()).toEqual(['company', 'io-contract', 'starter'].sort());
    expect(ready).toBe(false);
  });

  it('names the consequence, not just the miss', () => {
    const checks = codingChecks({ problemText: BARE_PROBLEM, starterCode: null, company: null });
    const io = checks.find(c => c.id === 'io-contract')!;
    expect(io.consequence).toBe('Solve will invent an I/O contract — an output format the grader never asked for.');
  });

  it('a satisfied io-contract check does not appear when evidence exists', () => {
    const checks = codingChecks({ ...base, starterCode: null });
    expect(checks.find(c => c.id === 'io-contract')!.satisfied).toBe(true);
  });
});

describe('cofixChecks', () => {
  it('code shorter than 5 chars is BLOCKING', () => {
    const { blocking } = summarize(cofixChecks({ inputCode: 'x', problemContext: 'p', company: 'c' }), new Set());
    expect(blocking.map(c => c.id)).toEqual(['code']);
  });

  it('THE BASELINE: a missing problem statement is DEGRADING, never blocking', () => {
    const checks = cofixChecks({ inputCode: 'def f():\n    pass', problemContext: '', company: 'Salesforce' });
    const { blocking, degrading } = summarize(checks, new Set());
    expect(blocking).toHaveLength(0);
    expect(degrading.map(c => c.id)).toEqual(['problem']);
    expect(degrading[0].consequence).toBe('Fix will guess what the stub should compute.');
  });
});

describe('summarize — dismissal', () => {
  const checks = codingChecks({ problemText: BARE_PROBLEM, starterCode: null, company: null });

  it('dismissing hides a degrading check', () => {
    const { degrading, ready } = summarize(checks, new Set(['company', 'starter', 'io-contract']));
    expect(degrading).toHaveLength(0);
    expect(ready).toBe(true);
  });

  it('dismissing NEVER hides a blocking check', () => {
    const blocked = codingChecks({ problemText: '', starterCode: null, company: null });
    const { blocking, ready } = summarize(blocked, new Set(['problem']));
    expect(blocking.map(c => c.id)).toEqual(['problem']);
    expect(ready).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chundu/camora && npx vitest run --root apps/camora apps/camora/src/components/lumora/shared/readiness.test.ts
```

Expected: FAIL — `Failed to resolve import "./readiness"`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/camora/src/components/lumora/shared/readiness.ts`:

```typescript
/**
 * Prerequisite checks for the Lumora tools.
 *
 * Two severities, and only one of them blocks:
 *   blocking  — the tool cannot run. Primary button disabled.
 *   degrading — the tool runs, silently worse. Button turns amber, never disables.
 *
 * Nothing here ever blocks mid-session. A modal that interrupts a live interview
 * to say "you forgot your resume" is worse than no gate at all.
 */

export type Severity = 'blocking' | 'degrading';

export interface Check {
  id: string;
  label: string;
  /** What actually goes wrong. Naming the consequence is the point of the gate. */
  consequence: string;
  severity: Severity;
  satisfied: boolean;
}

/**
 * Mirrors hasStdinEvidence() + hasExampleEvidence() in
 * apps/lumora-backend/src/routes/coding.js. That file is the SOURCE OF TRUTH.
 *
 * This copy exists because the gate must warn before the request is sent, so
 * the client cannot ask the server. readiness.test.ts and ioContract.test.js
 * share fixture strings so drift is caught.
 */
export function hasIoEvidence(problem: string): boolean {
  const t = typeof problem === 'string' ? problem : '';
  const stdin =
    /(^|\n)\s*(input|output)\s+format\b/i.test(t) ||
    /(^|\n)\s*sample\s+(input|output)\b/i.test(t) ||
    /\bstdin\b|\bstandard input\b/i.test(t) ||
    /\bthe first line contains\b/i.test(t) ||
    // Subject-anchored: the PROGRAM prints, not the reader. A bare
    // /\bprints?\b.{0,40}\boutput\b/ fires on "Print the output of the
    // following program." — an output-prediction quiz, not a stdin contract.
    /\bprints?\b[^.\n]{0,40}\bto\s+(stdout|standard\s+output)\b/i.test(t) ||
    /\b(your|the)\s+(program|solution|script|function)\b[^.\n]{0,60}\bprints?\b/i.test(t);
  if (stdin) return true;
  if (/\bclass\s+Solution\b/.test(t)) return true;
  if (/(^|\n)\s*example\s*\d*\s*:/i.test(t)) return true;
  return /(^|\n)\s*input\s*:/i.test(t) && /(^|\n)\s*output\s*:/i.test(t);
}

export function codingChecks(input: {
  problemText: string;
  starterCode: string | null;
  company: string | null;
}): Check[] {
  const problem = (input.problemText || '').trim();
  return [
    {
      id: 'problem',
      label: 'Problem captured',
      consequence: 'Nothing to solve.',
      severity: 'blocking',
      satisfied: problem.length > 0,
    },
    {
      id: 'io-contract',
      label: 'Input / output format',
      consequence: 'Solve will invent an I/O contract — an output format the grader never asked for.',
      severity: 'degrading',
      // Starter code IS the contract, so it satisfies this check on its own.
      satisfied: Boolean(input.starterCode?.trim()) || hasIoEvidence(problem),
    },
    {
      id: 'starter',
      label: 'Starter template',
      consequence: "Solve will write from scratch instead of filling the platform's locked stub.",
      severity: 'degrading',
      satisfied: Boolean(input.starterCode?.trim()),
    },
    {
      id: 'company',
      label: 'Company',
      consequence: 'Answers stay generic — no resume story anchor, no role framing.',
      severity: 'degrading',
      satisfied: Boolean(input.company?.trim()),
    },
  ];
}

export function cofixChecks(input: {
  inputCode: string;
  problemContext: string;
  company: string | null;
}): Check[] {
  return [
    {
      id: 'code',
      label: 'Broken code',
      consequence: 'Nothing to fix.',
      severity: 'blocking',
      // Mirrors the existing disabled= guard at CoFixLayout.tsx:1009.
      satisfied: (input.inputCode || '').trim().length >= 5,
    },
    {
      id: 'problem',
      label: 'Problem statement',
      consequence: 'Fix will guess what the stub should compute.',
      severity: 'degrading',
      satisfied: (input.problemContext || '').trim().length > 0,
    },
    {
      id: 'company',
      label: 'Company',
      consequence: 'Answers stay generic — no resume story anchor, no role framing.',
      severity: 'degrading',
      satisfied: Boolean(input.company?.trim()),
    },
  ];
}

export function summarize(
  checks: Check[],
  dismissed: ReadonlySet<string>,
): { blocking: Check[]; degrading: Check[]; ready: boolean } {
  const unmet = checks.filter((c) => !c.satisfied);
  // A blocking check is never dismissible. Only degrading checks honour the set.
  const blocking = unmet.filter((c) => c.severity === 'blocking');
  const degrading = unmet.filter((c) => c.severity === 'degrading' && !dismissed.has(c.id));
  return { blocking, degrading, ready: blocking.length === 0 && degrading.length === 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chundu/camora && npx vitest run --root apps/camora apps/camora/src/components/lumora/shared/readiness.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/camora/src/components/lumora/shared/readiness.ts apps/camora/src/components/lumora/shared/readiness.test.ts
git commit -m "$(cat <<'EOF'
feat(lumora): pure prerequisite checks for Coding and CoFix

Two severities. Blocking disables the button; degrading never does — it names
the consequence instead ("Solve will invent an I/O contract").

hasIoEvidence mirrors coding.js and shares its test fixtures.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `useToolReadiness` — per-session dismissal

**Files:**
- Create: `apps/camora/src/components/lumora/shared/useToolReadiness.ts`
- Test: `apps/camora/src/components/lumora/shared/readiness.test.ts` (append — reducer only, no renderer)

**Interfaces:**
- Consumes: `Check`, `summarize` (Task 4)
- Produces:
  - `dismissReducer(state: ReadonlySet<string>, id: string) => Set<string>`
  - `useToolReadiness(checks: Check[]) => { blocking: Check[]; degrading: Check[]; ready: boolean; dismiss: (id: string) => void }`

State is a `useState<Set<string>>`. It is **not** persisted — per-session dismissal resets on reload, by construction. That is the spec'd behaviour, not an oversight.

- [ ] **Step 1: Write the failing test**

Append to `apps/camora/src/components/lumora/shared/readiness.test.ts`:

```typescript
import { dismissReducer } from './useToolReadiness';

describe('dismissReducer', () => {
  it('adds an id without mutating the input set', () => {
    const before = new Set(['a']);
    const after = dismissReducer(before, 'b');
    expect([...after].sort()).toEqual(['a', 'b']);
    expect([...before]).toEqual(['a']); // no mutation — stale-closure safety
  });

  it('is idempotent', () => {
    expect([...dismissReducer(new Set(['a']), 'a')]).toEqual(['a']);
  });

  it('returns a NEW reference every call so React re-renders', () => {
    const before = new Set(['a']);
    expect(dismissReducer(before, 'a')).not.toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chundu/camora && npx vitest run --root apps/camora apps/camora/src/components/lumora/shared/readiness.test.ts -t dismissReducer
```

Expected: FAIL — `Failed to resolve import "./useToolReadiness"`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/camora/src/components/lumora/shared/useToolReadiness.ts`:

```typescript
import { useCallback, useMemo, useState } from 'react';
import { type Check, summarize } from './readiness';

/**
 * Pure. Returns a NEW Set every call — `useState` bails out of a re-render when
 * the next state is Object.is-equal to the previous one, so mutating and
 * returning the same Set would silently drop the update.
 */
export function dismissReducer(state: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(state);
  next.add(id);
  return next;
}

/**
 * Per-session dismissal. Deliberately NOT persisted: ignoring a degrading check
 * silences it until reload, so the next interview re-warns. Persisting it
 * forever would let the amber chip become wallpaper and hide the one check that
 * mattered.
 */
export function useToolReadiness(checks: Check[]) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => dismissReducer(prev, id));
  }, []);

  // `checks` is rebuilt on every render by the caller; memoise on its contents,
  // not its identity, or this recomputes every keystroke in the editor.
  const key = checks.map((c) => `${c.id}:${c.satisfied ? 1 : 0}`).join('|');
  const result = useMemo(
    () => summarize(checks, dismissed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, dismissed],
  );

  return { ...result, dismiss };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chundu/camora && npx vitest run --root apps/camora apps/camora/src/components/lumora/shared/readiness.test.ts
```

Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/camora/src/components/lumora/shared/useToolReadiness.ts apps/camora/src/components/lumora/shared/readiness.test.ts
git commit -m "$(cat <<'EOF'
feat(lumora): useToolReadiness — per-session dismissal of degrading checks

dismissReducer returns a new Set every call; useState bails out on
Object.is equality, so an in-place add would silently drop the re-render.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `<ReadinessChip>` — chip + popover

**Files:**
- Create: `apps/camora/src/components/lumora/shared/ReadinessChip.tsx`

**Interfaces:**
- Consumes: `Check` (Task 4)
- Produces:
  ```typescript
  interface ReadinessChipProps {
    blocking: Check[];
    degrading: Check[];
    onDismiss: (id: string) => void;
    /** Optional per-check remedies, e.g. { problem: [{ label: 'Snap', onClick }] } */
    actions?: Record<string, Array<{ label: string; onClick: () => void; primary?: boolean }>>;
  }
  export function ReadinessChip(props: ReadinessChipProps): JSX.Element | null
  ```

**No unit test.** `@testing-library/react` is not a dependency of `apps/camora`, and adding it for one component is out of scope for B0. All logic lives in Tasks 4-5, which *are* tested. This component is presentation. Verified by the manual script in Task 8.

- [ ] **Step 1: Write the component**

Create `apps/camora/src/components/lumora/shared/ReadinessChip.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Check } from './readiness';

export interface ReadinessChipProps {
  blocking: Check[];
  degrading: Check[];
  onDismiss: (id: string) => void;
  actions?: Record<string, Array<{ label: string; onClick: () => void; primary?: boolean }>>;
}

/**
 * Renders nothing when every check passes and nothing is blocking — an always-on
 * "● Ready" pill is chrome that teaches nothing. It appears only when it has
 * something to say.
 */
export function ReadinessChip({ blocking, degrading, onDismiss, actions }: ReadinessChipProps) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [...blocking, ...degrading];
  if (items.length === 0) return null;

  const isBlocked = blocking.length > 0;
  // --danger and --warning/--warning-text are the real tokens (globals.css:55-56,
  // 235-236). There is no --error or --error-text in this codebase.
  const tone = isBlocked
    ? { border: 'var(--danger)', color: 'var(--danger)', bg: 'color-mix(in oklab, var(--danger) 10%, transparent)' }
    : { border: 'var(--warning)', color: 'var(--warning-text)', bg: 'color-mix(in oklab, var(--warning) 10%, transparent)' };

  return (
    <div ref={hostRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="h-6 px-2.5 rounded text-[11px] font-bold tracking-[0.04em] inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
        style={{ border: `1px solid ${tone.border}`, color: tone.color, background: tone.bg }}
      >
        <span aria-hidden="true">▲</span>
        {items.length} {items.length === 1 ? 'check' : 'checks'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Readiness checks"
          className="absolute top-[calc(100%+8px)] right-0 z-30 w-[306px] rounded-lg p-1.5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 40px -12px rgba(0,0,0,0.55)',
          }}
        >
          {items.map((c, i) => (
            <div
              key={c.id}
              className="p-2.5 rounded"
              style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
            >
              <div className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                <span aria-hidden="true" className="text-[10px]" style={{ color: c.severity === 'blocking' ? 'var(--danger)' : 'var(--warning)' }}>▲</span>
                {c.label}
              </div>
              <p className="mt-1.5 ml-[18px] text-[12px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                {c.consequence}
              </p>
              <div className="mt-2 ml-[18px] flex gap-1.5 flex-wrap">
                {(actions?.[c.id] ?? []).map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => { a.onClick(); setOpen(false); }}
                    className="h-6 px-2 rounded text-[10px] font-bold tracking-[0.06em]"
                    style={{
                      border: `1px solid ${a.primary ? 'var(--cam-primary)' : 'var(--border)'}`,
                      color: a.primary ? 'var(--cam-primary)' : 'var(--text-secondary)',
                      background: 'transparent',
                    }}
                  >
                    {a.label}
                  </button>
                ))}
                {c.severity === 'degrading' && (
                  <button
                    type="button"
                    onClick={() => onDismiss(c.id)}
                    className="h-6 px-2 rounded text-[10px] font-bold tracking-[0.06em]"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
                  >
                    Ignore this session
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/chundu/camora/apps/camora && npx vite build
```

Expected: build succeeds. (Tree-shaken out — nothing imports it yet.)

- [ ] **Step 3: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/camora/src/components/lumora/shared/ReadinessChip.tsx
git commit -m "$(cat <<'EOF'
feat(lumora): ReadinessChip — amber chip + popover naming each consequence

Renders nothing when there is nothing to say. Popover, never a modal.
Degrading checks get "Ignore this session"; blocking checks never do.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wire the gate into Coding

**Files:**
- Modify: `apps/camora/src/components/lumora/coding/CodingLayout.tsx` — imports, hook call, `:2494-2515` (button + chip)

**Interfaces:**
- Consumes: `codingChecks` (Task 4), `useToolReadiness` (Task 5), `ReadinessChip` (Task 6)
- Produces: nothing

Existing state to read (verified): `problemText` (`:323`), `starterCode` (`:337`).

**`activeAssistant` does NOT exist in `CodingLayout`.** It is CoFix-local
(`CoFixLayout.tsx:248`), built from `getActiveAssistant()` in
`@/lib/lumora-assistant` (`:60`). Import it the same way rather than reaching for
a store selector that does not exist.

- [ ] **Step 1: Add the imports**

Near the other `@/components/lumora` imports at the top of `CodingLayout.tsx`:

```typescript
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { codingChecks } from '@/components/lumora/shared/readiness';
import { useToolReadiness } from '@/components/lumora/shared/useToolReadiness';
import { ReadinessChip } from '@/components/lumora/shared/ReadinessChip';
```

- [ ] **Step 2: Compute the checks**

Immediately after the `starterCodeRef` declaration (`:442`), add:

```typescript
  // getActiveAssistant() reads localStorage, so it must not be called during
  // render on every keystroke. CoFixLayout.tsx:242-248 memoises it against an
  // `assistantVersion` counter; here there is no mutation path, so mount-once
  // is correct and sufficient.
  const activeAssistant = useMemo(() => getActiveAssistant(), []);

  const readinessChecks = codingChecks({
    problemText,
    starterCode,
    company: activeAssistant?.company ?? null,
  });
  const { blocking, degrading, dismiss } = useToolReadiness(readinessChecks);
```

> `useMemo` is already imported in this file. If the company can change while
> Coding is mounted, this goes stale — accept it for B0 and note it. Do **not**
> invent a new store selector to satisfy a check: a `company` check that reads
> stale is a visible, honest bug; a wrong selector is an invisible one.

- [ ] **Step 3: Mount the chip and amber the button**

Replace the button's `className`/`style` (`:2507-2508`) and wrap it. The
`disabled` prop is **unchanged** — it already encodes exactly the blocking check.

```tsx
                  <div className="flex items-center gap-2 w-full">
                    <ReadinessChip
                      blocking={blocking}
                      degrading={degrading}
                      onDismiss={dismiss}
                      actions={{
                        'io-contract': [{ label: 'Paste problem', primary: true, onClick: () => setProblemTab('description') }],
                        starter: [{ label: 'Paste template', onClick: () => setProblemTab('description') }],
                      }}
                    />
                    <button
                      onClick={/* unchanged */}
                      disabled={isLoading || (!problemText.trim() && !multiPageCapturing)}
                      className="flex-1 py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-[opacity,transform] active:scale-[0.98] flex items-center justify-center gap-2"
                      style={
                        degrading.length > 0
                          ? { background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning-text)', borderRadius: '10px' }
                          : { background: 'linear-gradient(135deg, var(--cam-primary), var(--cam-primary))', borderRadius: '10px' }
                      }
                    >
                      {/* unchanged children, plus: */}
                      {degrading.length > 0 && !isLoading && <span aria-hidden="true">▲</span>}
                    </button>
                  </div>
```

> `w-full` moves from the button to the wrapper; the button becomes `flex-1`.
> Leaving `w-full` on both makes the chip overflow the panel.

- [ ] **Step 4: Verify**

```bash
cd /Users/chundu/camora/apps/camora && npx vite build && npx eslint src/components/lumora/shared src/components/lumora/coding/CodingLayout.tsx
```

Expected: build succeeds; eslint clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/camora/src/components/lumora/coding/CodingLayout.tsx
git commit -m "$(cat <<'EOF'
feat(coding): warn before solving a problem we never saw

The OCR failure banner sat directly above a live Coding button. Now a bare
prompt with no starter code raises "Solve will invent an I/O contract" and
the button turns amber. It never disables — nothing blocks mid-session.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Wire the gate into CoFix, then drive both

**Files:**
- Modify: `apps/camora/src/components/lumora/cofix/CoFixLayout.tsx` — imports, hook call, `:1008-1016`

**Interfaces:**
- Consumes: `cofixChecks` (Task 4), `useToolReadiness` (Task 5), `ReadinessChip` (Task 6)
- Produces: nothing

Existing state to read (verified): `inputCode` (`:107`), `problemContextRef.current` (`:137-140`), `activeAssistant?.company` (`:439`).

`problemContextRef` is a **ref**, so it does not trigger a re-render. Mirror it into
state, or the chip will not update when a snap lands.

- [ ] **Step 1: Add imports and mirror the ref into state**

```typescript
import { cofixChecks } from '@/components/lumora/shared/readiness';
import { useToolReadiness } from '@/components/lumora/shared/useToolReadiness';
import { ReadinessChip } from '@/components/lumora/shared/ReadinessChip';
```

At `:137-140`, the ref is assigned inside an effect. Add a state mirror alongside it:

```typescript
  const problemContextRef = useRef('');
  const [problemContext, setProblemContext] = useState('');
  useEffect(() => {
    const next = snapped || analysis?.problem?.trim() || '';
    problemContextRef.current = next;
    setProblemContext(next);   // ref alone never re-renders the chip
  }, [snapped, analysis]);
```

> Keep the ref. `handleFix` reads it inside a callback (`:440`, `:634`, `:701`) and
> must not capture a stale value. The state is *only* for rendering.

- [ ] **Step 2: Compute the checks**

```typescript
  const { blocking, degrading, dismiss } = useToolReadiness(
    cofixChecks({ inputCode, problemContext, company: activeAssistant?.company ?? null }),
  );
```

- [ ] **Step 3: Mount the chip beside the CoFix button**

In the "Broken Code" pane header (`:1007-1017`), between the label and the button:

```tsx
            <div className="flex items-center gap-2">
              <ReadinessChip
                blocking={blocking}
                degrading={degrading}
                onDismiss={dismiss}
                actions={{ problem: [{ label: 'Snap', primary: true, onClick: () => handleSnap() }] }}
              />
              <button
                onClick={() => handleFix()}
                disabled={inputCode.trim().length < 5 || isLoading}
                className="h-6 px-3 rounded text-[10px] font-bold uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={
                  degrading.length > 0
                    ? { background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning-text)' }
                    : { background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }
                }
              >
                {isLoading ? 'Analyzing…' : degrading.length > 0 ? 'CoFix ▲' : 'CoFix'}
              </button>
            </div>
```

- [ ] **Step 4: Run every test and the full build**

```bash
cd /Users/chundu/camora
npx vitest run --root apps/camora apps/camora/src/components/lumora/shared/
cd apps/lumora-backend && npx vitest run
cd ../camora && npx vite build && npx eslint src/components/lumora/cofix/CoFixLayout.tsx
```

Expected: all green.

- [ ] **Step 5: Drive it in the real app**

Per the no-localhost rule, verify against production after deploy. Until then, drive
the built preview:

```bash
cd /Users/chundu/camora/apps/camora && npx vite preview
```

Walk the script — this is the acceptance test for B0:

1. Open **CoFix**. Paste `def f():\n    pass`. → chip reads `▲ 2 checks`; `CoFix ▲` is **amber and enabled**.
2. Open the popover. It reads *"Fix will guess what the stub should compute."* Not "problem missing".
3. Click **Ignore this session** on Company. → chip reads `▲ 1 check`.
4. Reload. → chip is back to `▲ 2 checks`. **Dismissal is per-session.**
5. Clear the editor. → `CoFix` **disables** (blocking), and the popover shows Broken code with **no Ignore button**.
6. Open **Coding**. Type `Reverse a singly linked list.` and nothing else. → `▲ 3 checks`, button amber, `Coding ▲`.
7. Paste the LeetCode two-sum text (with `Example 1:` / `Input:` / `Output:`). → the `io-contract` check clears; `▲ 2 checks`.
8. Press **Escape** with the popover open → it closes. Click outside → it closes. **No modal appears anywhere.**

- [ ] **Step 6: Commit**

```bash
cd /Users/chundu/camora && git pull --rebase
git add apps/camora/src/components/lumora/cofix/CoFixLayout.tsx
git commit -m "$(cat <<'EOF'
feat(cofix): warn when Fix has no problem statement

sse-client.ts:531 silently drops `problem` when unset, and coding.js:1908 then
guesses what the stub should compute. The chip now says so before you press Fix.

problemContextRef is mirrored into state — a ref alone never re-renders.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

**Spec coverage.** A0 §"Least-committed artifact" → Tasks 1-3. B0 §"Readiness gate"
(two severities, per-session dismissal, no modal, consequence text, `▲ N` chip)
→ Tasks 4-8. The A0 spec's `assumptions[]` schema field → Task 2 step 3d.

**Deliberately out of scope**, tracked in the specs, not here:
- `inferSubmissionContext` (four fields) — A1
- `submittable` / `optimality` per solution — A1
- `<PrereqStrip>`, `<ChipSelect>`, line binding, accordion — B1
- Behavioral and Design readiness checks — B1. B0 covers only Coding and CoFix,
  which is where the measured failure occurred.

**Two known weaknesses, stated rather than hidden:**

1. **`hasIoEvidence` is duplicated across the stack.** Unavoidable — the gate must
   warn before the request. Mitigated by shared fixture strings in both test files
   and a comment naming `coding.js` as source of truth. It *will* drift eventually.
2. **Task 3's test asserts source shape, not behavior.** There is no HTTP harness
   for `/solve`. The assertion catches a dropped argument in a refactor and proves
   nothing about runtime. A real integration test belongs with A1.

**Not covered by any test, by construction:** `<ReadinessChip>` rendering. No RTL in
this repo. Task 8 step 5 is the manual acceptance script that stands in for it.
