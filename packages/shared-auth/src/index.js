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

const ALLOWED_TOKEN_TYPES = new Set(['access']);

export function verifyToken(token, { requireType = 'access' } = {}) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  const payload = jwt.verify(token, JWT_SECRET);
  // Enforce the token-type claim so a non-access token (e.g. a future refresh
  // token) can never satisfy an access gate. Default-on; pass requireType:null
  // to deliberately verify a token of a different/absent type.
  if (requireType && payload?.type !== requireType) {
    const err = new Error(`Invalid token type: expected "${requireType}"`);
    err.name = 'InvalidTokenTypeError';
    err.code = 'INVALID_TOKEN_TYPE';
    throw err;
  }
  return payload;
}

export function createToken(payload = {}, expiresIn = '30d') {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  // Every minted token must carry a known type claim. Default to 'access'
  // (the only type currently issued); reject anything off the allowlist so a
  // typo'd type can't mint a token no gate will ever accept.
  const type = payload.type ?? 'access';
  if (!ALLOWED_TOKEN_TYPES.has(type)) {
    throw new Error(`createToken: disallowed token type "${type}"`);
  }
  return jwt.sign({ ...payload, type }, JWT_SECRET, { expiresIn });
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
