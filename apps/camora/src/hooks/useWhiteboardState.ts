import { useState, useCallback, useRef, useEffect } from 'react';
import { whiteboardStore } from '@/lib/userScopedStorage';

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
      const parsed = whiteboardStore.read() as (WhiteboardScene | null)[] | null;
      if (parsed) {
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
        whiteboardStore.write(trimmed);
      } catch (err) {
        if ((err as any)?.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded for whiteboards, clearing old data');
          whiteboardStore.clear();
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
    whiteboardStore.clear();
  }, [totalQuestions]);

  return { saveScene, getScene, clearScene, clearAll };
}

export default useWhiteboardState;
