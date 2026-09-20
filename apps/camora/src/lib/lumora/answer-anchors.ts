// Anchor parsing for Lumora answers.
//
// Every answer surface asks the model for the same line grammar:
//
//     **<anchor, 1-3 words>** — <one spoken idea>
//
// The anchors are a skeleton, not decoration — the prompt says so in those
// words. Until now the renderer did not know that: it bolded the anchor inline
// and emitted one flat column, so a ten-hop sequence and a two-line aside were
// the same shape on screen and the candidate had to read to tell them apart.
//
// This turns that grammar into structure the renderer can lay out in two
// columns, with the anchors in a rail the eye can scan straight down.

export type AnswerLine = {
  text: string;
  /** 1-based position when the block is an ordered sequence. */
  n?: number;
  /** The line arrived as `- item`. Kept so the renderer can preserve list
   *  semantics for an anchorless bullet list rather than flattening it to
   *  paragraphs — a screen reader should still hear "list, 2 items". */
  bullet?: boolean;
};

export type AnswerBlock =
  | { kind: 'anchor'; anchor: string; lines: AnswerLine[]; ordered: boolean }
  | { kind: 'prose'; lines: AnswerLine[] };

/** `**Anchor** — rest`, or a bare `**Anchor**` on its own line. */
const ANCHOR_RE = /^\*\*([^*]{1,48}?)\*\*\s*(?:[—–-]\s*(.*))?$/;

/**
 * The rail is a narrow column, and the prompt asks for anchors of one to three
 * words. Not every bolded lead-in obeys that: the "### If they push" section
 * emits `**<the question the interviewer asks>** — <the reply>`, and a whole
 * question set as a rail label wraps across three lines and reads as shouting.
 *
 * A long lead-in, or one that is itself a question, stays in the body as an
 * ordinary bold lead-in instead.
 */
const railable = (anchor: string) => anchor.length <= 28 && !anchor.endsWith('?');

/**
 * `**3. Authentication/Authorization** — …`
 *
 * A model that numbers its own steps emits them as anchor lines, one per step.
 * Taken at face value each becomes its own rail row, which is wrong twice: the
 * rail fills with twelve step names instead of the four anchors that are the
 * actual skeleton, and a step name is far too long for it — "3.
 * Authentication/Authorization" overflows the column and lands on top of the
 * text beside it.
 *
 * A numbered line is not a sibling of the anchor above it. It is one of its
 * steps, so it folds in as a child and our own numbering takes over — the
 * model's "3." is dropped rather than rendered next to our 3.
 */
const NUMBERED_RE = /^(\d{1,2})[.)]\s+(.+)$/;
/** A child line that carries its own bold lead-in, e.g. `**HTTP POST** — …`. */
const BOLD_LEAD_RE = /^(?:[-*•]\s*)?\*\*[^*]{1,48}?\*\*\s*[—–-]\s*\S/;
const BULLET_RE = /^[-*•]\s+/;

/**
 * Anchors that mean "this is a walk". The prompts standardise the anchor
 * vocabulary, so this is reading a label the model was told to use rather than
 * guessing at free text.
 */
const SEQUENCE_ANCHOR_RE = /\b(path|flow|flows|step|steps|sequence|order|walk|pipeline|lifecycle|journey)\b/i;

/**
 * A block is numbered when it says it is a walk AND every child names its own
 * step.
 *
 * The structural half alone is not enough, and production proved it: "The
 * catch" came back with four caveats that each had a bold lead-in, structurally
 * identical to a nine-hop path, and got numbered 1-4 as though the reader
 * should do them in order. Caveats are a set, not a sequence. Requiring the
 * anchor to say so too costs nothing — the walk is always labelled "The path"
 * or "How it flows" — and it stops the renderer inventing an order the answer
 * does not have.
 *
 * Three is the floor. Two steps read fine unnumbered, and numbering them adds
 * chrome without adding orientation.
 */
const isOrdered = (anchor: string, lines: AnswerLine[]) =>
  SEQUENCE_ANCHOR_RE.test(anchor) &&
  lines.length >= 3 &&
  lines.every((l) => BOLD_LEAD_RE.test(l.text));

export function parseAnchors(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let open: Extract<AnswerBlock, { kind: 'anchor' }> | null = null;
  // An anchor written on a line of its own — `**The path**` with nothing after
  // it — is a HEADER for the lines beneath it, not a one-line point. The lines
  // that follow are its steps even when each carries its own lead-in, so they
  // nest rather than becoming eighteen sibling rows down the rail with no
  // numbering and no way to tell a nine-step path from nine unrelated facts.
  let openIsHeader = false;
  let prose: AnswerLine[] = [];

  const flushProse = () => {
    if (prose.length) blocks.push({ kind: 'prose', lines: prose });
    prose = [];
  };
  const flushAnchor = () => {
    openIsHeader = false;
    if (!open) return;
    open.ordered = isOrdered(open.anchor, open.lines);
    if (open.ordered) open.lines.forEach((l, i) => { l.n = i + 1; });
    blocks.push(open);
    open = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      // A blank line closes a header's adoption window. Without it the next
      // skeleton anchor — "**The catch** — …" — is swallowed as one more step
      // of the walk above it.
      openIsHeader = false;
      continue;
    }

    const m = line.match(ANCHOR_RE);
    if (m) {
      // Backticks never reach a rail label: the label is CSS-uppercased, so a
      // code span inside it renders as SHOUTING CODE with its ticks showing.
      const anchor = m[1].replace(/`/g, '').trim();
      const rest = (m[2] || '').trim();
      const num = anchor.match(NUMBERED_RE);

      if (num && open) {
        // A step of the anchor above, not a new one.
        open.lines.push({ text: rest ? `**${num[2]}** — ${rest}` : `**${num[2]}**` });
        continue;
      }
      if (open && openIsHeader && rest) {
        // A step under a bare header anchor. The lead-in is kept in the text so
        // it still renders bold, and so isOrdered can see the block is a walk.
        open.lines.push({ text: `**${anchor}** — ${rest}` });
        continue;
      }
      if (railable(anchor)) {
        flushAnchor();
        flushProse();
        open = { kind: 'anchor', anchor, lines: rest ? [{ text: rest }] : [], ordered: false };
        openIsHeader = !rest;
        continue;
      }
    }

    // Anything after an anchor belongs to it — a dashed sub-line or a plain
    // continuation sentence. Both appear in real answers and both are children,
    // so the bullet marker is stripped and the text kept.
    const bullet = BULLET_RE.test(line);
    const text = line.replace(BULLET_RE, '');

    if (open) {
      open.lines.push(bullet ? { text, bullet } : { text });
      continue;
    }

    prose.push(bullet ? { text, bullet } : { text });
  }

  flushAnchor();
  flushProse();
  return blocks;
}
