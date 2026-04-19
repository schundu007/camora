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

// Daily diagram cap for paid users to prevent abuse
const PAID_DIAGRAM_DAILY_LIMIT = 50;
const dailyDiagramUsage = new Map();

function checkDailyDiagramLimit(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${today}`;
  const count = dailyDiagramUsage.get(key) || 0;
  if (count >= PAID_DIAGRAM_DAILY_LIMIT) return false;
  dailyDiagramUsage.set(key, count + 1);
  // Clean old entries daily
  if (dailyDiagramUsage.size > 10000) {
    for (const [k] of dailyDiagramUsage) {
      if (!k.endsWith(today)) dailyDiagramUsage.delete(k);
    }
  }
  return true;
}

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
    const isAdmin = req.user?.is_admin;
    if (userId && !isAdmin) {
      const canUse = await freeUsageService.canUseFeature(userId, 'design');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
      if (canUse.hasSubscription && !checkDailyDiagramLimit(userId)) {
        return res.status(429).json({ error: `Daily diagram limit reached (${PAID_DIAGRAM_DAILY_LIMIT}/day). Try again tomorrow.`, dailyLimitReached: true });
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

    // 1. Check DB cache first — cached diagrams cost nothing to serve
    const problemHash = hashProblem(`${cacheKey || question}::${provider}::${direction}::${detailLevel}`);
    try {
      const cached = await query(
        'SELECT image_url, mermaid_code FROM ascend_diagram_cache WHERE problem_hash = $1 AND (image_url IS NOT NULL OR image_data IS NOT NULL OR mermaid_code IS NOT NULL)',
        [problemHash]
      );
      if (cached.rows.length > 0) {
        console.log('[DiagramCache] Cache hit for hash:', problemHash);
        // Return mermaid code if that's what was cached
        if (cached.rows[0].mermaid_code) {
          return res.json({
            success: true,
            type: 'mermaid',
            mermaid_code: cached.rows[0].mermaid_code,
            cloud_provider: provider,
            cached: true,
          });
        }
        return res.json({
          success: true,
          image_url: cached.rows[0].image_url,
          cloud_provider: provider,
          cached: true,
        });
      }
    } catch { /* table might not exist yet */ }

    // 2. Check free usage — only for cache misses (actual generation costs money)
    const userId = req.user?.id;
    const isAdmin = req.user?.is_admin;
    if (userId && !isAdmin) {
      const canUse = await freeUsageService.canUseFeature(userId, 'design');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
      if (canUse.hasSubscription && !checkDailyDiagramLimit(userId)) {
        return res.status(429).json({ error: `Daily diagram limit reached (${PAID_DIAGRAM_DAILY_LIMIT}/day). Try again tomorrow.`, dailyLimitReached: true });
      }
    }

    // 3. Check if configured
    if (!pythonDiagrams.isConfigured()) {
      throw new AppError('Diagram generation not configured — ANTHROPIC_API_KEY is not set', ErrorCode.EXTERNAL_API_ERROR);
    }

    // 4. Try Python diagrams first, fall back to Mermaid code generation
    let pythonResult = null;
    let pythonError = null;
    try {
      pythonResult = await pythonDiagrams.generateDiagram({
        question,
        cloudProvider: provider,
        difficulty: difficulty || 'medium',
        category: category || 'System Design',
        format: format || 'png',
        detailLevel,
        direction,
      });
      if (!pythonResult.success) {
        pythonError = pythonResult.error || 'Diagram generation failed';
        pythonResult = null;
      }
    } catch (err) {
      pythonError = err.message || 'Python diagram generation failed';
      console.warn('[Diagram] Python generation failed, trying Mermaid fallback:', pythonError);
    }

    // Python failed — return error (no mermaid fallback)
    if (!pythonResult) {
      console.error('[Diagram] Python generation failed:', pythonError);
      throw new AppError(
        pythonError || 'Python diagram generation failed on server',
        ErrorCode.EXTERNAL_API_ERROR,
        'Check Railway logs for Python/graphviz errors'
      );
    }

    // 5. Read PNG into buffer and persist in DB (Python succeeded)
    const imageUrl = `/api/diagram/image/${problemHash}`;
    try {
      const filePath = path.join(pythonDiagrams.getOutputDir(), path.basename(pythonResult.image_url));
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
      return res.json({ ...pythonResult, cloud_provider: provider });
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
 * POST /api/diagram/lookup
 * Cache-only lookup — never generates. Returns cached diagram or 404.
 * Used by frontend during interviews to avoid expensive generation.
 */
router.post('/lookup', async (req, res) => {
  try {
    const { question, cloudProvider = 'auto', detailLevel = 'overview', direction = 'TB' } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    // Exact match: same question + provider + direction + detailLevel
    const exactHash = hashProblem(`${question}::${cloudProvider}::${direction}::${detailLevel}`);

    const exact = await query(
      'SELECT image_url, mermaid_code FROM ascend_diagram_cache WHERE problem_hash = $1 AND (image_url IS NOT NULL OR image_data IS NOT NULL OR mermaid_code IS NOT NULL) LIMIT 1',
      [exactHash]
    );

    if (exact.rows.length > 0) {
      console.log(`[DiagramLookup] Exact cache hit for: ${question.slice(0, 50)} (${direction}/${detailLevel})`);
      if (exact.rows[0].mermaid_code) {
        return res.json({ success: true, type: 'mermaid', mermaid_code: exact.rows[0].mermaid_code, cached: true });
      }
      return res.json({ success: true, image_url: exact.rows[0].image_url, cached: true });
    }

    console.log(`[DiagramLookup] No cache for: ${question.slice(0, 50)}`);
    res.json({ success: false, cached: false });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/**
 * GET /api/diagram/cache-stats
 * Debug: show what's in the diagram cache
 */
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT problem_hash, description, detail_level, cloud_provider, direction,
             image_url IS NOT NULL as has_url,
             image_data IS NOT NULL as has_data,
             mermaid_code IS NOT NULL as has_mermaid
      FROM ascend_diagram_cache
      ORDER BY problem_hash
      LIMIT 50
    `);
    res.json({ count: stats.rows.length, diagrams: stats.rows });
  } catch (err) {
    res.json({ error: err.message });
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
