import { Router } from 'express';
import * as ascendPrepService from '../services/ascendPrep.js';
import { generatePDF, generateDOCX } from '../services/exportPrep.js';
import * as pythonDiagrams from '../services/pythonDiagrams.js';
import { verifyJWT } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';
import * as freeUsageService from '../services/freeUsageService.js';
import { cacheGet, cacheSet, cacheKeys } from '../services/redis.js';

const router = Router();

// Admin emails bypass all limits. Read from env only — fail closed
// when ADMIN_EMAILS is unset rather than baking an owner identity
// into source. Operators set OWNER_EMAILS / ADMIN_EMAILS on Railway.
const ADMIN_EMAILS = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Daily prep cap: 1/day free, 3/day paid, unlimited for admins
const PREP_DAILY_LIMIT_FREE = 1;
const PREP_DAILY_LIMIT_PAID = 3;

// Daily counter is held in Redis (matches solve.js's pattern). The
// previous in-memory `Map` reset on every Railway deploy — and since
// we deploy multiple times per day, free users could effectively get
// unlimited prep generations by retrying right after each push. Each
// /api/ascend/prep call hits ascendPrepService which is the heaviest
// Claude path in the codebase, so unrestricted access here was the
// single biggest LLM-cost leak.
async function checkPrepDailyLimit(userId, isPaid, email, companyName) {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return true;
  const today = new Date().toISOString().slice(0, 10);
  const limit = isPaid ? PREP_DAILY_LIMIT_PAID : PREP_DAILY_LIMIT_FREE;

  // Per-section generation fans out ~7 parallel requests for ONE prep (one
  // company). Counting each section would blow the daily limit on a single
  // "Generate all" click. When a company is known, dedupe by company so the
  // whole fan-out counts as ONE prep. Parallel calls write the SAME company
  // key, so the increment is idempotent and race-safe.
  if (companyName) {
    const company = String(companyName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'x';
    const myKey = `prep_daily_co:${userId}:${today}:${company}`;
    if (await cacheGet(myKey)) return true; // this prep already counted today
    const existing = await cacheKeys(`prep_daily_co:${userId}:${today}:*`);
    if ((existing?.length || 0) >= limit) return false;
    await cacheSet(myKey, 1, 86400);
    return true;
  }

  // Bulk /generate — a single request already represents one prep.
  const key = `prep_daily:${userId}:${today}`;
  const count = (await cacheGet(key)) || 0;
  if (count >= limit) return false;
  // 24h TTL — naturally rolls over at next midnight UTC.
  await cacheSet(key, count + 1, 86400);
  return true;
}

/**
 * Check subscription OR free usage for webapp users (freemium model)
 * Returns true if allowed (Electron or subscription or free allowance remaining)
 */
async function checkFeatureAccess(req, res, featureType = 'design') {
  // Resolve token from Authorization header OR cariara_sso cookie. Without
  // the cookie fallback, any SPA fetch firing before tokenStore is populated
  // 401s even though credentials:'include' carries a valid SSO cookie.
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  if (!token && req.cookies?.cariara_sso) {
    token = req.cookies.cariara_sso;
  }
  if (!token) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({
      error: 'Authentication required',
      authRequired: true
    })}\n\n`);
    res.end();
    return false;
  }

  try {
    const decoded = await verifyJWT(token);

    if (!decoded?.id) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({
        error: 'Invalid authentication',
        authRequired: true
      })}\n\n`);
      res.end();
      return false;
    }

    // Admin bypass — unlimited access
    const userEmail = decoded.email?.toLowerCase();
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      req.userId = decoded.id;
      req.userEmail = userEmail;
      req.featureAccess = { allowed: true, hasSubscription: true, isAdmin: true };
      return true;
    }

    // Check subscription OR free usage (freemium model)
    const canUseResult = await freeUsageService.canUseFeature(decoded.id, featureType);
    console.log('[AscendPrep] Feature access check:', canUseResult);

    if (!canUseResult.allowed) {
      console.log('[AscendPrep] Feature access denied:', decoded.id, canUseResult);
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
      return false;
    }

    console.log('[AscendPrep] Feature access granted:', {
      userId: decoded.id,
      hasSubscription: canUseResult.hasSubscription,
      freeRemaining: canUseResult.freeRemaining,
      planType: canUseResult.planType
    });

    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.featureAccess = canUseResult;
    return true;
  } catch (err) {
    console.error('[AscendPrep] Auth check failed:', err.message);
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({
      error: 'Authentication failed',
      authRequired: true
    })}\n\n`);
    res.end();
    return false;
  }
}

/**
 * Generate diagrams for system design questions
 */
async function generateDiagramsForQuestions(result) {
  console.log('[InterviewPrep] generateDiagramsForQuestions called');
  console.log('[InterviewPrep] result?.questions:', !!result?.questions, 'count:', result?.questions?.length);
  console.log('[InterviewPrep] pythonDiagrams.isConfigured():', pythonDiagrams.isConfigured());

  if (!result?.questions || !pythonDiagrams.isConfigured()) {
    console.log('[InterviewPrep] Skipping diagram generation - no questions or not configured');
    return result;
  }

  // Generation sometimes returns questions as a JSON-string or wrapper object
  // (e.g. `"[{...}]"` or `{ items: [...] }`). Normalize before mapping so we
  // don't blow up with `.map is not a function` and bubble that error into
  // the summary field.
  let questions = result.questions;
  if (typeof questions === 'string') {
    try {
      const parsed = JSON.parse(questions.trim());
      questions = Array.isArray(parsed) ? parsed : (parsed?.items || parsed?.list || parsed?.questions);
    } catch { /* leave as-is, guard below will skip */ }
  } else if (questions && !Array.isArray(questions) && typeof questions === 'object') {
    questions = questions.items || questions.list || questions.questions;
  }
  if (!Array.isArray(questions)) {
    console.log('[InterviewPrep] Skipping diagram generation - questions is not an array (type:', typeof result.questions, ')');
    return result;
  }
  result.questions = questions;

  console.log('[InterviewPrep] Generating diagrams for system design questions...');

  // Generate diagrams for each question in parallel
  const diagramPromises = result.questions.map(async (question, idx) => {
    try {
      const diagramResult = await pythonDiagrams.generateDiagram({
        question: question.title || question.question || `System Design ${idx + 1}`,
        cloudProvider: 'auto',
        difficulty: 'medium',
        category: 'System Design',
        format: 'png',
        detailLevel: 'detailed'
      });

      if (diagramResult.success && diagramResult.image_url) {
        // Use full URL for Electron (frontend runs on different port than backend)
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        question.diagramUrl = `${backendUrl}${diagramResult.image_url}`;
        question.diagramDescription = diagramResult.description || '';
        console.log(`[InterviewPrep] Diagram generated for: ${question.title}`, question.diagramUrl);
      }
    } catch (err) {
      console.error(`[InterviewPrep] Failed to generate diagram for question ${idx}:`, err.message);
      // Keep ASCII as fallback if it exists
    }
    return question;
  });

  await Promise.all(diagramPromises);
  return result;
}

// Stream all sections
router.post('/stream', async (req, res) => {
  // Check subscription OR free usage first
  if (!await checkFeatureAccess(req, res, 'design')) return;

  // Check daily prep limit
  const isPaid = req.featureAccess?.hasSubscription || false;
  if (!(await checkPrepDailyLimit(req.userId, isPaid, req.userEmail || req.user?.email))) {
    const limit = isPaid ? PREP_DAILY_LIMIT_PAID : PREP_DAILY_LIMIT_FREE;
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({
      error: `Daily prep limit reached (${limit}/day). ${isPaid ? 'Try again tomorrow.' : 'Upgrade for more daily preps.'}`,
      dailyLimitReached: true,
      upgradeUrl: isPaid ? null : '/pricing'
    })}\n\n`);
    res.end();
    return;
  }

  let { jobDescription, resume, coverLetter, prepMaterials, documentation, sections, provider = 'claude', model, cloudProvider = 'aws' } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ error: 'Job description is required' });
  }

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ error: 'At least one section must be specified' });
  }

  // If no resume was provided in the request, fall back to the user's stored resume
  if (!resume && req.userId) {
    try {
      const r = await query('SELECT resume_text FROM users WHERE id = $1', [req.userId]);
      resume = r.rows[0]?.resume_text || '';
    } catch (err) {
      console.warn('[AscendPrep] Failed to load stored resume:', err.message);
    }
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Proxy keepalive — write an SSE comment every 15s so Railway's HTTP/2 edge
  // doesn't reset an apparently-idle stream when Claude is between tokens.
  const keepalive = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 15000);
  res.on('close', () => clearInterval(keepalive));

  const inputs = { jobDescription, resume, coverLetter, prepMaterials, documentation, cloudProvider };

  try {
    for await (const event of ascendPrepService.generateAllSections(inputs, sections, provider, model)) {
      // Generate diagrams for system-design section when completed
      if (event.section === 'system-design' && event.status === 'completed' && event.result?.questions) {
        res.write(`data: ${JSON.stringify({ section: 'system-design', status: 'generating_diagrams' })}\n\n`);
        event.result = await generateDiagramsForQuestions(event.result);
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // Deduct free usage for webapp users after successful completion
    if (req.userId && req.featureAccess && !req.featureAccess.hasSubscription) {
      try {
        const usedFree = await freeUsageService.useFreeAllowance(req.userId, 'design');
        console.log('[AscendPrep] Deducted free allowance for user:', req.userId, 'success:', usedFree);
      } catch (usageError) {
        console.error('[AscendPrep] Failed to deduct free usage:', usageError.message);
      }
    }
  } catch (err) {
    console.error('[InterviewPrep] Stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    clearInterval(keepalive);
    res.end();
  }
});

// Regenerate a single section
router.post('/section', async (req, res) => {
  // Check subscription OR free usage first
  if (!await checkFeatureAccess(req, res, 'design')) return;

  // Check daily prep limit
  const isPaidSection = req.featureAccess?.hasSubscription || false;
  if (!(await checkPrepDailyLimit(req.userId, isPaidSection, req.userEmail || req.user?.email, req.body?.companyName))) {
    const limit = isPaidSection ? PREP_DAILY_LIMIT_PAID : PREP_DAILY_LIMIT_FREE;
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({
      error: `Daily prep limit reached (${limit}/day). ${isPaidSection ? 'Try again tomorrow.' : 'Upgrade for more daily preps.'}`,
      dailyLimitReached: true,
      upgradeUrl: isPaidSection ? null : '/pricing'
    })}\n\n`);
    res.end();
    return;
  }

  let { jobDescription, resume, coverLetter, prepMaterials, documentation, section, customDocumentContent, customDocumentName, companyName, provider = 'claude', model, cloudProvider = 'aws' } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ error: 'Job description is required' });
  }

  if (!section) {
    return res.status(400).json({ error: 'Section is required' });
  }

  if (!resume && req.userId) {
    try {
      const r = await query('SELECT resume_text FROM users WHERE id = $1', [req.userId]);
      resume = r.rows[0]?.resume_text || '';
    } catch (err) {
      console.warn('[AscendPrep] Failed to load stored resume:', err.message);
    }
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Proxy keepalive — write an SSE comment every 15s so Railway's HTTP/2 edge
  // doesn't reset an apparently-idle stream when Claude is between tokens.
  const keepalive = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 15000);
  res.on('close', () => clearInterval(keepalive));

  // Include explicit company name for company-specific content generation
  const inputs = { jobDescription, resume, coverLetter, prepMaterials, documentation, customDocumentContent, customDocumentName, companyName, cloudProvider };

  try {
    let finalResult = null;

    for await (const event of ascendPrepService.generateSection(section, inputs, provider, model)) {
      if (event.done && event.result) {
        finalResult = event.result;

        // Generate diagrams for system-design section
        if (section === 'system-design' && finalResult.questions) {
          res.write(`data: ${JSON.stringify({ status: 'generating_diagrams' })}\n\n`);
          finalResult = await generateDiagramsForQuestions(finalResult);
        }

        res.write(`data: ${JSON.stringify({ done: true, result: finalResult })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    }

    // Deduct free usage for webapp users after successful completion
    if (req.userId && req.featureAccess && !req.featureAccess.hasSubscription) {
      try {
        const usedFree = await freeUsageService.useFreeAllowance(req.userId, 'design');
        console.log('[AscendPrep] Section - Deducted free allowance for user:', req.userId, 'success:', usedFree);
      } catch (usageError) {
        console.error('[AscendPrep] Section - Failed to deduct free usage:', usageError.message);
      }
    }
  } catch (err) {
    console.error('[InterviewPrep] Section error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    clearInterval(keepalive);
    res.end();
  }
});

// Export to PDF
router.post('/export/pdf', async (req, res) => {
  const allowed = await checkFeatureAccess(req, res, 'design');
  if (!allowed) return;

  const { sections, companyName } = req.body;

  if (!sections || Object.keys(sections).length === 0) {
    return res.status(400).json({ error: 'No sections to export' });
  }

  try {
    const pdfBuffer = await generatePDF(sections, companyName || 'Interview');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="interview-prep-${companyName || 'document'}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[InterviewPrep] PDF export error:', err);
    res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
  }
});

// Export to DOCX
router.post('/export/docx', async (req, res) => {
  const allowed = await checkFeatureAccess(req, res, 'design');
  if (!allowed) return;

  const { sections, companyName } = req.body;

  if (!sections || Object.keys(sections).length === 0) {
    return res.status(400).json({ error: 'No sections to export' });
  }

  try {
    const docxBuffer = await generateDOCX(sections, companyName || 'Interview');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="interview-prep-${companyName || 'document'}.docx"`);
    res.send(docxBuffer);
  } catch (err) {
    console.error('[InterviewPrep] DOCX export error:', err);
    res.status(500).json({ error: 'Failed to generate DOCX: ' + err.message });
  }
});

export default router;
