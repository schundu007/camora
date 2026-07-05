import { useState, useEffect, useCallback } from 'react';
import {
  fetchJobSeekerProfile,
  saveJobSeekerProfile,
  parseProfileFromResume,
  type JobSeekerProfile,
} from '../../lib/jobsearch-api';
import { T, CX, banner } from './theme';

/**
 * Job-seeker profile editor, rendered as the "Job Profile" tab inside the
 * account ProfilePage — one profile surface, not three. This structured
 * profile drives tailored CV/cover-letter generation and application autofill.
 * Includes one-click "Autofill from my base resume" (parses the resume
 * uploaded on the Preferences tab). Auth is handled by ProfilePage.
 */

const listToText = (v?: string[]): string => (Array.isArray(v) ? v.join(', ') : '');
const textToList = (v: string): string[] =>
  v.split(',').map((s) => s.trim()).filter(Boolean);

const jsonToText = (v: unknown): string => {
  if (v === undefined || v === null) return '';
  const arr = Array.isArray(v) ? v : [];
  return arr.length ? JSON.stringify(arr, null, 2) : '';
};

interface FormState {
  full_name: string; headline: string; location: string; email: string; phone: string;
  linkedin: string; github: string; website: string; summary: string; skills: string;
  languages: string; work_authorization: string; experienceJson: string;
  educationJson: string; certificationsJson: string;
}

const EMPTY_FORM: FormState = {
  full_name: '', headline: '', location: '', email: '', phone: '',
  linkedin: '', github: '', website: '', summary: '', skills: '',
  languages: '', work_authorization: '', experienceJson: '',
  educationJson: '', certificationsJson: '',
};

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
    experienceJson: jsonToText(p.experience),
    educationJson: jsonToText(p.education),
    certificationsJson: jsonToText(p.certifications),
  };
}

function parseJsonArray(text: string, label: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { throw new Error(`${label} is not valid JSON.`); }
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array (e.g. [ { ... } ]).`);
  return parsed;
}

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
    experience: parseJsonArray(f.experienceJson, 'Experience'),
    education: parseJsonArray(f.educationJson, 'Education'),
    certifications: parseJsonArray(f.certificationsJson, 'Certifications'),
  };
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className={CX.label} style={T.body}>{props.label}</label>
      <input className={CX.input} style={T.input} type={props.type || 'text'} value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

export default function JobSeekerProfilePanel() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
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
        ? 'No base resume found. Upload one under the Preferences tab, then try Autofill again.'
        : msg);
    } finally { setAutofilling(false); }
  };

  const onSave = async () => {
    setSaving(true); setError(null); setInfo(null);
    try {
      const payload = formToProfile(form); // may throw on bad JSON
      const saved = await saveJobSeekerProfile(payload);
      setForm(profileToForm(saved));
      setSavedAt(saved.updated_at || new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={T.heading}>Job Profile</h2>
          <p className="mt-1 text-sm" style={T.muted}>Used to tailor your CV, cover letters, and application autofill.</p>
        </div>
        <button onClick={onAutofill} disabled={autofilling || loading}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={T.subtleBtn}
          title="Fill these fields from the base resume you uploaded under Preferences">
          {autofilling ? 'Reading your resume…' : '✨ Autofill from my base resume'}
        </button>
      </div>

      {error && <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={banner('error')}>{error}</div>}
      {info && <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={banner('success')}>{info}</div>}

      {loading ? (
        <p style={T.muted}>Loading…</p>
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" value={form.full_name} onChange={(v) => set('full_name', v)} />
            <Field label="Headline" value={form.headline} onChange={(v) => set('headline', v)} placeholder="e.g. Senior Backend Engineer" />
            <Field label="Location" value={form.location} onChange={(v) => set('location', v)} />
            <Field label="Work authorization" value={form.work_authorization} onChange={(v) => set('work_authorization', v)} placeholder="e.g. EU citizen, needs H1B" />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
            <Field label="LinkedIn" value={form.linkedin} onChange={(v) => set('linkedin', v)} placeholder="https://linkedin.com/in/…" />
            <Field label="GitHub" value={form.github} onChange={(v) => set('github', v)} placeholder="https://github.com/…" />
            <Field label="Website" value={form.website} onChange={(v) => set('website', v)} />
          </section>

          <section>
            <label className={CX.label} style={T.body}>Professional summary</label>
            <textarea className={`${CX.input} min-h-[100px]`} style={T.input} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={CX.label} style={T.body}>Skills</label>
              <input className={CX.input} style={T.input} value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="Python, PostgreSQL, Docker" />
              <p className="mt-1 text-xs" style={T.muted}>Comma-separated.</p>
            </div>
            <div>
              <label className={CX.label} style={T.body}>Languages</label>
              <input className={CX.input} style={T.input} value={form.languages} onChange={(e) => set('languages', e.target.value)} placeholder="English, Danish" />
              <p className="mt-1 text-xs" style={T.muted}>Comma-separated.</p>
            </div>
          </section>

          <section className="space-y-4">
            {([
              ['Experience', 'experienceJson', '[ { "company": "", "title": "", "start": "", "end": "", "bullets": [] } ]'],
              ['Education', 'educationJson', '[ { "institution": "", "degree": "", "year": "" } ]'],
              ['Certifications', 'certificationsJson', '[ { "name": "", "date": "" } ]'],
            ] as const).map(([label, key, ph]) => (
              <div key={key}>
                <label className={CX.label} style={T.body}>{label} <span className="font-normal" style={T.muted}>(JSON array)</span></label>
                <textarea className={`${CX.input} min-h-[120px] font-mono text-xs`} style={T.input} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={ph} spellCheck={false} />
              </div>
            ))}
          </section>

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
