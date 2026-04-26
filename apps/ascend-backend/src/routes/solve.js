import { Router } from 'express';
import crypto from 'node:crypto';
import * as claude from '../services/claude.js';
import * as openai from '../services/openai.js';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import * as usageService from '../services/usageService.js';
import { verifyJWT } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';
import * as freeUsageService from '../services/freeUsageService.js';
import { logger } from '../middleware/requestLogger.js';
import { awardXP } from '../services/gamificationService.js';
import { cacheGet, cacheSet } from '../services/redis.js';
import { recordTokens, shouldThrottleLegacyPro } from '../services/aiHoursMeter.js';

const router = Router();

// Daily solve cap for paid users to prevent abuse
const PAID_DAILY_LIMIT = 15;

// ──────────────────────────────────────────────────────────────────
// Redis-backed full-answer cache
//
// Keyed by a hash of (problem, language, ascendMode, detailLevel) —
// intentionally NOT by model, so a sonnet-quality answer generated
// once gets served to every subsequent caller (including free-plan
// haiku users). TTL 30 days; rewritten on every miss.
//
// A separate offline precompute script can populate this cache with
// the top 100 interview problems so cold-start hits are near-instant
// for the most common questions. Same key format.
// ──────────────────────────────────────────────────────────────────
const ANSWER_CACHE_TTL_SEC = 30 * 24 * 60 * 60;
const ANSWER_CACHE_PREFIX = 'solve:answer:v1:';

function answerCacheKey({ problem, language, ascendMode, detailLevel, designDetailLevel }) {
  const normalized = [
    (problem || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 2000),
    (language || 'auto').toLowerCase(),
    ascendMode || 'coding',
    ascendMode === 'system-design' ? (designDetailLevel || 'basic') : (detailLevel || 'detailed'),
  ].join('::');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 24);
  return `${ANSWER_CACHE_PREFIX}${hash}`;
}

async function checkDailySolveLimit(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `solve_daily:${userId}:${today}`;
  const count = (await cacheGet(key)) || 0;
  if (count >= PAID_DAILY_LIMIT) return false;
  // Increment and store with 24-hour TTL
  await cacheSet(key, count + 1, 86400);
  return true;
}

// In-memory cache for coding solutions to avoid repeated Claude API calls
const solutionCache = new Map();
const CACHE_MAX = 500;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSolutionCacheKey(problem, language) {
  const str = `${problem}::${language || 'python'}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return hash.toString(36);
}

router.post('/', validate('solve'), async (req, res, next) => {
  try {
    const { problem, provider = 'claude', language = 'auto', fast = true, model } = req.body;

    // Check free usage for webapp users
    const userId = req.user?.id;
    if (userId) {
      const canUse = await freeUsageService.canUseFeature(userId, 'coding');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
      // Paid users: daily cap to prevent abuse
      if (canUse.hasSubscription && !(await checkDailySolveLimit(userId))) {
        return res.status(429).json({ error: 'Daily solve limit reached (15/day). Try again tomorrow.', dailyLimitReached: true });
      }
    }

    // Select model based on user plan — free users get Haiku, paid users get Sonnet
    let userModel = model;
    if (!userModel && userId && provider === 'claude') {
      const subStatus = await freeUsageService.getSubscriptionStatus(userId);
      userModel = (subStatus.hasSubscription)
        ? 'claude-sonnet-4-20250514'
        : 'claude-haiku-4-5-20251001';
    }

    // Check cache for non-streaming solve
    const cacheKey = getSolutionCacheKey(problem, language);
    const cached = solutionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug({ cacheKey }, 'Returning cached solution');
      return res.json(cached.data);
    }

    const service = provider === 'openai' ? openai : claude;
    const result = await service.solveProblem(problem, language, fast, userModel);

    // Cache the result
    if (solutionCache.size >= CACHE_MAX) {
      const firstKey = solutionCache.keys().next().value;
      solutionCache.delete(firstKey);
    }
    solutionCache.set(cacheKey, { data: result, timestamp: Date.now() });

    if (userId) {
      awardXP(userId, 'coding_solve').catch(() => {});
      recordTokens({
        userId,
        surface: 'capra_solve',
        tokensIn: Math.ceil((problem || '').length / 4),
        tokensOut: Math.ceil(JSON.stringify(result || {}).length / 4),
        model: userModel,
      });
    }

    res.json(result);
  } catch (error) {
    next(new AppError(
      'Failed to solve problem',
      ErrorCode.EXTERNAL_API_ERROR,
      error.message
    ));
  }
});

// Streaming endpoint for faster perceived response
router.post('/stream', validate('solve'), async (req, res, next) => {
  try {
    const { problem, provider = 'claude', language = 'auto', detailLevel = 'detailed', model, ascendMode = 'coding', designDetailLevel = 'basic', autoSwitch = false } = req.body;

    logger.debug({ ascendMode, designDetailLevel, provider, autoSwitch, language, detailLevel }, 'Solve stream request params');

    // Check for webapp user (JWT auth) and verify subscription + usage allowance.
    // Resolve token from Authorization header OR cariara_sso cookie so a SPA
    // fetch with only the httpOnly cookie still gets recognised.
    let webappUserId = null;
    const authHeader = req.headers.authorization;
    let resolvedToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      resolvedToken = authHeader.substring(7);
    }
    if (!resolvedToken && req.cookies?.cariara_sso) {
      resolvedToken = req.cookies.cariara_sso;
    }

    if (resolvedToken) {
      try {
        const token = resolvedToken;
        const decoded = await verifyJWT(token);
        if (decoded && decoded.id) {
          webappUserId = decoded.id;
          logger.debug({ userId: webappUserId }, 'Webapp user detected');

          // Check subscription OR free usage (freemium model)
          const featureType = ascendMode === 'system-design' ? 'design' : 'coding';
          const canUseResult = await freeUsageService.canUseFeature(webappUserId, featureType);
          logger.debug({ userId: webappUserId, featureType, result: canUseResult }, 'Feature access check');

          if (!canUseResult.allowed) {
            logger.info({ userId: webappUserId, reason: canUseResult.reason }, 'Feature access denied');
            res.setHeader('Content-Type', 'text/event-stream');
            res.write(`data: ${JSON.stringify({
              error: canUseResult.reason || 'Free trial exhausted. Please subscribe to continue.',
              freeTrialExhausted: canUseResult.freeTrialExhausted || false,
              subscriptionRequired: true,
              freeUsed: canUseResult.freeUsed,
              freeLimit: canUseResult.freeLimit,
              upgradeUrl: '/pricing'
            })}\n\n`);
            res.end();
            return;
          }
          // Paid users: daily cap to prevent abuse
          if (canUseResult.hasSubscription && !(await checkDailySolveLimit(webappUserId))) {
            logger.info({ userId: webappUserId }, 'Daily solve limit reached');
            res.setHeader('Content-Type', 'text/event-stream');
            res.write(`data: ${JSON.stringify({
              error: 'Daily solve limit reached (15/day). Try again tomorrow.',
              dailyLimitReached: true
            })}\n\n`);
            res.end();
            return;
          }

          logger.debug({
            userId: webappUserId,
            hasSubscription: canUseResult.hasSubscription,
            freeRemaining: canUseResult.freeRemaining,
            planType: canUseResult.planType
          }, 'Feature access granted');
        }
      } catch (jwtError) {
        // JWT verification failed — reject request (Electron support removed)
        logger.warn({ error: jwtError.message }, 'JWT verification failed in solve stream');
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ error: 'Authentication failed. Please log in again.' })}\n\n`);
        res.end();
        return;
      }
    }

    // Reject unauthenticated requests that somehow passed middleware
    if (!webappUserId) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ error: 'Authentication required.' })}\n\n`);
      res.end();
      return;
    }

    // Select model based on user plan — free users get Haiku, paid users get Sonnet
    let userModel = model;
    let userPlanType = null;
    let throttledByFairUse = false;
    if (!userModel && provider === 'claude') {
      const userId = webappUserId || req.user?.id;
      if (userId) {
        const subStatus = await freeUsageService.getSubscriptionStatus(userId);
        userPlanType = subStatus.planType;
        userModel = (subStatus.hasSubscription)
          ? 'claude-sonnet-4-20250514'
          : 'claude-haiku-4-5-20251001';
        // Legacy unlimited Pro fair-use cap: 60h/30d → fall back to Haiku.
        // Protects margin on grandfathered $49 unlimited subscribers.
        if (subStatus.hasSubscription && await shouldThrottleLegacyPro(userId, subStatus.planType)) {
          userModel = 'claude-haiku-4-5-20251001';
          throttledByFairUse = true;
          logger.info({ userId, planType: subStatus.planType }, 'Legacy fair-use cap engaged');
        }
        logger.debug({ userId, model: userModel, hasSubscription: subStatus.hasSubscription, throttledByFairUse }, 'Model selected based on plan');
      }
    }
    if (throttledByFairUse) res.setHeader('X-Fair-Use-Throttled', '1');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    req.setTimeout(120000);

    // ── Answer-cache lookup ───────────────────────────────────────
    // If this exact question (same language / mode / detailLevel) has
    // been solved before, we skip the LLM entirely and replay the
    // full cached structured answer. We still deduct usage so the
    // paywall/limit accounting stays correct.
    const cacheKey = answerCacheKey({ problem, language, ascendMode, detailLevel, designDetailLevel });
    try {
      const cached = await cacheGet(cacheKey);
      if (cached && typeof cached === 'object' && (cached.code || cached.approaches || cached.systemDesign)) {
        logger.info({ cacheKey }, 'solve/stream cache HIT — serving precomputed answer');
        // Emit a single synthetic chunk so the frontend's progress UI
        // doesn't flicker, then the final done event with the full
        // parsed result. No tokens are streamed char-by-char because
        // we have the whole answer already.
        res.write(`data: ${JSON.stringify({ chunk: '', partial: true, provider: 'cache' })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, result: cached, fromCache: true })}\n\n`);

        // Still deduct usage — hitting cache does not grant free solves.
        if (webappUserId) {
          try {
            const featureType = ascendMode === 'system-design' ? 'design' : 'coding';
            const subStatus = await freeUsageService.getSubscriptionStatus(webappUserId);
            if (subStatus.hasSubscription) {
              if (ascendMode === 'system-design') await usageService.useSystemDesign(webappUserId);
              else await usageService.useCoding(webappUserId);
            } else {
              await freeUsageService.useFreeAllowance(webappUserId, featureType);
            }
          } catch (usageErr) {
            logger.warn({ error: usageErr.message }, 'cache-hit usage deduction failed (non-fatal)');
          }
          awardXP(webappUserId, 'coding_solve').catch(() => {});
        }

        res.end();
        return;
      }
    } catch (cacheErr) {
      // Cache failure should never block the request — fall through
      // to normal generation.
      logger.warn({ error: cacheErr.message }, 'answer cache read failed; proceeding with live generation');
    }

    // Helper to stream from a provider
    async function streamFromProvider(service, providerName) {
      let fullText = '';
      for await (const chunk of service.solveProblemStream(problem, language, detailLevel, userModel, ascendMode, designDetailLevel)) {
        fullText += chunk;
        res.write(`data: ${JSON.stringify({ chunk, partial: true, provider: providerName })}\n\n`);
      }
      return fullText;
    }

    let service = provider === 'openai' ? openai : claude;
    let currentProvider = provider;
    let fullText = '';

    // Check if API key is available
    const apiKey = service.getApiKey ? service.getApiKey() : null;
    logger.debug({ provider: currentProvider, hasApiKey: !!apiKey }, 'Provider API key check');

    if (!apiKey) {
      const errorMsg = `No API key configured for ${currentProvider}. Please add your API key in Settings.`;
      logger.warn({ provider: currentProvider }, errorMsg);
      res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
      return;
    }

    try {
      fullText = await streamFromProvider(service, currentProvider);
    } catch (primaryError) {
      logger.warn({ provider: currentProvider, error: primaryError.message }, 'Primary provider failed');

      // If auto-switch is enabled, try the fallback provider
      if (autoSwitch) {
        const fallbackProvider = currentProvider === 'claude' ? 'openai' : 'claude';
        const fallbackService = fallbackProvider === 'openai' ? openai : claude;

        logger.info({ from: currentProvider, to: fallbackProvider }, 'Auto-switching provider');
        res.write(`data: ${JSON.stringify({ switching: true, from: currentProvider, to: fallbackProvider, reason: primaryError.message })}\n\n`);

        try {
          fullText = await streamFromProvider(fallbackService, fallbackProvider);
          currentProvider = fallbackProvider;
        } catch (fallbackError) {
          logger.error({ provider: fallbackProvider, error: fallbackError.message }, 'Fallback provider also failed');
          throw new Error(`Both providers failed. ${currentProvider}: ${primaryError.message}. ${fallbackProvider}: ${fallbackError.message}`);
        }
      } else {
        throw primaryError;
      }
    }

    // Parse and send final result
    logger.debug({ responseLength: fullText.length }, 'Parsing AI response');

    try {
      // Try multiple ways to extract JSON from the response
      let jsonStr = null;
      let parseMethod = 'unknown';

      // Method 1: Extract from markdown code blocks
      const codeBlockMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) ||
                             fullText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
        parseMethod = 'codeblock';
      }

      // Method 2: Find JSON object that starts with { and contains "code" key
      if (!jsonStr) {
        const jsonObjectMatch = fullText.match(/\{[\s\S]*"code"\s*:\s*"[\s\S]*\}$/);
        if (jsonObjectMatch) {
          jsonStr = jsonObjectMatch[0];
          parseMethod = 'json-object';
        }
      }

      // Method 3: Find the first { and try to extract balanced JSON
      if (!jsonStr) {
        const firstBrace = fullText.indexOf('{');
        if (firstBrace !== -1) {
          jsonStr = fullText.substring(firstBrace);
          parseMethod = 'first-brace';
        }
      }

      // Method 4: Use full text as last resort
      if (!jsonStr) {
        jsonStr = fullText.trim();
        parseMethod = 'full-text';
      }

      logger.debug({ parseMethod }, 'JSON parse method used');

      const result = JSON.parse(jsonStr);

      // Validate result has expected structure
      if (result && typeof result === 'object') {
        logger.debug({
          resultKeys: Object.keys(result),
          codeType: typeof result.code,
          codeLength: result.code?.length
        }, 'Parsed result structure');

        // Ensure code is a string, not an object
        if (result.code && typeof result.code !== 'string') {
          logger.warn('result.code is not a string, converting');
          result.code = JSON.stringify(result.code);
        }

        // Normalize multi-approach responses: populate top-level fields from first approach
        if (result.approaches && Array.isArray(result.approaches) && result.approaches.length > 0) {
          // Ensure each approach's code is a string
          for (const approach of result.approaches) {
            if (approach.code && typeof approach.code !== 'string') {
              approach.code = JSON.stringify(approach.code);
            }
          }
          // Always set top-level fields from first approach for backward compat
          const first = result.approaches[0];
          result.code = result.code || first.code;
          result.pitch = result.pitch || first.pitch;
          result.explanations = result.explanations || first.explanations;
          result.complexity = result.complexity || first.complexity;
        }
        // If no approaches array but has code (old format), wrap into single approach
        else if (result.code && !result.approaches) {
          result.approaches = [{
            name: 'Solution',
            code: result.code,
            pitch: result.pitch,
            explanations: result.explanations,
            complexity: result.complexity,
          }];
        }
      }

      // Deduct usage for webapp users after successful completion
      if (webappUserId) {
        try {
          const featureType = ascendMode === 'system-design' ? 'design' : 'coding';
          // Check subscription status to determine which usage to deduct
          const subStatus = await freeUsageService.getSubscriptionStatus(webappUserId);

          if (subStatus.hasSubscription) {
            // Subscribed user - deduct from subscription allowance
            if (ascendMode === 'system-design') {
              await usageService.useSystemDesign(webappUserId);
              logger.debug({ userId: webappUserId, type: 'design' }, 'Deducted subscription usage');
            } else {
              await usageService.useCoding(webappUserId);
              logger.debug({ userId: webappUserId, type: 'coding' }, 'Deducted subscription usage');
            }
          } else {
            // Free trial user - deduct from free allowance
            const usedFree = await freeUsageService.useFreeAllowance(webappUserId, featureType);
            logger.debug({ userId: webappUserId, featureType, success: usedFree }, 'Deducted free allowance');
          }
        } catch (usageError) {
          logger.error({ userId: webappUserId, error: usageError.message }, 'Failed to deduct usage');
          // Don't fail the request, just log the error
        }
      }

      if (webappUserId) awardXP(webappUserId, 'coding_solve').catch(() => {});

      // AI Hours metering (Phase 0: log only). Token counts approximated from
      // text length since stream API doesn't surface usage in the chunk events.
      if (webappUserId) {
        recordTokens({
          userId: webappUserId,
          surface: ascendMode === 'system-design' ? 'capra_design' : 'capra_solve',
          tokensIn: Math.ceil((problem || '').length / 4),
          tokensOut: Math.ceil(fullText.length / 4),
          model: userModel,
          planAtCharge: userPlanType,
        });
      }

      // Write-through: persist the fully parsed answer so the next
      // caller asking the same question gets an instant cache hit.
      // Any Redis failure is logged and ignored.
      try {
        if (result && typeof result === 'object') {
          await cacheSet(cacheKey, result, ANSWER_CACHE_TTL_SEC);
          logger.debug({ cacheKey }, 'answer cached');
        }
      } catch (cacheWriteErr) {
        logger.warn({ error: cacheWriteErr.message }, 'answer cache write failed (non-fatal)');
      }

      res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
    } catch (parseErr) {
      logger.warn({ error: parseErr.message }, 'JSON parse failed, attempting regex extraction');

      // Last resort: try to extract just the code field using regex
      try {
        const codeMatch = fullText.match(/"code"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        const langMatch = fullText.match(/"language"\s*:\s*"([^"]+)"/);

        if (codeMatch) {
          const extractedCode = codeMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

          logger.debug({ codeLength: extractedCode.length }, 'Extracted code via regex');
          res.write(`data: ${JSON.stringify({ done: true, result: { code: extractedCode, language: langMatch?.[1] || 'python' } })}\n\n`);
        } else {
          logger.error('Could not extract code from response');
          res.write(`data: ${JSON.stringify({ error: 'Failed to parse AI response. Please try again.' })}\n\n`);
        }
      } catch (regexErr) {
        logger.error({ error: regexErr.message }, 'Regex extraction failed');
        res.write(`data: ${JSON.stringify({ error: 'Failed to parse AI response. Please try again.' })}\n\n`);
      }
    }
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Follow-up question endpoint for any interview problem
router.post('/followup', validate('followup'), async (req, res, next) => {
  try {
    const { question, problem, code, pitch, currentDesign, provider = 'claude', model } = req.body;

    logger.debug({ question, hasCode: !!code, hasPitch: !!pitch, hasDesign: !!currentDesign, provider, model }, 'Follow-up request received');

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!problem && !code && !pitch && !currentDesign) {
      return res.status(400).json({ error: 'Need problem context (problem, code, pitch, or currentDesign)' });
    }

    // Check free usage
    const userId = req.user?.id;
    if (userId) {
      const canUse = await freeUsageService.canUseFeature(userId, 'coding');
      if (!canUse.allowed) {
        return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
      }
    }

    const service = provider === 'openai' ? openai : claude;

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    req.setTimeout(120000);

    let fullText = '';

    // Build context for the question
    const context = {
      problem,
      code,
      pitch,
      systemDesign: currentDesign
    };

    logger.debug('Starting follow-up stream');
    for await (const chunk of service.answerFollowUpQuestion(question, context, model)) {
      fullText += chunk;
      res.write(`data: ${JSON.stringify({ chunk, partial: true })}\n\n`);
    }

    logger.debug({ responseLength: fullText.length }, 'Follow-up stream complete');
    // Send the answer directly (no JSON parsing needed for simple answers)
    const finalMsg = `data: ${JSON.stringify({ done: true, result: { answer: fullText.trim() } })}\n\n`;
    res.write(finalMsg);
    res.end();
  } catch (error) {
    logger.error({ error: error.message }, 'Follow-up error');
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

export default router;
