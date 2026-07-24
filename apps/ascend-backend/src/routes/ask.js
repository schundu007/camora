import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../services/adminConfig.js';
import { query } from '../config/database.js';
import { retrieveForAsk, formatContext, getCandidateBackground } from '../services/askRetrieval.js';
import { r2, R2_BUCKET } from '../lib/r2.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

/**
 * Decide how much prior conversation to replay for this question.
 *
 * Ask Sona is not a chat: during an interview each question is usually
 * independent, and users paste whole question blocks. Replaying a long,
 * confident previous answer as context made the model reuse it verbatim
 * instead of answering the new question — the same answer came back for
 * different pastes.
 *
 * So: only carry history when the new message actually reads like a
 * follow-up. A standalone question drops it entirely, which removes the
 * text the model was latching onto.
 *
 * Heuristics, deliberately conservative — when in doubt we keep history,
 * because dropping it on a genuine follow-up ("what about the second one?")
 * is the more visible failure.
 */
// A real follow-up is short. Anything longer carries its own subject and
// doesn't need the previous turn — 120 chars comfortably covers "what about
// the second one?" while excluding a pasted interview question.
const FOLLOWUP_MAX_CHARS = 120;

// Opens by referring to something unstated: "what about X", "and the second",
// "expand on that", "why?". Anchored at the start — that's what distinguishes
// a follow-up from a standalone question.
const FOLLOWUP_RE = /^(and\b|but\b|also\b|what about\b|how about\b|why\b|expand\b|elaborate\b|continue\b|go on\b|more\b|that\b|this\b|it\b|those\b|these\b|the (first|second|third|last|previous)\b)/i;

// Back-references to a prior answer, wherever they appear — these are
// unambiguous ("you said", "the above") unlike a bare pronoun.
const EXPLICIT_REF_RE = /\b(the above|previous answer|you said|your answer|as mentioned)\b/i;

// A bare pronoun only implies a follow-up near the START of the message.
// Mid-sentence it almost always refers within the same sentence — "what have
// you done about it?" is standalone, and treating it as a follow-up was
// exactly the bug that leaked the previous answer.
const LEADING_PRONOUN_RE = /^.{0,40}?\b(that|those|it|this)\b/i;

export function conversationContext(history, currentMessage) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const msg = (currentMessage || '').trim();

  // Long pastes are self-contained question blocks, never follow-ups.
  if (msg.length > FOLLOWUP_MAX_CHARS) return [];

  const looksLikeFollowup =
    FOLLOWUP_RE.test(msg) ||
    EXPLICIT_REF_RE.test(msg) ||
    (msg.length <= 60 && LEADING_PRONOUN_RE.test(msg));
  if (!looksLikeFollowup) return [];

  // A genuine follow-up needs the immediately preceding exchange, not ten
  // turns of unrelated questions.
  return history.slice(-4);
}

// Screenshot attachments on an Ask message. Accepts data URLs from the
// client, caps count/size, uploads each to R2 (private bucket), and returns
// both the Gemini vision `parts` (inlineData) and the DB rows to persist.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB per image
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function parseDataUrl(u) {
  if (typeof u !== 'string') return null;
  const m = u.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mimeType = m[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) return null;
  const data = m[2];
  if (Buffer.byteLength(data, 'base64') > MAX_IMAGE_BYTES) return null;
  return { mimeType, data };
}

async function processImages(images, userId, convId) {
  if (!Array.isArray(images) || !images.length) return { parts: [], stored: [] };
  const parsed = images.map(parseDataUrl).filter(Boolean).slice(0, MAX_IMAGES);
  const parts = [];
  const stored = [];
  for (let i = 0; i < parsed.length; i++) {
    const { mimeType, data } = parsed[i];
    parts.push({ inlineData: { mimeType, data } });
    // Only persist to R2 when we have a conversation to attach it to; the
    // vision `parts` are still sent to the model either way.
    if (userId && convId) {
      const ext = mimeType.split('/')[1] || 'png';
      const key = `ask/${userId}/${convId}/${Date.now()}-${i}.${ext}`;
      try {
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: Buffer.from(data, 'base64'),
          ContentType: mimeType,
        }));
        stored.push({ key, mimeType });
      } catch (e) {
        console.warn('[Ask] image R2 upload failed (non-fatal):', e.message);
      }
    }
  }
  return { parts, stored };
}

let _genAI = null;
let _genAIKey = null;
function getGenAI() {
  const k = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_genAI || _genAIKey !== k) { _genAI = new GoogleGenerativeAI(k); _genAIKey = k; }
  return _genAI;
}

/* Routing between the code template and the prose template.
 *
 * The old single regex matched bare topic nouns — `error`, `tree`, `search`,
 * `list`, `string`, `class` — so "explain error handling" or "how does a B-tree
 * work" got forced into the Missing Code / Full Code structure and answered
 * with a program instead of a sentence. Route on *intent* instead:
 *
 *   1. A pasted snippet or fenced block is unambiguous → code.
 *   2. An imperative to produce code ("write a function", "fix the bug") → code,
 *      unless it's phrased as a conceptual question.
 *   3. Everything else → prose.
 */
const CODE_SNIPPET_RE = /```|\bdef\s+\w+\s*\(|\bclass\s+\w+\s*[:({]|\bfunction\s+\w*\s*\(|=>\s*\{|\bfor\s*\(.*;.*;|\breturn\s+\w+\s*;/m;
/* Strong imperatives — in an interview assistant these essentially always mean
 * "produce code", whatever the object ("implement an LRU cache"). */
const CODE_STRONG_RE = /\b(write|implement|code up|complete|fill in)\b/i;
/* Weaker verbs are ambiguous ("solve this conflict", "fix the process"), so
 * they also need a code-ish object nearby. */
const CODE_WEAK_RE = /\b(fix|debug|refactor|optimi[sz]e|solve|finish)\b[^.?!]{0,40}\b(function|method|class|program|script|snippet|solution|algorithm|query|code|bug|test case|leetcode|problem)\b/i;
/* Conceptual framings stay prose even when they name code nouns — "how would
 * you implement a rate limiter" is a discussion question, not a coding task. */
const CONCEPT_RE = /^\s*(what|why|when|who|which|how\s+(do|does|would|did|can|is|are)|explain|describe|compare|contrast|tell me|walk me|talk me|difference|pros and cons|trade-?offs?)\b/i;

const looksLikeCodeTask = (text = '') =>
  CODE_SNIPPET_RE.test(text) ||
  ((CODE_STRONG_RE.test(text) || CODE_WEAK_RE.test(text)) && !CONCEPT_RE.test(text));

const GEMINI_CODING_MODEL  = 'gemini-2.5-pro-preview-05-06';
const GEMINI_GENERAL_MODEL = 'gemini-2.5-flash-preview-05-20';

const SYS_GENERAL = `You are Sona, a live interview assistant. The candidate is in an active job interview right now.

Your goal: write the ANSWER the candidate speaks out loud — not study notes about the topic.

Format every response as:

### Answer
2-4 sentences, first person ("I'd…", "In my experience…"), that directly answer the
question asked. This alone must be a complete, confident answer if they read nothing else.

### Then say
3-5 bullets that DEVELOP the answer — the reasoning, the tradeoff, the specific
mechanism, what you'd do differently at scale. Each bullet is a sentence the
candidate can speak verbatim, not a label.

### If they push
1-2 bullets: the follow-up the interviewer will ask next, and the one-line reply.

Hard rules:
- If the question has multiple parts, answer EACH part under its own bold sub-heading
  inside "Answer". Never merge them into one blended response.
- Explain WHY and HOW, not WHAT. "Shard pre-submit so devs get feedback in under 5
  minutes; run the full suite post-submit where a 40-minute tail is acceptable" — not
  "Pre-Submit Sharding: provides rapid feedback."
- Be opinionated and concrete. Take a position, name real tools, give real numbers.
- NEVER produce a taxonomy, glossary, or exhaustive category list. If a bullet reads
  like a textbook heading ("Optimize Individual Tests:", "Parallelize Execution:"),
  rewrite it as something a person would actually say.
- Total length: speakable in about 60-90 seconds. Depth beats coverage.
- This is a SPOKEN answer, so prose by default. Include a fenced code block only
  when a few lines genuinely clarify the point (a config snippet, a signature) —
  never as the answer itself, and never a full program.
- Keep tone calm and confident — never alarming
- NEVER invent personal history. Any claim about your own experience — employers,
  titles, projects, teams, dates, metrics — MUST come from the CANDIDATE BACKGROUND
  section below. If no background is provided or it doesn't cover the question,
  answer in the first person from general knowledge but do NOT fabricate a specific
  company, role, project, or number you cannot source from the background.
- ALWAYS respond in English regardless of the question language`;

const SYS_CODE = `You are Sona, a live interview coding assistant. The candidate is in an active coding interview right now.

Respond in EXACTLY this structure:

### Missing Code
\`\`\`<lang>
<only the missing or fixed part>
\`\`\`

### Full Code
\`\`\`<lang>
<complete working solution — minimal, clean>
\`\`\`

### Walk-Through (say to interviewer)
- **Line N**: <plain English explanation the candidate says out loud>
(cover every non-trivial line — candidate reads these aloud to the interviewer)

ALWAYS respond in English.`;

const SYS_CODE_DUAL = (draft) => `You are Sona, a live interview coding assistant. The candidate is in an active coding interview.

A secondary AI model produced this draft solution:
<draft>
${draft}
</draft>

Your task — carefully verify the draft against the problem:
1. Trace through the logic step by step
2. Fix every bug, off-by-one, or edge-case miss you find
3. Keep the code minimal — remove any unnecessary lines
4. Ensure the solution matches the expected output exactly

Respond in EXACTLY this structure:

### Missing Code
\`\`\`<lang>
<only the missing or fixed part>
\`\`\`

### Full Code
\`\`\`<lang>
<complete, verified working solution — minimal lines>
\`\`\`

### Walk-Through (say to interviewer)
- **Line N**: <plain English explanation the candidate says out loud>
(cover every non-trivial line — candidate reads these aloud to the interviewer)

ALWAYS respond in English.`;

// Fetch a quick non-streaming Gemini solution for cross-checking
async function fetchGeminiDraft(message, history, geminiKey, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const contents = [
      ...history.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CODING_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYS_CODE }] },
          contents,
          generationConfig: { maxOutputTokens: 4096, temperature: 0.1 },
        }),
      }
    );
    if (!resp.ok) {
      console.warn(`[Ask/Gemini-draft] ${resp.status} — skipping dual-model`);
      return null;
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('[Ask/Gemini-draft] error:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// POST /stream — streaming ask
router.post('/stream', async (req, res) => {
  try {
    const { message, history = [], provider = 'claude', conversationId, images = [] } = req.body;
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!message?.trim() && !hasImages) return res.status(400).json({ error: 'message or image required' });
    // When only a screenshot is sent, give the model an explicit instruction.
    const effectiveMessage = message?.trim() || 'Please look at the attached screenshot and help.';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const isCode = looksLikeCodeTask(effectiveMessage);
    const system = isCode ? SYS_CODE : SYS_GENERAL;
    const userId = req.user?.id;
    const dbContent = message?.trim() || '📷 Screenshot';

    // Persist conversation + user message — isolated so a missing table never kills the stream.
    // Screenshots are uploaded to R2 (keyed by conv) and the keys stored on the
    // user row; `imageParts` (inlineData) always builds so the model sees them.
    let convId = conversationId || null;
    let imageParts = [];
    try {
      if (userId && !convId) {
        const { rows } = await query(
          `INSERT INTO lumora_ask_conversations (user_id, title, provider) VALUES ($1, $2, $3) RETURNING id`,
          [userId, dbContent.slice(0, 120), provider]
        );
        convId = rows[0].id;
        res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);
      }
      const { parts, stored } = await processImages(images, userId, convId);
      imageParts = parts;
      if (userId && convId) {
        await query(
          `INSERT INTO lumora_ask_messages (conversation_id, role, content, images) VALUES ($1, 'user', $2, $3)`,
          [convId, dbContent, stored.length ? JSON.stringify(stored) : null]
        );
      }
    } catch (dbErr) {
      console.error('[Ask] DB write error (non-fatal):', dbErr.message);
      convId = null; // don't try to save reply either
    }

    const msgs = [
      ...conversationContext(history, effectiveMessage).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: effectiveMessage },
    ];

    // Gemini contents — attach the pasted screenshots (inlineData) to the last
    // user turn only. Reused by every Gemini branch below.
    const geminiContents = msgs.map((m, i) => {
      const parts = [{ text: m.content }];
      if (i === msgs.length - 1 && imageParts.length) parts.push(...imageParts);
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    let full = '';

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (provider === 'gemini' && !geminiKey) {
      console.warn('[Ask/Gemini] No API key — set GEMINI_API_KEY or GOOGLE_AI_API_KEY. Falling back to Gemini SDK.');
    }

    // ── Coding: Gemini 2.5 Pro primary (when user picks Gemini provider) ────────
    if (isCode && provider === 'gemini' && geminiKey) {
      let geminiOk = false;
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CODING_MODEL}:streamGenerateContent?key=${geminiKey}&alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYS_CODE }] },
              contents: geminiContents,
              generationConfig: { maxOutputTokens: 8000, temperature: 0.1 },
            }),
          }
        );
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.error(`[Ask/Gemini-coding] API error ${resp.status}:`, errText.slice(0, 300));
        } else {
          geminiOk = true;
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
              } catch {}
            }
          }
        }
      } catch (geminiErr) {
        console.error('[Ask/Gemini-coding] fetch error:', geminiErr.message);
      }
      if (!geminiOk || !full) full = '';
    }

    // ── Dual-model for coding questions (non-Gemini provider) ─────────────────
    // Gemini drafts a fast solution; Gemini 2.5 Flash verifies, fixes bugs, and
    // streams the minimal correct final answer. For non-coding or when Gemini key
    // is absent the path degrades to a single-model call with no UX change.
    // KB grounding: retrieve supporting chunks from lumora_kb_chunks (shared
    // Postgres) and append them to the system prompt. Fails open — retrieval
    // errors log and yield [], so Ask Sona answers ungrounded rather than 500s.
    let finalSystem = system;
    // Ground first-person answers in the candidate's OWN prep kit (resume/JD)
    // BEFORE the generic KB. Without this, "tell me about yourself" and any
    // experience question fabricate a persona — the KB is impersonal study
    // material and carries nothing about who the candidate actually is.
    // Deterministic and injected whether or not KB vector retrieval hits.
    try {
      const background = await getCandidateBackground(userId);
      if (background) finalSystem += background;
    } catch (e) {
      console.error('[Ask] candidate background skipped:', e?.message || e);
    }
    try {
      const chunks = await retrieveForAsk(effectiveMessage);
      if (chunks.length > 0) {
        finalSystem += formatContext(chunks);
        res.write(`data: ${JSON.stringify({ sources: chunks.map((c) => ({ source: c.source, title: c.topic_title, section: c.section })) })}\n\n`);
      }
    } catch (e) {
      console.error('[Ask] KB grounding skipped:', e?.message || e);
    }

    if (isCode && provider !== 'gemini' && geminiKey) {
      res.write(`data: ${JSON.stringify({ status: 'Drafting with Gemini…' })}\n\n`);
      const draft = await fetchGeminiDraft(effectiveMessage, conversationContext(history, effectiveMessage), geminiKey);
      if (draft) {
        finalSystem = SYS_CODE_DUAL(draft);
        res.write(`data: ${JSON.stringify({ status: 'Verifying with Gemini…' })}\n\n`);
      }
    }

    // ── Non-coding Gemini path (provider toggle in UI) ─────────────────────────
    if (!isCode && provider === 'gemini' && geminiKey) {
      let geminiOk = false;
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_GENERAL_MODEL}:streamGenerateContent?key=${geminiKey}&alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // finalSystem, NOT system — this path skipped the candidate
              // background AND the KB grounding, so the Gemini provider answered
              // ungrounded (and fabricated a persona) while Claude did not.
              system_instruction: { parts: [{ text: finalSystem }] },
              contents: geminiContents,
              generationConfig: { maxOutputTokens: 8000, temperature: 0.2 },
            }),
          }
        );
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.error(`[Ask/Gemini] API error ${resp.status}:`, errText.slice(0, 300));
        } else {
          geminiOk = true;
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
              } catch {}
            }
          }
        }
      } catch (geminiErr) {
        console.error('[Ask/Gemini] fetch error:', geminiErr.message);
      }
      if (!geminiOk || !full) full = '';
    }

    // ── Gemini final stream (coding always; non-coding when not Gemini-only) ──
    if (!full) {
      let geminiOk = false;
      try {
        const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: finalSystem });
        const _msgs = msgs.map(m => (Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || '')));
        // Single user turn: joined text + any pasted screenshots (inlineData).
        const _stream = await _model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: _msgs.join('\n\n') }, ...imageParts] }],
        });
        for await (const chunk of _stream.stream) {
          const token = chunk.text();
          if (token) {
            full += token;
            res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
          }
        }
        geminiOk = true;
      } catch (geminiErr) {
        console.error('[Ask/Gemini-final] stream error:', geminiErr.message);
        full = '';
      }

      if (!geminiOk || !full) {
        res.write(`data: ${JSON.stringify({ error: 'AI service is temporarily unavailable. Please try again in a moment.' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    }

    // Persist assistant reply
    if (userId && convId && full) {
      try {
        await query(
          `INSERT INTO lumora_ask_messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
          [convId, full]
        );
        await query(`UPDATE lumora_ask_conversations SET updated_at = NOW() WHERE id = $1`, [convId]);
      } catch (dbErr) {
        console.error('[Ask] DB reply save error (non-fatal):', dbErr.message);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('ask/stream error:', err);
    try { res.write(`data: ${JSON.stringify({ error: 'Something went wrong.' })}\n\n`); res.end(); } catch {}
  }
});

// GET /history — list recent conversations
router.get('/history', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, provider, updated_at FROM lumora_ask_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ conversations: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history/:id — messages for a conversation
router.get('/history/:id', async (req, res) => {
  try {
    const { rows: [conv] } = await query(
      `SELECT id FROM lumora_ask_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!conv) return res.status(404).json({ error: 'not found' });
    const { rows } = await query(
      `SELECT role, content, images FROM lumora_ask_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    // Presign each stored screenshot (private bucket) so the browser can load
    // it directly from R2 — no server proxy. jsonb comes back already-parsed.
    const messages = await Promise.all(rows.map(async (r) => {
      const images = Array.isArray(r.images)
        ? await Promise.all(r.images.map(async (im) => ({
            url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: im.key }), { expiresIn: 3600 }),
            mimeType: im.mimeType,
          })))
        : [];
      return { role: r.role, content: r.content, images };
    }));
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history/:id — delete a single conversation
router.delete('/history/:id', async (req, res) => {
  try {
    const { rows: [conv] } = await query(
      `SELECT id FROM lumora_ask_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!conv) return res.status(404).json({ error: 'not found' });
    await query(`DELETE FROM lumora_ask_messages WHERE conversation_id = $1`, [req.params.id]);
    await query(`DELETE FROM lumora_ask_conversations WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history — clear all conversations for user
router.delete('/history', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id FROM lumora_ask_conversations WHERE user_id = $1`,
      [req.user.id]
    );
    for (const { id } of rows) {
      await query(`DELETE FROM lumora_ask_messages WHERE conversation_id = $1`, [id]);
    }
    await query(`DELETE FROM lumora_ask_conversations WHERE user_id = $1`, [req.user.id]);
    res.json({ ok: true, deleted: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as askRouter };
