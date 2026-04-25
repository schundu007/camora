// Section-specific prompts (extracted from services/ascendPrep.js)
export const SECTION_PROMPTS = {
  pitch: `Generate a compelling 2-minute elevator pitch for this candidate based on their resume and the job description.

CRITICAL JD ALIGNMENT:
- Carefully analyze the JOB DESCRIPTION to identify the TOP 3-4 required skills/experiences
- From the RESUME, find specific achievements that DIRECTLY match those JD requirements
- Every achievement mentioned MUST tie back to a JD requirement
- Use keywords and terminology from the JD
- If the JD mentions specific tech (AWS, Python, etc.), highlight matching experience

CRITICAL: The pitch must be SPEAKABLE - write it as if the candidate will READ IT OUT LOUD to the interviewer.
- Use conversational language, not bullet points of facts
- Write complete sentences that flow naturally when spoken
- Include natural transitions between sections
- Make it personal and authentic, not robotic

Structure as 5 SECTIONS (each section = what to SAY, not notes about what to say):

1. OPENING HOOK (15-20 seconds) - A confident intro that mentions skills MATCHING the JD
2. KEY ACHIEVEMENT #1 (30-40 seconds) - Tell a mini-story about an accomplishment that DIRECTLY matches a JD requirement
3. KEY ACHIEVEMENT #2 (30-40 seconds) - Another example that matches a DIFFERENT JD requirement
4. WHY THIS COMPANY (20-30 seconds) - Genuine enthusiasm for THIS specific company and role
5. CLOSING (10-15 seconds) - Summarize how your skills match THEIR specific needs

Each section should have 2-4 SPEAKABLE sentences (not bullet points).

Return JSON:
{
  "pitchSections": [
    {
      "title": "Opening Hook",
      "duration": "15-20 seconds",
      "bullets": [
        "Hi, I'm [Name]. I'm a [title] with [X] years of experience building [specific expertise].",
        "What excites me most is [genuine passion related to role].",
        "I've helped companies like [example] achieve [specific result]."
      ]
    },
    {
      "title": "Key Achievement #1",
      "duration": "30-40 seconds",
      "context": "[Company/Project context in 5 words]",
      "bullets": [
        "At [Company], I led a project to [specific challenge].",
        "I [specific action 1] and [specific action 2].",
        "This resulted in [quantified outcome] - a [X%] improvement.",
        "What I learned was [brief insight]."
      ]
    },
    {
      "title": "Key Achievement #2",
      "duration": "30-40 seconds",
      "context": "[Company/Project context in 5 words]",
      "bullets": [
        "Another example that's relevant here is when I [challenge].",
        "I took initiative to [specific action].",
        "The impact was [measurable result]."
      ]
    },
    {
      "title": "Why This Company",
      "duration": "20-30 seconds",
      "bullets": [
        "What draws me to [Company] specifically is [genuine reason - their product/mission/impact].",
        "I've been following [specific thing about company] and I'm impressed by [detail].",
        "I believe my experience in [X] would help with [their specific challenge/goal]."
      ]
    },
    {
      "title": "Closing",
      "duration": "10-15 seconds",
      "bullets": [
        "In short, I bring [key strength] combined with [second strength].",
        "I'm excited about the opportunity to [what you'd contribute].",
        "I'd love to discuss how I can help [Company] achieve [goal]."
      ]
    }
  ],
  "talkingPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "tips": "Delivery tips: pace, emphasis, body language",
  "techStack": [
    {
      "technology": "Technology name (e.g., Kubernetes)",
      "category": "Category (e.g., Container Orchestration)",
      "experience": "Years or level (e.g., 5+ years, Expert)",
      "relevance": "How it relates to JD (e.g., Core requirement for the role)"
    }
  ],
  "abbreviations": [{"abbr": "ABBR", "full": "Full term"}]
}

IMPORTANT:
- Use "pitchSections" array with objects containing title, duration, context (optional), and bullets
- Bullets should be speakable phrases, not prose paragraphs
- Include specific numbers and metrics from the resume
- techStack MUST include ALL technologies mentioned in the pitch AND from the JD
- For each technology: name, category, experience level, and relevance to the job
- This is critical for HR screening - they report technologies to hiring managers
- Include abbreviations for all technical terms`,

  hr: `Generate HR screening interview preparation SPECIFICALLY for this company based on the job description and candidate's background.

CRITICAL: Your response MUST be tailored to this SPECIFIC company. Do NOT generate generic HR questions.

Research and include:
- This company's specific HR screening process and format
- Questions this company is known to ask in HR rounds (from Glassdoor, Blind, etc.)
- This company's compensation structure, benefits, and negotiation culture
- This company's values, mission, and what they look for in cultural fit
- Company-specific talking points about why the candidate wants to work HERE

Cover these areas with COMPANY-SPECIFIC questions:
- Salary expectations tailored to this company's compensation bands
- Why THIS company specifically (research their mission, products, recent news)
- How candidate aligns with THIS company's values and culture
- Availability considerations based on this company's typical hiring timeline
- Remote/hybrid/office policies specific to this company

Return JSON:
{
  "summary": "Overview of THIS company's HR screening process and what they focus on",
  "companyInsights": {
    "interviewFormat": "What to expect in HR rounds at this company",
    "culture": "Key cultural aspects to address",
    "values": ["Company value 1", "Company value 2"],
    "recentNews": "Recent company news to reference"
  },
  "questions": [
    {
      "question": "Company-specific HR question",
      "whyTheyAsk": "Why this company asks this question",
      "suggestedAnswer": "A thoughtful answer tailored to this company's values",
      "tips": "Company-specific tips for answering"
    }
  ],
  "salaryNegotiation": {
    "companyContext": "How this company typically handles compensation",
    "rangeEstimate": "Expected range for this role level at this company",
    "negotiationTips": "Tips specific to negotiating with this company"
  },
  "questionsToAsk": ["Smart questions to ask HR at this company"],
  "abbreviations": [{"abbr": "PTO", "full": "Paid Time Off"}]
}

IMPORTANT: Every answer must reference THIS specific company. Do NOT use generic responses.`,

  'hiring-manager': `Generate hiring manager interview preparation tailored to this specific role.

Focus on:
- Role-specific technical expectations
- Team dynamics and collaboration style
- Growth and development opportunities
- Project/team vision alignment
- Leadership style preferences

Return JSON:
{
  "summary": "Key themes for the hiring manager conversation",
  "questions": [
    {
      "question": "Likely question from hiring manager",
      "suggestedAnswer": "Tailored answer based on resume and JD",
      "tips": "What they're really looking for"
    }
  ],
  "questionsToAsk": ["Smart questions to ask the hiring manager"],
  "abbreviations": [{"abbr": "KPI", "full": "Key Performance Indicator"}]
}

IMPORTANT: Include an "abbreviations" array with ALL technical terms, acronyms, and abbreviations used in your response.`,

  rrk: `Generate comprehensive Role Related Knowledge (RRK) interview preparation.

RRK (Role Related Knowledge) is a special interview round used by Google and other top tech companies. It focuses on:
- Deep domain expertise relevant to the specific role
- Practical knowledge from past experience
- How you'd apply your expertise to solve real problems at the company
- Technical depth in your area of specialization

CRITICAL REQUIREMENTS:
1. You MUST reference the DOCUMENTATION/STUDY MATERIALS provided - they are crucial for this round
2. Focus on the candidate's specific domain expertise from their resume
3. Connect their experience to the role requirements
4. Provide deep technical questions that test real-world knowledge, not just theory
5. Include scenario-based questions that simulate actual work situations

For each RRK question, provide:
- The question with context
- What the interviewer is really testing
- A structured answer framework using the candidate's actual experience
- Key technical details to emphasize
- Common follow-up questions
- Red flags to avoid

Return JSON:
{
  "summary": "Overview of RRK round format and what to expect",
  "roleContext": {
    "domain": "Primary domain (e.g., Distributed Systems, ML Infrastructure, Frontend Architecture)",
    "seniority": "Expected level based on JD",
    "focusAreas": ["Key areas they'll probe based on the role"]
  },
  "candidateStrengths": [
    {
      "area": "Area of expertise from resume",
      "evidence": "Specific experience/project demonstrating this",
      "howToLeverage": "How to use this in RRK answers"
    }
  ],
  "questions": [
    {
      "question": "Tell me about a complex technical challenge you solved in [domain]",
      "category": "Deep Dive / Scenario / Design Decision / Debugging",
      "whatTheyTest": "What the interviewer is really evaluating",
      "structuredAnswer": {
        "setup": "How to frame the context (1-2 min)",
        "technicalDepth": "The deep technical content to cover",
        "tradeoffs": "Key decisions and why you made them",
        "impact": "Quantified results and learnings",
        "companyRelevance": "How this applies to the role/company"
      },
      "keyTechnicalDetails": ["Specific technologies/concepts to mention"],
      "followUps": [
        {
          "question": "What would you do differently?",
          "howToAnswer": "Framework for this follow-up"
        }
      ],
      "redFlags": ["Things to avoid saying"],
      "tips": "Interview tips for this question type"
    }
  ],
  "domainKnowledge": [
    {
      "topic": "Critical topic for this role",
      "whyImportant": "Why they'll ask about this",
      "keyConceptsToKnow": ["Concepts you must understand deeply"],
      "candidateExperience": "How the candidate's background relates to this",
      "likelyQuestions": ["Specific questions they might ask"]
    }
  ],
  "scenarioBasedQuestions": [
    {
      "scenario": "Imagine you're on the team and [realistic scenario]...",
      "context": "Why this scenario is relevant to the role",
      "approachFramework": "How to structure your answer",
      "technicalConsiderations": ["Technical aspects to address"],
      "softSkillsToShow": ["Leadership, collaboration aspects to demonstrate"]
    }
  ],
  "questionsToAsk": [
    {
      "question": "Smart question to ask the RRK interviewer",
      "why": "What this demonstrates about you"
    }
  ],
  "generalTips": [
    "Always connect your experience to their specific problems",
    "Show depth, not just breadth - they want to see you go deep"
  ],
  "abbreviations": [{"abbr": "RRK", "full": "Role Related Knowledge"}]
}

CRITICAL: Use the candidate's actual experience from their resume. Reference any documentation/study materials provided. Be specific to the role.`,

  coding: `Generate COMPREHENSIVE coding interview preparation with FULLY SOLVED problems SPECIFIC to this company.

CRITICAL: Your coding problems MUST be tailored to THIS SPECIFIC company:
- Use problems THIS company is KNOWN to ask (from LeetCode discuss, Glassdoor, Blind)
- Match THIS company's interview format (e.g., Google: 45min 2 problems, Meta: 2 rounds)
- Focus on topics THIS company emphasizes (research their actual interview patterns)
- Include company-specific context about their coding interview culture

CRITICAL REQUIREMENTS:
1. You MUST reference the ADDITIONAL PREP MATERIALS provided - they contain crucial study resources
2. Provide COMPLETE working code solutions (not pseudocode)
3. Include LINE-BY-LINE explanations for every line of code
4. Cover ALL edge cases with specific examples
5. Include time and space complexity analysis
6. Problems must be ones THIS COMPANY actually asks (not generic LeetCode)

For each coding question, provide:
- Complete problem statement
- WHY this company asks this problem (what skills they test)
- Multiple approaches (brute force → optimal)
- Full working code in Python (primary) and the language mentioned in JD
- Line-by-line explanation of what each line does and WHY
- Edge cases with specific test inputs that could break naive solutions
- Common mistakes candidates make
- Follow-up questions THIS company's interviewers typically ask

Generate 5-7 REAL coding problems that THIS SPECIFIC company asks for this role level.

Return JSON:
{
  "summary": "Overview of coding interview format at this company based on research",
  "companyInsights": "What makes this company's coding interviews unique (from prep materials + research)",
  "keyTopics": [
    {
      "topic": "Arrays & Hashing",
      "frequency": "Very High",
      "whyImportant": "Why this company focuses on this"
    }
  ],
  "questions": [
    {
      "title": "Two Sum",
      "difficulty": "Easy/Medium/Hard",
      "frequency": "Commonly asked at [Company]",
      "problemStatement": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target...",
      "examples": [
        {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9"}
      ],
      "approaches": [
        {
          "name": "Brute Force",
          "description": "Check every pair",
          "timeComplexity": "O(n²)",
          "spaceComplexity": "O(1)",
          "code": "def two_sum(nums, target):\\n    for i in range(len(nums)):\\n        for j in range(i+1, len(nums)):\\n            if nums[i] + nums[j] == target:\\n                return [i, j]",
          "lineByLine": [
            {"line": "for i in range(len(nums)):", "explanation": "Outer loop iterates through each element as the first number"},
            {"line": "for j in range(i+1, len(nums)):", "explanation": "Inner loop starts from i+1 to avoid duplicate pairs and self-pairing"},
            {"line": "if nums[i] + nums[j] == target:", "explanation": "Check if current pair sums to target"},
            {"line": "return [i, j]", "explanation": "Return indices when found"}
          ]
        },
        {
          "name": "Optimal - Hash Map",
          "description": "Use hash map to find complement in O(1)",
          "timeComplexity": "O(n)",
          "spaceComplexity": "O(n)",
          "code": "def two_sum(nums, target):\\n    seen = {}\\n    for i, num in enumerate(nums):\\n        complement = target - num\\n        if complement in seen:\\n            return [seen[complement], i]\\n        seen[num] = i",
          "lineByLine": [
            {"line": "seen = {}", "explanation": "Hash map to store {value: index} for O(1) lookup"},
            {"line": "for i, num in enumerate(nums):", "explanation": "Single pass through array with index tracking"},
            {"line": "complement = target - num", "explanation": "Calculate what number we need to find"},
            {"line": "if complement in seen:", "explanation": "O(1) check if complement was seen before"},
            {"line": "return [seen[complement], i]", "explanation": "Return stored index and current index"},
            {"line": "seen[num] = i", "explanation": "Store current number and index for future lookups"}
          ]
        }
      ],
      "edgeCases": [
        {"case": "Duplicate values", "input": "[3,3], target=6", "explanation": "Must handle same value appearing twice", "expectedOutput": "[0,1]"},
        {"case": "Negative numbers", "input": "[-1,-2,-3,-4,-5], target=-8", "explanation": "Algorithm must work with negatives", "expectedOutput": "[2,4]"},
        {"case": "Zero in array", "input": "[0,4,3,0], target=0", "explanation": "Two zeros sum to zero", "expectedOutput": "[0,3]"},
        {"case": "Large numbers", "input": "[1000000000, 2, 1000000000], target=2000000000", "explanation": "Must handle integer overflow concerns", "expectedOutput": "[0,2]"}
      ],
      "commonMistakes": [
        "Using same element twice (e.g., [3,2,4] target=6, returning [0,0])",
        "Not handling duplicate values correctly",
        "Returning values instead of indices"
      ],
      "followUpQuestions": [
        "What if there are multiple valid answers?",
        "What if the array is sorted? (Two pointers O(1) space)",
        "Three Sum variation?"
      ]
    }
  ],
  "practiceRecommendations": [
    {
      "platform": "LeetCode",
      "problems": ["Problem name - difficulty"],
      "reason": "Why these specific problems"
    }
  ],
  "ascendTips": [
    "Always clarify constraints before coding",
    "Start with brute force, then optimize"
  ],
  "abbreviations": [{"abbr": "DSA", "full": "Data Structures and Algorithms"}]
}

REMEMBER: Reference the prep materials provided. Generate REAL, COMPLETE solutions with every line explained.`,

  'system-design': `Generate COMPREHENSIVE system design interview preparation with FULL architecture solutions.

CRITICAL REQUIREMENTS:
1. You MUST reference the ADDITIONAL PREP MATERIALS provided - they contain crucial study resources
2. Provide COMPLETE system design solutions, not just overviews
3. DO NOT include ASCII diagrams - diagrams will be auto-generated separately
4. Cover functional AND non-functional requirements exhaustively
5. Provide specific technology recommendations with justifications
6. Include capacity estimation calculations
7. Discuss trade-offs for every major decision

For each system design question, provide:
- Complete problem breakdown
- Requirements gathering (functional + non-functional)
- Capacity estimation with actual calculations
- High-level architecture with ASCII diagram
- Detailed component design
- Database schema design
- API design with endpoints
- Technology stack recommendations
- Scalability considerations
- Trade-offs and alternatives discussed

Generate 4-5 system design questions likely asked at this company based on their products/scale.

Return JSON:
{
  "summary": "System design interview format at this company (45min/60min, what they focus on)",
  "companyContext": "What systems this company runs, their scale, known tech stack from prep materials",
  "ascendFramework": {
    "timeAllocation": {
      "requirements": "5 min",
      "highLevel": "10 min",
      "deepDive": "25 min",
      "wrapUp": "5 min"
    },
    "whatTheyLookFor": ["Clear communication", "Trade-off analysis", "Scalability thinking"]
  },
  "questions": [
    {
      "title": "Design a URL Shortener (like bit.ly)",
      "frequency": "Very common at [Company]",
      "timeLimit": "45 minutes",
      "clarifyingQuestions": [
        "What's the expected scale? (100M URLs/day)",
        "How long should URLs be valid?",
        "Do we need analytics?"
      ],
      "requirements": {
        "functional": [
          "Shorten a long URL to a short URL",
          "Redirect short URL to original URL",
          "Custom short URLs (optional)",
          "Analytics: click count, geographic data",
          "URL expiration"
        ],
        "nonFunctional": [
          "High availability (99.99% uptime)",
          "Low latency (<100ms for redirects)",
          "Scalable to 100M URLs/day",
          "Shortened URLs should be as short as possible",
          "Not predictable (security)"
        ]
      },
      "capacityEstimation": {
        "assumptions": [
          "100M new URLs per day",
          "Read:Write ratio = 100:1 (10B reads/day)",
          "Average URL length: 100 bytes",
          "Store for 5 years"
        ],
        "calculations": [
          {"metric": "URLs per second (write)", "calculation": "100M / 86400", "result": "~1160 URLs/sec"},
          {"metric": "Redirects per second (read)", "calculation": "10B / 86400", "result": "~116K reads/sec"},
          {"metric": "Storage (5 years)", "calculation": "100M * 365 * 5 * 500 bytes", "result": "~91 TB"},
          {"metric": "Bandwidth", "calculation": "116K * 500 bytes", "result": "~58 MB/sec"}
        ]
      },
      "architecture": {
        "diagramDescription": "URL shortener system with load balancer, API servers, Redis cache for hot URLs, Cassandra database, key generation service with ZooKeeper, and Kafka for analytics events",
        "components": [
          {
            "name": "API Gateway / Load Balancer",
            "responsibility": "Route requests, rate limiting, SSL termination",
            "technology": "NGINX / AWS ALB",
            "whyThisChoice": "Battle-tested, supports millions of concurrent connections"
          },
          {
            "name": "Application Servers",
            "responsibility": "Handle shortening and redirect logic",
            "technology": "Node.js / Go",
            "whyThisChoice": "High concurrency, low latency for I/O-bound operations"
          },
          {
            "name": "Cache Layer",
            "responsibility": "Cache hot URLs (80/20 rule - 20% URLs get 80% traffic)",
            "technology": "Redis Cluster",
            "whyThisChoice": "In-memory, supports 100K+ ops/sec per node"
          },
          {
            "name": "Database",
            "responsibility": "Persistent storage for URL mappings",
            "technology": "Cassandra / DynamoDB",
            "whyThisChoice": "Horizontally scalable, high write throughput, no single point of failure"
          },
          {
            "name": "Key Generation Service",
            "responsibility": "Generate unique short keys",
            "technology": "Custom service with ZooKeeper coordination",
            "whyThisChoice": "Pre-generate keys to avoid collision and improve latency"
          }
        ]
      },
      "databaseDesign": {
        "schema": [
          {
            "table": "urls",
            "columns": [
              {"name": "short_key", "type": "VARCHAR(7)", "constraint": "PRIMARY KEY"},
              {"name": "original_url", "type": "TEXT", "constraint": "NOT NULL"},
              {"name": "user_id", "type": "UUID", "constraint": "INDEX"},
              {"name": "created_at", "type": "TIMESTAMP", "constraint": ""},
              {"name": "expires_at", "type": "TIMESTAMP", "constraint": "INDEX"},
              {"name": "click_count", "type": "BIGINT", "constraint": "DEFAULT 0"}
            ]
          }
        ],
        "indexStrategy": "Index on short_key (primary), expires_at (for cleanup jobs)"
      },
      "apiDesign": [
        {
          "endpoint": "POST /api/v1/shorten",
          "request": "{ \\"url\\": \\"https://example.com/very/long/url\\", \\"custom_alias\\": \\"mylink\\", \\"expires_in\\": 86400 }",
          "response": "{ \\"short_url\\": \\"https://short.ly/abc123\\", \\"expires_at\\": \\"2024-01-01T00:00:00Z\\" }",
          "notes": "Rate limited to 100 req/min per user"
        },
        {
          "endpoint": "GET /{short_key}",
          "response": "301 Redirect to original URL",
          "notes": "Cached in CDN, falls back to origin on miss"
        }
      ],
      "keyGenerationAlgorithm": {
        "approach": "Base62 encoding (a-z, A-Z, 0-9) = 62 characters",
        "calculation": "62^7 = 3.5 trillion possible URLs (enough for 95 years at 100M/day)",
        "implementation": "Pre-generate keys in batches, store in key-db, workers fetch ranges"
      },
      "scalabilityConsiderations": [
        {
          "challenge": "Database becoming bottleneck",
          "solution": "Shard by short_key hash, consistent hashing for distribution"
        },
        {
          "challenge": "Hot keys (viral URLs)",
          "solution": "Multi-tier caching: CDN → Redis → Local cache → DB"
        },
        {
          "challenge": "Key generation contention",
          "solution": "Each server pre-fetches 1000 keys, ZooKeeper coordinates ranges"
        }
      ],
      "tradeOffs": [
        {
          "decision": "NoSQL vs SQL",
          "chose": "NoSQL (Cassandra)",
          "reason": "Simple access patterns, need horizontal scaling, eventual consistency OK for reads",
          "alternative": "PostgreSQL with Citus for sharding if we need ACID guarantees"
        },
        {
          "decision": "Random vs Sequential keys",
          "chose": "Random (Base62)",
          "reason": "Security - can't enumerate/guess URLs",
          "alternative": "Counter-based with encryption for better distribution"
        }
      ],
      "commonMistakes": [
        "Not discussing analytics separately (different scale pattern)",
        "Forgetting about URL expiration cleanup",
        "Not addressing collision handling"
      ],
      "followUpQuestions": [
        "How would you handle analytics at scale?",
        "How would you implement URL preview (unfurling)?",
        "How would you detect malicious URLs?"
      ]
    }
  ],
  "generalTips": [
    "Always start with requirements gathering",
    "Use back-of-envelope calculations to justify decisions",
    "Draw diagrams as you explain",
    "Discuss trade-offs proactively"
  ],
  "techStackReference": {
    "loadBalancing": ["NGINX", "HAProxy", "AWS ALB"],
    "caching": ["Redis", "Memcached", "CDN (CloudFlare)"],
    "databases": ["PostgreSQL", "MySQL", "Cassandra", "MongoDB", "DynamoDB"],
    "messageQueues": ["Kafka", "RabbitMQ", "AWS SQS"],
    "search": ["Elasticsearch", "Solr"],
    "monitoring": ["Prometheus", "Grafana", "DataDog"]
  },
  "abbreviations": [
    {"abbr": "CAP", "full": "Consistency, Availability, Partition tolerance"},
    {"abbr": "CDN", "full": "Content Delivery Network"},
    {"abbr": "QPS", "full": "Queries Per Second"},
    {"abbr": "SLA", "full": "Service Level Agreement"},
    {"abbr": "SPOF", "full": "Single Point of Failure"}
  ]
}

CRITICAL: Include diagramDescription for each design, actual calculations, and reference prep materials provided. Diagrams will be auto-generated from your description.`,

  behavioral: `Generate behavioral interview preparation with ALL answers in STAR format, SPECIFICALLY tailored for this company.

CRITICAL: Your behavioral questions MUST be tailored to THIS SPECIFIC company's:
- Interview culture and what they value (e.g., Amazon's Leadership Principles, Google's Googleyness)
- Known behavioral questions they ask (from Glassdoor, Blind, interview prep sites)
- Company values and how to demonstrate alignment
- Specific traits this company looks for in candidates

Based on the resume, identify 8-10 experiences that demonstrate skills THIS company cares about:
- Leadership and initiative (aligned with company values)
- Problem-solving and challenges overcome (relevant to company's domain)
- Teamwork and collaboration (matching company culture)
- Conflict resolution (using company's preferred approach)
- Growth mindset and learning (company-relevant examples)
- Technical decision making (relevant to company tech stack)
- Handling failure or setbacks (company-appropriate framing)
- Managing ambiguity (relevant to company's work style)

CRITICAL: Every answer MUST be in complete STAR format with detailed content:
- Situation: 2-3 sentences describing the context, company, team size, and circumstances
- Task: What specific challenge or responsibility you faced, including stakes and constraints
- Action: 3-5 specific actions YOU took (use "I" not "we"), including technical details
- Result: Quantified outcomes with metrics (%, $, time saved, etc.) and business impact

Return JSON:
{
  "summary": "Behavioral interview strategy for THIS company specifically",
  "companyContext": {
    "interviewFormat": "How this company conducts behavioral interviews",
    "whatTheyLookFor": ["Specific traits this company values"],
    "knownQuestions": ["Questions this company is known to ask"],
    "culturalFit": "What cultural fit means at this company"
  },
  "questions": [
    {
      "question": "Company-specific behavioral question",
      "whyThisCompanyAsks": "Why this company asks this specific question",
      "companyValue": "Which company value/principle this tests",
      "category": "Leadership|Problem-Solving|Teamwork|Conflict|Growth|Technical|Failure|Ambiguity",
      "situation": "Detailed 2-3 sentence context...",
      "task": "Detailed task...",
      "action": "Detailed actions (3-5 bullet points)...",
      "result": "Quantified results...",
      "companyConnection": "How to connect this answer to THIS company's mission/values",
      "tips": "Company-specific delivery tips"
    }
  ],
  "keyThemes": ["Themes that resonate with THIS company's values"],
  "generalTips": ["Tips for behavioral interviews at THIS company specifically"],
  "abbreviations": [{"abbr": "STAR", "full": "Situation, Task, Action, Result"}]
}

IMPORTANT:
- Generate 8-10 questions that THIS company actually asks (research-based)
- Frame every answer to align with THIS company's values
- Use SPECIFIC examples from their resume with real metrics
- Include company-specific context for each answer`,

  techstack: `Generate COMPREHENSIVE technology-specific interview preparation based on the job requirements.

CRITICAL REQUIREMENTS:
1. You MUST reference the ADDITIONAL PREP MATERIALS provided - they contain crucial study resources
2. Provide DEEP technical explanations, not surface-level overviews
3. Include code examples where relevant
4. Cover internals, best practices, and real-world scenarios

For each technology in the JD, provide:
- Core concepts and how they work internally
- Common interview questions with detailed answers
- Code examples demonstrating proficiency
- Best practices and anti-patterns
- Performance considerations
- Real-world use cases and trade-offs

Analyze ALL technologies from the JD. Generate 3-5 deep questions per technology.

Return JSON:
{
  "summary": "Tech stack analysis based on JD and prep materials",
  "companyTechContext": "How this company uses these technologies (from research/prep materials)",
  "technologies": [
    {
      "name": "React",
      "importance": "high",
      "whyImportant": "Core frontend framework mentioned in JD",
      "conceptsToKnow": [
        {
          "concept": "Virtual DOM and Reconciliation",
          "explanation": "Detailed explanation of how React's virtual DOM works...",
          "whyAsked": "Tests deep understanding vs surface knowledge"
        }
      ],
      "questions": [
        {
          "question": "Explain React's reconciliation algorithm and how keys affect performance",
          "difficulty": "Senior",
          "answer": "Detailed answer with technical depth...",
          "codeExample": "// Example demonstrating the concept\\nconst list = items.map(item => <Item key={item.id} {...item} />);",
          "followUps": [
            "How would you optimize a list with 10,000 items?",
            "When would you use useMemo vs useCallback?"
          ],
          "commonMistakes": [
            "Using array index as key",
            "Not understanding when re-renders happen"
          ]
        }
      ],
      "bestPractices": [
        {
          "practice": "Use React.memo for expensive components",
          "when": "When props don't change frequently but parent re-renders often",
          "codeExample": "const MemoizedComponent = React.memo(ExpensiveComponent);"
        }
      ],
      "antiPatterns": [
        {
          "pattern": "Prop drilling through many levels",
          "problem": "Makes code hard to maintain and causes unnecessary re-renders",
          "solution": "Use Context API or state management library"
        }
      ],
      "performanceTopics": [
        "Code splitting with React.lazy",
        "Profiling with React DevTools",
        "Avoiding unnecessary re-renders"
      ]
    }
  ],
  "architectureTopics": [
    {
      "topic": "Micro-frontends",
      "relevance": "Mentioned in JD - large-scale frontend architecture",
      "keyPoints": ["Module federation", "Shared dependencies", "Independent deployments"],
      "questions": ["How would you share state between micro-frontends?"]
    }
  ],
  "systemIntegrations": [
    {
      "integration": "REST API consumption",
      "patterns": ["Error handling", "Caching strategies", "Optimistic updates"],
      "codeExample": "// Example of proper error handling with retry..."
    }
  ],
  "abbreviations": [
    {"abbr": "API", "full": "Application Programming Interface"},
    {"abbr": "DOM", "full": "Document Object Model"},
    {"abbr": "SSR", "full": "Server-Side Rendering"}
  ]
}

CRITICAL: Reference prep materials. Provide code examples. Be comprehensive, not superficial.`,

  custom: `Generate comprehensive interview preparation based on the provided documentation.

You have been given a specific document that the candidate wants to learn from and be tested on.
Analyze the document thoroughly and extract ALL meaningful content from it.

CRITICAL REQUIREMENTS:
1. EXTRACT ALL UNIQUE QUESTIONS from the document - do NOT summarize or skip any
2. REMOVE DUPLICATES: If the same question appears multiple times (even with slight wording differences), include it ONLY ONCE
3. FILTER OUT NONSENSE: Skip any malformed text, incomplete sentences, or gibberish content
4. QUALITY CHECK: Each question must be:
   - A complete, coherent question
   - Actually answerable (not truncated or corrupted)
   - Relevant to the document's topic
5. If the document contains 30 unique questions, you MUST include all 30
6. Provide detailed answers for EVERY valid question found

DUPLICATE DETECTION:
- Questions asking the same thing with different wording = DUPLICATE (keep only one)
- Questions with identical meaning = DUPLICATE
- Questions that are subsets of other questions = keep the more comprehensive one

FILTERING CRITERIA (skip these):
- Incomplete sentences or partial text
- Random characters or formatting artifacts
- Headers/footers/page numbers
- Table of contents entries without actual content
- Copyright notices or metadata

IMPORTANT: The candidate uploaded this document to study ALL valid content.
Extract EVERY unique, meaningful question while filtering garbage and duplicates.

Return JSON:
{
  "summary": "Overview of the document - mention total unique questions found (after deduplication)",
  "documentInsights": {
    "mainTopics": ["Key topics covered in the document"],
    "totalUniqueQuestions": "Number of unique questions after removing duplicates",
    "duplicatesRemoved": "Number of duplicate questions filtered out",
    "keyTakeaways": ["Most important points to remember"],
    "relevanceToRole": "How this material relates to the target job"
  },
  "questions": [
    {
      "question": "EXACT question from the document (deduplicated, no nonsense)",
      "category": "Conceptual / Technical / Scenario / Application",
      "difficulty": "Easy / Medium / Hard",
      "answer": "Detailed answer - if answer is in document use it, otherwise provide comprehensive answer",
      "keyPoints": ["Key points to mention in your answer"],
      "followUps": ["Possible follow-up questions"],
      "documentReference": "Which section of the document this is from"
    }
  ],
  "practiceScenarios": [
    {
      "scenario": "Real-world scenario to practice",
      "howToApply": "How to apply the document's knowledge here",
      "exampleAnswer": "Sample response using document concepts"
    }
  ],
  "quickReference": [
    {
      "concept": "Key concept name",
      "definition": "Brief definition",
      "example": "Practical example"
    }
  ],
  "studyTips": ["Tips for retaining and applying this knowledge"],
  "abbreviations": [{"abbr": "ABBR", "full": "Full term"}]
}

CRITICAL: You MUST include ALL questions from the document. If there are 30 questions, include 30. If there are 50, include 50. Do NOT skip any.`
};
