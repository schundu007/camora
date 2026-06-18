/**
 * Multi-provider streaming dispatcher with automatic fallback.
 *
 * Provider chain (primary = user's selected model, then fallbacks in order):
 *   Gemini 2.0 Flash → DeepSeek-V3 (direct) → Claude → Qwen-2.5-72B (OpenRouter) → GPT-4o-mini
 *
 * If a provider yields an `error` event before any `token` has been streamed,
 * the error is suppressed and the next provider is tried transparently.
 * Mid-stream errors (after tokens start) surface directly to the client.
 */
import OpenAI from 'openai';
import { streamResponse as streamClaude } from './claude.js';
import { streamResponseOpenAI } from './openai-stream.js';
import { streamResponseGemini } from './gemini-stream.js';

// Lazy DeepSeek singleton — direct API, OpenAI-SDK-compatible.
let _deepseekClient = null;
function getDeepSeekClient() {
  if (!_deepseekClient && process.env.DEEPSEEK_API_KEY) {
    _deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return _deepseekClient;
}

// Lazy OpenRouter singleton — OpenAI-SDK-compatible, routes to open-weights models.
let _openrouterClient = null;
function getOpenRouterClient() {
  if (!_openrouterClient && process.env.OPENROUTER_API_KEY) {
    _openrouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: { 'HTTP-Referer': 'https://cariara.com', 'X-Title': 'Camora Sona' },
    });
  }
  return _openrouterClient;
}

/**
 * Resolve which provider owns a model ID prefix.
 * @param {string|null} modelId
 * @returns {'deepseek'|'claude'|'openai'|'gemini'}
 */
export function resolveProvider(modelId) {
  if (!modelId) return 'gemini';
  const id = modelId.toLowerCase();
  if (id.startsWith('gemini-')) return 'gemini';
  if (id.startsWith('deepseek-')) return 'deepseek';
  if (id.startsWith('gpt-')) return 'openai';
  if (id.startsWith('claude-')) return 'claude';
  return 'gemini';
}

/**
 * Build the ordered provider list: user's primary provider first, then fallbacks.
 */
function buildProviderChain(primaryProvider, options) {
  const deepseekClient = getDeepSeekClient();
  const openrouterClient = getOpenRouterClient();

  const providers = [
    {
      key: 'gemini',
      label: 'Gemini',
      fn: streamResponseGemini,
      opts: { ...options, model: options.model?.startsWith('gemini-') ? options.model : 'gemini-2.0-flash' },
    },
    deepseekClient && {
      key: 'deepseek',
      label: 'DeepSeek-V3',
      fn: streamResponseOpenAI,
      opts: { ...options, model: 'deepseek-chat', client: deepseekClient },
    },
    {
      key: 'claude',
      label: 'Claude',
      fn: streamClaude,
      opts: options,
    },
    openrouterClient && {
      key: 'qwen',
      label: 'Qwen-2.5-72B',
      fn: streamResponseOpenAI,
      opts: { ...options, model: 'qwen/qwen-2.5-72b-instruct', client: openrouterClient },
    },
    {
      key: 'openai',
      label: 'GPT-4o-mini',
      fn: streamResponseOpenAI,
      opts: { ...options, model: 'gpt-4o-mini' },
    },
  ].filter(Boolean);

  // Promote the user's preferred provider to front.
  const primaryIdx = providers.findIndex(p => p.key === primaryProvider);
  if (primaryIdx > 0) {
    const [primary] = providers.splice(primaryIdx, 1);
    providers.unshift(primary);
  }

  return providers;
}

/**
 * Stream a response, automatically falling back through the provider chain
 * if a provider reports an error before any tokens have been sent.
 * Drop-in replacement for `streamResponse` from claude.js.
 */
export async function* streamResponseAny(question, history, options = {}) {
  const primaryProvider = resolveProvider(options.model || null);
  const providers = buildProviderChain(primaryProvider, options);
  let lastError = 'Unknown provider error';

  for (const { label, fn, opts } of providers) {
    let tokenSent = false;
    let done = false;

    try {
      for await (const evt of fn(question, history, opts)) {
        if (evt.event === 'token') tokenSent = true;

        if (evt.event === 'error') {
          if (tokenSent) {
            // Mid-stream failure after tokens — surface to client and stop.
            yield evt;
            done = true;
          } else {
            // Pre-token failure — suppress and try next provider.
            lastError = evt.data?.msg || 'Provider error';
            console.warn(`[inference] ${label} error before text — trying next: ${lastError}`);
          }
          break;
        }

        yield evt;

        if (evt.event === 'answer') {
          done = true;
          break;
        }
      }
    } catch (err) {
      if (tokenSent) throw err; // mid-stream throw, nothing we can do
      lastError = err.message || String(err);
      console.warn(`[inference] ${label} threw before text — trying next: ${lastError}`);
    }

    if (done) return;
  }

  // All providers exhausted.
  yield { event: 'error', data: { msg: `All inference providers exhausted. Last error: ${lastError}` } };
}
