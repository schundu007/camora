import { Link } from 'react-router-dom';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-extrabold text-sm">C</span>
          </div>
          <span className="font-display font-bold text-lg">Camora</span>
        </Link>
        <Link to="/lumora" className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600">Launch App</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-display font-bold text-gray-900">Pricing</h1>
        <p className="mt-4 text-gray-500">Plans coming soon — migrating from existing pricing.</p>
      </div>
    </div>
  );
}
