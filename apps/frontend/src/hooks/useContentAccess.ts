import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'camora_topics_read';
const FREE_TOPICS_PER_CATEGORY = 3;

type Category = string; // 'coding' | 'system-design' | 'behavioral' | 'low-level' | 'microservices' | 'databases' | 'sql'

function getReadTopics(): Record<Category, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadTopics(data: Record<Category, string[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useContentAccess() {
  const { subscription, subscriptionLoading } = useAuth();

  const isPaidUser = useMemo(() => {
    if (subscriptionLoading) return true; // default-open while loading
    if (!subscription) return false;
    return subscription.plan !== 'free' && subscription.plan !== null;
  }, [subscription, subscriptionLoading]);

  const getReadCount = useCallback((category: Category): number => {
    const data = getReadTopics();
    return (data[category] || []).length;
  }, []);

  const getReadTopicIds = useCallback((category: Category): string[] => {
    const data = getReadTopics();
    return data[category] || [];
  }, []);

  const isTopicRead = useCallback((category: Category, topicId: string): boolean => {
    const data = getReadTopics();
    return (data[category] || []).includes(topicId);
  }, []);

  const canReadTopic = useCallback((category: Category, topicId: string): boolean => {
    if (isPaidUser) return true;
    const data = getReadTopics();
    const readList = data[category] || [];
    // Already read this topic — always allow re-reads
    if (readList.includes(topicId)) return true;
    // Under the limit — allow
    return readList.length < FREE_TOPICS_PER_CATEGORY;
  }, [isPaidUser]);

  const isTopicLocked = useCallback((category: Category, topicId: string): boolean => {
    return !canReadTopic(category, topicId);
  }, [canReadTopic]);

  const markTopicRead = useCallback((category: Category, topicId: string) => {
    if (isPaidUser) return; // don't track for paid users
    const data = getReadTopics();
    const readList = data[category] || [];
    if (!readList.includes(topicId)) {
      data[category] = [...readList, topicId];
      saveReadTopics(data);
    }
  }, [isPaidUser]);

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
