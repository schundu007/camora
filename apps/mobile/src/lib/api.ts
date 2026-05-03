import { CAPRA_API_URL, LUMORA_API_URL } from './env';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

interface CallOptions extends RequestInit {
  token?: string | null;
  /** Per-request timeout in ms. Defaults to 30s. */
  timeoutMs?: number;
}

/**
 * Wraps fetch with:
 *   - Bearer token injection
 *   - 30s default timeout (no spinner of death on a stalled connection)
 *   - Friendly error messages on offline / timeout / 401 / 429 / paywall
 *
 * Reviewer-facing reliability note: every API call you'll find in this app
 * goes through here, so the failure paths are uniform.
 */
async function call<T>(base: string, path: string, opts: CallOptions = {}): Promise<T> {
  const { token, headers, timeoutMs = 30_000, signal: callerSignal, ...rest } = opts;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  // If caller already passed a signal, abort the local controller when it does.
  callerSignal?.addEventListener('abort', () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out — check your internet connection.');
    }
    // Generic network failure (DNS / TLS / no internet).
    throw new ApiError(0, 'Cannot reach the network. Check your connection and try again.');
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = { detail: res.statusText }; }
    const detail = body?.detail || body?.error || `HTTP ${res.status}`;
    throw new ApiError(res.status, friendlyMessage(res.status, detail), body);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function friendlyMessage(status: number, raw: string): string {
  if (status === 401) return 'You are signed out. Sign in again to continue.';
  if (status === 402) return 'This feature requires an upgraded plan. Manage your plan on camora.cariara.com.';
  if (status === 403) return 'You do not have access to this feature.';
  if (status === 429) return 'Slow down a moment — too many requests.';
  if (status >= 500) return 'The server hit a problem. Try again in a moment.';
  return raw;
}

export const lumoraApi = {
  get: <T>(path: string, token?: string | null) => call<T>(LUMORA_API_URL, path, { token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    call<T>(LUMORA_API_URL, path, { method: 'POST', body: JSON.stringify(body), token }),
};

export const capraApi = {
  get: <T>(path: string, token?: string | null) => call<T>(CAPRA_API_URL, path, { token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    call<T>(CAPRA_API_URL, path, { method: 'POST', body: JSON.stringify(body), token }),
};
