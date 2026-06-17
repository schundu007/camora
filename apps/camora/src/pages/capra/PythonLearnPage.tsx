import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import { PYTHON_TOPICS, type Topic } from '../../data/python-curriculum';
import Chip from '@/components/shared/ui/Chip';

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
      {/* Header + intro */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>{topic.title}</span>
            <Chip>{topic.track}</Chip>
          </div>
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>~{topic.estimatedMins} min</span>
        </div>
        <div className="px-6 py-5">
          <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">{topic.intro}</p>
        </div>
      </div>

      {/* Reference Code */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>Reference Code</span>
        </div>
        <div className="p-4">
          <CodeBlock code={topic.cleanCode} />
        </div>
      </div>

      {/* How It Works — line-by-line walkthrough */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-3" style={{ background: 'color-mix(in oklab, var(--cam-primary) 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, var(--cam-primary) 20%, var(--border))' }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-primary)' }}>How It Works — Line by Line</span>
        </div>
        <div className="divide-y divide-[var(--border)]/40">
          {topic.walkthrough.map((step, i) => (
            <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="px-4 py-3" style={{ background: '#0d1117', borderRight: '1px solid color-mix(in oklab, var(--cam-primary) 15%, transparent)' }}>
                <pre className="text-[12px] leading-relaxed overflow-x-auto" style={{ fontFamily: 'var(--font-mono)', color: '#e6edf3', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><code>{step.code}</code></pre>
              </div>
              <div className="px-5 py-3 flex items-start gap-2.5">
                <span className="font-mono text-[10px] font-bold mt-1 shrink-0 w-4 h-4 rounded flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--cam-primary) 12%, var(--bg-elevated))', color: 'var(--cam-primary)' }}>{i + 1}</span>
                <span className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{step.explain}</span>
              </div>
            </div>
          ))}
        </div>
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
                  background: i === activeExample ? 'var(--cam-accent-fill)' : 'var(--bg-elevated)',
                  color: i === activeExample ? 'var(--cam-accent-fill-text)' : 'var(--text-muted)',
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

      {/* Edge Cases */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid color-mix(in oklab, #f59e0b 20%, var(--border))' }}>
        <div className="px-6 py-3" style={{ background: 'color-mix(in oklab, #f59e0b 8%, var(--bg-surface))', borderBottom: '1px solid color-mix(in oklab, #f59e0b 15%, var(--border))' }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: '#d97706' }}>Edge Cases to Know</span>
        </div>
        <ul className="divide-y divide-[var(--border)]/40">
          {topic.edgeCases.map((ec, i) => (
            <li key={i} className="flex items-start gap-3 px-6 py-3">
              <span className="shrink-0 mt-1 text-[11px]" style={{ color: '#d97706' }}>▸</span>
              <span className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{ec}</span>
            </li>
          ))}
        </ul>
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
    </article>
  );
};

export default function PythonLearnPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
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
    return PYTHON_TOPICS.filter(t => t.title.toLowerCase().includes(q) || t.intro.toLowerCase().includes(q));
  }, [search]);

  const totalMins = PYTHON_TOPICS.reduce((s, t) => s + t.estimatedMins, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      <SiteNav variant="light" />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.07), transparent 70%)' }} />
        <div className="relative page-wrap pt-14 pb-14">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 mb-6 text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--cam-strip-text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--cam-gold-leaf) 15%, rgba(255,255,255,0.08))', border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 40%, transparent)' }}>
              <svg viewBox="0 0 110 110" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="pyHeroBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5A9FD4"/><stop offset="100%" stopColor="#306998"/></linearGradient>
                  <linearGradient id="pyHeroYellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFE052"/><stop offset="100%" stopColor="#FFC331"/></linearGradient>
                </defs>
                <path fill="url(#pyHeroBlue)" d="M54.9 5C33.3 5 34.7 14.1 34.7 14.1l0 9.4h20.6v2.8H22.2S5 24.1 5 45.9c0 21.8 12.1 21 12.1 21h7.2v-10.1s-.4-12.1 11.9-12.1h20.5s11.5.2 11.5-11.1V16.3S70 5 54.9 5zm-11.4 6.6c2.1 0 3.7 1.7 3.7 3.7 0 2.1-1.7 3.7-3.7 3.7-2.1 0-3.7-1.7-3.7-3.7 0-2.1 1.7-3.7 3.7-3.7z"/>
                <path fill="url(#pyHeroYellow)" d="M55.5 105c21.6 0 20.2-9.1 20.2-9.1l0-9.4H55.1v-2.8h33.1S105 86 105 64.1C105 42.3 92.9 43.1 92.9 43.1h-7.2v10.1s.4 12.1-11.9 12.1H53.3S41.8 65.1 41.8 76.4v27.3S40.4 105 55.5 105zm11.4-6.6c-2.1 0-3.7-1.7-3.7-3.7 0-2.1 1.7-3.7 3.7-3.7 2.1 0 3.7 1.7 3.7 3.7 0 2.1-1.7 3.7-3.7 3.7z"/>
              </svg>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-gold-leaf)' }}>Learning Library</span>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--cam-strip-heading)' }}>Python <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Mastery</span></h1>
          <p className="text-sm mb-5" style={{ color: 'var(--cam-strip-text)' }}>From variables to async — {PYTHON_TOPICS.length} topics, ~{Math.round(totalMins / 60)}h of material</p>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: `${beginnerTopics.length} Beginner Topics`, variant: 'success' as const },
              { label: `${advancedTopics.length} Advanced Topics`, variant: 'gold' as const },
              { label: 'Real-world Examples', variant: 'default' as const },
              { label: 'Google · Netflix · NVIDIA', variant: 'default' as const },
            ].map(b => (
              <Chip key={b.label} variant={b.variant}>{b.label}</Chip>
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
