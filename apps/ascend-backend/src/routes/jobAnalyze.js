import { Router } from 'express';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

/* ── Helpers ─────────────────────────────────────────────── */

function getClient() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

/**
 * Fetch page HTML with browser-like headers.
 * Follows redirects, handles common career page platforms.
 */
async function fetchPageHTML(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract meaningful text from HTML, stripping navigation, scripts, styles, etc.
 * Prioritizes known career-page selectors, then falls back to <main> / <body>.
 */
function extractJobText(html) {
  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, nav, footer, header, iframe, noscript, svg, img, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $('[class*="cookie"], [class*="banner"], [class*="popup"], [class*="modal"], [id*="cookie"], [id*="banner"]').remove();

  // Career platform selectors (Workday, Greenhouse, Lever, Ashby, etc.)
  const selectors = [
    // Workday
    '[data-automation-id="jobPostingDescription"]',
    '.job-description',
    '[class*="jobDescription"]',
    // Greenhouse
    '#content', '.content',
    '#job-content',
    '.job__description',
    // Lever
    '.posting-page',
    '.section-wrapper',
    '[class*="posting-"]',
    // Ashby
    '[class*="ashby-job"]',
    // Generic
    '[class*="job-detail"]',
    '[class*="jobDetail"]',
    '[class*="job_description"]',
    '[class*="jd-"]',
    'article',
    '[role="main"]',
    'main',
  ];

  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 200) {
      return cleanText(el.text());
    }
  }

  // Fallback: body text
  return cleanText($('body').text());
}

/**
 * Collapse whitespace, remove excessive blank lines.
 */
function cleanText(text) {
  return text
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000); // Cap to avoid overly large prompts
}

/**
 * Extract the page <title> as a hint.
 */
function extractPageTitle(html) {
  const $ = cheerio.load(html);
  return $('title').first().text().trim().slice(0, 200);
}

/* ── AI Analysis ─────────────────────────────────────────── */

const ANALYZE_PROMPT = `You are an expert technical recruiter and interview preparation specialist.

Given a job description (scraped from a career page), extract and return a JSON object with exactly these fields:

{
  "title": "exact job title",
  "company": "company name",
  "location": "location(s) or Remote",
  "role_type": "one of: devops, sre, backend, frontend, fullstack, data, ml, cloud, platform, mobile, security, general",
  "seniority": "one of: intern, junior, mid, senior, staff, principal, manager, director",
  "tech_stack": ["array", "of", "technologies", "mentioned"],
  "key_requirements": ["top 5 most important requirements"],
  "coding_focus": ["3-5 specific coding topics most relevant for this role, e.g. 'Graph algorithms', 'String manipulation', 'Concurrency'"],
  "system_design_focus": ["3-5 system design topics most relevant, e.g. 'CI/CD Pipeline', 'Container Orchestration', 'Distributed Logging'"],
  "behavioral_focus": ["3-5 behavioral themes most relevant, e.g. 'Leadership', 'Cross-team collaboration', 'Incident management'"],
  "summary": "2-3 sentence summary of what this role does and what interview prep should focus on"
}

Rules:
- Detect role_type from the title and description. If unclear, use "general".
- tech_stack should include programming languages, frameworks, cloud services, databases, tools mentioned.
- coding_focus should map to actual DSA/coding topics likely tested for this role, not generic ones.
- system_design_focus should be specific to what this role would design/build.
- behavioral_focus should reflect the seniority and team dynamics described.
- Return ONLY valid JSON, no markdown fences, no explanation.`;

async function analyzeJobDescription(jobText, pageTitle) {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `Page title: ${pageTitle}\n\nJob description:\n${jobText}`,
      },
    ],
    system: ANALYZE_PROMPT,
  });

  const text = response.content[0].text.trim();
  // Parse JSON — handle potential markdown fences
  const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}

/* ── Route ────────────────────────────────────────────────── */

/**
 * POST /api/job-analyze
 * Body: { url: "https://..." }
 * Returns: structured job analysis with role-specific prep recommendations
 */
router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  // Basic URL validation
  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL. Please enter a valid job listing URL.' });
  }

  try {
    // Step 1: Fetch the page
    const html = await fetchPageHTML(url);

    // Step 2: Extract text from HTML
    const jobText = extractJobText(html);
    const pageTitle = extractPageTitle(html);

    if (jobText.length < 100) {
      return res.status(422).json({
        error: 'Could not extract enough content from this URL. The page may require login or use JavaScript rendering. Try pasting the job description text directly.',
        partial: true,
      });
    }

    // Step 3: Analyze with Claude
    const analysis = await analyzeJobDescription(jobText, pageTitle);

    return res.json({
      success: true,
      source_url: url,
      ...analysis,
    });
  } catch (err) {
    console.error('[job-analyze] Error:', err.message);

    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'The job page took too long to load. Please try again.' });
    }
    if (err.message?.includes('HTTP 4')) {
      return res.status(422).json({ error: 'Could not access this job page. It may require authentication or be expired.' });
    }
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to analyze the job description. Please try again.' });
    }

    return res.status(500).json({ error: err.message || 'Failed to analyze job URL' });
  }
});

/**
 * POST /api/job-analyze/text
 * Body: { text: "paste full JD here", title?: "optional job title hint" }
 * Returns: same structured analysis, for when URL scraping doesn't work
 */
router.post('/text', async (req, res) => {
  const { text, title } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide at least 50 characters of job description text.' });
  }

  try {
    const jobText = cleanText(text);
    const analysis = await analyzeJobDescription(jobText, title || '');
    return res.json({ success: true, source: 'text', ...analysis });
  } catch (err) {
    console.error('[job-analyze/text] Error:', err.message);
    return res.status(500).json({ error: 'Failed to analyze the job description. Please try again.' });
  }
});

export default router;
