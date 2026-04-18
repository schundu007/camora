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
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <SEO title="Pricing" description="Interview prep plans starting free. Monthly, Quarterly Pro, and Desktop Lifetime options." path="/pricing" />
      <SiteNav />

      {/* Header */}
      <section className="pt-24 pb-4 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Tickets</span>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Choose your boarding class.
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>Start free. Upgrade when you're ready.</p>
      </section>

      {/* Plans */}
      <section className="w-full lg:max-w-[70%] mx-auto px-6 py-14">
        {/* Plans header removed — already in page header above */}

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
              <div key={plan.name} className={`pricing-card group relative flex flex-col rounded-2xl overflow-hidden ${isPro ? 'lg:-mt-4 lg:mb-[-16px]' : ''}`}
                style={{
                  zIndex: isPro ? 2 : 1,
                  background: '#FFFFFF',
                  border: isPro ? '2px solid #2D8CFF' : '1px solid var(--border)',
                  boxShadow: isPro ? '0 8px 32px rgba(45,140,255,0.15)' : 'var(--shadow-md)',
                }}>
                <div className="relative p-7 pb-0 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: isPro ? '#2D8CFF' : 'var(--text-muted)' }}>{plan.name}</h3>
                    {isPro && <span className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ background: '#2D8CFF', color: '#fff' }}>Most Popular</span>}
                    {isAnnual && <span className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ background: '#F59E0B', color: '#fff' }}>Best Value</span>}
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
                        <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="#2D8CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4L6 11L3 8" /></svg>
                        <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-7 pt-0">
                  <button onClick={() => handleCheckout(plan)} disabled={loading === plan.name}
                    className="pricing-cta w-full py-3.5 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={isPro
                      ? { background: '#2D8CFF', color: '#fff', boxShadow: '0 4px 12px rgba(45,140,255,0.3)' }
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

      {/* Competitor comparison */}
      <section className="px-6 pt-4 pb-16">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Why Camora Wins</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Compare the competition.
            </h2>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)' }}>
                      <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', minWidth: '180px' }}>Feature</th>
                      {[
                        { name: 'Camora', price: 'FREE', unit: '', highlight: true },
                        { name: 'Final Round', price: '$100', unit: '/mo' },
                        { name: 'LockedIn', price: '$55-120', unit: '/mo' },
                        { name: 'Solver', price: '$39', unit: '/mo', hide: 'md' },
                        { name: 'Sensei', price: '$24-89', unit: '/mo', hide: 'md' },
                        { name: 'TechPrep', price: '$39', unit: '/mo', hide: 'lg' },
                        { name: 'AlgoMaster', price: '$29', unit: '/mo', hide: 'lg' },
                        { name: 'DesignGurus', price: '$98-197', unit: '/yr', hide: 'lg' },
                        { name: 'AIApply', price: '$29-200', unit: '/mo', hide: 'xl' },
                        { name: 'OfferGoose', price: '$89-200', unit: '/mo', hide: 'xl' },
                        { name: 'Parakeet', price: '$100-200', unit: '/mo', hide: 'xl' },
                      ].map((col) => (
                        <th key={col.name} className={`py-2.5 px-1.5 text-center whitespace-nowrap ${col.hide ? `hidden ${col.hide}:table-cell` : ''}`}
                          style={{ borderBottom: '2px solid var(--border)', ...(col.highlight ? { background: '#2D8CFF', borderBottom: '2px solid #2D8CFF' } : {}) }}>
                          <div className="font-bold" style={{ color: col.highlight ? '#fff' : 'var(--text-muted)', fontSize: '11px' }}>{col.name}</div>
                          <div className="font-bold" style={{ color: col.highlight ? 'rgba(255,255,255,0.8)' : 'var(--text-dimmed)', fontSize: '10px' }}>
                            {col.price}<span className="text-[8px]">{col.unit}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => {
                      const isLast = i === COMPARISON.length - 1;
                      const bd = isLast ? 'none' : '1px solid var(--border)';
                      const Cell = ({ val, highlight }: { val: boolean | string; highlight?: boolean }) => {
                        if (val === true) return highlight
                          ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: '#2D8CFF' }}><svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L4.5 8.5L2 6" /></svg></span>
                          : <svg className="w-3.5 h-3.5 mx-auto" viewBox="0 0 12 12" fill="none" stroke="var(--text-dimmed)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L4.5 8.5L2 6" /></svg>;
                        if (val === false) return <span style={{ color: 'var(--text-dimmed)' }}>—</span>;
                        return <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>{val}</span>;
                      };
                      return (
                        <tr key={i} className="hover:bg-[var(--bg-surface)] transition-colors">
                          <td className="py-2 px-4 text-[12px]" style={{ color: row.unique ? '#2D8CFF' : 'var(--text-primary)', fontWeight: row.unique ? 600 : 400, borderBottom: bd }}>{row.feature}</td>
                          <td className="py-2 px-1.5 text-center" style={{ background: 'rgba(45,140,255,0.04)', borderBottom: bd }}><Cell val={row.camora} highlight /></td>
                          {[row.finalround, row.lockedin].map((v, j) => <td key={j} className="py-2 px-1.5 text-center" style={{ borderBottom: bd }}><Cell val={v} /></td>)}
                          <td className="py-2 px-1.5 text-center hidden md:table-cell" style={{ borderBottom: bd }}><Cell val={row.solver} /></td>
                          <td className="py-2 px-1.5 text-center hidden md:table-cell" style={{ borderBottom: bd }}><Cell val={row.sensei} /></td>
                          <td className="py-2 px-1.5 text-center hidden lg:table-cell" style={{ borderBottom: bd }}><Cell val={row.techprep} /></td>
                          <td className="py-2 px-1.5 text-center hidden lg:table-cell" style={{ borderBottom: bd }}><Cell val={row.algomaster} /></td>
                          <td className="py-2 px-1.5 text-center hidden lg:table-cell" style={{ borderBottom: bd }}><Cell val={row.designgurus} /></td>
                          <td className="py-2 px-1.5 text-center hidden xl:table-cell" style={{ borderBottom: bd }}><Cell val={row.aiapply} /></td>
                          <td className="py-2 px-1.5 text-center hidden xl:table-cell" style={{ borderBottom: bd }}><Cell val={row.offergoose} /></td>
                          <td className="py-2 px-1.5 text-center hidden xl:table-cell" style={{ borderBottom: bd }}><Cell val={row.parakeet} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
