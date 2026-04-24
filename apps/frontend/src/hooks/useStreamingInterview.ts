import { useRef, useCallback, useEffect } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { streamResponse, streamCodingResponse } from '@/lib/sse-client';
import { activityTracker } from '@/lib/activity-tracker';
import { getSystemContext } from '@/lib/lumora-assistant';

import { INPUT_LIMITS } from '@/lib/constants';

function validateInput(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  if (trimmed.length < INPUT_LIMITS.MIN_QUESTION_LENGTH) {
    return { valid: false, error: 'Question is too short' };
  }
  if (trimmed.length > INPUT_LIMITS.MAX_QUESTION_LENGTH) {
    return { valid: false, error: `Question exceeds ${INPUT_LIMITS.MAX_QUESTION_LENGTH} characters` };
  }
  return { valid: true };
}

export function useStreamingInterview() {
  const { token } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    conversationId,
    setConversationId,
    setQuestion,
    setIsStreaming,
    setIsDesignQuestion,
    setIsCodingQuestion,
    appendStreamChunk,
    clearStreamChunks,
    setParsedBlocks,
    setError,
    setStatus,
    addHistoryEntry,
    useSearch,
    startAnswerTimer,
    stopAnswerTimer,
    isStreaming,
  } = useInterviewStore();

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const resetForNewQuestion = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearStreamChunks();
    setParsedBlocks([]);
    setError(null);
  }, [clearStreamChunks, setParsedBlocks, setError]);

  const handleSubmit = useCallback(async (question: string, forceDesign?: boolean) => {
    const validation = validateInput(question);
    if (!validation.valid) {
      setError(validation.error || 'Invalid input');
      return;
    }

    if (!token) {
      setError('Not authenticated. Please refresh the page.');
      return;
    }

    resetForNewQuestion();

    const trimmedQuestion = question.trim();
    setQuestion(trimmedQuestion);
    setIsStreaming(true);
    setStatus('write', 'Generating response...');
    startAnswerTimer();

    const finalQuestion = forceDesign
      ? `[SYSTEM DESIGN] ${trimmedQuestion}`
      : trimmedQuestion;

    // Track the event
    const category = forceDesign ? 'system_design' : 'general';
    activityTracker.trackEvent('question_asked', category);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      await streamResponse({
        conversationId: conversationId || undefined,
        question: finalQuestion,
        useSearch,
        systemContext: getSystemContext(),
        token,
        signal: controller.signal,
        onStreamStart: (data: any) => {
          setIsDesignQuestion(data.isDesign ?? data.is_design ?? false);
          setIsCodingQuestion(data.isCoding ?? data.is_coding ?? false);
          const convId = data.conversationId ?? data.conversation_id;
          if (convId) setConversationId(convId);
        },
        onToken: (data) => {
          if (data.t) appendStreamChunk(data.t);
        },
        onAnswer: (data: any) => {
          setIsDesignQuestion(data.isDesign ?? data.is_design ?? false);
          setIsCodingQuestion(data.isCoding ?? data.is_coding ?? false);
          setParsedBlocks(data.parsed || []);
          addHistoryEntry({
            question: data.question || trimmedQuestion,
            blocks: data.parsed || [],
            timestamp: new Date(),
          });
          stopAnswerTimer();
          setStatus('ready', 'Ready');
        },
        onStatus: (data) => {
          if (data.state && data.msg) setStatus(data.state, data.msg);
        },
        onError: (data) => {
          const errorMsg = data.msg || 'An error occurred';
          setError(errorMsg);
          setStatus('error', errorMsg);
          stopAnswerTimer();
        },
        onComplete: () => {
          setIsStreaming(false);
        },
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const errorMsg = error.message || 'Failed to get response';
      setError(errorMsg);
      setStatus('error', errorMsg);
      setIsStreaming(false);
      stopAnswerTimer();
    }
  }, [token, useSearch, resetForNewQuestion, setQuestion, setIsStreaming,
      setStatus, startAnswerTimer, setIsDesignQuestion, setIsCodingQuestion,
      setConversationId, appendStreamChunk, setParsedBlocks, addHistoryEntry,
      stopAnswerTimer, setError]);

  const handleCodingSubmit = useCallback(async (problem: string, language: string) => {
    const validation = validateInput(problem);
    if (!validation.valid) {
      setError(validation.error || 'Invalid input');
      return;
    }

    if (!token) {
      setError('Not authenticated. Please refresh the page.');
      return;
    }

    resetForNewQuestion();

    const trimmedProblem = problem.trim();
    const displayTitle = `[${language.toUpperCase()}] ${trimmedProblem.slice(0, 100)}${trimmedProblem.length > 100 ? '...' : ''}`;

    setQuestion(displayTitle);
    setIsStreaming(true);
    setIsCodingQuestion(true);
    setIsDesignQuestion(false);
    setStatus('write', `Generating ${language} solution...`);
    startAnswerTimer();

    // Track the event
    activityTracker.trackEvent('question_asked', 'coding', { language });

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      await streamCodingResponse({
        problem: trimmedProblem,
        language,
        token,
        systemContext: getSystemContext(),
        signal: controller.signal,
        onStreamStart: (data: any) => {
          setIsCodingQuestion(true);
          setIsDesignQuestion(false);
          const convId = data.conversationId ?? data.conversation_id;
          if (convId) setConversationId(convId);
        },
        onToken: (data) => {
          if (data.t) appendStreamChunk(data.t);
        },
        onAnswer: (data: any) => {
          setIsCodingQuestion(true);
          setIsDesignQuestion(false);
          setParsedBlocks(data.parsed || []);
          // Coding backend returns parsed as { json: {...}, format: 'ascend_json' } —
          // not a ParsedBlock[]. Flatten the JSON into a real block array so the
          // history viewer can render it later without hitting "No answer saved".
          const codingJson = data.parsed?.json || (data.parsed && typeof data.parsed === 'object' && 'solutions' in data.parsed ? data.parsed : null);
          const historyBlocks: any[] = [];
          if (codingJson && typeof codingJson === 'object') {
            const sol = codingJson.solutions?.[0] || codingJson;
            const lang = codingJson.language || language;
            if (sol.approach) historyBlocks.push({ type: 'APPROACH', content: sol.approach });
            if (sol.code) historyBlocks.push({ type: 'CODE', content: sol.code, language: lang });
            if (sol.complexity?.time || sol.complexity?.space) {
              historyBlocks.push({ type: 'COMPLEXITY', content: `TIME: ${sol.complexity.time || 'n/a'}\nSPACE: ${sol.complexity.space || 'n/a'}` });
            }
            if (sol.narration) historyBlocks.push({ type: 'WALKTHROUGH', content: sol.narration });
            if (Array.isArray(sol.trace) && sol.trace.length) {
              historyBlocks.push({ type: 'WALKTHROUGH', content: sol.trace.map((s: any) => `${s.step}. ${s.action} → ${s.state}`).join('\n') });
            }
          }
          addHistoryEntry({
            question: displayTitle,
            blocks: historyBlocks.length ? historyBlocks : (Array.isArray(data.parsed) ? data.parsed : []),
            timestamp: new Date(),
          });
          stopAnswerTimer();
          setStatus('ready', 'Solution ready');
        },
        onStatus: (data) => {
          if (data.state && data.msg) setStatus(data.state, data.msg);
        },
        onError: (data) => {
          const errorMsg = data.msg || 'Failed to generate solution';
          setError(errorMsg);
          setStatus('error', errorMsg);
          stopAnswerTimer();
          // Ensure skeleton/spinner clears even if the backend closes the socket
          // without the SSE reader seeing a clean `done`. onComplete still runs
          // when the stream fully closes, but calling it here is idempotent.
          setIsStreaming(false);
        },
        onComplete: () => {
          setIsStreaming(false);
        },
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const errorMsg = error.message || 'Failed to generate coding solution';
      setError(errorMsg);
      setStatus('error', errorMsg);
      setIsStreaming(false);
      stopAnswerTimer();
    }
  }, [token, resetForNewQuestion, setQuestion, setIsStreaming, setIsCodingQuestion,
      setIsDesignQuestion, setStatus, startAnswerTimer, setConversationId,
      appendStreamChunk, setParsedBlocks, addHistoryEntry, stopAnswerTimer, setError]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const resetState = useCallback(() => {
    abortControllerRef.current?.abort();
    clearStreamChunks();
    setParsedBlocks([]);
    setQuestion(null);
    setError(null);
    setIsStreaming(false);
    setStatus('ready', 'Ready');
  }, [clearStreamChunks, setParsedBlocks, setQuestion, setError, setIsStreaming, setStatus]);

  return {
    handleSubmit,
    handleCodingSubmit,
    cancelStream,
    resetState,
    isStreaming,
  };
}
