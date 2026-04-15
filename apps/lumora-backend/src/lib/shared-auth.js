import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

/**
 * Verify a JWT token (works for both Lumora and Ascend tokens)
 */
export function verifyToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Create a JWT token
 */
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
  // TODO: httpOnly should be true but frontend reads cookie via document.cookie — needs refactor
  res.cookie('cariara_sso', token, {
    domain: '.cariara.com',
    path: '/',
    httpOnly: false,
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
