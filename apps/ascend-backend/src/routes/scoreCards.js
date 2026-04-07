import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { query } from '../config/database.js';
import crypto from 'crypto';

const router = Router();

function generateShareToken() {
  return crypto.randomBytes(8).toString('hex');
}

// POST / — create score card after challenge
router.post('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, title, score, category, metadata } = req.body;
    if (!type || !title) return res.status(400).json({ error: 'type and title required' });

    const shareToken = generateShareToken();
    const result = await query(
      `INSERT INTO ascend_score_cards (user_id, type, title, score, category, metadata, share_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, share_token, created_at`,
      [userId, type, title, score || 0, category || null, JSON.stringify(metadata || {}), shareToken]
    );

    const card = result.rows[0];
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://camora.cariara.com';
    res.json({
      success: true,
      id: card.id,
      share_token: card.share_token,
      share_url: `${FRONTEND_URL}/share/${card.share_token}`,
      created_at: card.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create score card' });
  }
});

// GET / — list user's score cards
router.get('/', jwtAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM ascend_score_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ score_cards: result.rows });
  } catch {
    res.json({ score_cards: [] });
  }
});

// GET /public/:shareToken — public score card (no auth)
router.get('/public/:shareToken', async (req, res) => {
  try {
    const result = await query(
      `SELECT sc.*, u.name, u.avatar, u.username
       FROM ascend_score_cards sc JOIN users u ON sc.user_id = u.id
       WHERE sc.share_token = $1`,
      [req.params.shareToken]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Score card not found' });
    const card = result.rows[0];
    res.json({
      type: card.type,
      title: card.title,
      score: card.score,
      category: card.category,
      metadata: card.metadata,
      created_at: card.created_at,
      user: { name: card.name, avatar: card.avatar, username: card.username },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load score card' });
  }
});

// GET /certificates — list user's certificates
router.get('/certificates', jwtAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM ascend_certificates WHERE user_id = $1 ORDER BY issued_at DESC',
      [req.user.id]
    );
    res.json({ certificates: result.rows });
  } catch {
    res.json({ certificates: [] });
  }
});

// GET /certificates/public/:shareToken — public certificate (no auth)
router.get('/certificates/public/:shareToken', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.name, u.avatar, u.username
       FROM ascend_certificates c JOIN users u ON c.user_id = u.id
       WHERE c.share_token = $1`,
      [req.params.shareToken]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const cert = result.rows[0];
    res.json({
      track: cert.track,
      title: cert.title,
      issued_at: cert.issued_at,
      user: { name: cert.name, avatar: cert.avatar, username: cert.username },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load certificate' });
  }
});

// GET /profile/public/:username — public profile
router.get('/profile/public/:username', async (req, res) => {
  try {
    const userResult = await query(
      'SELECT id, name, avatar, username, created_at FROM users WHERE username = $1',
      [req.params.username]
    );
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userResult.rows[0];

    const [profileR, badgesR, cardsR, certsR] = await Promise.all([
      query('SELECT xp_points, level, problems_solved, current_streak FROM user_profiles WHERE user_id = $1', [user.id]),
      query('SELECT badge_key, earned_at FROM ascend_badges WHERE user_id = $1', [user.id]),
      query('SELECT type, title, score, category, share_token, created_at FROM ascend_score_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [user.id]),
      query('SELECT track, title, share_token, issued_at FROM ascend_certificates WHERE user_id = $1', [user.id]),
    ]);

    res.json({
      user: { name: user.name, avatar: user.avatar, username: user.username, joined: user.created_at },
      stats: profileR.rows[0] || { xp_points: 0, level: 1, problems_solved: 0, current_streak: 0 },
      badges: badgesR.rows,
      score_cards: cardsR.rows,
      certificates: certsR.rows,
    });
  } catch {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /profile/username — set username
router.put('/profile/username', jwtAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, _ -)' });
    }
    await query('UPDATE users SET username = $1 WHERE id = $2', [username.toLowerCase(), req.user.id]);
    res.json({ success: true, username: username.toLowerCase() });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Failed to set username' });
  }
});

export default router;
