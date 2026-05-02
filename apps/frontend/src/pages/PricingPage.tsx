import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';
import { DiagonalDivider } from '../components/shared/DiagonalDivider';

const accent = 'var(--cam-primary)';
const F = {
  display: "'Source Sans 3', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'Source Code Pro', monospace",
};

const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Access continues through the end of your billing period.' },
  { q: 'What\'s the difference between Monthly and Yearly?', a: 'Same product, different cadence. Yearly costs $99 — about 57% off vs paying $19 monthly twelve times.' },
  { q: 'How does the $15/hour option work?', a: 'Buy 1 AI hour at a time. No subscription. Hours expire 90 days after purchase. Stack on top of any active monthly or yearly plan.' },
  { q: 'Is it detectable during screen share?', a: 'Camora runs in a separate browser tab or desktop window. Use Cmd+B to instantly blank the screen. Desktop app has stealth mode built in.' },
  { q: 'What platforms are supported?', a: 'Zoom, Google Meet, Microsoft Teams, HackerRank, CoderPad, Codility, and any browser-based interview platform.' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Pricing | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title="Pricing" description="Three simple plans: $19/month, $99/year, or $15/hour pay-as-you-go." path="/pricing" />
      <SiteNav variant="light" />

      {/* ═══════════ HEADER ═══════════ */}
      <section
        className="relative pt-32 pb-32 px-6 text-center overflow-hidden"
        style={{ background: 'var(--cam-hero-bg)' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }}
        />
        <div className="relative">
          <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: F.mono }}>PRICING</span>
          <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: F.display }}>
            SIMPLE, TRANSPARENT<br /><span style={{ color: 'var(--cam-gold-leaf-lt)' }}>PRICING.</span>
          </h1>
          <p className="mt-5 text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Three options. Pick the one that fits how you interview.
          </p>
        </div>
        <DiagonalDivider fill="var(--bg-surface)" slope="tr-to-bl" position="bottom" height="9vh" />
      </section>

      {/* ═══════════ PLANS ═══════════ */}
      <section className="max-w-6xl mx-auto px-6 pb-20 pt-8 w-full">
        <SharedPricingCards />
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="px-6 py-20" style={{ background: 'var(--bg-elevated)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)', fontFamily: F.mono }}>FAQ</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
              COMMON <span style={{ color: accent }}>QUESTIONS.</span>
            </h2>
          </div>

          <div className="space-y-0" style={{ borderTop: '1px solid var(--border)' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left transition-colors"
                >
                  <span className="text-base font-semibold pr-4" style={{ color: 'var(--text-primary)' }}>{faq.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-sm leading-relaxed -mt-1" style={{ color: 'var(--text-muted)' }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="px-6 py-16" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-10 md:px-14 py-10 rounded-2xl" style={{ background: '#0F172A' }}>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: F.display }}>
                READY TO <span style={{ color: accent }}>START?</span>
              </h2>
              <p className="mt-2 text-sm text-white/70">Pick a plan above. Cancel any time.</p>
            </div>
            <div className="flex items-center">
              <Link to="/signup" className="inline-flex items-center gap-2 px-9 py-4 text-sm font-bold uppercase tracking-[0.08em] rounded-full transition-transform hover:scale-[1.02]" style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', boxShadow: '0 8px 22px rgba(0,0,0,0.25)' }}>
                CREATE ACCOUNT
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}
