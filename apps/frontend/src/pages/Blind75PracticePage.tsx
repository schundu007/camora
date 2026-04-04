import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'go', 'csharp'] as const;
type Language = typeof LANGUAGES[number];
const LANG_LABELS: Record<Language, string> = { python: 'Python3', javascript: 'JavaScript', java: 'Java', cpp: 'C++', go: 'Go', csharp: 'C#' };

/* ── All 75 problems with descriptions ── */
const PROBLEMS: Record<string, { title: string; difficulty: string; category: string; leetcode: string; description: string; examples: string[] }> = {
  '1': { title: 'Two Sum', difficulty: 'Easy', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/two-sum/', description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.', examples: ['Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] == 9', 'Input: nums = [3,2,4], target = 6\nOutput: [1,2]'] },
  '2': { title: 'Contains Duplicate', difficulty: 'Easy', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/contains-duplicate/', description: 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.', examples: ['Input: nums = [1,2,3,1]\nOutput: true', 'Input: nums = [1,2,3,4]\nOutput: false'] },
  '3': { title: 'Valid Anagram', difficulty: 'Easy', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/valid-anagram/', description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn anagram is a word formed by rearranging the letters of a different word, using all the original letters exactly once.', examples: ['Input: s = "anagram", t = "nagaram"\nOutput: true', 'Input: s = "rat", t = "car"\nOutput: false'] },
  '4': { title: 'Group Anagrams', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/group-anagrams/', description: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.', examples: ['Input: strs = ["eat","tea","tan","ate","nat","bat"]\nOutput: [["bat"],["nat","tan"],["ate","eat","tea"]]'] },
  '5': { title: 'Top K Frequent Elements', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/top-k-frequent-elements/', description: 'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.', examples: ['Input: nums = [1,1,1,2,2,3], k = 2\nOutput: [1,2]'] },
  '6': { title: 'Product of Array Except Self', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/product-of-array-except-self/', description: 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.', examples: ['Input: nums = [1,2,3,4]\nOutput: [24,12,8,6]'] },
  '7': { title: 'Encode and Decode Strings', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/encode-and-decode-strings/', description: 'Design an algorithm to encode a list of strings to a single string. The encoded string is then decoded back to the original list of strings.', examples: ['Input: ["lint","code","love","you"]\nOutput: ["lint","code","love","you"]'] },
  '8': { title: 'Longest Consecutive Sequence', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/longest-consecutive-sequence/', description: 'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.\n\nYou must write an algorithm that runs in O(n) time.', examples: ['Input: nums = [100,4,200,1,3,2]\nOutput: 4\nExplanation: [1,2,3,4]'] },
  '9': { title: 'Valid Palindrome', difficulty: 'Easy', category: 'Two Pointers', leetcode: 'https://leetcode.com/problems/valid-palindrome/', description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.', examples: ['Input: s = "A man, a plan, a canal: Panama"\nOutput: true'] },
  '10': { title: '3Sum', difficulty: 'Medium', category: 'Two Pointers', leetcode: 'https://leetcode.com/problems/3sum/', description: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nThe solution set must not contain duplicate triplets.', examples: ['Input: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]'] },
  '11': { title: 'Container With Most Water', difficulty: 'Medium', category: 'Two Pointers', leetcode: 'https://leetcode.com/problems/container-with-most-water/', description: 'You are given an integer array height of length n. Find two lines that together with the x-axis form a container that holds the most water.\n\nReturn the maximum amount of water a container can store.', examples: ['Input: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49'] },
  '12': { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', category: 'Sliding Window', leetcode: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy and a different day in the future to sell. Return the maximum profit, or 0 if no profit is possible.', examples: ['Input: prices = [7,1,5,3,6,4]\nOutput: 5'] },
  '13': { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', category: 'Sliding Window', leetcode: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', description: 'Given a string s, find the length of the longest substring without repeating characters.', examples: ['Input: s = "abcabcbb"\nOutput: 3\nExplanation: "abc"'] },
  '14': { title: 'Longest Repeating Character Replacement', difficulty: 'Medium', category: 'Sliding Window', leetcode: 'https://leetcode.com/problems/longest-repeating-character-replacement/', description: 'You are given a string s and an integer k. You can choose any character of the string and change it to any other character at most k times.\n\nReturn the length of the longest substring containing the same letter after performing the above operations.', examples: ['Input: s = "AABABBA", k = 1\nOutput: 4'] },
  '15': { title: 'Minimum Window Substring', difficulty: 'Hard', category: 'Sliding Window', leetcode: 'https://leetcode.com/problems/minimum-window-substring/', description: 'Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window.', examples: ['Input: s = "ADOBECODEBANC", t = "ABC"\nOutput: "BANC"'] },
  '16': { title: 'Valid Parentheses', difficulty: 'Easy', category: 'Stack', leetcode: 'https://leetcode.com/problems/valid-parentheses/', description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.\n\nAn input string is valid if: Open brackets are closed by the same type. Open brackets are closed in the correct order.', examples: ['Input: s = "()[]{}"\nOutput: true', 'Input: s = "(]"\nOutput: false'] },
  '17': { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', category: 'Binary Search', leetcode: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', description: 'Given a rotated sorted array nums and an integer target, return the index of target if it is in nums, or -1 if it is not. You must write an algorithm with O(log n) runtime complexity.', examples: ['Input: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4'] },
  '18': { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', category: 'Binary Search', leetcode: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', description: 'Given the sorted rotated array nums of unique elements, return the minimum element. You must write an algorithm that runs in O(log n) time.', examples: ['Input: nums = [3,4,5,1,2]\nOutput: 1'] },
  '19': { title: 'Reverse Linked List', difficulty: 'Easy', category: 'Linked List', leetcode: 'https://leetcode.com/problems/reverse-linked-list/', description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.', examples: ['Input: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]'] },
  '20': { title: 'Merge Two Sorted Lists', difficulty: 'Easy', category: 'Linked List', leetcode: 'https://leetcode.com/problems/merge-two-sorted-lists/', description: 'Merge two sorted linked lists and return it as a sorted list. The list should be made by splicing together the nodes of the first two lists.', examples: ['Input: l1 = [1,2,4], l2 = [1,3,4]\nOutput: [1,1,2,3,4,4]'] },
  '21': { title: 'Linked List Cycle', difficulty: 'Easy', category: 'Linked List', leetcode: 'https://leetcode.com/problems/linked-list-cycle/', description: 'Given head, the head of a linked list, determine if the linked list has a cycle in it.', examples: ['Input: head = [3,2,0,-4], pos = 1\nOutput: true'] },
  '22': { title: 'Reorder List', difficulty: 'Medium', category: 'Linked List', leetcode: 'https://leetcode.com/problems/reorder-list/', description: 'Reorder list from L0 → L1 → ... → Ln to L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → ...', examples: ['Input: [1,2,3,4]\nOutput: [1,4,2,3]'] },
  '23': { title: 'Remove Nth Node From End of List', difficulty: 'Medium', category: 'Linked List', leetcode: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/', description: 'Given the head of a linked list, remove the nth node from the end of the list and return its head.', examples: ['Input: head = [1,2,3,4,5], n = 2\nOutput: [1,2,3,5]'] },
  '24': { title: 'Merge K Sorted Lists', difficulty: 'Hard', category: 'Linked List', leetcode: 'https://leetcode.com/problems/merge-k-sorted-lists/', description: 'Merge k sorted linked lists and return it as one sorted list.', examples: ['Input: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]'] },
  '25': { title: 'Invert Binary Tree', difficulty: 'Easy', category: 'Trees', leetcode: 'https://leetcode.com/problems/invert-binary-tree/', description: 'Given the root of a binary tree, invert the tree, and return its root.', examples: ['Input: root = [4,2,7,1,3,6,9]\nOutput: [4,7,2,9,6,3,1]'] },
  '26': { title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', category: 'Trees', leetcode: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', description: "A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.", examples: ['Input: root = [3,9,20,null,null,15,7]\nOutput: 3'] },
  '27': { title: 'Same Tree', difficulty: 'Easy', category: 'Trees', leetcode: 'https://leetcode.com/problems/same-tree/', description: 'Given the roots of two binary trees p and q, write a function to check if they are the same or not.', examples: ['Input: p = [1,2,3], q = [1,2,3]\nOutput: true'] },
  '28': { title: 'Subtree of Another Tree', difficulty: 'Easy', category: 'Trees', leetcode: 'https://leetcode.com/problems/subtree-of-another-tree/', description: 'Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values of subRoot.', examples: ['Input: root = [3,4,5,1,2], subRoot = [4,1,2]\nOutput: true'] },
  '29': { title: 'Lowest Common Ancestor of BST', difficulty: 'Medium', category: 'Trees', leetcode: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', description: 'Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.', examples: ['Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8\nOutput: 6'] },
  '30': { title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', category: 'Trees', leetcode: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', description: 'Given the root of a binary tree, return the level order traversal of its nodes values (i.e., from left to right, level by level).', examples: ['Input: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]'] },
  '31': { title: 'Validate Binary Search Tree', difficulty: 'Medium', category: 'Trees', leetcode: 'https://leetcode.com/problems/validate-binary-search-tree/', description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST).', examples: ['Input: root = [2,1,3]\nOutput: true'] },
  '32': { title: 'Kth Smallest Element in a BST', difficulty: 'Medium', category: 'Trees', leetcode: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', description: 'Given the root of a BST, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.', examples: ['Input: root = [3,1,4,null,2], k = 1\nOutput: 1'] },
  '33': { title: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium', category: 'Trees', leetcode: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/', description: 'Given two integer arrays preorder and inorder where preorder is the preorder traversal and inorder is the inorder traversal of a binary tree, construct and return the binary tree.', examples: ['Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]\nOutput: [3,9,20,null,null,15,7]'] },
  '34': { title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', category: 'Trees', leetcode: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/', description: 'A path in a binary tree is a sequence of nodes where each pair of adjacent nodes has an edge. The path sum is the sum of the node values. Return the maximum path sum of any non-empty path.', examples: ['Input: root = [-10,9,20,null,null,15,7]\nOutput: 42'] },
  '35': { title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', category: 'Trees', leetcode: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/', description: 'Design an algorithm to serialize and deserialize a binary tree into a string and back.', examples: ['Input: root = [1,2,3,null,null,4,5]\nOutput: [1,2,3,null,null,4,5]'] },
  '36': { title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', category: 'Tries', leetcode: 'https://leetcode.com/problems/implement-trie-prefix-tree/', description: 'Implement a trie with insert, search, and startsWith methods.', examples: ['["Trie","insert","search","startsWith"]\n[[],["apple"],["apple"],["app"]]\nOutput: [null,null,true,true]'] },
  '37': { title: 'Design Add and Search Words', difficulty: 'Medium', category: 'Tries', leetcode: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/', description: 'Design a data structure that supports adding new words and finding if a string matches any previously added string. The search word can contain dots where a dot can match any letter.', examples: ['addWord("bad"), search("b..") → true'] },
  '38': { title: 'Word Search II', difficulty: 'Hard', category: 'Tries', leetcode: 'https://leetcode.com/problems/word-search-ii/', description: 'Given an m x n board of characters and a list of strings words, return all words on the board.', examples: ['Input: board = [["o","a","a","n"],["e","t","a","e"]], words = ["oath","eat"]\nOutput: ["eat","oath"]'] },
  '39': { title: 'Find Median from Data Stream', difficulty: 'Hard', category: 'Heap / Priority Queue', leetcode: 'https://leetcode.com/problems/find-median-from-data-stream/', description: 'Design a data structure that supports addNum(int num) to add an integer and findMedian() to return the median of all elements so far.', examples: ['addNum(1), addNum(2), findMedian() → 1.5, addNum(3), findMedian() → 2.0'] },
  '40': { title: 'Combination Sum', difficulty: 'Medium', category: 'Backtracking', leetcode: 'https://leetcode.com/problems/combination-sum/', description: 'Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen unlimited times.', examples: ['Input: candidates = [2,3,6,7], target = 7\nOutput: [[2,2,3],[7]]'] },
  '41': { title: 'Word Search', difficulty: 'Medium', category: 'Backtracking', leetcode: 'https://leetcode.com/problems/word-search/', description: 'Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells.', examples: ['Input: board = [["A","B","C","E"],["S","F","C","S"]], word = "ABCCED"\nOutput: true'] },
  '42': { title: 'Number of Islands', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/number-of-islands/', description: 'Given an m x n 2D binary grid which represents a map of 1s (land) and 0s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.', examples: ['Input: grid = [["1","1","0"],["0","1","0"],["0","0","1"]]\nOutput: 2'] },
  '43': { title: 'Clone Graph', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/clone-graph/', description: 'Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.', examples: ['Input: adjList = [[2,4],[1,3],[2,4],[1,3]]\nOutput: [[2,4],[1,3],[2,4],[1,3]]'] },
  '44': { title: 'Pacific Atlantic Water Flow', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/pacific-atlantic-water-flow/', description: 'Given an m x n matrix of non-negative integers representing heights, return a list of grid coordinates where water can flow to both the Pacific and Atlantic ocean.', examples: ['Input: heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1]]\nOutput: [[0,4],[1,3],[1,4],[2,2]]'] },
  '45': { title: 'Course Schedule', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/course-schedule/', description: 'There are numCourses courses labeled 0 to numCourses - 1. You are given prerequisites pairs. Return true if you can finish all courses.', examples: ['Input: numCourses = 2, prerequisites = [[1,0]]\nOutput: true'] },
  '46': { title: 'Graph Valid Tree', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/graph-valid-tree/', description: 'Given n nodes labeled from 0 to n-1 and a list of undirected edges, check whether these edges make up a valid tree.', examples: ['Input: n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]\nOutput: true'] },
  '47': { title: 'Number of Connected Components', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/', description: 'Given n nodes and a list of undirected edges, find the number of connected components in the graph.', examples: ['Input: n = 5, edges = [[0,1],[1,2],[3,4]]\nOutput: 2'] },
  '48': { title: 'Alien Dictionary', difficulty: 'Hard', category: 'Graphs', leetcode: 'https://leetcode.com/problems/alien-dictionary/', description: 'Given a sorted dictionary of an alien language, derive the order of characters in the language.', examples: ['Input: words = ["wrt","wrf","er","ett","rftt"]\nOutput: "wertf"'] },
  '49': { title: 'Climbing Stairs', difficulty: 'Easy', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/climbing-stairs/', description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?', examples: ['Input: n = 3\nOutput: 3\nExplanation: 1+1+1, 1+2, 2+1'] },
  '50': { title: 'House Robber', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/house-robber/', description: 'Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob without robbing two adjacent houses.', examples: ['Input: nums = [1,2,3,1]\nOutput: 4'] },
  '51': { title: 'House Robber II', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/house-robber-ii/', description: 'All houses are arranged in a circle. Return the maximum amount of money you can rob without robbing two adjacent houses.', examples: ['Input: nums = [2,3,2]\nOutput: 3'] },
  '52': { title: 'Longest Increasing Subsequence', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/longest-increasing-subsequence/', description: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.', examples: ['Input: nums = [10,9,2,5,3,7,101,18]\nOutput: 4'] },
  '53': { title: 'Coin Change', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/coin-change/', description: 'Given coins of different denominations and a total amount, return the fewest number of coins needed to make up that amount. Return -1 if impossible.', examples: ['Input: coins = [1,5,10], amount = 12\nOutput: 3'] },
  '54': { title: 'Word Break', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/word-break/', description: 'Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of dictionary words.', examples: ['Input: s = "leetcode", wordDict = ["leet","code"]\nOutput: true'] },
  '55': { title: 'Decode Ways', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/decode-ways/', description: 'A message containing letters A-Z can be encoded (A=1, B=2, ..., Z=26). Given a string s containing only digits, return the number of ways to decode it.', examples: ['Input: s = "226"\nOutput: 3\nExplanation: "BZ", "VF", "BBF"'] },
  '56': { title: 'Unique Paths', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/unique-paths/', description: 'A robot is located at the top-left corner of an m x n grid. It can only move either down or right. How many possible unique paths are there to reach the bottom-right corner?', examples: ['Input: m = 3, n = 7\nOutput: 28'] },
  '57': { title: 'Jump Game', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/jump-game/', description: 'Given an integer array nums where nums[i] represents max jump length from position i, return true if you can reach the last index.', examples: ['Input: nums = [2,3,1,1,4]\nOutput: true'] },
  '58': { title: 'Maximum Subarray', difficulty: 'Medium', category: 'Greedy', leetcode: 'https://leetcode.com/problems/maximum-subarray/', description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.', examples: ['Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1]'] },
  '59': { title: 'Maximum Product Subarray', difficulty: 'Medium', category: 'Greedy', leetcode: 'https://leetcode.com/problems/maximum-product-subarray/', description: 'Given an integer array nums, find a subarray that has the largest product, and return the product.', examples: ['Input: nums = [2,3,-2,4]\nOutput: 6'] },
  '60': { title: 'Insert Interval', difficulty: 'Medium', category: 'Intervals', leetcode: 'https://leetcode.com/problems/insert-interval/', description: 'Given a set of non-overlapping intervals sorted by start time, insert a new interval into the intervals (merge if necessary).', examples: ['Input: intervals = [[1,3],[6,9]], newInterval = [2,5]\nOutput: [[1,5],[6,9]]'] },
  '61': { title: 'Merge Intervals', difficulty: 'Medium', category: 'Intervals', leetcode: 'https://leetcode.com/problems/merge-intervals/', description: 'Given an array of intervals, merge all overlapping intervals, and return an array of the non-overlapping intervals.', examples: ['Input: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]'] },
  '62': { title: 'Non-overlapping Intervals', difficulty: 'Medium', category: 'Intervals', leetcode: 'https://leetcode.com/problems/non-overlapping-intervals/', description: 'Given an array of intervals, return the minimum number of intervals you need to remove to make the rest non-overlapping.', examples: ['Input: intervals = [[1,2],[2,3],[3,4],[1,3]]\nOutput: 1'] },
  '63': { title: 'Meeting Rooms', difficulty: 'Easy', category: 'Intervals', leetcode: 'https://leetcode.com/problems/meeting-rooms/', description: 'Given an array of meeting time intervals, determine if a person could attend all meetings.', examples: ['Input: intervals = [[0,30],[5,10],[15,20]]\nOutput: false'] },
  '64': { title: 'Meeting Rooms II', difficulty: 'Medium', category: 'Intervals', leetcode: 'https://leetcode.com/problems/meeting-rooms-ii/', description: 'Given an array of meeting time intervals, find the minimum number of conference rooms required.', examples: ['Input: intervals = [[0,30],[5,10],[15,20]]\nOutput: 2'] },
  '65': { title: 'Rotate Image', difficulty: 'Medium', category: 'Math & Geometry', leetcode: 'https://leetcode.com/problems/rotate-image/', description: 'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees clockwise. You have to rotate it in-place.', examples: ['Input: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [[7,4,1],[8,5,2],[9,6,3]]'] },
  '66': { title: 'Spiral Matrix', difficulty: 'Medium', category: 'Math & Geometry', leetcode: 'https://leetcode.com/problems/spiral-matrix/', description: 'Given an m x n matrix, return all elements of the matrix in spiral order.', examples: ['Input: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [1,2,3,6,9,8,7,4,5]'] },
  '67': { title: 'Set Matrix Zeroes', difficulty: 'Medium', category: 'Math & Geometry', leetcode: 'https://leetcode.com/problems/set-matrix-zeroes/', description: 'Given an m x n integer matrix, if an element is 0, set its entire row and column to 0. You must do it in place.', examples: ['Input: matrix = [[1,1,1],[1,0,1],[1,1,1]]\nOutput: [[1,0,1],[0,0,0],[1,0,1]]'] },
  '68': { title: 'Number of 1 Bits', difficulty: 'Easy', category: 'Bit Manipulation', leetcode: 'https://leetcode.com/problems/number-of-1-bits/', description: "Write a function that takes the binary representation of a positive integer and returns the number of '1' bits it has (Hamming weight).", examples: ['Input: n = 11 (1011)\nOutput: 3'] },
  '69': { title: 'Counting Bits', difficulty: 'Easy', category: 'Bit Manipulation', leetcode: 'https://leetcode.com/problems/counting-bits/', description: 'Given an integer n, return an array ans of length n + 1 such that ans[i] is the number of 1s in the binary representation of i.', examples: ['Input: n = 5\nOutput: [0,1,1,2,1,2]'] },
  '70': { title: 'Reverse Bits', difficulty: 'Easy', category: 'Bit Manipulation', leetcode: 'https://leetcode.com/problems/reverse-bits/', description: 'Reverse bits of a given 32 bits unsigned integer.', examples: ['Input: n = 43261596\nOutput: 964176192'] },
  '71': { title: 'Missing Number', difficulty: 'Easy', category: 'Bit Manipulation', leetcode: 'https://leetcode.com/problems/missing-number/', description: 'Given an array nums containing n distinct numbers in the range [0, n], return the only number in the range that is missing from the array.', examples: ['Input: nums = [3,0,1]\nOutput: 2'] },
  '72': { title: 'Sum of Two Integers', difficulty: 'Medium', category: 'Bit Manipulation', leetcode: 'https://leetcode.com/problems/sum-of-two-integers/', description: 'Given two integers a and b, return the sum of the two integers without using the operators + and -.', examples: ['Input: a = 1, b = 2\nOutput: 3'] },
  '73': { title: 'Task Scheduler', difficulty: 'Medium', category: 'Advanced', leetcode: 'https://leetcode.com/problems/task-scheduler/', description: 'Given a characters array tasks and a non-negative integer n representing the cooldown period, return the least number of units of time that the CPU will take to finish all tasks.', examples: ['Input: tasks = ["A","A","A","B","B","B"], n = 2\nOutput: 8'] },
  '74': { title: 'Palindromic Substrings', difficulty: 'Medium', category: 'Advanced', leetcode: 'https://leetcode.com/problems/palindromic-substrings/', description: 'Given a string s, return the number of palindromic substrings in it. A substring is palindromic if it reads the same backward.', examples: ['Input: s = "aaa"\nOutput: 6\nExplanation: "a","a","a","aa","aa","aaa"'] },
  '75': { title: 'Longest Common Subsequence', difficulty: 'Medium', category: 'Advanced', leetcode: 'https://leetcode.com/problems/longest-common-subsequence/', description: 'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.', examples: ['Input: text1 = "abcde", text2 = "ace"\nOutput: 3'] },
};

const DIFF_COLORS: Record<string, string> = { Easy: '#059669', Medium: '#d97706', Hard: '#dc2626' };

const STARTER_CODE: Record<Language, (title: string) => string> = {
  python: (t) => `# ${t}\n# Write your solution here\n\ndef solution():\n    pass\n\n# Test\nprint(solution())\n`,
  javascript: (t) => `// ${t}\n// Write your solution here\n\nfunction solution() {\n  \n}\n\n// Test\nconsole.log(solution());\n`,
  java: (t) => `// ${t}\n\nclass Solution {\n    public void solve() {\n        \n    }\n\n    public static void main(String[] args) {\n        new Solution().solve();\n    }\n}\n`,
  cpp: (t) => `// ${t}\n\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n\nint main() {\n    Solution().solve();\n    return 0;\n}\n`,
  go: (t) => `// ${t}\n\npackage main\n\nimport "fmt"\n\nfunc solution() {\n\tfmt.Println("solution")\n}\n\nfunc main() {\n\tsolution()\n}\n`,
  csharp: (t) => `// ${t}\n\nusing System;\n\nclass Solution {\n    static void Main() {\n        \n    }\n}\n`,
};

export default function Blind75PracticePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { token } = useAuth();

  const isSolutionRoute = location.pathname.endsWith('/solution');
  const [activeTab, setActiveTab] = useState<'practice' | 'solution'>(isSolutionRoute ? 'solution' : 'practice');
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [solution, setSolution] = useState('');
  const [isSolving, setIsSolving] = useState(false);

  const problem = id ? PROBLEMS[id] : null;

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setCode(STARTER_CODE[language](problem?.title || 'Solution')); setOutput(''); }, [language, problem?.title]);
  useEffect(() => {
    if (isSolutionRoute && !solution && !isSolving) getSolution();
  }, [isSolutionRoute]);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const runCode = async () => {
    if (!token) { setOutput('Please sign in to run code.'); return; }
    setIsRunning(true); setOutput('Running...');
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/run`, { method: 'POST', headers, body: JSON.stringify({ code, language, input: '' }) });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setOutput(data.output || data.stdout || data.stderr || 'No output');
    } catch (err: any) { setOutput(`Error: ${err.message}`); }
    finally { setIsRunning(false); }
  };

  const getSolution = async () => {
    if (!token) { setSolution('Please sign in to generate AI solutions.'); setActiveTab('solution'); return; }
    setIsSolving(true); setSolution(''); setActiveTab('solution');
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/solve/stream`, { method: 'POST', headers, body: JSON.stringify({ problem: problem?.title || `Problem #${id}`, language }) });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setSolution(result);
      }
    } catch (err: any) { setSolution(`Error: ${err.message}`); }
    finally { setIsSolving(false); }
  };

  if (!problem) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Problem not found</h2>
          <Link to="/blind75" style={{ color: '#10b981', fontSize: 14, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>← Back to Blind 75</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/blind75" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#6b7280', fontSize: 13, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Blind 75
          </Link>
          <div style={{ width: 1, height: 18, background: '#e5e7eb' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{problem.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, color: DIFF_COLORS[problem.difficulty], background: `${DIFF_COLORS[problem.difficulty]}12` }}>
            {problem.difficulty}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{problem.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setActiveTab('practice')} style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: activeTab === 'practice' ? '#111827' : '#f3f4f6', color: activeTab === 'practice' ? '#fff' : '#6b7280' }}>Practice</button>
          <button onClick={() => { setActiveTab('solution'); if (!solution && !isSolving) getSolution(); }} style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: activeTab === 'solution' ? '#818cf8' : '#f3f4f6', color: activeTab === 'solution' ? '#fff' : '#6b7280' }}>Solution</button>
          <a href={problem.leetcode} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 500, padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            LeetCode <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>

      {activeTab === 'practice' ? (
        /* ═══ PRACTICE ═══ */
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Problem */}
          <div style={{ width: '40%', borderRight: '1px solid #e5e7eb', overflow: 'auto', padding: '28px 24px', background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{problem.category}</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 16px 0' }}>{problem.title}</h1>
            <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 24 }}>{problem.description}</div>

            {problem.examples.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Examples</div>
                {problem.examples.map((ex, i) => (
                  <pre key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#374151', marginBottom: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ex}</pre>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>Approach Hints</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#065f46', fontSize: 13, lineHeight: 1.8 }}>
                <li>Think about time vs space complexity tradeoffs</li>
                <li>Consider edge cases: empty input, single element, duplicates</li>
                <li>Can you use a hash map to optimize?</li>
              </ul>
            </div>
          </div>

          {/* Right: Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #333', background: '#252526' }}>
              <select value={language} onChange={e => setLanguage(e.target.value as Language)}
                style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6, border: '1px solid #444', background: '#1e1e1e', color: '#ccc', outline: 'none' }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={runCode} disabled={isRunning}
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', background: '#10b981', color: '#fff', cursor: isRunning ? 'wait' : 'pointer' }}>
                  {isRunning ? 'Running...' : '▶ Run Code'}
                </button>
                <button onClick={getSolution} disabled={isSolving}
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', background: '#818cf8', color: '#fff', cursor: isSolving ? 'wait' : 'pointer' }}>
                  {isSolving ? 'Solving...' : 'AI Solution'}
                </button>
              </div>
            </div>
            {/* Editor */}
            <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false}
              style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', padding: 16, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14, lineHeight: 1.6, background: '#1e1e1e', color: '#d4d4d4', tabSize: 2, minHeight: 300 }} />
            {/* Output */}
            <div style={{ borderTop: '1px solid #333', background: '#1a1a1a', padding: 12, minHeight: 80, maxHeight: 200, overflow: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>OUTPUT</div>
              <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: output.startsWith('Error') ? '#ef4444' : '#10b981', whiteSpace: 'pre-wrap' }}>
                {output || 'Click "Run Code" to execute'}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* ═══ SOLUTION ═══ */
        <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Solution — {LANG_LABELS[language]}</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '4px 0 0' }}>{problem.title}</h2>
              </div>
              <select value={language} onChange={e => { setLanguage(e.target.value as Language); setSolution(''); setTimeout(getSolution, 100); }}
                style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151' }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
              </select>
            </div>

            {!solution && !isSolving ? (
              <div style={{ textAlign: 'center', padding: 48, background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                <p style={{ color: '#9ca3af', fontSize: 15, marginBottom: 16 }}>Generate an AI-powered solution with multiple approaches</p>
                <button onClick={getSolution} style={{ fontSize: 14, fontWeight: 600, padding: '10px 28px', borderRadius: 10, border: 'none', background: '#818cf8', color: '#fff', cursor: 'pointer' }}>
                  Generate Solution
                </button>
              </div>
            ) : (
              <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <pre style={{ margin: 0, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {solution || 'Generating...'}
                </pre>
              </div>
            )}

            <button onClick={() => setActiveTab('practice')} style={{ marginTop: 20, fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>
              ← Back to Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
