import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import SharedPricingCards from '../components/shared/PricingCards';


// Plans imported from shared PricingCards component

const COMPARISON = [
  { feature: 'Real-time AI during live interview', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
  { feature: 'Job discovery and matching', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: false, parakeet: false, unique: true },
  { feature: 'Auto resume and cover letter', camora: true, finalround: false, lockedin: true, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: false },
  { feature: 'Auto job apply', camora: true, finalround: false, lockedin: true, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: false, parakeet: false },
  { feature: '300+ interview prep topics', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: true, algomaster: true, designgurus: true, aiapply: false, offergoose: false, parakeet: false },
  { feature: 'System design with diagrams', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: 'Partial', algomaster: true, designgurus: true, aiapply: false, offergoose: false, parakeet: false },
  { feature: 'Mock interview simulator', camora: true, finalround: true, lockedin: true, solver: false, sensei: true, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: false },
  { feature: 'Coding solutions with complexity', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: true, algomaster: true, designgurus: true, aiapply: false, offergoose: false, parakeet: 'Partial' },
  { feature: 'Speaker voice filtering', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: false, offergoose: false, parakeet: false, unique: true },
  { feature: 'Combined prep plus live tool', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: 'Partial', offergoose: 'Partial', parakeet: false, unique: true },
  { feature: 'Voice transcription', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
  { feature: 'Desktop app', camora: true, finalround: true, lockedin: true, solver: true, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
  { feature: 'Mobile app (iOS & Android)', camora: true, finalround: true, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: false, parakeet: false },
];

export default function PricingPage() {
  useEffect(() => {
    document.title = 'Snow Passes | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <SEO title="Pricing" description="Interview prep plans starting free. Monthly, Quarterly Pro, and Desktop Lifetime options." path="/pricing" />
      <SiteNav variant="light" />

      {/* Header */}
      <section className="pt-24 pb-4 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Snow Passes</span>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Choose your Snow Strength.
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>Start free. Upgrade when you're ready.</p>
      </section>

      {/* Plans — shared component */}
      <section className="w-full lg:max-w-[85%] mx-auto px-6 pt-14 pb-20">
        <SharedPricingCards variant="full" />
      </section>

      {/* Competitor comparison — CSS Grid */}
      <section className="w-full lg:max-w-[85%] mx-auto px-6 pt-4 pb-16">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Why Camora Wins</span>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Compare the competition.</h2>
        </div>
        {(() => {
          const competitors = [
            { n: 'Camora', p: 'FREE' }, { n: 'Final Round', p: '$100/mo' }, { n: 'LockedIn', p: '$55-120/mo' },
            { n: 'Solver', p: '$39/mo' }, { n: 'Sensei', p: '$24-89/mo' }, { n: 'TechPrep', p: '$39/mo' },
            { n: 'AlgoMaster', p: '$29/mo' }, { n: 'DesignGurus', p: '$98-197/yr' }, { n: 'AIApply', p: '$29-200/mo' },
            { n: 'OfferGoose', p: '$89-200/mo' }, { n: 'Parakeet', p: '$100-200/mo' },
          ];
          const cols = competitors.length + 1; // +1 for feature column
          const keys = ['camora','finalround','lockedin','solver','sensei','techprep','algomaster','designgurus','aiapply','offergoose','parakeet'];
          return (
            <div className="rounded-xl" style={{ border: '1px solid var(--border)', background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `minmax(200px, 2fr) repeat(${competitors.length}, 1fr)` }}>
                {/* Header row */}
                <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderBottom: '2px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Feature</div>
                {competitors.map((c, i) => (
                  <div key={c.n} style={{ padding: '8px 4px', textAlign: 'center', background: i === 0 ? 'var(--accent)' : 'var(--bg-surface)', borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: i === 0 ? '#fff' : 'var(--text-muted)' }}>{c.n}</div>
                    <div style={{ fontWeight: 600, fontSize: 10, color: i === 0 ? 'rgba(255,255,255,0.8)' : 'var(--text-dimmed)' }}>{c.p}</div>
                  </div>
                ))}
                {/* Data rows */}
                {COMPARISON.map((row, ri) => {
                  const isLast = ri === COMPARISON.length - 1;
                  const bg = ri % 2 === 0 ? 'var(--bg-surface)' : '#fff';
                  return [
                    <div key={`f-${ri}`} style={{ padding: '7px 12px', fontSize: 12, color: row.unique ? 'var(--accent)' : 'var(--text-primary)', fontWeight: row.unique ? 600 : 400, borderBottom: isLast ? 'none' : '1px solid var(--border)', background: bg, display: 'flex', alignItems: 'center' }}>{row.feature}</div>,
                    ...keys.map((k, ci) => {
                      const val = (row as any)[k];
                      const isCamora = ci === 0;
                      return (
                        <div key={`${ri}-${k}`} style={{ padding: '7px 2px', textAlign: 'center', borderBottom: isLast ? 'none' : '1px solid var(--border)', background: isCamora ? 'rgba(34,211,238,0.04)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {val === true ? (
                            isCamora
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)' }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L4.5 8.5L2 6" /></svg></span>
                              : <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="var(--text-dimmed)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L4.5 8.5L2 6" /></svg>
                          ) : val === false ? (
                            <span style={{ color: 'var(--text-dimmed)' }}>—</span>
                          ) : (
                            <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>{val}</span>
                          )}
                        </div>
                      );
                    }),
                  ];
                })}
              </div>
            </div>
          );
        })()}
      </section>


      {/* Desktop + Top-Ups are now inside SharedPricingCards */}

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="w-full lg:max-w-[85%] mx-auto">
          <div className="mb-10 text-center">
            <span className="section-label">FAQ</span>
            <h2 className="heading-2 mt-3">Common questions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.04]">
            {[
              { q: 'Is there really a free tier?', a: 'Yes. 3 live interview sessions, no credit card required. Browse all 300+ preparation topics for free.' },
              { q: 'Is it detectable during screen share?', a: 'Camora runs in a separate browser tab. Use Cmd+B to instantly blank the screen. Desktop app with stealth mode coming soon.' },
              { q: 'What platforms are supported?', a: 'Zoom, Google Meet, Microsoft Teams, HackerRank, CoderPad, Codility, and any browser-based interview platform.' },
              { q: 'Can it hear my interviewer?', a: 'Yes. Click "Interviewer" to capture system audio from your video call. It transcribes their questions in real-time.' },
              { q: 'What makes Camora different?', a: 'We are the only platform that combines job discovery, preparation, practice, and live interview AI in one tool. Competitors offer only 1-2 of these.' },
              { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Your access continues through the end of the billing period.' },
            ].map((faq, i) => (
              <div key={i} className="card">
                <h4 className="heading-3 mb-2">{faq.q}</h4>
                <p className="text-body">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <SiteFooter variant="light" />
    </div>
  );
}
