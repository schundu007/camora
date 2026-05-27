# Sidebar: Learn Section + Must Do Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CodeSignal Learn + Programiz to the sidebar Learn section, and add a new "Must Do" section with 10 curated Python practice problems that open the coding solver.

**Architecture:** Create a small `mustDoProblems.js` data file with 10 problem descriptions. The sidebar imports it and generates `NavItem[]` entries with `/capra/coding?problem=<encoded>` paths — matching the existing pattern used by the Library page. DashboardPage already reads `?problem=` from the URL with no changes needed.

**Tech Stack:** React 19, TypeScript, React Router DOM v7, existing Sidebar.tsx pattern

---

### Task 1: Create mustDoProblems.js data file

**Files:**
- Create: `apps/camora/src/data/capra/mustDoProblems.js`

- [ ] **Step 1: Create the file**

```js
// apps/camora/src/data/capra/mustDoProblems.js
// 10 curated Python/DSA must-do problems.
// Each description matches problems-full.json exactly so the solver loads correctly.

export const MUST_DO_PROBLEMS = [
  {
    slug: 'two-sum',
    label: 'Two Sum',
    description: "Given an integer array nums and an integer target , find indices i and j such that nums[i] + nums[j] == target and i != j . Assume that every input has exactly one pair of indices i and j that fulfill this condition. Return the pair of indices with the smaller index first. Example 1: Input: nums = [1, 2, 3, 4], target = 5 Output: [0, 3] Explanation: nums[0] + nums[3] == 5, so we return [0, 3]. Example 2: Input: nums = [0, -1, 2, -3, -1], target = -2 Output: [1, 4] Constraints:",
  },
  {
    slug: 'contains-duplicate',
    label: 'Contains Duplicate',
    description: "Given an integer array nums , determine whether any element appears more than once . Return true if a duplicate exists, and false otherwise. Example 1: Input: nums = [1, 1, 2, 3] Output: true Example 2: Input: nums = [1, 2, 3, 4] Output: false Constraints:",
  },
  {
    slug: 'valid-anagram',
    label: 'Valid Anagram',
    description: "Given two strings s and t , determine whether t is an anagram of s . Return true if they are anagrams, and false otherwise. An anagram is a word formed by rearranging the letters of another word, using all the original letters exactly once. Example 1: Input: s = \\\\ Output: true Example 2: Input: s = \\\\ Constraints:",
  },
  {
    slug: 'group-anagrams',
    label: 'Group Anagrams',
    description: "You are given an array of strings strs . Your task is to group all the anagrams together into separate sublists. The order of the groups in the output does not matter. Definition: An anagram is a word or phrase formed by rearranging the letters of another, using all the original letters exactly once. Example 1: Input: strs = [\\\\ Example 2: Input: strs = [\\\\ Output: [[\\\\ Example 3: Input: strs = [\\\\ Output: [[\\\\ Constraints:",
  },
  {
    slug: 'top-k-frequent-elements',
    label: 'Top K Frequent',
    description: "Given an integer array nums and an integer k , return the k elements that appear most frequently in the array. It is guaranteed that the answer is unique for each test case. You can return the result in any order. Example 1: Input: nums = [1,2,3,3,4,4,4], k = 2 Output: [3,4] Example 2: Input: nums = [6], k = 1 Output: [6] Constraints:",
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    label: 'Best Time Buy/Sell',
    description: "The best strategy is to buy on day 2 (price = 2) and sell on day 5 (price = 11), \nresulting in a profit of 11−2=9. Example 2: Input: prices = [5, 4, 3, 2, 1] Output: 0 Explanation: The prices only go down each day, so there is no chance to make a profit. \nHence, the maximum profit is 0. Constraints:",
  },
  {
    slug: 'missing-number',
    label: 'Missing Number',
    description: "You are provided with an array nums containing n unique integers, each ranging from 0 to n . Your goal is to identify and return the single number within this range that is absent from the nums array. Follow-up: Can you devise a solution that achieves this using only O(1) extra space and runs in O(n) time? Example 1: Input: nums = [0, 1, 3, 4] Output: 2 Explanation: The numbers range from 0 to 4. The number 2 is missing from the array. Example 2: Input: nums = [3, 0, 1] Output: 2 Explanation: The numbers range from 0 to 3. The number 2 is missing from the array. Constraints:",
  },
  {
    slug: 'move-zeroes',
    label: 'Move Zeroes',
    description: "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements. The operation must be performed in-place without making a copy of the array. Example 1: Input: {\\\\ Output: [1,3,12,0,0] Example 2: Input: {\\\\ Output: [1,0,0] Constraints:",
  },
  {
    slug: 'design-hashmap',
    label: 'Design Hashmap',
    description: "Design HashMap Design a HashMap without using any built-in hash table libraries. Implement a class that supports inserting a key-value pair, retrieving the value associated with a given key, and removing a key and its associated value from the map. If the key does not exist in the map, get should return -1 . Methods: put ( key: int, value: int ) : Inserts a (key, value) pair into the HashMap. If the key already exists, update the corresponding value. get ( key: int ) - int : Returns the value to which the specified key is mapped, or -1 if this map contains no mapping for the key. remove ( key: int ) : Removes the key and its corresponding value if the map contains the mapping for the key. Example 1: Input: operations = [\\\\ Output: [null,null,null,1,-1,null,1,null,-1] Explanation: MyHashMap map = new MyHashMap(); map.put(1, 1); map.put(2, 2); map.get(1) returns 1; map.get(3) returns -1 (not found); map.put(2, 1) updates key 2 to value 1; map.get(2) returns 1; map.remove(2); map.get(2) returns -1 (removed). Example 2: Input: operations = [\\\\ Output: [null,null,null,null,20,null,-1,30] Explanation: Insert keys 10, 20, 30. get(20) returns 20. Remove key 20. get(20) returns -1. get(30) returns 30. Constraints:",
  },
  {
    slug: 'first-unique-character-in-a-string',
    label: 'First Unique Char',
    description: "Given a string s , find the first non-repeating character in it and return its index. If it does not exist, return -1 . Example 1: Input: s = \\\\ Output: 0 Explanation: The first non-repeating character is 'l' at index 0. Example 2: Input: s = \\\\ Output: 2 Explanation: The first non-repeating character is 'v' at index 2. Characters 'l', 'o', and 'e' all repeat. Constraints:",
  },
];
```

- [ ] **Step 2: Verify the file was created**

```bash
wc -l apps/camora/src/data/capra/mustDoProblems.js
```
Expected: ~70 lines

---

### Task 2: Update Sidebar.tsx

**Files:**
- Modify: `apps/camora/src/components/layout/Sidebar.tsx:243–250`

Two changes:
1. Import `MUST_DO_PROBLEMS` at the top of the nav sections block
2. Add CodeSignal + Programiz to Learn section
3. Add new Must Do section after Learn

- [ ] **Step 1: Add import + update NAV_SECTIONS**

At line ~243 in Sidebar.tsx, the nav sections block starts. Replace the Learn section and add Must Do section.

Find this in `Sidebar.tsx`:
```tsx
  {
    title: 'Learn',
    items: [
      { label: 'Python', path: '/capra/learn/python', icon: pyLogo },
    ],
  },
```

Replace with:
```tsx
  {
    title: 'Learn',
    items: [
      { label: 'Python', path: '/capra/learn/python', icon: pyLogo },
      { label: 'CodeSignal', path: '/capra/learn/codesignal', icon: em('⚡') },
      { label: 'Programiz', path: 'https://www.programiz.com/python-programming', icon: em('🐍'), external: true },
    ],
  },
  {
    title: 'Must Do',
    items: MUST_DO_PROBLEMS.map(p => ({
      label: p.label,
      path: `/capra/coding?problem=${encodeURIComponent(p.description)}`,
      icon: em('✅'),
    })),
  },
```

- [ ] **Step 2: Add import at top of nav-sections block**

Just before the `const NAV_SECTIONS` array definition (line ~243), add:
```tsx
import { MUST_DO_PROBLEMS } from '../../data/capra/mustDoProblems.js';
```

**Note:** Sidebar.tsx is a `.tsx` file. The import must go at the top of the file with other imports (lines 1–3), not inline in the nav sections block. Add it after the existing React Router import:
```tsx
import { MUST_DO_PROBLEMS } from '../../data/capra/mustDoProblems.js';
```

- [ ] **Step 3: Verify build passes**

```bash
cd apps/camora && npx vite build 2>&1 | tail -20
```
Expected: Build succeeded with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git pull && git add apps/camora/src/data/capra/mustDoProblems.js apps/camora/src/components/layout/Sidebar.tsx && git commit -m "feat(sidebar): add CodeSignal + Programiz to Learn, add Must Do section with 10 practice problems"
```

- [ ] **Step 5: Deploy**

```bash
vercel --prod 2>&1 | tail -5
```
