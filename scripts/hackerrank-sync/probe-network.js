#!/usr/bin/env node
/**
 * CDP probe: navigates to HackerRank Work library page and intercepts ALL
 * network responses to discover the XHR APIs the SPA actually calls.
 *
 * Usage: node probe-network.js
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir, homedir } from 'os';
import { mkdirSync, copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { cookieStr } = JSON.parse(readFileSync(join(__dirname, '.hackerrank-cookies.json'), 'utf8'));

const CDP_PORT = 9227; // use 9227 to avoid conflict with existing scripts
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = join(homedir(), 'Library/Application Support/Google/Chrome/Profile 2');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Kill any prior instance on this port
  try { execSync(`pkill -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true`); } catch {}
  await sleep(800);

  // Copy Chrome profile to a temp dir so we have the real cookies
  const tmp = join(tmpdir(), `hr-cdp-net-${Date.now()}`);
  mkdirSync(join(tmp, 'Default'), { recursive: true });
  try { copyFileSync(join(PROFILE, 'Cookies'), join(tmp, 'Default', 'Cookies')); } catch (e) {
    console.warn('Could not copy Cookies file:', e.message, '— proceeding without it');
  }

  console.log('Launching Chrome on port', CDP_PORT, '(non-headless so the SPA JS runs fully) ...');
  execSync(
    `"${CHROME}" --remote-debugging-port=${CDP_PORT} --user-data-dir="${tmp}" ` +
    `--disable-gpu --no-sandbox --disable-extensions ` +
    `--window-size=1400,900 ` +
    `--disable-background-networking=false ` +
    `about:blank > /dev/null 2>&1 &`
  );

  // Wait for CDP to be ready
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const r = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      if (r.ok) { ready = true; break; }
    } catch {}
  }
  if (!ready) throw new Error('Chrome CDP not ready after 20s');
  console.log('Chrome CDP ready.\n');

  const { default: WebSocket } = await import('ws');

  // Get the list of page targets
  async function getPageTarget() {
    const targets = await (await fetch(`http://localhost:${CDP_PORT}/json/list`)).json();
    return targets.find(t => t.type === 'page');
  }

  let pageTarget = await getPageTarget();
  if (!pageTarget) {
    // No page target exists — Chrome requires PUT for /json/new in newer versions
    await fetch(`http://localhost:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
    await sleep(1000);
    pageTarget = await getPageTarget();
  }
  if (!pageTarget) throw new Error('Could not get a page target from CDP');
  console.log('Using target:', pageTarget.id, pageTarget.url);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  const events = {};
  const responseLog = []; // { requestId, url, status, mimeType }
  const bodies = {};      // requestId -> parsed JSON (or null)

  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    // Resolve pending calls
    if (msg.id && pending[msg.id]) {
      pending[msg.id](msg);
      delete pending[msg.id];
      return;
    }
    // Dispatch events
    if (msg.method && events[msg.method]) {
      for (const fn of events[msg.method]) fn(msg.params);
    }
  });

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params = {}) => new Promise((res, rej) => {
    if (ws.readyState !== 1) return rej(new Error(`WS closed for ${method}`));
    const id = msgId++;
    pending[id] = msg => msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const on = (event, fn) => {
    if (!events[event]) events[event] = [];
    events[event].push(fn);
  };

  // Enable Network domain
  await send('Network.enable');

  // Set cookies from our saved session
  // Parse cookieStr into individual cookie objects for CDP
  const cookiePairs = cookieStr.split(';').map(c => c.trim()).filter(Boolean);
  for (const pair of cookiePairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    try {
      await send('Network.setCookie', {
        name, value,
        domain: '.hackerrank.com',
        path: '/',
        secure: true,
        httpOnly: false,
      });
    } catch {}
  }
  console.log('Cookies injected into CDP session.\n');

  // Listen for ALL hackerrank.com responses (filter later — some APIs return text/plain or text/html with JSON body)
  on('Network.responseReceived', (params) => {
    const { requestId, response } = params;
    const { url, status, mimeType } = response;
    if (!url.includes('hackerrank.com')) return;
    // Skip obvious non-data types
    if (mimeType.includes('image') || mimeType.includes('font') || mimeType.includes('css')) return;
    responseLog.push({ requestId, url, status, mimeType });
  });

  // Navigate to the library tests page
  console.log('Navigating to https://www.hackerrank.com/work/library/tests ...');
  await send('Page.enable');
  await send('Page.navigate', { url: 'https://www.hackerrank.com/work/library/tests' });

  // Wait for initial load (SPA boot + initial API calls)
  console.log('Waiting 20 seconds for SPA to make its initial API calls...');
  await sleep(20000);

  // Now fetch all response bodies we logged
  console.log(`\nCaptured ${responseLog.length} JSON/JS responses from hackerrank.com. Fetching bodies...\n`);

  for (const entry of responseLog) {
    try {
      const result = await send('Network.getResponseBody', { requestId: entry.requestId });
      let json = null;
      try { json = JSON.parse(result.body); } catch {}
      bodies[entry.requestId] = json;
      entry.bodyRaw = result.body.slice(0, 2000); // truncate for display
    } catch {
      bodies[entry.requestId] = null;
    }
  }

  // ---- Trigger additional API calls IN-PAGE (no navigation — that kills WS) ----
  // Use Runtime.evaluate to run fetch() inside the page context so the SPA's
  // auth cookies are already attached and we see the response via Network events.
  console.log('\nTriggering in-page fetch calls for global library question IDs...');

  const GLOBAL_QUESTION_IDS = ['1802015', '860700', '1091837', '1162127', '1584739'];

  // 1. Scroll to bottom to trigger any lazy-loaded pagination
  await send('Runtime.evaluate', { expression: `window.scrollTo(0, document.body.scrollHeight)` });
  await sleep(2000);

  // 2. Fire in-page fetches for per-question endpoints we want to probe
  const questionEndpoints = [
    id => `/x/api/v3/questions/${id}`,
    id => `/x/api/v3/library/questions/${id}`,
    id => `/work/api/v3/library/questions/${id}`,
  ];
  for (const id of GLOBAL_QUESTION_IDS) {
    for (const epFn of questionEndpoints) {
      const url = `https://www.hackerrank.com${epFn(id)}`;
      const expr = `fetch(${JSON.stringify(url)}, { credentials: 'include', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }).then(r => r.text()).catch(e => 'ERR:'+e.message)`;
      try { await send('Runtime.evaluate', { expression: expr, awaitPromise: true }); } catch {}
    }
  }

  // 3. In-page fetch for list endpoint with extra pages/offsets
  const listEndpoints = [
    '/x/api/v3/library/questions?limit=20&offset=0',
    '/x/api/v3/library/questions?limit=20&offset=20',
    '/work/api/v3/library/questions?limit=20&offset=0',
    '/x/api/v3/tests?limit=20&offset=0',
  ];
  for (const ep of listEndpoints) {
    const url = `https://www.hackerrank.com${ep}`;
    const expr = `fetch(${JSON.stringify(url)}, { credentials: 'include', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }).then(r => r.text()).catch(e => 'ERR:'+e.message)`;
    try { await send('Runtime.evaluate', { expression: expr, awaitPromise: true }); } catch {}
  }

  // Wait for the in-page fetch network events to arrive
  console.log('Waiting 8 more seconds for in-page fetch responses...');
  await sleep(8000);

  // Fetch bodies for any new entries added
  for (const entry of responseLog) {
    if (bodies[entry.requestId] !== undefined) continue;
    try {
      const result = await send('Network.getResponseBody', { requestId: entry.requestId });
      let json = null;
      try { json = JSON.parse(result.body); } catch {}
      bodies[entry.requestId] = json;
      entry.bodyRaw = result.body.slice(0, 2000);
    } catch {
      bodies[entry.requestId] = null;
    }
  }

  // ---- REPORT ----
  console.log('\n\n============================================================');
  console.log(' CDP NETWORK PROBE REPORT');
  console.log('============================================================\n');

  const jsonResponses = responseLog.filter(e => {
    const b = bodies[e.requestId];
    return b !== null && typeof b === 'object';
  });

  const nonJsonResponses = responseLog.filter(e => {
    return bodies[e.requestId] === null;
  });

  console.log(`Total JSON responses captured: ${jsonResponses.length}`);
  console.log(`Non-JSON / failed body fetch:  ${nonJsonResponses.length}\n`);

  // Print each JSON response
  for (const entry of jsonResponses) {
    const json = bodies[entry.requestId];
    const keys = json ? Object.keys(json) : [];
    console.log(`\n--- URL: ${entry.url.slice(0, 200)}`);
    console.log(`    Status: ${entry.status}  |  MIME: ${entry.mimeType}`);
    console.log(`    Top-level keys: ${keys.join(', ')}`);

    // Check for question data fields
    const bodyStr = JSON.stringify(json);
    const hasProblemStatement = bodyStr.includes('problem_statement');
    const hasBody = bodyStr.includes('"body"');
    const hasDescription = bodyStr.includes('"description"');
    const hasQuestions = bodyStr.includes('"questions"') || bodyStr.includes('"data"');
    const hasTotal = bodyStr.includes('"total"');

    if (hasProblemStatement) console.log(`    *** HAS problem_statement ***`);
    if (hasBody) console.log(`    *** HAS body ***`);
    if (hasDescription) console.log(`    *** HAS description ***`);
    if (hasQuestions) console.log(`    *** HAS questions/data ***`);
    if (hasTotal) console.log(`    *** HAS total ***`);

    // If it looks like a list endpoint, show count info
    if (keys.includes('data') && Array.isArray(json.data)) {
      console.log(`    data[] length: ${json.data.length}`);
      if (json.data[0]) console.log(`    data[0] keys: ${Object.keys(json.data[0]).join(', ')}`);
    }
    if (keys.includes('questions') && Array.isArray(json.questions)) {
      console.log(`    questions[] length: ${json.questions.length}`);
      if (json.questions[0]) {
        console.log(`    questions[0] keys: ${Object.keys(json.questions[0]).join(', ')}`);
        console.log(`    questions[0] id: ${json.questions[0].id}`);
        if (json.questions[0].problem_statement) {
          console.log(`    questions[0].problem_statement (100 chars): ${String(json.questions[0].problem_statement).slice(0, 100)}`);
        }
      }
    }
    if (keys.includes('total')) console.log(`    total: ${json.total}`);
    if (keys.includes('count')) console.log(`    count: ${json.count}`);

    // Show short preview of the raw body
    console.log(`    Preview (300 chars): ${(entry.bodyRaw || '').slice(0, 300)}`);
  }

  // Non-JSON list
  if (nonJsonResponses.length > 0) {
    console.log('\n\n--- Non-parseable / failed responses ---');
    for (const e of nonJsonResponses) {
      console.log(`  ${e.status}  ${e.url.slice(0, 150)}`);
    }
  }

  // Summary: look for problem_statement across ALL responses
  console.log('\n\n============================================================');
  console.log(' SUMMARY');
  console.log('============================================================');
  const withPS = jsonResponses.filter(e => JSON.stringify(bodies[e.requestId]).includes('problem_statement'));
  if (withPS.length > 0) {
    console.log('\nURLs containing "problem_statement":');
    withPS.forEach(e => console.log('  ', e.url));
  } else {
    console.log('\nNo response contained "problem_statement".');
  }

  const withBody = jsonResponses.filter(e => JSON.stringify(bodies[e.requestId]).includes('"body"'));
  if (withBody.length > 0) {
    console.log('\nURLs containing "body" field:');
    withBody.forEach(e => console.log('  ', e.url));
  }

  // Save full captures to a JSON file for inspection
  const outPath = join(__dirname, 'probe-network-results.json');
  const saveData = jsonResponses.map(e => ({
    url: e.url,
    status: e.status,
    keys: Object.keys(bodies[e.requestId] || {}),
    body: bodies[e.requestId],
  }));
  writeFileSync(outPath, JSON.stringify(saveData, null, 2));
  console.log(`\nFull results saved to: ${outPath}`);

  // Close Chrome
  try { execSync(`pkill -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true`); } catch {}

  console.log('\nDone.\n');
}

main().catch(e => {
  console.error('Fatal:', e.message, e.stack);
  try { execSync(`pkill -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true`); } catch {}
  process.exit(1);
});
