/**
 * Prep workspace state — backend persistence for the Lumora Prep Kit.
 *
 * The Prep Kit panel (apps/frontend/src/components/lumora/shell/LumoraDocsPanel.tsx)
 * keeps its workspaces in localStorage under the key `lumora_prep_v8`.
 * That meant clearing browser data, switching devices, or opening
 * incognito wiped a user's JD/resume — and Sona then had no context.
 *
 * This route stores the same JSON blob in PostgreSQL keyed by user_id,
 * so the panel can hydrate on session start and write through on save.
 *
 * The blob shape is owned by the frontend (PrepData in LumoraDocsPanel);
 * this route is intentionally schema-agnostic — we only enforce a size
 * cap and the requirement that the value is a JSON object. Schema
 * evolution stays in the client.
 */
import { Router } from 'express';
import { query } from '@camora/shared-db';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

// Cap at 2 MB serialized — a healthy JD + resume + cover letter +
// generated prep sections should fit comfortably; anything larger
// suggests pasted nonsense or abuse.
const MAX_BYTES = 2 * 1024 * 1024;

router.get('/state', async (req, res, next) => {
  try {
    const r = await query(
      'SELECT data, updated_at FROM lumora_prep_state WHERE user_id = $1',
      [req.user.id],
    );
    if (r.rows.length === 0) {
      return res.json({ data: null, updated_at: null });
    }
    res.json({
      data: r.rows[0].data,
      updated_at: r.rows[0].updated_at,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/state', async (req, res, next) => {
  try {
    const { data } = req.body || {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'data must be a JSON object' });
    }
    const serialized = JSON.stringify(data);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) {
      return res.status(413).json({
        error: `prep state exceeds ${MAX_BYTES / (1024 * 1024)} MB`,
      });
    }
    const r = await query(
      `INSERT INTO lumora_prep_state (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING updated_at`,
      [req.user.id, serialized],
    );
    res.json({ updated_at: r.rows[0].updated_at });
  } catch (err) {
    next(err);
  }
});

router.delete('/state', async (req, res, next) => {
  try {
    await query('DELETE FROM lumora_prep_state WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
