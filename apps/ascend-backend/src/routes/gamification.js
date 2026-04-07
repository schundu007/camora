import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import * as gamification from '../services/gamificationService.js';

const router = Router();

router.get('/profile', jwtAuth, async (req, res) => {
  const profile = await gamification.getProfile(req.user.id);
  res.json(profile);
});

router.get('/badges', jwtAuth, async (req, res) => {
  const badges = await gamification.getBadges(req.user.id);
  res.json({ badges });
});

router.get('/leaderboard', jwtAuth, async (req, res) => {
  const leaderboard = await gamification.getLeaderboard();
  res.json({ leaderboard });
});

export default router;
