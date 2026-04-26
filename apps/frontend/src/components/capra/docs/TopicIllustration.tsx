/* ── TopicIllustration ─────────────────────────────────────────────────
   Per-topic-category hero strip. Renders an Unsplash photograph (cached
   to /public/topic-heroes/<id>.jpg by scripts/fetch-topic-heroes.mjs)
   with a navy-tinted gradient overlay so it reads on both light and
   dark themes. Falls back to a hand-crafted SVG line-art when no
   photograph is available for that name.

   The photograph manifest at /public/topic-heroes/manifest.json carries
   photographer attribution per Unsplash API license terms. Run the
   fetch script with VITE_UNSPLASH_KEY in env to refresh / add images.
   ────────────────────────────────────────────────────────────────────── */
import type { CSSProperties } from 'react';
import manifestJson from '../../../../public/topic-heroes/manifest.json';

type ManifestEntry = {
  file: string;
  photographer: string;
  photographerUrl: string | null;
  unsplashUrl: string | null;
};
const MANIFEST = manifestJson as Record<string, ManifestEntry>;

export type IllustrationName =
  | 'coding'
  | 'system-design'
  | 'microservices'
  | 'databases'
  | 'low-level'
  | 'projects'
  | 'roadmaps'
  | 'eng-blogs'
  | 'behavioral';

interface TopicIllustrationProps {
  name: IllustrationName;
  className?: string;
  style?: CSSProperties;
}

const COMMON_PROPS = {
  width: '100%',
  height: '100%',
  viewBox: '0 0 200 120',
  preserveAspectRatio: 'xMidYMid meet' as const,
};

/* Shared visual tokens — stay var-bound so the illustration tracks the
   page palette without per-component overrides. */
const ACCENT = 'var(--accent)';
const ACCENT_SOFT = 'var(--accent-subtle)';
const STROKE = 'var(--border)';
const FILL = 'var(--bg-surface)';

export default function TopicIllustration({ name, className = '', style }: TopicIllustrationProps) {
  const photo = MANIFEST[name];

  // Fixed 120px hero strip. Card width no longer drives image height.
  const wrapperStyle: CSSProperties = {
    background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--accent-subtle) 100%)',
    borderBottom: '1px solid var(--border)',
    height: 120,
    ...style,
  };

  // Photograph branch (preferred): Unsplash image with a navy-tinted
  // overlay so the photo blends with the brand palette on both themes.
  if (photo) {
    const credit = photo.photographer
      ? `Photo by ${photo.photographer} on Unsplash`
      : '';
    return (
      <div
        className={`relative w-full overflow-hidden ${className}`}
        style={wrapperStyle}
        title={credit}
      >
        <img
          src={photo.file}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Navy-tint overlay — keeps the photo on-brand without losing
            its content. Light theme gets a subtle wash, dark theme gets
            a stronger pull so the image doesn't outshine the page. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(38,97,156,0.08) 0%, rgba(38,97,156,0.20) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
      </div>
    );
  }

  // SVG fallback (used while a manifest entry is missing or in dev when
  // the fetch script hasn't been run). Same height contract as the photo
  // branch so the cards don't shift.
  return (
    <div
      className={`relative w-full overflow-hidden flex items-center justify-center ${className}`}
      style={wrapperStyle}
    >
      <svg {...COMMON_PROPS} fill="none" style={{ height: 96, width: 'auto', maxWidth: '100%' }}>
        {ART[name]}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
const ART: Record<IllustrationName, JSX.Element> = {
  /* DSA & Algorithms — binary tree spreading from a root node. */
  coding: (
    <g>
      <line x1="100" y1="30" x2="60" y2="60" stroke={STROKE} strokeWidth="1.5" />
      <line x1="100" y1="30" x2="140" y2="60" stroke={STROKE} strokeWidth="1.5" />
      <line x1="60" y1="60" x2="40" y2="90" stroke={STROKE} strokeWidth="1.5" />
      <line x1="60" y1="60" x2="80" y2="90" stroke={STROKE} strokeWidth="1.5" />
      <line x1="140" y1="60" x2="120" y2="90" stroke={STROKE} strokeWidth="1.5" />
      <line x1="140" y1="60" x2="160" y2="90" stroke={STROKE} strokeWidth="1.5" />
      {/* Root */}
      <circle cx="100" cy="30" r="8" fill={ACCENT} />
      {/* Mid */}
      <circle cx="60" cy="60" r="6" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="140" cy="60" r="6" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      {/* Leaves */}
      <circle cx="40" cy="90" r="5" fill={FILL} stroke={STROKE} strokeWidth="1.2" />
      <circle cx="80" cy="90" r="5" fill={FILL} stroke={STROKE} strokeWidth="1.2" />
      <circle cx="120" cy="90" r="5" fill={FILL} stroke={STROKE} strokeWidth="1.2" />
      <circle cx="160" cy="90" r="5" fill={ACCENT} />
    </g>
  ),

  /* System Design — three stacked tiers connected with downward arrows. */
  'system-design': (
    <g>
      <rect x="40" y="22" width="120" height="20" rx="3" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <rect x="60" y="52" width="80" height="20" rx="3" fill={FILL} stroke={STROKE} strokeWidth="1.2" />
      <rect x="40" y="82" width="120" height="20" rx="3" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
      <line x1="100" y1="42" x2="100" y2="52" stroke={STROKE} strokeWidth="1.2" />
      <line x1="100" y1="72" x2="100" y2="82" stroke={STROKE} strokeWidth="1.2" />
      <circle cx="100" cy="32" r="2.5" fill={ACCENT} />
      <circle cx="100" cy="62" r="2.5" fill={ACCENT} />
      <circle cx="100" cy="92" r="2.5" fill={ACCENT} />
    </g>
  ),

  /* Microservices — hexagon cluster (six small + one centre). */
  microservices: (
    <g>
      {/* Centre */}
      <polygon points="100,55 112,62 112,76 100,83 88,76 88,62" fill={ACCENT} />
      {/* Outer six */}
      {[
        [100, 25], [136, 47], [136, 91], [100, 113], [64, 91], [64, 47],
      ].map(([cx, cy], i) => (
        <polygon
          key={i}
          points={`${cx},${cy - 12} ${cx + 10},${cy - 6} ${cx + 10},${cy + 6} ${cx},${cy + 12} ${cx - 10},${cy + 6} ${cx - 10},${cy - 6}`}
          fill={FILL}
          stroke={STROKE}
          strokeWidth="1.2"
        />
      ))}
      {/* Connectors */}
      {[
        [100, 25], [136, 47], [136, 91], [100, 113], [64, 91], [64, 47],
      ].map(([cx, cy], i) => (
        <line
          key={`l-${i}`}
          x1="100"
          y1="69"
          x2={String(cx)}
          y2={String(cy)}
          stroke={STROKE}
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
      ))}
    </g>
  ),

  /* Databases & SQL — three stacked cylinders, classic disk icon. */
  databases: (
    <g>
      {[30, 55, 80].map((y, i) => (
        <g key={i} opacity={i === 0 ? 1 : 0.85}>
          <ellipse cx="100" cy={y} rx="36" ry="8" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
          <path d={`M 64 ${y} L 64 ${y + 14} A 36 8 0 0 0 136 ${y + 14} L 136 ${y}`} fill={i === 0 ? ACCENT_SOFT : FILL} stroke={ACCENT} strokeWidth="1.5" />
        </g>
      ))}
      <ellipse cx="100" cy="80" rx="36" ry="8" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
    </g>
  ),

  /* Low Level Design — nested boxes / class diagram. */
  'low-level': (
    <g>
      <rect x="30" y="20" width="140" height="80" rx="4" fill={FILL} stroke={STROKE} strokeWidth="1.2" />
      <line x1="30" y1="38" x2="170" y2="38" stroke={STROKE} strokeWidth="1" />
      <rect x="44" y="48" width="50" height="14" rx="2" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.2" />
      <rect x="44" y="68" width="50" height="14" rx="2" fill={FILL} stroke={STROKE} strokeWidth="1" />
      <rect x="106" y="48" width="50" height="14" rx="2" fill={FILL} stroke={STROKE} strokeWidth="1" />
      <rect x="106" y="68" width="50" height="14" rx="2" fill={ACCENT} />
      <line x1="94" y1="55" x2="106" y2="55" stroke={STROKE} strokeWidth="1" strokeDasharray="2 2" />
      <line x1="94" y1="75" x2="106" y2="75" stroke={STROKE} strokeWidth="1" strokeDasharray="2 2" />
    </g>
  ),

  /* Projects — concentric blueprint rings, project plan vibe. */
  projects: (
    <g>
      <circle cx="100" cy="60" r="42" fill="none" stroke={STROKE} strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="100" cy="60" r="28" fill="none" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="100" cy="60" r="14" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="100" cy="60" r="4" fill={ACCENT} />
      {/* Milestone dots */}
      <circle cx="142" cy="60" r="3" fill={ACCENT} />
      <circle cx="58" cy="60" r="3" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="100" cy="18" r="3" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="100" cy="102" r="3" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
    </g>
  ),

  /* Roadmaps — connected milestones along a path. */
  roadmaps: (
    <g>
      <path d="M 24 80 Q 60 30 100 60 T 176 40" stroke={STROKE} strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
      <circle cx="24" cy="80" r="6" fill={ACCENT} />
      <circle cx="72" cy="48" r="5" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="120" cy="60" r="5" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="176" cy="40" r="6" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
      <text x="24" y="100" fontSize="8" fill={ACCENT} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700">START</text>
      <text x="176" y="60" fontSize="8" fill={ACCENT} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700">GOAL</text>
    </g>
  ),

  /* Eng Blogs — open book / article pages. */
  'eng-blogs': (
    <g>
      <path d="M 100 32 L 100 100" stroke={ACCENT} strokeWidth="1.5" />
      <path d="M 100 32 Q 70 28 36 36 L 36 96 Q 70 92 100 100 Z" fill={FILL} stroke={ACCENT} strokeWidth="1.5" />
      <path d="M 100 32 Q 130 28 164 36 L 164 96 Q 130 92 100 100 Z" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
      {/* Lines on left page */}
      <line x1="46" y1="48" x2="90" y2="48" stroke={STROKE} strokeWidth="1" />
      <line x1="46" y1="58" x2="86" y2="58" stroke={STROKE} strokeWidth="1" />
      <line x1="46" y1="68" x2="92" y2="68" stroke={STROKE} strokeWidth="1" />
      <line x1="46" y1="78" x2="80" y2="78" stroke={STROKE} strokeWidth="1" />
      {/* Lines on right page */}
      <line x1="110" y1="48" x2="154" y2="48" stroke={STROKE} strokeWidth="1" />
      <line x1="110" y1="58" x2="150" y2="58" stroke={STROKE} strokeWidth="1" />
      <line x1="110" y1="68" x2="156" y2="68" stroke={STROKE} strokeWidth="1" />
      <line x1="110" y1="78" x2="144" y2="78" stroke={STROKE} strokeWidth="1" />
    </g>
  ),

  /* Behavioral — three abstract persons in conversation. */
  behavioral: (
    <g>
      {/* Speech bubble */}
      <rect x="60" y="20" width="80" height="32" rx="6" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
      <path d="M 90 52 L 96 60 L 100 52 Z" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="1.5" />
      <line x1="68" y1="30" x2="132" y2="30" stroke={ACCENT} strokeWidth="1" />
      <line x1="68" y1="38" x2="120" y2="38" stroke={ACCENT} strokeWidth="1" />
      {/* Three persons */}
      {[60, 100, 140].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy="78" r="7" fill={i === 1 ? ACCENT : FILL} stroke={ACCENT} strokeWidth="1.5" />
          <path d={`M ${cx - 12} 108 Q ${cx} 90 ${cx + 12} 108`} fill={i === 1 ? ACCENT : FILL} stroke={ACCENT} strokeWidth="1.5" />
        </g>
      ))}
    </g>
  ),
};
