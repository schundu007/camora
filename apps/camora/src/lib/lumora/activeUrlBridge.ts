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

/**
 * The content script announces itself at document_start, which can land before this
 * module's listener is attached. Rather than race, give it a short grace period the
 * first time we look.
 */
export function waitForBridge(timeoutMs = 600): Promise<boolean> {
  if (hasAnyBridge()) return Promise.resolve(true);
  return new Promise(resolve => {
    const started = Date.now();
    const tick = () => {
      if (hasAnyBridge()) return resolve(true);
      if (Date.now() - started >= timeoutMs) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
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
    setTimeout(() => finish({ ok: false, error: 'bridge timed out', source: 'extension' }), timeoutMs);
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

  if (await waitForBridge()) return askExtension(timeoutMs);

  return { ok: false, error: 'no bridge available', source: 'none' };
}
