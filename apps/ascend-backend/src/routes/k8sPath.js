import { Router } from 'express';
import { query } from '../config/database.js';

export const k8sPathRouter = Router();

k8sPathRouter.get('/topics', async (req, res) => {
  try {
    const topicsRes = await query(
      `SELECT t.*, COUNT(e.id)::int AS exercise_count,
              COUNT(p.id) FILTER (WHERE p.user_id = $1)::int AS completed_count
       FROM k8s_topics t
       LEFT JOIN k8s_exercises e ON e.topic_slug = t.slug
       LEFT JOIN k8s_progress p ON p.exercise_id = e.id AND p.user_id = $1
       GROUP BY t.id
       ORDER BY t.module, t.position`,
      [req.user.id],
    );
    return res.json({ topics: topicsRes.rows });
  } catch (err) {
    console.error('[K8sPath] topics error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

k8sPathRouter.get('/topics/:slug', async (req, res) => {
  try {
    const topicRes = await query('SELECT * FROM k8s_topics WHERE slug=$1', [req.params.slug]);
    if (!topicRes.rows.length) return res.status(404).json({ error: 'Topic not found' });
    const exRes = await query(
      `SELECT e.*, (p.id IS NOT NULL) AS completed
       FROM k8s_exercises e
       LEFT JOIN k8s_progress p ON p.exercise_id = e.id AND p.user_id = $1
       WHERE e.topic_slug = $2
       ORDER BY e.position`,
      [req.user.id, req.params.slug],
    );
    return res.json({ topic: topicRes.rows[0], exercises: exRes.rows });
  } catch (err) {
    console.error('[K8sPath] topic detail error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch topic' });
  }
});
