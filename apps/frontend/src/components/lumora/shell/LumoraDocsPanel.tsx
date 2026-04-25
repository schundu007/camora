/**
 * Interview Prep — matches capra.cariara.com/app/prep layout.
 * Sidebar sections + upload zones + Generate button.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const STORAGE_KEY = 'lumora_prep_v8'; // v8: fix rawContent unwrapping
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface DocState {
  jd: string;
  jdFile?: string;
  resume: string;
  resumeFile?: string;
  coverLetter: string;
  coverLetterFile?: string;
  prepMaterials: string;
  prepMaterialsFile?: string;
  studyMaterials: string;
  studyMaterialsFile?: string;
  sections: Record<string, any>;
}

interface PrepData {
  companies: string[];
  activeCompany: string | null;
  data: Record<string, DocState>;
}

const EMPTY_DOC: DocState = {
  jd: '', resume: '', coverLetter: '', prepMaterials: '', studyMaterials: '',
  sections: {},
};

const INITIAL_STATE: PrepData = {
  companies: [],
  activeCompany: null,
  data: {},
};

const SIDEBAR_SECTIONS = [
  { id: 'input', label: 'Input Materials', color: '#22D3EE' },
  { id: 'jd-view', label: 'Job Description', color: '#22D3EE' },
  { id: 'pitch', label: 'Elevator Pitch', color: '#ec4899' },
  { id: 'hr', label: 'HR Questions', color: '#f59e0b' },
  { id: 'hiring-manager', label: 'Hiring Manager', color: '#06b6d4' },
  { id: 'coding', label: 'Coding', color: '#22D3EE' },
  { id: 'system-design', label: 'System Design', color: '#22D3EE' },
  { id: 'behavioral', label: 'Behavioral', color: '#22D3EE' },
  { id: 'techstack', label: 'Tech Stack', color: '#22D3EE' },
];

/** Strip markdown fences and leading "json" tag; shared helper. */
function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/gim, '')
    .replace(/```\s*$/gm, '')
    .replace(/^data:\s*/gim, '')
    .replace(/^json\s*(?=\{)/i, '')
    .trim();
}

/** Normalize prep content into a clean object (never stringify).
 *  Backend wraps failed JSON parsing in { rawContent: string } — unwrap it
 *  here and, if parsing fails, fall back to a readable { summary: text }
 *  so the UI never renders a RAW CONTENT dump with ```json fences. */
function formatPrepContent(content: any): any {
  if (!content) return { summary: 'No content generated' };
  if (typeof content === 'object' && !Array.isArray(content)) {
    // Backend wraps unparsed AI output in rawContent — try to extract the real JSON.
    // Bounded to small wrapper objects so we don't nuke legitimate payloads that
    // happen to carry a rawContent field alongside real fields.
    if (content.rawContent && typeof content.rawContent === 'string' && Object.keys(content).length <= 2) {
      const parsed = extractJSON(content.rawContent);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      // Parsing failed — strip fences and present the text as a readable summary
      // instead of leaving the rawContent wrapper on, which would render a
      // "RAW CONTENT" dump via the generic catch-all.
      return { summary: stripFences(content.rawContent) };
    }
    // Summary contains raw JSON from a previous failed parse — extract it
    if (content.summary && typeof content.summary === 'string' && content.summary.trim().startsWith('{') && Object.keys(content).length === 1) {
      const parsed = extractJSON(content.summary);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 1) return parsed;
      return { summary: stripFences(content.summary) };
    }
    return content;
  }
  if (typeof content === 'string') {
    const parsed = extractJSON(content);
    if (parsed) return parsed;
    return { summary: stripFences(content) };
  }
  return { summary: String(content) };
}

/** Repair truncated JSON by closing open strings, arrays, and objects */
function repairJSON(s: string): any {
  let str = s.trim();
  const start = str.indexOf('{');
  if (start < 0) return null;
  str = str.slice(start);

  // Close any unterminated string
  let inStr = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    if (esc) { esc = false; continue; }
    if (str[i] === '\\') { esc = true; continue; }
    if (str[i] === '"') inStr = !inStr;
  }
  if (inStr) str += '"';

  // Remove trailing partial key-value or comma
  str = str.replace(/,\s*"[^"]*"?\s*:?\s*$/, '');
  str = str.replace(/,\s*$/, '');

  // Count and close open brackets/braces (outside strings)
  let braces = 0, brackets = 0;
  inStr = false; esc = false;
  for (let i = 0; i < str.length; i++) {
    if (esc) { esc = false; continue; }
    if (str[i] === '\\') { esc = true; continue; }
    if (str[i] === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (str[i] === '{') braces++;
    else if (str[i] === '}') braces--;
    else if (str[i] === '[') brackets++;
    else if (str[i] === ']') brackets--;
  }
  while (brackets > 0) { str += ']'; brackets--; }
  while (braces > 0) { str += '}'; braces--; }

  try { const p = JSON.parse(str); if (p && typeof p === 'object') return p; } catch {}
  return null;
}

/** Escape literal newlines/tabs inside JSON string values so JSON.parse
 *  tolerates model outputs that forget to escape control chars. */
function escapeJsonStringControls(s: string): string {
  let out = '';
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (inStr) {
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
    }
    out += c;
  }
  return out;
}

/** Aggressively extract a JSON object from any string */
function extractJSON(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let s = stripFences(raw);
  // Try direct parse
  try { const p = JSON.parse(s); if (p && typeof p === 'object') return p; } catch {}
  // Try with literal-newline rescue (most common model-output failure mode)
  try { const p = JSON.parse(escapeJsonStringControls(s)); if (p && typeof p === 'object') return p; } catch {}
  // Try extracting { ... } from the string
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i >= 0 && j > i) {
    const slice = s.slice(i, j + 1);
    try { const p = JSON.parse(slice); if (p && typeof p === 'object') return p; } catch {}
    try { const p = JSON.parse(escapeJsonStringControls(slice)); if (p && typeof p === 'object') return p; } catch {}
  }
  // Try double-parse (content was double-stringified)
  try { const inner = JSON.parse(s); if (typeof inner === 'string') return extractJSON(inner); } catch {}
  // Try repairing truncated JSON (model hit token limit mid-response)
  const repaired = repairJSON(s);
  if (repaired && Object.keys(repaired).length > 0) return repaired;
  const repairedEsc = repairJSON(escapeJsonStringControls(s));
  if (repairedEsc && Object.keys(repairedEsc).length > 0) return repairedEsc;
  return null;
}

/** Generic renderer for any key-value pair */
function GenericField({ label, val }: { label: string; val: any }) {
  return (
    <div className="rounded-lg p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#29B5E8' }}>{label.replace(/([A-Z])/g, ' $1').trim()}</div>
      {typeof val === 'string' ? (
        <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{val}</p>
      ) : Array.isArray(val) ? (
        <ul className="space-y-1.5">{val.map((item: any, i: number) => (
          <li key={i} className="text-sm" style={{ color: '#475569' }}>
            {typeof item === 'string' ? `• ${item}` : typeof item === 'object' ? (
              <div className="rounded-lg p-3 mb-1" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                {Object.entries(item).map(([k, v]) => (
                  <p key={k} className="text-sm mb-1"><strong className="text-xs uppercase" style={{ color: '#94A3B8' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </strong><span style={{ color: '#475569' }}>{typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : JSON.stringify(v)}</span></p>
                ))}
              </div>
            ) : String(item)}
          </li>
        ))}</ul>
      ) : typeof val === 'object' && val ? (
        <div className="space-y-1">{Object.entries(val).map(([k, v]) => (
          <p key={k} className="text-sm"><strong style={{ color: '#64748B' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </strong><span style={{ color: '#475569' }}>{typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : JSON.stringify(v)}</span></p>
        ))}</div>
      ) : <p className="text-sm" style={{ color: '#475569' }}>{String(val)}</p>}
    </div>
  );
}

/** Rich content renderer for prep sections — accepts string or object.
 *  Renders known fields with custom layouts, then catches ALL remaining fields generically.
 *  Nothing is ever silently dropped. */
function PrepContentRenderer({ content }: { content: any }) {
  let data: any = null;
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    data = content;
  } else if (typeof content === 'string') {
    data = extractJSON(content);
    if (!data) {
      const text = content.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
      return <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#475569' }}>{text}</div>;
    }
  }
  if (!data) return <div className="text-sm" style={{ color: '#94A3B8' }}>No content available</div>;

  // Track which keys are rendered by specific renderers
  const rendered = new Set<string>();

  const mark = (...keys: string[]) => keys.forEach(k => rendered.add(k));

  // Build elements
  const els: JSX.Element[] = [];

  // Summary
  if (data.summary) {
    mark('summary');
    els.push(
      <div key="summary" className="rounded-lg p-4" style={{ background: '#22D3EE08', border: '1px solid #e2e8f0' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#22D3EE' }}>Summary</div>
        <p className="text-sm leading-relaxed" style={{ color: '#0f172a' }}>{data.summary}</p>
      </div>
    );
  }

  // Pitch Sections
  if (data.pitchSections || data.chSections) {
    mark('pitchSections', 'chSections');
    const sections = data.pitchSections || data.chSections;
    els.push(
      <div key="pitch" className="space-y-4">
        {sections.map((s: any, i: number) => (
          <div key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#10b981', color: '#fff' }}>{i + 1}</span>
            <div className="flex-1 pt-0.5">
              <p className="text-sm leading-relaxed" style={{ color: '#0f172a' }}>
                {(s.bullets || []).map((b: string, j: number) => (
                  <span key={j}>{j === 0 ? <><strong style={{ color: '#1e40af' }}>{String(b).split(' ').slice(0, 3).join(' ')}</strong> {String(b).split(' ').slice(3).join(' ')}</> : ` ${b}`}</span>
                ))}
                {s.title && !s.bullets?.length && <>{s.title}</>}
              </p>
              {s.duration && <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#64748b' }}>{s.duration}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Company Insights
  if (data.companyInsights) {
    mark('companyInsights');
    els.push(
      <div key="insights" className="rounded-lg p-4" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: '#06b6d4' }}>Company Insights</div>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(data.companyInsights).map(([k, v]) => (
            <div key={k}><span className="text-[10px] font-bold uppercase" style={{ color: '#94a3b8' }}>{k.replace(/([A-Z])/g, ' $1').trim()}:</span><p className="text-sm mt-0.5" style={{ color: '#475569' }}>{Array.isArray(v) ? (v as string[]).join(', ') : String(v)}</p></div>
          ))}
        </div>
      </div>
    );
  }

  // Questions — with STAR + coding + system design support
  if (data.questions?.length > 0) {
    mark('questions');
    els.push(
      <div key="questions" className="space-y-4">
        {data.questions.map((q: any, i: number) => {
          const title = q.question || q.title || q.text || q.scenario || `Question ${i + 1}`;
          // Collect all non-title fields for rendering
          const qRendered = new Set(['question', 'title', 'text', 'scenario']);
          return (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              <div className="px-5 py-3 flex items-start gap-3" style={{ background: '#f8fafc' }}>
                <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#eff6ff', color: '#1e40af' }}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold leading-snug" style={{ color: '#0f172a' }}>{title}</p>
                  {q.difficulty && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: q.difficulty === 'Hard' ? '#fef2f2' : q.difficulty === 'Medium' ? '#fefce8' : '#f0fdf4', color: q.difficulty === 'Hard' ? '#dc2626' : q.difficulty === 'Medium' ? '#ca8a04' : '#16a34a' }}>{q.difficulty}</span>}
                  {q.whyTheyAsk && (qRendered.add('whyTheyAsk'), <p className="text-xs mt-1 italic" style={{ color: '#f59e0b' }}>Why Asked: {q.whyTheyAsk}</p>)}
                  {q.whyThisCompanyAsks && (qRendered.add('whyThisCompanyAsks'), <p className="text-xs mt-1 italic" style={{ color: '#f59e0b' }}>Why Asked: {q.whyThisCompanyAsks}</p>)}
                  {q.companyConnection && (qRendered.add('companyConnection'), <p className="text-xs mt-1 italic" style={{ color: '#06b6d4' }}>Connect to: {q.companyConnection}</p>)}
                  {q.category && (qRendered.add('category'), <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: '#eff6ff', color: '#1e40af' }}>{q.category}</span>)}
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* Regular answer */}
                {(q.answer || q.sampleAnswer || q.suggestedAnswer) && (qRendered.add('answer', 'sampleAnswer', 'suggestedAnswer'),
                  <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{q.answer || q.sampleAnswer || q.suggestedAnswer}</p>
                )}
                {/* Description (coding) */}
                {q.description && (qRendered.add('description'),
                  <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{q.description}</p>
                )}
                {/* STAR format — behavioral */}
                {(q.situation || q.task || q.action || q.result) && (() => {
                  qRendered.add('situation', 'task', 'action', 'result');
                  const stars = [
                    { key: 'situation', label: 'SITUATION', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: 'rgba(34,197,94,0.2)', color: '#166534' },
                    { key: 'task', label: 'TASK', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: 'rgba(59,130,246,0.2)', color: '#1e40af' },
                    { key: 'action', label: 'ACTION', bg: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)', border: 'rgba(245,158,11,0.2)', color: '#92400e' },
                    { key: 'result', label: 'RESULT', bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: 'rgba(16,185,129,0.2)', color: '#059669' },
                  ];
                  return (
                    <div className="space-y-3">
                      {stars.map(s => q[s.key] && (
                        <div key={s.key} className="p-4 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                          <div className="text-xs font-bold mb-2" style={{ color: s.color }}>{s.label}</div>
                          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: s.color }}>{Array.isArray(q[s.key]) ? q[s.key].join('\n') : q[s.key]}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* Tips */}
                {q.tips && (qRendered.add('tips'), <div className="text-xs p-3 rounded-lg italic" style={{ background: 'rgba(245,158,11,0.06)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.1)' }}>{Array.isArray(q.tips) ? q.tips.join(' ') : q.tips}</div>)}
                {q.followUp && (qRendered.add('followUp'), <p className="text-xs italic" style={{ color: '#94a3b8' }}>Follow-up: {q.followUp}</p>)}
                {/* Catch-all: render any remaining question fields generically */}
                {Object.entries(q).filter(([k]) => !qRendered.has(k) && k !== 'difficulty').map(([k, v]) => (
                  <div key={k} className="rounded-lg p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#475569' }}>{Array.isArray(v) ? (v as string[]).join('\n') : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Tech Stack table
  if (data.techStack && Array.isArray(data.techStack)) {
    mark('techStack');
    els.push(
      <div key="techstack">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#22D3EE' }}>Tech Stack ({data.techStack.length})</div>
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #e2e8f0' }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: '#f1f5f9' }}>
              <th className="text-left px-3 py-2 font-bold" style={{ color: '#0f172a' }}>Technology</th>
              <th className="text-left px-3 py-2 font-bold" style={{ color: '#0f172a' }}>Category</th>
              <th className="text-left px-3 py-2 font-bold" style={{ color: '#0f172a' }}>Experience</th>
              <th className="text-left px-3 py-2 font-bold" style={{ color: '#0f172a' }}>Relevance</th>
            </tr></thead>
            <tbody>{data.techStack.map((t: any, i: number) => (
              <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td className="px-3 py-2 font-semibold" style={{ color: '#22D3EE' }}>{t.technology || t.name}</td>
                <td className="px-3 py-2" style={{ color: '#94a3b8' }}>{t.category}</td>
                <td className="px-3 py-2" style={{ color: '#475569' }}>{t.experience}</td>
                <td className="px-3 py-2" style={{ color: '#475569' }}>{t.relevance}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }

  // Simple list fields
  const listFields = [
    { key: 'keyTopics', label: 'Key Topics', color: '#22D3EE', pill: true },
    { key: 'keyPoints', label: 'Key Points', color: '#22D3EE' },
    { key: 'talkingPoints', label: 'Talking Points', color: '#22D3EE' },
    { key: 'questionsToAsk', label: 'Questions to Ask', color: '#8b5cf6' },
  ];
  for (const f of listFields) {
    if (!data[f.key]) continue;
    mark(f.key);
    const items = Array.isArray(data[f.key]) ? data[f.key] : [data[f.key]];
    els.push(
      <div key={f.key}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
        {f.pill ? (
          <div className="flex flex-wrap gap-1.5">{items.map((t: any, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: `${f.color}10`, color: f.color, border: `1px solid ${f.color}30` }}>{typeof t === 'string' ? t : t?.question || t?.text || JSON.stringify(t)}</span>
          ))}</div>
        ) : (
          <ul className="space-y-1.5">{items.map((t: any, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#475569' }}>
              <span style={{ color: f.color }}>•</span>
              {typeof t === 'string' ? t : t?.question || t?.text || JSON.stringify(t)}
            </li>
          ))}</ul>
        )}
      </div>
    );
  }

  // Box fields
  const boxFields = [
    { key: 'tips', label: 'Tips', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    { key: 'deliveryTips', label: 'Delivery Tips', bg: 'rgba(34,211,238,0.06)', border: 'rgba(34,211,238,0.15)', color: '#22D3EE' },
    { key: 'recentNews', label: 'Recent News', bg: '#f0fdf4', border: 'rgba(16,185,129,0.15)', color: '#10b981' },
  ];
  for (const f of boxFields) {
    if (!data[f.key]) continue;
    mark(f.key);
    const val = data[f.key];
    els.push(
      <div key={f.key} className="rounded-lg p-3" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: f.color }}>{f.label}</div>
        {Array.isArray(val) ? (
          <ul className="space-y-1">{val.map((t: string, i: number) => <li key={i} className="text-sm" style={{ color: '#475569' }}>• {t}</li>)}</ul>
        ) : typeof val === 'string' ? (
          <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{val}</p>
        ) : (
          <div className="space-y-1">{Object.entries(val).map(([k, v]) => (
            <p key={k} className="text-sm"><strong className="text-xs uppercase" style={{ color: '#94a3b8' }}>{k.replace(/([A-Z])/g, ' $1').trim()}: </strong><span style={{ color: '#475569' }}>{typeof v === 'string' ? v : Array.isArray(v) ? (v as string[]).join(', ') : JSON.stringify(v)}</span></p>
          ))}</div>
        )}
      </div>
    );
  }

  // Abbreviations
  if (data.abbreviations?.length > 0) {
    mark('abbreviations');
    els.push(
      <div key="abbr">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Abbreviations</div>
        <div className="flex flex-wrap gap-1.5">{data.abbreviations.map((a: any, i: number) => (
          <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
            <strong>{a.term || a.abbr || a.name}</strong>: {a.definition || a.full || a.meaning}
          </span>
        ))}</div>
      </div>
    );
  }

  // Salary Negotiation
  if (data.salaryNegotiation) {
    mark('salaryNegotiation');
    els.push(<GenericField key="salary" label="Salary Negotiation" val={data.salaryNegotiation} />);
  }

  // CATCH-ALL: Render every remaining field generically — nothing is silently dropped
  const remaining = Object.keys(data).filter(k => !rendered.has(k));
  for (const key of remaining) {
    els.push(<GenericField key={key} label={key} val={data[key]} />);
  }

  return <div className="space-y-4">{els}</div>;
}

function loadPrepData(): PrepData {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (!r) return INITIAL_STATE;
    const data = JSON.parse(r) as PrepData;
    // Clean up any rawContent wrappers from previously cached data
    for (const company of Object.keys(data.data || {})) {
      const sections = data.data[company]?.sections;
      if (sections) {
        for (const key of Object.keys(sections)) {
          sections[key] = formatPrepContent(sections[key]);
        }
      }
    }
    return data;
  } catch { return INITIAL_STATE; }
}
function savePrepData(s: PrepData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function UploadZone({ label, required, value, fileName, onUpload, onPaste, onClickOverride }: {
  label: string; required?: boolean; value: string; fileName?: string;
  onUpload: (file: File) => void; onPaste: (text: string) => void;
  onClickOverride?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[120px] ${dragOver ? 'ring-2 ring-[#22D3EE]' : ''}`}
      style={{ background: value ? '#22D3EE08' : '#f8fafc', border: `1px solid ${value ? '#22D3EE' : '#e2e8f0'}` }}
      onClick={() => { if (onClickOverride) onClickOverride(); else ref.current?.click(); }}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <input ref={ref} type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      {value ? (
        <>
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: '#22D3EE', color: '#fff' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-xs font-semibold" style={{ color: '#22D3EE' }}>{fileName || 'Content added'}</span>
          <span className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>{value.length.toLocaleString()} characters</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6 mb-2" style={{ color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: '#0f172a' }}>
            {label}{required && <span style={{ color: '#ef4444' }}>*</span>}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>
            {onClickOverride ? 'Paste URL, text, or upload' : 'Drop or click'}
          </span>
        </>
      )}
    </div>
  );
}

/** Parse JD text into structured sections and render beautifully */
function FormattedJD({ text }: { text: string }) {
  if (!text?.trim()) return <p className="text-sm" style={{ color: '#94a3b8' }}>No job description added yet.</p>;

  // Detect section headers — lines that look like titles (short, no bullet, often Title Case)
  const SECTION_PATTERNS = [
    /^(about\s+(the\s+)?(company|role|team|position|us))/i,
    /^(what\s+you'?ll?\s+(be\s+)?do(ing)?)/i,
    /^(what\s+we\s+(need|are\s+looking|expect|require|want)\s+to\s+see)/i,
    /^(responsibilities|key\s+responsibilities)/i,
    /^(requirements|qualifications|minimum\s+qualifications)/i,
    /^(preferred|nice\s+to\s+have|bonus|ways?\s+to\s+stand\s+out)/i,
    /^(benefits|perks|compensation|what\s+we\s+offer)/i,
    /^(tech\s+stack|technologies|tools)/i,
    /^(who\s+you\s+are|ideal\s+candidate)/i,
    /^(experience|skills)/i,
  ];

  const isHeader = (line: string): boolean => {
    const t = line.trim();
    if (!t || t.length > 80) return false;
    if (SECTION_PATTERNS.some(p => p.test(t))) return true;
    // Title-case short lines without punctuation at end
    if (t.length < 50 && !t.endsWith('.') && !t.endsWith(',') && !t.startsWith('-') && !t.startsWith('•') && /^[A-Z]/.test(t) && !/^\d/.test(t)) {
      const words = t.split(/\s+/);
      if (words.length <= 8 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.5) return true;
    }
    return false;
  };

  const lines = text.split('\n');
  const sections: { title: string | null; items: string[] }[] = [];
  let current: { title: string | null; items: string[] } = { title: null, items: [] };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (isHeader(t)) {
      if (current.items.length > 0 || current.title) sections.push(current);
      current = { title: t, items: [] };
    } else {
      current.items.push(t.replace(/^[-•]\s*/, ''));
    }
  }
  if (current.items.length > 0 || current.title) sections.push(current);

  return (
    <div className="flex flex-col gap-4">
      {sections.map((sec, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          {sec.title && (
            <div className="px-4 py-2.5" style={{ background: '#22D3EE08', borderBottom: '1px solid #e2e8f0' }}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#22D3EE' }}>{sec.title}</h4>
            </div>
          )}
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {sec.items.map((item, j) => {
              // First section without title is likely the company description — render as paragraph
              if (i === 0 && !sec.title) {
                return <p key={j} className="text-[13px] leading-relaxed" style={{ color: '#475569' }}>{item}</p>;
              }
              return (
                <div key={j} className="flex gap-2 items-start">
                  <span className="w-1 h-1 rounded-full shrink-0 mt-2" style={{ background: '#22D3EE' }} />
                  <span className="text-[13px] leading-relaxed" style={{ color: '#475569' }}>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LumoraDocsPanel({ onClose }: { onClose?: () => void }) {
  const { token } = useAuth();
  const [prepData, setPrepData] = useState<PrepData>(loadPrepData);
  const [activeSection, setActiveSection] = useState('input');
  const [generating, setGenerating] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<Record<string, 'pending' | 'generating' | 'done' | 'error'>>({});
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const newCompanyRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [jdUrl, setJdUrl] = useState('');
  const [jdEditText, setJdEditText] = useState('');
  const [jdFetching, setJdFetching] = useState(false);
  const [jdUrlError, setJdUrlError] = useState('');

  const closeJdModal = () => {
    setJdModalOpen(false);
    setJdUrl('');
    setJdEditText('');
    setJdUrlError('');
    setJdFetching(false);
  };

  const fetchJdUrl = async (url: string) => {
    if (!url.trim()) return;
    setJdFetching(true);
    setJdUrlError('');
    try {
      const res = await fetch(`${API_URL}/api/job-analyze/fetch-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ url: url.trim() }),
      });
      // 404 means the deployed backend doesn't have /api/job-analyze/fetch-text
      // yet — surface that explicitly so the user knows it's a deploy-lag, not
      // a broken URL. Other statuses parse the JSON error message.
      if (res.status === 404) {
        setJdUrlError('JD fetch endpoint is being deployed. Try again in a minute, or paste the JD text below.');
      } else {
        let data: any = null;
        try { data = await res.json(); } catch { /* non-JSON 5xx */ }
        if (!res.ok || !data?.success) {
          setJdUrlError(res.status === 401
            ? 'Please sign in again, then retry.'
            : (data?.error || `Could not fetch this URL (HTTP ${res.status}).`));
        } else {
          setJdEditText(data.text);
        }
      }
    } catch {
      setJdUrlError('Network error. Please try again.');
    } finally {
      setJdFetching(false);
    }
  };

  const pasteJdFromClipboard = async () => {
    setJdUrlError('');
    if (!navigator.clipboard?.readText) {
      setJdUrlError('Clipboard access unavailable. Use Cmd/Ctrl+V to paste.');
      return;
    }
    let clip: string;
    try {
      clip = (await navigator.clipboard.readText()).trim();
    } catch {
      setJdUrlError('Clipboard permission denied. Use Cmd/Ctrl+V to paste.');
      return;
    }
    if (!clip) { setJdUrlError('Clipboard is empty.'); return; }
    if (/^https?:\/\/\S+$/i.test(clip)) {
      setJdUrl(clip);
      await fetchJdUrl(clip);
      return;
    }
    setJdEditText(clip);
  };

  useEffect(() => { savePrepData(prepData); }, [prepData]);

  // Auto-create default company if none exists
  useEffect(() => {
    if (prepData.companies.length === 0) {
      setPrepData(prev => ({
        ...prev,
        companies: ['My Interview'],
        activeCompany: 'My Interview',
        data: { ...prev.data, 'My Interview': { ...EMPTY_DOC } },
      }));
    } else if (!prepData.activeCompany && prepData.companies.length > 0) {
      setPrepData(prev => ({ ...prev, activeCompany: prev.companies[0] }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active company's doc state
  const state = prepData.activeCompany ? (prepData.data[prepData.activeCompany] || EMPTY_DOC) : EMPTY_DOC;
  const setState = (updater: DocState | ((prev: DocState) => DocState)) => {
    const company = prepData.activeCompany;
    if (!company) return;
    setPrepData(prev => {
      const newState = typeof updater === 'function' ? updater(prev.data[company] || EMPTY_DOC) : updater;
      return { ...prev, data: { ...prev.data, [company]: newState } };
    });
  };

  const addCompany = () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setPrepData(prev => ({
      ...prev,
      companies: [...prev.companies, name],
      activeCompany: name,
      data: { ...prev.data, [name]: { ...EMPTY_DOC } },
    }));
    setNewCompanyName('');
    setShowNewCompany(false);
    setActiveSection('input');
  };

  const switchCompany = (name: string) => {
    setPrepData(prev => ({ ...prev, activeCompany: name }));
    setShowDropdown(false);
    setActiveSection('input');
  };

  const deleteCompany = (name: string) => {
    setPrepData(prev => {
      const newCompanies = prev.companies.filter(c => c !== name);
      const newData = { ...prev.data };
      delete newData[name];
      return { ...prev, companies: newCompanies, activeCompany: newCompanies[0] || null, data: newData };
    });
  };

  const extractFile = useCallback(async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }
    if (!token) return `[Uploaded: ${file.name}]`;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API_URL}/api/extract`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (res.ok) { const d = await res.json(); return d.text || `[${file.name}]`; }
    } catch {}
    return `[Uploaded: ${file.name}]`;
  }, [token]);

  const GENERATE_SECTIONS = ['pitch', 'hr', 'hiring-manager', 'coding', 'system-design', 'behavioral', 'techstack'];

  /** Read SSE stream and return parsed result — pure function, no shared state */
  const readSSE = async (response: Response): Promise<any> => {
    const reader = response.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let result: any = null;
    let chunks = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(t.slice(6));
          if (parsed.done && parsed.result) result = parsed.result;
          else if (parsed.chunk) chunks += parsed.chunk;
          else if (parsed.error) chunks = `Error: ${parsed.error}`;
        } catch {}
      }
    }
    // Process remaining buffer — done event often lands here
    if (buffer.trim().startsWith('data: ')) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        if (parsed.done && parsed.result) result = parsed.result;
        else if (parsed.chunk) chunks += parsed.chunk;
      } catch {}
    }

    if (result) return formatPrepContent(result);
    if (chunks) { try { return formatPrepContent(JSON.parse(chunks)); } catch { return formatPrepContent(chunks); } }
    return null;
  };

  /** Generate a single section — fully isolated, no shared state */
  const generateOneSection = useCallback(async (section: string) => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    const label = SIDEBAR_SECTIONS.find(s => s.id === section)?.label || section;
    setSectionStatus(prev => ({ ...prev, [section]: 'generating' }));

    try {
      const res = await fetch(`${API_URL}/api/ascend/prep/section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section, jobDescription: state.jd, resume: state.resume, coverLetter: state.coverLetter, prepMaterial: state.prepMaterials }),
      });

      if (!res.ok) {
        setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
        setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: `Error ${res.status}: ${res.statusText || 'Failed'}` } } }));
        return;
      }

      const content = await readSSE(res);
      setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: content || { summary: `No content received for ${label}` } } }));
      setSectionStatus(prev => ({ ...prev, [section]: content ? 'done' : 'error' }));
    } catch {
      setSectionStatus(prev => ({ ...prev, [section]: 'error' }));
      setState(prev => ({ ...prev, sections: { ...prev.sections, [section]: { summary: `Error generating ${label}` } } }));
    }
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token]);

  /** Generate ALL sections in parallel — each runs independently */
  const handleGenerate = useCallback(async () => {
    if (!state.jd.trim() || !state.resume.trim() || !token) return;
    setGenerating(true);
    const initStatus: Record<string, 'pending' | 'generating' | 'done' | 'error'> = {};
    GENERATE_SECTIONS.forEach(s => { initStatus[s] = 'generating'; });
    setSectionStatus(initStatus);

    await Promise.allSettled(GENERATE_SECTIONS.map(s => generateOneSection(s)));
    setGenerating(false);
  }, [state.jd, state.resume, state.coverLetter, state.prepMaterials, token, generateOneSection]);

  /** Re-generate a single section */
  const regenerateSection = useCallback(async (section: string) => {
    await generateOneSection(section);
  }, [generateOneSection]);

  const hasRequiredDocs = state.jd.trim().length > 0 && state.resume.trim().length > 0;

  return (
    <div className="h-full flex flex-col sm:flex-row" style={{ background: '#ffffff' }}>
      {/* Sidebar */}
      <div className="w-full sm:w-[180px] flex flex-col shrink-0 sm:shrink-0" style={{ borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
        {/* Company selector */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8', fontFamily: "'Inter', sans-serif" }}>Interview Prep</h2>
          {prepData.activeCompany ? (
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                <span className="truncate">{prepData.activeCompany}</span>
                <svg className="w-3 h-3 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                    {prepData.companies.map(c => (
                      <button key={c} onClick={() => switchCompany(c)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors"
                        style={{ color: c === prepData.activeCompany ? '#22D3EE' : '#475569', background: c === prepData.activeCompany ? '#22D3EE08' : 'transparent' }}>
                        <span className="truncate">{c}</span>
                        {prepData.companies.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); deleteCompany(c); }}
                            className="p-0.5 rounded" style={{ color: '#94a3b8' }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </button>
                    ))}
                    <button onClick={() => { setShowDropdown(false); setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
                      className="w-full px-3 py-2 text-xs font-medium text-left" style={{ color: '#22D3EE', borderTop: '1px solid #e2e8f0' }}>
                      + Add Company
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : showNewCompany ? (
            <div className="space-y-1.5">
              <input ref={newCompanyRef} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCompany(); if (e.key === 'Escape') setShowNewCompany(false); }}
                placeholder="e.g. Nvidia Devops" className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a' }} />
              <div className="flex gap-1.5">
                <button onClick={addCompany} className="flex-1 py-1 text-[10px] font-bold rounded" style={{ background: '#22D3EE', color: '#fff' }}>Create</button>
                <button onClick={() => setShowNewCompany(false)} className="px-2 py-1 text-[10px] rounded" style={{ color: '#94a3b8' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setShowNewCompany(true); setTimeout(() => newCompanyRef.current?.focus(), 100); }}
              className="w-full py-2 text-xs font-bold rounded-lg" style={{ background: '#22D3EE', color: '#fff' }}>
              + Add Company
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {SIDEBAR_SECTIONS.map((s) => {
            const isActive = s.id === activeSection;
            const hasContent = s.id === 'input' ? hasRequiredDocs : !!state.sections[s.id];
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-xs font-medium"
                style={{
                  background: isActive ? '#22D3EE08' : 'transparent',
                  color: isActive ? '#22D3EE' : '#475569',
                  borderLeft: isActive ? `3px solid #22D3EE` : '3px solid transparent',
                }}>
                {/* Status indicator */}
                {sectionStatus[s.id] === 'generating' ? (
                  <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: s.color, borderTopColor: 'transparent' }} />
                ) : sectionStatus[s.id] === 'done' || hasContent ? (
                  <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center" style={{ background: s.color }}>
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : sectionStatus[s.id] === 'error' ? (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                ) : (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#e2e8f0' }} />
                )}
                <span className="flex-1">{s.label}</span>
                {sectionStatus[s.id] === 'pending' && generating && (
                  <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#94a3b8' }}>queued</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Generate button + progress */}
        <div className="p-3" style={{ borderTop: '1px solid #e2e8f0' }}>
          {generating && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-medium" style={{ color: '#94a3b8' }}>Generating all sections...</span>
                <span className="text-[9px] font-bold" style={{ color: '#22D3EE' }}>
                  {Object.values(sectionStatus).filter(s => s === 'done').length}/{GENERATE_SECTIONS.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${(Object.values(sectionStatus).filter(s => s === 'done').length / GENERATE_SECTIONS.length) * 100}%`,
                  background: '#22D3EE',
                }} />
              </div>
            </div>
          )}
          <button onClick={handleGenerate} disabled={!hasRequiredDocs || generating}
            className="w-full py-2.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            style={{ background: '#22D3EE', color: '#fff' }}>
            {generating ? 'Generating...' : `Generate (${GENERATE_SECTIONS.length})`}
          </button>
          {!hasRequiredDocs && <p className="text-[9px] mt-1.5 text-center" style={{ color: '#94a3b8' }}>Add JD & Resume to start</p>}
          <button onClick={() => { setState({ ...EMPTY_DOC } as any); setSectionStatus({}); setActiveSection('input'); }}
            className="w-full py-1.5 mt-1.5 text-[10px] font-medium rounded-lg" style={{ color: '#94a3b8' }}>Clear</button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {activeSection === 'input' ? (
          <div className="p-6 max-w-4xl">
            {/* Materials */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#22D3EE' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>Materials</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <UploadZone label="Job Description" required value={state.jd} fileName={state.jdFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, jd: t, jdFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, jd: t }))}
                  onClickOverride={() => { setJdEditText(state.jd || ''); setJdModalOpen(true); }} />
                <UploadZone label="Resume" required value={state.resume} fileName={state.resumeFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, resume: t, resumeFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, resume: t }))} />
                <UploadZone label="Cover Letter" value={state.coverLetter} fileName={state.coverLetterFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, coverLetter: t, coverLetterFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, coverLetter: t }))} />
                <UploadZone label="Prep Materials" value={state.prepMaterials} fileName={state.prepMaterialsFile}
                  onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, prepMaterials: t, prepMaterialsFile: f.name })); }}
                  onPaste={(t) => setState(p => ({ ...p, prepMaterials: t }))} />
              </div>
            </div>

            {/* Study Materials */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#22D3EE' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>Study Materials</span>
              </div>
              <UploadZone label="Drop files or click" value={state.studyMaterials} fileName={state.studyMaterialsFile}
                onUpload={async (f) => { const t = await extractFile(f); setState(p => ({ ...p, studyMaterials: t, studyMaterialsFile: f.name })); }}
                onPaste={(t) => setState(p => ({ ...p, studyMaterials: t }))} />
            </div>

            {/* Status */}
            <div className="mt-6 text-center">
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {hasRequiredDocs ? 'Ready to generate — click Generate in the sidebar' : 'Add JD & Resume to start'}
              </p>
            </div>
          </div>
        ) : activeSection === 'jd-view' ? (
          /* JD formatted viewer */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Job Description</h3>
              <button onClick={() => setActiveSection('input')} className="text-[10px] font-medium px-2 py-1 rounded-lg" style={{ color: '#22D3EE', background: '#22D3EE08' }}>Edit</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <FormattedJD text={state.jd} />
            </div>
          </div>
        ) : (
          /* Generated section content */
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>
                {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}
              </h3>
              <div className="flex items-center gap-2">
                {state.sections[activeSection] && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#22D3EE08', color: '#22D3EE' }}>Generated</span>
                )}
                {hasRequiredDocs && (
                  <button
                    onClick={() => regenerateSection(activeSection)}
                    disabled={sectionStatus[activeSection] === 'generating'}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-40"
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                    {sectionStatus[activeSection] === 'generating' ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    {state.sections[activeSection] ? 'Re-generate' : 'Generate'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {sectionStatus[activeSection] === 'generating' ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#22D3EE', borderTopColor: 'transparent' }} />
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Generating {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label}...</p>
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Each section generates independently</p>
                </div>
              ) : state.sections[activeSection] ? (
                <PrepContentRenderer content={state.sections[activeSection]} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>No content yet</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>
                    {hasRequiredDocs ? 'Click Generate or Re-generate above' : 'Add JD & Resume first'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {jdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeJdModal}>
          <div className="w-full max-w-2xl mx-4 rounded-lg overflow-hidden" style={{ background: '#ffffff' }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Job Description</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => jdFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                  Upload File
                </button>
                <button onClick={closeJdModal} className="p-1 rounded" style={{ color: '#94a3b8' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#475569' }}>Paste job posting URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={jdUrl}
                  onChange={(e) => { setJdUrl(e.target.value); setJdUrlError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && jdUrl.trim() && !jdFetching) { e.preventDefault(); fetchJdUrl(jdUrl); } }}
                  placeholder="https://nvidia.wd5.myworkdayjobs.com/..."
                  disabled={jdFetching}
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
                />
                <button onClick={pasteJdFromClipboard} disabled={jdFetching}
                  className="px-3 py-2 rounded text-xs font-medium" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', opacity: jdFetching ? 0.5 : 1, cursor: jdFetching ? 'not-allowed' : 'pointer' }}
                  title="Paste URL or JD text from clipboard">
                  Paste
                </button>
                <button onClick={() => fetchJdUrl(jdUrl)} disabled={!jdUrl.trim() || jdFetching}
                  className="px-3 py-2 rounded text-xs font-bold" style={{ background: '#22D3EE', color: '#fff', opacity: (!jdUrl.trim() || jdFetching) ? 0.5 : 1, cursor: (!jdUrl.trim() || jdFetching) ? 'not-allowed' : 'pointer' }}>
                  {jdFetching ? 'Fetching…' : 'Fetch JD'}
                </button>
              </div>
              <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                Supports Workday, Greenhouse, Lever, Ashby, SmartRecruiters, LinkedIn, and most career pages.
              </p>
              {jdUrlError && <p className="text-[11px] mt-1.5" style={{ color: '#ef4444' }}>{jdUrlError}</p>}

              <textarea
                value={jdEditText}
                onChange={(e) => setJdEditText(e.target.value)}
                placeholder="Or paste the full job description text here..."
                className="w-full mt-3 p-3 rounded-lg text-xs resize-none"
                style={{ height: '240px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
              />
              <input ref={jdFileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setJdFetching(true);
                  try {
                    const t = await extractFile(f);
                    setState(p => ({ ...p, jd: t, jdFile: f.name }));
                    closeJdModal();
                  } finally { setJdFetching(false); }
                }} />
            </div>
            <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button onClick={closeJdModal} className="px-4 py-2 rounded text-xs font-medium" style={{ background: '#f1f5f9', color: '#475569' }}>Cancel</button>
              <button
                onClick={() => {
                  if (jdEditText.trim()) setState(p => ({ ...p, jd: jdEditText.trim(), jdFile: undefined }));
                  closeJdModal();
                }}
                disabled={!jdEditText.trim()}
                className="px-4 py-2 rounded text-xs font-bold"
                style={{ background: '#22D3EE', color: '#fff', opacity: jdEditText.trim() ? 1 : 0.5, cursor: jdEditText.trim() ? 'pointer' : 'not-allowed' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
