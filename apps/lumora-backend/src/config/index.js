import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  maxTokensQuick: parseInt(process.env.MAX_TOKENS_QUICK || '2000'),
  maxTokensDesign: parseInt(process.env.MAX_TOKENS_DESIGN || '8192'),

  // Stripe configuration retired in PR-2 — billing now lives exclusively
  // on ascend-backend. Lumora-backend authenticates against the shared DB
  // (ascend_subscriptions) for paywall enforcement; it does not call Stripe.

  // AI Services
  aiServicesUrl: process.env.AI_SERVICES_URL || 'http://localhost:8001',

  // CORS — keep the hardcoded list as a safety net AND honor the
  // operator-set FRONTEND_URL / ALLOWED_ORIGINS env vars so Vercel
  // preview URLs and renamed domains don't silently 4xx every request
  // with an opaque "CORS error". Empty entries are filtered.
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://camora.cariara.com',
    'https://lumora.cariara.com',
    'https://capra.cariara.com',
    'https://cariara.com',
    'https://www.cariara.com',
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()),
  ].filter(Boolean),

  // Quota
  dailyFreeLimit: parseInt(process.env.DAILY_FREE_LIMIT || '10'),
};
