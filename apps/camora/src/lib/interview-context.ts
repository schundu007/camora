const STORE_KEY = 'lumora_interview_contexts_v1';
export const INTERVIEW_CONTEXT_UPDATED_EVENT = 'lumora:interview-context-updated';

export interface InterviewContext {
  id: string;
  name: string;
  company?: string;
  role?: string;
  jdFilename?: string;
  resumeFilename?: string;
  docFilenames?: string[];
  cachedJd?: string;
  cachedResume?: string;
  cachedDocs?: Array<{ name: string; content: string }>;
  createdAt: string;
}

interface ContextStore {
  contexts: InterviewContext[];
  activeId: string | null;
}

function readStore(): ContextStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { contexts: [], activeId: null };
    return JSON.parse(raw) as ContextStore;
  } catch {
    return { contexts: [], activeId: null };
  }
}

function writeStore(store: ContextStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

function fireUpdate(): void {
  try {
    window.dispatchEvent(new Event(INTERVIEW_CONTEXT_UPDATED_EVENT));
  } catch {}
}

export function listInterviewContexts(): InterviewContext[] {
  return readStore().contexts;
}

export function getActiveInterviewContextId(): string | null {
  return readStore().activeId;
}

export function getActiveInterviewContext(): InterviewContext | null {
  const store = readStore();
  if (!store.activeId) return null;
  return store.contexts.find(c => c.id === store.activeId) ?? null;
}

export function setActiveInterviewContextId(id: string | null): void {
  const store = readStore();
  store.activeId = id;
  writeStore(store);
  fireUpdate();
}

export function saveInterviewContext(ctx: InterviewContext): void {
  const store = readStore();
  const idx = store.contexts.findIndex(c => c.id === ctx.id);
  if (idx >= 0) {
    store.contexts[idx] = ctx;
  } else {
    store.contexts.push(ctx);
  }
  writeStore(store);
  fireUpdate();
}

export function deleteInterviewContext(id: string): void {
  const store = readStore();
  store.contexts = store.contexts.filter(c => c.id !== id);
  if (store.activeId === id) store.activeId = null;
  writeStore(store);
  fireUpdate();
}
