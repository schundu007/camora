/**
 * Reactions (bookmarks & completion marks) API routes.
 *
 * Migrated from Python FastAPI → Node.js Express.
 * All queries are scoped to the authenticated user (req.user.id).
 */
import { Router } from 'express';
import { query } from '@camora/shared-db';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Bookmarks ───────────────────────────────────────────────────────────────

/**
 * POST /bookmarks — Create a bookmark.
 *
 * Body: { conversation_id?, message_id?, note? }
 * At least one of conversation_id or message_id is required.
 */
router.post('/bookmarks', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversation_id, message_id, note } = req.body;

    if (!conversation_id && !message_id) {
      return res
        .status(400)
        .json({ error: 'Must provide conversation_id or message_id' });
    }

    const result = await query(
      `INSERT INTO bookmarks (user_id, conversation_id, message_id, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, conversation_id || null, message_id || null, note || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /bookmarks — List the authenticated user's bookmarks (paginated).
 *
 * Query params:
 *   page      — page number (default 1, min 1)
 *   page_size — items per page (default 20, min 1, max 50)
 */
router.get('/bookmarks', async (req, res, next) => {
  try {
    const userId = req.user.id;

    let page = parseInt(req.query.page, 10) || 1;
    if (page < 1) page = 1;

    let pageSize = parseInt(req.query.page_size, 10) || 20;
    if (pageSize < 1) pageSize = 1;
    if (pageSize > 50) pageSize = 50;

    const offset = (page - 1) * pageSize;

    const countResult = await query(
      'SELECT COUNT(*) AS total FROM bookmarks WHERE user_id = $1',
      [userId],
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const listResult = await query(
      `SELECT * FROM bookmarks
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset],
    );

    res.json({
      items: listResult.rows,
      total,
      page,
      page_size: pageSize,
      has_more: page * pageSize < total,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /bookmarks/:id — Delete a bookmark.
 *
 * Only the owning user can delete their bookmark.
 */
router.delete('/bookmarks/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookmarkId = req.params.id;

    const result = await query(
      'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING id',
      [bookmarkId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Completion Marks ────────────────────────────────────────────────────────

/**
 * POST /conversations/:id/complete — Toggle completion mark on a conversation.
 *
 * If the conversation is not marked complete, it marks it.
 * If already complete, it removes the mark.
 */
router.post('/conversations/:id/complete', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Check if already marked complete
    const existing = await query(
      `SELECT id FROM completion_marks
       WHERE user_id = $1 AND conversation_id = $2`,
      [userId, conversationId],
    );

    if (existing.rows.length > 0) {
      // Remove completion mark
      await query(
        'DELETE FROM completion_marks WHERE user_id = $1 AND conversation_id = $2',
        [userId, conversationId],
      );
      return res.json({ completed: false, completed_at: null });
    }

    // Create completion mark
    const result = await query(
      `INSERT INTO completion_marks (user_id, conversation_id)
       VALUES ($1, $2)
       RETURNING completed_at`,
      [userId, conversationId],
    );

    res.json({
      completed: true,
      completed_at: result.rows[0].completed_at,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /conversations/:id/completion — Get completion status for a conversation.
 */
router.get('/conversations/:id/completion', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await query(
      `SELECT completed_at FROM completion_marks
       WHERE user_id = $1 AND conversation_id = $2`,
      [userId, conversationId],
    );

    if (result.rows.length > 0) {
      return res.json({
        completed: true,
        completed_at: result.rows[0].completed_at,
      });
    }

    res.json({ completed: false, completed_at: null });
  } catch (err) {
    next(err);
  }
});

export default router;
