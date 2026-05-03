import { useCallback } from 'react';
import { useCloudProvider } from './useCloudProvider';
import { formatCloudContent } from '@/lib/cloud/formatContent';

/**
 * React-side convenience: returns a stable formatter function bound to
 * the current cloud provider, plus the raw provider value so callers can
 * gate UI (e.g. show a "showing Azure equivalents" hint) without subscribing
 * twice.
 *
 * Usage:
 *   const fmt = useCloudFormatter();
 *   <p>{fmt(problem.introduction)}</p>
 */
export function useCloudFormatter() {
  const [provider] = useCloudProvider();
  const format = useCallback(
    (text: string | null | undefined) => (text ? formatCloudContent(text, provider) : text || ''),
    [provider]
  );
  return format;
}
