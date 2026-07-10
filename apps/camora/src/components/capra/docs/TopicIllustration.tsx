/* ── TopicIllustration ─────────────────────────────────────────────────
   Per-category hero photograph with a brand-color duotone treatment.

   Photos are cached at /public/topic-heroes/<id>.jpg by
   scripts/fetch-topic-heroes.mjs (Unsplash search → curated tech-aesthetic
   imagery). Whatever content the photo carries, the rendering pipeline
   pushes it through:

     1. <img> with grayscale + contrast bump (kills color cast)
     2. multiply layer of var(--cam-primary)        (paints darks navy)
     3. screen layer of var(--cam-primary-lt)        (lifts highlights)

   …so all 9 photos read as ONE unified brand-mood look — the Linear /
   Stripe duotone pattern. No matter what the source image is, the
   rendered result is on-palette.

   Sized 16:9 (bigger than the previous 120px strip — ~225px tall on a
   400px-wide card) so the imagery has presence without dominating the
   card content below.
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
  | 'coding' | 'system-design' | 'microservices' | 'databases'
  | 'low-level' | 'projects' | 'roadmaps' | 'eng-blogs' | 'behavioral'
  | 'sre' | 'devops' | 'cloud' | 'linux' | 'networking'
  | 'troubleshooting' | 'war-stories' | 'comparisons'
  | 'mlops' | 'aiops' | 'observability' | 'platform' | 'challenges'
  | 'ddia' | 'ai-systems-perf' | 'agentic';

const FALLBACK_GRADIENTS: Partial<Record<IllustrationName, string>> = {};

interface TopicIllustrationProps {
  name: IllustrationName;
  className?: string;
  style?: CSSProperties;
}

export default function TopicIllustration({ name, className = '', style }: TopicIllustrationProps) {
  const photo = MANIFEST[name as keyof typeof MANIFEST];
  const credit = photo?.photographer ? `Photo: ${photo.photographer} on Unsplash` : '';
  const fallback = FALLBACK_GRADIENTS[name];

  const wrapperStyle: CSSProperties = {
    aspectRatio: '3 / 1',
    background: photo ? 'var(--cam-primary-dk)' : (fallback ?? 'var(--cam-primary-dk)'),
    ...style,
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={wrapperStyle}
      data-tip={credit}
    >
      {photo && (
        <img
          src={photo.file}
          alt=""
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'contrast(1.05) brightness(0.9)' }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent 0%, var(--bg-surface) 100%)' }}
      />
    </div>
  );
}
