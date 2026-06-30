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
  getDefaultResumeContext,
  getDefaultTechnicalContext,
  selectModel,
  getAnthropicClient,
} from './claude.js';
import { getApiKey } from './adminConfig.js';

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
  } = options;
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
    systemInstruction = `You ARE the candidate in a LIVE interview happening right now. The interviewer just asked the candidate to introduce themselves. Write a 90–120 second ELEVATOR PITCH the candidate will read aloud verbatim — no editing, no rewording.

═══ VOICE — NON-NEGOTIABLE ═══
- FIRST PERSON throughout. "I'm a…", "I've owned…", "I led…", "I built…".
- NEVER write "you" / "your" / "the candidate" / third-person references.
- This is the candidate's spoken intro — one continuous, confident pitch, NOT bullet points.
- ALWAYS respond in English regardless of the language of the question or transcription.

═══ STRUCTURE (locked — do not deviate) ═══
The output MUST have EXACTLY these sections in this order with the labels verbatim:

[HEADLINE]
ONE sentence. Title + total years + core domain + the SINGLE most JD-relevant strength. ~25 words.
[/HEADLINE]

[PITCH]
CRITICAL — DO NOT restate the [HEADLINE]. Open DIRECTLY with a named company + project + metric. First word: "At", "In", or a verb ("I built…", "I led…"). A flowing 6–8 sentence narrative (NOT bullets): (1) flagship accomplishment with NAMED system + metric, (2) second/third JD-relevant experiences with metrics, (3) gap bridges — name closest analog + ramp statement, (4) why this role + why now.
NO generic claims. Every sentence must have a named company, system, OR metric.
WORD COUNT: MINIMUM 220 words, target 260.
[/PITCH]

[JD_COVERAGE]
For each top JD requirement, one line: "<requirement> → <proof point in 6–10 words>". 4–6 lines max.
[/JD_COVERAGE]

═══ CONSISTENCY RULES ═══
- ALWAYS lead the [PITCH] with the same flagship accomplishment — the most JD-relevant one. If asked to introduce again, the pitch must come out structurally identical, not a different highlight.
- ALWAYS use the same NAMED systems + numeric metrics from the resume. Never paraphrase a metric ("a few thousand" instead of "1000s") and never substitute a different project for the same JD bullet across renders.
- Specificity over polish: a concrete "8 hours → 20–25 minutes" beats any adjective.
- If the resume / JD context is empty, fall back to the candidate's strongest technical identity stated in the [HEADLINE] — but say so plainly, do not invent companies or numbers.

${resume ? `=== CANDIDATE BACKGROUND ===\n${resume}` : ''}
${technical ? `\n=== TECHNICAL KNOWLEDGE ===\n${technical}` : ''}`;
    maxOutputTokens = 2000;
  } else if (isCoding) {
    const codingGrounding = retrievedContext ? `${retrievedContext}\n\n---\n\n` : '';
    systemInstruction = codingGrounding + CODING_SYSTEM_PROMPT;
    maxOutputTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    systemInstruction = buildDesignPrompt(resume, technical, detailLevel, cloudProvider, designKind);
    maxOutputTokens = MAX_TOKENS_DESIGN;
  } else {
    const basePrompt = buildGeneralPrompt(resume, technical);
    if (responseFormat === 'detailed') {
      systemInstruction = basePrompt + `\n\nRESPONSE FORMAT OVERRIDE — DETAILED MODE:\nThe user has requested a comprehensive, detailed answer. Override the brevity rules:\n- No bullet-point cap. Use as many bullets as needed for completeness.\n- Expand each point with examples, edge cases, and depth.\n- Aim for thorough understanding, not speed.`;
      maxOutputTokens = MAX_TOKENS_DESIGN;
    } else if (responseFormat === 'star') {
      systemInstruction = basePrompt + `\n\nRESPONSE FORMAT OVERRIDE — STAR MODE:\nRegardless of question type, structure the answer using the STAR framework:\n- SITUATION: 1-2 sentences — context, company, team, problem\n- TASK: 1 sentence — your specific responsibility\n- ACTION: 3-5 bullets — concrete steps\n- RESULT: 1-2 sentences — quantifiable outcome`;
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
    const messages = [
      ...recentHistory.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: cleanQuestion },
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
        const result = await chat.sendMessageStream(cleanQuestion);
        for await (const chunk of result.stream) {
          if (signal?.aborted) break;
          const token = chunk.text();
          if (token) {
            chunks.push(token);
            yield { event: 'token', data: { t: token } };
          }
        }
        if (signal?.aborted) return;
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
