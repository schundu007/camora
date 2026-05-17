/**
 * Multi-provider streaming dispatcher.
 *
 * Picks the right streaming generator based on the model ID prefix:
 *   gpt-*      → OpenAI
 *   gemini-*   → Google Gemini
 *   (anything else) → Claude (default)
 *
 * All generators yield the same SSE event objects so inference.js
 * doesn't need to change its streaming loop.
 */
import { streamResponse as streamClaude } from './claude.js';
import { streamResponseOpenAI } from './openai-stream.js';
import { streamResponseGemini } from './gemini-stream.js';

/**
 * Resolve which provider owns a model ID.
 * @param {string|null} modelId
 * @returns {'claude'|'openai'|'gemini'}
 */
export function resolveProvider(modelId) {
  if (!modelId) return 'claude';
  const id = modelId.toLowerCase();
  if (id.startsWith('gpt-')) return 'openai';
  if (id.startsWith('gemini-')) return 'gemini';
  return 'claude';
}

/**
 * Stream a response from whichever provider owns `options.model`.
 * Drop-in replacement for `streamResponse` from claude.js.
 */
export async function* streamResponseAny(question, history, options = {}) {
  const provider = resolveProvider(options.model || null);
  switch (provider) {
    case 'openai':
      return yield* streamResponseOpenAI(question, history, options);
    case 'gemini':
      return yield* streamResponseGemini(question, history, options);
    default:
      return yield* streamClaude(question, history, options);
  }
}
