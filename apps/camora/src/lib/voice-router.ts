/* ── Voice router ─────────────────────────────────────────────────────────
   Single dispatch point for every transcript produced by the page-level
   AudioCapture. Routing:

     Coding / Design tab → voice is NOT a problem source. The coding/design
                           problem must come from a deliberate input — pasted
                           text, a fetched URL, or an added screenshot — so
                           ambient interviewer speech can never be turned into
                           a "problem" and solved into nonsense. Voice here is
                           purely a Sona Q&A channel: once a solution is loaded,
                           interviewer follow-up questions go to the Sona sidebar.
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
}: DispatchArgs): void {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  if (activeTab === 'coding' || activeTab === 'design') {
    // Voice is NOT a problem source on Coding / Design — the problem must come
    // from a deliberate input (pasted text, fetched URL, or added screenshot).
    // Once a solution is loaded, route interviewer follow-up questions to the
    // Sona sidebar. Everything else (ambient speech, dictation with no solution
    // yet) is dropped so it can never be solved into a nonsense solution.
    const hasSolution = !!useSessionStore.getState().liveSolveContext;
    if (hasSolution && isQuestion(trimmed)) {
      log(`${activeTab} → sona (question after solve)`, trimmed.slice(0, 60));
      window.dispatchEvent(new CustomEvent('lumora:coding-question', { detail: { text: trimmed } }));
      return;
    }
    log(`${activeTab} voice dropped (not a problem source)`, trimmed.slice(0, 60));
    return;
  }

  log(`non-coding/design → sona${opts?.manual ? ' (manual)' : ''}`, trimmed.slice(0, 60));
  sonaRegistry.ask(trimmed, opts);
}
