/**
 * Conversations API routes.
 *
 * Migrated from Python FastAPI → Node.js Express.
 * All queries are scoped to the authenticated user (req.user.id).
 */
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET / — List user's conversations (paginated).
 *
 * Query params:
 *   page      — page number (default 1, min 1)
 *   page_size — items per page (default 20, min 1, max 100)
 *   archived  — show archived conversations (default false)
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    let page = parseInt(req.query.page, 10) || 1;
    if (page < 1) page = 1;

    let pageSize = parseInt(req.query.page_size, 10) || 20;
    if (pageSize < 1) pageSize = 1;
    if (pageSize > 100) pageSize = 100;

    const archived = req.query.archived === 'true';
    const offset = (page - 1) * pageSize;

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) AS total
       FROM lumora_conversations
       WHERE user_id = $1 AND is_archived = $2`,
      [userId, archived],
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch page with messages aggregated
    const listResult = await query(
      `SELECT c.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', m.id,
                    'role', m.role,
                    'content', m.content,
                    'created_at', m.created_at
                  ) ORDER BY m.created_at
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'
              ) AS messages
       FROM lumora_conversations c
       LEFT JOIN lumora_messages m ON m.conversation_id = c.id
       WHERE c.user_id = $1 AND c.is_archived = $2
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, archived, pageSize, offset],
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
 * POST / — Create a new conversation.
 *
 * Body: { title }
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await query(
      `INSERT INTO lumora_conversations (user_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, title],
    );

    const conversation = result.rows[0];
    console.log(`Created conversation ${conversation.id} for user ${req.user.email}`);

    res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /:id — Get a conversation with its messages.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await query(
      `SELECT c.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', m.id,
                    'role', m.role,
                    'content', m.content,
                    'created_at', m.created_at
                  ) ORDER BY m.created_at
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'
              ) AS messages
       FROM lumora_conversations c
       LEFT JOIN lumora_messages m ON m.conversation_id = c.id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id`,
      [conversationId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /:id — Delete a conversation.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await query(
      'DELETE FROM lumora_conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    console.log(`Deleted conversation ${conversationId}`);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /:id/archive — Archive a conversation.
 */
router.post('/:id/archive', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await query(
      `UPDATE lumora_conversations
       SET is_archived = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [conversationId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Re-fetch with messages to match the Python response shape
    const full = await query(
      `SELECT c.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', m.id,
                    'role', m.role,
                    'content', m.content,
                    'created_at', m.created_at
                  ) ORDER BY m.created_at
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'
              ) AS messages
       FROM lumora_conversations c
       LEFT JOIN lumora_messages m ON m.conversation_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [conversationId],
    );

    res.json(full.rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /:id/messages — Get messages for a conversation (paginated).
 *
 * Query params:
 *   limit — max messages to return (default 50, min 1, max 200)
 */
router.get('/:id/messages', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    let limit = parseInt(req.query.limit, 10) || 50;
    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;

    // Verify conversation ownership
    const ownerCheck = await query(
      'SELECT id FROM lumora_conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Fetch messages (most recent N, returned in chronological order)
    const result = await query(
      `SELECT * FROM (
         SELECT * FROM lumora_messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2
       ) sub
       ORDER BY created_at ASC`,
      [conversationId, limit],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
