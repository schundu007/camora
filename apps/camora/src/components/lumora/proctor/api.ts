import { fetchAPI } from '@/lib/api-client';
import type { ProctorEvent } from './types';

export const proctorApi = {
  createSession: (surface: string) =>
    fetchAPI<{ id: string }>('/api/v1/proctor/sessions', {
      method: 'POST', body: JSON.stringify({ surface }),
    }),
  sendEvents: (sessionId: string, events: ProctorEvent[]) =>
    fetchAPI<{ inserted: number }>('/api/v1/proctor/events', {
      method: 'POST', body: JSON.stringify({ sessionId, events }),
    }),
  endSession: (id: string, riskScore: number, status: string) =>
    fetchAPI<{ ok: true }>(`/api/v1/proctor/sessions/${id}/end`, {
      method: 'POST', body: JSON.stringify({ riskScore, status }),
    }),
  getSession: (id: string) => fetchAPI(`/api/v1/proctor/sessions/${id}`, {}),
  listSessions: () => fetchAPI('/api/v1/proctor/sessions', {}),
};
