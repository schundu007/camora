/**
 * Request ID middleware — attaches a UUID to req / the response header so a
 * single request can be traced through logs end-to-end (both backends plus,
 * eventually, the frontend which can echo X-Request-Id back).
 *
 * Mirrors apps/ascend-backend/src/middleware/requestId.js. Should move into a
 * shared package along with requestLogger in a later consolidation pass.
 */

import { v4 as uuidv4 } from 'uuid';

export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

export default requestId;
