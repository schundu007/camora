/**
 * Job-search / assisted-apply API client.
 *
 * Talks to the lumora backend's /api/v1/jobsearch/* endpoints. Uses the same
 * auth pattern as the rest of the app: Bearer token from the in-memory store
 * plus `credentials: 'include'` so the httpOnly SSO cookie can ride along.
 */
import { getAuthHeaders } from '../utils/authHeaders';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
// Ascend/Capra backend — owns resume/cover-letter DOCX generation.
const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

/** A structured candidate profile (mirrors the job_seeker_profiles table). */
export interface JobSeekerProfile {
  user_id?: number;
  full_name?: string | null;
  headline?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  links?: Record<string, string>;
  summary?: string | null;
  skills?: string[];
  experience?: unknown[];
  education?: unknown[];
  certifications?: unknown[];
  languages?: string[];
  work_authorization?: string | null;
  preferences?: Record<string, unknown>;
  default_cv_template?: string | null;
  created_at?: string;
  updated_at?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  baseUrl: string = API_URL,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || body.detail || detail;
    } catch {
      // non-JSON error body — keep statusText
    }
    throw new Error(detail);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/** Fetch the current user's job-seeker profile, or null if none exists yet. */
export async function fetchJobSeekerProfile(): Promise<JobSeekerProfile | null> {
  const data = await request<{ profile: JobSeekerProfile | null }>(
    '/api/v1/jobsearch/profile',
  );
  return data.profile;
}

/** Create or replace the current user's job-seeker profile. */
export async function saveJobSeekerProfile(
  profile: JobSeekerProfile,
): Promise<JobSeekerProfile> {
  const data = await request<{ profile: JobSeekerProfile }>(
    '/api/v1/jobsearch/profile',
    { method: 'PUT', body: JSON.stringify(profile) },
  );
  return data.profile;
}

// --- Application tracker -----------------------------------------------------

/** Application statuses in pipeline order (kanban columns). */
export const APPLICATION_STATUSES = [
  'saved',
  'drafting',
  'ready',
  'applied',
  'interviewing',
  'offer',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** A tracked job application (mirrors the job_applications table). */
export interface JobApplication {
  id: string;
  source_job_id?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  job_url?: string | null;
  source?: string | null;
  sector?: string | null;
  role_type?: string | null;
  status: ApplicationStatus;
  fit_rating?: number | null;
  channel?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  tailored_cv_url?: string | null;
  cover_letter_url?: string | null;
  applied_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Fields accepted when creating/updating an application. */
export type JobApplicationInput = Partial<Omit<JobApplication, 'id' | 'created_at' | 'updated_at'>>;

/** List the current user's tracked applications. */
export async function fetchApplications(): Promise<JobApplication[]> {
  const data = await request<{ applications: JobApplication[] }>(
    '/api/v1/jobsearch/applications',
  );
  return data.applications;
}

/** Create a tracked application. */
export async function createApplication(
  input: JobApplicationInput,
): Promise<JobApplication> {
  const data = await request<{ application: JobApplication }>(
    '/api/v1/jobsearch/applications',
    { method: 'POST', body: JSON.stringify(input) },
  );
  return data.application;
}

/** Partially update an application (e.g. move its status). */
export async function updateApplication(
  id: string,
  input: JobApplicationInput,
): Promise<JobApplication> {
  const data = await request<{ application: JobApplication }>(
    `/api/v1/jobsearch/applications/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return data.application;
}

/** Delete an application. */
export async function deleteApplication(id: string): Promise<void> {
  await request<void>(`/api/v1/jobsearch/applications/${id}`, {
    method: 'DELETE',
  });
}

// --- Tailored document generation (reuses ascend's /resume/generate) --------

/** Minimal shape of a job detail from the jobs feed (has the JD text). */
export interface JobDetail {
  id: number | string;
  title?: string | null;
  company_name?: string | null;
  location?: string | null;
  job_url?: string | null;
  job_description?: string | null;
}

/** Fetch a single job from the jobs feed (to prefill the JD when tailoring). */
export async function fetchJobDetail(sourceJobId: string): Promise<JobDetail | null> {
  try {
    const data = await request<{ job?: JobDetail } | JobDetail>(
      `/api/v1/jobs/${sourceJobId}`,
    );
    // The jobs endpoint may return the row directly or wrapped as { job }.
    return (data as { job?: JobDetail }).job ?? (data as JobDetail) ?? null;
  } catch {
    return null; // manual applications won't resolve — caller falls back to paste
  }
}

/** Flatten a structured profile into the plain-text resume `/generate` expects. */
export function profileToResumeText(p: JobSeekerProfile): string {
  const out: string[] = [];
  if (p.full_name) out.push(p.full_name);
  const contact = [
    p.email, p.phone, p.location,
    p.links?.linkedin, p.links?.github, p.links?.website,
  ].filter(Boolean).join('  |  ');
  if (contact) out.push(contact);
  if (p.headline) out.push(p.headline);
  if (p.summary) out.push(`\nSUMMARY\n${p.summary}`);
  if (p.skills?.length) out.push(`\nSKILLS\n${p.skills.join(', ')}`);
  if (p.languages?.length) out.push(`\nLANGUAGES\n${p.languages.join(', ')}`);

  const section = (label: string, items?: unknown[]) => {
    if (!items?.length) return;
    out.push(`\n${label}`);
    for (const item of items) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const head = [o.title || o.degree || o.name, o.company || o.institution || o.school]
          .filter(Boolean).join(' — ');
        const dates = [o.start, o.end, o.year, o.date].filter(Boolean).join(' ');
        if (head || dates) out.push(`${head}${dates ? `  (${dates})` : ''}`);
        const bullets = Array.isArray(o.bullets) ? o.bullets : [];
        for (const b of bullets) out.push(`• ${String(b)}`);
      } else {
        out.push(String(item));
      }
    }
  };
  section('EXPERIENCE', p.experience);
  section('EDUCATION', p.education);
  section('CERTIFICATIONS', p.certifications);

  return out.join('\n');
}

export interface TailoredDocsInput {
  resume: string;
  jobDescription: string;
  company?: string;
  role?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateLinkedIn?: string;
}

interface GeneratedDoc {
  base64: string;
  filename: string;
}

export interface TailoredDocsResult {
  gapAnalysis: {
    matchScore?: number;
    strengths?: string[];
    gaps?: string[];
    quickWins?: string[];
  };
  resume: GeneratedDoc;
  coverLetter: GeneratedDoc;
}

/** Generate a tailored resume + cover letter (DOCX) via the ascend backend. */
export async function generateTailoredDocuments(
  input: TailoredDocsInput,
): Promise<TailoredDocsResult> {
  return request<TailoredDocsResult>(
    '/api/v1/resume/generate',
    { method: 'POST', body: JSON.stringify(input) },
    CAPRA_API,
  );
}

/** Trigger a browser download of a base64-encoded .docx file. */
export function downloadBase64Docx(base64: string, filename: string): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
