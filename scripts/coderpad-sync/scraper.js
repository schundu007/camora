import { chromium } from 'playwright';

// ── Verified API (2026-05-21 via DevTools) ───────────────────────────────────
// POST https://screen.coderpad.io/work/services/QuestionBank/findQuestionBank
// Body: [orgId, { limit: 100, offset: 0, availableOnly: false }]
// Response: { items: [...], totalFilteredCount: 4870, totalCount: 4870 }
// Item types: "CODE" | "MCQ" | "TEXT" | "SOLO" | "PROJECT" | "VIDEO"
// Language field: item.programmingLanguageId (e.g. "Python3", "C++", "Cross")
// Difficulty: item.points (20=easy, 40=medium, 150+=hard)
// Same question id appears once per supported programmingLanguageId
// ────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://screen.coderpad.io';
const FIND_QB_PATH = '/work/services/QuestionBank/findQuestionBank';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Opens a browser, logs in, navigates to the question bank, and captures:
 *   - session cookies (for subsequent direct fetch calls)
 *   - orgId (first element of the findQuestionBank POST body)
 *
 * Browser closes immediately after capture.
 */
export async function loginAndGetContext(email, password) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let orgId = null;

  // Intercept the first findQuestionBank POST to extract the orgId
  page.on('request', (req) => {
    if (req.url().includes('findQuestionBank') && req.method() === 'POST' && !orgId) {
      try {
        const body = JSON.parse(req.postData() || '[]');
        if (Array.isArray(body) && typeof body[0] === 'number') {
          orgId = body[0];
        }
      } catch { /* ignore parse errors */ }
    }
  });

  try {
    await page.goto(`${BASE_URL}/users/sign_in`, { waitUntil: 'domcontentloaded' });

    const emailSel = 'input[type="email"], input[name="email"], input[name="user[email]"]';
    const passSel = 'input[type="password"], input[name="password"], input[name="user[password]"]';
    const submitSel = 'button[type="submit"], input[type="submit"]';

    await page.fill(emailSel, email);
    await page.fill(passSel, password);
    await page.click(submitSel);

    await page.waitForURL(/dashboard/, { timeout: 25000 }).catch(() => {
      throw new Error('Login timed out — check credentials or if CoderPad requires CAPTCHA');
    });

    // Navigate to the question bank so it fires findQuestionBank and we get orgId
    await page.goto(`${BASE_URL}/work/dashboard/questionbank`, { waitUntil: 'networkidle' });

    const cookies = await context.cookies();
    if (!cookies.length) throw new Error('No cookies captured after login');
    if (!orgId) throw new Error('Could not capture orgId — findQuestionBank request not intercepted');

    console.log(`  orgId captured: ${orgId}`);
    return {
      cookieStr: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      orgId,
    };
  } finally {
    await browser.close();
  }
}

async function fetchPage(cookieStr, orgId, limit, offset) {
  const body = JSON.stringify([orgId, { limit, offset, availableOnly: false }]);
  const res = await fetch(`${BASE_URL}${FIND_QB_PATH}`, {
    method: 'POST',
    headers: {
      Cookie: cookieStr,
      'Content-Type': 'application/json;charset=UTF-8',
      Accept: '*/*',
      Origin: BASE_URL,
      Referer: `${BASE_URL}/work/dashboard/questionbank`,
    },
    body,
  });

  if (res.status === 429) {
    const err = new Error('Rate limited');
    err.retryable = true;
    throw err;
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Auth error (${res.status}) — session expired, re-run to log in again`);
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Fetches every question (all types) from CoderPad via offset-based pagination.
 * Caller filters by item.type client-side.
 *
 * @param {string} cookieStr   - session cookie string from loginAndGetContext()
 * @param {number} orgId       - org ID from loginAndGetContext()
 * @param {Function} onProgress - called with (fetched, total) after each page
 * @returns {{ items: object[], total: number, countByType: object }}
 */
export async function fetchAllQuestions(cookieStr, orgId, onProgress) {
  const LIMIT = 100;
  const DELAY_MS = 200;
  const all = [];
  let offset = 0;
  let total = null;
  let countByType = {};

  while (true) {
    let data;
    try {
      data = await fetchPage(cookieStr, orgId, LIMIT, offset);
    } catch (err) {
      if (err.retryable) {
        console.warn('\n  Rate limited — waiting 5 s...');
        await sleep(5000);
        continue;
      }
      throw err;
    }

    const items = data.items ?? [];
    if (!items.length) break;

    all.push(...items);
    total = data.totalFilteredCount ?? data.totalCount ?? all.length;
    if (data.countByType) countByType = data.countByType;

    if (onProgress) onProgress(all.length, total);
    if (all.length >= total) break;

    offset += LIMIT;
    await sleep(DELAY_MS);
  }

  return { items: all, total: total ?? all.length, countByType };
}
