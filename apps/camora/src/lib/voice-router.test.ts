import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dispatchTranscript } from './voice-router';
import { useSessionStore } from '../stores/session-store';
import { sonaRegistry } from './sona-registry';

// Live speech on the Coding tab was vanishing: the router dropped any transcript
// that arrived before a solution was on screen, or whose phrasing missed the
// question heuristic, and dropped it WITHOUT putting it anywhere. Nothing appeared,
// so dictation read as broken. The rule was only ever meant to suppress
// auto-submission — never the transcript itself.

const SOLVE_CONTEXT = {
  surface: 'coding' as const,
  problem: 'Trapping Rain Water',
  approach: 'two pointers',
  complexity: 'TIME=O(n), SPACE=O(1)',
  code: 'def trap(h): return 0',
  language: 'python',
  solvedAt: 0,
};

function captureCodingEvents() {
  const seen: Array<{ text: string; autoSend?: boolean }> = [];
  const handler = (e: Event) => seen.push((e as CustomEvent).detail);
  window.addEventListener('lumora:coding-question', handler);
  return { seen, stop: () => window.removeEventListener('lumora:coding-question', handler) };
}

describe('dispatchTranscript — coding tab', () => {
  let cap: ReturnType<typeof captureCodingEvents>;

  beforeEach(() => {
    cap = captureCodingEvents();
    useSessionStore.getState().setLiveSolveContext(null);
  });
  afterEach(() => {
    cap.stop();
    useSessionStore.getState().setLiveSolveContext(null);
    vi.restoreAllMocks();
  });

  it('asks automatically when a solution is up and it sounds like a question', () => {
    useSessionStore.getState().setLiveSolveContext(SOLVE_CONTEXT);
    dispatchTranscript({ text: 'What is the time complexity of this?', activeTab: 'coding' });
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].autoSend).toBe(true);
  });

  // The case that made this look broken: speaking before anything is solved.
  it('still surfaces the transcript when no solution is on screen', () => {
    dispatchTranscript({ text: 'What is the time complexity of this?', activeTab: 'coding' });
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].text).toBe('What is the time complexity of this?');
    expect(cap.seen[0].autoSend).toBe(false);
  });

  it('still surfaces speech the question heuristic rejects', () => {
    useSessionStore.getState().setLiveSolveContext(SOLVE_CONTEXT);
    dispatchTranscript({ text: 'yeah okay sounds good', activeTab: 'coding' });
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].autoSend).toBe(false);
  });

  // The safety property this gating exists for: ambient speech must never be
  // turned into a problem and solved into nonsense.
  it('never routes coding speech to the problem sink', () => {
    const ask = vi.spyOn(sonaRegistry, 'ask');
    dispatchTranscript({ text: 'so anyway I used to work at a startup', activeTab: 'coding' });
    expect(ask).not.toHaveBeenCalled();
    expect(cap.seen[0].autoSend).toBe(false);
  });

  it('treats design the same way as coding', () => {
    dispatchTranscript({ text: 'How would you shard this?', activeTab: 'design' });
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].autoSend).toBe(false);
  });

  it('ignores empty and whitespace-only transcripts', () => {
    dispatchTranscript({ text: '   ', activeTab: 'coding' });
    dispatchTranscript({ text: '', activeTab: 'coding' });
    expect(cap.seen).toHaveLength(0);
  });
});

describe('dispatchTranscript — other tabs', () => {
  it('sends straight to Sona and emits no coding event', () => {
    const cap = captureCodingEvents();
    const ask = vi.spyOn(sonaRegistry, 'ask').mockImplementation(() => {});
    dispatchTranscript({ text: 'Tell me about a conflict.', activeTab: 'behavioral' });
    expect(ask).toHaveBeenCalledWith('Tell me about a conflict.', undefined);
    expect(cap.seen).toHaveLength(0);
    cap.stop();
    vi.restoreAllMocks();
  });

  it('passes the manual flag through', () => {
    const ask = vi.spyOn(sonaRegistry, 'ask').mockImplementation(() => {});
    dispatchTranscript({ text: 'hello', activeTab: 'interview', opts: { manual: true } });
    expect(ask).toHaveBeenCalledWith('hello', { manual: true });
    vi.restoreAllMocks();
  });
});
