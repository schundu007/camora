import { useEffect } from 'react';
import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SEO from '../components/shared/SEO';
import SiteFooter from '../components/shared/SiteFooter';
import JobUrlAnalysisDemo from '../components/shared/JobUrlAnalysisDemo';
import {
  ApplyAnim, PrepareAnim, PracticeAnim, AttendAnim, CardAnimationStyles, FeaturePlaygroundAnim, FeaturePracticeAnim,
  FeatureLiveAIAnim, FeatureJobMatchAnim, FeaturePrepAnim, FeatureMockSessionAnim,
} from '../components/landing/CardAnimations';
import CapabilityDeck from '../components/landing/CapabilityDeck';
import LiveSessionPreview from '../components/landing/LiveSessionPreview';
import VisitorCountLine from '../components/landing/VisitorCountLine';
import SkillDrift from '../components/landing/SkillDrift';
import MagneticCTA from '../components/landing/MagneticCTA';
import { Container, Section, Eyebrow, SectionHeading, CTAButton, SurfaceCard, Pill } from '../components/marketing/primitives';
import { cn } from '../utils/cn';

/* ══════════════════════════════════════════════════════════════
   CAMORA LANDING PAGE — enterprise redesign.
   ══════════════════════════════════════════════════════════════ */

type Step = {
  key: string;
  label: string;
  href: string;
  headline: string;
  desc: string;
  Anim: () => JSX.Element;
  icon: JSX.Element;
};

const Glyph = (path: JSX.Element) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const APPA: Step[] = [
  {
    key: 'apply', label: 'Apply', href: '/jobs',
    headline: 'Roles matched to your skills',
    desc: '1,000+ engineering roles with AI-powered matching. Auto-generate tailored resumes and cover letters.',
    Anim: ApplyAnim,
    icon: Glyph(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 8h6M9 16h3" /></>),
  },
  {
    key: 'prepare', label: 'Prepare', href: '/capra/prepare',
    headline: '600+ curated study topics',
    desc: 'System design, DSA, behavioral, databases. Each with AI explanations and architecture diagrams.',
    Anim: PrepareAnim,
    icon: Glyph(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>),
  },
  {
    key: 'practice', label: 'Practice', href: '/capra/practice',
    headline: '9,500+ problems with AI feedback',
    desc: 'Coding, DSA, MCQ, system design, SQL — 9,500+ unique problems across 50+ domains with AI scoring.',
    Anim: PracticeAnim,
    icon: Glyph(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14.5" y1="4" x2="9.5" y2="20" /></>),
  },
  {
    key: 'attend', label: 'Attend', href: '/lumora',
    headline: 'Real-time AI in the room',
    desc: 'Voice transcription captures the question. AI generates instant answers: diagrams, code, STAR coaching.',
    Anim: AttendAnim,
    icon: Glyph(<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>),
  },
];


const APPA_ICON_PATHS: JSX.Element[] = [
  /* Apply — document with lines */
  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  /* Prepare — open book */
  <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  /* Practice — code brackets */
  <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  /* Attend — microphone */
  <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></>,
];

const LOGO_TOKEN = 'pk_VzK1OM-OQSCUuysDpOCzKw';
const COMPANY_LOGOS = [
  'google', 'amazon', 'meta', 'apple', 'netflix', 'microsoft',
  'uber', 'stripe', 'airbnb', 'nvidia', 'spotify', 'salesforce',
  'adobe', 'oracle', 'intel', 'ibm', 'twitter', 'linkedin',
  'tesla', 'paypal', 'shopify', 'atlassian', 'databricks', 'snowflake',
];

const FEATURES = [
  {
    label: 'Live AI',
    title: 'Real-time AI during sessions',
    bullets: ['Live voice capture + instant answers', 'Architecture diagrams in seconds', 'Works during actual interviews'],
    Anim: FeatureLiveAIAnim,
  },
  {
    label: 'Job Matching',
    title: 'AI-powered job discovery',
    bullets: ['1,000+ roles matched to your skills', 'Auto-generate resume + cover letter', 'One-click application tracking'],
    Anim: FeatureJobMatchAnim,
  },
  {
    label: 'Prep',
    title: '600+ topics with diagrams',
    bullets: ['System design, DSA, behavioral, databases', 'AI explanations + architecture diagrams', 'Company-specific study paths'],
    Anim: FeaturePrepAnim,
  },
  {
    label: 'Mock Interviews',
    title: 'AI-scored practice sessions',
    bullets: ['Timed sessions with instant feedback', 'Scored: communication, code, design', 'Pinpoints exactly where you lost points'],
    Anim: FeatureMockSessionAnim,
  },
  {
    label: 'Playground',
    title: 'Real terminals. Real Docker. Real Kubernetes.',
    bullets: ['Ubuntu, Docker, Kubernetes — live in browser', 'No VM, no setup, ready in 5 seconds', 'Build real muscle memory before the screen'],
    Anim: FeaturePlaygroundAnim,
  },
  {
    label: 'Practice',
    title: '9,500+ problems with AI feedback',
    bullets: ['DSA, SQL, MCQ, system design, coding', 'AI explains why your approach was wrong', '50+ domains, difficulty-graduated'],
    Anim: FeaturePracticeAnim,
  },
];

const SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++', 'SQL',
  'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'System Design', 'DSA', 'Behavioral',
];

const HIGHLIGHTS = [
  '50+ Languages',
  'Architecture Diagrams',
  'Company-Specific Prep',
  'Stealth Desktop App',
  'Voice Filtering',
  'Live Terminal Playground',
  'Cara AI Guide',
];

const TESTIMONIALS = [
  {
    name: 'Shreya Patel',
    role: 'SWE L4 → L5, Search Infrastructure · Google',
    logoDomain: 'google.com',
    initials: 'SP',
    accent: '#4285F4',
    text: "Three system design rounds in my Google loop. I drilled with Camora every night for two weeks — Sona's pub/sub and distributed cache diagrams were almost exactly what I drew on the whiteboard. L5 offer landed two weeks after the final round.",
  },
  {
    name: 'Jordan Kim',
    role: 'E4 → E5 Backend SWE, Instagram Feed · Meta',
    logoDomain: 'meta.com',
    initials: 'JK',
    accent: '#0082FB',
    text: "Meta's bar for backend is brutally specific. Camora had me drilling connection pools, cache eviction policies, and rate-limiting until I could derive them from first principles. Six weeks of prep. E5 offer on the first attempt.",
  },
  {
    name: 'Ravi Krishnamurthy',
    role: 'SDE II → SDE III, AWS DynamoDB · Amazon',
    logoDomain: 'amazon.com',
    initials: 'RK',
    accent: '#FF9900',
    text: "Did 180 LP questions using Camora's behavioral module. STAR answers anchored to my actual project history, not generic templates. The behavioral round was the easiest part of the loop. SDE III on the DynamoDB team.",
  },
  {
    name: 'Caitlin O\'Brien',
    role: 'Senior SWE, CoreML Platform · Apple',
    logoDomain: 'apple.com',
    initials: 'CO',
    accent: '#555555',
    text: "Apple's onsite is six hours back to back. Camora's mock sessions scored my system design explanations and flagged where I was hand-waving. Fixed those gaps before the real thing. CoreML team offer, 10 days after the loop.",
  },
  {
    name: 'Daniel Osei',
    role: 'Senior SWE, Content Delivery Platform · Netflix',
    logoDomain: 'netflix.com',
    initials: 'DO',
    accent: '#E50914',
    text: "Netflix moves fast. During my virtual onsite, Sona transcribed the interviewer's question and surfaced the relevant design tradeoffs while I was still organizing my thoughts. That 8-second window saved me on the CDN design round.",
  },
  {
    name: 'Fatima Al-Hassan',
    role: 'SDE II, Azure Kubernetes Service · Microsoft',
    logoDomain: 'microsoft.com',
    initials: 'FA',
    accent: '#00A4EF',
    text: "Azure infra interviews go deep on distributed systems. The Kubernetes playground had me running real Helm charts and debugging failing pods. Walked into the onsite with actual muscle memory, not theory. Got the AKS team offer.",
  },
];

/* ── Hooks ────────────────────────────────────────────── */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      // emil-design-eng: stronger ease-out (cubic-bezier(0.23, 1, 0.32, 1)) and
      // sub-300ms duration. The previous 0.45s tween with the default soft curve
      // is the recognizable AI/Framer reveal — recognizable means slop.
      transition={{ duration: 0.28, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    document.title = 'Camora — Apply, Prepare, Practice & Attend';
    return () => { document.title = 'Camora'; };
  }, []);

  // Both branches route to /capra/prepare — the Prepare surface is
  // freely browseable without auth or onboarding (see ProtectedRoute's
  // isOnboardingExempt list), so dropping logged-out users straight
  // into the catalog removes one click of friction. Signup is still
  // one tap away in SiteNav and any paywalled action will prompt for
  // it. Label stays auth-aware so the affordance still reads as a CTA
  // for new visitors.
  const heroCta = isAuthenticated ? 'Open dashboard' : 'Get started free';
  const heroCtaHref = '/capra/prepare';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
      <SEO path="/" />
      <CardAnimationStyles />
      <SiteNav />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-[#080B14] text-white">
        {/* Animated aurora gradient orbs */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 5% 40%, rgba(54,131,220,0.24), transparent 55%),' +
              'radial-gradient(ellipse 60% 80% at 12% 25%, rgba(139,92,246,0.22), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 92% 65%, rgba(54,131,220,0.30), transparent 60%),' +
              'radial-gradient(ellipse 35% 45% at 72% 15%, rgba(34,211,238,0.12), transparent 50%),' +
              'radial-gradient(ellipse 40% 50% at 50% 85%, rgba(139,92,246,0.08), transparent 55%),' +
              'linear-gradient(135deg, #080B14 0%, #0C1120 50%, #10172E 100%)',
            animation: 'heroOrbs 18s ease-in-out infinite alternate',
          }}
        />
        {/* Drifting accent orb 1 */}
        <div aria-hidden="true" className="absolute pointer-events-none opacity-20"
          style={{
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(54,131,220,0.38) 0%, transparent 70%)',
            top: '-10%', left: '-5%',
            animation: 'heroDrift1 25s ease-in-out infinite alternate',
          }}
        />
        {/* Drifting accent orb 2 */}
        <div aria-hidden="true" className="absolute pointer-events-none opacity-15"
          style={{
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)',
            bottom: '-8%', right: '10%',
            animation: 'heroDrift2 20s ease-in-out infinite alternate',
          }}
        />
        {/* Floating decorative tech nodes */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          {['top-[12%] left-[8%] w-3 h-3 delay-0', 'top-[30%] right-[15%] w-2 h-2 delay-[2s]',
            'bottom-[20%] left-[20%] w-2.5 h-2.5 delay-[4s]', 'top-[60%] right-[8%] w-1.5 h-1.5 delay-[1s]',
            'bottom-[35%] right-[35%] w-2 h-2 delay-[3s]', 'top-[8%] right-[30%] w-1.5 h-1.5 delay-[5s]',
          ].map((pos, i) => (
            <span key={i} className={`absolute rounded-full ${pos}`}
              style={{
                background: i % 2 === 0 ? 'rgba(54,131,220,0.70)' : 'rgba(139,92,246,0.60)',
                boxShadow: i % 2 === 0 ? '0 0 18px rgba(54,131,220,0.55)' : '0 0 18px rgba(139,92,246,0.45)',
                animation: `heroFloat ${4 + (i % 3) * 2}s ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          ))}
        </div>
        {/* Grid overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 60% 70% at 20% 30%, black, transparent 80%)',
          }}
        />
        {/* Noise texture for premium AI depth */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.035,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
        {/* Diagonal light beam */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: '-20%', left: '38%', width: 90, height: '140%',
            background: 'linear-gradient(to bottom, transparent, rgba(54,131,220,0.12) 30%, rgba(139,92,246,0.08) 65%, transparent)',
            transform: 'rotate(-18deg)',
            filter: 'blur(32px)',
          }}
        />
        {/* Bottom accent glow line */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(54,131,220,0.55) 35%, rgba(139,92,246,0.45) 65%, transparent 95%)' }}
        />

        <Container className="relative pt-16 pb-16 md:pt-24 md:pb-20">
          {/* Centered headline block */}
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
              <Pill tone="inverse" withDot>
                The career platform for engineers
              </Pill>
            </motion.div>

            <motion.h1
              className="mt-6 font-display text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-bold tracking-tight leading-[1.0]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="block text-[#F0EEE9]">All your prep.</span>
              <span
                className="block"
                style={{
                  background: 'linear-gradient(120deg, #60A5FA 0%, #3683DC 30%, #A855F7 70%, #818CF8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                One trusted platform.
              </span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-[600px] text-[18px] md:text-[20px] leading-relaxed text-[#9CA3AF]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.10, ease: [0.23, 1, 0.32, 1] }}
            >
              1,000+ matched roles · 600+ study topics · 9,500+ problems · Live AI in the room.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap justify-center items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              <MagneticCTA strength={6}>
                <CTAButton to={heroCtaHref} variant="inverse-primary" size="lg" trailingArrow>
                  {heroCta}
                </CTAButton>
              </MagneticCTA>
              <MagneticCTA strength={4}>
                <CTAButton to="/pricing" variant="inverse-secondary" size="lg">
                  View pricing
                </CTAButton>
              </MagneticCTA>
            </motion.div>

            <motion.div className="flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24, delay: 0.22, ease: [0.23, 1, 0.32, 1] }}>
              <VisitorCountLine />
            </motion.div>
          </div>

        </Container>

        <style>{`
          @keyframes heroOrbs {
            0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
            33%  { transform: translate(3%, -2%) rotate(1.5deg) scale(1.03); }
            66%  { transform: translate(-2%, 3%) rotate(-1deg) scale(0.97); }
            100% { transform: translate(2%, -2%) rotate(0.5deg) scale(1.02); }
          }
          @keyframes heroDrift1 {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(8%, 6%) scale(1.12); }
            100% { transform: translate(-4%, -3%) scale(0.95); }
          }
          @keyframes heroDrift2 {
            0%   { transform: translate(0, 0) scale(1); }
            50%  { transform: translate(-6%, -8%) scale(1.08); }
            100% { transform: translate(5%, 4%) scale(0.92); }
          }
          @keyframes heroFloat {
            0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
            50%      { transform: translateY(-18px) scale(1.15); opacity: 0.7; }
          }
        `}</style>
      </section>

      {/* ═══════════ SONA PREVIEW ═══════════ */}
      <section className="bg-[var(--bg-surface)] py-12">
        <Container>
          <motion.div
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.40, delay: 0.10, ease: [0.23, 1, 0.32, 1] }}
          >
            <LiveSessionPreview />
          </motion.div>
        </Container>
      </section>

      {/* ═══════════ LOGO STRIP ═══════════ */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-surface)] py-10 overflow-hidden">
        <p className="text-center font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Trusted by engineers at
        </p>
        <div className="relative mt-6">
          <div className="absolute left-0 inset-y-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-[var(--bg-surface)] to-transparent" />
          <div className="absolute right-0 inset-y-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-[var(--bg-surface)] to-transparent" />
          <div className="flex" style={{ animation: 'scroll-logos 36s linear infinite', width: 'max-content' }}>
            {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map((c, i) => (
              <img
                key={`${c}-${i}`}
                src={`https://img.logo.dev/${c}.com?token=${LOGO_TOKEN}&size=40&format=png`}
                alt={c}
                className="h-6 mx-7 shrink-0 object-contain"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        </div>
        <style>{`@keyframes scroll-logos { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ═══════════ APPA — THE PROCESS ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            {/* Always-dark card — immune to light/dark theme */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0B1221 0%, #0E1628 50%, #111827 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 64px rgba(0,0,0,0.36)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Gold top accent line */}
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(212,160,67,0.7) 30%, rgba(212,160,67,0.7) 70%, transparent)', marginBottom: 0 }} />

              <div className="px-8 pt-8 pb-10 md:px-12 md:pt-10">
                {/* Header */}
                <div className="mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(212,160,67,0.8)', fontFamily: 'var(--font-mono)' }}>
                    The process
                  </p>
                  <h2 className="text-[22px] md:text-[26px] font-bold tracking-tight leading-tight" style={{ color: '#F0EEE9', fontFamily: 'var(--font-display)' }}>
                    First application to final offer.
                  </h2>
                </div>

                {/* 4-column horizontal steps */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                  {APPA.map((step, i) => (
                    <Link
                      key={step.key}
                      to={step.href}
                      className="group relative flex flex-col gap-3 px-5 py-6 transition-colors duration-200"
                      style={{
                        borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                        borderTop: i >= 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Step number — large watermark */}
                      <span
                        className="text-[48px] font-bold leading-none select-none"
                        style={{ color: 'rgba(212,160,67,0.18)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em' }}
                      >
                        0{i + 1}
                      </span>

                      {/* Step name */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: 'rgba(212,160,67,0.75)', fontFamily: 'var(--font-mono)' }}>
                          {step.label}
                        </p>
                        <p className="text-[14px] font-semibold leading-snug" style={{ color: 'rgba(240,238,233,0.92)' }}>
                          {step.headline}
                        </p>
                      </div>

                      {/* Description */}
                      <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(240,238,233,0.45)' }}>
                        {step.desc}
                      </p>

                      {/* Arrow link */}
                      <span
                        className="text-[12px] font-semibold inline-flex items-center gap-1 mt-auto transition-colors duration-150"
                        style={{ color: 'rgba(212,160,67,0.6)', fontFamily: 'var(--font-mono)' }}
                      >
                        Explore
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
                          <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ═══════════ CAPABILITY DECK ═══════════ */}
      <Section tone="muted" spacing="lg">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <Reveal>
                <SectionHeading
                  title={<>One tool.<br /><span className="text-[var(--cam-primary)]">Every session.</span></>}
                  lead="Voice, code, system design, diagrams, and scoring — every interview format in one tool."
                />
                <div className="mt-7 flex items-center gap-4">
                  <CTAButton to="/lumora" variant="primary" size="md" trailingArrow>
                    Try live AI
                  </CTAButton>
                  <CTAButton to="/pricing" variant="ghost" size="md">
                    View pricing →
                  </CTAButton>
                </div>
              </Reveal>
            </div>
            <div className="lg:col-span-7 w-full">
              <Reveal delay={0.12}>
                <CapabilityDeck />
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ═══════════ FEATURES — Bento grid ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            <SectionHeading
              title="Features that set us apart."
              lead="Everything you need from first prep to final offer."
            />
          </Reveal>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.06}>
                  <SurfaceCard interactive padding="lg" className="h-full group">
                    <Eyebrow tone="accent">{f.label}</Eyebrow>
                    <h3 className="mt-2 font-display text-[20px] font-semibold tracking-tight leading-snug text-[var(--text-primary)]">
                      {f.title}
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {f.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-1.5 text-[13px] text-[var(--text-secondary)]">
                          <span className="mt-[3px] shrink-0 w-1 h-1 rounded-full bg-[var(--accent)] opacity-70" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 -mx-2 h-32 md:h-36 overflow-hidden rounded-xl relative bg-[var(--bg-elevated)] transition-all duration-300">
                      <f.Anim />
                    </div>
                  </SurfaceCard>
                </Reveal>
            ))}
          </div>

          {/* Highlights — flat divided list */}
          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center justify-center">
              {HIGHLIGHTS.map((f, i) => (
                <span key={f} className="flex items-center">
                  {i > 0 && <span className="mx-5 h-3 w-px bg-[var(--border)]" aria-hidden="true" />}
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{f}</span>
                </span>
              ))}
            </div>
          </Reveal>

          {/* Skills — drift marquee so the row reads as alive vs static. */}
          <Reveal className="mt-10 text-center">
            <Eyebrow>Skills you'll master</Eyebrow>
            <SkillDrift skills={SKILLS} />
          </Reveal>
        </Container>
      </Section>


      {/* ═══════════ JOB URL ANALYSIS ═══════════ */}
      <Section tone="muted" spacing="lg">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 w-full">
              <Reveal>
                <JobUrlAnalysisDemo />
              </Reveal>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={0.12}>
                <SectionHeading
                  title={<>Paste a job URL.<br /><span className="text-[var(--cam-primary)]">Get a prep plan.</span></>}
                  lead="Paste a job URL. Get a tailored prep plan with coding topics, system design, and behavioral questions."
                />
                <div className="mt-7">
                  <CTAButton to="/jobs" variant="primary" trailingArrow>
                    Try job analysis
                  </CTAButton>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </Section>

      {/* ═══════════ TWO AUDIENCES ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              title={<>One platform. <span className="text-[var(--cam-primary)]">Two audiences.</span></>}
            />
          </Reveal>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <AudienceCard
              title="Roles, practice & live AI"
               body="Matched roles, curated study topics, 9,500+ problems, and live AI when it counts most."
              ctaLabel={isAuthenticated ? 'Open dashboard' : 'Start free'}
              ctaHref="/capra/prepare"
            />
            <AudienceCard
              title="Identify top technical talent"
              body="Camora trains engineers, then helps you spot them. Sponsor coding contests, surface candidates ready for the loop, and shorten time-to-hire."
              ctaLabel="Explore partnerships"
              ctaHref="/pricing"
              tone="dark"
            />
          </div>
        </Container>
      </Section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <Section tone="surface" spacing="lg">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              title={<>Engineers who <span className="text-[var(--cam-primary)]">got the offer.</span></>}
              lead="From engineers who used Camora to land the offer."
            />
          </Reveal>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.05}>
                <div
                  className="h-full rounded-2xl p-6 flex flex-col gap-4"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                    <path d="M0 14V9.33C0 7.96 0.31 6.64 0.93 5.37 1.55 4.1 2.39 2.97 3.45 1.98 4.51 0.99 5.72 0.33 7.08 0L8.33 1.98C7.22 2.37 6.27 3.01 5.48 3.9 4.69 4.79 4.2 5.79 4.02 6.88H6.67V14H0ZM11.67 14V9.33C11.67 7.96 11.98 6.64 12.6 5.37 13.22 4.1 14.06 2.97 15.12 1.98 16.18 0.99 17.39 0.33 18.75 0L20 1.98C18.89 2.37 17.94 3.01 17.15 3.9 16.36 4.79 15.87 5.79 15.69 6.88H18.33V14H11.67Z" fill="var(--cam-gold-leaf, #d4a043)" opacity="0.5"/>
                  </svg>
                  <p className="flex-1 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                    {t.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                    >
                      {t.logoDomain ? (
                        <img src={`https://img.logo.dev/${t.logoDomain}?token=${LOGO_TOKEN}&size=32&format=png`} alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
                      ) : (
                        <span className="text-[11px] font-bold text-white" style={{ background: t.accent }}>{t.initials}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{t.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] leading-snug">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-[#0A0E1A] px-8 py-14 md:px-14 md:py-16 text-white">
            {/* Animated aurora gradient */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(37,99,235,0.16), transparent 55%),' +
                  'radial-gradient(ellipse 50% 60% at 70% 80%, rgba(212,160,67,0.09), transparent 55%),' +
                  'radial-gradient(ellipse 60% 50% at 90% 10%, rgba(37,99,235,0.10), transparent 50%)',
                animation: 'ctaAurora 14s ease-in-out infinite alternate',
              }}
            />
            {/* Grid overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '54px 54px',
                maskImage: 'radial-gradient(ellipse 70% 60% at 30% 30%, black, transparent 75%)',
              }}
            />
            {/* Decorative glow ring */}
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                width: 320, height: 320, borderRadius: '50%',
                border: '1px solid rgba(37,99,235,0.12)',
                top: '50%', right: '20%',
                transform: 'translateY(-50%)',
                animation: 'ctaRing 8s ease-in-out infinite alternate',
                boxShadow: '0 0 60px rgba(37,99,235,0.08), inset 0 0 60px rgba(37,99,235,0.04)',
              }}
            />
            {/* Floating decorative particles */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
              <span className="absolute top-[22%] right-[12%] w-2 h-2 rounded-full"
                style={{ background: 'rgba(37,99,235,0.45)', animation: 'ctaFloat 5s ease-in-out 0s infinite' }}
              />
              <span className="absolute top-[60%] right-[25%] w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgba(212,160,67,0.3)', animation: 'ctaFloat 6s ease-in-out 1s infinite' }}
              />
              <span className="absolute top-[35%] right-[40%] w-2.5 h-2.5 rounded-full"
                style={{ background: 'rgba(37,99,235,0.28)', animation: 'ctaFloat 7s ease-in-out 2s infinite' }}
              />
            </div>
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <Eyebrow tone="inverse">Ready when you are</Eyebrow>
                <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]">
                  Start free.<br />
                  <span className="text-[var(--cam-gold-leaf-lt)]">Win the offer.</span>
                </h2>
                <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/70">
                  One free hour, no card required. Pick a plan when you're ready; top-ups never expire.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MagneticCTA strength={6}>
                  <CTAButton to={heroCtaHref} variant="inverse-primary" size="lg" trailingArrow>
                    {heroCta}
                  </CTAButton>
                </MagneticCTA>
                <MagneticCTA strength={4}>
                  <CTAButton to="/pricing" variant="inverse-secondary" size="lg">
                    See pricing
                  </CTAButton>
                </MagneticCTA>
              </div>
            </div>
            <style>{`
              @keyframes ctaAurora {
                0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
                50%  { transform: translate(2%, -2%) rotate(1deg) scale(1.04); }
                100% { transform: translate(-1%, 1%) rotate(-0.5deg) scale(0.97); }
              }
              @keyframes ctaRing {
                0%   { transform: translateY(-50%) scale(0.9); opacity: 0.4; }
                100% { transform: translateY(-50%) scale(1.15); opacity: 1; }
              }
              @keyframes ctaFloat {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
                50%      { transform: translateY(-16px) scale(1.2); opacity: 1; }
              }
            `}</style>
          </div>
        </Container>
      </Section>

      <SiteFooter />
    </div>
  );
}

function AudienceCard({
  eyebrow, title, body, ctaLabel, ctaHref, tone = 'light',
}: {
  eyebrow?: string; title: string; body: string; ctaLabel: string; ctaHref: string; tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <Reveal>
      <div
        className={cn(
          'relative h-full overflow-hidden rounded-3xl border p-8 md:p-10',
          dark
            ? 'bg-[#0A0E1A] border-white/10 text-white'
            : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)] shadow-[0_2px_4px_rgba(0,0,0,0.25),0_12px_32px_-16px_rgba(0,0,0,0.35)]',
        )}
      >
        {dark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.14]"
            style={{
              background:
                'radial-gradient(ellipse 60% 70% at 100% 0%, rgba(201,162,39,0.45), transparent 60%)',
            }}
          />
        )}
        <div className="relative">
          <Eyebrow tone={dark ? 'inverse' : 'accent'}>{eyebrow}</Eyebrow>
          <h3 className={cn(
            'mt-3 font-display text-[24px] md:text-[28px] font-semibold tracking-tight leading-tight',
            dark ? 'text-white' : 'text-[var(--text-primary)]',
          )}>
            {title}
          </h3>
          <p className={cn(
            'mt-4 max-w-prose text-[14.5px] leading-relaxed',
            dark ? 'text-white/72' : 'text-[var(--text-secondary)]',
          )}>
            {body}
          </p>
          <div className="mt-7">
            <CTAButton to={ctaHref} variant={dark ? 'inverse-primary' : 'primary'} trailingArrow>
              {ctaLabel}
            </CTAButton>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
