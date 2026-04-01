import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const CodingPage = lazy(() => import('./pages/CodingPage'));
const DesignPage = lazy(() => import('./pages/DesignPage'));

function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const ASCEND_URL = import.meta.env.VITE_ASCEND_URL || 'https://capra.cariara.com';

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    window.location.href = ASCEND_URL;
    return <Loading />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/app" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
          <Route path="/app/coding" element={<ProtectedRoute><CodingPage /></ProtectedRoute>} />
          <Route path="/app/design" element={<ProtectedRoute><DesignPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
