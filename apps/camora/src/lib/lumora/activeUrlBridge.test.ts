import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Auto-fetch means "load the problem I already have open". A web page cannot read
// another window's address bar, so it depends on a bridge — the Electron shell, or
// the browser extension. These cover the contract both sides rely on, including the
// case that has bitten repeatedly: neither bridge present, which must report itself
// rather than silently do nothing.

const EXT = 'camora-extension';

/** Fresh module per test — the bridge caches whether it has seen an announcement. */
async function loadBridge() {
  vi.resetModules();
  return import('./activeUrlBridge');
}

/* jsdom's postMessage leaves event.source null, which the bridge's own guard
 * (event.source !== window) correctly rejects — that guard is what stops an
 * embedded iframe asking where you are browsing. So dispatch the event the way a
 * real same-window postMessage arrives, with source set. */
function post(data: Record<string, unknown>) {
  window.dispatchEvent(new MessageEvent('message', {
    data, source: window as Window & typeof globalThis, origin: window.location.origin,
  }));
}

function announceBridge() {
  post({ source: EXT, type: 'CAMORA_BRIDGE_READY' });
  return new Promise(r => setTimeout(r, 0));
}

/** Stand-in for the content script: answers whatever the page asks. */
function mockExtension(reply: Record<string, unknown>, { silent = false } = {}) {
  const handler = (event: MessageEvent) => {
    const d = event.data;
    if (d?.source !== 'camora-page' || d?.type !== 'CAMORA_GET_ACTIVE_URL') return;
    if (silent) return;
    post({ source: EXT, type: 'CAMORA_ACTIVE_URL', id: d.id, ...reply });
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

describe('activeUrlBridge', () => {
  afterEach(() => {
    delete (window as any).camo;
    vi.useRealTimers();
  });

  describe('no bridge', () => {
    it('reports that neither bridge is available instead of hanging', async () => {
      const b = await loadBridge();
      const res = await b.getActiveProblemUrl(50);
      expect(res).toEqual({ ok: false, error: 'no bridge available', source: 'none' });
    });

    it('knows it has no bridge', async () => {
      const b = await loadBridge();
      expect(b.hasAnyBridge()).toBe(false);
      expect(b.isDesktopBridge()).toBe(false);
      expect(b.isExtensionBridge()).toBe(false);
    });
  });

  describe('desktop bridge', () => {
    it('is preferred over the extension and returns its url', async () => {
      const b = await loadBridge();
      (window as any).camo = {
        getActiveBrowserUrl: vi.fn().mockResolvedValue({ ok: true, url: 'https://leetcode.com/problems/two-sum/' }),
      };
      const res = await b.getActiveProblemUrl();
      expect(res).toEqual({ ok: true, url: 'https://leetcode.com/problems/two-sum/', error: undefined, source: 'desktop' });
      expect(b.isDesktopBridge()).toBe(true);
    });

    it('surfaces the reason the probe failed', async () => {
      const b = await loadBridge();
      (window as any).camo = {
        getActiveBrowserUrl: vi.fn().mockResolvedValue({ ok: false, error: 'Automation permission denied' }),
      };
      const res = await b.getActiveProblemUrl();
      expect(res.ok).toBe(false);
      expect(res.error).toBe('Automation permission denied');
      expect(res.source).toBe('desktop');
    });

    it('does not throw when the IPC call rejects', async () => {
      const b = await loadBridge();
      (window as any).camo = { getActiveBrowserUrl: vi.fn().mockRejectedValue(new Error('ipc gone')) };
      const res = await b.getActiveProblemUrl();
      expect(res).toMatchObject({ ok: false, error: 'ipc gone', source: 'desktop' });
    });
  });

  describe('extension bridge', () => {
    let stop: (() => void) | null = null;
    beforeEach(() => { stop = null; });
    afterEach(() => stop?.());

    it('is detected from the content script announcement', async () => {
      const b = await loadBridge();
      expect(b.isExtensionBridge()).toBe(false);
      await announceBridge();
      expect(b.isExtensionBridge()).toBe(true);
      expect(b.hasAnyBridge()).toBe(true);
    });

    it('round-trips a url through postMessage', async () => {
      const b = await loadBridge();
      await announceBridge();
      stop = mockExtension({ ok: true, url: 'https://leetcode.com/problems/trapping-rain-water/', title: '42. Trapping Rain Water' });
      const res = await b.getActiveProblemUrl(500);
      expect(res).toMatchObject({
        ok: true,
        url: 'https://leetcode.com/problems/trapping-rain-water/',
        title: '42. Trapping Rain Water',
        source: 'extension',
      });
    });

    // "Installed but nothing open" and "not installed" need different wording in
    // the UI, so they must not collapse into the same result.
    it('distinguishes no-problem-tab from no-bridge', async () => {
      const b = await loadBridge();
      await announceBridge();
      stop = mockExtension({ ok: false, error: 'no problem tab open' });
      const res = await b.getActiveProblemUrl(500);
      expect(res).toMatchObject({ ok: false, error: 'no problem tab open', source: 'extension' });
    });

    it('gives up rather than hanging when the extension never answers', async () => {
      const b = await loadBridge();
      await announceBridge();
      stop = mockExtension({}, { silent: true });
      const res = await b.getActiveProblemUrl(60);
      expect(res).toMatchObject({ ok: false, error: 'bridge timed out', source: 'extension' });
    });

    it('ignores replies carrying a different request id', async () => {
      const b = await loadBridge();
      await announceBridge();
      const handler = (event: MessageEvent) => {
        if (event.data?.source !== 'camora-page') return;
        post({ source: EXT, type: 'CAMORA_ACTIVE_URL', id: 'someone-elses', ok: true, url: 'https://evil.example/x' });
      };
      window.addEventListener('message', handler);
      stop = () => window.removeEventListener('message', handler);
      const res = await b.getActiveProblemUrl(60);
      expect(res.url).toBeUndefined();
      expect(res.error).toBe('bridge timed out');
    });
  });

  describe('waitForBridge', () => {
    it('resolves false within the timeout when nothing announces', async () => {
      const b = await loadBridge();
      await expect(b.waitForBridge(60)).resolves.toBe(false);
    });

    it('resolves true once the announcement arrives', async () => {
      const b = await loadBridge();
      const pending = b.waitForBridge(1000);
      await announceBridge();
      await expect(pending).resolves.toBe(true);
    });
  });
});
