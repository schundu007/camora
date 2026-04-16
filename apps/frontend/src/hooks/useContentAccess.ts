import { useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const STORAGE_KEY = 'camora_topics_read';
const FREE_TOPICS_PER_CATEGORY = 1;

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

  /** Lazy-fetch read topics for a category from server (once per category per session) */
  const ensureLoaded = useCallback((category: Category) => {
    if (!token || isPaidUser || fetchedRef.current.has(category)) return;
    fetchedRef.current.add(category);
    fetch(`${API_URL}/api/topic-reads?category=${encodeURIComponent(category)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.readTopics) {
          setTopicsMap(prev => {
            const updated = { ...prev, [category]: data.readTopics };
            saveCachedTopics(updated);
            return updated;
          });
        }
      })
      .catch(() => {}); // network error — use cache
  }, [token, isPaidUser]);

  const getReadTopicIds = useCallback((category: Category): string[] => {
    ensureLoaded(category);
    return topicsMap[category] || [];
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
    const readList = topicsMap[category] || [];
    if (readList.includes(topicId)) return true;
    return readList.length < FREE_TOPICS_PER_CATEGORY;
  }, [isPaidUser, topicsMap, ensureLoaded]);

  const isTopicLocked = useCallback((category: Category, topicId: string): boolean => {
    return !canReadTopic(category, topicId);
  }, [canReadTopic]);

  const markTopicRead = useCallback((category: Category, topicId: string) => {
    if (isPaidUser) return;

    // Optimistic local update
    setTopicsMap(prev => {
      const list = prev[category] || [];
      if (list.includes(topicId)) return prev;
      if (list.length >= FREE_TOPICS_PER_CATEGORY) return prev; // at limit
      const updated = { ...prev, [category]: [...list, topicId] };
      saveCachedTopics(updated);
      return updated;
    });

    // Persist to server
    if (token) {
      fetch(`${API_URL}/api/topic-reads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, topicId }),
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
