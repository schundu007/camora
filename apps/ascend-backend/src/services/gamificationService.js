import { query } from '../lib/shared-db.js';

const XP_VALUES = {
  coding_solve: 10,
  system_design: 20,
  mock_interview: 50,
  company_prep: 15,
  daily_streak: 5,
  referral: 25,
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];

const BADGE_DEFINITIONS = [
  { key: 'first_solve', title: 'First Blood', desc: 'Solve your first problem', icon: 'zap', check: (s) => s.problems_solved >= 1 },
  { key: 'ten_solves', title: 'Problem Hunter', desc: 'Solve 10 problems', icon: 'target', check: (s) => s.problems_solved >= 10 },
  { key: 'fifty_solves', title: 'Code Warrior', desc: 'Solve 50 problems', icon: 'trophy', check: (s) => s.problems_solved >= 50 },
  { key: 'week_streak', title: 'On Fire', desc: '7-day practice streak', icon: 'flame', check: (s) => s.current_streak >= 7 },
  { key: 'month_streak', title: 'Unstoppable', desc: '30-day practice streak', icon: 'rocket', check: (s) => s.current_streak >= 30 },
  { key: 'system_design_5', title: 'Architect', desc: 'Complete 5 system designs', icon: 'layers', check: (s) => s.designs >= 5 },
  { key: 'system_design_master', title: 'System Design Master', desc: 'Complete 20 system designs', icon: 'server', check: (s) => s.designs >= 20 },
  { key: 'mock_interview_3', title: 'Interview Ready', desc: 'Complete 3 mock interviews', icon: 'mic', check: (s) => s.mocks >= 3 },
  { key: 'company_prep_5', title: 'Target Acquired', desc: 'Prepare for 5 companies', icon: 'briefcase', check: (s) => s.preps >= 5 },
  { key: 'referral_3', title: 'Community Builder', desc: 'Refer 3 friends', icon: 'users', check: (s) => s.referrals >= 3 },
];

function getLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getNextLevelXP(level) {
  return LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 5000;
}

export async function awardXP(userId, action) {
  const xp = XP_VALUES[action] || 0;
  if (xp === 0) return { xp: 0 };

  try {
    // Update XP
    await query(
      `INSERT INTO user_profiles (user_id, xp_points) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET xp_points = user_profiles.xp_points + $2`,
      [userId, xp]
    );

    // Get new total
    const result = await query('SELECT xp_points FROM user_profiles WHERE user_id = $1', [userId]);
    const totalXP = result.rows[0]?.xp_points || 0;
    const newLevel = getLevel(totalXP);

    // Update level
    await query('UPDATE user_profiles SET level = $1 WHERE user_id = $2', [newLevel, userId]);

    // Update weekly leaderboard
    const weekStart = getWeekStart();
    await query(
      `INSERT INTO ascend_weekly_leaderboard (user_id, week_start, xp_earned, problems_solved)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, week_start) DO UPDATE SET
         xp_earned = ascend_weekly_leaderboard.xp_earned + $3,
         problems_solved = ascend_weekly_leaderboard.problems_solved + $4`,
      [userId, weekStart, xp, action === 'coding_solve' ? 1 : 0]
    );

    // Check badges
    await checkAndAwardBadges(userId);

    return { xp, totalXP, level: newLevel };
  } catch (err) {
    console.error('[Gamification] awardXP error:', err.message);
    return { xp: 0 };
  }
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

async function checkAndAwardBadges(userId) {
  try {
    const profileResult = await query(
      'SELECT problems_solved, current_streak FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    const profile = profileResult.rows[0] || {};

    // Count designs, mocks, preps, referrals from various tables
    const [designsR, mocksR, prepsR, referralsR] = await Promise.all([
      query('SELECT COALESCE(design_used, 0) as cnt FROM ascend_free_usage WHERE user_id = $1', [userId]).catch(() => ({ rows: [{ cnt: 0 }] })),
      query('SELECT sessions_used as cnt FROM usage_tracking WHERE user_id = $1 ORDER BY period DESC LIMIT 1', [userId]).catch(() => ({ rows: [{ cnt: 0 }] })),
      query('SELECT COUNT(*) as cnt FROM ascend_company_preps WHERE user_id = $1', [userId]).catch(() => ({ rows: [{ cnt: 0 }] })),
      query("SELECT COUNT(*) as cnt FROM ascend_referrals WHERE referrer_id = $1 AND status = 'rewarded'", [userId]).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const stats = {
      problems_solved: profile.problems_solved || 0,
      current_streak: profile.current_streak || 0,
      designs: parseInt(designsR.rows[0]?.cnt || 0),
      mocks: parseInt(mocksR.rows[0]?.cnt || 0),
      preps: parseInt(prepsR.rows[0]?.cnt || 0),
      referrals: parseInt(referralsR.rows[0]?.cnt || 0),
    };

    // Get existing badges
    const existingResult = await query('SELECT badge_key FROM ascend_badges WHERE user_id = $1', [userId]);
    const existing = new Set(existingResult.rows.map(r => r.badge_key));

    // Award new badges
    for (const badge of BADGE_DEFINITIONS) {
      if (!existing.has(badge.key) && badge.check(stats)) {
        await query(
          'INSERT INTO ascend_badges (user_id, badge_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, badge.key]
        );
      }
    }
  } catch (err) {
    console.error('[Gamification] checkBadges error:', err.message);
  }
}

export async function getProfile(userId) {
  try {
    const result = await query(
      'SELECT xp_points, level, problems_solved, current_streak, longest_streak FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    const profile = result.rows[0] || { xp_points: 0, level: 1, problems_solved: 0, current_streak: 0, longest_streak: 0 };
    const nextLevelXP = getNextLevelXP(profile.level);
    const prevLevelXP = LEVEL_THRESHOLDS[profile.level - 1] || 0;

    return {
      xp: profile.xp_points,
      level: profile.level,
      nextLevelXP,
      prevLevelXP,
      progressPct: nextLevelXP > prevLevelXP ? Math.round(((profile.xp_points - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100) : 100,
      problems_solved: profile.problems_solved,
      current_streak: profile.current_streak,
      longest_streak: profile.longest_streak,
    };
  } catch {
    return { xp: 0, level: 1, nextLevelXP: 100, prevLevelXP: 0, progressPct: 0, problems_solved: 0, current_streak: 0, longest_streak: 0 };
  }
}

export async function getBadges(userId) {
  try {
    const result = await query('SELECT badge_key, earned_at FROM ascend_badges WHERE user_id = $1 ORDER BY earned_at DESC', [userId]);
    const earned = new Set(result.rows.map(r => r.badge_key));
    return BADGE_DEFINITIONS.map(b => ({
      ...b,
      earned: earned.has(b.key),
      earned_at: result.rows.find(r => r.badge_key === b.key)?.earned_at || null,
    }));
  } catch {
    return BADGE_DEFINITIONS.map(b => ({ ...b, earned: false, earned_at: null }));
  }
}

export async function getLeaderboard() {
  try {
    const weekStart = getWeekStart();
    const result = await query(
      `SELECT l.user_id, l.xp_earned, l.problems_solved, u.name, u.avatar
       FROM ascend_weekly_leaderboard l JOIN users u ON l.user_id = u.id
       WHERE l.week_start = $1 ORDER BY l.xp_earned DESC LIMIT 20`,
      [weekStart]
    );
    return result.rows.map((r, i) => ({ rank: i + 1, ...r }));
  } catch {
    return [];
  }
}

export { BADGE_DEFINITIONS, XP_VALUES, LEVEL_THRESHOLDS };
