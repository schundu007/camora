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
      `CREATE TABLE IF NOT EXISTS lumora_answer_cache (
        cache_key TEXT PRIMARY KEY,
        answer_json JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // ── Job-search / assisted-apply feature ────────────────────────
      // Per-user structured candidate profile (one row per user; user_id
      // is the PK). Drives tailored CV/cover-letter generation and
      // application autofill. Extends the thin users.resume_text /
      // users.job_roles with a full structured profile.
      `CREATE TABLE IF NOT EXISTS job_seeker_profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT,
        headline TEXT,
        location TEXT,
        email TEXT,
        phone TEXT,
        links JSONB NOT NULL DEFAULT '{}'::jsonb,
        summary TEXT,
        skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        experience JSONB NOT NULL DEFAULT '[]'::jsonb,
        education JSONB NOT NULL DEFAULT '[]'::jsonb,
        certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
        languages JSONB NOT NULL DEFAULT '[]'::jsonb,
        work_authorization TEXT,
        preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
        default_cv_template TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,

      // Application tracker — one row per application a user is tracking.
      // status='saved' is the initial saved-but-not-applied state, so this
      // table also serves as the saved-jobs list. Columns mirror the
      // reference job_search_tracker.csv. source_job_id references the
      // external jobportal DB by value only (no cross-DB FK); title/company/
      // url are snapshotted at save time.
      `CREATE TABLE IF NOT EXISTS job_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_job_id TEXT,
        title TEXT,
        company TEXT,
        location TEXT,
        job_url TEXT,
        source TEXT,
        sector TEXT,
        role_type TEXT,
        status TEXT NOT NULL DEFAULT 'saved'
          CHECK (status IN ('saved','drafting','ready','applied','interviewing','offer','rejected')),
        fit_rating INTEGER CHECK (fit_rating BETWEEN 1 AND 5),
        channel TEXT,
        contact_person TEXT,
        notes TEXT,
        tailored_cv_url TEXT,
        cover_letter_url TEXT,
        applied_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON job_applications(user_id, status)',
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

      // ── RAG: pgvector extension ────────────────────────────────────
      // embed-english-v3.0 (Cohere) is 1024-dim. HNSW indexes give us ~10ms
      // top-k cosine search at our scale (low five-figures of chunks).
      `CREATE EXTENSION IF NOT EXISTS vector`,

      // Global knowledge base — Capra Prepare topic chunks. One row per
      // section of a topic (introduction / keyConcepts / whenToUse /
      // questions[N]). source_kind currently = 'capra-topic'; reserved
      // for future: 'company-blog', 'official-doc' (Plan C).
      `CREATE TABLE IF NOT EXISTS lumora_kb_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_kind VARCHAR(40) NOT NULL,
        source TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        topic_title TEXT NOT NULL,
        section TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding vector(1024) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        content_hash VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source, topic_id, section)
      )`,
      `CREATE INDEX IF NOT EXISTS lumora_kb_chunks_hnsw
         ON lumora_kb_chunks USING hnsw (embedding vector_cosine_ops)
         WITH (m = 16, ef_construction = 64)`,
      `CREATE INDEX IF NOT EXISTS lumora_kb_chunks_topic
         ON lumora_kb_chunks (source, topic_id)`,

      // Per-user Prep Kit chunks — JD body, resume body, uploaded docs.
      // Strict per-user namespace; queries always filter by user_id.
      // doc_kind: 'jd' | 'resume' | 'cover_letter' | 'upload'.
      `CREATE TABLE IF NOT EXISTS lumora_user_doc_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_key VARCHAR(120),
        doc_kind VARCHAR(40) NOT NULL,
        section TEXT,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding vector(1024) NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        prep_state_version BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_user
         ON lumora_user_doc_chunks (user_id, prep_state_version)`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_hnsw
         ON lumora_user_doc_chunks USING hnsw (embedding vector_cosine_ops)
         WITH (m = 16, ef_construction = 64)`,

      // ── RAG: column-width upgrades ─────────────────────────────────
      // The first cut shipped these as VARCHAR. Widening to TEXT before
      // the tables are populated avoids a full-table rewrite later.
      // ALTER ... TYPE TEXT on a TEXT column is a fast no-op.
      `ALTER TABLE lumora_kb_chunks ALTER COLUMN source TYPE TEXT`,
      `ALTER TABLE lumora_kb_chunks ALTER COLUMN topic_id TYPE TEXT`,
      `ALTER TABLE lumora_kb_chunks ALTER COLUMN section TYPE TEXT`,
      `ALTER TABLE lumora_user_doc_chunks ALTER COLUMN section TYPE TEXT`,

      // ── RAG Phase 1: BM25 (Postgres tsvector) ──────────────────────
      // Generated columns + GIN indexes give us full-text search
      // coexisting with the HNSW vector index. Hybrid retrieval merges
      // both via Reciprocal Rank Fusion.
      `ALTER TABLE lumora_kb_chunks
         ADD COLUMN IF NOT EXISTS content_tsv tsvector
         GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED`,
      `CREATE INDEX IF NOT EXISTS lumora_kb_chunks_tsv_gin
         ON lumora_kb_chunks USING GIN (content_tsv)`,
      `ALTER TABLE lumora_user_doc_chunks
         ADD COLUMN IF NOT EXISTS content_tsv tsvector
         GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_tsv_gin
         ON lumora_user_doc_chunks USING GIN (content_tsv)`,

      // ── RAG Phase 6: per-user code kit ─────────────────────────────
      // Captures the user's submitted code from the Practice playground
      // so Sona can ground future questions in the user's own coding
      // style + past attempts. Per-user namespace enforced at SQL.
      // problem_slug stays denormalised to avoid a join during retrieval.
      `CREATE TABLE IF NOT EXISTS lumora_user_code_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_slug TEXT NOT NULL,
        problem_title TEXT NOT NULL,
        language VARCHAR(40) NOT NULL,
        section TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding vector(1024) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS lumora_user_code_chunks_user
         ON lumora_user_code_chunks (user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS lumora_user_code_chunks_user_problem
         ON lumora_user_code_chunks (user_id, problem_slug)`,
      `CREATE INDEX IF NOT EXISTS lumora_user_code_chunks_hnsw
         ON lumora_user_code_chunks USING hnsw (embedding vector_cosine_ops)
         WITH (m = 16, ef_construction = 64)`,
      `ALTER TABLE lumora_user_code_chunks
         ADD COLUMN IF NOT EXISTS content_tsv tsvector
         GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED`,
      `CREATE INDEX IF NOT EXISTS lumora_user_code_chunks_tsv_gin
         ON lumora_user_code_chunks USING GIN (content_tsv)`,

      // ── RAG Phase 5: session warm kit ──────────────────────────────
      // Per-user prefetched chunks, refreshed on Prep save. Inference
      // reads this and skips live retrieval when the kit is fresh.
      `CREATE TABLE IF NOT EXISTS lumora_session_kit (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        kit JSONB NOT NULL,
        prep_state_version BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // ── RAG Phase 7 (Plan D): retrieval observability ──────────────
      // Records every retrieve() call for offline eval (recall@k, MRR)
      // and latency dashboards. Fire-and-forget from the service layer.
      `CREATE TABLE IF NOT EXISTS lumora_retrieval_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        question TEXT NOT NULL,
        top_chunk_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        scores JSONB NOT NULL DEFAULT '[]'::jsonb,
        latency_ms INTEGER,
        used_warm_kit BOOLEAN DEFAULT false,
        used_hyde BOOLEAN DEFAULT false,
        used_rerank BOOLEAN DEFAULT false,
        timed_out BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS lumora_retrieval_logs_created
         ON lumora_retrieval_logs (created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS lumora_retrieval_logs_user_created
         ON lumora_retrieval_logs (user_id, created_at DESC)`,

      // ── Behavioral story anchor (awesome-llm-apps memory pattern) ──
      // Stores pre-parsed STAR stories per user so behavioral answers
      // inject the exact right story/metric rather than re-discovering
      // it from raw resume text on every request.
      `CREATE TABLE IF NOT EXISTS lumora_user_stories (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        stories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_user_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, filename)
      )`,

      `ALTER TABLE lumora_user_doc_chunks ADD COLUMN IF NOT EXISTS source_key TEXT`,
      `ALTER TABLE coding_usage ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0`,
      `ALTER TABLE coding_usage ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0`,
      `ALTER TABLE coding_usage ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS lumora_user_doc_chunks_source_key ON lumora_user_doc_chunks(source_key)`,

      // ── Embedding dimension migration: 1536 → 1024 (Cohere) ───────────
      // Switched from OpenAI text-embedding-3-small (1536-dim) to
      // Cohere embed-english-v3.0 (1024-dim). Existing 1536-dim vectors
      // are incompatible with the new model; NULL them so the new inserts
      // succeed. The KB and user doc chunks will re-index on next use.
      // Using IF EXISTS guards so this is a no-op on fresh installs where
      // the column was already created as vector(1024).
      `DO $$ BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'lumora_kb_chunks' AND column_name = 'embedding'
         ) THEN
           ALTER TABLE lumora_kb_chunks ALTER COLUMN embedding TYPE vector(1024) USING NULL;
         END IF;
       END $$`,
      `DO $$ BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'lumora_user_doc_chunks' AND column_name = 'embedding'
         ) THEN
           ALTER TABLE lumora_user_doc_chunks ALTER COLUMN embedding TYPE vector(1024) USING NULL;
         END IF;
       END $$`,
      `DO $$ BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'lumora_user_code_chunks' AND column_name = 'embedding'
         ) THEN
           ALTER TABLE lumora_user_code_chunks ALTER COLUMN embedding TYPE vector(1024) USING NULL;
         END IF;
       END $$`,
      `CREATE TABLE IF NOT EXISTS camora_admin_config (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_proctor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        surface VARCHAR(20) NOT NULL,
        risk_score INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_proctor_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES lumora_proctor_sessions(id) ON DELETE CASCADE,
        type VARCHAR(32) NOT NULL,
        severity VARCHAR(10) NOT NULL,
        ts BIGINT NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_proctor_events_session
        ON lumora_proctor_events(session_id, ts)`,
    ];

    // Postgres error codes for "already exists" — the legitimate swallow
    // cases. Anything else (syntax error, permission denied, FK violation,
    // bad column type after a wrong manual edit) gets logged at warn so
    // a real schema problem actually surfaces instead of being absorbed
    // silently into "everything caught up".
    //   42P07 = duplicate_table          42710 = duplicate_object
    //   42P06 = duplicate_schema         42701 = duplicate_column
    //   42P16 = invalid_table_definition (already-has-pk on ALTER ADD)
    const ALREADY_EXISTS_CODES = new Set(['42P07', '42710', '42P06', '42701', '42P16']);
    for (const sql of migrations) {
      try {
        await query(sql);
      } catch (e) {
        if (!ALREADY_EXISTS_CODES.has(e.code)) {
          logger.warn({ err: e.message, code: e.code, sql: sql.slice(0, 120) }, '[migrations] non-trivial migration error');
        }
      }
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
import jobseekerProfileRouter from './routes/jobseekerProfile.js';
import jobApplicationsRouter from './routes/jobApplications.js';
import jobseekerTailorRouter from './routes/jobseekerTailor.js';
import storiesRouter from './routes/stories.js';
import prepRouter from './routes/prep.js';
import companyContextRouter from './routes/companyContext.js';
import audioPrefsRouter from './routes/audioPreferences.js';
import usercodeRouter from './routes/usercode.js';
import githubRouter from './routes/github.js';
import internalRouter from './routes/internal.js';
import adminRouter from './routes/admin.js';
import proctorRouter from './routes/proctor.js';
import { loadAdminConfig } from './services/adminConfig.js';

// Per-IP rate limiting — previously only ascend had limits. Transcribe/speaker/
// diagram were wide open to abuse before this.
import { authLimiter, apiLimiter, aiLimiter, codingLimiter, transcriptionLimiter } from './middleware/rateLimiter.js';
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
app.use('/api/v1/coding', codingLimiter, authenticate, requirePaidSubscription, codingRouter);
// Per-user code kit indexing (RAG Phase 6). Server-to-server hook from
// ascend-backend's run.js after a successful Practice run. Free-tier
// users can also build their kit, so this skips requirePaidSubscription;
// the daily free limit on Capra solves provides the rate floor.
app.use('/api/v1/usercode', apiLimiter, authenticate, usercodeRouter);
app.use('/api/v1/transcribe', transcriptionLimiter, authenticate, requirePaidSubscription, transcriptionRouter);
app.use('/api/v1/speaker', transcriptionLimiter, authenticate, requirePaidSubscription, speakerRouter);
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
app.use('/api/v1/jobsearch/profile', apiLimiter, authenticate, jobseekerProfileRouter);
app.use('/api/v1/jobsearch/applications', apiLimiter, authenticate, jobApplicationsRouter);
app.use('/api/v1/jobsearch/tailor', aiLimiter, authenticate, jobseekerTailorRouter);
app.use('/api/v1/stories', apiLimiter, storiesRouter); // stories feed is public-readable
app.use('/api/v1/github', apiLimiter, authenticate, requirePaidSubscription, githubRouter);
app.use('/api/v1/proctor', apiLimiter, authenticate, proctorRouter);

app.use('/internal', internalRouter);
app.use('/api/v1/admin', apiLimiter, authenticate, adminRouter);

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
// Fail fast on missing critical env vars — better a clear boot error
// than a cryptic API failure on the first live request.
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'AI_SERVICES_API_KEY'];
if (process.env.NODE_ENV !== 'test') {
  for (const v of REQUIRED_ENV) {
    if (!process.env[v]) {
      logger.error({ var: v }, `Missing required environment variable: ${v}`);
      process.exit(1);
    }
  }
}

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'Lumora backend listening (migrations running in background)');
});

runMigrations()
  .then(() => loadAdminConfig())
  .catch((err) => {
    logger.error({ err: err?.message }, 'Background migrations or admin config load failed');
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
    // Drain in-flight ai_hours_usage inserts before tearing down the
    // pool — fire-and-forget recordUsage() writes ~50-500ms after the
    // SSE answer event resolves and Railway's redeploy can otherwise
    // hit the gap between answer and insert. Capped at 5s so a stuck
    // insert can't block shutdown past the 15s force timer.
    try {
      const { drainPendingUsage } = await import('./services/aiHoursMeter.js');
      await drainPendingUsage(5000);
    } catch (err) {
      logger.warn({ err: err?.message }, 'drainPendingUsage failed');
    }
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
