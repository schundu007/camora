import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';

const accent = 'var(--cam-primary)';
const F = {
  display: "'Source Sans 3', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'Source Code Pro', monospace",
};

const COMPARISON = [
  { feature: 'Real-time AI during live interview', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
  { feature: 'Job discovery and matching', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: false, parakeet: false, unique: true },
  { feature: 'Auto resume and cover letter', camora: true, finalround: false, lockedin: true, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: false },
  { feature: 'Auto job apply', camora: true, finalround: false, lockedin: true, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: false, parakeet: false },
  { feature: '800+ interview prep topics', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: true, algomaster: true, designgurus: true, aiapply: false, offergoose: false, parakeet: false },
  { feature: 'System design with diagrams', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: 'Partial', algomaster: true, designgurus: true, aiapply: false, offergoose: false, parakeet: false },
  { feature: 'Mock interview simulator', camora: true, finalround: true, lockedin: true, solver: false, sensei: true, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: false },
  { feature: 'Coding solutions with complexity', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: true, algomaster: true, designgurus: true, aiapply: false, offergoose: false, parakeet: 'Partial' },
  { feature: 'Speaker voice filtering', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: false, offergoose: false, parakeet: false, unique: true },
  { feature: 'Combined prep + live tool', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: 'Partial', offergoose: 'Partial', parakeet: false, unique: true },
  { feature: 'Voice transcription', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
  { feature: 'Desktop app', camora: true, finalround: true, lockedin: true, solver: true, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
  { feature: 'Mobile app (iOS & Android)', camora: true, finalround: true, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: false, parakeet: false },
];

const FAQS = [
  { q: 'Is there really a free tier?', a: 'Yes. 3 live interview sessions, no credit card required. Browse all 300+ preparation topics for free.' },
  { q: 'Is it detectable during screen share?', a: 'Camora runs in a separate browser tab. Use Cmd+B to instantly blank the screen. Desktop app has stealth mode built in.' },
  { q: 'What platforms are supported?', a: 'Zoom, Google Meet, Microsoft Teams, HackerRank, CoderPad, Codility, and any browser-based interview platform.' },
  { q: 'Can it hear my interviewer?', a: 'Yes. Capture system audio from your video call. It transcribes their questions in real-time.' },
  { q: 'What makes Camora different?', a: 'The only platform combining job discovery, preparation, practice, and live interview AI in one tool.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Access continues through the end of your billing period.' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Pricing | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF', color: '#0F172A' }}>
      <SEO title="Pricing" description="Interview prep plans starting free. Monthly, Quarterly Pro, and Desktop Lifetime options." path="/pricing" />
      <SiteNav variant="light" />

      {/* ═══════════ HEADER ═══════════ */}
      <section className="pt-32 pb-16 px-6 text-center">
        <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>PRICING</span>
        <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
          SIMPLE, TRANSPARENT<br /><span style={{ color: accent }}>PRICING.</span>
        </h1>
        <p className="mt-5 text-lg max-w-xl mx-auto" style={{ color: '#475569' }}>
          Start free. Upgrade when you're ready. No hidden fees.
        </p>
      </section>

      {/* ═══════════ PLANS ═══════════ */}
      <section className="max-w-6xl mx-auto px-6 pb-24 w-full">
        <SharedPricingCards />
      </section>

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section className="px-6 py-24" style={{ background: '#F8FAFC' }}>
        <div className="w-full max-w-[95%] lg:max-w-[90%] mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>COMPARISON</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
              HOW CAMORA <span style={{ color: accent }}>COMPARES.</span>
            </h2>
          </div>

          {(() => {
            const competitors = [
              { n: 'Camora', p: 'Free to start' },
              { n: 'Final Round', p: '$100/mo' },
              { n: 'LockedIn', p: '$55-120/mo' },
              { n: 'Solver', p: '$39/mo' },
              { n: 'Sensei', p: '$24-89/mo' },
              { n: 'TechPrep', p: '$39/mo' },
              { n: 'AlgoMaster', p: '$29/mo' },
              { n: 'DesignGurus', p: '$98-197/yr' },
              { n: 'AIApply', p: '$29-200/mo' },
              { n: 'OfferGoose', p: '$89-200/mo' },
              { n: 'Parakeet', p: '$100-200/mo' },
            ];
            const keys = ['camora', 'finalround', 'lockedin', 'solver', 'sensei', 'techprep', 'algomaster', 'designgurus', 'aiapply', 'offergoose', 'parakeet'];

            return (
              <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #E2E8F0' }}>
                <div style={{ minWidth: '900px' }}>
                {/* Header */}
                <div className="grid" style={{ gridTemplateColumns: `minmax(180px, 2fr) repeat(${competitors.length}, minmax(70px, 1fr))` }}>
                  <div className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-10" style={{ color: '#94A3B8', fontFamily: F.mono, background: '#FFFFFF', borderBottom: '2px solid #E2E8F0' }}>
                    Feature
                  </div>
                  {competitors.map((c, i) => (
                    <div key={c.n} className="px-2 py-4 text-center" style={{
                      background: i === 0 ? accent : '#FFFFFF',
                      borderBottom: i === 0 ? `2px solid ${accent}` : '2px solid #E2E8F0',
                    }}>
                      <div className="text-[10px] font-bold" style={{ color: i === 0 ? '#FFFFFF' : '#0F172A' }}>{c.n}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: i === 0 ? 'rgba(255,255,255,0.8)' : '#94A3B8' }}>{c.p}</div>
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {COMPARISON.map((row, ri) => (
                  <div key={ri} className="grid" style={{ gridTemplateColumns: `minmax(180px, 2fr) repeat(${competitors.length}, minmax(70px, 1fr))`, borderBottom: ri < COMPARISON.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <div className="px-5 py-3 text-[12px] flex items-center sticky left-0 z-10" style={{ color: row.unique ? accent : '#334155', fontWeight: row.unique ? 600 : 400, background: ri % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                      {row.feature}
                    </div>
                    {keys.map((k, ci) => {
                      const val = (row as any)[k];
                      return (
                        <div key={k} className="px-2 py-3 flex items-center justify-center" style={{ background: ci === 0 ? 'rgba(59,54,220,0.04)' : ri % 2 === 0 ? '#FFFFFF' : '#FAFBFC' }}>
                          {val === true ? (
                            ci === 0
                              ? <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: accent }}><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L4.5 8.5L2 6" /></svg></span>
                              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L4.5 8.5L2 6" /></svg>
                          ) : val === false ? (
                            <span style={{ color: '#E2E8F0', fontSize: 12 }}>—</span>
                          ) : (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#F8FAFC', color: '#92400E' }}>{val}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="px-6 py-24" style={{ background: '#FFFFFF' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>FAQ</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight uppercase" style={{ fontFamily: F.display }}>
              COMMON <span style={{ color: accent }}>QUESTIONS.</span>
            </h2>
          </div>

          <div className="space-y-0" style={{ borderTop: '1px solid #E2E8F0' }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left transition-colors"
                >
                  <span className="text-base font-semibold pr-4" style={{ color: '#0F172A' }}>{faq.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-sm leading-relaxed -mt-1" style={{ color: '#64748B' }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="px-6 py-16" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-10 md:px-14 py-10 rounded-2xl" style={{ background: '#0F172A' }}>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight" style={{ fontFamily: F.display }}>
                START FOR <span style={{ color: accent }}>FREE.</span>
              </h2>
              <p className="mt-2 text-sm text-white/70">No credit card required. Cancel anytime.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/signup" className="px-7 py-3.5 text-sm font-bold uppercase tracking-[0.08em] rounded-full" style={{ background: '#FFFFFF', color: '#0F172A' }}>
                GET STARTED FREE
              </Link>
              <Link to="/" className="px-7 py-3.5 text-sm font-bold uppercase tracking-[0.08em] rounded-full" style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: '#FFFFFF' }}>
                LEARN MORE
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter variant="light" />
    </div>
  );
}
