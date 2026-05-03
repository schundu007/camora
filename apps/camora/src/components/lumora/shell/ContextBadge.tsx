import { useEffect, useState, useCallback } from 'react';
import { getActiveAssistant, type LumoraAssistant } from '@/lib/lumora-assistant';

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

function useActiveAssistant(): LumoraAssistant | null {
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

export function dispatchContextUpdated() {
  try {
    window.dispatchEvent(new CustomEvent(CTX_EVENT));
  } catch {}
}

interface ContextBadgeProps {
  variant?: 'dark' | 'light';
}

export function ContextBadge({ variant = 'dark' }: ContextBadgeProps) {
  const assistant = useActiveAssistant();

  const hasResume = !!assistant?.resume?.trim();
  const hasJD = !!assistant?.jobDescription?.trim();
  const hasContext = hasResume || hasJD;

  const company = assistant?.company || (hasContext ? 'context' : null);
  const items = [hasJD && 'JD', hasResume && 'Resume'].filter(Boolean) as string[];
  const tooltip = hasContext
    ? `Sona is reading: ${items.join(' + ')}${assistant?.company ? ` for ${assistant.company}` : ''}`
    : 'No JD or resume connected — upload to Prep Kit so Sona knows your background';

  const isDark = variant === 'dark';
  const palette = hasContext
    ? isDark
      ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.45)', text: '#86efac', dot: '#22c55e' }
      : { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.35)', text: '#15803d', dot: '#22c55e' }
    : isDark
      ? { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.45)', text: '#fbbf24', dot: '#f59e0b' }
      : { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.40)', text: '#b45309', dot: '#f59e0b' };

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.text,
        fontFamily: "'Inter', sans-serif",
      }}
      title={tooltip}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: palette.dot, boxShadow: hasContext ? `0 0 6px ${palette.dot}` : 'none' }}
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
    </div>
  );
}
