/**
 * Per-user localStorage for the Lumora Prep Kit.
 *
 * SECURITY: the Prep Kit was previously cached under a single global key
 * (`lumora_prep_v8`) with no per-user scoping and no clear-on-logout. On a
 * shared browser that leaked one user's JD/resume/generated answers into the
 * next account — the panel rendered the stale blob on mount and the hydration
 * effect even backfilled it into the new user's server row. See
 * LumoraDocsPanel's hydration effect.
 *
 * This module scopes the cache to the authenticated user's id:
 *   lumora_prep_v8::<userId>
 * and stamps each blob with `_ownerId` so a mismatched read is refused even
 * if a key is somehow shared. Every reader of the Prep Kit cache (the panel,
 * the live-assistant inference, the company picker) must go through here so
 * they all agree on the key and the ownership check.
 *
 * The current user id comes from `userStore`, which AuthContext mirrors
 * synchronously on every `user` change.
 */

import { getStoredUserId } from '../utils/userStore';

/** Base key. Bumped to v9 to abandon the unscoped v8 blob entirely — no
 *  user should inherit whatever the pre-fix global key holds. */
export const PREP_BASE_KEY = 'lumora_prep_v9';

/** The unscoped keys from before the per-user migration. Unattributable to
 *  any user, so they are purged rather than migrated (the server is the
 *  source of truth and each user hydrates their own row on mount). */
const LEGACY_GLOBAL_KEYS = ['lumora_prep_v8', 'lumora_prep_v7'];

/** Owner-stamp field kept in the stored blob but never surfaced to callers. */
const OWNER_FIELD = '_ownerId';

export function prepKeyFor(userId: string | null): string | null {
  if (!userId) return null;
  return `${PREP_BASE_KEY}::${userId}`;
}

/** Read the current user's prep blob, or null when the user is unknown, the
 *  entry is missing/corrupt, or its `_ownerId` doesn't match (defense in
 *  depth). The returned object has the owner stamp stripped. */
export function readPrepRaw(userId: string | null = getStoredUserId()): any | null {
  const key = prepKeyFor(userId);
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const r = localStorage.getItem(key);
    if (!r) return null;
    const data = JSON.parse(r);
    if (!data || typeof data !== 'object') return null;
    // Ownership guard — a blob stamped for another user is never returned.
    if (data[OWNER_FIELD] != null && data[OWNER_FIELD] !== userId) return null;
    delete data[OWNER_FIELD];
    return data;
  } catch {
    return null;
  }
}

/** Write the current user's prep blob under their scoped key, stamped with
 *  their id. No-ops when the user is unknown so we never write to a global
 *  key that a later account could inherit. */
export function writePrepRaw(data: any, userId: string | null = getStoredUserId()): void {
  const key = prepKeyFor(userId);
  if (!key || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, [OWNER_FIELD]: userId }));
  } catch { /* quota / private mode — cache is best-effort */ }
}

/** Remove every prep cache — all per-user keys plus the legacy global keys.
 *  Called on logout so the next account can never inherit the previous one. */
export function clearAllPrepCaches(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    for (const k of LEGACY_GLOBAL_KEYS) localStorage.removeItem(k);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${PREP_BASE_KEY}::`)) localStorage.removeItem(k);
    }
  } catch { /* best-effort */ }
}

/** One-time cleanup of the pre-fix unscoped keys. Safe to call repeatedly.
 *  The old blob is unattributable, so it is discarded, not migrated. */
export function purgeLegacyGlobalPrep(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    for (const k of LEGACY_GLOBAL_KEYS) localStorage.removeItem(k);
  } catch { /* best-effort */ }
}
