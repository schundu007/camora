import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import { query } from './config/database.js';
import { ensureUsageTable } from './services/usage.js';

dotenv.config();

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing — raw for Stripe webhooks, JSON for everything else
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lumora-backend', version: '2.0.0' });
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
      // Indexes
      'CREATE INDEX IF NOT EXISTS idx_coding_usage_user_date ON coding_usage(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_conversations_user ON lumora_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_messages_conv ON lumora_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_user ON lumora_usage_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_created ON lumora_usage_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_bookmarks_user ON lumora_bookmarks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_completion_user ON lumora_completion_marks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_quotas_user ON lumora_quotas(user_id)',
    ];

    for (const sql of migrations) {
      try { await query(sql); } catch (e) { /* table/index may already exist */ }
    }

    // Usage tracking tables (plan limits, topups, active sessions)
    await ensureUsageTable();

    console.log('Database migrations complete');
  } catch (err) {
    console.error('Migration error:', err.message);
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

// Register routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/inference', inferenceRouter);
// Backwards compat: /api/v1/stream → forward to inference router's /stream handler
app.post('/api/v1/stream', (req, res, next) => { req.url = '/stream'; inferenceRouter(req, res, next); });
app.use('/api/v1/coding', codingRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/transcribe', transcriptionRouter);
app.use('/api/v1/speaker', speakerRouter);
app.use('/api/v1/diagram', diagramRouter);
app.use('/api/v1/reactions', reactionsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/usage', usageRouter);
app.use('/api/v1/jobs', jobsRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
const PORT = config.port;
runMigrations().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumora backend running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => { console.error('Forced shutdown'); process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

export default app;
