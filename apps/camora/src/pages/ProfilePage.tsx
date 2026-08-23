import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
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

interface Resume { id: number; filename: string; is_active: boolean; uploaded_at: string; }

const MAX_RESUMES = 5;

function PreferencesTab() {
  const { token } = useAuth();
  const [status, setStatus] = useState<{
    onboarding_completed: boolean;
    job_roles: string[];
    has_resume: boolean;
    resume_snippet: string | null;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeTab, setResumeTab] = useState<'upload' | 'text'>('upload');
  const [resumeText, setResumeText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingText, setSavingText] = useState(false);
  const [resumeSaved, setResumeSaved] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAddResume, setShowAddResume] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>('');
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rolesInitialized = useRef(false);
  const rolesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${CAPRA_API}/api/onboarding/status`, {
        credentials: 'include',
        headers: getAuthHeaders() as unknown as Record<string, string>,
      }).then(r => r.json()),
      fetch(`${CAPRA_API}/api/onboarding/resumes`, {
        credentials: 'include',
        headers: getAuthHeaders() as unknown as Record<string, string>,
      }).then(r => r.ok ? r.json() : []),
    ])
      .then(([statusData, resumesData]) => {
        const roles: string[] = statusData.job_roles || [];
        setStatus(statusData);
        setSelectedRoles(roles);
        setPrimaryRole(roles[0] || '');
        setResumes(resumesData);
        rolesInitialized.current = true;
      })
      .catch(console.error)
      .finally(() => setLoadingStatus(false));
  }, [token]);

  // Auto-save roles whenever selection or primary changes (debounced, skip initial load)
  useEffect(() => {
    if (!rolesInitialized.current) return;
    if (rolesDebounceRef.current) clearTimeout(rolesDebounceRef.current);
    rolesDebounceRef.current = setTimeout(async () => {
      if (selectedRoles.length === 0) return;
      setSavingRoles(true);
      const ordered = primaryRole && selectedRoles.includes(primaryRole)
        ? [primaryRole, ...selectedRoles.filter(r => r !== primaryRole)]
        : selectedRoles;
      try {
        const res = await fetch(`${CAPRA_API}/api/onboarding/update-roles`, {
          method: 'POST', credentials: 'include',
          headers: { ...(getAuthHeaders() as object), 'Content-Type': 'application/json' } as Record<string, string>,
          body: JSON.stringify({ job_roles: ordered }),
        });
        if (res.ok) {
          setStatus(prev => prev ? { ...prev, job_roles: ordered } : prev);
          setRolesSaved(true);
          setTimeout(() => setRolesSaved(false), 2500);
        }
      } finally { setSavingRoles(false); }
    }, 700);
    return () => { if (rolesDebounceRef.current) clearTimeout(rolesDebounceRef.current); };
  }, [selectedRoles, primaryRole]);

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
        setResumes(prev => [
          { id: data.resume_id, filename: file.name, is_active: true, uploaded_at: new Date().toISOString() },
          ...prev.map(r => ({ ...r, is_active: false })),
        ]);
        setResumeSaved(true);
        setShowAddResume(false);
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
        const data = await res.json();
        setStatus(prev => prev ? { ...prev, has_resume: true, resume_snippet: resumeText.slice(0, 200) } : prev);
        setResumes(prev => [
          { id: data.resume_id, filename: data.filename, is_active: true, uploaded_at: new Date().toISOString() },
          ...prev.map(r => ({ ...r, is_active: false })),
        ]);
        setResumeText('');
        setResumeSaved(true);
        setShowAddResume(false);
        setTimeout(() => setResumeSaved(false), 3000);
      }
    } finally { setSavingText(false); }
  };

  const handleActivateResume = async (id: number) => {
    setActivatingId(id);
    try {
      const res = await fetch(`${CAPRA_API}/api/onboarding/resumes/${id}/activate`, {
        method: 'POST', credentials: 'include',
        headers: getAuthHeaders() as unknown as Record<string, string>,
      });
      if (res.ok) setResumes(prev => prev.map(r => ({ ...r, is_active: r.id === id })));
    } finally { setActivatingId(null); }
  };

  const handleDeleteResume = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${CAPRA_API}/api/onboarding/resumes/${id}`, {
        method: 'DELETE', credentials: 'include',
        headers: getAuthHeaders() as unknown as Record<string, string>,
      });
      if (res.ok) {
        const wasActive = resumes.find(r => r.id === id)?.is_active ?? false;
        const remaining = resumes.filter(r => r.id !== id);
        if (remaining.length === 0) {
          setStatus(prev => prev ? { ...prev, has_resume: false, resume_snippet: null } : prev);
          setResumes([]);
        } else if (wasActive) {
          setResumes(remaining.map((r, i) => ({ ...r, is_active: i === 0 })));
        } else {
          setResumes(remaining);
        }
      }
    } finally { setDeletingId(null); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const cardHeader = (title: string, badge?: React.ReactNode, saving?: boolean, saved?: boolean) => (
    <div className="px-5 py-3 flex items-center justify-between"
      style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
      <div className="flex items-center gap-3">
        <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>{title}</h3>
        {badge}
      </div>
      {saving && <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Saving…</span>}
      {!saving && saved && <span className="text-[12px] font-bold" style={{ color: 'var(--success, #16a34a)' }}>Saved ✓</span>}
    </div>
  );

  if (loadingStatus) return (
    <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading preferences…</div>
  );

  const atMax = resumes.length >= MAX_RESUMES;

  return (
    <div className="space-y-6">
      {/* ── Job Roles ─────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {cardHeader('Job Roles', undefined, savingRoles, rolesSaved)}
        <div className="px-5 py-4">
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Select the roles you're actively interviewing for. Camora tailors AI coaching and practice questions to these tracks.
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_ROLES.map(role => {
              const active = selectedRoles.includes(role);
              const isPrimary = role === primaryRole;
              return (
                <button
                  key={role}
                  onClick={() => {
                    if (active) {
                      const next = selectedRoles.filter(r => r !== role);
                      setSelectedRoles(next);
                      if (isPrimary) setPrimaryRole(next[0] || '');
                    } else {
                      const next = [...selectedRoles, role];
                      setSelectedRoles(next);
                      if (next.length === 1) setPrimaryRole(role);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors border flex items-center gap-1.5"
                  style={isPrimary
                    ? { background: 'var(--cam-gold-leaf)', color: '#020617', borderColor: 'var(--cam-gold-leaf)' }
                    : active
                      ? { background: 'var(--cam-primary)', color: '#fff', borderColor: 'var(--cam-primary)' }
                      : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
                  }>
                  {isPrimary && <span style={{ fontSize: '12px' }}>★</span>}
                  {role}
                </button>
              );
            })}
          </div>

          {/* Primary role picker — only shown when 2+ roles selected */}
          {selectedRoles.length > 1 && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>Primary Role</p>
              <div className="flex flex-wrap gap-2">
                {selectedRoles.map(r => (
                  <button
                    key={r}
                    onClick={() => setPrimaryRole(r)}
                    className="px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors border flex items-center gap-1.5"
                    style={r === primaryRole
                      ? { background: 'var(--cam-gold-leaf)', color: '#020617', borderColor: 'var(--cam-gold-leaf)' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
                    }>
                    {r === primaryRole && <span style={{ fontSize: '12px' }}>★</span>}
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Primary role auto-selects job categories and tailors AI coaching.
              </p>
            </div>
          )}

          {selectedRoles.length === 0 && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>Select at least one role to get personalized coaching.</p>
          )}
        </div>
      </div>

      {/* ── Resumes ───────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <div className="flex items-center gap-3">
            <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Resumes</h3>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full border" style={
              resumes.length === 0
                ? { background: 'rgba(217,119,6,0.08)', color: '#d97706', borderColor: 'rgba(217,119,6,0.3)' }
                : { background: 'rgba(22,163,74,0.08)', color: '#16a34a', borderColor: 'rgba(22,163,74,0.3)' }
            }>{resumes.length} / {MAX_RESUMES}</span>
          </div>
          <div className="flex items-center gap-3">
            {resumeSaved && <span className="text-[12px] font-bold" style={{ color: 'var(--success, #16a34a)' }}>Saved ✓</span>}
            {!atMax && (
              <button
                onClick={() => setShowAddResume(v => !v)}
                className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-colors"
                style={{ color: 'var(--cam-primary)', borderColor: 'color-mix(in oklab, var(--cam-primary) 40%, transparent)', background: 'color-mix(in oklab, var(--cam-primary) 6%, transparent)' }}
              >
                {showAddResume ? 'Cancel' : '+ Add Resume'}
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Upload up to {MAX_RESUMES} resumes. The <strong>active</strong> one is what Sona uses for AI coaching.
          </p>

          {/* Resume list */}
          {resumes.length > 0 && (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {resumes.map((resume, i) => (
                <div key={resume.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    background: resume.is_active ? 'color-mix(in oklab, var(--cam-primary) 4%, var(--bg-surface))' : 'var(--bg-surface)',
                  }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{resume.filename}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(resume.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {resume.is_active ? (
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
                      style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', borderColor: 'rgba(22,163,74,0.3)' }}>
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivateResume(resume.id)}
                      disabled={activatingId === resume.id}
                      className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 flex-shrink-0"
                      style={{ color: 'var(--cam-primary)', borderColor: 'color-mix(in oklab, var(--cam-primary) 40%, transparent)', background: 'transparent' }}
                    >
                      {activatingId === resume.id ? '…' : 'Set Active'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteResume(resume.id)}
                    disabled={deletingId === resume.id}
                    className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 flex-shrink-0"
                    style={{ color: 'var(--danger, #ef4444)', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.14)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                  >
                    {deletingId === resume.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {atMax && (
            <p className="text-[12px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
              Maximum of {MAX_RESUMES} resumes reached. Delete one to add another.
            </p>
          )}

          {/* Add resume form — always shown when empty, toggle via button otherwise */}
          {(showAddResume || resumes.length === 0) && !atMax && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <div className="flex gap-1">
                {(['upload', 'text'] as const).map(t => (
                  <button key={t} onClick={() => setResumeTab(t)}
                    className="px-3 py-1 rounded text-[12px] font-bold uppercase tracking-wide transition-colors"
                    style={resumeTab === t
                      ? { background: 'var(--cam-primary)', color: '#fff' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-muted)' }
                    }>
                    {t === 'upload' ? 'Upload File' : 'Paste Text'}
                  </button>
                ))}
              </div>
              {resumeTab === 'upload' ? (
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`w-full rounded-xl text-[13px] font-medium transition-all flex flex-col items-center justify-center gap-3 cursor-pointer select-none${uploading ? ' opacity-50 pointer-events-none' : ''}`}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--cam-primary)' : 'var(--border)'}`,
                    background: dragOver ? 'color-mix(in oklab, var(--cam-primary) 6%, var(--bg-surface))' : 'var(--bg-surface)',
                    color: 'var(--text-muted)',
                    padding: '2.5rem 1rem',
                  }}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f); e.target.value = ''; } }} />
                  {uploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-[var(--cam-primary)] border-t-transparent rounded-full animate-spin" />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <div className="text-center">
                        <p className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                          {dragOver ? 'Drop to upload' : 'Click to upload or drag & drop'}
                        </p>
                        <p className="text-[12px] mt-0.5">PDF, DOCX, or TXT · max 5 MB</p>
                      </div>
                    </>
                  )}
                </label>
              ) : (
                <>
                  <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
                    placeholder="Paste your full resume here…" rows={9}
                    className="w-full p-3 rounded-lg text-[13px] resize-none outline-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{resumeText.length > 0 ? `${resumeText.length.toLocaleString()} characters` : 'Paste plain text or copy from a doc'}</span>
                    <button onClick={handleSaveResumeText} disabled={savingText || !resumeText.trim()}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold text-white disabled:opacity-50 transition-opacity"
                      style={{ background: 'var(--cam-primary)' }}>
                      {savingText ? 'Saving…' : 'Save Resume'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Activity Heatmap ─────────────────────────────────── */
function ActivityHeatmap() {
  const { token } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${CAPRA_API}/api/activity/heatmap?year=${year}`, {
      headers: getAuthHeaders() as unknown as Record<string, string>,
    })
      .then(r => r.ok ? r.json() : { days: {}, current_streak: 0, longest_streak: 0 })
      .then(data => {
        setActivityData(data.days || {});
        setCurrentStreak(data.current_streak || 0);
        setLongestStreak(data.longest_streak || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, token]);

  // Build a 52-week grid aligned to Jan 1 of the selected year
  const { cells, monthOffsets } = useMemo(() => {
    const jan1 = new Date(`${year}-01-01`);
    // Day of week of Jan 1 (0=Sun → shift to Mon-first: Mon=0..Sun=6)
    const startDow = (jan1.getDay() + 6) % 7;
    const totalCells = 53 * 7;
    const cells: { date: string; value: number }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const offset = i - startDow;
      const d = new Date(jan1);
      d.setDate(jan1.getDate() + offset);
      const dateStr = d.toISOString().slice(0, 10);
      const inYear = d.getFullYear() === parseInt(year);
      cells.push({ date: dateStr, value: inYear ? (activityData[dateStr] || 0) : -1 });
    }
    // Month label positions (week index where each month starts)
    const monthOffsets: { month: string; col: number }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < 53; col++) {
      const cellIdx = col * 7;
      if (cellIdx >= totalCells) break;
      const d = new Date(jan1);
      d.setDate(jan1.getDate() + (cellIdx - startDow));
      if (d.getFullYear() === parseInt(year) && d.getMonth() !== lastMonth) {
        monthOffsets.push({ month: d.toLocaleString('default', { month: 'short' }), col });
        lastMonth = d.getMonth();
      }
    }
    return { cells, monthOffsets };
  }, [year, activityData]);

  const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  const getColor = (v: number) => {
    if (v < 0) return 'transparent';
    if (v === 0) return 'var(--bg-elevated)';
    if (v <= 2) return 'color-mix(in oklab, var(--cam-primary) 25%, var(--bg-elevated))';
    if (v <= 4) return 'color-mix(in oklab, var(--cam-primary) 50%, var(--bg-elevated))';
    if (v <= 7) return 'color-mix(in oklab, var(--cam-primary) 75%, var(--bg-elevated))';
    return 'var(--cam-primary)';
  };

  const years = [];
  for (let y = currentYear; y >= 2024; y--) years.push(String(y));

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Activity</h3>
        <select value={year} onChange={e => setYear(e.target.value)}
          className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-muted)' }}>
          {years.map(y => <option key={y} value={y}>{y === String(currentYear) ? 'Current' : y}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="h-[88px] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-0.5" style={{ minWidth: '700px' }}>
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] pr-2" style={{ paddingTop: '18px' }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} style={{ height: '11px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '11px' }}>{d}</div>
              ))}
            </div>
            {/* Grid */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Month labels */}
              <div style={{ display: 'flex', marginBottom: '4px', height: '14px', position: 'relative' }}>
                {monthOffsets.map(({ month, col }) => (
                  <div key={`${month}-${col}`} style={{
                    position: 'absolute',
                    left: `${(col / 53) * 100}%`,
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>{month}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: 53 }, (_, w) => (
                  <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {Array.from({ length: 7 }, (_, d) => {
                      const cell = cells[w * 7 + d];
                      return (
                        <div
                          key={d}
                          data-tip={cell && cell.value >= 0 ? `${cell.date}: ${cell.value} activit${cell.value === 1 ? 'y' : 'ies'}` : undefined}
                          style={{
                            width: '11px', height: '11px',
                            borderRadius: '2px',
                            background: cell ? getColor(cell.value) : 'transparent',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Practice sessions, quizzes &amp; challenges
        </div>
        <div className="flex items-center gap-4" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Current streak: <strong style={{ color: 'var(--text-primary)' }}>{currentStreak}</strong></span>
          <span>Longest streak: <strong style={{ color: 'var(--text-primary)' }}>{longestStreak}</strong></span>
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
        <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Subscription</h3>
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
        <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Profile settings</h3>
        {langSaved && <span className="text-[12px] font-bold" style={{ color: 'var(--success, #16a34a)' }}>Saved ✓</span>}
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
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Problem Contributions</h3>
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
            <div className="grid grid-cols-5 gap-0 text-[12px] font-bold uppercase tracking-widest font-mono" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', color: 'var(--cam-primary)', opacity: 0.9 }}>
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Your <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Profile</span></h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cam-strip-text)' }}>{user?.email || 'Manage account, achievements, and referrals'}</p>
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
                <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Account Information</h3>
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

        {/* Job Profile moved to the Apply section — redirect old ?tab=job-profile links. */}
        {activeTab === 'job-profile' && <Navigate to="/jobs/profile" replace />}

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
                <h3 className="font-mono text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Invite Friends to Get Free Access</h3>
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
