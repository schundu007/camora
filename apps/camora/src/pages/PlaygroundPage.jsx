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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
      }}>
        <Link to="/capra/prepare" style={{
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3,
          flexShrink: 0,
        }}>
          ‹ Home
        </Link>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div className="tab-group" style={{ flex: 1 }}>
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
