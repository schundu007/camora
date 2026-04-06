export default function CamoraLogo({ size = 36 }: { size?: number }) {
  const id = `cl-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${id}-a)`} />

      {/* Inner white rounded square */}
      <rect x="6" y="6" width="36" height="36" rx="9" fill="white" opacity="0.95" />

      {/* C letterform — bold, modern, open */}
      <path
        d="M30 15.5 C27.5 13 23.5 12 20 13.5 C15.5 15.5 13.5 20 14 25 C14.5 30 18 33.5 23 34 C26 34.2 28.5 33 30 31"
        stroke={`url(#${id}-b)`}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Four APPA dots */}
      <circle cx="34" cy="14" r="2.5" fill="#34d399" />
      <circle cx="37" cy="21" r="2" fill="#818cf8" />
      <circle cx="37" cy="28" r="2" fill="#38bdf8" />
      <circle cx="34" cy="34" r="2.5" fill="#fbbf24" />
    </svg>
  );
}
