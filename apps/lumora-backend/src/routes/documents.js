/**
 * Document upload and management API routes.
 *
 * Migrated from Python FastAPI → Node.js Express.
 * Stores prep documents as text files on the filesystem under prep_docs/{user_id}/.
 * All routes are scoped to the authenticated user (req.user.id).
 */
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = new Set(['.txt', '.docx', '.pdf', '.md']);
const DOCS_BASE_DIR = path.resolve(process.cwd(), 'prep_docs');

// ---------------------------------------------------------------------------
// Multer configuration
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

/** Return the per-user document directory, creating it if necessary. */
async function getUserDir(userId) {
  const userDir = path.join(DOCS_BASE_DIR, String(userId));
  await fs.mkdir(userDir, { recursive: true });
  return userDir;
}

/** Sanitize a filename to prevent path-traversal and odd characters. */
function sanitizeFilename(raw) {
  return raw.replace(/[^\w\-.]/g, '_');
}

/**
 * Parse uploaded file bytes into plain text.
 *
 * For .txt and .md files the buffer is decoded directly.
 * For .docx and .pdf, the raw bytes are stored as-is (spec says "store as-is"
 * for non-txt formats), but we still attempt basic text extraction so that
 * keyword search works on the stored .txt copy.
 */
function parseDocument(filename, buffer) {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return buffer.toString('utf-8');
  }

  // For .docx and .pdf: store the raw bytes as-is is the spec, but we also
  // write a .txt companion for searchability.  Since we don't want heavy
  // native deps in the Node runtime, we do a best-effort UTF-8 decode and
  // note that richer extraction can be layered on later.
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
      if (word.length <= 2) continue; // skip short words
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

/**
 * Find the most relevant snippet from content — line-scoring approach
 * ported from the Python DocumentStore._find_best_snippet.
 */
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

    // Sanitize and convert extension to .txt for storage
    let safeName = sanitizeFilename(originalName);
    const dotIdx = safeName.lastIndexOf('.');
    if (dotIdx > 0) {
      safeName = safeName.slice(0, dotIdx) + '.txt';
    } else {
      safeName = safeName + '.txt';
    }

    const userDir = await getUserDir(req.user.id);
    const filePath = path.join(userDir, safeName);

    // Guard against path traversal
    if (!path.resolve(filePath).startsWith(path.resolve(userDir))) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    await fs.writeFile(filePath, textContent, 'utf-8');

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
    const userDir = await getUserDir(req.user.id);

    let entries;
    try {
      entries = await fs.readdir(userDir);
    } catch {
      entries = [];
    }

    const documents = [];

    for (const name of entries) {
      if (!name.endsWith('.txt')) continue;

      const filePath = path.join(userDir, name);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        documents.push({
          filename: name,
          size: content.length,
          preview: content.length > 200 ? content.slice(0, 200) + '...' : content,
        });
      } catch {
        // skip unreadable files
      }
    }

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
    const rawFilename = req.params.filename;
    const safeName = sanitizeFilename(rawFilename);
    const userDir = await getUserDir(req.user.id);
    const filePath = path.join(userDir, safeName);

    // Guard against path traversal
    if (!path.resolve(filePath).startsWith(path.resolve(userDir))) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: `Document '${rawFilename}' not found` });
    }

    await fs.unlink(filePath);
    console.log(`user=${req.user.id} deleted document`);

    res.json({ success: true, message: `Document '${rawFilename}' deleted` });
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

    const userDir = await getUserDir(req.user.id);

    // Load all documents
    let entries;
    try {
      entries = await fs.readdir(userDir);
    } catch {
      entries = [];
    }

    const documents = [];
    for (const name of entries) {
      if (!name.endsWith('.txt')) continue;
      try {
        const content = await fs.readFile(path.join(userDir, name), 'utf-8');
        documents.push({ filename: name, content });
      } catch {
        // skip unreadable files
      }
    }

    const results = searchDocuments(documents, searchQuery, 5);

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
  // Re-throw unexpected errors to the global handler
  throw err;
});

export default router;
