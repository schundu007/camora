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
  | 'low-level' | 'projects' | 'roadmaps' | 'eng-blogs' | 'behavioral';

interface TopicIllustrationProps {
  name: IllustrationName;
  className?: string;
  style?: CSSProperties;
}

export default function TopicIllustration({ name, className = '', style }: TopicIllustrationProps) {
  const photo = MANIFEST[name];
  if (!photo) return null;
  const credit = photo.photographer ? `Photo: ${photo.photographer} on Unsplash` : '';

  const wrapperStyle: CSSProperties = {
    // 3:1 cinematic strip — about 130px tall on a 400px card. Tall
    // enough to read as a hero accent, short enough that the title /
    // bullets / progress bar below stay the visual focus of the card.
    aspectRatio: '3 / 1',
    background: 'var(--cam-primary-dk)',
    ...style,
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={wrapperStyle}
      title={credit}
    >
      {/* 1. Grayscale, slightly darkened source. */}
      <img
        src={photo.file}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'grayscale(100%) contrast(1.05) brightness(0.85)' }}
      />
      {/* 2. Multiply navy — paints the darks brand-navy. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'var(--cam-primary)', mixBlendMode: 'multiply' }}
      />
      {/* 3. Screen lighter navy — lifts the highlights to a soft cream-navy
              instead of leaving them muddy gray. The result reads as a
              single-tone brand mood image rather than a neutralized photo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'var(--cam-primary-lt)', mixBlendMode: 'screen', opacity: 0.35 }}
      />
      {/* 4. Subtle bottom gradient so the card title below has a soft
              transition rather than a hard horizontal line. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent 0%, var(--bg-surface) 100%)' }}
      />
    </div>
  );
}
