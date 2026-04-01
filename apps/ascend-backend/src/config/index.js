/**
 * Configuration module - validates environment variables at startup
 */

const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
];

const optionalEnvVars = {
  PORT: '3009',
  LOG_LEVEL: 'info',
  CORS_ORIGIN: '*',
  NODE_ENV: 'development',
  DATABASE_URL: '',
  JWT_SECRET_KEY: '',
  JWT_ALGORITHM: 'HS256',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_REDIRECT_URI: '',
  FRONTEND_URL: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_PUBLISHABLE_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  ADMIN_SECRET: '',
};

function validateConfig() {
  const missing = [];
  const config = {};

  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    } else {
      config[envVar] = process.env[envVar];
    }
  }

  // Set optional environment variables with defaults
  for (const [envVar, defaultValue] of Object.entries(optionalEnvVars)) {
    config[envVar] = process.env[envVar] || defaultValue;
  }

  // Convert PORT to number
  config.PORT = parseInt(config.PORT, 10);

  // Warn about missing optional vars in development
  if (missing.length > 0 && config.NODE_ENV === 'development') {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }

  // In production, warn but don't crash (API keys might be set differently)
  if (missing.length > 0 && config.NODE_ENV === 'production') {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }

  return config;
}

export const config = validateConfig();

export default config;
