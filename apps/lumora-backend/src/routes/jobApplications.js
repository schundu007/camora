/**
 * Job application tracker API — /api/v1/jobsearch/applications
 *
 * CRUD over a user's tracked applications (status='saved' … 'offer'/'rejected').
 *
 * GET    /       → { applications: [...] }
 * POST   /       → { application }      create (used by "Save"/"Track this")
 * GET    /:id    → { application }
 * PATCH  /:id    → { application }      partial update (e.g. status change)
 * DELETE /:id    → 204
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  APPLICATION_STATUSES,
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../services/jobApplicationsDb.js';

const router = Router();
router.use(authenticate);

/** Reject an out-of-range status early so the DB CHECK constraint isn't hit. */
function invalidStatus(body) {
  return (
    body.status !== undefined &&
    body.status !== null &&
    !APPLICATION_STATUSES.includes(body.status)
  );
}

router.get('/', async (req, res) => {
  try {
    const applications = await listApplications(req.user.id);
    res.json({ applications });
  } catch (err) {
    console.error('GET /jobsearch/applications error:', err);
    res.status(500).json({ error: 'Failed to list applications' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  if (invalidStatus(body)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}` });
  }
  try {
    const application = await createApplication(req.user.id, body);
    res.status(201).json({ application });
  } catch (err) {
    console.error('POST /jobsearch/applications error:', err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const application = await getApplication(req.user.id, req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json({ application });
  } catch (err) {
    console.error('GET /jobsearch/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to load application' });
  }
});

router.patch('/:id', async (req, res) => {
  const body = req.body || {};
  if (invalidStatus(body)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${APPLICATION_STATUSES.join(', ')}` });
  }
  try {
    const application = await updateApplication(req.user.id, req.params.id, body);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json({ application });
  } catch (err) {
    console.error('PATCH /jobsearch/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const removed = await deleteApplication(req.user.id, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Application not found' });
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /jobsearch/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;
