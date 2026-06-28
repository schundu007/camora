import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { documentsAPI } from '../../../lib/api-client';
import {
  listInterviewContexts,
  getActiveInterviewContextId,
  saveInterviewContext,
  setActiveInterviewContextId,
  deleteInterviewContext,
  INTERVIEW_CONTEXT_UPDATED_EVENT,
  type InterviewContext,
} from '../../../lib/interview-context';
import { dialogConfirm } from '../../shared/Dialog';

interface DocItem {
  filename: string;
  size: number;
  preview: string;
}

interface FormState {
  name: string;
  company: string;
  role: string;
  jdFilename: string | null;
  resumeFilename: string | null;
  docFilenames: string[];
}

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  role: '',
  jdFilename: null,
  resumeFilename: null,
  docFilenames: [],
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export const InterviewContextDrawer = ({ open, onClose }: Props) => {
  const { token } = useAuth();
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [contexts, setContexts] = useState<InterviewContext[]>(() => listInterviewContexts());
  const [activeId, setActiveIdState] = useState<string | null>(() => getActiveInterviewContextId());
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<'jd' | 'resume' | 'doc' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<'jd' | 'resume' | 'doc'>('doc');

  const refreshContexts = useCallback(() => {
    setContexts(listInterviewContexts());
    setActiveIdState(getActiveInterviewContextId());
  }, []);

  const fetchDocs = useCallback(async () => {
    if (!token) return;
    setDocsLoading(true);
    try {
      const res = await documentsAPI.list(token);
      setDocs(res.documents);
    } catch {
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!open) return;
    refreshContexts();
    fetchDocs();
    const update = () => refreshContexts();
    window.addEventListener(INTERVIEW_CONTEXT_UPDATED_EVENT, update);
    return () => window.removeEventListener(INTERVIEW_CONTEXT_UPDATED_EVENT, update);
  }, [open, fetchDocs, refreshContexts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleActivate = (id: string) => {
    setActiveInterviewContextId(id);
    setActiveIdState(id);
    onClose();
  };

  const handleDeactivate = () => {
    setActiveInterviewContextId(null);
    setActiveIdState(null);
  };

  const handleDelete = async (ctx: InterviewContext) => {
    const ok = await dialogConfirm({
      title: `Delete "${ctx.name}"?`,
      message: 'This removes the interview context. Your uploaded documents are not affected.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    deleteInterviewContext(ctx.id);
    refreshContexts();
  };

  const handleNewClick = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setMode('create');
  };

  const handleUploadClick = (target: 'jd' | 'resume' | 'doc') => {
    uploadTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    e.target.value = '';
    const target = uploadTargetRef.current;
    setUploadingFor(target);
    try {
      const res = await documentsAPI.upload(token, file);
      await fetchDocs();
      if (target === 'jd') setForm(f => ({ ...f, jdFilename: res.filename }));
      else if (target === 'resume') setForm(f => ({ ...f, resumeFilename: res.filename }));
      else setForm(f => ({ ...f, docFilenames: [...f.docFilenames.filter(n => n !== res.filename), res.filename] }));
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.jdFilename && !form.resumeFilename) { setError('Select at least a Job Description or Resume'); return; }
    if (!token) return;
    setError(null);
    setSaving(true);
    try {
      const [jdRes, resumeRes, ...docResults] = await Promise.all([
        form.jdFilename ? documentsAPI.getContent(token, form.jdFilename) : Promise.resolve(null),
        form.resumeFilename ? documentsAPI.getContent(token, form.resumeFilename) : Promise.resolve(null),
        ...form.docFilenames.map(fn => documentsAPI.getContent(token, fn)),
      ]);

      const ctx: InterviewContext = {
        id: `ctx_${Date.now()}`,
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        role: form.role.trim() || undefined,
        jdFilename: form.jdFilename ?? undefined,
        resumeFilename: form.resumeFilename ?? undefined,
        docFilenames: form.docFilenames.length ? form.docFilenames : undefined,
        cachedJd: jdRes?.content,
        cachedResume: resumeRes?.content,
        cachedDocs: docResults.filter(Boolean).map((r, i) => ({
          name: form.docFilenames[i],
          content: r!.content,
        })),
        createdAt: new Date().toISOString(),
      };

      saveInterviewContext(ctx);
      setActiveInterviewContextId(ctx.id);
      setActiveIdState(ctx.id);
      refreshContexts();
      setMode('list');
    } catch {
      setError('Failed to load document content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Interview Context"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: 'min(560px, 94vw)',
          maxHeight: '88vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--cam-gold-leaf)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {/* Header */}
        <div
          className="relative px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--cam-gold-leaf)', background: 'linear-gradient(135deg, rgba(38,97,156,0.05) 0%, rgba(201,162,39,0.06) 100%)' }}
        >
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--cam-primary) 0%, var(--cam-primary-dk) 100%)' }} />
          <div className="pl-3 flex items-start justify-between gap-3">
            <div>
              <span
                className="inline-flex items-center px-2.5 py-0.5 mb-2 rounded-full text-[10px] font-extrabold uppercase tracking-[0.16em]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.45)' }}
              >
                Interview Context
              </span>
              <h2 className="text-[18px] font-extrabold tracking-tight" style={{ color: 'var(--cam-primary)' }}>
                {mode === 'create' ? 'New Interview' : 'Your Interviews'}
              </h2>
              <p className="text-[12.5px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                {mode === 'create'
                  ? 'Pick documents from your library — Sona will use them for tailored answers.'
                  : 'Activate a context so Sona knows which role and documents to use.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'list' && (
            <div className="px-4 py-3">
              {contexts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
                  </div>
                  <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No interview contexts yet</p>
                  <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>Create one to let Sona give you role-specific answers.</p>
                  <button
                    type="button"
                    onClick={handleNewClick}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--cam-primary)', color: '#fff' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    New Interview
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {contexts.map(ctx => {
                    const isActive = ctx.id === activeId;
                    const parts = [
                      ctx.cachedJd && 'JD',
                      ctx.cachedResume && 'Resume',
                      ctx.cachedDocs?.length ? `${ctx.cachedDocs.length} doc${ctx.cachedDocs.length > 1 ? 's' : ''}` : null,
                    ].filter(Boolean) as string[];
                    return (
                      <li key={ctx.id}>
                        <div
                          className="flex items-start gap-3 p-3 rounded-xl"
                          style={{
                            background: isActive ? 'color-mix(in srgb, var(--cam-gold-leaf) 10%, var(--bg-elevated))' : 'var(--bg-elevated)',
                            border: isActive ? '1px solid var(--cam-gold-leaf)' : '1px solid var(--border)',
                          }}
                        >
                          <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? 'var(--cam-primary)' : 'var(--border)' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-bold truncate" style={{ color: isActive ? 'var(--cam-primary)' : 'var(--text-primary)' }}>{ctx.name}</span>
                              {isActive && (
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full" style={{ background: 'var(--cam-primary)', color: '#fff' }}>Active</span>
                              )}
                            </div>
                            {(ctx.company || ctx.role) && (
                              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                {[ctx.role, ctx.company].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {parts.length > 0 && (
                              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{parts.join(' · ')}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive ? (
                              <button
                                type="button"
                                onClick={() => handleActivate(ctx.id)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                                style={{ background: 'var(--cam-primary)', color: '#fff' }}
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleDeactivate}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                              >
                                Deactivate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(ctx)}
                              className="flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-70"
                              style={{ color: 'var(--danger)', border: '1px solid var(--border)' }}
                              aria-label="Delete"
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {mode === 'create' && (
            <div className="px-5 py-4 space-y-5">
              {error && (
                <div className="px-3 py-2 rounded-lg text-[12px] font-semibold" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
                  {error}
                </div>
              )}

              {/* Identity fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Interview Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. NVIDIA Isaac – June 30"
                    className="w-full px-3 py-2 rounded-lg text-[13px]"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Company</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="NVIDIA"
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                    <input
                      type="text"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      placeholder="Senior SWE"
                      className="w-full px-3 py-2 rounded-lg text-[13px]"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--cam-primary)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    />
                  </div>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border)' }} />

              <DocPickerSection
                label="Job Description"
                required
                docs={docs}
                loading={docsLoading}
                selected={form.jdFilename}
                mode="single"
                onSelect={fn => setForm(f => ({ ...f, jdFilename: f.jdFilename === fn ? null : fn }))}
                uploading={uploadingFor === 'jd'}
                onUpload={() => handleUploadClick('jd')}
              />

              <DocPickerSection
                label="Resume"
                required
                docs={docs}
                loading={docsLoading}
                selected={form.resumeFilename}
                mode="single"
                onSelect={fn => setForm(f => ({ ...f, resumeFilename: f.resumeFilename === fn ? null : fn }))}
                uploading={uploadingFor === 'resume'}
                onUpload={() => handleUploadClick('resume')}
              />

              <DocPickerSection
                label="Additional Documents"
                docs={docs}
                loading={docsLoading}
                selectedMulti={form.docFilenames}
                mode="multi"
                onSelectMulti={fn => setForm(f => ({
                  ...f,
                  docFilenames: f.docFilenames.includes(fn)
                    ? f.docFilenames.filter(x => x !== fn)
                    : [...f.docFilenames, fn],
                }))}
                uploading={uploadingFor === 'doc'}
                onUpload={() => handleUploadClick('doc')}
                hint="Architecture docs, prep notes, problem sheets — cited by Sona when relevant."
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx,.md"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          {mode === 'list' ? (
            <>
              <button type="button" onClick={onClose} className="text-[12px] font-semibold px-3 py-1.5 rounded-md" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Close
              </button>
              <button
                type="button"
                onClick={handleNewClick}
                className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: 'var(--cam-primary)', color: '#fff' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                New Interview
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setMode('list'); setError(null); }} className="text-[12px] font-semibold px-3 py-1.5 rounded-md" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-[12px] font-bold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--cam-gold-leaf)', color: '#020617' }}
              >
                {saving ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Loading docs…
                  </>
                ) : 'Save & Activate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── DocPickerSection ── */

interface DocPickerSectionProps {
  label: string;
  required?: boolean;
  docs: DocItem[];
  loading: boolean;
  hint?: string;
  uploading: boolean;
  onUpload: () => void;
  mode: 'single' | 'multi';
  selected?: string | null;
  onSelect?: (fn: string) => void;
  selectedMulti?: string[];
  onSelectMulti?: (fn: string) => void;
}

const DocPickerSection = ({
  label, required, docs, loading, hint, uploading, onUpload,
  mode, selected, onSelect, selectedMulti, onSelectMulti,
}: DocPickerSectionProps) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </span>
      <button
        type="button"
        onClick={onUpload}
        disabled={uploading}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ color: 'var(--accent)', border: '1px solid var(--border)' }}
      >
        {uploading
          ? <span className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        }
        Upload
      </button>
    </div>
    {hint && <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    {loading ? (
      <div className="py-3 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>Loading documents…</div>
    ) : docs.length === 0 ? (
      <div className="py-3 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No documents uploaded yet — click Upload to add one.</div>
    ) : (
      <ul className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
        {docs.map(doc => {
          const isSelected = mode === 'single' ? selected === doc.filename : (selectedMulti ?? []).includes(doc.filename);
          return (
            <li key={doc.filename}>
              <button
                type="button"
                onClick={() => mode === 'single' ? onSelect?.(doc.filename) : onSelectMulti?.(doc.filename)}
                className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors"
                style={{
                  background: isSelected ? 'color-mix(in srgb, var(--cam-primary) 10%, var(--bg-elevated))' : 'var(--bg-elevated)',
                  border: isSelected ? '1px solid var(--cam-primary)' : '1px solid var(--border)',
                }}
              >
                <span className="mt-0.5 shrink-0">
                  {mode === 'single' ? (
                    <span className="flex w-3.5 h-3.5 rounded-full border-2 items-center justify-center" style={{ borderColor: isSelected ? 'var(--cam-primary)' : 'var(--border)' }}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary)' }} />}
                    </span>
                  ) : (
                    <span className="flex w-3.5 h-3.5 rounded border-2 items-center justify-center" style={{ borderColor: isSelected ? 'var(--cam-primary)' : 'var(--border)', background: isSelected ? 'var(--cam-primary)' : 'transparent' }}>
                      {isSelected && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>}
                    </span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: isSelected ? 'var(--cam-primary)' : 'var(--text-primary)' }}>{doc.filename}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {fmtSize(doc.size)} · {doc.preview}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
