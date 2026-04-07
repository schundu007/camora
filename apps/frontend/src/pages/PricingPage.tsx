import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CamoraLogo from '../components/shared/CamoraLogo';
import SiteFooter from '../components/shared/SiteFooter';

const API_URL = import.meta.env.VITE_CAMORA_API_URL || import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

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
  { feature: 'Desktop app', camora: 'Soon', finalround: true, lockedin: true, solver: true, sensei: false, techprep: false, algomaster: false, designgurus: false, aiapply: true, offergoose: true, parakeet: true },
];

const NAV_LINKS = [
  { label: 'Apply', href: '/jobs', external: false },
  { label: 'Prepare', href: '/capra/prepare', external: false },
  { label: 'Practice', href: '/capra/practice', external: false },
  { label: 'Attend', href: '/lumora', external: false },
  { label: 'Pricing', href: '/pricing', external: false },
];

export default function PricingPage() {
  const { token, isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen text-gray-900">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <CamoraLogo size={36} />
            <span className="text-sm font-bold tracking-tight text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</Link>
              )
            )}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/capra/prepare" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                  {user?.image ? (
                    <img src={user.image} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{user?.name?.[0] || '?'}</div>
                  )}
                  <span className="text-[13px] text-gray-700 font-medium">{user?.name?.split(' ')[0] || 'Dashboard'}</span>
                </Link>
                <button onClick={logout} className="text-[13px] text-gray-400 hover:text-red-500 transition-colors font-medium">Sign out</button>
              </>
            ) : (
              <Link to="/login?redirect=/pricing" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Sign in</Link>
            )}
            <Link to="/lumora" className="px-4 py-1.5 text-[13px] font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
              Launch App
            </Link>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-500 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e3e8ee] px-6 py-4 border-b border-[#e3e8ee] space-y-2" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}>
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} className="block py-2 text-sm text-gray-600 font-medium">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="block py-2 text-sm text-gray-600 font-medium"
                      onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              )
            )}
            {isAuthenticated ? (
              <>
                <Link to="/capra/prepare" className="block py-2 text-sm text-gray-600 font-medium"
                      onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block py-2 text-sm text-red-500 font-medium">Sign out</button>
              </>
            ) : (
              <Link to="/login?redirect=/pricing" className="block py-2 text-sm text-gray-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            )}
            <Link to="/lumora" className="block py-2 text-sm text-emerald-600 font-semibold"
                  onClick={() => setMobileMenuOpen(false)}>Launch App</Link>
          </div>
        )}
      </nav>

      {/* Header */}
      <section className="pt-20 pb-0 px-6 text-center">
        <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Pricing</span>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          The APPA platform. All-in-one.
        </h1>
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
          The complete interview pipeline — from job search to live AI. Starting free.
        </p>
      </section>

      {/* Competitor comparison */}
      <section className="px-6 pt-4 pb-16">
        <div className="max-w-[95%] xl:max-w-7xl mx-auto">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, #34d399, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Why Camora Wins</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              See how we compare.
            </h2>
          </div>

          <div
            className="overflow-x-auto"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 50%, #faf8ff 100%)',
              border: '3px solid transparent',
              borderRadius: '24px',
              backgroundImage: 'linear-gradient(135deg, #ffffff, #f8faff, #faf8ff), linear-gradient(135deg, #34d399, #06b6d4, #6366f1, #a855f7, #ec4899, #34d399)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              backgroundSize: '100% 100%, 300% 300%',
              animation: 'gradient-border 6s ease-in-out infinite',
              boxShadow: '0 20px 60px rgba(99,102,241,0.18), 0 8px 24px rgba(52,211,153,0.1), 0 0 0 1px rgba(99,102,241,0.05)',
              padding: '12px 16px',
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', verticalAlign: 'bottom' }}>
                  <th className="text-left py-3 px-4 text-gray-500 font-mono text-[10px] uppercase tracking-wider min-w-[200px]">Feature</th>
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
                      style={col.highlight ? { background: 'linear-gradient(180deg, #ecfdf5, #d1fae5)', borderRadius: '14px 14px 0 0', boxShadow: 'inset 0 -2px 0 #34d399' } : {}}
                    >
                      <div className={`text-[11px] font-medium ${col.highlight ? '' : 'text-gray-500'}`} style={col.highlight ? { background: 'linear-gradient(135deg, #059669, #0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '13px', fontWeight: 800 } : {}}>
                        {col.name}
                      </div>
                      <div className="text-sm font-extrabold mt-0.5" style={col.highlight ? { color: '#059669' } : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {col.price}<span className="text-[9px] font-normal text-gray-400">{col.unit}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => {
                  const Cell = ({ val }: { val: boolean | string }) => {
                    if (val === true) return <span className="text-gray-400">&#10003;</span>;
                    if (val === false) return <span className="text-gray-700">-</span>;
                    return <span className="text-[10px] text-amber-400 font-mono">{val}</span>;
                  };
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className={`py-3 px-4 text-sm ${row.unique ? 'text-emerald-600 font-semibold' : 'text-gray-700'}`}>
                        {row.feature}
                      </td>
                      <td className="py-3 px-3 text-center" style={{ background: '#f0fdf4' }}>
                        {row.camora === true
                          ? <span className="text-emerald-500 font-bold text-base">&#10003;</span>
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
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#e3e8ee]" />
      </div>

      {/* Plans */}
      <section className="max-w-[85%] xl:max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1" style={{ alignItems: 'center' }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="relative p-6 flex flex-col"
              style={plan.popular ? {
                background: 'linear-gradient(160deg, rgba(52,211,153,0.18) 0%, rgba(56,189,248,0.14) 25%, white 50%, rgba(129,140,248,0.14) 75%, rgba(192,132,252,0.18) 100%)',
                borderRadius: '24px',
                border: '2.5px solid transparent',
                backgroundImage: 'linear-gradient(160deg, rgba(52,211,153,0.18), rgba(56,189,248,0.14) 25%, white 50%, rgba(129,140,248,0.14) 75%, rgba(192,132,252,0.18)), linear-gradient(135deg, #34d399, #38bdf8, #818cf8, #c084fc)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 8px 32px rgba(99,102,241,0.2), 0 2px 8px rgba(99,102,241,0.1)',
                zIndex: 2,
                transform: 'scale(1.04)',
              } : plan.name === 'Annual' ? {
                background: 'linear-gradient(160deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.14) 25%, white 50%, rgba(217,119,6,0.14) 75%, rgba(251,191,36,0.2) 100%)',
                borderRadius: '28px',
                border: '3.5px solid transparent',
                backgroundImage: 'linear-gradient(160deg, rgba(251,191,36,0.2), rgba(245,158,11,0.14) 25%, white 50%, rgba(217,119,6,0.14) 75%, rgba(251,191,36,0.2)), linear-gradient(135deg, #fbbf24, #f59e0b, #d97706, #fbbf24)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                backgroundSize: '100% 100%, 300% 300%',
                animation: 'gradient-border 4s ease-in-out infinite',
                boxShadow: '0 16px 50px rgba(245,158,11,0.3), 0 6px 20px rgba(245,158,11,0.2), 0 0 0 4px rgba(251,191,36,0.1)',
                zIndex: 3,
                transform: 'scale(1.07)',
              } : { borderRadius: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: 'white', border: '1px solid #e3e8ee' }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #34d399, #818cf8)', zIndex: 10 }}>
                  Most Popular
                </div>
              )}
              {plan.name === 'Annual' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)', zIndex: 10 }}>
                  Best Value
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-semibold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-1 text-[13px] text-gray-500">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-gray-400">
                    <span className="w-1 h-1 bg-emerald-400/60 mt-2 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan)}
                disabled={loading === plan.name}
                className={`w-full py-3 text-sm font-semibold rounded-xl cursor-pointer transition-all duration-200 ${
                  plan.popular
                    ? 'text-white hover:opacity-90'
                    : plan.name === 'Annual'
                    ? 'text-white hover:opacity-90'
                    : 'border-2 border-[#c7cfe0] text-gray-800 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'
                } disabled:opacity-50`}
                style={plan.popular ? {
                  background: 'linear-gradient(135deg, #34d399, #06b6d4, #6366f1)',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                } : plan.name === 'Annual' ? {
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
                } : {}}
              >
                {loading === plan.name ? 'Loading...' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Top-Up Packs */}
      <section className="px-6 py-16">
        <div className="max-w-[85%] xl:max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-mono text-emerald-600 uppercase tracking-wider">Need More Credits?</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">Top-Up Packs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: '20 AI Questions', price: '$5', desc: 'Includes 3 bonus diagrams', packId: 'questions_20' },
              { name: '50 AI Questions', price: '$10', desc: 'Includes 8 bonus diagrams', packId: 'questions_50' },
              { name: '5 Live Sessions', price: '$15', desc: '90 minutes per session', packId: 'sessions_5' },
            ].map((pack) => (
              <div key={pack.packId} className="rounded-2xl p-px bg-gradient-to-br from-emerald-300 via-blue-300 to-purple-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:from-emerald-400 hover:via-blue-400 hover:to-purple-400 transition-all">
              <div className="bg-white rounded-[15px] p-6">
                <h3 className="text-lg font-bold text-gray-900">{pack.name}</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-emerald-600">{pack.price}</span>
                  <span className="text-sm text-gray-400">one-time</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{pack.desc}</p>
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
                  className="mt-4 w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Buy {pack.name}
                </button>
              </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#e3e8ee]" />
      </div>


      {/* CTA buttons */}
      <section className="px-6 py-10 text-center">
        <div className="flex items-center justify-center gap-4">
          <Link to="/lumora" className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}>
            Start Free
          </Link>
          <Link to="/capra/prepare" className="px-6 py-2.5 text-sm font-semibold rounded-xl text-gray-700 border-2 border-[#c7cfe0] hover:border-indigo-400 hover:text-indigo-600 transition-all">
            Browse Topics
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="max-w-[85%] xl:max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">FAQ</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">Common questions</h2>
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
              <div key={i} className="bg-white p-6 border border-[#e3e8ee] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{faq.q}</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <SiteFooter />
    </div>
  );
}
