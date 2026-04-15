import { Router } from 'express';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import * as freeUsageService from '../services/freeUsageService.js';

const router = Router();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

/* ── Helpers ─────────────────────────────────────────────── */

function getClient() {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow', ...options });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/* ── Platform Detection & API-based scraping ─────────────── */

/**
 * Detect the career platform from URL and use its API when possible.
 * Most modern career pages (Workday, Greenhouse, Lever, Ashby) are SPAs
 * that load job data via JSON APIs — much more reliable than HTML scraping.
 */
async function fetchJobViaAPI(url) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  // ── Workday ──
  // URL: https://{company}.wd{N}.myworkdayjobs.com/{site}/job/{location}/{title}_{jobId}
  // API: https://{company}.wd{N}.myworkdayjobs.com/wday/cxs/{company}/{site}/job/{jobId}
  if (host.includes('myworkdayjobs.com')) {
    return await fetchWorkdayJob(parsed);
  }

  // ── Greenhouse (boards) ──
  // URL: https://boards.greenhouse.io/{company}/jobs/{id}
  // API: https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{id}
  if (host === 'boards.greenhouse.io' || host.includes('greenhouse.io')) {
    return await fetchGreenhouseJob(parsed);
  }

  // ── Lever ──
  // URL: https://jobs.lever.co/{company}/{id}
  // Lever serves server-rendered HTML, cheerio works well
  if (host === 'jobs.lever.co') {
    return await fetchLeverJob(url);
  }

  // ── Ashby ──
  // URL: https://jobs.ashbyhq.com/{company}/{id}
  // API: https://jobs.ashbyhq.com/api/non-user-graphql
  if (host === 'jobs.ashbyhq.com') {
    return await fetchAshbyJob(parsed);
  }

  // ── SmartRecruiters ──
  // URL: https://jobs.smartrecruiters.com/{company}/{id}
  // API: https://jobs.smartrecruiters.com/sr-api/gateway/job/{id}
  if (host === 'jobs.smartrecruiters.com') {
    return await fetchSmartRecruitersJob(parsed);
  }

  // ── LinkedIn ──
  if (host.includes('linkedin.com')) {
    return await fetchLinkedInJob(parsed);
  }

  // ── Generic HTML fallback ──
  return null;
}

async function fetchWorkdayJob(parsed) {
  const host = parsed.hostname;
  const path = parsed.pathname;

  // Extract company name and site from host/path
  // host: nvidia.wd5.myworkdayjobs.com
  // path: /NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Senior-DevOps-Engineer---Robotics_JR2014821
  const companyMatch = host.match(/^([^.]+)\./);
  const company = companyMatch ? companyMatch[1] : '';

  // Path segments: ['', 'SiteName', 'job', 'location', 'title_jobId'] or similar
  const segments = path.split('/').filter(Boolean);
  const site = segments[0] || '';

  // Find the job posting ID — last segment, after underscore: Title_JR2014821
  const lastSegment = segments[segments.length - 1] || '';

  // Workday CXS API — fetch job posting
  // Format: /wday/cxs/{company}/{site}/job/{lastSegment}
  const apiUrl = `https://${host}/wday/cxs/${company}/${site}/job/${lastSegment}`;
  console.log('[job-analyze] Workday API:', apiUrl);

  try {
    const res = await fetchWithTimeout(apiUrl, {
      headers: { ...FETCH_HEADERS, 'Accept': 'application/json' },
    });
    const data = await res.json();

    const posting = data.jobPostingInfo || data;
    const title = posting.title || posting.jobPostingTitle || '';
    const description = posting.jobDescription || posting.description || '';
    const additionalInfo = posting.additionalInformation || '';
    const location = posting.location || posting.primaryLocation || '';
    const companyName = posting.company || posting.companyName || company;

    const fullText = [title, companyName, location, description, additionalInfo]
      .filter(Boolean)
      .join('\n\n');

    if (fullText.length > 100) {
      return { text: cleanText(stripHtml(fullText)), pageTitle: `${title} - ${companyName}`, platform: 'workday' };
    }
  } catch (err) {
    console.warn('[job-analyze] Workday API failed:', err.message);
  }
  return null;
}

async function fetchGreenhouseJob(parsed) {
  const path = parsed.pathname;
  // /company/jobs/12345 or /company/jobs/12345-title
  const match = path.match(/\/([^/]+)\/jobs\/(\d+)/);
  if (!match) return null;

  const [, board, jobId] = match;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}`;
  console.log('[job-analyze] Greenhouse API:', apiUrl);

  try {
    const res = await fetchWithTimeout(apiUrl, {
      headers: { ...FETCH_HEADERS, 'Accept': 'application/json' },
    });
    const data = await res.json();

    const title = data.title || '';
    const content = data.content || '';
    const location = data.location?.name || '';
    const company = data.company?.name || board;

    const fullText = [title, company, location, content].filter(Boolean).join('\n\n');
    if (fullText.length > 100) {
      return { text: cleanText(stripHtml(fullText)), pageTitle: `${title} - ${company}`, platform: 'greenhouse' };
    }
  } catch (err) {
    console.warn('[job-analyze] Greenhouse API failed:', err.message);
  }
  return null;
}

async function fetchLeverJob(url) {
  try {
    const res = await fetchWithTimeout(url, {
      headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
    });
    const html = await res.text();
    return { text: extractJobTextFromHtml(html), pageTitle: extractPageTitle(html), platform: 'lever' };
  } catch (err) {
    console.warn('[job-analyze] Lever fetch failed:', err.message);
  }
  return null;
}

async function fetchAshbyJob(parsed) {
  const segments = parsed.pathname.split('/').filter(Boolean);
  // /company/jobId
  if (segments.length < 2) return null;

  const jobId = segments[segments.length - 1];
  const apiUrl = 'https://jobs.ashbyhq.com/api/non-user-graphql';
  console.log('[job-analyze] Ashby API for job:', jobId);

  try {
    const res = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { ...FETCH_HEADERS, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        operationName: 'ApiJobBoardJobPosting',
        variables: { organizationHostedJobsPageName: segments[0], jobPostingId: jobId },
        query: `query ApiJobBoardJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
          jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
            id title descriptionHtml locationName departmentName
            organization { name }
          }
        }`,
      }),
    });
    const data = await res.json();
    const posting = data?.data?.jobPosting;
    if (!posting) return null;

    const fullText = [posting.title, posting.organization?.name, posting.locationName, posting.departmentName, posting.descriptionHtml]
      .filter(Boolean).join('\n\n');

    if (fullText.length > 100) {
      return { text: cleanText(stripHtml(fullText)), pageTitle: `${posting.title} - ${posting.organization?.name || ''}`, platform: 'ashby' };
    }
  } catch (err) {
    console.warn('[job-analyze] Ashby API failed:', err.message);
  }
  return null;
}

async function fetchSmartRecruitersJob(parsed) {
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const jobId = segments[segments.length - 1];
  const apiUrl = `https://jobs.smartrecruiters.com/sr-api/gateway/job/${jobId}`;
  console.log('[job-analyze] SmartRecruiters API:', apiUrl);

  try {
    const res = await fetchWithTimeout(apiUrl, {
      headers: { ...FETCH_HEADERS, 'Accept': 'application/json' },
    });
    const data = await res.json();

    const title = data.name || '';
    const company = data.company?.name || '';
    const location = data.location?.city || '';
    const description = data.jobAd?.sections?.jobDescription?.text || '';
    const qualifications = data.jobAd?.sections?.qualifications?.text || '';
    const additionalInfo = data.jobAd?.sections?.additionalInformation?.text || '';

    const fullText = [title, company, location, description, qualifications, additionalInfo]
      .filter(Boolean).join('\n\n');

    if (fullText.length > 100) {
      return { text: cleanText(stripHtml(fullText)), pageTitle: `${title} - ${company}`, platform: 'smartrecruiters' };
    }
  } catch (err) {
    console.warn('[job-analyze] SmartRecruiters API failed:', err.message);
  }
  return null;
}

async function fetchLinkedInJob(parsed) {
  // LinkedIn job URLs: /jobs/view/{id} — try to get the page HTML
  // LinkedIn usually returns enough in the HTML for non-logged-in users
  const url = parsed.href;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { ...FETCH_HEADERS, 'Accept': 'text/html' },
    });
    const html = await res.text();
    const text = extractJobTextFromHtml(html);
    if (text.length > 100) {
      return { text, pageTitle: extractPageTitle(html), platform: 'linkedin' };
    }
  } catch (err) {
    console.warn('[job-analyze] LinkedIn fetch failed:', err.message);
  }
  return null;
}

/* ── HTML text extraction ────────────────────────────────── */

function stripHtml(html) {
  const $ = cheerio.load(html);
  return $.text();
}

function extractJobTextFromHtml(html) {
  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, nav, footer, header, iframe, noscript, svg, img, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $('[class*="cookie"], [class*="banner"], [class*="popup"], [class*="modal"], [id*="cookie"], [id*="banner"]').remove();

  const selectors = [
    '[data-automation-id="jobPostingDescription"]',
    '.job-description', '[class*="jobDescription"]',
    '#content', '.content', '#job-content', '.job__description',
    '.posting-page', '.section-wrapper', '[class*="posting-"]',
    '[class*="ashby-job"]',
    '[class*="job-detail"]', '[class*="jobDetail"]', '[class*="job_description"]',
    '.description', '.job-details',
    'article', '[role="main"]', 'main',
  ];

  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 200) {
      return cleanText(el.text());
    }
  }

  return cleanText($('body').text());
}

function cleanText(text) {
  return text
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000);
}

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
  // Check free usage limits (authenticate middleware guarantees req.user)
  const userId = req.user.id;
  const canUse = await freeUsageService.canUseFeature(userId, 'company_prep');
  if (!canUse.allowed) {
    return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
  }

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
    let jobText = '';
    let pageTitle = '';
    let platform = 'generic';

    // Step 1: Try platform-specific API extraction first (works for JS-rendered SPAs)
    const apiResult = await fetchJobViaAPI(url);
    if (apiResult && apiResult.text.length > 100) {
      jobText = apiResult.text;
      pageTitle = apiResult.pageTitle;
      platform = apiResult.platform;
      console.log(`[job-analyze] Got ${jobText.length} chars via ${platform} API`);
    }

    // Step 2: Fallback to HTML scraping if API didn't work
    if (jobText.length < 100) {
      console.log('[job-analyze] Falling back to HTML scraping');
      const res2 = await fetchWithTimeout(url, {
        headers: { ...FETCH_HEADERS, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      const html = await res2.text();
      jobText = extractJobTextFromHtml(html);
      pageTitle = extractPageTitle(html);
    }

    if (jobText.length < 100) {
      return res.status(422).json({
        error: 'Could not extract enough content from this URL. The page may require login or use JavaScript rendering. Try pasting the job description text directly.',
        partial: true,
      });
    }

    // Step 3: Analyze with Claude
    const analysis = await analyzeJobDescription(jobText, pageTitle);

    // Deduct free usage on success
    await freeUsageService.useFreeAllowance(userId, 'company_prep');

    return res.json({
      success: true,
      source_url: url,
      platform,
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
  // Check free usage limits (authenticate middleware guarantees req.user)
  const userId = req.user.id;
  const canUse = await freeUsageService.canUseFeature(userId, 'company_prep');
  if (!canUse.allowed) {
    return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
  }

  const { text, title } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide at least 50 characters of job description text.' });
  }
  if (text.length > 50000) {
    return res.status(400).json({ error: 'Text too long (max 50,000 characters)' });
  }

  try {
    const jobText = cleanText(text);
    const analysis = await analyzeJobDescription(jobText, title || '');
    // Deduct free usage on success
    await freeUsageService.useFreeAllowance(userId, 'company_prep');
    return res.json({ success: true, source: 'text', ...analysis });
  } catch (err) {
    console.error('[job-analyze/text] Error:', err.message);
    return res.status(500).json({ error: 'Failed to analyze the job description. Please try again.' });
  }
});

export default router;
