/**
 * Coding solutions API — migrated from Python FastAPI.
 *
 * POST /solve   — SSE streaming endpoint: accepts a coding problem + language,
 *                 streams 3 solutions (brute force -> optimized -> most optimal)
 *                 via Claude API with @anthropic-ai/sdk.
 *
 * POST /execute — Run code against test cases (Python, JS, Ruby).
 */
import { Router } from 'express';
import { renderTreeForPrompt, validatePath } from '../lib/algorithmFlowchart.js';
import { stripModuleLevelPrints } from '../services/codeRunner.js';
import { SECTION_NAMES, isKnownSection, matchLessons } from '../lib/interviewTopics.js';
import multer from 'multer';
import { resolveTask, buildSituationBlock, WALKTHROUGH_BUDGET, CLASSIFIER_SPEC, isAnswerOnly, classifyUtterance, normalizeTask } from '../services/taskModes.js';
import { detectGap, spliceFill, gapDirective } from '../services/fillGap.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dns from 'node:dns/promises';
// Image guard shared with the behavioral answer path — see services/visionImage.js.
import { loadSharp, ensureImageWithinAnthropicLimit } from '../services/visionImage.js';

import { getApiKey } from '../services/adminConfig.js';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkUsage } from '../middleware/usageLimits.js';
import { executeCode } from '../services/codeRunner.js';
import { buildAnswerCacheKey, cacheGet, cacheSet, logCacheEvent } from '../services/answerCache.js';
import { retrieveExemplars, formatExemplars } from '../services/codingKnowledge.js';
import { LIVE_ANSWER_MODEL } from '../services/modelPolicy.js';

const router = Router();

let _geminiAI = null;
let _geminiAIKey = null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function getGeminiClient() {
  const apiKey = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_geminiAI || _geminiAIKey !== apiKey) {
    _geminiAI = new GoogleGenerativeAI(apiKey);
    _geminiAIKey = apiKey;
  }
  return _geminiAI;
}

function geminiGetModel(systemInstruction, opts = {}) {
  return getGeminiClient().getGenerativeModel({
    model: GEMINI_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: {
      thinkingConfig: { thinkingBudget: 0 },
      // Solution generation asks for a JSON object; forcing application/json makes
      // the model emit a PARSEABLE object so the /solve parser succeeds on the
      // first pass instead of getting malformed JSON on a big/hard problem and
      // burning a slow retry (or failing outright with no answer). Off for
      // utility calls that return plain text.
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  });
}

function toGeminiHistory(msgs) {
  return msgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : String(m.content)) }],
  }));
}

// ── Anthropic lazy client — resolved at call time so admin-panel key
//    changes take effect without restarting the service.
const ANTHROPIC_MODEL = LIVE_ANSWER_MODEL;

/**
 * Thinking, configured explicitly rather than inherited.
 *
 * This is a model-bump trap. On Sonnet 4.6 a request that omitted `thinking`
 * ran WITHOUT thinking; on Sonnet 5 the same request runs ADAPTIVE thinking at
 * the default effort of `high`. Moving the model turned on ~11k tokens of
 * reasoning per solve that nobody asked for.
 *
 * It is invisible, which is why it read as a hang: thinking arrives as
 * `thinking_delta`, our forwarder only relays `text_delta`, so 90+ seconds of
 * real work streams past with nothing reaching the browser. `max_tokens` also
 * caps thinking AND text together, so a long answer can truncate on top.
 *
 * Disabled by default: the solve prompt is a 19k-token specification that
 * already tells the model exactly what to produce, and the candidate is sitting
 * in a live interview. Both dials are env-tunable so quality can be traded back
 * for latency without a deploy — CODING_THINKING=adaptive, CODING_EFFORT=medium.
 * (Sonnet 5 at medium is roughly Sonnet 4.6 at high.)
 */
const THINKING_MODE = process.env.CODING_THINKING || 'disabled';
const CODING_EFFORT = process.env.CODING_EFFORT || '';
const anthropicThinking = () => (
  THINKING_MODE === 'adaptive' ? { type: 'adaptive' } : { type: 'disabled' }
);
const anthropicOutputConfig = () => (
  CODING_EFFORT ? { output_config: { effort: CODING_EFFORT } } : {}
);

let _anthropicClient = null;
let _anthropicKey = null;
function getAnthropicClient() {
  const key = getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return null;
  if (!_anthropicClient || _anthropicKey !== key) {
    _anthropicClient = new Anthropic({ apiKey: key });
    _anthropicKey = key;
  }
  return _anthropicClient;
}

// ── Normalise message history to a flat string (used by providers that
//    don't support structured multi-turn history in their non-streaming API).
function flattenMessages(msgs) {
  return msgs.map(m => Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || '')).join('\n\n');
}

// ── Build the ordered provider list at call time so any key added to the
//    admin panel or env is picked up immediately on the next request.
function buildProviderList() {
  const list = [];
  // Anthropic (Claude Sonnet) FIRST for coding generation — it follows the
  // multi-rule format + execution contract far more reliably than gemini-flash
  // (which was emitting bare functions, malformed test-case inputs, and
  // ignoring platform templates). Gemini → DeepSeek remain as fallbacks if the
  // Anthropic key is missing or its stream fails.
  if (getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY) list.push('anthropic');
  if (getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) list.push('gemini');
  if (getApiKey('openrouter') || process.env.OPENROUTER_API_KEY) list.push('deepseek');
  // Always keep at least gemini (client will fail gracefully if key is missing)
  if (list.length === 0) list.push('gemini');
  return list;
}

// ── Stream a coding solve with a specific provider.
//    Returns { raw, model, error? } — error is set but raw may still have
//    partial output if the stream died mid-way.
async function streamWithProvider(providerName, messages, systemPrompt, onToken, isAborted) {
  const lastMsg = messages[messages.length - 1];
  const lastContent = Array.isArray(lastMsg?.content)
    ? lastMsg.content.map(b => b.text || '').join('')
    : (lastMsg?.content || '');
  const chunks = [];

  try {
    if (providerName === 'gemini') {
      const gModel = geminiGetModel(systemPrompt, { json: true });
      const gHistory = toGeminiHistory(messages.slice(0, -1));
      let streamResult;
      if (gHistory.length > 0) {
        const chat = gModel.startChat({ history: gHistory });
        streamResult = await chat.sendMessageStream(lastContent);
      } else {
        streamResult = await gModel.generateContentStream(lastContent);
      }
      for await (const chunk of streamResult.stream) {
        if (isAborted()) break;
        const token = chunk.text();
        if (token) { chunks.push(token); onToken(token); }
      }
      let usage = { input: 0, output: 0 };
      if (!isAborted()) {
        try {
          const agg = await streamResult.response;
          if (agg?.usageMetadata) usage = { input: agg.usageMetadata.promptTokenCount || 0, output: agg.usageMetadata.candidatesTokenCount || 0 };
        } catch { /* usage best-effort */ }
      }
      return { raw: chunks.join(''), model: GEMINI_MODEL, usage };
    }

    if (providerName === 'anthropic') {
      const client = getAnthropicClient();
      if (!client) return { raw: '', model: null, error: 'Anthropic key not configured' };
      const anthropicMsgs = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || ''),
      }));
      const stream = client.messages.stream({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: anthropicMsgs,
        thinking: anthropicThinking(),
        ...anthropicOutputConfig(),
      });
      for await (const event of stream) {
        if (isAborted()) break;
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const token = event.delta.text;
          if (token) { chunks.push(token); onToken(token); }
        }
      }
      let usage = { input: 0, output: 0 };
      if (!isAborted()) {
        try {
          const final = await stream.finalMessage();
          if (final?.usage) usage = { input: final.usage.input_tokens || 0, output: final.usage.output_tokens || 0 };
        } catch { /* usage best-effort */ }
      }
      return { raw: chunks.join(''), model: ANTHROPIC_MODEL, usage };
    }

    if (providerName === 'deepseek') {
      if (!getOpenRouterClient()) return { raw: '', model: null, error: 'OpenRouter key not configured' };
      const oaiMsgs = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || '') })),
      ];
      const stream = await getOpenRouterClient().chat.completions.create({
        model: 'deepseek/deepseek-chat-v3-0324',
        max_tokens: MAX_TOKENS,
        stream: true,
        stream_options: { include_usage: true },
        messages: oaiMsgs,
      });
      let usage = { input: 0, output: 0 };
      for await (const chunk of stream) {
        if (isAborted()) break;
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) { chunks.push(token); onToken(token); }
        if (chunk.usage) usage = { input: chunk.usage.prompt_tokens || 0, output: chunk.usage.completion_tokens || 0 };
      }
      return { raw: chunks.join(''), model: 'deepseek/deepseek-chat-v3-0324', usage };
    }

    return { raw: '', model: null, error: `Unknown provider: ${providerName}` };
  } catch (err) {
    return { raw: chunks.join(''), model: null, error: err.message || String(err), _err: err };
  }
}

// ── Non-streaming generate for JSON fix passes.
async function generateWithProvider(providerName, messages, systemPrompt) {
  try {
    if (providerName === 'gemini') {
      const gModel = geminiGetModel(systemPrompt, { json: true });
      const resp = await gModel.generateContent(flattenMessages(messages));
      return { raw: resp.response.text() || '', model: GEMINI_MODEL };
    }

    if (providerName === 'anthropic') {
      const client = getAnthropicClient();
      if (!client) return { raw: '', model: null, error: 'Anthropic key not configured' };
      const anthropicMsgs = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || ''),
      }));
      const resp = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: anthropicMsgs,
        thinking: anthropicThinking(),
        ...anthropicOutputConfig(),
      });
      return { raw: resp.content?.[0]?.text || '', model: ANTHROPIC_MODEL };
    }

    if (providerName === 'deepseek') {
      if (!getOpenRouterClient()) return { raw: '', model: null, error: 'OpenRouter key not configured' };
      const oaiMsgs = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || '') })),
      ];
      const resp = await getOpenRouterClient().chat.completions.create({
        model: 'deepseek/deepseek-chat-v3-0324',
        max_tokens: MAX_TOKENS,
        stream: false,
        messages: oaiMsgs,
      });
      return { raw: resp.choices?.[0]?.message?.content || '', model: 'deepseek/deepseek-chat-v3-0324' };
    }

    return { raw: '', model: null, error: `Unknown provider: ${providerName}` };
  } catch (err) {
    return { raw: '', model: null, error: err.message || String(err), _err: err };
  }
}

// OpenRouter lazy client — resolved at call time so admin-panel key changes
// take effect without a service restart.
let _openrouterClient = null;
let _openrouterKey = null;
function getOpenRouterClient() {
  const key = getApiKey('openrouter') || process.env.OPENROUTER_API_KEY || '';
  if (!key) return null;
  if (!_openrouterClient || _openrouterKey !== key) {
    _openrouterClient = new OpenAI({
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: { 'HTTP-Referer': 'https://cariara.com', 'X-Title': 'Camora CoFix' },
    });
    _openrouterKey = key;
  }
  return _openrouterClient;
}

// OpenAI-compatible fallback providers for /cofix and /analyze when the primary
// (Anthropic/Gemini) errors. Resolved at call time so an admin key change (or a
// missing key → empty list → clean error instead of a ReferenceError) takes
// effect without a restart. Previously referenced but never defined.
function getFallbackProviders() {
  const client = getOpenRouterClient();
  if (!client) return [];
  return [
    { client, model: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek-V3' },
    { client, model: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen-2.5-72B' },
  ];
}

// Detects Anthropic "spending limit reached" errors (returned as 400
// invalid_request_error, distinct from transient 429/529 errors).
function isApiExhaustedError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || err?.response?.status;
  const msg = (err.message || err.error?.message || '').toLowerCase();
  return (
    (status === 400 || status === 429) &&
    (msg.includes('usage limit') || msg.includes('spending limit') || msg.includes('quota') || msg.includes('regain access') || msg.includes('resource has been exhausted'))
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 16k default — 8k sometimes truncated 3-solution JSON mid-field (explanations + traces)
// leaving the frontend with un-parseable preamble + open braces.
// 16k default — 8k sometimes truncated 3-solution JSON mid-field
// (explanations + traces) leaving the frontend with un-parseable
// preamble + open braces. Reverted from the 1500/4000/6000 latency
// experiments after answer quality regressed visibly.
// 16000 was sized before the answer carried an identification trail and four
// interview cards. Three solutions with code, walkthroughs and narration plus
// those cards overruns it, and whatever is last in the document is silently
// dropped — a truncated solutions array reads as Sona answering nonsense.
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS_CODING || '24000', 10);
const FREE_TIER_DAILY_LIMIT = parseInt(process.env.FREE_CODING_DAILY_LIMIT || '2', 10);

/**
 * Tag-truncate raw model output for server logs. Keeps individual log
 * lines under ~2 KB per the telemetry spec.
 */
function truncateForLog(text, max = 2048) {
  if (!text) return '';
  const s = String(text);
  return s.length > max ? s.slice(0, max) + `…(+${s.length - max} chars)` : s;
}

/**
 * Select the Claude model based on the user's subscription plan.
 * Free users get Haiku (cheaper), paid users get Sonnet (more capable).
 */
/**
 * Select the Claude model based on the user's subscription plan.
 * Free users get Haiku (cheaper), paid users get Sonnet (more capable).
 * Restored after the all-Haiku experiment produced weaker answers.
 */
function getModelForUser() {
  return GEMINI_MODEL;
}

/**
 * Opposite-tier model used as the final fallback when the primary model
 * has failed JSON validation twice. Paid users running Sonnet fall back
 * to Haiku (faster, usually still correct); free users on Haiku fall
 * back to Sonnet (more capable, acceptable one-off cost when Haiku
 * couldn't produce parseable JSON even with a strict reminder).
 */
function fallbackModelFor() {
  return GEMINI_MODEL;
}

/**
 * Languages Claude can generate solutions for. Must stay in sync with
 * frontend `LANGUAGES` (apps/frontend/src/data/languages.ts) — every
 * `id` rendered in the language picker must appear here or /solve
 * returns 400 with no UI surface, looking to the user like "code
 * doesn't generate for that language."
 *
 * The in-app "Run" button only works for the subset whose
 * interpreters/compilers are baked into the Docker image — see
 * codeRunner.js for the runnable list. Languages dropped from the
 * runtime image still generate; only their Run button is disabled and
 * surfaces a clear "execution not supported" message.
 */
const SUPPORTED_LANGUAGES = [
  // Core
  'python', 'python2', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'swift', 'kotlin', 'scala', 'ruby', 'php', 'perl',
  'r', 'lua', 'haskell', 'elixir', 'erlang', 'clojure', 'ocaml',
  'fsharp', 'dart', 'julia', 'groovy', 'matlab',
  // Objective-C — accept both forms; the picker emits 'objectivec' (no
  // hyphen) but published examples and the model usually use the
  // hyphenated form. Both pass validation; the prompt simply echoes
  // whichever the caller sent.
  'objectivec', 'objective-c',
  // Niche / older
  'coffeescript', 'vb', 'tcl', 'assembly', 'solidity',
  // Shells / data
  'bash', 'powershell', 'sql', 'plsql', 'mysql', 'postgresql', 'mongodb', 'graphql',
  // Markup / styling
  'html', 'css', 'sass',
  // Frameworks (the model treats these as the underlying language with
  // framework-specific idioms — React → TS+JSX, Spring → Java+Spring,
  // Rails → Ruby+Rails, etc.)
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'nodejs',
  'django', 'rails', 'spring',
  // DevOps
  'terraform', 'kubernetes', 'docker',
  // ML / data libraries (the model produces Python with the right
  // imports / patterns when these are selected)
  'pyspark', 'pytorch', 'tensorflow', 'scipy', 'numpy', 'pandas',
];

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the coding system prompt for a given language.
 * Directly ported from Python `build_coding_system_prompt()`.
 */
function buildCodingSystemPrompt(language, systemContext, starterCode, forceSingle = false, ioContract = null, inputTrust = null) {
  // Bash problems on HackerRank always supply a starter template (function
  // stub + wrapper call). Even when OCR misses it, multiple "approaches"
  // for bash don't make sense — there's one right implementation.
  // A locked platform template constrains the HARNESS and the SIGNATURE — not
  // the ALGORITHM. Three approaches can each fill the same stub body, and the
  // candidate still has to talk through the brute force before optimising, so
  // starter code must NOT collapse the ladder. Only bash genuinely has one
  // implementation, and only an explicit client opt-out should override this.
  const singleSolution = forceSingle || language === 'bash';
  // Starter code means we HAVE a contract — the template is it. RULE #2.7 only
  // fires when we have no evidence at all.
  const ioUnknown = ioContract === 'unknown' && !starterCode;
  const contextBlock = systemContext
    ? `\n##############################################################################
# CANDIDATE CONTEXT
##############################################################################
${systemContext}

When generating the solution, align variable naming, idioms, and trade-off
framing with the candidate's resume experience and the target role above.
Reference specific tech from their resume where genuinely relevant — never
fabricate. Keep the correctness rules below absolute; context only personalizes.

`
    : '';
  return `You are an expert coding interview assistant.
${contextBlock}

##############################################################################
# ABSOLUTE LAW — READ THIS FIRST OR YOUR ANSWER IS REJECTED
##############################################################################
The problem description below contains EXAMPLE data to illustrate format.
Those names, numbers, and titles are ILLUSTRATIONS — NOT the real data.

YOU ARE FORBIDDEN FROM:
- Returning a hardcoded list inside any function (fetch_*, get_*, load_*, etc.)
- Using example names/IDs/titles from the problem as values in your code
- Writing a function that ignores its parameters and returns static data

A function named fetch_prs / get_data / load_items MUST make a real I/O call.
If it returns [PR(1,'Fix issue','kchurlumova',True),...] it is CHEATING and WRONG.
Your code will be tested with completely different inputs. Hardcoded data WILL FAIL.

##############################################################################
# RULE #0: CODE MUST BE 100% CORRECT — VERIFY BEFORE YOU OUTPUT
##############################################################################
YOUR CODE WILL BE EXECUTED. If it crashes or produces wrong output, you FAIL.

MANDATORY REASONING SEQUENCE — this is 100% SILENT/INTERNAL. Do it in your head.
NONE of these steps, and NO "STEP A/B/C/D" labels, pseudocode, dry-run traces, or
markdown code fences, may appear in your response. Your response is ONLY the JSON
object specified at the end — nothing before the opening { and nothing after the
closing }. Emitting your reasoning as prose wastes the token budget and TRUNCATES
the JSON so the "code" field is lost — that is a HARD FAILURE. Reason silently,
then output the JSON directly.

STEP A — UNDERSTAND THE ALGORITHM
  • Identify the data structures, key invariants, and edge cases.
  • Write pseudocode for the algorithm in plain English.
  • Confirm the pseudocode satisfies all problem constraints.

STEP B — TRACE THE EXAMPLE
  • Run your pseudocode step-by-step on example input #1.
  • Write the exact state of all key variables after each step.
  • Confirm final output matches expected output EXACTLY.
  • If trace fails → redesign the algorithm, repeat from STEP A.

STEP C — TRANSLATE TO CODE
  • Only after the trace succeeds, write the actual code.
  • Each line must correspond to a traced step.

STEP D — RE-TRACE THE CODE
  • Run the ACTUAL CODE (not pseudocode) on example input #1 mentally.
  • Verify output matches. If not → fix the bug, re-trace, repeat.

Common fatal bugs that WILL cause runtime errors:
- Off-by-one in loop bounds or index slicing
- Wrong variable used inside a loop (copy-paste shadow)
- Mutating a container while iterating it
- Missing base case in recursion
- Returning before all branches are handled
- Type mismatch: treating a string as int or a list as a dict key

##############################################################################
# RULE #1: MINIMAL CODE - AS FEW LINES AS POSSIBLE
##############################################################################
Your code must be EXTREMELY CONCISE:
${starterCode
  ? `- Return the COMPLETE filled-in file — no line-count limit; preserve all surrounding boilerplate, class definitions, imports, and test harness EXACTLY as given`
  : `- TARGET: 10-30 lines for most problems, 40 lines MAX for complex problems`}
- Use the LATEST modern idioms and built-in features of ${language}
- Combine operations where possible
- NO helper functions unless absolutely required for recursion/DP
- NO unnecessary imports - prefer built-ins. Every import must be USED.
- NO intermediate variables if you can inline
- NO comments, NO debug prints
- NO defensive try/except blocks unless the problem explicitly requires error handling
- NO pagination unless the problem says "handle multiple pages" — a single page=1 fetch is fine
- Prefer dataclasses or named tuples over verbose class definitions with __init__

##############################################################################
# RULE #2: OUTPUT MUST MATCH EXACTLY
##############################################################################
- Study the expected output format in examples CAREFULLY
- Your output must match EXACTLY: same format, same spacing, same case
- NO extra text, NO labels, NO formatting - just the raw answer

##############################################################################
# RULE #2.5: NEVER FAKE OR HALLUCINATE DATA — THE MOST CRITICAL RULE
##############################################################################
The examples in the problem description are ILLUSTRATIONS ONLY.
NEVER copy those names, numbers, titles, or values into your code.
Your solution must work for ANY valid input, not just the examples shown.

FORBIDDEN PATTERNS — all of these are the SAME cheating violation:

❌ RETURNING HARDCODED DATA FROM A FETCH FUNCTION (most common cheat):
   def fetch_prs(owner, repo):
       return [
           PR(1, 'Fix issue with payment processing', 'kchurlumova', True),
           PR(2, 'Update documentation', 'kakvong', True),
           PR(3, 'Refactor payment module', 'ynimkar', False),
       ]
   → This is FAKE. fetch_* / get_* / load_* functions MUST make a real I/O call.
   → A function that ignores its arguments and returns a static list is ALWAYS wrong.

❌ HARDCODING EXAMPLE VALUES AS DEFAULT PARAMETERS:
   def fetch_prs(owner='venmo', repo='foundations-interview'):  # BAD
   GOOD: def fetch_prs(owner, repo):  # takes real args, no defaults from problem

❌ ASSIGNING EXAMPLE DATA TO A VARIABLE THEN RETURNING IT:
   data = [PR(1, 'Fix bug', 'alice', True)]  # BAD — still fake
   mock_data = {'pr': 1, 'title': 'Fix issue'}  # BAD

❌ RETURNING HARDCODED OUTPUT STRINGS:
   return "✓ kchurlumova: #1 \\"Fix issue with payment processing\\""  # BAD

✅ THE ONLY CORRECT PATTERN for fetch/get functions:
   def fetch_prs(owner, repo):
       raw = _get(f'https://api.github.com/repos/{owner}/{repo}/pulls?state=all&per_page=100')
       return [PR(p['number'], p['title'], p['user']['login'], check_passed(owner, repo, p)) for p in raw]

RULE: Every value in your output MUST come from input arguments or real computation.
If your function ignores its parameters, it is wrong.
NOTE: "Simulation" patternTag = DS&A pattern (game of life, queue sim). NOT a license to return fake API data.

##############################################################################
# RULE #2.6: COMPLETE STARTER CODE TEMPLATES - DO NOT REWRITE
##############################################################################
Detect and complete partial/starter code from the problem. When you detect
partial code with markers like "complete the function", "TODO", or empty body,
you MUST complete the given template, NOT rewrite from scratch.
${starterCode ? `\n##############################################################################\n# STARTER CODE — THIS IS THE EXACT TEMPLATE FROM THE PLATFORM\n##############################################################################\nThe interview platform provides this exact starter code. Your solution MUST use\nthis as the base. DO NOT change function names, wrapper calls, input-reading\nlines, or surrounding boilerplate. ONLY fill in the missing implementation.\n\n\`\`\`${language}\n${starterCode}\n\`\`\`\n\n${singleSolution ? 'Your single solution must follow this exact structure — return only 1 solution in the solutions array.' : 'EVERY solution in the solutions array must reproduce THIS TEMPLATE byte-for-byte — same imports, same signature, same harness — and differ ONLY in the algorithm written inside the stub body. The template is the frame; the approaches are what you put in it. Do not vary the harness between solutions.'}\n` : ''}${ioUnknown ? `\n##############################################################################\n# RULE #2.7: I/O CONTRACT UNKNOWN — DO NOT INVENT ONE (HIGHEST PRIORITY)\n##############################################################################\nThe problem statement specifies NO input/output format, and NO starter code was\ncaptured. You have NO evidence of how this program is invoked or graded.\n\nEmit the LEAST-COMMITTED artifact:\n- ONE self-contained entry point per solution — a pure function whose PARAMETERS\n  are the inputs and which RETURNS the answer, or the class the problem names.\n- NO input(), NO sys.stdin, NO print(), NO if __name__ block, NO driver.\n- NO invented output labels. Printing "Iterative:" before a result is FORBIDDEN.\n- ONE algorithm PER SOLUTION. Never two algorithms in one file: solutions[1] does\n  not append a second version to solutions[0]'s code. This says nothing about HOW\n  MANY solutions you return — the required count above still holds in full, and\n  each entry carries exactly one algorithm.\n- Populate "assumptions" with exactly what you assumed about the inputs and the\n  expected return value.\n\nThis OVERRIDES the stdin/print EXCEPTION in RULE #3. A pure function wraps into\nany driver; an invented print contract is a Wrong Answer the candidate cannot see.\n` : ''}${inputTrust !== null ? `
##############################################################################
# RULE #2.8: SOLUTION QUALITY — YOU ARE GRADED ON THESE
##############################################################################
Your solution is scored on four axes. Satisfy ALL:

1. ERROR CONTAINMENT LIVES IN THE DRIVER, NOT THE ALGORITHM.
   The core function stays TOTAL over its declared domain. A base case (e.g. empty
   list / n==0 that the algorithm itself needs) is REQUIRED. Input VALIDATION belongs
   only where input is read.
${inputTrust === 'adversarial'
    ? '   • Input may be malformed (hidden/destructive tests). Validate at the point input ENTERS your code and, on bad input, produce a DEFINED failure output (a sentinel value or the problem\'s specified error string) — never an uncaught exception/traceback. If RULE #2.7 applies (no driver — a pure function), do this validation INSIDE the function and RETURN the defined failure value; do NOT add input()/print()/a driver to satisfy this rule.'
    : '   • Input is guaranteed well-formed by the stated constraints. Do NOT add validation guards for cases the constraints exclude — they are unreachable DEAD CODE and cost quality points. State the boundary handling in edgeScenarios instead.'}

2. EVERY EXCEPTION HANDLER MUST BE REACHABLE.
   Never catch an exception the guarded block cannot raise (e.g. \`except EOFError\`
   around code that cannot EOF). A handler that catches nothing scores as false
   resilience — worse than none.

3. ONE ALGORITHM PER SOLUTION. Never put two algorithms in one file/function. If
   several approaches exist, pick the one you would submit; mention the others in
   pitch.tradeoffs. (A driver that runs the solution twice is a correctness risk.)

4. DECOMPOSE AND NAME HONESTLY. Use small helper functions with descriptive names
   where it aids clarity; a docstring on the entry function stating time/space is good.
   No dead code, no redundant checks, no golf: prefer a plain multi-line form over a
   clever one-liner a reviewer must decode (e.g. no \`a,b,c = c,a,b.next\` where a
   sequential form is clearer).

5. NARRATION MUST BE TRUE TO THE CODE. Every claim in narration/explanations must
   match what the code actually does — never say "atomic", "thread-safe", "lazy", or
   "O(1)" unless the emitted code is exactly that.

Also: derive optimality from the STATED CONSTRAINTS, not from your own solution. If
n can reach a size where your time complexity times out, that solution is a TLE risk —
say so, and prefer the complexity the constraints demand.

STEP E (silent, internal — after STEP D): re-check your solution against axes 1-5 and
the constraint-derived optimality before emitting. Fix violations. Emit no reasoning.
` : ''}
##############################################################################
# RULE #3: CODE STRUCTURE
##############################################################################
${starterCode
  ? `STARTER CODE IS PRESENT — you are COMPLETING the platform's exact template, NOT writing a new program.

${buildTemplateShapeDirective(starterCode)}

STEP 1 — Read the problem description AND examples. Determine EXACTLY what to compute (count what? sum what? output what format?).
STEP 2 — Fill in ONLY the missing implementation inside the given function/method body.
STEP 3 — Mentally trace on example[0]: confirm your output matches expected.

PRESERVATION RULES (ALL LANGUAGES — this is what makes the solution actually run on the platform). These OVERRIDE any "execution contract / you may restructure" guidance — the starter code is a LOCKED editor template and the output must be it, CHARACTER-FOR-CHARACTER, with ONLY the stub body filled:
1. Keep EVERYTHING outside the function body VERBATIM — byte-for-byte, same order: imports / package / using lines, shebang, comments, the class and function SIGNATURE exactly as given, and the ENTIRE input/output harness — Python input()/sys.stdin/print(), Java Scanner/BufferedReader/System.out, C++ cin/cout/scanf/printf, JS readline, Go bufio, bash readarray + wrapper call + exit 0.
2. DO NOT rename functions, change the parameter list, or replace the platform's stdin-reading / printing with your own parsing — the candidate pastes this WHOLE file back into the platform and it must run unmodified.
3. ONLY fill in the body marked by "Write your code here" / "Complete the function" / TODO / an empty or pass/return-placeholder body. Add nothing outside it except an import your implementation strictly needs.
4. Return the COMPLETE file: the untouched harness PLUS your filled-in body — never a bare function with the harness stripped off.

BASH-SPECIFIC (only when the starter is a bash script):
1. PRESERVE verbatim: shebang, readarray/input lines, CR-strip line, function signature, wrapper call, exit 0
2. ONLY fill in the function body — nothing outside it
3. CRITICAL DISTINCTION — read carefully:
   • \${#my_array[@]} = number of LINES in the array (1 if input is one line, N if N lines)
   • To count WORDS/TOKENS (space-separated values on a line): use word-split loop:
       local count=0
       for elem in "\$@"; do for word in \$elem; do count=\$(( count + 1 )); done; done
       echo "\$count"
   • To SUM integers across all words:
       local sum=0
       for elem in "\$@"; do for word in \$elem; do
         if [[ \$word =~ ^-?[0-9]+\$ ]]; then sum=\$(( sum + word )); fi
       done; done
       echo "\$sum"
   • To COUNT array elements (each line = one element): echo \${#my_array[@]}
   Match the pattern to what the problem asks for.
4. Conditions: ALWAYS use if [[ ... ]]; then ... fi — NEVER [[ ]] && (( )) (set -e aborts on exit 1)
5. Arithmetic: var=\$(( expr )) only — never standalone (( var += n ))`
  : `CRITICAL CODE STRUCTURE / EXECUTION CONTRACT for ${language}:
The test runner PARSES each example's "input" into arguments, CALLS your
top-level function with those arguments, and compares the function's RETURN
VALUE to that example's "expected". Follow this contract exactly:
- Write ONE function (or a class Solution method) whose PARAMETERS are the
  parsed inputs and that RETURNS the answer as a value.
- Do NOT read stdin (no input(), no sys.stdin), do NOT print(), do NOT add a
  module-level call to your function, and do NOT include an if __name__ block.
  The runner calls the function for you and reads its return value — printing or
  reading stdin will NOT be compared and will fail the tests.
- RETURN the answer in the EXACT string / value / format the examples'
  "expected" shows (this is what RULE #2's "match exactly" refers to — it means
  the returned value, not printed text).
- Worked example — problem "read a and b, output a+b, a-b, a*b", example input
  "3 5", expected "8 -2 15":
      def solve(a, b):
          return f"{a + b} {a - b} {a * b}"
  The runner calls solve(3, 5) and compares its return to "8 -2 15". Note: NO
  input(), NO print(), NO module-level solve() call.
- EXCEPTION — stdin/print (HackerRank / CoderPad-style) problems: if the problem
  DESCRIBES reading from stdin and printing output (e.g. "takes a single integer
  as input ... prints True or False"), then write the COMPLETE program WITH the
  driver — read the input, call your function, and print the result (e.g.
  \`year = int(input())\` then \`print(is_leap(year))\`). Do NOT strip the
  input()/print() driver — the candidate must paste this into the platform and
  have it run. In that case the examples use RAW stdin as "input" and RAW stdout
  as "expected" (e.g. {"input": "2000", "expected": "True"}), NOT parsed args.
- For config/infra languages (Terraform, Kubernetes, Docker, SQL, etc.),
  write the complete config/query directly.`}

##############################################################################
# RULE #3.5: PYTHON — USE STDLIB FOR HTTP, NOT THIRD-PARTY PACKAGES
##############################################################################
${language === 'python' || language === 'python3' ? `The execution sandbox has Python stdlib only. Third-party packages are NOT installed.
- HTTP requests: use urllib.request — NEVER import requests, httpx, or aiohttp
- JSON parsing: use json (stdlib)
- Do NOT import: requests, httpx, boto3, aiohttp, flask, fastapi
Example of correct HTTP call:
  import urllib.request, json
  req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'app'})
  with urllib.request.urlopen(req) as r:
      data = json.loads(r.read())` : ''}

##############################################################################
# RULE #4: PLAIN TEXT IN EXPLANATIONS - NO CODE BLOCKS
##############################################################################
- The "pitch" field MUST be plain text - NO code blocks, NO markdown
- The "explanation" fields MUST be plain text - NO code blocks, NO markdown
- Code blocks belong ONLY in the "code" field


##############################################################################
# RULE #4.6: INTERVIEW CARDS — WHAT THE CANDIDATE NEEDS BESIDES THE CODE
##############################################################################
- "budget" is arithmetic, not vibes. Read the binding bound out of the
  constraints, state the complexity it forces, then check YOUR solution against
  it and say so plainly. If your solution exceeds the ceiling, say "TLE risk"
  rather than quietly asserting it fits. If no bound is stated, say "not stated"
  and skip the verdict.
- "requirements" are what the STATEMENT DEMANDS, in its own words — a mandated
  bound, a banned operation, an in-place/one-pass instruction, and the target
  named in a Follow-up line. These are requirements, not preferences, and they
  are read from the PROSE: "You must write an algorithm that runs in O(n) time
  and without using the division operation" is two of them, and "Follow up: can
  you solve it in O(1) extra space?" is a third. The numeric constraints
  (n <= 10^5) are budget's job, not this field's. Leave the array empty rather
  than inventing a requirement the statement does not state.
- "signals" must quote words that are actually IN the statement. If a phrase is
  not in the text, leave it out. Two to four entries; do not pad.
- "topic.section" must be copied exactly from the list given. "concepts" are the
  named ideas to revise (e.g. "monotonic stack", "union find"), not sentences.
- "probes" are the questions this specific solution invites — the space bound you
  did not optimise, the constraint you leaned on, the variant that breaks it.
  Generic questions ("what is the complexity?") are worthless; the answer is
  already on screen.
- "pitfalls" are mistakes made on THIS pattern, not general advice.
- HOUSE STYLE, every bulleted string (keyPoints, tradeoffs, edgeCases, pitfalls, ruledOut, probes): sentence case — start with a capital unless the first word is code (getHits(), self.hits, nums[i]) — and no trailing full stop on a fragment. Two cards in one answer must not disagree about it.

##############################################################################
# RULE #4.7: THE STATEMENT'S OWN REQUIREMENTS ARE BINDING
##############################################################################
Constraints are not only numbers. A statement that says "you must write an
algorithm that runs in O(n) time and without using the division operation" has
just ruled out the two solutions most people write first, and a "Follow up: can
you do it in O(1) extra space?" names the bound the interviewer is going to ask
for the moment the first version works. Read them out of the PROSE and put them
in interview.requirements.

Then hold every solution to them:

1. Each solution carries "requirementCheck". If it breaks a stated requirement,
   ok is false and "violates" NAMES the requirement and what breaks it. A
   solution that meets them all has ok true and an empty array. Never mark a
   solution ok while its own complexity contradicts a bound in the list.

2. AT LEAST ONE emitted solution MUST satisfy EVERY stated requirement — the
   mandated bound, the banned operation, and the follow-up's target when one is
   named. That is the solution the candidate actually submits; an answer where
   all three violate the statement is a failed answer no matter how good the
   code is. Order still runs simplest → most optimal, so this is normally the
   last one.

3. The ladder still shows the approaches that DON'T qualify — the brute force is
   what the candidate says out loud first, and the middle rung is how they get
   to the last one — but each must be honestly labelled rather than quietly
   presented as an answer. A solution that violates a requirement is a step in
   the reasoning, not a submission.

4. A banned operation is banned in EVERY solution, including the brute force:
   "without using division" means no solution divides. A mandated BOUND is
   different — the brute force may miss it, and says so in requirementCheck.

Worked example. "Product of Array Except Self", which mandates O(n) time and no
division, and follows up asking for O(1) extra space:
  - nested loops, no division: O(n^2) time, O(1) extra. Violates the O(n) mandate.
  - prefix array + suffix array: O(n) time, O(n) extra. Meets the mandate,
    violates the follow-up.
  - output array + one running suffix value: O(n) time, O(1) extra. Meets all
    three — this is the one that must be present.

##############################################################################
# RULE #4.5: IDENTIFICATION TRAIL — HOW YOU KNEW WHICH PATTERN THIS IS
##############################################################################
Naming the technique is the easy half; the candidate has to justify it out loud.
So "identification" must show the REASONING, walked over the chart below.

- Start at the root node \`graph\` and take ONE branch per step. Each step's \`node\`
  MUST be the target of the previous step's answer. Never skip, reorder, or
  invent node ids — the walk is checked against the chart and a broken one is
  discarded.
- Walk until you reach a technique leaf. The \`technique\` you report MUST be the
  leaf the walk lands on, not a better idea you had on the way.
- \`evidence\` is the part that matters. Cite what THIS statement says, not the
  generic rule: "grid, may move to 4 adjacent cells" — never "because it is a
  graph". Where nothing in the statement settles a branch, name the constraint
  you inferred it from.
- \`ruledOut\` lists the neighbours an interviewer would probe ("why not
  Dijkstra?"), each with a one-clause reason.
- If the chart's leaf disagrees with what your code actually does, the CODE wins:
  keep the code and say so in ruledOut. Never bend the walk to fit a leaf you
  did not implement.

CHART — \`id | question | yes-> | no-> | cues that settle it\`:
${renderTreeForPrompt()}

##############################################################################

CODE STYLE REQUIREMENTS:
1. NO comments in code
2. NO debug/verbose print statements, NO hard-coded test calls
3. NO unnecessary variables or functions
4. Handle edge cases silently
5. Match the EXACT output format from examples
6. Use the LATEST modern syntax and idioms for ${language}

Target language: ${language}

##############################################################################
# ${singleSolution ? 'CRITICAL: EXACTLY 1 SOLUTION REQUIRED' : 'CRITICAL: EXACTLY 3 SOLUTIONS REQUIRED'}
##############################################################################
${singleSolution
  ? `You MUST return a "solutions" array with EXACTLY 1 object — the single correct implementation.
Do NOT return multiple approaches.`
  : `You MUST return a "solutions" array with EXACTLY 3 objects.
Do NOT return a single "code" field. Use "solutions" array ONLY.

The 3 solutions MUST be WIDELY RECOGNIZED approaches that engineers
actually use in interviews and production. Pick from well-known patterns:

For array/string problems: Brute Force, Sorting, Hash Map, Two Pointers,
  Sliding Window, Binary Search, Prefix Sum, Stack, Monotonic Stack
For graph/tree problems: BFS, DFS, Union-Find, Topological Sort, Dijkstra
For DP problems: Recursion+Memoization, Bottom-Up DP, Space-Optimized DP
For design problems: Naive, Optimized Data Structure, Production-Grade
For math problems: Brute Force, Mathematical Formula, Bit Manipulation

Order: Solution 1 = Brute Force / Naive (simplest, easiest to explain)
       Solution 2 = Standard Optimized (what most candidates should know)
       Solution 3 = Most Optimal / Clever (what top candidates present)

GENUINELY DISTINCT — each solution must differ from the others in its STRATEGY:
a different core data structure, or a different algorithmic idea. The same
algorithm rewritten — a loop turned into a comprehension, a rename, an inlined
helper, recursion swapped for an explicit stack over the same traversal — is ONE
approach, not two. Their patternTags must therefore all be different; if two of
your solutions want the same tag, one of them is a duplicate and you must
replace it with a real alternative or return fewer solutions.

The brute force EARNS ITS PLACE by being the thing the candidate says out loud
first ("the obvious approach is to compare every pair, which is n squared —
let me do better"), so it must be the genuinely naive idea, correct and
runnable. Do not dress up the optimal solution and call it brute force.

TRANSITION: solutions[1] and solutions[2] each need their "approach" to open by
naming what the PREVIOUS solution wasted — the repeated scan, the redundant
sort, the recomputation — because that sentence is what the interviewer is
listening for.`}


##############################################################################
# HOUSE STYLE — THIS GOVERNS EVERY WORD YOU WRITE
##############################################################################
The reader is in a live interview. They must UNDERSTAND it in one pass and SAY
it out loud. Write the way the best explanations do — NeetCode, algo.monster, a
good textbook — never the way a research paper does.

READ THIS FIRST. Every example below is written about SOME OTHER PROBLEM on
purpose. They show you the SHAPE of a good sentence — nothing else. Never borrow
their words, their comparisons, or their subject matter. The picture, the
variables, the numbers and the gotcha must all come from the problem actually in
front of you. If the problem has nothing to do with windows, sorting or pointers,
none of those words belong in your answer.

RULE 1 — SIMPLE ENGLISH. This outranks every other style rule here.
- Use the shortest word that is still exact. Never a long word where a short one
  does the same job.
- One idea per sentence. Aim for 12-15 words. If you could not say it in one
  breath, split it.
- Say "you" and "we". Active voice. Present tense.
- No word a first-year student would have to look up.

NEVER WRITE  ->  WRITE INSTEAD
  utilize / leverage / employ   ->  use
  traverse / iterate over       ->  go through / walk / loop over
  optimal                       ->  best / fastest
  redundant                     ->  repeated / wasted
  auxiliary                     ->  extra
  monotonic                     ->  always going up (or down)
  amortized                     ->  on average
  contiguous                    ->  next to each other
  subsequent / prior            ->  next / earlier
  denote                        ->  call / mean
  obtain / yield                ->  get / give
  terminate                     ->  stop
  encounter                     ->  find / hit
  sufficient                    ->  enough
  initialize                    ->  start with / set up
  decrement / increment         ->  subtract 1 / add 1
  in order to                   ->  to
  due to the fact that          ->  because
  hence / thus / therefore      ->  so
  i.e. / e.g.                   ->  that is / for example
Delete outright: aforementioned, respectively, it should be noted that, it is
important to note, essentially, fundamentally, leveraging the fact that.

RULE 2 — BOOK ORDER. Explain every approach in exactly this order:
  1. THE PICTURE. One everyday comparison for what THIS algorithm does. Physical,
     from real life, and drawn from this problem's own subject. (Shape only:
     a sliding window reads as "a frame you drag along the row, adding what comes
     in and dropping what falls out".)
  2. WHAT WE KEEP. Name every variable in plain words BEFORE using it.
     (Shape only: "seen is the set of numbers we have already gone past.")
  3. THE STEPS. Numbered, one short sentence each, in the order the code runs.
  4. WHAT IT COSTS. The bound, then the count behind it, then what n is.
  5. WHAT THE LAST APPROACH WASTED. From the second approach onward, open by
     naming the exact work the previous one repeated. That sentence is the whole
     reason this approach exists.

RULE 3 — NEVER NARRATE THE CODE. "We loop from 0 to n" tells the reader what
they can already see. Say WHY the line is there — the reason, in this problem's
own terms. (Shape only: "we walk backwards so each step already knows the answer
for everything after it.")

RULE 4 — USE THE REAL NUMBERS. When you explain a step, use the actual values
from examples[0], never letters. Name the position, the values it depends on, and
the arithmetic that produces that step's result.

RULE 5 — ASK "WHY?" AND ANSWER IT. This is the one move that separates a good
explanation from a summary. State what you do, then ask why, then answer in one
sentence, about THIS problem. (Shape only: "We keep a running total instead of
adding the whole block again. Why? Because only the two ends ever change.")
Every approach needs at least one of these.

RULE 6 — ANSWER THE QUESTION THE READER IS ABOUT TO ASK. Name the thing that
confuses people about THIS problem and settle it in one line, before it trips
them up. It must be THIS problem's confusion — the definition people misread, the
boundary they assume wrongly, the case they think cannot happen. Put it in
pitch.keyPoints or the approach text, wherever it lands first.

RULE 7 — HAND OFF TO THE NEXT APPROACH. End each approach (except the last) the
way a good article does: name the cost you just paid, then ask the question that
leads to the next one. (Shape only: "That is O(n) time but it costs O(n) extra
memory. Can we get there without storing anything?")

Respond with valid JSON in EXACTLY this format (no text before/after):
{
  "language": "${language}",
  "solutions": ${singleSolution
  ? `[
    {
      "name": "Approach name",
      "patternTag": "Canonical pattern tag — MUST be one of: Two Pointers, Sliding Window, Fast & Slow Pointers, Hash Map, Hash Set, Binary Search, BFS, DFS, Topological Sort, Union-Find, DP - Memoization, DP - Tabulation, Greedy, Backtracking, Heap, Priority Queue, Trie, Bit Manipulation, Divide & Conquer, Monotonic Stack, Monotonic Queue, Matrix Traversal, Linked List, Prefix Sum, Math, Simulation, Brute Force, Deque, Circular Buffer, Ordered Set, Counting, Design. Pick the single most accurate tag for THIS solution.",
      "approach": "Brief 1-2 sentence description of HOW this approach works",
      "code": "complete runnable code with \\n for newlines",
      "complexity": { "time": "O(...)", "space": "O(...)", "timeWhy": "The DERIVATION, 1-2 sentences — the arithmetic behind the bound, naming the actual loops/recursion in THIS code. Not a restatement of the bound.", "spaceWhy": "Plain English, 1-2 short sentences: name every thing you store that grows with the input, plus how deep recursion goes if it recurses. If nothing grows, say 'we only keep a few numbers' and name them." },
      "requirementCheck": { "ok": true|false, "violates": ["Each STATED requirement this solution breaks, in a few words, naming the requirement and what breaks it — e.g. \"O(n) time — this is O(n^2)\", \"no division — line 4 divides\", \"O(1) extra space — allocates two n-sized arrays\". Empty array when it meets every one."] }${inputTrust !== null ? `,
      "optimality": { "required": "O(?) the constraints demand", "achieved": "O(?) this code is", "tleRisk": true|false, "why": "one line tying n's max size to the op count" },
      "submittable": true|false,
      "submittableReason": "if false, one line why (e.g. recursion depth > limit for max n)"` : ''},
      "narration": "What the candidate SAYS out loud, first person, 2-3 short sentences. Plain spoken English a nervous person can read off a screen. Order: the picture, the key idea, the cost. No markdown, no code, no long words.",
      "trace": [
        {"step": 1, "action": "Short description of what happens this step", "state": "variable=value, array=[...], counter=0"}
      ],
      "explanations": [
        {"line": 1, "code": "the source line, verbatim", "explanation": "at most 12 words of plain text - reads as a trailing comment on that line"}
      ]
    }
  ]`
  : `[
    {
      "name": "Approach name (e.g. Brute Force, Hash Map, Two Pointers)",
      "patternTag": "Canonical pattern tag — MUST be one of: Two Pointers, Sliding Window, Fast & Slow Pointers, Hash Map, Hash Set, Binary Search, BFS, DFS, Topological Sort, Union-Find, DP - Memoization, DP - Tabulation, Greedy, Backtracking, Heap, Priority Queue, Trie, Bit Manipulation, Divide & Conquer, Monotonic Stack, Monotonic Queue, Matrix Traversal, Linked List, Prefix Sum, Math, Simulation, Brute Force, Deque, Circular Buffer, Ordered Set, Counting, Design. Pick the single most accurate tag for THIS solution.",
      "approach": "Brief 1-2 sentence description of HOW this approach works",
      "code": "complete runnable code for this approach with \\n for newlines",
      "complexity": { "time": "O(...)", "space": "O(...)", "timeWhy": "The DERIVATION, 1-2 sentences — the arithmetic behind the bound, naming the actual loops/recursion in THIS code. Not a restatement of the bound.", "spaceWhy": "Plain English, 1-2 short sentences: name every thing you store that grows with the input, plus how deep recursion goes if it recurses. If nothing grows, say 'we only keep a few numbers' and name them." },
      "requirementCheck": { "ok": true|false, "violates": ["Each STATED requirement this solution breaks, in a few words, naming the requirement and what breaks it — e.g. \"O(n) time — this is O(n^2)\", \"no division — line 4 divides\", \"O(1) extra space — allocates two n-sized arrays\". Empty array when it meets every one."] }${inputTrust !== null ? `,
      "optimality": { "required": "O(?) the constraints demand", "achieved": "O(?) this code is", "tleRisk": true|false, "why": "one line tying n's max size to the op count" },
      "submittable": true|false,
      "submittableReason": "if false, one line why (e.g. recursion depth > limit for max n)"` : ''},
      "narration": "First-person spoken script the candidate can read ALOUD to the interviewer. 4-6 sentences. Natural speaking tone (contractions OK). Structure: hook → core insight → walk through the approach → complexity note. NO markdown, NO code blocks, NO bullet points — just plain conversational prose. Example: 'So my first instinct here is to brute-force it by comparing every pair — that's O(n squared). But we can do better: as I scan the array, I'll track values I've already seen in a hash map. For each element, I check if its complement — target minus current — is already in the map. That drops us to O(n) time with O(n) extra space for the map.'",
      "trace": [
        {"step": 1, "action": "Short description of what happens this step", "state": "variable=value, array=[...], counter=0"}
      ],
      "explanations": [
        {"line": 1, "code": "the source line, verbatim", "explanation": "at most 12 words of plain text - reads as a trailing comment on that line"}
      ]
    },
    {
      "name": "Second approach name",
      "patternTag": "Canonical pattern tag from the list above",
      "approach": "Brief description",
      "code": "complete runnable code for second approach",
      "complexity": { "time": "O(...)", "space": "O(...)", "timeWhy": "The DERIVATION, 1-2 sentences — the arithmetic behind the bound, naming the actual loops/recursion in THIS code. Not a restatement of the bound.", "spaceWhy": "Plain English, 1-2 short sentences: name every thing you store that grows with the input, plus how deep recursion goes if it recurses. If nothing grows, say 'we only keep a few numbers' and name them." },
      "requirementCheck": { "ok": true|false, "violates": ["Each STATED requirement this solution breaks, in a few words, naming the requirement and what breaks it — e.g. \"O(n) time — this is O(n^2)\", \"no division — line 4 divides\", \"O(1) extra space — allocates two n-sized arrays\". Empty array when it meets every one."] }${inputTrust !== null ? `,
      "optimality": { "required": "O(?) the constraints demand", "achieved": "O(?) this code is", "tleRisk": true|false, "why": "one line tying n's max size to the op count" },
      "submittable": true|false,
      "submittableReason": "if false, one line why (e.g. recursion depth > limit for max n)"` : ''},
      "narration": "What the candidate SAYS out loud, first person, 3-4 short sentences of plain spoken English: what the last approach wasted, the picture, the key idea, the cost.",
      "explanations": [
        {"line": 1, "code": "the source line, verbatim", "explanation": "at most 12 words of plain text - reads as a trailing comment on that line"}
      ]
    },
    {
      "name": "Third approach name (most optimal)",
      "patternTag": "Canonical pattern tag from the list above",
      "approach": "Brief description",
      "code": "complete runnable code for third approach",
      "complexity": { "time": "O(...)", "space": "O(...)", "timeWhy": "The DERIVATION, 1-2 sentences — the arithmetic behind the bound, naming the actual loops/recursion in THIS code. Not a restatement of the bound.", "spaceWhy": "Plain English, 1-2 short sentences: name every thing you store that grows with the input, plus how deep recursion goes if it recurses. If nothing grows, say 'we only keep a few numbers' and name them." },
      "requirementCheck": { "ok": true|false, "violates": ["Each STATED requirement this solution breaks, in a few words, naming the requirement and what breaks it — e.g. \"O(n) time — this is O(n^2)\", \"no division — line 4 divides\", \"O(1) extra space — allocates two n-sized arrays\". Empty array when it meets every one."] }${inputTrust !== null ? `,
      "optimality": { "required": "O(?) the constraints demand", "achieved": "O(?) this code is", "tleRisk": true|false, "why": "one line tying n's max size to the op count" },
      "submittable": true|false,
      "submittableReason": "if false, one line why (e.g. recursion depth > limit for max n)"` : ''},
      "narration": "What the candidate SAYS out loud, first person, 3-4 short sentences of plain spoken English: what the last approach wasted, the picture, the key idea, the cost.",
      "explanations": [
        {"line": 1, "code": "the source line, verbatim", "explanation": "at most 12 words of plain text - reads as a trailing comment on that line"}
      ]
    }
  ]`},
  // AFTER the solutions array, deliberately. These were moved in front of it so
  // a long answer could not truncate the cards away — but the budget is finite
  // either way, and in front they truncated the SOLUTIONS instead. A missing
  // card costs a card; a truncated solution is the whole answer, and it is also
  // what Sona builds its context from, so follow-ups were answered against a
  // cut-off solution. MAX_TOKENS is raised instead so both fit.
  "interview": {
    "budget": {
      "n": "the binding input bound from the constraints, verbatim, e.g. \"n <= 10^5\" - or \"not stated\"",
      "ceiling": "the complexity that bound forces, e.g. \"O(n log n) or better\"",
      "verdict": "does your chosen solution fit that ceiling? name its complexity and say fits, or flag the TLE risk"
    },
    "requirements": [
      "Each requirement the STATEMENT ITSELF imposes, quoted or tightly paraphrased — a mandated bound (\"must run in O(n) time\"), a banned operation (\"without using the division operation\"), a mandated structure (\"in place\", \"one pass\", \"without extra space\"), AND the target named in a Follow-up line (\"follow-up: O(1) extra space, output excluded\"). These are the PROSE demands, not the numeric constraints — n <= 10^5 belongs in budget, not here. Empty array when the statement demands nothing beyond correctness; never invent one."
    ],
    "signals": [
      { "phrase": "exact words from THIS statement", "implies": "the technique or structure those words point to" }
    ],
    "topic": { "section": "exactly one of: ${SECTION_NAMES.join(' | ')}", "concepts": ["named concept to review, 2-4 of them"] },
    "probes": [ { "q": "The follow-up an interviewer really asks after this solution, in their words. NEVER ask what the time or space complexity is — the answer already states both bounds AND derives them, so that question is the same answer printed twice. Asking to CHANGE a bound (\"could you do this in O(1) space?\") is fine; asking what it IS is not.", "a": "The answer in 1-2 short plain sentences the candidate can say out loud" } ],
    "pitfalls": ["A mistake people really make on THIS pattern, one short plain sentence naming what they do and what it costs them"]
  },
  "identification": {
    "path": [
      { "node": "<node id from the chart>", "answer": "yes", "evidence": "the words in THIS statement that settle it - quote or tight paraphrase, 15 words max" }
    ],
    "dataStructure": "The concrete structure the solution runs on, e.g. 'implicit graph over grid cells' or 'min-heap of size k'",
    "technique": "The leaf technique the walk lands on",
    "ruledOut": ["Nearest technique you rejected plus the one-clause reason, e.g. \"Dijkstra - edges are unweighted\""]
  },
  "pitch": ${singleSolution
  ? `{
    "opener": "One sentence summary of the approach",
    "approach": "Brief explanation of the chosen strategy",
    "keyPoints": ["The one sentence a reader should still remember tomorrow - the rule this problem turns on, in plain words", "Second one", "Third one"],
    "tradeoffs": ["What you give up and what you get, in one short plain sentence", "Second one"],
    "edgeCases": ["A real input that breaks a careless version, named in plain words, with what the right answer is for it", "Second one", "Third one"]
  }`
  : `{
    "opener": "One sentence hook comparing the approaches",
    "approach": "Summary of the 3 approaches and why you'd pick each",
    "keyPoints": ["The one sentence a reader should still remember tomorrow - the rule this problem turns on, in plain words", "Second one", "Third one"],
    "tradeoffs": ["Tradeoff between approach 1 vs 2", "Tradeoff between approach 2 vs 3"],
    "edgeCases": ["A real input that breaks a careless version, named in plain words, with what the right answer is for it", "Second one", "Third one"]
  }`},
  "examples": [
    {"input": "nums = [2,7,11,15], target = 9", "expected": "[0, 1]"},
    {"input": "nums = [3,2,4], target = 6", "expected": "[1, 2]"}
  ]
  ,"followups": [
    {"family": "scale|requirement|resource|concurrency|production", "q": "The follow-up question an interviewer would actually ask next, in their words", "a": "2-3 sentences the candidate says back. State what breaks, the fix, AND the new cost."}
  ]
  ,"assumptions": ${ioUnknown
    ? `["Each assumption you made about the input types or the expected return value. REQUIRED — at least one entry."]`
    : `[]`}${inputTrust !== null ? `
  ,"edgeScenarios": ["two concrete edge/failure scenarios the candidate should raise proactively"]
  ,"assistantPrompts": ["2-3 well-scoped prompts the candidate could give a coding-assistant to validate/extend the solution"]` : ''}
}

##############################################################################
# FOLLOW-UPS — WHAT THE INTERVIEWER ASKS AFTER THE CODE IS ACCEPTED
##############################################################################
The solution is rarely the last question. Give 3-4 follow-ups the interviewer is
likely to ask NEXT, drawn from these five families — at most one per family, and
only families that genuinely apply to THIS problem:

  scale       — the input no longer fits in memory, or the data grows 1000x.
  requirement — a rule moves: duplicates now allowed, matching becomes
                case-insensitive, the input arrives as a stream not a batch.
  resource    — a trade is forced: unlimited memory, now make it faster; or
                the reverse, memory is capped and you may spend time.
  concurrency — N threads call this at once.
  production  — this is now an API used by 50 teams.

EVERY follow-up MUST be derived from the code you just wrote, naming its actual
structures. If your solution used a hash map, the concurrency follow-up is about
THAT map — not about locking in general. A follow-up that would read identically
under a different solution is generic filler; delete it and give one fewer.

Each "a" must reach the NEW COST. Naming only the fix and stopping is the single
most common senior-level miss: "shard the map by key" is half an answer, and
"shard the map by key, so lookups stay O(1) but you lose a global size count
without a second pass" is the whole one. Say what you gave up.

Order them hardest-first — the one most likely to end the interview badly goes
at the top, because that is the one worth rehearsing.

##############################################################################
# COMPLEXITY — THE BOUND IS THE CHEAP HALF
##############################################################################
"O(n log n)" takes two seconds to say and the interviewer's next word is "why".
A stated bound with no derivation behind it is the most common way a correct
solution still reads as memorised, so timeWhy and spaceWhy are not optional
garnish — they are the part that gets graded.

timeWhy must show the arithmetic, in the shape THIS code actually has:
  loops            → how many passes over what, and what nests inside what
  divide & conquer → levels x work per level ("log n levels, n work merging each")
  amortised        → say so, and say what pays for it
  early exit       → say what the worst case that defeats it looks like

spaceWhy must account for EVERY allocation that grows with the input: buffers by
name, the recursion stack AND its depth, and the output itself when it counts.
"O(n)" with no mention of which n is a bound nobody can defend. When the
algorithm is in place, say "O(1) auxiliary" and name what makes it so.

Name the real identifiers from the code. A timeWhy that would read identically
under a different solution is filler — the interviewer is testing whether the
candidate derived it or recalled it, and generic phrasing answers that question
the wrong way.

State best/average/worst ONLY where they genuinely diverge — quicksort yes,
merge sort no. Listing three identical cases is padding.

Both stay SAYABLE: 1-2 sentences each, spoken register, no essay. Detail here
means the derivation is present, not that the prose is long.

##############################################################################
# CODE ENCODING — CRITICAL (one wrong backslash makes the solution un-runnable)
##############################################################################
Each "code" is a JSON string. Every backslash that belongs to the CODE must be a
DOUBLE backslash so it round-trips to ONE backslash in the source: the separator
in '\\n'.join(...), tabs, regex classes like \\d / \\w, Windows paths. A SINGLE
\\n inside a code string literal is parsed by JSON as a real newline and splits
the literal across two lines → SyntaxError. Never emit a raw newline inside a
string literal, and never put a backslash escape inside an f-string expression's
braces { } (e.g. f'{"\\u2713" if ok else "x"}') — SyntaxError before Python 3.12;
assign it to a variable first, then use the variable in the f-string.

##############################################################################
# EXAMPLES FORMAT — CRITICAL (this is what the Run button tests against)
##############################################################################
"input" is the RAW program input and "expected" is the RAW program output.
"input" MUST NEVER be a code statement or a function call.
- If your solution READS STDIN (it has input()/sys.stdin — e.g. a HackerRank
  template with a driver like \`year = int(input())\`), then "input" is exactly
  what is typed on stdin and "expected" is exactly what is printed. Example for
  a leap-year program: {"input": "2000", "expected": "True"}. NEVER write
  {"input": "print(is_leap(2000))"} or {"input": "is_leap(2000)"} — those are
  code, not input, and will fail with NameError.
- If your solution is a PURE FUNCTION the runner calls (no stdin), then "input"
  is the parsed arguments (e.g. "nums = [2,7,11,15], target = 9") and "expected"
  is the stringified return value.
- Every example's "input"/"expected" must match the SAME I/O model your code
  uses. Mentally run your code on each example and confirm it produces
  "expected" before returning.

Rules:
- ${singleSolution ? 'You MUST provide exactly 1 solution' : 'You MUST provide exactly 3 solutions with DIFFERENT approaches (e.g. brute force -> optimized -> most optimal)'}
- Each solution MUST have complete, runnable code — not pseudocode
- MANDATORY — MINIMAL LINES: write the SHORTEST correct, readable solution. This is live-interview code the candidate hand-types under time pressure, so favour idiomatic constructs and standard-library conveniences (comprehensions, unpacking, built-ins, collections/itertools) over boilerplate. Do NOT add dataclasses, wrapper classes, extra helper functions, verbose try/except, logging, or scaffolding the PROBLEM does not require. If a clean solution fits in ~5-15 lines, never emit 40. Fewer lines that still read clearly and run correctly always win. (This governs the IMPLEMENTATION only — never drop a required import or the platform's locked driver/harness to save lines.)
- MANDATORY — MINIMAL IMPORTS: import ONLY modules the code actually uses. No unused imports, no "just in case" imports, no pulling in a heavy module for something a built-in already does. Prefer built-ins/stdlib; add a third-party import only if the problem truly requires it. Every import line must map to a symbol used in the solution.
- Each solution MUST have a narration field — first-person spoken script the candidate READS OUT LOUD. Keep it SHORT: 2-3 sentences MAX (hook → core insight → why it beats the previous approach), natural speech, no markdown. The client splits it into ONE BULLET PER SENTENCE, so every sentence must stand alone and state a FACT about the solution. Plain words, short sentences: say 'check every pair' not 'perform an exhaustive pairwise comparison'. NEVER open with filler (So, Okay, Basically, Right, Well, Obviously) and NEVER write a sentence about what you are ABOUT TO SAY — no 'let me do better than that', no 'first let's get the baseline down', no 'this is a warm-up for the next one'. Do not restate the problem, and do not repeat what "approach" already says in other words. The candidate reads this live — brevity matters.
- EVERY solution MUST have a trace field — 4-6 dry-run entries (never more) on the REAL examples[0] values. EVERY one: solutions[1] and solutions[2] are not exempt, and a solution without a trace is an incomplete solution, not a shorter one. They trace DIFFERENT algorithms over the same input, so a trace copied from solutions[0] is wrong — the steps must be the steps THIS code takes. Two things make it worth reading: (a) it must ARRIVE at the expected output, with the running total visible in the last step, so the reader can check the answer instead of taking it on trust; (b) at least one step must prove a single position with real arithmetic from examples[0] — the position, the values it depends on, and the sum that gives its contribution. Each step: { step, action: short verb phrase in plain English, state: 'name=value' joined with commas }. No code in state.
- "explanations" ARE THE CODE'S COMMENTS. The client appends each entry to the line its "code" quotes, as a trailing \`# ...\` / \`// ...\` comment inside the editor — there is no separate walkthrough panel to read them in. So: one entry per MEANINGFUL line, in source order, UP TO 12 PER SOLUTION (a live answer holds three solutions; past that the wait costs more than the extra notes are worth — annotate the lines that carry the idea and skip the rest), "code" being that line's text VERBATIM (it is what the entry is matched on) and "explanation" being PLAIN TEXT, at most 12 words, no backticks, no markdown, no brackets or quote characters. Skip blank lines, closing brackets, and lines whose comment could only restate the syntax. Write what you would actually leave on that line — "evict hits older than the window", not "this is a while loop".
${starterCode
  ? `- Preserve the template's own comments verbatim; add NO new comments of your own — a line that already has one is left alone, so put your note in "explanations" instead
- KEEP the template's driver/main block EXACTLY — the \`if __name__ == '__main__':\` block, the stdin reads, the wrapper call, and the print/fptr output are part of the LOCKED template and MUST appear in your "code" unchanged. Do NOT strip them. (This overrides the generic "no main blocks" rule — that rule is ONLY for from-scratch problems with no starter code.)`
  : `- Do NOT write comments into "code" yourself — the client renders "explanations" as the inline comments, so your own would be a second set on the same lines
- Do NOT add main blocks or hard-coded test calls`}
- ${singleSolution ? 'The pitch should explain the chosen approach and complexity' : 'The pitch should compare the 3 approaches conversationally'}
- Generate COMPLETE, RUNNABLE code that includes all necessary imports for each solution
- Examples must have exact input/output pairs
- ${singleSolution ? 'The 1 solution must produce correct output for the given examples' : 'ALL 3 solutions must produce correct output for the given examples'}
- STYLE SELF-CHECK (silent, last thing before you emit): re-read every sentence you wrote in narration, approach, explanations, keyPoints, tradeoffs, edgeCases, pitfalls, probes and the complexity reasons. Fix these four, then emit: (1) any sentence over ~20 words gets split; (2) any word on the NEVER WRITE list gets swapped; (3) any sentence that only restates the code gets replaced with the reason the line is there; (3b) every solution has a non-empty trace of its OWN algorithm, and every solution has a requirementCheck; (4) every approach has at least one "Why? Because ..." and, unless it is the last one, ends by naming its cost and asking the question the next approach answers. Emit no reasoning about this check.
- Use the LATEST modern patterns and APIs for ${language}
- ${singleSolution ? '' : 'Order solutions from simplest (brute force) to most optimal'}${ioUnknown ? `\n- The I/O contract is UNKNOWN. Return a pure function with no driver, no print, no invented labels, and populate "assumptions".` : ''}`;
}

/**
 * Is this /solve payload actually CODE TO REVIEW rather than a problem to solve?
 *
 * A code-only screenshot ("what's wrong with this?") has no left-hand problem
 * panel, so the vision extractor puts the code in `problem` and leaves
 * `starter_code` null. Everything downstream then treats it as a statement and
 * /solve writes a brand-new program — wrapping loose statements in a function,
 * turning print() into a return — which is the one thing a review must never do.
 *
 * The client sends its classifier's verdict, but a client-side diversion can be
 * skipped by any path that forgets to thread it. This is the server's own check
 * so the rewrite cannot happen regardless of how the request arrived.
 */
function looksLikeCodeToReview(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 12 || t.length > 8000) return false;

  // A real problem statement announces itself. Any of these and it is prose.
  if (/\b(input format|output format|sample input|sample output|constraints?:|explanation:)\b/i.test(t)) return false;
  if (/^\s*(given|write a|implement|design|you are given|return the|find the)\b/im.test(t)) return false;

  const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return false;

  // Lines that can only be code.
  const codeLine = /^(def |class |import |from \w+ import|for |while |if |elif |else\b|return\b|print\(|function |const |let |var |public |private |#include|\w+\s*=\s*|\w+\.\w+\(|\}|\{|\w+\(.*\)\s*[:;{]?$)/;
  const codeish = lines.filter(l => codeLine.test(l)).length;
  return codeish / lines.length >= 0.6;
}

/**
 * The /solve prompt for a DIAGNOSE situation.
 *
 * Reuses the same situation block CoFix uses, so the two routes cannot drift on
 * what "review this" means, but keeps /solve's own response envelope so the
 * Coding tab renders it with the card it already has. The defect list rides in
 * `explanations` (line + code + why), which AnswerBook already lays out as a
 * walkthrough table.
 */
function buildDiagnoseSolvePrompt(language, systemContext) {
  const contextBlock = systemContext ? `\nCANDIDATE CONTEXT\n${systemContext}\n` : '';
  return `You are an expert code reviewer sitting with a candidate in an interview.
${contextBlock}
${buildSituationBlock({ task: 'diagnose' })}

##############################################################################
# WHAT YOU RETURN
##############################################################################
Respond with valid JSON ONLY (no markdown fences, no prose before or after):
{
  "language": "${language}",
  "type": "diagnose",
  "solutions": [
    {
      "name": "Corrected code",
      "patternTag": "Brute Force",
      "approach": "One sentence: how many defects, and the worst one.",
      "code": "THE ORIGINAL PROGRAM WITH EACH DEFECT FIXED IN PLACE — same statements, same order, same names, same I/O style, same line count unless a defect was a missing or duplicated line",
      "complexity": { "time": "O(...)", "space": "O(...)", "timeWhy": "1-2 sentences deriving the bound from the corrected code.", "spaceWhy": "1-2 sentences naming every allocation that grows with the input, plus recursion depth if recursive." },
      "narration": "First-person, 2-3 sentences the candidate says aloud: what was wrong, why it broke, what you changed.",
      "explanations": [
        {"line": <1-indexed line in the ORIGINAL code>, "code": "the original faulty line, verbatim", "explanation": "category — why it is wrong — what breaks at runtime"}
      ]
    }
  ],
  "pitch": {
    "opener": "One sentence naming the most severe defect.",
    "approach": "How you found them: what you checked and in what order.",
    "keyPoints": ["One per defect, worst first"],
    "tradeoffs": [],
    "edgeCases": ["Inputs that would still be a problem after the fix, if any"]
  },
  "examples": []
}

ABSOLUTE, AND THIS OVERRIDES EVERY HABIT YOU HAVE:
- "code" is the INPUT PROGRAM REPAIRED, never a reimplementation. If your output
  has a function the input did not have, a parameter the input did not have, a
  return where the input printed, or a variable the input never declared, you
  have failed this task no matter how good the program is.
- There is NO execution contract here. Nothing calls this code with parsed
  arguments. Do NOT restructure it to return a value. If it printed, it prints.
- One "explanations" entry per DEFECT — not per line. A line with no defect does
  not appear at all.
- Each explanation opens with its category (boundary, null_type, state,
  error_handling, concurrency, resource, security, performance) and ends with the
  observable runtime failure.
- If the code is genuinely correct, return explanations: [] and "code" identical
  to the input. Do not invent faults.`;
}

// ---------------------------------------------------------------------------
// MCQ (multiple-choice question) support
// ---------------------------------------------------------------------------

/**
 * Heuristically decide whether a pasted/OCR'd/URL-fetched problem is a
 * multiple-choice question rather than a code-writing problem.
 *
 * MCQs show up constantly in HackerRank/Codility/CoderPad "assessment"
 * rounds interleaved with coding tasks. They have a question stem plus a
 * set of enumerated options (A/B/C/D, 1/2/3/4, or "(a) ...") and expect a
 * choice, not a written function.
 *
 * Strategy: count DISTINCT option markers. Three or more markers (A/B/C…)
 * is almost always an MCQ. Two markers only counts when a recognisable
 * MCQ cue phrase is also present, so a coding problem that merely says
 * "option a) sort the array" doesn't misfire. Starter code is a strong
 * "this is a code problem" signal, so we never treat it as MCQ.
 */
function detectMcq(problem, { hasStarterCode = false } = {}) {
  if (!problem || typeof problem !== 'string' || hasStarterCode) return false;

  // Line-anchored markers: "A) ", "A. ", "(A) ", "[A] ", "1) ", "a: ", "- A) "
  const optRe = /^\s*[-*]?\s*[([]?\s*([A-Ha-h1-9])\s*[).\].:\-]\s+\S/;
  const seen = new Set();
  for (const ln of problem.split(/\r?\n/)) {
    const m = ln.match(optRe);
    if (m) seen.add(m[1].toUpperCase());
  }
  // Inline markers on one line: "... (A) foo (B) bar (C) baz"
  const inline = new Set(
    (problem.match(/\(([A-Ha-h])\)/g) || []).map((s) => s.slice(1, 2).toUpperCase()),
  );
  const distinct = Math.max(seen.size, inline.size);

  const cue = /\b(which of the following|select all that apply|choose (the|all|one)|the correct answer|mark for review|multiple[ -]?choice|single[ -]?choice|true or false|pick the|what (is|will|does) the (output|result|value))\b/i.test(problem);

  if (distinct >= 3) return true;          // A/B/C present → almost certainly MCQ
  if (distinct >= 2 && cue) return true;   // 2 options + an explicit cue phrase
  return false;
}

// ---------------------------------------------------------------------------
// I/O contract inference
// ---------------------------------------------------------------------------

/**
 * Positive evidence that the problem describes a stdin → stdout contract.
 * HackerRank / CoderPad phrasing. Checked BEFORE hasExampleEvidence, because
 * HackerRank problems routinely contain both "Sample Input" and a bare
 * "Input:" line, and only the former tells us how the program is invoked.
 */
function hasStdinEvidence(problem) {
  const t = typeof problem === 'string' ? problem : '';
  return /(^|\n)\s*(input|output)\s+format\b/i.test(t)
    || /(^|\n)\s*sample\s+(input|output)\b/i.test(t)
    || /\bstdin\b|\bstandard input\b/i.test(t)
    || /\bthe first line contains\b/i.test(t)
    || /\bprints?\b[^.\n]{0,40}\bto\s+(stdout|standard\s+output)\b/i.test(t)
    || /\b(your|the)\s+(program|solution|script|function)\b[^.\n]{0,60}\bprints?\b/i.test(t);
}

/** LeetCode-style worked example: an "Example N:" header, or Input: + Output:. */
function hasExampleEvidence(problem) {
  const t = typeof problem === 'string' ? problem : '';
  if (/(^|\n)\s*example\s*\d*\s*:/i.test(t)) return true;
  return /(^|\n)\s*input\s*:/i.test(t) && /(^|\n)\s*output\s*:/i.test(t);
}

/**
 * Classify how the generated program will be invoked and graded.
 *
 * 'unknown' is the important one. It means we have NO evidence of an I/O
 * format — no starter code, no stdin phrasing, no worked example. The prompt
 * must then emit a pure function rather than inventing a print contract,
 * because a pure function wraps into any driver while an invented print
 * contract is a Wrong Answer the candidate cannot see.
 */
function inferIoContract(problem, starterCode) {
  if (typeof starterCode === 'string' && starterCode.trim()) return 'template';
  const t = typeof problem === 'string' ? problem : '';
  if (/\bclass\s+Solution\b/.test(t)) return 'pure-function';
  if (hasStdinEvidence(t)) return 'stdin-print';
  if (hasExampleEvidence(t)) return 'pure-function';
  return 'unknown';
}

/**
 * Does the grader feed well-formed input (LeetCode-style: constraints guarantee
 * shape) or adversarial/malformed input (HackerRank hidden/destructive suites)?
 * Decides whether guard clauses are resilience (adversarial) or dead code (guaranteed).
 *   'guaranteed'  → class Solution / an explicit Constraints block
 *   'adversarial' → everything else, including unknown (a spurious guard costs a
 *                   debt point; a missing guard crashes — so default to adversarial)
 */
function inferInputTrust(problem, starterCode) {
  const t = typeof problem === 'string' ? problem : '';
  if (/\bclass\s+Solution\b/.test(t)) return 'guaranteed';
  if (/(^|\n)\s*constraints\s*:?\s*(\n|$)/i.test(t) && /\d+\s*<=?\s*\w/.test(t)) return 'guaranteed';
  return 'adversarial';
}

/**
 * System prompt for answering a multiple-choice question. Returns a
 * distinct JSON schema ({ type:'mcq', mcq:{...} }) so the frontend can
 * render an answer card instead of code cards. Supports both
 * single-answer and "select all that apply" multi-answer questions.
 */
function buildMcqSystemPrompt(systemContext) {
  const contextBlock = systemContext
    ? `\n# CANDIDATE CONTEXT\n${systemContext}\nUse this only to phrase the spoken narration naturally; it never changes which option is correct.\n\n`
    : '';
  return `You are an expert technical interview assistant answering a MULTIPLE-CHOICE QUESTION (MCQ) from a coding assessment (HackerRank / Codility / CoderPad style). These cover CS fundamentals, language semantics, complexity, output-prediction, SQL, systems, etc.
${contextBlock}
##############################################################################
# YOUR JOB
##############################################################################
1. Read the question stem and EVERY option EXACTLY as written. Do not invent, drop, reorder, or reword options.
2. Reason carefully to the correct answer. For "what is the output/value" questions, mentally execute the code step by step before choosing.
3. Decide if it is SINGLE-answer or MULTIPLE-answer ("select all that apply", "choose all", checkboxes). Set "multiSelect" accordingly and put ALL correct keys in "answer".
4. Give a short, correct justification and mark each option correct:true/false with a one-line reason.

##############################################################################
# ABSOLUTE RULES
##############################################################################
- Preserve each option's original letter/number key (A, B, C… or 1, 2, 3…) exactly as shown in the question. If the question uses no visible keys, assign A, B, C… top to bottom.
- "answer" MUST be an array of the correct option keys (one element for single-answer, several for multi-answer).
- Base the answer on real correctness, NOT on position or phrasing. If genuinely ambiguous, pick the single best answer and set confidence "medium" or "low".
- All explanation/reason/narration fields are PLAIN TEXT — no markdown, no code fences.

Respond with ONLY valid JSON in EXACTLY this shape (no text before/after):
{
  "type": "mcq",
  "mcq": {
    "question": "The question stem in plain text (omit the option list).",
    "multiSelect": false,
    "options": [
      { "key": "A", "text": "verbatim option text", "correct": true, "reason": "one-line why this is right/wrong" }
    ],
    "answer": ["A"],
    "answerText": "A) verbatim text of the correct option (join with ' , ' if multiple)",
    "explanation": "2-4 sentence plain-text explanation of the correct reasoning, including why the tempting distractors are wrong.",
    "narration": "First-person script the candidate can say ALOUD, 3-5 sentences, natural spoken tone, no markdown. State the answer, the core reason, and one distractor to avoid.",
    "confidence": "high"
  }
}

Rules:
- "options" MUST list every option from the question, in order, each with correct:true/false.
- Exactly the keys in "answer" may have correct:true; all others correct:false.
- confidence is one of: "high", "medium", "low".`;
}

/**
 * Answer-validity gate shared by all reliability passes. Code problems need
 * code/solutions; MCQs need a well-formed mcq block with options.
 */
function isValidAnswer(parsed, isMcq) {
  if (!parsed) return false;
  if (isMcq) {
    return parsed.type === 'mcq'
      && parsed.mcq
      && Array.isArray(parsed.mcq.options)
      && parsed.mcq.options.length >= 2
      && Array.isArray(parsed.mcq.answer)
      && parsed.mcq.answer.length >= 1;
  }
  // Require ACTUAL code. A valid-SHAPED envelope with empty/missing code
  // (solutions: [] or solutions: [{ code: "" }]) must NOT pass — otherwise a
  // blank solution gets served with no retry. Rejecting it lets /solve fall
  // through to the next pass/provider (and ultimately a clear error rather than
  // an empty answer). This is the fix for "solution block is empty/unrelated".
  return getCodeFromParsed(parsed).trim().length > 0;
}

/**
 * Strip a solution down to its algorithmic skeleton so two spellings of the same
 * idea collide. Identifier names, string/number literals, comments, and all
 * whitespace go — what survives is the sequence of keywords and operators, which
 * is what actually differs between a hash-map pass and a nested scan.
 */
function solutionSkeleton(code) {
  return String(code || '')
    .replace(/(['"`]).*?\1/gs, 'S')          // literals: only their presence matters
    .replace(/#.*$|\/\/.*$/gm, '')           // line comments
    .replace(/\/\*.*?\*\//gs, '')            // block comments
    .replace(/\b\d+(\.\d+)?\b/g, 'N')
    .replace(/(\.?)\b([A-Za-z_]\w*)\b(\s*\()?/g, (_m, dot, word, call) => {
      const w = word.toLowerCase();
      if (KEYWORDS.has(w)) return `${dot}${word}${call || ''}`;
      // A builtin only counts as a strategy signal in CALL or ATTRIBUTE
      // position. Bare `items` is somebody's variable; `.items()` is a dict
      // traversal. Treating the two alike is how a renamed loop escaped the
      // duplicate check.
      if ((call || dot) && SIGNALS.has(w)) return `${dot}${word}${call || ''}`;
      return `${dot}v${call || ''}`;
    })
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** Control flow — always structural, never a variable name. */
const KEYWORDS = new Set([
  'for', 'while', 'if', 'elif', 'else', 'return', 'def', 'class', 'lambda', 'yield',
  'in', 'not', 'and', 'or', 'is', 'break', 'continue', 'try', 'except', 'with',
  'function', 'const', 'let', 'var', 'of', 'new', 'typeof', 'switch', 'case', 'do',
]);

/**
 * Builtins whose presence marks a different strategy — a sort, a hash lookup, a
 * heap. Preserved only in call/attribute position, because every one of these is
 * also a name somebody has given a local variable.
 */
const SIGNALS = new Set([
  'sort', 'sorted', 'set', 'dict', 'map', 'len', 'range', 'enumerate', 'zip',
  'append', 'push', 'pop', 'add', 'get', 'keys', 'values', 'items', 'reverse',
  'min', 'max', 'sum', 'abs', 'int', 'str', 'list', 'tuple', 'bisect', 'heapq',
  'heappush', 'heappop', 'counter', 'defaultdict', 'deque', 'filter', 'reduce',
]);

/**
 * Drop near-duplicate approaches before they reach the candidate.
 *
 * Three tabs labelled "Brute Force / Hash Map / Optimal" that all hold the same
 * algorithm is worse than one honest tab: the candidate walks into the
 * brute-force question with nothing real to say, having been told they had a
 * baseline. Two solutions are duplicates when they share a patternTag (the tag
 * vocabulary is a closed enum, so this is a decidable test, not a judgement) or
 * when their skeletons match.
 *
 * Always keeps the first occurrence — the array is ordered naive→optimal, so the
 * baseline survives and the redundant "optimisation" is what gets dropped.
 */
function dedupeSolutions(solutions) {
  if (!Array.isArray(solutions) || solutions.length < 2) return solutions;
  const seenTags = new Set();
  const seenSkeletons = new Set();
  const kept = [];
  for (const sol of solutions) {
    if (!sol || typeof sol !== 'object') continue;
    const tag = typeof sol.patternTag === 'string' ? sol.patternTag.trim().toLowerCase() : '';
    const skeleton = solutionSkeleton(sol.code);
    if (tag && seenTags.has(tag)) continue;
    if (skeleton && seenSkeletons.has(skeleton)) continue;
    if (tag) seenTags.add(tag);
    if (skeleton) seenSkeletons.add(skeleton);
    kept.push(sol);
  }
  // Never return nothing: if every entry collided we still owe the caller one.
  return kept.length ? kept : solutions.slice(0, 1);
}

// ---------------------------------------------------------------------------
// JSON extraction helpers
// ---------------------------------------------------------------------------

/**
 * Try to extract a JSON object from Claude's response text.
 * Runs multiple tolerant strategies so preambles, code fences, trailing prose, and
 * truncation don't silently produce a blank solution card on the frontend.
 */
function extractJsonFromText(text) {
  if (!text || !text.trim()) return null;

  // Strategy 1: strip markdown code fences and parse. Try a ```json fence FIRST,
  // then EVERY other fence — a model that leaks reasoning often emits a ```python
  // block (the code) before the ```json block, so matching only the first fence
  // grabbed Python and failed. Prefer whichever fence body parses as JSON.
  const jsonFence = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonFence) {
    try { return JSON.parse(jsonFence[1].trim()); } catch { /* continue */ }
  }
  for (const m of text.matchAll(/```(?:\w+)?\s*([\s\S]*?)\s*```/g)) {
    const body = m[1].trim();
    if (body.startsWith('{')) {
      try { return JSON.parse(body); } catch { /* continue */ }
    }
  }

  // Strategy 2: find first { and try to parse from there
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    const candidate = text.slice(firstBrace);
    try { return JSON.parse(candidate); } catch { /* continue */ }

    // Try balanced-brace extraction — find matching top-level close brace
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\') { escapeNext = true; continue; }
      if (ch === '"' && !escapeNext) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(candidate.slice(0, i + 1)); } catch { break; }
        }
      }
    }

    // Strategy 2b: truncated mid-JSON — repair by closing open braces/brackets.
    // Prior commits (see 8beab95) showed truncated JSON being a frequent failure
    // mode; rather than giving up we stitch the tail closed and try again.
    try {
      let repaired = candidate;
      // Strip trailing comma before adding close chars
      repaired = repaired.replace(/[,\s]+$/, '');
      // Close any open string
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) repaired += '"';
      const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      if (openBrackets > 0) repaired += ']'.repeat(openBrackets);
      if (openBraces > 0) repaired += '}'.repeat(openBraces);
      return JSON.parse(repaired);
    } catch { /* continue */ }
  }

  // Strategy 3: try full text as-is
  try { return JSON.parse(text.trim()); } catch { /* continue */ }

  return null;
}

// ---------------------------------------------------------------------------
// Hardcoding detector
// ---------------------------------------------------------------------------

/**
 * Returns true if the generated code contains hardcoded example data instead
 * of making real API/IO calls. Catches two common cheating patterns:
 *   1. _MOCK_ / MOCK_ / FAKE_ module-level variables
 *   2. fetch_X / get_X / load_X functions that return a static list without IO
 */
function detectsHardcoding(code) {
  if (!code || typeof code !== 'string') return false;
  if (/\b(_?MOCK_|_?FAKE_|HARDCODED_)/i.test(code)) return true;
  // A "canned collection" return: a list/tuple of at least TWO CONSTRUCTED
  // records (Name(...) or {...}), NOT a comprehension (no `for`). Two-record
  // minimum + no-comprehension keeps false positives near zero — a real
  // `return [PR(p) for p in data]` or a single `return [Node(x)]` is NOT
  // flagged — so the anti-cheat retry only fires on genuine pasted example
  // data (which always has multiple rows) and never inflates /solve latency
  // on a correct answer.
  const CANNED = String.raw`return\s*[\[\(]\s*(?:[A-Za-z_]\w*\s*\(|\{)(?:(?!\bfor\b)[\s\S]){0,300}?[)\}]\s*,\s*(?:[A-Za-z_]\w*\s*\(|\{)`;
  // (1) Input-specific special-case branch — special-cases a known literal
  //     input and returns canned records. Fires EVEN WHEN the surrounding
  //     function ALSO makes a real I/O call elsewhere (that whole-function IO
  //     check below would otherwise miss it — exactly how the cheat slips by).
  //       if owner == "venmo" and repo == "foundations-interview":
  //           return [PR(1, "Fix issue", ...), PR(2, ...)]
  if (new RegExp(String.raw`==\s*['"][^'"\n]+['"][\s\S]{0,160}?${CANNED}`).test(code)) return true;
  // (2) fetch_/get_/load_/retrieve_ function that returns a canned collection
  //     without any real I/O — directly OR delegated to a helper (_get/_fetch/
  //     _request) so a legitimately delegated fetch is NOT flagged.
  const cannedRe = new RegExp(CANNED);
  const fnRe = /def\s+(fetch|get|load|retrieve)\w*\s*\([^)]*\)\s*(?:->[^:]+)?:([\s\S]*?)(?=\ndef\s|\nclass\s|$)/gi;
  let m;
  while ((m = fnRe.exec(code)) !== null) {
    const body = m[2];
    const hasIO = /urllib|http\.client|urlopen|socket\.|requests\.|httpx\.|aiohttp\.|subprocess|_get\s*\(|_fetch\s*\(|_request\s*\(|\bopen\s*\(/.test(body);
    if (cannedRe.test(body) && !hasIO) return true;
  }
  return false;
}

function getCodeFromParsed(parsed) {
  if (!parsed) return '';
  if (parsed.code) return parsed.code;
  if (Array.isArray(parsed.solutions) && parsed.solutions.length > 0) return parsed.solutions[0].code || '';
  return '';
}

// ---------------------------------------------------------------------------
// Free-tier daily limit check
// ---------------------------------------------------------------------------

/**
 * Atomically check the free-tier daily limit AND insert a usage row if
 * allowed — eliminates the TOCTOU window between check and record.
 * Returns { allowed, remaining, reservationId? }.
 */
async function checkAndReserveFreeTierSlot(userId, language = 'pending') {
  const result = await query(
    `WITH daily AS (
       SELECT COUNT(*) AS cnt
       FROM coding_usage
       WHERE user_id = $1 AND created_at >= CURRENT_DATE
     ),
     ins AS (
       INSERT INTO coding_usage (user_id, language, input_tokens, output_tokens, latency_ms)
       SELECT $1, $3, 0, 0, 0
       FROM daily WHERE cnt < $2
       RETURNING id
     )
     SELECT daily.cnt, (SELECT id FROM ins) AS reservation_id FROM daily`,
    [userId, FREE_TIER_DAILY_LIMIT, language],
  );
  const { cnt, reservation_id } = result.rows[0];
  const used = parseInt(cnt, 10);
  if (!reservation_id) {
    return {
      allowed: false,
      remaining: 0,
      message: `Daily free-tier limit reached (${FREE_TIER_DAILY_LIMIT}/day). Upgrade for unlimited access.`,
    };
  }
  return { allowed: true, remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - used - 1), reservationId: reservation_id };
}

/**
 * Record a coding usage event (for free-tier tracking).
 */
async function recordCodingUsage(userId, language, inputTokens, outputTokens, latencyMs) {
  await query(
    `INSERT INTO coding_usage (user_id, language, input_tokens, output_tokens, latency_ms)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, language, inputTokens, outputTokens, latencyMs],
  );
}

// ---------------------------------------------------------------------------
// POST /solve — SSE streaming endpoint
// ---------------------------------------------------------------------------

router.post(['/solve', '/stream'], authenticate, checkUsage('questions'), async (req, res) => {
  const { problem, language, conversationHistory, system_context: systemContext, bypass_cache: bypassCache, starter_code: rawStarterCode, question_type: questionType } = req.body;

  // ── Validate ────────────────────────────────────────────────────────────
  if (!problem || typeof problem !== 'string') {
    return res.status(400).json({ error: 'Missing required field: problem' });
  }

  // Safety net: if the client didn't send starter_code but the problem text
  // itself IS a locked platform template (pasted editor content — HackerRank
  // stub + __main__ harness, minimal inline skeleton, etc.), treat it as the
  // starter so we FILL it instead of writing a from-scratch script. Backstops
  // any capture path that fails to thread starter_code separately.
  const starterCode = (typeof rawStarterCode === 'string' && rawStarterCode.trim())
    ? rawStarterCode
    : (detectPlatformTemplate(problem) ? problem : undefined);
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Missing required field: language' });
  }

  const lang = language.toLowerCase();
  // MCQ auto-detection. An explicit question_type from the client wins;
  // otherwise we sniff the problem text for enumerated options. Starter
  // code always means "write code", never MCQ.
  const isMcq = questionType === 'mcq'
    || (questionType !== 'code' && detectMcq(problem, { hasStarterCode: !!starterCode }));
  const ioContract = isMcq ? null : inferIoContract(problem, starterCode);
  const inputTrust = isMcq ? null : inferInputTrust(problem, starterCode);
  // How many approaches to return.
  //
  // This used to be hardcoded `true`, which made the three-solution branch of
  // buildCodingSystemPrompt dead code and the solution tabs in CodingLayout
  // permanently empty. Interviewers score the brute-force baseline explicitly —
  // "jumping to optimal code without explaining foundational thinking" is a
  // documented no-hire signal — so the candidate needs the naive approach
  // available to talk through even when they submit the optimal one.
  //
  // Still single when the platform hands us a locked template (there is exactly
  // one shape to fill) or for bash (multiple "approaches" to a shell one-liner
  // is noise) — both of which buildCodingSystemPrompt enforces on its own. This
  // flag is only the client's explicit opt-out, for a candidate who wants the
  // one answer and nothing else.
  // Is this a REVIEW rather than a solve? The client's classifier verdict wins
  // when it sent one; otherwise the server decides for itself from the shape of
  // the payload, so a path that forgets to thread `task` still cannot trigger a
  // rewrite. Never for MCQs, and never when a real starter template is present
  // (that is a fill, and the template's own rules apply).
  const requestedTask = normalizeTask(req.body?.task);
  const isDiagnose = !isMcq && !starterCode && (
    requestedTask === 'diagnose' || (!requestedTask && looksLikeCodeToReview(problem))
  );
  const forceSingle = req.body?.single_solution === true;
  // Mirrors buildCodingSystemPrompt's own `singleSolution` derivation so the
  // retry reminder and the cache key can't drift from what the prompt asked for.
  // Mirrors buildCodingSystemPrompt's own derivation. Starter code is NOT a
  // reason to collapse to one — see the note there.
  const solutionCount = (forceSingle || isDiagnose || lang === 'bash') ? 1 : 3;
  console.log(`[solve] lang=${lang} mcq=${isMcq} diagnose=${isDiagnose} io=${ioContract} trust=${inputTrust} bypass=${!!bypassCache} starter=${starterCode ? starterCode.slice(0, 60).replace(/\n/g, '↵') : 'null'}`);
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    });
  }

  // ── Free-tier check (atomic: check + insert in one CTE). Admins bypass. ─
  const planType = req.user.plan_type || 'free';
  let freeTierReservationId = null;
  if (planType === 'free' && !req.user.is_admin) {
    const quota = await checkAndReserveFreeTierSlot(req.user.id, lang);
    if (!quota.allowed) {
      return res.status(429).json({ error: quota.message });
    }
    freeTierReservationId = quota.reservationId;
  }

  // ── Paid users: soft daily cap to prevent abuse. Owners/admins bypass. ──
  if (planType !== 'free' && planType && !req.user.is_admin) {
    const today = new Date().toISOString().slice(0, 10);
    const PAID_DAILY_LIMIT = 20;
    try {
      const usageResult = await query(
        `SELECT COUNT(*) as cnt FROM coding_usage
         WHERE user_id = $1 AND DATE(created_at) = $2`,
        [req.user.id, today],
      );
      const used = parseInt(usageResult.rows[0]?.cnt || '0', 10);
      if (used >= PAID_DAILY_LIMIT) {
        return res.status(429).json({
          error: `Daily coding limit reached (${PAID_DAILY_LIMIT}/day). Resets at midnight UTC.`,
          daily_limit: PAID_DAILY_LIMIT,
          used,
        });
      }
    } catch { /* coding_usage table may not exist yet */ }
  }

  // ── SSE headers ─────────────────────────────────────────────────────────
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  /** Helper: write an SSE event frame */
  function sendEvent(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // Keepalive heartbeat. The /solve prompt makes the model reason SILENTLY
  // before it emits the first JSON token, so on a hard problem the stream can
  // stay quiet for tens of seconds. The client aborts after 30s of silence
  // ("Sona took too long to respond"), so we send a ':' comment every 20s to
  // reset that timer — the SSE parser ignores comment lines. Cleared on both
  // 'finish' (normal res.end) and 'close' (client disconnect), which covers
  // every one of this handler's return paths without touching each one.
  const solveKeepalive = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 20_000);
  res.on('finish', () => clearInterval(solveKeepalive));
  res.on('close', () => clearInterval(solveKeepalive));

  // ── Create conversation record ──────────────────────────────────────────
  let conversationId = null;
  try {
    const convResult = await query(
      `INSERT INTO lumora_conversations (user_id, title)
       VALUES ($1, $2) RETURNING id`,
      [req.user.id, `[${lang.toUpperCase()}] ${problem.slice(0, 80)}...`],
    );
    conversationId = convResult.rows[0]?.id;
  } catch (err) {
    // Non-fatal — stream the solution even if DB insert fails
    console.error('Failed to create conversation:', err.message);
  }

  // ── Stream start event ──────────────────────────────────────────────────
  sendEvent('stream_start', {
    question: problem.slice(0, 100),
    is_coding: true,
    language: lang,
    conversation_id: conversationId,
  });

  // ── Answer-cache lookup ───────────────────────────────────────────────
  // Repeated coding problems (Two Sum, Tiny URL, etc.) used to fire
  // the model every time. Skip the LLM entirely on a hit — replay the
  // structured answer we cached on the first solve.
  // systemContext (resume + JD) intentionally excluded: the algorithm for
  // "Two Sum" or "Design Tiny URL" is the same for every user. Including
  // it made every user's key unique → zero cross-user hits. The prompt
  // still receives systemContext for personalization; only the lookup key
  // is question-scoped so the first solver primes the cache for everyone.
  const cacheKey = buildAnswerCacheKey({
    question: problem,
    plan: planType,
    route: isMcq ? 'solve_mcq' : (isDiagnose ? 'solve_diagnose' : 'solve'),
    language: lang,
    model: getModelForUser(req),
    starterCode: starterCode || null,
    // Part of the key: every answer cached before the ladder was unblocked holds
    // exactly one solution, and replaying one of those for a three-approach
    // request would silently serve the old behaviour forever.
    solutionCount,
  });
  // bypass_cache=true skips the lookup but the fresh answer still gets
  // written, so the next vanilla /solve hits. Used by the frontend
  // "Regenerate" button when the user wants a fresh take on the same
  // problem (e.g. different approach, or the cached answer was wrong).
  if (bypassCache) {
    logCacheEvent('BYPASS', cacheKey, { route: 'solve', plan: planType, lang });
  } else {
    const cachedAnswer = await cacheGet(cacheKey);
    if (cachedAnswer) {
      logCacheEvent('HIT', cacheKey, { route: 'solve', plan: planType, lang });
      sendEvent('answer', { ...cachedAnswer, fromCache: true });
      sendEvent('done', { ok: true, fromCache: true });

      // Free-tier: slot already atomically reserved by checkAndReserveFreeTierSlot.
      // Paid-tier: still need to record so the paid soft-cap counter is accurate.
      if (planType !== 'free') {
        try {
          await recordCodingUsage(req.user.id, lang, 0, 0, 0);
        } catch (mErr) {
          console.warn('[coding/solve] cached-answer metering failed:', mErr.message);
        }
      }

      return res.end();
    }
    logCacheEvent('MISS', cacheKey, { route: 'solve', plan: planType, lang });
  }

  sendEvent('status', { state: 'write', msg: isMcq ? 'Answering multiple-choice question…' : `Generating ${lang} solution...` });

  // ── Build messages array (with optional conversation history) ───────────
  const messages = [];

  if (Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // RAG: retrieve the closest solved-pattern exemplars and inject them into the
  // per-request user message (NOT the cached system prompt) so the model infers
  // the pattern and copies a verified, return-based structure instead of
  // re-deriving it. Best-effort — retrieval never blocks solving.
  let exemplarBlock = '';
  if (!isMcq) {
    // Code-pattern exemplars only help code generation; they are noise for MCQs.
    try {
      exemplarBlock = formatExemplars(await retrieveExemplars(problem, { k: 2 }));
    } catch { /* retrieval is best-effort */ }
  }

  messages.push({
    role: 'user',
    content: isMcq
      ? `Answer this multiple-choice question. Return ONLY the MCQ JSON object.\n\n${problem}`
      : isDiagnose
        ? `Review this ${lang} code. Find every defect and return the SAME program with each one corrected in place.\n\n\`\`\`${lang}\n${problem}\n\`\`\``
        : `Solve this coding problem in ${lang}:\n\n${problem}${exemplarBlock}`,
  });

  // ── Call Claude with layered reliability ────────────────────────────────
  //
  // Flow:
  //   Pass 1: streaming, primary model, normal prompt.
  //     - Transport errors (529/503/network): retry in-place with 500 ms
  //       then 1500 ms back-off (2 retries). User never sees a 529.
  //     - JSON parse fails or empty: fall through to Pass 2.
  //   Pass 2: non-streaming, primary model, strict JSON reminder.
  //     - Covers "model returned prose before/after JSON" and "model
  //       truncated mid-field" cases. Single attempt.
  //   Pass 3: non-streaming, *fallback* model, strict JSON reminder.
  //     - Last-resort. Paid Sonnet users drop to Haiku, free Haiku
  //       users jump to Sonnet. Still better than a dead-state error.
  //
  // Telemetry: every failure mode is logged server-side with model,
  // duration, raw-head/tail (truncated to ~2 KB), user-agent, and
  // parse error so we can diagnose recurring failure patterns.
  const startTime = performance.now();
  const userAgent = req.get?.('user-agent') || req.headers?.['user-agent'] || 'unknown';
  const primaryModel = getModelForUser(req);

  // Wire client disconnect to an AbortController so the Anthropic stream tears
  // down immediately instead of burning through 15s+ of tokens the browser will
  // never see. Checked at stream-loop boundaries below.
  const abortController = new AbortController();
  let clientDisconnected = false;
  req.on('close', () => {
    clientDisconnected = true;
    try { abortController.abort(); } catch {}
  });

  let rawAnswer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let modelUsed = primaryModel;
  let terminalFailure = null; // { msg, category } when all passes give up
  let passTag = 'primary_stream';

  const systemPrompt = isMcq
    ? buildMcqSystemPrompt(typeof systemContext === 'string' ? systemContext : undefined)
    : isDiagnose
      ? buildDiagnoseSolvePrompt(lang, typeof systemContext === 'string' ? systemContext : undefined)
      : buildCodingSystemPrompt(lang, typeof systemContext === 'string' ? systemContext : undefined, starterCode || undefined, forceSingle, ioContract, inputTrust);
  // Anthropic prompt cache — wraps the large coding system prompt as a
  // single ephemeral cache block. Subsequent /solve calls within the
  // 5-min TTL skip ~3-4k input tokens of re-tokenization, cutting
  // time-to-first-token by 200–500 ms in the steady state. Identical
  // pattern to services/claude.js:457. Per-request blocks are unchanged.
  const STRICT_JSON_REMINDER = isMcq
    ? 'IMPORTANT: Your previous response could not be parsed. Return ONLY a single valid JSON object matching the MCQ schema above. No preamble, no markdown fences, no prose. Start with { and end with }. It MUST have "type":"mcq", an "mcq.options" array covering every option, and an "mcq.answer" array of the correct option keys.'
    // The count MUST track the prompt's own demand. When this said "exactly 1"
    // against a 3-solution schema the retry pass contradicted the system prompt
    // it was meant to rescue, and the model split the difference.
    : `IMPORTANT: Your previous response could not be parsed. Return ONLY a single valid JSON object matching the schema above. No preamble, no markdown fences, no prose. Start with { and end with }. Every string must be properly closed. The "solutions" array must contain exactly ${solutionCount} complete solution object${solutionCount === 1 ? '' : 's'}.`;

  const ANTI_CHEAT_REJECTION =
    'REJECTED — your previous solution hardcoded example data instead of actually solving the problem.\n\n' +
    'Forbidden: a MOCK_/FAKE_ variable of canned objects; special-casing a specific input to return canned data ' +
    '(e.g. `if x == "<an example value>": return [...]`); or any function that returns a fixed literal collection ' +
    'instead of computing its result. The example names/numbers/IDs in the problem are ILLUSTRATIONS — your code ' +
    'runs against DIFFERENT inputs, so hardcoded data FAILS.\n\n' +
    'Rewrite the SAME solution to the SAME problem above so every function COMPUTES its result from its parameters ' +
    '(and performs any real I/O its name implies) for ANY input. Do NOT change the problem, invent a different task, ' +
    'or add unrelated logic. Return ONLY the JSON object — no preamble.';

  let hardcodingDetected = false;

  // ── Build provider list at call time — picks up admin-panel key changes
  //    immediately without a service restart. Order: Gemini → Anthropic → DeepSeek.
  const providerList = buildProviderList();

  // ── Pass 1: streaming — try each provider in order until one succeeds ───
  let parsedJson = null;
  {
    const passStart = performance.now();
    let streamOk = false;
    for (const provider of providerList) {
      if (clientDisconnected) break;
      // Time to FIRST token, separately from total duration. They diagnose
      // different faults: a long ttft is the model or the queue in front of it,
      // a long tail after a fast ttft is simply a big answer being written. A
      // report of "N minutes before anything appeared" cannot be told apart
      // from "N minutes to finish" without both numbers.
      let ttftMs = -1;
      const result = await streamWithProvider(
        provider, messages, systemPrompt,
        (token) => {
          if (ttftMs < 0) ttftMs = Math.round(performance.now() - passStart);
          sendEvent('token', { t: token });
        },
        () => clientDisconnected,
      );
      if (clientDisconnected) return;
      if (result.error && !result.raw) {
        const status = result._err?.status || result._err?.statusCode || 'unknown';
        console.error(
          `[coding/solve] pass=primary_stream provider=${provider} ok=false ` +
          `status=${status} msg=${JSON.stringify(result.error)} ua=${JSON.stringify(userAgent)}`,
        );
        terminalFailure = { msg: result.error, category: 'api_error' };
        continue;
      }
      rawAnswer = result.raw;
      modelUsed = result.model || provider;
      if (result.usage) { inputTokens = result.usage.input || 0; outputTokens = result.usage.output || 0; }
      console.log(
        `[coding/solve] pass=primary_stream provider=${provider} model=${result.model} ok=true ` +
        `rawLen=${rawAnswer.length} ttftMs=${ttftMs} durMs=${Math.round(performance.now() - passStart)} ` +
        `outTok=${outputTokens} ua=${JSON.stringify(userAgent)}`,
      );
      streamOk = true;
      break;
    }
    if (!streamOk && !clientDisconnected) {
      rawAnswer = '';
    }
  }

  // ── Parse Pass 1 output ─────────────────────────────────────────────────
  if (rawAnswer && rawAnswer.trim()) {
    parsedJson = extractJsonFromText(rawAnswer);
    if (!isValidAnswer(parsedJson, isMcq)) {
      console.error(
        `[coding/solve] parse_failed pass=primary_stream mcq=${isMcq} rawLen=${rawAnswer.length} ` +
        `head=${JSON.stringify(truncateForLog(rawAnswer.slice(0, 1024), 1024))} tail=${JSON.stringify(truncateForLog(rawAnswer.slice(-1024), 1024))} ua=${JSON.stringify(userAgent)}`,
      );
      parsedJson = null;
    } else if (!isMcq && detectsHardcoding(getCodeFromParsed(parsedJson))) {
      console.error(`[coding/solve] hardcoding_detected pass=primary_stream — rejecting and retrying`);
      hardcodingDetected = true;
      parsedJson = null;
    }
  }

  // ── Pass 2 + 3: non-streaming fix passes — rotate through all providers ─
  //    Pass 2 uses the same provider as Pass 1 with a strict JSON reminder.
  //    Pass 3+ tries each remaining provider until one parses cleanly.
  if (!parsedJson && !clientDisconnected) {
    const reminder = hardcodingDetected ? ANTI_CHEAT_REJECTION : STRICT_JSON_REMINDER;
    const fixMessages = hardcodingDetected
      ? [...messages, { role: 'user', content: reminder }]
      : [...messages, { role: 'assistant', content: rawAnswer || '(no output)' }, { role: 'user', content: reminder }];

    let passNum = 2;
    for (const provider of providerList) {
      if (clientDisconnected) break;
      if (passNum === 2) {
        passTag = 'primary_strict';
        sendEvent('status', { state: 'warn', msg: 'Polishing solution — one more moment…' });
      } else {
        passTag = `fallback_p${passNum}`;
        sendEvent('status', { state: 'warn', msg: `Switching to backup model (${provider})…` });
      }
      const passStart = performance.now();
      const result = await generateWithProvider(provider, fixMessages, systemPrompt);
      const fixRaw = result.raw || '';
      const fixParsed = extractJsonFromText(fixRaw);
      console.log(
        `[coding/solve] pass=${passTag} provider=${provider} model=${result.model} ` +
        `ok=${isValidAnswer(fixParsed, isMcq)} ` +
        `rawLen=${fixRaw.length} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
      if (isValidAnswer(fixParsed, isMcq)) {
        if (!isMcq && detectsHardcoding(getCodeFromParsed(fixParsed))) {
          console.error(`[coding/solve] hardcoding_detected pass=${passTag} provider=${provider}`);
          hardcodingDetected = true;
        } else {
          parsedJson = fixParsed;
          rawAnswer = fixRaw;
          modelUsed = result.model || provider;
          terminalFailure = null;
          break;
        }
      } else {
        if (result.error) {
          console.error(`[coding/solve] parse_failed pass=${passTag} provider=${provider} error=${JSON.stringify(result.error)}`);
          terminalFailure = { msg: result.error, category: 'api_error' };
        } else {
          console.error(
            `[coding/solve] parse_failed pass=${passTag} provider=${provider} rawLen=${fixRaw.length} ` +
            `head=${JSON.stringify(truncateForLog(fixRaw.slice(0, 1024), 1024))} tail=${JSON.stringify(truncateForLog(fixRaw.slice(-1024), 1024))} ua=${JSON.stringify(userAgent)}`,
          );
          terminalFailure = hardcodingDetected
            ? { msg: 'Generated solution contained hardcoded data on all attempts. Please tap Regenerate.', category: 'hardcoding' }
            : { msg: "Couldn't generate a structured solution. Tap retry to try again.", category: 'parse_failure' };
        }
      }
      passNum++;
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // ── Terminal failure path ───────────────────────────────────────────────
  if (!parsedJson) {
    // Release the pre-reserved free-tier daily slot — a failed generation must
    // not burn the user's quota. (Success updates this row instead, at ~1665.)
    if (freeTierReservationId) {
      try {
        await query('DELETE FROM coding_usage WHERE id=$1', [freeTierReservationId]);
      } catch (relErr) {
        console.warn('[coding/solve] free-tier reservation release failed:', relErr.message);
      }
    }
    // Never surface raw Anthropic SDK error bodies (they contain 400 JSON blobs).
    // Show a human-readable message instead.
    let msg = terminalFailure?.msg || "Couldn't generate a solution. Please tap retry.";
    if (msg.startsWith('4') && msg.includes('"type"')) {
      msg = "Couldn't generate a solution. Please tap retry.";
    }
    console.error(
      `[coding/solve] TERMINAL_FAILURE lang=${lang} model=${modelUsed} pass=${passTag} ` +
      `durMs=${latencyMs} category=${terminalFailure?.category || 'unknown'} ua=${JSON.stringify(userAgent)}`,
    );
    sendEvent('error', {
      msg,
      retryable: true,
      parse_failure: terminalFailure?.category === 'parse_failure',
      category: terminalFailure?.category || 'unknown',
    });
    sendEvent('done', { ok: false });
    return res.end();
  }

  // ── Success path — normalize and emit answer ────────────────────────────
  if (!isMcq) {
    // Ensure code fields are strings
    if (parsedJson.code && typeof parsedJson.code !== 'string') {
      parsedJson.code = String(parsedJson.code);
    }
    for (const sol of parsedJson.solutions || []) {
      if (sol.code && typeof sol.code !== 'string') {
        sol.code = String(sol.code);
      }
    }
    // Reject near-duplicate approaches. The prompt asks for genuinely distinct
    // strategies, but "give me three" reliably produces two-and-a-restatement on
    // problems with only one good answer — and a fake baseline is worse than an
    // honest pair, because the candidate finds out it was fake in front of the
    // interviewer. Runs before the back-compat `code` assignment so the surviving
    // first solution is the one that gets promoted.
    if (parsedJson.solutions?.length > 1) {
      const before = parsedJson.solutions.length;
      parsedJson.solutions = dedupeSolutions(parsedJson.solutions);
      if (parsedJson.solutions.length !== before) {
        console.log(`[solve] dropped ${before - parsedJson.solutions.length} duplicate approach(es) — ${before} → ${parsedJson.solutions.length}`);
      }
    }
    // Check the identification walk against the real chart. The model is asked to
    // follow one branch per step from the root; a path that skips a node, answers
    // an edge that does not exist, or stops short is dropped rather than shown,
    // because a plausible-looking but invalid derivation is worse than none — the
    // candidate would repeat it to an interviewer. A valid prefix is kept.
    if (parsedJson.identification) {
      const ident = parsedJson.identification;
      const verdict = validatePath(ident.path);
      if (verdict.ok) {
        // Question text comes from the chart, never from the model, so the wording
        // stays consistent across answers and cannot be quietly reframed.
        //
        // Send only the DECISIVE steps. The full walk is validated above — every
        // edge has to exist, so the chain is proven — but a reader does not need
        // the twelve "no" answers it passed through on the way. Trapping Rain
        // Water answers no twelve times before the two that matter, and that wall
        // of negatives buries the reasoning the card exists to show.
        //
        // Trimmed HERE rather than only in the renderer so it holds regardless of
        // which frontend build a client is running, and for answers replayed from
        // cache. A path that ends on a no-branch keeps its last step — that is the
        // one that picked the technique.
        const decisive = verdict.steps.filter(st => st.answer === 'yes');
        ident.path = decisive.length ? decisive : verdict.steps.slice(-1);
        if (verdict.technique) ident.chartTechnique = verdict.technique;
        if (!ident.technique) ident.technique = verdict.technique;
      } else if (verdict.steps.length) {
        /* The walk diverged from the chart partway. Every step BEFORE the
         * divergence was checked — node id AND answer — so that prefix is
         * proven and worth showing; only the unproven tail goes.
         *
         * Deleting the whole card on any divergence meant one near-miss on a
         * node id ("subarrays" where the chart says "sums" — the same idea,
         * the wrong token) erased an entire correct derivation. Worse, it
         * erased it LATE: the card renders during streaming from the
         * unvalidated draft and then vanished when the validated payload
         * replaced it, which reads as the answer losing a card it had. */
        const decisive = verdict.steps.filter(st => st.answer === 'yes');
        ident.path = decisive.length ? decisive : verdict.steps.slice(-1);
        // No chart-verified technique to claim — the walk never reached a leaf.
        delete ident.chartTechnique;
        console.log(`[solve] identification trimmed to ${ident.path.length} verified step(s): ${verdict.reason}`);
      } else {
        console.log(`[solve] identification rejected: ${verdict.reason}`);
        delete parsedJson.identification;
      }
    }

    // Interview cards. Two of these are checkable, so check them: a quoted signal
    // must really appear in the statement, and a topic section must be one we
    // actually have. Anything that fails is dropped rather than shown — the cards
    // exist to be trusted mid-interview, and a phrase the candidate cannot find in
    // the problem is worse than a missing card.
    /* Stamp: this answer was generated by a model that was ASKED about the
     * statement's stated requirements.
     *
     * Set here rather than by the model, because it is a fact about the prompt,
     * not a claim the model gets to make. Without it the client cannot tell
     * "the statement demands nothing" from "nobody looked" — both arrive as an
     * absent requirements array — so an answer cached before RULE #4.7 existed
     * would render as fully compliant. The client says "not checked" instead
     * when this is missing.
     */
    parsedJson.requirementsChecked = true;

    if (parsedJson.interview && typeof parsedJson.interview === 'object') {
      const iv = parsedJson.interview;
      const haystack = String(problem).toLowerCase();

      if (Array.isArray(iv.signals)) {
        const before = iv.signals.length;
        iv.signals = iv.signals.filter(sig => {
          const phrase = String(sig?.phrase ?? '').trim().toLowerCase();
          if (!phrase || !sig?.implies) return false;
          // Allow a light paraphrase: every significant word must be present.
          const words = phrase.replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 3);
          return words.length ? words.every(w => haystack.includes(w)) : haystack.includes(phrase);
        });
        if (iv.signals.length !== before) {
          console.log(`[solve] dropped ${before - iv.signals.length} signal(s) not present in the statement`);
        }
        if (!iv.signals.length) delete iv.signals;
      }

      if (iv.topic) {
        if (!isKnownSection(iv.topic.section)) delete iv.topic.section;
        // "What to review" resolves against the real curriculum, never the
        // model's memory of it, so every suggestion points at a lesson we have.
        const lessons = matchLessons(Array.isArray(iv.topic.concepts) ? iv.topic.concepts : []);
        if (lessons.length) iv.topic.review = lessons;
        if (!iv.topic.section && !lessons.length) delete iv.topic;
      }

      if (Array.isArray(iv.probes)) {
        iv.probes = iv.probes.filter(p => String(p?.q ?? '').trim() && String(p?.a ?? '').trim());
        if (!iv.probes.length) delete iv.probes;
      }
      if (!Object.keys(iv).length) delete parsedJson.interview;
    }

    // Strip the demo driver the model likes to append:
    //     print(Solution().minWindow('ADOBECODEBANC', 'ABC'))
    // The runner already ignores those lines, so test cases pass — but they are
    // still shown in the editor as part of the answer, where they read as
    // hardcoded output. Only when a template drives the call (starter code was
    // supplied), because that is exactly the case where the platform, not the
    // file, invokes the solution. A stdin/print problem keeps its prints.
    if (ioContract === 'template' && /^py/i.test(lang) && Array.isArray(parsedJson.solutions)) {
      for (const sol of parsedJson.solutions) {
        if (typeof sol?.code !== 'string') continue;
        const cleaned = stripModuleLevelPrints(sol.code);
        if (cleaned && cleaned !== sol.code) sol.code = cleaned;
      }
    }

    // Set top-level code from first solution for backwards compat
    if (!parsedJson.code && parsedJson.solutions?.length) {
      parsedJson.code = parsedJson.solutions[0].code || '';
    }
  } else {
    // Tag the language so the frontend never tries to run/translate an MCQ.
    parsedJson.type = 'mcq';
    parsedJson.language = 'mcq';
  }
  const parsed = { json: parsedJson, format: 'ascend_json' };

  const answerPayload = {
    question: problem.slice(0, 100),
    raw: rawAnswer,
    parsed,
    is_coding: true,
    language: lang,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    latency_ms: latencyMs,
    model_used: modelUsed,
    recovery_pass: passTag,
  };
  sendEvent('answer', answerPayload);

  // Cache the structured answer for future repeats of the same problem.
  // Fire-and-forget so a slow Redis write doesn't delay the SSE close.
  cacheSet(cacheKey, answerPayload).catch((err) => {
    console.warn('[coding/solve] cache write failed:', err.message);
  });

  // ── Persist to database (fire-and-forget) ───────────────────────────────
  try {
    if (conversationId) {
      await query(
        `INSERT INTO lumora_messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [conversationId, problem],
      );
      await query(
        `INSERT INTO lumora_messages (conversation_id, role, content, metadata)
         VALUES ($1, 'assistant', $2, $3)`,
        [conversationId, rawAnswer, JSON.stringify({ tokens_used: inputTokens + outputTokens, latency_ms: latencyMs })],
      );
    }
    if (freeTierReservationId) {
      // Update the pre-reserved row with real token counts.
      await query(
        `UPDATE coding_usage SET language=$1, input_tokens=$2, output_tokens=$3, latency_ms=$4 WHERE id=$5`,
        [lang, inputTokens, outputTokens, latencyMs, freeTierReservationId],
      );
    } else {
      await recordCodingUsage(req.user.id, lang, inputTokens, outputTokens, latencyMs);
    }
  } catch (err) {
    console.error('Failed to persist coding usage:', err.message);
  }

  console.log(
    `[coding/solve] done lang=${lang} model=${modelUsed} pass=${passTag} ` +
    `tokens=${inputTokens}+${outputTokens} latencyMs=${latencyMs}`,
  );

  // Terminal done event — gives the SSE client a reliable signal to flip
  // isStreaming=false even if the stream socket lingers. Matches the fix
  // pattern from commit 8beab95 on the prep pipeline.
  sendEvent('done', { ok: true });
  res.end();
});

// ---------------------------------------------------------------------------
// POST /execute — Run code against test cases
// ---------------------------------------------------------------------------

router.post('/execute', authenticate, async (req, res) => {
  // Wrap the entire handler so nothing escapes to the global 500 path.
  // Code execution is best-effort by design — interpreter missing, malformed
  // input, sandbox failure all map to a 200/400 with a readable message
  // rather than a generic "Internal server error".
  try {
    const { code, language, test_cases: testCases, stdin } = req.body || {};

    if (!code || !language) {
      return res.status(400).json({ error: 'Missing code or language' });
    }
    if (typeof code !== 'string' || typeof language !== 'string') {
      return res.status(400).json({ error: 'code and language must be strings' });
    }

    // Optional custom stdin ("Test against custom input") — cap to protect the runner.
    // When present, the runner executes once feeding this stdin, bypassing test cases.
    const runOpts = typeof stdin === 'string' ? { stdin: stdin.slice(0, 64 * 1024) } : {};

    // Hard 25s wall — Railway's edge proxy times out at ~30s; we must
    // beat it so the client gets a JSON error rather than a 502 HTML.
    const result = await Promise.race([
      executeCode(code, language, Array.isArray(testCases) ? testCases : [], runOpts),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out after 25s')), 25_000),
      ),
    ]);
    return res.json(result);
  } catch (err) {
    console.error('Code execution error:', err);
    return res.status(400).json({ error: err?.message || 'Code execution failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /fix — Auto-fix code based on failing test feedback
// ---------------------------------------------------------------------------

router.post('/fix', authenticate, checkUsage('questions'), async (req, res) => {
  const { code, language, error: feedback, problem } = req.body;

  if (!code || !language || !feedback) {
    return res.status(400).json({ error: 'Missing code, language, or error feedback' });
  }

  const problemContext = problem ? `\nORIGINAL PROBLEM:\n${problem}\n` : '';
  const model = getModelForUser(req);

  try {
    const fixResult = await geminiGetModel('').generateContent(`Fix this ${language} code so every test produces the EXACT expected output.
${problemContext}
CODE:
\`\`\`${language}
${code}
\`\`\`

FAILING TESTS (Input | Expected | Got):
${feedback}

${language === 'bash' || language === 'shell' ? `BASH EXECUTION CONTEXT:
- The runner calls: set -- <arg1> <arg2> ...  then invokes your top-level function with "$@"
- Each argument is a raw value string (e.g. '[[2,3,1],[4,5,1],[1,5,2]]')
- Your function receives $1, $2, ... as quoted strings — parse them yourself
- echo the final answer to stdout — that is what gets compared to Expected
- If input is a Python-style list string in $1, parse it with sed/awk or use mapfile
` : `EXECUTION CONTEXT for ${language}:
- The runner PARSES each test Input into arguments, CALLS your top-level function
  (or class Solution method) with them, and compares the function's RETURN VALUE
  to Expected. Printed output is NOT what gets compared in this mode.
- Therefore your fix MUST take the inputs as parameters and RETURN the answer.
- If the current code reads stdin (input()/sys.stdin), prints its answer, or
  returns None (a HackerRank-style scaffold), CONVERT it into a clean function
  that takes the parsed inputs as parameters and RETURNS the answer — that
  conversion is often the actual fix.
`}
Return ONLY a JSON object (no markdown fences):
{
  "code": "the complete fixed code as a string with \\n for newlines",
  "explanation": "one sentence: what was wrong and how you fixed it"
}

RULES:
- Produce code whose RETURN VALUE equals Expected EXACTLY for every test
- Fix ALL failing tests, not just the first one
- Do NOT add comments in the code
- Return the COMPLETE runnable code, not a partial snippet
- You MAY change the function signature or restructure (e.g. stdin/print → a
  param-taking, return-based function) when that is what makes the tests pass
- Never add a module-level call to your function or an if __name__ block
- No extra blank lines in the output`);

    const content = fixResult.response.text() || '';

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);
      return res.json(parsed);
    } catch {
      const codeMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
      const extracted = (codeMatch ? codeMatch[1] : content).trim();
      // The fence may itself contain JSON (Claude sometimes wraps JSON in ```json)
      try {
        const inner = JSON.parse(extracted);
        if (inner && inner.code) return res.json(inner);
      } catch { /* not JSON — treat as raw code */ }
      return res.json({ code: extracted, explanation: '' });
    }
  } catch (err) {
    console.error('Auto-fix error:', err);
    return res.status(500).json({ error: 'Auto-fix failed' });
  }
});

// ---------------------------------------------------------------------------
// CoFix output sanitizer — models (esp. Gemini) sometimes ignore the "no
// comments" rule and dump their chain-of-thought (traceback analysis, harness
// musings) as whole-line comments inside fixed_code. That reads as nonsense in
// a candidate's editor. We strip whole-line comments defensively, string-aware
// so we never touch code or string literals, and remap changes[]/walkthrough[]
// line references so annotations stay aligned with the trimmed code.
// ---------------------------------------------------------------------------
function commentTokenFor(lang) {
  const l = (lang || '').toLowerCase();
  if (/sql/.test(l)) return '--';
  if (/(python|^py$|ruby|^rb$|bash|shell|^sh$|zsh|yaml|^yml$|perl|^r$)/.test(l)) return '#';
  return '//'; // js/ts/java/c/c++/c#/go/rust/kotlin/swift/scala/php/dart…
}

// Returns { code, lineMap } where lineMap maps original 1-indexed line numbers
// that survive → their new 1-indexed position. Removed lines are absent.
function stripInjectedComments(code, lang) {
  if (!code || typeof code !== 'string') return { code, lineMap: null };
  const token = commentTokenFor(lang);
  const lines = code.split('\n');
  const kept = []; // { old0, text }
  let inTriple = null;    // python triple-quote: `'''` or `"""`
  let inTemplate = false; // js template literal (backtick)
  let removedAny = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const insideString = Boolean(inTriple) || inTemplate;
    const isWholeComment = !insideString
      && trimmed.startsWith(token)
      && !(token === '#' && trimmed.startsWith('#!')); // keep shebang
    // Also drop blank lines (outside strings) IN THIS PASS so the lineMap
    // accounts for them. The frontend strips blanks for display; doing it here
    // too keeps changes[].line / walkthrough[].lines aligned to what's shown
    // (previously the highlights landed N lines too high, N = blanks above).
    const isBlank = !insideString && trimmed === '';

    if (isWholeComment || isBlank) { removedAny = true; continue; }
    kept.push({ old0: i, text: line });

    // Advance string state using only the lines we keep.
    if (token === '#') {
      const re = /'''|"""/g; let m;
      while ((m = re.exec(line)) !== null) {
        if (!inTriple) inTriple = m[0];
        else if (inTriple === m[0]) inTriple = null;
      }
    } else if (token === '//') {
      for (let c = 0; c < line.length; c++) {
        if (line[c] === '`' && line[c - 1] !== '\\') inTemplate = !inTemplate;
      }
    }
  }

  if (!removedAny) return { code, lineMap: null };
  const lineMap = new Map();
  kept.forEach((k, idx) => lineMap.set(k.old0 + 1, idx + 1));
  return { code: kept.map(k => k.text).join('\n'), lineMap };
}

// Map an old 1-indexed line number to its new position; if that exact line was
// removed, snap to the nearest surviving neighbour so annotations don't vanish.
function remapLine(n, lineMap) {
  const num = parseInt(n, 10);
  if (!Number.isFinite(num) || !lineMap) return num;
  if (lineMap.has(num)) return lineMap.get(num);
  const max = Math.max(...lineMap.keys(), num);
  for (let d = 1; d <= max; d++) {
    if (lineMap.has(num + d)) return lineMap.get(num + d);
    if (lineMap.has(num - d)) return lineMap.get(num - d);
  }
  return num;
}

// Remap a walkthrough "lines" string like "7" or "35-38".
function remapLineRef(ref, lineMap) {
  if (ref == null || !lineMap) return ref;
  const parts = String(ref).split('-').map(s => s.trim()).filter(Boolean);
  const mapped = parts.map(p => remapLine(p, lineMap));
  if (mapped.some(v => !Number.isFinite(v))) return ref;
  return mapped.length > 1 ? `${mapped[0]}-${mapped[mapped.length - 1]}` : String(mapped[0]);
}

function sanitizeCofixResult(parsed, lang) {
  if (!parsed || typeof parsed.fixed_code !== 'string') return parsed;
  const { code, lineMap } = stripInjectedComments(parsed.fixed_code, lang);
  if (!lineMap) return parsed; // nothing removed — leave untouched
  parsed.fixed_code = code;
  if (Array.isArray(parsed.changes)) {
    parsed.changes = parsed.changes.map(ch => (
      ch && Number.isFinite(ch.line) ? { ...ch, line: remapLine(ch.line, lineMap) } : ch
    ));
  }
  if (Array.isArray(parsed.walkthrough)) {
    parsed.walkthrough = parsed.walkthrough.map(w => (
      w && w.lines != null ? { ...w, lines: remapLineRef(w.lines, lineMap) } : w
    ));
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// templateHasFillableFunction — does the captured editor template DEFINE a
// function/method whose body the candidate completes (STUB mode), or is it a
// MINIMAL/INLINE skeleton (e.g. just `import numpy`, or an empty main) where the
// expected answer is an inline stdin-read + compute + print appended in place
// (INLINE mode)? Language-agnostic. `main` is deliberately NOT counted as a
// fillable function — completing inside main is still INLINE completion, and the
// rule that matters is "never introduce a NEW wrapper the template lacks".
// ---------------------------------------------------------------------------
function templateHasFillableFunction(code) {
  if (!code || typeof code !== 'string') return false;
  return (
    /^[ \t]*def\s+\w+\s*\(/m.test(code) ||                 // Python def (HR/LeetCode stub)
    /\bfunction\s+\w+\s*\(/.test(code) ||                  // JS/TS function decl
    /\bfunc\s+(?!main\b)\w+\s*\(/.test(code) ||            // Go func (excluding main)
    // C-family method/function (Java, C++, C#, C) whose name is not `main`:
    // "<type> name(...) {". Keywords like if/for/while have no <type> before
    // the name, so they don't match.
    /(?:^|[;{}\n])\s*(?:public|private|protected|static|final|virtual|inline|[A-Za-z_][\w:<>\[\],&*\s]*?)\s+(?!main\b)[A-Za-z_]\w*\s*\([^;{)]*\)\s*(?:const\s*)?(?:throws\s+[\w.,\s]+)?\{/m.test(code)
  );
}

// isMinimalInlineTemplate — a tiny editor skeleton that is import/using/package
// lines only (plus comments/blanks). This is HackerRank's numpy-style "Zeros and
// Ones" template: `import numpy` with NO function stub and NO harness. There is
// literally nothing to "fix" — everything is to be ADDED inline. Treating it as a
// platform template (rather than broken code) is exactly the intended behaviour.
// ---------------------------------------------------------------------------
function isMinimalInlineTemplate(code) {
  if (!code || typeof code !== 'string') return false;
  const lines = code
    .split('\n')
    .map((l) => l.replace(/#.*$|\/\/.*$/, '').trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > 6) return false;
  const importish = /^(?:import\b|from\b.+\bimport\b|#include\b|using\b|package\b|require\s*\(|const\s+\w+\s*=\s*require\b)/;
  return lines.every((l) => importish.test(l));
}

// buildTemplateShapeDirective — the single universal rule that makes generation
// reproduce the captured editor content in its own shape and NEVER invent a
// wrapper function the template does not declare. Shared by /solve and /cofix.
// ---------------------------------------------------------------------------
function buildTemplateShapeDirective(starterCode) {
  const hasFn = templateHasFillableFunction(starterCode);
  return `TEMPLATE SHAPE — the captured editor content is the AUTHORITATIVE skeleton the candidate will submit. Reproduce it VERBATIM and complete it in ITS OWN shape:
${hasFn
  ? '• This template DEFINES a function/method to complete. Fill ONLY its body. Do NOT add any new top-level function, class, or wrapper around it.'
  : '• This template has NO function to fill — it is a MINIMAL / INLINE skeleton (e.g. just imports, or an empty main). The expected answer is the template PLUS an inline script in the SAME style: read the input the problem describes (input()/sys.stdin/cin/Scanner/readline), compute, and print the result, written at top level exactly where the template leaves off. DO NOT invent a wrapper function (no def solve(...), no create_arrays(...), no helper, no class) that the template does not already declare — match how a candidate would type directly under the given imports.'}`;
}

// detectPlatformTemplate — is this pasted code a LOCKED editor template that the
// candidate can only fill (HackerRank / Codility / CoderPad), rather than a piece
// of broken code to repair? Language-agnostic. Triggers on ANY of:
//   • an `if __name__ == '__main__':` driver (Python) / equivalent harness that
//     reads input and calls a function
//   • two or more stdin reads (bare-script HR templates that lack a function)
//   • an empty / `pass` / `return`-only / `...` / NotImplementedError function
//     body, or a platform stub marker ("write your code here", "complete the … below", TODO)
// When true, CoFix switches to TEMPLATE-SOLVE mode: fill only the stub body/bodies
// and reproduce everything else byte-for-byte, instead of "fix only what's broken".
// Mirrors the frontend isCodeTemplate() heuristic so both entry points agree.
// ---------------------------------------------------------------------------
function detectPlatformTemplate(code) {
  if (!code || typeof code !== 'string') return false;
  const mainGuard = /^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(code)
    || /public\s+static\s+void\s+main\s*\(/.test(code)   // Java driver
    || /\bfunc\s+main\s*\(\s*\)/.test(code);              // Go driver
  const stdinReads = (code.match(/\binput\s*\(|\bsys\.stdin\b|\.nextInt\s*\(|\.nextLine\s*\(|\bcin\s*>>|\breadLine\s*\(|\breadline\s*\(|\breadarray\b|bufio\.New/g) || []).length;
  // Empty / stub / placeholder function body — the thing the candidate must fill.
  const emptyStub =
    /\bdef\s+\w+\s*\([^)]*\)\s*(?:->[^\n:]+)?:\s*(?:\n\s*(?:#[^\n]*\n\s*|"""[\s\S]*?"""\s*\n\s*|'''[\s\S]*?'''\s*\n\s*)*)?(?:return\s*(?:None)?\s*$|pass\s*$|\.\.\.\s*$)/m.test(code)
    || /\braise\s+NotImplementedError/.test(code)
    || /(?:#|\/\/)\s*(?:write your code here|your code goes here|complete the\b[^\n]*\b(?:function|method))/i.test(code)
    || /\bTODO\b/.test(code)
    || /\breturn\s+(?:\[\]|\{\}|""|''|0)\s*;?\s*$/m.test(code);
  // Minimal/inline editor skeleton (imports-only, e.g. numpy "Zeros and Ones"):
  // there is nothing to fix, everything to add — treat it as a template to solve.
  return !!(mainGuard || stdinReads >= 2 || emptyStub || isMinimalInlineTemplate(code));
}

// ---------------------------------------------------------------------------
// POST /cofix/stream — CoFix: fix broken code, stream structured change annotations
// ---------------------------------------------------------------------------

router.post('/cofix/stream', authenticate, checkUsage('questions'), async (req, res) => {
  const { code, hint, language, company, problem, mode } = req.body;

  if (!code || code.trim().length < 5) {
    return res.status(400).json({ error: 'Missing or too-short code' });
  }
  if (code.trim().length > 50000) {
    return res.status(400).json({ error: 'Code too large — maximum 50,000 characters' });
  }

  const lang = (language || 'python').toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  const model = getModelForUser(req);
  const hintSection = hint ? `\nUSER HINT: ${hint.trim().slice(0, 500)}\n` : '';
  const companySection = company ? `\nCOMPANY CONTEXT: Tailor the fix to ${company.trim().slice(0, 100)} coding standards.\n` : '';

  // Strip any residual [Key: Value] metadata headers in case they appear in pasted code
  const cleanedCode = code.replace(/^\s*\[[^\]]+:[^\]]+\]\s*\n?/gm, '').trim();

  // Is the pasted code a locked platform editor template (function stub +
  // __main__/driver harness)? If so we SOLVE-in-place rather than repair.
  const isTemplate = detectPlatformTemplate(cleanedCode);
  // Thread the problem statement (from screenshot OCR / DOM / problem panel) so
  // CoFix can actually SOLVE the empty stub instead of guessing from the fn name.
  const problemText = (typeof problem === 'string' ? problem : '').trim().slice(0, 8000);
  const problemSection = problemText
    ? `\nPROBLEM STATEMENT — implement the code so it correctly solves THIS (read constraints + examples carefully; trace your body on the first example before answering):\n"""\n${problemText}\n"""\n`
    : '';
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  function sendEvent(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  let clientDisconnected = false;
  const abortController = new AbortController();

  const keepaliveTimer = setInterval(() => {
    if (!clientDisconnected) res.write(': ping\n\n');
  }, 20_000);

  req.on('close', () => {
    clientDisconnected = true;
    clearInterval(keepaliveTimer);
    try { abortController.abort(); } catch {}
  });

  // ── Situation: selected once, never layered ──────────────────────────────
  // Exactly ONE block describes what the candidate is being asked to do, so two
  // situations can no longer contradict each other inside the same prompt.
  //
  // The hint doubles as the utterance channel: mid-interview the candidate drops
  // the interviewer's actual question in there ("can we do better?", "why a hash
  // map?"), and that question — not what the editor happens to hold — decides
  // the situation.
  const task = resolveTask({ requested: mode, isTemplate, utterance: hint });
  const answerOnly = isAnswerOnly(task);

  // When a USER HINT is present the call is a REFINEMENT of already-working code
  // (e.g. "add print steps", "add type hints", or fix a specific error). Template
  // mode above says "add ONLY the missing implementation" — which would ignore the
  // hint and return the code unchanged. This directive overrides that so the hint
  // is actually applied, while still keeping the harness runnable.
  //
  // It is suppressed for answer-only situations. "Return VISIBLY CHANGED code —
  // NEVER return the input unchanged" is the exact opposite of "set fixed_code to
  // the input byte for byte", and shipping both is the stacked-override bug this
  // registry was built to end. A question is not an edit instruction.
  const refineDirective = (hint && !answerOnly)
    ? `\n══════════════════════════════════════════════════════════════════════════
REFINEMENT — HIGHEST PRIORITY. This OVERRIDES the "add ONLY the missing implementation" limit above.
══════════════════════════════════════════════════════════════════════════
The USER HINT is a DIRECT edit instruction on the code below. You MUST apply it and return VISIBLY CHANGED code — NEVER return the input unchanged. Add or modify whatever lines are needed to satisfy the hint (print statements, comments, docstrings, type hints, error handling, a different approach, etc.).
Keep only what must stay for it to still run: imports, the \`if __name__ == '__main__':\`/driver block, the stdin reads and print/fptr output, and the function NAME + parameter names/order (so the harness's call still resolves). Everything else — the body, annotations, added lines — is fair game.
Each changes[] entry references a line you ADDED or MODIFIED to satisfy the hint.
══════════════════════════════════════════════════════════════════════════
`
    : '';

  const situationBlock = buildSituationBlock({
    task,
    templateShape: isTemplate ? buildTemplateShapeDirective(cleanedCode) : '',
  });
  const walk = WALKTHROUGH_BUDGET[task] || WALKTHROUGH_BUDGET.diagnose;
  // FILL: find the hole here, in code, so the model is told where it is instead
  // of hunting for it — and so we can splice its answer back into the original.
  const fillGap = task === 'fill' ? detectGap(cleanedCode) : null;
  const gapSection = fillGap ? gapDirective(fillGap, cleanedCode) : '';
  console.log(`[cofix] task=${task} requested=${mode || 'none'} utterance=${hint ? classifyUtterance(hint) || 'none' : 'none'} answerOnly=${answerOnly} isTemplate=${isTemplate} lang=${lang}`);

  const cofixUserContent = `You are CoFix, a code repair specialist. Fix the ${lang} code below.${hintSection}${companySection}${problemSection}
${situationBlock}${gapSection}
${refineDirective}

CODE:
\`\`\`${lang}
${cleanedCode}
\`\`\`

Return ONLY a JSON object (no markdown fences) with this exact structure:
{
  "fixed_code": "complete fixed code as a string",
  "changes": [
    {
      "line": <1-indexed line number in fixed_code>,
      "badge": <sequential integer starting at 1>,
      "type": "fix" | "added",
      "label": "2-4 word label",
      "note": "≤ 8 words — terse, what changed. No full sentences.",
      "category": "DIAGNOSE ONLY — one of: boundary, null_type, state, error_handling, concurrency, resource, security, performance. Omit for every other situation.",
      "breaks": "DIAGNOSE ONLY — the observable runtime failure, e.g. 'IndexError on the last iteration when len is even'. Omit for every other situation."
    }
  ],
  "complexity": {
    "time": "O(...)",
    "space": "O(...)",
    "timeWhy": "ONE short sentence (≤ 18 words) naming the dominant operation and why. No preamble.",
    "spaceWhy": "ONE short sentence (≤ 18 words) naming the extra memory used, or why O(1). No preamble."
  },
  "hackerrank_compatible": true | false,
  "walkthrough": [
    {
      "lines": "1-3",
      "context": "phase: 'read' | 'insight' | 'build' | 'trace' | 'complexity' (omit if not relevant)",
      "text": "First-person, ≤ 15 words — one crisp point the candidate says aloud. Cite REAL variable names in backticks."
    }
  ]
}

OUTPUT ENCODING — CRITICAL (one wrong backslash makes the pasted code raise SyntaxError):
- "fixed_code" is a JSON string, so every backslash that belongs to the CODE must be written as a DOUBLE backslash and round-trip to ONE backslash in the source: the separator in '\\n'.join(...), tabs, regex classes like \\d / \\w, Windows paths. A SINGLE \\n inside a code string literal is parsed by JSON as a real newline and splits the literal across two lines → SyntaxError. Never emit a raw/literal newline inside a string literal.
- Never place a backslash escape inside an f-string expression's braces { } (e.g. f'{"\\u2713" if ok else "x"}') — that is a SyntaxError before Python 3.12. Assign the character to a variable first (e.g. check = '\\u2713'), then reference the variable inside the f-string.

WALK-THROUGH — CONCISE: the candidate reads this ALOUD mid-interview, so it must be
skimmable in seconds. Produce EXACTLY ${walk.min}-${walk.max} steps (never more), each ≤ 15 words:
  1) INSIGHT — the ONE key realisation that unlocks it ("the trick is…").
  2..N) BUILD — the 2-3 core moves of the ACTUAL fixed_code, real variable names in backticks.
  LAST) COMPLEXITY — time/space in a half-line.
Voice: crisp first-person ("I keep a running…"). NO preamble, NO restating the problem,
NO line-by-line paraphrase, NO filler. Every claim true to the code. Fewer, sharper points.

RULES:
- NO HARDCODING / NO CHEATING — ABSOLUTE LAW. It outranks every preservation rule in the SITUATION block above.
  The problem's example names, IDs, and titles are ILLUSTRATIONS, not real data; the fixed code is run
  against COMPLETELY DIFFERENT inputs, so any answer baked to the examples FAILS. You are FORBIDDEN from:
    • special-casing a specific input and returning canned data, e.g.
        if owner == "venmo" and repo == "foundations-interview": return [PR(1, "Fix issue", ...), PR(2, ...)]
    • MOCK_ / FAKE_ / HARDCODED_ variables holding example objects;
    • any fetch_* / get_* / load_* function that returns a static list instead of making its real I/O call.
  If the code you are fixing ALREADY CONTAINS such a hardcoded / special-cased branch, THAT BRANCH IS THE BUG:
  DELETE it and replace it with genuine logic (compute the result from the parameters, or make the real
  API/IO call the function name promises). Removing a cheat is REQUIRED and does NOT count as a forbidden
  "restructure". Every function must derive its output from its inputs — never from memorised example values.
- line numbers refer to the FIXED code, not the original
- type "fix" = correcting an existing line; type "added" = newly inserted line
- hackerrank_compatible: true only if the function has a clean return-based signature with no stdin/input() boilerplate
- If code has no issues, return changes: [] and fixed_code equal to the input
- Return the COMPLETE fixed code, not a partial snippet
- fixed_code MUST be submission-ready: the corrected program ONLY. Add ZERO comments. NEVER write your reasoning, analysis, or notes — about tracebacks, NameErrors, the test harness, "why this works", or "we include the __main__ block because…" — as comments in the code. That commentary is nonsense in a candidate's editor. ALL explanation goes ONLY in changes[] and walkthrough[]. If the input code had no comments, fixed_code has no comments.
- walkthrough: ${walk.min}-${walk.max} entries MAX, ≤ 15 words each, first person, backticks for var refs. Group related lines ("35-38"). Only the KEY moves — skip the obvious.
- changes: emit only the KEY logical changes, GROUPED, MAX 8 entries — never one-per-line. For a stub you completed, summarise the added blocks (e.g. "added the deadline-propagation loop"), don't list every line. note ≤ 8 words.
- BE CONCISE EVERYWHERE: the candidate reads changes[], walkthrough[], and complexity aloud during a live interview. Fewer, sharper items beat completeness. No filler, no restating the problem.`;

  // Parse the model's JSON, tolerant of markdown fences and any leading prose
  // or trailing text around the object.
  function parseCofix(fullText) {
    const fenced = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = (fenced ? fenced[1] : fullText).trim();
    try {
      return JSON.parse(jsonStr);
    } catch {
      const first = jsonStr.indexOf('{');
      const last = jsonStr.lastIndexOf('}');
      if (first !== -1 && last > first) return JSON.parse(jsonStr.slice(first, last + 1));
      throw new Error('no JSON object');
    }
  }

  async function emitCofix(parsed) {
    // Preservation by construction: rebuild the file as original-before-gap +
    // the model's new block + original-after-gap, so nothing outside the hole
    // can drift no matter what the model returned.
    if (fillGap && parsed && typeof parsed.fixed_code === 'string') {
      const spliced = spliceFill({ original: cleanedCode, fixedCode: parsed.fixed_code, gap: fillGap, filled: parsed.filled });
      if (spliced.preserved) {
        const drifted = spliced.code !== parsed.fixed_code;
        parsed.fixed_code = spliced.code;
        parsed.filled = spliced.filled;
        if (drifted) console.log(`[cofix] fill: restored lines outside the gap (${spliced.filled.what})`);
      } else {
        console.log(`[cofix] fill: splice skipped — ${spliced.reason}`);
      }
    }
    sanitizeCofixResult(parsed, lang);
    sendEvent('answer', parsed);
    sendEvent('done', {});
    try { await recordCodingUsage(req.user.id, lang, 0, 0, 0); } catch {}
    clearInterval(keepaliveTimer);
    res.end();
  }

  // Fallback path helper (parse + emit in one shot).
  async function parseAndEmitCofix(fullText) { await emitCofix(parseCofix(fullText)); }

  // Anti-cheat rejection appended to the prompt when the first fix hardcodes
  // example data (a special-cased branch, a MOCK_/FAKE_ var, or a fetch_*/get_*
  // that skips its real I/O). The tokens of a rejected attempt are ignored by
  // the CoFix client (it only consumes the final `answer` event), so re-running
  // is safe and invisible.
  const ANTI_CHEAT_COFIX =
    '\n\n––– REJECTED: your previous fix hardcoded example data instead of solving the problem ' +
    '(a MOCK_/FAKE_ variable, a branch that special-cases a specific input to return canned data, ' +
    'or a function that returns a fixed literal collection instead of computing it). The example ' +
    'values are ILLUSTRATIONS — the code runs against DIFFERENT inputs, so hardcoded data FAILS. ' +
    'Redo the fix for the SAME code and SAME problem: make every function compute from its parameters ' +
    '(or perform the real I/O its name implies). Do NOT change the task or add unrelated logic. ' +
    'Return the SAME JSON shape, no preamble.';

  async function runCofixOnce(promptText) {
    // CoFix returns the WHOLE file as one escaped JSON string. Two things made it
    // "Failed to parse": (1) no output ceiling truncated the JSON mid-string, and
    // (2) streaming re-assembly of the chunks occasionally corrupted the escaped
    // code. The CoFix client IGNORES token events (it only consumes the final
    // `answer`), so streaming bought nothing — we now do ONE non-streaming call
    // and read the complete text in a single piece (no chunk re-assembly). The
    // keepalive ping covers the wait so the client's silence timer never fires.
    // application/json makes Gemini emit a parseable object; maxOutputTokens is
    // lifted so a big file isn't cut off.
    const cofixModel = getGeminiClient().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        maxOutputTokens: 32768,
      },
    });
    const result = await cofixModel.generateContent(promptText);
    if (clientDisconnected) return null;
    return result.response.text();
  }

  try {
    // Up to 3 attempts. Gemini's JSON mode occasionally still emits a malformed
    // object on a big file (~1-in-3 on a 180-line stub), so a parse failure now
    // RETRIES instead of erroring out — only the final attempt surfaces the
    // error. Hardcoding rejection also retries, appending the anti-cheat notice.
    const MAX_ATTEMPTS = 3;
    let parsed = null;
    let useAntiCheat = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const promptText = useAntiCheat ? cofixUserContent + ANTI_CHEAT_COFIX : cofixUserContent;
      const fullText = await runCofixOnce(promptText);
      if (fullText === null) { clearInterval(keepaliveTimer); return; }

      let candidate;
      try {
        candidate = parseCofix(fullText);
      } catch {
        if (attempt < MAX_ATTEMPTS - 1) {
          console.error(`[cofix] parse_failed attempt=${attempt} — retrying`);
          continue;
        }
        sendEvent('error', { message: 'Failed to parse CoFix response — try again' });
        clearInterval(keepaliveTimer);
        res.end();
        return;
      }

      // Anti-cheat: reject a hardcoded fix and retry with the rejection appended.
      // On the final attempt we emit whatever comes back (best effort).
      if (attempt < MAX_ATTEMPTS - 1 && detectsHardcoding(candidate.fixed_code)) {
        console.error(`[cofix] hardcoding_detected attempt=${attempt} — rejecting and retrying`);
        useAntiCheat = true;
        continue;
      }
      parsed = candidate;
      break;
    }
    if (parsed) await emitCofix(parsed);
    else { clearInterval(keepaliveTimer); res.end(); }
  } catch (err) {
    clearInterval(keepaliveTimer);
    if (clientDisconnected) return;

    const cofixFallbacks = getFallbackProviders();
    if (isApiExhaustedError(err) && cofixFallbacks.length > 0) {
      console.warn('[cofix] Claude exhausted — trying fallback providers:', err.message);
      for (const provider of cofixFallbacks) {
        sendEvent('status', { state: 'warn', msg: `Switching to ${provider.label}…` });
        try {
          const fbStream = await provider.client.chat.completions.create({
            model: provider.model,
            max_tokens: 8192,
            stream: true,
            messages: [{ role: 'user', content: cofixUserContent }],
          });
          let fullText = '';
          for await (const chunk of fbStream) {
            if (clientDisconnected) break;
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) { fullText += token; sendEvent('token', { chunk: token }); }
          }
          if (clientDisconnected) return;
          await parseAndEmitCofix(fullText);
          console.log(`[cofix] ${provider.label} fallback succeeded`);
          return;
        } catch (fbErr) {
          console.warn(`[cofix] ${provider.label} fallback failed:`, fbErr.message);
        }
      }
      sendEvent('error', { message: 'All AI providers unavailable — please try again shortly.' });
      res.end();
      return;
    }

    console.error('CoFix stream error:', err);
    sendEvent('error', { message: err.message || 'CoFix failed' });
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /translate — Translate a single solution to another language
// ---------------------------------------------------------------------------

router.post('/translate', authenticate, checkUsage('questions'), async (req, res) => {
  const { code, fromLanguage, toLanguage, problem } = req.body;

  if (!code || !toLanguage) {
    return res.status(400).json({ error: 'Missing code or toLanguage' });
  }
  const target = toLanguage.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(target)) {
    return res.status(400).json({
      error: `Unsupported target language: ${toLanguage}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    });
  }

  const problemContext = problem ? `\nORIGINAL PROBLEM:\n${problem.slice(0, 2000)}\n` : '';
  const fromHint = fromLanguage ? ` from ${fromLanguage}` : '';

  const systemPrompt = `You translate interview code${fromHint} to ${target}.

Rules:
- Preserve algorithmic approach and complexity exactly — do NOT change the strategy
- Use the LATEST modern idioms and built-in features of ${target}
- Keep it minimal (10-30 lines typical, 40 lines max)
- NO comments, NO debug prints, NO main/test blocks
- Include necessary imports for ${target}
- The translated code must compile and produce identical output for the same inputs

Respond with ONLY the translated code inside a single \`\`\`${target} code block — no prose before or after.`;

  try {
    const translateResult = await geminiGetModel(systemPrompt).generateContent(`${problemContext}\nORIGINAL CODE (${fromLanguage || 'source'}):\n\`\`\`\n${code}\n\`\`\`\n\nTranslate the code above to ${target}.`);

    const text = translateResult.response.text() || '';
    const m = text.match(/```(?:\w+)?\n?([\s\S]*?)```/);
    const translated = m ? m[1].trim() : text.trim();
    if (!translated) return res.status(502).json({ error: 'Translator returned empty output' });

    return res.json({ code: translated, language: target });
  } catch (err) {
    console.error('Translate error:', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
});

/**
 * POST /fetch-problem
 * Fetch a coding problem from a URL (LeetCode, HackerRank, etc.)
 *
 * LeetCode is a React SPA — a raw HTTP fetch returns a near-empty
 * shell with no problem text in the HTML. We special-case it here and
 * pull the question content from LeetCode's public GraphQL endpoint.
 * Other sites still use the regex HTML-strip + Haiku-clean fallback,
 * which works for static / server-rendered pages.
 */
/**
 * Map a requested language label (frontend 'python', 'cpp', 'javascript'…) to the
 * prefixes coding platforms use in their per-language starter fields — HackerRank
 * `<prefix>_template`, LeetCode `langSlug`. Ordered most- to least-preferred.
 */
function langCandidates(lang) {
  const l = String(lang || '').toLowerCase().trim();
  const MAP = {
    // Prefer Python 3 stubs — `python_template` is HackerRank's Python 2 (EOL).
    python: ['python3', 'pypy3', 'python', 'pypy'],
    python3: ['python3', 'pypy3', 'python', 'pypy'],
    py: ['python3', 'pypy3', 'python', 'pypy'],
    java: ['java'], javascript: ['javascript', 'node', 'js'], js: ['javascript', 'node', 'js'],
    typescript: ['typescript'], node: ['node', 'javascript'],
    'c++': ['cpp'], cpp: ['cpp'], c: ['c'], csharp: ['csharp'], 'c#': ['csharp'],
    go: ['golang', 'go'], golang: ['golang', 'go'], ruby: ['ruby'], php: ['php'],
    swift: ['swift'], kotlin: ['kotlin'], scala: ['scala'], rust: ['rust'], bash: ['bash'],
  };
  return MAP[l] || (l ? [l] : []);
}

/**
 * HackerRank's REST challenge model carries the editor stub per language as
 * `<prefix>_template` (python3_template, java_template, cpp_template…), plus a
 * `languages` list and optional `default_language`. Return the stub matching the
 * requested language, else the platform default, else any non-empty template.
 */
function pickHackerRankTemplate(model, lang) {
  const keys = Object.keys(model).filter(
    (k) => /_template$/.test(k) && typeof model[k] === 'string' && model[k].trim(),
  );
  if (!keys.length) return null;
  for (const root of langCandidates(lang)) {
    const exact = keys.find((k) => k === `${root}_template`);
    if (exact) return model[exact];
    const versioned = keys.find((k) => new RegExp(`^${root}\\d+_template$`).test(k));
    if (versioned) return model[versioned];
  }
  if (model.default_language && langCandidates(lang).includes(model.default_language) && model[`${model.default_language}_template`]) {
    return model[`${model.default_language}_template`];
  }
  // No template for the requested language (HackerRank omits e.g. python3_template
  // for many problems, rendering it client-side). Return null rather than a
  // WRONG-language template (a C stub for a Python solve) — a wrong harness is
  // worse than none. The editor-DOM scrape / OCR path is the fallback source.
  return null;
}

/**
 * LeetCode GraphQL `codeSnippets`: [{ lang, langSlug, code }] with langSlug values
 * like python3, java, cpp, c, javascript. Return the snippet matching the requested
 * language, else the first available.
 */
function pickLeetcodeSnippet(snippets, lang) {
  if (!Array.isArray(snippets) || !snippets.length) return null;
  for (const root of langCandidates(lang)) {
    const s = snippets.find((x) => new RegExp(`^${root}\\d*$`).test(String(x.langSlug || '').toLowerCase()));
    if (s && s.code) return s.code;
  }
  return snippets[0] && snippets[0].code ? snippets[0].code : null;
}

async function fetchLeetcodeProblem(url, lang) {
  // Accept any leetcode.com or leetcode.cn host; tolerate trailing
  // /description, /submissions, /discussion, query params, etc.
  const m = url.match(/leetcode\.(?:com|cn)\/problems\/([^/?#]+)/i);
  if (!m) return null;
  const titleSlug = m[1];

  const gqlBody = {
    operationName: 'questionContent',
    variables: { titleSlug },
    query: 'query questionContent($titleSlug: String!) { question(titleSlug: $titleSlug) { title difficulty content exampleTestcases codeSnippets { lang langSlug code } } }',
  };
  const gqlResp = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Referer': `https://leetcode.com/problems/${titleSlug}/`,
    },
    body: JSON.stringify(gqlBody),
    signal: AbortSignal.timeout(10000),
  });
  if (!gqlResp.ok) throw new Error(`LeetCode GraphQL returned ${gqlResp.status}`);
  const json = await gqlResp.json();
  const q = json?.data?.question;
  if (!q || !q.content) throw new Error('LeetCode did not return problem content (premium-only or removed problem?)');

  const text = q.content
    .replace(/<sup>/gi, '^').replace(/<\/sup>/gi, '')
    .replace(/<sub>/gi, '_').replace(/<\/sub>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const header = `${q.title}${q.difficulty ? ` (${q.difficulty})` : ''}\n\n`;
  return { problem: header + text, starterCode: pickLeetcodeSnippet(q.codeSnippets, lang) };
}

/**
 * Convert inline LaTeX / TeX (as delivered in HackerRank's clean REST fields —
 * `$n$`, `$1 \le n \le 100$`) into readable Unicode. Without this the math is
 * either lost (MathJax SVG in the HTML body) or shows as raw `$...$`.
 * Ported from ascend-backend/src/services/scraper.js to keep the two backends
 * in sync — the fix originally landed only in ascend, but production
 * /lumora/coding hits THIS backend, so HackerRank silently fell back to a raw
 * HTML fetch that Cloudflare 403s from Railway. See fetchHackerRankProblem.
 */
function latexToText(s) {
  if (!s || typeof s !== 'string') return '';
  let t = s;
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$]*)\$/g, '$1');
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$1').replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  const SYMBOLS = [
    [/\\leq\b/g, '≤'], [/\\le\b/g, '≤'], [/\\geq\b/g, '≥'], [/\\ge\b/g, '≥'],
    [/\\neq\b/g, '≠'], [/\\ne\b/g, '≠'], [/\\lt\b/g, '<'], [/\\gt\b/g, '>'],
    [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\div\b/g, '÷'], [/\\pm\b/g, '±'],
    [/\\ldots\b/g, '…'], [/\\dots\b/g, '…'], [/\\cdots\b/g, '…'], [/\\infty\b/g, '∞'],
    [/\\rightarrow\b/g, '→'], [/\\to\b/g, '→'], [/\\leftarrow\b/g, '←'],
    [/\\Rightarrow\b/g, '⇒'], [/\\sum\b/g, '∑'], [/\\prod\b/g, '∏'], [/\\sqrt\b/g, '√'],
    [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'], [/\\theta\b/g, 'θ'],
    [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'], [/\\pi\b/g, 'π'], [/\\mod\b/g, 'mod'],
    [/\\%/g, '%'], [/\\\$/g, '$'], [/\\&/g, '&'], [/\\_/g, '_'], [/\\#/g, '#'],
    [/\\,/g, ' '], [/\\;/g, ' '], [/\\:/g, ' '], [/\\!/g, ''], [/\\ /g, ' '],
  ];
  for (const [re, rep] of SYMBOLS) t = t.replace(re, rep);
  t = t.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  t = t.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '_$1');
  t = t.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1').replace(/\\[a-zA-Z]+/g, '');
  t = t.replace(/[{}]/g, '');
  return t;
}

/**
 * Fetch a HackerRank challenge via its REST API instead of scraping the page.
 * The problem page is a Cloudflare-guarded React SPA that 403s from datacenter
 * IPs (like Railway) and renders math as MathJax SVG (no text nodes), so a raw
 * HTML fetch either fails outright or drops every variable/number. The REST
 * payload returns clean, LaTeX-bearing JSON. Returns null when the URL isn't a
 * challenge or the payload lacks a statement (caller then falls through).
 */
async function fetchHackerRankProblem(url, lang) {
  const m = url.match(/hackerrank\.com\/(?:contests\/([^/]+)\/)?challenges\/([^/?#]+)/i);
  if (!m) return null;
  const contest = m[1] || 'master';
  const slug = m[2];
  const restUrl = `https://www.hackerrank.com/rest/contests/${contest}/challenges/${slug}`;
  const resp = await fetch(restUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HackerRank REST returned ${resp.status}`);
  const json = await resp.json();
  const d = json?.model || json;
  if (!d || typeof d.problem_statement !== 'string') return null;

  const parts = [];
  if (d.name) parts.push(String(d.name));
  parts.push(latexToText(d.problem_statement));
  if (d.input_format) parts.push('Input Format\n' + latexToText(d.input_format));
  if (d.constraints) parts.push('Constraints\n' + latexToText(d.constraints));
  if (d.output_format) parts.push('Output Format\n' + latexToText(d.output_format));

  const text = parts.join('\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text || text.length < 40) return null;
  // The same REST model carries the editor stub per language as `<prefix>_template`
  // (python3_template, java_template…). Extract it so the URL path preserves the
  // platform harness exactly like the screenshot/OCR path does.
  return { problem: text, starterCode: pickHackerRankTemplate(d, lang) };
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) { const n = parseInt(ip.split('.')[1], 10); if (n >= 16 && n <= 31) return true; }
  if (ip.startsWith('100.')) { const n = parseInt(ip.split('.')[1], 10); if (n >= 64 && n <= 127) return true; }
  if (ip === '0.0.0.0') return true;
  if (ip.startsWith('::ffff:')) return isPrivateIp(ip.slice(7));
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
  if (ip.toLowerCase().startsWith('fe80:')) return true;
  return false;
}
async function assertPublicHost(rawUrl) {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('blocked: bad protocol');
  let addrs;
  try { addrs = await dns.lookup(parsed.hostname, { all: true }); } catch { throw new Error('blocked: dns'); }
  for (const a of addrs) { if (isPrivateIp(a.address)) throw new Error('blocked: private ip'); }
}

router.post('/fetch-problem', authenticate, async (req, res) => {
  try {
    const { url, language } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try { await assertPublicHost(url); } catch { return res.status(400).json({ error: 'URL is not allowed.' }); }

    if (!isProblemPageUrl(url)) {
      return res.status(422).json({ error: 'not_a_problem_page', detail: 'This URL is not a single coding-problem page (looks like a landing or list page). Open a specific problem, or screenshot it.' });
    }

    // LeetCode SPAs need the GraphQL path — raw fetch returns no content.
    // Failures here fall through to the generic fetch below (e.g. premium problems
    // that aren't accessible via GraphQL may still have a readable HTML page).
    let lcProblem = null;
    let lcError = null;
    try {
      lcProblem = await fetchLeetcodeProblem(url, language);
    } catch (e) {
      lcError = e.message;
      console.warn('fetchLeetcodeProblem failed:', e.message);
    }
    if (lcProblem) {
      return res.json({ problem: lcProblem.problem, starter_code: lcProblem.starterCode || null, source: url });
    }
    // For a LeetCode URL the raw-HTML fallback below never works (SPA shell),
    // so don't mask the real failure with a generic "empty page" error —
    // surface the actual GraphQL error. A 403/429 here means this server's IP
    // is being rate-limited/blocked by LeetCode (common on datacenter IPs).
    if (/leetcode\.(?:com|cn)\/problems\//i.test(url)) {
      const hint = /\b(403|429)\b/.test(lcError || '')
        ? 'LeetCode is rate-limiting this server. Use the screenshot or copy-paste option instead.'
        : `Could not fetch the LeetCode problem${lcError ? ` (${lcError})` : ''}. Try screenshot or copy-paste.`;
      return res.status(502).json({ error: hint });
    }

    // HackerRank is a Cloudflare-guarded SPA — the raw HTML fetch below 403s
    // from Railway's datacenter IP and renders math as MathJax SVG. Its REST
    // API returns clean JSON, so try that FIRST (before the raw fetch can
    // throw on a 403). Failures fall through to the generic fetch below.
    if (/hackerrank\.com/i.test(url)) {
      let hrProblem = null;
      try {
        hrProblem = await fetchHackerRankProblem(url, language);
      } catch (e) {
        console.warn('fetchHackerRankProblem failed, falling back to raw fetch:', e.message);
      }
      if (hrProblem) {
        return res.json({ problem: hrProblem.problem, starter_code: hrProblem.starterCode || null, source: url });
      }
    }

    // A session page (CoderPad room, CodeSignal interview, Glider test) exists only
    // inside the candidate's authenticated session. The generic fetch below would
    // succeed at the HTTP level and return a sign-in page, which then gets served as
    // if it were the problem. Say what happened instead.
    if (isProblemPageUrl(url) && !isAutoFetchableUrl(url)) {
      return res.status(422).json({
        error: 'That page can only be read while signed in as you — a fetch from our server '
             + 'reaches the sign-in screen, not the problem. Paste the problem text, or use '
             + 'the desktop app to capture it from the screen.',
        code: 'SESSION_PAGE',
      });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Camora/1.0)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);

    const html = await response.text();

    // Extract problem text — strip HTML tags, get main content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000); // Limit to 5000 chars

    if (!textContent || textContent.length < 20) {
      throw new Error('Page is JavaScript-rendered or empty — try Capture (screenshot) instead.');
    }

    // Use Claude to clean and extract just the problem description (optional step)
    let problem = textContent.slice(0, 2000);
    try {
      const extractResult = await geminiGetModel('').generateContent(`Extract ONLY the coding problem description from this text. Return just the problem statement, constraints, and examples. No solutions.\n\n${textContent}`);
      problem = extractResult.response.text() || problem;
    } catch (claudeErr) {
      console.warn('[fetch-problem] Claude unavailable, returning raw text:', claudeErr.message?.slice(0, 120));
    }
    // Generic HTML scrape: the code editor is JS-rendered, so no starter here.
    res.json({ problem, starter_code: null, source: url });
  } catch (err) {
    console.error('fetch-problem error:', err.message);
    const msg = isApiExhaustedError(err)
      ? 'AI service is at capacity. Please try again in a moment.'
      : (err.message || 'Failed to fetch problem');
    res.status(400).json({ error: msg });
  }
});

/* ── POST /extract-from-image — OCR a problem from an uploaded image ──
   Frontend IMAGE tab (Coding + Design) uploads a file via multipart
   FormData. Same OCR pipeline; accepts a multipart upload so the user
   can drag-drop a file or paste from clipboard.

   Body: multipart, field "image" = the image file (jpeg/png/webp).
   Returns: { problem: string, kind: 'coding' | 'design' }. */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function detectLangFromCode(code) {
  if (!code) return null;
  if (/^\s*FROM\s+\S+/m.test(code) || /^\s*(RUN|COPY|ENV|EXPOSE|CMD|ENTRYPOINT|ARG|LABEL)\s+/m.test(code)) return 'docker';
  if (/^#!\s*\/usr\/bin\/env\s+bash|^#!\s*\/bin\/bash|^#!\s*\/bin\/sh\b/m.test(code)) return 'bash';
  if (/^#!\s*\/usr\/bin\/env\s+python|^#!\s*\/usr\/bin\/python/m.test(code)) return 'python';
  if (/^#!\s*\/usr\/bin\/env\s+ruby|^#!\s*\/usr\/bin\/ruby/m.test(code)) return 'ruby';
  if (/^#!\s*\/usr\/bin\/env\s+perl/m.test(code)) return 'perl';
  if (/^#!\s*\/usr\/bin\/env\s+node/m.test(code)) return 'javascript';
  if (/\bpublic\s+class\b/.test(code) && /\bSystem\.out\b/.test(code)) return 'java';
  if (/#include\s*<(iostream|vector|string|algorithm)>/.test(code)) return 'cpp';
  if (/#include\s*<(stdio|stdlib)\.h>/.test(code) && !/class\b/.test(code)) return 'c';
  if (/^package\s+main\b/m.test(code) && /\bfmt\b/.test(code)) return 'go';
  if (/^<\?php/m.test(code)) return 'php';
  if (/^fn\s+main\s*\(\)/m.test(code) || /^\s*use\s+std::/m.test(code)) return 'rust';
  if (/^fun\s+main\s*\(/m.test(code) || /\bprintln!\(/.test(code)) return 'kotlin';
  return null;
}

router.post('/extract-from-image', authenticate, checkUsage('questions'), imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded (expected multipart field "image")' });
    }
    let mediaType = req.file.mimetype && /^image\/(jpeg|png|webp)$/.test(req.file.mimetype)
      ? req.file.mimetype
      : 'image/jpeg';
    let data = req.file.buffer.toString('base64');
    ({ mediaType, data } = await ensureImageWithinAnthropicLimit(data, mediaType));
    const kind = (req.body?.kind === 'design') ? 'design' : 'coding';
    const isDesign = kind === 'design';
    const subject = isDesign ? 'SYSTEM DESIGN interview question' : 'CODING interview problem';

    const prompt = `You are an OCR engine analyzing a ${subject} screenshot from a coding interview platform (HackerRank, LeetCode, CoderPad, etc.). Return ONLY valid JSON with exactly these four fields and nothing else:

{
  "problem": "<verbatim problem statement — title, description, constraints, input/output format, examples. Preserve all formatting and line breaks. Return the string NO_PROBLEM_FOUND if no problem text is visible>",
  "starter_code": "<verbatim starter/template code from the code editor panel, preserving exact indentation, function names, shebang lines, input-reading boilerplate, and wrapper calls — EVERYTHING visible in the editor. This is the exact code skeleton the candidate must fill in. Return null if no code editor is visible>",
  "detected_language": "<programming language detected from the code editor — e.g. 'python', 'java', 'cpp', 'javascript', 'bash', 'go', 'ruby', 'rust', 'typescript', 'kotlin', 'scala', 'swift'. Identify from syntax, keywords, shebang, import style. Return null if no code visible>",
  "task": "<what this screen is ASKING the candidate to do — one of 'review', 'complete', 'solve', 'explain'>"
}

Critical rules:
- "problem": left panel or top section. Transcribe verbatim — title, description, constraints, examples. Never solve or paraphrase.
- "starter_code": right panel or bottom editor. Copy EVERY line in the editor verbatim — shebang, imports, class declarations, function stubs with their EXACT names, input-reading (scanf/readline/input/sys.stdin), print statements, wrapper calls at the bottom. null only if no editor is visible at all.
- "detected_language": look at the code syntax, not just shebangs — Python is recognizable from def/import/if __name__, Java from public class/System.out, etc.
- "task" — pick exactly one, in this priority order:
${CLASSIFIER_SPEC}
- Return ONLY valid JSON. No preamble, no explanation, no markdown fences.
- NEVER describe the image — output JSON only.`;

    let rawText = '';
    try {
      const visionResult = await geminiGetModel('').generateContent([
        prompt,
        { inlineData: { mimeType: mediaType, data } },
      ]);
      rawText = visionResult.response.text().trim();
    } catch (claudeErr) {
      throw claudeErr;
    }
    console.log(`[extract-from-image] imgBytes=${req.file.buffer.length} rawText=${rawText.slice(0, 400)}`);

    let problem = 'NO_PROBLEM_FOUND';
    let starterCode = null;
    let parsed = null;
    try {
      // Strip markdown fences if model wrapped in ```json ... ```
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(jsonText);
      problem = (parsed.problem || 'NO_PROBLEM_FOUND').trim();
      starterCode = parsed.starter_code || null;
    } catch {
      // Fallback: Claude returned raw text instead of JSON
      problem = rawText;
    }

    if (/^(i (can|see|notice|cannot|don[''']?t)\b|the (screenshot|image|window) (shows|appears|seems|is)|it (looks|seems|appears)|sorry|unfortunately|i'?m unable)/i.test(problem)) {
      problem = 'NO_PROBLEM_FOUND';
    }
    // A capture of JUST CODE — "review this for bugs", "explain this", "finish
    // this stub" — has no problem statement by definition. Failing the whole
    // request here threw away the starter_code we had already read correctly,
    // so every code-only snap died with a 422 and nothing could act on it.
    // Only fail when the image yielded NOTHING usable.
    const hasProblem = problem && problem !== 'NO_PROBLEM_FOUND';
    const hasCode = !!(starterCode && String(starterCode).trim());
    if (!hasProblem && !hasCode) {
      return res.status(422).json({ detail: 'Could not read anything from this image — no problem statement and no code. Snap the problem panel or the editor and try again.' });
    }
    if (!hasProblem) problem = '';
    // Prefer Claude's vision-based language detection, but validate it against
    // the supported list. Normalize known aliases: 'dockerfile' → 'docker',
    // 'makefile'/'plaintext'/etc. get filtered out as hallucinations.
    const rawVisionLang = parsed?.detected_language?.toLowerCase()?.trim() || null;
    const normalizedVisionLang = rawVisionLang === 'dockerfile' ? 'docker' : rawVisionLang;
    const visionLang = normalizedVisionLang && SUPPORTED_LANGUAGES.includes(normalizedVisionLang) ? normalizedVisionLang : null;
    const regexLang = detectLangFromCode(starterCode);
    const detectedLanguage = visionLang || regexLang;
    // What the screen is asking for, so the client can act on the snap
    // immediately instead of dropping a thumbnail and waiting for a click.
    // Fall back on the shape of what we extracted when the model omits it.
    // The fallback must never GUESS 'review'. 'review' is the one verdict the
    // client acts on by leaving the Coding tab, so inferring it from "there was
    // code in the editor" turned every screenshot the model failed to classify
    // — which is every screenshot of a platform with a starter template — into
    // a code review the user never asked for. An unclassified capture with code
    // in it is a template to finish; only the model saying so makes it a review.
    const VALID_TASKS = ['review', 'complete', 'solve', 'explain'];
    const rawTask = parsed?.task?.toLowerCase?.()?.trim() || null;
    const task = VALID_TASKS.includes(rawTask)
      ? rawTask
      : (starterCode && starterCode.trim() ? 'complete' : 'solve');
    console.log(`[extract-from-image] lang_vision_raw=${rawVisionLang} lang_vision_valid=${visionLang} lang_regex=${regexLang} final=${detectedLanguage} task_raw=${rawTask} task=${task}`);
    res.json({ problem, starter_code: starterCode, kind, detected_language: detectedLanguage, task });
  } catch (err) {
    console.error('extract-from-image error:', err?.message || err);
    const exhausted = isApiExhaustedError(err);
    const status = exhausted ? 503 : (err?.status || err?.statusCode || 500);
    const detail = exhausted
      ? 'AI service is at capacity. Please try again in a moment.'
      : 'Image extraction failed';
    res.status(status).json({ detail });
  }
});

// POST /api/v1/coding/construct-from-images — build a full problem statement from up to 5 screenshots
// Accepts multipart with field "images" (up to 5 files) and optional body field "kind" (coding|design).
// Returns same shape as extract-from-image so callers can populate problemText identically.
router.post('/construct-from-images', authenticate, checkUsage('questions'), imageUpload.array('images', 5), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No images uploaded (expected multipart field "images")' });
  }
  const kind = (req.body?.kind || 'coding').trim();

  const geminiParts = ['You extract interview problems from screenshots. Return valid JSON only, no prose.'];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const rawMediaType = f.mimetype.startsWith('image/') ? f.mimetype : 'image/png';
    // ensureImageWithinAnthropicLimit returns an OBJECT { mediaType, data }
    // (see the call at ~2794). Destructuring it as an array threw
    // "(intermediate value) is not iterable" on EVERY multi-page capture,
    // crashing construct-from-images → empty problem → dead Generate button.
    const { mediaType: resizedType, data: resizedData } = await ensureImageWithinAnthropicLimit(
      f.buffer.toString('base64'), rawMediaType
    );
    if (i > 0) geminiParts.push(`--- Page ${i + 1} ---`);
    geminiParts.push({ inlineData: { mimeType: resizedType, data: resizedData } });
  }

  const isDesign = kind === 'design';
  geminiParts.push(isDesign
    ? 'These screenshots show a system design interview problem (possibly across multiple pages/scrolls). Construct the complete problem statement by combining all pages into one coherent description. Return ONLY valid JSON: {"problem": "full problem statement"}'
    : 'These screenshots show a coding interview problem (possibly across multiple pages/scrolls). Construct the complete problem statement by combining all pages. Include constraints, examples, and starter code if visible. Return ONLY valid JSON: {"problem": "full problem statement", "starter_code": "code or null", "detected_language": "python|java|javascript|etc or null"}');

  try {
    const constructResult = await geminiGetModel('').generateContent(geminiParts);
    const raw = constructResult.response.text().trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    const problem = parsed?.problem || raw || '(could not extract problem)';
    if (isDesign) return res.json({ problem });
    const starterCode = parsed?.starter_code || null;
    const rawLang = (parsed?.detected_language || '').toLowerCase().trim();
    const detectedLanguage = SUPPORTED_LANGUAGES.includes(rawLang) ? rawLang : detectLangFromCode(starterCode || '');
    return res.json({ problem, starter_code: starterCode, detected_language: detectedLanguage });
  } catch (err) {
    console.error('construct-from-images error:', err?.message || err);
    const exhausted = isApiExhaustedError(err);
    return res.status(exhausted ? 503 : 500).json({
      detail: exhausted ? 'AI service at capacity. Try again in a moment.' : 'Image construction failed',
    });
  }
});

// POST /api/v1/coding/analyze — problem statement + test cases + beginner walkthrough
router.post('/analyze', authenticate, async (req, res) => {
  const { code, language = 'python' } = req.body;
  if (!code?.trim() || code.trim().length < 15) {
    return res.status(400).json({ error: 'Code too short' });
  }

  const prompt = `You are a beginner-friendly coding tutor. Analyze this ${language} code and return structured JSON.

\`\`\`${language}
${code.slice(0, 3000)}
\`\`\`

Return ONLY this JSON (no markdown fences, no extra text):
{
  "title": "5-8 word problem title",
  "problem": "2-3 sentence plain-English description of what this code solves",
  "input_format": "describe the inputs in simple terms",
  "output_format": "describe what the function returns",
  "examples": [
    {"input": "function_name(arg1, arg2)", "output": "result", "explanation": "why this output"}
  ],
  "test_cases": [
    {"input": "print(function_name(val))", "expected": "result"}
  ],
  "steps": [
    {"code": "line or short block", "text": "plain English for someone who has never coded"}
  ],
  "concepts": ["concept name"]
}

Rules:
- examples: 2-3 with varied inputs. examples[].output MUST be the EXACT value the code returns/prints for that input — mentally EXECUTE the code to derive it. Never blank, never a placeholder, never approximate. examples[].explanation says WHY that output.
- test_cases: 3-5 covering normal + edge cases (empty, zero, negative, boundary). CRITICAL: test_cases[].input MUST be a complete runnable ${language} statement — always wrap in print() e.g. print(function_name(arg)). Never put raw arguments or keyword assignments.
- test_cases[].expected — REQUIRED and MUST be the EXACT stdout that input prints. Trace the code line-by-line to compute the real value; NEVER leave it empty, a placeholder like "result", or a guess. If you cannot determine the exact output with certainty, DROP that test case rather than emit a blank or wrong expected.
- steps: walk through each key line/block explaining what it does like the reader is brand new to programming
- concepts: list ${language} concepts used that a beginner should learn (e.g. "for loops", "if statements", "dictionaries", "return values")
- Keep steps concise — no more than 8 steps total`;

  function parseAnalyzeResponse(raw) {
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON in response');
    try {
      return JSON.parse(match[0]);
    } catch {
      const truncFixed = match[0].replace(/,\s*$/, '').replace(/\[\s*$/, '[]').replace(/\{\s*$/, '{}') + '}';
      return JSON.parse(truncFixed);
    }
  }

  try {
    const analyzeResult = await geminiGetModel('').generateContent(prompt);
    const raw = analyzeResult.response.text().trim();
    return res.json(parseAnalyzeResponse(raw));
  } catch (err) {
    const analyzeFallbacks = getFallbackProviders();
    if (analyzeFallbacks.length > 0) {
      console.warn('[analyze] Anthropic failed — trying fallback providers:', err.message);
      for (const provider of analyzeFallbacks) {
        try {
          const resp = await provider.client.chat.completions.create({
            model: provider.model,
            max_tokens: 2500,
            messages: [{ role: 'user', content: prompt }],
          });
          const raw = (resp.choices[0]?.message?.content || '').trim();
          console.log(`[analyze] ${provider.label} fallback succeeded`);
          return res.json(parseAnalyzeResponse(raw));
        } catch (fbErr) {
          console.warn(`[analyze] ${provider.label} fallback failed:`, fbErr.message);
        }
      }
    }
    console.error('[analyze]', err?.message);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// True only when `raw` is a SINGLE coding-problem page — not a landing page, a
// problem LIST, a dashboard, or an unknown page. Strict allowlist: anything not
// explicitly recognized returns false, so auto-scrape never fires on junk.
//
// Mirror of the frontend copy in apps/camora/src/lib/problemPageUrl.ts. Keep
// the two in sync; both are covered by the same ALLOW/BLOCK test cases.
function isProblemPageUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  let u;
  try { u = new URL(raw); } catch { return false; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname.replace(/\/+$/, '');
  if (/(^|\.)leetcode\.(com|cn)$/.test(host)) return /^\/problems\/[^/]+/.test(path);
  if (/(^|\.)hackerrank\.com$/.test(host)) return /\/challenges\/[^/]+/.test(path);
  if (/(^|\.)coderpad\.io$/.test(host)) {
    const seg = path.split('/').filter(Boolean);
    if (seg.length === 0) return false;
    const MARKETING = new Set(['pricing','resources','blog','login','signup','dashboard','questions','question-bank','company','about','careers','contact','product','solutions','customers','terms','privacy']);
    const first = seg[0].toLowerCase();
    if (MARKETING.has(first)) return false;
    return first === 'sandbox' || /^[a-z0-9]{5,}$/i.test(seg[0]);
  }
  if (/(^|\.)codesignal\.com$/.test(host)) return /^\/(interview|test|challenge|coding|assessment)\//.test(path);
  if (/(^|\.)glider\.ai$/.test(host)) return /^\/(test|assessment|oa|invite)\//.test(path);
  return false;
}

/**
 * True when this URL can actually be FETCHED server-side, not merely recognised.
 *
 * Only LeetCode (/problems/, via GraphQL) and HackerRank (/challenges/, via the
 * public REST endpoint) have real scrapers. CoderPad rooms, CodeSignal interviews
 * and Glider tests are per-candidate session pages: the generic fetch below reaches
 * a sign-in screen, never the problem. Mirror of isAutoFetchableUrl in
 * apps/camora/src/lib/problemPageUrl.ts — keep the two in sync.
 */
export function isAutoFetchableUrl(raw) {
  if (!isProblemPageUrl(raw)) return false;
  let u;
  try { u = new URL(raw); } catch { return false; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  return /(^|\.)leetcode\.(com|cn)$/.test(host) || /(^|\.)hackerrank\.com$/.test(host);
}

export default router;
// Exported for unit testing the CoFix output sanitizer.
export { stripInjectedComments, remapLine, remapLineRef, sanitizeCofixResult };
// Exported for unit testing the URL-fetch starter-code extraction.
export { langCandidates, pickHackerRankTemplate, pickLeetcodeSnippet };
export { detectPlatformTemplate, templateHasFillableFunction, isMinimalInlineTemplate, buildTemplateShapeDirective, buildCodingSystemPrompt };
export { hasStdinEvidence, hasExampleEvidence, inferIoContract, inferInputTrust };
export { isProblemPageUrl };
export { dedupeSolutions, solutionSkeleton };
export { looksLikeCodeToReview, buildDiagnoseSolvePrompt };

