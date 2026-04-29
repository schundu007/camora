// Camora Desktop v2 — minimal native shell.
//
// What it does:
//   • Loads camora.cariara.com in a native window (single source of truth).
//   • System-audio loopback for getDisplayMedia (interviewer audio from Zoom/Meet).
//   • Native screen capture via /usr/sbin/screencapture (full res, real PNG).
//   • Real PDF + DOCX downloads (Chromium printToPDF, docx package).
//   • Mic permission prompt at launch.
//   • Cmd+B hide/show.
//   • Window state persists.
//
// What it deliberately doesn't:
//   • No tray (caused stale-icon issues last build).
//   • No auto-updater.
//   • No screen-capture entitlement gating beyond what macOS TCC handles natively.

const {
  app, BrowserWindow, BrowserView, globalShortcut, systemPreferences,
  session, shell, ipcMain, desktopCapturer, dialog, nativeImage,
  Menu, MenuItem, clipboard,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } = require('docx');

const APP_URL = process.env.CAMORA_URL || 'https://camora.cariara.com';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

// ── Single instance ─────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); }

let mainWindow = null;
let isQuitting = false;

// ── Window state ────────────────────────────────────────────────────────
function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return { width: 1400, height: 900 };
}
function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    fs.writeFileSync(STATE_FILE, JSON.stringify(b));
  } catch {}
}

// ── Window ──────────────────────────────────────────────────────────────
function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width, height: state.height, x: state.x, y: state.y,
    minWidth: 900, minHeight: 600,
    title: 'Camora',
    backgroundColor: '#0a0a0a',
    // Default macOS title bar — keeps traffic lights in their own strip
    // above the web app so they never overlap the in-app nav header.
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on('close', (e) => {
    if (!isQuitting) saveWindowState(mainWindow);
  });
  ['resize', 'move'].forEach((ev) => mainWindow.on(ev, () => saveWindowState(mainWindow)));

  // External links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Right-click context menu — Electron doesn't ship one by default, so the
  // web view has no Copy/Paste/Select All. Build it from the contextmenu
  // params so we only show entries that make sense for the click target.
  mainWindow.webContents.on('context-menu', (_e, params) => {
    const menu = new Menu();
    const hasSelection = !!(params.selectionText && params.selectionText.trim().length > 0);
    const editable = !!params.isEditable;

    if (params.misspelledWord && Array.isArray(params.dictionarySuggestions)) {
      for (const s of params.dictionarySuggestions) {
        menu.append(new MenuItem({ label: s, click: () => mainWindow.webContents.replaceMisspelling(s) }));
      }
      if (params.dictionarySuggestions.length > 0) menu.append(new MenuItem({ type: 'separator' }));
    }

    if (editable) {
      menu.append(new MenuItem({ role: 'cut', enabled: hasSelection }));
      menu.append(new MenuItem({ role: 'copy', enabled: hasSelection }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'pasteAndMatchStyle' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    } else if (hasSelection) {
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    }

    if (params.linkURL) {
      if (menu.items.length > 0) menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Open Link in Browser',
        click: () => shell.openExternal(params.linkURL),
      }));
      menu.append(new MenuItem({
        label: 'Copy Link',
        click: () => clipboard.writeText(params.linkURL),
      }));
    }

    if (params.mediaType === 'image' && params.srcURL) {
      if (menu.items.length > 0) menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL),
      }));
    }

    if (menu.items.length > 0) menu.popup({ window: mainWindow });
  });

  // Audio loopback for interviewer audio (Zoom/Meet capture without virtual cables).
  // Auto-pick the primary screen so users don't have to click through a picker.
  session.defaultSession.setDisplayMediaRequestHandler((_req, callback) => {
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
      .then((sources) => callback(sources.length ? { video: sources[0], audio: 'loopback' } : {}))
      .catch(() => callback({}));
  }, { useSystemPicker: false });
}

// ── Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Clear the HTTP cache on every launch. Electron caches index.html and
  // hashed asset chunks aggressively, which means a Vercel deploy that
  // changed a chunk hash often serves the OLD HTML pointing at a chunk
  // that is now missing — or a STALE chunk that doesn't match the
  // preload's IPC surface. Wiping the cache here costs ~one extra
  // network round-trip on launch and makes "fresh deploy = fresh app".
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({ storages: ['shadercache', 'cachestorage'] });
  } catch {}

  // Prompt for mic at launch so it's a one-time UX, not a surprise mid-interview.
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch {}
  }
  createWindow();

  globalShortcut.register('CommandOrControl+B', () => {
    if (!mainWindow) return;
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reloadIgnoringCache();
  });
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reloadIgnoringCache();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); else mainWindow.show(); });
app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── IPC: macOS-native window capture (NO MODAL) ────────────────────────
// Click Capture → Camora hides → macOS draws its own window-select
// cursor (camera icon on hover) → user clicks any window → capture
// written → Camora reappears. No in-app picker, no list, no thumbs.
ipcMain.handle('capture-interactive', async () => {
  const tmp = path.join(os.tmpdir(), `camora-cap-${Date.now()}-${process.pid}.png`);
  const wasVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
  if (wasVisible) {
    mainWindow.hide();
    await new Promise((r) => setTimeout(r, 120));
  }
  try {
    // -W: start in window-selection mode (camera icon, click to capture).
    // User can also press Space to switch between window mode and region
    // selection — same as Cmd+Shift+5 on macOS.
    // -o: don't include the window's drop shadow.
    // -t png: full-res PNG.
    // If user presses Escape, screencapture exits 1 and writes nothing.
    await new Promise((res) => {
      execFile('/usr/sbin/screencapture', ['-W', '-o', '-t', 'png', tmp], () => res());
    });
    if (!fs.existsSync(tmp)) return null;
    let buf = fs.readFileSync(tmp);
    fs.unlink(tmp, () => {});
    if (!buf.length) return null;

    // Anthropic's vision API rejects images whose base64 payload exceeds
    // 5 MB (5,242,880 bytes). Native screencapture on Retina/HiDPI screens
    // routinely produces 4–8 MB PNGs. Downscale to keep base64 under 4.8 MB
    // (some safety margin under the 5 MB cap). Iterate at most a few times.
    const MAX_BASE64 = 4_800_000;
    const base64Size = (raw) => Math.ceil(raw.length / 3) * 4;
    if (base64Size(buf) > MAX_BASE64) {
      let img = nativeImage.createFromBuffer(buf);
      let { width, height } = img.getSize();
      // First try shrinking to 1920px wide (more than enough for OCR; still
      // resolves small font on dual-pane editors).
      const targetW = Math.min(width, 1920);
      img = img.resize({ width: targetW, quality: 'best' });
      buf = img.toPNG();
      // If still too large, switch to JPEG quality 85 — keeps text crisp
      // and roughly halves the size vs PNG on screenshots with gradients.
      if (base64Size(buf) > MAX_BASE64) {
        buf = img.toJPEG(85);
        const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
        console.info(`[capture] resized to ${img.getSize().width}px JPEG, ${buf.length} bytes`);
        return dataUrl;
      }
      console.info(`[capture] resized to ${img.getSize().width}px PNG, ${buf.length} bytes`);
    }
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[capture] interactive screencapture failed:', err);
    fs.unlink(tmp, () => {});
    return null;
  } finally {
    if (wasVisible && mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  }
});

// ── IPC: media access (used by the renderer for actionable error UX) ───
ipcMain.handle('get-media-access-status', (_e, kind) => {
  if (process.platform !== 'darwin') return 'granted';
  return systemPreferences.getMediaAccessStatus(kind || 'microphone');
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
  const sec = section || 'Microphone';
  return shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?Privacy_${sec}`);
});
ipcMain.handle('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// ── IPC: download — real PDF via Chromium printToPDF ───────────────────
// Renderer sends fully-styled HTML; we render it in a hidden BrowserWindow,
// call printToPDF, then write to the chosen path via the native save dialog.
ipcMain.handle('save-pdf', async (_e, { html, filename }) => {
  if (!html) return { ok: false, error: 'no html' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save as PDF',
    defaultPath: filename || 'Camora.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  const printer = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false },
  });
  // data: URLs over a few hundred KB are flaky in Chromium — produces blank
  // or truncated PDFs that look "corrupted". Render from a temp file instead.
  const tmpHtml = path.join(os.tmpdir(), `camora-prep-${Date.now()}.html`);
  try {
    fs.writeFileSync(tmpHtml, html, 'utf8');
    await printer.loadFile(tmpHtml);
    // Wait one paint tick so fonts/CSS are committed before printing.
    await new Promise((r) => setTimeout(r, 150));
    const pdf = await printer.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
    });
    fs.writeFileSync(result.filePath, pdf);
    return { ok: true, path: result.filePath };
  } catch (err) {
    console.error('[pdf] printToPDF failed:', err);
    return { ok: false, error: String(err?.message || err) };
  } finally {
    try { fs.unlinkSync(tmpHtml); } catch {}
    printer.destroy();
  }
});

// ── IPC: download — real DOCX via docx package ─────────────────────────
// Renderer sends a structured tree: [{ heading: "...", blocks: [{type:"p"|"h1"|"h2"|"li"|"code", text:"..."}] }, ...]
// We turn it into a real .docx (not HTML-as-doc).
ipcMain.handle('save-docx', async (_e, { sections, filename, title }) => {
  if (!Array.isArray(sections) || sections.length === 0) return { ok: false, error: 'no sections' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save as Word document',
    defaultPath: filename || 'Camora.docx',
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  // Word rejects XML control chars (U+0000..U+001F except tab/lf/cr) and
  // U+FFFE/U+FFFF — strip them or the .docx is flagged "corrupted" on open.
  const xmlSafe = (s) => String(s == null ? '' : s).replace(/[ --￾￿]/g, '');

  const children = [];
  if (title) {
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: xmlSafe(title), bold: true })],
    }));
  }
  for (const section of sections) {
    if (section.heading) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: xmlSafe(section.heading), bold: true })],
        spacing: { before: 280, after: 120 },
      }));
    }
    for (const b of (section.blocks || [])) {
      const text = xmlSafe(b.text);
      if (b.type === 'h1') {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true })] }));
      } else if (b.type === 'h2') {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true })] }));
      } else if (b.type === 'h3') {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, bold: true })] }));
      } else if (b.type === 'li') {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text })] }));
      } else if (b.type === 'code') {
        children.push(new Paragraph({
          children: [new TextRun({ text, font: 'Menlo', size: 18 })],
          shading: { type: 'clear', color: 'auto', fill: 'F4F4F4' },
        }));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text })] }));
      }
    }
  }

  try {
    const doc = new Document({ sections: [{ children }] });
    const buf = await Packer.toBuffer(doc);
    fs.writeFileSync(result.filePath, buf);
    return { ok: true, path: result.filePath };
  } catch (err) {
    console.error('[docx] generation failed:', err);
    return { ok: false, error: String(err?.message || err) };
  }
});
