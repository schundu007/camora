/**
 * CRAG-style chunk relevance grader.
 *
 * Pattern from awesome-llm-apps corrective_rag: before injecting retrieved
 * chunks into the answer prompt, grade each chunk binary (relevant/irrelevant)
 * and drop irrelevant ones. This prevents noisy context from confusing answers.
 *
 * Runs in parallel for all chunks using Haiku (fast + cheap: ~$0.00025/call).
 * Hard 300ms wall-clock budget — fails open on timeout (all chunks pass through).
 * Gated by RAG_USE_GRADING=true env var (off by default).
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL_GRADER = 'claude-haiku-4-5-20251001';
const GRADING_TIMEOUT_MS = 300;

let _client = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const GRADE_PROMPT = `You are a relevance grader for interview coaching content.

Given a question and a document excerpt, decide if the excerpt contains information useful to answer the question.

Reply with exactly one word: RELEVANT or IRRELEVANT.

RELEVANT: excerpt covers a concept, algorithm, pattern, metric, or experience that directly helps answer the question.
IRRELEVANT: excerpt is about a different topic, too generic, or would only add noise.

Be strict. When in doubt, return IRRELEVANT.`;

async function gradeOne(question, chunk) {
  try {
    const msg = await getClient().messages.create({
      model: MODEL_GRADER,
      max_tokens: 5,
      system: GRADE_PROMPT,
      messages: [{
        role: 'user',
        content: `Question: ${question}\n\nExcerpt: ${(chunk.content || '').slice(0, 500)}`,
      }],
    });
    const verdict = msg.content?.[0]?.text?.trim().toUpperCase();
    return verdict === 'RELEVANT';
  } catch {
    return true; // fail open
  }
}

/**
 * Grade chunks and return only those relevant to the question.
 * Returns original chunks unchanged if grading is disabled, times out, or errors.
 */
export async function gradeChunks(question, chunks) {
  if (!chunks?.length) return chunks;
  if (process.env.RAG_USE_GRADING !== 'true') return chunks;

  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), GRADING_TIMEOUT_MS));

  const gradePromise = (async () => {
    const results = await Promise.all(chunks.map(async (c) => {
      const relevant = await gradeOne(question, c);
      return relevant ? c : null;
    }));
    return results.filter(Boolean);
  })();

  const graded = await Promise.race([gradePromise, timeoutPromise]);
  if (!graded || graded.length === 0) return chunks; // fail open
  return graded;
}
