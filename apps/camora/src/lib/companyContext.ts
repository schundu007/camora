/**
 * Company-prep context helpers for Lumora behavioral. Pulls from the
 * existing /api/company-preps endpoint, formats a generated prep as a
 * single study-doc-shaped blob, and writes it onto the active Lumora
 * assistant so buildSystemContext() picks it up automatically.
 *
 * Storage strategy:
 *   • The picked prep gets injected into the assistant's `studyDocs`
 *     array as a single entry whose name starts with `Company Prep — `.
 *     buildSystemContext already treats studyDocs as authoritative
 *     reference material — Sona will lean on it for behavioral answers
 *     without refusing general-knowledge questions.
 *   • The active prep id lives in localStorage so the picker can show
 *     the current selection across page reloads.
 *   • When the user picks a different prep (or clears), only the
 *     `Company Prep — ` entry is touched; user-uploaded study docs and
 *     other assistant fields stay intact.
 */

const PREP_DOC_PREFIX = 'Company Prep — ';
const ACTIVE_PREP_KEY = 'lumora_active_company_prep_id';
const ASSISTANT_UPDATED_EVENT = 'lumora:assistant-updated';

export interface CompanyPrep {
  id: string;
  company_name: string;
  inputs?: any;
  generated?: any;
  custom_sections?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyPrepListItem {
  id: string;
  company_name: string;
  updated_at: string;
}

const ASCEND_API_URL =
  (import.meta as any).env?.VITE_CAPRA_API_URL || 'http://localhost:3009';

async function authedJson(path: string, token: string): Promise<any | null> {
  try {
    const r = await fetch(`${ASCEND_API_URL}${path}`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function fetchCompanyPreps(token: string): Promise<CompanyPrepListItem[]> {
  const data = await authedJson('/api/company-preps', token);
  const preps: any[] = data?.preps || [];
  return preps.map((p) => ({
    id: String(p.id),
    company_name: String(p.company_name || 'Untitled'),
    updated_at: String(p.updated_at || p.created_at || ''),
  }));
}

export async function fetchCompanyPrep(id: string, token: string): Promise<CompanyPrep | null> {
  const data = await authedJson(`/api/company-preps/${id}`, token);
  return data?.prep ? (data.prep as CompanyPrep) : null;
}

/**
 * The `inputs.documentation` and `generated.*` fields can come back as
 * either parsed JSON (objects) or stringified JSON depending on which
 * driver wrote them. Parse defensively before rendering.
 */
function safeParse(v: any): any {
  if (v == null) return v;
  if (typeof v !== 'string') return v;
  const trimmed = v.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { /* fall through */ }
  }
  return v;
}

function stringify(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  // Pretty-print structured generated content so it stays human-readable
  // when slotted into the system prompt.
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

/**
 * Compose the prep into a single study-doc blob. Includes JD, prep
 * notes, and the behavioral-relevant generated sections (pitch, hr,
 * hiring-manager, behavioral). Skips the technical sections (coding /
 * system-design / techstack) — those are noise in a behavioral context.
 */
export function formatPrepAsStudyDoc(prep: CompanyPrep): { name: string; content: string } {
  const sections: string[] = [];

  sections.push(`COMPANY: ${prep.company_name}`);

  const inputs = safeParse(prep.inputs) || {};
  const generated = safeParse(prep.generated) || {};

  if (inputs.jobDescription) sections.push(`JOB DESCRIPTION:\n${inputs.jobDescription}`);
  if (inputs.coverLetter) sections.push(`COVER LETTER:\n${inputs.coverLetter}`);
  if (inputs.prepMaterials) sections.push(`PREP NOTES:\n${inputs.prepMaterials}`);

  if (generated.pitch) sections.push(`PITCH:\n${stringify(generated.pitch)}`);
  if (generated.hr) sections.push(`HR / INTRO PREP:\n${stringify(generated.hr)}`);
  if (generated['hiring-manager']) {
    sections.push(`HIRING MANAGER PREP:\n${stringify(generated['hiring-manager'])}`);
  }
  if (generated.behavioral) sections.push(`BEHAVIORAL PREP:\n${stringify(generated.behavioral)}`);
  if (generated.rrk) sections.push(`RRK / RECRUITER PREP:\n${stringify(generated.rrk)}`);

  // Surface uploaded documentation references by name only — full bodies
  // would blow the system prompt budget. Sona can still cite them.
  const docs = Array.isArray(inputs.documentation) ? inputs.documentation : [];
  if (docs.length > 0) {
    const lines = docs.map((d: any) => `• ${d.name || 'untitled'}`).join('\n');
    sections.push(`UPLOADED DOCUMENTATION (in this company prep):\n${lines}`);
  }

  return {
    name: `${PREP_DOC_PREFIX}${prep.company_name}`,
    content: sections.join('\n\n'),
  };
}

export function getActivePrepId(): string | null {
  try { return localStorage.getItem(ACTIVE_PREP_KEY); } catch { return null; }
}

function setActivePrepId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_PREP_KEY, id);
    else localStorage.removeItem(ACTIVE_PREP_KEY);
  } catch { /* localStorage may be locked */ }
}

/**
 * Read the current Lumora assistants array, replace any existing
 * company-prep study doc with the new one, persist, and fire the
 * assistant-updated event so AICompanionPanel rebuilds systemContext.
 *
 * Pass `null` to clear the active company prep without touching other
 * fields.
 */
export function applyPrepToActiveAssistant(prep: CompanyPrep | null): void {
  let list: any[] = [];
  try {
    const stored = localStorage.getItem('lumora_assistants');
    if (stored) list = JSON.parse(stored);
  } catch { list = []; }

  if (!Array.isArray(list) || list.length === 0) {
    list = [{ id: 'default', name: 'My Interview', studyDocs: [] }];
  }

  const current = { ...(list[0] || {}) };
  const existingDocs = Array.isArray(current.studyDocs) ? current.studyDocs : [];
  const otherDocs = existingDocs.filter(
    (d: any) => typeof d?.name !== 'string' || !d.name.startsWith(PREP_DOC_PREFIX),
  );

  if (prep) {
    const doc = formatPrepAsStudyDoc(prep);
    current.studyDocs = [doc, ...otherDocs];
    // Backfill the company / role labels if the assistant doesn't have
    // them yet — saves the user a step of typing.
    if (!current.company) current.company = prep.company_name;
  } else {
    current.studyDocs = otherDocs;
  }

  list[0] = current;
  try { localStorage.setItem('lumora_assistants', JSON.stringify(list)); }
  catch { /* localStorage may be locked */ }

  setActivePrepId(prep?.id || null);
  try { window.dispatchEvent(new Event(ASSISTANT_UPDATED_EVENT)); } catch { /* SSR */ }
}

export { ASSISTANT_UPDATED_EVENT, PREP_DOC_PREFIX };
