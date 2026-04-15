import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { streamResponse } from '@/lib/sse-client';
import { ArchitectureDiagram } from '@/components/lumora/interview/ArchitectureDiagram';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { StreamingAnswer } from '@/components/lumora/interview/StreamingAnswer';
import { transcriptionAPI } from '@/lib/api-client';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

interface DesignLayoutProps {
  onBack: () => void;
  initialProblem?: string;
  hideHeader?: boolean;
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

/** Scalability tier colors for visual variety */
const tierColors = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
];

/** Architecture layer accent colors */
const layerAccents = [
  { accent: '#4f46e5', bg: 'rgba(79,70,229,0.04)', border: 'rgba(79,70,229,0.15)' },
  { accent: '#2563eb', bg: 'rgba(37,99,235,0.04)', border: 'rgba(37,99,235,0.15)' },
  { accent: '#7c3aed', bg: 'rgba(124,58,237,0.04)', border: 'rgba(124,58,237,0.15)' },
  { accent: '#d97706', bg: 'rgba(217,119,6,0.04)', border: 'rgba(217,119,6,0.15)' },
  { accent: '#0891b2', bg: 'rgba(8,145,178,0.04)', border: 'rgba(8,145,178,0.15)' },
  { accent: '#dc2626', bg: 'rgba(220,38,38,0.04)', border: 'rgba(220,38,38,0.15)' },
  { accent: '#4f46e5', bg: 'rgba(79,70,229,0.04)', border: 'rgba(79,70,229,0.15)' },
  { accent: '#0d9488', bg: 'rgba(13,148,136,0.04)', border: 'rgba(13,148,136,0.15)' },
];

const DESIGN_CARD_COLORS: Record<string, { border: string; headerBg: string; headerText: string; bar: string }> = {
  indigo: { border: 'border-indigo-200', headerBg: 'bg-indigo-50/50', headerText: 'text-indigo-700', bar: 'from-indigo-500 to-violet-500' },
  cyan: { border: 'border-cyan-200', headerBg: 'bg-cyan-50/50', headerText: 'text-cyan-700', bar: 'from-cyan-500 to-blue-500' },
  violet: { border: 'border-violet-200', headerBg: 'bg-violet-50/50', headerText: 'text-violet-700', bar: 'from-violet-500 to-purple-500' },
  rose: { border: 'border-rose-200', headerBg: 'bg-rose-50/50', headerText: 'text-rose-700', bar: 'from-rose-500 to-pink-500' },
  amber: { border: 'border-amber-200', headerBg: 'bg-amber-50/50', headerText: 'text-amber-700', bar: 'from-amber-500 to-orange-500' },
  orange: { border: 'border-orange-200', headerBg: 'bg-orange-50/50', headerText: 'text-orange-700', bar: 'from-orange-500 to-amber-500' },
};

function DesignCard({ title, color, count, children }: { title: string; color: string; count?: number; children: React.ReactNode }) {
  const c = DESIGN_CARD_COLORS[color] || DESIGN_CARD_COLORS.indigo;
  return (
    <section className={`rounded-lg border ${c.border} bg-white overflow-hidden flex flex-col`}>
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b ${c.border} ${c.headerBg} shrink-0`}>
        <div className={`w-1 h-3 rounded-full bg-gradient-to-b ${c.bar}`} />
        <h2 className={`text-[10px] font-bold ${c.headerText} uppercase tracking-wider font-mono`}>{title}</h2>
        {count !== undefined && <span className={`ml-auto text-[9px] font-mono ${c.headerText} opacity-60`}>{count}</span>}
      </div>
      <div className="px-2.5 py-1.5 overflow-y-auto max-h-[200px]">
        {children}
      </div>
    </section>
  );
}

/** Format seconds as MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const DesignLayout = forwardRef<{ setProblemText?: (t: string) => void }, DesignLayoutProps>(function DesignLayout({ onBack, initialProblem, hideHeader }, ref) {
  const { token } = useAuth();
  const { setStatus, setIsStreaming: setStoreStreaming, setQuestion: setStoreQuestion, appendStreamChunk, clearStreamChunks, setParsedBlocks } = useInterviewStore();

  const [problemText, setProblemText] = useState(initialProblem || '');

  useImperativeHandle(ref, () => ({
    setProblemText: (text: string) => {
      setProblemText(text);
      pendingVoiceSubmit.current = true;
    },
  }), []);
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
  const [leftWidth, setLeftWidth] = useState(35); // percentage
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

  const handleSubmit = useCallback(async () => {
    if (!problemText.trim() || !token || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setStreamingText('');
    setErrorMsg(null);
    setQuestion(problemText.trim());
    setStoreQuestion(problemText.trim());
    setStoreStreaming(true);
    clearStreamChunks();
    setStatus('write', 'Generating design...');

    const chunks: string[] = [];

    try {
      await streamResponse({
        question: `[SYSTEM DESIGN] ${problemText.trim()}`,
        useSearch: false,
        token,
        onToken: (data) => {
          if (data.t) {
            chunks.push(data.t);
            setStreamingText(prev => prev + data.t);
            appendStreamChunk(data.t);
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
          setStoreStreaming(false);
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
          setStoreStreaming(false);
          setErrorMsg(data.msg || 'Failed to generate design. Please try again.');
          setStatus('error', data.msg);
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      setStoreStreaming(false);
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

  // Auto-submit after voice input sets problemText
  useEffect(() => {
    if (pendingVoiceSubmit.current && problemText.trim() && token && !isLoading) {
      pendingVoiceSubmit.current = false;
      handleSubmit();
    }
  }, [problemText, token, isLoading, handleSubmit]);

  // Auto-collapse input when results arrive to maximize viewport for cards
  useEffect(() => {
    if (result) setInputCollapsed(true);
  }, [result]);

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
    <div className={`${hideHeader ? 'flex-1' : 'h-screen'} w-full flex flex-col lumora-app-bg`}>
      {/* Header — matching coding page enterprise style */}
      {!hideHeader && <header className="flex items-center justify-between h-11 px-3 shrink-0" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,27,75,0.96) 50%, rgba(15,23,42,0.98) 100%)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold text-white/70 hover:text-white rounded transition-colors">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white text-[10px] md:text-xs font-extrabold">L</span>
            </div>
            <span className="text-white font-extrabold text-xs md:text-sm" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>System Design</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          {/* Detail level toggle */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setDetailLevel('basic')}
              className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${
                detailLevel === 'basic' ? 'text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
              style={detailLevel === 'basic' ? { background: 'rgba(99,102,241,0.25)' } : {}}
            >Basic</button>
            <button
              onClick={() => setDetailLevel('full')}
              className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${
                detailLevel === 'full' ? 'text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
              style={detailLevel === 'full' ? { background: 'rgba(99,102,241,0.25)' } : {}}
            >Full</button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer — matching coding page */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-50 border-red-200 text-red-600' :
              timerSeconds === 0 ? 'bg-white/10 border-white/20 text-white/70' :
              'bg-indigo-50 border-indigo-200 text-indigo-700'
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
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-indigo-600 text-[10px] md:text-xs font-medium">Generating...</span>
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
      </header>}

      {/* Main content - vertical on mobile, horizontal on desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" ref={mainRef}>
        {/* Left: Problem Input - full width on mobile */}
        <div className="w-full md:shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--border)] design-left-panel max-h-[50vh] sm:max-h-[45vh] md:max-h-none overflow-auto" style={{ ['--left-w' as any]: `${leftWidth}%` }}>
          {/* Input Tab Header */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {(['text', 'url', 'image'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setInputTab(tab); setInputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${
                    inputTab === tab ? 'text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                  style={inputTab === tab ? { background: 'rgba(99,102,241,0.3)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' } : {}}
                >
                  {tab === 'text' ? 'Text' : tab === 'url' ? 'URL' : 'Image'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setInputCollapsed(!inputCollapsed)}
              className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${inputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Input area - collapsible */}
          <div className={`flex flex-col p-3 gap-2 ${inputCollapsed ? 'hidden' : ''}`}>
            {inputTab === 'text' && (
              <textarea
                ref={textareaRef}
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder="Describe your system design problem...&#10;&#10;Example: Design a URL shortener like bit.ly that handles 100M links/month"
                className="w-full h-[100px] rounded-lg p-3 text-xs md:text-sm leading-relaxed resize-none focus:ring-1 focus:ring-indigo-400/30 focus:outline-none transition-all font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9' }}
              />
            )}
            {inputTab === 'url' && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://leetcode.com/problems/..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-1 focus:ring-indigo-400/30 focus:outline-none transition-all font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9' }}
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
                  className="px-4 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
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
                style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
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
              onClick={handleSubmit}
              disabled={!problemText.trim() || isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold rounded-lg hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>Design System</>
              )}
            </button>
          </div>

          {/* Left panel diagram removed — now rendered in the 3-column result grid */}
        </div>

        {/* Resizable divider - hidden on mobile, matching coding page */}
        <div
          className="hidden md:flex w-1.5 bg-[var(--bg-elevated)] hover:bg-indigo-200 cursor-col-resize transition-colors items-center justify-center group shrink-0"
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-0.5 h-8 bg-[var(--border)] group-hover:bg-indigo-500 rounded-full transition-colors" />
        </div>

        {/* Right: Design Result — light panel, exempt from dark overrides */}
        <div className="flex-1 min-h-0 min-w-0 overflow-auto lumora-light-panel">

          {!result && !isLoading && !streamingText && !errorMsg && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-mono text-gray-500">Enter a system design question to get started</p>
              <p className="text-xs font-mono text-gray-400 mt-1">Press ⌘+Enter to submit</p>
            </div>
          )}

          {isLoading && !sd && (
            <div className="flex flex-col h-full p-3 md:p-5">
              <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4 shrink-0">
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 border-2 border-indigo-200 rounded-full" />
                  <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <span className="text-xs font-semibold text-indigo-700">Analyzing and designing system architecture...</span>
              </div>
              {streamingText && (
                <pre className="flex-1 overflow-auto text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-relaxed max-h-60">{streamingText}</pre>
              )}
            </div>
          )}

          {sd && (
            <div className="flex flex-col h-full design-result-appear">
              {/* Overview bar */}
              {sd.overview && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-indigo-100 bg-indigo-50/50 shrink-0">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                  <p className="text-xs text-gray-700 leading-snug flex-1">{sd.overview}</p>
                </div>
              )}

              {/* 3-column dense grid — fits viewport */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 p-1.5 overflow-hidden">

                {/* COL 1: Diagram + Scale Estimates */}
                <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto">
                  <section className="rounded-lg border border-cyan-200 bg-white overflow-hidden flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-cyan-100 shrink-0">
                      <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
                      <h2 className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider font-mono">Architecture</h2>
                    </div>
                    <div className="flex-1 min-h-0 p-1">
                      <ArchitectureDiagram question={question || ''} className="w-full h-full" />
                    </div>
                  </section>
                  {sd.scaleEstimates && Object.entries(sd.scaleEstimates).filter(([, v]) => v && v.trim()).length > 0 && (
                    <section className="rounded-lg border border-violet-200 bg-white overflow-hidden shrink-0">
                      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-violet-100">
                        <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-violet-500 to-purple-500" />
                        <h2 className="text-[10px] font-bold text-violet-700 uppercase tracking-wider font-mono">Scale Estimates</h2>
                      </div>
                      <div className="px-2 py-1.5 grid grid-cols-2 gap-1.5">
                        {Object.entries(sd.scaleEstimates).filter(([, v]) => v && v.trim()).map(([key, val]) => {
                          const highlight = parseMetricHighlight(val);
                          return (
                            <div key={key} className="rounded bg-violet-50/50 border border-violet-100 px-2 py-1.5">
                              <div className="font-bold text-violet-600 font-mono text-xs">{highlight ? highlight.number : val}</div>
                              <div className="text-[10px] text-gray-600 font-medium">{key}</div>
                              {highlight?.rest && <div className="text-[9px] text-gray-400 leading-tight">{highlight.rest}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>

                {/* COL 2: Functional, Tradeoffs, Architecture Layers */}
                <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto">
                  {sd.requirements?.functional && sd.requirements.functional.length > 0 && (
                    <DesignCard title="Functional" color="indigo" count={sd.requirements.functional.length}>
                      {sd.requirements.functional.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700 leading-snug py-0.5">
                          <span className="font-bold text-indigo-600 shrink-0">{i + 1}.</span>{r}
                        </div>
                      ))}
                    </DesignCard>
                  )}
                  {sd.tradeoffs && sd.tradeoffs.length > 0 && (
                    <DesignCard title="Tradeoffs" color="rose">
                      {sd.tradeoffs.map((t, i) => (
                        <div key={i} className="text-xs text-gray-700 leading-snug py-0.5 border-b border-gray-50 last:border-0">
                          <span className="text-rose-500 mr-1">↔</span>{t}
                        </div>
                      ))}
                    </DesignCard>
                  )}
                  {sd.techJustifications && sd.techJustifications.length > 0 && (
                    <DesignCard title="Architecture Layers" color="violet" count={sd.techJustifications.length}>
                      {sd.techJustifications.map((tier, i) => (
                        <div key={i} className="py-1 border-b border-gray-50 last:border-0">
                          <div className="text-[10px] font-bold text-violet-700">{tier.tech}</div>
                          {tier.details.slice(0, 2).map((d, j) => (
                            <div key={j} className="text-[10px] text-gray-500 leading-snug pl-2">- {d}</div>
                          ))}
                          {tier.details.length > 2 && <div className="text-[9px] text-gray-400 pl-2">+{tier.details.length - 2} more</div>}
                        </div>
                      ))}
                    </DesignCard>
                  )}
                </div>

                {/* COL 3: Non-Functional, Edge Cases, Follow-up Q&A */}
                <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto">
                  {sd.requirements?.nonFunctional && sd.requirements.nonFunctional.length > 0 && (
                    <DesignCard title="Non-Functional" color="cyan" count={sd.requirements.nonFunctional.length}>
                      {sd.requirements.nonFunctional.map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700 leading-snug py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1" />{r}
                        </div>
                      ))}
                    </DesignCard>
                  )}
                  {sd.edgeCases && sd.edgeCases.length > 0 && (
                    <DesignCard title="Edge Cases" color="amber">
                      {sd.edgeCases.map((e, i) => (
                        <div key={i} className="text-xs text-gray-700 leading-snug py-0.5 border-b border-gray-50 last:border-0">
                          <span className="text-amber-500 mr-1">⚠</span>{e}
                        </div>
                      ))}
                    </DesignCard>
                  )}
                  {sd.followups && sd.followups.length > 0 && (
                    <DesignCard title="Follow-up Q&A" color="orange" count={sd.followups.length}>
                      {sd.followups.map((f, i) => (
                        <div key={i} className="py-1 border-b border-gray-50 last:border-0">
                          <div className="text-[10px] font-bold text-indigo-600">Q{i + 1}: <span className="text-gray-800 font-semibold">{f.question}</span></div>
                          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{f.answer}</p>
                        </div>
                      ))}
                    </DesignCard>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enterprise Status Bar — matching coding page */}
      <div className="hidden sm:flex items-center justify-between h-7 px-3 bg-[var(--bg-elevated)] border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`} />
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
});
