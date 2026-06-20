import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
import { CompanyLogo, getCompanyLogoSrc } from '../../shared/CompanyLogo.tsx';
import FormattedContent from './FormattedContent.jsx';
import YamlBreakdown from './YamlBreakdown.jsx';
import CodeBlock from '../shared/CodeBlock.jsx';
import CloudArchitectureDiagram from './CloudArchitectureDiagram.jsx';
import { ContentDiagram } from './ContentDiagram';
import OnThisPage from '../../shared/docs/OnThisPage';
import DocsTabs from '../../shared/docs/DocsTabs';
import DocsPrevNext from '../../shared/docs/DocsPrevNext';
import ZoomableImage from '../../shared/docs/ZoomableImage';
import TopicDiagram from './TopicDiagram';
import { GENERATED_LAYERED_DESIGN } from '../../../data/capra/topics/__generated/layered-design';
import { GENERATED_DIAGRAMS } from '../../../data/capra/topics/__generated/diagram-manifests';
import { getAuthHeaders } from '../../../utils/authHeaders.js';
import SharedPricingCards from '../../shared/PricingCards';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../hooks/useTheme';
import { useCelebration } from '../../shared/Celebration';
import { generateSlug, getProblemBySlug } from '../../../data/capra/problems.js';
import { useCloudFormatter } from '../../../hooks/useCloudFormatter.ts';
import CloudProviderSelector from '../../shared/CloudProviderSelector.tsx';
import {
  ComparisonCard, CheatSheetCard, EvolutionTimeline,
  PatternCardGrid, StaticDiagramGrid, FlowchartCard, ChartCard
} from './TopicVisuals.jsx';
import TopicComments from './TopicComments';
import { ContentHeading, GlassPill } from '../ui';
import Chip from '@/components/shared/ui/Chip';

/**
 * NumberChip — gold-leaf numbered capsule used for ordered lists across
 * every prepare topic surface. Replaces the tiny `text-[10px]` raw mono
 * labels that were previously scattered through Key Principles, Common
 * Mistakes, Practice Questions, numbered list items inside answer
 * bodies, etc. Single source so they all read with the same chrome.
 */
function NumberChip({ n, mt = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[28px] h-[22px] px-1.5 text-[11px] font-bold landing-mono tabular-nums flex-shrink-0 ${mt}`}
      style={{
        background: 'var(--cam-gold-leaf-50)',
        color: 'var(--cam-gold-leaf-text)',
        border: '1px solid var(--cam-gold-leaf)',
        borderRadius: '6px',
      }}
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

// Strip wrapping straight/curly quotes from a value so prose like
// `"Our recommendation engine..."` reads as plain text. Only removes a
// matched outer pair — embedded quotes inside the string survive.
function stripQuotes(s) {
  if (typeof s !== 'string') return s;
  const t = s.trim();
  if (t.length < 2) return s;
  const first = t[0], last = t[t.length - 1];
  if ((first === '"' && last === '"') || (first === '“' && last === '”') || (first === "'" && last === "'") || (first === '‘' && last === '’')) {
    return t.slice(1, -1);
  }
  return s;
}

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
      <ContentHeading title={estimation.title || 'Capacity Planning'} />
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
function DataModelSection({ schema, examples, diagramSrc }) {
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
        <ContentHeading title="Data Model" actions={<GlassPill>{tables.length} tables</GlassPill>} />
        {diagramSrc && <ContentDiagram src={diagramSrc} alt="Data model architecture" className="mb-3" />}
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
      {diagramSrc && <ContentDiagram src={diagramSrc} alt="Data model architecture" className="mb-3" />}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="database" size={14} className="text-[var(--text-muted)]" />
          <h3 className="text-[18px] font-bold text-[var(--text-primary)] landing-display tracking-tight">Data Model</h3>
        </div>
        <button
          onClick={handleCopy}
          className="text-[11px] font-medium px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors landing-mono flex items-center gap-1.5"
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

  // Static pre-generated PNG — ZoomableImage handles the
  // scroll-inside + click-to-zoom pattern for tall portrait diagrams.
  // Replaces the previous manual `expanded` state which inflated the
  // image inline and forced page scroll past it.
  if (!imgError) {
    return (
      <div>
        <ZoomableImage
          src={staticSrc}
          alt={`${topicId} ${provider.toUpperCase()} architecture diagram`}
          frameStyle={{ background: 'white' }}
          imgStyle={{ width: '100%', height: 'auto', filter: 'contrast(1.4) saturate(1.15)' }}
        />
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
  const { theme } = useTheme();
  const { celebrate } = useCelebration();
  const isAdmin = user?.email === 'chundubabu@gmail.com';
  const [adminRegenStatus, setAdminRegenStatus] = useState('');
  const [diagramPanelOpen, setDiagramPanelOpen] = useState(false);
  // Cloud-aware string translator. AWS service names in plain-text fields
  // ({topicDetails.description}, {fmtCloud(entity.description)}, etc.) get swapped to
  // the chosen cloud's equivalents at render time. FormattedContent is
  // already wrapped, so this only matters for fields that bypass it.
  const fmtCloud = useCloudFormatter();

  // Layered-design fallback: when a topic data file doesn't carry an inline
  // `layeredDesign` array, fall through to the build-time generated map
  // populated by apps/frontend/scripts/extract-layered-design.mjs (Phase 1
  // of the diagram pipeline). TopicDiagram uses topicId + the same
  // shape via the pre-baked PNG, so the runtime path is invisible.
  // NOTE: null-guarded here because the early return was moved below all hooks
  // to avoid React rules-of-hooks violation (hooks at lines 553–703 must run
  // unconditionally regardless of topicDetails).
  const effectiveLayeredDesign = topicDetails
    ? (Array.isArray(topicDetails.layeredDesign) && topicDetails.layeredDesign.length)
      ? topicDetails.layeredDesign
      : (selectedTopic && GENERATED_LAYERED_DESIGN[selectedTopic])
        ? GENERATED_LAYERED_DESIGN[selectedTopic]
        : null
    : null;

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

  // Ref-based deduplication so markTopicRead fires at most once per
  // (page, topic) pair regardless of how many times the effect runs.
  // contentAccess is read from a ref to avoid adding it to deps — it
  // previously caused error #300 because the hook returned a new plain
  // object literal every render, making this effect fire every render.
  const contentAccessRef = useRef(contentAccess);
  contentAccessRef.current = contentAccess; // sync ref update — avoids a no-deps effect that ran every render
  const lastReadRef = useRef(null);
  useEffect(() => {
    const key = `${activePage}::${selectedTopic}`;
    if (!isLocked && contentAccessRef.current && activePage && selectedTopic && lastReadRef.current !== key) {
      lastReadRef.current = key;
      contentAccessRef.current.markTopicRead(activePage, selectedTopic);
    }
  }, [selectedTopic, activePage, isLocked]);

  // The Databases page merges databaseTopics (SD-shaped) with sqlTopics
  // (coding-shaped). Detect each topic's shape so the right render branch
  // fires for each one — otherwise SQL topics show only a hero and no body.
  const topicIsCodingShaped = !!topicDetails?.keyPatterns;
  // Pages that use system-design-style rendering (concepts, keyQuestions, dataModel, etc.)
  const isSDStyle = ['system-design', 'microservices', 'databases'].includes(activePage) && !topicIsCodingShaped;
  // SQL uses coding/DSA-style rendering (whenToUse, approach, commonProblems, etc.)
  const isCodingStyle = activePage === 'coding' || activePage === 'sql' || (activePage === 'databases' && topicIsCodingShaped);

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
      const _genDiagrams = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
      if (_genDiagrams?.deepDives?.length)  s.push({ id: 'deep-dives',      label: 'Deep Dives',       children: _genDiagrams.deepDives.map(d => trunc(d.title, 30)) });
      if (_genDiagrams?.tradeoffs?.length)  s.push({ id: 'design-decisions', label: 'Design Decisions', children: _genDiagrams.tradeoffs.map(t => trunc(t.title, 30)) });
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
      if (topicDetails.tips) s.push({ id: 'tips', label: 'Study Tips' });
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
      if (topicDetails.interviewRelevance?.length) s.push({ id: 'relevance', label: 'Why It Matters' });
      if (topicDetails.keyQuestions?.length) s.push({ id: 'key-questions', label: 'Key Questions' });
    }
    return s;
  }, [topicDetails, activePage, isSDStyle, isCodingStyle]);

  // OnThisPage primitive owns the scroll-spy now — drop the local observer +
  // scrollProgress state. Drop nested-children-on-active too: NVIDIA's docs
  // use a flat single-level rail, and the children context still renders
  // inside the actual section content below.
  const onThisPageItems = useMemo(
    () => tocSections.map((s) => ({ id: s.id, label: s.label })),
    [tocSections],
  );

  // All hooks have been called — safe to exit early now.
  if (!topicDetails) return null;

  return (
    <div className="landing-root animate-fade-in flex">
      {/* Right: Topic content (rendered first; OnThisPage rail anchors to
          the right per NVIDIA-style docs convention).
          `prep-content` opts this surface into the docs design system —
          headings/p/li/code/pre/lists/links picked up via globals.css.
          The CSS uses direct-child + section-wrapper + .prep-section-heading
          marker selectors so deeply-nested bespoke chrome (Data Model
          card field labels, Code Example dark theme, scope cards) is
          NOT auto-restyled. Use <h2/h3/h4 className="prep-section-heading">
          to opt a specific heading into the navy-strip + hex-glyph
          treatment. */}
      <div className="prep-content flex-1 min-w-0">
      {/* Topic Header — navy-strip + gold-leaf-border + glassy-pill capsules,
          matching the docs design system across every topic surface. */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          {/* Breadcrumb sits above the navy strip in neutral text. */}
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
        <div
          className="rounded-md overflow-hidden"
          style={{
            background: 'var(--cam-hero-strip)',
            borderBottom: '1px solid var(--cam-gold-leaf)',
          }}
        >
          <div className="px-4 py-3 flex items-start gap-3">
            {getCompanyLogoSrc(selectedTopic) ? (
              <CompanyLogo topicId={selectedTopic} size={36} />
            ) : (
              <div
                className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)' }}
              >
                <Icon name={topicDetails.icon} size={18} style={{ color: theme === 'light' ? 'var(--accent)' : '#FFFFFF' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[22px] font-bold landing-display tracking-tight" style={{ textWrap: 'balance', color: 'var(--cam-strip-heading)' }}>{topicDetails.title}</h1>
                {topicDetails.isNew && (
                  <Chip>NEW</Chip>
                )}
                {topicDetails.difficulty && (
                  <Chip>{topicDetails.difficulty}</Chip>
                )}
                {(() => {
                  // Derive the count from the content actually rendered so
                  // the pill never lies. Static `questions: 6` fields lag
                  // behind real keyQuestions/sampleQuestions arrays as
                  // content gets added or removed.
                  const actual = (Array.isArray(topicDetails.keyQuestions) ? topicDetails.keyQuestions.length : 0)
                    + (Array.isArray(topicDetails.sampleQuestions) ? topicDetails.sampleQuestions.length : 0)
                    + (Array.isArray(topicDetails.problems) ? topicDetails.problems.length : 0);
                  const count = actual || (typeof topicDetails.questions === 'number' ? topicDetails.questions : 0);
                  if (!count) return null;
                  return (
                    <Chip>{count} {count === 1 ? 'problem' : 'problems'}</Chip>
                  );
                })()}
                {isSDStyle && <CloudProviderSelector variant="compact" className="ml-1" />}
                {isSDStyle && (
                  <Link
                    to={`/capra/design?problem=${encodeURIComponent(`Design ${topicDetails.title}. ${topicDetails.description || topicDetails.subtitle || ''}`)}&autosolve=true`}
                    className="ml-auto px-3 py-1.5 rounded text-sm font-medium bg-[var(--cam-gold-leaf)] hover:opacity-90 transition-opacity flex items-center gap-2 flex-shrink-0 landing-body"
                    style={{ color: '#1A0C00' }}
                  >
                    <Icon name="zap" size={14} />
                    Design
                  </Link>
                )}
              </div>
              {topicDetails.description && (
                <p className="text-[14px] mt-1.5 landing-body leading-relaxed" style={{ color: 'var(--cam-strip-text)' }}>{fmtCloud(topicDetails.description)}</p>
              )}
              {topicDetails.subtitle && !topicDetails.difficulty && (
                <p className="text-[12px] mt-1 landing-body" style={{ color: 'var(--cam-strip-text-muted)' }}>{fmtCloud(topicDetails.subtitle)}</p>
              )}
              <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap text-[10px] uppercase tracking-[0.12em] landing-mono" style={{ color: 'var(--cam-strip-text-muted)' }}>
                {pageConfig?.title && <span>{pageConfig.title}</span>}
                <span>ID · {selectedTopic}</span>
                {(activePage === 'behavioral' || activePage === 'low-level' || isSDStyle) && (
                  <>
                    {topicDetails.keyQuestions && (
                      <span className="flex items-center gap-1">
                        <Icon name="messageSquare" size={10} />
                        {topicDetails.keyQuestions.length} questions
                      </span>
                    )}
                    {topicDetails.tips && (
                      <span className="flex items-center gap-1">
                        <Icon name="lightbulb" size={10} />
                        {topicDetails.tips.length} tips
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={10} />
                      ~{Math.max(3, Math.ceil(((topicDetails.introduction || '').length + (topicDetails.keyQuestions || []).reduce((a, q) => a + (q.answer || '').length, 0)) / 1200))} min read
                    </span>
                    {topicDetails.starExample && (
                      <span className="flex items-center gap-1" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
                        <Icon name="star" size={10} />
                        STAR example
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Toolbar with Progress ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 mb-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {/* Progress */}
          {progressInfo && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
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
              <ContentHeading title="Introduction" />
              <div className="pt-2">
                <div className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed w-full">
                  <FormattedContent content={topicDetails.introduction} color="blue" />
                </div>
              </div>
            </div>
          )}

          {/* Preview: key concepts */}
          {topicDetails.concepts && topicDetails.concepts.length > 0 && (
            <div className="mb-3">
              <ContentHeading title="Key Concepts" />
              <div className="p-3 flex flex-wrap gap-1.5">
                {topicDetails.concepts.map((concept, i) => (
                  <Chip key={i}>{concept}</Chip>
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
                <ContentHeading title="Key Questions" pills={[`${previewCount} of ${topicDetails.keyQuestions.length}`]} />
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
                <div className="w-12 h-12 mx-auto mb-3 rounded flex items-center justify-center" style={{ background: 'var(--cam-accent-fill)', color: 'var(--cam-accent-fill-text)' }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
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
              className="flex-1 px-3 py-2.5 rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none border border-[var(--border)] bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]/50 landing-body"
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
              <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-2">
                <Icon name="bookOpen" size={14} className="text-[var(--text-muted)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] landing-display">{topicDetails.title}</h3>
                <Chip>{topicDetails.articles?.length || topicDetails.questions} articles</Chip>
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
              <ContentHeading title="Articles" pills={[topicDetails.articles.length]} />
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
                    <Icon name="externalLink" size={12} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="Key Takeaways" />
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
              <ContentHeading
                title="Overview"
                pills={[
                  `${topicDetails.phases?.length || 0} phases`,
                  `${topicDetails.phases?.reduce((a, p) => a + p.topics.length, 0) || 0} topics total`,
                ]}
              />
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
              <ContentHeading
                title={`${topicDetails.title} Roadmap`}
                pills={[`${topicDetails.phases.length} phases, ${topicDetails.phases.reduce((a, p) => a + p.topics.length, 0)} topics`]}
              />

              {/* Horizontal flow — phase badges connected by arrows */}
              <div className="px-4 py-4 border-b border-[var(--border)] overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                  {topicDetails.phases.map((phase, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <a href={`#phase-${i}`} className="px-3 py-1.5 rounded text-[11px] font-bold text-white whitespace-nowrap landing-display hover:opacity-90 transition-opacity" style={{ background: phase.color }}>
                        {phase.title}
                      </a>
                      {i < topicDetails.phases.length - 1 && (
                        <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    <div className="px-4 py-3 bg-[var(--bg-elevated)] flex flex-wrap gap-2">
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
              <ContentHeading title="FAQ" />
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
        <div className="space-y-4">
          {/* Header: Difficulty + Tech Stack + Time */}
          <div id="overview" className="scroll-mt-24 rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
            <ContentHeading title="Project Overview" />
            <div className="px-4 pb-4">
              {/* Difficulty + Time badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Chip variant={
                  topicDetails.difficulty === 'beginner' ? 'easy' :
                  topicDetails.difficulty === 'intermediate' ? 'medium' :
                  'hard'
                }>{topicDetails.difficulty}</Chip>
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
                    <Chip key={tech}>{tech}</Chip>
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
            <div id="learning-objectives" className="scroll-mt-24 rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
              <ContentHeading title="What You'll Learn" />
              <div className="px-4 pb-4">
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
            <div id="relevance" className="rounded-lg overflow-hidden scroll-mt-24 border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
              <ContentHeading title="Why It Matters" />
              <div className="px-4 pb-4">
                <p className="text-sm text-[var(--text-secondary)] landing-body leading-relaxed">{topicDetails.interviewRelevance}</p>
              </div>
            </div>
          )}

          {/* Key Questions */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="scroll-mt-24 rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
              <ContentHeading title="Key Questions" pills={[topicDetails.keyQuestions.length]} />
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
              <ContentHeading title="Overview" />
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
              <ContentHeading title="Key Patterns" actions={<GlassPill>{topicDetails.keyPatterns.length}</GlassPill>} />
              <div className="pt-2">
                <div className="flex flex-wrap gap-2">
                  {topicDetails.keyPatterns.map((pattern, i) => (
                    <Chip key={i}>{pattern}</Chip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. When to Use — when to apply */}
          {topicDetails.whenToUse && (
            <div id="when-to-use" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="When to Use" actions={<GlassPill>{topicDetails.whenToUse.length}</GlassPill>} />
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.whenToUse.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded hover:bg-[var(--bg-elevated)] transition-colors landing-body">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="check" size={10} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed"><FormattedContent content={item} inline /></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Visual Explanation — see it */}
          {topicDetails.visualizations && topicDetails.visualizations.length > 0 && (
            <div id="visual" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="Visual Explanation" pills={[topicDetails.visualizations.length]} />
              <div className={`p-4 grid gap-4 ${topicDetails.visualizations.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {topicDetails.visualizations.map((viz, vi) => (
                  <div key={vi} className="rounded border border-[var(--border)] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
                      <h4 className="text-xs font-semibold text-[var(--text-secondary)] landing-display">{viz.title}</h4>
                      {viz.description && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 landing-body">{fmtCloud(viz.description)}</p>}
                    </div>
                    <div className="p-3 flex justify-center items-center bg-[var(--bg-surface)]" dangerouslySetInnerHTML={{ __html: viz.svg.replace('style="background:white"', 'style="background:white;width:100%;height:auto;display:block"') }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Step-by-Step Approach — how to solve */}
          {topicDetails.approach && (
            <div id="approach" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="Step-by-Step Approach" actions={<GlassPill>{topicDetails.approach.length}</GlassPill>} />
              <div className="pt-2">
                <div className="relative">
                  {topicDetails.approach.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 relative">
                      {i < topicDetails.approach.length - 1 && (
                        <div className="absolute left-[11px] top-6 w-0.5 bg-[var(--accent)]/30" style={{ height: 'calc(100% - 4px)' }} />
                      )}
                      <div className="w-6 h-6 rounded-full bg-[var(--accent)]/100 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 z-10 landing-mono">{i + 1}</div>
                      <div className="text-sm text-[var(--text-secondary)] leading-relaxed pb-4 landing-body"><FormattedContent content={step} inline /></div>
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
                    <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
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
                    <div className="w-8 h-8 rounded bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
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
            <div id="code-examples" className="scroll-mt-24">
              <CodeBlock code={topicDetails.codeExample} lang={topicDetails.codeLanguage || 'python'} />
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
                                  className={`text-[10px] landing-mono px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${isActive ? `text-${c}-300 bg-${c}-900/50 border-${c}-700/50` : 'text-[var(--text-muted)] bg-transparent border-[var(--border)] hover:text-[var(--text-muted)]'}`}
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
                          <p className="text-xs text-[var(--text-muted)] landing-body">{fmtCloud(activeEx.description)}</p>
                        </div>
                      )}
                      <CodeBlock code={activeEx.code} lang={activeEx.language || 'python'} bare />
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 8. Common Mistakes — avoid pitfalls */}
          {topicDetails.commonMistakes && (
            <div id="common-mistakes" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="Common Mistakes" actions={<GlassPill>{topicDetails.commonMistakes.length}</GlassPill>} />
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.commonMistakes.map((mistake, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-b-0">
                    <NumberChip n={i + 1} mt="mt-0.5" />
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body"><FormattedContent content={mistake} inline /></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Practice Problems — self practice */}
          {topicDetails.commonProblems && (
            <div id="practice" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="Practice Problems" actions={<GlassPill>{topicDetails.commonProblems.length}</GlassPill>} />
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

                  const problemText = problemData?.description || `Solve: ${problemName}`;
                  const isSqlTopic = activePage === 'sql' || (typeof selectedTopic === 'string' && selectedTopic.startsWith('sql-'));
                  const href = isSqlTopic
                    ? `/capra/practice?view=sql-editor&sqlProblem=${encodeURIComponent(problemName)}`
                    : `/capra/coding?problem=${encodeURIComponent(problemText)}&autosolve=true`;

                  return (
                    <Link
                      key={i}
                      to={href}
                      className={`grid grid-cols-[32px_1fr_64px_72px] items-center px-3 py-2.5 transition-colors cursor-pointer group hover:bg-[var(--bg-elevated)] ${i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-elevated)]'} ${i < topicDetails.commonProblems.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                    >
                      <span className="text-xs text-[var(--text-muted)] landing-mono">{i + 1}</span>
                      <span className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors landing-body pr-2">{problemName}</span>
                      <span className="flex justify-center">
                        {difficulty ? (
                          <Chip variant={
                            difficulty === 'Easy' ? 'easy' :
                            difficulty === 'Medium' ? 'medium' :
                            'hard'
                          }>{difficulty}</Chip>
                        ) : <span className="text-[var(--text-muted)] text-xs">—</span>}
                      </span>
                      <span className="flex justify-center">
                        <Chip variant="default">Solve</Chip>
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
              <ContentHeading
                title="Theory Questions"
                pills={[topicDetails.theoryQuestions.length]}
                actions={
                  <button
                    className="text-[10px] landing-mono text-white/85 hover:text-white transition-colors font-medium"
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
                }
              />
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
                            <Chip variant={
                              q.difficulty === 'Easy' ? 'easy' :
                              q.difficulty === 'Medium' ? 'medium' :
                              'hard'
                            } className="flex-shrink-0">{q.difficulty}</Chip>
                          )}
                          <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && q.answer && (
                          <div className="px-3 pb-3 pt-1 border-t border-[var(--border)]">
                            <div className="pl-8 text-[var(--text-secondary)] text-sm leading-relaxed p-3 landing-body">
                              <FormattedContent content={q.answer} />
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

          {/* 11. Tips & Study Tips — final checklist */}
          {(topicDetails.tips || topicDetails.interviewTips) && (
            <div id="tips" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading title="Tips & Checklist" actions={<GlassPill>PRO</GlassPill>} />
              <div className="p-3 grid grid-cols-1 gap-1.5">
                {topicDetails.tips && topicDetails.tips.map((tip, i) => (
                  <div key={`tip-${i}`} className="flex items-start gap-2.5 p-2 rounded hover:bg-[var(--bg-elevated)] transition-colors">
                    <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon name="check" size={10} className="text-[var(--accent)]" />
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body"><FormattedContent content={tip} inline /></span>
                  </div>
                ))}
                {topicDetails.interviewTips && topicDetails.interviewTips.map((tip, i) => (
                  <div key={`itip-${i}`} className="flex items-start gap-3 p-2 rounded transition-colors hover:bg-[var(--bg-elevated)]/60">
                    <Icon name="lightbulb" size={12} className="text-[var(--text-muted)] flex-shrink-0 mt-1" />
                    <span className="text-sm text-[var(--text-secondary)] leading-relaxed landing-body"><FormattedContent content={tip} inline /></span>
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
                              className="img-bespoke rounded border border-[var(--border)]"
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
                          <div className="p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border)]">
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
                  <ContentHeading title={topicDetails.productMeta ? 'Why This Design Problem?' : 'Introduction'} />
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
                  <ContentHeading title="Key Concepts" />
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {topicDetails.concepts.map((concept, i) => (
                      <Chip key={i}>{concept}</Chip>
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
                  <ContentHeading
                    title="Functional Requirements"
                    actions={<GlassPill>{(topicDetails.functionalRequirements || topicDetails.requirements).length} requirements</GlassPill>}
                  />
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
                    <ContentHeading
                      title="Non-Functional Requirements"
                      actions={<GlassPill>{topicDetails.nonFunctionalRequirements.length} requirements</GlassPill>}
                    />
                    <div className="pt-2">
                      <div className="grid grid-cols-1 gap-1.5">
                        {topicDetails.nonFunctionalRequirements.map((req, i) => {
                          // Extract metric-like values from the requirement text (e.g., "<3s", "99.9%", "1M")
                          const metricMatch = req.match(/([<>~]?\d+\.?\d*\s*(?:ms|s|%|M|K|GB|TB|MB|req\/s|QPS|RPS|rpm|tps)?)/i);
                          return (
                            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded hover:bg-[var(--bg-elevated)] transition-colors cursor-default">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-[var(--bg-elevated)] text-[var(--text-secondary)] mt-0.5">
                                  <Icon name="zap" size={10} className="text-[var(--text-secondary)]" />
                                </span>
                                <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed flex-1">{req}</span>
                              </div>
                              {metricMatch && (
                                <Chip className="flex-shrink-0">{metricMatch[1].trim()}</Chip>
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
                    className="w-full flex items-center justify-between px-5 py-4 rounded border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors hover:border-[var(--accent)] group"
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
                  <ContentHeading title="Architecture Layers" />
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

              {effectiveLayeredDesign && (
                <div className="">
                  <ContentHeading
                    title="Layered Design"
                    actions={<GlassPill>{effectiveLayeredDesign.length} layers</GlassPill>}
                  />
                  <TopicDiagram
                    topicId={topicDetails.id || selectedTopic}
                    kind="layered"
                    alt="Layered Design"
                    caption="Layered Design"
                    className="mb-3"
                  />
                  <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 mt-1 landing-mono uppercase tracking-widest">Layer Breakdown</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {effectiveLayeredDesign.map((layer, i) => (
                      <div key={i}>
                        {i > 0 && <div style={{ height: 1, background: 'var(--border)' }} />}
                        <div className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors">
                          <span
                            className="flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                            style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--cam-gold-leaf)', border: '1px solid var(--border)' }}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-[var(--text-primary)] landing-display">{layer.name}</span>
                            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-0.5 landing-body">{layer.purpose}</p>
                            {layer.components && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {layer.components.map((comp, j) => (
                                  <Chip key={j}>{comp}</Chip>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5b-extra. Deep Dives — generated by research pipeline */}
              {(() => {
                const gen = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
                if (!gen?.deepDives?.length) return null;
                return (
                  <div id="deep-dives" className="scroll-mt-24 mt-14">
                    <ContentHeading
                      title="Deep Dives"
                      actions={<GlassPill>{gen.deepDives.length}</GlassPill>}
                    />
                    <div className="space-y-8 mt-4">
                      {gen.deepDives.map(d => (
                        <div key={d.id}>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 landing-mono uppercase tracking-widest">{d.title}</p>
                          <TopicDiagram
                            topicId={topicDetails.id || selectedTopic}
                            kind={`deep-dive-${d.id}`}
                            alt={d.title}
                            caption={d.title}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 5b-extra. Design Decisions — generated by research pipeline */}
              {(() => {
                const gen = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
                if (!gen?.tradeoffs?.length) return null;
                return (
                  <div id="design-decisions" className="scroll-mt-24 mt-14">
                    <ContentHeading
                      title="Design Decisions"
                      actions={<GlassPill>{gen.tradeoffs.length}</GlassPill>}
                    />
                    <div className="space-y-8 mt-4">
                      {gen.tradeoffs.map(t => (
                        <div key={t.id}>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 landing-mono uppercase tracking-widest">{t.title}</p>
                          <TopicDiagram
                            topicId={topicDetails.id || selectedTopic}
                            kind={`tradeoff-${t.id}`}
                            alt={t.title}
                            caption={t.title}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 5c. Basic + Advanced Implementation — right after layered design, before flows */}
              {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
                <div id="implementation" className="grid grid-cols-1 gap-6 scroll-mt-24">
                  {topicDetails.basicImplementation && (
                    <div className="">
                      <ContentHeading
                        title={topicDetails.basicImplementation.title || 'Basic Approach'}
                        pills={['Basic']}
                      />
                      <div className="pt-2">
                        <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed landing-body">{topicDetails.basicImplementation.description}</p>
                        {topicDetails.basicImplementation.components && !topicDetails.basicImplementation.diagramSrc && !topicDetails.basicImplementation.svgTemplate ? (
                          <TopicDiagram
                            topicId={topicDetails.id || selectedTopic}
                            kind="architecture-basic"
                            alt={topicDetails.basicImplementation.title || 'Basic Architecture'}
                            caption={topicDetails.basicImplementation.title || 'Basic Architecture'}
                            className="mb-3"
                          />
                        ) : (
                          <ContentDiagram
                            src={topicDetails.basicImplementation.diagramSrc}
                            template={topicDetails.basicImplementation.svgTemplate}
                            alt={topicDetails.basicImplementation.title || 'Basic Architecture'}
                            className="mb-3"
                          />
                        )}
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
                      <ContentHeading
                        title={topicDetails.advancedImplementation.title || 'Scalable Solution'}
                        pills={['Advanced']}
                      />
                      <div className="pt-2">
                        <p className="text-[var(--text-secondary)] text-sm mb-3 leading-relaxed landing-body">{topicDetails.advancedImplementation.description}</p>
                        {topicDetails.advancedImplementation.components && !topicDetails.advancedImplementation.diagramSrc && !topicDetails.advancedImplementation.svgTemplate ? (
                          <TopicDiagram
                            topicId={topicDetails.id || selectedTopic}
                            kind="architecture-advanced"
                            alt={topicDetails.advancedImplementation.title || 'Advanced Architecture'}
                            caption={topicDetails.advancedImplementation.title || 'Advanced Architecture'}
                            className="mb-3"
                          />
                        ) : (
                          <ContentDiagram
                            src={topicDetails.advancedImplementation.diagramSrc}
                            template={topicDetails.advancedImplementation.svgTemplate}
                            alt={topicDetails.advancedImplementation.title || 'Advanced Architecture'}
                            className="mb-3"
                          />
                        )}
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
                      <ContentHeading title={topicDetails.createFlow.title} />
                      {topicDetails.createFlow.diagramSrc ? (
                        <div className="pt-2">
                          <ContentDiagram src={topicDetails.createFlow.diagramSrc} alt={topicDetails.createFlow.title} />
                        </div>
                      ) : (
                        <div className="pt-2">
                          {topicDetails.createFlow.steps && topicDetails.createFlow.steps.length > 0 && (
                            <TopicDiagram
                              topicId={topicDetails.id || selectedTopic}
                              kind="flow-createFlow"
                              alt={topicDetails.createFlow.title}
                              caption={topicDetails.createFlow.title}
                              className="mb-3"
                            />
                          )}
                          <ol className="space-y-1">
                            {topicDetails.createFlow.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 py-1">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] landing-mono mt-0.5">{i + 1}</span>
                                <span className="text-[var(--text-secondary)] text-sm landing-body"><FormattedContent content={step} inline /></span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                  {topicDetails.redirectFlow && (
                    <div className="">
                      <ContentHeading title={topicDetails.redirectFlow.title} />
                      {topicDetails.redirectFlow.diagramSrc ? (
                        <div className="pt-2">
                          <ContentDiagram src={topicDetails.redirectFlow.diagramSrc} alt={topicDetails.redirectFlow.title} />
                        </div>
                      ) : (
                        <div className="pt-2">
                          {topicDetails.redirectFlow.steps && topicDetails.redirectFlow.steps.length > 0 && (
                            <TopicDiagram
                              topicId={topicDetails.id || selectedTopic}
                              kind="flow-redirectFlow"
                              alt={topicDetails.redirectFlow.title}
                              caption={topicDetails.redirectFlow.title}
                              className="mb-3"
                            />
                          )}
                          <ol className="space-y-1">
                            {topicDetails.redirectFlow.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 py-1">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] landing-mono mt-0.5">{i + 1}</span>
                                <span className="text-[var(--text-secondary)] text-sm landing-body"><FormattedContent content={step} inline /></span>
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
                      <ContentHeading
                        title="API Design"
                        actions={<GlassPill>{topicDetails.apiDesign.endpoints.length} endpoints</GlassPill>}
                      />
                      <div className="pt-2">
                        <div className="grid grid-cols-1 gap-2">
                          {topicDetails.apiDesign.endpoints.map((endpoint, i) => (
                            <div key={i} className="rounded p-3.5 border border-[var(--border)] hover:border-[var(--border-hover,var(--border))]  transition-colors">
                              <div className="flex items-center gap-2.5 mb-2">
                                <span className={`text-[10px] landing-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-surface)] uppercase tracking-[0.14em] ${
                                  endpoint.method === 'GET' ? 'font-medium text-[var(--text-muted)]' :
                                  endpoint.method === 'POST' || endpoint.method === 'INSERT' ? 'font-semibold text-[var(--text-primary)]' :
                                  endpoint.method === 'PUT' || endpoint.method === 'UPDATE' ? 'font-semibold text-[var(--text-primary)]' :
                                  'font-bold text-[var(--accent)]'
                                }`}>{endpoint.method}</span>
                                <code className="text-[var(--text-primary)] landing-mono text-sm font-medium">{endpoint.path}</code>
                              </div>
                              {endpoint.description && (
                                <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>{fmtCloud(endpoint.description)}</p>
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
                    <DataModelSection schema={topicDetails.dataModel.schema} examples={topicDetails.dataModel.examples} diagramSrc={topicDetails.dataModel.diagramSrc} />
                  )}
                </div>
              )}

              {/* (Implementation + Algorithms moved to after trade-offs) */}

              {/* 10. Deep Dive Topics + System Components + Key Design Decisions */}
              {topicDetails.deepDiveTopics && (
                <div id="deep-dive" className="scroll-mt-24 mt-14 first:mt-0">
                  <ContentHeading title="Deep Dive Topics" />
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
                          <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-elevated)]">
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
                      <ContentHeading title="System Components" />
                      <div className="pt-2">
                        <div className="flex flex-wrap gap-2">
                          {topicDetails.components.map((comp, i) => (
                            <Chip key={i}>{comp}</Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Design Decisions — Diagram + Numbered cards */}
                  {topicDetails.keyDecisions && (
                    <div className="">
                      <ContentHeading
                        title="Key Design Decisions"
                        actions={<GlassPill>{topicDetails.keyDecisions.length}</GlassPill>}
                      />
                      {/* Decision architecture diagram — wrapped in
                          ZoomableImage so tall portrait Graphviz PNGs
                          scroll inside their own viewport instead of
                          dominating the page; click-to-zoom opens the
                          full image in a lightbox for unhindered
                          reading. */}
                      {(() => {
                        const diagSrc = `/diagrams/${selectedTopic}/key-decisions.png`;
                        return (
                          <div className="p-3 pb-0">
                            <ZoomableImage
                              src={diagSrc}
                              alt="Key Design Decisions"
                              imgStyle={{ width: '100%', height: 'auto' }}
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
                  <ContentHeading title="Trade-off Decisions" />
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.tradeoffDecisions.map((d, i) => (
                      <div key={i} className="p-3 rounded border border-[var(--border)]">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-secondary)] landing-mono">{d.choice}</span>
                          <span className="text-[var(--text-muted)]">→</span>
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
                <div id="tradeoffs" className="rounded overflow-hidden scroll-mt-24 bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <ContentHeading
                    title="Tradeoffs"
                    actions={<GlassPill>{topicDetails.tradeoffs.length} decisions</GlassPill>}
                  />
                  <div className="p-2.5 space-y-2">
                    {topicDetails.tradeoffs.map((t, i) => (
                      <div key={i} className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border)] transition-colors overflow-hidden">
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
                            <div className="px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border)]">
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
                <div id="edge-cases" className="rounded overflow-hidden scroll-mt-24 bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <ContentHeading
                    title="Edge Cases"
                    actions={<GlassPill>{topicDetails.edgeCases.length} cases</GlassPill>}
                  />
                  <div className="p-2.5 space-y-2">
                    {topicDetails.edgeCases.map((ec, i) => (
                      <div key={i} className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors overflow-hidden">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-[var(--bg-elevated)] border border-[var(--border)]">
                              <span className="text-[10px] font-bold text-[var(--text-muted)] landing-mono">{i + 1}</span>
                            </span>
                            <h4 className="text-[var(--text-primary)] font-semibold text-sm landing-display">{ec.scenario}</h4>
                          </div>
                          <p className="text-[var(--text-secondary)] text-xs leading-relaxed ml-8 landing-body">{fmtCloud(ec.impact)}</p>
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
                <div id="discussion" className="rounded overflow-hidden scroll-mt-24 bg-[var(--bg-elevated)] border border-[var(--border)]">
                  <ContentHeading
                    title="Discussion Points"
                    actions={<GlassPill>{topicDetails.discussionPoints.length} topics</GlassPill>}
                  />
                  <div className="p-2.5 space-y-2">
                    {topicDetails.discussionPoints.map((point, i) => {
                      const dotColor = TOPIC_COLORS[i % TOPIC_COLORS.length];
                      const isExpanded = sdExpandedDPs[i] || false;
                      const visiblePoints = point.points;
                      const hasMore = false;
                      return (
                        <div key={i} className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover,var(--border))] transition-colors overflow-hidden">
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
                  <ContentHeading title="Common Follow-up Questions" />
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
                  <ContentHeading title="Algorithm Approaches" />
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

              {/* 14. Code Examples — NVIDIA-style language-tabbed code block.
                  Each language entry becomes a tab; active tab content renders
                  inside DocsTabs's accent-bordered panel. Copy button moves
                  into the panel header so the tabs row stays clean. */}
              {topicDetails.codeExamples && typeof topicDetails.codeExamples === 'object' && !Array.isArray(topicDetails.codeExamples) && (
                <div id="code-examples" className="scroll-mt-24 mt-14 first:mt-0">
                  <ContentHeading title="Implementation Code" />
                  <DocsTabs
                    tabs={Object.entries(topicDetails.codeExamples).map(([lang, code]) => ({
                      id: lang,
                      label: lang.charAt(0).toUpperCase() + lang.slice(1),
                      content: (
                        <CodeBlock code={String(code)} lang={lang} bare />
                      ),
                    }))}
                  />
                </div>
              )}

              {/* 15. Key Questions — Accordion (self-test/review) */}
              {topicDetails.keyQuestions && (
                <div id="key-questions" className="scroll-mt-24 mt-14 first:mt-0">
                  <ContentHeading
                    title="Key Questions"
                    pills={[`${topicDetails.keyQuestions.length} topics`]}
                    actions={
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
                        className="text-[11px] font-medium text-white/85 hover:text-white transition-colors landing-mono flex items-center gap-1"
                      >
                        {sdAllQsExpanded ? 'Collapse all' : 'Expand all'}
                        <svg className={`w-3 h-3 transition-transform ${sdAllQsExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    }
                  />
                  <div className="p-2.5 space-y-1.5">
                    {topicDetails.keyQuestions.map((q, i) => {
                      const isOpen = sdExpandedQs[i] || false;
                      return (
                        <div key={i} className={`rounded overflow-hidden border transition-colors ${isOpen ? 'border-[var(--accent)]/20' : 'border-[var(--border)] hover:border-[var(--border-hover,var(--border))]'}`}>
                          <button
                            onClick={() => setSdExpandedQs(prev => ({ ...prev, [i]: !prev[i] }))}
                            className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
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

              {/* 16. Study Tips — very last SD card */}
              {topicDetails.tips && (
                <div className="">
                  <ContentHeading title="Study Tips" />
                  <div className="grid gap-1 p-3">
                    {topicDetails.tips.map((tip, i) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-elevated)] transition-colors rounded">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)]">★</span>
                        <span className="text-[var(--text-muted)] text-sm landing-body"><FormattedContent content={tip} inline /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 17. LLD sections */}
              {/* LLD Core Entities */}
              {topicDetails.coreEntities && (
                <div className="">
                  <ContentHeading title="Core Entities" />
                  <div className="pt-2">
                    <div className="grid grid-cols-1 gap-2">
                    {topicDetails.coreEntities.map((entity, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{entity.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{fmtCloud(entity.description)}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LLD Design Patterns */}
              {topicDetails.designPatterns && (
                <div className="">
                  <ContentHeading title="Design Patterns" />
                  <div className="pt-2">
                    <ul className="grid grid-cols-1 gap-1">
                      {topicDetails.designPatterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2 rounded hover:bg-[var(--bg-elevated)] transition-colors">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-[var(--bg-elevated)] text-[var(--text-primary)] mt-0.5">✦</span>
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
                  <ContentHeading title="Implementation" />
                  <CodeBlock code={topicDetails.implementation} lang={topicDetails.implementationLanguage || 'code'} />
                </div>
              )}

              {/* Concurrency Concepts */}
              {topicDetails.concepts && Array.isArray(topicDetails.concepts) && topicDetails.concepts[0]?.name && (
                <div id="concepts" className="scroll-mt-24 mt-14 first:mt-0">
                  <ContentHeading title="Core Concepts" />
                  <div className="p-4 grid gap-2">
                    {topicDetails.concepts.map((concept, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{concept.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{fmtCloud(concept.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Primitives */}
              {topicDetails.primitives && (
                <div className="">
                  <ContentHeading title="Synchronization Primitives" />
                  <div className="p-4 grid gap-2">
                    {topicDetails.primitives.map((prim, i) => (
                      <div key={i} className="p-3 rounded border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold">{prim.name}</code>
                          {prim.example && <code className="text-[var(--text-muted)] text-sm landing-mono">{prim.example}</code>}
                        </div>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{fmtCloud(prim.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Classic Problems */}
              {topicDetails.problems && topicDetails.problems[0]?.solution && (
                <div className="">
                  <ContentHeading title="Classic Problems" />
                  <div className="grid gap-2 p-3">
                    {topicDetails.problems.map((problem, i) => (
                      <div key={i} className="p-4 rounded border border-[var(--border)]">
                        <h4 className="text-[var(--text-primary)] font-semibold text-sm mb-2 landing-display">{problem.name}</h4>
                        <p className="text-[var(--text-muted)] text-sm mb-2 landing-body">{fmtCloud(problem.description)}</p>
                        <div className="flex items-start gap-2">
                          <span className="text-[var(--accent)] text-sm font-semibold landing-mono">Solution:</span>
                          <span className="text-[var(--text-muted)] text-sm landing-body">{fmtCloud(problem.solution)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Data Structures */}
              {topicDetails.structures && (
                <div className="">
                  <ContentHeading title="Concurrent Data Structures" />
                  <div className="p-4 grid gap-2">
                    {topicDetails.structures.map((struct, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border)]">
                        <code className="text-[var(--text-primary)] landing-mono text-sm font-semibold whitespace-nowrap">{struct.name}</code>
                        <span className="text-[var(--text-muted)] text-sm landing-body">{fmtCloud(struct.description)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>

          )}

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          SRE Topic Detail — Microsoft PPT presentation principles
          Each section is a "slide": numbered agenda eyebrow, slide title,
          framed content card with comfortable max-width, generous gutters
          between sections. Two-column layouts where applicable.
          ────────────────────────────────────────────────────────────── */}
      {!isLocked && (activePage === 'sre' || activePage === 'devops' || activePage === 'observability' || activePage === 'platform' || activePage === 'mlops' || activePage === 'aiops' || activePage === 'networking' || activePage === 'cloud' || activePage === 'linux' || activePage === 'troubleshooting' || activePage === 'war-stories' || activePage === 'comparisons') && (topicDetails.introduction || topicDetails.keyQuestions || topicDetails.visualizations?.length || topicDetails.topics?.length || topicDetails.quickFire?.length) && (() => {
        // Build the agenda — one entry per section that's actually present.
        const agenda = [];
        if (topicDetails.introduction)                                          agenda.push({ id: 'overview',       label: 'Overview' });
        if (topicDetails.topics?.length)                                        agenda.push({ id: 'topic-sections', label: 'Deep Dive' });
        if (topicDetails.visualizations?.length)                                agenda.push({ id: 'visual',         label: 'Visual Explanation' });
        if (topicDetails.whenToUse && (Array.isArray(topicDetails.whenToUse) ? topicDetails.whenToUse.length : true)) agenda.push({ id: 'when-to-use', label: 'When to Use' });
        if (topicDetails.keyConcepts?.length)                                   agenda.push({ id: 'key-concepts',   label: 'Key Concepts' });
        if (topicDetails.approach?.length)                                      agenda.push({ id: 'approach',       label: 'Approach' });
        if (topicDetails.pitfalls?.length)                                      agenda.push({ id: 'pitfalls',       label: 'Common Pitfalls' });
        if (topicDetails.keyQuestions?.length)                                  agenda.push({ id: 'key-questions',  label: 'Questions & Answers' });
        if (topicDetails.quickFire?.length)                                     agenda.push({ id: 'quick-fire',     label: 'Quick-Fire Q&A' });
        if (topicDetails.references?.length)                                    agenda.push({ id: 'references',     label: 'References' });
        if (topicDetails.video?.embedUrl)                                       agenda.push({ id: 'video',          label: 'Video Overview' });

        const slideNum = (id) => String(agenda.findIndex(a => a.id === id) + 1).padStart(2, '0');

        // Slide eyebrow — agenda number + section name. Renders above the
        // ContentHeading; mirrors PPT slide-numbering pattern.
        const SlideEyebrow = ({ id }) => (
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-[11px] font-bold landing-mono tabular-nums tracking-[0.18em] px-2 py-0.5 rounded"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--cam-gold-leaf, var(--accent))',
              }}
            >
              {slideNum(id)} / {String(agenda.length).padStart(2, '0')}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] landing-mono text-[var(--text-muted)]">
              {agenda.find(a => a.id === id)?.label}
            </span>
          </div>
        );

        // Slide-card frame around section content — gives each conceptual
        // unit a clear boundary instead of one long scroll. Inner content
        // uses max-w-[72ch] mx-auto so prose is centered within the card
        // (PPT-style: comfortable reading width, balanced gutters).
        const SlideCard = ({ children }) => (
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '32px 40px',
            }}
          >
            <div className="prep-content">{children}</div>
          </div>
        );

        return (
        <div className="space-y-6 w-full">


          {/* ── 1 / Overview ── */}
          {topicDetails.introduction && (
            <section id="overview" className="scroll-mt-24">
              <ContentHeading title="Overview" />
              <div className="pt-3">
                <SlideCard>
                  <FormattedContent content={topicDetails.introduction} color="blue" />
                </SlideCard>
              </div>
            </section>
          )}

          {/* ── topics / Deep Dive sections — prose + code per subtopic ── */}
          {topicDetails.topics && topicDetails.topics.length > 0 && (
            <section id="topic-sections" className="scroll-mt-24">
              <ContentHeading title="Deep Dive" actions={<GlassPill>{topicDetails.topics.length} sections</GlassPill>} />
              <div className="pt-3 space-y-4">
                {topicDetails.topics.map((sec, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg-elevated)]">
                    <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/40 flex items-center gap-3">
                      <span
                        className="text-[10px] font-bold landing-mono tabular-nums px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ color: 'var(--cam-gold-leaf, #c9a55d)', background: 'rgba(201,165,93,0.08)', border: '1px solid rgba(201,165,93,0.3)' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-[var(--accent)] font-bold text-[14px] leading-snug landing-display">{sec.title}</h4>
                    </div>
                    <div className="px-5 py-4 prep-content">
                      {sec.content && <FormattedContent content={sec.content} />}
                      {sec.codeExample && (
                        <div className="mt-4">
                          <CodeBlock code={sec.codeExample} lang={sec.language || 'code'} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 2 / Visual Explanation — PNG diagrams ── */}
          {topicDetails.visualizations && topicDetails.visualizations.length > 0 && (
            <section id="visual" className="scroll-mt-24">
              <div className="pt-3 space-y-4">
                {topicDetails.visualizations.map((viz, vi) => (
                  <figure key={vi} className="viz-figure">
                    {viz.image && (
                      <ZoomableImage
                        src={viz.image}
                        alt={viz.title}
                        maxHeight={520}
                        frameStyle={{
                          background: 'white',
                          border: 'none',
                          borderRadius: 0,
                          borderBottom: '1px solid var(--border)',
                        }}
                        imgStyle={{ maxWidth: '100%', width: 'auto', height: 'auto', margin: '0 auto' }}
                      />
                    )}
                    {viz.video && (
                      <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                        <div style={{ position: 'relative', width: '85%', maxWidth: 900, aspectRatio: '16/9' }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${new URL(viz.video).searchParams.get('v') || viz.video.split('/').pop()}`}
                            title={viz.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 6 }}
                          />
                        </div>
                      </div>
                    )}
                    <figcaption className="viz-caption">
                      <h4 className="viz-caption-title">{viz.title}</h4>
                      {viz.description && (
                        <div className="viz-caption-body">
                          <FormattedContent content={viz.description} />
                        </div>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* ── 3 / When to Use — checklist or prose ── */}
          {topicDetails.whenToUse && (
            <section id="when-to-use" className="scroll-mt-24">
              <ContentHeading title="When to Use" />
              <div className="pt-3">
                <SlideCard>
                  {Array.isArray(topicDetails.whenToUse) ? (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                      {topicDetails.whenToUse.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 landing-body">
                          <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon name="check" size={10} className="text-[var(--accent)]" />
                          </span>
                          <span className="text-[14px] text-[var(--text-secondary)] leading-relaxed"><FormattedContent content={item} inline /></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <FormattedContent content={topicDetails.whenToUse} />
                  )}
                </SlideCard>
              </div>
            </section>
          )}

          {/* ── 4 / Key Concepts — two-column term + definition cards ── */}
          {topicDetails.keyConcepts && topicDetails.keyConcepts.length > 0 && (
            <section id="key-concepts" className="scroll-mt-24">
              <ContentHeading title="Key Concepts" />
              <div className="pt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {topicDetails.keyConcepts.map((kc, i) => {
                  const kcDef = kc.definition || kc.description || '';
                  const codeIdx = kcDef ? kcDef.indexOf('```') : -1;
                  const prose = codeIdx > 0 ? kcDef.slice(0, codeIdx).trim() : null;
                  const code  = codeIdx > 0 ? kcDef.slice(codeIdx).trim() : null;
                  const splitLayout = !!(prose && code);
                  const proseLines = (prose || '').split('\n').filter(l => l.trim() && !l.trim().endsWith(':'));
                  const proseThin = proseLines.length < 4;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg-elevated)]${splitLayout ? ' lg:col-span-2' : ''}`}
                    >
                      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-elevated)]/40 flex items-center gap-2.5">
                        <span
                          className="text-[10px] font-bold landing-mono tabular-nums px-1.5 py-0.5 rounded"
                          style={{
                            color: 'var(--cam-gold-leaf, #c9a55d)',
                            background: 'rgba(201, 165, 93, 0.08)',
                            border: '1px solid rgba(201, 165, 93, 0.3)',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[14px] font-bold text-[var(--accent)] landing-display">{kc.term || kc.title}</span>
                      </div>
                      {splitLayout ? (
                        <div className="flex divide-x divide-[var(--border)] min-h-0">
                          <div className="flex-1 min-w-0 px-4 py-3 text-[14px] text-[var(--text-secondary)] leading-relaxed landing-body">
                            <FormattedContent content={prose} color="amber" />
                            {proseThin && <YamlBreakdown code={code} />}
                          </div>
                          <div className="w-[52%] shrink-0 min-w-0 overflow-x-auto">
                            <FormattedContent content={code} color="amber" />
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-[14px] text-[var(--text-secondary)] leading-relaxed landing-body">
                          <FormattedContent content={kc.definition || kc.description} color="amber" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 5 / Approach — two-column step cards ── */}
          {topicDetails.approach && topicDetails.approach.length > 0 && (
            <section id="approach" className="scroll-mt-24">
              <ContentHeading title="Step-by-Step Approach" />
              <div className="pt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {topicDetails.approach.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0 landing-mono">{i + 1}</div>
                    <div className="flex-1 pt-0.5 text-[14px] text-[var(--text-secondary)] leading-relaxed landing-body">
                      {typeof step === 'string' ? (
                        <FormattedContent content={step} inline />
                      ) : (
                        <>
                          {step.step && <p className="font-semibold text-[var(--text-primary)] mb-1">{step.step}</p>}
                          <FormattedContent content={step.details || step.description || ''} inline />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 6 / Common Pitfalls — red callout cards ── */}
          {topicDetails.pitfalls && topicDetails.pitfalls.length > 0 && (
            <section id="pitfalls" className="scroll-mt-24">
              <ContentHeading title="Common Pitfalls" />
              <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {topicDetails.pitfalls.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg landing-body" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(239, 68, 68, 0.18)' }}>
                      <Icon name="alertTriangle" size={11} style={{ color: '#ef4444' }} />
                    </span>
                    <span className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                      {typeof item === 'string' ? (
                        <FormattedContent content={item} inline />
                      ) : (
                        <>
                          {item.title && <span className="font-semibold text-[var(--text-primary)] mr-1">{item.title} —</span>}
                          <FormattedContent content={item.description || item.detail || ''} inline />
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 7 / Questions & Answers — collapsible deck-style cards ── */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <section id="key-questions" className="scroll-mt-24">
              <ContentHeading title="Questions & Answers" />
              <div className="pt-3 space-y-2.5">
                {topicDetails.keyQuestions.map((item, index) => {
                  const questionKey = `sre-${index}`;
                  const isExpanded = expandedTheoryQuestions[questionKey] === undefined ? index < 2 : expandedTheoryQuestions[questionKey];
                  return (
                    <div key={index} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg-elevated)]">
                      <button
                        onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !isExpanded }))}
                        className="w-full px-4 py-3 flex items-center gap-3 bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                      >
                        <span
                          className="text-[10px] font-bold landing-mono tabular-nums px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            color: 'var(--cam-gold-leaf, #c9a55d)',
                            background: 'rgba(201, 165, 93, 0.08)',
                            border: '1px solid rgba(201, 165, 93, 0.3)',
                          }}
                        >
                          Q{String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-[var(--text-primary)] font-semibold text-[14px] leading-snug landing-display flex-1">{item.question || item.q}</h4>
                        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-5 py-4 border-t border-[var(--border)]">
                          <div className="prep-content w-full">
                            <FormattedContent content={item.answer || item.a} color="blue" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {topicDetails.video?.embedUrl && (
            <section id="video" className="scroll-mt-24">
              <ContentHeading title={topicDetails.video.title || 'Video Overview'} />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <div style={{ position: 'relative', width: '85%', maxWidth: 900, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden' }}>
                <iframe
                  src={topicDetails.video.embedUrl}
                  title={topicDetails.video.title || 'Video'}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                </div>
              </div>
              {topicDetails.video.courtesy && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  {'Courtesy: '}
                  <a href={topicDetails.video.courtesyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                    {topicDetails.video.courtesy}
                  </a>
                </p>
              )}
            </section>
          )}

          {/* ── quickFire / Quick-Fire Q&A — collapsible cards ── */}
          {topicDetails.quickFire && topicDetails.quickFire.length > 0 && (
            <section id="quick-fire" className="scroll-mt-24">
              <ContentHeading title="Quick-Fire Q&A" actions={<GlassPill>{topicDetails.quickFire.length} questions</GlassPill>} />
              <div className="pt-3 space-y-2.5">
                {topicDetails.quickFire.map((item, index) => {
                  const qKey = `qf-${index}`;
                  const isExpanded = expandedTheoryQuestions[qKey] === undefined ? index < 3 : expandedTheoryQuestions[qKey];
                  return (
                    <div key={index} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg-elevated)]">
                      <button
                        onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [qKey]: !isExpanded }))}
                        className="w-full px-4 py-3 flex items-center gap-3 bg-[var(--bg-elevated)]/40 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                      >
                        <span
                          className="text-[10px] font-bold landing-mono tabular-nums px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ color: 'var(--cam-gold-leaf, #c9a55d)', background: 'rgba(201,165,93,0.08)', border: '1px solid rgba(201,165,93,0.3)' }}
                        >
                          Q{String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-[var(--text-primary)] font-semibold text-[14px] leading-snug landing-display flex-1">{item.q}</h4>
                        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-5 py-4 border-t border-[var(--border)]">
                          <div className="prep-content w-full">
                            <FormattedContent content={item.a} color="blue" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 8 / References — citation footer ── */}
          {topicDetails.references && topicDetails.references.length > 0 && (
            <section id="references" className="scroll-mt-24">
              <ContentHeading title="References" />
              <div className="pt-3">
                <SlideCard>
                  <ul className="space-y-1.5">
                    {topicDetails.references.map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2.5 px-2 py-1.5 -mx-2 rounded hover:bg-[var(--bg-elevated)] transition-colors landing-body group"
                        >
                          <span className="text-[10px] font-bold landing-mono tabular-nums mt-1 flex-shrink-0 text-[var(--text-muted)]">[{String(i + 1).padStart(2, '0')}]</span>
                          <Icon name="externalLink" size={11} className="text-[var(--text-muted)] mt-1 flex-shrink-0" />
                          <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--accent)] group-hover:underline break-all landing-mono">{url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </SlideCard>
              </div>
            </section>
          )}

          {/* ── 9 / Deep Dives — pre-generated Graphviz PNGs ── */}
          {(() => {
            const gen = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
            if (!gen?.deepDives?.length) return null;
            return (
              <section id="deep-dives" className="scroll-mt-24">
                <ContentHeading title="Deep Dives" actions={<GlassPill>{gen.deepDives.length}</GlassPill>} />
                <div className="pt-3 space-y-6">
                  {gen.deepDives.map(d => (
                    <div key={d.id}>
                      <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 landing-mono uppercase tracking-widest">{d.title}</p>
                      <TopicDiagram
                        topicId={topicDetails.id || selectedTopic}
                        kind={`deep-dive-${d.id}`}
                        alt={d.title}
                        caption={d.title}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* ── 10 / Design Decisions — pre-generated tradeoff PNGs ── */}
          {(() => {
            const gen = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
            if (!gen?.tradeoffs?.length) return null;
            return (
              <section id="design-decisions" className="scroll-mt-24">
                <ContentHeading title="Design Decisions" actions={<GlassPill>{gen.tradeoffs.length}</GlassPill>} />
                <div className="pt-3 space-y-6">
                  {gen.tradeoffs.map(t => (
                    <div key={t.id}>
                      <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 landing-mono uppercase tracking-widest">{t.title}</p>
                      <TopicDiagram
                        topicId={topicDetails.id || selectedTopic}
                        kind={`tradeoff-${t.id}`}
                        alt={t.title}
                        caption={t.title}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

        </div>
        );
      })()}

      {/* Behavioral Topic Detail */}
      {!isLocked && (activePage === 'behavioral' || (activePage === 'low-level' && !topicDetails.coreEntities && !topicDetails.implementation && !topicDetails.functionalRequirements)) && (topicDetails.sampleQuestions || topicDetails.starExample || topicDetails.introduction || topicDetails.keyQuestions) && (
        <div className="space-y-3">

          {/* 1. Introduction — full width */}
          {topicDetails.introduction && (() => {
            const quoteMatch = topicDetails.introduction.match(/^"([^"]+)"\s*(.*)/s);
            return (
              <section id="overview" className="scroll-mt-24 mt-14 first:mt-0">
                <ContentHeading title="Overview" />
                {quoteMatch ? (
                  <>
                    <div className="pl-4 border-l-2 border-[var(--accent)] mb-4">
                      <p className="text-[16px] font-medium text-[var(--text-primary)] landing-body leading-relaxed">{fmtCloud(quoteMatch[1])}</p>
                    </div>
                    <p className="text-[var(--text-secondary)] text-[15px] leading-[1.75] landing-body">{fmtCloud(quoteMatch[2].trim())}</p>
                  </>
                ) : (
                  <div className="text-[var(--text-secondary)] text-[15px] leading-[1.75] landing-body"><FormattedContent content={topicDetails.introduction} /></div>
                )}
              </section>
            );
          })()}

          {/* 2. Key Principles — full width, separate card */}
          {topicDetails.principles && topicDetails.principles.length > 0 && (
            <section id="principles" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading
                title="Key Principles"
                actions={<GlassPill>{topicDetails.principles.length} principles</GlassPill>}
              />
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {topicDetails.principles.map((principle, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed landing-body text-[var(--text-secondary)]">
                    <NumberChip n={i + 1} mt="mt-0.5" />
                    <span><FormattedContent content={typeof principle === 'string' ? principle : (principle?.name || principle?.title || '')} inline /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 3. STAR Framework Example — learn the method BEFORE seeing questions */}
          {topicDetails.starExample && (
            <section id="star-example" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading
                title="STAR Framework Example"
                actions={<GlassPill>{Object.keys(topicDetails.starExample).length} steps</GlassPill>}
              />
              {/* Tree structure: parent heading above, children nested under
                  a single vertical guide so the four steps read as siblings
                  of one example — not five disconnected cards. */}
              <ol className="relative pl-6 space-y-4" style={{ borderLeft: '2px solid var(--cam-gold-leaf)' }}>
                {Object.entries(topicDetails.starExample).map(([key, value], idx) => {
                  const label = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                  const stepNum = String(idx + 1).padStart(2, '0');
                  return (
                    <li key={key} className="relative">
                      {/* Tree connector — short horizontal stub from the
                          guide line to the row */}
                      <span
                        aria-hidden="true"
                        className="absolute top-3 -left-6 w-5 h-px"
                        style={{ background: 'var(--cam-gold-leaf)' }}
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] font-semibold tracking-wider px-2 py-0.5 landing-mono tabular-nums"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 999,
                            color: 'var(--text-muted)',
                          }}
                        >
                          Step {stepNum}
                        </span>
                        <span className="text-[14px] font-bold text-[var(--text-primary)] landing-display tracking-tight">
                          {label}
                        </span>
                      </div>
                      <p className="text-[15px] leading-[1.75] text-[var(--text-secondary)] landing-body">
                        {stripQuotes(value)}
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
              <ContentHeading
                title="Example Response"
                actions={<GlassPill>Ready to use</GlassPill>}
              />
              <div className="pt-2">
                <div className="pl-4 border-l-2 border-[var(--border)] space-y-3">
                  {topicDetails.exampleResponse.split('\n\n').map((paragraph, i) => (
                    <div key={i} className="text-[var(--text-primary)] text-sm leading-relaxed landing-body">
                      <FormattedContent content={stripQuotes(paragraph.trim())} inline />
                    </div>
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
              <ContentHeading
                title="Questions & Answers"
                actions={<GlassPill>{topicDetails.keyQuestions.length} questions</GlassPill>}
              />
              <div className="p-2.5 space-y-2">
                {topicDetails.keyQuestions.map((item, index) => {
                  const questionKey = `behavioral-${index}`;
                  const isExpanded = expandedTheoryQuestions[questionKey] === undefined ? index < 2 : expandedTheoryQuestions[questionKey];
                  return (
                    <div key={index} className="hover:border-[var(--border-hover,var(--border))] transition-colors">
                      {/* Question header — clickable to expand/collapse */}
                      <button
                        onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !isExpanded }))}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
                      >
                        <NumberChip n={index + 1} />
                        <h4 className="text-[var(--text-primary)] font-semibold text-sm leading-snug landing-display flex-1">{item.question || item.q}</h4>
                        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-4 border-t border-[var(--border)]">
                          <FormattedContent content={item.answer || item.a} />
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
              <ContentHeading
                title="Practice Questions"
                actions={<GlassPill>{topicDetails.sampleQuestions.length} questions</GlassPill>}
              />
              <div className="p-2.5 space-y-1.5">
                {topicDetails.sampleQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded border border-transparent hover:bg-[var(--bg-elevated)] hover:border-[var(--border)] transition-colors group cursor-default">
                    <NumberChip n={i + 1} mt="mt-0.5" />
                    <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed group-hover:text-[var(--text-primary)] transition-colors">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Tips for Success — final review checklist, LAST card */}
          {topicDetails.tips && (
            <div id="tips" className="scroll-mt-24 mt-14 first:mt-0">
              <ContentHeading
                title="Tips for Success"
                actions={<GlassPill>{topicDetails.tips.length} tips</GlassPill>}
              />
              <div className="p-2.5 space-y-1.5">
                {topicDetails.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 rounded bg-[var(--accent)]/10/40 border border-[var(--accent)]/20 hover:bg-[var(--accent)]/10/70 hover:border-[var(--accent)]/20 transition-colors group">
                    <span className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-[var(--accent)]/100 text-white mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm landing-body leading-relaxed group-hover:text-[var(--text-primary)] transition-colors"><FormattedContent content={tip} inline /></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related topics — Databricks "See also" pattern. Picks up to 3
          topics from the same category, excluding the current topic and
          the prev/next pair (which already render in the bottom nav).
          Hidden when the category has too few topics to fill a row. */}
      {(() => {
        if (!filteredTopics || filteredTopics.length < 4) return null;
        const skip = new Set([selectedTopic, prevTopic?.id, nextTopic?.id].filter(Boolean));
        const related = filteredTopics.filter(t => !skip.has(t.id)).slice(0, 3);
        if (related.length === 0) return null;
        return (
          <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <ContentHeading
              title="You might also explore"
              actions={<GlassPill>{related.length} related</GlassPill>}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {related.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopic(t.id)}
                  className="card-lift text-left rounded-lg p-4 flex flex-col"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  {t.difficulty && (
                    <Chip className="mb-1.5">{t.difficulty}</Chip>
                  )}
                  <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{t.title}</h4>
                  {t.description && (
                    <p className="text-[12px] leading-snug line-clamp-2" style={{ color: 'var(--text-muted)' }}>{fmtCloud(t.description)}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* "Was this helpful?" — Databricks-style feedback row above prev/next */}
      {topicDetails && (
        <div className="mt-8 pt-5 border-t border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Was this helpful?</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => celebrate({ title: 'Thanks for the feedback', subtitle: 'Glad this one helped.' })}
                className="press flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                aria-label="Yes, this was helpful"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V11" /><path d="M2 13v6c0 1.7 1.3 3 3 3h12c1.5 0 2.7-1 3-2.5l1.7-7.5c.3-1.3-.7-2.5-2-2.5h-6l1-4c0-1-.5-2-1.5-2-1 0-2 .5-2 1.5L7 11" /></svg>
                Yes
              </button>
              <button
                type="button"
                onClick={() => celebrate({ title: 'Thanks for the heads up', subtitle: 'Noted — we will keep iterating.' })}
                className="press flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                aria-label="No, this was not helpful"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2v11" /><path d="M22 11V5c0-1.7-1.3-3-3-3H7c-1.5 0-2.7 1-3 2.5L2.3 12c-.3 1.3.7 2.5 2 2.5h6l-1 4c0 1 .5 2 1.5 2 1 0 2-.5 2-1.5L17 13" /></svg>
                No
              </button>
            </div>
          </div>
          {topicDetails.lastUpdated && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Last updated {topicDetails.lastUpdated}
            </span>
          )}
        </div>
      )}

      {/* Comments */}
      <TopicComments topicId={selectedTopic} />

      {/* Bottom prev/next topic navigation — NVIDIA-style two-panel rail
          via the shared DocsPrevNext primitive. State-nav (setSelectedTopic)
          instead of URL nav since topic browsing is component-state, not
          a route. The hand-rolled "All Topics" middle button is dropped —
          NVIDIA docs don't have it, and the breadcrumb at the top of the
          page already provides that escape hatch. */}
      {filteredTopics && filteredTopics.length > 1 && (
        <DocsPrevNext
          prev={prevTopic ? { label: prevTopic.title, onClick: () => setSelectedTopic(prevTopic.id) } : undefined}
          next={nextTopic ? { label: nextTopic.title, onClick: () => setSelectedTopic(nextTopic.id) } : undefined}
        />
      )}
      </div>

      {/* On-this-page rail — NVIDIA-style sticky right sidebar with
          scroll-spy. Hidden under xl; primitive owns the active-id
          tracking via IntersectionObserver. */}
      {onThisPageItems.length > 2 && (
        <aside className="hidden xl:flex flex-col flex-shrink-0" style={{ width: '220px', borderLeft: '1px solid var(--border)' }}>
          <div className="sticky pl-5 pr-3 pt-4" style={{ top: '80px' }}>
            <OnThisPage items={onThisPageItems} />
          </div>
        </aside>
      )}

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
