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

export async function query(text, params) {
  let client;
  try {
    client = await getPool().connect();
  } catch (err) {
    console.error('[shared-db] Connection failed:', err.message);
    throw err;
  }
  try {
    return await client.query(text, params);
  } finally {
    if (client) client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
