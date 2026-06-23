import OpenAI from 'openai';

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

function getTranscriptionClient() {
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
      model: 'whisper-large-v3-turbo',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: 'whisper-1' };
  }
  throw new Error('No transcription API key configured. Set GROQ_API_KEY or OPENAI_API_KEY.');
}

export async function transcribe(audioBuffer, filename = 'audio.webm') {
  const { client, model } = getTranscriptionClient();
  const mime = filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
  const file = new File([audioBuffer], filename, { type: mime });
  const response = await client.audio.transcriptions.create({
    model,
    file,
    language: 'en',
    prompt: TECHNICAL_PROMPT,
  });

  if (typeof response === 'string') return response.trim();
  if (typeof response?.text === 'string') return response.text.trim();
  console.warn('[Whisper] Unexpected response shape, dropping chunk:', typeof response);
  return '';
}
