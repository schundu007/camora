import { Router } from 'express';
import multer from 'multer';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Upload resume file — extract text and store
router.post('/upload-resume', authenticate, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;
    let text = '';

    if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      // For PDF, store raw text extraction (basic)
      text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length < 50) {
        text = `[PDF uploaded: ${originalname}]`;
      }
    } else {
      // .docx and other formats — store filename as reference
      text = `[Document uploaded: ${originalname}]`;
    }

    // Save to user's resume_text
    await query(
      'UPDATE users SET resume_text = $1 WHERE id = $2',
      [text, req.user.id]
    );

    res.json({
      success: true,
      filename: originalname,
      size: req.file.size,
      extracted_length: text.length,
      // Frontend (OnboardingPage.jsx) reads `text` to populate the
      // textarea that feeds POST /api/onboarding/complete. Without
      // this, resume_text is sent empty on submit and every downstream
      // AI prep call gets generic, role-blind output.
      text,
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Get onboarding status (includes resume presence for profile page)
router.get('/status', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT onboarding_completed, job_roles, resume_text FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const row = result.rows[0];
    res.json({
      onboarding_completed: row.onboarding_completed || false,
      job_roles: row.job_roles || [],
      has_resume: !!row.resume_text,
      resume_snippet: row.resume_text ? row.resume_text.slice(0, 200) : null,
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// Save pasted resume text post-onboarding (used by profile page)
router.post('/save-resume-text', authenticate, async (req, res) => {
  try {
    const { resume_text } = req.body;
    if (!resume_text || !String(resume_text).trim()) {
      return res.status(400).json({ error: 'Resume text is required' });
    }
    await query('UPDATE users SET resume_text = $1 WHERE id = $2', [String(resume_text).trim(), req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Save resume text error:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Update job roles post-onboarding (used by profile page)
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

// Complete onboarding
router.post('/complete', authenticate, async (req, res) => {
  try {
    const { job_roles, resume_text, technical_context } = req.body;

    if (!job_roles || !Array.isArray(job_roles) || job_roles.length === 0) {
      return res.status(400).json({ error: 'At least one job role is required' });
    }

    await query(
      `UPDATE users SET
        onboarding_completed = true,
        job_roles = $1,
        resume_text = $2,
        technical_context = $3
      WHERE id = $4`,
      [JSON.stringify(job_roles), resume_text || null, technical_context || null, req.user.id]
    );

    res.json({
      success: true,
      onboarding_completed: true,
      job_roles,
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
