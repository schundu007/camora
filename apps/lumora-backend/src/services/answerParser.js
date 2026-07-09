/**
 * Answer parser for extracting structured blocks from Claude responses.
 *
 * Handles two formats Claude may produce:
 *   1. Bracketed: [TAG]content[/TAG]
 *   2. Bare heading: TAG alone on a line (all caps)
 */

// Known tag names for bare-heading fallback parsing
const KNOWN_TAGS = new Set([
  'HEADLINE', 'ANSWER', 'DIAGRAM', 'CODE', 'FOLLOWUP',
  'REQUIREMENTS', 'SCALEMATH', 'SCALECALC', 'DEEPDESIGN', 'EDGECASES', 'TRADEOFFS',
  'PROBLEM', 'APPROACH', 'COMPLEXITY', 'WALKTHROUGH', 'TESTCASES',
]);

// Regex patterns for parsing blocks
const BLOCK_RE = /\[(\w+)(?:\s+lang=(\w+))?\](.*?)\[\/\1\]/gs;
const CODE_LANG_RE = /\[CODE\s+(?:lang=)?(\w+)\]/i;

/**
 * Fallback: parse responses where Claude outputs TAG as bare heading.
 * Splits text at lines that are a known tag name (all caps, alone on a line).
 */
function parseBareHeadings(text) {
  const blocks = [];
  const lines = text.split('\n');
  let currentTag = null;
  let currentLines = [];

  for (const line of lines) {
    const stripped = line.trim();
    const upper = stripped.toUpperCase();

    if (KNOWN_TAGS.has(upper) && stripped === upper) {
      // Save previous block
      if (currentTag) {
        const body = currentLines.join('\n').trim();
        if (body) {
          blocks.push({ type: currentTag, content: body, lang: null });
        }
      }
      currentTag = upper;
      currentLines = [];
    } else if (currentTag !== null) {
      currentLines.push(line);
    }
  }

  // Save last block
  if (currentTag) {
    const body = currentLines.join('\n').trim();
    if (body) {
      blocks.push({ type: currentTag, content: body, lang: null });
    }
  }

  return blocks;
}

/**
 * Parse raw Claude response into structured blocks.
 *
 * Tries bracketed [TAG]...[/TAG] format first. If that yields no blocks,
 * falls back to bare-heading parsing (TAG on its own line).
 */
export function parseAnswer(raw) {
  // Markdown cleanup for PROSE ONLY. Never run over CODE bodies: `**` is
  // exponentiation / **kwargs / pointer deref, and a column-0 `#` is a shell or
  // Python comment — stripping them corrupts the code the candidate reads.
  const cleanMarkdown = (s) => s
    .replace(/^#{1,4}\s+.*$/gm, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '');

  const blocks = [];

  // Strategy 1: Bracketed tags [TAG]...[/TAG] — parsed from RAW so code stays
  // intact; only non-CODE bodies get the markdown cleanup.
  let match;
  // Reset regex lastIndex for global regex
  BLOCK_RE.lastIndex = 0;
  while ((match = BLOCK_RE.exec(raw)) !== null) {
    const tag = match[1].toUpperCase();
    let lang = match[2] || '';
    let body = match[3];

    // Extract language for CODE blocks
    if (tag === 'CODE' && !lang) {
      const langMatch = CODE_LANG_RE.exec(raw.slice(match.index, match.index + match[0].length));
      lang = langMatch ? langMatch[1] : 'bash';
    }

    body = (tag === 'CODE' ? body : cleanMarkdown(body)).trim();

    if (body) {
      blocks.push({
        type: tag,
        content: body,
        lang: lang || null,
      });
    }
  }

  // Cleaned prose for the fallback strategies below (they target non-CODE tags).
  const cleaned = cleanMarkdown(raw);

  // Strategy 1.5: Recover truncated blocks (opening [TAG] without closing [/TAG]).
  // Match against RAW and shield CODE bodies, same as Strategy 1.
  if (blocks.length > 0) {
    const foundTags = new Set(blocks.map(b => b.type));
    for (const tag of KNOWN_TAGS) {
      if (foundTags.has(tag)) continue;
      const openRe = new RegExp(`\\[${tag}(?:\\s+lang=\\w+)?\\](.*)$`, 's');
      const openMatch = openRe.exec(raw);
      if (openMatch) {
        const body = (tag === 'CODE' ? openMatch[1] : cleanMarkdown(openMatch[1])).trim();
        if (body) {
          blocks.push({ type: tag, content: body, lang: null });
        }
      }
    }
  }

  // Strategy 2: Bare headings (TAG on its own line)
  if (blocks.length === 0) {
    const fallbackBlocks = parseBareHeadings(cleaned);
    if (fallbackBlocks.length > 0) {
      return fallbackBlocks;
    }
  }

  return blocks;
}

/**
 * Check if response contains system design blocks.
 */
export function isSystemDesignResponse(blocks) {
  const systemDesignTypes = new Set([
    'REQUIREMENTS', 'SCALEMATH', 'DIAGRAM',
    'DEEPDESIGN', 'EDGECASES', 'TRADEOFFS',
  ]);
  return blocks.some((b) => systemDesignTypes.has(b.type));
}

/**
 * Check if response contains coding interview blocks.
 */
export function isCodingResponse(blocks) {
  const codingTypes = new Set([
    'PROBLEM', 'APPROACH', 'COMPLEXITY',
    'WALKTHROUGH', 'TESTCASES',
  ]);
  const hasCode = blocks.some((b) => b.type === 'CODE');
  const hasCodingBlocks = blocks.some((b) => codingTypes.has(b.type));
  return hasCodingBlocks || (hasCode && blocks.some((b) => b.type === 'COMPLEXITY' || b.type === 'TESTCASES'));
}

/**
 * Extract follow-up questions and answers from blocks.
 */
export function extractFollowups(blocks) {
  const followups = [];

  for (const block of blocks) {
    if (block.type === 'FOLLOWUP') {
      const lines = block.content.split('\n');
      let currentQ = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^Q\d*:/i.test(trimmed)) {
          currentQ = trimmed.replace(/^Q\d*:\s*/i, '');
        } else if (/^A\d*:/i.test(trimmed) && currentQ) {
          const answer = trimmed.replace(/^A\d*:\s*/i, '');
          followups.push({ question: currentQ, answer });
          currentQ = null;
        }
      }
    }
  }

  return followups;
}
