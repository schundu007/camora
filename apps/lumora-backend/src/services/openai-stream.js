/**
 * OpenAI streaming service — mirrors the SSE event format of claude.js
 * so inference.js can swap providers without changing its streaming loop.
 */
import { getOpenAIClient } from '../lib/_shared/llm.js';
import { parseAnswer } from './answerParser.js';
import {
  isDesignQuestion,
  isCodingQuestion,
  buildGeneralPrompt,
  CODING_SYSTEM_PROMPT,
  getDefaultResumeContext,
  getDefaultTechnicalContext,
} from './claude.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS_QUICK = 2000;
const MAX_TOKENS_DESIGN = 8000;

/**
 * Stream an OpenAI response as SSE-formatted event objects.
 * Signature mirrors streamResponse() in claude.js.
 */
export async function* streamResponseOpenAI(question, history, options = {}) {
  const {
    resumeContext = null,
    technicalContext = null,
    systemContext = null,
    retrievedContext = null,
    responseFormat = null,
    model = DEFAULT_MODEL,
    client: clientOverride = null,
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

  let systemPrompt;
  let maxTokens;

  if (isCoding) {
    const codingGrounding = retrievedContext ? `${retrievedContext}\n\n---\n\n` : '';
    systemPrompt = codingGrounding + CODING_SYSTEM_PROMPT;
    maxTokens = MAX_TOKENS_DESIGN;
  } else if (isDesign) {
    systemPrompt = buildGeneralPrompt(resume, technical);
    maxTokens = MAX_TOKENS_DESIGN;
  } else {
    const basePrompt = buildGeneralPrompt(resume, technical);
    if (responseFormat === 'detailed') {
      systemPrompt = basePrompt + `\n\nRESPONSE FORMAT OVERRIDE — DETAILED MODE:\nThe user has requested a comprehensive, detailed answer. Override the brevity rules:\n- No bullet-point cap. Use as many bullets as needed for completeness.\n- Expand each point with examples, edge cases, and depth.\n- For BEHAVIORAL: Give the full STAR narrative with context and nuance.\n- For TECHNICAL: Explain the "why" behind each point, include trade-offs.\n- Aim for thorough understanding, not speed.`;
      maxTokens = MAX_TOKENS_DESIGN;
    } else if (responseFormat === 'star') {
      systemPrompt = basePrompt + `\n\nRESPONSE FORMAT OVERRIDE — STAR MODE:\nRegardless of question type, structure the answer using the STAR framework:\n- SITUATION: 1-2 sentences — context, company, team, problem\n- TASK: 1 sentence — your specific responsibility or goal\n- ACTION: 3-5 bullets — concrete steps you took\n- RESULT: 1-2 sentences — quantifiable outcome and impact`;
      maxTokens = MAX_TOKENS_QUICK;
    } else {
      systemPrompt = basePrompt;
      maxTokens = isShortMode ? 1200 : MAX_TOKENS_QUICK;
    }
  }

  yield { event: 'status', data: { state: 'write', msg: 'Generating answer...' } };
  yield { event: 'stream_start', data: { question, is_design: isDesign, is_coding: isCoding } };

  const messages = [
    ...history.slice(-6),
    { role: 'user', content: cleanQuestion },
  ];

  const chunks = [];

  try {
    const client = clientOverride || getOpenAIClient();
    const stream = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }, signal ? { signal } : undefined);

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        chunks.push(token);
        yield { event: 'token', data: { t: token } };
      }
    }
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) return;
    console.error('OpenAI stream error:', err);
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
