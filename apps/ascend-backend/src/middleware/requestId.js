/**
 * Request ID middleware - attaches unique UUID to each request for tracing
 */

import { v4 as uuidv4 } from 'uuid';

export function requestId(req, res, next) {
  // Use existing request ID from header or generate new one
  const id = req.headers['x-request-id'] || uuidv4();

  // Attach to request object for use in other middleware/handlers
  req.requestId = id;

  // Set response header for client-side tracing
  res.setHeader('X-Request-Id', id);

  next();
}

export default requestId;
