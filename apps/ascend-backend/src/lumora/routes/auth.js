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
// POST /sync — create or update user from OAuth data, return JWT
// ---------------------------------------------------------------------------
router.post('/sync', async (req, res) => {
  try {
    const { email, name, image, provider, provider_id } = req.body;

    if (!email || !provider || !provider_id) {
      return res.status(400).json({ error: 'email, provider, and provider_id are required' });
    }

    // Check if user exists by provider + provider_id
    let result = await query(
      'SELECT * FROM users WHERE provider = $1 AND provider_id = $2 LIMIT 1',
      [provider, provider_id],
    );
    let user = result.rows[0];

    if (!user) {
      // Check if email exists with a different provider
      result = await query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        [email],
      );
      const existing = result.rows[0];

      if (existing) {
        // Allow reusing dev accounts with different provider_id
        if (provider === 'dev' && existing.provider === 'dev') {
          result = await query(
            `UPDATE users SET provider_id = $1, name = $2 WHERE id = $3 RETURNING *`,
            [provider_id, name || existing.name, existing.id],
          );
          user = result.rows[0];
        } else {
          return res.status(409).json({
            error: `Email already registered with provider: ${existing.provider}`,
          });
        }
      } else {
        // Create new user
        result = await query(
          `INSERT INTO users (email, name, image, provider, provider_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [email, name || null, image || null, provider, provider_id],
        );
        user = result.rows[0];
      }
    } else {
      // Update existing user
      result = await query(
        `UPDATE users SET name = $1, image = $2 WHERE id = $3 RETURNING *`,
        [name || user.name, image || user.image, user.id],
      );
      user = result.rows[0];
    }

    // Generate JWT — include `type: 'access'` so the ascend authenticate
    // middleware (which strictly checks `payload.type === 'access'`) accepts
    // this token on cross-service requests.
    const token = createToken({ sub: user.id, email: user.email, type: 'access' });

    return res.json({
      access_token: token,
      token_type: 'bearer',
      user: formatUserResponse(user),
    });
  } catch (err) {
    console.error('POST /sync error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
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
    const accessToken = createToken({
      sub: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      type: 'access',
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
