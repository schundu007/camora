// apps/playground-backend/src/routes/playgroundSaves.js
import { Router } from 'express';
import { randomBytes } from 'crypto';
import { Client } from 'ssh2';
import { query } from '../lib/db.js';
import { createSessionRecord, updateSessionStatus, setTTL } from '../services/playground/sessionStore.js';
import { getTaskAddress } from '../services/playground/nomadClient.js';
import { exportVmToR2, importVmFromR2, deleteVmImage, deleteR2Object } from '../services/playground/vmSaver.js';

export const playgroundSavesRouter = Router();

const PAID_PLANS = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);
const SLOTS = { free: 0, paid: 3, owner: 999 };
const MEM_MB = { ubuntu: 512, docker: 1024, 'agent-sandbox': 1536, 'k8s-single': 2048, 'k8s-multi': 4096, 'cloud-cli': 1536 };

function isOwner(email) {
  return (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).includes((email || '').toLowerCase());
}

function maxSlots(user) {
  if (isOwner(user.email)) return SLOTS.owner;
  if (PAID_PLANS.has(user.plan_type)) return SLOTS.paid;
  return SLOTS.free;
}

function sshRun(command, timeoutMs = 5 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let done = false;
    const finish = (fn, v) => { if (!done) { done = true; conn.end(); fn(v); } };
    const timer = setTimeout(() => finish(reject, new Error('SSH timeout')), timeoutMs);
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); return finish(reject, err); }
        let out = '', errOut = '';
        stream.on('data', d => { out += d; });
        stream.stderr.on('data', d => { errOut += d; });
        stream.on('close', code => {
          clearTimeout(timer);
          if (code !== 0) finish(reject, new Error(errOut.trim() || out.trim()));
          else finish(resolve, out.trim());
        });
      });
    });
    conn.on('error', e => { clearTimeout(timer); finish(reject, e); });
    conn.connect({
      host: (() => { const h = process.env.WORKER_HOST; if (!h) throw new Error('WORKER_HOST not configured'); return h; })(),
      port: parseInt(process.env.WORKER_SSH_PORT || '20022', 10),
      username: process.env.WORKER_USER || 'pgrunner',
      privateKey: (() => {
        const k = process.env.WORKER_SSH_KEY_B64;
        if (!k) throw new Error('WORKER_SSH_KEY_B64 not configured');
        return Buffer.from(k, 'base64').toString('utf8');
      })(),
      readyTimeout: 10_000,
    });
  });
}

// POST /api/v1/playground/saves
playgroundSavesRouter.post('/', async (req, res) => {
  const { sessionId, name } = req.body;
  if (!sessionId || !name?.trim()) return res.status(400).json({ error: 'sessionId and name are required' });
  let r2Key;
  try {
    const userId = parseInt(req.user.id, 10);
    const slots = maxSlots(req.user);
    if (slots === 0) return res.status(403).json({ error: 'VM saves require a Pro subscription', upgradeUrl: '/pricing' });
    const { rows: sessions } = await query(`SELECT * FROM playground_sessions WHERE id=$1 AND user_id=$2`, [sessionId, userId]);
    const session = sessions[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'ready' && session.status !== 'active') return res.status(400).json({ error: 'Session must be active to save' });
    if (!session.nomad_job_id) return res.status(400).json({ error: 'No container ID for session' });
    r2Key = `playground-saves/${userId}/${randomBytes(8).toString('hex')}.tar`;
    const { sizeBytes } = await exportVmToR2(session.nomad_job_id, r2Key);
    const { rows } = await query(
      `INSERT INTO playground_saved_vms (user_id, name, environment, r2_key, size_bytes)
       SELECT $1, $2, $3, $4, $5
       WHERE (SELECT COUNT(*) FROM playground_saved_vms WHERE user_id=$1) < $6
       RETURNING *`,
      [userId, name.trim(), session.environment, r2Key, sizeBytes, slots]
    );
    if (rows.length === 0) {
      deleteR2Object(r2Key).catch(() => {});
      return res.status(429).json({ error: `Save slot limit reached (${slots} max). Delete a saved VM to free a slot.` });
    }
    const saved = rows[0];
    return res.status(201).json({ id: saved.id, name: saved.name, environment: saved.environment, sizeBytes: saved.size_bytes, createdAt: saved.created_at });
  } catch (err) {
    console.error('[PlaygroundSaves] save error:', err.message);
    if (r2Key) deleteR2Object(r2Key).catch(() => {});
    return res.status(500).json({ error: 'Failed to save VM: ' + err.message });
  }
});

// GET /api/v1/playground/saves
playgroundSavesRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, environment, size_bytes, created_at, last_restored_at FROM playground_saved_vms WHERE user_id=$1 ORDER BY created_at DESC`,
      [parseInt(req.user.id, 10)]
    );
    return res.json({
      saves: rows.map(r => ({ id: r.id, name: r.name, environment: r.environment, sizeBytes: r.size_bytes, createdAt: r.created_at, lastRestoredAt: r.last_restored_at })),
      slots: { used: rows.length, max: maxSlots(req.user) },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list saves' });
  }
});

// POST /api/v1/playground/saves/:id/restore
playgroundSavesRouter.post('/:id/restore', async (req, res) => {
  let containerId;
  try {
    const userId = parseInt(req.user.id, 10);
    const { rows } = await query(`SELECT * FROM playground_saved_vms WHERE id=$1 AND user_id=$2`, [req.params.id, userId]);
    const save = rows[0];
    if (!save) return res.status(404).json({ error: 'Saved VM not found' });

    const { rows: activeSessions } = await query(
      `SELECT id FROM playground_sessions WHERE user_id=$1 AND status IN ('ready','active','provisioning') AND expires_at > NOW()`,
      [userId]
    );
    if (activeSessions.length > 0) {
      return res.status(409).json({ error: 'You already have an active session. End it before restoring a saved VM.' });
    }

    const mem = MEM_MB[save.environment];
    if (!mem) return res.status(400).json({ error: `Unknown environment: ${save.environment}` });

    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.\-:/]*$/.test(save.environment)) {
      return res.status(400).json({ error: 'Invalid environment name' });
    }

    const imageTag = `camora-saved-${save.id}:latest`;
    await importVmFromR2(save.r2_key, imageTag);

    const jobTag = randomBytes(6).toString('hex');
    containerId = await sshRun(
      `docker run -d --rm --memory=${mem}m --hostname playground-${save.environment} -e SESSION_ID=${userId}-${jobTag} -p 0:7681 -p 0:8080 ${imageTag}`
    );
    if (!containerId || containerId.length < 12) throw new Error(`docker run unexpected output: ${containerId}`);

    const { host, ttydPort, codeServerPort } = await getTaskAddress(containerId);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = await createSessionRecord(userId, save.environment, null, containerId, expiresAt, host, ttydPort, codeServerPort);
    await updateSessionStatus(session.id, 'ready');
    await setTTL(session.id, 3600);

    await query(`UPDATE playground_saved_vms SET last_restored_at=NOW() WHERE id=$1`, [save.id]);
    deleteVmImage(imageTag).catch(() => {});

    return res.status(201).json({ sessionId: session.id, expiresAt, environment: save.environment });
  } catch (err) {
    console.error('[PlaygroundSaves] restore error:', err.message);
    if (containerId) sshRun(`docker rm -f "${containerId}"`).catch(() => {});
    deleteVmImage(`camora-saved-${req.params.id}:latest`).catch(() => {});
    return res.status(500).json({ error: 'Failed to restore VM: ' + err.message });
  }
});

// DELETE /api/v1/playground/saves/:id
playgroundSavesRouter.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { rows } = await query(`SELECT * FROM playground_saved_vms WHERE id=$1 AND user_id=$2`, [req.params.id, userId]);
    const save = rows[0];
    if (!save) return res.status(404).json({ error: 'Saved VM not found' });
    await query(`DELETE FROM playground_saved_vms WHERE id=$1`, [save.id]);
    deleteR2Object(save.r2_key).catch(() => {});
    return res.json({ ok: true });
  } catch (err) {
    console.error('[PlaygroundSaves] delete error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});
