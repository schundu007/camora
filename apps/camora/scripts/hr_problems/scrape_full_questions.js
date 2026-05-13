#!/usr/bin/env node
/**
 * Fetches full question bodies (+ MCQ options) for all HR library problems
 * that currently lack question_body, using HackerRank's internal question API.
 *
 * Usage:
 *   node scrape_full_questions.js [--headless]
 *
 * Default: headed browser opens — log in if needed, then the script takes over.
 * Pass --headless only if you know your HR session cookies are still valid.
 *
 * URLs targeted:
 *   https://www.hackerrank.com/work/library/tests
 *   https://www.hackerrank.com/work/library/interviews
 *
 * Progress is saved every 50 questions so you can safely Ctrl-C and resume.
 */

const { chromium } = require('/Users/chundu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const LIBRARY_PATH = path.resolve(__dirname, '../../../ascend-backend/data/hr_library.json');
const HEADLESS = process.argv.includes('--headless');
const DELAY_MS = 120; // polite delay between API calls

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOP';

function htmlToText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => '\n' + c.replace(/<[^>]+>/g, '') + '\n')
    .replace(/<p[^>]*class="section-title"[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => '\n' + c.replace(/<[^>]+>/g,'') + '\n')
    .replace(/<\/p>/gi, '\n').replace(/<p[^>]*>\s*/gi, '')
    .replace(/<li[^>]*>/gi, '• ').replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>/gi, '').replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '').replace(/<ol[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n').replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/&le;/g, '≤').replace(/&ge;/g, '≥')
    .replace(/&#x2019;/g, "'").replace(/&#x2018;/g, "'")
    .replace(/&#x201C;/g, '"').replace(/&#x201D;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function buildBody(qData) {
  // Try multiple possible field names for the question body HTML
  const html = qData.question || qData.body || qData.description || qData.statement || '';
  const text = htmlToText(html);
  if (!text || text.length < 10) return null;

  const type = qData.type || qData.question_type || '';
  const isChoice = type === 'mcq' || type === 'multiple_mcq';
  const options = qData.options || qData.choices || [];
  if (isChoice && Array.isArray(options) && options.length > 0) {
    const optTexts = options.map(o => typeof o === 'string' ? o : (o.body || o.text || o.label || JSON.stringify(o)));
    const label = type === 'multiple_mcq' ? '\nOptions (choose all that apply):' : '\nOptions:';
    return text + '\n' + label + '\n' + optTexts.map((t, i) => `${OPTION_LETTERS[i]}) ${t}`).join('\n');
  }
  return text;
}

async function fetchQuestion(page, id) {
  // Try both API endpoints
  const urls = [
    `https://www.hackerrank.com/x/api/v3/questions/${id}`,
    `https://www.hackerrank.com/x/api/v3/library/questions/${id}`,
  ];
  for (const url of urls) {
    try {
      const result = await page.evaluate(async (u) => {
        const r = await fetch(u, { credentials: 'include', headers: { 'Accept': 'application/json' } });
        if (!r.ok) return { __status: r.status };
        return r.json();
      }, url);

      if (result.__status === 401 || result.__status === 403) return { auth: false };
      if (result.__status) continue; // try next URL

      // Unwrap common response shapes
      const qData = result.question || result.data || result;
      if (qData && (qData.question || qData.body || qData.description)) return { data: qData };
    } catch (_) {}
  }
  return { data: null };
}

async function main() {
  const lib = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8'));
  const missing = lib.problems.filter(p => !p.question_body);
  const total = lib.problems.length;
  const have = total - missing.length;

  console.log(`\nHR Library: ${total} total | ${have} have question_body | ${missing.length} missing\n`);
  if (missing.length === 0) { console.log('All problems already have question_body!'); return; }

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Open HackerRank — go to login page so user can sign in if needed
  console.log('Opening HackerRank…');
  await page.goto('https://www.hackerrank.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  // Wait until the user is on the library/work page (i.e. logged in and navigated there)
  console.log('\nWaiting for you to log in and navigate to:');
  console.log('  https://www.hackerrank.com/work/library/tests');
  console.log('\nThe script will continue automatically once you are on the library page.\n');

  await page.waitForURL('**/work/library/**', { timeout: 300000 }).catch(async () => {
    // Also accept if they're anywhere on hackerrank after login (dashboard, etc.)
    const url = page.url();
    if (!url.includes('hackerrank.com/work') && !url.includes('hackerrank.com/dashboard')) {
      console.error('Timed out waiting for login. Re-run the script.');
      await browser.close();
      process.exit(1);
    }
  });

  // Confirm auth works by hitting the API
  let testResp;
  for (let attempt = 0; attempt < 5; attempt++) {
    testResp = await page.evaluate(async () => {
      const r = await fetch('https://www.hackerrank.com/x/api/v3/questions?limit=1', { credentials: 'include' });
      return { status: r.status };
    });
    if (testResp.status !== 401 && testResp.status !== 403) break;
    await page.waitForTimeout(2000);
  }
  if (testResp.status === 401 || testResp.status === 403) {
    console.error('Auth check failed (HTTP', testResp.status, '). Make sure you are logged in to hackerrank.com/work and re-run.');
    await browser.close();
    process.exit(1);
  }
  console.log('Auth OK (HTTP', testResp.status, '). Starting fetch…\n');

  let updated = 0, failed = 0, authExpired = false;
  const SAVE_EVERY = 50;

  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    const result = await fetchQuestion(page, p.id);

    if (result.auth === false) {
      console.error(`\nAuth expired at ${i}/${missing.length}. Progress saved. Re-run to continue.\n`);
      authExpired = true;
      break;
    }

    if (result.data) {
      const body = buildBody(result.data);
      if (body && body.length > 10) {
        const libP = lib.problems.find(lp => lp.id === p.id);
        if (libP) {
          libP.question_body = body;
          if (result.data.unique_id) libP.unique_id = result.data.unique_id;
          updated++;
        }
      } else {
        failed++;
      }
    } else {
      failed++;
    }

    if ((i + 1) % SAVE_EVERY === 0 || i === missing.length - 1) {
      fs.writeFileSync(LIBRARY_PATH, JSON.stringify(lib, null, 0));
      const pct = Math.round(((have + updated) / total) * 100);
      process.stdout.write(`\r[${i+1}/${missing.length}] +${updated} fetched | ${failed} failed | ${pct}% of library covered  `);
    }

    await page.waitForTimeout(DELAY_MS);
  }

  await browser.close();

  const finalHave = lib.problems.filter(p => p.question_body).length;
  console.log(`\n\nFinal: ${finalHave}/${total} problems have question_body (${Math.round(finalHave/total*100)}%)`);
  console.log(`This run: +${updated} added, ${failed} failed${authExpired ? ' — auth expired, re-run to continue' : ''}`);

  if (!authExpired) {
    console.log('\nAll done! Run:');
    console.log('  git add apps/ascend-backend/data/hr_library.json && git push');
    console.log('to deploy the updated library.\n');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
