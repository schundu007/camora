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
  return events
    .filter((e) =>
      e && typeof e === 'object' &&
      VALID_TYPES.has(e.type) &&
      VALID_SEVERITIES.has(e.severity) &&
      typeof e.ts === 'number' && Number.isFinite(e.ts)
    )
    .map((e) => ({ ...e, ts: Math.trunc(e.ts) }));
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
