/**
 * Request logger middleware - structured logging with Pino
 */

import pino from 'pino';
import config from '../config/index.js';

// Create logger instance
const transport = config.NODE_ENV === 'development'
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
  level: config.LOG_LEVEL,
  transport,
});

export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  }, 'Request received');

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
}

export default requestLogger;
