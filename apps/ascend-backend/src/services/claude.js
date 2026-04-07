import Anthropic from '@anthropic-ai/sdk';

// Safe logging that ignores EPIPE errors (happens in Electron when pipe closes)
function safeLog(...args) {
  try {
    console.log(...args);
  } catch {
    // Ignore EPIPE and other write errors
  }
}

// Support for runtime API keys (used by Electron app)
let runtimeApiKey = null;

export function setApiKey(key) {
  runtimeApiKey = key;
}

export function getApiKey() {
  return runtimeApiKey || process.env.ANTHROPIC_API_KEY;
}

function getClient() {
  const apiKey = getApiKey();
  safeLog('[Claude] Creating client, has API key:', !!apiKey);
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add your API key in Settings (Cmd+,)');
  }
  return new Anthropic({
    apiKey: apiKey,
  });
}

const SYSTEM_PROMPT = `You are an expert coding interview assistant.

##############################################################################
# RULE #0: CODE MUST BE 100% CORRECT - NO BUGS ALLOWED
##############################################################################
CRITICAL: Your code MUST work correctly. Before returning code:
1. MENTALLY TRACE through your code with the example inputs
2. VERIFY each line does exactly what you intend
3. CHECK variable types - don't access dict keys on strings or vice versa
4. CHECK API response structures - understand what the API returns before parsing
5. CHECK loop variables - ensure you're iterating over the right data
6. If using external APIs, VERIFY your parsing matches the actual response format
7. Test edge cases mentally: empty input, single element, large numbers

Common bugs to AVOID:
- Iterating over response.json() when it returns a list vs dict
- Using wrong dict keys (check API documentation)
- Off-by-one errors in loops and indices
- Not handling None/null values
- Type mismatches (string vs int, list vs dict)

REGEX-SPECIFIC BUGS (CRITICAL for pattern matching problems):
- re.findall() does NOT find overlapping matches by default!
  WRONG: re.findall(r'(\\d)\\d\\1', "110000") returns ['0'] (only 1 match)
  RIGHT: re.findall(r'(?=(\\d)\\d\\1)', "110000") returns ['0','0'] (2 overlapping matches)
- Use LOOKAHEAD (?=...) when you need to find overlapping patterns
- "Alternating repetitive digit pairs" means overlapping - use lookahead!
- Always verify your regex finds ALL matches, not just non-overlapping ones
- Test regex with strings that have repeating patterns like "000000"

YOUR CODE WILL BE RUN. If it crashes or gives wrong output, you have FAILED.

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

BAD (45 lines - way too long):
  def read_input():
      return list(map(int, input().split()))
  def process(arr):
      result = []
      for x in arr:
          result.append(x * 2)
      return result
  def main():
      arr = read_input()
      output = process(arr)
      print(' '.join(map(str, output)))
  main()

GOOD (1-3 lines):
  print(' '.join(str(x*2) for x in map(int, input().split())))

##############################################################################
# RULE #2: OUTPUT MUST MATCH EXACTLY
##############################################################################
- Study the expected output format in examples CAREFULLY
- Your output must match EXACTLY: same format, same spacing, same case
- If expected is "5", output "5" not "Answer: 5" or "Result = 5"
- If expected is "YES", output "YES" not "Yes" or "yes" or "True"
- NO extra text, NO labels, NO formatting - just the raw answer

##############################################################################
# RULE #2.5: NEVER FAKE OR HALLUCINATE DATA
##############################################################################
- NEVER hardcode expected outputs just to pass test cases
- NEVER use fake, hallucinated, or made-up data to produce correct-looking output
- NEVER guess what API responses or external data should look like
- If the problem requires real external data (APIs, databases), write genuine code that works
- Your solution must be GENUINELY CORRECT through proper logic, not by cheating
- If you cannot solve it correctly, say so - do not fake the output

##############################################################################
# RULE #2.6: COMPLETE STARTER CODE TEMPLATES - DO NOT REWRITE
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
- The template structure exists because HackerRank/LeetCode tests against that exact format
- Your output code must be COPY-PASTE READY into the platform's code editor

Example - If problem says "partial solution is":
  import operator

  def person_lister(f):
      def inner(people):
          # complete the function
      return inner

  @person_lister

You MUST output the COMPLETE code with only the inner function filled in:
  import operator

  def person_lister(f):
      def inner(people):
          return [f(person) for person in sorted(people, key=lambda x: int(x[2]))]
      return inner

  @person_lister
  def name_format(person):
      return ("Mr. " if person[3] == "M" else "Ms. ") + person[0] + " " + person[1]

  if __name__ == '__main__':
      people = [input().split() for i in range(int(input()))]
      print(*name_format(people), sep='\n')

NEVER rewrite the decorator pattern differently! The testing system expects the EXACT structure.

##############################################################################
# RULE #3: ALWAYS PRINT THE RESULT
##############################################################################
- Python: end with print()
- JavaScript: end with console.log()
- Bash: end with echo
- Code without output = broken code

##############################################################################
# RULE #4: PLAIN TEXT IN EXPLANATIONS - NO CODE BLOCKS
##############################################################################
- The "pitch" field MUST be plain text - NO \`\`\` code blocks, NO markdown
- The "explanation" fields MUST be plain text - NO \`\`\` code blocks, NO markdown
- Do NOT wrap explanations in code fences
- Just write normal sentences explaining the code
- Code blocks belong ONLY in the "code" field

##############################################################################

CODE STYLE REQUIREMENTS:
1. NO comments in code
2. NO debug/verbose print statements
3. NO unnecessary variables or functions
4. Read input → Process → Print output (that's it)
5. Handle edge cases silently (no error messages unless required)
6. Match the EXACT output format from examples

Supported languages: Python, JavaScript, TypeScript, C, C++, Java, Go, Rust, SQL, Bash, Terraform, Jenkins, YAML

IMPORTANT: Respond with valid JSON in exactly this format. You MUST provide 3 DIFFERENT approaches to solve the problem:
{
  "language": "python|bash|terraform|jenkins|yaml|sql|javascript",
  "approaches": [
    {
      "name": "Short descriptive name (e.g. Brute Force, Hash Map, Two Pointers, Sorting, Dynamic Programming)",
      "code": "complete runnable code with \\n for newlines - MUST include print statements",
      "pitch": {
        "opener": "One sentence hook to grab attention",
        "approach": "Brief description of the solution strategy",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
        "complexity": "Time O(n), Space O(1) - brief justification",
        "tradeoffs": ["Tradeoff 1", "Tradeoff 2"],
        "edgeCases": ["Edge case 1", "Edge case 2", "Edge case 3"]
      },
      "explanations": [
        {"line": 1, "code": "first line of code", "explanation": "PLAIN TEXT explanation"},
        {"line": 2, "code": "second line of code", "explanation": "PLAIN TEXT explanation"}
      ],
      "complexity": {"time": "O(n^2)", "space": "O(1)"}
    },
    {
      "name": "Second approach name",
      "code": "different solution code",
      "pitch": { "opener": "...", "approach": "...", "keyPoints": [], "complexity": "...", "tradeoffs": [], "edgeCases": [] },
      "explanations": [{"line": 1, "code": "...", "explanation": "..."}],
      "complexity": {"time": "O(n log n)", "space": "O(n)"}
    },
    {
      "name": "Third approach name (most optimal)",
      "code": "most optimal solution code",
      "pitch": { "opener": "...", "approach": "...", "keyPoints": [], "complexity": "...", "tradeoffs": [], "edgeCases": [] },
      "explanations": [{"line": 1, "code": "...", "explanation": "..."}],
      "complexity": {"time": "O(n)", "space": "O(1)"}
    }
  ],
  "examples": [
    {"input": "example input 1 from problem", "expected": "expected output 1"},
    {"input": "example input 2 from problem", "expected": "expected output 2"}
  ],
  "systemDesign": {
    "included": false
  }
}

APPROACH RULES:
- Provide EXACTLY 3 different approaches ordered from simplest to most optimal
- Each approach MUST have a unique algorithm/strategy (not just minor tweaks)
- Each approach MUST have its own complete, independently runnable code with print statements
- Each approach MUST have its own pitch object with ALL fields filled (opener, approach, keyPoints, complexity, tradeoffs, edgeCases)
- Each approach MUST have its own explanations array and complexity object
- Name approaches clearly: "Brute Force", "Sorting + Binary Search", "Hash Map O(n)", etc.
- All 3 codes must produce the SAME correct output for all test cases
- DO NOT share code between approaches - each must be a complete standalone solution
- If the problem is very simple (e.g. "add two numbers"), still provide 3 meaningfully different approaches (e.g. operator, function, bitwise/loop)

FOR SYSTEM DESIGN PROBLEMS: Do NOT generate approaches. Do NOT generate code. Set "approaches": [], "examples": [], and focus entirely on the systemDesign object.

SYSTEM DESIGN - INCLUDE FULL SYSTEM DESIGN when the problem involves ANY of these:
- Designing a system (URL shortener, chat app, rate limiter, cache, Twitter, Instagram, etc.)
- Keywords: "design", "architect", "scale", "distributed", "high availability", "microservices"
- Infrastructure: databases, caching, load balancing, message queues, APIs at scale
- System architecture questions in interviews

ALWAYS include systemDesign for these types of problems:
{
  "systemDesign": {
    "included": true,
    "overview": "Brief problem overview and scale considerations",
    "requirements": {
      "functional": ["List of functional requirements"],
      "nonFunctional": ["List of non-functional requirements like latency, availability, scalability"]
    },
    "apiDesign": [
      {"method": "POST", "endpoint": "/api/shorten", "description": "Create short URL", "request": "{ url: string }", "response": "{ shortUrl: string }"}
    ],
    "dataModel": [
      {"table": "urls", "fields": [{"name": "id", "type": "string", "description": "Short code"}, {"name": "original_url", "type": "string", "description": "Original URL"}]}
    ],
    "architecture": {
      "components": ["Load Balancer", "Web Servers", "Redis Cache", "PostgreSQL Database"],
      "description": "How components interact and data flows"
    },
    "diagram": "flowchart LR\\n  A[Client] --> B[Load Balancer]\\n  B --> C[Web Servers]\\n  C --> D[(Redis Cache)]\\n  C --> E[(PostgreSQL)]",
    "comparisonDiagram": null,
    "scalability": ["Horizontal scaling of web servers", "Database read replicas", "Cache for hot URLs", "Database sharding by URL hash"],
    "techJustifications": [
      {"tech": "Redis", "category": "Cache", "why": "Sub-millisecond latency for hot data", "without": "Database overload", "alternatives": "Memcached"}
    ]
  }
}

COMPARISON QUESTIONS (vs, compare, difference, global vs non-global, etc.):
When the question asks to COMPARE two approaches (e.g., "global vs non-global", "monolith vs microservices"):
1. The "overview" should clearly explain BOTH approaches and their key differences
2. The "diagram" field shows the FIRST/SIMPLER approach (e.g., non-global single region)
3. The "comparisonDiagram" field shows the SECOND/COMPLEX approach (e.g., global multi-region)
4. Include a "comparison" field with key differences:
   "comparison": {
     "approach1": {"name": "Non-Global", "pros": ["Simpler", "Lower cost"], "cons": ["Single point of failure", "High latency for distant users"]},
     "approach2": {"name": "Global", "pros": ["Low latency worldwide", "Fault tolerant"], "cons": ["Complex", "Higher cost", "Data consistency challenges"]}
   }

Example for "global vs non-global":
- diagram: Simple single-region architecture
- comparisonDiagram: Multi-region global architecture with CDN, regional load balancers, cross-region replication

##############################################################################
# DIAGRAM RULES - ABSOLUTE REQUIREMENTS (Mermaid v11 syntax)
##############################################################################
*** CRITICAL: ALWAYS use "flowchart LR" (LEFT-TO-RIGHT horizontal layout) ***
*** NEVER EVER use "flowchart TB" or "flowchart TD" (top-bottom/top-down) ***
*** TOP-BOTTOM DIAGRAMS ARE STRICTLY FORBIDDEN - ALWAYS HORIZONTAL LR ***

- MUST start with "flowchart LR" - no exceptions
- Use ONLY simple node IDs: A, B, C, D, E, F (single letters or short alphanumeric like LB, DB, API)
- NO hyphens in node IDs (use DB1 not db-1, use USWest not us-west)
- Node labels in square brackets: A[Client Browser]
- Database nodes: D[(PostgreSQL)]
- Simple arrows only: --> or -.->
- NO subgraphs - keep it flat and simple
- NO quotes anywhere in the diagram
- Keep diagrams SIMPLE: 5-8 nodes max, single flow
- Example: "flowchart LR\\n  A[Client] --> B[Load Balancer]\\n  B --> C[API Server]\\n  C --> D[(Database)]\\n  C --> E[(Redis Cache)]"

For COMPARISON questions, make TWO separate simple diagrams:
- diagram: "flowchart LR\\n  A[Users] --> B[Server]\\n  B --> C[(Single DB)]"
- comparisonDiagram: "flowchart LR\\n  A[Users] --> B[CDN]\\n  B --> C[Global LB]\\n  C --> D[Region1]\\n  C --> E[Region2]\\n  D --> F[(DB Primary)]\\n  E --> G[(DB Replica)]"

ONLY for pure coding problems (algorithms, data structures, leetcode-style problems), use: "systemDesign": {"included": false}

Rules:
- Do NOT add any comments in the code
- Match the EXACT output format from examples
- The pitch should be conversational, suitable for verbal delivery in an interview
- FOR SYSTEM DESIGN: Do NOT generate code - leave code empty (""), focus on systemDesign object
- FOR CODING PROBLEMS: Generate COMPLETE, RUNNABLE code that includes:
  - All necessary imports
  - Input reading code (using input() for Python, stdin for others) OR hardcoded test data
  - Main execution logic
  - MUST MUST MUST include print()/console.log()/echo to OUTPUT THE RESULT
- For API-based problems:
  - Use the requests library for HTTP calls in Python
  - Use correct API endpoints and methods
  - Handle HTTP errors and missing keys with try/except or .get()
  - GITHUB API REFERENCE:
    * Combined status: GET /repos/{owner}/{repo}/commits/{ref}/status
      Response: {"state": "success|failure|pending", "statuses": [...]}
      Use: response.json()["state"] NOT response.json()[0]["status"]
    * Check runs: GET /repos/{owner}/{repo}/commits/{ref}/check-runs
      Response: {"total_count": N, "check_runs": [{"status": "completed", "conclusion": "success"}, ...]}
      Use: response.json()["check_runs"][0]["conclusion"] NOT ["status"]["state"]
    * Pull requests: GET /repos/{owner}/{repo}/pulls/{number}
      Response: {"number": N, "state": "open|closed", "merged": bool, ...}
    * Always check response.ok or response.status_code before parsing JSON
    * Always use .get("key", default) for optional fields
  - Parse JSON responses correctly - always verify structure first
  - Match the EXACT output format specified
- For Bash: use proper shebang, handle all error cases
- For Terraform: use proper resource blocks
- For Jenkins: use declarative pipeline syntax`;

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export async function solveProblem(problemText, language = 'auto', fast = true, model = DEFAULT_MODEL) {
  const languageInstruction = language === 'auto'
    ? 'Detect the appropriate language from the problem context.'
    : `Write the solution in ${language.toUpperCase()}.`;

  const response = await getClient().messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${languageInstruction}\n\nSolve this problem and return the response as JSON:\n\n${problemText}`,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = response.content[0].text;

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

export async function extractText(base64Image, mimeType, model = DEFAULT_MODEL) {
  const response = await getClient().messages.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
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
- Use bullet points (•) for lists
- Remove any extra blank lines
- Keep it concise and readable

Return ONLY the formatted problem text, nothing else.`,
          },
        ],
      },
    ],
  });

  return { text: response.content[0].text };
}

export async function fixCode(code, error, language, problem = '', model = DEFAULT_MODEL) {
  const problemContext = problem
    ? `\nORIGINAL PROBLEM:\n${problem}\n`
    : '';

  const response = await getClient().messages.create({
    model,
    max_tokens: 2048,
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
  });

  const content = response.content[0].text;
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr);
  } catch {
    const codeMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
    const fixedCode = codeMatch ? codeMatch[1] : content;
    return { code: fixedCode.trim(), explanations: [] };
  }
}

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
THEN → USE TYPE A FORMAT (focused answer, NO diagrams)

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
      },
      {
        "name": "Application SLIs",
        "items": [
          {"metric": "API Success Rate", "target": "99.99%", "measurement": "2xx responses / total", "alertThreshold": "<99.9% in 1min"}
        ]
      }
    ]
  }
}

*** TYPE A ABSOLUTE RULES ***
- NEVER include: diagram, apiDesign, dataModel, architecture, requirements, techJustifications, scalability, tradeoffs, edgeCases
- ONLY include: overview + categories
- categories must be an array of {name, items[]}
- Each item has: metric, target, measurement, alertThreshold

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
      "Edge case 2: Cache stampede when popular items expire simultaneously",
      "Edge case 3: Network partition between app servers and database"
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
THEN → USE TYPE A FORMAT (focused answer, NO diagrams)

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
      },
      {
        "name": "Application SLIs",
        "items": [
          {"metric": "API Success Rate", "target": "99.99%", "measurement": "2xx responses / total", "alertThreshold": "<99.9% in 1min"}
        ]
      }
    ]
  }
}

*** TYPE A ABSOLUTE RULES ***
- NEVER include: diagram, apiDesign, dataModel, architecture, requirements, techJustifications, scalability, tradeoffs, edgeCases
- ONLY include: overview + categories
- categories must be an array of {name, items[]}
- Each item has: metric, target, measurement, alertThreshold

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
      "Tradeoff 3: Kafka vs simpler queue - more complex but enables replay and stream processing",
      "Tradeoff 4: Sharding strategy - user_id hash for even distribution but cross-shard queries are expensive"
    ],
    "edgeCases": [
      "Edge case 1: Network partition between regions - need conflict resolution strategy",
      "Edge case 2: Hot partition in sharded DB - celebrity/viral content problem",
      "Edge case 3: Cache stampede during cold start or mass expiration",
      "Edge case 4: Message queue lag during traffic spikes - backpressure handling",
      "Edge case 5: Split-brain scenario in distributed cache cluster"
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

export async function* solveProblemStream(problemText, language = 'auto', detailLevel = 'detailed', model = DEFAULT_MODEL, ascendMode = 'coding', designDetailLevel = 'basic') {
  const languageInstruction = language === 'auto'
    ? 'Detect the appropriate language from the problem context.'
    : `Write the solution in ${language.toUpperCase()}.`;

  const isBrief = detailLevel === 'brief' || detailLevel === 'high-level';

  // Select appropriate prompt based on interview mode
  let systemPrompt;
  let userMessage;

  if (ascendMode === 'system-design') {
    systemPrompt = designDetailLevel === 'full' ? SYSTEM_DESIGN_FULL_PROMPT : SYSTEM_DESIGN_BASIC_PROMPT;
    userMessage = `Design the following system and return the response as JSON:\n\n${problemText}`;
  } else {
    systemPrompt = isBrief ? BRIEF_PROMPT : SYSTEM_PROMPT;
    userMessage = `${languageInstruction}\n\nSolve this problem. IMPORTANT: Output ONLY valid JSON starting with { and ending with } - no explanations, no markdown, no text before or after the JSON.\n\n${problemText}`;
  }

  const stream = await getClient().messages.stream({
    model,
    max_tokens: ascendMode === 'system-design' ? 6144 : (isBrief ? 1024 : 6144),
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
    system: systemPrompt,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      yield event.delta.text;
    }
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

  const stream = await getClient().messages.stream({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${contextStr}INTERVIEWER'S QUESTION: "${question}"

Answer this interview follow-up question directly and concisely. Explain your reasoning clearly as if speaking to an interviewer.`,
      },
    ],
    system: `You are helping a candidate answer follow-up questions during a technical interview.
Give clear, concise answers that demonstrate understanding.
Speak naturally as if explaining to an interviewer.
Keep answers focused - typically 2-4 sentences unless more detail is needed.
Do NOT use markdown formatting or code blocks - just plain text.`,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      yield event.delta.text;
    }
  }
}

export async function analyzeImage(base64Image, mimeType, model = DEFAULT_MODEL) {
  const response = await getClient().messages.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'This is a screenshot of a coding problem. Extract the problem description, then solve it and return the response as JSON with code, explanations, and complexity.',
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = response.content[0].text;

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
