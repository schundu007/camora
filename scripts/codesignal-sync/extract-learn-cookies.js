#!/usr/bin/env node
/**
 * Extracts codesignal.com (Learn platform) session cookies from Chrome via CDP.
 * Saves to .codesignal-learn-cookies.json for use by sync-learn.js.
 *
 * Usage: node extract-learn-cookies.js
 * Chrome must be logged in to codesignal.com (Profile 2).
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '.codesignal-learn-cookies.json');
const CDP_PORT = 9230;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_DIR = join(process.env.HOME, 'Library/Application Support/Google/Chrome');
const PROFILE = existsSync(join(CHROME_DIR, 'Profile 2'))
  ? join(CHROME_DIR, 'Profile 2')
  : join(CHROME_DIR, 'Default');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  await sleep(800);

  const tmp = join(tmpdir(), `csl-${Date.now()}`);
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
  const sessionReqIds = [];

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
      if (msg.method === 'Network.responseReceived') {
        const { requestId, response } = msg.params;
        if (response?.url?.includes('/api/auth/session') && response.status === 200) {
          sessionReqIds.push(requestId);
        }
      }
    } catch {}
  });

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Network.enable', {});

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  // Session-level send — required for getResponseBody and getAllCookies
  const sendS = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  await sendS('Network.enable', {});
  await sendS('Page.enable', {});

  // Browse page triggers a background /api/auth/session fetch with cookies
  console.log('Loading codesignal.com...');
  await sendS('Page.navigate', { url: 'https://codesignal.com/learn/course-paths/browse' });

  // Poll until /api/auth/session is intercepted (max 15s)
  let sessionData = null;
  for (let i = 0; i < 30 && !sessionData?.user?.email; i++) {
    await sleep(500);
    for (const reqId of sessionReqIds) {
      try {
        const { result } = await sendS('Network.getResponseBody', { requestId: reqId });
        if (result?.body) {
          const parsed = JSON.parse(result.body);
          if (parsed?.user?.email) { sessionData = parsed; break; }
        }
      } catch {}
    }
  }

  if (!sessionData?.user?.email) {
    console.error('\nNot logged in to codesignal.com. Please:');
    console.error('  1. Open Chrome (Profile 2)');
    console.error('  2. Go to codesignal.com and log in');
    console.error('  3. Re-run this script');
    ws.close();
    try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
    try { execSync(`rm -rf "${tmp}"`, { stdio: 'ignore' }); } catch {}
    process.exit(1);
  }
  console.log(`Logged in as: ${sessionData.user.email}`);

  // Get all cookies at session level (browser-level getAllCookies isn't supported)
  const { result: { cookies } } = await sendS('Network.getAllCookies', {});
  const relevant = (cookies || []).filter(c =>
    c.domain.includes('codesignal.com') || c.domain.includes('identity.codesignal')
  );

  // Write file first, then clean up
  const cookieStr = relevant.map(c => `${c.name}=${c.value}`).join('; ');
  writeFileSync(OUT, JSON.stringify({ cookieStr, userId: sessionData.user.id, email: sessionData.user.email, extractedAt: new Date().toISOString() }, null, 2));
  console.log(`\nSaved ${relevant.length} cookies for ${sessionData.user.email}`);
  console.log(`Output: ${OUT}`);

  ws.close();
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' }); } catch {}
  try { execSync(`rm -rf "${tmp}"`, { stdio: 'ignore' }); } catch {}

  console.log('\nNext: node sync-learn.js --dry-run --paths 2');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
