/* ── ContentDiagram ────────────────────────────────────────────────────
   Single wrapper for any in-topic content diagram (basic / advanced
   implementation, createFlow, redirectFlow, item.diagramSrc, etc.).
   Replaces ad-hoc <img> + <DiagramSVG> rendering in TopicDetail.jsx so
   both PNG and SVG sources land on the same theme-aware "embossed paper"
   surface as the rest of the diagram system.

   Sizing model (the "tiny diagram" fix):
     - Default: image fills the column width (width: 100%, height: auto).
     - Caller can pin a maxHeight for unusually tall diagrams.
     - We DON'T cap height to 400px globally any more — most of the
       /public/diagrams/*.png renders are wide architecture flows that
       were getting shrunk to a fraction of their natural size by the
       old objectFit:contain + maxHeight:400 combination, leaving big
       empty whitespace on either side of the column.

   Theme model:
     - PNG sits inside a var(--bg-elevated) framed card so it reads as
       part of the diagram language alongside <DiagramSVG>'s rough
       templates.
     - In dark mode the .topic-content-diagram-img class applies a
       small brightness pull + contrast bump (rule lives in globals.css)
       so the white-authored PNG doesn't outshine the dark page.
   ────────────────────────────────────────────────────────────────────── */
import React from 'react';
import DiagramSVG from '../features/DiagramSVG';

interface ContentDiagramProps {
  /** PNG path under /public/diagrams/... */
  src?: string;
  /** Named template registered in DiagramSVG.jsx */
  template?: string;
  /** Accessibility text for PNG */
  alt?: string;
  /** Tailwind utility classes to add to the outer wrapper */
  className?: string;
  /** Optional cap on visual height — only set when the source PNG is
   *  unusually tall. Default lets the image render at natural ratio. */
  maxHeight?: number | string;
}

export function ContentDiagram({
  src,
  template,
  alt = 'Architecture diagram',
  className = '',
  maxHeight,
}: ContentDiagramProps) {
  // SVG template path — DiagramSVG already wraps itself in the
  // bg-elevated backdrop with a border, so we don't double-frame.
  if (template) {
    return <DiagramSVG template={template} className={className} />;
  }

  if (!src) return null;

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        padding: '12px',
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="topic-content-diagram-img block"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: maxHeight !== undefined
            ? (typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight)
            : undefined,
          objectFit: 'contain',
          margin: '0 auto',
          background: 'var(--bg-surface)',
          borderRadius: '6px',
          // Treat the PNG like authored vector art — most are crisp at
          // 2x and benefit from smoothing when upscaled to fit the
          // wide column. Without this they get pixel-fuzzy on retina.
          imageRendering: 'auto',
        }}
      />
    </div>
  );
}

export default ContentDiagram;
