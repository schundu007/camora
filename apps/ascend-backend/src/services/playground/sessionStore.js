import { query } from '../../config/database.js';
import { cacheSet, cacheDel } from '../redis.js';

query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS setup_script TEXT').catch(() => {});
query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS cluster_nodes JSONB').catch(() => {});
query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_port INTEGER').catch(() => {});
query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS radar_ready BOOLEAN DEFAULT FALSE').catch(() => {});
query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS became_ready_at TIMESTAMPTZ').catch(() => {});

export async function createSessionRecord(userId, environment, scenarioId, nomadJobId, expiresAt, ttydHost, ttydPort, codeServerPort, setupScript, clusterNodes, radarPort = null) {
  const result = await query(
    `INSERT INTO playground_sessions
       (user_id, environment, scenario_id, nomad_job_id, status, expires_at, ttyd_host, ttyd_port, code_server_port, setup_script, cluster_nodes, radar_port)
     VALUES ($1, $2, $3, $4, 'provisioning', $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [userId, environment, scenarioId || null, nomadJobId || null, expiresAt, ttydHost || null, ttydPort || null, codeServerPort || null, setupScript || null, clusterNodes ? JSON.stringify(clusterNodes) : null, radarPort || null],
  );
  return result.rows[0];
}

export async function getSession(sessionId) {
  const result = await query(
    'SELECT * FROM playground_sessions WHERE id = $1',
    [sessionId],
  );
  return result.rows[0] || null;
}

export async function updateSessionStatus(sessionId, status, extra = {}) {
  const setClauses = ['status = $2'];
  const values = [sessionId, status];
  let idx = 3;

  if (status === 'ready') {
    setClauses.push(`became_ready_at = COALESCE(became_ready_at, NOW())`);
  }

  for (const [col, val] of Object.entries(extra)) {
    setClauses.push(`${col} = $${idx++}`);
    values.push(val);
  }

  const result = await query(
    `UPDATE playground_sessions SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    values,
  );
  return result.rows[0];
}

export async function markExtended(sessionId, newExpiresAt) {
  const result = await query(
    `UPDATE playground_sessions
     SET status = 'active', extended = true, expires_at = $2
     WHERE id = $1
     RETURNING *`,
    [sessionId, newExpiresAt],
  );
  return result.rows[0];
}

export async function destroySession(sessionId) {
  const result = await query(
    `UPDATE playground_sessions
     SET status = 'destroyed', destroyed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId],
  );
  return result.rows[0];
}

export async function setTTL(sessionId, ttlSeconds) {
  await cacheSet(`playground:session:${sessionId}:ttl`, '1', ttlSeconds);
}

export async function clearTTL(sessionId) {
  await cacheDel(`playground:session:${sessionId}:ttl`);
}

export async function getUserDailyCount(userId) {
  const result = await query(
    `SELECT COUNT(*) AS count
     FROM playground_sessions
     WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '24 hours'`,
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
}

export async function getSessionHistory(userId, limit = 20) {
  const result = await query(
    `SELECT * FROM playground_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

export async function markRadarReady(sessionId) {
  await query(
    `UPDATE playground_sessions SET radar_ready = true WHERE id = $1`,
    [sessionId],
  );
}
