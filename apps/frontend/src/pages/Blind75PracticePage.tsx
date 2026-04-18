import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'go', 'csharp'] as const;
type Language = typeof LANGUAGES[number];
const LANG_LABELS: Record<Language, string> = { python: 'Python3', javascript: 'JavaScript', java: 'Java', cpp: 'C++', go: 'Go', csharp: 'C#' };

/* ── Static solutions for the first 20 key problems ── */
type SolutionApproach = {
  name: string;
  description: string;
  code: Record<string, string>;
  complexity: { time: string; space: string };
  keyPoints: string[];
};
type SolutionData = { approaches: SolutionApproach[] };

export const SOLUTIONS: Record<string, SolutionData> = {
  '1': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every pair of numbers to see if they add up to the target.',
        code: {
          python: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]`,
          javascript: `function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
        }
    }
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Simple nested loop', 'Checks all pairs', 'No extra space needed'],
      },
      {
        name: 'Hash Map (Optimal)',
        description: 'Use a hash map to store seen values and their indices. For each number, check if its complement exists in the map.',
        code: {
          python: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i`,
          javascript: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) return [map.get(complement), i];
        map.set(nums[i], i);
    }
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Single pass through array', 'Trade space for time', 'Hash map lookup is O(1)'],
      },
    ],
  },
  '2': {
    approaches: [
      {
        name: 'Brute Force (Sort)',
        description: 'Sort the array and check adjacent elements for duplicates.',
        code: {
          python: `from typing import List

class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        nums.sort()
        for i in range(1, len(nums)):
            if nums[i] == nums[i - 1]:
                return True
        return False`,
          javascript: `function containsDuplicate(nums) {
    nums.sort((a, b) => a - b);
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === nums[i - 1]) return true;
    }
    return false;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(1)' },
        keyPoints: ['Sort first, then linear scan', 'Modifies original array', 'No extra space if in-place sort'],
      },
      {
        name: 'Hash Set (Optimal)',
        description: 'Use a set to track seen numbers. If a number is already in the set, we have a duplicate.',
        code: {
          python: `from typing import List

class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        return len(nums) != len(set(nums))`,
          javascript: `function containsDuplicate(nums) {
    return new Set(nums).size !== nums.length;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Set stores unique values', 'One-liner possible', 'Early exit possible with manual loop'],
      },
    ],
  },
  '3': {
    approaches: [
      {
        name: 'Sorting',
        description: 'Sort both strings and compare. Anagrams will produce the same sorted string.',
        code: {
          python: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return sorted(s) == sorted(t)`,
          javascript: `function isAnagram(s, t) {
    return s.split('').sort().join('') === t.split('').sort().join('');
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Anagrams have same sorted form', 'Simple and readable', 'Sorting dominates complexity'],
      },
      {
        name: 'Character Count (Optimal)',
        description: 'Count character frequencies in both strings. They must match for anagrams.',
        code: {
          python: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False
        count = {}
        for c in s:
            count[c] = count.get(c, 0) + 1
        for c in t:
            count[c] = count.get(c, 0) - 1
            if count[c] < 0:
                return False
        return True`,
          javascript: `function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    const count = {};
    for (const c of s) count[c] = (count[c] || 0) + 1;
    for (const c of t) {
        if (!count[c]) return false;
        count[c]--;
    }
    return true;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Fixed alphabet size means O(1) space', 'Length check is a quick early exit', 'Single counter with increment/decrement'],
      },
    ],
  },
  '12': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every pair of buy and sell days to find the maximum profit.',
        code: {
          python: `def maxProfit(prices):
    max_profit = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            max_profit = max(max_profit, prices[j] - prices[i])
    return max_profit`,
          javascript: `function maxProfit(prices) {
    let maxProfit = 0;
    for (let i = 0; i < prices.length; i++) {
        for (let j = i + 1; j < prices.length; j++) {
            maxProfit = Math.max(maxProfit, prices[j] - prices[i]);
        }
    }
    return maxProfit;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Try all pairs of buy/sell days', 'Simple but slow', 'Guaranteed to find optimal'],
      },
      {
        name: 'One Pass (Optimal)',
        description: 'Track the minimum price seen so far and the maximum profit at each step.',
        code: {
          python: `def maxProfit(prices):
    min_price = float('inf')
    max_profit = 0
    for price in prices:
        min_price = min(min_price, price)
        max_profit = max(max_profit, price - min_price)
    return max_profit`,
          javascript: `function maxProfit(prices) {
    let minPrice = Infinity;
    let maxProfit = 0;
    for (const price of prices) {
        minPrice = Math.min(minPrice, price);
        maxProfit = Math.max(maxProfit, price - minPrice);
    }
    return maxProfit;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Track running minimum price', 'Calculate profit at each step', 'Kadane-like approach'],
      },
    ],
  },
  '16': {
    approaches: [
      {
        name: 'Brute Force (String Replace)',
        description: 'Replace matching pairs repeatedly until no more matches are found.',
        code: {
          python: `def isValid(s):
    while '()' in s or '[]' in s or '{}' in s:
        s = s.replace('()', '').replace('[]', '').replace('{}', '')
    return s == ''`,
          javascript: `function isValid(s) {
    while (s.includes('()') || s.includes('[]') || s.includes('{}')) {
        s = s.replace('()', '').replace('[]', '').replace('{}', '');
    }
    return s === '';
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(n)' },
        keyPoints: ['Repeatedly remove matching pairs', 'Simple but inefficient', 'Creates new strings each iteration'],
      },
      {
        name: 'Stack (Optimal)',
        description: 'Use a stack: push opening brackets, pop and match for closing brackets.',
        code: {
          python: `def isValid(s):
    stack = []
    mapping = {')': '(', ']': '[', '}': '{'}
    for char in s:
        if char in mapping:
            if not stack or stack[-1] != mapping[char]:
                return False
            stack.pop()
        else:
            stack.append(char)
    return len(stack) == 0`,
          javascript: `function isValid(s) {
    const stack = [];
    const map = { ')': '(', ']': '[', '}': '{' };
    for (const char of s) {
        if (map[char]) {
            if (stack.pop() !== map[char]) return false;
        } else {
            stack.push(char);
        }
    }
    return stack.length === 0;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Stack LIFO matches bracket nesting', 'Map closing to opening brackets', 'Stack must be empty at end'],
      },
    ],
  },
  '58': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every possible subarray and compute its sum.',
        code: {
          python: `def maxSubArray(nums):
    max_sum = float('-inf')
    for i in range(len(nums)):
        current = 0
        for j in range(i, len(nums)):
            current += nums[j]
            max_sum = max(max_sum, current)
    return max_sum`,
          javascript: `function maxSubArray(nums) {
    let maxSum = -Infinity;
    for (let i = 0; i < nums.length; i++) {
        let current = 0;
        for (let j = i; j < nums.length; j++) {
            current += nums[j];
            maxSum = Math.max(maxSum, current);
        }
    }
    return maxSum;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Try all subarrays', 'Running sum avoids triple loop', 'Simple but slow for large inputs'],
      },
      {
        name: "Kadane's Algorithm (Optimal)",
        description: 'Track the maximum subarray sum ending at each position. Reset to current element when running sum becomes negative.',
        code: {
          python: `def maxSubArray(nums):
    max_sum = current = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        max_sum = max(max_sum, current)
    return max_sum`,
          javascript: `function maxSubArray(nums) {
    let maxSum = nums[0];
    let current = nums[0];
    for (let i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i]);
        maxSum = Math.max(maxSum, current);
    }
    return maxSum;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ["Kadane's algorithm is a classic DP approach", 'Decide at each step: extend or restart', 'Only need to track current and global max'],
      },
    ],
  },
  '61': {
    approaches: [
      {
        name: 'Brute Force (Compare All Pairs)',
        description: 'Compare every pair of intervals and merge overlapping ones iteratively.',
        code: {
          python: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for current in intervals[1:]:
        if current[0] <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], current[1])
        else:
            merged.append(current)
    return merged`,
          javascript: `function merge(intervals) {
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        if (intervals[i][0] <= last[1]) {
            last[1] = Math.max(last[1], intervals[i][1]);
        } else {
            merged.push(intervals[i]);
        }
    }
    return merged;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Sort by start time first', 'Merge if current start <= previous end', 'This is already the optimal approach'],
      },
      {
        name: 'Sort and Merge (Optimal)',
        description: 'Sort intervals by start time, then iterate and merge overlapping intervals into the result.',
        code: {
          python: `def merge(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    result = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])
    return result`,
          javascript: `function merge(intervals) {
    if (!intervals.length) return [];
    intervals.sort((a, b) => a[0] - b[0]);
    const result = [intervals[0]];
    for (const [start, end] of intervals.slice(1)) {
        const last = result[result.length - 1];
        if (start <= last[1]) {
            last[1] = Math.max(last[1], end);
        } else {
            result.push([start, end]);
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Sorting is the key insight', 'After sorting, one pass suffices', 'Update end of last merged interval'],
      },
    ],
  },
  '19': {
    approaches: [
      {
        name: 'Iterative',
        description: 'Reverse the linked list by iterating through nodes and reversing pointers one by one.',
        code: {
          python: `def reverseList(head):
    prev = None
    current = head
    while current:
        next_node = current.next
        current.next = prev
        prev = current
        current = next_node
    return prev`,
          javascript: `function reverseList(head) {
    let prev = null;
    let current = head;
    while (current) {
        const next = current.next;
        current.next = prev;
        prev = current;
        current = next;
    }
    return prev;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Three pointers: prev, current, next', 'Reverse one link at a time', 'prev becomes the new head'],
      },
      {
        name: 'Recursive',
        description: 'Recursively reverse the rest of the list, then fix the current node pointer.',
        code: {
          python: `def reverseList(head):
    if not head or not head.next:
        return head
    new_head = reverseList(head.next)
    head.next.next = head
    head.next = None
    return new_head`,
          javascript: `function reverseList(head) {
    if (!head || !head.next) return head;
    const newHead = reverseList(head.next);
    head.next.next = head;
    head.next = null;
    return newHead;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Base case: empty or single node', 'Recursive call returns new head', 'Fix pointers after recursion returns'],
      },
    ],
  },
  '21': {
    approaches: [
      {
        name: 'Hash Set',
        description: 'Store visited nodes in a set. If we visit a node already in the set, there is a cycle.',
        code: {
          python: `def hasCycle(head):
    visited = set()
    current = head
    while current:
        if current in visited:
            return True
        visited.add(current)
        current = current.next
    return False`,
          javascript: `function hasCycle(head) {
    const visited = new Set();
    let current = head;
    while (current) {
        if (visited.has(current)) return true;
        visited.add(current);
        current = current.next;
    }
    return false;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Track visited nodes', 'If node seen again, cycle exists', 'Uses extra space for the set'],
      },
      {
        name: "Floyd's Cycle Detection (Optimal)",
        description: 'Use two pointers: slow moves 1 step, fast moves 2 steps. If they meet, there is a cycle.',
        code: {
          python: `def hasCycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False`,
          javascript: `function hasCycle(head) {
    let slow = head, fast = head;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ["Also called tortoise and hare algorithm", 'Fast pointer catches slow if cycle exists', 'No extra space needed'],
      },
    ],
  },
  '25': {
    approaches: [
      {
        name: 'Recursive (DFS)',
        description: 'Recursively invert left and right subtrees, then swap them.',
        code: {
          python: `def invertTree(root):
    if not root:
        return None
    root.left, root.right = invertTree(root.right), invertTree(root.left)
    return root`,
          javascript: `function invertTree(root) {
    if (!root) return null;
    const left = invertTree(root.left);
    const right = invertTree(root.right);
    root.left = right;
    root.right = left;
    return root;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(h)' },
        keyPoints: ['Visit every node once', 'Swap children at each node', 'Space is O(h) for recursion stack, where h is height'],
      },
      {
        name: 'Iterative (BFS)',
        description: 'Use a queue for level-order traversal, swapping children at each node.',
        code: {
          python: `from collections import deque

def invertTree(root):
    if not root:
        return None
    queue = deque([root])
    while queue:
        node = queue.popleft()
        node.left, node.right = node.right, node.left
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return root`,
          javascript: `function invertTree(root) {
    if (!root) return null;
    const queue = [root];
    while (queue.length) {
        const node = queue.shift();
        [node.left, node.right] = [node.right, node.left];
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
    }
    return root;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['BFS with queue', 'Swap children level by level', 'Queue holds at most one level of nodes'],
      },
    ],
  },
  '26': {
    approaches: [
      {
        name: 'Recursive (DFS)',
        description: 'The depth of a node is 1 + max depth of its children. Use recursion.',
        code: {
          python: `def maxDepth(root):
    if not root:
        return 0
    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,
          javascript: `function maxDepth(root) {
    if (!root) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
        },
        complexity: { time: 'O(n)', space: 'O(h)' },
        keyPoints: ['Classic tree recursion', 'Base case: null node has depth 0', 'Space is O(h) for call stack'],
      },
      {
        name: 'Iterative (BFS)',
        description: 'Use BFS level-order traversal and count the number of levels.',
        code: {
          python: `from collections import deque

def maxDepth(root):
    if not root:
        return 0
    queue = deque([root])
    depth = 0
    while queue:
        depth += 1
        for _ in range(len(queue)):
            node = queue.popleft()
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return depth`,
          javascript: `function maxDepth(root) {
    if (!root) return 0;
    const queue = [root];
    let depth = 0;
    while (queue.length) {
        depth++;
        const size = queue.length;
        for (let i = 0; i < size; i++) {
            const node = queue.shift();
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }
    return depth;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Process one level at a time', 'Count levels as depth', 'Queue size equals level width'],
      },
    ],
  },
  '49': {
    approaches: [
      {
        name: 'Recursive',
        description: 'The number of ways to reach step n is the sum of ways to reach step n-1 and step n-2 (Fibonacci).',
        code: {
          python: `def climbStairs(n):
    if n <= 2:
        return n
    return climbStairs(n - 1) + climbStairs(n - 2)`,
          javascript: `function climbStairs(n) {
    if (n <= 2) return n;
    return climbStairs(n - 1) + climbStairs(n - 2);
}`,
        },
        complexity: { time: 'O(2^n)', space: 'O(n)' },
        keyPoints: ['Same as Fibonacci sequence', 'Exponential time due to repeated subproblems', 'Good for understanding the recurrence'],
      },
      {
        name: 'Dynamic Programming (Optimal)',
        description: 'Use bottom-up DP with just two variables to compute the Fibonacci-like sequence.',
        code: {
          python: `def climbStairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`,
          javascript: `function climbStairs(n) {
    if (n <= 2) return n;
    let a = 1, b = 2;
    for (let i = 3; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Bottom-up Fibonacci', 'Only need two previous values', 'Space-optimized DP'],
      },
    ],
  },
  '50': {
    approaches: [
      {
        name: 'Recursive',
        description: 'At each house, choose to rob it (skip previous) or skip it. Try all combinations.',
        code: {
          python: `def rob(nums):
    def helper(i):
        if i < 0:
            return 0
        return max(helper(i - 1), helper(i - 2) + nums[i])
    return helper(len(nums) - 1)`,
          javascript: `function rob(nums) {
    function helper(i) {
        if (i < 0) return 0;
        return Math.max(helper(i - 1), helper(i - 2) + nums[i]);
    }
    return helper(nums.length - 1);
}`,
        },
        complexity: { time: 'O(2^n)', space: 'O(n)' },
        keyPoints: ['At each house: rob or skip', 'Overlapping subproblems', 'Can be memoized for O(n)'],
      },
      {
        name: 'Dynamic Programming (Optimal)',
        description: 'Use two variables to track the max profit including/excluding the current house.',
        code: {
          python: `def rob(nums):
    prev1 = prev2 = 0
    for num in nums:
        prev1, prev2 = max(prev1, prev2 + num), prev1
    return prev1`,
          javascript: `function rob(nums) {
    let prev1 = 0, prev2 = 0;
    for (const num of nums) {
        const temp = Math.max(prev1, prev2 + num);
        prev2 = prev1;
        prev1 = temp;
    }
    return prev1;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['dp[i] = max(dp[i-1], dp[i-2] + nums[i])', 'Only need two previous values', 'Classic space-optimized DP'],
      },
    ],
  },
  '53': {
    approaches: [
      {
        name: 'Recursive (Top-Down)',
        description: 'For each amount, try every coin and find the minimum number of coins needed.',
        code: {
          python: `def coinChange(coins, amount):
    memo = {}
    def dp(remaining):
        if remaining == 0:
            return 0
        if remaining < 0:
            return float('inf')
        if remaining in memo:
            return memo[remaining]
        result = float('inf')
        for coin in coins:
            result = min(result, dp(remaining - coin) + 1)
        memo[remaining] = result
        return result
    ans = dp(amount)
    return ans if ans != float('inf') else -1`,
          javascript: `function coinChange(coins, amount) {
    const memo = {};
    function dp(remaining) {
        if (remaining === 0) return 0;
        if (remaining < 0) return Infinity;
        if (memo[remaining] !== undefined) return memo[remaining];
        let result = Infinity;
        for (const coin of coins) {
            result = Math.min(result, dp(remaining - coin) + 1);
        }
        return memo[remaining] = result;
    }
    const ans = dp(amount);
    return ans === Infinity ? -1 : ans;
}`,
        },
        complexity: { time: 'O(amount * coins)', space: 'O(amount)' },
        keyPoints: ['Memoized recursion', 'Try each coin denomination', 'Return -1 if impossible'],
      },
      {
        name: 'Bottom-Up DP (Optimal)',
        description: 'Build a DP table where dp[i] is the minimum coins needed for amount i.',
        code: {
          python: `def coinChange(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i:
                dp[i] = min(dp[i], dp[i - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
          javascript: `function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
        for (const coin of coins) {
            if (coin <= i) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
}`,
        },
        complexity: { time: 'O(amount * coins)', space: 'O(amount)' },
        keyPoints: ['Classic unbounded knapsack variant', 'Build solution from smaller amounts', 'dp[0] = 0 is the base case'],
      },
    ],
  },
  '42': {
    approaches: [
      {
        name: 'DFS (Recursive)',
        description: 'For each unvisited land cell, run DFS to mark the entire island as visited. Count how many times DFS is triggered.',
        code: {
          python: `def numIslands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
            return
        grid[r][c] = '0'  # mark visited
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count`,
          javascript: `function numIslands(grid) {
    if (!grid.length) return 0;
    const rows = grid.length, cols = grid[0].length;
    let count = 0;

    function dfs(r, c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') return;
        grid[r][c] = '0';
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                count++;
                dfs(r, c);
            }
        }
    }
    return count;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(m * n)' },
        keyPoints: ['DFS flood fill from each land cell', 'Mark visited by changing to 0', 'Each cell visited at most once'],
      },
      {
        name: 'BFS',
        description: 'Use BFS from each unvisited land cell to explore the entire island.',
        code: {
          python: `from collections import deque

def numIslands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                queue = deque([(r, c)])
                grid[r][c] = '0'
                while queue:
                    cr, cc = queue.popleft()
                    for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == '1':
                            grid[nr][nc] = '0'
                            queue.append((nr, nc))
    return count`,
          javascript: `function numIslands(grid) {
    if (!grid.length) return 0;
    const rows = grid.length, cols = grid[0].length;
    let count = 0;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                count++;
                const queue = [[r, c]];
                grid[r][c] = '0';
                while (queue.length) {
                    const [cr, cc] = queue.shift();
                    for (const [dr, dc] of dirs) {
                        const nr = cr + dr, nc = cc + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === '1') {
                            grid[nr][nc] = '0';
                            queue.push([nr, nc]);
                        }
                    }
                }
            }
        }
    }
    return count;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(min(m, n))' },
        keyPoints: ['BFS explores level by level', 'Queue size bounded by grid perimeter', 'Same time complexity as DFS'],
      },
    ],
  },
  '13': {
    approaches: [
      {
        name: 'Brute Force (Check All Substrings)',
        description: 'Check every substring to see if it has all unique characters.',
        code: {
          python: `def lengthOfLongestSubstring(s):
    result = 0
    for i in range(len(s)):
        seen = set()
        for j in range(i, len(s)):
            if s[j] in seen:
                break
            seen.add(s[j])
            result = max(result, j - i + 1)
    return result`,
          javascript: `function lengthOfLongestSubstring(s) {
    let result = 0;
    for (let i = 0; i < s.length; i++) {
        const seen = new Set();
        for (let j = i; j < s.length; j++) {
            if (seen.has(s[j])) break;
            seen.add(s[j]);
            result = Math.max(result, j - i + 1);
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(min(n, m))' },
        keyPoints: ['Check every starting position', 'Expand until duplicate found', 'm is the character set size'],
      },
      {
        name: 'Sliding Window (Optimal)',
        description: 'Use a sliding window with a set. Expand right; when duplicate found, shrink from left.',
        code: {
          python: `def lengthOfLongestSubstring(s):
    seen = {}
    left = result = 0
    for right, char in enumerate(s):
        if char in seen and seen[char] >= left:
            left = seen[char] + 1
        seen[char] = right
        result = max(result, right - left + 1)
    return result`,
          javascript: `function lengthOfLongestSubstring(s) {
    const seen = new Map();
    let left = 0, result = 0;
    for (let right = 0; right < s.length; right++) {
        if (seen.has(s[right]) && seen.get(s[right]) >= left) {
            left = seen.get(s[right]) + 1;
        }
        seen.set(s[right], right);
        result = Math.max(result, right - left + 1);
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(min(n, m))' },
        keyPoints: ['Sliding window pattern', 'Map stores last index of each char', 'Jump left pointer past duplicate'],
      },
    ],
  },
  '6': {
    approaches: [
      {
        name: 'Brute Force (Division)',
        description: 'Compute total product and divide by each element. Handle zeros carefully.',
        code: {
          python: `from typing import List

class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        result = [1] * n
        for i in range(n):
            product = 1
            for j in range(n):
                if i != j:
                    product *= nums[j]
            result[i] = product
        return result`,
          javascript: `function productExceptSelf(nums) {
    const result = [];
    for (let i = 0; i < nums.length; i++) {
        let product = 1;
        for (let j = 0; j < nums.length; j++) {
            if (i !== j) product *= nums[j];
        }
        result.push(product);
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Multiply all elements except self', 'No division used', 'Simple but slow'],
      },
      {
        name: 'Prefix and Suffix Products (Optimal)',
        description: 'For each position, the answer is left product * right product. Compute in two passes.',
        code: {
          python: `from typing import List

class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        result = [1] * n
        prefix = 1
        for i in range(n):
            result[i] = prefix
            prefix *= nums[i]
        suffix = 1
        for i in range(n - 1, -1, -1):
            result[i] *= suffix
            suffix *= nums[i]
        return result`,
          javascript: `function productExceptSelf(nums) {
    const n = nums.length;
    const result = new Array(n).fill(1);
    let prefix = 1;
    for (let i = 0; i < n; i++) {
        result[i] = prefix;
        prefix *= nums[i];
    }
    let suffix = 1;
    for (let i = n - 1; i >= 0; i--) {
        result[i] *= suffix;
        suffix *= nums[i];
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Left pass builds prefix products', 'Right pass multiplies suffix products', 'Output array does not count as extra space'],
      },
    ],
  },
  '10': {
    approaches: [
      {
        name: 'Brute Force (Sort + Two Loops)',
        description: 'Sort the array. For each element, use two nested loops to find triplets that sum to zero.',
        code: {
          python: `from typing import List

class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        result = []
        for i in range(len(nums) - 2):
            if i > 0 and nums[i] == nums[i - 1]:
                continue
            for j in range(i + 1, len(nums) - 1):
                if j > i + 1 and nums[j] == nums[j - 1]:
                    continue
                for k in range(j + 1, len(nums)):
                    if k > j + 1 and nums[k] == nums[k - 1]:
                        continue
                    if nums[i] + nums[j] + nums[k] == 0:
                        result.append([nums[i], nums[j], nums[k]])
        return result`,
          javascript: `function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        for (let j = i + 1; j < nums.length - 1; j++) {
            if (j > i + 1 && nums[j] === nums[j - 1]) continue;
            for (let k = j + 1; k < nums.length; k++) {
                if (k > j + 1 && nums[k] === nums[k - 1]) continue;
                if (nums[i] + nums[j] + nums[k] === 0) {
                    result.push([nums[i], nums[j], nums[k]]);
                }
            }
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B3)', space: 'O(1)' },
        keyPoints: ['Three nested loops', 'Skip duplicates at each level', 'Sort first to enable dedup'],
      },
      {
        name: 'Sort + Two Pointers (Optimal)',
        description: 'Sort the array. Fix one element, then use two pointers on the rest to find pairs that sum to its negative.',
        code: {
          python: `from typing import List

class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        result = []
        for i in range(len(nums) - 2):
            if i > 0 and nums[i] == nums[i - 1]:
                continue
            left, right = i + 1, len(nums) - 1
            while left < right:
                total = nums[i] + nums[left] + nums[right]
                if total < 0:
                    left += 1
                elif total > 0:
                    right -= 1
                else:
                    result.append([nums[i], nums[left], nums[right]])
                    while left < right and nums[left] == nums[left + 1]:
                        left += 1
                    while left < right and nums[right] == nums[right - 1]:
                        right -= 1
                    left += 1
                    right -= 1
        return result`,
          javascript: `function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        let left = i + 1, right = nums.length - 1;
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            if (sum < 0) left++;
            else if (sum > 0) right--;
            else {
                result.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;
                left++;
                right--;
            }
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Reduces to Two Sum with two pointers', 'Sort enables pointer movement logic', 'Skip duplicates to avoid repeated triplets'],
      },
    ],
  },
  '11': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every pair of lines and compute the area between them.',
        code: {
          python: `def maxArea(height):
    max_water = 0
    for i in range(len(height)):
        for j in range(i + 1, len(height)):
            area = min(height[i], height[j]) * (j - i)
            max_water = max(max_water, area)
    return max_water`,
          javascript: `function maxArea(height) {
    let maxWater = 0;
    for (let i = 0; i < height.length; i++) {
        for (let j = i + 1; j < height.length; j++) {
            const area = Math.min(height[i], height[j]) * (j - i);
            maxWater = Math.max(maxWater, area);
        }
    }
    return maxWater;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Try all pairs of lines', 'Area = min(h1, h2) * width', 'Simple but too slow for large inputs'],
      },
      {
        name: 'Two Pointers (Optimal)',
        description: 'Start with widest container (left and right edges). Move the shorter line inward.',
        code: {
          python: `def maxArea(height):
    left, right = 0, len(height) - 1
    max_water = 0
    while left < right:
        area = min(height[left], height[right]) * (right - left)
        max_water = max(max_water, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water`,
          javascript: `function maxArea(height) {
    let left = 0, right = height.length - 1;
    let maxWater = 0;
    while (left < right) {
        const area = Math.min(height[left], height[right]) * (right - left);
        maxWater = Math.max(maxWater, area);
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxWater;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Move shorter line inward', 'Width decreases, so need taller lines', 'Greedy: moving taller line can only decrease area'],
      },
    ],
  },
  '17': {
    approaches: [
      {
        name: 'Linear Search',
        description: 'Search each element one by one. This does not take advantage of the sorted property.',
        code: {
          python: `def search(nums, target):
    for i, num in enumerate(nums):
        if num == target:
            return i
    return -1`,
          javascript: `function search(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] === target) return i;
    }
    return -1;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Does not use sorted property', 'Always works but not optimal', 'Good baseline'],
      },
      {
        name: 'Modified Binary Search (Optimal)',
        description: 'Use binary search. At each step, determine which half is sorted and check if target is in that half.',
        code: {
          python: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:  # left half sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # right half sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1`,
          javascript: `function search(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        } else {
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }
    return -1;
}`,
        },
        complexity: { time: 'O(log n)', space: 'O(1)' },
        keyPoints: ['One half is always sorted', 'Check if target is in the sorted half', 'Standard binary search with rotation twist'],
      },
    ],
  },
  '22': {
    approaches: [
      {
        name: 'Brute Force (Array Copy)',
        description: 'Copy nodes to an array, then rebuild the list by picking from front and back alternately.',
        code: {
          python: `def reorderList(head):
    if not head:
        return
    nodes = []
    curr = head
    while curr:
        nodes.append(curr)
        curr = curr.next
    left, right = 0, len(nodes) - 1
    while left < right:
        nodes[left].next = nodes[right]
        left += 1
        if left == right:
            break
        nodes[right].next = nodes[left]
        right -= 1
    nodes[left].next = None`,
          javascript: `function reorderList(head) {
    if (!head) return;
    const nodes = [];
    let curr = head;
    while (curr) {
        nodes.push(curr);
        curr = curr.next;
    }
    let left = 0, right = nodes.length - 1;
    while (left < right) {
        nodes[left].next = nodes[right];
        left++;
        if (left === right) break;
        nodes[right].next = nodes[left];
        right--;
    }
    nodes[left].next = null;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Store all nodes in array for random access', 'Alternate picking from front and back', 'Remember to set last node next to null'],
      },
      {
        name: 'Find Middle + Reverse + Merge (Optimal)',
        description: 'Find the middle of the list, reverse the second half, then merge the two halves alternately.',
        code: {
          python: `def reorderList(head):
    if not head or not head.next:
        return
    # Find middle
    slow, fast = head, head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    # Reverse second half
    prev, curr = None, slow.next
    slow.next = None
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    # Merge two halves
    first, second = head, prev
    while second:
        tmp1, tmp2 = first.next, second.next
        first.next = second
        second.next = tmp1
        first = tmp1
        second = tmp2`,
          javascript: `function reorderList(head) {
    if (!head || !head.next) return;
    // Find middle
    let slow = head, fast = head;
    while (fast.next && fast.next.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    // Reverse second half
    let prev = null, curr = slow.next;
    slow.next = null;
    while (curr) {
        const nxt = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nxt;
    }
    // Merge two halves
    let first = head, second = prev;
    while (second) {
        const tmp1 = first.next, tmp2 = second.next;
        first.next = second;
        second.next = tmp1;
        first = tmp1;
        second = tmp2;
    }
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Three classic linked list operations combined', 'Slow/fast pointers find the middle', 'Reverse in place avoids extra space', 'Interleave merge of two halves'],
      },
    ],
  },
  '23': {
    approaches: [
      {
        name: 'Two Pass',
        description: 'First pass counts the length. Second pass removes the (length - n + 1)th node from the beginning.',
        code: {
          python: `def removeNthFromEnd(head, n):
    dummy = ListNode(0, head)
    length = 0
    curr = head
    while curr:
        length += 1
        curr = curr.next
    curr = dummy
    for _ in range(length - n):
        curr = curr.next
    curr.next = curr.next.next
    return dummy.next`,
          javascript: `function removeNthFromEnd(head, n) {
    const dummy = new ListNode(0, head);
    let length = 0;
    let curr = head;
    while (curr) {
        length++;
        curr = curr.next;
    }
    curr = dummy;
    for (let i = 0; i < length - n; i++) {
        curr = curr.next;
    }
    curr.next = curr.next.next;
    return dummy.next;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['First pass gets the length', 'Second pass removes the target node', 'Dummy node simplifies edge cases'],
      },
      {
        name: 'One Pass with Two Pointers (Optimal)',
        description: 'Advance the fast pointer n steps ahead. Then move both pointers until fast reaches the end. Slow is now just before the target.',
        code: {
          python: `def removeNthFromEnd(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next`,
          javascript: `function removeNthFromEnd(head, n) {
    const dummy = new ListNode(0, head);
    let fast = dummy, slow = dummy;
    for (let i = 0; i <= n; i++) {
        fast = fast.next;
    }
    while (fast) {
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = slow.next.next;
    return dummy.next;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Fast pointer is n+1 steps ahead of slow', 'When fast hits null, slow is before target', 'Dummy node handles removing the head', 'Single pass through the list'],
      },
    ],
  },
  '24': {
    approaches: [
      {
        name: 'Compare All Lists',
        description: 'At each step, find the minimum head across all k lists and append it to the result.',
        code: {
          python: `def mergeKLists(lists):
    dummy = curr = ListNode(0)
    while True:
        min_idx = -1
        min_val = float('inf')
        for i, node in enumerate(lists):
            if node and node.val < min_val:
                min_val = node.val
                min_idx = i
        if min_idx == -1:
            break
        curr.next = lists[min_idx]
        lists[min_idx] = lists[min_idx].next
        curr = curr.next
    return dummy.next`,
          javascript: `function mergeKLists(lists) {
    const dummy = new ListNode(0);
    let curr = dummy;
    while (true) {
        let minIdx = -1, minVal = Infinity;
        for (let i = 0; i < lists.length; i++) {
            if (lists[i] && lists[i].val < minVal) {
                minVal = lists[i].val;
                minIdx = i;
            }
        }
        if (minIdx === -1) break;
        curr.next = lists[minIdx];
        lists[minIdx] = lists[minIdx].next;
        curr = curr.next;
    }
    return dummy.next;
}`,
        },
        complexity: { time: 'O(n * k)', space: 'O(1)' },
        keyPoints: ['Scan all k heads to find minimum each time', 'n is total number of nodes', 'Simple but slow for large k'],
      },
      {
        name: 'Divide and Conquer (Optimal)',
        description: 'Merge lists pairwise, reducing k lists to k/2, then k/4, etc. Like merge sort.',
        code: {
          python: `def mergeKLists(lists):
    if not lists:
        return None
    def merge2(l1, l2):
        dummy = curr = ListNode(0)
        while l1 and l2:
            if l1.val <= l2.val:
                curr.next = l1
                l1 = l1.next
            else:
                curr.next = l2
                l2 = l2.next
            curr = curr.next
        curr.next = l1 or l2
        return dummy.next
    while len(lists) > 1:
        merged = []
        for i in range(0, len(lists), 2):
            l1 = lists[i]
            l2 = lists[i + 1] if i + 1 < len(lists) else None
            merged.append(merge2(l1, l2))
        lists = merged
    return lists[0]`,
          javascript: `function mergeKLists(lists) {
    if (!lists.length) return null;
    function merge2(l1, l2) {
        const dummy = new ListNode(0);
        let curr = dummy;
        while (l1 && l2) {
            if (l1.val <= l2.val) {
                curr.next = l1;
                l1 = l1.next;
            } else {
                curr.next = l2;
                l2 = l2.next;
            }
            curr = curr.next;
        }
        curr.next = l1 || l2;
        return dummy.next;
    }
    while (lists.length > 1) {
        const merged = [];
        for (let i = 0; i < lists.length; i += 2) {
            const l1 = lists[i];
            const l2 = i + 1 < lists.length ? lists[i + 1] : null;
            merged.push(merge2(l1, l2));
        }
        lists = merged;
    }
    return lists[0];
}`,
        },
        complexity: { time: 'O(n log k)', space: 'O(log k)' },
        keyPoints: ['Merge pairs like merge sort', 'log k rounds of merging', 'Each round processes all n nodes once', 'Reuses the merge two sorted lists subroutine'],
      },
    ],
  },
  '27': {
    approaches: [
      {
        name: 'Recursive (DFS)',
        description: 'Two trees are the same if their roots match and left/right subtrees are the same recursively.',
        code: {
          python: `def isSameTree(p, q):
    if not p and not q:
        return True
    if not p or not q:
        return False
    return (p.val == q.val and
            isSameTree(p.left, q.left) and
            isSameTree(p.right, q.right))`,
          javascript: `function isSameTree(p, q) {
    if (!p && !q) return true;
    if (!p || !q) return false;
    return p.val === q.val &&
        isSameTree(p.left, q.left) &&
        isSameTree(p.right, q.right);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(h)' },
        keyPoints: ['Base case: both null means same', 'One null and one not means different', 'Check value then recurse on children'],
      },
      {
        name: 'Iterative (BFS)',
        description: 'Use a queue to compare nodes level by level. Push pairs of nodes and compare them.',
        code: {
          python: `from collections import deque

def isSameTree(p, q):
    queue = deque([(p, q)])
    while queue:
        n1, n2 = queue.popleft()
        if not n1 and not n2:
            continue
        if not n1 or not n2 or n1.val != n2.val:
            return False
        queue.append((n1.left, n2.left))
        queue.append((n1.right, n2.right))
    return True`,
          javascript: `function isSameTree(p, q) {
    const queue = [[p, q]];
    while (queue.length) {
        const [n1, n2] = queue.shift();
        if (!n1 && !n2) continue;
        if (!n1 || !n2 || n1.val !== n2.val) return false;
        queue.push([n1.left, n2.left]);
        queue.push([n1.right, n2.right]);
    }
    return true;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Compare pairs of nodes in lockstep', 'Queue holds pairs from both trees', 'Early return on first mismatch', 'Avoids recursion stack overflow on deep trees'],
      },
    ],
  },
  '28': {
    approaches: [
      {
        name: 'Brute Force (Check Every Node)',
        description: 'For every node in the main tree, check if the subtree rooted there matches subRoot.',
        code: {
          python: `def isSubtree(root, subRoot):
    def isSame(p, q):
        if not p and not q:
            return True
        if not p or not q:
            return False
        return (p.val == q.val and
                isSame(p.left, q.left) and
                isSame(p.right, q.right))
    if not root:
        return False
    if isSame(root, subRoot):
        return True
    return isSubtree(root.left, subRoot) or isSubtree(root.right, subRoot)`,
          javascript: `function isSubtree(root, subRoot) {
    function isSame(p, q) {
        if (!p && !q) return true;
        if (!p || !q) return false;
        return p.val === q.val &&
            isSame(p.left, q.left) &&
            isSame(p.right, q.right);
    }
    if (!root) return false;
    if (isSame(root, subRoot)) return true;
    return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(h)' },
        keyPoints: ['For each node in root, check if trees match', 'm = nodes in root, n = nodes in subRoot', 'Uses isSameTree as a helper', 'Worst case checks every node against subRoot'],
      },
      {
        name: 'String Serialization',
        description: 'Serialize both trees to strings and check if the subRoot string is a substring of the root string.',
        code: {
          python: `def isSubtree(root, subRoot):
    def serialize(node):
        if not node:
            return "#"
        return "^" + str(node.val) + "," + serialize(node.left) + "," + serialize(node.right)
    return serialize(subRoot) in serialize(root)`,
          javascript: `function isSubtree(root, subRoot) {
    function serialize(node) {
        if (!node) return "#";
        return "^" + node.val + "," + serialize(node.left) + "," + serialize(node.right);
    }
    return serialize(root).includes(serialize(subRoot));
}`,
        },
        complexity: { time: 'O(m + n)', space: 'O(m + n)' },
        keyPoints: ['Serialize trees to unique string representations', 'Use substring search for matching', 'Prefix marker ^ prevents partial number matches', 'Linear time with KMP or built-in substring search'],
      },
    ],
  },
  '29': {
    approaches: [
      {
        name: 'Recursive',
        description: 'In a BST, if both nodes are smaller than root, LCA is in left subtree. If both are larger, LCA is in right. Otherwise root is the LCA.',
        code: {
          python: `def lowestCommonAncestor(root, p, q):
    if p.val < root.val and q.val < root.val:
        return lowestCommonAncestor(root.left, p, q)
    if p.val > root.val and q.val > root.val:
        return lowestCommonAncestor(root.right, p, q)
    return root`,
          javascript: `function lowestCommonAncestor(root, p, q) {
    if (p.val < root.val && q.val < root.val) {
        return lowestCommonAncestor(root.left, p, q);
    }
    if (p.val > root.val && q.val > root.val) {
        return lowestCommonAncestor(root.right, p, q);
    }
    return root;
}`,
        },
        complexity: { time: 'O(h)', space: 'O(h)' },
        keyPoints: ['BST property guides the search direction', 'Split point is the LCA', 'h is the height of the tree'],
      },
      {
        name: 'Iterative (Optimal)',
        description: 'Same logic as recursive but uses a loop to avoid recursion stack.',
        code: {
          python: `def lowestCommonAncestor(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val:
            root = root.left
        elif p.val > root.val and q.val > root.val:
            root = root.right
        else:
            return root`,
          javascript: `function lowestCommonAncestor(root, p, q) {
    while (root) {
        if (p.val < root.val && q.val < root.val) {
            root = root.left;
        } else if (p.val > root.val && q.val > root.val) {
            root = root.right;
        } else {
            return root;
        }
    }
}`,
        },
        complexity: { time: 'O(h)', space: 'O(1)' },
        keyPoints: ['Eliminates recursion stack overhead', 'BST ordering makes this efficient', 'When nodes split left and right, current node is LCA', 'Handles case where one node is ancestor of the other'],
      },
    ],
  },
  '30': {
    approaches: [
      {
        name: 'BFS with Queue (Optimal)',
        description: 'Use a queue to traverse the tree level by level, collecting node values at each level.',
        code: {
          python: `from collections import deque

def levelOrder(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result`,
          javascript: `function levelOrder(root) {
    if (!root) return [];
    const result = [];
    const queue = [root];
    while (queue.length) {
        const level = [];
        const size = queue.length;
        for (let i = 0; i < size; i++) {
            const node = queue.shift();
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        result.push(level);
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Process nodes level by level using queue', 'Snapshot queue size at start of each level', 'Classic BFS tree traversal pattern'],
      },
      {
        name: 'DFS with Depth Tracking',
        description: 'Use DFS and track the current depth. Append values to the correct level in the result.',
        code: {
          python: `def levelOrder(root):
    result = []
    def dfs(node, depth):
        if not node:
            return
        if depth == len(result):
            result.append([])
        result[depth].append(node.val)
        dfs(node.left, depth + 1)
        dfs(node.right, depth + 1)
    dfs(root, 0)
    return result`,
          javascript: `function levelOrder(root) {
    const result = [];
    function dfs(node, depth) {
        if (!node) return;
        if (depth === result.length) result.push([]);
        result[depth].push(node.val);
        dfs(node.left, depth + 1);
        dfs(node.right, depth + 1);
    }
    dfs(root, 0);
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['DFS can achieve level-order with depth parameter', 'Create new level array when depth equals result length', 'Left-to-right ordering preserved by visiting left child first', 'Recursion stack is O(h) but output is O(n)'],
      },
    ],
  },
  '31': {
    approaches: [
      {
        name: 'Inorder Traversal',
        description: 'A valid BST has a strictly increasing inorder traversal. Collect values and check if sorted.',
        code: {
          python: `def isValidBST(root):
    values = []
    def inorder(node):
        if not node:
            return
        inorder(node.left)
        values.append(node.val)
        inorder(node.right)
    inorder(root)
    for i in range(1, len(values)):
        if values[i] <= values[i - 1]:
            return False
    return True`,
          javascript: `function isValidBST(root) {
    const values = [];
    function inorder(node) {
        if (!node) return;
        inorder(node.left);
        values.push(node.val);
        inorder(node.right);
    }
    inorder(root);
    for (let i = 1; i < values.length; i++) {
        if (values[i] <= values[i - 1]) return false;
    }
    return true;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Inorder of valid BST is strictly increasing', 'Collect all values then verify', 'Simple but uses extra space for the array'],
      },
      {
        name: 'Recursive with Bounds (Optimal)',
        description: 'Pass valid range (min, max) down the tree. Each node must be within its valid range.',
        code: {
          python: `def isValidBST(root):
    def validate(node, lo, hi):
        if not node:
            return True
        if node.val <= lo or node.val >= hi:
            return False
        return (validate(node.left, lo, node.val) and
                validate(node.right, node.val, hi))
    return validate(root, float('-inf'), float('inf'))`,
          javascript: `function isValidBST(root) {
    function validate(node, lo, hi) {
        if (!node) return true;
        if (node.val <= lo || node.val >= hi) return false;
        return validate(node.left, lo, node.val) &&
            validate(node.right, node.val, hi);
    }
    return validate(root, -Infinity, Infinity);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(h)' },
        keyPoints: ['Each node has a valid range (lo, hi)', 'Left child narrows upper bound', 'Right child narrows lower bound', 'Use -Infinity/Infinity as initial bounds'],
      },
    ],
  },
  '32': {
    approaches: [
      {
        name: 'Inorder to Array',
        description: 'Perform inorder traversal to get sorted values, then return the kth element.',
        code: {
          python: `def kthSmallest(root, k):
    values = []
    def inorder(node):
        if not node:
            return
        inorder(node.left)
        values.append(node.val)
        inorder(node.right)
    inorder(root)
    return values[k - 1]`,
          javascript: `function kthSmallest(root, k) {
    const values = [];
    function inorder(node) {
        if (!node) return;
        inorder(node.left);
        values.push(node.val);
        inorder(node.right);
    }
    inorder(root);
    return values[k - 1];
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Inorder traversal of BST gives sorted order', 'Collect all values then index', 'Simple but visits all nodes'],
      },
      {
        name: 'Iterative Inorder with Early Stop (Optimal)',
        description: 'Use iterative inorder traversal and stop as soon as we have visited k nodes.',
        code: {
          python: `def kthSmallest(root, k):
    stack = []
    curr = root
    count = 0
    while stack or curr:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        count += 1
        if count == k:
            return curr.val
        curr = curr.right`,
          javascript: `function kthSmallest(root, k) {
    const stack = [];
    let curr = root;
    let count = 0;
    while (stack.length || curr) {
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        curr = stack.pop();
        count++;
        if (count === k) return curr.val;
        curr = curr.right;
    }
}`,
        },
        complexity: { time: 'O(h + k)', space: 'O(h)' },
        keyPoints: ['Iterative inorder avoids visiting all nodes', 'Stop early after k nodes', 'Stack-based inorder uses O(h) space', 'Efficient when k is small relative to n'],
      },
    ],
  },
  '33': {
    approaches: [
      {
        name: 'Recursive with Index Search',
        description: 'The first element of preorder is the root. Find it in inorder to determine left/right subtree sizes. Use slicing to recurse.',
        code: {
          python: `def buildTree(preorder, inorder):
    if not preorder or not inorder:
        return None
    root = TreeNode(preorder[0])
    mid = inorder.index(preorder[0])
    root.left = buildTree(preorder[1:mid + 1], inorder[:mid])
    root.right = buildTree(preorder[mid + 1:], inorder[mid + 1:])
    return root`,
          javascript: `function buildTree(preorder, inorder) {
    if (!preorder.length || !inorder.length) return null;
    const root = new TreeNode(preorder[0]);
    const mid = inorder.indexOf(preorder[0]);
    root.left = buildTree(preorder.slice(1, mid + 1), inorder.slice(0, mid));
    root.right = buildTree(preorder.slice(mid + 1), inorder.slice(mid + 1));
    return root;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(n\u00B2)' },
        keyPoints: ['Preorder first element is always the root', 'Inorder splits left and right subtrees', 'Array slicing creates copies each call', 'index/indexOf is O(n) per call'],
      },
      {
        name: 'Optimized with Hash Map (Optimal)',
        description: 'Pre-build a hash map for inorder indices. Use index pointers instead of array slicing.',
        code: {
          python: `def buildTree(preorder, inorder):
    inorder_map = {val: i for i, val in enumerate(inorder)}
    pre_idx = [0]

    def build(in_left, in_right):
        if in_left > in_right:
            return None
        root_val = preorder[pre_idx[0]]
        pre_idx[0] += 1
        root = TreeNode(root_val)
        mid = inorder_map[root_val]
        root.left = build(in_left, mid - 1)
        root.right = build(mid + 1, in_right)
        return root

    return build(0, len(inorder) - 1)`,
          javascript: `function buildTree(preorder, inorder) {
    const inorderMap = new Map();
    inorder.forEach((val, i) => inorderMap.set(val, i));
    let preIdx = 0;

    function build(inLeft, inRight) {
        if (inLeft > inRight) return null;
        const rootVal = preorder[preIdx++];
        const root = new TreeNode(rootVal);
        const mid = inorderMap.get(rootVal);
        root.left = build(inLeft, mid - 1);
        root.right = build(mid + 1, inRight);
        return root;
    }

    return build(0, inorder.length - 1);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Hash map gives O(1) root index lookup', 'Index pointers avoid array slicing', 'Build left subtree before right (preorder)', 'Single preorder index incremented globally'],
      },
    ],
  },
  '34': {
    approaches: [
      {
        name: 'Brute Force (All Paths)',
        description: 'Enumerate all root-to-leaf paths and all sub-paths, computing the maximum sum. Very slow.',
        code: {
          python: `def maxPathSum(root):
    result = [float('-inf')]

    def dfs(node):
        if not node:
            return 0
        left = max(dfs(node.left), 0)
        right = max(dfs(node.right), 0)
        # Path through this node as the highest point
        result[0] = max(result[0], node.val + left + right)
        # Return max gain if continuing through this node
        return node.val + max(left, right)

    dfs(root)
    return result[0]`,
          javascript: `function maxPathSum(root) {
    let result = -Infinity;

    function dfs(node) {
        if (!node) return 0;
        const left = Math.max(dfs(node.left), 0);
        const right = Math.max(dfs(node.right), 0);
        result = Math.max(result, node.val + left + right);
        return node.val + Math.max(left, right);
    }

    dfs(root);
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(h)' },
        keyPoints: ['At each node consider path through it as the peak', 'Clamp negative subtree gains to 0', 'Global max tracks best path found so far'],
      },
      {
        name: 'DFS with Global Max (Optimal)',
        description: 'Post-order DFS returns the max gain from each subtree. At each node, update global max considering the path through that node.',
        code: {
          python: `def maxPathSum(root):
    max_sum = [float('-inf')]

    def gain(node):
        if not node:
            return 0
        left_gain = max(gain(node.left), 0)
        right_gain = max(gain(node.right), 0)
        # Price of the path going through this node
        path_price = node.val + left_gain + right_gain
        max_sum[0] = max(max_sum[0], path_price)
        # For the parent call, return max single-side gain
        return node.val + max(left_gain, right_gain)

    gain(root)
    return max_sum[0]`,
          javascript: `function maxPathSum(root) {
    let maxSum = -Infinity;

    function gain(node) {
        if (!node) return 0;
        const leftGain = Math.max(gain(node.left), 0);
        const rightGain = Math.max(gain(node.right), 0);
        const pathPrice = node.val + leftGain + rightGain;
        maxSum = Math.max(maxSum, pathPrice);
        return node.val + Math.max(leftGain, rightGain);
    }

    gain(root);
    return maxSum;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(h)' },
        keyPoints: ['Each node returns max single-branch gain to parent', 'Update global max with both-branch path at each node', 'Negative gains are clamped to 0 (do not extend)', 'Post-order traversal ensures children computed first'],
      },
    ],
  },
  '35': {
    approaches: [
      {
        name: 'BFS Serialization',
        description: 'Serialize using level-order traversal with null markers. Deserialize by reconstructing level by level.',
        code: {
          python: `from collections import deque

class Codec:
    def serialize(self, root):
        if not root:
            return ""
        result = []
        queue = deque([root])
        while queue:
            node = queue.popleft()
            if node:
                result.append(str(node.val))
                queue.append(node.left)
                queue.append(node.right)
            else:
                result.append("null")
        return ",".join(result)

    def deserialize(self, data):
        if not data:
            return None
        vals = data.split(",")
        root = TreeNode(int(vals[0]))
        queue = deque([root])
        i = 1
        while queue:
            node = queue.popleft()
            if vals[i] != "null":
                node.left = TreeNode(int(vals[i]))
                queue.append(node.left)
            i += 1
            if vals[i] != "null":
                node.right = TreeNode(int(vals[i]))
                queue.append(node.right)
            i += 1
        return root`,
          javascript: `class Codec {
    serialize(root) {
        if (!root) return "";
        const result = [];
        const queue = [root];
        while (queue.length) {
            const node = queue.shift();
            if (node) {
                result.push(String(node.val));
                queue.push(node.left);
                queue.push(node.right);
            } else {
                result.push("null");
            }
        }
        return result.join(",");
    }

    deserialize(data) {
        if (!data) return null;
        const vals = data.split(",");
        const root = new TreeNode(parseInt(vals[0]));
        const queue = [root];
        let i = 1;
        while (queue.length) {
            const node = queue.shift();
            if (vals[i] !== "null") {
                node.left = new TreeNode(parseInt(vals[i]));
                queue.push(node.left);
            }
            i++;
            if (vals[i] !== "null") {
                node.right = new TreeNode(parseInt(vals[i]));
                queue.push(node.right);
            }
            i++;
        }
        return root;
    }
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Level-order with null markers preserves structure', 'Each node has exactly two children in output', 'Deserialize mirrors serialize with a queue'],
      },
      {
        name: 'Preorder DFS Serialization (Optimal)',
        description: 'Serialize with preorder DFS using null markers. Deserialize recursively consuming tokens.',
        code: {
          python: `class Codec:
    def serialize(self, root):
        result = []
        def dfs(node):
            if not node:
                result.append("null")
                return
            result.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        dfs(root)
        return ",".join(result)

    def deserialize(self, data):
        vals = iter(data.split(","))
        def dfs():
            val = next(vals)
            if val == "null":
                return None
            node = TreeNode(int(val))
            node.left = dfs()
            node.right = dfs()
            return node
        return dfs()`,
          javascript: `class Codec {
    serialize(root) {
        const result = [];
        function dfs(node) {
            if (!node) { result.push("null"); return; }
            result.push(String(node.val));
            dfs(node.left);
            dfs(node.right);
        }
        dfs(root);
        return result.join(",");
    }

    deserialize(data) {
        const vals = data.split(",");
        let i = 0;
        function dfs() {
            if (vals[i] === "null") { i++; return null; }
            const node = new TreeNode(parseInt(vals[i++]));
            node.left = dfs();
            node.right = dfs();
            return node;
        }
        return dfs();
    }
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Preorder: root, left, right with null sentinels', 'Iterator/index consumes tokens in order', 'DFS is simpler to implement than BFS version', 'Null markers make tree structure unambiguous'],
      },
    ],
  },
  '36': {
    approaches: [
      {
        name: 'Hash Map Based Trie',
        description: 'Each node uses a hash map to store children. Simple but slightly slower due to hash overhead.',
        code: {
          python: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node:
                node[ch] = {}
            node = node[ch]
        node['#'] = True

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node:
                return False
            node = node[ch]
        return '#' in node

    def startsWith(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return False
            node = node[ch]
        return True`,
          javascript: `class Trie {
    constructor() {
        this.root = {};
    }
    insert(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node[ch]) node[ch] = {};
            node = node[ch];
        }
        node['#'] = true;
    }
    search(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node[ch]) return false;
            node = node[ch];
        }
        return node['#'] === true;
    }
    startsWith(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            if (!node[ch]) return false;
            node = node[ch];
        }
        return true;
    }
}`,
        },
        complexity: { time: 'O(m) per operation', space: 'O(total characters)' },
        keyPoints: ['Each node is a hash map of children', 'Special marker # indicates end of word', 'Search checks for end marker, startsWith does not', 'Hash map approach is concise and flexible'],
      },
      {
        name: 'TrieNode Class (Optimal)',
        description: 'Use dedicated TrieNode objects with a children array and an isEnd flag for clean structure.',
        code: {
          python: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def startsWith(self, prefix):
        return self._find(prefix) is not None

    def _find(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node`,
          javascript: `class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    insert(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children[ch]) node.children[ch] = new TrieNode();
            node = node.children[ch];
        }
        node.isEnd = true;
    }
    search(word) {
        const node = this._find(word);
        return node !== null && node.isEnd;
    }
    startsWith(prefix) {
        return this._find(prefix) !== null;
    }
    _find(prefix) {
        let node = this.root;
        for (const ch of prefix) {
            if (!node.children[ch]) return null;
            node = node.children[ch];
        }
        return node;
    }
}`,
        },
        complexity: { time: 'O(m) per operation', space: 'O(total characters)' },
        keyPoints: ['Dedicated TrieNode class is cleaner', 'Helper _find method avoids code duplication', 'isEnd flag distinguishes complete words from prefixes', 'm is the length of the word/prefix'],
      },
    ],
  },
  '37': {
    approaches: [
      {
        name: 'Brute Force (List Search)',
        description: 'Store words in a list. For search, compare each word character by character, treating dots as wildcards.',
        code: {
          python: `class WordDictionary:
    def __init__(self):
        self.words = []

    def addWord(self, word):
        self.words.append(word)

    def search(self, word):
        for w in self.words:
            if len(w) != len(word):
                continue
            if all(a == b or b == '.' for a, b in zip(w, word)):
                return True
        return False`,
          javascript: `class WordDictionary {
    constructor() {
        this.words = [];
    }
    addWord(word) {
        this.words.push(word);
    }
    search(word) {
        for (const w of this.words) {
            if (w.length !== word.length) continue;
            let match = true;
            for (let i = 0; i < word.length; i++) {
                if (word[i] !== '.' && word[i] !== w[i]) {
                    match = false;
                    break;
                }
            }
            if (match) return true;
        }
        return false;
    }
}`,
        },
        complexity: { time: 'O(n * m) per search', space: 'O(n * m)' },
        keyPoints: ['n is number of words, m is word length', 'Linear scan of all words', 'Dot matches any single character', 'Simple but slow for many words'],
      },
      {
        name: 'Trie with DFS (Optimal)',
        description: 'Use a Trie. On dots, branch to all children. On regular chars, follow the specific child.',
        code: {
          python: `class WordDictionary:
    def __init__(self):
        self.root = {}

    def addWord(self, word):
        node = self.root
        for ch in word:
            if ch not in node:
                node[ch] = {}
            node = node[ch]
        node['#'] = True

    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return '#' in node
            if word[i] == '.':
                for child in node:
                    if child != '#' and dfs(node[child], i + 1):
                        return True
                return False
            if word[i] not in node:
                return False
            return dfs(node[word[i]], i + 1)
        return dfs(self.root, 0)`,
          javascript: `class WordDictionary {
    constructor() {
        this.root = {};
    }
    addWord(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node[ch]) node[ch] = {};
            node = node[ch];
        }
        node['#'] = true;
    }
    search(word) {
        function dfs(node, i) {
            if (i === word.length) return node['#'] === true;
            if (word[i] === '.') {
                for (const key in node) {
                    if (key !== '#' && dfs(node[key], i + 1)) return true;
                }
                return false;
            }
            if (!node[word[i]]) return false;
            return dfs(node[word[i]], i + 1);
        }
        return dfs(this.root, 0);
    }
}`,
        },
        complexity: { time: 'O(m) for addWord, O(26^d * m) worst case for search', space: 'O(total characters)' },
        keyPoints: ['Trie enables efficient prefix matching', 'Dot triggers branching to all children', 'd is the number of dots in the search pattern', 'Without dots, search is O(m) like a regular trie'],
      },
    ],
  },
  '38': {
    approaches: [
      {
        name: 'Brute Force (DFS per Word)',
        description: 'For each word, run a DFS/backtracking search on the board. Does not share work between words.',
        code: {
          python: `def findWords(board, words):
    rows, cols = len(board), len(board[0])
    result = set()

    def dfs(r, c, word, idx):
        if idx == len(word):
            return True
        if (r < 0 or r >= rows or c < 0 or c >= cols or
                board[r][c] != word[idx]):
            return False
        tmp = board[r][c]
        board[r][c] = '#'
        found = (dfs(r+1,c,word,idx+1) or dfs(r-1,c,word,idx+1) or
                 dfs(r,c+1,word,idx+1) or dfs(r,c-1,word,idx+1))
        board[r][c] = tmp
        return found

    for word in words:
        for r in range(rows):
            for c in range(cols):
                if dfs(r, c, word, 0):
                    result.add(word)
    return list(result)`,
          javascript: `function findWords(board, words) {
    const rows = board.length, cols = board[0].length;
    const result = new Set();

    function dfs(r, c, word, idx) {
        if (idx === word.length) return true;
        if (r < 0 || r >= rows || c < 0 || c >= cols ||
            board[r][c] !== word[idx]) return false;
        const tmp = board[r][c];
        board[r][c] = '#';
        const found = dfs(r+1,c,word,idx+1) || dfs(r-1,c,word,idx+1) ||
                      dfs(r,c+1,word,idx+1) || dfs(r,c-1,word,idx+1);
        board[r][c] = tmp;
        return found;
    }

    for (const word of words) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (dfs(r, c, word, 0)) result.add(word);
            }
        }
    }
    return [...result];
}`,
        },
        complexity: { time: 'O(w * m * n * 4^L)', space: 'O(L)' },
        keyPoints: ['w is number of words, L is max word length', 'Separate DFS per word, no shared work', 'Backtrack by restoring board cells', 'Too slow when word list is large'],
      },
      {
        name: 'Trie + Backtracking (Optimal)',
        description: 'Build a trie from the word list. Run DFS from each cell, following trie edges. Prune branches with no trie children.',
        code: {
          python: `def findWords(board, words):
    root = {}
    for word in words:
        node = root
        for ch in word:
            if ch not in node:
                node[ch] = {}
            node = node[ch]
        node['#'] = word

    rows, cols = len(board), len(board[0])
    result = []

    def dfs(r, c, node):
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return
        ch = board[r][c]
        if ch not in node:
            return
        next_node = node[ch]
        if '#' in next_node:
            result.append(next_node['#'])
            del next_node['#']
        board[r][c] = '.'
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            dfs(r + dr, c + dc, next_node)
        board[r][c] = ch
        if not next_node:
            del node[ch]

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)
    return result`,
          javascript: `function findWords(board, words) {
    const root = {};
    for (const word of words) {
        let node = root;
        for (const ch of word) {
            if (!node[ch]) node[ch] = {};
            node = node[ch];
        }
        node['#'] = word;
    }

    const rows = board.length, cols = board[0].length;
    const result = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    function dfs(r, c, node) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        const ch = board[r][c];
        if (!node[ch]) return;
        const nextNode = node[ch];
        if (nextNode['#']) {
            result.push(nextNode['#']);
            delete nextNode['#'];
        }
        board[r][c] = '.';
        for (const [dr, dc] of dirs) {
            dfs(r + dr, c + dc, nextNode);
        }
        board[r][c] = ch;
        if (!Object.keys(nextNode).length) delete node[ch];
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            dfs(r, c, root);
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(m * n * 4^L)', space: 'O(total characters in words)' },
        keyPoints: ['Trie allows searching all words simultaneously', 'Prune trie branches when leaf words are found', 'Store complete word at leaf for easy collection', 'Backtrack board cells to allow reuse in other paths'],
      },
    ],
  },
  '4': {
    approaches: [
      {
        name: 'Brute Force (Sort Each String)',
        description: 'For each pair of strings, sort them and compare. Group strings with the same sorted form.',
        code: {
          python: `def groupAnagrams(strs):
    result = {}
    for s in strs:
        key = ''.join(sorted(s))
        if key not in result:
            result[key] = []
        result[key].append(s)
    return list(result.values())`,
          javascript: `function groupAnagrams(strs) {
    const map = {};
    for (const s of strs) {
        const key = s.split('').sort().join('');
        if (!map[key]) map[key] = [];
        map[key].push(s);
    }
    return Object.values(map);
}`,
        },
        complexity: { time: 'O(n * k log k)', space: 'O(n * k)' },
        keyPoints: ['k is the max length of a string', 'Sorting each string dominates time', 'Hash map groups anagrams by sorted key'],
      },
      {
        name: 'Character Count Key (Optimal)',
        description: 'Use a character frequency count as the hash key instead of sorting. This avoids the k log k sorting cost.',
        code: {
          python: `def groupAnagrams(strs):
    result = {}
    for s in strs:
        count = [0] * 26
        for c in s:
            count[ord(c) - ord('a')] += 1
        key = tuple(count)
        if key not in result:
            result[key] = []
        result[key].append(s)
    return list(result.values())`,
          javascript: `function groupAnagrams(strs) {
    const map = {};
    for (const s of strs) {
        const count = new Array(26).fill(0);
        for (const c of s) count[c.charCodeAt(0) - 97]++;
        const key = count.join('#');
        if (!map[key]) map[key] = [];
        map[key].push(s);
    }
    return Object.values(map);
}`,
        },
        complexity: { time: 'O(n * k)', space: 'O(n * k)' },
        keyPoints: ['Character count tuple as key avoids sorting', 'Fixed 26-letter alphabet keeps key size constant', 'Reduces per-string cost from O(k log k) to O(k)', 'Hash map groups by frequency signature'],
      },
    ],
  },
  '5': {
    approaches: [
      {
        name: 'Sorting',
        description: 'Count frequencies, sort by frequency descending, and return the first k elements.',
        code: {
          python: `def topKFrequent(nums, k):
    from collections import Counter
    count = Counter(nums)
    return [x for x, _ in count.most_common(k)]`,
          javascript: `function topKFrequent(nums, k) {
    const count = {};
    for (const n of nums) count[n] = (count[n] || 0) + 1;
    return Object.entries(count)
        .sort((a, b) => b[1] - a[1])
        .slice(0, k)
        .map(e => Number(e[0]));
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Count frequencies then sort', 'Simple and readable', 'Sorting dominates complexity'],
      },
      {
        name: 'Bucket Sort (Optimal)',
        description: 'Use bucket sort where index represents frequency. This achieves linear time.',
        code: {
          python: `def topKFrequent(nums, k):
    from collections import Counter
    count = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for num, freq in count.items():
        buckets[freq].append(num)
    result = []
    for i in range(len(buckets) - 1, -1, -1):
        for num in buckets[i]:
            result.append(num)
            if len(result) == k:
                return result
    return result`,
          javascript: `function topKFrequent(nums, k) {
    const count = {};
    for (const n of nums) count[n] = (count[n] || 0) + 1;
    const buckets = Array.from({ length: nums.length + 1 }, () => []);
    for (const [num, freq] of Object.entries(count)) {
        buckets[freq].push(Number(num));
    }
    const result = [];
    for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
        result.push(...buckets[i]);
    }
    return result.slice(0, k);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Bucket index = frequency count', 'Iterate buckets from high to low', 'Avoids comparison-based sorting entirely', 'Max possible frequency is n'],
      },
    ],
  },
  '7': {
    approaches: [
      {
        name: 'Delimiter with Escaping',
        description: 'Use a special delimiter between strings, escaping any occurrences of the delimiter within the strings.',
        code: {
          python: `def encode(strs):
    return ''.join(s.replace('/', '//').replace('#', '/#') + '#' for s in strs)

def decode(s):
    result, current, i = [], [], 0
    while i < len(s):
        if i + 1 < len(s) and s[i] == '/' and s[i+1] == '/':
            current.append('/')
            i += 2
        elif i + 1 < len(s) and s[i] == '/' and s[i+1] == '#':
            current.append('#')
            i += 2
        elif s[i] == '#':
            result.append(''.join(current))
            current = []
            i += 1
        else:
            current.append(s[i])
            i += 1
    return result`,
          javascript: `function encode(strs) {
    return strs.map(s => s.replace(/\\//g, '//').replace(/#/g, '/#') + '#').join('');
}
function decode(s) {
    const result = []; let current = '', i = 0;
    while (i < s.length) {
        if (s[i] === '/' && s[i+1] === '/') { current += '/'; i += 2; }
        else if (s[i] === '/' && s[i+1] === '#') { current += '#'; i += 2; }
        else if (s[i] === '#') { result.push(current); current = ''; i++; }
        else { current += s[i]; i++; }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Escape special characters before joining', 'Delimiter marks string boundaries', 'Must handle edge cases with empty strings'],
      },
      {
        name: 'Length Prefix (Optimal)',
        description: 'Prefix each string with its length followed by a delimiter. This avoids any escaping and handles all characters.',
        code: {
          python: `def encode(strs):
    return ''.join(str(len(s)) + '#' + s for s in strs)

def decode(s):
    result, i = [], 0
    while i < len(s):
        j = s.index('#', i)
        length = int(s[i:j])
        result.append(s[j+1:j+1+length])
        i = j + 1 + length
    return result`,
          javascript: `function encode(strs) {
    return strs.map(s => s.length + '#' + s).join('');
}
function decode(s) {
    const result = [];
    let i = 0;
    while (i < s.length) {
        let j = s.indexOf('#', i);
        const len = parseInt(s.substring(i, j));
        result.push(s.substring(j + 1, j + 1 + len));
        i = j + 1 + len;
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Length prefix makes decoding unambiguous', 'No escaping needed — works with any character', 'Read length, then read exactly that many chars', 'Simple and robust approach'],
      },
    ],
  },
  '8': {
    approaches: [
      {
        name: 'Sorting',
        description: 'Sort the array and scan for consecutive sequences.',
        code: {
          python: `def longestConsecutive(nums):
    if not nums:
        return 0
    nums.sort()
    longest, current = 1, 1
    for i in range(1, len(nums)):
        if nums[i] == nums[i-1]:
            continue
        if nums[i] == nums[i-1] + 1:
            current += 1
        else:
            current = 1
        longest = max(longest, current)
    return longest`,
          javascript: `function longestConsecutive(nums) {
    if (!nums.length) return 0;
    nums.sort((a, b) => a - b);
    let longest = 1, current = 1;
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === nums[i-1]) continue;
        if (nums[i] === nums[i-1] + 1) current++;
        else current = 1;
        longest = Math.max(longest, current);
    }
    return longest;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(1)' },
        keyPoints: ['Sort first then linear scan', 'Skip duplicates during scan', 'Track current and longest streaks'],
      },
      {
        name: 'Hash Set (Optimal)',
        description: 'Use a set for O(1) lookups. Only start counting from sequence beginnings (numbers where num-1 is not in the set).',
        code: {
          python: `def longestConsecutive(nums):
    num_set = set(nums)
    longest = 0
    for num in num_set:
        if num - 1 not in num_set:
            current = num
            streak = 1
            while current + 1 in num_set:
                current += 1
                streak += 1
            longest = max(longest, streak)
    return longest`,
          javascript: `function longestConsecutive(nums) {
    const numSet = new Set(nums);
    let longest = 0;
    for (const num of numSet) {
        if (!numSet.has(num - 1)) {
            let current = num, streak = 1;
            while (numSet.has(current + 1)) {
                current++;
                streak++;
            }
            longest = Math.max(longest, streak);
        }
    }
    return longest;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Only start from sequence beginnings', 'Each number is visited at most twice', 'Set provides O(1) lookups', 'Key insight: skip if num-1 exists in set'],
      },
    ],
  },
  '9': {
    approaches: [
      {
        name: 'Reverse String',
        description: 'Clean the string by removing non-alphanumeric characters and converting to lowercase, then compare with its reverse.',
        code: {
          python: `def isPalindrome(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]`,
          javascript: `function isPalindrome(s) {
    const cleaned = s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return cleaned === cleaned.split('').reverse().join('');
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Filter non-alphanumeric characters', 'Convert to lowercase for case-insensitive compare', 'Extra space for the cleaned string'],
      },
      {
        name: 'Two Pointers (Optimal)',
        description: 'Use two pointers from both ends, skipping non-alphanumeric characters and comparing in-place.',
        code: {
          python: `def isPalindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True`,
          javascript: `function isPalindrome(s) {
    let left = 0, right = s.length - 1;
    while (left < right) {
        while (left < right && !/[a-zA-Z0-9]/.test(s[left])) left++;
        while (left < right && !/[a-zA-Z0-9]/.test(s[right])) right--;
        if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
        left++;
        right--;
    }
    return true;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['No extra string allocation needed', 'Skip non-alphanumeric in place', 'Compare characters from outside in', 'Case-insensitive comparison at each step'],
      },
    ],
  },
  '14': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every substring and verify if it can be made uniform with at most k replacements.',
        code: {
          python: `def characterReplacement(s, k):
    result = 0
    for i in range(len(s)):
        count = {}
        max_freq = 0
        for j in range(i, len(s)):
            count[s[j]] = count.get(s[j], 0) + 1
            max_freq = max(max_freq, count[s[j]])
            if (j - i + 1) - max_freq <= k:
                result = max(result, j - i + 1)
    return result`,
          javascript: `function characterReplacement(s, k) {
    let result = 0;
    for (let i = 0; i < s.length; i++) {
        const count = {};
        let maxFreq = 0;
        for (let j = i; j < s.length; j++) {
            count[s[j]] = (count[s[j]] || 0) + 1;
            maxFreq = Math.max(maxFreq, count[s[j]]);
            if ((j - i + 1) - maxFreq <= k)
                result = Math.max(result, j - i + 1);
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Check every possible substring', 'Window is valid if length - maxFreq <= k', 'Simple but slow for large inputs'],
      },
      {
        name: 'Sliding Window (Optimal)',
        description: 'Maintain a sliding window where the number of characters to replace (window size - max frequency) is at most k.',
        code: {
          python: `def characterReplacement(s, k):
    count = {}
    left = 0
    max_freq = 0
    result = 0
    for right in range(len(s)):
        count[s[right]] = count.get(s[right], 0) + 1
        max_freq = max(max_freq, count[s[right]])
        while (right - left + 1) - max_freq > k:
            count[s[left]] -= 1
            left += 1
        result = max(result, right - left + 1)
    return result`,
          javascript: `function characterReplacement(s, k) {
    const count = {};
    let left = 0, maxFreq = 0, result = 0;
    for (let right = 0; right < s.length; right++) {
        count[s[right]] = (count[s[right]] || 0) + 1;
        maxFreq = Math.max(maxFreq, count[s[right]]);
        while ((right - left + 1) - maxFreq > k) {
            count[s[left]]--;
            left++;
        }
        result = Math.max(result, right - left + 1);
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Window size - max frequency = chars to replace', 'Shrink window when replacements exceed k', 'max_freq never needs to decrease for correctness', 'Fixed alphabet means O(1) space'],
      },
    ],
  },
  '15': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every substring of s to see if it contains all characters of t.',
        code: {
          python: `def minWindow(s, t):
    from collections import Counter
    need = Counter(t)
    result = ""
    for i in range(len(s)):
        window = Counter()
        for j in range(i, len(s)):
            window[s[j]] += 1
            if all(window[c] >= need[c] for c in need):
                if not result or (j - i + 1) < len(result):
                    result = s[i:j+1]
                break
    return result`,
          javascript: `function minWindow(s, t) {
    let result = "";
    for (let i = 0; i < s.length; i++) {
        const count = {};
        for (const c of t) count[c] = (count[c] || 0) + 1;
        let remaining = t.length;
        for (let j = i; j < s.length; j++) {
            if (count[s[j]] > 0) remaining--;
            count[s[j]] = (count[s[j]] || 0) - 1;
            if (remaining === 0) {
                if (!result || (j - i + 1) < result.length) result = s.substring(i, j + 1);
                break;
            }
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(n)' },
        keyPoints: ['Check every starting position', 'Expand until all chars of t are covered', 'Very slow for large inputs'],
      },
      {
        name: 'Sliding Window (Optimal)',
        description: 'Use two pointers with a frequency map. Expand right to satisfy the condition, then shrink left to minimize the window.',
        code: {
          python: `def minWindow(s, t):
    from collections import Counter
    need = Counter(t)
    missing = len(t)
    left = 0
    start, end = 0, float('inf')
    for right in range(len(s)):
        if need[s[right]] > 0:
            missing -= 1
        need[s[right]] -= 1
        while missing == 0:
            if right - left < end - start:
                start, end = left, right
            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1
            left += 1
    return s[start:end+1] if end != float('inf') else ""`,
          javascript: `function minWindow(s, t) {
    const need = {};
    for (const c of t) need[c] = (need[c] || 0) + 1;
    let missing = t.length, left = 0, start = 0, minLen = Infinity;
    for (let right = 0; right < s.length; right++) {
        if (need[s[right]] > 0) missing--;
        need[s[right]] = (need[s[right]] || 0) - 1;
        while (missing === 0) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                start = left;
            }
            need[s[left]]++;
            if (need[s[left]] > 0) missing++;
            left++;
        }
    }
    return minLen === Infinity ? "" : s.substring(start, start + minLen);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Expand right pointer until window is valid', 'Shrink left pointer to minimize window', 'Track missing count for O(1) validity check', 'Each pointer moves at most n times'],
      },
    ],
  },
  '18': {
    approaches: [
      {
        name: 'Linear Scan',
        description: 'Simply scan through the array to find the minimum element.',
        code: {
          python: `def findMin(nums):
    return min(nums)`,
          javascript: `function findMin(nums) {
    return Math.min(...nums);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Ignores the sorted/rotated property', 'Simple but does not meet O(log n) requirement', 'Good baseline to understand the problem'],
      },
      {
        name: 'Binary Search (Optimal)',
        description: 'Use binary search. Compare mid with right — if nums[mid] > nums[right], the minimum is in the right half; otherwise it is in the left half.',
        code: {
          python: `def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        mid = (left + right) // 2
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid
    return nums[left]`,
          javascript: `function findMin(nums) {
    let left = 0, right = nums.length - 1;
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] > nums[right]) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    return nums[left];
}`,
        },
        complexity: { time: 'O(log n)', space: 'O(1)' },
        keyPoints: ['Compare mid to right boundary', 'If mid > right, min is in right half', 'Use left < right (not <=) to converge', 'Minimum is at the rotation point'],
      },
    ],
  },
  '20': {
    approaches: [
      {
        name: 'Using Extra Array',
        description: 'Traverse both lists, collect all values, sort them, and build a new linked list.',
        code: {
          python: `def mergeTwoLists(list1, list2):
    vals = []
    while list1:
        vals.append(list1.val)
        list1 = list1.next
    while list2:
        vals.append(list2.val)
        list2 = list2.next
    vals.sort()
    dummy = ListNode(0)
    curr = dummy
    for v in vals:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next`,
          javascript: `function mergeTwoLists(list1, list2) {
    const vals = [];
    while (list1) { vals.push(list1.val); list1 = list1.next; }
    while (list2) { vals.push(list2.val); list2 = list2.next; }
    vals.sort((a, b) => a - b);
    const dummy = new ListNode(0);
    let curr = dummy;
    for (const v of vals) { curr.next = new ListNode(v); curr = curr.next; }
    return dummy.next;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Collect all values and sort', 'Does not leverage pre-sorted property', 'Simple but wasteful approach'],
      },
      {
        name: 'Iterative Merge (Optimal)',
        description: 'Use a dummy head and compare nodes from both lists one by one, always picking the smaller value.',
        code: {
          python: `def mergeTwoLists(list1, list2):
    dummy = ListNode(0)
    curr = dummy
    while list1 and list2:
        if list1.val <= list2.val:
            curr.next = list1
            list1 = list1.next
        else:
            curr.next = list2
            list2 = list2.next
        curr = curr.next
    curr.next = list1 or list2
    return dummy.next`,
          javascript: `function mergeTwoLists(list1, list2) {
    const dummy = new ListNode(0);
    let curr = dummy;
    while (list1 && list2) {
        if (list1.val <= list2.val) {
            curr.next = list1;
            list1 = list1.next;
        } else {
            curr.next = list2;
            list2 = list2.next;
        }
        curr = curr.next;
    }
    curr.next = list1 || list2;
    return dummy.next;
}`,
        },
        complexity: { time: 'O(n + m)', space: 'O(1)' },
        keyPoints: ['Dummy head simplifies edge cases', 'Compare and pick smaller node each step', 'Attach remaining list at the end', 'In-place — no extra node allocation'],
      },
    ],
  },
  '65': {
    approaches: [
      {
        name: 'Extra Matrix',
        description: 'Create a new matrix and place each element in its rotated position.',
        code: {
          python: `def rotate(matrix):
    n = len(matrix)
    result = [[0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            result[j][n-1-i] = matrix[i][j]
    for i in range(n):
        for j in range(n):
            matrix[i][j] = result[i][j]`,
          javascript: `function rotate(matrix) {
    const n = matrix.length;
    const result = Array.from({length: n}, () => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            result[j][n-1-i] = matrix[i][j];
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            matrix[i][j] = result[i][j];
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(n\u00B2)' },
        keyPoints: ['Map (i,j) to (j, n-1-i)', 'Uses extra matrix for storage', 'Copy result back to original'],
      },
      {
        name: 'Transpose + Reverse (Optimal)',
        description: 'Transpose the matrix (swap rows and columns), then reverse each row. This rotates 90 degrees clockwise in-place.',
        code: {
          python: `def rotate(matrix):
    n = len(matrix)
    # Transpose
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    # Reverse each row
    for row in matrix:
        row.reverse()`,
          javascript: `function rotate(matrix) {
    const n = matrix.length;
    // Transpose
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    // Reverse each row
    for (const row of matrix) row.reverse();
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Transpose swaps across main diagonal', 'Reverse rows completes the rotation', 'True in-place with O(1) extra space', 'Two simple operations compose to rotation'],
      },
    ],
  },
  '66': {
    approaches: [
      {
        name: 'Simulation with Direction',
        description: 'Simulate the spiral by maintaining direction vectors and turning right when hitting a boundary or visited cell.',
        code: {
          python: `def spiralOrder(matrix):
    if not matrix:
        return []
    rows, cols = len(matrix), len(matrix[0])
    visited = [[False]*cols for _ in range(rows)]
    dr = [0, 1, 0, -1]
    dc = [1, 0, -1, 0]
    r = c = di = 0
    result = []
    for _ in range(rows * cols):
        result.append(matrix[r][c])
        visited[r][c] = True
        nr, nc = r + dr[di], c + dc[di]
        if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc]:
            r, c = nr, nc
        else:
            di = (di + 1) % 4
            r, c = r + dr[di], c + dc[di]
    return result`,
          javascript: `function spiralOrder(matrix) {
    if (!matrix.length) return [];
    const rows = matrix.length, cols = matrix[0].length;
    const visited = Array.from({length: rows}, () => Array(cols).fill(false));
    const dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
    let r = 0, c = 0, di = 0;
    const result = [];
    for (let i = 0; i < rows * cols; i++) {
        result.push(matrix[r][c]);
        visited[r][c] = true;
        const nr = r + dr[di], nc = c + dc[di];
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
            r = nr; c = nc;
        } else {
            di = (di + 1) % 4;
            r += dr[di]; c += dc[di];
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(m * n)' },
        keyPoints: ['Direction vectors: right, down, left, up', 'Turn right when hitting boundary or visited', 'Visited matrix tracks traversed cells'],
      },
      {
        name: 'Layer-by-Layer (Optimal)',
        description: 'Process the matrix layer by layer (top row, right column, bottom row, left column), shrinking boundaries after each layer.',
        code: {
          python: `def spiralOrder(matrix):
    result = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            result.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            result.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                result.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                result.append(matrix[r][left])
            left += 1
    return result`,
          javascript: `function spiralOrder(matrix) {
    const result = [];
    let top = 0, bottom = matrix.length - 1;
    let left = 0, right = matrix[0].length - 1;
    while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) result.push(matrix[top][c]);
        top++;
        for (let r = top; r <= bottom; r++) result.push(matrix[r][right]);
        right--;
        if (top <= bottom) {
            for (let c = right; c >= left; c--) result.push(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {
            for (let r = bottom; r >= top; r--) result.push(matrix[r][left]);
            left++;
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(1)' },
        keyPoints: ['Shrink boundaries after each side', 'Check bounds before bottom and left traversals', 'No visited matrix needed', 'Handles non-square matrices correctly'],
      },
    ],
  },
  '67': {
    approaches: [
      {
        name: 'Extra Space',
        description: 'Record which rows and columns contain zeros using extra arrays, then set the appropriate cells.',
        code: {
          python: `def setZeroes(matrix):
    m, n = len(matrix), len(matrix[0])
    rows = set()
    cols = set()
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == 0:
                rows.add(i)
                cols.add(j)
    for i in range(m):
        for j in range(n):
            if i in rows or j in cols:
                matrix[i][j] = 0`,
          javascript: `function setZeroes(matrix) {
    const m = matrix.length, n = matrix[0].length;
    const rows = new Set(), cols = new Set();
    for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
            if (matrix[i][j] === 0) { rows.add(i); cols.add(j); }
    for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
            if (rows.has(i) || cols.has(j)) matrix[i][j] = 0;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(m + n)' },
        keyPoints: ['Two sets track zero rows and columns', 'Two-pass approach: find zeros then set', 'Simple and easy to understand'],
      },
      {
        name: 'In-Place Markers (Optimal)',
        description: 'Use the first row and first column as markers. Track whether the first row/col themselves need zeroing with separate flags.',
        code: {
          python: `def setZeroes(matrix):
    m, n = len(matrix), len(matrix[0])
    first_row_zero = any(matrix[0][j] == 0 for j in range(n))
    first_col_zero = any(matrix[i][0] == 0 for i in range(m))
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = 0
                matrix[0][j] = 0
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = 0
    if first_row_zero:
        for j in range(n):
            matrix[0][j] = 0
    if first_col_zero:
        for i in range(m):
            matrix[i][0] = 0`,
          javascript: `function setZeroes(matrix) {
    const m = matrix.length, n = matrix[0].length;
    let firstRowZero = false, firstColZero = false;
    for (let j = 0; j < n; j++) if (matrix[0][j] === 0) firstRowZero = true;
    for (let i = 0; i < m; i++) if (matrix[i][0] === 0) firstColZero = true;
    for (let i = 1; i < m; i++)
        for (let j = 1; j < n; j++)
            if (matrix[i][j] === 0) { matrix[i][0] = 0; matrix[0][j] = 0; }
    for (let i = 1; i < m; i++)
        for (let j = 1; j < n; j++)
            if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0;
    if (firstRowZero) for (let j = 0; j < n; j++) matrix[0][j] = 0;
    if (firstColZero) for (let i = 0; i < m; i++) matrix[i][0] = 0;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(1)' },
        keyPoints: ['First row and column serve as markers', 'Two boolean flags for first row/col', 'Process inner matrix first, then edges', 'True O(1) extra space solution'],
      },
    ],
  },
  '68': {
    approaches: [
      {
        name: 'String Conversion',
        description: 'Convert the number to binary string and count the 1 characters.',
        code: {
          python: `def hammingWeight(n):
    return bin(n).count('1')`,
          javascript: `function hammingWeight(n) {
    return n.toString(2).split('').filter(c => c === '1').length;
}`,
        },
        complexity: { time: 'O(32)', space: 'O(32)' },
        keyPoints: ['Convert to binary string', 'Count character occurrences', 'Simple but creates extra string'],
      },
      {
        name: 'Bit Manipulation (Optimal)',
        description: 'Use n & (n-1) to clear the lowest set bit each iteration. Count iterations until n becomes 0.',
        code: {
          python: `def hammingWeight(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count`,
          javascript: `function hammingWeight(n) {
    let count = 0;
    while (n) {
        n &= n - 1;
        count++;
    }
    return count;
}`,
        },
        complexity: { time: 'O(k)', space: 'O(1)' },
        keyPoints: ['n & (n-1) clears the lowest set bit', 'Iterations equal number of 1 bits', 'Faster than checking all 32 bits', 'Brian Kernighan\'s algorithm'],
      },
    ],
  },
  '69': {
    approaches: [
      {
        name: 'Count Each Number',
        description: 'For each number from 0 to n, count its set bits individually.',
        code: {
          python: `def countBits(n):
    result = []
    for i in range(n + 1):
        count = 0
        num = i
        while num:
            num &= num - 1
            count += 1
        result.append(count)
    return result`,
          javascript: `function countBits(n) {
    const result = [];
    for (let i = 0; i <= n; i++) {
        let count = 0, num = i;
        while (num) { num &= num - 1; count++; }
        result.push(count);
    }
    return result;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Apply Hamming weight to each number', 'Each number takes up to O(log n) to count', 'Does not leverage previously computed results'],
      },
      {
        name: 'Dynamic Programming (Optimal)',
        description: 'Use the recurrence: bits[i] = bits[i >> 1] + (i & 1). The number of bits in i equals bits in i/2 plus the last bit.',
        code: {
          python: `def countBits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp`,
          javascript: `function countBits(n) {
    const dp = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
        dp[i] = dp[i >> 1] + (i & 1);
    }
    return dp;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['bits[i] = bits[i/2] + last bit', 'Right shift removes last bit', 'i & 1 checks if last bit is set', 'Each value computed in O(1)'],
      },
    ],
  },
  '70': {
    approaches: [
      {
        name: 'String Reverse',
        description: 'Convert to 32-bit binary string, reverse it, and convert back to integer.',
        code: {
          python: `def reverseBits(n):
    binary = bin(n)[2:].zfill(32)
    return int(binary[::-1], 2)`,
          javascript: `function reverseBits(n) {
    return parseInt(n.toString(2).padStart(32, '0').split('').reverse().join(''), 2);
}`,
        },
        complexity: { time: 'O(32)', space: 'O(32)' },
        keyPoints: ['Pad to 32 bits before reversing', 'String manipulation approach', 'Simple but uses extra space'],
      },
      {
        name: 'Bit-by-Bit (Optimal)',
        description: 'Extract each bit from the right of n and place it on the left of the result, iterating 32 times.',
        code: {
          python: `def reverseBits(n):
    result = 0
    for _ in range(32):
        result = (result << 1) | (n & 1)
        n >>= 1
    return result`,
          javascript: `function reverseBits(n) {
    let result = 0;
    for (let i = 0; i < 32; i++) {
        result = (result << 1) | (n & 1);
        n >>>= 1;
    }
    return result >>> 0;
}`,
        },
        complexity: { time: 'O(32)', space: 'O(1)' },
        keyPoints: ['Shift result left, OR with last bit of n', 'Shift n right each iteration', 'Always process exactly 32 bits', 'Use unsigned right shift (>>>) in JavaScript'],
      },
    ],
  },
  '71': {
    approaches: [
      {
        name: 'Sorting',
        description: 'Sort the array and find the first index where the value does not match the index.',
        code: {
          python: `def missingNumber(nums):
    nums.sort()
    for i in range(len(nums)):
        if nums[i] != i:
            return i
    return len(nums)`,
          javascript: `function missingNumber(nums) {
    nums.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== i) return i;
    }
    return nums.length;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(1)' },
        keyPoints: ['Sort first then linear scan', 'Missing number breaks sorted index pattern', 'If no mismatch found, missing number is n'],
      },
      {
        name: 'XOR / Math (Optimal)',
        description: 'XOR all indices and values — duplicates cancel out, leaving only the missing number. Alternatively, use Gauss sum formula.',
        code: {
          python: `def missingNumber(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)`,
          javascript: `function missingNumber(nums) {
    const n = nums.length;
    const expected = n * (n + 1) / 2;
    const actual = nums.reduce((a, b) => a + b, 0);
    return expected - actual;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Gauss formula: sum of 0..n is n*(n+1)/2', 'Subtract actual sum to find missing', 'XOR approach also works: a^a=0, a^0=a', 'No extra space required'],
      },
    ],
  },
  '72': {
    approaches: [
      {
        name: 'Iterative Bit Manipulation',
        description: 'Add two numbers using bitwise operations. XOR gives sum without carry, AND shifted left gives the carry. Repeat until carry is zero.',
        code: {
          python: `def getSum(a, b):
    MASK = 0xFFFFFFFF
    MAX = 0x7FFFFFFF
    while b & MASK:
        carry = (a & b) << 1
        a = a ^ b
        b = carry
    return a if a <= MAX else ~(a ^ MASK)`,
          javascript: `function getSum(a, b) {
    while (b !== 0) {
        const carry = (a & b) << 1;
        a = a ^ b;
        b = carry;
    }
    return a;
}`,
        },
        complexity: { time: 'O(32)', space: 'O(1)' },
        keyPoints: ['XOR gives sum without carry', 'AND gives carry bits', 'Shift carry left and repeat', 'Python needs masking for negative numbers'],
      },
      {
        name: 'Recursive Bit Manipulation',
        description: 'Same logic as iterative but expressed recursively. Base case: when carry is zero, return the sum.',
        code: {
          python: `def getSum(a, b):
    MASK = 0xFFFFFFFF
    MAX = 0x7FFFFFFF
    if b == 0:
        return a if a <= MAX else ~(a ^ MASK)
    return getSum((a ^ b) & MASK, ((a & b) << 1) & MASK)`,
          javascript: `function getSum(a, b) {
    if (b === 0) return a;
    return getSum(a ^ b, (a & b) << 1);
}`,
        },
        complexity: { time: 'O(32)', space: 'O(32)' },
        keyPoints: ['Same bit logic in recursive form', 'Base case: no carry remaining', 'Python requires 32-bit masking', 'JavaScript handles 32-bit ints natively'],
      },
    ],
  },
  '73': {
    approaches: [
      {
        name: 'Sorting by Frequency',
        description: 'Sort tasks by frequency and simulate the scheduling process, placing tasks in order of frequency with cooldown gaps.',
        code: {
          python: `def leastInterval(tasks, n):
    from collections import Counter
    import heapq
    count = Counter(tasks)
    heap = [-c for c in count.values()]
    heapq.heapify(heap)
    time = 0
    while heap:
        cycle = []
        for _ in range(n + 1):
            if heap:
                cycle.append(heapq.heappop(heap))
            time += 1
            if not heap and not cycle:
                break
        for cnt in cycle:
            if cnt + 1 < 0:
                heapq.heappush(heap, cnt + 1)
        if not heap:
            break
    return time`,
          javascript: `function leastInterval(tasks, n) {
    const count = {};
    for (const t of tasks) count[t] = (count[t] || 0) + 1;
    const heap = Object.values(count).sort((a, b) => b - a);
    let time = 0;
    while (heap.length) {
        const temp = [];
        for (let i = 0; i <= n; i++) {
            if (heap.length) temp.push(heap.shift());
            time++;
            if (!heap.length && !temp.length) break;
        }
        for (const cnt of temp) {
            if (cnt - 1 > 0) heap.push(cnt - 1);
        }
        heap.sort((a, b) => b - a);
        if (!heap.length) break;
    }
    return time;
}`,
        },
        complexity: { time: 'O(n * m)', space: 'O(26)' },
        keyPoints: ['Use max-heap to always pick most frequent', 'Process tasks in cycles of n+1', 'Re-insert tasks with decremented count', 'Idle time fills unused cycle slots'],
      },
      {
        name: 'Math Formula (Optimal)',
        description: 'The minimum time is determined by the most frequent task. Calculate idle slots and fill them with other tasks.',
        code: {
          python: `def leastInterval(tasks, n):
    from collections import Counter
    count = Counter(tasks)
    max_freq = max(count.values())
    max_count = sum(1 for v in count.values() if v == max_freq)
    result = (max_freq - 1) * (n + 1) + max_count
    return max(result, len(tasks))`,
          javascript: `function leastInterval(tasks, n) {
    const count = {};
    for (const t of tasks) count[t] = (count[t] || 0) + 1;
    const freqs = Object.values(count);
    const maxFreq = Math.max(...freqs);
    const maxCount = freqs.filter(f => f === maxFreq).length;
    const result = (maxFreq - 1) * (n + 1) + maxCount;
    return Math.max(result, tasks.length);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Formula: (maxFreq-1) * (n+1) + maxCount', 'maxCount = number of tasks with max frequency', 'Result is at least total number of tasks', 'Idle slots are filled by less frequent tasks'],
      },
    ],
  },
  '74': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every possible substring and verify if it is a palindrome.',
        code: {
          python: `def countSubstrings(s):
    count = 0
    for i in range(len(s)):
        for j in range(i, len(s)):
            sub = s[i:j+1]
            if sub == sub[::-1]:
                count += 1
    return count`,
          javascript: `function countSubstrings(s) {
    let count = 0;
    for (let i = 0; i < s.length; i++) {
        for (let j = i; j < s.length; j++) {
            const sub = s.substring(i, j + 1);
            if (sub === sub.split('').reverse().join('')) count++;
        }
    }
    return count;
}`,
        },
        complexity: { time: 'O(n\u00B3)', space: 'O(n)' },
        keyPoints: ['Check all O(n\u00B2) substrings', 'Each palindrome check is O(n)', 'Very slow for large inputs'],
      },
      {
        name: 'Expand Around Center (Optimal)',
        description: 'For each possible center (single char or between two chars), expand outward while characters match. Count all palindromes found.',
        code: {
          python: `def countSubstrings(s):
    count = 0
    def expand(left, right):
        nonlocal count
        while left >= 0 and right < len(s) and s[left] == s[right]:
            count += 1
            left -= 1
            right += 1
    for i in range(len(s)):
        expand(i, i)      # odd length
        expand(i, i + 1)  # even length
    return count`,
          javascript: `function countSubstrings(s) {
    let count = 0;
    function expand(left, right) {
        while (left >= 0 && right < s.length && s[left] === s[right]) {
            count++;
            left--;
            right++;
        }
    }
    for (let i = 0; i < s.length; i++) {
        expand(i, i);     // odd length
        expand(i, i + 1); // even length
    }
    return count;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['2n-1 possible centers (odd + even length)', 'Expand outward while characters match', 'Each expansion counts one palindrome', 'No extra space needed'],
      },
    ],
  },
  '75': {
    approaches: [
      {
        name: 'Recursive (Brute Force)',
        description: 'Recursively compare characters. If they match, both advance. Otherwise, try skipping a character from each string and take the max.',
        code: {
          python: `def longestCommonSubsequence(text1, text2):
    def dp(i, j):
        if i == len(text1) or j == len(text2):
            return 0
        if text1[i] == text2[j]:
            return 1 + dp(i + 1, j + 1)
        return max(dp(i + 1, j), dp(i, j + 1))
    return dp(0, 0)`,
          javascript: `function longestCommonSubsequence(text1, text2) {
    function dp(i, j) {
        if (i === text1.length || j === text2.length) return 0;
        if (text1[i] === text2[j]) return 1 + dp(i + 1, j + 1);
        return Math.max(dp(i + 1, j), dp(i, j + 1));
    }
    return dp(0, 0);
}`,
        },
        complexity: { time: 'O(2^(m+n))', space: 'O(m + n)' },
        keyPoints: ['Exponential time without memoization', 'Overlapping subproblems', 'Base case: either string exhausted', 'Illustrates the recurrence relation'],
      },
      {
        name: '2D DP (Optimal)',
        description: 'Build a 2D table bottom-up. If characters match, dp[i][j] = 1 + dp[i-1][j-1]. Otherwise, take max of skipping from either string.',
        code: {
          python: `def longestCommonSubsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = 1 + dp[i-1][j-1]
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]`,
          javascript: `function longestCommonSubsequence(text1, text2) {
    const m = text1.length, n = text2.length;
    const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i-1] === text2[j-1]) {
                dp[i][j] = 1 + dp[i-1][j-1];
            } else {
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }
    return dp[m][n];
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(m * n)' },
        keyPoints: ['Classic 2D DP problem', 'Match: take diagonal + 1', 'No match: max of left or above', 'Can optimize space to O(min(m,n)) with rolling array'],
      },
    ],
  },
  '39': {
    approaches: [
      {
        name: 'Sort and Find Middle',
        description: 'Store all numbers in an array. Sort the array each time findMedian is called and return the middle element(s).',
        code: {
          python: `class MedianFinder:
    def __init__(self):
        self.data = []

    def addNum(self, num):
        self.data.append(num)

    def findMedian(self):
        self.data.sort()
        n = len(self.data)
        if n % 2 == 1:
            return self.data[n // 2]
        return (self.data[n // 2 - 1] + self.data[n // 2]) / 2`,
          javascript: `class MedianFinder {
    constructor() {
        this.data = [];
    }
    addNum(num) {
        this.data.push(num);
    }
    findMedian() {
        this.data.sort((a, b) => a - b);
        const n = this.data.length;
        if (n % 2 === 1) return this.data[Math.floor(n / 2)];
        return (this.data[Math.floor(n / 2) - 1] + this.data[Math.floor(n / 2)]) / 2;
    }
}`,
        },
        complexity: { time: 'O(n log n) per findMedian', space: 'O(n)' },
        keyPoints: ['Sort on every findMedian call', 'Simple but inefficient for frequent queries', 'O(1) addNum but costly findMedian'],
      },
      {
        name: 'Two Heaps (Optimal)',
        description: 'Maintain a max-heap for the lower half and a min-heap for the upper half. Balance sizes so median is at the tops.',
        code: {
          python: `import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []  # max-heap (negate values)
        self.hi = []  # min-heap

    def addNum(self, num):
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def findMedian(self):
        if len(self.lo) > len(self.hi):
            return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2`,
          javascript: `// Using sorted insertion (JS lacks built-in heap)
class MedianFinder {
    constructor() {
        this.arr = [];
    }
    addNum(num) {
        let lo = 0, hi = this.arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (this.arr[mid] < num) lo = mid + 1;
            else hi = mid;
        }
        this.arr.splice(lo, 0, num);
    }
    findMedian() {
        const n = this.arr.length;
        if (n % 2 === 1) return this.arr[n >> 1];
        return (this.arr[(n >> 1) - 1] + this.arr[n >> 1]) / 2;
    }
}`,
        },
        complexity: { time: 'O(log n) addNum, O(1) findMedian', space: 'O(n)' },
        keyPoints: ['Max-heap holds smaller half, min-heap holds larger half', 'Balance heaps so sizes differ by at most 1', 'Median is always at heap tops', 'Python uses negation to simulate max-heap'],
      },
    ],
  },
  '40': {
    approaches: [
      {
        name: 'Brute Force (Generate All)',
        description: 'Generate all possible combinations with repetition and filter those that sum to target.',
        code: {
          python: `def combinationSum(candidates, target):
    result = []
    def backtrack(start, combo, total):
        if total == target:
            result.append(combo[:])
            return
        if total > target:
            return
        for i in range(start, len(candidates)):
            combo.append(candidates[i])
            backtrack(i, combo, total + candidates[i])
            combo.pop()
    backtrack(0, [], 0)
    return result`,
          javascript: `function combinationSum(candidates, target) {
    const result = [];
    function backtrack(start, combo, total) {
        if (total === target) { result.push([...combo]); return; }
        if (total > target) return;
        for (let i = start; i < candidates.length; i++) {
            combo.push(candidates[i]);
            backtrack(i, combo, total + candidates[i]);
            combo.pop();
        }
    }
    backtrack(0, [], 0);
    return result;
}`,
        },
        complexity: { time: 'O(n^(target/min))', space: 'O(target/min)' },
        keyPoints: ['Backtracking with reuse allowed', 'Start index avoids duplicate combos', 'Prune when total exceeds target'],
      },
      {
        name: 'Backtracking with Sorting (Optimal)',
        description: 'Sort candidates first to enable early termination. Use backtracking allowing same element reuse.',
        code: {
          python: `def combinationSum(candidates, target):
    candidates.sort()
    result = []
    def backtrack(start, combo, remaining):
        if remaining == 0:
            result.append(combo[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break
            combo.append(candidates[i])
            backtrack(i, combo, remaining - candidates[i])
            combo.pop()
    backtrack(0, [], target)
    return result`,
          javascript: `function combinationSum(candidates, target) {
    candidates.sort((a, b) => a - b);
    const result = [];
    function backtrack(start, combo, remaining) {
        if (remaining === 0) { result.push([...combo]); return; }
        for (let i = start; i < candidates.length; i++) {
            if (candidates[i] > remaining) break;
            combo.push(candidates[i]);
            backtrack(i, combo, remaining - candidates[i]);
            combo.pop();
        }
    }
    backtrack(0, [], target);
    return result;
}`,
        },
        complexity: { time: 'O(n^(target/min))', space: 'O(target/min)' },
        keyPoints: ['Sorting enables early break when candidate > remaining', 'Pass index i (not i+1) to allow reuse', 'Remaining decreases each level', 'Backtrack by popping last element'],
      },
    ],
  },
  '41': {
    approaches: [
      {
        name: 'Brute Force DFS',
        description: 'For each cell, start a DFS to check if the word can be formed. Use in-place marking to avoid revisiting.',
        code: {
          python: `def exist(board, word):
    rows, cols = len(board), len(board[0])
    def dfs(r, c, idx):
        if idx == len(word):
            return True
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return False
        if board[r][c] != word[idx]:
            return False
        temp = board[r][c]
        board[r][c] = '#'
        found = (dfs(r+1, c, idx+1) or dfs(r-1, c, idx+1) or
                 dfs(r, c+1, idx+1) or dfs(r, c-1, idx+1))
        board[r][c] = temp
        return found
    for r in range(rows):
        for c in range(cols):
            if dfs(r, c, 0):
                return True
    return False`,
          javascript: `function exist(board, word) {
    const rows = board.length, cols = board[0].length;
    function dfs(r, c, idx) {
        if (idx === word.length) return true;
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        if (board[r][c] !== word[idx]) return false;
        const temp = board[r][c];
        board[r][c] = '#';
        const found = dfs(r+1, c, idx+1) || dfs(r-1, c, idx+1) ||
                      dfs(r, c+1, idx+1) || dfs(r, c-1, idx+1);
        board[r][c] = temp;
        return found;
    }
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (dfs(r, c, 0)) return true;
    return false;
}`,
        },
        complexity: { time: 'O(m * n * 4^L)', space: 'O(L)' },
        keyPoints: ['Try each cell as starting point', 'Mark visited by temporarily changing cell', 'Restore cell after backtracking', 'L is the length of the word'],
      },
      {
        name: 'Optimized Backtracking',
        description: 'Add pruning: check character frequency before searching, and reverse word if last char is less frequent than first.',
        code: {
          python: `from collections import Counter

def exist(board, word):
    rows, cols = len(board), len(board[0])
    board_count = Counter()
    for r in range(rows):
        for c in range(cols):
            board_count[board[r][c]] += 1
    for ch, cnt in Counter(word).items():
        if board_count[ch] < cnt:
            return False
    if board_count[word[0]] > board_count[word[-1]]:
        word = word[::-1]

    def dfs(r, c, idx):
        if idx == len(word):
            return True
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return False
        if board[r][c] != word[idx]:
            return False
        temp = board[r][c]
        board[r][c] = '#'
        found = (dfs(r+1, c, idx+1) or dfs(r-1, c, idx+1) or
                 dfs(r, c+1, idx+1) or dfs(r, c-1, idx+1))
        board[r][c] = temp
        return found
    for r in range(rows):
        for c in range(cols):
            if dfs(r, c, 0):
                return True
    return False`,
          javascript: `function exist(board, word) {
    const rows = board.length, cols = board[0].length;
    const count = {};
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            count[board[r][c]] = (count[board[r][c]] || 0) + 1;
    const wordCount = {};
    for (const ch of word) wordCount[ch] = (wordCount[ch] || 0) + 1;
    for (const ch in wordCount)
        if ((count[ch] || 0) < wordCount[ch]) return false;
    if ((count[word[0]] || 0) > (count[word[word.length-1]] || 0))
        word = word.split('').reverse().join('');

    function dfs(r, c, idx) {
        if (idx === word.length) return true;
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        if (board[r][c] !== word[idx]) return false;
        const temp = board[r][c];
        board[r][c] = '#';
        const found = dfs(r+1,c,idx+1) || dfs(r-1,c,idx+1) ||
                      dfs(r,c+1,idx+1) || dfs(r,c-1,idx+1);
        board[r][c] = temp;
        return found;
    }
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (dfs(r, c, 0)) return true;
    return false;
}`,
        },
        complexity: { time: 'O(m * n * 4^L)', space: 'O(L)' },
        keyPoints: ['Pre-check character frequencies to fail fast', 'Reverse word to start from rarer character', 'Same worst case but much faster in practice', 'Backtracking with in-place marking'],
      },
    ],
  },
  '43': {
    approaches: [
      {
        name: 'BFS (Iterative)',
        description: 'Use BFS with a queue. Maintain a hash map from original node to its clone. Clone neighbors as you traverse.',
        code: {
          python: `from collections import deque

class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors else []

def cloneGraph(node):
    if not node:
        return None
    clones = {node: Node(node.val)}
    queue = deque([node])
    while queue:
        curr = queue.popleft()
        for neighbor in curr.neighbors:
            if neighbor not in clones:
                clones[neighbor] = Node(neighbor.val)
                queue.append(neighbor)
            clones[curr].neighbors.append(clones[neighbor])
    return clones[node]`,
          javascript: `function cloneGraph(node) {
    if (!node) return null;
    const clones = new Map();
    clones.set(node, { val: node.val, neighbors: [] });
    const queue = [node];
    while (queue.length) {
        const curr = queue.shift();
        for (const neighbor of curr.neighbors) {
            if (!clones.has(neighbor)) {
                clones.set(neighbor, { val: neighbor.val, neighbors: [] });
                queue.push(neighbor);
            }
            clones.get(curr).neighbors.push(clones.get(neighbor));
        }
    }
    return clones.get(node);
}`,
        },
        complexity: { time: 'O(V + E)', space: 'O(V)' },
        keyPoints: ['BFS traverses all nodes', 'Hash map tracks original-to-clone mapping', 'Clone neighbors as they are discovered'],
      },
      {
        name: 'DFS (Recursive, Optimal)',
        description: 'Recursively clone each node. Use a hash map to avoid cloning a node more than once.',
        code: {
          python: `class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors else []

def cloneGraph(node):
    clones = {}
    def dfs(n):
        if not n:
            return None
        if n in clones:
            return clones[n]
        clone = Node(n.val)
        clones[n] = clone
        for neighbor in n.neighbors:
            clone.neighbors.append(dfs(neighbor))
        return clone
    return dfs(node)`,
          javascript: `function cloneGraph(node) {
    const clones = new Map();
    function dfs(n) {
        if (!n) return null;
        if (clones.has(n)) return clones.get(n);
        const clone = { val: n.val, neighbors: [] };
        clones.set(n, clone);
        for (const neighbor of n.neighbors) {
            clone.neighbors.push(dfs(neighbor));
        }
        return clone;
    }
    return dfs(node);
}`,
        },
        complexity: { time: 'O(V + E)', space: 'O(V)' },
        keyPoints: ['DFS with memoization via hash map', 'Return cached clone if already visited', 'Recursion naturally handles graph structure', 'Same complexity as BFS approach'],
      },
    ],
  },
  '44': {
    approaches: [
      {
        name: 'BFS from Every Cell',
        description: 'For each cell, run BFS to check if water can reach both oceans. Very slow but conceptually simple.',
        code: {
          python: `from collections import deque

def pacificAtlantic(heights):
    if not heights:
        return []
    rows, cols = len(heights), len(heights[0])
    result = []
    for r in range(rows):
        for c in range(cols):
            pacific = atlantic = False
            visited = set()
            queue = deque([(r, c)])
            visited.add((r, c))
            while queue:
                cr, cc = queue.popleft()
                if cr == 0 or cc == 0:
                    pacific = True
                if cr == rows - 1 or cc == cols - 1:
                    atlantic = True
                if pacific and atlantic:
                    break
                for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in visited and heights[nr][nc] <= heights[cr][cc]:
                        visited.add((nr, nc))
                        queue.append((nr, nc))
            if pacific and atlantic:
                result.append([r, c])
    return result`,
          javascript: `function pacificAtlantic(heights) {
    if (!heights.length) return [];
    const rows = heights.length, cols = heights[0].length;
    const result = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let pacific = false, atlantic = false;
            const visited = new Set();
            const queue = [[r, c]];
            visited.add(r + ',' + c);
            while (queue.length) {
                const [cr, cc] = queue.shift();
                if (cr === 0 || cc === 0) pacific = true;
                if (cr === rows-1 || cc === cols-1) atlantic = true;
                if (pacific && atlantic) break;
                for (const [dr, dc] of dirs) {
                    const nr = cr+dr, nc = cc+dc;
                    if (nr>=0 && nr<rows && nc>=0 && nc<cols && !visited.has(nr+','+nc) && heights[nr][nc] <= heights[cr][cc]) {
                        visited.add(nr+','+nc);
                        queue.push([nr, nc]);
                    }
                }
            }
            if (pacific && atlantic) result.push([r, c]);
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O((m*n)^2)', space: 'O(m * n)' },
        keyPoints: ['BFS from every cell to both oceans', 'Water flows downhill (to equal or lower)', 'Very slow for large grids', 'Checks each cell independently'],
      },
      {
        name: 'Reverse BFS from Oceans (Optimal)',
        description: 'Start BFS from ocean borders going uphill. Cells reachable from both oceans are in the result.',
        code: {
          python: `from collections import deque

def pacificAtlantic(heights):
    if not heights:
        return []
    rows, cols = len(heights), len(heights[0])

    def bfs(starts):
        reachable = set(starts)
        queue = deque(starts)
        while queue:
            r, c = queue.popleft()
            for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in reachable and heights[nr][nc] >= heights[r][c]:
                    reachable.add((nr, nc))
                    queue.append((nr, nc))
        return reachable

    pacific_starts = [(r, 0) for r in range(rows)] + [(0, c) for c in range(1, cols)]
    atlantic_starts = [(r, cols-1) for r in range(rows)] + [(rows-1, c) for c in range(cols-1)]
    pacific = bfs(pacific_starts)
    atlantic = bfs(atlantic_starts)
    return [[r, c] for r, c in pacific & atlantic]`,
          javascript: `function pacificAtlantic(heights) {
    if (!heights.length) return [];
    const rows = heights.length, cols = heights[0].length;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    function bfs(starts) {
        const reachable = new Set(starts.map(([r,c]) => r+','+c));
        const queue = [...starts];
        while (queue.length) {
            const [r, c] = queue.shift();
            for (const [dr, dc] of dirs) {
                const nr = r+dr, nc = c+dc;
                const key = nr+','+nc;
                if (nr>=0 && nr<rows && nc>=0 && nc<cols && !reachable.has(key) && heights[nr][nc] >= heights[r][c]) {
                    reachable.add(key);
                    queue.push([nr, nc]);
                }
            }
        }
        return reachable;
    }

    const pacStarts = [], atlStarts = [];
    for (let r = 0; r < rows; r++) { pacStarts.push([r,0]); atlStarts.push([r,cols-1]); }
    for (let c = 0; c < cols; c++) { pacStarts.push([0,c]); atlStarts.push([rows-1,c]); }
    const pac = bfs(pacStarts), atl = bfs(atlStarts);
    const result = [];
    for (const key of pac) { if (atl.has(key)) result.push(key.split(',').map(Number)); }
    return result;
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(m * n)' },
        keyPoints: ['Reverse the flow: BFS from oceans going uphill', 'Pacific starts from top/left edges, Atlantic from bottom/right', 'Intersection of both reachable sets is the answer', 'Each cell visited at most twice'],
      },
    ],
  },
  '45': {
    approaches: [
      {
        name: 'DFS Cycle Detection',
        description: 'Build adjacency list and use DFS with 3 states (unvisited, visiting, visited) to detect cycles.',
        code: {
          python: `def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for course, prereq in prerequisites:
        graph[course].append(prereq)
    # 0: unvisited, 1: visiting, 2: visited
    state = [0] * numCourses

    def dfs(node):
        if state[node] == 1:
            return False  # cycle
        if state[node] == 2:
            return True
        state[node] = 1
        for neighbor in graph[node]:
            if not dfs(neighbor):
                return False
        state[node] = 2
        return True

    for i in range(numCourses):
        if not dfs(i):
            return False
    return True`,
          javascript: `function canFinish(numCourses, prerequisites) {
    const graph = Array.from({length: numCourses}, () => []);
    for (const [course, prereq] of prerequisites)
        graph[course].push(prereq);
    const state = new Array(numCourses).fill(0);

    function dfs(node) {
        if (state[node] === 1) return false;
        if (state[node] === 2) return true;
        state[node] = 1;
        for (const neighbor of graph[node]) {
            if (!dfs(neighbor)) return false;
        }
        state[node] = 2;
        return true;
    }

    for (let i = 0; i < numCourses; i++)
        if (!dfs(i)) return false;
    return true;
}`,
        },
        complexity: { time: 'O(V + E)', space: 'O(V + E)' },
        keyPoints: ['Three states: unvisited, visiting (in current path), visited', 'Cycle detected if we revisit a node in visiting state', 'DFS explores all dependencies'],
      },
      {
        name: "BFS Topological Sort (Kahn's Algorithm)",
        description: "Use BFS with in-degree tracking. Process nodes with in-degree 0. If all nodes processed, no cycle exists.",
        code: {
          python: `from collections import deque

def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    in_degree = [0] * numCourses
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1
    queue = deque(i for i in range(numCourses) if in_degree[i] == 0)
    count = 0
    while queue:
        node = queue.popleft()
        count += 1
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    return count == numCourses`,
          javascript: `function canFinish(numCourses, prerequisites) {
    const graph = Array.from({length: numCourses}, () => []);
    const inDegree = new Array(numCourses).fill(0);
    for (const [course, prereq] of prerequisites) {
        graph[prereq].push(course);
        inDegree[course]++;
    }
    const queue = [];
    for (let i = 0; i < numCourses; i++)
        if (inDegree[i] === 0) queue.push(i);
    let count = 0;
    while (queue.length) {
        const node = queue.shift();
        count++;
        for (const neighbor of graph[node]) {
            if (--inDegree[neighbor] === 0) queue.push(neighbor);
        }
    }
    return count === numCourses;
}`,
        },
        complexity: { time: 'O(V + E)', space: 'O(V + E)' },
        keyPoints: ["Kahn's algorithm for topological sort", 'Start with nodes that have no prerequisites', 'If count equals numCourses, no cycle', 'BFS processes nodes level by level'],
      },
    ],
  },
  '46': {
    approaches: [
      {
        name: 'DFS Cycle Detection',
        description: 'A valid tree has exactly n-1 edges, is connected, and has no cycles. Use DFS to verify connectivity and detect cycles.',
        code: {
          python: `def validTree(n, edges):
    if len(edges) != n - 1:
        return False
    graph = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    visited = set()

    def dfs(node, parent):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor == parent:
                continue
            if neighbor in visited:
                return False
            if not dfs(neighbor, node):
                return False
        return True

    if not dfs(0, -1):
        return False
    return len(visited) == n`,
          javascript: `function validTree(n, edges) {
    if (edges.length !== n - 1) return false;
    const graph = Array.from({length: n}, () => []);
    for (const [a, b] of edges) {
        graph[a].push(b);
        graph[b].push(a);
    }
    const visited = new Set();
    function dfs(node, parent) {
        visited.add(node);
        for (const neighbor of graph[node]) {
            if (neighbor === parent) continue;
            if (visited.has(neighbor)) return false;
            if (!dfs(neighbor, node)) return false;
        }
        return true;
    }
    if (!dfs(0, -1)) return false;
    return visited.size === n;
}`,
        },
        complexity: { time: 'O(V + E)', space: 'O(V + E)' },
        keyPoints: ['A tree has exactly n-1 edges', 'Must be connected (all nodes reachable)', 'Must have no cycles', 'DFS from any node should visit all nodes'],
      },
      {
        name: 'Union-Find (Optimal)',
        description: 'Use Union-Find: a valid tree has n-1 edges and no edge creates a cycle (no edge connects two already-connected nodes).',
        code: {
          python: `def validTree(n, edges):
    if len(edges) != n - 1:
        return False
    parent = list(range(n))
    rank = [0] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px == py:
            return False
        if rank[px] < rank[py]:
            px, py = py, px
        parent[py] = px
        if rank[px] == rank[py]:
            rank[px] += 1
        return True

    for a, b in edges:
        if not union(a, b):
            return False
    return True`,
          javascript: `function validTree(n, edges) {
    if (edges.length !== n - 1) return false;
    const parent = Array.from({length: n}, (_, i) => i);
    const rank = new Array(n).fill(0);
    function find(x) {
        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    function union(x, y) {
        let px = find(x), py = find(y);
        if (px === py) return false;
        if (rank[px] < rank[py]) [px, py] = [py, px];
        parent[py] = px;
        if (rank[px] === rank[py]) rank[px]++;
        return true;
    }
    for (const [a, b] of edges)
        if (!union(a, b)) return false;
    return true;
}`,
        },
        complexity: { time: 'O(n * \u03B1(n))', space: 'O(n)' },
        keyPoints: ['Union-Find with path compression and union by rank', 'If any edge connects already-connected nodes, cycle exists', 'n-1 edges check ensures connectivity if no cycles', '\u03B1(n) is inverse Ackermann, nearly O(1)'],
      },
    ],
  },
  '47': {
    approaches: [
      {
        name: 'DFS',
        description: 'Build an adjacency list. DFS from each unvisited node to mark all connected nodes. Count how many DFS calls are made.',
        code: {
          python: `def countComponents(n, edges):
    graph = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)
    visited = set()
    count = 0

    def dfs(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)

    for i in range(n):
        if i not in visited:
            dfs(i)
            count += 1
    return count`,
          javascript: `function countComponents(n, edges) {
    const graph = Array.from({length: n}, () => []);
    for (const [a, b] of edges) {
        graph[a].push(b);
        graph[b].push(a);
    }
    const visited = new Set();
    let count = 0;
    function dfs(node) {
        visited.add(node);
        for (const neighbor of graph[node])
            if (!visited.has(neighbor)) dfs(neighbor);
    }
    for (let i = 0; i < n; i++) {
        if (!visited.has(i)) { dfs(i); count++; }
    }
    return count;
}`,
        },
        complexity: { time: 'O(V + E)', space: 'O(V + E)' },
        keyPoints: ['Each DFS call explores one connected component', 'Mark nodes as visited to avoid revisiting', 'Count equals number of DFS initiations'],
      },
      {
        name: 'Union-Find (Optimal)',
        description: 'Use Union-Find to group connected nodes. Count distinct roots at the end.',
        code: {
          python: `def countComponents(n, edges):
    parent = list(range(n))
    rank = [0] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px == py:
            return
        if rank[px] < rank[py]:
            px, py = py, px
        parent[py] = px
        if rank[px] == rank[py]:
            rank[px] += 1

    for a, b in edges:
        union(a, b)
    return len(set(find(i) for i in range(n)))`,
          javascript: `function countComponents(n, edges) {
    const parent = Array.from({length: n}, (_, i) => i);
    const rank = new Array(n).fill(0);
    function find(x) {
        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }
    function union(x, y) {
        let px = find(x), py = find(y);
        if (px === py) return;
        if (rank[px] < rank[py]) [px, py] = [py, px];
        parent[py] = px;
        if (rank[px] === rank[py]) rank[px]++;
    }
    for (const [a, b] of edges) union(a, b);
    const roots = new Set();
    for (let i = 0; i < n; i++) roots.add(find(i));
    return roots.size;
}`,
        },
        complexity: { time: 'O(n * \u03B1(n))', space: 'O(n)' },
        keyPoints: ['Union-Find groups connected nodes efficiently', 'Path compression and union by rank for near O(1) operations', 'Count distinct roots after all unions', 'No need to build adjacency list'],
      },
    ],
  },
  '48': {
    approaches: [
      {
        name: "BFS Topological Sort",
        description: "Build a graph of character orderings from adjacent words. Use BFS (Kahn's) topological sort to find the order.",
        code: {
          python: `from collections import deque, defaultdict

def alienOrder(words):
    adj = defaultdict(set)
    in_degree = {c: 0 for word in words for c in word}
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        min_len = min(len(w1), len(w2))
        if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
            return ""
        for j in range(min_len):
            if w1[j] != w2[j]:
                if w2[j] not in adj[w1[j]]:
                    adj[w1[j]].add(w2[j])
                    in_degree[w2[j]] += 1
                break

    queue = deque(c for c in in_degree if in_degree[c] == 0)
    result = []
    while queue:
        c = queue.popleft()
        result.append(c)
        for neighbor in adj[c]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    if len(result) != len(in_degree):
        return ""
    return "".join(result)`,
          javascript: `function alienOrder(words) {
    const adj = new Map();
    const inDegree = new Map();
    for (const word of words)
        for (const c of word) {
            if (!adj.has(c)) adj.set(c, new Set());
            if (!inDegree.has(c)) inDegree.set(c, 0);
        }
    for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i], w2 = words[i+1];
        const minLen = Math.min(w1.length, w2.length);
        if (w1.length > w2.length && w1.slice(0, minLen) === w2.slice(0, minLen))
            return "";
        for (let j = 0; j < minLen; j++) {
            if (w1[j] !== w2[j]) {
                if (!adj.get(w1[j]).has(w2[j])) {
                    adj.get(w1[j]).add(w2[j]);
                    inDegree.set(w2[j], inDegree.get(w2[j]) + 1);
                }
                break;
            }
        }
    }
    const queue = [];
    for (const [c, deg] of inDegree) if (deg === 0) queue.push(c);
    const result = [];
    while (queue.length) {
        const c = queue.shift();
        result.push(c);
        for (const neighbor of adj.get(c)) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) queue.push(neighbor);
        }
    }
    return result.length === inDegree.size ? result.join('') : "";
}`,
        },
        complexity: { time: 'O(C)', space: 'O(1)' },
        keyPoints: ['C is total characters across all words', 'Compare adjacent words to find ordering edges', "Kahn's BFS topological sort to produce order", 'Return empty string if cycle or invalid input'],
      },
      {
        name: 'DFS Topological Sort',
        description: 'Build the same graph and use DFS-based topological sort. Post-order reverse gives valid ordering.',
        code: {
          python: `from collections import defaultdict

def alienOrder(words):
    adj = defaultdict(set)
    chars = set(c for word in words for c in word)
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        min_len = min(len(w1), len(w2))
        if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:
            return ""
        for j in range(min_len):
            if w1[j] != w2[j]:
                adj[w1[j]].add(w2[j])
                break

    state = {c: 0 for c in chars}
    result = []

    def dfs(c):
        if state[c] == 1:
            return False
        if state[c] == 2:
            return True
        state[c] = 1
        for neighbor in adj[c]:
            if not dfs(neighbor):
                return False
        state[c] = 2
        result.append(c)
        return True

    for c in chars:
        if not dfs(c):
            return ""
    return "".join(reversed(result))`,
          javascript: `function alienOrder(words) {
    const adj = new Map();
    const chars = new Set();
    for (const word of words)
        for (const c of word) {
            chars.add(c);
            if (!adj.has(c)) adj.set(c, new Set());
        }
    for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i], w2 = words[i+1];
        const minLen = Math.min(w1.length, w2.length);
        if (w1.length > w2.length && w1.slice(0, minLen) === w2.slice(0, minLen)) return "";
        for (let j = 0; j < minLen; j++) {
            if (w1[j] !== w2[j]) { adj.get(w1[j]).add(w2[j]); break; }
        }
    }
    const state = new Map();
    for (const c of chars) state.set(c, 0);
    const result = [];
    function dfs(c) {
        if (state.get(c) === 1) return false;
        if (state.get(c) === 2) return true;
        state.set(c, 1);
        for (const neighbor of (adj.get(c) || [])) { if (!dfs(neighbor)) return false; }
        state.set(c, 2);
        result.push(c);
        return true;
    }
    for (const c of chars) if (!dfs(c)) return "";
    return result.reverse().join('');
}`,
        },
        complexity: { time: 'O(C)', space: 'O(1)' },
        keyPoints: ['DFS post-order gives reverse topological order', 'Three-state coloring detects cycles', 'Space is O(1) since alphabet size is bounded', 'Handle edge case: longer word as prefix before shorter word'],
      },
    ],
  },
  '51': {
    approaches: [
      {
        name: 'Brute Force (Try All Subsets)',
        description: 'Since houses are in a circle, try robbing houses [0..n-2] and [1..n-1] separately using basic recursion.',
        code: {
          python: `def rob(nums):
    if len(nums) == 1:
        return nums[0]
    def rob_linear(houses):
        if not houses:
            return 0
        if len(houses) == 1:
            return houses[0]
        def helper(i):
            if i < 0:
                return 0
            return max(helper(i - 1), helper(i - 2) + houses[i])
        return helper(len(houses) - 1)
    return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))`,
          javascript: `function rob(nums) {
    if (nums.length === 1) return nums[0];
    function robLinear(houses) {
        if (!houses.length) return 0;
        function helper(i) {
            if (i < 0) return 0;
            return Math.max(helper(i - 1), helper(i - 2) + houses[i]);
        }
        return helper(houses.length - 1);
    }
    return Math.max(robLinear(nums.slice(0, -1)), robLinear(nums.slice(1)));
}`,
        },
        complexity: { time: 'O(2^n)', space: 'O(n)' },
        keyPoints: ['Break circular problem into two linear problems', 'Either include first house or last house, not both', 'Recursive without memoization is exponential'],
      },
      {
        name: 'DP Two Passes (Optimal)',
        description: 'Run House Robber I DP on nums[0..n-2] and nums[1..n-1]. Return the maximum.',
        code: {
          python: `def rob(nums):
    if len(nums) == 1:
        return nums[0]

    def rob_linear(houses):
        prev1 = prev2 = 0
        for num in houses:
            prev1, prev2 = max(prev1, prev2 + num), prev1
        return prev1

    return max(rob_linear(nums[:-1]), rob_linear(nums[1:]))`,
          javascript: `function rob(nums) {
    if (nums.length === 1) return nums[0];
    function robLinear(houses) {
        let prev1 = 0, prev2 = 0;
        for (const num of houses) {
            const temp = Math.max(prev1, prev2 + num);
            prev2 = prev1;
            prev1 = temp;
        }
        return prev1;
    }
    return Math.max(robLinear(nums.slice(0, -1)), robLinear(nums.slice(1)));
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Reduce circular to two linear subproblems', 'Reuse House Robber I solution', 'Only two variables needed per pass', 'Handle edge case of single house'],
      },
    ],
  },
  '52': {
    approaches: [
      {
        name: 'DP (Quadratic)',
        description: 'For each element, find the longest increasing subsequence ending at that element by checking all previous elements.',
        code: {
          python: `def lengthOfLIS(nums):
    n = len(nums)
    dp = [1] * n
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
          javascript: `function lengthOfLIS(nums) {
    const n = nums.length;
    const dp = new Array(n).fill(1);
    for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
    }
    return Math.max(...dp);
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(n)' },
        keyPoints: ['dp[i] = LIS length ending at index i', 'Check all previous elements for valid extensions', 'Answer is max over all dp values'],
      },
      {
        name: 'Binary Search + Patience Sorting (Optimal)',
        description: 'Maintain a tails array where tails[i] is the smallest tail of all increasing subsequences of length i+1. Use binary search to update.',
        code: {
          python: `import bisect

def lengthOfLIS(nums):
    tails = []
    for num in nums:
        pos = bisect.bisect_left(tails, num)
        if pos == len(tails):
            tails.append(num)
        else:
            tails[pos] = num
    return len(tails)`,
          javascript: `function lengthOfLIS(nums) {
    const tails = [];
    for (const num of nums) {
        let lo = 0, hi = tails.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (tails[mid] < num) lo = mid + 1;
            else hi = mid;
        }
        if (lo === tails.length) tails.push(num);
        else tails[lo] = num;
    }
    return tails.length;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['tails array is always sorted', 'Binary search finds position to insert/replace', 'Length of tails = LIS length', 'Tails array is NOT the actual LIS'],
      },
    ],
  },
  '54': {
    approaches: [
      {
        name: 'Recursive with Memoization',
        description: 'Try every possible split position. Check if the prefix is a word and recurse on the rest.',
        code: {
          python: `def wordBreak(s, wordDict):
    word_set = set(wordDict)
    memo = {}
    def dp(start):
        if start == len(s):
            return True
        if start in memo:
            return memo[start]
        for end in range(start + 1, len(s) + 1):
            if s[start:end] in word_set and dp(end):
                memo[start] = True
                return True
        memo[start] = False
        return False
    return dp(0)`,
          javascript: `function wordBreak(s, wordDict) {
    const wordSet = new Set(wordDict);
    const memo = {};
    function dp(start) {
        if (start === s.length) return true;
        if (memo[start] !== undefined) return memo[start];
        for (let end = start + 1; end <= s.length; end++) {
            if (wordSet.has(s.slice(start, end)) && dp(end)) {
                return memo[start] = true;
            }
        }
        return memo[start] = false;
    }
    return dp(0);
}`,
        },
        complexity: { time: 'O(n\u00B2 * m)', space: 'O(n)' },
        keyPoints: ['Try every prefix as a dictionary word', 'Memoize results to avoid recomputation', 'm is the max word length for substring creation', 'Top-down DP approach'],
      },
      {
        name: 'Bottom-Up DP (Optimal)',
        description: 'dp[i] is true if s[0..i-1] can be segmented. For each position, check all possible last words.',
        code: {
          python: `def wordBreak(s, wordDict):
    word_set = set(wordDict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break
    return dp[n]`,
          javascript: `function wordBreak(s, wordDict) {
    const wordSet = new Set(wordDict);
    const n = s.length;
    const dp = new Array(n + 1).fill(false);
    dp[0] = true;
    for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
            if (dp[j] && wordSet.has(s.slice(j, i))) {
                dp[i] = true;
                break;
            }
        }
    }
    return dp[n];
}`,
        },
        complexity: { time: 'O(n\u00B2 * m)', space: 'O(n)' },
        keyPoints: ['dp[0] = true (empty string is segmentable)', 'For each end position, check all start positions', 'Break early once dp[i] is true', 'Set lookup for O(m) substring check'],
      },
    ],
  },
  '55': {
    approaches: [
      {
        name: 'Recursive with Memoization',
        description: 'At each position, decode one digit or two digits (if valid). Count total ways recursively.',
        code: {
          python: `def numDecodings(s):
    memo = {}
    def dp(i):
        if i == len(s):
            return 1
        if s[i] == '0':
            return 0
        if i in memo:
            return memo[i]
        ways = dp(i + 1)
        if i + 1 < len(s) and int(s[i:i+2]) <= 26:
            ways += dp(i + 2)
        memo[i] = ways
        return ways
    return dp(0)`,
          javascript: `function numDecodings(s) {
    const memo = {};
    function dp(i) {
        if (i === s.length) return 1;
        if (s[i] === '0') return 0;
        if (memo[i] !== undefined) return memo[i];
        let ways = dp(i + 1);
        if (i + 1 < s.length && Number(s.slice(i, i+2)) <= 26) {
            ways += dp(i + 2);
        }
        return memo[i] = ways;
    }
    return dp(0);
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Base case: end of string = 1 valid way', 'Leading 0 means invalid decoding', 'Can take 1 or 2 digits at each step', 'Memoization prevents exponential blowup'],
      },
      {
        name: 'Bottom-Up DP (Optimal)',
        description: 'Use iterative DP with two variables. dp[i] depends only on dp[i+1] and dp[i+2].',
        code: {
          python: `def numDecodings(s):
    if not s or s[0] == '0':
        return 0
    n = len(s)
    prev1 = 1  # dp[n]
    prev2 = 0  # dp[n+1]
    for i in range(n - 1, -1, -1):
        if s[i] == '0':
            current = 0
        else:
            current = prev1
            if i + 1 < n and int(s[i:i+2]) <= 26:
                current += prev2
        prev2 = prev1
        prev1 = current
    return prev1`,
          javascript: `function numDecodings(s) {
    if (!s.length || s[0] === '0') return 0;
    const n = s.length;
    let prev1 = 1, prev2 = 0;
    for (let i = n - 1; i >= 0; i--) {
        let current = s[i] === '0' ? 0 : prev1;
        if (i + 1 < n && Number(s.slice(i, i+2)) <= 26 && s[i] !== '0') {
            current += prev2;
        }
        prev2 = prev1;
        prev1 = current;
    }
    return prev1;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Process right to left', 'Only need two previous values', '0 digit cannot be decoded alone', 'Two-digit decode valid only for 10-26'],
      },
    ],
  },
  '56': {
    approaches: [
      {
        name: 'Recursive',
        description: 'At each cell, the number of paths is the sum of paths from the cell below and the cell to the right.',
        code: {
          python: `def uniquePaths(m, n):
    def dp(r, c):
        if r == m - 1 and c == n - 1:
            return 1
        if r >= m or c >= n:
            return 0
        return dp(r + 1, c) + dp(r, c + 1)
    return dp(0, 0)`,
          javascript: `function uniquePaths(m, n) {
    function dp(r, c) {
        if (r === m - 1 && c === n - 1) return 1;
        if (r >= m || c >= n) return 0;
        return dp(r + 1, c) + dp(r, c + 1);
    }
    return dp(0, 0);
}`,
        },
        complexity: { time: 'O(2^(m+n))', space: 'O(m + n)' },
        keyPoints: ['Two choices at each cell: down or right', 'Exponential without memoization', 'Many overlapping subproblems', 'Good for understanding the recurrence'],
      },
      {
        name: 'DP with Space Optimization (Optimal)',
        description: 'Fill a 1D DP array row by row. Each cell = sum of cell above + cell to the left.',
        code: {
          python: `def uniquePaths(m, n):
    dp = [1] * n
    for _ in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]
    return dp[n - 1]`,
          javascript: `function uniquePaths(m, n) {
    const dp = new Array(n).fill(1);
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[j] += dp[j - 1];
        }
    }
    return dp[n - 1];
}`,
        },
        complexity: { time: 'O(m * n)', space: 'O(n)' },
        keyPoints: ['First row and first column are all 1s', 'Each cell = above + left', 'Space optimized to single row', 'Classic grid DP problem'],
      },
    ],
  },
  '57': {
    approaches: [
      {
        name: 'DP (Bottom-Up)',
        description: 'dp[i] is true if index i is reachable. For each reachable index, mark all indices it can jump to.',
        code: {
          python: `def canJump(nums):
    n = len(nums)
    dp = [False] * n
    dp[0] = True
    for i in range(n):
        if dp[i]:
            for j in range(1, nums[i] + 1):
                if i + j < n:
                    dp[i + j] = True
    return dp[n - 1]`,
          javascript: `function canJump(nums) {
    const n = nums.length;
    const dp = new Array(n).fill(false);
    dp[0] = true;
    for (let i = 0; i < n; i++) {
        if (dp[i]) {
            for (let j = 1; j <= nums[i]; j++) {
                if (i + j < n) dp[i + j] = true;
            }
        }
    }
    return dp[n - 1];
}`,
        },
        complexity: { time: 'O(n * max(nums))', space: 'O(n)' },
        keyPoints: ['Mark all reachable positions', 'Start from index 0', 'Can be slow for large jump values', 'Simple DP approach'],
      },
      {
        name: 'Greedy (Optimal)',
        description: 'Track the farthest index reachable. At each step, update the farthest reach. If current index exceeds farthest, return false.',
        code: {
          python: `def canJump(nums):
    farthest = 0
    for i in range(len(nums)):
        if i > farthest:
            return False
        farthest = max(farthest, i + nums[i])
    return True`,
          javascript: `function canJump(nums) {
    let farthest = 0;
    for (let i = 0; i < nums.length; i++) {
        if (i > farthest) return false;
        farthest = Math.max(farthest, i + nums[i]);
    }
    return true;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Greedy: always track maximum reachable index', 'If current position > farthest, stuck', 'Single pass through array', 'No extra space needed'],
      },
    ],
  },
  '59': {
    approaches: [
      {
        name: 'Brute Force (Check All Subarrays)',
        description: 'Check every possible subarray and compute its product. Track the maximum.',
        code: {
          python: `def maxProduct(nums):
    result = max(nums)
    for i in range(len(nums)):
        product = 1
        for j in range(i, len(nums)):
            product *= nums[j]
            result = max(result, product)
    return result`,
          javascript: `function maxProduct(nums) {
    let result = Math.max(...nums);
    for (let i = 0; i < nums.length; i++) {
        let product = 1;
        for (let j = i; j < nums.length; j++) {
            product *= nums[j];
            result = Math.max(result, product);
        }
    }
    return result;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Try all subarrays', 'Running product avoids triple loop', 'Initialize result to max single element'],
      },
      {
        name: 'Track Min and Max (Optimal)',
        description: 'Track both the current max and min product (min can become max when multiplied by negative). Update at each step.',
        code: {
          python: `def maxProduct(nums):
    result = max(nums)
    cur_max = cur_min = 1
    for num in nums:
        if num == 0:
            cur_max = cur_min = 1
            continue
        temp = cur_max * num
        cur_max = max(num * cur_max, num * cur_min, num)
        cur_min = min(temp, num * cur_min, num)
        result = max(result, cur_max)
    return result`,
          javascript: `function maxProduct(nums) {
    let result = Math.max(...nums);
    let curMax = 1, curMin = 1;
    for (const num of nums) {
        if (num === 0) { curMax = 1; curMin = 1; continue; }
        const temp = curMax * num;
        curMax = Math.max(num * curMax, num * curMin, num);
        curMin = Math.min(temp, num * curMin, num);
        result = Math.max(result, curMax);
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(1)' },
        keyPoints: ['Negative * negative = positive, so track min too', 'Reset on zero since it kills the product', 'At each step: new max/min from (max*num, min*num, num)', 'Similar to Kadane but with min/max tracking'],
      },
    ],
  },
  '60': {
    approaches: [
      {
        name: 'Linear Scan',
        description: 'Iterate through intervals. Add intervals that come before, merge overlapping ones, then add remaining.',
        code: {
          python: `def insert(intervals, newInterval):
    result = []
    i = 0
    n = len(intervals)
    # Add all intervals before newInterval
    while i < n and intervals[i][1] < newInterval[0]:
        result.append(intervals[i])
        i += 1
    # Merge overlapping intervals
    while i < n and intervals[i][0] <= newInterval[1]:
        newInterval[0] = min(newInterval[0], intervals[i][0])
        newInterval[1] = max(newInterval[1], intervals[i][1])
        i += 1
    result.append(newInterval)
    # Add remaining intervals
    while i < n:
        result.append(intervals[i])
        i += 1
    return result`,
          javascript: `function insert(intervals, newInterval) {
    const result = [];
    let i = 0;
    const n = intervals.length;
    while (i < n && intervals[i][1] < newInterval[0]) {
        result.push(intervals[i]);
        i++;
    }
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.push(newInterval);
    while (i < n) {
        result.push(intervals[i]);
        i++;
    }
    return result;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Three phases: before, overlap, after', 'Merge by expanding newInterval boundaries', 'Input is already sorted', 'Single pass through intervals'],
      },
      {
        name: 'Binary Search + Merge (Optimal)',
        description: 'Use binary search to find insertion point, then merge overlapping intervals.',
        code: {
          python: `import bisect

def insert(intervals, newInterval):
    if not intervals:
        return [newInterval]
    starts = [iv[0] for iv in intervals]
    ends = [iv[1] for iv in intervals]
    left = bisect.bisect_left(ends, newInterval[0])
    right = bisect.bisect_right(starts, newInterval[1])
    if left < right:
        newInterval = [
            min(newInterval[0], intervals[left][0]),
            max(newInterval[1], intervals[right - 1][1])
        ]
    return intervals[:left] + [newInterval] + intervals[right:]`,
          javascript: `function insert(intervals, newInterval) {
    if (!intervals.length) return [newInterval];
    let left = 0, right = 0;
    while (left < intervals.length && intervals[left][1] < newInterval[0]) left++;
    right = left;
    while (right < intervals.length && intervals[right][0] <= newInterval[1]) right++;
    const merged = [...intervals.slice(0, left)];
    if (left < right) {
        newInterval = [
            Math.min(newInterval[0], intervals[left][0]),
            Math.max(newInterval[1], intervals[right - 1][1])
        ];
    }
    merged.push(newInterval);
    merged.push(...intervals.slice(right));
    return merged;
}`,
        },
        complexity: { time: 'O(n)', space: 'O(n)' },
        keyPoints: ['Binary search finds overlap boundaries faster', 'Merge overlapping range into single interval', 'Concatenate: before + merged + after', 'Still O(n) due to array construction'],
      },
    ],
  },
  '62': {
    approaches: [
      {
        name: 'Brute Force (Sort + Greedy)',
        description: 'Sort by start time. Greedily remove intervals that overlap with the previous one.',
        code: {
          python: `def eraseOverlapIntervals(intervals):
    intervals.sort()
    count = 0
    prev_end = intervals[0][1]
    for i in range(1, len(intervals)):
        if intervals[i][0] < prev_end:
            count += 1
            prev_end = min(prev_end, intervals[i][1])
        else:
            prev_end = intervals[i][1]
    return count`,
          javascript: `function eraseOverlapIntervals(intervals) {
    intervals.sort((a, b) => a[0] - b[0]);
    let count = 0;
    let prevEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] < prevEnd) {
            count++;
            prevEnd = Math.min(prevEnd, intervals[i][1]);
        } else {
            prevEnd = intervals[i][1];
        }
    }
    return count;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(1)' },
        keyPoints: ['Sort by start time', 'On overlap, remove the interval with larger end', 'Keeping the shorter interval maximizes remaining space', 'Greedy choice: minimize end time'],
      },
      {
        name: 'Sort by End Time (Optimal)',
        description: 'Sort by end time. Count non-overlapping intervals. Removals = total - non-overlapping count.',
        code: {
          python: `def eraseOverlapIntervals(intervals):
    intervals.sort(key=lambda x: x[1])
    count = 1  # non-overlapping count
    prev_end = intervals[0][1]
    for i in range(1, len(intervals)):
        if intervals[i][0] >= prev_end:
            count += 1
            prev_end = intervals[i][1]
    return len(intervals) - count`,
          javascript: `function eraseOverlapIntervals(intervals) {
    intervals.sort((a, b) => a[1] - b[1]);
    let count = 1;
    let prevEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] >= prevEnd) {
            count++;
            prevEnd = intervals[i][1];
        }
    }
    return intervals.length - count;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(1)' },
        keyPoints: ['Sort by end time for classic interval scheduling', 'Count maximum non-overlapping intervals', 'Removals = total - max non-overlapping', 'Greedy: earliest end time first'],
      },
    ],
  },
  '63': {
    approaches: [
      {
        name: 'Brute Force (Check All Pairs)',
        description: 'Compare every pair of meetings to see if any overlap.',
        code: {
          python: `def canAttendMeetings(intervals):
    for i in range(len(intervals)):
        for j in range(i + 1, len(intervals)):
            if intervals[i][0] < intervals[j][1] and intervals[j][0] < intervals[i][1]:
                return False
    return True`,
          javascript: `function canAttendMeetings(intervals) {
    for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
            if (intervals[i][0] < intervals[j][1] && intervals[j][0] < intervals[i][1])
                return false;
        }
    }
    return true;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['Check every pair for overlap', 'Two intervals overlap if start1 < end2 and start2 < end1', 'Simple but quadratic'],
      },
      {
        name: 'Sort (Optimal)',
        description: 'Sort meetings by start time. If any meeting starts before the previous one ends, there is a conflict.',
        code: {
          python: `def canAttendMeetings(intervals):
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:
            return False
    return True`,
          javascript: `function canAttendMeetings(intervals) {
    intervals.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] < intervals[i - 1][1]) return false;
    }
    return true;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(1)' },
        keyPoints: ['Sort by start time', 'Only need to check adjacent meetings after sorting', 'If start[i] < end[i-1], overlap exists', 'Sorting is the key insight'],
      },
    ],
  },
  '64': {
    approaches: [
      {
        name: 'Sort + Check All Active',
        description: 'Sort by start time. Track all ongoing meetings. For each new meeting, count how many overlap.',
        code: {
          python: `def minMeetingRooms(intervals):
    if not intervals:
        return 0
    max_rooms = 0
    for i in range(len(intervals)):
        rooms = 0
        for j in range(len(intervals)):
            if intervals[j][0] < intervals[i][1] and intervals[i][0] < intervals[j][1]:
                rooms += 1
        max_rooms = max(max_rooms, rooms)
    return max_rooms`,
          javascript: `function minMeetingRooms(intervals) {
    if (!intervals.length) return 0;
    let maxRooms = 0;
    for (let i = 0; i < intervals.length; i++) {
        let rooms = 0;
        for (let j = 0; j < intervals.length; j++) {
            if (intervals[j][0] < intervals[i][1] && intervals[i][0] < intervals[j][1])
                rooms++;
        }
        maxRooms = Math.max(maxRooms, rooms);
    }
    return maxRooms;
}`,
        },
        complexity: { time: 'O(n\u00B2)', space: 'O(1)' },
        keyPoints: ['For each meeting, count overlapping meetings', 'Maximum overlap at any point = rooms needed', 'Simple but slow'],
      },
      {
        name: 'Sweep Line (Optimal)',
        description: 'Separate start and end times, sort them, and sweep through events. Track concurrent meetings.',
        code: {
          python: `def minMeetingRooms(intervals):
    starts = sorted(i[0] for i in intervals)
    ends = sorted(i[1] for i in intervals)
    rooms = max_rooms = 0
    s = e = 0
    while s < len(starts):
        if starts[s] < ends[e]:
            rooms += 1
            max_rooms = max(max_rooms, rooms)
            s += 1
        else:
            rooms -= 1
            e += 1
    return max_rooms`,
          javascript: `function minMeetingRooms(intervals) {
    const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
    const ends = intervals.map(i => i[1]).sort((a, b) => a - b);
    let rooms = 0, maxRooms = 0;
    let s = 0, e = 0;
    while (s < starts.length) {
        if (starts[s] < ends[e]) {
            rooms++;
            maxRooms = Math.max(maxRooms, rooms);
            s++;
        } else {
            rooms--;
            e++;
        }
    }
    return maxRooms;
}`,
        },
        complexity: { time: 'O(n log n)', space: 'O(n)' },
        keyPoints: ['Sweep line: process starts and ends as events', 'Start event: +1 room, End event: -1 room', 'Maximum concurrent meetings = answer', 'Two pointer approach on sorted start/end arrays'],
      },
    ],
  },
};

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

const DIFF_COLORS: Record<string, string> = { Easy: '#2D8CFF', Medium: '#d97706', Hard: '#0B5CFF' };

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
  const [aiSolution, setAiSolution] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState(0);

  const problem = id ? PROBLEMS[id] : null;
  const staticSolution = id ? SOLUTIONS[id] : undefined;

  useEffect(() => {
    document.title = 'Blind 75 Practice | Camora';
    return () => { document.title = 'Camora'; };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setCode(STARTER_CODE[language](problem?.title || 'Solution')); setOutput(''); }, [language, problem?.title]);

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

  /* AI solution generation with proper SSE parsing */
  const generateAiSolution = async () => {
    if (!token) { setAiSolution('Please sign in to generate AI solutions.'); return; }
    setIsSolving(true); setAiSolution(''); setActiveTab('solution');
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/solve/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ problem: problem?.title || `Problem #${id}`, language }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.chunk) fullContent += event.chunk;
            } catch {
              // If the data line is not JSON, treat as raw text chunk
              fullContent += line.slice(6);
            }
          }
        }
        setAiSolution(fullContent);
      }
      // Final update
      setAiSolution(fullContent);
    } catch (err: any) { setAiSolution(`Error: ${err.message}`); }
    finally { setIsSolving(false); }
  };

  if (!problem) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Problem not found</h2>
          <Link to="/handbook" style={{ color: '#2D8CFF', fontSize: 14, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>&#8592; Back to Blind 75</Link>
        </div>
      </div>
    );
  }

  /* Resolve language for code display: only python and javascript have static solutions */
  const solutionLang = (language === 'python' || language === 'javascript') ? language : 'python';

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Breadcrumb Bar */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/handbook" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Blind 75
          </Link>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{problem.title}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, color: DIFF_COLORS[problem.difficulty], background: `${DIFF_COLORS[problem.difficulty]}12` }}>
            {problem.difficulty}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{problem.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setActiveTab('practice')} style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
            background: activeTab === 'practice' ? '#2D8CFF' : 'var(--bg-elevated)', color: activeTab === 'practice' ? '#fff' : '#6b7280' }}>Practice</button>
          <button onClick={() => setActiveTab('solution')} style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
            background: activeTab === 'solution' ? '#2D8CFF' : 'var(--bg-elevated)', color: activeTab === 'solution' ? '#fff' : '#6b7280' }}>Solution</button>
          <a href={problem.leetcode} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 500, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(45,140,255,0.18)', background: 'var(--bg-surface)', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            LeetCode <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>

      {activeTab === 'practice' ? (
        /* PRACTICE MODE */
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Problem */}
          <div style={{ width: '40%', borderRight: '1px solid var(--border)', overflow: 'auto', padding: '28px 24px', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{problem.category}</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>{problem.title}</h1>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 24 }}>{problem.description}</div>

            {problem.examples.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Examples</div>
                {problem.examples.map((ex, i) => (
                  <pre key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(45,140,255,0.10)', borderRadius: 10, padding: 14, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)', marginBottom: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6, boxShadow: 'none' }}>{ex}</pre>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: '#eef2ff', border: '1px solid rgba(45,140,255,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2D8CFF', marginBottom: 6 }}>Approach Hints</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#375800', fontSize: 13, lineHeight: 1.8 }}>
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
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF)', color: '#fff', cursor: isRunning ? 'wait' : 'pointer' }}>
                  {isRunning ? 'Running...' : '\u25B6 Run Code'}
                </button>
                <Link to={`/handbook/${id}/solution`}
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: '1px solid var(--border)', background: '#2D8CFF', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  View Solution
                </Link>
              </div>
            </div>
            {/* Editor */}
            <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false}
              style={{ flex: 1, resize: 'none', border: '1px solid var(--border)', outline: 'none', padding: 16, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14, lineHeight: 1.6, background: '#1e1e1e', color: '#d4d4d4', tabSize: 2, minHeight: 300 }} />
            {/* Output */}
            <div style={{ borderTop: '1px solid #333', background: '#1a1a1a', padding: 12, minHeight: 80, maxHeight: 200, overflow: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>OUTPUT</div>
              <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: output.startsWith('Error') ? '#ef4444' : '#10b981', whiteSpace: 'pre-wrap' }}>
                {output || 'Click "Run Code" to execute'}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* SOLUTION MODE */
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-elevated)' }}>
          <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px' }}>
            {/* Problem header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{problem.category}</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 8px' }}>{problem.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>{problem.description}</p>
            </div>

            {staticSolution ? (
              /* STATIC SOLUTION DISPLAY */
              <>
                {/* Language selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Language:</span>
                  {(['python', 'javascript'] as const).map(lang => (
                    <button key={lang} onClick={() => setLanguage(lang)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
                        background: solutionLang === lang ? '#2D8CFF' : 'var(--bg-elevated)',
                        color: solutionLang === lang ? '#fff' : 'var(--text-secondary)',
                      }}>
                      {lang === 'python' ? 'Python' : 'JavaScript'}
                    </button>
                  ))}
                </div>

                {/* Approach tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {staticSolution.approaches.map((approach, idx) => (
                    <button key={idx} onClick={() => setSelectedApproach(idx)}
                      style={{
                        fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 9,
                        border: selectedApproach === idx ? '2px solid #2D8CFF' : '1px solid rgba(45,140,255,0.15)',
                        background: selectedApproach === idx ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                        color: selectedApproach === idx ? '#2D8CFF' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}>
                      {approach.name}
                    </button>
                  ))}
                </div>

                {/* Selected approach */}
                {staticSolution.approaches.map((approach, idx) => {
                  if (idx !== selectedApproach) return null;
                  const codeStr = approach.code[solutionLang] || approach.code['python'] || '';
                  return (
                    <div key={idx}>
                      {/* Description */}
                      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 16, boxShadow: 'none' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{approach.name}</h3>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{approach.description}</p>
                      </div>

                      {/* Code block */}
                      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: '1px solid #1e293b' }}>
                        <div style={{ background: '#1e293b', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                            {solutionLang === 'python' ? 'Python' : 'JavaScript'}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(codeStr); }}
                            style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 5, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', cursor: 'pointer' }}>
                            Copy
                          </button>
                        </div>
                        <pre style={{
                          margin: 0, padding: 20, background: '#0f172a', color: '#e2e8f0',
                          fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowX: 'auto',
                        }}>
                          {codeStr}
                        </pre>
                      </div>

                      {/* Complexity badges */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)', padding: '8px 14px', boxShadow: 'none' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>TIME</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#2D8CFF' }}>{approach.complexity.time}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)', padding: '8px 14px', boxShadow: 'none' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>SPACE</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#2D8CFF' }}>{approach.complexity.space}</span>
                        </div>
                      </div>

                      {/* Key points */}
                      <div style={{ background: '#eef2ff', borderRadius: 10, border: '1px solid rgba(45,140,255,0.15)', padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#2D8CFF', marginBottom: 8 }}>Key Points</div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: '#375800', fontSize: 13, lineHeight: 2 }}>
                          {approach.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              /* NO STATIC SOLUTION -- Fallback to AI generation */
              <>
                {!aiSolution && !isSolving ? (
                  <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'none' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>No pre-written solution available for this problem yet.</p>
                    <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>Generate an AI-powered solution with multiple approaches.</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                      <select value={language} onChange={e => setLanguage(e.target.value as Language)}
                        style={{ fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(45,140,255,0.18)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
                      </select>
                    </div>
                    <button onClick={generateAiSolution}
                      style={{ fontSize: 14, fontWeight: 600, padding: '10px 28px', borderRadius: 10, border: '1px solid var(--border)', background: '#2D8CFF', color: '#fff', cursor: 'pointer' }}>
                      Generate Solution
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'none' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(45,140,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                        AI Generated Solution {isSolving && <span style={{ color: '#2D8CFF' }}> (streaming...)</span>}
                      </span>
                      <select value={language} onChange={e => { setLanguage(e.target.value as Language); setAiSolution(''); }}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(45,140,255,0.18)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
                      </select>
                    </div>
                    <pre style={{
                      margin: 0, padding: 24, fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                    }}>
                      {aiSolution || 'Generating...'}
                    </pre>
                  </div>
                )}
              </>
            )}

            {/* Back to practice button */}
            <button onClick={() => setActiveTab('practice')} style={{ marginTop: 20, fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(45,140,255,0.18)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', boxShadow: 'none' }}>
              &#8592; Back to Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
