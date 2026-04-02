import { query } from '../lib/shared-db.js';
import { logger } from '../middleware/requestLogger.js';

/**
 * Check if user can create a new company prep
 * All companies require credits
 */
export async function canCreateCompany(userId) {
  try {
    const result = await query('SELECT ascend_can_create_company($1) as result', [userId]);
    return result.rows[0]?.result || { allowed: false, reason: 'Unknown error' };
  } catch (error) {
    logger.error({ error: error.message }, 'canCreateCompany error');
    throw error;
  }
}

/**
 * Use a credit for company prep
 */
export async function useCredit(userId, companyName) {
  try {
    // First check if user has credits
    const canCreate = await canCreateCompany(userId);

    if (!canCreate.allowed) {
      return { success: false, reason: canCreate.reason };
    }

    // Use the database function to deduct credit
    const result = await query('SELECT ascend_use_credit($1, $2) as success', [userId, companyName]);
    const success = result.rows[0]?.success;

    if (!success) {
      return { success: false, reason: 'Failed to deduct credit' };
    }

    // Get updated balance
    const balanceResult = await query(
      'SELECT balance FROM ascend_credits WHERE user_id = $1',
      [userId]
    );

    return {
      success: true,
      balance: balanceResult.rows[0]?.balance || 0,
    };
  } catch (error) {
    logger.error({ error: error.message }, 'useCredit error');
    throw error;
  }
}

/**
 * Add credits to user account
 */
export async function addCredits(userId, amount, type, description = null, referenceId = null) {
  try {
    await query(
      'SELECT ascend_add_credits($1, $2, $3, $4, $5)',
      [userId, amount, type, description, referenceId]
    );

    // Get updated balance
    const balanceResult = await query(
      'SELECT balance FROM ascend_credits WHERE user_id = $1',
      [userId]
    );

    return { success: true, balance: balanceResult.rows[0]?.balance || 0 };
  } catch (error) {
    logger.error({ error: error.message }, 'addCredits error');
    throw error;
  }
}

/**
 * Get user's credit balance and history
 */
export async function getCreditInfo(userId) {
  try {
    // Get balance
    const creditsResult = await query(
      'SELECT balance, lifetime_earned, lifetime_used FROM ascend_credits WHERE user_id = $1',
      [userId]
    );

    const credits = creditsResult.rows[0] || { balance: 0, lifetime_earned: 0, lifetime_used: 0 };

    // Get recent transactions
    const txResult = await query(
      `SELECT id, amount, type, description, created_at
       FROM ascend_credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    return {
      balance: credits.balance,
      lifetime_earned: credits.lifetime_earned,
      lifetime_used: credits.lifetime_used,
      transactions: txResult.rows,
    };
  } catch (error) {
    logger.error({ error: error.message }, 'getCreditInfo error');
    throw error;
  }
}

export default {
  canCreateCompany,
  useCredit,
  addCredits,
  getCreditInfo,
};
