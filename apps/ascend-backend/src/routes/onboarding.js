import { Router } from 'express';
import multer from 'multer';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Idempotent migration — runs on startup
query(`
  CREATE TABLE IF NOT EXISTS user_resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    resume_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('user_resumes migration error:', err));

// List all resumes for the current user (metadata only — no text)
router.get('/resumes', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, filename, is_active, uploaded_at FROM user_resumes WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List resumes error:', error);
    res.status(500).json({ error: 'Failed to list resumes' });
  }
});

// Upload resume file — insert into user_resumes (active), sync users.resume_text
router.post('/upload-resume', authenticate, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { originalname, buffer, mimetype } = req.file;
    let text = '';

    if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length < 50) text = `[PDF uploaded: ${originalname}]`;
    } else {
      text = `[Document uploaded: ${originalname}]`;
    }

    await query('UPDATE user_resumes SET is_active = false WHERE user_id = $1', [req.user.id]);
    const insertResult = await query(
      'INSERT INTO user_resumes (user_id, filename, resume_text, is_active) VALUES ($1, $2, $3, true) RETURNING id',
      [req.user.id, originalname, text]
    );
    await query('UPDATE users SET resume_text = $1 WHERE id = $2', [text, req.user.id]);

    res.json({
      success: true,
      filename: originalname,
      size: req.file.size,
      extracted_length: text.length,
      text,
      resume_id: insertResult.rows[0].id,
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Get onboarding status — has_resume derived from user_resumes count
router.get('/status', authenticate, async (req, res) => {
  try {
    const [userResult, countResult] = await Promise.all([
      query('SELECT onboarding_completed, job_roles, resume_text FROM users WHERE id = $1', [req.user.id]),
      query('SELECT COUNT(*) FROM user_resumes WHERE user_id = $1', [req.user.id]),
    ]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const row = userResult.rows[0];
    const hasResume = parseInt(countResult.rows[0].count, 10) > 0;
    res.json({
      onboarding_completed: row.onboarding_completed || false,
      job_roles: row.job_roles || [],
      has_resume: hasResume,
      resume_snippet: row.resume_text ? row.resume_text.slice(0, 200) : null,
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// Save pasted resume text — insert into user_resumes (active), sync users.resume_text
router.post('/save-resume-text', authenticate, async (req, res) => {
  try {
    const { resume_text } = req.body;
    if (!resume_text || !String(resume_text).trim()) return res.status(400).json({ error: 'Resume text is required' });
    const text = String(resume_text).trim();
    const filename = `Pasted text — ${new Date().toISOString().slice(0, 10)}`;
    await query('UPDATE user_resumes SET is_active = false WHERE user_id = $1', [req.user.id]);
    const insertResult = await query(
      'INSERT INTO user_resumes (user_id, filename, resume_text, is_active) VALUES ($1, $2, $3, true) RETURNING id',
      [req.user.id, filename, text]
    );
    await query('UPDATE users SET resume_text = $1 WHERE id = $2', [text, req.user.id]);
    res.json({ success: true, resume_id: insertResult.rows[0].id, filename });
  } catch (error) {
    console.error('Save resume text error:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Activate a specific resume by ID
router.post('/resumes/:id/activate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const owned = await query(
      'SELECT id, resume_text FROM user_resumes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Resume not found' });
    await query('UPDATE user_resumes SET is_active = false WHERE user_id = $1', [req.user.id]);
    await query('UPDATE user_resumes SET is_active = true WHERE id = $1', [id]);
    await query('UPDATE users SET resume_text = $1 WHERE id = $2', [owned.rows[0].resume_text, req.user.id]);
    res.json({ success: true, id: parseInt(id, 10) });
  } catch (error) {
    console.error('Activate resume error:', error);
    res.status(500).json({ error: 'Failed to activate resume' });
  }
});

// Delete a specific resume by ID; promote next-most-recent if it was active
router.delete('/resumes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const owned = await query(
      'SELECT id, is_active FROM user_resumes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (owned.rows.length === 0) return res.status(404).json({ error: 'Resume not found' });
    const wasActive = owned.rows[0].is_active;
    await query('DELETE FROM user_resumes WHERE id = $1', [id]);
    if (wasActive) {
      const next = await query(
        'SELECT id, resume_text FROM user_resumes WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1',
        [req.user.id]
      );
      if (next.rows.length > 0) {
        await query('UPDATE user_resumes SET is_active = true WHERE id = $1', [next.rows[0].id]);
        await query('UPDATE users SET resume_text = $1 WHERE id = $2', [next.rows[0].resume_text, req.user.id]);
      } else {
        await query('UPDATE users SET resume_text = NULL WHERE id = $1', [req.user.id]);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Delete ALL resumes for user
router.delete('/resume', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM user_resumes WHERE user_id = $1', [req.user.id]);
    await query('UPDATE users SET resume_text = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Update job roles post-onboarding
router.post('/update-roles', authenticate, async (req, res) => {
  try {
    const { job_roles } = req.body;
    if (!job_roles || !Array.isArray(job_roles) || job_roles.length === 0) {
      return res.status(400).json({ error: 'At least one job role is required' });
    }
    await query('UPDATE users SET job_roles = $1 WHERE id = $2', [JSON.stringify(job_roles), req.user.id]);
    res.json({ success: true, job_roles });
  } catch (error) {
    console.error('Update roles error:', error);
    res.status(500).json({ error: 'Failed to update roles' });
  }
});

// Save partial progress — roles only, without marking onboarding complete.
router.post('/save-progress', authenticate, async (req, res) => {
  try {
    const { job_roles } = req.body;
    if (!job_roles || !Array.isArray(job_roles) || job_roles.length === 0) {
      return res.status(400).json({ error: 'At least one job role is required' });
    }
    await query('UPDATE users SET job_roles = $1 WHERE id = $2', [JSON.stringify(job_roles), req.user.id]);
    res.json({ success: true, job_roles });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Complete onboarding
router.post('/complete', authenticate, async (req, res) => {
  try {
    const { job_roles, resume_text, technical_context } = req.body;
    if (!job_roles || !Array.isArray(job_roles) || job_roles.length === 0) {
      return res.status(400).json({ error: 'At least one job role is required' });
    }
    await query(
      `UPDATE users SET onboarding_completed = true, job_roles = $1, resume_text = $2, technical_context = $3 WHERE id = $4`,
      [JSON.stringify(job_roles), resume_text || null, technical_context || null, req.user.id]
    );
    if (resume_text) {
      await query('UPDATE user_resumes SET is_active = false WHERE user_id = $1', [req.user.id]);
      await query(
        'INSERT INTO user_resumes (user_id, filename, resume_text, is_active) VALUES ($1, $2, $3, true)',
        [req.user.id, 'Initial resume', resume_text]
      );
    }
    res.json({ success: true, onboarding_completed: true, job_roles });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
