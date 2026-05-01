/* ── Voice router ─────────────────────────────────────────────────────────
   Single dispatch point for every transcript produced by the page-level
   AudioCapture. Routes by Sona's open/minimized state — not a stored
   voiceRoute — because the user's mental model is "Sona panel open ⇒
   talking to Sona, panel minimized ⇒ filling the problem field." That
   reads off `sonaRegistry.isOpen()`, a module-level singleton updated
   synchronously by AICompanionPanel on every minimize/restore. No
   zustand subscription, no effect timing race.

   On Coding / Design tabs:
     · sonaRegistry.isOpen() === true   → ask Sona
     · sonaRegistry.isOpen() === false  → fill problemRef
     · No problemRef wired              → fall through to Sona

   On Behavioral / Interview tabs:
     · Sona always handles voice — there is no problem-input concept.

   Manual mic press (opts.manual === true) ALWAYS goes to Sona — explicit
   user intent beats heuristic. */

import { sonaRegistry } from './sona-registry';

type ProblemRef = React.MutableRefObject<((text: string) => void) | null>;

interface DispatchArgs {
  text: string;
  opts?: { manual?: boolean };
  activeTab: string; // 'coding' | 'design' | 'behavioral' | 'interview' | etc.
  codingProblemRef?: ProblemRef | null;
  designProblemRef?: ProblemRef | null;
}

const DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('lumora_route_debug') === 'on';
const log = (...args: unknown[]) => { if (DEBUG) console.log('[voice-router]', ...args); };

export function dispatchTranscript({
  text,
  opts,
  activeTab,
  codingProblemRef,
  designProblemRef,
}: DispatchArgs): void {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  if (opts?.manual) {
    log('manual → sona', trimmed.slice(0, 60));
    sonaRegistry.ask(trimmed, opts);
    return;
  }

  if (activeTab === 'coding' || activeTab === 'design') {
    const sonaOpen = sonaRegistry.isOpen();
    if (sonaOpen) {
      log('sona open → sona', trimmed.slice(0, 60));
      sonaRegistry.ask(trimmed, opts);
      return;
    }
    const ref = activeTab === 'coding' ? codingProblemRef : designProblemRef;
    const setter = ref?.current;
    if (setter) {
      log(`sona minimized → ${activeTab} problem field`, trimmed.slice(0, 60));
      setter(trimmed);
      return;
    }
    log('no problem ref → sona fallback', trimmed.slice(0, 60));
    sonaRegistry.ask(trimmed, opts);
    return;
  }

  log('non-coding/design → sona', trimmed.slice(0, 60));
  sonaRegistry.ask(trimmed, opts);
}
