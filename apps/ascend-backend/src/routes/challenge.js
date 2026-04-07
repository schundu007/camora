import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/auth.js';

const router = Router();

/** GET /status — challenger qualification status */
router.get('/status', jwtAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT is_challenger, challenger_qualified_at, challenger_quiz_score, challenger_credits_remaining FROM ascend_subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    const row = result.rows[0] || {};
    // Check last quiz attempt for cooldown
    const lastAttempt = await query(
      "SELECT created_at FROM ascend_challenger_activity WHERE user_id = $1 AND action IN ('qualified', 'quiz_failed') ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    res.json({
      isChallenger: row.is_challenger || false,
      qualifiedAt: row.challenger_qualified_at || null,
      quizScore: row.challenger_quiz_score || null,
      creditsRemaining: row.challenger_credits_remaining || 0,
      lastAttempt: lastAttempt.rows[0]?.created_at || null,
    });
  } catch (err) {
    console.error('[Challenge] Status error:', err.message);
    res.status(500).json({ error: 'Failed to get challenge status' });
  }
});

/** POST /qualify — submit quiz results, upgrade if passed */
router.post('/qualify', jwtAuth, async (req, res) => {
  try {
    const { answers, totalScore } = req.body;
    if (typeof totalScore !== 'number') return res.status(400).json({ error: 'totalScore required' });

    // Check if already qualified
    const existing = await query('SELECT is_challenger FROM ascend_subscriptions WHERE user_id = $1', [req.user.id]);
    if (existing.rows[0]?.is_challenger) return res.json({ qualified: true, alreadyQualified: true });

    // Check 24h cooldown
    const lastAttempt = await query(
      "SELECT created_at FROM ascend_challenger_activity WHERE user_id = $1 AND action IN ('qualified', 'quiz_failed') ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    if (lastAttempt.rows[0]) {
      const hoursSince = (Date.now() - new Date(lastAttempt.rows[0].created_at).getTime()) / 3600000;
      if (hoursSince < 24) {
        return res.status(429).json({ error: 'Please wait 24 hours between attempts', retryAfterHours: Math.ceil(24 - hoursSince) });
      }
    }

    if (totalScore >= 60) {
      // Qualify the user
      await query(
        `UPDATE ascend_subscriptions SET is_challenger = true, challenger_qualified_at = NOW(), challenger_quiz_score = $1, challenger_credits_remaining = 100, plan_type = 'challenger' WHERE user_id = $2`,
        [totalScore, req.user.id]
      );
      await query(
        'INSERT INTO ascend_challenger_activity (user_id, action, details) VALUES ($1, $2, $3)',
        [req.user.id, 'qualified', JSON.stringify({ score: totalScore, answers: answers?.length || 0 })]
      );
      res.json({ qualified: true, creditsGranted: 100, score: totalScore });
    } else {
      // Failed
      await query(
        'INSERT INTO ascend_challenger_activity (user_id, action, details) VALUES ($1, $2, $3)',
        [req.user.id, 'quiz_failed', JSON.stringify({ score: totalScore })]
      );
      res.json({ qualified: false, score: totalScore, retryAfter: '24 hours' });
    }
  } catch (err) {
    console.error('[Challenge] Qualify error:', err.message);
    res.status(500).json({ error: 'Failed to process qualification' });
  }
});

/** POST /use-credit — deduct a challenger credit */
router.post('/use-credit', jwtAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const result = await query(
      'UPDATE ascend_subscriptions SET challenger_credits_remaining = GREATEST(challenger_credits_remaining - 1, 0) WHERE user_id = $1 AND is_challenger = true RETURNING challenger_credits_remaining',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not a challenger' });
    await query(
      'INSERT INTO ascend_challenger_activity (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'credit_used', JSON.stringify({ action: action || 'unknown' })]
    );
    res.json({ creditsRemaining: result.rows[0].challenger_credits_remaining });
  } catch (err) {
    console.error('[Challenge] Use credit error:', err.message);
    res.status(500).json({ error: 'Failed to use credit' });
  }
});

/** POST /submit — submit a finding/bug report */
router.post('/submit', jwtAuth, async (req, res) => {
  try {
    const check = await query('SELECT is_challenger FROM ascend_subscriptions WHERE user_id = $1', [req.user.id]);
    if (!check.rows[0]?.is_challenger) return res.status(403).json({ error: 'Must be a qualified challenger' });

    const { title, category, severity, description, stepsToReproduce, suggestedFix } = req.body;
    if (!title || !category || !description) return res.status(400).json({ error: 'title, category, and description required' });

    const result = await query(
      'INSERT INTO ascend_challenger_activity (user_id, action, details) VALUES ($1, $2, $3) RETURNING id, created_at',
      [req.user.id, 'submission', JSON.stringify({ title, category, severity, description, stepsToReproduce, suggestedFix })]
    );
    res.json({ id: result.rows[0].id, submitted: true, submittedAt: result.rows[0].created_at });
  } catch (err) {
    console.error('[Challenge] Submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit finding' });
  }
});

/** GET /leaderboard — public rankings */
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.name, u.picture, s.challenger_quiz_score as score, s.challenger_qualified_at as qualified_at,
        (SELECT COUNT(*) FROM ascend_challenger_activity a WHERE a.user_id = u.id AND a.action = 'submission') as submissions
      FROM users u
      JOIN ascend_subscriptions s ON s.user_id = u.id
      WHERE s.is_challenger = true
      ORDER BY submissions DESC, s.challenger_quiz_score DESC
      LIMIT 20
    `);
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('[Challenge] Leaderboard error:', err.message);
    res.json({ leaderboard: [] });
  }
});

export default router;
