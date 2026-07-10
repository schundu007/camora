import { Link } from 'react-router-dom';
import DocsPageLayout from './_layout';
import { useAuth } from '../../contexts/AuthContext';
import { isOwnerEmail } from '../../lib/owner';

interface DocCard {
  title: string;
  description: string;
  href: string;
}

const USER_GUIDES: DocCard[] = [
  { title: 'Getting started', description: 'Sign up, onboarding, and your first prep session.', href: '/docs/getting-started' },
  { title: 'Prepare', description: 'Browse 1,500+ prep topics, generate company-specific prep, free tier limits.', href: '/docs/prepare' },
  { title: 'Practice', description: 'DSA problems, system design exercises, behavioral STAR practice.', href: '/docs/practice' },
  { title: 'Live Session', description: 'Connect audio, use Sona, capture system audio, run a live session.', href: '/docs/lumora-live' },
  { title: 'Coding helper', description: 'Multi-language coding playground with three-approach solutions and complexity analysis.', href: '/docs/lumora-coding' },
  { title: 'System Design', description: 'Architecture diagrams, design patterns, scaling drills.', href: '/docs/lumora-design' },
  { title: 'Account & billing', description: 'Plans, payment methods, cancel and resume subscriptions.', href: '/docs/account' },
  { title: 'Team sharing', description: 'Invite mates, share AI hours, set per-member caps, configure auto top-up.', href: '/docs/teams' },
  { title: 'Top-ups & AI hours', description: 'How AI hours work, when to top up, auto-topup configuration, refunds.', href: '/docs/topups' },
  { title: 'Desktop app', description: 'Stealth-mode desktop client with global hotkey, system audio, and BYOK.', href: '/docs/desktop' },
  { title: 'Voice filtering', description: 'Speaker verification — only transcribe the interviewer, not your own voice.', href: '/docs/voice-filtering' },
  { title: 'Audio setup', description: 'Mics, speakers, system loopback, BlackHole / VoiceMeeter — every customer setup.', href: '/docs/audio-setup' },
  { title: 'Playground', description: 'Disposable Linux containers with browser terminal and VS Code IDE — start in seconds, save your environment.', href: '/docs/playground' },
];

const ADMIN_RUNBOOKS: DocCard[] = [
  { title: 'Operations overview', description: 'Service map, deployment topology, where everything lives.', href: '/docs/admin' },
  { title: 'Stripe configuration', description: 'Price IDs, webhook events, test mode, recurring vs one-time SKUs.', href: '/docs/admin/stripe' },
  { title: 'Environment variables', description: 'Every env var across frontend, ascend-backend, lumora-backend, ai-services.', href: '/docs/admin/env-vars' },
  { title: 'Deployment runbook', description: 'Vercel frontend, Railway backends, Docker AI services, cache busting.', href: '/docs/admin/deployment' },
  { title: 'Database schema', description: 'Tables, idempotent migrations, when to manually intervene.', href: '/docs/admin/database' },
  { title: 'Refund approval', description: 'Reviewing and approving top-up refund requests via /admin/teams.', href: '/docs/admin/refunds' },
  { title: 'Incident response', description: 'When Stripe is down, when an LLM provider 502s, when the pool gate misfires.', href: '/docs/admin/incidents' },
  { title: 'Playground (engineering)', description: 'SSH Docker orchestration, WebSocket proxies, VM save/restore, boot progress protocol, issues faced and design decisions.', href: '/docs/admin/playground' },
];

function DocCardLink({ card }: { card: DocCard }) {
  return (
    <Link
      to={card.href}
      className="group block rounded-xl p-5 transition-[transform,box-shadow] duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="text-base font-bold group-hover:underline" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
        <span
          role="button"
          tabIndex={0}
          data-tip="Click to copy link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = window.location.origin + card.href;
            const node = e.currentTarget as HTMLSpanElement;
            const original = node.textContent || card.href;
            navigator.clipboard?.writeText(url).then(() => {
              node.textContent = 'copied';
              setTimeout(() => { if (node) node.textContent = original; }, 1200);
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              (e.currentTarget as HTMLElement).click();
            }
          }}
          className="shrink-0 inline-flex items-center text-[10.5px] font-mono px-2 py-0.5 rounded-md transition-colors hover:bg-black/10"
          style={{
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {card.href}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.description}</p>
    </Link>
  );
}

export default function DocsIndexPage() {
  const { user } = useAuth();
  const isOwner = isOwnerEmail(user?.email);

  const onThisPage = [
    { id: 'user-guides', label: 'User guides' },
    ...(isOwner ? [{ id: 'admin-runbooks', label: 'Administration & runbooks' }] : []),
    { id: 'feedback', label: 'Help & feedback' },
  ];

  return (
    <DocsPageLayout
      title="Camora documentation"
      description="User guides for everyone using Camora, plus internal runbooks for operators. Pick a topic below or use the sidebar."
      path="/docs"
      onThisPage={onThisPage}
    >
      <section id="user-guides" className="mb-12 scroll-mt-24">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: 'var(--text-muted)' }}>User guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {USER_GUIDES.map((card) => <DocCardLink key={card.href} card={card} />)}
        </div>
      </section>

      {isOwner && (
        <section id="admin-runbooks" className="mb-12 scroll-mt-24">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: 'var(--text-muted)' }}>Administration &amp; runbooks</h2>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            For Camora operators. Most pages assume access to the Stripe dashboard, Railway services, and the
            Postgres database.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ADMIN_RUNBOOKS.map((card) => <DocCardLink key={card.href} card={card} />)}
          </div>
        </section>
      )}

      <section id="feedback" className="rounded-xl p-6 scroll-mt-24" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <h2 className="text-base font-bold mb-2">Need something not covered here?</h2>
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>
          Email <a href="mailto:hi@cariara.com" className="text-[var(--accent)] underline">hi@cariara.com</a> with what you were trying to do and we'll get a doc page up for it.
        </p>
      </section>
    </DocsPageLayout>
  );
}
