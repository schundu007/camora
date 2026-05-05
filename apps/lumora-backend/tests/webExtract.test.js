import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

const SAMPLE_HTML = `<!DOCTYPE html>
<html><head>
  <title>Stripe Engineering Blog</title>
  <style>body { color: red; }</style>
  <script>console.log('tracking')</script>
</head><body>
  <header><nav><a href="/about">About</a></nav></header>
  <main>
    <article>
      <h1>Building reliable webhooks</h1>
      <p>At Stripe we deliver billions of webhooks per day. The system uses
      idempotency keys and exponential backoff with jitter.</p>
      <p>Read more in <a href="https://stripe.com/blog/idempotency">our deep dive</a>
      and <a href="https://stripe.com/blog/exponential-backoff">backoff strategies</a>.</p>
    </article>
    <article>
      <h2>Payments at scale</h2>
      <p><a href="https://stripe.com/blog/payments-scale">How we scaled to a million tps</a></p>
    </article>
  </main>
  <footer>© 2026 Stripe</footer>
</body></html>`;

describe('fetchAndExtract', () => {
  it('returns extracted text without script/style/nav/header/footer', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_HTML),
    });
    const { fetchAndExtract } = await import('../src/services/webExtract.js');
    const r = await fetchAndExtract('https://stripe.com/blog/');
    expect(r.text).toContain('Building reliable webhooks');
    expect(r.text).toContain('idempotency keys and exponential backoff');
    expect(r.text).not.toContain('console.log');
    expect(r.text).not.toContain('color: red');
    expect(r.text).not.toContain('© 2026 Stripe');
    expect(r.text).not.toContain('About');
  });

  it('extracts same-domain article URLs from <a href> links', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_HTML),
    });
    const { fetchAndExtract } = await import('../src/services/webExtract.js');
    const r = await fetchAndExtract('https://stripe.com/blog/');
    expect(r.articleUrls).toContain('https://stripe.com/blog/idempotency');
    expect(r.articleUrls).toContain('https://stripe.com/blog/exponential-backoff');
    expect(r.articleUrls).toContain('https://stripe.com/blog/payments-scale');
    // Must NOT include cross-domain or non-blog paths
    for (const u of r.articleUrls) {
      expect(u).toMatch(/^https:\/\/stripe\.com/);
    }
  });

  it('throws on non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve('') });
    const { fetchAndExtract } = await import('../src/services/webExtract.js');
    await expect(fetchAndExtract('https://example.com/')).rejects.toThrow(/503/);
  });

  it('aborts on fetch timeout', async () => {
    fetchMock.mockImplementation((url, opts) => new Promise((_, reject) => {
      opts.signal.addEventListener('abort', () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    }));
    const { fetchAndExtract } = await import('../src/services/webExtract.js');
    await expect(fetchAndExtract('https://slow.example.com/', { timeoutMs: 50 })).rejects.toThrow(/timeout|abort/i);
  });

  it('collapses whitespace runs to single spaces / single newlines', async () => {
    const html = `<html><body><main><p>Line   one</p>\n\n\n<p>Line   two</p></main></body></html>`;
    fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve(html) });
    const { fetchAndExtract } = await import('../src/services/webExtract.js');
    const r = await fetchAndExtract('https://x.com/');
    expect(r.text).not.toMatch(/\s{3,}/);
  });
});
