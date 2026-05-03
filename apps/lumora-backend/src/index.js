import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import { query, closePool } from './config/database.js';
import { ensureUsageTable } from './services/usage.js';
import { logger, requestLogger } from './middleware/requestLogger.js';
import { requestId } from './middleware/requestId.js';

dotenv.config();

const app = express();

// Railway sits behind a reverse proxy and forwards the client IP via
// X-Forwarded-For. Without `trust proxy`, Express ignores the header
// and express-rate-limit (which keys per-IP) throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request — service runs
// but every API call 500s. `1` trusts a single hop (Railway's edge).
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Request-id + structured request/response logging. Must run after cors/helmet
// but before body parsing so the id is available to every downstream log line.
app.use(requestId);
app.use(requestLogger);

// Body parsing — raw Stripe webhook handler retired (PR-2): all Stripe events
// now flow exclusively to ascend-backend's /api/billing/webhook to eliminate
// dual-truth state divergence between users.plan_type and ascend_subscriptions.
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lumora-backend', version: '2.0.1' });
});

// Run migrations on startup
async function runMigrations() {
  try {
    // Ensure lumora tables exist
    const migrations = [
      `CREATE TABLE IF NOT EXISTS lumora_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500),
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES lumora_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint VARCHAR(100),
        question_type VARCHAR(50),
        tokens_used INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID,
        message_id UUID,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_completion_marks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, conversation_id)
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_quotas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        monthly_tokens_limit INTEGER DEFAULT 100000,
        monthly_tokens_used INTEGER DEFAULT 0,
        monthly_requests_limit INTEGER DEFAULT 500,
        monthly_requests_used INTEGER DEFAULT 0,
        reset_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS coding_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(50),
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // ── billing-owned tables ──────────────────────────────────────
      // Tables below this comment used to be re-CREATE'd here for
      // boot-independence reasons. They're now owned exclusively by
      // ascend-backend's migrations (single source of truth) so the
      // schema can't drift if both services boot in parallel:
      //   - lumora_stripe_events  (billing retired from lumora in PR-2)
      //   - ai_hours_usage        (ascend writes the FK to users)
      //   - ai_hour_topups        (ascend owns the FK + indexes)
      //   - teams / team_members / team_invites (ascend has the FK +
      //     ON DELETE CASCADE; lumora's copy lacked them and racing
      //     migrations could leave the DB without referential integrity).
      // Lumora reads these tables at runtime via the shared DB but no
      // longer attempts to bring them into existence.
      // ──────────────────────────────────────────────────────────────
      // Top-up credits — manual checkouts + auto-topup off-session charges.
      // 90-day expiry; sums into the pool for any unexpired rows.
      `CREATE TABLE IF NOT EXISTS lumora_prep_state (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_company_context (
        company TEXT PRIMARY KEY,
        briefing TEXT NOT NULL,
        sources_json JSONB,
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_audio_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      // ai_hour_topups + its ALTER/INDEX migrations are owned by
      // ascend-backend (see comment above re: billing-owned tables).
      // Indexes
      'CREATE INDEX IF NOT EXISTS idx_coding_usage_user_date ON coding_usage(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_conversations_user ON lumora_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_messages_conv ON lumora_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_user ON lumora_usage_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_created ON lumora_usage_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_bookmarks_user ON lumora_bookmarks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_completion_user ON lumora_completion_marks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_quotas_user ON lumora_quotas(user_id)',
      // ai_hours_usage / teams / team_* / ai_hour_topups indexes are
      // owned by ascend-backend (single source of truth for billing
      // schema).
    ];

    for (const sql of migrations) {
      try { await query(sql); } catch (e) { /* table/index may already exist */ }
    }

    // Usage tracking tables (plan limits, topups, active sessions)
    await ensureUsageTable();

    logger.info('Database migrations complete');
  } catch (err) {
    logger.error({ err: err.message }, 'Migration error');
  }
}

// Import routes
import authRouter from './routes/auth.js';
import inferenceRouter from './routes/inference.js';
import codingRouter from './routes/coding.js';
import conversationsRouter from './routes/conversations.js';
import documentsRouter from './routes/documents.js';
import transcriptionRouter from './routes/transcription.js';
import speakerRouter from './routes/speaker.js';
import diagramRouter from './routes/diagram.js';
import reactionsRouter from './routes/reactions.js';
import analyticsRouter from './routes/analytics.js';
import usageRouter from './routes/usage.js';
import jobsRouter from './routes/jobs.js';
import storiesRouter from './routes/stories.js';
import prepRouter from './routes/prep.js';
import companyContextRouter from './routes/companyContext.js';
import audioPrefsRouter from './routes/audioPreferences.js';

// Per-IP rate limiting — previously only ascend had limits. Transcribe/speaker/
// diagram were wide open to abuse before this.
import { authLimiter, apiLimiter, aiLimiter } from './middleware/rateLimiter.js';
import { authenticate } from './middleware/authenticate.js';
import { requirePaidSubscription } from './middleware/requirePaidSubscription.js';

// Billing routes retired (PR-2). Frontend now hits ascend-backend's
// /api/v1/billing/* directly. This stub returns 410 Gone for any stale
// callers still pointed here so failures are loud, not silent.
app.use('/api/v1/billing', (req, res) => {
  res.status(410).json({
    error: 'Billing has moved. Use ascend-backend at caprab.cariara.com/api/v1/billing/*.',
    code: 'BILLING_MOVED_TO_ASCEND',
  });
});

// Register routes — limiter tiers mirror the ascend contract.
app.use('/api/v1/auth', authLimiter, authRouter);

// AI routes — must be paywalled. Without these gates, anyone with a free
// account could call live-interview AI / transcription / coding solver
// for free, which is the bug PR-2 fixes.
app.use('/api/v1/inference', aiLimiter, authenticate, requirePaidSubscription, inferenceRouter);
// Backwards compat: /api/v1/stream → forward to inference router's /stream handler
app.post('/api/v1/stream', aiLimiter, authenticate, requirePaidSubscription,
  (req, res, next) => { req.url = '/stream'; inferenceRouter(req, res, next); });
app.use('/api/v1/coding', aiLimiter, authenticate, requirePaidSubscription, codingRouter);
app.use('/api/v1/transcribe', aiLimiter, authenticate, requirePaidSubscription, transcriptionRouter);
app.use('/api/v1/speaker', aiLimiter, authenticate, requirePaidSubscription, speakerRouter);
app.use('/api/v1/diagram', aiLimiter, authenticate, requirePaidSubscription, diagramRouter);

// Non-AI routes — open to authenticated users. Apply `authenticate`
// at the mount point so an accidentally-added route inside any of
// these routers can't ship publicly. Routers that intentionally need
// anonymous routes can still expose them by being mounted without
// the middleware (none currently).
app.use('/api/v1/conversations', apiLimiter, authenticate, conversationsRouter);
app.use('/api/v1/documents', apiLimiter, authenticate, documentsRouter);
app.use('/api/v1/prep', apiLimiter, authenticate, prepRouter);
app.use('/api/v1/company-context', apiLimiter, authenticate, companyContextRouter);
app.use('/api/v1/audio-prefs', apiLimiter, authenticate, audioPrefsRouter);
app.use('/api/v1/reactions', apiLimiter, authenticate, reactionsRouter);
app.use('/api/v1/analytics', apiLimiter, analyticsRouter); // analytics may include public ingestion routes
app.use('/api/v1/usage', apiLimiter, authenticate, usageRouter);
app.use('/api/v1/jobs', apiLimiter, jobsRouter); // jobs feed is public-readable
app.use('/api/v1/stories', apiLimiter, storiesRouter); // stories feed is public-readable

// Global error handler — generic message to client, full details to logs.
app.use((err, req, res, next) => {
  logger.error({
    err: err.message,
    stack: err.stack,
    requestId: req.requestId,
    method: req.method,
    url: req.url,
  }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Process-level safety nets — previously uncaught rejections just crashed
// with a raw dump. Now they're logged structured so Railway / Datadog
// can group them and page on spikes.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message || String(reason), stack: reason?.stack }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'Uncaught exception');
  // Exit after logging — Node should not continue with an unknown app state.
  process.exit(1);
});

// Start
const PORT = config.port;

// Bind the HTTP listener BEFORE awaiting migrations so Railway's
// /health probe can succeed within the 2-minute deadline. Each
// `query()` blocks up to 10s on connect; with ~50 migrations a slow
// or unreachable DB would push first-listen past 8 minutes and the
// service would fail healthcheck → restart loop → never come up.
//
// Migrations now run in the background. They're idempotent
// (CREATE TABLE IF NOT EXISTS) so retrying on the next deploy is
// safe; a runtime failure surfaces in logs but doesn't block boot.
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'Lumora backend listening (migrations running in background)');
});

runMigrations().catch((err) => {
  logger.error({ err: err?.message }, 'Background migrations failed');
});

// Graceful shutdown — stop accepting connections, drain, close the DB pool,
// exit. Previously exit happened before closePool so in-flight queries could
// be severed and sockets leaked on deploy.
let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received');
  const forceTimer = setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 15_000);
  server.close(async () => {
    logger.info('HTTP server closed');
    try { await closePool(); logger.info('DB pool closed'); }
    catch (err) { logger.error({ err: err?.message }, 'closePool failed'); }
    clearTimeout(forceTimer);
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Note: unhandledRejection / uncaughtException are registered earlier in the
// file with structured logging via Pino. The duplicate console.error handler
// that lived here was removed — it bypassed structured logs and made Railway
// log streaming miss the event.

export default app;
