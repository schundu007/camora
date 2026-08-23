import { lazy, Suspense } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const PlaygroundLayout = lazy(() =>
  import('../components/lumora/playground/PlaygroundLayout').then(m => ({ default: m.PlaygroundLayout }))
);
const SQLPlayground = lazy(() => import('../components/capra/sql/SQLPlayground'));
const PlaygroundShell = lazy(() => import('../components/capra/playground/PlaygroundShell'));

const TABS = [
  { key: 'vm',   label: 'Containers' },
  { key: 'code', label: 'Coding'     },
  { key: 'sql',  label: 'SQL'        },
];

const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <div style={{
      width: 24, height: 24,
      border: '2px solid var(--accent)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  </div>
);

export default function PlaygroundPage() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab = TABS.some(t => t.key === rawTab) ? rawTab : 'vm';

  const setTab = (key) => setParams({ tab: key }, { replace: false });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Sub-nav ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        height: 40,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Playground
        </span>
        <span className="badge-neutral" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>BETA</span>
        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, marginLeft: 4 }} />
        <div className="tab-group">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`tab-group-item${tab === t.key ? ' tab-group-item-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<Spinner />}>
          {tab === 'code' && <PlaygroundLayout />}
          {tab === 'sql'  && <SQLPlayground />}
          {tab === 'vm'   && <PlaygroundShell />}
        </Suspense>
      </div>
    </div>
  );
}
