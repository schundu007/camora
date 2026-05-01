/* ── Sona ask-callback registry ───────────────────────────────────────────
   The voice router needs a way to call Sona's `ask(text)` from outside the
   AICompanionPanel React tree. Storing the callback on a module-level
   singleton (instead of zustand state) keeps it out of React's reactive
   graph: registering doesn't trigger re-renders, and the router can
   dispatch synchronously without subscribing.

   AICompanionPanel registers on mount, unregisters on unmount, and the
   router calls `sonaRegistry.ask(text, opts)` whenever a transcript is
   destined for Sona. If no panel is mounted (shouldn't happen — Lumora
   always mounts one), the dispatch silently no-ops. */

type AskFn = (text: string, opts?: { manual?: boolean }) => void;

let active: AskFn | null = null;

export const sonaRegistry = {
  /** AICompanionPanel calls this on mount with its own `ask`. The
      returned function unregisters on unmount. */
  register(fn: AskFn): () => void {
    active = fn;
    return () => {
      if (active === fn) active = null;
    };
  },

  /** Voice router calls this to forward a transcript to Sona. */
  ask(text: string, opts?: { manual?: boolean }): void {
    active?.(text, opts);
  },

  /** Test/diagnostic helper — true if a panel has registered itself. */
  isReady(): boolean {
    return active !== null;
  },
};
