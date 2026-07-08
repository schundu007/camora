import { useCallback, useMemo, useState } from 'react';
import { type Check, summarize } from './readiness';

/**
 * Pure. Returns a NEW Set every call — `useState` bails out of a re-render when
 * the next state is Object.is-equal to the previous one, so mutating and
 * returning the same Set would silently drop the update.
 */
export function dismissReducer(state: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(state);
  next.add(id);
  return next;
}

/**
 * Per-session dismissal. Deliberately NOT persisted: ignoring a degrading check
 * silences it until reload, so the next interview re-warns. Persisting it
 * forever would let the amber chip become wallpaper and hide the one check that
 * mattered.
 */
export function useToolReadiness(checks: Check[]) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => dismissReducer(prev, id));
  }, []);

  // `checks` is rebuilt on every render by the caller; memoise on its contents,
  // not its identity, or this recomputes every keystroke in the editor.
  const key = checks.map((c) => `${c.id}:${c.satisfied ? 1 : 0}`).join('|');
  const result = useMemo(
    () => summarize(checks, dismissed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, dismissed],
  );

  return { ...result, dismiss };
}
