/**
 * Shared LLM client factories — inlined from packages/shared-llm/src/index.js.
 * See note in _shared/auth.js. Keep in sync with the lumora-backend copy.
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

// Translate an Anthropic/JSON-Schema `input_schema` into the OpenAPI-3.0
// subset Gemini's `responseSchema` accepts. Unsupported keywords
// (additionalProperties, $ref, oneOf, const, patternProperties, default…)
// are dropped rather than passed through — an unknown keyword makes Gemini
// reject the whole request. If the result is unusable we return undefined,
// and the caller falls back to plain JSON mode (mime-only).
function _geminiSchema(s) {
  if (!s || typeof s !== 'object' || !s.type) return undefined;
  const t = s.type;
  const out = { type: t };
  if (s.description) out.description = String(s.description).slice(0, 480);
  if (Array.isArray(s.enum)) out.enum = s.enum;
  if (s.format) out.format = s.format;
  if (t === 'array') {
    const item = _geminiSchema(s.items);
    if (!item) return undefined;
    out.items = item;
    if (Number.isInteger(s.minItems)) out.minItems = s.minItems;
    if (Number.isInteger(s.maxItems)) out.maxItems = s.maxItems;
  }
  if (t === 'object') {
    const props = s.properties && typeof s.properties === 'object' ? s.properties : {};
    out.properties = {};
    const order = [];
    for (const [k, v] of Object.entries(props)) {
      const cs = _geminiSchema(v);
      if (cs) { out.properties[k] = cs; order.push(k); }
    }
    if (order.length === 0) return undefined;
    if (Array.isArray(s.required)) out.required = s.required.filter((r) => order.includes(r));
    out.propertyOrdering = order;
  }
  return out;
}

// Extract the JSON object from a model reply, repairing the common
// truncation/fence cases so a near-miss doesn't blow up the whole section.
function _parseJsonLoose(text) {
  const str = String(text || '');
  try { return JSON.parse(str); } catch {}
  const fenced = str.match(/```json\s*([\s\S]*?)\s*```/) || str.match(/\{[\s\S]*\}/);
  if (fenced) { try { return JSON.parse(fenced[1] || fenced[0]); } catch {} }
  // Repair a truncated object: close any open string, drop a dangling
  // trailing key/comma, then balance the remaining braces/brackets. Lets an
  // over-long section still yield usable structured data instead of failing.
  try {
    let s = str.trim();
    const start = s.indexOf('{');
    if (start < 0) return null;
    s = s.slice(start);
    let inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
      if (esc) { esc = false; continue; }
      if (s[i] === '\\') { esc = true; continue; }
      if (s[i] === '"') inStr = !inStr;
    }
    if (inStr) s += '"';
    s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*"?\s*$/, '').replace(/,\s*$/, '');
    const stack = [];
    inStr = false; esc = false;
    for (let i = 0; i < s.length; i++) {
      if (esc) { esc = false; continue; }
      if (s[i] === '\\') { esc = true; continue; }
      if (s[i] === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (s[i] === '{') stack.push('}');
      else if (s[i] === '[') stack.push(']');
      else if (s[i] === '}' || s[i] === ']') stack.pop();
    }
    s += stack.reverse().join('');
    return JSON.parse(s);
  } catch {}
  return null;
}

export function getAnthropicClient() {
  const k = getAdminApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(k);

  // Build the structured-output branch shared by create()/stream() when the
  // caller passes `tools` (Anthropic tool_use). Gemini has no function-calling
  // parity here, so we emulate it with native JSON mode + responseSchema and
  // surface the result as an Anthropic-shaped tool_use block.
  const runTool = async ({ system, messages, max_tokens, tools }) => {
    const tool = tools[0];
    const schema = _geminiSchema(tool?.input_schema);
    const gm = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: _sysText(system),
      generationConfig: {
        maxOutputTokens: max_tokens || 8192,
        responseMimeType: 'application/json',
        ...(schema ? { responseSchema: schema } : {}),
      },
    });
    const resp = await gm.generateContent(_msgsText(messages));
    const input = _parseJsonLoose(resp.response.text());
    if (!input || typeof input !== 'object') {
      // Signal the caller's fallback chain rather than returning junk.
      const err = new Error('GEMINI_TOOL_JSON_PARSE_FAILED');
      err.status = 502;
      throw err;
    }
    return { name: tool?.name || 'submit', input };
  };

  return {
    messages: {
      create: async (args) => {
        const { system, messages, max_tokens, tools } = args;
        if (Array.isArray(tools) && tools.length > 0) {
          const block = await runTool(args);
          return { content: [{ type: 'tool_use', name: block.name, input: block.input }], stop_reason: 'tool_use' };
        }
        const gm = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: _sysText(system) });
        const resp = await gm.generateContent(_msgsText(messages));
        return { content: [{ type: 'text', text: resp.response.text() }] };
      },
      stream: (args) => {
        const { system, messages, tools } = args;
        // Structured (tool_use) path: no token stream to relay, so expose a
        // lazily-resolved finalMessage() carrying the Anthropic-shaped block.
        if (Array.isArray(tools) && tools.length > 0) {
          let pending = null;
          const ensure = () => (pending ||= runTool(args));
          return {
            [Symbol.asyncIterator]: async function* () { await ensure(); },
            finalMessage: async () => {
              const block = await ensure();
              return { content: [{ type: 'tool_use', name: block.name, input: block.input }], stop_reason: 'tool_use' };
            },
          };
        }
        // Prose path — byte-for-byte identical to the original shim so the
        // callers that stream free-form text (e.g. coding) are untouched.
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
