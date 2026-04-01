export default function NotFoundPage() {
  return (
    <div className="min-h-screen landing-root flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 50%, #f8fafc 100%)' }}>
      {/* Background blur accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-3xl -top-[150px] -right-[100px] bg-emerald-400" />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl -bottom-[100px] -left-[100px] bg-emerald-300" />
      </div>

      {/* Subtle dot pattern background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative z-10 text-center max-w-md">
        {/* Logo */}
        <a href="/" className="inline-flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div className="text-left">
            <span className="landing-display font-bold text-xl tracking-tight text-gray-900">Camora</span>
            <span className="block text-[10px] landing-mono uppercase tracking-[0.2em] text-emerald-600 -mt-0.5">Interview Suite</span>
          </div>
        </a>

        {/* 404 */}
        <div className="landing-mono text-7xl font-extrabold text-emerald-200 mb-4">404</div>
        <h1 className="landing-display text-2xl font-bold text-gray-900 mb-3">Page not found</h1>
        <p className="landing-body text-gray-500 text-sm leading-relaxed mb-8">
          The page you are looking for does not exist or has been moved. Head back home to continue.
        </p>

        {/* CTA */}
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-lg transition-colors landing-body"
        >
          Go Home
        </a>
      </div>

      <style>{`
        .landing-root { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-body { font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>
    </div>
  );
}
