import { Router } from 'express';
import net from 'net';
import {
  createSession,
  destroySession,
  extendSession,
  checkSessionOwner,
} from '../services/playground/sessionManager.js';
import { getSession, getSessionHistory, updateSessionStatus } from '../services/playground/sessionStore.js';
import { execScriptInContainerStream } from '../services/playground/nomadClient.js';

export const playgroundSessionsRouter = Router();

playgroundSessionsRouter.post('/', async (req, res) => {
  const { environment, scenarioId, setupScript } = req.body;
  if (!environment) return res.status(400).json({ error: 'environment is required' });

  try {
    const result = await createSession({
      userId: req.user.id,
      userEmail: req.user.email,
      environment: environment === 'custom' ? 'ubuntu' : environment,
      scenarioId: scenarioId || null,
      plan: req.user.plan_type || null,
      setupScript: setupScript || null,
    });
    return res.status(201).json({
      sessionId: result.sessionId,
      wsUrl: result.wsUrl,
      expiresAt: result.expiresAt,
      environment: result.environment,
    });
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
    const history = await getSessionHistory(req.user.id);
    return res.json({ sessions: history });
  } catch (err) {
    console.error('[PlaygroundSessions] history error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

function tcpReady(host, port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port, timeout: 2000 });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
  });
}

async function pollUntilReady(host, port, abortSignal, deadlineMs) {
  while (!abortSignal.aborted && Date.now() < deadlineMs) {
    if (await tcpReady(host, port)) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

playgroundSessionsRouter.get('/:id/events', async (req, res) => {
  try {
    await checkSessionOwner(req.params.id, req.user.id);
    const session = await getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (data) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    const deadlineMs = Date.now() + 3 * 60 * 1000;
    const host = session.ttyd_host;
    const ttydPort = session.ttyd_port;
    const idePort = session.code_server_port;
    const hasScript = !!session.setup_script;
    const total = hasScript ? 5 : 4;

    sendEvent({ step: 'container_ready', label: 'Container started', status: 'done', phase: 'SYSTEM CHECKS', progress: 1, total });
    sendEvent({ step: 'env_setup', label: 'Environment starting', status: 'running', phase: 'SYSTEM CHECKS', progress: 2, total });

    await pollUntilReady(host, idePort, ac.signal, deadlineMs);
    if (ac.signal.aborted || res.writableEnded) return;

    sendEvent({ step: 'env_setup', label: 'Environment ready', status: 'done', phase: 'SYSTEM CHECKS', progress: 2, total });
    sendEvent({ step: 'ide_start', label: 'Starting IDE', status: 'running', phase: 'TOOLS', progress: 3, total });

    await pollUntilReady(host, ttydPort, ac.signal, deadlineMs);
    if (ac.signal.aborted || res.writableEnded) return;

    sendEvent({ step: 'ide_start', label: 'IDE ready', status: 'done', phase: 'TOOLS', progress: 3, total });
    sendEvent({ step: 'terminal_ready', label: 'Terminal ready', status: 'done', phase: 'TOOLS', progress: 4, total });

    if (hasScript) {
      sendEvent({ step: 'custom_tools_header', label: 'Installing custom tools', status: 'running', phase: 'SETUP', progress: 5, total });
      try {
        await execScriptInContainerStream(session.nomad_job_id, session.setup_script, (line) => {
          if (!line.startsWith('##PG##')) return;
          try {
            const ev = JSON.parse(line.slice(6));
            if (!ev.tool || !ev.status) return;
            if (ev.tool === '__done__') return;
            sendEvent({
              step: `tool_${ev.tool}`,
              label: ev.label || ev.tool,
              toolStatus: ev.status,
              status: (ev.status === 'done' || ev.status === 'skipped') ? 'done'
                : ev.status === 'error' ? 'error' : 'running',
              phase: 'SETUP',
              progress: 5,
              total,
            });
          } catch {}
        });
        sendEvent({ step: 'custom_tools_header', label: 'Tools ready', status: 'done', phase: 'SETUP', progress: 5, total });
      } catch (err) {
        console.warn('[PlaygroundSessions] setup script failed:', err.message);
        sendEvent({ step: 'custom_tools_header', label: 'Setup finished (some tools may have failed)', status: 'done', phase: 'SETUP', progress: 5, total });
      }
    }

    await updateSessionStatus(req.params.id, 'ready').catch(() => {});
    sendEvent({ type: 'ready' });

    if (!res.writableEnded) res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream events' });
    } else {
      if (!res.writableEnded) res.end();
    }
  }
});

playgroundSessionsRouter.get('/:id', async (req, res) => {
  try {
    const session = await checkSessionOwner(req.params.id, req.user.id);
    const now = Date.now();
    const expiresAt = new Date(session.expires_at).getTime();
    const timeRemaining = Math.max(0, expiresAt - now);
    const extendAvailable = !session.extended && timeRemaining < 300_000;

    return res.json({
      ...session,
      timeRemaining,
      extendAvailable,
    });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'Access denied' });
    if (err.status === 404) return res.status(404).json({ error: 'Session not found' });
    console.error('[PlaygroundSessions] getSession error:', err.message);
    return res.status(500).json({ error: 'Failed to get session' });
  }
});

playgroundSessionsRouter.post('/:id/extend', async (req, res) => {
  try {
    await checkSessionOwner(req.params.id, req.user.id);
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
    await checkSessionOwner(req.params.id, req.user.id);
    await destroySession(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: 'Access denied' });
    if (err.status === 404) return res.status(404).json({ error: 'Session not found' });
    console.error('[PlaygroundSessions] destroySession error:', err.message);
    return res.status(500).json({ error: 'Failed to destroy session' });
  }
});
