import { useState, useRef, useCallback, useEffect } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

type OutputTab = 'resume' | 'coverLetter' | 'atsScore';

const COMPANIES = [
  'Google',
  'Amazon',
  'Meta',
  'Apple',
  'Microsoft',
  'Netflix',
  'Other',
] as const;

interface Props {
  initialCompany?: string;
  initialRole?: string;
  initialJobDescription?: string;
  initialJobUrl?: string;
}

export default function ResumeOptimizer({
  initialCompany,
  initialRole,
  initialJobDescription,
  initialJobUrl,
}: Props = {}) {
  // Input state
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [jobUrl, setJobUrl] = useState(initialJobUrl || '');
  const [resume, setResume] = useState('');
  const [company, setCompany] = useState<string>(initialCompany || '');
  const [role, setRole] = useState(initialRole || '');

  // Output state
  const [activeTab, setActiveTab] = useState<OutputTab>('resume');
  const [optimizedResume, setOptimizedResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [atsScore, setAtsScore] = useState('');
  const [atsData, setAtsData] = useState<{
    score?: number;
    keywordsMatched?: string[];
    keywordsMissing?: string[];
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [fetchingJd, setFetchingJd] = useState(false);
  const [generationStep, setGenerationStep] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const didAutoInit = useRef(false);
  const [autoStatus, setAutoStatus] = useState<string | null>(
    initialJobUrl ? 'Loading your resume and job description…' : null,
  );
  const [jdMode, setJdMode] = useState<'paste' | 'url'>('url');
  const [resumeMode, setResumeMode] = useState<'paste' | 'upload'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const getOutputContent = useCallback(() => {
    switch (activeTab) {
      case 'resume':
        return optimizedResume;
      case 'coverLetter':
        return coverLetter;
      case 'atsScore':
        return atsScore;
    }
  }, [activeTab, optimizedResume, coverLetter, atsScore]);

  /**
   * Stream SSE response from the API and accumulate text into the setter.
   */
  async function streamResponse(
    endpoint: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    opts?: {
      overrides?: { resume?: string; jobDescription?: string; company?: string; role?: string };
      onComplete?: (fullText: string) => void;
    },
  ) {
    setLoading(true);
    setError(null);
    setter('');
    let fullText = '';

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          resume: opts?.overrides?.resume ?? resume,
          jobDescription: opts?.overrides?.jobDescription ?? (jobDescription || jobUrl),
          company: opts?.overrides?.company ?? company,
          role: opts?.overrides?.role ?? role,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = 'Request failed';
        try {
          const parsed = JSON.parse(errorBody);
          message = parsed.error || parsed.detail || message;
        } catch {
          // use default message
        }
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setter((prev) => prev + data.text);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseErr) {
              // If not valid JSON, treat as raw text chunk
              if (parseErr instanceof SyntaxError) {
                const raw = line.slice(6);
                if (raw && raw !== '[DONE]') {
                  setter((prev) => prev + raw);
                }
              } else {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // user cancelled
      }
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
    if (opts?.onComplete && fullText) {
      opts.onComplete(fullText);
    }
    return fullText;
  }

  async function fetchAtsScore(opts?: {
    overrides?: { resume?: string; jobDescription?: string; company?: string; role?: string };
  }) {
    setLoading(true);
    setError(null);
    setAtsScore('');
    setAtsData(null);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${API_URL}/api/v1/resume/ats-score`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          resume: opts?.overrides?.resume ?? resume,
          jobDescription: opts?.overrides?.jobDescription ?? (jobDescription || jobUrl),
          company: opts?.overrides?.company ?? company,
          role: opts?.overrides?.role ?? role,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ATS analysis failed');
      setAtsData(data);
      setAtsScore('ats-rendered');
      return data;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'ATS analysis failed');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function handleGenerateAll() {
    if (!resume.trim()) {
      setError('Please paste your resume first.');
      return;
    }
    if (!jobDescription.trim() && !jobUrl.trim()) {
      setError('Please provide a job description or URL.');
      return;
    }
    setOptimizedResume('');
    setCoverLetter('');
    setAtsScore('');
    setAtsData(null);

    setGenerationStep('Resume');
    setActiveTab('resume');
    if (initialJobUrl) {
      try { sessionStorage.removeItem(`camora_resume_cache_${initialJobUrl}`); } catch { /* ignore */ }
    }

    const optimizedText = await streamResponse('/api/v1/resume/optimize', setOptimizedResume);

    setGenerationStep('Cover Letter');
    setActiveTab('coverLetter');
    await streamResponse('/api/v1/resume/cover-letter', setCoverLetter);

    setGenerationStep('ATS Score');
    setActiveTab('atsScore');
    await fetchAtsScore();

    setGenerationStep(null);
    setActiveTab('resume');
  }

  async function handleFetchJd() {
    const url = jobUrl.trim();
    if (!url) return;
    setFetchingJd(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/resume/fetch-jd`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch job description');
      setJobDescription(data.text);
      setJdMode('paste');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch URL');
    } finally {
      setFetchingJd(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    e.target.value = '';

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setResume(result.value);
      } else if (ext === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1 });
          const pageHeight = viewport.height;
          let lastY: number | null = null;
          let line = '';
          const lines: string[] = [];
          for (const item of content.items as any[]) {
            const y = pageHeight - (item.transform?.[5] ?? 0);
            if (lastY !== null && Math.abs(y - lastY) > 2) {
              if (line.trim()) lines.push(line.trim());
              line = '';
            }
            line += (item.str ?? '');
            lastY = y;
          }
          if (line.trim()) lines.push(line.trim());
          pages.push(lines.join('\n'));
        }
        setResume(pages.join('\n\n'));
      } else {
        const text = await file.text();
        setResume(text);
      }
    } catch {
      setError('Failed to read file. Please paste your resume instead.');
    }
  }

  async function handleSaveToDocuments(jdText: string, optimizedText: string, co: string, ro: string) {
    const LUMORA = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';
    const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const uploads = [
      { name: `JD_${slug(co)}_${slug(ro)}_${date}.txt`, content: jdText },
      { name: `TailoredResume_${slug(co)}_${slug(ro)}_${date}.txt`, content: optimizedText },
    ];
    await Promise.allSettled(
      uploads.map(async ({ name, content }) => {
        const form = new FormData();
        form.append('file', new Blob([content], { type: 'text/plain' }), name);
        await fetch(`${LUMORA}/api/v1/documents/upload`, {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders(),
          body: form,
        });
      }),
    );
  }

  useEffect(() => {
    if (!initialJobUrl || didAutoInit.current) return;
    didAutoInit.current = true;

    const cacheKey = `camora_resume_cache_${initialJobUrl}`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (cached?.optimizedResume && cached?.coverLetter) {
        setOptimizedResume(cached.optimizedResume);
        setCoverLetter(cached.coverLetter);
        if (cached.atsData) { setAtsData(cached.atsData); setAtsScore('ats-rendered'); }
        if (cached.jobDescription) setJobDescription(cached.jobDescription);
        return;
      }
    } catch { /* ignore corrupt cache */ }

    (async () => {
      try {
        setAutoStatus('Loading your base resume…');
        const LUMORA = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';
        const profileRes = await fetch(`${LUMORA}/api/v1/auth/profile/resume`, {
          credentials: 'include',
          headers: getAuthHeaders(),
        });
        let resumeText = '';
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          resumeText = profileData.resume_text || '';
          if (resumeText) setResume(resumeText);
        }

        setAutoStatus('Fetching job description from listing…');
        setFetchingJd(true);
        const jdRes = await fetch(`${API_URL}/api/v1/resume/fetch-jd`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ url: initialJobUrl }),
        });
        const jdData = await jdRes.json();
        if (!jdRes.ok) throw new Error(jdData.error || 'Failed to fetch job description');
        const jdText = jdData.text as string;
        setJobDescription(jdText);
        setJobUrl('');
        setFetchingJd(false);

        if (!resumeText) {
          setAutoStatus('Job description loaded — paste or upload your resume to continue.');
          return;
        }

        const co = initialCompany || 'Google';
        const ro = initialRole || '';
        let optimizedText = '';
        setAutoStatus('Preparing your tailored resume…');
        setActiveTab('resume');
        await streamResponse('/api/v1/resume/optimize', setOptimizedResume, {
          overrides: { resume: resumeText, jobDescription: jdText, company: co, role: ro },
          onComplete: (text) => { optimizedText = text; },
        });

        let clText = '';
        setAutoStatus('Generating cover letter…');
        setActiveTab('coverLetter');
        await streamResponse('/api/v1/resume/cover-letter', setCoverLetter, {
          overrides: { resume: resumeText, jobDescription: jdText, company: co, role: ro },
          onComplete: (text) => { clText = text; },
        });

        setAutoStatus('Calculating ATS score…');
        setActiveTab('atsScore');
        const atsDataResult = await fetchAtsScore({ overrides: { resume: resumeText, jobDescription: jdText, company: co, role: ro } });

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            optimizedResume: optimizedText,
            coverLetter: clText,
            atsData: atsDataResult || null,
            jobDescription: jdText,
          }));
        } catch { /* quota exceeded — ignore */ }

        setAutoStatus(null);
        setActiveTab('resume');
        if (optimizedText) handleSaveToDocuments(jdText, optimizedText, co, ro);
      } catch (err) {
        setFetchingJd(false);
        setAutoStatus(null);
        if (err instanceof Error) setError(err.message);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCopy() {
    const content = getOutputContent();
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function buildFilename(ext: string): string {
    const slug = (s: string) => s.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'Unknown';
    const base = activeTab === 'coverLetter' ? 'CoverLetter'
      : activeTab === 'atsScore' ? 'ATSScore'
      : `${slug(role || 'Resume')}_${slug(company || 'Company')}`;
    return `${base}.${ext}`;
  }

  async function handleDownloadDocx() {
    const content = getOutputContent();
    if (!content) return;
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    const paragraphs = content.split('\n').map(
      (line) => new Paragraph({ children: [new TextRun(line)] }),
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = buildFilename('docx');
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleDownloadPdf() {
    const content = getOutputContent();
    if (!content) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(content, 180);
    let y = 20;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 15, y);
      y += 6;
    }
    doc.save(buildFilename('pdf'));
  }

  const outputContent = getOutputContent();
  const hasOutput = Boolean(outputContent);

  function cleanMd(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,6}\s+/, '');
  }

  function renderDocumentLine(line: string, i: number, isFirst: boolean): React.ReactNode {
    const raw = line.trim();
    if (!raw) return <div key={i} style={{ height: '8px' }} />;
    const isMarkdownHeader = /^#{1,6}\s/.test(raw);
    const headerText = isMarkdownHeader ? raw.replace(/^#{1,6}\s+/, '') : raw;
    const clean = cleanMd(headerText);
    const isSection = isMarkdownHeader || (
      clean.length > 2 && clean.length < 60 &&
      clean === clean.toUpperCase() &&
      /[A-Z]{2}/.test(clean) &&
      !clean.startsWith('•') && !clean.startsWith('-') &&
      !clean.includes('@') && !/^\d/.test(clean)
    );
    const isBullet = /^[•\-*]\s/.test(raw);
    const bulletContent = isBullet ? cleanMd(raw.replace(/^[•\-*]\s*/, '')) : '';
    if (isFirst) return (
      <div key={i} style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '2px', fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '-0.01em' }}>{clean}</div>
    );
    if (isSection) return (
      <div key={i} style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #94a3b8', paddingBottom: '4px', marginTop: '20px', marginBottom: '7px', letterSpacing: '0.12em', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase' as const }}>{clean.toUpperCase()}</div>
    );
    if (isBullet) return (
      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#1e293b', lineHeight: '1.65', marginBottom: '3px', fontFamily: 'Arial, Helvetica, sans-serif', paddingLeft: '4px' }}>
        <span style={{ flexShrink: 0, marginTop: '2px' }}>•</span>
        <span>{bulletContent}</span>
      </div>
    );
    return (
      <div key={i} style={{ fontSize: '11.5px', color: '#1e293b', lineHeight: '1.65', marginBottom: '2px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{clean}</div>
    );
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    border: active ? '1px solid var(--cam-gold-leaf, #d4af37)' : '1px solid var(--border)',
    background: active ? 'var(--cam-gold-leaf, #d4af37)' : 'transparent',
    color: active ? '#020617' : 'var(--text-muted)',
    transition: 'all 0.12s',
    lineHeight: '1',
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif",
    color: 'var(--text-primary)',
    background: 'var(--bg-elevated)',
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: '1.6',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div>
        <span style={{ display: 'block', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cam-gold-leaf)', marginBottom: '4px' }}>
          AI-Powered
        </span>
        <h2 style={{ fontFamily: "'Clash Display', Satoshi, sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Resume Optimizer
        </h2>
      </div>

      {/* ── Auto-status banner ── */}
      {autoStatus && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'color-mix(in oklab, var(--accent) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--accent) 28%, transparent)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent)', fontWeight: 500 }}>
          <div style={{ width: '13px', height: '13px', border: '2px solid color-mix(in oklab, var(--accent) 30%, transparent)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'resumeOptimizerSpin 0.8s linear infinite', flexShrink: 0 }} />
          {autoStatus}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'color-mix(in oklab, var(--danger) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--danger) 35%, transparent)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* ── Job Description ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={labelStyle}>Job Description</span>
          <button type="button" style={chipStyle(jdMode === 'paste')} onClick={() => setJdMode('paste')}>Paste JD</button>
          <button type="button" style={chipStyle(jdMode === 'url')} onClick={() => setJdMode('url')}>Fetch URL</button>
        </div>

        {jdMode === 'paste' && (
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={5}
            style={inputStyle}
          />
        )}

        {jdMode === 'url' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFetchJd(); }}
              placeholder="https://jobs.example.com/posting/123"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Source Code Pro', monospace", color: 'var(--text-primary)', background: 'var(--bg-elevated)', outline: 'none', boxSizing: 'border-box' as const }}
            />
            <button
              type="button"
              onClick={handleFetchJd}
              disabled={fetchingJd || !jobUrl.trim()}
              style={{ padding: '10px 16px', borderRadius: '8px', background: fetchingJd || !jobUrl.trim() ? 'var(--bg-elevated)' : 'var(--accent)', color: fetchingJd || !jobUrl.trim() ? 'var(--text-muted)' : '#fff', border: '1px solid var(--border)', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: fetchingJd || !jobUrl.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, opacity: fetchingJd ? 0.65 : 1, transition: 'all 0.15s' }}
            >
              {fetchingJd ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
        )}

        {jdMode === 'url' && jobDescription && (
          <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '12px', color: '#22c55e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Job description fetched — switch to "Paste JD" to review or edit
          </div>
        )}
      </div>

      {/* ── Your Resume ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={labelStyle}>Your Resume</span>
          <button type="button" style={chipStyle(resumeMode === 'paste')} onClick={() => setResumeMode('paste')}>Paste Resume</button>
          <button type="button" style={chipStyle(resumeMode === 'upload')} onClick={() => setResumeMode('upload')}>Upload File</button>
        </div>

        {resumeMode === 'paste' && (
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your existing resume text here..."
            rows={6}
            style={inputStyle}
          />
        )}

        {resumeMode === 'upload' && !resume && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            onDrop={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const synth = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileUpload(synth);
              }
            }}
            style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-elevated)', transition: 'border-color 0.15s' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Click to upload or drag & drop</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>.txt · .pdf · .docx</span>
          </div>
        )}

        {resumeMode === 'upload' && resume && (
          <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500, flex: 1 }}>
              {uploadedFileName ? `✓ ${uploadedFileName}` : `Resume loaded — ${resume.split('\n').filter(Boolean).length} lines`}
            </span>
            <button type="button" onClick={() => setResume('')} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}>Remove</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Replace</button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {/* ── Target Company + Role ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>Target Company</label>
          <input
            list="company-suggestions"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Google, Zscaler…"
            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif", color: 'var(--text-primary)', background: 'var(--bg-elevated)', outline: 'none', boxSizing: 'border-box' as const, width: '100%' }}
          />
          <datalist id="company-suggestions">
            {COMPANIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>Target Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif", color: 'var(--text-primary)', background: 'var(--bg-elevated)', outline: 'none', boxSizing: 'border-box' as const, width: '100%' }}
          />
        </div>
      </div>

      {/* ── Generate Button ── */}
      <button
        type="button"
        onClick={handleGenerateAll}
        disabled={loading}
        style={{ width: '100%', padding: '12px 20px', border: '1px solid var(--border)', borderRadius: '10px', background: loading ? 'var(--bg-elevated)' : 'var(--accent)', color: '#ffffff', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1, transition: 'all 0.15s' }}
      >
        {generationStep ? `Generating ${generationStep}…` : 'Generate Resume + Cover Letter + ATS'}
      </button>

      {/* ── Document Preview ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ display: 'block', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cam-gold-leaf)', marginBottom: '2px' }}>Output</span>
            <h3 style={{ fontFamily: "'Clash Display', Satoshi, sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.016em' }}>Document Preview</h3>
          </div>
          {hasOutput && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setShowPreviewModal(true)} style={{ padding: '6px 14px', border: '1px solid var(--accent)', borderRadius: '8px', background: 'var(--accent-subtle, rgba(0,71,171,0.08))', fontSize: '12px', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview
              </button>
              <button type="button" onClick={handleCopy} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-surface)', fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {(['docx', 'pdf'] as const).map((fmt) => (
                <button key={fmt} type="button" onClick={fmt === 'docx' ? handleDownloadDocx : handleDownloadPdf} style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-surface)', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "Satoshi, 'Plus Jakarta Sans', sans-serif" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  .{fmt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tab-group">
          {([
            { key: 'resume' as OutputTab, label: 'Resume' },
            { key: 'coverLetter' as OutputTab, label: 'Cover Letter' },
            { key: 'atsScore' as OutputTab, label: 'ATS Score' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`tab-group-item${activeTab === tab.key ? ' tab-group-item-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', padding: '40px 20px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'resumeOptimizerSpin 0.8s linear infinite' }} />
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {generationStep ? `Generating ${generationStep}…` : 'Generating…'}
              </span>
              <style>{`@keyframes resumeOptimizerSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (activeTab === 'resume' || activeTab === 'coverLetter') && outputContent ? (
            <div style={{ overflowY: 'auto', flex: 1, padding: '32px 36px', background: '#ffffff' }}>
              {(() => {
                const lines = outputContent.split('\n');
                let firstNonEmpty = -1;
                return lines.map((line, i) => {
                  const isFirst = !!(line.trim() && firstNonEmpty === -1 && activeTab === 'resume' && (firstNonEmpty = i) >= 0);
                  return renderDocumentLine(line, i, isFirst);
                });
              })()}
            </div>
          ) : activeTab === 'atsScore' && atsData ? (
            <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
              {(() => {
                const score = atsData.score ?? 0;
                const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
                const label = score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'Weak';
                const r = 42, circ = 2 * Math.PI * r;
                const dash = (score / 100) * circ;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
                    <svg width={104} height={104} style={{ flexShrink: 0 }}>
                      <circle cx={52} cy={52} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
                      <circle cx={52} cy={52} r={r} fill="none" stroke={color} strokeWidth={10} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '52px 52px', transition: 'stroke-dasharray .6s ease' }} />
                      <text x={52} y={48} textAnchor="middle" fill={color} fontSize={22} fontWeight={700} fontFamily="inherit">{score}</text>
                      <text x={52} y={64} textAnchor="middle" fill="var(--text-muted)" fontSize={11} fontFamily="inherit">/100</text>
                    </svg>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 4 }}>{label} ATS Match</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {score >= 75 ? 'Your resume is well-optimized for this role.' : score >= 50 ? 'Some gaps — review missing keywords below.' : 'Significant gaps found. Tailor your resume using the suggestions.'}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { title: 'Keywords Matched', items: atsData.keywordsMatched || [], pill: '#16a34a', pillBg: 'rgba(22,163,74,.12)' },
                  { title: 'Keywords Missing', items: atsData.keywordsMissing || [], pill: '#dc2626', pillBg: 'rgba(220,38,38,.12)' },
                ].map(({ title, items, pill, pillBg }) => (
                  <div key={title} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 10 }}>{title}</div>
                    {items.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</span> : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {items.map((k: string) => (
                          <span key={k} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, color: pill, background: pillBg, border: `1px solid ${pill}33` }}>{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {[
                { title: 'Strengths', items: atsData.strengths || [], icon: '✓', iconColor: '#22c55e', iconBg: 'rgba(34,197,94,.12)' },
                { title: 'Weaknesses', items: atsData.weaknesses || [], icon: '✗', iconColor: '#ef4444', iconBg: 'rgba(239,68,68,.12)' },
                { title: 'Suggestions', items: atsData.suggestions || [], icon: '→', iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,.12)' },
              ].map(({ title, items, icon, iconColor, iconBg }) => items.length > 0 && (
                <div key={title} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 10 }}>{title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 1 }}>{icon}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : outputContent && outputContent !== 'ats-rendered' ? (
            <pre style={{ margin: 0, padding: '20px', fontFamily: "'Source Code Pro', monospace", fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowY: 'auto', flex: 1 }}>
              {outputContent}
            </pre>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', gap: '12px', color: 'var(--text-muted)' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Output will appear here</span>
              <span style={{ fontSize: '12px', textAlign: 'center' }}>Paste your resume and a job description, then click Generate.</span>
            </div>
          )}
        </div>
      </div>
      {showPreviewModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreviewModal(false); }}
        >
          <div style={{ background: '#f8fafc', borderRadius: '14px', width: '100%', maxWidth: '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {activeTab === 'coverLetter' ? 'Cover Letter' : activeTab === 'atsScore' ? 'ATS Analysis' : 'Optimized Resume'} — Preview
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" onClick={handleDownloadDocx} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#fff', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  DOCX
                </button>
                <button type="button" onClick={handleDownloadPdf} style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#fff', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  PDF
                </button>
                <button type="button" onClick={() => setShowPreviewModal(false)} style={{ width: '28px', height: '28px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#fff', fontSize: '16px', fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '32px', background: '#f8fafc' }}>
              <div style={{ background: '#ffffff', maxWidth: '700px', margin: '0 auto', padding: '52px 56px', boxShadow: '0 2px 24px rgba(0,0,0,0.1)', minHeight: '900px', borderRadius: '4px' }}>
                {(activeTab === 'resume' || activeTab === 'coverLetter') && outputContent ? (
                  (() => {
                    const lines = outputContent.split('\n');
                    let firstNonEmpty = -1;
                    return lines.map((line, i) => {
                      const isFirst = !!(line.trim() && firstNonEmpty === -1 && activeTab === 'resume' && (firstNonEmpty = i) >= 0);
                      return renderDocumentLine(line, i, isFirst);
                    });
                  })()
                ) : activeTab === 'atsScore' && atsData ? (
                  <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.7 }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: atsData.score && atsData.score >= 75 ? '#16a34a' : atsData.score && atsData.score >= 50 ? '#d97706' : '#dc2626', marginBottom: '8px' }}>{atsData.score}/100</div>
                    <div style={{ marginBottom: '16px', color: '#64748b' }}>ATS Match Score</div>
                    {(atsData.suggestions || []).map((s: string, i: number) => <div key={i} style={{ marginBottom: '8px', paddingLeft: '12px', borderLeft: '3px solid #3b82f6' }}>{s}</div>)}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px', fontSize: '14px' }}>No content yet — generate first.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
