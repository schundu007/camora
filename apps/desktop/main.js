// Camora Desktop v2 — minimal native shell.
//
// What it does:
//   • Loads camora.cariara.com in a native window (single source of truth).
//   • System-audio loopback for getDisplayMedia (interviewer audio from Zoom/Meet).
//   • Native screen capture via /usr/sbin/screencapture (full res, real PNG).
//   • Real PDF + DOCX downloads (Chromium printToPDF, docx package).
//   • Mic permission prompt at launch.
//   • Cmd+B hide/show.
//   • Window state persists.
//
// What it deliberately doesn't:
//   • No tray (caused stale-icon issues last build).
//   • No auto-updater.
//   • No screen-capture entitlement gating beyond what macOS TCC handles natively.

const {
  app, BrowserWindow, globalShortcut, systemPreferences,
  session, shell, ipcMain, desktopCapturer, dialog, nativeImage,
  Menu, MenuItem, clipboard, screen: electronScreen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');
const {
  Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber,
} = require('docx');

const APP_URL = process.env.CAMORA_URL || 'https://camora.cariara.com';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

// Electron 40+ regression: setDisplayMediaRequestHandler with
// audio:'loopback' returns a silent stream when Chromium routes through
// CoreAudio Tap (the default on macOS 14.2+). Force the legacy
// ScreenCaptureKit loopback path so interviewer audio actually has
// signal. See electron/electron#49607.
app.commandLine.appendSwitch('disable-features', 'MacCatapLoopbackAudioForScreenShare');

// ── Single instance ─────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); }

let mainWindow = null;
let isQuitting = false;

// ── Window state ────────────────────────────────────────────────────────
function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return { width: 1400, height: 900 };
}
function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    fs.writeFileSync(STATE_FILE, JSON.stringify(b));
  } catch {}
}

// ── Window ──────────────────────────────────────────────────────────────
function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width, height: state.height, x: state.x, y: state.y,
    minWidth: 900, minHeight: 600,
    title: 'Camora',
    backgroundColor: '#0a0a0a',
    // Default macOS title bar — keeps traffic lights in their own strip
    // above the web app so they never overlap the in-app nav header.
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on('close', (e) => {
    if (!isQuitting) saveWindowState(mainWindow);
  });
  ['resize', 'move'].forEach((ev) => mainWindow.on(ev, () => saveWindowState(mainWindow)));

  // External links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Right-click context menu — Electron doesn't ship one by default, so the
  // web view has no Copy/Paste/Select All. Build it from the contextmenu
  // params so we only show entries that make sense for the click target.
  mainWindow.webContents.on('context-menu', (_e, params) => {
    const menu = new Menu();
    const hasSelection = !!(params.selectionText && params.selectionText.trim().length > 0);
    const editable = !!params.isEditable;

    if (params.misspelledWord && Array.isArray(params.dictionarySuggestions)) {
      for (const s of params.dictionarySuggestions) {
        menu.append(new MenuItem({ label: s, click: () => mainWindow.webContents.replaceMisspelling(s) }));
      }
      if (params.dictionarySuggestions.length > 0) menu.append(new MenuItem({ type: 'separator' }));
    }

    if (editable) {
      menu.append(new MenuItem({ role: 'cut', enabled: hasSelection }));
      menu.append(new MenuItem({ role: 'copy', enabled: hasSelection }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'pasteAndMatchStyle' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else if (hasSelection) {
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    }

    if (params.linkURL) {
      if (menu.items.length > 0) menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Open Link in Browser',
        click: () => shell.openExternal(params.linkURL),
      }));
      menu.append(new MenuItem({
        label: 'Copy Link',
        click: () => clipboard.writeText(params.linkURL),
      }));
    }

    if (params.mediaType === 'image' && params.srcURL) {
      if (menu.items.length > 0) menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL),
      }));
    }

    if (menu.items.length > 0) menu.popup({ window: mainWindow });
  });

  // Audio loopback for interviewer audio (Zoom/Meet capture without virtual cables).
  // Auto-pick the primary screen so users don't have to click through a picker.
  session.defaultSession.setDisplayMediaRequestHandler((_req, callback) => {
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
      .then((sources) => callback(sources.length ? { video: sources[0], audio: 'loopback' } : {}))
      .catch(() => callback({}));
  }, { useSystemPicker: false });
}

// ── Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Clear the HTTP cache on every launch. Electron caches index.html and
  // hashed asset chunks aggressively, which means a Vercel deploy that
  // changed a chunk hash often serves the OLD HTML pointing at a chunk
  // that is now missing — or a STALE chunk that doesn't match the
  // preload's IPC surface. Wiping the cache here costs ~one extra
  // network round-trip on launch and makes "fresh deploy = fresh app".
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({ storages: ['shadercache', 'cachestorage'] });
  } catch {}

  // Prompt for mic at launch so it's a one-time UX, not a surprise mid-interview.
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch {}
  }

  // Electron 41 tightened renderer permission gating: navigator.mediaDevices.
  // getUserMedia() in the renderer now needs an explicit grant from the main
  // process, otherwise the renderer sees a NotAllowedError and shows
  // "Failed to access microphone" — even when macOS TCC has already granted
  // mic access to the app. Approve `media` (mic + camera) and `display-capture`
  // for the camora.cariara.com origin we control; deny anything else by default.
  // Without this, every Lumora audio surface broke after the 35→41 bump.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents?.getURL?.() || '';
    const allowed = ['media', 'mediaKeySystem', 'display-capture', 'clipboard-read', 'clipboard-sanitized-write'];
    const trusted = url.startsWith('https://camora.cariara.com')
      || url.startsWith('http://localhost:')
      || url.startsWith(APP_URL);
    callback(Boolean(trusted && allowed.includes(permission)));
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const url = webContents?.getURL?.() || '';
    const allowed = ['media', 'mediaKeySystem', 'display-capture', 'clipboard-read', 'clipboard-sanitized-write'];
    const trusted = url.startsWith('https://camora.cariara.com')
      || url.startsWith('http://localhost:')
      || url.startsWith(APP_URL);
    return Boolean(trusted && allowed.includes(permission));
  });

  createWindow();

  // Start auto-detecting HackerRank in the browser (macOS only via AppleScript)
  startHackerrankAutoDetect();

  // Watch ~/Desktop for new macOS screenshots (Cmd+Shift+3/4).
  if (process.platform === 'darwin') startDesktopScreenshotWatcher();

  globalShortcut.register('CommandOrControl+B', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      // Also hide overlay so it doesn't linger while Camora is hidden
      if (_overlayWindow && !_overlayWindow.isDestroyed()) _overlayWindow.close();
    } else {
      mainWindow.show();
    }
  });
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reloadIgnoringCache();
  });
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reloadIgnoringCache();
  });

  // F9 — silently capture the HackerRank browser window and push it to the
  // renderer for auto-solving. F9 is unclaimed by Chrome/Safari/macOS so it
  // never triggers a browser action while the user is in their interview window.
  // Cmd+Shift+H was the prior choice but it navigates Chrome to the home page.
  const hrRegistered = globalShortcut.register('F9', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const dataUrl = await captureWindowByName('hackerrank');
      if (!dataUrl) {
        mainWindow.webContents.send('hackerrank-capture-result', {
          error: 'No HackerRank window found. Make sure HackerRank is open in your browser.',
        });
        return;
      }
      mainWindow.webContents.send('hackerrank-capture-result', { dataUrl });
    } catch (err) {
      console.error('[hackerrank-capture] failed:', err);
      mainWindow.webContents.send('hackerrank-capture-result', { error: err?.message || 'Capture failed' });
    }
  });
  if (!hrRegistered) console.warn('[shortcut] F9 registration failed — may be claimed by OS or another app');
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Dock-icon click on macOS. Previous handler was `mainWindow.show()`
// only — that left minimized windows minimized and hidden windows
// behind whatever app was foreground, so the user had to click the
// Dock twice to actually see Camora. Mirror the second-instance
// pattern: recreate if destroyed, restore if minimized, show + focus
// in every case so the window comes forward on the FIRST click.
app.on('activate', () => {
  // macOS can dispatch `activate` (Dock click, Finder launch, OS auto-
  // relaunch on login) BEFORE `whenReady` resolves. Calling
  // `new BrowserWindow(...)` while the app is not ready throws
  // "Cannot create BrowserWindow before app is ready" and the app
  // crashes silently from the user's perspective. The whenReady
  // handler below will create the window itself once it's safe — we
  // just no-op here and let activate fire again post-ready (it does).
  if (!app.isReady()) return;
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
});
app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (_hrPollTimer) clearInterval(_hrPollTimer);
});

app.on('second-instance', () => {
  // Same not-ready guard as `activate`: a second-launch attempt can race
  // ahead of whenReady on cold start. The whenReady handler will create
  // the window when it's safe.
  if (!app.isReady()) return;
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
});

// ── HackerRank auto-detect via AppleScript DOM scraping (macOS only) ────────
// Every 5 s we check the active Chrome/Brave URL. When a HackerRank codepair
// or contest URL appears (first time or on navigation to a new question) we
// inject JS into the live Chrome tab to extract the problem description,
// selected language, and the starter code from the CodeMirror editor — all
// without requiring any keypress or cursor movement from the user.

function runAppleScript(script) {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-']);
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `osascript exited ${code}`));
    });
    proc.stdin.write(script);
    proc.stdin.end();
  });
}

const BROWSERS = ['Google Chrome', 'Brave Browser', 'Microsoft Edge', 'Arc'];

async function getActiveBrowserInfo() {
  for (const browser of BROWSERS) {
    try {
      // Fetch URL and window title in one AppleScript call
      const result = await runAppleScript(`
tell application "${browser}"
  set u to URL of active tab of front window
  set t to name of front window
  return u & "|||" & t
end tell`);
      if (!result) continue;
      const sep = result.indexOf('|||');
      const url = sep >= 0 ? result.slice(0, sep).trim() : result.trim();
      const windowTitle = sep >= 0 ? result.slice(sep + 3).trim() : '';
      if (url) return { browser, url, windowTitle };
    } catch {}
  }
  return null;
}

let _lastHrUrl = null;
let _hrPollTimer = null;
// Active coding platform — set by renderer via 'set-coding-platform' IPC.
// Drives which URLs trigger auto-capture.
let _codingPlatform = 'hackerrank'; // default on: most users are using HackerRank

const PLATFORM_URL_MATCH = {
  hackerrank: (url) => url.includes('hackerrank.com') &&
    !/hackerrank\.com\/(dashboard|settings|profile|notifications|jobs|companies|login|signup)/.test(url),
  leetcode: (url) => url.includes('leetcode.com/problems/'),
  coderpad: (url) => url.includes('coderpad.io/'),
};

async function doHackerrankScrape() {
  const info = await getActiveBrowserInfo();
  if (!info) return { ok: false, error: 'No browser window found. Open Chrome/Brave with HackerRank.' };
  const { url, windowTitle } = info;
  console.log('[hr-auto] active browser URL:', url, '| window title:', windowTitle);
  const activePlatform = _codingPlatform !== 'none' ? _codingPlatform : 'hackerrank';
  const matchFn = PLATFORM_URL_MATCH[activePlatform];
  if (!matchFn?.(url)) {
    const names = { hackerrank: 'HackerRank', leetcode: 'LeetCode', coderpad: 'CoderPad' };
    return { ok: false, error: `Active tab is not ${names[activePlatform] || 'the selected platform'}.\nCurrent URL: ${url}` };
  }
  const dataUrl = await captureExactBrowserWindow(windowTitle);
  if (!dataUrl) return { ok: false, error: 'Could not capture the HackerRank browser window. Make sure it is visible (not minimised or behind other windows).' };
  _lastHrUrl = url;
  return { ok: true, dataUrl, url };
}

// Capture a specific browser window by matching its EXACT title from AppleScript.
// Never falls back to non-browser windows (no VS Code / Terminal / other apps).
async function captureExactBrowserWindow(windowTitle) {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 2560, height: 1600 },
  });
  console.log('[capture] windows:', sources.map(s => s.name));

  let target = null;

  // Strategy 1: source name starts with AppleScript window title (e.g. "Interview | Bash: Pattern Matching")
  // desktopCapturer appends " - Google Chrome" so we use startsWith rather than strict equality
  if (windowTitle) {
    target = sources.find(s => s.name.startsWith(windowTitle) || windowTitle.startsWith(s.name));
  }

  // Strategy 2: "hackerrank" anywhere in title (main HR pages, not codepair)
  if (!target) {
    target = sources.find(s => s.name.toLowerCase().includes('hackerrank'));
  }

  // Strategy 3: codepair title format — "Interview | ..." in a browser window
  if (!target) {
    target = sources.find(s =>
      /^interview\s*\|/i.test(s.name) &&
      /Google Chrome|Brave|Firefox|Safari|Microsoft Edge|Arc/i.test(s.name)
    );
  }

  // Strategy 4: any browser window not Camora (but NOT a catch-all — must be a known browser)
  if (!target) {
    target = sources.find(s =>
      /Google Chrome|Brave Browser|Firefox|Safari|Microsoft Edge|Arc/i.test(s.name) &&
      !/Camora/i.test(s.name)
    );
  }

  // No further fallback — better to fail loudly than capture VS Code / Terminal
  console.log('[capture] selected:', target?.name ?? 'none');
  if (!target) return null;

  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) return null;

  const MAX_BASE64 = 4_800_000;
  const base64Size = (raw) => Math.ceil(raw.length / 3) * 4;
  let buf = thumbnail.toPNG();
  if (base64Size(buf) > MAX_BASE64) {
    let img = nativeImage.createFromBuffer(buf);
    img = img.resize({ width: Math.min(img.getSize().width, 1920), quality: 'best' });
    buf = img.toPNG();
    if (base64Size(buf) > MAX_BASE64) {
      buf = img.toJPEG(85);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  }
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function startHackerrankAutoDetect() {
  if (process.platform !== 'darwin') return;

  const poll = async () => {
    try {
      // Skip if no platform selected or Screen Recording not granted
      if (_codingPlatform === 'none') return;
      if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') return;
      const info = await getActiveBrowserInfo();
      if (!info) return;
      const { url } = info;
      const matchFn = PLATFORM_URL_MATCH[_codingPlatform];
      if (!matchFn || !matchFn(url)) return;
      if (url === _lastHrUrl) return; // already processed successfully — don't re-fire
      console.log('[hr-auto] HackerRank detected, scraping:', url);
      // Settle time so the page DOM is ready after navigation
      await new Promise(r => setTimeout(r, 2000));
      const result = await doHackerrankScrape();
      if (!result.ok) {
        console.error('[hr-auto] scrape failed:', result.error);
        return; // _lastHrUrl NOT set — will retry next poll
      }
      // _lastHrUrl is set inside doHackerrankScrape on success
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hackerrank-capture-result', { dataUrl: result.dataUrl });
      }
    } catch (err) {
      console.debug('[hr-auto] poll error:', err.message);
      // _lastHrUrl NOT set — will retry next poll
    }
  };

  _hrPollTimer = setInterval(poll, 3000);
  setTimeout(poll, 1500);
}

// ── Desktop screenshot watcher ──────────────────────────────────────────────
// Polls ~/Desktop every 1 s for new macOS screenshots (Cmd+Shift+3/4).
// fs.watch is unreliable on macOS for files created by system processes
// (screencapture daemon), so we diff the directory listing instead.
// When a new "Screenshot *.png" appears, reads it and sends to renderer.
let _lastDesktopScreenshot = null;
let _desktopKnownFiles = new Set();

function startDesktopScreenshotWatcher() {
  const desktopPath = path.join(os.homedir(), 'Desktop');

  // Seed the known-files set with whatever is already on the Desktop so we
  // don't fire on screenshots that predate this launch.
  try {
    const existing = fs.readdirSync(desktopPath)
      .filter(f => /^Screenshot.*\.(png|jpg|jpeg)$/i.test(f));
    existing.forEach(f => _desktopKnownFiles.add(f));
    console.log(`[screenshot-watcher] seeded ${_desktopKnownFiles.size} existing screenshots, polling ${desktopPath}`);
  } catch (err) {
    console.warn('[screenshot-watcher] could not read Desktop:', err.message);
    return;
  }

  setInterval(() => {
    try {
      const files = fs.readdirSync(desktopPath)
        .filter(f => /^Screenshot.*\.(png|jpg|jpeg)$/i.test(f));
      for (const filename of files) {
        if (_desktopKnownFiles.has(filename)) continue;
        _desktopKnownFiles.add(filename);
        const filepath = path.join(desktopPath, filename);
        // Wait 1 s for macOS to finish writing before reading.
        setTimeout(() => {
          try {
            const buf = fs.readFileSync(filepath);
            if (buf.length < 50000) return; // skip tiny/corrupt files
            _lastDesktopScreenshot = filepath;
            const isJpeg = /\.(jpg|jpeg)$/i.test(filename);
            const dataUrl = `data:image/${isJpeg ? 'jpeg' : 'png'};base64,${buf.toString('base64')}`;
            console.log('[screenshot-watcher] new screenshot:', filename, `(${Math.round(buf.length / 1024)} KB)`);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('screenshot-watcher-new', { dataUrl, filename });
            }
          } catch (e) {
            console.warn('[screenshot-watcher] read error:', e.message);
          }
        }, 1000);
      }
    } catch (e) {
      console.warn('[screenshot-watcher] poll error:', e.message);
    }
  }, 1000);
}

// ── Solution overlay (click-through floating code panel) ─────────────────────
// Shows generated code as a transparent overlay that floats on top of the
// HackerRank browser window. setIgnoreMouseEvents passes ALL mouse events
// through to the browser underneath — HackerRank never sees a mouseleave.
let _overlayWindow = null;
let _overlayHideTimer = null;

function buildOverlayHtml(code, language) {
  const escaped = (code || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:transparent;overflow:hidden;height:100%}
  .panel{
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(4,6,14,0.93);
    border:1px solid rgba(0,71,171,0.7);
    border-radius:10px;
    display:flex;flex-direction:column;
    font-family:'Menlo','Monaco','Courier New',monospace;
    backdrop-filter:blur(2px);
  }
  .header{
    -webkit-app-region:drag;
    cursor:move;
    padding:7px 10px 7px 12px;
    background:rgba(0,71,171,0.30);
    border-radius:10px 10px 0 0;
    border-bottom:1px solid rgba(0,71,171,0.4);
    font-size:11px;color:#7ab3ff;letter-spacing:.05em;
    flex-shrink:0;
    display:flex;align-items:center;justify-content:space-between;
    user-select:none;
  }
  .close-btn{
    -webkit-app-region:no-drag;
    cursor:pointer;
    width:18px;height:18px;
    border-radius:50%;
    background:rgba(255,255,255,0.12);
    border:1px solid rgba(255,255,255,0.18);
    display:flex;align-items:center;justify-content:center;
    color:rgba(255,255,255,0.6);
    font-size:12px;line-height:1;
    transition:background 0.15s;
    flex-shrink:0;
  }
  .close-btn:hover{background:rgba(239,68,68,0.7);color:#fff;border-color:transparent}
  pre{
    -webkit-app-region:no-drag;
    flex:1;overflow:auto;padding:12px 14px;
    font-size:12.5px;line-height:1.6;
    color:#c8e6c9;white-space:pre-wrap;word-break:break-all;
    cursor:text;user-select:text;
  }
</style></head><body>
<div class="panel">
  <div class="header">
    <span>CAMORA &middot; ${(language||'').toUpperCase()} SOLUTION &nbsp;&#8942;&nbsp; drag to move</span>
    <div class="close-btn" onclick="window.close()" title="Close">&#x2715;</div>
  </div>
  <pre>${escaped}</pre>
</div>
<script>
  const hdr = document.querySelector('.header');
  hdr.addEventListener('mouseenter', () => window.overlayAPI?.setInteractive(true));
  hdr.addEventListener('mouseleave', () => window.overlayAPI?.setInteractive(false));
</script>
</body></html>`;
}

// Get the screen-coordinate bounds of the front Chrome/Brave window via AppleScript.
// Returns {x, y, width, height} or null on failure.
async function getActiveBrowserBounds() {
  for (const browser of BROWSERS) {
    try {
      const raw = await runAppleScript(`tell application "${browser}"
  set b to bounds of front window
  return ((item 1 of b) as text) & "," & ((item 2 of b) as text) & "," & ((item 3 of b) as text) & "," & ((item 4 of b) as text)
end tell`);
      const parts = raw.trim().split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        const [x1, y1, x2, y2] = parts;
        return { x: x1, y: y1, width: x2 - x1, height: y2 - y1, browser };
      }
    } catch {}
  }
  return null;
}

ipcMain.handle('show-solution-overlay', async (_event, { code, language, stealthActive }) => {
  let x, y, W, H;

  try {
    const cb = await getActiveBrowserBounds();
    if (!cb) throw new Error('no browser bounds');

    // Find which display Chrome is on so the overlay lands on the same screen.
    const targetDisplay = electronScreen.getDisplayNearestPoint({ x: cb.x + Math.round(cb.width / 2), y: cb.y + Math.round(cb.height / 2) });
    const { width: sw, height: sh } = targetDisplay.workAreaSize;
    const ox = targetDisplay.workArea.x;
    const oy = targetDisplay.workArea.y;

    const TAB_BAR_H = 72;
    W = Math.round(cb.width * 0.44);
    H = Math.min(sh - 40, cb.height - TAB_BAR_H - 10);
    x = cb.x + 8;
    y = cb.y + TAB_BAR_H;
    // Clamp to the target display's work area so the window never escapes it.
    x = Math.max(ox, Math.min(x, ox + sw - W));
    y = Math.max(oy, Math.min(y, oy + sh - H));
    console.log(`[overlay] on ${cb.browser} display(${ox},${oy}) at (${x},${y}) ${W}x${H}`);
  } catch {
    // Fallback: same display as the Camora main window.
    const mw = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    const fallbackDisplay = mw
      ? electronScreen.getDisplayNearestPoint(mw.getBounds())
      : electronScreen.getPrimaryDisplay();
    const { width: sw, height: sh } = fallbackDisplay.workAreaSize;
    const ox = fallbackDisplay.workArea.x;
    const oy = fallbackDisplay.workArea.y;
    W = Math.min(560, Math.round(sw * 0.38));
    H = Math.min(700, Math.round(sh * 0.78));
    x = ox + sw - W - 16;
    y = oy + Math.round((sh - H) / 2);
    console.log(`[overlay] fallback on Camora display at (${x},${y}) ${W}x${H}`);
  }

  if (!_overlayWindow || _overlayWindow.isDestroyed()) {
    _overlayWindow = new BrowserWindow({
      width: W, height: H, x, y,
      transparent: true, frame: false,
      alwaysOnTop: true, skipTaskbar: true,
      hasShadow: true, focusable: false,
      webPreferences: {
        nodeIntegration: false, contextIsolation: true,
        preload: path.join(__dirname, 'overlay-preload.js'),
      },
    });
    _overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    // Default: pass all events through. The preload toggles this off only
    // when the cursor is over the drag handle (header), so -webkit-app-region
    // drag fires without blocking Chrome events over the code area.
    _overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    _overlayWindow.on('closed', () => { _overlayWindow = null; });
  } else {
    // Reposition on code update so it tracks Chrome if Chrome moved
    _overlayWindow.setBounds({ x, y, width: W, height: H });
    _overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  const html = buildOverlayHtml(code, language);
  _overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Auto-hide after 10 minutes.
  if (_overlayHideTimer) clearTimeout(_overlayHideTimer);
  _overlayHideTimer = setTimeout(() => {
    if (_overlayWindow && !_overlayWindow.isDestroyed()) _overlayWindow.close();
  }, 600000);

  console.log('[overlay] shown', W, 'x', H, 'at', x, y, stealthActive ? '(interactive)' : '(passthrough)');
});

ipcMain.handle('hide-solution-overlay', () => {
  if (_overlayHideTimer) { clearTimeout(_overlayHideTimer); _overlayHideTimer = null; }
  if (_overlayWindow && !_overlayWindow.isDestroyed()) _overlayWindow.close();
});

// Preload in overlay-preload.js sends this when cursor enters/leaves the drag header.
// Toggling per-region: header = interactive (drag fires), code area = pass-through.
ipcMain.on('overlay-interactive', (_event, on) => {
  if (_overlayWindow && !_overlayWindow.isDestroyed()) {
    if (on) {
      _overlayWindow.setFocusable(true);
      _overlayWindow.setIgnoreMouseEvents(false);
    } else {
      _overlayWindow.setFocusable(false);
      _overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }
});

// ── Stealth mode — neutralize HackerRank mouse/focus tracking ───────────────
// Injects JS into the active Chrome/Brave tab via AppleScript.
//
// Why the two-pronged approach (window-capture + healing):
//   • visibilitychange / mouseleave target 'document' — window capture listeners
//     fire BEFORE document listeners, so stopImmediatePropagation works regardless
//     of when HackerRank registered its handler.
//   • blur targets 'window' itself — registration order determines firing order,
//     so HR's handler (registered during page load) fires before ours. We can't
//     suppress it, but we can "heal" immediately by dispatching a focus event back,
//     resetting whatever timer HR started.
//   • Poll-based detection (document.hasFocus() / document.hidden checks in a
//     setInterval) is handled by overriding those getters/methods.
//   • Periodic mousemove heartbeat fakes "mouse is in the window" for coordinate checks.
//
// No __camoraStealthActive guard — allows re-injection after page navigations.
// Requires Chrome Developer → "Allow JavaScript from Apple Events" (one-time toggle).
// Single quotes only in JS payload so it embeds cleanly in AppleScript double-quoted string.
ipcMain.handle('inject-tracking-neutralizer', async () => {
  if (process.platform !== 'darwin') {
    return { ok: false, error: 'Stealth mode requires macOS.' };
  }

  const js = [
    '(function(){',
    // Override addEventListener — block future HR registrations for detection events.
    // Use 'o' (original) to add OUR listeners below so our override doesn't block us.
    'var o=EventTarget.prototype.addEventListener;',
    'var B={mouseleave:1,mouseout:1,blur:1,visibilitychange:1,focusout:1};',
    'EventTarget.prototype.addEventListener=function(t,f,v){',
    '  if(B[t]&&(this===window||this===document||this===document.body||this===document.documentElement))return;',
    '  return o.apply(this,arguments);',
    '};',

    // Override poll-based detection APIs
    'try{Object.defineProperty(document,\'hidden\',{get:function(){return false},configurable:true})}catch(e){}',
    'try{Object.defineProperty(document,\'visibilityState\',{get:function(){return \'visible\'},configurable:true})}catch(e){}',
    'try{document.hasFocus=function(){return true}}catch(e){}',

    // visibilitychange targets 'document' — window capture fires BEFORE document listeners.
    // stopImmediatePropagation here prevents ALL document-level visibilitychange handlers.
    'o.call(window,\'visibilitychange\',function(e){e.stopImmediatePropagation()},true);',

    // mouseleave / mouseout target document or body — window capture fires first.
    'o.call(window,\'mouseleave\',function(e){e.stopImmediatePropagation()},true);',
    'o.call(window,\'mouseout\',function(e){e.stopImmediatePropagation()},true);',

    // focusout bubbles up to window — stop it before it reaches document handlers.
    'o.call(window,\'focusout\',function(e){e.stopImmediatePropagation()},true);',

    // blur targets window itself — registration order means HR fires first, so heal instead.
    // Immediately dispatch 'focus' so HackerRank\'s state machine sees focus restored.
    'o.call(window,\'blur\',function(){',
    '  setTimeout(function(){',
    '    try{window.dispatchEvent(new FocusEvent(\'focus\',{bubbles:false}))}catch(x){}',
    '    try{document.dispatchEvent(new Event(\'visibilitychange\'))}catch(x){}',
    '  },0);',
    '},true);',

    // Periodic mousemove heartbeat — fakes mouse-in-window for coordinate-based checks.
    // Guard prevents duplicate intervals on re-injection.
    'if(window.__camoraHB){clearInterval(window.__camoraHB)}',
    'window.__camoraHB=setInterval(function(){',
    '  try{',
    '    document.dispatchEvent(new MouseEvent(\'mousemove\',{',
    '      bubbles:true,cancelable:true,',
    '      clientX:550+Math.round(Math.random()*20),',
    '      clientY:350+Math.round(Math.random()*20),',
    '      view:window',
    '    }));',
    '  }catch(e){}',
    '},1500);',

    'window.__camoraStealthActive=true;',
    'console.log(\'[Camora Stealth] v2 active\');',
    '})();',
  ].join('');

  const STEALTH_BROWSERS = ['Google Chrome', 'Brave Browser', 'Arc', 'Microsoft Edge'];
  for (const browser of STEALTH_BROWSERS) {
    try {
      await runAppleScript(`tell application "${browser}"
  execute front window's active tab javascript "${js}"
end tell`);
      console.log(`[stealth] injected into ${browser}`);
      return { ok: true, browser };
    } catch (err) {
      const msg = String(err?.message || err);
      if (/not running|Application isn/i.test(msg)) continue;
      if (/AppleEvent|not allowed|JavaScript|1002|privileged/i.test(msg)) {
        return { ok: false, needsDevMenu: true, browser, error: msg };
      }
      console.warn(`[stealth] ${browser} injection failed:`, msg);
    }
  }
  return { ok: false, error: 'No supported browser found. Open Chrome or Brave with HackerRank active.' };
});

// Renderer tells us which coding platform to watch.
ipcMain.handle('set-coding-platform', (_event, platform) => {
  _codingPlatform = platform || 'none';
  _lastHrUrl = null; // reset dedup so first detection on new platform fires immediately
  console.log('[hr-auto] coding platform set to:', _codingPlatform);
});

// OCR failed in renderer — reset dedup so next poll retries the same URL.
ipcMain.handle('reset-last-capture-url', () => {
  _lastHrUrl = null;
  console.log('[hr-auto] capture URL reset — will retry on next poll');
});

// Manual on-demand trigger — renderer calls this when user clicks "Fetch HackerRank"
ipcMain.handle('hackerrank-manual-fetch', async () => {
  // Screen Recording permission is required before desktopCapturer will return
  // non-empty thumbnails. Check it first so the user gets a clear error rather
  // than a confusing "could not capture" message.
  const screenStatus = systemPreferences.getMediaAccessStatus('screen');
  if (screenStatus !== 'granted') {
    return {
      ok: false,
      needsScreenPermission: true,
      error: `Camora needs Screen Recording permission to capture the HackerRank window (current status: ${screenStatus}).\n\nSystem Settings → Privacy & Security → Screen & Camera Recording → enable Camora.\n\nRestart Camora after granting permission.`,
    };
  }
  try {
    return await doHackerrankScrape();
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Silent window capture by name ───────────────────────────────────────
// Used by the global F9 shortcut to silently grab the HackerRank
// browser window without any user cursor movement or click.
async function captureWindowByName(searchTerm) {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 5120, height: 2880 },
  });
  console.log('[capture] available windows:', sources.map(s => s.name));

  const term = (searchTerm || 'hackerrank').toLowerCase();
  // Strategy 1: window title contains "hackerrank" (works on main HackerRank pages)
  let target = sources.find(s => s.name.toLowerCase().includes(term));

  // Strategy 2: codepair title format "Interview | ..."
  if (!target) {
    target = sources.find(s => /^interview\s*\|/i.test(s.name));
  }

  // Strategy 3: any known browser window (not Camora) — Z-order means front = HackerRank when F9 fires
  if (!target) {
    target = sources.find(s =>
      /Google Chrome|Safari|Firefox|Brave Browser|Microsoft Edge|Arc/i.test(s.name) &&
      !/Camora/i.test(s.name)
    );
  }

  // No catch-all — better to fail than capture VS Code / Terminal / other apps
  console.log('[capture] selected window:', target?.name ?? 'none');
  if (!target) return null;

  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) return null;

  const MAX_BASE64 = 4_800_000;
  const base64Size = (raw) => Math.ceil(raw.length / 3) * 4;
  let buf = thumbnail.toPNG();

  if (base64Size(buf) > MAX_BASE64) {
    let img = nativeImage.createFromBuffer(buf);
    img = img.resize({ width: Math.min(img.getSize().width, 1920), quality: 'best' });
    buf = img.toPNG();
    if (base64Size(buf) > MAX_BASE64) {
      buf = img.toJPEG(85);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  }
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// On-demand IPC: renderer can call this directly (e.g. when user pastes a
// HackerRank URL and we want to capture without the keyboard shortcut).
ipcMain.handle('capture-window-by-name', async (_e, searchTerm) => {
  return captureWindowByName(searchTerm || 'hackerrank');
});

// ── IPC: macOS-native window capture (NO MODAL) ────────────────────────
// Click Capture → Camora hides → macOS draws its own window-select
// cursor (camera icon on hover) → user clicks any window → capture
// written → Camora reappears. No in-app picker, no list, no thumbs.
ipcMain.handle('capture-interactive', async () => {
  const tmp = path.join(os.tmpdir(), `camora-cap-${Date.now()}-${process.pid}.png`);
  const wasVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
  if (wasVisible) {
    mainWindow.hide();
    await new Promise((r) => setTimeout(r, 120));
  }
  try {
    // -W: start in window-selection mode (camera icon, click to capture).
    // User can also press Space to switch between window mode and region
    // selection — same as Cmd+Shift+5 on macOS.
    // -o: don't include the window's drop shadow.
    // -t png: full-res PNG.
    // If user presses Escape, screencapture exits 1 and writes nothing.
    await new Promise((res) => {
      execFile('/usr/sbin/screencapture', ['-W', '-o', '-t', 'png', tmp], () => res());
    });
    if (!fs.existsSync(tmp)) return null;
    let buf = fs.readFileSync(tmp);
    fs.unlink(tmp, () => {});
    if (!buf.length) return null;

    // Anthropic's vision API rejects images whose base64 payload exceeds
    // 5 MB (5,242,880 bytes). Native screencapture on Retina/HiDPI screens
    // routinely produces 4–8 MB PNGs. Downscale to keep base64 under 4.8 MB
    // (some safety margin under the 5 MB cap). Iterate at most a few times.
    const MAX_BASE64 = 4_800_000;
    const base64Size = (raw) => Math.ceil(raw.length / 3) * 4;
    if (base64Size(buf) > MAX_BASE64) {
      let img = nativeImage.createFromBuffer(buf);
      let { width, height } = img.getSize();
      // First try shrinking to 1920px wide (more than enough for OCR; still
      // resolves small font on dual-pane editors).
      const targetW = Math.min(width, 1920);
      img = img.resize({ width: targetW, quality: 'best' });
      buf = img.toPNG();
      // If still too large, switch to JPEG quality 85 — keeps text crisp
      // and roughly halves the size vs PNG on screenshots with gradients.
      if (base64Size(buf) > MAX_BASE64) {
        buf = img.toJPEG(85);
        const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
        console.info(`[capture] resized to ${img.getSize().width}px JPEG, ${buf.length} bytes`);
        return dataUrl;
      }
      console.info(`[capture] resized to ${img.getSize().width}px PNG, ${buf.length} bytes`);
    }
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[capture] interactive screencapture failed:', err);
    fs.unlink(tmp, () => {});
    return null;
  } finally {
    if (wasVisible && mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  }
});

// ── IPC: media access (used by the renderer for actionable error UX) ───
ipcMain.handle('get-media-access-status', (_e, kind) => {
  if (process.platform !== 'darwin') return 'granted';
  return systemPreferences.getMediaAccessStatus(kind || 'microphone');
});
ipcMain.handle('ask-for-media-access', async (_e, kind) => {
  if (process.platform !== 'darwin') return true;
  try {
    return await systemPreferences.askForMediaAccess(kind || 'microphone');
  } catch {
    return false;
  }
});
ipcMain.handle('open-system-privacy', (_e, section) => {
  const sec = section || 'Microphone';
  return shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?Privacy_${sec}`);
});
ipcMain.handle('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// ── IPC: in-app screenshot trigger ─────────────────────────────────────────
// Runs screencapture -x (silent, no UI, no sound) on the full screen and drops
// the file on ~/Desktop under a "Screenshot camora-…" name so the existing
// desktop watcher picks it up automatically and pushes it to the renderer for
// Claude Vision OCR + problem extraction. No focus change required.
ipcMain.handle('take-screenshot', async () => {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only' };
  try {
    const filename = `Screenshot camora-${Date.now()}.png`;
    const dest = path.join(os.homedir(), 'Desktop', filename);
    await new Promise((resolve) => {
      execFile('/usr/sbin/screencapture', ['-x', dest], () => resolve());
    });
    return { ok: true };
  } catch (err) {
    console.error('[take-screenshot] failed:', err);
    return { ok: false, error: String(err?.message || err) };
  }
});

// ── IPC: download — real PDF via Chromium printToPDF ───────────────────
// Renderer sends fully-styled HTML; we render it in a hidden BrowserWindow,
// call printToPDF, then write to the chosen path via the native save dialog.
ipcMain.handle('save-pdf', async (_e, { html, filename }) => {
  if (!html) return { ok: false, error: 'no html' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save as PDF',
    defaultPath: filename || 'Camora.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  const printer = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false },
  });
  // data: URLs over a few hundred KB are flaky in Chromium — produces blank
  // or truncated PDFs that look "corrupted". Render from a temp file instead.
  const tmpHtml = path.join(os.tmpdir(), `camora-prep-${Date.now()}.html`);
  try {
    fs.writeFileSync(tmpHtml, html, 'utf8');
    await printer.loadFile(tmpHtml);
    // Wait one paint tick so fonts/CSS are committed before printing.
    await new Promise((r) => setTimeout(r, 200));
    const pdf = await printer.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      // Margins are baked into the @page rules in the HTML so Chromium
      // doesn't double up; pass 0 here.
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
    });
    fs.writeFileSync(result.filePath, pdf);
    return { ok: true, path: result.filePath };
  } catch (err) {
    console.error('[pdf] printToPDF failed:', err);
    return { ok: false, error: String(err?.message || err) };
  } finally {
    try { fs.unlinkSync(tmpHtml); } catch {}
    printer.destroy();
  }
});

// ── IPC: download — real DOCX via docx package ─────────────────────────
// Book-style: cover page, table of contents, chapter pages with running
// header + page-number footer, callouts, Q&A, tables. Mirrors the in-app
// FormattedJD aesthetic with navy + cream + charcoal palette.
ipcMain.handle('save-docx', async (_e, { sections, filename, title }) => {
  if (!Array.isArray(sections) || sections.length === 0) return { ok: false, error: 'no sections' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save as Word document',
    defaultPath: filename || 'Camora.docx',
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  // Word rejects XML control chars (U+0000..U+001F except tab/lf/cr) and
  // U+FFFE/U+FFFF — strip them or the .docx is flagged "corrupted" on open.
  const xmlSafe = (s) => String(s == null ? '' : s).replace(/[ --￾￿]/g, '');
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  const splitTitle = (full) => {
    const s = String(full || '');
    const dashIdx = s.search(/[—–-]/);
    if (dashIdx > 0) return { main: s.slice(0, dashIdx).trim(), sub: s.slice(dashIdx + 1).trim() };
    return { main: s, sub: '' };
  };
  const SEP = ' · ';

  const buildTable = (rows) => {
    const cols = rows[0].length;
    const headerRow = new TableRow({
      tableHeader: true,
      children: rows[0].map((cell) => new TableCell({
        width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0047AB' },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: [new Paragraph({ children: [new TextRun({ text: xmlSafe(cell).toUpperCase(), bold: true, color: 'FFFFFF', size: 18, characterSpacing: 8 })] })],
      })),
    });
    const bodyRows = rows.slice(1).map((r, idx) => new TableRow({
      children: r.map((cell) => new TableCell({
        width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
        shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F7FB' } : undefined,
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({ children: [new TextRun({ text: xmlSafe(cell), color: '2A2A2A', size: 22 })] })],
      })),
    }));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
        left:   { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
        right:  { style: BorderStyle.SINGLE, size: 4, color: 'C5D4E8' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
        insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
      },
    });
  };

  const buildCallout = (label, body, tone) => {
    const accent = tone === 'warn' ? 'C77A00' : '0047AB';
    const fill = tone === 'warn' ? 'FFF8EC' : 'EEF4FB';
    const lines = String(body || '').split('\n');
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          shading: { type: ShadingType.CLEAR, color: 'auto', fill },
          margins: { top: 200, bottom: 200, left: 280, right: 280 },
          children: [
            new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: String(label || 'NOTE').toUpperCase(), bold: true, color: accent, size: 16, characterSpacing: 22 })] }),
            ...lines.map((line) => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: xmlSafe(line), color: '2A2A2A', size: 22 })] })),
          ],
        })],
      })],
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        left: { style: BorderStyle.SINGLE, size: 24, color: accent },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
    });
  };

  const buildQA = (question, answer) => {
    const out = [];
    out.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      indent: { left: 360 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'C5D4E8', space: 8 } },
      children: [
        new TextRun({ text: ' Q ', bold: true, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0047AB' }, size: 18 }),
        new TextRun({ text: '  ' + xmlSafe(question), bold: true, color: '0A0A0A', size: 24 }),
      ],
    }));
    for (const line of String(answer || '').split('\n')) {
      out.push(new Paragraph({
        spacing: { after: 80 },
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'C5D4E8', space: 8 } },
        children: line.trim() ? [new TextRun({ text: xmlSafe(line), color: '2A2A2A', size: 22 })] : [new TextRun({ text: '' })],
      }));
    }
    return out;
  };

  const blocksToChildren = (blocks) => {
    const out = [];
    for (const b of (blocks || [])) {
      const text = xmlSafe(b.text);
      const lbl = xmlSafe(b.label);
      if (b.type === 'h1') out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 140 }, children: [new TextRun({ text, bold: true, color: '0A0A0A' })] }));
      else if (b.type === 'h2') out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text, bold: true, color: '0A0A0A' })] }));
      else if (b.type === 'h3') out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 80 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, color: '0047AB', characterSpacing: 24, size: 22 })] }));
      else if (b.type === 'h4') out.push(new Paragraph({ heading: HeadingLevel.HEADING_4, spacing: { before: 160, after: 60 }, children: [new TextRun({ text, bold: true, color: '333333' })] }));
      else if (b.type === 'lead') out.push(new Paragraph({
        spacing: { before: 200, after: 280 },
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 12 } },
        children: [new TextRun({ text, italics: true, color: '2A2A2A', size: 26 })],
      }));
      else if (b.type === 'li') out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, color: '2A2A2A', size: 22 })] }));
      else if (b.type === 'code') out.push(new Paragraph({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F5F0' },
        children: [new TextRun({ text, font: 'Menlo', size: 19, color: '2A2A2A' })],
      }));
      else if (b.type === 'field') out.push(new Paragraph({
        spacing: { after: 80 },
        children: text
          ? [new TextRun({ text: lbl, bold: true, color: '0047AB', size: 22 }), new TextRun({ text: ' ' + text, color: '2A2A2A', size: 22 })]
          : [new TextRun({ text: lbl, bold: true, color: '0047AB', size: 22 })],
      }));
      else if (b.type === 'spacer') out.push(new Paragraph({
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: 'C0C0C0', space: 1 } },
        children: [new TextRun({ text: '' })],
      }));
      else if (b.type === 'table' && Array.isArray(b.rows) && b.rows.length > 0) {
        out.push(buildTable(b.rows));
        out.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 80, after: 120 } }));
      }
      else if (b.type === 'callout') {
        const tone = /watch|warn|pitfall/i.test(lbl) ? 'warn' : 'info';
        out.push(buildCallout(lbl || 'Note', b.text || '', tone));
        out.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 80, after: 120 } }));
      }
      else if (b.type === 'qa') for (const p of buildQA(text, b.answer || '')) out.push(p);
      else out.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, color: '2A2A2A', size: 22 })] }));
    }
    return out;
  };

  const { main, sub } = splitTitle(title);
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const coverChildren = [
    new Paragraph({ spacing: { before: 1200, after: 0 }, children: [new TextRun({ text: 'CAMORA' + SEP + 'INTERVIEW PREP', bold: true, color: '0047AB', size: 20, characterSpacing: 32 })] }),
    new Paragraph({ spacing: { before: 200, after: 600 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
    new Paragraph({ spacing: { before: 2400, after: 0 }, children: [new TextRun({ text: 'BRIEFING', bold: true, color: '0047AB', size: 18, characterSpacing: 32 })] }),
    new Paragraph({ spacing: { before: 200, after: 240 }, children: [new TextRun({ text: xmlSafe(main), bold: true, color: '0A0A0A', size: 84 })] }),
    sub ? new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: xmlSafe(sub), italics: true, color: '555555', size: 30 })] }) : new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ spacing: { before: 3200, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
    new Paragraph({ spacing: { before: 200, after: 0 }, children: [new TextRun({ text: xmlSafe(today.toUpperCase()), bold: true, color: '888888', size: 18, characterSpacing: 32 })] }),
  ];

  const tocChildren = [
    new Paragraph({ spacing: { before: 480, after: 100 }, children: [new TextRun({ text: 'TABLE OF CONTENTS', bold: true, color: '0047AB', size: 20, characterSpacing: 32 })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Inside this briefing', bold: true, color: '0A0A0A', size: 56 })] }),
    new Paragraph({ spacing: { after: 320 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
    ...sections.map((s, i) => new Paragraph({
      spacing: { before: 80, after: 80 },
      border: { bottom: { style: BorderStyle.DOTTED, size: 2, color: 'CCCCCC', space: 1 } },
      children: [
        new TextRun({ text: (ROMAN[i] || String(i + 1)) + '   ', bold: true, color: '0047AB', size: 20, characterSpacing: 24 }),
        new TextRun({ text: xmlSafe(s.heading), color: '1A1A1A', size: 24 }),
      ],
    })),
  ];

  const bodySections = sections.map((s, i) => ({
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: (ROMAN[i] || String(i + 1)) + SEP + xmlSafe(s.heading).toUpperCase(),
            color: '999999', size: 16, characterSpacing: 28,
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], color: '888888', size: 16 })] })],
      }),
    },
    properties: { page: { margin: { top: 1440, right: 1224, bottom: 1440, left: 1224 } } },
    children: [
      new Paragraph({ spacing: { before: 720, after: 120 }, children: [new TextRun({ text: 'CHAPTER ' + (ROMAN[i] || String(i + 1)), bold: true, color: '0047AB', size: 20, characterSpacing: 32 })] }),
      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: xmlSafe(s.heading), bold: true, color: '0A0A0A', size: 60 })] }),
      new Paragraph({ spacing: { after: 320 }, border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: '0047AB', space: 1 } }, children: [new TextRun({ text: '' })] }),
      ...blocksToChildren(s.blocks),
    ],
  }));

  try {
    const doc = new Document({
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      sections: [
        { properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children: coverChildren },
        { properties: { page: { margin: { top: 1080, right: 1224, bottom: 1080, left: 1224 } } }, children: tocChildren },
        ...bodySections,
      ],
    });
    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(result.filePath, buf);
    return { ok: true, path: result.filePath };
  } catch (err) {
    console.error('[docx] generation failed:', err);
    return { ok: false, error: String(err?.message || err) };
  }
});
