import { memo, useEffect, useState } from 'react';

/**
 * Trusted-by line with a shimmer skeleton during fetch so the social-
 * proof line never pops in late. Skill mandate: never render naked
 * loading state on a marketing surface; always show a placeholder
 * matching the eventual layout.
 */
function VisitorCountLineImpl() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
    let cancelled = false;
    fetch(`${API}/api/visitors/unique-count`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (typeof d?.total === 'number' && d.total > 0) setCount(d.total);
      })
      .catch(() => {
        // swallow — keep skeleton visible rather than empty space
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className="mt-7 text-[13px] text-[var(--text-muted)]">
      Trusted by{' '}
      {count === null ? (
        <span
          className="inline-block align-middle h-3 w-12 rounded-sm"
          style={{
            // Token-based shimmer so the skeleton is visible in BOTH themes.
            // --text-muted is dark in light mode / light in dark mode, so the
            // color-mix tints resolve correctly against either hero surface.
            background:
              'linear-gradient(90deg, color-mix(in oklab, var(--text-muted) 8%, transparent) 0%, color-mix(in oklab, var(--text-muted) 22%, transparent) 50%, color-mix(in oklab, var(--text-muted) 8%, transparent) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-line 1.6s ease-in-out infinite',
          }}
          aria-label="Loading visitor count"
        />
      ) : (
        <strong className="text-[var(--text-primary)] font-semibold tabular-nums">{count.toLocaleString()}+</strong>
      )}{' '}
      engineers worldwide
      <style>{`
        @keyframes shimmer-line {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </p>
  );
}

export const VisitorCountLine = memo(VisitorCountLineImpl);
export default VisitorCountLine;
