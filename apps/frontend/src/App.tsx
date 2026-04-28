import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense, useEffect } from 'react';
import SiteNav from './components/shared/SiteNav';
import RootShell from './components/layout/RootShell';
import { PaywallGate } from './components/shared/ui/PaywallGate';
import { usePageTracker } from './hooks/usePageTracker';
import { DialogProvider } from './components/shared/Dialog';
import { CelebrationProvider } from './components/shared/Celebration';

// ── Shared pages ────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// ── Lumora pages (live interview) ───────────────────────
const LumoraShellPage = lazy(() => import('./pages/lumora/LumoraShellPage'));

// ── Capra pages (preparation) ───────────────────────────
const CapraDashboard = lazy(() => import('./pages/capra/DashboardPage'));
const ResumePage = lazy(() => import('./pages/capra/ResumePage'));
const CapraPractice = lazy(() => import('./pages/capra/PracticePage'));
const CapraPrepare = lazy(() => import('./pages/capra/PreparePage'));
const CapraOnboarding = lazy(() => import('./pages/capra/OnboardingPage'));
const CapraLanding = lazy(() => import('./pages/capra/CapraLandingPage'));
const CompanyPrepPage = lazy(() => import('./pages/capra/CompanyPrepPage'));
const AchievementsPage = lazy(() => import('./pages/capra/AchievementsPage'));
const PrepPlanPage = lazy(() => import('./pages/capra/PrepPlanPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobPrepPage = lazy(() => import('./pages/JobPrepPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ReferralLandingPage = lazy(() => import('./pages/ReferralLandingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PublicScoreCardPage = lazy(() => import('./pages/PublicScoreCardPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const BrandPage = lazy(() => import('./pages/BrandPage'));
const ChallengePage = lazy(() => import('./pages/ChallengePage'));
const Blind75Page = lazy(() => import('./pages/Blind75Page'));
const Blind75PracticePage = lazy(() => import('./pages/Blind75PracticePage'));
const InterviewQuestionsPage = lazy(() => import('./pages/InterviewQuestionsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const DownloadPage = lazy(() => import('./pages/DownloadPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
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
const FlyerPage = lazy(() => import('./pages/FlyerPage'));

function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-app)' }}
    >
      <div className="w-12 h-12 border-4 border-[var(--bg-elevated)] border-t-[var(--accent)] rounded-full animate-spin" />
    </div>
  );
}

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  const oauthUrl = import.meta.env.VITE_OAUTH_URL;
  if (oauthUrl) {
    window.location.href = oauthUrl;
    return <Loading />;
  }

  const googleAuthUrl = `${import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com'}/api/auth/google/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, var(--cam-primary-dk) 0%, var(--cam-primary) 60%, var(--cam-primary-dk) 100%)' }}>
      {/* Soft top glow — LeetCode hero band */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
      <SiteNav />

      {/* ── Centered card ─────────────────────────────── */}
      <div className="relative flex items-center justify-center py-12 px-4" style={{ minHeight: 'calc(100vh - 82px)' }}>
        <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', borderTop: '3px solid var(--cam-gold-leaf)' }}>

          {/* Header */}
          <h1 className="text-center text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Welcome back</h1>
          <p className="text-center text-sm text-[var(--text-secondary)] mt-1">Sign in to continue to Camora</p>

          {/* Social login buttons */}
          <div className="mt-6 space-y-3">
            <a href={googleAuthUrl}
               className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium cursor-not-allowed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub — Coming Soon
            </button>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium cursor-not-allowed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn — Coming Soon
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/signup" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold">Create one</Link>
            </p>
          </div>
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
function CapraRootRedirect() {
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  // Only enforce onboarding for Capra routes that need a role. Read-only
  // surfaces (/capra/prepare/*) are free to browse without onboarding —
  // per the freemium model, Capra content is open and only the role-aware
  // solver/practice flows require setup. Pass the original target
  // through ?redirect= so OnboardingPage can return the user to where
  // they were headed instead of dead-ending on /capra/prepare.
  const isOnboardingExempt =
    location.pathname.startsWith('/capra/prepare') ||
    location.pathname === '/capra/onboarding';
  if (location.pathname.startsWith('/capra') && onboardingCompleted === false && !isOnboardingExempt) {
    const target = location.pathname + location.search;
    return <Navigate to={`/capra/onboarding?redirect=${encodeURIComponent(target)}`} replace />;
  }
  return <>{children}</>;
}

function ShellRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RootShell>{children}</RootShell>
    </ProtectedRoute>
  );
}

function PaidRoute({ children, feature = 'Lumora Live Interview' }: { children: React.ReactNode; feature?: string }) {
  return (
    <ProtectedRoute>
      <PaywallGate feature={feature}>{children}</PaywallGate>
    </ProtectedRoute>
  );
}

function PaidShellRoute({ children, feature = 'this feature' }: { children: React.ReactNode; feature?: string }) {
  return (
    <ProtectedRoute>
      <RootShell>
        <PaywallGate feature={feature}>{children}</PaywallGate>
      </RootShell>
    </ProtectedRoute>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PageTracker() {
  usePageTracker();
  return null;
}

/**
 * Set a sane default document.title on every route change so the tab
 * never carries a stale title from the previous page. Individual pages
 * may still override with a more specific title in their own useEffect
 * — this only sets a fallback if they don't.
 */
function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const fallbacks: Array<[string, string]> = [
      ['/lumora', 'Lumora — Camora'],
      ['/capra/prepare', 'Prepare — Camora'],
      ['/capra/practice', 'Practice — Camora'],
      ['/capra/plan', 'Study Plan — Camora'],
      ['/capra/onboarding', 'Get Started — Camora'],
      ['/jobs', 'Jobs — Camora'],
      ['/profile', 'Profile — Camora'],
      ['/pricing', 'Pricing — Camora'],
      ['/login', 'Sign In — Camora'],
      ['/signup', 'Sign Up — Camora'],
      ['/challenge', 'The Camora Challenge'],
      ['/handbook', 'Blind 75 — Camora'],
    ];
    const match = fallbacks.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
    document.title = match ? match[1] : 'Camora — Apply, Prepare, Practice & Attend';
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <AuthProvider>
      <DialogProvider>
      <CelebrationProvider>
      <Suspense fallback={<Loading />}>
        <ScrollToTop />
        <PageTracker />
        <RouteTitle />
        <Routes>
          {/* ── Public ─────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/premium" element={<PricingPage />} />
          <Route path="/download" element={<DownloadPage />} />

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
          <Route path="/docs/admin" element={<AdminOverviewPage />} />
          <Route path="/docs/admin/stripe" element={<AdminStripePage />} />
          <Route path="/docs/admin/env-vars" element={<AdminEnvVarsPage />} />
          <Route path="/docs/admin/deployment" element={<AdminDeploymentPage />} />
          <Route path="/docs/admin/database" element={<AdminDatabasePage />} />
          <Route path="/docs/admin/refunds" element={<AdminRefundsPage />} />
          <Route path="/docs/admin/incidents" element={<AdminIncidentsPage />} />
          <Route path="/docs/admin/lumora-live" element={<AdminLumoraLivePage />} />
          <Route path="/docs/admin/lumora-coding" element={<AdminLumoraCodingPage />} />
          <Route path="/docs/admin/lumora-design" element={<AdminLumoraDesignPage />} />
          <Route path="/admin/teams" element={<ProtectedRoute><AdminTeamsPage /></ProtectedRoute>} />
          <Route path="/flyer" element={<FlyerPage />} />

          {/* ── Jobs: Apply ──────────────────────────────── */}
          <Route path="/jobs" element={<ShellRoute><JobsPage /></ShellRoute>} />
          <Route path="/jobs/:id/prepare" element={<ShellRoute><JobPrepPage /></ShellRoute>} />

          {/* ── Lumora: Live Interview (PAID — own layout, no shell) ── */}
          <Route path="/lumora" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/coding" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/design" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/behavioral" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/prepkit" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/calendar" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/sessions" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/assistants" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/profile" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/credits" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/lumora/pricing" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />

          {/* ── Also accessible via /app paths (PAID) ──────────── */}
          <Route path="/app" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/app/coding" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />
          <Route path="/app/design" element={<PaidRoute><LumoraShellPage /></PaidRoute>} />

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
          <Route path="/capra/resume" element={<ShellRoute><ResumePage /></ShellRoute>} />
          <Route path="/capra/prepare/resume" element={<ShellRoute><ResumePage /></ShellRoute>} />
          <Route path="/capra/prepare/*" element={<ShellRoute><CapraPrepare /></ShellRoute>} />
          <Route path="/capra/plan" element={<ShellRoute><PrepPlanPage /></ShellRoute>} />
          <Route path="/capra/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />
          <Route path="/capra/landing" element={<CapraLanding />} />
          <Route path="/capra/achievements" element={<Navigate to="/profile?tab=achievements" replace />} />

          {/* ── Also accessible via old Capra paths ────── */}
          <Route path="/prepare/*" element={<ShellRoute><CapraPrepare /></ShellRoute>} />
          <Route path="/practice" element={<ShellRoute><CapraPractice /></ShellRoute>} />
          <Route path="/handbook" element={<ShellRoute><Blind75Page /></ShellRoute>} />
          <Route path="/handbook/:id/practice" element={<ShellRoute><Blind75PracticePage /></ShellRoute>} />
          <Route path="/handbook/:id/solution" element={<ShellRoute><Blind75PracticePage /></ShellRoute>} />
          <Route path="/problems/:slug" element={<ShellRoute><CapraDashboard /></ShellRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />

          {/* ── Referral ────────────────────────────── */}
          <Route path="/r/:code" element={<ReferralLandingPage />} />

          {/* ── Brand ────────────────────────────────── */}
          <Route path="/brand" element={<BrandPage />} />

          {/* ── Challenge ─────────────────────────────── */}
          <Route path="/challenge" element={<ChallengePage />} />

          {/* ── Profile ──────────────────────────────── */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* ── Analytics ─────────────────────────────── */}
          <Route path="/analytics" element={<ShellRoute><AnalyticsPage /></ShellRoute>} />

          {/* ── Company Interview Questions ─────────────── */}
          <Route path="/interview-questions/:company" element={<InterviewQuestionsPage />} />

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
  );
}
