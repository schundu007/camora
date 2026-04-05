import { useState, useEffect, useRef } from 'react';
import FormattedContent from './FormattedContent.jsx';
import DiagramSVG from '../features/DiagramSVG.jsx';

/* ── Sticky Table of Contents (right sidebar) ─────────── */
function ArticleTOC({ sections, activeId }) {
  return (
    <nav className="space-y-0.5">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4 pb-2" style={{ color: '#059669', borderBottom: '2px solid #d1fae5' }}>On This Page</h4>
      {sections.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          className={`block py-1.5 pl-3 border-l-2 transition-all text-[13px] leading-snug ${
            activeId === s.id
              ? 'border-emerald-500 font-semibold'
              : 'border-gray-200 hover:border-emerald-300'
          }`}
          style={{ color: activeId === s.id ? '#047857' : '#6b7280' }}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

/* ── Section heading — numbered, with bottom divider ───── */
function SectionHeading({ number, title }) {
  return (
    <div className="mb-8 pb-4 mt-4" style={{ borderBottom: '3px solid #d1fae5' }}>
      <h2 className="text-[1.75rem] font-extrabold tracking-tight leading-tight" style={{ color: '#000000' }}>
        <span style={{ color: '#059669' }}>{number}. </span>
        {title}
      </h2>
    </div>
  );
}

/* ── Sub-heading (h3) — indented under section heading ── */
function SubHeading({ children, icon }) {
  return (
    <h3 className="text-[1.15rem] font-bold mb-3 pl-4 flex items-center gap-2" style={{ color: '#1f2937', borderLeft: '3px solid #a7f3d0' }}>
      {icon && <span className="text-emerald-600">{icon}</span>}
      {children}
    </h3>
  );
}

/* ── Section wrapper ───────────────────────────────────── */
function Section({ id, number, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 mb-20">
      <SectionHeading number={number} title={title} />
      {children}
    </section>
  );
}

/* ── Callout box ───────────────────────────────────────── */
function Callout({ children, accent = 'emerald', icon }) {
  const borderColors = {
    emerald: '#10b981', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6', violet: '#8b5cf6',
  };
  const bgColors = {
    emerald: '#f0fdf4', amber: '#fffbeb', red: '#fef2f2', blue: '#eff6ff', violet: '#f5f3ff',
  };
  return (
    <div
      className="rounded-lg py-4 pl-5 pr-5 mb-5"
      style={{ background: bgColors[accent], borderLeft: `4px solid ${borderColors[accent]}` }}
    >
      {icon && <div className="text-lg mb-1">{icon}</div>}
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
    <div className="rounded-xl overflow-hidden mb-5 border border-gray-200" style={{ background: '#0d1117' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}>
        <span className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>{language}</span>
        <button onClick={handleCopy} className="text-xs font-medium px-2 py-1 rounded transition-colors" style={{ color: '#8b949e' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-5 text-[13px] leading-6 overflow-x-auto" style={{ color: '#c9d1d9' }}>
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

  // Build TOC sections dynamically with sequential numbering
  const sections = [];
  let num = 0;
  if (topicDetails.introduction) sections.push({ id: 'introduction', label: 'Introduction', num: ++num });
  if (topicDetails.functionalRequirements || topicDetails.nonFunctionalRequirements) sections.push({ id: 'requirements', label: 'Requirements & Goals', num: ++num });
  if (topicDetails.estimation) sections.push({ id: 'estimation', label: 'Capacity Estimation', num: ++num });
  if (topicDetails.dataModel) sections.push({ id: 'data-model', label: 'Data Model', num: ++num });
  if (topicDetails.apiDesign?.endpoints) sections.push({ id: 'api-design', label: 'API Design', num: ++num });
  if (topicDetails.keyQuestions) sections.push({ id: 'key-questions', label: 'Key Design Questions', num: ++num });
  if (topicDetails.algorithmApproaches) sections.push({ id: 'algorithms', label: 'Algorithm Approaches', num: ++num });
  if (topicDetails.basicImplementation || topicDetails.advancedImplementation) sections.push({ id: 'implementation', label: 'System Architecture', num: ++num });
  if (topicDetails.createFlow || topicDetails.redirectFlow) sections.push({ id: 'system-flows', label: 'System Flows', num: ++num });
  if (topicDetails.architectureLayers) sections.push({ id: 'architecture', label: 'High-Level Architecture', num: ++num });
  if (topicDetails.deepDiveTopics) sections.push({ id: 'deep-dive', label: 'Deep Dive', num: ++num });
  if (topicDetails.tradeoffDecisions) sections.push({ id: 'tradeoffs', label: 'Trade-off Decisions', num: ++num });
  if (topicDetails.interviewFollowups) sections.push({ id: 'followups', label: 'Interview Follow-ups', num: ++num });
  if (topicDetails.codeExamples) sections.push({ id: 'code', label: 'Code Implementation', num: ++num });

  const getNum = (id) => sections.find(s => s.id === id)?.num || 0;

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

  const bodyText = 'text-[1.05rem] leading-[1.85] text-gray-800';
  const codeLangs = topicDetails.codeExamples ? Object.keys(topicDetails.codeExamples).filter(k => topicDetails.codeExamples[k]) : [];

  return (
    <div className="max-w-4xl">
      {/* ── Main Article ── */}
      <article className="flex-1 min-w-0">

        {/* ── 1. Introduction ── */}
        {topicDetails.introduction && (
          <Section id="introduction" number={getNum('introduction')} title="Introduction">
            <div className={bodyText}>
              <FormattedContent content={topicDetails.introduction} color="emerald" />
            </div>
          </Section>
        )}

        {/* ── 2. Requirements ── */}
        {(topicDetails.functionalRequirements || topicDetails.nonFunctionalRequirements) && (
          <Section id="requirements" number={getNum('requirements')} title="Requirements and Goals of the System">
            {topicDetails.functionalRequirements && (
              <div className="mb-8">
                <SubHeading icon="✓">Functional Requirements</SubHeading>
                <ol className="space-y-2.5 ml-1">
                  {topicDetails.functionalRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700">{i + 1}</span>
                      <span className={bodyText}>{req}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {topicDetails.nonFunctionalRequirements && (
              <div>
                <SubHeading icon="⚡">Non-Functional Requirements</SubHeading>
                <ul className="space-y-2.5 ml-1">
                  {topicDetails.nonFunctionalRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2.5" />
                      <span className={bodyText}>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* ── 3. Capacity Estimation ── */}
        {topicDetails.estimation && (
          <Section id="estimation" number={getNum('estimation')} title="Capacity Estimation and Constraints">
            {topicDetails.estimation.assumptions && (
              <Callout accent="blue" icon="💡">
                <p className="text-sm font-bold text-blue-800 mb-1">Assumptions</p>
                <p className="text-[0.95rem] leading-relaxed text-blue-900">{topicDetails.estimation.assumptions}</p>
              </Callout>
            )}
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th className="text-left px-5 py-3 text-sm font-bold text-emerald-800 border-b-2 border-emerald-200">Metric</th>
                    <th className="text-left px-5 py-3 text-sm font-bold text-emerald-800 border-b-2 border-emerald-200">Value</th>
                    <th className="text-left px-5 py-3 text-sm font-bold text-emerald-800 border-b-2 border-emerald-200 hidden lg:table-cell">Calculation</th>
                  </tr>
                </thead>
                <tbody>
                  {(topicDetails.estimation.calculations || []).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">{row.label}</td>
                      <td className="px-5 py-3 text-sm font-bold font-mono text-emerald-700 border-b border-gray-100">{row.value}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 border-b border-gray-100 hidden lg:table-cell">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── 4. Data Model ── */}
        {topicDetails.dataModel && (
          <Section id="data-model" number={getNum('data-model')} title="Database Design">
            {topicDetails.dataModel.description && (
              <p className={`${bodyText} mb-5`}>{topicDetails.dataModel.description}</p>
            )}
            <CodeBlock code={topicDetails.dataModel.schema} language="sql" />
          </Section>
        )}

        {/* ── 5. API Design ── */}
        {topicDetails.apiDesign?.endpoints && (
          <Section id="api-design" number={getNum('api-design')} title="API Design">
            {topicDetails.apiDesign.description && (
              <p className={`${bodyText} mb-5`}>{topicDetails.apiDesign.description}</p>
            )}
            <div className="space-y-4">
              {topicDetails.apiDesign.endpoints.map((ep, i) => (
                <div key={i} className="rounded-xl p-5 border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wide ${
                      ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                      ep.method === 'POST' ? 'bg-amber-100 text-amber-700' :
                      ep.method === 'PUT' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>{ep.method}</span>
                    <code className="font-mono text-[1rem] font-semibold text-gray-900">{ep.path}</code>
                  </div>
                  {ep.params && (
                    <div className="text-sm mb-2 text-gray-700">
                      <span className="font-bold text-gray-900">Parameters: </span>
                      <code className="text-sm text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{ep.params}</code>
                    </div>
                  )}
                  {ep.response && (
                    <div className="text-sm mb-2 text-gray-700">
                      <span className="font-bold text-gray-900">Response: </span>
                      <code className="text-sm text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{ep.response}</code>
                    </div>
                  )}
                  {ep.notes && (
                    <p className="text-sm mt-3 text-gray-600 leading-relaxed italic">{ep.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 6. Key Questions ── */}
        {topicDetails.keyQuestions && (
          <Section id="key-questions" number={getNum('key-questions')} title="Key Design Questions">
            <div className="space-y-0 ml-2">
              {topicDetails.keyQuestions.map((q, i) => (
                <div key={i} className="py-6" style={{ borderBottom: i < topicDetails.keyQuestions.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <SubHeading>
                    <span className="text-emerald-600 font-bold mr-1">{String.fromCharCode(97 + i)})</span> {q.question}
                  </SubHeading>
                  <div className={`${bodyText} ml-4`}>
                    <FormattedContent content={q.answer} color="emerald" />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 7. Algorithm Approaches ── */}
        {topicDetails.algorithmApproaches && (
          <Section id="algorithms" number={getNum('algorithms')} title="Encoding Algorithms">
            <div className="space-y-10">
              {topicDetails.algorithmApproaches.map((algo, i) => (
                <div key={i}>
                  <SubHeading>
                    <span className="text-emerald-600 font-bold mr-1">{i + 1}.</span> {algo.name}
                  </SubHeading>
                  <p className={`${bodyText} mb-5`}>{algo.description}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Callout accent="emerald">
                      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700 mb-2.5">Advantages</h4>
                      <ul className="space-y-2">
                        {algo.pros.map((p, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
                            <span className="text-emerald-600 font-bold mt-0.5">+</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </Callout>
                    <Callout accent="red">
                      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 mb-2.5">Disadvantages</h4>
                      <ul className="space-y-2">
                        {algo.cons.map((c, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
                            <span className="text-red-500 font-bold mt-0.5">−</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </Callout>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 8. Implementation ── */}
        {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
          <Section id="implementation" number={getNum('implementation')} title="System Architecture">
            {topicDetails.basicImplementation && (
              <div className="mb-12">
                <SubHeading icon="📐">
                  {topicDetails.basicImplementation.title || 'Basic Approach'}
                </SubHeading>
                <p className={`${bodyText} mb-5`}>{topicDetails.basicImplementation.description}</p>
                {topicDetails.basicImplementation.svgTemplate && (
                  <div className="mb-5 rounded-xl overflow-hidden border border-gray-200 bg-white p-4">
                    <DiagramSVG template={topicDetails.basicImplementation.svgTemplate} />
                  </div>
                )}
                {topicDetails.basicImplementation.problems && (
                  <Callout accent="red" icon="⚠️">
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 mb-2.5">Problems with this approach</h4>
                    <ul className="space-y-2">
                      {topicDetails.basicImplementation.problems.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
                          <span className="text-red-500 font-bold mt-0.5">✗</span>
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
                <SubHeading icon="🚀">
                  {topicDetails.advancedImplementation.title || 'Scalable Solution'}
                </SubHeading>
                <p className={`${bodyText} mb-5`}>{topicDetails.advancedImplementation.description}</p>
                {topicDetails.advancedImplementation.svgTemplate && (
                  <div className="mb-5 rounded-xl overflow-hidden border border-gray-200 bg-white p-4">
                    <DiagramSVG template={topicDetails.advancedImplementation.svgTemplate} />
                  </div>
                )}
                {topicDetails.advancedImplementation.keyPoints && (
                  <Callout accent="emerald" icon="✅">
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700 mb-2.5">Key Design Points</h4>
                    <ul className="space-y-2">
                      {topicDetails.advancedImplementation.keyPoints.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-gray-800">
                          <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Callout>
                )}
                {(topicDetails.advancedImplementation.databaseChoice || topicDetails.advancedImplementation.caching) && (
                  <div className="grid md:grid-cols-2 gap-4 mt-5">
                    {topicDetails.advancedImplementation.databaseChoice && (
                      <div className="rounded-xl p-5 border border-gray-200 bg-white shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Database Choice</h4>
                        <p className="text-sm text-gray-800 leading-relaxed">{topicDetails.advancedImplementation.databaseChoice}</p>
                      </div>
                    )}
                    {topicDetails.advancedImplementation.caching && (
                      <div className="rounded-xl p-5 border border-gray-200 bg-white shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Caching Strategy</h4>
                        <p className="text-sm text-gray-800 leading-relaxed">{topicDetails.advancedImplementation.caching}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {/* ── 9. System Flows ── */}
        {(topicDetails.createFlow || topicDetails.redirectFlow) && (
          <Section id="system-flows" number={getNum('system-flows')} title="Request Flows">
            {[topicDetails.createFlow, topicDetails.redirectFlow].filter(Boolean).map((flow, fi) => (
              <div key={fi} className="mb-10">
                <SubHeading icon={fi === 0 ? '📝' : '🔄'}>{flow.title}</SubHeading>
                <div className="ml-1 border-l-2 border-emerald-200 pl-6 space-y-4">
                  {flow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className="absolute -left-[33px] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-100 text-emerald-700 border-2 border-white">
                        {i + 1}
                      </div>
                      <p className={bodyText}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* ── 10. Architecture Layers ── */}
        {topicDetails.architectureLayers && (
          <Section id="architecture" number={getNum('architecture')} title="High-Level Architecture">
            <div className="space-y-5">
              {topicDetails.architectureLayers.map((layer, i) => (
                <div key={i} className="flex items-start gap-4 pb-5" style={{ borderBottom: i < topicDetails.architectureLayers.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 bg-emerald-100 text-emerald-700">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-base font-bold mb-1 text-gray-900">{layer.name}</h4>
                    <p className="text-sm leading-relaxed text-gray-700">{layer.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 11. Deep Dive Topics ── */}
        {topicDetails.deepDiveTopics && (
          <Section id="deep-dive" number={getNum('deep-dive')} title="Deep Dive Topics">
            <div className="space-y-0 ml-2">
              {topicDetails.deepDiveTopics.map((topic, i) => (
                <div key={i} className="py-6" style={{ borderBottom: i < topicDetails.deepDiveTopics.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <SubHeading>
                    <span className="text-emerald-600 font-bold mr-1">{String.fromCharCode(97 + i)})</span> {topic.topic}
                  </SubHeading>
                  <p className={`${bodyText} ml-4`}>{topic.detail}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 12. Trade-off Decisions ── */}
        {topicDetails.tradeoffDecisions && (
          <Section id="tradeoffs" number={getNum('tradeoffs')} title="Trade-off Decisions">
            <div className="space-y-5">
              {topicDetails.tradeoffDecisions.map((td, i) => (
                <div key={i} className="rounded-xl p-5 border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-sm font-bold text-gray-900">{td.choice}</h4>
                    <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 tracking-wide">
                      → {td.picked}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">{td.reason}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 13. Interview Follow-ups ── */}
        {topicDetails.interviewFollowups && (
          <Section id="followups" number={getNum('followups')} title="Common Interview Follow-ups">
            <div className="space-y-0 ml-2">
              {topicDetails.interviewFollowups.map((q, i) => (
                <div key={i} className="py-6" style={{ borderBottom: i < topicDetails.interviewFollowups.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <SubHeading>
                    <span className="text-emerald-700 font-bold mr-1">Q{i + 1}.</span> {q.question}
                  </SubHeading>
                  <div className={`${bodyText} ml-4`}>
                    <FormattedContent content={q.answer} color="emerald" />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 14. Code Examples ── */}
        {topicDetails.codeExamples && codeLangs.length > 0 && (
          <Section id="code" number={getNum('code')} title="Code Implementation">
            <div className="flex gap-2 mb-5">
              {codeLangs.map(lang => (
                <button
                  key={lang}
                  onClick={() => setCodeTab(lang)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: codeTab === lang ? '#059669' : '#f3f4f6',
                    color: codeTab === lang ? 'white' : '#374151',
                    border: codeTab === lang ? '2px solid #059669' : '2px solid #e5e7eb',
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
          <Section id="discussion" number={sections.length} title="Discussion Points">
            <div className="space-y-8">
              {topicDetails.discussionPoints.map((dp, i) => (
                <div key={i}>
                  <SubHeading>{dp.topic}</SubHeading>
                  <ul className="space-y-2">
                    {dp.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2.5" />
                        <span className={bodyText}>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}
      </article>
    </div>
  );
}
