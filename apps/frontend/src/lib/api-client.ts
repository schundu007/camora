/**
 * API client for communicating with the backend.
 */

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
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
    throw new APIError(
      response.status,
      errorData.detail || `HTTP error ${response.status}`,
      errorData
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth API
export const authAPI = {
  getMe: (token: string) =>
    fetchAPI<any>('/api/v1/auth/me', {}, token),

  refreshToken: (token: string) =>
    fetchAPI<{ access_token: string }>('/api/v1/auth/refresh', {
      method: 'POST',
    }, token),
};

// Transcription API
export const transcriptionAPI = {
  transcribe: async (
    token: string,
    audioBlob: Blob,
    filename: string,
    filterUserVoice = false
  ): Promise<{
    text: string;
    latency_ms: number;
    skipped?: boolean;
    reason?: string;
    similarity?: number;
  }> => {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    formData.append('filter_user_voice', filterUserVoice.toString());

    const response = await fetch(`${API_URL}/api/v1/transcribe`, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Transcription failed' }));
      throw new APIError(response.status, error.detail);
    }

    return response.json();
  },
};

// Speaker API
export const speakerAPI = {
  enroll: async (token: string, audioBlob: Blob, filename: string): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(`${API_URL}/api/v1/speaker/enroll`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Enrollment failed' }));
        throw new APIError(response.status, error.detail);
      }

      return response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new APIError(408, 'Voice enrollment timed out. The server may be loading the voice model for the first time — please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  },

  getStatus: async (token: string): Promise<{ enrolled: boolean }> => {
    // Use a short timeout - this is a non-critical check on mount.
    // If ai-services is down, we want to fail fast rather than hang.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      return await fetchAPI<{ enrolled: boolean }>(
        '/api/v1/speaker/status',
        { signal: controller.signal },
        token
      );
    } finally {
      clearTimeout(timeout);
    }
  },

  unenroll: async (token: string): Promise<{ success: boolean; message: string }> => {
    return fetchAPI<{ success: boolean; message: string }>('/api/v1/speaker/enroll', {
      method: 'DELETE',
    }, token);
  },
};

// Documents API - for preparation guides
export const documentsAPI = {
  upload: async (token: string, file: File): Promise<{
    success: boolean;
    filename: string;
    size: number;
    message: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/v1/documents/upload`, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new APIError(response.status, error.detail);
    }

    return response.json();
  },

  list: (token: string) =>
    fetchAPI<{
      documents: Array<{ filename: string; size: number; preview: string }>;
      count: number;
    }>('/api/v1/documents/list', {}, token),

  delete: (token: string, filename: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/api/v1/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }, token),

  search: (token: string, query: string) =>
    fetchAPI<{
      results: Array<{ filename: string; score: number; snippet: string }>;
      count: number;
    }>('/api/v1/documents/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }, token),
};

export { APIError };
