/**
 * Job-seeker profile persistence (main Camora DB).
 *
 * One structured candidate profile per user (user_id is the PK). This drives
 * tailored CV/cover-letter generation and application autofill for the
 * assisted-apply feature. Extends the thin users.resume_text / users.job_roles
 * with a full structured profile.
 */
import { query } from '../lib/shared-db.js';

// Editable columns, in a stable order. user_id is handled separately (PK).
const PROFILE_COLUMNS = [
  'full_name',
  'headline',
  'location',
  'email',
  'phone',
  'links',
  'summary',
  'skills',
  'experience',
  'education',
  'certifications',
  'languages',
  'work_authorization',
  'preferences',
  'default_cv_template',
];

// Columns stored as JSONB — serialized + cast on write.
const JSONB_COLUMNS = new Set([
  'links',
  'skills',
  'experience',
  'education',
  'certifications',
  'languages',
  'preferences',
]);

/**
 * Fetch a user's profile, or null if they haven't created one yet.
 * @param {number} userId
 */
export async function getProfile(userId) {
  const { rows } = await query(
    'SELECT * FROM job_seeker_profiles WHERE user_id = $1',
    [userId],
  );
  return rows[0] || null;
}

/**
 * Create or replace a user's profile. The profile editor submits the whole
 * form, so this is a full upsert of all editable columns (missing fields
 * reset to NULL / empty). Returns the persisted row.
 * @param {number} userId
 * @param {Record<string, unknown>} input
 */
export async function upsertProfile(userId, input = {}) {
  const values = PROFILE_COLUMNS.map((col) => {
    const v = input[col];
    if (JSONB_COLUMNS.has(col)) {
      return v === undefined || v === null ? null : JSON.stringify(v);
    }
    return v === undefined ? null : v;
  });

  // $1 = user_id, $2.. = PROFILE_COLUMNS. JSONB columns get an explicit cast.
  const insertPlaceholders = PROFILE_COLUMNS.map((col, i) =>
    JSONB_COLUMNS.has(col) ? `$${i + 2}::jsonb` : `$${i + 2}`,
  );
  const updateAssignments = PROFILE_COLUMNS.map(
    (col) => `${col} = EXCLUDED.${col}`,
  );

  const sql = `
    INSERT INTO job_seeker_profiles (user_id, ${PROFILE_COLUMNS.join(', ')}, updated_at)
    VALUES ($1, ${insertPlaceholders.join(', ')}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      ${updateAssignments.join(',\n      ')},
      updated_at = NOW()
    RETURNING *`;

  const { rows } = await query(sql, [userId, ...values]);
  return rows[0];
}
