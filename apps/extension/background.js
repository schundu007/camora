// apps/extension/background.js
//
// Answers one question: "is a coding-problem page open right now, and at what URL?"
//
// A web page cannot read another window's address bar, which is why auto-fetch has
// only ever worked in the Electron shell (window.camo.getActiveBrowserUrl). This
// service worker is the browser-side equivalent of that bridge.
//
// Privacy is enforced by the manifest, not by this code: the extension requests NO
// `tabs` permission, only host permissions for the five supported problem sites. So
// chrome.tabs.query populates `url` for those tabs and leaves it undefined for every
// other tab — the extension cannot see the rest of your browsing even if it tried.
// The allowlist below is a second, independent check on top of that.

/**
 * Mirror of isProblemPageUrl in apps/camora/src/lib/problemPageUrl.ts and the
 * backend copy in lumora-backend/src/routes/coding.js. Keep the three in sync.
 */
function isProblemPageUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  let u;
  try { u = new URL(raw); } catch { return false; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname.replace(/\/+$/, '');

  if (/(^|\.)leetcode\.(com|cn)$/.test(host)) return /^\/problems\/[^/]+/.test(path);
  if (/(^|\.)hackerrank\.com$/.test(host)) return /\/challenges\/[^/]+/.test(path);
  if (/(^|\.)coderpad\.io$/.test(host)) {
    const seg = path.split('/').filter(Boolean);
    if (seg.length === 0) return false;
    const MARKETING = new Set(['pricing', 'resources', 'blog', 'login', 'signup', 'dashboard', 'questions', 'question-bank', 'company', 'about', 'careers', 'contact', 'product', 'solutions', 'customers', 'terms', 'privacy']);
    if (MARKETING.has(seg[0].toLowerCase())) return false;
    return seg[0].toLowerCase() === 'sandbox' || /^[a-z0-9]{5,}$/i.test(seg[0]);
  }
  if (/(^|\.)codesignal\.com$/.test(host)) return /^\/(interview|test|challenge|coding|assessment)\//.test(path);
  if (/(^|\.)glider\.ai$/.test(host)) return /^\/(test|assessment|oa|invite)\//.test(path);
  return false;
}

/**
 * The problem tab the user most likely means: the active tab of the most recently
 * focused window wins, then any other active tab, then any open problem tab at all.
 * Ordering matters when a candidate has several problems open across windows.
 */
async function findProblemUrl() {
  const candidates = await chrome.tabs.query({});
  const problems = candidates.filter(t => isProblemPageUrl(t.url));
  if (!problems.length) return null;

  let focusedWindowId = null;
  try {
    const win = await chrome.windows.getLastFocused();
    focusedWindowId = win?.id ?? null;
  } catch { /* no focused window (service worker woke cold) — fall through */ }

  const rank = t =>
    (t.active && t.windowId === focusedWindowId ? 0 : t.active ? 1 : 2);
  problems.sort((a, b) => rank(a) - rank(b) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));

  const best = problems[0];
  return { url: best.url, title: best.title ?? '' };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'CAMORA_GET_ACTIVE_URL') return false;
  findProblemUrl()
    .then(hit => sendResponse(hit ? { ok: true, url: hit.url, title: hit.title } : { ok: false, error: 'no problem tab open' }))
    .catch(err => sendResponse({ ok: false, error: String(err?.message ?? err) }));
  return true; // keep the channel open for the async reply
});
