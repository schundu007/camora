/**
 * Resume tailoring API — POST /api/v1/jobsearch/tailor
 *
 * Tailors the user's base resume to a job description using real Claude
 * (Anthropic) and returns structured content. The frontend renders the DOCX.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { tailorResume } from '../services/resumeTailor.js';

const router = Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const { resume, jobDescription, company, role } = req.body || {};
  if (!resume || !String(resume).trim()) {
    return res.status(400).json({ error: 'Your job profile / resume is empty — fill it in first.' });
  }
  if (!jobDescription || !String(jobDescription).trim()) {
    return res.status(400).json({ error: 'A job description is required.' });
  }
  try {
    const data = await tailorResume({ resume, jobDescription, company, role });
    res.json(data);
  } catch (err) {
    console.error('POST /jobsearch/tailor error:', err);
    res.status(500).json({ error: 'Tailoring failed — please try again.' });
  }
});

export default router;
