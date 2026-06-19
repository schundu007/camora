import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isOwner } from '../../lib/owner';
import { dialogConfirm } from '../../components/shared/Dialog';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Icon } from '../../components/shared/Icons.jsx';
import { DatabricksThumb } from '../../components/shared/DatabricksThumb';
import { getAuthHeaders } from '../../utils/authHeaders.js';
import { SectionCard } from '../../components/capra/ui';
import { SessionTimer } from '../../components/shared/timer/SessionTimer';
import { useWhiteboardState } from '../../hooks/useWhiteboardState';
import Chip from '@/components/shared/ui/Chip';

const ExcalidrawWhiteboard = lazy(() => import('../../components/shared/diagrams/ExcalidrawWhiteboard'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const AskLayout = lazy(() => import('../../components/lumora/ask/AskLayout').then(m => ({ default: m.AskLayout })));


const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

/* ══════════════════════════════ Challenge Data ══════════════════════════════ */

const CHALLENGES = {
  coding: [
    { q: 'Two Sum', desc: 'Given an array of integers and a target, return indices of two numbers that add up to the target.', difficulty: 'easy', companies: ['google','amazon','meta'], topics: ['arrays','hash-map'] },
    { q: 'Valid Parentheses', desc: 'Given a string containing just (){}[], determine if the input string is valid.', difficulty: 'easy', companies: ['amazon','microsoft'], topics: ['stack','strings'] },
    { q: 'Merge Two Sorted Lists', desc: 'Merge two sorted linked lists into one sorted list.', difficulty: 'easy', companies: ['amazon','apple'], topics: ['linked-list','recursion'] },
    { q: 'Best Time to Buy and Sell Stock', desc: 'Find the maximum profit from buying and selling a stock once.', difficulty: 'easy', companies: ['amazon','meta','google'], topics: ['arrays','dynamic-programming'] },
    { q: 'Climbing Stairs', desc: 'You are climbing a staircase. It takes n steps. Each time you can climb 1 or 2 steps. How many distinct ways can you climb?', difficulty: 'easy', companies: ['apple','google'], topics: ['dynamic-programming'] },
    { q: 'Maximum Subarray', desc: 'Find the contiguous subarray with the largest sum.', difficulty: 'easy', companies: ['microsoft','amazon'], topics: ['arrays','dynamic-programming'] },
    { q: 'Reverse Linked List', desc: 'Reverse a singly linked list iteratively and recursively.', difficulty: 'easy', companies: ['google','apple','meta'], topics: ['linked-list'] },
    { q: 'LRU Cache', desc: 'Design a data structure that follows the Least Recently Used (LRU) cache eviction policy.', difficulty: 'medium', companies: ['amazon','google','meta','microsoft'], topics: ['hash-map','linked-list','design'] },
    { q: 'Merge Intervals', desc: 'Given an array of intervals, merge all overlapping intervals.', difficulty: 'medium', companies: ['google','meta','amazon'], topics: ['arrays','sorting'] },
    { q: 'Group Anagrams', desc: 'Group strings that are anagrams of each other.', difficulty: 'medium', companies: ['amazon','meta'], topics: ['hash-map','strings','sorting'] },
    { q: 'Binary Tree Level Order Traversal', desc: 'Return the level order traversal of a binary tree\'s nodes.', difficulty: 'medium', companies: ['amazon','microsoft'], topics: ['trees','bfs'] },
    { q: 'Word Search', desc: 'Given an m x n board and a word, find if the word exists in the grid.', difficulty: 'medium', companies: ['amazon','microsoft'], topics: ['backtracking','matrix'] },
    { q: 'Number of Islands', desc: 'Given a 2D grid map of 1s and 0s, count the number of islands.', difficulty: 'medium', companies: ['amazon','google','meta'], topics: ['bfs','dfs','matrix'] },
    { q: '3Sum', desc: 'Find all unique triplets in the array which give the sum of zero.', difficulty: 'medium', companies: ['meta','google','amazon'], topics: ['arrays','two-pointers','sorting'] },
    { q: 'Longest Substring Without Repeating Characters', desc: 'Find the length of the longest substring without repeating characters.', difficulty: 'medium', companies: ['amazon','google','netflix'], topics: ['strings','sliding-window','hash-map'] },
    { q: 'Course Schedule', desc: 'Determine if you can finish all courses given prerequisite pairs.', difficulty: 'medium', companies: ['amazon','google'], topics: ['graphs','topological-sort'] },
    { q: 'Product of Array Except Self', desc: 'Return an array where each element is the product of all elements except itself, without division.', difficulty: 'medium', companies: ['amazon','meta','apple'], topics: ['arrays'] },
    { q: 'Trapping Rain Water', desc: 'Given n non-negative integers representing an elevation map, compute how much water it can trap.', difficulty: 'hard', companies: ['google','amazon','meta'], topics: ['arrays','two-pointers','stack'] },
    { q: 'Median of Two Sorted Arrays', desc: 'Find the median of two sorted arrays in O(log(m+n)) time.', difficulty: 'hard', companies: ['google','amazon','apple'], topics: ['binary-search','arrays'] },
    { q: 'Serialize and Deserialize Binary Tree', desc: 'Design an algorithm to serialize and deserialize a binary tree.', difficulty: 'hard', companies: ['meta','google','microsoft'], topics: ['trees','design','bfs'] },
  ],
  'system-design': [
    { q: 'Design a URL Shortener', desc: 'Design a service like bit.ly that shortens URLs and redirects.', difficulty: 'easy', companies: ['google','meta'], topics: ['hashing','database'] },
    { q: 'Design a Rate Limiter', desc: 'Design a distributed rate limiting system for an API.', difficulty: 'medium', companies: ['google','amazon'], topics: ['distributed-systems','caching'] },
    { q: 'Design a Chat Application', desc: 'Design a real-time messaging system like WhatsApp or Slack.', difficulty: 'medium', companies: ['meta','microsoft'], topics: ['websockets','messaging'] },
    { q: 'Design a Notification System', desc: 'Design a multi-channel notification service (push, email, SMS).', difficulty: 'medium', companies: ['amazon','apple'], topics: ['pub-sub','queues'] },
    { q: 'Design an API Gateway', desc: 'Design a centralized API gateway with routing, auth, and rate limiting.', difficulty: 'medium', companies: ['amazon','netflix'], topics: ['networking','load-balancing'] },
    { q: 'Design a File Storage Service', desc: 'Design a cloud file storage system like Google Drive or Dropbox.', difficulty: 'medium', companies: ['google','microsoft'], topics: ['storage','sync'] },
    { q: 'Design Twitter/X', desc: 'Design a social media feed with follow, post, and timeline features.', difficulty: 'hard', companies: ['meta','google'], topics: ['fan-out','caching','feeds'] },
    { q: 'Design YouTube', desc: 'Design a video streaming platform with upload, transcode, and playback.', difficulty: 'hard', companies: ['google','netflix'], topics: ['cdn','transcoding','storage'] },
    { q: 'Design a Distributed Cache', desc: 'Design a high-throughput caching layer like Redis or Memcached.', difficulty: 'hard', companies: ['amazon','meta'], topics: ['caching','distributed-systems'] },
    { q: 'Design a Payment Gateway', desc: 'Design a reliable payment processing system with idempotency.', difficulty: 'hard', companies: ['amazon','apple'], topics: ['transactions','reliability'] },
    { q: 'Design a Search Engine', desc: 'Design a web-scale search engine with indexing, ranking, and autocomplete.', difficulty: 'hard', companies: ['google','microsoft'], topics: ['indexing','ranking'] },
    { q: 'Design a Ride-Sharing Service', desc: 'Design a system like Uber with real-time matching, routing, and pricing.', difficulty: 'hard', companies: ['amazon','google'], topics: ['geospatial','matching','real-time'] },
  ],
  behavioral: [
    { q: 'Tell me about yourself', desc: 'Craft a compelling 2-minute personal narrative for an engineering role.', difficulty: 'easy', companies: ['google','meta','amazon','apple','microsoft','netflix'], topics: ['intro'] },
    { q: 'Why this company?', desc: 'Explain your motivation for applying and what excites you about the role.', difficulty: 'easy', companies: ['google','meta','amazon','apple','microsoft','netflix'], topics: ['motivation'] },
    { q: 'Describe a technical challenge', desc: 'Walk through a difficult engineering problem you solved.', difficulty: 'medium', companies: ['google','amazon','meta'], topics: ['problem-solving'] },
    { q: 'Conflict with a teammate', desc: 'Describe a time you had a disagreement with a colleague and how you resolved it.', difficulty: 'medium', companies: ['amazon','meta','google'], topics: ['teamwork','conflict-resolution'] },
    { q: 'Failed project', desc: 'Tell me about a project that didn\'t go as planned and what you learned.', difficulty: 'medium', companies: ['amazon','google','meta'], topics: ['growth','failure'] },
    { q: 'Leadership example', desc: 'Describe a time you led a team or initiative without formal authority.', difficulty: 'medium', companies: ['amazon','apple','google'], topics: ['leadership'] },
    { q: 'Describe a time you influenced without authority', desc: 'How did you drive alignment across teams or stakeholders?', difficulty: 'medium', companies: ['google','meta','microsoft'], topics: ['influence','communication'] },
    { q: 'Tell me about a time you mentored someone', desc: 'How did you help a peer or junior grow technically or professionally?', difficulty: 'medium', companies: ['google','meta','amazon'], topics: ['mentoring','leadership'] },
    { q: 'Handling ambiguity', desc: 'Tell me about a time you had to make a decision with incomplete information.', difficulty: 'hard', companies: ['amazon','google','meta','apple'], topics: ['decision-making'] },
    { q: 'Production incident', desc: 'Walk through a critical production incident and how you handled it.', difficulty: 'hard', companies: ['amazon','netflix','google'], topics: ['incident-response','pressure'] },
    { q: 'Prioritization under pressure', desc: 'Describe how you prioritize when everything is urgent.', difficulty: 'hard', companies: ['amazon','meta','google'], topics: ['prioritization','time-management'] },
    { q: 'Biggest impact project', desc: 'Describe the project you\'re most proud of and quantify its business impact.', difficulty: 'hard', companies: ['google','meta','amazon','apple','microsoft'], topics: ['impact','storytelling'] },
  ],
};

const MODES = [
  { id: 'quickfire', label: 'Quick Fire',     time: 300,  questions: 5, icon: 'zap',    hexColor: 'gold',    desc: '5 rapid questions in 5 minutes. Build speed and intuition.' },
  { id: 'deepdive',  label: 'Deep Dive',      time: 900,  questions: 3, icon: 'target', hexColor: 'navy',    desc: '3 in-depth questions over 15 minutes. Focus on quality.' },
  { id: 'mock',      label: 'Mock Interview', time: 2700, questions: 8, icon: 'timer',  hexColor: 'navy-dk', desc: '8 questions in 45 minutes. Simulate the real experience.' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const CATEGORIES = ['coding', 'system-design', 'behavioral'];
const COMPANIES = [
  { id: 'all', label: 'All', color: 'var(--text-muted)' },
  { id: 'google', label: 'Google', color: '#4285f4', logo: '/logos/google.png' },
  { id: 'meta', label: 'Meta', color: '#0668E1', logo: '/logos/meta.png' },
  { id: 'amazon', label: 'Amazon', color: '#FF9900', logo: '/logos/amazon.png' },
  { id: 'apple', label: 'Apple', color: '#555', logo: '/logos/apple.png' },
  { id: 'microsoft', label: 'Microsoft', color: '#00A4EF', logo: '/logos/microsoft.png' },
  { id: 'netflix', label: 'Netflix', color: '#E50914', logo: '/logos/netflix.png' },
];

const DIMENSION_LABELS = ['Solving', 'Design', 'DSA', 'Comms', 'Time'];
const DIMENSION_KEYS = ['problemSolving', 'systemDesign', 'dataStructures', 'communication', 'timeManagement'];


/* ══════════════════════════════ Markdown renderer ══════════════════════════════ */

function renderMd(text) {
  if (!text) return null;
  const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => {
    let r = escHtml(s);
    r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    r = r.replace(/`([^`]+)`/g, '<code style="padding:1px 5px;background:var(--bg-elevated);border-radius:4px;font-family:monospace;font-size:12px;color:var(--text-primary)">$1</code>');
    return r;
  };
  const blocks = [];
  const codeRe = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) blocks.push({ type: 'text', content: text.slice(last, m.index) });
    blocks.push({ type: 'code', lang: m[1] || 'code', content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) blocks.push({ type: 'text', content: text.slice(last) });

  return blocks.map((block, bi) => {
    if (block.type === 'code') {
      return (
        <div key={bi} style={{ margin: '10px 0', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div style={{ padding: '4px 12px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{block.lang}</span>
          </div>
          <pre style={{ margin: 0, padding: '12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', overflowX: 'auto', lineHeight: 1.6 }}>
            <code>{block.content}</code>
          </pre>
        </div>
      );
    }
    return block.content.split('\n').map((line, li) => {
      if (!line.trim()) return <br key={`${bi}-${li}`} />;
      if (line.startsWith('## ')) return <p key={`${bi}-${li}`} style={{ fontWeight: 700, fontSize: 13, margin: '8px 0 2px', color: 'inherit' }}>{line.slice(3)}</p>;
      if (line.startsWith('### ') || /^\*{1,4}[^*].+[^*]\*{1,4}:?\s*$/.test(line.trim())) {
        const label = line.startsWith('### ') ? line.slice(4) : line.trim().replace(/^\*+(.+?)\*+:?\s*$/, '$1');
        return <p key={`${bi}-${li}`} style={{ fontWeight: 600, fontSize: 12, margin: '6px 0 1px', color: 'inherit' }}>{label}</p>;
      }
      if (/^[-*•]\s/.test(line)) return <p key={`${bi}-${li}`} style={{ margin: '1px 0', display: 'flex', gap: 6, alignItems: 'flex-start' }}><span style={{ flexShrink: 0, marginTop: 2, opacity: 0.5 }}>·</span><span dangerouslySetInnerHTML={{ __html: inline(line.replace(/^[-*•]\s/, '')) }} /></p>;
      return <p key={`${bi}-${li}`} style={{ margin: '2px 0', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: inline(line) }} />;
    });
  });
}

/* ══════════════════════════════ Helpers ══════════════════════════════ */

function getStats() {
  try {
    const raw = localStorage.getItem('camora_challenge_stats');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    totalCompleted: 0,
    streak: 0,
    bestScore: 0,
    lastChallengeDate: null,
    dimensions: { problemSolving: 0, systemDesign: 0, dataStructures: 0, communication: 0, timeManagement: 0 },
    categories: {
      coding: { scores: [], completed: 0, avgTime: 0 },
      'system-design': { scores: [], completed: 0, avgTime: 0 },
      behavioral: { scores: [], completed: 0, avgTime: 0 },
    },
    history: [],
  };
}

function saveStats(stats) {
  localStorage.setItem('camora_challenge_stats', JSON.stringify(stats));
}

function getCategoryScore(stats, cat) {
  const scores = stats.categories[cat]?.scores || [];
  if (scores.length === 0) return 0;
  const recent = scores.slice(-5);
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

function getReadiness(stats) {
  const c = getCategoryScore(stats, 'coding');
  const s = getCategoryScore(stats, 'system-design');
  const b = getCategoryScore(stats, 'behavioral');
  return Math.round(c * 0.4 + s * 0.3 + b * 0.3);
}

function pickQuestions(category, difficulty, count, company) {
  let pool = CHALLENGES[category] || [];
  if (company && company !== 'all') pool = pool.filter(q => q.companies?.includes(company));
  if (difficulty !== 'all') pool = pool.filter(q => q.difficulty === difficulty);
  if (pool.length === 0) pool = CHALLENGES[category] || [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getDailyChallenge() {
  const allProblems = [...CHALLENGES.coding, ...CHALLENGES['system-design'], ...CHALLENGES.behavioral];
  if (allProblems.length === 0) return null;
  // Daily — deterministic per UTC day so the card actually says the
  // same thing all day, instead of changing on every keystroke.
  const dayIdx = Math.floor(Date.now() / 86_400_000);
  // Mulberry32-style hash so consecutive days don't pick adjacent
  // entries; keeps the rotation feeling random without an RNG.
  let h = dayIdx ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return allProblems[(h >>> 0) % allProblems.length];
}

function getDailyCategory(challenge) {
  if (CHALLENGES.coding.includes(challenge)) return 'coding';
  if (CHALLENGES['system-design'].includes(challenge)) return 'system-design';
  return 'behavioral';
}

function scoreColor(s) {
  if (s >= 70) return 'var(--accent)';
  if (s >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

function scoreBg(s) {
  if (s >= 70) return 'var(--accent-subtle)';
  if (s >= 40) return 'var(--bg-elevated)';
  return 'var(--bg-elevated)';
}

function diffColor(d) {
  if (d === 'easy') return { bg: 'var(--accent-subtle)', text: 'var(--accent)' };
  if (d === 'medium') return { bg: 'var(--bg-elevated)', text: 'var(--warning-text)' };
  return { bg: 'var(--bg-elevated)', text: 'var(--danger)' };
}

function catLabel(cat) {
  if (cat === 'system-design') return 'System Design';
  if (cat === 'coding') return 'Coding';
  return 'Behavioral';
}

function catIcon(cat) {
  if (cat === 'coding') return 'code';
  if (cat === 'system-design') return 'systemDesign';
  return 'behavioral';
}

/* ══════════════════════════════ Radar Chart ══════════════════════════════ */

function RadarChart({ values, labels, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = values.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  function point(i, scale) {
    const angle = startAngle + i * angleStep;
    return [cx + r * scale * Math.cos(angle), cy + r * scale * Math.sin(angle)];
  }

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const dataPoints = values.map((v, i) => point(i, Math.min(v, 100) / 100));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ') + ' Z';
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => point(i, level));
        const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="var(--border)" strokeWidth={1} />;
      })}
      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      {/* Data shape */}
      <path d={dataPath} fill="var(--accent-subtle)" stroke="var(--accent)" strokeWidth={2} />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="var(--accent)" stroke="var(--bg-surface)" strokeWidth={2} />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--text-muted)', fontFamily: "var(--font-sans)" }}>
            {label}
          </text>
        );
      })}
      {/* Center score */}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 800, fill: 'var(--text-primary)', fontFamily: "var(--font-sans)" }}>
        {avg}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 500, fill: 'var(--text-muted)', fontFamily: "var(--font-sans)" }}>
        readiness
      </text>
    </svg>
  );
}

/* ══════════════════════════════ Score Ring ══════════════════════════════ */

function ScoreRing({ value, size = 140, strokeW = 10, animated = false }) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  const color = scoreColor(value);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeW} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={animated ? offset : offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize={size * 0.22} fontWeight={800} style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: "var(--font-sans)" }}>
        {value}%
      </text>
    </svg>
  );
}

/* ══════════════════════════════ Sparkline ══════════════════════════════ */

function Sparkline({ data, width = 100, height = 28, color = 'var(--accent)' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={parseFloat(pts[pts.length - 1].split(',')[0])} cy={parseFloat(pts[pts.length - 1].split(',')[1])} r={2.5} fill={color} />
    </svg>
  );
}

/* ══════════════════════════════ Score Bars ══════════════════════════════ */

function DimensionBars({ dimensions, compact = false }) {
  const labels = { approach: 'Approach', complexity: 'Complexity', completeness: 'Completeness', communication: 'Communication' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
      {Object.entries(dimensions).map(([key, val]) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>
            <span>{labels[key] || key}</span>
            <span style={{ color: scoreColor(val) }}>{val}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: scoreColor(val), width: `${val}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════ Component ══════════════════════════════ */

export default function PracticePage() {
  useEffect(() => {
    document.title = 'Practice | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  // Top-level tab: practice | code-solver | design-solver | sql-editor — persist in URL.
  // SQL problems are auto-routed to sql-editor: the backend code runner doesn't
  // support SQL, but SQLPlayground runs queries in-browser via sql.js.
  const detectSqlFromStorage = () => {
    try {
      const raw = localStorage.getItem('chundu_current_solution');
      if (raw) {
        const sol = JSON.parse(raw);
        if (typeof sol?.language === 'string' && /^sql$|^mysql$|^postgres/i.test(sol.language)) return true;
      }
      const code = JSON.parse(localStorage.getItem('chundu_current_solution') || '{}')?.code || '';
      const problem = localStorage.getItem('chundu_current_problem') || localStorage.getItem('chundu_loaded_problem') || '';
      if (/^\s*(--|SELECT |INSERT |UPDATE |DELETE |CREATE |WITH |ALTER )/im.test(code)) return true;
      if (/\b(SQL|query|table|JOIN|GROUP BY|ORDER BY)\b/i.test(problem) && /SELECT|INSERT|UPDATE|DELETE|FROM/i.test(problem)) return true;
    } catch { /* ignore parse errors */ }
    return false;
  };
  const urlView = new URLSearchParams(window.location.search).get('view');
  const initialView = urlView || 'practice';
  const [activeView, setActiveViewState] = useState(initialView);
  const setActiveView = (view) => {
    // If the user picks Code Solver but the loaded problem is SQL, route to SQL Editor.
    const targetView = (view === 'code-solver' && detectSqlFromStorage()) ? 'sql-editor' : view;
    setActiveViewState(targetView);
    const url = new URL(window.location);
    if (targetView === 'practice') url.searchParams.delete('view');
    else url.searchParams.set('view', targetView);
    window.history.replaceState({}, '', url);
  };

  // Stats
  const { user, subscription } = useAuth();
  const [stats, setStats] = useState(getStats);
  const [askSonaCredits, setAskSonaCredits] = useState(null);

  useEffect(() => {
    if (activeView !== 'ask-sona') return;
    if (isOwner(user) || (subscription?.plan && subscription.plan !== 'free')) return;
    if (!user) return;
    setAskSonaCredits(null);
    fetch(`${API_URL}/api/credits`, { headers: { ...getAuthHeaders() } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setAskSonaCredits(typeof data.balance === 'number' ? data.balance : 0))
      .catch(() => setAskSonaCredits(0));
  }, [activeView, user?.email, subscription?.plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Challenge setup
  const [mode, setMode] = useState('quickfire');
  const [category, setCategory] = useState('coding');
  const [difficulty, setDifficulty] = useState('medium');
  const [company, setCompany] = useState('all');

  // Active challenge
  const [phase, setPhase] = useState('setup'); // setup | active | results
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [scores, setScores] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState([]);
  const [aiDimensions, setAiDimensions] = useState([]);
  const [aiModelAnswers, setAiModelAnswers] = useState([]);
  const [showModelAnswer, setShowModelAnswer] = useState(null);
  const [inlineEval, setInlineEval] = useState(null); // current question's eval before moving on
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [resultDimensions, setResultDimensions] = useState(null);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const challengeStartRef = useRef(0);
  const endChallengeRef = useRef(null);

  // Whiteboard state for system design practice
  const whiteboardState = useWhiteboardState(questions.length || 10);
  const [sdGenerating, setSdGenerating] = useState(false);
  const [sdTab, setSdTab] = useState('draw'); // 'draw' | 'reference'
  const [sdRefDiagram, setSdRefDiagram] = useState({}); // { [idx]: { status: 'idle'|'loading'|'cached'|'missing', url } }

  // Timer countdown is now handled by the shared SessionTimer component.
  // The onExpire callback on SessionTimer calls endChallengeRef.current().

  useEffect(() => { window.scrollTo(0, 0); }, []);
  // Reset to draw mode when user navigates to a new question
  useEffect(() => { setSdTab('draw'); }, [currentIdx]);

  const startChallenge = useCallback((overrideCategory, overrideDifficulty, forceQuestions) => {
    const cat = overrideCategory ?? category;
    const diff = overrideDifficulty ?? difficulty;
    const modeConfig = MODES.find(m => m.id === mode);
    const qs = forceQuestions || pickQuestions(cat, diff, modeConfig.questions, company);
    if (qs.length === 0) return;
    if (overrideCategory) setCategory(overrideCategory);
    if (overrideDifficulty) setDifficulty(overrideDifficulty);
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers(new Array(qs.length).fill(''));
    setScores([]);
    setAiFeedback([]);
    setAiDimensions([]);
    setAiModelAnswers([]);
    setShowModelAnswer(null);
    setInlineEval(null);
    setTimeLeft(modeConfig.time);
    setQuestionStartTime(Date.now());
    challengeStartRef.current = Date.now();
    whiteboardState.clearAll();
    setPhase('active');
    window.scrollTo(0, 0);
  }, [mode, category, difficulty, company, whiteboardState]);

  const submitAnswer = useCallback(async () => {
    const q = questions[currentIdx];
    const answer = answers[currentIdx];

    let score = 0;
    let feedback = '';
    let dimensions = { approach: 0, complexity: 0, completeness: 0, communication: 0 };
    let modelAnswer = '';
    let improvementTips = [];

    setEvaluating(true);

    try {
      const evalPrompt = category === 'behavioral'
        ? `Behavioral Interview Question: ${q.q} — ${q.desc}\n\nCandidate's answer:\n${answer}\n\nEvaluate this behavioral interview answer on a scale of 0-100. Consider: STAR structure (30%), specificity and detail (25%), impact/results (25%), communication clarity (20%).\n\nReturn ONLY a JSON object:\n{"score": number, "dimensions": {"approach": number, "complexity": number, "completeness": number, "communication": number}, "feedback": "2-3 sentences of feedback", "modelAnswer": "A model STAR response in 3-4 sentences", "improvementTips": ["tip1", "tip2"]}`
        : category === 'coding'
        ? `Coding Problem: ${q.q} — ${q.desc}\n\nCandidate's answer:\n${answer}\n\nEvaluate this coding answer on a scale of 0-100. Consider: correct approach (30%), time/space complexity awareness (25%), code completeness (25%), edge cases and communication (20%).\n\nReturn ONLY a JSON object:\n{"score": number, "dimensions": {"approach": number, "complexity": number, "completeness": number, "communication": number}, "feedback": "2-3 sentences of feedback", "modelAnswer": "The optimal solution approach in 3-4 sentences with pseudocode", "improvementTips": ["tip1", "tip2"]}`
        : `System Design Problem: ${q.q} — ${q.desc}\n\nCandidate's answer:\n${answer}\n\nEvaluate this system design answer on a scale of 0-100. Consider: key components identified (30%), scalability addressed (25%), trade-offs discussed (25%), clarity (20%).\n\nReturn ONLY a JSON object:\n{"score": number, "dimensions": {"approach": number, "complexity": number, "completeness": number, "communication": number}, "feedback": "2-3 sentences of feedback", "modelAnswer": "A model system design answer in 3-4 sentences", "improvementTips": ["tip1", "tip2"]}`;

      const resp = await fetch(API_URL + '/api/solve/stream', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ problem: evalPrompt, provider: 'claude', language: 'auto', detailLevel: 'basic', ascendMode: 'coding' }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', result = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.done && d.result) result = d.result;
            } catch { /* ignore parse errors */ }
          }
        }
      }

      if (result) {
        const text = result.code || result.pitch || '';
        const jsonMatch = text.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            score = Math.min(100, Math.max(0, parsed.score || 0));
            feedback = parsed.feedback || '';
            if (parsed.dimensions) dimensions = parsed.dimensions;
            modelAnswer = parsed.modelAnswer || '';
            if (parsed.improvementTips) improvementTips = parsed.improvementTips;
          } catch { /* ignore */ }
        }
      }
      if (!score && answer.trim().length > 20) {
        score = 30;
        feedback = 'Could not evaluate automatically. Partial credit given.';
        dimensions = { approach: 30, complexity: 20, completeness: 30, communication: 30 };
      }
    } catch {
      score = answer.trim().length > 20 ? 30 : 0;
      feedback = 'Evaluation unavailable. Partial credit given for attempt.';
      dimensions = { approach: 20, complexity: 15, completeness: 20, communication: 20 };
    }

    setEvaluating(false);
    setScores(prev => [...prev, score]);
    setAiFeedback(prev => [...prev, feedback]);
    setAiDimensions(prev => [...prev, dimensions]);
    setAiModelAnswers(prev => [...prev, { modelAnswer, improvementTips }]);

    // Show inline eval before moving on
    setInlineEval({ score, feedback, dimensions, modelAnswer, improvementTips });
  }, [currentIdx, questions, answers, category]);

  const moveToNext = useCallback(() => {
    setInlineEval(null);
    setShowModelAnswer(null);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setQuestionStartTime(Date.now());
      if (textareaRef.current) textareaRef.current.focus();
    } else {
      // Read the latest scores via the functional setter — the closure'd
      // `scores` is stale on the last question because submitAnswer's
      // setScores hasn't flushed when moveToNext fires immediately
      // after, and we'd save the final score as 0 in history.
      setScores((latest) => {
        endChallenge([...latest]);
        return latest;
      });
    }
  }, [currentIdx, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipQuestion = useCallback(() => {
    setScores(prev => [...prev, 0]);
    setAiFeedback(prev => [...prev, 'Skipped']);
    setAiDimensions(prev => [...prev, { approach: 0, complexity: 0, completeness: 0, communication: 0 }]);
    setAiModelAnswers(prev => [...prev, { modelAnswer: '', improvementTips: [] }]);
    setInlineEval(null);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setQuestionStartTime(Date.now());
    } else {
      endChallenge([...scores, 0]);
    }
  }, [currentIdx, questions, scores]); // eslint-disable-line react-hooks/exhaustive-deps

  const endChallenge = useCallback((finalScores) => {
    clearInterval(timerRef.current);
    const s = finalScores || scores;
    const modeConfig = MODES.find(m => m.id === mode);
    const totalTime = Math.round((Date.now() - challengeStartRef.current) / 1000);
    const avgScore = s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;

    // Compute per-session radar dimensions from AI dimensions
    const allDims = [...aiDimensions];
    let computedDimensions = null;
    if (allDims.length > 0) {
      const avg = (key) => Math.round(allDims.reduce((a, d) => a + (d[key] || 0), 0) / allDims.length);
      computedDimensions = {
        problemSolving: avg('approach'),
        systemDesign: avg('complexity'),
        dataStructures: avg('completeness'),
        communication: avg('communication'),
        timeManagement: Math.min(100, Math.round((modeConfig.time > 0 ? (1 - totalTime / modeConfig.time) : 0.5) * 100 + 50)),
      };
      setResultDimensions(computedDimensions);
    }

    // Update stats
    const newStats = JSON.parse(JSON.stringify(stats));
    newStats.totalCompleted = (newStats.totalCompleted || 0) + 1;

    // Streak
    const today = new Date().toISOString().split('T')[0];
    const lastDate = newStats.lastChallengeDate;
    if (lastDate) {
      const diff = Math.round((new Date(today) - new Date(lastDate)) / 86400000);
      if (diff === 0) { /* same day — keep streak unchanged */ }
      else if (diff === 1) { newStats.streak = (newStats.streak || 0) + 1; }
      else { newStats.streak = 1; }
    } else {
      newStats.streak = 1;
    }
    newStats.lastChallengeDate = today;
    newStats.bestScore = Math.max(newStats.bestScore || 0, avgScore);

    // Update dimensions
    if (!newStats.dimensions) newStats.dimensions = {};
    const dimMap = { coding: ['problemSolving', 'dataStructures'], 'system-design': ['systemDesign', 'communication'], behavioral: ['communication', 'timeManagement'] };
    const keysToUpdate = dimMap[category] || [];
    for (const key of keysToUpdate) {
      const old = newStats.dimensions[key] || 0;
      newStats.dimensions[key] = Math.round((old * 0.6) + (avgScore * 0.4));
    }

    // Category scores
    if (!newStats.categories) newStats.categories = {};
    if (!newStats.categories[category]) newStats.categories[category] = { scores: [], completed: 0, avgTime: 0 };
    newStats.categories[category].scores.push(avgScore);
    if (newStats.categories[category].scores.length > 20) newStats.categories[category].scores = newStats.categories[category].scores.slice(-20);
    newStats.categories[category].completed = (newStats.categories[category].completed || 0) + 1;
    newStats.categories[category].avgTime = totalTime;

    // History
    if (!newStats.history) newStats.history = [];
    newStats.history.unshift({
      date: today,
      category,
      mode,
      difficulty,
      company,
      score: avgScore,
      timeSpent: totalTime,
      questionCount: questions.length,
      dimensions: computedDimensions || newStats.dimensions,
      questions: questions.map((q, i) => ({ q: q.q, score: s[i] || 0, feedback: aiFeedback[i] || '' })),
    });
    if (newStats.history.length > 50) newStats.history = newStats.history.slice(0, 50);

    saveStats(newStats);
    setStats(newStats);
    setPhase('results');
    window.scrollTo(0, 0);
  }, [scores, mode, stats, category, difficulty, company, questions, aiDimensions, aiFeedback, resultDimensions]);

  // Keep ref in sync so timer always calls the latest version
  useEffect(() => { endChallengeRef.current = endChallenge; });

  // Daily challenge — stable across re-renders (computed once per mount)
  const [dailyChallenge] = useState(() => getDailyChallenge());
  const dailyCategory = getDailyCategory(dailyChallenge);

  const readiness = getReadiness(stats);
  const modeConfig = MODES.find(m => m.id === mode);

  // Social proof (simulated)
  const socialCount = 1247 + Math.floor((new Date().getHours() * 37 + new Date().getMinutes()) % 300);

  const dimValues = DIMENSION_KEYS.map(k => stats.dimensions?.[k] || 0);

  // Score trend for sparkline
  const scoreTrend = (stats.history || []).slice(0, 10).map(h => h.score).reverse();

  // Results stats
  const finalAvgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="practice-root" style={{ background: 'transparent', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ═══════════ Main Content ═══════════ */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── View Tabs — LeetCode navy + gold underline ── */}
        <div className="flex items-center gap-4 px-4 sm:px-6 py-2 flex-shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--cam-strip-heading)', margin: 0, letterSpacing: '-0.01em' }}>Practice</h1>
          <div style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid var(--cam-strip-icon-border)', borderRadius: 8, background: 'rgba(3,19,46,0.88)' }}>
            {[
              { key: 'practice', label: 'Mock Interview', icon: <Icon name="play" size={12} /> },
              { key: 'code-solver', label: 'Code Solver', icon: <Icon name="code" size={12} /> },
              { key: 'design-solver', label: 'Design Solver', icon: <Icon name="systemDesign" size={12} /> },
              { key: 'ask-sona', label: 'Ask Sona', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: activeView === tab.key ? 'var(--cam-gold-leaf)' : 'transparent',
                  color: activeView === tab.key ? '#020617' : 'rgba(255,255,255,0.75)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {/* Reset button — clears problem + solution from localStorage */}
          {/* Playground shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', paddingLeft: 12 }}>
            <Link
              to="/playground?tab=code"
              className="chip"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              Code Playground
            </Link>
            <Link
              to="/playground?tab=sql"
              className="chip"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              SQL Editor
            </Link>
          </div>
          {(activeView === 'code-solver' || activeView === 'design-solver') && (
            <button
              onClick={() => {
                ['chundu_current_problem', 'chundu_loaded_problem', 'chundu_current_solution', 'chundu_eraser_diagram'].forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              title="Clear problem and solution"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              Reset
            </button>
          )}
        </div>

        {/* ── Code Solver View — fills remaining height ── */}
        {activeView === 'code-solver' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
              <DashboardPage mode="coding" embedded />
            </Suspense>
          </div>
        )}

        {/* ── Design Solver View — fills remaining height ── */}
        {activeView === 'design-solver' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
              <DashboardPage mode="system-design" embedded />
            </Suspense>
          </div>
        )}

        {/* ── Ask Sona View (paywalled) ── */}
        {activeView === 'ask-sona' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            {(isOwner(user) || (subscription?.plan && subscription.plan !== 'free') || (askSonaCredits !== null && askSonaCredits > 0)) ? (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
                <AskLayout />
              </Suspense>
            ) : askSonaCredits === null && !isOwner(user) && subscription?.plan === 'free' ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center px-6 py-16" style={{ background: 'var(--bg-surface)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.25)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cam-gold-leaf-lt)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ask Sona</h2>
                <p className="text-sm mb-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
                  Get instant AI answers to any interview question. AI hours are consumed per conversation.
                </p>
                <p className="text-xs mb-6" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
                  You have {askSonaCredits !== null ? askSonaCredits.toFixed(1) : '0'} AI hours remaining
                </p>
                <a
                  href="/pricing#ai-hours"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--cam-gold-leaf)', color: '#020617' }}
                >
                  Buy AI Hours
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Mock Interview content — scrollable ── */}
        {activeView === 'practice' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="page-wrap py-6">

          {/* ── SETUP PHASE (Mock Interview) ── */}
          {phase === 'setup' && (
            <>

              {/* ── Hero Banner ── */}
              <div className="relative mb-8 rounded-xl overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
                <div className="relative p-6 md:p-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--cam-gold-leaf-lt)', fontFamily: 'var(--font-mono)' }}>PRACTICE</p>
                  <h1 className="font-bold tracking-tight text-3xl md:text-5xl mb-3" style={{ fontFamily: 'var(--font-display)', lineHeight: 1.05, color: 'var(--cam-strip-heading)' }}>
                    {user?.name
                      ? <>Welcome back, <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>{user.name.split(' ')[0]}</span>.</>
                      : <>Your practice, <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>sharpened.</span></>}
                  </h1>
                  <div className="flex items-center gap-2 mt-5 flex-wrap" style={{ color: 'var(--cam-strip-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <span style={{ color: 'var(--cam-gold-leaf-lt)', fontWeight: 700 }}>{stats.totalCompleted}</span>
                    <span>challenges completed</span>
                    {stats.streak > 0 && (
                      <>
                        <span style={{ color: 'var(--cam-strip-text-muted)' }}>·</span>
                        <span>{stats.streak} day streak</span>
                      </>
                    )}
                    {stats.bestScore > 0 && (
                      <>
                        <span style={{ color: 'var(--cam-strip-text-muted)' }}>·</span>
                        <span>best score {stats.bestScore}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Readiness — compact inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '12px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'none' }}>
                {/* Readiness score */}
                <div style={{ position: 'relative', width: 50, height: 50, shrink: 0 }}>
                  <svg width={50} height={50} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={25} cy={25} r={20} fill="none" stroke="var(--bg-elevated)" strokeWidth={5} />
                    <circle cx={25} cy={25} r={20} fill="none" stroke={readiness >= 70 ? 'var(--success)' : readiness >= 40 ? 'var(--warning)' : 'var(--danger)'} strokeWidth={5} strokeDasharray={126} strokeDashoffset={126 - (readiness / 100) * 126} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="practice-display" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{readiness}</span>
                  </div>
                </div>
                {/* Stats inline */}
                {[
                  { label: 'Done', value: stats.totalCompleted || 0 },
                  { label: 'Streak', value: `${stats.streak || 0}d` },
                  { label: 'Best', value: `${stats.bestScore || 0}%` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div className="practice-mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
                <div style={{ width: 1, height: 30, background: 'var(--border)' }} />
                {/* Category bars inline */}
                {CATEGORIES.map(cat => {
                  const s = getCategoryScore(stats, cat);
                  const colors = { coding: 'var(--accent)', 'system-design': 'var(--info)', behavioral: 'var(--warning)' };
                  return (
                    <div key={cat} style={{ flex: 1, minWidth: 80 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{catLabel(cat)}</span>
                        <span className="practice-mono" style={{ fontWeight: 700, color: s >= 70 ? 'var(--success)' : 'var(--text-dimmed)' }}>{s}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: colors[cat], width: `${Math.max(s, 2)}%`, opacity: s > 0 ? 1 : 0.2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Challenge Configuration */}
              <div style={{ marginBottom: 24 }}>
                <SectionCard title="Start a Challenge" bodyClassName="p-3">
                  {/* Mode cards */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Mode</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                      {MODES.map(m => (
                        <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '10px 12px', borderRadius: 10, border: mode === m.id ? '2px solid var(--accent)' : '1px solid var(--border)', background: mode === m.id ? 'var(--accent-subtle)' : 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <DatabricksThumb
                              color={m.hexColor}
                              size={28}
                              icon={<Icon name={m.icon} size={14} style={{ color: '#FFFFFF' }} />}
                              title={m.label}
                            />
                            <span style={{ fontSize: 14, fontWeight: 700, color: mode === m.id ? 'var(--accent)' : 'var(--text-primary)' }}>{m.label}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.5 }}>{m.desc}</p>
                          <span className="practice-mono" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{formatTime(m.time)} / {m.questions}q</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category + Difficulty */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'block' }}>Category</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(c => (
                          <button key={c} onClick={() => setCategory(c)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: category === c ? '2px solid var(--accent)' : '1px solid var(--border)', background: category === c ? 'var(--accent-subtle)' : 'var(--bg-surface)', color: category === c ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                            <Icon name={catIcon(c)} size={14} />
                            {catLabel(c)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'block' }}>Difficulty</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {DIFFICULTIES.map(d => {
                          const dc2 = diffColor(d);
                          return (
                            <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '9px 20px', borderRadius: 10, border: difficulty === d ? `2px solid ${dc2.text}` : '1px solid var(--border)', background: difficulty === d ? dc2.bg : 'var(--bg-surface)', color: difficulty === d ? dc2.text : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' }}>{d}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Company Focus */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Company Focus</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {COMPANIES.map(c => (
                        <button key={c.id} onClick={() => setCompany(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 12px', borderRadius: 10, border: company === c.id ? `2px solid ${c.color}` : '1px solid var(--border)', background: company === c.id ? `${c.color}0d` : 'var(--bg-surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: company === c.id ? c.color : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                          {c.logo ? (
                            <img src={c.logo} alt="" width={16} height={16} style={{ display: 'block', objectFit: 'contain', borderRadius: 3, flexShrink: 0 }} draggable={false} />
                          ) : (
                            <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: 'inline-block' }} />
                          )}
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                {/* CTA Footer */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <button onClick={() => startChallenge()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 24px', background: 'linear-gradient(135deg, var(--cam-primary-lt), var(--cam-primary-dk))', color: '#FFFFFF', fontSize: 14, fontWeight: 700, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', boxShadow: 'none', transition: 'transform 0.15s, box-shadow 0.15s' }}>
                    <Icon name="play" size={16} style={{ color: '#FFFFFF' }} />
                    Start Challenge
                  </button>
                </div>
                </SectionCard>
              </div>

              {/* Challenge History */}
              {stats.history && stats.history.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <SectionCard
                    title="Challenge History"
                    count={stats.history.length}
                    bodyClassName="p-0"
                    actions={
                      <>
                        {scoreTrend.length >= 2 && (
                          <Chip variant="default" className="gap-1.5">
                            <span>Trend</span>
                            <Sparkline data={scoreTrend} width={48} height={14} />
                          </Chip>
                        )}
                        <button
                          onClick={async () => {
                            const ok = await dialogConfirm({
                              title: 'Reset challenge history?',
                              message: 'Clears every past challenge score and streak. This cannot be undone.',
                              confirmLabel: 'Reset',
                              tone: 'danger',
                            });
                            if (ok) {
                              localStorage.removeItem('camora_challenge_stats');
                              setStats(getStats());
                            }
                          }}
                          className="bg-transparent border-none p-0 cursor-pointer"
                        >
                          <Chip>Reset</Chip>
                        </button>
                      </>
                    }
                  >
                    <div style={{ display: 'grid', gap: 10, padding: 16 }}>
                    {stats.history.slice(0, 10).map((h, i) => {
                      const companyObj = COMPANIES.find(c => c.id === h.company);
                      return (
                        <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'none' }}>
                          <button onClick={() => setExpandedHistory(expandedHistory === i ? null : i)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                            <Icon name={catIcon(h.category || 'coding')} size={18} style={{ color: 'var(--text-muted)' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{catLabel(h.category || 'coding')}</span>
                                <Chip variant={h.difficulty || 'medium'}>{h.difficulty || 'medium'}</Chip>
                                {companyObj && companyObj.id !== 'all' && (
                                  <Chip variant="default">{companyObj.label}</Chip>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {h.date} / {MODES.find(m => m.id === h.mode)?.label || h.mode} / {formatTime(h.timeSpent || 0)}
                              </div>
                            </div>
                            <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700, background: scoreBg(h.score), color: scoreColor(h.score) }}>{h.score}%</span>
                            <Icon name={expandedHistory === i ? 'chevronUp' : 'chevronDown'} size={16} style={{ color: 'var(--text-muted)' }} />
                          </button>
                          {expandedHistory === i && h.questions && (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px' }}>
                              {h.questions.map((hq, qi) => (
                                <div key={qi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: qi < h.questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{qi + 1}. {hq.q}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(hq.score), minWidth: 40, textAlign: 'right' }}>{hq.score}%</span>
                                </div>
                              ))}
                              {h.questions.some(hq => hq.feedback) && (
                                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                  {h.questions.filter(hq => hq.feedback && hq.feedback !== 'Skipped').map((hq, fi) => (
                                    <p key={fi} style={{ margin: '2px 0' }}><strong>{hq.q}:</strong> {hq.feedback}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </SectionCard>
                </div>
              )}
            </>
          )}

          {/* ── ACTIVE PHASE ── */}
          {phase === 'active' && questions[currentIdx] && (
            <div>
              {/* Timer bar + progress dots */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {questions.map((_, qi) => (
                      <div key={qi} style={{ width: qi === currentIdx ? 18 : 8, height: 8, borderRadius: 99, background: qi < currentIdx ? 'var(--accent)' : qi === currentIdx ? 'var(--accent)' : 'var(--border)', transition: 'all 0.3s' }} />
                    ))}
                  </div>
                  <SessionTimer
                    duration={modeConfig.time}
                    isRunning={phase === 'active'}
                    onExpire={() => { if (endChallengeRef.current) endChallengeRef.current(); }}
                    showControls={false}
                    className="text-base font-bold"
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Question {currentIdx + 1} of {questions.length} / {catLabel(category)} / {MODES.find(m => m.id === mode)?.label}
                </div>
              </div>

              {/* Question card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                  <Chip variant={questions[currentIdx].difficulty}>{questions[currentIdx].difficulty}</Chip>
                                  <Chip>{catLabel(category)}</Chip>
                                  {questions[currentIdx].companies?.slice(0, 3).map(co => {
                                    const coObj = COMPANIES.find(c => c.id === co);
                                    return coObj ? (
                                      <Chip key={co} variant="default">{coObj.label}</Chip>
                                    ) : null;
                                  })}
                                  {questions[currentIdx].topics?.slice(0, 2).map(t => (
                                    <Chip key={t}>{t}</Chip>
                                  ))}
                </div>
                <h2 className="practice-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {questions[currentIdx].q}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{questions[currentIdx].desc}</p>
              </div>

              {/* Answer area — different for each category */}
              {category === 'coding' && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 36, height: '100%', background: 'var(--bg-elevated)', borderRadius: '12px 0 0 12px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, pointerEvents: 'none' }}>
                    {Array.from({ length: Math.max(10, (answers[currentIdx] || '').split('\n').length) }, (_, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--text-dimmed)', lineHeight: '22.1px', fontFamily: "var(--font-mono)", userSelect: 'none' }}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={answers[currentIdx]}
                    onChange={(e) => { const newA = [...answers]; newA[currentIdx] = e.target.value; setAnswers(newA); }}
                    placeholder="Write your solution here... (pseudocode or real code)"
                    style={{ width: '100%', minHeight: 220, padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: "var(--font-mono)", background: 'var(--bg-surface)', lineHeight: '22.1px', tabSize: 2 }}
                    autoFocus
                    disabled={!!inlineEval}
                  />
                </div>
              )}

              {category === 'system-design' && !inlineEval && (() => {
                const SD_SECTIONS = [
                  { label: 'Functional Req.', icon: 'clipboard', color: 'var(--accent)', placeholder: 'List core functional requirements...' },
                  { label: 'Non-Functional Req.', icon: 'shield', color: 'var(--accent)', placeholder: 'Latency, availability, consistency, scale...' },
                  { label: 'Components', icon: 'layers', color: 'var(--success)', placeholder: 'Key services, databases, caches...' },
                  { label: 'Data Flow', icon: 'gitBranch', color: 'var(--accent)', placeholder: 'Request path, data pipeline...' },
                  { label: 'Layered Design', icon: 'server', color: 'var(--text-muted)', placeholder: 'API layer, business logic, storage...' },
                  { label: 'Scalability', icon: 'trendingUp', color: 'var(--text-muted)', placeholder: 'Sharding, replication, CDN, load balancing...' },
                  { label: 'Trade-offs', icon: 'scale', color: 'var(--danger)', placeholder: 'CAP, consistency vs availability...' },
                ];
                const parts = (answers[currentIdx] || '').split('---SECTION---');

                const autoGenerate = async () => {
                  const q = questions[currentIdx];
                  if (!q) { console.error('[AutoGenerate] No question found'); return; }
                  setSdGenerating(true);
                  try {
                    const res = await fetch(`${API_URL}/api/solve/stream`, {
                      credentials: 'include',
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                      body: JSON.stringify({
                        problem: `System Design: ${q.q}. ${q.desc}`,
                        ascendMode: 'system-design',
                        designDetailLevel: 'basic',
                      }),
                    });
                    if (!res.ok) {
                      const errText = await res.text().catch(() => '');
                      console.error('Auto-generate HTTP error:', res.status, errText);
                      return;
                    }
                    const reader = res.body?.getReader();
                    if (!reader) return;
                    const decoder = new TextDecoder();
                    let fullText = '';
                    let structuredResult = null;
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      const raw = decoder.decode(value, { stream: true });
                      for (const line of raw.split('\n')) {
                        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
                        try {
                          const d = JSON.parse(line.slice(6));
                          if (d.error) { console.error('Solve stream error:', d.error); continue; }
                          if (d.chunk) fullText += d.chunk;
                          if (d.done && d.result) structuredResult = d.result;
                        } catch {}
                      }
                    }

                    // Try structured systemDesign result first
                    if (structuredResult?.systemDesign) {
                      const sd = structuredResult.systemDesign;
                      const sectionTexts = [
                        (sd.requirements?.functional || []).join('\n'),
                        (sd.requirements?.nonFunctional || []).join('\n'),
                        (sd.architecture?.components || []).join('\n'),
                        sd.architecture?.description || '',
                        sd.overview || '',
                        (sd.scalability || []).join('\n'),
                        (sd.tradeoffs || []).join('\n'),
                      ];
                      const newA = [...answers];
                      newA[currentIdx] = sectionTexts.join('---SECTION---');
                      setAnswers(newA);
                      return;
                    }

                    // Fallback: use raw streamed text and distribute across sections
                    if (fullText.trim()) {
                      // Try regex parsing by section labels
                      const sectionTexts = SD_SECTIONS.map(s => {
                        const escaped = s.label.replace('.', '\\.?');
                        const regex = new RegExp(`${escaped}[:\\s]*([\\s\\S]*?)(?=(?:${SD_SECTIONS.map(x => x.label.replace('.', '\\.?')).join('|')})[:\\s]|$)`, 'i');
                        const match = fullText.match(regex);
                        return match ? match[1].trim() : '';
                      });
                      // If regex parsing got results, use them
                      if (sectionTexts.some(t => t.length > 0)) {
                        const newA = [...answers];
                        newA[currentIdx] = sectionTexts.join('---SECTION---');
                        setAnswers(newA);
                      } else {
                        // Last resort: put all text in the first section
                        const newA = [...answers];
                        const empty = new Array(SD_SECTIONS.length).fill('');
                        empty[0] = fullText.trim();
                        newA[currentIdx] = empty.join('---SECTION---');
                        setAnswers(newA);
                      }
                    }
                  } catch (err) {
                    console.error('Auto-generate failed:', err);
                  } finally {
                    setSdGenerating(false);
                  }
                };

                const refState = sdRefDiagram[currentIdx] || { status: 'idle', url: null };

                const loadRefDiagram = async () => {
                  setSdTab('reference');
                  if (refState.status !== 'idle') return;
                  const q = questions[currentIdx];
                  if (!q) return;
                  setSdRefDiagram(prev => ({ ...prev, [currentIdx]: { status: 'loading', url: null } }));
                  try {
                    const res = await fetch(`${API_URL}/api/diagram/lookup`, {
                      credentials: 'include',
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                      body: JSON.stringify({ question: `${q.q}: ${q.desc}` }),
                    });
                    const data = await res.json();
                    setSdRefDiagram(prev => ({
                      ...prev,
                      [currentIdx]: data.success && data.image_url && !data.image_url.startsWith('/static/')
                        ? { status: 'cached', url: data.image_url }
                        : { status: 'missing', url: null },
                    }));
                  } catch {
                    setSdRefDiagram(prev => ({ ...prev, [currentIdx]: { status: 'missing', url: null } }));
                  }
                };

                return (
                  <div style={{ marginBottom: 8 }}>
                    {/* Auto-generate button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <button onClick={autoGenerate} disabled={sdGenerating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: sdGenerating ? 'var(--text-muted)' : 'var(--accent)', background: sdGenerating ? 'var(--bg-elevated)' : 'var(--accent-subtle)', border: `1px solid ${sdGenerating ? 'var(--border)' : 'var(--border)'}`, borderRadius: 8, cursor: sdGenerating ? 'wait' : 'pointer' }}>
                        {sdGenerating ? (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...</>
                        ) : (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> Auto Generate Answers</>
                        )}
                      </button>
                    </div>

                    <div style={{ height: 'calc(100dvh - 280px)', minHeight: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                      <Allotment defaultSizes={[45, 55]}>
                        {/* Left: Draw / Reference toggle pane */}
                        <Allotment.Pane minSize={320}>
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {/* Tab bar */}
                            <div style={{ display: 'flex', gap: 2, padding: '4px 8px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => setSdTab('draw')}
                                style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: sdTab === 'draw' ? 'var(--accent-subtle)' : 'transparent', color: sdTab === 'draw' ? 'var(--accent)' : 'var(--text-muted)' }}
                              >
                                Whiteboard
                              </button>
                              <button
                                type="button"
                                onClick={loadRefDiagram}
                                style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: refState.status === 'loading' ? 'wait' : 'pointer', background: sdTab === 'reference' ? 'var(--accent-subtle)' : 'transparent', color: sdTab === 'reference' ? 'var(--accent)' : 'var(--text-muted)' }}
                              >
                                {refState.status === 'loading' ? 'Loading...' : 'Reference'}
                              </button>
                            </div>
                            {/* Content */}
                            {sdTab === 'draw' ? (
                              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>Loading whiteboard...</div>}>
                                  <ExcalidrawWhiteboard
                                    key={currentIdx}
                                    initialElements={whiteboardState.getScene(currentIdx)}
                                    onChange={(elements) => whiteboardState.saveScene(currentIdx, elements)}
                                  />
                                </Suspense>
                              </div>
                            ) : (
                              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: refState.status === 'cached' ? 'flex-start' : 'center', background: 'var(--bg-surface)', padding: refState.status === 'cached' ? 0 : 24 }}>
                                {refState.status === 'loading' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    <span style={{ fontSize: 13 }}>Loading diagram...</span>
                                  </div>
                                )}
                                {refState.status === 'cached' && refState.url && (
                                  <img
                                    src={`${API_URL}${refState.url}`}
                                    alt="Reference architecture diagram"
                                    style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                                  />
                                )}
                                {(refState.status === 'missing' || refState.status === 'idle') && (
                                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.4 }}>
                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                      <path d="M3 9h18M9 21V9" />
                                    </svg>
                                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-secondary)' }}>Diagram coming soon</p>
                                    <p style={{ fontSize: 12, margin: 0, maxWidth: 220, lineHeight: 1.5 }}>Our team pre-generates reference diagrams for all questions.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Allotment.Pane>

                        {/* Right: Section text areas */}
                        <Allotment.Pane minSize={340}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, 1fr)', gap: 6, padding: 12, height: '100%', background: 'var(--bg-surface)' }}>
                            {SD_SECTIONS.map((section, si) => {
                              const val = parts[si] || '';
                              return (
                                <div key={section.label} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, ...(si === SD_SECTIONS.length - 1 ? { gridColumn: '1 / -1' } : {}) }}>
                                  <label style={{ fontSize: 10, fontWeight: 600, color: section.color, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                                    <Icon name={section.icon} size={11} style={{ color: section.color }} />
                                    {section.label}
                                  </label>
                                  <textarea
                                    ref={si === 0 ? textareaRef : undefined}
                                    value={val}
                                    onChange={(e) => {
                                      const newParts = (answers[currentIdx] || '').split('---SECTION---');
                                      while (newParts.length < SD_SECTIONS.length) newParts.push('');
                                      newParts[si] = e.target.value;
                                      const newA = [...answers];
                                      newA[currentIdx] = newParts.join('---SECTION---');
                                      setAnswers(newA);
                                    }}
                                    placeholder={section.placeholder}
                                    style={{ width: '100%', flex: 1, minHeight: 0, padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, resize: 'none', outline: 'none', background: 'var(--bg-surface)', lineHeight: 1.6 }}
                                    autoFocus={si === 0}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </Allotment.Pane>
                      </Allotment>
                    </div>
                  </div>
                );
              })()}

              {category === 'behavioral' && !inlineEval && (
                <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
                  {['Situation', 'Task', 'Action', 'Result'].map((section, si) => {
                    const parts = (answers[currentIdx] || '').split('---STAR---');
                    const val = parts[si] || '';
                    const colors = { Situation: 'var(--accent)', Task: 'var(--accent)', Action: 'var(--success)', Result: 'var(--warning)' };
                    return (
                      <div key={section}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: colors[section], marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <span style={{ width: 6, height: 6, borderRadius: 99, background: colors[section], display: 'inline-block' }} />
                          {section}
                        </label>
                        <textarea
                          ref={si === 0 ? textareaRef : undefined}
                          value={val}
                          onChange={(e) => {
                            const newParts = (answers[currentIdx] || '').split('---STAR---');
                            while (newParts.length < 4) newParts.push('');
                            newParts[si] = e.target.value;
                            const newA = [...answers];
                            newA[currentIdx] = newParts.join('---STAR---');
                            setAnswers(newA);
                          }}
                          placeholder={`Describe the ${section.toLowerCase()}...`}
                          style={{ width: '100%', minHeight: 70, padding: 12, borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical', outline: 'none', background: 'var(--bg-surface)', lineHeight: 1.6 }}
                          autoFocus={si === 0}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Evaluation */}
              {inlineEval && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <ScoreRing value={inlineEval.score} size={80} strokeW={7} animated />
                    <div style={{ flex: 1 }}>
                      <h3 className="practice-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Evaluation</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{inlineEval.feedback}</p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <DimensionBars dimensions={inlineEval.dimensions} />

                  {/* Improvement tips */}
                  {inlineEval.improvementTips && inlineEval.improvementTips.length > 0 && (
                    <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--warning)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Tips to improve</div>
                      {inlineEval.improvementTips.map((tip, ti) => (
                        <div key={ti} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>-</span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Model answer expandable */}
                  {inlineEval.modelAnswer && (
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => setShowModelAnswer(showModelAnswer ? null : currentIdx)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name={showModelAnswer === currentIdx ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: 'var(--accent)' }} />
                        {showModelAnswer === currentIdx ? 'Hide' : 'Show'} Model Answer
                      </button>
                      {showModelAnswer === currentIdx && (
                        <div style={{ marginTop: 8, padding: 14, background: 'var(--accent-subtle)', borderRadius: 10, fontSize: 13, color: 'var(--accent-hover)', lineHeight: 1.6 }}>
                          {renderMd(inlineEval.modelAnswer)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next button */}
                  <div style={{ marginTop: 16 }}>
                    <button onClick={moveToNext} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--cam-primary-lt), var(--cam-primary-dk))', color: '#FFFFFF', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {currentIdx < questions.length - 1 ? (
                        <>Next Question <Icon name="arrowRight" size={14} style={{ color: '#FFFFFF' }} /></>
                      ) : (
                        <>View Results <Icon name="arrowRight" size={14} style={{ color: '#FFFFFF' }} /></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Controls (only when not showing inline eval) */}
              {!inlineEval && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <button onClick={submitAnswer} disabled={evaluating} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--cam-primary-lt), var(--cam-primary-dk))', color: '#FFFFFF', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: evaluating ? 'wait' : 'pointer', opacity: evaluating ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {evaluating ? (
                      <><Icon name="loader" size={14} style={{ color: '#FFFFFF', animation: 'spin 1s linear infinite' }} /> Evaluating...</>
                    ) : 'Submit Answer'}
                  </button>
                  <button onClick={skipQuestion} disabled={evaluating} style={{ padding: '10px 20px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    Skip
                  </button>
                  <button onClick={() => endChallenge()} disabled={evaluating} style={{ padding: '10px 20px', background: 'var(--bg-elevated)', color: 'var(--danger)', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid var(--border)', cursor: evaluating ? 'not-allowed' : 'pointer', marginLeft: 'auto', opacity: evaluating ? 0.5 : 1 }}>
                    End Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === 'results' && (() => {
            const passed = scores.filter(s => s >= 60).length;
            const total = scores.length;
            const grade = finalAvgScore >= 90 ? 'A+' : finalAvgScore >= 80 ? 'A' : finalAvgScore >= 70 ? 'B' : finalAvgScore >= 60 ? 'C' : finalAvgScore >= 40 ? 'D' : 'F';
            const gradeColor = finalAvgScore >= 70 ? 'var(--success)' : finalAvgScore >= 50 ? 'var(--warning)' : 'var(--danger)';
            return (
            <div>
              {/* ── Hero Result Card ── */}
              <div style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))', borderRadius: 20, padding: '40px 32px', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 24px rgba(38,97,156,0.15)' }}>
                {/* Decorative grid */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Score ring + grade */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <ScoreRing value={finalAvgScore} size={160} strokeW={12} animated />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{finalAvgScore}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor, marginTop: 2 }}>Grade {grade}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{passed}/{total}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Passed</div>
                      </div>
                      <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{catLabel(category)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{difficulty}</div>
                      </div>
                    </div>
                  </div>

                  {/* Radar */}
                  {resultDimensions && (
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)' }}>
                      <RadarChart
                        values={DIMENSION_KEYS.map(k => resultDimensions[k] || 0)}
                        labels={DIMENSION_LABELS}
                        size={200}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, position: 'relative' }}>
                  <button onClick={() => { setPhase('setup'); setStats(getStats()); setInlineEval(null); }} style={{ padding: '11px 22px', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}>
                    Back to Dashboard
                  </button>
                  <button onClick={startChallenge} style={{ padding: '11px 22px', background: 'var(--accent)', color: '#FFFFFF', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', boxShadow: 'none', transition: 'all 0.2s' }}>
                    Try Again
                  </button>
                  <button onClick={() => { setDifficulty('medium'); setPhase('setup'); setStats(getStats()); }} style={{ padding: '11px 22px', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Practice Weak Areas
                  </button>
                </div>
              </div>

              {/* ── Quick Dimension Stats ── */}
              {resultDimensions && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {DIMENSION_KEYS.map((k, i) => {
                    const val = resultDimensions[k] || 0;
                    const dimColor = val >= 70 ? 'var(--success)' : val >= 50 ? 'var(--warning)' : 'var(--danger)';
                    return (
                      <div key={k} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: 'none' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{DIMENSION_LABELS[i]}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: 22, fontWeight: 800, color: dimColor }}>{val}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 100</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated)', marginTop: 8, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: dimColor, width: `${val}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Improvement Tips ── */}
              {aiModelAnswers.some(a => a.improvementTips && a.improvementTips.length > 0) && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--warning)', borderRadius: 16, padding: '18px 22px', marginBottom: 20 }}>
                  <h3 className="practice-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="lightbulb" size={15} style={{ color: 'var(--text-muted)' }} />
                    Focus Areas
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {[...new Set(aiModelAnswers.flatMap(a => a.improvementTips || []))].slice(0, 5).map((tip, i) => (
                                    <Chip key={i} variant="warning">{tip}</Chip>
                                  ))}
                  </div>
                </div>
              )}

              {/* ── Question Breakdown ── */}
              <SectionCard
                title="Question Breakdown"
                count={`${passed} / ${total}`}
                bodyClassName="p-0"
              >
                {questions.map((q, i) => {
                  const isExpanded = expandedHistory === `result-${i}`;
                  const dims = aiDimensions[i] || {};
                  const ma = aiModelAnswers[i] || {};
                  const sc = scores[i] || 0;
                  const pass = sc >= 60;
                  return (
                    <div key={i} style={{ borderBottom: i < questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <button onClick={() => setExpandedHistory(isExpanded ? null : `result-${i}`)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: isExpanded ? 'var(--bg-elevated)' : 'transparent', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: pass ? 'var(--accent-subtle)' : 'var(--bg-elevated)', color: pass ? 'var(--accent)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{q.q}</span>
                            {q.difficulty && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 8, textTransform: 'capitalize' }}>{q.difficulty}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 60, height: 5, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 99, background: scoreColor(sc), width: `${sc}%`, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: scoreBg(sc), color: scoreColor(sc), minWidth: 42, textAlign: 'center' }}>
                            {sc}%
                          </span>
                          <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: 'var(--text-dimmed)' }} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 24px 20px 60px' }}>
                          {answers[i] && (
                            <div style={{ marginBottom: 14, padding: 14, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: category === 'coding' ? "var(--font-mono)" : 'inherit', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>
                              {answers[i].replace(/---SECTION---/g, '\n\n').replace(/---STAR---/g, '\n\n')}
                            </div>
                          )}
                          {aiFeedback[i] && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>{aiFeedback[i]}</p>}
                          {Object.keys(dims).length > 0 && <DimensionBars dimensions={dims} compact />}
                          {ma.modelAnswer && (
                            <div style={{ marginTop: 12 }}>
                              <button onClick={() => setShowModelAnswer(showModelAnswer === `r-${i}` ? null : `r-${i}`)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icon name={showModelAnswer === `r-${i}` ? 'chevronUp' : 'chevronDown'} size={12} style={{ color: 'var(--accent)' }} />
                                {showModelAnswer === `r-${i}` ? 'Hide' : 'Show'} Model Answer
                              </button>
                              {showModelAnswer === `r-${i}` && (
                                <div style={{ marginTop: 8, padding: 14, background: 'var(--accent-subtle)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--accent-hover)', lineHeight: 1.6 }}>
                                  {renderMd(ma.modelAnswer)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </SectionCard>
            </div>
            );
          })()}

            </div>
          </div>
        )}

      </div>

      {/* ═══════════ Styles ═══════════ */}
      <style>{`
        .practice-root { -webkit-font-smoothing: antialiased; font-family: var(--font-sans); }
        .practice-display { font-family: var(--font-sans); }
        .practice-mono { font-family: var(--font-mono); }
        textarea:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-subtle); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
