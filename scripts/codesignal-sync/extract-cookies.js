#!/usr/bin/env node
/**
 * Extracts CodeSignal session cookies from Chrome via CDP.
 * Saves to .codesignal-cookies.json for use by probe-api.js and sync.js.
 *
 * Usage:
 *   node extract-cookies.js
 *
 * Chrome must have an active CodeSignal session (app.codesignal.com).
 * On first run it will navigate to the task library and sniff the org/company ID
 * from outgoing network requests.
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { dirname, fileURLToPath } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_OUT = join(__dirname, '.codesignal-cookies.json');
const CDP_PORT = 9227;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Try Profile 2 first (same as CoderPad), fall back to Default
const PROFILE = existsSync(join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2'))
  ? join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2')
  : join(process.env.HOME, 'Library/Application Support/Google/Chrome/Default');

const CODESIGNAL_URLS = [
  'https://app.codesignal.com/company-dashboard',
  'https://app.codesignal.com/arcade',
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Kill stale Chrome on our port
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  await sleep(500);

  // Temp profile with Cookies only
  const tmp = join(tmpdir(), `cs-cdp-${Date.now()}`);
  mkdirSync(join(tmp, 'Default'), { recursive: true });
  const cookiesSrc = join(PROFILE, 'Cookies');
  if (existsSync(cookiesSrc)) {
    try { copyFileSync(cookiesSrc, join(tmp, 'Default', 'Cookies')); } catch {}
  }

  console.log('Launching headless Chrome on CDP port', CDP_PORT, '...');
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

  // Wait for CDP
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      if (r.ok) { ready = true; break; }
    } catch {}
  }
  if (!ready) throw new Error('Chrome CDP not ready after 15s');
  console.log('Chrome CDP ready.');

  const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  let companyId = null;
  let userId = null;

  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }

    // Sniff company/user IDs from network requests
    if (msg.method === 'Network.requestWillBeSent') {
      const req = msg.params?.request;
      if (!req) return;

      // GraphQL body — look for company or user context
      if (req.postData && req.url?.includes('codesignal')) {
        try {
          const body = JSON.parse(req.postData);
          const vars = body?.variables || {};
          if (vars.companyId && !companyId) { companyId = vars.companyId; console.log('  Sniffed companyId:', companyId); }
          if (vars.userId && !userId) { userId = vars.userId; console.log('  Sniffed userId:', userId); }
        } catch {}
      }

      // REST URL patterns like /api/company/123/tasks
      if (req.url?.match(/\/company\/([a-zA-Z0-9_-]+)\//)) {
        const m = req.url.match(/\/company\/([a-zA-Z0-9_-]+)\//);
        if (m && !companyId) { companyId = m[1]; console.log('  Sniffed companyId from URL:', companyId); }
      }
    }
  });

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Create tab
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  const sendS = (method, params) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  await sendS('Network.enable', {});

  // Navigate to company dashboard (sniffs companyId) then arcade
  console.log('Navigating to CodeSignal company dashboard...');
  await sendS('Page.navigate', { url: CODESIGNAL_URLS[0] });
  await sleep(6000);

  if (!companyId) {
    console.log('  companyId not sniffed yet, trying arcade...');
    await sendS('Page.navigate', { url: CODESIGNAL_URLS[1] });
    await sleep(5000);
  }

  const { result: { cookies } } = await sendS('Network.getAllCookies', {});
  const relevant = (cookies || []).filter(c =>
    c.domain.includes('codesignal') || c.domain.includes('codescreen')
  );

  ws.close();
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  try { execSync(`rm -rf "${tmp}"`, { stdio: 'ignore' }); } catch {}

  if (relevant.length === 0) {
    console.error('No CodeSignal cookies found. Make sure you are logged in to app.codesignal.com in Chrome Profile 2 (or Default).');
    process.exit(1);
  }

  const cookieStr = relevant.map(c => `${c.name}=${c.value}`).join('; ');

  // Try to extract user token from cookies
  const sessionCookie = relevant.find(c => c.name === 'session' || c.name === 'auth_token' || c.name === '_session_id');

  const out = {
    cookieStr,
    companyId: companyId || null,
    userId: userId || null,
    cookieCount: relevant.length,
    extractedAt: new Date().toISOString(),
  };
  writeFileSync(COOKIES_OUT, JSON.stringify(out, null, 2));
  console.log(`\nSaved ${relevant.length} CodeSignal cookies.`);
  if (companyId) console.log(`companyId: ${companyId}`);
  if (userId) console.log(`userId: ${userId}`);
  console.log(`Output: ${COOKIES_OUT}`);
  console.log('\nNext step: node probe-api.js');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
