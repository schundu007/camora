import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';

const router = Router();

function generatePrepPlan(totalDays, targetCompany, targetRole) {
  const days = [];
  for (let d = 1; d <= totalDays; d++) {
    const pct = d / totalDays;
    let focus, tasks;

    if (pct <= 0.3) {
      focus = 'DSA Fundamentals';
      tasks = [
        { id: `day${d}_t1`, title: 'Solve 2 array/string problems', category: 'coding', link: '/capra/practice' },
        { id: `day${d}_t2`, title: 'Review 1 data structure topic', category: 'coding', link: '/capra/prepare?page=coding' },
        { id: `day${d}_t3`, title: 'Practice time complexity analysis', category: 'coding', link: '/capra/prepare?page=coding' },
      ];
    } else if (pct <= 0.6) {
      focus = 'System Design';
      tasks = [
        { id: `day${d}_t1`, title: 'Study 1 system design topic', category: 'system-design', link: '/capra/prepare?page=system-design' },
        { id: `day${d}_t2`, title: 'Practice 1 design problem', category: 'system-design', link: '/capra/practice' },
        { id: `day${d}_t3`, title: 'Solve 1 coding problem', category: 'coding', link: '/capra/practice' },
      ];
    } else if (pct <= 0.85) {
      focus = targetCompany ? `${targetCompany} Prep` : 'Company-Specific Prep';
      tasks = [
        { id: `day${d}_t1`, title: 'Practice 1 behavioral question (STAR)', category: 'behavioral', link: '/capra/prepare?page=behavioral' },
        { id: `day${d}_t2`, title: targetCompany ? `Review ${targetCompany} interview patterns` : 'Review target company culture', category: 'behavioral', link: '/capra/prepare?page=behavioral' },
        { id: `day${d}_t3`, title: 'Solve 1 medium/hard coding problem', category: 'coding', link: '/capra/practice' },
      ];
    } else {
      focus = 'Mock Interviews & Review';
      tasks = [
        { id: `day${d}_t1`, title: 'Do a full mock interview', category: 'mock', link: '/lumora' },
        { id: `day${d}_t2`, title: 'Review weak areas from practice', category: 'review', link: '/capra/prepare' },
        { id: `day${d}_t3`, title: 'Practice explaining your approach out loud', category: 'behavioral', link: '/lumora' },
      ];
    }

    days.push({ day: d, focus, tasks });
  }
  return { days, totalDays };
}

// POST /setup — set interview date, generate plan
router.post('/setup', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { interview_date, target_company, target_role } = req.body;
    if (!interview_date) return res.status(400).json({ error: 'interview_date required' });

    const interviewDate = new Date(interview_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.ceil((interviewDate - today) / (1000 * 60 * 60 * 24)));

    // Update user
    await query(
      'UPDATE users SET interview_date = $1, target_company = $2, target_role = $3 WHERE id = $4',
      [interview_date, target_company || null, target_role || null, userId]
    );

    // Generate plan
    const planData = generatePrepPlan(totalDays, target_company, target_role);

    await query(
      `INSERT INTO ascend_prep_plans (user_id, interview_date, target_company, target_role, plan_data, total_days)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         interview_date = $2, target_company = $3, target_role = $4,
         plan_data = $5, total_days = $6, updated_at = NOW()`,
      [userId, interview_date, target_company || null, target_role || null, JSON.stringify(planData), totalDays]
    );

    res.json({ success: true, plan: planData, days_remaining: totalDays });
  } catch (err) {
    console.error('[InterviewCountdown] Setup error:', err.message);
    res.status(500).json({ error: 'Failed to set up interview countdown' });
  }
});

// GET /plan — get current plan + progress
router.get('/plan', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const planResult = await query(
      'SELECT * FROM ascend_prep_plans WHERE user_id = $1',
      [userId]
    );
    if (planResult.rows.length === 0) return res.json({ plan: null });

    const plan = planResult.rows[0];
    const progressResult = await query(
      'SELECT task_id, completed, completed_at FROM ascend_prep_progress WHERE user_id = $1 AND plan_id = $2',
      [userId, plan.id]
    );

    const completedTasks = progressResult.rows.filter(r => r.completed).length;
    const totalTasks = plan.plan_data.days.reduce((sum, d) => sum + d.tasks.length, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const interviewDate = new Date(plan.interview_date);
    const daysRemaining = Math.max(0, Math.ceil((interviewDate - today) / (1000 * 60 * 60 * 24)));

    res.json({
      plan: plan.plan_data,
      interview_date: plan.interview_date,
      target_company: plan.target_company,
      target_role: plan.target_role,
      days_remaining: daysRemaining,
      completion_pct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      completed_tasks: completedTasks,
      total_tasks: totalTasks,
      progress: progressResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// PUT /progress — mark task complete
router.put('/progress', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { task_id } = req.body;
    if (!task_id) return res.status(400).json({ error: 'task_id required' });

    const planResult = await query('SELECT id FROM ascend_prep_plans WHERE user_id = $1', [userId]);
    if (planResult.rows.length === 0) return res.status(404).json({ error: 'No plan found' });

    const planId = planResult.rows[0].id;
    await query(
      `INSERT INTO ascend_prep_progress (user_id, plan_id, task_id, completed, completed_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (user_id, plan_id, task_id) DO UPDATE SET completed = true, completed_at = NOW()`,
      [userId, planId, task_id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// GET /countdown — lightweight widget data
router.get('/countdown', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      'SELECT interview_date, target_company, target_role FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user?.interview_date) return res.json({ has_interview: false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const interviewDate = new Date(user.interview_date);
    const daysRemaining = Math.max(0, Math.ceil((interviewDate - today) / (1000 * 60 * 60 * 24)));

    // Get completion %
    const planResult = await query('SELECT id, plan_data FROM ascend_prep_plans WHERE user_id = $1', [userId]);
    let completionPct = 0;
    if (planResult.rows.length > 0) {
      const plan = planResult.rows[0];
      const totalTasks = plan.plan_data.days.reduce((sum, d) => sum + d.tasks.length, 0);
      const progressResult = await query(
        'SELECT COUNT(*) as cnt FROM ascend_prep_progress WHERE user_id = $1 AND plan_id = $2 AND completed = true',
        [userId, plan.id]
      );
      const completed = parseInt(progressResult.rows[0].cnt);
      completionPct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
    }

    res.json({
      has_interview: true,
      interview_date: user.interview_date,
      target_company: user.target_company,
      target_role: user.target_role,
      days_remaining: daysRemaining,
      completion_pct: completionPct,
    });
  } catch (err) {
    res.json({ has_interview: false });
  }
});

// DELETE /plan — clear countdown
router.delete('/plan', jwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    await query('DELETE FROM ascend_prep_progress WHERE user_id = $1', [userId]);
    await query('DELETE FROM ascend_prep_plans WHERE user_id = $1', [userId]);
    await query('UPDATE users SET interview_date = NULL, target_company = NULL, target_role = NULL WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear plan' });
  }
});

export default router;
