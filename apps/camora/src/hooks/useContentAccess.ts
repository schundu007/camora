import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const FREE_LIMITS: Record<string, number> = {
  'coding': 3,
  'system-design': 2,
  'low-level': 2,
  'behavioral': 2,
  'microservices': 2,
  'databases': 2,
  'sql': 2,
  'projects': 2,
  'roadmaps': 2,
  'eng-blogs': 2,
};
const DEFAULT_FREE_LIMIT = 2;
function getFreeLimitForCategory(category: string): number {
  return FREE_LIMITS[category] ?? DEFAULT_FREE_LIMIT;
}

type Category = string;

export function useContentAccess() {
  const { token, subscription, subscriptionLoading } = useAuth();
  // Server is the single source of truth — no localStorage
  const [topicsMap, setTopicsMap] = useState<Record<Category, string[]>>({});
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());
  const fetchingRef = useRef<Set<string>>(new Set());

  const isPaidUser = useMemo(() => {
    if (subscriptionLoading) return false;
    if (!subscription) return false;
    const plan = subscription.plan;
    return plan !== 'free' && plan !== null && plan !== undefined && plan !== '';
  }, [subscription, subscriptionLoading]);

  /** Fetch read topics for a category from server */
  const fetchCategory = useCallback((category: Category) => {
    if (!token || isPaidUser || fetchingRef.current.has(category)) return;
    fetchingRef.current.add(category);
    fetch(`${API_URL}/api/topic-reads?category=${encodeURIComponent(category)}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.readTopics) {
          setTopicsMap(prev => ({ ...prev, [category]: data.readTopics }));
        } else {
          // Server returned no data — treat as 0 reads
          setTopicsMap(prev => ({ ...prev, [category]: prev[category] || [] }));
        }
        setLoadedCategories(prev => new Set(prev).add(category));
      })
      .catch(() => {
        // Network error — treat as 0 reads (locked by default)
        setTopicsMap(prev => ({ ...prev, [category]: prev[category] || [] }));
        setLoadedCategories(prev => new Set(prev).add(category));
      });
  }, [token, isPaidUser]);

  // Prefetch all categories on mount (once token is available)
  useEffect(() => {
    if (!token || isPaidUser || subscriptionLoading) return;
    const categories = Object.keys(FREE_LIMITS);
    categories.forEach(cat => fetchCategory(cat));
  }, [token, isPaidUser, subscriptionLoading, fetchCategory]);

  const isCategoryLoaded = useCallback((category: Category): boolean => {
    return isPaidUser || loadedCategories.has(category);
  }, [isPaidUser, loadedCategories]);

  const getReadTopicIds = useCallback((category: Category): string[] => {
    if (!isCategoryLoaded(category)) fetchCategory(category);
    return topicsMap[category] || [];
  }, [topicsMap, isCategoryLoaded, fetchCategory]);

  const getReadCount = useCallback((category: Category): number => {
    return getReadTopicIds(category).length;
  }, [getReadTopicIds]);

  const isTopicRead = useCallback((category: Category, topicId: string): boolean => {
    return getReadTopicIds(category).includes(topicId);
  }, [getReadTopicIds]);

  const canReadTopic = useCallback((category: Category, topicId: string): boolean => {
    if (subscriptionLoading) return true; // Don't lock while checking subscription
    if (isPaidUser) return true;
    // If category not loaded from server yet, lock by default (safe side)
    if (!isCategoryLoaded(category)) {
      fetchCategory(category);
      return false; // Locked until server confirms
    }
    const readList = topicsMap[category] || [];
    if (readList.includes(topicId)) return true; // Already read
    return readList.length < getFreeLimitForCategory(category);
  }, [isPaidUser, subscriptionLoading, topicsMap, isCategoryLoaded, fetchCategory]);

  const isTopicLocked = useCallback((category: Category, topicId: string): boolean => {
    if (subscriptionLoading) return false; // Don't flash locks while loading
    if (isPaidUser) return false;
    return !canReadTopic(category, topicId);
  }, [canReadTopic, subscriptionLoading, isPaidUser]);

  const markTopicRead = useCallback((category: Category, topicId: string) => {
    if (isPaidUser) return;

    // Optimistic local update
    setTopicsMap(prev => {
      const list = prev[category] || [];
      if (list.includes(topicId)) return prev;
      if (list.length >= getFreeLimitForCategory(category)) return prev;
      return { ...prev, [category]: [...list, topicId] };
    });

    // Persist to server — update local state with server response
    if (token) {
      fetch(`${API_URL}/api/topic-reads`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, topicId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data?.readTopics) {
            // Sync with server truth
            setTopicsMap(prev => ({ ...prev, [category]: data.readTopics }));
          }
        })
        .catch(() => {}); // Optimistic update already applied
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
    isCategoryLoaded,
    FREE_LIMITS,
    getFreeLimitForCategory,
  };
}
