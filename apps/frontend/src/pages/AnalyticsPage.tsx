import { useState, useEffect } from 'react';
import SiteNav from '../components/shared/SiteNav';

const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const EXCLUDE = 'chundubabu@gmail.com,babuchundu@gmail.com';

interface PathRow { path: string; views: string; unique_visitors: string }
interface DayRow { date: string; views: string; unique_visitors: string }
interface Stats {
  total_views: number;
  unique_visitors: number;
  by_path: PathRow[];
  by_day: DayRow[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ exclude_emails: EXCLUDE });
    if (days) params.set('days', days);
    fetch(`${API}/api/visitors/pageview-stats?${params}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <SiteNav />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Site Analytics</h1>
        <p className="text-gray-400 mb-8">Unique visitors (excluding owner accounts)</p>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {['', '7', '30', '90'].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                days === d
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {d === '' ? 'All time' : `Last ${d} days`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm">Total Page Views</p>
                <p className="text-4xl font-bold mt-1">{stats.total_views.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm">Unique Visitors</p>
                <p className="text-4xl font-bold mt-1 text-emerald-400">{stats.unique_visitors.toLocaleString()}</p>
              </div>
            </div>

            {/* By path */}
            <h2 className="text-xl font-semibold mb-4">By Page</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-10">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="px-5 py-3">Path</th>
                    <th className="px-5 py-3 text-right">Views</th>
                    <th className="px-5 py-3 text-right">Unique Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_path.map(row => (
                    <tr key={row.path} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-5 py-3 font-mono text-sm text-emerald-300">{row.path}</td>
                      <td className="px-5 py-3 text-right">{parseInt(row.views).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-semibold">{parseInt(row.unique_visitors).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By day */}
            <h2 className="text-xl font-semibold mb-4">By Day</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Views</th>
                    <th className="px-5 py-3 text-right">Unique Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_day.map(row => (
                    <tr key={row.date} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-5 py-3 text-sm">{new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td className="px-5 py-3 text-right">{parseInt(row.views).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-semibold">{parseInt(row.unique_visitors).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-400">Failed to load analytics.</p>
        )}
      </div>
    </div>
  );
}
