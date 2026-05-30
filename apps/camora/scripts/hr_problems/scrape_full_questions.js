#!/usr/bin/env node
/**
 * Scrapes full question bodies for all HR library problems missing question_body.
 *
 * Discovery: /x/api/v1/library?copyscrape=true&filter=TYPE returns full
 * question HTML + options for each type. Paginates all type combinations.
 *
 * Usage:  node scrape_full_questions.js
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/chundu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH = resolve(__dirname, '../../../ascend-backend/data/hr_library.json');
const SESSION_PATH = resolve(__dirname, '.hr_session');
const OPTION_LETTERS = 'ABCDEFGHIJKLMNOP';

// All types that have missing question_body
const TYPES = ['mcq','multiple_mcq','code','fullstack','database','sudorank',
               'coderepo_task','code_review','prompt_engineering','whiteboard',
               'complete','approx','diagram','design','textAns'];
const DIFFICULTIES = ['Easy','Medium','Hard','']; // '' = no filter

function htmlToText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => '\n' + c.replace(/<[^>]+>/g, '') + '\n')
    .replace(/<p[^>]*class="section-title"[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => '\n' + c.replace(/<[^>]+>/g,'') + '\n')
    .replace(/<\/p>/gi, '\n').replace(/<p[^>]*>\s*/gi, '')
    .replace(/<li[^>]*>/gi, '• ').replace(/<\/li>/gi, '\n')
    .replace(/<\/ul>/gi, '').replace(/<\/ol>/gi, '')
    .replace(/<ul[^>]*>/gi, '').replace(/<ol[^>]*>/gi, '')
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
  const html = qData.question || qData.body || qData.description || '';
  const text = htmlToText(html);
  if (!text || text.length < 10) return null;
  const type = qData.type || '';
  const isChoice = type === 'mcq' || type === 'multiple_mcq';
  const options = qData.options || qData.choices || [];
  if (isChoice && Array.isArray(options) && options.length > 0) {
    const optTexts = options.map(o => typeof o === 'string' ? o : (o.body || o.text || o.label || JSON.stringify(o)));
    const label = type === 'multiple_mcq' ? '\nOptions (choose all that apply):' : '\nOptions:';
    return text + '\n' + label + '\n' + optTexts.map((t, i) => `${OPTION_LETTERS[i]}) ${t}`).join('\n');
  }
  return text;
}

async function fetchPage(page, type, difficulty, start, limit = 100) {
  const params = new URLSearchParams({
    limit: String(limit),
    library: 'hackerrank',
    copyscrape: 'true',
    hide_ai_solvable: 'true',
    start: String(start),
    show_only_available: 'false',
    expand: 'coderepo_parent',
    new_sort: '1',
    filter: type,
  });
  if (difficulty) params.set('difficulties', difficulty);

  const url = `https://www.hackerrank.com/x/api/v1/library?${params}`;
  return page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'include' });
    if (!r.ok) return { __status: r.status };
    return r.json();
  }, url);
}

async function main() {
  const lib = JSON.parse(readFileSync(LIBRARY_PATH, 'utf-8'));
  const missingIds = new Set(lib.problems.filter(p => !p.question_body).map(p => p.id));
  const total = lib.problems.length;
  const startHave = total - missingIds.size;

  console.log(`\nHR Library: ${total} total | ${startHave} have question_body | ${missingIds.size} missing\n`);
  if (missingIds.size === 0) { console.log('All done!'); return; }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: existsSync(SESSION_PATH) ? SESSION_PATH : undefined,
  });
  const page = await ctx.newPage();

  // Verify auth
  await page.goto('https://www.hackerrank.com/work/library/tests', {
    waitUntil: 'domcontentloaded', timeout: 20000
  }).catch(() => {});

  const isLoggedIn = await page.evaluate(() =>
    !window.location.href.includes('/login') && !window.location.href.includes('/access-account')
  );
  if (!isLoggedIn) {
    console.error('Not logged in. Run with headless:false first to save session.');
    await browser.close(); process.exit(1);
  }
  console.log('Auth OK. Starting pagination…\n');

  let totalCaptured = 0;
  let lastSave = Date.now();
  const LIMIT = 100;

  for (const type of TYPES) {
    const typeMissing = lib.problems.filter(p => !p.question_body && p.type === type).length;
    if (typeMissing === 0) continue;

    let typeCaptured = 0;

    for (const difficulty of DIFFICULTIES) {
      let start = 0;
      let pageEmpty = false;
      let pagesWithNoNewData = 0;

      while (!pageEmpty && pagesWithNoNewData < 3) {
        let data;
        try {
          data = await fetchPage(page, type, difficulty, start, LIMIT);
        } catch (e) {
          break;
        }

        if (data.__status === 401 || data.__status === 403) {
          console.error('\nAuth expired. Re-run.');
          await browser.close(); process.exit(1);
        }
        if (data.__status) { start += LIMIT; continue; }

        const qs = data?.model?.questions || data?.questions || [];
        if (qs.length === 0) { break; }

        // eslint-disable-next-line no-useless-assignment
        let pageCaptures = 0;
        for (const q of qs) {
          if (!q.id || !missingIds.has(q.id)) continue;
          if (!q.question && !q.options) continue;
          const body = buildBody(q);
          if (!body || body.length < 10) continue;
          const libP = lib.problems.find(p => p.id === q.id);
          if (libP && !libP.question_body) {
            libP.question_body = body;
            if (q.unique_id) libP.unique_id = q.unique_id;
            missingIds.delete(q.id);
            totalCaptured++;
            typeCaptured++;
            pageCaptures++;
          }
        }

        if (pageCaptures === 0) pagesWithNoNewData++;
        else pagesWithNoNewData = 0;

        // Save every 5 seconds
        if (Date.now() - lastSave > 5000) {
          writeFileSync(LIBRARY_PATH, JSON.stringify(lib, null, 0));
          lastSave = Date.now();
        }

        const coverage = Math.round(((total - missingIds.size) / total) * 100);
        process.stdout.write(`\r  [${type}/${difficulty||'all'}] start=${start} +${typeCaptured} | total: ${totalCaptured} | remaining: ${missingIds.size} | ${coverage}%  `);

        start += LIMIT;
        if (qs.length < LIMIT) { pageEmpty = true; }

        await page.waitForTimeout(60); // polite
      }
    }

    if (typeCaptured > 0) console.log(`\n  ✓ [${type}] captured: ${typeCaptured}`);
  }

  writeFileSync(LIBRARY_PATH, JSON.stringify(lib, null, 0));
  await ctx.storageState({ path: SESSION_PATH });
  await browser.close();

  const finalHave = lib.problems.filter(p => p.question_body).length;
  console.log(`\n\nFinal: ${finalHave}/${total} (${Math.round(finalHave/total*100)}%) have question_body`);
  console.log(`Added this run: +${totalCaptured}`);

  if (totalCaptured > 0) {
    console.log('\nDeploy: git add apps/ascend-backend/data/hr_library.json && git push');
  } else {
    console.log('\nNothing captured — the copyscrape API may not include full data for these question types.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
