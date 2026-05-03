import { LUMORA_API_URL } from './env';

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

  const res = await fetch(`${LUMORA_API_URL}/api/v1/transcribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type — RN sets multipart boundary itself.
    },
    body: form as any,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Transcribe failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json();
}

export interface SonaAnswer {
  raw?: string;
  parsed?: { summary?: string; sections?: Array<{ title?: string; content?: string }> };
  fromCache?: boolean;
  conversation_id?: string;
}

/**
 * Posts to /api/v1/inference/stream and consumes the SSE body to assemble
 * the final answer. We don't render per-token on mobile — RN's fetch streaming
 * is uneven across platforms — so we wait for the body to close and pick the
 * last meaningful payload (`answer` event for cached, accumulated `delta`s for
 * fresh generations).
 */
export async function askSona(
  question: string,
  token: string,
): Promise<SonaAnswer> {
  const res = await fetch(`${LUMORA_API_URL}/api/v1/inference/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Sona failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const text = await res.text();
  return parseSseAnswer(text);
}

function parseSseAnswer(body: string): SonaAnswer {
  const events = body.split('\n\n');
  let answer: SonaAnswer = {};
  let deltaText = '';
  for (const block of events) {
    const lines = block.split('\n');
    let event = 'message';
    let dataRaw = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataRaw += line.slice(6);
    }
    if (!dataRaw) continue;
    let data: any;
    try { data = JSON.parse(dataRaw); } catch { continue; }
    if (event === 'answer') {
      answer = { ...answer, ...data };
    } else if (event === 'delta' && typeof data?.token === 'string') {
      deltaText += data.token;
    } else if (event === 'stream_start' && data?.conversation_id) {
      answer.conversation_id = data.conversation_id;
    }
  }
  if (!answer.raw && deltaText) answer.raw = deltaText;
  return answer;
}
