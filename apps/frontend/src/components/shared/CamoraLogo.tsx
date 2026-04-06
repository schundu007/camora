export default function CamoraLogo({ size = 32, showText = false }: { size?: number; showText?: boolean }) {
  const id = `cl-${Math.random().toString(36).slice(2, 6)}`;
  const w = showText ? size * 2.4 : size;
  const h = showText ? size * 2.6 : size;
  const vb = showText ? '0 0 96 104' : '0 0 40 40';

  return (
    <svg width={w} height={h} viewBox={vb} fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5ee8b5" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {showText ? (
        <g>
          {/* ── Large background circle (top right) ── */}
          <circle cx="58" cy="22" r="20" fill={`url(#${id}-g)`} />

          {/* ── Magnifying glass ring ── */}
          <circle cx="44" cy="26" r="16" fill="white" stroke={`url(#${id}-g)`} strokeWidth="4" />

          {/* ── Handle ── */}
          <line x1="32" y1="38" x2="20" y2="50" stroke={`url(#${id}-g)`} strokeWidth="5" strokeLinecap="round" />

          {/* ── Person head ── */}
          <circle cx="44" cy="21" r="5" fill={`url(#${id}-g)`} />
          {/* ── Person body ── */}
          <path d="M35 33 Q38 26 44 26 Q50 26 53 33" fill={`url(#${id}-g)`} />

          {/* ── Eye / leaf shape ── */}
          <path d="M26 58 Q48 72 70 58 Q48 66 26 58 Z" fill={`url(#${id}-g)`} />

          {/* ── CAMORA text ── */}
          <text
            x="48" y="92"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
            fontSize="18"
            fontWeight="800"
            letterSpacing="3"
            fill={`url(#${id}-g)`}
          >
            CAMORA
          </text>
        </g>
      ) : (
        <g>
          {/* ── Large background circle (top right) ── */}
          <circle cx="25" cy="12" r="10" fill={`url(#${id}-g)`} />

          {/* ── Magnifying glass ring ── */}
          <circle cx="18" cy="14" r="9" fill="white" stroke={`url(#${id}-g)`} strokeWidth="2.5" />

          {/* ── Handle ── */}
          <line x1="12" y1="21" x2="6" y2="27" stroke={`url(#${id}-g)`} strokeWidth="3" strokeLinecap="round" />

          {/* ── Person head ── */}
          <circle cx="18" cy="11.5" r="2.8" fill={`url(#${id}-g)`} />
          {/* ── Person body ── */}
          <path d="M13 18 Q15 14.5 18 14.5 Q21 14.5 23 18" fill={`url(#${id}-g)`} />

          {/* ── Eye / leaf shape ── */}
          <path d="M8 31 Q20 38 32 31 Q20 35.5 8 31 Z" fill={`url(#${id}-g)`} />
        </g>
      )}
    </svg>
  );
}
