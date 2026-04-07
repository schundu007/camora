import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import { useAuth } from '../contexts/AuthContext';

/* ── Constants ────────────────────────────────────────────── */
const CHALLENGE_START = new Date('2026-05-07T00:00:00Z');
const CHALLENGE_END = new Date('2026-10-07T23:59:59Z');

const PRIZES = [
  { place: '1st Place', logo: '/logos/github.png', title: 'Grand Champion', amount: '$11,116', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '#fbbf24', desc: 'Best overall contributor. Exceptional bug reports, code quality, and documentation.' },
  { place: '2nd Place', logo: '/logos/react.png', title: 'Runner Up', amount: '$5,116', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', border: '#94a3b8', desc: 'Outstanding contributions with significant impact. High-quality findings.' },
  { place: '3rd-7th Place', logo: '/logos/nodejs.png', title: 'Top Contributor', amount: '$1,116 each', gradient: 'linear-gradient(135deg, #d97706, #b45309)', border: '#d97706', desc: '5 winners for meaningful contributions across any category.', winners: 5 },
];

const CATEGORIES = [
  { logo: '/logos/sentry.png', title: 'Bug Hunting', color: '#ef4444', desc: 'Runtime crashes, logic errors, security vulnerabilities across the full stack.', examples: ['Unhandled promise rejections', 'Auth bypass gaps', 'Race conditions'] },
  { logo: '/logos/figma.png', title: 'UX / Design', color: '#8b5cf6', desc: 'Mobile responsiveness, accessibility, design consistency, UX flows.', examples: ['Broken mobile layouts', 'Missing ARIA labels', 'Inconsistent typography'] },
  { logo: '/logos/react.png', title: 'Performance', color: '#f59e0b', desc: 'Slow queries, memory leaks, bundle size optimization, bottlenecks.', examples: ['N+1 query patterns', 'Unnecessary re-renders', 'Large unoptimized assets'] },
  { logo: '/logos/docker.png', title: 'Infrastructure', color: '#06b6d4', desc: 'Deployment, CI/CD, monitoring, scaling, and DevOps improvements.', examples: ['Missing health checks', 'Env var misconfigs', 'Docker optimization'] },
  { logo: '/logos/typescript.png', title: 'New Features', color: '#10b981', desc: 'Innovative feature proposals with implementation plan, tests, and docs.', examples: ['Spaced repetition', 'Interview recording', 'Team collaboration'] },
];

const TECH_STACK = [
  { name: 'React 19', logo: '/logos/react.png' },
  { name: 'TypeScript', logo: '/logos/typescript.png' },
  { name: 'Node.js', logo: '/logos/nodejs.png' },
  { name: 'PostgreSQL', logo: '/logos/postgresql.png' },
  { name: 'Python', logo: '/logos/python.png' },
  { name: 'Docker', logo: '/logos/docker.png' },
  { name: 'Vercel', logo: '/logos/vercel.png' },
  { name: 'Railway', logo: '/logos/railway.png' },
  { name: 'Claude AI', logo: '/logos/anthropic.png' },
  { name: 'OpenAI', logo: '/logos/openai.png' },
];

const STEPS = [
  { num: '01', title: 'Sign up for free', desc: 'Create your free Camora account to get started.' },
  { num: '02', title: 'Get GitHub access', desc: 'Receive access to the full monorepo after the challenge begins.' },
  { num: '03', title: 'Find and build', desc: 'Hunt bugs, fix issues, build features, and document everything.' },
  { num: '04', title: 'Submit findings', desc: 'Submit your work via the platform with detailed documentation.' },
  { num: '05', title: 'Team review', desc: 'Top submissions are reviewed by the founding team for quality and impact.' },
  { num: '06', title: 'Win and join', desc: 'Winners get prizes, and top performers receive founding team offers.' },
];

const SCORING = [
  { category: 'Critical Bugs', points: '10 pts', color: '#ef4444' },
  { category: 'Security Issues', points: '8 pts', color: '#f97316' },
  { category: 'UX / Design Fixes', points: '5 pts', color: '#8b5cf6' },
  { category: 'Performance Improvements', points: '5 pts', color: '#f59e0b' },
  { category: 'Infrastructure', points: '5 pts', color: '#06b6d4' },
  { category: 'Feature Proposals', points: '3-10 pts', color: '#10b981' },
];

const FAQS = [
  { q: 'Do I need to be a full-time developer?', a: 'No. The challenge is open to developers of all experience levels — students, bootcamp grads, career changers, and senior engineers alike.' },
  { q: 'Can I participate from any country?', a: 'Yes. Camora is remote-first and the challenge is open to developers worldwide. Prizes are distributed globally.' },
  { q: 'What tech stack does Camora use?', a: 'React 19, Express 5, PostgreSQL, Python (FastAPI), deployed on Vercel + Railway. TypeScript frontend, JavaScript backends.' },
  { q: 'Will I get GitHub access immediately?', a: 'You will receive GitHub access after creating your account and once the challenge officially starts on May 7, 2026.' },
  { q: 'Can I work on multiple categories?', a: 'Absolutely. You are encouraged to contribute across all categories. More high-quality findings and features mean a higher total score.' },
  { q: 'How are ties broken?', a: 'In the event of a tie, documentation quality, code quality, and breadth of contributions are used as tiebreakers.' },
  { q: 'Is destructive testing allowed?', a: 'No. All testing must be non-destructive. Do not attempt DDoS, data deletion, or any action that could harm the production platform.' },
];

const BENEFITS = [
  'Remote-first — work from anywhere',
  'Equity / stock options for founding engineers',
  'Free lifetime platform access',
  'Full GitHub monorepo access',
  'Work with cutting-edge AI/ML stack',
  'Shape product direction from day one',
  'Competitive salary packages',
  'Flexible hours and async culture',
];

/* ── Countdown Hook ───────────────────────────────────────── */
function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

/* ── FAQ Accordion Item ───────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-all" style={{ background: open ? '#f9fafb' : '#fff' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        {q}
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{a}</div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function ChallengePage() {
  const { isAuthenticated } = useAuth();
  const countdown = useCountdown(CHALLENGE_START);
  const now = new Date();
  const challengeActive = now >= CHALLENGE_START && now <= CHALLENGE_END;
  const challengeEnded = now > CHALLENGE_END;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <SiteNav />

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden pt-14"
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ede9fe 35%, #e0f2fe 65%, #fef3c7 100%)',
          minHeight: '80vh',
        }}
      >
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(80vh - 56px)', paddingTop: '48px', paddingBottom: '48px' }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-6" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Bug Bounty + Hiring Challenge
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08]">
            The Camora<br />
            <span style={{ background: 'linear-gradient(135deg, #10b981, #6366f1, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Challenge
            </span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed">
            Find bugs. Build features. Win prizes. Join the founding team.
          </p>

          {/* Countdown */}
          <div className="mt-8 flex items-center gap-3 sm:gap-5">
            {challengeEnded ? (
              <p className="text-base font-semibold text-gray-500">Challenge has ended. Winners announced soon.</p>
            ) : challengeActive ? (
              <p className="text-base font-semibold text-emerald-600">Challenge is live now! Submit your findings.</p>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Starts in</p>
                {[
                  { val: countdown.days, label: 'Days' },
                  { val: countdown.hours, label: 'Hrs' },
                  { val: countdown.minutes, label: 'Min' },
                  { val: countdown.seconds, label: 'Sec' },
                ].map((u) => (
                  <div key={u.label} className="flex flex-col items-center">
                    <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-gray-900" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      {String(u.val).padStart(2, '0')}
                    </div>
                    <span className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{u.label}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            {isAuthenticated ? (
              <Link to="/capra/prepare" className="px-7 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/signup" className="px-7 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                Start Challenge
              </Link>
            )}
            <button onClick={() => scrollTo('rules')} className="px-7 py-3 rounded-xl text-sm font-bold text-gray-700 transition-all hover:bg-white/60" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)' }}>
              View Rules
            </button>
          </div>

          {/* Total prize pool */}
          <div className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="text-sm text-gray-500">Total Prize Pool</span>
            <span className="text-xl font-extrabold text-gray-900">$21,812</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRIZES SECTION
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ background: '#fafafa' }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Rewards</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Prize Pool</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Generous rewards for outstanding contributors. 7 winners total.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRIZES.map((p) => (
              <div
                key={p.place}
                className="relative rounded-2xl p-[1px] transition-transform hover:-translate-y-1"
                style={{ background: p.gradient }}
              >
                <div className="bg-white rounded-2xl p-7 h-full flex flex-col items-center text-center">
                  <img src={p.logo} alt={p.title} width={48} height={48} style={{ objectFit: 'contain', marginBottom: 12 }} />
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: p.border }}>{p.place}</p>
                  <p className="text-3xl font-extrabold text-gray-900 mb-1">{p.amount}</p>
                  <p className="text-sm font-bold text-gray-700 mb-3">{p.title}</p>
                  {p.winners && <p className="text-xs text-gray-400 mb-3">({p.winners} winners)</p>}
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOUNDING TEAM OFFER
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Opportunity</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Join the Founding Team</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Top challenge performers will receive offers to join Camora as founding or core engineers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Founding Engineers */}
            <div className="rounded-2xl p-[1px]" style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}>
              <div className="bg-white rounded-2xl p-7 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Founding Engineers</h3>
                    <p className="text-xs text-emerald-600 font-semibold">5 positions</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Competitive salary + significant equity</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Remote-first, async culture</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Build core platform from day one</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Direct influence on product direction</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">&#10003;</span> Work across the full AI/ML stack</li>
                </ul>
              </div>
            </div>

            {/* Core Engineers */}
            <div className="rounded-2xl border border-gray-200 p-7 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Core Engineers</h3>
                  <p className="text-xs text-indigo-600 font-semibold">10 positions</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">&#10003;</span> Competitive salary package</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">&#10003;</span> Stock options with growth potential</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">&#10003;</span> Mentorship from founding team</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">&#10003;</span> Clear growth trajectory</li>
                <li className="flex items-start gap-2"><span className="text-indigo-500 mt-0.5">&#10003;</span> Remote-first, flexible hours</li>
              </ul>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Benefits for all team members</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          WHAT WE'RE LOOKING FOR
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ background: '#fafafa' }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Categories</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">What We're Looking For</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Contribute across five categories. Each finding is scored based on severity and quality.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl border border-gray-200 p-6 transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${c.color}15` }}>
                    <img src={c.logo} alt={c.title} width={24} height={24} style={{ objectFit: 'contain' }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{c.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{c.desc}</p>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Example findings</p>
                  {c.examples.map((e) => (
                    <p key={e} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: c.color }} />
                      {e}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Scoring card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">Scoring</h3>
              </div>
              <div className="space-y-2.5">
                {SCORING.map((s) => (
                  <div key={s.category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{s.category}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: `${s.color}15`, color: s.color }}>{s.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Process</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">How It Works</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Six simple steps from signup to winning prizes and joining the team.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative bg-white rounded-2xl border border-gray-200 p-6 transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-extrabold w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: i < 2 ? 'rgba(16,185,129,0.1)' : i < 4 ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)', color: i < 2 ? '#059669' : i < 4 ? '#6366f1' : '#d97706' }}>
                    {s.num}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">{s.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TECH STACK
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6">
        <div className="w-full lg:max-w-[70%] mx-auto text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Built With</p>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-8">Our Tech Stack</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {TECH_STACK.map((t) => (
              <div key={t.name} className="flex flex-col items-center gap-2 w-20">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <img src={t.logo} alt={t.name} width={32} height={32} style={{ objectFit: 'contain' }} />
                </div>
                <span className="text-[11px] font-medium text-gray-500">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          LEADERBOARD (PLACEHOLDER)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ background: '#fafafa' }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Rankings</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Leaderboard</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              {challengeActive
                ? 'Live standings updated as submissions are reviewed.'
                : 'Rankings will appear once the challenge begins on May 7, 2026.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2 text-center">Findings</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-3 text-right">Status</div>
            </div>

            {/* Placeholder rows */}
            {[1, 2, 3, 4, 5].map((rank) => (
              <div key={rank} className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-b border-gray-50 last:border-0">
                <div className="col-span-1 text-sm font-bold text-gray-300">{rank}</div>
                <div className="col-span-4">
                  <div className="h-3 rounded-full w-24" style={{ background: '#f1f5f9' }} />
                </div>
                <div className="col-span-2 text-center">
                  <div className="h-3 rounded-full w-8 mx-auto" style={{ background: '#f1f5f9' }} />
                </div>
                <div className="col-span-2 text-center">
                  <div className="h-3 rounded-full w-10 mx-auto" style={{ background: '#f1f5f9' }} />
                </div>
                <div className="col-span-3 flex justify-end">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          RULES
          ═══════════════════════════════════════════════════════ */}
      <section id="rules" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Guidelines</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Eligibility */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
                Eligibility
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Open to all developers worldwide</li>
                <li>No prior experience with Camora required</li>
                <li>Must create a free Camora account</li>
                <li>One submission per finding (no duplicates)</li>
              </ul>
            </div>

            {/* Submission Format */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                Submission Format
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Clear title describing the finding</li>
                <li>Severity level (Critical / High / Medium / Low)</li>
                <li>Steps to reproduce the issue</li>
                <li>Suggested fix or implementation plan</li>
                <li>Screenshots or recordings when applicable</li>
              </ul>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Timeline
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><span className="font-semibold text-gray-900">Start:</span> May 7, 2026</li>
                <li><span className="font-semibold text-gray-900">End:</span> October 7, 2026</li>
                <li><span className="font-semibold text-gray-900">Review period:</span> May 15 - May 21, 2026</li>
                <li><span className="font-semibold text-gray-900">Winners announced:</span> May 22, 2026</li>
              </ul>
            </div>

            {/* Judging & Terms */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Judging &amp; Terms
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Internal team review of all submissions</li>
                <li>Code quality and documentation are key factors</li>
                <li>All work must be original (no plagiarism)</li>
                <li>No destructive testing or attacks on production</li>
                <li>Responsible disclosure required for security issues</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6" style={{ background: '#fafafa' }}>
        <div className="w-full lg:max-w-[70%] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Questions</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA FOOTER
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="w-full lg:max-w-[70%] mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Ready to take the challenge?
          </h2>
          <p className="mt-3 text-gray-500 max-w-md mx-auto">
            Join hundreds of developers competing for $21,812 in prizes and a spot on the founding team.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link to="/capra/prepare" className="px-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/signup" className="px-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                Create Free Account
              </Link>
            )}
          </div>

          {/* Social share */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className="text-xs text-gray-400 font-medium">Share:</span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('The Camora Challenge is live! $21,812 in prizes + founding team offers for finding bugs and building features. Check it out:')}&url=${encodeURIComponent('https://camora.cariara.com/challenge')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Share on Twitter"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://camora.cariara.com/challenge')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Share on LinkedIn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
