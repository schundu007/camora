import { getStoredToken } from '@/utils/tokenStore';

const BASE = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

async function apiFetch(path) {
  const token = getStoredToken();
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const k8sPathApi = {
  getTopics: () => apiFetch('/api/v1/k8s/topics'),
  getTopic: (slug) => apiFetch(`/api/v1/k8s/topics/${slug}`),
};
