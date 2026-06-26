import { Router } from 'express';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../services/adminConfig.js';
import dns from 'node:dns/promises';
import * as freeUsageService from '../services/freeUsageService.js';
import { recordTokens } from '../services/aiHoursMeter.js';

const router = Router();

const MODEL = 'gemini-2.5-flash';

/* ── Gemini Client ───────────────────────────────────────── */

let _genAI = null;
let _genAIKey = null;
function getGenAI() {
  const k = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_genAI || _genAIKey !== k) { _genAI = new GoogleGenerativeAI(k); _genAIKey = k; }
  return _genAI;
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * SSRF guard. Reject any URL that resolves to a non-routable IP — RFC1918,
 * loopback, link-local, the cloud metadata endpoint (169.254.169.254),
 * carrier-grade NAT (100.64/10), unique-local IPv6 (fc00::/7), etc.
 *
 * Without this, an authenticated user can ask the backend to fetch
 * arbitrary internal URLs ("http://10.0.0.x:5432" → reach Postgres,
 * "http://localhost:8001" → reach ai-services bypassing X-API-Key when
 * AI_SERVICES_DEV_OPEN is on, "http://169.254.169.254/latest/meta-data/"
 * → exfiltrate cloud credentials).
 */
function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('169.254.')) return true;            // link-local + AWS/GCP metadata
  if (ip.startsWith('10.')) return true;                  // RFC1918
  if (ip.startsWith('192.168.')) return true;             // RFC1918
  // 172.16.0.0 – 172.31.255.255
  if (ip.startsWith('172.')) {
    const n = parseInt(ip.split('.')[1], 10);
    if (n >= 16 && n <= 31) return true;
  }
  if (ip.startsWith('100.')) {                            // 100.64.0.0/10 (CGNAT)
    const n = parseInt(ip.split('.')[1], 10);
    if (n >= 64 && n <= 127) return true;
  }
  if (ip === '0.0.0.0') return true;
  if (ip.startsWith('::ffff:')) return isPrivateIp(ip.slice(7)); // v4-mapped v6
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true; // ULA
  if (ip.toLowerCase().startsWith('fe80:')) return true;  // link-local v6
  return false;
}

async function assertPublicHost(rawUrl) {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('blocked: bad protocol');
  let addrs;
  try {
    addrs = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error('blocked: dns');
  }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error('blocked: private ip');
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let currentUrl = url;
    let hops = 0;
    while (hops <= 8) {
      // SSRF check before every hop — prevents open-redirect chains to internal IPs
      await assertPublicHost(currentUrl);
      const res = await fetch(currentUrl, { signal: controller.signal, redirect: 'manual', ...options });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new Error(`HTTP ${res.status}`);
        let nextUrl;
        try {
          nextUrl = new URL(location, currentUrl).href;
        } catch {
          throw new Error(`HTTP ${res.status}`);
        }
        currentUrl = nextUrl;
        hops++;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    }
    throw new Error('Too many redirects');
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

/**
 * Convert a candidate cheerio element into clean prose. We can't just
 * call `.text()` on the matched element because Greenhouse / Workday /
 * SmartRecruiters serve their job description as an HTML-encoded
 * string nested inside a wrapper div — the inner content is parsed as
 * TEXT, not as HTML, so cheerio's text extractor returns the raw
 * angle-bracket markup. Two-step approach instead:
 *   1. Inject newlines around block-level boundaries so paragraphs
 *      survive when text() collapses them.
 *   2. Re-parse the extracted text once more if it still contains
 *      tag-shaped substrings — that catches the embedded-HTML case.
 */
function elementToCleanText($, el) {
  // Wrap in a synthetic root so we can mutate without touching the
  // original document. Append \n after block-level elements so
  // text() doesn't smash everything onto one line.
  const $clone = cheerio.load(`<div id="__r"></div>`);
  $clone('#__r').append($.html(el));
  $clone('#__r p, #__r li, #__r br, #__r h1, #__r h2, #__r h3, #__r h4, #__r div').each((_, e) => {
    $clone(e).append('\n');
  });
  return stripHtmlIfPresent($clone('#__r').text());
}

/**
 * Catches the case where extracted text itself contains literal
 * angle-bracket markup. Idempotent — early-returns when input is
 * already clean prose.
 */
function stripHtmlIfPresent(text) {
  if (!text || typeof text !== 'string') return text;
  if (!/<[a-z][^>]{0,300}>/i.test(text)) return text;
  try {
    const $ = cheerio.load(`<div id="__r">${text}</div>`);
    $('#__r p, #__r li, #__r br, #__r h1, #__r h2, #__r h3, #__r h4, #__r div').each((_, el) => {
      $(el).append('\n');
    });
    return $('#__r').text()
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  } catch {
    return text;
  }
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
    const el = $(sel).first();
    if (el.length) {
      const candidate = cleanText(elementToCleanText($, el.get(0)));
      if (candidate.length > 200) return candidate;
    }
  }

  return cleanText(elementToCleanText($, $('body').get(0)));
}

function cleanText(text) {
  return stripHtmlIfPresent(text || '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .replace(/[ ]+\n/g, '\n')
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
  const _model = getGenAI().getGenerativeModel({ model: MODEL, systemInstruction: ANALYZE_PROMPT });
  const _msgs = [`Page title: ${pageTitle}\n\nJob description:\n${jobText}`];
  const _resp = await _model.generateContent(_msgs.join('\n\n'));

  const text = _resp.response.text().trim();
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
  // Check free usage limits
  const userId = req.user?.id;
  if (userId) {
    const canUse = await freeUsageService.canUseFeature(userId, 'company_prep');
    if (!canUse.allowed) {
      return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
    }
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

    // Step 3: Analyze with Gemini
    const analysis = await analyzeJobDescription(jobText, pageTitle);

    // Deduct free usage on success
    if (userId) await freeUsageService.useFreeAllowance(userId, 'company_prep');

    if (userId) {
      recordTokens({
        userId,
        surface: 'capra_job_analyze',
        tokensIn: Math.ceil((jobText || '').length / 4),
        tokensOut: Math.ceil(JSON.stringify(analysis || {}).length / 4),
        model: MODEL,
      });
    }

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
 * POST /api/job-analyze/fetch-text
 * Body: { url: "https://..." }
 * Returns: { text, pageTitle, platform } — raw scraped JD text, no AI analysis.
 * Used by the prep Materials JD card to autofill a job posting URL.
 */
router.post('/fetch-text', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
  } catch {
    return res.status(400).json({ error: 'Invalid URL. Please enter a valid job listing URL.' });
  }

  try {
    let jobText = '';
    let pageTitle = '';
    let platform = 'generic';

    const apiResult = await fetchJobViaAPI(url);
    if (apiResult && apiResult.text.length > 100) {
      jobText = apiResult.text;
      pageTitle = apiResult.pageTitle;
      platform = apiResult.platform;
    }

    if (jobText.length < 100) {
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
      });
    }

    return res.json({ success: true, text: jobText, pageTitle, platform, source_url: url });
  } catch (err) {
    console.error('[job-analyze/fetch-text] Error:', err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'The job page took too long to load. Please try again.' });
    }
    if (err.message?.includes('HTTP 4')) {
      return res.status(422).json({ error: 'Could not access this job page. It may require authentication or be expired.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch job URL' });
  }
});

/**
 * POST /api/job-analyze/text
 * Body: { text: "paste full JD here", title?: "optional job title hint" }
 * Returns: same structured analysis, for when URL scraping doesn't work
 */
router.post('/text', async (req, res) => {
  // Check free usage limits
  const userId = req.user?.id;
  if (userId) {
    const canUse = await freeUsageService.canUseFeature(userId, 'company_prep');
    if (!canUse.allowed) {
      return res.status(429).json({ error: canUse.reason || 'Free trial exhausted.', subscriptionRequired: true });
    }
  }

  const { text, title } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide at least 50 characters of job description text.' });
  }

  try {
    const jobText = cleanText(text);
    const analysis = await analyzeJobDescription(jobText, title || '');
    // Deduct free usage on success
    if (userId) {
      await freeUsageService.useFreeAllowance(userId, 'company_prep');
      recordTokens({
        userId,
        surface: 'capra_job_analyze',
        tokensIn: Math.ceil(jobText.length / 4),
        tokensOut: Math.ceil(JSON.stringify(analysis || {}).length / 4),
        model: MODEL,
      });
    }
    return res.json({ success: true, source: 'text', ...analysis });
  } catch (err) {
    console.error('[job-analyze/text] Error:', err.message);
    return res.status(500).json({ error: 'Failed to analyze the job description. Please try again.' });
  }
});

export default router;
export { fetchJobViaAPI };
