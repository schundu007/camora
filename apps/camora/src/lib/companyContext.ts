/**
 * Company-prep context for Lumora behavioral. Reads from the Lumora
 * Prep Kit (`lumora_prep_v8` in localStorage) — the same store the
 * /lumora/prepkit page writes to. Switching the active company here
 * feeds Sona's system context via the existing `getAssistantFromPrepKit()`
 * pipeline, so picking a company in the behavioral panel is equivalent
 * to opening Prep Kit and changing the dropdown.
 *
 * Why localStorage and not the Capra /api/company-preps endpoint:
 * Lumora Prep Kit is a separate, Lumora-native store with its own
 * data shape (jd / resume / coverLetter / prepMaterials / studyDocs /
 * sections). The user's existing prep workspaces ("My Interview",
 * "Fireworks SRE", "Nvidia Devops Role") all live there. Pulling
 * from /api/company-preps would have shown an empty list because
 * those preps are written to a different surface.
 */

import { readPrepRaw, writePrepRaw } from './prepStorage';

export const ASSISTANT_UPDATED_EVENT = 'lumora:assistant-updated';

export interface CompanyPrepListItem {
  /** Workspace label as the user typed it ("Fireworks SRE"). */
  key: string;
  /** Display name — same as key for Lumora Prep Kit. */
  company_name: string;
  /** Inferred richness signal: how much material is loaded. */
  ready: boolean;
  /** Quick stats for the picker UI. */
  hasJd: boolean;
  hasResume: boolean;
  hasGeneratedSections: boolean;
}

interface PrepKitData {
  companies?: string[];
  activeCompany?: string | null;
  data?: Record<string, any>;
}

// Both go through the per-user prepStorage helpers so this surface reads and
// writes the SAME user-scoped, owner-stamped cache as the Prep Kit panel —
// never the old global key that leaked across accounts on a shared browser.
function readPrepKit(): PrepKitData | null {
  return readPrepRaw() as PrepKitData | null;
}

function writePrepKit(prep: PrepKitData): void {
  writePrepRaw(prep);
}

/**
 * List the user's saved company prep workspaces from Lumora Prep Kit.
 * No HTTP — this is a localStorage read so it's instant and works
 * offline.
 */
export function listCompanyPreps(): CompanyPrepListItem[] {
  const prep = readPrepKit();
  if (!prep) return [];
  const companies = Array.isArray(prep.companies) ? prep.companies : [];
  const data = prep.data || {};
  return companies.map((key) => {
    const doc = data[key] || {};
    const jd = (doc.jd || '').trim();
    const resume = (doc.resume || '').trim();
    const sections = doc.sections && typeof doc.sections === 'object' ? doc.sections : {};
    const sectionKeys = Object.keys(sections).filter((k) => sections[k] != null);
    return {
      key,
      company_name: key,
      ready: !!(jd || resume),
      hasJd: !!jd,
      hasResume: !!resume,
      hasGeneratedSections: sectionKeys.length > 0,
    };
  });
}

export function getActiveCompanyKey(): string | null {
  const prep = readPrepKit();
  if (!prep) return null;
  return prep.activeCompany || null;
}

/**
 * Switch the active company workspace. Writes Prep Kit state and fires
 * `lumora:assistant-updated` so AICompanionPanel rebuilds its system
 * context on the very next stream — Sona will lean on the picked
 * company's JD, resume, prep materials, study docs, and generated
 * sections (HR / Hiring Manager / Behavioral / etc.) as authoritative
 * reference.
 *
 * Pass `null` to unset (no active company). The existing `My Interview`
 * fallback still applies inside Prep Kit data if the unset key is the
 * only workspace.
 */
export function setActiveCompanyKey(key: string | null): void {
  const prep = readPrepKit();
  if (!prep) {
    // No Prep Kit data exists yet — nothing to switch. The picker UI
    // should have already prevented this case.
    return;
  }
  prep.activeCompany = key;
  writePrepKit(prep);
  try {
    window.dispatchEvent(new Event(ASSISTANT_UPDATED_EVENT));
  } catch {
    /* SSR */
  }
}
