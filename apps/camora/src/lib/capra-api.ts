/**
 * API client for communicating with the ascend-backend (Capra/prep API).
 */

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

class CapraAPIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'CapraAPIError';
  }
}

async function fetchCapra<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new CapraAPIError(
      response.status,
      errorData.detail || errorData.error || `HTTP error ${response.status}`,
      errorData
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Playground ---

export interface PlaygroundRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  variables: Record<string, { type: string; repr: string }>;
}

export interface LintDiagnostic {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  code: string;
  message: string;
}

export type PlaygroundLanguage = 'python3' | 'bash' | 'docker' | 'terraform';

export const playgroundAPI = {
  run: (
    payload: {
      language: PlaygroundLanguage;
      code: string;
      testsCode?: string;
      profile?: boolean;
      memory?: boolean;
    },
    token?: string
  ): Promise<PlaygroundRunResult> =>
    fetchCapra('/api/v1/playground/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  lint: (
    code: string,
    token?: string
  ): Promise<{ diagnostics: LintDiagnostic[] }> =>
    fetchCapra('/api/v1/playground/lint', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }, token),

  format: (
    code: string,
    token?: string
  ): Promise<{ code: string; error?: string }> =>
    fetchCapra('/api/v1/playground/format', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }, token),

  share: (
    payload: { language: PlaygroundLanguage; code: string; testsCode?: string },
    token?: string
  ): Promise<{ id: string; url: string }> =>
    fetchCapra('/api/v1/playground/share', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  getShare: (
    id: string,
    token?: string
  ): Promise<{ language: string; code: string; testsCode?: string }> =>
    fetchCapra(`/api/v1/playground/share/${id}`, {}, token),
};

export { CapraAPIError };
