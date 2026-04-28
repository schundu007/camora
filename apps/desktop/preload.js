const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camo', {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  getAppVersion: () => ipcRenderer.invoke('get-version'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  // Return current macOS permission status so the audio wizard can
  // show actionable guidance without first having to fail a
  // getUserMedia call. 'not-determined' | 'granted' | 'denied'
  // | 'restricted' | 'unknown'.
  getMediaAccessStatus: (kind) => ipcRenderer.invoke('get-media-access-status', kind),
  // Trigger the macOS permission prompt for the given kind. Resolves
  // true if granted or the permission was already granted, false
  // otherwise. macOS only prompts once — subsequent calls return the
  // remembered answer immediately.
  askForMediaAccess: (kind) => ipcRenderer.invoke('ask-for-media-access', kind),
  // Open the macOS Privacy & Security panel directly to the right
  // section so the user doesn't have to dig through System Settings.
  openSystemPrivacy: (section) => ipcRenderer.invoke('open-system-privacy', section),
  // Quit + relaunch. macOS only surfaces a freshly-granted device to
  // the running Chromium audio service after a process restart, so the
  // wizard uses this when TCC says 'granted' but getUserMedia 404s.
  relaunch: () => ipcRenderer.invoke('relaunch-app'),
  // List of capturable windows + screens. Returns [{id, name, kind}]
  // with NO thumbnails so the IPC is near-instant — the picker opens
  // immediately with window titles.
  listCaptureSources: () => ipcRenderer.invoke('list-capture-sources'),
  // Capture the chosen source at full native resolution, returns PNG
  // dataURL. Bypasses Chromium's video pipeline.
  captureSourceImage: (sourceId) => ipcRenderer.invoke('capture-source-image', sourceId),
  onUpdateAvailable: (cb) => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.on('update-available', (_, info) => cb(info));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.on('update-downloaded', (_, info) => cb(info));
  },
  onNavigate: (cb) => {
    ipcRenderer.removeAllListeners('navigate');
    ipcRenderer.on('navigate', (_, urlPath) => cb(urlPath));
  },
});
