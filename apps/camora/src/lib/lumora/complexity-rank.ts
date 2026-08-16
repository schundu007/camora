/**
 * Comparing approaches means comparing their bounds, and "O(n log n)" is a
 * string. This turns one into a number so a matrix can say which of the three
 * solutions is actually the best rather than trusting the order they arrived in.
 *
 * The scale is ordinal, not a cost model: it only has to put the classes in the
 * right sequence.
 *
 *   O(1) 0 · O(log n) 1 · O(√n) 5 · O(n) 10 · O(n log n) 11 · O(n²) 20 ·
 *   O(2ⁿ) 400 · O(n!) 500
 */

/** Strip the O(...) wrapper and the qualifiers models like to prepend. */
const unwrap = (raw: string): string => {
  let s = raw.toLowerCase().trim();
  s = s.replace(/\b(amortized|amortised|expected|average|avg|worst[- ]case|best[- ]case|roughly|about|approx\.?|~)\b/g, ' ');
  // O(...) / Θ(...) / Ω(...) — keep only what is inside the outermost parens.
  const m = s.match(/[oθω]\s*\(([\s\S]*)\)/);
  if (m) s = m[1];
  return s.replace(/[·×]/g, '*').replace(/\s+/g, ' ').trim();
};

/** Degree of one additive term: n*m is 2, n^3 is 3, a bare constant is 0. */
const termDegree = (term: string): number => {
  let t = term;
  let degree = 0;

  // sqrt(n) / √n contribute half a power of n.
  t = t.replace(/(?:sqrt|√)\s*(?:\(\s*[^)]*\)|[a-z0-9]+)/g, () => {
    degree += 0.5;
    return ' ';
  });

  // Explicit powers first, so n^3 counts as three and not as one bare variable.
  t = t.replace(/([a-z])\s*\^\s*(\d+)/g, (_, __, d: string) => {
    degree += Number(d);
    return ' ';
  });

  // Whatever variables remain are linear factors. Multiplied, not added — the
  // caller has already split this term on '+'.
  const vars = t.match(/[a-z]/g);
  if (vars) degree += vars.length;

  return degree;
};

/**
 * Ordinal rank of a complexity bound. Lower is better. Returns null when the
 * string carries no bound we can read, so callers can leave the cell blank
 * rather than invent an ordering.
 */
export const scoreComplexity = (raw?: string | null): number | null => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let s = unwrap(raw);
  if (!s) return null;

  if (/!/.test(s)) return 500;                      // O(n!)
  // A VARIABLE exponent is exponential; a digit exponent (n^2) is polynomial.
  if (/(?:\d|[a-z])\s*\^\s*[a-z]/.test(s)) return 400;

  // Logs are counted and removed WITH their argument — otherwise the trailing n
  // in "n log n" reads as a second factor and the bound scores as quadratic.
  let logs = 0;
  s = s.replace(/log2?\s*(?:\^\s*(\d+))?\s*(?:\(\s*[^)]*\)|[a-z0-9]+)?/g, (_, exp: string | undefined) => {
    logs += exp ? Number(exp) : 1;
    return ' ';
  });

  // Additive terms are dominated by the largest, not summed: O(v + e) is linear.
  const degree = Math.max(...s.split(/[+±]|(?<![\^\d])-/).map(termDegree));

  return degree * 10 + logs;
};

export type RankedApproach = { time?: string | null; space?: string | null };

/**
 * Which approach is the strongest, and which is the baseline. Time decides;
 * space breaks ties, because two O(n) approaches are separated by what they
 * allocate. Both are null when every approach scores identically — a matrix
 * that badges a "best" among three equals is telling the candidate something
 * untrue right before they say it out loud.
 */
export const rankApproaches = (approaches: RankedApproach[]): { bestIdx: number | null; worstIdx: number | null } => {
  const scored = approaches.map((a, index) => ({
    index,
    time: scoreComplexity(a.time),
    space: scoreComplexity(a.space),
  })).filter(s => s.time !== null);

  if (scored.length < 2) return { bestIdx: null, worstIdx: null };

  const cmp = (a: typeof scored[0], b: typeof scored[0]) =>
    a.time! - b.time! || (a.space ?? Infinity) - (b.space ?? Infinity);

  const sorted = [...scored].sort(cmp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (cmp(first, last) === 0) return { bestIdx: null, worstIdx: null };

  return { bestIdx: first.index, worstIdx: last.index };
};
