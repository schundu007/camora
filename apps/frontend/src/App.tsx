import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense, useState, useRef } from 'react';

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
const BrandPage = lazy(() => import('./pages/BrandPage'));

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
  const [role, setRole] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/capra" replace />;

  const oauthUrl = import.meta.env.VITE_OAUTH_URL;
  if (oauthUrl) {
    window.location.href = oauthUrl;
    return <Loading />;
  }

  const googleAuthUrl = `${import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009'}/api/auth/google/login`;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.size <= 10 * 1024 * 1024) setResumeFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) setResumeFile(file);
  };

  const ROLES = [
    'DevOps Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer',
    'Data Engineer', 'ML / AI Engineer', 'Site Reliability Engineer',
    'Platform Engineer', 'Cloud Architect', 'Engineering Manager',
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#f8f9fb' }}>
      {/* ── Aurora gradient background ──────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute" style={{ top: '-20%', left: '-10%', width: '70%', height: '60%', borderRadius: '50%', background: 'rgba(52,211,153,0.25)', filter: 'blur(100px)' }} />
        <div className="absolute" style={{ top: '-10%', right: '0%', width: '60%', height: '50%', borderRadius: '50%', background: 'rgba(6,182,212,0.2)', filter: 'blur(120px)' }} />
        <div className="absolute" style={{ bottom: '-10%', right: '-5%', width: '55%', height: '55%', borderRadius: '50%', background: 'rgba(129,140,248,0.2)', filter: 'blur(110px)' }} />
        <div className="absolute" style={{ bottom: '20%', right: '15%', width: '30%', height: '30%', borderRadius: '50%', background: 'rgba(251,191,36,0.12)', filter: 'blur(80px)' }} />
        <div className="absolute" style={{ top: '40%', left: '10%', width: '25%', height: '25%', borderRadius: '50%', background: 'rgba(129,140,248,0.1)', filter: 'blur(90px)' }} />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }} />
      </div>

      {/* ── Logo (top-left) ────────────────────────────── */}
      <div className="relative z-10 px-6 md:px-10 pt-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
               style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
            <span className="text-[10px] font-black text-white">C</span>
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Camora</span>
        </Link>
      </div>

      {/* ── Centered card ─────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-black/8 border border-gray-200/60 p-8 md:p-10">

          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Sign in to Camora
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Start your APPA journey — Apply, Prepare, Practice, Attend.
          </p>

          {/* Role selection — required before sign-in */}
          <div className="mt-7">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select your target role <span className="text-red-500">*</span> <span className="text-xs text-red-400 font-normal">Required</span>
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none ${role === '' ? 'border-red-300' : 'border-gray-200'}`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
              <option value="">Choose a role...</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Social login buttons — 3 across */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {role ? (
              <a href={googleAuthUrl}
                 className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </a>
            ) : (
              <span className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed">
                <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24">
                  <path fill="#9ca3af" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#9ca3af" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#9ca3af" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#9ca3af" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Select a role first
              </span>
            )}
            <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </button>
          </div>
          {!role && (
            <p className="mt-2 text-xs text-red-400">Please select a target role above to enable sign-in.</p>
          )}

          {/* Divider */}
          <div className="relative mt-7 mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-400">or continue with email</span></div>
          </div>

          {/* Email / Password form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" placeholder="you@company.com"
                     className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">Forgot password?</button>
              </div>
              <input type="password" placeholder="Enter your password"
                     className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
            </div>

            <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Sign in
            </button>
          </div>

          {/* Resume upload */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload your resume <span className="text-gray-400 font-normal">(optional)</span></label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                dragOver ? 'border-emerald-400 bg-emerald-50/50' :
                resumeFile ? 'border-emerald-300 bg-emerald-50/30' :
                'border-gray-200 hover:border-gray-300 bg-gray-50/50'
              }`}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />
              {resumeFile ? (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{resumeFile.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); setResumeFile(null); }} className="text-gray-400 hover:text-red-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-sm text-gray-500">Drop your resume here or <span className="text-emerald-600 font-medium">click to browse</span></span>
                  <span className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT (max 10MB)</span>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              New to Camora?{' '}
              <Link to="/lumora" className="text-emerald-600 hover:text-emerald-700 font-semibold">Start free</Link>
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

          {/* ── Brand ────────────────────────────────── */}
          <Route path="/brand" element={<BrandPage />} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
