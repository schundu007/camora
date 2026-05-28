import { useEffect, useState, useCallback } from 'react';
import { getActiveAssistant, type LumoraAssistant } from '@/lib/lumora-assistant';
import Chip from '@/components/shared/ui/Chip';

/**
 * Topbar pill that shows the user, at a glance, what context Sona has
 * loaded for the live interview. Reactive to:
 *   • cross-tab `storage` events (uploading materials in another tab)
 *   • the in-tab `lumora:context-updated` custom event that the Prep Kit
 *     panel dispatches after every save (storage event doesn't fire in
 *     the same tab that wrote the value)
 *
 * Intentionally minimal — green when context is loaded, amber when not,
 * with a tooltip listing what's actually present. */

const CTX_EVENT = 'lumora:context-updated';

const useActiveAssistant = (): LumoraAssistant | null  => {
  const read = useCallback(() => getActiveAssistant(), []);
  const [assistant, setAssistant] = useState<LumoraAssistant | null>(read);

  useEffect(() => {
    const refresh = () => setAssistant(read());
    window.addEventListener('storage', refresh);
    window.addEventListener(CTX_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(CTX_EVENT, refresh as EventListener);
    };
  }, [read]);

  return assistant;
}

export const dispatchContextUpdated = () => {
  try {
    window.dispatchEvent(new CustomEvent(CTX_EVENT));
  } catch {}
}

interface ContextBadgeProps {
  variant?: 'dark' | 'light';
}

export const ContextBadge = (_props: ContextBadgeProps) => {
  const assistant = useActiveAssistant();

  const hasResume = !!assistant?.resume?.trim();
  const hasJD = !!assistant?.jobDescription?.trim();
  const hasContext = hasResume || hasJD;

  const company = assistant?.company || (hasContext ? 'context' : null);
  const items = [hasJD && 'JD', hasResume && 'Resume'].filter(Boolean) as string[];
  const tooltip = hasContext
    ? `Sona is reading: ${items.join(' + ')}${assistant?.company ? ` for ${assistant.company}` : ''}`
    : 'No JD or resume connected — upload to Prep Kit so Sona knows your background';

  const dotColor = hasContext ? '#22c55e' : '#f59e0b';

  return (
    <Chip
      variant={hasContext ? 'success' : 'warning'}
      className="hidden md:flex gap-1.5 items-center shrink-0"
      title={tooltip}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: dotColor, boxShadow: hasContext ? `0 0 6px ${dotColor}` : 'none' }}
      />
      {hasContext ? (
        <>
          <span className="truncate max-w-[140px]">{company}</span>
          <span className="opacity-70">·</span>
          <span className="opacity-90">{items.join(' + ')}</span>
        </>
      ) : (
        <span>No JD/Resume</span>
      )}
    </Chip>
  );
}
