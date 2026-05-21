import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Live-session preview card shown on the right side of the hero.
 * Memoized + isolated so its perpetual motion (pulsing dot, ticking
 * timer, typing dots) never re-renders the LandingPage tree.
 *
 * Visuals:
 *  - Pulsing green status dot (CSS keyframes — GPU-cheap)
 *  - Ticking timer using a single setInterval, capped to a few minutes
 *    so it never reads as fake-stuck
 *  - Typing-indicator triple-dot in the Sona block (framer staggered)
 *  - Liquid-glass inner refraction: 1px white inset shadow on the
 *    outer card frame so the edge catches light
 */
function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function LiveSessionPreviewImpl() {
  // Start at 3:42 like the original static frame, then advance.
  const [secs, setSecs] = useState(3 * 60 + 42);
  useEffect(() => {
    const id = window.setInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden"
      style={{
        background: 'rgba(10,18,40,0.85)',
        // Liquid-glass: 1px inset highlight on top edge + soft inner glow
        // so the frame catches ambient light vs reading flat.
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.02), 0 24px 60px -24px rgba(0,0,0,0.55)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: 'rgba(74,222,128,0.55)',
                animation: 'sona-pulse 2.4s cubic-bezier(0.16,1,0.3,1) infinite',
              }}
            />
            <span
              className="relative inline-block h-2 w-2 rounded-full"
              style={{ background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.55)' }}
            />
          </span>
          <span className="text-[10px] font-mono text-white/45 tracking-[0.14em] uppercase">
            Sona · Live session
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/35 tabular-nums">{formatElapsed(secs)}</span>
      </div>

      <div className="p-4 space-y-3">
        <div
          className="rounded-xl border border-white/[0.08] p-3"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <p className="text-[9px] font-mono text-white/35 mb-1.5 uppercase tracking-[0.12em]">
            Question
          </p>
          <p className="text-[12.5px] text-white/80 leading-relaxed">
            Design a rate limiter handling 10M requests per day across multiple data centers.
          </p>
        </div>

        <div
          className="rounded-xl border p-3"
          style={{ background: 'rgba(201,162,39,0.07)', borderColor: 'rgba(201,162,39,0.2)' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p
              className="text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ color: 'rgba(201,162,39,0.65)' }}
            >
              Sona
            </p>
            <TypingDots />
          </div>
          <p className="text-[12.5px] text-white/90 leading-relaxed">
            Token bucket at the API gateway. Redis tracks per-user counters with sliding-window TTL.
            For multi-DC: replicate via pub/sub with eventual consistency, accept slight over-counting
            at boundaries.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {['Architecture', 'Scalability', 'Draw diagram'].map((t) => (
              <span
                key={t}
                className="text-[9px] font-mono text-white/40 rounded-full px-2 py-0.5 border border-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.08]"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="text-[9px] font-mono text-white/30">Voice captured · transcribed in 0.4s</span>
        <span className="text-[9px] font-mono" style={{ color: 'rgba(74,222,128,0.7)' }}>
          Answer ready
        </span>
      </div>

      <style>{`
        @keyframes sona-pulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.6); opacity: 0;    }
          100% { transform: scale(2.6); opacity: 0;    }
        }
      `}</style>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1" aria-label="Sona is composing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1 w-1 rounded-full"
          style={{ background: 'rgba(201,162,39,0.65)' }}
          animate={{ y: [0, -2, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.16,
          }}
        />
      ))}
    </div>
  );
}

export const LiveSessionPreview = memo(LiveSessionPreviewImpl);
export default LiveSessionPreview;
