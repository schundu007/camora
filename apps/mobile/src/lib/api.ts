import { CAPRA_API_URL, LUMORA_API_URL } from './env';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

interface CallOptions extends RequestInit {
  token?: string | null;
}

async function call<T>(base: string, path: string, opts: CallOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = { detail: res.statusText }; }
    throw new ApiError(res.status, body?.detail || body?.error || `HTTP ${res.status}`, body);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
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
