import { useState } from 'react';
import { Icon } from '../../shared/Icons.jsx';

// ── ComparisonCard ──────────────────────────────────────────────────────────
// Supports two formats:
//   1. Side-by-side: { left: { color, icon, title, items }, right: { ... } }
//   2. Table: { headers: [...], rows: [[...]], verdict: '...' }
export function ComparisonCard({ comparison }) {
  const { left, right, title, headers, rows, verdict } = comparison;

  // Table format (headers + rows)
  if (headers && rows) {
    return (
      <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
          <Icon name="columns" size={14} className="text-[var(--accent)]" />
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] landing-display">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs landing-body">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider landing-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-3 py-2 text-sm landing-body ${ci === 0 ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {verdict && (
          <div className="px-3 py-2 bg-[var(--accent)]/5 border-t border-[var(--border)] flex items-center gap-2">
            <Icon name="check" size={12} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--accent)] landing-body">{verdict}</span>
          </div>
        )}
      </div>
    );
  }

  // Side-by-side format (left + right)
  if (!left || !right) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
        <Icon name="columns" size={14} className="text-[var(--accent)]" />
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] landing-display">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#e3e8ee]">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${left.color}15` }}>
              <Icon name={left.icon} size={14} style={{ color: left.color }} />
            </div>
            <h4 className="text-sm font-bold landing-display" style={{ color: left.color }}>{left.title}</h4>
          </div>
          <div className="space-y-2">
            {left.items.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] landing-mono font-bold text-[var(--text-muted)] mt-0.5 w-20 flex-shrink-0 uppercase tracking-wider">{item.label}</span>
                <span className="text-xs text-[var(--text-secondary)] landing-body">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${right.color}15` }}>
              <Icon name={right.icon} size={14} style={{ color: right.color }} />
            </div>
            <h4 className="text-sm font-bold landing-display" style={{ color: right.color }}>{right.title}</h4>
          </div>
          <div className="space-y-2">
            {right.items.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] landing-mono font-bold text-[var(--text-muted)] mt-0.5 w-20 flex-shrink-0 uppercase tracking-wider">{item.label}</span>
                <span className="text-xs text-[var(--text-secondary)] landing-body">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CheatSheetCard ──────────────────────────────────────────────────────────
// Visual bar chart card with labeled values (latency numbers, availability, etc.)
// Supports both rich format (color, icon, bar values) and simple format (label + description)
export function CheatSheetCard({ card }) {
  const cardColor = card.color || 'var(--accent)';
  const hasBarData = card.items?.[0]?.bar !== undefined;
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2" style={{ background: `${cardColor}08` }}>
        {card.icon && <Icon name={card.icon} size={14} style={{ color: cardColor }} />}
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] landing-display">{card.title}</h3>
        <span className="text-[10px] landing-mono text-[var(--text-muted)] ml-auto">{card.items?.length || 0} items</span>
      </div>
      <div className="p-3 space-y-1.5">
        {(card.items || []).map((item, i) => (
          hasBarData ? (
            <div key={i} className="flex items-center gap-2 group">
              <span className="text-xs text-[var(--text-secondary)] landing-body w-[45%] flex-shrink-0 truncate" title={item.label}>{item.label}</span>
              <div className="flex-1 h-5 rounded-full bg-[var(--bg-elevated)] overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(item.bar || 0, 3)}%`,
                    background: `linear-gradient(90deg, ${cardColor}40, ${cardColor})`
                  }}
                />
              </div>
              <span className="text-[10px] landing-mono font-semibold text-[var(--text-muted)] w-[25%] flex-shrink-0 text-right">{item.value}</span>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
              <span className="text-sm font-semibold text-[var(--text-primary)] landing-mono whitespace-nowrap">{item.label}</span>
              <span className="text-sm text-[var(--text-secondary)] landing-body">{item.description || item.value}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

// ── EvolutionTimeline ───────────────────────────────────────────────────────
// Horizontal/vertical stepper showing architecture evolution stages
export function EvolutionTimeline({ steps }) {
  const [activeStep, setActiveStep] = useState(0);
  const current = steps[activeStep];
  // Detect if steps use rich format (color, pros, cons) or simple format (title + description only)
  const isRich = current?.color;
  const stepColor = current?.color || 'var(--accent)';

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
        <Icon name="trendingUp" size={14} className="text-[var(--accent)]" />
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] landing-display">Architecture Evolution</h3>
        <span className="text-[10px] landing-mono text-[var(--text-muted)] ml-auto">{steps.length} stages</span>
      </div>

      {/* Step Selector - Horizontal */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-0 relative">
          <div className="absolute top-[14px] left-4 right-4 h-0.5 bg-[var(--bg-elevated)] z-0" />
          <div
            className="absolute top-[14px] left-4 h-0.5 z-[1] transition-all duration-300"
            style={{
              width: `${(activeStep / Math.max(steps.length - 1, 1)) * (100 - (8 / steps.length))}%`,
              background: stepColor
            }}
          />
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className="flex-1 flex flex-col items-center gap-1.5 z-10 group"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 border-2"
                style={{
                  background: i <= activeStep ? (s.color || 'var(--accent)') : '#f7f8f9',
                  borderColor: i <= activeStep ? (s.color || 'var(--accent)') : '#e3e8ee',
                  transform: i === activeStep ? 'scale(1.2)' : 'scale(1)'
                }}
              >
                {s.icon ? (
                  <Icon name={s.icon} size={12} style={{ color: i <= activeStep ? '#fff' : '#9ca3af' }} />
                ) : (
                  <span className="text-[10px] font-bold" style={{ color: i <= activeStep ? '#fff' : '#9ca3af' }}>{i + 1}</span>
                )}
              </div>
              <span className={`text-[9px] landing-mono font-semibold text-center leading-tight transition-colors ${
                i === activeStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              }`}>
                {s.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Step Detail */}
      <div className="p-3 animate-fade-in" key={activeStep}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold landing-mono px-1.5 py-0.5 rounded" style={{ background: `${stepColor}15`, color: stepColor }}>
                Stage {current.step || activeStep + 1}
              </span>
              <h4 className="text-sm font-bold text-[var(--text-primary)] landing-display">{current.title}</h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-2 landing-body">{current.description}</p>

            {/* Capacity + RPS badges — only if present */}
            {(current.capacity || current.rps) && (
              <div className="flex items-center gap-2 mb-3">
                {current.capacity && (
                  <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevated)]">
                    <Icon name="users" size={10} className="inline mr-1" />{current.capacity}
                  </span>
                )}
                {current.rps && (
                  <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevated)]">
                    <Icon name="zap" size={10} className="inline mr-1" />{current.rps} RPS
                  </span>
                )}
              </div>
            )}

            {/* Pros / Cons — only if present */}
            {(current.pros || current.cons) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {current.pros && (
                  <div>
                    <span className="text-[10px] landing-mono font-bold text-[var(--success)] uppercase tracking-wider">Pros</span>
                    <ul className="mt-1 space-y-0.5">
                      {current.pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-1 text-[11px] text-[var(--text-secondary)] landing-body">
                          <span className="text-[var(--accent)] mt-px flex-shrink-0">+</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {current.cons && (
                  <div>
                    <span className="text-[10px] landing-mono font-bold text-red-500 uppercase tracking-wider">Cons</span>
                    <ul className="mt-1 space-y-0.5">
                      {current.cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-1 text-[11px] text-[var(--text-secondary)] landing-body">
                          <span className="text-red-400 mt-px flex-shrink-0">−</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Evolution Diagram (static image) */}
          {current.diagram && (
            <div className="w-48 flex-shrink-0 hidden lg:block">
              <img
                src={current.diagram}
                alt={`${current.title} architecture`}
                className="w-full rounded-lg border border-[var(--border)]"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PatternCard ─────────────────────────────────────────────────────────────
// Icon + Name + Description + Use When badge for design patterns
export function PatternCard({ pattern }) {
  return (
    <div
      className="rounded-lg p-2.5 border border-[var(--border)] hover:border-[var(--border)] transition-all bg-[var(--bg-surface)] hover:shadow-sm group"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${pattern.color}12` }}
        >
          <Icon name={pattern.icon} size={16} style={{ color: pattern.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[var(--text-primary)] landing-display mb-0.5">{pattern.name}</h4>
          <p className="text-xs text-[var(--text-muted)] landing-body mb-1.5">{pattern.description}</p>
          <div className="flex flex-wrap gap-1">
            <span className="text-[9px] landing-mono px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              Use when: {pattern.useWhen}
            </span>
          </div>
          {pattern.example && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1 landing-mono">{pattern.example}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PatternCardGrid ─────────────────────────────────────────────────────────
// Grid wrapper for multiple pattern cards
export function PatternCardGrid({ patterns, title = 'Design Patterns' }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
        <Icon name="puzzle" size={14} className="text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{title}</h3>
        <span className="text-[10px] landing-mono text-[var(--text-muted)] ml-auto">{patterns.length} patterns</span>
      </div>
      <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
        {patterns.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </div>
  );
}

// ── Cloud Provider Tabs ─────────────────────────────────────────────────────
const CLOUD_PROVIDERS = [
  { id: 'aws', label: 'AWS', color: '#ff9900' },
  { id: 'azure', label: 'Azure', color: '#0078d4' },
  { id: 'gcp', label: 'GCP', color: '#4285f4' },
];

// ── StaticDiagram ───────────────────────────────────────────────────────────
// Renders a pre-generated static diagram image from public/diagrams/
// Supports cloud provider tabs for Eraser-generated diagrams
export function StaticDiagram({ diagram }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [provider, setProvider] = useState('aws');

  // Check if this is a cloud-architecture diagram with multi-provider support
  // Convention: eraser-*.png (AWS), eraser-azure.png, eraser-gcp.png
  const isCloudDiagram = diagram.type === 'cloud-architecture';
  const basePath = diagram.src?.replace(/\/[^/]+$/, ''); // directory path

  const getProviderSrc = (p) => {
    if (p === 'aws') return diagram.src; // Original eraser-*.png is AWS
    return `${basePath}/eraser-${p}.png`;
  };

  const currentSrc = isCloudDiagram ? getProviderSrc(provider) : diagram.src;

  // Reset load state when provider changes
  const handleProviderChange = (p) => {
    setProvider(p);
    setLoaded(false);
    setError(false);
  };

  if (error && !isCloudDiagram) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
        <Icon name="layers" size={14} className="text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{diagram.title}</h3>
        {/* Cloud Provider Tabs */}
        {isCloudDiagram && (
          <div className="flex items-center gap-1 ml-auto px-1 py-0.5 rounded-lg bg-[var(--bg-elevated)]">
            {CLOUD_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className="px-2 py-0.5 text-[10px] font-bold rounded transition-all landing-mono"
                style={{
                  background: provider === p.id ? `${p.color}20` : 'transparent',
                  color: provider === p.id ? p.color : '#9ca3af',
                  border: provider === p.id ? `1px solid ${p.color}40` : '1px solid transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        {!isCloudDiagram && diagram.type && (
          <span className="text-[9px] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] ml-auto uppercase">{diagram.type}</span>
        )}
      </div>
      {diagram.description && (
        <p className="px-3 pt-2 text-xs text-[var(--text-muted)] landing-body">{diagram.description}</p>
      )}
      <div className="p-3">
        {!loaded && !error && (
          <div className="w-full h-48 bg-[var(--bg-elevated)] rounded-lg animate-pulse flex items-center justify-center">
            <Icon name="loader" size={20} className="text-[var(--text-muted)] animate-spin" />
          </div>
        )}
        {error && isCloudDiagram && (
          <div className="w-full h-32 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center text-[var(--text-muted)] text-xs landing-mono">
            {CLOUD_PROVIDERS.find(p => p.id === provider)?.label} diagram not available
          </div>
        )}
        <img
          key={currentSrc}
          src={currentSrc}
          alt={`${diagram.title} — ${provider.toUpperCase()}`}
          className={`rounded-lg transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 h-0'} ${diagram.type === 'ui' ? 'max-h-[320px] mx-auto' : 'w-full'}`}
          style={diagram.type === 'ui' ? { width: 'auto', maxHeight: '320px' } : { maxHeight: '500px', objectFit: 'contain', width: '100%' }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
    </div>
  );
}

// ── StaticDiagramGrid ───────────────────────────────────────────────────────
// Grid wrapper for multiple static diagrams
export function StaticDiagramGrid({ diagrams, title = 'Architecture Diagrams' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon name="layers" size={14} className="text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{title}</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {diagrams.map((d) => (
          <StaticDiagram key={d.id} diagram={d} />
        ))}
      </div>
    </div>
  );
}

// ── FlowchartCard ───────────────────────────────────────────────────────────
// Shows diagram image as primary visual, with step summary as collapsible detail
export function FlowchartCard({ flowchart }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const hasDiagram = flowchart.src && !imgError;

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
        <Icon name="gitBranch" size={14} className="text-[var(--accent)]" />
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] landing-display flex-1">{flowchart.title}</h3>
        {flowchart.steps && hasDiagram && (
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="text-[10px] landing-mono font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--accent)]/5"
          >
            {showSteps ? 'Hide steps' : 'Show steps'}
          </button>
        )}
      </div>
      {flowchart.description && (
        <p className="px-3 pt-2 text-xs text-[var(--text-muted)] landing-body">{flowchart.description}</p>
      )}
      <div className="p-3">
        {/* Diagram image — primary visual, constrained height */}
        {hasDiagram && (
          <div className="flex justify-center">
            {!imgLoaded && (
              <div className="w-full h-40 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            )}
            <img
              src={flowchart.src}
              alt={flowchart.title}
              className={`rounded-lg border border-[var(--border)] transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
              style={{ maxHeight: '320px', maxWidth: '100%', objectFit: 'contain' }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </div>
        )}
        {/* Step boxes — shown as fallback (no diagram) or when toggled open */}
        {flowchart.steps && (!hasDiagram || showSteps) && (
          <div className={`flex flex-wrap items-center gap-1 ${hasDiagram ? 'mt-3 pt-3 border-t border-[var(--border)]' : ''}`}>
            {flowchart.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center landing-mono flex-shrink-0">{s.step}</span>
                  <div>
                    <div className="text-[11px] font-semibold text-[var(--text-primary)] landing-display leading-tight">{s.label}</div>
                    <div className="text-[9px] text-[var(--text-muted)] landing-mono leading-tight">{s.detail}</div>
                  </div>
                </div>
                {i < flowchart.steps.length - 1 && (
                  <Icon name="arrowRight" size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChartCard ───────────────────────────────────────────────────────────────
// Renders inline chart data + optional static chart image
export function ChartCard({ chart }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isReadWriteChart = chart.data?.[0]?.read !== undefined;

  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
        <Icon name="barChart" size={14} className="text-[var(--accent)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{chart.title}</h3>
      </div>
      <div className="p-3">
        {/* Inline bar chart visualization */}
        {chart.data && !isReadWriteChart && (
          <div className="space-y-2 mb-3">
            {chart.data.map((d, i) => {
              // Use log scale for latency (huge range)
              const maxVal = Math.max(...chart.data.map(x => x.value));
              const logWidth = maxVal > 1000
                ? (Math.log10(d.value + 1) / Math.log10(maxVal + 1)) * 100
                : (d.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] landing-body w-24 flex-shrink-0 truncate">{d.label}</span>
                  <div className="flex-1 h-6 rounded bg-[var(--bg-elevated)] overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${Math.max(logWidth, 4)}%`, background: d.color }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] landing-mono font-semibold text-[var(--text-muted)]">
                      {d.value >= 1000000 ? `${(d.value / 1000000).toFixed(0)}ms` : d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}μs` : `${d.value}ns`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Read:Write ratio chart */}
        {chart.data && isReadWriteChart && (
          <div className="space-y-2 mb-3">
            {chart.data.map((d, i) => {
              const total = d.read + d.write;
              const readPct = (d.read / total) * 100;
              const writePct = (d.write / total) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-[var(--text-secondary)] landing-body">{d.label}</span>
                    <span className="text-[10px] landing-mono text-[var(--text-muted)]">{d.read}:{d.write} R:W</span>
                  </div>
                  <div className="flex h-5 rounded overflow-hidden">
                    <div className="h-full flex items-center justify-center" style={{ width: `${readPct}%`, background: `${d.color}` }}>
                      <span className="text-[8px] landing-mono text-white font-bold">READ</span>
                    </div>
                    <div className="h-full flex items-center justify-center bg-gray-300" style={{ width: `${writePct}%` }}>
                      {writePct > 15 && <span className="text-[8px] landing-mono text-[var(--text-secondary)] font-bold">WRITE</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Static chart image */}
        {chart.src && !imgError && (
          <>
            {!imgLoaded && !imgError && (
              <div className="w-full h-32 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            )}
            <img
              src={chart.src}
              alt={chart.title}
              className={`w-full rounded-lg border border-[var(--border)] transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </>
        )}
      </div>
    </div>
  );
}
