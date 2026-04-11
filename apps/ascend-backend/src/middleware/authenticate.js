import { verifyToken } from '../lib/shared-auth.js';
import { query } from '../lib/shared-db.js';
import { logger } from './requestLogger.js';
import { initUser } from '../config/database.js';

/**
 * Try to verify JWT token and look up Ascend user
 */
async function tryJwtAuth(token) {
  try {
    const payload = verifyToken(token);

    if (payload.type === 'access' && payload.sub) {
      const userId = parseInt(payload.sub, 10);
      if (userId) {
        await initUser(userId);

        return {
          id: userId,
          email: payload.email,
          role: payload.role || 'user',
          source: 'jwt',
        };
      }
    }
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'TOKEN_EXPIRED' };
    }
    // JWT verification failed silently
  }
  return null;
}

/**
 * Authentication middleware
 * Supports JWT tokens (Cariara OAuth) via shared-auth.
 * Electron device ID auth has been removed — webapp-only.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // Try JWT authentication (webapp users)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const jwtUser = await tryJwtAuth(token);

    if (jwtUser && !jwtUser.error) {
      req.user = jwtUser;
      return next();
    }

    if (jwtUser?.error === 'TOKEN_EXPIRED') {
      return res.status(401).json({
        error: 'Token expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
  }

  // Also check cariara_sso cookie as fallback
  if (!req.user && req.cookies?.cariara_sso) {
    const jwtUser = await tryJwtAuth(req.cookies.cariara_sso);
    if (jwtUser && !jwtUser.error) {
      req.user = jwtUser;
      return next();
    }
  }

  // No valid authentication found
  return res.status(401).json({
    error: 'Authentication required. Please sign in.',
    code: 'AUTH_REQUIRED',
  });
}

/**
 * Require admin role middleware
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied. Admin role required.',
      code: 'FORBIDDEN',
    });
  }

  next();
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const jwtUser = await tryJwtAuth(parts[1]);
      if (jwtUser && !jwtUser.error) {
        req.user = jwtUser;
      }
    }
  }

  // Also check cookie
  if (!req.user && req.cookies?.cariara_sso) {
    const jwtUser = await tryJwtAuth(req.cookies.cariara_sso);
    if (jwtUser && !jwtUser.error) {
      req.user = jwtUser;
    }
  }

  next();
}
