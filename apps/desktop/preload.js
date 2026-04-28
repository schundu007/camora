// Camora Desktop — renderer ↔ main bridge.
// Exposes a single `camo` namespace; renderer feature-detects with `window.camo?.isDesktop`.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camo', {
  isDesktop: true,
  platform: process.platform,
  version: '2.0.0',

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

  // Screen capture — in-app window picker UX.
  // listWindows() → [{id, name, kind}] for the renderer's picker.
  // captureWindow(id) → JPEG dataURL (auto-downscaled to <5 MB) or null.
  listWindows: () => ipcRenderer.invoke('list-windows'),
  captureWindow: (sourceId) => ipcRenderer.invoke('capture-window', sourceId),

  // Document export
  // savePdf({ html: string, filename?: string }) → { ok, path? } or { canceled: true }
  savePdf: (opts) => ipcRenderer.invoke('save-pdf', opts),
  // saveDocx({ sections: [{heading, blocks: [{type, text}]}], filename?, title? }) → same
  saveDocx: (opts) => ipcRenderer.invoke('save-docx', opts),
});
