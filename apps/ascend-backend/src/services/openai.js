import OpenAI from 'openai';

export function getApiKey() {
  return process.env.OPENAI_API_KEY;
}

function getClient() {
  return new OpenAI({
    apiKey: getApiKey(),
  });
}

// CODING ONLY - No system design, pure code generation
const CODING_PROMPT = `You are an expert coding interview assistant. Generate CODE ONLY - no system design.

##############################################################################
# RULE #1: MINIMAL CODE - AS FEW LINES AS POSSIBLE
##############################################################################
Your code must be EXTREMELY CONCISE:
- TARGET: 10-30 lines for most problems, 40 lines MAX for complex problems
- Use one-liners, list comprehensions, lambda functions
- Combine operations: input + process + output in minimal statements
- NO helper functions unless absolutely required for recursion/DP
- NO classes unless explicitly required
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
# RULE #3: ALWAYS PRINT THE RESULT
##############################################################################
- Python: end with print()
- JavaScript: end with console.log()
- Bash: end with echo
- Code without output = broken code

##############################################################################
# RULE #4: COMPLETE STARTER CODE TEMPLATES - DO NOT REWRITE
##############################################################################
CRITICAL: Detect and complete partial/starter code from the problem. This applies when:
1. The problem has a "STARTER CODE TEMPLATE" section, OR
2. The problem text contains partial code with markers like:
   - "# complete the function", "# your code here", "# TODO", "# implement"
   - "pass" statement as placeholder
   - "raise NotImplementedError"
   - A decorator followed by incomplete function (e.g., @decorator ... def inner(): # complete)
   - Explicit instructions like "partial solution is" or "given code template"

WHEN YOU DETECT PARTIAL CODE:
- You MUST complete the given template, NOT rewrite from scratch
- Keep ALL existing function signatures, decorators, imports EXACTLY as provided
- Only fill in the parts marked with comments like "# complete", "# TODO", "pass", etc.
- Do NOT change function names, parameter names, or return types
- Do NOT add new functions unless the template clearly expects it
- Do NOT remove or modify the decorator pattern if one exists
- Your output code must be COPY-PASTE READY into the platform's code editor

Example - If problem contains partial code:
  def person_lister(f):
      def inner(people):
          # complete the function
      return inner
  @person_lister

Complete it by ONLY filling in the inner function, keeping the exact structure!

Supported languages: Python, JavaScript, TypeScript, C, C++, Java, Go, Rust, SQL, Bash, Terraform, Jenkins, YAML

IMPORTANT: Respond with valid JSON. You MUST provide 3 DIFFERENT approaches:
{
  "language": "python|javascript|bash|etc",
  "approaches": [
    {
      "name": "Approach name (e.g. Brute Force)",
      "code": "complete runnable code with \\n for newlines",
      "pitch": "Brief explanation of this approach",
      "explanations": [{"line": 1, "code": "code line", "explanation": "what it does"}],
      "complexity": {"time": "O(n^2)", "space": "O(1)"}
    },
    {
      "name": "Second approach name",
      "code": "different solution",
      "pitch": "Brief explanation",
      "explanations": [{"line": 1, "code": "...", "explanation": "..."}],
      "complexity": {"time": "O(n log n)", "space": "O(n)"}
    },
    {
      "name": "Third approach (most optimal)",
      "code": "optimal solution",
      "pitch": "Brief explanation",
      "explanations": [{"line": 1, "code": "...", "explanation": "..."}],
      "complexity": {"time": "O(n)", "space": "O(1)"}
    }
  ],
  "examples": [{"input": "example input", "expected": "expected output"}]
}

Provide EXACTLY 3 different approaches ordered from simplest to most optimal. Each must have unique algorithm, complete independently runnable code with print statements, and its own explanations and complexity. All 3 must produce the same correct output.

Rules:
- Generate COMPLETE, RUNNABLE code
- Include all necessary imports
- Include input reading OR hardcoded test data
- MUST include print()/console.log() to OUTPUT THE RESULT
- Do NOT add any comments in the code
- Match the EXACT output format from examples`;

// System Design Basic Prompt - Single region, minimal architecture
const SYSTEM_DESIGN_BASIC_PROMPT = `You are an expert system design interview assistant.

##############################################################################
# STEP 1: DETERMINE QUESTION TYPE (MANDATORY)
##############################################################################

READ THE QUESTION CAREFULLY. Is it asking to:
A) Answer a specific question (SLIs, SLOs, metrics, concepts, tradeoffs, calculations)?
B) Design/build/architect a COMPLETE system from scratch?

IF THE QUESTION CONTAINS: "SLI", "SLO", "metrics", "availability", "99.9%", "define", "explain", "what is", "how does", "tradeoffs", "calculate"
AND DOES NOT CONTAIN: "design a", "build a", "architect a", "create a system"
THEN -> USE TYPE A FORMAT (focused answer, NO diagrams)

##############################################################################
# TYPE A: FOCUSED ANSWER (DEFAULT FOR CONCEPTUAL QUESTIONS)
##############################################################################

FOR QUESTIONS ABOUT: SLIs, SLOs, metrics, availability targets, concepts, tradeoffs, calculations

RETURN ONLY THIS FORMAT - NO DIAGRAMS, NO ARCHITECTURE, NO API DESIGN:
{
  "language": "text",
  "code": "",
  "pitch": "",
  "examples": [],
  "explanations": [],
  "complexity": {"time": "N/A", "space": "N/A"},
  "systemDesign": {
    "included": true,
    "focusedAnswer": true,
    "overview": "Brief context (1-2 sentences max)",
    "categories": [
      {
        "name": "Infrastructure SLIs",
        "items": [
          {"metric": "Server Uptime", "target": "99.99%", "measurement": "Health checks every 10s", "alertThreshold": "<99.95% in 5min"}
        ]
      }
    ]
  }
}

*** TYPE A ABSOLUTE RULES ***
- NEVER include: diagram, apiDesign, dataModel, architecture, requirements, techJustifications, scalability, tradeoffs, edgeCases
- ONLY include: overview + categories

##############################################################################
# TYPE B: FULL SYSTEM DESIGN (ONLY for "Design a...", "Build a...", "Architect a...")
##############################################################################

For BASIC system design (TYPE B only):
- Design a SINGLE-REGION, minimal architecture
- Focus on CORE functionality only - get the basics right
- Use SIMPLE database setup (single instance, no replication)
- Basic caching layer (single Redis instance)
- Straightforward API design with essential endpoints only
- NO redundancy complexity - keep it simple
- Skip advanced features like multi-region, sharding, etc.

CRITICAL: For EVERY technology/service you include (databases, caches, queues, etc.), you MUST explain WHY it's needed.

IMPORTANT: Do NOT generate code. Focus entirely on system design.

IMPORTANT: Generate fields in this EXACT ORDER to minimize interview latency:
1. First: All explanatory content (pitch, overview, requirements, architecture, techJustifications, scalability, tradeoffs, edgeCases)
2. Second: The diagram (ASCII/Mermaid format)
3. Last: API design and data model details

##############################################################################
# DIAGRAM RULES - ABSOLUTE REQUIREMENTS
##############################################################################
*** CRITICAL: ALWAYS use "flowchart LR" (LEFT-TO-RIGHT horizontal layout) ***
*** NEVER EVER use "flowchart TB" or "flowchart TD" (top-bottom/top-down) ***
*** TOP-BOTTOM DIAGRAMS ARE STRICTLY FORBIDDEN - ALWAYS HORIZONTAL LR ***

For TYPE B (full system design) ONLY, respond with valid JSON in exactly this format:
{
  "language": "text",
  "code": "",
  "pitch": "A 2-3 minute verbal explanation of your basic system design approach.",
  "examples": [],
  "explanations": [],
  "complexity": {"time": "N/A", "space": "N/A"},
  "systemDesign": {
    "included": true,
    "overview": "Brief problem overview focusing on core requirements",
    "requirements": {
      "functional": ["Core functional requirements only"],
      "nonFunctional": ["Basic performance requirements"]
    },
    "architecture": {
      "components": ["Load Balancer", "Web Server", "Database", "Cache"],
      "description": "Simple architecture flow description"
    },
    "techJustifications": [
      {"tech": "PostgreSQL", "why": "ACID compliance for transactional data, strong consistency for user data", "alternatives": "MySQL (similar), MongoDB (if schema flexibility needed)"},
      {"tech": "Redis", "why": "Sub-millisecond latency for hot data, reduces DB load by 80%+", "alternatives": "Memcached (simpler), local cache (if single server)"},
      {"tech": "Load Balancer", "why": "Distributes traffic, enables horizontal scaling, health checks", "alternatives": "DNS round-robin (simpler but less control)"}
    ],
    "scalability": ["Basic horizontal scaling strategies"],
    "tradeoffs": [
      "Tradeoff 1: SQL vs NoSQL - chose SQL for ACID guarantees but sacrifices horizontal write scaling",
      "Tradeoff 2: Single region - simpler but higher latency for distant users"
    ],
    "edgeCases": [
      "Edge case 1: Database connection pool exhaustion under load spikes",
      "Edge case 2: Cache stampede when popular items expire simultaneously"
    ],
    "diagram": "flowchart LR\\n  A[Client] --> B[Load Balancer]\\n  B --> C[Web Server]\\n  C --> D[(Database)]\\n  C --> E[(Cache)]",
    "apiDesign": [
      {"method": "POST", "endpoint": "/api/endpoint", "description": "Description", "request": "{}", "response": "{}"}
    ],
    "dataModel": [
      {"table": "tablename", "fields": [{"name": "field", "type": "type", "description": "desc"}]}
    ]
  }
}`;

// System Design Full Prompt - Multi-region, highly available
const SYSTEM_DESIGN_FULL_PROMPT = `You are an expert system design interview assistant.

##############################################################################
# STEP 1: DETERMINE QUESTION TYPE (MANDATORY)
##############################################################################

READ THE QUESTION CAREFULLY. Is it asking to:
A) Answer a specific question (SLIs, SLOs, metrics, concepts, tradeoffs, calculations)?
B) Design/build/architect a COMPLETE system from scratch?

IF THE QUESTION CONTAINS: "SLI", "SLO", "metrics", "availability", "99.9%", "define", "explain", "what is", "how does", "tradeoffs", "calculate"
AND DOES NOT CONTAIN: "design a", "build a", "architect a", "create a system"
THEN -> USE TYPE A FORMAT (focused answer, NO diagrams)

##############################################################################
# TYPE A: FOCUSED ANSWER (DEFAULT FOR CONCEPTUAL QUESTIONS)
##############################################################################

FOR QUESTIONS ABOUT: SLIs, SLOs, metrics, availability targets, concepts, tradeoffs, calculations

RETURN ONLY THIS FORMAT - NO DIAGRAMS, NO ARCHITECTURE, NO API DESIGN:
{
  "language": "text",
  "code": "",
  "pitch": "",
  "examples": [],
  "explanations": [],
  "complexity": {"time": "N/A", "space": "N/A"},
  "systemDesign": {
    "included": true,
    "focusedAnswer": true,
    "overview": "Brief context (1-2 sentences max)",
    "categories": [
      {
        "name": "Infrastructure SLIs",
        "items": [
          {"metric": "Server Uptime", "target": "99.99%", "measurement": "Health checks every 10s", "alertThreshold": "<99.95% in 5min"}
        ]
      }
    ]
  }
}

*** TYPE A ABSOLUTE RULES ***
- NEVER include: diagram, apiDesign, dataModel, architecture, requirements, techJustifications, scalability, tradeoffs, edgeCases
- ONLY include: overview + categories

##############################################################################
# TYPE B: FULL SYSTEM DESIGN (ONLY for "Design a...", "Build a...", "Architect a...")
##############################################################################

For FULL/DETAILED system design (TYPE B only):
- Design a MULTI-REGION, highly available architecture
- Include database REPLICATION and SHARDING strategies
- Add CDN, edge caching, global load balancing
- Include FAILURE HANDLING, circuit breakers, retry logic
- Add RATE LIMITING, monitoring, observability
- Provide DETAILED scalability analysis with numbers
- Consider data consistency models (eventual vs strong)
- Include message queues for async processing
- Add backup and disaster recovery strategies

CRITICAL: For EVERY technology/service you include, you MUST explain:
1. WHY this technology is needed (what problem it solves)
2. WHY this specific choice over alternatives
3. What happens WITHOUT this component

IMPORTANT: Do NOT generate code. Focus entirely on system design.

IMPORTANT: Generate fields in this EXACT ORDER to minimize interview latency:
1. First: All explanatory content (pitch, overview, requirements, architecture, techJustifications, scalability, tradeoffs, edgeCases)
2. Second: The diagram (ASCII/Mermaid format)
3. Last: API design and data model details

##############################################################################
# DIAGRAM RULES - ABSOLUTE REQUIREMENTS
##############################################################################
*** CRITICAL: ALWAYS use "flowchart LR" (LEFT-TO-RIGHT horizontal layout) ***
*** NEVER EVER use "flowchart TB" or "flowchart TD" (top-bottom/top-down) ***
*** TOP-BOTTOM DIAGRAMS ARE STRICTLY FORBIDDEN - ALWAYS HORIZONTAL LR ***

For TYPE B (full system design) ONLY, respond with valid JSON in exactly this format:
{
  "language": "text",
  "code": "",
  "pitch": "A 5-7 minute comprehensive verbal explanation of your full system design.",
  "examples": [],
  "explanations": [],
  "complexity": {"time": "N/A", "space": "N/A"},
  "systemDesign": {
    "included": true,
    "overview": "Comprehensive problem overview with scale considerations (QPS, storage, bandwidth)",
    "requirements": {
      "functional": ["Detailed functional requirements"],
      "nonFunctional": ["Latency targets", "Availability (99.9%+)", "Scalability goals", "Data consistency requirements"]
    },
    "architecture": {
      "components": ["CDN", "Global Load Balancer", "Regional LBs", "Web Servers", "Cache Cluster", "Primary DB", "Read Replicas", "Message Queue", "Workers", "Object Storage"],
      "description": "Detailed multi-region architecture with failover"
    },
    "techJustifications": [
      {"tech": "Kafka", "category": "Message Queue", "why": "High-throughput event streaming (millions/sec), durability with replication, replay capability for data recovery", "without": "Direct DB writes would bottleneck at 10K writes/sec, losing async processing capability", "alternatives": "RabbitMQ (lower throughput), SQS (simpler but AWS-only), Redis Streams (lighter but less durable)"},
      {"tech": "Redis Cluster", "category": "Cache", "why": "Sub-millisecond reads (<1ms), reduces DB load by 90%, supports distributed locking and rate limiting", "without": "DB would handle 10x more reads, p99 latency jumps from 5ms to 50ms+", "alternatives": "Memcached (no persistence), Hazelcast (more features, more complex)"},
      {"tech": "PostgreSQL", "category": "Primary Database", "why": "ACID transactions, complex queries with JOINs, strong consistency for financial/user data, mature replication", "without": "NoSQL would require application-level transactions, eventual consistency issues", "alternatives": "MySQL (similar), CockroachDB (distributed SQL), Vitess (MySQL sharding)"},
      {"tech": "Elasticsearch", "category": "Search", "why": "Full-text search with relevance scoring, sub-100ms search across billions of documents, faceted search", "without": "SQL LIKE queries are O(n), unusable beyond 1M rows", "alternatives": "Solr (similar), Algolia (managed, expensive), PostgreSQL FTS (limited scale)"},
      {"tech": "InfluxDB", "category": "Time-Series DB", "why": "Optimized for time-series writes (100K+ points/sec), automatic downsampling, efficient range queries", "without": "PostgreSQL time-series queries are 10-100x slower, storage 5x larger", "alternatives": "TimescaleDB (PostgreSQL extension), Prometheus (pull-based), ClickHouse (analytics)"},
      {"tech": "CDN", "category": "Edge Cache", "why": "Serves static content from 200+ edge locations, reduces origin load by 95%, improves global latency from 200ms to 20ms", "without": "All requests hit origin, 10x higher infrastructure cost, poor global UX", "alternatives": "CloudFront, Fastly, Akamai - all similar capabilities"},
      {"tech": "Load Balancer", "category": "Traffic Management", "why": "Distributes load across servers, health checks with automatic failover, SSL termination, rate limiting", "without": "Single server = single point of failure, no horizontal scaling", "alternatives": "HAProxy (OSS), Nginx (OSS), cloud LBs (managed)"}
    ],
    "scalability": ["Horizontal scaling with auto-scaling groups", "Database sharding by user_id/hash", "Cache cluster with consistent hashing", "CDN for static content", "Async processing via message queues", "Read replicas for read-heavy workloads"],
    "tradeoffs": [
      "Tradeoff 1: Strong vs eventual consistency - chose eventual for availability but requires conflict resolution",
      "Tradeoff 2: Multi-region complexity vs latency - higher ops cost but sub-100ms global latency",
      "Tradeoff 3: Kafka vs simpler queue - more complex but enables replay and stream processing"
    ],
    "edgeCases": [
      "Edge case 1: Network partition between regions - need conflict resolution strategy",
      "Edge case 2: Hot partition in sharded DB - celebrity/viral content problem",
      "Edge case 3: Cache stampede during cold start or mass expiration"
    ],
    "diagram": "flowchart LR\\n  CDN[CDN] --> LB1[LB Region1]\\n  CDN --> LB2[LB Region2]\\n  subgraph Region1[Region 1]\\n    LB1 --> WS1[Web Servers]\\n    WS1 --> Cache1[(Redis)]\\n    WS1 --> DB1[(Primary DB)]\\n  end\\n  subgraph Region2[Region 2]\\n    LB2 --> WS2[Web Servers]\\n    WS2 --> Cache2[(Redis)]\\n    WS2 --> DB2[(Replica)]\\n  end\\n  DB1 -.-> DB2",
    "apiDesign": [
      {"method": "POST", "endpoint": "/api/endpoint", "description": "Full description with rate limits", "request": "{detailed request}", "response": "{detailed response}"}
    ],
    "dataModel": [
      {"table": "tablename", "fields": [{"name": "field", "type": "type", "description": "desc with indexing strategy"}]}
    ]
  }
}`;

const BRIEF_PROMPT = `You are an expert coding interview assistant. Return ONLY the code solution.

##############################################################################
# STRICT CODE LENGTH: TARGET 5-20 LINES MAXIMUM
##############################################################################
- AIM FOR 5-15 LINES of actual code (excluding blank lines)
- NEVER exceed 20 lines unless absolutely impossible to solve otherwise
- Use one-liners, list comprehensions, built-in functions
- Combine operations: read input + process + print in minimal statements
- NO helper functions - solve directly
- NO classes unless the problem explicitly requires OOP
- NO imports unless absolutely necessary (prefer built-ins)

EXAMPLE - BAD (too long):
def solve(arr):
    result = []
    for item in arr:
        if item > 0:
            result.append(item * 2)
    return result
arr = list(map(int, input().split()))
output = solve(arr)
print(' '.join(map(str, output)))

EXAMPLE - GOOD (minimal):
print(' '.join(str(x*2) for x in map(int, input().split()) if x > 0))

OUTPUT FORMAT:
- Output ONLY valid JSON: {"language": "python", "code": "the code"}
- NO comments, NO explanations, NO pitch
- Output MUST match expected format EXACTLY

INTEGRITY:
- NEVER hardcode outputs or fake data
- Solution must be genuinely correct`;

const DEFAULT_MODEL = 'gpt-4o';

export async function solveProblem(problemText, language = 'auto', fast = true, model = DEFAULT_MODEL) {
  const languageInstruction = language === 'auto'
    ? 'Detect the appropriate language from the problem context.'
    : `Write the solution in ${language.toUpperCase()}.`;

  const response = await getClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CODING_PROMPT },
      {
        role: 'user',
        content: `${languageInstruction}\n\nSolve this problem and return the response as JSON:\n\n${problemText}`,
      },
    ],
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (error) {
    return {
      code: content,
      explanations: [{ line: 1, code: content, explanation: 'Raw response from AI' }],
      complexity: { time: 'Unknown', space: 'Unknown' },
    };
  }
}

export async function* solveProblemStream(problemText, language = 'auto', detailLevel = 'detailed', model = DEFAULT_MODEL, ascendMode = 'coding', designDetailLevel = 'basic') {
  const languageInstruction = language === 'auto'
    ? 'Detect the appropriate language from the problem context.'
    : `Write the solution in ${language.toUpperCase()}.`;

  const isBrief = detailLevel === 'brief' || detailLevel === 'high-level';

  // Select appropriate prompt based on interview mode
  let systemPrompt;
  let userMessage;

  if (ascendMode === 'system-design') {
    // DESIGN MODE - System design only, no code
    systemPrompt = designDetailLevel === 'full' ? SYSTEM_DESIGN_FULL_PROMPT : SYSTEM_DESIGN_BASIC_PROMPT;
    userMessage = `Design the following system and return the response as JSON:\n\n${problemText}`;
  } else {
    // CODING MODE - Code only, no system design
    systemPrompt = isBrief ? BRIEF_PROMPT : CODING_PROMPT;
    userMessage = `${languageInstruction}\n\nSolve this coding problem and return the response as JSON:\n\n${problemText}`;
  }

  const stream = await getClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    max_tokens: ascendMode === 'system-design' ? 6144 : (isBrief ? 1024 : 6144),
    response_format: { type: 'json_object' },
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function extractText(base64Image, mimeType, model = DEFAULT_MODEL) {
  const response = await getClient().chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: `Extract the coding problem from this image and format it clearly.

Format the output as follows:
- Start with the problem title/description
- Use "Input:" and "Output:" headings for I/O format
- Use "Example:" or "Examples:" for test cases
- Use "Constraints:" for any constraints
- Use bullet points for lists
- Remove any extra blank lines
- Keep it concise and readable

Return ONLY the formatted problem text, nothing else.`,
          },
        ],
      },
    ],
    max_completion_tokens: 2048,
  });

  return { text: response.choices[0].message.content };
}

export async function fixCode(code, error, language, problem = '', model = DEFAULT_MODEL) {
  const problemContext = problem
    ? `\nORIGINAL PROBLEM:\n${problem}\n`
    : '';

  const response = await getClient().chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: `Fix this ${language} code based on the feedback/error provided.
${problemContext}
CODE:
\`\`\`${language}
${code}
\`\`\`

FEEDBACK/ERROR:
${error}

Return a JSON object with:
{
  "code": "the complete fixed code as a string",
  "explanations": [
    {"line": 1, "code": "first line of code", "explanation": "what this line does"},
    {"line": 2, "code": "second line of code", "explanation": "what this line does"}
  ]
}

IMPORTANT:
- Fix the code based on the feedback
- Do NOT add comments in the code
- Provide line-by-line explanations for the FIXED code
- Keep explanations concise`,
      },
    ],
    max_completion_tokens: 2048,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch {
    const codeMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
    const fixedCode = codeMatch ? codeMatch[1] : content;
    return { code: fixedCode.trim(), explanations: [] };
  }
}

// Follow-up question prompt for system design interviews
const FOLLOW_UP_PROMPT = `You are an expert system design interviewer assistant. The candidate has presented a system design, and the interviewer is asking a follow-up question.

Your job is to:
1. ANSWER the interviewer's question DIRECTLY and SPECIFICALLY - match your answer exactly to what was asked
2. UPDATE the system design to incorporate any changes implied by the question/answer
3. Be CONCISE but THOROUGH - answer like a senior engineer in an interview

IMPORTANT GUIDELINES:
- Answer the EXACT question asked - don't go off-topic
- If asked about failure handling, focus on failure scenarios
- If asked about scaling, focus on scaling strategies
- If asked about a specific component, deep-dive on that component
- If asked "how would you...", give a specific approach, not generic advice
- Update ONLY the relevant parts of the system design
- Keep the answer conversational - suitable for verbal delivery

Respond with valid JSON:
{
  "answer": "Your direct, specific answer to the interviewer's question. This should be 2-4 paragraphs, conversational, and exactly match what was asked. Include specific technical details.",
  "updatedDesign": {
    // The COMPLETE updated system design object with any modifications
    // Include ALL fields from the original design, updating only what changed
    "included": true,
    "overview": "...",
    "requirements": {...},
    "apiDesign": [...],
    "dataModel": [...],
    "architecture": {...},
    "diagram": "...",
    "scalability": [...]
  },
  "changesApplied": ["List of specific changes made to the design based on this question"]
}`;

export async function* answerFollowUpQuestion(question, context, model = DEFAULT_MODEL) {
  // Build context string based on what's available
  let contextStr = '';

  if (context.problem) {
    contextStr += `PROBLEM:\n${context.problem}\n\n`;
  }
  if (context.pitch) {
    contextStr += `APPROACH:\n${context.pitch}\n\n`;
  }
  if (context.code) {
    contextStr += `CODE SOLUTION:\n${context.code}\n\n`;
  }
  if (context.systemDesign) {
    contextStr += `SYSTEM DESIGN:\n${JSON.stringify(context.systemDesign, null, 2)}\n\n`;
  }

  // Use gpt-4o-mini for faster responses (Q&A doesn't need the smartest model)
  const fastModel = 'gpt-4o-mini';

  const stream = await getClient().chat.completions.create({
    model: fastModel,
    messages: [
      {
        role: 'system',
        content: `You are helping a candidate answer follow-up questions during a technical interview.
Give clear, concise answers that demonstrate understanding.
Speak naturally as if explaining to an interviewer.
Keep answers focused - typically 2-4 sentences unless more detail is needed.
Do NOT use markdown formatting or code blocks - just plain text.`
      },
      {
        role: 'user',
        content: `${contextStr}INTERVIEWER'S QUESTION: "${question}"

Answer this interview follow-up question directly and concisely. Explain your reasoning clearly as if speaking to an interviewer.`,
      },
    ],
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export async function analyzeImage(base64Image, mimeType, model = DEFAULT_MODEL) {
  const response = await getClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CODING_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: 'This is a screenshot of a coding problem. Extract the problem description, then solve it and return the response as JSON with code, explanations, and complexity.',
          },
        ],
      },
    ],
    max_completion_tokens: 2048,
  });

  const content = response.choices[0].message.content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    return {
      code: content,
      explanations: [{ line: 1, code: content, explanation: 'Raw response from AI' }],
      complexity: { time: 'Unknown', space: 'Unknown' },
    };
  }
}
