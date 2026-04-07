import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import { useAuth } from '../contexts/AuthContext';

/* ── Constants ────────────────────────────────────────────── */
const CHALLENGE_START = new Date('2026-05-07T00:00:00Z');
const CHALLENGE_END = new Date('2026-10-07T23:59:59Z');

const PRIZES = [
  { place: '1st', title: 'Grand Champion', amount: '$11,116', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '#fbbf24', desc: 'Best overall contributor.' },
  { place: '2nd', title: 'Runner Up', amount: '$5,116', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', border: '#94a3b8', desc: 'Outstanding contributions.' },
  { place: '3rd-7th', title: 'Top Contributor', amount: '$1,116 ea.', gradient: 'linear-gradient(135deg, #d97706, #b45309)', border: '#d97706', desc: '5 winners for meaningful contributions.', winners: 5 },
];

const CATEGORIES = [
  { title: 'Bug Hunting', color: '#ef4444', icon: '🐛', examples: ['Runtime crashes', 'Auth bypass', 'Race conditions'] },
  { title: 'UX / Design', color: '#8b5cf6', icon: '🎨', examples: ['Broken mobile layouts', 'Missing ARIA', 'Inconsistent UI'] },
  { title: 'Performance', color: '#f59e0b', icon: '⚡', examples: ['N+1 queries', 'Re-renders', 'Large assets'] },
  { title: 'Infrastructure', color: '#06b6d4', icon: '🏗️', examples: ['Health checks', 'Env misconfigs', 'Docker'] },
  { title: 'New Features', color: '#10b981', icon: '✨', examples: ['Spaced repetition', 'Recording', 'Collaboration'] },
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
  { num: '01', title: 'Sign up free', desc: 'Create your Camora account.' },
  { num: '02', title: 'Get GitHub access', desc: 'Full monorepo access after launch.' },
  { num: '03', title: 'Find & build', desc: 'Hunt bugs, fix issues, build features.' },
  { num: '04', title: 'Submit findings', desc: 'Detailed docs with your work.' },
  { num: '05', title: 'Team review', desc: 'Top submissions reviewed by founders.' },
  { num: '06', title: 'Win & join', desc: 'Prizes + founding team offers.' },
];

const SCORING = [
  { category: 'Critical Bugs', points: '10 pts', color: '#ef4444' },
  { category: 'Security Issues', points: '8 pts', color: '#f97316' },
  { category: 'UX / Design', points: '5 pts', color: '#8b5cf6' },
  { category: 'Performance', points: '5 pts', color: '#f59e0b' },
  { category: 'Infrastructure', points: '5 pts', color: '#06b6d4' },
  { category: 'Features', points: '3-10 pts', color: '#10b981' },
];

const FAQS = [
  { q: 'Do I need to be a full-time developer?', a: 'No — open to all levels: students, bootcamp grads, career changers, and senior engineers.' },
  { q: 'Can I participate from any country?', a: 'Yes. Remote-first, globally distributed prizes.' },
  { q: 'What tech stack does Camora use?', a: 'React 19, Express 5, PostgreSQL, Python (FastAPI), Vercel + Railway.' },
  { q: 'When do I get GitHub access?', a: 'After creating your account and the challenge officially starts May 7, 2026.' },
  { q: 'Can I work on multiple categories?', a: 'Yes — more high-quality findings means a higher score.' },
  { q: 'Is destructive testing allowed?', a: 'No. All testing must be non-destructive. No DDoS, data deletion, or production attacks.' },
];

const BENEFITS = [
  'Remote-first', 'Equity / stock options', 'Lifetime platform access', 'Full GitHub access',
  'AI/ML stack', 'Shape product direction', 'Competitive salary', 'Flexible async culture',
];

/* ── Countdown Hook ───────────────────────────────────────── */
function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
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

/* ── FAQ Accordion ────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ background: open ? '#f9fafb' : '#fff' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-gray-900 hover:bg-gray-50 transition-colors" aria-expanded={open}>
        {q}
        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="px-4 pb-3 text-xs text-gray-600 leading-relaxed">{a}</div>}
    </div>
  );
}

/* ── Section Header ───────────────────────────────────────── */
function SectionHead({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-8">
      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{tag}</p>
      <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
      {sub && <p className="mt-1.5 text-sm text-gray-500 max-w-lg mx-auto">{sub}</p>}
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

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <SiteNav />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden pt-14" style={{ minHeight: '60vh' }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative w-full lg:max-w-[65%] mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(60vh - 56px)', paddingTop: 32, paddingBottom: 32 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase mb-4" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Bug Bounty + Hiring Challenge
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            The Camora <span style={{ background: 'linear-gradient(135deg, #10b981, #6366f1, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Challenge</span>
          </h1>
          <p className="mt-3 text-base text-gray-600 max-w-lg">Find bugs. Build features. Win prizes. Join the founding team.</p>

          {/* Countdown */}
          <div className="mt-6 flex items-center gap-2 sm:gap-3">
            {challengeEnded ? (
              <p className="text-sm font-semibold text-gray-500">Challenge ended. Winners announced soon.</p>
            ) : challengeActive ? (
              <p className="text-sm font-semibold text-emerald-600">Challenge is live! Submit findings now.</p>
            ) : (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Starts in</p>
                {[
                  { val: countdown.days, label: 'D' },
                  { val: countdown.hours, label: 'H' },
                  { val: countdown.minutes, label: 'M' },
                  { val: countdown.seconds, label: 'S' },
                ].map((u) => (
                  <div key={u.label} className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center text-lg font-extrabold text-gray-900" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      {String(u.val).padStart(2, '0')}
                    </div>
                    <span className="mt-0.5 text-[9px] font-bold text-gray-400">{u.label}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-6 flex items-center gap-3">
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {isAuthenticated ? 'Go to Dashboard' : 'Start Challenge'}
            </Link>
            <a href="#rules" className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-white/60 transition-all" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)' }}>
              Rules
            </a>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="text-xs text-gray-500">Prize Pool</span>
            <span className="text-lg font-extrabold text-gray-900">$21,812</span>
          </div>
        </div>
      </section>

      {/* ═══ PRIZES ═══ */}
      <section className="py-12 px-4 sm:px-6" style={{ background: 'rgba(250,250,250,0.6)' }}>
        <div className="w-full lg:max-w-[65%] mx-auto">
          <SectionHead tag="Rewards" title="Prize Pool" sub="7 winners total." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRIZES.map((p) => (
              <div key={p.place} className="relative rounded-xl p-[1px] hover:-translate-y-0.5 transition-transform" style={{ background: p.gradient }}>
                <div className="bg-white rounded-xl p-5 h-full flex flex-col items-center text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: p.border }}>{p.place}</p>
                  <p className="text-2xl font-extrabold text-gray-900">{p.amount}</p>
                  <p className="text-xs font-bold text-gray-700 mb-1">{p.title}</p>
                  {p.winners && <p className="text-[10px] text-gray-400">({p.winners} winners)</p>}
                  <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOUNDING TEAM ═══ */}
      <section className="py-12 px-4 sm:px-6">
        <div className="w-full lg:max-w-[65%] mx-auto">
          <SectionHead tag="Opportunity" title="Join the Founding Team" sub="Top performers receive founding or core engineer offers." />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl p-[1px]" style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}>
              <div className="bg-white rounded-xl p-5 h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(16,185,129,0.1)' }}>⭐</div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Founding Engineers</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold">5 positions</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {['Competitive salary + significant equity', 'Remote-first, async culture', 'Build core platform from day one', 'Direct product influence', 'Full AI/ML stack'].map(b => (
                    <li key={b} className="flex items-start gap-1.5"><span className="text-emerald-500 mt-px">&#10003;</span>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(99,102,241,0.1)' }}>👥</div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Core Engineers</h3>
                  <p className="text-[10px] text-indigo-600 font-semibold">10 positions</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600">
                {['Competitive salary + stock options', 'Mentorship from founding team', 'Clear growth trajectory', 'Remote-first, flexible hours', 'Growth potential'].map(b => (
                  <li key={b} className="flex items-start gap-1.5"><span className="text-indigo-500 mt-px">&#10003;</span>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Benefits</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />{b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES + SCORING ═══ */}
      <section className="py-12 px-4 sm:px-6" style={{ background: 'rgba(250,250,250,0.6)' }}>
        <div className="w-full lg:max-w-[65%] mx-auto">
          <SectionHead tag="Categories" title="What We're Looking For" sub="Five categories, scored by severity and quality." />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{c.icon}</span>
                  <h3 className="text-sm font-bold text-gray-900">{c.title}</h3>
                </div>
                <div className="space-y-1">
                  {c.examples.map((e) => (
                    <p key={e} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: c.color }} />{e}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Scoring */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">📊 Scoring</h3>
              <div className="space-y-1.5">
                {SCORING.map((s) => (
                  <div key={s.category} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{s.category}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${s.color}15`, color: s.color }}>{s.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-12 px-4 sm:px-6">
        <div className="w-full lg:max-w-[65%] mx-auto">
          <SectionHead tag="Process" title="How It Works" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <span className="text-[10px] font-extrabold w-5 h-5 rounded inline-flex items-center justify-center mb-1.5" style={{ background: i < 2 ? 'rgba(16,185,129,0.1)' : i < 4 ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)', color: i < 2 ? '#059669' : i < 4 ? '#6366f1' : '#d97706' }}>
                  {s.num}
                </span>
                <h3 className="text-xs font-bold text-gray-900 mb-0.5">{s.title}</h3>
                <p className="text-[10px] text-gray-500 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TECH STACK ═══ */}
      <section className="py-8 px-4 sm:px-6">
        <div className="w-full lg:max-w-[65%] mx-auto text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3">Built With</p>
          <div className="flex flex-wrap justify-center gap-4">
            {TECH_STACK.map((t) => (
              <div key={t.name} className="flex flex-col items-center gap-1 w-14">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <img src={t.logo} alt={t.name} width={24} height={24} style={{ objectFit: 'contain' }} />
                </div>
                <span className="text-[9px] font-medium text-gray-400">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LEADERBOARD ═══ */}
      <section className="py-12 px-4 sm:px-6" style={{ background: 'rgba(250,250,250,0.6)' }}>
        <div className="w-full lg:max-w-[65%] mx-auto">
          <SectionHead tag="Rankings" title="Leaderboard" sub={challengeActive ? 'Live standings updated as submissions are reviewed.' : 'Rankings appear when the challenge begins May 7, 2026.'} />

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Name</div>
              <div className="col-span-3 text-center">Findings</div>
              <div className="col-span-3 text-right">Score</div>
            </div>
            {[1, 2, 3, 4, 5].map((rank) => (
              <div key={rank} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-b border-gray-50 last:border-0">
                <div className="col-span-1 text-xs font-bold text-gray-300">{rank}</div>
                <div className="col-span-5"><div className="h-2.5 rounded-full w-20" style={{ background: '#f1f5f9' }} /></div>
                <div className="col-span-3 text-center"><div className="h-2.5 rounded-full w-6 mx-auto" style={{ background: '#f1f5f9' }} /></div>
                <div className="col-span-3 flex justify-end"><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Pending</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RULES ═══ */}
      <section id="rules" className="py-12 px-4 sm:px-6">
        <div className="w-full lg:max-w-[65%] mx-auto">
          <SectionHead tag="Guidelines" title="Rules" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Eligibility', color: '#10b981', items: ['Open to all developers worldwide', 'No prior Camora experience required', 'Must create a free account', 'One submission per finding'] },
              { title: 'Submission Format', color: '#6366f1', items: ['Clear title + severity level', 'Steps to reproduce', 'Suggested fix or plan', 'Screenshots when applicable'] },
              { title: 'Timeline', color: '#f59e0b', items: ['Start: May 7, 2026', 'End: October 7, 2026', 'Review: May 15-21, 2026', 'Winners: May 22, 2026'] },
              { title: 'Judging', color: '#ef4444', items: ['Internal team review', 'Code quality + docs are key', 'Original work only', 'Responsible disclosure required'] },
            ].map((r) => (
              <div key={r.title} className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />{r.title}
                </h3>
                <ul className="space-y-1 text-xs text-gray-600">
                  {r.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-12 px-4 sm:px-6" style={{ background: 'rgba(250,250,250,0.6)' }}>
        <div className="w-full lg:max-w-[55%] mx-auto">
          <SectionHead tag="FAQ" title="Questions" />
          <div className="space-y-2">
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-14 px-4 sm:px-6">
        <div className="w-full lg:max-w-[55%] mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Ready to take the challenge?</h2>
          <p className="mt-2 text-sm text-gray-500">$21,812 in prizes + founding team spots.</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
            </Link>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="text-[10px] text-gray-400">Share:</span>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('The Camora Challenge — $21,812 in prizes + founding team offers!')}&url=${encodeURIComponent('https://camora.cariara.com/challenge')}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Share on Twitter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://camora.cariara.com/challenge')}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Share on LinkedIn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
