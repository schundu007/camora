import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  maxTokensQuick: parseInt(process.env.MAX_TOKENS_QUICK || '2000'),
  maxTokensDesign: parseInt(process.env.MAX_TOKENS_DESIGN || '8192'),

  // Stripe configuration retired in PR-2 — billing now lives exclusively
  // on ascend-backend. Lumora-backend authenticates against the shared DB
  // (ascend_subscriptions) for paywall enforcement; it does not call Stripe.

  // AI Services
  aiServicesUrl: process.env.AI_SERVICES_URL || 'http://localhost:8001',

  // CORS
  corsOrigins: [
    'http://localhost:3000',
    'https://camora.cariara.com',
    'https://lumora.cariara.com',
    'https://capra.cariara.com',
  ],

  // Quota
  dailyFreeLimit: parseInt(process.env.DAILY_FREE_LIMIT || '10'),
};
