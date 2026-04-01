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

  // Extract systemDesign
  const systemDesignMatch = text.match(/"systemDesign"\s*:\s*(\{[\s\S]*?\})\s*(?:,|\})/);
  if (systemDesignMatch) {
    try {
      const sdText = systemDesignMatch[1];
      const includedMatch = sdText.match(/"included"\s*:\s*(true|false)/);
      if (includedMatch) {
        result.systemDesign = { included: includedMatch[1] === 'true' };
        if (includedMatch[1] === 'true') {
          try {
            const fullMatch = text.match(/"systemDesign"\s*:\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})/s);
            if (fullMatch) {
              result.systemDesign = JSON.parse(fullMatch[1]);
            }
          } catch {
            // Keep partial result
          }
        }
      }
    } catch {
      // Ignore parse errors during streaming
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
