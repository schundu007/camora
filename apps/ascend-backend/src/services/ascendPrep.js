import { getAnthropicClient, getOpenAIClient as getOpenAIClientFromShared } from '../lib/_shared/llm.js';
import { getApiKey as getClaudeApiKey } from './claude.js';
import { getApiKey as getOpenAIApiKey } from './openai.js';
import { SECTION_PROMPTS } from './ascend-prep/section-prompts.js';
import { getSchemaForSection } from './ascend-prep/section-schemas.js';
import {
  searchInterviewQuestions,
  extractCompanyName,
  extractRoleName,
  cleanupText,
  cleanupResult,
} from './ascend-prep/extractors.js';

// Wrappers around shared-llm: ascend stores per-user API keys (Settings UI),
// so we resolve at call time rather than at import. shared-llm caches the
// resulting client per-key so we still get pooling.
function getClaudeClient() {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add your API key in Settings.');
  }
  return getAnthropicClient(apiKey);
}

function getOpenAIClient() {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
  }
  return getOpenAIClientFromShared(apiKey);
}

const CLAUDE_SONNET = 'claude-sonnet-4-6';
const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';
const DEFAULT_CLAUDE_MODEL = CLAUDE_SONNET;
const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const MAX_TOKENS_PER_SECTION = 12000; // Thorough section fits in 8-10K tokens
const MAX_TOKENS_CUSTOM_SECTION = 16000; // Custom sections with document parsing
const MAX_TOKENS_HAIKU_SECTION = 12000; // Non-technical sections — behavioral STAR format needs 8-10K

/**
 * Pick the right Claude model for a given section type.
 * Technical sections (coding, system design, techstack, rrk) need Sonnet quality.
 * Non-technical sections (pitch, hr, behavioral, hiring-manager) use Haiku to cut costs ~50%.
 */
function getModelForSection(sectionType) {
  const technicalSections = ['coding', 'system-design', 'system_design', 'techstack', 'rrk', 'custom'];
  if (technicalSections.some(t => sectionType?.toLowerCase().includes(t))) {
    return CLAUDE_SONNET;
  }
  // Non-technical: pitch, hr, hiring-manager, behavioral, etc.
  return CLAUDE_HAIKU;
}


// Build the context from inputs
function buildContext(inputs, section = null) {
  let context = '';

  // Use explicit company name from frontend, fallback to extraction from JD
  const companyName = inputs.companyName || (inputs.jobDescription ? extractCompanyName(inputs.jobDescription) : null);
  const roleName = inputs.jobDescription ? extractRoleName(inputs.jobDescription) : null;

  if (companyName || roleName) {
    context += `## TARGET COMPANY & ROLE\n`;
    if (companyName) {
      context += `Company: ${companyName}\n`;
      context += `\nCRITICAL INSTRUCTION: ALL content you generate MUST be specifically tailored for ${companyName}.\n`;
      context += `- Use ${companyName}'s actual interview process, culture, and values\n`;
      context += `- Reference ${companyName}'s real products, technologies, and business model\n`;
      context += `- Generate questions that ${companyName} is known to ask based on public interview data\n`;
      context += `- DO NOT generate generic content - everything must be ${companyName}-specific\n\n`;
    }
    if (roleName) context += `Role: ${roleName}\n`;
    context += `\n`;
  }

  if (inputs.jobDescription) {
    context += `## JOB DESCRIPTION\n${inputs.jobDescription}\n\n`;
  }

  if (inputs.resume) {
    context += `## CANDIDATE RESUME\n${inputs.resume}\n\n`;
  }

  if (inputs.coverLetter) {
    context += `## COVER LETTER\n${inputs.coverLetter}\n\n`;
  }

  if (inputs.prepMaterials) {
    context += `## ADDITIONAL PREP MATERIALS (IMPORTANT - USE THIS INFORMATION)\n`;
    context += `The candidate has uploaded study materials below. You MUST reference and incorporate these materials in your response:\n\n`;
    context += `${inputs.prepMaterials}\n\n`;
    context += `---\nREMINDER: The above prep materials were uploaded by the candidate for a reason. Reference them in your response.\n\n`;
  }

  // Handle documentation array (multiple uploaded files)
  if (inputs.documentation && Array.isArray(inputs.documentation) && inputs.documentation.length > 0) {
    context += `## DOCUMENTATION & STUDY MATERIALS (CRITICAL - YOU MUST LEARN FROM THESE)\n`;
    context += `The candidate has uploaded ${inputs.documentation.length} document(s) containing important study materials, guides, and documentation.\n`;
    context += `You MUST thoroughly review and incorporate information from ALL of these documents in your response.\n`;
    context += `DO NOT ignore these materials - they contain crucial context the candidate wants you to use.\n\n`;

    inputs.documentation.forEach((doc, index) => {
      context += `### Document ${index + 1}: ${doc.name}\n`;
      context += `${doc.content}\n\n`;
      context += `--- End of ${doc.name} ---\n\n`;
    });

    context += `CRITICAL REMINDER: The above ${inputs.documentation.length} document(s) were uploaded specifically because the candidate wants you to learn from them and incorporate this knowledge into your responses. Do NOT ignore this information.\n\n`;
  }

  // Handle custom document content for custom sections
  if (inputs.customDocumentContent) {
    context += `## PRIMARY DOCUMENT FOR THIS SECTION (FOCUS ON THIS)\n`;
    context += `Document Name: ${inputs.customDocumentName || 'Custom Document'}\n\n`;
    context += `This is the PRIMARY document you must analyze and base your response on:\n\n`;
    context += `${inputs.customDocumentContent}\n\n`;
    context += `--- End of Primary Document ---\n\n`;
    context += `CRITICAL: Your entire response must be based on the above document. Extract key concepts, generate questions, and provide answers ALL derived from this document content.\n\n`;
  }

  // Add web search results for coding/system-design sections
  if (inputs.searchResults && inputs.searchResults.length > 0) {
    context += `## REAL INTERVIEW QUESTIONS FROM ONLINE RESEARCH\n`;
    context += `These are actual questions reported by candidates who interviewed at this company:\n`;
    inputs.searchResults.forEach((result, i) => {
      context += `${i + 1}. [${result.source}] ${result.question}\n`;
    });
    context += `\nIncorporate these real questions into your preparation material.\n\n`;
  }

  return context;
}

// Perform web search for interview questions
async function enrichWithWebSearch(inputs, section) {
  if (!['coding', 'system-design', 'techstack', 'hr', 'behavioral', 'hiring-manager'].includes(section)) {
    return inputs;
  }

  // Use explicit company name first, fallback to extraction
  const companyName = inputs.companyName || extractCompanyName(inputs.jobDescription || '');
  const roleName = extractRoleName(inputs.jobDescription || '');

  if (!companyName) {
    console.log('[AscendPrep] No company name available for web search');
    return inputs;
  }

  try {
    console.log(`[AscendPrep] Searching for ${companyName} ${section} interview questions`);
    const searchResults = await searchInterviewQuestions(companyName, roleName, section);
    console.log(`[AscendPrep] Found ${searchResults.length} results for ${companyName}`);
    return { ...inputs, searchResults, resolvedCompanyName: companyName };
  } catch (err) {
    console.log('[AscendPrep] Web search failed:', err.message);
    return inputs;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Reliability config — mirrors lumora-backend/coding /solve so prep
// generation stays available even when Claude is having a bad minute.
// ─────────────────────────────────────────────────────────────────────────
const TRANSPORT_BACKOFFS_MS = [500, 1500, 3500];

function isRetryableClaudeError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || err?.response?.status;
  if ([429, 502, 503, 504, 529].includes(status)) return true;
  const msg = (err.message || '').toLowerCase();
  return /overloaded|timeout|timed out|econnreset|fetch failed|socket hang up|network|terminated/.test(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fallbackModelFor(primary) {
  if (!primary) return CLAUDE_HAIKU;
  return primary.includes('haiku') ? CLAUDE_SONNET : CLAUDE_HAIKU;
}

/**
 * Generate a section using Anthropic tool_use. The model is forced to
 * call a single tool whose input_schema matches the section's expected
 * shape — the SDK delivers structured input rather than free-form text,
 * so JSON parse failures are eliminated by construction.
 *
 * Streams progress chunks (synthetic "thinking" beats so the frontend
 * spinner has something to show) and yields the final structured result.
 */
async function* generateSectionClaudeToolUse(section, inputs, model) {
  const enrichedInputs = await enrichWithWebSearch(inputs, section);
  const context = buildContext(enrichedInputs, section);
  const sectionPrompt = SECTION_PROMPTS[section];
  if (!sectionPrompt) throw new Error(`Unknown section: ${section}`);

  const schema = getSchemaForSection(section);
  if (!schema) {
    // No schema — fall back to legacy text-streaming path
    yield* generateSectionClaudeStreaming(section, inputs, model);
    return;
  }

  const companyName = inputs.companyName || inputs.resolvedCompanyName || extractCompanyName(inputs.jobDescription || '');
  const companyHint = companyName
    ? `\n\nThis preparation is SPECIFICALLY for ${companyName}. Reference their real interview format, products, tech stack, and known questions. Avoid generic content.`
    : '';

  // Compact system prompt — the schema does the structural heavy lifting,
  // so the prompt only needs to set voice + audience.
  const systemPrompt = `You are a senior interview coach for Camora. Your job is to produce concise, scannable, candidate-ready preparation material.

Voice rules — follow exactly:
  • Direct and specific. No filler ("It's important to note that...").
  • Short sentences. ≤22 words. ≤3 sentences per paragraph-shaped string field.
  • Real metrics from the resume. No fabricated numbers.
  • Plain text in string fields. NO Markdown, NO bullets-inside-strings, NO JSON-inside-strings.
  • Lists are arrays. Don't pack a list into a single comma-joined string.
  • Every acronym you use ends up in the abbreviations array.${companyHint}

Call the submit_prep tool exactly once with all the required fields.`;

  const userMessage = `${context}\n\n${sectionPrompt}`;

  const maxTokens = section.startsWith('custom')
    ? MAX_TOKENS_CUSTOM_SECTION
    : model === CLAUDE_HAIKU
      ? MAX_TOKENS_HAIKU_SECTION
      : MAX_TOKENS_PER_SECTION;

  const tool = {
    name: 'submit_prep',
    description: `Submit the structured ${section} interview-prep content to the candidate.`,
    input_schema: schema,
  };

  const stream = await getClaudeClient().messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_prep' },
    messages: [{ role: 'user', content: userMessage }],
  });

  // Periodic synthetic chunk so the frontend SSE pipe stays warm and the
  // spinner has something to render. Tool_use streams input_json_delta
  // events, which aren't human-readable, so we ignore them and emit
  // a heartbeat instead.
  const heartbeatInterval = setInterval(() => {
    // No-op — the chunk is yielded from the iterator below
  }, 5000);

  let stopReason = null;
  let lastBeat = Date.now();
  try {
    for await (const event of stream) {
      if (event.type === 'message_delta' && event.delta?.stop_reason) {
        stopReason = event.delta.stop_reason;
      }
      // Heartbeat: every ~3s of streaming, push a tiny chunk so the
      // frontend can show progress. Doesn't affect the final result.
      if (Date.now() - lastBeat > 3000) {
        lastBeat = Date.now();
        yield { chunk: '·' };
      }
    }
  } finally {
    clearInterval(heartbeatInterval);
  }

  if (stopReason === 'max_tokens') {
    console.warn(`[AscendPrep] tool_use truncated by max_tokens for section: ${section}`);
    // Truncated tool_use input is invalid — let the caller retry/fallback.
    throw new Error('TOOL_USE_TRUNCATED');
  }

  const finalMessage = await stream.finalMessage();
  const toolUseBlock = (finalMessage.content || []).find((b) => b.type === 'tool_use');
  if (!toolUseBlock || !toolUseBlock.input) {
    throw new Error('TOOL_USE_NO_INPUT');
  }

  console.log(`[AscendPrep] tool_use OK for ${section} — keys: ${Object.keys(toolUseBlock.input).join(', ')}`);
  yield { done: true, result: cleanupResult(toolUseBlock.input) };
}

/**
 * Legacy streaming path — used as a tertiary fallback if tool_use fails
 * twice. Streams free-form text, parses JSON with repair. Kept around
 * because some sections occasionally need the freedom of plain text
 * (and because it's the path we've battle-tested for months).
 */
async function* generateSectionClaudeStreaming(section, inputs, model) {
  const enrichedInputs = await enrichWithWebSearch(inputs, section);
  const context = buildContext(enrichedInputs, section);
  const sectionPrompt = SECTION_PROMPTS[section];
  if (!sectionPrompt) throw new Error(`Unknown section: ${section}`);

  const companyName = inputs.companyName || inputs.resolvedCompanyName || extractCompanyName(inputs.jobDescription || '');
  const isDetailedSection = ['coding', 'system-design', 'techstack', 'rrk'].includes(section);
  const companyContext = companyName
    ? `\n\nThis preparation is for ${companyName}. Use their actual interview format, products, tech stack, and known questions.`
    : '';

  const systemPrompt = isDetailedSection
    ? `You are an expert interview coach. Provide comprehensive, detailed preparation. Reference any prep materials provided.${companyContext}\nReturn ONLY valid JSON. Start with { and end with }. No code fences, no prose.`
    : `You are a concise interview coach. Give specific, actionable advice. Be direct.${companyContext}\nReturn ONLY valid JSON. Start with { and end with }. No code fences, no prose.`;

  const userMessage = `${context}\n\n${sectionPrompt}`;
  const maxTokens = section.startsWith('custom')
    ? MAX_TOKENS_CUSTOM_SECTION
    : model === CLAUDE_HAIKU
      ? MAX_TOKENS_HAIKU_SECTION
      : MAX_TOKENS_PER_SECTION;

  const stream = await getClaudeClient().messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  let fullText = '';
  let stopReason = null;
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      fullText += event.delta.text;
      yield { chunk: event.delta.text };
    }
    if (event.type === 'message_delta' && event.delta?.stop_reason) {
      stopReason = event.delta.stop_reason;
    }
  }
  if (stopReason === 'max_tokens') {
    console.warn(`[AscendPrep] Streaming truncated by max_tokens for ${section}`);
  }

  // Parse + repair
  try {
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : fullText;
    const result = JSON.parse(jsonStr);
    yield { done: true, result: cleanupResult(result) };
    return;
  } catch {}

  try {
    let str = fullText.trim();
    const jsonStart = str.indexOf('{');
    if (jsonStart >= 0) str = str.slice(jsonStart);
    let inStr = false, esc = false;
    for (let i = 0; i < str.length; i++) {
      if (esc) { esc = false; continue; }
      if (str[i] === '\\') { esc = true; continue; }
      if (str[i] === '"') inStr = !inStr;
    }
    if (inStr) str += '"';
    str = str.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*"?\s*$/, '').replace(/,\s*$/, '');
    const stack = [];
    inStr = false; esc = false;
    for (let i = 0; i < str.length; i++) {
      if (esc) { esc = false; continue; }
      if (str[i] === '\\') { esc = true; continue; }
      if (str[i] === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (str[i] === '{') stack.push('}');
      else if (str[i] === '[') stack.push(']');
      else if (str[i] === '}' || str[i] === ']') stack.pop();
    }
    str += stack.reverse().join('');
    const result = JSON.parse(str);
    yield { done: true, result: cleanupResult(result) };
    return;
  } catch {}

  // Final fallback: surface the raw text so the frontend can show
  // a "regenerate" prompt instead of a silent failure.
  yield { done: true, result: { rawContent: cleanupText(fullText) } };
}

/**
 * Public entry point for Claude generation. Tries tool_use first
 * (preferred — guarantees structured output), falls back to streaming
 * if tool_use fails, and on transient transport errors retries with
 * exponential-ish backoff. Final fallback flips to the opposite-tier
 * model so a Sonnet outage doesn't kill the whole feature.
 */
export async function* generateSectionClaude(section, inputs, model = DEFAULT_CLAUDE_MODEL) {
  const tryGenerator = async function* (genFn, modelToUse, label) {
    let attempt = 0;
    let lastErr;
    while (attempt <= TRANSPORT_BACKOFFS_MS.length) {
      try {
        yield* genFn(section, inputs, modelToUse);
        return;
      } catch (err) {
        lastErr = err;
        if (!isRetryableClaudeError(err) || attempt === TRANSPORT_BACKOFFS_MS.length) {
          throw err;
        }
        const wait = TRANSPORT_BACKOFFS_MS[attempt];
        console.warn(`[AscendPrep] ${label} attempt ${attempt + 1} failed (${err.message?.slice(0, 80)}), retrying in ${wait}ms`);
        await sleep(wait);
        attempt += 1;
      }
    }
    throw lastErr;
  };

  // Pass 1: tool_use on the preferred model
  try {
    yield* tryGenerator(generateSectionClaudeToolUse, model, 'tool_use');
    return;
  } catch (err) {
    console.warn(`[AscendPrep] tool_use failed for ${section} on ${model}: ${err.message?.slice(0, 120)}`);
  }

  // Pass 2: tool_use on the opposite-tier model
  const fallbackModel = fallbackModelFor(model);
  try {
    yield* tryGenerator(generateSectionClaudeToolUse, fallbackModel, 'tool_use_fallback');
    return;
  } catch (err) {
    console.warn(`[AscendPrep] tool_use fallback (${fallbackModel}) failed for ${section}: ${err.message?.slice(0, 120)}`);
  }

  // Pass 3: legacy streaming path on the preferred model — last resort.
  yield* generateSectionClaudeStreaming(section, inputs, model);
}

// Generate a single section using OpenAI
export async function* generateSectionOpenAI(section, inputs, model = DEFAULT_OPENAI_MODEL) {
  // Enrich inputs with web search for relevant sections
  const enrichedInputs = await enrichWithWebSearch(inputs, section);
  const context = buildContext(enrichedInputs, section);
  const sectionPrompt = SECTION_PROMPTS[section];

  if (!sectionPrompt) {
    throw new Error(`Unknown section: ${section}`);
  }

  // Get company name for prompts
  const companyNameOAI = inputs.companyName || inputs.resolvedCompanyName || extractCompanyName(inputs.jobDescription || '');

  // Use extended system prompt for coding/system-design sections
  const isDetailedSection = ['coding', 'system-design', 'techstack', 'rrk'].includes(section);
  const companyContextOAI = companyNameOAI
    ? `\n\nCRITICAL: You are preparing content SPECIFICALLY for ${companyNameOAI}.
- Use ${companyNameOAI}'s actual interview format, known questions, and company culture
- Reference ${companyNameOAI}'s real products, tech stack, and business challenges
- Generate questions that ${companyNameOAI} is ACTUALLY known to ask
- DO NOT use generic questions - every question must be tailored to ${companyNameOAI}'s interview process`
    : '';

  const systemPrompt = isDetailedSection
    ? `You are an expert interview coach with deep knowledge of technical interviews.
Your task is to provide COMPREHENSIVE, DETAILED preparation materials.
For coding questions: Include COMPLETE working code with LINE-BY-LINE explanations and ALL edge cases.
For system design: Include ASCII architecture diagrams, capacity calculations, and detailed component breakdowns.
You MUST reference any prep materials provided by the candidate.${companyContextOAI}
Return valid JSON.`
    : `You are a concise interview coach. Give specific, actionable advice based on the resume and job description. Be direct and practical.${companyContextOAI}
Return valid JSON.`;

  const userMessage = `${context}\n\n${sectionPrompt}`;

  // Token budget: custom sections need more room for document extraction,
  // non-technical sections are shorter (match Haiku budget for parity)
  const isNonTechnical = !['coding', 'system-design', 'system_design', 'techstack', 'rrk', 'custom'].some(
    t => section?.toLowerCase().includes(t)
  );
  const maxTokens = section.startsWith('custom')
    ? MAX_TOKENS_CUSTOM_SECTION
    : isNonTechnical
      ? MAX_TOKENS_HAIKU_SECTION
      : MAX_TOKENS_PER_SECTION;

  const stream = await getOpenAIClient().chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  });

  let fullText = '';
  let finishReason = null;

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    const text = choice?.delta?.content || '';
    if (text) {
      fullText += text;
      yield { chunk: text };
    }
    if (choice?.finish_reason) {
      finishReason = choice.finish_reason;
    }
  }

  // Log completion info
  if (finishReason === 'length') {
    console.warn(`[AscendPrep] OpenAI response truncated by length for section: ${section}`);
  }
  console.log(`[AscendPrep] OpenAI response completed. Finish reason: ${finishReason}, Length: ${fullText.length}`);

  // Parse final result
  try {
    const result = JSON.parse(fullText);
    // Clean up all text content in the result
    yield { done: true, result: cleanupResult(result) };
  } catch (err) {
    console.error(`[AscendPrep] OpenAI JSON parse failed for section ${section}:`, err.message);
    // Return raw text if JSON parsing fails
    yield { done: true, result: { rawContent: cleanupText(fullText) } };
  }
}

// Main generator function that handles provider selection
export async function* generateSection(section, inputs, provider = 'claude', model) {
  if (provider === 'openai') {
    yield* generateSectionOpenAI(section, inputs, model || DEFAULT_OPENAI_MODEL);
  } else {
    // Use smart model selection: Sonnet for technical sections, Haiku for non-technical
    const selectedModel = model || getModelForSection(section);
    console.log(`[AscendPrep] Section "${section}" → model: ${selectedModel}`);
    yield* generateSectionClaude(section, inputs, selectedModel);
  }
}

// Generate all sections sequentially
export async function* generateAllSections(inputs, sections, provider = 'claude', model) {
  for (const section of sections) {
    yield { section, status: 'started' };

    try {
      for await (const event of generateSection(section, inputs, provider, model)) {
        if (event.chunk) {
          yield { section, chunk: event.chunk };
        }
        if (event.done) {
          yield { section, status: 'completed', result: event.result };
        }
      }
    } catch (err) {
      yield { section, status: 'error', error: err.message };
    }
  }

  yield { done: true };
}
