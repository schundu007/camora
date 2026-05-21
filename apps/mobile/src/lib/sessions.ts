import * as SecureStore from 'expo-secure-store';

const SESSIONS_KEY = 'camora.sessions_v1';
const MAX_SESSIONS = 50;
const MAX_QUESTION_LEN = 120;
const MAX_ANSWER_LEN = 160;

export interface Session {
  id: string;
  question: string;
  answer: string;
  duration: number;
  createdAt: number;
}

export async function getSessions(): Promise<Session[]> {
  const raw = await SecureStore.getItemAsync(SESSIONS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function saveSession(s: Omit<Session, 'id'>): Promise<void> {
  const session: Session = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question: s.question.slice(0, MAX_QUESTION_LEN),
    answer: s.answer.slice(0, MAX_ANSWER_LEN),
    duration: s.duration,
    createdAt: s.createdAt,
  };
  const existing = await getSessions();
  const updated = [session, ...existing].slice(0, MAX_SESSIONS);
  await SecureStore.setItemAsync(SESSIONS_KEY, JSON.stringify(updated));
}
