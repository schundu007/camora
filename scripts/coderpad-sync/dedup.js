import { slugify } from './transform.js';

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarity(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(al, bl) / maxLen;
}

/**
 * existingProblems — the slug-keyed object from problems-full.json
 *                    (for code) or id-keyed object from mcq-problems.json
 * state            — coderpad-state.json parsed object
 * type             — 'code' | 'mcq'
 *
 * Returns { isDupe: boolean, reason?: string, matchTitle?: string }
 */
export function isDuplicate(candidate, existingProblems, state, type = 'code') {
  const idSet = new Set(type === 'code' ? state.importedCodeIds : state.importedMcqIds);

  // Layer 1: already tracked by CoderPad ID
  if (idSet.has(candidate.coderpadId)) {
    return { isDupe: true, reason: 'coderpad-id' };
  }

  // Layer 2: slug key already exists in the problems object
  const slugKey = candidate.slug ?? slugify(candidate.title);
  if (existingProblems[slugKey]) {
    return { isDupe: true, reason: 'slug', matchSlug: slugKey };
  }

  // Layer 3: fuzzy title match at ≥85% similarity against all existing titles
  const titles = Object.values(existingProblems)
    .map((p) => p.title)
    .filter(Boolean);
  const fuzzyMatch = titles.find((t) => similarity(candidate.title, t) >= 0.85);
  if (fuzzyMatch) {
    return {
      isDupe: true,
      reason: 'fuzzy',
      matchTitle: fuzzyMatch,
      score: similarity(candidate.title, fuzzyMatch),
    };
  }

  return { isDupe: false };
}
