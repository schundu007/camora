import { randomBytes } from 'crypto';
import { scheduleJob, getTaskAddress, stopJob, createClusterNetwork, scheduleClusterNode, stopClusterJob } from './nomadClient.js';
import {
  createSessionRecord,
  getSession,
  updateSessionStatus,
  markExtended,
  destroySession as destroySessionRecord,
  setTTL,
  clearTTL,
  getUserDailyCount,
  updateClusterNodes,
} from './sessionStore.js';

const FREE_ENVIRONMENTS = new Set(['ubuntu', 'docker']);
const FREE_DAILY_LIMIT = 1;
const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);
const CLUSTER_ENVIRONMENTS = new Set([]);
const CLUSTER_NODE_NAMES = ['etcd1', 'etcd2', 'etcd3'];

function isClusterEnvironment(env) {
  return CLUSTER_ENVIRONMENTS.has(env);
}

function isOwner(email) {
  const owners = (process.env.OWNER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return owners.includes((email || '').toLowerCase());
}

function isPaidPlan(plan) {
  return PAID_PLAN_TYPES.has(plan);
}

export async function createSession({ userId, userEmail, environment, scenarioId, plan }) {
  const owner = isOwner(userEmail);
  const paid = owner || isPaidPlan(plan);

  if (!paid && !FREE_ENVIRONMENTS.has(environment)) {
    const err = new Error('Environment not available on free tier');
    err.code = 'ENV_NOT_ALLOWED';
    throw err;
  }

  if (!paid) {
    const dailyCount = await getUserDailyCount(userId);
    if (dailyCount >= FREE_DAILY_LIMIT) {
      const err = new Error('Daily session limit reached');
      err.code = 'DAILY_LIMIT_REACHED';
      throw err;
    }
  }

  const jobTag = randomBytes(6).toString('hex');
  const sessionTag = `${userId}-${jobTag}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  if (isClusterEnvironment(environment)) {
    // Create a placeholder session record first so we have a stable session.id (UUID)
    const placeholderSession = await createSessionRecord(userId, environment, scenarioId, null, expiresAt, null, null, null);
    const sessionId = placeholderSession.id;

    // Mark is_cluster in DB immediately
    await updateSessionStatus(sessionId, 'provisioning', { is_cluster: true });

    // 1. Create bridge network
    const networkName = await createClusterNetwork(sessionId);

    // 2. Start all cluster node containers in parallel
    const nodeResults = await Promise.all(
      CLUSTER_NODE_NAMES.map((nodeName, nodeIndex) =>
        scheduleClusterNode(sessionId, nodeIndex, nodeName, networkName)
      )
    );

    // 3. Resolve port mappings in parallel — use primary container (etcd1) for nomad_job_id
    const nodeAddresses = await Promise.all(
      nodeResults.map((containerId) => getTaskAddress(containerId))
    );

    const nodes = CLUSTER_NODE_NAMES.map((nodeName, nodeIndex) => ({
      nodeIndex,
      nodeName,
      containerId: nodeResults[nodeIndex],
      ttydPort: nodeAddresses[nodeIndex].ttydPort,
      codeServerPort: nodeAddresses[nodeIndex].codeServerPort,
      ttydHost: nodeAddresses[nodeIndex].host,
    }));

    // 4. Persist network + nodes; primary container id stored as nomad_job_id for log streaming
    await updateClusterNodes(sessionId, networkName, nodes);
    await updateSessionStatus(sessionId, 'ready', { nomad_job_id: nodes[0].containerId });
    await setTTL(sessionId, 3600);

    const WS_BASE = process.env.PLAYGROUND_WS_BASE || 'wss://playground-backend-production.up.railway.app';
    return {
      sessionId,
      environment,
      isCluster: true,
      expiresAt,
      wsUrl: `${WS_BASE}/playground/ws/${sessionId}?node=0`,
      nodes: nodes.map(({ nodeIndex, nodeName }) => ({
        nodeIndex,
        nodeName,
        wsUrl: `${WS_BASE}/playground/ws/${sessionId}?node=${nodeIndex}`,
      })),
    };
  }

  // ── Single-container flow (unchanged) ────────────────────────────────────
  const { jobId } = await scheduleJob(sessionTag, environment, scenarioId);

  const { host, ttydPort, codeServerPort } = await getTaskAddress(jobId);

  const session = await createSessionRecord(userId, environment, scenarioId, jobId, expiresAt, host, ttydPort, codeServerPort);

  await updateSessionStatus(session.id, 'ready');
  await setTTL(session.id, 3600);

  return {
    sessionId: session.id,
    wsUrl: `ws://${host}:${ttydPort}`,
    expiresAt,
    environment,
    host,
    port: ttydPort,
    codeServerPort,
  };
}

export async function destroySession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return;

  if (session.is_cluster && session.cluster_nodes) {
    const nodes = typeof session.cluster_nodes === 'string'
      ? JSON.parse(session.cluster_nodes)
      : session.cluster_nodes;
    const containerIds = nodes.map((n) => n.containerId).filter(Boolean);
    try {
      await stopClusterJob(sessionId, session.cluster_network, containerIds);
    } catch (err) {
      console.warn(`[PlaygroundSession] stopClusterJob failed for ${sessionId}:`, err.message);
    }
  } else if (session.nomad_job_id) {
    try {
      await stopJob(session.nomad_job_id);
    } catch (err) {
      console.warn(`[PlaygroundSession] stopJob failed for ${session.nomad_job_id}:`, err.message);
    }
  }

  await destroySessionRecord(sessionId);
  await clearTTL(sessionId);
}

export async function extendSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) {
    const err = new Error('Session not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (session.status !== 'active' && session.status !== 'ready') {
    const err = new Error('Session is not active');
    err.code = 'NOT_ACTIVE';
    throw err;
  }
  if (session.extended) {
    const err = new Error('Session already extended');
    err.code = 'ALREADY_EXTENDED';
    throw err;
  }

  const newExpiry = new Date(new Date(session.expires_at).getTime() + 15 * 60 * 1000);
  await markExtended(sessionId, newExpiry);

  const remainingMs = newExpiry.getTime() - Date.now();
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  await setTTL(sessionId, remainingSeconds);

  return { expiresAt: newExpiry };
}

export async function checkSessionOwner(sessionId, userId) {
  const session = await getSession(sessionId);
  if (!session) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
  if (session.user_id !== userId) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }
  return session;
}
