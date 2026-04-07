const STORAGE_PREFIX = 'camora_diagram_';
const MAX_ENTRIES = 50;

type CacheEntry = {
  type: 'png' | 'mermaid';
  data: string;
  timestamp: number;
};

// Module-level in-memory cache (survives SPA navigation)
const memoryCache = new Map<string, CacheEntry>();

function getSessionKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

export function getDiagramCache(key: string): CacheEntry | null {
  // 1. Check memory first (instant)
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // 2. Check sessionStorage (survives page refresh)
  try {
    const raw = sessionStorage.getItem(getSessionKey(key));
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw);
      // Restore to memory cache
      memoryCache.set(key, entry);
      return entry;
    }
  } catch {}

  return null;
}

export function setDiagramCache(key: string, entry: CacheEntry) {
  // Set in memory
  memoryCache.set(key, entry);

  // Persist to sessionStorage
  try {
    // Evict old entries if too many
    if (sessionStorage.length > MAX_ENTRIES) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
      }
      // Remove oldest half
      keysToRemove.slice(0, Math.floor(keysToRemove.length / 2)).forEach(k => sessionStorage.removeItem(k));
    }

    // Don't cache base64 data URLs in sessionStorage (too large)
    if (entry.data.startsWith('data:')) return;

    sessionStorage.setItem(getSessionKey(key), JSON.stringify(entry));
  } catch {}
}

export function clearDiagramCache() {
  memoryCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {}
}
