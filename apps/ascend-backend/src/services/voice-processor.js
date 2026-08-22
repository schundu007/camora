/**
 * Voice Processor Service
 *
 * Backend-managed voice processing inspired by vassist.py.
 * Handles audio state, VAD, transcription queue, and answer generation.
 */

import { voiceBroadcaster } from './sse-broadcaster.js';
import * as claudeService from './claude.js';
import * as deepgramService from './deepgram.js';
import { safeLog } from './utils.js';
import fetch from 'node-fetch';

// Configuration (mirrors vassist.py's AppConfig)
// Service separation: ascend-backend answers on Gemini. Matches the model id
// used by every other Gemini call site in this service.
const VOICE_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const CONFIG = {
  // VAD settings
  VAD_THRESHOLD: 0.12,           // Default threshold, adjustable via calibration
  SILENCE_DURATION_MS: 1500,     // 1.5s silence to end speech segment
  MIN_SPEECH_DURATION_MS: 800,   // Minimum 0.8s of speech
  MAX_SPEECH_DURATION_MS: 45000, // Maximum 45s per segment

  // Rate limiting
  TRANSCRIPTION_COOLDOWN_MS: 2000, // 2s between transcriptions
  ASK_COOLDOWN_MS: 1500,           // 1.5s between manual questions

  // Answer generation
  MAX_ANSWER_TOKENS: 2500,
  CONTEXT_TURNS: 6,
  MAX_HISTORY: 20,

  // Transcription
  STT_TIMEOUT_MS: 10000,
};

/**
 * Audio State - Thread-safe state management (single instance per session)
 */
class AudioState {
  constructor() {
    this.running = false;
    this.busy = false;
    this.threshold = CONFIG.VAD_THRESHOLD;
    this.inSpeech = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    this.audioBuffer = [];       // Accumulated audio chunks
    this.lastTranscriptionTime = 0;
    this.sessionId = null;
  }

  /**
   * Atomically acquire busy lock (like Python's acquire_busy)
   */
  acquireBusy() {
    if (this.busy) return false;
    this.busy = true;
    return true;
  }

  releaseBusy() {
    this.busy = false;
  }

  reset() {
    this.running = false;
    this.busy = false;
    this.inSpeech = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    this.audioBuffer = [];
  }

  snapshot() {
    return {
      running: this.running,
      busy: this.busy,
      threshold: this.threshold,
      inSpeech: this.inSpeech,
      bufferSize: this.audioBuffer.length,
    };
  }
}

/**
 * Conversation History - maintains context for answers
 */
class ConversationHistory {
  constructor(maxMessages = CONFIG.MAX_HISTORY) {
    this.messages = [];
    this.maxMessages = maxMessages;
  }

  append(role, content) {
    this.messages.push({ role, content, timestamp: Date.now() });
    // Trim old messages (keep pairs)
    while (this.messages.length > this.maxMessages) {
      if (this.messages[0]?.role === 'user') this.messages.shift();
      if (this.messages[0]?.role === 'assistant') this.messages.shift();
    }
  }

  recent(n = CONFIG.CONTEXT_TURNS) {
    return this.messages.slice(-n);
  }

  clear() {
    this.messages = [];
  }

  toArray() {
    return [...this.messages];
  }
}

/**
 * Question Tracker - prevents duplicate questions
 */
class QuestionTracker {
  constructor() {
    this.askedQuestions = new Set();
  }

  normalize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }

  isDuplicate(question) {
    const normalized = this.normalize(question);
    if (normalized.length < 10) return false; // Too short to be duplicate

    // Check exact match
    if (this.askedQuestions.has(normalized)) return true;

    // Check substring match (80% overlap)
    for (const asked of this.askedQuestions) {
      if (normalized.includes(asked) || asked.includes(normalized)) {
        return true;
      }
      // Word overlap check
      const newWords = new Set(normalized.split(/\s+/));
      const askedWords = new Set(asked.split(/\s+/));
      const overlap = [...newWords].filter(w => askedWords.has(w)).length;
      if (overlap / Math.max(newWords.size, askedWords.size) > 0.7) {
        return true;
      }
    }
    return false;
  }

  add(question) {
    this.askedQuestions.add(this.normalize(question));
  }

  clear() {
    this.askedQuestions.clear();
  }
}

/**
 * Rate Limiter
 */
class RateLimiter {
  constructor(minIntervalMs) {
    this.minInterval = minIntervalMs;
    this.lastTime = 0;
  }

  allowed() {
    const now = Date.now();
    if (now - this.lastTime >= this.minInterval) {
      this.lastTime = now;
      return true;
    }
    return false;
  }
}

// Session management - one processor per session
const sessions = new Map();

class VoiceSession {
  constructor(sessionId, options = {}) {
    this.sessionId = sessionId;
    this.state = new AudioState();
    this.state.sessionId = sessionId;
    this.history = new ConversationHistory();
    this.questionTracker = new QuestionTracker();
    this.askLimiter = new RateLimiter(CONFIG.ASK_COOLDOWN_MS);
    this.pendingQuestions = []; // FIFO queue

    // Options
    // Service separation: this service answers on Gemini, never Anthropic.
    this.provider = options.provider || 'gemini';
    this.model = options.model || VOICE_MODEL;
    this.jobDescription = options.jobDescription || '';
    this.resume = options.resume || '';
    this.prepMaterial = options.prepMaterial || '';
    this.transcriptionProvider = options.transcriptionProvider || 'deepgram';

    // API keys. No anthropicKey: ascend-backend must not call Anthropic, and
    // must not relay a caller's Anthropic key on their behalf either.
    this.openaiKey = options.openaiKey || '';
    this.deepgramKey = options.deepgramKey || '';

    safeLog(`[Voice] Session ${sessionId} created`);
  }

  /**
   * Push event to all subscribers (via SSE broadcaster)
   */
  push(event, data) {
    voiceBroadcaster.broadcast(event, {
      sessionId: this.sessionId,
      ...data,
    });
  }

  /**
   * Update status and notify clients
   */
  setStatus(state, msg) {
    this.push('status', { state, msg });
  }

  /**
   * Start voice capture
   */
  start() {
    if (this.state.running) {
      return { ok: false, msg: 'Already running' };
    }

    this.state.running = true;
    this.state.audioBuffer = [];
    this.state.inSpeech = false;
    this.state.busy = false;

    this.setStatus('ready', 'Listening...');
    safeLog(`[Voice] Session ${this.sessionId} started`);

    return { ok: true };
  }

  /**
   * Stop voice capture
   */
  stop() {
    this.state.running = false;
    this.state.inSpeech = false;

    this.setStatus('idle', 'Stopped');
    safeLog(`[Voice] Session ${this.sessionId} stopped`);

    return { ok: true };
  }

  /**
   * Process incoming audio chunk with VAD
   * @param {Buffer} audioData - Raw audio data
   * @param {number} rms - RMS level from frontend
   */
  processAudioChunk(audioData, rms) {
    if (!this.state.running) return;

    const threshold = this.state.threshold;

    // Broadcast audio level for visualization
    this.push('level', { rms: rms.toFixed(5), threshold: threshold.toFixed(5) });

    // VAD logic (mirrors vassist.py's audio_callback)
    if (rms > threshold) {
      // Speech detected
      if (!this.state.inSpeech) {
        this.state.inSpeech = true;
        this.state.speechStartTime = Date.now();
        this.state.silenceStartTime = null;
        this.state.audioBuffer = [];

        if (!this.state.busy) {
          this.setStatus('listen', 'Capturing speech...');
        }
      }

      this.state.audioBuffer.push(audioData);

      // Check max speech duration
      const speechDuration = Date.now() - this.state.speechStartTime;
      if (speechDuration >= CONFIG.MAX_SPEECH_DURATION_MS) {
        this._triggerTranscription();
      }
    } else {
      // Silence
      if (this.state.inSpeech) {
        this.state.audioBuffer.push(audioData);

        if (!this.state.silenceStartTime) {
          this.state.silenceStartTime = Date.now();
        }

        const silenceDuration = Date.now() - this.state.silenceStartTime;
        if (silenceDuration >= CONFIG.SILENCE_DURATION_MS) {
          const speechDuration = Date.now() - this.state.speechStartTime;
          if (speechDuration >= CONFIG.MIN_SPEECH_DURATION_MS) {
            this._triggerTranscription();
          } else {
            // Too short, reset
            this.state.inSpeech = false;
            this.state.audioBuffer = [];
            if (!this.state.busy) {
              this.setStatus('ready', 'Listening...');
            }
          }
        }
      }
    }
  }

  /**
   * Trigger transcription of accumulated audio
   */
  async _triggerTranscription() {
    if (this.state.busy) {
      // Already processing, reset and wait
      this.state.inSpeech = false;
      this.state.audioBuffer = [];
      return;
    }

    if (this.state.audioBuffer.length === 0) return;

    // Rate limit check
    const now = Date.now();
    if (now - this.state.lastTranscriptionTime < CONFIG.TRANSCRIPTION_COOLDOWN_MS) {
      this.state.inSpeech = false;
      this.state.audioBuffer = [];
      return;
    }

    this.state.busy = true;
    this.state.lastTranscriptionTime = now;

    const audioBuffer = Buffer.concat(this.state.audioBuffer);
    this.state.inSpeech = false;
    this.state.audioBuffer = [];

    try {
      await this._processAudio(audioBuffer);
    } catch (err) {
      safeLog(`[Voice] Transcription error: ${err.message}`);
      this.push('error', { msg: err.message });
      this.setStatus('ready', 'Listening...');
    } finally {
      this.state.releaseBusy();
    }
  }

  /**
   * Process audio buffer: transcribe and generate answer
   */
  async _processAudio(audioBuffer) {
    this.setStatus('transcribe', 'Transcribing...');

    const question = await this._transcribe(audioBuffer);

    if (!question || question.trim().length < 5) {
      this.setStatus('ready', "Didn't catch that - listening...");
      return;
    }

    // Check for duplicate
    if (this.questionTracker.isDuplicate(question)) {
      safeLog(`[Voice] Duplicate question ignored: ${question.slice(0, 50)}`);
      this.setStatus('ready', 'Listening...');
      return;
    }

    this.questionTracker.add(question);
    this.push('question', { text: question });

    await this._generateAnswer(question);
  }

  /**
   * Transcribe audio using Deepgram Nova-2
   */
  async _transcribe(audioBuffer) {
    return this._transcribeDeepgram(audioBuffer);
  }

  /**
   * Transcribe using Deepgram Nova-2
   */
  async _transcribeDeepgram(audioBuffer) {
    const apiKey = this.deepgramKey || deepgramService.getApiKey();
    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram API error: ${error}`);
    }

    const result = await response.json();
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  }

  /**
   * Handle manual question (typed)
   */
  async askQuestion(question, useSearch = false) {
    if (!this.askLimiter.allowed()) {
      return { ok: false, msg: 'Too fast - wait a moment' };
    }

    if (!question || question.trim().length < 3) {
      return { ok: false, msg: 'Question too short' };
    }

    if (!this.state.acquireBusy()) {
      return { ok: false, msg: 'Busy - try again in a moment' };
    }

    this.push('question', { text: question });

    try {
      await this._generateAnswer(question);
      return { ok: true };
    } catch (err) {
      this.push('error', { msg: err.message });
      return { ok: false, msg: err.message };
    } finally {
      this.state.releaseBusy();
    }
  }

  /**
   * Generate answer using AI
   */
  async _generateAnswer(question) {
    this.setStatus('write', 'Generating...');
    this.push('stream_start', { question });

    const systemPrompt = this._buildSystemPrompt();
    const messages = [
      ...this.history.recent(),
      { role: 'user', content: question },
    ];

    try {
      let fullAnswer = '';

      fullAnswer = await this._streamAnswer(systemPrompt, messages);

      if (fullAnswer.trim()) {
        this.history.append('user', question);
        this.history.append('assistant', fullAnswer);

        this.push('answer', {
          question,
          raw: fullAnswer,
        });

        safeLog(`[Voice] Answer generated for: ${question.slice(0, 50)}...`);
      }
    } catch (err) {
      safeLog(`[Voice] Answer generation error: ${err.message}`);
      this.push('error', { msg: err.message });
    }

    this.setStatus('ready', 'Listening...');

    // Process any queued questions
    this._processQueue();
  }

  /**
   * Build system prompt with context
   */
  _buildSystemPrompt() {
    let prompt = `You are an expert system design interview coach. Generate comprehensive answers for system design questions.

OUTPUT FORMAT (use these exact section headers):

## APPROACH
[One-line summary of the approach - be specific about technologies and patterns]

## FUNCTIONAL
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## NON-FUNCTIONAL
- Scale: [specific numbers like 10M MAU, 100K req/sec]
- Latency: [target like <50ms p99]
- Availability: [target like 99.99% SLA]
- Consistency: [eventual/strong and why]
- Durability: [replication strategy]

## SCALE_MATH
- QPS: [calculation with reads/writes breakdown]
- Storage: [calculation per day/year]
- Bandwidth: [in/out calculations]
- Cache hit target: [percentage]
- Peak QPS: [peak numbers]

## ARCHITECTURE
\`\`\`
[Draw ASCII diagram with components like:]
Client -> CDN -> API Gateway -> Service -> DB
                              -> Cache
                              -> Queue -> Analytics
\`\`\`

## LAYER_DESIGN
1. Client: [description]
2. API Gateway: [description]
3. Core Service: [description]
4. Database: [description]
5. Cache: [description]
6. Queue: [description]

## EDGE_CASES
- [Case Name]: [How to handle it]
- [Case Name]: [How to handle it]

## TRADE_OFFS
- [Option A] vs. [Option B]: [Why you chose one, with "because:" reasoning]
- [Option A] vs. [Option B]: [Why you chose one, with "because:" reasoning]

RULES:
1. Be SPECIFIC with numbers (not "high scale" but "100K req/sec")
2. Include REAL technologies (Redis, Kafka, PostgreSQL, etc.)
3. Show the MATH for scale calculations
4. Cover failure modes in edge cases
5. Justify every trade-off with "because:"`;

    if (this.jobDescription) {
      prompt += `\n\n## Job Description Context:\n${this.jobDescription.slice(0, 2000)}`;
    }
    if (this.resume) {
      prompt += `\n\n## Candidate Resume:\n${this.resume.slice(0, 2000)}`;
    }
    if (this.prepMaterial) {
      prompt += `\n\n## Prep Notes:\n${this.prepMaterial.slice(0, 1500)}`;
    }

    return prompt;
  }

  /**
   * Stream the answer.
   *
   * SERVICE SEPARATION: ascend-backend does not spend Anthropic keys — Claude is
   * lumora-backend's model. This used to POST straight to api.anthropic.com,
   * which the SDK-based audits miss because it is a raw fetch.
   *
   * It was also already broken: the key it sent as `x-api-key` came from
   * `claudeService.getApiKey()`, and that function returns the GEMINI key
   * (services/claude.js:8) — so unless the caller passed `anthropicKey` in the
   * request body, every call here was a 401 dressed up as "Claude API error".
   * The BYO-key path is gone too: this service must not relay a caller's
   * Anthropic key either.
   */
  async _streamAnswer(systemPrompt, messages) {
    const apiKey = claudeService.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VOICE_MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: CONFIG.MAX_ANSWER_TOKENS,
            // Live voice answers are latency-critical; dynamic thinking would
            // sit in front of the first spoken token.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    let fullAnswer = '';
    const reader = response.body;

    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of reader) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const token = JSON.parse(data).candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (token) {
              fullAnswer += token;
              this.push('token', { t: token });
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }

    return fullAnswer;
  }

  /**
   * Process queued questions
   */
  _processQueue() {
    if (this.pendingQuestions.length === 0) return;
    if (this.state.busy) return;

    const nextQuestion = this.pendingQuestions.shift();
    if (nextQuestion) {
      this.askQuestion(nextQuestion);
    }
  }

  /**
   * Calibrate VAD threshold based on ambient noise
   */
  async calibrate(samples) {
    if (this.state.running) {
      return { ok: false, msg: 'Stop capture before calibrating' };
    }

    this.setStatus('calibrate', 'Measuring ambient noise...');

    // Calculate threshold from ambient samples
    if (samples && samples.length > 0) {
      const sorted = [...samples].sort((a, b) => a - b);
      const p85 = sorted[Math.floor(sorted.length * 0.85)] || CONFIG.VAD_THRESHOLD;
      const threshold = Math.max(p85 * 2.5, CONFIG.VAD_THRESHOLD);
      this.state.threshold = threshold;

      this.push('calibrate_done', { threshold });
      this.setStatus('ready', `Calibrated - threshold ${threshold.toFixed(4)}`);

      safeLog(`[Voice] Calibration done, threshold: ${threshold.toFixed(5)}`);
      return { ok: true, threshold };
    }

    return { ok: false, msg: 'No samples provided' };
  }

  /**
   * Reset conversation history
   */
  resetHistory() {
    this.history.clear();
    this.questionTracker.clear();
    this.setStatus('ready', 'Context reset - fresh session');
    safeLog(`[Voice] Session ${this.sessionId} history cleared`);
    return { ok: true };
  }

  /**
   * Update session options
   */
  updateOptions(options) {
    if (options.provider) this.provider = options.provider;
    if (options.model) this.model = options.model;
    if (options.jobDescription !== undefined) this.jobDescription = options.jobDescription;
    if (options.resume !== undefined) this.resume = options.resume;
    if (options.prepMaterial !== undefined) this.prepMaterial = options.prepMaterial;
    if (options.transcriptionProvider) this.transcriptionProvider = options.transcriptionProvider;
    if (options.openaiKey) this.openaiKey = options.openaiKey;
    if (options.deepgramKey) this.deepgramKey = options.deepgramKey;
  }

  /**
   * Get session state
   */
  getState() {
    return {
      sessionId: this.sessionId,
      audio: this.state.snapshot(),
      historyLength: this.history.messages.length,
      provider: this.provider,
      model: this.model,
      transcriptionProvider: this.transcriptionProvider,
    };
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.history.toArray();
  }

  /**
   * Cleanup session
   */
  destroy() {
    this.stop();
    this.history.clear();
    this.questionTracker.clear();
    safeLog(`[Voice] Session ${this.sessionId} destroyed`);
  }
}

/**
 * Get or create a voice session
 */
function getSession(sessionId, options = {}) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new VoiceSession(sessionId, options));
  }
  return sessions.get(sessionId);
}

/**
 * Destroy a session
 */
function destroySession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.destroy();
    sessions.delete(sessionId);
  }
}

/**
 * Get all active sessions
 */
function getActiveSessions() {
  return Array.from(sessions.keys());
}

export {
  VoiceSession,
  getSession,
  destroySession,
  getActiveSessions,
  CONFIG,
};
