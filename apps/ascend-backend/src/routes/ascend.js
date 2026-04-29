import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import multer from 'multer';
import { getApiKey as getClaudeKey } from '../services/claude.js';
import { getApiKey as getOpenAIKey } from '../services/openai.js';
import * as freeUsageService from '../services/freeUsageService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const INTERVIEW_SYSTEM_PROMPT = `You are a Staff Engineer interview coach. ULTRA-COMPACT answers only.

## ABSOLUTE RULES - CRITICAL
1. MAX 100 words total - NO exceptions
2. NEVER use bullet lists - ONLY tables
3. ONE :::card[Say This] then ONLY tables
4. All content in table cells, not paragraphs
5. Answer must fit on ONE screen (no scrolling)

## FORMAT

### Opening (required):
:::card[Say This]
One sentence to speak. Max 20 words.
:::

### Everything else = TABLES ONLY:
| Column | Column | Column |
|--------|--------|--------|
| data | data | data |

## TEMPLATES

### System Design:
:::card[Say This]
"For [system], I'd use [pattern] at [scale] with [key tech]."
:::

| Ask | Stack | Numbers |
|-----|-------|---------|
| Scale? | PostgreSQL | 10K QPS |
| R/W ratio? | Redis cache | 100K QPS |
| Latency? | Kafka queue | 99.9% up |

| Trade-off | Choice | Why |
|-----------|--------|-----|
| DB | PostgreSQL | ACID |
| Cache | Redis | <1ms |

### Behavioral (STAR):
:::card[Say This]
"At [Company], I [action] resulting in [metric]."
:::

| S | T | A | R |
|---|---|---|---|
| Problem | My role | What I did | 50% improvement |

### Concept:
:::card[Say This]
"[Term] means [definition]. Key: [insight]."
:::

| What | When | Trade-off |
|------|------|-----------|
| Definition | Use case | Pro vs con |

### Coding:
:::card[Say This]
"Use [pattern] for O([time]) with [structure]."
:::

| Pattern | Time | Space | Edge |
|---------|------|-------|------|
| Name | O(n) | O(1) | Empty/null |

## BANNED
- Bullet points (use table rows)
- Long paragraphs (use table cells)
- Multiple cards (only one :::card[Say This])
- More than 100 words`;


// POST /api/ascend/answer - Generate answer for interview question (streaming)
router.post('/answer', async (req, res) => {
  const { question, context = '', provider = 'claude', model, jobDescription, resume, prepMaterial } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Check subscription/free usage
  const webappUserId = req.user?.id;
  if (webappUserId) {
    try {
      const canUse = await freeUsageService.canUseFeature(webappUserId, 'coding');
      if (!canUse.allowed) {
        return res.status(429).json({
          error: canUse.reason || 'Free trial exhausted. Please subscribe.',
          subscriptionRequired: true,
        });
      }
    } catch (e) {
      // Non-blocking — allow if check fails
    }
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  req.setTimeout(120000);

  try {
    // Build context from provided documents
    let contextParts = [];
    if (jobDescription?.trim()) {
      contextParts.push(`JOB DESCRIPTION:\n${jobDescription.trim()}`);
    }
    if (resume?.trim()) {
      contextParts.push(`CANDIDATE RESUME:\n${resume.trim()}`);
    }
    if (prepMaterial?.trim()) {
      contextParts.push(`PREPARATION NOTES:\n${prepMaterial.trim()}`);
    }
    if (context?.trim()) {
      contextParts.push(`PREVIOUS CONTEXT:\n${context.trim()}`);
    }

    const contextPrompt = contextParts.length > 0
      ? `\n\n${contextParts.join('\n\n---\n\n')}\n\n`
      : '';

    const userMessage = `${contextPrompt}QUESTION: "${question}"

Give a STAFF ENGINEER level answer tailored to the candidate's background and the job requirements if provided. Include real numbers, real technologies, real trade-offs. Tables for comparisons. No paragraphs.`;

    if (provider === 'openai') {
      const apiKey = getOpenAIKey();
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ error: 'OpenAI API key not configured' })}\n\n`);
        res.end();
        return;
      }

      const openai = new OpenAI({ apiKey });
      const selectedModel = model || 'gpt-4o';

      const stream = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: 'system', content: INTERVIEW_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
        }
      }
    } else {
      // Claude (default)
      const apiKey = getClaudeKey();
      console.log('[Ascend] Got Claude API key:', apiKey ? 'yes' : 'NO');
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ error: 'Anthropic API key not configured' })}\n\n`);
        res.end();
        return;
      }

      const anthropic = new Anthropic({ apiKey });
      const selectedModel = model || 'claude-sonnet-4-6';
      console.log('[Ascend] Creating Claude stream with model:', selectedModel);

      const stream = await anthropic.messages.stream({
        model: selectedModel,
        max_tokens: 4096,
        system: INTERVIEW_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage },
        ],
      });

      console.log('[Ascend] Stream created, iterating events...');
      let chunkCount = 0;
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.text) {
          chunkCount++;
          if (chunkCount === 1) console.log('[Ascend] First chunk received');
          res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`);
        }
      }
      console.log('[Ascend] Stream complete, chunks:', chunkCount);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[Ascend] Error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// POST /api/extract-text - Extract text from uploaded documents (PDF, DOCX)
router.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname.toLowerCase();
    const buffer = req.file.buffer;
    let text = '';

    console.log('[Extract] Processing file:', fileName, 'Size:', buffer.length);

    if (fileName.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else if (fileName.endsWith('.pdf')) {
      // Use Claude to extract text from PDF
      const apiKey = getClaudeKey();
      if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
      }

      const anthropic = new Anthropic({ apiKey });
      const base64 = buffer.toString('base64');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract ALL text content from this document. Return ONLY the extracted text, no commentary or formatting. Preserve paragraphs and structure.',
            },
          ],
        }],
      });

      text = response.content[0]?.text || '';
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // For DOCX, try to extract using simple parsing or Claude
      const apiKey = getClaudeKey();
      if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
      }

      // DOCX files can be read by Claude as documents
      const anthropic = new Anthropic({ apiKey });
      const base64 = buffer.toString('base64');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract ALL text content from this document. Return ONLY the extracted text, no commentary or formatting. Preserve paragraphs and structure.',
            },
          ],
        }],
      });

      text = response.content[0]?.text || '';
    } else {
      // Try to read as text
      text = buffer.toString('utf-8');
    }

    console.log('[Extract] Extracted text length:', text.length);
    res.json({ text, fileName: req.file.originalname });
  } catch (error) {
    console.error('[Extract] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
