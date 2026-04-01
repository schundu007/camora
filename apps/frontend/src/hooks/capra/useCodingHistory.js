import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'chundu_coding_history';
const OLD_STORAGE_KEY = 'ascend_coding_history';
const MAX_ENTRIES = 30; // Limit to prevent localStorage bloat

// Migrate old storage key if needed
function migrateStorage() {
  const oldData = localStorage.getItem(OLD_STORAGE_KEY);
  if (oldData && !localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, oldData);
    console.log('[CodingHistory] Migrated from ascend_coding_history');
  }
}
migrateStorage();

/**
 * Custom hook for persisting coding problem history
 * Stores problems, solutions, language, and timestamps
 */
export function useCodingHistory() {
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount and deduplicate
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deduplicate: keep only one entry per unique problem (first 200 chars)
        const seen = new Set();
        const deduped = parsed.filter(entry => {
          const key = entry.problem?.substring(0, 200)?.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // Save deduped version if changed
        if (deduped.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
        }
        setHistory(deduped);
      }
    } catch (error) {
      console.error('Failed to load coding history:', error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  const persistHistory = useCallback((updatedHistory) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to save coding history:', error);
      // If storage is full, try removing oldest entries
      if (error.name === 'QuotaExceededError') {
        const trimmed = updatedHistory.slice(0, MAX_ENTRIES - 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        setHistory(trimmed);
      }
    }
  }, []);

  /**
   * Add a new entry to the coding history
   * @param {Object} params - Entry data
   * @param {string} params.problem - The problem text
   * @param {string} params.language - Programming language used
   * @param {string} params.code - The generated solution code
   * @param {Object} params.complexity - Time/space complexity
   * @param {string} params.source - Source type: 'text', 'url', 'image'
   * @param {string} params.pitch - Solution approach/pitch
   * @param {Array} params.explanations - Line-by-line code explanations
   * @returns {string} The entry ID
   */
  const addEntry = useCallback(({ problem, language, code, complexity, source, pitch, explanations }) => {
    // Check for duplicate - same problem text (first 200 chars) within last 5 entries
    const problemKey = problem?.substring(0, 200)?.toLowerCase().trim();
    const existingIndex = history.slice(0, 5).findIndex(entry =>
      entry.problem?.substring(0, 200)?.toLowerCase().trim() === problemKey
    );

    if (existingIndex !== -1) {
      // Update existing entry instead of creating new one
      const existingEntry = history[existingIndex];
      const updatedEntry = {
        ...existingEntry,
        timestamp: Date.now(),
        language: language || existingEntry.language,
        code: code?.substring(0, 10000) || existingEntry.code,
        complexity: complexity || existingEntry.complexity,
        pitch: (typeof pitch === 'string' ? pitch?.substring(0, 2000) : Array.isArray(pitch) ? (typeof pitch[0] === 'string' ? pitch.join('\n\n') : JSON.stringify(pitch)).substring(0, 3000) : null) || existingEntry.pitch,
        explanations: explanations || existingEntry.explanations,
      };

      // Move to top and update
      const updatedHistory = [
        updatedEntry,
        ...history.filter((_, i) => i !== existingIndex)
      ].slice(0, MAX_ENTRIES);
      persistHistory(updatedHistory);

      return existingEntry.id;
    }

    // Create new entry
    const entryId = `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newEntry = {
      id: entryId,
      timestamp: Date.now(),
      problem: problem?.substring(0, 10000), // Increased limit for full problem text
      language: language || 'auto',
      code: code?.substring(0, 10000), // Increased limit for full code
      complexity: complexity || null,
      source: source || 'text',
      pitch: (typeof pitch === 'string' ? pitch?.substring(0, 2000) : Array.isArray(pitch) ? (typeof pitch[0] === 'string' ? pitch.join('\n\n') : JSON.stringify(pitch)).substring(0, 3000) : null), // Limit pitch size
      explanations: explanations || null, // Line-by-line explanations
      title: extractTitle(problem)
    };

    // Add to beginning (newest first) and enforce max limit
    const updatedHistory = [newEntry, ...history].slice(0, MAX_ENTRIES);
    persistHistory(updatedHistory);

    return entryId;
  }, [history, persistHistory]);

  /**
   * Delete an entry from history
   * @param {string} entryId - The entry to delete
   */
  const deleteEntry = useCallback((entryId) => {
    const updatedHistory = history.filter(entry => entry.id !== entryId);
    persistHistory(updatedHistory);
  }, [history, persistHistory]);

  /**
   * Get an entry by ID
   * @param {string} entryId - The entry ID
   * @returns {Object|null} The entry data
   */
  const getEntry = useCallback((entryId) => {
    return history.find(entry => entry.id === entryId) || null;
  }, [history]);

  /**
   * Get all history entries (already sorted newest first)
   * @returns {Array} Array of history entries
   */
  const getAllEntries = useCallback(() => {
    return history;
  }, [history]);

  /**
   * Get recent entries (limited count)
   * @param {number} count - Number of entries to return
   * @returns {Array} Array of recent entries
   */
  const getRecentEntries = useCallback((count = 5) => {
    return history.slice(0, count);
  }, [history]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return {
    history,
    addEntry,
    deleteEntry,
    getEntry,
    getAllEntries,
    getRecentEntries,
    clearHistory
  };
}

/**
 * Extract a title from the problem text
 */
function extractTitle(problem) {
  if (!problem) return 'Untitled Problem';

  // Check if it's a URL
  if (problem.startsWith('http')) {
    try {
      const url = new URL(problem);
      // Try to extract problem name from pathname
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Clean up the slug
        return lastPart
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .substring(0, 60);
      }
      return url.hostname;
    } catch {
      return problem.substring(0, 60);
    }
  }

  // Take first line or first 60 chars
  const firstLine = problem.split('\n')[0].trim();

  // Common problem title patterns
  const patterns = [
    /^(?:problem|question|challenge)[\s:]+(.+)/i,
    /^(?:\d+\.?\s*)(.+)/,  // Numbered problems like "1. Two Sum"
    /^(.+)/
  ];

  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length <= 60) {
        return title;
      }
      return title.substring(0, 57) + '...';
    }
  }

  return firstLine.substring(0, 60) || 'Untitled Problem';
}

export default useCodingHistory;
