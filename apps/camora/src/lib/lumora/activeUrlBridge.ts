/**
 * "Which coding problem is open right now?" — answered by whichever bridge exists.
 *
 * A web page cannot read another window's address bar, so this needs help from
 * outside the page. Two providers offer it and they are tried in order:
 *
 *   desktop    window.camo.getActiveBrowserUrl() — the Electron shell's IPC probe
 *   extension  the Camora Problem Bridge extension, over window.postMessage
 *
 * Callers get one shape back regardless, so the coding UI does not care which one
 * answered — and gets `source: 'none'` when neither is present, which is the case
 * the UI must explain rather than silently do nothing.
 */

export type ActiveUrlResult = {
  ok: boolean;
  url?: string;
  title?: string;
  error?: string;
  source: 'desktop' | 'extension' | 'none';
};

const PAGE = 'camora-page';
const EXT = 'camora-extension';

/** Flipped by the content script's announcement; see waitForBridge below. */
let bridgeSeen = false;

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.data?.source === EXT && event.data?.type === 'CAMORA_BRIDGE_READY') bridgeSeen = true;
  });
}

export function isDesktopBridge(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).camo?.getActiveBrowserUrl === 'function';
}

export function isExtensionBridge(): boolean {
  return bridgeSeen;
}

export function hasAnyBridge(): boolean {
  return isDesktopBridge() || isExtensionBridge();
}

/** The one error askExtension invents itself; every other reply came from the bridge. */
const TIMED_OUT = 'bridge timed out';

/**
 * Ask the extension, whether or not we caught its announcement.
 *
 * The announcement is a one-shot event, and this module cannot be listening for
 * it: it is imported by CodingLayout, a lazy() route, so it is evaluated only
 * once that chunk downloads and mounts — while content.js announces at
 * document_start and again at DOMContentLoaded. On any normal page load both
 * announcements are long gone before the listener exists, so a detector that
 * only listens concludes there is no extension while the content script sits
 * there, alive, waiting to be asked.
 *
 * So we ask. ANY reply — including "no problem tab open" — proves the bridge is
 * there, which is the same pull-based test the desktop path uses when it checks
 * for window.camo.
 */
async function probeExtension(timeoutMs: number): Promise<ActiveUrlResult> {
  const res = await askExtension(timeoutMs);
  if (res.error !== TIMED_OUT) bridgeSeen = true;
  return res;
}

/**
 * Is any bridge available? Generous by default: a cold MV3 service worker takes
 * a moment to wake, and a false negative here reads as the feature not existing.
 */
export async function waitForBridge(timeoutMs = 1500): Promise<boolean> {
  if (hasAnyBridge()) return true;
  const res = await probeExtension(timeoutMs);
  // Re-check on the way out: installing or reloading the extension mid-wait
  // injects a content script that announces itself but never saw the request we
  // are still waiting on, so the ask times out while the bridge is in fact live.
  return res.error !== TIMED_OUT || hasAnyBridge();
}

function askExtension(timeoutMs: number): Promise<ActiveUrlResult> {
  return new Promise(resolve => {
    const id = `camora-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let done = false;

    const finish = (r: ActiveUrlResult) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      resolve(r);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const d = event.data;
      if (d?.source !== EXT || d?.type !== 'CAMORA_ACTIVE_URL' || d.id !== id) return;
      finish({ ok: Boolean(d.ok), url: d.url, title: d.title, error: d.error, source: 'extension' });
    };

    window.addEventListener('message', onMessage);
    window.postMessage({ source: PAGE, type: 'CAMORA_GET_ACTIVE_URL', id }, window.location.origin);
    // The service worker may be cold; it still answers well inside this budget.
    setTimeout(() => finish({ ok: false, error: TIMED_OUT, source: 'extension' }), timeoutMs);
  });
}

/**
 * Ask whichever bridge is available for the open problem URL.
 * Never throws — a failing probe reports `ok: false` with a reason the UI can show.
 */
export async function getActiveProblemUrl(timeoutMs = 2500): Promise<ActiveUrlResult> {
  if (isDesktopBridge()) {
    try {
      const res = await (window as any).camo.getActiveBrowserUrl();
      return {
        ok: Boolean(res?.ok && res?.url),
        url: res?.url,
        error: res?.ok ? undefined : (res?.error ?? 'no problem tab open'),
        source: 'desktop',
      };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err), source: 'desktop' };
    }
  }

  // No waitForBridge() gate: that only ever answered "did we catch the
  // announcement", and the answer is normally no (see probeExtension). Asking
  // outright both detects the bridge and gets the URL in one round trip.
  const res = await probeExtension(timeoutMs);
  if (!bridgeSeen && res.error === TIMED_OUT) {
    return { ok: false, error: 'no bridge available', source: 'none' };
  }
  return res;
}
