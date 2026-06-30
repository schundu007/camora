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
import { recordUsage } from '../services/aiHoursMeter.js';

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

    const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
    if (process.env.AI_SERVICES_API_KEY) headers['X-API-Key'] = process.env.AI_SERVICES_API_KEY;
    const res = await fetch(`${AI_SERVICES_URL}/api/v1/speaker/verify`, {
      method: 'POST',
      headers,
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
 * Returns { should_transcribe, segments, speaker_ratio }.
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

    const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
    if (process.env.AI_SERVICES_API_KEY) headers['X-API-Key'] = process.env.AI_SERVICES_API_KEY;
    const res = await fetch(`${AI_SERVICES_URL}/speaker/diarize`, {
      method: 'POST',
      headers,
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
      // If the diarizer slices the audio to speaker-only WAV bytes,
      // we send THAT to Whisper instead of the original upload. Without
      // this, a chunk containing both the user and the speaker
      // gets fully transcribed and the user's words leak to Sona.
      let audioForWhisper = file.buffer;
      let filenameForWhisper = file.originalname || 'audio.webm';

      if (filterUserVoice) {
        console.log(`[VoiceFilter] user=${req.user.id} audio=${file.buffer.length}B`);
        const diarization = await diarizeSpeaker(
          String(req.user.id),
          file.buffer,
          file.originalname || 'audio.webm',
        );
        // Don't log audio_b64 — it's the entire WAV in base64 and
        // floods the logs.
        const { audio_b64, ...diarLog } = diarization;
        console.log(`[VoiceFilter] Result:`, JSON.stringify(diarLog), audio_b64 ? `(sliced=${audio_b64.length}B b64)` : '(no slice)');

        if (!diarization.should_transcribe) {
          const ratio = diarization.speaker_ratio ?? diarization.interviewer_ratio ?? diarization.similarity ?? 0;
          console.info(
            `Skipped transcription user=${req.user.id}: ` +
            `user voice detected (speaker_ratio=${(ratio).toFixed(3)})`,
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

        // Mixed chunk — swap in the speaker-only slice. Single-
        // speaker chunks have no audio_b64 and we send the original.
        if (diarization.audio_b64) {
          try {
            audioForWhisper = Buffer.from(diarization.audio_b64, 'base64');
            filenameForWhisper = 'audio.wav';
            console.info(
              `[VoiceFilter] Using sliced audio for Whisper: ${audioForWhisper.length}B (was ${file.buffer.length}B)`,
            );
          } catch (e) {
            console.warn(`[VoiceFilter] Failed to decode sliced audio, falling back to original: ${e.message}`);
          }
        }

        // Log diarization results for debugging
        if (diarization.segments) {
          const speakers = diarization.segments.map(s => s.speaker);
          console.info(`Diarization: ${speakers.join(' → ')} (speaker=${(diarization.interviewer_ratio * 100).toFixed(0)}%)`);
        }
      }

      // ── Transcribe ───────────────────────────────────────────────────
      const rawText = await transcribe(audioForWhisper, filenameForWhisper);
      const latencyMs = Math.round(performance.now() - start);

      // Filter Whisper hallucinations (phantom text on silence/low audio).
      // Whisper trained on YouTube falls back to outros/outtros on silence
      // ("thanks for watching", "subscribe"), single short foreign tokens
      // ("lanja", "uh", isolated kana/cyrillic chars), or generic ack words
      // ("okay", "you"). These never reflect a real interview question,
      // and letting them through pollutes the QUESTIONS panel + wastes an
      // LLM call. The frontend has a parallel filter in AudioCapture.tsx
      // (isLikelyRealSpeech) for defense in depth — if either side drops
      // the chunk, it never reaches the accumulator.
      const HALLUCINATION_PATTERNS = [
        /^thank(s| you)?\s*(for)?\s*(watching|listening|viewing|tuning in)/i,
        /^(please\s+)?(like\s+and\s+)?subscribe/i,
        /^(bye|goodbye|see you)\s*(next time|later|soon)?\.?$/i,
        /^(okay|ok|alright|all right)\.?\s*$/i,
        /^(yeah|yep|yup|nah|nope|uh|um|hmm|huh)\.?\s*$/i,
        /^you\.?$/i,
        /^thanks\.?$/i,
        /^thank you( so much| very much)?\.?$/i,
        /^(see you|see ya|cya|goodnight|good night)\.?$/i,
        /^\.+$/,
        /^[\s.,!?-]+$/,                  // pure punctuation
        /^(\s*thank you\.?\s*)+$/i,
        /^\s*$/,
      ];
      // De-dupe Whisper's duplicate-phrase artifact ("What is Bazel? What is
      // Bazel?") BEFORE filtering. Whisper routinely stutters a REAL question
      // on short audio; the repetition filter below would otherwise discard the
      // whole question. Collapse consecutive duplicate sentences + immediately
      // repeated phrases. A pure single-word loop ("Marvin Marvin Marvin")
      // collapses to one word and is then caught by the short-noise filter, so
      // genuine garbage still dies — but real stuttered questions survive.
      const dedupeRepeats = (t) => {
        if (!t) return t;
        const sentences = t.split(/(?<=[.?!])\s+/);
        const kept = [];
        for (const s of sentences) {
          const norm = s.trim().toLowerCase().replace(/[.?!,]+$/, '');
          if (!norm) continue;
          if (kept.length && kept[kept.length - 1].norm === norm) continue;
          kept.push({ raw: s.trim(), norm });
        }
        let out = kept.map((s) => s.raw).join(' ') || t.trim();
        out = out.replace(/(.{3,60}?)(?:[,\s]+\1)+/gi, '$1');
        return out.trim();
      };
      const trimmed = dedupeRepeats(rawText.trim());
      const isHallucinationByPattern = HALLUCINATION_PATTERNS.some(p => p.test(trimmed));

      // Single short token without punctuation is almost always
      // hallucination — Whisper picking a random word out of silence
      // / room noise. A real interview question is at least a few
      // words; a one-word follow-up like "really?" carries punctuation
      // and gets through the regex above.
      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      const hasTerminalPunct = /[?!.]$/.test(trimmed);
      const isShortNoise = wordCount <= 1 && trimmed.length < 14 && !hasTerminalPunct;

      // Repetition hallucination: Whisper locks onto a single word/name from
      // silence and repeats it many times ("Marvin, Marvin, are you there
      // Marvin?"). Any word appearing 4+ times in the transcript is a loop.
      const allWords = trimmed.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 2);
      const wordFreq = {};
      for (const w of allWords) wordFreq[w] = (wordFreq[w] || 0) + 1;
      const maxRepeat = allWords.length ? Math.max(...Object.values(wordFreq)) : 0;
      const isWordRepetition = maxRepeat >= 4;
      // Trigram repetition: "tell me about yourself tell me about yourself"
      // has max word freq = 2 (passes the word check) but repeats a phrase.
      let isTrigramRepetition = false;
      if (allWords.length >= 6) {
        const seen = new Set();
        for (let i = 0; i <= allWords.length - 3; i++) {
          const tg = `${allWords[i]} ${allWords[i+1]} ${allWords[i+2]}`;
          if (seen.has(tg)) { isTrigramRepetition = true; break; }
          seen.add(tg);
        }
      }
      const isRepetitionHallucination = isWordRepetition || isTrigramRepetition;

      // Foreign-language hallucination: despite language:'en', Whisper sometimes
      // produces German/Japanese/etc. on background noise. Reject if non-ASCII
      // characters make up more than 8% of the text.
      const nonAsciiCount = (trimmed.match(/[^\x00-\x7F]/g) || []).length;
      const isForeignHallucination = trimmed.length > 0 && (nonAsciiCount / trimmed.length) > 0.08;

      if (isHallucinationByPattern || isShortNoise || isRepetitionHallucination || isForeignHallucination) {
        console.info(`[Whisper] Filtered hallucination: "${trimmed.slice(0, 80)}" (pattern=${isHallucinationByPattern}, shortNoise=${isShortNoise}, repeat=${isRepetitionHallucination}, foreign=${isForeignHallucination})`);
        return res.json({ text: '', latency_ms: latencyMs, skipped: true, reason: 'hallucination_filtered' });
      }

      console.info(
        `Transcribed audio user=${req.user.id}: ` +
        `${trimmed.length} chars in ${latencyMs}ms`,
      );

      if (req.user?.id) {
        recordUsage({
          userId: req.user.id,
          surface: 'lumora_transcribe',
          seconds: latencyMs / 1000,
          model: 'whisper-1',
        });
      }

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
