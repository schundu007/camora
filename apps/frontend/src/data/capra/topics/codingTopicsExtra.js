// Extra DSA pattern topics (AlgoMaster patterns not yet in core codingTopics)

export const extraCodingCategoryMap = {
  'prefix-sum': 'two-pointers',
  'kadanes-algorithm': 'two-pointers',
  'monotonic-stack': 'stacks-queues',
  'monotonic-queue': 'stacks-queues',
  'linked-list-reversal': 'linked-lists',
  'fast-slow-pointers': 'linked-lists',
  'divide-and-conquer': 'searching',
  'merge-sort': 'searching',
  'quicksort-quickselect': 'searching',
  'bucket-sort': 'searching',
  'tree-traversal': 'trees',
  'bst': 'trees',
  'two-heaps': 'trees',
  'top-k-elements': 'trees',
  'k-way-merge': 'trees',
  'data-structure-design': 'advanced',
  'union-find': 'trees',
  'topological-sort': 'trees',
  'shortest-path': 'trees',
  'knapsack-dp': 'dp',
  'string-dp': 'dp',
  'grid-dp': 'dp',
  'segment-tree': 'advanced',
  'cyclic-sort': 'searching',
  'island-matrix-traversal': 'trees',
  'palindromic-subsequence-dp': 'dp',
  'fibonacci-dp': 'dp',
  'ordered-set': 'advanced',
  'multi-threaded-coding': 'advanced',
  'custom-data-structures': 'advanced',
  'knowing-what-to-track': 'arrays',
  'matrix-graphs': 'trees',
  'shortest-path-algorithms': 'trees',
  'minimum-spanning-tree': 'trees',
};

export const extraCodingTopics = [
  // ─── 1. Prefix Sum ───────────────────────────────────────────────
  {
    id: 'prefix-sum',
    title: 'Prefix Sum',
    icon: 'hash',
    color: '#f59e0b',
    questions: 5,
    description: 'Precompute cumulative sums for O(1) range queries and subarray sum problems.',

    visualizations: [
      {
        title: 'Prefix Sum Array & Range Query',
        description: 'Shows how cumulative sums enable O(1) range sum queries via subtraction',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="ps-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Prefix Sum: O(1) Range Query</text><text x="20" y="55" font-family="sans-serif" font-size="11" fill="#64748b">Original Array:</text><g transform="translate(20,62)"><rect x="0" y="0" width="50" height="32" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1e293b">2</text><rect x="55" y="0" width="50" height="32" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="80" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1e293b">4</text><rect x="110" y="0" width="50" height="32" rx="4" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="1.5"/><text x="135" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#10b981">1</text><rect x="165" y="0" width="50" height="32" rx="4" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="1.5"/><text x="190" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#10b981">5</text><rect x="220" y="0" width="50" height="32" rx="4" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="1.5"/><text x="245" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#10b981">3</text><rect x="275" y="0" width="50" height="32" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="300" y="21" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1e293b">7</text><text x="25" y="46" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">i=0</text><text x="80" y="46" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">i=1</text><text x="135" y="46" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">i=2</text><text x="190" y="46" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">i=3</text><text x="245" y="46" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">i=4</text><text x="300" y="46" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">i=5</text></g><text x="20" y="135" font-family="sans-serif" font-size="11" fill="#64748b">Prefix Sum:</text><g transform="translate(20,142)"><rect x="0" y="0" width="42" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="21" y="19" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">0</text><rect x="47" y="0" width="42" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="68" y="19" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><rect x="94" y="0" width="42" height="28" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><text x="115" y="19" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#b45309">6</text><rect x="141" y="0" width="42" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="162" y="19" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">7</text><rect x="188" y="0" width="42" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="209" y="19" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">12</text><rect x="235" y="0" width="42" height="28" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="256" y="19" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">15</text><rect x="282" y="0" width="42" height="28" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="303" y="19" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">22</text></g><g transform="translate(20,185)"><text x="0" y="14" font-family="sans-serif" font-size="12" fill="#1e293b">sum(2..4) = prefix[5] - prefix[2] = </text><text x="240" y="14" font-family="monospace" font-size="13" font-weight="bold" fill="#10b981">15</text><text x="256" y="14" font-family="sans-serif" font-size="12" fill="#1e293b"> - </text><text x="268" y="14" font-family="monospace" font-size="13" font-weight="bold" fill="#b45309">6</text><text x="280" y="14" font-family="sans-serif" font-size="12" fill="#1e293b"> = </text><text x="296" y="14" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">9</text><rect x="340" y="0" width="90" height="22" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="1"/><text x="385" y="15" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#10b981">O(1) query!</text></g><line x1="135" y1="108" x2="135" y2="140" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#ps-arrow)"/><line x1="245" y1="108" x2="256" y2="140" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#ps-arrow)"/></svg>'
      }
    ],

    introduction: `Prefix Sum is a preprocessing technique that transforms an array into a cumulative sum array, enabling any range sum query to be answered in constant time. The core idea is simple: if you know the sum from index 0 to j and from 0 to i-1, then the sum from i to j is just prefix[j+1] - prefix[i].

**Why This Matters:**
This pattern appears in a surprising number of interview problems disguised as subarray sum questions. Problems involving "subarray sum equals K," divisibility conditions on subarrays, or counting subarrays with certain properties almost always benefit from prefix sums combined with hash maps.

**Key Insight:** When you pair prefix sums with a hash map that counts how many times each prefix sum value has occurred, you can solve subarray sum problems in O(n) that would otherwise require O(n^2) brute force enumeration of all subarrays.`,

    whenToUse: [
      'Need to answer multiple range sum queries on a static array',
      'Finding subarrays whose sum equals a target value',
      'Checking divisibility conditions on contiguous subarray sums',
      'Counting subarrays that satisfy a cumulative property',
      'Balancing problems where you track running differences (e.g., equal count of 0s and 1s)',
      'Any problem where brute-force requires summing all O(n^2) subarrays'
    ],

    keyPatterns: [
      'Basic prefix array: prefix[i] = prefix[i-1] + nums[i-1]',
      'Range sum via difference: sum(i,j) = prefix[j+1] - prefix[i]',
      'Hash map + prefix sum for subarray sum equals K',
      'Modular prefix sums for divisibility-based subarray queries',
      'Running difference arrays to reduce binary problems to sum problems'
    ],

    timeComplexity: 'O(n) build, O(1) per query',
    spaceComplexity: 'O(n) for prefix array',

    approach: [
      'Build the prefix sum array: prefix[0] = 0, prefix[i] = prefix[i-1] + nums[i-1]',
      'For range sum queries, return prefix[right+1] - prefix[left]',
      'For "subarray sum equals K," iterate while maintaining a hash map of prefix sums seen so far; at each index check if (currentPrefix - K) exists in the map',
      'For divisibility problems, store prefix sums modulo the divisor and count matching remainders',
      'Handle edge cases: empty array, single element, prefix sum overflow with large values'
    ],

    commonProblems: [
      { name: 'Range Sum Query - Immutable', difficulty: 'Easy' },
      { name: 'Subarray Sum Equals K', difficulty: 'Medium' },
      { name: 'Subarray Sums Divisible by K', difficulty: 'Medium' },
      { name: 'Continuous Subarray Sum', difficulty: 'Medium' },
      { name: 'Contiguous Array', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Off-by-one errors when building the prefix array (forgetting prefix[0] = 0)',
      'Not initializing the hash map with {0: 1} for subarray sum equals K problems',
      'Handling negative prefix sums incorrectly when using modular arithmetic',
      'Confusing the prefix array index with the original array index',
      'Forgetting that Python modulo handles negatives differently than C++/Java'
    ],

    tips: [
      'Always start your prefix array with 0 at index 0 so range queries work cleanly',
      'For subarray sum = K, the hash map stores prefix_sum -> count, initialized with {0: 1}',
      'Modular prefix sums let you find subarrays divisible by K in O(n)',
      'For 2D prefix sums, use inclusion-exclusion: sum = P[r2][c2] - P[r1-1][c2] - P[r2][c1-1] + P[r1-1][c1-1]',
      'When values can be negative, prefix sums are non-monotonic so binary search does not apply'
    ],

    interviewTips: [
      'When you see "subarray sum," immediately think prefix sums + hash map',
      'Explain why prefix sums reduce range queries from O(n) to O(1) per query',
      'Clarify whether the array is static (prefix sum) or mutable (need segment tree or BIT)',
      'For divisibility problems, walk through the modular arithmetic step by step',
      'Mention that prefix sums generalize to 2D for matrix range queries'
    ],
  },

  // ─── 2. Kadane's Algorithm ───────────────────────────────────────
  {
    id: 'kadanes-algorithm',
    title: "Kadane's Algorithm",
    icon: 'trendingUp',
    color: '#f59e0b',
    questions: 4,
    description: 'Find maximum subarray sums in linear time using a greedy running-sum technique.',

    visualizations: [
      {
        title: "Kadane's Algorithm Walkthrough",
        description: 'Tracking current sum vs max sum across positive (green) and negative (red) values',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Kadane\'s Algorithm: Maximum Subarray</text><g transform="translate(30,40)"><text x="0" y="12" font-family="sans-serif" font-size="11" fill="#64748b">Array values:</text><rect x="0" y="18" width="52" height="30" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="26" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">2</text><rect x="58" y="18" width="52" height="30" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="84" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#ef4444" font-weight="bold">-3</text><rect x="116" y="18" width="52" height="30" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="142" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">4</text><rect x="174" y="18" width="52" height="30" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="200" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#ef4444" font-weight="bold">-1</text><rect x="232" y="18" width="52" height="30" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="258" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">2</text><rect x="290" y="18" width="52" height="30" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="316" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">1</text><rect x="348" y="18" width="52" height="30" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="374" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#ef4444" font-weight="bold">-5</text><rect x="406" y="18" width="52" height="30" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="432" y="38" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">3</text></g><g transform="translate(30,100)"><text x="0" y="0" font-family="sans-serif" font-size="11" fill="#64748b">Current Sum (bar chart):</text><rect x="0" y="8" width="440" height="1" fill="#e2e8f0"/><rect x="10" y="-12" width="36" height="20" rx="3" fill="#10b981" fill-opacity="0.3"/><text x="28" y="3" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">2</text><rect x="68" y="8" width="36" height="8" rx="3" fill="#ef4444" fill-opacity="0.3"/><text x="86" y="22" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">-1</text><rect x="126" y="-22" width="36" height="30" rx="3" fill="#10b981" fill-opacity="0.5"/><text x="144" y="-7" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">4</text><rect x="184" y="-14" width="36" height="22" rx="3" fill="#10b981" fill-opacity="0.3"/><text x="202" y="3" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">3</text><rect x="242" y="-26" width="36" height="34" rx="3" fill="#10b981" fill-opacity="0.5"/><text x="260" y="-11" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">5</text><rect x="300" y="-36" width="36" height="44" rx="3" fill="#10b981" fill-opacity="0.7"/><text x="318" y="-21" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981">6</text><rect x="358" y="-2" width="36" height="10" rx="3" fill="#10b981" fill-opacity="0.2"/><text x="376" y="3" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">1</text><rect x="416" y="-14" width="36" height="22" rx="3" fill="#10b981" fill-opacity="0.3"/><text x="434" y="3" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">3</text></g><g transform="translate(30,145)"><line x1="116" y1="0" x2="352" y2="0" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/><text x="234" y="16" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#10b981">Max Subarray: [4, -1, 2, 1] = 6</text></g><g transform="translate(30,175)"><rect x="0" y="0" width="440" height="50" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="20" y="20" font-family="sans-serif" font-size="11" fill="#1e293b" font-weight="bold">Decision at each step:</text><text x="20" y="38" font-family="monospace" font-size="11" fill="#64748b">current_sum = max(nums[i], current_sum + nums[i])</text><text x="350" y="38" font-family="monospace" font-size="11" fill="#10b981" font-weight="bold">max = 6</text></g></svg>'
      }
    ],

    introduction: `Kadane's Algorithm is an elegant O(n) approach to the Maximum Subarray problem. The idea is to maintain a running sum as you scan left to right: at each position, you decide whether to extend the current subarray or start fresh from the current element. The answer is the largest running sum encountered during the scan.

**Why This Matters:**
The Maximum Subarray problem is one of the most frequently asked interview questions and forms the basis for a family of problems involving contiguous subarray optimization. Variants include circular arrays, maximum product subarrays, and best sightseeing pairs.

**Key Insight:** The decision at each index is local: if the running sum so far is negative, it can only hurt any future subarray, so you discard it and start over. This greedy choice leads to a globally optimal answer, which is provable via dynamic programming: dp[i] = max(nums[i], dp[i-1] + nums[i]).`,

    whenToUse: [
      'Finding the maximum (or minimum) sum contiguous subarray',
      'Problems involving maximum product of a contiguous subarray',
      'Circular array variants where the subarray can wrap around',
      'Optimizing a metric over all contiguous subarrays in linear time',
      'Problems that reduce to "best subarray ending at each index"',
      'Any scenario where you need to decide between extending or restarting a running computation'
    ],

    keyPatterns: [
      'Standard Kadane: currentMax = max(nums[i], currentMax + nums[i])',
      'Circular variant: max(standardKadane, totalSum - minSubarraySum)',
      'Maximum product: track both maxProduct and minProduct at each step',
      'Minimum subarray variant: flip the comparison to find the minimum sum subarray'
    ],

    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',

    approach: [
      'Initialize currentMax and globalMax to the first element of the array',
      'Iterate from the second element: set currentMax = max(nums[i], currentMax + nums[i])',
      'Update globalMax = max(globalMax, currentMax) at each step',
      'For circular arrays, also compute the minimum subarray sum and use totalSum - minSum as a candidate answer',
      'For product variants, track both the running max and running min because a negative times a negative can become the new maximum'
    ],

    commonProblems: [
      { name: 'Maximum Subarray', difficulty: 'Medium' },
      { name: 'Maximum Sum Circular Subarray', difficulty: 'Medium' },
      { name: 'Maximum Product Subarray', difficulty: 'Medium' },
      { name: 'Best Sightseeing Pair', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Initializing currentMax to 0 instead of nums[0], which fails for all-negative arrays',
      'Forgetting the edge case in circular variant where all elements are negative (minSubarray = totalSum)',
      'In maximum product, not tracking the minimum product which can flip to maximum after multiplying by a negative',
      'Assuming Kadane works on non-contiguous subsequences (it only works for contiguous subarrays)',
      'Not handling arrays of length 1 correctly'
    ],

    tips: [
      'Kadane is essentially DP with O(1) space: dp[i] = max(nums[i], dp[i-1] + nums[i])',
      'For the circular variant, the answer is max(standardKadane, totalSum - minKadane), unless all elements are negative',
      'Maximum product requires tracking both max and min at each step due to sign flips',
      'To recover the actual subarray (not just the sum), track start and end indices during the scan',
      'Kadane can be adapted for 2D maximum sum rectangle using column compression'
    ],

    interviewTips: [
      'Start by stating the brute force O(n^2) approach, then show how Kadane optimizes to O(n)',
      'Explain the intuition: "A negative running sum can only hurt future subarrays, so we reset"',
      'For the circular variant, explain why totalSum - minSubarray gives the max wrapping subarray',
      'If asked for the subarray itself, mention you can track indices with two extra variables',
      'Connect Kadane to dynamic programming: it is a space-optimized 1D DP'
    ],
  },

  // ─── 3. Monotonic Stack ─────────────────────────────────────────
  {
    id: 'monotonic-stack',
    title: 'Monotonic Stack',
    icon: 'layers',
    color: '#22c55e',
    questions: 6,
    description: 'Use a stack that maintains sorted order to efficiently find next greater/smaller elements.',

    visualizations: [
      {
        title: 'Monotonic Stack: Next Greater Element',
        description: 'Stack maintains decreasing order; elements pop when a greater value arrives',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="ms-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Monotonic Decreasing Stack</text><text x="30" y="50" font-family="sans-serif" font-size="11" fill="#64748b">Array: [4, 2, 7, 5, 3, 6]</text><text x="30" y="70" font-family="sans-serif" font-size="11" fill="#64748b">Processing element 7 (index 2):</text><g transform="translate(30,82)"><text x="70" y="0" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">Stack (top right)</text><rect x="0" y="6" width="44" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="22" y="28" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">4</text><rect x="50" y="6" width="44" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="72" y="28" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">2</text><text x="110" y="28" font-family="sans-serif" font-size="18" fill="#ef4444">&larr;</text><text x="130" y="28" font-family="sans-serif" font-size="11" fill="#ef4444" font-weight="bold">pop 2 (2 &lt; 7)</text><line x1="0" y1="44" x2="94" y2="44" stroke="#e2e8f0" stroke-width="2"/></g><g transform="translate(30,132)"><text x="70" y="0" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">After popping:</text><rect x="0" y="6" width="44" height="34" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="22" y="28" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">4</text><text x="60" y="28" font-family="sans-serif" font-size="18" fill="#ef4444">&larr;</text><text x="80" y="28" font-family="sans-serif" font-size="11" fill="#ef4444" font-weight="bold">pop 4 (4 &lt; 7)</text><line x1="0" y1="44" x2="44" y2="44" stroke="#e2e8f0" stroke-width="2"/></g><g transform="translate(30,182)"><text x="70" y="0" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">Push 7:</text><rect x="0" y="6" width="44" height="34" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="22" y="28" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">7</text><line x1="0" y1="44" x2="44" y2="44" stroke="#10b981" stroke-width="2"/></g><g transform="translate(260,75)"><rect x="0" y="0" width="210" height="155" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="105" y="20" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">Results So Far</text><text x="15" y="42" font-family="monospace" font-size="11" fill="#1e293b">idx 0 (val 4): NGE =</text><text x="175" y="42" font-family="monospace" font-size="11" font-weight="bold" fill="#10b981">7</text><text x="15" y="60" font-family="monospace" font-size="11" fill="#1e293b">idx 1 (val 2): NGE =</text><text x="175" y="60" font-family="monospace" font-size="11" font-weight="bold" fill="#10b981">7</text><text x="15" y="78" font-family="monospace" font-size="11" fill="#94a3b8">idx 2 (val 7): TBD</text><text x="15" y="105" font-family="sans-serif" font-size="10" fill="#64748b">Key insight: when we pop,</text><text x="15" y="120" font-family="sans-serif" font-size="10" fill="#64748b">the current element IS the</text><text x="15" y="135" font-family="sans-serif" font-size="10" fill="#64748b">next greater for popped items.</text></g></svg>'
      }
    ],

    introduction: `A Monotonic Stack is a stack where elements are maintained in either strictly increasing or strictly decreasing order. When a new element violates the ordering, elements are popped until the invariant is restored. This technique is the go-to approach for "next greater element" and "next smaller element" problems.

**Why This Matters:**
Without a monotonic stack, finding the next greater element for every position requires O(n^2) brute force. The monotonic stack solves this in a single O(n) pass because each element is pushed and popped at most once. This pattern appears frequently in problems involving temperature spans, stock prices, histogram areas, and visibility.

**Key Insight:** The stack at any point contains elements that are "waiting" for their answer. When a new element arrives that is greater (or smaller) than the stack's top, we have found the answer for that waiting element, so we pop it and record the result.`,

    whenToUse: [
      'Finding the next greater or next smaller element for each position in an array',
      'Computing spans (how many consecutive days stock price was lower, etc.)',
      'Histogram problems like largest rectangle in histogram',
      'Pattern matching problems like 132 Pattern',
      'Visibility problems where you need to determine what elements can "see" each other',
      'Any problem that asks "for each element, find the nearest element satisfying a comparison"'
    ],

    keyPatterns: [
      'Decreasing monotonic stack for next greater element',
      'Increasing monotonic stack for next smaller element',
      'Stack stores indices (not values) to compute distances and widths',
      'Process from right to left for "previous greater" variants',
      'Two-pass or circular processing for wrap-around problems',
      'Combine with width calculation for area-based problems (histogram)'
    ],

    timeComplexity: 'O(n) amortized - each element pushed and popped at most once',
    spaceComplexity: 'O(n) for the stack',

    approach: [
      'Decide whether you need an increasing or decreasing stack based on whether you seek the next greater or next smaller element',
      'Iterate through the array; for each element, pop from the stack while the current element violates the monotonic property',
      'For each popped element, the current element is its answer (next greater/smaller)',
      'Push the current element (or its index) onto the stack',
      'After processing all elements, anything remaining on the stack has no answer (use -1 or default)'
    ],

    commonProblems: [
      { name: 'Next Greater Element I', difficulty: 'Easy' },
      { name: 'Daily Temperatures', difficulty: 'Medium' },
      { name: 'Online Stock Span', difficulty: 'Medium' },
      { name: '132 Pattern', difficulty: 'Medium' },
      { name: 'Number of Visible People in a Queue', difficulty: 'Hard' },
      { name: 'Largest Rectangle in Histogram', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Confusing when to use increasing vs decreasing stack (increasing finds next smaller, decreasing finds next greater)',
      'Storing values instead of indices when you need to compute distances or widths',
      'Forgetting to handle elements remaining on the stack after the loop (they have no next greater/smaller)',
      'Off-by-one errors when computing widths in histogram-style problems',
      'Not considering that the stack comparison should be strict (< vs <=) depending on duplicate handling'
    ],

    tips: [
      'Always store indices on the stack, not values - you can always look up values from indices',
      'For "next greater," use a decreasing stack; for "next smaller," use an increasing stack',
      'The largest rectangle in histogram is the classic monotonic stack problem - master it thoroughly',
      'For circular arrays, iterate through the array twice (2n iterations) to handle wrap-around',
      'Monotonic stacks can be combined with other techniques like prefix sums for advanced problems'
    ],

    interviewTips: [
      'Explain the invariant: "The stack always maintains decreasing order, so the first element we encounter that is larger becomes the next greater element for everything it pops"',
      'Walk through a small example to build intuition before coding',
      'Mention the amortized O(n) analysis: each element enters and leaves the stack at most once',
      'For histogram problems, explain how width is calculated using the index difference',
      'If stuck, start with the brute force O(n^2) solution, then observe that the stack eliminates redundant comparisons'
    ],
  },

  // ─── 4. Monotonic Queue ─────────────────────────────────────────
  {
    id: 'monotonic-queue',
    title: 'Monotonic Queue',
    icon: 'layers',
    color: '#22c55e',
    questions: 4,
    description: 'Maintain a deque with monotonic ordering to answer sliding window min/max queries in O(1).',

    visualizations: [
      {
        title: 'Monotonic Deque: Sliding Window Maximum',
        description: 'Deque stores indices of potential maximums; front is always the window max',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Sliding Window Maximum (k=3)</text><text x="30" y="48" font-family="sans-serif" font-size="11" fill="#64748b">Array:</text><g transform="translate(30,55)"><rect x="0" y="0" width="42" height="30" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="21" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#94a3b8">1</text><rect x="48" y="0" width="42" height="30" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="69" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#94a3b8">3</text><rect x="96" y="0" width="42" height="30" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="117" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">5</text><rect x="144" y="0" width="42" height="30" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="165" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">2</text><rect x="192" y="0" width="42" height="30" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="213" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold">8</text><rect x="240" y="0" width="42" height="30" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="261" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#94a3b8">1</text><rect x="288" y="0" width="42" height="30" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="309" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#94a3b8">4</text><rect x="96" y="-14" width="138" height="2" rx="1" fill="#10b981"/><text x="165" y="-18" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981" font-weight="bold">window (k=3)</text></g><g transform="translate(30,110)"><text x="0" y="12" font-family="sans-serif" font-size="11" fill="#64748b">Deque (front=left, stores indices):</text><rect x="0" y="20" width="180" height="40" rx="6" fill="#f0f9ff" stroke="#3b82f6" stroke-width="1.5"/><text x="8" y="36" font-family="sans-serif" font-size="9" fill="#3b82f6">front</text><text x="162" y="36" font-family="sans-serif" font-size="9" fill="#3b82f6">back</text><rect x="10" y="38" width="40" height="18" rx="3" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/><text x="30" y="52" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">i=4</text><rect x="55" y="38" width="40" height="18" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="75" y="52" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">...</text><text x="200" y="45" font-family="sans-serif" font-size="10" fill="#3b82f6">deque[0] = index of max</text><text x="200" y="57" font-family="sans-serif" font-size="10" fill="#3b82f6">arr[4] = 8 = window max</text></g><g transform="translate(30,180)"><rect x="0" y="0" width="440" height="55" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="15" y="18" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">Rules:</text><text x="15" y="34" font-family="sans-serif" font-size="10" fill="#64748b">1. Remove front if outside window (index &lt; i - k + 1)</text><text x="15" y="48" font-family="sans-serif" font-size="10" fill="#64748b">2. Remove back while arr[back] &le; new element (maintain decreasing order)</text><text x="310" y="34" font-family="monospace" font-size="10" fill="#10b981" font-weight="bold">Output: [5, 5, 8, 8, 8]</text></g></svg>'
      }
    ],

    introduction: `A Monotonic Queue (typically implemented as a deque) maintains elements in sorted order and supports efficient insertion and deletion from both ends. It is the definitive technique for sliding window maximum and minimum problems, reducing what would be an O(n*k) brute force to O(n).

**Why This Matters:**
Sliding Window Maximum is a classic hard problem that tests whether you understand how to maintain auxiliary data structures alongside a sliding window. The monotonic deque ensures that the front always holds the current window's maximum (or minimum), and stale elements are removed from the front when they leave the window.

**Key Insight:** When a new element enters the window that is larger than elements at the back of the deque, those back elements can never be the maximum for any future window position, so they are discarded. This pruning keeps the deque sorted and ensures amortized O(1) per operation.`,

    whenToUse: [
      'Finding the maximum or minimum in every sliding window of size k',
      'Dynamic programming optimizations where transitions depend on a sliding range of previous states',
      'Jump game variants where you pick the best value within a reachable range',
      'Problems requiring the best value within a sliding range combined with other constraints',
      'Any scenario where a naive approach computes max/min over overlapping windows repeatedly'
    ],

    keyPatterns: [
      'Decreasing deque for sliding window maximum (front = current max)',
      'Increasing deque for sliding window minimum (front = current min)',
      'Store indices in the deque for easy window boundary checks',
      'Pop from back when new element violates monotonic order; pop from front when element exits window',
      'DP optimization: dp[i] = max/min(dp[j] for j in [i-k, i-1]) + cost[i]'
    ],

    timeComplexity: 'O(n) amortized',
    spaceComplexity: 'O(k) where k is the window size',

    approach: [
      'Use a deque that stores indices of elements in decreasing (for max) or increasing (for min) order of their values',
      'For each new element: remove indices from the back of the deque while the new element is better (larger for max, smaller for min)',
      'Add the new index to the back of the deque',
      'Remove indices from the front that are outside the current window boundary',
      'The front of the deque always holds the index of the optimal element for the current window'
    ],

    commonProblems: [
      { name: 'Jump Game VI', difficulty: 'Medium' },
      { name: 'Longest Continuous Subarray With Absolute Diff', difficulty: 'Medium' },
      { name: 'Sliding Window Maximum', difficulty: 'Hard' },
      { name: 'Max Value of Equation', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Forgetting to remove elements from the front of the deque when they fall outside the window',
      'Using a regular queue instead of a deque, which prevents efficient back-removal',
      'Storing values instead of indices, making it impossible to check window boundaries',
      'Confusing increasing vs decreasing deque for max vs min queries',
      'Not recognizing when a DP recurrence can be optimized with a monotonic queue'
    ],

    tips: [
      'Always store indices in the deque, not values, so you can check if an element is still within the window',
      'For sliding window max, maintain a decreasing deque; for min, maintain an increasing deque',
      'The deque size never exceeds the window size k, giving O(k) space',
      'This technique is a powerful DP optimization: any recurrence of the form dp[i] = min/max(dp[j]) + f(i) over a range of j values',
      'Practice Sliding Window Maximum first - it is the foundational problem for this pattern'
    ],

    interviewTips: [
      'Start by explaining the brute force O(nk) approach, then introduce the deque optimization',
      'Clearly describe the two removal conditions: back (monotonic violation) and front (window expiry)',
      'Trace through a small example showing how the deque evolves with each step',
      'Mention that this is sometimes called a "sliding window deque" or "monotonic deque"',
      'For DP optimization problems, first write the naive DP, then show how the monotonic queue speeds it up'
    ],
  },

  // ─── 5. LinkedList In-place Reversal ────────────────────────────
  {
    id: 'linked-list-reversal',
    title: 'LinkedList In-place Reversal',
    icon: 'link',
    color: '#14b8a6',
    questions: 4,
    description: 'Reverse linked lists or sublists in-place by manipulating node pointers without extra space.',

    visualizations: [
      {
        title: 'Linked List Reversal: Before & After',
        description: 'Three-pointer technique reverses next pointers in-place',
        svg: '<svg viewBox="0 0 500 220" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="lr-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b"/></marker><marker id="lr-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#10b981"/></marker><marker id="lr-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#ef4444"/></marker></defs><rect width="500" height="220" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">In-Place Linked List Reversal</text><text x="30" y="48" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">Before:</text><g transform="translate(30,55)"><rect x="0" y="0" width="50" height="30" rx="6" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/><text x="25" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><line x1="50" y1="15" x2="70" y2="15" stroke="#64748b" stroke-width="1.5" marker-end="url(#lr-arrow)"/><rect x="75" y="0" width="50" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="100" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">2</text><line x1="125" y1="15" x2="145" y2="15" stroke="#64748b" stroke-width="1.5" marker-end="url(#lr-arrow)"/><rect x="150" y="0" width="50" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="175" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">3</text><line x1="200" y1="15" x2="220" y2="15" stroke="#64748b" stroke-width="1.5" marker-end="url(#lr-arrow)"/><rect x="225" y="0" width="50" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="250" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">4</text><line x1="275" y1="15" x2="295" y2="15" stroke="#64748b" stroke-width="1.5" marker-end="url(#lr-arrow)"/><text x="305" y="20" font-family="sans-serif" font-size="12" fill="#94a3b8">null</text><text x="15" y="-6" font-family="sans-serif" font-size="9" fill="#3b82f6" font-weight="bold">head</text></g><text x="30" y="118" font-family="sans-serif" font-size="11" font-weight="bold" fill="#10b981">After:</text><g transform="translate(30,125)"><rect x="0" y="0" width="50" height="30" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="25" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">4</text><line x1="50" y1="15" x2="70" y2="15" stroke="#10b981" stroke-width="1.5" marker-end="url(#lr-green)"/><rect x="75" y="0" width="50" height="30" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="100" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">3</text><line x1="125" y1="15" x2="145" y2="15" stroke="#10b981" stroke-width="1.5" marker-end="url(#lr-green)"/><rect x="150" y="0" width="50" height="30" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="175" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">2</text><line x1="200" y1="15" x2="220" y2="15" stroke="#10b981" stroke-width="1.5" marker-end="url(#lr-green)"/><rect x="225" y="0" width="50" height="30" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="250" y="20" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><line x1="275" y1="15" x2="295" y2="15" stroke="#10b981" stroke-width="1.5" marker-end="url(#lr-green)"/><text x="305" y="20" font-family="sans-serif" font-size="12" fill="#94a3b8">null</text><text x="15" y="-6" font-family="sans-serif" font-size="9" fill="#10b981" font-weight="bold">new head</text></g><g transform="translate(30,178)"><rect x="0" y="0" width="440" height="32" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="14" font-family="sans-serif" font-size="10" fill="#1e293b" font-weight="bold">Three pointers:</text><text x="120" y="14" font-family="monospace" font-size="10" fill="#64748b">prev = null</text><text x="220" y="14" font-family="monospace" font-size="10" fill="#3b82f6">curr = head</text><text x="330" y="14" font-family="monospace" font-size="10" fill="#f59e0b">next = curr.next</text><text x="15" y="27" font-family="monospace" font-size="10" fill="#10b981">curr.next = prev; prev = curr; curr = next;</text></g></svg>'
      }
    ],

    introduction: `In-place linked list reversal is one of the most fundamental pointer manipulation techniques. The core operation involves iterating through nodes and reversing the direction of each "next" pointer so that the list (or a portion of it) runs in the opposite direction. This is done using three pointers: previous, current, and next.

**Why This Matters:**
Linked list reversal appears directly in interviews and also serves as a building block for more advanced problems like reversing nodes in k-groups, checking palindromes, and reordering lists. Mastering this pattern demonstrates fluency with pointer manipulation and in-place algorithms.

**Key Insight:** The reversal works by visiting each node exactly once and flipping its next pointer to point backward. You need three pointers to avoid losing the reference to the rest of the list: prev (already reversed), curr (being processed), and next_node (saved before flipping).`,

    whenToUse: [
      'Reversing an entire linked list',
      'Reversing a sublist between positions m and n',
      'Checking if a linked list is a palindrome (reverse second half, then compare)',
      'Reversing nodes in groups of k',
      'Interleaving or reordering list nodes (often requires partial reversal)',
      'Any linked list problem that requires O(1) extra space transformation'
    ],

    keyPatterns: [
      'Three-pointer iterative reversal: prev, curr, next_node',
      'Recursive reversal: reverse rest, then fix pointers',
      'Sublist reversal: save nodes before and after the reversed segment for reconnection',
      'Reverse in k-groups: combine reversal with counting and group boundary management',
      'Palindrome check: find middle with slow/fast, reverse second half, compare'
    ],

    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1) iterative, O(n) recursive due to call stack',

    approach: [
      'For full reversal: initialize prev = null, curr = head; iterate: save next_node = curr.next, set curr.next = prev, advance prev = curr, curr = next_node; return prev as new head',
      'For sublist reversal (positions m to n): traverse to node m-1 (the node before the reversal starts), save it as the connection point, reverse from m to n, then reconnect',
      'For k-group reversal: count k nodes, reverse that group, recursively or iteratively handle the next group, reconnect groups',
      'Use a dummy/sentinel node before head to simplify edge cases where the head itself is part of the reversal',
      'Always draw the pointer changes on paper before coding to avoid losing references'
    ],

    commonProblems: [
      { name: 'Palindrome Linked List', difficulty: 'Easy' },
      { name: 'Reverse Linked List', difficulty: 'Easy' },
      { name: 'Reverse Linked List II', difficulty: 'Medium' },
      { name: 'Reverse Nodes in k-Group', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Losing the reference to the rest of the list by not saving curr.next before flipping the pointer',
      'Forgetting to reconnect the reversed segment to the nodes before and after it in sublist reversal',
      'Off-by-one errors when counting positions for sublist reversal (1-indexed vs 0-indexed)',
      'Not using a dummy node, leading to special-case handling when the head is part of the reversal',
      'Returning the wrong node as the new head after reversal'
    ],

    tips: [
      'Always use a dummy/sentinel node to avoid special-casing head modifications',
      'Draw the linked list and trace pointer changes for at least one example before coding',
      'For palindrome checks, reverse only the second half and restore it afterward if required',
      'The iterative approach is preferred in interviews because it uses O(1) space',
      'Practice the three-pointer pattern until it becomes second nature: save next, flip pointer, advance'
    ],

    interviewTips: [
      'State clearly: "I will use three pointers: prev, curr, and next_node to reverse in-place"',
      'For sublist reversal, explain the reconnection step carefully - this is where most bugs occur',
      'Mention the dummy node technique proactively to show you handle edge cases',
      'If asked for recursive reversal, explain the call stack space cost O(n) vs iterative O(1)',
      'Walk through a 3-4 node example step by step to demonstrate correctness'
    ],
  },

  // ─── 6. Fast & Slow Pointers ────────────────────────────────────
  {
    id: 'fast-slow-pointers',
    title: 'Fast & Slow Pointers',
    icon: 'zap',
    color: '#14b8a6',
    questions: 3,
    description: 'Detect cycles, find midpoints, and solve linked list problems using two pointers moving at different speeds.',

    visualizations: [
      {
        title: 'Fast & Slow Pointers: Cycle Detection',
        description: 'Slow moves 1 step, fast moves 2 steps; they meet inside the cycle',
        svg: '<svg viewBox="0 0 500 230" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="fs-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b"/></marker></defs><rect width="500" height="230" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Floyd\'s Cycle Detection (Tortoise &amp; Hare)</text><g transform="translate(20,45)"><rect x="0" y="10" width="44" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="22" y="30" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><line x1="44" y1="25" x2="62" y2="25" stroke="#64748b" stroke-width="1.5" marker-end="url(#fs-arrow)"/><rect x="66" y="10" width="44" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="88" y="30" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><line x1="110" y1="25" x2="128" y2="25" stroke="#64748b" stroke-width="1.5" marker-end="url(#fs-arrow)"/><rect x="132" y="10" width="44" height="30" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="154" y="30" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">3</text><text x="154" y="6" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981" font-weight="bold">cycle start</text><line x1="176" y1="25" x2="194" y2="25" stroke="#64748b" stroke-width="1.5" marker-end="url(#fs-arrow)"/><rect x="198" y="10" width="44" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="220" y="30" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">4</text><line x1="242" y1="30" x2="260" y2="50" stroke="#64748b" stroke-width="1.5" marker-end="url(#fs-arrow)"/><rect x="260" y="50" width="44" height="30" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/><text x="282" y="70" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">5</text><text x="282" y="90" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#ef4444" font-weight="bold">meet here!</text><line x1="260" y1="65" x2="242" y2="85" stroke="#64748b" stroke-width="1.5" marker-end="url(#fs-arrow)"/><rect x="198" y="85" width="44" height="30" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="220" y="105" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">6</text><path d="M198,100 Q160,110 154,42" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#fs-arrow)"/></g><g transform="translate(340,50)"><rect x="0" y="0" width="140" height="90" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="70" y="18" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">Pointer Speeds</text><circle cx="20" cy="38" r="8" fill="#3b82f6"/><text x="35" y="42" font-family="sans-serif" font-size="10" fill="#3b82f6" font-weight="bold">Slow: +1 step</text><circle cx="20" cy="62" r="8" fill="#ef4444"/><text x="35" y="66" font-family="sans-serif" font-size="10" fill="#ef4444" font-weight="bold">Fast: +2 steps</text><text x="10" y="82" font-family="sans-serif" font-size="9" fill="#64748b">They MUST meet if cycle exists</text></g><g transform="translate(20,170)"><rect x="0" y="0" width="460" height="48" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="17" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">To find cycle start:</text><text x="15" y="34" font-family="sans-serif" font-size="10" fill="#64748b">After meeting, reset one pointer to head. Move both at speed 1. They meet at cycle start.</text></g></svg>'
      }
    ],

    introduction: `The Fast & Slow Pointers technique (also called Floyd's Tortoise and Hare) uses two pointers that traverse a sequence at different speeds. The slow pointer moves one step at a time while the fast pointer moves two steps. This simple idea solves cycle detection, middle-finding, and several other structural problems elegantly.

**Why This Matters:**
Cycle detection in linked lists is a classic interview question, but the pattern extends beyond linked lists. It applies to any problem with a cyclic structure: detecting cycles in sequences (Happy Number), finding duplicate numbers, and identifying the start of a cycle. The O(1) space usage is what makes this technique special compared to hash set approaches.

**Key Insight:** If a cycle exists, the fast pointer will eventually "lap" the slow pointer and they will meet inside the cycle. To find where the cycle begins, reset one pointer to the start and move both at the same speed - they meet at the cycle entrance. This works because of a mathematical relationship between the distances traveled.`,

    whenToUse: [
      'Detecting if a linked list has a cycle',
      'Finding the node where a cycle begins in a linked list',
      'Finding the middle node of a linked list in one pass',
      'Detecting cycles in number sequences (e.g., Happy Number)',
      'Finding duplicate elements in arrays where values represent "next" pointers (Floyd\'s algorithm on arrays)'
    ],

    keyPatterns: [
      'Cycle detection: slow moves 1 step, fast moves 2 steps; they meet if cycle exists',
      'Cycle start: after meeting, reset one pointer to head, move both 1 step until they meet again',
      'Middle finding: when fast reaches end, slow is at the middle',
      'Palindrome preparation: use slow/fast to split the list at the midpoint'
    ],

    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',

    approach: [
      'Initialize slow = head, fast = head (or fast = head.next depending on the variant)',
      'Move slow one step and fast two steps in each iteration',
      'For cycle detection: if fast and slow meet, a cycle exists; if fast reaches null, no cycle',
      'For cycle start: after detection, reset slow to head, then move both one step at a time until they meet at the cycle entrance',
      'For middle finding: when fast reaches the end (fast == null or fast.next == null), slow is at the middle'
    ],

    commonProblems: [
      { name: 'Middle of the Linked List', difficulty: 'Easy' },
      { name: 'Happy Number', difficulty: 'Easy' },
      { name: 'Linked List Cycle II', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Using fast = head.next for cycle detection but forgetting this changes the meeting point math for cycle start',
      'Not checking fast != null AND fast.next != null before advancing fast two steps (causes null pointer exception)',
      'Confusing "detect cycle" with "find cycle start" - they require different follow-up steps',
      'Applying this pattern when a hash set would be simpler and equally efficient for the given constraints',
      'Forgetting that for middle finding, the definition of "middle" differs for even-length lists depending on initialization'
    ],

    tips: [
      'For cycle start detection, the math proof relies on: distance from head to cycle start equals distance from meeting point to cycle start (going around the cycle)',
      'To find the middle of a list, stop when fast == null (gives upper middle for even length) or fast.next == null',
      'This pattern uses O(1) space compared to O(n) for a hash set approach',
      'The Happy Number problem is a disguised cycle detection problem on a number sequence',
      'Practice both the "detect cycle" and "find cycle start" variants until you can code them from memory'
    ],

    interviewTips: [
      'Explain why two speeds guarantee a meeting inside the cycle (the gap closes by 1 each step)',
      'Be ready to prove the cycle start algorithm: explain the distance relationship mathematically or with a diagram',
      'Mention Floyd\'s Tortoise and Hare by name to show familiarity with the algorithm',
      'For middle finding, clarify which middle you return for even-length lists before coding',
      'If the interviewer asks about the hash set alternative, explain the space trade-off: O(n) vs O(1)'
    ],
  },

  // ─── 7. Divide and Conquer ──────────────────────────────────────
  {
    id: 'divide-and-conquer',
    title: 'Divide and Conquer',
    icon: 'scissors',
    color: '#eab308',
    questions: 3,
    description: 'Break problems into independent subproblems, solve recursively, and combine results.',

    introduction: `Divide and Conquer is a fundamental algorithmic paradigm that solves a problem by breaking it into smaller subproblems of the same type, solving each subproblem recursively, and then combining the results. Classic examples include merge sort, quicksort, and binary search, but the pattern extends to tree construction, geometric algorithms, and matrix multiplication.

**Why This Matters:**
Many efficient algorithms are based on divide and conquer. Understanding this paradigm helps you recognize when a problem has optimal substructure that allows recursive decomposition. Interview problems that involve building balanced structures (BSTs from sorted data), spatial decomposition (Quad Trees), or efficiently combining partial results often use this approach.

**Key Insight:** The efficiency gain comes from reducing work at each level. If you split a problem of size n into two subproblems of size n/2 and the combine step takes O(n), you get O(n log n) total work. The Master Theorem formalizes this: T(n) = aT(n/b) + O(n^d) determines the overall complexity based on a, b, and d.`,

    whenToUse: [
      'Problems that can be decomposed into independent subproblems of the same structure',
      'Building balanced trees or structures from sorted input',
      'Geometric decomposition (Quad Trees, k-d trees)',
      'When merging two sorted results is easier than solving the whole problem directly',
      'Problems where brute force is polynomial but divide and conquer yields a better recurrence',
      'Counting inversions, closest pair of points, and similar combinatorial problems'
    ],

    keyPatterns: [
      'Binary split: divide input in half, recurse on each half, combine',
      'Tree construction from sorted arrays/lists: root = mid, left subtree = left half, right subtree = right half',
      'Spatial decomposition: partition 2D space into quadrants recursively',
      'Merge-based counting: count cross-boundary contributions during the merge step'
    ],

    timeComplexity: 'Typically O(n log n) for balanced splits',
    spaceComplexity: 'O(log n) for recursion stack with balanced splits',

    approach: [
      'Identify the base case: what is the smallest subproblem you can solve directly?',
      'Define the divide step: how do you split the problem into smaller instances?',
      'Define the conquer step: recursively solve each subproblem',
      'Define the combine step: how do you merge subproblem solutions into the overall answer?',
      'Analyze the recurrence relation to determine the time complexity using the Master Theorem'
    ],

    commonProblems: [
      { name: 'Convert Sorted List to BST', difficulty: 'Medium' },
      { name: 'Construct Quad Tree', difficulty: 'Medium' },
      { name: 'Maximum Binary Tree', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Forgetting the base case, leading to infinite recursion',
      'Creating unbalanced splits that degrade to O(n^2) instead of O(n log n)',
      'Incorrectly combining results, especially when cross-boundary contributions matter',
      'Not recognizing overlapping subproblems, which means DP (memoization) would be more efficient than pure divide and conquer',
      'Stack overflow from deep recursion on large inputs - consider iterative conversion'
    ],

    tips: [
      'Always start by identifying the base case and the simplest version of the problem',
      'Balanced splits are crucial for O(n log n) performance - use the midpoint when possible',
      'For linked list problems, use slow/fast pointers to find the midpoint efficiently',
      'Draw the recursion tree to understand the work done at each level',
      'If subproblems overlap, switch to dynamic programming with memoization'
    ],

    interviewTips: [
      'Clearly articulate the three steps: divide, conquer, combine',
      'State the recurrence relation and use the Master Theorem to derive the time complexity',
      'For tree construction problems, explain why choosing the middle element ensures balance',
      'Mention that merge sort is the canonical divide and conquer algorithm',
      'Compare with dynamic programming when asked: D&C has independent subproblems, DP has overlapping ones'
    ],
  },

  // ─── 8. Merge Sort ──────────────────────────────────────────────
  {
    id: 'merge-sort',
    title: 'Merge Sort',
    icon: 'gitMerge',
    color: '#eab308',
    questions: 2,
    description: 'A stable O(n log n) divide-and-conquer sort that also powers inversion counting and linked list sorting.',

    introduction: `Merge Sort is a divide-and-conquer sorting algorithm that splits the array in half, recursively sorts each half, and merges the two sorted halves. It guarantees O(n log n) time in all cases (best, average, worst) and is stable, preserving the relative order of equal elements.

**Why This Matters:**
Beyond sorting, the merge step is a powerful technique for counting inversions, reverse pairs, and other cross-boundary relationships. Merge sort is also the preferred algorithm for sorting linked lists because it does not require random access. Interview problems often test your ability to adapt the merge step to count something while sorting.

**Key Insight:** During the merge step, when an element from the right half is placed before elements remaining in the left half, you can count how many elements in the left half are "greater" - this is the basis for inversion counting and reverse pairs. The merge step gives you a structured way to count cross-boundary relationships.`,

    whenToUse: [
      'Sorting when worst-case O(n log n) is required (quicksort degrades to O(n^2))',
      'Sorting linked lists (no random access needed, and can be done in O(1) extra space for lists)',
      'Counting inversions in an array',
      'Counting reverse pairs or other order-based relationships',
      'When stability is required (maintaining relative order of equal elements)',
      'External sorting of data that does not fit in memory'
    ],

    keyPatterns: [
      'Standard merge sort: split, recurse, merge two sorted halves',
      'Modified merge for counting: count cross-boundary pairs during the merge step',
      'Bottom-up merge sort: iterative version that avoids recursion overhead',
      'Linked list merge sort: use slow/fast to split, merge two sorted lists'
    ],

    timeComplexity: 'O(n log n) in all cases',
    spaceComplexity: 'O(n) for arrays, O(log n) for linked lists',

    approach: [
      'Base case: arrays of size 0 or 1 are already sorted',
      'Split the array at the midpoint into two halves',
      'Recursively sort the left half and right half',
      'Merge the two sorted halves using a two-pointer technique into a temporary array',
      'For counting variants, add the counting logic during the merge step before or during the standard merge'
    ],

    commonProblems: [
      { name: 'Sort List', difficulty: 'Medium' },
      { name: 'Reverse Pairs', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Forgetting to copy the remaining elements from the non-exhausted half during merge',
      'Off-by-one errors in the split indices (mid = left + (right - left) // 2)',
      'Creating new arrays at every recursive call instead of using a pre-allocated buffer',
      'In counting problems, modifying the count incorrectly because the two halves are being sorted simultaneously',
      'Not handling the linked list split correctly (must set the end of the first half to null)'
    ],

    tips: [
      'Pre-allocate a temporary array of size n to avoid repeated allocation during merges',
      'For linked list merge sort, find the middle with slow/fast pointers and set slow.next = null to split',
      'Reverse pairs requires a separate counting pass before the merge because the condition differs from the sort order',
      'Bottom-up merge sort avoids recursion and can be more cache-friendly',
      'Merge sort is the basis for external sort algorithms used in databases'
    ],

    interviewTips: [
      'State the time complexity guarantee: O(n log n) worst case, unlike quicksort',
      'Explain why merge sort is preferred for linked lists: no random access needed and O(1) extra space',
      'For inversion counting, clearly explain how the merge step reveals inversions',
      'Mention stability as an advantage over quicksort and heapsort',
      'If asked about space, note the O(n) auxiliary space for arrays is the main drawback'
    ],
  },

  // ─── 9. QuickSort / QuickSelect ─────────────────────────────────
  {
    id: 'quicksort-quickselect',
    title: 'QuickSort / QuickSelect',
    icon: 'zap',
    color: '#eab308',
    questions: 2,
    description: 'Partition-based algorithms for efficient sorting and O(n) average-case k-th element selection.',

    introduction: `QuickSort uses a pivot element to partition the array into elements less than and greater than the pivot, then recursively sorts each partition. QuickSelect adapts this idea to find the k-th smallest (or largest) element in O(n) average time by only recursing into the partition that contains the target index.

**Why This Matters:**
QuickSort is the most commonly used sorting algorithm in practice due to its excellent average-case performance and cache efficiency. QuickSelect is the optimal solution for "k-th largest element" problems, providing O(n) average time compared to O(n log n) for sorting or O(n log k) for a heap. Both algorithms test your understanding of partitioning, which is a versatile technique.

**Key Insight:** The partition operation is the workhorse. After one partition, the pivot is in its final sorted position. For QuickSelect, you only need to recurse into the partition containing index k, halving the problem size on average, which yields O(n) average time by the geometric series argument.`,

    whenToUse: [
      'General-purpose sorting when average O(n log n) is sufficient and O(n^2) worst case is acceptable',
      'Finding the k-th smallest or k-th largest element in an array',
      'Problems like Sort Colors that require in-place partitioning (Dutch National Flag)',
      'When cache performance matters (quicksort has better locality than merge sort)',
      'Partial sorting: you only need the top-k elements in sorted order',
      'Three-way partitioning when there are many duplicate elements'
    ],

    keyPatterns: [
      'Lomuto partition: single pointer, pivot at end, simpler but slower on duplicates',
      'Hoare partition: two pointers from both ends, faster in practice',
      'Dutch National Flag (3-way partition): handles duplicates efficiently',
      'QuickSelect with random pivot: recurse only into the partition containing the target index',
      'Median-of-three pivot selection to avoid worst-case behavior'
    ],

    timeComplexity: 'QuickSort: O(n log n) average, O(n^2) worst. QuickSelect: O(n) average, O(n^2) worst.',
    spaceComplexity: 'O(log n) average for recursion stack',

    approach: [
      'Choose a pivot (random selection avoids worst-case on sorted input)',
      'Partition the array around the pivot: elements < pivot on left, > pivot on right',
      'For QuickSort: recursively sort both partitions',
      'For QuickSelect: only recurse into the partition containing the k-th index',
      'For Dutch National Flag: use three pointers (low, mid, high) to partition into three groups'
    ],

    commonProblems: [
      { name: 'Sort Colors', difficulty: 'Medium' },
      { name: 'Kth Largest Element in an Array', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Using a fixed pivot (e.g., always first or last element), which causes O(n^2) on sorted or nearly-sorted input',
      'Infinite recursion when the partition does not make progress (pivot equals all elements)',
      'Not handling duplicates properly, leading to unbalanced partitions',
      'Confusing k-th largest with k-th smallest (k-th largest = (n-k)-th smallest)',
      'Forgetting that QuickSelect modifies the array in-place, which may not be acceptable'
    ],

    tips: [
      'Always use random pivot selection to get O(n log n) expected time for QuickSort',
      'For Sort Colors, the Dutch National Flag three-way partition is the standard approach',
      'QuickSelect is the standard approach for "k-th largest" problems in interviews',
      'The Introselect algorithm combines QuickSelect with median-of-medians for guaranteed O(n) worst case',
      'Three-way partitioning is essential when the array has many duplicate values'
    ],

    interviewTips: [
      'Explain the partitioning step clearly - it is the core of both algorithms',
      'Mention random pivot selection proactively to address worst-case concerns',
      'For k-th largest, explain why QuickSelect is O(n) average: you halve the search space each time',
      'Compare with heap-based approach: QuickSelect O(n) vs heap O(n log k) - discuss trade-offs',
      'If asked about worst case, mention randomization or median-of-medians as mitigations'
    ],
  },

  // ─── 10. Bucket Sort ────────────────────────────────────────────
  {
    id: 'bucket-sort',
    title: 'Bucket Sort',
    icon: 'archive',
    color: '#eab308',
    questions: 3,
    description: 'Distribute elements into buckets for linear-time sorting when input has known range or distribution.',

    introduction: `Bucket Sort distributes elements into a fixed number of buckets based on some criterion (value range, frequency, etc.), processes each bucket independently, and concatenates the results. When elements are uniformly distributed, this achieves O(n) average time, beating comparison-based sorts' O(n log n) lower bound.

**Why This Matters:**
In interviews, bucket sort appears in problems involving frequency-based ordering (Top K Frequent, Sort by Frequency) and gap-based problems (Maximum Gap). The key insight is that when you can map elements to a bounded number of buckets, you bypass the comparison sort lower bound. Counting sort and radix sort are special cases of this paradigm.

**Key Insight:** The power of bucket sort lies in the bucketing function. By choosing the right mapping (value ranges, frequencies, digit values), you can solve problems that seem to require sorting in O(n) time. For Maximum Gap, the pigeonhole principle guarantees the answer spans at least one empty bucket, so you only need to check bucket boundaries.`,

    whenToUse: [
      'Sorting when the value range or number of distinct values is bounded',
      'Frequency-based sorting (most frequent, least frequent, sort by frequency)',
      'Finding the maximum gap between consecutive elements in sorted order',
      'When elements can be categorized into a manageable number of groups',
      'Problems where counting sort or radix sort principles apply',
      'Top-K problems where heap is overkill and bucket sort gives O(n)'
    ],

    keyPatterns: [
      'Frequency buckets: index = frequency, value = list of elements with that frequency',
      'Value-range buckets: divide the range [min, max] into equal-sized intervals',
      'Counting sort: one bucket per distinct value, count occurrences',
      'Radix sort: sort by each digit position using a stable sort (counting sort) as subroutine',
      'Gap analysis: create n+1 buckets, max gap must span an empty bucket'
    ],

    timeComplexity: 'O(n + k) where k is the number of buckets',
    spaceComplexity: 'O(n + k)',

    approach: [
      'Determine the bucketing criterion: frequency, value range, digit, or custom mapping',
      'Create the appropriate number of buckets (often n or range-based)',
      'Distribute each element into its designated bucket',
      'Process buckets: sort within each bucket if needed, or just collect',
      'Concatenate bucket contents in order to produce the final result'
    ],

    commonProblems: [
      { name: 'Sort Characters By Frequency', difficulty: 'Medium' },
      { name: 'Top K Frequent Words', difficulty: 'Medium' },
      { name: 'Maximum Gap', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Choosing too few buckets, causing large buckets that require expensive internal sorting',
      'Off-by-one errors in bucket index calculation, especially for value-range bucketing',
      'Forgetting to handle empty buckets correctly',
      'Not realizing that bucket sort is not a comparison sort and therefore can beat O(n log n)',
      'Using bucket sort when the range is extremely large relative to n, negating the benefit'
    ],

    tips: [
      'For Top K Frequent, use frequency as the bucket index: bucket[freq] = [elements with that frequency]',
      'For Maximum Gap, bucket size = ceil((max - min) / (n - 1)), and the answer is always across bucket boundaries',
      'Counting sort is the simplest bucket sort: one bucket per value, count occurrences',
      'Radix sort processes digits from least significant to most significant using a stable bucket sort',
      'When the number of distinct values is small, bucket sort gives true O(n) performance'
    ],

    interviewTips: [
      'Explain why bucket sort can achieve O(n): it is not comparison-based, so the O(n log n) lower bound does not apply',
      'For frequency problems, describe the frequency bucket technique clearly',
      'For Maximum Gap, explain the pigeonhole argument: n-1 gaps, n+1 buckets, so the max gap spans an empty bucket',
      'Mention that counting sort and radix sort are special cases of bucket sort',
      'Discuss when bucket sort is appropriate vs when comparison sorts are better (unknown distribution, large range)'
    ],
  },

  // ─── 11. Tree Traversals ────────────────────────────────────────
  {
    id: 'tree-traversal',
    title: 'Tree Traversals',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 13,
    description: 'Master preorder, inorder, postorder, and level-order traversals to solve tree problems systematically.',

    visualizations: [
      {
        title: 'Binary Tree Traversal Orders',
        description: 'Preorder (root-left-right), Inorder (left-root-right), Postorder (left-right-root)',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="tt-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><path d="M0,0 L7,2.5 L0,5" fill="#64748b"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Tree Traversal Orders</text><g transform="translate(140,32)"><circle cx="60" cy="20" r="18" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="60" y="25" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#1e293b">1</text><line x1="47" y1="35" x2="25" y2="58" stroke="#64748b" stroke-width="1.5" marker-end="url(#tt-arrow)"/><line x1="73" y1="35" x2="95" y2="58" stroke="#64748b" stroke-width="1.5" marker-end="url(#tt-arrow)"/><circle cx="15" cy="72" r="18" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="15" y="77" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#1e293b">2</text><circle cx="105" cy="72" r="18" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="105" y="77" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#1e293b">3</text><line x1="4" y1="88" x2="-12" y2="108" stroke="#64748b" stroke-width="1.5" marker-end="url(#tt-arrow)"/><line x1="26" y1="88" x2="40" y2="108" stroke="#64748b" stroke-width="1.5" marker-end="url(#tt-arrow)"/><line x1="94" y1="88" x2="78" y2="108" stroke="#64748b" stroke-width="1.5" marker-end="url(#tt-arrow)"/><line x1="116" y1="88" x2="132" y2="108" stroke="#64748b" stroke-width="1.5" marker-end="url(#tt-arrow)"/><circle cx="-20" cy="122" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="-20" y="127" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">4</text><circle cx="48" cy="122" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="48" y="127" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">5</text><circle cx="70" cy="122" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="70" y="127" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">6</text><circle cx="140" cy="122" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="140" y="127" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">7</text></g><g transform="translate(20,190)"><rect x="0" y="0" width="145" height="44" rx="5" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/><text x="10" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#3b82f6">Preorder (Root-L-R):</text><text x="10" y="34" font-family="monospace" font-size="12" fill="#1e293b">1, 2, 4, 5, 3, 6, 7</text><rect x="155" y="0" width="145" height="44" rx="5" fill="#ecfdf5" stroke="#10b981" stroke-width="1"/><text x="165" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#10b981">Inorder (L-Root-R):</text><text x="165" y="34" font-family="monospace" font-size="12" fill="#1e293b">4, 2, 5, 1, 6, 3, 7</text><rect x="310" y="0" width="155" height="44" rx="5" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/><text x="320" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#b45309">Postorder (L-R-Root):</text><text x="320" y="34" font-family="monospace" font-size="12" fill="#1e293b">4, 5, 2, 6, 7, 3, 1</text></g></svg>'
      }
    ],

    introduction: `Tree traversals are the fundamental operations for visiting every node in a tree. The four main traversals are: preorder (root, left, right), inorder (left, root, right), postorder (left, right, root), and level-order (breadth-first, level by level). Each traversal reveals different structural properties of the tree.

**Why This Matters:**
Nearly every tree problem in interviews requires a traversal as its backbone. Inorder traversal of a BST produces sorted output. Preorder traversal reconstructs the tree. Postorder traversal computes bottom-up aggregates (heights, diameters). Level-order traversal processes nodes layer by layer. Choosing the right traversal is the first step to solving any tree problem.

**Key Insight:** The three DFS traversals (preorder, inorder, postorder) differ only in when you process the current node relative to the recursive calls. Once you internalize this, you can adapt any traversal to solve different problems by choosing when to do the "work" (before, between, or after visiting children).`,

    whenToUse: [
      'Processing all nodes in a tree or extracting information from the tree structure',
      'Level-order (BFS) for problems involving levels, depths, or layer-by-layer processing',
      'Inorder for BST problems requiring sorted order',
      'Preorder for serialization, copying, or building tree representations',
      'Postorder for bottom-up computations like height, diameter, or subtree aggregation',
      'Zigzag, right-side view, and other level-based views of the tree'
    ],

    keyPatterns: [
      'Recursive DFS: choose pre/in/post based on when to process the node',
      'Iterative DFS with explicit stack: simulates recursion without call stack overhead',
      'BFS with queue: level-order traversal, track level boundaries with queue size',
      'Morris traversal: O(1) space inorder traversal using threaded pointers',
      'Zigzag: BFS with alternating left-right / right-left collection per level',
      'Right side view: BFS taking the last node at each level, or DFS prioritizing right children'
    ],

    timeComplexity: 'O(n) for all traversals',
    spaceComplexity: 'O(h) for DFS (h = tree height), O(w) for BFS (w = max width)',

    approach: [
      'Determine which traversal order is needed based on the problem requirements',
      'For DFS: implement recursively first, then convert to iterative with a stack if needed',
      'For BFS: use a queue, process one level at a time by recording the queue size at the start of each level',
      'For each problem, identify what "work" needs to be done at each node and when (before, between, or after children)',
      'Handle edge cases: empty tree, single node, skewed tree (essentially a linked list)'
    ],

    commonProblems: [
      { name: 'Binary Tree Level Order Traversal', difficulty: 'Medium' },
      { name: 'Binary Tree Right Side View', difficulty: 'Medium' },
      { name: 'Binary Tree Zigzag Level Order Traversal', difficulty: 'Medium' },
      { name: 'Binary Tree Preorder Traversal', difficulty: 'Easy' },
      { name: 'Same Tree', difficulty: 'Easy' },
      { name: 'Symmetric Tree', difficulty: 'Easy' },
      { name: 'Binary Tree Inorder Traversal', difficulty: 'Easy' },
      { name: 'Validate Binary Search Tree', difficulty: 'Medium' },
      { name: 'Binary Tree Postorder Traversal', difficulty: 'Easy' },
      { name: 'Invert Binary Tree', difficulty: 'Easy' },
      { name: 'Diameter of Binary Tree', difficulty: 'Easy' },
      { name: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium' },
      { name: 'Binary Tree Maximum Path Sum', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Confusing which traversal to use: inorder for BST sorted order, preorder for top-down, postorder for bottom-up',
      'Forgetting the base case (null node) in recursive implementations',
      'In level-order, not capturing the queue size at the start of each level, leading to mixed-level processing',
      'For iterative inorder, pushing nodes incorrectly or not going left far enough before processing',
      'Assuming the tree is balanced when computing space complexity (worst case is O(n) for skewed trees)'
    ],

    tips: [
      'Recursive DFS is usually cleaner and faster to write in interviews; use iterative only if asked or for follow-up',
      'For BST validation, inorder traversal is the cleanest approach: check that each value is greater than the previous',
      'Level-order traversal is the go-to for any problem involving "levels" or "depth"',
      'Morris traversal achieves O(1) space by temporarily modifying the tree structure - impressive to mention but rarely required',
      'For diameter and max path sum, use postorder traversal to compute heights bottom-up and track the global maximum'
    ],

    interviewTips: [
      'State which traversal you are using and why: "I will use postorder because I need bottom-up information"',
      'For level-order problems, mention BFS immediately and describe the queue-based approach',
      'When validating a BST, explain why inorder traversal produces sorted output and how to check it',
      'For right side view, mention both BFS (last per level) and DFS (right-first) approaches',
      'Be prepared to convert a recursive DFS to iterative if the interviewer asks about stack overflow concerns'
    ],
  },

  // ─── 12. BST / Ordered Set ──────────────────────────────────────
  {
    id: 'bst',
    title: 'BST / Ordered Set',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 4,
    description: 'Leverage BST properties for ordered data operations: search, insert, delete, and range queries in O(log n).',

    visualizations: [
      {
        title: 'BST Operations: Search Path',
        description: 'BST property ensures left < root < right; search follows one path down',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="bst-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><path d="M0,0 L7,2.5 L0,5" fill="#64748b"/></marker><marker id="bst-green" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><path d="M0,0 L7,2.5 L0,5" fill="#10b981"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">BST Search: Finding value 6</text><g transform="translate(140,32)"><circle cx="80" cy="20" r="18" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="80" y="25" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">8</text><text x="80" y="5" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981">8 &gt; 6, go left</text><line x1="66" y1="34" x2="35" y2="55" stroke="#10b981" stroke-width="2.5" marker-end="url(#bst-green)"/><line x1="94" y1="34" x2="125" y2="55" stroke="#64748b" stroke-width="1.5" marker-end="url(#bst-arrow)"/><circle cx="25" cy="70" r="18" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="75" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">4</text><text x="25" y="55" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981">4 &lt; 6, go right</text><circle cx="135" cy="70" r="18" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="135" y="75" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">10</text><line x1="14" y1="84" x2="-10" y2="105" stroke="#64748b" stroke-width="1.5" marker-end="url(#bst-arrow)"/><line x1="36" y1="84" x2="55" y2="105" stroke="#10b981" stroke-width="2.5" marker-end="url(#bst-green)"/><line x1="124" y1="84" x2="105" y2="105" stroke="#64748b" stroke-width="1.5" marker-end="url(#bst-arrow)"/><line x1="146" y1="84" x2="165" y2="105" stroke="#64748b" stroke-width="1.5" marker-end="url(#bst-arrow)"/><circle cx="-18" cy="120" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="-18" y="125" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">2</text><circle cx="63" cy="120" r="16" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5"/><text x="63" y="125" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">6</text><text x="63" y="142" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981" font-weight="bold">Found!</text><circle cx="97" cy="120" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="97" y="125" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">9</text><circle cx="173" cy="120" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="173" y="125" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">12</text></g><g transform="translate(20,195)"><rect x="0" y="0" width="220" height="40" rx="5" fill="#ecfdf5" stroke="#10b981" stroke-width="1"/><text x="15" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#10b981">Search path: 8 &rarr; 4 &rarr; 6</text><text x="15" y="32" font-family="sans-serif" font-size="10" fill="#64748b">O(log n) = O(3) for 7 nodes</text><rect x="235" y="0" width="230" height="40" rx="5" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="250" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">BST Property:</text><text x="250" y="32" font-family="sans-serif" font-size="10" fill="#64748b">left &lt; root &lt; right (always)</text></g></svg>'
      }
    ],

    introduction: `A Binary Search Tree (BST) maintains the invariant that for every node, all values in its left subtree are smaller and all values in its right subtree are larger. This ordering enables O(log n) search, insertion, and deletion in balanced trees. Ordered sets (like Java's TreeSet or C++'s std::set) are self-balancing BSTs that guarantee these bounds.

**Why This Matters:**
BST problems test your understanding of tree invariants and how to exploit ordered structure. Interview problems range from basic BST operations (trim, validate) to using ordered sets as building blocks for scheduling, interval, and streaming problems. Languages with built-in ordered sets (Java TreeMap, C++ set/map) give you powerful tools for problems requiring sorted dynamic collections.

**Key Insight:** The BST property means an inorder traversal produces elements in sorted order. This is the foundation for range queries, finding predecessors/successors, and validating BST correctness. When you need a dynamic sorted collection with O(log n) operations, think BST or ordered set.`,

    whenToUse: [
      'Need a dynamic collection that supports sorted order operations',
      'Finding predecessors, successors, or nearest values efficiently',
      'Range queries: find all elements in [low, high]',
      'Calendar/scheduling problems where you check for overlapping intervals',
      'Streaming problems where you need to maintain sorted order as elements arrive',
      'Any problem where both insertion and sorted access are needed frequently'
    ],

    keyPatterns: [
      'BST search: compare with root, go left if smaller, right if larger',
      'BST insertion: find the correct leaf position following search path',
      'BST deletion: handle three cases (leaf, one child, two children via inorder successor)',
      'Trimming a BST: recursively prune nodes outside a given range',
      'Using TreeMap/ordered set for interval overlap detection',
      'Inorder traversal for sorted enumeration'
    ],

    timeComplexity: 'O(log n) for balanced BSTs, O(n) worst case for skewed',
    spaceComplexity: 'O(n) for tree storage',

    approach: [
      'For BST manipulation problems, think recursively: how does the operation apply to left subtree, root, and right subtree?',
      'For trimming: if root < low, the answer is in the right subtree; if root > high, the answer is in the left subtree; otherwise, trim both subtrees',
      'For calendar/overlap problems, use a TreeMap to store intervals and check floor/ceiling entries for conflicts',
      'For validation, use inorder traversal or pass min/max bounds recursively',
      'For problems requiring ordered set operations in Python (which lacks a built-in TreeSet), consider SortedList from sortedcontainers or bisect module'
    ],

    commonProblems: [
      { name: 'Trim a Binary Search Tree', difficulty: 'Medium' },
      { name: 'My Calendar I', difficulty: 'Medium' },
      { name: 'My Calendar II', difficulty: 'Medium' },
      { name: 'Stock Price Fluctuation', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Forgetting that BST operations are O(n) in the worst case for unbalanced trees',
      'Not handling the three deletion cases correctly (especially two-children case with inorder successor)',
      'In Python, using a list with bisect for ordered operations but forgetting insertion is still O(n)',
      'Confusing BST property (strictly less/greater) with allowing duplicates without a clear convention',
      'Not leveraging built-in ordered set/map data structures when they are available in the language'
    ],

    tips: [
      'In Java, use TreeMap/TreeSet; in C++, use std::set/std::map for self-balancing BST operations',
      'In Python, use sortedcontainers.SortedList for O(log n) sorted operations',
      'BST deletion with two children: replace with inorder successor (smallest in right subtree) or inorder predecessor',
      'For calendar problems, the key insight is using floor() and ceiling() operations from an ordered map',
      'Augmented BSTs (storing subtree sizes, sums) enable order-statistic queries and range sum queries'
    ],

    interviewTips: [
      'State the BST invariant explicitly: "All left descendants are strictly less, all right descendants are strictly greater"',
      'When using ordered sets, mention the self-balancing guarantee (Red-Black Tree or AVL tree internally)',
      'For Python interviews, mention the sortedcontainers library or explain your bisect-based approach',
      'If implementing BST operations from scratch, handle all edge cases including empty tree and single node',
      'Connect to other topics: "Inorder traversal of a BST gives sorted order, which I can use to validate or enumerate"'
    ],
  },

  // ─── 13. Two Heaps ──────────────────────────────────────────────
  {
    id: 'two-heaps',
    title: 'Two Heaps',
    icon: 'layers',
    color: '#06b6d4',
    questions: 3,
    description: 'Maintain a max-heap and min-heap together to efficiently track the median or balance two halves of data.',

    introduction: `The Two Heaps pattern uses a max-heap for the smaller half of elements and a min-heap for the larger half. By keeping these two heaps balanced (sizes differ by at most 1), the median is always available at the top of one or both heaps. This enables O(log n) insertions and O(1) median queries on a streaming dataset.

**Why This Matters:**
"Find Median from Data Stream" is one of the most popular hard interview questions and the Two Heaps pattern is its canonical solution. The same pattern appears in sliding window median problems and optimization problems like IPO where you need to efficiently access both the smallest and largest elements from two different perspectives.

**Key Insight:** The max-heap holds elements less than or equal to the median, and the min-heap holds elements greater than the median. The median is either the top of the max-heap (odd total count) or the average of both tops (even count). The balancing step after each insertion ensures the size difference never exceeds 1.`,

    whenToUse: [
      'Finding the median of a data stream (running median)',
      'Sliding window median problems',
      'Problems requiring quick access to both the maximum of a lower half and minimum of an upper half',
      'Optimization problems that greedily select from the smallest available and track profits (IPO pattern)',
      'Any scenario where you partition data into two groups and need efficient access to the boundary between them'
    ],

    keyPatterns: [
      'Max-heap for lower half, min-heap for upper half, balanced sizes',
      'Insert into appropriate heap, then rebalance if sizes differ by more than 1',
      'Median = max_heap top (odd count) or average of both tops (even count)',
      'Sliding window variant: lazy deletion with a hash map tracking removed elements',
      'IPO pattern: min-heap for costs, max-heap for profits of affordable items'
    ],

    timeComplexity: 'O(log n) per insertion, O(1) for median query',
    spaceComplexity: 'O(n)',

    approach: [
      'Create a max-heap (lower half) and a min-heap (upper half)',
      'For each new element: if it is less than or equal to the max-heap top, add to max-heap; otherwise add to min-heap',
      'After insertion, rebalance: if one heap has more than 1 extra element, move its top to the other heap',
      'The median is the top of the larger heap (odd count) or the average of both tops (even count)',
      'For sliding window: use lazy deletion - mark elements as deleted and only remove when they appear at the top'
    ],

    commonProblems: [
      { name: 'Find Median from Data Stream', difficulty: 'Hard' },
      { name: 'IPO', difficulty: 'Hard' },
      { name: 'Sliding Window Median', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'In Python, forgetting to negate values for the max-heap (heapq is min-heap only)',
      'Not rebalancing after every insertion, leading to incorrect median',
      'For sliding window median, not handling lazy deletion properly (stale elements at heap tops)',
      'Incorrect median calculation when one heap has one more element than the other',
      'Not handling the edge case of the first insertion when both heaps are empty'
    ],

    tips: [
      'In Python, simulate a max-heap by inserting negated values into heapq',
      'Always add to max-heap first, then move the top to min-heap, then rebalance - this simplifies the logic',
      'For sliding window, use a counter/dictionary to track elements that should be logically deleted and clean up lazily',
      'The IPO problem uses two heaps differently: one sorted by cost (min-heap) and one by profit (max-heap)',
      'Consider using a self-balancing BST (e.g., SortedList) as an alternative for sliding window median'
    ],

    interviewTips: [
      'Draw the two heaps and show how the median sits at the boundary between them',
      'Explain the balancing invariant: sizes differ by at most 1, and max_heap.top <= min_heap.top',
      'For Find Median from Data Stream, walk through adding 5 elements and show the heap states',
      'Mention the time complexities: O(log n) insert, O(1) median query',
      'For the sliding window variant, explain why lazy deletion is necessary and how it works'
    ],
  },

  // ─── 14. Top K Elements ─────────────────────────────────────────
  {
    id: 'top-k-elements',
    title: 'Top K Elements',
    icon: 'award',
    color: '#06b6d4',
    questions: 3,
    description: 'Efficiently find the k largest, smallest, or most frequent elements using heaps or partitioning.',

    introduction: `The Top K Elements pattern involves finding the k elements that rank highest (or lowest) according to some criterion. The three main approaches are: a min-heap of size k (O(n log k)), QuickSelect (O(n) average), and bucket sort (O(n) for frequency problems). The heap approach is the most versatile and commonly expected in interviews.

**Why This Matters:**
"Top K" is one of the most common interview question patterns. It appears as Top K Frequent Elements, K Closest Points, Kth Largest in a Stream, and many variants. The heap-based approach demonstrates understanding of priority queues, and choosing the right approach (heap vs QuickSelect vs bucket sort) shows algorithmic maturity.

**Key Insight:** To find the top k largest elements, use a min-heap of size k. Each new element is compared with the heap's minimum: if larger, it replaces the minimum. After processing all elements, the heap contains exactly the k largest. This is counterintuitive - you use a min-heap to find maximums - because you are maintaining a heap of "the best k so far" and the min-heap lets you efficiently evict the worst of the best.`,

    whenToUse: [
      'Finding the k largest or k smallest elements in a collection',
      'Finding the k most frequent elements',
      'Maintaining a running "top k" as elements stream in',
      'K closest points to a reference point',
      'Any problem asking for a partial ordering of the top or bottom k elements',
      'When full sorting is overkill and you only need the top k'
    ],

    keyPatterns: [
      'Min-heap of size k for top-k largest (evict minimum when heap is full)',
      'Max-heap of size k for top-k smallest (evict maximum when heap is full)',
      'Frequency count + heap: count frequencies first, then find top-k by frequency',
      'Bucket sort for frequency: O(n) alternative when frequencies are bounded by n',
      'QuickSelect for k-th element: O(n) average, modifies array in-place'
    ],

    timeComplexity: 'O(n log k) with heap, O(n) average with QuickSelect or bucket sort',
    spaceComplexity: 'O(k) for heap approach, O(n) for bucket sort',

    approach: [
      'Determine the ranking criterion: value, frequency, distance, or custom comparator',
      'For heap approach: initialize a min-heap (for top-k largest) and process each element, maintaining size k',
      'For frequency-based problems: first count frequencies with a hash map, then apply the heap to (frequency, element) pairs',
      'For bucket sort approach: create buckets indexed by frequency, iterate from highest frequency bucket',
      'For streaming problems (Kth Largest in a Stream): maintain a min-heap of size k; the top is always the k-th largest'
    ],

    commonProblems: [
      { name: 'Kth Largest Element in a Stream', difficulty: 'Easy' },
      { name: 'Top K Frequent Elements', difficulty: 'Medium' },
      { name: 'K Closest Points to Origin', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Using a max-heap of size n instead of a min-heap of size k, resulting in O(n log n) instead of O(n log k)',
      'Forgetting to count frequencies first before applying the heap for frequency-based problems',
      'Not handling ties correctly (e.g., when multiple elements have the same frequency)',
      'For K Closest Points, computing square root unnecessarily - squared distance is sufficient for comparison',
      'In streaming scenarios, not maintaining the heap size at exactly k'
    ],

    tips: [
      'Use a min-heap of size k for top-k largest: counterintuitive but correct and efficient',
      'For Top K Frequent Elements, bucket sort gives O(n) because max frequency is bounded by n',
      'In Python, use heapq.nlargest(k, ...) or heapq.nsmallest(k, ...) for concise code',
      'For K Closest Points, compare squared distances to avoid floating point issues',
      'The streaming variant (Kth Largest in a Stream) is a direct application of a size-k min-heap'
    ],

    interviewTips: [
      'Explain the counterintuitive choice: "I use a min-heap of size k to find the top-k largest because the min lets me efficiently remove the weakest candidate"',
      'Compare approaches: heap O(n log k) vs QuickSelect O(n) vs full sort O(n log n)',
      'For frequency problems, mention both the heap approach and the bucket sort O(n) optimization',
      'Be ready to discuss space-time trade-offs between the different approaches',
      'For streaming problems, explain that the heap naturally maintains the answer as new elements arrive'
    ],
  },

  // ─── 15. K-Way Merge ────────────────────────────────────────────
  {
    id: 'k-way-merge',
    title: 'K-Way Merge',
    icon: 'gitMerge',
    color: '#06b6d4',
    questions: 4,
    description: 'Merge k sorted lists or find k-th smallest across sorted collections using a min-heap.',

    introduction: `K-Way Merge is the technique for efficiently merging k sorted sequences or finding elements by rank across multiple sorted sources. The core idea is to use a min-heap that always contains the smallest unprocessed element from each of the k sources. By repeatedly extracting the minimum and replacing it with the next element from the same source, you merge all sources in O(n log k) time.

**Why This Matters:**
Merge K Sorted Lists is a frequently asked interview question and the pattern extends to problems like finding the k-th smallest element in a matrix, finding k pairs with smallest sums, and finding the smallest range that covers elements from all lists. The min-heap approach is elegant and generalizes the two-way merge from merge sort to k-way.

**Key Insight:** The min-heap acts as a "tournament" among the k sources. At any moment, the heap contains at most k elements (one frontier element from each source), and extracting the minimum takes O(log k). Since you process n total elements, the overall time is O(n log k), which is much better than repeatedly scanning all k lists.`,

    whenToUse: [
      'Merging k sorted linked lists or arrays into one sorted sequence',
      'Finding the k-th smallest element across multiple sorted sequences (e.g., sorted matrix)',
      'Finding k pairs with smallest sums from two sorted arrays',
      'Finding the smallest range that covers at least one element from each sorted list',
      'Any problem that generalizes two-way merge to k sources',
      'External merge sort when data is split across multiple sorted files'
    ],

    keyPatterns: [
      'Min-heap with (value, source_index, element_index) tuples',
      'Initialize heap with the first element from each of the k sources',
      'Extract min, output it, push the next element from the same source',
      'For k-th smallest: extract k times instead of merging everything',
      'For smallest range: track the current maximum alongside the heap minimum'
    ],

    timeComplexity: 'O(n log k) where n is total elements and k is number of sources',
    spaceComplexity: 'O(k) for the heap',

    approach: [
      'Initialize a min-heap with the first element from each of the k sorted sources, along with source and position metadata',
      'While the heap is not empty: extract the minimum element',
      'If the extracted element has a successor in its source, push the successor into the heap',
      'For merge: output extracted elements in order. For k-th smallest: count extractions and stop at k',
      'For smallest range: maintain a variable tracking the current maximum; the range is [heap_min, current_max]'
    ],

    commonProblems: [
      { name: 'Find K Pairs with Smallest Sums', difficulty: 'Medium' },
      { name: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium' },
      { name: 'Merge k Sorted Lists', difficulty: 'Hard' },
      { name: 'Smallest Range Covering Elements from K Lists', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Not tracking which source an element came from, making it impossible to fetch the next element',
      'Pushing duplicate elements into the heap when advancing pointers incorrectly',
      'For K Pairs with Smallest Sums, exploring too many pairs (need to prune the search space)',
      'Forgetting to handle empty sources (some of the k lists may be empty)',
      'For sorted matrix, not recognizing that rows and columns are independently sorted (two different approaches)'
    ],

    tips: [
      'In Python, use heapq with tuples: (value, list_index, element_index) for automatic comparison',
      'For linked lists, store (node.val, unique_id, node) to avoid comparison issues between nodes',
      'K-th smallest in a sorted matrix can also be solved with binary search on value range',
      'For Smallest Range, think of it as a sliding window on the merged sequence where each list contributes at least one element',
      'The heap size stays at most k, so each operation is O(log k), not O(log n)'
    ],

    interviewTips: [
      'Explain the heap as a "tournament": it always holds the best candidate from each source',
      'State the complexity clearly: O(n log k) time, O(k) space, where n is total elements',
      'For Merge K Sorted Lists, compare with the naive approach of merging pairs: O(nk) vs O(n log k)',
      'Mention that this pattern generalizes the merge step of merge sort from 2 to k sources',
      'For matrix problems, discuss both the heap approach and the binary search alternative'
    ],
  },

  // ─── 16. Data Structure Design ──────────────────────────────────
  {
    id: 'data-structure-design',
    title: 'Data Structure Design',
    icon: 'puzzle',
    color: '#8b5cf6',
    questions: 8,
    description: 'Design custom data structures that combine standard primitives to meet specific operational constraints.',

    introduction: `Data Structure Design problems ask you to build a custom class that supports a specific set of operations, each with a required time complexity. These problems test your ability to combine standard data structures (hash maps, linked lists, heaps, stacks, arrays) creatively to meet all constraints simultaneously.

**Why This Matters:**
These problems are favorites at top tech companies because they test both your data structure knowledge and your design skills. Problems like LRU Cache, Insert Delete GetRandom O(1), and Time Based Key-Value Store are among the most frequently asked interview questions. They require you to identify which combination of data structures satisfies all the operation constraints.

**Key Insight:** The secret is to identify the bottleneck operation and choose the data structure that makes it efficient, then add auxiliary structures to support the remaining operations. For example, LRU Cache needs O(1) access (hash map) and O(1) eviction of the least recently used (doubly linked list) - neither alone suffices, but together they do.`,

    whenToUse: [
      'When a problem asks you to design a class with multiple operations at specific time complexities',
      'LRU/LFU cache design requiring O(1) get, put, and eviction',
      'Random access with O(1) insert and delete (requires hash map + array swap trick)',
      'Time-based or versioned data retrieval (hash map + binary search)',
      'Stack-based designs with additional operations like getMax or getMin in O(1)',
      'When no single standard data structure satisfies all required operation complexities'
    ],

    keyPatterns: [
      'Hash map + doubly linked list: O(1) access + O(1) ordered eviction (LRU Cache)',
      'Hash map + array with swap-to-end deletion: O(1) insert, delete, and random access',
      'Hash map + sorted list/binary search: time-based or versioned lookups',
      'Stack of stacks or frequency-bucketed stacks (Maximum Frequency Stack)',
      'Snapshot with copy-on-write or binary search on versioned arrays',
      'Doubly linked list for browser history (back/forward navigation)'
    ],

    timeComplexity: 'Varies by design; goal is O(1) for primary operations',
    spaceComplexity: 'O(n) typically',

    approach: [
      'List all required operations and their target time complexities',
      'For each operation, identify which data structure natively supports that complexity',
      'Find the combination of data structures where each covers the others weakness',
      'Design the internal state: what data is stored, what maps to what, what maintains ordering',
      'Implement carefully, handling edge cases like empty state, duplicate keys, capacity limits'
    ],

    commonProblems: [
      { name: 'Design Browser History', difficulty: 'Medium' },
      { name: 'Time Based Key-Value Store', difficulty: 'Medium' },
      { name: 'Snapshot Array', difficulty: 'Medium' },
      { name: 'Design Twitter', difficulty: 'Medium' },
      { name: 'LRU Cache', difficulty: 'Medium' },
      { name: 'Insert Delete GetRandom O(1)', difficulty: 'Medium' },
      { name: 'Design a Food Rating System', difficulty: 'Medium' },
      { name: 'Maximum Frequency Stack', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Designing with a single data structure that cannot meet all operation requirements',
      'Forgetting to update all auxiliary structures when modifying data (e.g., updating both hash map and linked list in LRU)',
      'Not handling edge cases: empty cache, duplicate insertions, accessing non-existent keys',
      'Using OrderedDict and thinking the problem is trivially solved without understanding the underlying mechanism',
      'Incorrect random selection: using hash map iteration instead of array indexing for true O(1) random'
    ],

    tips: [
      'Start by listing operations and target complexities in a table before designing',
      'LRU Cache = HashMap<key, DoublyLinkedListNode> + DoublyLinkedList for recency order',
      'Insert Delete GetRandom O(1) = HashMap<val, index> + Array with swap-to-end delete trick',
      'Time Based Key-Value Store = HashMap<key, list of (timestamp, value)> + binary search on timestamps',
      'Maximum Frequency Stack = HashMap<val, freq> + HashMap<freq, stack> + maxFreq counter'
    ],

    interviewTips: [
      'Begin by asking clarifying questions: capacity limits? thread safety? duplicate handling?',
      'Draw the data structure relationships on a whiteboard before coding',
      'Explain why you need each component: "The hash map gives O(1) lookup, the linked list gives O(1) eviction order"',
      'Walk through a sequence of operations to demonstrate correctness',
      'Discuss alternative designs and trade-offs if time permits'
    ],
  },

  // ─── 17. Union Find ─────────────────────────────────────────────
  {
    id: 'union-find',
    title: 'Union Find',
    icon: 'share',
    color: '#06b6d4',
    questions: 5,
    description: 'Track connected components and merge sets efficiently with near-constant time union and find operations.',

    visualizations: [
      {
        title: 'Union-Find: Disjoint Sets with Path Compression',
        description: 'Parent pointers track set membership; path compression flattens trees for O(1) find',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="uf-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><path d="M0,0 L7,2.5 L0,5" fill="#64748b"/></marker><marker id="uf-green" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><path d="M0,0 L7,2.5 L0,5" fill="#10b981"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Union-Find with Path Compression</text><text x="120" y="48" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">Before Compression</text><g transform="translate(50,55)"><circle cx="70" cy="10" r="16" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="70" y="15" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#1e293b">0</text><text x="70" y="-2" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#3b82f6">root</text><line x1="58" y1="23" x2="35" y2="42" stroke="#64748b" stroke-width="1.5" marker-end="url(#uf-arrow)"/><line x1="82" y1="23" x2="105" y2="42" stroke="#64748b" stroke-width="1.5" marker-end="url(#uf-arrow)"/><circle cx="25" cy="55" r="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="60" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><circle cx="115" cy="55" r="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="115" y="60" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><line x1="25" y1="69" x2="25" y2="88" stroke="#64748b" stroke-width="1.5" marker-end="url(#uf-arrow)"/><circle cx="25" cy="102" r="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="107" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">3</text><line x1="25" y1="116" x2="25" y2="132" stroke="#64748b" stroke-width="1.5" marker-end="url(#uf-arrow)"/><circle cx="25" cy="146" r="14" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="25" y="151" text-anchor="middle" font-family="monospace" font-size="12" fill="#ef4444">4</text><text x="48" y="148" font-family="sans-serif" font-size="8" fill="#ef4444">find(4)?</text></g><text x="250" y="110" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#10b981">&rArr;</text><text x="380" y="48" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#10b981">After find(4)</text><g transform="translate(300,55)"><circle cx="80" cy="10" r="16" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="80" y="15" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#1e293b">0</text><text x="80" y="-2" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#3b82f6">root</text><line x1="66" y1="22" x2="20" y2="42" stroke="#10b981" stroke-width="1.5" marker-end="url(#uf-green)"/><line x1="74" y1="24" x2="53" y2="42" stroke="#10b981" stroke-width="1.5" marker-end="url(#uf-green)"/><line x1="86" y1="24" x2="107" y2="42" stroke="#10b981" stroke-width="1.5" marker-end="url(#uf-green)"/><line x1="94" y1="22" x2="140" y2="42" stroke="#10b981" stroke-width="1.5" marker-end="url(#uf-green)"/><circle cx="13" cy="55" r="14" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="13" y="60" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><circle cx="47" cy="55" r="14" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="47" y="60" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">3</text><circle cx="113" cy="55" r="14" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="113" y="60" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><circle cx="147" cy="55" r="14" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="147" y="60" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">4</text></g><g transform="translate(20,195)"><rect x="0" y="0" width="460" height="40" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Path Compression:</text><text x="130" y="16" font-family="sans-serif" font-size="10" fill="#64748b">During find(4), all nodes on path point directly to root</text><text x="15" y="32" font-family="sans-serif" font-size="10" fill="#64748b">Future find(4) is O(1) instead of O(depth). Combined with union by rank: O(&alpha;(n)) amortized.</text></g></svg>'
      }
    ],

    introduction: `Union Find (also called Disjoint Set Union or DSU) is a data structure that tracks a collection of disjoint sets and supports two operations: find (which set does an element belong to?) and union (merge two sets). With path compression and union by rank optimizations, both operations run in nearly O(1) amortized time - specifically O(alpha(n)) where alpha is the inverse Ackermann function.

**Why This Matters:**
Union Find is the go-to data structure for connectivity problems: determining if two nodes are connected, counting connected components, and detecting cycles in undirected graphs. It is simpler and more efficient than BFS/DFS for problems that only require connectivity information (not paths). It also appears in minimum spanning tree algorithms (Kruskal's) and network analysis.

**Key Insight:** Each set is represented as a tree rooted at a "representative" element. Find follows parent pointers to the root (with path compression flattening the tree along the way). Union links one root to the other (with rank-based merging to keep trees balanced). These two optimizations together make the amortized cost nearly constant.`,

    whenToUse: [
      'Determining if two elements are in the same connected component',
      'Counting the number of connected components in a graph',
      'Detecting cycles in an undirected graph (if union returns that both endpoints are already connected)',
      'Kruskal\'s minimum spanning tree algorithm (sort edges, union if endpoints are in different sets)',
      'Merging groups of accounts, regions, or equivalence classes',
      'Any problem where you process edges/relationships incrementally and need connectivity queries'
    ],

    keyPatterns: [
      'Path compression in find: point each visited node directly to the root',
      'Union by rank: attach the shorter tree under the taller tree to keep depth logarithmic',
      'Connected components count: start with n components, decrement by 1 on each successful union',
      'Weighted Union Find: track sizes or weights of components for problems like minimize malware spread',
      'Cycle detection: if find(u) == find(v) before union(u, v), adding edge (u, v) creates a cycle'
    ],

    timeComplexity: 'O(alpha(n)) per operation amortized, effectively O(1)',
    spaceComplexity: 'O(n)',

    approach: [
      'Initialize parent[i] = i and rank[i] = 0 for all elements',
      'Find: recursively (or iteratively) follow parent pointers to the root; apply path compression by setting parent of each visited node to the root',
      'Union: find the roots of both elements; if different, link the smaller-rank root to the larger-rank root; if equal rank, choose either and increment rank',
      'Track the number of components by starting at n and decrementing on each successful union',
      'For weighted problems, also maintain a size array and update it during union'
    ],

    commonProblems: [
      { name: 'Number of Provinces', difficulty: 'Medium' },
      { name: 'Redundant Connection', difficulty: 'Medium' },
      { name: 'Accounts Merge', difficulty: 'Medium' },
      { name: 'Minimize Malware Spread', difficulty: 'Hard' },
      { name: 'Min Cost to Connect All Points', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Forgetting path compression, leading to O(n) find operations in the worst case',
      'Not using union by rank, resulting in tall degenerate trees',
      'Initializing parent[i] = 0 for all elements instead of parent[i] = i',
      'For Accounts Merge, not mapping emails to a canonical owner before merging',
      'Counting components incorrectly: not decrementing on union or double-counting'
    ],

    tips: [
      'Always implement both path compression and union by rank for optimal performance',
      'Union Find is often simpler than BFS/DFS for pure connectivity problems',
      'For Kruskal\'s MST: sort edges by weight, iterate through edges, union endpoints if not already connected',
      'For Accounts Merge: use an email-to-id mapping, union all emails belonging to the same account, then group by root',
      'Union Find does not support efficient "disconnect" operations - if you need splits, consider other approaches'
    ],

    interviewTips: [
      'Implement Union Find as a class with find and union methods - it is clean and reusable',
      'Explain path compression: "Each find flattens the tree, so future finds are nearly O(1)"',
      'Mention the inverse Ackermann function: "With both optimizations, amortized cost is O(alpha(n)), practically constant"',
      'Compare with BFS/DFS: "Union Find is better for dynamic connectivity queries; BFS/DFS is better when you need paths"',
      'For graph problems, clearly state: "I will use Union Find because I only need connectivity, not shortest paths"'
    ],
  },

  // ─── 18. Topological Sort ───────────────────────────────────────
  {
    id: 'topological-sort',
    title: 'Topological Sort',
    icon: 'arrowRight',
    color: '#06b6d4',
    questions: 4,
    description: 'Order nodes in a directed acyclic graph so that every edge goes from earlier to later in the ordering.',

    visualizations: [
      {
        title: 'Topological Sort: DAG Ordering',
        description: 'Kahn\'s algorithm removes nodes with in-degree 0, producing valid ordering',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="ts-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Topological Sort (Kahn\'s Algorithm)</text><g transform="translate(30,40)"><circle cx="20" cy="20" r="18" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">A</text><text x="20" y="45" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981">in:0</text><circle cx="120" cy="20" r="18" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="120" y="25" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">B</text><text x="120" y="45" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#10b981">in:0</text><circle cx="60" cy="80" r="18" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/><text x="60" y="85" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">C</text><text x="60" y="105" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#3b82f6">in:2</text><circle cx="180" cy="80" r="18" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><text x="180" y="85" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">D</text><text x="180" y="105" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#b45309">in:1</text><circle cx="120" cy="140" r="18" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="120" y="145" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">E</text><text x="120" y="165" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#ef4444">in:2</text><line x1="34" y1="30" x2="46" y2="65" stroke="#64748b" stroke-width="1.5" marker-end="url(#ts-arrow)"/><line x1="110" y1="36" x2="72" y2="65" stroke="#64748b" stroke-width="1.5" marker-end="url(#ts-arrow)"/><line x1="134" y1="34" x2="166" y2="65" stroke="#64748b" stroke-width="1.5" marker-end="url(#ts-arrow)"/><line x1="72" y1="94" x2="106" y2="126" stroke="#64748b" stroke-width="1.5" marker-end="url(#ts-arrow)"/><line x1="168" y1="94" x2="134" y2="126" stroke="#64748b" stroke-width="1.5" marker-end="url(#ts-arrow)"/></g><g transform="translate(260,50)"><rect x="0" y="0" width="210" height="130" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="105" y="20" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">Kahn\'s BFS Steps</text><text x="15" y="42" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">Step 1:</text><text x="65" y="42" font-family="monospace" font-size="10" fill="#1e293b">Process A, B (in-deg 0)</text><text x="15" y="60" font-family="sans-serif" font-size="10" fill="#3b82f6" font-weight="bold">Step 2:</text><text x="65" y="60" font-family="monospace" font-size="10" fill="#1e293b">Process C (in-deg &rarr; 0)</text><text x="15" y="78" font-family="sans-serif" font-size="10" fill="#b45309" font-weight="bold">Step 3:</text><text x="65" y="78" font-family="monospace" font-size="10" fill="#1e293b">Process D (in-deg &rarr; 0)</text><text x="15" y="96" font-family="sans-serif" font-size="10" fill="#ef4444" font-weight="bold">Step 4:</text><text x="65" y="96" font-family="monospace" font-size="10" fill="#1e293b">Process E (in-deg &rarr; 0)</text><text x="15" y="120" font-family="monospace" font-size="11" font-weight="bold" fill="#10b981">Order: [A, B, C, D, E]</text></g><g transform="translate(20,205)"><rect x="0" y="0" width="460" height="32" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="14" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Cycle detection:</text><text x="110" y="14" font-family="sans-serif" font-size="10" fill="#64748b">If processed nodes &lt; total nodes, a cycle exists (topological sort impossible).</text><text x="15" y="26" font-family="sans-serif" font-size="10" fill="#64748b">Time: O(V + E) | Space: O(V)</text></g></svg>'
      }
    ],

    introduction: `Topological Sort produces a linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge (u, v), vertex u appears before vertex v. The two main algorithms are Kahn's Algorithm (BFS with in-degree tracking) and DFS-based ordering (post-order reversal).

**Why This Matters:**
Topological sort is essential for dependency resolution: course prerequisites, build systems, task scheduling, and compilation order. Interview problems often disguise dependency graphs as topological sort problems. Detecting whether a valid ordering exists is equivalent to checking if the graph is a DAG (no cycles).

**Key Insight:** Kahn's algorithm works by repeatedly removing nodes with no incoming edges (in-degree 0). If all nodes are eventually removed, the graph is a DAG and the removal order is a valid topological sort. If some nodes remain (their in-degree never reaches 0), the graph has a cycle and no valid ordering exists.`,

    whenToUse: [
      'Course scheduling with prerequisites (Course Schedule, Course Schedule II)',
      'Task dependency resolution: determining a valid execution order',
      'Build systems: compiling files in dependency order',
      'Detecting cycles in directed graphs (if topological sort fails, there is a cycle)',
      'Finding safe states in directed graphs (nodes that cannot reach a cycle)',
      'Any problem involving ordering items that have pairwise "must come before" constraints'
    ],

    keyPatterns: [
      'Kahn\'s algorithm (BFS): compute in-degrees, start with in-degree 0 nodes, process level by level',
      'DFS-based: run DFS, add to result in post-order, reverse the result',
      'Cycle detection: if Kahn\'s processes fewer than n nodes, or DFS encounters a node in the current path',
      'All topological orderings: backtracking over all valid choices at each step',
      'Minimum height trees: peel leaf nodes layer by layer (reverse topological sort)',
      'Group-respecting topological sort: topological sort within groups and between groups'
    ],

    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V + E) for adjacency list and in-degree array',

    approach: [
      'Build the adjacency list and compute in-degrees for all nodes',
      'Initialize a queue with all nodes having in-degree 0',
      'While the queue is not empty: dequeue a node, add it to the result, decrement in-degrees of all its neighbors',
      'If a neighbor\'s in-degree becomes 0, enqueue it',
      'After processing, if the result contains all nodes, it is a valid topological sort; otherwise, the graph has a cycle'
    ],

    commonProblems: [
      { name: 'Course Schedule II', difficulty: 'Medium' },
      { name: 'Find Eventual Safe States', difficulty: 'Medium' },
      { name: 'Minimum Height Trees', difficulty: 'Medium' },
      { name: 'Sort Items by Groups Respecting Dependencies', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Forgetting to check for cycles: if the result has fewer than n nodes, the graph has a cycle',
      'Using BFS without tracking in-degrees, which does not produce a valid topological order',
      'Confusing topological sort with general graph traversal (it only applies to directed graphs)',
      'Not building the graph correctly from the problem description (reversing edge directions)',
      'For DFS-based approach, adding nodes in pre-order instead of post-order'
    ],

    tips: [
      'Kahn\'s algorithm (BFS) is generally easier to implement and understand in interviews',
      'Cycle detection comes for free: if processed count < total nodes, there is a cycle',
      'For Minimum Height Trees, think of it as reverse topological sort: remove leaves layer by layer until 1-2 nodes remain',
      'For Find Eventual Safe States, nodes that are not part of any cycle are safe',
      'When the problem involves groups of tasks, you may need two levels of topological sort'
    ],

    interviewTips: [
      'State the algorithm choice: "I will use Kahn\'s algorithm with BFS because it naturally detects cycles"',
      'Explain the in-degree invariant: "A node with in-degree 0 has all prerequisites satisfied"',
      'Walk through a small example showing how in-degrees decrease and nodes enter the queue',
      'Mention that topological sort is only defined for DAGs; if a cycle exists, no valid ordering is possible',
      'For Course Schedule, frame it as: "Each course is a node, each prerequisite is a directed edge"'
    ],
  },

  // ─── 19. Shortest Path Algorithms ───────────────────────────────
  {
    id: 'shortest-path',
    title: 'Shortest Path Algorithms',
    icon: 'navigation',
    color: '#06b6d4',
    questions: 5,
    description: 'Find optimal paths in weighted graphs using Dijkstra, Bellman-Ford, and modified BFS techniques.',

    visualizations: [
      {
        title: 'Dijkstra\'s Algorithm: Shortest Path',
        description: 'Greedy expansion from source using a priority queue, highlighting the shortest path',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="sp-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#64748b"/></marker><marker id="sp-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#10b981"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Dijkstra\'s Shortest Path</text><g transform="translate(30,40)"><circle cx="30" cy="50" r="20" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5"/><text x="30" y="55" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">S</text><text x="30" y="78" text-anchor="middle" font-family="monospace" font-size="10" fill="#10b981">d=0</text><circle cx="140" cy="20" r="18" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="140" y="25" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">A</text><text x="140" y="46" text-anchor="middle" font-family="monospace" font-size="10" fill="#10b981">d=2</text><circle cx="140" cy="100" r="18" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="140" y="105" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">B</text><text x="140" y="126" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">d=6</text><circle cx="260" cy="50" r="18" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="260" y="55" text-anchor="middle" font-family="monospace" font-size="14" fill="#1e293b">C</text><text x="260" y="76" text-anchor="middle" font-family="monospace" font-size="10" fill="#10b981">d=5</text><circle cx="360" cy="50" r="20" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5"/><text x="360" y="55" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">T</text><text x="360" y="78" text-anchor="middle" font-family="monospace" font-size="10" fill="#10b981">d=7</text><line x1="48" y1="42" x2="120" y2="24" stroke="#10b981" stroke-width="2.5" marker-end="url(#sp-green)"/><text x="78" y="26" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981">2</text><line x1="48" y1="60" x2="120" y2="95" stroke="#64748b" stroke-width="1.5" marker-end="url(#sp-arrow)"/><text x="78" y="86" font-family="monospace" font-size="10" fill="#64748b">6</text><line x1="156" y1="25" x2="240" y2="45" stroke="#10b981" stroke-width="2.5" marker-end="url(#sp-green)"/><text x="195" y="28" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981">3</text><line x1="156" y1="95" x2="240" y2="55" stroke="#64748b" stroke-width="1.5" marker-end="url(#sp-arrow)"/><text x="195" y="82" font-family="monospace" font-size="10" fill="#64748b">1</text><line x1="278" y1="50" x2="340" y2="50" stroke="#10b981" stroke-width="2.5" marker-end="url(#sp-green)"/><text x="308" y="44" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981">2</text><line x1="150" y1="35" x2="150" y2="82" stroke="#64748b" stroke-width="1" stroke-dasharray="3,3"/><text x="158" y="62" font-family="monospace" font-size="9" fill="#94a3b8">4</text></g><g transform="translate(20,190)"><rect x="0" y="0" width="240" height="45" rx="5" fill="#ecfdf5" stroke="#10b981" stroke-width="1"/><text x="15" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#10b981">Shortest: S &rarr; A &rarr; C &rarr; T = 7</text><text x="15" y="34" font-family="sans-serif" font-size="10" fill="#64748b">vs S &rarr; B &rarr; C &rarr; T = 6+1+2 = 9</text><rect x="255" y="0" width="215" height="45" rx="5" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="270" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Priority Queue selects:</text><text x="270" y="34" font-family="sans-serif" font-size="10" fill="#64748b">min-distance unvisited node</text></g></svg>'
      }
    ],

    introduction: `Shortest path algorithms find the path with minimum total weight between nodes in a weighted graph. The three primary algorithms are: Dijkstra's (non-negative weights, O((V+E) log V) with a priority queue), Bellman-Ford (handles negative weights, O(VE)), and BFS (unweighted graphs, O(V+E)). Modified Dijkstra's is the most commonly tested in interviews.

**Why This Matters:**
Shortest path problems appear frequently in interviews, often disguised as network routing, minimum cost travel, or optimization on grids. The key skill is recognizing which algorithm to apply based on the edge weight characteristics (non-negative, possibly negative, unit weights) and constraints (limited stops, time-varying costs).

**Key Insight:** Dijkstra's algorithm works because it greedily processes the closest unvisited node. Once a node is finalized (dequeued from the priority queue), its shortest distance is guaranteed. This greedy property fails with negative edges (where a longer path through a negative edge might be shorter), which is when you need Bellman-Ford. For grid problems with varying "effort" costs, modified Dijkstra on the grid is the standard approach.`,

    whenToUse: [
      'Finding shortest/cheapest path in a graph with non-negative edge weights (Dijkstra)',
      'Finding shortest path with at most k intermediate stops (modified Bellman-Ford or BFS with pruning)',
      'Grid problems with varying movement costs (modified Dijkstra on grid)',
      'Finding paths that maximize probability or minimize maximum edge (modified Dijkstra with different relaxation)',
      'Problems with negative edge weights (Bellman-Ford)',
      'Unweighted shortest path (BFS)'
    ],

    keyPatterns: [
      'Dijkstra with priority queue: process nearest unvisited node, relax neighbors',
      'Bellman-Ford: relax all edges V-1 times, detect negative cycles on V-th pass',
      'Modified BFS/Dijkstra for grid problems: treat grid cells as graph nodes',
      'State-space expansion: Dijkstra with extra dimensions (node, stops_remaining, time)',
      'Binary search + BFS/DFS: binary search on the answer and verify with graph traversal',
      '0-1 BFS with deque: when edges have weight 0 or 1, use deque instead of priority queue'
    ],

    timeComplexity: 'Dijkstra: O((V+E) log V), Bellman-Ford: O(VE), BFS: O(V+E)',
    spaceComplexity: 'O(V + E) for adjacency list and distance array',

    approach: [
      'Identify the type of edge weights: non-negative (Dijkstra), possibly negative (Bellman-Ford), unit (BFS)',
      'Build the adjacency list with edge weights',
      'For Dijkstra: use a min-heap priority queue, initialize all distances to infinity except source, process nodes greedily',
      'For each dequeued node, relax all neighbors: if dist[u] + weight(u,v) < dist[v], update and enqueue',
      'For problems with constraints (k stops, maximum effort), expand the state space: (distance, node, constraint_state)'
    ],

    commonProblems: [
      { name: 'Network Delay Time', difficulty: 'Medium' },
      { name: 'Cheapest Flights Within K Stops', difficulty: 'Medium' },
      { name: 'Path with Maximum Probability', difficulty: 'Medium' },
      { name: 'Path With Minimum Effort', difficulty: 'Medium' },
      { name: 'Swim in Rising Water', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Using Dijkstra with negative edge weights (it produces incorrect results)',
      'Not using a visited set or distance check, leading to processing the same node multiple times unnecessarily',
      'Forgetting that Python\'s heapq is a min-heap: negate values for max-heap behavior',
      'For "maximum probability" or "minimum maximum edge" problems, not adapting the relaxation condition',
      'For k-stops problems, not expanding the state to include the number of stops used'
    ],

    tips: [
      'Dijkstra in Python: use heapq with (distance, node) tuples; skip nodes already finalized',
      'For "cheapest with k stops," use Bellman-Ford with k+1 relaxation rounds or BFS with state (node, stops)',
      'For "maximum probability," use Dijkstra with max-heap (negate log-probabilities or just use max comparison)',
      'For "minimum effort" grid problems, binary search on the effort + BFS verification is an alternative to Dijkstra',
      'Swim in Rising Water is Dijkstra where the "distance" is the maximum cell value on the path'
    ],

    interviewTips: [
      'Start by classifying the problem: "Edge weights are non-negative, so I will use Dijkstra\'s algorithm"',
      'Explain the greedy property: "Once a node is dequeued, its shortest distance is finalized"',
      'For problems with extra constraints, explain the state expansion: "I add the constraint to the state tuple"',
      'Mention Dijkstra\'s limitation: "It does not work with negative weights; I would use Bellman-Ford instead"',
      'Walk through a small example showing the priority queue evolution and distance updates'
    ],
  },

  // ─── 20. Knapsack DP ───────────────────────────────────────────
  {
    id: 'knapsack-dp',
    title: 'Knapsack DP',
    icon: 'grid',
    color: '#3b82f6',
    questions: 6,
    description: 'Solve optimization problems involving selecting items with constraints using 0/1 and unbounded knapsack patterns.',

    visualizations: [
      {
        title: '0/1 Knapsack DP Table',
        description: 'Items vs capacity grid; each cell stores maximum value achievable',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">0/1 Knapsack DP Table (Capacity=5)</text><g transform="translate(30,35)"><text x="0" y="12" font-family="sans-serif" font-size="10" fill="#64748b">Items: A(w=2,v=3), B(w=3,v=4), C(w=1,v=2)</text><text x="100" y="42" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748b">Capacity &rarr;</text><g transform="translate(60,48)"><text x="20" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">0</text><text x="55" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">1</text><text x="90" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">2</text><text x="125" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">3</text><text x="160" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">4</text><text x="195" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748b">5</text><text x="-18" y="35" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">none</text><rect x="3" y="20" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="20" y="36" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">0</text><rect x="38" y="20" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="36" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">0</text><rect x="73" y="20" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="90" y="36" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">0</text><rect x="108" y="20" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="125" y="36" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">0</text><rect x="143" y="20" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="160" y="36" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">0</text><rect x="178" y="20" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="195" y="36" text-anchor="middle" font-family="monospace" font-size="11" fill="#94a3b8">0</text><text x="-18" y="63" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">+A</text><rect x="3" y="48" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="20" y="64" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">0</text><rect x="38" y="48" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="64" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">0</text><rect x="73" y="48" width="34" height="24" rx="3" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/><text x="90" y="64" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#3b82f6">3</text><rect x="108" y="48" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="125" y="64" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">3</text><rect x="143" y="48" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="160" y="64" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">3</text><rect x="178" y="48" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="195" y="64" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">3</text><text x="-18" y="91" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">+B</text><rect x="3" y="76" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="20" y="92" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">0</text><rect x="38" y="76" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="92" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">0</text><rect x="73" y="76" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="90" y="92" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">3</text><rect x="108" y="76" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="125" y="92" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">4</text><rect x="143" y="76" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="160" y="92" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">4</text><rect x="178" y="76" width="34" height="24" rx="3" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><text x="195" y="92" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#b45309">7</text><text x="-18" y="119" text-anchor="end" font-family="sans-serif" font-size="10" fill="#64748b">+C</text><rect x="3" y="104" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="20" y="120" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">0</text><rect x="38" y="104" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="120" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">2</text><rect x="73" y="104" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="90" y="120" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">3</text><rect x="108" y="104" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="125" y="120" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">5</text><rect x="143" y="104" width="34" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="160" y="120" text-anchor="middle" font-family="monospace" font-size="11" fill="#1e293b">6</text><rect x="178" y="104" width="34" height="24" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="195" y="120" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">9</text></g></g><g transform="translate(330,80)"><rect x="0" y="0" width="145" height="78" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="10" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#10b981">Answer: 9</text><text x="10" y="32" font-family="sans-serif" font-size="9" fill="#64748b">Take A(w=2,v=3)</text><text x="10" y="44" font-family="sans-serif" font-size="9" fill="#64748b">Take B(w=3,v=4)</text><text x="10" y="56" font-family="sans-serif" font-size="9" fill="#64748b">Take C(w=1,v=2)</text><text x="10" y="72" font-family="monospace" font-size="9" fill="#10b981">Total: w=6? No, w=2+3+1=6&gt;5</text></g><g transform="translate(20,210)"><rect x="0" y="0" width="460" height="28" rx="5" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="15" y="18" font-family="monospace" font-size="10" fill="#64748b">dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])</text><text x="380" y="18" font-family="sans-serif" font-size="10" fill="#64748b">O(n * W)</text></g></svg>'
      }
    ],

    introduction: `The Knapsack pattern is one of the most important families of dynamic programming problems. In the classic formulation, you have items with weights and values, and a knapsack with limited capacity; the goal is to maximize value without exceeding the weight limit. The 0/1 variant means each item can be used at most once; the unbounded variant allows unlimited copies.

**Why This Matters:**
Knapsack DP appears in many disguises: partition problems (can you split an array into two equal-sum subsets?), coin change problems (minimum coins to make a target sum), target sum problems (how many ways to assign +/- signs to reach a target), and subset selection under constraints. Recognizing the knapsack structure is key to formulating the correct DP recurrence.

**Key Insight:** The 0/1 knapsack recurrence is dp[i][w] = max(dp[i-1][w], dp[i-1][w-weight[i]] + value[i]). The first term represents not taking item i; the second represents taking it. For the unbounded knapsack (Coin Change), the recurrence uses dp[i][w-weight[i]] instead of dp[i-1][w-weight[i]] because the same item can be reused. Space optimization reduces 2D DP to 1D by iterating capacity in the right order.`,

    whenToUse: [
      'Selecting items subject to a capacity/weight/sum constraint to maximize or minimize a value',
      'Partition problems: can you split a set into subsets with equal or target sums?',
      'Counting the number of ways to reach a target sum using given denominations',
      'Finding the minimum number of items to reach a target (Coin Change)',
      'Target sum problems with +/- sign assignment',
      'Any problem where you make include/exclude decisions for each item with a running constraint'
    ],

    keyPatterns: [
      '0/1 Knapsack: each item used at most once; iterate capacity from high to low for 1D optimization',
      'Unbounded Knapsack: items can be reused; iterate capacity from low to high',
      'Subset Sum / Partition: knapsack with value = weight, capacity = sum/2',
      'Coin Change (minimum coins): unbounded knapsack minimizing count',
      'Coin Change II (count ways): unbounded knapsack counting combinations',
      'Target Sum: transform to subset sum by algebraic manipulation'
    ],

    timeComplexity: 'O(n * W) where n is items and W is capacity',
    spaceComplexity: 'O(W) with 1D space optimization',

    approach: [
      'Identify the items and the capacity (sum, weight limit, target value)',
      'Determine if items are reusable (unbounded) or not (0/1)',
      'Define dp[w] = optimal value achievable with capacity w',
      'For 0/1: iterate items in outer loop, capacity from W to weight[i] (right to left) in inner loop',
      'For unbounded: iterate items in outer loop, capacity from weight[i] to W (left to right) in inner loop'
    ],

    commonProblems: [
      { name: 'Partition Equal Subset Sum', difficulty: 'Medium' },
      { name: 'Target Sum', difficulty: 'Medium' },
      { name: 'Last Stone Weight II', difficulty: 'Medium' },
      { name: 'Coin Change', difficulty: 'Medium' },
      { name: 'Coin Change II', difficulty: 'Medium' },
      { name: 'Perfect Squares', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Iterating capacity in the wrong direction for 0/1 knapsack (must go right to left to avoid reusing items)',
      'Confusing 0/1 knapsack with unbounded knapsack and using the wrong iteration order',
      'For Target Sum, not recognizing the transformation: P - N = target, P + N = sum, so P = (sum + target) / 2',
      'Not handling the case where (sum + target) is odd or negative in Target Sum (no valid partition exists)',
      'Initializing dp[0] incorrectly: should be 0 for optimization problems, 1 for counting problems'
    ],

    tips: [
      'Master the 1D space optimization: for 0/1, iterate capacity right to left; for unbounded, left to right',
      'Partition Equal Subset Sum is 0/1 knapsack with target = sum/2; if sum is odd, return false immediately',
      'Coin Change II counts combinations (item loop outside) vs permutations (capacity loop outside)',
      'Last Stone Weight II reduces to: minimize |S1 - S2| = minimize |sum - 2*S2|, which is a subset sum problem',
      'For Perfect Squares, the "items" are 1, 4, 9, 16, ... and it is an unbounded knapsack'
    ],

    interviewTips: [
      'Frame the problem as knapsack: "Items are ..., capacity is ..., value is ..., and each item is used once/unlimited"',
      'Explain the recurrence clearly: "dp[w] = max/min of (not taking item i, taking item i)"',
      'Mention the 1D space optimization proactively and explain the iteration direction',
      'For Target Sum, walk through the algebraic transformation step by step',
      'Compare with greedy: "Greedy does not work here because choosing the locally best item may not give the global optimum"'
    ],
  },

  // ─── 21. String DP ──────────────────────────────────────────────
  {
    id: 'string-dp',
    title: 'String DP',
    icon: 'grid',
    color: '#3b82f6',
    questions: 7,
    description: 'Solve subsequence, edit distance, and string matching problems with 2D dynamic programming on character pairs.',

    visualizations: [
      {
        title: 'Edit Distance DP Matrix',
        description: 'Converting "cat" to "car": each cell is min edits for substrings',
        svg: '<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" style="max-width:400px"><rect width="400" height="250" fill="white" rx="8"/><text x="200" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Edit Distance: "cat" &rarr; "car"</text><g transform="translate(60,40)"><text x="85" y="12" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748b">target &rarr;</text><text x="55" y="28" font-family="monospace" font-size="11" fill="#94a3b8">&epsilon;</text><text x="95" y="28" font-family="monospace" font-size="12" font-weight="bold" fill="#3b82f6">c</text><text x="135" y="28" font-family="monospace" font-size="12" font-weight="bold" fill="#3b82f6">a</text><text x="175" y="28" font-family="monospace" font-size="12" font-weight="bold" fill="#3b82f6">r</text><text x="-5" y="55" text-anchor="end" font-family="monospace" font-size="11" fill="#94a3b8">&epsilon;</text><text x="-5" y="95" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">c</text><text x="-5" y="135" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">a</text><text x="-5" y="175" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">t</text><text x="-30" y="115" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748b" transform="rotate(-90,-30,115)">source</text><rect x="37" y="36" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="55" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">0</text><rect x="77" y="36" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="95" y="55" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><rect x="117" y="36" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="135" y="55" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><rect x="157" y="36" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="175" y="55" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">3</text><rect x="37" y="76" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="95" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><rect x="77" y="76" width="36" height="28" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="95" y="95" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">0</text><rect x="117" y="76" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="135" y="95" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><rect x="157" y="76" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="175" y="95" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><rect x="37" y="116" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="135" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><rect x="77" y="116" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="95" y="135" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><rect x="117" y="116" width="36" height="28" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="135" y="135" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#10b981">0</text><rect x="157" y="116" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="175" y="135" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><rect x="37" y="156" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="55" y="175" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">3</text><rect x="77" y="156" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="95" y="175" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">2</text><rect x="117" y="156" width="36" height="28" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="135" y="175" text-anchor="middle" font-family="monospace" font-size="12" fill="#1e293b">1</text><rect x="157" y="156" width="36" height="28" rx="3" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="175" y="175" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#3b82f6">1</text></g><g transform="translate(20,205)"><rect x="0" y="0" width="360" height="34" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="14" font-family="sans-serif" font-size="10" font-weight="bold" fill="#10b981">Answer: 1 edit</text><text x="100" y="14" font-family="sans-serif" font-size="10" fill="#64748b">(replace \'t\' with \'r\')</text><text x="15" y="28" font-family="monospace" font-size="9" fill="#64748b">dp[i][j] = dp[i-1][j-1] if match, else 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])</text></g></svg>'
      }
    ],

    introduction: `String DP problems involve two strings (or one string compared with itself) and use a 2D DP table where dp[i][j] represents the answer for the first i characters of string A and first j characters of string B. Classic problems include Longest Common Subsequence, Edit Distance, and Longest Palindromic Subsequence.

**Why This Matters:**
String DP is one of the most common DP subcategories in interviews. Problems like Edit Distance and Longest Common Subsequence are asked frequently and have clean, well-known recurrences. Understanding the 2D table structure and how transitions work between adjacent cells is essential for handling the many variants that appear.

**Key Insight:** Most string DP problems share a common structure: at each cell (i, j), you consider what happens when characters match vs when they do not. For LCS, a match extends the diagonal; a mismatch takes the better of (left, top). For Edit Distance, a match extends the diagonal for free; a mismatch takes the best of (insert, delete, replace) which correspond to (left+1, top+1, diagonal+1). Once you see this pattern, many string DP problems become variations of the same template.`,

    whenToUse: [
      'Finding the longest common subsequence between two strings',
      'Computing the minimum edit distance (insertions, deletions, substitutions) between two strings',
      'Finding the longest palindromic subsequence in a string',
      'Counting the number of distinct subsequences of one string in another',
      'String matching with wildcards or regular expressions',
      'Word break and string segmentation problems'
    ],

    keyPatterns: [
      'LCS pattern: dp[i][j] = dp[i-1][j-1] + 1 if match, else max(dp[i-1][j], dp[i][j-1])',
      'Edit Distance pattern: dp[i][j] = dp[i-1][j-1] if match, else 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
      'Palindromic subsequence: LCS of the string with its reverse, or dp on substring endpoints',
      'Distinct subsequences: dp[i][j] = dp[i-1][j-1] + dp[i-1][j] if match, else dp[i-1][j]',
      'Word Break: dp[i] = true if any dp[j] is true and s[j:i] is in the dictionary',
      'Wildcard matching: dp[i][j] considers character match, \'?\' match, and \'*\' matching zero or more characters'
    ],

    timeComplexity: 'O(m * n) for two strings of length m and n',
    spaceComplexity: 'O(m * n), reducible to O(min(m, n)) with rolling array',

    approach: [
      'Define dp[i][j] clearly: what subproblem does it represent? (Usually: answer for first i chars of A and first j chars of B)',
      'Determine the base cases: dp[0][j] and dp[i][0] (empty string cases)',
      'Write the recurrence: consider the case when A[i] == B[j] (match) and when they differ (mismatch)',
      'Fill the table row by row (or column by column), since each cell depends on the cell above, to the left, and diagonally above-left',
      'The final answer is typically dp[m][n] (bottom-right corner of the table)'
    ],

    commonProblems: [
      { name: 'Longest Common Subsequence', difficulty: 'Medium' },
      { name: 'Edit Distance', difficulty: 'Medium' },
      { name: 'Longest Palindromic Subsequence', difficulty: 'Medium' },
      { name: 'Decode Ways', difficulty: 'Medium' },
      { name: 'Word Break', difficulty: 'Medium' },
      { name: 'Wildcard Matching', difficulty: 'Hard' },
      { name: 'Distinct Subsequences', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Off-by-one indexing: dp is (m+1) x (n+1) with 0-indexed representing empty prefix, but strings are 0-indexed',
      'Incorrect base case initialization: Edit Distance dp[i][0] = i and dp[0][j] = j, not all zeros',
      'For palindromic subsequence, comparing the string with its reverse for LCS but not handling even/odd length',
      'In Word Break, checking substrings with wrong boundaries or not memoizing correctly',
      'For Wildcard Matching, not handling the \'*\' character correctly (it can match zero characters or extend)'
    ],

    tips: [
      'Draw the 2D table for a small example and fill it by hand to build intuition before coding',
      'Space optimization: since each row only depends on the current and previous row, use two 1D arrays',
      'Longest Palindromic Subsequence = LCS(s, reverse(s))',
      'Decode Ways is a 1D string DP: dp[i] depends on dp[i-1] and dp[i-2] based on valid one-digit and two-digit decodings',
      'For Word Break, using a set for the dictionary and iterating word lengths can be more efficient than checking all substrings'
    ],

    interviewTips: [
      'Define dp[i][j] explicitly before writing any code: "dp[i][j] is the min edit distance between A[0..i-1] and B[0..j-1]"',
      'Walk through the recurrence with a specific example cell to show understanding',
      'Mention space optimization proactively: "I can reduce space from O(mn) to O(min(m,n)) using a rolling array"',
      'For Edit Distance, name the three operations at each mismatch: insert (left), delete (top), replace (diagonal)',
      'If asked to reconstruct the actual LCS or edit sequence, explain backtracking through the DP table'
    ],
  },

  // ─── 22. Grid DP ────────────────────────────────────────────────
  {
    id: 'grid-dp',
    title: 'Grid DP',
    icon: 'grid',
    color: '#3b82f6',
    questions: 7,
    description: 'Solve path counting, minimum cost, and optimization problems on 2D grids using dynamic programming.',

    visualizations: [
      {
        title: 'Grid DP: Unique Paths',
        description: 'Count paths from top-left to bottom-right moving only down or right',
        svg: '<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" style="max-width:400px"><rect width="400" height="250" fill="white" rx="8"/><text x="200" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Grid DP: Unique Paths (4x5)</text><g transform="translate(50,38)"><rect x="0" y="0" width="50" height="38" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="25" y="24" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="#10b981">1</text><text x="25" y="-4" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#10b981">start</text><rect x="56" y="0" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="81" y="24" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="112" y="0" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="137" y="24" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="168" y="0" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="193" y="24" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="224" y="0" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="249" y="24" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="0" y="44" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="68" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="56" y="44" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="81" y="68" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">2</text><rect x="112" y="44" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="137" y="68" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">3</text><rect x="168" y="44" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="193" y="68" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">4</text><rect x="224" y="44" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="249" y="68" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">5</text><rect x="0" y="88" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="112" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="56" y="88" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="81" y="112" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">3</text><rect x="112" y="88" width="50" height="38" rx="4" fill="#dbeafe" stroke="#3b82f6" stroke-width="1.5"/><text x="137" y="112" text-anchor="middle" font-family="monospace" font-size="13" fill="#3b82f6" font-weight="bold">6</text><rect x="168" y="88" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="193" y="112" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">10</text><rect x="224" y="88" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="249" y="112" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">15</text><rect x="0" y="132" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="25" y="156" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">1</text><rect x="56" y="132" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="81" y="156" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">4</text><rect x="112" y="132" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="137" y="156" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">10</text><rect x="168" y="132" width="50" height="38" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="193" y="156" text-anchor="middle" font-family="monospace" font-size="13" fill="#1e293b">20</text><rect x="224" y="132" width="50" height="38" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5"/><text x="249" y="156" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">35</text><text x="249" y="178" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#10b981">end</text></g><g transform="translate(20,215)"><rect x="0" y="0" width="360" height="28" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="18" font-family="monospace" font-size="10" fill="#64748b">dp[i][j] = dp[i-1][j] + dp[i][j-1]</text><text x="260" y="18" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">35 unique paths</text></g></svg>'
      }
    ],

    introduction: `Grid DP involves solving optimization or counting problems on a 2D grid where you move from one cell to adjacent cells (typically down and right). The DP state is usually dp[i][j] = the optimal value or count of paths to reach cell (i, j). This pattern naturally extends to problems with obstacles, varying costs, and more complex movement rules.

**Why This Matters:**
Grid DP problems are among the most common interview DP questions because they are visual and intuitive. Unique Paths, Minimum Path Sum, and Triangle are frequently asked and serve as excellent introductions to 2D DP. More advanced variants like Burst Balloons and Maximum Profit in Job Scheduling test deeper DP skills.

**Key Insight:** In a standard grid DP, cell (i, j) can only be reached from (i-1, j) or (i, j-1), giving the recurrence dp[i][j] = f(dp[i-1][j], dp[i][j-1]). The function f depends on the problem: addition for path counting, min for minimum cost, max for maximum value. The base case is typically the first row and first column, which can only be reached one way.`,

    whenToUse: [
      'Counting the number of paths from top-left to bottom-right of a grid',
      'Finding the minimum or maximum cost path through a grid',
      'Problems on triangular grids (Triangle problem)',
      'Grid problems with obstacles blocking certain cells',
      'Counting square submatrices with all ones',
      'Interval DP on grid-like structures (Burst Balloons)',
      'Any 2D optimization problem where movement is constrained to specific directions'
    ],

    keyPatterns: [
      'Path counting: dp[i][j] = dp[i-1][j] + dp[i][j-1], with obstacle cells set to 0',
      'Minimum path sum: dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])',
      'Triangle: dp[i][j] = triangle[i][j] + min(dp[i-1][j-1], dp[i-1][j])',
      'Count square submatrices: dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1 if cell is 1',
      'Interval DP: dp[i][j] = optimal value for the subproblem defined by interval [i, j]',
      'Longest increasing path: DFS with memoization on the grid (topological order by values)'
    ],

    timeComplexity: 'O(m * n) for grid of size m x n',
    spaceComplexity: 'O(m * n), reducible to O(n) with rolling array for standard cases',

    approach: [
      'Define dp[i][j]: what does it represent for cell (i, j)?',
      'Initialize the base cases: first row, first column, or boundary conditions',
      'Fill the table in order: typically top-to-bottom, left-to-right, so dependencies are satisfied',
      'Apply the recurrence at each cell, handling special cases (obstacles, boundaries)',
      'The answer is typically dp[m-1][n-1] or the aggregate over the last row/column'
    ],

    commonProblems: [
      { name: 'Unique Paths II', difficulty: 'Medium' },
      { name: 'Minimum Path Sum', difficulty: 'Medium' },
      { name: 'Triangle', difficulty: 'Medium' },
      { name: 'Count Square Submatrices with All Ones', difficulty: 'Medium' },
      { name: 'Burst Balloons', difficulty: 'Hard' },
      { name: 'Maximum Profit in Job Scheduling', difficulty: 'Hard' },
      { name: 'Longest Increasing Path in a Matrix', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Forgetting to handle obstacles: cells with obstacles should have dp value 0 (for counting) or infinity (for minimum)',
      'Incorrect boundary initialization: first row cells after an obstacle should also be 0 in path counting',
      'For Triangle, confusing top-down vs bottom-up direction (bottom-up is often cleaner)',
      'In Count Square Submatrices, not understanding why min(top, left, diagonal) + 1 works',
      'For Longest Increasing Path, not memoizing DFS results, leading to exponential time'
    ],

    tips: [
      'You can often modify the input grid in-place to use O(1) extra space (if allowed)',
      'For Triangle, bottom-up DP avoids boundary issues: dp[j] = triangle[i][j] + min(dp[j], dp[j+1])',
      'Count Square Submatrices: dp[i][j] counts the number of squares with (i,j) as the bottom-right corner',
      'Burst Balloons is interval DP: think of dp[i][j] as the max coins from bursting all balloons in range (i, j)',
      'Longest Increasing Path uses DFS + memoization because the natural ordering (by cell values) is the topological order'
    ],

    interviewTips: [
      'Start with the simplest variant (no obstacles, move right/down only) and add complexity as needed',
      'Draw the grid and fill in a few cells by hand to verify the recurrence',
      'Mention space optimization: "Since each row only depends on the previous row, I can use a 1D array"',
      'For interval DP (Burst Balloons), explain why you choose the last balloon to burst in a range rather than the first',
      'For Longest Increasing Path, explain why BFS/DFS with memoization works and what provides the topological ordering'
    ],
  },

  // ─── 23. Segment Tree & Advanced ────────────────────────────────
  {
    id: 'segment-tree',
    title: 'Segment Tree & Advanced',
    icon: 'puzzle',
    color: '#8b5cf6',
    questions: 4,
    description: 'Handle range queries with updates in O(log n) using segment trees, BITs, and advanced data structures.',

    visualizations: [
      {
        title: 'Segment Tree: Range Sum Query',
        description: 'Binary tree where each node stores aggregate for an array segment',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><defs><marker id="st-arrow" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><path d="M0,0 L7,2.5 L0,5" fill="#64748b"/></marker></defs><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Segment Tree: Range Sum Query</text><text x="250" y="38" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">Array: [2, 5, 1, 4, 3, 7]</text><g transform="translate(50,48)"><rect x="155" y="0" width="90" height="28" rx="5" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/><text x="200" y="14" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="#3b82f6">22</text><text x="200" y="24" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#3b82f6">[0..5]</text><line x1="175" y1="28" x2="110" y2="42" stroke="#64748b" stroke-width="1.2"/><line x1="225" y1="28" x2="290" y2="42" stroke="#64748b" stroke-width="1.2"/><rect x="68" y="42" width="80" height="26" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="108" y="54" text-anchor="middle" font-family="monospace" font-size="10" fill="#1e293b">8</text><text x="108" y="64" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#64748b">[0..2]</text><rect x="252" y="42" width="80" height="26" rx="4" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/><text x="292" y="54" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="#10b981">14</text><text x="292" y="64" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#10b981">[3..5]</text><line x1="88" y1="68" x2="48" y2="82" stroke="#64748b" stroke-width="1.2"/><line x1="128" y1="68" x2="160" y2="82" stroke="#64748b" stroke-width="1.2"/><line x1="272" y1="68" x2="240" y2="82" stroke="#64748b" stroke-width="1.2"/><line x1="312" y1="68" x2="345" y2="82" stroke="#64748b" stroke-width="1.2"/><rect x="18" y="82" width="56" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="46" y="94" text-anchor="middle" font-family="monospace" font-size="9" fill="#1e293b">7</text><text x="46" y="102" text-anchor="middle" font-family="sans-serif" font-size="7" fill="#64748b">[0..1]</text><rect x="130" y="82" width="56" height="24" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="158" y="94" text-anchor="middle" font-family="monospace" font-size="9" fill="#1e293b">1</text><text x="158" y="102" text-anchor="middle" font-family="sans-serif" font-size="7" fill="#64748b">[2..2]</text><rect x="212" y="82" width="56" height="24" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="240" y="94" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#10b981">7</text><text x="240" y="102" text-anchor="middle" font-family="sans-serif" font-size="7" fill="#10b981">[3..4]</text><rect x="316" y="82" width="56" height="24" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="344" y="94" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#10b981">7</text><text x="344" y="102" text-anchor="middle" font-family="sans-serif" font-size="7" fill="#10b981">[5..5]</text><line x1="32" y1="106" x2="12" y2="118" stroke="#64748b" stroke-width="1"/><line x1="60" y1="106" x2="72" y2="118" stroke="#64748b" stroke-width="1"/><line x1="226" y1="106" x2="212" y2="118" stroke="#64748b" stroke-width="1"/><line x1="254" y1="106" x2="268" y2="118" stroke="#64748b" stroke-width="1"/><rect x="0" y="118" width="28" height="20" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="14" y="132" text-anchor="middle" font-family="monospace" font-size="9" fill="#1e293b">2</text><rect x="60" y="118" width="28" height="20" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="74" y="132" text-anchor="middle" font-family="monospace" font-size="9" fill="#1e293b">5</text><rect x="128" y="118" width="28" height="20" rx="3" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="142" y="132" text-anchor="middle" font-family="monospace" font-size="9" fill="#1e293b">1</text><rect x="200" y="118" width="28" height="20" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="214" y="132" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#10b981">4</text><rect x="256" y="118" width="28" height="20" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="270" y="132" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#10b981">3</text><rect x="324" y="118" width="28" height="20" rx="3" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="338" y="132" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#10b981">7</text></g><g transform="translate(20,200)"><rect x="0" y="0" width="250" height="38" rx="5" fill="#ecfdf5" stroke="#10b981" stroke-width="1"/><text x="15" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#10b981">Query sum(3..5) = 14</text><text x="15" y="30" font-family="sans-serif" font-size="9" fill="#64748b">Visits only O(log n) = 3 nodes (green)</text><rect x="265" y="0" width="195" height="38" rx="5" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="280" y="16" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">Complexity:</text><text x="280" y="30" font-family="monospace" font-size="9" fill="#64748b">Build O(n) | Query O(log n) | Update O(log n)</text></g></svg>'
      }
    ],

    introduction: `Segment Trees are tree-based data structures that enable efficient range queries (sum, min, max over a range) and point or range updates on an array, both in O(log n) time. Each node stores the aggregate for a segment of the array, and queries combine results from O(log n) segments. Binary Indexed Trees (Fenwick Trees) are a simpler alternative for prefix-sum-based range queries with point updates.

**Why This Matters:**
Segment trees appear in hard interview and competitive programming problems where you need to handle dynamic range queries - operations on a mutable array where both queries and updates happen frequently. Problems like Range Sum Query Mutable, Count of Smaller Numbers After Self, and The Skyline Problem require these advanced data structures. While they are less common in typical interviews, knowing them signals strong algorithmic depth.

**Key Insight:** A segment tree recursively divides the array into halves, forming a balanced binary tree of height O(log n). Each node stores the aggregate for its range. A range query decomposes into at most O(log n) disjoint segments. A point update propagates up O(log n) ancestors. Lazy propagation extends this to range updates in O(log n) by deferring updates to children.`,

    whenToUse: [
      'Range sum/min/max queries with point updates on a mutable array',
      'Range updates with range queries (lazy propagation)',
      'Counting elements in ranges (merge sort tree or wavelet tree for offline)',
      'Interval scheduling and overlap counting',
      'Problems involving dynamic order statistics or inversions',
      'Any problem requiring O(log n) both queries and updates on array ranges'
    ],

    keyPatterns: [
      'Build: recursively split array, each node stores aggregate of its range',
      'Point update: update leaf, propagate changes up to the root',
      'Range query: recursively combine results from segments covering the query range',
      'Lazy propagation: defer range updates to children until needed',
      'Binary Indexed Tree (BIT/Fenwick): simpler O(log n) prefix sum with point update',
      'Coordinate compression: map large value ranges to [0, n) before building the tree'
    ],

    timeComplexity: 'O(n) build, O(log n) per query and update',
    spaceComplexity: 'O(n) for the tree (typically 4n array)',

    approach: [
      'Build the segment tree: allocate an array of size 4n; recursively build by splitting ranges in half',
      'For queries: if the current node\'s range is fully within the query range, return its value; otherwise, recurse into children and combine',
      'For point updates: recurse to the leaf, update it, then propagate the change up by recomputing parent nodes',
      'For range updates with lazy propagation: store pending updates at each node and push them down to children when needed',
      'For problems requiring order statistics, combine segment tree with coordinate compression or merge sort tree'
    ],

    commonProblems: [
      { name: 'Range Sum Query - Mutable', difficulty: 'Medium' },
      { name: 'Count of Smaller Numbers After Self', difficulty: 'Hard' },
      { name: 'The Skyline Problem', difficulty: 'Hard' },
      { name: 'Minimum Interval to Include Each Query', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Allocating insufficient space for the tree array (need 4n, not 2n)',
      'Incorrect range splitting: mid = (left + right) / 2, left child covers [left, mid], right child covers [mid+1, right]',
      'Forgetting to push lazy propagation values down before querying children',
      'For Count of Smaller Numbers After Self, not using coordinate compression when values are large',
      'Confusing 1-indexed and 0-indexed implementations of BIT/Fenwick Tree'
    ],

    tips: [
      'BIT (Fenwick Tree) is simpler to implement and sufficient for prefix sum queries with point updates',
      'For Count of Smaller Numbers After Self, process the array from right to left and use a BIT indexed by value',
      'The Skyline Problem can be solved with a sweep line + max-heap or segment tree, but the heap approach is simpler',
      'Coordinate compression is essential when values are up to 10^9 but there are only n distinct values',
      'For most interviews, knowing when a segment tree is needed matters more than implementing one from scratch'
    ],

    interviewTips: [
      'Mention segment trees when the problem requires both range queries and updates - this shows you know the right tool',
      'If asked to implement, start with the simpler BIT/Fenwick Tree if it suffices',
      'Explain the time complexity: "Build is O(n), and each query or update is O(log n)"',
      'For hard problems, describe the high-level approach using segment tree as a black box before diving into implementation',
      'Compare with prefix sums: "Prefix sums give O(1) query but O(n) update; segment tree gives O(log n) for both"'
    ],
  },

  // ─── 24. Cyclic Sort ──────────────────────────────────────────────
  {
    id: 'cyclic-sort',
    title: 'Cyclic Sort',
    icon: 'refreshCw',
    color: '#f59e0b',
    questions: 5,
    description: 'Index-based placement sort for finding missing or duplicate numbers in bounded ranges.',

    introduction: `Cyclic Sort is a specialized in-place sorting technique that works when the input consists of numbers in a known contiguous range, typically [1, n] or [0, n]. The core idea is deceptively simple: iterate through the array and place each number at its "correct" index (i.e., the value i should sit at index i-1). When a number is not at its correct position, you swap it there. After one pass of such placements, any index whose value does not match reveals a missing or duplicate number.

**Why This Matters:**
Many interview problems ask you to find missing numbers, duplicate numbers, or corrupt pairs in an array of integers in the range [1, n]. The brute-force approach uses a hash set for O(n) time and O(n) space. Sorting gives O(n log n) time. Cyclic Sort achieves O(n) time with O(1) space by leveraging the fact that each value has a predetermined "home" index.

**Key Insight:** Because the values are bounded within a known range that maps directly to array indices, you can treat the array itself as a hash table. Each swap places at least one element in its final position, so the total number of swaps across the entire pass is at most n, giving O(n) overall time despite the nested-looking while loop.`,

    whenToUse: [
      'Array contains numbers in a contiguous range [1, n] or [0, n]',
      'Finding one or more missing numbers in such a range',
      'Finding one or more duplicate numbers in such a range',
      'Finding the smallest missing positive integer',
      'Identifying corrupt pairs (one missing, one duplicated)',
      'Any problem where values naturally map to indices and you need O(1) extra space'
    ],

    keyPatterns: [
      'Place each number at index (value - 1): while nums[i] != i + 1, swap nums[i] with nums[nums[i] - 1]',
      'After placement pass, scan for mismatches: if nums[i] != i + 1, then i + 1 is missing',
      'Skip duplicates during placement: if nums[i] == nums[nums[i] - 1], skip to avoid infinite loop',
      'For 0-indexed ranges, place value i at index i instead of i-1',
      'For smallest missing positive, ignore values <= 0 or > n during the placement phase'
    ],

    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',

    approach: [
      'Start at index 0 and examine the current element',
      'If the element is not at its correct index, swap it to its correct position',
      'Continue swapping at the current index until the current element is correct or is a duplicate',
      'Move to the next index and repeat until you reach the end of the array',
      'Make a second pass: any index where the value does not match the expected value reveals a missing or duplicate number',
      'For smallest missing positive, first partition or ignore non-positive and out-of-range values, then apply cyclic sort on the rest'
    ],

    commonProblems: [
      { name: 'Find Missing Number', difficulty: 'Easy' },
      { name: 'Find All Missing Numbers', difficulty: 'Easy' },
      { name: 'Find Duplicate Number', difficulty: 'Medium' },
      { name: 'Find Corrupt Pair', difficulty: 'Medium' },
      { name: 'Smallest Missing Positive', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Causing an infinite loop by not checking if the target position already holds the correct value (duplicate detection)',
      'Off-by-one errors when mapping values to indices (value 1 goes to index 0, not index 1)',
      'Forgetting to handle values outside the valid range (negatives, zeros, or values > n)',
      'Using i++ unconditionally inside the loop instead of only advancing when the current position is settled'
    ],

    tips: [
      'The inner while loop looks O(n^2) but each swap places one element in its final position, so total swaps across all iterations is at most n',
      'For Find Duplicate Number, after cyclic sort the duplicate will be at the wrong index; alternatively use the Floyd cycle detection approach',
      'Smallest Missing Positive is the hardest variant; preprocess by ignoring non-positive values and values > n',
      'This pattern is a direct alternative to hash set approaches when O(1) space is required',
      'Practice distinguishing when to use cyclic sort vs. XOR-based missing number vs. math-based sum approaches'
    ],

    interviewTips: [
      'Explain the key invariant: "Each value i belongs at index i-1, and each swap fixes at least one element"',
      'Walk through a small example to show how swaps cascade and then stop',
      'Mention the O(n) time proof: total swaps across all iterations cannot exceed n',
      'Compare with hash set approach and explain why cyclic sort uses O(1) extra space'
    ],
  },

  // ─── 25. Island / Matrix Traversal ────────────────────────────────
  {
    id: 'island-matrix-traversal',
    title: 'Island / Matrix Traversal',
    icon: 'grid',
    color: '#10b981',
    questions: 6,
    description: 'Grid-based DFS/BFS for connected component discovery, flood fill, and boundary analysis.',

    visualizations: [
      {
        title: 'Island Traversal: BFS Flood Fill',
        description: 'Grid with land (green) and water (blue); BFS discovers connected island cells',
        svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="max-width:500px"><rect width="500" height="250" fill="white" rx="8"/><text x="250" y="22" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Island Traversal: Count Islands = 3</text><g transform="translate(30,38)"><text x="0" y="12" font-family="sans-serif" font-size="11" fill="#64748b">Grid (1=land, 0=water):</text><rect x="0" y="20" width="40" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="20" y="43" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#10b981">1</text><rect x="44" y="20" width="40" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="64" y="43" text-anchor="middle" font-family="monospace" font-size="14" fill="#10b981">1</text><rect x="88" y="20" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="108" y="43" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="132" y="20" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="152" y="43" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="176" y="20" width="40" height="36" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="196" y="43" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#b45309">1</text><rect x="0" y="60" width="40" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="20" y="83" text-anchor="middle" font-family="monospace" font-size="14" fill="#10b981">1</text><rect x="44" y="60" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="64" y="83" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="88" y="60" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="108" y="83" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="132" y="60" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="152" y="83" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="176" y="60" width="40" height="36" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><text x="196" y="83" text-anchor="middle" font-family="monospace" font-size="14" fill="#b45309">1</text><rect x="0" y="100" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="20" y="123" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="44" y="100" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="64" y="123" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text><rect x="88" y="100" width="40" height="36" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/><text x="108" y="123" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#ef4444">1</text><rect x="132" y="100" width="40" height="36" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="152" y="123" text-anchor="middle" font-family="monospace" font-size="14" fill="#ef4444">1</text><rect x="176" y="100" width="40" height="36" rx="4" fill="#dbeafe" stroke="#93c5fd" stroke-width="1.5"/><text x="196" y="123" text-anchor="middle" font-family="monospace" font-size="14" fill="#3b82f6">0</text></g><g transform="translate(260,48)"><rect x="0" y="0" width="210" height="135" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="105" y="18" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">3 Islands Found</text><rect x="15" y="28" width="14" height="14" rx="2" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="38" y="39" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">Island 1 (3 cells)</text><rect x="15" y="50" width="14" height="14" rx="2" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/><text x="38" y="61" font-family="sans-serif" font-size="10" fill="#b45309" font-weight="bold">Island 2 (2 cells)</text><rect x="15" y="72" width="14" height="14" rx="2" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="38" y="83" font-family="sans-serif" font-size="10" fill="#ef4444" font-weight="bold">Island 3 (2 cells)</text><text x="15" y="105" font-family="sans-serif" font-size="9" fill="#64748b">Algorithm: For each unvisited</text><text x="15" y="117" font-family="sans-serif" font-size="9" fill="#64748b">land cell, run BFS/DFS to mark</text><text x="15" y="129" font-family="sans-serif" font-size="9" fill="#64748b">all connected land as visited.</text></g><g transform="translate(20,200)"><rect x="0" y="0" width="460" height="38" rx="5" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="15" y="15" font-family="sans-serif" font-size="10" font-weight="bold" fill="#1e293b">4-directional BFS:</text><text x="130" y="15" font-family="sans-serif" font-size="10" fill="#64748b">Check up, down, left, right neighbors</text><text x="15" y="30" font-family="monospace" font-size="9" fill="#64748b">Time: O(rows * cols) | Space: O(rows * cols) for visited set</text></g></svg>'
      }
    ],

    introduction: `Island and Matrix Traversal problems represent a major category of graph problems where the graph is implicitly defined by a 2D grid. Each cell is a node, and edges connect adjacent cells (typically 4-directional: up, down, left, right). The fundamental operation is traversing connected components: starting from a cell, visit all reachable cells that satisfy some condition, marking them as visited along the way.

**Why This Matters:**
Grid traversal problems are among the most common medium-difficulty interview questions. They test your ability to translate a visual 2D problem into a graph traversal, handle boundaries correctly, and choose between DFS and BFS based on the problem requirements. The "Number of Islands" problem alone is one of the top 10 most asked questions at major tech companies.

**Key Insight:** Every grid traversal follows the same skeleton: iterate over all cells, and when you find an unvisited cell meeting the starting condition, launch a DFS or BFS to explore its entire connected component. The difference between problems lies in what counts as "connected," what you track during traversal (size, perimeter, boundary status), and whether you need shortest path (BFS) or just reachability (DFS or BFS).`,

    whenToUse: [
      'Counting connected components in a grid (number of islands)',
      'Finding the size or perimeter of connected regions',
      'Flood fill operations (changing colors of connected regions)',
      'Determining if regions are closed (fully surrounded by another value)',
      'Multi-source BFS problems (rotting oranges, nearest distance)',
      'Problems requiring simultaneous traversal from multiple starting points (Pacific Atlantic water flow)',
      'Any grid problem where adjacency defines connectivity'
    ],

    keyPatterns: [
      'DFS/BFS from each unvisited land cell; mark visited by modifying grid or using a visited set',
      'Four-directional movement using dx/dy arrays: directions = [[0,1],[0,-1],[1,0],[-1,0]]',
      'Boundary check: 0 <= newRow < rows && 0 <= newCol < cols',
      'Multi-source BFS: enqueue all starting cells first, then BFS level by level',
      'Track component properties during traversal: size, perimeter, boundary touching',
      'For closed islands, mark border-connected components first, then count remaining'
    ],

    timeComplexity: 'O(m * n) where m and n are grid dimensions',
    spaceComplexity: 'O(m * n) for visited set or recursion stack in worst case',

    approach: [
      'Parse the grid and identify what constitutes a "starting cell" for traversal (e.g., land cell with value 1)',
      'Create a visited tracking mechanism: either a separate boolean grid or modify the input grid in-place',
      'For each unvisited starting cell, launch DFS or BFS to explore the entire connected component',
      'During traversal, mark cells as visited and accumulate any required metrics (area, perimeter, etc.)',
      'After traversal completes, process the accumulated information (count components, find max area, etc.)',
      'For multi-source problems, initialize the BFS queue with all source cells before beginning level-order traversal'
    ],

    commonProblems: [
      { name: 'Number of Islands', difficulty: 'Medium' },
      { name: 'Biggest Island', difficulty: 'Medium' },
      { name: 'Flood Fill', difficulty: 'Easy' },
      { name: 'Closed Islands', difficulty: 'Medium' },
      { name: 'Number of Enclaves', difficulty: 'Medium' },
      { name: 'Pacific Atlantic Water Flow', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Forgetting to mark cells as visited before adding to the queue (BFS), causing duplicate processing and TLE',
      'Stack overflow with DFS on very large grids; consider iterative DFS or BFS for grids up to 10^3 x 10^3',
      'Off-by-one errors in boundary checks, especially with 0-indexed grids',
      'Not handling the case where the grid is empty or has no land/water cells',
      'For Pacific Atlantic, traversing from interior cells outward instead of from ocean borders inward (much less efficient)'
    ],

    tips: [
      'Modifying the grid in-place (e.g., setting visited land to "0") saves space but destroys input; ask the interviewer if this is acceptable',
      'Use BFS when you need shortest distance; use DFS when you only need reachability or component membership',
      'For "Closed Islands," first eliminate all border-connected components, then count remaining islands',
      'Multi-source BFS is the key to "Rotting Oranges" type problems: enqueue all rotten cells initially',
      'Pacific Atlantic Water Flow reverses the problem: start BFS from each ocean border and find cells reachable from both',
      'Union-Find is an alternative to DFS/BFS for counting components and can be more efficient for dynamic connectivity'
    ],

    interviewTips: [
      'Start by clarifying connectivity: 4-directional or 8-directional?',
      'Mention the time complexity is O(m*n) because each cell is visited at most once',
      'For BFS, emphasize that you mark visited when enqueuing, not when dequeuing',
      'Draw the grid and trace through a small example before coding'
    ],
  },

  // ─── 26. Palindromic Subsequence DP ───────────────────────────────
  {
    id: 'palindromic-subsequence-dp',
    title: 'Palindromic Subsequence DP',
    icon: 'repeat',
    color: '#8b5cf6',
    questions: 5,
    description: 'Dynamic programming techniques for palindromic substring and subsequence problems.',

    introduction: `Palindromic DP encompasses a family of dynamic programming problems centered on finding, counting, or transforming palindromes within strings. The two fundamental variants are palindromic substrings (contiguous characters) and palindromic subsequences (characters that maintain relative order but need not be contiguous). Both share a common DP structure where you build solutions for longer strings from solutions to shorter ones.

**Why This Matters:**
Palindrome problems are interview favorites because they elegantly demonstrate the power of dynamic programming. The Longest Palindromic Subsequence problem illustrates the gap between subsequences and substrings. The Minimum Deletions to Make Palindrome problem shows how LPS relates to edit distance. Palindromic Partitioning combines palindrome detection with interval DP, making it a challenging but instructive problem.

**Key Insight:** For subsequences, define dp[i][j] as the length of the longest palindromic subsequence in s[i..j]. If s[i] == s[j], the characters can bookend a palindrome: dp[i][j] = dp[i+1][j-1] + 2. Otherwise, dp[i][j] = max(dp[i+1][j], dp[i][j-1]). This recurrence covers all palindromic subsequence variants. For substrings, dp[i][j] is a boolean indicating whether s[i..j] is a palindrome: true if s[i] == s[j] and dp[i+1][j-1] is true.`,

    whenToUse: [
      'Finding the longest palindromic subsequence in a string',
      'Finding the longest palindromic substring',
      'Counting all palindromic substrings or subsequences',
      'Minimum deletions or insertions to make a string a palindrome',
      'Partitioning a string into the minimum number of palindromic parts',
      'Any string problem where symmetry around a center is the key constraint'
    ],

    keyPatterns: [
      'Subsequence DP: dp[i][j] = LPS length of s[i..j]; expand when s[i]==s[j], else max of excluding either end',
      'Substring DP: dp[i][j] = true if s[i]==s[j] and dp[i+1][j-1] is true (or j-i <= 2)',
      'Expand around center for substrings: for each center (and each gap), expand outward while characters match',
      'Minimum deletions to palindrome = n - LPS(s)',
      'Palindromic partitioning: dp[i] = min cuts for s[0..i]; precompute isPalin[i][j] boolean table'
    ],

    timeComplexity: 'O(n^2) for most variants',
    spaceComplexity: 'O(n^2) for the DP table, optimizable to O(n) for some variants',

    approach: [
      'Choose the right DP formulation: subsequence (LPS) vs substring vs partitioning',
      'For LPS: fill dp table for increasing lengths; base case dp[i][i] = 1 for all i',
      'For palindromic substrings: either use the dp[i][j] boolean table or expand-around-center approach',
      'For minimum deletions: compute LPS and subtract from string length',
      'For palindromic partitioning: precompute which substrings are palindromes, then use a 1D DP for minimum cuts',
      'Consider space optimization: many palindrome DPs only need the previous row/diagonal'
    ],

    commonProblems: [
      { name: 'Longest Palindromic Subsequence', difficulty: 'Medium' },
      { name: 'Longest Palindromic Substring', difficulty: 'Medium' },
      { name: 'Count Palindromic Substrings', difficulty: 'Medium' },
      { name: 'Minimum Deletions to Make Palindrome', difficulty: 'Medium' },
      { name: 'Palindromic Partitioning', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Confusing subsequence (non-contiguous) with substring (contiguous) and using the wrong recurrence',
      'Filling the DP table in the wrong order: for interval DP, iterate by increasing length, not by increasing i',
      'Off-by-one in base cases: single characters are palindromes (length 1), and adjacent equal characters form length-2 palindromes',
      'For palindromic partitioning, not precomputing the isPalindrome table, leading to O(n^3) instead of O(n^2)'
    ],

    tips: [
      'LPS of a string s equals LCS of s and reverse(s) -- this gives an alternative O(n^2) approach',
      'Manacher\'s algorithm finds all palindromic substrings in O(n) but is rarely expected in interviews; mention it as an optimization',
      'For counting palindromic substrings, expand-around-center is often simpler than the DP table approach',
      'Minimum insertions to make a palindrome equals minimum deletions, which equals n - LPS(s)',
      'Space optimization: the LPS DP only needs two rows at a time, reducing space from O(n^2) to O(n)'
    ],

    interviewTips: [
      'Clarify whether the problem asks for substrings or subsequences -- the approaches differ significantly',
      'For LPS, draw the DP table for a small example like "bbbab" and fill it in to verify the recurrence',
      'Mention the connection: "Minimum deletions to make a palindrome equals n minus the longest palindromic subsequence"',
      'For palindromic partitioning, explain the two-phase approach: precompute palindromes, then compute min cuts'
    ],
  },

  // ─── 27. Fibonacci DP ─────────────────────────────────────────────
  {
    id: 'fibonacci-dp',
    title: 'Fibonacci DP',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 5,
    description: 'Fibonacci-like recurrence patterns for counting ways, minimum cost, and optimization problems.',

    introduction: `Fibonacci DP refers to a broad class of dynamic programming problems where the recurrence relation has a Fibonacci-like structure: each state depends on a small, fixed number of previous states. The classic Fibonacci sequence (F(n) = F(n-1) + F(n-2)) is the simplest example, but this pattern extends to problems like counting the number of ways to climb stairs, computing minimum costs along a sequence, and deciding whether to include or skip elements.

**Why This Matters:**
Fibonacci-style DP problems are the gentlest introduction to dynamic programming and appear frequently in interviews at all levels. They build intuition for the DP thought process: identify the state, write the recurrence, determine base cases, and optimize space. Once you recognize the pattern, problems like Climbing Stairs, House Robber, and Jump Game become straightforward applications of the same template.

**Key Insight:** The defining characteristic is that each state depends on only a constant number of prior states (typically 1-3). This means the DP can always be space-optimized from O(n) to O(1) by keeping only the needed previous values in variables, similar to how you compute Fibonacci numbers with just two variables.`,

    whenToUse: [
      'Counting the number of ways to reach a target using fixed step sizes',
      'Computing minimum or maximum cost along a linear sequence of decisions',
      'Problems where at each step you choose from a small set of options that depend on recent history',
      'House Robber style problems: include or exclude the current element based on what you chose for neighbors',
      'Jump game variants where you decide how far to advance',
      'Any problem where dp[i] depends on dp[i-1], dp[i-2], ... dp[i-k] for small constant k'
    ],

    keyPatterns: [
      'Basic Fibonacci: dp[i] = dp[i-1] + dp[i-2] for counting paths/ways',
      'Include/exclude: dp[i] = max(dp[i-2] + val[i], dp[i-1]) for House Robber',
      'Multi-step: dp[i] = sum of dp[i-j] for j in allowed step sizes (Number Factors)',
      'Min cost: dp[i] = min(dp[i-1], dp[i-2]) + cost[i]',
      'Space optimization: replace the dp array with 2-3 rolling variables'
    ],

    timeComplexity: 'O(n) for standard variants, O(n * k) when there are k step sizes',
    spaceComplexity: 'O(1) after space optimization (O(n) before)',

    approach: [
      'Identify the state: typically dp[i] represents the answer for the first i elements or for reaching position i',
      'Write the recurrence: determine which previous states dp[i] depends on and how they combine',
      'Establish base cases: dp[0] and dp[1] (or sometimes dp[0], dp[1], dp[2]) based on the problem',
      'Implement bottom-up: fill the DP table from base cases forward',
      'Optimize space: since each state depends on only a few previous states, replace the array with rolling variables',
      'Verify with small examples: trace through n=0,1,2,3 to confirm the recurrence matches expected results'
    ],

    commonProblems: [
      { name: 'Climbing Stairs', difficulty: 'Easy' },
      { name: 'Number Factors', difficulty: 'Medium' },
      { name: 'Minimum Jumps to End', difficulty: 'Medium' },
      { name: 'House Thief / Robber', difficulty: 'Medium' },
      { name: 'Jump Game with Fee', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Forgetting base cases or getting them wrong (e.g., dp[0] = 1 vs dp[0] = 0 matters a lot for counting problems)',
      'Not recognizing that House Robber is Fibonacci DP with an include/exclude structure',
      'Using O(n) space when O(1) suffices -- interviewers expect the optimization for this pattern',
      'Confusing "number of ways" (addition) with "minimum cost" (min operation) in the recurrence'
    ],

    tips: [
      'Always start by solving the problem with a full dp array, then optimize to O(1) space',
      'Climbing Stairs with step sizes {1, 2} is literally Fibonacci; with {1, 2, 3} it is Tribonacci',
      'House Robber on a circular array: run the linear algorithm twice, once excluding the first house and once excluding the last',
      'For problems with large n (10^9+), consider matrix exponentiation to compute the n-th Fibonacci-like value in O(log n)',
      'Map the problem to the pattern: "what is my state, and what are the transitions?" Once mapped, implementation is mechanical'
    ],

    interviewTips: [
      'Start with the brute-force recursive solution, then show how memoization leads to DP',
      'Explicitly mention the space optimization: "Since dp[i] only depends on dp[i-1] and dp[i-2], I can use two variables"',
      'For House Robber, explain the include/exclude decision clearly: "If I rob house i, I add its value to dp[i-2]; if I skip it, I take dp[i-1]"',
      'Mention that this is the foundational DP pattern and that more advanced DP builds on the same principles'
    ],
  },

  // ─── 28. Ordered Set ──────────────────────────────────────────────
  {
    id: 'ordered-set',
    title: 'Ordered Set',
    icon: 'list',
    color: '#8b5cf6',
    questions: 4,
    description: 'TreeSet / SortedList patterns for maintaining dynamic sorted order with efficient lookups.',

    introduction: `An Ordered Set (also called a TreeSet in Java or SortedList in Python's sortedcontainers) is a data structure that maintains elements in sorted order while supporting efficient insertion, deletion, and lookup operations -- all in O(log n) time. It also supports order-based queries like finding the predecessor/successor of a value, range queries, and rank queries that are impossible with hash sets.

**Why This Matters:**
A category of interview problems requires maintaining a dynamically changing collection where you need sorted-order access. Problems like "132 Pattern" need to efficiently find the largest element smaller than a threshold. Calendar scheduling problems need to quickly determine if a new interval overlaps any existing interval. Sliding window problems with sorted-order constraints need fast insertion and removal as the window moves.

**Key Insight:** The ordered set sits between the hash set (O(1) access but no order) and a sorted array (sorted order but O(n) insertion/deletion). When a problem needs both dynamic updates and sorted-order queries, the ordered set provides the balanced O(log n) trade-off. In languages without a built-in sorted set with rank queries (like Python), the sortedcontainers library or a balanced BST serves this role.`,

    whenToUse: [
      'Need to maintain a dynamic collection in sorted order',
      'Finding predecessor/successor (floor/ceiling) of a value efficiently',
      'Sliding window problems requiring sorted access within the window',
      'Interval scheduling and overlap detection',
      'Problems requiring rank queries (how many elements are smaller than X)',
      'Any scenario needing both fast insertion/deletion and ordered iteration'
    ],

    keyPatterns: [
      'TreeSet/SortedList: insert, delete, floor, ceiling all in O(log n)',
      'Sliding window + ordered set: maintain sorted elements in current window, remove expired elements',
      '132 Pattern: iterate right-to-left, maintaining an ordered set of suffix elements',
      'Calendar overlap: use ordered set of intervals, check predecessor/successor on insert',
      'Rank queries: how many elements are less than a given value in O(log n)'
    ],

    timeComplexity: 'O(log n) per insert, delete, and query',
    spaceComplexity: 'O(n) for storing the elements',

    approach: [
      'Identify that the problem needs both dynamic updates (add/remove) and sorted-order queries',
      'Choose the right data structure: TreeSet (Java), SortedList (Python sortedcontainers), or std::set (C++)',
      'For sliding window problems, add new elements as the window expands and remove old elements as it shrinks',
      'Use floor/ceiling operations to find the nearest elements above or below a threshold',
      'For interval problems, store intervals sorted by start time and check for overlaps using predecessor/successor',
      'Consider whether a simpler approach (like sorting + binary search on a static collection) suffices before reaching for an ordered set'
    ],

    commonProblems: [
      { name: '132 Pattern', difficulty: 'Medium' },
      { name: 'My Calendar I', difficulty: 'Medium' },
      { name: 'Longest Continuous Subarray', difficulty: 'Medium' },
      { name: 'Merge Similar Items', difficulty: 'Easy' },
    ],

    commonMistakes: [
      'Using a hash set when sorted order is needed, then sorting repeatedly (O(n log n) per operation instead of O(log n))',
      'Forgetting that Python does not have a built-in TreeSet; you need sortedcontainers.SortedList or bisect with a list',
      'Not handling duplicate values correctly: TreeSet does not allow duplicates; use a TreeMap with counts or a multiset',
      'For sliding window, forgetting to remove elements that have left the window before performing queries'
    ],

    tips: [
      'In Python, use "from sortedcontainers import SortedList" for a production-quality ordered set with O(log n) operations',
      'Java TreeSet provides floor(), ceiling(), higher(), lower() methods for predecessor/successor queries',
      'C++ std::set with lower_bound/upper_bound iterators is the fastest option in competitive programming',
      'For the 132 Pattern, a monotonic stack approach is actually O(n) and preferred, but ordered set gives a clean O(n log n) solution',
      'When you need ordered set with rank queries, Java TreeMap or Python SortedList.bisect_left gives the rank'
    ],

    interviewTips: [
      'Explain why a hash set is insufficient: "I need to find the nearest value above/below X, which requires sorted order"',
      'Mention the time complexity trade-off: "Ordered set gives O(log n) for all operations instead of O(n) for insertion into a sorted array"',
      'For Python interviews, mention sortedcontainers upfront and confirm the interviewer is okay with it',
      'If the interviewer disallows external libraries, explain how you would use bisect.insort (O(n) insertion but O(log n) search)'
    ],
  },

  // ─── 29. Multi-Threaded Coding ────────────────────────────────────
  {
    id: 'multi-threaded-coding',
    title: 'Multi-Threaded Coding',
    icon: 'cpu',
    color: '#8b5cf6',
    questions: 5,
    description: 'Concurrency interview problems involving synchronization, ordering, and thread safety.',

    introduction: `Multi-threaded coding problems test your understanding of concurrent programming primitives: mutexes, semaphores, condition variables, and barriers. Unlike typical algorithmic problems, these require you to coordinate multiple threads of execution that run simultaneously and may interleave unpredictably. The challenge is ensuring correctness (no deadlocks, no race conditions, correct ordering) while maximizing parallelism.

**Why This Matters:**
Concurrency questions are increasingly common at top tech companies, especially for senior and systems-focused roles. Problems like "Print FizzBuzz" and "Print in Order" test whether you truly understand synchronization mechanisms beyond just using them in frameworks. "Dining Philosophers" is a classic deadlock-avoidance problem that tests your knowledge of resource ordering. "Web Crawler Multithreaded" tests practical producer-consumer design.

**Key Insight:** Most concurrency interview problems reduce to one of a few coordination patterns: (1) ordering -- ensuring events happen in a specific sequence across threads, (2) mutual exclusion -- ensuring only one thread accesses a shared resource at a time, (3) producer-consumer -- safely passing data between threads, or (4) resource allocation -- preventing deadlock when multiple threads need multiple resources. Identify which pattern applies, then choose the simplest synchronization primitive that solves it.`,

    whenToUse: [
      'Problems explicitly requiring multiple threads to cooperate on a task',
      'Enforcing a specific execution order across concurrent threads',
      'Implementing producer-consumer or bounded buffer patterns',
      'Avoiding deadlock when multiple resources must be acquired',
      'Rate limiting or controlling the degree of parallelism',
      'Building thread-safe data structures (concurrent queues, caches, etc.)'
    ],

    keyPatterns: [
      'Semaphore for ordering: initialize to 0 for "wait" state, release to signal another thread to proceed',
      'Mutex + condition variable for complex conditions: wait until a predicate is true, signal when it changes',
      'Barrier for synchronization points: all threads wait until everyone reaches the barrier',
      'Resource ordering to prevent deadlock: always acquire locks in the same global order',
      'Producer-consumer with bounded queue: use semaphores for "full" and "empty" slots plus a mutex for the queue'
    ],

    timeComplexity: 'Problem-dependent; focus is on correctness, not asymptotic complexity',
    spaceComplexity: 'O(number of synchronization primitives + shared data)',

    approach: [
      'Identify the coordination pattern: ordering, mutual exclusion, producer-consumer, or resource allocation',
      'Choose the simplest synchronization primitive that solves the problem (semaphore > condition variable > busy waiting)',
      'Design the shared state and determine which variables need protection',
      'Implement the solution with clear acquire/release pairs for all locks',
      'Verify absence of deadlock: ensure consistent lock ordering and no circular wait conditions',
      'Test with edge cases: what happens if threads arrive in different orders? What if one thread is much faster?'
    ],

    commonProblems: [
      { name: 'Print FizzBuzz', difficulty: 'Medium' },
      { name: 'Print in Order', difficulty: 'Easy' },
      { name: 'Building H2O', difficulty: 'Medium' },
      { name: 'Dining Philosophers', difficulty: 'Medium' },
      { name: 'Web Crawler Multithreaded', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Busy-waiting (spin locks) instead of using proper blocking synchronization primitives',
      'Deadlock from inconsistent lock ordering: thread A locks resource 1 then 2, thread B locks resource 2 then 1',
      'Race conditions from forgetting to protect shared state with a mutex',
      'Not handling spurious wakeups when using condition variables (always use while loops, not if statements)',
      'Over-synchronizing: using a single global lock eliminates parallelism and defeats the purpose'
    ],

    tips: [
      'For ordering problems (Print in Order), use n-1 semaphores initialized to 0; each thread releases the next semaphore after completing its work',
      'For Building H2O, use semaphores: hydrogen semaphore with capacity 2, oxygen semaphore with capacity 1, plus a barrier of size 3',
      'For Dining Philosophers, the simplest deadlock prevention is resource ordering: always pick up the lower-numbered fork first',
      'In Python, use threading.Semaphore, threading.Lock, threading.Condition, and threading.Barrier',
      'For Web Crawler, use a thread-safe queue (collections.deque with a lock, or queue.Queue) and a visited set protected by a lock'
    ],

    interviewTips: [
      'Start by explaining the coordination pattern before writing code: "This is an ordering problem, so I will use semaphores"',
      'Explicitly state your deadlock prevention strategy',
      'Mention that you use while (not if) with condition variables to handle spurious wakeups',
      'For Dining Philosophers, discuss multiple solutions: resource ordering, arbitrator, or Chandy-Misra'
    ],
  },

  // ─── 30. Custom Data Structures ───────────────────────────────────
  {
    id: 'custom-data-structures',
    title: 'Custom Data Structures',
    icon: 'box',
    color: '#8b5cf6',
    questions: 6,
    description: 'Designing specialized data structures with specific time complexity guarantees.',

    introduction: `Custom Data Structure problems ask you to design a class that supports a specific set of operations, each with a required time complexity. These problems test your knowledge of how standard data structures (hash maps, doubly linked lists, heaps, stacks) can be combined to achieve guarantees that no single structure provides alone. For example, an LRU Cache needs O(1) get and put, which requires combining a hash map (for O(1) key lookup) with a doubly linked list (for O(1) eviction of the least recently used item).

**Why This Matters:**
Design-a-data-structure problems are extremely popular in interviews at FAANG companies. LRU Cache is arguably the single most-asked design question. These problems test a deeper understanding than just using built-in data structures: you must understand the internal mechanics well enough to compose them into something new. They also test your ability to handle edge cases, maintain invariants across operations, and write clean object-oriented code under pressure.

**Key Insight:** The secret to these problems is identifying which primitive operations each method requires and choosing a combination of data structures that covers all of them. O(1) random access means hash map. O(1) insertion/deletion at known positions means doubly linked list. O(1) min/max means maintaining an auxiliary stack or heap. O(1) random selection means array-based storage. The art is combining these without breaking any of the time guarantees.`,

    whenToUse: [
      'The problem asks you to design a class with specific method signatures and time complexities',
      'You need O(1) for multiple operations that no single data structure supports alone',
      'Cache design: LRU, LFU, or TTL-based eviction policies',
      'Stack/queue variants with O(1) min/max operations',
      'Problems requiring O(1) insert, delete, and getRandom',
      'Any scenario where you must compose multiple data structures to meet time complexity constraints'
    ],

    keyPatterns: [
      'Hash map + doubly linked list: O(1) key lookup plus O(1) ordered insertion/deletion (LRU Cache)',
      'Hash map + min-heap + doubly linked list: O(1) get, O(log n) or O(1) put with frequency tracking (LFU Cache)',
      'Stack + auxiliary min-stack: push min alongside each element for O(1) getMin',
      'Hash map + array + swap-to-end: O(1) insert, delete, and getRandom',
      'Two stacks to implement a queue, or two queues to implement a stack',
      'Bucket sort structure: group items by frequency/count in linked buckets for O(1) access to extremes'
    ],

    timeComplexity: 'Varies by problem; the goal is O(1) for all required operations',
    spaceComplexity: 'O(n) where n is the number of stored elements',

    approach: [
      'List all required operations and their target time complexities from the problem statement',
      'For each operation, identify which primitive data structure operation it maps to',
      'Find a combination of data structures where each operation can be performed in the target time',
      'Design the internal state: what does each data structure store, and how are they linked?',
      'Implement each method, carefully maintaining invariants across all data structures',
      'Handle edge cases: empty structure, duplicate keys, capacity limits, eviction policies'
    ],

    commonProblems: [
      { name: 'LRU Cache', difficulty: 'Medium' },
      { name: 'LFU Cache', difficulty: 'Hard' },
      { name: 'Min Stack', difficulty: 'Medium' },
      { name: 'Max Stack', difficulty: 'Hard' },
      { name: 'All O(1) Data Structure', difficulty: 'Hard' },
      { name: 'Insert Delete GetRandom O(1)', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Not maintaining consistency between the hash map and linked list after insertions/deletions in LRU Cache',
      'Forgetting to handle the edge case of updating an existing key in put() for LRU Cache',
      'For Insert Delete GetRandom, using a list with linear delete instead of swap-to-end for O(1) delete',
      'For Min Stack, popping from the min stack when the main stack value does not match the min stack top',
      'Not using sentinel/dummy head and tail nodes in the doubly linked list, leading to verbose null checks'
    ],

    tips: [
      'For LRU Cache, use dummy head and tail sentinel nodes in the doubly linked list to simplify edge cases dramatically',
      'In Python, collections.OrderedDict implements LRU Cache in one line with move_to_end and popitem, but interviewers usually want the manual implementation',
      'For Insert Delete GetRandom O(1), the key trick is swapping the element to delete with the last element in the array, then popping the end',
      'For LFU Cache, maintain a hash map from frequency to a doubly linked list of nodes at that frequency; track the current minimum frequency',
      'All O(1) Data Structure uses a doubly linked list of frequency buckets, each containing a set of keys at that frequency',
      'Always draw the internal state diagram before coding: show the hash map, linked list nodes, and their connections'
    ],

    interviewTips: [
      'Start by listing the operations and their time requirements, then propose the combination of data structures',
      'Draw the internal state for a small example before writing code',
      'For LRU Cache, explain: "HashMap gives O(1) lookup, doubly linked list gives O(1) move-to-front and evict-from-back"',
      'Mention sentinel nodes proactively: "I use dummy head and tail to avoid null-check edge cases"',
      'Implement the doubly linked list helper methods (addToFront, removeNode, moveToFront) as separate methods for clarity'
    ],
  },

  // ─── 31. Knowing What to Track ────────────────────────────────────
  {
    id: 'knowing-what-to-track',
    title: 'Knowing What to Track',
    icon: 'search',
    color: '#f59e0b',
    questions: 5,
    description: 'Frequency counting and state tracking with hash maps to solve pattern-matching and constraint problems.',

    introduction: `"Knowing What to Track" is a meta-pattern that appears across many problems involving frequency counting, character matching, and constraint validation. The core technique is maintaining a hash map (or array for fixed alphabets) that tracks the frequency or state of relevant elements as you process the input. The insight is recognizing what information you need to track and how to update it efficiently as your window or pointer moves.

**Why This Matters:**
A large class of string and array problems -- including anagram detection, permutation checking, minimum window substring, and valid sudoku -- all reduce to the same fundamental operation: maintaining and comparing frequency maps. These problems appear constantly in interviews and are often solved with the sliding window pattern, but the key differentiator is knowing exactly what state to track and how to compare it efficiently.

**Key Insight:** Instead of rebuilding the frequency map from scratch each time your window or search position changes, maintain it incrementally: add the new element entering your scope and remove the element leaving it. To compare two frequency maps efficiently, maintain a counter of "matched" categories that updates in O(1) with each addition or removal. This avoids the O(26) or O(k) comparison that would otherwise dominate the inner loop.`,

    whenToUse: [
      'Finding all anagrams of a pattern in a string',
      'Checking if one string is a permutation of another',
      'Finding the minimum window containing all characters of a target',
      'Grouping strings by shared character frequencies (group anagrams)',
      'Validating constraints that depend on element frequencies (valid sudoku)',
      'Any problem where the answer depends on counting or tracking element occurrences'
    ],

    keyPatterns: [
      'Frequency map: count occurrences of each element using a hash map or fixed-size array',
      'Matched count: track how many distinct characters have met their required frequency, avoiding full map comparison',
      'Sliding window + frequency map: add right element, remove left element, check match condition',
      'Canonical form: sort characters or use frequency tuple as a hash key for grouping anagrams',
      'Multi-dimensional tracking: for sudoku, maintain three maps (row, column, box) simultaneously'
    ],

    timeComplexity: 'O(n) for sliding window variants, O(n * k) for grouping where k is element length',
    spaceComplexity: 'O(k) where k is the alphabet/key size',

    approach: [
      'Build a frequency map of the target pattern or required elements',
      'Initialize a sliding window (or traversal) with its own frequency map',
      'As you expand the window, increment the count for the new element and check if it now matches the required count',
      'As you shrink the window, decrement the count and check if it drops below the required count',
      'Maintain a "matched" counter that equals the number of distinct elements meeting their requirement; when matched equals the total required, you have a valid window',
      'Record the result (position, length, validity) and continue'
    ],

    commonProblems: [
      { name: 'Find All Anagrams', difficulty: 'Medium' },
      { name: 'Permutation in String', difficulty: 'Medium' },
      { name: 'Minimum Window Substring', difficulty: 'Hard' },
      { name: 'Group Anagrams Extended', difficulty: 'Medium' },
      { name: 'Valid Sudoku', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Comparing entire frequency maps at every step instead of maintaining an incremental matched count',
      'Off-by-one in the sliding window: the window size for anagrams should be exactly len(pattern)',
      'Not handling characters in the text that do not appear in the pattern (they should be ignored or handled carefully)',
      'For Minimum Window Substring, shrinking the window too aggressively and missing valid results'
    ],

    tips: [
      'For fixed alphabets (lowercase English letters), use an array of size 26 instead of a hash map for faster access',
      'The "matched count" trick is crucial: instead of comparing two maps (O(26)), track how many characters have the exact required count (O(1) per update)',
      'Group Anagrams: use sorted string or frequency tuple as the hash key; sorted string is simpler, frequency tuple avoids O(k log k) sorting',
      'For Valid Sudoku, the box index for cell (r, c) is (r // 3) * 3 + c // 3',
      'Minimum Window Substring combines tracking with a two-pointer approach: expand right to find a valid window, then shrink left to minimize it'
    ],

    interviewTips: [
      'Explain the matched count optimization: "Instead of comparing maps each step, I track how many characters meet their requirement"',
      'For anagram problems, mention that the window size is fixed at len(pattern), making it a fixed-size sliding window',
      'Walk through one window slide step-by-step: "I add the new character, check if it matches, remove the old character, check if it unmatches"',
      'For Minimum Window, explain the two-phase approach: "Expand right until valid, then shrink left until invalid, recording the best valid window"'
    ],
  },

  // ─── 32. Matrix as Graph ──────────────────────────────────────────
  {
    id: 'matrix-graphs',
    title: 'Matrix as Graph',
    icon: 'gitBranch',
    color: '#10b981',
    questions: 5,
    description: 'Treating matrices as implicit graphs for shortest path, multi-source BFS, and distance problems.',

    introduction: `Matrix-as-Graph problems go beyond simple connected component discovery (covered in Island Traversal) to focus on shortest paths, minimum distances, and level-order propagation in grids. The key distinction is that these problems typically require BFS because they involve finding the minimum number of steps, the shortest path to an exit, or propagating a "wavefront" from multiple sources simultaneously.

**Why This Matters:**
While Island Traversal problems only need reachability (DFS or BFS both work), Matrix-as-Graph problems specifically require BFS for correctness because BFS naturally finds shortest paths in unweighted graphs. Multi-source BFS, where you start from multiple cells simultaneously, is a particularly powerful technique that appears in problems like "01 Matrix" (nearest 0 for each cell) and "Rotting Oranges" (minimum time to rot all oranges).

**Key Insight:** In an unweighted grid graph, BFS from a single source finds shortest paths from that source. Multi-source BFS (initializing the queue with all source cells at distance 0) finds shortest distances from the nearest source for every cell. This runs in O(m*n) -- the same as single-source BFS -- because each cell is still processed exactly once. For weighted grids, you need Dijkstra's algorithm with a priority queue instead of a regular queue.`,

    whenToUse: [
      'Finding the shortest path from a source to a destination in a grid',
      'Computing the minimum distance from every cell to the nearest special cell (multi-source BFS)',
      'Level-order propagation: spreading a condition one step at a time (rotting oranges, fire spreading)',
      'Finding the nearest exit from a given starting position',
      'Building bridges between components with minimum cost',
      'Any grid problem where the answer involves minimum steps or distances'
    ],

    keyPatterns: [
      'Single-source BFS: start from one cell, explore level by level to find shortest path to target',
      'Multi-source BFS: enqueue all source cells at distance 0, then BFS; each cell gets distance to nearest source',
      'Shortest Bridge: BFS from one island to find minimum distance to the other island',
      '0-1 BFS: use a deque, add 0-weight edges to front and 1-weight edges to back for shortest path in 0/1 weighted grid',
      'Level tracking: process all cells at current distance before moving to the next distance',
      'Visited at enqueue time: mark cells when adding to queue, not when dequeuing, to avoid duplicate processing'
    ],

    timeComplexity: 'O(m * n) for BFS on a grid',
    spaceComplexity: 'O(m * n) for the queue and visited/distance arrays',

    approach: [
      'Determine whether the problem needs single-source or multi-source BFS',
      'For multi-source BFS, identify all source cells and enqueue them all with distance 0',
      'Process the BFS queue level by level, incrementing the distance at each level boundary',
      'For each dequeued cell, examine its four (or eight) neighbors; if unvisited and valid, mark as visited, record distance, and enqueue',
      'For Shortest Bridge, first use DFS to find and mark one island, then BFS from all its border cells to reach the other island',
      'Return the answer: shortest path length, distance matrix, or number of levels until the queue empties'
    ],

    commonProblems: [
      { name: 'Shortest Bridge', difficulty: 'Medium' },
      { name: '01 Matrix', difficulty: 'Medium' },
      { name: 'Shortest Path in Binary Matrix', difficulty: 'Medium' },
      { name: 'Nearest Exit', difficulty: 'Medium' },
      { name: 'Rotting Oranges', difficulty: 'Medium' },
    ],

    commonMistakes: [
      'Using DFS instead of BFS for shortest path problems, which does not guarantee minimum distance',
      'Marking cells as visited when dequeuing instead of when enqueuing, causing cells to be added to the queue multiple times',
      'For 01 Matrix, starting BFS from each 1-cell individually (O(m^2 * n^2)) instead of multi-source BFS from all 0-cells (O(m*n))',
      'Forgetting to handle the case where the start cell itself is an exit or target',
      'Not counting levels correctly: off-by-one between number of BFS levels and actual distance'
    ],

    tips: [
      'Multi-source BFS is the same as single-source BFS but with multiple starting cells in the initial queue',
      'For 01 Matrix, reverse the perspective: BFS from all 0-cells outward to fill in distances for 1-cells',
      'Shortest Bridge: DFS to find one island, then BFS from its perimeter to the other island; the BFS depth is the answer',
      'For Shortest Path in Binary Matrix, allow 8-directional movement and check that both start and end cells are 0',
      'Rotting Oranges: multi-source BFS from all initially rotten oranges; the answer is the number of BFS levels minus 1 (or -1 if fresh oranges remain)'
    ],

    interviewTips: [
      'Explain why BFS gives shortest paths: "BFS explores all cells at distance d before any cell at distance d+1"',
      'For multi-source BFS, explain it as: "Imagine all source cells start simultaneously and expand outward in lockstep"',
      'Draw the BFS wavefront expanding level by level to make the approach intuitive',
      'Mention the time complexity: "Each cell is visited exactly once, so it is O(m * n)"'
    ],
  },

  // ─── 33. Shortest Path Algorithms ─────────────────────────────────
  {
    id: 'shortest-path-algorithms',
    title: 'Shortest Path Algorithms',
    icon: 'navigation',
    color: '#10b981',
    questions: 4,
    description: 'Dijkstra, Bellman-Ford, and Floyd-Warshall for weighted graph shortest path problems.',

    introduction: `Shortest Path Algorithms solve the fundamental problem of finding minimum-cost paths in weighted graphs. The three classic algorithms each address different scenarios: Dijkstra's algorithm handles single-source shortest paths in graphs with non-negative edge weights (O((V+E) log V) with a priority queue). Bellman-Ford handles single-source shortest paths even with negative weights and can detect negative cycles (O(V*E)). Floyd-Warshall computes all-pairs shortest paths (O(V^3)).

**Why This Matters:**
Weighted graph shortest path problems are a staple of technical interviews, especially at senior levels. "Network Delay Time" directly tests Dijkstra's algorithm. "Cheapest Flights Within K Stops" adds a constraint that requires modified Bellman-Ford or BFS. "Path with Maximum Probability" twists the standard problem by maximizing a product instead of minimizing a sum. Understanding which algorithm applies to which scenario is as important as knowing the implementations.

**Key Insight:** The choice of algorithm depends on the graph properties and the question being asked. Non-negative weights and single source? Use Dijkstra. Negative weights or bounded relaxation steps? Use Bellman-Ford. All-pairs shortest paths? Use Floyd-Warshall. Many interview problems disguise themselves as generic graph problems but reduce to one of these three once you identify the weight structure and query type.`,

    whenToUse: [
      'Finding the shortest (minimum cost) path from a source to all other nodes in a weighted graph',
      'Graphs with non-negative edge weights (Dijkstra)',
      'Graphs with negative edge weights or requiring negative cycle detection (Bellman-Ford)',
      'Problems with a constraint on the number of edges/stops in the path (modified Bellman-Ford or BFS with states)',
      'All-pairs shortest path queries (Floyd-Warshall)',
      'Problems involving maximum probability, minimum bottleneck, or other path optimization metrics'
    ],

    keyPatterns: [
      'Dijkstra with min-heap: greedily process the nearest unvisited node, relax its neighbors',
      'Bellman-Ford: relax all edges V-1 times; detect negative cycles with a V-th pass',
      'Modified Bellman-Ford with K iterations for "at most K stops" problems',
      'Floyd-Warshall: dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j]) for each intermediate node k',
      'Priority queue optimization: use (distance, node) pairs; skip stale entries where distance exceeds known shortest',
      'State augmentation: add extra state dimensions (e.g., stops remaining) to Dijkstra or BFS'
    ],

    timeComplexity: 'Dijkstra: O((V+E) log V); Bellman-Ford: O(V*E); Floyd-Warshall: O(V^3)',
    spaceComplexity: 'Dijkstra: O(V+E); Bellman-Ford: O(V); Floyd-Warshall: O(V^2)',

    approach: [
      'Build the adjacency list from the input edges (handle directed vs undirected)',
      'Determine which algorithm to use based on edge weight properties and the query type',
      'For Dijkstra: initialize distance array to infinity, source to 0; use a min-heap; relax neighbors of each popped node',
      'For Bellman-Ford: initialize distances, then perform V-1 rounds of relaxation over all edges; for K-stop problems, use only K+1 rounds',
      'For Floyd-Warshall: initialize the distance matrix from the adjacency matrix, then run the triple nested loop with k as the outermost variable',
      'Return the result: shortest distances, or -1/infinity for unreachable nodes'
    ],

    commonProblems: [
      { name: 'Network Delay Time', difficulty: 'Medium' },
      { name: 'Cheapest Flights Within K Stops', difficulty: 'Medium' },
      { name: 'Path with Maximum Probability', difficulty: 'Medium' },
      { name: 'Swim in Rising Water', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Using Dijkstra on graphs with negative edge weights, which produces incorrect results',
      'Not handling the stale entry problem in Dijkstra: when you pop a node whose distance is already worse than the known shortest, skip it',
      'In Bellman-Ford with K stops, modifying the distance array in-place during a round (use a copy of the previous round\'s distances)',
      'Forgetting that Floyd-Warshall\'s outermost loop must be over the intermediate node k, not the source or destination',
      'For Swim in Rising Water, not recognizing it as a modified Dijkstra where the "distance" is the maximum elevation along the path'
    ],

    tips: [
      'Network Delay Time is a direct application of Dijkstra; the answer is the maximum shortest distance to any node',
      'Cheapest Flights Within K Stops: use Bellman-Ford with K+1 relaxation rounds, copying the distance array between rounds',
      'Path with Maximum Probability: use Dijkstra with a max-heap and multiply probabilities instead of adding distances',
      'Swim in Rising Water: use Dijkstra where the cost of a path is the maximum cell value along it (min-heap on max elevation)',
      'In Python, use heapq for Dijkstra; note that heapq is a min-heap, so negate values for max-heap behavior',
      'For sparse graphs (E << V^2), Dijkstra is much faster than Floyd-Warshall'
    ],

    interviewTips: [
      'Explain your algorithm choice: "The weights are non-negative, so I will use Dijkstra with a min-heap"',
      'For Cheapest Flights, explain why standard Dijkstra fails: "It does not account for the stop constraint, so I need to augment the state or use Bellman-Ford with limited rounds"',
      'Mention the complexity and compare algorithms: "Dijkstra is O((V+E)log V), better than Bellman-Ford\'s O(VE) for sparse graphs with non-negative weights"',
      'For maximum probability, explain the transformation: "Maximizing product of probabilities is equivalent to minimizing negative log, but it is simpler to just use a max-heap directly"'
    ],
  },

  // ─── 34. Minimum Spanning Tree ────────────────────────────────────
  {
    id: 'minimum-spanning-tree',
    title: 'Minimum Spanning Tree',
    icon: 'share2',
    color: '#10b981',
    questions: 4,
    description: 'Kruskal and Prim algorithms for finding minimum-cost spanning trees in weighted graphs.',

    introduction: `A Minimum Spanning Tree (MST) is a subset of edges in a connected, weighted, undirected graph that connects all vertices with the minimum total edge weight and without forming any cycles. Two classic algorithms solve this problem: Kruskal's algorithm sorts all edges by weight and greedily adds them using Union-Find to avoid cycles (O(E log E)). Prim's algorithm grows the MST from a starting vertex, always adding the cheapest edge that connects a new vertex (O((V+E) log V) with a priority queue).

**Why This Matters:**
MST problems test your understanding of greedy algorithms and graph structure. While the core MST problem is straightforward, interview variants add twists: connecting points in 2D space (where you must construct the edges), finding critical edges whose removal would increase the MST cost, or distributing resources to minimize total connection cost. These problems combine MST algorithms with Union-Find and sometimes binary search or edge enumeration.

**Key Insight:** Both Kruskal's and Prim's are greedy algorithms but approach the problem differently. Kruskal's is edge-centric: sort edges globally and add the cheapest non-cycle-forming edge. It pairs naturally with Union-Find for cycle detection. Prim's is vertex-centric: grow a tree from a seed vertex by always adding the cheapest edge to an unvisited vertex. Kruskal's is often simpler to implement for interview problems because Union-Find is a well-known pattern, and many problems provide an edge list rather than an adjacency list.`,

    whenToUse: [
      'Connecting all nodes in a graph with minimum total edge weight',
      'Connecting points in 2D/3D space with minimum total distance (construct edges from coordinates)',
      'Finding the minimum cost to provide connectivity to all nodes (network, water, electricity)',
      'Identifying critical or pseudo-critical edges in an MST',
      'Problems where you need a spanning subgraph with minimum total cost',
      'Variants involving thresholds: minimum bottleneck spanning tree or constrained MST'
    ],

    keyPatterns: [
      'Kruskal: sort edges by weight, iterate in order, add edge if it connects two different components (Union-Find)',
      'Prim: start from any vertex, use a min-heap of (weight, neighbor) pairs, always pick the cheapest edge to an unvisited vertex',
      'Union-Find with path compression and union by rank for O(alpha(n)) per operation in Kruskal\'s',
      'For 2D point problems: compute all pairwise distances as edges, then run Kruskal or Prim',
      'Critical edge detection: remove each edge and check if MST cost increases',
      'MST property: the heaviest edge in any cycle is never in the MST (cycle property)'
    ],

    timeComplexity: 'Kruskal: O(E log E); Prim: O((V+E) log V)',
    spaceComplexity: 'O(V + E) for storing the graph and Union-Find / priority queue',

    approach: [
      'Build the edge list (or adjacency list for Prim) from the input',
      'For Kruskal: sort edges by weight; initialize Union-Find with V components; iterate through edges, adding each edge that connects two different components',
      'For Prim: initialize a min-heap with edges from the starting vertex; repeatedly extract the minimum edge, add the vertex if unvisited, and enqueue its edges',
      'Stop when V-1 edges have been added (MST of V vertices has exactly V-1 edges)',
      'For 2D point problems, generate all O(V^2) pairwise edges first, then run the algorithm',
      'For critical edge problems, run MST once to get the baseline cost, then test each edge by temporarily removing or forcing it'
    ],

    commonProblems: [
      { name: 'Min Cost to Connect All Points', difficulty: 'Medium' },
      { name: 'Connecting Cities With Minimum Cost', difficulty: 'Medium' },
      { name: 'Find Critical Edges in MST', difficulty: 'Hard' },
      { name: 'Optimize Water Distribution', difficulty: 'Hard' },
    ],

    commonMistakes: [
      'Forgetting that MST requires an undirected graph; if the input is directed, MST algorithms do not directly apply',
      'Not using Union-Find path compression and union by rank, leading to O(V) per union instead of near-O(1)',
      'For Min Cost to Connect All Points, generating edges incorrectly (Manhattan distance, not Euclidean, depending on the problem)',
      'In Prim\'s algorithm, adding edges to visited vertices to the heap and not skipping them when dequeued',
      'For Optimize Water Distribution, not recognizing the trick: add a virtual node connected to each city by its well cost, then run standard MST'
    ],

    tips: [
      'Kruskal with Union-Find is usually simpler to implement in interviews than Prim',
      'For Min Cost to Connect All Points, use Manhattan distance: |x1-x2| + |y1-y2|',
      'Optimize Water Distribution: create a virtual node 0 connected to city i with weight wells[i], then run MST on the augmented graph',
      'For critical edges: an edge is critical if removing it increases the MST weight; an edge is pseudo-critical if it can be part of some MST',
      'If the graph is dense (E close to V^2), Prim with an adjacency matrix is O(V^2) which beats Kruskal\'s O(E log E)',
      'The MST is unique if all edge weights are distinct; with duplicate weights, multiple MSTs may exist'
    ],

    interviewTips: [
      'Explain your algorithm choice: "I will use Kruskal because the problem gives an edge list and Union-Find makes cycle detection easy"',
      'State the MST property: "A spanning tree with V vertices has exactly V-1 edges, and the MST has the minimum total weight among all spanning trees"',
      'For Optimize Water Distribution, explain the virtual node trick clearly: "I model each well as an edge from a virtual source node to the city"',
      'Mention the Union-Find optimizations: "Path compression and union by rank give near-constant time per operation"'
    ],
  },
];
