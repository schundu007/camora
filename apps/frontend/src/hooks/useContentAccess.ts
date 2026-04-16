import { useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const STORAGE_KEY = 'camora_topics_read';
const FREE_TOPICS_PER_CATEGORY = 1;
// All prepare pages share a single quota so users can't bypass the paywall
// by switching categories. The category param is normalized to 'prepare'.
const SHARED_CATEGORY = 'prepare';

type Category = string;

/** localStorage as a fast cache — server is source of truth */
function getCachedTopics(): Record<Category, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCachedTopics(data: Record<Category, string[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function useContentAccess() {
  const { token, subscription, subscriptionLoading } = useAuth();
  const [topicsMap, setTopicsMap] = useState<Record<Category, string[]>>(getCachedTopics);
  const fetchedRef = useRef<Set<string>>(new Set());

  const isPaidUser = useMemo(() => {
    if (subscriptionLoading) return false;
    if (!subscription) return false;
    const plan = subscription.plan;
    return plan !== 'free' && plan !== null && plan !== undefined && plan !== '';
  }, [subscription, subscriptionLoading]);

  /** Lazy-fetch read topics from server (once per session) */
  const ensureLoaded = useCallback((category: Category) => {
    const cat = SHARED_CATEGORY; // normalize — all pages share one quota
    if (!token || isPaidUser || fetchedRef.current.has(cat)) return;
    fetchedRef.current.add(cat);
    fetch(`${API_URL}/api/topic-reads?category=${encodeURIComponent(cat)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.readTopics) {
          setTopicsMap(prev => {
            const updated = { ...prev, [cat]: data.readTopics };
            saveCachedTopics(updated);
            return updated;
          });
        }
      })
      .catch(() => {}); // network error — use cache
  }, [token, isPaidUser]);

  const getReadTopicIds = useCallback((category: Category): string[] => {
    ensureLoaded(category);
    return topicsMap[SHARED_CATEGORY] || [];
  }, [topicsMap, ensureLoaded]);

  const getReadCount = useCallback((category: Category): number => {
    return getReadTopicIds(category).length;
  }, [getReadTopicIds]);

  const isTopicRead = useCallback((category: Category, topicId: string): boolean => {
    return getReadTopicIds(category).includes(topicId);
  }, [getReadTopicIds]);

  const canReadTopic = useCallback((category: Category, topicId: string): boolean => {
    if (isPaidUser) return true;
    ensureLoaded(category);
    const readList = topicsMap[SHARED_CATEGORY] || [];
    // topicId includes the category prefix to avoid collisions across pages
    const fullId = `${category}:${topicId}`;
    if (readList.includes(fullId)) return true;
    return readList.length < FREE_TOPICS_PER_CATEGORY;
  }, [isPaidUser, topicsMap, ensureLoaded]);

  const isTopicLocked = useCallback((category: Category, topicId: string): boolean => {
    return !canReadTopic(category, topicId);
  }, [canReadTopic]);

  const markTopicRead = useCallback((category: Category, topicId: string) => {
    if (isPaidUser) return;
    const fullId = `${category}:${topicId}`;

    // Optimistic local update
    setTopicsMap(prev => {
      const list = prev[SHARED_CATEGORY] || [];
      if (list.includes(fullId)) return prev;
      if (list.length >= FREE_TOPICS_PER_CATEGORY) return prev; // at limit
      const updated = { ...prev, [SHARED_CATEGORY]: [...list, fullId] };
      saveCachedTopics(updated);
      return updated;
    });

    // Persist to server
    if (token) {
      fetch(`${API_URL}/api/topic-reads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: SHARED_CATEGORY, topicId: fullId }),
      }).catch(() => {}); // fire-and-forget
    }
  }, [token, isPaidUser]);

  return {
    isPaidUser,
    subscriptionLoading,
    canReadTopic,
    isTopicLocked,
    isTopicRead,
    markTopicRead,
    getReadCount,
    getReadTopicIds,
    FREE_TOPICS_PER_CATEGORY,
  };
}
