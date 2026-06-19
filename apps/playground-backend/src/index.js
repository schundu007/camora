import http from 'http';
import net from 'net';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';
import { verifyToken } from './lib/auth.js';
import { query, closePool } from './lib/db.js';
import { initRedis, cacheDel } from './services/redis.js';
import { playgroundRouter } from './routes/playground.js';
import { playgroundSessionsRouter } from './routes/playgroundSessions.js';
import { playgroundSavesRouter } from './routes/playgroundSaves.js';
import { playgroundLimiter } from './middleware/playgroundLimiter.js';
import { createTtydProxy } from './services/playground/wsProxy.js';
import { getSession } from './services/playground/sessionStore.js';
import { stopJob } from './services/playground/nomadClient.js';

const PORT = parseInt(process.env.PORT || '3010', 10);

const ALLOWED_ORIGINS = [
  'https://camora.cariara.com',
  'https://www.camora.cariara.com',
  'https://capra.cariara.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (req, res) => res.json({ ok: true }));

async function jwtAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
  else if (req.cookies?.cariara_sso) token = req.cookies.cariara_sso;
  if (!token && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let payload;
  try { payload = verifyToken(token); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  const userId = parseInt(payload.sub, 10);
  if (!userId) return res.status(401).json({ error: 'Invalid token payload' });

  let plan_type = null;
  try {
    const r = await query(
      `SELECT plan_type FROM ascend_subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );
    plan_type = r.rows[0]?.plan_type ?? null;
  } catch {}

  req.user = { id: userId, email: payload.email, name: payload.name, picture: payload.picture, plan_type };
  next();
}

app.use('/api/v1/playground', jwtAuth, playgroundLimiter, playgroundRouter);
app.use('/api/v1/playground/sessions', jwtAuth, playgroundSessionsRouter);
app.use('/api/v1/playground/saves', jwtAuth, playgroundSavesRouter);

function tryParseToken(token) {
  try { return verifyToken(token); } catch { return null; }
}

app.use('/pg-ide', async (req, res) => {
  const qs = new URL(req.url, 'http://localhost').searchParams;

  let userId = null;
  const qt = qs.get('_t') || qs.get('token');
  if (qt) {
    const p = tryParseToken(qt);
    if (p) userId = parseInt(p.sub, 10);
  }
  if (!userId && req.cookies?.cariara_sso) {
    const p = tryParseToken(req.cookies.cariara_sso);
    if (p) userId = parseInt(p.sub, 10);
  }
  if (!userId && req.cookies?.pg_ide) userId = -1;
  if (!userId) return res.status(401).end('Unauthorized');

  const sessionId = qs.get('_s') || req.cookies?.pg_ide;
  if (!sessionId) return res.status(400).end('Missing session');

  let session;
  try { session = await getSession(sessionId); } catch { return res.status(502).end(); }
  if (!session) return res.status(404).end('Session not found');
  if (userId !== -1 && session.user_id !== userId) return res.status(403).end('Forbidden');
  if (!session.code_server_port) return res.status(503).end('IDE not ready');

  res.cookie('pg_ide', sessionId, { httpOnly: true, maxAge: 3600, path: '/pg-ide' });

  const FRAME_ORIGINS = [
    "'self'",
    'https://camora.cariara.com',
    'https://www.camora.cariara.com',
    'https://capra.cariara.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ].join(' ');

  const proxyReq = http.request({
    hostname: session.ttyd_host,
    port: session.code_server_port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${session.ttyd_host}:${session.code_server_port}`, connection: 'close' },
  }, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    delete headers['content-security-policy'];
    delete headers['x-frame-options'];
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    headers['content-security-policy'] = `default-src * 'unsafe-inline' 'unsafe-eval' blob: data: ws: wss:; frame-ancestors ${FRAME_ORIGINS}`;
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', () => { if (!res.headersSent) res.status(502).end(); });
  req.pipe(proxyReq, { end: true });
});

async function runMigrations() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS playground_sessions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       INTEGER NOT NULL REFERENCES users(id),
      environment   TEXT NOT NULL,
      scenario_id   TEXT,
      nomad_job_id  TEXT,
      status        TEXT NOT NULL DEFAULT 'provisioning',
      extended      BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      expires_at    TIMESTAMPTZ,
      destroyed_at  TIMESTAMPTZ
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_playground_sessions_user ON playground_sessions(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_playground_sessions_status ON playground_sessions(status)');
    await query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS ttyd_host TEXT');
    await query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS ttyd_port INTEGER');
    await query('ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS code_server_port INTEGER');
    await query(`CREATE TABLE IF NOT EXISTS playground_objective_completions (
      session_id    UUID REFERENCES playground_sessions(id) ON DELETE CASCADE,
      objective_id  TEXT NOT NULL,
      completed_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (session_id, objective_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS playground_snippets (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      tests_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query(`CREATE TABLE IF NOT EXISTS playground_saved_vms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  name             TEXT NOT NULL,
  environment      TEXT NOT NULL,
  r2_key           TEXT NOT NULL,
  size_bytes       BIGINT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_restored_at TIMESTAMPTZ
)`);
    await query('CREATE INDEX IF NOT EXISTS idx_saved_vms_user ON playground_saved_vms(user_id)');
    console.log('[Migrations] playground tables ensured');
  } catch (e) {
    console.warn('[Migrations] failed:', e.message);
  }
}

initRedis();
runMigrations();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Playground] server started on port ${PORT}`);
});

setInterval(async () => {
  try {
    const { rows } = await query(
      `SELECT id, nomad_job_id FROM playground_sessions
       WHERE status NOT IN ('destroyed') AND expires_at < NOW() - INTERVAL '2 minutes'
       LIMIT 50`
    );
    for (const row of rows) {
      try {
        if (row.nomad_job_id) await stopJob(row.nomad_job_id);
        await query(`UPDATE playground_sessions SET status='destroyed', destroyed_at=NOW() WHERE id=$1`, [row.id]);
        await cacheDel(`playground:session:${row.id}:ttl`);
        console.log(`[Cleanup] destroyed expired session ${row.id}`);
      } catch (e) {
        console.warn(`[Cleanup] error destroying session ${row.id}:`, e.message);
      }
    }
  } catch (e) {
    console.warn('[Cleanup] error in session cleanup:', e.message);
  }
}, 5 * 60 * 1000);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const wsMatch = req.url?.match(/^\/playground\/ws\/([a-f0-9-]+)(?:\?.*)?$/);
  const pgIdeMatch = req.url?.startsWith('/pg-ide');

  if (pgIdeMatch) {
    (async () => {
      try {
        const pgIdeCookie = req.headers.cookie?.match(/(?:^|;\s*)pg_ide=([^;]+)/)?.[1];
        const sessionId = pgIdeCookie ? decodeURIComponent(pgIdeCookie) : null;
        if (!sessionId) { socket.destroy(); return; }

        const session = await getSession(sessionId);
        if (!session || !session.code_server_port) { socket.destroy(); return; }

        const wsPath = req.url.replace(/^\/pg-ide/, '') || '/';
        const target = net.connect(session.code_server_port, session.ttyd_host, () => {
          target.write(`GET ${wsPath} HTTP/${req.httpVersion}\r\n`);
          for (const [key, val] of Object.entries(req.headers)) {
            target.write(`${key}: ${val}\r\n`);
          }
          target.write('\r\n');
          if (head?.length) target.write(head);
          socket.pipe(target);
          target.pipe(socket);
        });
        target.on('error', () => { try { socket.destroy(); } catch {} });
        socket.on('error', () => { try { target.destroy(); } catch {} });
      } catch { try { socket.destroy(); } catch {} }
    })();
    return;
  }

  if (!wsMatch) { socket.destroy(); return; }
  const sessionId = wsMatch[1];

  wss.handleUpgrade(req, socket, head, async (ws) => {
    const preBuf = [];
    ws.on('message', (data, isBinary) => preBuf.push({ data, isBinary }));

    console.log(`[PlaygroundWS] upgrade sessionId=${sessionId}`);
    try {
      let token = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
      else if (req.headers.cookie) {
        const m = req.headers.cookie.match(/(?:^|;\s*)cariara_sso=([^;]+)/);
        if (m) token = decodeURIComponent(m[1]);
      }
      if (!token) {
        const urlObj = new URL(req.url, 'http://localhost');
        const qToken = urlObj.searchParams.get('token');
        if (qToken) token = qToken;
      }

      if (!token) { ws.close(4401, 'Unauthorized'); return; }

      let payload;
      try { payload = verifyToken(token); }
      catch { ws.close(4401, 'Invalid token'); return; }

      const userId = parseInt(payload.sub, 10);
      if (!userId) { ws.close(4401, 'Invalid token payload'); return; }

      const session = await getSession(sessionId);
      if (!session) { ws.close(4404, 'Session not found'); return; }
      if (session.user_id !== userId) { ws.close(4403, 'Forbidden'); return; }
      if (session.status !== 'ready' && session.status !== 'active') {
        ws.close(4400, 'Session not ready');
        return;
      }

      const host = session.ttyd_host;
      const port = session.ttyd_port;
      if (!host || !port) { ws.close(4500, 'Session has no ttyd address'); return; }

      ws.removeAllListeners('message');
      createTtydProxy(ws, host, port, preBuf);
    } catch (err) {
      console.error('[PlaygroundWS] upgrade error:', err.message);
      ws.close(4500, 'Internal error');
    }
  });
});

const shutdown = async () => {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
