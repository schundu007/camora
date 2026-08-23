import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
  const [secs, setSecs] = useState(3 * 60 + 42);
  useEffect(() => {
    const id = window.setInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
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
          <span
            className="text-[12px] font-mono tracking-[0.14em] uppercase font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            Sona · Live session
          </span>
        </div>
        <span
          className="text-[12px] font-mono tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {formatElapsed(secs)}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Question block */}
        <div
          className="rounded-xl p-3.5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-[12px] font-mono uppercase tracking-[0.14em] mb-2 font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            Question
          </p>
          <p className="text-[14px] leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>
            Design a rate limiter handling 10M requests per day across multiple data centers.
          </p>
        </div>

        {/* Sona answer block */}
        <div
          className="rounded-xl p-3.5"
          style={{
            background: 'var(--accent-subtle)',
            border: '1px solid var(--border-focus)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[12px] font-mono uppercase tracking-[0.14em] font-bold"
              style={{ color: 'var(--accent)' }}
            >
              Sona
            </p>
            <TypingDots />
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            Token bucket at the API gateway. Redis tracks per-user counters with sliding-window TTL.
            For multi-DC: replicate via pub/sub with eventual consistency, accept slight over-counting
            at boundaries.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['Architecture', 'Scalability', 'Draw diagram'].map((t) => (
              <span
                key={t}
                className="text-[12px] font-mono rounded-full px-2.5 py-0.5"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      >
        <span className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
          Voice captured · transcribed in 0.4s
        </span>
        <span className="text-[12px] font-mono font-semibold" style={{ color: '#4ade80' }}>
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
          className="block h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--accent)' }}
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
