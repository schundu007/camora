import { useEffect, useState } from 'react';

export interface BackToTopProps {
  /** Pixel scroll threshold before the button appears. Default 400. */
  threshold?: number;
  /** Optional scroll container ref. Defaults to window. */
  scrollContainer?: HTMLElement | null;
}

/**
 * NVIDIA-style "↑ Back to top" pill that appears mid-scroll, fixed
 * center-bottom. Accent navy fill, white text.
 */
export default function BackToTop({
  threshold = 400,
  scrollContainer,
}: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target: HTMLElement | Window = scrollContainer ?? window;
    const getY = () =>
      scrollContainer ? scrollContainer.scrollTop : window.scrollY;

    const handler = () => setVisible(getY() > threshold);
    handler();
    target.addEventListener('scroll', handler, { passive: true } as AddEventListenerOptions);
    return () =>
      target.removeEventListener('scroll', handler as EventListener);
  }, [threshold, scrollContainer]);

  if (!visible) return null;

  const onClick = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[12.5px] font-semibold shadow-lg transition-colors"
      aria-label="Back to top"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
      <span>Back to top</span>
    </button>
  );
}
