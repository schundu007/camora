// apps/ascend-backend/src/routes/ask.js
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { query } from '../config/database.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CODE_RE = /\b(fill|missing|complete|fix|write|implement|function|class|bug|error|code|loop|array|list|dict|string)\b/i;

const SYS_GENERAL = `You are Sona, a sharp coding assistant. Be direct and concise. No filler sentences.`;

const SYS_CODE = `You are Sona, a sharp coding assistant. For coding questions respond in EXACTLY this structure:

### Missing Code
\`\`\`<lang>
<only the missing or fixed part — no surrounding context>
\`\`\`

### Full Code
\`\`\`<lang>
<complete working solution>
\`\`\`

### Line Explanation
- **Line N**: what it does
(cover every non-trivial line)

For non-coding questions respond normally without these sections.`;

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
    const useGemini = provider === 'gemini' && !!geminiKey;
    if (provider === 'gemini' && !geminiKey) {
      console.warn('[Ask/Gemini] No API key — set GEMINI_API_KEY or GOOGLE_AI_API_KEY. Falling back to Claude.');
    }

    if (useGemini) {
      let geminiOk = false;
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
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

      // If Gemini failed entirely, fall back to Claude silently
      if (!geminiOk || !full) {
        full = '';
      }
    }

    if (!useGemini || !full) {
      // Claude (default / fallback)
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system,
        messages: msgs,
      });
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          full += chunk.delta.text;
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        }
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
