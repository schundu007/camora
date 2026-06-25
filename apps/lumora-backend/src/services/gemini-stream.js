/**
 * Gemini streaming service — mirrors the SSE event format of claude.js
 * so inference.js can swap providers without changing its streaming loop.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseAnswer } from './answerParser.js';
import {
  isDesignQuestion,
  isCodingQuestion,
  buildGeneralPrompt,
  buildDesignPrompt,
  CODING_SYSTEM_PROMPT,
  getDefaultResumeContext,
  getDefaultTechnicalContext,
} from './claude.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_TOKENS_QUICK = 2000;
const MAX_TOKENS_DESIGN = 8000;

let genAI = null;
function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY env var is required');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
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
    model = DEFAULT_MODEL,
    signal = null,
  } = options;

  const startTime = performance.now();

  const isShortMode = question.startsWith('[SHORT] ');
  const cleanQuestion = isShortMode ? question.slice(8) : question;

  const isDesign = isDesignQuestion(cleanQuestion);
  const isCoding = !isDesign && isCodingQuestion(cleanQuestion);

  const groundedContext = retrievedContext
    ? `${retrievedContext}\n\n${systemContext || ''}`.trim()
    : systemContext;
  const resume = groundedContext || resumeContext || getDefaultResumeContext();
  const technical = systemContext ? '' : (technicalContext || getDefaultTechnicalContext());

  let systemInstruction;
  let maxOutputTokens;

  if (isCoding) {
    const codingGrounding = retrievedContext ? `${retrievedContext}\n\n---\n\n` : '';
    systemInstruction = codingGrounding + CODING_SYSTEM_PROMPT;
    maxOutputTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    systemInstruction = buildDesignPrompt(resume, technical);
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

  try {
    const client = getGeminiClient();
    const geminiModel = client.getGenerativeModel({
      model,
      systemInstruction,
    });

    const geminiHistory = toGeminiHistory(history.slice(-6));
    const chat = geminiModel.startChat({
      history: geminiHistory,
      generationConfig: {
        maxOutputTokens,
        temperature: 0.2,
      },
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
  } catch (err) {
    if (signal?.aborted) return;
    console.error('Gemini stream error:', err);
    yield { event: 'error', data: { msg: err.message || String(err) } };
    return;
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
        input_tokens: 0,
        output_tokens: 0,
        latency_ms: latencyMs,
      },
    };
  } else {
    yield { event: 'error', data: { msg: 'Empty response from model' } };
  }
}
