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
import { proxyToAIService } from '../services/aiServiceProxy.js';

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

router.post('/generate', async (req, res) => {
  try {
    const { question, cloud_provider = 'aws', detail_level } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: '"question" is required' });
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

    if (contentType.includes('application/json')) {
      const data = await upstream.json();
      return res.status(200).json({
        success: true,
        image_url: data.image ? `data:image/png;base64,${data.image}` : null,
        code: data.code || null,
      });
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

export default router;
