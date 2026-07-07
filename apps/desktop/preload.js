// Camora Desktop — renderer ↔ main bridge.
// Exposes a single `camo` namespace; renderer feature-detects with `window.camo?.isDesktop`.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camo', {
  isDesktop: true,
  platform: process.platform,
  version: '2.1.0',

  // Transparent-overlay mode is opt-in (main creates the window transparent +
  // frameless only when CAMORA_OVERLAY=1). The renderer gates its custom title-
  // bar controls + overlay toggle on this so they never render over a normal
  // framed window's native traffic lights.
  overlayEnabled: process.env.CAMORA_OVERLAY === '1',

  // Permissions — both read-only status check and prompt-trigger.
  // The audio setup wizard uses these to make permission flow explicit
  // instead of failing inside getUserMedia/getDisplayMedia.
  getMediaAccessStatus: (kind) => ipcRenderer.invoke('get-media-access-status', kind),
  askForMediaAccess: (kind) => ipcRenderer.invoke('ask-for-media-access', kind),
  openSystemPrivacy: (section) => ipcRenderer.invoke('open-system-privacy', section),
  // Quit + relaunch the app. macOS only surfaces a freshly-granted
  // device to the running Chromium audio service AFTER a process
  // restart, so the audio wizard uses this once SR/Mic is granted.
  relaunch: () => ipcRenderer.invoke('relaunch-app'),

  // Screen capture — NO MODAL. NO PICKER UI. Camora hides, macOS draws
  // its own window-select cursor, user clicks the target window, capture
  // is written. Single call. Returns JPEG/PNG dataURL or null.
  captureInteractive: () => ipcRenderer.invoke('capture-interactive'),

  // Document export
  // savePdf({ html: string, filename?: string }) → { ok, path? } or { canceled: true }
  savePdf: (opts) => ipcRenderer.invoke('save-pdf', opts),
  // saveDocx({ sections: [{heading, blocks: [{type, text}]}], filename?, title? }) → same
  saveDocx: (opts) => ipcRenderer.invoke('save-docx', opts),

  // Manual on-demand HackerRank scrape — returns { ok, data?, error? }
  fetchHackerrankNow: () => ipcRenderer.invoke('hackerrank-manual-fetch'),
  // Tell main process which coding platform to watch for auto-capture.
  // platform: 'hackerrank' | 'leetcode' | 'coderpad' | 'none'
  setCodingPlatform: (platform) => ipcRenderer.invoke('set-coding-platform', platform),
  // Auto-detect push events from main process (polling or F9 screenshot)
  captureHackerrankWindow: () => ipcRenderer.invoke('capture-window-by-name', 'hackerrank'),
  onHackerrankCapture: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('hackerrank-capture-result', handler);
    return handler;
  },
  offHackerrankCapture: (handler) => {
    if (handler) ipcRenderer.removeListener('hackerrank-capture-result', handler);
    else ipcRenderer.removeAllListeners('hackerrank-capture-result');
  },
  // Notify main that OCR failed so the next poll retries the same URL.
  resetLastCaptureUrl: () => ipcRenderer.invoke('reset-last-capture-url'),

  // Get the URL of the active Chrome/Brave/Edge tab — no screenshot, no scraping.
  // Returns { ok, url, browser } so the renderer can pre-fill the URL input and auto-fetch.
  getActiveBrowserUrl: () => ipcRenderer.invoke('get-active-browser-url'),

  // Snap active browser window — captures the front Chrome/Brave/Edge window
  // and returns { ok, dataUrl } for OCR. Targets only the interview platform,
  // not the full screen.
  snapActiveBrowser: () => ipcRenderer.invoke('snap-active-browser'),
  // App-level stealth — setContentProtection(on) makes the Camora window
  // invisible to screen recording and screen share.
  setStealthMode: (on) => ipcRenderer.invoke('set-stealth-mode', on),
  // Chrome tracking neutralizer — injects JS into HackerRank to block mouse/focus detection.
  // Returns { ok, browser? } on success, { ok: false, needsDevMenu?, error } on failure.
  injectTrackingNeutralizer: () => ipcRenderer.invoke('inject-tracking-neutralizer'),

  // Per-interview session folder — routes screenshots to
  // ~/Documents/Camora/{company}/screenshots/ so captures are isolated per
  // interview. Pass the company name string; pass null to revert to ~/Desktop.
  setSessionFolder: (company) => ipcRenderer.invoke('set-session-folder', company),

  // In-app silent screenshot — captures the full screen via screencapture -x
  // and saves to the active session folder (or ~/Desktop as fallback). No macOS
  // Cmd+Shift+4 or focus change required. Returns { ok, error? }.
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),

  // Interactive window-picker screenshot — minimises app, shows macOS window
  // picker, saves to session folder (or ~/Documents/Company Interview/).
  // Returns { ok, dataUrl, filePath } — thumbnail-ready immediately.
  takeScreenshotWindow: () => ipcRenderer.invoke('take-screenshot-window'),

  // Desktop screenshot watcher — fires when user takes a macOS screenshot
  // (Cmd+Shift+3/4) while HackerRank is on screen. Renderer calls extractAndMaybeGenerate
  // on the received dataUrl, same as the F9 / auto-detect pipeline.
  onScreenshotWatcher: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('screenshot-watcher-new', handler);
    return handler;
  },
  offScreenshotWatcher: (handler) => {
    if (handler) ipcRenderer.removeListener('screenshot-watcher-new', handler);
    else ipcRenderer.removeAllListeners('screenshot-watcher-new');
  },

  // Open a file on disk with the system default app (Preview for images).
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // Transparent overlay — toggle between docked (solid, catches clicks) and
  // overlay (transparent, click-through, floats above the meeting).
  overlay: {
    // mode: 'docked' | 'overlay'
    setMode: (mode) => ipcRenderer.invoke('overlay:set-mode', mode),
    // While in overlay mode: true → the answer panel captures clicks; false →
    // clicks pass through to the meeting. Call on pointer enter/leave of the panel.
    setInteractive: (interactive) => ipcRenderer.invoke('overlay:set-interactive', interactive),
    // Fired when the global hotkey (Cmd/Ctrl+Shift+O) toggles the mode.
    onModeChanged: (callback) => {
      const handler = (_event, mode) => callback(mode);
      ipcRenderer.on('overlay:mode-changed', handler);
      return handler;
    },
    offModeChanged: (handler) => {
      if (handler) ipcRenderer.removeListener('overlay:mode-changed', handler);
      else ipcRenderer.removeAllListeners('overlay:mode-changed');
    },
  },

  // Custom title-bar controls (the window is frameless — no native buttons).
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
});
