import { useState, useCallback, useRef } from 'react';

/**
 * Clean up text - remove double spaces, extra empty lines
 */
function cleanupText(text) {
  if (!text) return text;
  if (typeof text !== 'string') return text;
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Build a partial systemDesign object from incomplete JSON text by
 * regex-extracting individual fields. Used when the full systemDesign
 * brace block hasn't closed yet (or has but failed JSON.parse). This
 * is what lets the design panel render Overview / Functional /
 * Tradeoffs progressively as they arrive instead of staying empty
 * until the whole stream completes.
 */
function buildPartialSd(sdJson, extractStringField, extractStringArray) {
  const sd = {};
  // included flag is the gate the panel uses to decide "render at all"
  const includedMatch = sdJson.match(/"included"\s*:\s*(true|false)/);
  if (includedMatch) sd.included = includedMatch[1] === 'true';

  // Top-level scalar fields
  const overview = extractStringField(sdJson, 'overview');
  if (overview) sd.overview = overview;

  // String arrays — tradeoffs, edgeCases, scalability, followUpQuestions
  const tradeoffs = extractStringArray(sdJson, 'tradeoffs');
  if (tradeoffs) sd.tradeoffs = tradeoffs;
  const edgeCases = extractStringArray(sdJson, 'edgeCases');
  if (edgeCases) sd.edgeCases = edgeCases;
  const scalability = extractStringArray(sdJson, 'scalability');
  if (scalability) sd.scalability = scalability;
  const followUpQuestions = extractStringArray(sdJson, 'followUpQuestions');
  if (followUpQuestions) sd.followUpQuestions = followUpQuestions;

  // Requirements has a nested shape: { functional: [...], nonFunctional: [...] }
  const reqIdx = sdJson.indexOf('"requirements"');
  if (reqIdx !== -1) {
    const reqOpen = sdJson.indexOf('{', reqIdx);
    const reqSlice = sdJson.slice(reqOpen);
    const functional = extractStringArray(reqSlice, 'functional');
    const nonFunctional = extractStringArray(reqSlice, 'nonFunctional');
    if (functional || nonFunctional) {
      sd.requirements = { functional: functional || [], nonFunctional: nonFunctional || [] };
    }
  }

  // Return undefined if literally nothing parsed (so the caller falls
  // back to its own logic). At minimum we expect the included flag.
  return Object.keys(sd).length > 0 ? sd : null;
}

/**
 * Parse partial JSON to extract fields as they stream in
 */
export function parseStreamingContent(text) {
  const result = {
    code: null,
    language: null,
    pitch: null,
    explanations: null,
    complexity: null,
    systemDesign: null,
  };

  if (!text) return result;

  // Try to extract top-level code field
  let codeMatch = text.match(/"language"\s*:\s*"[^"]*"\s*,\s*"code"\s*:\s*"((?:[^"\\]|\\.)*)"/s);

  if (!codeMatch) {
    const allCodeMatches = [...text.matchAll(/"code"\s*:\s*"((?:[^"\\]|\\.)*)"/gs)];
    for (const match of allCodeMatches) {
      const beforeMatch = text.substring(0, match.index);
      const lastBrace = beforeMatch.lastIndexOf('{');
      const contextBefore = beforeMatch.substring(lastBrace);
      if (!contextBefore.match(/"line"\s*:/)) {
        codeMatch = match;
        break;
      }
    }
  }

  if (codeMatch) {
    const codeValue = codeMatch[1] || codeMatch[2] || '';
    result.code = codeValue
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  // Extract language
  const langMatch = text.match(/"language"\s*:\s*"([^"]+)"/);
  if (langMatch) {
    result.language = langMatch[1];
  }

  // Extract pitch - can be either a string or an object
  const pitchObjectMatch = text.match(/"pitch"\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/s);
  if (pitchObjectMatch) {
    try {
      result.pitch = JSON.parse(pitchObjectMatch[1]);
    } catch {
      // If parsing fails, try as string
    }
  }

  if (!result.pitch) {
    const pitchStringMatch = text.match(/"pitch"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (pitchStringMatch) {
      result.pitch = cleanupText(pitchStringMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\'));
    }
  }

  // Extract complexity
  const complexityMatch = text.match(/"complexity"\s*:\s*\{[^}]*"time"\s*:\s*"([^"]+)"[^}]*"space"\s*:\s*"([^"]+)"[^}]*\}/s);
  if (complexityMatch) {
    result.complexity = { time: complexityMatch[1], space: complexityMatch[2] };
  }

  // Extract systemDesign — use balanced brace matching for deeply nested
  // objects, with progressive partial-extraction fallback so the panel
  // can render Overview / Requirements / Tradeoffs etc. AS THEY STREAM
  // instead of waiting for the entire JSON to close. This is what makes
  // the right pane appear "alive" during a 20-30s solve.
  const extractStringField = (json, name) => {
    // Match: "name": "<contents, with escaped quotes allowed>"
    const re = new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
    const m = json.match(re);
    if (!m) return undefined;
    try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
  };
  const extractStringArray = (json, name) => {
    // Match: "name": [ "...", "...", ...] up to the next ]. Tolerates
    // partial arrays — captures whatever strings have streamed so far.
    const startIdx = json.indexOf(`"${name}"`);
    if (startIdx === -1) return undefined;
    const colonIdx = json.indexOf(':', startIdx);
    const openIdx = json.indexOf('[', colonIdx);
    if (openIdx === -1 || openIdx - colonIdx > 12) return undefined;
    // Scan until ] (closed) or end of buffer (still streaming)
    const closeIdx = json.indexOf(']', openIdx);
    const slice = closeIdx === -1
      ? json.slice(openIdx + 1)
      : json.slice(openIdx + 1, closeIdx);
    const items = [];
    const stringRe = /"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = stringRe.exec(slice)) !== null) {
      try { items.push(JSON.parse(`"${m[1]}"`)); } catch { items.push(m[1]); }
    }
    return items.length > 0 ? items : undefined;
  };

  const sdKeyIdx = text.indexOf('"systemDesign"');
  if (sdKeyIdx !== -1) {
    const braceStart = text.indexOf('{', sdKeyIdx);
    if (braceStart !== -1) {
      let depth = 0;
      let braceEnd = -1;
      for (let i = braceStart; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } }
      }
      if (braceEnd !== -1) {
        const sdJson = text.substring(braceStart, braceEnd + 1);
        try {
          result.systemDesign = JSON.parse(sdJson);
        } catch {
          // Whole-object parse failed — still grab what we can
          result.systemDesign = buildPartialSd(sdJson, extractStringField, extractStringArray);
        }
      } else {
        // Object hasn't closed yet — partial extraction from open buffer
        const sdJson = text.substring(braceStart);
        result.systemDesign = buildPartialSd(sdJson, extractStringField, extractStringArray);
      }
    }
  }

  return result;
}

/**
 * Hook for managing streaming content state
 */
export function useStreamingParser() {
  const [streamingText, setStreamingText] = useState('');
  const [streamingContent, setStreamingContent] = useState({
    code: null,
    language: null,
    pitch: null,
    explanations: null,
    complexity: null,
    systemDesign: null,
  });

  const textRef = useRef('');

  const appendChunk = useCallback((chunk) => {
    textRef.current += chunk;
    setStreamingText(textRef.current);
    const parsed = parseStreamingContent(textRef.current);
    setStreamingContent(parsed);
    return parsed;
  }, []);

  const reset = useCallback(() => {
    textRef.current = '';
    setStreamingText('');
    setStreamingContent({
      code: null,
      language: null,
      pitch: null,
      explanations: null,
      complexity: null,
      systemDesign: null,
    });
  }, []);

  const getFullText = useCallback(() => textRef.current, []);

  return {
    streamingText,
    streamingContent,
    appendChunk,
    reset,
    getFullText,
  };
}

export default useStreamingParser;
