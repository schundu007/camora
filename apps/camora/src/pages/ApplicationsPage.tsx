import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import {
  fetchApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  APPLICATION_STATUSES,
  type JobApplication,
  type ApplicationStatus,
} from '../lib/jobsearch-api';
import TailorDocsModal from '../components/jobsearch/TailorDocsModal';
import JobsSubNav from '../components/jobsearch/JobsSubNav';
import { T, CX, banner } from '../components/jobsearch/theme';

/**
 * Application tracker — a status board over the user's tracked applications.
 * Themed with camora CSS tokens (not Tailwind dark:) so it reads in both
 * light and dark. Move a card via its dropdown; add manually; delete; tailor.
 */

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  drafting: 'Drafting',
  ready: 'Ready',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

export default function ApplicationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', company: '', job_url: '' });
  const [tailoring, setTailoring] = useState<JobApplication | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApps(await fetchApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) load();
    else if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, load]);

  const byStatus = useMemo(() => {
    const groups: Record<ApplicationStatus, JobApplication[]> = {
      saved: [], drafting: [], ready: [], applied: [],
      interviewing: [], offer: [], rejected: [],
    };
    for (const a of apps) (groups[a.status] || groups.saved).push(a);
    return groups;
  }, [apps]);

  const onAdd = async () => {
    if (!draft.title.trim() && !draft.company.trim()) {
      setError('Give the application at least a title or company.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const created = await createApplication({
        title: draft.title.trim() || null,
        company: draft.company.trim() || null,
        job_url: draft.job_url.trim() || null,
        status: 'saved',
      });
      setApps((prev) => [created, ...prev]);
      setDraft({ title: '', company: '', job_url: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add application');
    } finally {
      setAdding(false);
    }
  };

  const onMove = async (app: JobApplication, status: ApplicationStatus) => {
    const prev = apps;
    setApps((cur) => cur.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      await updateApplication(app.id, { status });
    } catch (e) {
      setApps(prev);
      setError(e instanceof Error ? e.message : 'Failed to move application');
    }
  };

  const onDelete = async (app: JobApplication) => {
    const prev = apps;
    setApps((cur) => cur.filter((a) => a.id !== app.id));
    try {
      await deleteApplication(app.id);
    } catch (e) {
      setApps(prev);
      setError(e instanceof Error ? e.message : 'Failed to delete application');
    }
  };

  const onApplied = async (app: JobApplication) => {
    const applied_at = new Date().toISOString();
    const prev = apps;
    setApps((cur) =>
      cur.map((a) => (a.id === app.id ? { ...a, status: 'applied', applied_at } : a)),
    );
    try {
      await updateApplication(app.id, { status: 'applied', applied_at });
    } catch (e) {
      setApps(prev);
      throw e; // surfaced by the modal; keeps it open
    }
  };

  if (!authLoading && !user) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center" style={T.body}>
          <p style={T.muted}>Please sign in to track your applications.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <div style={T.pageBg}>
      <SiteNav />
      <JobsSubNav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-6">
          <h1 className="text-2xl" style={T.pageTitle}>Application tracker</h1>
          <p className="mt-1 text-sm" style={T.muted}>
            {apps.length} application{apps.length === 1 ? '' : 's'} tracked.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={banner('error')}>{error}</div>
        )}

        {/* Add form */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input className={CX.input} style={T.input} placeholder="Role / title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <input className={CX.input} style={T.input} placeholder="Company" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
          <input className={CX.input} style={T.input} placeholder="Job URL (optional)" value={draft.job_url} onChange={(e) => setDraft((d) => ({ ...d, job_url: e.target.value }))} />
          <button onClick={onAdd} disabled={adding} className="rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-60" style={T.primaryBtn}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {loading ? (
          <p style={T.muted}>Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {APPLICATION_STATUSES.map((status) => (
              <div key={status} className="rounded-xl p-3" style={T.columnBg}>
                <h2 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-text)' }}>
                  {STATUS_LABELS[status]}
                  <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}>
                    {byStatus[status].length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {byStatus[status].map((app) => (
                    <div key={app.id} className="rounded-lg p-3" style={T.card}>
                      <p className="text-sm font-medium" style={T.heading}>{app.title || 'Untitled role'}</p>
                      {app.company && <p className="text-xs" style={T.muted}>{app.company}</p>}
                      {app.job_url && (
                        <a href={app.job_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs hover:underline" style={T.accentText}>
                          View posting →
                        </a>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <select
                          className="flex-1 rounded px-2 py-1 text-xs"
                          style={T.input}
                          value={app.status}
                          onChange={(e) => onMove(app, e.target.value as ApplicationStatus)}
                        >
                          {APPLICATION_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <button onClick={() => onDelete(app)} className="rounded px-2 py-1 text-xs hover:opacity-80" style={T.muted} aria-label="Delete application" data-tip="Delete">
                          ✕
                        </button>
                      </div>
                      <button onClick={() => setTailoring(app)} className="mt-2 w-full rounded px-2 py-1 text-xs font-medium" style={T.subtleBtn}>
                        Tailor CV
                      </button>
                    </div>
                  ))}
                  {byStatus[status].length === 0 && <p className="text-xs" style={T.muted}>—</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {tailoring && (
        <TailorDocsModal
          application={tailoring}
          onClose={() => setTailoring(null)}
          onGenerated={() => {
            if (tailoring.status === 'saved') onMove(tailoring, 'drafting');
          }}
          onMarkApplied={() => onApplied(tailoring)}
        />
      )}
      <SiteFooter />
    </div>
  );
}
