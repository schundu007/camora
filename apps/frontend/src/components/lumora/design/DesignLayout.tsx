import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { streamResponse } from '@/lib/sse-client';
import { getSystemContext } from '@/lib/lumora-assistant';
import { ArchitectureDiagram } from '@/components/lumora/interview/ArchitectureDiagram';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { StreamingAnswer } from '@/components/lumora/interview/StreamingAnswer';
import { transcriptionAPI } from '@/lib/api-client';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface DesignLayoutProps {
  onBack: () => void;
  initialProblem?: string;
  /** When true, hides internal header and uses flex-1 instead of h-screen (for embedding in LumoraShell) */
  embedded?: boolean;
  /** Ref that parent sets to receive voice transcriptions as problem input */
  onVoiceProblemRef?: React.MutableRefObject<((text: string) => void) | null>;
}

interface SystemDesign {
  overview?: string;
  requirements?: { functional?: string[]; nonFunctional?: string[] };
  scaleEstimates?: Record<string, string>;
  architecture?: { components?: string[]; description?: string };
  scalability?: string[];
  techJustifications?: Array<{ tech: string; details: string[] }>;
  tradeoffs?: string[];
  edgeCases?: string[];
  followups?: Array<{ question: string; answer: string }>;
}

interface DesignResult {
  pitch?: string;
  systemDesign?: SystemDesign;
}

/** Parse bullet lines from a tag block — handles -, *, and plain lines */
function parseBullets(text: string): string[] {
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^(FUNCTIONAL|NON.?FUNCTIONAL)$/i.test(l))
    .map(l => l.replace(/^[\s*-]+/, '').trim())
    .filter(Boolean);
}

/** Single source of truth: parse tag map into SystemDesign */
function parseTagsToDesign(byType: Record<string, string>): DesignResult | null {
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
        // Continuation line of current answer
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
  'REQUIREMENTS', 'SCALEMATH', 'DEEPDESIGN', 'EDGECASES', 'TRADEOFFS',
  'PROBLEM', 'APPROACH', 'COMPLEXITY', 'WALKTHROUGH', 'TESTCASES',
]);

/** Extract tag blocks from raw text — handles [TAG]...[/TAG] AND bare TAG headings */
function extractTagMap(raw: string): Record<string, string> {
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

/** Extract a numeric value and unit from a scale estimate string */
function parseMetricHighlight(value: string): { number: string; rest: string } | null {
  const match = value.match(/^([\d,.]+\s*[KMBTPG]?[B]?)\s*(.*)/i);
  if (match) return { number: match[1].trim(), rest: match[2].trim() };
  return null;
}

/** Section icons as inline SVGs for visual hierarchy */
const SectionIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    overview: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    explanation: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    functional: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    nonfunctional: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    scalability: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    scale: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    architecture: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    tradeoffs: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    edgecases: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    followup: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

/** Scalability tier colors — stepped cyan intensity so each tier is visually
 *  distinguishable while staying on-brand (Lumora Sharp Palette, not rainbow). */
const tierColors = [
  { bg: 'bg-[rgba(34,211,238,0.04)]', border: 'border-[rgba(34,211,238,0.15)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.06)]', border: 'border-[rgba(34,211,238,0.22)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.08)]', border: 'border-[rgba(34,211,238,0.30)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.10)]', border: 'border-[rgba(34,211,238,0.38)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.12)]', border: 'border-[rgba(34,211,238,0.46)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.14)]', border: 'border-[rgba(34,211,238,0.54)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.16)]', border: 'border-[rgba(34,211,238,0.62)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(34,211,238,0.18)]', border: 'border-[rgba(34,211,238,0.70)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
];

/** Architecture layer accents — same stepped cyan intensity for layers. */
const layerAccents = [
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.04)', border: 'rgba(34,211,238,0.15)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.06)', border: 'rgba(34,211,238,0.22)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.30)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.38)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.46)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.14)', border: 'rgba(34,211,238,0.54)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.16)', border: 'rgba(34,211,238,0.62)' },
  { accent: '#22D3EE', bg: 'rgba(34,211,238,0.18)', border: 'rgba(34,211,238,0.70)' },
];

/** Format seconds as MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function useTheme(_dark: boolean) {
  return {
    cardBg: '#ffffff', cardBorder: '#e5e7eb',
    headerBg: 'rgba(34,211,238,0.05)', headerBorder: '#BFDBFE',
    headerText: '#22D3EE', badgeBg: '#22D3EE10', badgeText: '#22D3EE',
    text: '#111827', textMuted: '#6b7280', textDim: '#9ca3af',
    codeBg: '#f9fafb', codeText: '#1f2937',
    inputBg: '#ffffff', inputBorder: '#e5e7eb', inputText: '#111827',
    sectionBg: '#f9fafb', surfaceBg: '#ffffff',
    tabActive: '#22D3EE', tabActiveBg: '#ffffff', tabText: '#6b7280',
    dotColor: '#22D3EE',
  };
}

/** Tiny copy-to-clipboard button for section headers. Placed with ml-auto so it
 *  sits on the right of the row next to (or in place of) the count badge. */
function SectionCopyBtn({ getText, title }: { getText: () => string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(getText()).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title={title || 'Copy section'}
      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all hover:bg-black/5"
      style={{ color: '#64748B', border: '1px solid rgba(0,0,0,0.08)' }}>
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

export function DesignLayout({ onBack, initialProblem, embedded, onVoiceProblemRef }: DesignLayoutProps) {
  const t = useTheme(!!embedded);
  const { token } = useAuth();
  const { setStatus } = useInterviewStore();

  const [problemText, setProblemText] = useState(initialProblem || '');
  const autoSubmittedRef = useRef(false);
  const [inputTab, setInputTab] = useState<'text' | 'url' | 'image'>('text');
  const [detailLevel, setDetailLevel] = useState<'basic' | 'full'>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [question, setQuestion] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expandedFollowup, setExpandedFollowup] = useState<number | null>(null);
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const pendingVoiceSubmit = useRef(false);

  // Timer state (matching coding page)
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const total = minutes * 60;
    setTimerDuration(total);
    setTimerSeconds(total);
    setTimerRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const timerPercent = timerDuration > 0 ? (timerSeconds / timerDuration) * 100 : 0;
  const timerUrgent = timerDuration > 0 && timerSeconds < 300 && timerSeconds > 0;

  // Resizable left panel
  const [leftWidth, setLeftWidth] = useState(42); // percentage — 42% problem+diagram, 58% design
  const isResizing = useRef(false);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const containerWidth = mainRef.current?.clientWidth || window.innerWidth;
      const newPct = ((startWidth / 100) * containerWidth + (e.clientX - startX)) / containerWidth * 100;
      setLeftWidth(Math.min(Math.max(20, newPct), 55));
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftWidth]);

  const handleImageUpload = useCallback(async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Extract text from image via Claude Vision
    if (!token) {
      setErrorMsg('Not authenticated. Please refresh the page.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', file);
      const resp = await fetch(`${API_URL}/api/v1/coding/extract-from-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setErrorMsg(errData.detail || 'Failed to extract text from image');
        return;
      }
      const data = await resp.json();
      if (data.problem) {
        setProblemText(data.problem);
        setInputTab('text');
        setErrorMsg(null);
      } else {
        setErrorMsg('Could not extract text from this image. Try a clearer screenshot.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Image extraction failed. Please try again.');
    }
  }, [token]);

  const handleSubmit = useCallback(async (overrideText?: string) => {
    const text = overrideText || problemText;
    if (!text.trim() || !token || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setStreamingText('');
    setErrorMsg(null);
    setProblemText(text.trim());
    setQuestion(text.trim());
    setStatus('write', 'Generating design...');

    const chunks: string[] = [];

    try {
      await streamResponse({
        question: `[SYSTEM DESIGN] ${text.trim()}`,
        useSearch: false,
        systemContext: getSystemContext(),
        detailLevel,
        token,
        onToken: (data) => {
          if (data.t) {
            chunks.push(data.t);
            setStreamingText(prev => prev + data.t);
          }
        },
        onAnswer: (data: any) => {
          const parsed = data.parsed;
          const raw = data.raw || '';

          // Case 1: JSON object with systemDesign
          if (parsed && !Array.isArray(parsed) && parsed.systemDesign) {
            const sd = parsed.systemDesign;
            if (sd.techJustifications && sd.techJustifications.length > 0 && sd.techJustifications[0].why) {
              const grouped = new Map<string, string[]>();
              sd.techJustifications.forEach((tj: any) => {
                const details = grouped.get(tj.tech) || [];
                details.push(tj.why + (tj.alternatives ? ` (Alt: ${tj.alternatives})` : ''));
                grouped.set(tj.tech, details);
              });
              sd.techJustifications = Array.from(grouped.entries()).map(([tech, details]) => ({ tech, details }));
            }
            setResult(parsed as DesignResult);
          }
          // Case 2: ParsedBlock[] array (tag-based)
          else if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            // Build tag map from parsed blocks + raw text fallback
            const byType: Record<string, string> = {};
            parsed.forEach((b: any) => { if (b.type && b.content) byType[b.type] = b.content; });
            // Fill any missing tags from raw text (handles truncation)
            const rawTags = extractTagMap(raw);
            Object.entries(rawTags).forEach(([k, v]) => { if (!byType[k]) byType[k] = v; });
            const result = parseTagsToDesign(byType);
            if (result) setResult(result);
          }
          // Case 3: Try raw JSON or raw tags from chunks
          else {
            const rawText = chunks.join('');
            // Try tags first
            const tagMap = extractTagMap(rawText);
            const tagResult = parseTagsToDesign(tagMap);
            if (tagResult) { setResult(tagResult); return; }
            // Try JSON
            try {
              let jsonText = rawText.trim();
              if (jsonText.startsWith('```')) {
                const nl = jsonText.indexOf('\n');
                const last = jsonText.lastIndexOf('```');
                jsonText = jsonText.substring(nl + 1, last > nl ? last : undefined).trim();
              }
              const brace = jsonText.indexOf('{');
              if (brace >= 0) jsonText = jsonText.substring(brace);
              const obj = JSON.parse(jsonText);
              if (obj.systemDesign) setResult(obj);
            } catch {
              // Can't parse
            }
          }
        },
        onComplete: () => {
          setIsLoading(false);
          setStatus('ready', 'Design complete');
          // Safety net: if onAnswer never fired (connection drop), parse streamed tokens directly
          setTimeout(() => {
            setResult(prev => {
              if (prev) return prev;
              const raw = chunks.join('');
              if (!raw.trim()) {
                setErrorMsg('No response received. Please try again.');
                return null;
              }
              const tagMap = extractTagMap(raw);
              const result = parseTagsToDesign(tagMap);
              if (result) return result;
              setErrorMsg('Response received but could not be parsed. Please try again.');
              return null;
            });
          }, 200);
        },
        onError: (data) => {
          setIsLoading(false);
          setErrorMsg(data.msg || 'Failed to generate design. Please try again.');
          setStatus('error', data.msg);
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Network error. Please check your connection and try again.');
    }
  }, [problemText, token, isLoading, setStatus]);

  // Set problemText from initialProblem
  useEffect(() => {
    if (initialProblem && !autoSubmittedRef.current) {
      setProblemText(initialProblem);
    }
  }, [initialProblem]);

  // Auto-submit once problemText is set and token is ready
  useEffect(() => {
    if (initialProblem && !autoSubmittedRef.current && token && !isLoading && problemText === initialProblem) {
      autoSubmittedRef.current = true;
      handleSubmit();
    }
  }, [initialProblem, token, isLoading, problemText, handleSubmit]);

  // Register voice problem handler for parent shell
  useEffect(() => {
    if (onVoiceProblemRef) {
      onVoiceProblemRef.current = (text: string) => {
        setProblemText(text);
        handleSubmit(text);
      };
    }
    return () => { if (onVoiceProblemRef) onVoiceProblemRef.current = null; };
  }, [onVoiceProblemRef, token, isLoading, handleSubmit]);

  // Auto-submit after voice input sets problemText
  useEffect(() => {
    if (pendingVoiceSubmit.current && problemText.trim() && token && !isLoading) {
      pendingVoiceSubmit.current = false;
      handleSubmit();
    }
  }, [problemText, token, isLoading, handleSubmit]);

  const handleReset = useCallback(() => {
    setProblemText('');
    setResult(null);
    setStreamingText('');
    setQuestion('');
    setErrorMsg(null);
    setExpandedFollowup(null);
    setInputCollapsed(false);
  }, []);

  // Keyboard shortcut: Cmd+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setResult(null);
        setStreamingText('');
        setProblemText('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit]);

  const sd = result?.systemDesign;

  return (
    <div className={embedded ? 'flex-1 flex flex-col min-h-0' : 'h-screen w-full flex flex-col lumora-app-bg'}>
      {/* Header — hidden when embedded in LumoraShell */}
      {!embedded && (
      <header className="flex items-center justify-between h-11 px-3 shrink-0" style={{ background: 'linear-gradient(90deg, #0e7490 0%, #06B6D4 50%, #0e7490 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold text-white/70 hover:text-white rounded transition-colors">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22D3EE, #22D3EE)' }}>
              <span className="text-white text-[10px] md:text-xs font-extrabold">L</span>
            </div>
            <span className="text-white font-extrabold text-xs md:text-sm" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>System Design</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          {/* Detail level toggle */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setDetailLevel('basic')}
              className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${
                detailLevel === 'basic' ? 'text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
              style={detailLevel === 'basic' ? { background: 'rgba(96,165,250,0.25)' } : {}}
            >Basic</button>
            <button
              onClick={() => setDetailLevel('full')}
              className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${
                detailLevel === 'full' ? 'text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
              style={detailLevel === 'full' ? { background: 'rgba(96,165,250,0.25)' } : {}}
            >Full</button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer — matching coding page */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-50 border-red-200 text-red-600' :
              timerSeconds === 0 ? 'bg-white/10 border-white/20 text-white/70' :
              'bg-[rgba(34,211,238,0.06)] border-[rgba(34,211,238,0.2)] text-[var(--accent)]'
            } ${timerUrgent ? 'timer-urgent' : ''}`}>
              <div className="relative w-4 h-4">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeDasharray={`${timerPercent * 0.5} 50`} strokeLinecap="round" />
                </svg>
              </div>
              <span>{formatTime(timerSeconds)}</span>
              <button onClick={stopTimer} className="ml-1 text-white/50 hover:text-red-400 transition-colors" title="Stop timer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => startTimer(m)}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title={`${m} min timer`}>
                  {m}m
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(34,211,238,0.06)] border border-[rgba(34,211,238,0.2)] rounded-lg">
              <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
              <span className="text-[var(--accent)] text-[10px] md:text-xs font-medium">Generating...</span>
            </div>
          )}

          {/* Reset */}
          <button onClick={handleReset} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Reset">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Voice Input — no more hacky getElementById */}
          <AudioCapture
            onTranscription={(text) => {
              if (text.trim()) {
                setProblemText(text.trim());
                pendingVoiceSubmit.current = true;
              }
            }}
            autoStart={false}
          />
        </div>
      </header>
      )}

      {/* Main content - vertical on mobile, horizontal on desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" ref={mainRef}>
        {/* Left: Problem Input - full width on mobile */}
        <div className="w-full md:shrink-0 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-[var(--border)] design-left-panel max-h-[35vh] md:max-h-none overflow-auto" style={{ ['--left-w' as any]: `${leftWidth}%` }}>
          {/* Input Tab Header */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: '#f1f5f9' }}>
              {(['text', 'url', 'image'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setInputTab(tab); setInputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${
                    inputTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={inputTab === tab ? { background: '#22D3EE', color: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' } : {}}
                >
                  {tab === 'text' ? 'Text' : tab === 'url' ? 'URL' : 'Image'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setInputCollapsed(!inputCollapsed)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${inputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Input area - collapsible */}
          <div className={`flex flex-col p-3 gap-2 ${inputCollapsed ? 'hidden' : ''}`}>
            {inputTab === 'text' && (
              <textarea id="design-prompt"
                ref={textareaRef}
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="Describe your system design problem...&#10;&#10;Example: Design a URL shortener like bit.ly that handles 100M links/month"
                className="w-full h-[80px] rounded-lg p-3 text-xs md:text-sm leading-relaxed resize-none focus:ring-1 focus:ring-[var(--accent)]/30 focus:outline-none transition-all font-mono"
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
              />
            )}
            {inputTab === 'url' && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://leetcode.com/problems/..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-1 focus:ring-[var(--accent)]/30 focus:outline-none transition-all font-mono"
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                />
                <button
                  onClick={async () => {
                    if (!urlInput.trim() || !token) return;
                    try {
                      const resp = await fetch(`${API_URL}/api/v1/coding/fetch-problem`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ url: urlInput.trim() }),
                      });
                      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || 'Failed to fetch');
                      const data = await resp.json();
                      if (data.problem) { setProblemText(data.problem); setInputTab('text'); }
                    } catch (err: any) {
                      setErrorMsg(`Failed to fetch URL: ${err.message}`);
                    }
                  }}
                  className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                >
                  Fetch
                </button>
              </div>
            )}
            {inputTab === 'image' && (
              <div
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) handleImageUpload(file);
                }}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all"
                style={{ borderColor: '#d1d5db', background: '#fafafa' }}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
                ) : (
                  <div className="space-y-2 text-center">
                    <div className="w-10 h-10 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-xs">Drop image or click to upload</p>
                  </div>
                )}
              </div>
            )}
            {errorMsg && !isLoading && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}
            <button
              onClick={() => handleSubmit()}
              disabled={!problemText.trim() || isLoading}
              className="w-full py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #22D3EE, #22D3EE)', borderRadius: '10px' }}
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>Design System</>
              )}
            </button>
          </div>

          {/* Architecture Diagram - in left panel below input.
              Mount on `question` alone (not `question && sd`) so the diagram
              cache lookup runs in parallel with the streaming text answer.
              This removes the mid-interview cold start where the diagram pane
              sat blank until the full answer had parsed. */}
          {question && (
            <div className="border-t border-[var(--border)] p-3 flex-1 overflow-auto min-h-0 hidden md:block">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <h4 className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">Architecture</h4>
              </div>
              <ArchitectureDiagram question={question} className="diagram-left-panel" />
            </div>
          )}
        </div>

        {/* Resizable divider - hidden on mobile, matching coding page */}
        <div
          className="hidden md:flex w-1.5 bg-[var(--bg-elevated)] hover:bg-[rgba(34,211,238,0.1)] cursor-col-resize transition-colors items-center justify-center group shrink-0"
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-0.5 h-8 bg-[var(--border)] group-hover:bg-[var(--accent)] rounded-full transition-colors" />
        </div>

        {/* Right: Design Result — light panel when standalone, themed when embedded */}
        <div className={`flex-1 min-h-0 min-w-0 overflow-auto ${embedded ? '' : 'lumora-light-panel'}`} style={{ background: t.surfaceBg }}>

          {!result && !isLoading && !streamingText && !errorMsg && (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: t.textDim }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: t.sectionBg }}>
                <svg className="w-7 h-7" style={{ color: t.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-mono" style={{ color: t.textMuted }}>Enter a system design question to get started</p>
              <p className="text-xs font-mono mt-1" style={{ color: t.textDim }}>Press ⌘+Enter to submit</p>
            </div>
          )}

          {isLoading && !sd && (
            <div className="flex flex-col h-full p-3 md:p-5">
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4 shrink-0" style={{ background: t.headerBg, border: `1px solid ${t.headerBorder}` }}>
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 border-2 rounded-full" style={{ borderColor: t.cardBorder }} />
                  <div className="absolute inset-0 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: t.dotColor }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: t.headerText }}>Analyzing and designing system architecture...</span>
              </div>
              {streamingText && (
                <pre className="flex-1 overflow-auto text-[10px] font-mono whitespace-pre-wrap leading-relaxed max-h-60" style={{ color: t.textDim }}>{streamingText}</pre>
              )}
            </div>
          )}

          {sd && (
            <div className="flex flex-col gap-2.5 p-3 md:p-5 design-result-appear" style={{ maxWidth: '1600px', margin: '0 auto' }}>

              {/* ── OVERVIEW ── */}
              {sd.overview && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #22D3EE)` }} />
                    <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Overview</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => sd.overview!} title="Copy overview" /></div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed" style={{ color: t.text }}>{sd.overview}</p>
                  </div>
                </section>
              )}

              {/* ── EXPLANATION ── */}
              {result?.pitch && result.pitch !== sd.overview && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #22D3EE)` }} />
                    <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Explanation</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => result.pitch!} title="Copy explanation" /></div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed italic" style={{ color: t.text }}>&ldquo;{result.pitch}&rdquo;</p>
                  </div>
                </section>
              )}

              {/* ── REQUIREMENTS: Functional + Non-Functional ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
                {sd.requirements?.functional && sd.requirements.functional.length > 0 && (
                  <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                      <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #22D3EE)` }} />
                      <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Functional</h2>
                      <span className="ml-auto text-[10px] font-mono rounded-full px-2 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.headerBorder}` }}>{sd.requirements.functional.length}</span>
                      <SectionCopyBtn getText={() => (sd.requirements?.functional || []).map((r, i) => `${i + 1}. ${r}`).join('\n')} title="Copy functional requirements" />
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-1 gap-y-1">
                        {sd.requirements.functional.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm leading-snug py-0.5" style={{ color: t.text }}>
                            <span className="font-bold shrink-0" style={{ color: t.headerText }}>{i + 1}.</span>{r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
                {sd.requirements?.nonFunctional && sd.requirements.nonFunctional.length > 0 && (
                  <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                      <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #3b82f6)` }} />
                      <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Non-Functional</h2>
                      <span className="ml-auto text-[10px] font-mono rounded-full px-2 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.headerBorder}` }}>{sd.requirements.nonFunctional.length}</span>
                      <SectionCopyBtn getText={() => (sd.requirements?.nonFunctional || []).join('\n')} title="Copy non-functional requirements" />
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-1 gap-y-1">
                        {sd.requirements.nonFunctional.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm leading-snug py-0.5" style={{ color: t.text }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: t.dotColor }} />{r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* ── SCALE ESTIMATES ── */}
              {sd.scaleEstimates && Object.entries(sd.scaleEstimates).filter(([, v]) => v && v.trim()).length > 0 && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, #22D3EE, ${t.dotColor})` }} />
                    <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Scale Estimates</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => Object.entries(sd.scaleEstimates || {}).filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v}`).join('\n')} title="Copy scale estimates" /></div>
                  </div>
                  <div className="px-4 py-2">
                    {(() => {
                      const items = Object.entries(sd.scaleEstimates).filter(([, v]) => v && v.trim());
                      const half = Math.ceil(items.length / 2);
                      const cols = [items.slice(0, half), items.slice(half)].filter(c => c.length > 0);
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          {cols.map((col, ci) => (
                            <table key={ci} className="w-full text-left font-mono" style={{ borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                                  <th className="text-[9px] font-bold uppercase tracking-wider py-1.5 pr-3" style={{ color: t.textMuted }}>Metric</th>
                                  <th className="text-[9px] font-bold uppercase tracking-wider py-1.5" style={{ color: t.textMuted }}>Estimate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {col.map(([key, val]) => (
                                  <tr key={key} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                                    <td className="text-[11px] font-bold py-1.5 pr-3 whitespace-nowrap" style={{ color: t.text }}>{key}</td>
                                    <td className="text-[11px] py-1.5" style={{ color: t.textMuted }}>{val}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

              {/* ── SCALABILITY TIERS ── */}
              {sd.techJustifications && sd.techJustifications.length > 0 && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, #22D3EE, ${t.dotColor})` }} />
                    <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Scalability Tiers</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => (sd.techJustifications || []).map(tier => `${tier.tech}\n${tier.details.map(d => `  - ${d}`).join('\n')}`).join('\n\n')} title="Copy scalability tiers" /></div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sd.techJustifications.map((tier, i) => (
                          <div key={i} className="rounded-lg p-2 text-center" style={{ border: `1px solid ${t.cardBorder}`, background: t.sectionBg }}>
                            <div className="text-xs font-bold text-white bg-[var(--accent)] rounded px-2 py-1 mb-1">{tier.tech}</div>
                            {tier.details.length > 0 && (
                              <div className="text-xs leading-relaxed text-left mt-1" style={{ color: t.textMuted }}>
                                {tier.details.map((d, j) => <div key={j} title={d}>- {d}</div>)}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
              )}

              {/* ── TRADEOFFS + EDGE CASES ── */}
              {((sd.tradeoffs && sd.tradeoffs.length > 0) || (sd.edgeCases && sd.edgeCases.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {sd.tradeoffs && sd.tradeoffs.length > 0 && (
                    <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                        <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #ec4899)` }} />
                        <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Tradeoffs</h2>
                        <div className="ml-auto"><SectionCopyBtn getText={() => (sd.tradeoffs || []).map((tr, i) => `${i + 1}. ${tr}`).join('\n')} title="Copy tradeoffs" /></div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-2">
                          {sd.tradeoffs.map((tr, i) => (
                            <div key={i} className="rounded-lg px-3 py-2" style={{ background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
                              <div className="flex items-start gap-2 text-sm leading-snug" style={{ color: t.text }}>
                                <span className="font-bold shrink-0 mt-0.5" style={{ color: t.dotColor }}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </span>
                                {tr}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                  {sd.edgeCases && sd.edgeCases.length > 0 && (
                    <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                        <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #f59e0b)` }} />
                        <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Edge Cases</h2>
                        <div className="ml-auto"><SectionCopyBtn getText={() => (sd.edgeCases || []).map((e, i) => `${i + 1}. ${e}`).join('\n')} title="Copy edge cases" /></div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-2">
                          {sd.edgeCases.map((e, i) => (
                            <div key={i} className="rounded-lg px-3 py-2" style={{ background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
                              <div className="flex items-start gap-2 text-sm leading-snug" style={{ color: t.text }}>
                                <span className="font-bold shrink-0 mt-0.5" style={{ color: t.dotColor }}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
                                </span>
                                {e}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* ── FOLLOW-UP Q&A ── */}
              {sd.followups && sd.followups.length > 0 && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, #f59e0b)` }} />
                    <h2 className="text-sm font-bold" style={{ color: t.headerText }}>Follow-up Q&A</h2>
                    <span className="ml-auto text-[10px] font-mono rounded-full px-2 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.headerBorder}` }}>{sd.followups.length}</span>
                    <SectionCopyBtn getText={() => (sd.followups || []).map((f, i) => `Q${i + 1}: ${f.question}\nA: ${f.answer}`).join('\n\n')} title="Copy follow-up Q&A" />
                  </div>
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sd.followups.map((f, i) => (
                        <div key={i} className="rounded-lg p-2.5" style={{ border: `1px solid ${t.cardBorder}`, background: t.sectionBg }}>
                          <div className="flex items-start gap-1.5 mb-1">
                            <span className="text-xs font-mono font-bold shrink-0" style={{ color: t.headerText }}>Q{i + 1}</span>
                            <span className="text-xs font-semibold" style={{ color: t.text }}>{f.question}</span>
                          </div>
                          <p className="text-xs leading-relaxed pl-5" style={{ color: t.textMuted }}>{f.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Enterprise Status Bar — matching coding page */}
      <div className="hidden sm:flex items-center justify-between h-7 px-3 bg-[var(--bg-elevated)] border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--accent)]'}`} />
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {isLoading ? 'Generating...' : 'Ready'}
          </span>
          {question && (
            <span className="text-[10px] font-mono text-[var(--text-muted)] border-l border-[var(--border)] pl-2 truncate max-w-[200px]">
              {question}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-muted)]">
          <span>
            <kbd className="px-1 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] text-[9px]">⌘↵</kbd> submit
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] text-[9px]">Esc</kbd> clear
          </span>
        </div>
      </div>
    </div>
  );
}
