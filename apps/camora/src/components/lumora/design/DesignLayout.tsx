import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session-store';
import { streamResponse } from '@/lib/sse-client';
import { useCloudProvider } from '@/hooks/useCloudProvider';
import { getSystemContext, getActiveAssistant } from '@/lib/lumora-assistant';
import { ArchitectureDiagram } from '@/components/lumora/session/ArchitectureDiagram';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { dialogAlert } from '@/components/shared/Dialog';
import {
  type DesignResult,
  parseTagsToDesign,
  extractTagMap,
  extractReadableProse,
} from './parsers';
import { useTheme, formatTime } from './theme';
import { useTheme as useGlobalTheme } from '@/hooks/useTheme';
import { ScaleCalculator } from './scale-calculator';
import { SectionCopyBtn } from './section-helpers';
import Chip from '@/components/shared/ui/Chip';
import { ProblemCaptureStrip } from '@/components/lumora/shared/ProblemCaptureStrip';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

const SNAP_CHIPS = [
  { label: 'Find Issues', prompt: 'Analyze this system design and identify all bottlenecks, single points of failure, scalability gaps, and design flaws. For each issue explain what is wrong and provide a concrete fix.' },
  { label: 'Explain', prompt: 'Explain this system design step by step. Describe what each component does, how they interact, and why they are designed this way.' },
  { label: 'Improve', prompt: 'Suggest prioritized, concrete improvements to make this design more scalable, reliable, and cost-effective. Be specific about what to change and why.' },
  { label: 'Estimate Scale', prompt: 'Estimate the scale this design can handle. Calculate storage requirements, throughput limits, latency bounds, and compute needs with specific numbers.' },
] as const;

/* Some responses (especially cached ones from earlier prompt
   versions) glue the entire structured response — REQUIREMENTS,
   SCALEMATH, DEEPDESIGN, EDGECASES, TRADEOFFS, FOLLOWUP — into
   sd.overview as one wall of text with raw `[TAG]` / `[/TAG]`
   markers showing through. The dedicated section cards below
   already render those blocks, so the Overview should only
   surface the lead paragraph. This trims the string at the
   first known block tag and strips any stray markers from the
   remainder. */
const OVERVIEW_CUT_MARKERS = [
  '[REQUIREMENTS]',
  '[SCALEMATH]',
  '[SCALECALC]',
  '[DIAGRAM]',
  '[DEEPDESIGN]',
  '[CLOUDSERVICES]',
  '[EDGECASES]',
  '[TRADEOFFS]',
  '[FOLLOWUP]',
  '[CONSTRAINTS]',
  '[ASSUMPTIONS]',
];

function cleanOverviewText(raw: string | undefined | null): string {
  if (!raw) return '';
  let text = raw.trim();
  let cutAt = -1;
  for (const marker of OVERVIEW_CUT_MARKERS) {
    const idx = text.indexOf(marker);
    if (idx > 0 && (cutAt === -1 || idx < cutAt)) cutAt = idx;
  }
  if (cutAt > 0) text = text.slice(0, cutAt).trim();
  // Strip any stray bracket tags that snuck through
  text = text.replace(/\[\/?[A-Z][A-Z_/-]*\]/g, '').trim();
  // Collapse runs of whitespace inside paragraphs but keep \n\n breaks
  text = text.split(/\n{2,}/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
  return text;
}

/* The same parser glitch leaks the entire structured response into
   any list field — Functional, Non-Functional, Tradeoffs, Edge
   Cases, etc. — so each card ends up holding every subsequent
   block (SCALEMATH, DEEPDESIGN's numbered headers, EDGECASES,
   TRADEOFFS, FOLLOWUP, etc.) as additional bullets. We cut the
   array at the first item that looks like a bracket tag
   (`[X]`/`[/X]`) or a numbered section header (e.g. `1. CLIENT /
   EDGE LAYER`) — both of which signal we've left this list.
   Strip any inline tags from surviving items as a final defense. */
function cleanRequirementList(items: string[] | undefined | null): string[] {
  if (!items || !items.length) return [];
  const out: string[] = [];
  for (const raw of items) {
    if (!raw) continue;
    const item = raw.trim();
    if (!item) continue;
    if (/^\s*\[\/?[A-Z][A-Z_/-]*\]\s*$/.test(item)) break; // pure tag line
    if (/^\[\/?[A-Z][A-Z_/-]*\]/.test(item)) break; // tag at line start
    if (/^\d+\.\s+[A-Z]/.test(item)) break; // numbered DEEPDESIGN section
    if (/^[A-Z][A-Z\s/&-]{3,}$/.test(item)) break; // ALL-CAPS header line
    out.push(item.replace(/\[\/?[A-Z][A-Z_/-]*\]/g, '').trim());
  }
  return out.filter(Boolean);
}

/* Follow-up Q&A items are objects, not strings. Same leak risk
   though — a stray `[FOLLOWUP]` / `[/FOLLOWUP]` can ride into
   either field. Strip inline tags from both sides; drop any item
   whose question or answer is empty / pure-tag noise after
   cleaning. */
function cleanFollowupList<T extends { question: string; answer: string }>(items: T[] | undefined | null): T[] {
  if (!items || !items.length) return [];
  const stripTags = (s: string) => (s || '').replace(/\[\/?[A-Z][A-Z_/-]*\]/g, '').trim();
  const out: T[] = [];
  for (const raw of items) {
    const q = stripTags(raw.question);
    const a = stripTags(raw.answer);
    if (!q || !a) continue;
    if (/^\s*\[/.test(q) || /^\s*\[/.test(a)) continue;
    out.push({ ...raw, question: q, answer: a });
  }
  return out;
}

interface DesignLayoutProps {
  onBack: () => void;
  initialProblem?: string;
  /** When true, hides internal header and uses flex-1 instead of h-screen (for embedding in LumoraShell) */
  embedded?: boolean;
  /** Ref that parent sets to receive voice transcriptions as problem input */
  onVoiceProblemRef?: React.MutableRefObject<((text: string) => void) | null>;
  /** When embedded, caller supplies this to route voice through dispatchTranscript for Sona Q&A */
  onEmbeddedTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  /** When false, AudioCapture releases the mic immediately and ignores keyboard shortcuts. */
  isTabActive?: boolean;
  /** Ref that parent sets to receive screenshot OCR text — appended to problem textarea. */
  onScreenshotAppendRef?: React.MutableRefObject<((text: string) => void) | null>;
  /** Input tab controlled from global strip. Internal auto-switches propagate back via onExternalInputTabChange. */
  externalInputTab?: 'text' | 'url' | 'image';
  onExternalInputTabChange?: (tab: 'text' | 'url' | 'image') => void;
}


export function DesignLayout({ onBack, initialProblem, embedded, onVoiceProblemRef, onEmbeddedTranscription, isTabActive, onScreenshotAppendRef, externalInputTab, onExternalInputTabChange }: DesignLayoutProps) {
  // Bind the local Lumora design theme to the global light/dark choice.
  // Always follow the user's global theme — embedded panes inherit light/dark
  // from the rest of the app instead of forcing dark.
  const { theme: globalTheme } = useGlobalTheme();
  const t = useTheme(globalTheme === 'dark');
  const { token } = useAuth();
  const { setStatus } = useSessionStore();
  const lastFromCache = useSessionStore(s => s.lastFromCache);
  const [problemText, setProblemText] = useState(initialProblem || '');
  const autoSubmittedRef = useRef(false);
  const [inputTab, _setInputTabLocal] = useState<'text' | 'url' | 'image'>(externalInputTab ?? 'text');
  useEffect(() => {
    if (externalInputTab !== undefined) _setInputTabLocal(externalInputTab);
  }, [externalInputTab]);
  const setInputTab = useCallback((tab: 'text' | 'url' | 'image') => {
    _setInputTabLocal(tab);
    onExternalInputTabChange?.(tab);
  }, [onExternalInputTabChange]);
  const [detailLevel, setDetailLevel] = useState<'basic' | 'full'>('full');
  // Cloud platform sent on every Sona design request so the LLM names
  // services for the chosen cloud (Cosmos DB / Firestore / etc.). Single
  // source of truth — same hook that powers diagram cloud-filtering.
  const [cloudProvider, setCloudProvider] = useCloudProvider();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [question, setQuestion] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [, setExpandedFollowup] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const pendingVoiceSubmit = useRef(false);

  // Timer state (matching coding page)
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Desktop stealth (read from store — set by ScreenshotStrip in parent shell)
  const isStealthActive = useSessionStore(s => s.isStealthActive);
  const [screenPermStatus, setScreenPermStatus] = useState<string | null>(null);
  // Extracted code from the last image snap — drives quick-action chips.
  const [snapChipCode, setSnapChipCode] = useState<string | null>(null);
  // Diagram tab switcher — Python (default) vs Graphviz
  const [diagramTab, setDiagramTab] = useState<'python' | 'graphviz'>('python');
  const [gvImgUrl, setGvImgUrl] = useState<string | null>(null);
  const [gvLoading, setGvLoading] = useState(false);
  const gvBlobRef = useRef<string | null>(null); // revoke previous object URL on unmount

  // Revoke blob URL when component unmounts to avoid memory leaks
  useEffect(() => () => { if (gvBlobRef.current) URL.revokeObjectURL(gvBlobRef.current); }, []);

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

  const handleSnapChip = useCallback((prompt: string) => {
    // Source priority: snapped screen content > problem text input
    const source = snapChipCode || problemText;
    if (!source?.trim()) return;
    if (snapChipCode) setSnapChipCode(null);
    // Use ref so we always call the latest handleSubmit (avoids stale isLoading closure)
    handleSubmitRef.current(`${prompt}\n\n${source}`);
  }, [snapChipCode, problemText]);

  const handleUrlFetch = async (overrideUrl?: string) => {
    const url = (overrideUrl ?? urlInput).trim();
    if (!url || !token) return;
    try {
      const resp = await fetch(`${API_URL}/api/v1/coding/fetch-problem`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `Failed to fetch (${resp.status})`);
      }
      const data = await resp.json();
      if (data.problem) { setProblemText(data.problem); setInputTab('text'); }
    } catch (err: any) {
      setErrorMsg(`Failed to fetch URL: ${err.message}`);
    }
  };

  // When the user switches to URL mode, auto-detect Chrome's active tab URL (desktop only)
  useEffect(() => {
    if (inputTab !== 'url') return;
    const camo = (window as any).camo;
    if (!camo?.getActiveBrowserUrl) return;
    camo.getActiveBrowserUrl().then((result: any) => {
      if (!result?.ok || !result.url) return;
      setUrlInput(result.url);
      handleUrlFetch(result.url);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTab]);

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
        credentials: 'include',
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
        const text = String(data.problem).trim();
        setProblemText(text);
        setSnapChipCode(text); // power quick-action chips after snap
        setInputTab('text');
        setErrorMsg(null);
        // Auto-generate the design solution — image in, answer out.
        if (text) handleSubmit(text);
      } else {
        setErrorMsg('Could not extract text from this image. Try a clearer screenshot.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Image extraction failed. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);



  const handleSubmit = useCallback(async (overrideText?: string, options?: { bypassCache?: boolean }) => {
    const text = overrideText || problemText;
    if (!text.trim() || !token || isLoading) return;

    // Single mode on this tab — every submit runs the design solver
    // on the current text. Sona is not co-resident on Design.
    setIsLoading(true);
    setResult(null);
    setStreamingText('');
    setErrorMsg(null);
    setProblemText(text.trim());
    setQuestion(text.trim());
    setStatus('write', 'Generating design...');
    // Reset cache indicator before each solve; onAnswer overwrites it.
    useSessionStore.getState().setLastFromCache(null);

    const chunks: string[] = [];
    // Stores data.raw from onAnswer so onComplete's safety net can parse it
    // even when chunks is empty (cache hits send no token events).
    let lastRawAnswer = '';
    // Prevents onComplete from overwriting onError's specific message.
    let onErrorFired = false;

    try {
      await streamResponse({
        question: `[SYSTEM DESIGN] ${text.trim()}`,
        useSearch: false,
        systemContext: getSystemContext(),
        detailLevel,
        cloudProvider,
        mode: 'design',
        // DesignLayout is the dedicated /lumora/design page — questions
        // here are distributed-system design by default. The classifier
        // can still override on infra-cued queries ("design a CDN")
        // because the explicit hint feeds INTO classifyDesignKind, but
        // for plain "design Twitter" we want the system archetype.
        designKind: 'system',
        token,
        bypassCache: options?.bypassCache,
        onToken: (data) => {
          if (data.t) {
            chunks.push(data.t);
            const accumulated = chunks.join('');
            setStreamingText(accumulated);

            // Progressive section parsing — every ~15 tokens, try to
            // parse what we have so far and populate any newly-closed
            // sections into `result`. That way "Overview", "Functional
            // Requirements", etc. render as soon as their JSON /
            // tag block completes, instead of the user staring at a
            // spinner for 10-15 s waiting for the whole response.
            if (chunks.length % 15 === 0) {
              try {
                // Try tag-map partial parse first (tolerant to
                // incomplete tail).
                const tagMap = extractTagMap(accumulated);
                if (Object.keys(tagMap).length > 0) {
                  const partial = parseTagsToDesign(tagMap);
                  if (partial?.systemDesign) {
                    setResult(partial);
                    return;
                  }
                }
                // Try JSON partial parse — trim to last balanced
                // closing brace so we never feed invalid JSON.
                let txt = accumulated.trim();
                if (txt.startsWith('```')) {
                  const nl = txt.indexOf('\n');
                  const last = txt.lastIndexOf('```');
                  txt = txt.substring(nl + 1, last > nl ? last : undefined).trim();
                }
                const brace = txt.indexOf('{');
                if (brace >= 0) {
                  // Find the last closing brace that yields a valid parse
                  let candidate = txt.substring(brace);
                  const closeIdx = candidate.lastIndexOf('}');
                  if (closeIdx > 0) candidate = candidate.substring(0, closeIdx + 1);
                  try {
                    const obj = JSON.parse(candidate);
                    if (obj?.systemDesign) {
                      setResult(obj);
                    }
                  } catch {
                    /* incomplete JSON — fine, wait for more tokens */
                  }
                }
              } catch {
                /* partial-parse is best-effort, never block streaming */
              }
            }
          }
        },
        onAnswer: (data: any) => {
          useSessionStore.getState().setLastFromCache(Boolean(data.fromCache));
          // Save to session history so /lumora/sessions shows design answers
          useSessionStore.getState().addHistoryEntry({
            question: text.trim(),
            blocks: data.parsed && Array.isArray(data.parsed) ? data.parsed : [],
            timestamp: new Date(),
          });
          const parsed = data.parsed;
          const raw = data.raw || '';
          lastRawAnswer = raw;

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
          // Case 3: Try raw JSON or raw tags. Use data.raw first so cache
          // hits (which emit no token events) still get parsed correctly.
          else {
            const rawText = raw || chunks.join('');
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
              if (obj?.systemDesign) { setResult(obj); return; }
              // Flat JSON (old format without systemDesign wrapper)
              if (obj?.overview || obj?.requirements || obj?.architecture) {
                setResult({ systemDesign: obj } as DesignResult);
              }
            } catch {
              // Can't parse
            }
          }
        },
        onComplete: () => {
          setIsLoading(false);
          setStatus('ready', 'Design complete');
          // Safety net: if onAnswer never fired (connection drop), parse streamed tokens directly.
          // Guard: don't overwrite an error message already set by onError (e.g. 400 prompt-too-long
          // fires onError then onComplete 200ms later with empty chunks → would clobber specific msg).
          setTimeout(() => {
            if (onErrorFired) return;
            setResult(prev => {
              if (prev) return prev;
              const raw = lastRawAnswer || chunks.join('');
              if (!raw.trim()) {
                setErrorMsg('No response received. Please try again.');
                return null;
              }
              // Try tag format first
              const tagMap = extractTagMap(raw);
              const tagResult = parseTagsToDesign(tagMap);
              if (tagResult) return tagResult;
              // Try JSON — handles stale cached responses in old JSON format
              try {
                let jsonText = raw.trim();
                if (jsonText.startsWith('```')) {
                  const nl = jsonText.indexOf('\n');
                  const last = jsonText.lastIndexOf('```');
                  jsonText = jsonText.substring(nl + 1, last > nl ? last : undefined).trim();
                }
                const brace = jsonText.indexOf('{');
                if (brace >= 0) jsonText = jsonText.substring(brace);
                const obj = JSON.parse(jsonText);
                if (obj?.systemDesign) return obj as DesignResult;
                // Flat JSON (old format: { overview, requirements, ... } without systemDesign wrapper)
                if (obj?.overview || obj?.requirements || obj?.architecture) {
                  return { systemDesign: obj } as DesignResult;
                }
              } catch { /* not JSON */ }
              setErrorMsg('Response received but could not be parsed. Please try again.');
              return null;
            });
          }, 200);
        },
        onError: (data) => {
          onErrorFired = true;
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

  // Register voice problem handler for parent shell. Uses a stable
  // internal ref for `handleSubmit` so the registration runs only ONCE
  // on mount — without this, every store update churned handleSubmit's
  // identity and the ref was repeatedly nulled, causing transcripts
  // arriving during the gap to fall through to Sona. See the matching
  // comment in CodingLayout for the full rationale.
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  useEffect(() => {
    if (!onVoiceProblemRef) return;
    onVoiceProblemRef.current = (text: string) => {
      setProblemText(text);
      handleSubmitRef.current(text);
    };
    return () => { if (onVoiceProblemRef) onVoiceProblemRef.current = null; };

  }, [onVoiceProblemRef]);

  useEffect(() => {
    if (!onScreenshotAppendRef) return;
    onScreenshotAppendRef.current = (text: string) => {
      setProblemText(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
      setInputTab('text');
      setInputCollapsed(false);
    };
    return () => { onScreenshotAppendRef.current = null; };
  }, [onScreenshotAppendRef]);

  // Auto-submit after voice input sets problemText
  useEffect(() => {
    if (pendingVoiceSubmit.current && problemText.trim() && token && !isLoading) {
      pendingVoiceSubmit.current = false;
      handleSubmit();
    }
  }, [problemText, token, isLoading, handleSubmit]);

  // Reset / "New Problem" — wipes every solution state so the user can
  // dictate or paste a fresh design problem in the same window. Also
  // flips the voice route back to 'problem' so the next utterance
  // fills this textarea instead of being asked of Sona.
  const handleGraphviz = useCallback(async () => {
    if (!question || !token || gvLoading) return;
    setDiagramTab('graphviz');
    if (gvImgUrl) return; // already generated, just switch tab
    setGvLoading(true);
    try {
      const r = await fetch(`${CAPRA_URL}/api/diagram/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, cloudProvider, detailLevel: 'basic', designKind: 'system' }),
      });
      const data = await r.json();
      if (data.success && data.image_url) {
        const rawUrl = data.image_url.startsWith('/') ? `${CAPRA_URL}${data.image_url}` : data.image_url;
        // Fetch with auth so cookie-gated image endpoints resolve correctly
        const imgR = await fetch(rawUrl, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } });
        if (imgR.ok) {
          const blob = await imgR.blob();
          if (gvBlobRef.current) URL.revokeObjectURL(gvBlobRef.current);
          const objUrl = URL.createObjectURL(blob);
          gvBlobRef.current = objUrl;
          setGvImgUrl(objUrl);
        } else {
          await dialogAlert('Failed to load generated diagram image');
        }
      } else {
        await dialogAlert(data.error || 'Diagram generation failed');
      }
    } catch (err: any) {
      await dialogAlert(err.message || 'Network error');
    }
    setGvLoading(false);
  }, [question, token, gvLoading, cloudProvider, gvImgUrl]);

  const handleReset = useCallback(() => {
    setProblemText('');
    setResult(null);
    setStreamingText('');
    setQuestion('');
    setErrorMsg(null);
    setExpandedFollowup(null);
    setInputCollapsed(false);
    setGvImgUrl(null);
    setDiagramTab('python');
    useSessionStore.getState().setLastFromCache(null);
    useSessionStore.getState().setLiveSolveContext(null);
  }, []);

  // Restore last design answer from sessionStorage on mount (refresh or chip-switch back)
  useEffect(() => {
    if (!isLoading) {
      try {
        const raw = sessionStorage.getItem('lumora:lastDesignAnswer');
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.ts && Date.now() - saved.ts < 4 * 60 * 60 * 1000 && saved.parsed?.length > 0) {
            const store = useSessionStore.getState();
            store.setParsedBlocks(saved.parsed);
            if (saved.question) store.setQuestion(saved.question);
            store.setIsDesignQuestion(true);
            store.setIsCodingQuestion(false);
          }
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate — re-submits the same problem. Backend serves from cache
  // (Redis → DB) so no LLM call unless this is a genuinely new problem.
  const handleRegenerate = useCallback(() => {
    if (!problemText.trim() || isLoading) return;
    handleSubmit(problemText);
  }, [problemText, isLoading, handleSubmit]);

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

  // Publish the active design solution to the store as live-solve
  // context so Sona's follow-up Q&A is grounded in this design. The
  // Design output isn't a single code block — it's a structured
  // architecture. We condense the most-quoted parts (overview, tech
  // choices, tradeoffs) into a flat "code" slot so Sona can reason
  // about it without us redesigning the systemContext format.
  useEffect(() => {
    if (!sd || !problemText.trim()) return;
    const overview = (sd as any).overview || '';
    const tradeoffs = Array.isArray((sd as any).tradeoffs)
      ? (sd as any).tradeoffs.slice(0, 3).map((t: any) => `- ${t.choice || t.title || ''}: ${t.why || t.reason || t.detail || ''}`).join('\n')
      : '';
    const techChoices = Array.isArray((sd as any).techJustifications)
      ? (sd as any).techJustifications.slice(0, 6).map((tj: any) => `- ${tj.tech}: ${(tj.details && tj.details[0]) || tj.why || ''}`).join('\n')
      : '';
    const condensed = [
      overview && `OVERVIEW:\n${overview}`,
      techChoices && `TECH CHOICES:\n${techChoices}`,
      tradeoffs && `TRADEOFFS:\n${tradeoffs}`,
    ].filter(Boolean).join('\n\n').slice(0, 4000);
    useSessionStore.getState().setLiveSolveContext({
      surface: 'design',
      problem: problemText.trim().slice(0, 4000),
      approach: (sd as any).overview?.slice(0, 800) || '',
      complexity: '',
      code: condensed,
      language: 'system-design',
      solvedAt: Date.now(),
    });
  }, [sd, problemText]);

  // Screen recording permission check — needed to gate Snap button
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.getMediaAccessStatus) return;
    let cancelled = false;
    const check = async () => {
      const status = await camo.getMediaAccessStatus('screen').catch(() => null);
      if (!cancelled) setScreenPermStatus(status);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Route screenshots to ~/Documents/Camora/{company}/screenshots/ for interview isolation
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.setSessionFolder) return;
    const company = getActiveAssistant()?.company || getActiveAssistant()?.name || '';
    camo.setSessionFolder(company || null);
    return () => { camo.setSessionFolder(null); };
  }, []);

  // Turn off content protection when leaving the design page.
  useEffect(() => {
    return () => {
      const camo = (window as any).camo;
      if (camo?.setStealthMode) camo.setStealthMode(false);
    };
  }, []);

  // Listen for Cmd+Shift+3/4 screenshots while the app is in the foreground
  // and auto-extract + generate the design answer from the captured image.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.onScreenshotWatcher) return;
    const handler = async ({ dataUrl, filename }: { dataUrl: string; filename: string }) => {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        await handleImageUpload(file);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to process screenshot.');
      }
    };
    const unwatch = camo.onScreenshotWatcher(handler);
    return () => camo.offScreenshotWatcher?.(unwatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={embedded ? 'flex-1 flex flex-col min-h-0 relative' : 'h-dvh w-full flex flex-col lumora-app-bg relative'}
      style={
        embedded
          ? {
              // Subtle atmospheric backdrop layered behind the panels —
              // navy spotlight at top-left + cyan wash at bottom-right.
              background:
                'radial-gradient(ellipse 50% 40% at 15% 0%, rgba(38,97,156,0.08), transparent 70%),' +
                'radial-gradient(ellipse 60% 40% at 85% 100%, rgba(38,97,156,0.10), transparent 70%)',
            }
          : undefined
      }
    >
      <style>{`
        @keyframes design-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(38,97,156,0.45); }
          70%  { box-shadow: 0 0 0 10px rgba(38,97,156,0); }
          100% { box-shadow: 0 0 0 0 rgba(38,97,156,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      {/* Header — hidden when embedded in LumoraShell */}
      {!embedded && (
      <header className="flex items-center justify-between h-11 px-3 shrink-0 relative z-20" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold rounded transition-colors hover:bg-white/10" style={{ color: 'var(--cam-strip-text)' }}>
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px" style={{ background: 'var(--cam-strip-icon-border)' }} />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center" style={{ background: 'var(--cam-gold-leaf)' }}>
              <span className="text-[10px] md:text-xs font-extrabold" style={{ color: 'var(--cam-primary-dk)' }}>L</span>
            </div>
            <span className="font-extrabold text-xs md:text-sm" style={{ fontFamily: "var(--font-sans)", color: 'var(--cam-strip-heading)' }}>System Design</span>
          </div>
          <div className="h-4 w-px hidden md:block" style={{ background: 'var(--cam-strip-icon-border)' }} />
          {/* Detail level toggle */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)' }}>
            <button
              onClick={() => setDetailLevel('basic')}
              className="px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-[background-color,color,transform] active:scale-[0.98]"
              style={detailLevel === 'basic' ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)' } : { color: 'var(--cam-strip-text)' }}
             >Basic</button>
             <button
               onClick={() => setDetailLevel('full')}
               className="px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md transition-[background-color,color,transform] active:scale-[0.98]"
              style={detailLevel === 'full' ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)' } : { color: 'var(--cam-strip-text)' }}
            >Full</button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer — matching coding page */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-500/15 border-red-500/30 text-red-300' :
              timerSeconds === 0 ? 'opacity-70' :
              'bg-[rgba(38,97,156,0.06)] border-[rgba(38,97,156,0.2)] text-[var(--accent)]'
            } ${timerUrgent ? 'timer-urgent' : ''}`}>
              <div className="relative w-4 h-4">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeDasharray={`${timerPercent * 0.5} 50`} strokeLinecap="round" />
                </svg>
              </div>
              <span>{formatTime(timerSeconds)}</span>
              <button onClick={stopTimer} className="ml-1 opacity-75 hover:text-red-400 transition-colors" style={{ color: 'var(--cam-strip-text)' }} title="Stop timer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => startTimer(m)}
                  className="px-1.5 py-0.5 text-[10px] font-mono opacity-75 hover:opacity-100 hover:bg-white/10 rounded transition-colors" style={{ color: 'var(--cam-strip-text)' }}
                  title={`${m} min timer`}>
                  {m}m
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'linear-gradient(110deg, rgba(38,97,156,0.18) 0%, rgba(38,97,156,0.28) 100%)',
                border: '1px solid rgba(38,97,156,0.42)',
                boxShadow: '0 0 18px rgba(38,97,156,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--cam-gold-leaf-lt)',
                  animation: 'design-pulse-ring 1.4s ease-out infinite',
                }}
              />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cam-strip-heading)' }}>Generating</span>
            </div>
          )}

          {/* Reset */}
          <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1 rounded-md opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors" style={{ color: 'var(--cam-strip-text)' }} title="Reset — clear problem and solution">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
          </button>

          {/* Voice Input — no more hacky getElementById */}
          <AudioCapture
            onTranscription={(text) => {
              const trimmed = text.trim();
              if (!trimmed) return;
              setProblemText(trimmed);
              pendingVoiceSubmit.current = true;
            }}
            autoStart={false}
            active={isTabActive}
            compact
          />
        </div>
      </header>
      )}

      {/* Main content - vertical on mobile, horizontal on desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" ref={mainRef}>
        {/* Left: Problem Input - full width on mobile */}
        <div className="w-full md:shrink-0 flex flex-col min-w-0 border-b md:border-b-0 md:border-r design-left-panel max-h-[45dvh] md:max-h-none overflow-auto" style={{ ['--left-w' as any]: `${leftWidth}%`, borderColor: t.cardBorder, background: t.surfaceBg }}>
          {/* Input toolbar — collapse button only (TEXT/URL/IMAGE + mic live in global strip) */}
          <div
            className="flex flex-col"
            style={{
              background: 'var(--cam-hero-strip)',
              borderBottom: '1px solid var(--cam-gold-leaf)',
            }}
          >
            {/* ── Quick-action chips + collapse — single row ── */}
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              {!isLoading && (
                <>
                  <span className="text-[9px] font-semibold uppercase tracking-wider shrink-0 select-none"
                    style={{ color: snapChipCode ? 'var(--cam-gold-leaf)' : 'var(--cam-gold-leaf-lt)' }}>
                    {snapChipCode ? 'Snap:' : 'Quick ask:'}
                  </span>
                  {SNAP_CHIPS.map(chip => (
                    <button key={chip.label} onClick={() => handleSnapChip(chip.prompt)}
                      className="shrink-0 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] rounded transition-[background-color,color,border-color,opacity] hover:opacity-90 active:scale-[0.97]"
                      style={snapChipCode
                        ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)' }
                        : { background: 'var(--cam-strip-icon-bg)', color: 'var(--cam-strip-text)', border: '1px solid var(--cam-strip-icon-border)' }}>
                      {chip.label}
                    </button>
                  ))}
                  {snapChipCode && (
                    <button onClick={() => setSnapChipCode(null)} title="Dismiss snap"
                      className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10"
                      style={{ color: 'var(--cam-strip-text-muted)' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setInputCollapsed(!inputCollapsed)}
                className="shrink-0 flex items-center justify-center w-7 h-7 transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]"
                style={{ color: 'var(--cam-strip-heading)', border: '1px solid var(--cam-strip-icon-border)', borderRadius: 999, background: 'var(--cam-strip-icon-bg)' }}
                aria-label={inputCollapsed ? 'Expand input' : 'Collapse input'}
              >
                <svg className={`w-3 h-3 transition-transform ${inputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Input area - collapsible */}
          <div className={`flex flex-col p-3 gap-2 ${inputCollapsed ? 'hidden' : ''}`}>
            {inputTab === 'text' && (
              <textarea id="design-prompt"
                ref={textareaRef}
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  const clean = pasted
                    .split('\n')
                    .map((l) => l.trimEnd())
                    .filter((l) => l.trim() !== '')
                    .join('\n');
                  setProblemText((prev) => {
                    const base = prev.trimEnd();
                    return base ? `${base}\n${clean}` : clean;
                  });
                }}
                placeholder="Describe your system design problem...&#10;&#10;Example: Design a URL shortener like bit.ly that handles 100M links/month"
                className="w-full h-[80px] rounded-lg p-3 text-xs leading-relaxed resize-none focus:ring-1 focus:ring-[var(--accent)]/30 focus:outline-none transition-all"
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '-0.01em' }}
              />
            )}
            {inputTab === 'url' && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://leetcode.com/problems/..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[var(--accent)]/30 focus:outline-none transition-all"
                  style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '-0.01em' }}
                />
                <button
                  onClick={() => handleUrlFetch()}
                  disabled={!urlInput.trim() || !token}
                  className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                >
                  Fetch
                </button>
              </div>
            )}
            {inputTab === 'image' && (
              <div className="space-y-3">
                {/* Multi-page window capture — desktop only */}
                <ProblemCaptureStrip
                  kind="design"
                  onProblemBuilt={(problem) => setProblemText(problem)}
                />

                {/* Single-image drag/drop upload */}
                <div
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) handleImageUpload(file);
                }}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-[border-color,background-color]"
                style={{ borderColor: t.inputBorder, background: t.sectionBg }}
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
                      <svg className="w-5 h-5 text-[var(--text-dimmed)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[var(--text-dimmed)] text-xs">Drop image or click to upload</p>
                  </div>
                )}
                </div>
              </div>
            )}
            {errorMsg && !isLoading && (
              <div className="p-2.5 rounded-lg text-xs flex items-start gap-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}
            <button
              onClick={() => handleSubmit()}
              disabled={!problemText.trim() || isLoading}
              className="w-full py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-[opacity,transform] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--cam-primary), var(--cam-primary))', borderRadius: '10px' }}
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>Design</>
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
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value as 'auto' | 'aws' | 'azure' | 'gcp')}
                  className="ml-auto text-[10px] font-mono rounded px-1.5 py-0.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  title="Cloud provider for design + diagram"
                >
                  <option value="auto">Auto</option>
                  <option value="aws">AWS</option>
                  <option value="azure">Azure</option>
                  <option value="gcp">GCP</option>
                </select>
              </div>
              {/* Diagram type tabs */}
              <div className="flex gap-1 mb-2">
                {(['python', 'graphviz'] as const).map(tab => (
                  <button key={tab}
                    onClick={() => tab === 'graphviz' ? handleGraphviz() : setDiagramTab('python')}
                    className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.10em] rounded transition-[background-color,color,opacity] hover:opacity-90"
                    style={diagramTab === tab
                      ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)' }
                      : { background: 'var(--cam-strip-icon-bg)', color: 'var(--cam-strip-text)', border: '1px solid var(--cam-strip-icon-border)' }}
                  >
                    {tab === 'graphviz' && gvLoading ? '…' : tab}
                  </button>
                ))}
              </div>
              {diagramTab === 'python' && (
                <ArchitectureDiagram question={question} className="diagram-left-panel" autoGenerate={true} />
              )}
              {diagramTab === 'graphviz' && (
                <div className="flex-1 min-h-0">
                  {gvLoading && (
                    <div className="flex items-center gap-2 py-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                      Generating Graphviz diagram…
                    </div>
                  )}
                  {!gvLoading && gvImgUrl && (
                    <img src={gvImgUrl} alt="Graphviz architecture diagram" className="w-full rounded-lg" />
                  )}
                  {!gvLoading && !gvImgUrl && (
                    <div className="py-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Click <strong>Graphviz</strong> tab again to generate.
                    </div>
                  )}
                </div>
              )}
              {sd?.cloudServices && sd.cloudServices.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[var(--border)]">
                  <h4 className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider mb-1.5">Services Used</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {sd.cloudServices.map((svc: { name: string; role: string }, i: number) => (
                      <div key={i} className="flex items-baseline gap-1.5 text-[11px] leading-snug">
                        <span className="font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>{svc.name}</span>
                        {svc.role && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                            <span style={{ color: 'var(--text-muted)' }}>{svc.role}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resizable divider - hidden on mobile, matching coding page */}
        <div
          className="hidden md:flex w-1.5 hover:bg-[rgba(38,97,156,0.1)] cursor-col-resize transition-colors items-center justify-center group shrink-0"
          onMouseDown={handleDividerMouseDown}
          style={{ background: t.sectionBg }}
        >
          <div className="w-0.5 h-8 group-hover:bg-[var(--accent)] rounded-full transition-colors" style={{ background: t.cardBorder }} />
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
                <span className="text-xs font-semibold" style={{ color: t.headerText }}>
                  {streamingText ? 'Streaming architecture…' : 'Analyzing and designing system architecture…'}
                </span>
                {streamingText && (
                  <span className="ml-auto text-[10px] font-mono" style={{ color: t.textDim }}>
                    {streamingText.length.toLocaleString()} chars
                  </span>
                )}
              </div>

              {/* Live readable preview — strips JSON structure and shows
                  human-readable values as they stream. Users see motion
                  immediately (within ~200 ms of first token) instead of
                  waiting 10-15 s for the fully parsed card layout. */}
              {streamingText && (
                <div className="flex-1 overflow-auto rounded-xl p-4 text-sm leading-relaxed"
                  style={{ background: t.sectionBg, border: `1px solid ${t.cardBorder}`, color: t.text }}>
                  {extractReadableProse(streamingText)}
                  <span className="inline-block w-1.5 h-4 ml-1 animate-pulse rounded-sm align-text-bottom"
                    style={{ background: t.dotColor }} />
                </div>
              )}
            </div>
          )}

          {sd && (
            <div className="flex flex-col gap-2.5 p-3 md:p-5 design-result-appear" style={{ maxWidth: '1600px', margin: '0 auto' }}>
              {/* Cache status row — shows whether this design came
                  from the answer cache and offers a one-click
                  Regenerate that bypasses the cache. Identical
                  pattern to the Coding tab so the affordance reads
                  the same across surfaces. */}
              {!isLoading && lastFromCache !== null && (
                <div
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: lastFromCache ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    border: `1px solid ${lastFromCache ? 'var(--cam-primary)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={lastFromCache ? 'var(--cam-primary-dk)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      {lastFromCache ? (
                        <>
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <polyline points="9 12 12 15 16 9" />
                        </>
                      ) : (
                        <>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </>
                      )}
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: lastFromCache ? 'var(--cam-primary-dk)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {lastFromCache ? 'Loaded from cache' : 'Fresh design'}
                    </span>
                    <span className="hidden md:inline text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {lastFromCache
                        ? '· Identical problem — served instantly. Click Regenerate for a fresh take.'
                        : '· Now cached — repeat solves on this exact problem hit the cache.'}
                    </span>
                  </div>
                  <button
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--cam-primary)', color: '#FFFFFF', border: '1px solid var(--cam-primary-dk)', fontFamily: 'var(--font-mono)' }}
                    title="Force a fresh design, ignoring the cache."
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Regenerate
                  </button>
                </div>
              )}

              {/* ── OVERVIEW ── */}
              {sd.overview && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, var(--cam-gold-leaf-lt), var(--cam-gold-leaf))` }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Overview</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => sd.overview!} title="Copy overview" /></div>
                  </div>
                  <div className="px-4 py-3">
                    {(() => {
                      const cleaned = cleanOverviewText(sd.overview);
                      if (!cleaned) return null;
                      const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
                      return (
                        <div className="flex flex-col gap-2">
                          {paragraphs.map((p, i) => (
                            <p key={i} className="text-sm leading-relaxed" style={{ color: t.text }}>{p}</p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

              {/* ── EXPLANATION ── */}
              {result?.pitch && result.pitch !== sd.overview && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, var(--cam-gold-leaf-lt), var(--cam-gold-leaf))` }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Explanation</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => result.pitch!} title="Copy explanation" /></div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm leading-relaxed italic" style={{ color: t.text }}>&ldquo;{result.pitch}&rdquo;</p>
                  </div>
                </section>
              )}

              {/* ── REQUIREMENTS: Functional + Non-Functional ── */}
              {(() => {
                const functionalClean = cleanRequirementList(sd.requirements?.functional);
                const nonFunctionalClean = cleanRequirementList(sd.requirements?.nonFunctional);
                if (!functionalClean.length && !nonFunctionalClean.length) return null;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
                    {functionalClean.length > 0 && (
                      <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                          <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, var(--cam-gold-leaf-lt), var(--cam-gold-leaf))` }} />
                          <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Functional</h2>
                          <Chip variant="default" className="ml-auto">{functionalClean.length}</Chip>
                          <SectionCopyBtn getText={() => functionalClean.map((r, i) => `${i + 1}. ${r}`).join('\n')} title="Copy functional requirements" />
                        </div>
                        <div className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-y-1">
                            {functionalClean.map((r, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm leading-snug py-0.5" style={{ color: t.text }}>
                                <span className="font-bold shrink-0" style={{ color: t.headerText }}>{i + 1}.</span>{r}
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}
                    {nonFunctionalClean.length > 0 && (
                      <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                          <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, var(--cam-gold-leaf-lt), var(--cam-gold-leaf))` }} />
                          <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Non-Functional</h2>
                          <Chip variant="default" className="ml-auto">{nonFunctionalClean.length}</Chip>
                          <SectionCopyBtn getText={() => nonFunctionalClean.join('\n')} title="Copy non-functional requirements" />
                        </div>
                        <div className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-y-1">
                            {nonFunctionalClean.map((r, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm leading-snug py-0.5" style={{ color: t.text }}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: t.dotColor }} />{r}
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                );
              })()}

              {/* ── SCALE ESTIMATES ── */}
              {sd.scaleEstimates && Object.entries(sd.scaleEstimates).filter(([, v]) => v && v.trim()).length > 0 && (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, var(--cam-primary), ${t.dotColor})` }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Scale Estimates</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => Object.entries(sd.scaleEstimates || {}).filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v}`).join('\n')} title="Copy scale estimates" /></div>
                  </div>
                  {sd.scaleInputs && <ScaleCalculator baseline={sd.scaleInputs} themeTokens={t} />}
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
                                  <tr key={key} style={{ borderBottom: `1px solid var(--border)` }}>
                                    <td className="text-[11px] font-bold py-1.5 pr-3 whitespace-nowrap" style={{ color: t.text }}>{key}</td>
                                    <td className="text-[11px] py-1.5" style={{ color: t.text }}>{val}</td>
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
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, var(--cam-primary), ${t.dotColor})` }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Scalability Tiers</h2>
                    <div className="ml-auto"><SectionCopyBtn getText={() => (sd.techJustifications || []).map(tier => `${tier.tech}\n${tier.details.map(d => `  - ${d}`).join('\n')}`).join('\n\n')} title="Copy scalability tiers" /></div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[10px] mb-2" style={{ color: t.textMuted }}>Click a tier to re-stream a focused LLD drill-down for that component.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                      {sd.techJustifications.map((tier, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (isLoading || !problemText.trim()) return;
                              const drill = `Deep-dive LLD for the ${tier.tech} component in this system: "${problemText.trim()}". Cover partitioning strategy, replication, consistency model, failure modes, and data model for just this component — skip the rest of the system.`;
                              handleSubmit(drill);
                            }}
                            disabled={isLoading}
                            title={`Drill into ${tier.tech}`}
                            className="rounded-lg p-2 flex flex-col justify-start transition-[box-shadow,transform] hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
                            style={{ border: `1px solid ${t.cardBorder}`, background: t.sectionBg, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--cam-primary)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.cardBorder; }}>
                            <div className="text-xs font-bold text-white bg-[var(--accent)] rounded px-2 py-1 mb-1 flex items-center justify-center gap-1">
                              {tier.tech}
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </div>
                            {tier.details.length > 0 && (
                              <div className="text-xs leading-relaxed text-left mt-1" style={{ color: t.textMuted }}>
                                {tier.details.slice(0, 3).map((d, j) => <div key={j} title={d}>- {d}</div>)}
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                </section>
              )}

              {/* ── TRADEOFFS + EDGE CASES ── */}
              {(() => {
                // Cap at 5. Anything more is noise — interview-grade designs
                // hinge on a handful of important choices, not a long list.
                // Backend prompt also asks for 3-5; this is the safety net.
                const tradeoffsClean = cleanRequirementList(sd.tradeoffs).slice(0, 5);
                const edgeCasesClean = cleanRequirementList(sd.edgeCases);
                if (!tradeoffsClean.length && !edgeCasesClean.length) return null;
                return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {tradeoffsClean.length > 0 && (
                    <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                        <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, var(--cam-primary))` }} />
                        <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Tradeoffs</h2>
                        <div className="ml-auto"><SectionCopyBtn getText={() => tradeoffsClean.map((tr, i) => `${i + 1}. ${tr}`).join('\n')} title="Copy tradeoffs" /></div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-2">
                          {tradeoffsClean.map((tr, i) => (
                            <div
                              key={i}
                              className="rounded-lg px-3 py-2"
                              style={{ background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
                              <div className="flex items-start gap-2 text-sm leading-snug" style={{ color: t.text }}>
                                <span className="font-bold shrink-0 mt-0.5" style={{ color: t.dotColor }}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </span>
                                <span className="flex-1">{tr}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                  {edgeCasesClean.length > 0 && (
                    <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                        <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, var(--warning))` }} />
                        <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Edge Cases</h2>
                        <div className="ml-auto"><SectionCopyBtn getText={() => edgeCasesClean.map((e, i) => `${i + 1}. ${e}`).join('\n')} title="Copy edge cases" /></div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-1 gap-2">
                          {edgeCasesClean.map((e, i) => (
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
                );
              })()}

              {/* ── FOLLOW-UP Q&A ── */}
              {(() => {
                const followupsClean = cleanFollowupList(sd.followups);
                if (!followupsClean.length) return null;
                return (
                <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.cardBorder}`, background: t.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: t.headerBg }}>
                    <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${t.dotColor}, var(--warning))` }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--cam-strip-heading)' }}>Follow-up Q&A</h2>
                    <Chip variant="default" className="ml-auto">{followupsClean.length}</Chip>
                    <SectionCopyBtn getText={() => followupsClean.map((f, i) => `Q${i + 1}: ${f.question}\nA: ${f.answer}`).join('\n\n')} title="Copy follow-up Q&A" />
                  </div>
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {followupsClean.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmit(f.question)}
                          disabled={isLoading}
                          className="rounded-lg p-2.5 text-left transition-[box-shadow,transform] hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
                          style={{ border: `1px solid ${t.cardBorder}`, background: t.sectionBg, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                          title="Click to re-stream a focused answer to this follow-up"
                          onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--cam-primary)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.cardBorder; }}>
                          <div className="flex items-start gap-1.5 mb-1">
                            <span className="text-xs font-mono font-bold shrink-0" style={{ color: t.headerText }}>Q{i + 1}</span>
                            <span className="text-xs font-semibold flex-1" style={{ color: t.text }}>{f.question}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" style={{ color: 'var(--cam-primary)' }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </div>
                          <p className="text-xs leading-relaxed pl-5" style={{ color: t.textMuted }}>{f.answer}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
                );
              })()}

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
