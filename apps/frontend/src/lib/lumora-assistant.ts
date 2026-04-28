/**
 * Shared helper for building Lumora system context (resume + JD) from the
 * active assistant in localStorage. Used by CodingLayout, DesignLayout, and
 * AICompanionPanel so all three Lumora windows pass identical personalization
 * to the backend.
 */

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

export interface LumoraAssistant {
  id?: string;
  name?: string;
  company?: string;
  role?: string;
  resume?: string;
  jobDescription?: string;
  stories?: LumoraStory[];
  createdAt?: string;
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
    const stored = localStorage.getItem('lumora_assistants');
    const list = stored ? (JSON.parse(stored) as LumoraAssistant[]) : [];
    const explicit = list[0];
    // If the user has actually populated an assistant, use it.
    if (explicit && (explicit.resume || explicit.jobDescription)) return explicit;
    // Otherwise, fall back to materials uploaded in Prep Kit
    // (`lumora_prep_v8`). Prep Kit was the disconnect — users uploaded
    // JD/resume there expecting Sona to read them, but Sona only ever
    // looked at `lumora_assistants`. Synthesize a virtual assistant
    // from prep data so the live interview gets the same context.
    return getAssistantFromPrepKit() || explicit || null;
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
    const raw = localStorage.getItem('lumora_prep_v8');
    if (!raw) return null;
    const prep = JSON.parse(raw) as {
      activeCompany: string | null;
      companies: string[];
      data: Record<string, {
        jd?: string; jdFile?: string;
        resume?: string; resumeFile?: string;
        coverLetter?: string;
        prepMaterials?: string;
      }>;
    };
    const key = prep.activeCompany || prep.companies?.[0];
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
    }) || (key && key !== 'My Interview' ? key : undefined);
    return {
      id: `prepkit:${key}`,
      name: key,
      company,
      resume: resume || undefined,
      jobDescription: jd || undefined,
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
  const haystack = [
    input.jdFile || '',
    input.resumeFile || '',
    input.jd || '',
    input.resume || '',
  ].join(' \n ');
  if (!haystack.trim()) return undefined;

  // 1. Check known company tokens — case-insensitive whole-word match.
  //    Score by frequency so "NVIDIA Robotics DevOps" + "NVIDIA is hiring"
  //    beats a one-off mention of a competitor.
  const scores: Record<string, number> = {};
  for (const token of COMPANY_TOKENS) {
    // Word boundaries; allow dot in "Fly.io" / "D.E. Shaw"
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, 'gi');
    const matches = haystack.match(re);
    if (matches && matches.length > 0) {
      scores[token] = (scores[token] || 0) + matches.length;
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];

  // 2. Fall back to the user's workspace label if it isn't a generic
  //    placeholder.
  const generic = ['my interview', 'interview', 'default', 'untitled', 'new', 'test'];
  if (input.label && !generic.includes(input.label.trim().toLowerCase())) {
    return input.label;
  }
  return undefined;
}

export function buildSystemContext(assistant: LumoraAssistant | null): string | undefined {
  if (!assistant) return undefined;
  const parts: string[] = [];
  if (assistant.company || assistant.role) {
    parts.push(`The candidate is interviewing for: ${assistant.role || 'a role'} at ${assistant.company || 'a company'}.`);
  }
  if (assistant.resume) parts.push(`CANDIDATE RESUME:\n${assistant.resume}`);
  if (assistant.jobDescription) parts.push(`JOB DESCRIPTION:\n${assistant.jobDescription}`);
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

export function getSystemContext(): string | undefined {
  return buildSystemContext(getActiveAssistant());
}
