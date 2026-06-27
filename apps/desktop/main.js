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
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }
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
  // Match Zustand default — isStealthActive starts true, so protect on launch.
  mainWindow.setContentProtection(true);

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      saveWindowState(mainWindow);
      mainWindow.hide();
    }
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

  // Guard: `activate` may have already created the window if the user
  // clicked the Dock while the async cache-clear / mic-prompt was running.
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();

  // Start auto-detecting HackerRank in the browser (macOS only via AppleScript)
  startHackerrankAutoDetect();

  // Watch ~/Desktop for new macOS screenshots (Cmd+Shift+3/4).
  if (process.platform === 'darwin') startDesktopScreenshotWatcher();

  globalShortcut.register('CommandOrControl+B', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
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
    // Block the 3s auto-detect poll from running concurrently so both paths
    // don't send separate hackerrank-capture-result events to the renderer.
    if (_scrapeInProgress) return;
    _scrapeInProgress = true;
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
    } finally {
      _scrapeInProgress = false;
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
  if (_desktopWatchTimer) clearInterval(_desktopWatchTimer);
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
    // 8 s hard timeout — a hung osascript blocks the IPC handler thread and
    // makes the app appear frozen to the renderer. Kill the child and reject.
    const killTimer = setTimeout(() => {
      proc.kill();
      reject(new Error('osascript timed out after 8 s'));
    }, 8000);
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('close', code => {
      clearTimeout(killTimer);
      if (code === 0) resolve(out.trim());
      else reject(new Error(err.trim() || `osascript exited ${code}`));
    });
    proc.stdin.write(script);
    proc.stdin.end();
  });
}

const BROWSERS = ['Google Chrome', 'Brave Browser', 'Microsoft Edge', 'Arc'];

async function getActiveBrowserInfo() {
  // First pass: search all windows of all browsers for a platform-matching URL.
  // This prevents accidentally snapping a "focus-stolen" non-platform window
  // when the user has multiple browser windows across monitors.
  const platformPatterns = [
    /hackerrank\.com\/challenges\//,
    /hackerrank\.com\/contests\//,
    /leetcode\.com\/problems\//,
    /coderpad\.io\//,
    /codepair\./,
    /codesignal\.com\//,
    /glider\.ai\//,
  ];

  for (const browser of BROWSERS) {
    try {
      // Get ALL windows (not just front) and check each tab's URL
      const result = await runAppleScript(`
tell application "${browser}"
  set output to ""
  set winCount to count of windows
  repeat with w from 1 to winCount
    try
      set u to URL of active tab of window w
      set t to name of window w
      set output to output & u & "|||" & t & "|||WINSEP|||"
    end try
  end repeat
  return output
end tell`);
      if (!result) continue;
      const entries = result.split('|||WINSEP|||').filter(Boolean);
      for (const entry of entries) {
        const sep = entry.indexOf('|||');
        const url = sep >= 0 ? entry.slice(0, sep).trim() : entry.trim();
        const windowTitle = sep >= 0 ? entry.slice(sep + 3).trim() : '';
        if (url && platformPatterns.some(p => p.test(url))) {
          return { browser, url, windowTitle };
        }
      }
    } catch {}
  }

  // Second pass: fall back to the front window of the first available browser.
  for (const browser of BROWSERS) {
    try {
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
let _codingPlatform = 'auto';
// Prevents the auto-detect poll from racing with a manual fetch triggered
// by the URL chip. The poll checks this before starting a scrape.
let _scrapeInProgress = false;

const PLATFORM_URL_MATCH = {
  hackerrank: (url) => url.includes('hackerrank.com') &&
    !/hackerrank\.com\/(dashboard|settings|profile|notifications|jobs|companies|login|signup)/.test(url),
  leetcode: (url) => url.includes('leetcode.com/problems/'),
  coderpad: (url) => url.includes('coderpad.io/'),
  codesignal: (url) => url.includes('codesignal.com/'),
  glider: (url) => url.includes('glider.ai/'),
};

// Injects JS to extract the starter/template code from the active platform's
// code editor (CodeMirror on HackerRank, Monaco on LeetCode). Returns the
// verbatim editor content so the backend can thread it into the prompt and
// generate a solution that fills in the function body without rewriting
// the input-reading boilerplate (e.g. HackerRank's readarray + wrapper call).
async function extractStarterCodeFromBrowser(browser, url) {
  if (!url.includes('hackerrank.com') && !url.includes('leetcode.com') && !url.includes('coderpad.io') && !url.includes('codesignal.com') && !url.includes('glider.ai')) return null;
  const js = `(function(){
    try{var cm=document.querySelector('.CodeMirror');if(cm&&cm.CodeMirror){var v=cm.CodeMirror.getValue();if(v&&v.trim().length>10)return v;}}catch(e){}
    try{if(window.monaco){var m=window.monaco.editor.getModels();if(m&&m.length>0){var v=m[0].getValue();if(v&&v.trim().length>10)return v;}}}catch(e){}
    try{var iframes=document.querySelectorAll('iframe');for(var fi=0;fi<iframes.length;fi++){try{var fw=iframes[fi].contentWindow;if(fw&&fw.monaco){var fm=fw.monaco.editor.getModels();if(fm&&fm.length>0){var fv=fm[0].getValue();if(fv&&fv.trim().length>10)return fv;}}}catch(e){}}}catch(e){}
    try{var ls=document.querySelectorAll('.CodeMirror-line');if(ls.length>2){var t=Array.from(ls).map(function(l){return l.innerText||'';}).join('\\n');if(t.trim().length>10)return t;}}catch(e){}
    try{var ed=document.querySelector('[class*="editor"] textarea,[class*="Editor"] textarea');if(ed&&ed.value&&ed.value.trim().length>10)return ed.value;}catch(e){}
    return null;
  })()`;
  const escapedJs = js.replace(/"/g, '\\"');
  const urlFragment = url.includes('hackerrank') ? 'hackerrank' : url.includes('leetcode') ? 'leetcode' : url.includes('codesignal') ? 'codesignal' : url.includes('glider') ? 'glider' : 'coderpad';
  try {
    const raw = await runAppleScript(`
tell application "${browser}"
  set winCount to count of windows
  repeat with w from 1 to winCount
    try
      set tabUrl to URL of active tab of window w
      if tabUrl contains "${urlFragment}" then
        set r to execute active tab of window w javascript "${escapedJs}"
        if r is missing value then return ""
        return r as string
      end if
    end try
  end repeat
  return ""
end tell`);
    const code = (raw || '').trim();
    return code.length > 10 ? code : null;
  } catch (err) {
    console.log('[dom-extract] starter code extraction failed:', err.message);
    return null;
  }
}

// Injects a JS IIFE into the active browser tab via AppleScript and returns
// the full problem text from the DOM — bypasses viewport limits and HackerRank's
// copy-paste restrictions entirely. Falls back to null on any failure.
async function extractProblemTextFromBrowser(browser, url) {
  let jsCode;
  if (url.includes('hackerrank.com')) {
    // Extract ONLY the problem description — explicitly exclude the code editor.
    // HackerRank renders the problem on the left and Monaco/CodeMirror on the right.
    // Using single quotes throughout so no " escaping is needed inside the AppleScript string.
    // Helper to strip editor elements from a cloned node and return its text.
    // Written as a function string embedded in the IIFE — no newlines, single quotes only.
    jsCode = "(function(){" +
      "function strip(node){var c=node.cloneNode(true);c.querySelectorAll('.monaco-editor,.CodeMirror,[class*=\"editor\"],[class*=\"Editor\"],script,style').forEach(function(x){if(x.parentNode)x.parentNode.removeChild(x);});return(c.innerText||c.textContent||'').trim();}" +
      // Strategy 1: find a parent container that has MULTIPLE problem sections (all 3 pages).
      // Walk up from the first matched description element until we find a node with ≥2 section markers.
      "var anchor=document.querySelector('.challenge-description-body,.hackdown-content,.problem-statement,[class*=\"challenge-description\"],[class*=\"challengeDescription\"]');" +
      "if(anchor){" +
        "var node=anchor;" +
        "for(var k=0;k<8;k++){" +
          "var p=node.parentElement;" +
          "if(!p||p===document.body||p===document.documentElement)break;" +
          "var subs=p.querySelectorAll('.hackdown-content,.challenge-constraints,.challenge-sample-input,.challenge-sample-output,.challenge-input-format,[class*=\"constraints\"],[class*=\"sampleInput\"],[class*=\"inputFormat\"]');" +
          "if(subs.length>=2){var t=strip(p);if(t.length>200)return t.slice(0,25000);}" +
          "node=p;" +
        "}" +
        // Parent walk didn't find multi-section container — return anchor's parent text
        "var t=strip(anchor.parentElement||anchor);if(t.length>80)return t.slice(0,25000);" +
      "}" +
      // Strategy 2: top-level left-panel containers
      "var panels=['.challenge-tab-body','.challenge-view','.content-body','[class*=\"challenge-tab\"]','[class*=\"challenge-view\"]','[class*=\"challengeView\"]'];" +
      "for(var i=0;i<panels.length;i++){try{var e=document.querySelector(panels[i]);if(e){var t=strip(e);if(t.length>200)return t.slice(0,25000);}}catch(x){}}" +
      "return null;" +
    "})()";

  } else if (url.includes('leetcode.com')) {
    jsCode = `(function(){var ss=['[data-track-load="description_content"]','.elfjS','.description__24sA'];for(var i=0;i<ss.length;i++){var e=document.querySelector(ss[i]);if(e&&e.innerText&&e.innerText.trim().length>50)return e.innerText.trim();}return null;})()`;
  } else if (url.includes('coderpad.io')) {
    jsCode = `(function(){var ss=['.instructions-pane','[class*="instructions"]'];for(var i=0;i<ss.length;i++){var e=document.querySelector(ss[i]);if(e&&e.innerText&&e.innerText.trim().length>50)return e.innerText.trim();}return null;})()`;
  } else if (url.includes('codesignal.com')) {
    jsCode = `(function(){var ss=['[class*="task-description"]','[class*="taskDescription"]','[class*="problem-description"]','[class*="problemDescription"]','[data-testid*="description"]','[class*="instructions"]'];for(var i=0;i<ss.length;i++){var e=document.querySelector(ss[i]);if(e&&e.innerText&&e.innerText.trim().length>50)return e.innerText.trim();}return null;})()`;
  } else if (url.includes('glider.ai')) {
    jsCode = `(function(){var ss=['[class*="question-text"]','[class*="problem-statement"]','[class*="questionText"]','[class*="description"]','[class*="question"]'];for(var i=0;i<ss.length;i++){var e=document.querySelector(ss[i]);if(e&&e.innerText&&e.innerText.trim().length>50)return e.innerText.trim();}return null;})()`;
  } else {
    return null;
  }
  // Escape for AppleScript string embedding: quotes AND newlines/tabs.
  const escapedJs = jsCode.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ');
  // Search ALL windows of the browser for a tab whose URL contains the platform,
  // then inject into THAT tab — not just the front window (which may be Camora after clicking URL chip).
  const urlFragment = url.includes('hackerrank') ? 'hackerrank' : url.includes('leetcode') ? 'leetcode' : url.includes('codesignal') ? 'codesignal' : url.includes('glider') ? 'glider' : 'coderpad';
  try {
    const raw = await runAppleScript(`
tell application "${browser}"
  set winCount to count of windows
  repeat with w from 1 to winCount
    try
      set tabUrl to URL of active tab of window w
      if tabUrl contains "${urlFragment}" then
        set r to execute active tab of window w javascript "${escapedJs}"
        if r is missing value then return ""
        return r as string
      end if
    end try
  end repeat
  return ""
end tell`);
    const text = (raw || '').trim();
    return text.length > 50 ? text : null;
  } catch (err) {
    console.log('[dom-extract] AppleScript JS injection failed:', err.message);
    return null;
  }
}

// Detects if the problem container in the active browser tab has more scrollable
// content below the visible area. Used by multi-page SNAP to know when to stop.
async function checkHasMoreContent(browser) {
  const js = `(function(){
    var ss=['.challenge-description-body','.problem-statement','[class*="problem-description"]','[class*="problemDescription"]'];
    for(var i=0;i<ss.length;i++){
      var el=document.querySelector(ss[i]);
      if(!el)continue;
      var p=el;
      while(p&&p!==document.body){
        var st=getComputedStyle(p);
        if(st.overflowY==='auto'||st.overflowY==='scroll'){
          return (p.scrollHeight-p.scrollTop-p.clientHeight)>50;
        }
        p=p.parentElement;
      }
    }
    return (document.body.scrollHeight-window.scrollY-window.innerHeight)>100;
  })()`;
  const escapedJs = js.replace(/"/g, '\\"');
  try {
    const raw = await runAppleScript(`tell application "${browser}"
  set r to execute active tab of front window javascript "${escapedJs}"
  if r is missing value then return "false"
  return r as string
end tell`);
    return raw.trim() === 'true';
  } catch {
    return false;
  }
}

// Scrolls the problem container down by ~75% of its visible height.
async function scrollDownProblem(browser) {
  const js = `(function(){
    var ss=['.challenge-description-body','.problem-statement','[class*="problem-description"]','[class*="problemDescription"]'];
    for(var i=0;i<ss.length;i++){
      var el=document.querySelector(ss[i]);
      if(!el)continue;
      var p=el;
      while(p&&p!==document.body){
        var st=getComputedStyle(p);
        if(st.overflowY==='auto'||st.overflowY==='scroll'){
          p.scrollBy(0,Math.floor(p.clientHeight*0.75));
          return true;
        }
        p=p.parentElement;
      }
    }
    window.scrollBy(0,Math.floor(window.innerHeight*0.75));
    return true;
  })()`;
  const escapedJs = js.replace(/"/g, '\\"');
  try {
    await runAppleScript(`tell application "${browser}"
  execute active tab of front window javascript "${escapedJs}"
end tell`);
  } catch {}
}

async function doHackerrankScrape() {
  const info = await getActiveBrowserInfo();
  if (!info) return { ok: false, error: 'No browser window found. Open Chrome/Brave with HackerRank.' };
  const { url, windowTitle, browser } = info;
  console.log('[hr-auto] active browser URL:', url, '| window title:', windowTitle);

  // Bug fix: _codingPlatform='auto' had no entry in PLATFORM_URL_MATCH → always failed.
  // When auto, accept any supported platform URL.
  const anyPlatformMatch = Object.values(PLATFORM_URL_MATCH).some(fn => fn(url));
  if (!anyPlatformMatch) {
    return { ok: false, error: `Active tab is not a supported coding platform.\nCurrent URL: ${url}` };
  }

  // Try DOM text extraction first — gets the full problem regardless of scroll position.
  // Requires "Allow JavaScript from Apple Events" in Chrome Develop menu.
  const text = await extractProblemTextFromBrowser(browser, url);
  if (text) {
    console.log('[hr-auto] DOM text extraction succeeded, len=' + text.length);
    const starterCode = await extractStarterCodeFromBrowser(browser, url);
    _lastHrUrl = url;
    return { ok: true, text, starterCode, url };
  }

  // DOM extraction failed — fall back to a single screenshot of the browser window.
  console.log('[hr-auto] DOM extraction failed, falling back to single screenshot');
  const dataUrl = await captureExactBrowserWindow(windowTitle);
  if (dataUrl) return { ok: true, dataUrl, url };
  return { ok: false, error: 'Could not extract the problem text. Make sure the HackerRank tab is visible and try again.' };
}

// Capture a specific browser window by matching its EXACT title from AppleScript.
// Never falls back to non-browser windows (no VS Code / Terminal / other apps).
// Prefers windows on the same monitor as the Camora app window.
async function captureExactBrowserWindow(windowTitle) {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 2560, height: 1600 },
  });

  // Determine which display Camora is on so we can prefer same-monitor sources.
  // desktopCapturer sources carry display_id (CGDirectDisplayID as string on macOS).
  // electronScreen display IDs are numbers — convert to string for comparison.
  const camoraDisplay = mainWindow && !mainWindow.isDestroyed()
    ? electronScreen.getDisplayMatching(mainWindow.getBounds())
    : null;
  const camoraDisplayId = camoraDisplay ? String(camoraDisplay.id) : null;

  // Sort so same-monitor sources float to the top; cross-monitor sources kept as fallback.
  const sorted = camoraDisplayId
    ? [...sources].sort((a, b) => {
        const aMatch = a.display_id === camoraDisplayId ? 0 : 1;
        const bMatch = b.display_id === camoraDisplayId ? 0 : 1;
        return aMatch - bMatch;
      })
    : sources;

  console.log('[capture] windows (same-monitor first):', sorted.map(s => `${s.name}[${s.display_id}]`));

  let target = null;

  // Strategy 1: source name starts with AppleScript window title (e.g. "Interview | Bash: Pattern Matching")
  // desktopCapturer appends " - Google Chrome" so we use startsWith rather than strict equality
  if (windowTitle) {
    target = sorted.find(s => s.name.startsWith(windowTitle) || windowTitle.startsWith(s.name));
  }

  // Strategy 2: "hackerrank" anywhere in title (main HR pages, not codepair)
  if (!target) {
    target = sorted.find(s => s.name.toLowerCase().includes('hackerrank'));
  }

  // Strategy 3: codepair title format — "Interview | ..." in a browser window
  if (!target) {
    target = sorted.find(s =>
      /^interview\s*\|/i.test(s.name) &&
      /Google Chrome|Brave|Firefox|Safari|Microsoft Edge|Arc/i.test(s.name)
    );
  }

  // Strategy 4: any browser window not Camora (but NOT a catch-all — must be a known browser)
  if (!target) {
    target = sorted.find(s =>
      /Google Chrome|Brave Browser|Firefox|Safari|Microsoft Edge|Arc/i.test(s.name) &&
      !/Camora/i.test(s.name)
    );
  }

  // No further fallback — better to fail loudly than capture VS Code / Terminal
  console.log('[capture] selected:', target?.name ?? 'none', target?.display_id ? `[display ${target.display_id}]` : '');
  if (!target) return null;

  const thumbnail = target.thumbnail;
  if (!thumbnail || thumbnail.isEmpty()) {
    const cgWindowId = target.id.split(':')[1] ?? null;
    if (cgWindowId) {
      const fallbackUrl = await captureWindowByIdFallback(cgWindowId);
      if (fallbackUrl) return fallbackUrl;
    }
    return null;
  }

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

async function captureWindowByIdFallback(cgWindowId) {
  const tmpFile = path.join(os.tmpdir(), `camora-win-${cgWindowId}-${Date.now()}.png`);
  return new Promise((resolve) => {
    execFile('/usr/sbin/screencapture', ['-l', cgWindowId, '-o', '-x', tmpFile], (err) => {
      if (err) {
        try { fs.unlinkSync(tmpFile); } catch {}
        resolve(null);
        return;
      }
      try {
        const buf = fs.readFileSync(tmpFile);
        try { fs.unlinkSync(tmpFile); } catch {}
        if (buf.length < 5000) { resolve(null); return; } // blank/empty file guard
        const MAX_BASE64 = 4_800_000;
        const base64Size = (b) => Math.ceil(b.length / 3) * 4;
        let finalBuf = buf;
        let mime = 'png';
        if (base64Size(buf) > MAX_BASE64) {
          let img = nativeImage.createFromBuffer(buf);
          img = img.resize({ width: Math.min(img.getSize().width, 1920), quality: 'best' });
          finalBuf = img.toPNG();
          if (base64Size(finalBuf) > MAX_BASE64) {
            finalBuf = img.toJPEG(85);
            mime = 'jpeg';
          }
        }
        resolve(`data:image/${mime};base64,${finalBuf.toString('base64')}`);
      } catch {
        try { fs.unlinkSync(tmpFile); } catch {}
        resolve(null);
      }
    });
  });
}

function startHackerrankAutoDetect() {
  if (process.platform !== 'darwin') return;

  const poll = async () => {
    try {
      // Skip if no platform selected, Screen Recording not granted, or manual fetch running
      if (_codingPlatform === 'none') return;
      if (_scrapeInProgress) return;
      if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') return;
      const info = await getActiveBrowserInfo();
      if (!info) return;
      const { url } = info;
      // Never auto-detect codepair sessions — these are live interviews where
      // the user is the interviewer, not a candidate solving a problem.
      if (url.includes('hackerrank.com/codepair') || url.includes('codepair.hackerrank.com')) return;
      let matched = false;
      if (_codingPlatform === 'auto') {
        matched = Object.values(PLATFORM_URL_MATCH).some(fn => fn(url));
      } else {
        const matchFn = PLATFORM_URL_MATCH[_codingPlatform];
        matched = !!(matchFn && matchFn(url));
      }
      if (!matched) return;
      if (url === _lastHrUrl) return; // already processed successfully — don't re-fire
      console.log('[hr-auto] HackerRank detected, scraping:', url);
      _scrapeInProgress = true;
      try {
        // Settle time so the page DOM is ready after navigation
        await new Promise(r => setTimeout(r, 2000));
        const result = await doHackerrankScrape();
        if (!result.ok) {
          console.error('[hr-auto] scrape failed:', result.error);
          return; // _lastHrUrl NOT set — will retry next poll
        }
        // _lastHrUrl is set inside doHackerrankScrape on success
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Send whichever payload doHackerrankScrape produced.
          // DOM extraction returns { text, url }; single-page screenshot returns { dataUrl, url };
          // multi-page screenshot returns { dataUrls, url }.
          mainWindow.webContents.send('hackerrank-capture-result', {
            dataUrl: result.dataUrl,
            dataUrls: result.dataUrls,
            text: result.text,
            starterCode: result.starterCode,
            url: result.url,
          });
        }
      } finally {
        _scrapeInProgress = false;
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
// null = fall back to ~/Desktop; set via 'set-session-folder' IPC when a
// company interview session is active so captures are stored per-interview.
let _sessionFolder = null;
let _watchedFolder = null; // tracks which folder is currently being polled
let _desktopWatchTimer = null;

function startDesktopScreenshotWatcher() {
  const desktopPath = path.join(os.homedir(), 'Desktop');

  // Seed Desktop so we don't fire on pre-existing screenshots at launch.
  try {
    const existing = fs.readdirSync(desktopPath)
      .filter(f => /^Screenshot.*\.(png|jpg|jpeg)$/i.test(f));
    existing.forEach(f => _desktopKnownFiles.add(f));
    _watchedFolder = desktopPath;
    console.log(`[screenshot-watcher] seeded ${_desktopKnownFiles.size} existing screenshots, polling ${desktopPath}`);
  } catch (err) {
    console.warn('[screenshot-watcher] could not read Desktop:', err.message);
    return;
  }

  _desktopWatchTimer = setInterval(() => {
    try {
      const watchFolder = _sessionFolder || desktopPath;

      // Re-seed when the active folder changes (new session started / cleared).
      if (watchFolder !== _watchedFolder) {
        _watchedFolder = watchFolder;
        _desktopKnownFiles = new Set();
        try {
          fs.mkdirSync(watchFolder, { recursive: true });
          const existing = fs.readdirSync(watchFolder)
            .filter(f => /\.(png|jpg|jpeg)$/i.test(f));
          existing.forEach(f => _desktopKnownFiles.add(f));
          console.log(`[screenshot-watcher] switched to ${watchFolder}, seeded ${_desktopKnownFiles.size} files`);
        } catch {}
      }

      // Session folder: accept any image (we control what lands there).
      // Desktop fallback: only "Screenshot …" files created by macOS / our Snap.
      const isSession = watchFolder !== desktopPath;
      const files = fs.readdirSync(watchFolder)
        .filter(f => isSession
          ? /\.(png|jpg|jpeg)$/i.test(f)
          : /^Screenshot.*\.(png|jpg|jpeg)$/i.test(f));

      for (const filename of files) {
        if (_desktopKnownFiles.has(filename)) continue;
        _desktopKnownFiles.add(filename);
        const filepath = path.join(watchFolder, filename);
        // Wait 1 s for screencapture to finish writing before reading.
        setTimeout(() => {
          try {
            const buf = fs.readFileSync(filepath);
            if (buf.length < 50000) return; // skip tiny/corrupt files
            _lastDesktopScreenshot = filepath;

            // Anthropic vision rejects base64 > 5 MB. Retina screens produce
            // 4–8 MB PNGs. Resize before sending, same logic as capture-interactive.
            const MAX_BASE64 = 4_800_000;
            const base64Size = (b) => Math.ceil(b.length / 3) * 4;
            let finalBuf = buf;
            let mime = /\.(jpg|jpeg)$/i.test(filename) ? 'jpeg' : 'png';
            if (base64Size(buf) > MAX_BASE64) {
              let img = nativeImage.createFromBuffer(buf);
              const targetW = Math.min(img.getSize().width, 1920);
              img = img.resize({ width: targetW, quality: 'best' });
              finalBuf = img.toPNG();
              if (base64Size(finalBuf) > MAX_BASE64) {
                finalBuf = img.toJPEG(85);
                mime = 'jpeg';
              }
              console.info(`[screenshot-watcher] resized to ${img.getSize().width}px ${mime}, ${finalBuf.length} bytes`);
            }

            const dataUrl = `data:image/${mime};base64,${finalBuf.toString('base64')}`;
            console.log('[screenshot-watcher] new screenshot:', filename, `(${Math.round(buf.length / 1024)} KB raw)`);
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
  return { ok: false, error: 'No supported browser found. Open Chrome or Brave with the coding platform active.' };
});

// Renderer tells us which coding platform to watch.
ipcMain.handle('set-coding-platform', (_event, platform) => {
  _codingPlatform = platform || 'auto';
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
  // Block the auto-detect poll while we scrape so they don't race.
  _scrapeInProgress = true;
  try {
    return await doHackerrankScrape();
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    _scrapeInProgress = false;
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
  if (!thumbnail || thumbnail.isEmpty()) {
    const cgWindowId = target.id.split(':')[1] ?? null;
    if (cgWindowId) {
      const fallbackUrl = await captureWindowByIdFallback(cgWindowId);
      if (fallbackUrl) return fallbackUrl;
    }
    return null;
  }

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

// ── IPC: snap active browser window ────────────────────────────────────────
// Captures the front Chrome/Brave/Edge/Arc window and returns a dataUrl.
// Used by behavioral Snap so it targets the interview platform window
// (HackerRank, Zoom, Teams, etc.) instead of the full screen.
// Return the URL of the active Chrome/Brave/Edge tab — no screenshot, no scraping.
// Renderer uses this to pre-fill the URL input and auto-fetch the problem.
ipcMain.handle('get-active-browser-url', async () => {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only' };
  try {
    const info = await getActiveBrowserInfo();
    if (!info) return { ok: false, error: 'No browser window found.' };
    return { ok: true, url: info.url, browser: info.browser };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to get browser URL' };
  }
});

ipcMain.handle('snap-active-browser', async () => {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only' };
  const screenStatus = systemPreferences.getMediaAccessStatus('screen');
  if (screenStatus !== 'granted') {
    return { ok: false, needsScreenPermission: true, error: 'Screen Recording permission required.' };
  }
  try {
    const info = await getActiveBrowserInfo();
    if (!info) return { ok: false, error: 'No browser window found. Make sure Chrome/Brave/Edge is open.' };
    const dataUrl = await captureExactBrowserWindow(info.windowTitle);
    if (!dataUrl) return { ok: false, error: 'Could not capture the browser window. Make sure it is visible and not minimised.' };
    // Save to session folder (~/Documents/Camora/{company}/screenshots/) so
    // the user can click the thumbnail to open it in Preview/Finder.
    let filePath = null;
    try {
      const folder = _sessionFolder || path.join(os.homedir(), 'Documents', 'Camora', 'screenshots');
      fs.mkdirSync(folder, { recursive: true });
      const ext = dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
      const filename = `snap-${Date.now()}.${ext}`;
      filePath = path.join(folder, filename);
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } catch (saveErr) {
      console.log('[snap] save to disk failed:', saveErr.message);
    }
    return { ok: true, dataUrl, filePath };
  } catch (err) {
    return { ok: false, error: err?.message || 'Capture failed' };
  }
});

// Open a file on disk using the system default app (Preview for images).
ipcMain.handle('open-file', async (_event, filePath) => {
  if (!filePath || typeof filePath !== 'string') return { ok: false };
  try {
    await shell.openPath(filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
});

// ── IPC: app-level stealth (content protection) ────────────────────────────
// setContentProtection(true) makes the Camora window invisible to screen
// recording and screen share — the window appears black in any capture.
// on=true → stealth active; on=false → back to normal.
ipcMain.handle('set-stealth-mode', (_event, on) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setContentProtection(!!on);
  }
});

// ── IPC: per-interview session folder ──────────────────────────────────────
// Called by the renderer when company context becomes known (e.g. NVIDIA).
// Creates ~/Documents/Camora/{company}/screenshots/ and redirects the watcher
// there so only screenshots from the active interview are processed.
// Pass null/'' to clear the session and fall back to ~/Desktop.
ipcMain.handle('set-session-folder', (_event, company) => {
  if (!company || typeof company !== 'string' || !company.trim()) {
    _sessionFolder = null;
    console.log('[screenshot-watcher] session folder cleared, reverting to ~/Desktop');
    return { ok: true, folder: null };
  }
  const safe = company.trim().replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  const folder = path.join(os.homedir(), 'Documents', 'Camora', safe, 'screenshots');
  try {
    fs.mkdirSync(folder, { recursive: true });
    _sessionFolder = folder;
    console.log('[screenshot-watcher] session folder set:', folder);
    return { ok: true, folder };
  } catch (err) {
    console.error('[set-session-folder] failed:', err.message);
    return { ok: false, error: err.message };
  }
});

// ── IPC: in-app screenshot trigger ─────────────────────────────────────────
// Runs screencapture -x (silent, no UI, no sound) on the full screen and saves
// to the active session folder (~/Documents/Camora/{company}/screenshots/) or
// ~/Desktop as fallback. The watcher picks it up automatically for OCR + solve.
ipcMain.handle('take-screenshot', async () => {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only' };
  try {
    const watchFolder = _sessionFolder || path.join(os.homedir(), 'Desktop');
    if (_sessionFolder) fs.mkdirSync(_sessionFolder, { recursive: true });
    // Session folder: plain name (all images accepted by watcher).
    // Desktop fallback: "Screenshot …" prefix so the watcher regex matches.
    const filename = _sessionFolder
      ? `screenshot-${Date.now()}.png`
      : `Screenshot camora-${Date.now()}.png`;
    const dest = path.join(watchFolder, filename);
    await new Promise((resolve) => {
      execFile('/usr/sbin/screencapture', ['-x', dest], () => resolve());
    });
    return { ok: true };
  } catch (err) {
    console.error('[take-screenshot] failed:', err);
    return { ok: false, error: String(err?.message || err) };
  }
});

// ── IPC: window-picker screenshot for problem capture ──────────────────────
// Interactive screencapture -W lets the user click any open window.
// Saved to session folder (or ~/Documents/Company Interview/ as fallback).
// Returns { ok, dataUrl, filePath } so renderer shows a thumbnail immediately.
ipcMain.handle('take-screenshot-window', async () => {
  if (process.platform !== 'darwin') return { ok: false, error: 'macOS only' };
  const folder = _sessionFolder || path.join(os.homedir(), 'Documents', 'Company Interview');
  try {
    fs.mkdirSync(folder, { recursive: true });
    const filename = `problem-${Date.now()}.png`;
    const dest = path.join(folder, filename);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
    await new Promise((resolve, reject) => {
      execFile('/usr/sbin/screencapture', ['-W', dest], (err) => {
        if (err) reject(err); else resolve();
      });
    });
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.restore(); mainWindow.focus(); }
    }, 400);
    const buf = fs.readFileSync(dest);
    return { ok: true, dataUrl: `data:image/png;base64,${buf.toString('base64')}`, filePath: dest };
  } catch (err) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.restore(); mainWindow.focus(); }
    }, 400);
    console.error('[take-screenshot-window] failed:', err);
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
  const xmlSafe = (s) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
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
