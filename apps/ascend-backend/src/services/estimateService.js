import { query } from '../lib/shared-db.js';
import { logger } from '../middleware/requestLogger.js';

// Static fallbacks — used until we have enough samples to compute a median.
// Rough but useful: each value is ≈ a typical successful call's seconds.
const SURFACE_FALLBACK_SECONDS = {
  lumora_inference: 15,
  lumora_transcribe: 5,
  capra_solve: 30,
  capra_design: 60,
  capra_extract: 8,
  capra_analyze: 20,
  capra_diagram: 45,
  capra_job_analyze: 25,
  capra_prep: 120,
};

const MIN_SAMPLES_FOR_MEDIAN = 5;
const SAMPLE_LOOKBACK_DAYS = 30;
const ESTIMATE_CACHE_TTL_MS = 60 * 1000;
const _cache = new Map();

/**
 * Estimated seconds a call to `surface` will consume. Computed from the
 * median of the user's last 30 days of calls when ≥5 samples exist; falls
 * back to per-surface constants otherwise. Cached in-process for 60s so
 * the budget endpoint stays cheap under repeated polling.
 */
export async function getSurfaceEstimate(surface, userId) {
  const fallback = SURFACE_FALLBACK_SECONDS[surface] || 30;
  if (!userId) return { estimate_seconds: fallback, sample_size: 0, source: 'fallback' };

  const cacheKey = `${userId}:${surface}`;
  const cached = _cache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt) < ESTIMATE_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const r = await query(
      `SELECT
         COUNT(*) AS n,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds) AS median
       FROM ai_hours_usage
        WHERE user_id = $1
          AND surface = $2
          AND created_at >= NOW() - ($3 || ' days')::INTERVAL
          AND seconds > 0`,
      [userId, surface, String(SAMPLE_LOOKBACK_DAYS)],
    );
    const n = Number(r.rows[0]?.n || 0);
    const median = Number(r.rows[0]?.median || 0);

    let value;
    if (n >= MIN_SAMPLES_FOR_MEDIAN && median > 0) {
      value = { estimate_seconds: median, sample_size: n, source: 'user_median' };
    } else {
      // Try fleet-wide median for this surface so a power user with no prior
      // history still gets a real-ish estimate instead of a static fallback.
      const fleet = await query(
        `SELECT
           COUNT(*) AS n,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seconds) AS median
         FROM ai_hours_usage
          WHERE surface = $1
            AND created_at >= NOW() - ($2 || ' days')::INTERVAL
            AND seconds > 0`,
        [surface, String(SAMPLE_LOOKBACK_DAYS)],
      );
      const fn = Number(fleet.rows[0]?.n || 0);
      const fmedian = Number(fleet.rows[0]?.median || 0);
      if (fn >= MIN_SAMPLES_FOR_MEDIAN * 4 && fmedian > 0) {
        value = { estimate_seconds: fmedian, sample_size: fn, source: 'fleet_median' };
      } else {
        value = { estimate_seconds: fallback, sample_size: 0, source: 'fallback' };
      }
    }
    _cache.set(cacheKey, { value, cachedAt: Date.now() });
    return value;
  } catch (err) {
    logger.warn({ err: err.message, userId, surface }, '[estimate] lookup failed');
    return { estimate_seconds: fallback, sample_size: 0, source: 'fallback' };
  }
}

export const SUPPORTED_SURFACES = Object.keys(SURFACE_FALLBACK_SECONDS);
