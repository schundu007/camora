import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { techInterviewTopics, interviewCheatsheet, behavioralQuestions } from '../data/capra/topics/techInterviewHandbook';
import { SOLUTIONS } from './Blind75PracticePage';
import SEO from '../components/shared/SEO';

/* ──────────────────────────────── Constants ──────────────────────────────── */

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const STORAGE_KEY = 'blind75_completed';


/* ──────────────────────────────── Types ──────────────────────────────── */

interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  leetcode: string;
}

interface Category {
  name: string;
  color: string;
  problems: Problem[];
}

type TabKey = 'blind75' | 'algorithms' | 'behavioral' | 'cheatsheet';

/* ──────────────────────────────── Data ──────────────────────────────── */

const CATEGORIES: Category[] = [
  {
    name: 'Arrays & Hashing',
    color: 'var(--success)',
    problems: [
      { id: 1, title: 'Two Sum', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/two-sum/' },
      { id: 2, title: 'Contains Duplicate', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/contains-duplicate/' },
      { id: 3, title: 'Valid Anagram', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/valid-anagram/' },
      { id: 4, title: 'Group Anagrams', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/group-anagrams/' },
      { id: 5, title: 'Top K Frequent Elements', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/top-k-frequent-elements/' },
      { id: 6, title: 'Product of Array Except Self', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/product-of-array-except-self/' },
      { id: 7, title: 'Encode and Decode Strings', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/encode-and-decode-strings/' },
      { id: 8, title: 'Longest Consecutive Sequence', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-consecutive-sequence/' },
    ],
  },
  {
    name: 'Two Pointers',
    color: 'var(--accent)',
    problems: [
      { id: 9, title: 'Valid Palindrome', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/valid-palindrome/' },
      { id: 10, title: '3Sum', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/3sum/' },
      { id: 11, title: 'Container With Most Water', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/container-with-most-water/' },
    ],
  },
  {
    name: 'Sliding Window',
    color: 'var(--accent)',
    problems: [
      { id: 12, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
      { id: 13, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
      { id: 14, title: 'Longest Repeating Character Replacement', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
      { id: 15, title: 'Minimum Window Substring', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/minimum-window-substring/' },
    ],
  },
  {
    name: 'Stack',
    color: 'var(--warning)',
    problems: [
      { id: 16, title: 'Valid Parentheses', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/valid-parentheses/' },
    ],
  },
  {
    name: 'Binary Search',
    color: '#06b6d4',
    problems: [
      { id: 17, title: 'Search in Rotated Sorted Array', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
      { id: 18, title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
    ],
  },
  {
    name: 'Linked List',
    color: 'var(--text-muted)',
    problems: [
      { id: 19, title: 'Reverse Linked List', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/reverse-linked-list/' },
      { id: 20, title: 'Merge Two Sorted Lists', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
      { id: 21, title: 'Linked List Cycle', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/linked-list-cycle/' },
      { id: 22, title: 'Reorder List', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/reorder-list/' },
      { id: 23, title: 'Remove Nth Node From End of List', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
      { id: 24, title: 'Merge K Sorted Lists', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
    ],
  },
  {
    name: 'Trees',
    color: 'var(--accent)',
    problems: [
      { id: 25, title: 'Invert Binary Tree', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/invert-binary-tree/' },
      { id: 26, title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
      { id: 27, title: 'Same Tree', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/same-tree/' },
      { id: 28, title: 'Subtree of Another Tree', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/subtree-of-another-tree/' },
      { id: 29, title: 'Lowest Common Ancestor of BST', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/' },
      { id: 30, title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
      { id: 31, title: 'Validate Binary Search Tree', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/validate-binary-search-tree/' },
      { id: 32, title: 'Kth Smallest Element in a BST', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/' },
      { id: 33, title: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/' },
      { id: 34, title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
      { id: 35, title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },
    ],
  },
  {
    name: 'Tries',
    color: 'var(--accent)',
    problems: [
      { id: 36, title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
      { id: 37, title: 'Design Add and Search Words', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
      { id: 38, title: 'Word Search II', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/word-search-ii/' },
    ],
  },
  {
    name: 'Heap / Priority Queue',
    color: 'var(--danger)',
    problems: [
      { id: 39, title: 'Find Median from Data Stream', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/find-median-from-data-stream/' },
    ],
  },
  {
    name: 'Backtracking',
    color: 'var(--accent)',
    problems: [
      { id: 40, title: 'Combination Sum', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/combination-sum/' },
      { id: 41, title: 'Word Search', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/word-search/' },
    ],
  },
  {
    name: 'Graphs',
    color: 'var(--accent)',
    problems: [
      { id: 42, title: 'Number of Islands', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/number-of-islands/' },
      { id: 43, title: 'Clone Graph', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/clone-graph/' },
      { id: 44, title: 'Pacific Atlantic Water Flow', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/pacific-atlantic-water-flow/' },
      { id: 45, title: 'Course Schedule', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/course-schedule/' },
      { id: 46, title: 'Graph Valid Tree', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/graph-valid-tree/' },
      { id: 47, title: 'Number of Connected Components', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/' },
      { id: 48, title: 'Alien Dictionary', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/alien-dictionary/' },
    ],
  },
  {
    name: 'Dynamic Programming',
    color: '#0B5CFF',
    problems: [
      { id: 49, title: 'Climbing Stairs', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/climbing-stairs/' },
      { id: 50, title: 'House Robber', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/house-robber/' },
      { id: 51, title: 'House Robber II', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/house-robber-ii/' },
      { id: 52, title: 'Longest Increasing Subsequence', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
      { id: 53, title: 'Coin Change', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/coin-change/' },
      { id: 54, title: 'Word Break', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/word-break/' },
      { id: 55, title: 'Decode Ways', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/decode-ways/' },
      { id: 56, title: 'Unique Paths', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/unique-paths/' },
      { id: 57, title: 'Jump Game', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/jump-game/' },
    ],
  },
  {
    name: 'Greedy',
    color: '#84cc16',
    problems: [
      { id: 58, title: 'Maximum Subarray', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/maximum-subarray/' },
      { id: 59, title: 'Maximum Product Subarray', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/maximum-product-subarray/' },
    ],
  },
  {
    name: 'Intervals',
    color: '#0ea5e9',
    problems: [
      { id: 60, title: 'Insert Interval', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/insert-interval/' },
      { id: 61, title: 'Merge Intervals', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/merge-intervals/' },
      { id: 62, title: 'Non-overlapping Intervals', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/non-overlapping-intervals/' },
      { id: 63, title: 'Meeting Rooms', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/meeting-rooms/' },
      { id: 64, title: 'Meeting Rooms II', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/meeting-rooms-ii/' },
    ],
  },
  {
    name: 'Math & Geometry',
    color: '#78716c',
    problems: [
      { id: 65, title: 'Rotate Image', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/rotate-image/' },
      { id: 66, title: 'Spiral Matrix', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/spiral-matrix/' },
      { id: 67, title: 'Set Matrix Zeroes', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/set-matrix-zeroes/' },
    ],
  },
  {
    name: 'Bit Manipulation',
    color: '#64748b',
    problems: [
      { id: 68, title: 'Number of 1 Bits', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/number-of-1-bits/' },
      { id: 69, title: 'Counting Bits', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/counting-bits/' },
      { id: 70, title: 'Reverse Bits', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/reverse-bits/' },
      { id: 71, title: 'Missing Number', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/missing-number/' },
      { id: 72, title: 'Sum of Two Integers', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/sum-of-two-integers/' },
    ],
  },
  {
    name: 'Advanced',
    color: '#b91c1c',
    problems: [
      { id: 73, title: 'Task Scheduler', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/task-scheduler/' },
      { id: 74, title: 'Palindromic Substrings', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/palindromic-substrings/' },
      { id: 75, title: 'Longest Common Subsequence', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-common-subsequence/' },
    ],
  },
];

/* ── Category -> Tech Interview Handbook topic mapping ── */
const CATEGORY_TOPIC_MAP: Record<string, string[]> = {
  'Arrays & Hashing': ['Hash Table'],
  'Two Pointers': ['String'],
  'Sliding Window': ['String'],
  'Binary Search': ['Sorting and Searching'],
  'Linked List': ['Linked List'],
  'Trees': ['Tree'],
  'Tries': ['Trie'],
  'Heap / Priority Queue': ['Heap'],
  'Graphs': ['Graph'],
  'Dynamic Programming': ['Dynamic Programming'],
  'Stack': ['Stack'],
  'Intervals': ['Interval'],
  'Bit Manipulation': ['Binary'],
  'Math & Geometry': ['Math'],
  'Backtracking': ['Recursion'],
};

function getTipsForCategory(categoryName: string) {
  const topicTitles = CATEGORY_TOPIC_MAP[categoryName];
  if (!topicTitles) return null;
  const topic = techInterviewTopics.find((t: any) => topicTitles.includes(t.title));
  if (!topic) return null;
  return { techniques: topic.techniques || [], cornerCases: topic.cornerCases || [], title: topic.title };
}

const ALL_PROBLEMS = CATEGORIES.flatMap((c) => c.problems);
const TOTAL = ALL_PROBLEMS.length;

const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'bash'] as const;
type Language = typeof LANGUAGES[number];

const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  bash: 'Bash',
};

const PLACEHOLDER_CODE: Record<Language, string> = {
  python: '# Write your solution here\nfrom typing import List\n\nclass Solution:\n    def solve(self, nums: List[int]) -> List[int]:\n        pass\n\n# Test\nsol = Solution()\nprint(sol.solve([2, 7, 11, 15]))\n',
  javascript: '// Write your solution here\n\nfunction solve(nums, target) {\n  // your code\n}\n\nconsole.log(solve([2, 7, 11, 15], 9));\n',
  typescript: '// Write your solution here\n\nfunction solve(nums: number[], target: number): number[] {\n  return [];\n}\n\nconsole.log(solve([2, 7, 11, 15], 9));\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static int[] solve(int[] nums, int target) {\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        System.out.println(Arrays.toString(solve(new int[]{2,7,11,15}, 9)));\n    }\n}\n',
  cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> solve(vector<int>& nums, int target) {\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2,7,11,15};\n    auto res = solve(nums, 9);\n    for (int x : res) cout << x << " ";\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    int nums[] = {2,7,11,15};\n    int target = 9;\n    // your code\n    printf("Solution: \\n");\n    return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc solve(nums []int, target int) []int {\n\treturn nil\n}\n\nfunc main() {\n\tfmt.Println(solve([]int{2, 7, 11, 15}, 9))\n}\n',
  rust: 'fn solve(nums: Vec<i32>, target: i32) -> Vec<i32> {\n    vec![]\n}\n\nfn main() {\n    println!("{:?}", solve(vec![2, 7, 11, 15], 9));\n}\n',
  bash: '#!/bin/bash\nnums=(2 7 11 15)\ntarget=9\necho "Solution: "\n',
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: 'rgba(5,150,105,0.12)', text: 'var(--accent)', border: 'rgba(5,150,105,0.3)' },
  Medium: { bg: 'rgba(217,119,6,0.12)', text: '#d97706', border: 'rgba(217,119,6,0.3)' },
  Hard: { bg: 'rgba(220,38,38,0.12)', text: '#0B5CFF', border: 'rgba(220,38,38,0.3)' },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'blind75', label: 'Blind 75' },
  { key: 'algorithms', label: 'Algorithm Guides' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'cheatsheet', label: 'Cheatsheet' },
];

const BEHAVIORAL_SECTIONS: { key: string; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'amazon', label: 'Amazon' },
  { key: 'google', label: 'Google' },
  { key: 'meta', label: 'Meta' },
  { key: 'microsoft', label: 'Microsoft' },
  { key: 'apple', label: 'Apple' },
];

const totalBehavioralQuestions = Object.values(behavioralQuestions).reduce((n: number, arr: any) => n + arr.length, 0);

/* ──────────────────────────────── Helpers ──────────────────────────────── */

function loadCompleted(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveCompleted(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function Blind75Page() {
  const { token } = useAuth();

  useEffect(() => {
    document.title = 'Blind 75 | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  /* ── Shared state ── */
  const [activeTab, setActiveTab] = useState<TabKey>(() => { const p = new URLSearchParams(window.location.search); const t = p.get('tab'); return (t === 'algorithms' || t === 'behavioral' || t === 'cheatsheet') ? t : 'blind75'; });

  /* ── Blind 75 state ── */
  const [completed, setCompleted] = useState<Set<number>>(() => loadCompleted());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [openProblemId, setOpenProblemId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'practice' | 'solution'>('practice');
  const [expandedTips, setExpandedTips] = useState<string | null>(null);

  // Code playground state
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSolving, setIsSolving] = useState(false);

  /* ── Algorithm Guides state ── */
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  /* ── Behavioral state ── */
  const [behavioralSection, setBehavioralSection] = useState('general');
  const [expandedBehavioral, setExpandedBehavioral] = useState<number | null>(null);
  const [practicedQuestions, setPracticedQuestions] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('behavioral_practiced') || '[]'));
    } catch { return new Set(); }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    saveCompleted(completed);
  }, [completed]);

  // Reset code when opening a new problem or changing language
  useEffect(() => {
    if (openProblemId !== null) {
      setCode(PLACEHOLDER_CODE[language]);
      setOutput('');
    }
  }, [openProblemId, language]);

  const toggleCompleted = (id: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredCategories = CATEGORIES
    .filter((c) => categoryFilter === 'All' || c.name === categoryFilter)
    .map((c) => ({
      ...c,
      problems: c.problems.filter(
        (p) => difficultyFilter === 'All' || p.difficulty === difficultyFilter
      ),
    }))
    .filter((c) => c.problems.length > 0);

  const totalFiltered = filteredCategories.reduce((n, c) => n + c.problems.length, 0);
  const completedCount = completed.size;
  const progressPercent = Math.round((completedCount / TOTAL) * 100);

  /* ── API calls ── */
  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code, language, input: '' }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setOutput(data.stdout || data.stderr || data.output || 'No output');
    } catch (err: any) {
      setOutput(`Error: ${err.message || 'Failed to run code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getAISolution = async (problemTitle: string) => {
    setIsSolving(true);
    setOutput('Getting AI solution...');
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/solve/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ problem: problemTitle, language }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let codeResult = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.code) codeResult = event.code;
              else if (event.chunk) codeResult += event.chunk;
              else if (event.result?.code) codeResult = event.result.code;
            } catch {}
          }
        }
      }
      // Try to parse as JSON to extract code
      try {
        const parsed = JSON.parse(codeResult);
        if (parsed.code) {
          setCode(parsed.code);
          setOutput('Solution loaded into editor');
        } else if (parsed.approaches?.[0]?.code) {
          setCode(parsed.approaches[0].code);
          setOutput('Solution loaded into editor');
        } else {
          setCode(codeResult);
          setOutput('Solution loaded into editor');
        }
      } catch {
        if (codeResult.trim()) {
          setCode(codeResult);
          setOutput('Solution loaded into editor');
        } else {
          setOutput('No solution generated. Try again.');
        }
      }
    } catch (err: any) {
      setOutput(`Error: ${err.message || 'Failed to get solution'}`);
    } finally {
      setIsSolving(false);
    }
  };

  const getCategoryProgress = (cat: Category) => {
    const done = cat.problems.filter((p) => completed.has(p.id)).length;
    return { done, total: cat.problems.length };
  };

  /* ────────────────────────────────────────────────────────────────────────── */
  /*                              R E N D E R                                  */
  /* ────────────────────────────────────────────────────────────────────────── */

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* ═══════════════════════ Header Section ═══════════════════════ */}
      <div>
        <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: 32 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0 }}>
                  Interview Handbook
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  {[
                    { label: '75 Problems', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
                    { label: `${techInterviewTopics.length} Algorithms`, color: 'var(--accent)', bg: 'rgba(45,140,255,0.12)', border: 'rgba(45,140,255,0.3)' },
                    { label: `${totalBehavioralQuestions} Behavioral`, color: 'var(--accent)', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)' },
                    { label: 'Cheatsheet', color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' },
                  ].map((stat) => (
                    <span
                      key={stat.label}
                      style={{ fontSize: '12px', fontWeight: 600, color: stat.color, background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '3px 10px' }}
                    >
                      {stat.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div style={{ minWidth: 200, flex: '0 1 260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {completedCount} / {TOTAL} completed
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>
                    {progressPercent}%
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, var(--success), var(--accent))',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ Tab Navigation (sticky) ═══════════════════════ */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 'var(--nav-h, 56px)', zIndex: 30 }}>
        <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none', padding: '8px 0' }} className="b75-pills-scroll">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '7px 16px',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    border: isActive ? 'none' : '1px solid transparent',
                    borderRadius: '20px',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ TAB CONTENT ═══════════════════════ */}

      {/* ───────────── TAB 1: Blind 75 ───────────── */}
      {activeTab === 'blind75' && (
        <>
          {/* Filter Bar */}
          <div style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
            <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ padding: '12px 0' }}>
              {/* Category pills */}
              <div className="b75-pills-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {['All', ...CATEGORIES.map((c) => c.name)].map((name) => {
                  const isActive = categoryFilter === name;
                  const cat = CATEGORIES.find((c) => c.name === name);
                  return (
                    <button
                      key={name}
                      onClick={() => setCategoryFilter(name)}
                      style={{
                        flexShrink: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: isActive ? 'none' : '1px solid var(--border)',
                        background: isActive ? (cat?.color || 'var(--accent)') : 'var(--bg-surface)',
                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Difficulty filter */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {['All', 'Easy', 'Medium', 'Hard'].map((d) => {
                  const isActive = difficultyFilter === d;
                  const colors = DIFFICULTY_COLORS[d];
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficultyFilter(d)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: isActive ? '1px solid' : '1px solid transparent',
                        borderColor: isActive ? (colors?.border || 'var(--border)') : 'transparent',
                        background: isActive ? (colors?.bg || 'var(--bg-elevated)') : 'transparent',
                        color: isActive ? (colors?.text || 'var(--text-secondary)') : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center' }}>
                  Showing {totalFiltered} problem{totalFiltered !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Problem List */}
          <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
            {filteredCategories.map((cat) => {
              const progress = getCategoryProgress(CATEGORIES.find((c) => c.name === cat.name) || cat);
              return (
                <div key={cat.name} style={{ marginBottom: '32px' }}>
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '4px', height: '24px', borderRadius: '2px', background: cat.color }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{cat.name}</h2>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {progress.done}/{progress.total} done
                    </span>
                    {/* Mini progress bar */}
                    <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                          background: cat.color,
                          borderRadius: '2px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Study Tips (from Tech Interview Handbook) */}
                  {(() => {
                    const tips = getTipsForCategory(cat.name);
                    if (!tips) return null;
                    const isExpanded = expandedTips === cat.name;
                    return (
                      <div style={{ marginBottom: '10px' }}>
                        <button
                          onClick={() => setExpandedTips(isExpanded ? null : cat.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            background: 'none',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            padding: '4px 0',
                            transition: 'color 0.15s',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Study Tips
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginTop: '6px',
                            fontSize: '12px',
                            lineHeight: 1.6,
                            color: 'var(--text-secondary)',
                          }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '12px' }}>
                              Key Techniques ({tips.title})
                            </div>
                            <ol style={{ margin: '0 0 8px', paddingLeft: '18px' }}>
                              {tips.techniques.slice(0, 6).map((t: string, i: number) => (
                                <li key={i} style={{ marginBottom: '3px' }}>{t}</li>
                              ))}
                            </ol>
                            {tips.cornerCases.length > 0 && (
                              <>
                                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>
                                  Corner Cases
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                  {tips.cornerCases.map((c: string, i: number) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>{c}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Problem rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {cat.problems.map((problem) => {
                      const isComplete = completed.has(problem.id);
                      const isOpen = openProblemId === problem.id;
                      const dc = DIFFICULTY_COLORS[problem.difficulty];

                      return (
                        <div key={problem.id}>
                          {/* Problem row card */}
                          <div
                            className="b75-card"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px 16px',
                              background: isComplete ? 'rgba(5,150,105,0.08)' : 'var(--bg-surface)',
                              border: `1px solid ${isOpen ? cat.color : isComplete ? 'rgba(5,150,105,0.3)' : 'var(--border)'}`,
                              borderRadius: isOpen ? '12px 12px 0 0' : '12px',
                              transition: 'all 0.15s',
                              flexWrap: 'wrap',
                            }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleCompleted(problem.id)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                border: isComplete ? 'none' : '2px solid var(--border)',
                                background: isComplete ? 'var(--success)' : 'var(--bg-surface)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s',
                              }}
                              aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {isComplete && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>

                            {/* Problem number */}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', width: '28px', textAlign: 'center', flexShrink: 0 }}>
                              #{problem.id}
                            </span>

                            {/* Title */}
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: isComplete ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: isComplete ? 'line-through' : 'none',
                              flex: 1,
                              minWidth: '120px',
                            }}>
                              {problem.title}
                            </span>

                            {/* Difficulty badge */}
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '20px',
                              background: dc.bg,
                              color: dc.text,
                              border: `1px solid ${dc.border}`,
                              flexShrink: 0,
                            }}>
                              {problem.difficulty}
                            </span>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              {isOpen && (
                                <button
                                  onClick={() => setOpenProblemId(null)}
                                  className="b75-action-btn"
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    padding: '5px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--danger)',
                                    color: 'var(--bg-surface)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  Close
                                </button>
                              )}
                              <button
                                onClick={() => { setOpenProblemId(isOpen && viewMode === 'practice' ? null : problem.id); setViewMode('practice'); }}
                                className="b75-action-btn"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  padding: '5px 14px',
                                  borderRadius: '8px',
                                  border: `1px solid ${isOpen && viewMode === 'practice' ? cat.color : cat.color + '30'}`,
                                  background: isOpen && viewMode === 'practice' ? cat.color : `${cat.color}08`,
                                  color: isOpen && viewMode === 'practice' ? '#ffffff' : cat.color,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                Practice
                              </button>
                              <button
                                onClick={() => { setOpenProblemId(isOpen && viewMode === 'solution' ? null : problem.id); setViewMode('solution'); }}
                                className="b75-action-btn"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  padding: '5px 14px',
                                  borderRadius: '8px',
                                  border: `1px solid ${isOpen && viewMode === 'solution' ? 'var(--accent)' : 'rgba(45,140,255,0.19)'}`,
                                  background: isOpen && viewMode === 'solution' ? 'var(--accent)' : 'rgba(45,140,255,0.03)',
                                  color: isOpen && viewMode === 'solution' ? '#ffffff' : 'var(--accent)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                Solution
                              </button>
                              <a
                                href={problem.leetcode}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="b75-action-btn"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  padding: '5px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-surface)',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s',
                                }}
                              >
                                LeetCode
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                </svg>
                              </a>
                            </div>
                          </div>

                          {/* ═══════════════ Code Playground ═══════════════ */}
                          {isOpen && (
                            <div
                              style={{
                                border: `1px solid ${viewMode === 'solution' ? 'var(--accent)' : cat.color}`,
                                borderTop: 'none',
                                borderRadius: '0 0 12px 12px',
                                background: 'var(--bg-surface)',
                                overflow: 'hidden',
                              }}
                            >
                              {/* View mode tabs */}
                              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                <button onClick={() => setViewMode('practice')} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', background: viewMode === 'practice' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'practice' ? cat.color : 'var(--text-muted)', borderBottom: viewMode === 'practice' ? `2px solid ${cat.color}` : '2px solid transparent', cursor: 'pointer' }}>
                                  Practice
                                </button>
                                <button onClick={() => setViewMode('solution')} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)', background: viewMode === 'solution' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'solution' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: viewMode === 'solution' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer' }}>
                                  Solution
                                </button>
                              </div>

                              {viewMode === 'solution' ? (
                                /* ── SOLUTION VIEW ── */
                                <div style={{ padding: '16px' }}>
                                  {(() => {
                                    // Import solutions inline from Blind75PracticePage data
                                    const sol = SOLUTIONS[String(problem.id)];
                                    if (!sol) return (
                                      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        <p style={{ fontSize: '14px', marginBottom: '12px' }}>Pre-written solution coming soon.</p>
                                        <button onClick={() => { setViewMode('practice'); getAISolution(problem.title); }} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                          Generate AI Solution
                                        </button>
                                      </div>
                                    );
                                    return (
                                      <div>
                                        {sol.approaches.map((approach: any, ai: number) => (
                                          <div key={ai} style={{ marginBottom: ai < sol.approaches.length - 1 ? '20px' : 0, padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{approach.name}</span>
                                              <div style={{ display: 'flex', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(45,140,255,0.12)', color: 'var(--accent)' }}>Time: {approach.complexity.time}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(236,72,153,0.12)', color: 'var(--text-muted)' }}>Space: {approach.complexity.space}</span>
                                              </div>
                                            </div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{approach.description}</p>
                                            <div style={{ position: 'relative' }}>
                                              <button
                                                onClick={() => {
                                                  const codeText = approach.code?.[language] || approach.code?.python || Object.values(approach.code)[0] || '';
                                                  navigator.clipboard.writeText(codeText);
                                                  setOutput('Copied to clipboard!');
                                                  setTimeout(() => setOutput(''), 1500);
                                                }}
                                                style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', zIndex: 1 }}
                                              >
                                                Copy
                                              </button>
                                              <pre style={{ background: '#0d1117', color: '#e6edf3', padding: '12px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.6, overflow: 'auto', marginBottom: '8px' }}>
                                                <code>{approach.code?.[language] || approach.code?.python || Object.values(approach.code)[0] || ''}</code>
                                              </pre>
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                              {approach.keyPoints?.map((kp: string, ki: number) => (
                                                <li key={ki} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{kp}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                              /* ── PRACTICE VIEW (existing code playground) ── */
                              <>
                              {/* Toolbar */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                background: 'var(--bg-elevated)',
                                borderBottom: '1px solid var(--border)',
                                flexWrap: 'wrap',
                              }}>
                                {/* Language selector */}
                                <select
                                  value={language}
                                  onChange={(e) => setLanguage(e.target.value as Language)}
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                  }}
                                >
                                  {LANGUAGES.map((l) => (
                                    <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
                                  ))}
                                </select>

                                <div style={{ flex: 1 }} />

                                <button
                                  onClick={runCode}
                                  disabled={isRunning}
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: isRunning ? '#9ca3af' : 'var(--success)',
                                    color: 'var(--bg-surface)',
                                    cursor: isRunning ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                    <path d="M5 3l14 9-14 9V3z" />
                                  </svg>
                                  {isRunning ? 'Running...' : 'Run Code'}
                                </button>

                                <button
                                  onClick={() => getAISolution(problem.title)}
                                  disabled={isSolving}
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: isSolving ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                                    color: isSolving ? 'var(--text-muted)' : 'var(--accent)',
                                    cursor: isSolving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                                  </svg>
                                  {isSolving ? 'Solving...' : 'Get AI Solution'}
                                </button>
                              </div>

                              {/* Code editor */}
                              <div style={{ position: 'relative' }}>
                                <textarea
                                  value={code}
                                  onChange={(e) => setCode(e.target.value)}
                                  spellCheck={false}
                                  style={{
                                    width: '100%',
                                    minHeight: '240px',
                                    padding: '16px',
                                    fontFamily: "'Source Code Pro', 'Fira Code', 'SF Mono', Consolas, monospace",
                                    fontSize: '13px',
                                    lineHeight: 1.6,
                                    background: '#0d1117',
                                    color: '#e6edf3',
                                    border: '1px solid var(--border)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                    tabSize: 4,
                                  }}
                                />
                              </div>

                              {/* Output panel */}
                              {output && (
                                <div style={{ borderTop: '1px solid var(--border)' }}>
                                  <div style={{ padding: '8px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      Output
                                    </span>
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    padding: '12px 16px',
                                    fontFamily: "'Source Code Pro', 'Fira Code', 'SF Mono', Consolas, monospace",
                                    fontSize: '12px',
                                    lineHeight: 1.6,
                                    background: '#1a1a2e',
                                    color: '#a5f3fc',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                  }}>
                                    {output}
                                  </pre>
                                </div>
                              )}
                              </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '16px', fontWeight: 500 }}>No problems match your filters.</p>
                <button
                  onClick={() => { setCategoryFilter('All'); setDifficultyFilter('All'); }}
                  style={{
                    marginTop: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'none',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ───────────── TAB 2: Algorithm Guides ───────────── */}
      {activeTab === 'algorithms' && (
        <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {techInterviewTopics.map((topic: any) => {
              const isExpanded = expandedTopic === topic.id;
              const techniqueCount = topic.techniques?.length || 0;
              const questionCount = (topic.essentialQuestions?.length || 0) + (topic.recommendedQuestions?.length || 0);

              return (
                <div
                  key={topic.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: isExpanded ? '0 4px 16px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Topic header */}
                  <button
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                      {topic.title}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: 'rgba(5,150,105,0.08)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      whiteSpace: 'nowrap',
                    }}>
                      {techniqueCount} techniques
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: 'rgba(45,140,255,0.08)',
                      color: '#2563eb',
                      border: '1px solid rgba(45,140,255,0.3)',
                      whiteSpace: 'nowrap',
                    }}>
                      {questionCount} questions
                    </span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                      {/* Introduction */}
                      <div style={{ marginTop: '16px', marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Introduction</h4>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{topic.introduction}</p>
                      </div>

                      {/* Key Techniques */}
                      {topic.techniques && topic.techniques.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Techniques</h4>
                          <ol style={{ margin: 0, paddingLeft: '20px' }}>
                            {topic.techniques.map((t: string, i: number) => (
                              <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '4px' }}>{t}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Time Complexity */}
                      {topic.timeComplexity && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Complexity</h4>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>Operation</th>
                                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>Complexity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(topic.timeComplexity).map(([key, value]: [string, any]) => (
                                  <tr key={key}>
                                    <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                                    </td>
                                    <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', color: 'var(--accent)', fontFamily: "'Source Code Pro', monospace", fontWeight: 600 }}>
                                      {String(value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Corner Cases */}
                      {topic.cornerCases && topic.cornerCases.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Corner Cases</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {topic.cornerCases.map((c: string, i: number) => (
                              <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2px' }}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Essential Questions */}
                      {topic.essentialQuestions && topic.essentialQuestions.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Essential Questions</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {topic.essentialQuestions.map((q: any, i: number) => {
                              const dc = DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.Medium;
                              return (
                                <div key={i} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '8px 12px',
                                  background: 'var(--bg-elevated)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border)',
                                }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{q.title}</span>
                                  <span style={{
                                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                    background: dc.bg, color: dc.text, border: `1px solid ${dc.border}`,
                                  }}>
                                    {q.difficulty}
                                  </span>
                                  <a
                                    href={q.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none',
                                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    }}
                                    className="b75-action-btn"
                                  >
                                    LeetCode
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                    </svg>
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recommended Questions */}
                      {topic.recommendedQuestions && topic.recommendedQuestions.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Questions</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {topic.recommendedQuestions.map((q: any, i: number) => {
                              const dc = DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS.Medium;
                              return (
                                <div key={i} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                }}>
                                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>{q.title}</span>
                                  <span style={{
                                    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                    background: dc.bg, color: dc.text, border: `1px solid ${dc.border}`,
                                  }}>
                                    {q.difficulty}
                                  </span>
                                  <a
                                    href={q.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none' }}
                                  >
                                    LeetCode
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      {topic.tips && topic.tips.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tips</h4>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {topic.tips.map((tip: string, i: number) => (
                              <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '4px' }}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────── TAB 3: Behavioral ───────────── */}
      {activeTab === 'behavioral' && (() => {
        const currentQuestions = ((behavioralQuestions as any)[behavioralSection] || []) as any[];
        const totalInSection = currentQuestions.length;
        const practicedInSection = currentQuestions.filter((_: any, i: number) => practicedQuestions.has(`${behavioralSection}-${i}`)).length;
        const progressPct = totalInSection > 0 ? Math.round((practicedInSection / totalInSection) * 100) : 0;

        const togglePracticed = (key: string) => {
          setPracticedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            localStorage.setItem('behavioral_practiced', JSON.stringify([...next]));
            return next;
          });
        };

        return (
        <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', scrollbarWidth: 'none', flexWrap: 'wrap' }}>
            {BEHAVIORAL_SECTIONS.map((sec) => {
              const isActive = behavioralSection === sec.key;
              return (
                <button
                  key={sec.key}
                  onClick={() => { setBehavioralSection(sec.key); setExpandedBehavioral(null); }}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: isActive ? 'none' : '1px solid var(--border)',
                    background: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Practice Progress</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{practicedInSection}/{totalInSection} practiced ({progressPct}%)</span>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, var(--success), var(--accent))', width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Questions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestions.map((item: any, i: number) => {
              const question = typeof item === 'string' ? item : item.q;
              const isExpanded = expandedBehavioral === i;
              const hasStar = item.star && item.lookFor;
              const answer = typeof item === 'object' && !hasStar ? item.a : null;
              const practiceKey = `${behavioralSection}-${i}`;
              const isPracticed = practicedQuestions.has(practiceKey);

              return (
                <div key={i} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Collapsed header */}
                  <div
                    onClick={() => setExpandedBehavioral(isExpanded ? null : i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    {/* Green numbered badge */}
                    <span style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: isPracticed ? 'var(--accent)' : 'var(--success)', color: 'var(--bg-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {isPracticed ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (i + 1)}
                    </span>

                    {/* Question text */}
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, lineHeight: 1.6 }}>{question}</span>

                    {/* Practice with AI button */}
                    <Link
                      to={`/lumora?q=${encodeURIComponent(question)}`}
                      className="b75-action-btn"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '8px', border: '1px solid rgba(45,140,255,0.19)', background: 'rgba(45,140,255,0.03)', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Practice with AI
                    </Link>

                    {/* Mark practiced button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePracticed(practiceKey); }}
                      title={isPracticed ? 'Mark as not practiced' : 'Mark as practiced'}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                        border: isPracticed ? '2px solid var(--success)' : '2px solid var(--border)',
                        background: isPracticed ? 'var(--success)' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isPracticed && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>

                    {/* Chevron */}
                    <svg
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}
                      style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && hasStar && (
                    <div style={{ padding: '0 20px 24px 20px', borderTop: '1px solid var(--border)' }}>
                      {/* What Interviewers Look For */}
                      <div style={{ marginTop: '20px', marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                          What Interviewers Look For
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {item.lookFor.map((point: string, li: number) => (
                            <li key={li} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{point}</li>
                          ))}
                        </ul>
                      </div>

                      {/* STAR Example */}
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, color: 'var(--bg-surface)', background: 'var(--accent)',
                            padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.5px',
                          }}>STAR</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Example Answer</span>
                        </div>

                        {/* Situation */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                            }}>S</span>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(45,140,255,0.08)', borderLeft: '3px solid var(--accent)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Situation</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.star.situation}</div>
                          </div>
                        </div>

                        {/* Task */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--warning)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                            }}>T</span>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(217,119,6,0.12)', borderLeft: '3px solid var(--warning)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warning)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.star.task}</div>
                          </div>
                        </div>

                        {/* Action */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                            }}>A</span>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(5,150,105,0.08)', borderLeft: '3px solid var(--success)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</div>
                            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {item.star.action.map((step: string, ai: number) => (
                                <li key={ai} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Result */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--danger)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                            }}>R</span>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(220,38,38,0.12)', borderLeft: '3px solid var(--danger)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Result</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.star.result}</div>
                          </div>
                        </div>
                      </div>

                      {/* Tips for Success */}
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Tips for Success
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {item.tips.map((tip: string, ti: number) => (
                            <div key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{
                                width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px',
                              }}>{ti + 1}</span>
                              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback: old format with just { q, a } */}
                  {isExpanded && !hasStar && answer && (
                    <div style={{ padding: '0 20px 16px 64px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, borderLeft: '3px solid var(--accent)', paddingLeft: '16px' }}>
                        {answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* ───────────── TAB 4: Cheatsheet ───────────── */}
      {activeTab === 'cheatsheet' && (
        <div className="lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Before the Interview */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                padding: '16px 20px',
                background: 'rgba(5,150,105,0.08)',
                borderBottom: '1px solid rgba(5,150,105,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Before the Interview</h3>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, marginLeft: 'auto' }}>
                  {interviewCheatsheet.before.length} items
                </span>
              </div>
              <div>
                {interviewCheatsheet.before.map((item: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      border: '2px solid var(--border)', flexShrink: 0, marginTop: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* During the Interview */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                padding: '16px 20px',
                background: 'rgba(45,140,255,0.08)',
                borderBottom: '1px solid rgba(45,140,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>During the Interview</h3>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, marginLeft: 'auto' }}>
                  {interviewCheatsheet.during.length} items
                </span>
              </div>
              <div>
                {interviewCheatsheet.during.map((item: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      border: '2px solid rgba(45,140,255,0.3)', background: 'rgba(45,140,255,0.08)', flexShrink: 0, marginTop: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* After the Interview */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                padding: '16px 20px',
                background: 'rgba(124,58,237,0.08)',
                borderBottom: '1px solid rgba(124,58,237,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>After the Interview</h3>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500, marginLeft: 'auto' }}>
                  {interviewCheatsheet.after.length} items
                </span>
              </div>
              <div>
                {interviewCheatsheet.after.map((item: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      border: '2px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)', flexShrink: 0, marginTop: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ Scoped Styles ═══════════════════════ */}
      <style>{`
        .b75-pills-scroll::-webkit-scrollbar {
          display: none;
        }

        .b75-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          border-color: var(--border-hover) !important;
        }

        .b75-nav-link:hover {
          color: var(--text-primary) !important;
          background: var(--bg-elevated);
        }

        .b75-action-btn:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }

        .b75-footer-link:hover {
          color: var(--accent) !important;
        }

        button:focus {
          outline: none;
        }
        button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        textarea:focus {
          outline: none;
        }

        @media (max-width: 640px) {
          .b75-card {
            padding: 10px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
