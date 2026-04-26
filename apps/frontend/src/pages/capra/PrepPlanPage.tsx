import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../../utils/authHeaders.js';
import { dialogConfirm } from '../../components/shared/Dialog';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface Task {
  id: string;
  title: string;
  type: string;
  completed: boolean;
  link?: string;
}

interface DayPlan {
  day: number;
  focus: string;
  tasks: Task[];
}

interface PlanData {
  interview_date: string;
  target_company: string;
  target_role: string;
  days_remaining: number;
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
  plan: DayPlan[];
}

export default function PrepPlanPage() {
  useEffect(() => {
    document.title = 'Prep Plan | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/interview/plan`, {
        credentials: 'include',
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setData(null);
          return;
        }
        throw new Error('Failed to load plan');
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  async function toggleTask(taskId: string) {
    if (togglingTask) return;
    setTogglingTask(taskId);

    try {
      const res = await fetch(`${API_URL}/api/interview/progress`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (!res.ok) throw new Error('Failed to update progress');

      // Optimistically toggle the task locally, then refresh
      setData((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated.plan = updated.plan.map((day) => ({
          ...day,
          tasks: day.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        }));
        // Recalculate counts
        let completed = 0;
        let total = 0;
        updated.plan.forEach((day) => {
          day.tasks.forEach((t) => {
            total++;
            if (t.completed) completed++;
          });
        });
        updated.completed_tasks = completed;
        updated.total_tasks = total;
        updated.completion_pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return updated;
      });
    } catch {
      // Refresh on error to get server state
      fetchPlan();
    } finally {
      setTogglingTask(null);
    }
  }

  async function clearPlan() {
    if (!(await dialogConfirm({ title: 'Clear your prep plan?', message: 'This will permanently remove your plan. This action cannot be undone.', confirmLabel: 'Clear plan', tone: 'danger' }))) return;
    setClearing(true);
    try {
      const res = await fetch(`${API_URL}/api/interview/plan`, {
        credentials: 'include',
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Failed to clear plan');
      navigate('/capra/prepare');
    } catch {
      setClearing(false);
    }
  }

  // Map task types to practice page links
  function getTaskLink(task: Task): string | undefined {
    if (task.link) return task.link;
    const typeMap: Record<string, string> = {
      coding: '/capra/practice',
      'system-design': '/capra/prepare/system-design',
      behavioral: '/capra/prepare/behavioral',
      databases: '/capra/prepare/databases',
      sql: '/capra/prepare/sql',
      microservices: '/capra/prepare/microservices',
      'low-level-design': '/capra/prepare/low-level-design',
    };
    return typeMap[task.type];
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="pt-20 pb-12 px-4 lg:max-w-[85%] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-[var(--bg-elevated)] rounded w-64" />
            <div className="h-4 bg-[var(--bg-elevated)] rounded w-40" />
            <div className="h-32 bg-[var(--bg-elevated)] rounded-2xl" />
            <div className="h-32 bg-[var(--bg-elevated)] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="pt-20 pb-12 px-4 lg:max-w-[85%] mx-auto text-center">
          <p className="text-sm text-red-500 mt-8">{error}</p>
          <Link to="/capra/prepare" className="text-sm text-[var(--accent)] hover:underline mt-4 inline-block">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <div className="pt-20 pb-12 px-4 lg:max-w-[85%] mx-auto text-center">
          <div className="mt-16">
            <p className="text-[var(--text-secondary)] text-sm">No prep plan set up yet.</p>
            <Link
              to="/capra/prepare"
              className="inline-block mt-4 px-5 py-2.5 bg-[var(--accent)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { interview_date, target_company, target_role, days_remaining, completion_pct, completed_tasks, total_tasks, plan } = data;
  const formattedDate = new Date(interview_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pt-20 pb-12 px-4">
        <div className="lg:max-w-[85%] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {target_company} Interview Prep
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {target_role ? `${target_role} \u2022 ` : ''}{formattedDate}
              </p>
            </div>
            <button
              onClick={clearPlan}
              disabled={clearing}
              className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear plan'}
            </button>
          </div>

          {/* Progress summary */}
          <div className="mt-6 bg-[var(--bg-surface)] border-0 rounded-2xl p-5">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Days remaining */}
              <div className="text-center">
                <p className="text-3xl font-bold text-[var(--accent)]">{days_remaining}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{days_remaining === 1 ? 'day left' : 'days left'}</p>
              </div>

              {/* Progress bar */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Overall Progress</span>
                  <span className="text-sm font-semibold text-[var(--accent)]">{completion_pct}%</span>
                </div>
                <div className="h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${completion_pct}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{completed_tasks} of {total_tasks} tasks completed</p>
              </div>
            </div>
          </div>

          {/* Day sections */}
          <div className="mt-8 space-y-5">
            {plan.map((day) => {
              const dayCompleted = day.tasks.filter((t) => t.completed).length;
              const dayTotal = day.tasks.length;
              const allDone = dayCompleted === dayTotal && dayTotal > 0;

              return (
                <div key={day.day} className="bg-[var(--bg-surface)] border-0 rounded-2xl overflow-hidden">
                  {/* Day header */}
                  <div className={`px-5 py-3 border-b border-[var(--border)] flex items-center justify-between ${allDone ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg-elevated)]'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${allDone ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                        Day {day.day}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">&mdash; {day.focus}</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{dayCompleted}/{dayTotal}</span>
                  </div>

                  {/* Tasks */}
                  <div className="divide-y divide-[var(--border)]">
                    {day.tasks.map((task) => {
                      const link = getTaskLink(task);
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTask(task.id)}
                            disabled={togglingTask === task.id}
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              task.completed
                                ? 'bg-[var(--accent)] border-[var(--accent)]'
                                : 'border-[var(--border)] hover:border-[var(--accent)]'
                            } ${togglingTask === task.id ? 'opacity-50' : ''}`}
                            aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                          >
                            {task.completed && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* Title */}
                          <span className={`flex-1 text-sm ${task.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                            {task.title}
                          </span>

                          {/* Practice link */}
                          {link && (
                            <Link
                              to={link}
                              className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex-shrink-0"
                            >
                              Practice &rarr;
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link to="/capra/prepare" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              &larr; Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
