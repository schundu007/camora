import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const PLANS = [
  {
    name: 'Snowballs',
    price: '$0',
    period: '',
    description: 'Play around a bit',
    features: [
      '3 live interview sessions',
      'Browse all 300+ prep topics',
      'System design, coding, behavioral',
      'Voice transcription',
      'No credit card required',
    ],
    cta: 'Try Snowballs',
    ctaHref: '/lumora',
    popular: false,
    priceId: null,
  },
  {
    name: 'Frost',
    price: '$29',
    period: '/mo',
    description: 'Start the real deal',
    features: [
      'Unlimited prep and practice',
      '10 live interview sessions/mo',
      'AI-powered explanations',
      'Mock interview simulator',
      'System design diagrams',
      'Code solutions with complexity',
      'All programming languages',
    ],
    cta: 'Get Frost',
    ctaHref: '/lumora',
    popular: false,
    priceId: '__MONTHLY__',
  },
  {
    name: 'Winter Lover',
    price: '$49',
    period: '/mo',
    description: 'Make your interviewers freeze',
    features: [
      'Everything in Frost',
      'Unlimited live sessions',
      'Job discovery and matching',
      'Auto resume and cover letter',
      'Auto job apply',
      'Company-specific prep material',
      'Speaker voice filtering',
      'Priority AI responses',
      'Desktop app included',
      'Mobile app (iOS & Android)',
    ],
    cta: 'Upgrade',
    ctaHref: '/lumora',
    popular: true,
    priceId: '__QUARTERLY_PRO__',
  },
  {
    name: 'Avalanche Maker',
    price: '$19',
    period: '/mo',
    description: 'It\'s your sandbox',
    features: [
      'Everything in Winter Lover',
      'Save 61% vs monthly',
      'Locked-in pricing',
      'Priority support',
      'Desktop app add-on: +$29/mo',
    ],
    cta: 'Go Avalanche',
    ctaHref: '/lumora',
    popular: false,
    priceId: '__ANNUAL__',
  },
];

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
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState('');

  const [backendPrices, setBackendPrices] = useState<any>(null);
  useEffect(() => {
    fetch(`${API_URL}/api/v1/billing/prices`).then(r => r.json()).then(setBackendPrices).catch(err => console.error('Failed to load plans:', err));
  }, []);

  const plans = PLANS.map(p => ({
    ...p,
    priceId: p.priceId === '__MONTHLY__' ? (backendPrices?.monthly?.priceId || '')
      : p.priceId === '__QUARTERLY_PRO__' ? (backendPrices?.quarterly_pro?.priceId || '')
      : p.priceId === '__ANNUAL__' ? (backendPrices?.annual?.priceId || '')
      : p.priceId,
  }));

  useEffect(() => {
    document.title = 'Snow Passes | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const handleCheckout = async (plan: typeof PLANS[number]) => {
    // Free plan — go straight to the app
    if (!plan.priceId) { navigate('/lumora'); return; }
    // Not logged in — send to login first
    if (!token) { navigate('/login'); return; }
    setLoading(plan.name);
    try {
      const resp = await fetch(`${API_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          price_id: plan.priceId,
          success_url: `${window.location.origin}/lumora?checkout=success`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Checkout error:', err);
        // If billing not configured, redirect to app for now
        if (resp.status === 503 || resp.status === 400) {
          navigate('/lumora');
          return;
        }
        console.error('Checkout failed:', err.error || 'Unknown error');
        setLoading('');
        return;
      }
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
      else { navigate('/lumora'); }
    } catch {
      // Fallback: if checkout fails, still let user access the app
      navigate('/lumora');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <SEO title="Pricing" description="Interview prep plans starting free. Monthly, Quarterly Pro, and Desktop Lifetime options." path="/pricing" />
      <SiteNav />

      {/* Header */}
      <section className="pt-24 pb-4 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Snow Passes</span>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Choose your Snow Strength.
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>Start free. Upgrade when you're ready.</p>
      </section>

      {/* Plans */}
      <section className="w-full lg:max-w-[85%] mx-auto px-6 py-14">
        {/* Plans header removed — already in page header above */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4 items-stretch">
          {plans.map((plan) => {
            const isPro = plan.popular;
            const isAnnual = plan.name === 'Avalanche Maker';
            const isFree = plan.name === 'Snowballs';
            const isStarter = plan.name === 'Frost';

            const accent = isPro
              ? { from: 'var(--accent)', via: 'var(--accent)', to: 'var(--accent)', glow: 'rgba(45,140,255,0.4)', checkColor: '#60A5FA' }
              : isAnnual
              ? { from: 'var(--warning)', via: '#fbbf24', to: '#fde68a', glow: 'rgba(245,158,11,0.3)', checkColor: '#fbbf24' }
              : isStarter
              ? { from: 'var(--accent)', via: 'var(--accent)', to: '#60A5FA', glow: 'rgba(45,140,255,0.15)', checkColor: 'var(--accent)' }
              : { from: '#475569', via: '#64748b', to: '#94a3b8', glow: 'rgba(100,116,139,0.1)', checkColor: '#4ade80' };

            return (
              <div key={plan.name} className="pricing-card group relative flex flex-col rounded-2xl overflow-hidden h-full"
                style={{
                  zIndex: (isPro || isAnnual) ? 2 : 1,
                  background: '#FFFFFF',
                  border: (isPro || isAnnual) ? '2px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: (isPro || isAnnual) ? '0 8px 32px rgba(34,211,238,0.2)' : 'var(--shadow-md)',
                  transform: (isPro || isAnnual) ? 'scale(1.03)' : 'none',
                }}>
                <div className="relative p-7 pb-0 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: (isPro || isAnnual) ? 'var(--accent)' : 'var(--text-muted)' }}>{plan.name}</h3>
                    {isPro && <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.12em] shadow-sm" style={{ background: 'linear-gradient(135deg, var(--accent), #0891b2)', color: '#fff' }}>Most Popular</span>}
                    {isAnnual && <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.12em] shadow-sm" style={{ background: 'linear-gradient(135deg, var(--accent), #0891b2)', color: '#fff' }}>Best Value</span>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-extrabold leading-none tracking-tight" style={{ fontSize: '44px', color: 'var(--text-primary)' }}>{plan.price}</span>
                    {plan.period && <span className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>
                  <div className="my-5 h-px" style={{ background: 'var(--border)' }} />
                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4L6 11L3 8" /></svg>
                        <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-7 pt-0">
                  <button onClick={() => handleCheckout(plan)} disabled={loading === plan.name}
                    className="pricing-cta w-full py-3.5 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={isPro
                      ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(45,140,255,0.3)' }
                      : { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                    }>
                    {loading === plan.name ? (
                      <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing...</span>
                    ) : (
                      <>{plan.cta} <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <style>{`
          @keyframes borderShimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          .pricing-card { transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.5s ease; }
          .pricing-card:hover { transform: translateY(-8px); }
          .pricing-card:hover .pricing-cta { filter: brightness(1.1); }
        `}</style>
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
                        <div key={`${ri}-${k}`} style={{ padding: '7px 2px', textAlign: 'center', borderBottom: isLast ? 'none' : '1px solid var(--border)', background: isCamora ? 'rgba(45,140,255,0.04)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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


      {/* Desktop App + Top-Up Packs — compact row */}
      <section className="px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Desktop App */}
          <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,140,255,0.15), rgba(139,92,246,0.15))', color: 'var(--accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Desktop App</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stealth mode, screen-share safe</p>
              </div>
            </div>
            <a href="https://github.com/schundu007/camora/releases/latest" target="_blank" rel="noopener noreferrer" className="shrink-0 px-4 py-1.5 text-white text-[11px] font-semibold rounded-lg" style={{ background: 'var(--accent)' }}>
              Download
            </a>
          </div>

          {/* Top-Up Packs */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-center mb-3" style={{ color: 'var(--text-muted)' }}>Top-Up Packs</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: '20 AI Questions', price: '$5', desc: '+ 3 diagrams', packId: 'questions_20' },
                { name: '50 AI Questions', price: '$10', desc: '+ 8 diagrams', packId: 'questions_50' },
                { name: '5 Live Sessions', price: '$15', desc: '90 min each', packId: 'sessions_5' },
              ].map((pack) => (
                <div key={pack.packId} className="rounded-xl p-3 flex flex-col items-center text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pack.name}</span>
                  <span className="text-base font-bold text-[var(--accent)] mt-0.5">{pack.price}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pack.desc}</span>
                  <button
                    onClick={async () => {
                      if (!token) { navigate('/login'); return; }
                      try {
                        const resp = await fetch(`${API_URL}/api/v1/usage/topup`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ pack_id: pack.packId, success_url: `${window.location.origin}/pricing?topup=success`, cancel_url: `${window.location.origin}/pricing` }),
                        });
                        const data = await resp.json();
                        if (data.url) window.location.href = data.url;
                      } catch { /* ignore */ }
                    }}
                    className="mt-2 px-3 py-1 text-white text-[10px] font-semibold rounded-md cursor-pointer" style={{ background: 'var(--accent)' }}
                  >
                    Buy
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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


      <SiteFooter />
    </div>
  );
}
