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

// Body parsing — raw for Stripe webhooks, JSON for everything else
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
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
      `CREATE TABLE IF NOT EXISTS lumora_stripe_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // Pricing-v2 metering — shared with ascend-backend via the same DB.
      // Created here too so this service can boot independently and still meter.
      `CREATE TABLE IF NOT EXISTS ai_hours_usage (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        surface VARCHAR(40) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        seconds REAL NOT NULL DEFAULT 0,
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        model VARCHAR(80),
        plan_at_charge VARCHAR(40),
        metered_to_stripe BOOLEAN NOT NULL DEFAULT false,
        stripe_usage_record_id VARCHAR(80),
        team_id BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      // Team / group sharing — Pro Max owners + Business buyers pool hours
      // across seats. Idempotent CREATE IF NOT EXISTS so ascend-backend's
      // copy of these tables wins if it migrated first.
      `CREATE TABLE IF NOT EXISTS teams (
        id BIGSERIAL PRIMARY KEY,
        owner_user_id INTEGER NOT NULL,
        name VARCHAR(120),
        plan_type VARCHAR(40) NOT NULL,
        seat_limit INTEGER NOT NULL DEFAULT 5,
        hours_pool_total REAL,
        hours_pool_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payg_rate_cents INTEGER,
        auto_topup_pack VARCHAR(20),
        auto_topup_monthly_cap_cents INTEGER,
        pool_reminder_80_sent_at TIMESTAMPTZ,
        pool_reminder_95_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS team_members (
        id BIGSERIAL PRIMARY KEY,
        team_id BIGINT NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        per_member_hour_cap REAL,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (team_id, user_id),
        UNIQUE (user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS team_invites (
        id BIGSERIAL PRIMARY KEY,
        team_id BIGINT NOT NULL,
        email VARCHAR(255) NOT NULL,
        invite_token VARCHAR(64) NOT NULL UNIQUE,
        invited_by INTEGER NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
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
      `CREATE TABLE IF NOT EXISTS ai_hour_topups (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        team_id BIGINT,
        hours REAL NOT NULL,
        amount_cents INTEGER NOT NULL,
        stripe_session_id VARCHAR(255),
        expires_at TIMESTAMPTZ NOT NULL,
        auto_charged BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      // Indexes
      'CREATE INDEX IF NOT EXISTS idx_coding_usage_user_date ON coding_usage(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_conversations_user ON lumora_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_messages_conv ON lumora_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_user ON lumora_usage_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_created ON lumora_usage_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_bookmarks_user ON lumora_bookmarks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_completion_user ON lumora_completion_marks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_quotas_user ON lumora_quotas(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_hours_user_created ON ai_hours_usage(user_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ai_hours_team_created ON ai_hours_usage(team_id, created_at DESC) WHERE team_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_user_id)',
      'CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_team_invites_email_pending ON team_invites(email) WHERE accepted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_topups_user ON ai_hour_topups(user_id) WHERE team_id IS NULL AND expires_at > NOW()',
      'CREATE INDEX IF NOT EXISTS idx_topups_team ON ai_hour_topups(team_id) WHERE team_id IS NOT NULL AND expires_at > NOW()',
      'CREATE INDEX IF NOT EXISTS idx_topups_auto ON ai_hour_topups(user_id, created_at DESC) WHERE auto_charged = true',
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_topups_session ON ai_hour_topups(stripe_session_id) WHERE stripe_session_id IS NOT NULL',
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
import billingRouter from './routes/billing.js';
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

// Per-IP rate limiting — previously only ascend had limits. Transcribe/speaker/
// diagram were wide open to abuse before this.
import { authLimiter, apiLimiter, aiLimiter, paymentLimiter } from './middleware/rateLimiter.js';

// Register routes — limiter tiers mirror the ascend contract.
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/inference', aiLimiter, inferenceRouter);
// Backwards compat: /api/v1/stream → forward to inference router's /stream handler
app.post('/api/v1/stream', aiLimiter, (req, res, next) => { req.url = '/stream'; inferenceRouter(req, res, next); });
app.use('/api/v1/coding', aiLimiter, codingRouter);
app.use('/api/v1/billing', paymentLimiter, billingRouter);
app.use('/api/v1/conversations', apiLimiter, conversationsRouter);
app.use('/api/v1/documents', apiLimiter, documentsRouter);
app.use('/api/v1/prep', apiLimiter, prepRouter);
app.use('/api/v1/company-context', apiLimiter, companyContextRouter);
app.use('/api/v1/transcribe', aiLimiter, transcriptionRouter);
app.use('/api/v1/speaker', aiLimiter, speakerRouter);
app.use('/api/v1/diagram', aiLimiter, diagramRouter);
app.use('/api/v1/reactions', apiLimiter, reactionsRouter);
app.use('/api/v1/analytics', apiLimiter, analyticsRouter);
app.use('/api/v1/usage', apiLimiter, usageRouter);
app.use('/api/v1/jobs', apiLimiter, jobsRouter);
app.use('/api/v1/stories', apiLimiter, storiesRouter);

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
runMigrations().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, 'Lumora backend started');
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
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

export default app;
