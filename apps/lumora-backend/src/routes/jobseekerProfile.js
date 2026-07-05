/**
 * Job-seeker profile API — /api/v1/jobsearch/profile
 *
 * Per-user structured candidate profile that powers tailored CV/cover-letter
 * generation and application autofill (assisted-apply feature).
 *
 * GET  /  → { profile: <row|null> }   the current user's profile
 * PUT  /  → { profile: <row> }        create/replace the current user's profile
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getProfile, upsertProfile } from '../services/jobSeekerProfileDb.js';

const router = Router();

// All routes require authentication (also enforced at the mount point).
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json({ profile });
  } catch (err) {
    console.error('GET /jobsearch/profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/', async (req, res) => {
  try {
    const profile = await upsertProfile(req.user.id, req.body || {});
    res.json({ profile });
  } catch (err) {
    console.error('PUT /jobsearch/profile error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

export default router;
