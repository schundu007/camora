import { Routes, Route, Navigate } from 'react-router-dom';
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

function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    // Redirect to Capra login (or Google OAuth)
    window.location.href = import.meta.env.VITE_OAUTH_URL || '/capra/login';
    return <Loading />;
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

          {/* ── Lumora: Live Interview ─────────────────── */}
          <Route path="/lumora" element={<ProtectedRoute><LumoraInterviewPage /></ProtectedRoute>} />
          <Route path="/lumora/coding" element={<ProtectedRoute><LumoraCodingPage /></ProtectedRoute>} />
          <Route path="/lumora/design" element={<ProtectedRoute><LumoraDesignPage /></ProtectedRoute>} />

          {/* ── Capra: Preparation ─────────────────────── */}
          <Route path="/capra" element={<ProtectedRoute><CapraDashboard /></ProtectedRoute>} />
          <Route path="/capra/practice" element={<ProtectedRoute><CapraPractice /></ProtectedRoute>} />
          <Route path="/capra/prepare/*" element={<ProtectedRoute><CapraPrepare /></ProtectedRoute>} />
          <Route path="/capra/onboarding" element={<ProtectedRoute><CapraOnboarding /></ProtectedRoute>} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
