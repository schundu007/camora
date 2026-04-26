import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import requestId from './middleware/requestId.js';
import { requestLogger, logger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter, aiLimiter, apiLimiter, paymentLimiter } from './middleware/rateLimiter.js';
import { setupGracefulShutdown, trackConnection } from './utils/shutdown.js';
import { query } from './config/database.js';
import { isStripeConfigured } from './config/stripe.js';
import { initRedis } from './services/redis.js';
import { sendTrialEmail } from './services/emailService.js';

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
import resumeRouter from './routes/resume.js';
import billingRouter from './routes/billing.js';
import creditsRouter from './routes/credits.js';
import usageRouter from './routes/usage.js';
import companyPrepsRouter from './routes/companyPreps.js';
import extensionRouter from './routes/extension.js';
import jobAnalyzeRouter from './routes/jobAnalyze.js';
import topicReadsRouter from './routes/topicReads.js';
import topicCommentsRouter from './routes/topicComments.js';
import referralRouter from './routes/referral.js';
import interviewCountdownRouter from './routes/interviewCountdown.js';
import gamificationRouter from './routes/gamification.js';
import scoreCardsRouter from './routes/scoreCards.js';
import challengeRouter from './routes/challenge.js';
// Jobs router copied from lumora-backend so the lumorab.cariara.com service
// (which currently runs ascend code) can answer /api/v1/jobs requests from
// the frontend's /jobs page. Falls back to 503 if JOBS_DATABASE_URL is unset.
import jobsRouter from './routes/jobs.js';

// Same pattern as jobs above — the entire lumora-backend route surface was
// copied under src/lumora/ so this service can answer /api/v1/transcribe,
// /api/v1/stream, /api/v1/coding/*, /api/v1/conversations, /api/v1/documents,
// /api/v1/speaker, /api/v1/diagram, /api/v1/reactions, /api/v1/analytics,
// /api/v1/stories, /api/v1/inference instead of returning 404 on every
// Lumora page. Each lumora route uses its own copy of authenticate/usage
// middleware (sibling under src/lumora/middleware/) so the originals keep
// working unchanged.
import lumoraTranscriptionRouter from './lumora/routes/transcription.js';
import lumoraInferenceRouter from './lumora/routes/inference.js';
import lumoraCodingRouter from './lumora/routes/coding.js';
import lumoraConversationsRouter from './lumora/routes/conversations.js';
import lumoraDocumentsRouter from './lumora/routes/documents.js';
import lumoraSpeakerRouter from './lumora/routes/speaker.js';
import lumoraDiagramRouter from './lumora/routes/diagram.js';
import lumoraReactionsRouter from './lumora/routes/reactions.js';
import lumoraAnalyticsRouter from './lumora/routes/analytics.js';
import lumoraStoriesRouter from './lumora/routes/stories.js';

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
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ');
    await query('ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ');
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

    // Topic comments — user discussions on prep topics
    await query(`CREATE TABLE IF NOT EXISTS ascend_topic_comments (
      id SERIAL PRIMARY KEY,
      topic_id VARCHAR(255) NOT NULL,
      user_id INTEGER NOT NULL,
      user_name VARCHAR(255),
      user_image TEXT,
      content TEXT NOT NULL,
      parent_id INTEGER REFERENCES ascend_topic_comments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_topic_comments_topic ON ascend_topic_comments(topic_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_topic_comments_user ON ascend_topic_comments(user_id)');
    console.log('[Migrations] Topic comments table ensured');

    // Sprint 1: Referral system
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) UNIQUE');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER');
    await query('CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)');

    await query(`CREATE TABLE IF NOT EXISTS ascend_referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reward_type VARCHAR(20) DEFAULT 'credits',
      reward_amount INTEGER DEFAULT 50,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(referrer_id, referred_id)
    )`);

    // Backfill referral codes for existing users
    await query(`UPDATE users SET referral_code = SUBSTR(MD5(RANDOM()::TEXT || id::TEXT), 1, 8) WHERE referral_code IS NULL`);

    // Sprint 2: Interview countdown
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS interview_date DATE');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS target_company VARCHAR(100)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role VARCHAR(100)');

    await query(`CREATE TABLE IF NOT EXISTS ascend_prep_plans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      interview_date DATE NOT NULL,
      target_company VARCHAR(100),
      target_role VARCHAR(100),
      plan_data JSONB NOT NULL,
      total_days INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    )`);

    await query(`CREATE TABLE IF NOT EXISTS ascend_prep_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      task_id VARCHAR(100) NOT NULL,
      completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMPTZ,
      UNIQUE(user_id, plan_id, task_id)
    )`);

    console.log('[Migrations] Referral + Interview countdown tables ensured');

    // Gamification: badges
    await query(`CREATE TABLE IF NOT EXISTS ascend_badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      badge_key VARCHAR(50) NOT NULL,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, badge_key)
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_badges_user ON ascend_badges(user_id)');

    // Gamification: XP + level on user_profiles
    await query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0');
    await query('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1');

    // Gamification: weekly leaderboard
    await query(`CREATE TABLE IF NOT EXISTS ascend_weekly_leaderboard (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      week_start DATE NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      problems_solved INTEGER DEFAULT 0,
      UNIQUE(user_id, week_start)
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON ascend_weekly_leaderboard(week_start, xp_earned DESC)');

    console.log('[Migrations] Gamification tables ensured');

    // Score cards
    await query(`CREATE TABLE IF NOT EXISTS ascend_score_cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      score INTEGER,
      category VARCHAR(50),
      metadata JSONB,
      share_token VARCHAR(16) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_score_cards_user ON ascend_score_cards(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_score_cards_share ON ascend_score_cards(share_token)');

    // Certificates
    await query(`CREATE TABLE IF NOT EXISTS ascend_certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      track VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      share_token VARCHAR(16) UNIQUE NOT NULL,
      issued_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, track)
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_certificates_share ON ascend_certificates(share_token)');

    // Public username
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE');
    await query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

    console.log('[Migrations] Score cards + certificates tables ensured');

    // Challenger qualification system
    await query('ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS is_challenger BOOLEAN DEFAULT false');
    await query('ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS challenger_qualified_at TIMESTAMPTZ');
    await query('ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS challenger_quiz_score INTEGER');
    await query('ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS challenger_credits_remaining INTEGER DEFAULT 0');
    await query(`CREATE TABLE IF NOT EXISTS ascend_challenger_activity (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      action VARCHAR(50) NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_challenger_activity_user ON ascend_challenger_activity(user_id)');
    console.log('[Migrations] Challenger tables ensured');

    // Universal page-view tracking
    await query(`CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path VARCHAR(500) NOT NULL,
      email VARCHAR(255),
      ip VARCHAR(45),
      user_agent TEXT,
      referrer TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path)');
    await query('CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_page_views_email ON page_views(email)');
    console.log('[Migrations] Page views table ensured');

    // Ensure site_visitors table exists (legacy visitor counter)
    await query(`CREATE TABLE IF NOT EXISTS site_visitors (
      visit_date DATE PRIMARY KEY,
      count INTEGER DEFAULT 0
    )`);

    // Ensure owner accounts are admins
    await query("UPDATE users SET is_admin = true WHERE email IN ('chundubabu@gmail.com', 'babuchundu@gmail.com')");

    // One-time seed: migrate old site_visitors total into page_views
    const seeded = await query("SELECT COUNT(*) as c FROM page_views WHERE ip LIKE 'seed-%'");
    if (parseInt(seeded.rows[0].c) === 0) {
      const old = await query('SELECT COALESCE(SUM(count), 0) as total FROM site_visitors');
      const oldTotal = parseInt(old.rows[0].total);
      if (oldTotal > 0) {
        // Batch insert with unique synthetic IPs so COUNT(DISTINCT ip) preserves the old total
        const batchSize = 500;
        for (let i = 0; i < oldTotal; i += batchSize) {
          const count = Math.min(batchSize, oldTotal - i);
          const values = Array.from({ length: count }, (_, j) =>
            `('/', 'seed-${i + j}', NOW())`
          ).join(',');
          await query(`INSERT INTO page_views (path, ip, created_at) VALUES ${values}`);
        }
        console.log(`[Migrations] Seeded page_views with ${oldTotal} legacy visitors`);
      }
    }
  } catch (err) {
    console.warn('[Migrations] Failed to run onboarding migration:', err.message);
  }

  // Lumora-side schema. The lumora-backend used to own these CREATE TABLE
  // statements in its own startup; now that ascend serves the lumora API
  // surface (transcribe, stream, coding, conversations, ...) it must also
  // own the schema or every Lumora call will explode on a missing table.
  try {
    const lumoraMigrations = [
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
      'CREATE INDEX IF NOT EXISTS idx_lumora_conversations_user ON lumora_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_messages_conv ON lumora_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_user ON lumora_usage_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_created ON lumora_usage_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_bookmarks_user ON lumora_bookmarks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_completion_user ON lumora_completion_marks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_quotas_user ON lumora_quotas(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_coding_usage_user_date ON coding_usage(user_id, created_at)',
    ];
    for (const sql of lumoraMigrations) {
      try { await query(sql); } catch { /* table or index may already exist */ }
    }
    try {
      const { ensureUsageTable } = await import('./lumora/services/usage.js');
      await ensureUsageTable();
    } catch (e) {
      console.warn('[Migrations] Lumora usage table init skipped:', e.message);
    }
    console.log('[Migrations] Lumora schema ensured');
  } catch (err) {
    console.warn('[Migrations] Failed to run lumora migrations:', err.message);
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
app.post('/api/visitors/track', apiLimiter, async (req, res) => {
  try {
    await query(`INSERT INTO site_visitors (visit_date, count) VALUES (CURRENT_DATE, 1)
      ON CONFLICT (visit_date) DO UPDATE SET count = site_visitors.count + 1`);
    const result = await query('SELECT COALESCE(SUM(count), 0) as total FROM site_visitors');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch { res.json({ total: 0 }); }
});
app.get('/api/visitors/count', async (req, res) => {
  try {
    const result = await query('SELECT COALESCE(SUM(count), 0) as total FROM site_visitors');
    const today = await query('SELECT COALESCE(count, 0) as today FROM site_visitors WHERE visit_date = CURRENT_DATE');
    res.json({ total: parseInt(result.rows[0].total), today: parseInt(today.rows[0]?.today || 0) });
  } catch { res.json({ total: 0, today: 0 }); }
});

// Universal page-view tracker — no auth required
app.post('/api/visitors/pageview', apiLimiter, async (req, res) => {
  try {
    const { path, email, referrer } = req.body || {};
    if (!path) return res.status(400).json({ error: 'path required' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || null;
    await query(
      'INSERT INTO page_views (path, email, ip, user_agent, referrer) VALUES ($1, $2, $3, $4, $5)',
      [path, email || null, ip, userAgent, referrer || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PageView] Error:', err.message);
    res.json({ ok: false });
  }
});

// Public visitor count (unique IPs only, no details)
app.get('/api/visitors/unique-count', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(DISTINCT ip) as count FROM page_views');
    res.json({ total: parseInt(result.rows[0].count) });
  } catch { res.json({ total: 0 }); }
});

// Page-view stats — admin-only, supports ?path=&exclude_emails=email1,email2&days=30
app.get('/api/visitors/pageview-stats', authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { path, exclude_emails, days } = req.query;
    const params = [];
    const conditions = [];
    let idx = 1;

    if (path) {
      conditions.push(`path = $${idx++}`);
      params.push(path);
    }
    if (exclude_emails) {
      const emails = exclude_emails.split(',').map(e => e.trim().toLowerCase());
      conditions.push(`(email IS NULL OR LOWER(email) NOT IN (${emails.map(() => `$${idx++}`).join(',')}))`);
      params.push(...emails);
    }
    if (days) {
      const daysInt = parseInt(days, 10);
      if (Number.isFinite(daysInt) && daysInt > 0) {
        conditions.push(`created_at >= NOW() - ($${idx++} * INTERVAL '1 day')`);
        params.push(daysInt);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const dayLimit = days ? Math.min(parseInt(days, 10) || 30, 365) : 90;

    const total = await query(`SELECT COUNT(*) as count FROM page_views ${where}`, params);
    const uniqueIps = await query(`SELECT COUNT(DISTINCT ip) as count FROM page_views ${where}`, params);
    const byPath = await query(
      `SELECT path, COUNT(*) as views, COUNT(DISTINCT ip) as unique_visitors FROM page_views ${where} GROUP BY path ORDER BY views DESC LIMIT 50`,
      params
    );
    const byDayParams = [...params, dayLimit];
    const byDay = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT ip) as unique_visitors FROM page_views ${where} GROUP BY DATE(created_at) ORDER BY date DESC LIMIT $${byDayParams.length}`,
      byDayParams
    );

    res.json({
      total_views: parseInt(total.rows[0].count),
      unique_visitors: parseInt(uniqueIps.rows[0].count),
      by_path: byPath.rows,
      by_day: byDay.rows
    });
  } catch (err) {
    console.error('[PageViewStats] Error:', err.message);
    res.json({ total_views: 0, unique_visitors: 0, by_path: [], by_day: [] });
  }
});

// Admin: list all users (protected, admin-only)
app.get('/api/admin/users', authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const result = await query(`
      SELECT u.id, u.email, u.name, u.avatar, u.provider, u.is_active,
             u.onboarding_completed, u.plan_type, u.plan_status, u.created_at,
             u.username, u.referral_code, u.target_company, u.target_role, u.interview_date,
             u.location, u.last_login_at, s.plan_type as sub_plan, s.is_challenger, s.trial_ends_at
      FROM users u
      LEFT JOIN ascend_subscriptions s ON s.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('[Admin Users] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: list sent emails from Resend
app.get('/api/admin/emails', authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    if (!process.env.RESEND_API_KEY) return res.json({ emails: [], has_more: false });

    const limit = req.query.limit || 50;
    const params = new URLSearchParams({ limit: String(limit) });
    if (req.query.after) params.set('after', req.query.after);

    const r = await fetch(`https://api.resend.com/emails?${params}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const data = await r.json();
    res.json({ emails: data.data || [], has_more: data.has_more || false });
  } catch (err) {
    console.error('[Admin Emails] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Admin: grant free trial to a user
app.post('/api/admin/grant-trial', authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { userId, days } = req.body;
    if (!userId || !days) return res.status(400).json({ error: 'userId and days required' });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + parseInt(days));

    await query(
      'UPDATE ascend_subscriptions SET trial_ends_at = $1 WHERE user_id = $2',
      [trialEnd.toISOString(), userId]
    );

    const user = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
    const { email, name } = user.rows[0] || {};

    // Send trial notification email (non-blocking)
    if (email) {
      sendTrialEmail({ to: email, name, days: parseInt(days), trialEndsAt: trialEnd.toISOString() })
        .catch(err => console.error('[Admin GrantTrial] Email error:', err.message));
    }

    res.json({ ok: true, email, trial_ends_at: trialEnd.toISOString() });
  } catch (err) {
    console.error('[Admin GrantTrial] Error:', err.message);
    res.status(500).json({ error: 'Failed to grant trial' });
  }
});

// Admin: delete a user and all associated data
app.delete('/api/admin/delete-user/:userId', authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Prevent self-deletion
    if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    const user = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });

    const { email, name } = user.rows[0];

    // Delete all associated data (order matters for foreign keys)
    const tables = [
      'ascend_badges', 'ascend_credits', 'ascend_credit_transactions',
      'ascend_free_usage', 'ascend_subscriptions', 'ascend_stripe_events',
      'ascend_prep_progress', 'ascend_prep_plans', 'ascend_topic_comments',
      'ascend_gamification', 'ascend_referrals',
      'lumora_conversations', 'lumora_messages', 'lumora_usage_logs',
      'lumora_bookmarks', 'lumora_quotas', 'coding_usage',
    ];
    for (const table of tables) {
      try { await query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]); } catch { /* table may not exist */ }
    }

    // Delete the user record
    await query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`[Admin DeleteUser] Deleted user ${userId} (${email})`);
    res.json({ ok: true, email, name });
  } catch (err) {
    console.error('[Admin DeleteUser] Error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.use('/api/auth', authRouter);
// Frontend calls auth endpoints under /api/v1/auth/* (lumora-backend's URL
// shape). Mount the same router at the v1 prefix so login works regardless
// of which backend the lumorab.cariara.com Railway service is actually
// running. This is purely additive — no behavior change for existing callers.
app.use('/api/v1/auth', authRouter);
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
// Frontend (PaywallGate, AuthContext, ProfilePage) calls
// /api/v1/billing/subscription against LUMORA_API_URL. The lumorab.cariara.com
// service is currently running ascend-backend code, so alias the same router
// at the v1 prefix so subscription checks resolve regardless of which backend
// answers. Purely additive — no behavior change for existing /api/billing callers.
app.use('/api/v1/billing', paymentLimiter, billingRouter);
app.use('/api/credits', apiLimiter, creditsRouter);
app.use('/api/company-preps', apiLimiter, companyPrepsRouter);
app.use('/api/usage', apiLimiter, usageRouter);
app.use('/api/v1/usage', apiLimiter, usageRouter);

// Jobs proxy — copied from lumora-backend. Returns 503 cleanly if
// JOBS_DATABASE_URL is unset, so the frontend's /jobs page surfaces a
// "jobs db not configured" message instead of an opaque 404.
app.use('/api/v1/jobs', apiLimiter, jobsRouter);

// Lumora route surface — full lumora-backend mounted under src/lumora/.
// These pair with the existing /api/v1/auth and /api/v1/billing aliases
// so the frontend's VITE_LUMORA_API_URL=https://lumorab.cariara.com
// (which actually points at this ascend service) gets real responses
// instead of 404s for every Lumora page.
app.use('/api/v1/transcribe', aiLimiter, lumoraTranscriptionRouter);
app.use('/api/v1/inference', aiLimiter, lumoraInferenceRouter);
// Frontend posts to /api/v1/stream — forward to the inference router's
// internal /stream handler so we don't fork the streaming logic.
app.post('/api/v1/stream', aiLimiter, (req, res, next) => { req.url = '/stream'; lumoraInferenceRouter(req, res, next); });
app.use('/api/v1/coding', aiLimiter, lumoraCodingRouter);
app.use('/api/v1/conversations', apiLimiter, lumoraConversationsRouter);
app.use('/api/v1/documents', apiLimiter, lumoraDocumentsRouter);
app.use('/api/v1/speaker', aiLimiter, lumoraSpeakerRouter);
app.use('/api/v1/diagram', aiLimiter, lumoraDiagramRouter);
app.use('/api/v1/reactions', apiLimiter, lumoraReactionsRouter);
app.use('/api/v1/analytics', apiLimiter, lumoraAnalyticsRouter);
app.use('/api/v1/stories', apiLimiter, lumoraStoriesRouter);

app.use('/api/topic-reads', apiLimiter, topicReadsRouter);
app.use('/api/topic-comments', apiLimiter, topicCommentsRouter);

// Referral routes (some public, some jwtAuth — handled internally)
app.use('/api/referral', apiLimiter, referralRouter);

// Interview countdown routes (all require auth)
app.use('/api/interview', authenticate, apiLimiter, interviewCountdownRouter);

// Gamification routes (XP, badges, leaderboard — uses jwtAuth internally)
app.use('/api/gamification', apiLimiter, gamificationRouter);

// Score cards, certificates, public profiles
app.use('/api/score-cards', apiLimiter, scoreCardsRouter);
app.use('/api/challenge', apiLimiter, challengeRouter);

// Job URL analysis (scrape + AI analysis) — auth required, AI rate limit
app.use('/api/job-analyze', authenticate, aiLimiter, jobAnalyzeRouter);

// Voice assistant routes (SSE + REST)
// No rate limiter on /events endpoint for real-time streaming
app.use('/api/voice', authenticate, voiceRouter);
app.use('/api/v1/resume', aiLimiter, resumeRouter);

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
