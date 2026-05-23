import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import { PYTHON_TOPICS, type Topic } from '../../data/python-curriculum';

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid color-mix(in oklab, var(--cam-primary) 25%, transparent)' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: 'color-mix(in oklab, var(--cam-primary) 12%, #0d1117)', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, transparent)' }}>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 text-white">Python</span>
        <button onClick={copy} className="font-mono text-[10px] px-2 py-0.5 rounded transition-colors"
          style={{ color: copied ? 'var(--cam-gold-leaf)' : 'rgba(255,255,255,0.5)', background: copied ? 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)' : 'transparent' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-4 overflow-x-auto text-[13px] leading-relaxed" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3', margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TopicButton = ({ topic, active, onClick }: { topic: Topic; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2"
    style={{
      background: active ? 'color-mix(in oklab, var(--cam-gold-leaf) 12%, var(--bg-elevated))' : 'transparent',
      border: active ? '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)' : '1px solid transparent',
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
    <span className={`text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}
      style={{ color: active ? 'var(--cam-gold-leaf-dk)' : 'var(--text-secondary)' }}>
      {topic.title}
    </span>
    <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{topic.estimatedMins}m</span>
  </button>
);

const TopicGroup = ({ label, topics, selectedId, onSelect, accent }: {
  label: string; topics: Topic[]; selectedId: string; onSelect: (id: string) => void; accent: string;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2 px-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>{label}</span>
      <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{topics.length}</span>
    </div>
    <div className="space-y-0.5">
      {topics.map(t => <TopicButton key={t.id} topic={t} active={t.id === selectedId} onClick={() => onSelect(t.id)} />)}
    </div>
  </div>
);

const TopicView = ({ topic }: { topic: Topic }) => {
  const [activeExample, setActiveExample] = useState(0);
  useEffect(() => setActiveExample(0), [topic.id]);

  return (
    <article className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>{topic.title}</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: topic.track === 'beginner' ? 'color-mix(in oklab, var(--cam-primary) 15%, var(--bg-elevated))' : 'color-mix(in oklab, var(--cam-gold-leaf) 15%, var(--bg-elevated))', color: topic.track === 'beginner' ? 'var(--cam-primary)' : 'var(--cam-gold-leaf-dk)' }}>{topic.track}</span>
          </div>
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>~{topic.estimatedMins} min</span>
        </div>
        <div className="px-6 py-5">
          <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">{topic.summary}</p>
        </div>
      </div>

      {/* Key Points */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Key Points</span>
        </div>
        <ul className="divide-y divide-[var(--border)]/40">
          {topic.keyPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-3 px-6 py-3">
              <span className="font-mono text-[11px] font-bold mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--cam-primary) 12%, var(--bg-elevated))', color: 'var(--cam-primary)' }}>{i + 1}</span>
              <span className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{pt}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Code Examples */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Examples</span>
          <div className="flex gap-1">
            {topic.examples.map((ex, i) => (
              <button key={i} onClick={() => setActiveExample(i)}
                className="font-mono text-[11px] px-3 py-1 rounded-lg transition-colors"
                style={{
                  background: i === activeExample ? 'var(--cam-primary)' : 'var(--bg-elevated)',
                  color: i === activeExample ? 'white' : 'var(--text-muted)',
                }}>
                {ex.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          <CodeBlock code={topic.examples[activeExample]?.code || ''} />
        </div>
      </div>

      {/* Gotcha + Tip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid color-mix(in oklab, #ef4444 20%, var(--border))' }}>
          <div className="px-5 py-3" style={{ background: 'color-mix(in oklab, #ef4444 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, #ef4444 15%, var(--border))' }}>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: '#dc2626' }}>Common Gotcha</span>
          </div>
          <p className="px-5 py-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">{topic.gotcha}</p>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 25%, var(--border))' }}>
          <div className="px-5 py-3" style={{ background: 'color-mix(in oklab, var(--cam-gold-leaf) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 20%, var(--border))' }}>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-gold-leaf-dk)' }}>Pro Tip</span>
          </div>
          <p className="px-5 py-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">{topic.tip}</p>
        </div>
      </div>

      {/* Real-world */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid color-mix(in oklab, var(--cam-primary) 15%, var(--border))' }}>
        <div className="px-6 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 15%, var(--border))' }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Real-World Usage</span>
        </div>
        <div className="px-6 py-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold mt-0.5" style={{ background: 'color-mix(in oklab, var(--cam-primary) 15%, var(--bg-elevated))', color: 'var(--cam-primary)' }}>🌐</div>
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{topic.realWorldNote}</p>
        </div>
      </div>
    </article>
  );
};

export default function PythonLearnPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const selectedId = params.get('topic') || PYTHON_TOPICS[0].id;

  const setTopic = (id: string) => setParams({ topic: id });

  useEffect(() => { window.scrollTo(0, 0); }, [selectedId]);
  useEffect(() => {
    document.title = 'Python — Learning Library — Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  const selected = useMemo(() => PYTHON_TOPICS.find(t => t.id === selectedId) || PYTHON_TOPICS[0], [selectedId]);
  const beginnerTopics = useMemo(() => PYTHON_TOPICS.filter(t => t.track === 'beginner'), []);
  const advancedTopics = useMemo(() => PYTHON_TOPICS.filter(t => t.track === 'advanced'), []);
  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return PYTHON_TOPICS.filter(t => t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q));
  }, [search]);

  const totalMins = PYTHON_TOPICS.reduce((s, t) => s + t.estimatedMins, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      <SiteNav variant="light" />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.07), transparent 70%)' }} />
        <div className="relative page-wrap pt-20 pb-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: 'color-mix(in oklab, var(--cam-gold-leaf) 15%, rgba(255,255,255,0.08))', border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)' }}>🐍</div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-gold-leaf)' }}>Learning Library</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Python <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Mastery</span></h1>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>From variables to async — {PYTHON_TOPICS.length} topics, ~{Math.round(totalMins / 60)}h of material</p>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: `${beginnerTopics.length} Beginner Topics`, color: 'var(--cam-primary)' },
              { label: `${advancedTopics.length} Advanced Topics`, color: 'var(--cam-gold-leaf)' },
              { label: 'Real-world Examples', color: 'rgba(255,255,255,0.7)' },
              { label: 'Google · Netflix · NVIDIA', color: 'rgba(255,255,255,0.5)' },
            ].map(b => (
              <span key={b.label} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: b.color, border: '1px solid rgba(255,255,255,0.12)' }}>{b.label}</span>
            ))}
          </div>
        </div>
        <svg aria-hidden preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute left-0 bottom-0 w-full pointer-events-none" style={{ height: '5vh' }}>
          <polygon fill="var(--bg-app)" points="0,0 100,100 0,100" />
        </svg>
      </section>

      <div className="page-wrap pt-8 pb-20 flex-1 w-full">
        <div className="flex gap-8 items-start">

          {/* Sidebar */}
          <aside className="w-64 shrink-0 sticky top-6">
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cam-primary)]" />
            </div>

            {filtered ? (
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-widest px-2 mb-2" style={{ color: 'var(--text-muted)' }}>{filtered.length} results</p>
                {filtered.map(t => <TopicButton key={t.id} topic={t} active={t.id === selectedId} onClick={() => { setTopic(t.id); setSearch(''); }} />)}
                {filtered.length === 0 && <p className="text-xs text-[var(--text-muted)] px-2">No topics match</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <TopicGroup label="Beginner" topics={beginnerTopics} selectedId={selectedId} onSelect={setTopic} accent="var(--cam-primary)" />
                <TopicGroup label="Advanced" topics={advancedTopics} selectedId={selectedId} onSelect={setTopic} accent="var(--cam-gold-leaf)" />
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <TopicView topic={selected} />
          </main>
        </div>
      </div>

      <SiteFooter variant="light" />
    </div>
  );
}
