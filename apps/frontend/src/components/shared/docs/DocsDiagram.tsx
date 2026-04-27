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
}

/**
 * Standardized figure block for the docs site. Renders a Graphviz-rendered PNG
 * inside a bordered frame with a caption. Wide images scroll horizontally
 * inside the frame rather than overflowing the column.
 */
export default function DocsDiagram({
  src,
  alt,
  caption,
  label,
  maxWidth = '100%',
}: DocsDiagramProps) {
  return (
    <figure className="my-6">
      {label && (
        <p
          className="text-[11px] font-bold uppercase tracking-[0.16em] mb-1.5"
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
            height: 'auto',
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
