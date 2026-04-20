import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';

const router = Router();

const FREE_LIMITS = {
  'coding': 3,
  'system-design': 2,
  'low-level': 2,
  'behavioral': 2,
  'microservices': 2,
  'databases': 2,
  'sql': 2,
  'projects': 2,
  'roadmaps': 2,
  'eng-blogs': 2,
};
const DEFAULT_FREE_LIMIT = 2;
function getFreeLimitForCategory(category) {
  return FREE_LIMITS[category] || DEFAULT_FREE_LIMIT;
}

/**
 * Check if user has an active paid subscription
 */
async function isPaidUser(userId) {
  try {
    const result = await query(
      "SELECT plan_type, status FROM ascend_subscriptions WHERE user_id = $1",
      [userId]
    );
    if (!result.rows.length) return false;
    const { plan_type, status } = result.rows[0];
    return status === 'active' && plan_type !== 'free' && !!plan_type;
  } catch {
    return false;
  }
}

/**
 * GET /api/topic-reads?category=coding&topicId=arrays
 * Returns read topics for a category + lock status for optional topicId
 */
router.get('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, topicId } = req.query;

    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    // Paid users: never locked
    if (await isPaidUser(userId)) {
      return res.json({ readTopics: [], locked: false, isPaid: true });
    }

    const result = await query(
      'SELECT topic_id FROM ascend_topic_reads WHERE user_id = $1 AND category = $2',
      [userId, category]
    );
    const readTopics = result.rows.map(r => r.topic_id);

    let locked = false;
    if (topicId) {
      const limit = getFreeLimitForCategory(category);
      locked = !readTopics.includes(topicId) && readTopics.length >= limit;
    }

    res.json({ readTopics, locked, count: readTopics.length, limit: getFreeLimitForCategory(category) });
  } catch (err) {
    console.error('[TopicReads] GET error:', err.message);
    res.status(500).json({ error: 'Failed to check topic access' });
  }
});

/**
 * POST /api/topic-reads
 * Mark a topic as read. Returns updated read list.
 * Body: { category: string, topicId: string }
 */
router.post('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, topicId } = req.body;

    if (!category || !topicId) {
      return res.status(400).json({ error: 'category and topicId are required' });
    }

    // Paid users: no tracking needed
    if (await isPaidUser(userId)) {
      return res.json({ success: true, readTopics: [], isPaid: true });
    }

    // Check if already read
    const existing = await query(
      'SELECT 1 FROM ascend_topic_reads WHERE user_id = $1 AND category = $2 AND topic_id = $3',
      [userId, category, topicId]
    );
    if (existing.rows.length > 0) {
      // Already tracked — return current list
      const all = await query(
        'SELECT topic_id FROM ascend_topic_reads WHERE user_id = $1 AND category = $2',
        [userId, category]
      );
      return res.json({ success: true, readTopics: all.rows.map(r => r.topic_id) });
    }

    // Check if limit reached
    const countResult = await query(
      'SELECT COUNT(*) as cnt FROM ascend_topic_reads WHERE user_id = $1 AND category = $2',
      [userId, category]
    );
    const count = parseInt(countResult.rows[0].cnt, 10);
    const limit = getFreeLimitForCategory(category);
    if (count >= limit) {
      return res.status(403).json({ error: 'Free topic limit reached', locked: true, limit });
    }

    // Insert
    await query(
      'INSERT INTO ascend_topic_reads (user_id, category, topic_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, category, topicId]
    );

    // Return updated list
    const all = await query(
      'SELECT topic_id FROM ascend_topic_reads WHERE user_id = $1 AND category = $2',
      [userId, category]
    );
    res.json({ success: true, readTopics: all.rows.map(r => r.topic_id) });
  } catch (err) {
    console.error('[TopicReads] POST error:', err.message);
    res.status(500).json({ error: 'Failed to track topic read' });
  }
});

export default router;
