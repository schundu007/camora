import { useEffect, useState } from 'react';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import SEO from '../components/shared/SEO';
import {
  Container,
  Eyebrow,
} from '../components/marketing/primitives';
import { cn } from '../utils/cn';

/**
 * BrandPage — internal-facing brand-concepts gallery.
 *
 * The logo and wordmark SVGs are the content of this page; they are
 * preserved verbatim. Only the page chrome (header, section frames,
 * dark substrate) was migrated to the marketing primitives.
 */

const C = {
  accent: 'var(--cam-primary)',
  accentLt: 'var(--cam-primary-lt)',
  accentDk: 'var(--cam-primary-dk)',
  gold: 'var(--cam-gold-leaf)',
};

/* ════════════════════════════════════════════════════════════
   LOGO SVGs (unchanged)
   ════════════════════════════════════════════════════════════ */

function LogoJourney({ size = 48 }: { size?: number }) {
  const s = size;
  const p = s * 0.12;
  const w = s - p * 2;
  const h = s - p * 2;
  const cx = [0.1, 0.37, 0.63, 0.9].map((r) => p + w * r);
  const cy = [0.65, 0.3, 0.7, 0.35].map((r) => p + h * r);
  const colors = [C.accent, C.accentLt, C.accent, C.gold];
  const dotR = s * 0.065;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`jpath-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={C.accent} />
          <stop offset="33%" stopColor={C.accentLt} />
          <stop offset="66%" stopColor={C.accent} />
          <stop offset="100%" stopColor={C.gold} />
        </linearGradient>
      </defs>
      <path
        d={`M${cx[0]},${cy[0]} C${cx[0] + w * 0.15},${cy[0] - h * 0.3} ${cx[1] - w * 0.12},${cy[1]} ${cx[1]},${cy[1]} S${cx[2] - w * 0.1},${cy[2]} ${cx[2]},${cy[2]} S${cx[3] - w * 0.1},${cy[3] + h * 0.15} ${cx[3]},${cy[3]}`}
        stroke={`url(#jpath-${size})`}
        strokeWidth={s * 0.025}
        strokeLinecap="round"
        fill="none"
      />
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
  const colors = [C.gold, C.accent, C.accentLt, C.accentDk];
  const layers = 4;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {Array.from({ length: layers }, (_, i) => {
        const t = i / (layers - 1);
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
  const ri = s * 0.26;
  const colors = [C.accent, C.accentLt, C.accent, C.gold];
  const hex = (radius: number, angleOffset = -90) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = ((i * 60 + angleOffset) * Math.PI) / 180;
      return [m + radius * Math.cos(a), m + radius * Math.sin(a)] as const;
    });
  const outer = hex(r);
  const segments = [
    { start: 0, end: 1.5, color: colors[0] },
    { start: 1.5, end: 3, color: colors[1] },
    { start: 3, end: 4.5, color: colors[2] },
    { start: 4.5, end: 6, color: colors[3] },
  ];
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {segments.map((seg, idx) => {
        const pts: (readonly [number, number])[] = [];
        for (let i = Math.floor(seg.start); i <= Math.ceil(seg.end) && i < 6; i++) {
          pts.push(outer[i]);
        }
        if (pts.length < 2) return null;
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
        return <path key={idx} d={d} stroke={seg.color} strokeWidth={s * 0.06} strokeLinecap="round" strokeLinejoin="round" />;
      })}
      <path
        d={`M${m + ri * 0.4},${m - ri * 0.8} A${ri},${ri} 0 1,0 ${m + ri * 0.4},${m + ri * 0.8}`}
        stroke={C.accent}
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
  const colors = [C.accent, C.accentLt, C.accent, C.gold];
  const arcs = [0.22, 0.36, 0.50, 0.64];
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx={cx} cy={cy} r={s * 0.05} fill={C.accent} />
      <circle cx={cx} cy={cy} r={s * 0.09} fill={C.accent} opacity={0.15} />
      {arcs.map((r, i) => {
        const radius = s * r;
        const sa = (-80 * Math.PI) / 180;
        const ea = (10 * Math.PI) / 180;
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
   WORDMARKS (typography-focused, kept verbatim)
   ════════════════════════════════════════════════════════════ */

function Wordmark1({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? 'text-white' : 'text-[var(--text-primary)]';
  const subColor = dark ? 'text-white/40' : 'text-[var(--text-muted)]';
  return (
    <div>
      <div className={cn('font-sans tracking-[-0.04em] leading-none text-[32px] font-extrabold', textColor)}>
        <span style={{ color: C.accent }}>C</span>
        <span style={{ color: C.accent }}>a</span>
        mor
        <span style={{ color: C.accent }}>a</span>
      </div>
      <div className={cn('mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em]', subColor)}>
        Apply · Prepare · Practice · Attend
      </div>
    </div>
  );
}

function Wordmark2({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? 'text-white' : 'text-[var(--text-primary)]';
  const subColor = dark ? 'text-white/40' : 'text-[var(--text-muted)]';
  return (
    <div>
      <div className={cn('relative inline-block leading-none font-sans text-[32px] font-bold uppercase tracking-[0.15em]', textColor)}>
        CAMORA
        <div
          className="absolute left-0 right-0"
          style={{
            top: '52%',
            height: 1.5,
            background: `linear-gradient(90deg, ${C.accent}, ${C.accentLt}, ${C.accent}, ${C.gold})`,
          }}
        />
      </div>
      <div className={cn('mt-2 font-mono text-[10px] tracking-[0.08em]', subColor)}>
        apply. prepare. practice. attend.
      </div>
    </div>
  );
}

function Wordmark3({ dark = true }: { dark?: boolean }) {
  const textColor = dark ? 'text-white' : 'text-[var(--text-primary)]';
  const subColor = dark ? 'text-white/40' : 'text-[var(--text-muted)]';
  return (
    <div>
      <div className={cn('leading-none font-sans text-[32px] font-semibold tracking-[-0.02em]', textColor)}>
        <span style={{ fontSize: 38, color: C.accent, fontWeight: 700 }}>c</span>amora
      </div>
      <div className={cn('mt-1.5 font-mono text-[11px] font-semibold tracking-[0.15em]', subColor)}>
        A·P·P·A
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════ */

const LOGOS = [
  { name: 'The Journey', desc: 'Four connected nodes in a flowing path — represents the APPA stages as a continuous journey.', Component: LogoJourney },
  { name: 'The Ascent', desc: 'Layered chevrons rising upward — represents career advancement through interview success.', Component: LogoAscent },
  { name: 'The Hexagon', desc: 'Multi-colored hexagonal segments with inner "C" — represents structure, connectivity, and tech.', Component: LogoHexagon },
  { name: 'The Signal', desc: 'Radiating arcs from a point of origin — represents AI intelligence emanating outward.', Component: LogoSignal },
];

const WORDMARKS = [
  { name: 'Weighted', desc: 'Extrabold with colored "a" letters referencing the A-P-P-A pattern.', Component: Wordmark1 },
  { name: 'Strikethrough', desc: 'All-caps with APPA gradient line through the center.', Component: Wordmark2 },
  { name: 'Lowercase', desc: 'Minimal lowercase with oversized blue "c" and A·P·P·A subtitle.', Component: Wordmark3 },
];

const APPA_STAGES = [
  { label: 'Apply', color: C.accent },
  { label: 'Prepare', color: C.accentLt },
  { label: 'Practice', color: C.accent },
  { label: 'Attend', color: C.gold },
];

export default function BrandPage() {
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);
  const [selectedWordmark, setSelectedWordmark] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Brand | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A1228] text-white font-sans">
      <SEO title="Brand" description="Camora brand concepts — four logo concepts and three wordmark treatments built around the APPA framework." path="/brand" />
      <SiteNav />

      <main className="relative flex-1">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.08), transparent 60%),' +
              'radial-gradient(ellipse 55% 60% at 12% 25%, rgba(201,162,39,0.14), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 88% 75%, rgba(38,97,156,0.25), transparent 60%)',
          }}
        />

        <Container className="relative py-16 md:py-24">
          {/* Header */}
          <header className="mb-16 max-w-3xl">
            <Eyebrow tone="inverse">Brand identity</Eyebrow>
            <h1 className="mt-3 font-display text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.05] text-white">
              Camora brand concepts
            </h1>
            <p className="mt-5 text-base md:text-lg leading-relaxed text-white/70">
              Four logo concepts and three wordmark treatments. Each designed around the APPA framework —
              <span className="text-white"> Apply, Prepare, Practice, Attend</span>.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {APPA_STAGES.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-medium text-white/70">{s.label}</span>
                </div>
              ))}
            </div>
          </header>

          {/* ── Logo concepts ─────────────────────────────────── */}
          <section className="mb-20">
            <h2 className="font-display text-2xl font-semibold text-white">Logo concepts</h2>
            <p className="mt-1 text-base text-white/55">Click to select your preferred concept.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              {LOGOS.map((logo, i) => {
                const active = selectedLogo === i;
                return (
                  <button
                    key={logo.name}
                    type="button"
                    onClick={() => setSelectedLogo(i)}
                    className={cn(
                      'group overflow-hidden rounded-2xl border bg-white/[0.02] text-left transition-all duration-200',
                      active
                        ? 'border-[var(--cam-primary-lt)]/50 ring-2 ring-[var(--cam-primary-lt)]/25'
                        : 'border-white/[0.08] hover:border-white/20',
                    )}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex flex-col items-center justify-center px-6 py-10 bg-[#0A1228]">
                        <logo.Component size={96} />
                        <span className="mt-3 font-mono text-[10.5px] font-medium tracking-[0.2em] text-white/35">DARK</span>
                      </div>
                      <div className="flex flex-col items-center justify-center px-6 py-10 border-t sm:border-t-0 sm:border-l border-white/[0.06] bg-[var(--bg-elevated)]">
                        <logo.Component size={96} />
                        <span className="mt-3 font-mono text-[10.5px] font-medium tracking-[0.2em] text-[var(--text-muted)]">LIGHT</span>
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] px-6 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-[17px] font-semibold text-white">{logo.name}</h3>
                        <div className="flex items-center gap-3 opacity-60">
                          <logo.Component size={22} />
                          <logo.Component size={30} />
                          <logo.Component size={42} />
                        </div>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">{logo.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Wordmark treatments ─────────────────────────── */}
          <section className="mb-20">
            <h2 className="font-display text-2xl font-semibold text-white">Wordmark treatments</h2>
            <p className="mt-1 text-base text-white/55">Click to select your preferred typography.</p>

            <div className="mt-8 grid gap-5">
              {WORDMARKS.map((wm, i) => {
                const active = selectedWordmark === i;
                return (
                  <button
                    key={wm.name}
                    type="button"
                    onClick={() => setSelectedWordmark(i)}
                    className={cn(
                      'group overflow-hidden rounded-2xl border bg-white/[0.02] text-left transition-all duration-200',
                      active
                        ? 'border-[var(--cam-primary-lt)]/50 ring-2 ring-[var(--cam-primary-lt)]/25'
                        : 'border-white/[0.08] hover:border-white/20',
                    )}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center justify-center px-8 py-10 bg-[#0A1228]">
                        <wm.Component dark />
                      </div>
                      <div className="flex items-center justify-center px-8 py-10 border-t sm:border-t-0 sm:border-l border-white/[0.06] bg-[var(--bg-elevated)]">
                        <wm.Component dark={false} />
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] px-6 py-5">
                      <h3 className="font-display text-[17px] font-semibold text-white">{wm.name}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-white/55">{wm.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Combined preview ─────────────────────────────── */}
          {selectedLogo !== null && selectedWordmark !== null && (
            <section className="mb-20">
              <h2 className="font-display text-2xl font-semibold text-white">Your selection</h2>
              <p className="mt-1 text-base text-white/55">
                {LOGOS[selectedLogo].name} logo + {WORDMARKS[selectedWordmark].name} wordmark
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex items-center gap-6 rounded-2xl border border-white/[0.08] bg-[#0A1228] px-12 py-16">
                  {(() => { const L = LOGOS[selectedLogo].Component; return <L size={56} />; })()}
                  {(() => { const W = WORDMARKS[selectedWordmark].Component; return <W dark />; })()}
                </div>
                <div className="flex items-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-12 py-16">
                  {(() => { const L = LOGOS[selectedLogo].Component; return <L size={56} />; })()}
                  {(() => { const W = WORDMARKS[selectedWordmark].Component; return <W dark={false} />; })()}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-white/55">Size variants</p>
                <div className="mt-4 flex flex-wrap items-end gap-8">
                  {[16, 24, 32, 48, 64, 96].map((sz) => {
                    const L = LOGOS[selectedLogo].Component;
                    return (
                      <div key={sz} className="flex flex-col items-center gap-2">
                        <L size={sz} />
                        <span className="font-mono text-[10.5px] text-white/45">{sz}px</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <p className="px-8 pt-6 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-white/55">Nav preview</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-b border-white/[0.06] bg-[#0A1228]/80 px-8 py-4">
                  <div className="flex items-center gap-3">
                    {(() => { const L = LOGOS[selectedLogo].Component; return <L size={32} />; })()}
                    {(() => { const W = WORDMARKS[selectedWordmark].Component; return <W dark />; })()}
                  </div>
                  <div className="flex items-center gap-6">
                    {['Apply', 'Prepare', 'Practice', 'Attend', 'Pricing'].map((l) => (
                      <span key={l} className="text-sm font-medium text-white/65">{l}</span>
                    ))}
                    <span className="rounded-lg bg-[var(--cam-primary)] px-4 py-2 text-sm font-semibold text-white">
                      Launch app
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          <p className="border-t border-white/[0.08] pt-10 text-sm text-white/50">
            Select one logo and one wordmark above to see the combined preview. Share this page to discuss with your team.
          </p>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
