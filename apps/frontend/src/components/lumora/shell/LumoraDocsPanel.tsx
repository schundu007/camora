/**
 * Interview Prep — matches capra.cariara.com/app/prep layout.
 * Sidebar sections + upload zones + Generate button.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const STORAGE_KEY = 'lumora_prep_v5'; // v5: fixed SSE parsing
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
  sections: Record<string, string>;
}

interface PrepData {
  companies: string[];
  activeCompany: string | null;
  data: Record<string, DocState>;
}

const EMPTY_DOC: DocState = {
  jd: '', resume: '', coverLetter: '', prepMaterials: '', studyMaterials: '',
  sections: {},
};

const INITIAL_STATE: PrepData = {
  companies: [],
  activeCompany: null,
  data: {},
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

/** Format parsed prep JSON into readable text */
function formatPrepContent(content: any): string {
  if (!content || typeof content !== 'object') return String(content || '');
  const lines: string[] = [];

  // Summary
  if (content.summary) {
    lines.push('SUMMARY', '─'.repeat(40), content.summary, '');
  }

  // Pitch sections
  if (content.pitchSections || content.chSections) {
    const sections = content.pitchSections || content.chSections;
    if (Array.isArray(sections)) {
      sections.forEach((s: any) => {
        lines.push(`■ ${s.title || 'Section'}${s.duration ? ` (${s.duration})` : ''}${s.context ? ` — ${s.context}` : ''}`);
        if (s.bullets) s.bullets.forEach((b: string) => lines.push(`  • ${b}`));
        lines.push('');
      });
    }
  }

  // Company insights
  if (content.companyInsights) {
    const ci = content.companyInsights;
    lines.push('COMPANY INSIGHTS', '─'.repeat(40));
    if (ci.interviewFormat) lines.push(`Interview Format: ${ci.interviewFormat}`);
    if (ci.culture) lines.push(`Culture: ${ci.culture}`);
    if (ci.values) lines.push(`Values: ${Array.isArray(ci.values) ? ci.values.join(', ') : ci.values}`);
    lines.push('');
  }

  // Questions
  if (content.questions && Array.isArray(content.questions)) {
    lines.push('QUESTIONS', '─'.repeat(40));
    content.questions.forEach((q: any, i: number) => {
      lines.push(`Q${i + 1}: ${q.question || q.title || q.text || ''}`);
      if (q.answer) lines.push(`Answer: ${q.answer}`);
      if (q.tips) lines.push(`Tips: ${Array.isArray(q.tips) ? q.tips.join('; ') : q.tips}`);
      if (q.diagramUrl) lines.push(`Diagram: ${q.diagramUrl}`);
      lines.push('');
    });
  }

  // Key points / talking points
  if (content.keyPoints) {
    lines.push('KEY POINTS', '─'.repeat(40));
    (Array.isArray(content.keyPoints) ? content.keyPoints : [content.keyPoints]).forEach((p: string) => lines.push(`• ${p}`));
    lines.push('');
  }
  if (content.talkingPoints) {
    lines.push('TALKING POINTS', '─'.repeat(40));
    (Array.isArray(content.talkingPoints) ? content.talkingPoints : [content.talkingPoints]).forEach((p: string) => lines.push(`• ${p}`));
    lines.push('');
  }

  // Tips
  if (content.tips) {
    lines.push('TIPS', '─'.repeat(40));
    (Array.isArray(content.tips) ? content.tips : [content.tips]).forEach((t: string) => lines.push(`• ${t}`));
    lines.push('');
  }

  // Abbreviations
  if (content.abbreviations && Array.isArray(content.abbreviations)) {
    lines.push('ABBREVIATIONS', '─'.repeat(40));
    content.abbreviations.forEach((a: any) => lines.push(`${a.term || a.abbr}: ${a.definition || a.full}`));
    lines.push('');
  }

  // Fallback: stringify remaining keys
  const handled = new Set(['summary', 'pitchSections', 'chSections', 'companyInsights', 'questions', 'keyPoints', 'talkingPoints', 'tips', 'abbreviations']);
  for (const [key, val] of Object.entries(content)) {
    if (handled.has(key) || !val) continue;
    if (typeof val === 'string') lines.push(`${key.toUpperCase()}: ${val}`);
    else if (Array.isArray(val)) {
      lines.push(`${key.toUpperCase()}:`);
      val.forEach((v: any) => lines.push(`  • ${typeof v === 'string' ? v : JSON.stringify(v)}`));
    }
  }

  return lines.join('\n').trim() || JSON.stringify(content, null, 2);
}

function loadPrepData(): PrepData {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : INITIAL_STATE; } catch { return INITIAL_STATE; }
}
function savePrepData(s: PrepData) {
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

/** Parse JD text into structured sections and render beautifully */
function FormattedJD({ text }: { text: string }) {
  if (!text?.trim()) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No job description added yet.</p>;

  // Detect section headers — lines that look like titles (short, no bullet, often Title Case)
  const SECTION_PATTERNS = [
    /^(about\s+(the\s+)?(company|role|team|position|us))/i,
    /^(what\s+you'?ll?\s+(be\s+)?do(ing)?)/i,
    /^(what\s+we\s+(need|are\s+looking|expect|require|want)\s+to\s+see)/i,
    /^(responsibilities|key\s+responsibilities)/i,
    /^(requirements|qualifications|minimum\s+qualifications)/i,
    /^(preferred|nice\s+to\s+have|bonus|ways?\s+to\s+stand\s+out)/i,
    /^(benefits|perks|compensation|what\s+we\s+offer)/i,
    /^(tech\s+stack|technologies|tools)/i,
    /^(who\s+you\s+are|ideal\s+candidate)/i,
    /^(experience|skills)/i,
  ];

  const isHeader = (line: string): boolean => {
    const t = line.trim();
    if (!t || t.length > 80) return false;
    if (SECTION_PATTERNS.some(p => p.test(t))) return true;
    // Title-case short lines without punctuation at end
    if (t.length < 50 && !t.endsWith('.') && !t.endsWith(',') && !t.startsWith('-') && !t.startsWith('•') && /^[A-Z]/.test(t) && !/^\d/.test(t)) {
      const words = t.split(/\s+/);
      if (words.length <= 8 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.5) return true;
    }
    return false;
  };

  const lines = text.split('\n');
  const sections: { title: string | null; items: string[] }[] = [];
  let current: { title: string | null; items: string[] } = { title: null, items: [] };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (isHeader(t)) {
      if (current.items.length > 0 || current.title) sections.push(current);
      current = { title: t, items: [] };
    } else {
      current.items.push(t.replace(/^[-•]\s*/, ''));
    }
  }
  if (current.items.length > 0 || current.title) sections.push(current);

  return (
    <div className="flex flex-col gap-4">
      {sections.map((sec, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          {sec.title && (
            <div className="px-4 py-2.5" style={{ background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid var(--border)' }}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#818cf8' }}>{sec.title}</h4>
            </div>
          )}
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {sec.items.map((item, j) => {
              // First section without title is likely the company description — render as paragraph
              if (i === 0 && !sec.title) {
                return <p key={j} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item}</p>;
              }
              return (
                <div key={j} className="flex gap-2 items-start">
                  <span className="w-1 h-1 rounded-full shrink-0 mt-2" style={{ background: '#818cf8' }} />
                  <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LumoraDocsPanel({ onClose }: { onClose?: () => void }) {
  const { token } = useAuth();
  const [prepData, setPrepData] = useState<PrepData>(loadPrepData);
  const [activeSection, setActiveSection] = useState('input');
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'generating' | 'done' | 'error'>>({});
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const newCompanyRef = useRef<HTMLInputElement>(null);

  useEffect(() => { savePrepData(prepData); }, [prepData]);

  // Auto-create default company if none exists
  useEffect(() => {
    if (prepData.companies.length === 0) {
      setPrepData(prev => ({
        ...prev,
        companies: ['My Interview'],
        activeCompany: 'My Interview',
        data: { ...prev.data, 'My Interview': { ...EMPTY_DOC } },
      }));
    } else if (!prepData.activeCompany && prepData.companies.length > 0) {
      setPrepData(prev => ({ ...prev, activeCompany: prev.companies[0] }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active company's doc state
  const state = prepData.activeCompany ? (prepData.data[prepData.activeCompany] || EMPTY_DOC) : EMPTY_DOC;
  const setState = (updater: DocState | ((prev: DocState) => DocState)) => {
    const company = prepData.activeCompany;
    if (!company) return;
    setPrepData(prev => {
      const newState = typeof updater === 'function' ? updater(prev.data[company] || EMPTY_DOC) : updater;
      return { ...prev, data: { ...prev.data, [company]: newState } };
    });
  };

  const addCompany = () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setPrepData(prev => ({
      ...prev,
      companies: [...prev.companies, name],
      activeCompany: name,
      data: { ...prev.data, [name]: { ...EMPTY_DOC } },
    }));
    setNewCompanyName('');
    setShowNewCompany(false);
    setActiveSection('input');
  };

  const switchCompany = (name: string) => {
    setPrepData(prev => ({ ...prev, activeCompany: name }));
    setShowDropdown(false);
    setActiveSection('input');
  };

  const deleteCompany = (name: string) => {
    setPrepData(prev => {
      const newCompanies = prev.companies.filter(c => c !== name);
      const newData = { ...prev.data };
      delete newData[name];
      return { ...prev, companies: newCompanies, activeCompany: newCompanies[0] || null, data: newData };
    });
  };

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

  const GENERATE_SECTIONS = ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack'];

  const handleGenerate = useCallback(async () => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    setGenerating(true);

    // Initialize all sections as pending
    const initStatus: Record<string, 'pending' | 'generating' | 'done' | 'error'> = {};
    GENERATE_SECTIONS.forEach(s => { initStatus[s] = 'pending'; });
    setSectionStatus(initStatus);

    const newSections: Record<string, string> = {};

    for (let i = 0; i < GENERATE_SECTIONS.length; i++) {
      const section = GENERATE_SECTIONS[i];
      const label = SIDEBAR_SECTIONS.find(s => s.id === section)?.label || section;
      setGenProgress(`${i + 1}/${GENERATE_SECTIONS.length} — ${label}`);
      setSectionStatus(prev => ({ ...prev, [section]: 'generating' }));

      try {
        const res = await fetch(`${API_URL}/api/ascend/prep/section`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ section, jobDescription: state.jd, resume: state.resume, coverLetter: state.coverLetter, prepMaterial: state.prepMaterials }),
        });
        if (res.ok) {
          const text = await res.text();
          // Parse SSE: extract final {done:true, result:{...}} or accumulate chunks
          let result = null;
          let chunks = '';
          for (const line of text.split('\n')) {
            const t = line.trim();
            if (!t.startsWith('data: ')) continue;
            try {
              const parsed = JSON.parse(t.slice(6));
              if (parsed.done && parsed.result) { result = parsed.result; break; }
              if (parsed.chunk) chunks += parsed.chunk;
            } catch {}
          }
          const displayText = result ? formatPrepContent(result) : (chunks ? (() => { try { return formatPrepContent(JSON.parse(chunks)); } catch { return chunks; } })() : text);
          newSections[section] = displayText;
          setSectionStatus(prev => ({ ...prev, [section]: 'done' }));
          // Save progressively so user can see completed sections
          setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: displayText } }));
        } else {
          setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
          newSections[section] = `Error: ${res.status}`;
        }
      } catch (err) {
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
        newSections[section] = `Error generating ${section}`;
      }
    }

    setGenerating(false);
    setGenProgress('');
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token]);

  // Re-generate a single section
  const regenerateSection = useCallback(async (section: string) => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    setSectionStatus(prev => ({ ...prev, [section]: 'generating' }));
    try {
      const res = await fetch(`${API_URL}/api/ascend/prep/section`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section, jobDescription: state.jd, resume: state.resume, coverLetter: state.coverLetter, prepMaterial: state.prepMaterials }),
      });
      if (res.ok) {
        const rawText = await res.text();
        let result = null;
        let chunks = '';
        for (const line of rawText.split('\n')) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(t.slice(6));
            if (parsed.done && parsed.result) { result = parsed.result; break; }
            if (parsed.chunk) chunks += parsed.chunk;
          } catch {}
        }
        const displayText = result ? formatPrepContent(result) : (chunks ? (() => { try { return formatPrepContent(JSON.parse(chunks)); } catch { return chunks; } })() : rawText);
        setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: displayText } }));
        setSectionStatus(prev => ({ ...prev, [section]: 'done' }));
      } else {
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
      }
    } catch {
      setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
    }
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token]);

  const hasRequiredDocs = state.jd.trim().length > 0 && state.resume.trim().length > 0;

  return (
    <div className="h-full flex" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <div className="w-[180px] flex flex-col shrink-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        {/* Company selector */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Interview Prep</h2>
          {prepData.activeCompany ? (
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <span className="truncate">{prepData.activeCompany}</span>
                <svg className="w-3 h-3 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    {prepData.companies.map(c => (
                      <button key={c} onClick={() => switchCompany(c)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors"
                        style={{ color: c === prepData.activeCompany ? 'var(--accent)' : 'var(--text-secondary)', background: c === prepData.activeCompany ? 'var(--accent-subtle)' : 'transparent' }}>
                        <span className="truncate">{c}</span>
                        {prepData.companies.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); deleteCompany(c); }}
                            className="p-0.5 rounded" style={{ color: 'var(--text-muted)' }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </button>
                    ))}
                    <button onClick={() => { setShowDropdown(false); setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
                      className="w-full px-3 py-2 text-xs font-medium text-left" style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}>
                      + Add Company
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : showNewCompany ? (
            <div className="space-y-1.5">
              <input ref={newCompanyRef} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCompany(); if (e.key === 'Escape') setShowNewCompany(false); }}
                placeholder="e.g. Nvidia Devops" className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <div className="flex gap-1.5">
                <button onClick={addCompany} className="flex-1 py-1 text-[10px] font-bold rounded" style={{ background: 'var(--accent)', color: '#fff' }}>Create</button>
                <button onClick={() => setShowNewCompany(false)} className="px-2 py-1 text-[10px] rounded" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
              className="w-full py-2 text-xs font-bold rounded-lg" style={{ background: 'var(--accent)', color: '#fff' }}>
              + Add Company
            </button>
          )}
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
                {/* Status indicator */}
                {sectionStatus[s.id] === 'generating' ? (
                  <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: s.color, borderTopColor: 'transparent' }} />
                ) : sectionStatus[s.id] === 'done' || hasContent ? (
                  <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center" style={{ background: s.color }}>
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : sectionStatus[s.id] === 'error' ? (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                ) : (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--border)' }} />
                )}
                <span className="flex-1">{s.label}</span>
                {sectionStatus[s.id] === 'pending' && generating && (
                  <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>queued</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Generate button + progress */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          {generating && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{genProgress}</span>
                <span className="text-[9px] font-bold" style={{ color: 'var(--accent)' }}>
                  {Object.values(sectionStatus).filter(s => s === 'done').length}/{GENERATE_SECTIONS.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${(Object.values(sectionStatus).filter(s => s === 'done').length / GENERATE_SECTIONS.length) * 100}%`,
                  background: 'var(--accent)',
                }} />
              </div>
            </div>
          )}
          <button onClick={handleGenerate} disabled={!hasRequiredDocs || generating}
            className="w-full py-2.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {generating ? 'Generating...' : `Generate (${GENERATE_SECTIONS.length})`}
          </button>
          {!hasRequiredDocs && <p className="text-[9px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>Add JD & Resume to start</p>}
          <button onClick={() => { setState({ ...EMPTY_DOC } as any); setSectionStatus({}); setActiveSection('input'); }}
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
          /* JD formatted viewer */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Job Description</h3>
              <button onClick={() => setActiveSection('input')} className="text-[10px] font-medium px-2 py-1 rounded-lg" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>Edit</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <FormattedJD text={state.jd} />
            </div>
          </div>
        ) : (
          /* Generated section content */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}
              </h3>
              <div className="flex items-center gap-2">
                {state.sections[activeSection] && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>Generated</span>
                )}
                {hasRequiredDocs && (
                  <button
                    onClick={() => regenerateSection(activeSection)}
                    disabled={sectionStatus[activeSection] === 'generating'}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-40"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    {sectionStatus[activeSection] === 'generating' ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    {state.sections[activeSection] ? 'Re-generate' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {sectionStatus[activeSection] === 'generating' ? (
                <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--border)' }}>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Generating {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}...</span>
                </div>
              ) : state.sections[activeSection] ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {state.sections[activeSection]}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>No content yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {hasRequiredDocs ? 'Click Generate or Re-generate above' : 'Add JD & Resume first'}
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
