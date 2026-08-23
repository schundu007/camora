import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SiteNav from '@/components/shared/SiteNav';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';
const PIE_COLORS = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--accent)', 'var(--danger)', 'var(--accent)'];

interface DayVolume { date: string; count: number }
interface Metrics {
  successRate: number | null;
  bootP50: number | null;
  bootP95: number | null;
  activeCount: number;
  extensionRate: number | null;
  dailyVolume: DayVolume[];
  environmentBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px 20px', minWidth: 140, flex: 1 }}>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{label}</p>
    <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>{value}</p>
    {sub && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>{sub}</p>}
  </div>
);

const ChartPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}>
    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px' }}>{title}</p>
    {children}
  </div>
);

export default function AdminPlaygroundObservePage() {
  const [win, setWin] = useState<'7d' | '30d'>('7d');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/v1/playground/sessions/metrics?window=${win}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d) => {
        if (!d || typeof d !== 'object') throw new Error('Invalid metrics response');
        setMetrics(d as Metrics);
        setLoading(false);
      })
      .catch((e: unknown) => { setError(String(e)); setLoading(false); });
  }, [win]);

  const envPieData = metrics
    ? Object.entries(metrics.environmentBreakdown).map(([name, value]) => ({ name, value }))
    : [];
  const errorBarData = metrics
    ? Object.entries(metrics.errorBreakdown).map(([name, value]) => ({ name, value }))
    : [];
  const latencyData = metrics
    ? [{ name: 'Boot Latency', P50: metrics.bootP50 ?? 0, P95: metrics.bootP95 ?? 0 }]
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: '#fff' }}>
      <SiteNav />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Playground Observability</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>SRE metrics — playground session health</p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 3 }}>
            {(['7d', '30d'] as const).map(w => (
              <button
                key={w}
                onClick={() => setWin(w)}
                style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                  border: 'none', cursor: 'pointer',
                  background: win === w ? 'var(--accent)' : 'transparent',
                  color: win === w ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading metrics…</p>}
        {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>Error: {error}</p>}

        {metrics && !loading && (
          <>
            {/* Row 1 — five stat cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <StatCard label="Success Rate" value={metrics.successRate != null ? `${Math.round(metrics.successRate * 100)}%` : '—'} />
              <StatCard label="Active Sessions" value={metrics.activeCount} sub="live right now" />
              <StatCard label="P50 Boot" value={metrics.bootP50 != null ? `${metrics.bootP50}s` : '—'} />
              <StatCard label="P95 Boot" value={metrics.bootP95 != null ? `${metrics.bootP95}s` : '—'} />
              <StatCard label="Extension Rate" value={metrics.extensionRate != null ? `${Math.round(metrics.extensionRate * 100)}%` : '—'} />
            </div>

            {/* Row 2 — 2×2 chart grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ChartPanel title={`Session Volume (last ${win})`}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.dailyVolume}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="url(#volGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Boot Latency (seconds)">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="P50" fill="var(--success)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="P95" fill="var(--warning)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Environment Mix">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={envPieData}
                      cx="50%" cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                      }
                      labelLine={false}
                    >
                      {envPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Error Breakdown">
                {errorBarData.length === 0
                  ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: 60 }}>No errors in this window</p>
                  : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={errorBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} width={100} />
                        <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                        <Bar dataKey="value" fill="var(--danger)" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </ChartPanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
