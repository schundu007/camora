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
import multer from 'multer';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dns from 'node:dns/promises';

// Lazy-load sharp. The native binary fails to resolve on some Railway
// build images (linux-x64 vs darwin-arm64 mismatch in the lockfile),
// which used to crash the whole backend at boot. Resolve at first use
// instead so an image-rescale failure becomes a per-request degrade
// rather than a process-wide outage. ensureImageWithinAnthropicLimit
// returns the original payload unchanged if sharp can't be loaded.
let _sharpModule = null;
let _sharpLoadFailed = false;
async function loadSharp() {
  if (_sharpLoadFailed) return null;
  if (_sharpModule) return _sharpModule;
  try {
    const mod = await import('sharp');
    _sharpModule = mod.default || mod;
    return _sharpModule;
  } catch (err) {
    console.warn('[coding] sharp unavailable — skipping image resize. Reason:', err?.message || err);
    _sharpLoadFailed = true;
    return null;
  }
}

/* ── Anthropic image-size guard ────────────────────────────────────────
   Anthropic's vision API caps inline base64 images at 5 MB
   (5,242,880 bytes of base64 payload). Native macOS screencapture on
   HiDPI displays produces 4–8 MB PNGs that exceed this. Downscale via
   sharp until under the cap; prefer PNG for OCR sharpness, fall back
   to JPEG q85 if the image is still too large after resizing.

   Returns { mediaType, data } where data is a base64 string. */
async function ensureImageWithinAnthropicLimit(rawBase64, mediaType) {
  const MAX_BASE64 = 4_800_000; // safety margin under the 5 MB ceiling
  if (rawBase64.length <= MAX_BASE64) return { mediaType, data: rawBase64 };

  const sharp = await loadSharp();
  if (!sharp) {
    // Sharp unavailable — throwing here is intentional. Passing the oversized
    // image through always produces a 400 from Anthropic ("exceeds 5 MB").
    // A clear 413 from us is more actionable than a cryptic Anthropic error.
    throw Object.assign(new Error('Image too large (>5 MB) and server-side resize is unavailable. Use a smaller screenshot or the Snap button in the desktop app.'), { statusCode: 413 });
  }

  let buf = Buffer.from(rawBase64, 'base64');
  // First pass: cap width at 1920px (still plenty for OCR on Sonnet 4.5).
  let resized = await sharp(buf)
    .resize({ width: 1920, withoutEnlargement: true, fit: 'inside' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  let b64 = resized.toString('base64');
  if (b64.length <= MAX_BASE64) return { mediaType: 'image/png', data: b64 };

  // Second pass: re-encode at 1600px JPEG quality 85.
  resized = await sharp(buf)
    .resize({ width: 1600, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  b64 = resized.toString('base64');
  if (b64.length <= MAX_BASE64) return { mediaType: 'image/jpeg', data: b64 };

  // Third pass: aggressive 1280px JPEG q75 — last resort.
  resized = await sharp(buf)
    .resize({ width: 1280, withoutEnlargement: true, fit: 'inside' })
    .jpeg({ quality: 75, progressive: true })
    .toBuffer();
  return { mediaType: 'image/jpeg', data: resized.toString('base64') };
}
import { getApiKey } from '../services/adminConfig.js';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkUsage } from '../middleware/usageLimits.js';
import { executeCode } from '../services/codeRunner.js';
import { buildAnswerCacheKey, cacheGet, cacheSet, logCacheEvent } from '../services/answerCache.js';
import { retrieveExemplars, formatExemplars } from '../services/codingKnowledge.js';

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

function geminiGetModel(systemInstruction) {
  return getGeminiClient().getGenerativeModel({
    model: GEMINI_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
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
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
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
  if (getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) list.push('gemini');
  if (getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY) list.push('anthropic');
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
      const gModel = geminiGetModel(systemPrompt);
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
      return { raw: chunks.join(''), model: GEMINI_MODEL };
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
      });
      for await (const event of stream) {
        if (isAborted()) break;
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const token = event.delta.text;
          if (token) { chunks.push(token); onToken(token); }
        }
      }
      return { raw: chunks.join(''), model: ANTHROPIC_MODEL };
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
        messages: oaiMsgs,
      });
      for await (const chunk of stream) {
        if (isAborted()) break;
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (token) { chunks.push(token); onToken(token); }
      }
      return { raw: chunks.join(''), model: 'deepseek/deepseek-chat-v3-0324' };
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
      const gModel = geminiGetModel(systemPrompt);
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
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS_CODING || '16000', 10);
const FREE_TIER_DAILY_LIMIT = parseInt(process.env.FREE_CODING_DAILY_LIMIT || '2', 10);

// ── Reliability config ────────────────────────────────────────────────
//
// Live interviews can't tolerate a failed solve. The /solve handler
// therefore performs automatic recovery *before* surfacing any error:
//
//   1. Transient transport errors (529 overloaded / 503 / network / timeout):
//      retry the stream up to CLAUDE_MAX_TRANSPORT_RETRIES times with
//      500 ms + 1500 ms back-off. User never sees a 529.
//
//   2. Stream completes but output is empty or not parseable as JSON:
//      re-issue the request ONCE in non-streaming mode with a stricter
//      "return ONLY valid JSON, no prose" reminder prepended. The JSON
//      extractor already tolerates truncation via brace stitching, so
//      this second pass covers the remaining "model prefixed prose"
//      and "model stopped mid-field" cases.
//
//   3. If the strict-reminder retry *also* fails to parse, fall back
//      to the other tier model (Sonnet <-> Haiku) for one final
//      non-streaming attempt. Better a slightly weaker answer than
//      no answer on interview day.
//
// Backoff is intentionally tight so the whole recovery path stays
// within the ~15 s hard budget (8 s happy path + up to 7 s recovery).
const CLAUDE_MAX_TRANSPORT_RETRIES = 2;
const CLAUDE_TRANSPORT_BACKOFFS_MS = [500, 1500]; // per reinforcement note
const FALLBACK_MODEL_PAID = 'claude-haiku-4-5-20251001';
const FALLBACK_MODEL_FREE = 'claude-sonnet-4-6';

function isRetryableClaudeError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || err?.response?.status;
  if (status === 529 || status === 503 || status === 502 || status === 504 || status === 429) return true;
  const msg = (err.message || '').toLowerCase();
  return /overloaded|timeout|timed out|econnreset|fetch failed|socket hang up|network/.test(msg);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
function buildCodingSystemPrompt(language, systemContext, starterCode, forceSingle = false) {
  // Bash problems on HackerRank always supply a starter template (function
  // stub + wrapper call). Even when OCR misses it, multiple "approaches"
  // for bash don't make sense — there's one right implementation.
  const singleSolution = forceSingle || !!starterCode || language === 'bash';
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

MANDATORY REASONING SEQUENCE — do this in your head before writing any code:

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
${starterCode ? `\n##############################################################################\n# STARTER CODE — THIS IS THE EXACT TEMPLATE FROM THE PLATFORM\n##############################################################################\nThe interview platform provides this exact starter code. Your solution MUST use\nthis as the base. DO NOT change function names, wrapper calls, input-reading\nlines, or surrounding boilerplate. ONLY fill in the missing implementation.\n\n\`\`\`${language}\n${starterCode}\n\`\`\`\n\nYour single solution must follow this exact structure — return only 1 solution in the solutions array.\n` : ''}

##############################################################################
# RULE #3: CODE STRUCTURE
##############################################################################
${starterCode
  ? `STARTER CODE IS PRESENT.

STEP 1 — Read the problem description AND examples. Determine EXACTLY what to compute (count what? sum what? output what format?).
STEP 2 — Fill in the function body that produces that output for the given inputs.
STEP 3 — Mentally trace on example[0]: confirm your output matches expected.

BASH RULES:
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
       Solution 3 = Most Optimal / Clever (what top candidates present)`}

Respond with valid JSON in EXACTLY this format (no text before/after):
{
  "language": "${language}",
  "solutions": ${singleSolution
  ? `[
    {
      "name": "Approach name",
      "patternTag": "Canonical pattern tag — MUST be one of: Two Pointers, Sliding Window, Fast & Slow Pointers, Hash Map, Hash Set, Binary Search, BFS, DFS, Topological Sort, Union-Find, DP - Memoization, DP - Tabulation, Greedy, Backtracking, Heap, Priority Queue, Trie, Bit Manipulation, Divide & Conquer, Monotonic Stack, Monotonic Queue, Matrix Traversal, Linked List, Prefix Sum, Math, Simulation, Brute Force. Pick the single most accurate tag for THIS solution.",
      "approach": "Brief 1-2 sentence description of HOW this approach works",
      "code": "complete runnable code with \\n for newlines",
      "complexity": { "time": "O(...)", "space": "O(...)" },
      "narration": "First-person spoken script the candidate can read ALOUD to the interviewer. 4-6 sentences. Natural speaking tone (contractions OK). Structure: hook → core insight → walk through the approach → complexity note. NO markdown, NO code blocks, NO bullet points — just plain conversational prose.",
      "trace": [
        {"step": 1, "action": "Short description of what happens this step", "state": "variable=value, array=[...], counter=0"}
      ],
      "explanations": [
        {"line": 1, "code": "first line", "explanation": "PLAIN TEXT explanation"}
      ]
    }
  ]`
  : `[
    {
      "name": "Approach name (e.g. Brute Force, Hash Map, Two Pointers)",
      "patternTag": "Canonical pattern tag — MUST be one of: Two Pointers, Sliding Window, Fast & Slow Pointers, Hash Map, Hash Set, Binary Search, BFS, DFS, Topological Sort, Union-Find, DP - Memoization, DP - Tabulation, Greedy, Backtracking, Heap, Priority Queue, Trie, Bit Manipulation, Divide & Conquer, Monotonic Stack, Monotonic Queue, Matrix Traversal, Linked List, Prefix Sum, Math, Simulation, Brute Force. Pick the single most accurate tag for THIS solution.",
      "approach": "Brief 1-2 sentence description of HOW this approach works",
      "code": "complete runnable code for this approach with \\n for newlines",
      "complexity": { "time": "O(...)", "space": "O(...)" },
      "narration": "First-person spoken script the candidate can read ALOUD to the interviewer. 4-6 sentences. Natural speaking tone (contractions OK). Structure: hook → core insight → walk through the approach → complexity note. NO markdown, NO code blocks, NO bullet points — just plain conversational prose. Example: 'So my first instinct here is to brute-force it by comparing every pair — that's O(n squared). But we can do better: as I scan the array, I'll track values I've already seen in a hash map. For each element, I check if its complement — target minus current — is already in the map. That drops us to O(n) time with O(n) extra space for the map.'",
      "trace": [
        {"step": 1, "action": "Short description of what happens this step", "state": "variable=value, array=[...], counter=0"}
      ],
      "explanations": [
        {"line": 1, "code": "first line", "explanation": "PLAIN TEXT explanation"}
      ]
    },
    {
      "name": "Second approach name",
      "patternTag": "Canonical pattern tag from the list above",
      "approach": "Brief description",
      "code": "complete runnable code for second approach",
      "complexity": { "time": "O(...)", "space": "O(...)" },
      "narration": "First-person spoken script, 4-6 sentences, conversational prose",
      "explanations": [
        {"line": 1, "code": "first line", "explanation": "PLAIN TEXT explanation"}
      ]
    },
    {
      "name": "Third approach name (most optimal)",
      "patternTag": "Canonical pattern tag from the list above",
      "approach": "Brief description",
      "code": "complete runnable code for third approach",
      "complexity": { "time": "O(...)", "space": "O(...)" },
      "narration": "First-person spoken script, 4-6 sentences, conversational prose",
      "explanations": [
        {"line": 1, "code": "first line", "explanation": "PLAIN TEXT explanation"}
      ]
    }
  ]`},
  "pitch": ${singleSolution
  ? `{
    "opener": "One sentence summary of the approach",
    "approach": "Brief explanation of the chosen strategy",
    "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"],
    "tradeoffs": ["Tradeoff 1", "Tradeoff 2"],
    "edgeCases": ["Edge case 1", "Edge case 2", "Edge case 3"]
  }`
  : `{
    "opener": "One sentence hook comparing the approaches",
    "approach": "Summary of the 3 approaches and why you'd pick each",
    "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"],
    "tradeoffs": ["Tradeoff between approach 1 vs 2", "Tradeoff between approach 2 vs 3"],
    "edgeCases": ["Edge case 1", "Edge case 2", "Edge case 3"]
  }`},
  "examples": [
    {"input": "nums = [2,7,11,15], target = 9", "expected": "[0, 1]"},
    {"input": "nums = [3,2,4], target = 6", "expected": "[1, 2]"}
  ]
}

Rules:
- ${singleSolution ? 'You MUST provide exactly 1 solution' : 'You MUST provide exactly 3 solutions with DIFFERENT approaches (e.g. brute force -> optimized -> most optimal)'}
- Each solution MUST have complete, runnable code — not pseudocode
- Each solution MUST have a patternTag from the canonical list above (pick the single most accurate one)
- Each solution MUST have a narration field — first-person spoken script the candidate will READ OUT LOUD during the interview (4-6 sentences, natural speech, no markdown)
- Each solution MUST have a trace field — 4-10 step-by-step dry-run entries showing variable state as the algorithm runs on examples[0]. Each step: { step: number, action: short verb phrase, state: key variables formatted as 'name=value' joined with commas }. No code in state, just names and values. Shows the candidate how to talk through the first test case at a whiteboard.
- Do NOT add comments in the code
- Do NOT add main blocks or hard-coded test calls
- ${singleSolution ? 'The pitch should explain the chosen approach and complexity' : 'The pitch should compare the 3 approaches conversationally'}
- Generate COMPLETE, RUNNABLE code that includes all necessary imports for each solution
- Examples must have exact input/output pairs
- ${singleSolution ? 'The 1 solution must produce correct output for the given examples' : 'ALL 3 solutions must produce correct output for the given examples'}
- Use the LATEST modern patterns and APIs for ${language}
- ${singleSolution ? '' : 'Order solutions from simplest (brute force) to most optimal'}`;
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

  // Strategy 1: strip markdown code fences and parse
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
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
  const fnRe = /def\s+(fetch|get|load|retrieve)\w*\s*\([^)]*\)\s*(?:->[^:]+)?:([\s\S]*?)(?=\ndef\s|\nclass\s|$)/gi;
  let m;
  while ((m = fnRe.exec(code)) !== null) {
    const body = m[2];
    const hasIO = /urllib|http\.client|urlopen|socket\.|requests\.|httpx\.|aiohttp\.|subprocess/.test(body);
    const hasStaticReturn = /return\s*[\[\(]/.test(body);
    if (hasStaticReturn && !hasIO) return true;
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
  const { problem, language, conversationHistory, system_context: systemContext, bypass_cache: bypassCache, starter_code: starterCode } = req.body;

  // ── Validate ────────────────────────────────────────────────────────────
  if (!problem || typeof problem !== 'string') {
    return res.status(400).json({ error: 'Missing required field: problem' });
  }
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Missing required field: language' });
  }

  const lang = language.toLowerCase();
  console.log(`[solve] lang=${lang} bypass=${!!bypassCache} starter=${starterCode ? starterCode.slice(0, 60).replace(/\n/g, '↵') : 'null'}`);
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
    route: 'solve',
    language: lang,
    model: getModelForUser(req),
    starterCode: starterCode || null,
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

  sendEvent('status', { state: 'write', msg: `Generating ${lang} solution...` });

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
  try {
    exemplarBlock = formatExemplars(await retrieveExemplars(problem, { k: 2 }));
  } catch { /* retrieval is best-effort */ }

  messages.push({
    role: 'user',
    content: `Solve this coding problem in ${lang}:\n\n${problem}${exemplarBlock}`,
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
  let anthropicExhausted = false; // true when Anthropic spending/quota limit hit
  let passTag = 'primary_stream';

  const systemPrompt = buildCodingSystemPrompt(lang, typeof systemContext === 'string' ? systemContext : undefined, starterCode || undefined, true);
  // Anthropic prompt cache — wraps the large coding system prompt as a
  // single ephemeral cache block. Subsequent /solve calls within the
  // 5-min TTL skip ~3-4k input tokens of re-tokenization, cutting
  // time-to-first-token by 200–500 ms in the steady state. Identical
  // pattern to services/claude.js:457. Per-request blocks are unchanged.
  const STRICT_JSON_REMINDER =
    'IMPORTANT: Your previous response could not be parsed. Return ONLY a single valid JSON object matching the schema above. No preamble, no markdown fences, no prose. Start with { and end with }. Every string must be properly closed. The "solutions" array must contain exactly 1 complete solution object.';

  const ANTI_CHEAT_REJECTION =
    'REJECTED — your solution cheated by returning hardcoded example data.\n\n' +
    'You did one of these forbidden things:\n' +
    '  • Created a _MOCK_* / MOCK_* / FAKE_* variable with hardcoded objects\n' +
    '  • Wrote fetch_prs / get_* that returns list(...) without calling urllib/http\n\n' +
    'The ONLY correct fetch pattern is:\n' +
    '  import urllib.request, json\n' +
    '  def fetch_prs(owner, repo):\n' +
    '      req = urllib.request.Request(f\'https://api.github.com/repos/{owner}/{repo}/pulls?state=all&per_page=100\', headers={\'Accept\': \'application/vnd.github+json\', \'User-Agent\': \'app\'})\n' +
    '      with urllib.request.urlopen(req) as r:\n' +
    '          return json.loads(r.read())\n\n' +
    'Write a real implementation now. Return ONLY the JSON object — no preamble.';

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
      const result = await streamWithProvider(
        provider, messages, systemPrompt,
        (token) => sendEvent('token', { t: token }),
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
      console.log(
        `[coding/solve] pass=primary_stream provider=${provider} model=${result.model} ok=true ` +
        `rawLen=${rawAnswer.length} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
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
    if (!parsedJson || (!parsedJson.code && !parsedJson.solutions)) {
      console.error(
        `[coding/solve] parse_failed pass=primary_stream rawLen=${rawAnswer.length} ` +
        `head=${JSON.stringify(truncateForLog(rawAnswer.slice(0, 1024), 1024))} tail=${JSON.stringify(truncateForLog(rawAnswer.slice(-1024), 1024))} ua=${JSON.stringify(userAgent)}`,
      );
      parsedJson = null;
    } else if (detectsHardcoding(getCodeFromParsed(parsedJson))) {
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
        `ok=${!!(fixParsed && (fixParsed.code || fixParsed.solutions))} ` +
        `rawLen=${fixRaw.length} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
      if (fixParsed && (fixParsed.code || fixParsed.solutions)) {
        if (detectsHardcoding(getCodeFromParsed(fixParsed))) {
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
    // Never surface raw Anthropic SDK error bodies (they contain 400 JSON blobs).
    // Show a human-readable message instead.
    let msg = terminalFailure?.msg || "Couldn't generate a solution. Please tap retry.";
    if (anthropicExhausted) {
      msg = 'AI service is at capacity right now. Tap Regenerate to retry — it will use a backup model.';
    } else if (msg.startsWith('4') && msg.includes('"type"')) {
      msg = "Couldn't generate a solution. Please tap retry.";
    }
    console.error(
      `[coding/solve] TERMINAL_FAILURE lang=${lang} model=${modelUsed} pass=${passTag} ` +
      `durMs=${latencyMs} category=${terminalFailure?.category || 'unknown'} exhausted=${anthropicExhausted} ua=${JSON.stringify(userAgent)}`,
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
  // Ensure code fields are strings
  if (parsedJson.code && typeof parsedJson.code !== 'string') {
    parsedJson.code = String(parsedJson.code);
  }
  for (const sol of parsedJson.solutions || []) {
    if (sol.code && typeof sol.code !== 'string') {
      sol.code = String(sol.code);
    }
  }
  // Set top-level code from first solution for backwards compat
  if (!parsedJson.code && parsedJson.solutions?.length) {
    parsedJson.code = parsedJson.solutions[0].code || '';
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
    const { code, language, test_cases: testCases } = req.body || {};

    if (!code || !language) {
      return res.status(400).json({ error: 'Missing code or language' });
    }
    if (typeof code !== 'string' || typeof language !== 'string') {
      return res.status(400).json({ error: 'code and language must be strings' });
    }

    // Hard 25s wall — Railway's edge proxy times out at ~30s; we must
    // beat it so the client gets a JSON error rather than a 502 HTML.
    const result = await Promise.race([
      executeCode(code, language, Array.isArray(testCases) ? testCases : []),
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
// POST /cofix/stream — CoFix: fix broken code, stream structured change annotations
// ---------------------------------------------------------------------------

router.post('/cofix/stream', authenticate, checkUsage('questions'), async (req, res) => {
  const { code, hint, language, company } = req.body;

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

  const cofixUserContent = `You are CoFix, a code repair specialist. Fix the ${lang} code below.${hintSection}${companySection}

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
      "note": "One sentence explaining why."
    }
  ],
  "complexity": { "time": "O(...)", "space": "O(...)" },
  "hackerrank_compatible": true | false,
  "walkthrough": [
    {
      "lines": "7",
      "context": "optional label like 'brute' or 'optimised' — omit if not relevant",
      "text": "First-person plain English the candidate says aloud. Reference variable names with backticks. Max 30 words."
    }
  ]
}

RULES:
- EXECUTION CONTRACT: this code is run by a test harness that parses each test
  Input into arguments, CALLS the top-level function, and compares its RETURN
  VALUE to the expected output. If the code reads stdin (input()/sys.stdin),
  prints its answer instead of returning it, or returns None, it is NOT
  harness-compatible — in that case you SHOULD restructure it into a clean
  function that takes the parsed inputs as PARAMETERS and RETURNS the answer,
  then set hackerrank_compatible:true. The "never restructure" rules below apply
  ONLY to code that is already harness-compatible and merely has a small bug.
- Fix ONLY what is factually broken (syntax error, wrong operator, off-by-one, missing return, undefined variable, etc.)
- NEVER substitute a different algorithm, built-in, or idiom for what the user wrote — even if yours is "better". all() stays all(), any() stays any(), a loop stays a loop.
- NEVER rewrite or restructure code that already works correctly AND is harness-compatible. Edit the minimum number of characters needed.
- Preserve variable names, indentation style, string quotes, f-string prefixes, and every other stylistic choice exactly.
- Respect existing code style and naming conventions
- The \`if __name__ == '__main__':\` block is READ-ONLY platform boilerplate (HackerRank/CoderPad/etc). NEVER modify anything inside it — not os.environ[...] refs, not file handles, not input() calls. Copy it character-for-character into fixed_code. (Exception: when converting an incompatible stdin/print scaffold to a return-based function per the EXECUTION CONTRACT rule above, you may remove the stdin/__main__ boilerplate.)
- NEVER replace os.environ[...] with a hardcoded string. Environment variables are correct by design on the platform.
- line numbers refer to the FIXED code, not the original
- type "fix" = correcting an existing line; type "added" = newly inserted line
- hackerrank_compatible: true only if the function has a clean return-based signature with no stdin/input() boilerplate
- If code has no issues, return changes: [] and fixed_code equal to the input
- Return the COMPLETE fixed code, not a partial snippet
- Do NOT add comments inside the code (changes[] documents everything)
- walkthrough: cover every non-trivial line or logical block (3-8 entries). Write in first person ("I iterate…", "I seed…"). Group consecutive related lines ("35-38"). Use backticks for variable/code refs. One sentence per entry, max 30 words.`;

  // Shared JSON parse + emit helper used by both Claude and OpenAI paths
  async function parseAndEmitCofix(fullText) {
    const fenced = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    let jsonStr = fenced ? fenced[1] : fullText.trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1) {
        parsed = JSON.parse(jsonStr.slice(0, lastBrace + 1));
      } else {
        throw new Error('no closing brace');
      }
    }
    sendEvent('answer', parsed);
    sendEvent('done', {});
    try { await recordCodingUsage(req.user.id, lang, 0, 0, 0); } catch {}
    clearInterval(keepaliveTimer);
    res.end();
  }

  try {
    const cofixChat = geminiGetModel('').startChat({ history: [] });
    const cofixStreamResult = await cofixChat.sendMessageStream(cofixUserContent);

    let fullText = '';
    for await (const chunk of cofixStreamResult.stream) {
      if (clientDisconnected) break;
      const token = chunk.text();
      if (token) { fullText += token; sendEvent('token', { chunk: token }); }
    }

    if (clientDisconnected) { clearInterval(keepaliveTimer); return; }

    try {
      await parseAndEmitCofix(fullText);
    } catch {
      sendEvent('error', { message: 'Failed to parse CoFix response — try again' });
      clearInterval(keepaliveTimer);
      res.end();
    }
  } catch (err) {
    clearInterval(keepaliveTimer);
    if (clientDisconnected) return;

    if (isApiExhaustedError(err) && FALLBACK_PROVIDERS.length > 0) {
      console.warn('[cofix] Claude exhausted — trying fallback providers:', err.message);
      for (const provider of FALLBACK_PROVIDERS) {
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
async function fetchLeetcodeProblem(url) {
  // Accept any leetcode.com or leetcode.cn host; tolerate trailing
  // /description, /submissions, /discussion, query params, etc.
  const m = url.match(/leetcode\.(?:com|cn)\/problems\/([^/?#]+)/i);
  if (!m) return null;
  const titleSlug = m[1];

  const gqlBody = {
    operationName: 'questionContent',
    variables: { titleSlug },
    query: 'query questionContent($titleSlug: String!) { question(titleSlug: $titleSlug) { title difficulty content exampleTestcases } }',
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
  return header + text;
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
async function fetchHackerRankProblem(url) {
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

  return text && text.length >= 40 ? text : null;
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
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try { await assertPublicHost(url); } catch { return res.status(400).json({ error: 'URL is not allowed.' }); }

    // LeetCode SPAs need the GraphQL path — raw fetch returns no content.
    // Failures here fall through to the generic fetch below (e.g. premium problems
    // that aren't accessible via GraphQL may still have a readable HTML page).
    let lcProblem = null;
    let lcError = null;
    try {
      lcProblem = await fetchLeetcodeProblem(url);
    } catch (e) {
      lcError = e.message;
      console.warn('fetchLeetcodeProblem failed:', e.message);
    }
    if (lcProblem) {
      return res.json({ problem: lcProblem, source: url });
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
        hrProblem = await fetchHackerRankProblem(url);
      } catch (e) {
        console.warn('fetchHackerRankProblem failed, falling back to raw fetch:', e.message);
      }
      if (hrProblem) {
        return res.json({ problem: hrProblem, source: url });
      }
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
    res.json({ problem, source: url });
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

    const prompt = `You are an OCR engine analyzing a ${subject} screenshot from a coding interview platform (HackerRank, LeetCode, CoderPad, etc.). Return ONLY valid JSON with exactly these three fields and nothing else:

{
  "problem": "<verbatim problem statement — title, description, constraints, input/output format, examples. Preserve all formatting and line breaks. Return the string NO_PROBLEM_FOUND if no problem text is visible>",
  "starter_code": "<verbatim starter/template code from the code editor panel, preserving exact indentation, function names, shebang lines, input-reading boilerplate, and wrapper calls — EVERYTHING visible in the editor. This is the exact code skeleton the candidate must fill in. Return null if no code editor is visible>",
  "detected_language": "<programming language detected from the code editor — e.g. 'python', 'java', 'cpp', 'javascript', 'bash', 'go', 'ruby', 'rust', 'typescript', 'kotlin', 'scala', 'swift'. Identify from syntax, keywords, shebang, import style. Return null if no code visible>"
}

Critical rules:
- "problem": left panel or top section. Transcribe verbatim — title, description, constraints, examples. Never solve or paraphrase.
- "starter_code": right panel or bottom editor. Copy EVERY line in the editor verbatim — shebang, imports, class declarations, function stubs with their EXACT names, input-reading (scanf/readline/input/sys.stdin), print statements, wrapper calls at the bottom. null only if no editor is visible at all.
- "detected_language": look at the code syntax, not just shebangs — Python is recognizable from def/import/if __name__, Java from public class/System.out, etc.
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
    if (!problem || problem === 'NO_PROBLEM_FOUND') {
      return res.status(422).json({ detail: 'Could not extract a problem from this image. Try a clearer screenshot showing the problem statement.' });
    }
    // Prefer Claude's vision-based language detection, but validate it against
    // the supported list. Normalize known aliases: 'dockerfile' → 'docker',
    // 'makefile'/'plaintext'/etc. get filtered out as hallucinations.
    const rawVisionLang = parsed?.detected_language?.toLowerCase()?.trim() || null;
    const normalizedVisionLang = rawVisionLang === 'dockerfile' ? 'docker' : rawVisionLang;
    const visionLang = normalizedVisionLang && SUPPORTED_LANGUAGES.includes(normalizedVisionLang) ? normalizedVisionLang : null;
    const regexLang = detectLangFromCode(starterCode);
    const detectedLanguage = visionLang || regexLang;
    console.log(`[extract-from-image] lang_vision_raw=${rawVisionLang} lang_vision_valid=${visionLang} lang_regex=${regexLang} final=${detectedLanguage}`);
    res.json({ problem, starter_code: starterCode, kind, detected_language: detectedLanguage });
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
    const [resizedData, resizedType] = await ensureImageWithinAnthropicLimit(
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
- examples: 2-3 with varied inputs
- test_cases: 3-5 covering normal + edge cases (empty, zero, negative, boundary). CRITICAL: test_cases[].input MUST be a complete runnable ${language} statement — always wrap in print() e.g. print(function_name(arg)). Never put raw arguments or keyword assignments.
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
    if (FALLBACK_PROVIDERS.length > 0) {
      console.warn('[analyze] Anthropic failed — trying fallback providers:', err.message);
      for (const provider of FALLBACK_PROVIDERS) {
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

export default router;

