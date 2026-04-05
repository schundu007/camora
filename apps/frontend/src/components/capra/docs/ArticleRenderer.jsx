import { useState, useEffect, useRef } from 'react';
import FormattedContent from './FormattedContent.jsx';
import DiagramSVG from '../features/DiagramSVG.jsx';

/* ── Compact article renderer — outline/document style ── */

function Section({ id, number, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 mb-8">
      <h2 className="text-base font-bold mb-1" style={{ color: '#000' }}>
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function Sub({ children }) {
  return <h3 className="text-sm font-bold mt-3 mb-0.5 ml-6" style={{ color: '#111' }}>{children}</h3>;
}

function Items({ children }) {
  return <div className="ml-12 text-sm leading-relaxed" style={{ color: '#333' }}>{children}</div>;
}

function NumberedList({ items }) {
  return (
    <div className="ml-12 text-sm" style={{ color: '#333' }}>
      {items.map((item, i) => (
        <div key={i} className="leading-relaxed">
          <span className="font-bold text-gray-500 mr-1.5">{i + 1}</span> {item}
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }) {
  return (
    <div className="ml-12 text-sm" style={{ color: '#333' }}>
      {items.map((item, i) => (
        <div key={i} className="leading-relaxed">• {item}</div>
      ))}
    </div>
  );
}

function CodeBlock({ code, language = '' }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden my-3 ml-6 border border-gray-200" style={{ background: '#0d1117' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}>
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500">{language}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-[11px] text-gray-500 hover:text-white">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs leading-5 overflow-x-auto" style={{ color: '#c9d1d9' }}><code>{code}</code></pre>
    </div>
  );
}

export default function ArticleRenderer({ topicDetails, selectedTopic }) {
  const [codeTab, setCodeTab] = useState('python');
  const [activeSection, setActiveSection] = useState('');
  const observerRef = useRef(null);

  const sections = [];
  let n = 0;
  if (topicDetails.introduction) sections.push({ id: 'introduction', label: 'Introduction', n: ++n });
  if (topicDetails.functionalRequirements || topicDetails.nonFunctionalRequirements) sections.push({ id: 'requirements', label: 'Requirements', n: ++n });
  if (topicDetails.estimation) sections.push({ id: 'estimation', label: 'Capacity Estimation', n: ++n });
  if (topicDetails.dataModel) sections.push({ id: 'data-model', label: 'Data Model', n: ++n });
  if (topicDetails.apiDesign?.endpoints) sections.push({ id: 'api-design', label: 'API Design', n: ++n });
  if (topicDetails.keyQuestions) sections.push({ id: 'key-questions', label: 'Key Questions', n: ++n });
  if (topicDetails.algorithmApproaches) sections.push({ id: 'algorithms', label: 'Algorithms', n: ++n });
  if (topicDetails.basicImplementation || topicDetails.advancedImplementation) sections.push({ id: 'implementation', label: 'Architecture', n: ++n });
  if (topicDetails.createFlow || topicDetails.redirectFlow) sections.push({ id: 'system-flows', label: 'Request Flows', n: ++n });
  if (topicDetails.architectureLayers) sections.push({ id: 'architecture', label: 'Architecture Layers', n: ++n });
  if (topicDetails.deepDiveTopics) sections.push({ id: 'deep-dive', label: 'Deep Dive', n: ++n });
  if (topicDetails.tradeoffDecisions) sections.push({ id: 'tradeoffs', label: 'Trade-offs', n: ++n });
  if (topicDetails.interviewFollowups) sections.push({ id: 'followups', label: 'Follow-ups', n: ++n });
  if (topicDetails.codeExamples) sections.push({ id: 'code', label: 'Code', n: ++n });

  const num = (id) => sections.find(s => s.id === id)?.n || 0;

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) { setActiveSection(e.target.id); break; } },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [selectedTopic]);

  const codeLangs = topicDetails.codeExamples ? Object.keys(topicDetails.codeExamples).filter(k => topicDetails.codeExamples[k]) : [];

  return (
    <div className="max-w-3xl text-sm" style={{ color: '#222' }}>

      {/* Introduction */}
      {topicDetails.introduction && (
        <Section id="introduction" number={num('introduction')} title="Introduction">
          <div className="ml-6 text-sm leading-relaxed" style={{ color: '#333' }}>
            <FormattedContent content={topicDetails.introduction} color="emerald" />
          </div>
        </Section>
      )}

      {/* Requirements */}
      {(topicDetails.functionalRequirements || topicDetails.nonFunctionalRequirements) && (
        <Section id="requirements" number={num('requirements')} title="Requirements and Goals">
          {topicDetails.functionalRequirements && (<>
            <Sub>Functional Requirements</Sub>
            <NumberedList items={topicDetails.functionalRequirements} />
          </>)}
          {topicDetails.nonFunctionalRequirements && (<>
            <Sub>Non-Functional Requirements</Sub>
            <BulletList items={topicDetails.nonFunctionalRequirements} />
          </>)}
        </Section>
      )}

      {/* Capacity Estimation */}
      {topicDetails.estimation && (
        <Section id="estimation" number={num('estimation')} title="Capacity Estimation">
          {topicDetails.estimation.assumptions && (
            <div className="ml-6 text-sm mb-2 italic" style={{ color: '#555' }}>
              Assumptions: {topicDetails.estimation.assumptions}
            </div>
          )}
          <div className="ml-6 overflow-hidden rounded border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-1.5 text-xs font-bold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="text-left px-3 py-1.5 text-xs font-bold text-gray-700 border-b border-gray-200">Value</th>
                  <th className="text-left px-3 py-1.5 text-xs font-bold text-gray-700 border-b border-gray-200 hidden lg:table-cell">Calculation</th>
                </tr>
              </thead>
              <tbody>
                {(topicDetails.estimation.calculations || []).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                    <td className="px-3 py-1.5 font-medium text-gray-800 border-b border-gray-100">{row.label}</td>
                    <td className="px-3 py-1.5 font-bold font-mono text-emerald-700 border-b border-gray-100">{row.value}</td>
                    <td className="px-3 py-1.5 text-gray-500 text-xs border-b border-gray-100 hidden lg:table-cell">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Data Model */}
      {topicDetails.dataModel && (
        <Section id="data-model" number={num('data-model')} title="Database Design">
          {topicDetails.dataModel.description && (
            <div className="ml-6 text-sm mb-1" style={{ color: '#333' }}>{topicDetails.dataModel.description}</div>
          )}
          <CodeBlock code={topicDetails.dataModel.schema} language="sql" />
        </Section>
      )}

      {/* API Design */}
      {topicDetails.apiDesign?.endpoints && (
        <Section id="api-design" number={num('api-design')} title="API Design">
          {topicDetails.apiDesign.description && (
            <div className="ml-6 text-sm mb-2" style={{ color: '#333' }}>{topicDetails.apiDesign.description}</div>
          )}
          {topicDetails.apiDesign.endpoints.map((ep, i) => (
            <div key={i} className="ml-6 mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                  ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                  ep.method === 'POST' ? 'bg-amber-100 text-amber-700' :
                  ep.method === 'PUT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>{ep.method}</span>
                <code className="font-mono text-sm font-semibold text-gray-900">{ep.path}</code>
              </div>
              {ep.params && <div className="ml-8 text-xs text-gray-500">Params: <code>{ep.params}</code></div>}
              {ep.response && <div className="ml-8 text-xs text-gray-500">Response: <code>{ep.response}</code></div>}
              {ep.notes && <div className="ml-8 text-xs text-gray-400 italic">{ep.notes}</div>}
            </div>
          ))}
        </Section>
      )}

      {/* Key Questions */}
      {topicDetails.keyQuestions && (
        <Section id="key-questions" number={num('key-questions')} title="Key Design Questions">
          {topicDetails.keyQuestions.map((q, i) => (
            <div key={i} className="mb-3">
              <Sub>{String.fromCharCode(97 + i)}) {q.question}</Sub>
              <Items>
                <FormattedContent content={q.answer} color="emerald" />
              </Items>
            </div>
          ))}
        </Section>
      )}

      {/* Algorithm Approaches */}
      {topicDetails.algorithmApproaches && (
        <Section id="algorithms" number={num('algorithms')} title="Encoding Algorithms">
          {topicDetails.algorithmApproaches.map((algo, i) => (
            <div key={i} className="mb-4">
              <Sub>{i + 1}. {algo.name}</Sub>
              <Items><p className="mb-2">{algo.description}</p></Items>
              <div className="ml-12 grid md:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-green-50 border border-green-200">
                  <div className="font-bold text-green-800 mb-1">Pros</div>
                  {algo.pros.map((p, j) => <div key={j} className="text-green-900">+ {p}</div>)}
                </div>
                <div className="p-2 rounded bg-red-50 border border-red-200">
                  <div className="font-bold text-red-800 mb-1">Cons</div>
                  {algo.cons.map((c, j) => <div key={j} className="text-red-900">− {c}</div>)}
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Implementation */}
      {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
        <Section id="implementation" number={num('implementation')} title="System Architecture">
          {topicDetails.basicImplementation && (<>
            <Sub>{topicDetails.basicImplementation.title || 'Basic Approach'}</Sub>
            <Items><p>{topicDetails.basicImplementation.description}</p></Items>
            {topicDetails.basicImplementation.svgTemplate && (
              <div className="ml-6 my-2"><DiagramSVG template={topicDetails.basicImplementation.svgTemplate} /></div>
            )}
            {topicDetails.basicImplementation.problems && (
              <div className="ml-12 text-xs mt-1">
                <span className="font-bold text-red-700">Issues: </span>
                {topicDetails.basicImplementation.problems.map((p, i) => (
                  <div key={i} className="text-red-800">✗ {p}</div>
                ))}
              </div>
            )}
          </>)}
          {topicDetails.advancedImplementation && (<>
            <Sub>{topicDetails.advancedImplementation.title || 'Scalable Solution'}</Sub>
            <Items><p>{topicDetails.advancedImplementation.description}</p></Items>
            {topicDetails.advancedImplementation.svgTemplate && (
              <div className="ml-6 my-2"><DiagramSVG template={topicDetails.advancedImplementation.svgTemplate} /></div>
            )}
            {topicDetails.advancedImplementation.keyPoints && (
              <div className="ml-12 text-xs mt-1">
                {topicDetails.advancedImplementation.keyPoints.map((p, i) => (
                  <div key={i} className="text-gray-700">✓ {p}</div>
                ))}
              </div>
            )}
            {(topicDetails.advancedImplementation.databaseChoice || topicDetails.advancedImplementation.caching) && (
              <div className="ml-12 mt-2 text-xs text-gray-600">
                {topicDetails.advancedImplementation.databaseChoice && <div><strong>Database:</strong> {topicDetails.advancedImplementation.databaseChoice}</div>}
                {topicDetails.advancedImplementation.caching && <div><strong>Caching:</strong> {topicDetails.advancedImplementation.caching}</div>}
              </div>
            )}
          </>)}
        </Section>
      )}

      {/* Request Flows */}
      {(topicDetails.createFlow || topicDetails.redirectFlow) && (
        <Section id="system-flows" number={num('system-flows')} title="Request Flows">
          {[topicDetails.createFlow, topicDetails.redirectFlow].filter(Boolean).map((flow, fi) => (
            <div key={fi} className="mb-3">
              <Sub>{flow.title}</Sub>
              <NumberedList items={flow.steps} />
            </div>
          ))}
        </Section>
      )}

      {/* Architecture Layers */}
      {topicDetails.architectureLayers && (
        <Section id="architecture" number={num('architecture')} title="High-Level Architecture">
          {topicDetails.architectureLayers.map((layer, i) => (
            <div key={i} className="ml-6 mb-2">
              <div className="text-sm"><strong>{i + 1}. {layer.name}</strong></div>
              <div className="ml-6 text-sm text-gray-600 leading-relaxed">{layer.description}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Deep Dive */}
      {topicDetails.deepDiveTopics && (
        <Section id="deep-dive" number={num('deep-dive')} title="Deep Dive Topics">
          {topicDetails.deepDiveTopics.map((topic, i) => (
            <div key={i} className="mb-3">
              <Sub>{String.fromCharCode(97 + i)}) {topic.topic}</Sub>
              <Items><p className="leading-relaxed">{topic.detail}</p></Items>
            </div>
          ))}
        </Section>
      )}

      {/* Trade-offs */}
      {topicDetails.tradeoffDecisions && (
        <Section id="tradeoffs" number={num('tradeoffs')} title="Trade-off Decisions">
          {topicDetails.tradeoffDecisions.map((td, i) => (
            <div key={i} className="mb-3">
              <Sub>{td.choice} → <span className="text-emerald-700">{td.picked}</span></Sub>
              <Items><p className="leading-relaxed">{td.reason}</p></Items>
            </div>
          ))}
        </Section>
      )}

      {/* Interview Follow-ups */}
      {topicDetails.interviewFollowups && (
        <Section id="followups" number={num('followups')} title="Common Interview Follow-ups">
          {topicDetails.interviewFollowups.map((q, i) => (
            <div key={i} className="mb-3">
              <Sub>Q{i + 1}. {q.question}</Sub>
              <Items>
                <FormattedContent content={q.answer} color="emerald" />
              </Items>
            </div>
          ))}
        </Section>
      )}

      {/* Code */}
      {topicDetails.codeExamples && codeLangs.length > 0 && (
        <Section id="code" number={num('code')} title="Code Implementation">
          <div className="ml-6 flex gap-1 mb-2">
            {codeLangs.map(lang => (
              <button key={lang} onClick={() => setCodeTab(lang)}
                className={`px-2 py-1 rounded text-xs font-medium ${codeTab === lang ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
          <CodeBlock code={topicDetails.codeExamples[codeTab] || ''} language={codeTab} />
        </Section>
      )}

      {/* Discussion Points */}
      {topicDetails.discussionPoints && (
        <Section id="discussion" number={sections.length} title="Discussion Points">
          {topicDetails.discussionPoints.map((dp, i) => (
            <div key={i} className="mb-3">
              <Sub>{dp.topic}</Sub>
              <BulletList items={dp.points} />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
