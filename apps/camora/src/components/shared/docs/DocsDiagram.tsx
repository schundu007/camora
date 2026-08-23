import { ReactNode } from 'react';

export interface DocsDiagramProps {
  /** Public path to the rendered PNG, e.g. /diagrams/docs/lumora-live/system-context.png */
  src: string;
  /** Required accessible description — what the diagram conveys. */
  alt: string;
  /** Caption rendered under the figure. Markdown-light: pass a ReactNode. */
  caption?: ReactNode;
  /** Optional eyebrow label above the figure (e.g. "FIGURE 1 — System context"). */
  label?: string;
  /** Max image width inside the frame. Default: 100%. */
  maxWidth?: string | number;
  /** Max image height. Tall PNGs scale down to this; small images keep
   *  their natural size. Default 480px — uniform across docs pages. */
  maxHeight?: string | number;
}

/**
 * Standardized figure block for the docs site. Renders a Graphviz-rendered PNG
 * inside a bordered frame with a caption. Wide images scroll horizontally
 * inside the frame rather than overflowing the column. Tall images cap
 * at maxHeight so a single doc page doesn't show a 200px screenshot next
 * to a 1200px architecture diagram.
 */
export default function DocsDiagram({
  src,
  alt,
  caption,
  label,
  maxWidth = '100%',
  maxHeight = 480,
}: DocsDiagramProps) {
  return (
    <figure className="my-6">
      {label && (
        <p
          className="text-[12px] font-bold uppercase tracking-[0.16em] mb-1.5"
          style={{ color: 'var(--accent)' }}
        >
          {label}
        </p>
      )}
      <div
        className="rounded-md border overflow-x-auto"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
          padding: 12,
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{
            display: 'block',
            margin: '0 auto',
            maxWidth,
            maxHeight,
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
      {caption && (
        <figcaption
          className="mt-2 text-[12.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
