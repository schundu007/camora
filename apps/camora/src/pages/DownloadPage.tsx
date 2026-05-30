import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import SEO from '../components/shared/SEO';
import {
  Container,
  Section,
  Eyebrow,
  SectionHeading,
  CTAButton,
  Pill,
  SurfaceCard,
} from '../components/marketing/primitives';
import { cn } from '../utils/cn';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const GITHUB_REPO = 'https://github.com/schundu007/camora';
const RELEASES_API = 'https://api.github.com/repos/schundu007/camora/releases/latest';

type OSType = 'mac-arm' | 'mac-intel' | 'windows' | 'linux';

interface PlatformInfo {
  id: OSType;
  label: string;
  arch: string;
  size: string;
  fileType: string;
  url: string;
  icon: 'apple' | 'windows';
}

function getPlatforms(version: string): PlatformInfo[] {
  const base = `${GITHUB_REPO}/releases/download/desktop-v${version}`;
  return [
    {
      id: 'mac-arm',
      label: 'macOS Apple Silicon',
      arch: 'ARM64 (M1/M2/M3/M4)',
      size: '~102 MB',
      fileType: 'DMG',
      url: `${base}/Camora-${version}-arm64.dmg`,
      icon: 'apple',
    },
    {
      id: 'mac-intel',
      label: 'macOS Intel',
      arch: 'x64 (Intel)',
      size: '~107 MB',
      fileType: 'DMG',
      url: `${base}/Camora-${version}-x64.dmg`,
      icon: 'apple',
    },
    {
      id: 'windows',
      label: 'Windows',
      arch: 'x64 (64-bit)',
      size: '~83 MB',
      fileType: 'EXE',
      url: `${base}/Camora-${version}-Setup.exe`,
      icon: 'windows',
    },
  ];
}

const FEATURES = [
  {
    title: 'System Tray',
    desc: 'Lives in your menu bar. Always one click away.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <circle cx="7" cy="6" r="0.5" fill="currentColor" />
        <circle cx="10" cy="6" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Global Hotkey',
    desc: 'Cmd+Shift+C summons Camora instantly during any interview.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h0M10 10h0M14 10h0M18 10h0M8 14h8" />
      </svg>
    ),
  },
  {
    title: 'Close to Tray',
    desc: 'X closes to tray, not quit. Your session stays alive.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    title: 'Microphone Access',
    desc: 'Native mic permissions. No browser prompts.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    title: 'Auto Updates',
    desc: 'Automatic updates. Always the latest features.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    ),
  },
  {
    title: 'Screen-Share Safe',
    desc: 'Invisible to screen share. Interviewers won\'t see it.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <path d="M2 2l20 20" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const MAC_REQS = [
  'macOS 12 Monterey or later',
  'Apple Silicon (M1/M2/M3/M4) or Intel',
  '200 MB available disk space',
  'Microphone access for transcription',
];

const WIN_REQS = [
  'Windows 10 or later',
  '64-bit (x64) processor',
  '200 MB available disk space',
  'Microphone access for transcription',
];

/* ══════════════════════════════════════════════════════════════
   OS DETECTION
   ══════════════════════════════════════════════════════════════ */

function getOS(): OSType {
  const ua = navigator.userAgent;
  const platform = (navigator as { platform?: string }).platform || '';
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    if (/arm64/i.test(ua) || (navigator as { userAgentData?: { architecture?: string } }).userAgentData?.architecture === 'arm') return 'mac-arm';
    return 'mac-arm';
  }
  if (/Linux/i.test(platform)) return 'linux';
  return 'windows';
}

function getPrimaryPlatform(os: OSType, platforms: PlatformInfo[]): PlatformInfo {
  return platforms.find((p) => p.id === os) || platforms[0];
}

/* ══════════════════════════════════════════════════════════════
   ICONS
   ══════════════════════════════════════════════════════════════ */

function AppleLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.548l7.065-.966v6.822H3V5.548zm0 12.904l7.065.966v-6.822H3v5.856zm7.918 1.074L21 21v-7.596h-10.082v6.122zm0-14.052v6.122H21V3L10.918 5.474z" />
    </svg>
  );
}

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   ANIMATED FADE-IN WRAPPER
   ══════════════════════════════════════════════════════════════ */

function FadeInSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn('transition-[opacity,transform] duration-500 ease-out', className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════ */

export default function DownloadPage() {
  const navigate = useNavigate();
  const [detectedOS, setDetectedOS] = useState<OSType>('mac-arm');
  const [appVersion, setAppVersion] = useState('2.1.0');
  const { subscription, subscriptionLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    fetch(RELEASES_API)
      .then((r) => r.json())
      .then((data) => {
        const tag = data.tag_name || '';
        const ver = tag.replace('desktop-v', '').replace('v', '');
        if (ver) setAppVersion(ver);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'Download Camora Desktop — AI Interview Co-Pilot';
    setDetectedOS(getOS());
  }, []);

  const PLATFORMS = getPlatforms(appVersion);
  const plan = subscription?.plan || 'free';
  const isPaid = plan !== 'free';
  const primary = getPrimaryPlatform(detectedOS, PLATFORMS);
  const goToPricing = () => navigate('/pricing?returnTo=/download');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">
      <SEO
        title="Download Camora Desktop"
        description="Native desktop app for macOS and Windows — system tray, global hotkey, screen-share safe. Included with every paid plan."
        path="/download"
      />
      <SiteNav />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-[#0A1228] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.10), transparent 60%),' +
              'radial-gradient(ellipse 55% 60% at 12% 30%, rgba(201,162,39,0.18), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 88% 70%, rgba(38,97,156,0.30), transparent 60%),' +
              'linear-gradient(135deg, #07112A 0%, #0B1A3D 50%, #0A1228 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, black, transparent 75%)',
          }}
        />

        <Container className="relative pt-16 pb-20 md:pt-20 md:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <FadeInSection>
              <div className="mb-7 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--cam-primary-lt)] to-[var(--cam-primary-dk)] shadow-[0_8px_32px_-8px_rgba(38,97,156,0.7)]">
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <path d="M8 22h8" />
                  </svg>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.05}>
              <Pill tone="inverse" withDot>Camora Desktop · v{appVersion}</Pill>
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <h1 className="mt-6 font-display text-[40px] sm:text-[52px] md:text-[64px] font-semibold tracking-tight leading-[1.04] text-white">
                Camora for{' '}
                <span className="bg-gradient-to-r from-[var(--cam-gold-leaf-lt)] via-[var(--cam-gold-leaf)] to-[var(--cam-gold-leaf-lt)] bg-clip-text text-transparent">
                  Desktop
                </span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.18}>
              <p className="mt-5 mx-auto max-w-xl text-base md:text-lg leading-relaxed text-white/72">
                Your AI interview co-pilot, running natively. Faster, always-on, and screen-share safe.
              </p>
            </FadeInSection>

            <FadeInSection delay={0.26}>
              <div className="mt-10 flex flex-col items-center gap-3">
                {subscriptionLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" aria-hidden="true" />
                ) : isPaid ? (
                  <>
                    <CTAButton href={primary.url} variant="inverse-primary" size="lg">
                      <DownloadIcon size={18} />
                      Download for {primary.label}
                    </CTAButton>
                    <span className="font-mono text-[11px] text-white/45">
                      v{appVersion} · {primary.fileType} · {primary.size}
                    </span>
                  </>
                ) : !isAuthenticated ? (
                  <>
                    <CTAButton to="/login?redirect=/download" variant="inverse-primary" size="lg">
                      <LockIcon size={16} />
                      Sign in to download
                    </CTAButton>
                    <span className="text-[12px] text-white/55">Included with every paid plan</span>
                  </>
                ) : (
                  <>
                    <CTAButton onClick={goToPricing} variant="inverse-primary" size="lg">
                      <LockIcon size={16} />
                      Subscribe to download
                    </CTAButton>
                    <span className="text-[12px] text-white/55">Included with every paid plan</span>
                  </>
                )}
              </div>
            </FadeInSection>
          </div>
        </Container>
      </section>

      {/* ═══════════ ALL PLATFORMS ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container>
          <FadeInSection>
            <SectionHeading
              align="center"
              eyebrow="All platforms"
              title={<>Pick your <span className="text-[var(--cam-primary)]">build.</span></>}
              lead="Native installers for macOS (Apple Silicon and Intel) and Windows. We auto-detect your platform and recommend the right one."
            />
          </FadeInSection>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PLATFORMS.map((p, i) => {
              const isRecommended = p.id === detectedOS;
              return (
                <FadeInSection key={p.id} delay={0.05 * i}>
                  <div
                    className={cn(
                      'relative h-full rounded-2xl border p-6 flex flex-col items-center text-center transition-[transform,box-shadow,border-color]',
                      isRecommended
                        ? 'border-[var(--cam-primary)] bg-[var(--accent-subtle)]'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:-translate-y-0.5 hover:border-[var(--border-hover)]',
                    )}
                  >
                    {isRecommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Pill tone="accent">Recommended</Pill>
                      </span>
                    )}

                    <div className={cn('mt-2 mb-4', isRecommended ? 'text-[var(--cam-primary)]' : 'text-[var(--text-muted)]')}>
                      {p.icon === 'apple' ? <AppleLogo size={32} /> : <WindowsLogo size={32} />}
                    </div>

                    <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
                      {p.label}
                    </h3>
                    <div className="mt-2 mb-5 space-y-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                      <p>{p.arch}</p>
                      <p>{p.size} · {p.fileType}</p>
                    </div>

                    {isPaid ? (
                      <CTAButton href={p.url} variant={isRecommended ? 'primary' : 'secondary'} size="md">
                        <DownloadIcon size={14} />
                        Download
                      </CTAButton>
                    ) : !isAuthenticated ? (
                      <CTAButton to="/login?redirect=/download" variant="secondary" size="md">
                        <LockIcon size={14} />
                        Sign in
                      </CTAButton>
                    ) : (
                      <CTAButton onClick={goToPricing} variant="secondary" size="md">
                        <LockIcon size={14} />
                        Subscribe
                      </CTAButton>
                    )}
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* ═══════════ FEATURES ═══════════ */}
      <Section tone="muted" spacing="md">
        <Container>
          <FadeInSection>
            <SectionHeading
              align="center"
              eyebrow="Built for interviews"
              title={<>Every feature, <span className="text-[var(--cam-primary)]">unfair advantage.</span></>}
              lead="Designed for the moment that decides the offer."
            />
          </FadeInSection>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeInSection key={f.title} delay={0.04 * i}>
                <SurfaceCard interactive padding="md" className="h-full">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--cam-primary)]">
                    {f.icon}
                  </div>
                  <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                    {f.desc}
                  </p>
                </SurfaceCard>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </Section>

      {/* ═══════════ SYSTEM REQUIREMENTS ═══════════ */}
      <Section tone="surface" spacing="md">
        <Container>
          <FadeInSection>
            <SectionHeading
              align="center"
              eyebrow="System requirements"
              title="Runs on what you already have."
            />
          </FadeInSection>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <RequirementsCard icon={<AppleLogo size={20} />} platform="macOS" reqs={MAC_REQS} />
            <RequirementsCard icon={<WindowsLogo size={20} />} platform="Windows" reqs={WIN_REQS} delay={0.05} />
          </div>
        </Container>
      </Section>

      {/* ═══════════ RELEASES STRIP ═══════════ */}
      <Section tone="muted" spacing="sm">
        <Container size="md">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <Eyebrow>Release notes</Eyebrow>
              <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                Browse the full release history on GitHub.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <CTAButton href={`${GITHUB_REPO}/releases`} variant="secondary" size="md">
                All releases
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </CTAButton>
              <CTAButton href={GITHUB_REPO} variant="ghost" size="md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View on GitHub
              </CTAButton>
            </div>
          </div>
        </Container>
      </Section>

      <SiteFooter />
    </div>
  );
}

function RequirementsCard({
  icon, platform, reqs, delay = 0,
}: {
  icon: React.ReactNode; platform: string; reqs: string[]; delay?: number;
}) {
  return (
    <FadeInSection delay={delay}>
      <SurfaceCard padding="md" className="h-full">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            {icon}
          </span>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">{platform}</h3>
        </div>
        <ul className="space-y-3">
          {reqs.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-[var(--text-secondary)]">
              <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(30,77,120,0.12)] text-[#1e4d78]">
                <CheckIcon />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </FadeInSection>
  );
}
