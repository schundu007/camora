import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/shared/Icons.jsx';
import CamoraLogo from '../../components/shared/CamoraLogo';
import SiteFooter from '../../components/shared/SiteFooter';
import { getAuthHeaders } from '../../utils/authHeaders.js';


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
  { id: 'quickfire', label: 'Quick Fire', time: 300, questions: 5, icon: 'zap', desc: '5 rapid questions in 5 minutes. Build speed and intuition.' },
  { id: 'deepdive', label: 'Deep Dive', time: 900, questions: 3, icon: 'target', desc: '3 in-depth questions over 15 minutes. Focus on quality.' },
  { id: 'mock', label: 'Mock Interview', time: 2700, questions: 8, icon: 'timer', desc: '8 questions in 45 minutes. Simulate the real experience.' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const CATEGORIES = ['coding', 'system-design', 'behavioral'];
const COMPANIES = [
  { id: 'all', label: 'All', color: '#6b7280' },
  { id: 'google', label: 'Google', color: '#4285f4' },
  { id: 'meta', label: 'Meta', color: '#0668E1' },
  { id: 'amazon', label: 'Amazon', color: '#FF9900' },
  { id: 'apple', label: 'Apple', color: '#555' },
  { id: 'microsoft', label: 'Microsoft', color: '#00A4EF' },
  { id: 'netflix', label: 'Netflix', color: '#E50914' },
];

const DIMENSION_LABELS = ['Solving', 'Design', 'DSA', 'Comms', 'Time'];
const DIMENSION_KEYS = ['problemSolving', 'systemDesign', 'dataStructures', 'communication', 'timeManagement'];

const navLinks = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

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
  return allProblems[Math.floor(Math.random() * allProblems.length)];
}

function getDailyCategory(challenge) {
  if (CHALLENGES.coding.includes(challenge)) return 'coding';
  if (CHALLENGES['system-design'].includes(challenge)) return 'system-design';
  return 'behavioral';
}

function scoreColor(s) {
  if (s >= 70) return '#059669';
  if (s >= 40) return '#d97706';
  return '#dc2626';
}

function scoreBg(s) {
  if (s >= 70) return '#ecfdf5';
  if (s >= 40) return '#fffbeb';
  return '#fef2f2';
}

function diffColor(d) {
  if (d === 'easy') return { bg: '#ecfdf5', text: '#059669' };
  if (d === 'medium') return { bg: '#fffbeb', text: '#d97706' };
  return { bg: '#fef2f2', text: '#dc2626' };
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
        return <path key={level} d={path} fill="none" stroke="#e5e7eb" strokeWidth={1} />;
      })}
      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      {/* Data shape */}
      <path d={dataPath} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth={2} />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="#10b981" stroke="#fff" strokeWidth={2} />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 600, fill: '#6b7280', fontFamily: "'Work Sans', sans-serif" }}>
            {label}
          </text>
        );
      })}
      {/* Center score */}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 800, fill: '#111827', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {avg}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 500, fill: '#9ca3af', fontFamily: "'Work Sans', sans-serif" }}>
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={animated ? offset : offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="#111827" fontSize={size * 0.22} fontWeight={800} style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {value}%
      </text>
    </svg>
  );
}

/* ══════════════════════════════ Sparkline ══════════════════════════════ */

function Sparkline({ data, width = 100, height = 28, color = '#10b981' }) {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>
            <span>{labels[key] || key}</span>
            <span style={{ color: scoreColor(val) }}>{val}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: scoreColor(val), width: `${val}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════ Component ══════════════════════════════ */

export default function PracticePage() {
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState(getStats);

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
  const [diagramUrl, setDiagramUrl] = useState(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState(null);
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const challengeStartRef = useRef(0);
  const endChallengeRef = useRef(null);

  // Timer — uses ref to avoid stale closure
  useEffect(() => {
    if (phase === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); if (endChallengeRef.current) endChallengeRef.current(); return 0; }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.scrollTo(0, 0); }, []);

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
    setDiagramUrl(null);
    setDiagramError(null);
    setPhase('active');
    window.scrollTo(0, 0);
  }, [mode, category, difficulty, company]);

  // Auto-generate architecture diagram for system design questions
  const generateDiagram = useCallback((q) => {
    setDiagramUrl(null);
    setDiagramError(null);
    setDiagramLoading(true);
    fetch(`${API_URL}/api/diagram/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ question: `${q.q}: ${q.desc}`, cloudProvider: 'aws', detailLevel: 'overview', direction: 'LR' }),
    })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        if (data.success && data.image_url) {
          const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
          setDiagramUrl(url);
        } else {
          setDiagramError(data.error || 'Could not generate diagram');
        }
      })
      .catch((e) => setDiagramError(`Diagram generation failed (${e.message})`))
      .finally(() => setDiagramLoading(false));
  }, []);

  useEffect(() => {
    if (phase !== 'active' || category !== 'system-design' || !questions[currentIdx]) return;
    generateDiagram(questions[currentIdx]);
  }, [phase, category, currentIdx, questions, generateDiagram]);

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
      // scores state is already updated by submitAnswer's setScores before user can click
      endChallenge([...scores]);
    }
  }, [currentIdx, questions, scores]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const dc = diffColor(dailyChallenge.difficulty);

  const readiness = getReadiness(stats);
  const modeConfig = MODES.find(m => m.id === mode);
  const timerPercent = modeConfig ? (timeLeft / modeConfig.time) * 100 : 100;
  const timerColor = timerPercent > 50 ? '#10b981' : timerPercent > 20 ? '#f59e0b' : '#ef4444';

  // Social proof (simulated)
  const socialCount = 1247 + Math.floor((new Date().getHours() * 37 + new Date().getMinutes()) % 300);

  const dimValues = DIMENSION_KEYS.map(k => stats.dimensions?.[k] || 0);

  // Score trend for sparkline
  const scoreTrend = (stats.history || []).slice(0, 10).map(h => h.score).reverse();

  // Results stats
  const finalAvgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="practice-root" style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* ═══════════ Nav ═══════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)', height: '56px' }}>
        <div className="w-full lg:max-w-[70%] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <CamoraLogo size={36} />
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} className="nav-link" style={{ fontSize: '14px', fontWeight: 500, padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', color: link.label === 'Practice' ? '#10b981' : '#4b5563', borderBottom: link.label === 'Practice' ? '2px solid #10b981' : '2px solid transparent' }}>{link.label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/capra/prepare" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '4px 8px', borderRadius: 8 }}>
                  {user.image ? <img src={user.image} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} referrerPolicy="no-referrer" /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#047857' }}>{user.name?.[0] || '?'}</div>}
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{user.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button onClick={logout} style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
              </>
            ) : !loading && (
              <Link to="/login?redirect=/capra/practice" style={{ fontSize: 14, fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>Sign in</Link>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5" style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40" style={{ background: '#fff', borderBottom: '1px solid #e3e8ee', padding: '8px 16px' }}>
          {navLinks.map((link) => (
            <Link key={link.label} to={link.href} onClick={() => setMobileMenuOpen(false)} style={{ display: 'block', padding: '10px 12px', fontSize: 14, fontWeight: 500, color: link.label === 'Practice' ? '#10b981' : '#4b5563', textDecoration: 'none', borderRadius: 8 }}>{link.label}</Link>
          ))}
        </div>
      )}

      {/* ═══════════ Main Content ═══════════ */}
      <div style={{ paddingTop: 56 }}>
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: 32, paddingBottom: 80 }}>

          {/* ── SETUP PHASE ── */}
          {phase === 'setup' && (
            <>
              {/* Daily Challenge Banner */}
              <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 100%)', border: '1px solid #a7f3d0', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon name="streak" size={18} style={{ color: '#f59e0b' }} />
                    <span className="practice-display" style={{ fontSize: 13, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Challenge</span>
                  </div>
                  <h2 className="practice-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{dailyChallenge.q}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>{dailyChallenge.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: dc.bg, color: dc.text }}>{dailyChallenge.difficulty}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{catLabel(dailyCategory)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => startChallenge(dailyCategory, dailyChallenge.difficulty, [dailyChallenge])} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}>
                    <Icon name="play" size={14} style={{ color: '#fff' }} />
                    Start
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="streak" size={12} style={{ color: '#f59e0b' }} />
                      {stats.streak || 0} day streak
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="users" size={12} style={{ color: '#9ca3af' }} />
                      {socialCount.toLocaleString()} today
                    </span>
                  </div>
                </div>
              </div>

              {/* Readiness Dashboard */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="practice-display" style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>Interview Readiness</h2>
                {/* Top: Readiness score + category bars */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 16, alignItems: 'center', marginBottom: 14 }}>
                  {/* Big readiness number */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto' }}>
                      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={50} cy={50} r={42} fill="none" stroke="#f3f4f6" strokeWidth={8} />
                        <circle cx={50} cy={50} r={42} fill="none" stroke={readiness >= 70 ? '#10b981' : readiness >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth={8} strokeDasharray={264} strokeDashoffset={264 - (readiness / 100) * 264} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="practice-display" style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{readiness}</span>
                        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>/ 100</span>
                      </div>
                    </div>
                  </div>
                  {/* Category bars */}
                  <div>
                    {CATEGORIES.map(cat => {
                      const s = getCategoryScore(stats, cat);
                      const completed = stats.categories?.[cat]?.completed || 0;
                      const colors = { coding: '#8b5cf6', 'system-design': '#06b6d4', behavioral: '#f59e0b' };
                      return (
                        <div key={cat} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: 99, background: colors[cat] }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{catLabel(cat)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>{completed} done</span>
                              <span className="practice-mono" style={{ fontSize: 13, fontWeight: 700, color: scoreColor(s), minWidth: 32, textAlign: 'right' }}>{s}%</span>
                            </div>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 99, background: colors[cat], width: `${Math.max(s, 2)}%`, transition: 'width 0.6s ease', opacity: s > 0 ? 1 : 0.3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Bottom: Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                  {[
                    { label: 'Completed', value: stats.totalCompleted || 0, color: '#10b981' },
                    { label: 'Day Streak', value: `${stats.streak || 0}`, color: '#f59e0b' },
                    { label: 'Best Score', value: `${stats.bestScore || 0}%`, color: '#8b5cf6' },
                    { label: 'Avg Time', value: formatTime(Math.round(CATEGORIES.reduce((a, c) => a + (stats.categories?.[c]?.avgTime || 0), 0) / 3)), color: '#06b6d4' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div className="practice-mono" style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenge Configuration */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h2 className="practice-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Start a Challenge</h2>

                {/* Mode cards */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {MODES.map(m => (
                      <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '16px', borderRadius: 12, border: mode === m.id ? '2px solid #10b981' : '1px solid #e3e8ee', background: mode === m.id ? '#ecfdf5' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Icon name={m.icon} size={16} style={{ color: mode === m.id ? '#059669' : '#9ca3af' }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: mode === m.id ? '#059669' : '#111827' }}>{m.label}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', lineHeight: 1.4 }}>{m.desc}</p>
                        <span className="practice-mono" style={{ fontSize: 11, color: '#6b7280' }}>{formatTime(m.time)} / {m.questions}q</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category + Difficulty in same row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Category</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 20, border: category === c ? '1px solid #10b981' : '1px solid #e3e8ee', background: category === c ? '#ecfdf5' : '#fff', color: category === c ? '#059669' : '#4b5563', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                          <Icon name={catIcon(c)} size={14} />
                          {catLabel(c)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Difficulty</label>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {DIFFICULTIES.map(d => {
                        const dc2 = diffColor(d);
                        return (
                          <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '8px 18px', borderRadius: 20, border: difficulty === d ? `1px solid ${dc2.text}` : '1px solid #e3e8ee', background: difficulty === d ? dc2.bg : '#fff', color: difficulty === d ? dc2.text : '#4b5563', fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Company Focus — inside challenge card */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block', textAlign: 'center' }}>Company</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {COMPANIES.map(c => (
                      <button key={c.id} onClick={() => setCompany(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 99, border: company === c.id ? `2px solid ${c.color}` : '1px solid #e3e8ee', background: company === c.id ? `${c.color}10` : '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: company === c.id ? c.color : '#4b5563', transition: 'all 0.15s' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: c.color, display: 'inline-block' }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
                  <button onClick={() => startChallenge()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 15, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16,185,129,0.25)', transition: 'transform 0.1s', position: 'relative', zIndex: 10 }}>
                    <Icon name="play" size={16} style={{ color: '#fff' }} />
                    Start Challenge
                  </button>
                </div>
              </div>

              {/* Challenge History */}
              {stats.history && stats.history.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className="practice-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Challenge History</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {scoreTrend.length >= 2 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>Score trend</span>
                          <Sparkline data={scoreTrend} width={80} height={24} />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('Reset all challenge history? This cannot be undone.')) {
                            localStorage.removeItem('camora_challenge_stats');
                            setStats(getStats());
                          }
                        }}
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        Reset History
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {stats.history.slice(0, 10).map((h, i) => {
                      const hDC = diffColor(h.difficulty || 'medium');
                      const companyObj = COMPANIES.find(c => c.id === h.company);
                      return (
                        <div key={i} style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <button onClick={() => setExpandedHistory(expandedHistory === i ? null : i)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                            <Icon name={catIcon(h.category || 'coding')} size={18} style={{ color: '#6b7280' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{catLabel(h.category || 'coding')}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99, background: hDC.bg, color: hDC.text }}>{h.difficulty || 'medium'}</span>
                                {companyObj && companyObj.id !== 'all' && (
                                  <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 99, background: `${companyObj.color}15`, color: companyObj.color }}>{companyObj.label}</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {h.date} / {MODES.find(m => m.id === h.mode)?.label || h.mode} / {formatTime(h.timeSpent || 0)}
                              </div>
                            </div>
                            <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700, background: scoreBg(h.score), color: scoreColor(h.score) }}>{h.score}%</span>
                            <Icon name={expandedHistory === i ? 'chevronUp' : 'chevronDown'} size={16} style={{ color: '#9ca3af' }} />
                          </button>
                          {expandedHistory === i && h.questions && (
                            <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 18px' }}>
                              {h.questions.map((hq, qi) => (
                                <div key={qi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: qi < h.questions.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                                  <span style={{ fontSize: 12, color: '#374151' }}>{qi + 1}. {hq.q}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: scoreColor(hq.score), minWidth: 40, textAlign: 'right' }}>{hq.score}%</span>
                                </div>
                              ))}
                              {h.questions.some(hq => hq.feedback) && (
                                <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
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
                      <div key={qi} style={{ width: qi === currentIdx ? 18 : 8, height: 8, borderRadius: 99, background: qi < currentIdx ? '#10b981' : qi === currentIdx ? '#10b981' : '#e5e7eb', transition: 'all 0.3s' }} />
                    ))}
                  </div>
                  <span className="practice-mono" style={{ fontSize: 22, fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: timerColor, width: `${timerPercent}%`, transition: 'width 1s linear, background 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Question {currentIdx + 1} of {questions.length} / {catLabel(category)} / {MODES.find(m => m.id === mode)?.label}
                </div>
              </div>

              {/* Question card */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: diffColor(questions[currentIdx].difficulty).bg, color: diffColor(questions[currentIdx].difficulty).text }}>{questions[currentIdx].difficulty}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280' }}>{catLabel(category)}</span>
                  {questions[currentIdx].companies?.slice(0, 3).map(co => {
                    const coObj = COMPANIES.find(c => c.id === co);
                    return coObj ? (
                      <span key={co} style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: `${coObj.color}10`, color: coObj.color }}>{coObj.label}</span>
                    ) : null;
                  })}
                  {questions[currentIdx].topics?.slice(0, 2).map(t => (
                    <span key={t} style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>{t}</span>
                  ))}
                </div>
                <h2 className="practice-display" style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
                  {questions[currentIdx].q}
                </h2>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{questions[currentIdx].desc}</p>
              </div>

              {/* Answer area — different for each category */}
              {category === 'coding' && (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 36, height: '100%', background: '#f8f9fa', borderRadius: '12px 0 0 12px', borderRight: '1px solid #e3e8ee', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, pointerEvents: 'none' }}>
                    {Array.from({ length: Math.max(10, (answers[currentIdx] || '').split('\n').length) }, (_, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#c0c5ce', lineHeight: '22.1px', fontFamily: "'IBM Plex Mono', monospace", userSelect: 'none' }}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={answers[currentIdx]}
                    onChange={(e) => { const newA = [...answers]; newA[currentIdx] = e.target.value; setAnswers(newA); }}
                    placeholder="Write your solution here... (pseudocode or real code)"
                    style={{ width: '100%', minHeight: 220, padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid #e3e8ee', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: "'IBM Plex Mono', monospace", background: '#fafbfc', lineHeight: '22.1px', tabSize: 2 }}
                    autoFocus
                    disabled={!!inlineEval}
                  />
                </div>
              )}

              {category === 'system-design' && !inlineEval && (() => {
                const SD_SECTIONS = [
                  { label: 'Functional Req.', icon: 'clipboardList', color: '#3b82f6', placeholder: 'List core functional requirements...' },
                  { label: 'Non-Functional Req.', icon: 'shield', color: '#8b5cf6', placeholder: 'Latency, availability, consistency, scale...' },
                  { label: 'Components', icon: 'layers', color: '#10b981', placeholder: 'Key services, databases, caches...' },
                  { label: 'Data Flow', icon: 'gitBranch', color: '#06b6d4', placeholder: 'Request path, data pipeline...' },
                  { label: 'Layered Design', icon: 'server', color: '#f59e0b', placeholder: 'API layer, business logic, storage...' },
                  { label: 'Scalability', icon: 'trendingUp', color: '#ec4899', placeholder: 'Sharding, replication, CDN, load balancing...' },
                  { label: 'Trade-offs', icon: 'scale', color: '#ef4444', placeholder: 'CAP, consistency vs availability...' },
                ];
                const parts = (answers[currentIdx] || '').split('---SECTION---');
                return (
                  <div style={{ marginBottom: 8 }}>
                    {/* Architecture Diagram — Auto-generated */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Icon name="layers" size={12} style={{ color: '#10b981' }} />
                        Reference Architecture
                      </label>
                      <div style={{ width: '100%', minHeight: 120, borderRadius: 10, border: '1px solid #e3e8ee', background: '#fafbfc', overflow: 'hidden', position: 'relative' }}>
                        {diagramLoading && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 10 }}>
                            <div style={{ width: 28, height: 28, border: '3px solid #e3e8ee', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>Generating architecture diagram...</span>
                          </div>
                        )}
                        {diagramUrl && (
                          <img src={diagramUrl} alt="Architecture diagram" style={{ width: '100%', display: 'block', padding: 8 }} />
                        )}
                        {diagramError && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>{diagramError}</span>
                            <button
                              onClick={() => generateDiagram(questions[currentIdx])}
                              style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, color: '#10b981', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, cursor: 'pointer' }}
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {!diagramLoading && !diagramUrl && !diagramError && (
                          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#c0c5ce', fontSize: 12 }}>
                            Diagram will appear here
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section text areas — 2 columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
                      {SD_SECTIONS.map((section, si) => {
                        const val = parts[si] || '';
                        return (
                          <div key={section.label}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: section.color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <Icon name={section.icon} size={12} style={{ color: section.color }} />
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
                              style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 10, border: '1px solid #e3e8ee', fontSize: 12, resize: 'vertical', outline: 'none', background: '#fafbfc', lineHeight: 1.6 }}
                              autoFocus={si === 0}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {category === 'behavioral' && !inlineEval && (
                <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
                  {['Situation', 'Task', 'Action', 'Result'].map((section, si) => {
                    const parts = (answers[currentIdx] || '').split('---STAR---');
                    const val = parts[si] || '';
                    const colors = { Situation: '#3b82f6', Task: '#8b5cf6', Action: '#10b981', Result: '#f59e0b' };
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
                          style={{ width: '100%', minHeight: 70, padding: 12, borderRadius: 10, border: '1px solid #e3e8ee', fontSize: 13, resize: 'vertical', outline: 'none', background: '#fafbfc', lineHeight: 1.6 }}
                          autoFocus={si === 0}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Evaluation */}
              {inlineEval && (
                <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <ScoreRing value={inlineEval.score} size={80} strokeW={7} animated />
                    <div style={{ flex: 1 }}>
                      <h3 className="practice-display" style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Evaluation</h3>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{inlineEval.feedback}</p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <DimensionBars dimensions={inlineEval.dimensions} />

                  {/* Improvement tips */}
                  {inlineEval.improvementTips && inlineEval.improvementTips.length > 0 && (
                    <div style={{ marginTop: 14, padding: 12, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 6 }}>Tips to improve</div>
                      {inlineEval.improvementTips.map((tip, ti) => (
                        <div key={ti} style={{ fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                          <span style={{ color: '#f59e0b', flexShrink: 0 }}>-</span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Model answer expandable */}
                  {inlineEval.modelAnswer && (
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => setShowModelAnswer(showModelAnswer ? null : currentIdx)} style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name={showModelAnswer === currentIdx ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: '#059669' }} />
                        {showModelAnswer === currentIdx ? 'Hide' : 'Show'} Model Answer
                      </button>
                      {showModelAnswer === currentIdx && (
                        <div style={{ marginTop: 8, padding: 14, background: '#ecfdf5', borderRadius: 10, fontSize: 13, color: '#065f46', lineHeight: 1.6, fontFamily: category === 'coding' ? "'IBM Plex Mono', monospace" : 'inherit', whiteSpace: 'pre-wrap' }}>
                          {inlineEval.modelAnswer}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next button */}
                  <div style={{ marginTop: 16 }}>
                    <button onClick={moveToNext} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {currentIdx < questions.length - 1 ? (
                        <>Next Question <Icon name="arrowRight" size={14} style={{ color: '#fff' }} /></>
                      ) : (
                        <>View Results <Icon name="arrowRight" size={14} style={{ color: '#fff' }} /></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Controls (only when not showing inline eval) */}
              {!inlineEval && (
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <button onClick={submitAnswer} disabled={evaluating} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', cursor: evaluating ? 'wait' : 'pointer', opacity: evaluating ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {evaluating ? (
                      <><Icon name="loader" size={14} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> Evaluating...</>
                    ) : 'Submit Answer'}
                  </button>
                  <button onClick={skipQuestion} disabled={evaluating} style={{ padding: '10px 20px', background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid #e3e8ee', cursor: 'pointer' }}>
                    Skip
                  </button>
                  <button onClick={() => endChallenge()} disabled={evaluating} style={{ padding: '10px 20px', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid #fecaca', cursor: evaluating ? 'not-allowed' : 'pointer', marginLeft: 'auto', opacity: evaluating ? 0.5 : 1 }}>
                    End Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === 'results' && (
            <div>
              {/* Big score + radar */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 32, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <ScoreRing value={finalAvgScore} size={140} strokeW={10} animated />
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
                      {scores.filter(s => s >= 60).length}/{scores.length} passed / {catLabel(category)} / {difficulty}
                    </p>
                  </div>
                  {resultDimensions && (
                    <RadarChart
                      values={DIMENSION_KEYS.map(k => resultDimensions[k] || 0)}
                      labels={DIMENSION_LABELS}
                      size={180}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                  <button onClick={() => { setPhase('setup'); setStats(getStats()); setInlineEval(null); }} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid #e3e8ee', cursor: 'pointer' }}>
                    Back to Dashboard
                  </button>
                  <button onClick={startChallenge} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                    Try Again
                  </button>
                  <button onClick={() => { setDifficulty('medium'); setPhase('setup'); setStats(getStats()); }} style={{ padding: '10px 24px', background: '#ede9fe', color: '#7c3aed', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                    Practice Weak Areas
                  </button>
                </div>
              </div>

              {/* Improvement Tips */}
              {aiModelAnswers.some(a => a.improvementTips && a.improvementTips.length > 0) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                  <h3 className="practice-display" style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="lightbulb" size={16} style={{ color: '#f59e0b' }} />
                    Focus Areas to Improve
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[...new Set(aiModelAnswers.flatMap(a => a.improvementTips || []))].slice(0, 5).map((tip, i) => (
                      <span key={i} style={{ fontSize: 12, color: '#92400e', padding: '4px 10px', borderRadius: 99, background: '#fef3c7' }}>
                        {tip}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-question accordion */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 className="practice-display" style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Question Breakdown</h3>
                {questions.map((q, i) => {
                  const isExpanded = expandedHistory === `result-${i}`;
                  const dims = aiDimensions[i] || {};
                  const ma = aiModelAnswers[i] || {};
                  return (
                    <div key={i} style={{ borderBottom: i < questions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <button onClick={() => setExpandedHistory(isExpanded ? null : `result-${i}`)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: 99, background: (scores[i] || 0) >= 60 ? '#ecfdf5' : '#fef2f2', color: (scores[i] || 0) >= 60 ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{q.q}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: scoreBg(scores[i] || 0), color: scoreColor(scores[i] || 0) }}>
                            {scores[i] || 0}%
                          </span>
                          <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: '#9ca3af' }} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ paddingBottom: 16, paddingLeft: 30 }}>
                          {/* User's answer */}
                          {answers[i] && (
                            <div style={{ marginBottom: 12, padding: 12, background: '#f9fafb', borderRadius: 10, fontSize: 12, color: '#374151', lineHeight: 1.6, fontFamily: category === 'coding' ? "'IBM Plex Mono', monospace" : 'inherit', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                              {answers[i].replace(/---SECTION---/g, '\n\n').replace(/---STAR---/g, '\n\n')}
                            </div>
                          )}
                          {/* Feedback */}
                          {aiFeedback[i] && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.5 }}>{aiFeedback[i]}</p>}
                          {/* Dimension bars */}
                          {Object.keys(dims).length > 0 && <DimensionBars dimensions={dims} compact />}
                          {/* Model answer */}
                          {ma.modelAnswer && (
                            <div style={{ marginTop: 10 }}>
                              <button onClick={() => setShowModelAnswer(showModelAnswer === `r-${i}` ? null : `r-${i}`)} style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icon name={showModelAnswer === `r-${i}` ? 'chevronUp' : 'chevronDown'} size={12} style={{ color: '#059669' }} />
                                {showModelAnswer === `r-${i}` ? 'Hide' : 'Show'} Model Answer
                              </button>
                              {showModelAnswer === `r-${i}` && (
                                <div style={{ marginTop: 6, padding: 12, background: '#ecfdf5', borderRadius: 10, fontSize: 12, color: '#065f46', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                  {ma.modelAnswer}
                                </div>
                              )}
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

        </div>
      </div>

      <SiteFooter />

      {/* ═══════════ Styles ═══════════ */}
      <style>{`
        .practice-root { -webkit-font-smoothing: antialiased; font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .practice-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .practice-mono { font-family: 'IBM Plex Mono', 'Menlo', monospace; }
        .nav-link:hover { color: #111827 !important; background: #f3f4f6; }
        textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
