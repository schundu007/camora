import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';

const router = Router();

// Public GET; redact PII for unauthenticated callers so the endpoint
// can't be enumerated to harvest commenter names + avatars across
// every topicId. Authenticated callers get the full record.
function initialsFromName(name) {
  if (!name) return 'A';
  return String(name).trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('') || 'A';
}

// GET /api/topic-comments?topicId=xxx — list comments for a topic
router.get('/', async (req, res) => {
  try {
    const { topicId } = req.query;
    if (!topicId) return res.status(400).json({ error: 'topicId is required' });

    const result = await query(
      `SELECT id, topic_id, user_id, user_name, user_image, content, parent_id, created_at, updated_at
       FROM ascend_topic_comments
       WHERE topic_id = $1
       ORDER BY created_at ASC`,
      [topicId]
    );

    // jwtAuth not applied at the mount — try a lightweight verify so
    // signed-in users see real names. Anonymous callers get initials
    // and no avatar URL so the endpoint can't be scraped for PII.
    let isAuthed = false;
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.cariara_sso;
      if (token) {
        const { verifyJWT } = await import('../middleware/jwtAuth.js');
        const decoded = await verifyJWT(token);
        isAuthed = !!decoded?.id;
      }
    } catch { /* anonymous */ }

    const comments = isAuthed
      ? result.rows
      : result.rows.map((c) => ({
          ...c,
          user_name: initialsFromName(c.user_name),
          user_image: null,
        }));
    res.json({ comments });
  } catch (err) {
    console.error('[TopicComments] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/topic-comments — add a comment (auth required).
//
// Identity (`user_name`, `user_image`) is derived from the authenticated
// JWT, NOT from the request body. The previous implementation accepted
// userName/userImage from req.body and stored them verbatim — letting
// any authenticated user claim to be admin / set userImage to a
// `javascript:` URL (stored XSS in any frontend rendering it as `<img>`).
router.post('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { topicId, content, parentId } = req.body;

    if (!topicId || !content?.trim()) {
      return res.status(400).json({ error: 'topicId and content are required' });
    }

    const userName = req.user.name || null;
    const userImage = req.user.picture || req.user.image || null;

    const result = await query(
      `INSERT INTO ascend_topic_comments (topic_id, user_id, user_name, user_image, content, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [topicId, userId, userName, userImage, content.trim(), parentId || null]
    );
    res.json({ comment: result.rows[0] });
  } catch (err) {
    console.error('[TopicComments] POST error:', err.message);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// PUT /api/topic-comments/:id — edit own comment (auth required)
router.put('/:id', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = req.params.id;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const result = await query(
      `UPDATE ascend_topic_comments SET content = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [content.trim(), commentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not yours' });
    }
    res.json({ comment: result.rows[0] });
  } catch (err) {
    console.error('[TopicComments] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/topic-comments/:id — delete own comment (auth required)
router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const commentId = req.params.id;

    const result = await query(
      'DELETE FROM ascend_topic_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not yours' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[TopicComments] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
