export default function CamoraLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="camora-lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" /><stop offset="50%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="url(#camora-lg)" opacity={0.15} />
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" stroke="url(#camora-lg)" strokeWidth={1.5} fill="none" />
      <circle cx="12" cy="14" r="2.5" fill="#34d399" /><circle cx="18" cy="10" r="2.5" fill="#818cf8" />
      <circle cx="24" cy="14" r="2.5" fill="#38bdf8" /><circle cx="20" cy="22" r="2.5" fill="#fbbf24" />
      <path d="M12 14 Q15 8 18 10 Q21 12 24 14 Q26 18 20 22" stroke="url(#camora-lg)" strokeWidth={1.2} fill="none" opacity={0.6} />
    </svg>
  );
}
