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
router.post('/generate', async (req, res) => {
  try {
    const { question, cloud_provider = 'aws', detail_level } = req.body;

    if (!question) {
      return res.status(400).json({ error: '"question" is required' });
    }

    const payload = {
      question,
      cloud_provider,
      user_id: req.user.id,
    };
    if (detail_level) {
      payload.detail_level = detail_level;
    }

    const upstream = await proxyToAIService('/diagram/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // The upstream may return JSON (with a base64 image) or a binary image.
    // Mirror the content-type so the frontend can handle either format.
    const contentType = upstream.headers.get('content-type') || 'application/json';

    if (contentType.includes('application/json')) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    // Binary image — stream it through
    res.status(upstream.status).set('Content-Type', contentType);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    console.error('diagram generate proxy error:', err);
    return res.status(502).json({ error: 'Failed to reach ai-services' });
  }
});

export default router;
