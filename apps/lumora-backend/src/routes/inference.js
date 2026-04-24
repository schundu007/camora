/**
 * Inference route — streams Claude AI responses via SSE.
 *
 * Ported from Python FastAPI inference.py.
 *
 * Endpoints:
 *   POST /conversations/:conversationId/stream — stream within existing conversation
 *   POST /stream                               — stream (auto-creates conversation)
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../lib/shared-db.js';
import { authenticate } from '../middleware/authenticate.js';
import { checkUsage, recordUsageCount } from '../middleware/usageLimits.js';
import { checkDailyFreeLimit } from '../services/quota.js';
import { streamResponse, MODEL } from '../services/claude.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Write SSE data to the response and flush.
 */
function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Record usage in lumora_usage_logs.
 */
async function recordUsage({ userId, endpoint, questionType, tokensUsed, latencyMs, success = true, errorMessage = null }) {
  await query(
    `INSERT INTO lumora_usage_logs (user_id, endpoint, question_type, tokens_used, latency_ms, success, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, endpoint, questionType, tokensUsed, latencyMs, success, errorMessage],
  );
}

/**
 * Determine question type label for usage logging.
 */
function getQuestionType(answer) {
  if (answer?.is_design) return 'design';
  if (answer?.is_coding) return 'coding';
  return 'general';
}

// ---------------------------------------------------------------------------
// POST /conversations/:conversationId/stream
// ---------------------------------------------------------------------------
router.post('/conversations/:conversationId/stream', authenticate, checkUsage('questions'), async (req, res) => {
  const { conversationId } = req.params;
  const { question, use_search: useSearch = false, system_context: systemContext, detail_level: detailLevel } = req.body;
  const user = req.user;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    // Check daily free limit for free-tier users
    const userPlan = user.plan_type || 'free';
    if (userPlan === 'free') {
      const dailyCheck = await checkDailyFreeLimit(user.id);
      if (!dailyCheck.allowed) {
        return res.status(429).json({ error: dailyCheck.message });
      }
    }

    // Verify conversation belongs to user
    const convResult = await query(
      `SELECT id FROM lumora_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, user.id],
    );
    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Load recent history (last 12 messages)
    const historyResult = await query(
      `SELECT role, content FROM lumora_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC`,
      [conversationId],
    );
    const allMessages = historyResult.rows;
    const history = allMessages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

    // Start SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let finalAnswer = null;
    let clientDisconnected = false;
    const abortController = new AbortController();

    req.on('close', () => {
      clientDisconnected = true;
      // Tear down the Anthropic stream immediately so we stop getting billed
      // for tokens the user will never see.
      try { abortController.abort(); } catch {}
    });

    // Stream tokens
    for await (const evt of streamResponse(question, history, {
      useSearch,
      resumeContext: user.resume_text || null,
      technicalContext: user.technical_context || null,
      systemContext: systemContext || null,
      detailLevel: detailLevel === 'basic' || detailLevel === 'full' ? detailLevel : null,
      plan: userPlan,
      signal: abortController.signal,
    })) {
      if (clientDisconnected) break;

      if (evt.event === 'answer') {
        finalAnswer = evt.data;
      }

      sendSSE(res, evt.event, evt.data);
    }

    // Save messages after streaming completes
    if (finalAnswer && !clientDisconnected) {
      const userMsgId = uuidv4();
      const assistantMsgId = uuidv4();

      await query(
        `INSERT INTO lumora_messages (id, conversation_id, role, content) VALUES ($1, $2, $3, $4)`,
        [userMsgId, conversationId, 'user', question],
      );

      await query(
        `INSERT INTO lumora_messages (id, conversation_id, role, content, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          assistantMsgId,
          conversationId,
          'assistant',
          finalAnswer.raw,
          JSON.stringify({
            parsed: finalAnswer.parsed,
            is_design: finalAnswer.is_design || false,
            is_coding: finalAnswer.is_coding || false,
            input_tokens: finalAnswer.input_tokens || 0,
            output_tokens: finalAnswer.output_tokens || 0,
            latency_ms: finalAnswer.latency_ms || 0,
          }),
        ],
      );

      // Update conversation title if first message
      if (allMessages.length === 0) {
        await query(
          `UPDATE lumora_conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND (title IS NULL OR title = '')`,
          [question.slice(0, 100), conversationId],
        );
      }

      // Touch updated_at on the conversation
      await query(
        `UPDATE lumora_conversations SET updated_at = NOW() WHERE id = $1`,
        [conversationId],
      );

      // Record usage
      await recordUsage({
        userId: user.id,
        endpoint: 'stream',
        questionType: getQuestionType(finalAnswer),
        tokensUsed: (finalAnswer.input_tokens || 0) + (finalAnswer.output_tokens || 0),
        latencyMs: finalAnswer.latency_ms || 0,
      });

      // Increment plan usage counter
      await recordUsageCount(user.id, 'questions');

      // Send message_saved event so frontend can attach engagement
      sendSSE(res, 'message_saved', {
        message_id: assistantMsgId,
        conversation_id: conversationId,
      });
    }

    // End SSE stream
    sendSSE(res, 'done', {});
    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    // If headers already sent, write error as SSE
    if (res.headersSent) {
      sendSSE(res, 'error', { msg: err.message || String(err) });
      sendSSE(res, 'done', {});
      res.end();
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ---------------------------------------------------------------------------
// POST /stream — stream (auto-creates conversation)
// ---------------------------------------------------------------------------
router.post('/stream', authenticate, checkUsage('questions'), async (req, res) => {
  const { question, use_search: useSearch = false, system_context: systemContext, detail_level: detailLevel } = req.body;
  const user = req.user;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  if (question.length > 50000) {
    return res.status(400).json({ error: 'Question too long. Max 50,000 characters.' });
  }

  try {
    // Check daily free limit for free-tier users
    const userPlan = user.plan_type || 'free';
    if (userPlan === 'free') {
      const dailyCheck = await checkDailyFreeLimit(user.id);
      if (!dailyCheck.allowed) {
        return res.status(429).json({ error: dailyCheck.message });
      }
    }

    // Clean title (strip internal prefixes)
    const cleanTitle = question.replace('[SYSTEM DESIGN] ', '').trim().slice(0, 100);

    // Create new conversation
    const convResult = await query(
      `INSERT INTO lumora_conversations (user_id, title) VALUES ($1, $2) RETURNING id`,
      [user.id, cleanTitle],
    );
    const conversationId = convResult.rows[0].id;

    // Start SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let finalAnswer = null;
    let clientDisconnected = false;

    req.on('close', () => {
      clientDisconnected = true;
    });

    // Stream tokens (empty history for new conversation)
    for await (const evt of streamResponse(question, [], {
      useSearch,
      resumeContext: user.resume_text || null,
      technicalContext: user.technical_context || null,
      systemContext: systemContext || null,
      detailLevel: detailLevel === 'basic' || detailLevel === 'full' ? detailLevel : null,
      plan: userPlan,
    })) {
      if (clientDisconnected) break;

      // Inject conversation_id into relevant events
      if (evt.event === 'stream_start' || evt.event === 'answer') {
        evt.data.conversation_id = conversationId;
      }

      if (evt.event === 'answer') {
        finalAnswer = evt.data;
      }

      sendSSE(res, evt.event, evt.data);
    }

    // Save messages
    if (finalAnswer && !clientDisconnected) {
      const userMsgId = uuidv4();
      const assistantMsgId = uuidv4();

      await query(
        `INSERT INTO lumora_messages (id, conversation_id, role, content) VALUES ($1, $2, $3, $4)`,
        [userMsgId, conversationId, 'user', cleanTitle],
      );

      await query(
        `INSERT INTO lumora_messages (id, conversation_id, role, content, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          assistantMsgId,
          conversationId,
          'assistant',
          finalAnswer.raw,
          JSON.stringify({
            parsed: finalAnswer.parsed,
            is_design: finalAnswer.is_design || false,
            is_coding: finalAnswer.is_coding || false,
            input_tokens: finalAnswer.input_tokens || 0,
            output_tokens: finalAnswer.output_tokens || 0,
            latency_ms: finalAnswer.latency_ms || 0,
          }),
        ],
      );

      // Record usage (logs)
      await recordUsage({
        userId: user.id,
        endpoint: 'stream',
        questionType: getQuestionType(finalAnswer),
        tokensUsed: (finalAnswer.input_tokens || 0) + (finalAnswer.output_tokens || 0),
        latencyMs: finalAnswer.latency_ms || 0,
      });
      // Increment plan usage counter
      await recordUsageCount(user.id, 'questions');

      // Send message_saved event
      sendSSE(res, 'message_saved', {
        message_id: assistantMsgId,
        conversation_id: conversationId,
      });
    }

    // End SSE stream
    sendSSE(res, 'done', {});
    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    if (res.headersSent) {
      sendSSE(res, 'error', { msg: err.message || String(err) });
      sendSSE(res, 'done', {});
      res.end();
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
