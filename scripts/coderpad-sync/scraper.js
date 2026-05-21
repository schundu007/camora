import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_FILE = join(__dirname, '.coderpad-cookies.json');

// ── Verified API (2026-05-21 via DevTools) ───────────────────────────────────
// POST https://screen.coderpad.io/work/services/QuestionBank/findQuestionBank
// Body: [orgId, { limit: 100, offset: 0, availableOnly: false }]
// Response: { items: [...], totalFilteredCount: 4870, countByType: {...} }
// ────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://screen.coderpad.io';
const FIND_QB_PATH = '/work/services/QuestionBank/findQuestionBank';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Reads session cookies from .coderpad-cookies.json (written by extract-cookies.js).
 * Throws if the file is missing — run extract-cookies.js first.
 */
export async function loginAndGetContext() {
  if (!existsSync(COOKIES_FILE)) {
    throw new Error(
      'Missing .coderpad-cookies.json — run: node extract-cookies.js'
    );
  }
  const { cookieStr, orgId } = JSON.parse(readFileSync(COOKIES_FILE, 'utf8'));
  if (!cookieStr) throw new Error('.coderpad-cookies.json has no cookieStr');
  console.log(`  Loaded session cookies. orgId: ${orgId}`);
  return { cookieStr, orgId: orgId ?? 13295514 };
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
    throw new Error(
      `Auth error (${res.status}) — re-run: node extract-cookies.js`
    );
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Fetches every question (all types) via offset-based pagination.
 * @returns {{ items: object[], total: number, countByType: object }}
 */
export async function fetchAllQuestions(cookieStr, orgId, onProgress) {
  const LIMIT = 50;
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
