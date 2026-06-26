/**
 * Shared LLM client factories — inlined from packages/shared-llm/src/index.js.
 * See note in _shared/auth.js. Keep in sync with the ascend-backend copy.
 *
 * Singletons keep SDK connection pooling intact across requests; the optional
 * `apiKey` arg supports per-request keys (e.g. user-supplied keys from the
 * Settings UI) without forcing a singleton.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey as getAdminApiKey } from '../../services/adminConfig.js';
import OpenAI from 'openai';

let defaultOpenAI = null;
const keyedOpenAI = new Map();

const GEMINI_MODEL = 'gemini-2.5-flash';
function _sysText(s) { if (!s) return ''; if (typeof s === 'string') return s; if (Array.isArray(s)) return s.map(b => b.text || '').join('\n'); return String(s); }
function _msgsText(msgs) { if (!msgs) return ''; return msgs.map(m => (Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || ''))).join('\n\n'); }

export function getAnthropicClient() {
  const k = getAdminApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(k);
  return {
    messages: {
      create: async ({ system, messages }) => {
        const gm = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: _sysText(system) });
        const resp = await gm.generateContent(_msgsText(messages));
        return { content: [{ type: 'text', text: resp.response.text() }] };
      },
      stream: ({ system, messages }) => {
        const gm = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: _sysText(system) });
        const sp = gm.generateContentStream(_msgsText(messages));
        return { [Symbol.asyncIterator]: async function* () { const sr = await sp; for await (const c of sr.stream) { const t = c.text(); if (t) yield { type: 'content_block_delta', delta: { text: t } }; } } };
      },
    },
  };
}

/**
 * Get an OpenAI client. Pass nothing to use the env-backed singleton
 * (reads OPENAI_API_KEY); pass an apiKey for a per-key cached client.
 */
export function getOpenAIClient(apiKey) {
  if (!apiKey) {
    if (!defaultOpenAI) defaultOpenAI = new OpenAI();
    return defaultOpenAI;
  }
  let client = keyedOpenAI.get(apiKey);
  if (!client) {
    client = new OpenAI({ apiKey });
    keyedOpenAI.set(apiKey, client);
  }
  return client;
}

/**
 * Test-only: drop all cached clients. Useful for dotenv-driven tests that
 * change ANTHROPIC_API_KEY between runs.
 */
export function _resetClients() {
  defaultAnthropic = null;
  defaultOpenAI = null;
  keyedAnthropic.clear();
  keyedOpenAI.clear();
}
