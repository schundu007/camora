/**
 * Structured request logger for lumora-backend using pino.
 *
 * Replaces scattered console.* calls. In dev, pino-pretty colorizes; in
 * production, raw JSON lines are emitted so Railway / Datadog / etc. can
 * ingest them directly.
 *
 * Mirrors apps/ascend-backend/src/middleware/requestLogger.js — intentionally
 * so that the logger API (logger.info, logger.warn, logger.error with a
 * context object) is identical across both backends and can later fold into
 * a shared package.
 */

import pino from 'pino';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

const transport = NODE_ENV === 'development'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: LOG_LEVEL,
  transport,
  base: { service: 'lumora-backend' },
  redact: {
    // Never log Authorization headers / raw tokens / Stripe signatures.
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.headers["stripe-signature"]',
      '*.token',
      '*.access_token',
      '*.refresh_token',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
});

export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Skip logging for health checks — they're noisy and carry no diagnostic value.
  if (req.url === '/health') return next();

  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  }, 'Request received');

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      durationMs: duration,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Request failed');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with client error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
}

export default requestLogger;
