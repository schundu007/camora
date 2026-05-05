/**
 * Contextual chunking — Anthropic Sept-2024 pattern.
 *
 * For each chunk, ask Haiku for a 50-token context that situates the
 * chunk within its source document. Prepend that context to the chunk
 * before embedding. Reduces retrieval failures by 35-67% on the paper's
 * benchmark.
 *
 *   prompt: "Here is the chunk we want to situate within the whole
 *            document <document>{doc}</document>. Here is the chunk
 *            <chunk>{chunk}</chunk>. Please give a short succinct
 *            context to situate this chunk within the overall document
 *            for the purposes of improving search retrieval of the
 *            chunk."
 *
 * Failures degrade silently — chunks pass through unmodified, so a
 * partial run still produces a valid index.
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 100;
const PARALLEL = 8;

let _client = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const PROMPT_TEMPLATE = (doc, chunk) =>
  `Here is the chunk we want to situate within the whole document
<document>
${doc.slice(0, 8000)}
</document>
Here is the chunk
<chunk>
${chunk}
</chunk>
Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`;

async function generateContextOne(chunk, docText) {
  try {
    const r = await client().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: PROMPT_TEMPLATE(docText, chunk.content) }],
    });
    const text = (r.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[contextualChunker] generation failed:', err.message);
    return null;
  }
}

async function processInBatches(items, batchSize, fn) {
  const out = new Array(items.length);
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((it) => fn(it)));
    results.forEach((r, j) => { out[i + j] = r; });
  }
  return out;
}

export async function addContextToChunks(chunks, docText) {
  const contexts = await processInBatches(chunks, PARALLEL, (c) => generateContextOne(c, docText));
  return chunks.map((c, i) => {
    const ctx = contexts[i];
    if (!ctx) return c;
    return {
      ...c,
      contextSummary: ctx,
      content: `[Context: ${ctx}]\n\n${c.content}`,
    };
  });
}
