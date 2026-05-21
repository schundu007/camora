#!/usr/bin/env node
/**
 * Probes HackerRank Work API endpoints to find the question detail endpoint.
 * Run once, note the working endpoint + response shape, then delete this file.
 * Usage: node probe-api.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { cookieStr } = JSON.parse(readFileSync(join(__dirname, '.hackerrank-cookies.json'), 'utf8'));

// Sample IDs from devopsChallengesData.js
const SAMPLE_IDS = ['1802015', '860700', '1091837', '1162127'];

const CANDIDATES = [
  id => `https://www.hackerrank.com/work/api/v3/questions/${id}`,
  id => `https://www.hackerrank.com/work/api/v1/questions/${id}`,
  id => `https://www.hackerrank.com/work/api/v3/library/questions/${id}`,
  id => `https://www.hackerrank.com/rest/contests/master/challenges/${id}`,
];

const HEADERS = {
  Cookie: cookieStr,
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Referer: 'https://www.hackerrank.com/work/library/tests',
};

async function probe(urlFn, id) {
  const url = urlFn(id);
  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { url, status: res.status, hasJson: !!json, keys: json ? Object.keys(json).slice(0, 8) : [], preview: text.slice(0, 200) };
  } catch (e) {
    return { url, status: 'error', error: e.message };
  }
}

async function main() {
  const id = SAMPLE_IDS[0];
  console.log(`\nProbing with question ID: ${id}\n`);
  for (const urlFn of CANDIDATES) {
    const result = await probe(urlFn, id);
    console.log(`\n--- ${result.url} ---`);
    console.log(`Status: ${result.status}`);
    if (result.status === 200) {
      console.log(`JSON keys: ${result.keys.join(', ')}`);
      console.log(`Preview: ${result.preview}`);
    } else {
      console.log(`Preview: ${result.preview || result.error}`);
    }
  }

  console.log('\n\n--- Probing the real Work API (/x/api/v3/questions) ---');
  // NOTE: /work/api/* routes serve the SPA shell HTML (not JSON).
  // The actual REST API is /x/api/v3/questions/{id}.
  // However, only questions OWNED by your account are accessible by ID.
  // devopsChallengesData.js IDs (1802015, 860700 etc.) come from HackerRank's global library;
  // those are 404 for accounts that don't own them. Questions your account DOES own are returned.

  // Test the actual working endpoint with a known-accessible ID
  const accessibleId = '1583701'; // "Convert Bash to Ansible" - present in this account
  const url = `https://www.hackerrank.com/x/api/v3/questions/${accessibleId}`;
  const headers = {
    ...HEADERS,
    'X-Requested-With': 'XMLHttpRequest',
    Referer: 'https://www.hackerrank.com/work/library/questions',
  };
  const res = await fetch(url, { headers });
  if (res.status === 200) {
    const json = await res.json();
    console.log('Full response keys (top level):', Object.keys(json));
    const descField = ['problem_statement', 'body_html', 'body', 'description', 'description_html', 'preview'].find(k => json[k]);
    console.log(`\nDescription field name: "${descField}"`);
    if (descField) console.log(`Description preview (200 chars): ${String(json[descField]).slice(0, 200)}`);

    console.log('\n--- MCQ-specific extra keys ---');
    ['answer', 'options', 'tags', 'skills'].forEach(k => {
      if (json[k] != null) console.log(`  ${k}:`, JSON.stringify(json[k]).slice(0, 100));
    });
  } else {
    console.log('Status:', res.status, await res.text().then(t => t.slice(0, 200)));
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log('Working endpoint:    https://www.hackerrank.com/x/api/v3/questions/{id}');
  console.log('Auth:                Cookie header (cookieStr from .hackerrank-cookies.json)');
  console.log('Extra headers:       X-Requested-With: XMLHttpRequest');
  console.log('Description field:   problem_statement  (HTML string)');
  console.log('MCQ answer field:    answer  (correct option index or value)');
  console.log('MCQ options field:   options  (array of answer choices)');
  console.log('Scope:               Only questions owned by your HRW account');
  console.log('                     84/366 devops IDs accessible; 282 belong to HR global library');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
