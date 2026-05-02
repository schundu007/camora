/**
 * Usage tracking service — plan limits, usage counters, topup credits, and
 * concurrent session management.
 */
import { query } from '../lib/shared-db.js';

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

// Per-plan question/session/diagram caps. v3.2 plan caps are effectively
// uncapped here because the real budgeting now lives on the ascend-backend
// hourBudgetGate (charged in AI-hours, not question count). This middleware
// is kept as a defense-in-depth counter for v3.2 paid users — set high
// enough that legitimate use never trips it; abuse will hit the hour budget
// gate first.
const HIGH_LIMIT = 10000;
const PLANS = {
  // Legacy plans — unchanged
  free:    { sessions: 3,  questions: 5,   diagrams: 1,  devices: 1, isLifetime: true },
  starter: { sessions: 10, questions: 50,  diagrams: 5,  devices: 1 },
  pro:     { sessions: 20, questions: 150, diagrams: 15, devices: 2 },
  annual:  { sessions: 15, questions: 100, diagrams: 10, devices: 1 },
  challenger: { sessions: 10, questions: 100, diagrams: 10, devices: 1, isLifetime: true },
  // v3.2 plans — gated upstream by requirePaidSubscription + hourBudgetGate
  pro_monthly: { sessions: HIGH_LIMIT, questions: HIGH_LIMIT, diagrams: HIGH_LIMIT, devices: 3 },
  pro_yearly:  { sessions: HIGH_LIMIT, questions: HIGH_LIMIT, diagrams: HIGH_LIMIT, devices: 3 },
  team:        { sessions: HIGH_LIMIT, questions: HIGH_LIMIT, diagrams: HIGH_LIMIT, devices: 5 },
};

// ---------------------------------------------------------------------------
// ensureUsageTable — idempotent DDL for usage_tracking + active_sessions
// ---------------------------------------------------------------------------

export async function ensureUsageTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS usage_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      period VARCHAR(7) NOT NULL,
      questions_used INTEGER DEFAULT 0,
      sessions_used INTEGER DEFAULT 0,
      diagrams_used INTEGER DEFAULT 0,
      topup_questions INTEGER DEFAULT 0,
      topup_sessions INTEGER DEFAULT 0,
      topup_diagrams INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, period)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      device_fingerprint VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, device_fingerprint)
    )
  `);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Current billing period in YYYY-MM format. */
function currentPeriod() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * For free-plan users the period is a fixed lifetime bucket ('lifetime'),
 * for everyone else it is the current calendar month.
 */
function periodForPlan(planName) {
  return PLANS[planName]?.isLifetime ? 'lifetime' : currentPeriod();
}

/** Upsert and return the usage_tracking row for a user + period. */
async function getOrCreateRow(userId, period) {
  const result = await query(
    `INSERT INTO usage_tracking (user_id, period)
     VALUES ($1, $2)
     ON CONFLICT (user_id, period) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [userId, period],
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// getUserPlan
// ---------------------------------------------------------------------------

/**
 * Returns the plan name for a user (falls back to 'free').
 *
 * Reads from ascend_subscriptions (the canonical billing table after PR-2)
 * with users.plan_type as a legacy fallback for any rows that haven't been
 * migrated yet. Active status is required — past_due/canceled subscribers
 * are downgraded to free here so they hit the legacy 5-question cap.
 */
export async function getUserPlan(userId) {
  try {
    const result = await query(
      `SELECT s.plan_type, s.status, u.plan_type AS legacy_plan_type
         FROM users u
    LEFT JOIN ascend_subscriptions s ON s.user_id = u.id
        WHERE u.id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return 'free';
    // Active paid plan from canonical table wins
    if (row.plan_type && row.status === 'active' && PLANS[row.plan_type]) {
      return row.plan_type;
    }
    // Legacy fallback (pre-PR-2 rows that wrote to users.plan_type)
    if (row.legacy_plan_type && PLANS[row.legacy_plan_type]) {
      return row.legacy_plan_type;
    }
    return 'free';
  } catch {
    return 'free';
  }
}

// ---------------------------------------------------------------------------
// getUsage
// ---------------------------------------------------------------------------

/**
 * Returns the user's current-period usage merged with plan limits and topups.
 *
 * @returns {{ plan, questions, sessions, diagrams, topups }}
 */
export async function getUsage(userId) {
  const planName = await getUserPlan(userId);
  const limits = PLANS[planName];
  const period = periodForPlan(planName);
  const row = await getOrCreateRow(userId, period);

  const build = (type) => {
    const used = row[`${type}_used`] || 0;
    const topup = row[`topup_${type}`] || 0;
    const limit = limits[type] + topup;
    return { used, limit, remaining: Math.max(0, limit - used) };
  };

  return {
    plan: planName,
    period,
    questions: build('questions'),
    sessions: build('sessions'),
    diagrams: build('diagrams'),
    topups: {
      questions: row.topup_questions || 0,
      sessions: row.topup_sessions || 0,
      diagrams: row.topup_diagrams || 0,
    },
  };
}

// ---------------------------------------------------------------------------
// checkLimit
// ---------------------------------------------------------------------------

/**
 * Quick boolean check — can the user perform one more action of `type`?
 *
 * @param {number} userId
 * @param {'questions'|'sessions'|'diagrams'} type
 * @returns {Promise<{allowed, used, limit, remaining}>}
 */
export async function checkLimit(userId, type) {
  const usage = await getUsage(userId);
  const bucket = usage[type];
  return {
    allowed: bucket.remaining > 0,
    used: bucket.used,
    limit: bucket.limit,
    remaining: bucket.remaining,
  };
}

// ---------------------------------------------------------------------------
// incrementUsage
// ---------------------------------------------------------------------------

/**
 * Increment the counter for `type` if the user is within limits.
 *
 * @param {number} userId
 * @param {'questions'|'sessions'|'diagrams'} type
 * @returns {Promise<{allowed: boolean, usage: object}>}
 */
export async function incrementUsage(userId, type) {
  const VALID_COLUMNS = {
    questions: 'questions_used',
    sessions: 'sessions_used',
    diagrams: 'diagrams_used',
  };
  const col = VALID_COLUMNS[type];
  if (!col) throw new Error(`Invalid usage type: ${type}`);

  const check = await checkLimit(userId, type);
  if (!check.allowed) {
    return { allowed: false, usage: await getUsage(userId) };
  }

  const planName = await getUserPlan(userId);
  const period = periodForPlan(planName);

  await query(
    `INSERT INTO usage_tracking (user_id, period, ${col})
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, period)
     DO UPDATE SET ${col} = usage_tracking.${col} + 1, updated_at = NOW()`,
    [userId, period],
  );

  return { allowed: true, usage: await getUsage(userId) };
}

// ---------------------------------------------------------------------------
// addTopup
// ---------------------------------------------------------------------------

/**
 * Add topup credits for the current period.
 *
 * @param {number} userId
 * @param {'questions'|'sessions'|'diagrams'} type
 * @param {number} amount
 */
export async function addTopup(userId, type, amount) {
  const planName = await getUserPlan(userId);
  const period = periodForPlan(planName);
  const col = `topup_${type}`;

  await query(
    `INSERT INTO usage_tracking (user_id, period, ${col})
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, period)
     DO UPDATE SET ${col} = usage_tracking.${col} + $3, updated_at = NOW()`,
    [userId, period, amount],
  );
}

// ---------------------------------------------------------------------------
// registerSession
// ---------------------------------------------------------------------------

/**
 * Register an active device session. If the user already has the maximum
 * number of concurrent devices for their plan, the oldest session is kicked.
 *
 * @returns {{ allowed: boolean, kicked: { deviceFingerprint: string } | null }}
 */
export async function registerSession(userId, deviceFingerprint, ipAddress) {
  const planName = await getUserPlan(userId);
  const maxDevices = PLANS[planName]?.devices ?? 1;

  // Upsert this device
  await query(
    `INSERT INTO active_sessions (user_id, device_fingerprint, ip_address, last_seen)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, device_fingerprint)
     DO UPDATE SET ip_address = $3, last_seen = NOW()`,
    [userId, deviceFingerprint, ipAddress],
  );

  // Count current active sessions for this user
  const countResult = await query(
    'SELECT COUNT(*) AS cnt FROM active_sessions WHERE user_id = $1',
    [userId],
  );
  const count = parseInt(countResult.rows[0]?.cnt ?? '0', 10);

  if (count <= maxDevices) {
    return { allowed: true, kicked: null };
  }

  // Too many devices — kick the oldest one (that is not the current device)
  const oldestResult = await query(
    `SELECT device_fingerprint FROM active_sessions
     WHERE user_id = $1 AND device_fingerprint != $2
     ORDER BY last_seen ASC
     LIMIT 1`,
    [userId, deviceFingerprint],
  );

  const kicked = oldestResult.rows[0];
  if (kicked) {
    await query(
      'DELETE FROM active_sessions WHERE user_id = $1 AND device_fingerprint = $2',
      [userId, kicked.device_fingerprint],
    );
    return { allowed: true, kicked: { deviceFingerprint: kicked.device_fingerprint } };
  }

  return { allowed: true, kicked: null };
}

// ---------------------------------------------------------------------------
// heartbeat
// ---------------------------------------------------------------------------

/**
 * Update last_seen for a device and clean up stale sessions (> 30 min).
 */
export async function heartbeat(userId, deviceFingerprint) {
  // Update this device's last_seen
  await query(
    `UPDATE active_sessions SET last_seen = NOW()
     WHERE user_id = $1 AND device_fingerprint = $2`,
    [userId, deviceFingerprint],
  );

  // Clean up sessions not seen in 30 minutes
  await query(
    "DELETE FROM active_sessions WHERE last_seen < NOW() - INTERVAL '30 minutes'",
  );
}

export { PLANS };
