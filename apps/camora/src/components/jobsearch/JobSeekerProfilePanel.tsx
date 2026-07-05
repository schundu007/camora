import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  fetchJobSeekerProfile,
  saveJobSeekerProfile,
  parseProfileFromResume,
  uploadBaseResume,
  type JobSeekerProfile,
} from '../../lib/jobsearch-api';
import { T, CX, banner } from './theme';

/**
 * Job-seeker profile editor, rendered as the "Job Profile" tab inside the
 * account ProfilePage. Structured, no-JSON editors for experience / education
 * / certifications (add & remove rows). Drives tailored CV/cover-letter
 * generation + application autofill; includes "Autofill from my base resume".
 */

// --- structured entry shapes (bullets held as newline text while editing) ---
interface ExpEntry { company: string; title: string; start: string; end: string; bullets: string }
interface EduEntry { institution: string; degree: string; year: string }
interface CertEntry { name: string; date: string }

const listToText = (v?: string[]): string => (Array.isArray(v) ? v.join(', ') : '');
const textToList = (v: string): string[] => v.split(',').map((s) => s.trim()).filter(Boolean);
const linesToList = (v: string): string[] => v.split('\n').map((s) => s.trim()).filter(Boolean);

const s = (v: unknown): string => (v == null ? '' : String(v));

interface FormState {
  full_name: string; headline: string; location: string; email: string; phone: string;
  linkedin: string; github: string; website: string; summary: string; skills: string;
  languages: string; work_authorization: string;
  experience: ExpEntry[]; education: EduEntry[]; certifications: CertEntry[];
}

const EMPTY_FORM: FormState = {
  full_name: '', headline: '', location: '', email: '', phone: '',
  linkedin: '', github: '', website: '', summary: '', skills: '',
  languages: '', work_authorization: '', experience: [], education: [], certifications: [],
};

function toEntries<E>(v: unknown, map: (o: Record<string, unknown>) => E): E[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => map((item && typeof item === 'object' ? item : {}) as Record<string, unknown>));
}

function profileToForm(p: JobSeekerProfile | null): FormState {
  if (!p) return EMPTY_FORM;
  const links = p.links || {};
  return {
    full_name: p.full_name || '', headline: p.headline || '', location: p.location || '',
    email: p.email || '', phone: p.phone || '',
    linkedin: links.linkedin || '', github: links.github || '', website: links.website || '',
    summary: p.summary || '',
    skills: listToText(p.skills), languages: listToText(p.languages),
    work_authorization: p.work_authorization || '',
    experience: toEntries<ExpEntry>(p.experience, (o) => ({
      company: s(o.company), title: s(o.title), start: s(o.start), end: s(o.end),
      bullets: Array.isArray(o.bullets) ? o.bullets.map(s).join('\n') : s(o.bullets),
    })),
    education: toEntries<EduEntry>(p.education, (o) => ({
      institution: s(o.institution || o.school), degree: s(o.degree), year: s(o.year),
    })),
    certifications: toEntries<CertEntry>(p.certifications, (o) => ({
      name: s(o.name), date: s(o.date),
    })),
  };
}

const nonEmpty = (obj: Record<string, unknown>) =>
  Object.values(obj).some((v) => (Array.isArray(v) ? v.length : String(v || '').trim()));

function formToProfile(f: FormState): JobSeekerProfile {
  const links: Record<string, string> = {};
  if (f.linkedin.trim()) links.linkedin = f.linkedin.trim();
  if (f.github.trim()) links.github = f.github.trim();
  if (f.website.trim()) links.website = f.website.trim();
  return {
    full_name: f.full_name.trim() || null, headline: f.headline.trim() || null,
    location: f.location.trim() || null, email: f.email.trim() || null, phone: f.phone.trim() || null,
    links, summary: f.summary.trim() || null,
    skills: textToList(f.skills), languages: textToList(f.languages),
    work_authorization: f.work_authorization.trim() || null,
    experience: f.experience
      .map((e) => ({ company: e.company.trim(), title: e.title.trim(), start: e.start.trim(), end: e.end.trim(), bullets: linesToList(e.bullets) }))
      .filter(nonEmpty),
    education: f.education
      .map((e) => ({ institution: e.institution.trim(), degree: e.degree.trim(), year: e.year.trim() }))
      .filter(nonEmpty),
    certifications: f.certifications
      .map((c) => ({ name: c.name.trim(), date: c.date.trim() }))
      .filter(nonEmpty),
  };
}

// --- small presentational pieces -------------------------------------------

function Input(props: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input className={CX.input} style={T.input} type={props.type || 'text'} value={props.value}
      placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className={CX.label} style={T.body}>
        {props.label}{props.required && <span style={{ color: '#e5798a' }}> *</span>}
      </label>
      <Input value={props.value} onChange={props.onChange} placeholder={props.placeholder} type={props.type} />
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 border-b pb-1 text-sm font-bold uppercase tracking-wide" style={T.sectionTitle}>
      {children}
    </h3>
  );
}

function RepeatableSection<E>(props: {
  title: string; entries: E[]; blank: E;
  onChange: (next: E[]) => void;
  render: (entry: E, update: (patch: Partial<E>) => void) => ReactNode;
}) {
  const { title, entries, blank, onChange, render } = props;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between border-b pb-1" style={{ borderColor: 'var(--accent-subtle)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wide" style={T.sectionTitle}>{title}</h3>
        <button onClick={() => onChange([...entries, { ...blank }])} className="rounded px-2.5 py-1 text-xs font-medium" style={T.subtleBtn}>
          + Add
        </button>
      </div>
      {entries.length === 0 && <p className="text-xs" style={T.muted}>None yet — click Add.</p>}
      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-lg p-3" style={T.card}>
            {render(entry, (patch) => onChange(entries.map((e, j) => (j === i ? { ...e, ...patch } : e))))}
            <button onClick={() => onChange(entries.filter((_, j) => j !== i))} className="mt-2 text-xs hover:underline" style={T.muted}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function JobSeekerProfilePanel() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const profile = await fetchJobSeekerProfile();
      setForm(profileToForm(profile));
      if (profile?.updated_at) setSavedAt(profile.updated_at);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAutofill = async () => {
    setAutofilling(true); setError(null); setInfo(null);
    try {
      const parsed = await parseProfileFromResume();
      setForm(profileToForm(parsed));
      setInfo('Filled from your base resume — review the fields and Save.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Autofill failed';
      setError(/no readable base resume|no_resume/i.test(msg)
        ? 'No base resume found. Upload one with “Upload base resume” above, then try Autofill again.'
        : msg);
    } finally { setAutofilling(false); }
  };

  const onUpload = async (file: File) => {
    setUploading(true); setError(null); setInfo(null);
    try {
      await uploadBaseResume(file);
      setInfo('Base resume uploaded — now click “Autofill from my base resume” to fill your profile.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSave = async () => {
    // Don't let an empty profile be saved — it can't tailor anything.
    if (!form.full_name.trim()) {
      setError('Add at least your full name before saving.');
      return;
    }
    const hasDetail =
      form.headline.trim() || form.summary.trim() || form.skills.trim() ||
      form.experience.length || form.education.length ||
      form.email.trim() || form.location.trim();
    if (!hasDetail) {
      setError('Fill in a bit more than just your name (e.g. headline, summary, skills, or experience).');
      return;
    }
    setSaving(true); setError(null); setInfo(null);
    try {
      const saved = await saveJobSeekerProfile(formToProfile(form));
      setForm(profileToForm(saved));
      setSavedAt(saved.updated_at || new Date().toISOString());
      setInfo('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl" style={T.pageTitle}>Job Profile</h2>
          <p className="mt-1 text-sm" style={T.muted}>Used to tailor your CV, cover letters, and application autofill.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60" style={T.ghostBtn}
            title="Upload your base resume (PDF, DOCX, or TXT)">
            {uploading ? 'Uploading…' : '⬆ Upload base resume'}
          </button>
          <button onClick={onAutofill} disabled={autofilling || loading}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60" style={T.subtleBtn}
            title="Fill these fields from your uploaded base resume">
            {autofilling ? 'Reading your resume…' : '✨ Autofill from my base resume'}
          </button>
        </div>
      </div>

      {error && <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={banner('error')}>{error}</div>}
      {info && <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={banner('success')}>{info}</div>}

      {loading ? (
        <p style={T.muted}>Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <SectionHeading>Basics</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required value={form.full_name} onChange={(v) => set('full_name', v)} />
            <Field label="Headline" value={form.headline} onChange={(v) => set('headline', v)} placeholder="e.g. Senior Backend Engineer" />
            <Field label="Location" value={form.location} onChange={(v) => set('location', v)} />
            <Field label="Work authorization" value={form.work_authorization} onChange={(v) => set('work_authorization', v)} placeholder="e.g. EU citizen, needs H1B" />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
            <Field label="LinkedIn" value={form.linkedin} onChange={(v) => set('linkedin', v)} placeholder="https://linkedin.com/in/…" />
            <Field label="GitHub" value={form.github} onChange={(v) => set('github', v)} placeholder="https://github.com/…" />
            <Field label="Website" value={form.website} onChange={(v) => set('website', v)} />
            </div>
          </section>

          <section>
            <SectionHeading>Professional summary</SectionHeading>
            <textarea className={`${CX.input} min-h-[100px]`} style={T.input} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </section>

          <section>
            <SectionHeading>Skills &amp; languages</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CX.label} style={T.body}>Skills</label>
              <Input value={form.skills} onChange={(v) => set('skills', v)} placeholder="Python, PostgreSQL, Docker" />
              <p className="mt-1 text-xs" style={T.muted}>Comma-separated.</p>
            </div>
            <div>
              <label className={CX.label} style={T.body}>Languages</label>
              <Input value={form.languages} onChange={(v) => set('languages', v)} placeholder="English, Danish" />
              <p className="mt-1 text-xs" style={T.muted}>Comma-separated.</p>
            </div>
            </div>
          </section>

          <RepeatableSection<ExpEntry>
            title="Experience" entries={form.experience} onChange={(v) => set('experience', v)}
            blank={{ company: '', title: '', start: '', end: '', bullets: '' }}
            render={(e, update) => (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input value={e.title} onChange={(v) => update({ title: v })} placeholder="Title" />
                  <Input value={e.company} onChange={(v) => update({ company: v })} placeholder="Company" />
                  <Input value={e.start} onChange={(v) => update({ start: v })} placeholder="Start (e.g. Feb 2026)" />
                  <Input value={e.end} onChange={(v) => update({ end: v })} placeholder="End (e.g. Present)" />
                </div>
                <textarea className={`${CX.input} min-h-[70px]`} style={T.input} value={e.bullets}
                  onChange={(ev) => update({ bullets: ev.target.value })} placeholder="Key achievements — one per line" />
              </div>
            )}
          />

          <RepeatableSection<EduEntry>
            title="Education" entries={form.education} onChange={(v) => set('education', v)}
            blank={{ institution: '', degree: '', year: '' }}
            render={(e, update) => (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={e.institution} onChange={(v) => update({ institution: v })} placeholder="Institution" />
                <Input value={e.degree} onChange={(v) => update({ degree: v })} placeholder="Degree" />
                <Input value={e.year} onChange={(v) => update({ year: v })} placeholder="Year" />
              </div>
            )}
          />

          <RepeatableSection<CertEntry>
            title="Certifications" entries={form.certifications} onChange={(v) => set('certifications', v)}
            blank={{ name: '', date: '' }}
            render={(e, update) => (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={e.name} onChange={(v) => update({ name: v })} placeholder="Certification" />
                <Input value={e.date} onChange={(v) => update({ date: v })} placeholder="Date (optional)" />
              </div>
            )}
          />

          <div className="flex items-center gap-4 pt-2">
            <button onClick={onSave} disabled={saving} className="rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60" style={T.primaryBtn}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {savedAt && !saving && <span className="text-xs" style={T.muted}>Last saved {new Date(savedAt).toLocaleString()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
