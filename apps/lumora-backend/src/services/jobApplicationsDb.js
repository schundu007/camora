/**
 * Job application tracker persistence (main Camora DB).
 *
 * One row per application a user is tracking. status='saved' is the initial
 * "saved but not yet applied" state, so this single table also serves as the
 * saved-jobs list (no separate saved_jobs table). Columns mirror this repo's
 * job_search_tracker.csv for import/export parity.
 */
import { query } from '../lib/shared-db.js';

/** Allowed application statuses, in pipeline order (kanban columns). */
export const APPLICATION_STATUSES = [
  'saved',
  'drafting',
  'ready',
  'applied',
  'interviewing',
  'offer',
  'rejected',
];

// Caller-editable columns (id/user_id/timestamps handled separately).
const EDITABLE_COLUMNS = [
  'source_job_id',
  'title',
  'company',
  'location',
  'job_url',
  'source',
  'sector',
  'role_type',
  'status',
  'fit_rating',
  'channel',
  'contact_person',
  'notes',
  'tailored_cv_url',
  'cover_letter_url',
  'applied_at',
];

/** List all of a user's tracked applications, most-recently-updated first. */
export async function listApplications(userId) {
  const { rows } = await query(
    'SELECT * FROM job_applications WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId],
  );
  return rows;
}

/** Fetch one application scoped to the owner, or null. */
export async function getApplication(userId, id) {
  const { rows } = await query(
    'SELECT * FROM job_applications WHERE user_id = $1 AND id = $2',
    [userId, id],
  );
  return rows[0] || null;
}

/** Create a tracked application. Only provided editable columns are set. */
export async function createApplication(userId, input = {}) {
  const cols = EDITABLE_COLUMNS.filter((c) => input[c] !== undefined);
  const colList = ['user_id', ...cols].join(', ');
  const placeholders = ['$1', ...cols.map((_, i) => `$${i + 2}`)].join(', ');
  const values = cols.map((c) => input[c]);
  const { rows } = await query(
    `INSERT INTO job_applications (${colList}) VALUES (${placeholders}) RETURNING *`,
    [userId, ...values],
  );
  return rows[0];
}

/** Partially update an application (owner-scoped). Returns the row or null. */
export async function updateApplication(userId, id, input = {}) {
  const cols = EDITABLE_COLUMNS.filter((c) => input[c] !== undefined);
  if (cols.length === 0) return getApplication(userId, id);
  const setClause = cols.map((c, i) => `${c} = $${i + 3}`).join(', ');
  const values = cols.map((c) => input[c]);
  const { rows } = await query(
    `UPDATE job_applications SET ${setClause}, updated_at = NOW()
     WHERE user_id = $1 AND id = $2 RETURNING *`,
    [userId, id, ...values],
  );
  return rows[0] || null;
}

/** Delete an application (owner-scoped). Returns true if a row was removed. */
export async function deleteApplication(userId, id) {
  const { rowCount } = await query(
    'DELETE FROM job_applications WHERE user_id = $1 AND id = $2',
    [userId, id],
  );
  return rowCount > 0;
}
