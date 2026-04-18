/**
 * Problem Data - Comprehensive problem definitions with descriptions and multi-language solutions
 * Following LeetCode/TechPrep style with problem details and solutions
 */

// Difficulty colors
export const DIFFICULTY_COLORS = {
  Easy: { bg: 'bg-[var(--success)]/15', text: 'text-[var(--success)]', border: 'border-[var(--success)]/30' },
  Medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  Hard: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

// Generate slug from problem name
export function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// All problems with full details
export const PROBLEMS = {
  'two-sum': {
    id: 1,
    name: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Hash Map'],
    leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Hash map to store value -> index
        seen = {}

        for i, num in enumerate(nums):
            complement = target - num

            # Check if complement exists in hash map
            if complement in seen:
                return [seen[complement], i]

            # Store current number with its index
            seen[num] = i

        return []  # No solution found`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      javascript: {
        code: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Hash map to store value -> index
    const seen = new Map();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];

        // Check if complement exists in hash map
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }

        // Store current number with its index
        seen.set(nums[i], i);
    }

    return []; // No solution found
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      java: {
        code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Hash map to store value -> index
        Map<Integer, Integer> seen = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];

            // Check if complement exists in hash map
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }

            // Store current number with its index
            seen.put(nums[i], i);
        }

        return new int[] {}; // No solution found
    }
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      cpp: {
        code: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Hash map to store value -> index
        unordered_map<int, int> seen;

        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];

            // Check if complement exists in hash map
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }

            // Store current number with its index
            seen[nums[i]] = i;
        }

        return {}; // No solution found
    }
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      go: {
        code: `func twoSum(nums []int, target int) []int {
    // Hash map to store value -> index
    seen := make(map[int]int)

    for i, num := range nums {
        complement := target - num

        // Check if complement exists in hash map
        if j, ok := seen[complement]; ok {
            return []int{j, i}
        }

        // Store current number with its index
        seen[num] = i
    }

    return []int{} // No solution found
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
    },
    hints: [
      'A really brute force way would be to search for all possible pairs of numbers but that would be too slow.',
      'Try to use the fact that the complement of the current number to make up the target can be looked up in O(1) time.',
      'Use a hash map to store numbers you\'ve seen with their indices.',
    ],
    approach: `**Optimal Approach: Hash Map**

1. Create a hash map to store each number and its index as we iterate
2. For each number, calculate the complement (target - current number)
3. Check if the complement exists in the hash map
4. If found, return both indices; otherwise, store the current number

**Why this works:**
- We need O(1) lookup to find if a complement exists
- Hash map provides exactly that capability
- Single pass through the array is sufficient`,
  },

  'contains-duplicate': {
    id: 217,
    name: 'Contains Duplicate',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Hash Set'],
    leetcodeUrl: 'https://leetcode.com/problems/contains-duplicate/',
    description: `Given an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.`,
    examples: [
      {
        input: 'nums = [1,2,3,1]',
        output: 'true',
        explanation: 'The element 1 appears twice.',
      },
      {
        input: 'nums = [1,2,3,4]',
        output: 'false',
        explanation: 'All elements are distinct.',
      },
      {
        input: 'nums = [1,1,1,3,3,4,3,2,4,2]',
        output: 'true',
        explanation: 'Multiple elements appear more than once.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^9 <= nums[i] <= 10^9',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        # Use a set to track seen numbers
        seen = set()

        for num in nums:
            if num in seen:
                return True
            seen.add(num)

        return False`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      javascript: {
        code: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
var containsDuplicate = function(nums) {
    // Use a Set to track seen numbers
    const seen = new Set();

    for (const num of nums) {
        if (seen.has(num)) {
            return true;
        }
        seen.add(num);
    }

    return false;
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      java: {
        code: `class Solution {
    public boolean containsDuplicate(int[] nums) {
        // Use a HashSet to track seen numbers
        Set<Integer> seen = new HashSet<>();

        for (int num : nums) {
            if (seen.contains(num)) {
                return true;
            }
            seen.add(num);
        }

        return false;
    }
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      cpp: {
        code: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Use an unordered_set to track seen numbers
        unordered_set<int> seen;

        for (int num : nums) {
            if (seen.count(num)) {
                return true;
            }
            seen.insert(num);
        }

        return false;
    }
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      go: {
        code: `func containsDuplicate(nums []int) bool {
    // Use a map as a set to track seen numbers
    seen := make(map[int]bool)

    for _, num := range nums {
        if seen[num] {
            return true
        }
        seen[num] = true
    }

    return false
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
    },
    hints: [
      'Think about what data structure allows O(1) lookup for existence checks.',
      'A Set automatically handles duplicates.',
    ],
    approach: `**Optimal Approach: Hash Set**

1. Create a hash set to track numbers we've seen
2. Iterate through the array
3. For each number, check if it's already in the set
4. If found, return true; otherwise, add to set
5. If we complete the loop, return false`,
  },

  'valid-anagram': {
    id: 242,
    name: 'Valid Anagram',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Hash Map', 'String', 'Sorting'],
    leetcodeUrl: 'https://leetcode.com/problems/valid-anagram/',
    description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      {
        input: 's = "anagram", t = "nagaram"',
        output: 'true',
        explanation: 'Both strings contain the same characters with same frequencies.',
      },
      {
        input: 's = "rat", t = "car"',
        output: 'false',
        explanation: 'The strings have different characters.',
      },
    ],
    constraints: [
      '1 <= s.length, t.length <= 5 * 10^4',
      's and t consist of lowercase English letters.',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        # Quick length check
        if len(s) != len(t):
            return False

        # Count character frequencies
        count = {}

        for c in s:
            count[c] = count.get(c, 0) + 1

        for c in t:
            if c not in count:
                return False
            count[c] -= 1
            if count[c] < 0:
                return False

        return True`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1) - only 26 lowercase letters',
      },
      javascript: {
        code: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
var isAnagram = function(s, t) {
    // Quick length check
    if (s.length !== t.length) {
        return false;
    }

    // Count character frequencies
    const count = {};

    for (const c of s) {
        count[c] = (count[c] || 0) + 1;
    }

    for (const c of t) {
        if (!count[c]) {
            return false;
        }
        count[c]--;
    }

    return true;
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      java: {
        code: `class Solution {
    public boolean isAnagram(String s, String t) {
        // Quick length check
        if (s.length() != t.length()) {
            return false;
        }

        // Count character frequencies using array
        int[] count = new int[26];

        for (char c : s.toCharArray()) {
            count[c - 'a']++;
        }

        for (char c : t.toCharArray()) {
            count[c - 'a']--;
            if (count[c - 'a'] < 0) {
                return false;
            }
        }

        return true;
    }
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      cpp: {
        code: `class Solution {
public:
    bool isAnagram(string s, string t) {
        // Quick length check
        if (s.length() != t.length()) {
            return false;
        }

        // Count character frequencies using array
        int count[26] = {0};

        for (char c : s) {
            count[c - 'a']++;
        }

        for (char c : t) {
            count[c - 'a']--;
            if (count[c - 'a'] < 0) {
                return false;
            }
        }

        return true;
    }
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      go: {
        code: `func isAnagram(s string, t string) bool {
    // Quick length check
    if len(s) != len(t) {
        return false
    }

    // Count character frequencies
    count := make(map[rune]int)

    for _, c := range s {
        count[c]++
    }

    for _, c := range t {
        count[c]--
        if count[c] < 0 {
            return false
        }
    }

    return true
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
    },
    hints: [
      'What if the strings have different lengths?',
      'Count the frequency of each character in both strings.',
    ],
    approach: `**Optimal Approach: Character Counting**

1. If lengths differ, return false immediately
2. Count frequency of each character in first string
3. Decrement counts while iterating second string
4. If any count goes negative or character not found, return false`,
  },

  'group-anagrams': {
    id: 49,
    name: 'Group Anagrams',
    difficulty: 'Medium',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Hash Map', 'String', 'Sorting'],
    leetcodeUrl: 'https://leetcode.com/problems/group-anagrams/',
    description: `Given an array of strings \`strs\`, group the **anagrams** together. You can return the answer in **any order**.

An **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        explanation: 'Words with same letters are grouped together.',
      },
      {
        input: 'strs = [""]',
        output: '[[""]]',
        explanation: 'Empty string forms its own group.',
      },
      {
        input: 'strs = ["a"]',
        output: '[["a"]]',
        explanation: 'Single character forms its own group.',
      },
    ],
    constraints: [
      '1 <= strs.length <= 10^4',
      '0 <= strs[i].length <= 100',
      'strs[i] consists of lowercase English letters.',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        # Map sorted string -> list of anagrams
        anagram_map = defaultdict(list)

        for s in strs:
            # Sort characters to create key
            key = ''.join(sorted(s))
            anagram_map[key].append(s)

        return list(anagram_map.values())`,
        timeComplexity: 'O(n * k log k) where k is max string length',
        spaceComplexity: 'O(n * k)',
      },
      javascript: {
        code: `/**
 * @param {string[]} strs
 * @return {string[][]}
 */
var groupAnagrams = function(strs) {
    // Map sorted string -> list of anagrams
    const anagramMap = new Map();

    for (const s of strs) {
        // Sort characters to create key
        const key = s.split('').sort().join('');

        if (!anagramMap.has(key)) {
            anagramMap.set(key, []);
        }
        anagramMap.get(key).push(s);
    }

    return Array.from(anagramMap.values());
};`,
        timeComplexity: 'O(n * k log k)',
        spaceComplexity: 'O(n * k)',
      },
      java: {
        code: `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        // Map sorted string -> list of anagrams
        Map<String, List<String>> anagramMap = new HashMap<>();

        for (String s : strs) {
            // Sort characters to create key
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);

            anagramMap.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }

        return new ArrayList<>(anagramMap.values());
    }
}`,
        timeComplexity: 'O(n * k log k)',
        spaceComplexity: 'O(n * k)',
      },
      cpp: {
        code: `class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        // Map sorted string -> list of anagrams
        unordered_map<string, vector<string>> anagramMap;

        for (const string& s : strs) {
            // Sort characters to create key
            string key = s;
            sort(key.begin(), key.end());
            anagramMap[key].push_back(s);
        }

        vector<vector<string>> result;
        for (auto& [key, group] : anagramMap) {
            result.push_back(group);
        }

        return result;
    }
};`,
        timeComplexity: 'O(n * k log k)',
        spaceComplexity: 'O(n * k)',
      },
      go: {
        code: `func groupAnagrams(strs []string) [][]string {
    // Map sorted string -> list of anagrams
    anagramMap := make(map[string][]string)

    for _, s := range strs {
        // Sort characters to create key
        chars := []byte(s)
        sort.Slice(chars, func(i, j int) bool {
            return chars[i] < chars[j]
        })
        key := string(chars)

        anagramMap[key] = append(anagramMap[key], s)
    }

    result := make([][]string, 0, len(anagramMap))
    for _, group := range anagramMap {
        result = append(result, group)
    }

    return result
}`,
        timeComplexity: 'O(n * k log k)',
        spaceComplexity: 'O(n * k)',
      },
    },
    hints: [
      'Anagrams have the same characters, just in different order.',
      'Sorting the characters of an anagram gives the same result.',
      'Use sorted string as a key to group anagrams together.',
    ],
    approach: `**Optimal Approach: Sorted String as Key**

1. Create a hash map where key is the sorted version of string
2. For each string, sort its characters to get the key
3. Add the original string to the list for that key
4. Return all the lists from the hash map`,
  },

  'binary-search': {
    id: 704,
    name: 'Binary Search',
    difficulty: 'Easy',
    category: 'Binary Search',
    tags: ['Array', 'Binary Search'],
    leetcodeUrl: 'https://leetcode.com/problems/binary-search/',
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      {
        input: 'nums = [-1,0,3,5,9,12], target = 9',
        output: '4',
        explanation: '9 exists in nums and its index is 4.',
      },
      {
        input: 'nums = [-1,0,3,5,9,12], target = 2',
        output: '-1',
        explanation: '2 does not exist in nums so return -1.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All the integers in nums are unique.',
      'nums is sorted in ascending order.',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1

        while left <= right:
            mid = left + (right - left) // 2

            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1

        return -1`,
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
      },
      javascript: {
        code: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
var search = function(nums, target) {
    let left = 0;
    let right = nums.length - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);

        if (nums[mid] === target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
};`,
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
      },
      java: {
        code: `class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return -1;
    }
}`,
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
      },
      cpp: {
        code: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0;
        int right = nums.size() - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return -1;
    }
};`,
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
      },
      go: {
        code: `func search(nums []int, target int) int {
    left, right := 0, len(nums)-1

    for left <= right {
        mid := left + (right-left)/2

        if nums[mid] == target {
            return mid
        } else if nums[mid] < target {
            left = mid + 1
        } else {
            right = mid - 1
        }
    }

    return -1
}`,
        timeComplexity: 'O(log n)',
        spaceComplexity: 'O(1)',
      },
    },
    hints: [
      'The array is sorted, so you can eliminate half of the search space each iteration.',
      'Use left + (right - left) / 2 to avoid integer overflow.',
    ],
    approach: `**Standard Binary Search**

1. Initialize left and right pointers to the start and end of array
2. While left <= right:
   - Calculate mid point
   - If mid element equals target, return mid
   - If mid element < target, search right half
   - Otherwise, search left half
3. Return -1 if not found`,
  },

  'reverse-linked-list': {
    id: 206,
    name: 'Reverse Linked List',
    difficulty: 'Easy',
    category: 'Linked List',
    tags: ['Linked List', 'Recursion'],
    leetcodeUrl: 'https://leetcode.com/problems/reverse-linked-list/',
    description: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[5,4,3,2,1]',
        explanation: 'The list is reversed.',
      },
      {
        input: 'head = [1,2]',
        output: '[2,1]',
        explanation: 'The list is reversed.',
      },
      {
        input: 'head = []',
        output: '[]',
        explanation: 'Empty list stays empty.',
      },
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000].',
      '-5000 <= Node.val <= 5000',
    ],
    solutions: {
      python: {
        code: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev = None
        curr = head

        while curr:
            # Save next node
            next_node = curr.next
            # Reverse the link
            curr.next = prev
            # Move pointers forward
            prev = curr
            curr = next_node

        return prev`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      javascript: {
        code: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var reverseList = function(head) {
    let prev = null;
    let curr = head;

    while (curr !== null) {
        // Save next node
        const nextNode = curr.next;
        // Reverse the link
        curr.next = prev;
        // Move pointers forward
        prev = curr;
        curr = nextNode;
    }

    return prev;
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      java: {
        code: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;

        while (curr != null) {
            // Save next node
            ListNode nextNode = curr.next;
            // Reverse the link
            curr.next = prev;
            // Move pointers forward
            prev = curr;
            curr = nextNode;
        }

        return prev;
    }
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      cpp: {
        code: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;

        while (curr != nullptr) {
            // Save next node
            ListNode* nextNode = curr->next;
            // Reverse the link
            curr->next = prev;
            // Move pointers forward
            prev = curr;
            curr = nextNode;
        }

        return prev;
    }
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      go: {
        code: `/**
 * Definition for singly-linked list.
 * type ListNode struct {
 *     Val int
 *     Next *ListNode
 * }
 */
func reverseList(head *ListNode) *ListNode {
    var prev *ListNode = nil
    curr := head

    for curr != nil {
        // Save next node
        nextNode := curr.Next
        // Reverse the link
        curr.Next = prev
        // Move pointers forward
        prev = curr
        curr = nextNode
    }

    return prev
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
    },
    hints: [
      'You need to change the next pointer of each node to point to its previous node.',
      'Keep track of three pointers: prev, curr, and next.',
    ],
    approach: `**Iterative Approach**

1. Initialize prev as null and curr as head
2. While curr is not null:
   - Save curr.next before modifying it
   - Reverse the link: curr.next = prev
   - Move prev and curr forward
3. Return prev (new head)`,
  },

  'maximum-subarray': {
    id: 53,
    name: 'Maximum Subarray',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'],
    leetcodeUrl: 'https://leetcode.com/problems/maximum-subarray/',
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.',
      },
      {
        input: 'nums = [1]',
        output: '1',
        explanation: 'The subarray [1] has the largest sum 1.',
      },
      {
        input: 'nums = [5,4,-1,7,8]',
        output: '23',
        explanation: 'The subarray [5,4,-1,7,8] has the largest sum 23.',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        # Kadane's Algorithm
        max_sum = nums[0]
        current_sum = nums[0]

        for i in range(1, len(nums)):
            # Either extend current subarray or start new one
            current_sum = max(nums[i], current_sum + nums[i])
            max_sum = max(max_sum, current_sum)

        return max_sum`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      javascript: {
        code: `/**
 * @param {number[]} nums
 * @return {number}
 */
var maxSubArray = function(nums) {
    // Kadane's Algorithm
    let maxSum = nums[0];
    let currentSum = nums[0];

    for (let i = 1; i < nums.length; i++) {
        // Either extend current subarray or start new one
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }

    return maxSum;
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      java: {
        code: `class Solution {
    public int maxSubArray(int[] nums) {
        // Kadane's Algorithm
        int maxSum = nums[0];
        int currentSum = nums[0];

        for (int i = 1; i < nums.length; i++) {
            // Either extend current subarray or start new one
            currentSum = Math.max(nums[i], currentSum + nums[i]);
            maxSum = Math.max(maxSum, currentSum);
        }

        return maxSum;
    }
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      cpp: {
        code: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Kadane's Algorithm
        int maxSum = nums[0];
        int currentSum = nums[0];

        for (int i = 1; i < nums.size(); i++) {
            // Either extend current subarray or start new one
            currentSum = max(nums[i], currentSum + nums[i]);
            maxSum = max(maxSum, currentSum);
        }

        return maxSum;
    }
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      go: {
        code: `func maxSubArray(nums []int) int {
    // Kadane's Algorithm
    maxSum := nums[0]
    currentSum := nums[0]

    for i := 1; i < len(nums); i++ {
        // Either extend current subarray or start new one
        if nums[i] > currentSum+nums[i] {
            currentSum = nums[i]
        } else {
            currentSum = currentSum + nums[i]
        }

        if currentSum > maxSum {
            maxSum = currentSum
        }
    }

    return maxSum
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
    },
    hints: [
      'Think about when to start a new subarray vs extending the current one.',
      'If the current sum becomes negative, starting fresh might be better.',
      'This is a classic problem solved by Kadane\'s algorithm.',
    ],
    approach: `**Kadane's Algorithm**

1. Initialize maxSum and currentSum to first element
2. For each element starting from index 1:
   - Decide: extend current subarray OR start new one
   - currentSum = max(nums[i], currentSum + nums[i])
   - Update maxSum if currentSum is larger
3. Return maxSum

**Key Insight:** If adding current element makes sum smaller than element alone, start fresh.`,
  },

  'valid-parentheses': {
    id: 20,
    name: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'Stack',
    tags: ['String', 'Stack'],
    leetcodeUrl: 'https://leetcode.com/problems/valid-parentheses/',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true',
        explanation: 'Simple valid pair.',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
        explanation: 'Multiple valid pairs.',
      },
      {
        input: 's = "(]"',
        output: 'false',
        explanation: 'Mismatched brackets.',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.',
    ],
    solutions: {
      python: {
        code: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}

        for char in s:
            if char in mapping:
                # Closing bracket
                if not stack or stack[-1] != mapping[char]:
                    return False
                stack.pop()
            else:
                # Opening bracket
                stack.append(char)

        return len(stack) == 0`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      javascript: {
        code: `/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function(s) {
    const stack = [];
    const mapping = { ')': '(', '}': '{', ']': '[' };

    for (const char of s) {
        if (mapping[char]) {
            // Closing bracket
            if (stack.length === 0 || stack[stack.length - 1] !== mapping[char]) {
                return false;
            }
            stack.pop();
        } else {
            // Opening bracket
            stack.push(char);
        }
    }

    return stack.length === 0;
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      java: {
        code: `class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        Map<Character, Character> mapping = new HashMap<>();
        mapping.put(')', '(');
        mapping.put('}', '{');
        mapping.put(']', '[');

        for (char c : s.toCharArray()) {
            if (mapping.containsKey(c)) {
                // Closing bracket
                if (stack.isEmpty() || stack.peek() != mapping.get(c)) {
                    return false;
                }
                stack.pop();
            } else {
                // Opening bracket
                stack.push(c);
            }
        }

        return stack.isEmpty();
    }
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      cpp: {
        code: `class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        unordered_map<char, char> mapping = {
            {')', '('}, {'}', '{'}, {']', '['}
        };

        for (char c : s) {
            if (mapping.count(c)) {
                // Closing bracket
                if (st.empty() || st.top() != mapping[c]) {
                    return false;
                }
                st.pop();
            } else {
                // Opening bracket
                st.push(c);
            }
        }

        return st.empty();
    }
};`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
      go: {
        code: `func isValid(s string) bool {
    stack := []rune{}
    mapping := map[rune]rune{
        ')': '(',
        '}': '{',
        ']': '[',
    }

    for _, char := range s {
        if open, exists := mapping[char]; exists {
            // Closing bracket
            if len(stack) == 0 || stack[len(stack)-1] != open {
                return false
            }
            stack = stack[:len(stack)-1]
        } else {
            // Opening bracket
            stack = append(stack, char)
        }
    }

    return len(stack) == 0
}`,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      },
    },
    hints: [
      'Use a stack to keep track of opening brackets.',
      'When you see a closing bracket, check if it matches the most recent opening bracket.',
    ],
    approach: `**Stack Approach**

1. Create mapping of closing to opening brackets
2. For each character:
   - If closing bracket: check if stack top matches
   - If opening bracket: push to stack
3. Return true if stack is empty at the end`,
  },

  'merge-two-sorted-lists': {
    id: 21,
    name: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    category: 'Linked List',
    tags: ['Linked List', 'Recursion'],
    leetcodeUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/',
    description: `You are given the heads of two sorted linked lists \`list1\` and \`list2\`.

Merge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.`,
    examples: [
      {
        input: 'list1 = [1,2,4], list2 = [1,3,4]',
        output: '[1,1,2,3,4,4]',
        explanation: 'Merged in sorted order.',
      },
      {
        input: 'list1 = [], list2 = []',
        output: '[]',
        explanation: 'Both lists are empty.',
      },
      {
        input: 'list1 = [], list2 = [0]',
        output: '[0]',
        explanation: 'One list is empty.',
      },
    ],
    constraints: [
      'The number of nodes in both lists is in the range [0, 50].',
      '-100 <= Node.val <= 100',
      'Both list1 and list2 are sorted in non-decreasing order.',
    ],
    solutions: {
      python: {
        code: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        # Dummy node to simplify edge cases
        dummy = ListNode(0)
        current = dummy

        while list1 and list2:
            if list1.val <= list2.val:
                current.next = list1
                list1 = list1.next
            else:
                current.next = list2
                list2 = list2.next
            current = current.next

        # Attach remaining nodes
        current.next = list1 if list1 else list2

        return dummy.next`,
        timeComplexity: 'O(n + m)',
        spaceComplexity: 'O(1)',
      },
      javascript: {
        code: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} list1
 * @param {ListNode} list2
 * @return {ListNode}
 */
var mergeTwoLists = function(list1, list2) {
    // Dummy node to simplify edge cases
    const dummy = new ListNode(0);
    let current = dummy;

    while (list1 !== null && list2 !== null) {
        if (list1.val <= list2.val) {
            current.next = list1;
            list1 = list1.next;
        } else {
            current.next = list2;
            list2 = list2.next;
        }
        current = current.next;
    }

    // Attach remaining nodes
    current.next = list1 !== null ? list1 : list2;

    return dummy.next;
};`,
        timeComplexity: 'O(n + m)',
        spaceComplexity: 'O(1)',
      },
      java: {
        code: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // Dummy node to simplify edge cases
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;

        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                current.next = list1;
                list1 = list1.next;
            } else {
                current.next = list2;
                list2 = list2.next;
            }
            current = current.next;
        }

        // Attach remaining nodes
        current.next = list1 != null ? list1 : list2;

        return dummy.next;
    }
}`,
        timeComplexity: 'O(n + m)',
        spaceComplexity: 'O(1)',
      },
      cpp: {
        code: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        // Dummy node to simplify edge cases
        ListNode dummy(0);
        ListNode* current = &dummy;

        while (list1 != nullptr && list2 != nullptr) {
            if (list1->val <= list2->val) {
                current->next = list1;
                list1 = list1->next;
            } else {
                current->next = list2;
                list2 = list2->next;
            }
            current = current->next;
        }

        // Attach remaining nodes
        current->next = list1 != nullptr ? list1 : list2;

        return dummy.next;
    }
};`,
        timeComplexity: 'O(n + m)',
        spaceComplexity: 'O(1)',
      },
      go: {
        code: `/**
 * Definition for singly-linked list.
 * type ListNode struct {
 *     Val int
 *     Next *ListNode
 * }
 */
func mergeTwoLists(list1 *ListNode, list2 *ListNode) *ListNode {
    // Dummy node to simplify edge cases
    dummy := &ListNode{}
    current := dummy

    for list1 != nil && list2 != nil {
        if list1.Val <= list2.Val {
            current.Next = list1
            list1 = list1.Next
        } else {
            current.Next = list2
            list2 = list2.Next
        }
        current = current.Next
    }

    // Attach remaining nodes
    if list1 != nil {
        current.Next = list1
    } else {
        current.Next = list2
    }

    return dummy.Next
}`,
        timeComplexity: 'O(n + m)',
        spaceComplexity: 'O(1)',
      },
    },
    hints: [
      'Use a dummy head to simplify handling edge cases.',
      'Compare values and link the smaller one to the result.',
    ],
    approach: `**Two Pointer Merge**

1. Create a dummy node to simplify edge cases
2. While both lists have nodes:
   - Compare current values
   - Link smaller node to result
   - Advance that list pointer
3. Attach any remaining nodes
4. Return dummy.next`,
  },

  // Arrays - Additional Problems
  'move-zeroes': {
    id: 283,
    name: 'Move Zeroes',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Two Pointers'],
    leetcodeUrl: 'https://leetcode.com/problems/move-zeroes/',
    description: `Given an integer array \`nums\`, move all \`0\`'s to the end of it while maintaining the relative order of the non-zero elements.

**Note** that you must do this in-place without making a copy of the array.`,
    examples: [
      { input: 'nums = [0,1,0,3,12]', output: '[1,3,12,0,0]', explanation: 'Move all zeros to the end while keeping relative order of non-zeros.' },
      { input: 'nums = [0]', output: '[0]', explanation: 'Single zero stays in place.' },
    ],
    constraints: ['1 <= nums.length <= 10^4', '-2^31 <= nums[i] <= 2^31 - 1'],
    solutions: {
      python: { code: `class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        # Two pointer approach
        slow = 0  # Position for next non-zero

        for fast in range(len(nums)):
            if nums[fast] != 0:
                nums[slow], nums[fast] = nums[fast], nums[slow]
                slow += 1`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var moveZeroes = function(nums) {
    let slow = 0;

    for (let fast = 0; fast < nums.length; fast++) {
        if (nums[fast] !== 0) {
            [nums[slow], nums[fast]] = [nums[fast], nums[slow]];
            slow++;
        }
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public void moveZeroes(int[] nums) {
        int slow = 0;
        for (int fast = 0; fast < nums.length; fast++) {
            if (nums[fast] != 0) {
                int temp = nums[slow];
                nums[slow] = nums[fast];
                nums[fast] = temp;
                slow++;
            }
        }
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int slow = 0;
        for (int fast = 0; fast < nums.size(); fast++) {
            if (nums[fast] != 0) {
                swap(nums[slow], nums[fast]);
                slow++;
            }
        }
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func moveZeroes(nums []int) {
    slow := 0
    for fast := 0; fast < len(nums); fast++ {
        if nums[fast] != 0 {
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow++
        }
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Use two pointers: one for the current position and one for the next non-zero position.'],
    approach: `Use slow/fast pointers. Swap non-zero elements to the slow pointer position.`,
  },

  'majority-element': {
    id: 169,
    name: 'Majority Element',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Hash Map', 'Divide and Conquer'],
    leetcodeUrl: 'https://leetcode.com/problems/majority-element/',
    description: `Given an array \`nums\` of size \`n\`, return the majority element.

The majority element is the element that appears more than \`⌊n / 2⌋\` times. You may assume that the majority element always exists in the array.`,
    examples: [
      { input: 'nums = [3,2,3]', output: '3', explanation: '3 appears twice (more than 3/2 = 1).' },
      { input: 'nums = [2,2,1,1,1,2,2]', output: '2', explanation: '2 appears 4 times (more than 7/2 = 3).' },
    ],
    constraints: ['n == nums.length', '1 <= n <= 5 * 10^4', '-10^9 <= nums[i] <= 10^9'],
    solutions: {
      python: { code: `class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        # Boyer-Moore Voting Algorithm
        candidate = None
        count = 0

        for num in nums:
            if count == 0:
                candidate = num
            count += 1 if num == candidate else -1

        return candidate`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var majorityElement = function(nums) {
    let candidate = null;
    let count = 0;

    for (const num of nums) {
        if (count === 0) candidate = num;
        count += num === candidate ? 1 : -1;
    }

    return candidate;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public int majorityElement(int[] nums) {
        int candidate = 0, count = 0;
        for (int num : nums) {
            if (count == 0) candidate = num;
            count += num == candidate ? 1 : -1;
        }
        return candidate;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    int majorityElement(vector<int>& nums) {
        int candidate = 0, count = 0;
        for (int num : nums) {
            if (count == 0) candidate = num;
            count += num == candidate ? 1 : -1;
        }
        return candidate;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func majorityElement(nums []int) int {
    candidate, count := 0, 0
    for _, num := range nums {
        if count == 0 { candidate = num }
        if num == candidate { count++ } else { count-- }
    }
    return candidate
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Boyer-Moore Voting Algorithm can solve this in O(1) space.'],
    approach: `Boyer-Moore: Track a candidate, increment count if matches, decrement otherwise. When count reaches 0, pick new candidate.`,
  },

  'best-time-to-buy-and-sell-stock': {
    id: 121,
    name: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Dynamic Programming'],
    leetcodeUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`ith\` day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.' },
      { input: 'prices = [7,6,4,3,1]', output: '0', explanation: 'No profit possible as prices only decrease.' },
    ],
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    solutions: {
      python: { code: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        min_price = float('inf')
        max_profit = 0

        for price in prices:
            min_price = min(min_price, price)
            max_profit = max(max_profit, price - min_price)

        return max_profit`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var maxProfit = function(prices) {
    let minPrice = Infinity;
    let maxProfit = 0;

    for (const price of prices) {
        minPrice = Math.min(minPrice, price);
        maxProfit = Math.max(maxProfit, price - minPrice);
    }

    return maxProfit;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE;
        int maxProfit = 0;
        for (int price : prices) {
            minPrice = Math.min(minPrice, price);
            maxProfit = Math.max(maxProfit, price - minPrice);
        }
        return maxProfit;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX, maxProfit = 0;
        for (int price : prices) {
            minPrice = min(minPrice, price);
            maxProfit = max(maxProfit, price - minPrice);
        }
        return maxProfit;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func maxProfit(prices []int) int {
    minPrice := math.MaxInt32
    maxProfit := 0
    for _, price := range prices {
        if price < minPrice { minPrice = price }
        if price - minPrice > maxProfit { maxProfit = price - minPrice }
    }
    return maxProfit
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Track the minimum price seen so far and the maximum profit.'],
    approach: `One pass: track minimum price seen so far, calculate profit at each step, keep maximum.`,
  },

  'remove-duplicates-from-sorted-array': {
    id: 26,
    name: 'Remove Duplicates from Sorted Array',
    difficulty: 'Easy',
    category: 'Two Pointers',
    tags: ['Array', 'Two Pointers'],
    leetcodeUrl: 'https://leetcode.com/problems/remove-duplicates-from-sorted-array/',
    description: `Given an integer array \`nums\` sorted in **non-decreasing order**, remove the duplicates **in-place** such that each unique element appears only **once**. The **relative order** of the elements should be kept the **same**.

Return \`k\` after placing the final result in the first \`k\` slots of \`nums\`.`,
    examples: [
      { input: 'nums = [1,1,2]', output: '2, nums = [1,2,_]', explanation: 'Return 2, first two elements are [1,2].' },
      { input: 'nums = [0,0,1,1,1,2,2,3,3,4]', output: '5, nums = [0,1,2,3,4,_,_,_,_,_]', explanation: 'Return 5.' },
    ],
    constraints: ['1 <= nums.length <= 3 * 10^4', '-100 <= nums[i] <= 100', 'nums is sorted in non-decreasing order.'],
    solutions: {
      python: { code: `class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        if not nums:
            return 0

        k = 1  # Position for next unique element

        for i in range(1, len(nums)):
            if nums[i] != nums[i - 1]:
                nums[k] = nums[i]
                k += 1

        return k`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var removeDuplicates = function(nums) {
    if (nums.length === 0) return 0;

    let k = 1;
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[i - 1]) {
            nums[k] = nums[i];
            k++;
        }
    }
    return k;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int k = 1;
        for (int i = 1; i < nums.length; i++) {
            if (nums[i] != nums[i - 1]) {
                nums[k++] = nums[i];
            }
        }
        return k;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    int removeDuplicates(vector<int>& nums) {
        if (nums.empty()) return 0;
        int k = 1;
        for (int i = 1; i < nums.size(); i++) {
            if (nums[i] != nums[i - 1]) {
                nums[k++] = nums[i];
            }
        }
        return k;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func removeDuplicates(nums []int) int {
    if len(nums) == 0 { return 0 }
    k := 1
    for i := 1; i < len(nums); i++ {
        if nums[i] != nums[i-1] {
            nums[k] = nums[i]
            k++
        }
    }
    return k
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Since array is sorted, duplicates are adjacent.'],
    approach: `Two pointers: slow pointer for unique elements, fast pointer scans array.`,
  },

  'longest-substring-without-repeating-characters': {
    id: 3,
    name: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    category: 'Sliding Window',
    tags: ['String', 'Hash Map', 'Sliding Window'],
    leetcodeUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with length 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with length 1.' },
      { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with length 3.' },
    ],
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
    solutions: {
      python: { code: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        char_index = {}
        max_len = 0
        left = 0

        for right, char in enumerate(s):
            if char in char_index and char_index[char] >= left:
                left = char_index[char] + 1
            char_index[char] = right
            max_len = max(max_len, right - left + 1)

        return max_len`, timeComplexity: 'O(n)', spaceComplexity: 'O(min(n, m))' },
      javascript: { code: `var lengthOfLongestSubstring = function(s) {
    const charIndex = new Map();
    let maxLen = 0;
    let left = 0;

    for (let right = 0; right < s.length; right++) {
        if (charIndex.has(s[right]) && charIndex.get(s[right]) >= left) {
            left = charIndex.get(s[right]) + 1;
        }
        charIndex.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }

    return maxLen;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(min(n, m))' },
      java: { code: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> charIndex = new HashMap<>();
        int maxLen = 0, left = 0;

        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (charIndex.containsKey(c) && charIndex.get(c) >= left) {
                left = charIndex.get(c) + 1;
            }
            charIndex.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(min(n, m))' },
      cpp: { code: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char, int> charIndex;
        int maxLen = 0, left = 0;

        for (int right = 0; right < s.size(); right++) {
            if (charIndex.count(s[right]) && charIndex[s[right]] >= left) {
                left = charIndex[s[right]] + 1;
            }
            charIndex[s[right]] = right;
            maxLen = max(maxLen, right - left + 1);
        }
        return maxLen;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(min(n, m))' },
      go: { code: `func lengthOfLongestSubstring(s string) int {
    charIndex := make(map[byte]int)
    maxLen, left := 0, 0

    for right := 0; right < len(s); right++ {
        if idx, ok := charIndex[s[right]]; ok && idx >= left {
            left = idx + 1
        }
        charIndex[s[right]] = right
        if right - left + 1 > maxLen {
            maxLen = right - left + 1
        }
    }
    return maxLen
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(min(n, m))' },
    },
    hints: ['Use sliding window with a hash map to track character positions.'],
    approach: `Sliding window: expand right, contract left when duplicate found.`,
  },

  'valid-palindrome': {
    id: 125,
    name: 'Valid Palindrome',
    difficulty: 'Easy',
    category: 'Two Pointers',
    tags: ['String', 'Two Pointers'],
    leetcodeUrl: 'https://leetcode.com/problems/valid-palindrome/',
    description: `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a **palindrome**, or \`false\` otherwise.`,
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: 'true', explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: 's = "race a car"', output: 'false', explanation: '"raceacar" is not a palindrome.' },
    ],
    constraints: ['1 <= s.length <= 2 * 10^5', 's consists only of printable ASCII characters.'],
    solutions: {
      python: { code: `class Solution:
    def isPalindrome(self, s: str) -> bool:
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

        return True`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var isPalindrome = function(s) {
    let left = 0, right = s.length - 1;

    while (left < right) {
        while (left < right && !isAlphaNum(s[left])) left++;
        while (left < right && !isAlphaNum(s[right])) right--;

        if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
        left++;
        right--;
    }
    return true;
};

function isAlphaNum(c) {
    return /[a-zA-Z0-9]/.test(c);
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;
            left++;
            right--;
        }
        return true;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    bool isPalindrome(string s) {
        int left = 0, right = s.size() - 1;
        while (left < right) {
            while (left < right && !isalnum(s[left])) left++;
            while (left < right && !isalnum(s[right])) right--;
            if (tolower(s[left]) != tolower(s[right])) return false;
            left++;
            right--;
        }
        return true;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func isPalindrome(s string) bool {
    left, right := 0, len(s)-1
    for left < right {
        for left < right && !isAlphaNum(s[left]) { left++ }
        for left < right && !isAlphaNum(s[right]) { right-- }
        if unicode.ToLower(rune(s[left])) != unicode.ToLower(rune(s[right])) { return false }
        left++
        right--
    }
    return true
}

func isAlphaNum(c byte) bool {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Use two pointers from both ends, skip non-alphanumeric characters.'],
    approach: `Two pointers converging from both ends, comparing alphanumeric characters.`,
  },

  'linked-list-cycle': {
    id: 141,
    name: 'Linked List Cycle',
    difficulty: 'Easy',
    category: 'Linked List',
    tags: ['Linked List', 'Two Pointers'],
    leetcodeUrl: 'https://leetcode.com/problems/linked-list-cycle/',
    description: `Given \`head\`, the head of a linked list, determine if the linked list has a cycle in it.

Return \`true\` if there is a cycle in the linked list. Otherwise, return \`false\`.`,
    examples: [
      { input: 'head = [3,2,0,-4], pos = 1', output: 'true', explanation: 'Tail connects to index 1.' },
      { input: 'head = [1,2], pos = 0', output: 'true', explanation: 'Tail connects to index 0.' },
      { input: 'head = [1], pos = -1', output: 'false', explanation: 'No cycle.' },
    ],
    constraints: ['Number of nodes in range [0, 10^4]', '-10^5 <= Node.val <= 10^5'],
    solutions: {
      python: { code: `class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow = fast = head

        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow == fast:
                return True

        return False`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var hasCycle = function(head) {
    let slow = head, fast = head;

    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }

    return false;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `public class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    bool hasCycle(ListNode *head) {
        ListNode *slow = head, *fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) return true;
        }
        return false;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast { return true }
    }
    return false
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Floyd\'s Tortoise and Hare algorithm.'],
    approach: `Fast and slow pointers. If they meet, there's a cycle.`,
  },

  'search-in-rotated-sorted-array': {
    id: 33,
    name: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    category: 'Binary Search',
    tags: ['Array', 'Binary Search'],
    leetcodeUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
    description: `Given the array \`nums\` after rotation and an integer \`target\`, return the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      { input: 'nums = [4,5,6,7,0,1,2], target = 0', output: '4', explanation: '0 is at index 4.' },
      { input: 'nums = [4,5,6,7,0,1,2], target = 3', output: '-1', explanation: '3 is not in the array.' },
    ],
    constraints: ['1 <= nums.length <= 5000', '-10^4 <= nums[i] <= 10^4', 'All values are unique.'],
    solutions: {
      python: { code: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        left, right = 0, len(nums) - 1

        while left <= right:
            mid = (left + right) // 2
            if nums[mid] == target:
                return mid

            # Left half is sorted
            if nums[left] <= nums[mid]:
                if nums[left] <= target < nums[mid]:
                    right = mid - 1
                else:
                    left = mid + 1
            # Right half is sorted
            else:
                if nums[mid] < target <= nums[right]:
                    left = mid + 1
                else:
                    right = mid - 1

        return -1`, timeComplexity: 'O(log n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var search = function(nums, target) {
    let left = 0, right = nums.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;

        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
};`, timeComplexity: 'O(log n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) right = mid - 1;
                else left = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[right]) left = mid + 1;
                else right = mid - 1;
            }
        }
        return -1;
    }
}`, timeComplexity: 'O(log n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left <= right) {
            int mid = (left + right) / 2;
            if (nums[mid] == target) return mid;
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) right = mid - 1;
                else left = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[right]) left = mid + 1;
                else right = mid - 1;
            }
        }
        return -1;
    }
};`, timeComplexity: 'O(log n)', spaceComplexity: 'O(1)' },
      go: { code: `func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left <= right {
        mid := (left + right) / 2
        if nums[mid] == target { return mid }
        if nums[left] <= nums[mid] {
            if nums[left] <= target && target < nums[mid] { right = mid - 1
            } else { left = mid + 1 }
        } else {
            if nums[mid] < target && target <= nums[right] { left = mid + 1
            } else { right = mid - 1 }
        }
    }
    return -1
}`, timeComplexity: 'O(log n)', spaceComplexity: 'O(1)' },
    },
    hints: ['One half of the array is always sorted.'],
    approach: `Modified binary search: determine which half is sorted, then decide which half to search.`,
  },

  'min-stack': {
    id: 155,
    name: 'Min Stack',
    difficulty: 'Medium',
    category: 'Stack',
    tags: ['Stack', 'Design'],
    leetcodeUrl: 'https://leetcode.com/problems/min-stack/',
    description: `Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.

Implement the \`MinStack\` class with \`push()\`, \`pop()\`, \`top()\`, and \`getMin()\` operations.`,
    examples: [
      { input: '["MinStack","push","push","push","getMin","pop","top","getMin"]\n[[],[-2],[0],[-3],[],[],[],[]]', output: '[null,null,null,null,-3,null,0,-2]', explanation: 'Operations performed on MinStack.' },
    ],
    constraints: ['-2^31 <= val <= 2^31 - 1', 'Methods pop, top and getMin will always be called on non-empty stacks.'],
    solutions: {
      python: { code: `class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val: int) -> None:
        self.stack.append(val)
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)

    def pop(self) -> None:
        if self.stack.pop() == self.min_stack[-1]:
            self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]`, timeComplexity: 'O(1)', spaceComplexity: 'O(n)' },
      javascript: { code: `var MinStack = function() {
    this.stack = [];
    this.minStack = [];
};

MinStack.prototype.push = function(val) {
    this.stack.push(val);
    if (this.minStack.length === 0 || val <= this.minStack[this.minStack.length - 1]) {
        this.minStack.push(val);
    }
};

MinStack.prototype.pop = function() {
    if (this.stack.pop() === this.minStack[this.minStack.length - 1]) {
        this.minStack.pop();
    }
};

MinStack.prototype.top = function() {
    return this.stack[this.stack.length - 1];
};

MinStack.prototype.getMin = function() {
    return this.minStack[this.minStack.length - 1];
};`, timeComplexity: 'O(1)', spaceComplexity: 'O(n)' },
      java: { code: `class MinStack {
    private Stack<Integer> stack = new Stack<>();
    private Stack<Integer> minStack = new Stack<>();

    public void push(int val) {
        stack.push(val);
        if (minStack.isEmpty() || val <= minStack.peek()) minStack.push(val);
    }

    public void pop() {
        if (stack.pop().equals(minStack.peek())) minStack.pop();
    }

    public int top() { return stack.peek(); }
    public int getMin() { return minStack.peek(); }
}`, timeComplexity: 'O(1)', spaceComplexity: 'O(n)' },
      cpp: { code: `class MinStack {
    stack<int> s, minS;
public:
    void push(int val) {
        s.push(val);
        if (minS.empty() || val <= minS.top()) minS.push(val);
    }
    void pop() {
        if (s.top() == minS.top()) minS.pop();
        s.pop();
    }
    int top() { return s.top(); }
    int getMin() { return minS.top(); }
};`, timeComplexity: 'O(1)', spaceComplexity: 'O(n)' },
      go: { code: `type MinStack struct {
    stack    []int
    minStack []int
}

func Constructor() MinStack { return MinStack{} }

func (this *MinStack) Push(val int) {
    this.stack = append(this.stack, val)
    if len(this.minStack) == 0 || val <= this.minStack[len(this.minStack)-1] {
        this.minStack = append(this.minStack, val)
    }
}

func (this *MinStack) Pop() {
    if this.stack[len(this.stack)-1] == this.minStack[len(this.minStack)-1] {
        this.minStack = this.minStack[:len(this.minStack)-1]
    }
    this.stack = this.stack[:len(this.stack)-1]
}

func (this *MinStack) Top() int { return this.stack[len(this.stack)-1] }
func (this *MinStack) GetMin() int { return this.minStack[len(this.minStack)-1] }`, timeComplexity: 'O(1)', spaceComplexity: 'O(n)' },
    },
    hints: ['Use two stacks: one for values, one for minimums.'],
    approach: `Maintain a secondary stack that tracks minimums. Push to min stack when value is <= current min.`,
  },

  'daily-temperatures': {
    id: 739,
    name: 'Daily Temperatures',
    difficulty: 'Medium',
    category: 'Stack',
    tags: ['Array', 'Stack', 'Monotonic Stack'],
    leetcodeUrl: 'https://leetcode.com/problems/daily-temperatures/',
    description: `Given an array of integers \`temperatures\` represents the daily temperatures, return an array \`answer\` such that \`answer[i]\` is the number of days you have to wait after the \`ith\` day to get a warmer temperature.`,
    examples: [
      { input: 'temperatures = [73,74,75,71,69,72,76,73]', output: '[1,1,4,2,1,1,0,0]', explanation: 'Days until warmer temperature.' },
      { input: 'temperatures = [30,40,50,60]', output: '[1,1,1,0]', explanation: 'Each day is warmer than previous.' },
    ],
    constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100'],
    solutions: {
      python: { code: `class Solution:
    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:
        n = len(temperatures)
        answer = [0] * n
        stack = []  # Stack of indices

        for i, temp in enumerate(temperatures):
            while stack and temperatures[stack[-1]] < temp:
                prev_idx = stack.pop()
                answer[prev_idx] = i - prev_idx
            stack.append(i)

        return answer`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
      javascript: { code: `var dailyTemperatures = function(temperatures) {
    const n = temperatures.length;
    const answer = new Array(n).fill(0);
    const stack = [];

    for (let i = 0; i < n; i++) {
        while (stack.length && temperatures[stack[stack.length - 1]] < temperatures[i]) {
            const prevIdx = stack.pop();
            answer[prevIdx] = i - prevIdx;
        }
        stack.push(i);
    }
    return answer;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
      java: { code: `class Solution {
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] answer = new int[n];
        Stack<Integer> stack = new Stack<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && temperatures[stack.peek()] < temperatures[i]) {
                int prevIdx = stack.pop();
                answer[prevIdx] = i - prevIdx;
            }
            stack.push(i);
        }
        return answer;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
      cpp: { code: `class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> answer(n, 0);
        stack<int> s;

        for (int i = 0; i < n; i++) {
            while (!s.empty() && temperatures[s.top()] < temperatures[i]) {
                int prevIdx = s.top(); s.pop();
                answer[prevIdx] = i - prevIdx;
            }
            s.push(i);
        }
        return answer;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
      go: { code: `func dailyTemperatures(temperatures []int) []int {
    n := len(temperatures)
    answer := make([]int, n)
    stack := []int{}

    for i, temp := range temperatures {
        for len(stack) > 0 && temperatures[stack[len(stack)-1]] < temp {
            prevIdx := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            answer[prevIdx] = i - prevIdx
        }
        stack = append(stack, i)
    }
    return answer
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
    },
    hints: ['Use a monotonic decreasing stack.'],
    approach: `Monotonic stack: pop smaller temps when a larger one is found, calculate the difference.`,
  },

  '3sum': {
    id: 15,
    name: '3Sum',
    difficulty: 'Medium',
    category: 'Two Pointers',
    tags: ['Array', 'Two Pointers', 'Sorting'],
    leetcodeUrl: 'https://leetcode.com/problems/3sum/',
    description: `Given an integer array nums, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]', explanation: 'The distinct triplets are [-1,0,1] and [-1,-1,2].' },
      { input: 'nums = [0,1,1]', output: '[]', explanation: 'No triplets sum to 0.' },
      { input: 'nums = [0,0,0]', output: '[[0,0,0]]', explanation: 'The only valid triplet.' },
    ],
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    solutions: {
      python: { code: `class Solution:
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

        return result`, timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)' },
      javascript: { code: `var threeSum = function(nums) {
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
};`, timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> result = new ArrayList<>();

        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int left = i + 1, right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum < 0) left++;
                else if (sum > 0) right--;
                else {
                    result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    while (left < right && nums[left] == nums[left + 1]) left++;
                    while (left < right && nums[right] == nums[right - 1]) right--;
                    left++; right--;
                }
            }
        }
        return result;
    }
}`, timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> result;

        for (int i = 0; i < nums.size() - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int left = i + 1, right = nums.size() - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum < 0) left++;
                else if (sum > 0) right--;
                else {
                    result.push_back({nums[i], nums[left], nums[right]});
                    while (left < right && nums[left] == nums[left + 1]) left++;
                    while (left < right && nums[right] == nums[right - 1]) right--;
                    left++; right--;
                }
            }
        }
        return result;
    }
};`, timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)' },
      go: { code: `func threeSum(nums []int) [][]int {
    sort.Ints(nums)
    result := [][]int{}

    for i := 0; i < len(nums)-2; i++ {
        if i > 0 && nums[i] == nums[i-1] { continue }
        left, right := i+1, len(nums)-1
        for left < right {
            sum := nums[i] + nums[left] + nums[right]
            if sum < 0 { left++
            } else if sum > 0 { right--
            } else {
                result = append(result, []int{nums[i], nums[left], nums[right]})
                for left < right && nums[left] == nums[left+1] { left++ }
                for left < right && nums[right] == nums[right-1] { right-- }
                left++; right--
            }
        }
    }
    return result
}`, timeComplexity: 'O(n^2)', spaceComplexity: 'O(1)' },
    },
    hints: ['Sort the array first, then use two pointers for each fixed element.'],
    approach: `Sort array, fix one element, use two pointers on remaining. Skip duplicates.`,
  },

  'product-of-array-except-self': {
    id: 238,
    name: 'Product of Array Except Self',
    difficulty: 'Medium',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Prefix Sum'],
    leetcodeUrl: 'https://leetcode.com/problems/product-of-array-except-self/',
    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

You must write an algorithm that runs in \`O(n)\` time and without using the division operation.`,
    examples: [
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]', explanation: 'Products without each element.' },
      { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]', explanation: 'Zeros make most products 0.' },
    ],
    constraints: ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30', 'Product fits in a 32-bit integer.'],
    solutions: {
      python: { code: `class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        n = len(nums)
        answer = [1] * n

        # Left products
        left = 1
        for i in range(n):
            answer[i] = left
            left *= nums[i]

        # Right products
        right = 1
        for i in range(n - 1, -1, -1):
            answer[i] *= right
            right *= nums[i]

        return answer`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var productExceptSelf = function(nums) {
    const n = nums.length;
    const answer = new Array(n).fill(1);

    let left = 1;
    for (let i = 0; i < n; i++) {
        answer[i] = left;
        left *= nums[i];
    }

    let right = 1;
    for (let i = n - 1; i >= 0; i--) {
        answer[i] *= right;
        right *= nums[i];
    }

    return answer;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        Arrays.fill(answer, 1);

        int left = 1;
        for (int i = 0; i < n; i++) {
            answer[i] = left;
            left *= nums[i];
        }

        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            answer[i] *= right;
            right *= nums[i];
        }
        return answer;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = nums.size();
        vector<int> answer(n, 1);

        int left = 1;
        for (int i = 0; i < n; i++) {
            answer[i] = left;
            left *= nums[i];
        }

        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            answer[i] *= right;
            right *= nums[i];
        }
        return answer;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func productExceptSelf(nums []int) []int {
    n := len(nums)
    answer := make([]int, n)
    for i := range answer { answer[i] = 1 }

    left := 1
    for i := 0; i < n; i++ {
        answer[i] = left
        left *= nums[i]
    }

    right := 1
    for i := n - 1; i >= 0; i-- {
        answer[i] *= right
        right *= nums[i]
    }
    return answer
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['Use prefix and suffix products.'],
    approach: `Two passes: first calculates left products, second multiplies by right products.`,
  },

  'climbing-stairs': {
    id: 70,
    name: 'Climbing Stairs',
    difficulty: 'Easy',
    category: 'Dynamic Programming',
    tags: ['Dynamic Programming', 'Math'],
    leetcodeUrl: 'https://leetcode.com/problems/climbing-stairs/',
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      { input: 'n = 2', output: '2', explanation: '1+1 or 2 steps.' },
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, or 2+1.' },
    ],
    constraints: ['1 <= n <= 45'],
    solutions: {
      python: { code: `class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n

        prev1, prev2 = 2, 1
        for _ in range(3, n + 1):
            prev1, prev2 = prev1 + prev2, prev1

        return prev1`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      javascript: { code: `var climbStairs = function(n) {
    if (n <= 2) return n;

    let prev1 = 2, prev2 = 1;
    for (let i = 3; i <= n; i++) {
        [prev1, prev2] = [prev1 + prev2, prev1];
    }
    return prev1;
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      java: { code: `class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int prev1 = 2, prev2 = 1;
        for (int i = 3; i <= n; i++) {
            int temp = prev1;
            prev1 = prev1 + prev2;
            prev2 = temp;
        }
        return prev1;
    }
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      cpp: { code: `class Solution {
public:
    int climbStairs(int n) {
        if (n <= 2) return n;
        int prev1 = 2, prev2 = 1;
        for (int i = 3; i <= n; i++) {
            int temp = prev1;
            prev1 = prev1 + prev2;
            prev2 = temp;
        }
        return prev1;
    }
};`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
      go: { code: `func climbStairs(n int) int {
    if n <= 2 { return n }
    prev1, prev2 := 2, 1
    for i := 3; i <= n; i++ {
        prev1, prev2 = prev1+prev2, prev1
    }
    return prev1
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    },
    hints: ['This is essentially the Fibonacci sequence.'],
    approach: `DP where f(n) = f(n-1) + f(n-2). Use two variables instead of array.`,
  },

  'coin-change': {
    id: 322,
    name: 'Coin Change',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    tags: ['Array', 'Dynamic Programming', 'BFS'],
    leetcodeUrl: 'https://leetcode.com/problems/coin-change/',
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount cannot be made up, return \`-1\`.`,
    examples: [
      { input: 'coins = [1,2,5], amount = 11', output: '3', explanation: '11 = 5 + 5 + 1.' },
      { input: 'coins = [2], amount = 3', output: '-1', explanation: 'Cannot make 3 with only 2s.' },
    ],
    constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
    solutions: {
      python: { code: `class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0

        for i in range(1, amount + 1):
            for coin in coins:
                if coin <= i:
                    dp[i] = min(dp[i], dp[i - coin] + 1)

        return dp[amount] if dp[amount] != float('inf') else -1`, timeComplexity: 'O(amount * n)', spaceComplexity: 'O(amount)' },
      javascript: { code: `var coinChange = function(coins, amount) {
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
};`, timeComplexity: 'O(amount * n)', spaceComplexity: 'O(amount)' },
      java: { code: `class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;

        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (coin <= i) {
                    dp[i] = Math.min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`, timeComplexity: 'O(amount * n)', spaceComplexity: 'O(amount)' },
      cpp: { code: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, amount + 1);
        dp[0] = 0;

        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (coin <= i) {
                    dp[i] = min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
};`, timeComplexity: 'O(amount * n)', spaceComplexity: 'O(amount)' },
      go: { code: `func coinChange(coins []int, amount int) int {
    dp := make([]int, amount+1)
    for i := range dp { dp[i] = amount + 1 }
    dp[0] = 0

    for i := 1; i <= amount; i++ {
        for _, coin := range coins {
            if coin <= i && dp[i-coin]+1 < dp[i] {
                dp[i] = dp[i-coin] + 1
            }
        }
    }
    if dp[amount] > amount { return -1 }
    return dp[amount]
}`, timeComplexity: 'O(amount * n)', spaceComplexity: 'O(amount)' },
    },
    hints: ['Use bottom-up DP where dp[i] = min coins for amount i.'],
    approach: `Bottom-up DP: dp[i] = min(dp[i], dp[i-coin]+1) for each coin.`,
  },

  'number-of-islands': {
    id: 200,
    name: 'Number of Islands',
    difficulty: 'Medium',
    category: 'Graph',
    tags: ['Array', 'DFS', 'BFS', 'Union Find'],
    leetcodeUrl: 'https://leetcode.com/problems/number-of-islands/',
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.`,
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: '1', explanation: 'One connected island.' },
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: '3', explanation: 'Three separate islands.' },
    ],
    constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 300', 'grid[i][j] is \'0\' or \'1\'.'],
    solutions: {
      python: { code: `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid:
            return 0

        rows, cols = len(grid), len(grid[0])
        count = 0

        def dfs(r, c):
            if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
                return
            grid[r][c] = '0'  # Mark visited
            dfs(r + 1, c)
            dfs(r - 1, c)
            dfs(r, c + 1)
            dfs(r, c - 1)

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == '1':
                    count += 1
                    dfs(r, c)

        return count`, timeComplexity: 'O(m * n)', spaceComplexity: 'O(m * n)' },
      javascript: { code: `var numIslands = function(grid) {
    const rows = grid.length, cols = grid[0].length;
    let count = 0;

    const dfs = (r, c) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
        grid[r][c] = '0';
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    };

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                count++;
                dfs(r, c);
            }
        }
    }
    return count;
};`, timeComplexity: 'O(m * n)', spaceComplexity: 'O(m * n)' },
      java: { code: `class Solution {
    public int numIslands(char[][] grid) {
        int rows = grid.length, cols = grid[0].length;
        int count = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c);
                }
            }
        }
        return count;
    }

    private void dfs(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r + 1, c);
        dfs(grid, r - 1, c);
        dfs(grid, r, c + 1);
        dfs(grid, r, c - 1);
    }
}`, timeComplexity: 'O(m * n)', spaceComplexity: 'O(m * n)' },
      cpp: { code: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int rows = grid.size(), cols = grid[0].size();
        int count = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c);
                }
            }
        }
        return count;
    }

    void dfs(vector<vector<char>>& grid, int r, int c) {
        if (r < 0 || r >= grid.size() || c < 0 || c >= grid[0].size() || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r + 1, c);
        dfs(grid, r - 1, c);
        dfs(grid, r, c + 1);
        dfs(grid, r, c - 1);
    }
};`, timeComplexity: 'O(m * n)', spaceComplexity: 'O(m * n)' },
      go: { code: `func numIslands(grid [][]byte) int {
    rows, cols := len(grid), len(grid[0])
    count := 0

    var dfs func(r, c int)
    dfs = func(r, c int) {
        if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1' { return }
        grid[r][c] = '0'
        dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)
    }

    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if grid[r][c] == '1' {
                count++
                dfs(r, c)
            }
        }
    }
    return count
}`, timeComplexity: 'O(m * n)', spaceComplexity: 'O(m * n)' },
    },
    hints: ['Use DFS or BFS to explore each island.'],
    approach: `For each '1' found, increment count and use DFS to mark all connected cells as visited.`,
  },
};

// Get problem by slug
export function getProblemBySlug(slug) {
  return PROBLEMS[slug] || null;
}

// Get all problems as array
export function getAllProblems() {
  return Object.entries(PROBLEMS).map(([slug, problem]) => ({
    slug,
    ...problem,
  }));
}

// Get problems by category
export function getProblemsByCategory(category) {
  return getAllProblems().filter(p => p.category === category);
}

// Get problems by difficulty
export function getProblemsByDifficulty(difficulty) {
  return getAllProblems().filter(p => p.difficulty === difficulty);
}

// Search problems
export function searchProblems(query) {
  const lowerQuery = query.toLowerCase();
  return getAllProblems().filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery) ||
    p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export default PROBLEMS;
