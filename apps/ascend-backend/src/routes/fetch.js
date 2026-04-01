import { Router } from 'express';
import { fetchProblemFromUrl } from '../services/scraper.js';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { getCachedProblem, cacheProblem, getCacheStats } from '../services/problemCache.js';
import { safeLog } from '../services/utils.js';

const router = Router();

/**
 * Extract problem name from LeetCode URL
 * e.g., https://leetcode.com/problems/two-sum/ -> "two-sum"
 */
function extractProblemSlug(url) {
  const match = url.match(/leetcode\.com\/problems\/([^\/\?]+)/i);
  return match ? match[1] : null;
}

/**
 * POST /api/fetch
 * Fetch problem from URL with cache support
 *
 * Strategy:
 * 1. Check cache first (if LeetCode URL)
 * 2. If cached, return cached data
 * 3. If not cached, fetch from source, cache (if LeetCode), return
 */
router.post('/', validate('fetch'), async (req, res, next) => {
  try {
    const { url, skipCache } = req.body;
    const isLeetCode = url.includes('leetcode.com');
    const problemSlug = isLeetCode ? extractProblemSlug(url) : null;

    // 1. Check cache first (for LeetCode URLs only)
    if (isLeetCode && problemSlug && !skipCache) {
      const cached = await getCachedProblem(problemSlug);
      if (cached) {
        safeLog(`Returning cached problem: ${problemSlug}`);
        return res.json({
          success: true,
          problemText: cached.problemText,
          title: cached.title,
          difficulty: cached.difficulty,
          sourceUrl: url,
          fromCache: true,
        });
      }
    }

    // 2. Fetch from source
    // Pass electron platform cookies if available (for desktop app)
    const electronCookies = req.electronPlatformCookies || null;

    // Pass request context for user/device-scoped cookie lookup
    const result = await fetchProblemFromUrl(url, electronCookies, req);

    if (!result.success) {
      throw new AppError(
        result.error || 'Failed to fetch problem',
        ErrorCode.EXTERNAL_API_ERROR,
        { sourceUrl: result.sourceUrl }
      );
    }

    // 3. Cache the result (for LeetCode URLs only)
    if (isLeetCode && problemSlug && result.problemText) {
      await cacheProblem(problemSlug, {
        problemText: result.problemText,
        title: result.title || problemSlug,
        difficulty: result.difficulty,
        url: url,
      });
      safeLog(`Cached problem: ${problemSlug}`);
    }

    res.json({ ...result, fromCache: false });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(
      'Failed to fetch URL',
      ErrorCode.EXTERNAL_API_ERROR,
      error.message
    ));
  }
});

/**
 * GET /api/fetch/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fetch/cache/:slug
 * Get cached problem by slug
 */
router.get('/cache/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cached = await getCachedProblem(slug);

    if (cached) {
      res.json({ success: true, ...cached, fromCache: true });
    } else {
      res.json({ success: false, error: 'Problem not in cache' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;
