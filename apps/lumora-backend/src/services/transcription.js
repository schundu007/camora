import OpenAI from 'openai';
import { makeDeepgramClient } from './deepgramProvider.js';

const TECHNICAL_PROMPT = `
Transcribe accurately with technical terms: Kubernetes, Docker, Terraform, Ansible,
Jenkins, GitLab, GitHub, AWS, Azure, GCP, EC2, S3, EKS, AKS, GKE, Helm, ArgoCD,
Prometheus, Grafana, Istio, Envoy, NGINX, Redis, PostgreSQL, MongoDB, Kafka,
RabbitMQ, Elasticsearch, Kibana, Logstash, Datadog, Splunk, PagerDuty,
CI/CD, DevOps, SRE, microservices, containerization, orchestration,
Python, JavaScript, TypeScript, Go, Golang, Rust, Java, Kotlin, Scala,
API, REST, GraphQL, gRPC, WebSocket, HTTP, HTTPS, SSL, TLS, OAuth, JWT,
LeetCode, algorithm, data structure, binary search, linked list, hash map,
system design, scalability, availability, reliability, latency, throughput,
CAP theorem, ACID, BASE, eventual consistency, sharding, replication,
load balancer, reverse proxy, CDN, cache, queue, pub-sub, event-driven.
`.trim();

// Ordered list of providers to TRY. Groq first (fast + cheap), OpenAI as the
// fallback. The fallback is the whole point: Groq's free tier caps at 2000
// requests/DAY, and once exhausted every chunk 429s. Previously this returned
// a SINGLE provider and never retried the other — so a Groq rate-limit (or any
// Groq error) killed transcription mid-interview even with an OpenAI key set.
// Groq's free tier caps at 2000 requests/DAY. Once exhausted EVERY chunk 429s,
// and because the SDK retries with exponential backoff by default, each one
// burned seconds before falling back — measured at 88s for a single 23-char
// transcription during a live interview. Two guards:
//   • maxRetries: 0 — a 429 here is a quota fact, not a blip. Retrying it just
//     delays the fallback that was always going to serve the request.
//   • a circuit breaker — after the first 429 we stop calling Groq entirely for
//     a cooldown, so the remaining chunks go straight to OpenAI at full speed
//     instead of each paying a doomed round-trip.
const GROQ_COOLDOWN_MS = 15 * 60 * 1000;
let groqCooldownUntil = 0;
let lastChainSignature = '';

function isQuotaError(err) {
  return err?.status === 429 || /rate limit|quota/i.test(err?.message || '');
}

function getTranscriptionProviders() {
  // ONE RULE: a provider is used if its key is present. Order is best-first.
  // Removing a provider means removing its key — no flags, no modes.
  //
  //   1. Deepgram nova-3      — purpose-built for speech, keyterm boosting
  //   2. Groq  large-v3-turbo — fastest Whisper, skipped while quota is spent
  //   3. OpenAI 4o-mini       — current generation, always available
  //
  // whisper-1 is deliberately NOT here: it is large-V2 from 2022 and every
  // provider above beats it.
  const providers = [];

  if (process.env.DEEPGRAM_API_KEY) {
    providers.push({
      name: 'deepgram',
      client: makeDeepgramClient(process.env.DEEPGRAM_API_KEY),
      model: 'nova-3',
      responseFormat: 'json',
    });
  }

  if (process.env.GROQ_API_KEY && Date.now() >= groqCooldownUntil) {
    providers.push({
      name: 'groq',
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        // A 429 here is an exhausted daily quota, not a blip. Retrying it with
        // backoff just delays the fallback that was always going to serve it.
        maxRetries: 0,
      }),
      model: 'whisper-large-v3-turbo',
      responseFormat: 'verbose_json',
    });
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: 'openai',
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: 'gpt-4o-mini-transcribe',
      responseFormat: 'json',
    });
  }

  if (!providers.length) {
    throw new Error('No transcription provider. Set DEEPGRAM_API_KEY, GROQ_API_KEY or OPENAI_API_KEY.');
  }

  const signature = providers.map(p => `${p.name}(${p.model})`).join(' → ');
  if (signature !== lastChainSignature) {
    console.log(`[Whisper] provider chain: ${signature}`);
    lastChainSignature = signature;
  }
  return providers;
}


// Whisper no-speech threshold. Segments with no_speech_prob above this are
// silence/noise (room echo, Meet compression artifacts, loud speaker bleed).
// 0.6 is intentionally conservative — better to drop a borderline chunk than
// to send room noise to the LLM.
const NO_SPEECH_THRESHOLD = 0.6;

export async function transcribe(audioBuffer, filename = 'audio.webm') {
  const providers = getTranscriptionProviders();
  const mime = filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';

  let response;
  let lastErr;
  for (const { name, client, model, responseFormat } of providers) {
    // A fresh File per attempt — a consumed stream can't be re-sent to the
    // fallback provider.
    const file = new File([audioBuffer], filename, { type: mime });
    const startedAt = Date.now();
    try {
      response = await client.audio.transcriptions.create({
        model,
        file,
        language: 'en',
        prompt: TECHNICAL_PROMPT,
        temperature: 0,
        response_format: responseFormat || 'verbose_json',
      });
      lastErr = null;
      console.log(`[Whisper] ${name} ok in ${Date.now() - startedAt}ms`);
      break;
    } catch (err) {
      lastErr = err;
      // 429 (rate/quota) and 5xx are exactly what the fallback exists for; log
      // and try the next provider. Auth/400 errors also fall through so a
      // misconfigured primary can't take the whole feature down.
      if (name === 'groq' && isQuotaError(err)) {
        // Only log the trip, not every subsequent chunk — this fires once per
        // cooldown instead of on every utterance of the interview.
        if (Date.now() >= groqCooldownUntil) {
          console.warn(`[Whisper] groq quota exhausted — skipping it for ${GROQ_COOLDOWN_MS / 60000} min, serving from openai`);
        }
        groqCooldownUntil = Date.now() + GROQ_COOLDOWN_MS;
      } else {
        console.warn(`[Whisper] provider "${name}" failed (${err?.status ?? '?'}: ${err?.message?.slice(0, 120)}) — trying next`);
      }
    }
  }
  if (!response) throw lastErr || new Error('All transcription providers failed');

  // verbose_json gives us per-segment no_speech_prob so we can drop silence.
  if (response?.segments?.length) {
    const avgNoSpeech = response.segments.reduce((s, seg) => s + (seg.no_speech_prob ?? 0), 0) / response.segments.length;
    if (avgNoSpeech > NO_SPEECH_THRESHOLD) {
      console.log(`[Whisper] Dropping chunk — avg no_speech_prob=${avgNoSpeech.toFixed(2)}`);
      return '';
    }
  }

  if (typeof response?.text === 'string') return response.text.trim();
  if (typeof response === 'string') return response.trim();
  console.warn('[Whisper] Unexpected response shape, dropping chunk:', typeof response);
  return '';
}
