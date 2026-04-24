import jwt from 'jsonwebtoken';

// Canonical name is JWT_SECRET. JWT_SECRET_KEY is a legacy alias from before
// the two backends were unified — still honored but will be dropped.
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET not set. Refusing to start — auth would silently break.');
}
if (!process.env.JWT_SECRET && process.env.JWT_SECRET_KEY) {
  console.warn('[shared-auth] Using deprecated JWT_SECRET_KEY — rename to JWT_SECRET.');
}

export function verifyToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.verify(token, JWT_SECRET);
}

export function createToken(payload, expiresIn = '30d') {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Express middleware: authenticate via Bearer token or cariara_sso cookie
 */
export function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // Fallback: check cariara_sso cookie
    if (!token && req.cookies?.cariara_sso) {
      token = req.cookies.cariara_sso;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || null,
      picture: payload.picture || null,
      source: 'jwt',
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Set SSO cookie on response
 */
export function setSSOCookie(res, token) {
  res.cookie('cariara_sso', token, {
    domain: '.cariara.com',
    path: '/',
    // httpOnly so JS-land XSS can't read the session token. Frontend receives
    // a short-lived access_token in the /auth/me response body for Bearer use.
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Clear SSO cookie on response
 */
export function clearSSOCookie(res) {
  res.clearCookie('cariara_sso', {
    domain: '.cariara.com',
    path: '/',
    secure: true,
    sameSite: 'lax',
  });
}
