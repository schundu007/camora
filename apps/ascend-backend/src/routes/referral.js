import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';
import * as creditService from '../services/creditService.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://camora.cariara.com';

// GET /code — get user's referral code + link
router.get('/code', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let result = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
    let code = result.rows[0]?.referral_code;

    if (!code) {
      code = Math.random().toString(36).substring(2, 10);
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, userId]);
    }

    res.json({ code, link: `${FRONTEND_URL}/r/${code}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// GET /dashboard — referral stats
router.get('/dashboard', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const codeResult = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
    const code = codeResult.rows[0]?.referral_code;

    const statsResult = await query(
      `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'rewarded' THEN 1 END) as rewarded
       FROM ascend_referrals WHERE referrer_id = $1`,
      [userId]
    );
    const stats = statsResult.rows[0];

    const referralsResult = await query(
      `SELECT r.created_at, r.status, r.reward_amount, u.name, u.avatar
       FROM ascend_referrals r JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [userId]
    );

    res.json({
      code,
      link: `${FRONTEND_URL}/r/${code}`,
      total_invited: parseInt(stats.total),
      total_rewarded: parseInt(stats.rewarded),
      rewards_earned: parseInt(stats.rewarded) * 50,
      referrals: referralsResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// GET /validate/:code — public, validate referral code
router.get('/validate/:code', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, avatar FROM users WHERE referral_code = $1',
      [req.params.code]
    );
    if (result.rows.length === 0) {
      return res.json({ valid: false });
    }
    const user = result.rows[0];
    res.json({ valid: true, referrer_name: user.name?.split(' ')[0] || 'A friend' });
  } catch {
    res.json({ valid: false });
  }
});

// POST /apply — apply referral code to current user
router.post('/apply', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Referral code required' });

    // Find referrer
    const referrerResult = await query('SELECT id FROM users WHERE referral_code = $1', [code]);
    if (referrerResult.rows.length === 0) return res.status(400).json({ error: 'Invalid referral code' });

    const referrerId = referrerResult.rows[0].id;
    if (referrerId === userId) return res.status(400).json({ error: 'Cannot refer yourself' });

    // Check not already referred
    const existingResult = await query('SELECT 1 FROM users WHERE id = $1 AND referred_by IS NOT NULL', [userId]);
    if (existingResult.rows.length > 0) return res.json({ success: false, message: 'Already referred' });

    // Apply referral
    await query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrerId, userId]);
    await query(
      `INSERT INTO ascend_referrals (referrer_id, referred_id, status, reward_type, reward_amount)
       VALUES ($1, $2, 'rewarded', 'credits', 50) ON CONFLICT DO NOTHING`,
      [referrerId, userId]
    );

    // Award credits to both
    try {
      await creditService.addCredits(referrerId, 50, 'referral', `Referral from user ${userId}`);
      await creditService.addCredits(userId, 50, 'referral_bonus', `Referred by user ${referrerId}`);
    } catch {} // credits table may not exist

    res.json({ success: true, reward: { type: 'credits', amount: 50 } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply referral' });
  }
});

export default router;
