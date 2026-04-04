import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'go'] as const;
type Language = typeof LANGUAGES[number];

const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python', javascript: 'JavaScript', java: 'Java', cpp: 'C++', go: 'Go',
};

const PLACEHOLDER_CODE: Record<Language, string> = {
  python: '# Write your solution here\n\ndef solution():\n    pass\n',
  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n',
  java: '// Write your solution here\n\nclass Solution {\n    public void solve() {\n        \n    }\n}\n',
  cpp: '// Write your solution here\n\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n',
  go: '// Write your solution here\n\npackage main\n\nfunc solution() {\n\t\n}\n',
};

/* ── Problem data (same as Blind75Page) ── */
const PROBLEMS: Record<string, { title: string; difficulty: string; category: string; leetcode: string; description: string }> = {
  '1': { title: 'Two Sum', difficulty: 'Easy', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/two-sum/', description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.' },
  '2': { title: 'Contains Duplicate', difficulty: 'Easy', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/contains-duplicate/', description: 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.' },
  '3': { title: 'Valid Anagram', difficulty: 'Easy', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/valid-anagram/', description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.' },
  '4': { title: 'Group Anagrams', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/group-anagrams/', description: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.' },
  '5': { title: 'Top K Frequent Elements', difficulty: 'Medium', category: 'Arrays & Hashing', leetcode: 'https://leetcode.com/problems/top-k-frequent-elements/', description: 'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.' },
  '9': { title: 'Valid Palindrome', difficulty: 'Easy', category: 'Two Pointers', leetcode: 'https://leetcode.com/problems/valid-palindrome/', description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.' },
  '10': { title: '3Sum', difficulty: 'Medium', category: 'Two Pointers', leetcode: 'https://leetcode.com/problems/3sum/', description: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.' },
  '12': { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', category: 'Sliding Window', leetcode: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.' },
  '25': { title: 'Invert Binary Tree', difficulty: 'Easy', category: 'Trees', leetcode: 'https://leetcode.com/problems/invert-binary-tree/', description: 'Given the root of a binary tree, invert the tree, and return its root.' },
  '42': { title: 'Number of Islands', difficulty: 'Medium', category: 'Graphs', leetcode: 'https://leetcode.com/problems/number-of-islands/', description: 'Given an m x n 2D binary grid grid which represents a map of 1s (land) and 0s (water), return the number of islands.' },
  '49': { title: 'Climbing Stairs', difficulty: 'Easy', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/climbing-stairs/', description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?' },
  '53': { title: 'Coin Change', difficulty: 'Medium', category: 'Dynamic Programming', leetcode: 'https://leetcode.com/problems/coin-change/', description: 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount.' },
};

const DIFF_COLORS: Record<string, string> = { Easy: '#059669', Medium: '#d97706', Hard: '#dc2626' };

export default function Blind75PracticePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'practice' | 'solution'>('practice');
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState(PLACEHOLDER_CODE.python);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [solution, setSolution] = useState('');
  const [isSolving, setIsSolving] = useState(false);

  const problem = id ? PROBLEMS[id] : null;
  const fallbackTitle = id ? `Problem #${id}` : 'Unknown';

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setCode(PLACEHOLDER_CODE[language]); setOutput(''); }, [language]);

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
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getSolution = async () => {
    setIsSolving(true);
    setSolution('Generating solution...');
    setActiveTab('solution');
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/solve/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: problem?.title || fallbackTitle, language }),
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
        setSolution(result);
      }
    } catch (err: any) {
      setSolution(`Error: ${err.message}`);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div style={{ background: '#f7f8f9', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/blind75" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#6b7280', fontSize: 13, fontWeight: 500 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Blind 75
          </Link>
          <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{problem?.title || fallbackTitle}</span>
          {problem && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 6, color: DIFF_COLORS[problem.difficulty], background: `${DIFF_COLORS[problem.difficulty]}12`, border: `1px solid ${DIFF_COLORS[problem.difficulty]}25` }}>
              {problem.difficulty}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Tabs */}
          {['practice', 'solution'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as 'practice' | 'solution')}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === tab ? '#111827' : '#f3f4f6', color: activeTab === tab ? '#fff' : '#6b7280' }}>
              {tab === 'practice' ? 'Practice' : 'Solution'}
            </button>
          ))}
          {problem && (
            <a href={problem.leetcode} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              LeetCode
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
            </a>
          )}
        </div>
      </div>

      {activeTab === 'practice' ? (
        /* ═══════ PRACTICE TAB ═══════ */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 52px)' }}>
          {/* Left: Problem Description */}
          <div style={{ borderRight: '1px solid #e5e7eb', overflow: 'auto', padding: 32, background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              {problem?.category || 'Problem'}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
              {problem?.title || fallbackTitle}
            </h1>
            <p style={{ fontSize: 16, color: '#4b5563', lineHeight: 1.75, margin: '0 0 24px 0' }}>
              {problem?.description || 'Problem description not available. Click "Solution" to get an AI-generated solution, or open the LeetCode link for the full problem statement.'}
            </p>
            <div style={{ padding: 16, borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Hints</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: 14, lineHeight: 1.8 }}>
                <li>Think about the time complexity first</li>
                <li>Consider edge cases: empty input, single element, duplicates</li>
                <li>Can you solve it in O(n) time?</li>
              </ul>
            </div>
            <button onClick={getSolution} disabled={isSolving}
              style={{ marginTop: 24, fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#818cf8', color: '#fff', cursor: isSolving ? 'wait' : 'pointer' }}>
              {isSolving ? 'Generating...' : 'Show AI Solution'}
            </button>
          </div>

          {/* Right: Code Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
            {/* Editor toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #333', background: '#252526' }}>
              <select value={language} onChange={e => setLanguage(e.target.value as Language)}
                style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: '1px solid #444', background: '#1e1e1e', color: '#ccc', outline: 'none' }}>
                {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={runCode} disabled={isRunning}
                  style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: isRunning ? 'wait' : 'pointer' }}>
                  {isRunning ? 'Running...' : '▶ Run'}
                </button>
                <button onClick={getSolution} disabled={isSolving}
                  style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 8, border: 'none', background: '#818cf8', color: '#fff', cursor: isSolving ? 'wait' : 'pointer' }}>
                  {isSolving ? 'Solving...' : 'AI Solve'}
                </button>
              </div>
            </div>
            {/* Code textarea */}
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', padding: 16, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14, lineHeight: 1.6, background: '#1e1e1e', color: '#d4d4d4', tabSize: 2 }}
            />
            {/* Output */}
            <div style={{ borderTop: '1px solid #333', background: '#1a1a1a', padding: 12, maxHeight: 200, overflow: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>OUTPUT</div>
              <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: output.startsWith('Error') ? '#ef4444' : '#10b981', whiteSpace: 'pre-wrap' }}>
                {output || 'Click "Run" to see output'}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════ SOLUTION TAB ═══════ */
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            AI-Generated Solution — {LANGUAGE_LABELS[language]}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 24px 0' }}>
            {problem?.title || fallbackTitle}
          </h2>
          {!solution && !isSolving ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ color: '#9ca3af', fontSize: 16, marginBottom: 20 }}>Click below to generate an AI solution</p>
              <button onClick={getSolution}
                style={{ fontSize: 15, fontWeight: 600, padding: '12px 32px', borderRadius: 12, border: 'none', background: '#818cf8', color: '#fff', cursor: 'pointer' }}>
                Generate Solution
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
              <pre style={{ margin: 0, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {solution}
              </pre>
            </div>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button onClick={() => setActiveTab('practice')}
              style={{ fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>
              ← Back to Practice
            </button>
            <select value={language} onChange={e => { setLanguage(e.target.value as Language); setSolution(''); }}
              style={{ fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151' }}>
              {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
