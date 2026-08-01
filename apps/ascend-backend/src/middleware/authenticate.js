import { verifyToken, extractBearerToken } from '../lib/shared-auth.js';
import { query } from '../lib/shared-db.js';
import { logger } from './requestLogger.js';
import { initUser } from '../config/database.js';

const ADMIN_EMAILS = new Set(
  (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
);

/**
 * Try to verify JWT token and look up Ascend user
 */
async function tryJwtAuth(token) {
  try {
    const payload = verifyToken(token);

    if (payload.type === 'access' && payload.sub) {
      const userId = parseInt(payload.sub, 10);
      if (userId) {
        // Verify the account still exists (and is active) BEFORE anything
        // else. A JWT is valid for 30 days; without this check a user who
        // deleted or deactivated their account keeps full API access until
        // the token naturally expires. Note we deliberately do NOT call
        // initUser() first — that auto-provisions rows and would silently
        // resurrect a deleted account.
        const dbRow = await query(
          'SELECT is_admin, is_active FROM users WHERE id = $1',
          [userId],
        );
        const userRow = dbRow.rows[0];
        if (!userRow || userRow.is_active === false) {
          // Account gone or deactivated — reject the session.
          return { error: 'ACCOUNT_INACTIVE' };
        }

        await initUser(userId);

        // Read is_admin from DB — JWT never carries it (minted at OAuth time
        // without the field). Also check OWNER_EMAILS env as fallback so
        // Railway-configured emails work even before DB flag is set.
        const dbAdmin = userRow.is_admin === true;
        const emailAdmin = !!payload.email && ADMIN_EMAILS.has(payload.email.toLowerCase());

        // Forward name + picture from the JWT payload — Google OAuth mints
        // tokens with these fields, and the frontend's UserDropdown / Welcome
        // banner read them off req.user via the /me response. Dropping them
        // here was making the dropdown fall back to "Account" with no name.
        return {
          id: userId,
          email: payload.email,
          name: payload.name || null,
          picture: payload.picture || null,
          role: payload.role || 'user',
          is_admin: dbAdmin || emailAdmin,
          // gen is the JWT generation counter — /me checks it against the
          // DB column to detect revoked sessions. Undefined for legacy
          // tokens minted before generation tracking shipped.
          gen: payload.gen,
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
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    const jwtUser = await tryJwtAuth(bearerToken);

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

    if (jwtUser?.error === 'ACCOUNT_INACTIVE') {
      return res.status(401).json({
        error: 'Account no longer active. Please sign in again.',
        code: 'ACCOUNT_INACTIVE',
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

  // Check ?token= query param — ONLY for SSE handshakes. EventSource can't
  // send an Authorization header, so streaming endpoints fall back to the
  // token in the query string. But a URL-embedded JWT leaks into access
  // logs, Referer headers, and browser history, so we must NOT honor it on
  // ordinary routes. EventSource always sends `Accept: text/event-stream`;
  // gate the fallback on that so only genuine SSE requests can use it.
  const wantsEventStream = (req.headers.accept || '').includes('text/event-stream');
  if (!req.user && wantsEventStream && req.query?.token) {
    const jwtUser = await tryJwtAuth(req.query.token);
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

  // Gate on is_admin (resolved from DB / OWNER_EMAILS in tryJwtAuth). The JWT
  // never carries a 'role' claim, so role is always 'user' — checking
  // role === 'admin' rejected everyone, silently breaking this gate.
  if (req.user.is_admin !== true) {
    return res.status(403).json({
      error: 'Access denied. Admin privileges required.',
      code: 'FORBIDDEN',
    });
  }

  next();
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) {
    const jwtUser = await tryJwtAuth(bearerToken);
    if (jwtUser && !jwtUser.error) {
      req.user = jwtUser;
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
