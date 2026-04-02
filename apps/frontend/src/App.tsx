import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';

// ── Shared pages ────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// ── Lumora pages (live interview) ───────────────────────
const LumoraInterviewPage = lazy(() => import('./pages/lumora/InterviewPage'));
const LumoraCodingPage = lazy(() => import('./pages/lumora/CodingPage'));
const LumoraDesignPage = lazy(() => import('./pages/lumora/DesignPage'));

// ── Capra pages (preparation) ───────────────────────────
const CapraDashboard = lazy(() => import('./pages/capra/DashboardPage'));
const CapraPractice = lazy(() => import('./pages/capra/PracticePage'));
const CapraPrepare = lazy(() => import('./pages/capra/PreparePage'));
const CapraOnboarding = lazy(() => import('./pages/capra/OnboardingPage'));
const CapraLanding = lazy(() => import('./pages/capra/CapraLandingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

const PIPELINE_STEPS = [
  {
    num: '01',
    label: 'Apply',
    desc: 'Find engineering roles that match your experience and career goals.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
  },
  {
    num: '02',
    label: 'Prepare',
    desc: 'Study 300+ curated topics across system design, DSA, and behavioral.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    num: '03',
    label: 'Practice',
    desc: 'Solve problems with AI explanations and timed mock interviews.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    num: '04',
    label: 'Attend',
    desc: 'Get real-time AI answers during your live technical interview.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // If already authenticated, go to capra dashboard
  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/capra" replace />;

  // In production, redirect to Google OAuth
  const oauthUrl = import.meta.env.VITE_OAUTH_URL;
  if (oauthUrl) {
    window.location.href = oauthUrl;
    return <Loading />;
  }

  const googleAuthUrl = `${import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009'}/api/auth/google/login`;

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 flex">

      {/* ── Left: Product showcase (60%) ───────────────────── */}
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-between p-10 xl:p-16 border-r border-white/[0.06]">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 bg-emerald-500 flex items-center justify-center"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <span className="text-[10px] font-black text-white tracking-tight">C</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Camora</span>
        </Link>

        {/* Pipeline showcase */}
        <div className="flex-1 flex flex-col justify-center max-w-lg">
          <div className="mb-2">
            <span className="text-[11px] font-mono text-emerald-400/60 uppercase tracking-wider">The Interview Lifecycle</span>
          </div>
          <h2 className="text-2xl xl:text-3xl font-semibold tracking-tight text-white leading-tight">
            One platform, every stage.
          </h2>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            From job search to offer letter — Camora covers the full interview pipeline.
          </p>

          <div className="mt-10 space-y-0">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-start gap-4 relative">
                {/* Vertical connector line */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="absolute left-[15px] top-[36px] w-px h-[calc(100%-12px)] bg-white/[0.06]" />
                )}
                <div className="w-[30px] h-[30px] shrink-0 mt-1 border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-emerald-400/80">
                  {step.icon}
                </div>
                <div className="pb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400/50">{step.num}</span>
                    <span className="text-sm font-semibold text-white">{step.label}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust signal */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {['bg-emerald-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-amber-500'].map((bg, i) => (
              <div key={i} className={`w-6 h-6 ${bg} border-2 border-[#09090b] flex items-center justify-center`}
                   style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <span className="text-[7px] font-bold text-white">{['E', 'S', 'D', 'M'][i]}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gray-500">
            Used by engineers interviewing at top tech companies
          </p>
        </div>
      </div>

      {/* ── Right: Login form (40%) ────────────────────────── */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center px-6 py-10 sm:px-10">

        {/* Mobile-only logo */}
        <div className="lg:hidden mb-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 bg-emerald-500 flex items-center justify-center"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <span className="text-[11px] font-black text-white tracking-tight">C</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-white">Camora</span>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight text-white">Sign in to Camora</h1>
          <p className="mt-2 text-sm text-gray-500">
            Start preparing, practicing, and acing your interviews.
          </p>

          <div className="mt-8 space-y-3">
            {/* Google sign-in (primary) */}
            <a
              href={googleAuthUrl}
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-black bg-white hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </a>

            {/* GitHub sign-in (secondary) */}
            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-300 border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-colors cursor-not-allowed opacity-60"
              disabled
              title="Coming soon"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Sign in with GitHub
            </button>
          </div>

          {/* Email sign-in link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors cursor-not-allowed"
              disabled
              title="Coming soon"
            >
              Sign in with email
            </button>
          </div>

          {/* Divider */}
          <div className="mt-8 h-px bg-white/[0.06]" />

          {/* Terms */}
          <p className="mt-6 text-[11px] text-gray-600 text-center leading-relaxed">
            By signing in, you agree to our{' '}
            <span className="text-gray-500 hover:text-gray-400 cursor-pointer">Terms</span>
            {' '}and{' '}
            <span className="text-gray-500 hover:text-gray-400 cursor-pointer">Privacy Policy</span>
          </p>
        </div>

        {/* Mobile-only trust signal */}
        <div className="lg:hidden mt-12 text-center">
          <p className="text-[12px] text-gray-600">
            Used by engineers interviewing at top tech companies
          </p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, onboardingCompleted } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to="/capra/login" replace />;
  }
  // Only enforce onboarding for Capra routes
  if (location.pathname.startsWith('/capra') && onboardingCompleted === false && location.pathname !== '/capra/onboarding') {
    return <Navigate to="/capra/onboarding" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* ── Public ─────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/capra/login" element={<LoginPage />} />
          <Route path="/premium" element={<PricingPage />} />
          <Route path="/download" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />

          {/* ── Lumora: Live Interview ─────────────────── */}
          <Route path="/lumora" element={<ProtectedRoute><LumoraInterviewPage /></ProtectedRoute>} />
          <Route path="/lumora/coding" element={<ProtectedRoute><LumoraCodingPage /></ProtectedRoute>} />
          <Route path="/lumora/design" element={<ProtectedRoute><LumoraDesignPage /></ProtectedRoute>} />

          {/* ── Also accessible via /app paths ──────────── */}
          <Route path="/app" element={<ProtectedRoute><LumoraInterviewPage /></ProtectedRoute>} />
          <Route path="/app/coding" element={<ProtectedRoute><LumoraCodingPage /></ProtectedRoute>} />
          <Route path="/app/design" element={<ProtectedRoute><LumoraDesignPage /></ProtectedRoute>} />

          {/* ── Capra: Preparation ─────────────────────── */}
          <Route path="/capra" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/coding" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/design" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/prep" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/practice" element={<ProtectedRoute><CapraPractice /></ProtectedRoute>} />
          <Route path="/capra/prepare/*" element={<ProtectedRoute><CapraPrepare /></ProtectedRoute>} />
          <Route path="/capra/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />
          <Route path="/capra/landing" element={<CapraLanding />} />

          {/* ── Also accessible via old Capra paths ────── */}
          <Route path="/prepare/*" element={<ProtectedRoute><CapraPrepare /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><CapraPractice /></ProtectedRoute>} />
          <Route path="/problems/:slug" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
