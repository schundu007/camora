/**
 * Audio preferences — schema-agnostic JSONB blob keyed by user.
 *
 * The frontend's AudioSetupWizard owns the shape; this route just
 * persists it so a user's mic/speaker/method choices follow them
 * across devices and browsers. Same pattern as lumora_prep_state.
 */
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

const MAX_BYTES = 64 * 1024; // prefs are tiny — guard against pasted nonsense

router.get('/state', async (req, res, next) => {
  try {
    const r = await query(
      'SELECT data, updated_at FROM lumora_audio_preferences WHERE user_id = $1',
      [req.user.id],
    );
    if (r.rows.length === 0) return res.json({ data: null, updated_at: null });
    res.json({ data: r.rows[0].data, updated_at: r.rows[0].updated_at });
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
      return res.status(413).json({ error: `audio prefs exceed ${MAX_BYTES} bytes` });
    }
    const r = await query(
      `INSERT INTO lumora_audio_preferences (user_id, data, updated_at)
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

export default router;
