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

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY,
  stripePriceLifetime: process.env.STRIPE_PRICE_LIFETIME,

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

  // Redis
  redisUrl: process.env.REDIS_URL,
};
