import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const RELEASES = 'https://github.com/schundu007/camora/releases/latest';
const GITHUB_REPO = 'https://github.com/schundu007/camora';
const APP_VERSION = '1.0.0';

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

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'mac-arm',
    label: 'macOS Apple Silicon',
    arch: 'ARM64 (M1/M2/M3/M4)',
    size: '~102 MB',
    fileType: 'DMG',
    url: `${RELEASES}/download/Camora-${APP_VERSION}-arm64.dmg`,
    icon: 'apple',
  },
  {
    id: 'mac-intel',
    label: 'macOS Intel',
    arch: 'x64 (Intel)',
    size: '~107 MB',
    fileType: 'DMG',
    url: `${RELEASES}/download/Camora-${APP_VERSION}-x64.dmg`,
    icon: 'apple',
  },
  {
    id: 'windows',
    label: 'Windows',
    arch: 'x64 (64-bit)',
    size: '~83 MB',
    fileType: 'EXE',
    url: `${RELEASES}/download/Camora-${APP_VERSION}-Setup.exe`,
    icon: 'windows',
  },
];

const FEATURES = [
  {
    title: 'System Tray',
    desc: 'Lives in your menu bar. Always one click away.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h0M10 10h0M14 10h0M18 10h0M8 14h8" />
      </svg>
    ),
  },
  {
    title: 'Close to Tray',
    desc: 'X closes to tray, not quit. Your session stays alive.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    title: 'Microphone Access',
    desc: 'Native mic permissions. No browser prompts.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    ),
  },
  {
    title: 'Screen-Share Safe',
    desc: 'Invisible to screen share. Interviewers won\'t see it.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <path d="M2 2l20 20" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

/* ══════════════════════════════════════════════════════════════
   OS DETECTION
   ══════════════════════════════════════════════════════════════ */

function getOS(): OSType {
  const ua = navigator.userAgent;
  const platform = (navigator as any).platform || '';
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    if (/arm64/i.test(ua) || (navigator as any).userAgentData?.architecture === 'arm') return 'mac-arm';
    return 'mac-arm'; // Default newer Macs to Apple Silicon
  }
  if (/Linux/i.test(platform)) return 'linux';
  return 'windows';
}

function getPrimaryPlatform(os: OSType): PlatformInfo {
  return PLATFORMS.find(p => p.id === os) || PLATFORMS[0];
}

/* ══════════════════════════════════════════════════════════════
   INLINE SVG ICONS
   ══════════════════════════════════════════════════════════════ */

function AppleLogo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsLogo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 5.548l7.065-.966v6.822H3V5.548zm0 12.904l7.065.966v-6.822H3v5.856zm7.918 1.074L21 21v-7.596h-10.082v6.122zm0-14.052v6.122H21V3L10.918 5.474z" />
    </svg>
  );
}

function DownloadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   ANIMATED SECTION WRAPPER
   ══════════════════════════════════════════════════════════════ */

function FadeInSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function DownloadPage() {
  const navigate = useNavigate();
  const [detectedOS, setDetectedOS] = useState<OSType>('mac-arm');
  const [addonLoading, setAddonLoading] = useState(false);
  const { subscription, subscriptionLoading, isAuthenticated, token } = useAuth();

  const plan = subscription?.plan || 'free';
  const hasDesktopAccess = subscription?.hasDesktopAccess ?? false;
  const isAnnualWithoutAddon = plan === 'annual' && !hasDesktopAccess;
  const isPaid = hasDesktopAccess; // Only Pro or Annual+addon get downloads

  const LUMORA_API = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

  const [proLoading, setProLoading] = useState(false);

  const handleStripeCheckout = async (priceId: string, setLoadingFn: (v: boolean) => void) => {
    if (!token) { navigate('/login?redirect=/download'); return; }
    setLoadingFn(true);
    try {
      const res = await fetch(`${LUMORA_API}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/download?checkout=success`,
          cancel_url: `${window.location.origin}/download`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch { /* checkout failed */ }
    setLoadingFn(false);
  };

  const handleAddonCheckout = () =>
    handleStripeCheckout(import.meta.env.VITE_STRIPE_PRICE_DESKTOP_ADDON || '', setAddonLoading);

  const handleProCheckout = () =>
    handleStripeCheckout('price_1THhzhITUCNxtMxl1QSxi4Kj', setProLoading);

  useEffect(() => {
    document.title = 'Download Camora Desktop — AI Interview Co-Pilot';
    setDetectedOS(getOS());
  }, []);

  const primary = getPrimaryPlatform(detectedOS);

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#0D0C14',
        color: '#F2F1F3',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── Background mesh ────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: [
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(118,185,0,0.08) 0%, transparent 60%)',
            'radial-gradient(ellipse 60% 40% at 20% 50%, rgba(16,185,129,0.04) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 40% at 80% 70%, rgba(139,92,246,0.04) 0%, transparent 60%)',
          ].join(', '),
        }}
      />

      {/* ── Top navigation bar ─────────────────────────── */}
      <nav
        className="relative z-10"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,12,20,0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeftIcon />
            <span>camora.cariara.com</span>
          </Link>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            v{APP_VERSION}
          </span>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════
         HERO SECTION
         ══════════════════════════════════════════════════ */}
      <section className="relative z-10 pt-20 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* App icon */}
          <FadeInSection>
            <div className="flex justify-center mb-8">
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #76B900 0%, #91C733 50%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(118,185,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <path d="M8 22h8" />
                </svg>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight"
              style={{ color: '#F2F1F3' }}
            >
              Camora for Desktop
            </h1>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <p
              className="mt-5 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed"
              style={{ color: '#A1A0AB' }}
            >
              Your AI interview co-pilot, running natively. Faster, always-on, and screen-share safe.
            </p>
          </FadeInSection>

          {/* Primary download button */}
          <FadeInSection delay={0.3}>
            <div className="mt-10 flex flex-col items-center gap-3">
              {subscriptionLoading ? (
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : isPaid ? (
                <>
                  <a
                    href={primary.url}
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #76B900 0%, #91C733 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 24px rgba(118,185,0,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(118,185,0,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(118,185,0,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <DownloadIcon size={22} />
                    Download for {primary.label}
                  </a>
                  <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    v{APP_VERSION} &middot; {primary.fileType} &middot; {primary.size}
                  </span>
                </>
              ) : isAnnualWithoutAddon ? (
                <>
                  <button
                    onClick={handleAddonCheckout}
                    disabled={addonLoading}
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #76B900 0%, #91C733 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 24px rgba(118,185,0,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(118,185,0,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(118,185,0,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {addonLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <DownloadIcon size={22} />
                    )}
                    Add Desktop App — $29/mo
                  </button>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Add-on for your Annual plan &middot; Cancel anytime
                  </span>
                </>
              ) : !isAuthenticated ? (
                <>
                  <Link
                    to="/login?redirect=/download"
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 no-underline"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #76B900 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 24px rgba(16,185,129,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(16,185,129,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(16,185,129,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <LockIcon size={20} />
                    Sign In to Download
                  </Link>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Included with Pro plan &middot; Annual users can add for $29/mo
                  </span>
                </>
              ) : (
                <>
                  <button
                    onClick={handleProCheckout}
                    disabled={proLoading}
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #76B900 100%)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: proLoading ? 'wait' : 'pointer',
                      boxShadow: '0 4px 24px rgba(16,185,129,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(16,185,129,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(16,185,129,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <LockIcon size={20} />
                    {proLoading ? 'Redirecting...' : 'Upgrade to Pro — $49/mo'}
                  </button>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Included with Pro plan &middot; Annual users can add for $29/mo
                  </span>
                </>
              )}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
         PLATFORM CARDS
         ══════════════════════════════════════════════════ */}
      <section className="relative z-10 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <h2
              className="text-center text-sm font-semibold uppercase tracking-widest mb-8"
              style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}
            >
              All Platforms
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLATFORMS.map((p, i) => {
              const isRecommended = p.id === detectedOS;
              return (
                <FadeInSection key={p.id} delay={0.1 * i}>
                  <div
                    className="relative rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-200"
                    style={{
                      background: isRecommended
                        ? 'rgba(118,185,0,0.08)'
                        : 'rgba(255,255,255,0.03)',
                      border: isRecommended
                        ? '1px solid rgba(118,185,0,0.3)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isRecommended
                        ? '0 4px 24px rgba(118,185,0,0.12)'
                        : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isRecommended) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isRecommended) {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                      }
                    }}
                  >
                    {/* Recommended badge */}
                    {isRecommended && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #76B900, #91C733)',
                          color: '#fff',
                          boxShadow: '0 2px 12px rgba(118,185,0,0.4)',
                        }}
                      >
                        Recommended
                      </div>
                    )}

                    {/* OS icon */}
                    <div className="mt-2 mb-4" style={{ color: isRecommended ? '#91C733' : 'rgba(255,255,255,0.5)' }}>
                      {p.icon === 'apple' ? <AppleLogo size={36} /> : <WindowsLogo size={36} />}
                    </div>

                    {/* Platform name */}
                    <h3 className="text-base font-bold mb-1" style={{ color: '#F2F1F3' }}>
                      {p.label}
                    </h3>

                    {/* Details */}
                    <div
                      className="text-xs font-mono space-y-1 mb-5"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      <p>{p.arch}</p>
                      <p>{p.size} &middot; {p.fileType}</p>
                    </div>

                    {/* Download button */}
                    {isPaid ? (
                      <a
                        href={p.url}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                          background: isRecommended
                            ? 'linear-gradient(135deg, #76B900, #91C733)'
                            : 'rgba(255,255,255,0.06)',
                          color: isRecommended ? '#fff' : 'rgba(255,255,255,0.7)',
                          border: isRecommended
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.1)',
                        }}
                        onMouseEnter={e => {
                          if (!isRecommended) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                            (e.currentTarget as HTMLElement).style.color = '#fff';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isRecommended) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
                          }
                        }}
                      >
                        <DownloadIcon size={16} />
                        Download
                      </a>
                    ) : isAnnualWithoutAddon ? (
                      <button
                        onClick={handleAddonCheckout}
                        disabled={addonLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #76B900, #91C733)',
                          color: '#fff',
                        }}
                      >
                        <DownloadIcon size={14} />
                        Add $29/mo
                      </button>
                    ) : !isAuthenticated ? (
                      <Link
                        to="/login?redirect=/download"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 no-underline"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                        }}
                      >
                        <LockIcon size={14} />
                        Sign In
                      </Link>
                    ) : (
                      <button
                        onClick={handleProCheckout}
                        disabled={proLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: proLoading ? 'wait' : 'pointer',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                        }}
                      >
                        <LockIcon size={14} />
                        {proLoading ? 'Redirecting...' : 'Upgrade to Pro'}
                      </button>
                    )}
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
         FEATURES GRID
         ══════════════════════════════════════════════════ */}
      <section className="relative z-10 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <h2
              className="text-center text-2xl sm:text-3xl font-bold mb-3"
              style={{ color: '#F2F1F3' }}
            >
              Built for Interviews
            </h2>
            <p
              className="text-center text-sm mb-12 max-w-md mx-auto"
              style={{ color: '#A1A0AB' }}
            >
              Every feature designed to give you an unfair advantage during technical interviews.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FadeInSection key={f.title} delay={0.06 * i}>
                <div
                  className="rounded-2xl p-5 h-full transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: 'rgba(118,185,0,0.1)',
                      color: '#91C733',
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: '#F2F1F3' }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6C6B7B' }}>
                    {f.desc}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
         SYSTEM REQUIREMENTS
         ══════════════════════════════════════════════════ */}
      <section className="relative z-10 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <h2
              className="text-center text-2xl sm:text-3xl font-bold mb-12"
              style={{ color: '#F2F1F3' }}
            >
              System Requirements
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* macOS */}
            <FadeInSection delay={0.05}>
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <AppleLogo size={24} />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: '#F2F1F3' }}>macOS</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'macOS 12 Monterey or later',
                    'Apple Silicon (M1/M2/M3/M4) or Intel',
                    '200 MB available disk space',
                    'Microphone access for transcription',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#A1A0AB' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#10b981' }}><CheckIcon /></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInSection>

            {/* Windows */}
            <FadeInSection delay={0.1}>
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <WindowsLogo size={24} />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: '#F2F1F3' }}>Windows</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Windows 10 or later',
                    '64-bit (x64) processor',
                    '200 MB available disk space',
                    'Microphone access for transcription',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#A1A0AB' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#10b981' }}><CheckIcon /></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
         FOOTER
         ══════════════════════════════════════════════════ */}
      <footer className="relative z-10 pb-16 px-6">
        <div
          className="max-w-4xl mx-auto pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
            <a
              href={`${GITHUB_REPO}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
            >
              All releases
              <ExternalLinkIcon />
            </a>

            <span style={{ color: 'rgba(255,255,255,0.1)' }}>&middot;</span>

            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
            >
              <GithubIcon />
              View on GitHub
            </a>

            <span style={{ color: 'rgba(255,255,255,0.1)' }}>&middot;</span>

            <Link
              to="/"
              className="inline-flex items-center gap-2 transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
            >
              camora.cariara.com
            </Link>
          </div>

          <p
            className="text-center mt-6 text-xs"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            &copy; {new Date().getFullYear()} Camora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
