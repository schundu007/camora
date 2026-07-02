/**
 * Generic per-user localStorage store.
 *
 * SECURITY: like the Prep Kit before it was fixed, several caches held the
 * logged-in user's *work* (coding history, system-design sessions, practice
 * whiteboards) under a single global key that was never scoped per-user nor
 * cleared on logout. On a shared browser the next account inherited it. This
 * helper closes that class of bug for local-only caches.
 *
 * Difference from `prepStorage`: those caches have NO server backup, so the
 * legacy global blob is *migrated* into the current user's scoped key (then
 * the global copy is deleted) rather than discarded — otherwise a single-user
 * machine would lose real work. Combined with clear-on-logout, no later
 * account can inherit it.
 *
 * Stored shape is `{ _ownerId, v }`; callers see only `v` (their native
 * array/object). Reads whose `_ownerId` doesn't match the current user are
 * refused (defense in depth).
 */

import { getStoredUserId } from '../utils/userStore';

const OWNER_FIELD = '_ownerId';

// Every scoped base/prefix registered here so logout can wipe them all in one
// pass — including dynamic keys created only after their page mounts.
const REGISTERED_BASES = new Set<string>();
const REGISTERED_LEGACY = new Set<string>();
const REGISTERED_PREFIXES = new Set<string>();

export interface UserScopedStore<T> {
  read(userId?: string | null): T | null;
  write(value: T, userId?: string | null): void;
  clear(userId?: string | null): void;
  base: string;
}

export function makeUserScopedStore<T>(
  baseKey: string,
  legacyKeys: string[] = [],
): UserScopedStore<T> {
  REGISTERED_BASES.add(baseKey);
  for (const k of legacyKeys) REGISTERED_LEGACY.add(k);

  const keyFor = (uid: string | null) => (uid ? `${baseKey}::${uid}` : null);

  function read(userId: string | null = getStoredUserId()): T | null {
    const key = keyFor(userId);
    if (!key || typeof localStorage === 'undefined') return null;
    try {
      let raw = localStorage.getItem(key);
      // One-time migration: adopt a legacy global blob into THIS user's key,
      // then delete the global copy so no later account can inherit it.
      if (raw == null) {
        for (const lk of legacyKeys) {
          const legacyRaw = localStorage.getItem(lk);
          if (legacyRaw != null) {
            try {
              const migrated = JSON.stringify({ [OWNER_FIELD]: userId, v: JSON.parse(legacyRaw) });
              localStorage.setItem(key, migrated);
              raw = migrated;
            } catch { /* corrupt legacy blob — skip */ }
            localStorage.removeItem(lk);
            break;
          }
        }
      }
      if (raw == null) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed[OWNER_FIELD] != null && parsed[OWNER_FIELD] !== userId) return null;
      return parsed.v as T;
    } catch {
      return null;
    }
  }

  function write(value: T, userId: string | null = getStoredUserId()): void {
    const key = keyFor(userId);
    if (!key || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify({ [OWNER_FIELD]: userId, v: value }));
    } catch { /* quota / private mode — best-effort */ }
  }

  function clear(userId: string | null = getStoredUserId()): void {
    const key = keyFor(userId);
    if (!key || typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(key); } catch { /* best-effort */ }
  }

  return { read, write, clear, base: baseKey };
}

// ── Concrete stores ─────────────────────────────────────────────────────
// Defined here (not in each hook) so that importing this module — which
// AuthContext does for clearAllUserScopedStores — registers every base up
// front. Otherwise a user who never opened, say, the coding page would have
// an unregistered base and logout wouldn't wipe it.

/** Capra coding-practice history (≤30 entries). Legacy global keys carried
 *  the owner's data unscoped. */
export const codingHistoryStore = makeUserScopedStore<any[]>(
  'camora_coding_history',
  ['chundu_coding_history', 'ascend_coding_history'],
);

/** Capra system-design practice sessions. */
export const systemDesignStore = makeUserScopedStore<any[]>(
  'camora_system_design_sessions',
  ['chundu_system_design_sessions'],
);

/** Practice-mode Excalidraw whiteboards. */
export const whiteboardStore = makeUserScopedStore<any[]>(
  'camora_practice_whiteboards_scoped',
  ['camora_practice_whiteboards'],
);

/** Playground VM session handle ({ sessionId, environment, expiresAt }). */
export const playgroundSessionStore = makeUserScopedStore<any>(
  'camora_pg_session_scoped',
  ['camora_pg_session'],
);

/** Solved SQL-playground problem ids. */
export const sqlSolvedStore = makeUserScopedStore<string[]>(
  'sql_playground_solved_scoped',
  ['sql_playground_solved'],
);

/** Blind-75 completed ids + challenge stats (Capra progress). */
export const blind75CompletedStore = makeUserScopedStore<any[]>(
  'blind75_completed_scoped',
  ['blind75_completed'],
);
export const challengeStatsStore = makeUserScopedStore<any>(
  'camora_challenge_stats_scoped',
  ['camora_challenge_stats'],
);

// Keys wiped on logout WITHOUT per-user scoping:
//  - interview_contexts_v1/_active: dead surface (no live callers), just
//    purge any stale blob.
//  - lumora_audio_prefs_v1: device ids are machine-specific so scoping
//    per-user is wrong, but the next account shouldn't inherit the previous
//    user's device selection / "wizard done" flag — and it re-syncs from the
//    server per-user on next login.
// (Pure UI prefs — coding/meeting platform, language, cloud provider — are
//  intentionally left global: not sensitive, and clearing them hurts UX.)
//  - DashboardPage `chundu_current_*` / solution / diagram: transient
//    "current work" drafts written unscoped; clear on logout so the next
//    account never inherits the previous user's in-progress problem/solution.
for (const k of [
  'lumora_interview_contexts_v1',
  'lumora_interview_contexts_v1_active',
  'lumora_audio_prefs_v1',
  'chundu_current_problem',
  'chundu_loaded_problem',
  'chundu_current_solution',
  'chundu_eraser_diagram',
]) {
  REGISTERED_LEGACY.add(k);
}

/** Ascend voice-mode prep material (JD / resume / prep notes) + transcript. */
export const voiceJdStore = makeUserScopedStore<string>('voice_jd_scoped', ['voice_jd']);
export const voiceResumeStore = makeUserScopedStore<string>('voice_resume_scoped', ['voice_resume']);
export const voicePrepStore = makeUserScopedStore<string>('voice_prep_scoped', ['voice_prep']);
export const ascendAssistantHistoryStore = makeUserScopedStore<any[]>(
  'ascend_assistant_history_scoped',
  ['ascend_assistant_history'],
);

/** Ascend Prep Modal company data (cached JD/resume per company). Only
 *  `prepCompanies` migrates verbatim; the older `prepInputs`/`prepGenerated`
 *  need a reshape that the modal still does, so they are registered for
 *  logout-cleanup only (below) rather than auto-migrated here. */
export const prepCompaniesStore = makeUserScopedStore<any>(
  'prepCompanies_scoped',
  ['prepCompanies'],
);
for (const k of ['prepInputs', 'prepGenerated']) REGISTERED_LEGACY.add(k);

// ── Dynamic-key localStorage store ───────────────────────────────────────
// Sona sidebar chat is keyed by surface (coding/design) and lives in
// localStorage, so it gets full per-user scoping. The static prefix is
// registered so logout wipes every instance, even ones not created this
// session.
REGISTERED_PREFIXES.add('lumora_sona_sidebar_');

/** Sona sidebar chat for a coding/design surface. */
export function sonaSidebarStoreFor(surface: string): UserScopedStore<any> {
  const base = `lumora_sona_sidebar_${surface}`;
  return makeUserScopedStore<any>(base, [base]);
}

// ── sessionStorage user-data (cleared on logout only) ────────────────────
// These live in sessionStorage (ephemeral, per-tab) so per-user scoping adds
// little — but logout is a same-tab navigation, so a second account in the
// same tab would inherit them. Clearing on logout closes that. `behavioral_`
// is a prefix (per-assistant); the last-answer keys are exact.
const SESSION_CLEAR_PREFIXES = ['lumora_behavioral_'];
const SESSION_CLEAR_KEYS = ['lumora:lastCodingAnswer', 'lumora:lastDesignAnswer'];

/** Wipe every registered user-scoped cache (all users) plus their legacy
 *  global keys, dynamic-prefix keys, and the ephemeral sessionStorage
 *  user-data buckets. Called from AuthContext.logout so the next account on
 *  this browser starts clean. */
export function clearAllUserScopedStores(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      for (const lk of REGISTERED_LEGACY) localStorage.removeItem(lk);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        // Scoped keys for fixed bases.
        let removed = false;
        for (const base of REGISTERED_BASES) {
          if (k.startsWith(`${base}::`)) { localStorage.removeItem(k); removed = true; break; }
        }
        if (removed) continue;
        // Dynamic prefixes — matches both legacy (`prefix<x>`) and scoped
        // (`prefix<x>::<uid>`) instances.
        for (const p of REGISTERED_PREFIXES) {
          if (k.startsWith(p)) { localStorage.removeItem(k); break; }
        }
      }
    } catch { /* best-effort */ }
  }
  if (typeof sessionStorage !== 'undefined') {
    try {
      for (const sk of SESSION_CLEAR_KEYS) sessionStorage.removeItem(sk);
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && SESSION_CLEAR_PREFIXES.some((p) => k.startsWith(p))) sessionStorage.removeItem(k);
      }
    } catch { /* best-effort */ }
  }
}
