#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scrapes full question data for HR library problems that currently lack question_body.
 * 
 * Usage:
 *   node scrape_missing.js --cookies "YOUR_COOKIE_STRING"
 * 
 * Get cookies from: browser DevTools → HackerRank library page → Network tab → 
 *   any /x/api/ request → Copy Request Headers → Cookie value
 * 
 * Output: writes question_body (and options for MCQ) directly into hr_library.json
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIBRARY_PATH = path.join(__dirname, '../../../ascend-backend/data/hr_library.json');

// HackerRank question detail API
const QA_API = (id) => `https://www.hackerrank.com/x/api/v3/questions/${id}?include_question_details=true`;

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

function buildQuestionBody(qData) {
  const questionText = htmlToText(qData.question || qData.body || '');
  if (!questionText || questionText.length < 20) return null;

  const isChoice = qData.type === 'mcq' || qData.type === 'multiple_mcq';
  const options = qData.options || qData.choices;
  if (isChoice && Array.isArray(options) && options.length > 0) {
    const optTexts = options.map(o => (typeof o === 'string' ? o : (o.body || o.text || JSON.stringify(o))));
    const label = qData.type === 'multiple_mcq'
      ? '\nOptions (choose all that apply):'
      : '\nOptions:';
    const optLines = optTexts.map((opt, i) => `${OPTION_LETTERS[i]}) ${opt}`).join('\n');
    return questionText + '\n' + label + '\n' + optLines;
  }
  return questionText;
}

async function main() {
  const cookieArg = process.argv.find(a => a.startsWith('--cookies=')) || process.argv[process.argv.indexOf('--cookies') + 1];
  if (!cookieArg) {
    console.error('ERROR: Pass cookies with --cookies "YOUR_COOKIE_STRING"');
    console.error('Get from: HackerRank library page → DevTools Network tab → any /x/api/ request → Cookie header value');
    process.exit(1);
  }
  const cookieString = cookieArg.replace(/^--cookies=/, '');

  const lib = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8'));
  const missing = lib.problems.filter(p => !p.question_body);
  console.log(`Problems missing question_body: ${missing.length}`);
  console.log(`Problems already have question_body: ${lib.problems.filter(p=>p.question_body).length}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Set cookies
  const cookies = cookieString.split(';').map(c => {
    const [name, ...rest] = c.trim().split('=');
    return { name: name.trim(), value: rest.join('=').trim(), domain: '.hackerrank.com', path: '/' };
  }).filter(c => c.name && c.value);
  await context.addCookies(cookies);

  const page = await context.newPage();
  let updated = 0;
  let failed = 0;
  const BATCH = 50; // Save progress every 50 problems

  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    try {
      const resp = await page.evaluate(async ([url]) => {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) return { error: r.status };
        return r.json();
      }, [QA_API(p.id)]);

      if (resp.error) {
        if (resp.error === 401 || resp.error === 403) {
          console.error('Auth expired at problem', i, '— save progress and re-run with fresh cookies');
          break;
        }
        failed++;
        continue;
      }

      // API response structure varies — try common shapes
      const qData = resp.question || resp.data || resp;
      const body = buildQuestionBody(qData);
      if (body && body.length > 20) {
        // Find problem in library and update
        const libP = lib.problems.find(lp => lp.id === p.id);
        if (libP) {
          libP.question_body = body;
          if (qData.unique_id) libP.unique_id = qData.unique_id;
          updated++;
        }
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }

    if ((i + 1) % BATCH === 0 || i === missing.length - 1) {
      fs.writeFileSync(LIBRARY_PATH, JSON.stringify(lib, null, 0));
      console.log(`Progress: ${i+1}/${missing.length} fetched | ${updated} updated | ${failed} failed`);
    }

    // Polite delay
    await new Promise(r => setTimeout(r, 150));
  }

  await browser.close();
  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);
