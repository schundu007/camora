import Redis from 'ioredis';

let redisClient = null;
const memoryCache = new Map();

export function initRedis() {
  const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
  if (!url) {
    console.log('[Redis] No REDIS_URL configured, using in-memory fallback');
    return null;
  }
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      commandTimeout: 1500,
    });
    redisClient.on('connect', () => console.log('[Redis] connected'));
    redisClient.on('error', (err) => console.warn('[Redis] error:', err.message));
  } catch (err) {
    console.warn('[Redis] init failed:', err.message);
    redisClient = null;
  }
  return redisClient;
}

export async function cacheGet(key) {
  if (redisClient) {
    try { return await redisClient.get(key); } catch { /* fall through */ }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) { memoryCache.delete(key); return null; }
  return entry.value;
}

export async function cacheSet(key, value, ttlSeconds) {
  if (redisClient) {
    try {
      if (ttlSeconds) await redisClient.set(key, value, 'EX', ttlSeconds);
      else await redisClient.set(key, value);
      return;
    } catch { /* fall through */ }
  }
  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function cacheDel(key) {
  if (redisClient) {
    try { await redisClient.del(key); return; } catch { /* fall through */ }
  }
  memoryCache.delete(key);
}
