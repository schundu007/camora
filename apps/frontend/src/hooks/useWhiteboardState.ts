import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'camora_practice_whiteboards';
const MAX_SCENES = 50;

interface WhiteboardScene {
  elements: any[];
  timestamp: number;
}

export function useWhiteboardState(totalQuestions: number) {
  const [scenes, setScenes] = useState<(WhiteboardScene | null)[]>(
    () => new Array(totalQuestions).fill(null),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved scenes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: (WhiteboardScene | null)[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setScenes((prev) => {
            const merged = [...prev];
            for (let i = 0; i < Math.min(parsed.length, totalQuestions); i++) {
              merged[i] = parsed[i];
            }
            return merged;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load whiteboard scenes:', err);
    }
  }, [totalQuestions]);

  // Persist to localStorage with debounce
  const persistScenes = useCallback((updatedScenes: (WhiteboardScene | null)[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        // Only keep non-null scenes to save space
        const trimmed = updatedScenes.slice(0, MAX_SCENES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (err) {
        if ((err as any)?.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded for whiteboards, clearing old data');
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }, 800);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const saveScene = useCallback(
    (idx: number, elements: any[]) => {
      const activeElements = elements.filter((el: any) => !el.isDeleted);
      setScenes((prev) => {
        const updated = [...prev];
        updated[idx] = { elements: activeElements, timestamp: Date.now() };
        persistScenes(updated);
        return updated;
      });
    },
    [persistScenes],
  );

  const getScene = useCallback(
    (idx: number): any[] | undefined => {
      return scenes[idx]?.elements;
    },
    [scenes],
  );

  const clearScene = useCallback(
    (idx: number) => {
      setScenes((prev) => {
        const updated = [...prev];
        updated[idx] = null;
        persistScenes(updated);
        return updated;
      });
    },
    [persistScenes],
  );

  const clearAll = useCallback(() => {
    setScenes(new Array(totalQuestions).fill(null));
    localStorage.removeItem(STORAGE_KEY);
  }, [totalQuestions]);

  return { saveScene, getScene, clearScene, clearAll };
}

export default useWhiteboardState;
