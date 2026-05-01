/* ── Voice router ─────────────────────────────────────────────────────────
   Single dispatch point for every transcript produced by the page-level
   AudioCapture. Decides whether the next utterance fills the Coding/Design
   problem textarea and fires the solver, or routes to Sona as a follow-up
   question.

   State machine (per-tab):
       Coding / Design tab:
         voiceRoute === 'problem'   → fill problemRef, then flip to 'followup'
         voiceRoute === 'followup'  → ask Sona

       Behavioral / Interview tab:
         always → ask Sona (no problem-input concept here)

   Manual mic press (opts.manual === true) ALWAYS goes to Sona regardless
   of the current route — explicit user intent beats heuristic. The auto
   loop respects route; the manual button respects user intent.

   Auto-flip: the flip from 'problem' → 'followup' happens when the solver
   actually fires (LumoraShellPage's solve handlers wrap it). Doing it
   inside this dispatch would flip too early — VAD chunks the problem
   into multiple utterances and the second chunk would land in 'followup'
   before the first finished filling the textarea. */

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

export function dispatchTranscript({
  text,
  opts,
  activeTab,
  codingProblemRef,
  designProblemRef,
}: DispatchArgs): void {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  // Manual press = explicit "ask Sona this question". Bypass routing
  // so the user can interject a follow-up while the route still says
  // 'problem' (e.g. before the solver finishes).
  if (opts?.manual) {
    sonaRegistry.ask(trimmed, opts);
    return;
  }

  if (activeTab === 'coding' || activeTab === 'design') {
    const route = useInterviewStore.getState().voiceRoute;
    if (route === 'problem') {
      const ref = activeTab === 'coding' ? codingProblemRef : designProblemRef;
      const setter = ref?.current;
      if (setter) {
        setter(trimmed);
        return;
      }
      // No problem setter wired (shouldn't happen on those tabs) —
      // fall through to Sona so the utterance isn't lost.
    }
    sonaRegistry.ask(trimmed, opts);
    return;
  }

  // Behavioral / Interview / unknown — Sona owns audio.
  sonaRegistry.ask(trimmed, opts);
}
