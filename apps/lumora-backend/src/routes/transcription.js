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
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('file', new Blob([audioBuffer]), filename);

  const res = await fetch(`${AI_SERVICES_URL}/api/v1/speaker/verify`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    // If verification service is unavailable, default to transcribing
    console.warn(`Speaker verification failed (${res.status}), proceeding with transcription`);
    return { should_transcribe: true, similarity: 0 };
  }

  return res.json();
}

// ── POST / (mounted at /api/v1/transcribe) ──────────────────────────────────
router.post(
  '/',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    const start = performance.now();

    try {
      // Check usage limits
      if (req.user?.id) {
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

      // ── Speaker verification (optional) ──────────────────────────────
      if (filterUserVoice) {
        const verification = await verifySpeaker(
          String(req.user.id),
          file.buffer,
          file.originalname || 'audio.webm',
        );

        if (!verification.should_transcribe) {
          console.info(
            `Skipped transcription for user ${req.user.email}: ` +
            `user voice detected (similarity=${verification.similarity.toFixed(3)})`,
          );
          return res.json({
            text: '',
            latency_ms: 0,
            skipped: true,
            reason: 'user_voice_detected',
            similarity: verification.similarity,
          });
        }
      }

      // ── Transcribe ───────────────────────────────────────────────────
      const text = await transcribe(file.buffer, file.originalname || 'audio.webm');
      const latencyMs = Math.round(performance.now() - start);

      console.info(
        `Transcribed audio for user ${req.user.email}: ` +
        `${text.length} chars in ${latencyMs}ms`,
      );

      return res.json({ text, latency_ms: latencyMs, skipped: false });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      console.error('Transcription error:', err);
      return res.status(500).json({
        error: `Transcription failed: ${err.message}`,
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
