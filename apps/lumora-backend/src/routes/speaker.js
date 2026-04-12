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

    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const { randomUUID } = await import('crypto');
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const id = randomUUID();
    const tmpDir = os.default.tmpdir();
    const inputPath = path.default.join(tmpDir, `enroll-${id}.webm`);
    const wavPath = path.default.join(tmpDir, `enroll-${id}.wav`);

    // Write browser audio to temp file
    fs.default.writeFileSync(inputPath, req.file.buffer);

    let audioBuffer;
    let filename;
    let mime;

    try {
      // Convert WebM → WAV (16kHz mono) — AI service processes WAV reliably
      await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', wavPath]);
      audioBuffer = fs.default.readFileSync(wavPath);
      filename = 'enrollment.wav';
      mime = 'audio/wav';
      console.log(`[Speaker] Converted to WAV: ${audioBuffer.length} bytes`);
    } catch (ffmpegErr) {
      // ffmpeg failed — send original
      console.warn(`[Speaker] ffmpeg conversion failed, sending original: ${ffmpegErr.message}`);
      audioBuffer = req.file.buffer;
      filename = req.file.originalname || 'audio.webm';
      mime = req.file.mimetype || 'audio/webm';
    }

    // Build raw multipart
    const { AI_SERVICES_URL } = await import('../services/aiServiceProxy.js');
    const url = `${AI_SERVICES_URL}/speaker/enroll`;
    const boundary = '----FormBoundary' + randomUUID().replace(/-/g, '');

    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`));
    parts.push(audioBuffer);
    parts.push(Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n${req.user.id}\r\n`));
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);
    console.log(`[Speaker] Sending ${body.length} bytes to ${url}`);

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const data = await upstream.json();
    console.log(`[Speaker] Response: ${upstream.status}`, JSON.stringify(data));
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[Speaker] Enroll error:', err.message || err);
    return res.status(500).json({ error: 'Speaker enrollment failed: ' + (err.message || 'unknown error') });
  } finally {
    // Cleanup temp files
    try {
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const tmpDir = os.default.tmpdir();
      for (const f of fs.default.readdirSync(tmpDir)) {
        if (f.startsWith('enroll-') && (f.endsWith('.webm') || f.endsWith('.wav'))) {
          try { fs.default.unlinkSync(path.default.join(tmpDir, f)); } catch {}
        }
      }
    } catch {}
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
