// apps/lumora-backend/src/lib/algorithmFlowchart.js
//
// A decision tree for naming the data structure and algorithm a problem calls for.
//
// The point is not the recommendation — the model can already name "DFS". The point
// is the TRAIL: which questions were asked of the statement, what the statement said
// that settled each one, and therefore why this technique and not a neighbouring one.
// That is what a candidate has to reproduce out loud in an interview, and it is the
// part a bare answer never shows.
//
// Structure mirrors the algo.monster selection flowchart (47 decision nodes, 44
// leaves, single root). Each decision node carries `cues` — the wording in a problem
// statement that settles that branch — written for this prompt.
//
// The tree is authoritative: a model-proposed path is validated edge-by-edge against
// it (see validatePath), so an invented step is rejected rather than shown.

export const ROOT = 'graph';

export const NODES = {
    "graph": { q: "Is it a graph?", yes: "tree", no: "sorted-search", cues: "nodes/edges stated outright; a matrix where you step to adjacent cells; or states-and-transitions you must model as a graph yourself" },
    "tree": { q: "Is it a tree?", yes: "tree-level-order", no: "directed-graph", cues: "the words tree, root, leaf, parent/child; n nodes with n-1 edges and no cycle" },
    "tree-build": { q: "Count/generate many trees?", yes: "tree-build-dc", no: "tree-dfs", cues: "generate all valid trees, or count tree-shaped structures \u2014 not a single traversal" },
    "tree-build-dc": { technique: "Divide and Conquer / Tree DP" },
    "tree-level-order": { q: "Level-order or shortest-level answer?", yes: "tree-bfs", no: "tree-build", cues: "level-order, zigzag by level, per-level aggregate, or the nearest/first answer by depth" },
    "tree-bfs": { technique: "BFS" },
    "tree-dfs": { technique: "DFS" },
    "directed-graph": { q: "DAG-related?", yes: "directed-graph-topo", no: "shortest-path", cues: "edges have direction; prerequisites, dependencies, ordering, course/build sequence; explicitly acyclic" },
    "directed-graph-topo": { technique: "Topological Sort" },
    "shortest-path": { q: "Shortest-path problem?", yes: "shortest-path-weighted", no: "connectivity", cues: "fewest steps/moves, minimum cost or time to reach, cheapest route, minimum transformations" },
    "shortest-path-weighted": { q: "Is the graph Weighted?", yes: "shortest-path-dijkstra", no: "shortest-path-bfs", cues: "edges carry a cost/distance/time; unweighted means every edge counts as 1" },
    "shortest-path-dijkstra": { technique: "Dijkstra's Algorithm" },
    "shortest-path-bfs": { technique: "BFS" },
    "connectivity": { q: "Connectivity problem?", yes: "connectivity-dsu", no: "graph-smallcontraints", cues: "connected, component, island, group, province; merging or uniting nodes; can A reach B" },
    "connectivity-dsu": { technique: "Disjoint Set Union" },
    "graph-smallcontraints": { q: "Small constraints?", yes: "graph-smallcontraints-dfs", no: "graph-smallcontraints-bfs", cues: "tiny bounds (roughly n<=20, grid<=10x10), or asks for all paths/arrangements \u2014 exhaustive search is affordable" },
    "graph-smallcontraints-dfs": { technique: "DFS/backtracking" },
    "graph-smallcontraints-bfs": { technique: "BFS" },
    "sorted-search": { q: "Sorted input or monotonic answer?", yes: "range-query", no: "kth-smallest", cues: "input is sorted or rotated-sorted; first/last valid position; if an answer works, all larger (or smaller) ones do too" },
    "range-query": { q: "Dynamic range or order queries?", yes: "range-query-leaf", no: "sorted-search-binarysearch", cues: "updates interleaved with queries; sum/min/max/count over an index or value range; predecessor/successor" },
    "range-query-leaf": { technique: "Ordered Set / Fenwick / Segment Tree" },
    "sorted-search-binarysearch": { technique: "Binary Search" },
    "kth-smallest": { q: "kth smallest/largest?", yes: "kth-smallest-heap", no: "linked-list", cues: "the words kth, top k, k most frequent, k closest" },
    "kth-smallest-heap": { technique: "Heap / Sortings" },
    "linked-list": { q: "Linked list problem?", yes: "linked-list-pointer-pattern", no: "hash-table", cues: "the statement names a linked list, or hands you a head/next pointer" },
    "linked-list-pointer-pattern": { q: "Fast/slow or fixed-gap pointers?", yes: "linked-list-twopointers", no: "linked-list-multi-merge", cues: "fast/slow pointers, a fixed gap, cycle detection, nth-from-end, middle of the list" },
    "linked-list-twopointers": { technique: "Two pointers" },
    "linked-list-multi-merge": { q: "Merge many sorted lists?", yes: "linked-list-heap", no: "linked-list-manipulation", cues: "combine k sorted lists" },
    "linked-list-heap": { technique: "Heap / Divide and Conquer" },
    "linked-list-manipulation": { technique: "Linked List Manipulation" },
    "hash-table": { q: "Fast lookup, counting, or grouping?", yes: "hash-table-leaf", no: "intervals", cues: "seen before, duplicate, complement, count occurrences, group by a normalized key" },
    "hash-table-leaf": { technique: "Hash Table / Counting" },
    "intervals": { q: "Merge, insert, or scan intervals?", yes: "intervals-leaf", no: "partition-array", cues: "input is [start, end] pairs; merge overlapping, insert one, or sweep them in order" },
    "intervals-leaf": { technique: "Sorting + Interval Scan" },
    "partition-array": { q: "In-place array partitioning?", yes: "partition-array-leaf", no: "string-segmentation", cues: "rearrange one array in place into regions by category; constant extra space" },
    "partition-array-leaf": { technique: "Two pointers / Partitioning" },
    "string-segmentation": { q: "Split/match string with dictionary?", yes: "string-pattern", no: "small-constraints", cues: "split or match a string against a dictionary/word list; can the string be segmented" },
    "string-pattern": { q: "Prefix or pattern matching?", yes: "string-pattern-leaf", no: "string-segmentation-leaf", cues: "prefix/suffix queries, shared prefixes across many words, repeated-substring search" },
    "string-pattern-leaf": { technique: "Trie / String Matching / Rolling Hash" },
    "string-segmentation-leaf": { technique: "Trie / DP / Memoization" },
    "small-constraints": { q: "Small constraints?", yes: "small-constraints-efficiency", no: "sums", cues: "bounds small enough that cubic or slower passes (roughly n<=500)" },
    "small-constraints-efficiency": { q: "Is brute force enough?", yes: "small-constraints-bruteforce/backtracking", no: "bitmask-state", cues: "estimate brute force against the bound \u2014 if it fits the time limit, take it" },
    "small-constraints-bruteforce/backtracking": { technique: "Brute force / Backtracking" },
    "small-constraints-dp": { technique: "Dynamic Programming" },
    "bitmask-state": { q: "Subset state?", yes: "bitmask-dp", no: "small-constraints-dp", cues: "state is which items are used/chosen; n<=20; assign or visit every item once" },
    "bitmask-dp": { technique: "Bitmask DP" },
    "subarrays": { q: "Subarray or substring problem?", yes: "subarrays-window", no: "max/min", cues: "the words subarray, substring, submatrix/rectangle \u2014 a contiguous stretch" },
    "sums": { q: "Sum/additive problem?", yes: "subarrays-prefixsums", no: "subarrays", cues: "the answer is built from sums \u2014 subarray sum, running total, sum no larger than k" },
    "subarrays-window": { q: "Maintain a valid window?", yes: "subarrays-twopointers", no: "subarrays-structure", cues: "longest/shortest stretch satisfying a condition; expand until invalid, shrink until valid" },
    "subarrays-prefixsums": { technique: "Prefix Sums" },
    "subarrays-twopointers": { technique: "Sliding Window" },
    "subarrays-structure": { q: "Need nearest greater/smaller bounds?", yes: "subarrays-monotonic-stack", no: "subarrays-dp", cues: "nearest greater/smaller element, previous/next boundary, how far a value extends" },
    "subarrays-monotonic-stack": { technique: "Monotonic Stack" },
    "subarrays-dp": { technique: "Dynamic Programming" },
    "max/min": { q: "Compute a max/min?", yes: "max/min-binarysearch-hint", no: "counting", cues: "maximize/minimize a value \u2014 profit, cost, time, length" },
    "max/min-binarysearch-hint": { q: "Sorted index or monotonic answer?", yes: "max/min-binarysearch", no: "max/min-structure", cues: "sorted input, or you can test whether a candidate answer works and feasibility is monotonic" },
    "max/min-structure": { q: "Need nearest greater/smaller bounds?", yes: "max/min-monotonic-stack", no: "max/min-subproblem", cues: "the answer comes from how far each value extends before a larger/smaller boundary" },
    "max/min-monotonic-stack": { technique: "Monotonic Stack" },
    "max/min-subproblem": { q: "Split into subproblems?", yes: "max/min-dp", no: "max/min-greedyhuh", cues: "the answer decomposes into overlapping subproblems reused across positions" },
    "max/min-greedyhuh": { q: "Greedy solution?", yes: "max/min-greedy", cues: "a locally best choice at each step is provably globally best" },
    "max/min-binarysearch": { technique: "Binary Search" },
    "max/min-dp": { technique: "Dynamic Programming" },
    "max/min-greedy": { technique: "Greedy Algorithms" },
    "counting": { q: "Count number of ways?", yes: "counting-efficiency", no: "sequence-count", cues: "how many ways, number of, total possible arrangements" },
    "counting-efficiency": { q: "Is brute force enough?", yes: "counting-bruteforce/backtracking", no: "counting-dp", cues: "estimate brute force against the bound \u2014 if it fits, enumerate" },
    "counting-bruteforce/backtracking": { technique: "Brute Force / Backtracking" },
    "counting-dp": { technique: "Dynamic Programming" },
    "sequence-count": { q: "Multiple sequences?", yes: "sequence-count-monotonic", no: "find-indices", cues: "two or more sequences compared or combined" },
    "sequence-count-monotonic": { q: "Monotonic condition?", yes: "sequence-count-twopointers", no: "sequence-count-subproblems", cues: "a property along the sequences is entirely non-increasing or non-decreasing" },
    "sequence-count-subproblems": { q: "Split into subproblems?", yes: "sequence-count-dp", cues: "state is a pair of prefixes \u2014 dp[i][j] over the two sequences" },
    "sequence-count-twopointers": { technique: "Two pointers" },
    "sequence-count-dp": { technique: "Dynamic Programming" },
    "find-indices": { q: "Find/enumerate indices?", yes: "find-indices-monotonic", no: "constant-memory", cues: "count or find pairs/triplets of indices i<j satisfying a condition" },
    "find-indices-monotonic": { q: "Monotonic condition?", yes: "find-indices-twopointers", cues: "a property is monotonic, so moving one pointer can never require moving the other back" },
    "find-indices-twopointers": { technique: "Two pointers" },
    "constant-memory": { q: "Need O(1) memory?", yes: "constant-memory-monotonic", no: "parse-symbols", cues: "the statement or a follow-up demands O(1) extra space" },
    "constant-memory-monotonic": { q: "Monotonic condition?", yes: "constant-memory-twopointers", cues: "a property is monotonic, so two moving pointers suffice" },
    "constant-memory-twopointers": { technique: "Two pointers" },
    "parse-symbols": { q: "Need to parse symbols?", yes: "parse-symbols-optimize", no: "design-check", cues: "match opening/closing brackets, evaluate an expression, nested structure" },
    "parse-symbols-optimize": { q: "Optimize/count valid spans?", yes: "parse-symbols-dp", no: "parse-symbols-stack", cues: "asks for the longest/shortest valid span or a count over many matches, not just validity" },
    "parse-symbols-dp": { technique: "Dynamic Programming" },
    "parse-symbols-stack": { technique: "Stack" },
    "design-check": { q: "Object with operation guarantees?", yes: "design-leaf", no: "simulation-check", cues: "implement a class with named methods, repeated calls, per-operation complexity guarantees" },
    "design-leaf": { technique: "Design + Supporting Data Structures" },
    "simulation-check": { q: "Direct transformation or simulation?", yes: "simulation-leaf", no: "math-bit-check", cues: "follow the statement step by step, mutating a matrix/string/number directly" },
    "simulation-leaf": { technique: "Simulation / Basic DSA" },
    "math-bit-check": { q: "Math identities, powers, or bit tricks?", yes: "number-theory", no: "specialized-leaf", cues: "repeated squaring, bit shifts/masks, digit arithmetic, algebraic identity" },
    "math-bit-leaf": { technique: "Math / Bit Manipulation" },
    "number-theory": { q: "Number properties?", yes: "number-theory-leaf", no: "math-bit-leaf", cues: "primes, divisors, factors, GCD/LCM, modular arithmetic" },
    "number-theory-leaf": { technique: "Number Theory" },
    "specialized-leaf": { technique: "Specialized / Advanced Pattern" },};

/** Decision nodes ask a question; leaves name a technique. */
export function isLeaf(id) {
  return Boolean(NODES[id]?.technique);
}

/**
 * Compact rendering for the system prompt: one line per decision node.
 * Leaves are omitted — they are reachable as branch targets and carry no question.
 */
export function renderTreeForPrompt() {
  const lines = [];
  for (const [id, n] of Object.entries(NODES)) {
    if (!n.q) continue;
    const yes = n.yes ? `yes->${n.yes}` : 'yes->(end)';
    const no = n.no ? `no->${n.no}` : 'no->(end)';
    lines.push(`${id} | ${n.q} | ${yes} | ${no}${n.cues ? ` | cues: ${n.cues}` : ''}`);
  }
  return lines.join('\n');
}

/** Technique names a path can end on, for the prompt's closing constraint. */
export function leafTechniques() {
  return [...new Set(Object.values(NODES).filter(n => n.technique).map(n => n.technique))].sort();
}

/**
 * Validate a model-proposed walk.
 *
 * A path is accepted only when it starts at the root, every step's answer follows a
 * real edge, and it ends either on a leaf or on a decision node whose branch does not
 * exist in the chart (four nodes have a single branch). Returns the trimmed valid
 * prefix so a good beginning is not discarded because of a bad final step.
 */
export function validatePath(path) {
  if (!Array.isArray(path) || path.length === 0) {
    return { ok: false, reason: 'empty path', steps: [], technique: null };
  }

  const steps = [];
  let cursor = ROOT;

  for (const raw of path) {
    const id = raw?.node;
    const answer = String(raw?.answer ?? '').toLowerCase();

    if (id !== cursor) {
      return { ok: false, reason: `expected ${cursor}, got ${id ?? 'nothing'}`, steps, technique: null };
    }
    const node = NODES[id];
    if (!node || !node.q) {
      return { ok: false, reason: `${id} is not a decision node`, steps, technique: null };
    }
    if (answer !== 'yes' && answer !== 'no') {
      return { ok: false, reason: `${id} answered "${raw?.answer}"`, steps, technique: null };
    }

    steps.push({
      node: id,
      question: node.q,
      answer,
      evidence: typeof raw.evidence === 'string' ? raw.evidence.trim() : '',
    });

    const next = node[answer];
    if (!next) {
      // A branch the chart does not model — the walk legitimately stops here.
      return { ok: true, reason: null, steps, technique: null };
    }
    if (isLeaf(next)) {
      return { ok: true, reason: null, steps, technique: NODES[next].technique };
    }
    cursor = next;
  }

  // Ran out of steps without reaching a leaf.
  return { ok: false, reason: `path stops at ${cursor} without a conclusion`, steps, technique: null };
}
