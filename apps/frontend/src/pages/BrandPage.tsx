/* Add route: <Route path="/brand" element={<BrandPage />} /> */

import { useState } from 'react';
import SiteNav from '../components/shared/SiteNav';

/* ── APPA Colors ─────────────────────────────────────────── */
const C = {
  emerald: '#34d399',
  indigo: '#91C733',
  cyan: '#38bdf8',
  amber: '#fbbf24',
  dark: '#0a0b14',
  light: '#ffffff',
};

/* ════════════════════════════════════════════════════════════
   LOGO SVG COMPONENTS
   ════════════════════════════════════════════════════════════ */

function LogoJourney({ size = 48 }: { size?: number }) {
  const s = size;
  const p = s * 0.12; // padding
  const w = s - p * 2;
  const h = s - p * 2;
  const cx = [0.1, 0.37, 0.63, 0.9].map(r => p + w * r);
  const cy = [0.65, 0.3, 0.7, 0.35].map(r => p + h * r);
  const colors = [C.emerald, C.indigo, C.cyan, C.amber];
  const dotR = s * 0.065;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jpath" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.emerald} />
          <stop offset="33%" stopColor={C.indigo} />
          <stop offset="66%" stopColor={C.cyan} />
          <stop offset="100%" stopColor={C.amber} />
        </linearGradient>
      </defs>
      {/* Flowing path connecting all 4 nodes */}
      <path
        d={`M${cx[0]},${cy[0]} C${cx[0] + w * 0.15},${cy[0] - h * 0.3} ${cx[1] - w * 0.12},${cy[1]} ${cx[1]},${cy[1]} S${cx[2] - w * 0.1},${cy[2]} ${cx[2]},${cy[2]} S${cx[3] - w * 0.1},${cy[3] + h * 0.15} ${cx[3]},${cy[3]}`}
        stroke="url(#jpath)" strokeWidth={s * 0.025} strokeLinecap="round" fill="none"
      />
      {/* Nodes */}
      {cx.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={cy[i]} r={dotR * 1.8} fill={colors[i]} opacity={0.15} />
          <circle cx={x} cy={cy[i]} r={dotR} fill={colors[i]} />
        </g>
      ))}
    </svg>
  );
}

function LogoAscent({ size = 48 }: { size?: number }) {
  const s = size;
  const m = s / 2;
  const colors = [C.amber, C.cyan, C.indigo, C.emerald]; // bottom to top
  const layers = 4;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: layers }, (_, i) => {
        const t = i / (layers - 1); // 0 → 1
        const chevW = s * (0.7 - t * 0.2);
        const chevH = s * 0.14;
        const yOffset = s * 0.18 + (layers - 1 - i) * s * 0.17;
        const opacity = 0.6 + t * 0.4;
        return (
          <g key={i} opacity={opacity}>
            <path
              d={`M${m - chevW / 2},${yOffset + chevH} L${m},${yOffset} L${m + chevW / 2},${yOffset + chevH}`}
              stroke={colors[i]}
              strokeWidth={s * 0.06}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        );
      })}
    </svg>
  );
}

function LogoHexagon({ size = 48 }: { size?: number }) {
  const s = size;
  const m = s / 2;
  const r = s * 0.42;
  const ri = s * 0.26; // inner radius for "C" cutout
  const colors = [C.emerald, C.indigo, C.cyan, C.amber];

  // Hex points
  const hex = (radius: number, angleOffset = -90) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((i * 60 + angleOffset) * Math.PI) / 180;
      return [m + radius * Math.cos(a), m + radius * Math.sin(a)];
    });

  const outer = hex(r);

  // 4 segments (each covers ~1.5 sides of hexagon)
  const segments = [
    { start: 0, end: 1.5, color: colors[0] },
    { start: 1.5, end: 3, color: colors[1] },
    { start: 3, end: 4.5, color: colors[2] },
    { start: 4.5, end: 6, color: colors[3] },
  ];

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hex segments */}
      {segments.map((seg, idx) => {
        const pts: number[][] = [];
        for (let i = Math.floor(seg.start); i <= Math.ceil(seg.end) && i < 6; i++) {
          pts.push(outer[i]);
        }
        if (pts.length < 2) return null;
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
        return (
          <path key={idx} d={d} stroke={seg.color} strokeWidth={s * 0.06} strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
      {/* Inner "C" shape */}
      <path
        d={`M${m + ri * 0.4},${m - ri * 0.8} A${ri},${ri} 0 1,0 ${m + ri * 0.4},${m + ri * 0.8}`}
        stroke={C.emerald}
        strokeWidth={s * 0.045}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
    </svg>
  );
}

function LogoSignal({ size = 48 }: { size?: number }) {
  const s = size;
  const cx = s * 0.28;
  const cy = s * 0.72;
  const colors = [C.emerald, C.indigo, C.cyan, C.amber];
  const arcs = [0.22, 0.36, 0.50, 0.64];

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Origin dot */}
      <circle cx={cx} cy={cy} r={s * 0.05} fill={C.emerald} />
      <circle cx={cx} cy={cy} r={s * 0.09} fill={C.emerald} opacity={0.15} />
      {/* Arcs */}
      {arcs.map((r, i) => {
        const radius = s * r;
        const startAngle = -80;
        const endAngle = 10;
        const sa = (startAngle * Math.PI) / 180;
        const ea = (endAngle * Math.PI) / 180;
        const x1 = cx + radius * Math.cos(sa);
        const y1 = cy + radius * Math.sin(sa);
        const x2 = cx + radius * Math.cos(ea);
        const y2 = cy + radius * Math.sin(ea);
        return (
          <path
            key={i}
            d={`M${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2}`}
            stroke={colors[i]}
            strokeWidth={s * 0.04}
            strokeLinecap="round"
            fill="none"
            opacity={0.7 + i * 0.1}
          />
        );
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   WORDMARK COMPONENTS
   ════════════════════════════════════════════════════════════ */

function Wordmark1({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? 'text-white' : 'text-gray-900';
  const subColor = dark ? 'text-gray-500' : 'text-gray-400';
  return (
    <div>
      <div className={`${textColor} tracking-[-0.04em] leading-none`}
           style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800 }}>
        <span style={{ color: C.emerald }}>C</span>
        <span style={{ color: dark ? C.emerald : '#76B900' }}>a</span>
        mor
        <span style={{ color: dark ? C.emerald : '#76B900' }}>a</span>
      </div>
      <div className={`${subColor} mt-1.5`}
           style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Apply · Prepare · Practice · Attend
      </div>
    </div>
  );
}

function Wordmark2({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? '#ffffff' : '#111827';
  const subColor = dark ? 'text-gray-500' : 'text-gray-400';
  return (
    <div>
      <div className="relative inline-block leading-none"
           style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '0.15em', color: textColor, textTransform: 'uppercase' as const }}>
        CAMORA
        {/* Strikethrough line */}
        <div className="absolute left-0 right-0" style={{ top: '52%', height: 1.5, background: `linear-gradient(90deg, ${C.emerald}, ${C.indigo}, ${C.cyan}, ${C.amber})` }} />
      </div>
      <div className={`${subColor} mt-2`}
           style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 400, letterSpacing: '0.08em' }}>
        apply. prepare. practice. attend.
      </div>
    </div>
  );
}

function Wordmark3({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? '#ffffff' : '#111827';
  const subColor = dark ? 'text-gray-500' : 'text-gray-400';
  return (
    <div>
      <div className="leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 600, color: textColor, letterSpacing: '-0.02em' }}>
        <span style={{ fontSize: 38, color: C.emerald, fontWeight: 700 }}>c</span>amora
      </div>
      <div className={`${subColor} mt-1.5`}
           style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.15em' }}>
        A·P·P·A
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BRAND PAGE
   ════════════════════════════════════════════════════════════ */

const LOGOS = [
  { name: 'The Journey', desc: 'Four connected nodes in a flowing path — represents the APPA stages as a continuous journey.', Component: LogoJourney },
  { name: 'The Ascent', desc: 'Layered chevrons rising upward — represents career advancement through interview success.', Component: LogoAscent },
  { name: 'The Hexagon', desc: 'Multi-colored hexagonal segments with inner "C" — represents structure, connectivity, and tech.', Component: LogoHexagon },
  { name: 'The Signal', desc: 'Radiating arcs from a point of origin — represents AI intelligence emanating outward.', Component: LogoSignal },
];

const WORDMARKS = [
  { name: 'Weighted', desc: 'Extrabold with colored "a" letters referencing A-P-P-A pattern.', Component: Wordmark1 },
  { name: 'Strikethrough', desc: 'All-caps with APPA gradient line through the center.', Component: Wordmark2 },
  { name: 'Lowercase', desc: 'Minimal lowercase with oversized emerald "c" and A·P·P·A subtitle.', Component: Wordmark3 },
];

export default function BrandPage() {
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);
  const [selectedWordmark, setSelectedWordmark] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: C.dark, fontFamily: "'DM Sans', 'Work Sans', system-ui, sans-serif" }}>
      <SiteNav />
      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none opacity-40"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }} />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-16 md:py-24">
        {/* Header */}
        <div className="mb-20">
          <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-sm text-emerald-400 font-semibold tracking-wider uppercase mb-4">
            Brand Identity
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Camora Brand Concepts
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl leading-relaxed">
            Four logo concepts and three wordmark treatments. Each designed around the APPA framework —
            <span className="text-gray-200"> Apply, Prepare, Practice, Attend</span>.
          </p>
          <div className="flex items-center gap-4 mt-6">
            {[
              { label: 'Apply', color: C.emerald },
              { label: 'Prepare', color: C.indigo },
              { label: 'Practice', color: C.cyan },
              { label: 'Attend', color: C.amber },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                <span className="text-sm text-gray-400 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── LOGO CONCEPTS ───────────────────────────────── */}
        <section className="mb-24">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-2xl font-bold text-white mb-2">Logo Concepts</h2>
          <p className="text-base text-gray-500 mb-10">Click to select your preferred concept.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {LOGOS.map((logo, i) => (
              <button
                key={logo.name}
                onClick={() => setSelectedLogo(i)}
                className={`group text-left rounded-2xl border transition-all duration-300 overflow-hidden ${
                  selectedLogo === i
                    ? 'border-emerald-500/40 ring-2 ring-emerald-500/20'
                    : 'border-white/[0.08] hover:border-white/[0.15]'
                }`}
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {/* Dark + Light previews */}
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* Dark bg */}
                  <div className="flex flex-col items-center justify-center py-10 px-6" style={{ background: C.dark }}>
                    <logo.Component size={96} />
                    <span className="text-xs text-gray-600 mt-3 font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>DARK</span>
                  </div>
                  {/* Light bg */}
                  <div className="flex flex-col items-center justify-center py-10 px-6 border-l border-white/[0.06]" style={{ background: '#f8f9fa' }}>
                    <logo.Component size={96} />
                    <span className="text-xs text-gray-400 mt-3 font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>LIGHT</span>
                  </div>
                </div>
                {/* Info */}
                <div className="px-6 py-5 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {logo.name}
                    </h3>
                    {/* Small size preview */}
                    <div className="flex items-center gap-3 opacity-60">
                      <logo.Component size={24} />
                      <logo.Component size={32} />
                      <logo.Component size={48} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{logo.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── WORDMARK TREATMENTS ─────────────────────────── */}
        <section className="mb-24">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-2xl font-bold text-white mb-2">Wordmark Treatments</h2>
          <p className="text-base text-gray-500 mb-10">Click to select your preferred typography.</p>

          <div className="grid gap-6">
            {WORDMARKS.map((wm, i) => (
              <button
                key={wm.name}
                onClick={() => setSelectedWordmark(i)}
                className={`group text-left rounded-2xl border transition-all duration-300 overflow-hidden ${
                  selectedWordmark === i
                    ? 'border-emerald-500/40 ring-2 ring-emerald-500/20'
                    : 'border-white/[0.08] hover:border-white/[0.15]'
                }`}
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* Dark */}
                  <div className="flex items-center justify-center py-10 px-8" style={{ background: C.dark }}>
                    <wm.Component dark={true} />
                  </div>
                  {/* Light */}
                  <div className="flex items-center justify-center py-10 px-8 border-l border-white/[0.06]" style={{ background: '#f8f9fa' }}>
                    <wm.Component dark={false} />
                  </div>
                </div>
                <div className="px-6 py-5 border-t border-white/[0.06]">
                  <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {wm.name}
                  </h3>
                  <p className="text-sm text-gray-500">{wm.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── COMBINED PREVIEW ─────────────────────────────── */}
        {selectedLogo !== null && selectedWordmark !== null && (
          <section className="mb-24">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-bold text-white mb-2">Your Selection</h2>
            <p className="text-base text-gray-500 mb-10">
              {LOGOS[selectedLogo].name} logo + {WORDMARKS[selectedWordmark].name} wordmark
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Dark preview */}
              <div className="rounded-2xl border border-white/[0.08] py-16 px-12 flex items-center gap-6" style={{ background: C.dark }}>
                {(() => { const L = LOGOS[selectedLogo].Component; return <L size={56} />; })()}
                {(() => { const W = WORDMARKS[selectedWordmark].Component; return <W dark={true} />; })()}
              </div>
              {/* Light preview */}
              <div className="rounded-2xl border border-gray-200 py-16 px-12 flex items-center gap-6" style={{ background: '#ffffff' }}>
                {(() => { const L = LOGOS[selectedLogo].Component; return <L size={56} />; })()}
                {(() => { const W = WORDMARKS[selectedWordmark].Component; return <W dark={false} />; })()}
              </div>
            </div>

            {/* Favicon / small sizes */}
            <div className="mt-6 rounded-2xl border border-white/[0.08] p-8" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-sm text-gray-500 font-medium mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>SIZE VARIANTS</div>
              <div className="flex items-end gap-8">
                {[16, 24, 32, 48, 64, 96].map((sz) => {
                  const L = LOGOS[selectedLogo].Component;
                  return (
                    <div key={sz} className="flex flex-col items-center gap-2">
                      <L size={sz} />
                      <span className="text-xs text-gray-600 font-mono">{sz}px</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nav preview */}
            <div className="mt-6 rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-sm text-gray-500 font-medium px-8 pt-6 mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>NAV PREVIEW</div>
              <div className="flex items-center justify-between px-8 py-4 border-t border-b border-white/[0.06]" style={{ background: 'rgba(10,11,20,0.8)' }}>
                <div className="flex items-center gap-3">
                  {(() => { const L = LOGOS[selectedLogo].Component; return <L size={32} />; })()}
                  <span className="text-base font-bold" style={{ fontFamily: "'Clash Display', sans-serif", background: 'linear-gradient(135deg, #76B900, #2d8a1e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Camora</span>
                </div>
                <div className="flex items-center gap-6">
                  {['Apply', 'Prepare', 'Practice', 'Attend', 'Pricing'].map((l) => (
                    <span key={l} className="text-sm text-gray-400 font-medium">{l}</span>
                  ))}
                  <span className="px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg">Launch App</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Instructions */}
        <div className="border-t border-white/[0.06] pt-10">
          <p className="text-sm text-gray-600">
            Select one logo and one wordmark above to see the combined preview. Share this page to discuss with your team.
          </p>
        </div>
      </div>
    </div>
  );
}
