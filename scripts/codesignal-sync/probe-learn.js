#!/usr/bin/env node
/**
 * Loads codesignal.com/learn/course-paths/browse in headless Chrome via CDP,
 * intercepts all network requests to find the course data API.
 *
 * Usage: node probe-learn.js
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CDP_PORT = 9228;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = existsSync(join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2'))
  ? join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2')
  : join(process.env.HOME, 'Library/Application Support/Google/Chrome/Default');

const RESULTS_PATH = join(__dirname, 'probe-learn-results.json');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  await sleep(800);

  const tmp = join(tmpdir(), `cs-learn-${Date.now()}`);
  mkdirSync(join(tmp, 'Default'), { recursive: true });
  const src = join(PROFILE, 'Cookies');
  if (existsSync(src)) { try { copyFileSync(src, join(tmp, 'Default', 'Cookies')); } catch {} }

  console.log('Launching Chrome...');
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmp}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--disable-background-networking',
  ], { stdio: 'ignore', detached: true });
  chrome.unref();

  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try { if ((await fetch(`http://localhost:${CDP_PORT}/json/version`)).ok) { ready = true; break; } } catch {}
  }
  if (!ready) throw new Error('Chrome not ready');
  console.log('Chrome ready.');

  const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  const requests = {}; // requestId → { url, method }
  const responses = []; // interesting responses

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  // Single flat listener — no sessionId filtering needed for browser-level events
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }

      if (msg.method === 'Network.requestWillBeSent') {
        const { requestId, request } = msg.params;
        requests[requestId] = { url: request.url, method: request.method, postData: request.postData, headers: request.headers };
      }

      if (msg.method === 'Network.responseReceived') {
        const { requestId, response } = msg.params;
        const req = requests[requestId];
        if (!req) return;
        const ct = (response.headers?.['content-type'] || response.headers?.['Content-Type'] || '');
        const url = response.url || req.url;

        // Only keep JSON/text responses from codesignal domains, skip static assets
        if (
          response.status === 200 &&
          (ct.includes('json') || ct.includes('text')) &&
          url.includes('codesignal') &&
          !url.includes('.js') && !url.includes('.css') && !url.includes('.woff') &&
          !url.includes('amplitude') && !url.includes('analytics')
        ) {
          responses.push({ requestId, url, method: req.method, postData: req.postData, ct });
        }
      }
    } catch {}
  });

  const send = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Enable network tracking at browser level FIRST
  await send('Network.enable', {});
  console.log('Network tracking enabled.');

  // Open page in a new target
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  const sendS = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  await sendS('Network.enable', {});
  await sendS('Page.enable', {});

  // ── Phase 1: course paths list ──────────────────────────────────
  console.log('Phase 1: course-paths/browse ...');
  await sendS('Page.navigate', { url: 'https://codesignal.com/learn/course-paths/browse' });
  await sleep(10000);
  await sendS('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight)' });
  await sleep(3000);

  // ── Phase 2: individual course path page ─────────────────────────
  console.log('Phase 2: individual path (python) ...');
  await sendS('Page.navigate', { url: 'https://codesignal.com/learn/course-paths/introduction-to-programming-with-python' });
  await sleep(10000);
  await sendS('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight)' });
  await sleep(3000);

  // ── Phase 3: individual course page ──────────────────────────────
  // Navigate into the first course of the Python path
  console.log('Phase 3: clicking first course ...');
  await sendS('Runtime.evaluate', { expression: `
    const links = [...document.querySelectorAll('a[href*="/learn/courses/"]')];
    if (links[0]) { window.__firstCourseHref = links[0].href; links[0].click(); }
    JSON.stringify(links.slice(0,5).map(l => l.href))
  `, returnByValue: true });
  await sleep(10000);

  console.log(`\nCaptured ${responses.length} JSON/text responses from codesignal.com`);

  const results = [];
  for (const { requestId, url, method, postData, ct } of responses) {
    try {
      const { result } = await sendS('Network.getResponseBody', { requestId });
      const body = result?.body;
      if (!body || body.length < 10) continue;

      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = null; }

      const bodyStr = body.slice(0, 800);
      const hasCourseData = /course|lesson|task|path|module/i.test(bodyStr);

      const req = responses.find(r => r.requestId === requestId) || {};
      const reqHeaders = requests[requestId]?.headers || {};
      const nextAction = reqHeaders['Next-Action'] || reqHeaders['next-action'] || null;

      const entry = { url, method, hasCourseData, preview: bodyStr.slice(0, 600), keys: parsed ? Object.keys(parsed).slice(0, 12) : [], nextAction, postData };
      results.push(entry);

      const icon = hasCourseData ? '✓' : '·';
      console.log(`${icon} [${method}] ${url}`);
      if (hasCourseData) {
        if (nextAction) console.log(`  Next-Action: ${nextAction}`);
        if (postData) console.log(`  body sent: ${postData.slice(0, 200)}`);
        console.log(`  preview: ${bodyStr.slice(0, 400)}`);
      }
    } catch (e) {
      console.log(`  (could not get body: ${e.message})`);
    }
  }

  // Also extract page headings to confirm content loaded
  const { result: evalResult } = await sendS('Runtime.evaluate', {
    expression: `JSON.stringify([...document.querySelectorAll('h1,h2,h3,[class*="title"],[class*="path"]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,30))`,
    returnByValue: true,
  });
  try {
    const headings = JSON.parse(evalResult?.value || '[]');
    console.log('\nPage headings/titles found:', headings.slice(0, 20));
  } catch {}

  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  console.log(`\nFull results → probe-learn-results.json`);

  ws.close();
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  try { execSync(`rm -rf "${tmp}"`, { stdio: 'ignore' }); } catch {}
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
