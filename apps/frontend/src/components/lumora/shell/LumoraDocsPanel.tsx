/**
 * Interview Prep — matches capra.cariara.com/app/prep layout.
 * Sidebar sections + upload zones + Generate button.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const STORAGE_KEY = 'lumora_docs_v3';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface DocState {
  jd: string;
  jdFile?: string;
  resume: string;
  resumeFile?: string;
  coverLetter: string;
  coverLetterFile?: string;
  prepMaterials: string;
  prepMaterialsFile?: string;
  studyMaterials: string;
  studyMaterialsFile?: string;
  // Generated sections
  sections: Record<string, string>;
}

const INITIAL_STATE: DocState = {
  jd: '', resume: '', coverLetter: '', prepMaterials: '', studyMaterials: '',
  sections: {},
};

const SIDEBAR_SECTIONS = [
  { id: 'input', label: 'Input Materials', color: '#10b981' },
  { id: 'jd-view', label: 'Job Description', color: '#6366f1' },
  { id: 'pitch', label: 'Elevator Pitch', color: '#ec4899' },
  { id: 'hr', label: 'HR Questions', color: '#f59e0b' },
  { id: 'hiring-manager', label: 'Hiring Manager', color: '#06b6d4' },
  { id: 'coding', label: 'Coding', color: '#10b981' },
  { id: 'system-design', label: 'System Design', color: '#3b82f6' },
  { id: 'behavioral', label: 'Behavioral', color: '#f97316' },
  { id: 'techstack', label: 'Tech Stack', color: '#8b5cf6' },
];

function loadState(): DocState {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : INITIAL_STATE; } catch { return INITIAL_STATE; }
}
function saveState(s: DocState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function UploadZone({ label, required, value, fileName, onUpload, onPaste }: {
  label: string; required?: boolean; value: string; fileName?: string;
  onUpload: (file: File) => void; onPaste: (text: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[120px] ${dragOver ? 'ring-2 ring-indigo-500' : ''}`}
      style={{ background: value ? 'var(--accent-subtle)' : 'var(--bg-surface)', border: `1px solid ${value ? 'var(--accent)' : 'var(--border)'}` }}
      onClick={() => ref.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <input ref={ref} type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      {value ? (
        <>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--accent)', color: '#fff' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{fileName || 'Content added'}</span>
          <span className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{value.length.toLocaleString()} characters</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6 mb-2" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}{required && <span style={{ color: '#ef4444' }}>*</span>}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Drop or click</span>
        </>
      )}
    </div>
  );
}

export function LumoraDocsPanel({ onClose }: { onClose?: () => void }) {
  const { token } = useAuth();
  const [state, setState] = useState<DocState>(loadState);
  const [activeSection, setActiveSection] = useState('input');
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');

  useEffect(() => { saveState(state); }, [state]);

  const extractFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }
    if (!token) return `[Uploaded: ${file.name}]`;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API_URL}/api/extract`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (res.ok) { const d = await res.json(); return d.text || `[${file.name}]`; }
    } catch {}
    return `[Uploaded: ${file.name}]`;
  }, [token]);

  const handleGenerate = useCallback(async () => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    setGenerating(true);
    const newSections: Record<string, string> = {};

    for (const section of ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack']) {
      setGenProgress(`Generating ${SIDEBAR_SECTIONS.find(s => s.id === section)?.label || section}...`);
      try {
        const res = await fetch(`${API_URL}/api/v1/prep/section`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ section, jobDescription: state.jd, resume: state.resume, coverLetter: state.coverLetter, prepMaterial: state.prepMaterials }),
        });
        if (res.ok) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let text = '';
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              text += decoder.decode(value, { stream: true });
            }
          }
          newSections[section] = text;
        }
      } catch (err) {
        newSections[section] = `Error generating ${section}`;
      }
    }

    setState(prev => ({ ...prev, sections: { ...prev.sections, ...newSections } }));
    setGenerating(false);
    setGenProgress('');
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token]);

  const hasRequiredDocs = state.jd.trim().length > 0 && state.resume.trim().length > 0;

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <div className="w-[180px] flex flex-col shrink-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Interview Prep</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {SIDEBAR_SECTIONS.map((s) => {
            const isActive = s.id === activeSection;
            const hasContent = s.id === 'input' ? hasRequiredDocs : !!state.sections[s.id];
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-xs font-medium"
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  borderLeft: isActive ? `3px solid var(--accent)` : '3px solid transparent',
                }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hasContent ? s.color : 'var(--border)' }} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Generate button */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handleGenerate} disabled={!hasRequiredDocs || generating}
            className="w-full py-2.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {generating ? genProgress || 'Generating...' : `Generate (${SIDEBAR_SECTIONS.length - 1})`}
          </button>
          {!hasRequiredDocs && <p className="text-[9px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>Add JD & Resume to start</p>}
          <button onClick={() => { setState(INITIAL_STATE); setActiveSection('input'); }}
            className="w-full py-1.5 mt-1.5 text-[10px] font-medium rounded-lg" style={{ color: 'var(--text-muted)' }}>Clear</button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {activeSection === 'input' ? (
          <div className="p-6 max-w-4xl">
            {/* Materials */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Materials</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <UploadZone label="Job Description" required value={state.jd} fileName={state.jdFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, jd: t, jdFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, jd: t }))} />
                <UploadZone label="Resume" required value={state.resume} fileName={state.resumeFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, resume: t, resumeFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, resume: t }))} />
                <UploadZone label="Cover Letter" value={state.coverLetter} fileName={state.coverLetterFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, coverLetter: t, coverLetterFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, coverLetter: t }))} />
                <UploadZone label="Prep Materials" value={state.prepMaterials} fileName={state.prepMaterialsFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, prepMaterials: t, prepMaterialsFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, prepMaterials: t }))} />
              </div>
            </div>

            {/* Study Materials */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Study Materials</span>
              </div>
              <UploadZone label="Drop files or click" value={state.studyMaterials} fileName={state.studyMaterialsFile}
                onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, studyMaterials: t, studyMaterialsFile: f.name })); }}
                onPaste={(t) => setState(p => ({ ...p, studyMaterials: t }))} />
            </div>

            {/* Status */}
            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {hasRequiredDocs ? 'Ready to generate — click Generate in the sidebar' : 'Add JD & Resume to start'}
              </p>
            </div>
          </div>
        ) : activeSection === 'jd-view' ? (
          /* JD viewer/editor */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Job Description</h3>
            </div>
            <textarea value={state.jd} onChange={(e) => setState(p => ({ ...p, jd: e.target.value }))}
              placeholder="Paste your job description here..." className="flex-1 p-6 text-sm leading-relaxed resize-none focus:outline-none"
              style={{ background: 'transparent', color: 'var(--text-secondary)' }} />
          </div>
        ) : (
          /* Generated section content */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}
              </h3>
              {state.sections[activeSection] && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>Generated</span>
              )}
            </div>
            <div className="flex-1 overflow-auto p-6">
              {state.sections[activeSection] ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {state.sections[activeSection]}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>No content yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {hasRequiredDocs ? 'Click Generate to create prep material' : 'Add JD & Resume first, then Generate'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
