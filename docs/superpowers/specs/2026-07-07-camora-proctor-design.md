# Camora Proctor — Design

**Date:** 2026-07-07
**Status:** Approved design, pending implementation plan
**Scope:** B — all Lumora live surfaces (Live interview + Coding + Design), self-reviewed timeline

## Purpose

Give Camora's own interview sessions a **proctor/detector** that observes, logs, and
enforces integrity signals — the same class of client-side signals a platform like
HackerRank watches. Goals:

1. **Transparency / education** — by implementing the detector, the owner understands
   exactly which browser signals a proctor can observe (and their blind spots, e.g. it
   cannot see native desktop apps).
2. **Reviewable timeline** — every signal is timestamped and persisted for post-session review.
3. **Enforcement** — a configurable policy reacts in real time (warn / block / pause / flag).

This is the **defender** side only. It does not include, and will not include,
any capability to evade, mask, or defeat a third party's proctoring.

## Non-Goals

- No instrumenting/reverse-engineering of any third-party (e.g. HackerRank) proctor page.
- No detection-evasion, focus masking, monitor hiding, or camera/screen-share spoofing.
- No admin/role dashboard yet (Scope C) — events are persisted server-side so it can be
  layered later without rework.

## Architecture

Three layers, one direction of data flow:

```
Detectors (isolated signal-watchers)
        │  emit normalized ProctorEvent { id, type, severity, ts, meta }
        ▼
Proctor core (buffer + running risk score)
        ├──► Enforcement engine (policy table: type → action)
        │         └──► session UI: toasts / banners / modal gates / pause overlay
        └──► batched flush ──► backend /api/v1/proctor  (persist + summarize)
```

- **Frontend**: `apps/camora/src/components/lumora/proctor/`
  - `ProctorProvider.tsx` — context; owns the event buffer, risk score, flush loop.
  - `useProctor.ts` — hook exposing `events`, `riskScore`, `status`, `startSession`, `endSession`.
  - `detectors/` — one module per signal (below), each `start(emit)` / `stop()`.
  - `enforcement.ts` — pure policy: `(event, state) => Action[]`.
  - `ProctorTimeline.tsx` — live + post-session reviewable event list with severity chips.
  - `ProctorOverlays.tsx` — warning toasts/banners, block modal, pause overlay.
- **Backend**: `apps/lumora-backend/src/routes/proctor.js`, mounted at `/api/v1/proctor`.

## Detectors

Each detector is isolated, has `start(emit)` / `stop()`, and emits exactly one normalized
`ProctorEvent` shape. No detector knows about enforcement or the network.

| Module | Watches | Event type(s) | Severity |
|---|---|---|---|
| `visibilityDetector` | `visibilitychange`, `blur`/`focus` | `TAB_HIDDEN`, `WINDOW_BLUR` | medium |
| `fullscreenDetector` | `fullscreenchange` | `FULLSCREEN_EXIT` | medium |
| `clipboardDetector` | `copy`/`paste` | `COPY`, `PASTE` | low/medium |
| `displayDetector` | `getScreenDetails()` / `screen.isExtended` | `MULTI_MONITOR` | high |
| `cameraDetector` | `MediaStreamTrack` `mute`/`ended` | `CAMERA_OFF` | high |
| `devtoolsDetector` | window-size heuristic, `navigator.webdriver` | `DEVTOOLS`, `AUTOMATION` | high |

`ProctorEvent`: `{ id: string, type: EventType, severity: 'low'|'medium'|'high', ts: number, meta?: Record<string, unknown> }`.

Detectors that need permission/APIs (screen details, camera track) fail **open and logged**:
if the API is unavailable they emit an `UNSUPPORTED` info event rather than throwing, so the
timeline records "this signal could not be observed here."

## Data Flow

1. Detector fires → `ProctorProvider` pushes to an in-memory ring buffer and updates the
   running **risk score** (weighted sum by severity, decaying).
2. **Flush**: batched `POST /api/v1/proctor/events` every ~5s; high-severity events flush
   immediately.
3. Timeline UI reads the live buffer during the session; reads
   `GET /api/v1/proctor/sessions/:id` afterward.

## Enforcement Engine

Pure policy table maps `type → action`, tunable via a `PROCTOR_POLICY` config object without
touching detectors. Actions: `log` · `warn` (toast/banner) · `block` (modal gate) ·
`pause` (freeze surface until resolved) · `flag` (raise risk score).

| Event | Default action |
|---|---|
| `WINDOW_BLUR` / `TAB_HIDDEN` | `warn` + `log`; `flag` after N (default 3) occurrences |
| `FULLSCREEN_EXIT` | `block` modal "Return to fullscreen" + re-request; `log` |
| `MULTI_MONITOR` (at session start) | `block` pre-check: "disconnect 2nd display to begin" |
| `CAMERA_OFF` | **`pause` immediately** (hard-pause the surface); resume only when camera track is live again |
| `PASTE` | `log` + mark the pasted block in the timeline |
| `COPY` | `log` |
| `DEVTOOLS` / `AUTOMATION` | `flag` (high severity) + `warn` |

Risk score is surfaced live and stored on the session at end.

## Storage (lumora-backend)

Idempotent `CREATE TABLE IF NOT EXISTS` on startup, matching existing convention.

- `lumora_proctor_sessions`
  - `id` (uuid/text pk), `user_id`, `surface` ('live'|'coding'|'design'),
    `started_at`, `ended_at`, `risk_score` int, `status` ('active'|'ended'|'aborted')
- `lumora_proctor_events`
  - `id` pk, `session_id` fk, `type`, `severity`, `ts` (client ms) , `meta` jsonb,
    `created_at` default now()

Endpoints (under `/api/v1/proctor`, `authenticate` middleware):
- `POST /sessions` → create session, returns id
- `POST /events` → batch insert `{ sessionId, events[] }`
- `POST /sessions/:id/end` → set ended_at, final risk_score, status
- `GET /sessions/:id` → session + ordered events (owner only)
- `GET /sessions` → list current user's proctor sessions

## Error Handling

- Detector API missing/denied → emit `UNSUPPORTED` info event, never throw.
- Flush network failure → keep events in buffer, retry on next tick (no data loss within session).
- Backend rejects unknown `type`/`severity` (allowlist) → returns `{ error }`, event dropped server-side but kept in client timeline.
- Ownership enforced on all `GET` (user can only read their own sessions).

## Testing

- **Enforcement** (`enforcement.test.ts`): event → action mapping incl. the N-threshold flag
  and camera-off immediate pause; risk-score accumulation/decay.
- **Detectors**: fire a synthetic DOM/media event, assert the emitted `ProctorEvent` shape.
- **Backend** (`proctor.test.js`): create session → ingest batch → end → summary; ownership
  rejection for another user's session.

## Conventions

- Navy-gold Lumora scheme on all proctor UI (cam-hero-strip header, gold-leaf borders,
  design-system utility classes: `.chip`, `.badge-*`, `.btn-*`).
- Routes under `/api/v1/`; `{ error }` response shape; parameterized SQL.
- Detectors and enforcement are `const` arrow functions (avoid Rolldown TDZ).
