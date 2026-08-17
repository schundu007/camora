/**
 * True only when `raw` is a SINGLE coding-problem page — not a landing page, a
 * problem LIST, a dashboard, or an unknown page. Strict allowlist: anything not
 * explicitly recognized returns false, so auto-scrape never fires on junk.
 *
 * Mirror of the backend copy in apps/lumora-backend/src/routes/coding.js
 * (isProblemPageUrl). Keep the two in sync; both are covered by the same cases.
 */
export function isProblemPageUrl(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname.replace(/\/+$/, ''); // drop trailing slash(es)

  // LeetCode — /problems/<slug> (a slug must follow; the bare list is /problemset)
  if (/(^|\.)leetcode\.(com|cn)$/.test(host)) return /^\/problems\/[^/]+/.test(path);

  // HackerRank — /challenges/<slug> or /contests/<c>/challenges/<slug>
  if (/(^|\.)hackerrank\.com$/.test(host)) return /\/challenges\/[^/]+/.test(path);

  // CoderPad — a pad/sandbox room; exclude marketing segments
  if (/(^|\.)coderpad\.io$/.test(host)) {
    const seg = path.split('/').filter(Boolean);
    if (seg.length === 0) return false;
    const MARKETING = new Set(['pricing','resources','blog','login','signup','dashboard','questions','question-bank','company','about','careers','contact','product','solutions','customers','terms','privacy']);
    const first = seg[0].toLowerCase();
    if (MARKETING.has(first)) return false;
    return first === 'sandbox' || /^[a-z0-9]{5,}$/i.test(seg[0]);
  }

  // CodeSignal — interview / test / challenge / assessment session paths
  if (/(^|\.)codesignal\.com$/.test(host)) return /^\/(interview|test|challenge|coding|assessment)\//.test(path);

  // Glider — test / assessment / oa / invite session paths
  if (/(^|\.)glider\.ai$/.test(host)) return /^\/(test|assessment|oa|invite)\//.test(path);

  return false; // unknown host — strict allowlist
}

/**
 * True when the backend can actually FETCH the problem text from this URL.
 *
 * isProblemPageUrl recognises a problem page; this narrower test asks whether a
 * server-side fetch will return the problem rather than a login wall. Only two
 * platforms have real scrapers:
 *
 *   LeetCode /problems/   → GraphQL
 *   HackerRank /challenges/ (incl. /contests/<c>/challenges/) → public REST JSON
 *
 * CoderPad rooms, CodeSignal /interview/ and Glider /test/ are per-candidate
 * SESSION pages. They are legitimately problem pages, but they exist only inside
 * an authenticated session, so `fetch(url)` from the server gets a sign-in page.
 * Auto-fetching them fires a request that cannot succeed and reads as the feature
 * being broken — on desktop that was masked by screenshot capture, which the web
 * app does not have.
 *
 * Manual fetch stays available for every isProblemPageUrl() page: the user may be
 * signed in somewhere the server is not, and a failed manual attempt is a choice
 * they made rather than something that happened to them.
 */
export function isAutoFetchableUrl(raw: string): boolean {
  if (!isProblemPageUrl(raw)) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  return /(^|\.)leetcode\.(com|cn)$/.test(host) || /(^|\.)hackerrank\.com$/.test(host);
}
