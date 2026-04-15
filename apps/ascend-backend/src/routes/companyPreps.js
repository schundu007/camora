import { Router } from 'express';
import { query } from '../lib/shared-db.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { canCreateCompany, useCredit } from '../services/creditService.js';
import { logger } from '../middleware/requestLogger.js';
import * as freeUsageService from '../services/freeUsageService.js';

const router = Router();

/**
 * Get all company preps for user
 * GET /api/company-preps
 */
router.get('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM ascend_company_preps
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    res.json({ preps: result.rows || [] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get company preps');
    res.status(500).json({ error: 'Failed to get company preps' });
  }
});

/**
 * Get single company prep
 * GET /api/company-preps/:id
 */
router.get('/:id', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM ascend_company_preps
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company prep not found' });
    }

    res.json({ prep: result.rows[0] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get company prep');
    res.status(500).json({ error: 'Failed to get company prep' });
  }
});

/**
 * Create new company prep
 * POST /api/company-preps
 * Requires active subscription OR free allowance
 */
router.post('/', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { company_name, inputs = {}, generated = {}, custom_sections = [] } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Check subscription OR free usage (freemium model)
    const canUseResult = await freeUsageService.canUseFeature(userId, 'company_prep');
    logger.info({ userId, canUseResult }, 'Company prep feature access check');

    if (!canUseResult.allowed) {
      return res.status(403).json({
        error: canUseResult.reason || 'Free trial exhausted. Please subscribe to continue.',
        code: 'FREE_TRIAL_EXHAUSTED',
        freeTrialExhausted: canUseResult.freeTrialExhausted || false,
        freeUsed: canUseResult.freeUsed,
        freeLimit: canUseResult.freeLimit,
        upgradeUrl: '/pricing',
      });
    }

    // Check if user can create a new company (legacy credit system)
    const canCreate = await canCreateCompany(userId);

    if (!canCreate.allowed && canUseResult.hasSubscription) {
      return res.status(403).json({
        error: canCreate.reason || 'Cannot create company prep',
        code: 'INSUFFICIENT_CREDITS',
        balance: canCreate.balance,
      });
    }

    // Determine if using free tier or credit
    let isFreeTier = false;
    if (!canUseResult.hasSubscription) {
      // Free trial user - use free allowance
      isFreeTier = true;
      const usedFree = await freeUsageService.useFreeAllowance(userId, 'company_prep');
      logger.info({ userId, usedFree }, 'Company prep free allowance deducted');
    } else if (canCreate.free) {
      // Subscribed user's first free company
      isFreeTier = true;
    } else {
      // Subscribed user using credits
      const creditResult = await useCredit(userId, company_name);
      if (!creditResult.success) {
        return res.status(403).json({
          error: 'Failed to use credit',
          code: 'CREDIT_ERROR',
        });
      }
    }

    // Create company prep
    const result = await query(
      `INSERT INTO ascend_company_preps
       (user_id, company_name, is_free_tier, inputs, generated, custom_sections)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, company_name, isFreeTier, JSON.stringify(inputs), JSON.stringify(generated), JSON.stringify(custom_sections)]
    );

    res.status(201).json({
      prep: result.rows[0],
      credit_used: !isFreeTier && canUseResult.hasSubscription,
      was_free: isFreeTier,
      freeTrialRemaining: canUseResult.hasSubscription ? null : (canUseResult.freeRemaining - 1),
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create company prep');
    res.status(500).json({ error: 'Failed to create company prep' });
  }
});

/**
 * Update company prep
 * PUT /api/company-preps/:id
 */
router.put('/:id', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { company_name, inputs, generated, custom_sections } = req.body;

    // Build update parts
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (company_name !== undefined) {
      updates.push(`company_name = $${paramIndex++}`);
      values.push(company_name);
    }
    if (inputs !== undefined) {
      updates.push(`inputs = $${paramIndex++}`);
      values.push(JSON.stringify(inputs));
    }
    if (generated !== undefined) {
      updates.push(`generated = $${paramIndex++}`);
      values.push(JSON.stringify(generated));
    }
    if (custom_sections !== undefined) {
      updates.push(`custom_sections = $${paramIndex++}`);
      values.push(JSON.stringify(custom_sections));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Add id and user_id to values
    values.push(id, userId);

    const result = await query(
      `UPDATE ascend_company_preps
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company prep not found' });
    }

    res.json({ prep: result.rows[0] });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to update company prep');
    res.status(500).json({ error: 'Failed to update company prep' });
  }
});

/**
 * Delete company prep
 * DELETE /api/company-preps/:id
 */
router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM ascend_company_preps
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Company prep not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to delete company prep');
    res.status(500).json({ error: 'Failed to delete company prep' });
  }
});

export default router;
