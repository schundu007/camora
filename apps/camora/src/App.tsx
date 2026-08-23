import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { lazy, Suspense, useEffect, useState } from 'react';
import SiteNav from './components/shared/SiteNav';
import RootShell from './components/layout/RootShell';
import { PaywallGate } from './components/shared/ui/PaywallGate';
import { isOwnerEmail } from './lib/owner';
import { usePageTracker } from './hooks/usePageTracker';
import { DialogProvider } from './components/shared/Dialog';
import { CelebrationProvider } from './components/shared/Celebration';
import { caraRegistry } from '@/lib/cara-registry';
import { isElectron } from '@/lib/overlayMode';
import { useSessionStore } from '@/stores/session-store';
import CaraBar from '@/components/shared/cara/CaraBar';
import { DesktopWindowControls } from '@/components/lumora/shell/DesktopWindowControls';
import { TooltipLayer } from '@/components/shared/TooltipLayer';

// ── Shared pages ────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// ── Lumora pages (live session) ───────────────────────
const LumoraShellPage = lazy(() => import('./pages/lumora/LumoraShellPage'));
const CodingProctoredPage = lazy(() => import('./pages/lumora/CodingPage').then(m => ({ default: m.CodingProctoredPage })));

// ── Capra pages (preparation) ───────────────────────────
const CapraDashboard = lazy(() => import('./pages/capra/DashboardPage'));
const ResumePage = lazy(() => import('./pages/capra/ResumePage'));
const ResumeGeneratorPage = lazy(() => import('./pages/capra/ResumeGeneratorPage'));
const CapraPractice = lazy(() => import('./pages/capra/PracticePage'));
const CapraPrepare = lazy(() => import('./pages/capra/PreparePage'));
const CapraOnboarding = lazy(() => import('./pages/capra/OnboardingPage'));
const CapraLanding = lazy(() => import('./pages/capra/CapraLandingPage'));
const PrepPlanPage = lazy(() => import('./pages/capra/PrepPlanPage'));
const HRLibraryPage = lazy(() => import('./pages/capra/HRLibraryPage'));
const ProblemDetailPage = lazy(() => import('./pages/capra/ProblemDetailPage'));
const MCQPage          = lazy(() => import('./pages/capra/MCQPage'));
const QuizSessionPage  = lazy(() => import('./pages/capra/QuizSessionPage'));
const FlashcardsPage   = lazy(() => import('./pages/capra/FlashcardsPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobPrepPage = lazy(() => import('./pages/JobPrepPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ReferralLandingPage = lazy(() => import('./pages/ReferralLandingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PublicScoreCardPage = lazy(() => import('./pages/PublicScoreCardPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const Blind75Page = lazy(() => import('./pages/Blind75Page'));
const Blind75PracticePage = lazy(() => import('./pages/Blind75PracticePage'));
const CompanyQuestionsPage = lazy(() => import('./pages/CompanyQuestionsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const JobProfilePage = lazy(() => import('./pages/JobProfilePage'));
const TeamSettingsPage = lazy(() => import('./pages/account/TeamSettingsPage'));
const JoinTeamPage = lazy(() => import('./pages/account/JoinTeamPage'));
const TeamsDocsPage = lazy(() => import('./pages/docs/TeamsDocsPage'));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage'));
const DocsIndexPage = lazy(() => import('./pages/docs/DocsIndexPage'));
const GettingStartedPage = lazy(() => import('./pages/docs/GettingStartedPage'));
const PrepareDocsPage = lazy(() => import('./pages/docs/PreparePage'));
const PracticeDocsPage = lazy(() => import('./pages/docs/PracticeDocsPage'));
const LumoraLivePage = lazy(() => import('./pages/docs/LumoraLivePage'));
const LumoraCodingDocsPage = lazy(() => import('./pages/docs/LumoraCodingPage'));
const LumoraDesignDocsPage = lazy(() => import('./pages/docs/LumoraDesignPage'));
const AccountDocsPage = lazy(() => import('./pages/docs/AccountPage'));
const TopupsDocsPage = lazy(() => import('./pages/docs/TopupsPage'));
const DesktopDocsPage = lazy(() => import('./pages/docs/DesktopPage'));
const VoiceFilteringDocsPage = lazy(() => import('./pages/docs/VoiceFilteringPage'));
const AudioSetupDocsPage = lazy(() => import('./pages/docs/AudioSetupPage'));
const AdminOverviewPage = lazy(() => import('./pages/docs/admin/AdminOverviewPage'));
const AdminStripePage = lazy(() => import('./pages/docs/admin/AdminStripePage'));
const AdminEnvVarsPage = lazy(() => import('./pages/docs/admin/AdminEnvVarsPage'));
const AdminDeploymentPage = lazy(() => import('./pages/docs/admin/AdminDeploymentPage'));
const AdminDatabasePage = lazy(() => import('./pages/docs/admin/AdminDatabasePage'));
const AdminRefundsPage = lazy(() => import('./pages/docs/admin/AdminRefundsPage'));
const AdminIncidentsPage = lazy(() => import('./pages/docs/admin/AdminIncidentsPage'));
const AdminLumoraLivePage = lazy(() => import('./pages/docs/admin/AdminLumoraLivePage'));
const AdminLumoraCodingPage = lazy(() => import('./pages/docs/admin/AdminLumoraCodingPage'));
const AdminLumoraDesignPage = lazy(() => import('./pages/docs/admin/AdminLumoraDesignPage'));
const PlaygroundDocsPage = lazy(() => import('./pages/docs/PlaygroundDocsPage'));
const AdminPlaygroundPage = lazy(() => import('./pages/docs/admin/AdminPlaygroundPage'));
const AdminMobilePage = lazy(() => import('./pages/docs/admin/AdminMobilePage'));
const FlyerPage = lazy(() => import('./pages/FlyerPage'));
const MobileAuthPage = lazy(() => import('./pages/MobileAuthPage'));
const PythonLearnPage = lazy(() => import('./pages/capra/PythonLearnPage'));
const K8sPathPage = lazy(() => import('./pages/capra/K8sPathPage'));
const CodeSignalLearnPage = lazy(() => import('./pages/capra/CodeSignalLearnPage'));
const ProgramizLearnPage = lazy(() => import('./pages/capra/ProgramizLearnPage'));
const LearnTopicPage = lazy(() => import('./pages/capra/LearnTopicPage'));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage'));
const AdminPlaygroundObservePage = lazy(() => import('./pages/admin/AdminPlaygroundObservePage'));
const AdminApiKeysPage = lazy(() => import('./pages/admin/AdminApiKeysPage'));

const Loading = () => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-app)' }}
    >
      <div className="w-12 h-12 border-4 border-[var(--bg-elevated)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  );
}

const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  // Desktop sign-in opens the SYSTEM browser, so the Electron window shows no
  // change on click — which reads as a dead button and tempts users to click
  // again. Each extra click starts another PKCE login; the deep-link return
  // then can't tell which verifier to use and the exchange 401s. Latch after
  // the first launch so we show "check your browser" instead of re-firing.
  const [launched, setLaunched] = useState(false);

  if (isLoading) return <Loading />;
  // Accept both `redirect` and `returnTo` so the chain survives whichever
  // upstream surface deep-linked here (PaywallGate → /pricing → /login uses
  // returnTo; ProtectedRoute → /login uses redirect; OAuth callback may use
  // either). Validate it's a same-origin path so we can't be coerced into
  // an open redirect.
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('redirect') || params.get('returnTo') || '/';
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  // Desktop (Electron) must NOT run Google OAuth in-window — Google blocks
  // embedded browsers ("This browser or app may not be secure"). The shell
  // exposes camo.startLogin(), which opens the system browser and completes an
  // RFC 8252 PKCE flow, then reloads authenticated via the cariara_sso cookie.
  const camo = (window as unknown as { camo?: { isDesktop?: boolean; startLogin?: (o: { redirect: string }) => void } }).camo;
  const isDesktop = !!camo?.isDesktop && typeof camo.startLogin === 'function';

  const oauthUrl = import.meta.env.VITE_OAUTH_URL;
  if (oauthUrl && !isDesktop) {
    window.location.href = oauthUrl;
    return <Loading />;
  }

  const googleAuthUrl = `${import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com'}/api/auth/google/login?redirect=${encodeURIComponent(redirectTo)}`;

  const handleGoogleLogin = (e: { preventDefault: () => void }) => {
    if (isDesktop) {
      e.preventDefault();
      setLaunched(true);
      camo!.startLogin!({ redirect: redirectTo });
    }
  };

  const STATS = [
    { value: '1,000+', label: 'Matched Roles' },
    { value: '1,500+', label: 'Study Topics' },
    { value: '9,500+', label: 'Practice Problems' },
    { value: 'Live AI', label: 'In Your Interview' },
  ];

  const STEPS = [
    { letter: 'A', label: 'Apply',    desc: 'AI-matched jobs + tailored resumes' },
    { letter: 'P', label: 'Prepare',  desc: 'System design, DSA & behavioral topics' },
    { letter: 'P', label: 'Practice', desc: '9,500+ problems with AI feedback' },
    { letter: 'A', label: 'Attend',   desc: 'Real-time AI answers during the interview' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>

      {/* ── LEFT — Camora highlights ───────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 px-14 py-12 relative overflow-hidden"
        style={{ background: 'var(--cam-hero-bg)' }}
      >
        <div>
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Camora</span>
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--cam-gold-leaf-50)', color: 'var(--cam-gold-leaf-lt)', border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 30%, transparent)' }}>
            AI Interview Platform
          </span>
        </div>

        <style>{`
          @keyframes statCardGlow {
            from { box-shadow: 0 0 0 1px rgba(0,108,224,0.12), 0 2px 8px rgba(0,0,0,0.12); }
            to   { box-shadow: 0 0 0 1px rgba(255,153,0,0.28), 0 4px 20px rgba(0,108,224,0.18), 0 0 30px rgba(255,153,0,0.08); }
          }
          @keyframes badgePulse {
            from { box-shadow: 0 2px 6px rgba(0,108,224,0.25); }
            to   { box-shadow: 0 2px 12px rgba(255,153,0,0.45), 0 0 20px rgba(0,108,224,0.20); }
          }
          @keyframes goldShimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
        `}</style>
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-md mx-auto w-full">
          <h2 className="text-[40px] font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Get the offer.<br />
            <span style={{
              background: 'linear-gradient(90deg, var(--cam-gold-leaf-lt) 0%, #FFF3C4 45%, var(--cam-gold-leaf-lt) 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'goldShimmer 3s linear infinite',
            }}>Every step.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            From job discovery to live interview AI — one platform for every stage of your tech career.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 w-full">
            {STATS.map((s, si) => (
              <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{
                background: 'linear-gradient(135deg, rgba(0,108,224,0.10) 0%, rgba(255,255,255,0.03) 50%, rgba(255,153,0,0.07) 100%)',
                border: '1px solid rgba(0,108,224,0.15)',
                animation: `statCardGlow ${2.5 + si * 0.4}s ease-in-out ${si * 0.3}s infinite alternate`,
              }}>
                <p className="text-[22px] font-bold" style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, var(--cam-primary-lt) 0%, var(--cam-gold-leaf-lt) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{s.value}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3 text-left w-full">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold" style={{
                  background: 'linear-gradient(135deg, var(--cam-primary-dk) 0%, var(--cam-gold-leaf) 100%)',
                  color: '#fff',
                  animation: `badgePulse ${2 + i * 0.3}s ease-in-out ${i * 0.2}s infinite alternate`,
                }}>
                  {s.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label} — </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Used by engineers interviewing at Google, Meta, Amazon &amp; more.
        </p>
      </div>

      {/* ── RIGHT — Login form ─────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center w-full lg:w-[420px] xl:w-[460px] shrink-0 px-10 py-12"
        style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border)' }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(0,108,224,0.4)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Sign in to Camora
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Continue your interview prep</p>
          </div>

          <div className="space-y-3">
            {isDesktop && launched ? (
              <div
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 shrink-0 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                  <span className="font-semibold">Finish signing in in your browser</span>
                </div>
                <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  We opened your default browser — it may be behind this window. Complete Google sign-in there and you'll return here automatically.
                </p>
                <button
                  onClick={() => camo!.startLogin!({ redirect: redirectTo })}
                  className="mt-3 text-[13px] font-semibold hover:underline"
                  style={{ color: 'var(--cam-primary-lt)' }}
                >
                  Didn't see it? Reopen the browser
                </button>
              </div>
            ) : (
            <a
              href={googleAuthUrl}
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-[background-color,box-shadow,transform] active:scale-[0.98] hover:brightness-110"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>
            )}
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold cursor-not-allowed opacity-40" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub — Coming Soon
            </button>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold cursor-not-allowed opacity-40" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn — Coming Soon
            </button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: 'var(--cam-primary-lt)' }}>Create one</Link>
          </p>
          <p className="mt-4 text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
            By continuing you agree to our{' '}
            <Link to="/docs/terms" className="underline">Terms</Link>{' '}and{' '}
            <Link to="/docs/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Bare /capra is non-canonical (memory rule says never route there). The
 * default landing is /capra/prepare. But several legacy callers passed
 * ?problem=...&mode=... to bare /capra to launch the solver — strip-style
 * <Navigate> would have dropped those params silently. Route them to the
 * mode's canonical path with the query intact.
 */
const CapraRootRedirect = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const target =
    mode === 'system-design' ? '/capra/design'
    : mode === 'behavioral'   ? '/capra/prep'
    : params.has('problem')   ? '/capra/coding'
    : '/capra/prepare';
  // Drop ?mode= since it's encoded in the path now; keep everything else.
  params.delete('mode');
  const tail = params.toString();
  return <Navigate to={tail ? `${target}?${tail}` : target} replace />;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, onboardingCompleted, hasResume } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  // Only enforce onboarding for Capra routes that need a role. Read-only
  // surfaces (/capra/prepare/*) are free to browse without onboarding —
  // per the freemium model, Capra content is open and only the role-aware
  // solver/practice flows require setup. Pass the original target
  // through ?redirect= so OnboardingPage can return the user to where
  // they were headed instead of dead-ending on /capra/prepare.
  // sessionStorage flag is set when user explicitly skips resume upload —
  // allows free navigation this session while the DB still has
  // onboarding_completed=false so the gate re-fires on next login.
  const isOnboardingExempt =
    location.pathname.startsWith('/capra/prepare') ||
    location.pathname === '/capra/onboarding' ||
    sessionStorage.getItem('camora_onboarding_skip_resume') === '1';
  if (location.pathname.startsWith('/capra') && (onboardingCompleted === false || hasResume === false) && !isOnboardingExempt) {
    const target = location.pathname + location.search;
    return <Navigate to={`/capra/onboarding?redirect=${encodeURIComponent(target)}`} replace />;
  }
  return <>{children}</>;
}

const ShellRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <RootShell>{children}</RootShell>
    </ProtectedRoute>
  );
}

const PaidRoute = ({ children, feature = 'Lumora Live Session' }: { children: React.ReactNode; feature?: string }) => {
  return (
    <ProtectedRoute>
      <PaywallGate feature={feature}>{children}</PaywallGate>
    </ProtectedRoute>
  );
}

/**
 * OwnerRoute — staff-only route guard. Protects internal admin docs
 * (/docs/admin/*) and similar surfaces that expose Stripe IDs, env
 * names, deployment topology, refund procedures. Was an unauth public
 * surface before PR-3.
 */
const OwnerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (!isOwnerEmail(user?.email)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const PageTracker = () => {
  usePageTracker();
  return null;
}

/**
 * Set a sane default document.title on every route change so the tab
 * never carries a stale title from the previous page. Individual pages
 * may still override with a more specific title in their own useEffect
 * — this only sets a fallback if they don't.
 */
/**
 * Set data-product attribute on <html> so CSS can differentiate
 * Lumora (live interview cockpit) from Capra (prep/study library).
 * Defaults to 'capra' (the browsable product). Bare /docs routes
 * and shared surfaces like /profile, /pricing, /login get no
 * product override (leave the default for backward compat).
 */
const ProductAttribute = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const root = document.documentElement;
    if (pathname.startsWith('/lumora') || pathname.startsWith('/app')) {
      root.setAttribute('data-product', 'lumora');
    } else if (
      pathname.startsWith('/capra') ||
      pathname.startsWith('/prepare') ||
      pathname.startsWith('/practice') ||
      pathname.startsWith('/handbook') ||
      pathname.startsWith('/problems') ||
      pathname.startsWith('/jobs') ||
      pathname.startsWith('/profile')
    ) {
      root.setAttribute('data-product', 'capra');
    } else {
      root.removeAttribute('data-product');
    }
  }, [pathname]);
  return null;
};

const RouteTitle = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const fallbacks: Array<[string, string]> = [
      ['/lumora', 'Lumora — Camora'],
      ['/playground', 'Playground — Camora'],
      ['/capra/prepare', 'Prepare — Camora'],
      ['/capra/practice', 'Practice — Camora'],
      ['/capra/plan', 'Study Plan — Camora'],
      ['/capra/library', 'Problem Library — Camora'],
      ['/capra/problems', 'Problem — Camora'],
      ['/capra/learn/python', 'Python — Learning Library — Camora'],
      ['/capra/learn/codesignal', 'CodeSignal Learn — Camora'],
      ['/capra/learn/programiz', 'Programiz Python — Camora'],
      ['/capra/learn/topic', 'Learn — Camora'],
      ['/capra/onboarding', 'Get Started — Camora'],
      ['/jobs', 'Jobs — Camora'],
      ['/profile', 'Profile — Camora'],
      ['/pricing', 'Pricing — Camora'],
      ['/login', 'Sign In — Camora'],
      ['/signup', 'Sign Up — Camora'],
      ['/handbook', 'Blind 75 — Camora'],
    ];
    const match = fallbacks.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
    document.title = match ? match[1] : 'Camora — Apply, Prepare, Practice & Attend';
  }, [pathname]);
  return null;
}

const CaraKeyListener = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        caraRegistry.open();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return null;
};

const LumoraSessionSync = () => {
  const isRecording = useSessionStore(s => s.isRecording);
  const isStreaming = useSessionStore(s => s.isStreaming);
  useEffect(() => {
    caraRegistry.setLumoraActive(isRecording || isStreaming);
  }, [isRecording, isStreaming]);
  return null;
};

export const App = () => {
  return (
    <ThemeProvider>
    <AuthProvider>
      <DialogProvider>
      <CelebrationProvider>
      <Suspense fallback={<Loading />}>
        <ScrollToTop />
        <PageTracker />
        <ProductAttribute />
        <RouteTitle />
        <CaraKeyListener />
        <LumoraSessionSync />
        <CaraBar />
        <DesktopWindowControls />
        <TooltipLayer />
        <Routes>
          {/* ── Public ─────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* /premium → /pricing — legacy alias, single source of truth */}
          <Route path="/premium" element={<Navigate to="/pricing" replace />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/legal/terms" element={<LegalPage />} />
          <Route path="/legal/privacy" element={<LegalPage />} />
          <Route path="/legal/security" element={<LegalPage />} />

          {/* Mobile app token handoff — bounces through Google OAuth if needed
              and redirects to the camora:// scheme with a fresh access token. */}
          <Route path="/mobile/auth" element={<MobileAuthPage />} />

          {/* ── Team / group sharing (auth required) ─────────── */}
          <Route path="/account/team" element={<ProtectedRoute><TeamSettingsPage /></ProtectedRoute>} />
          <Route path="/teams/join/:token" element={<JoinTeamPage />} />
          <Route path="/docs" element={<DocsIndexPage />} />
          <Route path="/docs/getting-started" element={<GettingStartedPage />} />
          <Route path="/docs/prepare" element={<PrepareDocsPage />} />
          <Route path="/docs/practice" element={<PracticeDocsPage />} />
          <Route path="/docs/lumora-live" element={<LumoraLivePage />} />
          <Route path="/docs/lumora-coding" element={<LumoraCodingDocsPage />} />
          <Route path="/docs/lumora-design" element={<LumoraDesignDocsPage />} />
          <Route path="/docs/account" element={<AccountDocsPage />} />
          <Route path="/docs/teams" element={<TeamsDocsPage />} />
          <Route path="/docs/topups" element={<TopupsDocsPage />} />
          <Route path="/docs/desktop" element={<DesktopDocsPage />} />
          <Route path="/docs/voice-filtering" element={<VoiceFilteringDocsPage />} />
          <Route path="/docs/audio-setup" element={<AudioSetupDocsPage />} />
          {/* Internal staff docs — gate behind owner-email check. Previously
              these were unauth public, exposing Stripe IDs / env names /
              deployment topology / refund procedures to anyone with a URL. */}
          <Route path="/docs/admin" element={<OwnerRoute><AdminOverviewPage /></OwnerRoute>} />
          <Route path="/docs/admin/stripe" element={<OwnerRoute><AdminStripePage /></OwnerRoute>} />
          <Route path="/docs/admin/env-vars" element={<OwnerRoute><AdminEnvVarsPage /></OwnerRoute>} />
          <Route path="/docs/admin/deployment" element={<OwnerRoute><AdminDeploymentPage /></OwnerRoute>} />
          <Route path="/docs/admin/database" element={<OwnerRoute><AdminDatabasePage /></OwnerRoute>} />
          <Route path="/docs/admin/refunds" element={<OwnerRoute><AdminRefundsPage /></OwnerRoute>} />
          <Route path="/docs/admin/incidents" element={<OwnerRoute><AdminIncidentsPage /></OwnerRoute>} />
          <Route path="/docs/admin/lumora-live" element={<OwnerRoute><AdminLumoraLivePage /></OwnerRoute>} />
          <Route path="/docs/admin/lumora-coding" element={<OwnerRoute><AdminLumoraCodingPage /></OwnerRoute>} />
          <Route path="/docs/admin/lumora-design" element={<OwnerRoute><AdminLumoraDesignPage /></OwnerRoute>} />
          <Route path="/docs/playground" element={<PlaygroundDocsPage />} />
          <Route path="/docs/admin/playground" element={<OwnerRoute><AdminPlaygroundPage /></OwnerRoute>} />
          <Route path="/docs/admin/mobile" element={<OwnerRoute><AdminMobilePage /></OwnerRoute>} />
          <Route path="/admin/teams" element={<OwnerRoute><AdminTeamsPage /></OwnerRoute>} />
          <Route path="/admin/playground/observe" element={<OwnerRoute><AdminPlaygroundObservePage /></OwnerRoute>} />
          <Route path="/admin/api-keys" element={<OwnerRoute><AdminApiKeysPage /></OwnerRoute>} />
          <Route path="/flyer" element={<FlyerPage />} />

          {/* ── Jobs: Apply ──────────────────────────────── */}
          <Route path="/jobs" element={<ShellRoute><JobsPage /></ShellRoute>} />
          <Route path="/jobs/:id/prepare" element={<ShellRoute><JobPrepPage /></ShellRoute>} />
          <Route path="/jobs/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
          <Route path="/jobs/profile" element={<ProtectedRoute><JobProfilePage /></ProtectedRoute>} />

          {/* ── Lumora: Live Session (PAID — own layout, no shell) ── */}
          <Route path="/lumora" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/coding" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/coding/proctored" element={<PaidRoute><CodingProctoredPage /></PaidRoute>} />
          <Route path="/lumora/design" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/behavioral" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/practice" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/prepkit" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/calendar" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/sessions" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/assistants" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/profile" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/credits" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/fix" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          {/* Claude embeds claude.ai in an Electron <webview>; the web build can't
              render it, so redirect this route to the dashboard outside desktop. */}
          <Route path="/lumora/claude" element={isElectron() ? <PaidRoute><LumoraShellPage /></PaidRoute> : <Navigate to="/lumora" replace />} />
          <Route path="/lumora/playground" element={<ProtectedRoute><LumoraShellPage /></ProtectedRoute>} />
          <Route path="/lumora/playground/s/:snippetId" element={<ProtectedRoute><LumoraShellPage /></ProtectedRoute>} />
          <Route path="/lumora/ask" element={<ProtectedRoute><LumoraShellPage /></ProtectedRoute>} />

          {/* ── /app/* → /lumora/* — legacy aliases collapsed to redirects ── */}
          <Route path="/app" element={<Navigate to="/lumora" replace />} />
          <Route path="/app/coding" element={<Navigate to="/lumora/coding" replace />} />
          <Route path="/app/design" element={<Navigate to="/lumora/design" replace />} />

          {/* ── Capra: Preparation (FREE to browse, backend limits solves) ── */}
          {/* Bare /capra: empty → /capra/prepare; legacy ?mode=... → mode's
              canonical path (preserves problem/autosolve query params). */}
          <Route path="/capra" element={<CapraRootRedirect />} />
          <Route path="/capra/coding" element={<ShellRoute><CapraDashboard /></ShellRoute>} />
          <Route path="/capra/design" element={<ShellRoute><CapraDashboard /></ShellRoute>} />
          <Route path="/capra/prep" element={<ShellRoute><CapraDashboard /></ShellRoute>} />
          <Route path="/capra/practice" element={<ShellRoute><CapraPractice /></ShellRoute>} />
          {/* Resume builder — JobsPage's per-job "Resume" button hits /capra/resume?company=&role=&url=,
              the sidebar nav uses /capra/prepare/resume. Both render the same page; the page reads
              ?company= / ?role= from query params to tailor the optimizer. Specific routes mounted
              before the /capra/prepare/* wildcard so they win on match. */}
          <Route path="/capra/resume/generator" element={<ShellRoute><ResumeGeneratorPage /></ShellRoute>} />
          <Route path="/capra/resume" element={<ShellRoute><ResumePage /></ShellRoute>} />
          <Route path="/capra/prepare/resume" element={<ShellRoute><ResumePage /></ShellRoute>} />
          <Route path="/capra/prepare/*" element={<ShellRoute><CapraPrepare /></ShellRoute>} />
          <Route path="/capra/plan" element={<ShellRoute><PrepPlanPage /></ShellRoute>} />
          <Route path="/capra/library" element={<ShellRoute><HRLibraryPage /></ShellRoute>} />
          <Route path="/capra/problems/:slug" element={<ShellRoute><ProtectedRoute><ProblemDetailPage /></ProtectedRoute></ShellRoute>} />
          <Route path="/capra/quiz"         element={<ShellRoute><MCQPage /></ShellRoute>} />
          <Route path="/capra/quiz/session" element={<ShellRoute><QuizSessionPage /></ShellRoute>} />
          <Route path="/capra/flashcards"   element={<ShellRoute><FlashcardsPage /></ShellRoute>} />
          <Route path="/capra/k8s" element={<ShellRoute><K8sPathPage /></ShellRoute>} />
          <Route path="/capra/learn/python" element={<ShellRoute><PythonLearnPage /></ShellRoute>} />
          <Route path="/capra/learn/codesignal" element={<ShellRoute><CodeSignalLearnPage /></ShellRoute>} />
          <Route path="/capra/learn/programiz" element={<ShellRoute><ProgramizLearnPage /></ShellRoute>} />
          <Route path="/capra/learn/topic/:slug" element={<ShellRoute><LearnTopicPage /></ShellRoute>} />
          <Route path="/playground" element={<ShellRoute><ProtectedRoute><PlaygroundPage /></ProtectedRoute></ShellRoute>} />
          <Route path="/capra/playground" element={<Navigate to="/playground?tab=vm" replace />} />
          <Route path="/capra/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />
          <Route path="/capra/landing" element={<CapraLanding />} />
          <Route path="/capra/achievements" element={<Navigate to="/profile?tab=achievements" replace />} />

          {/* ── Also accessible via old Capra paths ────── */}
          <Route path="/prepare/*" element={<ShellRoute><CapraPrepare /></ShellRoute>} />
          <Route path="/practice" element={<ShellRoute><CapraPractice /></ShellRoute>} />
          <Route path="/handbook" element={<ShellRoute><Blind75Page /></ShellRoute>} />
          <Route path="/handbook/:id/practice" element={<ShellRoute><Blind75PracticePage /></ShellRoute>} />
          <Route path="/handbook/:id/solution" element={<ShellRoute><Blind75PracticePage /></ShellRoute>} />
          <Route path="/problems/:slug" element={<ShellRoute><ProtectedRoute><ProblemDetailPage /></ProtectedRoute></ShellRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />

          {/* ── Referral ────────────────────────────── */}
          <Route path="/r/:code" element={<ReferralLandingPage />} />


          {/* ── Profile ──────────────────────────────── */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          {/* Job profile now lives as a tab inside /profile — redirect the old route. */}
          {/* Job-search pages now live under the Apply (/jobs) section. */}
          <Route path="/jobsearch/profile" element={<Navigate to="/jobs/profile" replace />} />
          <Route path="/jobsearch/applications" element={<Navigate to="/jobs/applications" replace />} />

          {/* ── Analytics ─────────────────────────────── */}
          <Route path="/admin" element={<ShellRoute><AnalyticsPage section="admin" /></ShellRoute>} />
          <Route path="/analytics" element={<ShellRoute><AnalyticsPage section="analytics" /></ShellRoute>} />

          {/* ── Company Questions ─────────────── */}
          <Route path="/company-questions/:company" element={<CompanyQuestionsPage />} />

          {/* ── Public Score Cards & Profiles ────────────── */}
          <Route path="/share/:token" element={<PublicScoreCardPage />} />
          <Route path="/u/:username" element={<PublicProfilePage />} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      </CelebrationProvider>
      </DialogProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
