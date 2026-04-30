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
// Sonnet 4.6 — current generation. The earlier IDs (Sonnet 4.0:
// claude-sonnet-4-20250514, Sonnet 4.5: claude-sonnet-4-5-20250929)
// return 400 invalid_request_error now that they've been retired —
// that's what surfaced as the "Error: 400 invalid_request" bubbles
// in Sona behavioral. Override with CLAUDE_MODEL_PAID env if needed.
const MODEL_PAID = process.env.CLAUDE_MODEL_PAID || 'claude-sonnet-4-6';

/** Select model by plan. Paid users on coding/design get Sonnet for accuracy;
 *  behavioral stays on Haiku (fast, cheap, quality is fine for short STAR). */
function selectModel(plan, questionType) {
  const paid = plan && plan !== 'free';
  if (!paid) return MODEL;
  // Behavioral stays on Haiku — STAR answers don't benefit from Sonnet
  if (questionType === 'behavioral') return MODEL;
  return MODEL_PAID;
}
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

/**
 * Detect "introduce yourself" / "tell me about yourself" / "elevator
 * pitch" style questions. These are NOT behavioral STAR questions and
 * should NOT be answered with ARCHETYPE + Situation/Task/Action/Result —
 * they need a 90-120 second JD-mapped narrative pitch that the
 * candidate can read aloud as a single continuous block. Match against
 * the cleaned question (no [SHORT] prefix).
 */
function isElevatorPitch(question) {
  const q = String(question || '').toLowerCase().trim();
  const PHRASES = [
    'tell me about yourself',
    'tell us about yourself',
    'introduce yourself',
    'walk me through your background',
    'walk me through your resume',
    'walk us through your background',
    'walk us through your resume',
    'tell me your story',
    'tell me about your background',
    'tell us about your background',
    'elevator pitch',
    'give me your elevator pitch',
    'give me a quick intro',
    'give me a brief intro',
    'who are you',
    'so tell me about yourself',
  ];
  return PHRASES.some(p => q.includes(p));
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------
function buildGeneralPrompt(resume, technical) {
  return `You ARE the candidate in a LIVE interview happening right now. You are NOT a coach or sidebar assistant — you are speaking AS the candidate so the candidate can read your output aloud verbatim.

=== VOICE — NON-NEGOTIABLE ===
- FIRST PERSON ONLY. Use "I", "I've", "my", "we" (for past teams).
- NEVER address the candidate as "you" or refer to "the candidate". NEVER write "your background" / "you're a senior engineer" / "you should mention X".
- The candidate's name (if any) appears as "I" / "my", never in third person.
- Past experience is autobiographical: "I led a 6-person platform team", not "You led a 6-person platform team".

=== MY BACKGROUND ===
${resume}

=== TECHNICAL KNOWLEDGE ===
${technical}

=== CRITICAL RULES ===
1. MAXIMUM 6 bullet points total in the answer. No exceptions.
2. Each bullet: ONE short sentence (under 12 words). Bold the key term.
3. No paragraphs. No essays. No lengthy explanations. No filler words.
4. The candidate must be able to read your answer in under 8 seconds.
5. Think "cheat sheet" not "textbook". Every word must earn its place.
6. If there's code, keep it under 15 lines. Only show the core logic.
7. Bold (**bold**) the most important 2-3 words in each bullet.

=== FORMAT ===

[HEADLINE]
One clear sentence (under 20 words) that directly answers the question.
[/HEADLINE]

[ANSWER]
DETECT THE QUESTION TYPE:

**BEHAVIORAL** (tell me about a time, conflict, leadership, failure):
- SITUATION: 1 sentence — company, team, context
- TASK: 1 sentence — your specific goal
- ACTION: 3 short bullets — what you did (with metrics)
- RESULT: 1 sentence — quantifiable outcome
- LEARNING: 1 sentence

**TECHNICAL** (how does X work, explain, compare):
- 5-8 short bullet points max
- Each bullet: one key fact, no sub-bullets
- Include specific technologies and numbers
[/ANSWER]

[FOLLOWUP]
Q1: Most likely follow-up question
A1: 1-2 sentence answer only.
[/FOLLOWUP]

RULES:
- BE BRIEF. This is a live interview — candidate cannot read long text.
- No markdown formatting (##, **, ---)
- No introductory sentences ("Let me explain...", "Great question...")
- Jump straight to the answer
- Use my real experience from resume when available`;
}

function buildInterviewDesignPrompt(resume, technical, detailLevel = null) {
  const isBasic = detailLevel === 'basic';
  const isFull = detailLevel === 'full';
  const detailRules = isBasic
    ? `DETAIL MODE: BASIC — strip to essentials. Emit HEADLINE, ANSWER, REQUIREMENTS, TRADEOFFS, and DIAGRAM only. Skip SCALEMATH, SCALECALC, DEEPDESIGN, EDGECASES, and FOLLOWUP entirely. 2 bullets per section max.`
    : isFull
    ? `DETAIL MODE: FULL — emit every section. 4-6 bullets per section, with numbers in SCALEMATH and named technologies in DEEPDESIGN.`
    : `DETAIL MODE: STANDARD — emit every section. 3-4 bullets per section.`;
  return `You ARE the candidate in a LIVE SYSTEM DESIGN interview happening right now. Speak AS the candidate, in their voice, so the candidate can read your output aloud verbatim. You are NOT a sidebar coach.

VOICE — NON-NEGOTIABLE:
- FIRST PERSON ONLY. Use "I", "I'd", "my", "we" (for past teams).
- NEVER write "you" / "your design" / "the candidate should". Architecture decisions are stated as "I'd use a CDN here because...", trade-offs as "I'd accept eventual consistency over strict because...".

CRITICAL RULES:
- ${detailRules}
- Each bullet: ONE short sentence (under 15 words).
- ${isBasic ? 'Only include the sections listed above in DETAIL MODE' : 'Include ALL sections below'} but keep them SHORT.
- Total answer must be readable in under 30 seconds.

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

[SCALECALC]
DAU=<integer — daily active users baseline, no commas, no units, e.g. 1000000>
RequestsPerUser=<integer — avg requests per user per day, e.g. 10>
PayloadBytes=<integer — average bytes per request/record, e.g. 1200>
RetentionDays=<integer — days of data retained, e.g. 90>
PeakMultiplier=<float — peak-to-average QPS factor, e.g. 3>
ReadWriteRatio=<float — reads per write, e.g. 20>
[/SCALECALC]

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

const CODING_SYSTEM_PROMPT = `You ARE the candidate in a LIVE coding interview happening right now. Speak AS the candidate so the candidate can read your output aloud verbatim.

VOICE — NON-NEGOTIABLE:
- FIRST PERSON ONLY ("I", "I'd", "my approach", "I'll").
- NEVER write "you" / "your solution" / "the candidate". The PROBLEM section restates the prompt; the APPROACH is "I'd...", code is the candidate's own work.

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
    systemContext = null,
    detailLevel = null,
    plan = 'free',
    // Optional AbortSignal passed from the route so a client disconnect can tear
    // down the Anthropic stream instead of letting it burn tokens to completion.
    signal = null,
  } = options;

  const startTime = performance.now();

  // Detect short mode prefix from copilot
  const isShortMode = question.startsWith('[SHORT] ');
  const cleanQuestion = isShortMode ? question.slice(8) : question;

  const isDesign = isDesignQuestion(cleanQuestion);
  const isCoding = !isDesign && isCodingQuestion(cleanQuestion);

  // Resolve context — custom assistant context takes priority over defaults
  const resume = systemContext || resumeContext || getDefaultResumeContext();
  const technical = systemContext ? '' : (technicalContext || getDefaultTechnicalContext());

  // Company culture frame — pulled from the systemContext (JD + company fields)
  const { getCultureFrame } = await import('./companyCulture.js');
  const cultureFrame = getCultureFrame(systemContext || '');

  // Live web briefing — cached engineering-blog + GitHub summary that
  // companyContext.js produces. Cache-only on the read path so we never
  // add latency to the answer; a stale/missing entry kicks off an async
  // refresh that the next request will see.
  let companyBriefing = '';
  try {
    const { getCompanyContext, detectCompanyFromContext } = await import('./companyContext.js');
    const company = detectCompanyFromContext(systemContext || '');
    if (company) {
      const briefing = await getCompanyContext(company);
      if (briefing) {
        companyBriefing = `\n\n=== COMPANY BRIEFING — ${company} (auto-fetched, ~${briefing.length} chars) ===\n${briefing}\n=== END BRIEFING ===\n\nUse this briefing to ground answers in the company's actual recent work. Cite specific projects/posts when relevant, but do not invent details that aren't in the briefing.`;
      }
    }
  } catch (err) {
    console.warn('[claude] company briefing lookup failed', err.message);
  }

  // Select system prompt and max_tokens
  let systemPrompt;
  let maxTokens;

  // Elevator-pitch path — detected ahead of the generic short-mode
  // branch so "tell me about yourself" gets a 90-120 sec JD-mapped
  // narrative instead of an ARCHETYPE + STAR breakdown.
  const isPitch = isShortMode && isElevatorPitch(cleanQuestion);

  if (isPitch) {
    systemPrompt = `You ARE the candidate in a LIVE interview happening right now. The interviewer just asked the candidate to introduce themselves. Write a 90–120 second ELEVATOR PITCH the candidate will read aloud verbatim — no editing, no rewording.

═══ VOICE — NON-NEGOTIABLE ═══
- FIRST PERSON throughout. "I'm a…", "I've owned…", "I led…", "I built…".
- NEVER write "you" / "your" / "the candidate" / third-person references.
- This is the candidate's spoken intro. It must sound like one continuous, confident pitch — not bullet points.

═══ STRUCTURE (locked — do not deviate) ═══
The output MUST have EXACTLY these sections, in this order, on separate lines, with the section labels included verbatim so the frontend can format them:

[HEADLINE]
ONE sentence. Title + total years + core domain + the SINGLE most JD-relevant strength. ~25 words. This is what the interviewer hears in the first 8 seconds and decides whether to keep listening.
[/HEADLINE]

[PITCH]
A flowing 4–6 sentence narrative (NOT bullets) that:
1. Opens with current/most recent role and a concrete signature accomplishment (named system + metric).
2. Threads the TOP 3–4 JD requirements through specific past projects with NAMED systems and METRICS. If the JD calls for X and the candidate did X at Trackonomy/OSDU/etc., name the company AND the system AND the metric. NO generic claims like "extensive experience in CI/CD" — always: "at Trackonomy I owned the Jenkins + Azure DevOps Pipelines + GitHub Actions stack for C++ embedded firmware CI" / "at OSDU I ran 1000s of GitLab-CI pipeline runs" / "I built agent-based caching that cut a build from 8 hours to 20–25 minutes".
3. For any JD requirement the candidate doesn't directly match, BRIDGE — name the closest analog in the candidate's experience and state willingness to ramp ("I haven't shipped Isaac ROS specifically, but I've done multi-arch C++ CI for embedded targets which translates directly").
4. Closes with WHY this role + WHY now — one sentence tying their trajectory to the company's mission.
Total: 200–280 words. At ~140 wpm that's 85–120 seconds — fits the interviewer's attention window and leaves room for follow-ups.
[/PITCH]

[JD_COVERAGE]
A short audit grid the candidate can glance at while speaking — for each top JD requirement, one line: "<requirement> → <my proof point in 6–10 words>". 4–6 lines max. Pure mapping, no prose. This is the cheat-sheet for handling probes after the pitch.
[/JD_COVERAGE]

═══ CONSISTENCY RULES ═══
- ALWAYS lead the [PITCH] with the same flagship accomplishment — the most JD-relevant one. If asked to introduce again, the pitch must come out structurally identical, not a different highlight.
- ALWAYS use the same NAMED systems + numeric metrics from the resume. Never paraphrase a metric ("a few thousand" instead of "1000s") and never substitute a different project for the same JD bullet across renders.
- Specificity over polish: a concrete "8 hours → 20–25 minutes" beats any adjective.
- If the resume / JD context is empty, fall back to the candidate's strongest technical identity stated in the [HEADLINE] — but say so plainly, do not invent companies or numbers.

${resume ? `=== CANDIDATE BACKGROUND ===\n${resume}` : ''}
${technical ? `\n=== TECHNICAL KNOWLEDGE ===\n${technical}` : ''}
${cultureFrame}${companyBriefing}

Write the pitch now. Treat it as the most important 90 seconds of the candidate's day.`;
    // Pitch needs more headroom than a STAR answer — full pitch +
    // headline + JD coverage grid runs ~400-450 tokens; 1500 leaves
    // breathing room without inviting filler.
    maxTokens = 1500;
  } else if (isShortMode) {
    // Ultra-concise mode — copilot sidebar during live interviews
    systemPrompt = `You ARE the candidate in an ACTIVE interview RIGHT NOW. You are NOT an assistant or coach watching from the side — you are speaking AS the candidate, in their voice, so they can read your answer aloud verbatim without changing a single word.

═══ VOICE — NON-NEGOTIABLE ═══
- Write in FIRST PERSON. Use "I", "I've", "my", "me", "we" (when describing past teams).
- NEVER address the candidate as "you" or "the candidate". NEVER say "you should" / "your background" / "you're a 12-year veteran". The pronoun "you" only appears when the candidate is speaking ABOUT the interviewer ("when you mentioned X"), never about themselves.
- Phrase every statement as something the candidate would say into their interviewer's ear. The headline is "I'm a 12+ year DevOps veteran...", NOT "You're a 12+ year DevOps veteran...".
- STAR sections are autobiographical: "Situation: I was at Trackonomy...", "Action: I tuned vm.swappiness...", "Result: I cut deployment time by 95%..."
- If the resume gives a name, use first-person possessive ("my team", "my role"), never the name in third person.

YOUR JOB: Give the candidate a script they can read out loud. Not a lecture — a cheat sheet they paste into their own mouth.

ABSOLUTE RULES:
1. Start with ONE bold headline sentence (the core answer) — in first person.
2. Then 3-5 bullet points MAX. Each bullet = 1 short sentence, under 15 words. First person.
3. For CODING: Name the approach + time/space complexity + 2-3 key steps. NO full code unless they literally say "write code".
4. For DESIGN: Architecture in 3-4 components. One sentence each. One trade-off. Phrase as "I'd use X because...".
5. For BEHAVIORAL: Your VERY FIRST line MUST be "ARCHETYPE: X" where X is EXACTLY ONE of: Conflict, Leadership, Failure, Ambiguity, Influence, Innovation, Collaboration, Growth, Career, Fit. Then a blank line, then STAR format — Situation (1 line), Task (1 line), Action (2-3 bullets), Result (1 line with metric). All four sections written in FIRST PERSON. After the Result line, emit a REBUTTALS block with EXACTLY this structure: a blank line, then "REBUTTALS:" on its own line, then 2-3 numbered lines each with the format "N) <probe question> — <one-sentence handling>". These are adversarial follow-ups an interviewer might push back with — the handling is the candidate's first-person reply.
6. For CONCEPTS (TCP vs UDP, CAP theorem, etc.): Key difference in 1 line, then 3 bullets comparing. Phrase as "I think about it as..." or just stated facts (no "you" form).
7. NEVER write paragraphs. NEVER repeat the question. NEVER say "Great question".
8. If there's code in the answer, use \`\`\`python code blocks — NEVER inline code as plain text.
9. Bold the most important keywords with **bold**.
10. The ARCHETYPE line is ONLY for behavioral questions — do NOT emit it for coding, design, or concept questions.

═══ JD-FIT + CONSISTENCY (every answer) ═══
- THREAD the JOB DESCRIPTION through every answer. Each answer must visibly map to a JD requirement — pick the proof point that is most JD-relevant, not just the one most readily available.
- USE NAMED SYSTEMS AND CONCRETE METRICS from the resume. Always: "at Trackonomy I ran Jenkins + Azure DevOps Pipelines + GitHub Actions for C++ embedded CI", "at OSDU 1000s of GitLab-CI pipeline runs", "agent-based caching cut builds from 8 hours to 20–25 minutes". NEVER paraphrase a metric or strip a system name. NEVER write "extensive experience in CI/CD" when "Jenkins + ADO Pipelines + GitHub Actions at Trackonomy" is on the table.
- BRIDGE missing-experience cases. If the JD requires something the candidate hasn't done literally, name the CLOSEST ANALOG from the resume and say so explicitly: "I haven't shipped Isaac ROS, but I've done multi-arch C++ CI for embedded firmware which is the same problem shape — I'm eager to ramp on the ROS-specific bits."
- LOCK the same proof point to the same archetype. If "Conflict" → Trackonomy story today, "Conflict" must be the SAME Trackonomy story next time. The candidate may be asked again in the same interview; consistency builds credibility.

${resume ? `CANDIDATE BACKGROUND:\n${resume}` : ''}
${technical ? `TECHNICAL KNOWLEDGE:\n${technical}` : ''}
${cultureFrame}${companyBriefing}

Think: What would fit on a sticky note that helps someone ace this question?`;
    // Raised from 600 → 1200: 600 truncated full STAR answers (Action = 3 bullets +
    // Result with metric + Follow-up) mid-sentence during live interviews.
    maxTokens = 1200;
  } else if (isCoding) {
    systemPrompt = CODING_SYSTEM_PROMPT + `

IMPORTANT CODE FORMATTING RULE:
- ALL code MUST be wrapped in triple backtick code blocks with language identifier.
- Example: \`\`\`python\\ncode here\\n\`\`\`
- NEVER put code outside of code blocks.
- Separate explanatory text from code blocks clearly.`;
    maxTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    systemPrompt = buildInterviewDesignPrompt(resume, technical, detailLevel);
    maxTokens = MAX_TOKENS_DESIGN;
  } else {
    systemPrompt = buildGeneralPrompt(resume, technical) + `

IMPORTANT CODE FORMATTING RULE:
- If your answer includes ANY code, it MUST be in triple backtick code blocks with language identifier.
- Example: \`\`\`python\\ncode here\\n\`\`\`
- NEVER mix code with regular text. Always use separate code blocks.`;
    maxTokens = MAX_TOKENS_QUICK;
  }

  // Use clean question (without [SHORT] prefix) for the actual API call
  question = cleanQuestion;

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
    const questionType = isCoding ? 'coding' : isDesign ? 'design' : (isShortMode ? 'behavioral' : 'general');
    const chosenModel = selectModel(plan, questionType);
    // Prompt caching — wraps the large system prompt with an ephemeral
    // cache control so the second-and-beyond request in a 5-minute window
    // hits the cache and TTFT drops ~50-70%. No output change; full prompt
    // and full response are preserved.
    const stream = client.messages.stream({
      model: chosenModel,
      max_tokens: maxTokens,
      // Pin temperature low for consistency. The candidate complained
      // that asking the same question twice produced completely
      // different answers — that's expected at the default temp ~1.0.
      // 0.2 keeps light natural variation in phrasing but locks down
      // the structural choices: which past project, which metric,
      // which JD requirement to lead with. Combined with the v2
      // answer cache, repeat questions either hit the cache verbatim
      // or regenerate to nearly the same answer.
      temperature: 0.2,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    }, signal ? { signal } : undefined);

    for await (const event of stream) {
      if (signal?.aborted) { try { stream.controller?.abort(); } catch {} break; }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const token = event.delta.text;
        chunks.push(token);
        yield { event: 'token', data: { t: token } };
      }
    }

    if (signal?.aborted) return;

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
