/**
 * Answer-format overrides, in ONE place, for EVERY provider.
 *
 * These blocks were copy-pasted into claude.js, openai-stream.js and
 * gemini-stream.js. That is not a theoretical problem: a fix to the DETAILED
 * rule went into two of the three, so whether the candidate got a readable
 * answer or a wall of prose depended on which provider happened to serve the
 * request — invisibly, mid-interview.
 *
 * Any provider that streams an answer imports from here. Adding a fourth
 * provider must not mean a fourth copy of the format contract.
 */

/** More ground covered means MORE BEATS, never longer ones. The candidate is
 *  still reading this aloud off a glance. */
export const DETAILED_MODE_OVERRIDE = `

RESPONSE FORMAT OVERRIDE — DETAILED MODE:
The user wants MORE GROUND COVERED. That means MORE BEATS, never LONGER ones —
this is still being read aloud in a live interview, off a glance.
- No bullet-point cap: use as many bullets as the depth needs.
- The 20-word cap per bullet STILL APPLIES. Depth comes from more bullets and
  from a short sub-line under a bullet, never from a 40-word sentence.
- Keep the hook — em dash — detail shape on every line.
- For BEHAVIORAL: give the full STAR narrative, but as more short beats:
  Situation and Task stay one line each, Action becomes 4-6 short bullets rather
  than 2-3 long ones, Result keeps its metric.
- For TECHNICAL: explain the "why" and the trade-offs as ADDITIONAL bullets.
- Thorough, yes. Unreadable-at-a-glance, never.`;

export const STAR_MODE_OVERRIDE = `

RESPONSE FORMAT OVERRIDE — STAR MODE:
Regardless of question type, structure the answer using the STAR framework:
- SITUATION: 1-2 sentences — context, company, team, problem
- TASK: 1 sentence — your specific responsibility
- ACTION: 3-5 bullets — concrete steps
- RESULT: 1-2 sentences — quantifiable outcome
Every bullet still obeys the 20-word cap: STAR is a shape, not a licence to run long.`;
