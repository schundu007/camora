import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Try Camora with no commitment',
    features: [
      '3 live interview sessions',
      'Browse all 300+ prep topics',
      'System design, coding, behavioral',
      'Voice transcription',
      'No credit card required',
    ],
    cta: 'Start Free',
    ctaHref: '/lumora',
    popular: false,
    priceId: null,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    description: 'For active interview preparation',
    features: [
      'Unlimited prep and practice',
      '10 live interview sessions/mo',
      'AI-powered explanations',
      'Mock interview simulator',
      'System design diagrams',
      'Code solutions with complexity',
      'All programming languages',
    ],
    cta: 'Get Starter',
    ctaHref: '/lumora',
    popular: false,
    priceId: 'price_1THhzGITUCNxtMxll78umJSX',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'The full interview pipeline',
    features: [
      'Everything in Starter',
      'Unlimited live sessions',
      'Job discovery and matching',
      'Auto resume and cover letter',
      'Auto job apply',
      'Company-specific prep material',
      'Speaker voice filtering',
      'Priority AI responses',
      'Desktop app included',
    ],
    cta: 'Get Pro',
    ctaHref: '/lumora',
    popular: true,
    priceId: 'price_1THhzhITUCNxtMxl1QSxi4Kj',
  },
  {
    name: 'Annual',
    price: '$19',
    period: '/mo',
    description: 'Best value — billed $228/year',
    features: [
      'Everything in Pro',
      'Save 61% vs monthly',
      'Locked-in pricing',
      'Priority support',
      'Desktop app add-on: +$29/mo',
    ],
    cta: 'Get Annual',
    ctaHref: '/lumora',
    popular: false,
    priceId: 'price_1THiBUITUCNxtMxlAHUvPut7',
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
];

export default function PricingPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState('');

  useEffect(() => {
    document.title = 'Pricing | Camora';
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
        <span className="section-label">Pricing</span>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          The APPA platform. All-in-one.
        </h1>
      </section>

      {/* Competitor comparison */}
      <section className="px-6 pt-4 pb-16">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Why Camora Wins</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              See how we compare.
            </h2>
          </div>

          <div
            className="overflow-x-auto"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              padding: '12px 16px',
              border: '1px solid var(--border)',
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', verticalAlign: 'bottom' }}>
                  <th className="text-left py-3 px-4 font-mono text-[10px] uppercase tracking-wider min-w-[120px] sm:min-w-[200px]" style={{ color: 'var(--text-secondary)' }}>Feature</th>
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
                      className={`py-3 px-2 text-center whitespace-nowrap ${col.hide ? `hidden ${col.hide}:table-cell` : ''}`}
                      style={col.highlight ? { background: 'rgba(99,102,241,0.1)', borderRadius: '14px 14px 0 0', boxShadow: 'inset 0 -2px 0 #6366f1' } : {}}
                    >
                      <div className="text-[11px] font-medium" style={col.highlight ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '13px', fontWeight: 800 } : { color: 'var(--text-secondary)' }}>
                        {col.name}
                      </div>
                      <div className="text-sm font-extrabold mt-0.5" style={col.highlight ? { color: '#6366f1' } : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {col.price}<span className="text-[9px] font-normal" style={{ color: 'var(--text-muted)' }}>{col.unit}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => {
                  const Cell = ({ val }: { val: boolean | string }) => {
                    if (val === true) return <span style={{ color: 'var(--text-muted)' }}>&#10003;</span>;
                    if (val === false) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
                    return <span className="text-[10px] text-amber-400 font-mono">{val}</span>;
                  };
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className={`py-3 px-4 text-sm ${row.unique ? 'text-indigo-400 font-semibold' : ''}`} style={!row.unique ? { color: 'var(--text-secondary)' } : {}}>
                        {row.feature}
                      </td>
                      <td className="py-3 px-3 text-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                        {row.camora === true
                          ? <span className="text-indigo-500 font-bold text-base">&#10003;</span>
                          : <Cell val={row.camora} />
                        }
                      </td>
                      <td className="py-2.5 px-3 text-center"><Cell val={row.finalround} /></td>
                      <td className="py-2.5 px-3 text-center"><Cell val={row.lockedin} /></td>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell"><Cell val={row.solver} /></td>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell"><Cell val={row.sensei} /></td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell"><Cell val={row.techprep} /></td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell"><Cell val={row.algomaster} /></td>
                      <td className="py-2.5 px-3 text-center hidden lg:table-cell"><Cell val={row.designgurus} /></td>
                      <td className="py-2.5 px-3 text-center hidden xl:table-cell"><Cell val={row.aiapply} /></td>
                      <td className="py-2.5 px-3 text-center hidden xl:table-cell"><Cell val={row.offergoose} /></td>
                      <td className="py-2.5 px-3 text-center hidden xl:table-cell"><Cell val={row.parakeet} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full lg:max-w-[70%] mx-auto px-6">
        <div className="h-px bg-indigo-100/30" />
      </div>

      {/* Plans */}
      <section className="w-full lg:max-w-[70%] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          {PLANS.map((plan) => {
            const isPro = plan.popular;
            const isAnnual = plan.name === 'Annual';
            const isFree = plan.name === 'Free';
            const isStarter = plan.name === 'Starter';

            // Per-card accent colors
            const accent = isPro
              ? { from: '#6366f1', to: '#a78bfa', glow: 'rgba(99,102,241,0.35)' }
              : isAnnual
              ? { from: '#f59e0b', to: '#fbbf24', glow: 'rgba(245,158,11,0.25)' }
              : isStarter
              ? { from: '#6366f1', to: '#818cf8', glow: 'rgba(99,102,241,0.12)' }
              : { from: '#64748b', to: '#94a3b8', glow: 'rgba(100,116,139,0.08)' };

            return (
              <div
                key={plan.name}
                className="pricing-card group relative flex flex-col rounded-[20px] overflow-hidden transition-all duration-500"
                style={{
                  background: isPro
                    ? 'linear-gradient(168deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 40%, rgba(15,14,25,0.95) 100%)'
                    : isAnnual
                    ? 'linear-gradient(168deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.04) 40%, rgba(15,14,25,0.95) 100%)'
                    : 'linear-gradient(168deg, rgba(255,255,255,0.04) 0%, rgba(15,14,25,0.95) 100%)',
                  border: `1px solid ${isPro ? 'rgba(99,102,241,0.4)' : isAnnual ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isPro
                    ? `0 0 0 1px rgba(99,102,241,0.15), 0 24px 80px ${accent.glow}, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`
                    : isAnnual
                    ? `0 0 0 1px rgba(245,158,11,0.12), 0 16px 48px ${accent.glow}, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`
                    : `0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)`,
                  transform: isPro ? 'scale(1.03)' : undefined,
                  zIndex: isPro ? 2 : 1,
                }}
              >
                {/* Decorative top gradient bar */}
                <div
                  className="h-[3px] w-full"
                  style={{
                    background: (isPro || isAnnual || isStarter)
                      ? `linear-gradient(90deg, ${accent.from}, ${accent.to}, ${accent.from})`
                      : 'transparent',
                    opacity: isFree ? 0 : 1,
                  }}
                />

                {/* Inner glow orb (Pro only) */}
                {isPro && (
                  <div
                    className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                      filter: 'blur(30px)',
                    }}
                  />
                )}

                <div className="relative p-6 pb-0 flex flex-col flex-1">
                  {/* Header: name + badge */}
                  <div className="flex items-center justify-between mb-5">
                    <h3
                      className="text-[13px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: isPro ? '#a5b4fc' : isAnnual ? '#fcd34d' : 'var(--text-secondary)' }}
                    >
                      {plan.name}
                    </h3>
                    {isPro && (
                      <span
                        className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                        }}
                      >
                        Most Popular
                      </span>
                    )}
                    {isAnnual && (
                      <span
                        className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em]"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#451a03',
                          boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                        }}
                      >
                        Best Value
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-[42px] font-extrabold leading-none tracking-tight"
                      style={
                        isPro
                          ? { background: 'linear-gradient(135deg, #c7d2fe, #e0e7ff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
                          : isAnnual
                          ? { background: 'linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
                          : { color: 'var(--text-primary)' }
                      }
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {plan.description}
                  </p>

                  {/* Separator */}
                  <div
                    className="my-5 h-px"
                    style={{
                      background: isPro
                        ? 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)'
                        : isAnnual
                        ? 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                    }}
                  />

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        <svg
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          viewBox="0 0 16 16"
                          fill="none"
                          style={{ color: isPro ? '#818cf8' : isAnnual ? '#fbbf24' : '#4ade80' }}
                        >
                          <path
                            d="M13.5 4.5L6.5 11.5L2.5 7.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={loading === plan.name}
                    className="w-full py-3.5 text-sm font-bold rounded-xl cursor-pointer transition-all duration-300 disabled:opacity-50"
                    style={
                      isPro
                        ? {
                            background: 'linear-gradient(135deg, #6366f1, #7c3aed, #8b5cf6)',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                          }
                        : isAnnual
                        ? {
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
                            color: '#451a03',
                            boxShadow: '0 4px 20px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }
                        : isStarter
                        ? {
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99,102,241,0.3)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (isFree) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        e.currentTarget.style.color = '#fff';
                      } else if (isStarter) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isFree) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      } else if (isStarter) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                      }
                    }}
                  >
                    {loading === plan.name ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing card hover styles */}
        <style>{`
          .pricing-card {
            transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .pricing-card:hover {
            transform: translateY(-6px) scale(1.01);
          }
          .pricing-card:hover:nth-child(3) {
            transform: translateY(-6px) scale(1.04);
          }
        `}</style>
      </section>

      {/* Top-Up Packs */}
      <section className="px-6 py-16">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="mb-10 text-center">
            <span className="section-label">Need More Credits?</span>
            <h2 className="heading-2 mt-3">Top-Up Packs</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: '20 AI Questions', price: '$5', desc: 'Includes 3 bonus diagrams', packId: 'questions_20' },
              { name: '50 AI Questions', price: '$10', desc: 'Includes 8 bonus diagrams', packId: 'questions_50' },
              { name: '5 Live Sessions', price: '$15', desc: '90 minutes per session', packId: 'sessions_5' },
            ].map((pack) => (
              <div key={pack.packId} className="rounded-2xl p-4 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pack.name}</h3>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-indigo-400">{pack.price}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>one-time</span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{pack.desc}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!token) { navigate('/login'); return; }
                    try {
                      const resp = await fetch(`${API_URL}/api/v1/usage/topup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                          pack_id: pack.packId,
                          success_url: `${window.location.origin}/pricing?topup=success`,
                          cancel_url: `${window.location.origin}/pricing`,
                        }),
                      });
                      const data = await resp.json();
                      if (data.url) window.location.href = data.url;
                    } catch { /* ignore */ }
                  }}
                  className="shrink-0 px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors" style={{ background: 'var(--accent)' }}
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop App Download */}
      <section className="px-6 py-10">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', color: '#818cf8' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Desktop App</h3>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Stealth mode, screen-share safe. Available for macOS and Windows.</p>
              </div>
            </div>
            <a
              href="https://github.com/schundu007/camora/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full lg:max-w-[70%] mx-auto px-6">
        <div className="h-px bg-indigo-100/30" />
      </div>


      {/* CTA buttons */}
      <section className="px-6 py-10 text-center">
        <div className="flex items-center justify-center gap-4">
          <Link to="/lumora" className="btn-primary">
            Start Free
          </Link>
          <Link to="/capra/prepare" className="btn-secondary">
            Browse Topics
          </Link>
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
