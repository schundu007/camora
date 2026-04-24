import { Router } from 'express';
import * as ascendPrepService from '../services/ascendPrep.js';
import { generatePDF, generateDOCX } from '../services/exportPrep.js';
import * as pythonDiagrams from '../services/pythonDiagrams.js';
import { verifyJWT } from '../middleware/jwtAuth.js';
import { query } from '../lib/shared-db.js';
import * as freeUsageService from '../services/freeUsageService.js';

const router = Router();

// Admin emails bypass all limits
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'chundubabu@gmail.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Daily prep cap: 1/day free, 3/day paid, unlimited for admins
const PREP_DAILY_LIMIT_FREE = 1;
const PREP_DAILY_LIMIT_PAID = 3;

const prepDailyUsage = new Map();

function checkPrepDailyLimit(userId, isPaid, email) {
  // Admin bypass
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return true;

  const today = new Date().toISOString().slice(0, 10);
  const limit = isPaid ? PREP_DAILY_LIMIT_PAID : PREP_DAILY_LIMIT_FREE;
  const entry = prepDailyUsage.get(userId);
  if (!entry || entry.date !== today) {
    prepDailyUsage.set(userId, { count: 1, date: today });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Check subscription OR free usage for webapp users (freemium model)
 * Returns true if allowed (Electron or subscription or free allowance remaining)
 */
async function checkFeatureAccess(req, res, featureType = 'design') {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({
      error: 'Authentication required',
      authRequired: true
    })}\n\n`);
    res.end();
    return false;
  }

  try {
    const token = authHeader.substring(7);
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
  if (!checkPrepDailyLimit(req.userId, isPaid, req.userEmail || req.user?.email)) {
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

  let { jobDescription, resume, coverLetter, prepMaterials, documentation, sections, provider = 'claude', model } = req.body;

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
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const inputs = { jobDescription, resume, coverLetter, prepMaterials, documentation };

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
    res.end();
  }
});

// Regenerate a single section
router.post('/section', async (req, res) => {
  // Check subscription OR free usage first
  if (!await checkFeatureAccess(req, res, 'design')) return;

  // Check daily prep limit
  const isPaidSection = req.featureAccess?.hasSubscription || false;
  if (!checkPrepDailyLimit(req.userId, isPaidSection, req.userEmail || req.user?.email)) {
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

  let { jobDescription, resume, coverLetter, prepMaterials, documentation, section, customDocumentContent, customDocumentName, companyName, provider = 'claude', model } = req.body;

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
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Include explicit company name for company-specific content generation
  const inputs = { jobDescription, resume, coverLetter, prepMaterials, documentation, customDocumentContent, customDocumentName, companyName };

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
    res.end();
  }
});

// Export to PDF
router.post('/export/pdf', async (req, res) => {
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
