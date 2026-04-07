import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import requestId from './middleware/requestId.js';
import { requestLogger, logger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { aiLimiter, apiLimiter, paymentLimiter } from './middleware/rateLimiter.js';
import { setupGracefulShutdown, trackConnection } from './utils/shutdown.js';
import { query } from './config/database.js';
import { isStripeConfigured } from './config/stripe.js';
import { initRedis } from './services/redis.js';

// Route imports
import authRouter from './routes/auth.js';
import onboardingRouter from './routes/onboarding.js';
import solveRouter from './routes/solve.js';
import analyzeRouter from './routes/analyze.js';
import fixRouter from './routes/fix.js';
import runRouter from './routes/run.js';
import fetchRouter from './routes/fetch.js';
import extractRouter from './routes/extract.js';
import ascendRouter from './routes/ascend.js';
import ascendPrepRouter from './routes/ascendPrep.js';
import diagramRouter from './routes/diagram.js';
import transcribeRouter from './routes/transcribe.js';
import voiceRouter from './routes/voice.js';
import billingRouter from './routes/billing.js';
import creditsRouter from './routes/credits.js';
import usageRouter from './routes/usage.js';
import companyPrepsRouter from './routes/companyPreps.js';
import extensionRouter from './routes/extension.js';
import jobAnalyzeRouter from './routes/jobAnalyze.js';
import topicReadsRouter from './routes/topicReads.js';

import { authenticate } from './middleware/authenticate.js';

// Initialize Redis for problem caching
initRedis();

// Run database migrations on startup (safe with IF NOT EXISTS)
async function runMigrations() {
  if (!process.env.DATABASE_URL) return;
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS job_roles JSONB DEFAULT NULL');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text TEXT DEFAULT NULL');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS technical_context TEXT DEFAULT NULL');
    console.log('[Migrations] Onboarding columns ensured');

    // Diagram cache table — store generated diagrams to avoid re-generating
    await query(`CREATE TABLE IF NOT EXISTS ascend_diagram_cache (
      id SERIAL PRIMARY KEY,
      problem_hash VARCHAR(64) NOT NULL,
      detail_level VARCHAR(20) NOT NULL DEFAULT 'overview',
      image_url TEXT NOT NULL,
      edit_url TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(problem_hash, detail_level)
    )`);
    // Add persistent image storage columns (cache survives /tmp cleanup + redeploys)
    await query('ALTER TABLE ascend_diagram_cache ADD COLUMN IF NOT EXISTS image_data BYTEA');
    await query('ALTER TABLE ascend_diagram_cache ADD COLUMN IF NOT EXISTS cloud_provider VARCHAR(10) DEFAULT \'auto\'');
    await query('ALTER TABLE ascend_diagram_cache ADD COLUMN IF NOT EXISTS direction VARCHAR(5) DEFAULT \'LR\'');
    await query('ALTER TABLE ascend_diagram_cache ADD COLUMN IF NOT EXISTS mermaid_code TEXT');
    // Purge old cache entries — they point to deleted /tmp files and use old hash keys
    await query(`DELETE FROM ascend_diagram_cache WHERE image_data IS NULL AND image_url LIKE '/static/%'`);
    // New unique constraint: hash now encodes all dimensions (question+provider+direction+detailLevel)
    await query('DROP INDEX IF EXISTS idx_diagram_cache_hash');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_diagram_cache_hash ON ascend_diagram_cache(problem_hash)');
    console.log('[Migrations] Diagram cache table ensured');

    // Topic reads table — server-side tracking of which free topics a user has read
    await query(`CREATE TABLE IF NOT EXISTS ascend_topic_reads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      category VARCHAR(50) NOT NULL,
      topic_id VARCHAR(100) NOT NULL,
      read_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, category, topic_id)
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_topic_reads_user_cat ON ascend_topic_reads(user_id, category)');
    console.log('[Migrations] Topic reads table ensured');
  } catch (err) {
    console.warn('[Migrations] Failed to run onboarding migration:', err.message);
  }
}
runMigrations();

const app = express();
const PORT = config.PORT;

// Trust one level of proxy (Railway ingress) for correct req.ip
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - whitelist allowed origins
// SECURITY: Only allow known origins, reject unknown
const ALLOWED_ORIGINS = [
  // Production frontend
  'https://chundu.vercel.app',
  'https://ascend.vercel.app',
  'https://capra.cariara.com',
  'https://www.capra.cariara.com',
  'https://camora.cariara.com',
  'https://www.camora.cariara.com',
  'https://cariara.com',
  'https://www.cariara.com',
  // Development
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000',
  // Allow custom domain if configured
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    // Allow chrome/firefox extensions
    if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      return callback(null, true);
    }
    // Check against whitelist (exact match)
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // Allow Railway and Vercel preview deployments (scoped to our projects)
    if ((origin.includes('capra-backend') && origin.endsWith('.railway.app')) || (origin.includes('vercel.app') && (origin.includes('ascend') || origin.includes('capra') || origin.includes('camora') || origin.includes('chundu')))) {
      return callback(null, true);
    }
    // Allow subdomains of cariara.com
    if (origin.endsWith('.cariara.com') || origin === 'https://cariara.com') {
      return callback(null, true);
    }
    // Reject unknown origins in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    // Allow in development
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Electron-App', 'X-Device-Id'],
};

// Use same CORS config for both preflight and actual requests
// Express 5: wildcard '*' replaced with '{*path}' for path-to-regexp v8
app.options('{*path}', cors(corsOptions));
app.use(cors(corsOptions));

// Request ID tracking
app.use(requestId);

// Request logging
app.use(requestLogger);

// Cookie parsing (needed for cariara_sso SSO cookie auth)
app.use(cookieParser());

// Raw body parsing for Stripe webhooks (must be before json middleware for /api/billing/webhook)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Static file serving for generated diagrams
const DIAGRAM_OUTPUT_DIR = process.env.DIAGRAM_OUTPUT_DIR || '/tmp/chundu_diagrams';
app.use('/static/diagrams', express.static(DIAGRAM_OUTPUT_DIR, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Serve cached diagram images from DB (public — <img> tags can't send auth headers)
app.get('/api/diagram/image/:hash', async (req, res) => {
  try {
    const result = await query(
      'SELECT image_data FROM ascend_diagram_cache WHERE problem_hash = $1',
      [req.params.hash]
    );
    if (!result.rows.length || !result.rows[0].image_data) {
      return res.status(404).json({ error: 'Diagram not found' });
    }
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('ETag', req.params.hash);
    res.send(result.rows[0].image_data);
  } catch (err) {
    console.error('[DiagramImage] Error:', err.message);
    res.status(500).json({ error: 'Failed to load diagram' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0', platform: 'ascend-camora' });
});

// ─── Public routes (no authentication) ───

// Visitor counter — lightweight, no auth required
app.post('/api/visitors/track', async (req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS site_visitors (
      id SERIAL PRIMARY KEY,
      visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(visit_date)
    )`);
    await query(`INSERT INTO site_visitors (visit_date, count) VALUES (CURRENT_DATE, 1)
      ON CONFLICT (visit_date) DO UPDATE SET count = site_visitors.count + 1`);
    const result = await query('SELECT COALESCE(SUM(count), 0) as total FROM site_visitors');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch { res.json({ total: 0 }); }
});
app.get('/api/visitors/count', async (req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS site_visitors (
      id SERIAL PRIMARY KEY,
      visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(visit_date)
    )`);
    const result = await query('SELECT COALESCE(SUM(count), 0) as total FROM site_visitors');
    const today = await query('SELECT COALESCE(count, 0) as today FROM site_visitors WHERE visit_date = CURRENT_DATE');
    res.json({ total: parseInt(result.rows[0].total), today: parseInt(today.rows[0]?.today || 0) });
  } catch { res.json({ total: 0, today: 0 }); }
});

app.use('/api/auth', authRouter);
app.use('/api/extension', extensionRouter);

// Diagram debug endpoint (protected - exposes system info)
app.get('/api/diagram/debug', authenticate, async (req, res) => {
  const { spawn } = await import('child_process');
  const results = {
    python: { available: false, version: null, error: null },
    graphviz: { available: false, version: null, error: null },
    diagrams: { available: false, error: null },
    anthropic: { available: false, error: null },
    anthropicKey: !!process.env.ANTHROPIC_API_KEY
  };

  // Check Python
  try {
    const python = spawn('python3', ['--version']);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      python.on('close', (code) => {
        results.python.available = code === 0;
        results.python.version = (stdout || stderr).trim();
        resolve();
      });
      python.on('error', (err) => { results.python.error = err.message; resolve(); });
    });
  } catch (e) { results.python.error = e.message; }

  // Check graphviz
  try {
    const dot = spawn('dot', ['-V']);
    let stderr = '';
    dot.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      dot.on('close', (code) => {
        results.graphviz.available = code === 0;
        results.graphviz.version = stderr.trim();
        resolve();
      });
      dot.on('error', (err) => { results.graphviz.error = err.message; resolve(); });
    });
  } catch (e) { results.graphviz.error = e.message; }

  // Check diagrams library
  try {
    const python = spawn('python3', ['-c', 'import diagrams; print("OK")']);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      python.on('close', (code) => {
        results.diagrams.available = code === 0 && stdout.includes('OK');
        if (stderr) results.diagrams.error = stderr.trim();
        resolve();
      });
      python.on('error', (err) => { results.diagrams.error = err.message; resolve(); });
    });
  } catch (e) { results.diagrams.error = e.message; }

  // Check anthropic library
  try {
    const python = spawn('python3', ['-c', 'import anthropic; print("OK")']);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      python.on('close', (code) => {
        results.anthropic.available = code === 0 && stdout.includes('OK');
        if (stderr) results.anthropic.error = stderr.trim();
        resolve();
      });
      python.on('error', (err) => { results.anthropic.error = err.message; resolve(); });
    });
  } catch (e) { results.anthropic.error = e.message; }

  res.json(results);
});

// Test diagram generation endpoint (protected - exposes system info)
app.get('/api/diagram/test', authenticate, async (req, res) => {
  const { spawn } = await import('child_process');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const enginePath = path.join(__dirname, 'services', 'diagram_engine.py');
  const outputDir = process.env.DIAGRAM_OUTPUT_DIR || '/tmp/chundu_diagrams';

  const fs = await import('fs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = {
    enginePath,
    engineExists: fs.existsSync(enginePath),
    outputDir,
    outputDirExists: fs.existsSync(outputDir),
    apiKeySet: !!process.env.ANTHROPIC_API_KEY,
    testOutput: null,
    testError: null
  };

  // Try running the script with --help to test it works
  try {
    const python = spawn('python3', [enginePath, '--help']);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      python.on('close', (code) => {
        results.testExitCode = code;
        results.testOutput = stdout.substring(0, 500);
        results.testError = stderr.substring(0, 500);
        resolve();
      });
      python.on('error', (err) => {
        results.testError = err.message;
        resolve();
      });
    });
  } catch (e) {
    results.testError = e.message;
  }

  res.json(results);
});

// ─── Protected routes (require authentication) ───

// AI-intensive routes get stricter rate limiting
app.use('/api/solve', authenticate, aiLimiter, solveRouter);
app.use('/api/analyze', authenticate, aiLimiter, analyzeRouter);
app.use('/api/fetch', authenticate, apiLimiter, fetchRouter);
app.use('/api/run', authenticate, apiLimiter, runRouter);
app.use('/api/fix', authenticate, aiLimiter, fixRouter);
app.use('/api/transcribe', authenticate, aiLimiter, transcribeRouter);
app.use('/api/ascend/prep', authenticate, apiLimiter, ascendPrepRouter);
app.use('/api/ascend', authenticate, aiLimiter, ascendRouter);
app.use('/api/diagram', authenticate, aiLimiter, diagramRouter);
app.use('/api/extract', authenticate, aiLimiter, extractRouter);

// Onboarding routes (require authentication)
app.use('/api/onboarding', authenticate, apiLimiter, onboardingRouter);

// Billing & Credits routes (JWT auth - uses cariara OAuth tokens)
// Payment routes get strict rate limiting to prevent abuse
app.use('/api/billing', paymentLimiter, billingRouter);
app.use('/api/credits', apiLimiter, creditsRouter);
app.use('/api/company-preps', apiLimiter, companyPrepsRouter);
app.use('/api/usage', apiLimiter, usageRouter);
app.use('/api/topic-reads', apiLimiter, topicReadsRouter);

// Job URL analysis (scrape + AI analysis) — auth required, AI rate limit
app.use('/api/job-analyze', authenticate, aiLimiter, jobAnalyzeRouter);

// Voice assistant routes (SSE + REST)
// No rate limiter on /events endpoint for real-time streaming
app.use('/api/voice', authenticate, voiceRouter);

// Enhanced health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    version: process.env.npm_package_version || '2.0.0',
    environment: config.NODE_ENV,
    features: {
      database: !!process.env.DATABASE_URL,
      stripe: isStripeConfigured(),
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT, env: config.NODE_ENV }, 'Ascend API server started (camora)');
});

// Track connections for graceful shutdown
server.on('connection', (socket) => {
  trackConnection(socket);
});

// Setup graceful shutdown handlers
setupGracefulShutdown(server);

export default app;
