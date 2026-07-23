/**
 * Diagram cache store — the durable home for generated architecture PNGs.
 *
 * `/tmp` is ephemeral on Railway: pythonDiagrams.cleanupOldDiagrams() deletes
 * rendered files after 10 minutes, and every redeploy wipes the volume. Any
 * caller that hands a client a `/static/diagrams/<file>.png` URL therefore
 * serves a 404 shortly after generation — which is exactly how prep-kit
 * system-design diagrams went blank (the kit is saved, then reopened later).
 *
 * The bytes live in `ascend_diagram_cache.image_data` instead, served publicly
 * from `/api/diagram/image/:hash` (see index.js). This module owns the cache
 * key format so the prep-kit path and the Design panel share cache rows
 * instead of drifting apart.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { query } from '../lib/shared-db.js';
import * as pythonDiagrams from './pythonDiagrams.js';

/** Hash a problem description into a stable cache key */
export function hashProblem(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/**
 * Build the cache key for a diagram. Every dimension that changes the rendered
 * image is part of the key, so an LRU-cache class diagram can't collide with a
 * Twitter system-architecture diagram, and overview/detailed get their own rows.
 */
export function cacheKeyFor({
  question,
  provider = 'auto',
  direction = 'LR',
  detailLevel = 'overview',
  designKind = 'system',
}) {
  return hashProblem(`${question}::${provider}::${direction}::${detailLevel}::${designKind}`);
}

/** Public URL for a stored diagram. Path-only — callers add an origin if needed. */
export function imageUrlFor(hash) {
  return `/api/diagram/image/${hash}`;
}

/**
 * Look up a previously stored diagram.
 * @returns {Promise<{ image_url: string } | null>} null on miss or DB error.
 */
export async function lookupDiagram(hash) {
  try {
    const cached = await query(
      'SELECT image_url FROM ascend_diagram_cache WHERE problem_hash = $1 AND image_data IS NOT NULL LIMIT 1',
      [hash]
    );
    return cached.rows[0] || null;
  } catch {
    // Table may not exist yet on a fresh DB — treat as a miss, never throw.
    return null;
  }
}

/**
 * Read a freshly rendered PNG off disk and persist it in the DB, then delete
 * the temp file. Returns the durable URL, or null if persistence failed.
 *
 * Callers MUST treat null as "no diagram" rather than falling back to the
 * `/static/diagrams/...` path — that URL is what broke in the first place.
 *
 * @param {object} opts
 * @param {string} opts.hash           cache key from cacheKeyFor()
 * @param {string} opts.staticImageUrl `/static/diagrams/<file>.png` from pythonDiagrams
 * @param {string} [opts.detailLevel]
 * @param {string} [opts.provider]
 * @param {string} [opts.direction]
 * @param {string} [opts.description]  human-readable label, truncated to 500 chars
 */
export async function persistDiagram({
  hash,
  staticImageUrl,
  detailLevel = 'overview',
  provider = 'auto',
  direction = 'LR',
  description = '',
}) {
  const filePath = path.join(pythonDiagrams.getOutputDir(), path.basename(staticImageUrl));
  const imageUrl = imageUrlFor(hash);

  try {
    const imageBuffer = fs.readFileSync(filePath);
    await query(
      `INSERT INTO ascend_diagram_cache (problem_hash, detail_level, cloud_provider, direction, image_url, image_data, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (problem_hash) DO UPDATE SET image_url = $5, image_data = $6`,
      [hash, detailLevel, provider, direction, imageUrl, imageBuffer, String(description).slice(0, 500)]
    );
    // Temp file is now redundant — the bytes are in the DB.
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    console.log('[DiagramStore] Stored diagram, hash:', hash, 'size:', imageBuffer.length);
    return imageUrl;
  } catch (err) {
    console.warn('[DiagramStore] Failed to persist diagram:', err.message);
    return null;
  }
}
