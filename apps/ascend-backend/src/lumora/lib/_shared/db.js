/**
 * pg pool helpers — inlined from packages/shared-db/src/index.js. See note in
 * _shared/auth.js. Keep this in sync with the lumora-backend copy.
 */
import pg from 'pg';

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

// Connection-class errors that are worth retrying. Anything else (syntax,
// constraint, permissions) is deterministic and should fail fast.
const RETRYABLE_CODES = new Set([
  'ECONNREFUSED',     // PG container not listening
  'ECONNRESET',       // PG closed mid-query
  'ETIMEDOUT',        // pool connection timeout
  'EHOSTUNREACH',
  'ENETUNREACH',
  '57P03',            // PG: cannot_connect_now (still starting up)
  '57P01',            // PG: admin_shutdown
  '57P02',            // PG: crash_shutdown
  '08000', '08003', '08006', '08001', '08004', // pg connection_exception family
]);

function isRetryableConnectionError(err) {
  if (!err) return false;
  if (err.code && RETRYABLE_CODES.has(err.code)) return true;
  const msg = String(err.message || '');
  // Common pg pool messages that don't surface a code — pattern-match safely.
  return /connection terminated|timeout|ECONNREFUSED|starting up|server closed/i.test(msg);
}

const MAX_ATTEMPTS = 4;          // 1 initial + 3 retries
const BACKOFF_MS = [500, 1500, 4000]; // ~6s of total retry budget

export async function query(text, params) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let client;
    try {
      client = await getPool().connect();
    } catch (err) {
      lastErr = err;
      if (!isRetryableConnectionError(err) || attempt === MAX_ATTEMPTS - 1) {
        console.error('[shared-db] Connection failed:', err.message || err.code || 'no message');
        throw err;
      }
      // Reset the pool on connection class errors — pg can wedge a stale
      // pool internally after a remote-end restart, where every subsequent
      // connect() returns the same EOF/ECONNRESET. Recreating it forces
      // fresh sockets on the next attempt.
      try { if (pool) { await pool.end().catch(() => {}); pool = null; } } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
      continue;
    }
    try {
      return await client.query(text, params);
    } catch (err) {
      lastErr = err;
      // Connection-class mid-query errors get one more shot too. Anything
      // else (syntax, constraint, permissions) is a programmer error —
      // fail fast so the caller sees it.
      if (isRetryableConnectionError(err) && attempt < MAX_ATTEMPTS - 1) {
        client.release(true); // mark broken so pool discards it
        try { if (pool) { await pool.end().catch(() => {}); pool = null; } } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
        continue;
      }
      throw err;
    } finally {
      if (client) {
        try { client.release(); } catch { /* already released as broken */ }
      }
    }
  }
  throw lastErr;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
