import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { getApiKey as getOpenAIKey } from '../services/openai.js';
import { getApiKey as getDeepgramKey } from '../services/deepgram.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (Whisper API limit)
});

// Map mimetypes to file extensions that Whisper accepts
function getFileExtension(mimetype, originalFilename) {
  // First, try to get extension from original filename if provided
  if (originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase().replace('.', '');
    const validExtensions = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    if (validExtensions.includes(ext)) {
      return ext;
    }
  }

  const mimeMap = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/m4a': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/oga': 'oga',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'video/webm': 'webm',  // Some browsers report video/webm for audio-only webm
    'video/mp4': 'm4a',
  };

  // Normalize mimetype (remove spaces, lowercase)
  const normalizedMime = (mimetype || '').toLowerCase().trim();

  // Check for exact match first
  if (mimeMap[normalizedMime]) {
    return mimeMap[normalizedMime];
  }

  // Check for partial match (e.g., 'audio/webm;codecs=opus')
  for (const [mime, ext] of Object.entries(mimeMap)) {
    const baseMime = mime.split(';')[0];
    if (normalizedMime.startsWith(baseMime)) {
      return ext;
    }
  }

  // Check if mimetype contains a known format hint
  if (normalizedMime.includes('webm')) return 'webm';
  if (normalizedMime.includes('ogg') || normalizedMime.includes('opus')) return 'ogg';
  if (normalizedMime.includes('mp4') || normalizedMime.includes('m4a')) return 'm4a';
  if (normalizedMime.includes('mp3') || normalizedMime.includes('mpeg')) return 'mp3';
  if (normalizedMime.includes('wav')) return 'wav';
  if (normalizedMime.includes('flac')) return 'flac';

  return 'webm'; // default - widely supported
}

// Transcribe using Deepgram REST API
async function transcribeWithDeepgram(buffer, mimetype) {
  const apiKey = getDeepgramKey();
  if (!apiKey) {
    throw new AppError('Deepgram API key not configured', ErrorCode.UNAUTHORIZED);
  }

  const url = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&punctuate=true';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': mimetype || 'audio/webm',
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`Deepgram error: ${response.status} ${errorText}`, ErrorCode.INTERNAL_ERROR);
  }

  const result = await response.json();
  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  return transcript;
}

// Transcribe using OpenAI Whisper
async function transcribeWithWhisper(buffer, mimetype, originalname) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new AppError('OpenAI API key not configured', ErrorCode.UNAUTHORIZED);
  }

  const extension = getFileExtension(mimetype, originalname);
  const filename = `audio_${Date.now()}.${extension}`;
  const tempFilePath = path.join(os.tmpdir(), filename);

  try {
    fs.writeFileSync(tempFilePath, buffer);
    console.log('[Transcribe] Wrote temp file:', tempFilePath, 'size:', buffer.length);

    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    });

    return transcription;
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// POST /api/transcribe - Transcribe audio using Whisper or Deepgram
// Query param: provider=openai (default) or provider=deepgram
router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No audio file provided', ErrorCode.VALIDATION_ERROR);
    }

    const provider = req.query.provider || req.body.provider || 'openai';

    console.log('[Transcribe] Received file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      provider,
    });

    let transcription;

    if (provider === 'deepgram') {
      console.log('[Transcribe] Using Deepgram Nova-2');
      transcription = await transcribeWithDeepgram(req.file.buffer, req.file.mimetype);
    } else {
      console.log('[Transcribe] Using OpenAI Whisper');
      const extension = getFileExtension(req.file.mimetype, req.file.originalname);
      console.log('[Transcribe] Detected extension:', extension, 'from mimetype:', req.file.mimetype, 'originalname:', req.file.originalname);
      transcription = await transcribeWithWhisper(req.file.buffer, req.file.mimetype, req.file.originalname);
    }

    console.log('[Transcribe] Success, text length:', transcription?.length);

    res.json({
      success: true,
      text: transcription,
      provider,
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error.message, error.status, error.code);
    next(new AppError(
      'Failed to transcribe audio',
      ErrorCode.INTERNAL_ERROR,
      error.message
    ));
  }
});

export default router;
