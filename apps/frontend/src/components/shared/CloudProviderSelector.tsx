import { useCloudProvider, type CloudProvider } from '@/hooks/useCloudProvider';
import { cloudProviderLabel } from '@/lib/cloud/formatContent';

interface CloudProviderSelectorProps {
  /**
   * 'header' = prominent labeled selector for top-of-page placement.
   * 'compact' = small inline selector for tight headers (matches diagram
   *   controls).
   */
  variant?: 'header' | 'compact';
  className?: string;
}

const OPTIONS: CloudProvider[] = ['aws', 'azure', 'gcp', 'auto'];

/**
 * One source of truth for the user's cloud-platform choice. Visible on
 * every system-design surface — the same selector instance everywhere
 * because state is centralized in useCloudProvider.
 *
 * Default state lives in the hook (currently 'aws'). Picking 'auto' lets
 * the diagram engine decide; for prose, 'auto' renders as AWS so the
 * authored content is never half-translated.
 */
export default function CloudProviderSelector({ variant = 'header', className = '' }: CloudProviderSelectorProps) {
  const [provider, setProvider] = useCloudProvider();

  if (variant === 'compact') {
    return (
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as CloudProvider)}
        className={`text-xs font-mono bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--text-secondary)] cursor-pointer ${className}`}
        aria-label="Cloud provider"
      >
        {OPTIONS.map((p) => (
          <option key={p} value={p}>{cloudProviderLabel(p)}</option>
        ))}
      </select>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        Cloud
      </span>
      <div
        className="inline-flex rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
        role="radiogroup"
        aria-label="Cloud provider"
      >
        {OPTIONS.map((p, i) => {
          const active = provider === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setProvider(p)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--text-secondary)',
                borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              {cloudProviderLabel(p)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
