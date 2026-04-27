/**
 * Redis Client Service
 *
 * Provides Redis connection for caching problem descriptions
 * Falls back to in-memory cache if Redis is unavailable
 */

import Redis from 'ioredis';
import { safeLog } from './utils.js';

let redisClient = null;
let isConnected = false;

// In-memory fallback cache
const memoryCache = new Map();

/**
 * Initialize Redis connection
 */
export function initRedis() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;

  if (!redisUrl) {
    safeLog('Redis URL not configured, using in-memory cache');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      // Hard ceiling per command. Without this, ioredis defaults to
      // unlimited and a slow/down Redis can hang the team-id-lookup path
      // inside hourBudgetGate, taking every AI route with it.
      commandTimeout: 1500,
    });

    redisClient.on('connect', () => {
      safeLog('Redis connected');
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      safeLog('Redis error:', err.message);
      isConnected = false;
    });

    redisClient.on('close', () => {
      safeLog('Redis connection closed');
      isConnected = false;
    });

    // Connect
    redisClient.connect().catch((err) => {
      safeLog('Redis connection failed:', err.message);
    });

    return redisClient;
  } catch (err) {
    safeLog('Failed to initialize Redis:', err.message);
    return null;
  }
}

/**
 * Get value from cache (Redis or memory fallback)
 */
export async function cacheGet(key) {
  try {
    if (redisClient && isConnected) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
  } catch (err) {
    safeLog('Redis get error:', err.message);
  }

  // Fallback to memory cache
  return memoryCache.get(key) || null;
}

/**
 * Set value in cache (Redis or memory fallback)
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 30 days)
 */
export async function cacheSet(key, value, ttl = 30 * 24 * 60 * 60) {
  const jsonValue = JSON.stringify(value);

  try {
    if (redisClient && isConnected) {
      await redisClient.setex(key, ttl, jsonValue);
      return true;
    }
  } catch (err) {
    safeLog('Redis set error:', err.message);
  }

  // Fallback to memory cache
  memoryCache.set(key, value);
  return true;
}

/**
 * Delete value from cache
 */
export async function cacheDel(key) {
  try {
    if (redisClient && isConnected) {
      await redisClient.del(key);
    }
  } catch (err) {
    safeLog('Redis del error:', err.message);
  }

  memoryCache.delete(key);
}

/**
 * Get all keys matching pattern
 */
export async function cacheKeys(pattern) {
  try {
    if (redisClient && isConnected) {
      return await redisClient.keys(pattern);
    }
  } catch (err) {
    safeLog('Redis keys error:', err.message);
  }

  // Fallback: filter memory cache keys
  return Array.from(memoryCache.keys()).filter(k =>
    k.includes(pattern.replace('*', ''))
  );
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected() {
  return isConnected;
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

export default {
  initRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheKeys,
  isRedisConnected,
  closeRedis,
};
