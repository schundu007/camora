import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../services/adminConfig.js';
import { authenticate } from '../middleware/authenticate.js';
import { fetchJobViaAPI } from './jobAnalyze.js';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, TabStopPosition, TabStopType, PageNumber, WidthType,
} from 'docx';

const router = Router();

let _genAI = null;
let _genAIKey = null;
function getGenAI() {
  const k = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_genAI || _genAIKey !== k) { _genAI = new GoogleGenerativeAI(k); _genAIKey = k; }
  return _genAI;
}

/**
 * POST /api/v1/resume/optimize
 * Optimize a resume for a specific job description using Gemini AI.
 * Streams the response via SSE.
 */
router.post('/optimize', authenticate, async (req, res) => {
  try {
    const { resume, jobDescription, company, role } = req.body;
    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Resume and job description are required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const prompt = `You are an expert resume editor for tech companies. Rewrite the candidate's resume so it is ATS-optimized for the target job — WITHOUT inventing anything.

TARGET COMPANY: ${company || 'Not specified'}
TARGET ROLE: ${role || 'Software Engineer'}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S BASE RESUME (the ONLY source of truth for facts):
${resume}

STRICT GROUND RULES — follow exactly:
- Use ONLY the employers, job titles, employment dates, education, certifications, projects, and metrics that appear in the BASE RESUME. Do NOT invent, add, rename, or substitute any company, role, date, school, degree, or number. If the base resume lists no employers, do not manufacture any (never add companies like TCS, Genpact, Infosys, etc. that are not in the base resume).
- Do NOT fabricate metrics or achievements. Keep only numbers already present in the base resume.
- Use the candidate's REAL name and contact details exactly as written in the base resume. NEVER output bracketed placeholders such as [Your Name], [City, State], [Phone Number], [Email Address], or [LinkedIn Profile URL]. If a specific contact detail is not present in the base resume, OMIT it entirely — do not write a placeholder.
- You MAY reword bullets, reorder for relevance, tighten language, use strong action verbs, and surface skills/keywords from the job description that the candidate genuinely has per the base resume.

FORMAT: clear sections in this order — Name + contact line, Summary, Experience, Skills, Education, Projects. Include a section only if the base resume has real content for it. Keep it to 1-2 pages worth of content.

Output ONLY the finished resume text, ready to copy. No commentary, no markdown code fences.`;

    const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const _stream = await _model.generateContentStream(prompt);

    for await (const chunk of _stream.stream) {
      const token = chunk.text();
      if (token) {
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[Resume] Optimize error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Resume processing failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Resume processing failed' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/v1/resume/cover-letter
 * Generate a tailored cover letter for a specific job.
 * Streams the response via SSE.
 */
router.post('/cover-letter', authenticate, async (req, res) => {
  try {
    const { resume, jobDescription, company, role } = req.body;
    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Resume and job description are required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `You are an expert cover letter writer for tech companies. Write a compelling, ready-to-send cover letter — WITHOUT inventing anything.

TODAY'S DATE: ${today}
TARGET COMPANY: ${company || 'Not specified'}
TARGET ROLE: ${role || 'Software Engineer'}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S BASE RESUME (the ONLY source of truth for facts):
${resume}

STRICT GROUND RULES — follow exactly:
- Build the letterhead from the candidate's REAL name and contact details exactly as written in the base resume. NEVER output bracketed placeholders such as [Your Name], [Your Address], [Your Phone], [Your Email], [Your LinkedIn], [Date], or [Platform where you saw the ad]. If a contact detail is absent from the base resume, OMIT that line — never leave a placeholder.
- Use TODAY'S DATE above for the date line (do not write "[Date]").
- Reference only real experience, employers, titles, and skills found in the base resume. Do NOT invent employers, roles, dates, or metrics.
- Do NOT mention where the job was advertised unless the job description states it; otherwise phrase the opening without any placeholder.
- Address the letter to "Hiring Manager" at ${company || 'the company'}.

INSTRUCTIONS:
1. Letterhead: candidate's real name + real contact details (omit any that are missing), then TODAY'S DATE, then the greeting.
2. 3-4 strong paragraphs addressing specific requirements from the job description, backed only by real resume content.
3. Genuine enthusiasm for ${company || 'the company'} and the role; confident, not arrogant.
4. Close with a professional sign-off using the candidate's real name.

Output ONLY the cover letter text, ready to copy. No commentary, no markdown code fences.`;

    const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const _stream = await _model.generateContentStream(prompt);

    for await (const chunk of _stream.stream) {
      const token = chunk.text();
      if (token) {
        res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[Resume] Cover letter error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Resume processing failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Resume processing failed' })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/v1/resume/ats-score
 * Analyze resume against job description and return ATS compatibility score.
 */
router.post('/ats-score', authenticate, async (req, res) => {
  try {
    const { resume, jobDescription } = req.body;
    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Resume and job description are required' });
    }

    const isPlaceholder = !resume.trim() || resume.trim().startsWith('[Document uploaded:');
    const resumeSection = isPlaceholder
      ? '(No resume text provided — resume was uploaded as a binary file and could not be read. Treat all JD requirements as unmet.)'
      : resume;

    const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const _resp = await _model.generateContent(`You are an ATS (Applicant Tracking System) analyzer. Compare the BASE resume against the job description requirements.

STEP 1 — Extract from the JD: every required skill, tool, technology, certification, and qualification mentioned.
STEP 2 — Check each one against the resume. Classify as matched (explicitly present) or missing.
STEP 3 — Score 0-100: (matched keywords / total JD keywords) × 100, rounded. If no resume text, score is 0.

JOB DESCRIPTION:
${jobDescription}

BASE RESUME:
${resumeSection}

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "score": <integer 0-100>,
  "keywordsMatched": ["exact keyword from JD that appears in resume", ...],
  "keywordsMissing": ["exact keyword from JD that is absent from resume", ...],
  "strengths": ["specific strength of this resume for this role", ...],
  "weaknesses": ["specific gap or missing requirement", ...],
  "suggestions": ["actionable: add X to resume", "quantify Y experience", ...]
}

Rules:
- keywordsMatched + keywordsMissing must together cover ALL significant JD requirements (aim for 10-20 total keywords)
- If resume is empty or unreadable, keywordsMatched=[], keywordsMissing=<all JD requirements>, score=0
- Never return empty keywordsMissing if the JD has requirements
- suggestions must be concrete and reference specific JD terms`);

    const text = _resp.response.text();
    try {
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      res.json(json);
    } catch {
      res.json({ score: 0, error: 'Failed to parse ATS analysis', raw: text });
    }
  } catch (err) {
    console.error('[Resume] ATS score error:', err);
    res.status(500).json({ error: 'ATS analysis failed' });
  }
});

/**
 * POST /api/v1/resume/fetch-jd
 * Fetch and extract job description text from a URL.
 * Uses plain string manipulation — no extra dependencies.
 */
router.post('/fetch-jd', authenticate, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Try platform-specific API extraction first (Workday, Greenhouse, Lever, Ashby, etc.)
    // These APIs return clean text directly, no scraping needed.
    const apiResult = await fetchJobViaAPI(url).catch(() => null);
    if (apiResult && apiResult.text && apiResult.text.length > 100) {
      return res.json({ text: apiResult.text });
    }

    // Fall back to plain HTML scraping for generic pages
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(400).json({ error: `Could not fetch URL (${response.status}). Try pasting the job description directly.` });
    }

    let html = await response.text();

    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    html = html.replace(/<[^>]+>/g, ' ');
    html = html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    const rawText = html.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim().substring(0, 12000);

    if (rawText.length < 100) {
      return res.status(400).json({ error: 'Could not extract job description from that URL. Try pasting it directly.' });
    }

    const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const _resp = await _model.generateContent(`Extract the job description from the following scraped web page text. Return ONLY the structured job posting content — job title, company, location, role summary, responsibilities, required qualifications, and nice-to-have skills. Remove all navigation, headers, footers, cookie notices, ads, and unrelated page content. Format clearly with section headings.\n\nSCRAPED TEXT:\n${rawText}`);

    const text = _resp.response.text().trim() || rawText.substring(0, 4000);
    res.json({ text });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: 'URL took too long to respond. Try pasting the job description directly.' });
    }
    res.status(500).json({ error: 'Failed to fetch URL. Try pasting the job description directly.' });
  }
});

/**
 * POST /api/v1/resume/generate
 * Full resume + cover letter generator:
 *   1. Gemini generates structured JSON (gap analysis + tailored content)
 *   2. docx renders two .docx files (resume + cover letter)
 *   3. Both returned as base64 in a single JSON response
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { resume, jobDescription, company, role, candidateName, candidateEmail, candidatePhone, candidateLinkedIn } = req.body;
    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Resume and job description are required' });
    }

    const targetCompany = company || 'the company';
    const targetRole = role || 'the role';

    const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });
    const _resp = await _model.generateContent(`You are an expert resume writer and career coach. Analyze the candidate's resume against the job description and produce a structured JSON output.

TARGET COMPANY: ${targetCompany}
TARGET ROLE: ${targetRole}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resume}

Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "candidate": {
    "name": "<extract from resume or use 'Candidate'>",
    "email": "<extract from resume or empty>",
    "phone": "<extract from resume or empty>",
    "linkedin": "<extract from resume or empty>",
    "location": "<extract from resume or empty>"
  },
  "gapAnalysis": {
    "matchScore": <0-100>,
    "strengths": ["<strength specific to this JD>"],
    "gaps": ["<specific gap vs JD requirement>"],
    "quickWins": ["<add X to resume to close gap Y>"]
  },
  "optimizedResume": {
    "summary": "<2-3 sentence professional summary tailored to this role>",
    "experience": [
      {
        "title": "<job title>",
        "company": "<company>",
        "dates": "<dates>",
        "bullets": ["<achievement bullet with metric if possible>"]
      }
    ],
    "skills": ["<skill1>", "<skill2>"],
    "education": [{ "degree": "<degree>", "school": "<school>", "year": "<year>" }],
    "certifications": ["<cert if any>"],
    "projects": [{ "name": "<project>", "description": "<1-line>", "tech": "<tech stack>" }]
  },
  "coverLetter": {
    "opening": "<strong opening paragraph — specific to company and role>",
    "body1": "<paragraph 2 — most relevant experience/achievement>",
    "body2": "<paragraph 3 — cultural fit / motivation for this company>",
    "closing": "<closing paragraph with call to action>"
  }
}`);

    const raw = _resp.response.text().trim();
    let data;
    try {
      data = JSON.parse(raw.replace(/^```json?\n?/, '').replace(/```$/, '').trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw });
    }

    const cand = data.candidate || {};
    const name = candidateName || cand.name || 'Candidate';
    const email = candidateEmail || cand.email || '';
    const phone = candidatePhone || cand.phone || '';
    const linkedin = candidateLinkedIn || cand.linkedin || '';
    const location = cand.location || '';
    const r = data.optimizedResume || {};
    const cl = data.coverLetter || {};

    // --- Build Resume DOCX ---
    const contactParts = [email, phone, linkedin, location].filter(Boolean).join('  |  ');
    const resumeDoc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: name, bold: true, size: 32 })],
          }),
          contactParts ? new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: contactParts, size: 20, color: '444444' })],
            spacing: { after: 200 },
          }) : null,

          new Paragraph({ text: 'PROFESSIONAL SUMMARY', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: r.summary || '' })], spacing: { after: 160 } }),

          new Paragraph({ text: 'EXPERIENCE', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
          ...(r.experience || []).flatMap(exp => [
            new Paragraph({
              children: [
                new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true }),
                new TextRun({ text: `\t${exp.dates}`, color: '666666' }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              spacing: { before: 120 },
            }),
            ...(exp.bullets || []).map(b => new Paragraph({
              children: [new TextRun({ text: `• ${b}` })],
              indent: { left: 360 },
            })),
          ]),

          new Paragraph({ text: 'SKILLS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: (r.skills || []).join(' · ') })] }),

          new Paragraph({ text: 'EDUCATION', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
          ...(r.education || []).map(e => new Paragraph({
            children: [
              new TextRun({ text: `${e.degree} — ${e.school}`, bold: true }),
              new TextRun({ text: e.year ? `  (${e.year})` : '', color: '666666' }),
            ],
          })),

          ...(r.certifications?.length ? [
            new Paragraph({ text: 'CERTIFICATIONS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
            ...(r.certifications || []).map(c => new Paragraph({ children: [new TextRun({ text: `• ${c}` })] })),
          ] : []),

          ...(r.projects?.length ? [
            new Paragraph({ text: 'PROJECTS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
            ...(r.projects || []).map(p => new Paragraph({
              children: [
                new TextRun({ text: `${p.name}: `, bold: true }),
                new TextRun({ text: `${p.description}  [${p.tech}]` }),
              ],
            })),
          ] : []),
        ].filter(Boolean),
      }],
    });

    // --- Build Cover Letter DOCX ---
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const coverDoc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: name, bold: true, size: 28 })], spacing: { after: 60 } }),
          contactParts ? new Paragraph({ children: [new TextRun({ text: contactParts, color: '444444' })], spacing: { after: 60 } }) : null,
          new Paragraph({ children: [new TextRun({ text: today, color: '666666' })], spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: `Hiring Team`, bold: true })], spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: targetCompany })], spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: `Dear Hiring Manager,` })], spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: cl.opening || '' })], spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: cl.body1 || '' })], spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: cl.body2 || '' })], spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: cl.closing || '' })], spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: 'Sincerely,' })], spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: name, bold: true })] }),
        ].filter(Boolean),
      }],
    });

    const [resumeBuf, coverBuf] = await Promise.all([
      Packer.toBuffer(resumeDoc),
      Packer.toBuffer(coverDoc),
    ]);

    const slug = `${targetCompany}_${targetRole}`.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    res.json({
      gapAnalysis: data.gapAnalysis || {},
      resume: { base64: resumeBuf.toString('base64'), filename: `Resume_${slug}.docx` },
      coverLetter: { base64: coverBuf.toString('base64'), filename: `CoverLetter_${slug}.docx` },
    });
  } catch (err) {
    console.error('[Resume] Generate error:', err);
    res.status(500).json({ error: 'Resume generation failed' });
  }
});

export default router;
