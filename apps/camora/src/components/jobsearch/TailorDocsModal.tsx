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

/**
 * Tailored-documents modal (Phase 3).
 *
 * Reuses the ascend backend's /resume/generate: takes the user's structured
 * profile + this application's job description, produces a tailored resume +
 * cover letter (DOCX) plus a gap-analysis match score, and offers downloads.
 *
 * Persisting the generated files to R2 and attaching them to the application
 * record is a later phase — for now the user downloads them directly.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

interface Props {
  application: JobApplication;
  onClose: () => void;
  /** Called after a successful generation, e.g. to advance status. */
  onGenerated?: () => void;
  /** Mark this application as applied (sets status='applied' + applied_at). */
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
          application.source_job_id
            ? fetchJobDetail(application.source_job_id)
            : Promise.resolve(null),
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
    return () => {
      cancelled = true;
    };
  }, [application.source_job_id]);

  const onGenerate = async () => {
    if (!profile) {
      setError('Create your job-seeker profile first (Profile page).');
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-gray-950 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tailor CV &amp; cover letter
            </h2>
            <p className="text-sm text-gray-500">
              {application.title || 'Untitled role'}
              {application.company ? ` · ${application.company}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            {!profile && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                You don&apos;t have a job-seeker profile yet. Fill it in on the Profile page for a well-tailored result.
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Job description
            </label>
            <textarea
              className={`${inputCls} min-h-[180px]`}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here…"
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={onGenerate}
                disabled={generating}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {generating ? 'Generating…' : 'Generate tailored documents'}
              </button>
              {typeof score === 'number' && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Match score: <strong>{score}%</strong>
                </span>
              )}
            </div>

            <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Apply</p>
              <p className="mb-3 text-xs text-gray-500">
                Open the employer&apos;s application page, attach the documents above, submit there, then mark this application as applied.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {application.job_url ? (
                  <a
                    href={application.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    Open application page ↗
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No application URL on this job.</span>
                )}
                {onMarkApplied && application.status !== 'applied' && (
                  <button
                    onClick={handleMarkApplied}
                    disabled={applying}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {applying ? 'Saving…' : 'Mark as applied'}
                  </button>
                )}
              </div>
            </div>

            {result && (
              <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => downloadBase64Docx(result.resume.base64, result.resume.filename)}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    ↓ Download resume (.docx)
                  </button>
                  <button
                    onClick={() => downloadBase64Docx(result.coverLetter.base64, result.coverLetter.filename)}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    ↓ Download cover letter (.docx)
                  </button>
                </div>

                {(result.gapAnalysis?.gaps?.length || result.gapAnalysis?.quickWins?.length) ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                    {result.gapAnalysis.gaps?.length ? (
                      <div>
                        <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">Gaps vs this role</p>
                        <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                          {result.gapAnalysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    {result.gapAnalysis.quickWins?.length ? (
                      <div>
                        <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">Quick wins</p>
                        <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
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
