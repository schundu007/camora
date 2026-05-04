/**
 * Auth routes — migrated from Python FastAPI (app/api/v1/auth.py).
 *
 * Endpoints:
 *   POST   /sync           — create/update user from OAuth, return JWT
 *   GET    /me             — current user info
 *   POST   /refresh        — refresh JWT
 *   GET    /profile/resume — get resume text
 *   PUT    /profile/resume — update resume text
 *   GET    /profile/stats  — user engagement stats
 *   GET    /profile        — full profile (user + profile table)
 *   PUT    /profile        — update bio / social links
 */
import { Router } from 'express';
import { createToken } from '../lib/shared-auth.js';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: format a user row into the standard response shape
// ---------------------------------------------------------------------------
function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    image: user.image || user.picture || null,
    provider: user.provider,
    is_active: user.is_active ?? true,
    is_admin: user.is_admin ?? false,
    onboarding_completed: user.onboarding_completed ?? false,
    job_roles: user.job_roles || null,
    created_at: user.created_at,
  };
}

// ---------------------------------------------------------------------------
// Helper: get-or-create user_profiles row
// ---------------------------------------------------------------------------
async function getOrCreateProfile(userId) {
  let result = await query(
    'SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1',
    [userId],
  );

  if (result.rows.length === 0) {
    // Insert with ON CONFLICT to handle race conditions
    result = await query(
      `INSERT INTO user_profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [userId],
    );
  }

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// POST /sync — DISABLED (CRITICAL auth-bypass).
//
// The previous implementation accepted arbitrary { email, provider,
// provider_id } from request body and minted a 30-day Bearer JWT for
// the matching user — without ever verifying the OAuth credential.
// Any caller who knew a victim's Google `sub` could request a token
// for that account.
//
// CLAUDE.md states ascend-backend (apps/ascend-backend/src/routes/auth.js)
// is the canonical OAuth host. The lumora-backend `/sync` legacy path
// has no remaining valid use case in production. Returning 410 Gone
// fails loudly so any caller still wired to this path notices and
// switches to the ascend OAuth flow.
//
// For local dev where you want a non-OAuth account, mint tokens via
// the ascend-backend dev flow or directly via createToken() in a
// scripted seed — never via an unauthenticated route.
// ---------------------------------------------------------------------------
router.post('/sync', (req, res) => {
  return res.status(410).json({
    error: 'Endpoint removed. Authenticate via ascend-backend OAuth flow.',
    code: 'AUTH_SYNC_REMOVED',
  });
});

// ---------------------------------------------------------------------------
// GET /me — current authenticated user info. Now also returns a fresh short-lived
// access_token so SPAs can drop cookie access entirely (cookie stays httpOnly).
// Token is regenerated on each call so the session-cookie remains the source of
// truth for the 30-day lifetime.
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = formatUserResponse(req.user);
    // type:'access' is required by the ascend backend's authenticate middleware
    // (`payload.type === 'access'` strict check). Without it, a token minted
    // here would auth on lumora but get 401 when used to call ascend endpoints
    // like /api/onboarding/status.
    // Carry req.user.gen forward — req.user is set by the authenticate
    // middleware which already verified the incoming JWT, including
    // its gen claim. Forwarding gen lets ascend's /me reject the
    // re-issued token if revoke-all-sessions ran in between.
    const accessToken = createToken({
      sub: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      type: 'access',
      ...(req.user.gen !== undefined ? { gen: req.user.gen } : {}),
    }, '24h');
    return res.json({ ...user, access_token: accessToken });
  } catch (err) {
    console.error('GET /me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /refresh — refresh JWT
// ---------------------------------------------------------------------------
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const token = createToken({ sub: req.user.id, email: req.user.email, type: 'access' });
    return res.json({
      access_token: token,
      token_type: 'bearer',
    });
  } catch (err) {
    console.error('POST /refresh error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /profile/resume — get user resume & technical context
// ---------------------------------------------------------------------------
router.get('/profile/resume', authenticate, async (req, res) => {
  try {
    return res.json({
      resume_text: req.user.resume_text || '',
      technical_context: req.user.technical_context || '',
    });
  } catch (err) {
    console.error('GET /profile/resume error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /profile/resume — update resume & technical context
// ---------------------------------------------------------------------------
router.put('/profile/resume', authenticate, async (req, res) => {
  try {
    const { resume_text, technical_context } = req.body;

    const sets = [];
    const params = [];
    let idx = 1;

    if (resume_text !== undefined) {
      sets.push(`resume_text = $${idx++}`);
      params.push(resume_text);
    }
    if (technical_context !== undefined) {
      sets.push(`technical_context = $${idx++}`);
      params.push(technical_context);
    }

    if (sets.length === 0) {
      return res.json({
        resume_text: req.user.resume_text || '',
        technical_context: req.user.technical_context || '',
      });
    }

    params.push(req.user.id);
    const result = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    const user = result.rows[0];

    return res.json({
      resume_text: user.resume_text || '',
      technical_context: user.technical_context || '',
    });
  } catch (err) {
    console.error('PUT /profile/resume error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /profile/stats — user engagement stats
// ---------------------------------------------------------------------------
router.get('/profile/stats', authenticate, async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.id);

    const bmResult = await query(
      'SELECT COUNT(*) AS count FROM lumora_bookmarks WHERE user_id = $1',
      [req.user.id],
    );
    const cmResult = await query(
      'SELECT COUNT(*) AS count FROM lumora_completion_marks WHERE user_id = $1',
      [req.user.id],
    );

    return res.json({
      questions_asked: profile.questions_asked || 0,
      problems_solved: profile.problems_solved || 0,
      current_streak: profile.current_streak || 0,
      longest_streak: profile.longest_streak || 0,
      bookmarks_count: parseInt(bmResult.rows[0].count, 10) || 0,
      completed_count: parseInt(cmResult.rows[0].count, 10) || 0,
    });
  } catch (err) {
    console.error('GET /profile/stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /profile — full user profile (user + profile table merged)
// ---------------------------------------------------------------------------
router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.id);

    return res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name || null,
      image: req.user.image || null,
      provider: req.user.provider,
      is_admin: req.user.is_admin ?? false,
      bio: profile.bio || null,
      linkedin_url: profile.linkedin_url || null,
      github_url: profile.github_url || null,
      youtube_url: profile.youtube_url || null,
      questions_asked: profile.questions_asked || 0,
      problems_solved: profile.problems_solved || 0,
      current_streak: profile.current_streak || 0,
      longest_streak: profile.longest_streak || 0,
      created_at: req.user.created_at,
    });
  } catch (err) {
    console.error('GET /profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /profile — update bio & social links
// ---------------------------------------------------------------------------
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { bio, linkedin_url, github_url, youtube_url } = req.body;
    const profile = await getOrCreateProfile(req.user.id);

    const sets = [];
    const params = [];
    let idx = 1;

    if (bio !== undefined) {
      sets.push(`bio = $${idx++}`);
      params.push(bio);
    }
    if (linkedin_url !== undefined) {
      sets.push(`linkedin_url = $${idx++}`);
      params.push(linkedin_url);
    }
    if (github_url !== undefined) {
      sets.push(`github_url = $${idx++}`);
      params.push(github_url);
    }
    if (youtube_url !== undefined) {
      sets.push(`youtube_url = $${idx++}`);
      params.push(youtube_url);
    }

    let updatedProfile = profile;
    if (sets.length > 0) {
      params.push(req.user.id);
      const result = await query(
        `UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING *`,
        params,
      );
      updatedProfile = result.rows[0];
    }

    return res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name || null,
      image: req.user.image || null,
      provider: req.user.provider,
      is_admin: req.user.is_admin ?? false,
      bio: updatedProfile.bio || null,
      linkedin_url: updatedProfile.linkedin_url || null,
      github_url: updatedProfile.github_url || null,
      youtube_url: updatedProfile.youtube_url || null,
      questions_asked: updatedProfile.questions_asked || 0,
      problems_solved: updatedProfile.problems_solved || 0,
      current_streak: updatedProfile.current_streak || 0,
      longest_streak: updatedProfile.longest_streak || 0,
      created_at: req.user.created_at,
    });
  } catch (err) {
    console.error('PUT /profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
