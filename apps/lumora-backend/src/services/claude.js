/**
 * Claude AI agent service — ported from Python claude_agent.py.
 *
 * Streams Claude responses via SSE-formatted events for the inference route.
 */
import Anthropic from '@anthropic-ai/sdk';
import { parseAnswer } from './answerParser.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS_QUICK = parseInt(process.env.MAX_TOKENS_QUICK || '2000', 10);
const MAX_TOKENS_DESIGN = parseInt(process.env.MAX_TOKENS_DESIGN || '12000', 10);
const CONTEXT_TURNS = parseInt(process.env.CONTEXT_TURNS || '6', 10);

const client = new Anthropic();  // reads ANTHROPIC_API_KEY from env

// ---------------------------------------------------------------------------
// Question-type detection keywords
// ---------------------------------------------------------------------------
const DESIGN_KEYWORDS = [
  'design', 'architect', 'build a', 'scale', 'system for',
  'how would you design', 'how would you build',
];

const CODING_KEYWORDS = [
  'leetcode', 'code', 'implement', 'write a function', 'write code',
  'algorithm', 'data structure', 'solve', 'two sum', 'three sum',
  'binary search', 'linked list', 'tree', 'graph', 'dynamic programming',
  'recursion', 'sorting', 'searching', 'array', 'string manipulation',
  'hash map', 'stack', 'queue', 'heap', 'trie', 'dfs', 'bfs',
  'sliding window', 'two pointer', 'backtracking', 'greedy',
  'reverse', 'merge', 'find', 'count', 'sum of', 'product of',
  'maximum', 'minimum', 'longest', 'shortest', 'subset', 'permutation',
  'combination', 'palindrome', 'anagram', 'duplicate', 'missing',
  'valid parentheses', 'balanced', 'rotate', 'matrix',
];

function isDesignQuestion(question) {
  const q = question.toLowerCase();
  return DESIGN_KEYWORDS.some((kw) => q.includes(kw));
}

function isCodingQuestion(question) {
  const q = question.toLowerCase();
  return CODING_KEYWORDS.some((kw) => q.includes(kw));
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------
function buildGeneralPrompt(resume, technical) {
  return `You are answering interview questions LIVE. Speak naturally in first person.

=== MY BACKGROUND ===
${resume}

=== TECHNICAL KNOWLEDGE ===
${technical}

=== FORMAT ===

[HEADLINE]
One clear sentence that directly answers the question.
[/HEADLINE]

[ANSWER]
Answer as if speaking to the interviewer.

DETECT THE QUESTION TYPE and adapt your format:

**For BEHAVIORAL questions** (leadership, conflict, challenge, failure, teamwork, "tell me about a time", "biggest", "hardest", "describe a situation"):
Use STAR format with these exact labels:
- SITUATION: Set the scene in 1-2 sentences (company, team, context)
- TASK: What was your specific responsibility or goal
- ACTION: What you specifically did (3-5 concrete steps with technologies/metrics)
- RESULT: Quantifiable outcome (numbers, percentages, impact)
- LEARNING: One sentence on what you took away

**For TECHNICAL questions** (how does X work, explain, compare, architecture):
Use bullet points (- prefix). Cover ALL relevant aspects:
- Direct answer to the question
- Each subsequent bullet: one key concept, tool, or experience point
- Keep each bullet to 1 sentence - high-level, not detailed paragraphs
- Include specific technologies, metrics, and outcomes from my experience
- Cover breadth: architecture, tools, metrics, challenges, results
[/ANSWER]

[FOLLOWUP]
Q1: Most likely follow-up
A1: 2-3 sentence answer. For behavioral follow-ups, reference the same story with additional details.
Q2: Deeper technical or behavioral follow-up
A2: 2-3 sentence answer with specific metrics or outcomes.
[/FOLLOWUP]

RULES:
- Answer the EXACT question asked
- Use my real experience from resume
- No markdown (##, **, ---)
- Always include FOLLOWUP
- For behavioral: ALWAYS use STAR format with real stories from my experience`;
}

function buildInterviewDesignPrompt(resume, technical) {
  return `You are answering a SYSTEM DESIGN interview question.
CRITICAL: You MUST include ALL sections below. Keep each section concise (3-5 bullets max per section). Do NOT spend all tokens on early sections — distribute content evenly across ALL sections including TRADEOFFS, EDGECASES, and FOLLOWUP.

=== MY BACKGROUND ===
${resume}

=== TECHNICAL KNOWLEDGE ===
${technical}

=== FORMAT ===

[HEADLINE]
One clear sentence summarizing your high-level architecture approach.
[/HEADLINE]

[REQUIREMENTS]
FUNCTIONAL
- Core feature 1
- Core feature 2
- Core feature 3

NON-FUNCTIONAL
- Latency requirement
- Availability requirement
- Scalability requirement
[/REQUIREMENTS]

[SCALEMATH]
DAU: estimated daily active users
QPS: queries per second calculation
Storage: data storage estimate
Bandwidth: network bandwidth estimate
[/SCALEMATH]

[DIAGRAM]
skip
[/DIAGRAM]

[DEEPDESIGN]
1. LAYER TITLE
  - Detail bullet 1
  - Detail bullet 2
(6-8 layers covering CDN, LB, App, Cache, DB, Async, HA/DR, Monitoring)
[/DEEPDESIGN]

[EDGECASES]
- 3-5 bullet points, one line each
[/EDGECASES]

[TRADEOFFS]
- 3-5 bullet points, format "Chose X over Y: reason"
[/TRADEOFFS]

[FOLLOWUP]
Q1: Follow-up question
A1: 2-3 sentence answer
Q2: Follow-up question
A2: 2-3 sentence answer
[/FOLLOWUP]

RULES:
- Answer the EXACT question asked
- Use my real experience from resume with specific metrics
- No markdown (##, **, ---)
- Always include all sections above`;
}

const CODING_SYSTEM_PROMPT = `You are the candidate in a coding interview. Answer coding questions clearly and concisely.

FORMAT:

[PROBLEM]
Restate the problem: inputs, outputs, constraints.
[/PROBLEM]

[APPROACH]
My approach in 2-3 sentences - why this works.
[/APPROACH]

[CODE lang=python]
# Clean, working Python code with type hints
def solution(params):
    pass
[/CODE]

[COMPLEXITY]
TIME: O(X) - explanation
SPACE: O(X) - explanation
[/COMPLEXITY]

[WALKTHROUGH]
Trace through with example step by step.
[/WALKTHROUGH]

[EDGECASES]
- Empty input: handled by...
- Single element: handled by...
[/EDGECASES]

[TESTCASES]
Input: [1,2,3] -> Output: expected
Input: [] -> Output: expected
[/TESTCASES]

[FOLLOWUP]
Q1: Can you optimize?
A1: Specific approach
Q2: What about duplicates?
A2: Specific handling
[/FOLLOWUP]

RULES: Code must be correct and runnable. No markdown outside tags.`;

// ---------------------------------------------------------------------------
// Default context (fallbacks when user has no resume/technical data)
// ---------------------------------------------------------------------------
function getDefaultResumeContext() {
  return 'No resume provided. Give general interview coaching advice.';
}

function getDefaultTechnicalContext() {
  return 'General software engineering background.';
}

// ---------------------------------------------------------------------------
// Web search helper
// ---------------------------------------------------------------------------
async function runSearch(question, history) {
  try {
    const messages = [
      ...history.slice(-CONTEXT_TURNS),
      { role: 'user', content: question },
    ];

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: (
        'You are a research assistant. Use web_search to find current facts, ' +
        'versions, CVEs, and DORA/CNCF metrics relevant to the question. ' +
        'Return only a concise JSON summary of findings.'
      ),
      messages,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    });

    const context = response.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('');

    return context.trim() ? context.trim().slice(0, 800) : null;
  } catch (err) {
    console.warn('Web search failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main streaming generator
// ---------------------------------------------------------------------------

/**
 * Stream a Claude response as SSE-formatted event objects.
 *
 * Yields objects of the form { event, data } where data is already a
 * JSON-serializable object (the route handler will JSON.stringify it).
 *
 * @param {string}   question           The user's question
 * @param {object[]} history            Previous conversation messages
 * @param {object}   options
 * @param {boolean}  options.useSearch   Whether to try web search first
 * @param {string}   [options.userId]
 * @param {string}   [options.resumeContext]
 * @param {string}   [options.technicalContext]
 */
export async function* streamResponse(question, history, options = {}) {
  const {
    useSearch = false,
    resumeContext = null,
    technicalContext = null,
  } = options;

  const startTime = performance.now();
  const isDesign = isDesignQuestion(question);
  const isCoding = !isDesign && isCodingQuestion(question);

  // Resolve context
  const resume = resumeContext || getDefaultResumeContext();
  const technical = technicalContext || getDefaultTechnicalContext();

  // Select system prompt and max_tokens
  let systemPrompt;
  let maxTokens;
  if (isCoding) {
    systemPrompt = CODING_SYSTEM_PROMPT;
    maxTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    systemPrompt = buildInterviewDesignPrompt(resume, technical);
    maxTokens = MAX_TOKENS_DESIGN;
  } else {
    systemPrompt = buildGeneralPrompt(resume, technical);
    maxTokens = MAX_TOKENS_QUICK;
  }

  // Build messages with history window
  let finalQuestion = question;

  // Web search if requested
  let searchContext = null;
  if (useSearch) {
    yield { event: 'status', data: { state: 'search', msg: 'Searching web...' } };
    searchContext = await runSearch(question, history);
  }

  if (searchContext) {
    finalQuestion = `${question}\n\n[Web search context: ${searchContext}]`;
  }

  const messages = [
    ...history.slice(-CONTEXT_TURNS),
    { role: 'user', content: finalQuestion },
  ];

  // Signal stream start
  yield { event: 'status', data: { state: 'write', msg: 'Generating answer...' } };
  yield {
    event: 'stream_start',
    data: { question, is_design: isDesign, is_coding: isCoding },
  };

  const chunks = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const token = event.delta.text;
        chunks.push(token);
        yield { event: 'token', data: { t: token } };
      }
    }

    // Get final message for usage info
    const finalMessage = await stream.finalMessage();
    if (finalMessage.usage) {
      inputTokens = finalMessage.usage.input_tokens;
      outputTokens = finalMessage.usage.output_tokens;
    }
  } catch (err) {
    console.error('Claude stream error:', err);
    yield { event: 'error', data: { msg: err.message || String(err) } };
    return;
  }

  // Build final answer
  const rawAnswer = chunks.join('');
  const latencyMs = Math.round(performance.now() - startTime);

  if (rawAnswer.trim()) {
    const parsed = parseAnswer(rawAnswer);

    yield {
      event: 'answer',
      data: {
        question,
        raw: rawAnswer,
        parsed,
        is_design: isDesign,
        is_coding: isCoding,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
      },
    };

    console.log(
      `Answer done design=${isDesign} coding=${isCoding} ` +
      `tokens=${inputTokens}+${outputTokens} latency=${latencyMs}ms ` +
      `q='${question.slice(0, 50)}...'`
    );
  } else {
    console.warn(`Empty response for q='${question.slice(0, 50)}...'`);
    yield { event: 'error', data: { msg: 'Empty response from model' } };
  }
}

export { MODEL, isDesignQuestion, isCodingQuestion };
