/* ── DesignLayout parsers + types ─────────────────────────────────────────
   Pure parser functions and shared types for the system-design answer
   pipeline. Kept React-free except extractReadableProse which returns
   React.ReactNode[] for the streaming preview zone.

   Extracted from DesignLayout.tsx so the 1500-line render component stays
   readable. No behavior change; parser identity preserved.
*/
import React from 'react';

export interface SystemDesign {
  overview?: string;
  requirements?: { functional?: string[]; nonFunctional?: string[] };
  scaleEstimates?: Record<string, string>;
  scaleInputs?: {
    DAU?: number;
    RequestsPerUser?: number;
    PayloadBytes?: number;
    RetentionDays?: number;
    PeakMultiplier?: number;
    ReadWriteRatio?: number;
  };
  architecture?: { components?: string[]; description?: string };
  scalability?: string[];
  techJustifications?: Array<{ tech: string; details: string[] }>;
  tradeoffs?: string[];
  edgeCases?: string[];
  followups?: Array<{ question: string; answer: string }>;
}

export interface DesignResult {
  pitch?: string;
  systemDesign?: SystemDesign;
}

/** Parse bullet lines from a tag block — handles -, *, and plain lines */
export function parseBullets(text: string): string[] {
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^(FUNCTIONAL|NON.?FUNCTIONAL)$/i.test(l))
    .map(l => l.replace(/^[\s*-]+/, '').trim())
    .filter(Boolean);
}

/** Single source of truth: parse tag map into SystemDesign */
export function parseTagsToDesign(byType: Record<string, string>): DesignResult | null {
  if (Object.keys(byType).length === 0) return null;

  const sd: SystemDesign = {
    overview: byType.HEADLINE || '',
    requirements: { functional: [], nonFunctional: [] },
    scaleEstimates: {},
    tradeoffs: byType.TRADEOFFS ? parseBullets(byType.TRADEOFFS) : [],
    edgeCases: byType.EDGECASES ? parseBullets(byType.EDGECASES) : [],
    followups: [],
  };

  // Requirements: split into functional / non-functional
  if (byType.REQUIREMENTS) {
    const lines = byType.REQUIREMENTS.split('\n').filter(l => l.trim());
    let section: 'functional' | 'nonFunctional' = 'functional';
    lines.forEach(line => {
      if (/non.?functional/i.test(line)) { section = 'nonFunctional'; return; }
      if (/^functional/i.test(line)) { section = 'functional'; return; }
      const clean = line.replace(/^[\s*-]+/, '').trim();
      if (clean) sd.requirements![section]!.push(clean);
    });
  }

  // Scale math
  if (byType.SCALEMATH) {
    byType.SCALEMATH.split('\n').filter(l => l.includes(':')).forEach(line => {
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (key?.trim() && value && sd.scaleEstimates) sd.scaleEstimates[key.trim()] = value;
    });
  }

  // Scale calculator baseline inputs (DAU=1000000, RequestsPerUser=10, ...)
  if (byType.SCALECALC) {
    const inputs: Record<string, number> = {};
    byType.SCALECALC.split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Za-z]+)\s*=\s*([0-9.eE+-]+)\s*$/);
      if (m) {
        const n = Number(m[2]);
        if (Number.isFinite(n)) inputs[m[1]] = n;
      }
    });
    if (Object.keys(inputs).length > 0) sd.scaleInputs = inputs as SystemDesign['scaleInputs'];
  }

  // Follow-ups (Q1/A1 pairs — accumulate multi-line answers)
  if (byType.FOLLOWUP) {
    const lines = byType.FOLLOWUP.split('\n');
    let q = '';
    let a = '';
    const flush = () => {
      if (q && a) sd.followups!.push({ question: q, answer: a.trim() });
      q = ''; a = '';
    };
    lines.forEach(line => {
      const t = line.trim();
      if (/^Q\d/i.test(t)) {
        flush();
        q = t.replace(/^Q\d+[:.)\s]+/i, '').trim();
      } else if (/^A\d/i.test(t) && q) {
        a = t.replace(/^A\d+[:.)\s]+/i, '').trim();
      } else if (a && t) {
        a += ' ' + t;
      }
    });
    flush();
  }

  // Deep design → architecture layers + scalability tags
  if (byType.DEEPDESIGN) {
    const layers = byType.DEEPDESIGN.split('\n');
    const techJusts: Array<{ tech: string; details: string[] }> = [];
    let currentGroup: { tech: string; details: string[] } | null = null;
    const scalItems: string[] = [];

    layers.forEach(line => {
      const trimmed = line.trim();
      if (/^\d+[.)]\s/.test(trimmed)) {
        const layerName = trimmed.replace(/^\d+[.)]\s*/, '').trim();
        scalItems.push(layerName);
        currentGroup = { tech: layerName, details: [] };
        techJusts.push(currentGroup);
      } else if (trimmed.startsWith('-') && currentGroup) {
        const detail = trimmed.replace(/^-\s*/, '').trim();
        if (detail) currentGroup.details.push(detail);
      }
    });

    sd.scalability = scalItems;
    if (techJusts.length > 0) sd.techJustifications = techJusts;
  }

  return { pitch: byType.ANSWER || byType.HEADLINE || '', systemDesign: sd };
}

/** Known tag names for bare-heading fallback */
const KNOWN_TAGS = new Set([
  'HEADLINE', 'ANSWER', 'DIAGRAM', 'CODE', 'FOLLOWUP',
  'REQUIREMENTS', 'SCALEMATH', 'SCALECALC', 'DEEPDESIGN', 'EDGECASES', 'TRADEOFFS',
  'PROBLEM', 'APPROACH', 'COMPLEXITY', 'WALKTHROUGH', 'TESTCASES',
]);

/** Extract tag blocks from raw text — handles [TAG]...[/TAG] AND bare TAG headings */
export function extractTagMap(raw: string): Record<string, string> {
  const byType: Record<string, string> = {};

  // Strategy 1: Bracketed [TAG]...[/TAG]
  const tagRegex = /\[(\w+)\]\n?([\s\S]*?)\[\/\1\]/g;
  let match;
  while ((match = tagRegex.exec(raw)) !== null) {
    const tag = match[1].toUpperCase();
    if (match[2].trim()) byType[tag] = match[2].trim();
  }

  // Strategy 2: Bare headings — TAG alone on a line, all caps
  if (Object.keys(byType).length === 0) {
    const lines = raw.split('\n');
    let currentTag = '';
    let currentLines: string[] = [];
    for (const line of lines) {
      const stripped = line.trim();
      if (KNOWN_TAGS.has(stripped) && stripped === stripped.toUpperCase()) {
        if (currentTag) {
          const body = currentLines.join('\n').trim();
          if (body) byType[currentTag] = body;
        }
        currentTag = stripped;
        currentLines = [];
      } else if (currentTag) {
        currentLines.push(line);
      }
    }
    if (currentTag) {
      const body = currentLines.join('\n').trim();
      if (body) byType[currentTag] = body;
    }
  }

  return byType;
}

/**
 * Turn a partial streaming buffer (JSON, tags, or raw prose) into
 * human-readable JSX while it's still arriving. Runs in the
 * <isLoading && !sd> preview zone so the candidate sees motion and
 * meaningful content from the first token, not a 15-second spinner.
 *
 * Handles three shapes:
 *   1. Tagged blocks  — [HEADLINE]…[/HEADLINE], [REQUIREMENTS]…[/…]
 *                       (even if the closing tag hasn't arrived yet,
 *                       we show the text between the open tag and the
 *                       current end-of-buffer).
 *   2. JSON object    — `{"overview":"...","requirements":{…}}` —
 *                       scrapes completed "key": "value" pairs and
 *                       renders them as labeled lines.
 *   3. Free prose     — nothing structural detected, show as-is.
 */
export function extractReadableProse(raw: string): React.ReactNode[] {
  if (!raw) return [];
  const lines: React.ReactNode[] = [];

  // Strip an opening ```json fence if present.
  let txt = raw.trim();
  if (txt.startsWith('```')) {
    const nl = txt.indexOf('\n');
    if (nl > 0) txt = txt.substring(nl + 1);
    const closeFence = txt.lastIndexOf('```');
    if (closeFence > 0) txt = txt.substring(0, closeFence);
  }

  // Shape 1 — tagged blocks (closed OR still-open).
  const tagBlocks: Array<{ name: string; body: string }> = [];
  const tagPat = /\[(HEADLINE|ANSWER|REQUIREMENTS|SCALEMATH|DEEPDESIGN|EDGECASES|TRADEOFFS|FOLLOWUP|CODE)\](\n?)([\s\S]*?)(?:\[\/\1\]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = tagPat.exec(txt)) !== null) {
    const name = m[1].toUpperCase();
    const body = (m[3] || '').trim();
    if (body) tagBlocks.push({ name, body });
  }
  if (tagBlocks.length > 0) {
    tagBlocks.forEach((b, i) => {
      lines.push(
        <div key={`tag-${i}`} className="mt-3 first:mt-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60 font-mono">{b.name.replace(/_/g, ' ')}</div>
          <div className="mt-1 whitespace-pre-wrap">{b.body}</div>
        </div>
      );
    });
    return lines;
  }

  // Shape 2 — JSON-ish (has a leading brace).
  const firstBrace = txt.indexOf('{');
  if (firstBrace >= 0) {
    const body = txt.substring(firstBrace);
    const pairPat = /"([A-Za-z][A-Za-z0-9_]*)"\s*:\s*"((?:\\.|[^"\\])*)"/g;
    const pairs: Array<{ key: string; value: string }> = [];
    let pm: RegExpExecArray | null;
    while ((pm = pairPat.exec(body)) !== null) {
      const key = pm[1];
      const value = pm[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      if (value.length >= 2) pairs.push({ key, value });
    }
    if (pairs.length > 0) {
      pairs.forEach((p, i) => {
        const label = p.key
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/^./, (c) => c.toUpperCase());
        lines.push(
          <div key={`k-${i}`} className="mt-3 first:mt-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60 font-mono">{label}</div>
            <div className="mt-1 whitespace-pre-wrap">{p.value}</div>
          </div>
        );
      });
      // Show the trailing unfinished key/value if any.
      const tail = body.match(/"([A-Za-z][A-Za-z0-9_]*)"\s*:\s*"((?:\\.|[^"\\])*)$/);
      if (tail && tail[2] && tail[2].length > 0) {
        const tailLabel = tail[1]
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/^./, (c) => c.toUpperCase());
        lines.push(
          <div key="tail" className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60 font-mono">{tailLabel}</div>
            <div className="mt-1 whitespace-pre-wrap">{tail[2]}</div>
          </div>
        );
      }
      return lines;
    }
  }

  // Shape 3 — no structure detected.
  lines.push(<div key="prose" className="whitespace-pre-wrap">{txt}</div>);
  return lines;
}

/** Extract a numeric value and unit from a scale estimate string */
export function parseMetricHighlight(value: string): { number: string; rest: string } | null {
  const match = value.match(/^([\d,.]+\s*[KMBTPG]?[B]?)\s*(.*)/i);
  if (match) return { number: match[1].trim(), rest: match[2].trim() };
  return null;
}
