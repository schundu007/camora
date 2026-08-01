import { Router } from 'express';
import net from 'net';
import {
  createSession,
  destroySession,
  extendSession,
  checkSessionOwner,
} from '../services/playground/sessionManager.js';
import { getSession, getSessionHistory, updateSessionStatus } from '../services/playground/sessionStore.js';
import { execScriptInContainerStream, execInContainer } from '../services/playground/nomadClient.js';
import { parseClusterList, getExecContainer } from '../services/playground/clusterState.js';
import { validateExercise } from '../services/k8s/validator.js';
import { query } from '../config/database.js';
import { isAdminEmail } from '../lib/adminEmails.js';

function isOwner(email) {
  return isAdminEmail(email);
}

export const playgroundSessionsRouter = Router();

const API_URL = process.env.PLAYGROUND_API_URL || process.env.ASCEND_API_URL || 'http://localhost:3009';

function buildNodeWsUrl(sessionId, nodeIndex) {
  const base = API_URL.replace(/^http/, 'ws');
  return `${base}/playground/ws/${sessionId}/node/${nodeIndex}`;
}

function parseClusterNodes(session) {
  if (!session.cluster_nodes) return null;
  return Array.isArray(session.cluster_nodes)
    ? session.cluster_nodes
    : JSON.parse(session.cluster_nodes);
}

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
      wsUrl: result.wsUrl || null,
      expiresAt: result.expiresAt,
      environment: result.environment,
      isCluster: result.isCluster || false,
      nodes: result.nodes
        ? result.nodes.map(n => ({ ...n, wsUrl: buildNodeWsUrl(result.sessionId, n.nodeIndex) }))
        : null,
    });
  } catch (err) {
    if (err.code === 'ENV_NOT_ALLOWED') return res.status(403).json({ error: 'Environment not available on free tier' });
    if (err.code === 'DAILY_LIMIT_REACHED') return res.status(429).json({ error: 'Daily session limit reached', upgradeUrl: '/pricing' });
    if (err.message === 'NOMAD_ADDR not configured') return res.status(503).json({ error: 'Playground infrastructure not available' });
    console.error('[PlaygroundSessions] createSession error:', err.message);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

playgroundSessionsRouter.get('/metrics', async (req, res) => {
  if (!isOwner(req.user?.email)) return res.status(403).json({ error: 'Admin only' });
  const win = req.query.window === '30d' ? 30 : 7;
  try {
    const [successRow, latencyRow, activeRow, extensionRow, dailyRow, envRow, errorRow] = await Promise.all([
      query(`SELECT COUNT(*) FILTER (WHERE status IN ('ready','active','destroyed')) AS total, COUNT(*) FILTER (WHERE became_ready_at IS NOT NULL) AS succeeded FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days'`),
      query(`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (became_ready_at - created_at))) AS p50, percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (became_ready_at - created_at))) AS p95 FROM playground_sessions WHERE became_ready_at IS NOT NULL AND created_at >= NOW() - INTERVAL '${win} days'`),
      query(`SELECT COUNT(*) AS count FROM playground_sessions WHERE status IN ('provisioning','ready','active')`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE extended = true) AS extended FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days'`),
      query(`SELECT DATE_TRUNC('day', created_at)::date AS date, COUNT(*) AS count FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days' GROUP BY 1 ORDER BY 1`),
      query(`SELECT environment, COUNT(*) AS count FROM playground_sessions WHERE created_at >= NOW() - INTERVAL '${win} days' GROUP BY environment`),
      query(`SELECT status, COUNT(*) AS count FROM playground_sessions WHERE status IN ('error','timeout') AND created_at >= NOW() - INTERVAL '${win} days' GROUP BY status`),
    ]);
    const total = parseInt(successRow.rows[0]?.total || 0, 10);
    const succeeded = parseInt(successRow.rows[0]?.succeeded || 0, 10);
    const extTotal = parseInt(extensionRow.rows[0]?.total || 0, 10);
    const extExtended = parseInt(extensionRow.rows[0]?.extended || 0, 10);
    return res.json({
      successRate: total > 0 ? Math.round((succeeded / total) * 1000) / 1000 : null,
      bootP50: latencyRow.rows[0]?.p50 != null ? Math.round(latencyRow.rows[0].p50) : null,
      bootP95: latencyRow.rows[0]?.p95 != null ? Math.round(latencyRow.rows[0].p95) : null,
      activeCount: parseInt(activeRow.rows[0]?.count || 0, 10),
      extensionRate: extTotal > 0 ? Math.round((extExtended / extTotal) * 1000) / 1000 : null,
      dailyVolume: dailyRow.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
      environmentBreakdown: Object.fromEntries(envRow.rows.map(r => [r.environment, parseInt(r.count, 10)])),
      errorBreakdown: Object.fromEntries(errorRow.rows.map(r => [r.status, parseInt(r.count, 10)])),
    });
  } catch (err) {
    console.error('[PlaygroundSessions] metrics error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

playgroundSessionsRouter.get('/my-stats', async (req, res) => {
  try {
    const [totalsRow, favRow] = await Promise.all([
      query(`SELECT COUNT(*) AS total_sessions, ROUND(SUM(LEAST(EXTRACT(EPOCH FROM (COALESCE(destroyed_at, NOW()) - created_at)), 28800)) / 60)::numeric AS total_minutes, COUNT(*) FILTER (WHERE became_ready_at IS NOT NULL OR status IN ('ready','active','destroyed'))::float / NULLIF(COUNT(*), 0) AS success_rate, MAX(created_at) AS last_active FROM playground_sessions WHERE user_id = $1`, [req.user.id]),
      query(`SELECT environment, COUNT(*) AS count FROM playground_sessions WHERE user_id = $1 GROUP BY environment ORDER BY count DESC LIMIT 1`, [req.user.id]),
    ]);
    const row = totalsRow.rows[0] || {};
    return res.json({
      totalSessions: parseInt(row.total_sessions || 0, 10),
      totalMinutes: parseInt(row.total_minutes || 0, 10),
      favoriteEnvironment: favRow.rows[0]?.environment || null,
      successRate: row.success_rate != null ? Math.round(parseFloat(row.success_rate) * 1000) / 1000 : null,
      lastActive: row.last_active || null,
    });
  } catch (err) {
    console.error('[PlaygroundSessions] my-stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
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

    const clusterNodes = parseClusterNodes(session);

    if (clusterNodes) {
      const total = clusterNodes.length + 1;
      sendEvent({ step: 'container_ready', label: 'Cluster starting', status: 'done', phase: 'SYSTEM CHECKS', progress: 1, total });

      await Promise.all(clusterNodes.map(async (node, i) => {
        sendEvent({ step: `node_${node.nodeName}`, label: `${node.nodeName} starting`, status: 'running', phase: 'NODES', progress: i + 2, total });
        await pollUntilReady(node.host, node.ttydPort, ac.signal, deadlineMs);
        if (!ac.signal.aborted && !res.writableEnded) {
          sendEvent({ step: `node_${node.nodeName}`, label: `${node.nodeName} ready`, status: 'done', phase: 'NODES', progress: i + 2, total });
        }
      }));

      if (!ac.signal.aborted && !res.writableEnded) {
        await updateSessionStatus(req.params.id, 'ready').catch(() => {});
        sendEvent({ type: 'ready' });
        res.end();
      }
      return;
    }

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
              status: (ev.status === 'done' || ev.status === 'skipped') ? 'done' : ev.status === 'error' ? 'error' : 'running',
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
    if (!res.headersSent) res.status(500).json({ error: 'Failed to stream events' });
    else if (!res.writableEnded) res.end();
  }
});

playgroundSessionsRouter.get('/:id', async (req, res) => {
  try {
    const session = await checkSessionOwner(req.params.id, req.user.id);
    const now = Date.now();
    const expiresAt = new Date(session.expires_at).getTime();
    const timeRemaining = Math.max(0, expiresAt - now);
    const extendAvailable = !session.extended && timeRemaining < 300_000;

    const clusterNodes = parseClusterNodes(session);
    const isCluster = !!clusterNodes;
    const nodes = clusterNodes
      ? clusterNodes.map(n => ({
          ...n,
          wsUrl: buildNodeWsUrl(session.id, n.nodeIndex),
          status: session.status === 'ready' ? 'ready' : n.status,
        }))
      : null;

    return res.json({
      ...session,
      timeRemaining,
      extendAvailable,
      isCluster,
      nodes,
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

playgroundSessionsRouter.post('/:id/validate-exercise', async (req, res) => {
  const { exerciseId } = req.body;
  if (!exerciseId) return res.status(400).json({ error: 'exerciseId required' });
  const session = await getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) return res.status(404).end();
  const K8S_ENVS = new Set(['k8s-single', 'k8s-multi']);
  if (!K8S_ENVS.has(session.environment)) return res.status(400).json({ error: 'Not a k8s session' });
  try {
    const exRes = await query('SELECT * FROM k8s_exercises WHERE id=$1', [exerciseId]);
    if (!exRes.rows.length) return res.status(404).json({ error: 'Exercise not found' });
    const exercise = exRes.rows[0];
    const containerId = getExecContainer(session);
    if (!containerId) return res.status(400).json({ error: 'Cannot resolve container' });
    const result = await validateExercise(containerId, exercise.spec);
    if (result.pass) {
      await query(
        'INSERT INTO k8s_progress(user_id,exercise_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [req.user.id, exerciseId],
      );
    }
    return res.json(result);
  } catch (err) {
    console.error('[PlaygroundSessions] validate-exercise error:', err.message);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

const K8S_CLUSTER_ENVS = new Set(['k8s-single', 'k8s-multi']);

playgroundSessionsRouter.get('/:id/cluster-state', async (req, res) => {
  const session = await getSession(req.params.id);
  if (!session || session.user_id !== req.user.id) return res.status(404).end();
  if (!K8S_CLUSTER_ENVS.has(session.environment)) {
    return res.status(400).json({ error: 'cluster-state only available for k8s environments' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let closed = false;
  req.on('close', () => { closed = true; });

  const containerId = getExecContainer(session);
  if (!containerId) { res.end(); return; }

  const CMD = 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl get pods,nodes,events,services -A -o json 2>/dev/null';

  const tick = async () => {
    if (closed) return;
    try {
      const raw = await execInContainer(containerId, CMD);
      const data = parseClusterList(JSON.parse(raw));
      if (!closed) res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch { /* cluster not ready yet */ }
    if (!closed) setTimeout(tick, 5000);
  };

  tick();
});
