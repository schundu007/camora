import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

  // Fallback: show simple login prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to Camora</h1>
        <p className="text-gray-500 mb-6">Please sign in with Google to continue</p>
        <a href={`${import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009'}/api/auth/google/login`}
           className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors">
          Sign in with Google
        </a>
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
          <Route path="/capra/login" element={<LoginPage />} />

          {/* ── Lumora: Live Interview ─────────────────── */}
          <Route path="/lumora" element={<ProtectedRoute><LumoraInterviewPage /></ProtectedRoute>} />
          <Route path="/lumora/coding" element={<ProtectedRoute><LumoraCodingPage /></ProtectedRoute>} />
          <Route path="/lumora/design" element={<ProtectedRoute><LumoraDesignPage /></ProtectedRoute>} />

          {/* ── Capra: Preparation ─────────────────────── */}
          <Route path="/capra" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/coding" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/design" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/prep" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/practice" element={<ProtectedRoute><CapraPractice /></ProtectedRoute>} />
          <Route path="/capra/prepare/*" element={<ProtectedRoute><CapraPrepare /></ProtectedRoute>} />
          <Route path="/capra/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />
          <Route path="/capra/landing" element={<CapraLanding />} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
