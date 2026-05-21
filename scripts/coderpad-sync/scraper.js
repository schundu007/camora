import { chromium } from 'playwright';

// ── CoderPad API constants ───────────────────────────────────────────────────
// Verified via DevTools → Network on screen.coderpad.io/work/dashboard/questionbank
// If any constant is wrong, check the actual XHR calls and update here.
const BASE_URL = 'https://screen.coderpad.io';
const QUESTION_TYPE_CODE = 'code';
const QUESTION_TYPE_MCQ = 'multiple_choice'; // update if different in DevTools
const ITEMS_KEY = 'question_items';          // top-level array key in response
const TOTAL_PATH = 'meta.total_count';       // dot-path to total count field
// ────────────────────────────────────────────────────────────────────────────

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Opens a browser, logs into CoderPad, and returns the session cookie string.
 * The browser closes immediately after the cookies are captured.
 */
export async function getSessionCookies(email, password) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/users/sign_in`, { waitUntil: 'domcontentloaded' });

    const emailSel = 'input[type="email"], input[name="email"], input[name="user[email]"]';
    const passSel = 'input[type="password"], input[name="password"], input[name="user[password]"]';
    const submitSel = 'button[type="submit"], input[type="submit"]';

    await page.fill(emailSel, email);
    await page.fill(passSel, password);
    await page.click(submitSel);

    await page.waitForURL(/dashboard/, { timeout: 25000 }).catch(() => {
      throw new Error(
        'Login timed out — check credentials or try signing in manually first to rule out CAPTCHA'
      );
    });

    const cookies = await context.cookies();
    if (!cookies.length) throw new Error('Login appeared to succeed but no cookies were captured');
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  } finally {
    await browser.close();
  }
}

async function fetchPage(cookieStr, pageNum, perPage, questionType) {
  const params = new URLSearchParams({
    page: String(pageNum),
    per_page: String(perPage),
    question_type: questionType,
  });
  const url = `${BASE_URL}/api/v1/question_items?${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookieStr,
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (res.status === 429) {
    const err = new Error('Rate limited');
    err.retryable = true;
    throw err;
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Auth error (${res.status}) — session may have expired, re-run to log in again`);
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Fetches all questions of a given type by paginating the CoderPad API.
 * @param {string} cookieStr  - session cookie string from getSessionCookies()
 * @param {'code'|'mcq'} type - question type
 * @param {Function} onProgress - called with (fetched, total) on each page
 * @returns {{ items: object[], total: number }}
 */
export async function fetchAllQuestions(cookieStr, type = 'code', onProgress) {
  const questionType = type === 'mcq' ? QUESTION_TYPE_MCQ : QUESTION_TYPE_CODE;
  const PER_PAGE = 100;
  const DELAY_MS = 200;
  const all = [];
  let pageNum = 1;
  let total = null;

  while (true) {
    let data;
    try {
      data = await fetchPage(cookieStr, pageNum, PER_PAGE, questionType);
    } catch (err) {
      if (err.retryable) {
        console.warn('\n  Rate limited — waiting 5 s...');
        await sleep(5000);
        continue;
      }
      throw err;
    }

    // Support multiple possible response shapes from CoderPad
    const items =
      data[ITEMS_KEY] ??
      data.items ??
      data.data ??
      [];

    if (!items.length) break;
    all.push(...items);

    total =
      getNestedValue(data, TOTAL_PATH) ??
      data.total_count ??
      data.total ??
      all.length;

    if (onProgress) onProgress(all.length, total);
    if (all.length >= total) break;

    pageNum++;
    await sleep(DELAY_MS);
  }

  return { items: all, total: total ?? all.length };
}
