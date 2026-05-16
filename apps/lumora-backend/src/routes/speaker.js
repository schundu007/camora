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
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { authenticate } from '../middleware/authenticate.js';
import { proxyToAIService, AI_SERVICES_URL } from '../services/aiServiceProxy.js';

const execFileAsync = promisify(execFile);

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

// All speaker routes require authentication
router.use(authenticate);

/**
 * POST /enroll
 * Forward the uploaded audio file to ai-services for voice enrollment.
 */
router.post('/enroll', upload.any(), async (req, res) => {
  // Accept both 'audio' and 'file' field names
  if (req.files?.length > 0) req.file = req.files[0];
  // Track per-request temp file paths so the finally cleanup can unlink
  // EXACTLY these files. Declared OUTSIDE the try so finally can see
  // it even when an early `if (!req.file)` returns before the paths
  // are populated.
  const myFiles = [];
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required (field name: "audio")' });
    }
    console.log(`[Speaker] Received: name=${req.file.originalname}, size=${req.file.size}, mime=${req.file.mimetype}`);

    const id = randomUUID();
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `enroll-${id}.webm`);
    const wavPath = path.join(tmpDir, `enroll-${id}.wav`);
    myFiles.push(inputPath, wavPath);

    fs.writeFileSync(inputPath, req.file.buffer);

    let audioBuffer, filename, mime;

    try {
      await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', wavPath]);
      audioBuffer = fs.readFileSync(wavPath);
      filename = 'enrollment.wav';
      mime = 'audio/wav';
      console.log(`[Speaker] Converted to WAV: ${audioBuffer.length} bytes`);
    } catch (ffmpegErr) {
      console.warn(`[Speaker] ffmpeg failed, sending original: ${ffmpegErr.message}`);
      audioBuffer = req.file.buffer;
      filename = req.file.originalname || 'audio.webm';
      mime = req.file.mimetype || 'audio/webm';
    }

    const url = `${AI_SERVICES_URL}/speaker/enroll`;
    const boundary = '----FormBoundary' + id.replace(/-/g, '');

    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`));
    parts.push(audioBuffer);
    parts.push(Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n${req.user.id}\r\n`));
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);
    console.log(`[Speaker] Sending ${body.length} bytes to ${url}`);

    const enrollHeaders = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
    if (process.env.AI_SERVICES_API_KEY) enrollHeaders['X-API-Key'] = process.env.AI_SERVICES_API_KEY;
    // 30s timeout — without this a wedged Python worker (graphviz hung,
    // resemblyzer GPU stuck, etc.) holds the Express worker indefinitely.
    // Concurrent enrolls then exhaust the event loop.
    const upstream = await fetch(url, {
      method: 'POST',
      headers: enrollHeaders,
      body,
      signal: AbortSignal.timeout(30000),
    });
    const raw = await upstream.text();
    console.log(`[Speaker] Response ${upstream.status}: ${raw.slice(0, 500)}`);
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 200) || 'ai-services error' }; }
    return res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (err) {
    console.error('[Speaker] Enroll error:', err.name, err.message);
    const msg = err.name === 'TimeoutError' ? 'Speaker enrollment timed out — try a shorter clip' : 'Speaker enrollment failed';
    return res.status(500).json({ error: msg });
  } finally {
    // Per-request cleanup. Previous version readdir'd tmpdir and
    // unlinked every `enroll-*.{webm,wav}` — concurrent enrollments
    // racing on the same prefix would destroy each other's
    // in-flight files (ffmpeg ENOENT mid-conversion → corrupt WAVs
    // posted to ai-services). Only touch the IDs we created.
    for (const p of myFiles) {
      try { fs.unlinkSync(p); } catch { /* missing or busy — fine */ }
    }
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
