/**
 * Whisper hallucination filter.
 *
 * Extracted from routes/transcription.js so the heuristics are unit-testable.
 * That file previously carried this logic inline, where a bug could only be
 * found by reading production logs — which is exactly how the stopword bug
 * below survived: it silently discarded the LONGEST interviewer utterances,
 * i.e. every real behavioral question.
 *
 * The job here is narrow: reject text Whisper invented out of silence or room
 * noise, and NOTHING else. A false positive is far more expensive than a false
 * negative — a dropped chunk means the candidate gets no answer at all, while a
 * leaked one costs a cheap LLM call the question gate downstream can still
 * reject.
 */

export const HALLUCINATION_PATTERNS = [
  /^thank(s| you)?\s*(for)?\s*(watching|listening|viewing|tuning in)/i,
  /^(please\s+)?(like\s+and\s+)?subscribe/i,
  /^(bye|goodbye|see you)\s*(next time|later|soon)?\.?$/i,
  /^(okay|ok|alright|all right)\.?\s*$/i,
  /^(yeah|yep|yup|nah|nope|uh|um|hmm|huh)\.?\s*$/i,
  /^you\.?$/i,
  /^thanks\.?$/i,
  /^thank you( so much| very much)?\.?$/i,
  /^(see you|see ya|cya|goodnight|good night)\.?$/i,
  /^\.+$/,
  /^[\s.,!?-]+$/,                  // pure punctuation
  /^(\s*thank you\.?\s*)+$/i,
  /^\s*$/,
];

/**
 * English function words. These carry no signal about whether Whisper is
 * looping: natural speech repeats them constantly, a stuck decoder repeats
 * CONTENT words ("Marvin Marvin Marvin"). The previous filter counted any word
 * over 2 characters, so "the", "and", "you" and "are" all voted — and any
 * utterance long enough to say "the" four times was thrown away as a
 * hallucination. A 35-word behavioral question trips that every single time.
 */
const STOPWORDS = new Set([
  'the', 'and', 'you', 'are', 'for', 'that', 'this', 'with', 'have', 'was',
  'but', 'not', 'they', 'his', 'her', 'she', 'him', 'from', 'their', 'what',
  'were', 'when', 'your', 'can', 'said', 'there', 'use', 'each', 'which',
  'them', 'then', 'like', 'into', 'has', 'more', 'other', 'about', 'out',
  'many', 'some', 'would', 'these', 'her', 'make', 'him', 'been', 'now',
  'its', 'who', 'did', 'get', 'come', 'made', 'may', 'part', 'over', 'know',
  'just', 'also', 'how', 'why', 'where', 'want', 'need', 'okay', 'well',
  'really', 'kind', 'sort', 'thing', 'things', 'going', 'gonna', 'yeah',
  'right', 'sure', 'mean', 'because', 'something', 'anything',
]);

/** Content words only — the vocabulary a stuck decoder actually loops on. */
function contentWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Collapse Whisper's duplicate-phrase artifact ("What is Bazel? What is
 * Bazel?") BEFORE filtering, so a real question that merely stuttered survives.
 */
export function dedupeRepeats(t) {
  if (!t) return t;
  const sentences = t.split(/(?<=[.?!])\s+/);
  const kept = [];
  for (const s of sentences) {
    const norm = s.trim().toLowerCase().replace(/[.?!,]+$/, '');
    if (!norm) continue;
    if (kept.length && kept[kept.length - 1].norm === norm) continue;
    kept.push({ raw: s.trim(), norm });
  }
  let out = kept.map((s) => s.raw).join(' ') || t.trim();
  out = out.replace(/(.{3,60}?)(?:[,\s]+\1)+/gi, '$1');
  return out.trim();
}

/**
 * @returns {{ filtered: boolean, text: string, reasons: object }}
 *   `text` is the de-duplicated transcript; `filtered` true means discard it.
 */
/** Every word, in original order — trigrams must respect real adjacency. */
function allWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(Boolean);
}

/**
 * True when a content word repeats the way a STUCK DECODER repeats it, rather
 * than the way a speaker does.
 *
 * The distinction is adjacency, not frequency. A stuck decoder emits the word
 * back to back ("Marvin Marvin Marvin Marvin"); a real question hammers its
 * topic word with other words in between ("...make a tradeoff, how you made the
 * tradeoff, who you talked to about the tradeoff..."). A pure frequency or
 * frequency/length ratio cannot separate those two — it drops the real question
 * — so the primary signal is the longest consecutive run, with a
 * near-total-dominance rule as a backstop for interleaved loops.
 *
 * Checked against the pre-dedupe text too, because dedupeRepeats() collapses a
 * run down to one word and would otherwise launder an obvious loop.
 */
function isDecoderLoop(text) {
  const words = contentWords(text);
  if (!words.length) return false;

  let longestRun = 1;
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    if (run > longestRun) longestRun = run;
  }
  if (longestRun >= 4) return true;

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const maxRepeat = Math.max(...Object.values(freq));
  return maxRepeat >= 4 && maxRepeat / words.length >= 0.6;
}

export function classifyTranscript(rawText) {
  const original = (rawText || '').trim();
  const text = dedupeRepeats(original);

  const byPattern = HALLUCINATION_PATTERNS.some((p) => p.test(text));

  // A single short token with no punctuation is Whisper picking a word out of
  // silence. Real questions are longer; "really?" carries punctuation.
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasTerminalPunct = /[?!.]$/.test(text);
  const shortNoise = wordCount <= 1 && text.length < 14 && !hasTerminalPunct;

  // Repetition: a stuck decoder emits one content word over and over. Require
  // BOTH an absolute floor and DOMINANCE — in a genuine 40-word answer a
  // content word can legitimately recur (a system's name, the topic under
  // discussion), so the raw count alone cannot decide. A real loop is mostly
  // the looped word. Tested on the original text as well; see isDecoderLoop.
  const wordRepetition = isDecoderLoop(text) || isDecoderLoop(original);

  // Phrase loops ("tell me about yourself tell me about yourself") keep max word
  // frequency low but repeat a trigram. Trigrams are built over ALL words in
  // original order — dropping stopwords first would fabricate adjacencies that
  // were never spoken.
  //
  // The test is COVERAGE, not count. A phrase loop IS the whole transcript; an
  // incidental repeat is a small part of a longer real utterance. Counting
  // occurrences alone throws away sentences that legitimately reuse a phrase
  // ("the ingestion service ... the ingestion service ..."), which is normal
  // when someone names one system throughout an answer.
  const seq = allWords(text);
  let trigramRepetition = false;
  if (seq.length >= 6) {
    const counts = new Map();
    for (let i = 0; i <= seq.length - 3; i++) {
      const tg = `${seq[i]} ${seq[i + 1]} ${seq[i + 2]}`;
      counts.set(tg, (counts.get(tg) || 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    trigramRepetition = maxCount >= 2 && (maxCount * 3) / seq.length >= 0.6;
  }

  // Whisper sometimes emits German/Japanese/etc. on noise despite language:'en'.
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  const foreign = text.length > 0 && nonAscii / text.length > 0.08;

  const reasons = {
    pattern: byPattern,
    shortNoise,
    repeat: wordRepetition || trigramRepetition,
    foreign,
  };
  return {
    filtered: byPattern || shortNoise || reasons.repeat || foreign,
    text,
    reasons,
  };
}
