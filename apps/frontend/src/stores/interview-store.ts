/**
 * Zustand store for interview state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParsedBlock } from '@/types';

interface HistoryEntry {
  question: string;
  blocks: ParsedBlock[];
  timestamp: Date;
  messageId?: string;
  conversationId?: string;
}

interface InterviewState {
  // Current conversation
  conversationId: string | null;
  question: string | null;
  isStreaming: boolean;
  isDesignQuestion: boolean;
  isCodingQuestion: boolean;
  streamChunks: string[];  // kept for backward compat reads
  streamText: string;      // efficient string accumulator
  parsedBlocks: ParsedBlock[];
  error: string | null;

  // Status
  status: {
    state: 'idle' | 'ready' | 'listen' | 'transcribe' | 'search' | 'write' | 'error' | 'warn';
    message: string;
  };

  // Audio
  audioLevel: number;
  threshold: number;
  isRecording: boolean;

  // Timers (in milliseconds)
  listenStartTime: number | null;
  listenDuration: number;
  answerStartTime: number | null;
  answerDuration: number;

  // History
  history: HistoryEntry[];

  // Settings
  useSearch: boolean;

  // Voice enrollment
  voiceEnrolled: boolean;
  voiceFilterEnabled: boolean;
  isEnrolling: boolean;

  // Actions
  setConversationId: (id: string | null) => void;
  setQuestion: (question: string | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsDesignQuestion: (isDesign: boolean) => void;
  setIsCodingQuestion: (isCoding: boolean) => void;
  appendStreamChunk: (chunk: string) => void;
  clearStreamChunks: () => void;
  setParsedBlocks: (blocks: ParsedBlock[]) => void;
  setError: (error: string | null) => void;
  setStatus: (state: InterviewState['status']['state'], message: string) => void;
  setAudioLevel: (level: number) => void;
  setThreshold: (threshold: number) => void;
  setIsRecording: (isRecording: boolean) => void;
  startListenTimer: () => void;
  stopListenTimer: () => void;
  startAnswerTimer: () => void;
  stopAnswerTimer: () => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  updateLastHistoryMessageId: (messageId: string, conversationId: string) => void;
  removeHistoryEntry: (index: number) => void;
  clearHistory: () => void;
  setUseSearch: (useSearch: boolean) => void;
  setVoiceEnrolled: (enrolled: boolean) => void;
  setVoiceFilterEnabled: (enabled: boolean) => void;
  setIsEnrolling: (enrolling: boolean) => void;
  reset: () => void;
}

const initialState = {
  conversationId: null,
  question: null,
  isStreaming: false,
  isDesignQuestion: false,
  isCodingQuestion: false,
  streamChunks: [],
  streamText: '',
  parsedBlocks: [],
  error: null,
  status: {
    state: 'idle' as const,
    message: 'Ready to assist',
  },
  audioLevel: 0,
  threshold: 0.015, // Higher threshold to avoid false voice detection from background noise
  isRecording: false,
  listenStartTime: null,
  listenDuration: 0,
  answerStartTime: null,
  answerDuration: 0,
  history: [],
  useSearch: false,
  voiceEnrolled: false,
  voiceFilterEnabled: true, // Enable by default when enrolled
  isEnrolling: false,
};

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      ...initialState,

      setConversationId: (id) => set({ conversationId: id }),

  setQuestion: (question) => set({ question }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setIsDesignQuestion: (isDesign) => set({ isDesignQuestion: isDesign }),

  setIsCodingQuestion: (isCoding) => set({ isCodingQuestion: isCoding }),

  appendStreamChunk: (chunk) =>
    set((state) => ({
      streamChunks: [...state.streamChunks, chunk],
      streamText: state.streamText + chunk,
    })),

  clearStreamChunks: () => set({ streamChunks: [], streamText: '' }),

  setParsedBlocks: (blocks) => set({ parsedBlocks: blocks }),

  setError: (error) => set({ error }),

  setStatus: (state, message) =>
    set({
      status: { state, message },
    }),

  setAudioLevel: (level) => set({ audioLevel: level }),

  setThreshold: (threshold) => set({ threshold }),

  setIsRecording: (isRecording) => set({ isRecording }),

  startListenTimer: () => set({ listenStartTime: Date.now(), listenDuration: 0 }),

  stopListenTimer: () =>
    set((state) => ({
      listenDuration: state.listenStartTime ? Date.now() - state.listenStartTime : 0,
      listenStartTime: null,
    })),

  startAnswerTimer: () => set({ answerStartTime: Date.now(), answerDuration: 0 }),

  stopAnswerTimer: () =>
    set((state) => ({
      answerDuration: state.answerStartTime ? Date.now() - state.answerStartTime : 0,
      answerStartTime: null,
    })),

  addHistoryEntry: (entry) =>
    set((state) => {
      const updated = [...state.history, entry];
      // Cap at 30 entries to prevent localStorage quota issues
      return { history: updated.length > 30 ? updated.slice(-30) : updated };
    }),

  updateLastHistoryMessageId: (messageId, conversationId) =>
    set((state) => {
      if (state.history.length === 0) return state;
      const updated = [...state.history];
      updated[updated.length - 1] = { ...updated[updated.length - 1], messageId, conversationId };
      return { history: updated };
    }),

  removeHistoryEntry: (index) =>
    set((state) => ({
      history: state.history.filter((_, i) => i !== index),
    })),

  clearHistory: () => set({ history: [] }),

  setUseSearch: (useSearch) => set({ useSearch }),

  setVoiceEnrolled: (enrolled) => set({ voiceEnrolled: enrolled }),

  setVoiceFilterEnabled: (enabled) => set({ voiceFilterEnabled: enabled }),

  setIsEnrolling: (enrolling) => set({ isEnrolling: enrolling }),

  reset: () => set(initialState),
    }),
    {
      name: 'lumora-interview-store',
      version: 2, // bump version to discard old localStorage with stale history
      partialize: (state) => ({
        useSearch: state.useSearch,
        threshold: state.threshold,
        conversationId: state.conversationId,
        history: state.history,
      }),
      migrate: () => ({ useSearch: false, threshold: 0.015 }), // fresh start
      skipHydration: true,
    }
  )
);
