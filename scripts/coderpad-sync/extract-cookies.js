#!/usr/bin/env node
/**
 * Extracts CoderPad session cookies from the user's Chrome profile via CDP.
 * Saves to .coderpad-cookies.json for use by sync.js.
 * Usage: node extract-cookies.js
 */

import { execSync, spawnSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_OUT = join(__dirname, '.coderpad-cookies.json');
const CDP_PORT = 9225;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Kill any stale Chrome on our port
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`); } catch {}
  await sleep(500);

  // Create temp profile with just the Cookies file
  const tmp = join(tmpdir(), `cp-cdp-${Date.now()}`);
  mkdirSync(join(tmp, 'Default'), { recursive: true });
  try { copyFileSync(join(PROFILE, 'Cookies'), join(tmp, 'Default', 'Cookies')); } catch {}

  console.log('Launching headless Chrome...');
  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmp}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--disable-background-networking',
  ];

  // Spawn Chrome detached
  const { spawn } = await import('child_process');
  const chrome = spawn(CHROME, chromeArgs, { stdio: 'ignore', detached: true });
  chrome.unref();

  // Wait for CDP
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const r = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      if (r.ok) { ready = true; break; }
    } catch {}
  }
  if (!ready) throw new Error('Chrome CDP not ready');
  console.log('Chrome CDP ready.');

  const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  let orgId = null;

  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
    if (msg.method === 'Network.requestWillBeSent') {
      const req = msg.params?.request;
      if (req?.url?.includes('findQuestionBank') && req?.method === 'POST' && !orgId) {
        try {
          const body = JSON.parse(req.postData || '[]');
          if (Array.isArray(body) && typeof body[0] === 'number') orgId = body[0];
        } catch {}
      }
    }
  });

  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Open tab to CoderPad question bank
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });

  const sendS = (method, params) => new Promise(res => {
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  await sendS('Network.enable', {});
  console.log('Navigating to CoderPad question bank...');
  await sendS('Page.navigate', { url: 'https://screen.coderpad.io/work/dashboard/questionbank' });
  await sleep(8000);

  const { result: { cookies } } = await sendS('Network.getAllCookies', {});
  const relevant = (cookies || []).filter(c =>
    c.domain.includes('coderpad') || c.domain.includes('codingame')
  );

  ws.close();
  try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`); } catch {}
  try { execSync(`rm -rf "${tmp}"`); } catch {}

  if (!orgId) orgId = 13295514;

  const cookieStr = relevant.map(c => `${c.name}=${c.value}`).join('; ');
  const out = { cookieStr, orgId, extractedAt: new Date().toISOString() };
  writeFileSync(COOKIES_OUT, JSON.stringify(out, null, 2));
  console.log(`Saved ${relevant.length} cookies. orgId: ${orgId}`);
  console.log(`Output: ${COOKIES_OUT}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
