// apps/ascend-backend/src/routes/problems.js
import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { optionalJwtAuth, jwtAuth } from '../middleware/jwtAuth.js';
import { PAID_PLAN_TYPES } from '../lib/plans.js';
import { isAdminEmail } from '../lib/adminEmails.js';

const router = Router();

// GET /api/v1/problems/tags — no auth needed
router.get('/tags', async (req, res) => {
  try {
    const { rows: topicRows } = await query(`
      SELECT DISTINCT elem->>'name' AS tag
      FROM coding_problems, LATERAL jsonb_array_elements(topic_tags) AS elem
      WHERE topic_tags IS NOT NULL AND jsonb_typeof(topic_tags) = 'array'
      ORDER BY tag
    `);
    const { rows: companyRows } = await query(`
      SELECT DISTINCT elem AS tag
      FROM coding_problems, LATERAL jsonb_array_elements_text(company_tags) AS elem
      WHERE company_tags IS NOT NULL AND jsonb_typeof(company_tags) = 'array'
        AND jsonb_array_length(company_tags) > 0
      ORDER BY tag
    `);
    res.json({
      topic_tags:   topicRows.map(r => r.tag).filter(Boolean),
      company_tags: companyRows.map(r => r.tag).filter(Boolean),
    });
  } catch (err) {
    console.error('[problems/tags]', err.message);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/v1/problems — list with filters + pagination
router.get('/', optionalJwtAuth, async (req, res) => {
  try {
    const {
      difficulty, tag, company, source, q,
      page = '1', limit = '50',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset   = (pageNum - 1) * limitNum;

    const conditions = [];
    const params     = [];

    if (difficulty) {
      params.push(difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }
    if (source) {
      params.push(source);
      conditions.push(`source = $${params.length}`);
    }
    if (tag) {
      params.push(JSON.stringify([{ name: tag }]));
      conditions.push(`topic_tags @> $${params.length}::jsonb`);
    }
    if (company) {
      params.push(company);
      conditions.push(`company_tags @> to_jsonb($${params.length}::text)`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS total FROM coding_problems ${where}`,
      params
    );
    const total = parseInt(countRows[0].total);

    params.push(limitNum, offset);
    const { rows } = await query(
      `SELECT id, lc_id, slug, title, difficulty, topic_tags, company_tags,
              is_premium, acceptance_rate, source
       FROM coding_problems
       ${where}
       ORDER BY COALESCE(lc_id, 999999), slug
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Check paid status via DB (req.user.planType is not populated by optionalJwtAuth)
    let paid = isAdminEmail(req.user?.email);
    if (!paid && req.user?.id) {
      const { rows: subRows } = await query(
        "SELECT plan_type FROM ascend_subscriptions WHERE user_id = $1 AND status = 'active'",
        [req.user.id]
      );
      paid = PAID_PLAN_TYPES.has(subRows[0]?.plan_type ?? '');
    }

    const problems = rows.map(r => ({
      ...r,
      company_tags: paid ? r.company_tags : [],
      company_tags_locked: !paid && Array.isArray(r.company_tags) && r.company_tags.length > 0,
    }));

    res.json({ problems, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('[problems/list]', err.message);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// GET /api/v1/problems/:slug — full detail, auth required
router.get('/:slug', jwtAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM coding_problems WHERE slug = $1',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Problem not found' });

    const prob = rows[0];

    // Premium problems gated behind paid subscription
    if (prob.is_premium) {
      const { rows: subRows } = await query(
        "SELECT plan_type, trial_ends_at FROM ascend_subscriptions WHERE user_id = $1 AND status = 'active'",
        [req.user.id]
      );
      const sub = subRows[0];
      const planType = sub?.plan_type ?? 'free';
      const hasActiveTrial = planType === 'free' && sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date();
      const isOwner = isAdminEmail(req.user.email);
      if (!isOwner && !PAID_PLAN_TYPES.has(planType) && !hasActiveTrial) {
        return res.status(403).json({ error: 'Premium problem — upgrade to access', code: 'SUBSCRIPTION_REQUIRED' });
      }
    }

    res.json(prob);
  } catch (err) {
    console.error('[problems/detail]', err.message);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

export default router;
