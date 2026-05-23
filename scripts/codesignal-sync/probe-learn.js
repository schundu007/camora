#!/usr/bin/env node
/**
 * Loads codesignal.com/learn/course-paths/browse in headless Chrome via CDP,
 * intercepts all network requests, and prints the ones that return course data.
 *
 * Usage: node probe-learn.js
 * Output: prints working API URL + sample response shape for sync.js
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { dirname, fileURLToPath } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CDP_PORT = 9228;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = existsSync(join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2'))
  ? join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2')
  : join(process.env.HOME, 'Library/Application Support/Google/Chrome/Default');

const TARGET_URL = 'https://codesignal.com/learn/course-paths/browse';
const RESULTS_PATH = join(__dirname, 'probe-learn-results.json');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  await sleep(500);

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
  ], { stdio: 'ignore', detached: true });
  chrome.unref();

  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try { if ((await fetch(`http://localhost:${CDP_PORT}/json/version`)).ok) { ready = true; break; } } catch {}
  }
  if (!ready) throw new Error('Chrome not ready');
  console.log('Chrome ready. Loading page...');

  const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  const intercepted = []; // { url, method, responseBody }

  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
  });

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Create a page
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  const sendS = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  // Track request IDs that look interesting
  const requestBodies = {}; // requestId → url
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (!msg.params?.sessionId === sessionId) return;
    if (msg.method === 'Network.responseReceived') {
      const { requestId, response } = msg.params;
      const url = response?.url || '';
      const ct = response?.headers?.['content-type'] || '';
      if (
        response.status === 200 &&
        (ct.includes('json') || ct.includes('javascript')) &&
        (
          url.includes('/api/') ||
          url.includes('graphql') ||
          url.includes('course') ||
          url.includes('learn') ||
          url.includes('path')
        )
      ) {
        requestBodies[requestId] = url;
      }
    }
  });

  await sendS('Network.enable', {});
  await sendS('Page.enable', {});

  console.log(`Navigating to ${TARGET_URL} ...`);
  await sendS('Page.navigate', { url: TARGET_URL });

  // Wait for the page to fully load and render
  await sleep(10000);

  // Also scroll down to trigger lazy loading
  await sendS('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight)' });
  await sleep(3000);

  console.log(`\nIntercepted ${Object.keys(requestBodies).length} potentially useful requests.`);
  console.log('Fetching response bodies...\n');

  const results = [];
  for (const [requestId, url] of Object.entries(requestBodies)) {
    try {
      const { result } = await sendS('Network.getResponseBody', { requestId });
      if (!result?.body) continue;
      let parsed;
      try { parsed = JSON.parse(result.body); } catch { continue; }

      const bodyStr = JSON.stringify(parsed).slice(0, 600);
      const hasCourseData = bodyStr.toLowerCase().includes('course') || bodyStr.toLowerCase().includes('lesson') || bodyStr.toLowerCase().includes('task');

      results.push({ url, hasJson: true, hasCourseData, preview: bodyStr.slice(0, 300), keys: Object.keys(parsed).slice(0, 10) });

      const icon = hasCourseData ? '✓' : '·';
      console.log(`${icon} ${url}`);
      if (hasCourseData) {
        console.log(`  keys: ${Object.keys(parsed).slice(0, 8).join(', ')}`);
        console.log(`  preview: ${bodyStr.slice(0, 200)}`);
      }
    } catch {}
  }

  // Also dump what the page's __NEXT_DATA__ or RSC payload contains
  console.log('\n── Extracting inline page data ──');
  const { result: evalResult } = await sendS('Runtime.evaluate', {
    expression: `
      (function() {
        // Next.js RSC payload
        const scripts = [...document.querySelectorAll('script[type="application/json"]')];
        const rsc = scripts.map(s => s.textContent.slice(0, 500));
        // Any window.__NEXT_DATA__
        const nextData = window.__NEXT_DATA__ ? JSON.stringify(window.__NEXT_DATA__).slice(0, 1000) : null;
        // Page text content
        const h1s = [...document.querySelectorAll('h1, h2, h3')].map(el => el.textContent.trim()).slice(0, 20);
        return JSON.stringify({ rsc: rsc.slice(0, 5), nextData, headings: h1s });
      })()
    `,
    returnByValue: true,
  });

  if (evalResult?.value) {
    try {
      const page = JSON.parse(evalResult.value);
      console.log('Headings found on page:', page.headings);
      if (page.nextData) console.log('__NEXT_DATA__:', page.nextData.slice(0, 300));
      if (page.rsc?.length) console.log('RSC scripts:', page.rsc.slice(0, 2));
    } catch {}
  }

  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to probe-learn-results.json`);

  ws.close();
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  try { execSync(`rm -rf "${tmp}"`, { stdio: 'ignore' }); } catch {}
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
