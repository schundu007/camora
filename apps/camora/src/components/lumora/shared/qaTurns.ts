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
