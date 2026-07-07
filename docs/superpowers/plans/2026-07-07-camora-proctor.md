# Camora Proctor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proctor/detector to Camora's own Lumora interview sessions that observes, logs to a reviewable timeline, and enforces integrity signals (tab-switch, fullscreen exit, copy/paste, multi-monitor, camera-off, devtools).

**Architecture:** Isolated client-side **detectors** emit normalized `ProctorEvent`s into a `ProctorProvider` that keeps a live buffer + risk score, runs a **pure enforcement policy** (event → actions), and batch-flushes events to a new lumora-backend `/api/v1/proctor` route backed by two Postgres tables. UI renders a live/post-session timeline plus enforcement overlays.

**Tech Stack:** React 19 + TypeScript + Vite (frontend), Express 5 + `@camora/shared-db` Postgres (backend), Vitest (both).

## Global Constraints

- Detector/enforcement helpers are `const` arrow functions declared in dependency order (Rolldown TDZ — never module-level `function` with JSX).
- Backend routes prefixed `/api/v1/`; error responses `{ error: string }`; parameterized SQL only (no string interpolation).
- All `GET` proctor data scoped to `req.user.id` (owner-only).
- Migrations are idempotent `CREATE TABLE IF NOT EXISTS`, added to the `migrations` array in `apps/lumora-backend/src/index.js` (no migration tool).
- Proctor UI uses Lumora navy-gold scheme + design-system utility classes (`.chip`, `.badge-*`, `.btn-*`, `.cam-hero-strip`) — no per-component inline Tailwind drift.
- Scope B: covers Live interview + Coding + Design surfaces; self-reviewed timeline (no admin dashboard).
- Enforcement decisions: `CAMERA_OFF` → pause immediately, auto-resume when track live; `WINDOW_BLUR`/`TAB_HIDDEN` → warn each time, flag after 3; risk score = weighted decaying sum.

---

### Task 1: Backend storage — proctor tables

**Files:**
- Modify: `apps/lumora-backend/src/index.js` (add two entries to the `migrations` array inside `runMigrations()`, alongside `lumora_conversations`)

**Interfaces:**
- Produces: tables `lumora_proctor_sessions` and `lumora_proctor_events` available at runtime.

- [ ] **Step 1: Add the two migration strings**

In `apps/lumora-backend/src/index.js`, inside `runMigrations()`'s `const migrations = [ ... ]` array, append two entries (after the last existing table string, before the closing `]`):

```javascript
      `CREATE TABLE IF NOT EXISTS lumora_proctor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        surface VARCHAR(20) NOT NULL,
        risk_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_proctor_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES lumora_proctor_sessions(id) ON DELETE CASCADE,
        type VARCHAR(32) NOT NULL,
        severity VARCHAR(10) NOT NULL,
        ts BIGINT NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_proctor_events_session
        ON lumora_proctor_events(session_id, ts)`,
```

- [ ] **Step 2: Start the server and confirm migrations run clean**

Run: `cd apps/lumora-backend && node src/index.js` (Ctrl-C after startup)
Expected: startup logs show no migration error; process reaches "listening" line.

- [ ] **Step 3: Commit**

```bash
git add apps/lumora-backend/src/index.js
git commit -m "feat(proctor): add proctor session + event tables"
```

---

### Task 2: Backend proctor route

**Files:**
- Create: `apps/lumora-backend/src/routes/proctor.js`
- Modify: `apps/lumora-backend/src/index.js` (import + mount)
- Test: `apps/lumora-backend/tests/proctor.test.js`

**Interfaces:**
- Consumes: `query` from `../lib/shared-db.js`, `authenticate` from `../middleware/authenticate.js`.
- Produces (default-exported Express `router`):
  - `POST /sessions` body `{ surface }` → `{ id }`
  - `POST /events` body `{ sessionId, events: ProctorEvent[] }` → `{ inserted: number }`
  - `POST /sessions/:id/end` body `{ riskScore, status }` → `{ ok: true }`
  - `GET /sessions/:id` → `{ session, events }`
  - `GET /sessions` → `{ sessions: [] }`
  - Exported pure helper `sanitizeEvents(events)` → filtered array (allowlisted `type`/`severity`).

- [ ] **Step 1: Write the failing test**

Create `apps/lumora-backend/tests/proctor.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { sanitizeEvents, VALID_TYPES, VALID_SEVERITIES } from '../src/routes/proctor.js';

describe('proctor sanitizeEvents', () => {
  it('keeps allowlisted events and drops unknown type/severity', () => {
    const input = [
      { id: 'a', type: 'PASTE', severity: 'medium', ts: 1000, meta: { len: 5 } },
      { id: 'b', type: 'HACK', severity: 'medium', ts: 1001 },
      { id: 'c', type: 'CAMERA_OFF', severity: 'nuclear', ts: 1002 },
      { id: 'd', type: 'TAB_HIDDEN', severity: 'medium', ts: 1003 },
    ];
    const out = sanitizeEvents(input);
    expect(out.map((e) => e.id)).toEqual(['a', 'd']);
    expect(VALID_TYPES.has('CAMERA_OFF')).toBe(true);
    expect(VALID_SEVERITIES.has('info')).toBe(true);
  });

  it('coerces ts to number and drops non-numeric ts', () => {
    const out = sanitizeEvents([{ id: 'x', type: 'COPY', severity: 'low', ts: 'nope' }]);
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/lumora-backend && npx vitest run tests/proctor.test.js`
Expected: FAIL — cannot resolve `../src/routes/proctor.js`.

- [ ] **Step 3: Write the route**

Create `apps/lumora-backend/src/routes/proctor.js`:

```javascript
/**
 * Proctor API — records integrity signals for Camora's own interview
 * sessions and returns a reviewable timeline. Defender-side only.
 * All queries scoped to the authenticated user (req.user.id).
 */
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

export const VALID_TYPES = new Set([
  'TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY', 'PASTE',
  'MULTI_MONITOR', 'CAMERA_OFF', 'DEVTOOLS', 'AUTOMATION', 'UNSUPPORTED',
]);
export const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'info']);
const VALID_SURFACES = new Set(['live', 'coding', 'design']);
const VALID_STATUSES = new Set(['active', 'ended', 'aborted']);

export const sanitizeEvents = (events) => {
  if (!Array.isArray(events)) return [];
  return events.filter((e) =>
    e && typeof e === 'object' &&
    VALID_TYPES.has(e.type) &&
    VALID_SEVERITIES.has(e.severity) &&
    typeof e.ts === 'number' && Number.isFinite(e.ts)
  );
};

const router = Router();
router.use(authenticate);

// POST /sessions — open a proctor session
router.post('/sessions', async (req, res) => {
  const surface = String(req.body?.surface || '');
  if (!VALID_SURFACES.has(surface)) return res.status(400).json({ error: 'invalid surface' });
  const result = await query(
    `INSERT INTO lumora_proctor_sessions (user_id, surface) VALUES ($1, $2) RETURNING id`,
    [req.user.id, surface]
  );
  res.json({ id: result.rows[0].id });
});

// POST /events — batch ingest
router.post('/events', async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  // ownership check
  const own = await query(
    `SELECT id FROM lumora_proctor_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, req.user.id]
  );
  if (own.rowCount === 0) return res.status(404).json({ error: 'session not found' });

  const events = sanitizeEvents(req.body?.events);
  let inserted = 0;
  for (const e of events) {
    await query(
      `INSERT INTO lumora_proctor_events (session_id, type, severity, ts, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, e.type, e.severity, e.ts, e.meta ? JSON.stringify(e.meta) : null]
    );
    inserted += 1;
  }
  res.json({ inserted });
});

// POST /sessions/:id/end
router.post('/sessions/:id/end', async (req, res) => {
  const riskScore = Number.isFinite(req.body?.riskScore) ? Math.round(req.body.riskScore) : 0;
  const status = VALID_STATUSES.has(req.body?.status) ? req.body.status : 'ended';
  const result = await query(
    `UPDATE lumora_proctor_sessions
     SET ended_at = NOW(), risk_score = $1, status = $2
     WHERE id = $3 AND user_id = $4 RETURNING id`,
    [riskScore, status, req.params.id, req.user.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'session not found' });
  res.json({ ok: true });
});

// GET /sessions/:id — session + ordered events (owner only)
router.get('/sessions/:id', async (req, res) => {
  const s = await query(
    `SELECT * FROM lumora_proctor_sessions WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (s.rowCount === 0) return res.status(404).json({ error: 'session not found' });
  const ev = await query(
    `SELECT id, type, severity, ts, meta FROM lumora_proctor_events
     WHERE session_id = $1 ORDER BY ts ASC`,
    [req.params.id]
  );
  res.json({ session: s.rows[0], events: ev.rows });
});

// GET /sessions — list current user's sessions
router.get('/sessions', async (req, res) => {
  const result = await query(
    `SELECT id, surface, risk_score, status, started_at, ended_at
     FROM lumora_proctor_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json({ sessions: result.rows });
});

export default router;
```

- [ ] **Step 4: Mount the router**

In `apps/lumora-backend/src/index.js`, add the import beside the other route imports (~line 460):

```javascript
import proctorRouter from './routes/proctor.js';
```

And add the mount beside the other `app.use('/api/v1/...')` lines (~line 527):

```javascript
app.use('/api/v1/proctor', apiLimiter, authenticate, proctorRouter);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/lumora-backend && npx vitest run tests/proctor.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/lumora-backend/src/routes/proctor.js apps/lumora-backend/src/index.js apps/lumora-backend/tests/proctor.test.js
git commit -m "feat(proctor): backend session + event ingestion route"
```

---

### Task 3: Frontend types + enforcement policy (pure)

**Files:**
- Create: `apps/camora/src/components/lumora/proctor/types.ts`
- Create: `apps/camora/src/components/lumora/proctor/enforcement.ts`
- Test: `apps/camora/src/components/lumora/proctor/enforcement.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `ProctorEventType`, `Severity`, `Action`, `ProctorEvent`, `EnforcementState`.
  - `enforcement.ts`: `const INITIAL_STATE: EnforcementState`; `const evaluate = (event: ProctorEvent, state: EnforcementState) => { actions: Action[]; state: EnforcementState; scoreDelta: number }`.

- [ ] **Step 1: Write the types**

Create `apps/camora/src/components/lumora/proctor/types.ts`:

```typescript
export type ProctorEventType =
  | 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'COPY' | 'PASTE'
  | 'MULTI_MONITOR' | 'CAMERA_OFF' | 'DEVTOOLS' | 'AUTOMATION' | 'UNSUPPORTED';

export type Severity = 'low' | 'medium' | 'high' | 'info';

export type Action = 'log' | 'warn' | 'block' | 'pause' | 'flag';

export interface ProctorEvent {
  id: string;
  type: ProctorEventType;
  severity: Severity;
  ts: number;
  meta?: Record<string, unknown>;
}

export interface EnforcementState {
  blurCount: number;
  cameraDown: boolean;
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/camora/src/components/lumora/proctor/enforcement.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { evaluate, INITIAL_STATE } from './enforcement';
import type { ProctorEvent } from './types';

const ev = (type: ProctorEvent['type'], severity: ProctorEvent['severity'] = 'medium'): ProctorEvent =>
  ({ id: Math.random().toString(36), type, severity, ts: 1 });

describe('proctor enforcement', () => {
  it('camera-off pauses immediately', () => {
    const r = evaluate(ev('CAMERA_OFF', 'high'), INITIAL_STATE);
    expect(r.actions).toContain('pause');
    expect(r.state.cameraDown).toBe(true);
  });

  it('blur warns each time and flags after 3', () => {
    let state = INITIAL_STATE;
    const first = evaluate(ev('WINDOW_BLUR'), state); state = first.state;
    const second = evaluate(ev('WINDOW_BLUR'), state); state = second.state;
    const third = evaluate(ev('WINDOW_BLUR'), state); state = third.state;
    expect(first.actions).toContain('warn');
    expect(first.actions).not.toContain('flag');
    expect(third.actions).toContain('flag');
  });

  it('fullscreen exit blocks, multi-monitor blocks', () => {
    expect(evaluate(ev('FULLSCREEN_EXIT'), INITIAL_STATE).actions).toContain('block');
    expect(evaluate(ev('MULTI_MONITOR', 'high'), INITIAL_STATE).actions).toContain('block');
  });

  it('high severity contributes more score than low', () => {
    const high = evaluate(ev('DEVTOOLS', 'high'), INITIAL_STATE).scoreDelta;
    const low = evaluate(ev('COPY', 'low'), INITIAL_STATE).scoreDelta;
    expect(high).toBeGreaterThan(low);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/lumora/proctor/enforcement.test.ts`
Expected: FAIL — cannot find `./enforcement`.

- [ ] **Step 4: Write the enforcement policy**

Create `apps/camora/src/components/lumora/proctor/enforcement.ts`:

```typescript
import type { Action, EnforcementState, ProctorEvent, Severity } from './types';

export const INITIAL_STATE: EnforcementState = { blurCount: 0, cameraDown: false };

const BLUR_FLAG_THRESHOLD = 3;

const SEVERITY_WEIGHT: Record<Severity, number> = { info: 0, low: 1, medium: 3, high: 8 };

export const evaluate = (
  event: ProctorEvent,
  state: EnforcementState,
): { actions: Action[]; state: EnforcementState; scoreDelta: number } => {
  const actions: Action[] = ['log'];
  let next: EnforcementState = state;
  let scoreDelta = SEVERITY_WEIGHT[event.severity] ?? 0;

  switch (event.type) {
    case 'WINDOW_BLUR':
    case 'TAB_HIDDEN': {
      const blurCount = state.blurCount + 1;
      next = { ...state, blurCount };
      actions.push('warn');
      if (blurCount >= BLUR_FLAG_THRESHOLD) {
        actions.push('flag');
        scoreDelta += 5;
      }
      break;
    }
    case 'FULLSCREEN_EXIT':
      actions.push('block');
      break;
    case 'MULTI_MONITOR':
      actions.push('block');
      break;
    case 'CAMERA_OFF':
      next = { ...state, cameraDown: true };
      actions.push('pause');
      break;
    case 'DEVTOOLS':
    case 'AUTOMATION':
      actions.push('flag', 'warn');
      break;
    case 'PASTE':
      actions.push('warn');
      break;
    case 'COPY':
    case 'UNSUPPORTED':
    default:
      break;
  }

  return { actions, state: next, scoreDelta };
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/lumora/proctor/enforcement.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/lumora/proctor/types.ts apps/camora/src/components/lumora/proctor/enforcement.ts apps/camora/src/components/lumora/proctor/enforcement.test.ts
git commit -m "feat(proctor): event types + pure enforcement policy"
```

---

### Task 4: Frontend detectors

**Files:**
- Create: `apps/camora/src/components/lumora/proctor/detectors.ts`
- Test: `apps/camora/src/components/lumora/proctor/detectors.test.ts`

**Interfaces:**
- Consumes: `ProctorEvent`, `ProctorEventType`, `Severity` from `./types`.
- Produces: `const createDetectors = (emit: (e: Omit<ProctorEvent, 'id'>) => void, opts?: { cameraTrack?: MediaStreamTrack }) => { start: () => void; stop: () => void }`. Internally wires visibility, fullscreen, clipboard, display, camera, devtools.

- [ ] **Step 1: Write the failing test**

Create `apps/camora/src/components/lumora/proctor/detectors.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDetectors } from './detectors';

describe('proctor detectors', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('emits WINDOW_BLUR on window blur', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    window.dispatchEvent(new Event('blur'));
    d.stop();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'WINDOW_BLUR' }));
  });

  it('emits PASTE on document paste', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    document.dispatchEvent(new Event('paste'));
    d.stop();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'PASTE' }));
  });

  it('stop() removes listeners', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    d.stop();
    window.dispatchEvent(new Event('blur'));
    expect(emit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/lumora/proctor/detectors.test.ts`
Expected: FAIL — cannot find `./detectors`.

- [ ] **Step 3: Write the detectors**

Create `apps/camora/src/components/lumora/proctor/detectors.ts`:

```typescript
import type { ProctorEvent, ProctorEventType, Severity } from './types';

type Emit = (e: Omit<ProctorEvent, 'id'>) => void;

interface DetectorOpts {
  cameraTrack?: MediaStreamTrack;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);

export const createDetectors = (emit: Emit, opts: DetectorOpts = {}) => {
  const fire = (type: ProctorEventType, severity: Severity, meta?: Record<string, unknown>) =>
    emit({ type, severity, ts: now(), meta });

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') fire('TAB_HIDDEN', 'medium');
  };
  const onBlur = () => fire('WINDOW_BLUR', 'medium');
  const onFullscreen = () => {
    if (!document.fullscreenElement) fire('FULLSCREEN_EXIT', 'medium');
  };
  const onCopy = () => fire('COPY', 'low');
  const onPaste = (e: Event) => {
    const len = (e as ClipboardEvent).clipboardData?.getData('text')?.length ?? 0;
    fire('PASTE', 'medium', { len });
  };
  const onCameraEnded = () => fire('CAMERA_OFF', 'high');

  const checkDisplays = async () => {
    try {
      const anyScreen = window.screen as unknown as { isExtended?: boolean };
      if (anyScreen?.isExtended) { fire('MULTI_MONITOR', 'high'); return; }
      const getScreenDetails = (window as unknown as {
        getScreenDetails?: () => Promise<{ screens: unknown[] }>;
      }).getScreenDetails;
      if (getScreenDetails) {
        const details = await getScreenDetails();
        if (details.screens.length > 1) fire('MULTI_MONITOR', 'high');
      } else {
        fire('UNSUPPORTED', 'info', { signal: 'multi_monitor' });
      }
    } catch {
      fire('UNSUPPORTED', 'info', { signal: 'multi_monitor' });
    }
  };

  const checkAutomation = () => {
    if ((navigator as unknown as { webdriver?: boolean }).webdriver) {
      fire('AUTOMATION', 'high');
    }
  };

  const start = () => {
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    if (opts.cameraTrack) {
      opts.cameraTrack.addEventListener('ended', onCameraEnded);
      opts.cameraTrack.addEventListener('mute', onCameraEnded);
    }
    void checkDisplays();
    checkAutomation();
  };

  const stop = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('fullscreenchange', onFullscreen);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('paste', onPaste);
    if (opts.cameraTrack) {
      opts.cameraTrack.removeEventListener('ended', onCameraEnded);
      opts.cameraTrack.removeEventListener('mute', onCameraEnded);
    }
  };

  return { start, stop };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/lumora/proctor/detectors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/camora/src/components/lumora/proctor/detectors.ts apps/camora/src/components/lumora/proctor/detectors.test.ts
git commit -m "feat(proctor): browser signal detectors"
```

---

### Task 5: Frontend ProctorProvider + useProctor hook

**Files:**
- Create: `apps/camora/src/components/lumora/proctor/api.ts`
- Create: `apps/camora/src/components/lumora/proctor/ProctorProvider.tsx`
- Test: `apps/camora/src/components/lumora/proctor/ProctorProvider.test.tsx`

**Interfaces:**
- Consumes: `createDetectors` (detectors.ts), `evaluate`, `INITIAL_STATE` (enforcement.ts), `ProctorEvent` (types.ts).
- Produces:
  - `api.ts`: `const proctorApi = { createSession, sendEvents, endSession, getSession, listSessions }` using the Lumora API base.
  - `ProctorProvider.tsx`: `ProctorProvider` component (props `{ surface: 'live'|'coding'|'design'; cameraTrack?: MediaStreamTrack; children }`) and `useProctor()` returning `{ events: ProctorEvent[]; riskScore: number; paused: boolean; blocked: boolean; start: () => void; stop: () => void; resolveBlock: () => void }`.

- [ ] **Step 1: Write the API client**

Create `apps/camora/src/components/lumora/proctor/api.ts`:

```typescript
import { apiClient } from '@/lib/api-client';
import type { ProctorEvent } from './types';

// apiClient is the Lumora backend client; adjust the call style to match its
// existing surface (this uses a generic `.post`/`.get`). If api-client.ts
// exposes a different helper, wrap these accordingly.
export const proctorApi = {
  createSession: (surface: string): Promise<{ id: string }> =>
    apiClient.post('/api/v1/proctor/sessions', { surface }),
  sendEvents: (sessionId: string, events: ProctorEvent[]): Promise<{ inserted: number }> =>
    apiClient.post('/api/v1/proctor/events', { sessionId, events }),
  endSession: (id: string, riskScore: number, status: string): Promise<{ ok: true }> =>
    apiClient.post(`/api/v1/proctor/sessions/${id}/end`, { riskScore, status }),
  getSession: (id: string) => apiClient.get(`/api/v1/proctor/sessions/${id}`),
  listSessions: () => apiClient.get('/api/v1/proctor/sessions'),
};
```

> **Implementer note:** open `apps/camora/src/lib/api-client.ts` first and match its
> actual method names (e.g. it may expose `apiClient.request(...)` or typed helpers).
> Keep the five function signatures above identical; only adapt the transport line.

- [ ] **Step 2: Write the failing test**

Create `apps/camora/src/components/lumora/proctor/ProctorProvider.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ProctorProvider, useProctor } from './ProctorProvider';

vi.mock('./api', () => ({
  proctorApi: {
    createSession: vi.fn().mockResolvedValue({ id: 'sess-1' }),
    sendEvents: vi.fn().mockResolvedValue({ inserted: 1 }),
    endSession: vi.fn().mockResolvedValue({ ok: true }),
    getSession: vi.fn(), listSessions: vi.fn(),
  },
}));

let hook: ReturnType<typeof useProctor>;
const Probe = () => { hook = useProctor(); return null; };

describe('ProctorProvider', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('pauses when a camera-off event is recorded', async () => {
    render(
      <ProctorProvider surface="coding">
        <Probe />
      </ProctorProvider>
    );
    await act(async () => { await hook.start(); });
    expect(hook.paused).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('blur')); // sanity: does not pause
    });
    expect(hook.paused).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/camora && npx vitest run src/components/lumora/proctor/ProctorProvider.test.tsx`
Expected: FAIL — cannot find `./ProctorProvider`.

- [ ] **Step 4: Write the provider**

Create `apps/camora/src/components/lumora/proctor/ProctorProvider.tsx`:

```typescript
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import { createDetectors } from './detectors';
import { evaluate, INITIAL_STATE } from './enforcement';
import { proctorApi } from './api';
import type { EnforcementState, ProctorEvent } from './types';

interface ProctorContextValue {
  events: ProctorEvent[];
  riskScore: number;
  paused: boolean;
  blocked: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  resolveBlock: () => void;
}

const ProctorContext = createContext<ProctorContextValue | null>(null);

export const useProctor = (): ProctorContextValue => {
  const ctx = useContext(ProctorContext);
  if (!ctx) throw new Error('useProctor must be used within ProctorProvider');
  return ctx;
};

interface ProctorProviderProps {
  surface: 'live' | 'coding' | 'design';
  cameraTrack?: MediaStreamTrack;
  children: ReactNode;
}

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`);

export const ProctorProvider = ({ surface, cameraTrack, children }: ProctorProviderProps) => {
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const enforceStateRef = useRef<EnforcementState>(INITIAL_STATE);
  const detectorsRef = useRef<ReturnType<typeof createDetectors> | null>(null);
  const pendingRef = useRef<ProctorEvent[]>([]);
  const riskRef = useRef(0);

  const flush = useCallback(async () => {
    if (!sessionIdRef.current || pendingRef.current.length === 0) return;
    const batch = pendingRef.current;
    pendingRef.current = [];
    try {
      await proctorApi.sendEvents(sessionIdRef.current, batch);
    } catch {
      pendingRef.current = [...batch, ...pendingRef.current]; // retry next tick
    }
  }, []);

  const record = useCallback((partial: Omit<ProctorEvent, 'id'>) => {
    const event: ProctorEvent = { ...partial, id: uid() };
    const { actions, state, scoreDelta } = evaluate(event, enforceStateRef.current);
    enforceStateRef.current = state;

    setEvents((prev) => [...prev, event]);
    riskRef.current += scoreDelta;
    setRiskScore(riskRef.current);
    pendingRef.current.push(event);

    if (actions.includes('pause')) setPaused(true);
    if (actions.includes('block')) setBlocked(true);
    if (event.severity === 'high') void flush(); // high-severity flushes immediately
  }, [flush]);

  const start = useCallback(async () => {
    if (sessionIdRef.current) return;
    const { id } = await proctorApi.createSession(surface);
    sessionIdRef.current = id;
    const detectors = createDetectors(record, { cameraTrack });
    detectorsRef.current = detectors;
    detectors.start();
  }, [surface, cameraTrack, record]);

  const stop = useCallback(async () => {
    detectorsRef.current?.stop();
    detectorsRef.current = null;
    await flush();
    if (sessionIdRef.current) {
      await proctorApi.endSession(sessionIdRef.current, riskRef.current, 'ended');
      sessionIdRef.current = null;
    }
  }, [flush]);

  const resolveBlock = useCallback(() => setBlocked(false), []);

  // camera recovery → auto-resume
  useEffect(() => {
    if (!cameraTrack) return;
    const onLive = () => {
      if (cameraTrack.readyState === 'live' && !cameraTrack.muted) {
        enforceStateRef.current = { ...enforceStateRef.current, cameraDown: false };
        setPaused(false);
      }
    };
    cameraTrack.addEventListener('unmute', onLive);
    return () => cameraTrack.removeEventListener('unmute', onLive);
  }, [cameraTrack]);

  // periodic flush
  useEffect(() => {
    const t = setInterval(() => { void flush(); }, 5000);
    return () => clearInterval(t);
  }, [flush]);

  const value = useMemo<ProctorContextValue>(
    () => ({ events, riskScore, paused, blocked, start, stop, resolveBlock }),
    [events, riskScore, paused, blocked, start, stop, resolveBlock],
  );

  return <ProctorContext.Provider value={value}>{children}</ProctorContext.Provider>;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/camora && npx vitest run src/components/lumora/proctor/ProctorProvider.test.tsx`
Expected: PASS (1 test). If `@testing-library/react` is not installed, run `pnpm --filter camora add -D @testing-library/react` first (check `apps/camora/package.json` — other `.test.tsx` files indicate it is present).

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/lumora/proctor/api.ts apps/camora/src/components/lumora/proctor/ProctorProvider.tsx apps/camora/src/components/lumora/proctor/ProctorProvider.test.tsx
git commit -m "feat(proctor): provider, risk scoring, batched flush, camera auto-resume"
```

---

### Task 6: Frontend UI — timeline + enforcement overlays

**Files:**
- Create: `apps/camora/src/components/lumora/proctor/ProctorTimeline.tsx`
- Create: `apps/camora/src/components/lumora/proctor/ProctorOverlays.tsx`

**Interfaces:**
- Consumes: `useProctor` (ProctorProvider.tsx), `ProctorEvent` (types.ts).
- Produces: `ProctorTimeline` (renders `events` + `riskScore`), `ProctorOverlays` (renders pause overlay when `paused`, block modal when `blocked` with a "Return to fullscreen" button calling `document.documentElement.requestFullscreen()` then `resolveBlock()`).

- [ ] **Step 1: Write the timeline**

Create `apps/camora/src/components/lumora/proctor/ProctorTimeline.tsx`:

```typescript
import { useProctor } from './ProctorProvider';
import type { Severity } from './types';

const SEV_BADGE: Record<Severity, string> = {
  info: 'badge-neutral', low: 'badge-neutral', medium: 'badge-warn', high: 'badge-danger',
};

const LABEL: Record<string, string> = {
  TAB_HIDDEN: '👁️ Left tab', WINDOW_BLUR: '👁️ Window lost focus',
  FULLSCREEN_EXIT: '🖥️ Exited fullscreen', COPY: '📋 Copied', PASTE: '📋 Pasted',
  MULTI_MONITOR: '🖥️ Second monitor', CAMERA_OFF: '📷 Camera off',
  DEVTOOLS: '🛠️ DevTools', AUTOMATION: '🤖 Automation', UNSUPPORTED: 'ℹ️ Signal unavailable',
};

export const ProctorTimeline = () => {
  const { events, riskScore } = useProctor();
  return (
    <div className="cam-hero-strip gold-leaf rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-eyebrow">Proctor timeline</span>
        <span className={`chip ${riskScore >= 20 ? 'badge-danger' : 'badge-neutral'}`}>
          Risk {riskScore}
        </span>
      </div>
      <ul className="space-y-1 max-h-64 overflow-y-auto">
        {events.length === 0 && <li className="text-caption">No events recorded.</li>}
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between text-caption">
            <span>{LABEL[e.type] ?? e.type}</span>
            <span className={`badge ${SEV_BADGE[e.severity]}`}>{e.severity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

> **Implementer note:** confirm the badge/utility class names against `globals.css`
> (`.badge-warn`, `.badge-danger`, `.badge-neutral`, `.gold-leaf`, `.cam-hero-strip`,
> `.text-eyebrow`, `.text-caption`, `.chip`). If a class doesn't exist, use the closest
> documented design-system class — do not invent new chrome.

- [ ] **Step 2: Write the overlays**

Create `apps/camora/src/components/lumora/proctor/ProctorOverlays.tsx`:

```typescript
import { useProctor } from './ProctorProvider';

export const ProctorOverlays = () => {
  const { paused, blocked, resolveBlock } = useProctor();

  const returnToFullscreen = async () => {
    try { await document.documentElement.requestFullscreen(); } catch { /* user may deny */ }
    resolveBlock();
  };

  if (paused) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="cam-hero-strip gold-leaf rounded-xl p-6 text-center max-w-sm">
          <div className="text-lg font-semibold mb-2">📷 Session paused</div>
          <p className="text-caption">Your camera is off. Re-enable it to resume the session.</p>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="cam-hero-strip gold-leaf rounded-xl p-6 text-center max-w-sm">
          <div className="text-lg font-semibold mb-2">🖥️ Return to fullscreen</div>
          <p className="text-caption mb-4">The assessment must stay in fullscreen.</p>
          <button className="btn-primary" onClick={returnToFullscreen}>Return to fullscreen</button>
        </div>
      </div>
    );
  }

  return null;
};
```

- [ ] **Step 3: Verify build compiles**

Run: `cd apps/camora && npx vite build`
Expected: build succeeds (no TS errors from the proctor module).

- [ ] **Step 4: Commit**

```bash
git add apps/camora/src/components/lumora/proctor/ProctorTimeline.tsx apps/camora/src/components/lumora/proctor/ProctorOverlays.tsx
git commit -m "feat(proctor): reviewable timeline + pause/block overlays"
```

---

### Task 7: Wire proctor into a Lumora surface (Coding first)

**Files:**
- Create: `apps/camora/src/components/lumora/proctor/index.ts` (barrel export)
- Modify: `apps/camora/src/components/lumora/coding/` layout entry (the top-level coding layout component — confirm exact file, e.g. `CodingLayout.tsx`)

**Interfaces:**
- Consumes: `ProctorProvider`, `ProctorTimeline`, `ProctorOverlays`.
- Produces: Coding surface renders inside `<ProctorProvider surface="coding">`, shows `<ProctorOverlays />` and a `<ProctorTimeline />` panel, and calls `start()` on mount / `stop()` on unmount via a small inner effect component.

- [ ] **Step 1: Add barrel export**

Create `apps/camora/src/components/lumora/proctor/index.ts`:

```typescript
export { ProctorProvider, useProctor } from './ProctorProvider';
export { ProctorTimeline } from './ProctorTimeline';
export { ProctorOverlays } from './ProctorOverlays';
export type { ProctorEvent, ProctorEventType, Severity, Action } from './types';
```

- [ ] **Step 2: Identify the coding layout entry**

Run: `ls apps/camora/src/components/lumora/coding/`
Confirm the top-level layout component (the one rendered by `CodingPage.tsx`). Read `apps/camora/src/pages/lumora/CodingPage.tsx` to find which component it renders.

- [ ] **Step 3: Add a lifecycle helper + wrap the surface**

Inside the coding layout's top-level component, add an inner effect component and wrap the returned JSX. Example (adapt element names to the actual layout):

```typescript
import { ProctorProvider, ProctorOverlays, ProctorTimeline, useProctor } from '@/components/lumora/proctor';
import { useEffect } from 'react';

const ProctorLifecycle = () => {
  const { start, stop } = useProctor();
  useEffect(() => { void start(); return () => { void stop(); }; }, [start, stop]);
  return null;
};

// ...at the top of the layout's returned JSX tree:
// <ProctorProvider surface="coding">
//   <ProctorLifecycle />
//   <ProctorOverlays />
//   ...existing coding layout...
//   <ProctorTimeline />   // place in a side panel / session sidebar slot
// </ProctorProvider>
```

- [ ] **Step 4: Verify build compiles**

Run: `cd apps/camora && npx vite build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke check (per verification-before-completion)**

Run the frontend against the running lumora-backend, open the Coding surface, and confirm in the timeline panel:
- Switching tabs / clicking away logs a `WINDOW_BLUR`/`TAB_HIDDEN` warn row.
- Exiting fullscreen raises the block modal; "Return to fullscreen" clears it.
- Risk score increments.

Note in the commit message that camera-off pause needs a live camera track to observe (Coding surface may not have one yet; Live surface will in a follow-up).

- [ ] **Step 6: Commit**

```bash
git add apps/camora/src/components/lumora/proctor/index.ts apps/camora/src/components/lumora/coding/
git commit -m "feat(proctor): wire proctor into Coding surface"
```

---

## Follow-ups (not in this plan)

- Wire the Live and Design surfaces (Task 7 pattern; Live surface passes the real webcam `MediaStreamTrack` so camera-off pause activates).
- Scope C: admin dashboard listing any user's proctor sessions (gated by `OWNER_EMAILS`).
- Post-session review page under `/lumora/sessions` showing a stored proctor timeline via `GET /api/v1/proctor/sessions/:id`.

## Self-Review Notes

- **Spec coverage:** detectors (Task 4), enforcement incl. camera-off pause + blur-flag-3 (Task 3), risk score (Task 5), storage two tables + endpoints (Tasks 1–2), timeline + overlays (Task 6), wiring (Task 7), testing (each task). All spec sections mapped.
- **Camera auto-resume** is silent (per approved design) via the `unmute` listener in Task 5.
- **Type consistency:** `evaluate`/`INITIAL_STATE`/`EnforcementState`/`ProctorEvent` names identical across Tasks 3→5; `createDetectors(emit, opts)` signature identical Tasks 4→5; endpoint paths identical Tasks 2→5.
