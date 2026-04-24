import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { dialogConfirm } from '../../components/shared/Dialog';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Icon } from '../../components/shared/Icons.jsx';
import { getAuthHeaders } from '../../utils/authHeaders.js';
import SharedDiagram from '../../components/shared/diagrams/SharedDiagram';
import GamificationWidget from '../../components/capra/features/GamificationWidget';
import { InterviewTimer } from '../../components/shared/timer/InterviewTimer';
import { useWhiteboardState } from '../../hooks/useWhiteboardState';

const ExcalidrawWhiteboard = lazy(() => import('../../components/shared/diagrams/ExcalidrawWhiteboard'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const SQLPlayground = lazy(() => import('../../components/capra/sql/SQLPlayground'));


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
  { id: 'all', label: 'All', color: 'var(--text-muted)' },
  { id: 'google', label: 'Google', color: '#4285f4' },
  { id: 'meta', label: 'Meta', color: '#0668E1' },
  { id: 'amazon', label: 'Amazon', color: '#FF9900' },
  { id: 'apple', label: 'Apple', color: '#555' },
  { id: 'microsoft', label: 'Microsoft', color: '#00A4EF' },
  { id: 'netflix', label: 'Netflix', color: '#E50914' },
];

const DIMENSION_LABELS = ['Solving', 'Design', 'DSA', 'Comms', 'Time'];
const DIMENSION_KEYS = ['problemSolving', 'systemDesign', 'dataStructures', 'communication', 'timeManagement'];


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
  if (s >= 70) return 'var(--accent)';
  if (s >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

function scoreBg(s) {
  if (s >= 70) return 'rgba(5,150,105,0.12)';
  if (s >= 40) return 'rgba(217,119,6,0.12)';
  return 'rgba(220,38,38,0.12)';
}

function diffColor(d) {
  if (d === 'easy') return { bg: 'rgba(5,150,105,0.12)', text: 'var(--accent)' };
  if (d === 'medium') return { bg: 'rgba(217,119,6,0.12)', text: 'var(--warning)' };
  return { bg: 'rgba(220,38,38,0.12)', text: 'var(--danger)' };
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
      <path d={dataPath} fill="rgba(45,140,255,0.15)" stroke="var(--accent)" strokeWidth={2} />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="var(--accent)" stroke="#fff" strokeWidth={2} />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
            {label}
          </text>
        );
      })}
      {/* Center score */}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 22, fontWeight: 800, fill: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>
        {avg}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 500, fill: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}>
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
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" fontSize={size * 0.22} fontWeight={800} style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: "'Inter', sans-serif" }}>
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

  // Top-level tab: practice | code-solver | design-solver — persist in URL
  const urlView = new URLSearchParams(window.location.search).get('view');
  const [activeView, setActiveViewState] = useState(urlView || 'practice');
  const setActiveView = (view) => {
    setActiveViewState(view);
    const url = new URL(window.location);
    if (view === 'practice') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    window.history.replaceState({}, '', url);
  };

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
  const timerRef = useRef(null);
  const textareaRef = useRef(null);
  const challengeStartRef = useRef(0);
  const endChallengeRef = useRef(null);

  // Whiteboard state for system design practice
  const whiteboardState = useWhiteboardState(questions.length || 10);
  const [sdGenerating, setSdGenerating] = useState(false);

  // Timer countdown is now handled by the shared InterviewTimer component.
  // The onExpire callback on InterviewTimer calls endChallengeRef.current().

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

  // Social proof (simulated)
  const socialCount = 1247 + Math.floor((new Date().getHours() * 37 + new Date().getMinutes()) % 300);

  const dimValues = DIMENSION_KEYS.map(k => stats.dimensions?.[k] || 0);

  // Score trend for sparkline
  const scoreTrend = (stats.history || []).slice(0, 10).map(h => h.score).reverse();

  // Results stats
  const finalAvgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="practice-root" style={{ background: 'transparent', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ═══════════ Main Content ═══════════ */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ── View Tabs — compact bar ── */}
        <div className="flex items-center gap-4 px-4 sm:px-6 py-2 border-b border-[var(--border)]" style={{ background: 'var(--bg-surface)', flexShrink: 0 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Practice</h1>
          <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {[
              { key: 'practice', label: 'Mock Interview', icon: <Icon name="play" size={12} /> },
              { key: 'code-solver', label: 'Code Solver', icon: <Icon name="code" size={12} /> },
              { key: 'design-solver', label: 'Design Solver', icon: <Icon name="systemDesign" size={12} /> },
              { key: 'sql-editor', label: 'SQL Editor', icon: <Icon name="database" size={12} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: activeView === tab.key ? 'var(--accent)' : 'transparent',
                  color: activeView === tab.key ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {/* Reset button — clears problem + solution from localStorage */}
          {(activeView === 'code-solver' || activeView === 'design-solver' || activeView === 'sql-editor') && (
            <button
              onClick={() => {
                ['chundu_current_problem', 'chundu_loaded_problem', 'chundu_current_solution', 'chundu_eraser_diagram'].forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto"
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

        {/* ── SQL Editor View — fills remaining height ── */}
        {activeView === 'sql-editor' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
              <SQLPlayground />
            </Suspense>
          </div>
        )}

        {/* ── Mock Interview content — scrollable ── */}
        {activeView === 'practice' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* ── SETUP PHASE (Mock Interview) ── */}
          {phase === 'setup' && (
            <>

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
                        <span className="practice-mono" style={{ fontWeight: 700, color: s >= 70 ? 'var(--success)' : '#94a3b8' }}>{s}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: colors[cat], width: `${Math.max(s, 2)}%`, opacity: s > 0 ? 1 : 0.2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Challenge Configuration */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'none', marginBottom: 24 }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <h2 className="practice-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Start a Challenge</h2>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  {/* Mode cards */}
                  <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'block' }}>Mode</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                      {MODES.map(m => (
                        <button key={m.id} onClick={() => setMode(m.id)} style={{ padding: '16px 18px', borderRadius: 14, border: mode === m.id ? '2px solid var(--accent)' : '1px solid var(--border)', background: mode === m.id ? 'var(--accent-subtle)' : 'var(--bg-surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: mode === m.id ? 'var(--accent)' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name={m.icon} size={14} style={{ color: mode === m.id ? '#fff' : '#94a3b8' }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: mode === m.id ? 'var(--accent)' : 'var(--text-primary)' }}>{m.label}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.5 }}>{m.desc}</p>
                          <span className="practice-mono" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{formatTime(m.time)} / {m.questions}q</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category + Difficulty */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
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
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'block' }}>Company Focus</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {COMPANIES.map(c => (
                        <button key={c.id} onClick={() => setCompany(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: company === c.id ? `2px solid ${c.color}` : '1px solid var(--border)', background: company === c.id ? `${c.color}0d` : 'var(--bg-surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: company === c.id ? c.color : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: 'inline-block' }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA Footer */}
                <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <button onClick={() => startChallenge()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 36px', background: 'linear-gradient(135deg, var(--accent), var(--accent))', color: '#fff', fontSize: 15, fontWeight: 700, borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', boxShadow: 'none', transition: 'transform 0.15s, box-shadow 0.15s' }}>
                    <Icon name="play" size={16} style={{ color: '#fff' }} />
                    Start Challenge
                  </button>
                </div>
              </div>

              {/* Challenge History */}
              {stats.history && stats.history.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 className="practice-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Challenge History</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {scoreTrend.length >= 2 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score trend</span>
                          <Sparkline data={scoreTrend} width={80} height={24} />
                        </div>
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
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, color: 'var(--danger)', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
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
                        <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'none' }}>
                          <button onClick={() => setExpandedHistory(expandedHistory === i ? null : i)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                            <Icon name={catIcon(h.category || 'coding')} size={18} style={{ color: 'var(--text-muted)' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{catLabel(h.category || 'coding')}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99, background: hDC.bg, color: hDC.text }}>{h.difficulty || 'medium'}</span>
                                {companyObj && companyObj.id !== 'all' && (
                                  <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 99, background: `${companyObj.color}15`, color: companyObj.color }}>{companyObj.label}</span>
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
                  <InterviewTimer
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
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: diffColor(questions[currentIdx].difficulty).bg, color: diffColor(questions[currentIdx].difficulty).text }}>{questions[currentIdx].difficulty}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{catLabel(category)}</span>
                  {questions[currentIdx].companies?.slice(0, 3).map(co => {
                    const coObj = COMPANIES.find(c => c.id === co);
                    return coObj ? (
                      <span key={co} style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: `${coObj.color}10`, color: coObj.color }}>{coObj.label}</span>
                    ) : null;
                  })}
                  {questions[currentIdx].topics?.slice(0, 2).map(t => (
                    <span key={t} style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, background: 'rgba(124,58,237,0.12)', color: 'var(--accent)' }}>{t}</span>
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
                      <div key={i} style={{ fontSize: 11, color: '#c0c5ce', lineHeight: '22.1px', fontFamily: "'Source Code Pro', monospace", userSelect: 'none' }}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={answers[currentIdx]}
                    onChange={(e) => { const newA = [...answers]; newA[currentIdx] = e.target.value; setAnswers(newA); }}
                    placeholder="Write your solution here... (pseudocode or real code)"
                    style={{ width: '100%', minHeight: 220, padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: "'Source Code Pro', monospace", background: 'var(--bg-surface)', lineHeight: '22.1px', tabSize: 2 }}
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
                  { label: 'Data Flow', icon: 'gitBranch', color: '#06b6d4', placeholder: 'Request path, data pipeline...' },
                  { label: 'Layered Design', icon: 'server', color: 'var(--text-muted)', placeholder: 'API layer, business logic, storage...' },
                  { label: 'Scalability', icon: 'trendingUp', color: 'var(--text-muted)', placeholder: 'Sharding, replication, CDN, load balancing...' },
                  { label: 'Trade-offs', icon: 'scale', color: 'var(--danger)', placeholder: 'CAP, consistency vs availability...' },
                ];
                const parts = (answers[currentIdx] || '').split('---SECTION---');

                const autoGenerate = async () => {
                  console.log('[AutoGenerate] clicked, starting...');
                  const q = questions[currentIdx];
                  if (!q) { console.error('[AutoGenerate] No question found'); return; }
                  setSdGenerating(true);
                  try {
                    const res = await fetch(`${API_URL}/api/solve/stream`, {
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

                const getDiagramForQuestion = (questionText) => {
                  const q = questionText.toLowerCase();
                  // Most specific matches first to avoid false positives
                  if (q.includes('payment') || q.includes('wallet') || q.includes('transaction') || q.includes('billing'))
                    return 'flowchart TD\n  A[Client] --> B[API Gateway]\n  B --> C[Payment Service]\n  C --> D[Idempotency Check / Redis]\n  C --> E[Ledger Service]\n  E --> F[PostgreSQL]\n  C --> G[Payment Processor / Stripe]\n  C --> H[Fraud Detection]\n  H --> I[ML Model]\n  C --> J[Kafka]\n  J --> K[Settlement Service]\n  J --> L[Notification Service]\n  B --> M[Wallet Service]\n  M --> F';
                  if (q.includes('youtube') || q.includes('video streaming') || q.includes('netflix') || q.includes('twitch'))
                    return 'flowchart TD\n  A[Client App] --> B[CDN]\n  B --> C[API Gateway]\n  C --> D[Video Upload Service]\n  C --> E[Video Streaming Service]\n  D --> F[Transcoding Pipeline]\n  F --> G[Object Storage / S3]\n  E --> G\n  C --> H[Search Service]\n  H --> I[Elasticsearch]\n  C --> J[Recommendation Engine]\n  J --> K[ML Model]\n  C --> L[User Service]\n  L --> M[PostgreSQL]\n  F --> N[Message Queue]';
                  if (q.includes('chat') || q.includes('messaging') || q.includes('whatsapp') || q.includes('slack') || q.includes('discord'))
                    return 'flowchart TD\n  A[Client App] --> B[WebSocket Gateway]\n  B --> C[Connection Manager]\n  C --> D[Message Router]\n  D --> E[Message Queue / Kafka]\n  E --> F[Message Storage]\n  F --> G[Cassandra]\n  D --> H[Presence Service]\n  H --> I[Redis]\n  C --> J[Group Service]\n  J --> K[PostgreSQL]\n  D --> L[Push Notification]\n  L --> M[APNS / FCM]';
                  if (q.includes('uber') || q.includes('ride') || q.includes('delivery') || q.includes('doordash') || q.includes('lyft'))
                    return 'flowchart TD\n  A[Rider App] --> B[API Gateway]\n  C[Driver App] --> B\n  B --> D[Trip Service]\n  B --> E[Matching Service]\n  E --> F[Location Service]\n  F --> G[Redis Geospatial]\n  D --> H[PostgreSQL]\n  B --> I[Pricing Service]\n  B --> J[Payment Service]\n  J --> K[Stripe]\n  F --> L[Kafka]\n  L --> M[ETA Service]';
                  if (q.includes('twitter') || q.includes('feed') || q.includes('social') || q.includes('instagram') || q.includes('facebook') || q.includes('tiktok'))
                    return 'flowchart TD\n  A[Client App] --> B[API Gateway]\n  B --> C[Post Service]\n  C --> D[Fan-out Service]\n  D --> E[Redis Feed Cache]\n  B --> F[Timeline Service]\n  F --> E\n  C --> G[PostgreSQL]\n  B --> H[Search Service]\n  H --> I[Elasticsearch]\n  D --> J[Kafka]\n  J --> K[Notification Service]\n  B --> L[Media Service]\n  L --> M[CDN / S3]';
                  if (q.includes('url') || q.includes('shortener') || q.includes('bit.ly') || q.includes('tiny'))
                    return 'flowchart TD\n  A[Client] --> B[API Gateway]\n  B --> C[URL Service]\n  C --> D[ID Generator]\n  C --> E[Redis Cache]\n  C --> F[PostgreSQL]\n  B --> G[Redirect Service]\n  G --> E\n  G --> F\n  B --> H[Analytics Service]\n  H --> I[Kafka]\n  I --> J[ClickHouse]';
                  if (q.includes('rate limit'))
                    return 'flowchart TD\n  A[Client] --> B[Load Balancer]\n  B --> C[Rate Limiter]\n  C --> D[Token Bucket / Redis]\n  C --> E[API Router]\n  E --> F[Auth Service]\n  E --> G[Service A]\n  E --> H[Service B]\n  G --> I[Database]\n  H --> I\n  C --> J[Metrics]\n  J --> K[Prometheus]';
                  if (q.includes('search') || q.includes('yelp') || q.includes('google maps'))
                    return 'flowchart TD\n  A[Client] --> B[API Gateway]\n  B --> C[Search Service]\n  C --> D[Elasticsearch]\n  B --> E[Geospatial Service]\n  E --> F[PostGIS / Redis]\n  B --> G[Ranking Service]\n  G --> H[ML Model]\n  C --> I[Index Builder]\n  I --> J[Kafka]\n  J --> D\n  B --> K[Review Service]\n  K --> L[PostgreSQL]';
                  if (q.includes('e-commerce') || q.includes('shopping') || q.includes('shopify') || q.includes('amazon'))
                    return 'flowchart TD\n  A[Client] --> B[CDN]\n  B --> C[API Gateway]\n  C --> D[Product Catalog]\n  D --> E[Elasticsearch]\n  C --> F[Cart Service]\n  F --> G[Redis]\n  C --> H[Order Service]\n  H --> I[PostgreSQL]\n  C --> J[Payment Service]\n  J --> K[Stripe]\n  H --> L[Kafka]\n  L --> M[Inventory Service]\n  L --> N[Notification Service]';
                  if (q.includes('dropbox') || q.includes('drive') || q.includes('file') || q.includes('storage'))
                    return 'flowchart TD\n  A[Client App] --> B[API Gateway]\n  B --> C[File Metadata Service]\n  C --> D[PostgreSQL]\n  B --> E[Upload Service]\n  E --> F[Chunk Manager]\n  F --> G[Object Storage / S3]\n  B --> H[Sync Service]\n  H --> I[WebSocket Notifications]\n  H --> J[Redis Pub/Sub]\n  B --> K[Sharing Service]\n  K --> D\n  F --> L[Dedup Service]';
                  if (q.includes('notification') || q.includes('push'))
                    return 'flowchart TD\n  A[Service Trigger] --> B[Notification Service]\n  B --> C[Priority Router]\n  C --> D[Template Engine]\n  D --> E[Email / SES]\n  D --> F[Push / FCM / APNS]\n  D --> G[SMS / Twilio]\n  B --> H[User Preferences]\n  H --> I[PostgreSQL]\n  B --> J[Kafka]\n  J --> K[Rate Limiter]\n  K --> L[Delivery Workers]\n  L --> M[Delivery Tracking]';
                  if (q.includes('leaderboard') || q.includes('ranking') || q.includes('top k'))
                    return 'flowchart TD\n  A[Client] --> B[API Gateway]\n  B --> C[Score Ingestion]\n  C --> D[Kafka]\n  D --> E[Aggregation Service]\n  E --> F[Redis Sorted Sets]\n  B --> G[Leaderboard API]\n  G --> F\n  E --> H[PostgreSQL]\n  B --> I[User Service]\n  I --> H\n  G --> J[CDN Cache]';
                  if (q.includes('zoom') || q.includes('video call') || q.includes('conference'))
                    return 'flowchart TD\n  A[Client App] --> B[Signaling Server / WebSocket]\n  B --> C[Session Manager]\n  C --> D[Redis]\n  A --> E[Media Server / SFU]\n  E --> F[TURN / STUN Server]\n  B --> G[Room Service]\n  G --> H[PostgreSQL]\n  E --> I[Recording Service]\n  I --> J[Object Storage / S3]\n  B --> K[Chat Service]\n  K --> L[Kafka]\n  G --> M[Scheduling Service]';
                  if (q.includes('api gateway') || q.includes('gateway'))
                    return 'flowchart TD\n  A[Client] --> B[Load Balancer]\n  B --> C[API Gateway]\n  C --> D[Auth / JWT Validation]\n  C --> E[Rate Limiter / Redis]\n  C --> F[Request Router]\n  F --> G[Service Discovery]\n  F --> H[Service A]\n  F --> I[Service B]\n  F --> J[Service C]\n  H --> K[Database]\n  C --> L[Logging / Tracing]\n  L --> M[Prometheus / Grafana]';
                  // Generic fallback
                  return 'flowchart TD\n  A[Client] --> B[Load Balancer]\n  B --> C[API Gateway]\n  C --> D[Auth Service]\n  C --> E[Core Service]\n  E --> F[Redis Cache]\n  E --> G[PostgreSQL]\n  E --> H[Message Queue]\n  H --> I[Worker Service]\n  I --> G\n  C --> J[Search / Analytics]\n  E --> K[Object Storage]';
                };

                const handleLoadAIDiagram = async () => {
                  const q = questions[currentIdx];
                  const questionText = `${q.q}: ${q.desc}`;
                  // Always return a problem-specific diagram immediately
                  return getDiagramForQuestion(questionText);
                };

                return (
                  <div style={{ marginBottom: 8 }}>
                    {/* Auto-generate button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <button onClick={autoGenerate} disabled={sdGenerating} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: sdGenerating ? 'var(--text-muted)' : 'var(--accent)', background: sdGenerating ? 'var(--bg-elevated)' : 'rgba(139,92,246,0.1)', border: `1px solid ${sdGenerating ? 'var(--border)' : 'rgba(139,92,246,0.25)'}`, borderRadius: 8, cursor: sdGenerating ? 'wait' : 'pointer' }}>
                        {sdGenerating ? (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating...</>
                        ) : (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> Auto Generate Answers</>
                        )}
                      </button>
                    </div>

                    <div style={{ height: 'calc(100dvh - 280px)', minHeight: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <Allotment defaultSizes={[45, 55]}>
                        {/* Left: Excalidraw Whiteboard */}
                        <Allotment.Pane minSize={320}>
                          <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>Loading whiteboard...</div>}>
                              <ExcalidrawWhiteboard
                                key={currentIdx}
                                initialElements={whiteboardState.getScene(currentIdx)}
                                onChange={(elements) => whiteboardState.saveScene(currentIdx, elements)}
                                onLoadAIDiagram={handleLoadAIDiagram}
                              />
                            </Suspense>
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
                    <div style={{ marginTop: 14, padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)' }}>
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
                        <div style={{ marginTop: 8, padding: 14, background: 'var(--accent-subtle)', borderRadius: 10, fontSize: 13, color: 'var(--accent-hover)', lineHeight: 1.6, fontFamily: category === 'coding' ? "'Source Code Pro', monospace" : 'inherit', whiteSpace: 'pre-wrap' }}>
                          {inlineEval.modelAnswer}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next button */}
                  <div style={{ marginTop: 16 }}>
                    <button onClick={moveToNext} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent))', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  <button onClick={submitAnswer} disabled={evaluating} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent))', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: evaluating ? 'wait' : 'pointer', opacity: evaluating ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {evaluating ? (
                      <><Icon name="loader" size={14} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /> Evaluating...</>
                    ) : 'Submit Answer'}
                  </button>
                  <button onClick={skipQuestion} disabled={evaluating} style={{ padding: '10px 20px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    Skip
                  </button>
                  <button onClick={() => endChallenge()} disabled={evaluating} style={{ padding: '10px 20px', background: 'rgba(220,38,38,0.1)', color: 'var(--danger)', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid rgba(220,38,38,0.25)', cursor: evaluating ? 'not-allowed' : 'pointer', marginLeft: 'auto', opacity: evaluating ? 0.5 : 1 }}>
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
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: 20, padding: '40px 32px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                {/* Decorative grid */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Score ring + grade */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <ScoreRing value={finalAvgScore} size={160} strokeW={12} animated />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{finalAvgScore}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor, marginTop: 2 }}>Grade {grade}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{passed}/{total}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Passed</div>
                      </div>
                      <div style={{ width: 1, height: 28, background: '#334155' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{catLabel(category)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{difficulty}</div>
                      </div>
                    </div>
                  </div>

                  {/* Radar */}
                  {resultDimensions && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
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
                  <button onClick={() => { setPhase('setup'); setStats(getStats()); setInlineEval(null); }} style={{ padding: '11px 22px', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}>
                    Back to Dashboard
                  </button>
                  <button onClick={startChallenge} style={{ padding: '11px 22px', background: 'linear-gradient(135deg, var(--accent), var(--accent))', color: '#fff', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', boxShadow: 'none', transition: 'all 0.2s' }}>
                    Try Again
                  </button>
                  <button onClick={() => { setDifficulty('medium'); setPhase('setup'); setStats(getStats()); }} style={{ padding: '11px 22px', background: 'rgba(139,92,246,0.15)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
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
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: '18px 22px', marginBottom: 20 }}>
                  <h3 className="practice-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="lightbulb" size={15} style={{ color: 'var(--text-muted)' }} />
                    Focus Areas
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[...new Set(aiModelAnswers.flatMap(a => a.improvementTips || []))].slice(0, 5).map((tip, i) => (
                      <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '5px 12px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', fontWeight: 500 }}>
                        {tip}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Question Breakdown ── */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'none' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 className="practice-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Question Breakdown</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{passed} of {total} passed</span>
                </div>
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
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: pass ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)', color: pass ? 'var(--accent)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
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
                          <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: '#cbd5e1' }} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 24px 20px 60px' }}>
                          {answers[i] && (
                            <div style={{ marginBottom: 14, padding: 14, background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: category === 'coding' ? "'Source Code Pro', monospace" : 'inherit', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>
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
                                <div style={{ marginTop: 8, padding: 14, background: 'var(--accent-subtle)', borderRadius: 10, border: '1px solid rgba(45,140,255,0.25)', fontSize: 12, color: 'var(--accent-hover)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
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
            );
          })()}

            </div>
          </div>
        )}

      </div>

      {/* ═══════════ Styles ═══════════ */}
      <style>{`
        .practice-root { -webkit-font-smoothing: antialiased; font-family: 'Inter', system-ui, sans-serif; }
        .practice-display { font-family: 'Inter', system-ui, sans-serif; }
        .practice-mono { font-family: 'Source Code Pro', monospace; }
        textarea:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(45,140,255,0.1); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
