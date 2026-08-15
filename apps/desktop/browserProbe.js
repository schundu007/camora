/**
 * Cross-platform "what is the browser showing?" probe.
 *
 * The desktop shell originally answered this with AppleScript, which meant
 * every feature built on it — URL auto-fetch, the HackerRank auto-detect
 * watcher, browser DOM scraping — silently did nothing on Windows and Linux
 * while the UI advertised them as working. This module gives each platform its
 * own implementation behind one interface.
 *
 * Every function resolves rather than throws, and returns null when it cannot
 * answer. A probe that fails must degrade to "paste the URL yourself", never to
 * an unhandled rejection in the main process.
 */
const { execFile } = require('child_process');
const os = require('os');

/** Run a command with a hard timeout; resolve stdout or null. Never rejects. */
function run(cmd, args, { timeout = 4000, input = null } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const child = execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 1024 * 1024 },
        (err, stdout) => finish(err ? null : String(stdout || '').trim()));
      if (input != null) {
        child.stdin?.on('error', () => {});
        child.stdin?.end(input);
      }
    } catch {
      finish(null);
    }
  });
}

/** Browser process names per platform, in preference order. */
const BROWSER_PROCS = ['chrome', 'msedge', 'brave', 'vivaldi', 'opera', 'firefox'];

/**
 * Windows: read the address bar through UI Automation.
 *
 * Chromium exposes the omnibox as an Edit control supporting ValuePattern, so
 * the value IS the URL — no screen scraping, no synthetic keystrokes, and
 * nothing typed into the user's browser.
 *
 * We walk browser PROCESSES rather than the foreground window, because the
 * foreground window is usually Camora itself at the moment we ask.
 */
const PS_READ_URL = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$names = @('chrome','msedge','brave','vivaldi','opera','firefox')
foreach ($n in $names) {
  foreach ($p in (Get-Process -Name $n -ErrorAction SilentlyContinue)) {
    if ($p.MainWindowHandle -eq 0) { continue }
    $el = [System.Windows.Automation.AutomationElement]::FromHandle($p.MainWindowHandle)
    if ($el -eq $null) { continue }
    $cond = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::Edit)
    $edits = $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
    foreach ($e in $edits) {
      $v = $null
      try { $v = $e.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
      if ($v -and ($v -match '^(https?://|[a-z0-9-]+\\.[a-z]{2,})')) {
        Write-Output ("{0}|{1}" -f $n, $v)
        exit 0
      }
    }
  }
}
exit 1
`;

async function activeBrowserUrlWindows() {
  const out = await run('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS_READ_URL],
    { timeout: 6000 });
  if (!out) return null;
  const i = out.indexOf('|');
  if (i < 0) return null;
  const browser = out.slice(0, i).trim();
  let url = out.slice(i + 1).trim();
  if (!url) return null;
  // The omnibox hides the scheme, so "hackerrank.com/challenges/x" comes back
  // without https:// and would fail every downstream URL parse.
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return { url, browser };
}

/**
 * Linux: X11 only, and best-effort by construction.
 *
 * There is no UI Automation equivalent, so we read the active window's TITLE
 * and recover the URL only when the title carries one. Chromium does not put
 * the URL in the title, so this mostly answers "which site" rather than "which
 * page" — callers must treat a null here as normal, not as an error.
 */
async function activeBrowserUrlLinux() {
  const title = await run('xdotool', ['getactivewindow', 'getwindowname']);
  if (!title) return null;
  const m = title.match(/\bhttps?:\/\/\S+/i);
  if (m) return { url: m[0], browser: 'linux' };
  const bare = title.match(/\b([a-z0-9-]+\.(?:com|org|io|ai|dev|net|co))\/\S*/i);
  if (bare) return { url: `https://${bare[0]}`, browser: 'linux' };
  return null;
}

/**
 * The URL showing in the user's browser, or null when this platform/session
 * cannot determine it. macOS is handled by the caller's AppleScript path, which
 * is richer (it can also name the exact tab), so it is not duplicated here.
 */
async function activeBrowserUrl() {
  if (process.platform === 'win32') return await activeBrowserUrlWindows();
  if (process.platform === 'linux') return await activeBrowserUrlLinux();
  return null;
}

/** A human-readable reason the probe cannot work, for honest error messages. */
function unsupportedReason() {
  if (process.platform === 'win32') return 'No browser window with a readable address bar was found. Open the problem in Chrome, Edge, or Brave.';
  if (process.platform === 'linux') return `Reading the browser URL needs xdotool on X11 (try: sudo apt install xdotool). Paste the URL and click Fetch instead.`;
  return 'Could not read the browser URL on this platform. Paste the URL and click Fetch instead.';
}

module.exports = { activeBrowserUrl, unsupportedReason, BROWSER_PROCS, run, homedir: os.homedir };
