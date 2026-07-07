/**
 * Coding knowledge base — RAG over a curated library of solved DSA / LeetCode
 * patterns so the Coding + Cofix models can INFER a new problem's pattern and
 * copy a verified, harness-correct exemplar instead of re-deriving the approach
 * every time.
 *
 * Two retrieval paths, chosen at runtime:
 *   1. Vector (production): when COHERE_API_KEY + Postgres/pgvector are present,
 *      the curated set is embedded once into `lumora_coding_kb` and queried by
 *      cosine similarity against the incoming problem — same Cohere
 *      embed-english-v3.0 (1024-dim) stack the rest of Lumora RAG uses.
 *   2. Lexical (fallback): keyword/tag overlap over the in-memory curated set.
 *      Zero external deps, so retrieval still works (and is testable) without
 *      a Cohere key or DB.
 *
 * Every reference solution here follows the runner's execution contract:
 * PARAMETERS in, RETURN the answer — no stdin, no print, no module-level call.
 * They are verified against codeRunner in the coding-knowledge test.
 */

// ---------------------------------------------------------------------------
// Curated solved-pattern library. Keep solutions minimal, idiomatic, and
// STRICTLY return-based (params in → return value out).
// ---------------------------------------------------------------------------

export const CODING_KB = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    patternTag: 'Hash Map',
    difficulty: 'Easy',
    keywords: ['array', 'sum', 'target', 'pair', 'indices', 'complement', 'hash'],
    problem: 'Return indices of the two numbers in an array that add up to a target.',
    example: { input: '[2,7,11,15], 9', expected: '[0, 1]' },
    solution: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []`,
  },
  {
    id: 'max-subarray',
    title: 'Maximum Subarray',
    patternTag: 'DP - Tabulation',
    difficulty: 'Medium',
    keywords: ['array', 'subarray', 'maximum', 'sum', 'contiguous', 'kadane', 'dp'],
    problem: 'Return the largest sum of any contiguous subarray (Kadane).',
    example: { input: '[-2,1,-3,4,-1,2,1,-5,4]', expected: '6' },
    solution: `def max_sub_array(nums):
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best`,
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    patternTag: 'Stack',
    difficulty: 'Easy',
    keywords: ['string', 'parentheses', 'brackets', 'balanced', 'stack', 'valid', 'matching'],
    problem: 'Return whether a string of brackets is validly matched.',
    example: { input: '"()[]{}"', expected: 'True' },
    solution: `def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack`,
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeating Characters',
    patternTag: 'Sliding Window',
    difficulty: 'Medium',
    keywords: ['string', 'substring', 'window', 'unique', 'distinct', 'longest', 'sliding'],
    problem: 'Return the length of the longest substring without repeating characters.',
    example: { input: '"abcabcbb"', expected: '3' },
    solution: `def length_of_longest_substring(s):
    last = {}
    start = best = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best`,
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    patternTag: 'Binary Search',
    difficulty: 'Easy',
    keywords: ['sorted', 'array', 'search', 'target', 'index', 'binary', 'logn'],
    problem: 'Return the index of target in a sorted array, or -1.',
    example: { input: '[-1,0,3,5,9,12], 9', expected: '4' },
    solution: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
  },
  {
    id: 'num-islands',
    title: 'Number of Islands',
    patternTag: 'DFS',
    difficulty: 'Medium',
    keywords: ['grid', 'matrix', 'islands', 'connected', 'components', 'dfs', 'bfs', 'flood'],
    problem: 'Return the number of connected groups of 1s in a grid.',
    example: { input: '[["1","1","0"],["1","0","0"],["0","0","1"]]', expected: '2' },
    solution: `def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    def sink(r, c):
        if 0 <= r < rows and 0 <= c < cols and grid[r][c] == '1':
            grid[r][c] = '0'
            sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                sink(r, c)
    return count`,
  },
  {
    id: 'climb-stairs',
    title: 'Climbing Stairs',
    patternTag: 'DP - Tabulation',
    difficulty: 'Easy',
    keywords: ['dp', 'fibonacci', 'ways', 'steps', 'stairs', 'count', 'recurrence'],
    problem: 'Return the number of distinct ways to climb n stairs taking 1 or 2 steps.',
    example: { input: '5', expected: '8' },
    solution: `def climb_stairs(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a`,
  },
  {
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    patternTag: 'Linked List',
    difficulty: 'Easy',
    keywords: ['linked', 'list', 'reverse', 'pointer', 'node', 'next'],
    problem: 'Reverse a singly linked list and return the new head.',
    example: { input: '[1,2,3,4,5]', expected: '[5, 4, 3, 2, 1]' },
    solution: `def reverse_list(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev`,
  },
  {
    id: 'two-pointer-sorted',
    title: 'Two Sum II (sorted, two pointers)',
    patternTag: 'Two Pointers',
    difficulty: 'Medium',
    keywords: ['sorted', 'two', 'pointer', 'pair', 'sum', 'target', 'converge'],
    problem: 'In a sorted array return the 1-indexed pair summing to target.',
    example: { input: '[2,7,11,15], 9', expected: '[1, 2]' },
    solution: `def two_sum_sorted(numbers, target):
    lo, hi = 0, len(numbers) - 1
    while lo < hi:
        s = numbers[lo] + numbers[hi]
        if s == target:
            return [lo + 1, hi + 1]
        if s < target:
            lo += 1
        else:
            hi -= 1
    return []`,
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    patternTag: 'Hash Map',
    difficulty: 'Medium',
    keywords: ['string', 'anagram', 'group', 'sort', 'hash', 'bucket', 'key'],
    problem: 'Group words that are anagrams of each other.',
    example: { input: '["eat","tea","tan","ate","nat","bat"]', expected: '[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]' },
    solution: `def group_anagrams(strs):
    groups = {}
    for w in strs:
        key = ''.join(sorted(w))
        groups.setdefault(key, []).append(w)
    return list(groups.values())`,
  },
  {
    id: 'stdin-arith',
    title: 'Read two ints, output sum/diff/product (contract mapping)',
    patternTag: 'Simulation',
    difficulty: 'Easy',
    keywords: ['read', 'stdin', 'input', 'print', 'two', 'integers', 'arithmetic', 'sum', 'difference', 'product'],
    problem: 'Given two integers a and b, output "a+b a-b a*b". IMPORTANT: this maps a stdin-phrased problem onto the return-based contract — take a and b as PARAMETERS and RETURN the string; do NOT read stdin or print.',
    example: { input: '3 5', expected: '8 -2 15' },
    solution: `def solve(a, b):
    return f"{a + b} {a - b} {a * b}"`,
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    patternTag: 'Simulation',
    difficulty: 'Easy',
    keywords: ['fizz', 'buzz', 'divisible', 'modulo', 'loop', 'range', 'simulation'],
    problem: 'Return the FizzBuzz sequence 1..n as a list of strings.',
    example: { input: '5', expected: "['1', '2', 'Fizz', '4', 'Buzz']" },
    solution: `def fizz_buzz(n):
    out = []
    for i in range(1, n + 1):
        if i % 15 == 0:
            out.append('FizzBuzz')
        elif i % 3 == 0:
            out.append('Fizz')
        elif i % 5 == 0:
            out.append('Buzz')
        else:
            out.append(str(i))
    return out`,
  },
];

// ---------------------------------------------------------------------------
// Lexical scoring fallback (no external deps → always available/testable)
// ---------------------------------------------------------------------------

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 2);
}

function lexicalScore(problemText, entry) {
  const toks = new Set(tokenize(problemText));
  let score = 0;
  for (const kw of entry.keywords) {
    if (toks.has(kw)) score += 2;
  }
  for (const t of tokenize(entry.title)) {
    if (toks.has(t)) score += 1;
  }
  for (const t of tokenize(entry.patternTag)) {
    if (toks.has(t)) score += 1;
  }
  return score;
}

/** Rank the curated set lexically; returns the best `k` entries (score > 0). */
export function lexicalRetrieve(problemText, k = 2) {
  return CODING_KB
    .map((e) => ({ e, s: lexicalScore(problemText, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.e);
}

/**
 * Retrieve the best-matching solved exemplars for a problem.
 *
 * Uses in-memory LEXICAL (keyword/tag) retrieval — no embeddings, no DB, no
 * external service. For a curated library this size that is both sufficient and
 * fully offline-testable. Returns [] when nothing relevant is found so the
 * caller can skip injection cleanly.
 *
 * SCALE-UP (only if the KB grows to thousands of scraped problems): swap the
 * body for semantic retrieval using the OpenAI key already configured in this
 * backend (text-embedding-3-small) + pgvector — NOT Cohere. The signature is
 * async precisely so that upgrade is a drop-in with no caller changes.
 */
export async function retrieveExemplars(problemText, { k = 2 } = {}) {
  if (!problemText || problemText.trim().length < 3) return [];
  return lexicalRetrieve(problemText, k);
}

/** Format retrieved exemplars into a prompt block (return-based, contract-correct). */
export function formatExemplars(exemplars) {
  if (!exemplars || exemplars.length === 0) return '';
  const blocks = exemplars.map((e) => `--- Pattern: ${e.patternTag} — ${e.title} ---
${e.problem}
Reference solution (PARAMETERS in, RETURN the answer — the exact contract to follow):
${e.solution}`).join('\n\n');
  return `\n##############################################################################
# SOLVED-PATTERN EXEMPLARS (retrieved for THIS problem — study the approach and
# especially the return-based structure; adapt, do not copy verbatim)
##############################################################################
${blocks}\n`;
}
