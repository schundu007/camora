export default function CamoraLogo({ size = 36 }: { size?: number }) {
  const id = `cl-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="20%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* ── Large background circle (top-right) ── */}
      <circle cx="62" cy="28" r="24" fill={`url(#${id}-g)`} />

      {/* ── Magnifying glass ── */}
      {/* Glass ring — thick, white fill */}
      <circle cx="45" cy="32" r="20" fill="white" stroke={`url(#${id}-g)`} strokeWidth="5" />

      {/* ── Person inside glass ── */}
      {/* Head */}
      <circle cx="45" cy="25" r="6.5" fill={`url(#${id}-g)`} />
      {/* Body — wide shoulders */}
      <path d="M33 42 Q36 32 45 32 Q54 32 57 42" fill={`url(#${id}-g)`} />

      {/* ── Handle — thick diagonal ── */}
      <line x1="30" y1="47" x2="16" y2="63" stroke={`url(#${id}-g)`} strokeWidth="7" strokeLinecap="round" />

      {/* ── Eye / leaf shape — centered below ── */}
      <path d="M22 74 Q50 90 78 74 Q50 84 22 74 Z" fill={`url(#${id}-g)`} />
    </svg>
  );
}
