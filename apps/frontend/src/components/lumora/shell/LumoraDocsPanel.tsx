/**
 * Interview Docs — full-page document manager for interview context.
 * Upload or paste: JD, Resume, Prep Notes, Company Research, etc.
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const STORAGE_KEY = 'lumora_docs';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface DocItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  content: string;
  fileName?: string;
}

const DEFAULT_DOCS: DocItem[] = [
  { id: 'jd', label: 'Job Description', icon: '📋', description: 'Paste or upload the job description for your target role', content: '' },
  { id: 'resume', label: 'Resume / CV', icon: '📄', description: 'Your resume — AI uses this to personalize answers', content: '' },
  { id: 'prep', label: 'Prep Notes', icon: '📝', description: 'Key points, talking points, STAR stories', content: '' },
  { id: 'company', label: 'Company Research', icon: '🏢', description: 'Company info, culture, recent news, tech stack', content: '' },
  { id: 'questions', label: 'Expected Questions', icon: '❓', description: 'Likely interview questions and your prepared answers', content: '' },
  { id: 'cheatsheet', label: 'Cheat Sheet', icon: '⚡', description: 'Quick reference — formulas, patterns, complexity', content: '' },
];

function loadDocs(): DocItem[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : DEFAULT_DOCS; } catch { return DEFAULT_DOCS; }
}
function saveDocs(docs: DocItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(docs)); } catch {}
}

export function LumoraDocsPanel({ onClose }: { onClose?: () => void }) {
  const { token } = useAuth();
  const [docs, setDocs] = useState<DocItem[]>(loadDocs);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveDocs(docs); }, [docs]);

  const activeItem = docs.find(d => d.id === activeDoc);
  const filledCount = docs.filter(d => d.content.trim().length > 0).length;

  const updateContent = (id: string, content: string, fileName?: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, content, fileName: fileName || d.fileName } : d));
  };

  const handleFileUpload = async (file: File) => {
    if (!activeDoc || !token) return;
    setUploading(true);
    try {
      // Try to extract text from the file
      if (file.type === 'text/plain') {
        const text = await file.text();
        updateContent(activeDoc, text, file.name);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // Send to backend for text extraction
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/api/extract`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          updateContent(activeDoc, data.text || `[Uploaded: ${file.name}]`, file.name);
        } else {
          // Fallback: store filename reference
          updateContent(activeDoc, `[Uploaded: ${file.name}]`, file.name);
        }
      } else {
        const text = await file.text();
        updateContent(activeDoc, text, file.name);
      }
    } catch {
      updateContent(activeDoc, `[Uploaded: ${file.name}]`, file.name);
    }
    setUploading(false);
  };

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-app)' }}>
      {/* Left sidebar — document list */}
      <div className="w-[240px] flex flex-col shrink-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Interview Docs</h2>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{filledCount}/{docs.length} documents ready</p>
          {/* Progress bar */}
          <div className="mt-2 h-1 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(filledCount / docs.length) * 100}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {docs.map((doc) => {
            const isActive = doc.id === activeDoc;
            const hasFilled = doc.content.trim().length > 0;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <span className="text-base">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{doc.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {hasFilled ? (doc.fileName || `${doc.content.length} chars`) : 'Empty'}
                  </div>
                </div>
                {hasFilled && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — document editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeItem ? (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-lg">{activeItem.icon}</span>
                  {activeItem.label}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{activeItem.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {uploading ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  )}
                  Upload File
                </button>
                {activeItem.content && (
                  <button onClick={() => updateContent(activeDoc!, '', undefined)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Editor body */}
            <div className="flex-1 min-h-0 flex flex-col">
              {activeItem.fileName && (
                <div className="flex items-center gap-2 px-6 py-2" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{activeItem.fileName}</span>
                </div>
              )}
              <textarea
                value={activeItem.content}
                onChange={(e) => updateContent(activeDoc!, e.target.value)}
                placeholder={`Paste your ${activeItem.label.toLowerCase()} here, or upload a file (PDF, DOCX, TXT).\n\nThis content will be used by the AI Copilot to give more relevant, personalized answers during your interview.`}
                className="flex-1 p-6 text-sm leading-relaxed resize-none focus:outline-none"
                style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none' }}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {activeItem.content.length > 0 ? `${activeItem.content.length.toLocaleString()} characters` : 'No content yet'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Auto-saved to browser</span>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Interview Documents</h3>
            <p className="text-sm text-center max-w-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Add your job description, resume, and prep notes. The AI Copilot uses these to give personalized, context-aware answers during your interview.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {docs.map(d => (
                <button key={d.id} onClick={() => setActiveDoc(d.id)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-colors"
                  style={{ background: d.content ? 'var(--accent-subtle)' : 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <span>{d.icon}</span>
                  <div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{d.label}</div>
                    <div className="text-[10px]" style={{ color: d.content ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {d.content ? 'Ready' : 'Add'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
