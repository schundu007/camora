#!/usr/bin/env node
/**
 * Debug scraper — loads the library page and logs every /x/api/ response
 * so we can find which endpoint returns full question HTML + options.
 * Run, click a problem in the browser, check the log.
 */

import { createRequire } from 'module';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/chundu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = resolve(__dirname, '.hr_session');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: existsSync(SESSION_PATH) ? SESSION_PATH : undefined,
  });
  const page = await context.newPage();

  // Log every API response
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/x/api/') && !url.includes('/api/v')) return;
    if (response.status() < 200 || response.status() >= 300) return;

    try {
      const text = await response.text();
      if (!text || (!text.startsWith('{') && !text.startsWith('['))) return;
      const json = JSON.parse(text);

      // Check if this response has question bodies
      const allVals = JSON.stringify(json);
      const hasQuestion = allVals.includes('"question"') && allVals.includes('<');
      const hasOptions = allVals.includes('"options"');
      const hasUniqueId = allVals.includes('"unique_id"');

      const shortUrl = url.replace('https://www.hackerrank.com', '');
      if (hasQuestion || hasOptions || hasUniqueId) {
        console.log(`\n★ INTERESTING: ${shortUrl}`);
        // Find what question IDs are in the response
        const ids = (allVals.match(/"id"\s*:\s*(\d{5,})/g) || []).slice(0, 5).map(s => s.match(/\d+/)[0]);
        console.log(`  ids: ${ids.join(', ')} | hasQuestion: ${hasQuestion} | hasOptions: ${hasOptions}`);
        // Show the first question's structure
        const arr = json.questions || json.data?.questions || json.results || (Array.isArray(json) ? json : null);
        if (arr && arr[0]) {
          console.log(`  First item keys: ${Object.keys(arr[0]).join(', ')}`);
          if (arr[0].question) console.log(`  question (100 chars): ${arr[0].question.replace(/<[^>]+>/g,'').slice(0,100)}`);
          if (arr[0].options) console.log(`  options: ${JSON.stringify(arr[0].options).slice(0,150)}`);
        }
      } else {
        console.log(`  ${shortUrl.slice(0,80)} [status: ${response.status()}, size: ${text.length}]`);
      }
    } catch (_) {}
  });

  await page.goto(
    'https://www.hackerrank.com/work/library/tests?copyscrape=true&hide_ai_solvable=true',
    { waitUntil: 'domcontentloaded', timeout: 30000 }
  ).catch(() => {});

  console.log('\nPage loaded. Now:');
  console.log('  1. Click on any problem row to open the preview panel');
  console.log('  2. Watch this terminal for the ★ INTERESTING lines');
  console.log('  3. Note the API URL that returns question HTML + options');
  console.log('\nPress Ctrl-C when done.\n');

  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
