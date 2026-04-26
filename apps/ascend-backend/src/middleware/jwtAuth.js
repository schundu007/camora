import jwt from 'jsonwebtoken';
import { query, initUser } from '../config/database.js';
import { logger } from './requestLogger.js';

// IMPORTANT: Read env vars lazily (not at module load time) to avoid race
// conditions where dotenv hasn't loaded yet when this module is first imported.
function getJwtSecret() {
  return process.env.JWT_SECRET_KEY;
}
function getJwtAlgorithm() {
  return process.env.JWT_ALGORITHM || 'HS256';
}

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from cariara OAuth backend
 */
export async function jwtAuth(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) {
    logger.warn('JWT_SECRET_KEY not configured');
    return res.status(500).json({
      error: 'Authentication not configured',
      code: 'AUTH_NOT_CONFIGURED',
    });
  }

  // Resolve token. Prefer Authorization: Bearer <token>, fall back to the
  // cariara_sso httpOnly cookie. Matching the unified auth pattern used by
  // packages/shared-auth and apps/ascend-backend/src/middleware/authenticate.
  // Without this fallback, any front-end fetch that fires before the SPA's
  // tokenStore is populated returns blanket 401 even though the user has a
  // valid SSO cookie ride-along via credentials:'include'.
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization format. Use: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
      });
    }
    if (parts[1]) token = parts[1];
  }

  if (!token && req.cookies?.cariara_sso) {
    token = req.cookies.cariara_sso;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    // Verify token
    const payload = jwt.verify(token, secret, {
      algorithms: [getJwtAlgorithm()],
    });

    // Check token type
    if (payload.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    // Get user ID from payload (cariara uses 'sub' as string)
    const userId = parseInt(payload.sub, 10);
    if (!userId) {
      return res.status(401).json({
        error: 'Invalid token payload',
        code: 'INVALID_TOKEN_PAYLOAD',
      });
    }

    // Attach user info to request
    req.user = {
      id: userId,
      email: payload.email,
      role: payload.role || 'user',
    };

    // Initialize user's Ascend data if needed
    try {
      await initUser(userId);
    } catch (err) {
      logger.warn({ error: err.message }, 'Failed to init user');
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error({ error: error.message }, 'JWT auth error');
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Optional JWT auth - attaches user if token present, but doesn't require it
 */
export async function optionalJwtAuth(req, res, next) {
  const secret = getJwtSecret();
  if (!secret) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];

      try {
        const payload = jwt.verify(token, secret, {
          algorithms: [getJwtAlgorithm()],
        });

        if (payload.type === 'access' && payload.sub) {
          const userId = parseInt(payload.sub, 10);
          req.user = {
            id: userId,
            email: payload.email,
            role: payload.role || 'user',
          };

          // Initialize user's Ascend data
          try {
            await initUser(userId);
          } catch (err) {
            // Ignore
          }
        }
      } catch (error) {
        // Silently continue without user
        logger.debug({ error: error.message }, 'Optional auth failed');
      }
    }
  }

  next();
}

/**
 * Verify JWT token and return decoded payload
 * Returns user object with id, email, role or throws error
 */
export async function verifyJWT(token) {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET_KEY not configured');
  }

  const payload = jwt.verify(token, secret, {
    algorithms: [getJwtAlgorithm()],
  });

  if (payload.type !== 'access' || !payload.sub) {
    throw new Error('Invalid token payload');
  }

  const userId = parseInt(payload.sub, 10);
  return {
    id: userId,
    email: payload.email,
    role: payload.role || 'user',
  };
}

export default jwtAuth;
