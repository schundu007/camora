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

const SOLUTIONS: Record<string, SolutionData> = {
  '1': {
    approaches: [
      {
        name: 'Brute Force',
        description: 'Check every pair of numbers to see if they add up to the target.',
        code: {
          python: `def twoSum(nums, target):
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
          python: `def twoSum(nums, target):
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
          python: `def containsDuplicate(nums):
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
          python: `def containsDuplicate(nums):
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
          python: `def isAnagram(s, t):
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
          python: `def isAnagram(s, t):
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
          python: `def productExceptSelf(nums):
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
          python: `def productExceptSelf(nums):
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
          python: `def threeSum(nums):
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
          python: `def threeSum(nums):
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
  const [aiSolution, setAiSolution] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState(0);

  const problem = id ? PROBLEMS[id] : null;
  const staticSolution = id ? SOLUTIONS[id] : undefined;

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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Problem not found</h2>
          <Link to="/blind75" style={{ color: '#10b981', fontSize: 14, fontWeight: 600, marginTop: 8, display: 'inline-block' }}>&#8592; Back to Blind 75</Link>
        </div>
      </div>
    );
  }

  /* Resolve language for code display: only python and javascript have static solutions */
  const solutionLang = (language === 'python' || language === 'javascript') ? language : 'python';

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
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
          <button onClick={() => setActiveTab('solution')} style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: activeTab === 'solution' ? '#818cf8' : '#f3f4f6', color: activeTab === 'solution' ? '#fff' : '#6b7280' }}>Solution</button>
          <a href={problem.leetcode} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 500, padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            LeetCode <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>

      {activeTab === 'practice' ? (
        /* PRACTICE MODE */
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
                  {isRunning ? 'Running...' : '\u25B6 Run Code'}
                </button>
                <button onClick={() => setActiveTab('solution')}
                  style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', background: '#818cf8', color: '#fff', cursor: 'pointer' }}>
                  View Solution
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
        /* SOLUTION MODE */
        <div style={{ flex: 1, overflow: 'auto', background: '#f9fafb' }}>
          <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px' }}>
            {/* Problem header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{problem.category}</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '4px 0 8px' }}>{problem.title}</h2>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>{problem.description}</p>
            </div>

            {staticSolution ? (
              /* STATIC SOLUTION DISPLAY */
              <>
                {/* Language selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Language:</span>
                  {(['python', 'javascript'] as const).map(lang => (
                    <button key={lang} onClick={() => setLanguage(lang)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: solutionLang === lang ? '#818cf8' : '#e5e7eb',
                        color: solutionLang === lang ? '#fff' : '#374151',
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
                        border: selectedApproach === idx ? '2px solid #818cf8' : '1px solid #e5e7eb',
                        background: selectedApproach === idx ? '#eef2ff' : '#fff',
                        color: selectedApproach === idx ? '#4f46e5' : '#374151',
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
                      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{approach.name}</h3>
                        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{approach.description}</p>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '8px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>TIME</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{approach.complexity.time}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '8px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>SPACE</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>{approach.complexity.space}</span>
                        </div>
                      </div>

                      {/* Key points */}
                      <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 8 }}>Key Points</div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: '#065f46', fontSize: 13, lineHeight: 2 }}>
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
                  <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                    <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 8 }}>No pre-written solution available for this problem yet.</p>
                    <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>Generate an AI-powered solution with multiple approaches.</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                      <select value={language} onChange={e => setLanguage(e.target.value as Language)}
                        style={{ fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151' }}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
                      </select>
                    </div>
                    <button onClick={generateAiSolution}
                      style={{ fontSize: 14, fontWeight: 600, padding: '10px 28px', borderRadius: 10, border: 'none', background: '#818cf8', color: '#fff', cursor: 'pointer' }}>
                      Generate Solution
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                        AI Generated Solution {isSolving && <span style={{ color: '#818cf8' }}> (streaming...)</span>}
                      </span>
                      <select value={language} onChange={e => { setLanguage(e.target.value as Language); setAiSolution(''); }}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151' }}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
                      </select>
                    </div>
                    <pre style={{
                      margin: 0, padding: 24, fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                    }}>
                      {aiSolution || 'Generating...'}
                    </pre>
                  </div>
                )}
              </>
            )}

            {/* Back to practice button */}
            <button onClick={() => setActiveTab('practice')} style={{ marginTop: 20, fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>
              &#8592; Back to Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
