import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Celebration — enterprise-grade success moment.
 * - Centered badge with a checkmark that scales-in + glows
 * - Bottom-of-screen toast slides up with the message
 * - Auto-dismisses after `duration` ms
 * - No confetti — this matches the Databricks/Linear/Stripe restraint
 *   while still giving the user a visible "well done"
 *
 * Usage:
 *   const { celebrate } = useCelebration();
 *   await api.completeOnboarding();
 *   celebrate({ title: 'Profile complete', subtitle: 'Welcome to Camora.' });
 *
 * Honors prefers-reduced-motion (drops to a plain toast, no scale/glow).
 */

type CelebrationOpts = {
  title: string;
  subtitle?: string;
  duration?: number;
};

type CelebrationCtx = {
  celebrate: (opts: CelebrationOpts) => void;
};

const Ctx = createContext<CelebrationCtx>({ celebrate: () => {} });

export function useCelebration() {
  return useContext(Ctx);
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<CelebrationOpts | null>(null);
  const [visible, setVisible] = useState(false);

  const celebrate = useCallback((opts: CelebrationOpts) => {
    setActive(opts);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || !active) return;
    const timer = setTimeout(() => setVisible(false), active.duration ?? 2400);
    return () => clearTimeout(timer);
  }, [visible, active]);

  // Clear the unmounted celebration after the exit transition finishes
  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setActive(null), 400);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Ctx.Provider value={{ celebrate }}>
      {children}
      {active && (
        <div
          aria-live="polite"
          role="status"
          className="celebration-overlay"
          style={{
            opacity: visible ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          {/* Centered badge */}
          <div className="celebration-badge" data-state={visible ? 'in' : 'out'}>
            <svg viewBox="0 0 32 32" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="16" cy="16" r="13" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" />
              <path d="M9 16.5l4.5 4.5L23 11" />
            </svg>
          </div>

          {/* Bottom toast */}
          <div className="celebration-toast" data-state={visible ? 'in' : 'out'} role="alert">
            <div>
              <p className="celebration-title">{active.title}</p>
              {active.subtitle && <p className="celebration-subtitle">{active.subtitle}</p>}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export default CelebrationProvider;
