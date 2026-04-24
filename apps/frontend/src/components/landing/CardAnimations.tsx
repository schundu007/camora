import React from 'react';

const ACCENT = '#29B5E8';
const MONO = "'JetBrains Mono', monospace";

export function CardAnimationStyles() {
  return (
    <style>{`
      @keyframes card-scan {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(260%); }
      }
      @keyframes card-active-apply {
        0%, 28% { opacity: 0.45; border-color: #E2E8F0; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
        33%, 61% { opacity: 1; border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}22; }
        66%, 100% { opacity: 0.45; border-color: #E2E8F0; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      }
      @keyframes card-chip-pulse {
        0%, 100% { opacity: 0.35; transform: scale(0.96); }
        50% { opacity: 1; transform: scale(1); }
      }
      @keyframes card-blink { 50% { opacity: 0; } }
      @keyframes card-type {
        from { width: 0; }
        to { width: 100%; }
      }
      @keyframes card-wave {
        0%, 100% { transform: scaleY(0.25); }
        50% { transform: scaleY(1); }
      }
      @keyframes card-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
      }
      @keyframes card-cursor-blink { 50% { background: transparent; } }
      @keyframes card-fade-up {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes card-transcript-cycle {
        0%, 35% { opacity: 1; }
        40%, 55% { opacity: 0; }
        60%, 100% { opacity: 1; }
      }
    `}</style>
  );
}

const base: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
};

/* ─────────────────────────────────────────────────────────────────
   APPLY — Role-matching carousel: scan line + cycling highlight
   ───────────────────────────────────────────────────────────────── */
export function ApplyAnim() {
  const jobs = [
    { co: 'GOOGLE', role: 'Sr. Engineer', match: 98 },
    { co: 'META', role: 'Staff SWE', match: 94 },
    { co: 'STRIPE', role: 'Tech Lead', match: 91 },
  ];
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '48px',
          background: `linear-gradient(180deg, transparent, ${ACCENT}26, transparent)`,
          animation: 'card-scan 3.2s linear infinite',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 18px' }}>
        {jobs.map((j, i) => (
          <div
            key={j.co}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              padding: '7px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: `card-active-apply 3.6s ease-in-out ${i * 1.2}s infinite`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: MONO, color: '#0F172A', letterSpacing: '0.06em' }}>{j.co}</span>
              <span style={{ fontSize: 9, color: '#64748B' }}>{j.role}</span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 3,
                background: '#DCFCE7',
                color: '#16A34A',
                fontFamily: MONO,
              }}
            >
              {j.match}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREPARE — 3×3 interview topic grid with staggered pulse
   ───────────────────────────────────────────────────────────────── */
export function PrepareAnim() {
  const topics = ['DSA', 'SYS DESIGN', 'SQL', 'BEHAVIORAL', 'OS', 'NETWORKS', 'LLD', 'GRAPHS', 'OOD'];
  return (
    <div style={{ ...base, background: 'linear-gradient(135deg, #FAFAF9 0%, #F5F5F4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%', maxWidth: 240 }}>
        {topics.map((t, i) => (
          <div
            key={t}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${ACCENT}33`,
              borderRadius: 4,
              padding: '7px 4px',
              textAlign: 'center',
              fontSize: 9,
              fontWeight: 800,
              fontFamily: MONO,
              color: ACCENT,
              letterSpacing: '0.06em',
              animation: `card-chip-pulse 2.8s ease-in-out ${(i * 0.18) % 1.6}s infinite`,
            }}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PRACTICE — Terminal with typed code + passing test
   ───────────────────────────────────────────────────────────────── */
export function PracticeAnim() {
  const lines: Array<{ text: string; color: string }> = [
    { text: 'function twoSum(nums, target) {', color: '#C084FC' },
    { text: '  const seen = new Map();', color: '#94A3B8' },
    { text: '  for (let i = 0; i < nums.length; i++) {', color: '#94A3B8' },
    { text: '    if (seen.has(target - nums[i]))', color: '#F59E0B' },
    { text: '      return [seen.get(target - nums[i]), i];', color: '#10B981' },
    { text: '  }', color: '#94A3B8' },
    { text: '}', color: '#94A3B8' },
  ];
  return (
    <div style={{ ...base, background: '#0F172A', padding: '10px 12px', fontFamily: MONO }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444' }} />
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} />
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
      </div>
      <div style={{ fontSize: 8.5, lineHeight: 1.55 }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              color: l.color,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity: 0,
              animation: `card-fade-up 0.35s ease-out ${i * 0.28}s forwards, card-type 0.55s steps(36, end) ${i * 0.28}s both`,
            }}
          >
            {l.text}
          </div>
        ))}
        <div
          style={{
            marginTop: 5,
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            opacity: 0,
            animation: 'card-fade-up 0.4s ease-out 2.4s forwards',
          }}
        >
          <span>✓</span>
          <span>Test passed · O(n)</span>
          <span
            style={{
              display: 'inline-block',
              width: 4,
              height: 10,
              marginLeft: 2,
              background: '#10B981',
              animation: 'card-cursor-blink 1s steps(1) infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ATTEND — Live waveform + cycling transcript
   ───────────────────────────────────────────────────────────────── */
export function AttendAnim() {
  const bars = Array.from({ length: 26 });
  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#EF4444',
            animation: 'card-dot 1.1s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 9, fontWeight: 800, color: '#EF4444', fontFamily: MONO, letterSpacing: '0.18em' }}>LIVE</span>
        <span style={{ fontSize: 9, color: '#94A3B8', fontFamily: MONO, letterSpacing: '0.12em' }}>TRANSCRIBING</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 38 }}>
        {bars.map((_, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: 3,
              height: '100%',
              borderRadius: 2,
              background: `linear-gradient(180deg, ${ACCENT}, #0EA5E9)`,
              transformOrigin: 'center',
              animation: `card-wave ${0.85 + (i % 5) * 0.12}s ease-in-out ${(i % 7) * 0.07}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: '#CBD5E1',
          fontFamily: MONO,
          lineHeight: 1.3,
          animation: 'card-transcript-cycle 5s ease-in-out infinite',
        }}
      >
        "Design a distributed rate limiter…"
      </div>
    </div>
  );
}
