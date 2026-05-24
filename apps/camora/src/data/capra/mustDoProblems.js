// Blind 75 — the industry-standard must-do DSA list for FAANG interviews.
// Descriptions are concise enough for the AI coding solver to understand the problem.

export const MUST_DO_PROBLEMS = [
  // ── Arrays & Hashing ─────────────────────────────────────────────────────
  {
    slug: 'two-sum',
    label: 'Two Sum',
    category: 'Arrays & Hashing',
    description: "Given an integer array nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution. Example: nums = [2,7,11,15], target = 9 → [0,1].",
  },
  {
    slug: 'contains-duplicate',
    label: 'Contains Duplicate',
    category: 'Arrays & Hashing',
    description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct. Example: [1,2,3,1] → true.",
  },
  {
    slug: 'valid-anagram',
    label: 'Valid Anagram',
    category: 'Arrays & Hashing',
    description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise. An anagram uses all the original letters exactly once. Example: s = 'anagram', t = 'nagaram' → true.",
  },
  {
    slug: 'group-anagrams',
    label: 'Group Anagrams',
    category: 'Arrays & Hashing',
    description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order. Example: ['eat','tea','tan','ate','nat','bat'] → [['bat'],['nat','tan'],['ate','eat','tea']].",
  },
  {
    slug: 'top-k-frequent-elements',
    label: 'Top K Frequent Elements',
    category: 'Arrays & Hashing',
    description: "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order. Example: nums = [1,1,1,2,2,3], k = 2 → [1,2].",
  },
  {
    slug: 'product-of-array-except-self',
    label: 'Product of Array Except Self',
    category: 'Arrays & Hashing',
    description: "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. Must run in O(n) without using division. Example: [1,2,3,4] → [24,12,8,6].",
  },
  {
    slug: 'longest-consecutive-sequence',
    label: 'Longest Consecutive Sequence',
    category: 'Arrays & Hashing',
    description: "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. Must run in O(n) time. Example: [100,4,200,1,3,2] → 4 (sequence 1,2,3,4).",
  },
  // ── Two Pointers ──────────────────────────────────────────────────────────
  {
    slug: 'valid-palindrome',
    label: 'Valid Palindrome',
    category: 'Two Pointers',
    description: "A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.",
  },
  {
    slug: 'three-sum',
    label: '3Sum',
    category: 'Two Pointers',
    description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i, j, k are distinct and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.",
  },
  {
    slug: 'container-with-most-water',
    label: 'Container With Most Water',
    category: 'Two Pointers',
    description: "Given an integer array height of length n, find two lines that together with the x-axis form a container that contains the most water. Return the maximum amount of water a container can store.",
  },
  // ── Sliding Window ────────────────────────────────────────────────────────
  {
    slug: 'best-time-to-buy-and-sell-stock',
    label: 'Best Time to Buy and Sell Stock',
    category: 'Sliding Window',
    description: "Given an array prices where prices[i] is the price of a stock on day i, find the maximum profit you can achieve from a single buy and sell. You cannot sell before you buy. If no profit is possible return 0.",
  },
  {
    slug: 'longest-substring-without-repeating-characters',
    label: 'Longest Substring Without Repeating Characters',
    category: 'Sliding Window',
    description: "Given a string s, find the length of the longest substring without repeating characters. Example: 'abcabcbb' → 3 (abc), 'bbbbb' → 1, 'pwwkew' → 3 (wke).",
  },
  {
    slug: 'longest-repeating-character-replacement',
    label: 'Longest Repeating Character Replacement',
    category: 'Sliding Window',
    description: "Given a string s and an integer k, you can choose any character and change it to any other uppercase English character at most k times. Return the length of the longest substring containing the same letter you can get after performing the above operations.",
  },
  {
    slug: 'minimum-window-substring',
    label: 'Minimum Window Substring',
    category: 'Sliding Window',
    description: "Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If no such substring exists, return the empty string. Example: s='ADOBECODEBANC', t='ABC' → 'BANC'.",
  },
  // ── Stack ─────────────────────────────────────────────────────────────────
  {
    slug: 'valid-parentheses',
    label: 'Valid Parentheses',
    category: 'Stack',
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets in the correct order.",
  },
  // ── Binary Search ─────────────────────────────────────────────────────────
  {
    slug: 'find-minimum-in-rotated-sorted-array',
    label: 'Find Minimum in Rotated Sorted Array',
    category: 'Binary Search',
    description: "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element. Must run in O(log n). Example: [3,4,5,1,2] → 1.",
  },
  {
    slug: 'search-in-rotated-sorted-array',
    label: 'Search in Rotated Sorted Array',
    category: 'Binary Search',
    description: "Given a rotated sorted array nums and a target, return the index of target if it is in nums, or -1 if not. Must run in O(log n). Example: nums=[4,5,6,7,0,1,2], target=0 → 4.",
  },
  // ── Linked List ───────────────────────────────────────────────────────────
  {
    slug: 'reverse-linked-list',
    label: 'Reverse Linked List',
    category: 'Linked List',
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list. Example: 1→2→3→4→5 → 5→4→3→2→1. Must solve iteratively and recursively.",
  },
  {
    slug: 'merge-two-sorted-lists',
    label: 'Merge Two Sorted Lists',
    category: 'Linked List',
    description: "Given the heads of two sorted linked lists list1 and list2, merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.",
  },
  {
    slug: 'reorder-list',
    label: 'Reorder List',
    category: 'Linked List',
    description: "Given the head of a linked list L0→L1→…→Ln-1→Ln, reorder it to L0→Ln→L1→Ln-1→L2→Ln-2→…. You may not modify the values in the list's nodes. Only nodes themselves may be changed.",
  },
  {
    slug: 'remove-nth-node-from-end-of-list',
    label: 'Remove Nth Node From End of List',
    category: 'Linked List',
    description: "Given the head of a linked list, remove the nth node from the end of the list and return its head. Example: head=[1,2,3,4,5], n=2 → [1,2,3,5]. Do it in one pass.",
  },
  {
    slug: 'linked-list-cycle',
    label: 'Linked List Cycle',
    category: 'Linked List',
    description: "Given head, the head of a linked list, determine if the linked list has a cycle in it. Return true if there is a cycle, otherwise return false. Use O(1) memory (Floyd's cycle detection).",
  },
  {
    slug: 'merge-k-sorted-lists',
    label: 'Merge K Sorted Lists',
    category: 'Linked List',
    description: "Given an array of k linked-lists, each sorted in ascending order, merge all the linked-lists into one sorted linked-list and return it. Example: lists=[[1,4,5],[1,3,4],[2,6]] → [1,1,2,3,4,4,5,6].",
  },
  // ── Trees ─────────────────────────────────────────────────────────────────
  {
    slug: 'invert-binary-tree',
    label: 'Invert Binary Tree',
    category: 'Trees',
    description: "Given the root of a binary tree, invert the tree, and return its root. Swap the left and right children of every node. Example: [4,2,7,1,3,6,9] → [4,7,2,9,6,3,1].",
  },
  {
    slug: 'maximum-depth-of-binary-tree',
    label: 'Maximum Depth of Binary Tree',
    category: 'Trees',
    description: "Given the root of a binary tree, return its maximum depth. The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node. Example: [3,9,20,null,null,15,7] → 3.",
  },
  {
    slug: 'same-tree',
    label: 'Same Tree',
    category: 'Trees',
    description: "Given the roots of two binary trees p and q, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.",
  },
  {
    slug: 'subtree-of-another-tree',
    label: 'Subtree of Another Tree',
    category: 'Trees',
    description: "Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values as subRoot and false otherwise. A subtree of a binary tree includes the node and all its descendants.",
  },
  {
    slug: 'lowest-common-ancestor-of-a-binary-search-tree',
    label: 'Lowest Common Ancestor of a BST',
    category: 'Trees',
    description: "Given a binary search tree (BST) and two nodes p and q, find their lowest common ancestor (LCA). The LCA is defined as the lowest node that has both p and q as descendants (a node can be a descendant of itself).",
  },
  {
    slug: 'binary-tree-level-order-traversal',
    label: 'Binary Tree Level Order Traversal',
    category: 'Trees',
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level). Example: [3,9,20,null,null,15,7] → [[3],[9,20],[15,7]].",
  },
  {
    slug: 'validate-binary-search-tree',
    label: 'Validate Binary Search Tree',
    category: 'Trees',
    description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST: the left subtree only contains nodes with keys less than the node's key, the right subtree only contains nodes with keys greater.",
  },
  {
    slug: 'kth-smallest-element-in-a-bst',
    label: 'Kth Smallest Element in a BST',
    category: 'Trees',
    description: "Given the root of a binary search tree and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree. Example: root=[3,1,4,null,2], k=1 → 1.",
  },
  {
    slug: 'construct-binary-tree-from-preorder-and-inorder-traversal',
    label: 'Construct Binary Tree from Preorder and Inorder',
    category: 'Trees',
    description: "Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal, construct and return the binary tree.",
  },
  {
    slug: 'binary-tree-maximum-path-sum',
    label: 'Binary Tree Maximum Path Sum',
    category: 'Trees',
    description: "Given the root of a binary tree, return the maximum path sum of any non-empty path. A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge. A node can only appear in the sequence at most once.",
  },
  {
    slug: 'serialize-and-deserialize-binary-tree',
    label: 'Serialize and Deserialize Binary Tree',
    category: 'Trees',
    description: "Design an algorithm to serialize and deserialize a binary tree. Serialization is the process of converting a data structure to a sequence of bits so that it can be stored. There is no restriction on how to serialize/deserialize; just ensure the tree can be reconstructed.",
  },
  // ── Tries ─────────────────────────────────────────────────────────────────
  {
    slug: 'implement-trie-prefix-tree',
    label: 'Implement Trie (Prefix Tree)',
    category: 'Tries',
    description: "Design a data structure that supports: insert(word) — inserts the string word into the trie, search(word) — returns true if word is in the trie, startsWith(prefix) — returns true if there is a previously inserted word that has the prefix. Implement Trie class.",
  },
  {
    slug: 'design-add-and-search-words-data-structure',
    label: 'Design Add and Search Words Data Structure',
    category: 'Tries',
    description: "Design a data structure that supports adding new words and finding if a string matches any previously added string. addWord(word) and search(word) where '.' can match any letter. Implement WordDictionary class.",
  },
  {
    slug: 'word-search-ii',
    label: 'Word Search II',
    category: 'Tries',
    description: "Given an m x n board of characters and a list of strings words, return all words on the board. Each word must be constructed from letters of sequentially adjacent cells (horizontally/vertically adjacent). Each cell may not be used more than once in a word.",
  },
  // ── Heap ──────────────────────────────────────────────────────────────────
  {
    slug: 'find-median-from-data-stream',
    label: 'Find Median from Data Stream',
    category: 'Heap',
    description: "Design a data structure MedianFinder that supports: addNum(num) — adds the integer num from the data stream, findMedian() — returns the median of all elements so far. Implement in O(log n) per addNum and O(1) per findMedian using two heaps.",
  },
  // ── Backtracking ──────────────────────────────────────────────────────────
  {
    slug: 'combination-sum',
    label: 'Combination Sum',
    category: 'Backtracking',
    description: "Given an array of distinct integers candidates and a target integer target, return all unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen from candidates an unlimited number of times.",
  },
  {
    slug: 'word-search',
    label: 'Word Search',
    category: 'Backtracking',
    description: "Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells (horizontally/vertically adjacent). The same letter cell may not be used more than once.",
  },
  // ── Graphs ────────────────────────────────────────────────────────────────
  {
    slug: 'number-of-islands',
    label: 'Number of Islands',
    category: 'Graphs',
    description: "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
  },
  {
    slug: 'clone-graph',
    label: 'Clone Graph',
    category: 'Graphs',
    description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node has a value (int) and a list of its neighbors. The given node will always be the first node with val = 1.",
  },
  {
    slug: 'pacific-atlantic-water-flow',
    label: 'Pacific Atlantic Water Flow',
    category: 'Graphs',
    description: "Given an m x n matrix of non-negative integers representing the height of each unit cell, return a list of grid coordinates where water can flow to both the Pacific and Atlantic ocean. Water flows to adjacent cells (up/down/left/right) with equal or lower height.",
  },
  {
    slug: 'course-schedule',
    label: 'Course Schedule',
    category: 'Graphs',
    description: "There are numCourses courses labeled 0 to numCourses-1. Given prerequisites pairs [a,b] meaning you must take b before a, determine if it is possible to finish all courses. This is a cycle detection problem on a directed graph.",
  },
  {
    slug: 'number-of-connected-components-in-an-undirected-graph',
    label: 'Number of Connected Components',
    category: 'Graphs',
    description: "Given n nodes (labeled 0 to n-1) and a list of undirected edges, write a function to find the number of connected components in an undirected graph. Use Union-Find or DFS/BFS.",
  },
  {
    slug: 'graph-valid-tree',
    label: 'Graph Valid Tree',
    category: 'Graphs',
    description: "Given n nodes labeled 0 to n-1 and a list of undirected edges, write a function to check whether these edges make up a valid tree. A valid tree has exactly n-1 edges and is fully connected with no cycles.",
  },
  // ── Advanced Graphs ───────────────────────────────────────────────────────
  {
    slug: 'alien-dictionary',
    label: 'Alien Dictionary',
    category: 'Advanced Graphs',
    description: "Given a list of words from an alien language dictionary sorted lexicographically by the alien language's rules, derive the order of characters in the alien language. Return any valid ordering, or '' if invalid. Use topological sort.",
  },
  // ── Dynamic Programming ───────────────────────────────────────────────────
  {
    slug: 'climbing-stairs',
    label: 'Climbing Stairs',
    category: '1-D DP',
    description: "You are climbing a staircase with n steps. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top? Example: n=3 → 3 (1+1+1, 1+2, 2+1).",
  },
  {
    slug: 'house-robber',
    label: 'House Robber',
    category: '1-D DP',
    description: "Given an array nums representing the amount of money in each house, return the maximum amount you can rob without alerting the police (cannot rob two adjacent houses). Example: [2,7,9,3,1] → 12.",
  },
  {
    slug: 'house-robber-ii',
    label: 'House Robber II',
    category: '1-D DP',
    description: "All houses are arranged in a circle — the first and last house are adjacent. Given nums, return the maximum amount you can rob. Since the houses are in a circle, solve two subproblems: rob houses 0..n-2 and 1..n-1, return the max.",
  },
  {
    slug: 'longest-palindromic-substring',
    label: 'Longest Palindromic Substring',
    category: '1-D DP',
    description: "Given a string s, return the longest palindromic substring in s. Example: 'babad' → 'bab' or 'aba', 'cbbd' → 'bb'. Expand around center O(n²) or Manacher's O(n).",
  },
  {
    slug: 'palindromic-substrings',
    label: 'Palindromic Substrings',
    category: '1-D DP',
    description: "Given a string s, return the number of palindromic substrings in it. A string is a palindrome when it reads the same backward as forward. A substring is a contiguous sequence of characters. Example: 'aaa' → 6.",
  },
  {
    slug: 'decode-ways',
    label: 'Decode Ways',
    category: '1-D DP',
    description: "A message containing letters A-Z can be encoded to digits 1-26. Given a string s containing only digits, return the number of ways to decode it. '0' has no mapping. Example: '226' → 3 (BZ, VF, BBF).",
  },
  {
    slug: 'coin-change',
    label: 'Coin Change',
    category: '1-D DP',
    description: "Given an array of coin denominations and an amount, return the fewest number of coins needed to make up that amount. Return -1 if it cannot be made. Example: coins=[1,5,11], amount=15 → 3 (5+5+5).",
  },
  {
    slug: 'maximum-product-subarray',
    label: 'Maximum Product Subarray',
    category: '1-D DP',
    description: "Given an integer array nums, find a subarray that has the largest product, and return the product. Must handle negative numbers. Example: [2,3,-2,4] → 6 ([2,3]). Track both max and min running products.",
  },
  {
    slug: 'word-break',
    label: 'Word Break',
    category: '1-D DP',
    description: "Given a string s and a dictionary wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words. Example: s='leetcode', wordDict=['leet','code'] → true.",
  },
  {
    slug: 'longest-increasing-subsequence',
    label: 'Longest Increasing Subsequence',
    category: '1-D DP',
    description: "Given an integer array nums, return the length of the longest strictly increasing subsequence. Example: [10,9,2,5,3,7,101,18] → 4 ([2,3,7,101]). Solve in O(n log n) with patience sorting.",
  },
  {
    slug: 'jump-game',
    label: 'Jump Game',
    category: '1-D DP',
    description: "Given an integer array nums where nums[i] is your maximum jump length at position i, return true if you can reach the last index, or false otherwise. Start at index 0. Example: [2,3,1,1,4] → true.",
  },
  // ── 2-D DP ────────────────────────────────────────────────────────────────
  {
    slug: 'unique-paths',
    label: 'Unique Paths',
    category: '2-D DP',
    description: "A robot is on an m x n grid at the top-left corner. It can only move right or down. How many unique paths are there to reach the bottom-right corner? Example: m=3, n=7 → 28.",
  },
  {
    slug: 'longest-common-subsequence',
    label: 'Longest Common Subsequence',
    category: '2-D DP',
    description: "Given two strings text1 and text2, return the length of their longest common subsequence. A subsequence is a sequence derived by deleting some or no characters without disturbing the relative order. Example: 'abcde','ace' → 3.",
  },
  // ── Greedy ────────────────────────────────────────────────────────────────
  {
    slug: 'maximum-subarray',
    label: 'Maximum Subarray',
    category: 'Greedy',
    description: "Given an integer array nums, find the subarray with the largest sum, and return its sum. Example: [-2,1,-3,4,-1,2,1,-5,4] → 6 ([4,-1,2,1]). Use Kadane's algorithm.",
  },
  // ── Intervals ─────────────────────────────────────────────────────────────
  {
    slug: 'insert-interval',
    label: 'Insert Interval',
    category: 'Intervals',
    description: "Given an array of non-overlapping intervals sorted by start time and a new interval, insert the new interval into the array (merging if necessary). Example: intervals=[[1,3],[6,9]], newInterval=[2,5] → [[1,5],[6,9]].",
  },
  {
    slug: 'merge-intervals',
    label: 'Merge Intervals',
    category: 'Intervals',
    description: "Given an array of intervals where intervals[i]=[start,end], merge all overlapping intervals and return an array of the non-overlapping intervals. Example: [[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]].",
  },
  {
    slug: 'non-overlapping-intervals',
    label: 'Non-overlapping Intervals',
    category: 'Intervals',
    description: "Given an array of intervals, return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping. Example: [[1,2],[2,3],[3,4],[1,3]] → 1 (remove [1,3]).",
  },
  {
    slug: 'meeting-rooms',
    label: 'Meeting Rooms',
    category: 'Intervals',
    description: "Given an array of meeting time intervals intervals where intervals[i] = [start, end], determine if a person could attend all meetings (i.e., no two meetings overlap). Example: [[0,30],[5,10],[15,20]] → false.",
  },
  {
    slug: 'meeting-rooms-ii',
    label: 'Meeting Rooms II',
    category: 'Intervals',
    description: "Given an array of meeting time intervals, find the minimum number of conference rooms required. Example: [[0,30],[5,10],[15,20]] → 2. Use a min-heap to track end times.",
  },
  // ── Matrix ────────────────────────────────────────────────────────────────
  {
    slug: 'set-matrix-zeroes',
    label: 'Set Matrix Zeroes',
    category: 'Matrix',
    description: "Given an m x n integer matrix, if an element is 0, set its entire row and column to 0's. Do it in-place. Try to use O(1) extra space by storing the zero markers in the first row/column.",
  },
  {
    slug: 'spiral-matrix',
    label: 'Spiral Matrix',
    category: 'Matrix',
    description: "Given an m x n matrix, return all elements of the matrix in spiral order (clockwise from outside in). Example: [[1,2,3],[4,5,6],[7,8,9]] → [1,2,3,6,9,8,7,4,5].",
  },
  {
    slug: 'rotate-image',
    label: 'Rotate Image',
    category: 'Matrix',
    description: "Given an n x n 2D matrix representing an image, rotate the image by 90 degrees clockwise in-place. Transpose the matrix then reverse each row. You must rotate the image in-place without using another matrix.",
  },
  // ── Strings ───────────────────────────────────────────────────────────────
  {
    slug: 'longest-palindromic-substring-string',
    label: 'Longest Palindromic Substring',
    category: 'Strings',
    description: "Given a string s, return the longest palindromic substring. A palindrome reads the same forward and backward. Example: 'babad' → 'bab' (or 'aba'), 'cbbd' → 'bb'. Use expand-around-center approach.",
  },
  {
    slug: 'encode-and-decode-strings',
    label: 'Encode and Decode Strings',
    category: 'Strings',
    description: "Design an algorithm to encode a list of strings to a single string. The encoded string is then sent over the network and is decoded back to the original list of strings. Implement encode(strs) and decode(s) methods.",
  },
  // ── Bit Manipulation ──────────────────────────────────────────────────────
  {
    slug: 'missing-number',
    label: 'Missing Number',
    category: 'Bit Manipulation',
    description: "Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing. Use XOR or Gauss formula for O(1) space. Example: [3,0,1] → 2.",
  },
  {
    slug: 'number-of-1-bits',
    label: 'Number of 1 Bits',
    category: 'Bit Manipulation',
    description: "Write a function that takes the binary representation of a positive integer and returns the number of set bits it has (also known as the Hamming weight). Example: 11 (binary 1011) → 3.",
  },
  {
    slug: 'counting-bits',
    label: 'Counting Bits',
    category: 'Bit Manipulation',
    description: "Given an integer n, return an array ans of length n+1 such that for each i (0 ≤ i ≤ n), ans[i] is the number of 1's in the binary representation of i. Example: n=2 → [0,1,1], n=5 → [0,1,1,2,1,2].",
  },
  {
    slug: 'reverse-bits',
    label: 'Reverse Bits',
    category: 'Bit Manipulation',
    description: "Reverse bits of a given 32 bits unsigned integer. For example, input 43261596 (binary 00000010100101000001111010011100) output 964176192 (binary 00111001011110000010100101000000).",
  },
  {
    slug: 'sum-of-two-integers',
    label: 'Sum of Two Integers',
    category: 'Bit Manipulation',
    description: "Given two integers a and b, return the sum of the two integers without using the operators + and -. Use bit manipulation: XOR for addition without carry, AND+left shift for carry, iterate until no carry.",
  },
];
