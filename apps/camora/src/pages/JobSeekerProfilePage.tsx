import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import {
  fetchJobSeekerProfile,
  saveJobSeekerProfile,
  type JobSeekerProfile,
} from '../lib/jobsearch-api';

/**
 * Job-seeker profile editor (assisted-apply feature).
 *
 * A structured candidate profile — distinct from the account ProfilePage.
 * Feeds tailored CV/cover-letter generation and application autofill.
 *
 * Phase 1 (MVP): scalar fields as inputs, skills/languages as comma lists,
 * and the nested arrays (experience/education/certifications) as validated
 * JSON textareas. Structured row editors come in a later phase.
 */

// --- helpers to convert between the API shape and the editable form state ---

const listToText = (v?: string[]): string => (Array.isArray(v) ? v.join(', ') : '');
const textToList = (v: string): string[] =>
  v.split(',').map((s) => s.trim()).filter(Boolean);

const jsonToText = (v: unknown): string => {
  if (v === undefined || v === null) return '';
  const arr = Array.isArray(v) ? v : [];
  return arr.length ? JSON.stringify(arr, null, 2) : '';
};

interface FormState {
  full_name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  skills: string;
  languages: string;
  work_authorization: string;
  experienceJson: string;
  educationJson: string;
  certificationsJson: string;
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
    full_name: p.full_name || '',
    headline: p.headline || '',
    location: p.location || '',
    email: p.email || '',
    phone: p.phone || '',
    linkedin: links.linkedin || '',
    github: links.github || '',
    website: links.website || '',
    summary: p.summary || '',
    skills: listToText(p.skills),
    languages: listToText(p.languages),
    work_authorization: p.work_authorization || '',
    experienceJson: jsonToText(p.experience),
    educationJson: jsonToText(p.education),
    certificationsJson: jsonToText(p.certifications),
  };
}

/** Parse a JSON-array textarea; throws a friendly error if invalid. */
function parseJsonArray(text: string, label: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON array (e.g. [ { ... } ]).`);
  }
  return parsed;
}

function formToProfile(f: FormState): JobSeekerProfile {
  const links: Record<string, string> = {};
  if (f.linkedin.trim()) links.linkedin = f.linkedin.trim();
  if (f.github.trim()) links.github = f.github.trim();
  if (f.website.trim()) links.website = f.website.trim();

  return {
    full_name: f.full_name.trim() || null,
    headline: f.headline.trim() || null,
    location: f.location.trim() || null,
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    links,
    summary: f.summary.trim() || null,
    skills: textToList(f.skills),
    languages: textToList(f.languages),
    work_authorization: f.work_authorization.trim() || null,
    experience: parseJsonArray(f.experienceJson, 'Experience'),
    education: parseJsonArray(f.educationJson, 'Education'),
    certifications: parseJsonArray(f.certificationsJson, 'Certifications'),
  };
}

// --- small presentational helpers ---

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{props.label}</label>
      <input
        className={inputCls}
        type={props.type || 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

export default function JobSeekerProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchJobSeekerProfile();
      setForm(profileToForm(profile));
      if (profile?.updated_at) setSavedAt(profile.updated_at);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) load();
    else if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, load]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = formToProfile(form); // may throw on bad JSON
      const saved = await saveJobSeekerProfile(payload);
      setForm(profileToForm(saved));
      setSavedAt(saved.updated_at || new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to manage your job-seeker profile.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Job-seeker profile
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Used to tailor your CV, cover letters, and application autofill.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
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
              <label className={labelCls}>Professional summary</label>
              <textarea
                className={`${inputCls} min-h-[100px]`}
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Skills</label>
                <input className={inputCls} value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="Python, PostgreSQL, Docker" />
                <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
              </div>
              <div>
                <label className={labelCls}>Languages</label>
                <input className={inputCls} value={form.languages} onChange={(e) => set('languages', e.target.value)} placeholder="English, Danish" />
                <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
              </div>
            </section>

            <section className="space-y-4">
              {([
                ['Experience', 'experienceJson', '[ { "company": "", "title": "", "start": "", "end": "", "bullets": [] } ]'],
                ['Education', 'educationJson', '[ { "institution": "", "degree": "", "year": "" } ]'],
                ['Certifications', 'certificationsJson', '[ { "name": "", "date": "" } ]'],
              ] as const).map(([label, key, ph]) => (
                <div key={key}>
                  <label className={labelCls}>{label} <span className="font-normal text-gray-500">(JSON array)</span></label>
                  <textarea
                    className={`${inputCls} min-h-[120px] font-mono text-xs`}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={ph}
                    spellCheck={false}
                  />
                </div>
              ))}
            </section>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              {savedAt && !saving && (
                <span className="text-xs text-gray-500">
                  Last saved {new Date(savedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
