import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeroBand, HeroAccent } from '../../components/capra/ui';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface GapAnalysis {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  quickWins: string[];
}

interface DocFile {
  base64: string;
  filename: string;
}

interface GenerateResult {
  gapAnalysis: GapAnalysis;
  resume: DocFile;
  coverLetter: DocFile;
}

function downloadBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResumeGeneratorPage() {
  const [params] = useSearchParams();
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [company, setCompany] = useState(params.get('company') || '');
  const [role, setRole] = useState(params.get('role') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function generate() {
    if (!resume.trim() || !jd.trim()) {
      setError('Paste your resume and the job description to continue.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${API_URL}/api/v1/resume/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resume, jobDescription: jd, company, role }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Request failed (${resp.status})`);
      }
      const data: GenerateResult = await resp.json();
      setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const score = result?.gapAnalysis?.matchScore ?? null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <HeroBand
        title={<>Resume <HeroAccent>Generator</HeroAccent></>}
        subtitle="Paste your resume and a job description — get an ATS-optimized resume and tailored cover letter as Word documents."
        actions={null}
      />

      <div className="page-wrap pt-6 pb-16" style={{ maxWidth: 960 }}>
        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Target Company</label>
            <input
              className="input"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Google"
            />
          </div>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Target Role</label>
            <input
              className="input"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Your Resume</label>
            <textarea
              className="input"
              rows={16}
              value={resume}
              onChange={e => setResume(e.target.value)}
              placeholder="Paste your current resume text here..."
              style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 6 }}>Job Description</label>
            <textarea
              className="input"
              rows={16}
              value={jd}
              onChange={e => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
              style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--color-error)', marginBottom: 12, fontSize: 14 }}>{error}</p>
        )}

        <button
          className="btn-primary"
          onClick={generate}
          disabled={loading}
          style={{ minWidth: 200 }}
        >
          {loading ? 'Generating…' : 'Generate Resume & Cover Letter'}
        </button>

        {/* Results */}
        {result && (
          <div style={{ marginTop: 32 }}>
            {/* Score + downloads */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{
                  fontSize: 40, fontWeight: 700, lineHeight: 1,
                  color: score !== null && score >= 70 ? 'var(--cam-success)' : score !== null && score >= 50 ? 'var(--cam-warning)' : 'var(--color-error)',
                }}>{score ?? '—'}</div>
                <div className="text-caption" style={{ marginTop: 4 }}>Match Score</div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                className="btn-primary"
                onClick={() => downloadBase64(result.resume.base64, result.resume.filename)}
              >
                Download Resume (.docx)
              </button>
              <button
                className="btn-secondary"
                onClick={() => downloadBase64(result.coverLetter.base64, result.coverLetter.filename)}
              >
                Download Cover Letter (.docx)
              </button>
            </div>

            {/* Gap Analysis */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <div className="text-eyebrow" style={{ marginBottom: 12, color: 'var(--cam-success, var(--success))' }}>Strengths</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {(result.gapAnalysis.strengths || []).map((s, i) => (
                    <li key={i} style={{ fontSize: 13, marginBottom: 8, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--cam-success, var(--success))', flexShrink: 0 }}>✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div className="text-eyebrow" style={{ marginBottom: 12, color: 'var(--color-error, var(--danger))' }}>Gaps</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {(result.gapAnalysis.gaps || []).map((g, i) => (
                    <li key={i} style={{ fontSize: 13, marginBottom: 8, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--color-error, var(--danger))', flexShrink: 0 }}>✗</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div className="text-eyebrow" style={{ marginBottom: 12, color: 'var(--cam-gold-leaf, #c9a84c)' }}>Quick Wins</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {(result.gapAnalysis.quickWins || []).map((q, i) => (
                    <li key={i} style={{ fontSize: 13, marginBottom: 8, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--cam-gold-leaf, #c9a84c)', flexShrink: 0 }}>→</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
