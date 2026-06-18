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
import teamsRouter from './routes/teams.js';
import topicReadsRouter from './routes/topicReads.js';
import topicCommentsRouter from './routes/topicComments.js';
import referralRouter from './routes/referral.js';
import goalCountdownRouter from './routes/goalCountdown.js';
import gamificationRouter from './routes/gamification.js';
import scoreCardsRouter from './routes/scoreCards.js';
import activityRouter from './routes/activity.js';
import problemsRouter from './routes/problems.js';
import challengeRouter from './routes/challenge.js';
import libraryRouter from './routes/library.js';
// Jobs router copied from lumora-backend so the lumorab.cariara.com service
// (which currently runs ascend code) can answer /api/v1/jobs requests from
// the frontend's /jobs page. Falls back to 503 if JOBS_DATABASE_URL is unset.
import jobsRouter from './routes/jobs.js';
import mcqRouter from './routes/mcq.js';
import { playgroundRouter } from './routes/playground.js';
import { playgroundLimiter } from './middleware/playgroundLimiter.js';
import { WebSocketServer } from 'ws';
import { playgroundSessionsRouter } from './routes/playgroundSessions.js';
import { createTtydProxy } from './services/playground/wsProxy.js';
import { getSession } from './services/playground/sessionStore.js';
import { verifyToken } from './lib/shared-auth.js';
import { askRouter } from './routes/ask.js';
import learnTopicRouter from './routes/learnTopic.js';
import prepDocsRouter from './routes/prepDocs.js';
import jobAlertsRouter from './routes/jobAlerts.js';
import caraRouter from './routes/cara.js';
import cron from 'node-cron';
import { sendJobAlertDigest } from './services/jobAlertEmailService.js';

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
import { hourBudgetGate } from './middleware/hourBudgetGate.js';

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
    // JWT generation counter — every issued token carries this value as `gen`.
    // Incrementing this column invalidates every outstanding token for the
    // user (logout-all-sessions / suspicious-activity revocation). Default 1
    // so existing rows + any backwards-issued tokens with no `gen` claim still
    // match (we only enforce the check when `gen` is present in the token).
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_generation INTEGER NOT NULL DEFAULT 1');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT');
    // Backfill: copy avatar → image for any user whose Google photo landed in the
    // legacy avatar column but not in image (added later). picture column does not exist.
    await query(`UPDATE users SET image = avatar WHERE image IS NULL AND avatar IS NOT NULL`);
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
    // mermaid_code was a Python-fallback caching column; the fallback path
    // was removed in favor of an explicit error so admins can retry. Drop
    // the column so future schema reads don't suggest it's a live field.
    await query('ALTER TABLE ascend_diagram_cache DROP COLUMN IF EXISTS mermaid_code');
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

    // AI Hours metering — Phase 0 of pricing-v2 (fixed Capra content + metered LLM hours).
    // Every LLM-touching surface (Lumora live, solve, analyze, prep, diagram, job-analyze)
    // writes a row here. Phase 0 = log-only, no gating, no Stripe sync. The legacy-Pro
    // fair-use cap reads 30-day rolling sums from this table.
    await query(`CREATE TABLE IF NOT EXISTS ai_hours_usage (
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_ai_hours_user_created ON ai_hours_usage(user_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_ai_hours_unsynced ON ai_hours_usage(metered_to_stripe) WHERE metered_to_stripe = false');
    console.log('[Migrations] ai_hours_usage table ensured');

    // Team / group accounts — Pro Max owners + Business Starter buyers can
    // share their hour pool with up to N seats. Source of truth for team
    // membership; aiHoursMeter stamps team_id on usage rows so consumption
    // rolls up cleanly per team and per member.
    await query(`CREATE TABLE IF NOT EXISTS teams (
      id BIGSERIAL PRIMARY KEY,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(120),
      plan_type VARCHAR(40) NOT NULL,
      seat_limit INTEGER NOT NULL DEFAULT 5,
      hours_pool_total REAL,
      hours_pool_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payg_rate_cents INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_user_id)');

    await query(`CREATE TABLE IF NOT EXISTS team_members (
      id BIGSERIAL PRIMARY KEY,
      team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'member',
      per_member_hour_cap REAL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (team_id, user_id),
      UNIQUE (user_id)
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)');

    await query(`CREATE TABLE IF NOT EXISTS team_invites (
      id BIGSERIAL PRIMARY KEY,
      team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      invite_token VARCHAR(64) NOT NULL UNIQUE,
      invited_by INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_team_invites_email_pending ON team_invites(email) WHERE accepted_at IS NULL');

    // Stamp team_id on usage rows so per-team and per-member rollups are cheap.
    await query('ALTER TABLE ai_hours_usage ADD COLUMN IF NOT EXISTS team_id BIGINT');
    await query('CREATE INDEX IF NOT EXISTS idx_ai_hours_team_created ON ai_hours_usage(team_id, created_at DESC) WHERE team_id IS NOT NULL');
    console.log('[Migrations] team tables + ai_hours_usage.team_id ensured');

    // Top-up + grant credits — extends a personal budget (team_id NULL) or a
    // team's pool. `source` distinguishes paid top-ups (never expire) from
    // free-trial grants (7-day) and subscription-cycle grants (paid → never
    // expire). NULL expires_at = never expires.
    await query(`CREATE TABLE IF NOT EXISTS ai_hour_topups (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
      hours REAL NOT NULL,
      amount_cents INTEGER NOT NULL,
      stripe_session_id VARCHAR(255),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    // Existing rows: relax NOT NULL on expires_at so paid top-ups can be NULL.
    await query("ALTER TABLE ai_hour_topups ALTER COLUMN expires_at DROP NOT NULL");
    // Source tag: 'topup' (paid à la carte), 'subscription' (cycle grant),
    // 'trial' (7-day free hour), 'auto_topup' (auto-charged top-up).
    await query("ALTER TABLE ai_hour_topups ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'topup'");
    // Stripe invoice tag for subscription-cycle grant idempotency.
    await query("ALTER TABLE ai_hour_topups ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255)");
    await query('CREATE UNIQUE INDEX IF NOT EXISTS uq_topups_invoice ON ai_hour_topups(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL');
    // Drop and recreate the partial indexes so NULL expires_at counts as active.
    await query('DROP INDEX IF EXISTS idx_topups_user');
    await query('DROP INDEX IF EXISTS idx_topups_team');
    await query('CREATE INDEX IF NOT EXISTS idx_topups_user ON ai_hour_topups(user_id) WHERE team_id IS NULL AND (expires_at IS NULL OR expires_at > NOW())');
    await query('CREATE INDEX IF NOT EXISTS idx_topups_team ON ai_hour_topups(team_id) WHERE team_id IS NOT NULL AND (expires_at IS NULL OR expires_at > NOW())');
    // Belt-and-suspenders idempotency: even if the webhook event-dedup
    // (ascend_stripe_events) is bypassed somehow (manual replay), the same
    // checkout session can't credit twice.
    await query('CREATE UNIQUE INDEX IF NOT EXISTS uq_topups_session ON ai_hour_topups(stripe_session_id) WHERE stripe_session_id IS NOT NULL');
    // One trial grant per user — idempotent grant on first auth.
    await query("CREATE UNIQUE INDEX IF NOT EXISTS uq_topups_trial_per_user ON ai_hour_topups(user_id) WHERE source = 'trial'");
    // Auto-charge tracking — distinguishes auto-topups from manual checkout
    // top-ups so the monthly cap is enforced correctly.
    await query("ALTER TABLE ai_hour_topups ADD COLUMN IF NOT EXISTS auto_charged BOOLEAN NOT NULL DEFAULT false");
    await query('CREATE INDEX IF NOT EXISTS idx_topups_auto ON ai_hour_topups(user_id, created_at DESC) WHERE auto_charged = true');
    console.log('[Migrations] ai_hour_topups table ensured');

    // Auto-topup preferences (Phase 6) — opt-in by definition. NULLs mean
    // the user has never enabled it. auto_topup_monthly_cap_cents protects
    // against runaway charges; default OFF when columns are added.
    await query("ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS auto_topup_pack VARCHAR(20)");
    await query("ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS auto_topup_monthly_cap_cents INTEGER");
    await query("ALTER TABLE teams ADD COLUMN IF NOT EXISTS auto_topup_pack VARCHAR(20)");
    await query("ALTER TABLE teams ADD COLUMN IF NOT EXISTS auto_topup_monthly_cap_cents INTEGER");
    console.log('[Migrations] auto-topup columns ensured');

    // Pool-low reminder timestamps (Phase 7). Set when an 80% / 95% email is
    // sent for the current period; cleared on period rollover so each new
    // period gets fresh warnings.
    await query("ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS pool_reminder_80_sent_at TIMESTAMPTZ");
    await query("ALTER TABLE ascend_subscriptions ADD COLUMN IF NOT EXISTS pool_reminder_95_sent_at TIMESTAMPTZ");
    await query("ALTER TABLE teams ADD COLUMN IF NOT EXISTS pool_reminder_80_sent_at TIMESTAMPTZ");
    await query("ALTER TABLE teams ADD COLUMN IF NOT EXISTS pool_reminder_95_sent_at TIMESTAMPTZ");
    console.log('[Migrations] pool reminder timestamps ensured');

    // Refund tracking — when a top-up is refunded via Stripe, we mark it
    // here and exclude it from pool sums going forward.
    await query("ALTER TABLE ai_hour_topups ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ");
    await query("ALTER TABLE ai_hour_topups ADD COLUMN IF NOT EXISTS refund_reason VARCHAR(100)");
    console.log('[Migrations] refund tracking ensured');

    // Job alerts opt-in
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS job_alerts_enabled BOOLEAN DEFAULT FALSE');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS job_alerts_last_sent_at TIMESTAMPTZ');
    // Auto-enable job alerts for owner accounts
    const ownerEmails = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    if (ownerEmails.length) {
      await query(
        `UPDATE users SET job_alerts_enabled = true WHERE email = ANY($1) AND job_alerts_enabled = false`,
        [ownerEmails]
      );
    }
    console.log('[Migrations] job alerts columns ensured');

    // Refund requests are admin-approved, not auto-issued. User submits a
    // request; an admin in /admin/refunds approves it (which then fires the
    // actual Stripe refund and marks ai_hour_topups.refunded_at).
    await query(`CREATE TABLE IF NOT EXISTS topup_refund_requests (
      id BIGSERIAL PRIMARY KEY,
      topup_id BIGINT NOT NULL REFERENCES ai_hour_topups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      processed_by INTEGER REFERENCES users(id),
      processed_note TEXT,
      stripe_refund_id VARCHAR(80)
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_refund_pending ON topup_refund_requests(requested_at DESC) WHERE status = \'pending\'');
    await query('CREATE INDEX IF NOT EXISTS idx_refund_user ON topup_refund_requests(user_id, requested_at DESC)');
    // One pending request per topup at a time — prevents duplicate spam.
    await query('CREATE UNIQUE INDEX IF NOT EXISTS uq_refund_pending_per_topup ON topup_refund_requests(topup_id) WHERE status = \'pending\'');
    console.log('[Migrations] refund_requests table ensured');

    // LeetCode problem catalog — populated by scripts/migrate-problems-json.js
    // then enriched by scripts/scrape-leetcode.js. slug is the dedup key.
    await query(`CREATE TABLE IF NOT EXISTS coding_problems (
      id              SERIAL PRIMARY KEY,
      lc_id           INTEGER UNIQUE,
      slug            VARCHAR(255) UNIQUE NOT NULL,
      title           VARCHAR(500) NOT NULL,
      difficulty      VARCHAR(10) NOT NULL DEFAULT 'Medium',
      content         TEXT,
      examples        JSONB,
      constraints     JSONB,
      hints           JSONB,
      topic_tags      JSONB,
      company_tags    JSONB,
      code_snippets   JSONB,
      is_premium      BOOLEAN DEFAULT false,
      acceptance_rate FLOAT,
      source          VARCHAR(20) NOT NULL DEFAULT 'leetcode',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON coding_problems(difficulty)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_source ON coding_problems(source)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_topic_tags ON coding_problems USING GIN(topic_tags)');
    await query('CREATE INDEX IF NOT EXISTS idx_coding_problems_company_tags ON coding_problems USING GIN(company_tags)');
    console.log('[Migrations] coding_problems table ensured');

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

    // MCQ generated questions cache — stores AI-generated questions by problem_id
    await query(`CREATE TABLE IF NOT EXISTS ascend_mcq_generated (
      id SERIAL PRIMARY KEY,
      problem_id VARCHAR(100) UNIQUE NOT NULL,
      question TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_letter CHAR(1) NOT NULL,
      explanation TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query('CREATE INDEX IF NOT EXISTS idx_mcq_generated_problem ON ascend_mcq_generated(problem_id)');
    console.log('[Migrations] MCQ generated table ensured');

    // Ensure site_visitors table exists (legacy visitor counter)
    await query(`CREATE TABLE IF NOT EXISTS site_visitors (
      visit_date DATE PRIMARY KEY,
      count INTEGER DEFAULT 0
    )`);

    // Admin column — must exist before the OWNER_EMAILS UPDATE below
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false');

    // Ensure owner accounts are admins. Pulled from OWNER_EMAILS /
    // ADMIN_EMAILS env (csv) — hardcoding the list in source meant that
    // changing the owner's email would require a code edit + redeploy
    // to re-grant admin, while the *old* email kept its grant forever.
    const _ownerEmails = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (_ownerEmails.length > 0) {
      await query('UPDATE users SET is_admin = true WHERE LOWER(email) = ANY($1::text[])', [_ownerEmails]);
    }

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
      `CREATE TABLE IF NOT EXISTS playground_snippets (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        language TEXT NOT NULL,
        code TEXT NOT NULL,
        tests_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_lumora_conversations_user ON lumora_conversations(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_messages_conv ON lumora_messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_user ON lumora_usage_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_usage_created ON lumora_usage_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_bookmarks_user ON lumora_bookmarks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_completion_user ON lumora_completion_marks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_lumora_quotas_user ON lumora_quotas(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_coding_usage_user_date ON coding_usage(user_id, created_at)',
      `CREATE TABLE IF NOT EXISTS lumora_ask_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200),
        provider VARCHAR(20) DEFAULT 'claude',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS lumora_ask_messages (
        id BIGSERIAL PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES lumora_ask_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_ask_conv_user ON lumora_ask_conversations(user_id, updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ask_msg_conv ON lumora_ask_messages(conversation_id, created_at ASC)',
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

  // Learn topic content cache
  await query(`CREATE TABLE IF NOT EXISTS ascend_learn_topic_cache (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(200) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    title VARCHAR(300),
    source VARCHAR(20),
    category VARCHAR(100),
    level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await query('CREATE INDEX IF NOT EXISTS idx_learn_topic_slug ON ascend_learn_topic_cache(slug)');

  // Playground terminal sessions
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
    await query(`CREATE TABLE IF NOT EXISTS playground_objective_completions (
      session_id    UUID REFERENCES playground_sessions(id) ON DELETE CASCADE,
      objective_id  TEXT NOT NULL,
      completed_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (session_id, objective_id)
    )`);
    console.log('[Migrations] playground_sessions tables ensured');
  } catch (e) {
    console.warn('[Migrations] playground_sessions migration failed:', e.message);
  }
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
    // Allow specific browser-extension origins. Was a blanket allow for any
    // chrome-extension:// or moz-extension:// origin — that meant any
    // installed extension could make credentialed requests with the SSO
    // cookie, including silently calling checkout/admin routes. Now only
    // extensions whose ID is in ALLOWED_EXTENSION_IDS env get through.
    if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      const allowedIds = (process.env.ALLOWED_EXTENSION_IDS || '')
        .split(',').map((s) => s.trim()).filter(Boolean);
      const id = origin.split('://')[1] || '';
      if (allowedIds.includes(id)) return callback(null, true);
      // Not in allowlist — block in prod, warn in dev so devs can find the gap
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Extension not allowed by CORS'));
      }
      console.warn(`CORS extension origin blocked: ${origin} (set ALLOWED_EXTENSION_IDS to allow)`);
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

// Raw body parsing for Stripe webhooks. MUST run before express.json so
// stripe.webhooks.constructEvent sees the original bytes for signature
// verification. The router is mounted at BOTH /api/billing AND /api/v1/billing
// (additive alias for the lumorab.cariara.com host that runs ascend code),
// so the raw-body handler must register on both paths — otherwise webhook
// deliveries to the v1 alias get parsed by express.json first and signature
// verification fails for every event delivered to that path. Adding both
// paths is idempotent and matches the dual mount of the billing router below.
app.use(
  ['/api/billing/webhook', '/api/v1/billing/webhook'],
  express.raw({ type: 'application/json' }),
);

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
// `express.text()` here so the route also accepts the text/plain bodies
// sent by navigator.sendBeacon — see apps/frontend/src/hooks/usePageTracker.ts.
// Using text/plain avoids a CORS preflight on every page navigation.
app.post('/api/visitors/pageview', apiLimiter, express.text({ type: 'text/plain', limit: '32kb' }), async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    const { path, referrer } = body || {};
    if (!path) return res.status(400).json({ error: 'path required' });
    // Note: client-supplied `email` field is intentionally ignored here.
    // Anyone could POST an arbitrary email and poison the analytics
    // (impersonation, competitor smear, conversion-funnel skew). For
    // authenticated traffic, derive identity server-side via the SSO cookie
    // if/when needed. Until then, the email column stays NULL.
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || null;
    await query(
      'INSERT INTO page_views (path, email, ip, user_agent, referrer) VALUES ($1, NULL, $2, $3, $4)',
      [path, ip, userAgent, referrer || null]
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

// Admin: unique visitor detail with geo lookup
app.get('/api/visitors/visitors-detail', apiLimiter, authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { days, exclude_emails } = req.query;
    const params = [];
    const conditions = [];
    let idx = 1;

    if (exclude_emails) {
      const emails = exclude_emails.split(',').map(e => e.trim().toLowerCase());
      conditions.push(`(email IS NULL OR LOWER(email) NOT IN (${emails.map(() => `$${idx++}`).join(',')}))`);
      params.push(...emails);
    }
    if (days) {
      const d = parseInt(days, 10);
      if (Number.isFinite(d) && d > 0) {
        conditions.push(`created_at >= NOW() - ($${idx++} * INTERVAL '1 day')`);
        params.push(d);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Aggregate per unique IP
    const { rows } = await query(`
      SELECT
        ip,
        COUNT(*) as views,
        COUNT(DISTINCT path) as pages_count,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        MODE() WITHIN GROUP (ORDER BY user_agent) as user_agent,
        MODE() WITHIN GROUP (ORDER BY referrer) as referrer,
        array_agg(DISTINCT path ORDER BY path) FILTER (WHERE path IS NOT NULL) as paths
      FROM page_views ${where}
      GROUP BY ip
      ORDER BY last_seen DESC
      LIMIT 200
    `, params);

    // Skip geo for synthetic seed IPs
    const realRows = rows.filter(r => r.ip && !r.ip.startsWith('seed-'));

    // Batch geo lookup via ip-api.com (free, server-side HTTP only)
    // NOTE: do NOT set per-item `fields` — it overrides the URL fields and drops `query`
    let geoMap = {};
    try {
      const ips = realRows.map(r => ({ query: r.ip }));
      for (let i = 0; i < ips.length; i += 100) {
        const batch = ips.slice(i, i + 100);
        const geoRes = await fetch('http://ip-api.com/batch?fields=status,country,countryCode,city,isp,org,query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          for (const g of geoData) {
            if (g.status === 'success') geoMap[g.query] = g;
          }
        }
      }
    } catch (err) {
      console.error('[Geo] batch lookup failed:', err.message);
    }

    const visitors = rows.map(r => ({
      ip: r.ip,
      views: parseInt(r.views),
      pages_count: parseInt(r.pages_count),
      first_seen: r.first_seen,
      last_seen: r.last_seen,
      user_agent: r.user_agent || null,
      referrer: r.referrer || null,
      paths: (r.paths || []).slice(0, 5),
      geo: geoMap[r.ip] || null,
    }));

    res.json({ visitors });
  } catch (err) {
    console.error('[Visitors Detail] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch visitor detail' });
  }
});

// Admin: list all users (protected, admin-only)
app.get('/api/admin/users', apiLimiter, authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const result = await query(`
      SELECT u.id, u.email, u.name, COALESCE(u.image, u.avatar) as image, u.provider, u.is_active,
             u.onboarding_completed, u.plan_type, u.plan_status, u.created_at,
             u.username, u.referral_code, u.target_company, u.target_role, u.interview_date,
             u.location, u.last_login_at, u.is_admin,
             s.plan_type as sub_plan, s.is_challenger, s.trial_ends_at
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
app.get('/api/admin/emails', apiLimiter, authenticate, async (req, res) => {
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

// Admin: toggle admin status for a user
app.post('/api/admin/set-admin', apiLimiter, authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { userId, isAdmin } = req.body;
    if (userId === undefined || isAdmin === undefined) return res.status(400).json({ error: 'userId and isAdmin required' });

    const userIdNum = parseInt(userId, 10);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) return res.status(400).json({ error: 'userId must be a positive integer' });

    // Prevent removing own admin
    if (userIdNum === req.user.id && !isAdmin) return res.status(400).json({ error: 'Cannot remove your own admin status' });

    await query('UPDATE users SET is_admin = $1 WHERE id = $2', [!!isAdmin, userIdNum]);
    const updated = await query('SELECT email, name, is_admin FROM users WHERE id = $1', [userIdNum]);
    if (!updated.rows[0]) return res.status(404).json({ error: 'User not found' });

    res.json({ ok: true, ...updated.rows[0] });
  } catch (err) {
    console.error('[Admin SetAdmin] Error:', err.message);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// Admin: grant free trial to a user
app.post('/api/admin/grant-trial', apiLimiter, authenticate, async (req, res) => {
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
app.delete('/api/admin/delete-user/:userId', apiLimiter, authenticate, async (req, res) => {
  try {
    const admin = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!admin.rows[0]?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const userIdNum = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }
    const userId = userIdNum;

    // Prevent self-deletion
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    const user = await query('SELECT email, name, is_admin FROM users WHERE id = $1', [userId]);
    if (user.rows[0]?.is_admin) return res.status(403).json({ error: 'Cannot delete an admin account. Revoke admin first.' });
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

// AI-intensive routes get stricter rate limiting + team-pool gating.
// hourBudgetGate sits AFTER authenticate (needs req.user) and BEFORE aiLimiter.
app.use('/api/solve', authenticate, hourBudgetGate, aiLimiter, solveRouter);
app.use('/api/analyze', authenticate, hourBudgetGate, aiLimiter, analyzeRouter);
app.use('/api/fetch', authenticate, apiLimiter, fetchRouter);
app.use('/api/run', authenticate, apiLimiter, runRouter);
app.use('/api/v1/playground', authenticate, playgroundLimiter, playgroundRouter);
app.use('/api/v1/playground/sessions', authenticate, playgroundSessionsRouter);
app.use('/api/v1/ask', authenticate, aiLimiter, askRouter);
app.use('/api/fix', authenticate, hourBudgetGate, aiLimiter, fixRouter);
app.use('/api/transcribe', authenticate, hourBudgetGate, aiLimiter, transcribeRouter);
app.use('/api/ascend/prep', authenticate, hourBudgetGate, apiLimiter, ascendPrepRouter);
app.use('/api/ascend', authenticate, hourBudgetGate, aiLimiter, ascendRouter);
// hourBudgetGate is NOT applied at the mount because /api/diagram has
// non-AI subroutes (/lookup, /cache-stats, /status, /debug — all cache
// reads or admin metadata). The gate is applied inside diagramRouter on
// just the /generate and /eraser handlers that actually call the LLM.
app.use('/api/diagram', authenticate, aiLimiter, diagramRouter);
app.use('/api/extract', authenticate, hourBudgetGate, aiLimiter, extractRouter);

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
app.use('/api/v1/problems', apiLimiter, problemsRouter);

// Jobs proxy — copied from lumora-backend. Returns 503 cleanly if
// JOBS_DATABASE_URL is unset, so the frontend's /jobs page surfaces a
// "jobs db not configured" message instead of an opaque 404.
app.use('/api/v1/jobs', apiLimiter, jobsRouter);
app.use('/api/v1/job-alerts', apiLimiter, jobAlertsRouter);

// Lumora route surface — full lumora-backend mounted under src/lumora/.
// These pair with the existing /api/v1/auth and /api/v1/billing aliases
// so the frontend's VITE_LUMORA_API_URL=https://lumorab.cariara.com
// (which actually points at this ascend service) gets real responses
// instead of 404s for every Lumora page.
// Lumora LLM routes: pool gate runs after their internal authenticate
// middleware (mounted inside the router), so we can't put hourBudgetGate
// before authenticate at this level. Instead we attach it as the LAST
// middleware before the router so req.user is populated by then.
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
app.use('/api/goal', authenticate, apiLimiter, goalCountdownRouter);

// Gamification routes (XP, badges, leaderboard — uses jwtAuth internally)
app.use('/api/gamification', apiLimiter, gamificationRouter);

// Score cards, certificates, public profiles
app.use('/api/score-cards', apiLimiter, scoreCardsRouter);
app.use('/api/challenge', apiLimiter, challengeRouter);
app.use('/api/activity', apiLimiter, activityRouter);
app.use('/api/library', apiLimiter, libraryRouter);

// Job URL analysis (scrape + AI analysis) — auth required, AI rate limit
app.use('/api/job-analyze', authenticate, aiLimiter, jobAnalyzeRouter);

// Team / group sharing — Pro Max owners + Business Starter buyers can pool
// hours across up to 5/10 seats. Auth via jwtAuth in the router itself.
app.use('/api/v1/teams', apiLimiter, teamsRouter);

// Voice assistant routes (SSE + REST)
// No rate limiter on /events endpoint for real-time streaming
app.use('/api/voice', authenticate, voiceRouter);
app.use('/api/v1/resume', aiLimiter, resumeRouter);

// MCQ question generation — AI-generated questions from CoderPad metadata, DB-cached
app.use('/api/v1/mcq', authenticate, aiLimiter, mcqRouter);

// Cara — platform-wide AI guide (⌘K command bar)
app.use('/api/v1/cara', authenticate, aiLimiter, caraRouter);

// Learn topic content — Redis L1 + Postgres L2 cache, auto-generated on first visit
app.use('/api/v1/learn/topic', apiLimiter, learnTopicRouter);
app.use('/api/v1/prep/docs', apiLimiter, prepDocsRouter);

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

// Daily job alert digest — 8am UTC every day
cron.schedule('0 8 * * *', async () => {
  logger.info('[JobAlerts] Running daily digest');
  try {
    const { rows: users } = await query(
      `SELECT id, email, name, job_roles, resume_text FROM users
       WHERE job_alerts_enabled = true
         AND (job_alerts_last_sent_at IS NULL OR job_alerts_last_sent_at < NOW() - INTERVAL '20 hours')`
    );
    let sent = 0, skipped = 0;
    for (const user of users) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const ok = await sendJobAlertDigest(user);
        if (ok) {
          sent++;
          await query('UPDATE users SET job_alerts_last_sent_at = NOW() WHERE id = $1', [user.id]);
        } else {
          skipped++;
        }
      } catch (err) {
        logger.error({ userId: user.id, err: err.message }, '[JobAlerts] digest error');
      }
    }
    logger.info({ sent, skipped, total: users.length }, '[JobAlerts] Daily digest complete');
  } catch (err) {
    logger.error({ err: err.message }, '[JobAlerts] Cron failed');
  }
}, { timezone: 'UTC' });

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT, env: config.NODE_ENV }, 'Ascend API server started (camora)');
});

// Track connections for graceful shutdown
server.on('connection', (socket) => {
  trackConnection(socket);
});

// Playground WebSocket proxy — browser ↔ ttyd inside Nomad container
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const match = req.url?.match(/^\/playground\/ws\/([a-f0-9-]+)(?:\?.*)?$/);
  if (!match) { socket.destroy(); return; }
  const sessionId = match[1];

  wss.handleUpgrade(req, socket, head, async (ws) => {
    // Buffer ALL browser messages immediately — before any async session lookup.
    // Browser sends auth text frame on ws.onopen (after 101) but we await DB here;
    // without this buffer the auth message is lost before createTtydProxy sets up its listener.
    const preBuf = [];
    ws.on('message', (data, isBinary) => preBuf.push({ data, isBinary }));

    console.log(`[PlaygroundWS] upgrade sessionId=${sessionId}`);
    try {
      let token = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      } else if (req.headers.cookie) {
        const m = req.headers.cookie.match(/(?:^|;\s*)cariara_sso=([^;]+)/);
        if (m) token = decodeURIComponent(m[1]);
      }
      if (!token) {
        const urlObj = new URL(req.url, 'http://localhost');
        const qToken = urlObj.searchParams.get('token');
        if (qToken) token = qToken;
      }

      if (!token) { console.log('[PlaygroundWS] close: no token'); ws.close(4401, 'Unauthorized'); return; }

      let payload;
      try {
        payload = verifyToken(token);
      } catch (e) {
        console.log('[PlaygroundWS] close: bad token', e.message);
        ws.close(4401, 'Invalid token');
        return;
      }

      const userId = parseInt(payload.sub, 10);
      if (!userId) { ws.close(4401, 'Invalid token payload'); return; }

      const session = await getSession(sessionId);
      if (!session) { console.log('[PlaygroundWS] close: session not found'); ws.close(4404, 'Session not found'); return; }
      if (session.user_id !== userId) { ws.close(4403, 'Forbidden'); return; }
      if (session.status !== 'ready' && session.status !== 'active') {
        console.log('[PlaygroundWS] close: bad status', session.status);
        ws.close(4400, 'Session not ready');
        return;
      }

      const host = session.ttyd_host;
      const port = session.ttyd_port;
      console.log(`[PlaygroundWS] proxying to ttyd host=${host} port=${port} preBuf=${preBuf.length}`);
      if (!host || !port) { console.log('[PlaygroundWS] close: no ttyd addr'); ws.close(4500, 'Session has no ttyd address'); return; }

      ws.removeAllListeners('message');
      createTtydProxy(ws, host, port, preBuf);
    } catch (err) {
      console.error('[PlaygroundWS] upgrade error:', err.message);
      ws.close(4500, 'Internal error');
    }
  });
});

// Setup graceful shutdown handlers
setupGracefulShutdown(server);

export default app;
