import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">C</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Camora</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</Link>
          <Link to="/capra" className="text-sm font-medium text-gray-600 hover:text-gray-900">Prepare</Link>
          <Link to="/lumora" className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-colors">
            Launch Interview AI
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 py-20">
        <h1 className="font-display text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
          Ace Every <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">Technical Interview</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
          Prepare with Capra. Attend with Lumora. One platform for your entire interview journey.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/capra" className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-800 font-bold rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            Start Preparing
          </Link>
          <Link to="/lumora" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-teal-600 shadow-xl shadow-emerald-500/25 transition-all">
            Launch Live Interview AI
          </Link>
        </div>
      </section>

      {/* Two Product Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-6">
        <Link to="/capra" className="group p-8 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 hover:border-indigo-300 hover:shadow-xl transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4">
            <span className="text-white font-extrabold text-lg">C</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Capra</h2>
          <p className="mt-2 text-gray-600">Before your interview — study DSA, system design, behavioral topics. 300+ problems with AI explanations.</p>
          <span className="inline-block mt-4 text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Start Preparing →</span>
        </Link>
        <Link to="/lumora" className="group p-8 rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-300 hover:shadow-xl transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
            <span className="text-white font-extrabold text-lg">L</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Lumora</h2>
          <p className="mt-2 text-gray-600">During your interview — real-time AI answers for system design, coding, and behavioral questions.</p>
          <span className="inline-block mt-4 text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">Launch Interview AI →</span>
        </Link>
      </section>
    </div>
  );
}
