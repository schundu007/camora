/**
 * Section-specific prompts for ascend prep generation.
 *
 * IMPORTANT: as of the tool_use migration the JSON shape is enforced by
 * `section-schemas.js` — these prompts no longer need to spell out the
 * return shape. Their job is *content quality*: voice, depth, scope, and
 * what makes each section company-specific.
 *
 * Camora content standards (apply to every section):
 *   - Direct, specific, scannable. No filler ("It's important to...").
 *   - Short sentences, ≤22 words. ≤3 sentences per paragraph-shaped field.
 *   - Real metrics from the resume only — never fabricate numbers.
 *   - String fields are plain text. No Markdown, no nested JSON, no bullet
 *     dashes inside a single string (use array fields for lists).
 *   - Every acronym used anywhere goes into the abbreviations array.
 *   - Always tailor to the target company: their interview format, their
 *     known questions, their products, their stack.
 */
export const SECTION_PROMPTS = {
  pitch: `Write a 2-minute elevator pitch this candidate can read aloud, mapped to the JD's top 3-4 requirements.

Each section's bullets are full sentences the candidate will SAY — not notes.
Pull achievements from the resume that DIRECTLY match a JD requirement; cite the same metric they wrote.
Keep the JD's language: if the JD says "distributed systems", don't say "scalable infra".

Five sections, in this order:
  1. Opening Hook (15-20s) — name, title, years, the headline skill that maps to the JD's #1 requirement.
  2. Key Achievement #1 (30-40s) — story matching JD requirement #1. Action verbs, single number for impact.
  3. Key Achievement #2 (30-40s) — story matching a DIFFERENT JD requirement. Different metric.
  4. Why This Company (20-30s) — one specific thing about THIS company (recent product, mission, scale).
  5. Closing (10-15s) — restate the match between candidate's strengths and the role.

techStack: every technology in the JD plus every one mentioned in the pitch. Category, years, relevance to role.
talkingPoints: 3-5 phrases the candidate can lean on if interrupted.
tips: one paragraph on delivery (pace, eye contact, where to pause).`,

  hr: `Generate HR-screen prep tailored to THIS company.

summary: 2-3 sentences on this company's HR-screen format (length, who runs it, what they screen for).
companyInsights: their interview format, their actual culture (what they reward, what they avoid), 3-5 of their stated values, one piece of recent news.
questions: 6-10 HR questions THIS company is known to ask (Glassdoor, Blind, levels.fyi). For each:
  • whyTheyAsk: one sentence on what they're really screening for.
  • suggestedAnswer: 3-5 sentence answer the candidate could give, using THEIR resume specifics.
  • tips: one sentence of company-specific delivery advice.
salaryNegotiation: their actual comp model (base/equity/bonus split), realistic range for the role's level at this company, two negotiation moves that work HERE.
questionsToAsk: 3-6 questions to ask the recruiter that demonstrate research.

Reject generic content. If you can't tie a question to this company specifically, drop it.`,

  'hiring-manager': `Generate hiring-manager-round prep for this role.

summary: 2-3 sentences on what the hiring manager will probe (team fit, role specifics, candidate's level vs the role's level).
questions: 6-10 likely hiring-manager questions, each with:
  • suggestedAnswer: 3-5 sentence answer rooted in the candidate's actual resume experience, mapped to the JD.
  • tips: one sentence on what they're really listening for.
questionsToAsk: 3-6 questions for the hiring manager that signal seniority — team structure, success metric for the role, biggest blocker.

Avoid HR-flavored questions; hiring manager rounds focus on role execution and team dynamics.`,

  rrk: `Generate Role-Related Knowledge (RRK) prep for this role.

This is the deep-domain round at Google and similar companies. It tests: have you actually solved problems in this domain at this scale?

summary: 2-3 sentences on RRK format and what's tested for THIS role's domain.
roleContext: domain (e.g. "Distributed systems / data platforms"), seniority signal from the JD, 3-5 focus areas the interviewer will probe.
candidateStrengths: 3-5 strengths from the resume that match the role's focus areas. For each: the strength, a specific resume entry as evidence, how to lead with it in an answer.
questions: 4-8 deep-domain questions THIS company asks for THIS role. Each must include:
  • category (Deep Dive | Scenario | Design Decision | Debugging).
  • whatTheyTest: one sentence on the actual signal.
  • structuredAnswer: setup, technicalDepth, tradeoffs, impact, companyRelevance — each 1-3 sentences.
  • followUps: 1-3 likely follow-ups, each with how-to-answer.
  • tips: one sentence.
generalTips: 3-5 RRK-specific tips (go deep before broad, name your tradeoffs, bring numbers).

If you reference prep materials, cite them by name.`,

  coding: `Generate coding-interview prep with 4-7 problems THIS company is known to ask for THIS role's level.

summary: 2-3 sentences on the company's coding-interview format (rounds, time, language preference, evaluation rubric).
companyInsights: 2-3 sentences on what makes their coding interview distinctive (e.g. Google focuses on optimal-only solutions; Meta does 2 problems in 35 min).
keyTopics: 4-6 topic areas they emphasize, each with frequency (Very High/High/Medium) and one sentence on why.
questions: 4-7 problems. For each:
  • title, difficulty, frequency.
  • problemStatement: clean problem in 2-4 sentences, no fluff.
  • examples: 2-3 input/output pairs with a one-line explanation.
  • approaches: 2-3 (brute force → optimal). For each, name, 1-2 sentence description, time + space complexity, complete working code in Python (and the JD's language if different), and lineByLine — every meaningful line gets a one-sentence explanation.
  • edgeCases: 3-5 cases that break naive solutions. Each: case name, sample input, why it breaks, expected output.
  • commonMistakes: 2-4 mistakes candidates actually make on this problem.
  • followUpQuestions: 2-4 follow-ups THIS company's interviewers ask.
practiceRecommendations: 1-3 platforms with specific problem lists and a one-sentence rationale.
ascendTips: 3-5 tactical tips for THIS company's coding rounds.

Every code block must run as-is. No pseudocode. No truncation.`,

  'system-design': `Generate system-design prep with 3-5 problems likely at THIS company for THIS role.

DO NOT include ASCII diagrams in any field — diagrams are auto-generated separately from architecture.diagramDescription.

summary: 2-3 sentences on the company's system-design round (length, what they grade on, junior vs senior expectations).
companyContext: what systems this company actually runs, their scale (DAU, QPS, data volume if public), known stack.
ascendFramework: time allocation across requirements / high-level / deep-dive / wrap-up (in minutes), and 3-5 things the interviewer is grading for.
questions: 3-5 design problems. For each:
  • title, frequency, timeLimit.
  • clarifyingQuestions: 3-5 questions the candidate should ask before designing.
  • requirements.functional: 4-6 functional requirements.
  • requirements.nonFunctional: 4-6 non-functional (latency targets, availability, consistency, cost).
  • capacityEstimation: assumptions list + calculations — each calculation is metric/formula/result.
  • architecture.diagramDescription: 3-5 sentences describing the architecture in plain English so a diagram tool can render it. Name every component and the data flow.
  • architecture.components: 4-7 components, each with name, responsibility, technology, whyThisChoice.
  • databaseDesign: schema (tables → columns with type + constraint), indexStrategy.
  • apiDesign: 2-5 endpoints, each with method+path, request, response, notes.
  • tradeOffs: 3-5 decisions made, each with chose / reason / alternative.
  • scalabilityConsiderations: 3-5 challenge → solution pairs.
  • followUpQuestions: 3-5.
generalTips: 3-5 tactical tips (start with requirements, do back-of-envelope first, name tradeoffs proactively).
techStackReference: short reference of common choices grouped by concern (load balancing, caching, databases, queues, search, monitoring).

Calculations must be real arithmetic, not handwaving.`,

  behavioral: `Generate behavioral prep with 6-10 STAR-format questions tailored to THIS company.

summary: 2-3 sentences on this company's behavioral round and what they actually weight.
companyContext: their interview format, 3-5 traits they look for, 3-6 known behavioral questions, what cultural fit means HERE.
questions: 6-10 questions. For each, FULL STAR — none of the fields can be empty:
  • question.
  • whyThisCompanyAsks: one sentence.
  • companyValue: which of their stated values/principles this tests.
  • category: Leadership | Problem-Solving | Teamwork | Conflict | Growth | Technical | Failure | Ambiguity.
  • situation: 2-3 sentences. Specific company name, team size, timeline.
  • task: 2-3 sentences. The challenge with stakes and constraints.
  • action: 3-5 sentences. "I" not "we". Concrete steps with technical detail.
  • result: 2-3 sentences. Quantified — percent, dollars, time, users — pulled from the resume.
  • companyConnection: one sentence on why THIS story is the right one for THIS company.
  • tips: one sentence on delivery for this question type.
keyThemes: 3-5 themes that resonate with this company's values.
generalTips: 3-5 tactical tips (lead with impact, hold the metric until result, don't spend >60s on situation).`,

  techstack: `Generate technology-specific prep based on the JD.

summary: 2-3 sentences identifying the JD's core stack and what level of depth they'll test.
companyTechContext: 2-3 sentences on how THIS company actually uses these technologies (from research / prep materials).
technologies: 2-5 technologies from the JD. For each:
  • name, importance (high/medium/low), whyImportant (one sentence on why it's in the JD).
  • conceptsToKnow: 3-5 internal concepts that separate surface from depth (e.g. "Virtual DOM and reconciliation", "Event loop microtask queue").
  • questions: 3-5 deep questions for the tech. Each: question, difficulty, answer (3-6 sentences), codeExample if relevant, 2-3 followUps, 2-3 commonMistakes.
  • bestPractices: 2-4 with practice / when / codeExample.
  • antiPatterns: 2-3 with pattern / problem / solution.
  • performanceTopics: 3-5 names.
architectureTopics: 1-3 architecture-level topics from the JD with 2-3 keyPoints each.
systemIntegrations: 1-3 integration patterns the role will use.

Skip any technology not in the JD. Don't invent a JD requirement.`,

  custom: `Extract structured interview prep from the provided document.

Rules:
  • Pull EVERY unique question from the document. If the document has 30, return 30.
  • Drop duplicates: same intent with different wording = duplicate, keep the most comprehensive version.
  • Drop garbage: incomplete sentences, headers/footers, page numbers, OCR noise.
  • If the document gives an answer, USE THE DOCUMENT'S ANSWER. Don't paraphrase. Cite the section.
  • If the document doesn't give an answer, write a complete one rooted in the document's terminology.

summary: 2-3 sentences. Mention the unique-question count after dedup.
documentInsights: mainTopics, totalUniqueQuestions, duplicatesRemoved, keyTakeaways, relevanceToRole.
questions: every valid question. Each: question, category, difficulty, answer, keyPoints, followUps, documentReference (which section of the document).
practiceScenarios: 2-4 real scenarios that apply the document's content.
quickReference: 5-15 concept/definition/example triples for fast review.
studyTips: 3-5 tips for retaining this material.

Do NOT skip questions. Do NOT summarize a list of questions into "30 questions about X".`,
};
