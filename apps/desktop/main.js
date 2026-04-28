const { app, BrowserWindow, globalShortcut, systemPreferences, session, shell, nativeImage, ipcMain, desktopCapturer } = require('electron');
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
let contentProtected = false;

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
    title: 'Camora',
    backgroundColor: '#0D0C14',
    icon: path.join(__dirname, 'icon.png'),
    // Use the native window chrome on every platform — full title bar with
    // standard traffic lights / Windows controls. The previous `hiddenInset`
    // mode required CSS shims to avoid the controls overlapping the SiteNav,
    // and it made the fixed-nav math awkward (headline was clipped). A real
    // title bar is the convention for enterprise desktop apps and removes
    // the entire class of issues.
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

  // Content protection (NSWindowSharingNone on macOS / equivalent on
  // Windows) is the "invisible to screen capture" flag — Zoom / Meet /
  // Teams / OBS / QuickTime see through to the desktop underneath.
  // Default is OFF so the user's own screenshot/screen-recording tools
  // work normally on their own machine. Cmd+B toggles it on/off as a
  // panic switch right before an interview share starts.
  contentProtected = false;
  try {
    mainWindow.setContentProtection(false);
  } catch (err) {
    console.warn('[contentProtection] not supported:', err?.message);
  }

  // Google's OAuth screen refuses any browser whose User-Agent contains
  // "Electron" — sign-in shows "This browser or app may not be secure"
  // and never completes. Override the UA for Google's domains so OAuth
  // works in the packaged desktop app. Chrome-on-macOS keeps the engine
  // claim truthful while not tripping the embedded-webview heuristic.
  const SAFE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const GOOGLE_HOSTS = /(^|\.)(google\.com|googleusercontent\.com|gstatic\.com|googleapis\.com|youtube\.com)$/i;
  session.defaultSession.webRequest.onBeforeSendHeaders((details, cb) => {
    try {
      const host = new URL(details.url).hostname;
      if (GOOGLE_HOSTS.test(host)) {
        details.requestHeaders['User-Agent'] = SAFE_UA;
      }
    } catch {}
    cb({ requestHeaders: details.requestHeaders });
  });

  mainWindow.loadURL(APP_URL);

  // Pin the OS title bar to "Camora" — without this, the document.title
  // (e.g. "Camora — Apply, Prepare, Practice & Attend") leaks into the
  // native chrome and visually duplicates the page nav.
  mainWindow.webContents.on('page-title-updated', (e) => e.preventDefault());

  // Show when ready (avoid white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Save state on resize/move (debounced)
  let saveTimeout;
  ['resize', 'move'].forEach(evt => {
    mainWindow.on(evt, () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => saveWindowState(mainWindow), 500);
    });
  });

  // Close = quit. The previous behavior preventDefaulted the close
  // event and hid the window+dock so the process kept running in the
  // tray; clicking the close button looked like nothing happened, and
  // reopening reused the same hidden window instead of starting fresh.
  // The tray icon remains as a quick relaunch entry — clicking it
  // creates a brand-new window via showWindow().

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

  // ── Native system-audio loopback for getDisplayMedia ─────────────────
  // Without this handler, calling getDisplayMedia() inside Electron throws
  // "Not supported" and the renderer falls back to the (unavailable in our
  // packaged build) browser picker. By providing a handler we route the
  // call straight to a primary-display video source plus `audio: 'loopback'`
  // — Electron uses ScreenCaptureKit on macOS 13+ and WASAPI loopback on
  // Windows, so the user gets system audio without installing BlackHole or
  // any virtual audio cable. The renderer code (useTabAudioCapture) is
  // unchanged: it still calls navigator.mediaDevices.getDisplayMedia({
  // audio, video }) and just receives a working stream.
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      // Fallback path (older macOS, Linux): include both screens AND
      // windows so the screen-capture-OCR flow can grab a Chrome tab,
      // not just the primary display. Returns the first available
      // source to preserve the auto-pick interviewer-audio behavior
      // when the system picker isn't available.
      desktopCapturer
        .getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
        .then((sources) => {
          if (!sources.length) {
            callback({});
            return;
          }
          callback({ video: sources[0], audio: 'loopback' });
        })
        .catch((err) => {
          console.error('[displayMedia] desktopCapturer failed:', err);
          callback({});
        });
    },
    // Auto-pick the primary screen so the interviewer-audio loopback
    // flow works without an extra picker step. The macOS system picker
    // doesn't auto-include system audio — users had to manually tick
    // "Share audio" in the picker, and missing that toggle returned a
    // zero-audio-track stream that surfaced as "No system audio
    // detected". The Capture-problem screenshot flow (which DOES need
    // a picker so the user can choose their HackerRank / CodeSignal tab)
    // is being moved to a separate IPC path that calls desktopCapturer
    // directly with a custom UI — that change is the right place to
    // give the user control over which surface to capture.
    { useSystemPicker: false },
  );

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
  // Request microphone access on macOS. If access is denied at the OS
  // level (TCC has a 'denied' entry from a prior rebuild whose cdhash
  // doesn't match this build), the prompt won't fire and the wizard
  // will silently show 0 microphones. Detect that state and open System
  // Settings → Privacy & Security → Microphone directly so the user can
  // toggle it on with one click instead of hunting through panes.
  if (process.platform === 'darwin') {
    try {
      const before = systemPreferences.getMediaAccessStatus('microphone');
      if (before === 'granted') {
        // Already good — nothing to do.
      } else if (before === 'denied') {
        // TCC has a hard-deny entry. askForMediaAccess won't reprompt;
        // user must flip the switch in System Settings. Open the right
        // pane directly so they don't have to navigate.
        console.warn('[mic] previously denied — opening System Settings');
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
      } else {
        // 'not-determined' or 'restricted' — try the prompt path.
        const granted = await systemPreferences.askForMediaAccess('microphone');
        if (!granted) {
          // Prompt didn't yield a grant. Open Settings as a safety net.
          console.warn('[mic] askForMediaAccess did not grant — opening System Settings');
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
        }
      }
    } catch (err) {
      console.error('Mic access request failed:', err);
    }
  }

  createWindow();

  // System tray — use template image on macOS for dark/light mode.
  // Load 16x16 (1x) plus a 32x32 retina representation; without the @2x
  // rep the menu bar shows nothing on retina displays for some assets.
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, 'icons.iconset', 'icon_16x16.png')
  );
  if (trayIcon.isEmpty()) {
    console.error('[tray] icon_16x16.png failed to load — tray will be invisible');
  }
  const tray2x = nativeImage.createFromPath(
    path.join(__dirname, 'icons.iconset', 'icon_32x32.png')
  );
  if (!tray2x.isEmpty()) {
    trayIcon.addRepresentation({ scaleFactor: 2.0, buffer: tray2x.toPNG() });
  }
  if (process.platform === 'darwin') trayIcon.setTemplateImage(true);
  tray = createTray(trayIcon, showWindow, navigateTo);

  // Global hotkey: Cmd/Ctrl+Shift+C — focus the app from anywhere.
  globalShortcut.register('CommandOrControl+Shift+C', showWindow);

  // Cmd/Ctrl+B → toggle "invisible to screen share". When ON, Zoom/
  // Meet/Teams/OBS/QuickTime see straight through the Camora window to
  // whatever's behind it; the user still sees Camora normally on their
  // own display. When OFF (default), screen capture works normally so
  // the user can take their own screenshots, record demos, etc.
  // Notification toast tells the user which state they just entered
  // because the only visible-to-the-user difference is on the OTHER
  // side of the share, which they can't verify mid-call.
  globalShortcut.register('CommandOrControl+B', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    contentProtected = !contentProtected;
    try {
      mainWindow.setContentProtection(contentProtected);
    } catch (err) {
      console.warn('[contentProtection] toggle failed:', err?.message);
      return;
    }
    mainWindow.webContents.send('content-protection-changed', contentProtected);
  });

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

// Quit on every platform when the last window closes. macOS apps
// conventionally stay running with no windows, but Camora is a
// single-window app and the user reported closing it didn't fully
// terminate the process — matching the user's expectation that close
// means close.
app.on('window-all-closed', () => {
  app.quit();
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

// IPC handlers backing the preload's media-access bridge. The preload
// exposes these channels for the renderer to call, but the handlers
// were never registered in main.js — every call from the renderer
// hung silently. That's been a hidden cause of the "Grant microphone
// access" button doing nothing on the desktop app.

// Read current TCC status without prompting.
ipcMain.handle('get-media-access-status', (_e, kind) => {
  if (process.platform !== 'darwin') return 'granted';
  try {
    return systemPreferences.getMediaAccessStatus(kind || 'microphone');
  } catch {
    return 'unknown';
  }
});

// Trigger macOS prompt; resolves true on grant, false otherwise.
// Note: macOS only prompts once per "not-determined" state. If TCC
// has a 'denied' entry already, this returns false WITHOUT prompting.
ipcMain.handle('ask-for-media-access', async (_e, kind) => {
  if (process.platform !== 'darwin') return true;
  try {
    return await systemPreferences.askForMediaAccess(kind || 'microphone');
  } catch {
    return false;
  }
});

// Open System Settings directly to a Privacy & Security section.
// section ∈ 'Microphone' | 'Camera' | 'ScreenCapture' | 'Accessibility'.
ipcMain.handle('open-system-privacy', (_e, section) => {
  if (process.platform !== 'darwin') return false;
  const map = {
    Microphone: 'Privacy_Microphone',
    Camera: 'Privacy_Camera',
    ScreenCapture: 'Privacy_ScreenCapture',
    Accessibility: 'Privacy_Accessibility',
  };
  const anchor = map[section] || 'Privacy_Microphone';
  shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${anchor}`);
  return true;
});

// Relaunch + quit. macOS won't surface microphone devices to Chromium
// once they're granted via System Settings while the app is already
// running — getUserMedia keeps returning NotFoundError until the
// process restarts. The wizard calls this when it detects that exact
// stuck state so the user can fix it with one click.
ipcMain.handle('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// Window control handlers (called from preload.js)
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
