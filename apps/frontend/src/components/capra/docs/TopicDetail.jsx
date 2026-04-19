import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
import { CompanyLogo, getCompanyLogoSrc } from '../../shared/CompanyLogo.tsx';
import FormattedContent from './FormattedContent.jsx';
import CloudArchitectureDiagram from './CloudArchitectureDiagram.jsx';
import DiagramSVG from '../features/DiagramSVG.jsx';
import { getAuthHeaders } from '../../../utils/authHeaders.js';
import { useAuth } from '../../../contexts/AuthContext';
import { generateSlug, getProblemBySlug } from '../../../data/capra/problems.js';
import problemsFull from '../../../data/capra/problems-full.json';
import {
  ComparisonCard, CheatSheetCard, EvolutionTimeline,
  PatternCardGrid, StaticDiagramGrid, FlowchartCard, ChartCard
} from './TopicVisuals.jsx';
import TopicComments from './TopicComments';

/**
 * Simple regex-based syntax highlighter for Python code.
 * Returns an HTML string with colored spans for comments, keywords, strings, and numbers.
 */
function highlightCodeLine(line) {
  // Escape HTML entities first
  let escaped = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments (# ...) — must come first to avoid coloring inside comments
  if (escaped.trimStart().startsWith('#') || escaped.match(/\s#[^{]/)) {
    const commentIdx = escaped.indexOf('#');
    if (commentIdx >= 0) {
      const before = escaped.slice(0, commentIdx);
      const comment = escaped.slice(commentIdx);
      return highlightNonComment(before) + `<span style="color:#6a737d">${comment}</span>`;
    }
  }

  return highlightNonComment(escaped);
}

function highlightNonComment(text) {
  // Strings (single and double quoted)
  text = text.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, '<span style="color:#a6e3a1">$&</span>');
  // Keywords
  text = text.replace(/\b(def|return|if|elif|else|for|while|class|import|from|in|not|and|or|is|None|True|False|try|except|finally|with|as|yield|raise|pass|break|continue|lambda|self|async|await)\b/g, '<span style="color:#cba6f7">$&</span>');
  // Numbers
  text = text.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fab387">$&</span>');
  return text;
}

/**
 * Table for capacity planning / back-of-envelope estimation.
 * Handles both data formats:
 *  - calculations array: [{ label, value, detail }]
 *  - flat keys: { users, storage, bandwidth, qps }
 */
function CapacityPlanningGrid({ estimation }) {
  const LABEL_MAP = {
    users: 'Users / DAU',
    storage: 'Storage',
    bandwidth: 'Bandwidth',
    qps: 'QPS / Throughput',
  };

  const rows = useMemo(() => {
    if (estimation.calculations) {
      return estimation.calculations.map(calc => ({
        metric: calc.label,
        value: calc.value,
        detail: calc.detail,
      }));
    }
    const skipKeys = ['title', 'assumptions'];
    return Object.entries(estimation)
      .filter(([key]) => !skipKeys.includes(key))
      .map(([key, val]) => ({
        metric: LABEL_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        value: val.split(/[=*,]/).pop()?.trim() || val,
        detail: val,
      }));
  }, [estimation]);

  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
      <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
        <Icon name="hash" size={16} className="text-white" />
        <h3 className="text-sm font-bold text-white landing-display">{estimation.title || 'Capacity Planning'}</h3>
      </div>
      {estimation.assumptions && (
        <div className="px-3 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)]/30 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--text-secondary)]">Assumptions:</span> {estimation.assumptions}
        </div>
      )}
      <div className="p-3">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--bg-elevated)]/70">
              <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display">Metric</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display">Value</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display hidden lg:table-cell">Calculation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                <td className="px-3 py-2.5 font-semibold text-[var(--text-secondary)] border-b border-[var(--border)]">{row.metric}</td>
                <td className="px-3 py-2.5 font-bold text-[var(--text-secondary)] landing-mono border-b border-[var(--border)]">{row.value}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)] text-xs border-b border-[var(--border)] hidden lg:table-cell">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Structured data model rendering — parses SQL-like schema text into table cards.
 * Falls back to enhanced code block with line numbers and copy button.
 */
function DataModelSection({ schema }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [schema]);

  // Try to parse schema into structured tables
  const tables = useMemo(() => {
    if (!schema) return [];
    const parsed = [];
    // Match table blocks like "Table users {" or "CREATE TABLE users (" or just "users:" or "Users" followed by fields
    const lines = schema.split('\n');
    let currentTable = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Detect table headers: "Table name {", "tableName:", "CREATE TABLE name", or standalone PascalCase/UPPER names
      const tableMatch = line.match(/^(?:Table\s+|CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)?(\w+)\s*[{(:]?\s*$/i)
        || line.match(/^(?:Table\s+|CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?)(\w+)\s*\{/i)
        || line.match(/^(\w+)\s*\(/i);

      if (tableMatch && !line.match(/^\s*(id|name|uuid|varchar|int|text|timestamp|boolean|created|updated|status|type|email|title|description|content|url|user_id|post_id)/i)) {
        if (currentTable && currentTable.fields.length > 0) {
          parsed.push(currentTable);
        }
        currentTable = { name: tableMatch[1], fields: [] };
        continue;
      }

      // Parse fields if we're inside a table
      if (currentTable) {
        // Skip closing braces/parens
        if (line === '}' || line === ')' || line === ');') continue;

        // Parse field: "  id uuid PK" or "  name varchar(255) NOT NULL" etc.
        const fieldMatch = line.match(/^\s*(\w+)\s+([\w()]+(?:\(\d+\))?)\s*(.*)?$/);
        if (fieldMatch) {
          const notes = (fieldMatch[3] || '').replace(/,\s*$/, '').trim();
          currentTable.fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2],
            notes: notes,
          });
        }
      }
    }
    if (currentTable && currentTable.fields.length > 0) {
      parsed.push(currentTable);
    }
    return parsed;
  }, [schema]);

  const typeColor = (type) => {
    const t = type.toLowerCase();
    if (t.includes('uuid')) return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]';
    if (t.includes('varchar') || t.includes('text') || t.includes('string') || t.includes('char')) return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]';
    if (t.includes('int') || t.includes('bigint') || t.includes('serial') || t.includes('float') || t.includes('decimal') || t.includes('numeric')) return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]';
    if (t.includes('bool')) return 'text-[var(--accent)] bg-[var(--accent)]/10';
    if (t.includes('timestamp') || t.includes('date') || t.includes('time')) return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]';
    if (t.includes('json') || t.includes('jsonb') || t.includes('array')) return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]';
    return 'text-[var(--text-secondary)] bg-[var(--bg-elevated)]';
  };

  // If we successfully parsed tables, show structured view
  if (tables.length > 0) {
    return (
      <div id="data-model" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
        <div className="bg-[var(--accent)] border-b border-[var(--accent)] px-4 py-2 flex items-center gap-2">
          <Icon name="database" size={14} className="text-white" />
          <h3 className="text-sm font-bold text-white landing-display">Data Model</h3>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{tables.length} tables</span>
        </div>
        <div className="p-3 grid grid-cols-1 gap-3">
          {tables.map((table, ti) => (
            <div key={ti} className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center gap-2">
                <Icon name="database" size={12} className="text-[var(--text-muted)]" />
                <span className="text-sm font-bold text-[var(--text-primary)] landing-mono">{table.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] landing-mono ml-auto">{table.fields.length} fields</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-elevated)]/50">
                      <th className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider landing-display border-b border-[var(--border)]">Field</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider landing-display border-b border-[var(--border)]">Type</th>
                      <th className="text-left px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider landing-display border-b border-[var(--border)]">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.fields.map((field, fi) => (
                      <tr key={fi} className="hover:bg-[var(--bg-elevated)]/30 transition-colors border-b border-[var(--border)] last:border-b-0">
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)] landing-mono text-xs">{field.name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded landing-mono ${typeColor(field.type)}`}>{field.type}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--text-muted)] landing-body">
                          {field.notes && (
                            <>
                              {field.notes.match(/PK|PRIMARY/i) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] mr-1 landing-mono">PK</span>}
                              {field.notes.match(/FK|FOREIGN|REFERENCES/i) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] mr-1 landing-mono">FK</span>}
                              {field.notes.match(/NOT NULL/i) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] mr-1 landing-mono">NOT NULL</span>}
                              <span>{field.notes.replace(/(PK|PRIMARY KEY|FK|FOREIGN KEY|NOT NULL|REFERENCES\s+\w+)/gi, '').replace(/,/g, '').trim()}</span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: enhanced code block with line numbers, syntax coloring, and Copy button
  const schemaLines = (schema || '').split('\n');
  return (
    <div id="data-model" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
      <div className="bg-[var(--accent)] border-b border-[var(--accent)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="database" size={14} className="text-white" />
          <h3 className="text-sm font-bold text-white landing-display">Data Model</h3>
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all landing-mono flex items-center gap-1.5"
        >
          {copied ? (
            <><svg className="w-3 h-3 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Copied</>
          ) : (
            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</>
          )}
        </button>
      </div>
      <div className="overflow-x-auto bg-[var(--bg-elevated)]">
        <table className="w-full">
          <tbody>
            {schemaLines.map((line, i) => (
              <tr key={i} className="hover:bg-[var(--bg-elevated)]/30">
                <td className="text-right pr-3 pl-3 py-0 select-none text-[10px] text-[var(--text-muted)] landing-mono" style={{ minWidth: '2.5rem', lineHeight: '1.375rem' }}>{i + 1}</td>
                <td className="pr-4 py-0 landing-mono text-xs whitespace-pre" style={{ lineHeight: '1.375rem' }}>
                  {(() => {
                    // Simple syntax coloring
                    if (line.trim().match(/^(Table|CREATE|ALTER|DROP|INSERT|SELECT|INDEX)/i)) return <span className="text-[var(--text-secondary)] font-semibold">{line}</span>;
                    if (line.trim().match(/^(id|uuid|varchar|int|bigint|text|boolean|timestamp|serial|jsonb?|float|decimal|numeric)\b/i)) return <span className="text-[var(--text-secondary)]">{line}</span>;
                    if (line.trim().startsWith('--') || line.trim().startsWith('//')) return <span className="text-[var(--text-muted)] italic">{line}</span>;
                    if (line.trim() === '}' || line.trim() === ')' || line.trim() === ');') return <span className="text-[var(--text-muted)]">{line}</span>;
                    return <span className="text-[var(--accent)]">{line}</span>;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Shows a pre-generated static diagram if available at /diagrams/{topicId}/eraser-{provider}.png,
 * otherwise falls back to the API-generated CloudArchitectureDiagram.
 */
function StaticCloudDiagram({ topicId, provider, staticSrc, diagramData, generatingDiagram, diagramError, onGenerate }) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setImgError(false); }, [topicId, provider]);

  if (imgError) {
    return (
      <CloudArchitectureDiagram
        imageUrl={diagramData?.imageUrl}
        loading={generatingDiagram}
        error={diagramError}
        cloudProvider={provider}
        onRetry={onGenerate}
      />
    );
  }

  return (
    <div>
      {/* Constrained preview — click to expand (like Medium/GFG) */}
      <div className="rounded-lg overflow-hidden cursor-pointer relative" style={{ background: 'white', border: '1px solid var(--border)', maxHeight: expanded ? 'none' : '500px' }} onClick={() => setExpanded(!expanded)}>
        <img
          src={staticSrc}
          alt={`${topicId} ${provider.toUpperCase()} architecture diagram`}
          style={{ width: '100%', maxWidth: '700px', height: 'auto', display: 'block', margin: '0 auto' }}
          onError={() => setImgError(true)}
        />
        {!expanded && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, white)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 99, background: 'white', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Click to expand ↓</span>
          </div>
        )}
        {expanded && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 99, background: 'white', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Click to collapse ↑</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
        <span>{provider.toUpperCase()} Architecture</span>
        <div className="flex items-center gap-3">
          <button onClick={onGenerate} className="hover:text-[var(--accent)] transition-colors" title="Generate a fresh diagram using AI">Regenerate →</button>
          <a href={staticSrc} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)]">Full Size →</a>
        </div>
      </div>
    </div>
  );
}

/** Pricing cards — fetches price IDs from backend, zero hardcoded Stripe IDs */
function PricingCards({ navigate, getAuthHeaders }) {
  const [prices, setPrices] = useState(null);
  useEffect(() => {
    const API_URL = import.meta.env.VITE_CAMORA_API_URL || import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
    fetch(`${API_URL}/api/v1/billing/prices`).then(r => r.json()).then(setPrices).catch(() => {});
  }, []);

  const plans = [
    { name: 'Starter', price: '$29', period: '/mo', features: ['Unlimited topics', '10 live sessions/mo', 'AI explanations', 'Coding solutions'], key: 'monthly' },
    { name: 'Pro', price: '$49', period: '/mo', features: ['Everything in Starter', 'Unlimited live sessions', 'Company-specific prep', 'Desktop + Mobile app', 'Speaker voice filtering'], popular: true, key: 'quarterly_pro' },
    { name: 'Annual', price: '$19', period: '/mo', subtitle: 'Billed $228/year', features: ['Everything in Pro', 'Save 61% vs monthly', 'Locked-in pricing', 'Priority support'], best: true, key: 'annual' },
    { name: 'Desktop App', price: '$29', period: '/mo', subtitle: 'Or $99/year', features: ['Native macOS & Windows', 'Screen-share safe', 'Faster performance', 'Always-on assistant'], addon: true, key: 'desktop_monthly' },
  ];

  const handleCheckout = async (priceId) => {
    if (!priceId) { navigate('/pricing'); return; }
    try {
      const API_URL = import.meta.env.VITE_CAMORA_API_URL || import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
      const resp = await fetch(`${API_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ price_id: priceId, success_url: window.location.href, cancel_url: window.location.href }),
      });
      if (!resp.ok) { navigate('/pricing'); return; }
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
      else navigate('/pricing');
    } catch { navigate('/pricing'); }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {plans.map(plan => {
        const priceId = prices?.[plan.key]?.priceId || '';
        return (
          <div key={plan.name} className="rounded-2xl p-5 flex flex-col" style={{
            border: plan.popular ? '2px solid #10b981' : plan.best ? '2px solid #f59e0b' : plan.addon ? '2px solid #60A5FA' : '1.5px solid var(--border)',
            background: 'white',
            boxShadow: plan.popular ? '0 8px 32px rgba(16,185,129,0.15)' : plan.best ? '0 8px 32px rgba(245,158,11,0.15)' : plan.addon ? '0 8px 32px rgba(139,92,246,0.15)' : '0 4px 16px rgba(0,0,0,0.1)',
          }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">{plan.name}</h4>
              {plan.popular && <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>Popular</span>}
              {plan.best && <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Best Value</span>}
              {plan.addon && <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #60A5FA, #2D8CFF)' }}>Add-on</span>}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-[var(--text-primary)]">{plan.price}</span>
              <span className="text-xs text-[var(--text-muted)]">{plan.period}</span>
            </div>
            {plan.subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{plan.subtitle}</p>}
            <ul className="mt-3 space-y-1.5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]"><span className="text-[var(--accent)] flex-shrink-0 mt-0.5">✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(priceId)}
              className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:opacity-90 ${plan.popular || plan.best || plan.addon ? 'text-white' : 'text-[var(--text-secondary)] border border-[var(--border)] hover:border-gray-400'}`}
              style={plan.popular ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)' } : plan.best ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : plan.addon ? { background: 'linear-gradient(135deg, #60A5FA, #2D8CFF)' } : {}}
            >
              {plan.addon ? 'Add Desktop App' : `Get ${plan.name}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function TopicDetail({
  activePage, selectedTopic, topicDetails, pageConfig,
  completedTopics, starredTopics, toggleComplete, toggleStar,
  showAskAI, setShowAskAI, aiQuestion, setAiQuestion, aiAnswer, aiLoading, handleAskAI,
  showRoadmap, setShowRoadmap, expandedTheoryQuestions, setExpandedTheoryQuestions,
  setSelectedTopic, generatingDiagram, diagramData, diagramError,
  diagramDetailLevel, setDiagramDetailLevel, diagramCloudProvider, setDiagramCloudProvider,
  generateDiagram, codingTopics, systemDesignTopics, systemDesigns, behavioralTopics, filteredTopics,
  progressInfo, isLocked = false, contentAccess,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.email === 'chundubabu@gmail.com';
  const [adminRegenStatus, setAdminRegenStatus] = useState('');

  if (!topicDetails) return null;

  const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

  // Admin: regenerate diagram via Python diagrams or Eraser API
  const handleAdminRegen = async (engine) => {
    const endpoint = engine === 'eraser' ? '/api/diagram/eraser' : '/api/diagram/generate';
    const question = `Design ${topicDetails.title}. ${topicDetails.description || topicDetails.subtitle || ''}`;
    setAdminRegenStatus(`${engine}: generating...`);
    try {
      const res = await fetch(`${CAPRA_API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          question,
          description: question,
          cloudProvider: diagramCloudProvider || 'auto',
          detailLevel: diagramDetailLevel || 'overview',
          direction: 'LR',
          cacheKey: question,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminRegenStatus(`${engine}: done! Reload to see.`);
        // Force refresh the static image by busting cache
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setAdminRegenStatus(`${engine}: ${data.error || 'failed'}`);
      }
    } catch (err) {
      setAdminRegenStatus(`${engine}: ${err.message}`);
    }
  };

  // Mark topic as read when viewing (only if not locked)
  useEffect(() => {
    if (!isLocked && contentAccess && activePage && selectedTopic) {
      contentAccess.markTopicRead(activePage, selectedTopic);
    }
  }, [selectedTopic, activePage, isLocked]);

  // Pages that use system-design-style rendering (concepts, keyQuestions, dataModel, etc.)
  const isSDStyle = ['system-design', 'microservices', 'databases'].includes(activePage);
  // SQL uses coding/DSA-style rendering (whenToUse, approach, commonProblems, etc.)
  const isCodingStyle = activePage === 'coding' || activePage === 'sql';

  // SD section accordion states
  const [sdExpandedQs, setSdExpandedQs] = useState({});
  const [sdAllQsExpanded, setSdAllQsExpanded] = useState(false);
  const [sdExpandedDPs, setSdExpandedDPs] = useState({});

  // Coding section accordion state
  const [codingAllQsExpanded, setCodingAllQsExpanded] = useState(false);

  // Coding code-example copy state
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);
  const [codeLanguage, setCodeLanguage] = useState('python');

  // Reset SD accordion state when topic changes
  useEffect(() => {
    setSdExpandedQs({});
    setSdAllQsExpanded(false);
    setSdExpandedDPs({});
  }, [selectedTopic]);

  // Prev/Next topic navigation
  const currentIndex = filteredTopics?.findIndex(t => t.id === selectedTopic) ?? -1;
  const prevTopic = currentIndex > 0 ? filteredTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex >= 0 && currentIndex < (filteredTopics?.length || 0) - 1 ? filteredTopics[currentIndex + 1] : null;

  return (
    <div className="landing-root animate-fade-in">
      {/* Topic Header — no duplicate breadcrumb */}
      <div className="rounded-xl p-3 mb-3 border border-[var(--border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setSelectedTopic(null)} className="text-xs text-[var(--accent)] font-medium transition-colors">← Back to {pageConfig.title}</button>
          <div className="flex items-center gap-1">
            {currentIndex >= 0 && filteredTopics && <span className="text-[var(--text-muted)] text-[10px] mr-2" style={{ fontFamily: 'var(--font-mono)' }}>{currentIndex + 1}/{filteredTopics.length}</span>}
            <button onClick={() => prevTopic && setSelectedTopic(prevTopic.id)} disabled={!prevTopic} className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] disabled:opacity-30 transition-colors"><Icon name="chevronLeft" size={16} /></button>
            <button onClick={() => nextTopic && setSelectedTopic(nextTopic.id)} disabled={!nextTopic} className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] disabled:opacity-30 transition-colors"><Icon name="chevronRight" size={16} /></button>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {getCompanyLogoSrc(selectedTopic) ? (
            <CompanyLogo topicId={selectedTopic} size={48} />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${topicDetails.color}10` }}
            >
              <Icon name={topicDetails.icon} size={28} style={{ color: topicDetails.color }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--text-primary)] landing-display">{topicDetails.title}</h1>
              {topicDetails.isNew && <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold">NEW</span>}
              {topicDetails.difficulty && (
                <span className={`text-[10px] landing-mono px-1.5 py-0.5 rounded border ${
                  topicDetails.difficulty === 'Easy' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' :
                  topicDetails.difficulty === 'Medium' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {topicDetails.difficulty}
                </span>
              )}
              {topicDetails.questions && (
                <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                  {topicDetails.questions} problems
                </span>
              )}
              {/* Design in App button for system design topics */}
              {isSDStyle && (
                <Link
                  to={`/capra?problem=${encodeURIComponent(`Design ${topicDetails.title}. ${topicDetails.description || topicDetails.subtitle || ''}`)}&mode=system-design&autosolve=true`}
                  className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)]/100 text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2 flex-shrink-0 landing-body"
                >
                  <Icon name="zap" size={14} />
                  Design
                </Link>
              )}
            </div>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed landing-body">{topicDetails.description}</p>
            {topicDetails.subtitle && !topicDetails.difficulty && (
              <p className="text-[var(--text-muted)] text-sm mt-1 landing-body">{topicDetails.subtitle}</p>
            )}
            {/* Behavioral meta badges — reading time, question count, tips count */}
            {(activePage === 'behavioral' || activePage === 'low-level' || isSDStyle) && (
              <div className="flex items-center gap-3 mt-2.5">
                {topicDetails.keyQuestions && (
                  <span className="flex items-center gap-1 text-[10px] landing-mono text-[var(--text-muted)]">
                    <Icon name="messageSquare" size={10} />
                    {topicDetails.keyQuestions.length} questions
                  </span>
                )}
                {topicDetails.tips && (
                  <span className="flex items-center gap-1 text-[10px] landing-mono text-[var(--text-muted)]">
                    <Icon name="lightbulb" size={10} />
                    {topicDetails.tips.length} tips
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] landing-mono text-[var(--text-muted)]">
                  <Icon name="clock" size={10} />
                  ~{Math.max(3, Math.ceil(((topicDetails.introduction || '').length + (topicDetails.keyQuestions || []).reduce((a, q) => a + (q.answer || '').length, 0)) / 1200))} min read
                </span>
                {topicDetails.starExample && (
                  <span className="flex items-center gap-1 text-[10px] landing-mono text-[var(--accent)]">
                    <Icon name="star" size={10} />
                    STAR example
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Toolbar with Progress ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg mb-2 bg-white border border-[var(--border)]">
        <div className="flex items-center gap-2">
          {/* Progress */}
          {progressInfo && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-[var(--border)]">
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                <circle cx="10" cy="10" r="8" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - progressInfo.percent / 100)}`}
                />
              </svg>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] landing-mono">{progressInfo.percent}%</span>
              <span className="text-[10px] text-[var(--text-muted)] landing-mono hidden sm:inline">{progressInfo.completed}/{progressInfo.total}</span>
            </div>
          )}
          {/* Mark as Complete */}
          <button
            onClick={() => toggleComplete(selectedTopic)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all landing-body ${completedTopics[selectedTopic] ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)]'}`}
          >
            <Icon name={completedTopics[selectedTopic] ? 'checkCircle' : 'check'} size={16} />
            <span className="hidden sm:inline">{completedTopics[selectedTopic] ? 'Completed' : 'Mark as Complete'}</span>
          </button>
          {/* Star */}
          <button
            onClick={() => toggleStar(selectedTopic)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm transition-all ${starredTopics[selectedTopic] ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)]'}`}
          >
            <Icon name={starredTopics[selectedTopic] ? 'star5' : 'star'} size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Ask AI */}
          <button
            onClick={() => setShowAskAI(!showAskAI)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all landing-body ${showAskAI ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] border border-[var(--border)]' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)]'}`}
          >
            <Icon name="sparkles" size={16} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
          {/* Course Roadmap — hide on tabs that ARE roadmaps/projects/blogs */}
          {activePage !== 'roadmaps' && activePage !== 'projects' && activePage !== 'eng-blogs' && (
            <button
              onClick={() => setShowRoadmap(!showRoadmap)}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-all landing-body"
            >
              <Icon name="compass" size={16} />
              <span className="hidden sm:inline">Roadmap</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LOCKED CONTENT — show ~40% preview then paywall ── */}
      {isLocked && (
        <div className="relative">
          {/* Preview: full introduction */}
          {topicDetails.introduction && (
            <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white mb-3">
              <div className="px-3 py-1.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="book" size={14} className="text-white" />
                <h2 className="text-sm font-bold text-white landing-display">Introduction</h2>
              </div>
              <div className="p-3">
                <div className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed">
                  <FormattedContent content={topicDetails.introduction} color="blue" />
                </div>
              </div>
            </div>
          )}

          {/* Preview: key concepts */}
          {topicDetails.concepts && topicDetails.concepts.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white mb-3">
              <div className="px-3 py-1.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="puzzle" size={14} className="text-white" />
                <h2 className="text-sm font-bold text-white landing-display">Key Concepts</h2>
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {topicDetails.concepts.map((concept, i) => (
                  <span key={i} className="px-2.5 py-1.5 rounded-lg text-xs landing-mono font-medium" style={{ background: `${topicDetails.color || '#10b981'}12`, color: topicDetails.color || '#10b981', border: `1px solid ${topicDetails.color || '#10b981'}20` }}>
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preview: first 40% of questions */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (() => {
            const previewCount = Math.max(2, Math.ceil(topicDetails.keyQuestions.length * 0.4));
            const previewQuestions = topicDetails.keyQuestions.slice(0, previewCount);
            return (
              <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white mb-3">
                <div className="px-3 py-1.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                  <Icon name="helpCircle" size={14} className="text-white" />
                  <h2 className="text-sm font-bold text-white landing-display">Key Questions</h2>
                  <span className="text-[10px] text-white/80 ml-1">({previewCount} of {topicDetails.keyQuestions.length})</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {previewQuestions.map((qa, i) => (
                    <div key={i} className="px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-[var(--text-secondary)]">{i + 1}</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{qa.question}</span>
                      </div>
                      {i === 0 && qa.answer && (
                        <div className="mt-2 ml-7 text-sm text-[var(--text-secondary)] leading-relaxed">
                          <FormattedContent content={qa.answer} color="blue" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Fade-out + paywall */}
          <div className="relative rounded-xl overflow-hidden">
            <div className="space-y-3 filter blur-sm pointer-events-none select-none" aria-hidden="true">
              <div className="rounded-lg bg-[var(--bg-elevated)] h-20 w-full" />
              <div className="rounded-lg bg-[var(--bg-elevated)] h-28 w-full" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, transparent 0%, var(--bg-app) 40%)' }}>
              <div className="max-w-2xl w-full px-4">
                <div className="text-center mb-5">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6, #60A5FA)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 landing-display">Upgrade to unlock all topics</h3>
                  <p className="text-xs text-[var(--text-muted)] landing-body">Choose a plan to access {activePage === 'coding' ? '36+' : activePage === 'system-design' ? '300+' : '50+'} topics with full content</p>
                </div>
                <PricingCards navigate={navigate} getAuthHeaders={getAuthHeaders} activePage={activePage} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UNLOCKED CONTENT ── */}
      {!isLocked && showAskAI && (
        <div className="p-3 rounded-xl mb-2 bg-[var(--accent)]/10/50 border border-[var(--accent)]/20">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="sparkles" size={16} className="text-[var(--text-primary)]" />
            <span className="text-[var(--text-primary)] font-semibold text-sm landing-display">Ask AI about {topicDetails.title}</span>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder={`Ask anything about ${topicDetails.title}...`}
              className="flex-1 px-3 py-2.5 rounded-lg text-sm text-[var(--text-primary)] placeholder-gray-500 focus:outline-none border border-[var(--border)] bg-white focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]/50 landing-body"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={aiLoading || !aiQuestion.trim()}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)]/100 text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all landing-body"
            >
              {aiLoading ? <Icon name="loader" size={16} className="animate-spin" /> : 'Ask'}
            </button>
          </div>
          {aiAnswer && (
            <div className="p-4 rounded-lg bg-[var(--bg-elevated)]">
              <FormattedContent content={aiAnswer} color="purple" />
            </div>
          )}
        </div>
      )}

      {/* Course Roadmap Panel */}
      {!isLocked && showRoadmap && (
        <div className="p-3 rounded-xl mb-2 bg-[var(--bg-elevated)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="compass" size={16} className="text-[var(--text-primary)]" />
            <span className="text-[var(--text-primary)] font-semibold text-sm landing-display">Course Roadmap — {pageConfig.title}</span>
          </div>
          <div className="grid  gap-1">
            {(isCodingStyle ? (filteredTopics || codingTopics) : isSDStyle ? (filteredTopics || []) : activePage === 'low-level' ? (filteredTopics || []) : behavioralTopics).map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTopic(t.id); setShowRoadmap(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all landing-body ${t.id === selectedTopic ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
              >
                <span className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold landing-mono ${completedTopics[t.id] ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                  {completedTopics[t.id] ? '✓' : i + 1}
                </span>
                <span className="flex-1">{t.title}</span>
                {starredTopics[t.id] && <Icon name="star5" size={12} className="text-[var(--text-primary)]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engineering Blog Detail */}
      {!isLocked && activePage === 'eng-blogs' && (
        <div className="space-y-3">
          {/* Overview */}
          {topicDetails.introduction && (
            <div id="overview" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]" style={{ background: 'white' }}>
              <div className="px-4 py-2.5 border-b border-[var(--border)] bg-white flex items-center gap-2">
                <Icon name="bookOpen" size={14} style={{ color: topicDetails.color || '#ef4444' }} />
                <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{topicDetails.title}</h3>
                <span className="text-[10px] landing-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{topicDetails.articles?.length || topicDetails.questions} articles</span>
              </div>
              <div className="p-4">
                <div className="text-[15px] leading-relaxed text-[var(--text-secondary)] landing-body">
                  <FormattedContent content={topicDetails.introduction} color="red" />
                </div>
                {topicDetails.blogUrl && (
                  <a href={topicDetails.blogUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-[var(--text-secondary)] hover:underline landing-body">
                    <Icon name="externalLink" size={12} />
                    Visit Engineering Blog
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Articles List */}
          {topicDetails.articles && topicDetails.articles.length > 0 && (
            <div id="articles" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="list" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Articles</h3>
                <span className="text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded">{topicDetails.articles.length}</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.articles.map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)]/80 transition-colors group"
                  >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold landing-mono" style={{ background: `${topicDetails.color || '#ef4444'}15`, color: topicDetails.color || '#ef4444' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--text-secondary)] transition-colors landing-display line-clamp-2">{article.title}</span>
                    </div>
                    <Icon name="externalLink" size={12} className="text-gray-300 group-hover:text-[var(--accent)] shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="lightbulb" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Key Takeaways</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.keyQuestions.map((qa, i) => (
                  <div key={i} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [`eb-${i}`]: !prev[`eb-${i}`] }))}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[var(--text-secondary)] landing-mono">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-[var(--text-primary)] landing-display">{qa.question}</span>
                      <Icon name={expandedTheoryQuestions[`eb-${i}`] ? 'chevronUp' : 'chevronDown'} size={14} className="text-[var(--text-muted)] mt-1 shrink-0" />
                    </button>
                    {expandedTheoryQuestions[`eb-${i}`] && (
                      <div className="mt-2 ml-9 text-sm text-[var(--text-secondary)] landing-body leading-relaxed">
                        <FormattedContent content={qa.answer} color="amber" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roadmap Detail */}
      {!isLocked && activePage === 'roadmaps' && (
        <div className="space-y-3">
          {/* Overview */}
          {topicDetails.introduction && (
            <div id="overview" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]" style={{ background: 'white' }}>
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="trendingUp" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Overview</h3>
                <span className="text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded">{topicDetails.phases?.length || 0} phases</span>
                <span className="text-[10px] landing-mono text-white/80">{topicDetails.phases?.reduce((a, p) => a + p.topics.length, 0) || 0} topics total</span>
              </div>
              <div className="p-4">
                <div className="text-[15px] leading-relaxed text-[var(--text-secondary)] landing-body">
                  <FormattedContent content={topicDetails.introduction} color="amber" />
                </div>
              </div>
            </div>
          )}

          {/* Visual Roadmap — dark spine with branching topics */}
          {topicDetails.phases && topicDetails.phases.length > 0 && (
            <div id="roadmap-phases" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="layers" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">{topicDetails.title} Roadmap</h3>
                <span className="text-[10px] landing-mono text-white/80">{topicDetails.phases.length} phases, {topicDetails.phases.reduce((a, p) => a + p.topics.length, 0)} topics</span>
              </div>

              {/* Horizontal flow — phase badges connected by arrows */}
              <div className="px-4 py-4 border-b border-[var(--border)] overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                  {topicDetails.phases.map((phase, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <a href={`#phase-${i}`} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white whitespace-nowrap landing-display hover:opacity-90 transition-opacity" style={{ background: phase.color }}>
                        {phase.title}
                      </a>
                      {i < topicDetails.phases.length - 1 && (
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase detail cards */}
              <div className="p-4 space-y-3">
                {topicDetails.phases.map((phase, phaseIdx) => (
                  <div key={phaseIdx} id={`phase-${phaseIdx}`} className="rounded-xl border-2 overflow-hidden scroll-mt-24" style={{ borderColor: `${phase.color}30` }}>
                    <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: `${phase.color}10` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: phase.color }}>
                        {phaseIdx + 1}
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)] landing-display flex-1">{phase.title}</h4>
                      <span className="text-[10px] landing-mono text-[var(--text-muted)]">{phase.topics.length} topics</span>
                    </div>
                    <div className="px-4 py-3 bg-white flex flex-wrap gap-2">
                      {phase.topics.map((topic, tIdx) => (
                        <span key={tIdx} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium landing-body" style={{ borderColor: `${phase.color}25`, background: `${phase.color}06` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: phase.color }} />
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Questions / FAQ */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="messageSquare" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">FAQ</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.keyQuestions.map((qa, i) => (
                  <div key={i} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [`rm-${i}`]: !prev[`rm-${i}`] }))}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[var(--text-secondary)] landing-mono">
                        Q
                      </span>
                      <span className="flex-1 text-sm font-semibold text-[var(--text-primary)] landing-display">{qa.question}</span>
                      <Icon name={expandedTheoryQuestions[`rm-${i}`] ? 'chevronUp' : 'chevronDown'} size={14} className="text-[var(--text-muted)] mt-1 shrink-0" />
                    </button>
                    {expandedTheoryQuestions[`rm-${i}`] && (
                      <div className="mt-2 ml-9 text-sm text-[var(--text-secondary)] landing-body leading-relaxed">
                        <FormattedContent content={qa.answer} color="amber" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Project Detail */}
      {!isLocked && activePage === 'projects' && (
        <div className="space-y-3">
          {/* Header: Difficulty + Tech Stack + Time */}
          <div id="overview" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]" style={{ background: 'white' }}>
            <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
              <Icon name="code" size={14} className="text-white" />
              <h3 className="text-sm font-bold text-white landing-display">Project Overview</h3>
            </div>
            <div className="p-4">
              {/* Difficulty + Time badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`text-xs landing-mono px-2 py-1 rounded-full font-bold ${
                  topicDetails.difficulty === 'beginner' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' :
                  topicDetails.difficulty === 'intermediate' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' :
                  'bg-red-500/10 text-red-400'
                }`}>{topicDetails.difficulty}</span>
                {topicDetails.estimatedTime && (
                  <span className="text-xs landing-mono text-[var(--text-muted)] flex items-center gap-1">
                    <Icon name="clock" size={12} />
                    {topicDetails.estimatedTime}
                  </span>
                )}
              </div>
              {/* Tech Stack */}
              {topicDetails.techStack && (
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {topicDetails.techStack.map(tech => (
                    <span key={tech} className="text-xs landing-mono px-2 py-1 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]">{tech}</span>
                  ))}
                </div>
              )}
              {/* Introduction */}
              <div className="text-[15px] leading-relaxed text-[var(--text-secondary)] landing-body">
                <FormattedContent content={topicDetails.introduction || topicDetails.description} color="purple" />
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          {topicDetails.learningObjectives && topicDetails.learningObjectives.length > 0 && (
            <div id="learning-objectives" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="check" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">What You'll Learn</h3>
              </div>
              <div className="p-4">
                <ul className="space-y-2.5">
                  {topicDetails.learningObjectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="check" size={10} className="text-[var(--accent)]" />
                      </span>
                      <span className="text-sm text-[var(--text-secondary)] landing-body leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Interview Relevance */}
          {topicDetails.interviewRelevance && (
            <div id="interview-relevance" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--accent)]/20 bg-[var(--accent)]/10/50">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="briefcase" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Interview Relevance</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-[var(--text-secondary)] landing-body leading-relaxed">{topicDetails.interviewRelevance}</p>
              </div>
            </div>
          )}

          {/* Key Questions */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="messageSquare" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Key Questions</h3>
                <span className="text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded">{topicDetails.keyQuestions.length}</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.keyQuestions.map((qa, i) => (
                  <div key={i} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [i]: !prev[i] }))}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[var(--text-secondary)] landing-mono">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-[var(--text-primary)] landing-display">{qa.question}</span>
                      <Icon name={expandedTheoryQuestions[i] ? 'chevronUp' : 'chevronDown'} size={14} className="text-[var(--text-muted)] mt-1 shrink-0" />
                    </button>
                    {expandedTheoryQuestions[i] && (
                      <div className="mt-2 ml-9 text-sm text-[var(--text-secondary)] landing-body leading-relaxed">
                        <FormattedContent content={qa.answer} color="blue" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Tutorial — compact button only */}
          <div id="generate-tutorial" className="scroll-mt-24">
            <button
              onClick={() => handleAskAI(`Generate a complete step-by-step tutorial for building: ${topicDetails.title}\n\nTech stack: ${(topicDetails.techStack || []).join(', ')}\nDifficulty: ${topicDetails.difficulty}\nDescription: ${topicDetails.description}\n\nProvide:\n1. Project setup and file structure\n2. Each implementation step with complete code snippets\n3. Key architectural decisions and why\n4. Testing guidance\n5. Deployment instructions\n\nMake it practical and implementation-focused.`)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #10b981, #2D8CFF)', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
            >
              <Icon name="zap" size={14} />
              Generate Tutorial
            </button>
          </div>
        </div>
      )}

      {/* DSA Topic Detail */}
      {!isLocked && isCodingStyle && topicDetails.keyPatterns && (
        <div className="space-y-3">

          {/* 1. Overview / Introduction */}
          {topicDetails.introduction && (
            <div id="overview" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)]" style={{ background: 'white' }}>
              <div className="px-4 py-2.5 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="book" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Overview</h3>
              </div>
              <div className="p-4">
                <div className="text-[15px] leading-relaxed text-[var(--text-secondary)] landing-body">
                  <FormattedContent content={topicDetails.introduction} color="blue" />
                </div>
                {/* Key Insight callout */}
                {(() => {
                  const intro = topicDetails.introduction || '';
                  const insightMatch = intro.match(/\*\*Key Insight[:\s]*\*\*\s*(.+?)(?:\n|$)/i) || intro.match(/Key Insight:\s*(.+?)(?:\n|$)/i);
                  if (!insightMatch) return null;
                  return (
                    <div className="mt-4 flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <Icon name="lightbulb" size={16} className="text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)] landing-display mb-0.5">Key Insight</div>
                        <div className="text-sm text-[var(--text-primary)] leading-relaxed landing-body">{insightMatch[1].trim()}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 2. Key Patterns — what to recognize */}
          {topicDetails.keyPatterns && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white shadow-sm">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="puzzle" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Key Patterns</h3>
                <span className="ml-auto text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded-full">{topicDetails.keyPatterns.length}</span>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {topicDetails.keyPatterns.map((pattern, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium landing-mono border hover:shadow-sm transition-shadow" style={{ background: `${topicDetails.color || '#10b981'}10`, color: topicDetails.color || '#10b981', borderColor: `${topicDetails.color || '#10b981'}30` }}>
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. When to Use — when to apply */}
          {topicDetails.whenToUse && (
            <div id="when-to-use" className="rounded-xl overflow-hidden border border-[var(--border)] bg-white shadow-sm scroll-mt-24">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="target" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">When to Use</h3>
                <span className="ml-auto text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded-full">{topicDetails.whenToUse.length}</span>
              </div>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.whenToUse.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-all landing-body">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="check" size={10} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Visual Explanation — see it */}
          {topicDetails.visualizations && topicDetails.visualizations.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="image" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Visual Explanation</h3>
                <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded bg-white/20 text-white">{topicDetails.visualizations.length}</span>
              </div>
              <div className={`p-4 grid gap-4 ${topicDetails.visualizations.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {topicDetails.visualizations.map((viz, vi) => (
                  <div key={vi} className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
                      <h4 className="text-xs font-semibold text-[var(--text-secondary)] landing-display">{viz.title}</h4>
                      {viz.description && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 landing-body">{viz.description}</p>}
                    </div>
                    <div className="p-3 flex justify-center items-center bg-white" dangerouslySetInnerHTML={{ __html: viz.svg }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Step-by-Step Approach — how to solve */}
          {topicDetails.approach && (
            <div id="approach" className="rounded-xl overflow-hidden border border-[var(--border)] bg-white shadow-sm scroll-mt-24">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="list" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Step-by-Step Approach</h3>
                <span className="ml-auto text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded-full">{topicDetails.approach.length}</span>
              </div>
              <div className="p-4">
                <div className="relative">
                  {topicDetails.approach.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 relative">
                      {i < topicDetails.approach.length - 1 && (
                        <div className="absolute left-[11px] top-6 w-0.5 bg-[var(--accent)]/30" style={{ height: 'calc(100% - 4px)' }} />
                      )}
                      <div className="w-6 h-6 rounded-full bg-[var(--accent)]/100 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 z-10 landing-mono">{i + 1}</div>
                      <div className="text-sm text-[var(--text-secondary)] leading-relaxed pb-4 landing-body">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. Time + Space Complexity — know the tradeoffs */}
          {(topicDetails.timeComplexity || topicDetails.spaceComplexity) && (
            <div className="grid grid-cols-2 gap-3">
              {topicDetails.timeComplexity && (
                <div className="rounded-xl overflow-hidden bg-white border border-[var(--border)] shadow-sm flex">
                  <div className="w-1 bg-[var(--accent)] flex-shrink-0" />
                  <div className="p-3 flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="clock" size={16} className="text-[var(--accent)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--accent)] landing-mono tracking-widest uppercase mb-1">Time</div>
                      <div className="text-[16px] font-bold text-[var(--text-primary)] font-mono landing-mono">{topicDetails.timeComplexity}</div>
                    </div>
                  </div>
                </div>
              )}
              {topicDetails.spaceComplexity && (
                <div className="rounded-xl overflow-hidden bg-white border border-[var(--border)] shadow-sm flex">
                  <div className="w-1 bg-[var(--accent)] flex-shrink-0" />
                  <div className="p-3 flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="layers" size={16} className="text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-secondary)] landing-mono tracking-widest uppercase mb-1">Space</div>
                      <div className="text-[16px] font-bold text-[var(--text-primary)] font-mono landing-mono">{topicDetails.spaceComplexity}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Code Examples — see the implementation */}
          {topicDetails.codeExample && (
            <div id="code-examples" className="rounded-xl overflow-hidden border border-[var(--border)] shadow-sm scroll-mt-24">
              <div className="px-4 py-2.5 bg-[#1e1e2e] flex items-center gap-2">
                <Icon name="code" size={14} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[#e2e8f0] landing-display">Code Example</h3>
                <span className="text-[10px] landing-mono text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-700/50 ml-1">Python</span>
                <button
                  className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1"
                  onClick={() => { navigator.clipboard.writeText(topicDetails.codeExample); setCopiedCodeIdx('single'); setTimeout(() => setCopiedCodeIdx(null), 2000); }}
                >
                  <Icon name={copiedCodeIdx === 'single' ? 'check' : 'copy'} size={12} className={copiedCodeIdx === 'single' ? 'text-[var(--accent)]' : ''} />
                  {copiedCodeIdx === 'single' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="bg-[#1e1e2e] overflow-x-auto">
                <pre className="text-sm landing-mono leading-6 p-4">
                  {topicDetails.codeExample.split('\n').map((line, idx) => (
                    <div key={idx} className="flex">
                      <span className="w-8 text-right pr-4 text-[var(--text-secondary)] select-none text-xs flex-shrink-0">{idx + 1}</span>
                      <span className="text-[#e2e8f0]" dangerouslySetInnerHTML={{ __html: highlightCodeLine(line) }} />
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          )}

          {/* Multiple Code Examples with Language Tabs */}
          {topicDetails.codeExamples && topicDetails.codeExamples.length > 0 && (() => {
            // Group examples by title for language tabs
            const grouped = {};
            topicDetails.codeExamples.forEach((ex, i) => {
              const key = ex.title || `Example ${i + 1}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push({ ...ex, _idx: i });
            });
            return (
              <div className="space-y-3 scroll-mt-24">
                {Object.entries(grouped).map(([title, examples], gi) => {
                  const hasMultipleLangs = examples.length > 1 && examples.some(e => e.language);
                  const activeEx = hasMultipleLangs ? (examples.find(e => e.language === (codeLanguage || 'python')) || examples[0]) : examples[0];
                  return (
                    <div key={gi} className="rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
                      <div className="px-4 py-2.5 bg-[#1e1e2e] flex items-center gap-2">
                        <Icon name="code" size={14} className="text-[var(--accent)]" />
                        <h3 className="text-sm font-bold text-[#e2e8f0] landing-display truncate">{title}</h3>
                        {hasMultipleLangs ? (
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            {examples.map((ex) => {
                              const lang = ex.language || 'python';
                              const isActive = lang === (codeLanguage || 'python');
                              const langColors = { python: 'blue', javascript: 'yellow', java: 'orange', cpp: 'purple', typescript: 'cyan' };
                              const c = langColors[lang] || 'gray';
                              return (
                                <button key={lang} onClick={() => setCodeLanguage(lang)}
                                  className={`text-[10px] landing-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer ${isActive ? `text-${c}-300 bg-${c}-900/50 border-${c}-700/50` : 'text-[var(--text-muted)] bg-transparent border-gray-700 hover:text-gray-300'}`}
                                  style={isActive ? { color: c === 'yellow' ? '#fde68a' : undefined, background: c === 'yellow' ? 'rgba(161,98,7,0.3)' : undefined } : {}}
                                >{lang.charAt(0).toUpperCase() + lang.slice(1)}</button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] landing-mono text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-700/50 ml-1 flex-shrink-0">{activeEx.language || 'Python'}</span>
                        )}
                        <button
                          className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1 flex-shrink-0"
                          onClick={() => { navigator.clipboard.writeText(activeEx.code); setCopiedCodeIdx(activeEx._idx); setTimeout(() => setCopiedCodeIdx(null), 2000); }}
                        >
                          <Icon name={copiedCodeIdx === activeEx._idx ? 'check' : 'copy'} size={12} className={copiedCodeIdx === activeEx._idx ? 'text-[var(--accent)]' : ''} />
                          {copiedCodeIdx === activeEx._idx ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      {activeEx.description && (
                        <div className="px-4 py-2 bg-[#252536] border-t border-[#2e2e44]">
                          <p className="text-xs text-[var(--text-muted)] landing-body">{activeEx.description}</p>
                        </div>
                      )}
                      <div className="bg-[#1e1e2e] overflow-x-auto">
                        <pre className="text-sm landing-mono leading-6 p-4">
                          {activeEx.code.split('\n').map((line, idx) => (
                            <div key={idx} className="flex">
                              <span className="w-8 text-right pr-4 text-[var(--text-secondary)] select-none text-xs flex-shrink-0">{idx + 1}</span>
                              <span className="text-[#e2e8f0]" dangerouslySetInnerHTML={{ __html: highlightCodeLine(line) }} />
                            </div>
                          ))}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 8. Common Mistakes — avoid pitfalls */}
          {topicDetails.commonMistakes && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white shadow-sm">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="alertTriangle" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Common Mistakes</h3>
                <span className="ml-auto text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded-full">{topicDetails.commonMistakes.length}</span>
              </div>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.commonMistakes.map((mistake, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15 hover:shadow-md hover:border-red-500/30 transition-all">
                    <span className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-500 text-xs font-bold leading-none">&#10005;</span>
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body">{mistake}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Practice Problems — self practice */}
          {topicDetails.commonProblems && (
            <div id="practice" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white shadow-sm">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="code" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Practice Problems</h3>
                <span className="ml-auto text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded-full">{topicDetails.commonProblems.length}</span>
              </div>
              <div className="overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[32px_1fr_64px_72px] items-center px-3 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] landing-mono uppercase tracking-wider">
                  <span>#</span>
                  <span>Problem</span>
                  <span className="text-center">Diff.</span>
                  <span className="text-center">Action</span>
                </div>
                {topicDetails.commonProblems.map((problem, i) => {
                  const problemName = typeof problem === 'string' ? problem : problem.name;
                  const slug = generateSlug(problemName);
                  const problemData = getProblemBySlug(slug);
                  const difficulty = typeof problem === 'object' ? problem.difficulty : (problemData?.difficulty || null);

                  const fullProblem = problemsFull[slug];
                  const problemText = fullProblem?.description || problemData?.description || `Solve: ${problemName}`;
                  const href = `/capra?problem=${encodeURIComponent(problemText)}&autosolve=true`;

                  return (
                    <Link
                      key={i}
                      to={href}
                      className={`grid grid-cols-[32px_1fr_64px_72px] items-center px-3 py-2.5 transition-colors cursor-pointer group hover:bg-[var(--accent)]/10/60 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} ${i < topicDetails.commonProblems.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}
                    >
                      <span className="text-xs text-[var(--text-muted)] landing-mono">{i + 1}</span>
                      <span className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors landing-body pr-2">{problemName}</span>
                      <span className="flex justify-center">
                        {difficulty ? (
                          <span className={`text-[10px] landing-mono px-1.5 py-0.5 rounded-full border font-medium ${
                            difficulty === 'Easy' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' :
                            difficulty === 'Medium' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>{difficulty}</span>
                        ) : <span className="text-gray-300 text-xs">--</span>}
                      </span>
                      <span className="flex justify-center">
                        <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-md group-hover:bg-[var(--accent)]/20 transition-colors landing-mono uppercase tracking-wide">Solve</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10. Theory Questions — deeper review */}
          {topicDetails.theoryQuestions && topicDetails.theoryQuestions.length > 0 && (
            <div id="theory" className="rounded-xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white shadow-sm">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="bookOpen" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Theory Questions</h3>
                <span className="text-[10px] landing-mono text-white bg-white/20 px-1.5 py-0.5 rounded-full">{topicDetails.theoryQuestions.length}</span>
                <button
                  className="ml-auto text-[10px] landing-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
                  onClick={() => {
                    const newVal = !codingAllQsExpanded;
                    setCodingAllQsExpanded(newVal);
                    const newState = {};
                    topicDetails.theoryQuestions.forEach((_, idx) => { newState[`${selectedTopic}-${idx}`] = newVal; });
                    setExpandedTheoryQuestions(prev => ({ ...prev, ...newState }));
                  }}
                >
                  {codingAllQsExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-1 gap-2">
                  {topicDetails.theoryQuestions.map((q, i) => {
                    const questionKey = `${selectedTopic}-${i}`;
                    const isExpanded = expandedTheoryQuestions[questionKey];
                    const borderColor = q.difficulty === 'Easy' ? 'border-l-green-400' : q.difficulty === 'Medium' ? 'border-l-amber-400' : q.difficulty === 'Hard' ? 'border-l-red-400' : 'border-l-blue-400';
                    return (
                      <div key={i} className={`rounded-lg overflow-hidden bg-white border border-[var(--border)] hover:border-[var(--border-hover,var(--border))] transition-all ${isExpanded ? `border-l-[3px] ${borderColor}` : ''}`}>
                        <button
                          onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !prev[questionKey] }))}
                          className="w-full flex items-center gap-2 p-3 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                        >
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] landing-mono bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold flex-shrink-0">{i + 1}</span>
                          <span className="text-[var(--text-primary)] text-sm font-medium flex-1 landing-body">{q.question}</span>
                          {q.difficulty && (
                            <span className={`text-[10px] landing-mono px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                              q.difficulty === 'Easy' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' :
                              q.difficulty === 'Medium' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>{q.difficulty}</span>
                          )}
                          <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && q.answer && (
                          <div className="px-3 pb-3 pt-1 border-t border-[var(--border)]">
                            <div className="pl-8 text-[var(--text-secondary)] text-sm leading-relaxed p-3 landing-body">
                              {q.answer}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 11. Tips & Interview Tips — final checklist */}
          {(topicDetails.tips || topicDetails.interviewTips) && (
            <div id="tips" className="rounded-xl overflow-hidden border border-[var(--border)] bg-white shadow-sm scroll-mt-24">
              <div className="px-4 py-2.5 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <Icon name="lightbulb" size={14} className="text-white" />
                <h3 className="text-sm font-bold text-white landing-display">Tips & Interview Checklist</h3>
                <span className="text-[10px] font-bold text-white bg-white/20 border border-white/30 px-1.5 py-0.5 rounded-full landing-mono ml-auto">PRO</span>
              </div>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.tips && topicDetails.tips.map((tip, i) => (
                  <div key={`tip-${i}`} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-all">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="check" size={10} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body">{tip}</span>
                  </div>
                ))}
                {topicDetails.interviewTips && topicDetails.interviewTips.map((tip, i) => (
                  <div key={`itip-${i}`} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-amber-50/50 transition-all">
                    <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="lightbulb" size={10} className="text-[var(--text-secondary)]" />
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Design / LLD Problem Detail — gated for locked topics */}
      {!isLocked && (isSDStyle || activePage === 'low-level') && (topicDetails.concepts || topicDetails.requirements || topicDetails.functionalRequirements || topicDetails.primitives || topicDetails.problems || topicDetails.structures || topicDetails.coreEntities || topicDetails.implementation) && (
        <div className="space-y-3">
          {/* Comprehensive System Design / LLD Problem Content */}
          {(topicDetails.requirements || topicDetails.functionalRequirements || topicDetails.introduction || topicDetails.concepts) && (
            <>
              {/* 1. Introduction — full width */}
              {topicDetails.introduction && (
                <div id="overview" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)]" style={{ background: 'white' }}>
                  <div className="px-4 py-2 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                    <Icon name="book" size={14} className="text-white" />
                    <h2 className="text-sm font-bold text-white landing-display">Introduction</h2>
                  </div>
                  <div className="p-5">
                    <div className="text-[var(--text-secondary)] text-[15px] leading-relaxed landing-body">
                      <FormattedContent content={topicDetails.introduction} color="blue" />
                    </div>
                    {/* Key challenge callout */}
                    {topicDetails.introduction && (
                      <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon name="lightbulb" size={16} className="text-[var(--text-secondary)]" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)] landing-display uppercase tracking-wider">Key Challenge</span>
                          <p className="text-sm text-[var(--text-primary)]/80 mt-0.5 leading-relaxed landing-body">
                            {topicDetails.introduction.split('.').filter(s => s.trim().length > 20).slice(-2, -1)[0]?.trim() || topicDetails.introduction.split('.').slice(0, 1)[0]?.trim()}.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Key Concepts — separate card below introduction */}
              {topicDetails.concepts && !topicDetails.concepts[0]?.name && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-4 py-2 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                    <Icon name="puzzle" size={14} className="text-white" />
                    <h2 className="text-sm font-bold text-white landing-display">Key Concepts</h2>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {topicDetails.concepts.map((concept, i) => (
                      <span key={i} className="px-2.5 py-1.5 rounded-lg text-xs landing-mono font-medium" style={{ background: `${topicDetails.color}12`, color: topicDetails.color, border: `1px solid ${topicDetails.color}20` }}>
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Requirements - Functional & Non-Functional — side-by-side grid */}
              {(topicDetails.functionalRequirements || topicDetails.requirements || topicDetails.nonFunctionalRequirements) && (
              <div id="requirements" className={`grid gap-2 scroll-mt-24 ${(topicDetails.functionalRequirements || topicDetails.requirements) && topicDetails.nonFunctionalRequirements ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Functional Requirements */}
                {(topicDetails.functionalRequirements || topicDetails.requirements) && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                  <div className="bg-[var(--accent)] border-b border-[var(--accent)] px-4 py-2 flex items-center gap-2">
                    <Icon name="check" size={14} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Functional Requirements</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{(topicDetails.functionalRequirements || topicDetails.requirements).length} requirements</span>
                  </div>
                  <div className="p-2.5">
                    <div className="grid grid-cols-1 gap-1.5">
                      {(topicDetails.functionalRequirements || topicDetails.requirements).map((req, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--accent)]/5 transition-all cursor-default">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-[var(--accent)]/15 text-[var(--accent)] mt-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </span>
                          <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                )}

                {/* Non-Functional Requirements */}
                {topicDetails.nonFunctionalRequirements && (
                  <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                    <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                      <Icon name="zap" size={14} className="text-white" />
                      <h3 className="text-sm font-bold text-white landing-display">Non-Functional Requirements</h3>
                      <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.nonFunctionalRequirements.length} requirements</span>
                    </div>
                    <div className="p-2.5">
                      <div className="grid grid-cols-1 gap-1.5">
                        {topicDetails.nonFunctionalRequirements.map((req, i) => {
                          // Extract metric-like values from the requirement text (e.g., "<3s", "99.9%", "1M")
                          const metricMatch = req.match(/([<>~]?\d+\.?\d*\s*(?:ms|s|%|M|K|GB|TB|MB|req\/s|QPS|RPS|rpm|tps)?)/i);
                          return (
                            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all cursor-default">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-gray-100 text-[var(--text-secondary)] mt-0.5">
                                  <Icon name="zap" size={10} className="text-[var(--text-secondary)]" />
                                </span>
                                <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed flex-1">{req}</span>
                              </div>
                              {metricMatch && (
                                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-primary)] landing-mono border border-[var(--border)]/60">
                                  {metricMatch[1].trim()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 4. Back-of-Envelope Estimation / Capacity Planning */}
              {topicDetails.estimation && (
                <CapacityPlanningGrid estimation={topicDetails.estimation} />
              )}

              {/* 5. Cloud Architecture Diagram — full width */}
              {isSDStyle && topicDetails && (
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white">
                  <div className="bg-[var(--accent)] border-b border-[var(--accent)] px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="layers" size={14} className="text-white" />
                      <h3 className="text-sm font-bold text-white landing-display">Architecture Diagram</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Cloud Provider Selector */}
                      <div className="flex items-center gap-1 mr-2 px-1 py-0.5 rounded-lg bg-[var(--bg-elevated)]">
                        {[
                          { id: 'aws', label: 'AWS', color: '#ff9900' },
                          { id: 'gcp', label: 'GCP', color: '#4285f4' },
                          { id: 'azure', label: 'Azure', color: '#0078d4' },
                        ].map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setDiagramCloudProvider(p.id);
                              generateDiagram(topicDetails.title || selectedTopic, diagramDetailLevel, p.id);
                            }}
                            className="px-2 py-0.5 text-xs font-medium rounded transition-all landing-mono"
                            style={{
                              background: diagramCloudProvider === p.id ? `${p.color}30` : 'transparent',
                              color: diagramCloudProvider === p.id ? p.color : '#9ca3af',
                              border: diagramCloudProvider === p.id ? `1px solid ${p.color}50` : '1px solid transparent',
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Admin-only: Regenerate controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[var(--border)]">
                        <button
                          onClick={() => handleAdminRegen('python')}
                          className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--accent)] transition-colors border border-[var(--border)]"
                          title="Regenerate using Python diagrams library"
                        >
                          Python
                        </button>
                        <button
                          onClick={() => handleAdminRegen('eraser')}
                          className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-blue-100 hover:text-blue-700 transition-colors border border-[var(--border)]"
                          title="Regenerate using Eraser.io API"
                        >
                          Eraser
                        </button>
                        {adminRegenStatus && (
                          <span className="text-[10px] font-mono font-bold" style={{ color: adminRegenStatus.includes('done') ? 'var(--success)' : adminRegenStatus.includes('fail') ? 'var(--danger)' : 'var(--text-primary)' }}>{adminRegenStatus}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {/* Show pre-generated static diagram if available, otherwise fall back to API */}
                    {(() => {
                      const staticSrc = `/diagrams/${selectedTopic}/eraser-${diagramCloudProvider}.png`;
                      return (
                        <StaticCloudDiagram
                          topicId={selectedTopic}
                          provider={diagramCloudProvider}
                          staticSrc={staticSrc}
                          diagramData={diagramData}
                          generatingDiagram={generatingDiagram}
                          diagramError={diagramError}
                          onGenerate={() => generateDiagram(topicDetails.title || selectedTopic, diagramDetailLevel, diagramCloudProvider)}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 6. Architecture Layers + Layered Design */}
              {topicDetails.architectureLayers && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="layers" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Architecture Layers</h3>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {topicDetails.architectureLayers.map((layer, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-[var(--border)]">
                        <span className="w-6 h-6 rounded-md bg-[rgba(45,140,255,0.08)] text-[var(--accent)] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <div>
                          <span className="text-sm font-bold text-[var(--text-primary)] landing-display">{layer.name}</span>
                          <div className="text-[var(--text-secondary)] text-xs landing-body leading-relaxed mt-0.5">
                            <FormattedContent content={layer.description} color="blue" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topicDetails.layeredDesign && (
                <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)]">
                  <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="layers" size={14} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Layered Design</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.layeredDesign.length} layers</span>
                  </div>
                  <div className="p-2.5 space-y-0">
                    {topicDetails.layeredDesign.map((layer, i) => {
                      const LAYER_COLORS = ['#10b981', '#3b82f6', '#60A5FA', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#2D8CFF'];
                      const lc = LAYER_COLORS[i % LAYER_COLORS.length];
                      return (
                        <div key={i} className="relative">
                          {i > 0 && (
                            <div className="flex justify-center -my-1 z-10 relative">
                              <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M8 0v10M4 6l4 4 4-4" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          )}
                          <div className="rounded-xl border border-[var(--border)] bg-white hover:border-[var(--border)] transition-all overflow-hidden">
                            <div className="px-4 py-3">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: lc }}>
                                  L{i + 1}
                                </span>
                                <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{layer.name}</h4>
                              </div>
                              <p className="text-[var(--text-secondary)] text-xs leading-relaxed ml-9 landing-body">{layer.purpose}</p>
                              {layer.components && (
                                <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                                  {layer.components.map((comp, j) => (
                                    <span key={j} className="text-[11px] font-medium px-2 py-0.5 rounded-md landing-mono" style={{ background: `${lc}12`, color: lc, border: `1px solid ${lc}30` }}>
                                      {comp}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. API Design + Data Model — side by side */}
              {(topicDetails.apiDesign?.endpoints || topicDetails.dataModel) && (
                <div className={`grid gap-3 scroll-mt-24 ${topicDetails.apiDesign?.endpoints && topicDetails.dataModel ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* API Design — Stripe-style endpoint cards */}
                  {topicDetails.apiDesign && topicDetails.apiDesign.endpoints && (
                    <div id="api-design" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
                      <div className="bg-[var(--accent)] border-b border-[var(--accent)] px-4 py-2 flex items-center gap-2">
                        <Icon name="code" size={14} className="text-white" />
                        <h3 className="text-sm font-bold text-white landing-display">API Design</h3>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.apiDesign.endpoints.length} endpoints</span>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-1 gap-2">
                          {topicDetails.apiDesign.endpoints.map((endpoint, i) => (
                            <div key={i} className="rounded-xl p-3.5 border border-[var(--border)] hover:shadow-md hover:border-[var(--border-hover,var(--border))] hover:-translate-y-0.5 transition-all">
                              <div className="flex items-center gap-2.5 mb-2">
                                <span className={`text-[11px] landing-mono px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                                  endpoint.method === 'GET' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' :
                                  endpoint.method === 'POST' || endpoint.method === 'INSERT' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]' :
                                  endpoint.method === 'PUT' || endpoint.method === 'UPDATE' ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>{endpoint.method}</span>
                                <code className="text-[var(--text-primary)] landing-mono text-sm font-medium">{endpoint.path}</code>
                              </div>
                              {endpoint.description && (
                                <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>{endpoint.description}</p>
                              )}
                              <div className="hidden">
                              </div>
                              {endpoint.response && (
                                <div className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2 overflow-x-auto">
                                  <code className="text-xs landing-mono text-[var(--text-secondary)] whitespace-pre-wrap leading-5">{endpoint.response}</code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Model — structured schema presentation */}
                  {topicDetails.dataModel && (
                    <DataModelSection schema={topicDetails.dataModel.schema} />
                  )}
                </div>
              )}

              {/* 8. Basic + Advanced Implementation + Algorithm Approaches */}
              {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
                <div id="architecture" className={`grid gap-2 scroll-mt-24 ${topicDetails.basicImplementation && topicDetails.advancedImplementation ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Basic Implementation */}
                  {topicDetails.basicImplementation && (
                    <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                      <div className="border-b border-[var(--accent)] px-4 py-2 flex items-center gap-2 bg-[var(--accent)]">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider landing-mono">Basic</span>
                        <h3 className="text-sm font-bold text-white landing-display">{topicDetails.basicImplementation.title || 'Basic Approach'}</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed landing-body">{topicDetails.basicImplementation.description}</p>
                        {topicDetails.basicImplementation.svgTemplate && (
                          <DiagramSVG
                            template={topicDetails.basicImplementation.svgTemplate}
                            className="mb-3"
                          />
                        )}
                        {topicDetails.basicImplementation.architecture && !topicDetails.basicImplementation.svgTemplate && (
                          <div className="rounded-xl overflow-hidden mb-3 border border-[var(--border)]">
                            <div className="px-3 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center gap-2">
                              <Icon name="layers" size={12} className="text-[var(--text-muted)]" />
                              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider landing-mono">Architecture</span>
                            </div>
                            <div className="bg-[#0d1117] overflow-x-auto">
                              <pre
                                className="p-4 text-sm leading-6 text-gray-300 landing-mono"
                                style={{ whiteSpace: 'pre', margin: 0, tabSize: 4 }}
                              >
                                {topicDetails.basicImplementation.architecture}
                              </pre>
                            </div>
                          </div>
                        )}
                        {topicDetails.basicImplementation.problems && (
                          <div>
                            <h4 className="text-[var(--text-primary)] text-xs font-bold mb-2 flex items-center gap-2 landing-display uppercase tracking-wider">
                              <Icon name="alertTriangle" size={12} className="text-red-500" />
                              Issues
                            </h4>
                            <div className="grid grid-cols-1 gap-1.5">
                              {topicDetails.basicImplementation.problems.map((problem, i) => (
                                <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/15 text-sm landing-body">
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/15 mt-0.5">
                                    <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </span>
                                  <span className="text-[var(--text-secondary)]">{problem}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Implementation */}
                  {topicDetails.advancedImplementation && (
                    <div className="rounded-2xl overflow-hidden border border-[var(--accent)]/20 bg-white">
                      <div className="border-b border-[var(--accent)] px-4 py-2 flex items-center gap-2 bg-[var(--accent)]">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider landing-mono">Advanced</span>
                        <h3 className="text-sm font-bold text-white landing-display">{topicDetails.advancedImplementation.title || 'Scalable Solution'}</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed landing-body">{topicDetails.advancedImplementation.description}</p>
                        {topicDetails.advancedImplementation.svgTemplate && (
                          <DiagramSVG
                            template={topicDetails.advancedImplementation.svgTemplate}
                            className="mb-3"
                          />
                        )}
                        {topicDetails.advancedImplementation.architecture && !topicDetails.advancedImplementation.svgTemplate && (
                          <div className="rounded-xl overflow-hidden mb-3 border border-[var(--accent)]/20">
                            <div className="px-3 py-1.5 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 flex items-center gap-2">
                              <Icon name="zap" size={12} className="text-[var(--accent)]" />
                              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider landing-mono">Architecture</span>
                            </div>
                            <div className="bg-[var(--bg-elevated)] overflow-x-auto border-[var(--border)]">
                              <pre
                                className="p-4 text-sm leading-7 text-[var(--accent)] landing-mono"
                                style={{ whiteSpace: 'pre', margin: 0, tabSize: 4 }}
                              >
                                {topicDetails.advancedImplementation.architecture}
                              </pre>
                            </div>
                          </div>
                        )}
                        {topicDetails.advancedImplementation.keyPoints && (
                          <div className="mb-3">
                            <h4 className="text-[var(--text-primary)] text-xs font-bold mb-2 landing-display uppercase tracking-wider">Key Points</h4>
                            <div className="grid grid-cols-1 gap-1.5">
                              {topicDetails.advancedImplementation.keyPoints.map((point, i) => (
                                <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[var(--accent)]/10/50 border border-[var(--accent)]/20 text-sm landing-body">
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--accent)]/15 mt-0.5">
                                    <svg className="w-2.5 h-2.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  </span>
                                  <span className="text-[var(--text-secondary)]">{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(topicDetails.advancedImplementation.databaseChoice || topicDetails.advancedImplementation.caching) && (
                          <div className="flex flex-wrap gap-2">
                            {topicDetails.advancedImplementation.databaseChoice && (
                              <span className="text-[10px] landing-mono px-2 py-1 rounded-lg border bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 font-semibold">
                                DB: {topicDetails.advancedImplementation.databaseChoice}
                              </span>
                            )}
                            {topicDetails.advancedImplementation.caching && (
                              <span className="text-[10px] landing-mono px-2 py-1 rounded-lg border bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 font-semibold">
                                Cache: {topicDetails.advancedImplementation.caching}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Algorithm Approaches */}
              {topicDetails.algorithmApproaches && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="zap" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Algorithm Approaches</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.algorithmApproaches.map((app, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[var(--border)]">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1 landing-display">{i + 1}. {app.name}</h4>
                        <div className="text-[var(--text-secondary)] text-xs mb-2 landing-body leading-relaxed">
                          <FormattedContent content={app.description} color="amber" />
                        </div>
                        <div className="space-y-0.5">
                          {app.pros.map((p, j) => <div key={`p${j}`} className="text-xs text-[var(--text-secondary)] landing-body"><span className="text-[var(--accent)] font-bold mr-1">+</span>{p}</div>)}
                          {app.cons.map((c, j) => <div key={`c${j}`} className="text-xs text-[var(--text-secondary)] landing-body"><span className="text-[var(--text-muted)] font-bold mr-1">-</span>{c}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. System Flows (Create + Redirect) + Flowcharts */}
              {(topicDetails.createFlow || topicDetails.redirectFlow) && (
                <div className="grid grid-cols-1 gap-2">
                  {/* Create Flow */}
                  {topicDetails.createFlow && (
                    <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                      <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                        <Icon name="arrowRight" size={16} className="text-white" />
                        <h3 className="text-sm font-bold text-white landing-display">{topicDetails.createFlow.title}</h3>
                      </div>
                      <div className="p-3">
                        <ol className="grid grid-cols-1  gap-1">
                          {topicDetails.createFlow.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 rounded hover:bg-[var(--bg-elevated)] transition-colors">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--border)] landing-mono">
                                {i + 1}
                              </span>
                              <span className="text-[var(--text-muted)] text-sm landing-body">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Redirect Flow */}
                  {topicDetails.redirectFlow && (
                    <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                      <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                        <Icon name="arrowLeft" size={16} className="text-white" />
                        <h3 className="text-sm font-bold text-white landing-display">{topicDetails.redirectFlow.title}</h3>
                      </div>
                      <div className="p-3">
                        <ol className="grid grid-cols-1  gap-1">
                          {topicDetails.redirectFlow.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 rounded hover:bg-[var(--bg-elevated)] transition-colors">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--border)] landing-mono">
                                {i + 1}
                              </span>
                              <span className="text-[var(--text-muted)] text-sm landing-body">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Flowcharts / Process Diagrams */}
              {topicDetails.flowcharts && topicDetails.flowcharts.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {topicDetails.flowcharts.map((fc) => (
                    <FlowchartCard key={fc.id} flowchart={fc} />
                  ))}
                </div>
              )}

              {/* 10. Deep Dive Topics + System Components + Key Design Decisions */}
              {topicDetails.deepDiveTopics && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="search" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Deep Dive Topics</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1  gap-2">
                    {topicDetails.deepDiveTopics.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[rgba(45,140,255,0.04)] border border-[rgba(45,140,255,0.2)]">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1 landing-display">{item.topic}</h4>
                        <div className="text-[var(--text-secondary)] text-xs landing-body leading-relaxed">
                          <FormattedContent content={item.detail} color="blue" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Components & Decisions - Side by Side */}
              {(!topicDetails.introduction && topicDetails.components) || topicDetails.keyDecisions ? (
                <div className={`grid gap-2 ${(!topicDetails.introduction && topicDetails.components) && topicDetails.keyDecisions ? '' : 'grid-cols-1'}`}>
                  {/* System Components */}
                  {!topicDetails.introduction && topicDetails.components && (
                    <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                      <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                        <Icon name="layers" size={14} className="text-white" />
                        <h3 className="text-sm font-bold text-white landing-display">System Components</h3>
                      </div>
                      <div className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {topicDetails.components.map((comp, i) => (
                            <span key={i} className="text-[10px] landing-mono px-2 py-1 rounded-lg border bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 font-semibold">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Design Decisions — Numbered timeline cards */}
                  {topicDetails.keyDecisions && (
                    <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)]">
                      <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                        <Icon name="lightbulb" size={14} className="text-white" />
                        <h3 className="text-sm font-bold text-white landing-display">Key Design Decisions</h3>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.keyDecisions.length}</span>
                      </div>
                      <div className="p-3">
                        <div className="flex flex-nowrap gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                          {topicDetails.keyDecisions.map((decision, i) => (
                            <div key={i} className="flex-shrink-0 w-56 p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/20 hover:shadow-sm transition-all">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[var(--accent)]/100 text-white landing-mono">
                                  {i + 1}
                                </span>
                                <div className="h-px flex-1 bg-[var(--accent)]/30" />
                              </div>
                              <p className="text-[var(--text-secondary)] text-sm leading-relaxed landing-body">{decision}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* 11. Trade-offs + Edge Cases */}
              {topicDetails.tradeoffDecisions && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="gitBranch" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Trade-off Decisions</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1  gap-2">
                    {topicDetails.tradeoffDecisions.map((d, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[var(--border)]">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-secondary)] landing-mono">{d.choice}</span>
                          <span className="text-gray-300">→</span>
                          <span className="text-xs font-bold text-[var(--accent)] landing-mono">{d.picked}</span>
                        </div>
                        <div className="text-[var(--text-secondary)] text-xs landing-body leading-relaxed">
                          <FormattedContent content={d.reason} color="rose" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topicDetails.tradeoffs && (
                <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)]">
                  <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="gitBranch" size={14} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Tradeoffs</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.tradeoffs.length} decisions</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {topicDetails.tradeoffs.map((t, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border)] bg-white hover:border-[var(--border)] transition-all overflow-hidden">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--bg-elevated)] border border-amber-500/20">
                              <Icon name="gitBranch" size={12} className="text-[var(--text-secondary)]" />
                            </span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{t.decision}</h4>
                          </div>
                          <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="px-3 py-2 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider landing-mono">Pros</span>
                              <p className="text-[var(--accent)] text-xs leading-relaxed mt-0.5 landing-body">{t.pros}</p>
                            </div>
                            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-[var(--border)]">
                              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider landing-mono">Cons</span>
                              <p className="text-[var(--text-primary)] text-xs leading-relaxed mt-0.5 landing-body">{t.cons}</p>
                            </div>
                          </div>
                          {t.recommendation && (
                            <div className="ml-8 mt-2 flex items-start gap-1.5">
                              <Icon name="arrowRight" size={12} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-[var(--text-primary)] font-medium landing-body">{t.recommendation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topicDetails.edgeCases && (
                <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)]">
                  <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="alertTriangle" size={14} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Edge Cases</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.edgeCases.length} cases</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {topicDetails.edgeCases.map((ec, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border)] bg-white hover:border-red-500/30 transition-all overflow-hidden">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-500/10 border border-red-500/20">
                              <span className="text-[10px] font-bold text-red-400 landing-mono">{i + 1}</span>
                            </span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{ec.scenario}</h4>
                          </div>
                          <p className="text-[var(--text-secondary)] text-xs leading-relaxed ml-8 landing-body">{ec.impact}</p>
                          <div className="ml-8 mt-2 px-3 py-2 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                            <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider landing-mono">Mitigation</span>
                            <p className="text-[var(--accent)] text-xs leading-relaxed mt-0.5 landing-body">{ec.mitigation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. Discussion Points + Interview Follow-ups */}
              {topicDetails.discussionPoints && (() => {
                const TOPIC_COLORS = ['#10b981', '#2D8CFF', '#f59e0b', '#3b82f6', '#ef4444', '#60A5FA', '#14b8a6', '#ec4899'];
                return (
                <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)]">
                  <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="messageCircle" size={14} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Discussion Points</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.discussionPoints.length} topics</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {topicDetails.discussionPoints.map((point, i) => {
                      const dotColor = TOPIC_COLORS[i % TOPIC_COLORS.length];
                      const isExpanded = sdExpandedDPs[i] || false;
                      const visiblePoints = point.points;
                      const hasMore = false;
                      return (
                        <div key={i} className="rounded-xl border border-[var(--border)] bg-white hover:border-[var(--border-hover,var(--border))] transition-all overflow-hidden">
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${dotColor}15` }}>
                                <Icon name="messageCircle" size={12} style={{ color: dotColor }} />
                              </span>
                              <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display flex-1">{point.topic}</h4>
                            </div>
                            <ul className="space-y-1.5 ml-8">
                              {visiblePoints.map((p, j) => (
                                <li key={j} className="flex items-start gap-2 text-sm landing-body">
                                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: dotColor }} />
                                  <span className="text-[var(--text-secondary)] leading-relaxed">{p}</span>
                                </li>
                              ))}
                            </ul>
                            {hasMore && (
                              <button
                                onClick={() => setSdExpandedDPs(prev => ({ ...prev, [i]: !prev[i] }))}
                                className="ml-8 mt-2 text-[11px] font-medium text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors landing-mono flex items-center gap-1"
                              >
                                {isExpanded ? 'Show less' : `Show ${point.points.length - 2} more`}
                                <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {topicDetails.interviewFollowups && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="helpCircle" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Common Follow-up Questions</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.interviewFollowups.map((item, i) => (
                      <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
                        <div className="flex items-start gap-2 px-3 py-2 bg-[rgba(245,158,11,0.04)] border-b border-[rgba(245,158,11,0.2)]">
                          <span className="text-xs font-bold text-[var(--warning)] landing-mono flex-shrink-0">Q{i + 1}</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)] landing-display">{item.question}</span>
                        </div>
                        <div className="px-3 py-2 pl-7 text-[var(--text-secondary)] text-xs landing-body leading-relaxed">
                          <FormattedContent content={item.answer} color="blue" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 13. Visual Assets — reference section */}
              {/* Static Architecture Diagrams (pre-generated SVGs) */}
              {topicDetails.staticDiagrams && topicDetails.staticDiagrams.length > 0 && (
                <StaticDiagramGrid diagrams={topicDetails.staticDiagrams} title="Architecture Diagrams" />
              )}

              {/* Comparison Cards (side-by-side) */}
              {topicDetails.comparisonTables && topicDetails.comparisonTables.length > 0 && (
                <div className="space-y-2">
                  {topicDetails.comparisonTables.map((comp) => (
                    <ComparisonCard key={comp.id} comparison={comp} />
                  ))}
                </div>
              )}

              {/* Cheat Sheet / Quick Reference Cards */}
              {topicDetails.visualCards && topicDetails.visualCards.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {topicDetails.visualCards.map((card) => (
                    <CheatSheetCard key={card.id} card={card} />
                  ))}
                </div>
              )}

              {/* Bar/Pie Charts */}
              {topicDetails.charts && topicDetails.charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {topicDetails.charts.map((chart) => (
                    <ChartCard key={chart.id} chart={chart} />
                  ))}
                </div>
              )}

              {/* Architecture Evolution Timeline */}
              {topicDetails.evolutionSteps && topicDetails.evolutionSteps.length > 0 && (
                <EvolutionTimeline steps={topicDetails.evolutionSteps} />
              )}

              {/* Design Pattern Cards */}
              {topicDetails.patternCards && topicDetails.patternCards.length > 0 && (
                <PatternCardGrid patterns={topicDetails.patternCards} title="Key Design Patterns" />
              )}

              {/* 14. Code Examples */}
              {topicDetails.codeExamples && typeof topicDetails.codeExamples === 'object' && !Array.isArray(topicDetails.codeExamples) && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="code" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Implementation Code</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {Object.entries(topicDetails.codeExamples).map(([lang, code], i) => (
                      <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /><div className="w-2 h-2 rounded-full bg-amber-400" /><div className="w-2 h-2 rounded-full bg-[var(--accent)]" /></div>
                            <span className="text-xs font-bold text-[var(--text-muted)] landing-mono uppercase">{lang}</span>
                          </div>
                          <button onClick={() => navigator.clipboard.writeText(code)} className="text-xs text-[var(--text-muted)] hover:text-gray-300 px-2 py-0.5 border border-gray-700 rounded hover:border-gray-500 transition-colors landing-mono">Copy</button>
                        </div>
                        <pre className="p-3 bg-[#0d1117] overflow-x-auto max-h-80 overflow-y-auto"><code className="text-sm landing-mono text-gray-300 leading-relaxed whitespace-pre">{code}</code></pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 15. Key Questions — Accordion (self-test/review) */}
              {topicDetails.keyQuestions && (
                <div id="key-questions" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
                  <div className="bg-[var(--accent)] border-b border-[var(--accent)] px-4 py-2 flex items-center gap-2">
                    <Icon name="messageSquare" size={14} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Key Questions</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.keyQuestions.length} topics</span>
                    <button
                      onClick={() => {
                        if (sdAllQsExpanded) {
                          setSdExpandedQs({});
                        } else {
                          const all = {};
                          topicDetails.keyQuestions.forEach((_, i) => { all[i] = true; });
                          setSdExpandedQs(all);
                        }
                        setSdAllQsExpanded(!sdAllQsExpanded);
                      }}
                      className="ml-auto text-[11px] font-medium text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors landing-mono flex items-center gap-1"
                    >
                      {sdAllQsExpanded ? 'Collapse all' : 'Expand all'}
                      <svg className={`w-3 h-3 transition-transform ${sdAllQsExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {topicDetails.keyQuestions.map((q, i) => {
                      const isOpen = sdExpandedQs[i] || false;
                      return (
                        <div key={i} className={`rounded-xl overflow-hidden border transition-all ${isOpen ? 'border-[var(--accent)]/20 shadow-sm' : 'border-[var(--border)] hover:border-[var(--border-hover,var(--border))]'}`}>
                          <button
                            onClick={() => setSdExpandedQs(prev => ({ ...prev, [i]: !prev[i] }))}
                            className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-white hover:bg-[var(--bg-elevated)] transition-colors text-left"
                          >
                            <span className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-xs font-bold flex-shrink-0 landing-mono">{i + 1}</span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm flex-1 landing-display leading-snug">{q.question}</h4>
                            <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]" style={{ borderLeft: '3px solid #2D8CFF' }}>
                              <div className="pl-9 text-[var(--text-secondary)] text-sm leading-relaxed landing-body">
                                <FormattedContent content={q.answer} color="blue" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 16. Interview Tips — very last SD card */}
              {topicDetails.tips && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="star" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Interview Tips</h3>
                  </div>
                  <div className="grid  gap-1 p-3">
                    {topicDetails.tips.map((tip, i) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-elevated)] transition-colors rounded">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)]">★</span>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 17. LLD sections */}
              {/* LLD Core Entities */}
              {topicDetails.coreEntities && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="box" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Core Entities</h3>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-1 gap-2">
                    {topicDetails.coreEntities.map((entity, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{entity.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{entity.description}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LLD Design Patterns */}
              {topicDetails.designPatterns && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="puzzle" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Design Patterns</h3>
                  </div>
                  <div className="p-4">
                    <ul className="grid grid-cols-1 gap-1">
                      {topicDetails.designPatterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2 rounded hover:bg-gray-50 transition-colors">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-gray-100 text-[var(--text-primary)] mt-0.5">✦</span>
                          <span className="text-[var(--text-muted)] text-sm landing-body">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* LLD Implementation Code */}
              {topicDetails.implementation && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="code" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Implementation</h3>
                  </div>
                  <div className="overflow-x-auto bg-[#0d1117]">
                    <pre
                      className="p-4 text-sm leading-6 text-gray-300 landing-mono"
                      style={{
                        whiteSpace: 'pre',
                        margin: 0,
                        tabSize: 4
                      }}
                    >
                      {topicDetails.implementation}
                    </pre>
                  </div>
                </div>
              )}

              {/* Concurrency Concepts */}
              {topicDetails.concepts && Array.isArray(topicDetails.concepts) && topicDetails.concepts[0]?.name && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="cpu" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Core Concepts</h3>
                  </div>
                  <div className="p-4 grid  gap-2">
                    {topicDetails.concepts.map((concept, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{concept.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{concept.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Primitives */}
              {topicDetails.primitives && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="lock" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Synchronization Primitives</h3>
                  </div>
                  <div className="p-4 grid  gap-2">
                    {topicDetails.primitives.map((prim, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold">{prim.name}</code>
                          {prim.example && <code className="text-[var(--text-muted)] text-sm landing-mono">{prim.example}</code>}
                        </div>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{prim.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Classic Problems */}
              {topicDetails.problems && topicDetails.problems[0]?.solution && (
                <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="alertTriangle" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Classic Problems</h3>
                  </div>
                  <div className="grid  gap-2 p-3">
                    {topicDetails.problems.map((problem, i) => (
                      <div key={i} className="p-4 rounded-lg border border-[var(--border)]">
                        <h4 className="text-[var(--text-primary)] font-semibold text-sm mb-2 landing-display">{problem.name}</h4>
                        <p className="text-[var(--text-muted)] text-sm mb-2 landing-body">{problem.description}</p>
                        <div className="flex items-start gap-2">
                          <span className="text-[var(--accent)] text-sm font-semibold landing-mono">Solution:</span>
                          <span className="text-[var(--text-muted)] text-sm landing-body">{problem.solution}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Data Structures */}
              {topicDetails.structures && (
                <div className="rounded-lg overflow-hidden bg-white border border-[var(--border)]">
                  <div className="px-3 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                    <Icon name="database" size={16} className="text-white" />
                    <h3 className="text-sm font-bold text-white landing-display">Concurrent Data Structures</h3>
                  </div>
                  <div className="p-4 grid  gap-2">
                    {topicDetails.structures.map((struct, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{struct.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{struct.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>

          )}

        </div>
      )}

      {/* Behavioral Topic Detail */}
      {!isLocked && (activePage === 'behavioral' || (activePage === 'low-level' && !topicDetails.coreEntities && !topicDetails.implementation && !topicDetails.functionalRequirements)) && (topicDetails.sampleQuestions || topicDetails.starExample || topicDetails.introduction || topicDetails.keyQuestions) && (
        <div className="space-y-3">

          {/* 1. Introduction — full width */}
          {topicDetails.introduction && (() => {
            const quoteMatch = topicDetails.introduction.match(/^"([^"]+)"\s*(.*)/s);
            return (
              <div id="overview" className="scroll-mt-24 rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: 'white' }}>
                <div className="px-4 py-2 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                  <Icon name="book" size={14} className="text-white" />
                  <h2 className="text-sm font-bold text-white landing-display">Overview</h2>
                </div>
                <div className="p-5">
                  {quoteMatch ? (
                    <>
                      <div className="p-3.5 rounded-xl mb-3" style={{ background: `${topicDetails.color}06`, borderLeft: `4px solid ${topicDetails.color}` }}>
                        <p className="text-[15px] font-semibold text-[var(--text-primary)] italic landing-body leading-relaxed">"{quoteMatch[1]}"</p>
                      </div>
                      <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed landing-body">{quoteMatch[2].trim()}</p>
                    </>
                  ) : (
                    <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed landing-body">{topicDetails.introduction}</p>
                  )}
                  {/* Key insight callout */}
                  {topicDetails.introduction && (
                    <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="lightbulb" size={16} className="text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] landing-display uppercase tracking-wider">Key Insight</span>
                        <p className="text-sm text-[var(--text-primary)]/80 mt-0.5 leading-relaxed landing-body">
                          {topicDetails.introduction.split('.').filter(s => s.trim().length > 20).slice(-2, -1)[0]?.trim() || topicDetails.introduction.split('.').slice(0, 1)[0]?.trim()}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2. Key Principles — full width, separate card */}
          {topicDetails.principles && topicDetails.principles.length > 0 && (
            <div className="scroll-mt-24 rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center gap-2">
                <Icon name="award" size={14} className="text-white" />
                <h2 className="text-sm font-bold text-white landing-display">Key Principles</h2>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full landing-mono bg-white/20 text-white">{topicDetails.principles.length} principles</span>
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {topicDetails.principles.map((principle, i) => (
                  <span key={i} className="px-2.5 py-1.5 rounded-lg landing-mono text-xs font-medium" style={{ background: `${topicDetails.color}12`, color: topicDetails.color, border: `1px solid ${topicDetails.color}20` }}>
                    {principle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. STAR Framework Example — learn the method BEFORE seeing questions */}
          {topicDetails.starExample && (
            <div id="star-example" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
              <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20">
                  <Icon name="target" size={12} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-white landing-display">STAR Framework Example</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full landing-mono bg-white/20 text-white">4 steps</span>
              </div>
              <div className="p-4">
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 rounded-full" style={{ zIndex: 0, background: 'linear-gradient(to bottom, #3b82f6, #60A5FA, #10b981, #f59e0b)' }} />
                  <div className="relative space-y-0" style={{ zIndex: 1 }}>
                    {Object.entries(topicDetails.starExample).map(([key, value], idx, arr) => {
                      const config = {
                        situation: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', label: 'Situation', icon: 'S' },
                        task: { color: '#60A5FA', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', label: 'Task', icon: 'T' },
                        action: { color: '#10b981', bg: 'rgba(45,140,255,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Action', icon: 'A' },
                        result: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Result', icon: 'R' },
                      };
                      const c = config[key.toLowerCase()] || { color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)', label: key, icon: key.charAt(0).toUpperCase() };
                      return (
                        <div key={key}>
                          <div className="flex items-start gap-4">
                            {/* Circle node on the connector line */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white landing-mono shadow-md" style={{ background: c.color, zIndex: 2 }}>
                              {c.icon}
                            </div>
                            {/* Card */}
                            <div className="flex-1 rounded-xl overflow-hidden shadow-sm" style={{ background: c.bg, border: `1px solid ${c.border}`, borderLeftWidth: '4px', borderLeftColor: c.color }}>
                              <div className="px-4 py-3.5">
                                <span className="text-xs font-extrabold uppercase tracking-wider landing-display" style={{ color: c.color }}>{c.label}</span>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mt-1.5 landing-body">{value}</p>
                              </div>
                            </div>
                          </div>
                          {/* Spacer between cards (except last) */}
                          {idx < arr.length - 1 && <div className="h-3" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Example Response — see the method applied */}
          {topicDetails.exampleResponse && (
            <div id="example-response" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
              <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20">
                  <Icon name="messageSquare" size={12} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-white landing-display">Example Response</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">Ready to use</span>
              </div>
              <div className="p-5">
                <div className="relative rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${topicDetails.color}06, ${topicDetails.color}02)`, borderLeft: `4px solid ${topicDetails.color}40` }}>
                  <div className="absolute top-3 left-5 text-5xl leading-none opacity-8 landing-display" style={{ color: topicDetails.color }}>{'\u201C'}</div>
                  <div className="relative space-y-3 pl-4">
                    {topicDetails.exampleResponse.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed landing-body">{paragraph.trim()}</p>
                    ))}
                  </div>
                  <div className="absolute bottom-3 right-5 text-5xl leading-none opacity-8 landing-display" style={{ color: topicDetails.color }}>{'\u201D'}</div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-muted)] landing-mono">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <Icon name="clock" size={11} />
                    <span>~{Math.ceil(topicDetails.exampleResponse.split(' ').length / 150)} min speaking time</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
                    <Icon name="type" size={11} />
                    <span>{topicDetails.exampleResponse.split(' ').length} words</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Questions & Answers — practice AFTER learning the framework */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
              <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20">
                  <Icon name="messageSquare" size={12} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-white landing-display">Questions & Answers</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.keyQuestions.length} questions</span>
              </div>
              <div className="p-2.5 space-y-2">
                {topicDetails.keyQuestions.map((item, index) => {
                  const questionKey = `behavioral-${index}`;
                  const isExpanded = expandedTheoryQuestions[questionKey] === undefined ? index < 2 : expandedTheoryQuestions[questionKey];
                  return (
                    <div key={index} className="rounded-xl overflow-hidden border border-[var(--border)] bg-white hover:border-[var(--border-hover,var(--border))] hover:shadow-sm transition-all">
                      {/* Question header — clickable to expand/collapse */}
                      <button
                        onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !isExpanded }))}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: topicDetails.color }}>
                          {index + 1}
                        </span>
                        <h4 className="text-[var(--text-primary)] font-semibold text-sm leading-snug landing-display flex-1">{item.question}</h4>
                        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* Answer body — expanded content with block parsing */}
                      {isExpanded && (
                        <div className="px-4 py-3 text-sm text-[var(--text-muted)] leading-relaxed landing-body border-t border-[var(--border)] space-y-2">
                          {(() => {
                            const starColors = { Situation: '#3b82f6', Task: '#f59e0b', Action: '#10b981', Result: '#ef4444' };
                            const lines = item.answer.split('\n').map(l => l.trim());

                            // Group lines into blocks: each header starts a new block with its child content
                            const blocks = [];
                            let current = null;
                            lines.forEach(t => {
                              if (!t) return;
                              const isStar = t.match(/^\*\*(?:[STAR]\s*[-–—]\s*)?(Situation|Task|Action|Result)\*\*/i) || t.match(/^(Situation|Task|Action|Result)\s*[:–—-]/i);
                              const isStarHeader = t.match(/^\*\*STAR/i);
                              const isBoldHeader = (t.startsWith('**') && t.endsWith('**')) || t.match(/^\*\*\d+\.\s/);
                              const isHeader = isStar || isStarHeader || isBoldHeader;

                              if (isHeader) {
                                if (current) blocks.push(current);
                                current = { header: t, children: [], type: isStar ? 'star' : isStarHeader ? 'star-header' : 'section' };
                              } else {
                                if (!current) current = { header: null, children: [], type: 'text' };
                                current.children.push(t);
                              }
                            });
                            if (current) blocks.push(current);

                            const renderLine = (t, i) => {
                              if (t.startsWith('\u2705') || t.startsWith('\u274C')) {
                                const ok = t.startsWith('\u2705');
                                return <div key={i} className="flex items-start gap-2 mb-1"><span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-[var(--accent)]/15' : 'bg-red-100'}`}><svg className={`w-2.5 h-2.5 ${ok ? 'text-[var(--accent)]' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>{ok ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}</svg></span><span className="text-sm landing-body">{t.substring(2).trim()}</span></div>;
                              }
                              if (t.startsWith('"') && t.endsWith('"')) {
                                return <div key={i} className="pl-3 py-1 text-sm italic text-[var(--text-muted)] rounded-r landing-body" style={{ borderLeft: `2px solid ${topicDetails.color}30` }}>{t.slice(1, -1)}</div>;
                              }
                              if (t.startsWith('- ') || t.startsWith('\u2022 ')) {
                                return <div key={i} className="flex items-start gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: topicDetails.color }} /><span className="text-sm landing-body">{t.substring(2)}</span></div>;
                              }
                              if (/^\d+\./.test(t)) {
                                const num = t.match(/^(\d+)\./)[1];
                                return <div key={i} className="flex items-start gap-2 mb-1"><span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 landing-mono" style={{ background: `${topicDetails.color}15`, color: topicDetails.color }}>{num}</span><span className="text-sm landing-body">{t.replace(/^\d+\.\s*/, '')}</span></div>;
                              }
                              if (t.includes('**')) {
                                const parts = t.split('**');
                                return <p key={i} className="mb-1 text-sm landing-body">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-[var(--text-primary)]">{part}</strong> : <span key={j}>{part}</span>)}</p>;
                              }
                              if (t.match(/^(Example|Key insight|Key learning|Key takeaway|Pro tip|Tip|Note):/i)) {
                                const label = t.match(/^([^:]+):/)[1];
                                return <div key={i} className="p-2.5 rounded-lg text-sm landing-body" style={{ background: `${topicDetails.color}08`, borderLeft: `3px solid ${topicDetails.color}40` }}><span className="font-bold landing-mono" style={{ color: topicDetails.color }}>{label}:</span> {t.substring(label.length + 1).trim()}</div>;
                              }
                              return <p key={i} className="mb-1 text-sm leading-relaxed landing-body">{t}</p>;
                            };

                            const renderBlock = (block, bi) => {
                              const h = block.header;
                              if (!h && block.children.length > 0) {
                                return <div key={bi}>{block.children.map((c, ci) => renderLine(c, ci))}</div>;
                              }
                              // STAR keyword block — colored card with label
                              if (block.type === 'star') {
                                const sm = h.match(/^\*\*(?:[STAR]\s*[-–—]\s*)?(Situation|Task|Action|Result)\*\*\s*[:–—-]?\s*(.*)/i) || h.match(/^(Situation|Task|Action|Result)\s*[:–—-]\s*(.*)/i);
                                if (sm) {
                                  const kw = sm[1].charAt(0).toUpperCase() + sm[1].slice(1).toLowerCase();
                                  const sc = starColors[kw] || topicDetails.color;
                                  const starBgs = { Situation: 'rgba(59,130,246,0.08)', Task: 'rgba(139,92,246,0.08)', Action: 'rgba(45,140,255,0.08)', Result: 'rgba(245,158,11,0.08)' };
                                  const starBorders = { Situation: 'rgba(59,130,246,0.2)', Task: 'rgba(139,92,246,0.2)', Action: 'rgba(16,185,129,0.2)', Result: 'rgba(245,158,11,0.2)' };
                                  const headerRest = (sm[2] || '').replace(/^["\u201C\s\u2014\u2013-]+|["\u201D\s]+$/g, '').trim();
                                  return <div key={bi} className="rounded-xl overflow-hidden" style={{ background: starBgs[kw] || `${sc}08`, border: `1px solid ${starBorders[kw] || `${sc}20`}`, borderLeftWidth: '4px', borderLeftColor: sc }}>
                                    <div className="px-4 py-3">
                                      <div className="flex items-center gap-2.5">
                                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0 landing-mono shadow-sm" style={{ background: sc }}>{kw.charAt(0)}</span>
                                        <span className="text-sm font-bold landing-display" style={{ color: sc }}>{kw}</span>
                                      </div>
                                      {headerRest && <p className="text-sm text-[var(--text-secondary)] mt-2 ml-9 landing-body leading-relaxed">{headerRest}</p>}
                                      {block.children.length > 0 && <div className="mt-2 ml-9 space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>}
                                    </div>
                                  </div>;
                                }
                              }
                              // STAR Example header
                              if (block.type === 'star-header') {
                                return <div key={bi} className="flex items-center gap-2 mt-2 mb-1">
                                  <span className="text-[10px] font-bold text-white px-2.5 py-1 rounded-md landing-mono shadow-sm" style={{ background: `linear-gradient(135deg, ${topicDetails.color}, ${topicDetails.color}cc)` }}>STAR</span>
                                  <span className="text-sm font-bold text-[var(--text-primary)] landing-display">Example Response</span>
                                </div>;
                              }
                              // Numbered step or section header
                              const numMatch = h.replace(/\*\*/g, '').match(/^(\d+)\.\s*(.*)/);
                              const sectionTitle = h.replace(/\*\*/g, '').replace(/:$/, '');
                              return <div key={bi} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${topicDetails.color}` }}>
                                <div className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    {numMatch
                                      ? <><span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 landing-mono shadow-sm" style={{ background: topicDetails.color }}>{numMatch[1]}</span><span className="text-sm font-bold text-[var(--text-primary)] landing-display">{numMatch[2].replace(/:$/, '')}</span></>
                                      : <><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: topicDetails.color }} /><span className="text-sm font-bold text-[var(--text-primary)] landing-display">{sectionTitle}</span></>
                                    }
                                  </div>
                                  {block.children.length > 0 && <div className="mt-2 ml-8 space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>}
                                </div>
                              </div>;
                            };

                            return blocks.map((b, i) => renderBlock(b, i));
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Practice Questions — more practice */}
          {topicDetails.sampleQuestions && topicDetails.sampleQuestions.length > 0 && (
            <div id="sample-questions" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
              <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20">
                  <Icon name="helpCircle" size={12} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-white landing-display">Practice Questions</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full landing-mono bg-white/20 text-white">{topicDetails.sampleQuestions.length} questions</span>
              </div>
              <div className="p-2.5 space-y-1.5">
                {topicDetails.sampleQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-transparent hover:bg-[var(--bg-elevated)] hover:border-[var(--border)] hover:shadow-sm transition-all group cursor-default">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 landing-mono" style={{ background: `${topicDetails.color}12`, color: topicDetails.color }}>{i + 1}</span>
                    <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Tips for Success — final review checklist, LAST card */}
          {topicDetails.tips && (
            <div id="tips" className="rounded-2xl overflow-hidden scroll-mt-24 border border-[var(--border)] bg-white">
              <div className="px-4 py-2 border-b border-[var(--accent)] flex items-center gap-2 bg-[var(--accent)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white landing-display">Tips for Success</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white landing-mono">{topicDetails.tips.length} tips</span>
              </div>
              <div className="p-2.5 space-y-1.5">
                {topicDetails.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[var(--accent)]/10/40 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/10/70 hover:border-[var(--accent)]/20 hover:shadow-sm transition-all group">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--accent)]/100 text-white mt-0.5 shadow-sm">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      <TopicComments topicId={selectedTopic} />

      {/* Bottom prev/next topic navigation */}
      {filteredTopics && filteredTopics.length > 1 && (
        <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-stretch gap-3">
          {prevTopic ? (
            <button
              onClick={() => setSelectedTopic(prevTopic.id)}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10/30 transition-all group text-left"
            >
              <Icon name="chevronLeft" size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] landing-mono block">Previous</span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate block landing-body">{prevTopic.title}</span>
              </div>
            </button>
          ) : <div className="flex-1" />}
          <button
            onClick={() => setSelectedTopic(null)}
            className="px-4 py-3 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-all text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] landing-body flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            All Topics
          </button>
          {nextTopic ? (
            <button
              onClick={() => setSelectedTopic(nextTopic.id)}
              className="flex-1 flex items-center justify-end gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10/30 transition-all group text-right"
            >
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] landing-mono block">Next</span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate block landing-body">{nextTopic.title}</span>
              </div>
              <Icon name="chevronRight" size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
            </button>
          ) : <div className="flex-1" />}
        </div>
      )}
    </div>
  );
}
