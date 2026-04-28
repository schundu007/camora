// Camora Desktop — renderer ↔ main bridge.
// Exposes a single `camo` namespace; renderer feature-detects with `window.camo?.isDesktop`.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camo', {
  isDesktop: true,
  platform: process.platform,
  version: '2.0.0',

  // Permissions
  getMediaAccessStatus: (kind) => ipcRenderer.invoke('get-media-access-status', kind),
  openSystemPrivacy: (section) => ipcRenderer.invoke('open-system-privacy', section),

  // Screen capture — single call, no modal. macOS draws its own
  // window-select cursor; user clicks the target window. Resolves to
  // a PNG dataURL or null (Escape/permission denied).
  captureInteractive: () => ipcRenderer.invoke('capture-interactive'),

  // Document export
  // savePdf({ html: string, filename?: string }) → { ok, path? } or { canceled: true }
  savePdf: (opts) => ipcRenderer.invoke('save-pdf', opts),
  // saveDocx({ sections: [{heading, blocks: [{type, text}]}], filename?, title? }) → same
  saveDocx: (opts) => ipcRenderer.invoke('save-docx', opts),
});
