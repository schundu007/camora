/**
 * Prep-kit diagram fan-out.
 *
 * Attaches an architecture diagram to each system-design question in a
 * generated prep kit. Lives here (rather than inline in routes/ascendPrep.js)
 * so it can be tested without booting the router and its Redis/DB dependencies.
 */

import * as pythonDiagrams from './pythonDiagrams.js';
import { cacheKeyFor, imageUrlFor, lookupDiagram, persistDiagram } from './diagramStore.js';

/**
 * Generate diagrams for system design questions.
 * Mutates and returns `result` with `diagramUrl` set on each question that got one.
 */
export async function generateDiagramsForQuestions(result) {
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
    const title = question.title || question.question || `System Design ${idx + 1}`;
    // Every dimension below feeds the cache key, so it must match what we pass
    // to pythonDiagrams.generateDiagram() or we'd store under a key the Design
    // panel could never hit.
    const dims = { question: title, provider: 'auto', direction: 'LR', detailLevel: 'detailed', designKind: 'system' };
    const hash = cacheKeyFor(dims);

    try {
      // A prep kit is saved and reopened later, so the URL we hand back has to
      // outlive the render. `/api/diagram/image/:hash` is DB-backed and public
      // (<img> can't send auth headers); the old `/static/diagrams/...` path
      // pointed at a /tmp file that the 10-minute sweep deleted, which is why
      // saved kits showed no diagram.
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3009';

      const cached = await lookupDiagram(hash);
      if (cached) {
        question.diagramUrl = `${backendUrl}${imageUrlFor(hash)}`;
        console.log(`[InterviewPrep] Diagram cache hit for: ${title}`);
        return question;
      }

      const diagramResult = await pythonDiagrams.generateDiagram({
        question: title,
        cloudProvider: 'auto',
        difficulty: 'medium',
        category: 'System Design',
        format: 'png',
        detailLevel: 'detailed',
      });

      if (diagramResult.success && diagramResult.image_url) {
        const durableUrl = await persistDiagram({
          hash,
          staticImageUrl: diagramResult.image_url,
          detailLevel: dims.detailLevel,
          provider: dims.provider,
          direction: dims.direction,
          description: title,
        });
        // Only publish a URL we know will still resolve. If persistence failed,
        // leave diagramUrl unset — a missing diagram beats a broken image.
        if (durableUrl) {
          question.diagramUrl = `${backendUrl}${durableUrl}`;
          question.diagramDescription = diagramResult.description || '';
          console.log(`[InterviewPrep] Diagram generated for: ${title}`, question.diagramUrl);
        }
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
