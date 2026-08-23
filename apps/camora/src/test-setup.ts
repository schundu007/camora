import '@testing-library/jest-dom/vitest';

/**
 * Web Storage shim for the test environment.
 *
 * Node 26 ships an experimental built-in `localStorage` that is defined on
 * globalThis as a GETTER RETURNING UNDEFINED unless the process was started
 * with `--localstorage-file` (hence the "localStorage is not available"
 * warning vitest prints at startup). Vitest's jsdom environment aliases
 * `window` to globalThis, so jsdom's own Storage implementation never wins —
 * `localStorage` and `window.localStorage` both resolve to undefined even
 * though jsdom created a perfectly good one.
 *
 * Zustand's persist() defaults to `createJSONStorage(() => localStorage)`, so
 * the first set() on ANY persisted store threw:
 *   TypeError: Cannot read properties of undefined (reading 'setItem')
 *
 * That is an environment defect, not a product one — real browsers and
 * Electron both have Web Storage. So install a real in-memory Storage here
 * rather than teaching the stores to work without one.
 *
 * Only fills in when the built-in resolves to undefined, so a future Node or
 * vitest that hands us a working Storage is left alone.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(key: string) {
      return map.has(String(key)) ? (map.get(String(key)) as string) : null;
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
    removeItem(key: string) {
      map.delete(String(key));
    },
    clear() {
      map.clear();
    },
  } as Storage;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if ((globalThis as Record<string, unknown>)[name] === undefined) {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, name, {
      value: storage,
      configurable: true,
      writable: true,
    });
    // window is aliased to globalThis under vitest's jsdom environment, but
    // define it explicitly so this still holds if that ever stops being true.
    if (typeof window !== 'undefined' && window !== (globalThis as unknown)) {
      Object.defineProperty(window, name, {
        value: storage,
        configurable: true,
        writable: true,
      });
    }
  }
}
