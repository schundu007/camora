/**
 * Shared helper for building Lumora system context (resume + JD) from the
 * active assistant in localStorage. Used by CodingLayout, DesignLayout, and
 * AICompanionPanel so all three Lumora windows pass identical personalization
 * to the backend.
 */
import { readPrepRaw } from './prepStorage';
import { makeUserScopedStore } from './userScopedStorage';

export type StoryArchetype =
  | 'Conflict' | 'Leadership' | 'Failure' | 'Ambiguity'
  | 'Influence' | 'Innovation' | 'Collaboration' | 'Growth'
  | 'Career' | 'Fit';

export interface LumoraStory {
  id: string;
  title: string;
  summary: string;
  archetypes: StoryArchetype[];
  impact?: string;
}

export interface LumoraStudyDoc {
  name: string;
  content: string;
}

export interface LumoraAssistant {
  id?: string;
  name?: string;
  company?: string;
  role?: string;
  resume?: string;
  jobDescription?: string;
  /** Exact self-introduction, returned VERBATIM for "tell me about yourself".
   *  The one answer nobody wants improvised — no model, no paraphrase, no drift
   *  between renders. Empty/absent means Sona generates it from the resume. */
  pinnedIntro?: string;
  // Multi-document study material loaded via Prep Kit. Sona injects these
  // into the system context so live answers can cite uploaded references
  // (architecture docs, internal wikis, problem sheets, etc).
  studyDocs?: LumoraStudyDoc[];
  stories?: LumoraStory[];
  createdAt?: string;
}

/** Per-user assistants (resume + JD + stories). No legacy migration on purpose:
 *  inheriting the old global blob is precisely the cross-account leak. */
export const assistantsStore = makeUserScopedStore<LumoraAssistant[]>('lumora_assistants_v2');

/** One-time removal of the pre-scoping global key so no reader can fall back
 *  to another account's resume. */
export function purgeLegacyGlobalAssistants(): void {
  try { localStorage.removeItem('lumora_assistants'); } catch { /* private mode */ }
}

/**
 * Call the backend to parse a resume into archetype-tagged stories.
 * Returns empty array on failure so callers can store a value and retry later.
 */
export async function parseResumeToStories(resume: string, token: string, apiUrl: string): Promise<LumoraStory[]> {
  try {
    const r = await fetch(`${apiUrl}/api/v1/stories/parse`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resume }),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data?.stories) ? data.stories : [];
  } catch {
    return [];
  }
}

export function getActiveAssistant(): LumoraAssistant | null {
  try {
    // 1. Prep Kit — the user's active prep workspace (single source of truth).
    const fromPrepKit = getAssistantFromPrepKit();
    if (fromPrepKit) return fromPrepKit;

    // 2. Assistants fallback — per-user scoped. This used to be a GLOBAL
    //    localStorage key, so on a shared machine the next account inherited
    //    the previous candidate's resume and Sona pitched the wrong person.
    const list = assistantsStore.read() || [];
    return list[0] || null;
  } catch {
    return null;
  }
}

/**
 * Read the Prep Kit's localStorage and turn its active company's documents
 * into a LumoraAssistant. The Prep Kit stores under `lumora_prep_v8`
 * (apps/frontend/src/components/lumora/shell/LumoraDocsPanel.tsx).
 *
 * Company name is inferred — the Prep Kit's `activeCompany` is the user's
 * label for the prep workspace ("My Interview"), not necessarily the real
 * company. We scan the resume filename, JD filename, and JD body for
 * known company tokens before falling back to the workspace label.
 */
export function getAssistantFromPrepKit(): LumoraAssistant | null {
  try {
    // MUST go through prepStorage: the Prep Kit writes the per-user scoped key
    // (lumora_prep_v9::<userId>), but this read was still pulling the legacy
    // GLOBAL lumora_prep_v8 blob — i.e. whoever used this machine last. That is
    // how a session for one candidate assembled another candidate's resume.
    const prep = readPrepRaw() as {
      activeCompany: string | null;
      companies: string[];
      data: Record<string, {
        jd?: string; jdFile?: string;
        resume?: string; resumeFile?: string;
        coverLetter?: string;
        prepMaterials?: string;
        studyDocs?: LumoraStudyDoc[];
        // Legacy v7/v8 single-string field — promoted into studyDocs below
        // so users who uploaded one doc on the old shape still see it.
        studyMaterials?: string;
        studyMaterialsFile?: string;
      }>;
    } | null;
    if (!prep) return null;
    const key = prep.activeCompany;
    if (!key) return null;
    const doc = prep.data?.[key];
    if (!doc) return null;
    const jd = (doc.jd || '').trim();
    const resume = (doc.resume || '').trim();
    if (!jd && !resume) return null;
    const company = detectCompany({
      label: key,
      jd,
      resume,
      jdFile: doc.jdFile,
      resumeFile: doc.resumeFile,
    }) || (key && key !== 'My Session' ? key : undefined);

    const studyDocs: LumoraStudyDoc[] = Array.isArray(doc.studyDocs)
      ? doc.studyDocs.filter(d => d && typeof d.content === 'string' && d.content.trim())
          .map(d => ({ ...d, content: d.content.slice(0, 20_000) }))
      : [];
    if (!studyDocs.length && typeof doc.studyMaterials === 'string' && doc.studyMaterials.trim()) {
      studyDocs.push({ name: doc.studyMaterialsFile || 'Study material', content: doc.studyMaterials });
    }

    return {
      id: `prepkit:${key}`,
      name: key,
      company,
      resume: resume || undefined,
      jobDescription: jd || undefined,
      studyDocs: studyDocs.length ? studyDocs : undefined,
    };
  } catch {
    return null;
  }
}

// Known-company tokens that frequently appear in JDs / filenames. Order
// matters only for ties; we pick the highest-scoring match. Add liberally
// — false positives are bounded by the requirement that the token appear
// near JD signal words (role, hiring, position).
const COMPANY_TOKENS = [
  'NVIDIA', 'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Netflix',
  'Stripe', 'Anthropic', 'OpenAI', 'Uber', 'Airbnb', 'Tesla', 'Databricks',
  'Snowflake', 'Shopify', 'Cloudflare', 'GitHub', 'Datadog', 'Pinterest',
  'LinkedIn', 'Twitter', 'X', 'TikTok', 'ByteDance', 'Salesforce', 'Oracle',
  'IBM', 'Intel', 'AMD', 'Adobe', 'Square', 'Block', 'Robinhood', 'Coinbase',
  'Plaid', 'Notion', 'Figma', 'Linear', 'Vercel', 'Supabase', 'Confluent',
  'MongoDB', 'PostgreSQL', 'Roblox', 'Spotify', 'Reddit', 'Discord', 'Zoom',
  'Atlassian', 'Asana', 'Dropbox', 'Box', 'Slack', 'HubSpot', 'Twilio',
  'Doordash', 'DoorDash', 'Lyft', 'Instacart', 'Snap', 'Snapchat', 'Pinterest',
  'Yelp', 'Etsy', 'eBay', 'PayPal', 'Visa', 'Mastercard', 'Mercury', 'Ramp',
  'Brex', 'Affirm', 'Chime', 'Wealthfront', 'Sofi', 'Wise', 'Revolut',
  'Palantir', 'Scale', 'Cohere', 'Mistral', 'Inflection', 'Hugging Face',
  'Replicate', 'Modal', 'Render', 'Fly.io', 'Railway', 'Heroku', 'Netlify',
  'Cisco', 'Juniper', 'Arista', 'Broadcom', 'Qualcomm', 'TSMC', 'Samsung',
  'Sony', 'Nintendo', 'Roku', 'Disney', 'Hulu', 'Paramount', 'Warner',
  'Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Citadel', 'Jane Street',
  'Two Sigma', 'D.E. Shaw', 'Bridgewater', 'Hudson River', 'Jump Trading',
  'Optiver', 'IMC', 'Akuna', 'SIG', 'DRW', 'Tower Research',
];

function detectCompany(input: {
  label?: string | null;
  jd?: string;
  resume?: string;
  jdFile?: string;
  resumeFile?: string;
}): string | undefined {
  const generic = ['my session', 'session', 'default', 'untitled', 'new', 'test'];
  const label = input.label?.trim() || '';

  // 1. If the workspace label contains a known company token, trust it directly.
  //    The user named their prep workspace after the company they're targeting —
  //    that signal is stronger than frequency counts in the document body (which
  //    can score tools like "GitHub" or generic words like "scale" above the
  //    real target company). We scan for a token within the label (whole-word)
  //    so "Salesforce L3 SWE" correctly surfaces "Salesforce".
  if (label && !generic.includes(label.toLowerCase())) {
    for (const token of COMPANY_TOKENS) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i');
      if (re.test(label)) return token;
    }
  }

  // 2. Scan filenames for a company token — filenames like "salesforce_jd.pdf"
  //    are a reliable signal with minimal noise.
  const filenameHaystack = [input.jdFile || '', input.resumeFile || ''].join(' ');
  if (filenameHaystack.trim()) {
    for (const token of COMPANY_TOKENS) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i');
      if (re.test(filenameHaystack)) return token;
    }
  }

  // 3. Scan the first 600 chars of the JD only — company name almost always
  //    appears in the title/header and limiting scope prevents generic words
  //    like "scale" from outscoring the real target.
  const jdHeader = (input.jd || '').slice(0, 600);
  if (jdHeader.trim()) {
    for (const token of COMPANY_TOKENS) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'i');
      if (re.test(jdHeader)) return token;
    }
  }

  // 4. Fall back to the workspace label if it isn't generic.
  if (label && !generic.includes(label.toLowerCase())) {
    return label;
  }
  return undefined;
}

// Hard limits to stay comfortably under the 200k-token Anthropic API ceiling.
// Each token is ~4 chars; a 30k-token context budget for user content leaves
// ample room for the system prompt template, retrieval chunks, and history.
const MAX_RESUME_CHARS = 25_000;
const MAX_JD_CHARS = 20_000;
const MAX_PER_DOC_CHARS = 20_000;
const MAX_TOTAL_STUDY_CHARS = 60_000;

export function buildSystemContext(assistant: LumoraAssistant | null, opts?: { skipStudyDocs?: boolean }): string | undefined {
  if (!assistant) return undefined;
  const parts: string[] = [];
  if (assistant.company || assistant.role) {
    parts.push(`The candidate is interviewing for: ${assistant.role || 'a role'} at ${assistant.company || 'a company'}.`);
  }
  if (assistant.resume) parts.push(`CANDIDATE RESUME:\n${assistant.resume.slice(0, MAX_RESUME_CHARS)}`);
  if (assistant.jobDescription) parts.push(`JOB DESCRIPTION:\n${assistant.jobDescription.slice(0, MAX_JD_CHARS)}`);
  if (!opts?.skipStudyDocs && assistant.studyDocs && assistant.studyDocs.length > 0) {
    let totalChars = 0;
    const cappedDocs: string[] = [];
    for (const d of assistant.studyDocs) {
      if (totalChars >= MAX_TOTAL_STUDY_CHARS) break;
      const remaining = MAX_TOTAL_STUDY_CHARS - totalChars;
      const content = d.content.slice(0, Math.min(MAX_PER_DOC_CHARS, remaining));
      cappedDocs.push(`=== STUDY MATERIAL: ${d.name} ===\n${content}`);
      totalChars += content.length;
    }
    const studyBlock = cappedDocs.join('\n\n');
    parts.push(
      `STUDY MATERIALS UPLOADED BY THE CANDIDATE (${assistant.studyDocs.length} document${assistant.studyDocs.length === 1 ? '' : 's'}). Use these as authoritative reference material when relevant — quote, cite by filename, and prefer them over your priors when they overlap.\n\n${studyBlock}`
    );
  }
  if (assistant.stories && assistant.stories.length > 0) {
    const storyLines = assistant.stories.map(s => {
      const arch = s.archetypes?.length ? ` [${s.archetypes.join(', ')}]` : '';
      const impact = s.impact ? ` — ${s.impact}` : '';
      return `• ${s.title}${arch}: ${s.summary}${impact}`;
    }).join('\n');
    parts.push(`BEHAVIORAL STORY BANK (pre-parsed from resume):\n${storyLines}\n\nFor behavioral questions, pick the story whose archetype tag best matches the question type and reference it by title.`);
  }
  if (parts.length === 0) return undefined;
  return parts.join('\n\n') + '\n\nUse this context to personalize all answers. Reference the candidate\'s actual experience from their resume. Tailor technical depth to match the job requirements.';
}

function buildPlatformContext(): string | undefined {
  try {
    const meeting = localStorage.getItem('lumora_meeting_platform') || '';
    const coding = localStorage.getItem('lumora_coding_platform') || '';
    const parts: string[] = [];
    const meetingLabel: Record<string, string> = {
      teams: 'Microsoft Teams',
      zoom: 'Zoom',
      meet: 'Google Meet',
    };
    if (meeting && meeting !== 'other') {
      parts.push(`Interview is conducted via ${meetingLabel[meeting] || meeting}.`);
    }
    const codingHint: Record<string, string> = {
      hackerrank: 'HackerRank — code reads from stdin, writes to stdout; no extra debug prints. Use sys.stdin.read() to read all input at once and split into tokens, OR wrap the main I/O block in try/except EOFError so the code exits cleanly when no input is provided during local testing.',
      leetcode: 'LeetCode — implement the specified function/class signature; no main() or raw I/O',
      coderpad: 'CoderPad — collaborative live editor; write complete, runnable code with clear comments',
      codesignal: 'CodeSignal — automated test runner with strict input/output format; match expected types exactly',
      glider: 'Glider.ai — timed assessment platform; prioritize correctness first, then optimize',
    };
    if (coding && coding !== 'auto' && coding !== 'none' && codingHint[coding]) {
      parts.push(`Coding platform: ${codingHint[coding]}.`);
    }
    if (parts.length === 0) return undefined;
    return `INTERVIEW PLATFORM CONTEXT:\n${parts.join('\n')}`;
  } catch {
    return undefined;
  }
}

export function getSystemContext(): string | undefined {
  const assistantCtx = buildSystemContext(getActiveAssistant());
  const platformCtx = buildPlatformContext();
  if (!assistantCtx && !platformCtx) return undefined;
  return [assistantCtx, platformCtx].filter(Boolean).join('\n\n');
}


/** The pinned intro for the active assistant, if the candidate set one.
 *  Sent alongside system_context; the backend returns it verbatim for
 *  "tell me about yourself" instead of calling a model. */
export function getPinnedIntro(): string | undefined {
  try {
    const a = getActiveAssistant();
    const t = a?.pinnedIntro?.trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}
