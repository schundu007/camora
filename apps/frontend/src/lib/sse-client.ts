/**
 * SSE (Server-Sent Events) client for streaming Claude responses.
 */

import type { SSEEvent, StreamStartEvent, TokenEvent, AnswerEvent, StatusEvent, ErrorEvent } from '@/types';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';

export interface StreamOptions {
  conversationId?: string;
  question: string;
  useSearch?: boolean;
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
    ? `/api/v1/conversations/${conversationId}/stream`
    : '/api/v1/stream';

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        question,
        use_search: useSearch,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Stream failed' }));
      onError?.({ msg: error.detail || `HTTP error ${response.status}` });
      return abortController;
    }

    const reader = response.body?.getReader();
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
    default:
      break;
  }
}

export interface CodingStreamOptions {
  problem: string;
  language: string;
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
 * Stream a coding solution from the Claude API.
 * Returns an abort controller to cancel the stream.
 */
export async function streamCodingResponse(options: CodingStreamOptions): Promise<AbortController> {
  const {
    problem,
    language,
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
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => abortController.abort());
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/coding/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        problem,
        language,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Stream failed' }));
      onError?.({ msg: error.detail || `HTTP error ${response.status}` });
      return abortController;
    }

    const reader = response.body?.getReader();
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
  }

  return abortController;
}

/**
 * Helper to create a streaming response in a React-friendly way.
 * Returns an object with the current state and a function to abort.
 */
