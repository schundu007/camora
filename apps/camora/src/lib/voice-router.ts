/* ── Voice router ─────────────────────────────────────────────────────────
   Single dispatch point for every transcript produced by the page-level
   AudioCapture. Sona is no longer co-resident on Coding / Design, so
   routing is now trivially deterministic:

     Coding / Design tab → fill the corresponding problem field
                           and run the solver. Same path for AUTO
                           and manual mic press.
     Behavioral / Interview tab → ask Sona.

   `opts.manual === true` only affects Sona's isQuestion gating; it
   does not change which sink receives the transcript. */

import { sonaRegistry } from './sona-registry';
import { isQuestion } from './questionDetector';
import { useSessionStore } from '../stores/session-store';

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
    // After a solution is loaded: route interviewer questions to Sona
    // (same pattern as behavioral tab). Manual presses always go to
    // the problem field regardless.
    const hasSolution = !!useSessionStore.getState().liveSolveContext;
    if (hasSolution && !opts?.manual && isQuestion(trimmed)) {
      log(`${activeTab} → sona (question after solve)`, trimmed.slice(0, 60));
      window.dispatchEvent(new CustomEvent('lumora:coding-question', { detail: { text: trimmed } }));
      return;
    }

    const ref = activeTab === 'coding' ? codingProblemRef : designProblemRef;
    const setter = ref?.current;
    if (setter) {
      log(`${activeTab} problem field${opts?.manual ? ' (manual)' : ''}`, trimmed.slice(0, 60));
      setter(trimmed);
      return;
    }
    // Defensive — ref not wired yet (component still mounting). Fall
    // through to Sona so the utterance isn't silently lost.
    log(`${activeTab} ref missing → sona fallback`, trimmed.slice(0, 60));
    sonaRegistry.ask(trimmed, opts);
    return;
  }

  log(`non-coding/design → sona${opts?.manual ? ' (manual)' : ''}`, trimmed.slice(0, 60));
  sonaRegistry.ask(trimmed, opts);
}
