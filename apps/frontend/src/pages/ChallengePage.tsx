import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/authHeaders.js';
import ReferralDashboard from '../components/capra/features/ReferralDashboard';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const QUIZ_QUESTIONS = [
  { q: 'Distributed Rate Limiter', desc: 'Design and implement a token-bucket rate limiter that works across multiple server instances using Redis. Handle clock skew, race conditions on token refill, and burst allowance. Provide the core algorithm with atomic operations.' },
  { q: 'CRDT-Based Collaborative Counter', desc: 'Implement a conflict-free replicated data type (CRDT) for a distributed counter that supports increment/decrement across nodes with eventual consistency. Handle network partitions and merges without coordination.' },
  { q: 'LRU Cache with TTL & Write-Behind', desc: 'Build an LRU cache that supports per-key TTL expiration and write-behind (lazy persistence). Handle concurrent reads/writes, eviction under memory pressure, and guarantee no data loss on crash for pending writes.' },
  { q: 'Event Sourcing Snapshot System', desc: 'Design an event sourcing system with periodic snapshots. Implement the snapshot creation, event replay from snapshot, and compaction strategy. Handle schema evolution of events across versions.' },
  { q: 'Consistent Hashing with Virtual Nodes', desc: 'Implement consistent hashing with virtual nodes for a distributed cache. Support node addition/removal with minimal key redistribution. Handle hotspot detection and automatic rebalancing when a node is overloaded.' },
  { q: 'Merkle Tree Sync Protocol', desc: 'Implement a Merkle tree-based anti-entropy protocol for detecting and repairing data inconsistencies between database replicas. Minimize network bandwidth by only transferring divergent subtrees.' },
  { q: 'Circuit Breaker with Adaptive Thresholds', desc: 'Implement a circuit breaker pattern with adaptive failure thresholds using exponential moving averages. Support half-open state with gradual traffic restoration, per-endpoint isolation, and fallback cascading.' },
  { q: 'Raft Leader Election', desc: 'Implement the leader election portion of the Raft consensus protocol. Handle term management, vote requests/responses, split-brain prevention, and leader heartbeats with proper timeout randomization.' },
  { q: 'Lock-Free Concurrent Queue', desc: 'Implement a lock-free multi-producer multi-consumer bounded queue using compare-and-swap operations. Handle the ABA problem, memory ordering, and back-pressure when the queue is full.' },
  { q: 'Bloom Filter with Counting Deletes', desc: 'Implement a counting Bloom filter that supports both insertions and deletions with configurable false-positive rate. Provide the optimal hash function count calculation and handle counter overflow gracefully.' },
  { q: 'Write-Ahead Log with Checksums', desc: 'Implement a write-ahead log (WAL) with CRC32 checksums for crash recovery. Handle partial writes, log compaction, and replay with corruption detection. Support concurrent appenders with proper ordering.' },
  { q: 'Sharded Job Scheduler', desc: 'Design a distributed job scheduler where jobs are sharded across workers using consistent hashing. Handle worker failures with job reassignment, exactly-once execution guarantees, and priority-based scheduling with starvation prevention.' },
];

/* ── Constants ────────────────────────────────────────────── */
const CHALLENGE_START = new Date('2026-05-07T00:00:00Z');
const CHALLENGE_END = new Date('2026-10-07T23:59:59Z');

const PRIZES = [
  { place: '1st', title: 'Grand Champion', amount: '$11,116', glow: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)', desc: 'Best overall contributor.' },
  { place: '2nd', title: 'Runner Up', amount: '$5,116', glow: '#94a3b8', gradient: 'linear-gradient(135deg, #e2e8f0, #94a3b8, #64748b)', desc: 'Outstanding contributions.' },
  { place: '3rd-7th', title: 'Top Contributor', amount: '$1,116 ea.', glow: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #b45309, #92400e)', desc: '5 winners for meaningful contributions.', winners: 5 },
];

const CATEGORIES = [
  { title: 'Bug Hunting', color: '#ef4444', glow: 'rgba(239,68,68,0.3)', logo: '/logos/sentry.png', examples: ['Runtime crashes', 'Auth bypass', 'Race conditions'] },
  { title: 'UX / Design', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', logo: '/logos/figma.png', examples: ['Broken mobile layouts', 'Missing ARIA', 'Inconsistent UI'] },
  { title: 'Performance', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', logo: '/logos/react.png', examples: ['N+1 queries', 'Re-renders', 'Large assets'] },
  { title: 'Infrastructure', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)', logo: '/logos/docker.png', examples: ['Health checks', 'Env misconfigs', 'Docker'] },
  { title: 'New Features', color: '#10b981', glow: 'rgba(16,185,129,0.3)', logo: '/logos/typescript.png', examples: ['Spaced repetition', 'Recording', 'Collaboration'] },
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
  { num: '01', title: 'Sign up free', desc: 'Create your Camora account.', color: '#10b981' },
  { num: '02', title: 'Get GitHub access', desc: 'Full monorepo access after launch.', color: '#10b981' },
  { num: '03', title: 'Find & build', desc: 'Hunt bugs, fix issues, build features.', color: '#6366f1' },
  { num: '04', title: 'Submit findings', desc: 'Detailed docs with your work.', color: '#6366f1' },
  { num: '05', title: 'Team review', desc: 'Top submissions reviewed by founders.', color: '#f59e0b' },
  { num: '06', title: 'Win & join', desc: 'Prizes + founding team offers.', color: '#f59e0b' },
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
    <div className="ch-glass-card" style={{ borderColor: open ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left" aria-expanded={open}>
        <span className="text-sm font-semibold text-white/90">{q}</span>
        <svg className={`w-4 h-4 text-emerald-400/60 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && <div className="px-5 pb-4 text-sm text-white/50 leading-relaxed">{a}</div>}
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

  // Challenger state
  const [challengeStatus, setChallengeStatus] = useState<any>(null);
  const [quizPhase, setQuizPhase] = useState<'idle' | 'taking' | 'evaluating' | 'passed' | 'failed'>('idle');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(600);
  const [quizScores, setQuizScores] = useState<number[]>([]);
  const [quizEvaluating, setQuizEvaluating] = useState(false);
  const [submitForm, setSubmitForm] = useState({ title: '', category: 'Bug Hunting', severity: 'Medium', description: '', steps: '', fix: '' });
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${API_URL}/api/challenge/status`, { headers: { ...getAuthHeaders() } })
      .then(r => r.ok ? r.json() : null).then(d => d && setChallengeStatus(d)).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (quizPhase === 'taking' && quizTimeLeft > 0) {
      timerRef.current = setInterval(() => setQuizTimeLeft(t => t <= 1 ? (clearInterval(timerRef.current), finishQuiz(), 0) : t - 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [quizPhase]);

  const startQuiz = () => {
    const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuizQuestions(shuffled);
    setQuizAnswers(new Array(5).fill(''));
    setQuizIdx(0);
    setQuizScores([]);
    setQuizTimeLeft(600);
    setQuizPhase('taking');
  };

  const submitQuizAnswer = useCallback(async () => {
    const q = quizQuestions[quizIdx];
    const answer = quizAnswers[quizIdx];
    setQuizEvaluating(true);
    let score = 0;
    try {
      const evalPrompt = `Coding: ${q.q} — ${q.desc}\n\nAnswer:\n${answer}\n\nScore 0-100. Return ONLY: {"score": number}`;
      const resp = await fetch(API_URL + '/api/solve/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ problem: evalPrompt, provider: 'claude', language: 'auto', detailLevel: 'basic', ascendMode: 'coding' }),
      });
      if (resp.ok) {
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '', result: any = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop()!;
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try { const d = JSON.parse(line.slice(6)); if (d.done && d.result) result = d.result; } catch {}
            }
          }
        }
        if (result) {
          const text = result.code || result.pitch || '';
          const m = text.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
          if (m) { try { score = Math.min(100, Math.max(0, JSON.parse(m[0]).score || 0)); } catch {} }
        }
      }
      if (!score && answer.trim().length > 20) score = 30;
    } catch { score = answer.trim().length > 20 ? 25 : 0; }

    setQuizEvaluating(false);
    const newScores = [...quizScores, score];
    setQuizScores(newScores);

    if (quizIdx < quizQuestions.length - 1) {
      setQuizIdx(quizIdx + 1);
    } else {
      finishQuiz(newScores);
    }
  }, [quizIdx, quizQuestions, quizAnswers, quizScores]);

  const finishQuiz = async (scores?: number[]) => {
    clearInterval(timerRef.current);
    const s = scores || quizScores;
    const avg = s.length > 0 ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;
    setQuizPhase('evaluating');
    try {
      const resp = await fetch(`${API_URL}/api/challenge/qualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ answers: s.map((sc, i) => ({ question: quizQuestions[i]?.q, score: sc })), totalScore: avg }),
      });
      const data = await resp.json();
      if (data.qualified) {
        setQuizPhase('passed');
        setChallengeStatus({ ...challengeStatus, isChallenger: true, quizScore: avg, creditsRemaining: data.creditsGranted || 100 });
      } else {
        setQuizPhase('failed');
      }
    } catch { setQuizPhase('failed'); }
  };

  const handleSubmitFinding = async () => {
    if (!submitForm.title || !submitForm.description) return;
    setSubmitStatus('submitting');
    try {
      const resp = await fetch(`${API_URL}/api/challenge/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ title: submitForm.title, category: submitForm.category, severity: submitForm.severity, description: submitForm.description, stepsToReproduce: submitForm.steps, suggestedFix: submitForm.fix }),
      });
      if (resp.ok) { setSubmitStatus('success'); setSubmitForm({ title: '', category: 'Bug Hunting', severity: 'Medium', description: '', steps: '', fix: '' }); }
      else setSubmitStatus('error');
    } catch { setSubmitStatus('error'); }
  };

  /* ══════════════════════════════════════════════════════════════════
     R E N D E R
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="ch-root">
      <SiteNav />

      {/* ═══ HERO — Dark gradient mesh with floating orbs ═══ */}
      <section className="ch-hero">
        <div className="ch-hero-mesh" />
        <div className="ch-hero-orb ch-orb-1" />
        <div className="ch-hero-orb ch-orb-2" />
        <div className="ch-hero-orb ch-orb-3" />
        <div className="ch-hero-grid" />

        <div className="relative z-10 w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(85vh - 82px)', paddingTop: 48, paddingBottom: 48 }}>
          {/* Badge */}
          <div className="ch-badge">
            <span className="ch-badge-dot" />
            Bug Bounty + Hiring Challenge
          </div>

          <h1 className="ch-hero-title">
            The Camora<br />
            <span className="ch-hero-gradient-text">Challenge</span>
          </h1>
          <p className="mt-5 text-lg text-white/50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Find bugs. Build features. Win prizes. Join the founding team.
          </p>

          {/* Countdown */}
          <div className="mt-10 flex items-center gap-4">
            {challengeEnded ? (
              <p className="text-base font-semibold text-white/40">Challenge ended. Winners announced soon.</p>
            ) : challengeActive ? (
              <p className="text-base font-bold text-emerald-400">Challenge is LIVE. Submit findings now.</p>
            ) : (
              <>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mr-2">Starts in</span>
                {[
                  { val: countdown.days, label: 'DAYS' },
                  { val: countdown.hours, label: 'HRS' },
                  { val: countdown.minutes, label: 'MIN' },
                  { val: countdown.seconds, label: 'SEC' },
                ].map((u) => (
                  <div key={u.label} className="ch-countdown-card">
                    <span className="ch-countdown-num">{String(u.val).padStart(2, '0')}</span>
                    <span className="ch-countdown-label">{u.label}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Prize pool — glowing */}
          <div className="ch-prize-pool-badge">
            <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Total Prize Pool</span>
            <span className="ch-prize-amount">$21,812</span>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex items-center gap-4">
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="ch-cta-primary">
              {isAuthenticated ? 'Go to Dashboard' : 'Start Challenge'}
            </Link>
            <a href="#rules" className="ch-cta-secondary">View Rules</a>
          </div>
        </div>
      </section>

      {/* ═══ QUALIFICATION ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          {!isAuthenticated ? (
            <div className="ch-glass-card text-center py-12 px-6">
              <div className="ch-glow-icon mx-auto mb-4" style={{ '--glow': '#10b981' } as any}>
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to participate?</h3>
              <p className="text-sm text-white/40 mb-6">Create a free account to take the qualification quiz.</p>
              <Link to="/login?redirect=/challenge" className="ch-cta-primary inline-block" style={{ textDecoration: 'none' }}>Sign Up Free</Link>
            </div>
          ) : challengeStatus?.isChallenger ? (
            <div className="ch-glass-card p-6">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="ch-glow-icon" style={{ '--glow': '#10b981' } as any}>
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-emerald-400">Qualified Challenger</span>
                    <span className="text-xs text-white/30 ml-2">Score: {challengeStatus.quizScore}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30">Credits:</span>
                  <div className="w-32 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(challengeStatus.creditsRemaining / 100) * 100}%`, background: challengeStatus.creditsRemaining > 50 ? '#10b981' : challengeStatus.creditsRemaining > 20 ? '#f59e0b' : '#ef4444', boxShadow: `0 0 8px ${challengeStatus.creditsRemaining > 50 ? '#10b981' : challengeStatus.creditsRemaining > 20 ? '#f59e0b' : '#ef4444'}` }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: challengeStatus.creditsRemaining > 50 ? '#10b981' : challengeStatus.creditsRemaining > 20 ? '#f59e0b' : '#ef4444' }}>{challengeStatus.creditsRemaining}/100</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-5">
                <h4 className="text-sm font-bold text-white/80 mb-3">Submit a Finding</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input value={submitForm.title} onChange={e => setSubmitForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="ch-input" />
                  <select value={submitForm.category} onChange={e => setSubmitForm(f => ({ ...f, category: e.target.value }))} className="ch-input">
                    {['Bug Hunting', 'UX / Design', 'Performance', 'Infrastructure', 'New Features'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select value={submitForm.severity} onChange={e => setSubmitForm(f => ({ ...f, severity: e.target.value }))} className="ch-input">
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <textarea value={submitForm.description} onChange={e => setSubmitForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue or feature..." rows={3} className="ch-input w-full mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <textarea value={submitForm.steps} onChange={e => setSubmitForm(f => ({ ...f, steps: e.target.value }))} placeholder="Steps to reproduce..." rows={2} className="ch-input" />
                  <textarea value={submitForm.fix} onChange={e => setSubmitForm(f => ({ ...f, fix: e.target.value }))} placeholder="Suggested fix..." rows={2} className="ch-input" />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleSubmitFinding} disabled={submitStatus === 'submitting'} className="ch-cta-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
                    {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Finding'}
                  </button>
                  {submitStatus === 'success' && <span className="text-xs text-emerald-400 font-medium">Submitted!</span>}
                  {submitStatus === 'error' && <span className="text-xs text-red-400 font-medium">Failed. Try again.</span>}
                </div>
              </div>
            </div>
          ) : quizPhase === 'taking' ? (
            <div className="ch-glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  {quizQuestions.map((_, i) => (
                    <div key={i} className="transition-all duration-300" style={{ width: i === quizIdx ? 24 : 8, height: 8, borderRadius: 99, background: i < quizIdx ? '#10b981' : i === quizIdx ? '#10b981' : 'rgba(255,255,255,0.08)', boxShadow: i <= quizIdx ? '0 0 6px #10b981' : 'none' }} />
                  ))}
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: quizTimeLeft > 300 ? '#10b981' : quizTimeLeft > 120 ? '#f59e0b' : '#ef4444', textShadow: `0 0 12px ${quizTimeLeft > 300 ? '#10b981' : quizTimeLeft > 120 ? '#f59e0b' : '#ef4444'}` }}>
                  {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="p-5 rounded-xl mb-5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Question {quizIdx + 1} of {quizQuestions.length}</span>
                <h3 className="text-lg font-bold text-white mt-1">{quizQuestions[quizIdx]?.q}</h3>
                <p className="text-sm text-white/40 mt-1">{quizQuestions[quizIdx]?.desc}</p>
              </div>
              <textarea
                value={quizAnswers[quizIdx]}
                onChange={e => { const a = [...quizAnswers]; a[quizIdx] = e.target.value; setQuizAnswers(a); }}
                placeholder="Write your solution..."
                className="w-full ch-code-editor"
                autoFocus
                disabled={quizEvaluating}
              />
              <div className="flex items-center gap-3 mt-4">
                <button onClick={submitQuizAnswer} disabled={quizEvaluating} className="ch-cta-primary" style={{ padding: '10px 28px', opacity: quizEvaluating ? 0.6 : 1 }}>
                  {quizEvaluating ? 'Evaluating...' : quizIdx < quizQuestions.length - 1 ? 'Submit & Next' : 'Submit & Finish'}
                </button>
              </div>
            </div>
          ) : quizPhase === 'passed' ? (
            <div className="ch-glass-card text-center py-12">
              <div className="ch-glow-icon mx-auto mb-4" style={{ '--glow': '#10b981', width: 56, height: 56 } as any}>
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">You're Qualified!</h3>
              <p className="text-sm text-white/40 mb-6">100 credits granted. Start submitting.</p>
              <button onClick={() => setChallengeStatus({ ...challengeStatus, isChallenger: true, creditsRemaining: 100 })} className="ch-cta-primary">Start Submitting</button>
            </div>
          ) : quizPhase === 'failed' ? (
            <div className="ch-glass-card text-center py-12">
              <div className="ch-glow-icon mx-auto mb-4" style={{ '--glow': '#ef4444', width: 56, height: 56 } as any}>
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Not Quite Yet</h3>
              <p className="text-sm text-white/40 mb-6">Below 60%. Retry in 24 hours.</p>
              <button onClick={() => setQuizPhase('idle')} className="ch-cta-secondary">Back to Challenge</button>
            </div>
          ) : quizPhase === 'evaluating' ? (
            <div className="ch-glass-card text-center py-12">
              <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
              <p className="text-sm text-white/40">Evaluating your answers...</p>
            </div>
          ) : (
            <div className="ch-glass-card text-center py-12 px-6">
              <div className="ch-glow-icon mx-auto mb-4" style={{ '--glow': '#6366f1' } as any}>
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Qualification Quiz</h3>
              <p className="text-sm text-white/40 mb-6">5 coding questions, 10 minutes. Score 60%+ to unlock.</p>
              {challengeStatus?.lastAttempt && new Date(challengeStatus.lastAttempt).getTime() > Date.now() - 86400000 && (
                <p className="text-xs text-amber-400/80 mb-4">Retry available after 24 hours.</p>
              )}
              <button onClick={startQuiz} className="ch-cta-primary" disabled={challengeStatus?.lastAttempt && new Date(challengeStatus.lastAttempt).getTime() > Date.now() - 86400000}>Take the Quiz</button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ PRIZES — Holographic cards ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag">Rewards</span>
            <h2 className="ch-section-title">Prize Pool</h2>
            <p className="ch-section-sub">7 winners. Real money. Real impact.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRIZES.map((p, i) => (
              <div key={p.place} className="ch-prize-card" style={{ '--prize-glow': p.glow, animationDelay: `${i * 0.1}s` } as any}>
                <div className="ch-prize-card-inner">
                  <div className="ch-prize-rank" style={{ background: p.gradient }}>{p.place}</div>
                  <div className="ch-prize-amount-card">{p.amount}</div>
                  <div className="text-sm font-bold text-white/70 mb-1">{p.title}</div>
                  {p.winners && <div className="text-[10px] text-white/30">({p.winners} winners)</div>}
                  <div className="text-xs text-white/40 mt-2">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOUNDING TEAM ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag" style={{ color: '#818cf8' }}>Opportunity</span>
            <h2 className="ch-section-title">Join the Founding Team</h2>
            <p className="ch-section-sub">Top performers get founding or core engineer offers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="ch-glass-card p-6" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="ch-glow-icon" style={{ '--glow': '#10b981' } as any}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Founding Engineers</h3>
                  <span className="text-[10px] text-emerald-400 font-bold">5 positions</span>
                </div>
              </div>
              <ul className="space-y-2">
                {['Competitive salary + significant equity', 'Remote-first, async culture', 'Build core platform from day one', 'Direct product influence', 'Full AI/ML stack'].map(b => (
                  <li key={b} className="flex items-start gap-2 text-xs text-white/50"><span className="text-emerald-400 mt-px">&#10003;</span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="ch-glass-card p-6" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="ch-glow-icon" style={{ '--glow': '#6366f1' } as any}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Core Engineers</h3>
                  <span className="text-[10px] text-indigo-400 font-bold">10 positions</span>
                </div>
              </div>
              <ul className="space-y-2">
                {['Competitive salary + stock options', 'Mentorship from founding team', 'Clear growth trajectory', 'Remote-first, flexible hours', 'Growth potential'].map(b => (
                  <li key={b} className="flex items-start gap-2 text-xs text-white/50"><span className="text-indigo-400 mt-px">&#10003;</span>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ch-glass-card p-5">
            <h3 className="text-xs font-bold text-white/60 mb-3 uppercase tracking-wider">Benefits</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-2 text-xs text-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" style={{ boxShadow: '0 0 4px #10b981' }} />{b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES — Glowing glass cards ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag">Categories</span>
            <h2 className="ch-section-title">What We're Looking For</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="ch-category-card" style={{ '--cat-color': c.color, '--cat-glow': c.glow } as any}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}>
                    <img src={c.logo} alt={c.title} width={20} height={20} style={{ objectFit: 'contain' }} />
                  </div>
                  <h3 className="text-sm font-bold text-white">{c.title}</h3>
                </div>
                <div className="space-y-1.5">
                  {c.examples.map((e) => (
                    <p key={e} className="text-[11px] text-white/40 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color, boxShadow: `0 0 4px ${c.color}` }} />{e}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Scoring */}
            <div className="ch-glass-card p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                Scoring
              </h3>
              <div className="space-y-2.5">
                {SCORING.map((s) => (
                  <div key={s.category} className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{s.category}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${s.color}18`, color: s.color, boxShadow: `0 0 6px ${s.color}30` }}>{s.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — Connected timeline ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag">Process</span>
            <h2 className="ch-section-title">How It Works</h2>
          </div>
          <div className="ch-timeline">
            {STEPS.map((s, i) => (
              <div key={s.num} className="ch-timeline-step">
                <div className="ch-timeline-node" style={{ '--node-color': s.color } as any}>
                  <span>{s.num}</span>
                </div>
                {i < STEPS.length - 1 && <div className="ch-timeline-line" style={{ background: `linear-gradient(to right, ${s.color}40, ${STEPS[i+1].color}40)` }} />}
                <h3 className="text-xs font-bold text-white mt-3 mb-0.5">{s.title}</h3>
                <p className="text-[10px] text-white/30 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TECH STACK ═══ */}
      <section className="ch-section" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 text-center">
          <span className="ch-section-tag">Built With</span>
          <div className="flex flex-wrap justify-center gap-5 mt-6">
            {TECH_STACK.map((t) => (
              <div key={t.name} className="ch-tech-pill">
                <img src={t.logo} alt={t.name} width={20} height={20} style={{ objectFit: 'contain' }} />
                <span className="text-[10px] font-medium text-white/40">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LEADERBOARD — Dark table ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag" style={{ color: '#f59e0b' }}>Rankings</span>
            <h2 className="ch-section-title">Leaderboard</h2>
            <p className="ch-section-sub">{challengeActive ? 'Live standings.' : 'Rankings appear May 7, 2026.'}</p>
          </div>
          <div className="ch-glass-card overflow-hidden p-0">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-bold text-white/20 uppercase tracking-wider border-b border-white/5">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Challenger</div>
              <div className="col-span-3 text-center">Findings</div>
              <div className="col-span-3 text-right">Score</div>
            </div>
            {[1, 2, 3, 4, 5].map((rank) => (
              <div key={rank} className="grid grid-cols-12 gap-2 px-5 py-3 items-center border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="col-span-1">
                  <span className="text-xs font-bold" style={{ color: rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : 'rgba(255,255,255,0.15)' }}>{rank}</span>
                </div>
                <div className="col-span-5"><div className="h-2 rounded-full w-24" style={{ background: 'rgba(255,255,255,0.04)' }} /></div>
                <div className="col-span-3 text-center"><div className="h-2 rounded-full w-8 mx-auto" style={{ background: 'rgba(255,255,255,0.04)' }} /></div>
                <div className="col-span-3 flex justify-end"><span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)' }}>Pending</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RULES ═══ */}
      <section id="rules" className="ch-section">
        <div className="w-full lg:max-w-[70%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag">Guidelines</span>
            <h2 className="ch-section-title">Rules</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Eligibility', color: '#10b981', items: ['Open to all developers worldwide', 'No prior Camora experience', 'Free account required', 'One submission per finding'] },
              { title: 'Submissions', color: '#6366f1', items: ['Clear title + severity level', 'Steps to reproduce', 'Suggested fix or plan', 'Screenshots when applicable'] },
              { title: 'Timeline', color: '#f59e0b', items: ['Start: May 7, 2026', 'End: October 7, 2026', 'Review: May 15-21', 'Winners: May 22'] },
              { title: 'Judging', color: '#ef4444', items: ['Founding team review', 'Code quality + docs are key', 'Original work only', 'Responsible disclosure'] },
            ].map((r) => (
              <div key={r.title} className="ch-glass-card p-5">
                <h3 className="text-xs font-bold text-white/80 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 6px ${r.color}` }} />{r.title}
                </h3>
                <ul className="space-y-1.5">
                  {r.items.map((item) => <li key={item} className="text-xs text-white/40">{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="ch-section">
        <div className="w-full lg:max-w-[60%] mx-auto px-4 sm:px-6">
          <div className="ch-section-head">
            <span className="ch-section-tag">FAQ</span>
            <h2 className="ch-section-title">Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ═══ REFER & SHARE ═══ */}
      {isAuthenticated && (
        <section className="ch-section">
          <div className="w-full lg:max-w-[50%] mx-auto px-4 sm:px-6">
            <div className="ch-section-head">
              <span className="ch-section-tag" style={{ color: '#34d399' }}>Spread the Word</span>
              <h2 className="ch-section-title">Refer Friends, Earn Credits</h2>
              <p className="ch-section-sub">Share the challenge and earn credits when friends join.</p>
            </div>
            <div className="ch-referral-wrapper">
              <ReferralDashboard />
            </div>
          </div>
        </section>
      )}

      {/* ═══ CTA — Final ═══ */}
      <section className="ch-section relative overflow-hidden">
        <div className="ch-hero-orb ch-orb-1" style={{ opacity: 0.3 }} />
        <div className="ch-hero-orb ch-orb-2" style={{ opacity: 0.2 }} />
        <div className="relative z-10 w-full lg:max-w-[60%] mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Ready to take the challenge?</h2>
          <p className="mt-3 text-sm text-white/30">$21,812 in prizes + founding team spots.</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to={isAuthenticated ? '/capra/prepare' : '/signup'} className="ch-cta-primary text-base px-8 py-3.5">
              {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-[10px] text-white/20">Share:</span>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('The Camora Challenge — $21,812 in prizes + founding team offers!')}&url=${encodeURIComponent('https://camora.cariara.com/challenge')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors" aria-label="Share on Twitter">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://camora.cariara.com/challenge')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors" aria-label="Share on LinkedIn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* ═══ STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .ch-root {
          min-height: 100vh;
          background: #0a0a0f;
          color: #fff;
          font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif;
          overflow-x: hidden;
        }

        /* ── Hero ── */
        .ch-hero {
          position: relative;
          min-height: 85vh;
          overflow: hidden;
        }
        .ch-hero-mesh {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(16,185,129,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 80%, rgba(6,182,212,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 90% 70%, rgba(245,158,11,0.06) 0%, transparent 60%);
          animation: mesh-shift 12s ease-in-out infinite alternate;
        }
        @keyframes mesh-shift {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.05) translate(-2%, 1%); }
        }
        .ch-hero-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
        }
        .ch-orb-1 { width: 400px; height: 400px; top: 10%; left: -5%; background: rgba(16,185,129,0.15); animation: orb-float 8s ease-in-out infinite; }
        .ch-orb-2 { width: 350px; height: 350px; top: 60%; right: -8%; background: rgba(99,102,241,0.12); animation: orb-float 10s ease-in-out infinite reverse; }
        .ch-orb-3 { width: 250px; height: 250px; bottom: 5%; left: 30%; background: rgba(245,158,11,0.08); animation: orb-float 7s ease-in-out infinite 2s; }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.08); }
        }
        .ch-hero-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%);
        }

        .ch-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          color: #10b981;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.15);
          margin-bottom: 24px;
        }
        .ch-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #10b981; }
          50% { opacity: 0.5; box-shadow: 0 0 16px #10b981, 0 0 32px #10b98150; }
        }

        .ch-hero-title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: #fff;
        }
        .ch-hero-gradient-text {
          background: linear-gradient(135deg, #34d399, #818cf8, #38bdf8, #fbbf24);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-flow 6s ease infinite;
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Countdown ── */
        .ch-countdown-card {
          display: flex; flex-direction: column; align-items: center;
        }
        .ch-countdown-num {
          width: 56px; height: 56px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 12px;
          font-family: 'Space Mono', monospace;
          font-size: 24px; font-weight: 700;
          color: #fff;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 20px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .ch-countdown-label {
          margin-top: 4px; font-size: 9px; font-weight: 700;
          color: rgba(255,255,255,0.2); letter-spacing: 0.15em;
        }

        /* ── Prize pool badge ── */
        .ch-prize-pool-badge {
          margin-top: 32px;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 16px 32px; border-radius: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
        }
        .ch-prize-amount {
          font-family: 'Space Mono', monospace;
          font-size: 36px; font-weight: 700;
          background: linear-gradient(135deg, #fbbf24, #f59e0b, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
          filter: drop-shadow(0 0 20px rgba(251,191,36,0.3));
        }

        /* ── CTAs ── */
        .ch-cta-primary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 12px 28px; border-radius: 12px;
          font-size: 14px; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none; cursor: pointer;
          box-shadow: 0 0 24px rgba(16,185,129,0.25), 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.2s;
          text-decoration: none;
        }
        .ch-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 32px rgba(16,185,129,0.4), 0 8px 24px rgba(0,0,0,0.4);
        }
        .ch-cta-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 12px 28px; border-radius: 12px;
          font-size: 14px; font-weight: 700;
          color: rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; transition: all 0.2s;
          text-decoration: none;
        }
        .ch-cta-secondary:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.9);
          transform: translateY(-1px);
        }

        /* ── Sections ── */
        .ch-section { padding: 48px 0; position: relative; }
        .ch-section-head { text-align: center; margin-bottom: 32px; }
        .ch-section-tag { font-size: 10px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.2em; }
        .ch-section-title { font-size: clamp(1.25rem, 3vw, 1.75rem); font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-top: 4px; }
        .ch-section-sub { font-size: 13px; color: rgba(255,255,255,0.3); margin-top: 6px; }

        /* ── Glass card ── */
        .ch-glass-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          backdrop-filter: blur(8px);
          transition: border-color 0.3s;
        }
        .ch-glass-card:hover { border-color: rgba(255,255,255,0.1); }

        /* ── Inputs ── */
        .ch-input {
          padding: 10px 14px; border-radius: 10px;
          font-size: 13px; color: #fff;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          outline: none; transition: border-color 0.2s;
        }
        .ch-input:focus { border-color: rgba(16,185,129,0.4); }
        .ch-input::placeholder { color: rgba(255,255,255,0.2); }

        .ch-code-editor {
          min-height: 180px; padding: 16px; border-radius: 12px;
          font-family: 'Space Mono', 'IBM Plex Mono', monospace;
          font-size: 13px; line-height: 1.6;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.06);
          color: #e2e8f0; outline: none; resize: vertical;
        }

        /* ── Glow icon ── */
        .ch-glow-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--glow, #10b981) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--glow, #10b981) 20%, transparent);
          box-shadow: 0 0 12px color-mix(in srgb, var(--glow, #10b981) 15%, transparent);
        }

        /* ── Prize cards ── */
        .ch-prize-card {
          position: relative; border-radius: 20px; padding: 2px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          transition: all 0.3s;
        }
        .ch-prize-card::before {
          content: ''; position: absolute; inset: -1px; border-radius: 21px;
          background: linear-gradient(135deg, var(--prize-glow, #fff) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.4s;
          z-index: -1; filter: blur(12px);
        }
        .ch-prize-card:hover { transform: translateY(-4px); }
        .ch-prize-card:hover::before { opacity: 0.4; }
        .ch-prize-card-inner {
          background: rgba(10,10,15,0.9);
          border-radius: 18px;
          padding: 28px; text-align: center;
        }
        .ch-prize-rank {
          display: inline-block;
          padding: 4px 14px; border-radius: 8px;
          font-size: 11px; font-weight: 800; color: #0a0a0f;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 12px;
        }
        .ch-prize-amount-card {
          font-family: 'Space Mono', monospace;
          font-size: 32px; font-weight: 700; color: #fff;
          margin-bottom: 4px;
        }

        /* ── Category cards ── */
        .ch-category-card {
          padding: 20px; border-radius: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.3s;
        }
        .ch-category-card:hover {
          border-color: var(--cat-color);
          box-shadow: 0 0 24px var(--cat-glow);
          transform: translateY(-2px);
        }

        /* ── Timeline ── */
        .ch-timeline {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 0;
          position: relative;
        }
        @media (max-width: 768px) {
          .ch-timeline { grid-template-columns: repeat(3, 1fr); gap: 16px 0; }
        }
        @media (max-width: 480px) {
          .ch-timeline { grid-template-columns: repeat(2, 1fr); gap: 16px 0; }
        }
        .ch-timeline-step {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 0 8px; position: relative;
        }
        .ch-timeline-node {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Space Mono', monospace;
          font-size: 10px; font-weight: 700; color: #0a0a0f;
          background: var(--node-color, #10b981);
          box-shadow: 0 0 16px color-mix(in srgb, var(--node-color, #10b981) 40%, transparent);
          position: relative; z-index: 2;
        }
        .ch-timeline-line {
          position: absolute; top: 18px; left: calc(50% + 18px); right: calc(-50% + 18px);
          height: 2px; z-index: 1;
        }

        /* ── Tech pills ── */
        .ch-tech-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s;
        }
        .ch-tech-pill:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-1px);
        }

        /* ── Referral wrapper — retheme the light component for dark bg ── */
        .ch-referral-wrapper > div {
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.08) !important;
          border-radius: 16px;
          backdrop-filter: blur(8px);
        }
        .ch-referral-wrapper h3,
        .ch-referral-wrapper h4 { color: #fff !important; }
        .ch-referral-wrapper p { color: rgba(255,255,255,0.4) !important; }
        .ch-referral-wrapper .text-gray-700,
        .ch-referral-wrapper .text-gray-900 { color: #fff !important; }
        .ch-referral-wrapper .text-gray-500,
        .ch-referral-wrapper .text-gray-400 { color: rgba(255,255,255,0.35) !important; }
        .ch-referral-wrapper .text-sm.text-gray-700 { color: rgba(255,255,255,0.6) !important; }
        .ch-referral-wrapper .bg-gray-50,
        .ch-referral-wrapper .bg-gray-100 { background: rgba(255,255,255,0.04) !important; }
        .ch-referral-wrapper .bg-emerald-50 { background: rgba(16,185,129,0.1) !important; }
        .ch-referral-wrapper .border-gray-200,
        .ch-referral-wrapper .border-gray-100 { border-color: rgba(255,255,255,0.08) !important; }
        .ch-referral-wrapper .text-emerald-600 { color: #34d399 !important; }
        .ch-referral-wrapper .font-mono { color: rgba(255,255,255,0.5) !important; }
        .ch-referral-wrapper button.bg-emerald-500 {
          box-shadow: 0 0 16px rgba(16,185,129,0.3);
        }
        .ch-referral-wrapper .text-2xl.font-bold { color: #fff !important; }
        .ch-referral-wrapper .bg-emerald-100 { background: rgba(16,185,129,0.15) !important; }
        .ch-referral-wrapper .text-emerald-700 { color: #34d399 !important; }
        .ch-referral-wrapper .bg-amber-100 { background: rgba(245,158,11,0.15) !important; }
        .ch-referral-wrapper .text-amber-700 { color: #fbbf24 !important; }
      `}</style>
    </div>
  );
}
