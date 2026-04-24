/**
 * Transcription route — POST /api/v1/transcribe
 *
 * Accepts a multipart audio file, converts to WAV, sends to OpenAI Whisper,
 * and returns the transcribed text with latency.
 *
 * Migrated from Python: lumora/backend/app/api/v1/transcription.py
 */
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { transcribe } from '../services/transcription.js';
import { checkLimit, incrementUsage } from '../services/usage.js';

const router = Router();

// ── Multer config ────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const SUPPORTED_MIMETYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/flac',
  'audio/x-m4a',
  'audio/mp4',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (!SUPPORTED_MIMETYPES.has(file.mimetype)) {
      return cb(
        Object.assign(
          new Error(
            `Unsupported audio format: ${file.mimetype}. ` +
            `Supported: ${[...SUPPORTED_MIMETYPES].join(', ')}`,
          ),
          { status: 400 },
        ),
      );
    }
    cb(null, true);
  },
});

// ── AI-services speaker-verification helper ─────────────────────────────────
const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'http://localhost:8001';

/**
 * Call the ai-services microservice to verify whether the audio matches
 * the user's enrolled voice. Returns { should_transcribe, similarity }.
 */
async function verifySpeaker(userId, audioBuffer, filename) {
  try {
    // Build raw multipart — most reliable for Node.js → Python FastAPI
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const mime = filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`));
    parts.push(Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer));
    parts.push(Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n${userId}\r\n`));
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const res = await fetch(`${AI_SERVICES_URL}/api/v1/speaker/verify`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: Buffer.concat(parts),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`Speaker verification failed (${res.status}), proceeding with transcription`);
      return { should_transcribe: true, similarity: 0 };
    }

    return res.json();
  } catch (err) {
    // ai-services is down or unreachable — skip verification, proceed with transcription
    console.warn(`Speaker verification unreachable: ${err.message}, proceeding with transcription`);
    return { should_transcribe: true, similarity: 0 };
  }
}

/**
 * Call the ai-services diarize endpoint for two-speaker segmentation.
 * Returns { should_transcribe, segments, interviewer_ratio }.
 * Falls back to simple verify on error.
 */
async function diarizeSpeaker(userId, audioBuffer, filename) {
  try {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const mime = filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
    const parts = [];
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`));
    parts.push(Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer));
    parts.push(Buffer.from('\r\n'));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n${userId}\r\n`));
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const res = await fetch(`${AI_SERVICES_URL}/speaker/diarize`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: Buffer.concat(parts),
      signal: AbortSignal.timeout(10000), // diarization takes longer
    });

    if (!res.ok) {
      console.warn(`Diarization failed (${res.status}), falling back to verify`);
      return verifySpeaker(userId, audioBuffer, filename);
    }

    return res.json();
  } catch (err) {
    console.warn(`Diarization unreachable: ${err.message}, falling back to verify`);
    return verifySpeaker(userId, audioBuffer, filename);
  }
}

// ── POST / (mounted at /api/v1/transcribe) ──────────────────────────────────
router.post(
  '/',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    const start = performance.now();

    try {
      // Check usage limits (admins bypass)
      if (req.user?.id && !req.user.is_admin) {
        const limitCheck = await checkLimit(req.user.id, 'questions');
        if (!limitCheck.allowed) {
          return res.status(429).json({ error: 'Usage limit reached. Please upgrade your plan.', subscriptionRequired: true });
        }
      }

      const file = req.file;
      if (!file || file.size === 0) {
        return res.status(400).json({ error: 'Empty or missing audio file' });
      }

      // Parse the optional filter_user_voice flag (multipart form field)
      const filterUserVoice =
        req.body.filter_user_voice === 'true' || req.body.filter_user_voice === true;

      // ── Speaker diarization / verification (optional) ─────────────────
      if (filterUserVoice) {
        console.log(`[VoiceFilter] user=${req.user.id} audio=${file.buffer.length}B`);
        const diarization = await diarizeSpeaker(
          String(req.user.id),
          file.buffer,
          file.originalname || 'audio.webm',
        );
        console.log(`[VoiceFilter] Result:`, JSON.stringify(diarization));

        if (!diarization.should_transcribe) {
          const ratio = diarization.interviewer_ratio ?? diarization.similarity ?? 0;
          console.info(
            `Skipped transcription user=${req.user.id}: ` +
            `candidate voice detected (interviewer_ratio=${(ratio).toFixed(3)})`,
          );
          return res.json({
            text: '',
            latency_ms: 0,
            skipped: true,
            reason: 'user_voice_detected',
            similarity: diarization.similarity || 0,
            segments: diarization.segments,
            interviewer_ratio: diarization.interviewer_ratio,
          });
        }

        // Log diarization results for debugging
        if (diarization.segments) {
          const speakers = diarization.segments.map(s => s.speaker);
          console.info(`Diarization: ${speakers.join(' → ')} (interviewer=${(diarization.interviewer_ratio * 100).toFixed(0)}%)`);
        }
      }

      // ── Transcribe ───────────────────────────────────────────────────
      const rawText = await transcribe(file.buffer, file.originalname || 'audio.webm');
      const latencyMs = Math.round(performance.now() - start);

      // Filter Whisper hallucinations (phantom text on silence/low audio)
      const HALLUCINATION_PATTERNS = [
        /^thank(s| you)?\s*(for)?\s*(watching|listening|viewing|tuning in)/i,
        /^(please\s+)?(like\s+and\s+)?subscribe/i,
        /^(bye|goodbye|see you)\s*(next time|later|soon)?\.?$/i,
        /^(okay|ok)\.?\s*$/i,
        /^\.+$/,
        /^(\s*thank you\.?\s*)+$/i,
        /^\s*$/,
      ];
      const trimmed = rawText.trim();
      if (HALLUCINATION_PATTERNS.some(p => p.test(trimmed))) {
        console.info(`[Whisper] Filtered hallucination: "${trimmed}"`);
        return res.json({ text: '', latency_ms: latencyMs, skipped: true, reason: 'hallucination_filtered' });
      }

      console.info(
        `Transcribed audio user=${req.user.id}: ` +
        `${trimmed.length} chars in ${latencyMs}ms`,
      );

      return res.json({ text: trimmed, latency_ms: latencyMs, skipped: false });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      console.error('Transcription error:', err);
      return res.status(500).json({
        error: 'Transcription failed',
        latency_ms: latencyMs,
      });
    }
  },
);

// ── Multer error handler ────────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `Audio file too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

export default router;
