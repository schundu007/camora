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
    <div className="min-h-screen text-gray-900">

      <SEO title="Pricing" description="Interview prep plans starting free. Monthly, Quarterly Pro, and Desktop Lifetime options." path="/pricing" />
      <SiteNav />

      {/* Header */}
      <section className="pt-20 pb-0 px-6 text-center">
        <span className="section-label">Pricing</span>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight text-gray-900">
          The APPA platform. All-in-one.
        </h1>
      </section>

      {/* Competitor comparison */}
      <section className="px-6 pt-4 pb-16">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, #34d399, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Why Camora Wins</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              See how we compare.
            </h2>
          </div>

          <div
            className="overflow-x-auto"
            style={{
              background: 'white',
              border: '1px solid #e3e8ee',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              padding: '12px 16px',
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', verticalAlign: 'bottom' }}>
                  <th className="text-left py-3 px-4 text-gray-500 font-mono text-[10px] uppercase tracking-wider min-w-[120px] sm:min-w-[200px]">Feature</th>
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
      <div className="w-full lg:max-w-[70%] mx-auto px-6">
        <div className="h-px bg-[#e3e8ee]" />
      </div>

      {/* Plans */}
      <section className="w-full lg:max-w-[70%] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="relative p-6 flex flex-col"
              style={{
                borderRadius: '16px',
                background: 'white',
                border: plan.popular ? '2px solid #10b981' : plan.name === 'Annual' ? '2px solid #f59e0b' : '1px solid #e3e8ee',
                boxShadow: plan.popular ? '0 4px 16px rgba(16,185,129,0.12)' : plan.name === 'Annual' ? '0 4px 16px rgba(245,158,11,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                  {plan.popular && (
                    <span className="px-3 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>Popular</span>
                  )}
                  {plan.name === 'Annual' && (
                    <span className="px-3 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Best Value</span>
                  )}
                </div>
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
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="mb-10 text-center">
            <span className="section-label">Need More Credits?</span>
            <h2 className="heading-2 mt-3">Top-Up Packs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: '20 AI Questions', price: '$5', desc: 'Includes 3 bonus diagrams', packId: 'questions_20' },
              { name: '50 AI Questions', price: '$10', desc: 'Includes 8 bonus diagrams', packId: 'questions_50' },
              { name: '5 Live Sessions', price: '$15', desc: '90 minutes per session', packId: 'sessions_5' },
            ].map((pack) => (
              <div key={pack.packId} className="bg-white rounded-2xl border-0 p-4 flex items-center justify-between gap-4" style={{ boxShadow: '0 4px 24px rgba(99,102,241,0.12)' }}>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{pack.name}</h3>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-emerald-600">{pack.price}</span>
                    <span className="text-[11px] text-gray-400">one-time</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{pack.desc}</p>
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
                  className="shrink-0 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full lg:max-w-[70%] mx-auto px-6">
        <div className="h-px bg-[#e3e8ee]" />
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
