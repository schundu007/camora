/**
 * Thin re-export of @camora/shared-db. Both backends used to keep
 * verbatim copies of the pg pool here. The canonical implementation now
 * lives in packages/shared-db so a pool tweak (idleTimeout, max conns,
 * SSL rules) only needs to land in one place.
 */
export { getPool, query, closePool } from './_shared/db.js';
