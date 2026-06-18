import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { askCara } from '../services/cara.js';

const router = Router();

router.post('/ask', async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, currentPath } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const [userRow, subRow, topicsRow] = await Promise.all([
      query('SELECT name, job_roles FROM users WHERE id = $1', [userId]),
      query('SELECT plan_type FROM ascend_subscriptions WHERE user_id = $1', [userId]),
      query('SELECT DISTINCT topic_id FROM ascend_topic_reads WHERE user_id = $1 LIMIT 50', [userId]),
    ]);

    const context = {
      userName: userRow.rows[0]?.name || '',
      goal: Array.isArray(userRow.rows[0]?.job_roles) ? (userRow.rows[0].job_roles[0] || '') : '',
      topicsStudied: topicsRow.rows.map(r => r.topic_id),
      planTier: subRow.rows[0]?.plan_type || 'free',
      currentPath: currentPath || '/',
    };

    const result = await askCara({ message, context });
    res.json(result);
  } catch (err) {
    console.error('[cara] error:', err);
    res.json({ answer: "I'm having trouble right now — try again in a moment.", action: null });
  }
});

export default router;
