// Camora Desktop — renderer ↔ main bridge.
// Exposes a single `camo` namespace; renderer feature-detects with `window.camo?.isDesktop`.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camo', {
  isDesktop: true,
  platform: process.platform,
  version: '2.1.0',

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
    ipcRenderer.on('hackerrank-capture-result', (_event, data) => callback(data));
  },
  offHackerrankCapture: () => {
    ipcRenderer.removeAllListeners('hackerrank-capture-result');
  },
  // Notify main that OCR failed so the next poll retries the same URL.
  resetLastCaptureUrl: () => ipcRenderer.invoke('reset-last-capture-url'),

  // Stealth mode — injects JS into Chrome to neutralize HackerRank's mouse/focus tracking.
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

  // Desktop screenshot watcher — fires when user takes a macOS screenshot
  // (Cmd+Shift+3/4) while HackerRank is on screen. Renderer calls extractAndMaybeGenerate
  // on the received dataUrl, same as the F9 / auto-detect pipeline.
  onScreenshotWatcher: (callback) => {
    ipcRenderer.on('screenshot-watcher-new', (_event, data) => callback(data));
  },
  offScreenshotWatcher: () => {
    ipcRenderer.removeAllListeners('screenshot-watcher-new');
  },
});
