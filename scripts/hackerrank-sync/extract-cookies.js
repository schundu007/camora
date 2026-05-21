#!/usr/bin/env node
/**
 * Extracts HackerRank Work session cookies from Chrome via CDP.
 * Saves to .hackerrank-cookies.json for use by sync.js.
 * Usage: node extract-cookies.js
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIES_OUT = join(__dirname, '.hackerrank-cookies.json');
const CDP_PORT = 9226;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = join(process.env.HOME, 'Library/Application Support/Google/Chrome/Profile 2');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { execSync(`pkill -f "Google Chrome.*remote-debugging-port=${CDP_PORT}" 2>/dev/null || true`); } catch {}
  await sleep(500);

  const tmp = join(tmpdir(), `hr-cdp-${Date.now()}`);
  mkdirSync(join(tmp, 'Default'), { recursive: true });
  try { copyFileSync(join(PROFILE, 'Cookies'), join(tmp, 'Default', 'Cookies')); } catch {}

  console.log('Launching headless Chrome on port', CDP_PORT, '...');
  // Launch Chrome as a fully detached shell process so it outlives any parent
  // signal propagation from the bash harness.
  execSync(
    `"${CHROME}" --remote-debugging-port=${CDP_PORT} --user-data-dir="${tmp}" ` +
    `--headless=new --disable-gpu --no-sandbox --disable-extensions ` +
    `--disable-background-networking > /dev/null 2>&1 &`
  );

  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try { if ((await fetch(`http://localhost:${CDP_PORT}/json/version`)).ok) { ready = true; break; } } catch {}
  }
  if (!ready) throw new Error('Chrome CDP not ready after 10s');
  console.log('Chrome CDP ready.');

  const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
  const { default: WebSocket } = await import('ws');
  const ws = new WebSocket(version.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = {};
  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.id && pending[msg.id]) { pending[msg.id](msg); delete pending[msg.id]; }
  });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

  const send = (method, params) => new Promise((res, rej) => {
    if (ws.readyState !== 1) return rej(new Error(`WS not open for ${method}`));
    const id = msgId++;
    pending[id] = res;
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Navigate to hackerrank.com so the browser context loads cookies from the
  // copied profile DB, then read them via Storage.getCookies (browser-level,
  // immune to SPA redirects that break the page-session Network domain).
  console.log('Navigating to HackerRank Work library...');
  await send('Target.createTarget', { url: 'https://www.hackerrank.com/work/library/tests' });
  await sleep(8000);

  const cookiesRes = await send('Storage.getCookies', {});
  const cookies = cookiesRes?.result?.cookies || [];
  const relevant = cookies.filter(c =>
    c.domain.includes('hackerrank.com')
  );

  ws.close();
  // Kill only the Chrome process listening on the CDP port, not the node client
  // connected to it (lsof -ti would also return the node PID and self-kill).
  try { execSync(`pkill -f "Google Chrome.*remote-debugging-port=${CDP_PORT}" 2>/dev/null || true`); } catch {}
  try { execSync(`rm -rf "${tmp}"`); } catch {}

  if (relevant.length === 0) {
    throw new Error('No HackerRank cookies found — make sure you are logged into hackerrank.com in Chrome Profile 2');
  }

  const cookieStr = relevant.map(c => `${c.name}=${c.value}`).join('; ');
  writeFileSync(COOKIES_OUT, JSON.stringify({ cookieStr, extractedAt: new Date().toISOString() }, null, 2));
  execSync(`chmod 600 "${COOKIES_OUT}"`);
  console.log(`Saved ${relevant.length} cookies to ${COOKIES_OUT}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
