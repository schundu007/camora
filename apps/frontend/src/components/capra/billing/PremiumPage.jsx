import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Icon } from '../../shared/Icons.jsx';
import CompetitorComparison from './CompetitorComparison.jsx';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

export default function PremiumPage() {
  const { token: authToken, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleSubscribe = async (planId) => {
    setLoading(planId);
    setError('');
    try {
      if (!isAuthenticated) {
        localStorage.setItem('capra_pending_plan', planId);
        window.location.href = '/login';
        return;
      }
      const token = authToken;
      if (!token) throw new Error('Please sign in first');
      const pricesRes = await fetch(`${API_URL}/api/billing/prices`);
      const prices = await pricesRes.json();
      const priceId = prices[planId]?.priceId;
      if (!priceId) throw new Error('Invalid plan');
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceId, successUrl: `${window.location.origin}?checkout=success&plan=${planId}`, cancelUrl: `${window.location.origin}/pricing?checkout=canceled` }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to create checkout'); }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) { setError(err.message); setLoading(null); }
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const plans = [
    { id: 'monthly', name: 'Interview Ready', price: 29, originalPrice: null, period: '/month', icon: 'code', color: '#3b82f6', colorName: 'blue', badge: null, features: ['All 300+ DSA topics', '15 system design problems', '100 AI questions/day', '5 mock interviews/month', '3 company preps'], cta: 'Start Interview Ready' },
    { id: 'quarterly_pro', name: 'FAANG Track', price: 59, originalPrice: null, period: '/month', icon: 'rocket', color: '#10b981', colorName: 'emerald', badge: 'POPULAR', features: ['Everything in Interview Ready', 'Unlimited system design + diagrams', 'Unlimited AI questions', 'Unlimited mock interviews', 'All company preps', '3 Lumora live sessions included'], cta: 'Start FAANG Track', savings: 'Best value for prep' },
    { id: 'desktop_lifetime', name: 'Elite', price: 99, originalPrice: null, period: '/month', icon: 'terminal', color: '#8b5cf6', colorName: 'violet', badge: 'PREMIUM', features: ['Everything in FAANG Track', '5 Lumora live sessions included', 'Custom weekly study plan', 'AI resume review', 'Priority support', 'Desktop app early access'], cta: 'Start Elite' },
  ];

  const whatsIncluded = [
    { icon: 'code', title: 'AI Coding Engine', desc: 'Instant solutions in 20+ languages with explanations and auto-fix', tags: ['Multi-Language', 'Auto-Fix'] },
    { icon: 'systemDesign', title: 'System Design', desc: 'Architecture diagrams for AWS, GCP, Azure with scalability analysis', tags: ['Diagrams', 'Scale Math'] },
    { icon: 'users', title: 'Behavioral Coaching', desc: 'STAR method responses for leadership and conflict resolution', tags: ['STAR Method', 'Practice'] },
    { icon: 'microphone', title: 'Live Assistant', desc: 'Real-time AI answers during live interviews. Invisible to screen share', tags: ['Stealth', 'Real-Time'] },
    { icon: 'briefcase', title: 'Company Prep', desc: 'Upload JD + resume for tailored pitch and culture insights', tags: ['JD Match', 'Culture Fit'] },
    { icon: 'resume', title: 'Resume Builder', desc: 'AI-generated resumes and cover letters. ATS-optimized PDF/DOCX', tags: ['ATS-Ready', 'Export'] },
  ];

  const faqItems = [
    { q: 'What is Ascend?', a: 'Ascend is an AI-powered interview preparation platform that covers the full pipeline — from resume generation to live interview assistance. It supports coding, system design, and behavioral interviews.' },
    { q: 'What is included in Ascend Premium?', a: 'Premium includes unlimited AI coding, system design with auto-diagrams, behavioral coaching, company-specific prep, live interview assistant, resume/cover letter generation, screenshot OCR solver, and code execution sandbox.' },
    { q: 'What happens when my access expires?', a: 'All plans are monthly subscriptions. When your period ends, you lose access to premium features. Your saved work remains accessible. Resubscribe anytime to restore access.' },
    { q: 'Do you offer refunds?', a: 'Yes! 30-day money-back guarantee on all plans. Contact support@cariara.com for a full refund. No questions asked.' },
    { q: 'How is Ascend different from LeetCode?', a: 'Ascend covers the entire interview pipeline end-to-end: resume generation, interview prep, AND real-time live assistance during actual interviews. Plus stealth mode is 100% invisible during screen sharing.' },
    { q: 'What AI models power Ascend?', a: 'Claude (Opus & Sonnet) and GPT-4o for coding and reasoning, plus specialized models for diagram generation. Desktop users can choose their preferred AI provider.' },
  ];

  const hasActiveSubscription = false; // TODO: wire up subscription status from backend

  return (
    <div className="min-h-screen text-gray-900 overflow-hidden landing-root" style={{ background: 'linear-gradient(180deg, #fdf2f8 0%, #ede9fe 50%, #e0e7ff 100%)', paddingTop: '64px', paddingBottom: '52px' }}>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4" style={{ background: '#111827' }}>
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center"><Icon name="ascend" size={16} className="text-white" /></div>
          <div><span className="landing-display font-bold text-lg tracking-tight text-white">Ascend</span><span className="block text-[10px] landing-mono uppercase tracking-[0.2em] text-emerald-400 -mt-0.5">Interview AI</span></div>
        </a>
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollTo('plans')} className="text-sm text-gray-400 hover:text-white transition-colors font-medium landing-body">Plans</button>
          <button onClick={() => scrollTo('features')} className="text-sm text-gray-400 hover:text-white transition-colors font-medium landing-body">Features</button>
          <button onClick={() => setShowComparison(true)} className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium landing-body">Compare Us</button>
          <button onClick={() => scrollTo('faq')} className="text-sm text-gray-400 hover:text-white transition-colors font-medium landing-body">FAQ</button>
          {isAuthenticated ? (
            <a href="/capra/practice" className="px-5 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-400 transition-colors landing-body">Go to App</a>
          ) : (
            <button onClick={() => window.location.href = '/login'} className="px-5 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-400 transition-colors landing-body">Sign In</button>
          )}
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"><Icon name={mobileMenuOpen ? 'close' : 'menu'} size={22} /></button>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 md:hidden border-b border-gray-100 bg-white px-6 py-4 space-y-1">
          <button onClick={() => { scrollTo('plans'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors landing-body">Plans</button>
          <button onClick={() => { scrollTo('features'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors landing-body">Features</button>
          <a href="/" className="block px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors landing-body">Home</a>
          {isAuthenticated ? (
            <a href="/capra/practice" className="block w-full mt-2 px-4 py-2.5 bg-emerald-500 text-white font-semibold text-sm text-center rounded-lg hover:bg-emerald-600 transition-colors landing-body">Go to App</a>
          ) : (
            <button onClick={() => window.location.href = '/login'} className="block w-full mt-2 px-4 py-2.5 bg-emerald-500 text-white font-semibold text-sm text-center rounded-lg hover:bg-emerald-600 transition-colors landing-body">Sign In with Google</button>
          )}
        </div>
      )}

      <section className="flex flex-col items-center justify-center text-center px-6 pt-10 pb-8 md:pt-14 md:pb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-emerald-200 bg-emerald-50 rounded-full mb-4"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-xs landing-mono text-emerald-700 tracking-wide">Premium Plans</span></div>
        <h1 className="landing-display font-extrabold leading-tight tracking-tight max-w-3xl"><span className="text-3xl md:text-4xl lg:text-5xl text-gray-900">Ace Your Next </span><span className="text-3xl md:text-4xl lg:text-5xl bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Technical Interview</span></h1>
        <p className="mt-3 text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed landing-body">Choose a plan and start preparing with AI-powered tools for coding, system design, and behavioral interviews.</p>
        <button onClick={() => scrollTo('plans')} className="mt-4 px-8 py-2.5 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600 transition-colors shadow-sm landing-body">View Plans</button>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

      <section id="plans" className="px-6 md:px-12 py-8 md:py-10 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-5"><span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Pricing</span><h2 className="landing-display font-bold text-2xl md:text-3xl mt-1 tracking-tight text-gray-900">Simple Plans. <span className="text-gray-400">No Surprises.</span></h2></div>
          {hasActiveSubscription && (<div className="mb-6 p-4 border border-emerald-200 bg-emerald-50 rounded-lg text-center"><div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold mb-1"><Icon name="checkCircle" size={18} />Active subscription</div><p className="text-sm text-gray-500">Manage your subscription in app settings.</p></div>)}
          {error && (<div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg text-center"><p className="text-red-600 text-sm">{error}</p></div>)}
          <div className="grid md:grid-cols-3 gap-2.5">
            {plans.map((plan) => {
              const isFeatured = plan.id === 'quarterly_pro';
              return (
                <div key={plan.id} className={`relative p-4 border rounded-lg bg-white flex flex-col transition-all hover:shadow-sm ${isFeatured ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-200'}`}>
                  {plan.badge && (<div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 text-[10px] font-bold landing-mono uppercase tracking-wider rounded-full text-white" style={{ background: plan.color }}>{plan.badge}</span></div>)}
                  <div className="text-center mb-2">
                    <div className={`w-8 h-8 border border-${plan.colorName}-200 bg-${plan.colorName}-50 rounded flex items-center justify-center mx-auto mb-2`}><Icon name={plan.icon} size={16} style={{ color: plan.color }} /></div>
                    <h3 className="landing-display font-bold text-base text-gray-900">{plan.name}</h3>
                    <p className="text-[10px] text-gray-400 landing-mono">{plan.period}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5 justify-center flex-wrap mb-3">
                    {plan.originalPrice && <span className="text-lg text-gray-400 line-through">${plan.originalPrice}</span>}
                    <span className="text-3xl font-extrabold text-gray-900 landing-display">${plan.price}</span>
                    {plan.savings && <span className="px-2.5 py-0.5 text-[10px] font-bold landing-mono uppercase tracking-wider rounded-full" style={{ background: `${plan.color}15`, color: plan.color }}>{plan.savings}</span>}
                  </div>
                  <button onClick={() => handleSubscribe(plan.id)} disabled={!!loading} className="w-full py-2 text-sm font-semibold rounded-lg transition-colors mb-3 landing-body" style={{ background: plan.color, color: '#fff' }}>{loading === plan.id ? <Icon name="loader" size={18} className="animate-spin mx-auto" /> : plan.cta}</button>
                  <ul className="space-y-1 mt-auto">
                    {plan.features.map((feature, j) => (<li key={j} className="flex items-start gap-1.5 text-xs text-gray-600 landing-body"><svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{feature}</li>))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400 landing-mono mt-4 tracking-wide">30-day money-back guarantee -- Secure payment via Stripe -- No auto-renewal</p>
        </div>
      </section>

      <section className="px-6 md:px-12 py-6"><div className="max-w-5xl mx-auto"><button onClick={() => setShowComparison(true)} className="w-full p-4 rounded-xl text-center transition-all hover:shadow-md" style={{ background: 'linear-gradient(135deg, #111827, #1f2937)', border: '1px solid #374151' }}><div className="text-lg font-extrabold text-white landing-display">Why Pay <span style={{ color: '#f87171', textDecoration: 'line-through' }}>$299/mo</span> When You Can Pay <span style={{ color: '#34d399' }}>$29-99/mo</span>?</div><p className="text-sm mt-1" style={{ color: '#9ca3af' }}>See how we compare to InterviewCoder, Educative, DesignGurus, and more</p><span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#10b981', color: '#fff' }}>View Full Comparison<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></span></button></div></section>

      <CompetitorComparison isOpen={showComparison} onClose={() => setShowComparison(false)} />

      <section id="features" className="px-6 md:px-12 py-8 md:py-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-5"><span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Included</span><h2 className="landing-display font-bold text-2xl md:text-3xl mt-1 tracking-tight text-gray-900">Everything You Need. <span className="text-gray-400">In Every Plan.</span></h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {whatsIncluded.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="w-8 h-8 border border-emerald-200 bg-emerald-50 rounded flex items-center justify-center flex-shrink-0 mt-0.5"><Icon name={item.icon} size={14} className="text-emerald-500" /></div>
                <div className="min-w-0"><h3 className="landing-display font-semibold text-sm text-gray-900">{item.title}</h3><p className="text-xs text-gray-500 leading-snug landing-body">{item.desc}</p><div className="mt-1.5 flex flex-wrap gap-1">{item.tags.map(t => (<span key={t} className="text-[10px] landing-mono px-1.5 py-0.5 border border-gray-200 text-gray-400 rounded">{t}</span>))}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 md:px-12 py-8 md:py-10 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-5"><span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">FAQ</span><h2 className="landing-display font-bold text-2xl md:text-3xl mt-1 tracking-tight text-gray-900">Common Questions</h2></div>
          <div className="space-y-1.5">
            {faqItems.map((faq, i) => (
              <div key={i} className={`border rounded-lg bg-white transition-all ${expandedFaq === i ? 'border-gray-300 shadow-sm' : 'border-gray-200'}`}>
                <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full px-4 py-3 flex items-center justify-between text-left"><span className="text-sm font-semibold text-gray-900 pr-4 landing-body">{faq.q}</span><svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expandedFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                <div className={`overflow-hidden transition-all duration-200 ${expandedFaq === i ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}><div className="px-5 pb-4"><p className="text-sm text-gray-500 leading-relaxed landing-body">{faq.a}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 md:px-12 py-3" style={{ background: '#111827' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2"><div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center"><Icon name="ascend" size={12} className="text-white" /></div><span className="landing-display font-bold text-sm text-white">Ascend</span></a>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[{ label: 'Apply', href: '/jobs' }, { label: 'Prepare', href: '/capra/prepare' }, { label: 'Practice', href: '/capra/practice' }, { label: 'Attend', href: '/lumora' }, { label: 'Pricing', href: '/pricing' }, { label: 'Support', href: 'mailto:support@cariara.com' }].map((link) => (
              <a key={link.label} href={link.href} className="text-xs text-gray-400 hover:text-emerald-400 transition-colors landing-body font-medium">{link.label}</a>
            ))}
          </div>
          <p className="text-xs text-gray-500 landing-mono">&copy; {new Date().getFullYear()} Ascend by Cariara</p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        .landing-root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-body { font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-mono { font-family: 'IBM Plex Mono', monospace; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
