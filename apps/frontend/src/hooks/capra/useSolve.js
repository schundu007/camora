import { useState, useRef, useCallback } from 'react';
import { getAuthHeaders } from '../../utils/authHeaders';
import { parseStreamingContent } from './useStreamingParser';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

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
 * Stream solve request using SSE
 */
async function solveWithStream(
  problem,
  provider,
  language,
  detailLevel,
  model,
  onChunk,
  ascendMode = 'coding',
  designDetailLevel = 'basic',
  signal = null,
  autoSwitch = false,
  onSwitch = null
) {
  const response = await fetch(API_URL + '/api/solve/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      problem,
      provider,
      language,
      detailLevel,
      model,
      ascendMode,
      designDetailLevel,
      autoSwitch,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to solve problem');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.switching && onSwitch) {
            onSwitch(data.from, data.to, data.reason);
          }
          if (data.chunk) {
            onChunk(data.chunk);
          }
          if (data.done && data.result) {
            result = data.result;
            // Clean up text fields
            if (result.pitch && typeof result.pitch === 'string') {
              result.pitch = cleanupText(result.pitch);
            }
            if (result.systemDesign?.overview) {
              result.systemDesign.overview = cleanupText(result.systemDesign.overview);
            }
            if (result.systemDesign?.architecture?.description) {
              result.systemDesign.architecture.description = cleanupText(
                result.systemDesign.architecture.description
              );
            }
          }
          if (data.error) {
            const error = new Error(data.error);
            if (data.needCredits) {
              error.needCredits = true;
            }
            if (data.freeTrialExhausted) {
              error.freeTrialExhausted = true;
            }
            if (data.subscriptionRequired) {
              error.subscriptionRequired = true;
            }
            throw error;
          }
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Hook for managing solve operations
 */
export function useSolve({ provider, model, autoSwitch, ascendMode, designDetailLevel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('default');
  const [solution, setSolution] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingContent, setStreamingContent] = useState({
    code: null,
    language: null,
    pitch: null,
    explanations: null,
    complexity: null,
    systemDesign: null,
  });
  const [switchNotification, setSwitchNotification] = useState(null);

  const abortControllerRef = useRef(null);
  const streamingTextRef = useRef('');

  const reset = useCallback(() => {
    setSolution(null);
    setError(null);
    setErrorType('default');
    setStreamingText('');
    streamingTextRef.current = '';
    setStreamingContent({
      code: null,
      language: null,
      pitch: null,
      explanations: null,
      complexity: null,
      systemDesign: null,
    });
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLoadingType(null);
  }, []);

  const solve = useCallback(
    async (problem, language, detailLevel = 'detailed') => {
      // Abort any previous operation
      abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Reset state
      reset();
      setIsLoading(true);
      setLoadingType('solve');

      try {
        streamingTextRef.current = '';
        const result = await solveWithStream(
          problem,
          provider,
          language,
          detailLevel,
          model,
          (chunk) => {
            streamingTextRef.current += chunk;
            setStreamingText(streamingTextRef.current);
            const parsed = parseStreamingContent(streamingTextRef.current);
            setStreamingContent(parsed);
          },
          ascendMode,
          designDetailLevel,
          signal,
          autoSwitch,
          (from, to, reason) => {
            setSwitchNotification({ from, to, reason });
            setTimeout(() => setSwitchNotification(null), 5000);
          }
        );

        if (result) {
          setSolution(result);
        }

        // IMPORTANT: Do NOT set isLoading=false here. The caller (handleSolve) owns
        // loading state and sets it false in its own finally block AFTER setSolution().
        // Setting it here causes a blank page because isStreaming becomes false before
        // the solution is set. This bug has recurred 4 times — do not reintroduce it.
        return result;
      } catch (err) {
        if (err.name === 'AbortError') {
          setIsLoading(false);
          setLoadingType(null);
          return null;
        }
        if (err.needCredits || err.freeTrialExhausted || err.subscriptionRequired) {
          setError('You need more credits to continue. Please purchase a plan.');
          setErrorType('credits');
        } else {
          setError(err.message);
          setErrorType('solve');
        }
        setIsLoading(false);
        setLoadingType(null);
        throw err;
      }
    },
    [provider, model, autoSwitch, ascendMode, designDetailLevel, reset, abort]
  );

  return {
    // State
    isLoading,
    loadingType,
    error,
    errorType,
    solution,
    streamingText,
    streamingContent,
    switchNotification,

    // Actions
    solve,
    reset,
    abort,
    setSolution,
    setError,
    setErrorType,
    setIsLoading,
    setLoadingType,
    setSwitchNotification,
  };
}

/**
 * Hook for auto-test and fix functionality
 */
export function useAutoTestFix({ provider, model }) {
  const [autoFixAttempts, setAutoFixAttempts] = useState(0);

  const autoTestAndFix = useCallback(
    async (code, language, examples, problem, setLoadingType) => {
      const RUNNABLE = ['python', 'bash', 'javascript', 'typescript', 'sql'];
      const normalizedLang = language?.toLowerCase() || 'python';

      if (!RUNNABLE.includes(normalizedLang) || !examples || examples.length === 0) {
        return { code, fixed: false, attempts: 0, output: null };
      }

      // Skip auto-run for code with network calls
      if (/requests\.|fetch\(|http\.|urllib|axios|aiohttp/.test(code)) {
        return {
          code,
          fixed: false,
          attempts: 0,
          output: {
            success: true,
            output: 'Code makes API calls - run locally to test',
            input: '',
          },
        };
      }

      let currentCode = code;
      let attempts = 0;
      let finalOutput = null;
      const testInput = examples[0]?.input || '';

      setLoadingType('testing');

      try {
        const runResponse = await fetch(API_URL + '/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ code: currentCode, language: normalizedLang, input: testInput }),
        });
        const runResult = await runResponse.json();

        if (runResult.success) {
          finalOutput = { success: true, output: runResult.output, input: testInput };
          return { code: currentCode, fixed: false, attempts: 0, output: finalOutput };
        }

        // Runtime error - try one fix
        const errorMsg = runResult.error || 'Unknown error';
        attempts = 1;
        setAutoFixAttempts(attempts);
        setLoadingType('fixing');

        const fixResponse = await fetch(API_URL + '/api/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            code: currentCode,
            error: errorMsg,
            language: normalizedLang,
            problem: problem,
            provider: provider,
            model: model,
          }),
        });
        const fixResult = await fixResponse.json();

        if (fixResult.code) {
          currentCode = fixResult.code;

          setLoadingType('running');
          const finalRunResponse = await fetch(API_URL + '/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
              code: currentCode,
              language: normalizedLang,
              input: testInput,
            }),
          });
          const finalRunResult = await finalRunResponse.json();
          finalOutput = {
            success: finalRunResult.success,
            output: finalRunResult.success ? finalRunResult.output : finalRunResult.error,
            input: testInput,
          };

          return { code: currentCode, fixed: true, attempts: 1, output: finalOutput };
        }
      } catch (err) {
        console.error('Auto-fix error:', err);
      }

      return { code: currentCode, fixed: attempts > 0, attempts, output: finalOutput };
    },
    [provider, model]
  );

  return {
    autoFixAttempts,
    setAutoFixAttempts,
    autoTestAndFix,
  };
}

export default useSolve;
