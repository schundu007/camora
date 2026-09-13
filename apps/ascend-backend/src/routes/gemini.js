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

const router = Router();

const GEMINI_MODEL = process.env.GEMINI_TAB_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// An interview answer is read at a glance, mid-sentence, while the candidate is
// speaking. Thinking tokens buy nothing the candidate has time to read, so the
// budget is zero — the same choice ask.js makes for its live paths.
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } };

const MAX_TURNS = 20;          // replayed history, newest-last
const MAX_CHARS_PER_TURN = 8000;
const MAX_OUTPUT_TOKENS = 8000;

// Ported verbatim from the webview panel's INTERVIEW_SEED, which used to be
// typed into AI Studio's System instructions field. It is the product; keep it
// server-side so it cannot silently fail to apply.
const SYS_INTERVIEW = `You are supporting the user during a live technical interview. They will paste or dictate
questions as they are asked, so answer for someone reading you while speaking.

Every answer:
- Lead with the answer in one sentence. No preamble, no restating the question.
- Then at most 4 short bullets they can expand out loud.
- If the question is ambiguous, state the assumption you made and answer anyway.
  Do not ask clarifying questions — there is no time to relay them.

Coding questions — approach first, then code, then time and space complexity.
Write the solution the interviewer already recognises, not the cleverest one:
- Solve the problem as asked. Do not pattern-match the title to a similar
  well-known problem and answer that one instead.
- Plain built-ins over exotic ones: dict, not OrderedDict; list, not deque,
  unless the problem genuinely needs the queue.
- Import only what you use. No import you can avoid.
- Read stdin line by line in the order the problem states. Never slurp all of
  stdin and slice it, and never wrap reads in try/except EOFError.
- Print results in the driver. Do not return a pre-formatted string.
- Match the accepted community solution on HackerRank, CodeSignal, CoderPad or
  Glider. Familiar beats short; a shorter line count never buys unfamiliarity.

System design — start with the constraint that drives the design, then components.
Behavioural — use STAR, and keep the Result concrete and quantified.`;

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
    const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: SYS_INTERVIEW });
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
