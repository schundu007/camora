import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import SEO from '../components/shared/SEO';
import { Container, Section, Eyebrow, CTAButton } from '../components/marketing/primitives';

/**
 * LegalPage — single page that renders Terms / Privacy / Security based on
 * the current route. Routes (`/legal/terms`, `/legal/privacy`, `/legal/security`)
 * are mounted in App.tsx.
 *
 * Content is intentionally a placeholder until Cariara legal counsel ships
 * the canonical copy. Until then, the page directs visitors to email
 * legal@cariara.com so the marketing surface doesn't 404 on link click.
 */

type Section = {
  heading: string;
  body: string[];
};

type LegalDoc = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  effective: string;
  sections: Section[];
};

const DOCS: Record<string, LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    eyebrow: 'Legal · Terms',
    intro:
      'These Terms of Service govern your access to and use of Camora — including the Lumora live-session AI, Capra preparation surfaces, and any related Cariara, Inc. products. By creating an account or using the service you agree to these terms.',
    effective: 'Effective date: January 1, 2026',
    sections: [
      {
        heading: '1. Account & access',
        body: [
          'You must be at least 16 years of age to create an account. You are responsible for safeguarding your credentials and for all activity that occurs under your account.',
          'Camora reserves the right to suspend or terminate accounts that violate these terms, abuse the service, or attempt to circumvent usage limits.',
        ],
      },
      {
        heading: '2. Acceptable use',
        body: [
          'You agree not to use Camora to generate, distribute, or facilitate content that is unlawful, infringing, or harmful. AI-assisted answers during live sessions are provided for educational and preparatory purposes — you remain responsible for honest representation of your capabilities.',
          'You may not reverse-engineer, scrape, or attempt to extract the underlying models, prompts, or proprietary curriculum.',
        ],
      },
      {
        heading: '3. Subscriptions, hours & billing',
        body: [
          'Paid plans renew automatically at the cadence selected at checkout. AI-hour top-ups are one-time purchases that do not expire. You may cancel a subscription at any time; access continues through the end of the current billing period.',
          'All charges are processed by Stripe. Cariara does not store full payment-card numbers.',
        ],
      },
      {
        heading: '4. Intellectual property',
        body: [
          'Camora, Cariara, Lumora, Capra, and related marks are trademarks of Cariara, Inc. The Camora platform, curriculum, source code, and AI prompt assets are owned by Cariara or its licensors and are licensed — not sold — to you.',
          'You retain rights to the content you author or upload (resumes, code, notes). By uploading content you grant Cariara a limited license to process it solely to operate the service for you.',
        ],
      },
      {
        heading: '5. Disclaimers & liability',
        body: [
          'The service is provided "as is" without warranty. Cariara is not liable for outcomes of any specific job interview, hiring decision, or examination. AI-generated content may contain inaccuracies — verify critical answers independently.',
          'To the maximum extent permitted by law, Cariara\'s aggregate liability for any claim arising from the service is limited to the amount you paid in the twelve months preceding the claim.',
        ],
      },
      {
        heading: '6. Changes to these terms',
        body: [
          'We may update these terms from time to time. Material changes will be announced by email or in-product notice at least fourteen days before they take effect. Continued use after the effective date constitutes acceptance.',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    eyebrow: 'Legal · Privacy',
    intro:
      'This Privacy Policy explains what information Cariara, Inc. collects when you use Camora, why we collect it, how we use it, and the controls you have over your data. We treat the audio captured during live sessions with particular care.',
    effective: 'Effective date: January 1, 2026',
    sections: [
      {
        heading: '1. Information we collect',
        body: [
          'Account data: name, email, profile picture, OAuth provider identifier. Provided when you sign up via Google or email.',
          'Usage data: pages visited, features used, AI hours consumed, plan tier. Stored in our PostgreSQL database to operate billing and to surface usage in your dashboard.',
          'Interview audio: when you start a Lumora session we capture microphone audio for the duration of the session. Audio is streamed to OpenAI Whisper for transcription and then discarded — we do not retain raw audio after the session ends.',
          'Resume + uploaded content: stored on your behalf so the platform can generate tailored prep plans and answers.',
        ],
      },
      {
        heading: '2. How we use it',
        body: [
          'To operate, secure, and improve the service.',
          'To process payments via Stripe (we do not see or store full card numbers).',
          'To send service-related email (receipts, security notices, plan changes). You can opt out of marketing email at any time.',
          'To generate aggregate, de-identified analytics that help us understand which features deliver the most value.',
        ],
      },
      {
        heading: '3. Sub-processors',
        body: [
          'Camora relies on a small set of vetted infrastructure providers: PostgreSQL hosting (Railway / Neon), Vercel (frontend), OpenAI (transcription + LLM completions), Anthropic (LLM completions), Stripe (payments). Each provider is bound by data-processing terms consistent with this policy.',
        ],
      },
      {
        heading: '4. Your rights',
        body: [
          'You may export, correct, or delete your account data at any time from the Profile page, or by emailing privacy@cariara.com. We honor requests within thirty days.',
          'If you reside in the EU, UK, or California, you have additional rights under GDPR, UK-GDPR, and CCPA respectively, including the right to know what data we hold about you and the right to object to certain processing.',
        ],
      },
      {
        heading: '5. Security',
        body: [
          'Data in transit is encrypted with TLS 1.2 or newer. Database connections require SSL. Authentication uses signed JWT cookies scoped to .cariara.com. Sensitive operations require re-authentication.',
          'See our Security page for additional detail.',
        ],
      },
    ],
  },
  security: {
    slug: 'security',
    title: 'Security',
    eyebrow: 'Legal · Security',
    intro:
      'Security is a baseline expectation, not a feature. This page describes the technical and operational controls Cariara puts in place to protect customer data.',
    effective: 'Last reviewed: April 1, 2026',
    sections: [
      {
        heading: 'Infrastructure',
        body: [
          'Application servers run on Railway with managed PostgreSQL. Static frontend assets are served from Vercel\'s global edge. All inter-service traffic is encrypted with TLS.',
          'Production secrets (API keys, JWT signing keys, database URLs) are stored in the platform secret store and never committed to source control.',
        ],
      },
      {
        heading: 'Authentication',
        body: [
          'User authentication uses Google OAuth backed by signed JWT session cookies scoped to the .cariara.com domain. Tokens are short-lived and refreshed transparently.',
          'Owner / staff dashboards are gated behind an explicit owner-email check on the server, not just URL obscurity.',
        ],
      },
      {
        heading: 'Data handling',
        body: [
          'Live-interview audio is streamed through a transcription pipeline and discarded — we do not persist raw audio after the session ends.',
          'Customer payment data is held by Stripe; Camora servers never see full card numbers. Stripe webhooks are verified by signature against the raw request body.',
          'Stored personal data can be exported or deleted by the account holder at any time.',
        ],
      },
      {
        heading: 'Application security',
        body: [
          'All database queries use parameterized statements — no string interpolation against user input.',
          'Per-IP rate limiting protects auth, AI, and payment endpoints.',
          'Open-redirect protection is enforced on all post-checkout redirects against an allowlist of known domains.',
        ],
      },
      {
        heading: 'Reporting a vulnerability',
        body: [
          'We welcome reports from security researchers. Email security@cariara.com with reproduction steps. We acknowledge reports within 48 hours and will not pursue legal action against good-faith research that respects user data.',
        ],
      },
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const slug = location.pathname.split('/').pop() ?? 'terms';
  const doc = DOCS[slug] ?? DOCS.terms;

  useEffect(() => {
    document.title = `${doc.title} | Camora`;
    return () => { document.title = 'Camora'; };
  }, [doc.title]);

  useEffect(() => { window.scrollTo(0, 0); }, [doc.slug]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
      <SEO title={doc.title} description={doc.intro.slice(0, 155)} path={`/legal/${doc.slug}`} />
      <SiteNav />

      <Section tone="surface" spacing="md" as="main">
        <Container size="sm">
          <Eyebrow>{doc.eyebrow}</Eyebrow>
          <h1 className="mt-3 font-display text-[36px] md:text-[48px] font-semibold tracking-tight leading-[1.06] text-[var(--text-primary)]">
            {doc.title}
          </h1>
          <p className="mt-2 font-mono text-[12px] text-[var(--text-muted)]">{doc.effective}</p>

          <p className="mt-8 text-[15px] leading-relaxed text-[var(--text-secondary)]">{doc.intro}</p>

          <div className="mt-12 space-y-10">
            {doc.sections.map((section, i) => (
              <section key={i}>
                <h2 className="font-display text-[20px] md:text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((para, j) => (
                    <p key={j} className="text-[14.5px] leading-relaxed text-[var(--text-secondary)]">{para}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">Questions?</h3>
            <p className="mt-1.5 text-[13.5px] text-[var(--text-secondary)]">
              Email{' '}
              <a href="mailto:legal@cariara.com" className="font-semibold text-[var(--cam-primary)] hover:underline">
                legal@cariara.com
              </a>{' '}
              for legal questions or{' '}
              <a href="mailto:security@cariara.com" className="font-semibold text-[var(--cam-primary)] hover:underline">
                security@cariara.com
              </a>{' '}
              for security disclosures.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton to="/legal/terms" variant="secondary" size="md">Terms</CTAButton>
              <CTAButton to="/legal/privacy" variant="secondary" size="md">Privacy</CTAButton>
              <CTAButton to="/legal/security" variant="secondary" size="md">Security</CTAButton>
            </div>
          </div>
        </Container>
      </Section>

      <SiteFooter />
    </div>
  );
}
