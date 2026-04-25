/**
 * Users repository — small, intentional surface over the shared `users`
 * table that both backends read/write.
 *
 * Both lumora-backend and ascend-backend hand-write SQL against `users` in
 * many places, which means schema changes ripple unpredictably. This module
 * gives them a single set of vetted helpers for the most common operations.
 *
 * Callers that need a query not covered here should add it here first
 * rather than dropping back to ad-hoc SQL.
 */
import { query } from './index.js';

/** Look up a user by primary key. Returns null when not found. */
export async function getUserById(id) {
  const result = await query(
    `SELECT id, email, name, image, provider, provider_id, is_active, plan_type,
            plan_status, stripe_customer_id, onboarding_completed, job_roles,
            resume_text, technical_context, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/** Look up a user by email (case-insensitive). Returns null when not found. */
export async function getUserByEmail(email) {
  if (!email) return null;
  const result = await query(
    `SELECT id, email, name, image, provider, provider_id, is_active, plan_type,
            plan_status, stripe_customer_id, onboarding_completed, job_roles,
            resume_text, technical_context, created_at, updated_at
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Insert or update a user from an OAuth callback. Looks up by email; if
 * present, updates the auth fields; if absent, inserts a new row. Returns
 * the resulting row.
 */
export async function upsertUserFromOAuth({ email, name, image, provider, provider_id }) {
  if (!email) throw new Error('upsertUserFromOAuth requires email');
  const existing = await getUserByEmail(email);
  if (existing) {
    const result = await query(
      `UPDATE users SET name = COALESCE($1, name),
                        image = COALESCE($2, image),
                        provider = COALESCE($3, provider),
                        provider_id = COALESCE($4, provider_id),
                        updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name || null, image || null, provider || null, provider_id || null, existing.id]
    );
    return result.rows[0];
  }
  const result = await query(
    `INSERT INTO users (email, name, image, provider, provider_id, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING *`,
    [email, name || null, image || null, provider || 'unknown', provider_id || null]
  );
  return result.rows[0];
}

/** Patch a subset of user columns. Pass only fields you want to change. */
export async function updateUser(id, patch) {
  const allowed = ['name', 'image', 'is_active', 'onboarding_completed', 'job_roles', 'resume_text', 'technical_context'];
  const sets = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      values.push(patch[key]);
    }
  }
  if (sets.length === 0) return getUserById(id);
  values.push(id);
  const result = await query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}
