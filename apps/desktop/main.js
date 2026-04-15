const { app, BrowserWindow, globalShortcut, systemPreferences, session, shell, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTray } = require('./tray');

// ── Config ───────────────────────────────────────────────────────────────────
const APP_URL = process.env.CAMORA_URL || 'https://camora.cariara.com';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

// ── Single Instance Lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

// ── State ────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;
let crashCount = 0;

// ── Window State Persistence ─────────────────────────────────────────────────
function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return { width: 1400, height: 900 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  const isMaximized = win.isMaximized();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...bounds, isMaximized }), 'utf8');
}

// ── Create Window ────────────────────────────────────────────────────────────
function createWindow() {
  const state = loadWindowState();
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#0D0C14',
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    titleBarOverlay: !isMac ? { color: '#0D0C14', symbolColor: '#6366f1', height: 36 } : undefined,
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      spellcheck: true,
    },
  });

  if (state.isMaximized) mainWindow.maximize();

  mainWindow.loadURL(APP_URL);

  // Show when ready (avoid white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Inject CSS to avoid traffic light overlap on macOS
  if (isMac) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.insertCSS(`
        header:first-of-type > div:first-child { padding-left: 72px !important; }
        .lumora-app-bg > header:first-child > div:first-child { padding-left: 72px !important; }
      `).catch(() => {});
    });
  }

  // Save state on resize/move (debounced)
  let saveTimeout;
  ['resize', 'move'].forEach(evt => {
    mainWindow.on(evt, () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveWindowState(mainWindow), 500);
    });
  });

  // Close to tray instead of quitting
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (isMac && app.dock) app.dock.hide();
    }
  });

  // Crash recovery with backoff (max 3 attempts)
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer crashed:', details.reason);
    if (details.reason === 'clean-exit') return;
    crashCount++;
    if (crashCount > 3) {
      console.error('Renderer crashed too many times, giving up.');
      return;
    }
    const delay = Math.min(1000 * crashCount, 10000);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(APP_URL);
      }
    }, delay);
  });

  // Reset crash counter on successful load
  mainWindow.webContents.on('did-finish-load', () => {
    crashCount = 0;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Auto-grant permissions for media, display capture, notifications
  session.defaultSession.setPermissionRequestHandler((_, permission, callback) => {
    const allowed = ['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'clipboard-read', 'display-capture'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_, permission) => {
    const allowed = ['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'clipboard-read', 'display-capture'];
    return allowed.includes(permission);
  });

  return mainWindow;
}

// ── Show / Focus Window ──────────────────────────────────────────────────────
function showWindow() {
  if (process.platform === 'darwin' && app.dock) app.dock.show();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── Navigate (without full page reload) ──────────────────────────────────────
function navigateTo(urlPath) {
  const wasDestroyed = !mainWindow || mainWindow.isDestroyed();
  showWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (wasDestroyed) {
    // Wait for renderer to load before sending navigate IPC
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('navigate', urlPath);
    });
  } else {
    mainWindow.webContents.send('navigate', urlPath);
  }
}

// ── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Request microphone access on macOS
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.askForMediaAccess('microphone');
    } catch (err) {
      console.error('Mic access request failed:', err);
    }
  }

  createWindow();

  // System tray — use template image on macOS for dark/light mode
  const trayIconPath = path.join(__dirname, 'icons.iconset', 'icon_16x16.png');
  const trayIcon = nativeImage.createFromPath(trayIconPath);
  if (process.platform === 'darwin') trayIcon.setTemplateImage(true);
  tray = createTray(trayIcon, showWindow, navigateTo);

  // Global hotkey: Cmd/Ctrl+Shift+C
  globalShortcut.register('CommandOrControl+Shift+C', showWindow);

  // macOS: show window when dock icon is clicked
  app.on('activate', showWindow);

  // Auto-updater (non-blocking)
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', info);
      }
    });
    autoUpdater.on('update-downloaded', (info) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch {}
});

// Second instance → focus existing window + handle deep links on Windows/Linux
app.on('second-instance', (_, argv) => {
  const deepLink = argv.find(arg => arg.startsWith('camora://'));
  showWindow();
  if (deepLink && mainWindow && !mainWindow.isDestroyed()) {
    const urlPath = deepLink.replace('camora://', '/');
    navigateTo(urlPath);
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (mainWindow) saveWindowState(mainWindow);
  if (tray) { tray.destroy(); tray = null; }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Deep link protocol: camora://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('camora', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('camora');
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  const urlPath = url.replace('camora://', '/');
  navigateTo(urlPath);
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-version', () => app.getVersion());

// Window control handlers (called from preload.js)
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
