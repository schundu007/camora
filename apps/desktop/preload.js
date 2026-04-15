const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('camo', {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  getAppVersion: () => ipcRenderer.invoke('get-version'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
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
