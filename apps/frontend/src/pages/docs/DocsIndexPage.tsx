import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import SEO from '../../components/shared/SEO';

interface DocCard {
  title: string;
  description: string;
  href: string;
}

const USER_GUIDES: DocCard[] = [
  { title: 'Getting started', description: 'Sign up, onboarding, and your first interview prep session.', href: '/docs/getting-started' },
  { title: 'Prepare', description: 'Browse 800+ prep topics, generate company-specific prep, free tier limits.', href: '/docs/prepare' },
  { title: 'Practice', description: 'DSA problems, system design exercises, behavioral STAR practice.', href: '/docs/practice' },
  { title: 'Live Interview', description: 'Connect audio, use Sona, capture system audio, run a live interview.', href: '/docs/lumora-live' },
  { title: 'Coding helper', description: 'Multi-language coding playground with three-approach solutions and complexity analysis.', href: '/docs/lumora-coding' },
  { title: 'System Design', description: 'Architecture diagrams, design patterns, scaling drills.', href: '/docs/lumora-design' },
  { title: 'Account & billing', description: 'Plans, payment methods, cancel and resume subscriptions.', href: '/docs/account' },
  { title: 'Team sharing', description: 'Invite mates, share AI hours, set per-member caps, configure auto top-up.', href: '/docs/teams' },
  { title: 'Top-ups & AI hours', description: 'How AI hours work, when to top up, auto-topup configuration, refunds.', href: '/docs/topups' },
  { title: 'Desktop app', description: 'Stealth-mode desktop client with global hotkey, system audio, and BYOK.', href: '/docs/desktop' },
  { title: 'Voice filtering', description: 'Speaker verification — only transcribe the interviewer, not your own voice.', href: '/docs/voice-filtering' },
];

const ADMIN_RUNBOOKS: DocCard[] = [
  { title: 'Operations overview', description: 'Service map, deployment topology, where everything lives.', href: '/docs/admin' },
  { title: 'Stripe configuration', description: 'Price IDs, webhook events, test mode, recurring vs one-time SKUs.', href: '/docs/admin/stripe' },
  { title: 'Environment variables', description: 'Every env var across frontend, ascend-backend, lumora-backend, ai-services.', href: '/docs/admin/env-vars' },
  { title: 'Deployment runbook', description: 'Vercel frontend, Railway backends, Docker AI services, cache busting.', href: '/docs/admin/deployment' },
  { title: 'Database schema', description: 'Tables, idempotent migrations, when to manually intervene.', href: '/docs/admin/database' },
  { title: 'Refund approval', description: 'Reviewing and approving top-up refund requests via /admin/teams.', href: '/docs/admin/refunds' },
  { title: 'Incident response', description: 'When Stripe is down, when an LLM provider 502s, when the pool gate misfires.', href: '/docs/admin/incidents' },
];

function DocCardLink({ card }: { card: DocCard }) {
  return (
    <Link
      to={card.href}
      className="group block rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <h3 className="text-base font-bold mb-1.5 group-hover:underline" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.description}</p>
    </Link>
  );
}

export default function DocsIndexPage() {
  useEffect(() => { document.title = 'Documentation — Camora'; }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
      <SEO title="Documentation" description="Camora user guides and admin runbooks — everything you need to use, configure, and operate the platform." path="/docs" />
      <SiteNav variant="light" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-16" style={{ paddingTop: 96 }}>
        <header className="mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent)' }}>DOCUMENTATION</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Camora docs</h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            User guides and admin runbooks for every Camora surface — pick a topic to dive in.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: 'var(--text-muted)' }}>User guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {USER_GUIDES.map((card) => <DocCardLink key={card.href} card={card} />)}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: 'var(--text-muted)' }}>Administration &amp; runbooks</h2>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            For Camora operators. Most pages assume access to the Stripe dashboard, Railway services, and the
            Postgres database.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ADMIN_RUNBOOKS.map((card) => <DocCardLink key={card.href} card={card} />)}
          </div>
        </section>

        <section className="rounded-xl p-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-bold mb-2">Need something not covered here?</h2>
          <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>
            Open a GitHub issue at <a href="https://github.com/anthropics/claude-code/issues" className="text-[var(--accent)] underline">anthropics/claude-code/issues</a>{' '}
            or email <a href="mailto:hi@cariara.com" className="text-[var(--accent)] underline">hi@cariara.com</a> with what you were trying to do.
          </p>
        </section>
      </main>

      <SiteFooter variant="light" />
    </div>
  );
}
