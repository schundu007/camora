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

  // Screen capture — NO MODAL. NO PICKER UI. Camora hides, macOS draws
  // its own window-select cursor, user clicks the target window, capture
  // is written. Single call. Returns JPEG/PNG dataURL or null.
  captureInteractive: () => ipcRenderer.invoke('capture-interactive'),

  // Document export
  // savePdf({ html: string, filename?: string }) → { ok, path? } or { canceled: true }
  savePdf: (opts) => ipcRenderer.invoke('save-pdf', opts),
  // saveDocx({ sections: [{heading, blocks: [{type, text}]}], filename?, title? }) → same
  saveDocx: (opts) => ipcRenderer.invoke('save-docx', opts),
});
