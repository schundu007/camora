import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAuthHeaders } from '../../utils/authHeaders.js';
import { codingTopics } from '../../data/capra/topics/codingTopics.js';
import { systemDesignTopics } from '../../data/capra/topics/systemDesignTopics.js';
import { lldTopics } from '../../data/capra/topics/lldTopics.js';
import { databaseTopics } from '../../data/capra/topics/databaseTopics.js';
import { sqlTopics } from '../../data/capra/topics/sqlTopics.js';
import { behavioralTopics } from '../../data/capra/topics/behavioralTopics.js';
import { projectTopics } from '../../data/capra/topics/projectTopics.js';
import { microservicesPatterns } from '../../data/capra/topics/microservicesPatterns.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

/* ─── Category definitions ─────────────────────────────────── */

const CATEGORIES = [
  { id: 'coding', label: 'DSA & Algorithms', icon: '⚡', color: '#10b981', href: '/capra/prepare/coding', topics: codingTopics },
  { id: 'system-design', label: 'System Design', icon: '🏗', color: '#6366f1', href: '/capra/prepare/system-design', topics: systemDesignTopics },
  { id: 'microservices', label: 'Microservices', icon: '🔗', color: '#8b5cf6', href: '/capra/prepare/microservices', topics: microservicesPatterns },
  { id: 'databases', label: 'Databases', icon: '🗄', color: '#f59e0b', href: '/capra/prepare/databases', topics: databaseTopics },
  { id: 'sql', label: 'SQL', icon: '📊', color: '#06b6d4', href: '/capra/prepare/sql', topics: sqlTopics },
  { id: 'low-level', label: 'Low-Level Design', icon: '🧩', color: '#ec4899', href: '/capra/prepare/low-level-design', topics: lldTopics },
  { id: 'projects', label: 'Projects', icon: '🛠', color: '#8b5cf6', href: '/capra/prepare/projects', topics: projectTopics },
  { id: 'behavioral', label: 'Behavioral', icon: '💬', color: '#14b8a6', href: '/capra/prepare/behavioral', topics: behavioralTopics },
];

/* ─── Local storage helpers ─────────────────────────────────── */

function getCompleted(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('ascend_completed_topics') || '{}'); } catch { return {}; }
}

function getStarred(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('ascend_starred_topics') || '{}'); } catch { return {}; }
}

/* ─── Interview countdown types ────────────────────────────── */

interface CountdownData {
  has_interview: boolean;
  interview_date?: string;
  target_company?: string;
  target_role?: string;
  days_remaining?: number;
  completion_pct?: number;
}

/* ─── Component ────────────────────────────────────────────── */

export default function PrepPlanPage() {
  useEffect(() => {
    document.title = 'My Plan | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const [completed, setCompleted] = useState(getCompleted);
  const [starred] = useState(getStarred);

  // Interview countdown state
  const [countdown, setCountdown] = useState<CountdownData | null>(null);
  const [countdownLoading, setCountdownLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handler = () => setCompleted(getCompleted());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Fetch interview countdown
  const fetchCountdown = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/interview/countdown`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) { setCountdown(null); return; }
      const json = await res.json();
      setCountdown(json.has_interview ? json : null);
    } catch {
      setCountdown(null);
    } finally {
      setCountdownLoading(false);
    }
  }, []);

  useEffect(() => { fetchCountdown(); }, [fetchCountdown]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewDate || !targetCompany.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/interview/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          interview_date: interviewDate,
          target_company: targetCompany.trim(),
          target_role: targetRole.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Setup failed');
      setShowSetup(false);
      setInterviewDate('');
      setTargetCompany('');
      setTargetRole('');
      setCountdownLoading(true);
      fetchCountdown();
    } catch { /* keep form open */ }
    finally { setSubmitting(false); }
  }

  async function clearCountdown() {
    if (!confirm('Clear your interview date and prep plan tasks?')) return;
    try {
      await fetch(`${API_URL}/api/interview/plan`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      setCountdown(null);
    } catch { /* ignore */ }
  }

  // Compute stats
  const allTopics = CATEGORIES.flatMap(c => c.topics);
  const totalTopics = allTopics.length;
  const completedCount = allTopics.filter(t => completed[t.id]).length;
  const overallPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
  const starredIds = Object.keys(starred).filter(k => starred[k]);
  const starredTopics = allTopics.filter(t => starredIds.includes(t.id));

  // Next uncompleted topics per category
  const nextTopics = CATEGORIES.map(cat => {
    const next = cat.topics.find(t => !completed[t.id]);
    return next ? { category: cat, topic: next } : null;
  }).filter(Boolean).slice(0, 4);

  // Progress ring
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPct / 100) * circumference;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ── Header ───────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">My Plan</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Your personalized interview preparation tracker.
            </p>
          </div>

          {/* ── Interview Countdown / Setup ───────────────── */}
          {!countdownLoading && (
            countdown ? (
              /* Active countdown */
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {countdown.target_company} Interview
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {countdown.target_role ? `${countdown.target_role} \u2022 ` : ''}
                        {countdown.interview_date
                          ? new Date(countdown.interview_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                          : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearCountdown}
                    className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-indigo-500">{countdown.days_remaining}</span>
                    <span className="text-sm text-[var(--text-muted)]">{countdown.days_remaining === 1 ? 'day' : 'days'} left</span>
                  </div>
                  {(countdown.days_remaining ?? 0) <= 7 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                      Final stretch!
                    </span>
                  )}
                  {(countdown.days_remaining ?? 0) === 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      Interview day!
                    </span>
                  )}
                </div>
              </div>
            ) : !showSetup ? (
              /* No countdown — CTA to set one */
              <button
                onClick={() => setShowSetup(true)}
                className="w-full bg-[var(--bg-surface)] border border-dashed border-[var(--border)] rounded-2xl p-5 mb-6 text-left hover:border-indigo-500/40 hover:bg-[var(--bg-elevated)] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Set Your Interview Date</p>
                      <p className="text-xs text-[var(--text-muted)]">Add a countdown timer to track your preparation</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-indigo-500 group-hover:translate-x-0.5 transition-transform">
                    Set date &rarr;
                  </span>
                </div>
              </button>
            ) : (
              /* Inline setup form */
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Set Your Interview Date</p>
                  <button onClick={() => setShowSetup(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Cancel</button>
                </div>
                <form onSubmit={handleSetup} className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor="plan-date" className="block text-xs font-medium text-[var(--text-muted)] mb-1">Date</label>
                    <input id="plan-date" type="date" min={today} value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" required />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor="plan-company" className="block text-xs font-medium text-[var(--text-muted)] mb-1">Company</label>
                    <input id="plan-company" type="text" placeholder="e.g. Google" value={targetCompany} onChange={e => setTargetCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" required />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor="plan-role" className="block text-xs font-medium text-[var(--text-muted)] mb-1">Role (optional)</label>
                    <input id="plan-role" type="text" placeholder="e.g. Senior SDE" value={targetRole} onChange={e => setTargetRole(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                    {submitting ? 'Saving...' : 'Set Date'}
                  </button>
                </form>
              </div>
            )
          )}

          {/* ── Overall Progress ──────────────────────────── */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-8 flex-wrap">
              {/* Progress ring */}
              <div className="relative flex-shrink-0">
                <svg width="104" height="104" viewBox="0 0 104 104">
                  <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle
                    cx="52" cy="52" r={radius}
                    fill="none"
                    stroke={overallPct === 100 ? '#10b981' : '#6366f1'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 52 52)"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: overallPct === 100 ? '#10b981' : 'var(--accent)' }}>{overallPct}%</span>
                  <span className="text-[10px] text-[var(--text-muted)]">complete</span>
                </div>
              </div>

              {/* Stats + progress bar */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Overall Progress</span>
                  <span className="text-sm text-[var(--text-muted)]">{completedCount} / {totalTopics} topics</span>
                </div>
                <div className="h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%`, background: overallPct === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #818cf8)' }}
                  />
                </div>
                {/* Mini stat row */}
                <div className="flex gap-6">
                  <div>
                    <p className="text-xl font-bold text-emerald-500">{completedCount}</p>
                    <p className="text-xs text-[var(--text-muted)]">Done</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{totalTopics - completedCount}</p>
                    <p className="text-xs text-[var(--text-muted)]">Remaining</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-500">{starredIds.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Starred</p>
                  </div>
                </div>
              </div>
            </div>

            {overallPct === 100 && (
              <div className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 rounded-xl">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-semibold text-emerald-600">All topics complete — you're ready!</span>
              </div>
            )}
          </div>

          {/* ── Continue Studying ─────────────────────────── */}
          {nextTopics.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Continue Studying</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nextTopics.map((item: any) => (
                  <Link
                    key={item.topic.id}
                    to={`${item.category.href}?topic=${item.topic.id}`}
                    className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl hover:border-indigo-500/30 hover:bg-[var(--bg-elevated)] transition-all no-underline group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.category.color}15` }}>
                      <span className="text-base">{item.category.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">{item.topic.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.category.label}</p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Category Progress ─────────────────────────── */}
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Progress by Category</h2>
          <div className="space-y-2 mb-6">
            {CATEGORIES.map(cat => {
              const catTotal = cat.topics.length;
              const catDone = cat.topics.filter(t => completed[t.id]).length;
              const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;

              return (
                <Link
                  key={cat.id}
                  to={cat.href}
                  className="flex items-center gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-all no-underline group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}15` }}>
                    <span className="text-base">{cat.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{cat.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{catDone}/{catTotal}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${catPct}%`, background: cat.color }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold w-10 text-right" style={{ color: catPct === 100 ? '#10b981' : 'var(--text-muted)' }}>
                    {catPct}%
                  </span>
                </Link>
              );
            })}
          </div>

          {/* ── Starred Topics ────────────────────────────── */}
          {starredTopics.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Starred Topics</h2>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                {starredTopics.slice(0, 10).map(topic => {
                  const cat = CATEGORIES.find(c => c.topics.some(t => t.id === topic.id));
                  return (
                    <Link
                      key={topic.id}
                      to={cat ? `${cat.href}?topic=${topic.id}` : '/capra/prepare'}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors no-underline group"
                    >
                      <span className="text-amber-500 text-sm">★</span>
                      <span className={`flex-1 text-sm ${completed[topic.id] ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'} group-hover:text-[var(--accent)] transition-colors`}>
                        {topic.title}
                      </span>
                      {cat && <span className="text-xs text-[var(--text-muted)]">{cat.label}</span>}
                      {completed[topic.id] && (
                        <span className="text-xs text-emerald-500 font-medium">Done</span>
                      )}
                    </Link>
                  );
                })}
                {starredTopics.length > 10 && (
                  <div className="px-4 py-2 text-xs text-[var(--text-muted)] text-center">
                    +{starredTopics.length - 10} more starred topics
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Quick Actions ─────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/capra/practice"
              className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl hover:border-emerald-500/30 transition-all no-underline group"
            >
              <span className="text-lg">🎯</span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">Practice Problems</p>
                <p className="text-xs text-[var(--text-muted)]">Solve coding challenges</p>
              </div>
            </Link>
            <Link
              to="/capra/achievements"
              className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl hover:border-amber-500/30 transition-all no-underline group"
            >
              <span className="text-lg">🏆</span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-amber-500 transition-colors">Achievements</p>
                <p className="text-xs text-[var(--text-muted)]">View your badges</p>
              </div>
            </Link>
            <Link
              to="/capra/prepare"
              className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl hover:border-indigo-500/30 transition-all no-underline group"
            >
              <span className="text-lg">📚</span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-indigo-500 transition-colors">All Topics</p>
                <p className="text-xs text-[var(--text-muted)]">Browse study material</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
