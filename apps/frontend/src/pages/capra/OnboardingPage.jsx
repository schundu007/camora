import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const JOB_ROLES = [
  {
    id: 'backend',
    label: 'Backend Engineering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <line x1="2" y1="8" x2="22" y2="8" />
        <circle cx="6" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="9" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="12" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
        <path d="M7 13l3 3-3 3" />
        <line x1="13" y1="19" x2="17" y2="19" />
      </svg>
    ),
  },
  {
    id: 'frontend',
    label: 'Frontend Engineering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
        <line x1="8" y1="17" x2="8" y2="20" />
        <line x1="16" y1="17" x2="16" y2="20" />
        <path d="M9 8l-3 3 3 3" />
        <path d="M15 8l3 3-3 3" />
      </svg>
    ),
  },
  {
    id: 'fullstack',
    label: 'Full Stack Engineering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="4" y="2" width="16" height="6" rx="1.5" />
        <rect x="4" y="9" width="16" height="6" rx="1.5" />
        <rect x="4" y="16" width="16" height="6" rx="1.5" />
        <circle cx="7.5" cy="5" r="1" fill="currentColor" stroke="none" />
        <circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="7.5" cy="19" r="1" fill="currentColor" stroke="none" />
        <line x1="11" y1="5" x2="17" y2="5" />
        <line x1="11" y1="12" x2="17" y2="12" />
        <line x1="11" y1="19" x2="17" y2="19" />
      </svg>
    ),
  },
  {
    id: 'devops',
    label: 'DevOps / SRE',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        <path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49" />
      </svg>
    ),
  },
  {
    id: 'data',
    label: 'Data Engineering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" />
        <path d="M21 11v6c0 1.66-4.03 3-9 3s-9-1.34-9-3v-6" />
      </svg>
    ),
  },
  {
    id: 'ml',
    label: 'ML / AI Engineering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="12" r="2" />
        <circle cx="5" cy="6" r="1.5" />
        <circle cx="19" cy="6" r="1.5" />
        <circle cx="5" cy="18" r="1.5" />
        <circle cx="19" cy="18" r="1.5" />
        <line x1="6.3" y1="7.2" x2="10.5" y2="10.8" />
        <line x1="17.7" y1="7.2" x2="13.5" y2="10.8" />
        <line x1="6.3" y1="16.8" x2="10.5" y2="13.2" />
        <line x1="17.7" y1="16.8" x2="13.5" y2="13.2" />
      </svg>
    ),
  },
  {
    id: 'mobile',
    label: 'Mobile Development',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="5" y="1" width="14" height="22" rx="3" />
        <line x1="5" y1="5" x2="19" y2="5" />
        <line x1="5" y1="19" x2="19" y2="19" />
        <circle cx="12" cy="21" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'qa',
    label: 'QA / SDET',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    id: 'em',
    label: 'Engineering Manager',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="7" r="3" />
        <path d="M5.5 21a6.5 6.5 0 0113 0" />
        <circle cx="19" cy="11" r="2" />
        <path d="M22 17.5a3.5 3.5 0 00-5.5-2.5" />
        <circle cx="5" cy="11" r="2" />
        <path d="M2 17.5a3.5 3.5 0 015.5-2.5" />
      </svg>
    ),
  },
  {
    id: 'architect',
    label: 'Solutions Architect',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="8.5" y="3" width="7" height="7" rx="1" />
        <line x1="12" y1="10" x2="6.5" y2="14" />
        <line x1="12" y1="10" x2="17.5" y2="14" />
      </svg>
    ),
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

export default function OnboardingPage() {
  const { token: accessToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Get Started | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const [step, setStep] = useState(1);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [resumeTab, setResumeTab] = useState('upload'); // 'upload' | 'paste'
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  const toggleRole = useCallback((roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  }, []);

  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected';
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return 'Please upload a .pdf, .docx, or .txt file';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be under 5MB';
    }
    return null;
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch(`${API_URL}/api/onboarding/upload-resume`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setResumeFile(file);
      setUploadedFileName(file.name);
      if (data.text) {
        setResumeText(data.text);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [accessToken, validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleComplete = useCallback(async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          job_roles: selectedRoles,
          resume_text: resumeText || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      navigate('/capra/prepare');
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setSubmitting(false);
    }
  }, [accessToken, selectedRoles, resumeText]);

  const progressPercent = step === 1 ? 50 : 100;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Card */}
        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-lg overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-[var(--bg-elevated)]">
            <div
              className="h-full bg-[var(--accent-subtle)]0 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="p-8">
            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                step >= 1 ? 'bg-[var(--accent-subtle)]0' : 'bg-[var(--border)]'
              }`} />
              <div className="w-8 h-px bg-[var(--border)]" />
              <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                step >= 2 ? 'bg-[var(--accent-subtle)]0' : 'bg-[var(--border)]'
              }`} />
            </div>

            {/* Step 1: Job Roles */}
            {step === 1 && (
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    What roles are you interviewing for?
                  </h1>
                  <p className="text-[var(--text-secondary)]">
                    Select all that apply — we'll tailor your preparation
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                  {JOB_ROLES.map((role) => {
                    const selected = selectedRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-center
                          ${selected
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent-hover)]'
                            : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-app)]'
                          }`}
                      >
                        {selected && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-4 h-4 text-[var(--accent)]" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <div className={`${selected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} transition-colors`}>
                          {role.icon}
                        </div>
                        <span className="text-sm font-medium leading-tight">{role.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={selectedRoles.length === 0}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200
                    ${selectedRoles.length > 0
                      ? 'bg-[var(--accent-subtle)]0 text-white hover:bg-[var(--accent-hover)] shadow-sm hover:shadow-md'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                    }`}
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Resume Upload */}
            {step === 2 && (
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                    Upload your resume
                  </h1>
                  <p className="text-[var(--text-secondary)]">
                    We'll use this to personalize your interview prep
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border)] mb-6">
                  <button
                    onClick={() => setResumeTab('upload')}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                      resumeTab === 'upload'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => setResumeTab('paste')}
                    className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                      resumeTab === 'paste'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>

                {/* Upload tab */}
                {resumeTab === 'upload' && (
                  <div className="mb-6">
                    {uploadedFileName ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-subtle)]">
                        <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-[var(--accent-hover)] font-medium truncate">{uploadedFileName}</span>
                        <button
                          onClick={() => {
                            setUploadedFileName('');
                            setResumeFile(null);
                            setResumeText('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="ml-auto text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                          ${dragOver
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                            : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-app)] hover:bg-[var(--bg-elevated)]'
                          }
                          ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-8 h-8 text-[var(--accent)] animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-sm text-[var(--text-secondary)]">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <svg className="w-8 h-8 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                              <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
                            </svg>
                            <div className="text-center">
                              <p className="text-sm text-[var(--text-secondary)]">
                                <span className="text-[var(--accent)] font-medium">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">PDF, DOCX, or TXT (max 5MB)</p>
                            </div>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Paste tab */}
                {resumeTab === 'paste' && (
                  <div className="mb-6">
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste your resume text here..."
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--accent)] focus:ring-0 outline-none text-sm text-[var(--text-primary)] placeholder-gray-400 resize-none transition-colors"
                    />
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleComplete}
                    disabled={submitting}
                    className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-[var(--accent-subtle)]0 text-white hover:bg-[var(--accent-hover)] shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting && (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {submitting ? 'Setting up...' : 'Complete Setup'}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => { setStep(1); setError(''); }}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Back
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={submitting}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          You can update these preferences anytime in Settings
        </p>
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
