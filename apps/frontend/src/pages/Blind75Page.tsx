import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { techInterviewTopics } from '../data/capra/topics/techInterviewHandbook';

/* ──────────────────────────────── Constants ──────────────────────────────── */

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const STORAGE_KEY = 'blind75_completed';

const navLinks = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

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

/* ──────────────────────────────── Data ──────────────────────────────── */

const CATEGORIES: Category[] = [
  {
    name: 'Arrays & Hashing',
    color: '#10b981',
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
    color: '#3b82f6',
    problems: [
      { id: 9, title: 'Valid Palindrome', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/valid-palindrome/' },
      { id: 10, title: '3Sum', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/3sum/' },
      { id: 11, title: 'Container With Most Water', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/container-with-most-water/' },
    ],
  },
  {
    name: 'Sliding Window',
    color: '#8b5cf6',
    problems: [
      { id: 12, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', leetcode: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
      { id: 13, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
      { id: 14, title: 'Longest Repeating Character Replacement', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
      { id: 15, title: 'Minimum Window Substring', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/minimum-window-substring/' },
    ],
  },
  {
    name: 'Stack',
    color: '#f59e0b',
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
    color: '#ec4899',
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
    color: '#14b8a6',
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
    color: '#a855f7',
    problems: [
      { id: 36, title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
      { id: 37, title: 'Design Add and Search Words', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
      { id: 38, title: 'Word Search II', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/word-search-ii/' },
    ],
  },
  {
    name: 'Heap / Priority Queue',
    color: '#ef4444',
    problems: [
      { id: 39, title: 'Find Median from Data Stream', difficulty: 'Hard', leetcode: 'https://leetcode.com/problems/find-median-from-data-stream/' },
    ],
  },
  {
    name: 'Backtracking',
    color: '#f97316',
    problems: [
      { id: 40, title: 'Combination Sum', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/combination-sum/' },
      { id: 41, title: 'Word Search', difficulty: 'Medium', leetcode: 'https://leetcode.com/problems/word-search/' },
    ],
  },
  {
    name: 'Graphs',
    color: '#6366f1',
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
    color: '#dc2626',
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

/* ── Category → Tech Interview Handbook topic mapping ── */
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

const LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'go'] as const;
type Language = typeof LANGUAGES[number];

const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
  go: 'Go',
};

const PLACEHOLDER_CODE: Record<Language, string> = {
  python: '# Write your solution here\n\ndef solution():\n    pass\n',
  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n',
  java: '// Write your solution here\n\nclass Solution {\n    public void solve() {\n        \n    }\n}\n',
  cpp: '// Write your solution here\n\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n',
  go: '// Write your solution here\n\npackage main\n\nfunc solution() {\n\t\n}\n',
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  Medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  Hard: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

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
  const { user, isLoading: authLoading, logout } = useAuth();

  const [completed, setCompleted] = useState<Set<number>>(() => loadCompleted());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [openProblemId, setOpenProblemId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedTips, setExpandedTips] = useState<string | null>(null);

  // Code playground state
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSolving, setIsSolving] = useState(false);

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: problemTitle, language }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setOutput(result);
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

  return (
    <div style={{ background: '#f7f8f9', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', 'Work Sans', system-ui, sans-serif" }}>

      {/* ═══════════════════════ Top Navigation ═══════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', height: '56px' }}
      >
        <div className="max-w-[85%] xl:max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="flex items-center justify-center"
              style={{ width: '28px', height: '28px', background: '#10b981', borderRadius: '8px' }}
            >
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>C</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Camora
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="b75-nav-link"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'color 0.15s, background 0.15s',
                  textDecoration: 'none',
                  color: '#4b5563',
                  borderBottom: '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/capra/prepare" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '4px 8px', borderRadius: '8px' }}>
                  {user.image ? (
                    <img src={user.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} referrerPolicy="no-referrer" />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#047857' }}>
                      {user.name?.[0] || '?'}
                    </div>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{user.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button
                  onClick={logout}
                  style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </>
            ) : !authLoading ? (
              <Link to="/login" style={{ fontSize: '14px', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>
                Sign in
              </Link>
            ) : null}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5"
              style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════ Mobile Menu ═══════════════════════ */}
      {mobileMenuOpen && (
        <div
          className="fixed top-14 left-0 right-0 z-40 md:hidden"
          style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', padding: '8px 16px' }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'block', padding: '10px 0', fontSize: '14px', fontWeight: 500, color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f3f4f6' }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* ═══════════════════════ Hero Section ═══════════════════════ */}
      <section style={{ paddingTop: '56px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '64px 0 48px',
          }}
        >
          <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ maxWidth: '640px' }}>
              <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
                Blind 75
              </h1>
              <p style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.6, marginTop: '16px', marginBottom: 0 }}>
                The 75 most important coding interview problems. Master these and you're ready for any FAANG interview.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '4px 12px' }}>
                  75 problems
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '4px 12px' }}>
                  16 categories
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '4px 12px' }}>
                  Track your progress
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>
                    {completedCount} / {TOTAL} completed
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                    {progressPercent}%
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#334155', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ Filter Bar ═══════════════════════ */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e3e8ee', position: 'sticky', top: '56px', zIndex: 30 }}>
        <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ padding: '12px 0' }}>
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
                    border: isActive ? 'none' : '1px solid #e5e7eb',
                    background: isActive ? (cat?.color || '#10b981') : '#ffffff',
                    color: isActive ? '#ffffff' : '#6b7280',
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
                    borderColor: isActive ? (colors?.border || '#d1d5db') : 'transparent',
                    background: isActive ? (colors?.bg || '#f3f4f6') : 'transparent',
                    color: isActive ? (colors?.text || '#374151') : '#9ca3af',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {d}
                </button>
              );
            })}
            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto', alignSelf: 'center' }}>
              Showing {totalFiltered} problem{totalFiltered !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ Problem List ═══════════════════════ */}
      <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {filteredCategories.map((cat) => {
          const progress = getCategoryProgress(CATEGORIES.find((c) => c.name === cat.name) || cat);
          return (
            <div key={cat.name} style={{ marginBottom: '32px' }}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ width: '4px', height: '24px', borderRadius: '2px', background: cat.color }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{cat.name}</h2>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af' }}>
                  {progress.done}/{progress.total} done
                </span>
                {/* Mini progress bar */}
                <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: '#e5e7eb', overflow: 'hidden' }}>
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
                        color: '#6b7280',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 0',
                        transition: 'color 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{'\u{1F4D6}'}</span>
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
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginTop: '6px',
                        fontSize: '12px',
                        lineHeight: 1.6,
                        color: '#4b5563',
                      }}>
                        <div style={{ fontWeight: 600, color: '#374151', marginBottom: '6px', fontSize: '12px' }}>
                          Key Techniques ({tips.title})
                        </div>
                        <ol style={{ margin: '0 0 8px', paddingLeft: '18px' }}>
                          {tips.techniques.slice(0, 6).map((t: string, i: number) => (
                            <li key={i} style={{ marginBottom: '3px' }}>{t}</li>
                          ))}
                        </ol>
                        {tips.cornerCases.length > 0 && (
                          <>
                            <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px', fontSize: '12px' }}>
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
                          background: isComplete ? '#f0fdf4' : '#ffffff',
                          border: `1px solid ${isOpen ? cat.color : isComplete ? '#bbf7d0' : '#e5e7eb'}`,
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
                            border: isComplete ? 'none' : '2px solid #d1d5db',
                            background: isComplete ? '#10b981' : '#ffffff',
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
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', width: '28px', textAlign: 'center', flexShrink: 0 }}>
                          #{problem.id}
                        </span>

                        {/* Title */}
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isComplete ? '#6b7280' : '#111827',
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
                          <button
                            onClick={() => setOpenProblemId(isOpen ? null : problem.id)}
                            className="b75-action-btn"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '5px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              background: isOpen ? cat.color : '#f3f4f6',
                              color: isOpen ? '#ffffff' : '#374151',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isOpen ? 'Close' : 'Solve'}
                          </button>
                          <Link
                            to={`/capra/practice?problem=${encodeURIComponent(problem.title)}`}
                            className="b75-action-btn"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '5px 14px',
                              borderRadius: '8px',
                              border: `1px solid ${cat.color}30`,
                              background: `${cat.color}08`,
                              color: cat.color,
                              cursor: 'pointer',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                            </svg>
                            Practice
                          </Link>
                          <button
                            onClick={() => getAISolution(problem.title)}
                            disabled={isSolving}
                            className="b75-action-btn"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '5px 14px',
                              borderRadius: '8px',
                              border: '1px solid #818cf830',
                              background: '#818cf808',
                              color: '#818cf8',
                              cursor: isSolving ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            {isSolving ? 'Solving...' : 'Solution'}
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
                              border: '1px solid #e5e7eb',
                              background: '#ffffff',
                              color: '#6b7280',
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
                            border: `1px solid ${cat.color}`,
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            background: '#ffffff',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Toolbar */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
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
                                border: '1px solid #e5e7eb',
                                background: '#ffffff',
                                color: '#374151',
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
                                border: 'none',
                                background: isRunning ? '#9ca3af' : '#10b981',
                                color: '#ffffff',
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
                                border: '1px solid #e5e7eb',
                                background: isSolving ? '#f3f4f6' : '#ffffff',
                                color: isSolving ? '#9ca3af' : '#6366f1',
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
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
                                fontSize: '13px',
                                lineHeight: 1.6,
                                background: '#0d1117',
                                color: '#e6edf3',
                                border: 'none',
                                outline: 'none',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                tabSize: 4,
                              }}
                            />
                          </div>

                          {/* Output panel */}
                          {output && (
                            <div style={{ borderTop: '1px solid #e5e7eb' }}>
                              <div style={{ padding: '8px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Output
                                </span>
                              </div>
                              <pre style={{
                                margin: 0,
                                padding: '12px 16px',
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
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
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No problems match your filters.</p>
            <button
              onClick={() => { setCategoryFilter('All'); setDifficultyFilter('All'); }}
              style={{
                marginTop: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#10b981',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════ Footer ═══════════════════════ */}
      <footer
        style={{
          borderTop: '1px solid #e3e8ee',
          padding: '32px 0',
          background: '#ffffff',
        }}
      >
        <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{ width: '22px', height: '22px', background: '#10b981', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>C</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                Camora
              </span>
            </Link>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              {[
                { label: 'Apply', href: '/jobs' },
                { label: 'Prepare', href: '/capra/prepare' },
                { label: 'Practice', href: '/capra/practice' },
                { label: 'Attend', href: '/lumora' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Support', href: 'mailto:support@cariara.com' },
              ].map((link) =>
                link.href.startsWith('mailto:') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="b75-footer-link"
                    style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="b75-footer-link"
                    style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
              &copy; {new Date().getFullYear()} Camora by Cariara
            </p>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════ Scoped Styles ═══════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700&display=swap');

        .b75-pills-scroll::-webkit-scrollbar {
          display: none;
        }

        .b75-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
          border-color: #d1d5db !important;
        }

        .b75-nav-link:hover {
          color: #111827 !important;
          background: #f3f4f6;
        }

        .b75-action-btn:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }

        .b75-footer-link:hover {
          color: #10b981 !important;
        }

        button:focus {
          outline: none;
        }
        button:focus-visible {
          outline: 2px solid #10b981;
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
