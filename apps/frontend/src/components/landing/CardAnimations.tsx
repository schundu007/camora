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
      @keyframes feat-draw { to { stroke-dashoffset: 0; } }
      @keyframes feat-pop {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes feat-chip-enter {
        0% { opacity: 0; transform: scale(0.6) translateY(4px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes feat-gauge { to { stroke-dashoffset: var(--gauge-offset); } }
      @keyframes feat-count { to { --count: var(--count-to); } }
      @keyframes feat-ping-ring {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(2.2); opacity: 0; }
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

/* ═════════════════════════════════════════════════════════════════
   FEATURE CARD ANIMATIONS — richer, "set us apart" aesthetic
   ═════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────
   FEATURE 1: LIVE AI — voice → AI with skill chips
   ───────────────────────────────────────────────────────────────── */
export function FeatureLiveAIAnim() {
  const skills = ['Redis', 'Sharding', 'Token Bucket'];
  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: MONO,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#EF4444',
            animation: 'card-dot 1.1s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 8, fontWeight: 800, color: '#EF4444', letterSpacing: '0.2em' }}>LIVE</span>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: '#94A3B8', letterSpacing: '0.08em' }}>0.3s</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 18 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              style={{
                display: 'block',
                width: 2,
                height: '100%',
                borderRadius: 1,
                background: `linear-gradient(180deg, ${ACCENT}, #0EA5E9)`,
                transformOrigin: 'center',
                animation: `card-wave ${0.85 + (i % 4) * 0.12}s ease-in-out ${(i % 5) * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 9,
            color: '#E2E8F0',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            animation: 'card-type 1.8s steps(30, end) 0.3s both',
          }}
        >
          "Design a rate limiter…"
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: ACCENT, letterSpacing: '0.18em' }}>AI · SKILLS</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {skills.map((s, i) => (
            <span
              key={s}
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 10,
                background: `${ACCENT}22`,
                color: ACCENT,
                border: `1px solid ${ACCENT}55`,
                opacity: 0,
                animation: `feat-chip-enter 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${2 + i * 0.28}s forwards`,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURE 2: JOB MATCHING — skill profile ↔ companies with lines
   ───────────────────────────────────────────────────────────────── */
export function FeatureJobMatchAnim() {
  const skills = ['Python', 'React', 'AWS'];
  const cos = [
    { co: 'GOOGLE', match: 98 },
    { co: 'META', match: 94 },
    { co: 'STRIPE', match: 91 },
  ];
  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
        fontFamily: MONO,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 260 160"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {cos.map((_, i) => (
          <line
            key={i}
            x1="78"
            y1="80"
            x2="170"
            y2={34 + i * 42}
            stroke={ACCENT}
            strokeWidth="1.2"
            strokeDasharray="3 3"
            style={{
              strokeDashoffset: 220,
              animation: `feat-draw 1s ease-out ${0.8 + i * 0.3}s forwards`,
            }}
          />
        ))}
      </svg>

      {/* Profile + skills */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: 10,
          bottom: 10,
          width: 80,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${ACCENT}, #0EA5E9)`,
            boxShadow: `0 2px 8px ${ACCENT}44`,
            marginBottom: 4,
          }}
        />
        {skills.map((s, i) => (
          <span
            key={s}
            style={{
              fontSize: 8.5,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 3,
              background: '#FFFFFF',
              color: ACCENT,
              border: `1px solid ${ACCENT}44`,
              alignSelf: 'flex-start',
              opacity: 0,
              animation: `feat-chip-enter 0.4s ease-out ${0.2 + i * 0.12}s forwards`,
              letterSpacing: '0.05em',
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Companies */}
      <div
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          bottom: 10,
          width: 115,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {cos.map((c, i) => (
          <div
            key={c.co}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 5,
              padding: '5px 9px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: 0,
              animation: `card-fade-up 0.4s ease-out ${1.5 + i * 0.3}s forwards`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>{c.co}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: 3,
                background: '#DCFCE7',
                color: '#16A34A',
              }}
            >
              {c.match}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURE 3: PREP — architecture diagram self-drawing with topic chips
   ───────────────────────────────────────────────────────────────── */
export function FeaturePrepAnim() {
  const nodes = [
    { id: 'client', x: 8, y: 40, w: 50, h: 22, label: 'CLIENT', filled: false, delay: 0 },
    { id: 'api', x: 104, y: 40, w: 48, h: 22, label: 'API', filled: true, delay: 0.4 },
    { id: 'cache', x: 198, y: 18, w: 54, h: 20, label: 'REDIS', filled: false, delay: 0.9 },
    { id: 'db', x: 198, y: 66, w: 54, h: 20, label: 'POSTGRES', filled: false, delay: 1.2 },
  ];
  const edges = [
    { x1: 58, y1: 51, x2: 104, y2: 51, len: 50, delay: 0.6 },
    { x1: 152, y1: 45, x2: 198, y2: 28, len: 52, delay: 1.1 },
    { x1: 152, y1: 57, x2: 198, y2: 76, len: 52, delay: 1.4 },
  ];
  const topics = ['DSA', 'SYS DESIGN', 'SQL', 'LLD'];

  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #FAFAFA 0%, #F1F5F9 100%)',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 260 160" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arr-prep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT} />
          </marker>
        </defs>

        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={ACCENT}
            strokeWidth="1.5"
            markerEnd="url(#arr-prep)"
            style={{
              strokeDasharray: e.len,
              strokeDashoffset: e.len,
              animation: `feat-draw 0.55s ease-out ${e.delay}s forwards`,
            }}
          />
        ))}

        {nodes.map((n) => (
          <g key={n.id} style={{ opacity: 0, animation: `feat-pop 0.4s ease-out ${n.delay}s forwards` }}>
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx="4"
              fill={n.filled ? ACCENT : '#FFFFFF'}
              stroke={ACCENT}
              strokeWidth="1.3"
            />
            <text
              x={n.x + n.w / 2}
              y={n.y + n.h / 2 + 3.5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fill={n.filled ? '#FFFFFF' : ACCENT}
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.5"
            >
              {n.label}
            </text>
          </g>
        ))}

        {topics.map((t, i) => (
          <g key={t} style={{ opacity: 0, animation: `feat-chip-enter 0.4s ease-out ${1.7 + i * 0.12}s forwards` }}>
            <rect x={8 + i * 63} y="126" width="58" height="18" rx="3" fill="#0F172A" />
            <text
              x={37 + i * 63}
              y="138.5"
              textAnchor="middle"
              fontSize="8"
              fontWeight="800"
              fill="#FFFFFF"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="1"
            >
              {t}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FEATURE 4: MOCK INTERVIEWS — triple circular-gauge score dashboard
   ───────────────────────────────────────────────────────────────── */
export function FeatureMockInterviewAnim() {
  const R = 18;
  const C = 2 * Math.PI * R;
  const gauges = [
    { label: 'COMMS', score: 92, delay: 0.2 },
    { label: 'CODE', score: 95, delay: 0.4 },
    { label: 'DESIGN', score: 88, delay: 0.6 },
  ];

  return (
    <div
      style={{
        ...base,
        background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
        padding: '12px 10px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: MONO,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {gauges.map((g) => {
          const offset = C - (C * g.score) / 100;
          return (
            <div
              key={g.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r={R} fill="none" stroke="#E2E8F0" strokeWidth="4" />
                <circle
                  cx="26"
                  cy="26"
                  r={R}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  transform="rotate(-90 26 26)"
                  style={
                    {
                      strokeDashoffset: C,
                      animation: `feat-gauge 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${g.delay}s forwards`,
                      ['--gauge-offset' as any]: offset,
                    } as React.CSSProperties
                  }
                />
                <text
                  x="26"
                  y="30"
                  textAnchor="middle"
                  fontSize="13"
                  fill="#0F172A"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="800"
                  style={{ opacity: 0, animation: `feat-pop 0.3s ease-out ${g.delay + 0.3}s forwards` }}
                >
                  {g.score}
                </text>
              </svg>
              <span style={{ fontSize: 7.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.14em' }}>{g.label}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          opacity: 0,
          animation: 'card-fade-up 0.45s ease-out 1.7s forwards',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 800, color: '#64748B', letterSpacing: '0.15em' }}>OVERALL</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, letterSpacing: '0.04em' }}>92 / 100</span>
      </div>
    </div>
  );
}
