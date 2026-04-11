/**
 * Speaker verification proxy routes.
 *
 * These endpoints forward audio/enrollment requests to the Python ai-services
 * microservice which runs resemblyzer for speaker embeddings.
 *
 * POST   /enroll  – enroll a user voice (multipart audio file)
 * DELETE /enroll  – unenroll a user
 * GET    /status  – check whether a user is enrolled
 */
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { proxyToAIService } from '../services/aiServiceProxy.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// All speaker routes require authentication
router.use(authenticate);

/**
 * POST /enroll
 * Forward the uploaded audio file to ai-services for voice enrollment.
 */
router.post('/enroll', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required (field name: "audio")' });
    }

    // Reconstruct multipart form data for the upstream service
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    formData.append('audio', blob, req.file.originalname || 'enrollment.webm');
    formData.append('user_id', String(req.user.id));

    let upstream;
    try {
      upstream = await proxyToAIService('/speaker/enroll', {
        method: 'POST',
        body: formData,
      });
    } catch (proxyErr) {
      console.error('speaker enroll proxy connection error:', proxyErr.message);
      return res.status(502).json({ error: 'AI services unreachable. Speaker verification service may not be running.' });
    }

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('speaker enroll error:', err.message || err);
    return res.status(500).json({ error: 'Speaker enrollment failed: ' + (err.message || 'unknown error') });
  }
});

/**
 * DELETE /enroll
 * Unenroll the authenticated user's voice profile.
 */
router.delete('/enroll', async (req, res) => {
  try {
    const upstream = await proxyToAIService('/speaker/enroll', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: req.user.id }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('speaker unenroll proxy error:', err);
    return res.status(502).json({ error: 'Failed to reach ai-services' });
  }
});

/**
 * GET /status
 * Check whether the authenticated user has an enrolled voice profile.
 */
router.get('/status', async (req, res) => {
  try {
    const upstream = await proxyToAIService(`/speaker/status?user_id=${req.user.id}`, {
      method: 'GET',
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('speaker status proxy error:', err.message);
    // Gracefully degrade when ai-services is down — report as not enrolled
    return res.json({ enrolled: false, service_unavailable: true });
  }
});

export default router;
