import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { query } from '../config/database.js';

const router = Router();

// GET /api/activity/heatmap?year=YYYY
// Returns per-day activity counts and streak info for the heatmap.
// Aggregates from challenger_activity + score_cards.
router.get('/heatmap', jwtAuth, async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    const userId = req.user.id;

    const [yearResult, allResult] = await Promise.all([
      query(
        `SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS count
         FROM (
           SELECT created_at FROM ascend_challenger_activity WHERE user_id = $1
           UNION ALL
           SELECT created_at FROM ascend_score_cards WHERE user_id = $1
         ) combined
         WHERE created_at >= $2 AND created_at < $3
         GROUP BY day
         ORDER BY day`,
        [userId, start, end]
      ),
      query(
        `SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') AS day
         FROM (
           SELECT created_at FROM ascend_challenger_activity WHERE user_id = $1
           UNION ALL
           SELECT created_at FROM ascend_score_cards WHERE user_id = $1
         ) combined
         ORDER BY day`,
        [userId]
      ),
    ]);

    const days = {};
    for (const row of yearResult.rows) {
      days[row.day.toISOString().slice(0, 10)] = parseInt(row.count);
    }

    const activeDaySet = new Set(allResult.rows.map(r => r.day.toISOString().slice(0, 10)));
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let longestStreak = 0;
    let streak = 0;
    let prev = null;
    for (const row of allResult.rows) {
      const day = row.day.toISOString().slice(0, 10);
      if (prev) {
        const diff = Math.round((new Date(day) - new Date(prev)) / 86400000);
        streak = diff === 1 ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      if (streak > longestStreak) longestStreak = streak;
      prev = day;
    }

    const currentStreak = (activeDaySet.has(today) || activeDaySet.has(yesterday)) ? streak : 0;

    res.json({ days, current_streak: currentStreak, longest_streak: longestStreak });
  } catch (err) {
    next(err);
  }
});

export default router;
