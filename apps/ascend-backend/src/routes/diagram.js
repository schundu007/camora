import { Router } from 'express';
import * as eraser from '../services/eraser.js';
import * as pythonDiagrams from '../services/pythonDiagrams.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import * as freeUsageService from '../services/freeUsageService.js';

const router = Router();

/**
 * POST /api/diagram/eraser
 * Generate an architecture diagram using Eraser.io
 */
router.post('/eraser', async (req, res, next) => {
  try {
    // Check free usage for diagram generation
    const userId = req.user?.id;
    if (userId) {
      const canUse = await freeUsageService.canUseFeature(userId, 'design');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
    }

    const { description } = req.body;

    if (!description) {
      throw new AppError(
        'Description is required',
        ErrorCode.VALIDATION_ERROR,
        'Please provide a system design description'
      );
    }

    // Check if Eraser is configured
    if (!eraser.isConfigured()) {
      throw new AppError(
        'Eraser API not configured',
        ErrorCode.EXTERNAL_API_ERROR,
        'ERASER_API_KEY environment variable is not set'
      );
    }

    const result = await eraser.generateDiagram(description);

    res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        'Failed to generate diagram',
        ErrorCode.EXTERNAL_API_ERROR,
        error.message
      ));
    }
  }
});

/**
 * POST /api/diagram/generate
 * Generate a cloud architecture diagram using Python diagrams library
 */
router.post('/generate', async (req, res, next) => {
  // Set timeout for long-running diagram generation
  req.setTimeout(120000);
  res.setTimeout(120000);
  try {
    // Check free usage
    const userId = req.user?.id;
    if (userId) {
      const canUse = await freeUsageService.canUseFeature(userId, 'design');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
    }

    const { question, cloudProvider, difficulty, category, format, detailLevel, direction } = req.body;

    if (!question) {
      throw new AppError(
        'Question is required',
        ErrorCode.VALIDATION_ERROR,
        'Please provide a system design question'
      );
    }

    // Check if Python diagrams is configured
    if (!pythonDiagrams.isConfigured()) {
      throw new AppError(
        'Diagram generation not configured',
        ErrorCode.EXTERNAL_API_ERROR,
        'ANTHROPIC_API_KEY is not set'
      );
    }

    const result = await pythonDiagrams.generateDiagram({
      question,
      cloudProvider: cloudProvider || 'auto',
      difficulty: difficulty || 'medium',
      category: category || 'System Design',
      format: format || 'png',
      detailLevel: detailLevel || 'overview',  // 'overview' or 'detailed'
      direction: direction || 'LR'  // 'LR' or 'TB'
    });

    if (!result.success) {
      throw new AppError(
        'Diagram generation failed',
        ErrorCode.EXTERNAL_API_ERROR,
        result.error
      );
    }

    res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        'Failed to generate diagram',
        ErrorCode.EXTERNAL_API_ERROR,
        error.message
      ));
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
