/**
 * The Prep workspace's active company for a user.
 *
 * Used by retrieval to decide whether a company-specific study deck is in
 * scope. The read is NEVER allowed to cost retrieval any latency.
 *
 * retrieve() runs against a hard 250ms timeout, and losing that race returns
 * zero chunks — an ungrounded answer. So an awaited database read on the
 * retrieval path is not a small cost, it is a way to lose the whole answer to
 * a slow query. Hence the split:
 *
 *   peekActiveCompany()  synchronous, cache-only, safe on the hot path
 *   refreshActiveCompany() async, fire-and-forget, never awaited by retrieval
 *   primeActiveCompany() writes the value we already hold, no query at all
 *
 * On a cold cache retrieval proceeds without the deck for that one question and
 * the background refresh warms it for the next. In practice the cache is
 * already primed: prep.js calls primeActiveCompany on every save, and the value
 * is right there in the payload.
 *
 * Fails soft everywhere — any error means "no study deck", never a throw.
 */
import { query } from '../lib/shared-db.js';

const TTL_MS = 5 * 60_000;
const cache = new Map();   // userId -> { company, at }
const inflight = new Map(); // userId -> Promise, so a burst of questions on a
                            // cold cache triggers one query, not one per question

export function primeActiveCompany(userId, company) {
  if (!userId) return;
  cache.set(userId, { company: company || null, at: Date.now() });
}

export function invalidateActiveCompany(userId) {
  cache.delete(userId);
}

export function _clearActiveCompanyCache() {
  cache.clear();
  inflight.clear();
}

/**
 * Cache-only read. Synchronous by design: callers on the retrieval path must
 * not be able to await this by accident.
 * @returns {{hit: boolean, company: string|null}}
 */
export function peekActiveCompany(userId) {
  if (!userId) return { hit: false, company: null };
  const entry = cache.get(userId);
  if (!entry || Date.now() - entry.at >= TTL_MS) return { hit: false, company: null };
  return { hit: true, company: entry.company };
}

/** Populate the cache. Safe to call unawaited; never rejects. */
export function refreshActiveCompany(userId) {
  if (!userId) return Promise.resolve(null);
  const existing = inflight.get(userId);
  if (existing) return existing;

  const p = query(
    `SELECT data->>'activeCompany' AS company
       FROM lumora_prep_state
      WHERE user_id = $1`,
    [userId],
  )
    .then((r) => {
      const company = r.rows[0]?.company || null;
      cache.set(userId, { company, at: Date.now() });
      return company;
    })
    .catch((err) => {
      console.warn('[activeCompany] lookup failed for user', userId, err.message);
      // Cache the miss so a database outage does not re-query on every question.
      cache.set(userId, { company: null, at: Date.now() });
      return null;
    })
    .finally(() => inflight.delete(userId));

  inflight.set(userId, p);
  return p;
}
