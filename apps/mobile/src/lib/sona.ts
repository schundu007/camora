import { LUMORA_API_URL } from './env';
import { ApiError } from './api';

export interface TranscribeResult {
  text: string;
  latency_ms?: number;
  skipped?: boolean;
}

/** Uploads a local audio file URI to lumora-backend Whisper. */
export async function transcribeAudio(
  fileUri: string,
  token: string,
): Promise<TranscribeResult> {
  const form = new FormData();
  // RN's FormData accepts the { uri, name, type } shape for file blobs.
  form.append('file', {
    uri: fileUri,
    name: 'audio.m4a',
    type: 'audio/m4a',
  } as any);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(`${LUMORA_API_URL}/api/v1/transcribe`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type — RN sets multipart boundary itself.
      },
      body: form as any,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') throw new ApiError(0, 'Transcription timed out — check your connection.');
    throw new ApiError(0, 'Cannot reach the transcription service.');
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(res.status, friendly(res.status, detail), { detail });
  }
  return res.json();
}

export interface SonaAnswer {
  raw?: string;
  parsed?: { summary?: string; sections?: Array<{ title?: string; content?: string }> };
  fromCache?: boolean;
  conversation_id?: string;
}

interface AskSonaOptions {
  token: string;
  /** Called every time we receive a new chunk of text (delta or accumulated raw). */
  onProgress?: (text: string) => void;
}

/**
 * Posts to /api/v1/inference/stream and consumes the SSE body progressively.
 * RN 0.78+ supports response.body.getReader(), so we get token-level updates
 * instead of waiting for the whole answer. Falls back to whole-body parse if
 * the runtime doesn't expose a reader.
 */
export async function askSona(
  question: string,
  tokenOrOptions: string | AskSonaOptions,
): Promise<SonaAnswer> {
  const opts: AskSonaOptions =
    typeof tokenOrOptions === 'string' ? { token: tokenOrOptions } : tokenOrOptions;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(`${LUMORA_API_URL}/api/v1/inference/stream`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ question }),
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') throw new ApiError(0, 'Request timed out — check your connection.');
    throw new ApiError(0, 'Cannot reach the library lookup service.');
  }

  if (!res.ok) {
    clearTimeout(timeoutId);
    const detail = await res.text().catch(() => '');
    throw new ApiError(res.status, friendly(res.status, detail), { detail });
  }

  // Try streaming. If unsupported, fall back to full-body parse.
  const reader = (res.body as any)?.getReader?.();
  if (!reader) {
    clearTimeout(timeoutId);
    const text = await res.text();
    return parseSseAccumulated(text, opts.onProgress);
  }

  const decoder = new TextDecoder('utf-8');
  let buffered = '';
  let answer: SonaAnswer = {};
  let deltaText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      // Process complete events (separated by \n\n).
      let idx;
      while ((idx = buffered.indexOf('\n\n')) !== -1) {
        const block = buffered.slice(0, idx);
        buffered = buffered.slice(idx + 2);
        const evt = parseEvent(block);
        if (!evt) continue;
        if (evt.event === 'answer') {
          answer = { ...answer, ...evt.data };
          if (typeof evt.data?.raw === 'string') {
            opts.onProgress?.(evt.data.raw);
          } else if (typeof evt.data?.parsed?.summary === 'string') {
            opts.onProgress?.(evt.data.parsed.summary);
          }
        } else if (evt.event === 'delta' && typeof evt.data?.token === 'string') {
          deltaText += evt.data.token;
          opts.onProgress?.(deltaText);
        } else if (evt.event === 'stream_start' && evt.data?.conversation_id) {
          answer.conversation_id = evt.data.conversation_id;
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!answer.raw && deltaText) answer.raw = deltaText;
  return answer;
}

function parseEvent(block: string): { event: string; data: any } | null {
  const lines = block.split('\n');
  let event = 'message';
  let dataRaw = '';
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataRaw += line.slice(6);
  }
  if (!dataRaw) return null;
  try { return { event, data: JSON.parse(dataRaw) }; } catch { return null; }
}

function parseSseAccumulated(body: string, onProgress?: (text: string) => void): SonaAnswer {
  let answer: SonaAnswer = {};
  let deltaText = '';
  for (const block of body.split('\n\n')) {
    const evt = parseEvent(block);
    if (!evt) continue;
    if (evt.event === 'answer') answer = { ...answer, ...evt.data };
    else if (evt.event === 'delta' && typeof evt.data?.token === 'string') {
      deltaText += evt.data.token;
      onProgress?.(deltaText);
    } else if (evt.event === 'stream_start' && evt.data?.conversation_id) {
      answer.conversation_id = evt.data.conversation_id;
    }
  }
  if (!answer.raw && deltaText) answer.raw = deltaText;
  return answer;
}

function friendly(status: number, raw: string): string {
  if (status === 401) return 'You are signed out. Sign in again to continue.';
  if (status === 402 || status === 403) return 'This feature requires an upgraded plan. Manage your plan on camora.cariara.com.';
  if (status === 429) return 'Too many requests. Slow down for a moment and try again.';
  if (status >= 500) return 'The service is having a moment. Try again shortly.';
  return raw.slice(0, 200) || `HTTP ${status}`;
}
