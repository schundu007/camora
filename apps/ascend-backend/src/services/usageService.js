import { query } from '@camora/shared-db';
import { logger } from '../middleware/requestLogger.js';

/**
 * Usage allowances per credit
 */
export const ALLOWANCES_PER_CREDIT = {
  codingProblems: 5,
  systemDesigns: 2,
  companyPreps: 1,
  interviewMinutes: 30,
};

/**
 * Get user's full usage info
 */
export async function getUsage(userId) {
  try {
    const result = await query('SELECT ascend_get_usage($1) as usage', [userId]);
    return result.rows[0]?.usage || {
      coding: { allowance: 0, used: 0, remaining: 0 },
      systemDesign: { allowance: 0, used: 0, remaining: 0 },
      companyPrep: { allowance: 0, used: 0, remaining: 0 },
      interview: { allowance: 0, used: 0, remaining: 0 },
    };
  } catch (error) {
    logger.error({ error: error.message }, 'getUsage error');
    throw error;
  }
}

/**
 * Check if user can solve a coding problem
 */
export async function canUseCoding(userId) {
  try {
    const result = await query('SELECT ascend_can_use_coding($1) as result', [userId]);
    return result.rows[0]?.result || { allowed: false, reason: 'Unknown error' };
  } catch (error) {
    logger.error({ error: error.message }, 'canUseCoding error');
    throw error;
  }
}

/**
 * Use one coding problem allowance
 */
export async function useCoding(userId) {
  try {
    const canUse = await canUseCoding(userId);
    if (!canUse.allowed) {
      return { success: false, reason: canUse.reason };
    }

    const result = await query('SELECT ascend_use_coding($1) as success', [userId]);
    const success = result.rows[0]?.success;

    if (!success) {
      return { success: false, reason: 'Failed to record usage' };
    }

    const usage = await getUsage(userId);
    return { success: true, remaining: usage.coding.remaining };
  } catch (error) {
    logger.error({ error: error.message }, 'useCoding error');
    throw error;
  }
}

/**
 * Check if user can do a system design
 */
export async function canUseSystemDesign(userId) {
  try {
    const result = await query('SELECT ascend_can_use_system_design($1) as result', [userId]);
    return result.rows[0]?.result || { allowed: false, reason: 'Unknown error' };
  } catch (error) {
    logger.error({ error: error.message }, 'canUseSystemDesign error');
    throw error;
  }
}

/**
 * Use one system design allowance
 */
export async function useSystemDesign(userId) {
  try {
    const canUse = await canUseSystemDesign(userId);
    if (!canUse.allowed) {
      return { success: false, reason: canUse.reason };
    }

    const result = await query('SELECT ascend_use_system_design($1) as success', [userId]);
    const success = result.rows[0]?.success;

    if (!success) {
      return { success: false, reason: 'Failed to record usage' };
    }

    const usage = await getUsage(userId);
    return { success: true, remaining: usage.systemDesign.remaining };
  } catch (error) {
    logger.error({ error: error.message }, 'useSystemDesign error');
    throw error;
  }
}

/**
 * Check if user can use interview time
 */
export async function canUseInterview(userId, minutes = 1) {
  try {
    const result = await query('SELECT ascend_can_use_interview($1, $2) as result', [userId, minutes]);
    return result.rows[0]?.result || { allowed: false, reason: 'Unknown error' };
  } catch (error) {
    logger.error({ error: error.message }, 'canUseInterview error');
    throw error;
  }
}

/**
 * Use interview time allowance
 */
export async function useInterview(userId, minutes = 1) {
  try {
    const canUse = await canUseInterview(userId, minutes);
    if (!canUse.allowed) {
      return { success: false, reason: canUse.reason };
    }

    const result = await query('SELECT ascend_use_interview($1, $2) as success', [userId, minutes]);
    const success = result.rows[0]?.success;

    if (!success) {
      return { success: false, reason: 'Failed to record usage' };
    }

    const usage = await getUsage(userId);
    return { success: true, remaining: usage.interview.remaining };
  } catch (error) {
    logger.error({ error: error.message }, 'useInterview error');
    throw error;
  }
}

/**
 * Check if user can create company prep
 */
export async function canUseCompanyPrep(userId) {
  try {
    const result = await query('SELECT ascend_can_create_company($1) as result', [userId]);
    return result.rows[0]?.result || { allowed: false, reason: 'Unknown error' };
  } catch (error) {
    logger.error({ error: error.message }, 'canUseCompanyPrep error');
    throw error;
  }
}

export default {
  ALLOWANCES_PER_CREDIT,
  getUsage,
  canUseCoding,
  useCoding,
  canUseSystemDesign,
  useSystemDesign,
  canUseInterview,
  useInterview,
  canUseCompanyPrep,
};
