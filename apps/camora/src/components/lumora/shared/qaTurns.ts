// Q&A turn grouping for the Gemini and Claude tabs.
//
// Both panels render the newest turn FIRST, so the answer being read sits just
// under the composer instead of walking further down the screen on every
// exchange — the same reason Ask Sona and the behavioral panel read that way.
// On camera, a conversation that grows downward makes the candidate drop their
// eyes with each question, which is what reads as "looking at notes".
//
// Reversing the flat message array is not enough: it would also flip the two
// halves of a turn and put an answer above the question it answers. Here the
// reversal happens per TURN, and QuestionBlock stays on top of its own answer.
export type QaRole = 'user' | 'assistant';
export type QaMsg = { role: QaRole; content: string };
export type QaTurn = { key: number; question?: QaMsg; answer?: QaMsg };

export function toTurns(messages: QaMsg[]): QaTurn[] {
  const turns: QaTurn[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const open = turns[turns.length - 1];
    // An assistant message joins the turn above it, but only if that turn is
    // still waiting for one. Two answers in a row (a restored history, a retry)
    // each keep their own block rather than one overwriting the other.
    if (m.role === 'assistant' && open && !open.answer) open.answer = m;
    else turns.push(m.role === 'user' ? { key: i, question: m } : { key: i, answer: m });
  }
  return turns;
}

/**
 * How many Q&A pairs the live windows keep on screen.
 *
 * The surface is read mid-interview, at a glance, with a camera pointed at the
 * candidate. A transcript that grows all session means the thing being read now
 * shares the window with everything already said, and the eye has to find it
 * each time. Two is enough to glance back at the previous answer without the
 * current one competing with a session's worth of history.
 *
 * Only the RENDER is capped. Older turns stay in state and are still sent to
 * the model, so follow-ups like "what about the second one" keep working.
 */
export const LIVE_TURNS = 2;

/**
 * The tail of `messages` covering the last `n` turns, a turn starting at each
 * user message. Returns the array unchanged when there are fewer than that.
 */
export function lastTurns<T extends { role: QaRole }>(messages: T[], n: number = LIVE_TURNS): T[] {
  let seen = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    seen += 1;
    // Cut AT the nth question, not after the one before it — slicing past the
    // boundary leaves that turn's answer behind with no question above it.
    if (seen === n) return messages.slice(i);
  }
  return messages;
}
