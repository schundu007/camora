// apps/lumora-backend/src/lib/interviewTopics.js
//
// The pattern curriculum a coding answer points back to.
//
// Sourced from the algo.monster course tree (12 sections, 285 lessons). It is kept
// here rather than sent to the model because 285 titles is ~1.5k tokens on every
// solve, and a live interview pays that in latency. The model names the concepts it
// used in its own words; matchLessons() maps those onto real lessons, so "what to
// review" is always a topic that exists rather than one the model remembered.

export const SECTIONS = {
  "Getting Started": [
    "Patterns",
    "Roadmap",
    "Interview Process",
    "How to Study",
    "The Mindset",
    "Math Basics",
    "Runtime to Algo Cheat Sheet",
    "Keyword to Algo Cheat Sheet",
    "Basic Data Structures and Algorithms",
    "Stack Intro",
    "Queue Intro",
    "Hashmap Intro",
    "Data Structures by Language",
    "Intro to Sorting",
    "Advanced Sorting Algorithms - Merge Sort | Quick Sort",
    "Sorting Summary",
    "Built-in Sort with Custom Comparator",
    "Simulation Coding Problems: Introduction and Strategies",
  ],
  "Binary Search": [
    "Binary Search Intro",
    "First True",
    "Monotonic Function",
    "First Element Not Smaller Than Target",
    "First Occurrence",
    "Square Root Estimation",
    "Minimum in Rotated Sorted Array",
    "Peak of Mountain Array",
    "Newspapers",
    "Binary Search Speedrun",
  ],
  "Two Pointers": [
    "Two Pointers Introduction",
    "Understanding Invariants",
    "Common Invariant Shapes",
    "Same Direction Family Map",
    "Remove Duplicates",
    "Middle of a Linked List",
    "Move Zeros",
    "Remove N-th Node from End of Linked List",
    "Opposite Direction Family Map",
    "Two Sum Sorted",
    "Valid Palindrome",
    "Container With Most Water",
    "Sliding Window Family Map",
    "Subarray Sum - Fixed",
    "Find All Anagrams in a String",
    "Sliding Window - Longest",
    "Longest Substring without Repeating Characters",
    "Sliding Window - Shortest",
    "Least Consecutive Cards to Match",
    "Introduction",
    "Subarray Sum Equals Target",
    "Range Sum Query - Immutable",
    "Product of Array Except Self",
    "Fast and Slow Family Map",
    "Linked List Cycle",
    "Two Pointers Decision Rule",
    "Minimum Window Substring",
    "Teleporter Arrays",
    "Two Pointers Synthesis",
    "Two Pointers Speedrun",
    "Monster Breakdown | Two Pointers",
  ],
  "Depth First Search": [
    "Recursion Intro",
    "Trees",
    "DFS Intro",
    "Intro",
    "Max Depth of A Tree",
    "Visible Tree Node",
    "Balanced Binary Tree",
    "Subtree of Another Tree",
    "Invert Binary Tree",
    "Binary Search Tree Intro",
    "Valid Binary Search Tree",
    "Insert Into BST",
    "Lowest Common Ancestor of a Binary Search Tree",
    "Reconstruct Binary Tree from Preorder and Inorder Traversal",
    "Serializing and Deserializing Binary Tree",
    "Lowest Common Ancestor",
  ],
  "Backtracking": [
    "DFS with States",
    "Backtracking 1",
    "Generate All Phone Number Combinations",
    "Backtracking 1 - Pruning",
    "Partition a String Into Palindromes",
    "Backtracking 1 - Additional States",
    "Generate All Valid Parentheses",
    "General All Permutations",
    "Backtracking 2 - Aggregation",
    "Memoization",
    "Word Break",
    "Num Ways to Decode a Message",
    "Min Coins to Make Change",
    "Deduplication",
    "Combination Sum",
    "Subsets",
    "Backtracking Speedrun",
  ],
  "Breadth First Search": [
    "BFS Intro",
    "Binary Tree Level Order Traversal",
    "Binary Tree ZigZag Level Order Traversal",
    "Binary Tree Right Side View",
    "Binary Tree Min Depth",
  ],
  "Graph": [
    "Graph Intro",
    "BFS on Graphs",
    "DFS on Graph",
    "BFS vs DFS",
    "Shortest Path",
    "Clone Graph",
    "Matrix as Graph",
    "Flood Fill",
    "Number of Islands",
    "Knight Minimum Moves",
    "Walls and Gates / Zombie in Matrix",
    "Pacific Atlantic Water Flow",
    "Word Ladder",
    "Open the Lock",
    "Sliding Puzzle",
    "Topological Sort Intro",
    "Task Scheduling",
    "Reconstructing Sequence",
    "Task Scheduling 2",
    "Alien Dictionary",
    "Course Schedule",
    "Dijkstra's Algorithm | Shortest Path in a Weighted Graph",
    "Introduction to Minimum Spanning Tree",
    "Minimum Spanning Tree | Forests",
    "Graph Speedrun - Part 1",
    "Graph Speedrun - Part 2",
  ],
  "Priority Queue / Heap": [
    "Heap Intro",
    "K Closest points",
    "Merge K Sorted Lists",
    "Kth Largest Element in an Array",
    "Kth Smallest Element in a Sorted Matrix",
    "Reorganize String",
    "Ugly Number",
    "Median of Data Stream",
  ],
  "Dynamic Prog.": [
    "Dynamic Programming Intro",
    "Climbing Stairs",
    "N-th Tribonacci Number",
    "Constant Transition DP Introduction",
    "House Robber",
    "Min Cost Climbing Stairs",
    "Minimum Cost For Tickets",
    "Grid DP Introduction",
    "Unique Paths",
    "Unique Paths with Obstacles",
    "Minimum Path Sum",
    "Maximal Square",
    "Triangle",
    "Dungeon Game",
    "Dual-Sequence DP Introduction",
    "Longest Common Subsequence",
    "Edit Distance",
    "Delete String",
    "Distinct Subsequences",
    "Shortest Common Supersequence",
    "Non-constant Transition DP Introduction",
    "Longest Increasing Subsequence",
    "Partition Array for Maximum Sum",
    "Largest Divisible Subset",
    "Divisor Game",
    "Knapsack DP Introduction",
    "Weight-Only knapsack",
    "Partition Equal Subset Sum",
    "Target Sum",
    "Unbounded Knapsack Introduction",
    "Coin Change II",
    "Coin Change, Optimization",
    "Perfect Squares",
    "0/1 Knapsack Introduction",
    "0/1 Knapsack Practice Problem",
    "Bounded Knapsack Introduction",
    "Bounded Knapsack",
    "Interval DP Intro",
    "Palindromic Substrings",
    "Coin Game",
    "Longest Palindromic Subsequence",
    "Topological Sort DP Introduction",
    "Longest Increasing Path in a Matrix",
    "Longest String Chain",
    "Tree DP Introduction",
    "House Robber III",
    "Bitmask Introduction",
    "Bitmask DP",
    "Minimum Cost to Visit Every Node",
    "DP Practice List",
  ],
  "Adv. Data Structures": [
    "DSU/Union Find Fundamentals",
    "DSU Optimizations: Path Compression and Union by Rank",
    "DSU Introductory Problem",
    "Size of Connected Components",
    "Merge User Accounts",
    "Number of Connected Components",
    "Umbristan |  Reverse Union Find",
    "Trie Introduction",
    "Autocomplete",
    "Prefix Count",
    "Add and Search Words Data Structure",
    "Word Search II",
    "LRU Cache",
    "Segment Tree Intro",
    "Range max",
  ],
  "Miscellaneous": [
    "Intervals",
    "Merge Intervals",
    "Insert Interval",
    "Meeting Rooms",
    "Meeting Rooms II",
    "Non-overlapping Intervals",
    "Minimum Number of Arrows to Burst Balloons",
    "Partition Labels",
    "Min Stack",
    "Basic Calculator",
    "Monotonic Stack Intro",
    "Sliding Window Maximum",
    "Daily Temperatures",
    "Next Greater Element II",
    "Largest Rectangle in Histogram",
    "Divide and Conquer Intro",
    "The Skyline Problem",
    "Count of Smaller Numbers After Self",
    "Line-Sweep Introduction",
    "Union Area of Rectangles",
    "Closest BST Values II",
    "Greedy Introduction",
    "Gas Station",
    "Prime Sieve Intro",
    "N-th prime",
    "Sparse Matrix Multiplication",
  ],
  "Company OAs": [
    "Amazon OA",
    "Robot in Circle",
    "Number Game",
    "Find All Combination of Numbers that Sum to a Target",
    "Fill The Truck",
    "Slowest Key",
    "Five Star Sellers",
    "Number of Ways to Split Into Primes",
    "Storage Optimization",
    "Music Pair",
    "Minimum Difficulty of a Job Schedule",
    "Autoscale Policy, Utilization Check",
    "Optimal Utilization",
    "Merge Two Sorted Lists",
    "Two Sum",
    "Shopping Patterns",
    "Reorder Data in Log Files",
    "Top K Keywords",
    "Microsoft OA",
    "Max Network Rank",
    "Minimum Adj Swaps",
    "Lexicographically Smallest String",
    "Longest Substring",
    "Min Moves to Obtain String Without 3 Identical Consecutive Letters",
    "String",
    "Min Steps to Make Piles Equal Height",
    "Day of week",
    "Max Inserts to Obtain String Without 3 Consecutive 'a'",
    "Concatenated String Length",
    "Largest K such that both K and -K exist in array",
    "Maximum Length of a Concatenated String",
    "Sum to Zero",
    "Min Deletions",
    "Particle Velocity",
    "Jump Game",
    "Fair Indexes",
    "Partition array into N subsets with balanced sum",
    "Google OA",
    "Compare Strings",
    "Largest Subarray",
    "Maximum Area Serving Cake",
    "Minimum Number of Decreasing Subsequence Partitions",
    "Pick Up Coupons",
    "Rose Garden",
    "Smallest Integer Satisfying the Rule",
    "Fill 2D Array",
    "Water Plants",
    "Split Strings",
    "Google Online Assessment 2021 (OA) - Rings on Rods",
    "Twitter OA",
    "K-Different Pairs",
    "Weird Faculty",
    "Social Network",
    "University Career Fair",
    "Game Events",
    "Activate Fountain",
    "Final Discounted Price",
    "Partition Array",
    "Authentication Tokens",
    "Parking Dilemma",
    "Efficient Job Processing Service",
    "Unique Twitter User ID Set",
    "Basic Data Structures by Language",
  ],};

export const SECTION_NAMES = Object.keys(SECTIONS);

/** Lowercased words worth matching on — drops filler that matches everything. */
const STOP = new Set([
  'a', 'an', 'the', 'of', 'in', 'to', 'and', 'or', 'for', 'with', 'on', 'from',
  'into', 'intro', 'introduction', 'problem', 'problems', 'using', 'is', 'it',
]);

function tokens(s) {
  return new Set(
    String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
  );
}

/**
 * Map free-text concept names onto real lessons.
 *
 * Scores by shared significant words, requiring at least two overlapping words
 * (or one that is a full title match) so a single generic hit like "array" does
 * not pull in unrelated lessons. Returns at most `limit` lessons, best first.
 */
export function matchLessons(concepts, limit = 5) {
  const wanted = Array.isArray(concepts) ? concepts : [concepts];
  const scored = new Map();

  for (const concept of wanted) {
    const ct = tokens(concept);
    if (!ct.size) continue;
    for (const [section, lessons] of Object.entries(SECTIONS)) {
      for (const lesson of lessons) {
        const lt = tokens(lesson);
        let overlap = 0;
        for (const w of ct) if (lt.has(w)) overlap++;
        const exact = lesson.toLowerCase() === String(concept).toLowerCase().trim();
        if (!exact && overlap < 2) continue;
        const score = exact ? 100 : overlap + (overlap / lt.size);
        const key = `${section}|${lesson}`;
        if ((scored.get(key)?.score ?? -1) < score) scored.set(key, { section, lesson, score });
      }
    }
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ section, lesson }) => ({ section, lesson }));
}

/** True when a model-named section is one we actually have. */
export function isKnownSection(name) {
  return SECTION_NAMES.includes(String(name).trim());
}
