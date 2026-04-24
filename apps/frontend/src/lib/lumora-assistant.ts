/**
 * Shared helper for building Lumora system context (resume + JD) from the
 * active assistant in localStorage. Used by CodingLayout, DesignLayout, and
 * AICompanionPanel so all three Lumora windows pass identical personalization
 * to the backend.
 */

export interface LumoraAssistant {
  id?: string;
  name?: string;
  company?: string;
  role?: string;
  resume?: string;
  jobDescription?: string;
  createdAt?: string;
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
  if (parts.length === 0) return undefined;
  return parts.join('\n\n') + '\n\nUse this context to personalize all answers. Reference the candidate\'s actual experience from their resume. Tailor technical depth to match the job requirements.';
}

export function getSystemContext(): string | undefined {
  return buildSystemContext(getActiveAssistant());
}
