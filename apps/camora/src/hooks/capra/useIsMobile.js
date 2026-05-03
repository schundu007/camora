import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1024px)',
  desktop: '(min-width: 768px)',
};

/**
 * Hook for responsive breakpoint detection via matchMedia.
 * Returns { isMobile, isTablet, isDesktop }.
 */
export function useIsMobile() {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true };
    }
    return {
      isMobile: window.matchMedia(BREAKPOINTS.mobile).matches,
      isTablet: window.matchMedia(BREAKPOINTS.tablet).matches,
      isDesktop: window.matchMedia(BREAKPOINTS.desktop).matches,
    };
  });

  useEffect(() => {
    const queries = {
      mobile: window.matchMedia(BREAKPOINTS.mobile),
      tablet: window.matchMedia(BREAKPOINTS.tablet),
      desktop: window.matchMedia(BREAKPOINTS.desktop),
    };

    const update = () => {
      setState({
        isMobile: queries.mobile.matches,
        isTablet: queries.tablet.matches,
        isDesktop: queries.desktop.matches,
      });
    };

    Object.values(queries).forEach((mq) => mq.addEventListener('change', update));
    return () => {
      Object.values(queries).forEach((mq) => mq.removeEventListener('change', update));
    };
  }, []);

  return state;
}

export default useIsMobile;
