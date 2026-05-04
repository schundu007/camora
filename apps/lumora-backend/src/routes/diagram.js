/**
 * Diagram generation proxy routes.
 *
 * Forwards architecture-diagram requests to the Python ai-services
 * microservice which uses the `diagrams` library to render cloud
 * architecture visuals.
 *
 * POST /generate – generate an architecture diagram
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { checkUsage, recordUsageCount } from '../middleware/usageLimits.js';
import { proxyToAIService } from '../services/aiServiceProxy.js';

// ---------------------------------------------------------------------------
// In-memory diagram cache — avoids redundant ai-services calls
// ---------------------------------------------------------------------------
const diagramCache = new Map();
const CACHE_MAX_SIZE = 200;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(question, provider, detailLevel) {
  const str = `${question}::${provider || 'auto'}::${detailLevel || 'overview'}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function getCachedDiagram(key) {
  const entry = diagramCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    diagramCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedDiagram(key, data) {
  // Evict oldest entry if at capacity
  if (diagramCache.size >= CACHE_MAX_SIZE) {
    const firstKey = diagramCache.keys().next().value;
    diagramCache.delete(firstKey);
  }
  diagramCache.set(key, { data, timestamp: Date.now() });
}

const router = Router();

// All diagram routes require authentication
router.use(authenticate);

/**
 * POST /generate
 *
 * Body:
 *   question       – the interview question / architecture prompt
 *   cloud_provider – "aws" | "gcp" | "azure" (default: "aws")
 *   detail_level   – "high" | "medium" | "low" (optional)
 */
// Map frontend detail levels to ai-services values
const DETAIL_LEVEL_MAP = {
  overview: 'low',
  detailed: 'high',
  // Also accept ai-services values directly
  high: 'high',
  medium: 'medium',
  low: 'low',
};

router.post('/generate', checkUsage('diagrams'), async (req, res) => {
  try {
    const { question, cloud_provider = 'aws', detail_level } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: '"question" is required' });
    }

    // Check in-memory cache first
    const cacheKey = getCacheKey(question, cloud_provider, detail_level);
    const cached = getCachedDiagram(cacheKey);
    if (cached) {
      console.log('[DiagramCache] Lumora cache hit');
      // Meter the cache hit too. The previous code returned early
      // here without calling recordUsageCount; only cache misses
      // (line ~115) counted. Free users could blow past the daily
      // diagrams cap as long as the question was cached. Increment
      // with zero LLM cost.
      try {
        if (req.user?.id) await recordUsageCount(req.user.id, 'diagrams');
      } catch { /* metering failures shouldn't break cache hits */ }
      return res.json(cached);
    }

    const payload = {
      question,
      cloud_provider,
      user_id: req.user.id,
    };
    if (detail_level) {
      payload.detail_level = DETAIL_LEVEL_MAP[detail_level] || detail_level;
    }

    const upstream = await proxyToAIService('/diagram/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({
        success: false,
        error: errData.detail || errData.error || 'Diagram generation failed',
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/json';

    // Increment diagram usage counter on success
    if (req.user?.id) await recordUsageCount(req.user.id, 'diagrams');

    if (contentType.includes('application/json')) {
      const data = await upstream.json();
      const responseData = {
        success: true,
        image_url: data.image ? `data:image/png;base64,${data.image}` : null,
        code: data.code || null,
      };
      // Cache the successful response
      setCachedDiagram(cacheKey, responseData);
      return res.status(200).json(responseData);
    }

    // Binary image — stream it through
    res.status(upstream.status).set('Content-Type', contentType);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    console.error('diagram generate proxy error:', err);
    return res.status(502).json({ success: false, error: 'Failed to reach ai-services' });
  }
});

/**
 * POST /render-dot
 *
 * Server-side Graphviz DOT renderer. Lets the frontend draw diagrams from
 * raw DOT source without shipping the heavy `mermaid` JS bundle. Used by
 * GraphvizDiagram on the answer surface — the long-term replacement for
 * the client-side Mermaid renderer.
 *
 * Body:
 *   dot     – Graphviz DOT source (max 16 KB)
 *   engine  – dot | neato | sfdp | … (default: dot)
 *   format  – svg | png (default: svg)
 *
 * Returns the ai-services response unchanged (`{ format, content, encoding }`).
 * Auth-gated like the rest of the diagram routes; no usage metering here —
 * rendering DOT is cheap, and the cost has already been spent generating
 * the source on the LLM side.
 */
router.post('/render-dot', async (req, res) => {
  try {
    const { dot, engine, format } = req.body || {};
    if (!dot || typeof dot !== 'string') {
      return res.status(400).json({ success: false, error: '"dot" is required' });
    }
    const upstream = await proxyToAIService('/diagram/render-dot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dot,
        engine: engine || 'dot',
        format: format || 'svg',
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: data.detail || data.error || 'DOT render failed',
      });
    }
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error('diagram render-dot proxy error:', err);
    return res.status(502).json({ success: false, error: 'Failed to reach ai-services' });
  }
});

export default router;
