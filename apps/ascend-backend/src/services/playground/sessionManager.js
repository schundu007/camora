import { randomBytes } from 'crypto';
import { scheduleJob, getTaskAddress, stopJob } from './nomadClient.js';
import {
  createSessionRecord,
  getSession,
  updateSessionStatus,
  markExtended,
  destroySession as destroySessionRecord,
  setTTL,
  clearTTL,
  getUserDailyCount,
} from './sessionStore.js';

const FREE_ENVIRONMENTS = new Set(['ubuntu', 'docker']);
const FREE_DAILY_LIMIT = 1;
const PAID_PLAN_TYPES = new Set(['pro_monthly', 'pro_yearly', 'team', 'lifetime']);

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

  // Unique job ID per session — prevents collisions when same user creates multiple sessions.
  const jobTag = randomBytes(6).toString('hex');
  const { jobId } = await scheduleJob(`${userId}-${jobTag}`, environment, scenarioId);

  const { host, port } = await getTaskAddress(jobId);

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const session = await createSessionRecord(userId, environment, scenarioId, jobId, expiresAt, host, port);

  await updateSessionStatus(session.id, 'ready');
  await setTTL(session.id, 3600);

  return {
    sessionId: session.id,
    wsUrl: `ws://${host}:${port}`,
    expiresAt,
    environment,
    host,
    port,
  };
}

export async function destroySession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return;

  if (session.nomad_job_id) {
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
