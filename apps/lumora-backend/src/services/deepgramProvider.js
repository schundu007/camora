/**
 * Deepgram Nova-3 adapter, shaped like the OpenAI SDK so it drops into the
 * existing provider chain in transcription.js without touching the loop.
 *
 * WHAT THIS MEASURES, AND WHAT IT DOESN'T — read before drawing conclusions:
 * this is the PRE-RECORDED (REST) API. It A/B-tests Deepgram's accuracy and
 * per-chunk latency against OpenAI on identical audio, which is what you want
 * before committing to anything. It does NOT deliver the big win, which is
 * streaming: a WebSocket that returns partial transcripts WHILE the interviewer
 * is still talking, so the question is complete the instant they stop. That is
 * an architecture change (client WS, partial transcripts, different coalescing)
 * and deliberately not bundled here.
 *
 * Enable with DEEPGRAM_API_KEY plus TRANSCRIBE_PRIMARY=deepgram.
 */

/** Terms Whisper reliably mangles in these interviews. Deepgram's keyterm
 *  boosting is a real feature, unlike Whisper's soft prompt hint. */
const DEFAULT_KEYTERMS = [
  'Kubernetes', 'Terraform', 'ArgoCD', 'Grafana', 'Prometheus', 'Istio',
  'PostgreSQL', 'Kafka', 'Elasticsearch', 'Snowflake', 'Databricks',
  'Azure Data Factory', 'ADLS Gen2', 'Synapse', 'PySpark', 'Airflow',
  'OPENROWSET', 'medallion', 'bronze silver gold', 'Great Expectations',
  'pytest', 'Entra ID', 'Key Vault', 'CDC', 'ETL', 'ELT', 'idempotent',
  'CI/CD', 'microservices', 'observability', 'SLA', 'RBAC', 'PII',
];

function keyterms() {
  const extra = (process.env.DEEPGRAM_KEYTERMS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  return [...DEFAULT_KEYTERMS, ...extra];
}

/**
 * Returns an object exposing `audio.transcriptions.create({ file })`, matching
 * the OpenAI client surface the chain already calls. Errors carry `.status` so
 * the existing fallback logic (429 / 5xx → next provider) works unchanged.
 */
export function makeDeepgramClient(apiKey) {
  return {
    audio: {
      transcriptions: {
        async create({ file }) {
          const body = Buffer.from(await file.arrayBuffer());
          const params = new URLSearchParams({
            model: process.env.DEEPGRAM_MODEL || 'nova-3',
            language: 'en',
            smart_format: 'true',
            punctuate: 'true',
            // Filler words off: "um"/"uh" in a question adds nothing and the
            // downstream hallucination filter is happier without them.
            filler_words: 'false',
          });
          for (const k of keyterms()) params.append('keyterm', k);

          const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
            method: 'POST',
            headers: {
              Authorization: `Token ${apiKey}`,
              'Content-Type': file.type || 'audio/webm',
            },
            body,
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            const err = new Error(`Deepgram ${res.status}: ${detail.slice(0, 160)}`);
            // Surfaced so the chain's 429/5xx fallback treats it identically to
            // an OpenAI failure and moves on instead of dying.
            err.status = res.status;
            throw err;
          }

          const json = await res.json();
          const alt = json?.results?.channels?.[0]?.alternatives?.[0];
          const text = typeof alt?.transcript === 'string' ? alt.transcript.trim() : '';

          // Shaped like the OpenAI verbose_json response the caller expects.
          // Deepgram returns no no_speech_prob, so we translate its confidence
          // into the same signal: silence comes back as an empty transcript,
          // and a very low-confidence result is treated as noise rather than
          // being passed on as a phantom question.
          const confidence = typeof alt?.confidence === 'number' ? alt.confidence : 1;
          const segments = text
            ? [{ no_speech_prob: confidence < 0.3 ? 1 : 0 }]
            : [{ no_speech_prob: 1 }];

          return { text, segments, _deepgramConfidence: confidence };
        },
      },
    },
  };
}

/** True when the operator has explicitly chosen Deepgram as primary. Presence
 *  of a key alone is not enough — switching what transcribes a live interview
 *  must be a deliberate act. */
export function deepgramEnabled() {
  return !!process.env.DEEPGRAM_API_KEY && process.env.TRANSCRIBE_PRIMARY === 'deepgram';
}
