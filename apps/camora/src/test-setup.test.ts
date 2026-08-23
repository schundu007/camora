import { describe, it, expect } from 'vitest';
import { useSessionStore } from './stores/session-store';

/**
 * Guards the Web Storage shim in test-setup.ts.
 *
 * Node 26's built-in localStorage is a getter returning undefined without
 * `--localstorage-file`, and vitest's jsdom environment aliases window to
 * globalThis — so jsdom's Storage never wins and localStorage is undefined.
 * Zustand persist() writes through localStorage.setItem on every set(), so
 * without the shim EVERY persisted store throws on its first write. Six
 * voice-router tests failed that way, and the cause looked like a router bug
 * rather than a missing global.
 */
describe('test environment — Web Storage', () => {
  it('exposes a working localStorage', () => {
    expect(typeof localStorage).toBe('object');
    localStorage.setItem('probe', 'value');
    expect(localStorage.getItem('probe')).toBe('value');
    localStorage.removeItem('probe');
    expect(localStorage.getItem('probe')).toBeNull();
  });

  it('exposes a working sessionStorage', () => {
    expect(typeof sessionStorage).toBe('object');
    sessionStorage.setItem('probe', 'value');
    expect(sessionStorage.getItem('probe')).toBe('value');
    sessionStorage.clear();
    expect(sessionStorage.getItem('probe')).toBeNull();
  });

  it('lets a persisted zustand store complete a write', () => {
    // The exact call that threw: persist() reaches for localStorage.setItem
    // as a side effect of set(). If Storage is missing this raises
    // "Cannot read properties of undefined (reading 'setItem')".
    expect(() => useSessionStore.getState().setLiveSolveContext(null)).not.toThrow();
  });
});
