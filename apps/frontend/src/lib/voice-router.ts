/* ── Voice router ─────────────────────────────────────────────────────────
   Single dispatch point for every transcript produced by the page-level
   AudioCapture. Routes by tab + the persistent voiceRoute state, NOT
   by Sona's panel visibility — Sona open/minimized is purely a UI
   choice and shouldn't reroute the mic.

   Routing rules:

     Coding / Design tab + voiceRoute === 'problem'
        → fill the corresponding problem field, which fires the solver
           and auto-flips voiceRoute to 'followup' for next time.
        → If problemRef isn't wired (shouldn't happen) we fall through
           to Sona so the utterance is never lost.

     Coding / Design tab + voiceRoute === 'followup'
        → ask Sona (the user already kicked off a solve and is now
           asking follow-up questions about it).

     Behavioral / Interview tab
        → always ask Sona (no problem-input concept on those tabs).

   `opts.manual === true` does NOT change routing — pressing the mic
   button on the coding tab still fills the coding problem the same as
   AUTO would. Manual just disables isQuestion() gating on Sona's end
   so a short imperative utterance ("compare these approaches") still
   fires Sona instead of being filtered out. */

import { useInterviewStore } from '@/stores/interview-store';
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

  if (activeTab === 'coding' || activeTab === 'design') {
    const route = useInterviewStore.getState().voiceRoute;
    if (route === 'problem') {
      const ref = activeTab === 'coding' ? codingProblemRef : designProblemRef;
      const setter = ref?.current;
      if (setter) {
        log(`route=problem → ${activeTab} problem field${opts?.manual ? ' (manual)' : ''}`, trimmed.slice(0, 60));
        setter(trimmed);
        return;
      }
      log('route=problem but no ref → sona fallback', trimmed.slice(0, 60));
      sonaRegistry.ask(trimmed, opts);
      return;
    }
    log(`route=followup → sona${opts?.manual ? ' (manual)' : ''}`, trimmed.slice(0, 60));
    sonaRegistry.ask(trimmed, opts);
    return;
  }

  log(`non-coding/design → sona${opts?.manual ? ' (manual)' : ''}`, trimmed.slice(0, 60));
  sonaRegistry.ask(trimmed, opts);
}
