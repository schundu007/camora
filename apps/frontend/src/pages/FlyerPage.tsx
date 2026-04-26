import { useEffect, useState } from 'react';

type Format = 'square' | 'landscape' | 'portrait';

const FORMATS: { value: Format; label: string; size: string; dims: string }[] = [
  { value: 'landscape', label: 'Twitter / LinkedIn', size: '1200 × 630', dims: 'w-[1200px] h-[630px]' },
  { value: 'square', label: 'Instagram post', size: '1080 × 1080', dims: 'w-[1080px] h-[1080px]' },
  { value: 'portrait', label: 'Instagram story', size: '1080 × 1920', dims: 'w-[1080px] h-[1920px]' },
];

const VALUE_PROPS = [
  { headline: 'Live during interviews', body: 'Real-time transcription + AI answers in any browser tab. Works with Zoom, Meet, Teams.' },
  { headline: '800+ prep topics', body: 'DSA, system design, behavioral STAR — written by engineers, not LLMs.' },
  { headline: 'Coding playground', body: 'Multi-language solutions with three approaches and complexity analysis.' },
  { headline: 'Team plans', body: 'Bootcamps, study groups, recruiting teams — pool hours across up to 10 mates.' },
];

/**
 * Marketing flyer renderer. Renders a single visual at exact pixel dimensions
 * for the chosen platform — Twitter (1200×630), Instagram square (1080×1080),
 * Instagram story (1080×1920). Use the platform picker, then take a screenshot
 * with macOS Cmd+Shift+4 → spacebar → click on the flyer card to grab the
 * exact area. Or print the page to PDF and crop.
 *
 * Outside the flyer itself, the page chrome is intentionally minimal so the
 * downloaded screenshot only includes the visual.
 */
export default function FlyerPage() {
  const [format, setFormat] = useState<Format>('landscape');

  useEffect(() => {
    document.title = 'Camora flyer';
  }, []);

  const config = FORMATS.find((f) => f.value === format)!;

  // Layout differs by aspect ratio — landscape uses a 60/40 split, square
  // stacks vertically, portrait is the most stacked with bigger hero.
  const isLandscape = format === 'landscape';
  const isSquare = format === 'square';
  const isPortrait = format === 'portrait';

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: '#0F172A' }}>
      {/* Format picker — outside the flyer so it's not screenshotted */}
      <div className="w-full p-4 flex items-center justify-center gap-3 flex-wrap" style={{ background: '#020617', borderBottom: '1px solid #1f2937' }}>
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>Format</span>
        {FORMATS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFormat(f.value)}
            className="px-3 py-1.5 text-[12px] font-bold rounded-full transition-all"
            style={{
              background: format === f.value ? '#C9A227' : 'rgba(255,255,255,0.08)',
              color: format === f.value ? '#020617' : '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            {f.label} <span style={{ opacity: 0.7 }}>· {f.size}</span>
          </button>
        ))}
        <span className="text-[11px] ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Tip: Cmd+Shift+4 → spacebar → click the flyer to screenshot at exact dims.
        </span>
      </div>

      {/* The flyer itself — fixed pixel dimensions matching the chosen format */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          className={`${config.dims} relative overflow-hidden flex flex-col`}
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #051C40 50%, #0F172A 100%)',
            borderRadius: 0,
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            color: '#FFFFFF',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Decorative gold radial — top-right */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              top: '-20%',
              right: '-15%',
              width: '60%',
              height: '60%',
              background: 'radial-gradient(circle, rgba(201,162,39,0.25) 0%, rgba(201,162,39,0) 60%)',
              filter: 'blur(40px)',
            }}
          />
          {/* Decorative diagonal stripe */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              bottom: 0,
              left: 0,
              right: 0,
              height: 8,
              background: '#C9A227',
            }}
          />

          {/* Logo + brand */}
          <div className={`relative z-10 ${isLandscape ? 'p-12' : isSquare ? 'p-16' : 'p-20'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #C9A227 0%, #B08D1F 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#020617',
                }}
              >
                C
              </div>
              <span className="text-2xl font-black tracking-tight">Camora</span>
            </div>
          </div>

          {/* Main content area */}
          <div className={`relative z-10 flex-1 flex ${isLandscape ? 'flex-row' : 'flex-col'} ${isLandscape ? 'px-12 pb-12 gap-12' : isSquare ? 'px-16 pb-16 gap-10' : 'px-20 pb-20 gap-14'}`}>
            {/* Left/top: hero */}
            <div className={`${isLandscape ? 'flex-1' : ''} flex flex-col justify-center`}>
              <p
                className={`font-black uppercase tracking-[0.2em] mb-4`}
                style={{ color: '#C9A227', fontSize: isLandscape ? 14 : isSquare ? 16 : 20 }}
              >
                AI interview co-pilot
              </p>
              <h1
                className="font-black tracking-tight leading-[1.05] mb-6"
                style={{
                  fontSize: isLandscape ? 64 : isSquare ? 88 : 120,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Land<br />
                <span style={{ color: '#C9A227' }}>the offer.</span>
              </h1>
              <p
                className="leading-snug"
                style={{
                  fontSize: isLandscape ? 20 : isSquare ? 24 : 32,
                  color: 'rgba(255,255,255,0.85)',
                  maxWidth: isLandscape ? 480 : '100%',
                }}
              >
                Real-time AI during live interviews. 800+ curated prep topics. Multi-language coding playground.
                Built by engineers who failed enough interviews to want better tools.
              </p>
            </div>

            {/* Right/bottom: value props grid */}
            <div className={`${isLandscape ? 'flex-1' : ''} grid ${isLandscape || isSquare ? 'grid-cols-2' : 'grid-cols-2'} gap-${isLandscape ? '4' : '5'}`}>
              {VALUE_PROPS.map((vp) => (
                <div
                  key={vp.headline}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <p
                    className="font-bold mb-1.5"
                    style={{ fontSize: isLandscape ? 16 : isSquare ? 20 : 26, color: '#C9A227' }}
                  >
                    {vp.headline}
                  </p>
                  <p
                    style={{
                      fontSize: isLandscape ? 13 : isSquare ? 15 : 19,
                      color: 'rgba(255,255,255,0.78)',
                      lineHeight: 1.4,
                    }}
                  >
                    {vp.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer: pricing teaser + URL */}
          <div
            className={`relative z-10 flex ${isPortrait ? 'flex-col gap-4' : 'flex-row'} items-center justify-between ${isLandscape ? 'px-12 pb-10' : isSquare ? 'px-16 pb-14' : 'px-20 pb-20'}`}
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: isLandscape ? 24 : isSquare ? 32 : 40, marginTop: 'auto' }}
          >
            <div>
              <p
                className="font-bold"
                style={{ fontSize: isLandscape ? 16 : isSquare ? 20 : 28, color: '#FFFFFF' }}
              >
                Start free · Plans from <span style={{ color: '#C9A227' }}>$29/mo</span>
              </p>
              <p
                style={{ fontSize: isLandscape ? 12 : isSquare ? 14 : 18, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}
              >
                Team plans · Auto top-up · Cancel anytime
              </p>
            </div>
            <div
              className="font-black tracking-tight"
              style={{
                fontSize: isLandscape ? 20 : isSquare ? 26 : 36,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #C9A227 0%, transparent 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: '#FFFFFF',
                padding: '8px 0',
              }}
            >
              camora.cariara.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
