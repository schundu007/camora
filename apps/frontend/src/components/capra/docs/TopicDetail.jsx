import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
import { CompanyLogo, getCompanyLogoSrc } from '../../shared/CompanyLogo.tsx';
import FormattedContent from './FormattedContent.jsx';
import CloudArchitectureDiagram from './CloudArchitectureDiagram.jsx';
import DiagramSVG from '../features/DiagramSVG.jsx';
import { ContentDiagram } from './ContentDiagram';
import { getAuthHeaders } from '../../../utils/authHeaders.js';
import SharedPricingCards from '../../shared/PricingCards';
import { useAuth } from '../../../contexts/AuthContext';
import { useCelebration } from '../../shared/Celebration';
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
    <div className="">
      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{estimation.title || 'Capacity Planning'}</h3>
      </div>
      {estimation.assumptions && (
        <div className="px-3 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)]/30 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--text-secondary)]">Assumptions:</span> {estimation.assumptions}
        </div>
      )}
      {(() => {
        const CHART_COLORS = ['var(--accent)'];
        const parseNum = (v) => {
          const s = String(v).replace(/[~,+]/g, '');
          const m = s.match(/([\d.]+)\s*(B|Billion|M|K|PB|TB|GB|Gbps)?/i);
          if (!m) return 0;
          const n = parseFloat(m[1]);
          const u = (m[2] || '').toLowerCase();
          if (u === 'b' || u === 'billion') return n * 1e9;
          if (u === 'm') return n * 1e6;
          if (u === 'k') return n * 1e3;
          if (u === 'pb') return n * 1e15;
          if (u === 'tb') return n * 1e12;
          if (u === 'gb' || u === 'gbps') return n * 1e9;
          return n;
        };
        const nums = rows.map(r => parseNum(r.value));
        const maxNum = Math.max(...nums.filter(n => n > 0));
        return (
          <div className="pt-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--bg-elevated)]/70">
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display">Metric</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display w-[100px]">Value</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display hidden lg:table-cell w-[180px]">Scale</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border)] landing-display hidden md:table-cell">Calculation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const pct = maxNum > 0 ? Math.max(4, (Math.log10(nums[i] + 1) / Math.log10(maxNum + 1)) * 100) : 4;
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  return (
                    <tr key={i} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                      <td className="px-2 py-1.5 font-semibold text-[var(--text-secondary)] border-b border-[var(--border)]">{row.metric}</td>
                      <td className="px-2 py-1.5 font-bold text-[var(--text-secondary)] landing-mono border-b border-[var(--border)] whitespace-nowrap">{row.value}</td>
                      <td className="px-2 py-1.5 border-b border-[var(--border)] hidden lg:table-cell">
                        <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                          <div className="h-full rounded-full transition-colors duration-700 bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-[var(--text-muted)] text-xs border-b border-[var(--border)] hidden md:table-cell">{row.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Structured data model rendering — parses SQL-like schema text into table cards.
 * Falls back to enhanced code block with line numbers and copy button.
 */
function DataModelSection({ schema, examples }) {
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

        // Parse field: "id: bigint PK" or "id bigint PK" or "name varchar(255) NOT NULL" or "PRIMARY KEY (...)"
        // Handle colon-separated format: "fieldName: type notes"
        const colonMatch = line.match(/^\s*(\w+)\s*:\s*([\w()]+(?:\(\d+\))?)\s*(.*)?$/);
        // Handle space-separated format: "fieldName type notes"
        const spaceMatch = line.match(/^\s*(\w+)\s+([\w()]+(?:\(\d+\))?)\s*(.*)?$/);
        // Handle compound keys: "PRIMARY KEY (a, b)" or "CLUSTERING KEY (x DESC)"
        const keyMatch = line.match(/^\s*(PRIMARY|CLUSTERING|PARTITION)\s+KEY\s*\(([^)]+)\)/i);

        const fieldMatch = colonMatch || spaceMatch;
        if (keyMatch) {
          currentTable.fields.push({
            name: keyMatch[1].toUpperCase(),
            type: 'KEY',
            notes: `(${keyMatch[2].trim()})`,
          });
        } else if (fieldMatch) {
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
      <div id="data-model" className="scroll-mt-24 mt-14 first:mt-0">
        <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
          <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Data Model</h3>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{tables.length} tables</span>
        </div>
        <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {tables.map((table, ti) => (
            <div key={ti} className="rounded border border-[var(--border)] overflow-hidden">
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
        {/* JSON Examples */}
        {examples && examples.length > 0 && (
          <div className="border-t border-[var(--border)] p-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 landing-mono">Sample Records (JSON)</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {examples.map((ex, i) => (
                <div key={i} className="rounded border border-[var(--border)] overflow-hidden">
                  <div className="px-3 py-1.5 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[var(--accent)] landing-mono">{ex.table}</span>
                    <span className="text-[10px] text-[var(--text-muted)] landing-body">— {ex.label}</span>
                  </div>
                  <pre className="p-2.5 text-[11px] leading-relaxed landing-mono text-[var(--text-secondary)] overflow-x-auto" style={{ background: 'var(--bg-surface)' }}>{ex.json}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: enhanced code block with line numbers, syntax coloring, and Copy button
  const schemaLines = (schema || '').split('\n');
  return (
    <div id="data-model" className="scroll-mt-24 mt-14 first:mt-0">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="database" size={14} className="text-[var(--text-muted)]" />
          <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Data Model</h3>
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border)] bg-white hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors landing-mono flex items-center gap-1.5"
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

  // Loading state
  if (generatingDiagram) {
    return (
      <div className="flex items-center justify-center py-12 rounded bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-secondary)] font-medium">Generating {provider.toUpperCase()} architecture diagram...</span>
        </div>
      </div>
    );
  }

  // API-generated PNG image (from admin regen or "Regenerate" button)
  if (diagramData?.imageUrl) {
    return (
      <div>
        <CloudArchitectureDiagram
          imageUrl={diagramData.imageUrl}
          cloudProvider={provider}
          onRetry={onGenerate}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
          <span>{provider.toUpperCase()} Architecture</span>
          <button onClick={onGenerate} className="hover:text-[var(--accent)] transition-colors">Regenerate →</button>
        </div>
      </div>
    );
  }

  // Static pre-generated PNG — original collapsed preview with click to expand
  if (!imgError) {
    return (
      <div>
        <div className="rounded overflow-hidden cursor-pointer relative" style={{ background: 'white', border: '1px solid var(--border)', maxHeight: expanded ? 'none' : '500px' }} onClick={() => setExpanded(!expanded)}>
          <img
            src={staticSrc}
            alt={`${topicId} ${provider.toUpperCase()} architecture diagram`}
            style={{ width: '100%', maxWidth: '700px', height: 'auto', display: 'block', margin: '0 auto', filter: 'contrast(1.4) saturate(1.15)' }}
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

  // No static file — show generate button (no auto-generation)
  return (
    <div className="text-center py-12 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
      <p className="text-sm text-[var(--text-muted)] mb-3">No diagram available for this topic</p>
      <button onClick={onGenerate} className="px-4 py-2 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90 font-medium">Generate Diagram</button>
    </div>
  );
}

/** Pricing cards — uses shared PricingCards component */
function PricingCards() {
  return <SharedPricingCards variant="compact" showFree={false} />;
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
  const { celebrate } = useCelebration();
  const isAdmin = user?.email === 'chundubabu@gmail.com';
  const [adminRegenStatus, setAdminRegenStatus] = useState('');
  const [diagramPanelOpen, setDiagramPanelOpen] = useState(false);

  if (!topicDetails) return null;

  const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

  // Admin: regenerate diagram via Python diagrams or Eraser API
  const handleAdminRegen = async (engine) => {
    const endpoint = engine === 'eraser' ? '/api/diagram/eraser' : '/api/diagram/generate';
    const question = `Design ${topicDetails.title}. ${topicDetails.description || topicDetails.subtitle || ''}`;
    setAdminRegenStatus(`${engine}: generating...`);
    try {
      const res = await fetch(`${CAPRA_API}${endpoint}`, {
        credentials: 'include',
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setAdminRegenStatus(`${engine}: HTTP ${res.status} — ${errData.error || errData.details || res.statusText}`);
        return;
      }
      const data = await res.json();
      console.log(`[AdminRegen] ${engine} response:`, data);
      if (data.success && data.image_url) {
        const imageUrl = data.image_url.startsWith('http') ? data.image_url : `${CAPRA_API}${data.image_url}`;
        // Directly call generateDiagram to update the diagram state so it shows immediately
        generateDiagram(topicDetails.title || selectedTopic, diagramDetailLevel || 'overview', diagramCloudProvider || 'auto');
        setAdminRegenStatus(`${engine}: done (PNG)!`);
      } else {
        setAdminRegenStatus(`${engine}: FAILED — Python diagram generation failed on server. Check Railway logs.`);
      }
    } catch (err) {
      console.error(`[AdminRegen] ${engine} error:`, err);
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

  // Build hierarchical TOC with parent sections and child items
  const tocSections = useMemo(() => {
    if (!topicDetails) return [];
    const s = [];
    const trunc = (t, n = 32) => t && t.length > n ? t.slice(0, n) + '…' : t;

    if (topicDetails.introduction) s.push({ id: 'overview', label: 'Overview' });

    // ── System Design — ordered by interview priority ──
    if (isSDStyle || activePage === 'low-level') {
      // 1. Requirements
      if (topicDetails.functionalRequirements || topicDetails.requirements) {
        const children = [];
        if (topicDetails.functionalRequirements) children.push('Functional Requirements');
        if (topicDetails.nonFunctionalRequirements) children.push('Non-Functional Requirements');
        s.push({ id: 'requirements', label: 'Requirements', children });
      }
      // 2. Capacity
      if (topicDetails.estimation) s.push({ id: 'capacity', label: 'Capacity Planning' });
      // 3. Architecture
      if (isSDStyle) s.push({ id: 'architecture', label: 'Architecture Diagram' });
      // 4. System Flows
      if (topicDetails.createFlow || topicDetails.redirectFlow) {
        const children = [];
        if (topicDetails.createFlow) children.push(trunc(topicDetails.createFlow.title));
        if (topicDetails.redirectFlow) children.push(trunc(topicDetails.redirectFlow.title));
        s.push({ id: 'flows', label: 'System Flows', children });
      }
      // 5. API Design
      if (topicDetails.apiDesign?.endpoints) s.push({ id: 'api-design', label: 'API Design', children: topicDetails.apiDesign.endpoints.slice(0, 5).map(e => trunc(`${e.method} ${e.path}`, 28)) });
      // 6. Data Model
      if (topicDetails.dataModel) s.push({ id: 'data-model', label: 'Data Model' });
      // 7. Key Concepts (if present)
      if (topicDetails.concepts?.length) s.push({ id: 'concepts', label: 'Key Concepts', children: topicDetails.concepts.slice(0, 6).map(c => typeof c === 'string' ? trunc(c) : trunc(c.name)) });
      // 8. Deep Dives
      if (topicDetails.deepDiveTopics) s.push({ id: 'deep-dive', label: 'Deep Dives', children: topicDetails.deepDiveTopics.slice(0, 6).map(d => trunc(d.topic, 30)) });
      // 9. Architecture Layers
      if (topicDetails.architectureLayers) s.push({ id: 'arch-layers', label: 'Architecture Layers', children: topicDetails.architectureLayers.slice(0, 5).map(l => trunc(l.name)) });
      if (topicDetails.layeredDesign) s.push({ id: 'layered-design', label: 'Layered Design', children: topicDetails.layeredDesign.slice(0, 5).map(l => trunc(l.name)) });
      // 10. Trade-offs
      if (topicDetails.tradeoffDecisions || topicDetails.tradeoffs) {
        const items = topicDetails.tradeoffDecisions || topicDetails.tradeoffs || [];
        s.push({ id: 'tradeoffs', label: 'Trade-offs', children: items.slice(0, 5).map(t => trunc(t.choice || t.decision, 30)) });
      }
      // 11. Edge Cases
      if (topicDetails.edgeCases) s.push({ id: 'edge-cases', label: 'Edge Cases', children: topicDetails.edgeCases.slice(0, 5).map(e => trunc(e.scenario, 30)) });
      // 12. Discussion + Follow-ups
      if (topicDetails.discussionPoints) s.push({ id: 'discussion', label: 'Discussion Points', children: topicDetails.discussionPoints.slice(0, 5).map(d => trunc(d.topic, 30)) });
      if (topicDetails.interviewFollowups) s.push({ id: 'followups', label: 'Follow-up Questions', children: topicDetails.interviewFollowups.slice(0, 5).map(f => trunc(f.question, 30)) });
      // 13. Implementation
      if (topicDetails.basicImplementation || topicDetails.advancedImplementation) {
        const children = [];
        if (topicDetails.basicImplementation) children.push(trunc(topicDetails.basicImplementation.title || 'Basic Approach'));
        if (topicDetails.advancedImplementation) children.push(trunc(topicDetails.advancedImplementation.title || 'Scalable Solution'));
        if (topicDetails.algorithmApproaches) topicDetails.algorithmApproaches.slice(0, 3).forEach(a => children.push(trunc(a.name)));
        s.push({ id: 'implementation', label: 'Implementation', children });
      }
      // 14. Code, Questions, Tips
      if (topicDetails.codeExamples && typeof topicDetails.codeExamples === 'object' && !Array.isArray(topicDetails.codeExamples)) s.push({ id: 'code-examples', label: 'Implementation Code' });
      if (topicDetails.keyQuestions?.length) s.push({ id: 'key-questions', label: 'Key Questions', children: topicDetails.keyQuestions.slice(0, 5).map(q => trunc(q.question, 30)) });
      if (topicDetails.tips) s.push({ id: 'tips', label: 'Interview Tips' });
    }

    // ── DSA / Coding ──
    if (isCodingStyle && topicDetails.keyPatterns) {
      if (topicDetails.keyPatterns) s.push({ id: 'key-patterns', label: 'Key Patterns', children: topicDetails.keyPatterns.slice(0, 5).map(p => trunc(p)) });
      if (topicDetails.whenToUse) s.push({ id: 'when-to-use', label: 'When to Use' });
      if (topicDetails.visualizations) s.push({ id: 'visual', label: 'Visual Explanation' });
      if (topicDetails.approach) s.push({ id: 'approach', label: 'Step-by-Step', children: topicDetails.approach.slice(0, 5).map((a, i) => trunc(`${i + 1}) ${a}`, 30)) });
      if (topicDetails.timeComplexity || topicDetails.spaceComplexity) s.push({ id: 'complexity', label: 'Complexity' });
      if (topicDetails.codeExample || topicDetails.codeExamples) s.push({ id: 'code-examples', label: 'Code Examples' });
      if (topicDetails.commonMistakes) s.push({ id: 'common-mistakes', label: 'Common Mistakes', children: topicDetails.commonMistakes.slice(0, 4).map(m => trunc(m, 30)) });
      if (topicDetails.commonProblems?.length) s.push({ id: 'practice', label: 'Practice Problems', children: topicDetails.commonProblems.slice(0, 5).map(p => trunc(typeof p === 'string' ? p : p.name, 30)) });
      if (topicDetails.theoryQuestions?.length) s.push({ id: 'theory', label: 'Theory Questions', children: topicDetails.theoryQuestions.slice(0, 4).map(q => trunc(typeof q === 'string' ? q : q.question, 30)) });
      if (topicDetails.tips || topicDetails.interviewTips) s.push({ id: 'tips', label: 'Tips' });
    }

    // ── Behavioral ──
    if (activePage === 'behavioral') {
      if (topicDetails.principles?.length) s.push({ id: 'principles', label: 'Key Principles', children: topicDetails.principles.slice(0, 5).map(p => trunc(typeof p === 'string' ? p : p.name || p.title, 30)) });
      if (topicDetails.starExample) s.push({ id: 'star-example', label: 'STAR Example', children: ['Situation', 'Task', 'Action', 'Result'] });
      if (topicDetails.exampleResponse) s.push({ id: 'example-response', label: 'Example Response' });
      if (topicDetails.keyQuestions?.length) s.push({ id: 'key-questions', label: 'Questions & Answers', children: topicDetails.keyQuestions.slice(0, 6).map(q => trunc(q.question, 30)) });
      if (topicDetails.sampleQuestions?.length) s.push({ id: 'sample-questions', label: 'Practice Questions', children: topicDetails.sampleQuestions.slice(0, 5).map(q => trunc(q, 30)) });
      if (topicDetails.tips) s.push({ id: 'tips', label: 'Tips' });
    }

    // ── Other types ──
    if (activePage === 'eng-blogs') {
      if (topicDetails.articles?.length) s.push({ id: 'articles', label: 'Articles', children: topicDetails.articles.slice(0, 5).map(a => trunc(a.title, 30)) });
      if (topicDetails.keyQuestions?.length) s.push({ id: 'key-questions', label: 'Key Takeaways' });
    }
    if (activePage === 'roadmaps') {
      if (topicDetails.phases?.length) s.push({ id: 'roadmap-phases', label: 'Roadmap', children: topicDetails.phases.slice(0, 5).map(p => trunc(p.title || p.name, 30)) });
      if (topicDetails.keyQuestions?.length) s.push({ id: 'key-questions', label: 'FAQ' });
    }
    if (activePage === 'projects') {
      if (topicDetails.learningObjectives?.length) s.push({ id: 'learning-objectives', label: 'What You\'ll Learn' });
      if (topicDetails.interviewRelevance?.length) s.push({ id: 'interview-relevance', label: 'Interview Relevance' });
      if (topicDetails.keyQuestions?.length) s.push({ id: 'key-questions', label: 'Key Questions' });
    }
    return s;
  }, [topicDetails, activePage, isSDStyle, isCodingStyle]);

  // Track active TOC section on scroll — find the section currently visible in viewport
  const [activeTocId, setActiveTocId] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Scroll-based TOC tracking with IntersectionObserver
  useEffect(() => {
    if (!tocSections.length) return;
    const scrollContainer = document.getElementById('app-scroll-container');
    const headingStates = {};

    const callback = (entries) => {
      entries.forEach((entry) => { headingStates[entry.target.id] = entry.isIntersecting; });
      const allIds = tocSections.map(s => s.id);
      const firstVisible = allIds.find(id => headingStates[id]);
      if (firstVisible) setActiveTocId(firstVisible);
    };

    const observer = new IntersectionObserver(callback, {
      root: scrollContainer || null,
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0,
    });

    const timeoutId = setTimeout(() => {
      tocSections.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 200);

    // Scroll progress
    const handleProgress = () => {
      const el = scrollContainer || document.documentElement;
      const scrollH = el.scrollHeight - el.clientHeight;
      setScrollProgress(scrollH > 0 ? Math.min(1, (scrollContainer ? scrollContainer.scrollTop : window.scrollY) / scrollH) : 0);
    };
    (scrollContainer || window).addEventListener('scroll', handleProgress, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      (scrollContainer || window).removeEventListener('scroll', handleProgress);
    };
  }, [tocSections, selectedTopic]);

  return (
    <div className="landing-root animate-fade-in flex gap-8">
      {/* Left: Table of Contents sidebar */}
      {tocSections.length > 2 && (
        <aside className="hidden xl:block flex-shrink-0 sticky self-start" style={{ top: '80px', width: '240px' }}>
          <nav>
            {/* Header */}
            <div className="pb-3 mb-2 border-b border-[var(--border)]">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] landing-mono mb-2">On This Page</h4>
              <div className="h-0.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)] transition-colors duration-300" style={{ width: `${scrollProgress * 100}%` }} />
              </div>
            </div>
            {/* Section links */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {tocSections.map(({ id, label, children }) => {
                const isActive = activeTocId === id;
                return (
                  <div key={id}>
                    <a
                      href={`#${id}`}
                      onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      className={`flex items-center gap-2 px-4 py-2 text-[13px] leading-snug transition-colors landing-body border-l-[3px] ${
                        isActive
                          ? 'border-[var(--accent)] text-[var(--accent)] font-semibold bg-[var(--accent)]/5'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {label}
                    </a>
                    {children?.length > 0 && isActive && (
                      <div className="pl-7 pb-1">
                        {children.map((child, ci) => (
                          <span key={ci} className="block py-[3px] px-2 text-[11px] text-[var(--text-muted)] landing-body leading-snug truncate" title={child}>{child}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </aside>
      )}

      {/* Right: Topic content */}
      <div className="flex-1 min-w-0">
      {/* Topic Header — flush left, no card */}
      <div className="pb-4 mb-6 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2 gap-2">
          {/* Breadcrumb: Prepare › <category> › <topic>. The category crumb
              clears selectedTopic to scroll back to the topic list (preserves
              filter state); the leaf is non-clickable. */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
            <Link to="/capra/prepare" className="text-[var(--text-muted)] hover:text-[var(--accent)] font-medium whitespace-nowrap transition-colors">Prepare</Link>
            <span className="text-[var(--text-dimmed)]" aria-hidden="true">›</span>
            <button onClick={() => setSelectedTopic(null)} className="text-[var(--text-muted)] hover:text-[var(--accent)] font-medium whitespace-nowrap transition-colors">{pageConfig.title}</button>
            <span className="text-[var(--text-dimmed)]" aria-hidden="true">›</span>
            <span className="text-[var(--text-primary)] font-semibold truncate" aria-current="page" title={topicDetails.title}>{topicDetails.title}</span>
          </nav>
          <div className="flex items-center gap-1 shrink-0">
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
              className="w-14 h-14 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <Icon name={topicDetails.icon} size={28} style={{ color: 'var(--text-primary)' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-[28px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.title}</h1>
              {topicDetails.isNew && <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold">NEW</span>}
              {topicDetails.difficulty && (
                <span className={`text-[10px] uppercase tracking-[0.12em] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-white ${
                  topicDetails.difficulty === 'Easy' ? 'font-medium text-[var(--text-muted)]' :
                  topicDetails.difficulty === 'Medium' ? 'font-semibold text-[var(--text-primary)]' :
                  'font-bold text-[var(--accent)]'
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
                  to={`/capra/design?problem=${encodeURIComponent(`Design ${topicDetails.title}. ${topicDetails.description || topicDetails.subtitle || ''}`)}&autosolve=true`}
                  className="ml-auto px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent)]/100 text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2 flex-shrink-0 landing-body"
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
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 mb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {/* Progress */}
          {progressInfo && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white border border-[var(--border)]">
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="var(--bg-elevated)" strokeWidth="2.5" />
                <circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
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
            onClick={() => {
              const wasComplete = !!completedTopics[selectedTopic];
              toggleComplete(selectedTopic);
              if (!wasComplete) {
                celebrate({ title: `${topicDetails.title} complete`, subtitle: 'Nice work — keep the streak going.' });
              }
            }}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm font-medium transition-colors landing-body ${completedTopics[selectedTopic] ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)]'}`}
          >
            <Icon name={completedTopics[selectedTopic] ? 'checkCircle' : 'check'} size={16} />
            <span className="hidden sm:inline">{completedTopics[selectedTopic] ? 'Completed' : 'Mark as Complete'}</span>
          </button>
          {/* Star */}
          <button
            onClick={() => toggleStar(selectedTopic)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm transition-colors ${starredTopics[selectedTopic] ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)]'}`}
          >
            <Icon name={starredTopics[selectedTopic] ? 'star5' : 'star'} size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Ask AI */}
          <button
            onClick={() => setShowAskAI(!showAskAI)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm font-medium transition-colors landing-body ${showAskAI ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] border border-[var(--border)]' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)]'}`}
          >
            <Icon name="sparkles" size={16} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
          {/* Course Roadmap — hide on tabs that ARE roadmaps/projects/blogs */}
          {activePage !== 'roadmaps' && activePage !== 'projects' && activePage !== 'eng-blogs' && (
            <button
              onClick={() => setShowRoadmap(!showRoadmap)}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-colors landing-body"
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
            <div className="mb-3">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Introduction</h2>
              </div>
              <div className="pt-2">
                <div className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed">
                  <FormattedContent content={topicDetails.introduction} color="blue" />
                </div>
              </div>
            </div>
          )}

          {/* Preview: key concepts */}
          {topicDetails.concepts && topicDetails.concepts.length > 0 && (
            <div className="mb-3">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Concepts</h2>
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {topicDetails.concepts.map((concept, i) => (
                  <span key={i} className="px-2.5 py-1 rounded text-xs landing-mono font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border)]">
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
              <div className="mb-3">
                <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                  <h2 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Questions</h2>
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

          {/* Paywall upgrade prompt */}
          <div className="rounded mt-4 py-8 px-4" style={{ background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-app) 100%)', border: '1px solid var(--border)' }}>
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 landing-display">Upgrade to unlock all topics</h3>
                <p className="text-xs text-[var(--text-muted)] landing-body">Choose a plan to access {activePage === 'coding' ? '36+' : activePage === 'system-design' ? '300+' : '50+'} topics with full content</p>
              </div>
              <PricingCards />
            </div>
          </div>
        </div>
      )}

      {/* ── UNLOCKED CONTENT ── */}
      {!isLocked && showAskAI && (
        <div className="p-3 rounded mb-2 bg-[var(--accent)]/10/50 border border-[var(--accent)]/20">
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
              className="flex-1 px-3 py-2.5 rounded text-sm text-[var(--text-primary)] placeholder-gray-500 focus:outline-none border border-[var(--border)] bg-white focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]/50 landing-body"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={aiLoading || !aiQuestion.trim()}
              className="px-3 py-2.5 rounded text-sm font-semibold bg-[var(--accent)]/100 text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors landing-body"
            >
              {aiLoading ? <Icon name="loader" size={16} className="animate-spin" /> : 'Ask'}
            </button>
          </div>
          {aiAnswer && (
            <div className="p-4 rounded bg-[var(--bg-elevated)]">
              <FormattedContent content={aiAnswer} color="purple" />
            </div>
          )}
        </div>
      )}

      {/* Course Roadmap Panel */}
      {!isLocked && showRoadmap && (
        <div className="p-3 rounded mb-2 bg-[var(--bg-elevated)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="compass" size={16} className="text-[var(--text-primary)]" />
            <span className="text-[var(--text-primary)] font-semibold text-sm landing-display">Course Roadmap — {pageConfig.title}</span>
          </div>
          <div className="grid gap-1">
            {(isCodingStyle ? (filteredTopics || codingTopics) : isSDStyle ? (filteredTopics || []) : activePage === 'low-level' ? (filteredTopics || []) : behavioralTopics).map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTopic(t.id); setShowRoadmap(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left transition-colors landing-body ${t.id === selectedTopic ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
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
            <div id="overview" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="px-4 py-2.5 border-b border-[var(--border)] bg-white flex items-center gap-2">
                <Icon name="bookOpen" size={14} className="text-[var(--text-muted)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{topicDetails.title}</h3>
                <span className="text-[10px] landing-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{topicDetails.articles?.length || topicDetails.questions} articles</span>
              </div>
              <div className="pt-2">
                <div className="text-[15px] leading-[1.75] text-[var(--text-secondary)] landing-body">
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
            <div id="articles" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Articles</h3>
                <span className="text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">{topicDetails.articles.length}</span>
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
                    <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold landing-mono bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">
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
            <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Takeaways</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.keyQuestions.map((qa, i) => (
                  <div key={i} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [`eb-${i}`]: !prev[`eb-${i}`] }))}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="w-6 h-6 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[var(--text-secondary)] landing-mono">
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
            <div id="overview" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Overview</h3>
                <span className="text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">{topicDetails.phases?.length || 0} phases</span>
                <span className="text-[10px] landing-mono text-white/80">{topicDetails.phases?.reduce((a, p) => a + p.topics.length, 0) || 0} topics total</span>
              </div>
              <div className="pt-2">
                <div className="text-[15px] leading-[1.75] text-[var(--text-secondary)] landing-body">
                  <FormattedContent content={topicDetails.introduction} color="amber" />
                </div>
              </div>
            </div>
          )}

          {/* Visual Roadmap — dark spine with branching topics */}
          {topicDetails.phases && topicDetails.phases.length > 0 && (
            <div id="roadmap-phases" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.title} Roadmap</h3>
                <span className="text-[10px] landing-mono text-white/80">{topicDetails.phases.length} phases, {topicDetails.phases.reduce((a, p) => a + p.topics.length, 0)} topics</span>
              </div>

              {/* Horizontal flow — phase badges connected by arrows */}
              <div className="px-4 py-4 border-b border-[var(--border)] overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                  {topicDetails.phases.map((phase, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <a href={`#phase-${i}`} className="px-3 py-1.5 rounded text-[11px] font-bold text-white whitespace-nowrap landing-display hover:opacity-90 transition-opacity" style={{ background: phase.color }}>
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
                  <div key={phaseIdx} id={`phase-${phaseIdx}`} className="rounded border-2 overflow-hidden scroll-mt-24" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: phase.color }}>
                        {phaseIdx + 1}
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)] landing-display flex-1">{phase.title}</h4>
                      <span className="text-[10px] landing-mono text-[var(--text-muted)]">{phase.topics.length} topics</span>
                    </div>
                    <div className="px-4 py-3 bg-white flex flex-wrap gap-2">
                      {phase.topics.map((topic, tIdx) => (
                        <span key={tIdx} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium landing-body" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
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
            <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">FAQ</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.keyQuestions.map((qa, i) => (
                  <div key={i} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [`rm-${i}`]: !prev[`rm-${i}`] }))}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="w-6 h-6 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[var(--text-secondary)] landing-mono">
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
          <div id="overview" className="scroll-mt-24 mt-14 first:mt-0">
            <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
              <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Project Overview</h3>
            </div>
            <div className="pt-2">
              {/* Difficulty + Time badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={`text-[10px] uppercase tracking-[0.12em] landing-mono px-2 py-0.5 rounded border border-[var(--border)] bg-white ${
                  topicDetails.difficulty === 'beginner' ? 'font-medium text-[var(--text-muted)]' :
                  topicDetails.difficulty === 'intermediate' ? 'font-semibold text-[var(--text-primary)]' :
                  'font-bold text-[var(--accent)]'
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
                    <span key={tech} className="text-xs landing-mono px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]">{tech}</span>
                  ))}
                </div>
              )}
              {/* Introduction */}
              <div className="text-[15px] leading-[1.75] text-[var(--text-secondary)] landing-body">
                <FormattedContent content={topicDetails.introduction || topicDetails.description} color="purple" />
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          {topicDetails.learningObjectives && topicDetails.learningObjectives.length > 0 && (
            <div id="learning-objectives" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">What You'll Learn</h3>
              </div>
              <div className="pt-2">
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
            <div id="interview-relevance" className="rounded overflow-hidden scroll-mt-24 border border-[var(--accent)]/20 bg-[var(--accent)]/10/50">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Interview Relevance</h3>
              </div>
              <div className="pt-2">
                <p className="text-sm text-[var(--text-secondary)] landing-body leading-relaxed">{topicDetails.interviewRelevance}</p>
              </div>
            </div>
          )}

          {/* Key Questions */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Questions</h3>
                <span className="text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">{topicDetails.keyQuestions.length}</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topicDetails.keyQuestions.map((qa, i) => (
                  <div key={i} className="px-4 py-3">
                    <button
                      onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [i]: !prev[i] }))}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="w-6 h-6 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-[var(--text-secondary)] landing-mono">
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold text-white transition-colors hover:opacity-90 bg-[var(--accent)]"
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
            <div id="overview" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Overview</h3>
              </div>
              <div className="pt-2">
                <div className="text-[15px] leading-[1.75] text-[var(--text-secondary)] landing-body">
                  <FormattedContent content={topicDetails.introduction} color="blue" />
                </div>
              </div>
            </div>
          )}

          {/* 2. Key Patterns — what to recognize */}
          {topicDetails.keyPatterns && (
            <div id="key-patterns" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Patterns</h3>
                <span className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{topicDetails.keyPatterns.length}</span>
              </div>
              <div className="pt-2">
                <div className="flex flex-wrap gap-2">
                  {topicDetails.keyPatterns.map((pattern, i) => (
                    <span key={i} className="px-2.5 py-1 rounded text-xs font-medium landing-mono text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border)]">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. When to Use — when to apply */}
          {topicDetails.whenToUse && (
            <div id="when-to-use" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">When to Use</h3>
                <span className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{topicDetails.whenToUse.length}</span>
              </div>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.whenToUse.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded hover:bg-gray-50 transition-colors landing-body">
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
            <div id="visual" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Visual Explanation</h3>
                <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">{topicDetails.visualizations.length}</span>
              </div>
              <div className={`p-4 grid gap-4 ${topicDetails.visualizations.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {topicDetails.visualizations.map((viz, vi) => (
                  <div key={vi} className="rounded border border-[var(--border)] overflow-hidden">
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
            <div id="approach" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Step-by-Step Approach</h3>
                <span className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{topicDetails.approach.length}</span>
              </div>
              <div className="pt-2">
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
            <div id="complexity" className="grid grid-cols-2 gap-3 scroll-mt-24">
              {topicDetails.timeComplexity && (
                <div className="shadow-sm flex">
                  <div className="w-1 bg-[var(--accent)] flex-shrink-0" />
                  <div className="p-3 flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
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
                <div className="shadow-sm flex">
                  <div className="w-1 bg-[var(--accent)] flex-shrink-0" />
                  <div className="p-3 flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
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
            <div id="code-examples" className="rounded overflow-hidden border border-[var(--border)] scroll-mt-24">
              <div className="px-4 py-2.5 bg-[#1e1e2e] flex items-center gap-2">
                <Icon name="code" size={14} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[#e2e8f0] landing-display">Code Example</h3>
                <span className="text-[10px] landing-mono text-[#94a3b8] bg-[#1e293b] border border-[#334155] px-1.5 py-0.5 rounded uppercase tracking-[0.12em] ml-1">Python</span>
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
                    <div key={gi} className="rounded overflow-hidden border border-[var(--border)]">
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
                                  className={`text-[10px] landing-mono px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${isActive ? `text-${c}-300 bg-${c}-900/50 border-${c}-700/50` : 'text-[var(--text-muted)] bg-transparent border-gray-700 hover:text-gray-300'}`}
                                  style={isActive ? { color: c === 'yellow' ? '#FFFFFF' : undefined, background: c === 'yellow' ? 'rgba(122,92,10,0.3)' : undefined } : {}}
                                >{lang.charAt(0).toUpperCase() + lang.slice(1)}</button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] landing-mono text-[#94a3b8] bg-[#1e293b] border border-[#334155] px-1.5 py-0.5 rounded uppercase tracking-[0.12em] ml-1 flex-shrink-0">{activeEx.language || 'Python'}</span>
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
            <div id="common-mistakes" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Common Mistakes</h3>
                <span className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{topicDetails.commonMistakes.length}</span>
              </div>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.commonMistakes.map((mistake, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-b-0">
                    <span className="text-[10px] landing-mono text-[var(--text-muted)] tabular-nums flex-shrink-0 mt-1">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body">{mistake}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Practice Problems — self practice */}
          {topicDetails.commonProblems && (
            <div id="practice" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Practice Problems</h3>
                <span className="ml-auto text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{topicDetails.commonProblems.length}</span>
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
                  const href = `/capra/coding?problem=${encodeURIComponent(problemText)}&autosolve=true`;

                  return (
                    <Link
                      key={i}
                      to={href}
                      className={`grid grid-cols-[32px_1fr_64px_72px] items-center px-3 py-2.5 transition-colors cursor-pointer group hover:bg-[var(--accent)]/10/60 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} ${i < topicDetails.commonProblems.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                    >
                      <span className="text-xs text-[var(--text-muted)] landing-mono">{i + 1}</span>
                      <span className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors landing-body pr-2">{problemName}</span>
                      <span className="flex justify-center">
                        {difficulty ? (
                          <span className={`text-[10px] uppercase tracking-[0.12em] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-white ${
                            difficulty === 'Easy' ? 'font-medium text-[var(--text-muted)]' :
                            difficulty === 'Medium' ? 'font-semibold text-[var(--text-primary)]' :
                            'font-bold text-[var(--accent)]'
                          }`}>{difficulty}</span>
                        ) : <span className="text-[var(--text-muted)] text-xs">—</span>}
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
            <div id="theory" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Theory Questions</h3>
                <span className="text-[10px] landing-mono text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">{topicDetails.theoryQuestions.length}</span>
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
              <div className="pt-2">
                <div className="grid grid-cols-1 gap-2">
                  {topicDetails.theoryQuestions.map((q, i) => {
                    const questionKey = `${selectedTopic}-${i}`;
                    const isExpanded = expandedTheoryQuestions[questionKey];
                    const borderColor = 'border-l-[var(--accent)]';
                    return (
                      <div key={i} className={` hover:border-[var(--border-hover,var(--border))] transition-colors ${isExpanded ? `border-l-[3px] ${borderColor}` : ''}`}>
                        <button
                          onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !prev[questionKey] }))}
                          className="w-full flex items-center gap-2 p-3 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                        >
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] landing-mono bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold flex-shrink-0">{i + 1}</span>
                          <span className="text-[var(--text-primary)] text-sm font-medium flex-1 landing-body">{q.question}</span>
                          {q.difficulty && (
                            <span className={`text-[10px] uppercase tracking-[0.12em] landing-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-white flex-shrink-0 ${
                              q.difficulty === 'Easy' ? 'font-medium text-[var(--text-muted)]' :
                              q.difficulty === 'Medium' ? 'font-semibold text-[var(--text-primary)]' :
                              'font-bold text-[var(--accent)]'
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
            <div id="tips" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Tips & Interview Checklist</h3>
                <span className="text-[10px] font-bold text-white bg-white/20 border border-white/30 px-1.5 py-0.5 rounded-full landing-mono ml-auto">PRO</span>
              </div>
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.tips && topicDetails.tips.map((tip, i) => (
                  <div key={`tip-${i}`} className="flex items-start gap-2.5 p-2 rounded hover:bg-gray-50 transition-colors">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="check" size={10} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body">{tip}</span>
                  </div>
                ))}
                {topicDetails.interviewTips && topicDetails.interviewTips.map((tip, i) => (
                  <div key={`itip-${i}`} className="flex items-start gap-3 p-2 rounded transition-colors hover:bg-[var(--bg-elevated)]/60">
                    <Icon name="lightbulb" size={12} className="text-[var(--text-muted)] flex-shrink-0 mt-1" />
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
        <div className="space-y-4">
          {/* Comprehensive System Design / LLD Problem Content */}
          {(topicDetails.requirements || topicDetails.functionalRequirements || topicDetails.introduction || topicDetails.concepts) && (
            <>
              {/* 1. Introduction — full width */}
              {topicDetails.introduction && (
                <div id="overview" className="scroll-mt-24 mt-14 first:mt-0">
                  {/* Product Hero — shown when productMeta exists */}
                  {topicDetails.productMeta && (
                    <div className="p-5 pb-0">
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Left: product stats */}
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--text-secondary)] landing-body mb-3">{topicDetails.productMeta.tagline}</p>
                          {/* Stats row */}
                          <div className="flex flex-wrap gap-4 mb-4">
                            {topicDetails.productMeta.stats.map((stat, i) => (
                              <div key={i} className="text-center">
                                <div className="text-lg font-bold landing-mono text-[var(--text-primary)]">{stat.value}</div>
                                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] landing-mono">{stat.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Right: Product screenshot (if available in productMeta) */}
                        {topicDetails.productMeta.screenshotUrl && (
                          <div className="w-[180px] flex-shrink-0">
                            <img
                              src={topicDetails.productMeta.screenshotUrl}
                              alt={topicDetails.productMeta.name}
                              className="rounded border border-[var(--border)]"
                              style={{ maxWidth: '180px', maxHeight: '220px', objectFit: 'contain' }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Scope: In Scope / Out of Scope */}
                      {topicDetails.productMeta.scope && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-4">
                          <div className="p-3 rounded bg-[var(--accent)]/5 border border-[var(--accent)]/15">
                            <h4 className="text-xs font-bold text-[var(--accent)] landing-display uppercase tracking-wider mb-2">In Scope</h4>
                            <ul className="space-y-1">
                              {topicDetails.productMeta.scope.inScope.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)] landing-body">
                                  <Icon name="check" size={12} className="text-[var(--accent)] mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 rounded bg-gray-50 border border-gray-200">
                            <h4 className="text-xs font-bold text-[var(--text-muted)] landing-display uppercase tracking-wider mb-2">Out of Scope</h4>
                            <ul className="space-y-1">
                              {topicDetails.productMeta.scope.outOfScope.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-muted)] landing-body">
                                  <Icon name="x" size={12} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Introduction header */}
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3" style={topicDetails.productMeta ? { borderTop: `1px solid var(--border)` } : {}}>
                    <h2 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.productMeta ? 'Why This Design Problem?' : 'Introduction'}</h2>
                  </div>
                  <div className="pt-2">
                    <div className="text-[var(--text-secondary)] text-base leading-relaxed landing-body">
                      <FormattedContent content={topicDetails.introduction} color="blue" />
                    </div>
                    {/* Key challenge callout */}
                    {(topicDetails.productMeta?.keyChallenge || topicDetails.introduction) && (
                      <div className="mt-4 flex items-start gap-3 p-4 rounded bg-[var(--bg-elevated)] border border-[var(--border)]">
                        <Icon name="zap" size={16} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)] landing-display uppercase tracking-wider">Key Challenge</span>
                          <p className="text-sm text-[var(--text-primary)]/80 mt-0.5 leading-relaxed landing-body">
                            {topicDetails.productMeta?.keyChallenge || (topicDetails.introduction.split('.').filter(s => s.trim().length > 20).slice(-2, -1)[0]?.trim() + '.') || topicDetails.introduction.split('.').slice(0, 1)[0]?.trim() + '.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Key Concepts — separate card below introduction */}
              {topicDetails.concepts && !topicDetails.concepts[0]?.name && (
                <div id="concepts" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h2 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Concepts</h2>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {topicDetails.concepts.map((concept, i) => (
                      <span key={i} className="px-2.5 py-1 rounded text-xs landing-mono font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border)]">
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Functional Requirements</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{(topicDetails.functionalRequirements || topicDetails.requirements).length} requirements</span>
                  </div>
                  <div className="pt-2">
                    <div className="grid grid-cols-1 gap-1.5">
                      {(topicDetails.functionalRequirements || topicDetails.requirements).map((req, i) => (
                        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded hover:bg-[var(--accent)]/5 transition-colors cursor-default">
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
                  <div className="">
                    <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                      <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Non-Functional Requirements</h3>
                      <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.nonFunctionalRequirements.length} requirements</span>
                    </div>
                    <div className="pt-2">
                      <div className="grid grid-cols-1 gap-1.5">
                        {topicDetails.nonFunctionalRequirements.map((req, i) => {
                          // Extract metric-like values from the requirement text (e.g., "<3s", "99.9%", "1M")
                          const metricMatch = req.match(/([<>~]?\d+\.?\d*\s*(?:ms|s|%|M|K|GB|TB|MB|req\/s|QPS|RPS|rpm|tps)?)/i);
                          return (
                            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded hover:bg-gray-50 transition-colors cursor-default">
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
                <div id="capacity" className="scroll-mt-24">
                  <CapacityPlanningGrid estimation={topicDetails.estimation} />
                </div>
              )}

              {/* 5. Architecture Diagram — open in side panel */}
              {isSDStyle && topicDetails && (
                <div id="architecture" className="scroll-mt-24">
                  <button
                    onClick={() => setDiagramPanelOpen(true)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded border border-[var(--border)] bg-white transition-colors hover:border-[var(--accent)] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border)]">
                        <Icon name="layers" size={20} className="text-[var(--text-muted)]" />
                      </div>
                      <div className="text-left">
                        <span className="text-base font-bold block" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Architecture Diagram</span>
                        <span className="text-xs mt-0.5 block" style={{ color: 'var(--accent)' }}>
                          {diagramData?.imageUrl ? 'View diagram' : 'Open diagram'} · AWS / GCP / Azure
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline text-xs font-semibold px-3 py-1.5 rounded group-hover:bg-[var(--accent)] group-hover:text-white transition-colors" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        Open Panel
                      </span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                </div>
              )}

              {/* 5b. Architecture Layers + Layered Design — immediately after architecture diagram */}
              {topicDetails.architectureLayers && (
                <div id="arch-layers" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Architecture Layers</h3>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {topicDetails.architectureLayers.map((layer, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded border border-[var(--border)]">
                        <span className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Layered Design</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.layeredDesign.length} layers</span>
                  </div>
                  <div className="p-2.5 space-y-0">
                    {topicDetails.layeredDesign.map((layer, i) => {
                      const LAYER_COLORS = ['var(--accent)'];
                      const lc = LAYER_COLORS[i % LAYER_COLORS.length];
                      return (
                        <div key={i} className="relative">
                          {i > 0 && (
                            <div className="flex justify-center -my-1 z-10 relative">
                              <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M8 0v10M4 6l4 4 4-4" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          )}
                          <div className="rounded border border-[var(--border)] bg-white transition-colors overflow-hidden">
                            <div className="px-4 py-3">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <span className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: lc }}>L{i + 1}</span>
                                <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{layer.name}</h4>
                              </div>
                              <p className="text-[var(--text-secondary)] text-xs leading-relaxed ml-9 landing-body">{layer.purpose}</p>
                              {layer.components && (
                                <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
                                  {layer.components.map((comp, j) => (
                                    <span key={j} className="text-[11px] font-medium px-2 py-0.5 rounded-md landing-mono" style={{ background: `${lc}12`, color: lc, border: `1px solid ${lc}30` }}>{comp}</span>
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

              {/* 5c. Basic + Advanced Implementation — right after layered design, before flows */}
              {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
                <div id="implementation" className={`grid gap-3 scroll-mt-24 ${topicDetails.basicImplementation && topicDetails.advancedImplementation ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  {topicDetails.basicImplementation && (
                    <div className="">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] uppercase tracking-wider landing-mono">Basic</span>
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.basicImplementation.title || 'Basic Approach'}</h3>
                      </div>
                      <div className="pt-2">
                        <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed landing-body">{topicDetails.basicImplementation.description}</p>
                        <ContentDiagram
                          src={topicDetails.basicImplementation.diagramSrc}
                          template={topicDetails.basicImplementation.svgTemplate}
                          alt={topicDetails.basicImplementation.title || 'Basic Architecture'}
                          className="mb-3"
                        />
                        {topicDetails.basicImplementation.problems && (
                          <div>
                            <h4 className="text-[var(--text-muted)] text-[10px] font-bold mb-1.5 flex items-center gap-2 landing-mono uppercase tracking-[0.16em]">Issues</h4>
                            <div className="grid grid-cols-1 gap-0.5">
                              {topicDetails.basicImplementation.problems.map((problem, i) => (
                                <div key={i} className="flex items-start gap-2 px-1 py-1 text-xs landing-body">
                                  <span className="text-[var(--text-muted)] mt-px flex-shrink-0">—</span>
                                  <span className="text-[var(--text-secondary)]">{problem}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {topicDetails.advancedImplementation && (
                    <div className="">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] uppercase tracking-wider landing-mono">Advanced</span>
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.advancedImplementation.title || 'Scalable Solution'}</h3>
                      </div>
                      <div className="pt-2">
                        <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed landing-body">{topicDetails.advancedImplementation.description}</p>
                        <ContentDiagram
                          src={topicDetails.advancedImplementation.diagramSrc}
                          template={topicDetails.advancedImplementation.svgTemplate}
                          alt={topicDetails.advancedImplementation.title || 'Advanced Architecture'}
                          className="mb-3"
                        />
                        {topicDetails.advancedImplementation.keyPoints && (
                          <div className="mb-3">
                            <h4 className="text-[var(--text-primary)] text-xs font-bold mb-1.5 landing-display uppercase tracking-wider">Key Points</h4>
                            <div className="grid grid-cols-1 gap-0.5">
                              {topicDetails.advancedImplementation.keyPoints.map((point, i) => (
                                <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded text-xs landing-body">
                                  <span className="text-[var(--accent)] mt-px flex-shrink-0">✓</span>
                                  <span className="text-[var(--text-secondary)]">{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 6. System Flows + Flowcharts — show right after architecture */}
              {(topicDetails.createFlow || topicDetails.redirectFlow) && (
                <div id="flows" className="space-y-3 scroll-mt-24">
                  {topicDetails.createFlow && (
                    <div className="">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.createFlow.title}</h3>
                      </div>
                      {topicDetails.createFlow.diagramSrc ? (
                        <div className="pt-2">
                          <ContentDiagram src={topicDetails.createFlow.diagramSrc} alt={topicDetails.createFlow.title} />
                        </div>
                      ) : (
                        <div className="pt-2">
                          <ol className="space-y-1">
                            {topicDetails.createFlow.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 py-1">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] landing-mono mt-0.5">{i + 1}</span>
                                <span className="text-[var(--text-secondary)] text-sm landing-body">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                  {topicDetails.redirectFlow && (
                    <div className="">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">{topicDetails.redirectFlow.title}</h3>
                      </div>
                      {topicDetails.redirectFlow.diagramSrc ? (
                        <div className="pt-2">
                          <ContentDiagram src={topicDetails.redirectFlow.diagramSrc} alt={topicDetails.redirectFlow.title} />
                        </div>
                      ) : (
                        <div className="pt-2">
                          <ol className="space-y-1">
                            {topicDetails.redirectFlow.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 py-1">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] landing-mono mt-0.5">{i + 1}</span>
                                <span className="text-[var(--text-secondary)] text-sm landing-body">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {topicDetails.flowcharts && topicDetails.flowcharts.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {topicDetails.flowcharts.map((fc) => (
                    <FlowchartCard key={fc.id} flowchart={fc} />
                  ))}
                </div>
              )}

              {/* 7. API Design + Data Model — right after flows */}
              {(topicDetails.apiDesign?.endpoints || topicDetails.dataModel) && (
                <div className="space-y-3 scroll-mt-24">
                  {/* API Design — Stripe-style endpoint cards */}
                  {topicDetails.apiDesign && topicDetails.apiDesign.endpoints && (
                    <div id="api-design" className="scroll-mt-24 mt-14 first:mt-0">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">API Design</h3>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.apiDesign.endpoints.length} endpoints</span>
                      </div>
                      <div className="pt-2">
                        <div className="grid grid-cols-1 gap-2">
                          {topicDetails.apiDesign.endpoints.map((endpoint, i) => (
                            <div key={i} className="rounded p-3.5 border border-[var(--border)] hover:border-[var(--border-hover,var(--border))]  transition-colors">
                              <div className="flex items-center gap-2.5 mb-2">
                                <span className={`text-[10px] landing-mono px-2 py-0.5 rounded border border-[var(--border)] bg-white uppercase tracking-[0.14em] ${
                                  endpoint.method === 'GET' ? 'font-medium text-[var(--text-muted)]' :
                                  endpoint.method === 'POST' || endpoint.method === 'INSERT' ? 'font-semibold text-[var(--text-primary)]' :
                                  endpoint.method === 'PUT' || endpoint.method === 'UPDATE' ? 'font-semibold text-[var(--text-primary)]' :
                                  'font-bold text-[var(--accent)]'
                                }`}>{endpoint.method}</span>
                                <code className="text-[var(--text-primary)] landing-mono text-sm font-medium">{endpoint.path}</code>
                              </div>
                              {endpoint.description && (
                                <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>{endpoint.description}</p>
                              )}
                              <div className="hidden">
                              </div>
                              {endpoint.response && (
                                <div className="rounded bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2 overflow-x-auto">
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
                    <DataModelSection schema={topicDetails.dataModel.schema} examples={topicDetails.dataModel.examples} />
                  )}
                </div>
              )}

              {/* (Implementation + Algorithms moved to after trade-offs) */}

              {/* 10. Deep Dive Topics + System Components + Key Design Decisions */}
              {topicDetails.deepDiveTopics && (
                <div id="deep-dive" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Deep Dive Topics</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.deepDiveTopics.map((item, i) => (
                      <div key={i} className="rounded border border-[var(--border)] overflow-hidden">
                        <div className="p-3 bg-[var(--accent-subtle)]">
                          <h4 className="text-sm font-bold text-[var(--accent)] mb-1 landing-display">{item.topic}</h4>
                          <div className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed">
                            <FormattedContent content={item.detail} color="blue" />
                          </div>
                        </div>
                        {item.diagramSrc && (
                          <div className="border-t border-[var(--border)] p-3 bg-white">
                            <ContentDiagram src={item.diagramSrc} alt={item.topic} />
                          </div>
                        )}
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
                    <div className="">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">System Components</h3>
                      </div>
                      <div className="pt-2">
                        <div className="flex flex-wrap gap-2">
                          {topicDetails.components.map((comp, i) => (
                            <span key={i} className="text-[10px] landing-mono px-2 py-1 rounded border bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 font-semibold">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Design Decisions — Diagram + Numbered cards */}
                  {topicDetails.keyDecisions && (
                    <div className="">
                      <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Design Decisions</h3>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.keyDecisions.length}</span>
                      </div>
                      {/* Decision architecture diagram */}
                      {(() => {
                        const diagSrc = `/diagrams/${selectedTopic}/key-decisions.png`;
                        return (
                          <div className="p-3 pb-0">
                            <img
                              src={diagSrc}
                              alt="Key Design Decisions"
                              className="w-full rounded border border-[var(--border)]"
                              style={{ maxHeight: '500px', objectFit: 'contain' }}
                              loading="lazy"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        );
                      })()}
                      <div className="pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          {topicDetails.keyDecisions.map((decision, i) => (
                            <div key={i} className="p-3 rounded border border-[var(--border)] hover:border-[var(--accent)]/20 transition-colors">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[var(--accent)] text-white landing-mono">
                                  {i + 1}
                                </span>
                              </div>
                              <p className="text-[var(--text-secondary)] text-xs leading-relaxed landing-body">{decision}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* 11. Visual Assets — comparisons, cheat sheets, charts, evolution */}
              {topicDetails.comparisonTables && topicDetails.comparisonTables.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  {topicDetails.comparisonTables.map((comp) => (
                    <ComparisonCard key={comp.id} comparison={comp} />
                  ))}
                </div>
              )}

              {topicDetails.visualCards && topicDetails.visualCards.length > 0 && (
                <div className={`grid grid-cols-1 gap-3 [&>*]:min-w-0 ${topicDetails.visualCards.length >= 3 ? 'lg:grid-cols-3' : topicDetails.visualCards.length === 2 ? 'lg:grid-cols-2' : ''}`}>
                  {topicDetails.visualCards.map((card) => (
                    <CheatSheetCard key={card.id} card={card} />
                  ))}
                </div>
              )}

              {topicDetails.evolutionSteps && topicDetails.evolutionSteps.length > 0 && (
                <EvolutionTimeline steps={topicDetails.evolutionSteps} />
              )}

              {topicDetails.charts && topicDetails.charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {topicDetails.charts.map((chart) => (
                    <ChartCard key={chart.id} chart={chart} />
                  ))}
                </div>
              )}

              {/* 12. Trade-offs + Edge Cases */}
              {topicDetails.tradeoffDecisions && (
                <div id="tradeoff-decisions" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Trade-off Decisions</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.tradeoffDecisions.map((d, i) => (
                      <div key={i} className="p-3 rounded border border-[var(--border)]">
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
                <div id="tradeoffs" className="rounded overflow-hidden scroll-mt-24 bg-white border border-[var(--border)]">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Tradeoffs</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.tradeoffs.length} decisions</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {topicDetails.tradeoffs.map((t, i) => (
                      <div key={i} className="rounded border border-[var(--border)] bg-white hover:border-[var(--border)] transition-colors overflow-hidden">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-[var(--bg-elevated)] border border-amber-500/20">
                              <Icon name="gitBranch" size={12} className="text-[var(--text-secondary)]" />
                            </span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{t.decision}</h4>
                          </div>
                          <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="px-3 py-2 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider landing-mono">Pros</span>
                              <p className="text-[var(--accent)] text-xs leading-relaxed mt-0.5 landing-body">{t.pros}</p>
                            </div>
                            <div className="px-3 py-2 rounded bg-gray-50 border border-[var(--border)]">
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
                <div id="edge-cases" className="rounded overflow-hidden scroll-mt-24 bg-white border border-[var(--border)]">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Edge Cases</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.edgeCases.length} cases</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {topicDetails.edgeCases.map((ec, i) => (
                      <div key={i} className="rounded border border-[var(--border)] bg-white transition-colors overflow-hidden">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-[var(--bg-elevated)] border border-[var(--border)]">
                              <span className="text-[10px] font-bold text-[var(--text-muted)] landing-mono">{i + 1}</span>
                            </span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{ec.scenario}</h4>
                          </div>
                          <p className="text-[var(--text-secondary)] text-xs leading-relaxed ml-8 landing-body">{ec.impact}</p>
                          <div className="ml-8 mt-2 pl-3 py-1 border-l-2 border-[var(--accent)]">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.14em] landing-mono">Mitigation</span>
                            <p className="text-[var(--text-secondary)] text-xs leading-relaxed mt-0.5 landing-body">{ec.mitigation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. Discussion Points + Interview Follow-ups */}
              {topicDetails.discussionPoints && (() => {
                const TOPIC_COLORS = ['var(--accent)'];
                return (
                <div id="discussion" className="rounded overflow-hidden scroll-mt-24 bg-white border border-[var(--border)]">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Discussion Points</h3>
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.discussionPoints.length} topics</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {topicDetails.discussionPoints.map((point, i) => {
                      const dotColor = TOPIC_COLORS[i % TOPIC_COLORS.length];
                      const isExpanded = sdExpandedDPs[i] || false;
                      const visiblePoints = point.points;
                      const hasMore = false;
                      return (
                        <div key={i} className="rounded border border-[var(--border)] bg-white hover:border-[var(--border-hover,var(--border))] transition-colors overflow-hidden">
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${dotColor}15` }}>
                                <Icon name="messageCircle" size={12} style={{ color: dotColor }} />
                              </span>
                              <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display flex-1">{point.topic}</h4>
                            </div>
                            {point.diagramSrc && (
                              <ContentDiagram src={point.diagramSrc} alt={point.topic} className="mb-3" />
                            )}
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
                <div id="followups" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Common Follow-up Questions</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.interviewFollowups.map((item, i) => (
                      <div key={i} className="rounded border border-[var(--border)] overflow-hidden">
                        <div className="flex items-start gap-2 px-3 py-2 bg-[rgba(201,162,39,0.04)] border-b border-[rgba(201,162,39,0.2)]">
                          <span className="text-xs font-bold text-[var(--warning-text)] landing-mono flex-shrink-0">Q{i + 1}</span>
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

              {/* Static Architecture Diagrams */}
              {topicDetails.staticDiagrams && topicDetails.staticDiagrams.length > 0 && (
                <StaticDiagramGrid diagrams={topicDetails.staticDiagrams} title="Architecture Diagrams" />
              )}

              {topicDetails.patternCards && topicDetails.patternCards.length > 0 && (
                <PatternCardGrid patterns={topicDetails.patternCards} title="Key Design Patterns" />
              )}

              {/* Implementation cards moved to section 5c (after architecture diagram + layered design) */}

              {topicDetails.algorithmApproaches && (
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Algorithm Approaches</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.algorithmApproaches.map((app, i) => (
                      <div key={i} className="p-3 rounded border border-[var(--border)]">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1 landing-display">{i + 1}. {app.name}</h4>
                        {app.diagramSrc && (
                          <ContentDiagram src={app.diagramSrc} alt={app.name} className="mb-2" />
                        )}
                        <div className="text-[var(--text-secondary)] text-xs mb-2 landing-body leading-relaxed"><FormattedContent content={app.description} color="amber" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                          {app.pros.map((p, j) => <div key={`p${j}`} className="text-xs text-[var(--text-secondary)] landing-body"><span className="text-[var(--accent)] font-bold mr-1">+</span>{p}</div>)}
                          {app.cons.map((c, j) => <div key={`c${j}`} className="text-xs text-[var(--text-secondary)] landing-body"><span className="text-[var(--text-muted)] font-bold mr-1">-</span>{c}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 14. Code Examples */}
              {topicDetails.codeExamples && typeof topicDetails.codeExamples === 'object' && !Array.isArray(topicDetails.codeExamples) && (
                <div id="code-examples" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Implementation Code</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {Object.entries(topicDetails.codeExamples).map(([lang, code], i) => (
                      <div key={i} className="rounded border border-[var(--border)] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" /><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" /><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" /></div>
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
                <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Key Questions</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.keyQuestions.length} topics</span>
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
                        <div key={i} className={`rounded overflow-hidden border transition-colors ${isOpen ? 'border-[var(--accent)]/20' : 'border-[var(--border)] hover:border-[var(--border-hover,var(--border))]'}`}>
                          <button
                            onClick={() => setSdExpandedQs(prev => ({ ...prev, [i]: !prev[i] }))}
                            className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-white hover:bg-[var(--bg-elevated)] transition-colors text-left"
                          >
                            <span className="w-7 h-7 rounded bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-xs font-bold flex-shrink-0 landing-mono">{i + 1}</span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm flex-1 landing-display leading-snug">{q.question}</h4>
                            <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]" style={{ borderLeft: '3px solid var(--accent)' }}>
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Interview Tips</h3>
                  </div>
                  <div className="grid gap-1 p-3">
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Core Entities</h3>
                  </div>
                  <div className="pt-2">
                    <div className="grid grid-cols-1 gap-2">
                    {topicDetails.coreEntities.map((entity, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded border border-[var(--border)]">
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Design Patterns</h3>
                  </div>
                  <div className="pt-2">
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Implementation</h3>
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
                <div id="concepts" className="scroll-mt-24 mt-14 first:mt-0">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Core Concepts</h3>
                  </div>
                  <div className="p-4 grid gap-2">
                    {topicDetails.concepts.map((concept, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{concept.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{concept.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Primitives */}
              {topicDetails.primitives && (
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Synchronization Primitives</h3>
                  </div>
                  <div className="p-4 grid gap-2">
                    {topicDetails.primitives.map((prim, i) => (
                      <div key={i} className="p-3 rounded border border-[var(--border)]">
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Classic Problems</h3>
                  </div>
                  <div className="grid gap-2 p-3">
                    {topicDetails.problems.map((problem, i) => (
                      <div key={i} className="p-4 rounded border border-[var(--border)]">
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
                <div className="">
                  <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Concurrent Data Structures</h3>
                  </div>
                  <div className="p-4 grid gap-2">
                    {topicDetails.structures.map((struct, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded bg-white border border-[var(--border)]">
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
              <section id="overview" className="scroll-mt-24 mt-14 first:mt-0">
                <h2 className="text-[20px] font-bold text-[var(--text-primary)] landing-display tracking-tight pb-3 mb-5 border-b border-[var(--border)]">Overview</h2>
                {quoteMatch ? (
                  <>
                    <div className="pl-4 border-l-2 border-[var(--accent)] mb-4">
                      <p className="text-[16px] font-medium text-[var(--text-primary)] italic landing-body leading-relaxed">"{quoteMatch[1]}"</p>
                    </div>
                    <p className="text-[var(--text-secondary)] text-[15px] leading-[1.75] landing-body">{quoteMatch[2].trim()}</p>
                  </>
                ) : (
                  <p className="text-[var(--text-secondary)] text-[15px] leading-[1.75] landing-body">{topicDetails.introduction}</p>
                )}
              </section>
            );
          })()}

          {/* 2. Key Principles — full width, separate card */}
          {topicDetails.principles && topicDetails.principles.length > 0 && (
            <section id="principles" className="scroll-mt-24">
              <div className="flex items-baseline justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] landing-mono">
                    Behavioral · Principles
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)] landing-display">
                    Key Principles
                  </h2>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] landing-mono">
                  {topicDetails.principles.length}
                </span>
              </div>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {topicDetails.principles.map((principle, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-sm landing-body text-[var(--text-secondary)]">
                    <span className="text-[10px] landing-mono text-[var(--text-muted)] tabular-nums flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 3. STAR Framework Example — learn the method BEFORE seeing questions */}
          {topicDetails.starExample && (
            <section id="star-example" className="scroll-mt-24">
              <div className="flex items-baseline justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] landing-mono">
                    Behavioral · Framework
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)] landing-display">
                    STAR Framework Example
                  </h3>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] landing-mono">
                  4 steps
                </span>
              </div>
              <ol className="mt-5 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border)]" aria-hidden="true" />
                {Object.entries(topicDetails.starExample).map(([key, value], idx) => {
                  const label = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                  const stepNum = String(idx + 1).padStart(2, '0');
                  return (
                    <li key={key} className="relative pl-9 pb-5 last:pb-0">
                      <span
                        className="absolute left-0 top-0 w-[23px] h-[23px] rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] landing-mono bg-white border border-[var(--border)]"
                        aria-hidden="true"
                      >
                        {stepNum}
                      </span>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] landing-mono">
                        {label}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)] landing-body">
                        {value}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* 4. Example Response — see the method applied */}
          {topicDetails.exampleResponse && (
            <div id="example-response" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-white/20">
                  <Icon name="messageSquare" size={12} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Example Response</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">Ready to use</span>
              </div>
              <div className="pt-2">
                <div className="pl-4 border-l-2 border-[var(--border)] space-y-3">
                  {topicDetails.exampleResponse.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-[var(--text-primary)] text-sm leading-relaxed landing-body">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
                <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center gap-5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)] landing-mono">
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" size={11} />
                    <span>~{Math.ceil(topicDetails.exampleResponse.split(' ').length / 150)} min speaking</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="type" size={11} />
                    <span>{topicDetails.exampleResponse.split(' ').length} words</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Questions & Answers — practice AFTER learning the framework */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-white/20">
                  <Icon name="messageSquare" size={12} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Questions & Answers</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.keyQuestions.length} questions</span>
              </div>
              <div className="p-2.5 space-y-2">
                {topicDetails.keyQuestions.map((item, index) => {
                  const questionKey = `behavioral-${index}`;
                  const isExpanded = expandedTheoryQuestions[questionKey] === undefined ? index < 2 : expandedTheoryQuestions[questionKey];
                  return (
                    <div key={index} className="hover:border-[var(--border-hover,var(--border))] transition-colors">
                      {/* Question header — clickable to expand/collapse */}
                      <button
                        onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !isExpanded }))}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 landing-mono bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] tabular-nums">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-[var(--text-primary)] font-semibold text-sm leading-snug landing-display flex-1">{item.question}</h4>
                        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* Answer body — expanded content with block parsing */}
                      {isExpanded && (
                        <div className="px-4 py-4 text-sm text-[var(--text-secondary)] leading-relaxed landing-body border-t border-[var(--border)]">
                          {(() => {
                            const lines = item.answer.split('\n').map(l => l.trim());

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
                              if (t.startsWith('✅') || t.startsWith('❌')) {
                                const ok = t.startsWith('✅');
                                return <div key={i} className="flex items-start gap-2 mb-1">
                                  <span className="text-[var(--text-muted)] landing-mono text-[11px] mt-0.5 flex-shrink-0">{ok ? '✓' : '✕'}</span>
                                  <span className="text-sm landing-body">{t.substring(2).trim()}</span>
                                </div>;
                              }
                              if (t.startsWith('"') && t.endsWith('"')) {
                                return <div key={i} className="pl-3 py-1 text-sm italic text-[var(--text-muted)] border-l-2 border-[var(--border)] landing-body">{t.slice(1, -1)}</div>;
                              }
                              if (t.startsWith('- ') || t.startsWith('• ')) {
                                return <div key={i} className="flex items-start gap-2.5 mb-1">
                                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] mt-2 flex-shrink-0 opacity-60" />
                                  <span className="text-sm landing-body">{t.substring(2)}</span>
                                </div>;
                              }
                              if (/^\d+\./.test(t)) {
                                const num = t.match(/^(\d+)\./)[1];
                                return <div key={i} className="flex items-start gap-3 mb-1">
                                  <span className="text-[10px] landing-mono text-[var(--text-muted)] tabular-nums mt-1 flex-shrink-0">{num.padStart(2, '0')}</span>
                                  <span className="text-sm landing-body">{t.replace(/^\d+\.\s*/, '')}</span>
                                </div>;
                              }
                              if (t.includes('**')) {
                                const parts = t.split('**');
                                return <p key={i} className="mb-1 text-sm landing-body">
                                  {parts.map((part, j) => j % 2 === 1
                                    ? <strong key={j} className="font-semibold text-[var(--text-primary)]">{part}</strong>
                                    : <span key={j}>{part}</span>
                                  )}
                                </p>;
                              }
                              if (t.match(/^(Example|Key insight|Key learning|Key takeaway|Pro tip|Tip|Note):/i)) {
                                const label = t.match(/^([^:]+):/)[1];
                                return <div key={i} className="pl-3 py-1 border-l-2 border-[var(--accent)] text-sm landing-body my-2">
                                  <span className="text-[10px] font-bold landing-mono uppercase tracking-[0.14em] text-[var(--text-muted)] block">{label}</span>
                                  <span className="text-[var(--text-secondary)]">{t.substring(label.length + 1).trim()}</span>
                                </div>;
                              }
                              return <p key={i} className="mb-1 text-sm leading-relaxed landing-body">{t}</p>;
                            };

                            const renderBlock = (block, bi) => {
                              const h = block.header;
                              if (!h && block.children.length > 0) {
                                return <div key={bi} className="space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>;
                              }
                              if (block.type === 'star') {
                                const sm = h.match(/^\*\*(?:[STAR]\s*[-–—]\s*)?(Situation|Task|Action|Result)\*\*\s*[:–—-]?\s*(.*)/i) || h.match(/^(Situation|Task|Action|Result)\s*[:–—-]\s*(.*)/i);
                                if (sm) {
                                  const kw = sm[1].charAt(0).toUpperCase() + sm[1].slice(1).toLowerCase();
                                  const headerRest = (sm[2] || '').replace(/^["“\s—–-]+|["”\s]+$/g, '').trim();
                                  return <div key={bi} className="mt-4 first:mt-0">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] landing-mono mb-1">{kw}</div>
                                    {headerRest && <p className="text-sm text-[var(--text-secondary)] landing-body leading-relaxed">{headerRest}</p>}
                                    {block.children.length > 0 && <div className="mt-1 space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>}
                                  </div>;
                                }
                              }
                              if (block.type === 'star-header') {
                                return <div key={bi} className="mt-4 first:mt-0 pb-1 border-b border-[var(--border)]">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] landing-mono">STAR</div>
                                  <div className="text-sm font-semibold text-[var(--text-primary)] landing-display">Example Response</div>
                                </div>;
                              }
                              const numMatch = h.replace(/\*\*/g, '').match(/^(\d+)\.\s*(.*)/);
                              const sectionTitle = h.replace(/\*\*/g, '').replace(/:$/, '');
                              return <div key={bi} className="mt-4 first:mt-0">
                                <div className="flex items-baseline gap-3 pb-1 border-b border-[var(--border)]">
                                  {numMatch && <span className="text-[10px] landing-mono text-[var(--text-muted)] tabular-nums">{numMatch[1].padStart(2, '0')}</span>}
                                  <span className="text-sm font-semibold text-[var(--text-primary)] landing-display">
                                    {numMatch ? numMatch[2].replace(/:$/, '') : sectionTitle}
                                  </span>
                                </div>
                                {block.children.length > 0 && <div className="mt-2 space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>}
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
            <div id="sample-questions" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-white/20">
                  <Icon name="helpCircle" size={12} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Practice Questions</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full landing-mono bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">{topicDetails.sampleQuestions.length} questions</span>
              </div>
              <div className="p-2.5 space-y-1.5">
                {topicDetails.sampleQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded border border-transparent hover:bg-[var(--bg-elevated)] hover:border-[var(--border)] transition-colors group cursor-default">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 landing-mono bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]">{i + 1}</span>
                    <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Tips for Success — final review checklist, LAST card */}
          {topicDetails.tips && (
            <div id="tips" className="scroll-mt-24 mt-14 first:mt-0">
              <div className="pb-3 mb-6 border-b border-[var(--border)] flex items-baseline gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-white/20">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Tips for Success</h3>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] landing-mono">{topicDetails.tips.length} tips</span>
              </div>
              <div className="p-2.5 space-y-1.5">
                {topicDetails.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 rounded bg-[var(--accent)]/10/40 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/10/70 hover:border-[var(--accent)]/20 transition-colors group">
                    <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-[var(--accent)]/100 text-white mt-0.5">
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
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded border border-[var(--border)] bg-white hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10/30 transition-colors group text-left"
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
            className="px-4 py-3 rounded border border-[var(--border)] bg-white hover:border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] landing-body flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            All Topics
          </button>
          {nextTopic ? (
            <button
              onClick={() => setSelectedTopic(nextTopic.id)}
              className="flex-1 flex items-center justify-end gap-3 px-4 py-3 rounded border border-[var(--border)] bg-white hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10/30 transition-colors group text-right"
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

      {/* ── Diagram Side Panel (Railway-style slide-out) ── */}
      {diagramPanelOpen && isSDStyle && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDiagramPanelOpen(false)} />

          {/* Panel */}
          <div className="fixed top-0 right-0 z-50 h-full flex flex-col" style={{ width: 'min(900px, 65vw)', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.1)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--accent)', color: '#FFFFFF' }}>
                  <Icon name="layers" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Architecture Diagram</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{topicDetails?.title}</p>
                </div>
              </div>
              <button onClick={() => setDiagramPanelOpen(false)} className="p-2 rounded hover:bg-[var(--bg-elevated)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Cloud Provider Tabs */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)]">
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
                  className="px-3 py-1.5 text-xs font-semibold rounded transition-colors"
                  style={{
                    background: diagramCloudProvider === p.id ? `${p.color}15` : 'transparent',
                    color: diagramCloudProvider === p.id ? p.color : 'var(--text-muted)',
                    border: diagramCloudProvider === p.id ? `1.5px solid ${p.color}40` : '1.5px solid var(--border)',
                  }}
                >
                  {p.label}
                </button>
              ))}

              {/* Admin regen */}
              {isAdmin && (
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => handleAdminRegen('python')} className="px-2 py-1 text-[10px] font-mono font-bold rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Python</button>
                  <button onClick={() => handleAdminRegen('eraser')} className="px-2 py-1 text-[10px] font-mono font-bold rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Eraser</button>
                  {adminRegenStatus && <span className="text-[10px] font-mono" style={{ color: adminRegenStatus.includes('done') ? 'var(--success)' : 'var(--text-primary)' }}>{adminRegenStatus}</span>}
                </div>
              )}
            </div>

            {/* Diagram Content */}
            <div className="flex-1 overflow-auto p-5">
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
        </>
      )}
    </div>
  );
}
