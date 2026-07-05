import { useState, useEffect } from 'react';
import {
  fetchJobSeekerProfile,
  fetchJobDetail,
  profileToResumeText,
  generateTailoredDocuments,
  downloadBase64Docx,
  type JobApplication,
  type JobSeekerProfile,
  type TailoredDocsResult,
} from '../../lib/jobsearch-api';
import { T, CX, banner } from './theme';

/**
 * Tailored-documents modal (assisted apply). Reuses ascend's /resume/generate
 * to produce a tailored resume + cover letter from the profile + JD, then
 * hands off to the employer's apply page. Themed with camora CSS tokens.
 */

interface Props {
  application: JobApplication;
  onClose: () => void;
  onGenerated?: () => void;
  onMarkApplied?: () => void | Promise<void>;
}

export default function TailorDocsModal({ application, onClose, onGenerated, onMarkApplied }: Props) {
  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailoredDocsResult | null>(null);
  const [applying, setApplying] = useState(false);

  const handleMarkApplied = async () => {
    setApplying(true);
    setError(null);
    try {
      await onMarkApplied?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark applied');
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, job] = await Promise.all([
          fetchJobSeekerProfile(),
          application.source_job_id ? fetchJobDetail(application.source_job_id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setProfile(p);
        if (job?.job_description) setJd(job.job_description);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [application.source_job_id]);

  const onGenerate = async () => {
    if (!profile) {
      setError('Create your job profile first (Profile → Job Profile).');
      return;
    }
    if (!jd.trim()) {
      setError('Paste the job description to tailor against.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await generateTailoredDocuments({
        resume: profileToResumeText(profile),
        jobDescription: jd.trim(),
        company: application.company || undefined,
        role: application.title || undefined,
        candidateName: profile.full_name || undefined,
        candidateEmail: profile.email || undefined,
        candidatePhone: profile.phone || undefined,
        candidateLinkedIn: profile.links?.linkedin || undefined,
      });
      setResult(res);
      onGenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const score = result?.gapAnalysis?.matchScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-xl" style={T.card} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg" style={T.pageTitle}>Tailor CV &amp; cover letter</h2>
            <p className="text-sm" style={T.muted}>
              {application.title || 'Untitled role'}{application.company ? ` · ${application.company}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={T.muted} aria-label="Close">✕</button>
        </div>

        {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={banner('error')}>{error}</div>}

        {loading ? (
          <p style={T.muted}>Loading…</p>
        ) : (
          <>
            {!profile && (
              <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--accent-secondary-subtle)', border: '1px solid var(--border)', color: 'var(--accent-secondary-text)' }}>
                You don&apos;t have a job profile yet. Fill it in under Profile → Job Profile for a well-tailored result.
              </div>
            )}

            <label className="mb-2 block text-sm font-bold uppercase tracking-wide" style={T.sectionTitle}>Job description</label>
            <textarea className={`${CX.input} min-h-[180px]`} style={T.input} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description here…" />

            <div className="mt-4 flex items-center gap-3">
              <button onClick={onGenerate} disabled={generating} className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60" style={T.primaryBtn}>
                {generating ? 'Generating…' : 'Generate tailored documents'}
              </button>
              {typeof score === 'number' && (
                <span className="text-sm" style={T.body}>Match score: <strong>{score}%</strong></span>
              )}
            </div>

            <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <p className="mb-1 text-sm font-bold uppercase tracking-wide" style={T.sectionTitle}>Apply</p>
              <p className="mb-3 text-xs" style={T.muted}>
                Open the employer&apos;s application page, attach the documents above, submit there, then mark this application as applied.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {application.job_url ? (
                  <a href={application.job_url} target="_blank" rel="noreferrer" className="rounded-lg px-4 py-2 text-sm font-medium" style={T.ghostBtn}>
                    Open application page ↗
                  </a>
                ) : (
                  <span className="text-xs" style={T.muted}>No application URL on this job.</span>
                )}
                {onMarkApplied && application.status !== 'applied' && (
                  <button onClick={handleMarkApplied} disabled={applying} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: '#28a745' }}>
                    {applying ? 'Saving…' : 'Mark as applied'}
                  </button>
                )}
              </div>
            </div>

            {result && (
              <div className="mt-6 space-y-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => downloadBase64Docx(result.resume.base64, result.resume.filename)} className="rounded-lg px-4 py-2 text-sm font-medium" style={T.ghostBtn}>
                    ↓ Download resume (.docx)
                  </button>
                  <button onClick={() => downloadBase64Docx(result.coverLetter.base64, result.coverLetter.filename)} className="rounded-lg px-4 py-2 text-sm font-medium" style={T.ghostBtn}>
                    ↓ Download cover letter (.docx)
                  </button>
                </div>

                {(result.gapAnalysis?.gaps?.length || result.gapAnalysis?.quickWins?.length) ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                    {result.gapAnalysis.gaps?.length ? (
                      <div>
                        <p className="mb-1 font-medium" style={T.body}>Gaps vs this role</p>
                        <ul className="list-disc pl-5" style={T.muted}>
                          {result.gapAnalysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    {result.gapAnalysis.quickWins?.length ? (
                      <div>
                        <p className="mb-1 font-medium" style={T.body}>Quick wins</p>
                        <ul className="list-disc pl-5" style={T.muted}>
                          {result.gapAnalysis.quickWins.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
