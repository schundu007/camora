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
import sharp from 'sharp';
import { getAnthropicClient } from '../lib/_shared/llm.js';

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
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkUsage } from '../middleware/usageLimits.js';
import { executeCode } from '../services/codeRunner.js';

const router = Router();

// Process-wide singleton via shared-llm. Avoids the per-request `new
// Anthropic()` pattern that would otherwise re-initialize connection pools
// + rate-limit state on every request.
const anthropicClient = getAnthropicClient();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 16k default — 8k sometimes truncated 3-solution JSON mid-field (explanations + traces)
// leaving the frontend with un-parseable preamble + open braces.
// 1500 token cap targets ~5–6s end-to-end with Haiku 4.5 (~300 tok/s):
//   • Whisper handled out-of-band before /solve fires
//   • TTFT  ~0.5–1s on a warm prompt cache
//   • 1500 tokens / 300 tok/s ≈ 5s of streaming
//   • render ~0.3s
// Bump via MAX_TOKENS_CODING env if the answer is being cut off mid-code.
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS_CODING || '1500', 10);
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
const FALLBACK_MODEL_FREE = 'claude-sonnet-4-20250514';

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
function getModelForUser(req) {
  // Haiku 4.5 by default for ALL users — Sonnet's tok/s budget can't
  // hit the 5–6s target the user demanded. Haiku 4.5 streams ~3x
  // faster (~300 tok/s vs Sonnet's ~130). Quality on coding-interview
  // problems is acceptable; quality-conscious paid users can opt back
  // into Sonnet by setting CLAUDE_MODEL=claude-sonnet-4-6 on Railway.
  return process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
}

/**
 * Opposite-tier model used as the final fallback when the primary model
 * has failed JSON validation twice. Paid users running Sonnet fall back
 * to Haiku (faster, usually still correct); free users on Haiku fall
 * back to Sonnet (more capable, acceptable one-off cost when Haiku
 * couldn't produce parseable JSON even with a strict reminder).
 */
function fallbackModelFor(primaryModel) {
  if (!primaryModel) return FALLBACK_MODEL_PAID;
  return primaryModel.includes('haiku') ? FALLBACK_MODEL_FREE : FALLBACK_MODEL_PAID;
}

/**
 * All 51 supported languages.
 * Claude can generate solutions for any of these; test execution is only
 * available for the subset that has a local runtime (see codeRunner.js).
 */
const SUPPORTED_LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'swift', 'kotlin', 'scala', 'ruby', 'php', 'perl',
  'r', 'lua', 'haskell', 'elixir', 'erlang', 'clojure', 'ocaml',
  'fsharp', 'dart', 'julia', 'groovy', 'objective-c', 'matlab',
  'bash', 'powershell', 'sql', 'plsql', 'mongodb', 'graphql',
  'html', 'css', 'sass', 'react', 'vue', 'angular', 'svelte',
  'nextjs', 'nodejs', 'django', 'rails', 'spring', 'terraform',
  'kubernetes', 'docker', 'solidity', 'assembly',
];

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the coding system prompt for a given language.
 * Directly ported from Python `build_coding_system_prompt()`.
 */
function buildCodingSystemPrompt(language, systemContext) {
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
# RULE #0: CODE MUST BE 100% CORRECT - NO BUGS ALLOWED
##############################################################################
CRITICAL: Your code MUST work correctly. Before returning code:
1. MENTALLY TRACE through your code with the example inputs
2. VERIFY each line does exactly what you intend
3. CHECK variable types - don't access dict keys on strings or vice versa
4. CHECK loop variables - ensure you're iterating over the right data
5. Test edge cases mentally: empty input, single element, large numbers

Common bugs to AVOID:
- Off-by-one errors in loops and indices
- Not handling None/null values
- Type mismatches (string vs int, list vs dict)

YOUR CODE WILL BE RUN. If it crashes or gives wrong output, you have FAILED.

##############################################################################
# RULE #1: MINIMAL CODE - AS FEW LINES AS POSSIBLE
##############################################################################
Your code must be EXTREMELY CONCISE:
- TARGET: 10-30 lines for most problems, 40 lines MAX for complex problems
- Use the LATEST modern idioms and built-in features of ${language}
- Combine operations where possible
- NO helper functions unless absolutely required for recursion/DP
- NO unnecessary imports - prefer built-ins
- NO intermediate variables if you can inline
- NO comments, NO debug prints

##############################################################################
# RULE #2: OUTPUT MUST MATCH EXACTLY
##############################################################################
- Study the expected output format in examples CAREFULLY
- Your output must match EXACTLY: same format, same spacing, same case
- NO extra text, NO labels, NO formatting - just the raw answer

##############################################################################
# RULE #2.5: NEVER FAKE OR HALLUCINATE DATA
##############################################################################
- NEVER hardcode expected outputs just to pass test cases
- Your solution must be GENUINELY CORRECT through proper logic

##############################################################################
# RULE #2.6: COMPLETE STARTER CODE TEMPLATES - DO NOT REWRITE
##############################################################################
Detect and complete partial/starter code from the problem. When you detect
partial code with markers like "complete the function", "TODO", or empty body,
you MUST complete the given template, NOT rewrite from scratch.

##############################################################################
# RULE #3: CODE STRUCTURE - FUNCTION-BASED, NO HARD-CODED MAIN
##############################################################################
CRITICAL CODE STRUCTURE RULES for ${language}:
- Write a function, class method, or the idiomatic entry point for ${language}
- Do NOT include a main block or hard-coded example inputs in the code
- The test runner or user will call your function with arguments
- The "examples" field in JSON handles test cases — NOT the code itself
- For config/infra languages (Terraform, Kubernetes, Docker, SQL, etc.),
  write the complete config/query directly

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
# CRITICAL: EXACTLY 3 SOLUTIONS REQUIRED
##############################################################################
You MUST return a "solutions" array with EXACTLY 3 objects.
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

Respond with valid JSON in EXACTLY this format (no text before/after):
{
  "language": "${language}",
  "solutions": [
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
  ],
  "pitch": {
    "opener": "One sentence hook comparing the approaches",
    "approach": "Summary of the 3 approaches and why you'd pick each",
    "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"],
    "tradeoffs": ["Tradeoff between approach 1 vs 2", "Tradeoff between approach 2 vs 3"],
    "edgeCases": ["Edge case 1", "Edge case 2", "Edge case 3"]
  },
  "examples": [
    {"input": "nums = [2,7,11,15], target = 9", "expected": "[0, 1]"},
    {"input": "nums = [3,2,4], target = 6", "expected": "[1, 2]"}
  ]
}

Rules:
- You MUST provide exactly 3 solutions with DIFFERENT approaches (e.g. brute force -> optimized -> most optimal)
- Each solution MUST have complete, runnable code — not pseudocode
- Each solution MUST have a patternTag from the canonical list above (pick the single most accurate one)
- Each solution MUST have a narration field — first-person spoken script the candidate will READ OUT LOUD during the interview (4-6 sentences, natural speech, no markdown)
- Each solution MUST have a trace field — 4-10 step-by-step dry-run entries showing variable state as the algorithm runs on examples[0]. Each step: { step: number, action: short verb phrase, state: key variables formatted as 'name=value' joined with commas }. No code in state, just names and values. Shows the candidate how to talk through the first test case at a whiteboard.
- Do NOT add comments in the code
- Do NOT add main blocks or hard-coded test calls
- The pitch should compare the 3 approaches conversationally
- Generate COMPLETE, RUNNABLE code that includes all necessary imports for each solution
- Examples must have exact input/output pairs
- ALL 3 solutions must produce correct output for the given examples
- Use the LATEST modern patterns and APIs for ${language}
- Order solutions from simplest (brute force) to most optimal`;
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
// Free-tier daily limit check
// ---------------------------------------------------------------------------

/**
 * Check whether a free-tier user has remaining coding solves for today.
 * Returns { allowed: boolean, remaining: number, message?: string }.
 */
async function checkFreeTierLimit(userId) {
  const result = await query(
    `SELECT COUNT(*) AS cnt
       FROM coding_usage
      WHERE user_id = $1
        AND created_at >= CURRENT_DATE`,
    [userId],
  );
  const used = parseInt(result.rows[0]?.cnt || '0', 10);
  const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `Daily free-tier limit reached (${FREE_TIER_DAILY_LIMIT}/day). Upgrade for unlimited access.`,
    };
  }
  return { allowed: true, remaining };
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

// /stream alias for backwards compatibility with frontend
router.post('/stream', authenticate, checkUsage('questions'), async (req, res, next) => {
  req.url = '/solve';
  next();
});

router.post('/solve', authenticate, checkUsage('questions'), async (req, res) => {
  const { problem, language, conversationHistory, system_context: systemContext } = req.body;

  // ── Validate ────────────────────────────────────────────────────────────
  if (!problem || typeof problem !== 'string') {
    return res.status(400).json({ error: 'Missing required field: problem' });
  }
  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Missing required field: language' });
  }

  const lang = language.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return res.status(400).json({
      error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    });
  }

  // ── Free-tier check ─────────────────────────────────────────────────────
  const planType = req.user.plan_type || 'free';
  if (planType === 'free') {
    const quota = await checkFreeTierLimit(req.user.id);
    if (!quota.allowed) {
      return res.status(429).json({ error: quota.message });
    }
  }

  // ── Paid users: soft daily cap to prevent abuse ─────────────────────────
  if (planType !== 'free' && planType) {
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

  messages.push({
    role: 'user',
    content: `Solve this coding problem in ${lang}:\n\n${problem}`,
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
  const client = anthropicClient;
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

  const systemPrompt = buildCodingSystemPrompt(lang, typeof systemContext === 'string' ? systemContext : undefined);
  // Anthropic prompt cache — wraps the large coding system prompt as a
  // single ephemeral cache block. Subsequent /solve calls within the
  // 5-min TTL skip ~3-4k input tokens of re-tokenization, cutting
  // time-to-first-token by 200–500 ms in the steady state. Identical
  // pattern to services/claude.js:457. Per-request blocks are unchanged.
  const systemBlocks = [
    { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
  ];
  const STRICT_JSON_REMINDER =
    'IMPORTANT: Your previous response could not be parsed. Return ONLY a single valid JSON object matching the schema above. No preamble, no markdown fences, no prose. Start with { and end with }. Every string must be properly closed. The "solutions" array must contain exactly 3 complete solution objects.';

  // ── Pass 1: streaming primary attempt with transport-error retries ──────
  let transportAttempt = 0;
  while (true) {
    try {
      const passStart = performance.now();
      const chunks = [];
      const stream = await client.messages.stream({
        model: primaryModel,
        max_tokens: MAX_TOKENS,
        system: systemBlocks,
        messages,
      }, { signal: abortController.signal });

      for await (const event of stream) {
        if (clientDisconnected) { try { stream.controller?.abort(); } catch {} break; }
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const token = event.delta.text;
          chunks.push(token);
          sendEvent('token', { t: token });
        }
      }
      if (clientDisconnected) return;

      const finalMessage = await stream.finalMessage();
      if (finalMessage.usage) {
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;
      }
      rawAnswer = chunks.join('');
      modelUsed = primaryModel;
      console.log(
        `[coding/solve] pass=primary_stream model=${primaryModel} attempt=${transportAttempt + 1} ok=true ` +
        `rawLen=${rawAnswer.length} tokens=${inputTokens}+${outputTokens} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
      break; // stream succeeded, fall through to parse
    } catch (err) {
      const retryable = isRetryableClaudeError(err);
      const status = err?.status || err?.statusCode || err?.response?.status || 'unknown';
      console.error(
        `[coding/solve] pass=primary_stream model=${primaryModel} attempt=${transportAttempt + 1} ok=false ` +
        `status=${status} retryable=${retryable} msg=${JSON.stringify(err?.message || String(err))} ua=${JSON.stringify(userAgent)}`,
      );
      if (retryable && transportAttempt < CLAUDE_MAX_TRANSPORT_RETRIES) {
        const delay = CLAUDE_TRANSPORT_BACKOFFS_MS[transportAttempt] ?? 1500;
        transportAttempt++;
        sendEvent('status', {
          state: 'warn',
          msg: `Recovering — retry ${transportAttempt}/${CLAUDE_MAX_TRANSPORT_RETRIES}…`,
        });
        await sleep(delay);
        continue;
      }
      // Transport failure is terminal for Pass 1. Pass 2 will try
      // non-streaming which sometimes succeeds where streaming doesn't
      // (different upstream edge), using the same model, strict prompt.
      rawAnswer = '';
      terminalFailure = {
        msg: err?.message || 'Claude API error',
        category: retryable ? 'overloaded' : 'api_error',
      };
      break;
    }
  }

  // ── Parse Pass 1 output ─────────────────────────────────────────────────
  let parsedJson = null;
  if (rawAnswer && rawAnswer.trim()) {
    parsedJson = extractJsonFromText(rawAnswer);
    if (!parsedJson || (!parsedJson.code && !parsedJson.solutions)) {
      console.error(
        `[coding/solve] parse_failed pass=primary_stream model=${primaryModel} rawLen=${rawAnswer.length} ` +
        `head=${JSON.stringify(truncateForLog(rawAnswer.slice(0, 1024), 1024))} tail=${JSON.stringify(truncateForLog(rawAnswer.slice(-1024), 1024))} ua=${JSON.stringify(userAgent)}`,
      );
      parsedJson = null; // force fallthrough to Pass 2
    }
  }

  // ── Pass 2: non-streaming primary model with strict reminder ────────────
  if (!parsedJson) {
    passTag = 'primary_strict';
    sendEvent('status', { state: 'warn', msg: 'Polishing solution — one more moment…' });
    const passStart = performance.now();
    try {
      const strictMessages = [
        ...messages,
        { role: 'assistant', content: rawAnswer || '(no output)' },
        { role: 'user', content: STRICT_JSON_REMINDER },
      ];
      const resp = await client.messages.create({
        model: primaryModel,
        max_tokens: MAX_TOKENS,
        system: systemBlocks,
        messages: strictMessages,
      });
      const strictRaw = resp.content?.map(b => b.text || '').join('') || '';
      if (resp.usage) {
        inputTokens += resp.usage.input_tokens || 0;
        outputTokens += resp.usage.output_tokens || 0;
      }
      const strictParsed = extractJsonFromText(strictRaw);
      console.log(
        `[coding/solve] pass=primary_strict model=${primaryModel} ok=${!!(strictParsed && (strictParsed.code || strictParsed.solutions))} ` +
        `rawLen=${strictRaw.length} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
      if (strictParsed && (strictParsed.code || strictParsed.solutions)) {
        parsedJson = strictParsed;
        rawAnswer = strictRaw;
        modelUsed = primaryModel;
        terminalFailure = null;
      } else {
        console.error(
          `[coding/solve] parse_failed pass=primary_strict model=${primaryModel} rawLen=${strictRaw.length} ` +
          `head=${JSON.stringify(truncateForLog(strictRaw.slice(0, 1024), 1024))} tail=${JSON.stringify(truncateForLog(strictRaw.slice(-1024), 1024))} ua=${JSON.stringify(userAgent)}`,
        );
      }
    } catch (err) {
      console.error(
        `[coding/solve] pass=primary_strict model=${primaryModel} ok=false ` +
        `msg=${JSON.stringify(err?.message || String(err))} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
    }
  }

  // ── Pass 3: fallback-tier model with strict reminder ────────────────────
  if (!parsedJson) {
    passTag = 'fallback_model';
    const fbModel = fallbackModelFor(primaryModel);
    sendEvent('status', { state: 'warn', msg: 'Switching to backup model…' });
    const passStart = performance.now();
    try {
      const fbMessages = [
        ...messages,
        { role: 'user', content: STRICT_JSON_REMINDER },
      ];
      const resp = await client.messages.create({
        model: fbModel,
        max_tokens: MAX_TOKENS,
        system: systemBlocks,
        messages: fbMessages,
      });
      const fbRaw = resp.content?.map(b => b.text || '').join('') || '';
      if (resp.usage) {
        inputTokens += resp.usage.input_tokens || 0;
        outputTokens += resp.usage.output_tokens || 0;
      }
      const fbParsed = extractJsonFromText(fbRaw);
      console.log(
        `[coding/solve] pass=fallback_model model=${fbModel} ok=${!!(fbParsed && (fbParsed.code || fbParsed.solutions))} ` +
        `rawLen=${fbRaw.length} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
      if (fbParsed && (fbParsed.code || fbParsed.solutions)) {
        parsedJson = fbParsed;
        rawAnswer = fbRaw;
        modelUsed = fbModel;
        terminalFailure = null;
      } else {
        console.error(
          `[coding/solve] parse_failed pass=fallback_model model=${fbModel} rawLen=${fbRaw.length} ` +
          `head=${JSON.stringify(truncateForLog(fbRaw.slice(0, 1024), 1024))} tail=${JSON.stringify(truncateForLog(fbRaw.slice(-1024), 1024))} ua=${JSON.stringify(userAgent)}`,
        );
        terminalFailure = {
          msg: "Couldn't generate a structured solution. Tap retry to try again.",
          category: 'parse_failure',
        };
      }
    } catch (err) {
      console.error(
        `[coding/solve] pass=fallback_model model=${fbModel} ok=false ` +
        `msg=${JSON.stringify(err?.message || String(err))} durMs=${Math.round(performance.now() - passStart)} ua=${JSON.stringify(userAgent)}`,
      );
      terminalFailure = {
        msg: err?.message || 'Fallback model also failed. Tap retry to try again.',
        category: isRetryableClaudeError(err) ? 'overloaded' : 'api_error',
      };
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // ── Terminal failure path ───────────────────────────────────────────────
  if (!parsedJson) {
    const msg = terminalFailure?.msg || "Couldn't generate a solution. Please tap retry.";
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

  sendEvent('answer', {
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
    await recordCodingUsage(req.user.id, lang, inputTokens, outputTokens, latencyMs);
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

router.post('/fix', authenticate, async (req, res) => {
  const { code, language, error: feedback, problem } = req.body;

  if (!code || !language || !feedback) {
    return res.status(400).json({ error: 'Missing code, language, or error feedback' });
  }

  const problemContext = problem ? `\nORIGINAL PROBLEM:\n${problem}\n` : '';
  const model = getModelForUser(req);

  try {
    const client = anthropicClient;
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Fix this ${language} code. ALL of the following test failures must be resolved.
${problemContext}
CODE:
\`\`\`${language}
${code}
\`\`\`

FAILING TESTS:
${feedback}

Return ONLY a JSON object (no markdown fences) with:
{
  "code": "the complete fixed code as a string",
  "explanation": "brief summary of what was wrong and how you fixed it"
}

IMPORTANT:
- Fix ALL failing tests, not just the first one
- Do NOT add comments in the code
- Return the COMPLETE function, not a partial snippet
- Keep the same function signature`,
        },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonStr);
      return res.json(parsed);
    } catch {
      const codeMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
      const fixedCode = codeMatch ? codeMatch[1] : content;
      return res.json({ code: fixedCode.trim(), explanation: '' });
    }
  } catch (err) {
    console.error('Auto-fix error:', err);
    return res.status(500).json({ error: 'Auto-fix failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /translate — Translate a single solution to another language
// ---------------------------------------------------------------------------

router.post('/translate', authenticate, async (req, res) => {
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
    const client = anthropicClient;
    const msg = await client.messages.create({
      model: getModelForUser(req),
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `${problemContext}\nORIGINAL CODE (${fromLanguage || 'source'}):\n\`\`\`\n${code}\n\`\`\`\n\nTranslate the code above to ${target}.`,
      }],
    });

    const text = msg.content?.map(b => b.text).join('') || '';
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
 */
router.post('/fetch-problem', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Camora/1.0)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`Failed to fetch (${response.status})`);

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
      throw new Error('Could not extract problem text from URL');
    }

    // Use Claude to clean and extract just the problem description
    const client = anthropicClient;
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: `Extract ONLY the coding problem description from this text. Return just the problem statement, constraints, and examples. No solutions.\n\n${textContent}` }],
    });

    const problem = msg.content[0]?.type === 'text' ? msg.content[0].text : textContent.slice(0, 2000);
    res.json({ problem, source: url });
  } catch (err) {
    console.error('fetch-problem error:', err.message);
    res.status(400).json({ error: err.message || 'Failed to fetch problem' });
  }
});

/* ── POST /capture — extract a coding/design problem from a screenshot ──
   Body: { image: "data:image/jpeg;base64,..." | base64-string, kind?: 'coding' | 'design' }
   Returns: { problem: string, kind: 'coding' | 'design' }

   Used by the browser "Capture problem" button which calls
   getDisplayMedia() → grabs one frame → POSTs the JPEG here. Claude Vision
   OCRs + normalizes it into a clean problem statement we can feed into
   the Coding / Design solver directly. */
router.post('/capture', authenticate, async (req, res) => {
  try {
    const { image, kind } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image is required (base64 data URL or raw base64)' });
    }

    // Accept either "data:image/jpeg;base64,XXXX" or raw base64
    let mediaType = 'image/jpeg';
    let data = image;
    const dataUrlMatch = image.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
    if (dataUrlMatch) {
      mediaType = dataUrlMatch[1] === 'image/jpg' ? 'image/jpeg' : dataUrlMatch[1];
      data = dataUrlMatch[2];
    }

    // Guard against absurdly large payloads (express.json is already 10mb, this is belt+suspenders)
    if (data.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'screenshot too large — try a smaller capture region' });
    }

    // Auto-downscale if the screenshot exceeds Anthropic's 5 MB base64 cap.
    ({ mediaType, data } = await ensureImageWithinAnthropicLimit(data, mediaType));

    const isDesign = kind === 'design';
    const subject = isDesign ? 'SYSTEM DESIGN interview question' : 'CODING interview problem';
    const prompt = `You are an OCR engine. Output ONE OF EXACTLY TWO things and nothing else:

  1. The literal text of the ${subject} as it appears in the screenshot. Preserve formatting: code blocks, examples, constraints, math notation, line breaks. Do NOT solve it. Do NOT add headers like "Problem:" or "Here is...". Do NOT translate or paraphrase. Just transcribe.
  2. The exact token NO_PROBLEM_FOUND (no other characters) if the screenshot does not contain readable problem text.

CRITICAL RULES — violations break the product:
  • NEVER describe what's in the image ("I can see a coding interface...", "The screenshot shows..." → ALWAYS return NO_PROBLEM_FOUND instead).
  • NEVER apologize, explain limitations, or comment on image quality.
  • NEVER summarize. Transcribe verbatim.
  • If you can read even a partial problem (just the title + a few lines, e.g. a LeetCode header that says "Two Sum" with the description scrolled below), transcribe what's there.
  • If the image is dark / blurry / cropped to a code editor / terminal / unrelated app (Slack, Mail, browser homepage, Camora itself) → NO_PROBLEM_FOUND.

Begin output now. No preamble.`;

    const client = anthropicClient;
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    let problem = (msg.content[0]?.type === 'text' ? msg.content[0].text : '').trim();
    // Guard against description-leaks. We only treat short, refusal-shaped
    // replies as NO_PROBLEM_FOUND — long replies that just happen to start
    // with "I'd..." or "The..." are real extractions and must pass through.
    // Real LeetCode/HackerRank extractions are always >300 chars.
    const looksLikeRefusal = problem.length < 300
      && /^(i (cannot|can'?t|am unable|am not able|don'?t see)|i'?m (unable|sorry)|sorry|unfortunately|the (screenshot|image|window) (does not|doesn'?t|appears (?:to be )?(?:blank|empty|dark|minimi[sz]ed)))/i.test(problem);
    if (looksLikeRefusal) {
      problem = 'NO_PROBLEM_FOUND';
    }

    if (!problem || problem === 'NO_PROBLEM_FOUND') {
      return res.status(422).json({ error: "Couldn't read a problem in that screenshot. Make sure the LeetCode/HackerRank/CodeSignal tab is visible and the problem statement is on screen — not minimized, not behind another window — then try CAPTURE again." });
    }

    res.json({ problem, kind: isDesign ? 'design' : 'coding' });
  } catch (err) {
    console.error('capture error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Capture failed' });
  }
});

/* ── POST /extract-from-image — OCR a problem from an uploaded image ──
   Frontend IMAGE tab (Coding + Design) uploads a file via multipart
   FormData. Same OCR pipeline as /capture above; just accepts a
   multipart upload instead of a base64 dataURL JSON body so the user
   can drag-drop a file or paste from clipboard.

   Body: multipart, field "image" = the image file (jpeg/png/webp).
   Returns: { problem: string, kind: 'coding' | 'design' }. */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.post('/extract-from-image', authenticate, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded (expected multipart field "image")' });
    }
    let mediaType = req.file.mimetype && /^image\/(jpeg|png|webp)$/.test(req.file.mimetype)
      ? req.file.mimetype
      : 'image/jpeg';
    let data = req.file.buffer.toString('base64');
    // Auto-downscale if the upload exceeds Anthropic's 5 MB base64 cap.
    ({ mediaType, data } = await ensureImageWithinAnthropicLimit(data, mediaType));
    const kind = (req.body?.kind === 'design') ? 'design' : 'coding';
    const isDesign = kind === 'design';
    const subject = isDesign ? 'SYSTEM DESIGN interview question' : 'CODING interview problem';
    const prompt = `You are an OCR engine. Output ONE OF EXACTLY TWO things and nothing else:

  1. The literal text of the ${subject} as it appears in the image. Preserve formatting: code blocks, examples, constraints, math notation, line breaks. Do NOT solve it. Do NOT add headers like "Problem:" or "Here is...". Do NOT translate or paraphrase. Just transcribe.
  2. The exact token NO_PROBLEM_FOUND (no other characters) if the image does not contain readable problem text.

CRITICAL RULES — violations break the product:
  • NEVER describe what's in the image ("I can see...", "The image shows..." → ALWAYS return NO_PROBLEM_FOUND instead).
  • NEVER apologize, explain limitations, or comment on image quality.
  • NEVER summarize. Transcribe verbatim.
  • If you can read even a partial problem, transcribe what's there.
  • If the image is dark / blurry / cropped to an unrelated context → NO_PROBLEM_FOUND.

Begin output now. No preamble.`;

    const msg = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    let problem = (msg.content[0]?.type === 'text' ? msg.content[0].text : '').trim();
    if (/^(i (can|see|notice|cannot|don[''']?t)\b|the (screenshot|image|window) (shows|appears|seems|is)|it (looks|seems|appears)|sorry|unfortunately|i'?m unable)/i.test(problem)) {
      problem = 'NO_PROBLEM_FOUND';
    }
    if (!problem || problem === 'NO_PROBLEM_FOUND') {
      return res.status(422).json({ detail: 'Could not extract a problem from this image. Try a clearer screenshot showing the problem statement.' });
    }
    res.json({ problem, kind });
  } catch (err) {
    console.error('extract-from-image error:', err?.message || err);
    res.status(500).json({ detail: err?.message || 'Image extraction failed' });
  }
});

export default router;
