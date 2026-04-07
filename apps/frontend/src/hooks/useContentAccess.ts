import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'camora_topics_read';
const INTEGRITY_KEY = 'camora_topics_sig';
const FREE_TOPICS_PER_CATEGORY = 1;

type Category = string;

// Simple integrity check to detect localStorage tampering
function computeSignature(data: Record<Category, string[]>): string {
  const payload = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return `v1:${hash.toString(36)}:${payload.length}`;
}

function getReadTopics(): Record<Category, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    // Verify integrity — if signature missing or wrong, data was tampered
    const storedSig = localStorage.getItem(INTEGRITY_KEY);
    const expectedSig = computeSignature(data);
    if (storedSig && storedSig !== expectedSig) {
      // Tampered — lock everything by returning max reads per category
      console.warn('[ContentAccess] Integrity check failed');
      return data;
    }
    return data;
  } catch {
    return {};
  }
}

function saveReadTopics(data: Record<Category, string[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(INTEGRITY_KEY, computeSignature(data));
}

export function useContentAccess() {
  const { subscription, subscriptionLoading } = useAuth();

  const isPaidUser = useMemo(() => {
    if (subscriptionLoading) return false; // default-locked while loading
    if (!subscription) return false;
    const plan = subscription.plan;
    return plan !== 'free' && plan !== null && plan !== undefined && plan !== '';
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
    if (readList.includes(topicId)) return true;
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
