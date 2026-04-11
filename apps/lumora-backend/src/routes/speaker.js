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

    console.log(`[Speaker] Enrolling user ${req.user.id}, file: ${req.file.originalname}, size: ${req.file.size}, mime: ${req.file.mimetype}`);

    // Write audio to temp file for reliable multipart upload
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const { randomUUID } = await import('crypto');

    const tmpPath = path.default.join(os.default.tmpdir(), `enroll-${randomUUID()}.webm`);
    fs.default.writeFileSync(tmpPath, req.file.buffer);

    try {
      // Use FormData with file from disk
      const formData = new FormData();
      const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
      formData.append('audio', fileBlob, req.file.originalname || 'enrollment.webm');
      formData.append('user_id', String(req.user.id));

      const { AI_SERVICES_URL } = await import('../services/aiServiceProxy.js');
      const url = `${AI_SERVICES_URL}/speaker/enroll`;
      console.log(`[Speaker] Proxying to: ${url}`);

      const upstream = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await upstream.json();
      console.log(`[Speaker] Upstream response: ${upstream.status}`, JSON.stringify(data));
      return res.status(upstream.status).json(data);
    } finally {
      try { fs.default.unlinkSync(tmpPath); } catch {}
    }
  } catch (err) {
    console.error('[Speaker] Enroll error:', err.message || err, err.stack);
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
