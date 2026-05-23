/**
 * SSE (Server-Sent Events) client for streaming Claude responses.
 */

import type { Citation, StreamStartEvent, TokenEvent, AnswerEvent, StatusEvent, ErrorEvent } from '@/types';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

// Timeout for the initial request to reach first-byte. Once the stream starts
// we rely on the stream-alive signal, not a wall-clock timeout — user answers
// can legitimately take 20-30s to complete.
const CONNECT_TIMEOUT_MS = 30_000;
// How long to wait between chunks before treating the connection as dead.
// A mid-stream TCP stall with no data and no RST will otherwise hang forever.
const SILENCE_TIMEOUT_MS = 30_000;
// How many times to retry on pre-stream network / 5xx failures. Zero retries
// once tokens are flowing — replaying would double-bill Anthropic and confuse
// the UI mid-answer.
const MAX_CONNECT_RETRIES = 2;

async function fetchWithConnectRetry(url: string, init: RequestInit): Promise<Response> {
  const outerSignal = init.signal as AbortSignal | undefined;
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_CONNECT_RETRIES; attempt++) {
    // A fresh AbortController per attempt so the connect-timeout fires the
    // right controller and doesn't bleed into the streaming phase.
    const attemptAbort = new AbortController();
    if (outerSignal?.aborted) {
      attemptAbort.abort();
    } else if (outerSignal) {
      outerSignal.addEventListener('abort', () => attemptAbort.abort(), { once: true });
    }
    const connectTimer = setTimeout(() => attemptAbort.abort(), CONNECT_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: attemptAbort.signal });
      clearTimeout(connectTimer);
      // Retry only on pre-stream 5xx; 4xx is a real answer the caller should see.
      if (response.status >= 500 && attempt < MAX_CONNECT_RETRIES) {
        lastErr = new Error(`HTTP ${response.status}`);
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        continue;
      }
      return response;
    } catch (err: any) {
      clearTimeout(connectTimer);
      // If the outer signal aborted us, re-throw so the caller's AbortError propagates.
      if (outerSignal?.aborted) throw err;
      if (err?.name === 'AbortError') {
        lastErr = new Error(`Connect timeout after ${CONNECT_TIMEOUT_MS}ms`);
      } else {
        lastErr = err;
      }
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
  responseFormat?: 'auto' | 'concise' | 'detailed' | 'star';
  /** Cloud platform the candidate is interviewing for — picked once via
   *  useCloudProvider, sent on every Sona request so design answers name
   *  services for the chosen cloud (Cosmos DB / Firestore / etc.). */
  cloudProvider?: 'auto' | 'aws' | 'azure' | 'gcp';
  /** Anthropic model ID. Empty/undefined → backend uses its env/default. */
  model?: string;
  /** When true, the backend skips the answer cache lookup and always
      generates a fresh response. The fresh result still WRITES to the
      cache so the next plain stream hits. Used by Sona/Design's
      "Regenerate" affordance. */
  bypassCache?: boolean;
  /** Mode hint for retrieval gating. The backend biases KB retrieval to
   *  a subset of sources (e.g. 'coding' → algorithm + LLD problems).
   *  Default 'general' = full hybrid search, no filter. */
  mode?: 'general' | 'coding' | 'design' | 'sql' | 'behavioral' | 'sre';
  /** Design archetype hint. When the question is detected as a design
   *  question, the backend picks a different prompt + diagram style:
   *    application    OOP / LLD / API design (LRU, parking lot, REST)
   *    infrastructure infra component (CDN, message queue, cache)
   *    system         distributed product system (Twitter, Uber)
   *  When omitted, the backend classifies from the question text and
   *  defaults to 'system' on no match. */
  designKind?: 'application' | 'system' | 'infrastructure';
  token: string;
  signal?: AbortSignal;
  onStreamStart?: (data: StreamStartEvent) => void;
  /** Called when the backend emits a `citations` SSE event (before the
   *  first token). The array may be empty if retrieval returned nothing. */
  onCitations?: (citations: Citation[]) => void;
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
    responseFormat,
    cloudProvider,
    model,
    bypassCache,
    mode,
    designKind,
    token,
    signal: externalSignal,
    onStreamStart,
    onCitations,
    onToken,
    onAnswer,
    onStatus,
    onError,
    onComplete,
  } = options;

  const abortController = new AbortController();
  // Wire external signal so caller can abort this stream. Use a
  // single { once: true } listener so the registration goes away after
  // it fires — without that, every question over the lifetime of an
  // externalSignal would accumulate a closure referencing this
  // request's controller, and the long-lived signal pinned dead
  // controllers in memory.
  if (externalSignal) {
    if (externalSignal.aborted) {
      abortController.abort();
    } else {
      externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
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
        ...(responseFormat && responseFormat !== 'auto' ? { response_format: responseFormat } : {}),
        ...(cloudProvider ? { cloud_provider: cloudProvider } : {}),
        ...(model ? { model } : {}),
        ...(bypassCache ? { bypass_cache: true } : {}),
        ...(mode && mode !== 'general' ? { mode } : {}),
        ...(designKind ? { design_kind: designKind } : {}),
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
      const silenceTimer = setTimeout(() => abortController.abort(), SILENCE_TIMEOUT_MS);
      const { done, value } = await reader.read().finally(() => clearTimeout(silenceTimer));

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
            handleEvent(currentEvent, data, { onStreamStart, onCitations, onToken, onAnswer, onStatus, onError });
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
              handleEvent(currentEvent, data, { onStreamStart, onCitations, onToken, onAnswer, onStatus, onError });
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
    onCitations?: (citations: Citation[]) => void;
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
    case 'citations':
      // data is Citation[] — the RAG chunks that grounded this answer.
      // Guard: only fire if the payload is actually an array so a
      // malformed backend frame doesn't crash the whole stream.
      if (Array.isArray(data)) callbacks.onCitations?.(data);
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
  /** When true, the backend skips the answer cache lookup and always
      generates a fresh solution. The fresh result still WRITES to the
      cache so the next plain solve hits. Used by the "Regenerate"
      button on the solution card. */
  bypassCache?: boolean;
  starterCode?: string;
  signal?: AbortSignal;
  onStreamStart?: (data: StreamStartEvent) => void;
  onCitations?: (citations: Citation[]) => void;
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
    bypassCache,
    starterCode,
    signal: externalSignal,
    onStreamStart,
    onCitations,
    onToken,
    onAnswer,
    onStatus,
    onError,
    onComplete,
  } = options;

  const abortController = new AbortController();
  if (externalSignal) {
    if (externalSignal.aborted) {
      abortController.abort();
    } else {
      externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
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
        ...(model ? { model } : {}),
        ...(bypassCache ? { bypass_cache: true } : {}),
        ...(starterCode ? { starter_code: starterCode } : {}),
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
      const silenceTimer = setTimeout(() => abortController.abort(), SILENCE_TIMEOUT_MS);
      const { done, value } = await reader.read().finally(() => clearTimeout(silenceTimer));

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
            handleEvent(currentEvent, data, { onStreamStart, onCitations, onToken, onAnswer, onStatus, onError });
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
              handleEvent(currentEvent, data, { onStreamStart, onCitations, onToken, onAnswer, onStatus, onError });
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

// ── CoFix ─────────────────────────────────────────────────────────────────

export interface CoFixChange {
  line: number;
  badge: number;
  type: 'fix' | 'added';
  label: string;
  note: string;
}

export interface CoFixAnswer {
  fixed_code: string;
  changes: CoFixChange[];
  complexity: { time: string; space: string };
  hackerrank_compatible: boolean;
}

export interface CoFixStreamOptions {
  code: string;
  hint?: string;
  company?: string;
  language: string;
  token: string;
  signal?: AbortSignal;
  onToken?: (chunk: string) => void;
  onAnswer?: (data: CoFixAnswer) => void;
  onError?: (err: { msg: string }) => void;
  onComplete?: () => void;
}

export async function streamCoFixResponse(options: CoFixStreamOptions): Promise<AbortController> {
  const { code, hint, company, language, token, signal: externalSignal, onToken, onAnswer, onError, onComplete } = options;

  const abortController = new AbortController();
  if (externalSignal) {
    if (externalSignal.aborted) {
      abortController.abort();
    } else {
      externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetchWithConnectRetry(`${API_URL}/api/v1/coding/cofix/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        code,
        language,
        ...(hint ? { hint } : {}),
        ...(company ? { company } : {}),
      }),
      credentials: 'include',
      signal: abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'CoFix stream failed' }));
      onError?.({ msg: error.error || error.detail || `HTTP error ${response.status}` });
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
      const silenceTimer = setTimeout(() => abortController.abort(), SILENCE_TIMEOUT_MS);
      const { done, value } = await reader.read().finally(() => clearTimeout(silenceTimer));

      if (done) {
        // Flush any partial frame left in buffer (final chunk may lack trailing \n)
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
            if (currentEvent === 'answer') onAnswer?.(data as CoFixAnswer);
            else if (currentEvent === 'error') onError?.({ msg: data.message });
          } catch { /* incomplete frame */ }
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
              if (currentEvent === 'token') onToken?.(data.chunk || '');
              else if (currentEvent === 'answer') onAnswer?.(data as CoFixAnswer);
              else if (currentEvent === 'error') onError?.({ msg: data.message });
              // 'done' event is a no-op here; onComplete fires on connection close to avoid double-fire
            } catch (e) {
              console.error('CoFix SSE parse error:', currentEvent, (e as Error).message);
            }
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      onError?.({ msg: error.message || 'CoFix stream error' });
    }
  } finally {
    try { await reader?.cancel(); } catch { /* already released */ }
  }

  return abortController;
}
