/**
 * Gemini tab — a second opinion alongside Ask Sona, answered by Gemini directly.
 *
 * This replaces an embedded aistudio.google.com <webview>. That approach could
 * not work: Google blocks Google sign-in inside embedded browsers, and the
 * detection is not defeatable from our side. UA and Sec-CH-UA request headers
 * can be rewritten, but `navigator.userAgentData` is read by JS inside their
 * page and still reports Electron — and the one override that would fix it
 * (webContents.setUserAgent) breaks the renderer's own desktop detection. See
 * the note above the PKCE flow in apps/desktop/main.js, which reached the same
 * conclusion for app login and routes it through the system browser instead.
 *
 * Calling the API directly is strictly better for what that tab was FOR: the
 * stated reason for choosing AI Studio over gemini.google.com was that it has a
 * real System instructions field. Here the system instruction is server-side —
 * always applied, one source of truth, and not something a stale DOM selector
 * can fail to fill.
 *
 * Deliberately stateless. The Gemini tab is a scratchpad for a second opinion
 * mid-interview, not a filing system: history lives in the panel's own state and
 * dies with the session. Ask Sona is the surface that persists conversations.
 */
import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../services/adminConfig.js';
import { INTERVIEW_BRIEF } from '../lib/_shared/interviewBrief.js';

const router = Router();

const GEMINI_MODEL = process.env.GEMINI_TAB_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// An interview answer is read at a glance, mid-sentence, while the candidate is
// speaking. Thinking tokens buy nothing the candidate has time to read, so the
// budget is zero — the same choice ask.js makes for its live paths.
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } };

const MAX_TURNS = 20;          // replayed history, newest-last
const MAX_CHARS_PER_TURN = 8000;
const MAX_OUTPUT_TOKENS = 8000;

let _genAI = null;
let _genAIKey = null;
function getGenAI() {
  const k = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_genAI || _genAIKey !== k) { _genAI = new GoogleGenerativeAI(k); _genAIKey = k; }
  return _genAI;
}

/**
 * Map the panel's message list onto Gemini `contents`.
 *
 * Gemini names the assistant role 'model' and rejects anything else, and it
 * rejects a history that does not start with a user turn — so drop leading
 * model turns rather than let the whole request 400.
 */
function toContents(messages) {
  const mapped = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content.slice(0, MAX_CHARS_PER_TURN) }],
    }));
  while (mapped.length && mapped[0].role === 'model') mapped.shift();
  return mapped;
}

router.post('/stream', async (req, res) => {
  const { messages } = req.body || {};
  const contents = Array.isArray(messages) ? toContents(messages) : [];
  if (!contents.length) return res.status(400).json({ error: 'messages required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Stop generating the moment the panel goes away — a live interview produces
  // a lot of superseded questions, and each one is billed until it is cut off.
  const abort = new AbortController();
  res.on('close', () => abort.abort());

  let wrote = false;
  try {
    const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: INTERVIEW_BRIEF });
    const stream = await model.generateContentStream(
      { contents, generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, ...NO_THINKING } },
      { signal: abort.signal },
    );
    for await (const chunk of stream.stream) {
      if (abort.signal.aborted) break;
      const text = chunk.text();
      if (!text) continue;
      wrote = true;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  } catch (err) {
    if (!abort.signal.aborted) {
      console.error('[Gemini] stream error:', err?.message || err);
      // Only useful if nothing streamed. Mid-stream we keep the partial answer
      // on screen rather than replacing what the candidate is already reading.
      if (!wrote) res.write(`data: ${JSON.stringify({ error: 'Gemini is temporarily unavailable. Please try again.' })}\n\n`);
    }
  }

  if (!abort.signal.aborted) {
    if (!wrote) res.write(`data: ${JSON.stringify({ error: 'No response received. Please try again.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export { router as geminiRouter };
