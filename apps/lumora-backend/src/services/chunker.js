/**
 * Structure-aware chunker for Capra Prepare topics.
 *
 * Topic objects share a stable shape:
 *   { id, title, description, introduction, whenToUse[],
 *     keyConcepts[{term,definition}], questions[{question,answer}] }
 *
 * One chunk per logical section preserves citation granularity. Long
 * sections (rare — only `introduction` exceeds 700 tokens) are split at
 * paragraph boundaries with a soft cap.
 *
 * Each chunk carries source metadata so retrieval can return precise
 * citations like "SRE / SLI-SLO-SLA / keyConcepts".
 */
import { createHash } from 'node:crypto';

const MAX_TOKENS = 700;
const CHARS_PER_TOKEN = 4; // GPT-style heuristic; close enough for budgeting

export function estimateTokens(s) {
  if (!s) return 0;
  return Math.ceil(s.length / CHARS_PER_TOKEN);
}

function sha(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function makeChunk({ source, topic, section, content }) {
  const trimmed = content.trim();
  return {
    sourceKind: 'capra-topic',
    source,
    topicId: topic.id,
    topicTitle: topic.title || topic.id,
    section,
    content: trimmed,
    tokenCount: estimateTokens(trimmed),
    contentHash: sha(`${source}|${topic.id}|${section}|${trimmed}`),
  };
}

function splitParagraphs(text, max = MAX_TOKENS) {
  const paras = text.split(/\n\n+/);
  const out = [];
  let buf = [];
  let bufTok = 0;
  for (const p of paras) {
    const t = estimateTokens(p);
    if (bufTok + t > max && buf.length > 0) {
      out.push(buf.join('\n\n'));
      buf = [p];
      bufTok = t;
    } else {
      buf.push(p);
      bufTok += t;
    }
  }
  if (buf.length) out.push(buf.join('\n\n'));
  return out;
}

export function chunkTopic(topic, { source }) {
  const chunks = [];

  // SUMMARY — title + description + introduction. Always present.
  const summaryParts = [
    topic.title ? `# ${topic.title}` : null,
    topic.description ? topic.description : null,
    topic.introduction ? topic.introduction : null,
  ].filter(Boolean);
  const summaryText = summaryParts.join('\n\n');
  if (summaryText.trim()) {
    const parts = splitParagraphs(summaryText);
    parts.forEach((part, i) => {
      chunks.push(makeChunk({
        source,
        topic,
        section: parts.length === 1 ? 'summary' : `summary:${i}`,
        content: part,
      }));
    });
  }

  // WHEN TO USE — bulleted list, kept whole.
  if (Array.isArray(topic.whenToUse) && topic.whenToUse.length > 0) {
    const text = ['When to apply this:', ...topic.whenToUse.map((b) => `- ${b}`)].join('\n');
    chunks.push(makeChunk({ source, topic, section: 'whenToUse', content: text }));
  }

  // KEY CONCEPTS — term/definition pairs. One chunk for the whole list;
  // they're definitional and read better together.
  if (Array.isArray(topic.keyConcepts) && topic.keyConcepts.length > 0) {
    const text = topic.keyConcepts
      .map((kc) => `${kc.term}: ${kc.definition}`)
      .join('\n');
    const headed = `Key concepts for ${topic.title || topic.id}:\n${text}`;
    if (estimateTokens(headed) <= MAX_TOKENS) {
      chunks.push(makeChunk({ source, topic, section: 'keyConcepts', content: headed }));
    } else {
      const parts = splitParagraphs(text);
      parts.forEach((p, i) => {
        chunks.push(makeChunk({
          source, topic, section: `keyConcepts:${i}`,
          content: `Key concepts (${i + 1}/${parts.length}) for ${topic.title}:\n${p}`,
        }));
      });
    }
  }

  // QUESTIONS — one chunk per Q/A pair. These are the highest-value
  // grounding for an interview AI, so we keep them addressable.
  if (Array.isArray(topic.questions)) {
    topic.questions.forEach((q, i) => {
      const qText = typeof q === 'string' ? q : q.question;
      const aText = typeof q === 'string' ? '' : (q.answer || '');
      if (!qText) return;
      const body = aText ? `Q: ${qText}\nA: ${aText}` : `Q: ${qText}`;
      chunks.push(makeChunk({
        source, topic, section: `question:${i}`, content: body,
      }));
    });
  }

  return chunks;
}
