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
import { checkAndReserveInferenceSlot } from '../services/quota.js';
import { streamResponse, MODEL } from '../services/claude.js';
import { streamResponseAny } from '../services/provider-stream.js';
import { recordUsage as recordAiHours } from '../services/aiHoursMeter.js';
import { buildAnswerCacheKey, cacheGet, cacheSet, logCacheEvent } from '../services/answerCache.js';
import { retrieve, formatRetrievedContext } from '../services/retrieval.js';

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
async function recordUsage({ userId, endpoint, questionType, tokensUsed, latencyMs, success = true, errorMessage = null, reservationId = null }) {
  if (reservationId) {
    await query(
      `UPDATE lumora_usage_logs
          SET endpoint = $2, question_type = $3, tokens_used = $4, latency_ms = $5, success = $6, error_message = $7
        WHERE id = $8`,
      [userId, endpoint, questionType, tokensUsed, latencyMs, success, errorMessage, reservationId],
    );
  } else {
    await query(
      `INSERT INTO lumora_usage_logs (user_id, endpoint, question_type, tokens_used, latency_ms, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, endpoint, questionType, tokensUsed, latencyMs, success, errorMessage],
    );
  }
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
  let { question, use_search: useSearch = false, system_context: systemContext, detail_level: detailLevel, cloud_provider: cloudProvider = 'aws', mode = 'general', design_kind: designKind = null, response_format: responseFormat = null, model: preferredModel = null } = req.body;
  const VALID_MODES = ['general', 'coding', 'design', 'behavioral'];
  if (!VALID_MODES.includes(mode)) mode = 'general';
  const user = req.user;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }

  // Server-side guard: systemContext is user-assembled (resume + JD + study docs).
  // Large uploads can exceed the 200k-token API ceiling; truncate with a warning
  // rather than letting the request reach the API and fail with a 400.
  const MAX_SYSTEM_CONTEXT_CHARS = 120_000;
  if (typeof systemContext === 'string' && systemContext.length > MAX_SYSTEM_CONTEXT_CHARS) {
    console.warn(`[inference] systemContext truncated ${systemContext.length} → ${MAX_SYSTEM_CONTEXT_CHARS} chars for user ${user.id}`);
    systemContext = systemContext.slice(0, MAX_SYSTEM_CONTEXT_CHARS);
  }

  let keepaliveTimer = null;
  let reservationId = null;
  try {
    // Check daily free limit for free-tier users (atomic: check + reserve in one CTE)
    const userPlan = user.plan_type || 'free';
    if (userPlan === 'free') {
      const dailyCheck = await checkAndReserveInferenceSlot(user.id);
      if (!dailyCheck.allowed) {
        return res.status(429).json({ error: dailyCheck.message });
      }
      reservationId = dailyCheck.reservationId;
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

    // Tier 1+2 grounding — retrieve top-k chunks from Capra KB +
    // this user's Prep Kit. Hard 250ms timeout inside retrieve();
    // if it loses, retrievedContext is empty and Sona answers
    // ungrounded rather than blocking.
    const retrieved = await retrieve({
      question,
      userId: user?.id || null,
      timeoutMs: 250,
      mode,
    });
    const retrievedContext = formatRetrievedContext(retrieved.chunks);
    if (retrieved.timedOut) {
      console.warn(`[inference] retrieval timed out after ${retrieved.latencyMs}ms`);
    }

    // Auto-fire web search when retrieval is weak. User-explicit useSearch
    // (set via the UI toggle) always wins; this only flips false → true.
    const autoWebOk = process.env.RAG_AUTO_WEB_SEARCH === 'true';
    const effectiveUseSearch = useSearch || (autoWebOk && retrieved.lowConfidence);
    if (!useSearch && effectiveUseSearch) {
      console.info(`[inference] auto-enabling web search (low-confidence retrieval)`);
    }

    // Start SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    if (retrieved.chunks.length > 0) {
      const citations = retrieved.chunks.map((c) => ({
        tier: c.tier,
        source: c.source || null,
        topicId: c.topicId || c.problemSlug || null,
        topicTitle: c.topicTitle || c.problemTitle || null,
        section: c.section || null,
        docKind: c.docKind || null,
        language: c.language || null,
        url: c.url || null,
        distance: c.distance,
      }));
      sendSSE(res, 'citations', citations);
    }

    let finalAnswer = null;
    let clientDisconnected = false;
    const abortController = new AbortController();

    // Keepalive — Railway / Cloudflare proxies drop idle SSE connections after 30s.
    keepaliveTimer = setInterval(() => {
      if (!clientDisconnected) res.write(': ping\n\n');
    }, 20_000);

    req.on('close', () => {
      clientDisconnected = true;
      clearInterval(keepaliveTimer);
      // Tear down the Anthropic stream immediately so we stop getting billed
      // for tokens the user will never see.
      try { abortController.abort(); } catch {}
    });

    // Stream tokens — dispatches to Claude/OpenAI/Gemini based on preferredModel prefix
    for await (const evt of streamResponseAny(question, history, {
      useSearch: effectiveUseSearch,
      resumeContext: user.resume_text || null,
      technicalContext: user.technical_context || null,
      systemContext: systemContext || null,
      retrievedContext,
      detailLevel: detailLevel === 'basic' || detailLevel === 'full' ? detailLevel : null,
      responseFormat: ['detailed', 'star'].includes(responseFormat) ? responseFormat : null,
      cloudProvider,
      designKind,
      plan: userPlan,
      userId: user.id,
      model: preferredModel || null,
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

      // Record usage (updates reservation row for free users, inserts for paid)
      await recordUsage({
        userId: user.id,
        endpoint: 'stream',
        questionType: getQuestionType(finalAnswer),
        tokensUsed: (finalAnswer.input_tokens || 0) + (finalAnswer.output_tokens || 0),
        latencyMs: finalAnswer.latency_ms || 0,
        reservationId,
      });
      recordAiHours({
        userId: user.id,
        surface: 'lumora_inference',
        seconds: (finalAnswer.latency_ms || 0) / 1000,
        tokensIn: finalAnswer.input_tokens || 0,
        tokensOut: finalAnswer.output_tokens || 0,
        model: MODEL,
        planAtCharge: userPlan,
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
    clearInterval(keepaliveTimer);
    sendSSE(res, 'done', {});
    res.end();
  } catch (err) {
    console.error('Stream error:', err);
    clearInterval(keepaliveTimer);
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
  let { question, use_search: useSearch = false, system_context: systemContext, detail_level: detailLevel, cloud_provider: cloudProvider = 'aws', bypass_cache: bypassCache, mode = 'general', design_kind: designKind = null, response_format: responseFormat = null, model: preferredModel = null } = req.body;
  const VALID_MODES = ['general', 'coding', 'design', 'behavioral'];
  if (!VALID_MODES.includes(mode)) mode = 'general';
  const user = req.user;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  if (question.length > 50000) {
    return res.status(400).json({ error: 'Question too long. Max 50,000 characters.' });
  }

  // Behavioral mode only needs resume + JD for grounding — study docs add
  // ~15k tokens to the prompt with no benefit (RAG already selects relevant
  // behavioral snippets). Cap aggressively to cut TTFT from ~20s → ~5s.
  const MAX_SYSTEM_CONTEXT_CHARS = mode === 'behavioral' ? 45_000 : 120_000;
  if (typeof systemContext === 'string' && systemContext.length > MAX_SYSTEM_CONTEXT_CHARS) {
    console.warn(`[inference] systemContext truncated ${systemContext.length} → ${MAX_SYSTEM_CONTEXT_CHARS} chars (mode=${mode}) for user ${user.id}`);
    systemContext = systemContext.slice(0, MAX_SYSTEM_CONTEXT_CHARS);
  }

  let reservationId = null;
  try {
    // Check daily free limit for free-tier users (atomic: check + reserve in one CTE)
    const userPlan = user.plan_type || 'free';
    if (userPlan === 'free') {
      const dailyCheck = await checkAndReserveInferenceSlot(user.id);
      if (!dailyCheck.allowed) {
        return res.status(429).json({ error: dailyCheck.message });
      }
      reservationId = dailyCheck.reservationId;
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
    // Flush headers immediately so Cloudflare / Railway edge sees the
    // 200 OK before the first token. Without this the edge can hold
    // headers for ~5s waiting for body, eating into the timeout budget
    // before any content streams.
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    let finalAnswer = null;
    let clientDisconnected = false;
    // AbortController so a client navigating away mid-answer cancels
    // the upstream Anthropic call instead of letting it run to
    // completion (still billing tokens that the browser never sees).
    const abortController = new AbortController();

    // SSE keepalive — Railway / Cloudflare edge proxies close idle
    // connections at ~30s. When Anthropic stalls between tokens (model
    // overload), the user sees the SSE truncate. A 15s comment frame
    // (`: ka\n\n`) keeps the socket alive without affecting parsing.
    const keepaliveTimer = setInterval(() => {
      try { res.write(': ka\n\n'); } catch { /* socket gone */ }
    }, 15000);

    const cleanupStream = () => {
      clearInterval(keepaliveTimer);
    };

    req.on('close', () => {
      clientDisconnected = true;
      abortController.abort();
      cleanupStream();
    });
    res.on('finish', cleanupStream);

    // ── Answer-cache lookup ─────────────────────────────────────────────
    // Repeated questions (e.g., "design a tiny URL") used to fire the
    // model every time. Now we hash the request + plan + model and
    // serve a cached structured answer when available, skipping the
    // entire LLM call. Usage still meters so the paywall stays correct.
    // retrievedContext is declared here so it is in scope for the
    // streamResponse call on a cache miss; it is populated only on a
    // miss to avoid burning an OpenAI embedding + 250ms on hits.
    let retrievedContext = '';
    const cacheKey = buildAnswerCacheKey({
      question,
      systemContext,
      detailLevel,
      plan: userPlan,
      mode,
      model: preferredModel || null,
      route: 'stream',
    });
    const cached = bypassCache ? null : await cacheGet(cacheKey);
    if (bypassCache) {
      logCacheEvent('BYPASS', cacheKey, { route: 'stream', plan: userPlan });
    }
    if (cached) {
      logCacheEvent('HIT', cacheKey, { route: 'stream', plan: userPlan });
      // Replay the cached answer SSE-style. Emit stream_start so the
      // frontend can wire conversation_id, then a single answer event
      // with the cached payload. No per-token streaming — we have the
      // whole answer already.
      sendSSE(res, 'stream_start', {
        conversation_id: conversationId,
        question: cached.question || cleanTitle,
        is_design: cached.is_design || false,
        is_coding: cached.is_coding || false,
      });
      sendSSE(res, 'answer', { ...cached, conversation_id: conversationId, fromCache: true });
      sendSSE(res, 'done', { ok: true, fromCache: true });

      // Persist the user message + cached assistant reply so the
      // conversation transcript still records the exchange.
      try {
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
            cached.raw || '',
            JSON.stringify({ parsed: cached.parsed, fromCache: true }),
          ],
        );
      } catch (persistErr) {
        console.warn('[inference/stream] cached-answer persist failed:', persistErr.message);
      }

      // Meter the cached replay too. The previous code emitted the
      // answer and `return res.end()`-ed before any of the four
      // metering calls below, so:
      //   • free users could blow past the daily cap as long as the
      //     question was cached (recordUsage row never written →
      //     checkDailyFreeLimit kept returning allowed=true)
      //   • paid AI-hour pools under-counted every cache hit
      // Charge zero tokens / seconds (the LLM didn't actually fire),
      // but increment the request count so daily limits + audit logs
      // see the request.
      try {
        await recordUsage({
          userId: user.id,
          endpoint: 'stream',
          questionType: cached.is_coding ? 'coding' : (cached.is_design ? 'design' : 'general'),
          tokensUsed: 0,
          latencyMs: 0,
          reservationId,
        });
        recordAiHours({
          userId: user.id,
          surface: 'lumora_inference',
          seconds: 0,
          tokensIn: 0,
          tokensOut: 0,
          model: MODEL,
          planAtCharge: userPlan,
          fromCache: true,
        });
        await recordUsageCount(user.id, 'questions');
      } catch (mErr) {
        console.warn('[inference/stream] cached-answer metering failed:', mErr.message);
      }

      return res.end();
    }
    logCacheEvent('MISS', cacheKey, { route: 'stream', plan: userPlan });

    // Tier 1+2 grounding — retrieve top-k chunks from Capra KB +
    // this user's Prep Kit. Hard 250ms timeout inside retrieve();
    // if it loses, retrievedContext is empty and Sona answers
    // ungrounded rather than blocking.
    // Runs only on a cache MISS so cache hits pay zero retrieval cost.
    const retrieved = await retrieve({
      question,
      userId: user?.id || null,
      timeoutMs: 250,
      mode,
    });
    retrievedContext = formatRetrievedContext(retrieved.chunks);
    if (retrieved.timedOut) {
      console.warn(`[inference] retrieval timed out after ${retrieved.latencyMs}ms`);
    }
    if (retrieved.chunks.length > 0) {
      const citations = retrieved.chunks.map((c) => ({
        tier: c.tier,
        source: c.source || null,
        topicId: c.topicId || c.problemSlug || null,
        topicTitle: c.topicTitle || c.problemTitle || null,
        section: c.section || null,
        docKind: c.docKind || null,
        language: c.language || null,
        url: c.url || null,
        distance: c.distance,
      }));
      sendSSE(res, 'citations', citations);
    }

    // Auto-fire web search when retrieval is weak. User-explicit useSearch
    // (set via the UI toggle) always wins; this only flips false → true.
    const autoWebOk = process.env.RAG_AUTO_WEB_SEARCH === 'true';
    const effectiveUseSearch = useSearch || (autoWebOk && retrieved.lowConfidence);
    if (!useSearch && effectiveUseSearch) {
      console.info(`[inference] auto-enabling web search (low-confidence retrieval)`);
    }

    // Stream tokens (empty history for new conversation).
    // Pass abortController.signal so the upstream call halts when the
    // client disconnects — without this, navigating away mid-answer
    // keeps tokens billing to completion.
    for await (const evt of streamResponseAny(question, [], {
      useSearch: effectiveUseSearch,
      resumeContext: user.resume_text || null,
      technicalContext: user.technical_context || null,
      systemContext: systemContext || null,
      retrievedContext,
      detailLevel: detailLevel === 'basic' || detailLevel === 'full' ? detailLevel : null,
      responseFormat: ['detailed', 'star'].includes(responseFormat) ? responseFormat : null,
      cloudProvider,
      designKind,
      plan: userPlan,
      userId: user.id,
      model: preferredModel || null,
      signal: abortController.signal,
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

      // Record usage (updates reservation row for free users, inserts for paid)
      await recordUsage({
        userId: user.id,
        endpoint: 'stream',
        questionType: getQuestionType(finalAnswer),
        tokensUsed: (finalAnswer.input_tokens || 0) + (finalAnswer.output_tokens || 0),
        latencyMs: finalAnswer.latency_ms || 0,
        reservationId,
      });
      recordAiHours({
        userId: user.id,
        surface: 'lumora_inference',
        seconds: (finalAnswer.latency_ms || 0) / 1000,
        tokensIn: finalAnswer.input_tokens || 0,
        tokensOut: finalAnswer.output_tokens || 0,
        model: MODEL,
        planAtCharge: userPlan,
      });
      // Increment plan usage counter
      await recordUsageCount(user.id, 'questions');

      // Send message_saved event
      sendSSE(res, 'message_saved', {
        message_id: assistantMsgId,
        conversation_id: conversationId,
      });

      // Cache after DB persist succeeds — never before.
      cacheSet(cacheKey, finalAnswer).catch((err) => {
        console.warn('[inference/stream] cache write failed:', err.message);
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
