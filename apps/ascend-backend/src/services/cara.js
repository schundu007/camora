import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from './adminConfig.js';

let _caraClient = null;
let _caraClientKey = null;
function getGeminiClient() {
  const key = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_caraClient || key !== _caraClientKey) {
    _caraClient = new GoogleGenerativeAI(key);
    _caraClientKey = key;
  }
  return _caraClient;
}

const CAMORA_ROUTES = `
/capra/prepare                  → Prep dashboard — all topic categories
/capra/prepare/coding           → Data Structures & Algorithms topics
/capra/prepare/system-design    → System Design topics
/capra/prepare/behavioral       → Behavioral / STAR interview topics
/capra/prepare/devops           → DevOps — CI/CD, containers, Kubernetes, IaC
/capra/prepare/linux            → Linux fundamentals — shell, permissions, systemd
/capra/prepare/sre              → Site Reliability Engineering topics
/capra/prepare/cloud            → Cloud (AWS, GCP, Azure) topics
/capra/prepare/networking       → Networking — TCP/IP, DNS, HTTP, TLS
/capra/prepare/low-level        → Low-level design and system internals
/capra/prepare/mlops            → MLOps — training pipelines, model serving
/capra/prepare/observability    → Observability — metrics, logs, traces
/capra/prepare/challenges       → Coding challenges and exercises
/capra/practice                 → DSA practice problems — coding challenges
/capra/playground               → Code playground — run code in the browser
/capra/resume                   → Resume analysis and feedback
/capra/company-prep             → Company-specific prep — Google, Meta, Amazon, etc.
/capra/plan                     → Study plan — set goals and timeline
/capra/achievements             → Achievements and progress badges
/capra/hr-library               → Behavioral / HR questions library
/lumora                         → Live interview assistant — Sona helps in real-time
/pricing                        → Subscription plans and pricing
/profile                        → Account settings and preferences
/docs                           → Documentation and guides
/jobs                           → Job listings and applications
`.trim();

const CAMORA_KNOWLEDGE = `
## What is Camora?
Camora is an AI-powered career platform for software engineers built around four pillars — Apply, Prepare, Practice, Attend (APPA).

## The Four Pillars (APPA)

### APPLY
Browse and apply to engineering jobs at top companies. Access curated listings filtered for SWE, ML, DevOps, SRE roles. Located at /jobs (also jobs.cariara.com for full listings).

### PREPARE
Deep-dive study content organized by interview topic. 13+ categories with hundreds of topics, diagrams, code examples, Q&A, and real interview questions. Located at /capra/prepare.
Categories:
- DSA / Coding (/capra/prepare/coding) — Arrays, Trees, Graphs, DP, Sorting, Sliding Window, Two Pointers, Union-Find, Segment Trees, and 200+ topics. Essential for FAANG coding rounds.
- System Design (/capra/prepare/system-design) — Distributed systems, databases, caching, message queues, rate limiters, CDN, microservices, scalability patterns. Covers HLD and LLD.
- Behavioral (/capra/prepare/behavioral) — STAR stories, leadership principles, Amazon LPs, conflict resolution, culture fit. Includes an HR library.
- DevOps (/capra/prepare/devops) — CI/CD (GitHub Actions, Jenkins, GitLab CI), IaC (Terraform, Ansible), Containers, Kubernetes, GitOps, DevSecOps, Helm, Argo.
- Linux (/capra/prepare/linux) — Filesystem, permissions, processes, shell scripting, systemd, boot process, package management, cron, security hardening, networking tools.
- SRE (/capra/prepare/sre) — SLOs/SLAs/SLIs, error budgets, incident management, capacity planning, chaos engineering, on-call practices, postmortems.
- Cloud (/capra/prepare/cloud) — AWS, GCP, Azure services. IAM, VPC, EC2, S3, Lambda, RDS, EKS, GKE, Cloud Run, cost optimization.
- Networking (/capra/prepare/networking) — TCP/IP, DNS, HTTP/2/3, TLS, load balancers, BGP, CDN, VPN, service mesh, eBPF.
- Low-Level Design (/capra/prepare/low-level) — OOP, design patterns, concurrency, memory management, cache design.
- MLOps (/capra/prepare/mlops) — Training pipelines, feature stores, model serving, A/B testing, drift detection, Kubeflow, MLflow.
- Observability (/capra/prepare/observability) — Prometheus, Grafana, Datadog, distributed tracing, OpenTelemetry, log aggregation, alerting.
- Challenges (/capra/prepare/challenges) — Hands-on coding and scenario challenges.
- Company Prep (/capra/company-prep) — Company-specific question sets, culture notes, and interview formats for Google, Meta, Amazon, Apple, Microsoft, Netflix, Stripe, Uber, Airbnb, and 50+ more.

### PRACTICE
Solve DSA coding problems at /capra/practice. Filter by difficulty, topic, and company. Includes a code playground at /playground to run solutions in the browser. MCQ quizzes at /capra/mcq.

### ATTEND (Lumora)
Lumora at /lumora is the live interview assistant. Sona (the AI) listens to the interview via microphone, transcribes speech in real-time, and generates answers the candidate can use on-screen — for coding questions, system design, and behavioral rounds. Supports document upload (resume, JD) for personalized context. Requires Pro plan.

## Key Features

### Resume Analyzer (/capra/resume / /capra/prepare/resume)
Upload a resume and JD to get: ATS score, keyword gap analysis, bullet point rewrites, cover letter generation, and fit score against the target role.

### Study Plan (/capra/plan)
Set a target company and interview date. Get a day-by-day study schedule, topic prioritization by role, and progress tracking.

### Achievements (/capra/achievements)
Badges and XP earned by completing topics, solving problems, running live sessions. Tracks streaks and milestones.

### Company Prep (/capra/company-prep)
Company-specific interview prep: question banks, culture notes, loop format, difficulty calibration for 50+ companies.

### HR/Behavioral Library (/capra/hr-library)
500+ behavioral questions with sample STAR answers. Sortable by competency (leadership, ownership, conflict, growth, etc.).

### Code Playground (/playground)
Browser-based coding environment. Supports Python, JavaScript, Go, Java, C++. Run and test code without leaving the tab.

### Ask Cara (this assistant)
Cara is the platform guide — she can navigate to any feature, explain what each section does, recommend a study path, and answer product questions. Triggered via ⌘K anywhere in the app.

## Subscription Plans
- Free tier: Browse Prepare content (1 topic per category preview), Practice problems (limited), MCQ quizzes, job listings. No Lumora access.
- Pro Monthly ($29/mo): Full Prepare access (all topics, all categories), unlimited Practice, Resume analyzer, Company Prep, Study Plan, 10 Lumora sessions/month.
- Pro Quarterly ($59/quarter): Everything in Pro Monthly, more Lumora sessions, better value.
- Desktop Lifetime ($99 one-time): Mac desktop app download + lifetime access. Best for heavy users who want always-on Sona during interviews.

## Common User Questions

Q: How do I get started?
A: Start at /capra/prepare — pick your target role, then choose the matching topic category. For SWE roles focus on DSA + System Design. For DevOps/SRE focus on DevOps + Linux + SRE + Cloud. For ML roles add MLOps + Observability.

Q: What's the difference between Prepare and Practice?
A: Prepare is study content (concepts, diagrams, explanations, Q&A). Practice is solving actual coding problems with a code editor.

Q: How does Lumora / Sona work?
A: Open Lumora at /lumora, upload your resume and the job description, then start a session. Sona listens through your mic, hears the interviewer's questions, and generates real-time answers you can reference on a second screen or phone.

Q: Do I need to pay for Lumora?
A: Yes, Lumora requires a Pro plan. Free users can browse the Prepare content without a subscription.

Q: How do I prepare for Google / Meta / Amazon?
A: Go to Company Prep (/capra/company-prep), select the company, and get their specific question bank and loop format. Pair it with DSA + System Design + Behavioral tracks in Prepare.

Q: What topics are covered in DSA?
A: Arrays, Strings, Linked Lists, Stacks, Queues, Trees (BST, AVL, Segment, Fenwick), Graphs (BFS, DFS, Dijkstra, Bellman-Ford, Topological Sort), Dynamic Programming, Greedy, Backtracking, Sorting, Searching, Two Pointers, Sliding Window, Union-Find, Tries, Heaps, and 200+ more topics.

Q: I have an interview in 2 weeks — what should I do?
A: Use the Study Plan (/capra/plan) to set your date and company. It generates a focused 2-week schedule. Also activate Lumora for mock sessions before the real interview.

Q: Is there a desktop app?
A: Yes — Desktop Lifetime plan includes a Mac desktop app. It runs Lumora with a system-level audio capture so you don't need to share screen during interviews.
`.trim();

function buildSystemPrompt(ctx) {
  const { userName, goal, topicsStudied, planTier, currentPath } = ctx;
  const studiedSummary = topicsStudied.length
    ? `Already studied: ${topicsStudied.slice(0, 20).join(', ')}${topicsStudied.length > 20 ? ` (+${topicsStudied.length - 20} more)` : ''}.`
    : 'No topics studied yet.';

  return `You are Cara, Camora's platform guide and assistant. You know everything about Camora's features, content, and workflow. Help users navigate, study smarter, and get the most from the platform.

RESPONSE RULES:
- Be warm, direct, and helpful. 1-3 sentences max per answer.
- For navigation requests, always include an action with the exact path.
- For interview questions (algorithms, system design problems, "how would you design X") redirect: "That's a live-interview question — Sona in Lumora handles those in real-time. Want me to open it?"
- Never fabricate routes. Only use paths from ROUTES below.
- Always respond with valid JSON.

USER CONTEXT:
- Name: ${userName || 'there'}
- Goal: ${goal || 'not specified'}
- Plan: ${planTier || 'free'}
- Current page: ${currentPath || '/'}
- ${studiedSummary}

ROUTES:
${CAMORA_ROUTES}

CAMORA KNOWLEDGE BASE:
${CAMORA_KNOWLEDGE}

JSON RESPONSE FORMAT:
{"answer":"<your response>","action":{"type":"navigate","path":"<exact path>","label":"<button label>"}}
Omit "action" when navigation is not relevant.`;
}

export async function askCara({ message, context }) {
  const model = getGeminiClient().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(context),
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(message);
  const raw = result.response.text().trim();

  // Strategy 1: raw is valid JSON
  try {
    const parsed = JSON.parse(raw);
    return {
      answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
      action: parsed.action ?? null,
    };
  } catch {}

  // Strategy 2: JSON inside a ```json ... ``` block anywhere in the text
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock[1].trim());
      return {
        answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
        action: parsed.action ?? null,
      };
    } catch {}
  }

  // Strategy 3: find any {...} object in the text
  const jsonObj = raw.match(/\{[\s\S]*\}/);
  if (jsonObj) {
    try {
      const parsed = JSON.parse(jsonObj[0]);
      return {
        answer: typeof parsed.answer === 'string' ? parsed.answer : raw,
        action: parsed.action ?? null,
      };
    } catch {}
  }

  return { answer: raw, action: null };
}
