/**
 * Shared LLM client factories — inlined from packages/shared-llm/src/index.js.
 * See note in _shared/auth.js. Keep in sync with the lumora-backend copy.
 *
 * Singletons keep SDK connection pooling intact across requests; the optional
 * `apiKey` arg supports per-request keys (e.g. user-supplied keys from the
 * Settings UI) without forcing a singleton.
 */
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

let defaultAnthropic = null;
let defaultOpenAI = null;
const keyedAnthropic = new Map();
const keyedOpenAI = new Map();

/**
 * Get an Anthropic client. Pass nothing to use the env-backed singleton
 * (reads ANTHROPIC_API_KEY); pass an apiKey for a per-key cached client.
 */
export function getAnthropicClient(apiKey) {
  if (!apiKey) {
    if (!defaultAnthropic) defaultAnthropic = new Anthropic();
    return defaultAnthropic;
  }
  let client = keyedAnthropic.get(apiKey);
  if (!client) {
    client = new Anthropic({ apiKey });
    keyedAnthropic.set(apiKey, client);
  }
  return client;
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
