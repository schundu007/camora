/* ── Sona ask-callback registry ───────────────────────────────────────────
   The voice router needs to know two things about Sona without
   subscribing to React state:
     1. Sona's `ask(text)` callback so we can forward transcripts.
     2. Whether Sona's panel is currently open or minimized — that
        single bit decides routing on the Coding/Design tabs.

   Module-level singletons keep this out of React's reactive graph, so
   the dispatcher reads the *latest* values synchronously without
   waiting for a render commit / effect flush. AICompanionPanel
   updates these on mount and on every minimize toggle; routing
   becomes deterministic instead of racing the next paint. */

type AskFn = (text: string, opts?: { manual?: boolean }) => void;

let active: AskFn | null = null;
let panelOpen = false;

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

  /** AICompanionPanel calls this whenever its open / minimized state
      flips. Dispatcher reads this synchronously to decide whether
      voice should fill the problem field or ask Sona. */
  setOpen(open: boolean): void {
    panelOpen = open;
  },

  isOpen(): boolean {
    return panelOpen;
  },

  /** Test/diagnostic helper — true if a panel has registered itself. */
  isReady(): boolean {
    return active !== null;
  },
};
