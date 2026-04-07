import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import * as eraser from '../services/eraser.js';
import * as pythonDiagrams from '../services/pythonDiagrams.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import * as freeUsageService from '../services/freeUsageService.js';
import { query } from '../lib/shared-db.js';

const router = Router();

/** Hash a problem description into a stable cache key */
function hashProblem(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/**
 * POST /api/diagram/eraser
 * Generate an architecture diagram using Eraser.io (with DB caching)
 */
router.post('/eraser', async (req, res, next) => {
  try {
    const { description, detailLevel = 'overview', cacheKey } = req.body;

    if (!description) {
      throw new AppError(
        'Description is required',
        ErrorCode.VALIDATION_ERROR,
        'Please provide a system design description'
      );
    }

    // Hash on stable cacheKey with eraser-specific dimensions
    const problemHash = hashProblem(`${cacheKey || description}::eraser::default::${detailLevel}`);

    // 1. Check cache first
    try {
      const cached = await query(
        'SELECT image_url, edit_url FROM ascend_diagram_cache WHERE problem_hash = $1',
        [problemHash]
      );
      if (cached.rows.length > 0) {
        console.log('[DiagramCache] Eraser cache hit for hash:', problemHash);
        return res.json({
          imageUrl: cached.rows[0].image_url,
          editUrl: cached.rows[0].edit_url,
          cached: true,
        });
      }
    } catch {
      // Cache lookup failed (table might not exist yet) — fall through to generate
    }

    // 2. Check free usage
    const userId = req.user?.id;
    if (userId) {
      const canUse = await freeUsageService.canUseFeature(userId, 'design');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
    }

    // 3. Check if Eraser is configured
    if (!eraser.isConfigured()) {
      throw new AppError(
        'Eraser API not configured',
        ErrorCode.EXTERNAL_API_ERROR,
        'ERASER_API_KEY environment variable is not set'
      );
    }

    // 4. Generate via Eraser API
    const result = await eraser.generateDiagram(description);

    // 5. Save to cache
    try {
      await query(
        `INSERT INTO ascend_diagram_cache (problem_hash, detail_level, image_url, edit_url, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (problem_hash) DO UPDATE SET image_url = $3, edit_url = $4`,
        [problemHash, detailLevel, result.imageUrl, result.editUrl || null, description.slice(0, 500)]
      );
    } catch (err) {
      console.warn('[DiagramCache] Failed to save:', err.message);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        error.message || 'Failed to generate diagram',
        ErrorCode.EXTERNAL_API_ERROR,
        error.message
      ));
    }
  }
});

/**
 * POST /api/diagram/generate
 * Generate a cloud architecture diagram using Python diagrams library (with DB caching)
 */
router.post('/generate', async (req, res, next) => {
  req.setTimeout(120000);
  res.setTimeout(120000);
  try {
    const { question, cloudProvider, difficulty, category, format, detailLevel = 'overview', direction = 'LR', cacheKey } = req.body;
    const provider = cloudProvider || 'auto';

    if (!question) {
      throw new AppError('Question is required', ErrorCode.VALIDATION_ERROR);
    }

    // 1. Check DB cache first (hash includes all dimensions)
    const problemHash = hashProblem(`${cacheKey || question}::${provider}::${direction}::${detailLevel}`);
    try {
      const cached = await query(
        'SELECT image_url FROM ascend_diagram_cache WHERE problem_hash = $1 AND image_data IS NOT NULL',
        [problemHash]
      );
      if (cached.rows.length > 0) {
        console.log('[DiagramCache] Cache hit for hash:', problemHash);
        return res.json({
          success: true,
          image_url: cached.rows[0].image_url,
          cloud_provider: provider,
          cached: true,
        });
      }
    } catch { /* table might not exist yet */ }

    // 2. Check free usage
    const userId = req.user?.id;
    if (userId) {
      const canUse = await freeUsageService.canUseFeature(userId, 'design');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
    }

    // 3. Check if configured
    if (!pythonDiagrams.isConfigured()) {
      throw new AppError('Diagram generation not configured — ANTHROPIC_API_KEY is not set', ErrorCode.EXTERNAL_API_ERROR);
    }

    // 4. Generate
    const result = await pythonDiagrams.generateDiagram({
      question,
      cloudProvider: provider,
      difficulty: difficulty || 'medium',
      category: category || 'System Design',
      format: format || 'png',
      detailLevel,
      direction,
    });

    if (!result.success) {
      throw new AppError(result.error || 'Diagram generation failed', ErrorCode.EXTERNAL_API_ERROR);
    }

    // 5. Read PNG into buffer and persist in DB
    const imageUrl = `/api/diagram/image/${problemHash}`;
    try {
      const filePath = path.join(pythonDiagrams.getOutputDir(), path.basename(result.image_url));
      const imageBuffer = fs.readFileSync(filePath);
      await query(
        `INSERT INTO ascend_diagram_cache (problem_hash, detail_level, cloud_provider, direction, image_url, image_data, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (problem_hash) DO UPDATE SET image_url = $5, image_data = $6`,
        [problemHash, detailLevel, provider, direction, imageUrl, imageBuffer, (cacheKey || question).slice(0, 500)]
      );
      // Clean up temp file — image is now in DB
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      console.log('[DiagramCache] Stored in DB, hash:', problemHash, 'size:', imageBuffer.length);
    } catch (err) {
      console.warn('[DiagramCache] Failed to persist image:', err.message);
      // Fall back to temp file URL if DB storage fails
      return res.json({ ...result, cloud_provider: provider });
    }

    res.json({ success: true, image_url: imageUrl, cloud_provider: provider, cached: false });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(error.message || 'Failed to generate diagram', ErrorCode.EXTERNAL_API_ERROR, error.message));
    }
  }
});

/**
 * GET /api/diagram/status
 * Check if diagram services are configured
 */
router.get('/status', (req, res) => {
  res.json({
    eraser: eraser.isConfigured(),
    pythonDiagrams: pythonDiagrams.isConfigured()
  });
});

/**
 * GET /api/diagram/debug
 * Debug endpoint to check Python/graphviz installation
 */
router.get('/debug', async (req, res) => {
  const { spawn } = await import('child_process');
  const results = {
    python: { available: false, version: null, error: null },
    graphviz: { available: false, version: null, error: null },
    diagrams: { available: false, error: null },
    diagramEnginePath: pythonDiagrams.getOutputDir ? pythonDiagrams.getOutputDir() : 'unknown'
  };

  // Check Python
  try {
    const python = spawn('python3', ['--version']);
    let stdout = '';
    let stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      python.on('close', (code) => {
        results.python.available = code === 0;
        results.python.version = (stdout || stderr).trim();
        resolve();
      });
      python.on('error', (err) => {
        results.python.error = err.message;
        resolve();
      });
    });
  } catch (e) {
    results.python.error = e.message;
  }

  // Check graphviz (dot command)
  try {
    const dot = spawn('dot', ['-V']);
    let stderr = '';
    dot.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      dot.on('close', (code) => {
        results.graphviz.available = code === 0;
        results.graphviz.version = stderr.trim();
        resolve();
      });
      dot.on('error', (err) => {
        results.graphviz.error = err.message;
        resolve();
      });
    });
  } catch (e) {
    results.graphviz.error = e.message;
  }

  // Check diagrams library
  try {
    const python = spawn('python3', ['-c', 'import diagrams; print("OK")']);
    let stdout = '';
    let stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    await new Promise((resolve) => {
      python.on('close', (code) => {
        results.diagrams.available = code === 0 && stdout.includes('OK');
        if (stderr) results.diagrams.error = stderr.trim();
        resolve();
      });
      python.on('error', (err) => {
        results.diagrams.error = err.message;
        resolve();
      });
    });
  } catch (e) {
    results.diagrams.error = e.message;
  }

  res.json(results);
});

export default router;
