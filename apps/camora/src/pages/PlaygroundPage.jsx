import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

const PlaygroundLayout = lazy(() =>
  import('../components/lumora/playground/PlaygroundLayout').then(m => ({ default: m.PlaygroundLayout }))
);
const SQLPlayground = lazy(() => import('../components/capra/sql/SQLPlayground'));
const PlaygroundShell = lazy(() => import('../components/capra/playground/PlaygroundShell'));

const TABS = [
  { key: 'code', label: 'Code' },
  { key: 'sql',  label: 'SQL'  },
  { key: 'vm',   label: 'VM'   },
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
  const tab = TABS.some(t => t.key === rawTab) ? rawTab : 'code';

  const setTab = (key) => setParams({ tab: key }, { replace: false });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12, fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⌨</span>
          Playground
        </span>

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

        <span style={{ width: 100 }} />
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
