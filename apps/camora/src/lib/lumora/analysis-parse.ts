/**
 * The Deep Dive and Issues chips, parsed into the cards they belong in.
 *
 * Both were rendered as their own panel above the answer, which meant the
 * questions an interviewer will ask lived in two places — "Interviewer will
 * ask" in the book, and Deep Dive behind a chip — and the mistakes lived in
 * two more. Same content, different pane, no way to read them together.
 *
 * These chips stream free-form spoken text (see the prompts in runAnalysis), so
 * getting them into a structured card means parsing the shape those prompts ask
 * for. Both parsers are deliberately forgiving: the model drifts on markers, and
 * a card that silently drops the answer is worse than one that keeps a stray
 * line.
 */

/** Fenced blocks and the failure string runAnalysis writes into the cache. */
const isNoise = (text: string) => !text || /^Error:/i.test(text.trim());

/**
 * Markdown out, identifiers intact.
 *
 * Deliberately NOT stripInlineMarkdown: that treats `__x__` as bold, which
 * turns `__init__` into `init` — and these two chips talk about code, where a
 * dunder is far likelier than an underscore-bolded word. Renaming a method in a
 * bullet that names methods is worse than leaving a stray marker.
 */
const clean = (s: string) =>
  (s || '')
    .replace(/`+/g, '')
    .replace(/\*\*/g, '')
    // Paired only, and never across a space after the opener — `n * m` is
    // multiplication, not emphasis, and these bullets do talk arithmetic.
    .replace(/\*([^*\s][^*]*?)\*/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

/**
 * `Q: <question>` followed by the spoken answer, per the deepdive prompt.
 *
 * Tolerated drift: `**Q:**`, a leading `1.` / `-`, `A:` on the answer, and an
 * answer that runs over several lines or is separated by a blank one.
 */
export function parseDeepDive(text: string): [string, string][] {
  if (isNoise(text)) return [];

  const out: [string, string][] = [];
  let question = '';
  let answer: string[] = [];

  const flush = () => {
    const a = clean(answer.join(' '));
    if (question && a) out.push([question, a]);
    question = '';
    answer = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('```')) continue;

    const q = clean(line).match(/^(?:\d+[.)]\s*)?(?:[-•]\s*)?Q\s*[:.]\s*(.+)$/i);
    if (q) {
      flush();
      question = q[1].trim();
      continue;
    }
    if (!question) continue; // preamble before the first Q:
    answer.push(clean(line).replace(/^(?:[-•]\s*)?A\s*[:.]\s*/i, ''));
  }
  flush();

  return out;
}

/**
 * `SEVERITY — where — what breaks → fix`, per the issues prompt.
 *
 * The severity is kept: it is the ranking, and "CRITICAL" beside a mistake is
 * the difference between something to watch for and something to fix now. Lines
 * without one are kept too when they read as a sentence — the model sometimes
 * answers in prose when the code is sound.
 */
const SEVERITY = /^(CRITICAL|HIGH|MEDIUM|LOW)\b\s*[—\-:|]?\s*/i;

export function parseIssues(text: string): string[] {
  if (isNoise(text)) return [];

  const out: string[] = [];
  let inFence = false;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence || !line) continue;

    const item = clean(line).replace(/^[-•]\s*/, '');
    if (!item) continue;
    // A severity marker is the signal this is one of the ranked findings. Any
    // other line is only kept when it is long enough to be a finding rather
    // than a header the prompt asked the model not to write.
    if (!SEVERITY.test(item) && item.length < 25) continue;
    if (/^(issues?|findings?|none|no issues?)\b[:.]?$/i.test(item)) continue;
    out.push(item);
  }

  return out;
}

/** Case-insensitive "already in the card", so a chip cannot duplicate a bullet. */
export const notAlreadyIn = (existing: string[]) => {
  const seen = new Set(existing.map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()));
  return (candidate: string) => !seen.has(candidate.toLowerCase().replace(/\s+/g, ' ').trim());
};

/**
 * The Explain chip: the spoken walk-through, split into its labelled beats.
 *
 * Its prompt asks for the core idea, 3-4 beats of how it runs, and the cost —
 * and the model marks those with bracket labels ([APPROACH], [WALKTHROUGH],
 * [COMPLEXITY]). Unlabelled output is kept whole rather than dropped: the words
 * are the point, the labels are only how we lay them out.
 */
export function parseExplain(text: string): [string, string][] {
  if (isNoise(text)) return [];

  const out: [string, string][] = [];
  let label = '';
  let body: string[] = [];
  let inFence = false;

  const flush = () => {
    const t = clean(body.join(' '));
    if (t) out.push([label || 'In short', t]);
    body = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence || !line) continue;

    // [APPROACH] / ## Approach / **Approach** — all mean "new beat starts here".
    const bracket = line.match(/^\[([A-Za-z][A-Za-z\s/_-]{1,30})\]$/);
    const heading = line.match(/^#{1,4}\s+(.{2,40})$/) || line.match(/^\*\*(.{2,40})\*\*:?$/);
    const marker = bracket?.[1] ?? heading?.[1];
    if (marker) {
      flush();
      const m = marker.trim().toLowerCase();
      label = m.charAt(0).toUpperCase() + m.slice(1);
      continue;
    }
    body.push(line);
  }
  flush();

  return out;
}
