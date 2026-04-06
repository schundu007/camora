import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';
import CamoraLogo from './components/shared/CamoraLogo';

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
const CompanyPrepPage = lazy(() => import('./pages/capra/CompanyPrepPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobPrepPage = lazy(() => import('./pages/JobPrepPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const BrandPage = lazy(() => import('./pages/BrandPage'));
const Blind75Page = lazy(() => import('./pages/Blind75Page'));
const Blind75PracticePage = lazy(() => import('./pages/Blind75PracticePage'));

function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
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

  const googleAuthUrl = `${import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com'}/api/auth/google/login`;

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)' }}>
        <div className="max-w-[85%] xl:max-w-7xl mx-auto h-14 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <CamoraLogo size={36} />
            <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Apply', href: '/jobs' },
              { label: 'Prepare', href: '/capra/prepare' },
              { label: 'Practice', href: '/capra/practice' },
              { label: 'Attend', href: '/lumora' },
              { label: 'Pricing', href: '/pricing' },
            ].map((tab) => (
              <Link key={tab.label} to={tab.href} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">{tab.label}</Link>
            ))}
          </div>
          <Link to="/signup" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">Create account</Link>
        </div>
      </nav>

      {/* ── Centered card ─────────────────────────────── */}
      <div className="flex items-center justify-center py-12 px-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#e3e8ee] p-8">

          {/* Header */}
          <h1 className="text-xl font-bold text-black tracking-tight">Sign in to Camora</h1>
          <p className="mt-1 text-sm text-gray-500">Apply. Prepare. Practice. Attend.</p>

          {/* Social login buttons */}
          <div className="mt-6 space-y-3">
            <a href={googleAuthUrl}
               className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub — Coming Soon
            </button>
            <button disabled className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#9ca3af">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn — Coming Soon
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold">Create one</Link>
            </p>
          </div>
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
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
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
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/premium" element={<PricingPage />} />
          <Route path="/download" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />

          {/* ── Jobs: Apply ──────────────────────────────── */}
          <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
          <Route path="/jobs/:id/prepare" element={<ProtectedRoute><JobPrepPage /></ProtectedRoute>} />

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
          <Route path="/handbook" element={<ProtectedRoute><Blind75Page /></ProtectedRoute>} />
          <Route path="/handbook/:id/practice" element={<Blind75PracticePage />} />
          <Route path="/handbook/:id/solution" element={<Blind75PracticePage />} />
          <Route path="/problems/:slug" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />

          {/* ── Brand ────────────────────────────────── */}
          <Route path="/brand" element={<BrandPage />} />

          {/* ── Company Interview Questions ─────────────── */}
          <Route path="/interview-questions/:company" element={<CompanyPrepPage />} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
