/**
 * ResearchDocsCard — lets users upload PDFs/notes for a company prep slot.
 * Uploaded files are indexed by ascend-backend into the RAG pipeline so
 * Sona can reference them during the live interview.
 */
import { useState, useEffect, useRef } from 'react';
import { getAuthHeaders } from '../../../utils/authHeaders';
import { dialogConfirm } from '../../shared/Dialog';

const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const UI_CAP = 10;

interface ResearchDoc {
  id: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  doc_type: string;
  indexed_at: string | null;
  uploaded_at: string;
}

interface ResearchDocsCardProps {
  companySlug: string;
}

const fmtBytes = (n: number | null): string => {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  return `${Math.round(n / 1024)} KB`;
};

const relTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const DocFileIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export const ResearchDocsCard = ({ companySlug }: ResearchDocsCardProps) => {
  const [docs, setDocs] = useState<ResearchDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!companySlug) return;
    try {
      const res = await fetch(
        `${CAPRA_API}/api/v1/prep/docs?company_slug=${encodeURIComponent(companySlug)}`,
        { headers: { ...getAuthHeaders() }, credentials: 'include' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || data.detail || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setDocs(Array.isArray(data.docs) ? data.docs : Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [companySlug]);

  const handleUpload = async (file: File) => {
    if (!companySlug) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('company_slug', companySlug);
      const res = await fetch(`${CAPRA_API}/api/v1/prep/docs/upload`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        credentials: 'include',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.detail || `Upload failed (HTTP ${res.status})`);
        return;
      }
      await fetchDocs();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (doc: ResearchDoc) => {
    const confirmed = await dialogConfirm({
      title: 'Remove document',
      message: `Remove "${doc.filename}" from Research Docs? This cannot be undone.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`${CAPRA_API}/api/v1/prep/docs/${doc.id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || data.detail || `Delete failed (HTTP ${res.status})`);
        return;
      }
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    }
  };

  const mostRecentIndexed = docs
    .filter(d => d.indexed_at)
    .sort((a, b) => new Date(b.indexed_at!).getTime() - new Date(a.indexed_at!).getTime())[0];

  const atCap = docs.length >= UI_CAP;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header — navy strip + gold seam */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: 'var(--cam-hero-strip, var(--bg-elevated))',
          borderBottom: '1px solid var(--cam-gold-leaf)',
        }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider flex-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Research Docs
        </span>

        <span
          className="text-[12px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: docs.length > 0 ? 'rgba(0,71,171,0.15)' : 'var(--bg-elevated)',
            color: docs.length > 0 ? 'var(--cam-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {docs.length}/{UI_CAP}
        </span>

        {mostRecentIndexed && (
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Synced {relTime(mostRecentIndexed.indexed_at!)}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <p className="text-[12px] px-3 py-2 rounded-lg" style={{ background: 'rgba(219,0,0,0.08)', color: 'var(--danger, var(--danger))', border: '1px solid rgba(219,0,0,0.2)' }}>
            {error}
          </p>
        )}

        {docs.length > 0 && (
          <ul className="space-y-1.5">
            {docs.map(doc => (
              <li
                key={doc.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--cam-primary)' }}>
                  <DocFileIcon />
                </span>
                <span
                  className="flex-1 text-[12px] font-medium truncate min-w-0"
                  style={{ color: 'var(--text-primary)' }}
                  data-tip={doc.filename}
                >
                  {doc.filename}
                </span>
                <span className="text-[12px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {fmtBytes(doc.size_bytes)}
                </span>
                {doc.indexed_at ? (
                  <span
                    className="text-[12px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(0,71,171,0.12)', color: 'var(--cam-primary)', border: '1px solid rgba(0,71,171,0.2)' }}
                  >
                    indexed
                  </span>
                ) : (
                  <span
                    className="text-[12px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(255,153,0,0.12)', color: 'var(--cam-gold-leaf-text, #b8891a)', border: '1px solid rgba(255,153,0,0.3)' }}
                  >
                    pending
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  aria-label={`Remove ${doc.filename}`}
                  className="shrink-0 w-6 h-6 rounded flex items-center justify-center"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger, var(--danger))')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!atCap && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold uppercase tracking-wide transition-[opacity,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--cam-primary-dk)', color: '#fff' }}
            >
              {uploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload File
                </>
              )}
            </button>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              10 MB max · PDF, DOCX, TXT
            </span>
          </div>
        )}

        {atCap && (
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {UI_CAP} documents uploaded. Remove one to add more.
          </p>
        )}
      </div>
    </div>
  );
};

export default ResearchDocsCard;
