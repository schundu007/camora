import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const PLANS = [
  {
    name: 'Day Pass',
    price: '$0',
    period: '',
    description: 'Board with no ticket — explore the cockpit',
    features: [
      '3 live interview sessions',
      'Browse all 300+ prep topics',
      'System design, coding, behavioral',
      'Voice transcription',
      'No credit card required',
    ],
    cta: 'Get Day Pass',
    ctaHref: '/lumora',
    popular: false,
    priceId: null,
  },
  {
    name: 'Economy',
    price: '$29',
    period: '/mo',
    description: 'Your boarding pass to interview prep',
    features: [
      'Unlimited prep and practice',
      '10 live interview sessions/mo',
      'AI-powered explanations',
      'Mock interview simulator',
      'System design diagrams',
      'Code solutions with complexity',
      'All programming languages',
    ],
    cta: 'Board Economy',
    ctaHref: '/lumora',
    popular: false,
    priceId: '__MONTHLY__',
  },
  {
    name: 'Frequent Flier',
    price: '$49',
    period: '/mo',
    description: 'Full cockpit access — unlimited everything',
    features: [
      'Everything in Economy',
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
    name: 'Club Member',
    price: '$19',
    period: '/mo',
    description: 'Annual pass — billed $228/year',
    features: [
      'Everything in Frequent Flier',
      'Save 61% vs monthly',
      'Locked-in pricing',
      'Priority support',
      'Desktop app add-on: +$29/mo',
    ],
    cta: 'Join Club',
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
    fetch(`${API_URL}/api/v1/billing/prices`).then(r => r.json()).then(setBackendPrices).catch(() => {});
  }, []);

  const plans = PLANS.map(p => ({
    ...p,
    priceId: p.priceId === '__MONTHLY__' ? (backendPrices?.monthly?.priceId || '')
      : p.priceId === '__QUARTERLY_PRO__' ? (backendPrices?.quarterly_pro?.priceId || '')
      : p.priceId === '__ANNUAL__' ? (backendPrices?.annual?.priceId || '')
      : p.priceId,
  }));

  useEffect(() => {
    document.title = 'Tickets | Camora';
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
        alert(err.error || 'Checkout unavailable. Please try again.');
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
    <div className="min-h-screen" style={{ color: 'var(--text-primary)' }}>

      <SEO title="Pricing" description="Interview prep plans starting free. Monthly, Quarterly Pro, and Desktop Lifetime options." path="/pricing" />
      <SiteNav />

      {/* Header */}
      <section className="pt-20 pb-0 px-6 text-center">
        <span className="section-label">Tickets</span>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Choose your boarding class.
        </h1>
      </section>

      {/* Plans */}
      <section className="w-full lg:max-w-[70%] mx-auto px-6 py-14">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF, #2D8CFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Plans</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Choose your path.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4 items-stretch">
          {plans.map((plan) => {
            const isPro = plan.popular;
            const isAnnual = plan.name === 'Annual';
            const isFree = plan.name === 'Free';
            const isStarter = plan.name === 'Starter';

            const accent = isPro
              ? { from: '#2D8CFF', via: '#2D8CFF', to: '#2D8CFF', glow: 'rgba(45,140,255,0.4)', checkColor: '#60A5FA' }
              : isAnnual
              ? { from: '#f59e0b', via: '#fbbf24', to: '#fde68a', glow: 'rgba(245,158,11,0.3)', checkColor: '#fbbf24' }
              : isStarter
              ? { from: '#2D8CFF', via: '#2D8CFF', to: '#60A5FA', glow: 'rgba(45,140,255,0.15)', checkColor: '#2D8CFF' }
              : { from: '#475569', via: '#64748b', to: '#94a3b8', glow: 'rgba(100,116,139,0.1)', checkColor: '#4ade80' };

            return (
              <div key={plan.name} className={`pricing-card group relative flex flex-col rounded-[22px] overflow-visible ${isPro ? 'lg:-mt-4 lg:mb-[-16px]' : ''}`} style={{ zIndex: isPro ? 2 : 1 }}>
                <div className="absolute -inset-[1px] rounded-[22px] pointer-events-none" style={{ background: isPro ? `linear-gradient(135deg, ${accent.from}, ${accent.via}, ${accent.to}, ${accent.from})` : isAnnual ? `linear-gradient(135deg, ${accent.from}, ${accent.via}, ${accent.to}, ${accent.from})` : isStarter ? 'linear-gradient(135deg, rgba(45,140,255,0.3), rgba(139,92,246,0.15), rgba(45,140,255,0.3))' : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04), rgba(255,255,255,0.08))', backgroundSize: isPro || isAnnual ? '300% 300%' : '100% 100%', animation: isPro || isAnnual ? 'borderShimmer 4s ease infinite' : 'none', opacity: isPro ? 0.8 : isAnnual ? 0.7 : 1 }} />
                <div className="relative flex flex-col flex-1 rounded-[21px] overflow-hidden" style={{ background: isPro ? 'linear-gradient(168deg, rgba(30,27,60,0.98) 0%, rgba(15,14,28,0.99) 100%)' : isAnnual ? 'linear-gradient(168deg, rgba(40,30,15,0.95) 0%, rgba(15,14,22,0.99) 100%)' : isStarter ? 'linear-gradient(168deg, rgba(22,20,40,0.98) 0%, rgba(13,12,22,0.99) 100%)' : 'linear-gradient(168deg, rgba(20,19,30,0.98) 0%, rgba(12,11,20,0.99) 100%)', backdropFilter: 'blur(20px)' }}>
                  {isPro && (<><div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,140,255,0.18) 0%, transparent 60%)', filter: 'blur(40px)' }} /><div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)', filter: 'blur(30px)' }} /></>)}
                  {isAnnual && (<div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 60%)', filter: 'blur(35px)' }} />)}

                  <div className="relative p-7 pb-0 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: isPro ? '#93C5FD' : isAnnual ? '#fde68a' : isStarter ? '#60A5FA' : 'rgba(255,255,255,0.5)' }}>{plan.name}</h3>
                      {isPro && <span className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF)', color: '#fff', boxShadow: '0 2px 12px rgba(45,140,255,0.5), 0 0 20px rgba(45,140,255,0.2)' }}>Most Popular</span>}
                      {isAnnual && <span className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#451a03', boxShadow: '0 2px 12px rgba(245,158,11,0.45), 0 0 20px rgba(245,158,11,0.15)' }}>Best Value</span>}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-extrabold leading-none tracking-tight" style={{ fontSize: isPro ? '52px' : '46px', ...(isPro ? { background: 'linear-gradient(145deg, #BFDBFE, #93C5FD, #60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(45,140,255,0.3))' } : isAnnual ? { background: 'linear-gradient(145deg, #fef3c7, #fde68a, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.25))' } : isStarter ? { background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: 'rgba(255,255,255,0.85)' }) }}>{plan.price}</span>
                      {plan.period && <span className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>{plan.period}</span>}
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{plan.description}</p>
                    <div className="my-6 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${isPro ? 'rgba(45,140,255,0.35)' : isAnnual ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'} 50%, transparent 100%)` }} />
                    <ul className="space-y-3.5 flex-1 mb-7">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-[13px] leading-snug">
                          <span className="w-[18px] h-[18px] mt-[1px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${accent.checkColor}15`, border: `1px solid ${accent.checkColor}30` }}>
                            <svg className="w-[10px] h-[10px]" viewBox="0 0 12 12" fill="none" style={{ color: accent.checkColor }}><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.65)' }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-7 pt-0">
                    <button onClick={() => handleCheckout(plan)} disabled={loading === plan.name} className="pricing-cta w-full py-4 text-sm font-bold rounded-[14px] cursor-pointer transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2" style={isPro ? { background: 'linear-gradient(135deg, #2D8CFF, #7c3aed, #2D8CFF)', color: '#fff', boxShadow: '0 6px 24px rgba(45,140,255,0.45), 0 0 40px rgba(45,140,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)' } : isAnnual ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)', color: '#451a03', boxShadow: '0 6px 24px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.1), inset 0 1px 0 rgba(255,255,255,0.25)' } : isStarter ? { background: 'linear-gradient(135deg, rgba(45,140,255,0.18), rgba(139,92,246,0.12))', color: '#93C5FD', border: '1px solid rgba(45,140,255,0.35)', boxShadow: '0 2px 12px rgba(45,140,255,0.1)' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {loading === plan.name ? (<span className="flex items-center justify-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing...</span>) : (<>{plan.cta}<svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></>)}
                    </button>
                  </div>
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

      {/* Competitor comparison */}
      <section className="px-6 pt-4 pb-16">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF, #2D8CFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Why Camora Wins</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            </h2>
          </div>

          <div
            className="relative overflow-hidden rounded-[22px]"
            style={{
              background: 'linear-gradient(168deg, #1a1730 0%, #0e0d18 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,140,255,0.15)',
            }}
          >
            {/* Vivid gradient border */}
            <div className="absolute -inset-[1px] rounded-[22px] pointer-events-none" style={{ background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF, #2D8CFF, #2D8CFF)', backgroundSize: '300% 300%', animation: 'borderShimmer 4s ease infinite', opacity: 0.4 }} />

            <div className="relative rounded-[21px] overflow-x-auto" style={{ background: 'linear-gradient(168deg, #1a1730 0%, #0e0d18 100%)' }}>
              {/* Top accent bar */}
              <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #10b981, #2D8CFF, #2D8CFF, #ec4899, #2D8CFF, #10b981)' }} />

              {/* Ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(45,140,255,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />

              <div className="p-5 sm:p-8">
                <table className="w-full text-[13px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ verticalAlign: 'bottom' }}>
                      <th className="text-left py-5 px-4 text-[11px] font-extrabold uppercase tracking-[0.18em] min-w-[120px] sm:min-w-[200px]" style={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Feature</th>
                      {[
                        { name: 'Camora', price: 'FREE', unit: '', highlight: true },
                        { name: 'Final Round', price: '$100', unit: '/mo' },
                        { name: 'LockedIn', price: '$55-120', unit: '/mo' },
                        { name: 'Solver', price: '$39', unit: '/mo', hide: 'md' },
                        { name: 'Sensei', price: '$24-89', unit: '/mo', hide: 'md' },
                        { name: 'TechPrep', price: '$39', unit: '/mo', hide: 'lg' },
                        { name: 'AlgoMaster', price: '$29', unit: '/mo', hide: 'lg' },
                        { name: 'DesignGurus', price: '$98-197', unit: '/course', hide: 'lg' },
                        { name: 'AIApply', price: '$29-200', unit: '/mo', hide: 'xl' },
                        { name: 'OfferGoose', price: '$89-200', unit: '/mo', hide: 'xl' },
                        { name: 'Parakeet', price: '$100-200', unit: '/mo', hide: 'xl' },
                      ].map((col) => (
                        <th
                          key={col.name}
                          className={`py-5 px-2 text-center whitespace-nowrap ${col.hide ? `hidden ${col.hide}:table-cell` : ''}`}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            ...(col.highlight ? {
                              background: 'linear-gradient(180deg, rgba(45,140,255,0.22) 0%, rgba(45,140,255,0.08) 100%)',
                              borderRadius: '16px 16px 0 0',
                              boxShadow: 'inset 0 3px 0 #2D8CFF, inset 1px 0 0 rgba(45,140,255,0.3), inset -1px 0 0 rgba(45,140,255,0.3)',
                              position: 'relative' as const,
                            } : {}),
                          }}
                        >
                          <div
                            className="font-extrabold"
                            style={col.highlight
                              ? { background: 'linear-gradient(135deg, #BFDBFE, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '15px', letterSpacing: '0.02em' }
                              : { color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }
                            }
                          >
                            {col.name}
                          </div>
                          <div
                            className="mt-1.5 font-black"
                            style={col.highlight
                              ? { background: 'linear-gradient(135deg, #60A5FA, #2D8CFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '20px', filter: 'drop-shadow(0 0 12px rgba(45,140,255,0.5))' }
                              : { color: 'rgba(255,255,255,0.25)', fontSize: '13px' }
                            }
                          >
                            {col.price}
                            <span className="text-[9px] font-medium" style={{ color: col.highlight ? undefined : 'rgba(255,255,255,0.2)' }}>{col.unit}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => {
                      const isLast = i === COMPARISON.length - 1;
                      const isEven = i % 2 === 0;
                      const CellIcon = ({ val }: { val: boolean | string }) => {
                        if (val === true) return (
                          <svg className="w-4 h-4 mx-auto" viewBox="0 0 12 12" fill="none" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        );
                        if (val === false) return <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '16px', lineHeight: 1 }}>—</span>;
                        return <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>{val}</span>;
                      };
                      return (
                        <tr
                          key={i}
                          className="comparison-row transition-all duration-150"
                          style={{ background: isEven ? 'rgba(255,255,255,0.025)' : 'transparent' }}
                        >
                          <td className="py-4 px-4 text-[13px]" style={{ color: row.unique ? '#93C5FD' : 'rgba(255,255,255,0.75)', fontWeight: row.unique ? 700 : 500, borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="flex items-center gap-2.5">
                              {row.unique && (
                                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,140,255,0.3), rgba(139,92,246,0.25))', boxShadow: '0 0 8px rgba(45,140,255,0.3)' }}>
                                  <svg className="w-[10px] h-[10px]" viewBox="0 0 12 12" fill="none">
                                    <path d="M6 1l1.545 3.13L11 4.635 8.5 7.07l.59 3.44L6 8.885 2.91 10.51l.59-3.44L1 4.635l3.455-.505L6 1z" fill="#60A5FA" />
                                  </svg>
                                </span>
                              )}
                              {row.feature}
                            </span>
                          </td>
                          {/* Camora column — vivid */}
                          <td
                            className="py-4 px-3 text-center"
                            style={{
                              background: isEven ? 'rgba(45,140,255,0.12)' : 'rgba(45,140,255,0.07)',
                              boxShadow: 'inset 1px 0 0 rgba(45,140,255,0.2), inset -1px 0 0 rgba(45,140,255,0.2)',
                              borderBottom: isLast ? 'none' : '1px solid rgba(45,140,255,0.1)',
                              ...(isLast ? { borderRadius: '0 0 16px 16px', boxShadow: 'inset 1px 0 0 rgba(45,140,255,0.2), inset -1px 0 0 rgba(45,140,255,0.2), inset 0 -3px 0 #2D8CFF' } : {}),
                            }}
                          >
                            {row.camora === true
                              ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF)', boxShadow: '0 0 16px rgba(45,140,255,0.5), 0 4px 12px rgba(45,140,255,0.3)' }}>
                                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none" style={{ color: '#fff' }}>
                                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              )
                              : <CellIcon val={row.camora} />
                            }
                          </td>
                          {/* Competitor columns */}
                          {[row.finalround, row.lockedin].map((val, j) => (
                            <td key={j} className="py-3.5 px-3 text-center" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={val} /></td>
                          ))}
                          <td className="py-3.5 px-3 text-center hidden md:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.solver} /></td>
                          <td className="py-3.5 px-3 text-center hidden md:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.sensei} /></td>
                          <td className="py-3.5 px-3 text-center hidden lg:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.techprep} /></td>
                          <td className="py-3.5 px-3 text-center hidden lg:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.algomaster} /></td>
                          <td className="py-3.5 px-3 text-center hidden lg:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.designgurus} /></td>
                          <td className="py-3.5 px-3 text-center hidden xl:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.aiapply} /></td>
                          <td className="py-3.5 px-3 text-center hidden xl:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.offergoose} /></td>
                          <td className="py-3.5 px-3 text-center hidden xl:table-cell" style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}><CellIcon val={row.parakeet} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <style>{`
              .comparison-row:hover {
                background: rgba(45,140,255,0.08) !important;
              }
              .comparison-row:hover td:first-child {
                color: #fff !important;
              }
            `}</style>
          </div>
        </div>
      </section>


      {/* Desktop App + Top-Up Packs — compact row */}
      <section className="px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Desktop App */}
          <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,140,255,0.15), rgba(139,92,246,0.15))', color: '#2D8CFF' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Desktop App</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stealth mode, screen-share safe</p>
              </div>
            </div>
            <a href="https://github.com/schundu007/camora/releases/latest" target="_blank" rel="noopener noreferrer" className="shrink-0 px-4 py-1.5 text-white text-[11px] font-semibold rounded-lg" style={{ background: 'linear-gradient(135deg, #2D8CFF, #2D8CFF)' }}>
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
                  <span className="text-base font-bold text-emerald-400 mt-0.5">{pack.price}</span>
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
        <div className="w-full lg:max-w-[70%] mx-auto">
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
