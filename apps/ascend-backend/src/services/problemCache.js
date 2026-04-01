/**
 * Problem Description Cache Service
 *
 * Strategy:
 * 1. Check Redis cache first
 * 2. If not found, fetch from LeetCode and cache
 * 3. LeetCode URL is fallback only
 *
 * Cache key format: problem:<normalized_name>
 * TTL: 30 days (problem descriptions rarely change)
 */

import { cacheGet, cacheSet, cacheKeys } from './redis.js';
import { safeLog } from './utils.js';

const CACHE_PREFIX = 'problem:';
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Normalize problem name for cache key
 */
function normalizeKey(problemName) {
  return problemName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Get cached problem description
 * @param {string} problemName - Problem name (e.g., "Two Sum")
 * @returns {object|null} - Cached problem data or null
 */
export async function getCachedProblem(problemName) {
  const key = CACHE_PREFIX + normalizeKey(problemName);

  try {
    const cached = await cacheGet(key);
    if (cached) {
      safeLog(`Cache HIT for problem: ${problemName}`);
      return cached;
    }
    safeLog(`Cache MISS for problem: ${problemName}`);
  } catch (err) {
    safeLog(`Cache error for ${problemName}:`, err.message);
  }

  return null;
}

/**
 * Cache a problem description
 * @param {string} problemName - Problem name
 * @param {object} problemData - Problem data to cache
 */
export async function cacheProblem(problemName, problemData) {
  const key = CACHE_PREFIX + normalizeKey(problemName);

  try {
    await cacheSet(key, {
      ...problemData,
      cachedAt: Date.now(),
      name: problemName,
    }, CACHE_TTL);

    safeLog(`Cached problem: ${problemName}`);
    return true;
  } catch (err) {
    safeLog(`Failed to cache problem ${problemName}:`, err.message);
    return false;
  }
}

/**
 * Get problem from cache or fetch from LeetCode
 * @param {string} problemName - Problem name
 * @param {string} leetCodeUrl - LeetCode URL for fallback
 * @param {function} fetchFn - Function to fetch from LeetCode
 * @returns {object} - Problem data
 */
export async function getOrFetchProblem(problemName, leetCodeUrl, fetchFn) {
  // 1. Check cache first
  const cached = await getCachedProblem(problemName);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // 2. Fetch from LeetCode
  try {
    safeLog(`Fetching from LeetCode: ${problemName}`);
    const problemData = await fetchFn(leetCodeUrl);

    // 3. Cache the fetched data
    if (problemData && problemData.problemText) {
      await cacheProblem(problemName, {
        problemText: problemData.problemText,
        title: problemData.title || problemName,
        difficulty: problemData.difficulty,
        url: leetCodeUrl,
      });
    }

    return { ...problemData, fromCache: false };
  } catch (err) {
    safeLog(`Failed to fetch problem ${problemName}:`, err.message);
    throw err;
  }
}

/**
 * Get all cached problem names
 */
export async function getCachedProblemList() {
  try {
    const keys = await cacheKeys(CACHE_PREFIX + '*');
    return keys.map(k => k.replace(CACHE_PREFIX, ''));
  } catch (err) {
    safeLog('Failed to get cached problem list:', err.message);
    return [];
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats() {
  const keys = await getCachedProblemList();
  return {
    count: keys.length,
    problems: keys,
  };
}

export default {
  getCachedProblem,
  cacheProblem,
  getOrFetchProblem,
  getCachedProblemList,
  getCacheStats,
};
