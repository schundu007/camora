export default function CamoraLogo({ size = 32, showText = false }: { size?: number; showText?: boolean }) {
  const id = `cl-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={showText ? size * 2.8 : size} height={showText ? size * 1.6 : size} viewBox={showText ? '0 0 112 64' : '0 0 40 40'} fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {showText ? (
        /* ── Full logo with icon + text ── */
        <g>
          {/* Background circle */}
          <circle cx="56" cy="16" r="14" fill={`url(#${id}-g)`} opacity={0.2} />

          {/* Magnifying glass */}
          <circle cx="52" cy="14" r="10" stroke={`url(#${id}-g)`} strokeWidth="2.5" fill="white" />
          <line x1="59" y1="21" x2="66" y2="28" stroke={`url(#${id}-g)`} strokeWidth="2.5" strokeLinecap="round" />

          {/* Person inside magnifier */}
          <circle cx="52" cy="11" r="3" fill={`url(#${id}-g)`} />
          <path d="M46 19.5c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke={`url(#${id}-g)`} strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* Eye shape below */}
          <path d="M38 32 Q56 42 74 32 Q56 38 38 32 Z" fill={`url(#${id}-g)`} opacity={0.7} />

          {/* CAMORA text */}
          <text x="56" y="56" textAnchor="middle" fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" fontSize="14" fontWeight="800" letterSpacing="2" fill={`url(#${id}-g)`}>
            CAMORA
          </text>
        </g>
      ) : (
        /* ── Icon only (navbar size) ── */
        <g>
          {/* Background circle */}
          <circle cx="22" cy="16" r="12" fill={`url(#${id}-g)`} opacity={0.15} />

          {/* Magnifying glass */}
          <circle cx="19" cy="15" r="8.5" stroke={`url(#${id}-g)`} strokeWidth="2" fill="white" />
          <line x1="25" y1="21" x2="31" y2="27" stroke={`url(#${id}-g)`} strokeWidth="2.2" strokeLinecap="round" />

          {/* Person inside magnifier */}
          <circle cx="19" cy="12.5" r="2.5" fill={`url(#${id}-g)`} />
          <path d="M14 19.5c0-2.8 2.2-4.2 5-4.2s5 1.4 5 4.2" stroke={`url(#${id}-g)`} strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Eye shape */}
          <path d="M8 30 Q20 37 32 30 Q20 34.5 8 30 Z" fill={`url(#${id}-g)`} opacity={0.6} />
        </g>
      )}
    </svg>
  );
}
