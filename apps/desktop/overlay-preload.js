const { ipcRenderer, contextBridge } = require('electron');
contextBridge.exposeInMainWorld('overlayAPI', {
  setInteractive: (on) => ipcRenderer.send('overlay-interactive', on),
  closeOverlay: () => ipcRenderer.send('overlay-close'),
});
