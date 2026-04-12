import { useState, useRef, useCallback } from 'react';
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

export default function ResumeOptimizer() {
  // Input state
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [resume, setResume] = useState('');
  const [company, setCompany] = useState<string>('Google');
  const [role, setRole] = useState('');

  // Output state
  const [activeTab, setActiveTab] = useState<OutputTab>('resume');
  const [optimizedResume, setOptimizedResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [atsScore, setAtsScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  ) {
    setLoading(true);
    setError(null);
    setter('');

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          resume,
          jobDescription: jobDescription || jobUrl,
          company,
          role,
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
              if (data.chunk) {
                setter((prev) => prev + data.chunk);
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
  }

  function handleOptimizeResume() {
    if (!resume.trim()) {
      setError('Please paste your resume first.');
      return;
    }
    if (!jobDescription.trim() && !jobUrl.trim()) {
      setError('Please provide a job description or URL.');
      return;
    }
    setActiveTab('resume');
    streamResponse('/api/v1/resume/optimize', setOptimizedResume);
  }

  function handleGenerateCoverLetter() {
    if (!resume.trim()) {
      setError('Please paste your resume first.');
      return;
    }
    if (!jobDescription.trim() && !jobUrl.trim()) {
      setError('Please provide a job description or URL.');
      return;
    }
    setActiveTab('coverLetter');
    streamResponse('/api/v1/resume/cover-letter', setCoverLetter);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setResume(text);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file. Please paste your resume instead.');
    };
    reader.readAsText(file);

    // Reset file input so same file can be re-selected
    e.target.value = '';
  }

  function handleCopy() {
    const content = getOutputContent();
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const content = getOutputContent();
    if (!content) return;

    const labelMap: Record<OutputTab, string> = {
      resume: 'optimized-resume',
      coverLetter: 'cover-letter',
      atsScore: 'ats-score',
    };
    const filename = `${labelMap[activeTab]}.txt`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const outputContent = getOutputContent();
  const hasOutput = Boolean(outputContent);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        minHeight: '600px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ───────── Left: Input Panel ───────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e3e8ee',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Resume Optimizer
        </h2>

        {/* Job Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={6}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #e3e8ee',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#1f2937',
              background: '#f9fafb',
              resize: 'vertical',
              outline: 'none',
              lineHeight: '1.6',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}
            >
              Or paste a URL:
            </span>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://jobs.example.com/posting/123"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e3e8ee',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#1f2937',
                background: '#f9fafb',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Resume */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Your Resume
          </label>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your existing resume text here..."
            rows={6}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #e3e8ee',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#1f2937',
              background: '#f9fafb',
              resize: 'vertical',
              outline: 'none',
              lineHeight: '1.6',
              boxSizing: 'border-box',
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 16px',
              border: '1px solid #e3e8ee',
              borderRadius: '8px',
              background: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.borderColor =
                '#10b981')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.borderColor =
                '#e3e8ee')
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload file (.txt, .pdf, .docx)
          </button>
        </div>

        {/* Target Company + Role */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Target Company
            </label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '1px solid #e3e8ee',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#1f2937',
                background: '#f9fafb',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '32px',
                boxSizing: 'border-box',
              }}
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Target Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              style={{
                padding: '10px 12px',
                border: '1px solid #e3e8ee',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#1f2937',
                background: '#f9fafb',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#dc2626',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
          <button
            type="button"
            onClick={handleOptimizeResume}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: '10px',
              background: loading
                ? '#d1d5db'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            Optimize Resume
          </button>
          <button
            type="button"
            onClick={handleGenerateCoverLetter}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              border: 'none',
              borderRadius: '10px',
              background: loading
                ? '#d1d5db'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            Generate Cover Letter
          </button>
        </div>
      </div>

      {/* ───────── Right: Output Panel ───────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e3e8ee',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
        }}
      >
        {/* Tab switcher + action buttons row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f3f4f6',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
            }}
          >
            {(
              [
                { key: 'resume' as OutputTab, label: 'Optimized Resume' },
                { key: 'coverLetter' as OutputTab, label: 'Cover Letter' },
                { key: 'atsScore' as OutputTab, label: 'ATS Score' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '7px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: activeTab === tab.key ? '#111827' : '#6b7280',
                  background: activeTab === tab.key ? '#ffffff' : 'transparent',
                  boxShadow:
                    activeTab === tab.key
                      ? '0 1px 3px rgba(0,0,0,0.08)'
                      : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Copy + Download */}
          {hasOutput && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #e3e8ee',
                  borderRadius: '8px',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor =
                    '#10b981')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor =
                    '#e3e8ee')
                }
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #e3e8ee',
                  borderRadius: '8px',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor =
                    '#10b981')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor =
                    '#e3e8ee')
                }
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download .txt
              </button>
            </div>
          )}
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            background: '#f9fafb',
            border: '1px solid #e3e8ee',
            borderRadius: '10px',
            padding: '20px',
            overflowY: 'auto',
            minHeight: '400px',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '16px',
              }}
            >
              {/* Spinner */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #e5e7eb',
                  borderTopColor: '#10b981',
                  borderRadius: '50%',
                  animation: 'resumeOptimizerSpin 0.8s linear infinite',
                }}
              />
              <span
                style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}
              >
                {activeTab === 'resume'
                  ? 'Optimizing your resume...'
                  : activeTab === 'coverLetter'
                    ? 'Generating cover letter...'
                    : 'Calculating ATS score...'}
              </span>
              {/* Inline keyframes */}
              <style>{`
                @keyframes resumeOptimizerSpin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : outputContent ? (
            <pre
              style={{
                margin: 0,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '13px',
                lineHeight: '1.7',
                color: '#1f2937',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {outputContent}
            </pre>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '12px',
                color: '#9ca3af',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                Output will appear here
              </span>
              <span style={{ fontSize: '12px' }}>
                Paste your resume and a job description, then click an action
                button.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
