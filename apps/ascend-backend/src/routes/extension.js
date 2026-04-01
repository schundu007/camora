import { Router } from 'express';
import { optionalAuth } from '../middleware/authenticate.js';

const router = Router();

// Store connected SSE clients
const sseClients = new Set();

// SSE endpoint for frontend to listen for problems
router.get('/events', (req, res) => {
  // Set CORS headers for SSE — only allow known origins
  const origin = req.headers.origin || '';
  const allowed = origin.endsWith('.cariara.com') || origin === 'https://cariara.com' || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://') || origin.startsWith('http://localhost');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://capra.cariara.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Add client to set
  sseClients.add(res);
  console.log('[Extension] SSE client connected, total:', sseClients.size);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    console.log('[Extension] SSE client disconnected, total:', sseClients.size);
  });
});

// Endpoint to receive problems from Chrome extension
router.post('/problem', optionalAuth, (req, res) => {
  const { url, platform, problemType, problemText, timestamp } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[Extension] Problem received from ${platform}:`, url, 'type:', problemType, 'hasText:', !!problemText);

  // Broadcast to all connected SSE clients
  const message = JSON.stringify({
    type: 'problem',
    url,
    platform,
    problemType: problemType || 'coding',
    problemText: problemText || null,  // Include extracted text if available
    timestamp: timestamp || Date.now(),
  });

  let clientsNotified = 0;
  for (const client of sseClients) {
    try {
      client.write(`data: ${message}\n\n`);
      clientsNotified++;
    } catch (err) {
      // Client probably disconnected, remove it
      sseClients.delete(client);
    }
  }

  console.log(`[Extension] Notified ${clientsNotified} clients`);

  res.json({
    success: true,
    clientsNotified,
    message: clientsNotified > 0 ? 'Problem sent to Chundu' : 'No active Chundu windows',
  });
});

// Store platform cookies (synced from Chrome extension)
const platformCookies = {};

// Endpoint to receive cookies from Chrome extension
router.post('/cookies', optionalAuth, (req, res) => {
  const { platform, cookies, timestamp } = req.body;

  if (!platform || !cookies) {
    return res.status(400).json({ error: 'Platform and cookies are required' });
  }

  platformCookies[platform] = cookies;
  console.log(`[Extension] Received cookies for ${platform}, length: ${cookies.length}`);

  res.json({ success: true, platform, timestamp });
});

// Export function to get cookies (used by fetch route)
export function getExtensionPlatformCookies(platform) {
  return platformCookies[platform] || null;
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: sseClients.size,
    platformsWithCookies: Object.keys(platformCookies),
  });
});

export default router;
