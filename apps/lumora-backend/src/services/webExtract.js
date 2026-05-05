/**
 * Fetch a URL and extract clean main-content text + a list of same-domain
 * article URLs. No external dependencies — native fetch + regex HTML
 * stripping. Good enough for v1 web watchlist crawling; if quality
 * proves insufficient, swap in cheerio + a readability-style extractor.
 */

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TEXT_CHARS = 200_000;
const MAX_ARTICLE_URLS = 20;

// Tags whose contents we want to strip entirely (script/style/nav/etc.).
const REMOVE_TAGS = ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside'];

function stripTagsContent(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
  return html.replace(re, ' ');
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&copy;/g, '©');
}

function extractText(html) {
  let h = html;
  for (const tag of REMOVE_TAGS) h = stripTagsContent(h, tag);
  // Strip remaining tags
  h = h.replace(/<[^>]+>/g, ' ');
  h = decodeEntities(h);
  // Collapse whitespace
  h = h.replace(/[ \t]+/g, ' ');
  h = h.replace(/\s*\n\s*/g, '\n');
  h = h.replace(/\n{2,}/g, '\n\n');
  return h.trim().slice(0, MAX_TEXT_CHARS);
}

function extractArticleUrls(html, baseUrl) {
  const base = new URL(baseUrl);
  const seen = new Set();
  const out = [];
  const HREF_RE = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
  let m;
  while ((m = HREF_RE.exec(html)) !== null) {
    let href = m[1];
    try {
      const u = new URL(href, base);
      if (u.hostname !== base.hostname) continue;
      const norm = u.origin + u.pathname;
      if (seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
      if (out.length >= MAX_ARTICLE_URLS) break;
    } catch {
      // ignore malformed hrefs
    }
  }
  return out;
}

/**
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=5000]
 * @returns {Promise<{text: string, articleUrls: string[], fetchedAt: number}>}
 */
export async function fetchAndExtract(url, opts = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Camora-Lumora-RAG/1.0 (+https://camora.cariara.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!r.ok) {
      throw new Error(`fetch ${url} returned ${r.status}`);
    }
    const html = await r.text();
    const text = extractText(html);
    const articleUrls = extractArticleUrls(html, url);
    return { text, articleUrls, fetchedAt: Date.now() };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`fetch ${url} timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
