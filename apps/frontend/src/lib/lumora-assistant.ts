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
    return list[0] || null;
  } catch {
    return null;
  }
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
