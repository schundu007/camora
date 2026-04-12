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
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: `Analyze this resume against the job description for ATS compatibility. Return ONLY valid JSON.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}

Return this exact JSON format:
{
  "score": <number 0-100>,
  "keywordsMatched": ["keyword1", "keyword2"],
  "keywordsMissing": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}` }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    try {
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      res.json(json);
    } catch {
      res.json({ score: 0, error: 'Failed to parse ATS analysis', raw: text });
    }
  } catch (err) {
    console.error('[Resume] ATS score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
