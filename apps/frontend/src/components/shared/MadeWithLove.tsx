/* ── MadeWithLove ──────────────────────────────────────────────────────
   LeetCode footer signature — small red hex badge with a heart, then a
   single line "Made with ♥ in {city}". Sits above the legal/footer row.
   Defaults to San Jose; pass any city via prop. */
import { HexBadge } from './HexBadge';

interface MadeWithLoveProps {
  city?: string;
  className?: string;
}

export function MadeWithLove({ city = 'San Jose', className = '' }: MadeWithLoveProps) {
  return (
    <div className={`flex flex-col items-center gap-3 py-10 ${className}`}>
      <HexBadge
        color="red"
        size={48}
        icon={
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 21s-7-4.35-9.5-9C1 7.5 4.5 4 8 4c1.74 0 3.41.81 4 2 .59-1.19 2.26-2 4-2 3.5 0 7 3.5 5.5 8-2.5 4.65-9.5 9-9.5 9z" />
          </svg>
        }
        title="Made with love"
      />
      <p
        className="text-sm font-semibold tracking-wide"
        style={{
          color: 'var(--danger)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Made with{' '}
        <span aria-hidden="true" className="inline-block mx-0.5">
          ♥
        </span>
        <span className="sr-only">love</span> in {city}
      </p>
    </div>
  );
}
