import { cacheGet, cacheSet, cacheDel } from './redis.js';
import { query } from '../config/database.js';

const REDIS_PREFIX = 'learn_topic:';
const REDIS_TTL = 30 * 24 * 60 * 60; // 30 days

export async function getTopicContent(slug) {
  // L1: Redis
  try {
    const hit = await cacheGet(REDIS_PREFIX + slug);
    if (hit) return { content: hit.content, cached: true };
  } catch {}

  // L2: Postgres
  try {
    const { rows } = await query(
      'SELECT content FROM ascend_learn_topic_cache WHERE slug = $1',
      [slug]
    );
    if (rows.length > 0) {
      // Warm Redis
      cacheSet(REDIS_PREFIX + slug, { content: rows[0].content }, REDIS_TTL).catch(() => {});
      return { content: rows[0].content, cached: true };
    }
  } catch {}

  return { content: null, cached: false };
}

export async function saveTopicContent(slug, content, meta = {}) {
  try {
    await query(
      `INSERT INTO ascend_learn_topic_cache (slug, content, title, source, category, level)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [slug, content, meta.title || slug, meta.source || '', meta.category || '', meta.level || '']
    );
    cacheSet(REDIS_PREFIX + slug, { content }, REDIS_TTL).catch(() => {});
  } catch (err) {
    console.error('[LearnTopicCache] save error:', err.message);
  }
}

export async function deleteTopicContent(slug) {
  await query('DELETE FROM ascend_learn_topic_cache WHERE slug = $1', [slug]);
  cacheDel(REDIS_PREFIX + slug).catch(() => {});
}
