/**
 * Company-context briefings for Sona.
 *
 * For known companies, fetches small public sources (engineering blog
 * landing page + GitHub org's top repos), extracts plain text, and asks
 * Claude Haiku to compress everything into a ~400-word briefing the
 * candidate can lean on during the interview. The briefing is cached
 * in `lumora_company_context` for 7 days; reads are sub-millisecond
 * from the cache and stale rows are refreshed in the background.
 *
 * Safety: all outbound HTTP is restricted to the COMPANY_SOURCES
 * allowlist below (no SSRF / no user-controlled URLs reach `fetch`).
 * Companies not in the allowlist get no web context — the existing
 * culture frame from companyCulture.js is the fallback.
 */
import Anthropic from '@anthropic-ai/sdk';
import { query } from '../lib/shared-db.js';

const FETCH_TIMEOUT_MS = 6000;
const FETCH_BUDGET_MS = 14000;       // total time across all sources per company
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SUMMARY_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

// Allowlist: company → public sources we trust to fetch from. Keys are
// matched case-insensitively against the company name passed in. The
// `eng` URL is the engineering blog landing page; the `github` is the
// org slug (we hit the public REST API). Both are optional; one is
// enough to produce a useful briefing.
const COMPANY_SOURCES = {
  NVIDIA: { eng: 'https://developer.nvidia.com/blog/', github: 'NVIDIA' },
  Google: { eng: 'https://blog.google/technology/research/', github: 'google' },
  Meta: { eng: 'https://engineering.fb.com/', github: 'facebook' },
  Apple: { eng: 'https://developer.apple.com/news/', github: 'apple' },
  Amazon: { eng: 'https://aws.amazon.com/blogs/architecture/', github: 'aws' },
  Microsoft: { eng: 'https://devblogs.microsoft.com/', github: 'microsoft' },
  Netflix: { eng: 'https://netflixtechblog.com/', github: 'Netflix' },
  Stripe: { eng: 'https://stripe.com/blog/engineering', github: 'stripe' },
  Anthropic: { eng: 'https://www.anthropic.com/news', github: 'anthropics' },
  OpenAI: { eng: 'https://openai.com/blog', github: 'openai' },
  Uber: { eng: 'https://www.uber.com/en/blog/engineering/', github: 'uber' },
  Airbnb: { eng: 'https://medium.com/airbnb-engineering', github: 'airbnb' },
  Tesla: { eng: 'https://www.tesla.com/blog', github: 'teslamotors' },
  Databricks: { eng: 'https://www.databricks.com/blog/category/engineering', github: 'databricks' },
  Snowflake: { eng: 'https://www.snowflake.com/blog/', github: 'snowflakedb' },
  Shopify: { eng: 'https://shopify.engineering/', github: 'Shopify' },
  Cloudflare: { eng: 'https://blog.cloudflare.com/', github: 'cloudflare' },
  GitHub: { eng: 'https://github.blog/engineering/', github: 'github' },
  Datadog: { eng: 'https://www.datadoghq.com/blog/engineering/', github: 'DataDog' },
  Pinterest: { eng: 'https://medium.com/pinterest-engineering', github: 'pinterest' },
  LinkedIn: { eng: 'https://www.linkedin.com/blog/engineering', github: 'linkedin' },
  TikTok: { eng: null, github: 'bytedance' },
  ByteDance: { eng: null, github: 'bytedance' },
  Salesforce: { eng: 'https://engineering.salesforce.com/', github: 'salesforce' },
  Oracle: { eng: 'https://blogs.oracle.com/cloud-infrastructure/', github: 'oracle' },
  Intel: { eng: 'https://www.intel.com/content/www/us/en/developer/articles/overview.html', github: 'intel' },
  AMD: { eng: 'https://gpuopen.com/learn/', github: 'GPUOpen-LibrariesAndSDKs' },
  Adobe: { eng: 'https://medium.com/adobetech', github: 'adobe' },
  Coinbase: { eng: 'https://www.coinbase.com/blog/category/engineering', github: 'coinbase' },
  Robinhood: { eng: 'https://newsroom.aboutrobinhood.com/', github: 'Robinhood' },
  Plaid: { eng: 'https://plaid.com/blog/', github: 'plaid' },
  Notion: { eng: 'https://www.notion.so/blog', github: 'makenotion' },
  Figma: { eng: 'https://www.figma.com/blog/section/engineering/', github: 'figma' },
  Vercel: { eng: 'https://vercel.com/blog', github: 'vercel' },
  Supabase: { eng: 'https://supabase.com/blog', github: 'supabase' },
  MongoDB: { eng: 'https://www.mongodb.com/developer/', github: 'mongodb' },
  Spotify: { eng: 'https://engineering.atspotify.com/', github: 'spotify' },
  Reddit: { eng: 'https://www.reddit.com/r/RedditEng/', github: 'reddit' },
  Discord: { eng: 'https://discord.com/blog/category/engineering', github: 'discord' },
  Atlassian: { eng: 'https://www.atlassian.com/engineering', github: 'atlassian' },
  Dropbox: { eng: 'https://dropbox.tech/', github: 'dropbox' },
  Slack: { eng: 'https://slack.engineering/', github: 'slackhq' },
  Twilio: { eng: 'https://www.twilio.com/blog/insights/engineering', github: 'twilio' },
  DoorDash: { eng: 'https://doordash.engineering/blog/', github: 'doordash' },
  Doordash: { eng: 'https://doordash.engineering/blog/', github: 'doordash' },
  Lyft: { eng: 'https://eng.lyft.com/', github: 'lyft' },
  Instacart: { eng: 'https://www.instacart.com/company/how-its-made/', github: 'instacart' },
  Snap: { eng: null, github: 'Snapchat' },
  Snapchat: { eng: null, github: 'Snapchat' },
  PayPal: { eng: 'https://medium.com/paypal-tech', github: 'paypal' },
  Palantir: { eng: 'https://blog.palantir.com/', github: 'palantir' },
  Cohere: { eng: 'https://cohere.com/blog', github: 'cohere-ai' },
};

const lookupSources = (company) => {
  if (!company) return null;
  const exact = COMPANY_SOURCES[company];
  if (exact) return exact;
  const normalized = String(company).trim().toLowerCase();
  for (const [name, sources] of Object.entries(COMPANY_SOURCES)) {
    if (name.toLowerCase() === normalized) return sources;
  }
  return null;
};

// ---------------------------------------------------------------------
// HTML → text (small dependency-free extractor; we don't need cheerio
// just to summarize a few KB of public blog HTML)
// ---------------------------------------------------------------------

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Camora/1.0 (+https://cariara.com)',
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.5',
        ...(opts.headers || {}),
      },
      ...opts,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEngBlog(url) {
  if (!url) return null;
  try {
    const r = await fetchWithTimeout(url);
    if (!r.ok) return null;
    const html = await r.text();
    const text = htmlToText(html);
    return text.slice(0, 12000); // cap per source so we don't blow the prompt
  } catch (err) {
    console.warn('[companyContext] eng-blog fetch failed', url, err.message);
    return null;
  }
}

async function fetchGithubOrg(org) {
  if (!org) return null;
  try {
    const r = await fetchWithTimeout(
      `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?sort=updated&per_page=12`,
      { headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} },
    );
    if (!r.ok) return null;
    const repos = await r.json();
    if (!Array.isArray(repos)) return null;
    const lines = repos
      .filter((r) => !r.fork && !r.archived)
      .slice(0, 10)
      .map((r) => {
        const lang = r.language ? ` [${r.language}]` : '';
        const stars = r.stargazers_count ? ` ★${r.stargazers_count}` : '';
        return `• ${r.name}${lang}${stars} — ${(r.description || '').slice(0, 200)}`;
      });
    return lines.join('\n').slice(0, 5000);
  } catch (err) {
    console.warn('[companyContext] github fetch failed', org, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------
// Summarization
// ---------------------------------------------------------------------

const SUMMARY_PROMPT = (company) => `You are prepping a candidate for an interview at ${company}. You have access to recent public material from their engineering blog and a snapshot of their public GitHub org. Compress this into a focused interview briefing.

Structure (markdown, ~400 words MAX):

**TECH STACK** — languages, frameworks, infra they emphasize. Specific names only.

**RECENT FOCUS** — 3-5 things they've shipped or written about lately. One bullet each, factual.

**HOW THEY THINK** — cultural cues from how they describe work (engineering values, customer obsession, scientific rigor, etc.). 2-3 bullets.

**SMART QUESTIONS** — 3-4 specific questions the candidate could ask the interviewer that show they've actually read the company's writing. Reference concrete projects/posts where possible.

Rules:
- Pull facts ONLY from the snippets below — do not invent metrics, employee names, or product details.
- No marketing fluff. No "${company} is a leading ...". Skip if the snippet doesn't say it.
- If a section has nothing real to say, write "(insufficient public data)" rather than padding.
`;

const client = new Anthropic();

async function summarize(company, engText, githubText) {
  if (!engText && !githubText) return null;

  const userBody = [
    engText ? `=== ENGINEERING BLOG SNIPPETS ===\n${engText}` : null,
    githubText ? `=== PUBLIC GITHUB REPOS ===\n${githubText}` : null,
  ].filter(Boolean).join('\n\n');

  try {
    const resp = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 800,
      system: SUMMARY_PROMPT(company),
      messages: [{ role: 'user', content: userBody }],
    });
    const text = resp.content?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    console.warn('[companyContext] summarize failed', company, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------

async function readCache(company) {
  try {
    const r = await query(
      'SELECT briefing, refreshed_at FROM lumora_company_context WHERE company = $1',
      [String(company).toLowerCase()],
    );
    if (r.rows.length === 0) return null;
    return r.rows[0];
  } catch (err) {
    console.warn('[companyContext] cache read failed', err.message);
    return null;
  }
}

async function writeCache(company, briefing, sources) {
  try {
    await query(
      `INSERT INTO lumora_company_context (company, briefing, sources_json, refreshed_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (company) DO UPDATE
         SET briefing = EXCLUDED.briefing,
             sources_json = EXCLUDED.sources_json,
             refreshed_at = NOW()`,
      [String(company).toLowerCase(), briefing, JSON.stringify(sources || {})],
    );
  } catch (err) {
    console.warn('[companyContext] cache write failed', err.message);
  }
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

const refreshLocks = new Map(); // in-flight refreshes — dedupe parallel calls

/**
 * Refresh the cached briefing for a company. Safe to fire-and-forget.
 * Concurrent calls for the same company collapse onto one request.
 */
export async function refreshCompanyContext(company) {
  if (!company) return null;
  const sources = lookupSources(company);
  if (!sources) return null;

  const key = String(company).toLowerCase();
  if (refreshLocks.has(key)) return refreshLocks.get(key);

  const work = (async () => {
    const start = Date.now();
    const engPromise = sources.eng ? fetchEngBlog(sources.eng) : Promise.resolve(null);
    const ghPromise = sources.github ? fetchGithubOrg(sources.github) : Promise.resolve(null);
    const budgetPromise = new Promise((resolve) => setTimeout(() => resolve(null), FETCH_BUDGET_MS));

    const [engText, githubText] = await Promise.all([
      Promise.race([engPromise, budgetPromise]),
      Promise.race([ghPromise, budgetPromise]),
    ]);

    if (!engText && !githubText) {
      console.warn('[companyContext] no sources reachable for', company, 'in', Date.now() - start, 'ms');
      return null;
    }
    const briefing = await summarize(company, engText, githubText);
    if (!briefing) return null;
    await writeCache(company, briefing, {
      eng: sources.eng || null,
      github: sources.github || null,
      ms: Date.now() - start,
    });
    return briefing;
  })().finally(() => {
    refreshLocks.delete(key);
  });

  refreshLocks.set(key, work);
  return work;
}

/**
 * Get a cached briefing if available. Triggers an async refresh when
 * the cached row is missing or older than CACHE_TTL_MS — the next
 * caller for the same company will get the fresh blob.
 *
 * Returns the briefing string or null. Never throws.
 */
export async function getCompanyContext(company) {
  if (!company) return null;
  if (!lookupSources(company)) return null;

  const cached = await readCache(company);
  const now = Date.now();
  const stale =
    !cached || !cached.refreshed_at ||
    now - new Date(cached.refreshed_at).getTime() > CACHE_TTL_MS;

  if (stale) {
    // Fire-and-forget; don't await on the read path.
    refreshCompanyContext(company).catch((err) =>
      console.warn('[companyContext] background refresh failed', err.message),
    );
  }
  return cached?.briefing || null;
}

/**
 * Lightweight company-name extractor for use on the inference path.
 * Reads the systemContext string the frontend builds in
 * lumora-assistant.ts, which always opens with:
 *   "The candidate is interviewing for: <role> at <company>."
 * Falls back to scanning for any allowlisted company name in the
 * whole context.
 */
export function detectCompanyFromContext(systemContext) {
  if (!systemContext) return null;
  const m = systemContext.match(/interviewing for:[^\n]*?\bat\s+([A-Z][^.\n]{1,60}?)\.?(?:\s|\n|$)/i);
  if (m) {
    const candidate = m[1].trim();
    if (lookupSources(candidate)) return candidate;
    // Sometimes the role/company line picks up trailing words; try first
    // token from the candidate string.
    const head = candidate.split(/\s+/)[0];
    if (lookupSources(head)) return head;
  }
  // Fallback: any allowlisted name appearing as a whole word
  for (const name of Object.keys(COMPANY_SOURCES)) {
    const re = new RegExp(`(^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`);
    if (re.test(systemContext)) return name;
  }
  return null;
}
