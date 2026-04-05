import { useState, useEffect, useRef } from 'react';
import FormattedContent from './FormattedContent.jsx';
import DiagramSVG from '../features/DiagramSVG.jsx';

/* ── Sticky Table of Contents (right sidebar) ─────────── */
function ArticleTOC({ sections, activeId }) {
  return (
    <nav className="space-y-1">
      <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>On This Page</h4>
      {sections.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          className={`block text-sm py-1 pl-3 border-l-2 transition-colors ${
            activeId === s.id
              ? 'border-emerald-500 font-semibold'
              : 'border-transparent hover:border-emerald-300'
          }`}
          style={{ color: activeId === s.id ? 'var(--primary-light)' : 'var(--text-dim)' }}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

/* ── Section wrapper with left accent border heading ───── */
function Section({ id, title, icon, children }) {
  return (
    <section id={id} className="scroll-mt-24 mb-14">
      <h2
        className="text-2xl font-bold tracking-tight mb-6 pb-3 border-l-4 border-emerald-500 pl-4"
        style={{ color: 'var(--text)' }}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ── Callout box ───────────────────────────────────────── */
function Callout({ children, accent = 'emerald' }) {
  const colors = {
    emerald: 'border-emerald-500',
    amber: 'border-amber-500',
    red: 'border-red-500',
    blue: 'border-blue-500',
    violet: 'border-violet-500',
  };
  return (
    <div
      className={`border-l-4 ${colors[accent]} rounded-r-lg py-4 pl-5 pr-4 mb-4`}
      style={{ background: 'var(--surface)' }}
    >
      {children}
    </div>
  );
}

/* ── Code block with language label ────────────────────── */
function CodeBlock({ code, language = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg overflow-hidden mb-4" style={{ background: '#0d1117' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400">{language}</span>
        <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-white transition-colors">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm leading-6 overflow-x-auto" style={{ color: '#c9d1d9' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ── Main Article Renderer ─────────────────────────────── */
export default function ArticleRenderer({ topicDetails, selectedTopic }) {
  const [activeSection, setActiveSection] = useState('');
  const [codeTab, setCodeTab] = useState('python');
  const observerRef = useRef(null);

  // Build TOC sections dynamically
  const sections = [];
  if (topicDetails.introduction) sections.push({ id: 'introduction', label: 'Introduction' });
  if (topicDetails.functionalRequirements || topicDetails.nonFunctionalRequirements) sections.push({ id: 'requirements', label: 'Requirements' });
  if (topicDetails.estimation) sections.push({ id: 'estimation', label: 'Capacity Estimation' });
  if (topicDetails.dataModel) sections.push({ id: 'data-model', label: 'Data Model' });
  if (topicDetails.apiDesign?.endpoints) sections.push({ id: 'api-design', label: 'API Design' });
  if (topicDetails.keyQuestions) sections.push({ id: 'key-questions', label: 'Key Questions' });
  if (topicDetails.algorithmApproaches) sections.push({ id: 'algorithms', label: 'Algorithm Approaches' });
  if (topicDetails.basicImplementation || topicDetails.advancedImplementation) sections.push({ id: 'implementation', label: 'Implementation' });
  if (topicDetails.createFlow || topicDetails.redirectFlow) sections.push({ id: 'system-flows', label: 'System Flows' });
  if (topicDetails.architectureLayers) sections.push({ id: 'architecture', label: 'Architecture Layers' });
  if (topicDetails.deepDiveTopics) sections.push({ id: 'deep-dive', label: 'Deep Dive' });
  if (topicDetails.tradeoffDecisions) sections.push({ id: 'tradeoffs', label: 'Trade-off Decisions' });
  if (topicDetails.interviewFollowups) sections.push({ id: 'followups', label: 'Interview Follow-ups' });
  if (topicDetails.codeExamples) sections.push({ id: 'code', label: 'Code Examples' });

  // IntersectionObserver for scroll-spy
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const ids = sections.map(s => s.id);
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [selectedTopic]);

  const bodyStyle = { color: 'var(--text-subtle)', fontSize: '1.05rem', lineHeight: '1.8' };
  const codeLangs = topicDetails.codeExamples ? Object.keys(topicDetails.codeExamples).filter(k => topicDetails.codeExamples[k]) : [];

  return (
    <div className="flex gap-10 max-w-7xl mx-auto">
      {/* ── Main Article ── */}
      <article className="flex-1 min-w-0 max-w-4xl">

        {/* ── Introduction ── */}
        {topicDetails.introduction && (
          <Section id="introduction" title="Introduction">
            <div style={bodyStyle}>
              <FormattedContent content={topicDetails.introduction} color="emerald" />
            </div>
          </Section>
        )}

        {/* ── Requirements ── */}
        {(topicDetails.functionalRequirements || topicDetails.nonFunctionalRequirements) && (
          <Section id="requirements" title="Requirements and Goals">
            {topicDetails.functionalRequirements && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text)' }}>Functional Requirements</h3>
                <ol className="space-y-2 pl-1">
                  {topicDetails.functionalRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3" style={bodyStyle}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{i + 1}</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {topicDetails.nonFunctionalRequirements && (
              <div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text)' }}>Non-Functional Requirements</h3>
                <ul className="space-y-2 pl-1">
                  {topicDetails.nonFunctionalRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3" style={bodyStyle}>
                      <span className="text-emerald-500 mt-1.5 flex-shrink-0">&#9679;</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* ── Capacity Estimation ── */}
        {topicDetails.estimation && (
          <Section id="estimation" title="Capacity Estimation">
            {topicDetails.estimation.assumptions && (
              <Callout accent="blue">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Assumptions</p>
                <p style={{ ...bodyStyle, fontSize: '0.95rem' }}>{topicDetails.estimation.assumptions}</p>
              </Callout>
            )}
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>Metric</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>Value</th>
                    <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>Calculation</th>
                  </tr>
                </thead>
                <tbody>
                  {(topicDetails.estimation.calculations || []).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-subtle)' }}>{row.label}</td>
                      <td className="px-4 py-3 font-bold font-mono" style={{ color: '#10b981' }}>{row.value}</td>
                      <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── Data Model ── */}
        {topicDetails.dataModel && (
          <Section id="data-model" title="Data Model">
            {topicDetails.dataModel.description && (
              <p className="mb-4" style={bodyStyle}>{topicDetails.dataModel.description}</p>
            )}
            <CodeBlock code={topicDetails.dataModel.schema} language="sql" />
          </Section>
        )}

        {/* ── API Design ── */}
        {topicDetails.apiDesign?.endpoints && (
          <Section id="api-design" title="API Design">
            {topicDetails.apiDesign.description && (
              <p className="mb-4" style={bodyStyle}>{topicDetails.apiDesign.description}</p>
            )}
            <div className="space-y-4">
              {topicDetails.apiDesign.endpoints.map((ep, i) => (
                <div key={i} className="rounded-lg p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono uppercase ${
                      ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                      ep.method === 'POST' ? 'bg-amber-500/20 text-amber-400' :
                      ep.method === 'PUT' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{ep.method}</span>
                    <code className="font-mono text-base" style={{ color: 'var(--text)' }}>{ep.path}</code>
                  </div>
                  {ep.params && (
                    <p className="text-sm mb-1" style={{ color: 'var(--text-dim)' }}>
                      <span className="font-semibold" style={{ color: 'var(--text-subtle)' }}>Params: </span>
                      <code className="text-sm">{ep.params}</code>
                    </p>
                  )}
                  {ep.response && (
                    <p className="text-sm mb-1" style={{ color: 'var(--text-dim)' }}>
                      <span className="font-semibold" style={{ color: 'var(--text-subtle)' }}>Response: </span>
                      <code className="text-sm">{ep.response}</code>
                    </p>
                  )}
                  {ep.notes && (
                    <p className="text-sm mt-2" style={{ color: 'var(--text-dim)' }}>{ep.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Key Questions ── */}
        {topicDetails.keyQuestions && (
          <Section id="key-questions" title="Key Design Questions">
            <div className="space-y-6">
              {topicDetails.keyQuestions.map((q, i) => (
                <div key={i}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                    {i + 1}. {q.question}
                  </h3>
                  <div style={bodyStyle}>
                    <FormattedContent content={q.answer} color="emerald" />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Algorithm Approaches ── */}
        {topicDetails.algorithmApproaches && (
          <Section id="algorithms" title="Algorithm Approaches">
            <div className="space-y-8">
              {topicDetails.algorithmApproaches.map((algo, i) => (
                <div key={i}>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
                    {i + 1}. {algo.name}
                  </h3>
                  <p className="mb-4" style={bodyStyle}>{algo.description}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg p-4 border-l-4 border-emerald-500" style={{ background: 'var(--surface)' }}>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-500 mb-2">Pros</h4>
                      <ul className="space-y-1.5">
                        {algo.pros.map((p, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
                            <span className="text-emerald-500 mt-0.5">+</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg p-4 border-l-4 border-red-500" style={{ background: 'var(--surface)' }}>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-2">Cons</h4>
                      <ul className="space-y-1.5">
                        {algo.cons.map((c, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
                            <span className="text-red-400 mt-0.5">-</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Implementation ── */}
        {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
          <Section id="implementation" title="System Architecture">
            {topicDetails.basicImplementation && (
              <div className="mb-10">
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text)' }}>
                  {topicDetails.basicImplementation.title || 'Basic Approach'}
                </h3>
                <p className="mb-4" style={bodyStyle}>{topicDetails.basicImplementation.description}</p>
                {topicDetails.basicImplementation.svgTemplate && (
                  <div className="mb-4">
                    <DiagramSVG template={topicDetails.basicImplementation.svgTemplate} />
                  </div>
                )}
                {topicDetails.basicImplementation.problems && (
                  <Callout accent="red">
                    <h4 className="text-sm font-bold text-red-400 mb-2">Issues with this approach</h4>
                    <ul className="space-y-1.5">
                      {topicDetails.basicImplementation.problems.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
                          <span className="text-red-400 mt-0.5">&#10005;</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Callout>
                )}
              </div>
            )}
            {topicDetails.advancedImplementation && (
              <div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text)' }}>
                  {topicDetails.advancedImplementation.title || 'Scalable Solution'}
                </h3>
                <p className="mb-4" style={bodyStyle}>{topicDetails.advancedImplementation.description}</p>
                {topicDetails.advancedImplementation.svgTemplate && (
                  <div className="mb-4">
                    <DiagramSVG template={topicDetails.advancedImplementation.svgTemplate} />
                  </div>
                )}
                {topicDetails.advancedImplementation.keyPoints && (
                  <Callout accent="emerald">
                    <h4 className="text-sm font-bold text-emerald-400 mb-2">Key Design Points</h4>
                    <ul className="space-y-1.5">
                      {topicDetails.advancedImplementation.keyPoints.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
                          <span className="text-emerald-500 mt-0.5">&#10003;</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Callout>
                )}
                {(topicDetails.advancedImplementation.databaseChoice || topicDetails.advancedImplementation.caching) && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    {topicDetails.advancedImplementation.databaseChoice && (
                      <div className="rounded-lg p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Database</h4>
                        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>{topicDetails.advancedImplementation.databaseChoice}</p>
                      </div>
                    )}
                    {topicDetails.advancedImplementation.caching && (
                      <div className="rounded-lg p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Caching</h4>
                        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>{topicDetails.advancedImplementation.caching}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* ── System Flows ── */}
        {(topicDetails.createFlow || topicDetails.redirectFlow) && (
          <Section id="system-flows" title="System Flows">
            {[topicDetails.createFlow, topicDetails.redirectFlow].filter(Boolean).map((flow, fi) => (
              <div key={fi} className="mb-8">
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text)' }}>{flow.title}</h3>
                <div className="space-y-3 pl-1">
                  {flow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        {i + 1}
                      </div>
                      <p className="pt-1" style={bodyStyle}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* ── Architecture Layers ── */}
        {topicDetails.architectureLayers && (
          <Section id="architecture" title="High-Level Architecture">
            <div className="space-y-4">
              {topicDetails.architectureLayers.map((layer, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>{layer.name}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-subtle)' }}>{layer.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Deep Dive Topics ── */}
        {topicDetails.deepDiveTopics && (
          <Section id="deep-dive" title="Deep Dive">
            <div className="space-y-6">
              {topicDetails.deepDiveTopics.map((topic, i) => (
                <div key={i}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{topic.topic}</h3>
                  <p style={bodyStyle}>{topic.detail}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Trade-off Decisions ── */}
        {topicDetails.tradeoffDecisions && (
          <Section id="tradeoffs" title="Trade-off Decisions">
            <div className="space-y-4">
              {topicDetails.tradeoffDecisions.map((td, i) => (
                <div key={i} className="rounded-lg p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-dim)' }}>{td.choice}</span>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      {td.picked}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-subtle)' }}>{td.reason}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Interview Follow-ups ── */}
        {topicDetails.interviewFollowups && (
          <Section id="followups" title="Common Interview Follow-ups">
            <div className="space-y-6">
              {topicDetails.interviewFollowups.map((q, i) => (
                <div key={i}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
                    Q: {q.question}
                  </h3>
                  <div style={bodyStyle}>
                    <FormattedContent content={q.answer} color="emerald" />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Code Examples ── */}
        {topicDetails.codeExamples && codeLangs.length > 0 && (
          <Section id="code" title="Code Implementation">
            <div className="flex gap-2 mb-4">
              {codeLangs.map(lang => (
                <button
                  key={lang}
                  onClick={() => setCodeTab(lang)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    codeTab === lang
                      ? 'text-white'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    background: codeTab === lang ? '#10b981' : 'var(--surface)',
                    color: codeTab === lang ? 'white' : 'var(--text-dim)',
                  }}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
            <CodeBlock code={topicDetails.codeExamples[codeTab] || ''} language={codeTab} />
          </Section>
        )}

        {/* ── Discussion Points ── */}
        {topicDetails.discussionPoints && (
          <Section id="discussion" title="Discussion Points">
            <div className="space-y-6">
              {topicDetails.discussionPoints.map((dp, i) => (
                <div key={i}>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>{dp.topic}</h3>
                  <ul className="space-y-1.5">
                    {dp.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2" style={bodyStyle}>
                        <span className="text-emerald-500 mt-1.5 flex-shrink-0">&#9679;</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}
      </article>

      {/* ── Right Sidebar: Table of Contents ── */}
      <aside className="hidden xl:block w-56 flex-shrink-0">
        <div className="sticky top-24">
          <ArticleTOC sections={sections} activeId={activeSection} />
        </div>
      </aside>
    </div>
  );
}
