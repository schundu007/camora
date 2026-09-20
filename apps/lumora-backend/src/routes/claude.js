/**
 * Claude tab — a second opinion alongside Ask Sona and the Gemini tab, answered
 * by Claude directly.
 *
 * This replaces an embedded claude.ai <webview>, and it replaces it for the same
 * reasons routes/gemini.js replaced the AI Studio one:
 *
 *  - The webview only existed on desktop. claude.ai sets `frame-ancestors 'none'`,
 *    so the web build could never embed it and showed a "open in a browser tab"
 *    card instead — the tab was simply missing on web.
 *  - Fitting someone else's app into a narrow panel meant injecting CSS against
 *    build-time-generated class names, which drift without notice.
 *  - The framing prompt was seeded through /new?q=<text>, a first chat turn the
 *    user could scroll past, edit or lose. Here it is a real system prompt:
 *    server-side, always applied, one source of truth.
 *  - Nothing in a webview can be dictated into. The whole point of this surface
 *    is answering a question while the interviewer is still talking, and that
 *    wants a mic, not a text box inside a sandboxed browsing context.
 *
 * Why this lives in lumora-backend and not next to routes/gemini.js: Anthropic
 * is Lumora's key to spend. ascend-backend must never hold it (see the LLM
 * Provider Separation section of CLAUDE.md) — and the `getAnthropicClient` in
 * ascend is a Gemini shim, so putting this there would have violated the rule
 * while reading as correct.
 *
 * Deliberately stateless, exactly like the Gemini tab. This is a scratchpad for
 * a second opinion mid-interview, not a filing system: history lives in the
 * panel's own state and dies with the session. Ask Sona is the surface that
 * persists conversations.
 */
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../services/adminConfig.js';
import { LIVE_ANSWER_MODEL } from '../services/modelPolicy.js';
import { INTERVIEW_BRIEF } from '../lib/_shared/interviewBrief.js';
import { parseImages, toAnthropicBlocks, attachToLastTurn } from '../lib/_shared/interviewImages.js';
import { getCandidateBackground } from '../services/candidateBackground.js';
import { retrieve, formatRetrievedContext } from '../services/retrieval.js';

const router = Router();

// Same model the live answer path already uses, through the same seam, so the
// tab cannot drift away from what the rest of Lumora answers with.
const CLAUDE_MODEL = process.env.CLAUDE_TAB_MODEL || LIVE_ANSWER_MODEL;

const MAX_TURNS = 20;          // replayed history, newest-last
const MAX_CHARS_PER_TURN = 8000;
const MAX_OUTPUT_TOKENS = 8000;

let _client = null;
let _clientKey = null;
function getClient() {
  const key = getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return null;
  if (!_client || _clientKey !== key) {
    _client = new Anthropic({ apiKey: key });
    _clientKey = key;
  }
  return _client;
}

/**
 * Map the panel's message list onto Anthropic `messages`.
 *
 * Anthropic rejects a history that does not start with a user turn, so drop
 * leading assistant turns rather than let the whole request 400 — the same
 * guard routes/gemini.js needs for the same reason.
 */
function toMessages(messages, images = []) {
  const mapped = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.slice(0, MAX_CHARS_PER_TURN),
    }));
  while (mapped.length && mapped[0].role === 'assistant') mapped.shift();
  return attachToLastTurn(mapped, parseImages(images), {
    blocksFor: toAnthropicBlocks,
    wrapText: (text) => ({ type: 'text', text }),
    contentKey: 'content',
  });
}

/** The question just asked — what retrieval should be run against. */
function lastUserText(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    const part = Array.isArray(m.content) ? m.content.find((p) => p.type === 'text') : null;
    if (part) return part.text;
  }
  return '';
}

router.post('/stream', async (req, res) => {
  const { messages, images } = req.body || {};
  const msgs = Array.isArray(messages) ? toMessages(messages, images) : [];
  if (!msgs.length) return res.status(400).json({ error: 'messages required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Stop generating the moment the panel goes away — a live interview produces
  // a lot of superseded questions, and each one is billed until it is cut off.
  const abort = new AbortController();
  res.on('close', () => abort.abort());

  // Grounding — the candidate's own prep kit and the shared knowledge base,
  // the same two lookups Ask Sona makes.
  //
  // The tab stays stateless in the sense that mattered: its CONVERSATION still
  // dies with the session. What it was also missing was the resume and the KB,
  // and that is not scratchpad behaviour but a worse answer — an experience
  // question with no resume invents a persona, which the brief forbids in
  // words but cannot prevent without the material.
  //
  // Concurrent, so a grounded turn costs max() not sum(), and both fail OPEN:
  // a retrieval error logs and the turn answers ungrounded rather than 500ing
  // mid-interview.
  let system = INTERVIEW_BRIEF;
  try {
    const userId = req.user?.id;
    const question = lastUserText(msgs);
    const [bg, kb] = await Promise.allSettled([
      getCandidateBackground(userId),
      retrieve({ question, userId, mode: 'general' }),
    ]);
    if (bg.status === 'fulfilled' && bg.value) system += bg.value;
    else if (bg.status === 'rejected') console.error('[Claude] background skipped:', bg.reason?.message || bg.reason);
    const chunks = kb.status === 'fulfilled' ? (kb.value?.chunks || []) : [];
    if (chunks.length) system += formatRetrievedContext(chunks);
    else if (kb.status === 'rejected') console.error('[Claude] KB grounding skipped:', kb.reason?.message || kb.reason);
  } catch (err) {
    console.error('[Claude] grounding skipped:', err?.message || err);
  }

  let wrote = false;
  try {
    const client = getClient();
    if (!client) throw new Error('Anthropic key not configured');
    const stream = client.messages.stream(
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: msgs,
      },
      { signal: abort.signal },
    );
    for await (const event of stream) {
      if (abort.signal.aborted) break;
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const text = event.delta.text;
        if (!text) continue;
        wrote = true;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
  } catch (err) {
    if (!abort.signal.aborted) {
      console.error('[Claude] stream error:', err?.message || err);
      // Only useful if nothing streamed. Mid-stream we keep the partial answer
      // on screen rather than replacing what the candidate is already reading.
      if (!wrote) res.write(`data: ${JSON.stringify({ error: 'Claude is temporarily unavailable. Please try again.' })}\n\n`);
    }
  }

  if (!abort.signal.aborted) {
    if (!wrote) res.write(`data: ${JSON.stringify({ error: 'No response received. Please try again.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;
