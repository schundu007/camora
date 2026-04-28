const { app, BrowserWindow, globalShortcut, systemPreferences, session, shell, nativeImage, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
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
  // Request microphone access on macOS
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.askForMediaAccess('microphone');
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

// macOS TCC bridge. The renderer cannot read or trigger AVCaptureDevice
// authorization itself — getUserMedia silently returns NotFoundError when
// permission isn't granted, so we expose the systemPreferences API here.
//   * 'media-access-status'   → 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'
//   * 'ask-media-access'      → triggers the macOS dialog (only on first
//                                'not-determined'; subsequent calls just
//                                return the cached answer immediately)
//   * 'open-system-privacy'   → jumps to the right pane of System Settings
//                                so the user doesn't have to hunt for it
//   * 'relaunch-app'          → relaunches the Electron process. macOS
//                                only surfaces a freshly-granted device to
//                                the running Chromium audio service after
//                                a process restart, so the wizard uses
//                                this as the recovery path when TCC says
//                                'granted' but getUserMedia still 404s.
ipcMain.handle('get-media-access-status', (_e, kind) => {
  if (process.platform !== 'darwin') return 'granted';
  try {
    return systemPreferences.getMediaAccessStatus(kind || 'microphone');
  } catch {
    return 'unknown';
  }
});
ipcMain.handle('ask-for-media-access', async (_e, kind) => {
  if (process.platform !== 'darwin') return true;
  try {
    return await systemPreferences.askForMediaAccess(kind || 'microphone');
  } catch {
    return false;
  }
});
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
ipcMain.handle('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// List screens + windows the user can capture, with thumbnail previews,
// so the renderer can show its own picker UI (Camora's brand-styled
// modal) instead of relying on Chromium's default getDisplayMedia
// dialog. Used by the "Capture problem" button in coding/design tabs;
// the interviewer-audio loopback path uses the auto-pick handler in
// setDisplayMediaRequestHandler above (no picker — it just needs
// system audio, any screen will do).
// List capturable windows + screens for the in-app "Capture problem"
// picker. We deliberately skip thumbnails (thumbnailSize 1×1) so this
// IPC returns in tens of milliseconds instead of 5+ seconds — the
// picker opens instantly with window NAMES, no preview images. This
// is the right trade-off: the user knows their window by title
// ("Two Sum - LeetCode - Google Chrome"), and the screenshot itself
// is captured at full native resolution by capture-source-image.
ipcMain.handle('list-capture-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1, height: 1 },
      fetchWindowIcons: false,
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.id.startsWith('screen:') ? 'screen' : 'window',
    }));
  } catch (err) {
    console.error('[capture] list-capture-sources failed:', err);
    return [];
  }
});

// Capture the chosen window at full native resolution via macOS's
// /usr/sbin/screencapture. This is what Cleanshot, Loom, Slack etc.
// use under the hood — it triggers the standard Screen Recording
// permission prompt on first use and writes a real PNG file. Bypasses
// the Electron desktopCapturer thumbnail path which silently returned
// empty bitmaps when SR was denied for the running cdhash.
ipcMain.handle('capture-window-native', async (_e, sourceId) => {
  if (!sourceId) return null;
  // Source IDs from desktopCapturer look like "window:12345:0" or "screen:0:0".
  const match = String(sourceId).match(/^(window|screen):(\d+):/);
  if (!match) return null;
  const [, kind, idNum] = match;
  const tmpFile = path.join(os.tmpdir(), `camora-cap-${Date.now()}-${process.pid}.png`);
  // -x: silent (no shutter sound), -t png, -o: don't add metadata
  // window: -l<id>; screen: -D<displayID> (idNum is 0-based; displays are 1-based)
  const args = kind === 'window'
    ? ['-x', '-t', 'png', '-o', '-l', idNum, tmpFile]
    : ['-x', '-t', 'png', '-o', `-D${Number(idNum) + 1}`, tmpFile];
  try {
    await new Promise((resolve, reject) => {
      execFile('/usr/sbin/screencapture', args, (err) => err ? reject(err) : resolve());
    });
    const buf = fs.readFileSync(tmpFile);
    fs.unlink(tmpFile, () => {});
    if (!buf.length) {
      console.warn('[capture] screencapture wrote empty file — Screen Recording denied?');
      return null;
    }
    console.info(`[capture] screencapture ${kind}=${idNum} → ${buf.length} bytes`);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[capture] screencapture failed:', err);
    fs.unlink(tmpFile, () => {});
    return null;
  }
});

// Window control handlers (called from preload.js)
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
