/**
 * Voice API Routes
 *
 * RESTful API for voice assistant functionality.
 * Mirrors vassist.py's Flask routes with Express.
 */

import express from 'express';
import multer from 'multer';
import { voiceBroadcaster } from '../services/sse-broadcaster.js';
import {
  getSession,
  destroySession,
  getActiveSessions,
  CONFIG,
} from '../services/voice-processor.js';
import { safeLog } from '../services/utils.js';

const router = express.Router();

// Multer for audio uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

/**
 * SSE Events Stream
 * GET /api/voice/events
 *
 * Subscribe to real-time voice events
 */
router.get('/events', (req, res) => {
  const subscriberId = voiceBroadcaster.subscribe(res);

  // Start broadcaster if first subscriber
  if (voiceBroadcaster.getSubscriberCount() === 1) {
    voiceBroadcaster.start();
  }

  // Send initial state
  const sessionId = req.query.sessionId || 'default';
  const session = getSession(sessionId);
  res.write(`event: state\ndata: ${JSON.stringify(session.getState())}\n\n`);
});

/**
 * Health Check
 * GET /api/voice/health
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    subscribers: voiceBroadcaster.getSubscriberCount(),
    activeSessions: getActiveSessions(),
    config: {
      vadThreshold: CONFIG.VAD_THRESHOLD,
      silenceDuration: CONFIG.SILENCE_DURATION_MS,
      minSpeechDuration: CONFIG.MIN_SPEECH_DURATION_MS,
    },
  });
});

/**
 * Create/Get Session
 * POST /api/voice/session
 */
router.post('/session', (req, res) => {
  try {
    const {
      sessionId = `session_${Date.now()}`,
      provider,
      model,
      jobDescription,
      resume,
      prepMaterial,
      transcriptionProvider,
      anthropicKey,
      openaiKey,
      deepgramKey,
    } = req.body;

    const session = getSession(sessionId, {
      provider,
      model,
      jobDescription,
      resume,
      prepMaterial,
      transcriptionProvider,
      anthropicKey,
      openaiKey,
      deepgramKey,
    });

    res.json({
      ok: true,
      sessionId: session.sessionId,
      state: session.getState(),
    });
  } catch (err) {
    safeLog(`[Voice Route] Session create error: ${err.message}`);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Update Session Options
 * PATCH /api/voice/session/:sessionId
 */
router.patch('/session/:sessionId', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    session.updateOptions(req.body);
    res.json({ ok: true, state: session.getState() });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Get Session State
 * GET /api/voice/session/:sessionId
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    res.json({
      ok: true,
      state: session.getState(),
      history: session.getHistory(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Delete Session
 * DELETE /api/voice/session/:sessionId
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    destroySession(req.params.sessionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Start Voice Capture
 * POST /api/voice/start
 */
router.post('/start', (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'default';
    const session = getSession(sessionId);
    const result = session.start();
    res.json(result);
  } catch (err) {
    safeLog(`[Voice Route] Start error: ${err.message}`);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Stop Voice Capture
 * POST /api/voice/stop
 */
router.post('/stop', (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'default';
    const session = getSession(sessionId);
    const result = session.stop();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Process Audio Chunk
 * POST /api/voice/audio
 *
 * Receives audio chunks from frontend for VAD processing
 */
router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'default';
    const rms = parseFloat(req.body.rms) || 0;
    const session = getSession(sessionId);

    if (!req.file) {
      return res.status(400).json({ ok: false, msg: 'No audio data' });
    }

    session.processAudioChunk(req.file.buffer, rms);
    res.json({ ok: true });
  } catch (err) {
    safeLog(`[Voice Route] Audio error: ${err.message}`);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Submit Full Audio for Transcription
 * POST /api/voice/transcribe
 *
 * Receives complete audio segment from frontend, transcribes it,
 * and generates an answer. Results are sent via SSE events.
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'default';
    const session = getSession(sessionId);

    if (!req.file) {
      return res.status(400).json({ ok: false, msg: 'No audio data' });
    }

    // Send immediate response so client knows upload succeeded
    res.json({ ok: true });

    // Process audio in background - events sent via SSE
    try {
      // Notify status
      session.setStatus('transcribe', 'Transcribing...');

      // Transcribe the audio
      const question = await session._transcribe(req.file.buffer);

      if (!question || question.trim().length < 5) {
        session.setStatus('ready', "Didn't catch that - listening...");
        return;
      }

      // Check for duplicate
      if (session.questionTracker.isDuplicate(question)) {
        safeLog(`[Voice] Duplicate question ignored: ${question.slice(0, 50)}`);
        session.setStatus('ready', 'Listening...');
        return;
      }

      session.questionTracker.add(question);
      session.push('question', { text: question });

      // Generate answer (this will push tokens via SSE)
      await session._generateAnswer(question);

    } catch (err) {
      safeLog(`[Voice Route] Transcribe processing error: ${err.message}`);
      session.push('error', { msg: err.message });
      session.setStatus('ready', 'Error - try again');
    }
  } catch (err) {
    safeLog(`[Voice Route] Transcribe error: ${err.message}`);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Ask Question (Manual)
 * POST /api/voice/ask
 */
router.post('/ask', async (req, res) => {
  try {
    const { sessionId = 'default', question, useSearch = false } = req.body;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({ ok: false, msg: 'Question is empty' });
    }

    const session = getSession(sessionId);
    const result = await session.askQuestion(question.trim(), useSearch);
    res.json(result);
  } catch (err) {
    safeLog(`[Voice Route] Ask error: ${err.message}`);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Calibrate VAD Threshold
 * POST /api/voice/calibrate
 */
router.post('/calibrate', async (req, res) => {
  try {
    const { sessionId = 'default', samples = [] } = req.body;
    const session = getSession(sessionId);
    const result = await session.calibrate(samples);
    res.json(result);
  } catch (err) {
    safeLog(`[Voice Route] Calibrate error: ${err.message}`);
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Reset Conversation History
 * POST /api/voice/reset
 */
router.post('/reset', (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'default';
    const session = getSession(sessionId);
    const result = session.resetHistory();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

/**
 * Get Conversation History
 * GET /api/voice/history/:sessionId
 */
router.get('/history/:sessionId', (req, res) => {
  try {
    const session = getSession(req.params.sessionId);
    res.json({
      ok: true,
      history: session.getHistory(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

export default router;
