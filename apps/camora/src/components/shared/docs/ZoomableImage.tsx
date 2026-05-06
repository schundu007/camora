import { CSSProperties, useEffect, useState } from 'react';

export interface ZoomableImageProps {
  /** Image src — typically a Graphviz-rendered PNG path. */
  src: string;
  /** Required accessible description. */
  alt: string;
  /**
   * Inline-frame max-height. Diagrams taller than this scroll inside the
   * frame instead of pushing the page. Click-to-zoom opens the full image
   * in a modal regardless. Default 600px.
   */
  maxHeight?: number;
  /** Tailwind classes on the wrapper. */
  className?: string;
  /** Inline style overrides on the wrapper frame. */
  frameStyle?: CSSProperties;
  /** Inline style overrides on the rendered <img>. */
  imgStyle?: CSSProperties;
  /** When true, suppresses the "Click to expand" hint chip (e.g. when the
   *  parent already has its own affordance). */
  hideExpandHint?: boolean;
}

/**
 * Drop-in replacement for an inline diagram <img>. Solves the "tall
 * portrait PNG dominates the page" problem two ways:
 *
 *   1. The frame is height-capped (default 600 px) with internal
 *      scrolling, so a 2000-px-tall diagram scrolls inside its own card
 *      instead of forcing the whole page to scroll past it.
 *   2. Clicking anywhere on the image opens a full-screen lightbox with
 *      the original PNG at native size, max-fit to the viewport. Esc,
 *      backdrop click, or the close button dismisses.
 *
 * Wears the docs design system chrome — navy left strip, gold-leaf
 * border, gold-leaf "Click to expand" pill capsule.
 */
export default function ZoomableImage({
  src,
  alt,
  maxHeight = 600,
  className = '',
  frameStyle,
  imgStyle,
  hideExpandHint = false,
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl ${className}`}
        style={{
          minHeight: 64,
          background: 'var(--bg-elevated)',
          border: '1px dashed var(--border)',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          ...frameStyle,
        }}
      >
        diagram not generated yet
      </div>
    );
  }

  // Esc to close + body scroll lock while modal open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div
        className={`relative group cursor-zoom-in rounded-xl overflow-auto ${className}`}
        role="button"
        tabIndex={0}
        aria-label={`${alt} — click to view full size`}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{
          maxHeight,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--cam-gold-leaf)',
          boxShadow:
            '0 1px 0 color-mix(in srgb, var(--cam-gold-leaf) 18%, transparent),' +
            ' inset 0 1px 0 rgba(255,255,255,0.3)',
          ...frameStyle,
        }}
      >
        {/* Navy left strip — same chrome as DocsCallout / hero */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full pointer-events-none z-[1]"
          style={{
            background:
              'linear-gradient(180deg, var(--cam-primary) 0%, var(--cam-primary-dk) 100%)',
          }}
        />

        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="img-bespoke"
          onError={() => setBroken(true)}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            margin: '0 auto',
            ...imgStyle,
          }}
        />

        {/* Click-to-expand chip — bottom-right, glassy pill capsule */}
        {!hideExpandHint && (
          <span
            aria-hidden="true"
            className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-[0.14em] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--cam-gold-leaf)',
              color: 'var(--cam-gold-leaf-text)',
              boxShadow:
                '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.45)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Expand
          </span>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full inline-flex items-center justify-center text-white text-xl font-bold transition-colors"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            ×
          </button>

          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="img-bespoke cursor-default"
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}
    </>
  );
}
