import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import AnsiToHtml from 'ansi-to-html';
const _ansi = new AnsiToHtml({ escapeXML: true, newline: false });
const ansiHtml = (s: string) => _ansi.toHtml(s);
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Editor, useMonaco } from '@monaco-editor/react';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import { AnnotationPanel } from './AnnotationPanel';
import { streamCoFixResponse } from '@/lib/sse-client';
import { playgroundAPI } from '@/lib/capra-api';
import type { CoFixAnswer, CoFixChange, CoFixWalkStep } from '@/lib/sse-client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT } from '@/lib/companyContext';
import { cofixChecks } from '@/components/lumora/shared/readiness';
import { useToolReadiness } from '@/components/lumora/shared/useToolReadiness';
import { ReadinessChip } from '@/components/lumora/shared/ReadinessChip';
import type { ScreenshotEntry } from '@/components/lumora/shell/ScreenshotStrip';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { useSessionStore } from '@/stores/session-store';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

// ── CoFix Log custom icons ────────────────────────────────────────────────────
const G = 'var(--cam-gold-leaf)';
const LogIconBolt    = ({ color = G }: { color?: string }) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1L2.5 6.5H5.5L5 11L9.5 5.5H6.5L7 1Z" fill={color}/></svg>;
const LogIconSearch  = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round"><circle cx="5" cy="5" r="3.2"/><line x1="7.5" y1="7.5" x2="10.5" y2="10.5"/></svg>;
const LogIconScan    = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.4" strokeLinecap="round"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/><line x1="3.5" y1="4" x2="8.5" y2="4"/><line x1="3.5" y1="6" x2="8.5" y2="6"/><line x1="3.5" y1="8" x2="6" y2="8"/></svg>;
const LogIconSpark   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.3" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="2.5"/><line x1="6" y1="9.5" x2="6" y2="11"/><line x1="1" y1="6" x2="2.5" y2="6"/><line x1="9.5" y1="6" x2="11" y2="6"/><line x1="2.8" y1="2.8" x2="3.8" y2="3.8"/><line x1="8.2" y1="8.2" x2="9.2" y2="9.2"/><line x1="9.2" y1="2.8" x2="8.2" y2="3.8"/><line x1="3.8" y1="8.2" x2="2.8" y2="9.2"/><circle cx="6" cy="6" r="1.8" fill={G} stroke="none"/></svg>;
const LogIconReceive = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="1.5" x2="6" y2="8"/><polyline points="3.5,5.5 6,8 8.5,5.5"/><line x1="2" y1="10.5" x2="10" y2="10.5"/></svg>;
const LogIconError   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5"/><line x1="4" y1="4" x2="8" y2="8"/><line x1="8" y1="4" x2="4" y2="8"/></svg>;
const LogIconCheck   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="4.5"/><polyline points="3.5,6 5.5,8 8.5,4"/></svg>;
const LogIconGear    = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="1.8"/><path d="M6 1.5V3M6 9v1.5M1.5 6H3M9 6h1.5M2.9 2.9l1 1M8.1 8.1l1 1M9.1 2.9l-1 1M3.9 8.1l-1 1"/></svg>;
const LogIconWrench  = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.8 1.5a2.5 2.5 0 00-2.5 3.1L2 9a1 1 0 001.4 1.4l4.4-4.3A2.5 2.5 0 008.8 1.5z"/><line x1="2.5" y1="9.5" x2="3.2" y2="8.8"/></svg>;

const detectLanguage = (text: string): string => {
  if (/^FROM\s+\S+/m.test(text)) return 'dockerfile';
  if (/^services:\s*$/m.test(text) && /image:|build:/.test(text)) return 'docker-compose';
  if (/^resource\s+"[\w_]+"\s+"[\w_]+"\s*\{/m.test(text) || /^provider\s+"[\w_]+"\s*\{/m.test(text)) return 'terraform';
  if (/^---\s*$|^\s[\w_-]+:\s/m.test(text) && !/def\s+\w+|class\s+\w+/.test(text)) return 'yaml';
  if (/^#!.*\b(bash|sh)\b|^\s*(echo|export|source|chmod)\s/.test(text)) return 'bash';
  if (/def\s+\w+\s*\(|class\s+\w+:|import\s+\w+|print\s*\(/.test(text)) return 'python';
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*{/.test(text)) return 'javascript';
  if (/public\s+class\s+\w+|System\.out\.print/.test(text)) return 'java';
  if (/#include\s*<|int\s+main\s*\(/.test(text)) return /vector<|cout/.test(text) ? 'cpp' : 'c';
  if (/func\s+\w+\s*\(.*\)\s*(->|\{)|package\s+main/.test(text)) return 'go';
  if (/pub\s+fn\s+\w+|let\s+mut\s+\w+/.test(text)) return 'rust';
  return 'python';
};

// Maps CoFix language IDs → Monaco editor language tokens
const MONACO_LANG: Record<string, string> = {
  bash: 'shell',
  'docker-compose': 'yaml',
  terraform: 'hcl',
};
const toMonacoLang = (lang: string): string => MONACO_LANG[lang] ?? lang;

const LANGUAGES = [
  { id: 'python', label: 'Python 3' },
  { id: 'auto', label: 'Auto-detect' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'bash', label: 'Bash' },
  { id: 'dockerfile', label: 'Dockerfile' },
  { id: 'yaml', label: 'YAML' },
  { id: 'docker-compose', label: 'Docker Compose' },
  { id: 'terraform', label: 'Terraform' },
];

interface CoFixLayoutProps {
  onScreenshotAppendRef?: { current: ((text: string, starterCode?: string) => void) | null };
  /** Parent sets this ref; calling it injects code into the left editor and optionally sets the language. */
  onInjectCodeRef?: { current: ((code: string, lang?: string) => void) | null };
  screenshots?: ScreenshotEntry[];
  onSnapped?: (entry: ScreenshotEntry) => void;
  onRemove?: (id: string) => void;
  onTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  isTabActive?: boolean;
}

const pillBase = 'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,opacity] active:scale-[0.97]';

export const CoFixLayout = ({ onScreenshotAppendRef, onInjectCodeRef, screenshots = [], onSnapped, onRemove, onTranscription, isTabActive }: CoFixLayoutProps) => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const monacoTheme: 'vs' | 'vs-dark' = theme === 'light' ? 'vs' : 'vs-dark';
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [pendingSnapIds, setPendingSnapIds] = useState<string[]>([]);
  const onSnappedRef = useRef(onSnapped);
  useEffect(() => { onSnappedRef.current = onSnapped; }, [onSnapped]);
  const navigate = useNavigate();
  const location = useLocation();

  // NOTE: the two "inject a problem from the Coding tab" effects live further
  // down (after resetSolution is declared) so a fresh problem also clears the
  // previous fix. See resetSolution + the inject effects below.
  const monaco = useMonaco();
  useEffect(() => { if (monaco) monaco.editor.setTheme(monacoTheme); }, [monaco, monacoTheme]);

  const [inputCode, setInputCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [isLoading, setIsLoading] = useState(false);
  const [fixedCode, setFixedCode] = useState('');
  const [changes, setChanges] = useState<CoFixChange[]>([]);
  const [walkthrough, setWalkthrough] = useState<CoFixWalkStep[]>([]);
  const [complexity, setComplexity] = useState<{ time: string; space: string } | null>(null);
  const [hackerrankCompatible, setHackerrankCompatible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [runOutputLog, setRunOutputLog] = useState<Array<{ts: Date; text: string}>>([]);
  const [explainMode, setExplainMode] = useState(false);

  // Analysis panel state
  type Analysis = {
    title: string; problem: string; input_format: string; output_format: string;
    examples: { input: string; output: string; explanation: string }[];
    test_cases: { input: string; expected: string }[];
    steps: { code: string; text: string }[];
    concepts: string[];
  };
  type CustomTest = { id: string; input: string; expected: string; result: string | null; running: boolean; isErr: boolean };
  const mkTest = (seed = ''): CustomTest => ({ id: `t${Date.now()}-${Math.random()}`, input: seed, expected: '', result: null, running: false, isErr: false });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // Problem statement to thread into every CoFix request so the backend can SOLVE
  // an empty platform-template stub (not just repair broken code). Sourced from the
  // snapped screenshots' OCR text, falling back to the generated analysis problem.
  // Read via ref inside the stream callbacks to avoid stale closures.
  const problemContextRef = useRef('');
  const [problemContext, setProblemContext] = useState('');
  useEffect(() => {
    const snapped = screenshots.map(s => s.text).filter(Boolean).join('\n\n').trim();
    const next = snapped || analysis?.problem?.trim() || '';
    problemContextRef.current = next;
    setProblemContext(next);   // ref alone never re-renders the chip
  }, [screenshots, analysis]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  // Minimize (not close): collapses the analysis drawer to a thin restore bar so
  // there is always a way back — never an ✕ that hides chrome with no return.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelTab, setPanelTab] = useState<'problem' | 'learn'>('problem');
  const [customTests, setCustomTests] = useState<CustomTest[]>([mkTest()]);

  const [showRefinePopup, setShowRefinePopup] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineSnapping, setRefineSnapping] = useState(false);
  const refineTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  type LogLine = { elapsed: string; icon: React.ReactNode; status?: 'error' | 'success'; msg: string };
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [showLogPopup, setShowLogPopup] = useState(false);
  const logStartRef = useRef(0);
  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const logHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const autoFixAttemptsRef = useRef(0);
  const pendingAutoFixRef2 = useRef<{ code: string; hint: string } | null>(null);
  const autoRunRef = useRef(false);
  const pendingAnalyzeRef = useRef(false);
  const handleFixRef = useRef<() => void>(() => {});

  const [panelHeight, setPanelHeight] = useState(300);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelDragRef = useRef<{ startY: number; startH: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cofixHoverDisposable = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const decorationCollectionRef = useRef<any>(null);

  // Clear every solution-derived output so a freshly injected problem never
  // shows the previous fix. Mirrors the reset block in handleFix but does NOT
  // start a run — the user still presses Fix (or paste auto-fires). Stable
  // identity (empty deps, only stable setters/refs inside) so the inject
  // effects below don't re-fire on every render.
  const resetSolution = useCallback(() => {
    // Abort any in-flight fix so its stream can't land on the new problem,
    // and drop the loading / log-popup state it owned.
    abortRef.current?.abort();
    if (logHideTimerRef.current) clearTimeout(logHideTimerRef.current);
    setIsLoading(false);
    setShowLogPopup(false);
    setLogLines([]);
    setFixedCode('');
    setChanges([]);
    setWalkthrough([]);
    setComplexity(null);
    setHackerrankCompatible(null);
    setError(null);
    setRunOutputLog([]);
    setAnalysis(null);
    setAnalysisError(false);
    setAnalysisLoading(false);
    setCustomTests([mkTest()]);
    autoFixAttemptsRef.current = 0;
    decorationCollectionRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual Reset — wipes the pasted code AND the solution so the user can
  // start a fresh problem in the same session (mirrors Coding / Design Reset).
  const handleReset = useCallback(() => {
    resetSolution();
    setInputCode('');
  }, [resetSolution]);

  // Pick up a problem injected from the Coding tab via navigate state, and
  // clear the previous solution first so the old fix never lingers.
  useEffect(() => {
    const state = location.state as { injectCode?: string; injectLang?: string } | null;
    if (state?.injectCode) {
      resetSolution();
      setInputCode(state.injectCode);
      if (state.injectLang) setLanguage(state.injectLang);
      // Clear so it doesn't re-apply on future re-renders
      window.history.replaceState(null, '');
    }
  }, [location.state, resetSolution]);

  // Direct injection via the shared ref (Coding "Send to CoFix").
  useEffect(() => {
    if (!onInjectCodeRef) return;
    onInjectCodeRef.current = (code: string, lang?: string) => {
      resetSolution();
      setInputCode(code);
      if (lang) setLanguage(lang);
    };
    return () => { onInjectCodeRef.current = null; };
  }, [onInjectCodeRef, resetSolution]);

  // effectiveLang must be declared before any useEffect that lists it as a dependency,
  // otherwise it is in TDZ when React evaluates the dependency array.
  const effectiveLang = language === 'auto' ? detectLanguage(inputCode) : language;
  const lineCount = inputCode.split('\n').length;

  // Re-render when company context changes
  const [assistantVersion, setAssistantVersion] = useState(0);
  useEffect(() => {
    const handler = () => setAssistantVersion(v => v + 1);
    window.addEventListener(ASSISTANT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_UPDATED_EVENT, handler);
  }, []);
  const activeAssistant = useMemo(() => getActiveAssistant(), [assistantVersion]);

  const { blocking, degrading, dismiss } = useToolReadiness(
    cofixChecks({ inputCode, problemContext, company: activeAssistant?.company ?? null }),
  );

  useEffect(() => {
    cofixHoverDisposable.current?.dispose();
    cofixHoverDisposable.current = null;
    if (!monaco || !explainMode) return;

    const monacoLang = toMonacoLang(effectiveLang);
    cofixHoverDisposable.current = monaco.languages.registerHoverProvider(monacoLang, {
      provideHover: async (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber).trim();
        if (!lineContent) return null;
        try {
          const result = await playgroundAPI.explain(
            model.getValue(),
            position.lineNumber,
            effectiveLang
          );
          if (!result.explanation) return null;
          return {
            contents: [
              { value: `**Line ${position.lineNumber}** — *Gemini*` },
              { value: result.explanation },
            ],
          };
        } catch {
          return null;
        }
      },
    });

    return () => { cofixHoverDisposable.current?.dispose(); };
  }, [monaco, explainMode, effectiveLang]);

  // Screenshot append ref — appends OCR text to the left pane input
  useEffect(() => {
    if (!onScreenshotAppendRef) return;
    onScreenshotAppendRef.current = (text: string, starter?: string) => {
      // Prefer the captured editor template as the code to fix — that's the locked
      // answer block CoFix must complete in place. Fall back to OCR/problem text.
      const clean = typeof starter === 'string' && starter.trim() ? starter : null;
      if (clean) { setInputCode(clean); return; }
      setInputCode(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
    };
    return () => { onScreenshotAppendRef.current = null; };
  }, [onScreenshotAppendRef]);

  useEffect(() => {
    const editor = rightEditorRef.current;
    if (!editor || !monaco || changes.length === 0) return;

    const newDecorations = changes.map(change => ({
      range: new monaco.Range(change.line, 1, change.line, 1),
      options: {
        isWholeLine: true,
        className: change.type === 'fix' ? 'cofix-line-fix' : 'cofix-line-added',
      },
    }));

    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.set(newDecorations);
    } else {
      decorationCollectionRef.current = editor.createDecorationsCollection(newDecorations);
    }
  }, [changes, monaco, fixedCode]);


  const handleSnap = useCallback(async () => {
    if (!onSnappedRef.current) return;
    const camo = (window as any).camo;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    try {
      let dataUrl: string;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (result?.error) throw new Error(result.error);
        // Prefer the desktop's EXACT DOM extraction (verbatim editor template +
        // problem text) over screenshot OCR. When a coding-platform tab is open,
        // snapActiveBrowser returns the real editor content — load it straight
        // into the editor as the code to complete and skip OCR entirely.
        const domStarter = typeof result?.starterCode === 'string' && result.starterCode.trim()
          ? result.starterCode
          : null;
        const domText = typeof result?.text === 'string' && result.text.trim()
          ? result.text
          : null;
        if (domStarter || domText) {
          let thumb = '';
          if (result?.dataUrl) {
            try {
              const b = await fetch(result.dataUrl).then(r => r.blob());
              thumb = await new Promise<string>(res => { const reader = new FileReader(); reader.onloadend = () => res(reader.result as string); reader.readAsDataURL(b); });
            } catch { /* thumbnail is optional */ }
          }
          if (domStarter) setInputCode(domStarter);
          onSnappedRef.current?.({ id, dataUrl: thumb, text: domText || '' });
          setSnapState('idle');
          return;
        }
        const blob = await fetch(result.dataUrl || result).then(r => r.blob());
        dataUrl = await new Promise<string>(res => { const reader = new FileReader(); reader.onloadend = () => res(reader.result as string); reader.readAsDataURL(blob); });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no 2d context');
          ctx.drawImage(bitmap, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
        } finally { track.stop(); }
      }
      const tempEntry: ScreenshotEntry = { id, dataUrl, text: '' };
      setPendingSnapIds(prev => [...prev, id]);
      setSnapState('idle');
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', new File([blob], 'snap.png', { type: 'image/png' }));
        const resp = await fetch(`${API_URL}/api/v1/coding/extract-from-image`, {
          method: 'POST', credentials: 'include',
          headers: { Authorization: `Bearer ${token}` }, body: formData,
        });
        if (!resp.ok) throw new Error(`OCR ${resp.status}`);
        const data = await resp.json();
        // /extract-from-image returns the OCR'd statement under `problem`. Store it as
        // the screenshot's text so problemContextRef can thread it into the CoFix SOLVE
        // request (fills the template stub against the real problem, not the fn name alone).
        const snappedProblem = data.problem && data.problem !== 'NO_PROBLEM_FOUND'
          ? data.problem
          : (data.text || data.problem_text || '');
        onSnappedRef.current?.({ ...tempEntry, text: snappedProblem });
        // The snapped screenshot usually shows the platform's editor template (e.g. a
        // HackerRank function stub + locked __main__ harness). Load it into the editor
        // as the code to complete so the fix preserves that EXACT structure — fills the
        // function body, keeps the harness — instead of writing a from-scratch solution.
        const starter = typeof data.starter_code === 'string' && data.starter_code.trim()
          ? data.starter_code
          : null;
        if (starter) {
          setInputCode(starter);
          if (data.detected_language) setLanguage(data.detected_language);
        }
      } catch { onSnappedRef.current?.({ ...tempEntry, text: '' }); }
      finally { setPendingSnapIds(prev => prev.filter(p => p !== id)); }
    } catch {
      setSnapState('error');
      setTimeout(() => setSnapState('idle'), 3000);
      setPendingSnapIds(prev => prev.filter(p => p !== id));
    }
  }, [token]);

  const handleFix = useCallback(async (codeOverride?: string) => {
    const code = codeOverride ?? inputCode;
    if (code.trim().length < 5 || isLoading) return;
    autoFixAttemptsRef.current = 0;

    abortRef.current?.abort();
    if (logHideTimerRef.current) clearTimeout(logHideTimerRef.current);
    logStartRef.current = Date.now();
    setLogLines([]);
    setShowLogPopup(true);
    setIsLoading(true);
    setFixedCode('');
    setChanges([]);
    setWalkthrough([]);
    setComplexity(null);
    setHackerrankCompatible(null);
    setError(null);
    setRunOutputLog([]);
    decorationCollectionRef.current = null;

    addLog(<LogIconBolt />, 'Starting CoFix…');
    const t1 = setTimeout(() => addLog(<LogIconSearch />, `Parsing ${effectiveLang} code…`), 300);
    const t2 = setTimeout(() => addLog(<LogIconScan />, 'Scanning for issues…'), 800);
    const t3 = setTimeout(() => addLog(<LogIconSpark />, 'Querying…'), 1400);

    // Reset panel — analyze will fire with fixedCode once fix stream completes
    setAnalysis(null);
    setAnalysisError(false);
    setCustomTests([mkTest()]);
    setShowPanel(true);
    setPanelCollapsed(false); // a fresh fix always expands — never leave results hidden behind a prior minimize
    setPanelTab('problem');

    const controller = await streamCoFixResponse({
      code,
      hint: undefined,
      company: activeAssistant?.company || undefined,
      problem: problemContextRef.current || undefined,
      language: effectiveLang,
      token: token!,
      onAnswer: (data: CoFixAnswer) => {
        clearTimeout(t3);
        addLog(<LogIconReceive />, `Receiving fixes… (${data.changes.length} change${data.changes.length !== 1 ? 's' : ''})`, 'success');
        setFixedCode(data.fixed_code.split('\n').filter((l: string) => l.trim() !== '').join('\n'));
        setChanges(data.changes);
        setWalkthrough(data.walkthrough ?? []);
        setComplexity(data.complexity);
        setHackerrankCompatible(data.hackerrank_compatible);
      },
      onError: ({ msg }) => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        addLog(<LogIconError />, `Error: ${msg}`, 'error');
        setError(msg);
        setIsLoading(false);
      },
      onComplete: () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        addLog(<LogIconCheck />, 'Complete — analyzing problem…', 'success');
        autoRunRef.current = true;
        pendingAnalyzeRef.current = true;
        setIsLoading(false);
        logHideTimerRef.current = setTimeout(() => setShowLogPopup(false), 2500);
      },
    });
    abortRef.current = controller;
  }, [inputCode, effectiveLang, token, isLoading, activeAssistant]);

  const runCustomTest = useCallback(async (id: string) => {
    const tc = customTests.find(t => t.id === id);
    if (!tc || !fixedCode || !String(tc.input ?? '').trim()) return;
    setCustomTests(prev => prev.map(t => t.id === id ? { ...t, running: true, result: null } : t));
    try {
      // Strip top-level lines in fixedCode that duplicate a registered test input.
      // Without this, fixedCode's own driver calls (e.g. `print(add(2,7))`) fire
      // before the test input and pollute the actual output, causing false MISMATCHes.
      const testInputLines = new Set(customTests.map(t => String(t.input ?? '').trim()).filter(Boolean));
      const cleanCode = fixedCode.split('\n')
        .filter(line => {
          const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');
          return !isTopLevel || !testInputLines.has(line.trim());
        })
        .join('\n');
      const testCode = `${cleanCode}\n\n${tc.input}`;
      const resp = await fetch(`${API_URL}/api/v1/coding/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: testCode, language: effectiveLang, test_cases: [] }),
      });
      const data = await resp.json();
      let rawOut = (data.direct_output || data.output || '(no output)').trim();
      // Fallback: when the solution reads from stdin (input()/sys.stdin), its
      // read fires before the appended test line and EOFs → "(no stdin input)".
      // If the test input is itself a self-contained statement (starts with a
      // print/console.log/echo), run it ON ITS OWN so we get real output
      // instead of the misleading stdin message.
      const solutionReadsStdin = /\b(input\s*\(|sys\.stdin|readline\s*\(|prompt\s*\()/.test(cleanCode);
      const testIsSelfContained = /^\s*(print|console\.log|echo|System\.out|puts|fmt\.Print)/.test(String(tc.input ?? ''));
      if (rawOut.includes('(no stdin input)') && solutionReadsStdin && testIsSelfContained) {
        const resp2 = await fetch(`${API_URL}/api/v1/coding/execute`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: String(tc.input), language: effectiveLang, test_cases: [] }),
        });
        const data2 = await resp2.json();
        const alt = (data2.direct_output || data2.output || '').trim();
        if (alt && !alt.includes('(no stdin input)')) rawOut = alt;
      }
      const output = rawOut.startsWith('(no output) —') ? '(no output)' : rawOut;
      const err = !resp.ok || output.startsWith('Error:') || output.startsWith('Traceback') || /^error:/i.test(output);
      setCustomTests(prev => prev.map(t => t.id === id ? { ...t, running: false, result: output, isErr: err } : t));
      setRunOutputLog(prev => [...prev, { ts: new Date(), text: `[Test] ${String(tc.input ?? '').trim()}\n${output}` }]);
    } catch (e: any) {
      setCustomTests(prev => prev.map(t => t.id === id ? { ...t, running: false, result: `Error: ${(e as any).message}`, isErr: true } : t));
      setRunOutputLog(prev => [...prev, { ts: new Date(), text: `[Test] ${String(tc.input ?? '').trim()}\nError: ${(e as any).message}` }]);
    }
  }, [customTests, fixedCode, effectiveLang, token]);

  const runAllCustomTests = useCallback(async () => {
    for (const tc of customTests) {
      if (String(tc.input ?? '').trim()) await runCustomTest(tc.id);
    }
  }, [customTests, runCustomTest]);

  // Keep handleFixRef current so paste handler always calls the latest closure
  useEffect(() => { handleFixRef.current = handleFix; }, [handleFix]);

  const handleRun = useCallback(async () => {
    if (!fixedCode || isRunning) return;
    setIsRunning(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/coding/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: fixedCode, language: effectiveLang, test_cases: [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `Error ${response.status}`);
      const rawResult = data.direct_output || data.output || '(no output)';
      const runResult = rawResult.startsWith('(no output) —') ? '(no output)' : rawResult;
      const hasRunError =
        runResult.startsWith('Error:') || runResult.startsWith('Traceback') ||
        /^error:/i.test(runResult) ||
        /SyntaxError|NameError|TypeError|ValueError|AttributeError|RuntimeError/.test(runResult);
      if (autoFixEnabled && hasRunError && autoFixAttemptsRef.current < 1) {
        autoFixAttemptsRef.current += 1;
        pendingAutoFixRef2.current = {
          code: fixedCode,
          hint: `Runtime error:\n${runResult.slice(0, 600)}\n\nFix the code so it runs without errors.`,
        };
      } else {
        setRunOutputLog(prev => [...prev, { ts: new Date(), text: runResult }]);
      }
    } catch (err: any) {
      setRunOutputLog(prev => [...prev, { ts: new Date(), text: `Error: ${err.message}` }]);
    } finally {
      setIsRunning(false);
    }
  }, [fixedCode, effectiveLang, token, isRunning, autoFixEnabled]);

  // Auto-run when fix completes if triggered by paste
  useEffect(() => {
    if (!isLoading && autoRunRef.current && fixedCode) {
      autoRunRef.current = false;
      handleRun();
    }
  }, [isLoading, fixedCode, handleRun]);

  const handleCopy = useCallback(() => {
    if (!fixedCode) return;
    navigator.clipboard.writeText(fixedCode).then(() => {
      setCopyFeedback('copied');
      setTimeout(() => setCopyFeedback('idle'), 2000);
    }).catch(() => {
      setCopyFeedback('failed');
      setTimeout(() => setCopyFeedback('idle'), 2000);
    });
  }, [fixedCode]);

  const handleSendToCoding = useCallback(() => {
    navigate('/lumora/coding', { state: { cofixCode: fixedCode } });
  }, [fixedCode, navigate]);

  const handleLeftEditorMount = useCallback((editor: any) => {
    editor.updateOptions({
      fontFamily: 'var(--font-mono)',
      fontLigatures: true,
      letterSpacing: -0.3,
    });
    editor.onDidPaste(() => {
      const raw = editor.getValue();
      const stripped = raw.split('\n').filter((l: string) => l.trim() !== '').join('\n');
      if (stripped !== raw) {
        editor.setValue(stripped);
        const model = editor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          editor.setPosition({ lineNumber: lineCount, column: model.getLineLength(lineCount) + 1 });
        }
      }
      if (stripped.trim().length >= 5) {
        autoRunRef.current = true;
        setTimeout(() => handleFixRef.current(), 50);
      }
    });
  }, []);

  const addLog = useCallback((icon: React.ReactNode, msg: string, status?: 'error' | 'success') => {
    const elapsed = `+${((Date.now() - logStartRef.current) / 1000).toFixed(1)}s`;
    setLogLines(prev => [...prev, { elapsed, icon, status, msg }]);
  }, []);

  useEffect(() => {
    if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [logLines]);

  const runAutoFix = useCallback(async (code: string, errorHint: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setRunOutputLog([]);
    logStartRef.current = Date.now();
    setLogLines([]);
    setShowLogPopup(true);
    addLog(<LogIconGear />, 'Auto-fixing runtime error…');
    const controller = await streamCoFixResponse({
      code,
      hint: errorHint,
      company: activeAssistant?.company || undefined,
      problem: problemContextRef.current || undefined,
      language: effectiveLang,
      token: token!,
      onAnswer: (data: CoFixAnswer) => {
        addLog(<LogIconWrench />, `Applying fix… (${data.changes.length} change${data.changes.length !== 1 ? 's' : ''})`);
        setFixedCode(data.fixed_code.split('\n').filter((l: string) => l.trim() !== '').join('\n'));
        setChanges(data.changes);
        setWalkthrough(data.walkthrough ?? []);
        setComplexity(data.complexity);
        setHackerrankCompatible(data.hackerrank_compatible);
      },
      onError: ({ msg }) => {
        addLog(<LogIconError />, `Auto-fix failed: ${msg}`, 'error');
        setError(msg);
        setIsLoading(false);
      },
      onComplete: () => {
        addLog(<LogIconCheck />, 'Auto-fix done — re-running…', 'success');
        autoRunRef.current = true;
        pendingAnalyzeRef.current = true;
        setIsLoading(false);
        logHideTimerRef.current = setTimeout(() => setShowLogPopup(false), 2000);
      },
    });
    abortRef.current = controller;
  }, [isLoading, effectiveLang, token, activeAssistant, addLog]);

  useEffect(() => {
    if (!isRunning && !isLoading && pendingAutoFixRef2.current) {
      const { code, hint: errorHint } = pendingAutoFixRef2.current;
      pendingAutoFixRef2.current = null;
      runAutoFix(code, errorHint);
    }
  }, [isRunning, isLoading, runAutoFix]);

  // Focus refine textarea when popup opens
  useEffect(() => {
    if (showRefinePopup) setTimeout(() => refineTextareaRef.current?.focus(), 50);
  }, [showRefinePopup]);

  const handleRefine = useCallback(async (promptOverride?: string) => {
    const prompt = promptOverride ?? refinePrompt;
    if (!fixedCode || !prompt.trim() || isLoading) return;
    setShowRefinePopup(false);

    abortRef.current?.abort();
    if (logHideTimerRef.current) clearTimeout(logHideTimerRef.current);
    logStartRef.current = Date.now();
    setLogLines([]);
    setShowLogPopup(true);
    setIsLoading(true);
    setChanges([]);
    setWalkthrough([]);
    setComplexity(null);
    setHackerrankCompatible(null);
    setError(null);
    setRunOutputLog([]);
    decorationCollectionRef.current = null;

    addLog(<LogIconSpark />, `Refining: "${prompt.slice(0, 50)}${prompt.length > 50 ? '…' : ''}"`);
    const t1 = setTimeout(() => addLog(<LogIconScan />, 'Applying changes…'), 600);
    const t2 = setTimeout(() => addLog(<LogIconSpark />, 'Querying…'), 1200);

    const controller = await streamCoFixResponse({
      code: fixedCode,
      hint: prompt,
      company: activeAssistant?.company || undefined,
      problem: problemContextRef.current || undefined,
      language: effectiveLang,
      token: token!,
      onAnswer: (data: CoFixAnswer) => {
        clearTimeout(t2);
        addLog(<LogIconReceive />, `Refinement applied (${data.changes.length} change${data.changes.length !== 1 ? 's' : ''})`, 'success');
        setFixedCode(data.fixed_code.split('\n').filter((l: string) => l.trim() !== '').join('\n'));
        setChanges(data.changes);
        setWalkthrough(data.walkthrough ?? []);
        setComplexity(data.complexity);
        setHackerrankCompatible(data.hackerrank_compatible);
      },
      onError: ({ msg }) => {
        clearTimeout(t1); clearTimeout(t2);
        addLog(<LogIconError />, `Refinement failed: ${msg}`, 'error');
        setError(msg);
        setIsLoading(false);
      },
      onComplete: () => {
        clearTimeout(t1); clearTimeout(t2);
        addLog(<LogIconCheck />, 'Refinement complete', 'success');
        autoRunRef.current = true;
        pendingAnalyzeRef.current = true;
        setIsLoading(false);
        if (!promptOverride) setRefinePrompt('');
        logHideTimerRef.current = setTimeout(() => setShowLogPopup(false), 2500);
      },
    });
    abortRef.current = controller;
  }, [fixedCode, refinePrompt, isLoading, effectiveLang, token, activeAssistant, addLog]);

  // Screenshot → text into the refine box. Lets the user snap an error message,
  // a failing test case, or extra requirements and fold it into the refinement.
  // Prefers the desktop's exact DOM text; falls back to OCR of the captured image.
  const handleRefineSnap = useCallback(async () => {
    if (!token || refineSnapping) return;
    setRefineSnapping(true);
    try {
      const camo = (window as any).camo;
      let domText: string | null = null;
      let imageBlob: Blob | null = null;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (typeof result?.text === 'string' && result.text.trim()) domText = result.text.trim();
        if (result?.dataUrl) { try { imageBlob = await (await fetch(result.dataUrl)).blob(); } catch { /* image optional */ } }
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        try {
          const bmp = await new (window as any).ImageCapture(track).grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width; canvas.height = bmp.height;
          canvas.getContext('2d')?.drawImage(bmp, 0, 0);
          imageBlob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/png'));
        } finally { track.stop(); }
      }
      let extracted = domText;
      if (!extracted && imageBlob) {
        const fd = new FormData();
        fd.append('image', new File([imageBlob], 'refine.png', { type: 'image/png' }));
        const resp = await fetch(`${API_URL}/api/v1/coding/extract-from-image`, {
          method: 'POST', credentials: 'include',
          headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
        if (resp.ok) {
          const d = await resp.json();
          extracted = (d.problem && d.problem !== 'NO_PROBLEM_FOUND') ? d.problem : (d.text || d.starter_code || '');
        }
      }
      if (extracted && extracted.trim()) {
        setRefinePrompt(prev => prev.trim() ? `${prev.trim()}\n\n${extracted.trim()}` : extracted.trim());
        setTimeout(() => refineTextareaRef.current?.focus(), 30);
      }
    } catch { /* snap cancelled or failed — leave the box as-is */ }
    finally { setRefineSnapping(false); }
  }, [token, refineSnapping]);

  const guessEdgeCases = (inputFormat: string): string[] => {
    const f = inputFormat.toLowerCase();
    if (/list|array/.test(f)) return ['print(solution([]))', 'print(solution([1]))'];
    if (/string/.test(f))     return ['print(solution(""))', 'print(solution("a"))'];
    if (/tree/.test(f))       return ['print(solution(None))', 'print(solution([1, None, 2]))'];
    if (/graph/.test(f))      return ['print(solution({}))', 'print(solution({0: [1], 1: [0]}))'];
    if (/int|number/.test(f)) return ['print(solution(0))', 'print(solution(-1))'];
    return ['# Add edge case 1 here', '# Add edge case 2 here'];
  };

  const runAnalyze = useCallback((code: string, lang: string) => {
    setAnalysis(null);
    setAnalysisError(false);
    setAnalysisLoading(true);
    fetch(`${API_URL}/api/v1/coding/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ code, language: lang }),
    })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        setAnalysis(data);
        const aiTests: CustomTest[] = (data.test_cases || []).map((tc: { input: string; expected: string }) =>
          ({ id: `ai-${Date.now()}-${Math.random()}`, input: tc.input, expected: tc.expected, result: null, running: false, isErr: false })
        );
        const edgeCalls = guessEdgeCases(data.input_format || '');
        const edgeTests: CustomTest[] = edgeCalls.map((call, i) =>
          ({ id: `edge-${i}-${Date.now()}`, input: call, expected: '', result: null, running: false, isErr: false })
        );
        setCustomTests(prev => {
          const userTyped = prev.filter(t => String(t.input ?? '').trim() !== '' && !t.id.startsWith('ai-') && !t.id.startsWith('edge-'));
          return [...aiTests, ...edgeTests, ...userTyped, mkTest()];
        });
      })
      .catch(() => setAnalysisError(true))
      .finally(() => setAnalysisLoading(false));
  }, [token]);

  const retryAnalyze = useCallback(() => {
    if (fixedCode) runAnalyze(fixedCode, effectiveLang);
  }, [fixedCode, effectiveLang, runAnalyze]);

  // Trigger analyze after fix stream completes — must be AFTER runAnalyze declaration to avoid TDZ
  useEffect(() => {
    if (!isLoading && pendingAnalyzeRef.current && fixedCode) {
      pendingAnalyzeRef.current = false;
      runAnalyze(fixedCode, effectiveLang);
    }
  }, [isLoading, fixedCode, effectiveLang, runAnalyze]);


  const handlePanelDragStart = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelRef.current.offsetHeight;
    panelDragRef.current = { startY, startH };
    const onMove = (ev: MouseEvent) => {
      if (!panelDragRef.current) return;
      const delta = panelDragRef.current.startY - ev.clientY;
      setPanelHeight(Math.max(80, Math.min(640, panelDragRef.current.startH + delta)));
    };
    const onUp = () => {
      panelDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);


  const lastRun = runOutputLog[runOutputLog.length - 1];
  const isErr = lastRun !== undefined && (lastRun.text.startsWith('Error:') || lastRun.text.startsWith('Traceback') || /^error:/i.test(lastRun.text));

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar — single combined row ── */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar lumora-winctl-safe" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        {/* Language */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--cam-gold-leaf)' }}>Lang</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="text-[12px] rounded px-2 py-1 cursor-pointer focus:outline-none"
            style={{
              background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, var(--bg-elevated) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf)',
            }}
          >
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* Explain chip */}
        <button
          onClick={() => setExplainMode(v => !v)}
          className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90 shrink-0"
          style={explainMode ? {
            fontFamily: 'var(--font-sans)',
            background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
            border: '1px solid var(--cam-gold-leaf)',
            color: '#0a0e1a',
          } : {
            fontFamily: 'var(--font-sans)',
            background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, var(--bg-elevated) 100%)',
            border: '1px solid var(--cam-gold-leaf-dk)',
            color: 'var(--cam-gold-leaf-dk)',
          }}
        >
          Explain
        </button>


        {/* Flexible spacer — keeps action buttons right-aligned. No status/banner
            text (removed per design: toolbar shows controls only). */}
        <div className="flex-1 min-w-0" />

        {/* Action buttons — only when fixed code is ready */}
        {fixedCode && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSendToCoding}
              className="text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, var(--bg-elevated) 100%)',
                border: '1px solid var(--cam-gold-leaf-dk)',
                color: 'var(--cam-gold-leaf-dk)',
              }}
            >
              → Coding
            </button>
          </div>
        )}

        {/* Reset — clears pasted code + solution for a fresh problem */}
        {(inputCode || fixedCode) && (
          <button
            onClick={handleReset}
            title="Reset — clear code and solution"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md transition-opacity hover:opacity-90 shrink-0"
            style={{
              background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, var(--bg-elevated) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf-dk)',
            }}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* SNAP */}
        {onSnapped && (
          <button
            onClick={handleSnap}
            disabled={snapState === 'capturing'}
            title={snapState === 'error' ? 'Snap failed' : 'Snap screen'}
            className={pillBase}
            style={snapState === 'error'
              ? { background: 'var(--danger)', color: '#ffffff' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
            }
          >
            {snapState === 'capturing'
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              : snapState === 'error'
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
            }
            {snapState === 'error' ? 'Failed' : snapState === 'capturing' ? '…' : 'Snap'}
          </button>
        )}

        {/* Pending snap thumbnails */}
        {pendingSnapIds.map(pid => (
          <div key={pid} className="w-10 h-7 rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'color-mix(in oklab, var(--text-primary) 25%, transparent)', borderTopColor: 'var(--text-primary)' }} />
          </div>
        ))}

        {/* Completed thumbnails */}
        {screenshots.map((s, i) => (
          <div key={s.id} className="relative group shrink-0" title={s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
            <img src={s.dataUrl} alt={`Screenshot ${i + 1}`} className="h-7 w-10 object-cover rounded" style={{ border: '1px solid var(--border-hover)' }} />
            <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--cam-accent-fill)', color: 'var(--cam-accent-fill-text)' }}>{i + 1}</span>
            {onRemove && (
              <button onClick={() => onRemove(s.id)} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex" style={{ background: 'var(--danger)', color: '#ffffff' }} title="Remove">
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        ))}

        {/* AudioCapture */}
        {onTranscription && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <AudioCapture onTranscription={onTranscription} autoStart={false} active={isTabActive} compact />
          </div>
        )}

        {/* Stealth moved to the global rail toggle (LumoraIconRail). */}
      </div>

      {/* ── Split pane ── */}
      {/* On narrow screens the 3-pane min-width (220+220+160) would push the
          whole page sideways; contain it to a local horizontal scroll instead.
          Desktop (md+) is unchanged: min-w-0 + overflow visible. */}
      <div className="flex-1 min-h-0 overflow-x-auto md:overflow-x-visible">
      <div className="h-full min-w-[680px] md:min-w-0">
      <Allotment defaultSizes={[34, 33, 33]}>

        {/* LEFT — broken code input */}
        <Allotment.Pane minSize={220}>
        <div className="flex flex-col h-full border-r border-[var(--border)]">
          <div className="h-8 flex items-center justify-between px-4 border-b border-[var(--cam-gold-leaf-dk)] bg-[var(--bg-secondary)] shrink-0">
            <span className="text-[10px] font-semibold tracking-wider text-[var(--cam-gold-leaf-dk)] uppercase">Broken Code</span>
            <div className="flex items-center gap-2">
              <ReadinessChip
                blocking={blocking}
                degrading={degrading}
                onDismiss={dismiss}
                actions={{ problem: [{ label: 'Snap', primary: true, onClick: () => handleSnap() }] }}
              />
              <button
                onClick={() => handleFix()}
                disabled={inputCode.trim().length < 5 || isLoading}
                className="h-6 px-3 rounded text-[10px] font-bold uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={
                  degrading.length > 0
                    ? { background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning-text)' }
                    : { background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }
                }
              >
                {isLoading ? 'Analyzing…' : degrading.length > 0 ? 'CoFix ▲' : 'CoFix'}
              </button>
            </div>
          </div>

          {lineCount > 500 && (
            <div className="px-4 py-1.5 border-b text-[11px]" style={{ background: 'color-mix(in oklab, var(--warning) 10%, transparent)', borderColor: 'color-mix(in oklab, var(--warning) 20%, transparent)', color: 'var(--warning-text)' }}>
              Large paste — CoFix works best on focused snippets.
            </div>
          )}

          <div className="flex-1 min-h-0" style={{ background: 'var(--bg-surface)' }}>
            <SharedCodeEditor
              code={inputCode}
              onChange={setInputCode}
              language={toMonacoLang(effectiveLang)}
              readOnly={false}
              height="100%"
              showLineNumbers
              fontSize={11}
              onMount={handleLeftEditorMount}
              theme={monacoTheme}
            />
          </div>

        </div>
        </Allotment.Pane>

        {/* RIGHT — fixed code output */}
        <Allotment.Pane minSize={220}>
        <div className="flex h-full">
          {/* Code editor column */}
          <div className="flex flex-col flex-1 min-w-0 relative">
          <div className="h-8 flex items-center gap-1.5 px-2 border-b border-[var(--cam-gold-leaf-dk)] bg-[var(--bg-secondary)] shrink-0 overflow-x-auto no-scrollbar">
            {fixedCode && (
              <>
                <button
                  onClick={() => { setInputCode(fixedCode); handleFix(fixedCode); }}
                  disabled={isLoading}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }}
                  title="Run CoFix again on this fixed code"
                >
                  {isLoading ? 'Analyzing…' : 'CoFix'}
                </button>
                <div className="w-px h-4 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)',
                    color: '#0a0e1a',
                  }}
                >
                  {isRunning ? <><span className="w-2.5 h-2.5 border-2 border-[#0a0e1a]/40 border-t-[#0a0e1a] rounded-full animate-spin" />Run</> : <>▶ Run</>}
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!fixedCode || copyFeedback !== 'idle'}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md transition-all disabled:cursor-not-allowed"
                  style={copyFeedback === 'copied' ? {
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                  } : copyFeedback === 'failed' ? {
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.1) 100%)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                  } : {
                    background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, var(--bg-elevated) 100%)',
                    border: '1px solid var(--cam-gold-leaf)',
                    color: 'var(--cam-gold-leaf)',
                  }}
                >
                  {copyFeedback === 'copied' ? '✓ Copied' : copyFeedback === 'failed' ? '✕ Failed' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowRefinePopup(v => !v)}
                  disabled={isLoading}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={showRefinePopup ? {
                    background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)',
                    color: '#0a0e1a',
                  } : {
                    background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, var(--bg-elevated) 100%)',
                    border: '1px solid var(--cam-gold-leaf-dk)',
                    color: 'var(--cam-gold-leaf-dk)',
                  }}
                >
                  Refine
                </button>
                <div className="w-px h-4 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />
              </>
            )}
            {/* Auto-Fix status */}
            {isLoading && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-gold-leaf)' }}>
                <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
              </span>
            )}
            {!isLoading && fixedCode && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--accent)' }}>
                <LogIconCheck />
              </span>
            )}
            <div className="flex-1 min-w-0" />
            <span className="shrink-0 text-[10px] font-semibold tracking-wider uppercase" style={{ color: fixedCode ? 'var(--cam-gold-leaf)' : 'var(--cam-gold-leaf-dk)' }}>
              Fixed Code
            </span>
          </div>

          {/* Quick-refine chip strip — always visible when fixed code exists */}
          {fixedCode && (
            <div className="flex items-center gap-1.5 px-2 shrink-0 overflow-x-auto no-scrollbar" style={{ height: 28, borderBottom: '1px solid color-mix(in oklab, var(--accent) 18%, transparent)', background: 'color-mix(in oklab, var(--accent) 4%, transparent)' }}>
              {[
                { label: '+ Print steps',    prompt: 'Add print() statements before and after each key step to show intermediate values' },
                { label: '+ Type hints',     prompt: 'Add type hints to all function parameters and return types' },
                { label: '+ Docstrings',     prompt: 'Add a concise docstring to every function' },
                { label: '+ Error handling', prompt: 'Wrap the main logic in try/except and print a clear error message on failure' },
                { label: '+ Comments',       prompt: 'Add a short inline comment on every non-obvious line' },
              ].map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => handleRefine(prompt)}
                  disabled={isLoading}
                  className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                  style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            {/* Monaco editor — read-only with line decorations */}
            <div className="flex-1 min-w-0 relative">
              {/* Streaming log popup */}
              {showLogPopup && (
                <div className="absolute top-3 right-3 z-20 w-72 flex flex-col rounded-lg overflow-hidden shadow-2xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)' }}>
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isLoading ? 'var(--cam-gold-leaf)' : 'var(--accent-text)', boxShadow: isLoading ? '0 0 6px var(--cam-gold-leaf)' : '0 0 6px var(--accent-text)' }} />
                    <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>CoFix Log</span>
                    {!isLoading && (
                      <button onClick={() => setShowLogPopup(false)} className="text-[11px] opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--cam-gold-leaf-dk)' }}>✕</button>
                    )}
                  </div>
                  {/* Log body */}
                  <div ref={logScrollRef} className="flex flex-col gap-0.5 px-3 py-2 max-h-48 overflow-y-auto">
                    {logLines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[9px] shrink-0 tabular-nums" style={{ color: 'color-mix(in oklab, var(--accent) 45%, transparent)', fontFamily: 'var(--font-mono)' }}>{line.elapsed}</span>
                        <span className="shrink-0 flex items-center">{line.icon}</span>
                        <span className="text-[10px] leading-relaxed" style={{ color: line.status === 'error' ? 'var(--danger)' : line.status === 'success' ? 'var(--accent-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{line.msg}</span>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] tabular-nums" style={{ color: 'color-mix(in oklab, var(--accent) 45%, transparent)', fontFamily: 'var(--font-mono)' }}>…</span>
                        <span className="w-3 h-px flex-1 overflow-hidden relative" style={{ background: 'color-mix(in oklab, var(--accent) 15%, transparent)' }}>
                          <span className="absolute inset-y-0 left-0 w-1/3 animate-[shimmer_1s_ease-in-out_infinite]" style={{ background: 'var(--cam-gold-leaf)', animation: 'pulse 1s ease-in-out infinite' }} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Refine modal — portal so Allotment transforms don't break fixed positioning */}
              {showRefinePopup && createPortal(
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRefinePopup(false)} />
                  <div
                    className="fixed z-50 w-[440px] max-w-[92vw] rounded-xl overflow-hidden shadow-2xl"
                    style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)' }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)' }}>
                      <LogIconSpark />
                      <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>
                        Refine Fixed Code
                      </span>
                      <button onClick={() => setShowRefinePopup(false)} className="text-[13px] opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--cam-gold-leaf-dk)' }}>✕</button>
                    </div>
                    <div className="px-3 py-3 flex flex-col gap-2.5">
                      <textarea
                        ref={refineTextareaRef}
                        value={refinePrompt}
                        onChange={e => setRefinePrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleRefine(); } }}
                        placeholder={`Describe how to change the fixed code…\nExamples:\n  • Always try to reduce the no of code lines\n  • Replace recursion with iteration\n  • Rename variables to be more descriptive`}
                        rows={5}
                        className="w-full resize-none rounded-lg px-3 py-2.5 text-[11px] leading-relaxed focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cam-gold-leaf)]"
                        style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)', color: 'var(--text-primary)' }}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={handleRefineSnap}
                          disabled={refineSnapping || isLoading}
                          title="Screenshot an error, failing case, or extra context and add it to the refinement"
                          className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 12%, transparent) 0%, var(--bg-elevated) 100%)', border: '1px solid var(--cam-gold-leaf-dk)', color: 'var(--cam-gold-leaf-dk)' }}
                        >
                          {refineSnapping
                            ? <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cam-gold-leaf-dk)', borderTopColor: 'transparent' }} />
                            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>}
                          {refineSnapping ? 'Reading…' : 'Snap'}
                        </button>
                        <span className="text-[9.5px] opacity-40 mr-auto" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>⌘↵ to submit</span>
                        <button
                          onClick={() => setShowRefinePopup(false)}
                          className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        >Cancel</button>
                        <button
                          onClick={() => handleRefine()}
                          disabled={!refinePrompt.trim() || isLoading}
                          className="text-[10px] font-bold uppercase tracking-[0.1em] px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }}
                        >Apply</button>
                      </div>
                    </div>
                  </div>
                </>,
                document.body
              )}

              {error && !isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg-primary)]">
                  <p className="text-[12px] text-red-400 text-center px-6">{error}</p>
                  <button
                    onClick={() => handleFix()}
                    className="text-[12px] px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[#0047AB] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              <Editor
                value={fixedCode}
                language={toMonacoLang(effectiveLang)}
                theme={monacoTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontLigatures: true,
                  letterSpacing: -0.3,
                  lineHeight: 19,
                  scrollBeyondLastLine: false,
                  glyphMargin: false,
                  folding: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
                onMount={editor => { rightEditorRef.current = editor; }}
              />
            </div>

          </div>

          {/* Complexity strip */}
          {complexity && (
            <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-[11px] flex-wrap shrink-0">
              <span className="text-[var(--text-muted)]">
                Time: <span className="text-[var(--text-primary)] font-mono">{complexity.time}</span>
              </span>
              <span className="text-[var(--text-muted)]">
                Space: <span className="text-[var(--text-primary)] font-mono">{complexity.space}</span>
              </span>
              {hackerrankCompatible !== null && (
                <span style={{ color: hackerrankCompatible ? "var(--accent-text)" : "var(--warning-text)" }}>
                  {hackerrankCompatible ? '✓ HackerRank Compatible' : '⚠ Strip I/O boilerplate before submitting'}
                </span>
              )}
            </div>
          )}

          </div>
        </div>
        </Allotment.Pane>

        {/* WALK-THROUGH / CHANGES — 3rd pane. Hidden until CoFix produces content,
            so Broken|Fixed get the full width instead of an empty bordered box
            occupying ~1/3 of the viewport pre-run. `visible` collapses the pane
            and redistributes space WITHOUT remounting panes 1-2 (no Monaco flicker). */}
        <Allotment.Pane minSize={160} visible={changes.length > 0 || walkthrough.length > 0}>
          <AnnotationPanel changes={changes} walkthrough={walkthrough} />
        </Allotment.Pane>

      </Allotment>
      </div>
      </div>

      {/* ── Analysis panel — 2 columns ── */}
      {showPanel && (
        <div ref={panelRef} className="shrink-0 flex flex-col" style={{ height: panelCollapsed ? 34 : panelHeight, borderTop: '1px solid var(--cam-gold-leaf)', background: 'var(--bg-surface)' }}>

          {panelCollapsed ? (
            /* Collapsed → thin restore bar. Clicking anywhere reopens the drawer. */
            <button
              onClick={() => setPanelCollapsed(false)}
              className="h-full w-full flex items-center gap-3 px-4 text-left transition-opacity hover:opacity-80"
              style={{ background: 'var(--cam-hero-strip)' }}
              title="Expand analysis"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-gold-leaf-dk)' }}>
                Problem · Tests · Output
              </span>
              <div className="flex-1" />
              <span className="text-[12px]" style={{ color: 'var(--cam-gold-leaf)' }}>▴</span>
            </button>
          ) : (
          <>
          {/* Drag handle */}
          <div
            onMouseDown={handlePanelDragStart}
            className="h-1.5 shrink-0 cursor-ns-resize"
            style={{ background: 'var(--cam-gold-leaf)', opacity: 0.35 }}
            title="Drag to resize"
          />

          {/* Two-column body — Allotment for drag-resize */}
          <div className="flex-1 min-h-0">
          <Allotment defaultSizes={[40, 60]}>

            {/* ── LEFT: Problem / Learn ── */}
            <Allotment.Pane minSize={120}>
            <div className="flex flex-col h-full" style={{ borderRight: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 25%,transparent)' }}>
              <div className="flex items-center shrink-0" style={{ height: 34, background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
                {(['problem', 'learn'] as const).map(tab => (
                  <button key={tab} onClick={() => setPanelTab(tab)}
                    className="h-full px-4 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
                    style={{ color: panelTab === tab ? 'var(--cam-gold-leaf)' : 'var(--cam-gold-leaf-dk)', borderBottom: panelTab === tab ? '2px solid var(--cam-gold-leaf)' : '2px solid transparent', background: 'none' }}>
                    {tab === 'problem' ? 'Problem' : 'Learn'}
                  </button>
                ))}
                <div className="flex-1" />
                {analysisLoading && (
                  <span className="flex items-center gap-1.5 text-[11px] px-3" style={{ color: 'var(--cam-gold-leaf-dk)' }}>
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf-dk)', borderTopColor: 'transparent' }} />
                    Analyzing…
                  </span>
                )}
                <button onClick={() => setPanelCollapsed(true)} title="Minimize" className="px-3 text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>▾</button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* Loading */}
                {!analysis && analysisLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {panelTab === 'problem' ? 'Generating problem statement…' : 'Building step-by-step walkthrough…'}
                    </span>
                  </div>
                )}
                {/* Error */}
                {!analysis && !analysisLoading && analysisError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Could not generate analysis</span>
                    <button onClick={retryAnalyze} disabled={!fixedCode}
                      className="text-[11px] font-bold px-4 py-1.5 rounded-lg transition-opacity disabled:opacity-40 hover:opacity-80"
                      style={{ border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf)', background: 'transparent' }}>
                      ↺ Retry
                    </button>
                  </div>
                )}
                {/* Empty */}
                {!analysis && !analysisLoading && !analysisError && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Run CoFix to generate analysis</span>
                  </div>
                )}

                {/* Problem tab */}
                {analysis && panelTab === 'problem' && (
                  <div>
                    <h3 className="text-[14px] font-bold mb-2" style={{ color: 'var(--cam-gold-leaf)' }}>{analysis.title}</h3>
                    <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{analysis.problem}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[['Input', analysis.input_format], ['Output', analysis.output_format]].map(([label, val]) => (
                        <div key={label} className="p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                          <div className="text-[12px]" style={{ color: 'var(--text-primary)' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {analysis.examples.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cam-primary)' }}>{ex.input}</code>
                          <span style={{ color: 'var(--text-muted)' }}>→</span>
                          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cam-gold-leaf)', fontWeight: 600 }}>{ex.output}</code>
                          {ex.explanation && <span className="italic text-[11px]" style={{ color: 'var(--text-muted)' }}>{'// '}{ex.explanation}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learn tab */}
                {analysis && panelTab === 'learn' && (
                  <div>
                    {analysis.concepts.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Concepts used</div>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.concepts.map((c, i) => (
                            <span key={i} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                              style={{ background: 'color-mix(in oklab,var(--cam-primary) 15%,var(--bg-elevated))', border: '1px solid color-mix(in oklab,var(--cam-primary) 30%,transparent)', color: 'var(--cam-primary)' }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.problem && (
                      <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 25%,transparent)' }}>
                        <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--cam-gold-leaf-dk)' }}>Why this approach</div>
                        <p className="text-[12px] leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>{analysis.problem}</p>
                      </div>
                    )}
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>How it works — step by step</div>
                    <div className="space-y-2.5">
                      {analysis.steps.map((s, i) => (
                        <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                            style={{ background: 'color-mix(in oklab,var(--cam-gold-leaf) 20%,var(--bg-surface))', color: 'var(--cam-gold-leaf)', border: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 40%,transparent)' }}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            {s.code && (
                              <code className="block text-[11px] px-2.5 py-1.5 rounded mb-1.5 leading-relaxed"
                                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', background: 'var(--bg-app)', border: '1px solid var(--border)' }}>
                                {s.code}
                              </code>
                            )}
                            <p className="text-[12px] leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>{s.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </Allotment.Pane>

            {/* ── RIGHT: Tests | Output (drag-resizable) ── */}
            <Allotment.Pane minSize={160}>
            <Allotment defaultSizes={[50, 50]}>

              {/* Tests column */}
              <Allotment.Pane minSize={120}>
              <div className="flex flex-col h-full" style={{ borderRight: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 25%,transparent)' }}>
                <div className="flex items-center shrink-0 gap-2 px-3" style={{ height: 34, background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-gold-leaf)' }}>
                    Tests
                    <span className="ml-1.5 normal-case font-normal text-[10px] opacity-60">
                      {customTests.filter(t => String(t.input ?? '').trim()).length} case{customTests.filter(t => String(t.input ?? '').trim()).length !== 1 ? 's' : ''}
                      {analysisLoading && ' · generating…'}
                    </span>
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={runAllCustomTests}
                    disabled={!fixedCode || customTests.every(t => !String(t.input ?? '').trim())}
                    className="text-[10px] font-bold px-2 py-0.5 rounded transition-opacity disabled:opacity-40 hover:opacity-80"
                    style={{ border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf)', background: 'transparent' }}
                  >▶ All</button>
                  <button
                    onClick={() => setCustomTests(prev => [...prev, mkTest()])}
                    className="text-[10px] font-bold px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                    style={{ border: '1px solid var(--cam-gold-leaf-dk)', color: 'var(--cam-gold-leaf-dk)', background: 'transparent' }}
                  >+ Add</button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                  {!fixedCode && (
                    <p className="text-[11px] text-center pt-4" style={{ color: 'var(--text-muted)' }}>Run CoFix first</p>
                  )}
                  {customTests.map(tc => {
                    const hasPassed = tc.result !== null && !tc.isErr && (!tc.expected || tc.result.trim() === tc.expected.trim());
                    const hasFailed = tc.result !== null && !tc.isErr && tc.expected && tc.result.trim() !== tc.expected.trim();
                    const borderColor = tc.isErr ? 'rgba(239,68,68,0.35)' : hasPassed ? 'rgba(34,197,94,0.35)' : hasFailed ? 'rgba(251,191,36,0.35)' : 'var(--border)';
                    return (
                      <div key={tc.id} className="rounded-lg overflow-hidden flex flex-col" style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-elevated)' }}>
                        <div className="flex items-start gap-2 px-2.5 pt-2 pb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-2 w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>In</span>
                          <textarea
                            value={tc.input}
                            onChange={e => setCustomTests(prev => prev.map(t => t.id === tc.id ? { ...t, input: e.target.value, result: null } : t))}
                            placeholder="print(my_function(arg1, arg2))"
                            rows={2}
                            className="flex-1 resize-none bg-transparent focus:outline-none placeholder:opacity-30"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-primary)', lineHeight: 1.6 }}
                          />
                          <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                            <button
                              onClick={() => runCustomTest(tc.id)}
                              disabled={tc.running || !fixedCode || !String(tc.input ?? '').trim()}
                              className="flex items-center justify-center text-[10px] font-bold w-7 h-6 rounded transition-opacity disabled:opacity-40"
                              style={{ background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)', color: '#0a0e1a' }}
                            >
                              {tc.running ? <span className="w-2 h-2 border border-[#0a0e1a]/30 border-t-[#0a0e1a] rounded-full animate-spin" /> : '▶'}
                            </button>
                            <button
                              onClick={() => setCustomTests(prev => prev.length > 1 ? prev.filter(t => t.id !== tc.id) : [mkTest()])}
                              className="flex items-center justify-center w-7 h-6 rounded transition-opacity hover:opacity-70 text-[11px]"
                              style={{ color: 'var(--text-muted)', background: 'transparent' }}
                            >✕</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 pb-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>Exp</span>
                          <input
                            value={tc.expected}
                            onChange={e => setCustomTests(prev => prev.map(t => t.id === tc.id ? { ...t, expected: e.target.value } : t))}
                            placeholder="expected (optional)"
                            className="flex-1 bg-transparent focus:outline-none placeholder:opacity-25"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--cam-gold-leaf-dk)' }}
                          />
                        </div>
                        {tc.result !== null && (
                          <div className="px-2.5 pb-2 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tc.isErr ? 'var(--danger)' : hasFailed ? 'var(--warning-text)' : 'var(--accent-text)' }}>
                                {tc.isErr ? '✕ Error' : hasFailed ? '≠ Mismatch' : '✓ Output'}
                              </span>
                              {tc.expected && !tc.isErr && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: hasPassed ? 'var(--accent-text)' : 'var(--warning-text)', background: hasPassed ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'color-mix(in oklab, var(--warning) 12%, transparent)' }}>
                                  {hasPassed ? 'PASS' : 'FAIL'}
                                </span>
                              )}
                            </div>
                            <pre className="text-[10.5px] whitespace-pre-wrap m-0" style={{ color: tc.isErr ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}
                              dangerouslySetInnerHTML={{ __html: ansiHtml(tc.result ?? '') }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </Allotment.Pane>

              {/* Output column */}
              <Allotment.Pane minSize={100}>
              <div className="flex flex-col h-full">
                <div className="flex items-center shrink-0 px-4 gap-2" style={{ height: 34, background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] flex-1"
                    style={{ color: isErr ? 'var(--danger)' : runOutputLog.length > 0 ? 'var(--accent-text)' : 'var(--cam-gold-leaf-dk)' }}>
                    {isErr ? '✕ Runtime Error' : runOutputLog.length > 0 ? '✓ Output' : 'Output'}
                  </span>
                  {isRunning && (
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                  )}
                  {runOutputLog.length > 0 && !isRunning && (
                    <button
                      onClick={() => setRunOutputLog([])}
                      className="text-[10px] font-semibold shrink-0 opacity-50 hover:opacity-90 transition-opacity"
                      style={{ color: 'var(--cam-gold-leaf-dk)', fontFamily: 'var(--font-sans)' }}
                    >Clear</button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {runOutputLog.length === 0 && !isRunning ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {fixedCode ? 'Click ▶ Run to execute' : 'Run CoFix first'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {runOutputLog.map((entry, i) => {
                        const entryIsErr = entry.text.startsWith('Error:') || entry.text.startsWith('Traceback') || /^error:/i.test(entry.text);
                        return (
                          <div key={i}>
                            <div className="flex items-center gap-2 px-4 py-1.5">
                              <span className="text-[9px] tabular-nums shrink-0" style={{ color: 'color-mix(in oklab, var(--text-muted) 60%, transparent)', fontFamily: 'var(--font-mono)' }}>
                                {entry.ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                              </span>
                              <div className="flex-1 h-px" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }} />
                            </div>
                            <pre
                              className="px-4 pb-3 whitespace-pre-wrap"
                              style={{ color: entryIsErr ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.65, letterSpacing: '-0.02em' }}
                              dangerouslySetInnerHTML={{ __html: ansiHtml(entry.text) }}
                            />
                          </div>
                        );
                      })}
                      {isRunning && (
                        <div className="flex items-center gap-2 px-4 py-2">
                          <span className="w-2 h-2 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                          <span className="text-[11px] italic" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Executing…</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              </Allotment.Pane>

            </Allotment>
            </Allotment.Pane>

          </Allotment>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}
