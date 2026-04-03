import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  { feature: 'Real-time AI during live interview', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: false, algomaster: false, designgurus: false },
  { feature: 'Job discovery and matching', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, unique: true },
  { feature: 'Auto resume and cover letter', camora: true, finalround: false, lockedin: true, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false },
  { feature: 'Auto job apply', camora: true, finalround: false, lockedin: true, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false },
  { feature: '300+ interview prep topics', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: true, algomaster: true, designgurus: true },
  { feature: 'System design with diagrams', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: 'Partial', algomaster: true, designgurus: true },
  { feature: 'Mock interview simulator', camora: true, finalround: true, lockedin: true, solver: false, sensei: true, techprep: false, algomaster: false, designgurus: false },
  { feature: 'Coding solutions with complexity', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: true, algomaster: true, designgurus: true },
  { feature: 'Speaker voice filtering', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, unique: true },
  { feature: 'Combined prep plus live tool', camora: true, finalround: false, lockedin: false, solver: false, sensei: false, techprep: false, algomaster: false, designgurus: false, unique: true },
  { feature: 'Voice transcription', camora: true, finalround: true, lockedin: true, solver: true, sensei: true, techprep: false, algomaster: false, designgurus: false },
  { feature: 'Desktop app', camora: 'Soon', finalround: true, lockedin: true, solver: true, sensei: false, techprep: false, algomaster: false, designgurus: false },
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
    <div className="min-h-screen bg-[#f7f8f9] text-gray-900">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#e3e8ee] bg-white/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <span className="text-[10px] font-black text-white tracking-tight">C</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-gray-900">Camora</span>
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
              <Link to="/login" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Sign in</Link>
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
          <div className="md:hidden border-t border-[#e3e8ee] bg-white px-6 py-4 border-b border-[#e3e8ee] space-y-2">
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
              <Link to="/login" className="block py-2 text-sm text-gray-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            )}
            <Link to="/lumora" className="block py-2 text-sm text-emerald-600 font-semibold"
                  onClick={() => setMobileMenuOpen(false)}>Launch App</Link>
          </div>
        )}
      </nav>

      {/* Header */}
      <section className="pt-28 pb-6 px-6 text-center">
        <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Pricing</span>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          The APPA platform. All-in-one.
        </h1>
        <p className="mt-3 text-base text-gray-600 max-w-xl mx-auto">
          Apply. Prepare. Practice. Attend. Others charge $25-150/mo for just the copilot.
          Camora gives you the complete interview pipeline — starting free.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-[85%] xl:max-w-7xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-4 gap-px bg-white/[0.04]">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white p-6 border border-[#e3e8ee] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col ${plan.popular ? 'ring-2 ring-emerald-500/30 bg-emerald-50/50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-[10px] font-bold text-black uppercase tracking-wider">
                  Most Popular
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
                className={`w-full py-2.5 text-[13px] font-medium transition-colors ${
                  plan.popular
                    ? 'bg-emerald-400 text-black hover:bg-emerald-300'
                    : 'border border-[#e3e8ee] text-gray-700 hover:border-[#d0d5dd] hover:text-gray-900'
                } disabled:opacity-50`}
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
            <p className="mt-2 text-base text-gray-500">Hit your limit? Add more credits instantly. No subscription required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: '20 AI Questions', price: '$5', desc: 'Includes 3 bonus diagrams', packId: 'questions_20', icon: '💬' },
              { name: '50 AI Questions', price: '$10', desc: 'Includes 8 bonus diagrams', packId: 'questions_50', icon: '🚀' },
              { name: '5 Live Sessions', price: '$15', desc: '90 minutes per session', packId: 'sessions_5', icon: '🎯' },
            ].map((pack) => (
              <div key={pack.packId} className="bg-white rounded-2xl border border-[#e3e8ee] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-emerald-300 transition-all">
                <div className="text-3xl mb-3">{pack.icon}</div>
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
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#e3e8ee]" />
      </div>

      {/* Value prop */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-gray-900">
            No other tool gives you the full pipeline.
          </h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04]">
            {[
              { step: '01', label: 'Apply', desc: 'AI-matched jobs from 1000+ companies' },
              { step: '02', label: 'Prepare', desc: '300+ topics with AI explanations' },
              { step: '03', label: 'Practice', desc: 'Mock interviews with feedback' },
              { step: '04', label: 'Attend', desc: 'Real-time AI during your interview' },
            ].map((s) => (
              <div key={s.step} className="bg-white p-5 text-center border border-[#e3e8ee]">
                <span className="text-[11px] font-mono text-emerald-400/60">{s.step}</span>
                <div className="mt-1 text-sm font-semibold text-gray-900">{s.label}</div>
                <div className="mt-1 text-[12px] text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'Auto Cloud Diagrams', color: '#34d399' },
              { label: '50+ Languages', color: '#06b6d4' },
              { label: 'Real Interview DB', color: '#818cf8' },
              { label: 'Auto-Fix Code', color: '#f59e0b' },
            ].map((badge) => (
              <span
                key={badge.label}
                className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-sm text-gray-300 font-medium inline-flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: badge.color }} />
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Competitor comparison */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">Comparison</span>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
              How Camora compares.
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e3e8ee]">
                  <th className="text-left py-3 px-4 text-gray-500 font-mono text-[10px] uppercase tracking-wider min-w-[220px]">Feature</th>
                  <th className="py-3 px-3 text-center min-w-[80px]">
                    <div className="text-emerald-600 font-semibold text-sm">Camora</div>
                    <div className="text-[10px] text-gray-500 font-mono">from $0</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px]">
                    <div className="text-gray-400 text-xs">Final Round</div>
                    <div className="text-[10px] text-gray-600 font-mono">$100/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px]">
                    <div className="text-gray-400 text-xs">LockedIn</div>
                    <div className="text-[10px] text-gray-600 font-mono">$30/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] hidden md:table-cell">
                    <div className="text-gray-400 text-xs">Solver</div>
                    <div className="text-[10px] text-gray-600 font-mono">$39/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] hidden md:table-cell">
                    <div className="text-gray-400 text-xs">Sensei</div>
                    <div className="text-[10px] text-gray-600 font-mono">$24/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] hidden lg:table-cell">
                    <div className="text-gray-400 text-xs">TechPrep</div>
                    <div className="text-[10px] text-gray-600 font-mono">$39/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] hidden lg:table-cell">
                    <div className="text-gray-400 text-xs">AlgoMaster</div>
                    <div className="text-[10px] text-gray-600 font-mono">$29/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center min-w-[80px] hidden lg:table-cell">
                    <div className="text-gray-400 text-xs">DesignGurus</div>
                    <div className="text-[10px] text-gray-600 font-mono">$98-197/course</div>
                  </th>
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
                    <tr key={i} className="border-b border-[#f0f0f5]">
                      <td className={`py-2.5 px-4 ${row.unique ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}>
                        {row.feature}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.camora === true
                          ? <span className="text-emerald-400 font-bold">&#10003;</span>
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

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Start free. Upgrade when you are ready.
        </h2>
        <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
          3 free interview sessions. No credit card. No commitment.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/lumora" className="px-6 py-2.5 text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
            Start Free
          </Link>
          <Link to="/capra/prepare" className="px-6 py-2.5 text-sm font-medium text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            Browse Topics
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e3e8ee] px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-emerald-500 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <span className="text-[8px] font-black text-white">C</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Camora</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</Link>
              )
            )}
            <a href="mailto:support@cariara.com" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">Support</a>
          </div>
          <p className="text-[12px] font-mono text-gray-400">&copy; {new Date().getFullYear()} Camora by Cariara</p>
        </div>
      </footer>
    </div>
  );
}
