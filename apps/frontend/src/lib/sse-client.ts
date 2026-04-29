/**
 * SSE (Server-Sent Events) client for streaming Claude responses.
 */

import type { SSEEvent, StreamStartEvent, TokenEvent, AnswerEvent, StatusEvent, ErrorEvent } from '@/types';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

// Timeout for the initial request to reach first-byte. Once the stream starts
// we rely on the stream-alive signal, not a wall-clock timeout — user answers
// can legitimately take 20-30s to complete.
const CONNECT_TIMEOUT_MS = 30_000;
// How many times to retry on pre-stream network / 5xx failures. Zero retries
// once tokens are flowing — replaying would double-bill Anthropic and confuse
// the UI mid-answer.
const MAX_CONNECT_RETRIES = 2;

async function fetchWithConnectRetry(url: string, init: RequestInit): Promise<Response> {
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_CONNECT_RETRIES; attempt++) {
    try {
      // A fresh AbortController PER ATTEMPT so the connect-timeout doesn't leak
      // into the streaming phase. We reapply the caller's signal as the fetch
      // signal (so external aborts still work).
      const connectTimer = setTimeout(() => { try { (init as any)._connectAbort?.abort(); } catch {} }, CONNECT_TIMEOUT_MS);
      try {
        const response = await fetch(url, init);
        clearTimeout(connectTimer);
        // Retry only on pre-stream 5xx; 4xx is a real answer the caller should see.
        if (response.status >= 500 && attempt < MAX_CONNECT_RETRIES) {
          lastErr = new Error(`HTTP ${response.status}`);
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          continue;
        }
        return response;
      } finally {
        clearTimeout(connectTimer);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      lastErr = err;
      if (attempt >= MAX_CONNECT_RETRIES) break;
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

export interface StreamOptions {
  conversationId?: string;
  question: string;
  useSearch?: boolean;
  systemContext?: string;
  detailLevel?: 'basic' | 'full';
  /** Anthropic model ID. Empty/undefined → backend uses its env/default. */
  model?: string;
  token: string;
  signal?: AbortSignal;
  onStreamStart?: (data: StreamStartEvent) => void;
  onToken?: (data: TokenEvent) => void;
  onAnswer?: (data: AnswerEvent) => void;
  onStatus?: (data: StatusEvent) => void;
  onError?: (data: ErrorEvent) => void;
  onComplete?: () => void;
}

/**
 * Stream a response from the Claude API.
 * Returns an abort controller to cancel the stream.
 */
export async function streamResponse(options: StreamOptions): Promise<AbortController> {
  const {
    conversationId,
    question,
    useSearch = false,
    systemContext,
    detailLevel,
    model,
    token,
    signal: externalSignal,
    onStreamStart,
    onToken,
    onAnswer,
    onStatus,
    onError,
    onComplete,
  } = options;

  const abortController = new AbortController();
  // Wire external signal so caller can abort this stream
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => abortController.abort());
  }

  const endpoint = conversationId
    ? `/api/v1/inference/conversations/${conversationId}/stream`
    : '/api/v1/stream';

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetchWithConnectRetry(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        question,
        use_search: useSearch,
        ...(systemContext ? { system_context: systemContext } : {}),
        ...(detailLevel ? { detail_level: detailLevel } : {}),
        ...(model ? { model } : {}),
      }),
      credentials: 'include',
      signal: abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Stream failed' }));
      onError?.({ msg: error.error || error.detail || error.message || `HTTP error ${response.status}` });
      return abortController;
    }

    reader = response.body?.getReader();
    if (!reader) {
      onError?.({ msg: 'No response body' });
      return abortController;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Flush remaining buffer content before completing
        if (buffer.trim()) {
          if (buffer.startsWith('event:')) {
            currentEvent = buffer.slice(6).trim();
          } else if (buffer.startsWith('data:')) {
            currentData += (currentData ? '\n' : '') + buffer.slice(5).trim();
          }
        }
        if (currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);
            handleEvent(currentEvent, data, { onStreamStart, onToken, onAnswer, onStatus, onError });
          } catch { /* incomplete */ }
        }
        onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
          currentData = '';
        } else if (line.startsWith('data:')) {
          currentData += (currentData ? '\n' : '') + line.slice(5).trim();
        } else if (line.trim() === '') {
          if (currentEvent && currentData) {
            try {
              const data = JSON.parse(currentData);
              handleEvent(currentEvent, data, { onStreamStart, onToken, onAnswer, onStatus, onError });
            } catch (e) {
              console.error('SSE parse error:', currentEvent, (e as Error).message);
            }
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      onError?.({ msg: error.message || 'Stream error' });
    }
  } finally {
    // Release the stream reader on every exit path so the underlying network
    // connection can be torn down and memory reclaimed — previously abort
    // paths left the reader locked and the response body dangling.
    try { await reader?.cancel(); } catch { /* already released */ }
  }

  return abortController;
}

function handleEvent(
  event: string,
  data: any,
  callbacks: {
    onStreamStart?: (data: StreamStartEvent) => void;
    onToken?: (data: TokenEvent) => void;
    onAnswer?: (data: AnswerEvent) => void;
    onStatus?: (data: StatusEvent) => void;
    onError?: (data: ErrorEvent) => void;
  }
) {
  switch (event) {
    case 'stream_start':
      callbacks.onStreamStart?.(data);
      break;
    case 'token':
      callbacks.onToken?.(data);
      break;
    case 'answer':
      callbacks.onAnswer?.(data);
      break;
    case 'status':
      callbacks.onStatus?.(data);
      break;
    case 'error':
      callbacks.onError?.(data);
      break;
    case 'done':
      // Terminal event — backend signals it's finished. The reader loop will
      // also see `done` from the stream closing, but handling this event
      // explicitly lets us flip isStreaming=false even when the connection
      // lingers briefly after the final SSE frame.
      break;
    default:
      break;
  }
}

export interface CodingStreamOptions {
  problem: string;
  language: string;
  token: string;
  systemContext?: string;
  /** Anthropic model ID. Empty/undefined → backend uses its env/default. */
  model?: string;
  signal?: AbortSignal;
  onStreamStart?: (data: StreamStartEvent) => void;
  onToken?: (data: TokenEvent) => void;
  onAnswer?: (data: AnswerEvent) => void;
  onStatus?: (data: StatusEvent) => void;
  onError?: (data: ErrorEvent) => void;
  onComplete?: () => void;
}

/**
 * Stream a coding solution from the Claude API.
 * Returns an abort controller to cancel the stream.
 */
export async function streamCodingResponse(options: CodingStreamOptions): Promise<AbortController> {
  const {
    problem,
    language,
    token,
    systemContext,
    model,
    signal: externalSignal,
    onStreamStart,
    onToken,
    onAnswer,
    onStatus,
    onError,
    onComplete,
  } = options;

  const abortController = new AbortController();
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => abortController.abort());
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetchWithConnectRetry(`${API_URL}/api/v1/coding/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        problem,
        language,
        ...(systemContext ? { system_context: systemContext } : {}),
      }),
      credentials: 'include',
      signal: abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Stream failed' }));
      onError?.({ msg: error.error || error.detail || error.message || `HTTP error ${response.status}` });
      return abortController;
    }

    reader = response.body?.getReader();
    if (!reader) {
      onError?.({ msg: 'No response body' });
      return abortController;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Flush remaining buffer content before completing
        if (buffer.trim()) {
          if (buffer.startsWith('event:')) {
            currentEvent = buffer.slice(6).trim();
          } else if (buffer.startsWith('data:')) {
            currentData += (currentData ? '\n' : '') + buffer.slice(5).trim();
          }
        }
        if (currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);
            handleEvent(currentEvent, data, { onStreamStart, onToken, onAnswer, onStatus, onError });
          } catch { /* incomplete */ }
        }
        onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
          currentData = '';
        } else if (line.startsWith('data:')) {
          currentData += (currentData ? '\n' : '') + line.slice(5).trim();
        } else if (line.trim() === '') {
          if (currentEvent && currentData) {
            try {
              const data = JSON.parse(currentData);
              handleEvent(currentEvent, data, { onStreamStart, onToken, onAnswer, onStatus, onError });
            } catch (e) {
              console.error('SSE parse error:', currentEvent, (e as Error).message);
            }
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      onError?.({ msg: error.message || 'Stream error' });
    }
  } finally {
    try { await reader?.cancel(); } catch { /* already released */ }
  }

  return abortController;
}

/**
 * Helper to create a streaming response in a React-friendly way.
 * Returns an object with the current state and a function to abort.
 */
