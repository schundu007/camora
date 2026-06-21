import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
const client = new Anthropic();

/**
 * POST /api/v1/resume/optimize
 * Optimize a resume for a specific job description using Claude AI.
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

    const prompt = `You are an expert resume optimizer for tech companies. Optimize this resume for the following job.

TARGET COMPANY: ${company || 'Not specified'}
TARGET ROLE: ${role || 'Software Engineer'}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resume}

INSTRUCTIONS:
1. Rewrite the resume to be ATS-optimized for this specific job
2. Match keywords from the job description
3. Quantify achievements with metrics where possible
4. Use strong action verbs
5. Keep it concise (1-2 pages worth of content)
6. Highlight relevant skills and experience
7. Format with clear sections: Summary, Experience, Skills, Education, Projects

Output ONLY the optimized resume text, ready to copy. No commentary.`;

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
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

    const prompt = `You are an expert cover letter writer for tech companies. Write a compelling cover letter.

TARGET COMPANY: ${company || 'Not specified'}
TARGET ROLE: ${role || 'Software Engineer'}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resume}

INSTRUCTIONS:
1. Write a professional, compelling cover letter (3-4 paragraphs)
2. Address specific requirements from the job description
3. Highlight the candidate's most relevant experience and achievements
4. Show genuine enthusiasm for the company and role
5. Include specific technical skills that match the job
6. Keep it concise but impactful
7. Use a professional tone — confident but not arrogant

Output ONLY the cover letter text, ready to copy. No commentary.`;

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
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

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: `You are an ATS (Applicant Tracking System) analyzer. Compare the BASE resume against the job description requirements.

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
- suggestions must be concrete and reference specific JD terms` }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
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

    // Strip scripts, styles, and HTML tags with regex (no cheerio dependency)
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    html = html.replace(/<[^>]+>/g, ' ');
    // Decode common HTML entities
    html = html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    // Collapse whitespace — take first 12k chars as raw input for Claude
    const rawText = html.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim().substring(0, 12000);

    if (rawText.length < 100) {
      return res.status(400).json({ error: 'Could not extract job description from that URL. Try pasting it directly.' });
    }

    // Use Claude Haiku to extract only the relevant JD content, stripping nav/footer/ads
    const extraction = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Extract the job description from the following scraped web page text. Return ONLY the structured job posting content — job title, company, location, role summary, responsibilities, required qualifications, and nice-to-have skills. Remove all navigation, headers, footers, cookie notices, ads, and unrelated page content. Format clearly with section headings.\n\nSCRAPED TEXT:\n${rawText}`,
      }],
    });

    const text = extraction.content[0]?.text?.trim() || rawText.substring(0, 4000);
    res.json({ text });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: 'URL took too long to respond. Try pasting the job description directly.' });
    }
    res.status(500).json({ error: 'Failed to fetch URL. Try pasting the job description directly.' });
  }
});

export default router;
