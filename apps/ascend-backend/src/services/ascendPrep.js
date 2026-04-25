import { getAnthropicClient, getOpenAIClient as getOpenAIClientFromShared } from '@camora/shared-llm';
import { getApiKey as getClaudeApiKey } from './claude.js';
import { getApiKey as getOpenAIApiKey } from './openai.js';
import { SECTION_PROMPTS } from './ascend-prep/section-prompts.js';
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

const CLAUDE_SONNET = 'claude-sonnet-4-20250514';
const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';
const DEFAULT_CLAUDE_MODEL = CLAUDE_SONNET;
const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const MAX_TOKENS_PER_SECTION = 12000; // Thorough section fits in 8-10K tokens
const MAX_TOKENS_CUSTOM_SECTION = 16000; // Custom sections with document parsing
const MAX_TOKENS_HAIKU_SECTION = 6000; // Non-technical sections (HR, pitch, behavioral) are shorter

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

// Generate a single section using Claude
export async function* generateSectionClaude(section, inputs, model = DEFAULT_CLAUDE_MODEL) {
  // Enrich inputs with web search for relevant sections
  const enrichedInputs = await enrichWithWebSearch(inputs, section);
  const context = buildContext(enrichedInputs, section);
  const sectionPrompt = SECTION_PROMPTS[section];

  if (!sectionPrompt) {
    throw new Error(`Unknown section: ${section}`);
  }

  // Get company name for prompts
  const companyName = inputs.companyName || inputs.resolvedCompanyName || extractCompanyName(inputs.jobDescription || '');

  // Use extended system prompt for coding/system-design sections
  const isDetailedSection = ['coding', 'system-design', 'techstack', 'rrk'].includes(section);
  const companyContext = companyName
    ? `\n\nCRITICAL: You are preparing content SPECIFICALLY for ${companyName}.
- Use ${companyName}'s actual interview format, known questions, and company culture
- Reference ${companyName}'s real products, tech stack, and business challenges
- Generate questions that ${companyName} is ACTUALLY known to ask (from Glassdoor, LeetCode, Blind)
- DO NOT use generic questions - every question must be tailored to ${companyName}'s interview process
- Include ${companyName}-specific context like their Leadership Principles, engineering culture, or values`
    : '';

  const systemPrompt = isDetailedSection
    ? `You are an expert interview coach with deep knowledge of technical interviews at top tech companies.
Your task is to provide COMPREHENSIVE, DETAILED preparation materials.
For coding questions: Include COMPLETE working code with LINE-BY-LINE explanations and ALL edge cases.
For system design: Include ASCII architecture diagrams, capacity calculations, and detailed component breakdowns.
You MUST reference any prep materials provided by the candidate.${companyContext}
Return ONLY valid JSON - no markdown, no code blocks. Start with { and end with }.`
    : `You are a concise interview coach specializing in company-specific interview preparation. Give specific, actionable advice based on the resume and job description. Be direct and practical.${companyContext}
Return ONLY valid JSON - no markdown, no code blocks, no explanations before or after. Start your response with { and end with }.`;

  const userMessage = `${context}\n\n${sectionPrompt}\n\nCRITICAL: Return ONLY the JSON object. Do NOT wrap in \`\`\`json code blocks. Start directly with { and end with }.`;

  // Token budget: custom sections need more room for document extraction,
  // Haiku (non-technical) sections are shorter, Sonnet (technical) get standard budget
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
    // Capture stop reason to detect truncation
    if (event.type === 'message_delta' && event.delta?.stop_reason) {
      stopReason = event.delta.stop_reason;
    }
  }

  // Log if response was truncated
  if (stopReason === 'max_tokens') {
    console.warn(`[AscendPrep] Response truncated by max_tokens for section: ${section}`);
  }
  console.log(`[AscendPrep] Response completed. Stop reason: ${stopReason}, Length: ${fullText.length}`);

  // Parse final result
  try {
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) ||
                      fullText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : fullText;
    const result = JSON.parse(jsonStr);
    // Clean up all text content in the result
    yield { done: true, result: cleanupResult(result) };
  } catch (err) {
    console.error(`[AscendPrep] JSON parse failed for section ${section}:`, err.message);
    console.error(`[AscendPrep] JSON error position context:`, fullText.substring(Math.max(0, 11100), 11150));

    // Try to repair common JSON issues
    try {
      let repairedJson = fullText;
      // Fix truncated JSON by adding closing braces/brackets
      if (stopReason === 'max_tokens') {
        // Count open braces/brackets
        const openBraces = (repairedJson.match(/\{/g) || []).length;
        const closeBraces = (repairedJson.match(/\}/g) || []).length;
        const openBrackets = (repairedJson.match(/\[/g) || []).length;
        const closeBrackets = (repairedJson.match(/\]/g) || []).length;

        // Add missing closing characters
        repairedJson += '"'.repeat(repairedJson.split('"').length % 2 === 0 ? 0 : 1);
        repairedJson += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        repairedJson += '}'.repeat(Math.max(0, openBraces - closeBraces));

        console.log(`[AscendPrep] Attempted JSON repair: added ${openBraces - closeBraces} braces, ${openBrackets - closeBrackets} brackets`);
      }

      const jsonMatch2 = repairedJson.match(/\{[\s\S]*\}/);
      if (jsonMatch2) {
        const result = JSON.parse(jsonMatch2[0]);
        console.log(`[AscendPrep] JSON repair successful`);
        yield { done: true, result: cleanupResult(result) };
        return;
      }
    } catch (repairErr) {
      console.error(`[AscendPrep] JSON repair also failed:`, repairErr.message);
    }

    // Return raw text if JSON parsing fails
    yield { done: true, result: { rawContent: cleanupText(fullText) } };
  }
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
