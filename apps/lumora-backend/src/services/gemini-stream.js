/**
 * Gemini streaming service — mirrors the SSE event format of claude.js
 * so inference.js can swap providers without changing its streaming loop.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseAnswer } from './answerParser.js';
import {
  isDesignQuestion,
  isCodingQuestion,
  isElevatorPitch,
  buildGeneralPrompt,
  buildDesignPrompt,
  CODING_SYSTEM_PROMPT,
  buildSessionContextBlock,
  getDefaultResumeContext,
  getDefaultTechnicalContext,
  selectModel,
  getAnthropicClient,
} from './claude.js';
import { getApiKey } from './adminConfig.js';
import { DETAILED_MODE_OVERRIDE, STAR_MODE_OVERRIDE, buildPitchPrompt } from './answerFormat.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_TOKENS_QUICK = 2000;
const MAX_TOKENS_DESIGN = 8000;

let _genAI = null;
let _genAIKey = null;
function getGeminiClient() {
  const apiKey = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No Gemini API key configured. Set one via Admin > API Keys or GOOGLE_AI_API_KEY env var.');
  if (!_genAI || _genAIKey !== apiKey) {
    _genAI = new GoogleGenerativeAI(apiKey);
    _genAIKey = apiKey;
  }
  return _genAI;
}

/**
 * Convert OpenAI-style message history to Gemini's { role, parts } format.
 * Gemini roles are 'user' and 'model' (not 'assistant').
 */
function toGeminiHistory(messages) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

/**
 * Stream a Gemini response as SSE-formatted event objects.
 * Signature mirrors streamResponse() in claude.js.
 */
export async function* streamResponseGemini(question, history, options = {}) {
  const {
    resumeContext = null,
    technicalContext = null,
    systemContext = null,
    retrievedContext = null,
    responseFormat = null,
    cloudProvider = 'aws',
    detailLevel = null,
    designKind = 'system',
    mode = 'general',
    model: rawModel = null,
    plan = null,
    signal = null,
    // Screenshots attached to the question, already normalized by the route
    // into Anthropic blocks: [{ mediaType, data }] with data base64.
    images = [],
  } = options;
  const hasImages = Array.isArray(images) && images.length > 0;
  const model = rawModel || DEFAULT_MODEL;

  const startTime = performance.now();

  const isShortMode = question.startsWith('[SHORT] ');
  const cleanQuestion = isShortMode ? question.slice(8) : question;
  const isBehavioral = mode === 'behavioral';

  const isDesignHeuristic = isDesignQuestion(cleanQuestion);
  const isCodingHeuristic = !isDesignHeuristic && isCodingQuestion(cleanQuestion);
  const isDesign = mode === 'design' ? true : (mode === 'coding' || isBehavioral ? false : isDesignHeuristic);
  const isCoding = mode === 'coding' ? true : (mode === 'design' || isBehavioral ? false : isCodingHeuristic);
  const isPitch = (isShortMode || isBehavioral) && isElevatorPitch(cleanQuestion);

  const groundedContext = retrievedContext
    ? `${retrievedContext}\n\n${systemContext || ''}`.trim()
    : systemContext;
  const resume = groundedContext || resumeContext || getDefaultResumeContext();
  const technical = systemContext ? '' : (technicalContext || getDefaultTechnicalContext());

  let systemInstruction;
  let maxOutputTokens;

  if (isPitch) {
    systemInstruction = buildPitchPrompt({ resume, technical });
    maxOutputTokens = 2000;
  } else if (isCoding) {
    const codingGrounding = retrievedContext ? `${retrievedContext}\n\n---\n\n` : '';
    // Every other branch feeds the caller's systemContext to the model through
    // `resume`. This one didn't read `resume` at all, so the "CURRENT CODING
    // SESSION" block that CodingSonaSidebar appends — the on-screen problem,
    // code and complexity — was assembled, shipped, and dropped here. Sona then
    // answered follow-ups with no idea which problem was on screen.
    // Tail-biased trim: the live-session block is appended LAST, so an oversized
    // context loses its middle, never the problem being asked about.
    systemInstruction = codingGrounding + CODING_SYSTEM_PROMPT + buildSessionContextBlock(systemContext);
    maxOutputTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    systemInstruction = buildDesignPrompt(resume, technical, detailLevel, cloudProvider, designKind);
    maxOutputTokens = MAX_TOKENS_DESIGN;
  } else {
    const basePrompt = buildGeneralPrompt(resume, technical);
    if (responseFormat === 'detailed') {
      systemInstruction = basePrompt + DETAILED_MODE_OVERRIDE;
      maxOutputTokens = MAX_TOKENS_DESIGN;
    } else if (responseFormat === 'star') {
      systemInstruction = basePrompt + STAR_MODE_OVERRIDE;
      maxOutputTokens = MAX_TOKENS_QUICK;
    } else {
      systemInstruction = basePrompt;
      maxOutputTokens = isShortMode ? 1200 : MAX_TOKENS_QUICK;
    }
  }

  yield { event: 'status', data: { state: 'write', msg: 'Generating answer...' } };
  yield { event: 'stream_start', data: { question, is_design: isDesign, is_coding: isCoding } };

  const chunks = [];
  let inputTokens = 0;
  let outputTokens = 0;
  const recentHistory = history.slice(-6);

  try {
    // PRIMARY: Claude (Anthropic) — restored as Sona's interview LLM. Every
    // prompt/grounding/pitch/design decision above is provider-neutral, so only
    // the streaming call differs. Ephemeral cache_control on the system block
    // keeps repeat-question TTFT low.
    const questionType = isCoding ? 'coding' : isDesign ? 'design' : (isBehavioral || isShortMode ? 'behavioral' : 'general');
    const claudeModel = (rawModel && /claude/i.test(rawModel)) ? rawModel : selectModel(plan, questionType);
    // Images ride on the CURRENT question only — history stays text. Anthropic
    // wants image blocks BEFORE the text that refers to them; with the order
    // reversed the model routinely answers the words and ignores the picture.
    const userContent = hasImages
      ? [
          ...images.map((img) => ({
            type: 'image',
            source: { type: 'base64', media_type: img.mediaType, data: img.data },
          })),
          { type: 'text', text: cleanQuestion },
        ]
      : cleanQuestion;
    const messages = [
      ...recentHistory.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: userContent },
    ];
    const stream = getAnthropicClient().messages.stream({
      model: claudeModel,
      max_tokens: maxOutputTokens,
      temperature: 0.2,
      system: [{ type: 'text', text: systemInstruction, cache_control: { type: 'ephemeral' } }],
      messages,
    }, signal ? { signal } : undefined);

    for await (const event of stream) {
      if (signal?.aborted) { try { stream.controller?.abort(); } catch { /* noop */ } break; }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        chunks.push(event.delta.text);
        yield { event: 'token', data: { t: event.delta.text } };
      }
    }
    if (signal?.aborted) return;
    const finalMessage = await stream.finalMessage();
    if (finalMessage.usage) {
      inputTokens = finalMessage.usage.input_tokens || 0;
      outputTokens = finalMessage.usage.output_tokens || 0;
    }
  } catch (err) {
    if (signal?.aborted) return;
    console.error('Claude stream error:', err);
    // FALLBACK: Claude errored BEFORE any token streamed (rate limit / key
    // exhausted / overloaded — the exact failure that drove the original Gemini
    // migration). Fall back to Gemini so the candidate still gets an answer.
    // If tokens already streamed, surface the error rather than restart.
    if (chunks.length === 0) {
      console.warn('[Sona] Claude unavailable — falling back to Gemini', model);
      try {
        const client = getGeminiClient();
        const geminiModel = client.getGenerativeModel({ model, systemInstruction });
        const chat = geminiModel.startChat({
          history: toGeminiHistory(recentHistory),
          generationConfig: { maxOutputTokens, temperature: 0.2 },
        });
        // Carry the screenshot across the fallback too. Gemini 2.5 Flash is
        // vision-capable, and sending text alone here would have it confidently
        // answer a question about a picture it was never shown — worse than an
        // error, because nothing on screen says the image was dropped.
        const geminiParts = hasImages
          ? [
              ...images.map((img) => ({ inlineData: { mimeType: img.mediaType, data: img.data } })),
              { text: cleanQuestion },
            ]
          : cleanQuestion;
        const result = await chat.sendMessageStream(geminiParts);
        for await (const chunk of result.stream) {
          if (signal?.aborted) break;
          const token = chunk.text();
          if (token) {
            chunks.push(token);
            yield { event: 'token', data: { t: token } };
          }
        }
        if (signal?.aborted) return;
        // Record Gemini's token usage — without this the fallback logged 0/0 to
        // lumora_usage_logs and AI-hours metering for a real, billed generation.
        try {
          const aggregated = await result.response;
          if (aggregated?.usageMetadata) {
            inputTokens = aggregated.usageMetadata.promptTokenCount || 0;
            outputTokens = aggregated.usageMetadata.candidatesTokenCount || 0;
          }
        } catch { /* usage metadata is best-effort */ }
      } catch (gerr) {
        if (signal?.aborted) return;
        console.error('Gemini fallback stream error:', gerr);
        yield { event: 'error', data: { msg: gerr.message || String(gerr) } };
        return;
      }
    } else {
      yield { event: 'error', data: { msg: err.message || String(err) } };
      return;
    }
  }

  if (signal?.aborted) return;

  const rawAnswer = chunks.join('');
  const latencyMs = Math.round(performance.now() - startTime);

  if (rawAnswer.trim()) {
    const parsed = parseAnswer(rawAnswer);
    yield {
      event: 'answer',
      data: {
        question: cleanQuestion,
        raw: rawAnswer,
        parsed,
        is_design: isDesign,
        is_coding: isCoding,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
      },
    };
  } else {
    yield { event: 'error', data: { msg: 'Empty response from model' } };
  }
}
