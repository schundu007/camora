import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import Chip from '../components/shared/ui/Chip';
import { getAuthHeaders } from '../utils/authHeaders';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import ReferralDashboard from '../components/capra/features/ReferralDashboard';
import GamificationWidget from '../components/capra/features/GamificationWidget';
import BadgeGrid from '../components/capra/features/BadgeGrid';
import Leaderboard from '../components/capra/features/Leaderboard';

// Billing reads/writes go to ascend-backend (single source of truth);
// CAPRA_API kept as separate constant for any non-billing capra endpoints.
const BILLING_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'referrals', label: 'Referrals' },
  { key: 'contributions', label: 'Contributions' },
];

const ALL_ROLES = [
  'Backend Engineering', 'Frontend Engineering', 'Full Stack', 'DevOps / SRE',
  'Data Engineering', 'ML / AI', 'Mobile', 'QA / Testing',
  'Engineering Manager', 'Solutions Architect', 'Cloud Engineer', 'Platform Engineer',
  'Security Engineering', 'Product Management', 'Technical Program Manager',
  'Site Reliability Engineering', 'Database Administration', 'Embedded Systems',
  'Game Development', 'Blockchain / Web3',
];

function PreferencesTab() {
  const { token } = useAuth();
  const [status, setStatus] = useState<{
    onboarding_completed: boolean;
    job_roles: string[];
    has_resume: boolean;
    resume_snippet: string | null;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [resumeTab, setResumeTab] = useState<'upload' | 'text'>('upload');
  const [resumeText, setResumeText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingText, setSavingText] = useState(false);
  const [resumeSaved, setResumeSaved] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${CAPRA_API}/api/onboarding/status`, {
      credentials: 'include',
      headers: getAuthHeaders() as unknown as Record<string, string>,
    })
      .then(r => r.json())
      .then(data => { setStatus(data); setSelectedRoles(data.job_roles || []); })
      .catch(console.error)
      .finally(() => setLoadingStatus(false));
  }, [token]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const res = await fetch(`${CAPRA_API}/api/onboarding/upload-resume`, {
        method: 'POST', credentials: 'include',
        headers: getAuthHeaders() as unknown as Record<string, string>,
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(prev => prev ? { ...prev, has_resume: true, resume_snippet: (data.text || '').slice(0, 200) } : prev);
        setResumeSaved(true);
        setTimeout(() => setResumeSaved(false), 3000);
      }
    } finally { setUploading(false); }
  };

  const handleSaveResumeText = async () => {
    if (!resumeText.trim()) return;
    setSavingText(true);
    try {
      const res = await fetch(`${CAPRA_API}/api/onboarding/save-resume-text`, {
        method: 'POST', credentials: 'include',
        headers: { ...(getAuthHeaders() as object), 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ resume_text: resumeText }),
      });
      if (res.ok) {
        setStatus(prev => prev ? { ...prev, has_resume: true, resume_snippet: resumeText.slice(0, 200) } : prev);
        setResumeSaved(true);
        setTimeout(() => setResumeSaved(false), 3000);
      }
    } finally { setSavingText(false); }
  };

  const handleSaveRoles = async () => {
    if (selectedRoles.length === 0) return;
    setSavingRoles(true);
    try {
      const res = await fetch(`${CAPRA_API}/api/onboarding/update-roles`, {
        method: 'POST', credentials: 'include',
        headers: { ...(getAuthHeaders() as object), 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ job_roles: selectedRoles }),
      });
      if (res.ok) {
        setStatus(prev => prev ? { ...prev, job_roles: selectedRoles } : prev);
        setRolesSaved(true);
        setTimeout(() => setRolesSaved(false), 3000);
      }
    } finally { setSavingRoles(false); }
  };

  const cardHeader = (title: string, badge?: React.ReactNode, saved?: boolean) => (
    <div className="px-5 py-3 flex items-center justify-between"
      style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
      <div className="flex items-center gap-3">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>{title}</h3>
        {badge}
      </div>
      {saved && <span className="text-[11px] font-bold" style={{ color: 'var(--success, #16a34a)' }}>Saved ✓</span>}
    </div>
  );

  if (loadingStatus) return (
    <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading preferences…</div>
  );

  return (
    <div className="space-y-6">
      {/* ── Job Roles ─────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {cardHeader('Job Roles', undefined, rolesSaved)}
        <div className="px-5 py-4">
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Select the roles you're actively interviewing for. Camora tailors AI coaching and practice questions to these tracks.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_ROLES.map(role => {
              const active = selectedRoles.includes(role);
              return (
                <button key={role} onClick={() => setSelectedRoles(prev => active ? prev.filter(r => r !== role) : [...prev, role])}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors border"
                  style={active
                    ? { background: 'var(--cam-primary)', color: '#fff', borderColor: 'var(--cam-primary)' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
                  }>
                  {role}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveRoles} disabled={savingRoles || selectedRoles.length === 0}
              className="px-4 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-50 transition-opacity"
              style={{ background: 'var(--cam-primary)' }}>
              {savingRoles ? 'Saving…' : 'Save Roles'}
            </button>
            {selectedRoles.length > 0 && (
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{selectedRoles.length} selected</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Resume ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {cardHeader(
          'Resume',
          status?.has_resume
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', borderColor: 'rgba(22,163,74,0.3)' }}>On file</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706', borderColor: 'rgba(217,119,6,0.3)' }}>Not uploaded</span>,
          resumeSaved,
        )}
        <div className="px-5 py-4">
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Your resume lets Sona give role-specific answers grounded in your actual experience.
          </p>
          {status?.has_resume && status.resume_snippet && (
            <div className="mb-4 p-3 rounded-lg text-[12px] font-mono" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {status.resume_snippet}…
            </div>
          )}
          <div className="flex gap-1 mb-4">
            {(['upload', 'text'] as const).map(t => (
              <button key={t} onClick={() => setResumeTab(t)}
                className="px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wide transition-colors"
                style={resumeTab === t
                  ? { background: 'var(--cam-primary)', color: '#fff' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                }>
                {t === 'upload' ? 'Upload File' : 'Paste Text'}
              </button>
            ))}
          </div>
          {resumeTab === 'upload' ? (
            <>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f); e.target.value = ''; } }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full py-10 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
                style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
                {uploading ? 'Uploading…' : '↑  Click to upload PDF, DOCX, or TXT  ·  max 5 MB'}
              </button>
            </>
          ) : (
            <>
              <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your full resume here…" rows={9}
                className="w-full p-3 rounded-lg text-[13px] resize-none outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <button onClick={handleSaveResumeText} disabled={savingText || !resumeText.trim()}
                className="mt-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--cam-primary)' }}>
                {savingText ? 'Saving…' : 'Save Resume'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Activity Heatmap ─────────────────────────────────── */
function ActivityHeatmap() {
  const [year, setYear] = useState('current');
  const weeks = 52;
  const days = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const cells = useMemo(() => Array.from({ length: weeks * 7 }, () => 0), [weeks]);
  const streakCurrent = 0;

  const getColor = (v: number) => {
    if (v === 0) return 'var(--bg-elevated)';
    if (v === 1) return 'color-mix(in oklab, var(--cam-primary) 20%, var(--bg-elevated))';
    if (v === 2) return 'color-mix(in oklab, var(--cam-primary) 40%, var(--bg-elevated))';
    if (v === 3) return 'color-mix(in oklab, var(--cam-primary) 65%, var(--bg-elevated))';
    return 'var(--cam-primary)';
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Activity</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.3)' }}>Coming soon</span>
        </div>
        <select value={year} onChange={e => setYear(e.target.value)} className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          <option value="current">Current</option>
          <option value="2025">2025</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5 min-w-[700px]">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 pr-2 pt-5">
            {days.map((d, i) => (
              <div key={i} className="h-[11px] text-[9px] text-[var(--text-muted)] leading-[11px]">{d}</div>
            ))}
          </div>
          {/* Weeks */}
          <div className="flex-1">
            {/* Month labels */}
            <div className="flex mb-1">
              {months.map(m => (
                <div key={m} className="flex-1 text-[9px] text-[var(--text-muted)]">{m}</div>
              ))}
            </div>
            <div className="flex gap-[2px]">
              {Array.from({ length: weeks }, (_, w) => (
                <div key={w} className="flex flex-col gap-[2px]">
                  {Array.from({ length: 7 }, (_, d) => {
                    const idx = w * 7 + d;
                    return (
                      <div key={d} className="w-[11px] h-[11px] rounded-[2px]" style={{ background: getColor(cells[idx] || 0) }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button className="text-xs text-[var(--text-muted)] px-3 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors">
          View recent activity
        </button>
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span>Current streak: <strong className="text-[var(--text-primary)]">{streakCurrent}</strong></span>
          <span>Longest streak: <strong className="text-[var(--text-primary)]">0</strong></span>
        </div>
      </div>
    </div>
  );
}

/* ── Subscription Card ────────────────────────────────── */
function SubscriptionCard() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BILLING_API}/api/v1/billing/subscription`, {
        credentials: 'include', headers: getAuthHeaders() as unknown as Record<string, string> });
        if (res.ok) setSub(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const openPortal = async () => {
    try {
      const res = await fetch(`${BILLING_API}/api/v1/billing/portal`, {
        credentials: 'include',
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'No billing account found') {
          window.location.href = '/pricing';
        }
      }
    } catch { /* ignore */ }
  };

  if (loading) return <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}><div className="h-5 bg-[var(--bg-elevated)] rounded w-40" /></div>;

  const endDate = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Subscription</h3>
        {endDate && sub?.status === 'active' && sub?.cancel_at_period_end && (
          <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ color: 'var(--warning-text)', background: 'var(--bg-elevated)', border: '1px solid var(--warning)' }}>
            Your access to premium content will end on {endDate}
          </span>
        )}
      </div>
      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{sub?.plan_type ? sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1) : 'Free'}</span>
        <div className="flex items-center gap-3">
          <button onClick={openPortal} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors font-medium">
            Subscription Details
          </button>
          {sub?.status === 'active' && (
            <button onClick={openPortal} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors font-medium">
              Cancel Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Profile Settings ─────────────────────────────────── */
const LANG_PREF_KEY = 'camora-lang-pref';

function ProfileSettings() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState(() => localStorage.getItem(LANG_PREF_KEY) || 'Python');
  const [langSaved, setLangSaved] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem(LANG_PREF_KEY, lang);
    window.dispatchEvent(new CustomEvent('camora-lang-change', { detail: lang }));
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Profile settings</h3>
        {langSaved && <span className="text-[11px] font-bold" style={{ color: 'var(--success, #16a34a)' }}>Saved ✓</span>}
      </div>
      <div className="divide-y divide-[var(--border)]">
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary)]">Theme</span>
          <select value={theme} onChange={e => setTheme(e.target.value as 'light' | 'dark')} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] min-w-[180px]">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary)]">Language preference</span>
          <select value={language} onChange={e => handleLanguageChange(e.target.value)} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] min-w-[180px]">
            {['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'C#', 'Ruby', 'Swift', 'Kotlin'].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Account ───────────────────────────────────── */
function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const { logout } = useAuth();

  const handleDelete = async () => {
    try {
      const res = await fetch(`${CAPRA_API}/api/v1/auth/account`, {
        credentials: 'include', method: 'DELETE', headers: getAuthHeaders() as unknown as Record<string, string> });
      if (res.ok) { logout(); window.location.href = '/'; }
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="px-5 py-3" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--danger)' }}>
        <h3 className="text-base font-bold" style={{ color: 'var(--danger)' }}>Delete Account</h3>
      </div>
      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">Once you delete your account, there is no going back.</span>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors font-medium">
            Delete your account
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="text-xs px-4 py-2 rounded-lg text-white font-medium transition-colors" style={{ background: 'var(--danger)' }}>
              Confirm Delete
            </button>
            <button onClick={() => setConfirming(false)} className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] font-medium">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Contributions Tab ────────────────────────────────── */
function ContributionsTab() {
  const [contributions] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Problem Contributions</h3>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              Share real practice questions you've encountered to help the community and earn 30% off your next payment per approved contribution.
            </p>
            <Link to="/capra/practice" className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors font-medium whitespace-nowrap">
              Contribute a Question
            </Link>
          </div>
          {/* Table */}
          <div className="rounded-xl overflow-hidden border border-[var(--border)]">
            <div className="grid grid-cols-5 gap-0 text-[10px] font-bold uppercase tracking-widest font-mono" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', color: 'var(--cam-primary)', opacity: 0.9 }}>
              <div className="px-4 py-2.5">Company</div>
              <div className="px-4 py-2.5">Role Level</div>
              <div className="px-4 py-2.5">Round Type</div>
              <div className="px-4 py-2.5">Status</div>
              <div className="px-4 py-2.5">Submitted</div>
            </div>
            {contributions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                You haven't contributed any questions yet
              </div>
            ) : (
              contributions.map((c, i) => (
                <div key={i} className="grid grid-cols-5 gap-0 text-sm border-t border-[var(--border)]">
                  <div className="px-4 py-2.5 text-[var(--text-primary)]">{c.company}</div>
                  <div className="px-4 py-2.5 text-[var(--text-muted)]">{c.role_level}</div>
                  <div className="px-4 py-2.5 text-[var(--text-muted)]">{c.round_type}</div>
                  <div className="px-4 py-2.5"><Chip variant={c.status === 'approved' ? 'success' : c.status === 'rejected' ? 'danger' : 'warning'}>{c.status}</Chip></div>
                  <div className="px-4 py-2.5 text-[var(--text-muted)]">{c.submitted}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const activeTab = params.get('tab') || 'general';

  const setTab = useCallback((tab: string) => {
    setParams(tab === 'general' ? {} : { tab });
  }, [setParams]);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { document.title = 'Profile — Camora'; return () => { document.title = 'Camora'; }; }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      <SiteNav variant="light" />

      {/* LeetCode hero — navy band w/ diagonal cut */}
      <section className="relative overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
        <div className="relative page-wrap pt-24 pb-16">
          <h1 className="text-3xl font-bold text-white">Your <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Profile</span></h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{user?.email || 'Manage account, achievements, and referrals'}</p>
        </div>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute left-0 bottom-0 w-full pointer-events-none" style={{ height: '5vh', display: 'block' }}>
          <polygon fill="var(--bg-app)" points="0,0 100,100 0,100" />
        </svg>
      </section>

      <div className="page-wrap pt-8 pb-20 flex-1 w-full">

        {/* Tabs */}
        <div className="tab-group mb-8">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tab-group-item${activeTab === t.key ? ' tab-group-item-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Account Information</h3>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Email</span>
                <span className="text-sm text-[var(--text-muted)] px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] min-w-[240px]">{user?.email || '—'}</span>
              </div>
            </div>

            <ActivityHeatmap />
            <SubscriptionCard />
            <ProfileSettings />
            <DeleteAccount />
          </div>
        )}

        {activeTab === 'preferences' && <PreferencesTab />}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <GamificationWidget />
            <BadgeGrid />
            <Leaderboard />
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-6">
            {/* Invite section */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Invite Friends to Get Free Access</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  For each friend that signs up and subscribes to Camora from your invite link, you get 30% off your next invoice and they get 30% off any plan.
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {['Each successful referral gives you 30% off your next invoice', 'Discounts stack across multiple billing cycles', 'Your friends also get 30% off their subscription'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in oklab, var(--cam-primary) 15%, var(--bg-surface))' }}>
                        <svg className="w-3 h-3" style={{ color: 'var(--cam-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Referral Dashboard (existing component) */}
            <ReferralDashboard />
          </div>
        )}

        {activeTab === 'contributions' && <ContributionsTab />}
      </div>

      <SiteFooter variant="light" />
    </div>
  );
}
