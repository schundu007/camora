import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'chundu_system_design_sessions';
const MAX_SESSIONS = 50; // Limit to prevent storage bloat

/**
 * Custom hook for persisting system design sessions
 * Uses localStorage for web persistence
 */
export function useSystemDesignStorage() {
  const [sessions, setSessions] = useState({});
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        let storedSessions = {};
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          storedSessions = JSON.parse(stored);
        }
        setSessions(storedSessions || {});
      } catch (error) {
        console.error('Failed to load system design sessions:', error);
        setSessions({});
      } finally {
        setIsLoaded(true);
      }
    };

    loadSessions();
  }, []);

  // Save sessions helper
  const persistSessions = useCallback(async (updatedSessions) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Failed to save system design sessions:', error);
      // If storage is full, try removing oldest sessions
      if (error.name === 'QuotaExceededError') {
        const sortedIds = Object.keys(updatedSessions).sort(
          (a, b) => updatedSessions[a].timestamp - updatedSessions[b].timestamp
        );
        const idsToRemove = sortedIds.slice(0, 10);
        idsToRemove.forEach(id => delete updatedSessions[id]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
        setSessions(updatedSessions);
      }
    }
  }, []);

  /**
   * Save a new system design session
   */
  const saveSession = useCallback(async ({ problem, source, systemDesign, detailLevel }) => {
    const sessionId = `sd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newSession = {
      id: sessionId,
      timestamp: Date.now(),
      problem: problem?.substring(0, 500),
      source: source || 'text',
      detailLevel: detailLevel || 'full',
      systemDesign,
      qaHistory: [],
      eraserDiagram: null,
      whiteboardData: null,
      title: extractTitle(problem, systemDesign)
    };

    const updatedSessions = { ...sessions, [sessionId]: newSession };

    // Enforce max sessions limit
    const sessionIds = Object.keys(updatedSessions);
    if (sessionIds.length > MAX_SESSIONS) {
      const sortedIds = sessionIds.sort(
        (a, b) => updatedSessions[a].timestamp - updatedSessions[b].timestamp
      );
      const idsToRemove = sortedIds.slice(0, sessionIds.length - MAX_SESSIONS);
      idsToRemove.forEach(id => delete updatedSessions[id]);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    setSessions(updatedSessions);
    setCurrentSessionId(sessionId);
    return sessionId;
  }, [sessions]);

  /**
   * Update an existing session
   */
  const updateSession = useCallback(async (sessionId, updates) => {
    if (!sessionId || !sessions[sessionId]) {
      console.warn('Session not found:', sessionId);
      return;
    }

    const updatedSession = {
      ...sessions[sessionId],
      ...updates,
      lastUpdated: Date.now()
    };

    const updatedSessions = {
      ...sessions,
      [sessionId]: updatedSession
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    setSessions(updatedSessions);
  }, [sessions]);

  /**
   * Add a Q&A entry to a session
   */
  const addQAToSession = useCallback((sessionId, question, answer) => {
    if (!sessionId || !sessions[sessionId]) {
      console.warn('Session not found for Q&A:', sessionId);
      return;
    }

    const existingQA = sessions[sessionId].qaHistory || [];
    const newQA = {
      id: `qa_${Date.now()}`,
      question,
      answer,
      timestamp: Date.now()
    };

    updateSession(sessionId, {
      qaHistory: [...existingQA, newQA]
    });
  }, [sessions, updateSession]);

  /**
   * Update the Eraser diagram for a session
   */
  const updateEraserDiagram = useCallback((sessionId, diagram) => {
    updateSession(sessionId, { eraserDiagram: diagram });
  }, [updateSession]);

  /**
   * Update the whiteboard data for a session
   */
  const updateWhiteboardData = useCallback((sessionId, data) => {
    updateSession(sessionId, { whiteboardData: data });
  }, [updateSession]);

  /**
   * Delete a session
   */
  const deleteSession = useCallback(async (sessionId) => {
    const updatedSessions = { ...sessions };
    delete updatedSessions[sessionId];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    setSessions(updatedSessions);

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [sessions, currentSessionId]);

  /**
   * Get a session by ID
   */
  const getSession = useCallback((sessionId) => {
    return sessions[sessionId] || null;
  }, [sessions]);

  /**
   * Get all sessions sorted by timestamp (newest first)
   */
  const getAllSessions = useCallback(() => {
    return Object.values(sessions).sort((a, b) => b.timestamp - a.timestamp);
  }, [sessions]);

  /**
   * Clear all sessions
   */
  const clearAllSessions = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessions({});
    setCurrentSessionId(null);
  }, []);

  /**
   * Load a saved session back into the app
   */
  const loadSession = useCallback((sessionId) => {
    const session = sessions[sessionId];
    if (session) {
      setCurrentSessionId(sessionId);
      return session;
    }
    return null;
  }, [sessions]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    saveSession,
    updateSession,
    addQAToSession,
    updateEraserDiagram,
    updateWhiteboardData,
    deleteSession,
    getSession,
    getAllSessions,
    loadSession,
    clearAllSessions,
    isLoaded
  };
}

/**
 * Extract a title from the problem or system design overview
 */
function extractTitle(problem, systemDesign) {
  if (systemDesign?.overview) {
    const overview = systemDesign.overview;
    const firstSentence = overview.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length <= 80) {
      return firstSentence.trim();
    }
    return overview.substring(0, 60).trim() + '...';
  }

  if (problem) {
    if (problem.startsWith('http')) {
      try {
        const url = new URL(problem);
        return url.hostname + url.pathname.substring(0, 30);
      } catch {
        return problem.substring(0, 60);
      }
    }
    const firstLine = problem.split('\n')[0];
    if (firstLine && firstLine.length <= 80) {
      return firstLine.trim();
    }
    return problem.substring(0, 60).trim() + '...';
  }

  return 'Untitled System Design';
}

export default useSystemDesignStorage;
