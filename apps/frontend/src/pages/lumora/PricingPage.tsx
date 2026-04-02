import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// TODO: Migrate CompetitorComparison component
// import CompetitorComparison from '../components/pricing/CompetitorComparison';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LUMORA_PLANS = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '',
    description: '1 live interview session',
    features: ['1 session (60 min)', 'All AI features', 'All platforms (Zoom, Meet, Teams)', 'Emergency blank (Cmd+B)', 'System audio capture'],
    cta: 'Try Free',
    ctaHref: '/lumora',
    popular: false,
    gradient: 'from-gray-500 to-gray-600',
    border: 'border-gray-200',
  },
  {
    name: '8-Pack',
    price: '$99',
    period: '',
    description: '8 interview sessions — never expire',
    features: ['8 sessions (90 min each)', '3-approach coding solutions', 'System design diagrams', 'All 51 languages', 'Interviewer voice capture', 'Desktop app access', '$12.38/session'],
    cta: 'Get 8-Pack',
    ctaHref: '/lumora',
    popular: true,
    gradient: 'from-emerald-500 to-teal-500',
    border: 'border-emerald-300',
  },
  {
    name: 'Unlimited',
    price: '$79',
    period: '/mo',
    description: 'Unlimited interviews, cancel anytime',
    features: ['Unlimited sessions', 'Everything in 8-Pack', 'Priority AI (faster responses)', 'Best for heavy interview pipelines', 'Cancel anytime'],
    cta: 'Go Unlimited',
    ctaHref: '/lumora',
    popular: false,
    gradient: 'from-violet-500 to-purple-500',
    border: 'border-violet-200',
  },
];

const COMPETITORS = [
  { feature: 'Real-time AI during live interviews', us: true, ic: true, ib: true, edu: false, dg: false, ae: false, exp: false, iio: false, highlight: true },
  { feature: 'System audio capture (hear interviewer)', us: true, ic: true, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false },
  { feature: 'Emergency blank screen (Cmd+B)', us: true, ic: true, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false },
  { feature: 'Pre-interview mic check', us: true, ic: false, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false, highlight: true },
  { feature: 'System design with architecture diagrams', us: true, ic: false, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false, highlight: true },
  { feature: '3-approach coding solutions', us: true, ic: false, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false, highlight: true },
  { feature: '51 programming languages', us: true, ic: 'Few', ib: false, edu: 'Few', dg: 'Few', ae: '9', exp: false, iio: false, highlight: true },
  { feature: 'Code execution & auto-fix', us: true, ic: false, ib: false, edu: 'Run only', dg: false, ae: 'Run only', exp: false, iio: false },
  { feature: 'Behavioral STAR format', us: true, ic: false, ib: false, edu: false, dg: false, ae: false, exp: true, iio: false },
  { feature: 'Mock interview rehearsal', us: true, ic: false, ib: false, edu: false, dg: false, ae: false, exp: true, iio: true },
  { feature: 'Desktop app (stealth mode)', us: true, ic: true, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false },
  { feature: 'Combined prep + live interview AI', us: true, ic: false, ib: false, edu: false, dg: false, ae: false, exp: false, iio: false, highlight: true },
];

export function PricingPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'lumora' | 'ascend'>('lumora');

  const PRICE_MAP: Record<string, string> = {
    'Unlimited': 'price_1THJuMITUCNxtMxl8rXjHdCx',
    '8-Pack': 'price_1THJvrITUCNxtMxlz5AMBj28',
  };

  const [loading, setLoading] = useState('');

  const handleCheckout = async (plan: typeof LUMORA_PLANS[number]) => {
    if (plan.name === 'Free Trial') { window.location.href = '/lumora'; return; }
    const priceId = PRICE_MAP[plan.name];
    if (!priceId) { window.location.href = '/lumora'; return; }
    if (!token) { window.location.href = '/login'; return; }
    setLoading(plan.name);
    try {
      const resp = await fetch(`${API_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/app?checkout=success`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
      else { alert('Checkout unavailable. Please try again.'); setLoading(''); }
    } catch { alert('Checkout failed. Please try again.'); setLoading(''); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 30%, #ecfeff 60%, #f5f3ff 85%, #ffffff 100%)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 bg-gray-950 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
            <span className="font-display font-extrabold text-sm text-white">L</span>
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight text-white">Lumora</span>
            <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 -mt-0.5">Interview AI</span>
          </div>
        </Link>
        <Link to="/lumora" className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm rounded-lg">
          Launch App
        </Link>
      </nav>

      {/* Header */}
      <div className="text-center pt-16 pb-6 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-full mb-6">
          <span className="text-xs font-bold text-red-600">Save $220/mo vs InterviewCoder</span>
        </div>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight text-gray-900">
          Same AI Power. <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">4x Lower Price.</span>
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
          Real-time AI coaching during live interviews. System design, coding, behavioral — the only tool that does preparation AND live coaching.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          <button onClick={() => setTab('lumora')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'lumora' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Lumora — During Interview
          </button>
          <button onClick={() => setTab('ascend')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'ascend' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Ascend — Preparation
          </button>
        </div>
      </div>

      {/* Lumora Plans */}
      {tab === 'lumora' && (
        <div className="max-w-5xl mx-auto px-6 pb-10">
          <div className="grid md:grid-cols-3 gap-6">
            {LUMORA_PLANS.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border bg-white/80 backdrop-blur-sm p-8 flex flex-col ${plan.popular ? `${plan.border} shadow-xl shadow-emerald-500/10 scale-105 z-10` : 'border-gray-200 shadow-sm'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <h3 className="font-display font-bold text-xl text-gray-900">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`font-display font-extrabold text-4xl bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleCheckout(plan)} className={`mt-8 block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ascend Plans */}
      {tab === 'ascend' && (
        <div className="max-w-5xl mx-auto px-6 pb-10">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Interview Ready', price: '$29', period: '/mo', desc: 'Solid foundation', features: ['All 300+ DSA topics', '15 system design problems', '100 AI questions/day', '5 mock interviews/mo', '3 company preps'], popular: false },
              { name: 'FAANG Track', price: '$59', period: '/mo', desc: 'Everything unlimited + 3 Lumora sessions', features: ['Unlimited system design', 'Unlimited AI questions', 'Unlimited mock interviews', 'All company preps', '3 Lumora live sessions included', 'Priority AI speed'], popular: true },
              { name: 'Elite', price: '$99', period: '/mo', desc: 'Premium + 5 Lumora sessions', features: ['Everything in FAANG Track', '5 Lumora live sessions', 'Custom weekly study plan', 'AI resume review', 'Priority support'], popular: false },
            ].map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border bg-white/80 backdrop-blur-sm p-8 flex flex-col ${plan.popular ? 'border-emerald-300 shadow-xl shadow-emerald-500/10 scale-105 z-10' : 'border-gray-200 shadow-sm'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg">Most Popular</div>
                )}
                <h3 className="font-display font-bold text-xl text-gray-900">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display font-extrabold text-4xl bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{plan.desc}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="https://capra.cariara.com/premium" className={`mt-8 block text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Start {plan.name} on Ascend
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aggressive Comparison - Dark Section */}
      <section className="px-6 md:px-12 py-16 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono font-bold text-red-400 tracking-wide uppercase">Honest Comparison</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white">
              Why Pay <span className="text-red-400 line-through decoration-2">$299/mo</span> When You Can Pay <span className="text-emerald-400">$79/mo</span>?
            </h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">Every feature. Every competitor. No hidden costs. See who actually delivers.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left py-4 px-4 text-gray-500 font-mono text-[10px] uppercase tracking-widest min-w-[200px] sticky left-0 bg-gray-900/95 z-10">Feature</th>
                  <th className="py-4 px-3 text-center min-w-[90px] bg-emerald-500/10">
                    <div className="text-emerald-400 font-bold text-sm">Lumora</div>
                    <div className="text-emerald-300/70 text-[10px] font-mono">$79/mo</div>
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded uppercase">Ours</span>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[90px] bg-emerald-500/5">
                    <div className="text-emerald-400/80 font-bold text-sm">Ascend</div>
                    <div className="text-emerald-300/50 text-[10px] font-mono">$29-99/mo</div>
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-500/80 text-white text-[8px] font-bold rounded uppercase">Ours</span>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[90px]">
                    <div className="text-gray-400 font-bold text-xs">InterviewCoder</div>
                    <div className="text-red-400/80 text-[10px] font-mono">$299/mo</div>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[80px]">
                    <div className="text-gray-400 font-bold text-xs">InterviewBee</div>
                    <div className="text-gray-500 text-[10px] font-mono">??? hidden</div>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[80px] hidden md:table-cell">
                    <div className="text-gray-400 font-bold text-xs">Exponent</div>
                    <div className="text-gray-500 text-[10px] font-mono">$99/mo</div>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[80px] hidden md:table-cell">
                    <div className="text-gray-400 font-bold text-xs">Educative</div>
                    <div className="text-gray-500 text-[10px] font-mono">~$79/mo</div>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[80px] hidden lg:table-cell">
                    <div className="text-gray-400 font-bold text-xs">DesignGurus</div>
                    <div className="text-gray-500 text-[10px] font-mono">$119/mo</div>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[80px] hidden lg:table-cell">
                    <div className="text-gray-400 font-bold text-xs">AlgoExpert</div>
                    <div className="text-gray-500 text-[10px] font-mono">$99/yr</div>
                  </th>
                  <th className="py-4 px-3 text-center min-w-[80px] hidden xl:table-cell">
                    <div className="text-gray-400 font-bold text-xs">Interviewing.io</div>
                    <div className="text-gray-500 text-[10px] font-mono">$100-250/sess</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((row, i) => {
                  const renderCell = (val: boolean | string) => {
                    if (val === true) return <span className="text-gray-400">&#10003;</span>;
                    if (val === false) return <span className="text-gray-700">&#8212;</span>;
                    return <span className="text-amber-500/70 text-[10px]">{val}</span>;
                  };
                  return (
                    <tr key={i} className={`border-b border-gray-800/50 ${row.highlight ? 'bg-emerald-500/5' : ''}`}>
                      <td className={`py-3 px-4 sticky left-0 z-10 ${row.highlight ? 'text-emerald-300 font-bold bg-gray-950' : 'text-gray-300 bg-gray-950'}`}>
                        {row.highlight && <span className="text-amber-400 mr-1.5">&#9733;</span>}
                        {row.feature}
                      </td>
                      <td className="py-3 px-3 text-center bg-emerald-500/10">{row.us === true ? <span className="text-emerald-400 text-base font-bold">&#10003;</span> : renderCell(row.us)}</td>
                      <td className="py-3 px-3 text-center bg-emerald-500/5">{row.us === true ? <span className="text-emerald-400/70 text-base">&#10003;</span> : renderCell(false)}</td>
                      <td className="py-3 px-3 text-center">{renderCell(row.ic)}</td>
                      <td className="py-3 px-3 text-center">{renderCell(row.ib)}</td>
                      <td className="py-3 px-3 text-center hidden md:table-cell">{renderCell(row.exp)}</td>
                      <td className="py-3 px-3 text-center hidden md:table-cell">{renderCell(row.edu)}</td>
                      <td className="py-3 px-3 text-center hidden lg:table-cell">{renderCell(row.dg)}</td>
                      <td className="py-3 px-3 text-center hidden lg:table-cell">{renderCell(row.ae)}</td>
                      <td className="py-3 px-3 text-center hidden xl:table-cell">{renderCell(row.iio)}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="border-t-2 border-gray-700 bg-gray-900/80">
                  <td className="py-4 px-4 font-bold text-white sticky left-0 bg-gray-900/95 z-10">Features with full support</td>
                  <td className="py-4 px-3 text-center bg-emerald-500/10"><span className="text-emerald-400 font-black text-xl">12/12</span></td>
                  <td className="py-4 px-3 text-center bg-emerald-500/5"><span className="text-emerald-400/70 font-bold">8/12</span></td>
                  <td className="py-4 px-3 text-center"><span className="text-gray-500 font-bold">4/12</span></td>
                  <td className="py-4 px-3 text-center"><span className="text-gray-500 font-bold">1/12</span></td>
                  <td className="py-4 px-3 text-center hidden md:table-cell"><span className="text-gray-500 font-bold">2/12</span></td>
                  <td className="py-4 px-3 text-center hidden md:table-cell"><span className="text-gray-500 font-bold">1/12</span></td>
                  <td className="py-4 px-3 text-center hidden lg:table-cell"><span className="text-gray-500 font-bold">0/12</span></td>
                  <td className="py-4 px-3 text-center hidden lg:table-cell"><span className="text-gray-500 font-bold">0/12</span></td>
                  <td className="py-4 px-3 text-center hidden xl:table-cell"><span className="text-gray-500 font-bold">1/12</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Savings callout cards */}
          <div className="grid md:grid-cols-4 gap-4 mt-8">
            {[
              { vs: 'InterviewCoder', save: '$220', note: '/mo — same live AI, more features' },
              { vs: 'Interviewing.io', save: '$51-201', note: '/session — unlimited vs per-call' },
              { vs: 'DesignGurus', save: '$40', note: '/mo — we have actual diagrams' },
              { vs: 'Exponent', save: '$20', note: '/mo — coding + design + behavioral' },
            ].map((s) => (
              <div key={s.vs} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">vs {s.vs}</div>
                <div className="text-xl font-display font-extrabold text-emerald-400 mt-1">Save {s.save}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-2xl md:text-3xl font-display font-extrabold text-white mb-2">
              12 features. <span className="text-emerald-400">$79/mo.</span> <span className="text-red-400/60 line-through">Not $299.</span>
            </p>
            <p className="text-gray-400 mb-6 max-w-lg mx-auto">The only tool that does preparation AND live interview coaching. Everyone else makes you choose. We give you both.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/lumora" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/25 hover:-translate-y-0.5 transition-all">
                Start Free — No Credit Card
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a href="https://capra.cariara.com" className="inline-flex items-center gap-2 px-6 py-3.5 border border-gray-600 text-gray-300 font-semibold rounded-xl hover:border-gray-400 hover:text-white transition-all text-sm">
                Ascend — Prep Tool
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive Comparison (interactive component) — TODO: migrate CompetitorComparison */}
      {/* <section className="px-6 md:px-12 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <CompetitorComparison />
        </div>
      </section> */}

      {/* FAQ */}
      <section className="px-6 md:px-12 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-8">Frequently Asked</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { q: 'Is it detectable during screen share?', a: 'Lumora runs in a separate browser tab or our invisible desktop app. Use Cmd+B to instantly blank the screen.' },
              { q: 'What platforms are supported?', a: 'Zoom, Google Meet, MS Teams, HackerRank, CoderPad, Codility — any browser-based interview platform.' },
              { q: 'Can it hear my interviewer?', a: 'Yes. Click "Interviewer" to capture system audio from Zoom/Meet. It transcribes their questions in real-time.' },
              { q: 'How is this different from InterviewCoder?', a: 'We do everything they do at $79/mo (vs their $299/mo). Plus: preparation content, system design diagrams, behavioral coaching, 51 languages. They only do coding.' },
              { q: 'Do sessions expire?', a: 'Session packs never expire. Use them whenever you have interviews scheduled.' },
              { q: 'What if I need to cancel?', a: 'Cancel anytime, no questions asked. Monthly plans have no contract or cancellation fee.' },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white/70 p-5">
                <h4 className="font-semibold text-sm text-gray-900 mb-1">{faq.q}</h4>
                <p className="text-sm text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 px-6 md:px-12 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-display font-bold text-sm text-white">Lumora</span>
          <div className="flex gap-5 text-xs text-gray-500">
            <Link to="/lumora" className="hover:text-white transition-colors">App</Link>
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
          </div>
          <p className="text-xs text-gray-500 font-mono">&copy; {new Date().getFullYear()} Cariara</p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage;
