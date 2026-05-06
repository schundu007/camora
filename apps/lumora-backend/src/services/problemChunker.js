/**
 * Structure-aware chunker for Capra problem corpora.
 *
 * Three problem shapes, all chunked into the same lumora_kb_chunks table:
 *
 *   leetcode  — apps/camora/src/data/capra/problems.js (PROBLEMS object)
 *               { name, difficulty, category, description, examples,
 *                 constraints, solutions: { python, javascript, ... } }
 *
 *   lld       — apps/camora/src/data/capra/topics/lldProblems.js
 *               { title, description, introduction, keyInsight,
 *                 implementation, keyQuestions: [{question, answer}] }
 *
 *   sd        — apps/camora/src/data/capra/topics/systemDesignProblems.js
 *               { title, description, productMeta: { keyChallenge },
 *                 introduction }
 *
 * Citation granularity goal: a question at retrieval time should hit the
 * smallest chunk that still answers it. So keyQuestions get one chunk
 * each (highest-value grounding for an interview AI), while broad
 * descriptive prose stays in a single summary chunk.
 */
import { createHash } from 'node:crypto';
import { estimateTokens } from './chunker.js';

function sha(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function makeChunk({ source, topicId, topicTitle, section, content }) {
  const trimmed = content.trim();
  return {
    sourceKind: 'capra-problem',
    source,
    topicId,
    topicTitle,
    section,
    content: trimmed,
    tokenCount: estimateTokens(trimmed),
    contentHash: sha(`${source}|${topicId}|${section}|${trimmed}`),
  };
}

function chunkLeetcode(p, { source }) {
  const topicId = p.slug || (p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : String(p.id));
  const topicTitle = p.name || p.title || topicId;

  // Best solution: prefer Python, then any other.
  let bestSolution = null;
  let bestLang = null;
  if (p.solutions && typeof p.solutions === 'object') {
    if (p.solutions.python) { bestSolution = p.solutions.python; bestLang = 'python'; }
    else {
      const langs = Object.keys(p.solutions);
      if (langs.length > 0) { bestSolution = p.solutions[langs[0]]; bestLang = langs[0]; }
    }
  }

  const parts = [
    `# ${topicTitle}${p.difficulty ? ` (${p.difficulty})` : ''}`,
    p.category ? `Category: ${p.category}` : null,
    p.description ? p.description : null,
  ];

  if (Array.isArray(p.examples) && p.examples.length > 0) {
    const ex = p.examples
      .slice(0, 2)
      .map((e, i) => `Example ${i + 1}:\nInput: ${e.input}\nOutput: ${e.output}${e.explanation ? `\nExplanation: ${e.explanation}` : ''}`)
      .join('\n\n');
    parts.push(ex);
  }

  if (Array.isArray(p.constraints) && p.constraints.length > 0) {
    parts.push(`Constraints:\n${p.constraints.map((c) => `- ${c}`).join('\n')}`);
  }

  if (bestSolution) {
    const code = bestSolution.code || '';
    const tc = bestSolution.timeComplexity ? `Time: ${bestSolution.timeComplexity}` : null;
    const sc = bestSolution.spaceComplexity ? `Space: ${bestSolution.spaceComplexity}` : null;
    const meta = [tc, sc].filter(Boolean).join('  ');
    parts.push(`Reference solution (${bestLang}):\n\`\`\`${bestLang}\n${code}\n\`\`\`${meta ? `\n${meta}` : ''}`);
  }

  const content = parts.filter(Boolean).join('\n\n');
  if (!content.trim()) return [];
  return [makeChunk({ source, topicId, topicTitle, section: 'summary', content })];
}

function chunkLld(p, { source }) {
  const topicId = p.id || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null);
  if (!topicId) return [];
  const topicTitle = p.title || topicId;
  const chunks = [];

  const summaryParts = [
    `# ${topicTitle}${p.difficulty ? ` (${p.difficulty})` : ''}`,
    p.subtitle ? p.subtitle : null,
    p.description ? p.description : null,
  ];
  const summary = summaryParts.filter(Boolean).join('\n\n');
  if (summary.trim()) {
    chunks.push(makeChunk({ source, topicId, topicTitle, section: 'summary', content: summary }));
  }

  if (p.introduction) {
    chunks.push(makeChunk({ source, topicId, topicTitle, section: 'introduction', content: p.introduction }));
  }

  if (p.keyInsight) {
    chunks.push(makeChunk({
      source, topicId, topicTitle,
      section: 'keyInsight',
      content: `Key insight for ${topicTitle}:\n${p.keyInsight}`,
    }));
  }

  if (p.implementation) {
    chunks.push(makeChunk({
      source, topicId, topicTitle,
      section: 'implementation',
      content: `Reference implementation for ${topicTitle}:\n${p.implementation}`,
    }));
  }

  if (Array.isArray(p.keyQuestions)) {
    p.keyQuestions.forEach((q, i) => {
      const qText = q.question;
      if (!qText) return;
      const aText = q.answer || '';
      const body = aText ? `Q: ${qText}\nA: ${aText}` : `Q: ${qText}`;
      chunks.push(makeChunk({
        source, topicId, topicTitle,
        section: `question:${i}`,
        content: body,
      }));
    });
  }

  return chunks;
}

function chunkSd(p, { source }) {
  const topicId = p.id || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null);
  if (!topicId) return [];
  const topicTitle = p.title || topicId;
  const chunks = [];

  const keyChallenge = p.productMeta?.keyChallenge || null;
  const summaryParts = [
    `# ${topicTitle}${p.subtitle ? ` — ${p.subtitle}` : ''}${p.difficulty ? ` (${p.difficulty})` : ''}`,
    p.description ? p.description : null,
    keyChallenge ? `Key challenge: ${keyChallenge}` : null,
  ];
  const summary = summaryParts.filter(Boolean).join('\n\n');
  if (summary.trim()) {
    chunks.push(makeChunk({ source, topicId, topicTitle, section: 'summary', content: summary }));
  }

  if (p.introduction) {
    chunks.push(makeChunk({ source, topicId, topicTitle, section: 'introduction', content: p.introduction }));
  }

  return chunks;
}

export function chunkProblem(problem, { source, kind }) {
  if (kind === 'leetcode') return chunkLeetcode(problem, { source });
  if (kind === 'lld') return chunkLld(problem, { source });
  if (kind === 'sd') return chunkSd(problem, { source });
  return [];
}
