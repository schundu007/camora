/**
 * Resume tailoring with REAL Claude (Anthropic), not the Gemini path ascend
 * uses. lumora is the only backend with ANTHROPIC_API_KEY, so this is where
 * high-quality tailoring lives. Returns structured JSON; the frontend builds
 * the DOCX from it (the frontend already depends on `docx`).
 */
import { getAnthropicClient } from './claude.js';
import { LIVE_ANSWER_MODEL } from './modelPolicy.js';

const TAILOR_MODEL = process.env.CLAUDE_MODEL_PAID || LIVE_ANSWER_MODEL;

const SYSTEM = `You are an elite resume writer and career coach. You tailor a candidate's real resume to a specific job description: you reframe and prioritise their genuine experience to match the role, mirror the JD's language and keywords, lead bullets with impact and metrics, and cut irrelevant material. You NEVER invent employers, titles, dates, degrees, or skills the candidate doesn't have — tailoring means emphasis and phrasing, not fabrication. Return ONLY valid JSON (no prose, no markdown code fences).`;

function buildPrompt({ resume, jobDescription, company, role }) {
  return `TARGET COMPANY: ${company || 'the company'}
TARGET ROLE: ${role || 'the role'}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S BASE RESUME:
${resume}

Tailor the resume to this specific job and return JSON matching EXACTLY this schema (empty string/array when a field genuinely doesn't apply — never fabricate):
{
  "candidate": { "name": "", "email": "", "phone": "", "linkedin": "", "location": "" },
  "gapAnalysis": {
    "matchScore": <integer 0-100>,
    "strengths": ["<strength that maps directly to a JD requirement>"],
    "gaps": ["<specific JD requirement the resume does not yet evidence>"],
    "quickWins": ["<concrete edit to close a gap using the candidate's real background>"]
  },
  "optimizedResume": {
    "summary": "<2-3 sentence summary tailored to this role, using the JD's language>",
    "experience": [
      { "title": "", "company": "", "dates": "", "bullets": ["<achievement-led bullet, quantified where the resume supports it, keyword-aligned to the JD>"] }
    ],
    "skills": ["<skill prioritised for this JD>"],
    "education": [{ "degree": "", "school": "", "year": "" }],
    "certifications": ["<cert if present>"],
    "projects": [{ "name": "", "description": "", "tech": "" }]
  },
  "coverLetter": {
    "opening": "<strong opening specific to this company and role>",
    "body1": "<most relevant achievement mapped to the JD>",
    "body2": "<motivation / fit for this company>",
    "closing": "<confident closing with a call to action>"
  }
}`;
}

/** Tailor a resume to a JD via Claude. Returns the parsed JSON object. */
export async function tailorResume({ resume, jobDescription, company, role }) {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: TAILOR_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt({ resume, jobDescription, company, role }) }],
  });

  const raw = (response.content || [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('')
    .trim();

  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}
