import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/shared/Icons.jsx';
import CamoraLogo from '../../components/shared/CamoraLogo';
import { getAuthHeaders } from '../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

/* ══════════════════════════════ Challenge Data ══════════════════════════════ */

const CHALLENGES = {
  coding: [
    { q: 'Two Sum', desc: 'Given an array of integers and a target, return indices of two numbers that add up to the target.', difficulty: 'easy' },
    { q: 'Valid Parentheses', desc: 'Given a string containing just (){}[], determine if the input string is valid.', difficulty: 'easy' },
    { q: 'Merge Two Sorted Lists', desc: 'Merge two sorted linked lists into one sorted list.', difficulty: 'easy' },
    { q: 'Best Time to Buy and Sell Stock', desc: 'Find the maximum profit from buying and selling a stock once.', difficulty: 'easy' },
    { q: 'LRU Cache', desc: 'Design a data structure that follows the Least Recently Used (LRU) cache eviction policy.', difficulty: 'medium' },
    { q: 'Merge Intervals', desc: 'Given an array of intervals, merge all overlapping intervals.', difficulty: 'medium' },
    { q: 'Group Anagrams', desc: 'Group strings that are anagrams of each other.', difficulty: 'medium' },
    { q: 'Binary Tree Level Order Traversal', desc: 'Return the level order traversal of a binary tree\'s nodes.', difficulty: 'medium' },
    { q: 'Word Search', desc: 'Given an m×n board and a word, find if the word exists in the grid.', difficulty: 'medium' },
    { q: 'Trapping Rain Water', desc: 'Given n non-negative integers representing an elevation map, compute how much water it can trap.', difficulty: 'hard' },
    { q: 'Median of Two Sorted Arrays', desc: 'Find the median of two sorted arrays in O(log(m+n)) time.', difficulty: 'hard' },
    { q: 'Serialize and Deserialize Binary Tree', desc: 'Design an algorithm to serialize and deserialize a binary tree.', difficulty: 'hard' },
  ],
  'system-design': [
    { q: 'Design a URL Shortener', desc: 'Design a service like bit.ly that shortens URLs and redirects.', difficulty: 'easy' },
    { q: 'Design a Rate Limiter', desc: 'Design a distributed rate limiting system for an API.', difficulty: 'medium' },
    { q: 'Design a Chat Application', desc: 'Design a real-time messaging system like WhatsApp or Slack.', difficulty: 'medium' },
    { q: 'Design a Notification System', desc: 'Design a multi-channel notification service (push, email, SMS).', difficulty: 'medium' },
    { q: 'Design Twitter/X', desc: 'Design a social media feed with follow, post, and timeline features.', difficulty: 'hard' },
    { q: 'Design YouTube', desc: 'Design a video streaming platform with upload, transcode, and playback.', difficulty: 'hard' },
    { q: 'Design a Distributed Cache', desc: 'Design a high-throughput caching layer like Redis or Memcached.', difficulty: 'hard' },
    { q: 'Design a Payment Gateway', desc: 'Design a reliable payment processing system with idempotency.', difficulty: 'hard' },
  ],
  behavioral: [
    { q: 'Tell me about yourself', desc: 'Craft a compelling 2-minute personal narrative for an engineering role.', difficulty: 'easy' },
    { q: 'Describe a technical challenge', desc: 'Walk through a difficult engineering problem you solved.', difficulty: 'medium' },
    { q: 'Conflict with a teammate', desc: 'Describe a time you had a disagreement with a colleague and how you resolved it.', difficulty: 'medium' },
    { q: 'Failed project', desc: 'Tell me about a project that didn\'t go as planned and what you learned.', difficulty: 'medium' },
    { q: 'Leadership example', desc: 'Describe a time you led a team or initiative without formal authority.', difficulty: 'medium' },
    { q: 'Handling ambiguity', desc: 'Tell me about a time you had to make a decision with incomplete information.', difficulty: 'hard' },
    { q: 'Production incident', desc: 'Walk through a critical production incident and how you handled it.', difficulty: 'hard' },
    { q: 'Prioritization under pressure', desc: 'Describe how you prioritize when everything is urgent.', difficulty: 'hard' },
  ],
};

const MODES = [
  { id: 'quickfire', label: 'Quick Fire', time: 300, questions: 5, icon: 'lightning' },
  { id: 'deepdive', label: 'Deep Dive', time: 900, questions: 3, icon: 'target' },
  { id: 'mock', label: 'Mock Interview', time: 2700, questions: 8, icon: 'timer' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const CATEGORIES = ['coding', 'system-design', 'behavioral'];

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
  } catch {}
  return { totalCompleted: 0, streak: 0, lastChallengeDate: null, categories: { coding: { scores: [], avgTime: 0 }, 'system-design': { scores: [], avgTime: 0 }, behavioral: { scores: [], avgTime: 0 } }, history: [] };
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

function pickQuestions(category, difficulty, count) {
  let pool = CHALLENGES[category] || [];
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

function scoreBehavioral(answer) {
  if (!answer || answer.trim().length < 20) return 0;
  const lower = answer.toLowerCase();
  let score = 20; // base for attempting
  if (lower.length > 100) score += 15;
  if (lower.length > 250) score += 10;
  // STAR method detection
  if (/situation|context|background/i.test(lower)) score += 15;
  if (/task|goal|objective|responsible/i.test(lower)) score += 10;
  if (/action|did|implemented|built|created|led/i.test(lower)) score += 15;
  if (/result|outcome|impact|learned|improved|increased|reduced/i.test(lower)) score += 15;
  return Math.min(100, score);
}

/* ══════════════════════════════ Readiness Ring ══════════════════════════════ */

function ReadinessRing({ value, size = 120 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="#111827" fontSize={size * 0.25} fontWeight={700} style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {value}%
      </text>
    </svg>
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
  const timerRef = useRef(null);
  const textareaRef = useRef(null);

  // Timer
  useEffect(() => {
    if (phase === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); endChallenge(); return 0; }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const startChallenge = useCallback(() => {
    const modeConfig = MODES.find(m => m.id === mode);
    const qs = pickQuestions(category, difficulty, modeConfig.questions);
    if (qs.length === 0) return;
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers(new Array(qs.length).fill(''));
    setScores([]);
    setAiFeedback([]);
    setTimeLeft(modeConfig.time);
    setQuestionStartTime(Date.now());
    setPhase('active');
  }, [mode, category, difficulty]);

  const submitAnswer = useCallback(async () => {
    const q = questions[currentIdx];
    const answer = answers[currentIdx];
    let score = 0;
    let feedback = '';

    setEvaluating(true);

    if (category === 'behavioral') {
      score = scoreBehavioral(answer);
      feedback = score >= 70 ? 'Good STAR structure!' : score >= 40 ? 'Try to include all STAR elements: Situation, Task, Action, Result.' : 'Your response needs more detail. Use the STAR method.';
    } else {
      // Use AI to evaluate coding/system-design answers
      try {
        const evalPrompt = category === 'coding'
          ? `Problem: ${q.q} — ${q.desc}\n\nCandidate's answer:\n${answer}\n\nEvaluate this answer on a scale of 0-100. Consider: correct approach (40%), time/space complexity awareness (20%), code completeness (20%), edge cases (20%). Return ONLY a JSON object: {"score": number, "feedback": "one sentence"}`
          : `System Design Problem: ${q.q} — ${q.desc}\n\nCandidate's answer:\n${answer}\n\nEvaluate this answer on a scale of 0-100. Consider: key components identified (30%), scalability addressed (25%), trade-offs discussed (25%), clarity (20%). Return ONLY a JSON object: {"score": number, "feedback": "one sentence"}`;

        const resp = await fetch(API_URL + '/api/solve/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ problem: evalPrompt, provider: 'claude', language: 'auto', detailLevel: 'basic', ascendMode: 'coding' }),
        });

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
              } catch {}
            }
          }
        }

        if (result) {
          const text = result.code || result.pitch || '';
          const jsonMatch = text.match(/\{[\s\S]*"score"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              score = Math.min(100, Math.max(0, parsed.score || 0));
              feedback = parsed.feedback || '';
            } catch {}
          }
        }
        if (!score && answer.trim().length > 20) {
          score = 30; // fallback: gave an attempt
          feedback = 'Could not evaluate automatically. Partial credit given.';
        }
      } catch {
        score = answer.trim().length > 20 ? 30 : 0;
        feedback = 'Evaluation unavailable. Partial credit given for attempt.';
      }
    }

    setEvaluating(false);
    setScores(prev => [...prev, score]);
    setAiFeedback(prev => [...prev, feedback]);

    // Move to next or end
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setQuestionStartTime(Date.now());
      if (textareaRef.current) textareaRef.current.focus();
    } else {
      endChallenge([...scores, score]);
    }
  }, [currentIdx, questions, answers, category, scores]);

  const skipQuestion = useCallback(() => {
    setScores(prev => [...prev, 0]);
    setAiFeedback(prev => [...prev, 'Skipped']);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setQuestionStartTime(Date.now());
    } else {
      endChallenge([...scores, 0]);
    }
  }, [currentIdx, questions, scores]);

  const endChallenge = useCallback((finalScores) => {
    clearInterval(timerRef.current);
    const s = finalScores || scores;
    const modeConfig = MODES.find(m => m.id === mode);
    const totalTime = modeConfig.time - timeLeft;
    const avgScore = s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;

    // Update stats
    const newStats = { ...stats };
    newStats.totalCompleted += 1;

    // Streak
    const today = new Date().toISOString().split('T')[0];
    const lastDate = newStats.lastChallengeDate;
    if (lastDate) {
      const diff = (new Date(today) - new Date(lastDate)) / 86400000;
      newStats.streak = diff <= 1 ? newStats.streak + 1 : 1;
    } else {
      newStats.streak = 1;
    }
    newStats.lastChallengeDate = today;

    // Category scores
    if (!newStats.categories[category]) newStats.categories[category] = { scores: [], avgTime: 0 };
    newStats.categories[category].scores.push(avgScore);
    if (newStats.categories[category].scores.length > 20) newStats.categories[category].scores = newStats.categories[category].scores.slice(-20);
    newStats.categories[category].avgTime = totalTime;

    // History
    newStats.history.unshift({
      date: today,
      category,
      mode,
      difficulty,
      score: avgScore,
      timeSpent: totalTime,
      questionCount: questions.length,
    });
    if (newStats.history.length > 50) newStats.history = newStats.history.slice(0, 50);

    saveStats(newStats);
    setStats(newStats);
    setPhase('results');
  }, [scores, mode, timeLeft, stats, category, difficulty, questions]);

  const readiness = getReadiness(stats);
  const modeConfig = MODES.find(m => m.id === mode);
  const timerPercent = modeConfig ? (timeLeft / modeConfig.time) * 100 : 100;
  const timerColor = timerPercent > 50 ? '#10b981' : timerPercent > 20 ? '#f59e0b' : '#ef4444';

  return (
    <div className="practice-root" style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* ═══════════ Nav ═══════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)', height: '56px' }}>
        <div className="max-w-[85%] xl:max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
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

      {/* ═══════════ Main Content ═══════════ */}
      <div style={{ paddingTop: 56 }}>
        <div className="max-w-[85%] xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: 32, paddingBottom: 80 }}>

          {/* ── SETUP PHASE ── */}
          {phase === 'setup' && (
            <>
              {/* Readiness Dashboard */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
                <ReadinessRing value={readiness} size={130} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h1 className="practice-display" style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Interview Readiness</h1>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Test yourself, track progress, get interview-ready.</p>
                  {/* Category bars */}
                  {CATEGORIES.map(cat => {
                    const s = getCategoryScore(stats, cat);
                    const label = cat === 'system-design' ? 'System Design' : cat === 'coding' ? 'Coding' : 'Behavioral';
                    return (
                      <div key={cat} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 }}>
                          <span>{label}</span><span>{s}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444', width: `${s}%`, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Stats */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'Completed', value: stats.totalCompleted, icon: 'check' },
                    { label: 'Streak', value: `${stats.streak}d`, icon: 'lightning' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '12px 16px', background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12 }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenge Config */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <h2 className="practice-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Start a Challenge</h2>

                {/* Mode */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Mode</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {MODES.map(m => (
                      <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: mode === m.id ? '2px solid #10b981' : '1px solid #e3e8ee', background: mode === m.id ? '#ecfdf5' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: mode === m.id ? '#059669' : '#111827' }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{formatTime(m.time)} · {m.questions} questions</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Category</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CATEGORIES.map(c => {
                      const label = c === 'system-design' ? 'System Design' : c === 'coding' ? 'Coding' : 'Behavioral';
                      return (
                        <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 18px', borderRadius: 20, border: category === c ? '1px solid #10b981' : '1px solid #e3e8ee', background: category === c ? '#ecfdf5' : '#fff', color: category === c ? '#059669' : '#4b5563', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Difficulty */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Difficulty</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {DIFFICULTIES.map(d => (
                      <button key={d} onClick={() => setDifficulty(d)} style={{ padding: '8px 18px', borderRadius: 20, border: difficulty === d ? '1px solid #10b981' : '1px solid #e3e8ee', background: difficulty === d ? '#ecfdf5' : '#fff', color: difficulty === d ? '#059669' : '#4b5563', fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>{d}</button>
                    ))}
                  </div>
                </div>

                <button onClick={startChallenge} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                  <Icon name="play" size={16} style={{ color: '#fff' }} />
                  Start Challenge
                </button>
              </div>

              {/* History */}
              {stats.history.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24 }}>
                  <h2 className="practice-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Challenge History</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e3e8ee' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Category</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Mode</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Score</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.history.slice(0, 10).map((h, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', color: '#374151' }}>{h.date}</td>
                            <td style={{ padding: '10px 12px', color: '#374151', textTransform: 'capitalize' }}>{h.category.replace('-', ' ')}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{MODES.find(m => m.id === h.mode)?.label || h.mode}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: h.score >= 70 ? '#ecfdf5' : h.score >= 40 ? '#fffbeb' : '#fef2f2', color: h.score >= 70 ? '#059669' : h.score >= 40 ? '#d97706' : '#dc2626' }}>{h.score}%</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{formatTime(h.timeSpent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ACTIVE PHASE ── */}
          {phase === 'active' && questions[currentIdx] && (
            <div>
              {/* Timer */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="practice-mono" style={{ fontSize: 22, fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: timerColor, width: `${timerPercent}%`, transition: 'width 1s linear, background 0.5s' }} />
                </div>
              </div>

              {/* Question */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: questions[currentIdx].difficulty === 'easy' ? '#ecfdf5' : questions[currentIdx].difficulty === 'medium' ? '#fffbeb' : '#fef2f2', color: questions[currentIdx].difficulty === 'easy' ? '#059669' : questions[currentIdx].difficulty === 'medium' ? '#d97706' : '#dc2626' }}>
                    {questions[currentIdx].difficulty}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{category.replace('-', ' ')}</span>
                </div>
                <h2 className="practice-display" style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
                  {questions[currentIdx].q}
                </h2>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{questions[currentIdx].desc}</p>
              </div>

              {/* Answer area */}
              <textarea
                ref={textareaRef}
                value={answers[currentIdx]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[currentIdx] = e.target.value;
                  setAnswers(newAnswers);
                }}
                placeholder={category === 'coding' ? 'Write your solution here... (pseudocode or real code)' : category === 'behavioral' ? 'Write your STAR response here...\n\nSituation:\nTask:\nAction:\nResult:' : 'Describe your system design...\n\nComponents:\nData flow:\nScalability:\nTrade-offs:'}
                className="practice-mono"
                style={{ width: '100%', minHeight: 200, padding: 16, borderRadius: 12, border: '1px solid #e3e8ee', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: category === 'coding' ? "'IBM Plex Mono', monospace" : 'inherit', background: '#fafafa', lineHeight: 1.7 }}
                autoFocus
              />

              {/* Controls */}
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={submitAnswer} disabled={evaluating} style={{ padding: '10px 24px', background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none', cursor: evaluating ? 'wait' : 'pointer', opacity: evaluating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {evaluating ? 'Evaluating...' : 'Submit Answer'}
                </button>
                <button onClick={skipQuestion} disabled={evaluating} style={{ padding: '10px 20px', background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid #e3e8ee', cursor: 'pointer' }}>
                  Skip
                </button>
                <button onClick={() => endChallenge()} style={{ padding: '10px 20px', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 500, borderRadius: 10, border: '1px solid #fecaca', cursor: 'pointer', marginLeft: 'auto' }}>
                  End Session
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === 'results' && (
            <div>
              {/* Score card */}
              <div style={{ textAlign: 'center', padding: 32, background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, marginBottom: 24 }}>
                <div className="practice-display" style={{ fontSize: 48, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                  {scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0}%
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
                  {scores.filter(s => s >= 60).length}/{scores.length} passed · {category.replace('-', ' ')} · {difficulty}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <button onClick={() => { setPhase('setup'); setStats(getStats()); }} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid #e3e8ee', cursor: 'pointer' }}>Back to Dashboard</button>
                  <button onClick={startChallenge} style={{ padding: '10px 24px', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer' }}>Try Again</button>
                </div>
              </div>

              {/* Per-question breakdown */}
              <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 16, padding: 24 }}>
                <h3 className="practice-display" style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Question Breakdown</h3>
                {questions.map((q, i) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < questions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{i + 1}. {q.q}</span>
                      <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: (scores[i] || 0) >= 60 ? '#ecfdf5' : '#fef2f2', color: (scores[i] || 0) >= 60 ? '#059669' : '#dc2626' }}>
                        {scores[i] || 0}%
                      </span>
                    </div>
                    {aiFeedback[i] && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>{aiFeedback[i]}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════ Footer ═══════════ */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #e3e8ee', padding: '24px 0' }}>
        <div className="max-w-[85%] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 22, height: 22, background: '#10b981', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="ascend" size={11} style={{ color: '#fff' }} />
              </div>
              <span className="practice-display" style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Camora</span>
            </Link>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              {[
                { label: 'Apply', href: '/jobs' },
                { label: 'Prepare', href: '/capra/prepare' },
                { label: 'Practice', href: '/capra/practice' },
                { label: 'Attend', href: '/lumora' },
                { label: 'Pricing', href: '/pricing' },
              ].map(link => (
                <Link key={link.label} to={link.href} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}>{link.label}</Link>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>&copy; {new Date().getFullYear()} Camora by Cariara</p>
          </div>
        </div>
      </footer>

      {/* ═══════════ Styles ═══════════ */}
      <style>{`
        .practice-root { -webkit-font-smoothing: antialiased; font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .practice-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .practice-mono { font-family: 'IBM Plex Mono', 'Menlo', monospace; }
        .nav-link:hover { color: #111827 !important; background: #f3f4f6; }
        textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
      `}</style>
    </div>
  );
}
