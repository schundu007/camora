import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { codingTopics } from '../../data/capra/topics/codingTopics.js';
import { systemDesignTopics } from '../../data/capra/topics/systemDesignTopics.js';
import { lldTopics } from '../../data/capra/topics/lldTopics.js';
import { databaseTopics } from '../../data/capra/topics/databaseTopics.js';
import { sqlTopics } from '../../data/capra/topics/sqlTopics.js';
import { behavioralTopics } from '../../data/capra/topics/behavioralTopics.js';
import { projectTopics } from '../../data/capra/topics/projectTopics.js';
import { microservicesPatterns } from '../../data/capra/topics/microservicesPatterns.js';

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

function getCompleted(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem('ascend_completed_topics') || '{}');
  } catch {
    return {};
  }
}

function getStarred(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem('ascend_starred_topics') || '{}');
  } catch {
    return {};
  }
}

export default function PrepPlanPage() {
  useEffect(() => {
    document.title = 'My Plan | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const [completed, setCompleted] = useState(getCompleted);
  const [starred] = useState(getStarred);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handler = () => setCompleted(getCompleted());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Compute stats
  const allTopics = CATEGORIES.flatMap(c => c.topics);
  const totalTopics = allTopics.length;
  const completedCount = allTopics.filter(t => completed[t.id]).length;
  const overallPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
  const starredIds = Object.keys(starred).filter(k => starred[k]);
  const starredTopics = allTopics.filter(t => starredIds.includes(t.id));

  // Find next uncompleted topics per category
  const nextTopics = CATEGORIES.map(cat => {
    const next = cat.topics.find(t => !completed[t.id]);
    return next ? { category: cat, topic: next } : null;
  }).filter(Boolean).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">My Study Plan</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Track your interview preparation progress across all topics.</p>
          </div>

          {/* Overall Progress Card */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="text-center">
                <p className="text-4xl font-bold text-[var(--accent)]">{overallPct}%</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Complete</p>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Overall Progress</span>
                  <span className="text-sm text-[var(--text-muted)]">{completedCount} / {totalTopics} topics</span>
                </div>
                <div className="h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totalTopics}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Total Topics</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{completedCount}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Completed</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totalTopics - completedCount}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Remaining</p>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{starredIds.length}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Starred</p>
            </div>
          </div>

          {/* Continue Studying — next uncompleted topics */}
          {nextTopics.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Continue Studying</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nextTopics.map((item: any) => (
                  <Link
                    key={item.topic.id}
                    to={`${item.category.href}?topic=${item.topic.id}`}
                    className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl hover:border-emerald-500/30 hover:bg-[var(--bg-elevated)] transition-all no-underline group"
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

          {/* Category Progress */}
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

          {/* Starred Topics */}
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

          {/* Quick Actions */}
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
