import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../services/adminConfig.js';
import { query } from '../config/database.js';

const router = Router();

let _genAI = null;
let _genAIKey = null;
function getGenAI() {
  const k = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_genAI || _genAIKey !== k) { _genAI = new GoogleGenerativeAI(k); _genAIKey = k; }
  return _genAI;
}

const CODE_RE = /\b(fill|missing|complete|fix|write|implement|function|class|bug|error|code|loop|array|list|dict|string|algorithm|sort|search|tree|graph|dp|dynamic)\b/i;

const GEMINI_CODING_MODEL  = 'gemini-2.5-pro-preview-05-06';
const GEMINI_GENERAL_MODEL = 'gemini-2.5-flash-preview-05-20';

const SYS_GENERAL = `You are Sona, a live interview assistant. The candidate is in an active job interview right now.

Your goal: give concise, interview-ready talking points the candidate can immediately reference or say out loud.
- Lead with the core answer in 1-2 sentences
- Add bullet points the candidate can walk the interviewer through
- Keep tone calm and confident — never alarming
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
    const { message, history = [], provider = 'claude', conversationId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const isCode = CODE_RE.test(message);
    const system = isCode ? SYS_CODE : SYS_GENERAL;
    const userId = req.user?.id;

    // Persist conversation + user message — isolated so a missing table never kills the stream
    let convId = conversationId || null;
    try {
      if (userId) {
        if (!convId) {
          const { rows } = await query(
            `INSERT INTO lumora_ask_conversations (user_id, title, provider) VALUES ($1, $2, $3) RETURNING id`,
            [userId, message.slice(0, 120), provider]
          );
          convId = rows[0].id;
          res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);
        }
        await query(
          `INSERT INTO lumora_ask_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
          [convId, message]
        );
      }
    } catch (dbErr) {
      console.error('[Ask] DB write error (non-fatal):', dbErr.message);
      convId = null; // don't try to save reply either
    }

    const msgs = [
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

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
              contents: msgs.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
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
    let finalSystem = system;
    if (isCode && provider !== 'gemini' && geminiKey) {
      res.write(`data: ${JSON.stringify({ status: 'Drafting with Gemini…' })}\n\n`);
      const draft = await fetchGeminiDraft(message, history, geminiKey);
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
              system_instruction: { parts: [{ text: system }] },
              contents: msgs.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
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
        const _stream = await _model.generateContentStream(_msgs.join('\n\n'));
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
      `SELECT role, content FROM lumora_ask_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ messages: rows });
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
