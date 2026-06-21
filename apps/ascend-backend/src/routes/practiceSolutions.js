import express from 'express';
import { query } from '../config/database.js';
import { cacheGet, cacheSet } from '../services/redis.js';

const router = express.Router();
const REDIS_PREFIX = 'practice-sol:';
const REDIS_TTL = 365 * 24 * 60 * 60;

router.get('/solution', async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'Missing key' });
  try {
    const cached = await cacheGet(REDIS_PREFIX + key);
    if (cached) return res.json({ solution: cached, source: 'cache' });
    const result = await query(
      'SELECT solution_text FROM practice_solutions WHERE problem_key = $1',
      [key]
    );
    if (result.rows.length > 0) {
      const sol = result.rows[0].solution_text;
      cacheSet(REDIS_PREFIX + key, sol, REDIS_TTL).catch(() => {});
      return res.json({ solution: sol, source: 'db' });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('[practice-solutions] GET error:', err.message);
    res.status(500).json({ error: 'Cache lookup failed' });
  }
});

router.post('/solution', async (req, res) => {
  const { key, category, solution } = req.body;
  if (!key || !solution) return res.status(400).json({ error: 'Missing key or solution' });
  try {
    await query(
      `INSERT INTO practice_solutions (problem_key, category, solution_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (problem_key) DO NOTHING`,
      [key, category || 'coding', solution]
    );
    cacheSet(REDIS_PREFIX + key, solution, REDIS_TTL).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error('[practice-solutions] POST error:', err.message);
    res.status(500).json({ error: 'Cache save failed' });
  }
});

export default router;
