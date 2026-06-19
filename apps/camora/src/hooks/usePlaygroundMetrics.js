import { useState } from 'react';
import { getStoredToken } from '@/utils/tokenStore';

const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

export function usePlaygroundMetrics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API}/api/v1/playground/sessions/my-stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (res.ok) {
        setStats(await res.json());
      } else {
        setError('Failed to load stats');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, fetchStats };
}
