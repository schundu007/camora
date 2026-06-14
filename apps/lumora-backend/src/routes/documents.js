/**
 * Document upload and management API routes.
 *
 * Stores prep documents in the lumora_user_documents PostgreSQL table.
 * Previously stored on the filesystem (prep_docs/{user_id}/) which was
 * ephemeral on Railway — documents were lost on every redeploy.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/authenticate.js';
import { query } from '../lib/shared-db.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = new Set(['.txt', '.docx', '.pdf', '.md']);

// ---------------------------------------------------------------------------
// Multer configuration (memory storage — content goes to DB, not disk)
// ---------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Unsupported file type: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`));
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sanitize a filename to prevent path-traversal and odd characters. */
function sanitizeFilename(raw) {
  return raw.replace(/[^\w\-.]/g, '_');
}

/** Parse uploaded file bytes into plain text. */
function parseDocument(filename, buffer) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.txt' || ext === '.md') {
    return buffer.toString('utf-8');
  }
  // Best-effort UTF-8 decode for .docx/.pdf (no native deps)
  return buffer.toString('utf-8');
}

/**
 * Keyword search across documents.
 * Port of Python DocumentStore.search — scores by weighted keyword frequency.
 */
function searchDocuments(documents, queryStr, maxResults = 5) {
  if (!documents.length) return [];

  const queryLower = queryStr.toLowerCase();
  const queryWords = new Set(queryLower.match(/\w+/g) || []);

  const scored = [];

  for (const doc of documents) {
    const contentLower = doc.content.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (word.length <= 2) continue;
      const regex = new RegExp(word, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        score += matches.length * word.length;
      }
    }

    if (score > 0) {
      const snippet = findBestSnippet(doc.content, queryWords, 500);
      scored.push({ filename: doc.filename, score, snippet });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

/** Find the most relevant snippet from content. */
function findBestSnippet(content, queryWords, maxLen = 500) {
  const lines = content.split('\n');
  const lineScores = [];

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (word.length > 2 && lineLower.includes(word)) {
        score++;
      }
    }
    if (score > 0) {
      lineScores.push({ score, line: line.trim() });
    }
  }

  if (lineScores.length === 0) {
    return content.slice(0, maxLen);
  }

  lineScores.sort((a, b) => b.score - a.score);

  const snippetLines = [];
  let totalLen = 0;
  for (const { line } of lineScores) {
    if (totalLen + line.length > maxLen) break;
    snippetLines.push(line);
    totalLen += line.length + 1;
  }

  return snippetLines.join('\n');
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /upload — Upload a preparation document.
 *
 * Accepts multipart/form-data with field name "file".
 * Max 5 MB, allowed types: .txt, .docx, .pdf, .md
 * Re-uploading the same filename replaces the existing document.
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (file.size === 0) {
      return res.status(400).json({ error: 'Empty file' });
    }

    const originalName = file.originalname || 'document.txt';
    const textContent = parseDocument(originalName, file.buffer);

    if (!textContent.trim()) {
      return res.status(400).json({ error: 'Could not extract text from document' });
    }

    // Sanitize and normalize extension to .txt
    let safeName = sanitizeFilename(originalName);
    const dotIdx = safeName.lastIndexOf('.');
    safeName = dotIdx > 0
      ? safeName.slice(0, dotIdx) + '.txt'
      : safeName + '.txt';

    await query(
      `INSERT INTO lumora_user_documents (user_id, filename, content, size)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, filename) DO UPDATE
         SET content = EXCLUDED.content, size = EXCLUDED.size, created_at = NOW()`,
      [req.user.id, safeName, textContent, textContent.length],
    );

    console.log(`user=${req.user.id} uploaded document len=${textContent.length} name=[REDACTED]`);

    res.json({
      success: true,
      filename: safeName,
      size: textContent.length,
      message: `Document '${originalName}' uploaded successfully`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /list — List user's uploaded documents.
 */
router.get('/list', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT filename, size, LEFT(content, 200) AS preview
         FROM lumora_user_documents
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.user.id],
    );

    const documents = result.rows.map((row) => ({
      filename: row.filename,
      size: row.size,
      preview: row.size > 200 ? row.preview + '...' : row.preview,
    }));

    res.json({ documents, count: documents.length });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /:filename — Delete a document.
 */
router.delete('/:filename', async (req, res, next) => {
  try {
    const safeName = sanitizeFilename(req.params.filename);

    const result = await query(
      `DELETE FROM lumora_user_documents WHERE user_id = $1 AND filename = $2 RETURNING id`,
      [req.user.id, safeName],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Document '${req.params.filename}' not found` });
    }

    console.log(`user=${req.user.id} deleted document`);
    res.json({ success: true, message: `Document '${req.params.filename}' deleted` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /search — Search documents by keyword.
 *
 * Body: { query: string }
 */
router.post('/search', async (req, res, next) => {
  try {
    const { query: searchQuery } = req.body;

    if (!searchQuery || typeof searchQuery !== 'string') {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await query(
      `SELECT filename, content FROM lumora_user_documents WHERE user_id = $1`,
      [req.user.id],
    );

    const results = searchDocuments(result.rows, searchQuery, 5);

    res.json({
      results: results.map((r) => ({
        filename: r.filename,
        score: r.score,
        snippet: r.snippet,
      })),
      count: results.length,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Multer error handler
// ---------------------------------------------------------------------------

router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  throw err;
});

export default router;
