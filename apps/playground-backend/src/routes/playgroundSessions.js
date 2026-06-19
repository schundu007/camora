import { Router } from 'express';
import {
  createSession,
  destroySession,
  extendSession,
  checkSessionOwner,
} from '../services/playground/sessionManager.js';
import { getSession, getSessionHistory } from '../services/playground/sessionStore.js';
import { streamContainerLogs } from '../services/playground/logStreamer.js';

export const playgroundSessionsRouter = Router();

playgroundSessionsRouter.post('/', async (req, res) => {
  const { environment, scenarioId } = req.body;
  if (!environment) return res.status(400).json({ error: 'environment is required' });

  try {
    const result = await createSession({
      userId: parseInt(req.user.id, 10),
      userEmail: req.user.email,
      environment,
      scenarioId: scenarioId || null,
      plan: req.user.plan_type || null,
    });
    const body = {
      sessionId: result.sessionId,
      wsUrl: result.wsUrl,
      expiresAt: result.expiresAt,
      environment: result.environment,
    };
    if (result.isCluster) {
      body.isCluster = true;
      body.nodes = result.nodes;
    }
    return res.status(201).json(body);
  } catch (err) {
    if (err.code === 'ENV_NOT_ALLOWED') {
      return res.status(403).json({ error: 'Environment not available on free tier' });
    }
    if (err.code === 'DAILY_LIMIT_REACHED') {
      return res.status(429).json({ error: 'Daily session limit reached', upgradeUrl: '/pricing' });
    }
    if (err.message === 'NOMAD_ADDR not configured') {
      return res.status(503).json({ error: 'Playground infrastructure not available' });
    }
    console.error('[PlaygroundSessions] createSession error:', err.message);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

playgroundSessionsRouter.get('/history', async (req, res) => {
  try {
    const history = await getSessionHistory(parseInt(req.user.id, 10));
    return res.json({ sessions: history });
  } catch (err) {
    console.error('[PlaygroundSessions] history error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

playgroundSessionsRouter.get('/:id/events', async (req, res) => {
  try {
    await checkSessionOwner(req.params.id, parseInt(req.user.id, 10));
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const STEP_MAP = {
      container_ready: { label: 'Container started', phase: 'SYSTEM CHECKS', progress: 1, total: 4 },
      env_setup:       { label: 'Environment configured', phase: 'SYSTEM CHECKS', progress: 2, total: 4 },
      ide_start:       { label: 'IDE ready', phase: 'TOOLS', progress: 3, total: 4 },
      terminal_ready:  { label: 'Terminal ready', phase: 'TOOLS', progress: 4, total: 4 },
    };

    const sendEvent = (data) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    let done = false;
    const syntheticTimers = [];
    const sentSubSteps = [];

    const cancelSynthetics = () => {
      syntheticTimers.forEach((t) => clearTimeout(t));
      syntheticTimers.length = 0;
    };

    const finishSynthetics = () => {
      cancelSynthetics();
      for (const step of sentSubSteps) {
        if (!done) sendEvent({ step, status: 'done' });
      }
    };

    // Synthetic sub-steps so users see progress even when the container startup
    // script emits no __PROGRESS__ markers.
    const ENV_SUB_SCHEDULE = [
      { delay: 2000,  step: 'env_sub_shell', label: 'Initializing shell environment' },
      { delay: 8000,  step: 'env_sub_pkg',   label: 'Configuring packages' },
      { delay: 18000, step: 'env_sub_ide',   label: 'Starting code editor' },
      { delay: 32000, step: 'env_sub_term',  label: 'Starting terminal service' },
      { delay: 52000, step: 'env_sub_wait',  label: 'Waiting for services...' },
    ];
    for (const { delay, step, label } of ENV_SUB_SCHEDULE) {
      const t = setTimeout(() => {
        if (done) return;
        sendEvent({ step, label, status: 'running' });
        sentSubSteps.push(step);
      }, delay);
      syntheticTimers.push(t);
    }

    const deadline = setTimeout(() => {
      finishSynthetics();
      sendEvent({ type: 'ready' });
      done = true;
      ac.abort();
    }, 90 * 1000);

    // For cluster sessions, stream logs from the primary node (etcd1 / nodeIndex=0)
    // Its terminal_ready signal means the full cluster is healthy.
    let logTarget = session.nomad_job_id;
    if (session.is_cluster && session.cluster_nodes) {
      const nodes = typeof session.cluster_nodes === 'string'
        ? JSON.parse(session.cluster_nodes)
        : session.cluster_nodes;
      const primary = nodes.find((n) => n.nodeIndex === 0);
      if (primary?.containerId) logTarget = primary.containerId;
    }

    await streamContainerLogs(logTarget, (line) => {
      if (done) return;
      if (!line.includes('__PROGRESS__:')) return;
      const idx = line.indexOf('__PROGRESS__:');
      try {
        const event = JSON.parse(line.slice(idx + '__PROGRESS__:'.length));
        const meta = STEP_MAP[event.step];
        if (meta) {
          sendEvent({ ...event, ...meta });
          if (event.step === 'terminal_ready' && event.status === 'done') {
            clearTimeout(deadline);
            finishSynthetics();
            sendEvent({ type: 'ready' });
            done = true;
            ac.abort();
          }
        }
      } catch {}
    }, ac.signal);

    cancelSynthetics();
    clearTimeout(deadline);
    if (!res.writableEnded) res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream events' });
  }
});

playgroundSessionsRouter.get('/:id', async (req, res) => {
  try {
    const session = await checkSessionOwner(req.params.id, parseInt(req.user.id, 10));
    const now = Date.now();
    const expiresAt = new Date(session.expires_at).getTime();
    const timeRemaining = Math.max(0, expiresAt - now);
    const extendAvailable = !session.extended && timeRemaining < 300_000;

    const body = { ...session, timeRemaining, extendAvailable };

    if (session.is_cluster && session.cluster_nodes) {
      const WS_BASE = process.env.PLAYGROUND_WS_BASE || 'wss://playground-backend-production.up.railway.app';
      const nodes = typeof session.cluster_nodes === 'string'
        ? JSON.parse(session.cluster_nodes)
        : session.cluster_nodes;
      body.isCluster = true;
      body.wsUrl = `${WS_BASE}/playground/ws/${session.id}?node=0`;
      body.nodes = nodes.map(({ nodeIndex, nodeName }) => ({
        nodeIndex,
        nodeName,
        wsUrl: `${WS_BASE}/playground/ws/${session.id}?node=${nodeIndex}`,
      }));
    }

    return res.json(body);
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'Access denied' });
    if (err.status === 404) return res.status(404).json({ error: 'Session not found' });
    console.error('[PlaygroundSessions] getSession error:', err.message);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

playgroundSessionsRouter.post('/:id/extend', async (req, res) => {
  try {
    await checkSessionOwner(req.params.id, parseInt(req.user.id, 10));
    const result = await extendSession(req.params.id);
    return res.json(result);
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'Access denied' });
    if (err.status === 404) return res.status(404).json({ error: 'Session not found' });
    if (err.code === 'NOT_ACTIVE') return res.status(400).json({ error: 'Session is not active' });
    if (err.code === 'ALREADY_EXTENDED') return res.status(400).json({ error: 'Session already extended' });
    console.error('[PlaygroundSessions] extendSession error:', err.message);
    return res.status(500).json({ error: 'Failed to extend session' });
  }
});

playgroundSessionsRouter.delete('/:id', async (req, res) => {
  try {
    await checkSessionOwner(req.params.id, parseInt(req.user.id, 10));
    await destroySession(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'Access denied' });
    if (err.status === 404) return res.status(404).json({ error: 'Session not found' });
    console.error('[PlaygroundSessions] destroySession error:', err.message);
    return res.status(500).json({ error: 'Failed to destroy session' });
  }
});
