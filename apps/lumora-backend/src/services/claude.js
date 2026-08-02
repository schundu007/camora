/**
 * Claude AI agent service — ported from Python claude_agent.py.
 *
 * Streams Claude responses via SSE-formatted events for the inference route.
 */
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from './adminConfig.js';
import { parseAnswer } from './answerParser.js';
import { buildCloudHint } from './cloudHint.js';

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

/** Select model by plan. Paid users get Sonnet for all question types. */
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

let _anthropicClient = null;
let _anthropicClientKey = null;
function getAnthropicClient() {
  const key = getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY;
  if (!_anthropicClient || key !== _anthropicClientKey) {
    _anthropicClient = new Anthropic(key ? { apiKey: key } : {});
    _anthropicClientKey = key;
  }
  return _anthropicClient;
}

let _geminiClient = null;
let _geminiClientKey = null;
function getGeminiClient() {
  const key = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_geminiClient || key !== _geminiClientKey) {
    _geminiClient = new GoogleGenerativeAI(key);
    _geminiClientKey = key;
  }
  return _geminiClient;
}

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
export function isElevatorPitch(question) {
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
8. ALWAYS respond in English — regardless of the language of the question or transcription.

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

// ── Per-archetype DEEPDESIGN section templates ─────────────────────
// Each archetype owns the body of the [DEEPDESIGN] block. Section
// names stay constant (the frontend renderer only knows HEADLINE/
// REQUIREMENTS/SCALEMATH/DEEPDESIGN/TRADEOFFS/EDGECASES/FOLLOWUP) —
// only the *content prompt inside* changes.
const DEEPDESIGN_SYSTEM = `[DEEPDESIGN]
1. LAYER TITLE
  - Key decision (max 10 words)
  - Key decision (max 10 words)
(5-6 layers covering CDN, LB, App, Cache, DB, Async — 2-3 bullets each, no explanatory sentences. VOICE: direct imperative only — NO "I would" / "I'd" / "I'd use". Start every bullet with an action verb: "Use managed Kubernetes", "Provision node groups for CPU+GPU", "Implement HPA autoscaling". Use CLOUD-PLATFORM-SPECIFIC service names per the CLOUD PLATFORM constraint at the top of this prompt.)
[/DEEPDESIGN]`;

const DEEPDESIGN_APPLICATION = `[DEEPDESIGN]
Cover the application design in 4-5 numbered sections. NO infra layers. 2-3 bullets each, max 10 words per bullet. VOICE: direct imperative only — NO "I would" / "I'd". Start every bullet with a verb: "Expose GET /items endpoint", "Use HashMap + DLL for O(1)", "Apply Strategy pattern for eviction".

1. API CONTRACT
  - Key method + signature (e.g. get(key) → value | null)
  - Idempotency or pagination decision if relevant

2. CLASS / MODULE STRUCTURE
  - Core classes and one-word responsibility each
  - Composition vs inheritance choice

3. DATA MODEL
  - In-memory structure (HashMap + DLL, Tree, Heap, etc.)
  - Why it hits the required complexity

4. DESIGN PATTERNS
  - Pattern name + one-word reason (e.g. Strategy — swappable eviction)

5. CONCURRENCY / THREAD-SAFETY
  - Locking strategy or lock-free choice (one line)
[/DEEPDESIGN]`;

const DEEPDESIGN_INFRASTRUCTURE = `[DEEPDESIGN]
Cover the infrastructure component in 5 numbered sections. 2-3 bullets each, max 10 words per bullet. VOICE: direct imperative only — NO "I would" / "I'd". Start every bullet with a verb: "Hash-route requests to cache shards", "Use gossip protocol for topology", "Enforce quorum writes for durability".

1. DATA PLANE
  - Hot path in one line (e.g. hash-route → cache shard → response)
  - Latency budget per hop

2. CONTROL PLANE
  - Topology management tool (gossip / ZK / etcd) + reason
  - Failure-detection mechanism (one line)

3. PARTITIONING
  - Strategy: hash / range / geo
  - Hot-key mitigation approach

4. REPLICATION & CONSISTENCY
  - Sync vs async + quorum size
  - Strong / eventual / causal choice + reason

5. FAILURE MODES
  - Node failure recovery (one line)
  - Partition behavior + cascading-failure guard
[/DEEPDESIGN]`;

const SCALEMATH_BLOCK = `[SCALEMATH]
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
[/SCALECALC]`;

const VALID_DESIGN_KINDS = new Set(['application', 'system', 'infrastructure']);

function deepDesignFor(kind) {
  if (kind === 'application') return DEEPDESIGN_APPLICATION;
  if (kind === 'infrastructure') return DEEPDESIGN_INFRASTRUCTURE;
  return DEEPDESIGN_SYSTEM;
}

function scaleMathFor(kind) {
  // Application design (LRU, parking lot, OOP) is sized by complexity,
  // not capacity — emitting QPS/DAU here pollutes the answer with
  // irrelevant numbers. Keep system + infrastructure symmetric so the
  // existing renderer + SCALECALC behavior is unchanged.
  if (kind === 'application') return '';
  return SCALEMATH_BLOCK;
}

const CLOUD_LABEL = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD_SERVICE_EXAMPLES = {
  aws: 'S3, DynamoDB, Lambda, SQS, ECS/Fargate, RDS, CloudFront, API Gateway, ElastiCache, MSK, EKS, ECR, Kinesis, CloudWatch',
  azure: 'AKS, Azure Blob Storage, Cosmos DB, Azure SQL Database, Azure Cache for Redis, Service Bus, Azure Container Registry, Azure Front Door, Azure Functions, Azure Monitor, Event Hubs, API Management, Key Vault',
  gcp: 'GKE, Cloud Storage, Firestore, Cloud SQL, Memorystore, Pub/Sub, Cloud Run, Artifact Registry, Cloud CDN, Cloud Monitoring, BigQuery, Secret Manager',
};
const CLOUD_FORBIDDEN = {
  aws: '',
  azure: 'NEVER write AWS names: S3, EC2, EKS, Lambda, SQS, DynamoDB, RDS, CloudFront, IAM, KMS, ElastiCache, MSK, ECR, Kinesis, CloudWatch.',
  gcp: 'NEVER write AWS names: S3, EC2, EKS, Lambda, SQS, DynamoDB, RDS, CloudFront, IAM, KMS, ElastiCache, MSK, ECR, Kinesis, CloudWatch. NEVER write Azure names.',
};

export function buildDesignPrompt(resume, technical, detailLevel = null, cloudProvider = 'aws', designKind = 'system') {
  const kind = VALID_DESIGN_KINDS.has(designKind) ? designKind : 'system';
  const isBasic = detailLevel === 'basic';
  const isFull = detailLevel === 'full';
  const cloudLabel = CLOUD_LABEL[cloudProvider] || 'AWS';
  const cloudServiceExamples = CLOUD_SERVICE_EXAMPLES[cloudProvider] || CLOUD_SERVICE_EXAMPLES.aws;
  const cloudForbidden = CLOUD_FORBIDDEN[cloudProvider] || '';
  const detailRules = isBasic
    ? `DETAIL MODE: BASIC — strip to essentials. Emit HEADLINE, ANSWER, REQUIREMENTS, TRADEOFFS, and DIAGRAM only. Skip SCALEMATH, SCALECALC, DEEPDESIGN, EDGECASES, and FOLLOWUP entirely. 2 bullets per section max.`
    : isFull
    ? `DETAIL MODE: FULL — emit every section. 3-4 bullets per section (DEEPDESIGN: 2-3 only), with numbers in SCALEMATH and named technologies in DEEPDESIGN.`
    : `DETAIL MODE: STANDARD — emit every section. 2-3 bullets per section.`;
  // Progressive disclosure: emit HEADLINE + REQUIREMENTS first so the
  // candidate can start speaking immediately while DEEPDESIGN streams.
  // This matches the "agentic multi-step" pattern from awesome-llm-apps —
  // produce useful output at each stage rather than waiting for the full answer.
  // Cloud-platform hint goes BEFORE the rest of the prompt so the model
  // treats service naming as a hard constraint (Cosmos DB, not DynamoDB,
  // when Azure is selected). Empty for AWS — the existing prompt is
  // already AWS-flavored.
  const cloudHint = buildCloudHint(cloudProvider);
  const cloudPrefix = cloudHint ? `${cloudHint}\n\n` : '';
  const scaleSection = scaleMathFor(kind);
  const deepSection = deepDesignFor(kind);
  return `${cloudPrefix}You ARE the candidate in a LIVE SYSTEM DESIGN interview happening right now. Speak AS the candidate, in their voice, so the candidate can read your output aloud verbatim. You are NOT a sidebar coach.

VOICE — NON-NEGOTIABLE:
- FIRST PERSON ONLY. Use "I", "I'd", "my", "we" (for past teams).
- NEVER write "you" / "your design" / "the candidate should". Architecture decisions are stated as "I'd use a CDN here because...", trade-offs as "I'd accept eventual consistency over strict because...".

CRITICAL RULES:
- ${detailRules}
- Each bullet: ONE short sentence (under 15 words).
- ${isBasic ? 'Only include the sections listed above in DETAIL MODE. Total answer must be readable in under 30 seconds.' : 'EVERY section below is REQUIRED — you MUST emit ALL of them: HEADLINE, REQUIREMENTS, SCALEMATH, SCALECALC, DEEPDESIGN, APIDESIGN, DATAMODEL, TECHNOLOGIES, CLOUDSERVICES, EDGECASES, TRADEOFFS, FOLLOWUP. Skipping any section is not allowed.'}
- ALWAYS respond in English — regardless of the language of the question or transcription.

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
${scaleSection ? '\n' + scaleSection + '\n' : ''}
[DIAGRAM]
skip
[/DIAGRAM]

${deepSection}

[APIDESIGN]
(RULES: List 3-6 key REST endpoints for this design. Format: METHOD /path: one-line description. Real HTTP methods only. No markdown.)
GET /example: description
POST /example: description
[/APIDESIGN]

[DATAMODEL]
(RULES: List 3-5 core entities. Format: EntityName: field1, field2, field3. Key fields only — 4-6 per entity. No markdown.)
EntityName: field1, field2, field3
EntityName: field1, field2, field3
[/DATAMODEL]

[TECHNOLOGIES]
(RULES: List 4-6 key technologies. Format: TechName: one-line rationale. Specific names only — e.g., PostgreSQL not "relational DB". No markdown.)
TechName: why it is chosen for this design
TechName: why it is chosen for this design
[/TECHNOLOGIES]

[CLOUDSERVICES]
(RULES: List 4-6 ${cloudLabel} services for this design. ${cloudLabel} NAMES ONLY. ${cloudForbidden} Use exact ${cloudLabel} service names — e.g.: ${cloudServiceExamples}. Never generic terms like "object storage" or "NoSQL database".)
<ServiceName>: its specific role in this design
<ServiceName>: its specific role in this design
<ServiceName>: its specific role in this design
[/CLOUDSERVICES]

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
- NEVER write "you" / "your solution" / "the candidate". The APPROACH is "I'd...", code is the candidate's own work.
- ALWAYS respond in English — regardless of the language of the question or transcription.

ANSWER THE ACTUAL QUESTION — SCOPE FIDELITY (this is the most important rule):
- Answer ONLY what was asked, at the scope it was asked. This is frequently a FOLLOW-UP about code already on screen, NOT a fresh problem to solve from scratch.
- If the question asks to ADD or CHANGE one thing ("how do I query the top 5", "make this handle 1M entries"), reply with the MINIMAL delta: a one-line approach + ONLY the new/changed lines of code. Do NOT restate or rewrite the whole existing solution.
- NEVER bolt on features the question did not ask for. "Handle 1M entries" does NOT license adding TTL expiration, threading/locks, sharding, a background cleanup thread, a min-heap, a demo main(), or benchmarks — the existing data structure almost always already scales. Add ONLY the one capability requested.
- No dataclasses, wrapper classes, extra helper functions, logging, or scaffolding the question doesn't require. If the honest answer is 5 lines, write 5 lines — never 50.

SECTIONS — EMIT ONLY THE ONES THIS QUESTION ACTUALLY NEEDS (never all of them by default):
Choose from the menu below, in this order, but include a section ONLY when it genuinely serves THIS question. A small follow-up is usually just [APPROACH] + a short [CODE] delta — nothing else. A fresh "solve this from scratch" question may warrant more. A wall of every section is unreadable mid-interview.

[PROBLEM] Restate inputs/outputs/constraints — ONLY for a fresh from-scratch problem. NEVER for a follow-up about existing code. [/PROBLEM]
[APPROACH] 1-2 sentences: what I'd do and why. Almost always include this. [/APPROACH]
[CODE lang=python] Minimal working code. For a modification, show ONLY the changed/added part, not the whole file. [/CODE]
[COMPLEXITY] TIME / SPACE — only when the question is about performance or the change affects complexity. [/COMPLEXITY]
[WALKTHROUGH] A short trace — only when the logic is non-obvious. [/WALKTHROUGH]
[EDGECASES] 2-3 bullets — only when edge handling is the point of the question. [/EDGECASES]
[TESTCASES] Input -> Output — only when asked to test or verify. [/TESTCASES]
[FOLLOWUP] Q/A — ONLY when the user explicitly asks for follow-up questions. Otherwise omit entirely. [/FOLLOWUP]

RULES: Code must be correct and runnable. First person. No markdown outside tags. Brevity and staying on-scope always win.`;

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
async function runSearch(question, history, plan) {
  try {
    const messages = [
      ...history.slice(-CONTEXT_TURNS),
      { role: 'user', content: question },
    ];

    // Use the paid-tier model when the caller is on a paid plan. The
    // search step grounds the answer; running it on Haiku for paid
    // users measurably degraded answer quality vs running on Sonnet.
    // Free callers keep Haiku to avoid double-charging.
    const searchModel = (plan && plan !== 'free') ? MODEL_PAID : MODEL;
    const response = await getAnthropicClient().messages.create({
      model: searchModel,
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
 * @param {string}   [options.retrievedContext] Pre-formatted grounding string from retrieval.js
 */
export async function* streamResponse(question, history, options = {}) {
  const {
    useSearch = false,
    resumeContext = null,
    technicalContext = null,
    systemContext = null,
    retrievedContext = null,
    detailLevel = null,
    responseFormat = null,
    plan = 'free',
    userId = null,
    // Cloud platform the candidate is interviewing for — drives service-name
    // choice in design answers (Cosmos DB vs DynamoDB vs Firestore). Sent
    // by the frontend from useCloudProvider; defaults to 'aws' to match
    // the existing AWS-flavored prompts.
    cloudProvider = 'aws',
    mode = 'general',
    // Optional AbortSignal passed from the route so a client disconnect can tear
    // down the Anthropic stream instead of letting it burn tokens to completion.
    signal = null,
  } = options;

  const startTime = performance.now();

  // Detect short mode prefix from copilot
  const isShortMode = question.startsWith('[SHORT] ');
  const cleanQuestion = isShortMode ? question.slice(8) : question;

  const isDesignHeuristic = isDesignQuestion(cleanQuestion);
  const isCodingHeuristic = !isDesignHeuristic && isCodingQuestion(cleanQuestion);
  const isBehavioral = mode === 'behavioral';
  const isDesign = mode === 'design' ? true : (mode === 'coding' || isBehavioral ? false : isDesignHeuristic);
  const isCoding = mode === 'coding' ? true : (mode === 'design' || isBehavioral ? false : isCodingHeuristic);

  // Resolve context — custom assistant context takes priority over defaults
  // Retrieved grounding (Capra KB + user Prep Kit chunks) is prepended
  // to the system context so the existing prompt assembly treats it
  // as part of the JD/resume context bundle. Empty string when retrieval
  // returned nothing or timed out.
  const groundedContext = retrievedContext
    ? `${retrievedContext}\n\n${systemContext || ''}`.trim()
    : systemContext;
  const resume = groundedContext || resumeContext || getDefaultResumeContext();
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
  // Fires for copilot [SHORT] prefix AND for live behavioral mode — the
  // UI sends mode='behavioral' without a [SHORT] prefix, so isShortMode
  // alone would always miss it.
  const isPitch = (isShortMode || isBehavioral) && isElevatorPitch(cleanQuestion);

  if (isPitch) {
    systemPrompt = `You ARE the candidate in a LIVE interview happening right now. The interviewer just asked the candidate to introduce themselves. Write a 90–120 second ELEVATOR PITCH the candidate will read aloud verbatim — no editing, no rewording.

═══ VOICE — NON-NEGOTIABLE ═══
- FIRST PERSON throughout. "I'm a…", "I've owned…", "I led…", "I built…".
- NEVER write "you" / "your" / "the candidate" / third-person references.
- This is the candidate's spoken intro. It must sound like one continuous, confident pitch — not bullet points.
- ALWAYS respond in English — regardless of the language of the question or transcription.

═══ STRUCTURE (locked — do not deviate) ═══
The output MUST have EXACTLY these sections, in this order, on separate lines, with the section labels included verbatim so the frontend can format them:

[HEADLINE]
ONE sentence. Title + total years + core domain + the SINGLE most JD-relevant strength. ~25 words. This is what the interviewer hears in the first 8 seconds and decides whether to keep listening.
[/HEADLINE]

[PITCH]
CRITICAL — DO NOT restate the [HEADLINE]. The pitch must NOT open with "I am/I'm a [title] with X years" — the interviewer just heard that. Repeating it is the #1 amateur mistake and wastes 8 seconds.

Open DIRECTLY with a named company + project + metric. First word should be "At", "In", or a verb ("I built…", "I led…", "I own…"). Shape: "At <employer from the resume>, I owned <the system> — <the named tools> — and I <the measured outcome>." Fill it from THIS resume; never from an example.

FORMAT — 4 labelled beats, each on its own line as a markdown bullet. This is a
spoken pitch the candidate reads aloud under pressure, so each bullet must be
1–2 COMPLETE, natural sentences they can say word-for-word — never fragments,
never note-form. The bullets exist so their eye can find its place mid-sentence;
read end to end the four beats must still flow as one continuous pitch.

Emit EXACTLY this shape:

- **<3-4 word label>** — <ONE short spoken sentence. COUNT THE WORDS AFTER THE
  EM DASH: 18 MAXIMUM. If it needs more, it is TWO beats — split it.>
  <the supporting detail: named systems, numbers, scale. MAX 25 words. Its own line.>

Two lines per beat, never one long run-on. The candidate glances down for half a
second: the label tells them which beat they are on, the first line is what they
SAY, the second line is what they reach for if the interviewer wants more. A
40-word unbroken sentence is unreadable at a glance and defeats the whole point.
- **<3-4 word label>** — <1-2 full spoken sentences>
- **<3-4 word label>** — <1-2 full spoken sentences>
- **<3-4 word label>** — <1-2 full spoken sentences>

The intro is SPOKEN, not presented. Write 3-5 short paragraphs of natural
first-person speech — the way a real person answers "tell me about yourself" out
loud. NOT bullets, NOT labels, NOT a slide. Someone reads this aloud verbatim and
it has to sound like them talking, not like them reading a deck.

Shape, in order:
1. Who I am now, in one or two sentences — title, years, the split of my
   background if it is unusual (research vs production, IC vs lead).
2. What I do today: employer, what I own end to end, the named systems, the
   scale. Concrete, in the terms the resume supports.
3. The part of the job I am accountable for beyond building — quality,
   compliance, security, mentoring — with the named tools.
4. Where I came from, briefly, and why that foundation is real.
5. One closing sentence tying the mix to what THIS role needs.

Rules for the prose:
- Simple English, short sentences, contractions. Speakable at 140 wpm.
- Every claim carries a named system or a real number from the resume. No
  adjectives standing in for evidence.
- No invented employers, tools, metrics or tenure. If the resume does not
  support a number, speak to scale in the terms it does support.
- Bold the key technical keywords so the eye catches them on a glance —
  platforms, languages, frameworks, architectures, governance tools.
- 220-320 words. That is 90-120 seconds of unhurried speech.
[/PITCH]

[JD_COVERAGE]
A short audit grid the candidate can glance at while speaking — for each top JD requirement, one line: "<requirement, trimmed to 5 words max> → <my proof point in 6-10 words>". 4-6 lines max. Pure mapping, no prose.
COUNT THE WORDS after each arrow. More than 10 and it stops being glanceable and becomes another paragraph to read — cut it to the named system plus the number. A line like "→ Built and scaled the ingestion platform from design through completion" is TOO LONG; "→ ingestion platform, design to prod" is right. This is a cheat-sheet for handling probes, not a second pitch.
[/JD_COVERAGE]

═══ CONSISTENCY RULES ═══
- ALWAYS lead the [PITCH] with the same flagship accomplishment — the most JD-relevant one. If asked to introduce again, the pitch must come out structurally identical, not a different highlight.
- ALWAYS use the same NAMED systems + numeric metrics from the resume. Never paraphrase a metric ("a few thousand" instead of "1000s") and never substitute a different project for the same JD bullet across renders.
- Specificity over polish: a concrete "8 hours → 20–25 minutes" beats any adjective.
- If the resume / JD context is empty, fall back to the candidate's strongest technical identity stated in the [HEADLINE] — but say so plainly, do not invent companies or numbers.

${resume ? `=== CANDIDATE BACKGROUND ===\n${resume}` : ''}
${technical ? `\n=== TECHNICAL KNOWLEDGE ===\n${technical}` : ''}
${cultureFrame}${companyBriefing}

TAGS ARE MANDATORY: wrap the pitch in [PITCH]...[/PITCH] and the grid in
[JD_COVERAGE]...[/JD_COVERAGE], exactly those spellings. The client turns them
into the section headings the candidate navigates by — without them everything
renders as one undifferentiated wall of text and the grid is indistinguishable
from the pitch.

Write the pitch now. Treat it as the most important 90 seconds of the candidate's day.`;
    // 260-word pitch + headline + JD grid ≈ 500-600 tokens; 2000 gives
    // room for the longer mandatory pitch without ever hitting the ceiling.
    maxTokens = 2000;
  } else if (isShortMode) {
    // Load behavioral story anchor — inject the best pre-parsed STAR story for
    // the detected archetype so Claude uses the exact right experience/metric
    // rather than re-discovering it from raw resume text. Fails silently.
    let storyAnchorBlock = '';
    try {
      const { buildStoryAnchorBlock } = await import('./storyAnchor.js');
      const anchor = await buildStoryAnchorBlock(userId, cleanQuestion);
      storyAnchorBlock = anchor.block;
    } catch {}

    // Ultra-concise mode — copilot sidebar during live interviews
    systemPrompt = `You ARE the candidate in an ACTIVE interview RIGHT NOW. You are NOT an assistant or coach watching from the side — you are speaking AS the candidate, in their voice, so they can read your answer aloud verbatim without changing a single word.

═══ VOICE — NON-NEGOTIABLE ═══
- Write in FIRST PERSON. Use "I", "I've", "my", "me", "we" (when describing past teams).
- NEVER address the candidate as "you" or "the candidate". NEVER say "you should" / "your background" / "you're a 12-year veteran". The pronoun "you" only appears when the candidate is speaking ABOUT the interviewer ("when you mentioned X"), never about themselves.
- Phrase every statement as something the candidate would say into their interviewer's ear. The headline is "I'm a 12+ year DevOps veteran...", NOT "You're a 12+ year DevOps veteran...".
- STAR sections are autobiographical: "Situation: I was at <employer>...", "Action: I <the specific thing I changed>...", "Result: I <the measured outcome>..." — every value taken from THIS resume.
- If the resume gives a name, use first-person possessive ("my team", "my role"), never the name in third person.

YOUR JOB: Give the candidate a script they can read out loud. Not a lecture — a cheat sheet they paste into their own mouth.

ABSOLUTE RULES:
1. Start with ONE bold headline sentence (the core answer) — in first person.
2. Then 3-5 bullet points MAX. Each bullet = 1 short sentence, under 15 words. First person.
3. For CODING: Name the approach + time/space complexity + 2-3 key steps. NO full code unless they literally say "write code".
4. For DESIGN: Architecture in 3-4 components. One sentence each. One trade-off. Phrase as "I'd use X because...".
5. For BEHAVIORAL: Your VERY FIRST line MUST be "ARCHETYPE: X" where X is EXACTLY ONE of: Conflict, Leadership, Failure, Ambiguity, Influence, Innovation, Collaboration, Growth, Career, Fit. Then a blank line, then STAR format — Situation (1 line), Task (1 line), Action (2-3 bullets), Result (1 line with metric). All four sections written in FIRST PERSON. After the Result line, emit a REBUTTALS block with EXACTLY this structure: a blank line, then "REBUTTALS:" on its own line, then 2-3 numbered lines each with the format "N) <probe question> — <one-sentence handling>". These are adversarial follow-ups an interviewer might push back with — the handling is the candidate's first-person reply.
6. For TECHNICAL / CONCEPT questions (how X works, "what happens when…", TCP vs UDP, CAP theorem, what kubectl apply does, etc.): ANSWER THE MECHANICS DIRECTLY AND CONFIDENTLY as a senior engineer who knows this cold — a 1-line core answer then 3-4 factual bullets of what ACTUALLY happens. NEVER disclaim ("I haven't worked with X", "that's outside my experience", "I'd defer to a specialist") and NEVER force resume tool names in. Stated facts, first person: "When I run kubectl apply, the API server validates the manifest, persists the desired state to etcd, and the controllers reconcile it — the scheduler places pods and kubelet pulls them onto nodes." A senior engineer answers the question asked; they do not deflect a knowledge question into a résumé pitch.
7. NEVER write paragraphs. NEVER repeat the question. NEVER say "Great question".
7z. DEPTH CONTROL — answer only what was asked, then STOP.
   • A tool / definition / "how do you do X" question → 2-5 sentences. Start
     directly with the tool or topic. No preamble, no textbook opening, no
     listing every related thing you know.
   • A complex question (architecture, modelling, tuning, governance design) →
     one or two sentences of summary FIRST, then the key points: approach,
     decisions, validation, impact.
   • HARD STOP: once the question is answered, stop. Do not add context nobody
     asked for. "Can you elaborate" is when the depth comes out — then give
     context, approach, key decisions and trade-offs, validation, outcome.
   • For technical answers the shape is: method or tool → where I used it →
     the decision I made → the outcome.
7y. RESUME TRUTH — never invent an employer, tool, project, responsibility or
   metric. When something is genuinely outside the resume, use one of exactly
   three moves, never a flat "I haven't done that":
   a) CLOSEST EXPERIENCE — "I haven't used X exactly, but I solved the same
      problem with Y — the concepts carry over directly…"
   b) PRINCIPLE-BASED — "I'd approach it by… " then design, validation,
      monitoring.
   c) LEARNING RAMP — map it to the equivalent pattern already run, prototype on
      one pipeline, standardise from there.
   Speak to scale only in the terms the resume supports.
7x. BOLD the key technical keywords — platforms, languages, frameworks,
   architectures, data-quality and governance tools. The candidate is scanning
   for them under pressure.
7a. WALKABLE FORMAT — the candidate is READING THIS WHILE BEING WATCHED. They
   glance down for half a second, catch a beat, and look back up. A 40-word
   bullet is unreadable in that half second no matter how good the content is.
   • HARD CAP: no bullet exceeds 20 words. Count them. A bullet that needs more
     is TWO bullets.
   • Lead each bullet with the 2-4 word HOOK the eye lands on, then an em dash,
     then the rest: "<the thing I owned> — <the systems>, <the scale>." The hook alone must be enough to speak from.
   • Metrics and system names stay — they are the value. Put them in the tail of
     the bullet, never in a preamble.
   • Never stack three clauses with semicolons into one bullet. Split them.
7b. "TELL ME ABOUT YOURSELF" / career-story / "walk me through your background"
   is a SPOKEN 60-90 SECOND ANSWER with a fixed shape. Emit exactly this, and
   label the beats so the candidate can find their place mid-sentence:
     NOW — what I do today, one line, with the current employer and scale.
     PAST — the one or two moves that got me here, one line each, with a metric.
     WHY HERE — why THIS role, tied to a named JD requirement, one line.
   Then STOP. No requirement-by-requirement mapping table, no six-line evidence
   list — that is a document, not something anyone can say out loud.
8. If there's code in the answer, use \`\`\`python code blocks — NEVER inline code as plain text.
9. ALWAYS respond in English — regardless of the language of the question or transcription.
9. Bold the most important keywords with **bold**.
10. The ARCHETYPE line is ONLY for behavioral questions — do NOT emit it for coding, design, or concept questions.

═══ JD-FIT + CONSISTENCY (every answer) ═══
- THREAD the JOB DESCRIPTION through every answer. Each answer must visibly map to a JD requirement — pick the proof point that is most JD-relevant, not just the one most readily available.
- USE NAMED SYSTEMS AND CONCRETE METRICS from the resume — the employer, the tools by name, the number. NEVER paraphrase a metric or strip a system name, and NEVER write a generic claim like "extensive experience in CI/CD" when the resume names the actual tools and the place they ran. Every name and number must come from THIS candidate's resume; if it is not there, do not say it.
- BRIDGE only for EXPERIENCE / behavioral gaps — questions about what the candidate has DONE ("have you shipped X?", "tell me about a time you used Y"). NEVER apply BRIDGE to a TECHNICAL-KNOWLEDGE question. "What happens when you apply a YAML with kubectl" asks HOW IT WORKS, not what you've shipped — answer the mechanics and never say "I haven't worked with Kubernetes."
- NEVER OPEN WITH THE GAP. A bridge answer that starts "I haven't worked with X directly" has already lost the interviewer — it reads as a refusal, and the useful 90% never gets heard. Order is mandatory: (1) SUBSTANCE FIRST — answer what was actually asked with real command of the tool: what it does, how you'd build with it, the specific pipeline/architecture you'd stand up; (2) then the CLOSEST REAL ANALOG from the resume, with named systems and metrics; (3) only then, if it is genuinely needed, ONE short clause acknowledging the specific gap and the ramp. Never more than one such clause, never as the first sentence, never as the whole answer.
  Shape — asked about a tool the resume does not name: open with how that tool actually works and how you'd build with it; then name the CLOSEST REAL ANALOG from this resume ("same orchestration and scheduling problem shape"); then at most one short clause on the ramp. NOT "I did not work on it directly."
- Never state or imply the candidate held a role, employer, or project that is not in the resume. Bridging means framing REAL adjacent work well — it never means inventing experience. Substance about a tool is knowledge, not a claim of having shipped it; state the knowledge freely and keep the ownership claims accurate.
- LOCK the same proof point to the same archetype. Whichever story answers "Conflict" today must be the SAME story next time. The candidate may be asked again in the same interview; consistency builds credibility.

${resume ? `CANDIDATE BACKGROUND:\n${resume}` : ''}
${technical ? `TECHNICAL KNOWLEDGE:\n${technical}` : ''}
${cultureFrame}${companyBriefing}
${storyAnchorBlock}
Think: What would fit on a sticky note that helps someone ace this question?`;
    // Raised from 600 → 1200: 600 truncated full STAR answers (Action = 3 bullets +
    // Result with metric + Follow-up) mid-sentence during live interviews.
    maxTokens = 1200;
  } else if (isCoding) {
    // CODING_SYSTEM_PROMPT is opinionated and doesn't read `resume`, so the
    // groundedContext woven into `resume` for general/design paths never
    // reaches coding answers. Prepend retrievedContext directly so coding
    // answers also benefit from Capra coding-topic chunks + user-doc grounding.
    const codingGrounding = retrievedContext
      ? `${retrievedContext}\n\n---\n\n`
      : '';
    const codingResumeBlock = resumeContext
      ? `\n\n=== CANDIDATE BACKGROUND ===\n${resumeContext.slice(0, 3000)}\nThread named projects and metrics into examples where relevant.`
      : '';
    systemPrompt = codingGrounding + CODING_SYSTEM_PROMPT + `

IMPORTANT CODE FORMATTING RULE:
- ALL code MUST be wrapped in triple backtick code blocks with language identifier.
- Example: \`\`\`python\\ncode here\\n\`\`\`
- NEVER put code outside of code blocks.
- Separate explanatory text from code blocks clearly.` + codingResumeBlock;
    maxTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    // Branch the design prompt by archetype. Frontend may pass an
    // explicit designKind (e.g. CodingSonaSidebar → 'application'); when
    // absent, classify from the question text. Defaults to 'system' so
    // existing distributed-system questions never regress.
    const { classifyDesignKind } = await import('./designKindClassifier.js');
    const resolvedKind = classifyDesignKind(cleanQuestion, options.designKind);
    systemPrompt = buildDesignPrompt(resume, technical, detailLevel, cloudProvider, resolvedKind);
    maxTokens = MAX_TOKENS_DESIGN;
  } else {
    let storyAnchorBlock = '';
    if (isBehavioral) {
      try {
        const { buildStoryAnchorBlock } = await import('./storyAnchor.js');
        const anchor = await buildStoryAnchorBlock(userId, cleanQuestion);
        storyAnchorBlock = anchor.block;
      } catch {}
    }
    const basePrompt = buildGeneralPrompt(resume, technical) + storyAnchorBlock + `

IMPORTANT CODE FORMATTING RULE:
- If your answer includes ANY code, it MUST be in triple backtick code blocks with language identifier.
- Example: \`\`\`python\\ncode here\\n\`\`\`
- NEVER mix code with regular text. Always use separate code blocks.`;

    if (responseFormat === 'detailed') {
      systemPrompt = basePrompt + `

RESPONSE FORMAT OVERRIDE — DETAILED MODE:
The user wants MORE GROUND COVERED. That means MORE BEATS, never LONGER ones —
this is still being read aloud in a live interview, off a glance.
- No bullet-point cap: use as many bullets as the depth needs.
- The 20-word cap per bullet STILL APPLIES. Depth comes from more bullets and
  from a short sub-line under a bullet, never from a 40-word sentence.
- Keep the hook — em dash — detail shape on every line.
- For BEHAVIORAL: give the full STAR narrative, but as more short beats:
  Situation and Task stay one line each, Action becomes 4-6 short bullets rather
  than 2-3 long ones, Result keeps its metric.
- For TECHNICAL: explain the "why" and the trade-offs as ADDITIONAL bullets.
- Thorough, yes. Unreadable-at-a-glance, never.`;
      maxTokens = MAX_TOKENS_DESIGN;
    } else if (responseFormat === 'star') {
      systemPrompt = basePrompt + `

RESPONSE FORMAT OVERRIDE — STAR MODE:
Regardless of question type, structure the answer using the STAR framework:
- SITUATION: 1-2 sentences — context, company, team, problem
- TASK: 1 sentence — your specific responsibility or goal
- ACTION: 3-5 bullets — concrete steps you took (first person, specific technologies/metrics)
- RESULT: 1-2 sentences — quantifiable outcome and impact
For technical questions, map STAR to the technical context (Situation = the problem, Task = the constraint, Action = the approach, Result = the outcome/trade-offs).`;
      maxTokens = MAX_TOKENS_QUICK;
    } else {
      systemPrompt = basePrompt;
      maxTokens = MAX_TOKENS_QUICK;
    }
  }

  // Use clean question (without [SHORT] prefix) for the actual API call
  question = cleanQuestion;

  // Build messages with history window
  let finalQuestion = question;

  // Web search if requested
  let searchContext = null;
  if (useSearch) {
    yield { event: 'status', data: { state: 'search', msg: 'Searching web...' } };
    searchContext = await runSearch(question, history, plan);
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
    const geminiModel = getGeminiClient().getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: { temperature: isShortMode ? 0.35 : 0.2 },
    });
    const geminiContents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
    }));
    const result = await geminiModel.generateContentStream({ contents: geminiContents });

    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      const token = chunk.text();
      if (token) {
        chunks.push(token);
        yield { event: 'token', data: { t: token } };
      }
    }

    if (signal?.aborted) return;

    const finalResponse = await result.response;
    const usage = finalResponse.usageMetadata;
    if (usage) {
      inputTokens = usage.promptTokenCount || 0;
      outputTokens = usage.candidatesTokenCount || 0;
    }
  } catch (err) {
    console.error('Gemini stream error:', err);
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

export { MODEL, selectModel, getAnthropicClient, isDesignQuestion, isCodingQuestion, buildGeneralPrompt, CODING_SYSTEM_PROMPT, getDefaultResumeContext, getDefaultTechnicalContext };
