/**
 * Transcription service using OpenAI Whisper API.
 *
 * Migrated from Python: lumora/backend/app/services/transcription.py
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

const execFileAsync = promisify(execFile);

// Technical vocabulary prompt to improve Whisper accuracy on tech terms
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Convert an audio file to 16 kHz mono WAV using ffmpeg.
 *
 * @param {string} inputPath  - Path to the source audio file.
 * @param {string} outputPath - Destination path for the WAV file.
 */
async function convertToWav(inputPath, outputPath) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', inputPath,
    '-ar', '16000',
    '-ac', '1',
    '-f', 'wav',
    outputPath,
  ]);
}

/**
 * Transcribe an audio buffer via OpenAI Whisper.
 *
 * @param {Buffer} audioBuffer - Raw audio bytes (WebM, WAV, MP3, etc.).
 * @param {string} filename    - Original filename with extension (e.g. "audio.webm").
 * @returns {Promise<string>}  - Transcribed text.
 */
export async function transcribe(audioBuffer, filename = 'audio.webm') {
  const ext = path.extname(filename) || '.webm';
  const id = randomUUID();
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `transcribe-${id}${ext}`);
  const wavPath = path.join(tmpDir, `transcribe-${id}.wav`);

  try {
    // Write audio to a temp file
    await fs.promises.writeFile(inputPath, audioBuffer);
    console.log(`[Transcribe] Input: ${audioBuffer.length} bytes, ext=${ext}`);

    // Try WAV conversion first, fall back to sending original if ffmpeg fails
    let audioFile = inputPath;
    try {
      await convertToWav(inputPath, wavPath);
      const wavSize = (await fs.promises.stat(wavPath)).size;
      console.log(`[Transcribe] WAV converted: ${wavSize} bytes`);
      if (wavSize > 1000) audioFile = wavPath;
    } catch (ffmpegErr) {
      console.warn(`[Transcribe] ffmpeg failed, sending original: ${ffmpegErr.message}`);
    }

    // Send to OpenAI Whisper
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(audioFile),
      language: 'en',
      prompt: TECHNICAL_PROMPT,
    });

    // Handle both string response (response_format: text) and object response
    let text = '';
    if (typeof response === 'string') {
      text = response.trim();
    } else if (response?.text) {
      text = response.text.trim();
    } else {
      text = String(response).trim();
    }
    console.log(`[Transcribe] Result: "${text.slice(0, 100)}" (${text.length} chars)`);
    return text;
  } finally {
    // Clean up temp files
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(wavPath).catch(() => {});
  }
}
