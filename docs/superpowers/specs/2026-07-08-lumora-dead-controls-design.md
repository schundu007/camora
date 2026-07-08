# Project D — Dead and Broken Controls

**Date:** 2026-07-08
**Status:** Approved (design)
**Lands before:** Project B (layout redesign)
**Absorbs:** Project C (stray `VoiceEnrollment`)

## Why first

B restyles toolbars. Restyling a control that is dead, duplicated, or wired to
the wrong prop is wasted work. D deletes and repairs; B then has half as much
surface to redesign.

Every defect below was verified by reading the code, not inferred.

---

## D1 — Design's `detailLevel` is unreachable and one call sends an invalid value

**Evidence** (`apps/camora/src/components/lumora/design/DesignLayout.tsx`):

```
:185  const [detailLevel, setDetailLevel] = useState<'basic' | 'full'>('full');
:410  detailLevel,                                    // correct
:714  body: JSON.stringify({ ..., detailLevel: 'detailed' })   // NOT in the union
:945  style={detailLevel === 'basic' ? ... }          // the toggle
:950  style={detailLevel === 'full'  ? ... }
```

Two independent defects:

1. `:714` hardcodes `'detailed'`, a string absent from the `'basic' | 'full'`
   union. That call ignores the user's selection *and* sends the backend a value
   it does not recognise.
2. The Basic/Full toggle sits inside the `<header>` that renders only when
   `!embedded`, and is additionally `hidden md:flex`. On the shell — the primary
   surface — the user can never reach it. It silently stays `'full'`.

**Fix:** pass `detailLevel` through at `:714`. Move the toggle out of the
suppressed header. (B relocates it into a `<ChipSelect>`; D only makes it
reachable and correct.)

**Verification:** set Basic, trigger both call paths, assert the network payload
carries `'basic'` in each. This is the one defect with a backend-visible symptom.

---

## D2 — `LumoraTopBar.tsx` is dead

**Evidence:** grep across `src/` returns two hits, both inside comments:

```
components/lumora/shell/companion/answer-view.tsx:8   // ...(StreamingAnswer, LumoraTopBar, CodingLayout)...
components/lumora/audio/AudioCapture.tsx:1189         // ...the global LumoraTopBar where it floats...
```

No import. The file defines a complete toolbar (ThemeToggle, ContextBadge,
HourMeterChip, status pill, settings gear) that never renders.

**Fix:** delete the file. Update the two stale comments so they stop referring to
a component that no longer exists.

**Risk:** the grep covers `src/` only. Before deleting, confirm no dynamic or
string-keyed import resolves it. `vite build` will not catch a
`import(\`./\${name}\`)` reference.

---

## D3 — `Header.tsx` platform `<select>` is inert

**Evidence** (`apps/camora/src/components/lumora/session/Header.tsx:198`):

```jsx
<select id="platform-select" name="platform" ... defaultValue="teams">
  <option value="general">General</option>
  ... zoom, meet, teams, hackerrank, coderpad, codility
</select>
```

`defaultValue`, no `onChange`, no bound state. Seven options that do nothing.

**Fix — wire it, do not delete it.** Its options are precisely the input that
Project A's `inferSubmissionContext()` wants. Lift to state, persist via
`userScopedStorage`, expose on the session store.

This is the single highest-value item in D: a control the product already has,
never connected, that turns A's heuristic detection into
`explicit override → heuristic fallback`.

**Note:** `general | zoom | meet | teams` are *meeting* platforms;
`hackerrank | coderpad | codility` are *assessment* platforms. One `<select>`
conflates two orthogonal concepts. B splits them into two chips. D only lifts
state; it does not restructure.

---

## D4 — CoFix renders speaker-verification controls (absorbs Project C)

**Evidence** (`apps/camora/src/components/lumora/cofix/CoFixLayout.tsx`):

```
:992  {onTranscription && <VoiceEnrollment disabled={false} variant="light" />}
```

`VoiceEnrollment.tsx:271` reads `{isLight ? 'Remove Enrollment' : <XIcon />}`.
The call site passes `variant="light"` while the toolbar is dark — so the text
label renders instead of the icon, as a bare red destructive button. The logic is
not inverted; the wrong prop is passed at the call site.

Separately, `ScreenshotStrip.tsx:403-404` documents that mic controls "don't
belong" on coding/design surfaces because Sona covers them. CoFix missed that
cleanup and carries both the mic (`:987`) and `VoiceEnrollment` (`:992`).

**Fix:** remove `VoiceEnrollment` from the CoFix toolbar entirely. Speaker
filtering is a session-level concern; it has no meaning while repairing code.

**Requires confirmation before implementing:** removing the mic at `:987` deletes
dictation-into-CoFix. `ScreenshotStrip`'s comment implies that is intended, but
it is a user-facing capability and will not be removed on the strength of a
comment. `VoiceEnrollment` goes regardless.

---

## D5 — Duplicated chrome

Reported by inventory, to be confirmed at implementation time:

| Duplicate | Locations |
|---|---|
| Timer block (15/30/45/60 + dial + stop) | `CodingLayout.tsx:2160-2190`, `DesignLayout.tsx:957-987` |
| "Generating" pulse pill | `CodingLayout.tsx:2192`, `DesignLayout.tsx:989` |
| `Reset` | every tool — **and twice within Design** (`:1010` header, `:1074` chip row), both calling the same `handleReset` |

**Fix:** extract `<Timer>`, `<GeneratingPill>`, `<ResetButton>` into
`components/lumora/shared/`. Delete Design's second `Reset`.

**Two Snap implementations.** `CoFixLayout.tsx:944` captures immediately;
`ScreenshotStrip.tsx:235` uses arm-then-blur. Same camera icon, two mental
models. **Not fixed in D** — consolidating capture semantics is behavioural, not
cosmetic, and belongs with B's prerequisite strip where Snap becomes a chip.
Recorded here so it is not forgotten.

---

## Non-goals

- No prompt, SSE, or backend-route changes. Zero files under `apps/lumora-backend/`.
- No palette or layout changes. D deletes and repairs; B redesigns.
- No new components beyond the three extractions in D5.

## Verification

1. `npx vite build` from `apps/camora` — full build, not grep-filtered `tsc`.
2. D1 is the only defect with an observable runtime symptom: select Basic,
   fire both Design call paths, assert `'basic'` on the wire both times.
3. D3: change the platform chip, reload, assert the value persists per-user.
4. D2: confirm no dynamic import before deleting; build must pass after.
5. Screenshot CoFix's toolbar before/after at the same viewport.

## Risks

- **D2 deletion is irreversible in review.** A dynamic import would not surface
  at build time. Confirm by grep for template-literal imports first.
- **D5's extraction touches three large files** (`CodingLayout.tsx` is 3,467
  lines). Extraction lands as its own commit, separate from any behaviour change,
  so a bisect can distinguish "moved the timer" from "broke the timer".
- **D3 lifts state into the session store**, which the behavioural tab also
  reads. Confirm no existing consumer keys off the absence of `platform`.
