/* ── LumoraProfilePage + AssistantsPage + their shared text helpers
   Lifted out of LumoraShellPage.tsx so the shell file is closer to the
   actual shell-level concerns (routing, top bar, tab content). The two
   tab pages here share TextFieldWithPreview / FormatTextPreview /
   extractTextFromFile so we keep them colocated. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { dialogConfirm, dialogAlert } from '../../../components/shared/Dialog';
import type { LumoraStory } from '../../../lib/lumora-assistant';

/* ── Format plain text into readable HTML ── */
export function FormatTextPreview({ text, label }: { text: string; label: string }) {
  if (!text) return null;
  const raw = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s*\|\s*/g, '\n').replace(/\t+/g, '\n');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } = { title: '', items: [] };

  lines.forEach(line => {
    const isHeader = (line === line.toUpperCase() && line.length < 80 && line.length > 2 && /[A-Z]{2}/.test(line))
      || (line.endsWith(':') && line.length < 50)
      || /^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|PROJECTS|CERTIFICATIONS|ABOUT|REQUIREMENTS|RESPONSIBILITIES|QUALIFICATIONS|BENEFITS|DESCRIPTION|OVERVIEW)/i.test(line);
    if (isHeader) {
      if (currentSection.title || currentSection.items.length) sections.push(currentSection);
      currentSection = { title: line.replace(/:$/, ''), items: [] };
    } else {
      currentSection.items.push(line);
    }
  });
  if (currentSection.title || currentSection.items.length) sections.push(currentSection);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #F8FAFC, #EFF6FF)', borderBottom: '1px solid #E2E8F0' }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{label}</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: '#E0F2FE', color: '#0284C7' }}>{lines.length} lines</span>
      </div>
      <div className="px-4 py-3 max-h-[500px] overflow-auto text-[13px] leading-[1.8]" style={{ color: '#334155' }}>
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.title && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#0F172A' }}>{section.title}</h4>
              </div>
            )}
            {section.items.map((item, ii) => {
              const isBullet = /^[-•●○▪▸►✓✔★]/.test(item) || /^\d+[.)]/.test(item);
              const kvMatch = item.match(/^([A-Za-z\s&/,()]+?):\s+(.+)$/);
              const cleaned = item.replace(/^[-•●○▪▸►✓✔★]\s*/, '').replace(/^\d+[.)]\s*/, '');

              if (isBullet) return (
                <div key={ii} className="flex gap-2 ml-3 mb-1">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                  <span>{cleaned}</span>
                </div>
              );
              if (kvMatch && kvMatch[1].length < 30) return (
                <div key={ii} className="mb-1 ml-3">
                  <span className="font-semibold" style={{ color: '#0F172A' }}>{kvMatch[1]}:</span>
                  <span className="ml-1">{kvMatch[2]}</span>
                </div>
              );
              const isTitle = item.length < 60 && /\b(Engineer|Manager|Developer|Director|Lead|Senior|Junior|Intern|Analyst|Designer|Architect)\b/i.test(item);
              if (isTitle) return <p key={ii} className="font-semibold mt-2 mb-0.5" style={{ color: '#0F172A' }}>{item}</p>;
              return <p key={ii} className="mb-1">{item}</p>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Editable text field with preview toggle ── */
export function TextFieldWithPreview({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [previewing, setPreviewing] = useState(false);
  const iS: React.CSSProperties = { border: '1px solid #E2E8F0', outline: 'none', background: '#fff' };
  return previewing && value ? (
    <div>
      <button onClick={() => setPreviewing(false)} className="text-[9px] font-semibold mb-1 px-2 py-0.5 rounded" style={{ color: 'var(--cam-primary)', border: '1px solid #E2E8F0' }}>Edit</button>
      <FormatTextPreview text={value} label={label} />
    </div>
  ) : (
    <div>
      {value && <button onClick={() => setPreviewing(true)} className="text-[9px] font-semibold mb-1 px-2 py-0.5 rounded" style={{ color: 'var(--cam-primary)', border: '1px solid #E2E8F0' }}>Preview</button>}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} className="w-full px-3 py-2 rounded-lg text-sm" style={{ ...iS, resize: 'vertical' as const }} />
    </div>
  );
}

/* ── File text extractor — handles .txt, .docx, .pdf ── */
async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt')) {
    return (await file.text()).trim();
  }
  if (name.endsWith('.docx')) {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const docXml = await zip.file('word/document.xml')?.async('text');
    if (!docXml) throw new Error('Invalid DOCX');
    const paragraphs: string[] = [];
    const pMatches = docXml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
    for (const p of pMatches) {
      const texts: string[] = [];
      const tMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      for (const t of tMatches) {
        const content = t.replace(/<[^>]+>/g, '');
        if (content) texts.push(content);
      }
      const line = texts.join('').trim();
      if (line) paragraphs.push(line);
    }
    return paragraphs.join('\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
  if (name.endsWith('.pdf')) {
    const raw = await file.text();
    return raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return (await file.text()).trim();
}

/* ── Lumora Profile Page ── */
export function LumoraProfilePage() {
  const { user, subscription, logout } = useAuth();
  const plan = subscription?.plan || 'free';
  const planLabel = plan === 'free' ? 'Free' : plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 w-full">
      {/* User header */}
      <div className="flex items-center gap-4 mb-8">
        {user?.image ? (
          <img src={user.image} alt="" className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'var(--cam-primary)' }}>
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>{user?.name || 'User'}</h2>
          <p className="text-sm" style={{ color: '#64748B' }}>{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Account */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Account</div>
          <div className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Email</span>
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Name</span>
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>{user?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Plan</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: plan === 'free' ? '#F1F5F9' : 'rgba(38,97,156,0.1)', color: plan === 'free' ? '#64748B' : 'var(--cam-primary)' }}>{planLabel}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs" style={{ color: '#64748B' }}>Status</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#16A34A' }}>{subscription?.status || 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Preferences</div>
          <div className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-medium block" style={{ color: '#0F172A' }}>AI Model</span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>Model used for real-time answers</span>
              </div>
              <select className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
                <option>Auto (Recommended)</option>
                <option>Claude Sonnet 4</option>
                <option>Claude Opus 4</option>
                <option>Claude Haiku</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-medium block" style={{ color: '#0F172A' }}>Answer Mode</span>
                <span className="text-[10px]" style={{ color: '#94A3B8' }}>Short for live interviews, detailed for practice</span>
              </div>
              <select className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid #E2E8F0', background: '#fff' }}>
                <option>Short</option>
                <option>Detailed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#F8FAFC', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Quick Links</div>
          <div className="divide-y" style={{ borderColor: '#E2E8F0' }}>
            <Link to="/lumora/pricing" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>Manage Subscription</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
            <Link to="/lumora/credits" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>Credits & Usage</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
            <Link to="/lumora/assistants" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-medium" style={{ color: '#0F172A' }}>Interview Assistants</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={logout} className="w-full text-center py-3 text-xs font-semibold rounded-xl transition-colors hover:bg-red-50" style={{ color: '#EF4444', border: '1px solid #FEE2E2' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ── Assistants Page — Role + Resume + JD based ── */
interface Assistant {
  id: string;
  name: string;
  role: string;
  company: string;
  model: string;
  resume: string;
  jobDescription: string;
  stories?: LumoraStory[];
  storyParseStatus?: 'idle' | 'parsing' | 'done' | 'failed';
  createdAt: string;
}

const AI_MODELS = [
  { value: 'claude-sonnet', label: 'Claude Sonnet 4', provider: 'Anthropic', color: '#D9B543' },
  { value: 'claude-opus', label: 'Claude Opus 4', provider: 'Anthropic', color: '#D9B543' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', color: '#10B981' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI', color: '#10B981' },
  { value: 'o3-mini', label: 'o3-mini', provider: 'OpenAI', color: '#10B981' },
];

export function AssistantsPage() {
  const { token } = useAuth();
  const LUMORA_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
  const [assistants, setAssistants] = useState<Assistant[]>(() => {
    try { return JSON.parse(localStorage.getItem('lumora_assistants') || '[]'); } catch { return []; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', company: '', model: 'claude-sonnet', resume: '', jobDescription: '' });
  const save = (list: Assistant[]) => { setAssistants(list); localStorage.setItem('lumora_assistants', JSON.stringify(list)); };

  /** Kick off resume → Story Bank extraction in the background. */
  const parseStories = async (assistantId: string, resume: string) => {
    if (!resume.trim() || !token) return;
    setAssistants(prev => {
      const next = prev.map(a => a.id === assistantId ? { ...a, storyParseStatus: 'parsing' as const } : a);
      localStorage.setItem('lumora_assistants', JSON.stringify(next));
      return next;
    });
    try {
      const r = await fetch(`${LUMORA_API}/api/v1/stories/parse`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resume }),
      });
      const data = await r.json();
      setAssistants(prev => {
        const next = prev.map(a => a.id === assistantId
          ? { ...a, stories: Array.isArray(data?.stories) ? data.stories : [], storyParseStatus: (r.ok ? 'done' : 'failed') as 'done' | 'failed' }
          : a);
        localStorage.setItem('lumora_assistants', JSON.stringify(next));
        return next;
      });
    } catch {
      setAssistants(prev => {
        const next = prev.map(a => a.id === assistantId ? { ...a, storyParseStatus: 'failed' as const } : a);
        localStorage.setItem('lumora_assistants', JSON.stringify(next));
        return next;
      });
    }
  };

  const create = () => {
    if (!form.company.trim() && !form.role.trim()) return;
    const id = Date.now().toString();
    const newAssistant: Assistant = {
      id,
      name: form.name.trim() || (form.company || 'Interview') + ' — ' + (form.role || 'General'),
      role: form.role.trim(),
      company: form.company.trim(),
      model: form.model,
      resume: form.resume.trim(),
      jobDescription: form.jobDescription.trim(),
      createdAt: new Date().toISOString(),
      storyParseStatus: form.resume.trim() ? 'parsing' : 'idle',
    };
    save([newAssistant, ...assistants]);
    setForm({ name: '', role: '', company: '', model: 'claude-sonnet', resume: '', jobDescription: '' });
    setShowCreate(false);
    if (newAssistant.resume) parseStories(id, newAssistant.resume);
  };
  const remove = async (id: string) => {
    const ok = await dialogConfirm({ title: 'Delete this assistant?', message: 'The assistant profile and its stored resume/stories will be removed.', confirmLabel: 'Delete', tone: 'danger' });
    if (ok) save(assistants.filter(a => a.id !== id));
  };
  const iS: React.CSSProperties = { border: '1px solid #E2E8F0', outline: 'none', background: '#fff' };
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Interview Assistants</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg" style={{ background: 'var(--cam-primary)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          New
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: '#64748B' }}>Add your resume and job description so AI personalizes answers to your background during live interviews.</p>
      {showCreate && (
        <div className="mb-6 p-5 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" className="px-3 py-2 rounded-lg text-sm" style={iS} />
            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" className="px-3 py-2 rounded-lg text-sm" style={iS} />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (auto)" className="px-3 py-2 rounded-lg text-sm" style={iS} />
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: '#94A3B8' }}>AI Model</label>
            <div className="flex gap-2">{AI_MODELS.map(m => (
              <button key={m.value} onClick={() => setForm(f => ({ ...f, model: m.value }))} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ border: form.model === m.value ? '2px solid ' + m.color : '1px solid #E2E8F0', color: form.model === m.value ? m.color : '#64748B', background: form.model === m.value ? m.color + '08' : '#fff' }}>{m.label}</button>
            ))}</div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Your Resume</label>
              <label className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors hover:bg-[#F1F5F9]" style={{ color: 'var(--cam-primary)', border: '1px solid #E2E8F0' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                Upload
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const text = await extractTextFromFile(file);
                    setForm(f => ({ ...f, resume: text }));
                  } catch { dialogAlert({ title: 'Could not read file', message: 'Please paste the text directly into the box below.', tone: 'danger' }); }
                  e.target.value = '';
                }} />
              </label>
            </div>
            <TextFieldWithPreview value={form.resume} onChange={v => setForm(f => ({ ...f, resume: v }))} placeholder="Paste resume text or upload a file. AI will reference your experience to craft personalized answers." label="Resume Preview" />
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Job Description</label>
              <label className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors hover:bg-[#F1F5F9]" style={{ color: 'var(--cam-primary)', border: '1px solid #E2E8F0' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                Upload
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  try {
                    const text = await extractTextFromFile(file);
                    setForm(f => ({ ...f, jobDescription: text }));
                  } catch { dialogAlert({ title: 'Could not read file', message: 'Please paste the text directly into the box below.', tone: 'danger' }); }
                  e.target.value = '';
                }} />
              </label>
            </div>
            <TextFieldWithPreview value={form.jobDescription} onChange={v => setForm(f => ({ ...f, jobDescription: v }))} placeholder="Paste the JD or upload a file. AI will tailor answers to match role requirements." label="Job Description Preview" />
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={!form.company.trim() && !form.role.trim()} className="px-5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--cam-primary)' }}>Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-semibold rounded-lg" style={{ color: '#64748B', border: '1px solid #E2E8F0' }}>Cancel</button>
          </div>
        </div>
      )}
      {assistants.length === 0 && !showCreate ? (
        <div className="text-center py-16 rounded-xl" style={{ border: '2px dashed #E2E8F0' }}>
          <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No assistants yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#94A3B8' }}>Add your resume + job description for personalized AI answers.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-xs font-semibold text-white rounded-lg" style={{ background: 'var(--cam-primary)' }}>Create Your First Assistant</button>
        </div>
      ) : (
        <div className="space-y-3">{assistants.map(a => {
          const mi = AI_MODELS.find(m => m.value === a.model);
          return (
            <div key={a.id} className="p-4 rounded-xl hover:shadow-sm transition-all" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(38,97,156,0.1)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{a.name}</p>
                    <p className="text-[11px]" style={{ color: '#94A3B8' }}>{a.company}{a.company && a.role ? ' · ' : ''}{a.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: (mi?.color || 'var(--cam-primary)') + '10', color: mi?.color || 'var(--cam-primary)' }}>{mi?.label || a.model}</span>
                  <Link to="/lumora" className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--cam-primary)' }}>Launch</Link>
                  <button onClick={() => remove(a.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: '#94A3B8' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></button>
                </div>
              </div>
              {(a.resume || a.jobDescription) && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                {a.resume && <FormatTextPreview text={a.resume} label="Resume" />}
                {a.jobDescription && <FormatTextPreview text={a.jobDescription} label="Job Description" />}
              </div>}

              {a.resume && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(38,97,156,0.04)', border: '1px solid rgba(38,97,156,0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--cam-primary-dk)' }}>Story Bank</span>
                    {a.storyParseStatus === 'parsing' && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: '#64748B' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cam-primary)' }} />
                        Parsing resume…
                      </span>
                    )}
                    {a.storyParseStatus === 'failed' && (
                      <button onClick={() => parseStories(a.id, a.resume)} className="text-[10px] font-semibold underline" style={{ color: '#B91C1C' }}>
                        Parse failed — retry
                      </button>
                    )}
                    {a.storyParseStatus === 'done' && a.stories && (
                      <span className="text-[10px]" style={{ color: '#64748B' }}>· {a.stories.length} stories extracted</span>
                    )}
                  </div>
                  {a.stories && a.stories.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {a.stories.map(s => (
                        <div key={s.id} className="flex items-start gap-2 text-[11px]">
                          <div className="flex flex-wrap gap-0.5 shrink-0 pt-0.5">
                            {s.archetypes.map(t => (
                              <span key={t} className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold" style={{ color: '#0F172A' }}>{s.title}</p>
                            <p className="text-[10px]" style={{ color: '#64748B' }}>{s.summary}{s.impact ? <span style={{ color: 'var(--cam-primary-dk)' }}> · {s.impact}</span> : null}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {a.storyParseStatus !== 'parsing' && (!a.stories || a.stories.length === 0) && a.storyParseStatus !== 'failed' && (
                    <button onClick={() => parseStories(a.id, a.resume)} className="text-[10px] font-semibold underline" style={{ color: 'var(--cam-primary)' }}>
                      Extract stories from resume
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}</div>
      )}
    </div>
  );
}
