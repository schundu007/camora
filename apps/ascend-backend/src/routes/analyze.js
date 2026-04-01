import { Router } from 'express';
import multer from 'multer';
import * as claude from '../services/claude.js';
import * as openai from '../services/openai.js';

// Safe logging that ignores EPIPE errors
function safeError(...args) {
  try {
    console.error(...args);
  } catch {
    // Ignore EPIPE and other write errors
  }
}

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      safeError('Multer error:', err);
      return res.status(400).json({
        error: 'Upload failed',
        details: err.message,
      });
    }
    next();
  });
};

router.post('/', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
      });
    }

    const { provider = 'claude', mode = 'extract', model } = req.body;
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const service = provider === 'openai' ? openai : claude;

    if (mode === 'extract') {
      const result = await service.extractText(base64Image, mimeType, model);
      res.json(result);
    } else {
      const result = await service.analyzeImage(base64Image, mimeType, model);
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message,
    });
  }
});

export default router;
