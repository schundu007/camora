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
import Anthropic from '@anthropic-ai/sdk';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkUsage } from '../middleware/usageLimits.js';

const router = Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TOKENS = parseInt(process.env.MAX_TOKENS_CODING || '8192', 10);
const FREE_TIER_DAILY_LIMIT = parseInt(process.env.FREE_CODING_DAILY_LIMIT || '2', 10);

/**
 * Select the Claude model based on the user's subscription plan.
 * Free users get Haiku (cheaper), paid users get Sonnet (more capable).
 */
function getModelForUser(req) {
  const plan = req.user?.plan_type || 'free';
  if (plan === 'free' || !plan) return 'claude-haiku-4-5-20251001';
  return process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
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
function buildCodingSystemPrompt(language) {
  return `You are an expert coding interview assistant.

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
      "approach": "Brief 1-2 sentence description of HOW this approach works",
      "code": "complete runnable code for this approach with \\n for newlines",
      "complexity": { "time": "O(...)", "space": "O(...)" },
      "explanations": [
        {"line": 1, "code": "first line", "explanation": "PLAIN TEXT explanation"}
      ]
    },
    {
      "name": "Second approach name",
      "approach": "Brief description",
      "code": "complete runnable code for second approach",
      "complexity": { "time": "O(...)", "space": "O(...)" },
      "explanations": [
        {"line": 1, "code": "first line", "explanation": "PLAIN TEXT explanation"}
      ]
    },
    {
      "name": "Third approach name (most optimal)",
      "approach": "Brief description",
      "code": "complete runnable code for third approach",
      "complexity": { "time": "O(...)", "space": "O(...)" },
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
 * Mirrors the Python `extract_json_from_text()` with 4 strategies.
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

    // Try balanced-brace extraction
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
  const { problem, language, conversationHistory } = req.body;

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

  // ── Call Claude with streaming ──────────────────────────────────────────
  const client = new Anthropic();
  const startTime = performance.now();
  const chunks = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = await client.messages.stream({
      model: getModelForUser(req),
      max_tokens: MAX_TOKENS,
      system: buildCodingSystemPrompt(lang),
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const token = event.delta.text;
        chunks.push(token);
        sendEvent('token', { t: token });
      }
    }

    // Collect usage from the final message
    const finalMessage = await stream.finalMessage();
    if (finalMessage.usage) {
      inputTokens = finalMessage.usage.input_tokens;
      outputTokens = finalMessage.usage.output_tokens;
    }
  } catch (err) {
    console.error('Claude stream error:', err);
    sendEvent('error', { msg: err.message || 'Claude API error' });
    return res.end();
  }

  // ── Parse accumulated response ──────────────────────────────────────────
  const rawAnswer = chunks.join('');
  const latencyMs = Math.round(performance.now() - startTime);

  if (!rawAnswer.trim()) {
    sendEvent('error', { msg: 'Empty response from model' });
    return res.end();
  }

  const jsonParsed = extractJsonFromText(rawAnswer);
  let parsed;

  if (jsonParsed && (jsonParsed.code || jsonParsed.solutions)) {
    // Ensure code fields are strings
    if (jsonParsed.code && typeof jsonParsed.code !== 'string') {
      jsonParsed.code = String(jsonParsed.code);
    }
    for (const sol of jsonParsed.solutions || []) {
      if (sol.code && typeof sol.code !== 'string') {
        sol.code = String(sol.code);
      }
    }
    // Set top-level code from first solution for backwards compat
    if (!jsonParsed.code && jsonParsed.solutions?.length) {
      jsonParsed.code = jsonParsed.solutions[0].code || '';
    }

    parsed = { json: jsonParsed, format: 'ascend_json' };
  } else {
    // Return raw text when JSON extraction fails
    parsed = { raw: rawAnswer, format: 'raw' };
  }

  sendEvent('answer', {
    question: problem.slice(0, 100),
    raw: rawAnswer,
    parsed,
    is_coding: true,
    language: lang,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    latency_ms: latencyMs,
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
    `Coding solution done lang=${lang} tokens=${inputTokens}+${outputTokens} latency=${latencyMs}ms`,
  );

  res.end();
});

// ---------------------------------------------------------------------------
// POST /execute — Run code against test cases
// ---------------------------------------------------------------------------

router.post('/execute', authenticate, async (req, res) => {
  const { executeCode } = await import('../services/codeRunner.js');

  const { code, language, test_cases: testCases } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Missing code or language' });
  }

  try {
    const result = await executeCode(code, language, testCases || []);
    return res.json(result);
  } catch (err) {
    console.error('Code execution error:', err);
    return res.status(400).json({ error: err.message });
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
    const client = new Anthropic();
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
    console.error('Auto-fix error:', err.message);
    return res.status(500).json({ error: 'Auto-fix failed: ' + err.message });
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
    const client = new Anthropic();
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

export default router;
