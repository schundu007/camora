import { useCallback, useEffect, useState } from 'react';

export type CloudProvider = 'auto' | 'aws' | 'azure' | 'gcp';

const STORAGE_KEY = 'camora.cloudProvider';
const EVENT_NAME = 'camora:cloud-provider-changed';
const VALID: CloudProvider[] = ['auto', 'aws', 'azure', 'gcp'];

function readStored(): CloudProvider {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (VALID as string[]).includes(v)) return v as CloudProvider;
  } catch {}
  return 'aws';
}

/**
 * Single source of truth for the user's cloud provider choice.
 *
 * One candidate interviews for one cloud at a time — AWS, Azure, or GCP.
 * Splitting the dropdown across every diagram surface meant the same user
 * could end up with three different defaults; this hook collapses it to one
 * persisted value, synced across tabs and across components.
 *
 * Default is `aws` (not `auto`) so first-time users see real cloud-tagged
 * diagrams instead of the "auto" generator picking arbitrarily. Users can
 * still pick `auto` explicitly.
 */
export function useCloudProvider(): [CloudProvider, (next: CloudProvider) => void] {
  const [value, setValue] = useState<CloudProvider>(readStored);

  // Cross-tab sync (storage event) + same-tab sync (custom event — storage
  // doesn't fire in the writing tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue;
      if (next && (VALID as string[]).includes(next)) setValue(next as CloudProvider);
    };
    const onSameTab = (e: Event) => {
      const detail = (e as CustomEvent<CloudProvider>).detail;
      if (detail && VALID.includes(detail)) setValue(detail);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT_NAME, onSameTab as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVENT_NAME, onSameTab as EventListener);
    };
  }, []);

  const update = useCallback((next: CloudProvider) => {
    if (!VALID.includes(next)) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    setValue(next);
    try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next })); } catch {}
  }, []);

  return [value, update];
}
