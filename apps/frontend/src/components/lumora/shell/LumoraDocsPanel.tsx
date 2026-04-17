/**
 * Interview Docs Panel — sidebar for managing interview context documents.
 * Inspired by Zoom Docs: structured sidebar with interview-specific items.
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lumora_docs';

interface DocItem {
  id: string;
  label: string;
  icon: string;
  content: string;
}

const DEFAULT_DOCS: DocItem[] = [
  { id: 'jd', label: 'Job Description', icon: '📋', content: '' },
  { id: 'resume', label: 'Resume / CV', icon: '📄', content: '' },
  { id: 'prep', label: 'Prep Notes', icon: '📝', content: '' },
  { id: 'company', label: 'Company Research', icon: '🏢', content: '' },
  { id: 'questions', label: 'Expected Questions', icon: '❓', content: '' },
  { id: 'cheatsheet', label: 'Cheat Sheet', icon: '⚡', content: '' },
];

function loadDocs(): DocItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_DOCS;
}

function saveDocs(docs: DocItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(docs)); } catch {}
}

export function LumoraDocsPanel({ onClose }: { onClose: () => void }) {
  const [docs, setDocs] = useState<DocItem[]>(loadDocs);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  useEffect(() => { saveDocs(docs); }, [docs]);

  const activeItem = docs.find(d => d.id === activeDoc);

  const updateContent = (id: string, content: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, content } : d));
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0D0C14', borderRight: '1px solid rgba(255,255,255,0.06)', width: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          <span className="text-sm font-bold" style={{ color: '#F2F1F3' }}>Interview Docs</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md transition-colors" style={{ color: '#6C6B7B' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {activeDoc && activeItem ? (
        /* Document editor view */
        <div className="flex-1 flex flex-col min-h-0">
          <button onClick={() => setActiveDoc(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors"
            style={{ color: '#818cf8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Back to all docs
          </button>
          <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-lg mr-2">{activeItem.icon}</span>
            <span className="text-sm font-semibold" style={{ color: '#F2F1F3' }}>{activeItem.label}</span>
          </div>
          <textarea
            value={activeItem.content}
            onChange={(e) => updateContent(activeDoc, e.target.value)}
            placeholder={`Paste your ${activeItem.label.toLowerCase()} here...\n\nThis context will be used by the AI to give better, more relevant answers during your interview.`}
            className="flex-1 p-4 text-sm leading-relaxed resize-none focus:outline-none"
            style={{ background: 'transparent', color: '#A1A0AB', border: 'none' }}
          />
          <div className="px-4 py-2 text-[10px]" style={{ color: '#545260', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {activeItem.content.length > 0 ? `${activeItem.content.length} characters` : 'Empty — paste content to provide context'}
          </div>
        </div>
      ) : (
        /* Document list view */
        <div className="flex-1 overflow-y-auto py-2">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ color: '#A1A0AB' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="text-base">{doc.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium" style={{ color: '#F2F1F3' }}>{doc.label}</div>
                {doc.content ? (
                  <div className="text-[10px] truncate mt-0.5" style={{ color: '#6C6B7B' }}>
                    {doc.content.slice(0, 50)}...
                  </div>
                ) : (
                  <div className="text-[10px] mt-0.5" style={{ color: '#545260' }}>Empty</div>
                )}
              </div>
              {doc.content && (
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#818cf8' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
