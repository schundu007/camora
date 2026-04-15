const { app, BrowserWindow, globalShortcut, systemPreferences, session, shell, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTray } = require('./tray');

// ── Config ───────────────────────────────────────────────────────────────────
const APP_URL = process.env.CAMORA_URL || 'https://camora.cariara.com';
const IS_DEV = process.env.NODE_ENV === 'development';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

// ── Single Instance Lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

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

// ── Main ─────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;

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

  // Load the app
  mainWindow.loadURL(APP_URL);

  // Show when ready (avoid white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Save state on resize/move
  ['resize', 'move'].forEach(evt => {
    mainWindow.on(evt, () => saveWindowState(mainWindow));
  });

  // Close to tray instead of quitting
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Crash recovery
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer crashed:', details.reason);
    if (details.reason !== 'clean-exit') {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(APP_URL);
        }
      }, 1000);
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Auto-grant microphone permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'clipboard-read', 'display-capture'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'clipboard-read', 'display-capture'];
    return allowed.includes(permission);
  });

  return mainWindow;
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
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

  // System tray
  const iconPath = path.join(__dirname, 'icons.iconset', 'icon_32x32.png');
  tray = createTray(iconPath, showWindow);

  // Global hotkey: Cmd/Ctrl+Shift+C
  globalShortcut.register('CommandOrControl+Shift+C', showWindow);

  // macOS: re-create window when dock icon is clicked
  app.on('activate', showWindow);

  // Auto-updater (non-blocking)
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch {}
});

// Second instance → focus existing window
app.on('second-instance', showWindow);

app.on('before-quit', () => {
  app.isQuitting = true;
  if (mainWindow) saveWindowState(mainWindow);
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
  showWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Parse camora:// URLs and navigate
    const path = url.replace('camora://', '/');
    mainWindow.loadURL(`${APP_URL}${path}`);
  }
});

// IPC handlers
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-version', () => app.getVersion());
