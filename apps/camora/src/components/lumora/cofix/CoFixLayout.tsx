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
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromCoFix } from '@/lib/lumora/book-model';
import { streamCoFixResponse } from '@/lib/sse-client';
import { playgroundAPI } from '@/lib/capra-api';
import type { CoFixAnswer, CoFixChange, CoFixWalkStep } from '@/lib/sse-client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useOverlayMode } from '@/hooks/useOverlayMode';
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT, getActiveCompanyKey } from '@/lib/companyContext';
import { cofixChecks } from '@/components/lumora/shared/readiness';
import { useToolReadiness } from '@/components/lumora/shared/useToolReadiness';
import { ReadinessChip } from '@/components/lumora/shared/ReadinessChip';
import { ChipSelect } from '@/components/lumora/shared/ChipSelect';
import type { ScreenshotEntry } from '@/components/lumora/shell/ScreenshotStrip';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { dialogAlert } from '@/components/shared/Dialog';
import { snapRegion } from '@/lib/lumora/snapCapture';
import { useSessionStore } from '@/stores/session-store';
import type { ScreenMode, AskMode, TaskMode } from '@/lib/lumora/task-modes';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/** What a capture is asking for. Decided by the snap classifier, overridable
 *  from the mode chips.
 *    review   — the code has faults: wrong operators, stray characters, broken
 *               indentation, calls to things that don't exist.
 *    complete — a skeleton/template whose body must be written.
 *    solve    — a problem statement with no code yet.
 *    explain  — working code the candidate wants described, not changed. */
// Kept to exactly the four the screenshot extractor can return — this list also
// validates its verdict, so an ask-mode leaking in here would let the extractor
// claim a situation it has no way to observe.
const TASK_MODES: { id: ScreenMode; label: string; tip: string }[] = [
  { id: 'review',   label: 'Review',   tip: 'Audit the code for faults — wrong operators, stray characters, indentation, calls to things that do not exist.' },
  { id: 'complete', label: 'Complete', tip: 'Fill in the missing body of this skeleton, keeping every existing line verbatim.' },
  { id: 'solve',    label: 'Solve',    tip: 'Write the solution from the problem statement.' },
  { id: 'explain',  label: 'Explain',  tip: 'Explain what this code does. Changes nothing.' },
];

/**
 * The interviewer's question, as a chip. These are for the moment the code is
 * already settled and the questions start — the half of an interview the tool
 * used to have no answer for. Typing the question into the refine box routes to
 * the same situations; these are the shortcut when there is no time to type.
 */
const ASK_MODES: { id: AskMode; label: string; tip: string }[] = [
  { id: 'clarify',  label: 'Clarify',   tip: '"Any questions before you start?" — what to ask back, and what to assume if they say you choose.' },
  { id: 'optimize', label: 'Do better', tip: '"Can we do better?" — names the bottleneck first, then the improvement and its new cost.' },
  { id: 'justify',  label: 'Why this',  tip: '"Why a hash map and not a tree?" — both directions, plus the condition that flips the choice.' },
  { id: 'extend',   label: 'What if',   tip: 'Scale, changed requirements, concurrency, production. Four parts, ending in the trade-off you accepted.' },
  { id: 'edge',     label: 'Edge cases',tip: '"What breaks it?" — real inputs run against this code, ranked by severity.' },
  { id: 'trace',    label: 'Dry run',   tip: '"Walk me through it" — step-by-step state, or a termination proof.' },
  { id: 'refactor', label: 'Clean up',  tip: '"Make this cleaner" — same behaviour, better shape, with the principle named.' },
  { id: 'hint',     label: 'Took hint', tip: 'They nudged you. Names what the hint points at, follows it, states the pivot.' },
];

/** CoFix needs something in the code field even when solving from a bare
 *  statement; the backend rejects anything under 5 characters. */
const SOLVE_PLACEHOLDER: Record<string, string> = {
  python: '# solve the problem statement above',
  javascript: '// solve the problem statement above',
  typescript: '// solve the problem statement above',
  java: '// solve the problem statement above',
  cpp: '// solve the problem statement above',
  c: '// solve the problem statement above',
  go: '// solve the problem statement above',
  rust: '// solve the problem statement above',
  bash: '# solve the problem statement above',
};
const solvePlaceholder = (lang: string) => SOLVE_PLACEHOLDER[lang] || '# solve the problem statement above';

/** Classify a capture that arrives WITHOUT the extractor's verdict — e.g. pushed
 *  in from the shell strip or the desktop screenshot watcher. Same four modes,
 *  decided from the shape of the code alone. */
const classifyLocally = (code?: string | null, problem?: string | null): TaskMode => {
  const c = (code || '').trim();
  if (!c) return 'solve';
  // A stub: an empty/pass/return-only body, or an explicit fill-me marker.
  if (/\b(TODO|FIXME)\b|your code here|implement (this|the)|write your/i.test(c)) return 'complete';
  if (/(^|\n)\s*(pass|return\s*(None|null|0|\[\]|\{\})?)\s*$/m.test(c)) return 'complete';
  if (/\{\s*\}\s*$/m.test(c)) return 'complete';
  // A signature with nothing under it.
  if (/(def|function|func|fn)\s+\w+[^\n]*:?\s*$/m.test(c) && c.split('\n').filter(l => l.trim()).length <= 3) return 'complete';
  return problem && problem.trim() ? 'complete' : 'review';
};

// ── CoFix Log custom icons ────────────────────────────────────────────────────
const G = 'var(--cam-gold-leaf)';
const LogIconBolt    = ({ color = G }: { color?: string }) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1L2.5 6.5H5.5L5 11L9.5 5.5H6.5L7 1Z" fill={color}/></svg>;
const LogIconSearch  = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round"><circle cx="5" cy="5" r="3.2"/><line x1="7.5" y1="7.5" x2="10.5" y2="10.5"/></svg>;
const LogIconScan    = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.4" strokeLinecap="round"><rect x="1.5" y="1.5" width="9" height="9" rx="1.5"/><line x1="3.5" y1="4" x2="8.5" y2="4"/><line x1="3.5" y1="6" x2="8.5" y2="6"/><line x1="3.5" y1="8" x2="6" y2="8"/></svg>;
const LogIconSpark   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={G} strokeWidth="1.3" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="2.5"/><line x1="6" y1="9.5" x2="6" y2="11"/><line x1="1" y1="6" x2="2.5" y2="6"/><line x1="9.5" y1="6" x2="11" y2="6"/><line x1="2.8" y1="2.8" x2="3.8" y2="3.8"/><line x1="8.2" y1="8.2" x2="9.2" y2="9.2"/><line x1="9.2" y1="2.8" x2="8.2" y2="3.8"/><line x1="3.8" y1="8.2" x2="2.8" y2="9.2"/><circle cx="6" cy="6" r="1.8" fill={G} stroke="none"/></svg>;
const LogIconReceive = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="1.5" x2="6" y2="8"/><polyline points="3.5,5.5 6,8 8.5,5.5"/><line x1="2" y1="10.5" x2="10" y2="10.5"/></svg>;
const LogIconError   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5"/><line x1="4" y1="4" x2="8" y2="8"/><line x1="8" y1="4" x2="4" y2="8"/></svg>;
const LogIconCheck   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="4.5"/><polyline points="3.5,6 5.5,8 8.5,4"/></svg>;
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
  onInjectCodeRef?: { current: ((code: string, lang?: string, opts?: { mode?: TaskMode; hint?: string }) => void) | null };
  screenshots?: ScreenshotEntry[];
  onSnapped?: (entry: ScreenshotEntry) => void;
  onRemove?: (id: string) => void;
  onTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  isTabActive?: boolean;
}

const pillBase = 'flex items-center gap-1 px-2.5 py-1 rounded text-[12px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,opacity] active:scale-[0.97]';

export const CoFixLayout = ({ onScreenshotAppendRef, onInjectCodeRef, screenshots = [], onSnapped, onRemove, onTranscription, isTabActive }: CoFixLayoutProps) => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const overlayOn = useOverlayMode();
  // Overlay is a dark graphite frost in BOTH themes and strips the editor
  // background to transparent, so light-theme 'vs' (dark tokens) would be
  // invisible on it. Force vs-dark whenever floated as an overlay.
  const monacoTheme: 'vs' | 'vs-dark' = (theme === 'light' && !overlayOn) ? 'vs' : 'vs-dark';
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [snapError, setSnapError] = useState<string | null>(null);
  // What the last capture is asking for. Set by the snap classifier, and
  // overridable from the mode chips when it guesses wrong.
  const [taskMode, setTaskMode] = useState<TaskMode | null>(null);
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
  const [complexity, setComplexity] = useState<{ time: string; space: string; timeWhy?: string; spaceWhy?: string } | null>(null);
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
  const [panelTab, setPanelTab] = useState<'problem' | 'learn' | 'tests' | 'output'>('problem');
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

  // Manual override for the code-area (Broken|Fixed) height; null = auto-fit to
  // the code's line count so the analysis panel below fills the rest (no vacant
  // space). The drag handle between the code area and the panel sets this.
  const [codeH, setCodeH] = useState<number | null>(null);
  const codeAreaRef = useRef<HTMLDivElement | null>(null);
  const panelDragRef = useRef<{ startY: number; startH: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cofixHoverDisposable = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const decorationCollectionRef = useRef<any>(null);
  // The code editors GROW to fit their code and only scroll once the code would
  // exceed the vertical window. The cap is derived from the live viewport (not a
  // fixed 520px, which forced constant scrolling on medium solutions): the code
  // area may grow up to CODE_AREA_MAX (leaving room for the toolbar/footer + a
  // usable analysis panel), and the fixed-code editor caps a little under that so
  // its refine-chips band + complexity strip still fit. Past the cap each editor
  // OWNS an internal scrollbar (auto-heighting past the viewport let Monaco
  // swallow the wheel so nothing scrolled). Re-derived on window resize.
  const [viewportH, setViewportH] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900));
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const CODE_AREA_MAX = Math.max(320, viewportH - 230);
  const FIXED_EDITOR_MAX_H = Math.max(200, CODE_AREA_MAX - 90);
  const [fixedContentH, setFixedContentH] = useState(44);
  const fixedCapped = fixedContentH > FIXED_EDITOR_MAX_H;
  const fixedEditorH = Math.min(fixedContentH, FIXED_EDITOR_MAX_H);
  // MEASURED height of the complexity strip (Big-O + the wrapping "Why …" text).
  // A flat estimate undershot when the explanation wrapped to many lines, so the
  // code area was sized too short and the fixed-code editor got squeezed to a
  // sliver between the refine chips and this strip. Measuring it makes the code
  // area reserve exactly enough room. See fixedBlockH below.
  const complexityRef = useRef<HTMLDivElement | null>(null);
  const [complexityH, setComplexityH] = useState(0);
  useEffect(() => {
    const el = complexityRef.current;
    if (!el) { setComplexityH(0); return; }
    const measure = () => setComplexityH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [complexity, fixedCode, hackerrankCompatible]);

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
    decorationCollectionRef.current?.clear();
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
    const state = location.state as { injectCode?: string; injectLang?: string; injectMode?: TaskMode; injectHint?: string } | null;
    if (state?.injectCode) {
      resetSolution();
      setInputCode(state.injectCode);
      if (state.injectLang) setLanguage(state.injectLang);
      if (state.injectHint) setRefinePrompt(state.injectHint);
      // Handed over from Coding with a verdict — run it, don't make the user
      // press Fix again. Deferred because autoRunSnapRef is assigned by an
      // effect declared BELOW this one, so it is still null on mount.
      if (state.injectMode) {
        const m = state.injectMode, c = state.injectCode, l = state.injectLang;
        setTimeout(() => autoRunSnapRef.current?.({ code: c, mode: m, language: l }), 90);
      }
      // Clear so it doesn't re-apply on future re-renders
      window.history.replaceState(null, '');
    }
  }, [location.state, resetSolution]);

  // Direct injection via the shared ref (Coding "Send to CoFix").
  useEffect(() => {
    if (!onInjectCodeRef) return;
    onInjectCodeRef.current = (code: string, lang?: string, opts?: { mode?: TaskMode; hint?: string }) => {
      resetSolution();
      setInputCode(code);
      if (lang) setLanguage(lang);
      // Handed over from Coding with a verdict (e.g. "review this, don't change
      // it") — run it here instead of leaving the user to press Fix again.
      if (opts?.mode) {
        if (opts.hint) setRefinePrompt(opts.hint);
        const m = opts.mode;
        setTimeout(() => autoRunSnapRef.current?.({ code, mode: m, language: lang }), 90);
      }
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
  // The active assistant is null until a JD/resume is uploaded, but a company
  // can be SELECTED (Prep Kit activeCompany) with no docs yet — that's what the
  // sidebar shows. Fall back to the selected key so the readiness check agrees
  // with the sidebar instead of claiming "no company" for a selected workspace.
  const activeCompany = useMemo(
    () => activeAssistant?.company ?? getActiveCompanyKey(),
    [activeAssistant, assistantVersion],
  );

  const { blocking, degrading, dismiss } = useToolReadiness(
    cofixChecks({ inputCode, problemContext, company: activeCompany }),
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
      // Our own snap already set the editor and is driving the run.
      if (suppressAppendRef.current) return;
      // Prefer the captured editor template as the code to fix — that's the locked
      // answer block CoFix must complete in place. Fall back to OCR/problem text.
      const clean = typeof starter === 'string' && starter.trim() ? starter : null;
      if (clean) setInputCode(clean);
      else if (text) setInputCode(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
      // Screenshots pushed in from OUTSIDE CoFix (the shell strip, the desktop
      // screenshot watcher, F9) used to stop here — editor filled, nothing run.
      // They get the same treatment as CoFix's own snap. No verdict travels with
      // this call, so classify from the shape of what arrived.
      autoRunSnapRef.current?.({
        code: clean || undefined,
        problem: text || undefined,
        mode: classifyLocally(clean, text),
      });
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


  // Fires the classified action for a fresh capture. Goes through a ref because
  // handleFix is defined below and must not be a dependency of handleSnap.
  const handleFixRunRef = useRef<(code?: string, opts?: { mode?: TaskMode; problem?: string }) => void>(() => {});
  // CoFix's own snap calls onSnapped → the shell routes it straight back in
  // through onScreenshotAppendRef. Without this latch that round trip fires a
  // SECOND run and overwrites the starter code with the problem statement.
  // handleSnapped invokes the append ref synchronously, so a plain flag holds.
  const suppressAppendRef = useRef(false);
  const autoRunSnapRef = useRef<((args: { code?: string; problem?: string; mode: TaskMode; language?: string }) => void) | null>(null);
  const autoRunSnap = useCallback((args: { code?: string; problem?: string; mode: TaskMode; language?: string }) => {
    setTaskMode(args.mode);
    if (args.language) setLanguage(args.language);
    // Nothing to send: solve from the statement alone with a placeholder body.
    const code = args.code?.trim()
      ? args.code
      : (args.problem?.trim() ? solvePlaceholder(args.language || effectiveLang) : '');
    if (!code) {
      // The capture yielded neither code nor a problem statement. Say so —
      // this is exactly the "nothing happens" case.
      addLog(<LogIconError />, 'Nothing readable in that capture — no code and no problem text. Snap the problem or the editor and try again.', 'error');
      return;
    }
    addLog(<LogIconSpark />, `Read as ${args.mode.toUpperCase()} — running…`, 'success');
    if (args.code?.trim()) setInputCode(args.code);
    // One tick so the editor/state settles before the stream starts.
    setTimeout(() => handleFixRunRef.current(code, { mode: args.mode, problem: args.problem }), 60);
  }, [effectiveLang]);
  useEffect(() => { autoRunSnapRef.current = autoRunSnap; }, [autoRunSnap]);

  const handleSnap = useCallback(async () => {
    if (!onSnappedRef.current) return;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    setSnapError(null);
    // Open the log from the click. A capture that quietly goes nowhere is the
    // single worst failure mode here — every step has to be visible.
    setLogLines([]);
    setShowLogPopup(true);
    addLog(<LogIconBolt />, 'Select the area to snap…');
    try {
      // Drag-to-select on desktop, share picker on web. withDom also pulls the
      // platform's verbatim editor template, which a region snap of the problem
      // statement would otherwise leave out of the image.
      const snap = await snapRegion({ withDom: true });
      // Escape → no shot, no error. Silently return to idle.
      if (snap.cancelled) { setSnapState('idle'); setShowLogPopup(false); return; }
      if (snap.error || !snap.dataUrl) throw new Error(snap.error || 'Snap produced no image.');
      const { dataUrl } = snap;
      addLog(<LogIconScan />, 'Reading the capture…');
      // Verbatim DOM text beats OCR — skip the round-trip entirely when it's there.
      if (snap.domText || snap.domStarter) {
        if (snap.domStarter) setInputCode(snap.domStarter);
        suppressAppendRef.current = true;
        try { onSnappedRef.current?.({ id, dataUrl, text: snap.domText || '' }); }
        finally { suppressAppendRef.current = false; }
        setSnapState('idle');
        // A platform template with a statement is always "fill this in".
        autoRunSnap({
          code: snap.domStarter || undefined,
          problem: snap.domText || undefined,
          mode: snap.domStarter ? 'complete' : 'solve',
        });
        return;
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
        if (!resp.ok) {
          const detail = await resp.json().then(d => d?.detail).catch(() => null);
          throw new Error(detail || `Extraction failed (${resp.status})`);
        }
        const data = await resp.json();
        // /extract-from-image returns the OCR'd statement under `problem`. Store it as
        // the screenshot's text so problemContextRef can thread it into the CoFix SOLVE
        // request (fills the template stub against the real problem, not the fn name alone).
        const snappedProblem = data.problem && data.problem !== 'NO_PROBLEM_FOUND'
          ? data.problem
          : (data.text || data.problem_text || '');
        suppressAppendRef.current = true;
        try { onSnappedRef.current?.({ ...tempEntry, text: snappedProblem }); }
        finally { suppressAppendRef.current = false; }
        // The snapped screenshot usually shows the platform's editor template (e.g. a
        // HackerRank function stub + locked __main__ harness). Load it into the editor
        // as the code to complete so the fix preserves that EXACT structure — fills the
        // function body, keeps the harness — instead of writing a from-scratch solution.
        let starter = typeof data.starter_code === 'string' && data.starter_code.trim()
          ? data.starter_code
          : null;
        if (starter) {
          setInputCode(starter);
          if (data.detected_language) setLanguage(data.detected_language);
        } else if ((window as any).camo?.extractBrowserProblem) {
          // A region snap of the problem statement usually excludes the editor,
          // so OCR has no template. Pull the verbatim one straight from the
          // platform's DOM instead of leaving the editor empty.
          try {
            const dom = await (window as any).camo.extractBrowserProblem();
            if (dom?.ok && typeof dom.starterCode === 'string' && dom.starterCode.trim()) {
              starter = dom.starterCode;
              setInputCode(dom.starterCode);
            }
          } catch { /* DOM extraction is best-effort */ }
        }
        // Act on the capture straight away — a thumbnail with nothing happening
        // is the same as a dead button. The classifier says what to run; with no
        // code on screen there is nothing to review, so it is a solve.
        const classified: TaskMode = TASK_MODES.some(m => m.id === data.task)
          ? data.task as TaskMode
          : (starter ? 'review' : 'solve');
        const mode: TaskMode = starter ? classified : 'solve';
        autoRunSnap({
          code: starter || undefined,
          problem: snappedProblem || undefined,
          mode,
          language: data.detected_language || undefined,
        });
      } catch (ocrErr: any) {
        onSnappedRef.current?.({ ...tempEntry, text: '' });
        addLog(<LogIconError />, `Could not read the capture: ${ocrErr?.message || 'extraction failed'}`, 'error');
        // OCR failing used to leave a blank thumbnail and no explanation.
        setSnapError(ocrErr?.message || 'Could not read the snap.');
        setSnapState('error');
        setTimeout(() => { setSnapState('idle'); setSnapError(null); }, 6000);
      }
      finally { setPendingSnapIds(prev => prev.filter(p => p !== id)); }
    } catch (err: any) {
      // Silent failure was the whole problem here — say what broke.
      const msg = err?.message || 'Snap failed.';
      setSnapError(msg);
      setSnapState('error');
      setTimeout(() => { setSnapState('idle'); setSnapError(null); }, 6000);
      setPendingSnapIds(prev => prev.filter(p => p !== id));
      await dialogAlert({ title: 'Snap failed', message: msg });
    }
  }, [token]);

  const handleFix = useCallback(async (codeOverride?: string, opts?: { mode?: TaskMode; problem?: string }) => {
    const code = codeOverride ?? inputCode;
    if (code.trim().length < 5 || isLoading) return;
    // An auto-run fires in the same tick as the snap, before the parent has
    // pushed the new screenshot back down into problemContextRef — so the
    // caller passes the freshly-extracted statement explicitly.
    const runMode = opts?.mode ?? taskMode ?? undefined;
    const runProblem = opts?.problem ?? (problemContextRef.current || undefined);
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
    decorationCollectionRef.current?.clear();
    decorationCollectionRef.current = null;

    addLog(<LogIconBolt />, runMode ? `Starting CoFix — ${runMode}…` : 'Starting CoFix…');
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
      company: activeCompany || undefined,
      problem: runProblem,
      language: effectiveLang,
      mode: runMode,
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
  }, [inputCode, effectiveLang, token, isLoading, activeAssistant, taskMode]);

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
  useEffect(() => { handleFixRunRef.current = handleFix; }, [handleFix]);

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
      // Ligatures + negative letter-spacing desync Monaco's per-character width
      // measurement from what's rendered, so clicks/caret drift toward the end of
      // the line. Keep plain monospace metrics for accurate hit-testing.
      fontLigatures: false,
      letterSpacing: 0,
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
      company: activeCompany || undefined,
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
    decorationCollectionRef.current?.clear();
    decorationCollectionRef.current = null;

    addLog(<LogIconSpark />, `Refining: "${prompt.slice(0, 50)}${prompt.length > 50 ? '…' : ''}"`);
    const t1 = setTimeout(() => addLog(<LogIconScan />, 'Applying changes…'), 600);
    const t2 = setTimeout(() => addLog(<LogIconSpark />, 'Querying…'), 1200);

    const controller = await streamCoFixResponse({
      code: fixedCode,
      hint: prompt,
      company: activeCompany || undefined,
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
      // Same drag-to-select crosshair as the footer camera button — snap the
      // exact failing test / error message, not the whole window. No withDom:
      // a refine snap is about what's on screen right now, not the template.
      const snap = await snapRegion();
      if (snap.cancelled) return;
      if (snap.error || !snap.dataUrl) throw new Error(snap.error || 'Snap produced no image.');
      let imageBlob: Blob | null = null;
      try { imageBlob = await (await fetch(snap.dataUrl)).blob(); } catch { /* image optional */ }
      let extracted: string | null = null;
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
    if (!codeAreaRef.current) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = codeAreaRef.current.offsetHeight;
    panelDragRef.current = { startY, startH };
    const onMove = (ev: MouseEvent) => {
      if (!panelDragRef.current) return;
      // Handle sits at the code/panel boundary: drag DOWN grows the code area
      // (and shrinks the panel), drag UP does the reverse.
      const delta = ev.clientY - panelDragRef.current.startY;
      setCodeH(Math.max(120, Math.min(720, panelDragRef.current.startH + delta)));
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

  // Auto-fit the code area (Broken|Fixed) to the taller block's line count so the
  // analysis panel below fills the rest — the editors never leave a big void.
  // Manual drag (codeH) overrides. Only applied once the analysis panel is shown;
  // pre-fix the code area fills the column (a roomy paste canvas).
  const LINE_H = 18;
  const brokenBlockH = 32 + Math.max(1, inputCode.split('\n').length) * LINE_H + 16;
  // Size the fixed block from the editor's MEASURED content height (fixedEditorH),
  // not a line-count estimate — the estimate undershoots (wrapping, font metrics)
  // so the code area came up short and the fixed editor scrolled internally.
  // Using the real measured height makes the area expand exactly with the code.
  const fixedBlockH = fixedCode
    ? fixedEditorH + 40 /*fixed-code action band*/ + 8 /*pt-2 gap*/ + (complexity ? (complexityH || 34) : 0) + 16
    : 0;
  // Grow to fit the taller block, but CAP at CODE_AREA_MAX so the code area never
  // exceeds the vertical window. Below the cap the editors show their code in full
  // (auto-expand, no wasted space); at the cap each editor scrolls INTERNALLY
  // (broken editor owns its Monaco scroll; fixed editor switches to its own
  // scrollbar via fixedCapped). Manual drag (codeH) still overrides.
  const autoCodeH = Math.min(CODE_AREA_MAX, Math.max(150, brokenBlockH, fixedBlockH));
  const effectiveCodeH = codeH ?? autoCodeH;

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar — single combined row ── */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar lumora-winctl-safe" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        {/* Language */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ChipSelect
            label="Lang"
            value={language}
            options={LANGUAGES.map(l => ({ value: l.id, label: l.label }))}
            onChange={setLanguage}
          />
        </div>

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* Explain toggle — icon only (lightbulb) */}
        <button
          onClick={() => setExplainMode(v => !v)}
          data-tip="Explain — hover a line of code for an AI explanation"
          aria-label="Explain"
          className="flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-90 shrink-0"
          style={explainMode ? {
            background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
            border: '1px solid var(--cam-gold-leaf)',
            color: '#0a0e1a',
          } : {
            background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, var(--bg-elevated) 100%)',
            border: '1px solid var(--cam-gold-leaf-dk)',
            color: 'var(--cam-gold-leaf-dk)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.5.5 1 1.2 1 2h6c0-.8.5-1.5 1-2A6 6 0 0012 3z"/></svg>
        </button>

        {/* Reset — icon only (next to Explain, always visible). Wipes code + solution. */}
        {(inputCode || fixedCode) && (
          <button
            onClick={handleReset}
            data-tip="Reset — clear code and solution"
            aria-label="Reset"
            className="flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-90 shrink-0"
            style={{
              background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, var(--bg-elevated) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf-dk)',
            }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}


        {/* Divider before the Broken-code review chips */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* Broken-code review: readiness + primary CoFix action. Hoisted from the
            old "Broken Code" pane header so EVERY control lives in this one row. */}
        <ReadinessChip
          blocking={blocking}
          degrading={degrading}
          onDismiss={dismiss}
          actions={{ problem: [{ label: 'Snap', primary: true, onClick: () => handleSnap() }] }}
        />
        <button
          onClick={() => handleFix()}
          disabled={inputCode.trim().length < 5 || isLoading}
          className="h-6 px-3 rounded text-[12px] font-bold uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90 shrink-0"
          style={
            degrading.length > 0
              ? { background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning-text)' }
              : { background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }
          }
        >
          {isLoading ? 'Analyzing…' : degrading.length > 0 ? 'CoFix ▲' : 'CoFix'}
        </button>

        {/* Flexible spacer — pushes the fixed-code actions to the right edge. */}
        <div className="flex-1 min-w-0" />

        {/* Fixed-code actions — only once a fix exists. Hoisted from the old
            "Fixed Code" pane header so the top stays a single row. */}
        {fixedCode && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setInputCode(fixedCode); handleFix(fixedCode); }}
              disabled={isLoading}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }}
              data-tip="Run CoFix again on this fixed code"
              aria-label="CoFix again"
            >
              {isLoading
                ? <span className="w-2.5 h-2.5 border-2 border-[#0a0e1a]/40 border-t-[#0a0e1a] rounded-full animate-spin" />
                : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1L2.5 6.5H5.5L5 11L9.5 5.5H6.5L7 1Z" fill="currentColor"/></svg>}
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              data-tip="Run"
              aria-label="Run"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a' }}
            >
              {isRunning
                ? <span className="w-2.5 h-2.5 border-2 border-[#0a0e1a]/40 border-t-[#0a0e1a] rounded-full animate-spin" />
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button
              onClick={handleCopy}
              disabled={!fixedCode || copyFeedback !== 'idle'}
              data-tip={copyFeedback === 'copied' ? 'Copied' : copyFeedback === 'failed' ? 'Copy failed' : 'Copy fixed code'}
              aria-label="Copy"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-all disabled:cursor-not-allowed"
              style={copyFeedback === 'copied' ? {
                background: 'linear-gradient(135deg, rgba(43,181,52,0.2) 0%, rgba(43,181,52,0.1) 100%)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
              } : copyFeedback === 'failed' ? {
                background: 'linear-gradient(135deg, rgba(219,0,0,0.2) 0%, rgba(219,0,0,0.1) 100%)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
              } : {
                background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, var(--bg-elevated) 100%)',
                border: '1px solid var(--cam-gold-leaf)',
                color: 'var(--cam-gold-leaf)',
              }}
            >
              {copyFeedback === 'copied'
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : copyFeedback === 'failed'
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
            </button>
            <button
              onClick={() => setShowRefinePopup(v => !v)}
              disabled={isLoading}
              data-tip="Refine fixed code"
              aria-label="Refine"
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-90 disabled:opacity-40"
              style={showRefinePopup ? {
                background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)',
                color: '#0a0e1a',
              } : {
                background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, var(--bg-elevated) 100%)',
                border: '1px solid var(--cam-gold-leaf-dk)',
                color: 'var(--cam-gold-leaf-dk)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.2 6.3L21 11l-5.8 1.7L13 19l-2.2-6.3L5 11l5.8-1.7L13 3z"/></svg>
            </button>
            <button
              onClick={handleSendToCoding}
              data-tip="Send to Coding"
              aria-label="Send to Coding"
              className="flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, var(--bg-elevated) 100%)',
                border: '1px solid var(--cam-gold-leaf-dk)',
                color: 'var(--cam-gold-leaf-dk)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Split pane ── */}
      {/* On narrow screens the 3-pane min-width (220+220+160) would push the
          whole page sideways; contain it to a local horizontal scroll instead.
          Desktop (md+) is unchanged: min-w-0 + overflow visible. */}
      {/* Main area: LEFT column (Broken|Fixed on top, analysis panel below) +
          full-height Walkthrough on the right. Splitting this way keeps the tall
          Walkthrough content filling its column and lets the analysis panel use
          the empty space under the short code editors — no vacant space. */}
      {/* pt-2 gives breathing room between the toolbar chips and the code
          editors (the old pane headers used to provide this separation). */}
      <div className="flex-1 min-h-0 pt-2">
      <Allotment defaultSizes={[66, 34]}>

      {/* ── LEFT COLUMN ── */}
      {/* overflow-y-auto: when the (uncapped) code area + analysis panel are taller
          than the column, the whole column scrolls — so the fixed code block
          auto-expands to its full height instead of scrolling inside itself. */}
      <Allotment.Pane minSize={360}>
      <div className="flex flex-col h-full overflow-y-auto">
      <div
        ref={codeAreaRef}
        className={showPanel ? 'shrink-0 overflow-x-auto md:overflow-x-visible' : 'flex-1 min-h-0 overflow-x-auto md:overflow-x-visible'}
        style={showPanel ? { height: effectiveCodeH } : undefined}
      >
      <div className="h-full min-w-[440px] md:min-w-0">
      <Allotment defaultSizes={[50, 50]}>

        {/* LEFT — broken code input */}
        <Allotment.Pane minSize={220}>
        <div className="flex flex-col h-full border-r border-[var(--border)]">
          {lineCount > 500 && (
            <div className="px-4 py-1.5 border-b text-[12px]" style={{ background: 'color-mix(in oklab, var(--warning) 10%, transparent)', borderColor: 'color-mix(in oklab, var(--warning) 20%, transparent)', color: 'var(--warning-text)' }}>
              Large paste — CoFix works best on focused snippets.
            </div>
          )}

          {/* Input editor FILLS its pane with its OWN internal scroll. An
              editable editor must own its scrolling so the caret and
              click-to-place land on the correct line — auto-height gives up
              Monaco's scrollbar and lets an ancestor scroll instead, which
              desyncs the cursor coordinates while typing. The empty area below
              the last line is the editing canvas, not vacant space. */}
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
          {/* Quick-refine chip strip — always visible when fixed code exists */}
          {fixedCode && (
            <div className="flex items-center gap-2.5 px-3 shrink-0 overflow-x-auto no-scrollbar" style={{ height: 40, borderTop: '2px solid var(--cam-gold-leaf)', borderBottom: '1px solid var(--cam-gold-leaf-dk)', background: 'var(--cam-hero-strip)' }}>
              {/* "FIXED CODE" identity marker — makes the corrected solution
                  instantly pickable at a glance during a live interview, and
                  clearly separates it from the refine chips that follow. */}
              <span className="shrink-0 flex items-center gap-1.5 pr-2.5 mr-0.5 border-r border-[color-mix(in_oklab,var(--cam-gold-leaf)_35%,transparent)] text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-gold-leaf)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Fixed Code
              </span>
              {[
                { label: 'Add print steps',    prompt: 'Add print() statements before and after each key step to show intermediate values',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 9 12 4 17"/><line x1="12" y1="17" x2="20" y2="17"/></svg> },
                { label: 'Add type hints',     prompt: 'Add type hints to all function parameters and return types',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 12.4 5.2A2 2 0 0 0 11 4.6H5a1 1 0 0 0-1 1v6a2 2 0 0 0 .6 1.4l8.2 8.2a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/></svg> },
                { label: 'Add docstrings',     prompt: 'Add a concise docstring to every function',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg> },
                { label: 'Add error handling', prompt: 'Wrap the main logic in try/except and print a clear error message on failure',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                { label: 'Add comments',       prompt: 'Add a short inline comment on every non-obvious line',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              ].map(({ label, prompt, icon }) => (
                <button
                  key={label}
                  onClick={() => handleRefine(prompt)}
                  disabled={isLoading}
                  data-tip={label}
                  aria-label={label}
                  className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)', border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf)' }}
                >
                  {icon}
                </button>
              ))}
              {/* Spacer + prominent Copy — grabbing the solution is the #1 action,
                  so it sits pinned at the band's right edge, always in reach. */}
              <div className="flex-1 min-w-[8px]" />
              <button
                onClick={handleCopy}
                disabled={copyFeedback !== 'idle'}
                data-tip={copyFeedback === 'copied' ? 'Copied!' : copyFeedback === 'failed' ? 'Copy failed' : 'Copy fixed code'}
                className="shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-bold uppercase tracking-[0.1em] transition-all disabled:cursor-default"
                style={copyFeedback === 'copied' ? {
                  background: 'linear-gradient(135deg, rgba(43,181,52,0.25) 0%, rgba(43,181,52,0.12) 100%)', border: '1px solid var(--success)', color: 'var(--success)',
                } : copyFeedback === 'failed' ? {
                  background: 'linear-gradient(135deg, rgba(219,0,0,0.2) 0%, rgba(219,0,0,0.1) 100%)', border: '1px solid var(--danger)', color: 'var(--danger)',
                } : {
                  background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)', color: '#0a0e1a',
                }}
              >
                {copyFeedback === 'copied'
                  ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
                  : copyFeedback === 'failed'
                  ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Failed</>
                  : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>}
              </button>
            </div>
          )}

          <div className="flex shrink-0">
            {/* Monaco editor — read-only with line decorations. The pane bg is a
                distinct surface so the empty space below the auto-fit editor
                reads as empty pane, never as a giant editor. */}
            <div className="flex-1 min-w-0 relative overflow-y-auto pt-2" style={{ background: 'var(--bg-surface)' }}>
              {/* Streaming log popup */}
              {showLogPopup && (
                <div className="absolute top-3 right-3 z-20 w-72 flex flex-col rounded-lg overflow-hidden shadow-2xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--cam-gold-leaf)' }}>
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isLoading ? 'var(--cam-gold-leaf)' : 'var(--accent-text)', boxShadow: isLoading ? '0 0 6px var(--cam-gold-leaf)' : '0 0 6px var(--accent-text)' }} />
                    <span className="flex-1 text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>CoFix Log</span>
                    {!isLoading && (
                      <button onClick={() => setShowLogPopup(false)} className="text-[12px] opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--cam-gold-leaf-dk)' }}>✕</button>
                    )}
                  </div>
                  {/* Log body */}
                  <div ref={logScrollRef} className="flex flex-col gap-0.5 px-3 py-2 max-h-48 overflow-y-auto">
                    {/* An empty log box looks identical to a hang — never render one. */}
                    {logLines.length === 0 && (
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Waiting for the capture…
                      </span>
                    )}
                    {logLines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[12px] shrink-0 tabular-nums" style={{ color: 'color-mix(in oklab, var(--accent) 45%, transparent)', fontFamily: 'var(--font-mono)' }}>{line.elapsed}</span>
                        <span className="shrink-0 flex items-center">{line.icon}</span>
                        <span className="text-[14px] leading-relaxed" style={{ color: line.status === 'error' ? 'var(--danger)' : line.status === 'success' ? 'var(--accent-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{line.msg}</span>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] tabular-nums" style={{ color: 'color-mix(in oklab, var(--accent) 45%, transparent)', fontFamily: 'var(--font-mono)' }}>…</span>
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
                      <span className="flex-1 text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>
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
                        className="w-full resize-none rounded-lg px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cam-gold-leaf)]"
                        style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)', color: 'var(--text-primary)' }}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={handleRefineSnap}
                          disabled={refineSnapping || isLoading}
                          data-tip="Screenshot an error, failing case, or extra context and add it to the refinement"
                          className="text-[12px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 12%, transparent) 0%, var(--bg-elevated) 100%)', border: '1px solid var(--cam-gold-leaf-dk)', color: 'var(--cam-gold-leaf-dk)' }}
                        >
                          {refineSnapping
                            ? <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cam-gold-leaf-dk)', borderTopColor: 'transparent' }} />
                            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>}
                          {refineSnapping ? 'Reading…' : 'Snap'}
                        </button>
                        <span className="text-[12px] opacity-40 mr-auto" style={{ color: 'var(--cam-gold-leaf)', fontFamily: 'var(--font-mono)' }}>⌘↵ to submit</span>
                        <button
                          onClick={() => setShowRefinePopup(false)}
                          className="text-[12px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                        >Cancel</button>
                        <button
                          onClick={() => handleRefine()}
                          disabled={!refinePrompt.trim() || isLoading}
                          className="text-[12px] font-bold uppercase tracking-[0.1em] px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <p className="text-[12px] text-[var(--danger)] text-center px-6">{error}</p>
                  <button
                    onClick={() => handleFix()}
                    className="text-[12px] px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[#0047AB] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="shrink-0" style={{ borderLeft: '3px solid var(--cam-gold-leaf)', borderBottom: '1px solid var(--cam-gold-leaf-dk)', boxShadow: 'inset 0 1px 0 color-mix(in oklab, var(--cam-gold-leaf) 22%, transparent)' }}>
              <Editor
                value={fixedCode}
                language={toMonacoLang(effectiveLang)}
                theme={monacoTheme}
                height={`${fixedEditorH}px`}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontLigatures: false,
                  letterSpacing: 0,
                  lineHeight: 19,
                  scrollBeyondLastLine: false,
                  glyphMargin: false,
                  folding: false,
                  // Sticky-scroll pins class/def headers at the viewport top;
                  // over the overlay's transparent editor bg they render ON TOP
                  // of the scrolled code (overlapping/ghosted lines). Off.
                  stickyScroll: { enabled: false },
                  wordWrap: 'on',
                  automaticLayout: true,
                  // Short code: hidden scrollbar, editor fits content, wheel
                  // bubbles to the column. Long code (capped): show Monaco's own
                  // scrollbar and let it own the wheel so the code scrolls.
                  scrollbar: {
                    vertical: fixedCapped ? 'auto' : 'hidden',
                    alwaysConsumeMouseWheel: fixedCapped,
                    verticalSliderSize: 8,
                  },
                }}
                onMount={editor => {
                  rightEditorRef.current = editor;
                  const sync = () => setFixedContentH((prev) => {
                    // Track the fixed code's content height; the cap + internal
                    // scroll are applied via fixedEditorH / fixedCapped above.
                    const h = Math.max(44, Math.ceil(editor.getContentHeight()));
                    return prev === h ? prev : h;
                  });
                  editor.onDidContentSizeChange(sync);
                  sync();
                }}
              />
              </div>
            </div>

          </div>

          {/* Complexity strip — Big-O plus a WHY for each (not just the answer). */}
          {complexity && (
            <div ref={complexityRef} className="flex flex-col gap-2 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
              <div className="flex items-center gap-4 text-[12px] flex-wrap">
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
              {(complexity.timeWhy || complexity.spaceWhy) && (
                <div className="flex flex-col gap-1.5">
                  {complexity.timeWhy && (
                    <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Why {complexity.time} time — </span>
                      {complexity.timeWhy}
                    </p>
                  )}
                  {complexity.spaceWhy && (
                    <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Why {complexity.space} space — </span>
                      {complexity.spaceWhy}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          </div>
        </div>
        </Allotment.Pane>

      </Allotment>
      </div>
      </div>

      {/* ── Analysis panel — sits UNDER Broken|Fixed, spanning their combined
          width (inside the left column). ── */}
      {/* Expanded → flex-1 so it fills ALL remaining column height below the code
          area (no dead space at the bottom); its tab body scrolls internally.
          Collapsed → a thin 34px restore bar. The code area above is shrink-0 at
          its measured height, so the panel simply takes whatever's left. */}
      {showPanel && (
        <div
          className={panelCollapsed ? 'shrink-0 flex flex-col' : 'flex-1 flex flex-col'}
          style={{ height: panelCollapsed ? 34 : undefined, minHeight: panelCollapsed ? undefined : '38vh', borderTop: '1px solid var(--cam-gold-leaf)', background: 'var(--bg-surface)' }}
        >

          {panelCollapsed ? (
            /* Collapsed → thin restore bar. Clicking anywhere reopens the drawer. */
            <button
              onClick={() => setPanelCollapsed(false)}
              className="h-full w-full flex items-center gap-3 px-4 text-left transition-opacity hover:opacity-80"
              style={{ background: 'var(--cam-hero-strip)' }}
              data-tip="Expand analysis"
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-gold-leaf-dk)' }}>
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
            data-tip="Drag to resize"
          />

          {/* Single tabbed body — Problem · Learn · Tests · Output, one visible at a time */}
          <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center shrink-0" style={{ height: 34, background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
            {(['problem', 'learn', 'tests', 'output'] as const).map(tab => (
              <button key={tab} onClick={() => setPanelTab(tab)}
                className="h-full px-4 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors"
                style={{ color: panelTab === tab ? 'var(--cam-gold-leaf)' : 'var(--cam-gold-leaf-dk)', borderBottom: panelTab === tab ? '2px solid var(--cam-gold-leaf)' : '2px solid transparent', background: 'none' }}>
                {tab === 'problem' ? 'Problem' : tab === 'learn' ? 'Learn' : tab === 'tests' ? 'Tests' : 'Output'}
              </button>
            ))}
            <div className="flex-1" />
            {analysisLoading && (
              <span className="flex items-center gap-1.5 text-[12px] px-3" style={{ color: 'var(--cam-gold-leaf-dk)' }}>
                <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf-dk)', borderTopColor: 'transparent' }} />
                Analyzing…
              </span>
            )}
            <button onClick={() => setPanelCollapsed(true)} data-tip="Minimize" className="px-3 text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>▾</button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">

            {/* ── Problem tab ── */}
            {panelTab === 'problem' && (
              <div className="h-full overflow-y-auto px-4 py-3">
                {/* Loading */}
                {!analysis && analysisLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Generating problem statement…
                    </span>
                  </div>
                )}
                {/* Error */}
                {!analysis && !analysisLoading && analysisError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Could not generate analysis</span>
                    <button onClick={retryAnalyze} disabled={!fixedCode}
                      className="text-[12px] font-bold px-4 py-1.5 rounded-lg transition-opacity disabled:opacity-40 hover:opacity-80"
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

                {analysis && (
                  <div className="h-full overflow-y-auto">
                    <AnswerBook doc={docFromCoFix({ changes, walkthrough }, analysis, 'problem')} />
                  </div>
                )}
              </div>
            )}

            {/* ── Learn tab ── */}
            {panelTab === 'learn' && (
              <div className="h-full overflow-y-auto px-4 py-3">
                {/* Loading */}
                {!analysis && analysisLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Building step-by-step walkthrough…
                    </span>
                  </div>
                )}
                {/* Error */}
                {!analysis && !analysisLoading && analysisError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Could not generate analysis</span>
                    <button onClick={retryAnalyze} disabled={!fixedCode}
                      className="text-[12px] font-bold px-4 py-1.5 rounded-lg transition-opacity disabled:opacity-40 hover:opacity-80"
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

                {analysis && (
                  <div className="h-full overflow-y-auto">
                    <AnswerBook doc={docFromCoFix({ changes, walkthrough }, analysis, 'learn')} />
                  </div>
                )}
              </div>
            )}

            {/* ── Tests tab ── */}
            {panelTab === 'tests' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center shrink-0 gap-2 px-3" style={{ height: 34, background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-gold-leaf)' }}>
                    Tests
                    <span className="ml-1.5 normal-case font-normal text-[12px] opacity-60">
                      {customTests.filter(t => String(t.input ?? '').trim()).length} case{customTests.filter(t => String(t.input ?? '').trim()).length !== 1 ? 's' : ''}
                      {analysisLoading && ' · generating…'}
                    </span>
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={runAllCustomTests}
                    disabled={!fixedCode || customTests.every(t => !String(t.input ?? '').trim())}
                    className="text-[12px] font-bold px-2 py-0.5 rounded transition-opacity disabled:opacity-40 hover:opacity-80"
                    style={{ border: '1px solid var(--cam-gold-leaf)', color: 'var(--cam-gold-leaf)', background: 'transparent' }}
                  >▶ All</button>
                  <button
                    onClick={() => setCustomTests(prev => [...prev, mkTest()])}
                    className="text-[12px] font-bold px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                    style={{ border: '1px solid var(--cam-gold-leaf-dk)', color: 'var(--cam-gold-leaf-dk)', background: 'transparent' }}
                  >+ Add</button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                  {!fixedCode && (
                    <p className="text-[12px] text-center pt-4" style={{ color: 'var(--text-muted)' }}>Run CoFix first</p>
                  )}
                  {customTests.map(tc => {
                    const hasPassed = tc.result !== null && !tc.isErr && (!tc.expected || tc.result.trim() === tc.expected.trim());
                    const hasFailed = tc.result !== null && !tc.isErr && tc.expected && tc.result.trim() !== tc.expected.trim();
                    const borderColor = tc.isErr ? 'rgba(219,0,0,0.35)' : hasPassed ? 'rgba(43,181,52,0.35)' : hasFailed ? 'rgba(251,191,36,0.35)' : 'var(--border)';
                    return (
                      <div key={tc.id} className="rounded-lg overflow-hidden flex flex-col" style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-elevated)' }}>
                        <div className="flex items-start gap-2 px-2.5 pt-2 pb-1">
                          <span className="text-[12px] font-bold uppercase tracking-wider mt-2 w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>In</span>
                          <textarea
                            value={tc.input}
                            onChange={e => setCustomTests(prev => prev.map(t => t.id === tc.id ? { ...t, input: e.target.value, result: null } : t))}
                            placeholder="print(my_function(arg1, arg2))"
                            rows={2}
                            className="flex-1 resize-none bg-transparent focus:outline-none placeholder:opacity-30"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}
                          />
                          <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                            <button
                              onClick={() => runCustomTest(tc.id)}
                              disabled={tc.running || !fixedCode || !String(tc.input ?? '').trim()}
                              className="flex items-center justify-center text-[12px] font-bold w-7 h-6 rounded transition-opacity disabled:opacity-40"
                              style={{ background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)', color: '#0a0e1a' }}
                            >
                              {tc.running ? <span className="w-2 h-2 border border-[#0a0e1a]/30 border-t-[#0a0e1a] rounded-full animate-spin" /> : '▶'}
                            </button>
                            <button
                              onClick={() => setCustomTests(prev => prev.length > 1 ? prev.filter(t => t.id !== tc.id) : [mkTest()])}
                              className="flex items-center justify-center w-7 h-6 rounded transition-opacity hover:opacity-70 text-[12px]"
                              style={{ color: 'var(--text-muted)', background: 'transparent' }}
                            >✕</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 pb-1.5">
                          <span className="text-[12px] font-bold uppercase tracking-wider w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>Exp</span>
                          <input
                            value={tc.expected}
                            onChange={e => setCustomTests(prev => prev.map(t => t.id === tc.id ? { ...t, expected: e.target.value } : t))}
                            placeholder="expected (optional)"
                            className="flex-1 bg-transparent focus:outline-none placeholder:opacity-25"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--cam-gold-leaf-dk)' }}
                          />
                        </div>
                        {tc.result !== null && (
                          <div className="px-2.5 pb-2 pt-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: tc.isErr ? 'var(--danger)' : hasFailed ? 'var(--warning-text)' : 'var(--accent-text)' }}>
                                {tc.isErr ? '✕ Error' : hasFailed ? '≠ Mismatch' : '✓ Output'}
                              </span>
                              {tc.expected && !tc.isErr && (
                                <span className="text-[12px] font-bold px-1.5 py-0.5 rounded" style={{ color: hasPassed ? 'var(--accent-text)' : 'var(--warning-text)', background: hasPassed ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'color-mix(in oklab, var(--warning) 12%, transparent)' }}>
                                  {hasPassed ? 'PASS' : 'FAIL'}
                                </span>
                              )}
                            </div>
                            <pre className="text-[12px] whitespace-pre-wrap m-0" style={{ color: tc.isErr ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}
                              dangerouslySetInnerHTML={{ __html: ansiHtml(tc.result ?? '') }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Output tab ── */}
            {panelTab === 'output' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center shrink-0 px-4 gap-2" style={{ height: 34, background: 'var(--cam-hero-strip)', borderBottom: '1px solid color-mix(in oklab,var(--cam-gold-leaf) 30%,transparent)' }}>
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em] flex-1"
                    style={{ color: isErr ? 'var(--danger)' : runOutputLog.length > 0 ? 'var(--accent-text)' : 'var(--cam-gold-leaf-dk)' }}>
                    {isErr ? '✕ Runtime Error' : runOutputLog.length > 0 ? '✓ Output' : 'Output'}
                  </span>
                  {isRunning && (
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                  )}
                  {runOutputLog.length > 0 && !isRunning && (
                    <button
                      onClick={() => setRunOutputLog([])}
                      className="text-[12px] font-semibold shrink-0 opacity-50 hover:opacity-90 transition-opacity"
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
                              <span className="text-[12px] tabular-nums shrink-0" style={{ color: 'color-mix(in oklab, var(--text-muted) 60%, transparent)', fontFamily: 'var(--font-mono)' }}>
                                {entry.ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                              </span>
                              <div className="flex-1 h-px" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }} />
                            </div>
                            <pre
                              className="px-4 pb-3 whitespace-pre-wrap"
                              style={{ color: entryIsErr ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65, letterSpacing: '-0.02em' }}
                              dangerouslySetInnerHTML={{ __html: ansiHtml(entry.text) }}
                            />
                          </div>
                        );
                      })}
                      {isRunning && (
                        <div className="flex items-center gap-2 px-4 py-2">
                          <span className="w-2 h-2 rounded-full border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                          <span className="text-[12px] italic" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Executing…</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
          </div>
          </>
          )}
        </div>
      )}
      </div>
      </Allotment.Pane>

      {/* ── RIGHT — full-height Walkthrough / changes. Extends the whole page
          height; hidden until CoFix produces content so the left column gets the
          full width pre-run (no empty bordered box). ── */}
      <Allotment.Pane minSize={220} visible={changes.length > 0 || walkthrough.length > 0}>
        <AnnotationPanel changes={changes} walkthrough={walkthrough} />
      </Allotment.Pane>

      </Allotment>
      </div>

      {/* ── Footer bar — capture / audio controls ──
          Snap, screenshot thumbnails, and the audio-capture chips live here
          (moved out of the top toolbar) so they sit anchored at the bottom. */}
      {(onSnapped || onTranscription) && (
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar" style={{ background: 'var(--cam-hero-strip)', borderTop: '1px solid var(--cam-gold-leaf)' }}>
          {/* SNAP */}
          {onSnapped && (
            <button
              onClick={handleSnap}
              disabled={snapState === 'capturing'}
              data-tip={snapState === 'error' ? (snapError || 'Snap failed') : 'Snap an area — drag to select, Space to click a window, Esc to cancel'}
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
            </button>
          )}

          {/* Task-mode chips — what the snap was read as, and a one-click
              correction when the classifier gets it wrong. Re-runs on click. */}
          {taskMode && (
            <div className="flex items-center gap-0.5 px-0.5 py-0.5 shrink-0" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 999 }}>
              {TASK_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setTaskMode(m.id); handleFix(undefined, { mode: m.id }); }}
                  disabled={isLoading}
                  data-tip={m.tip}
                  className="px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.1em] font-mono transition-colors"
                  style={taskMode === m.id
                    ? { background: 'var(--cam-accent-fill)', color: 'var(--cam-accent-fill-text)', borderRadius: 999 }
                    : { color: 'var(--text-muted)', borderRadius: 999 }
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Interviewer-question chips — the other half of an interview. These
              appear once there is code to ask ABOUT, because every one of them
              is a question about something already on screen. Visually separated
              from the task-mode group above: those say what the screen holds,
              these say what was just asked, and conflating them is what sent
              "why a hash map?" down the solve path. */}
          {inputCode.trim().length >= 5 && (
            <div className="flex items-center gap-0.5 px-0.5 py-0.5 shrink-0" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: 999 }}>
              <span className="px-1.5 text-[12px] font-bold uppercase tracking-[0.12em] font-mono select-none" style={{ color: 'var(--text-dimmed)' }}>Asked</span>
              {ASK_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setTaskMode(m.id); handleFix(undefined, { mode: m.id }); }}
                  disabled={isLoading}
                  data-tip={m.tip}
                  className="px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.1em] font-mono transition-colors whitespace-nowrap"
                  style={taskMode === m.id
                    ? { background: 'var(--cam-accent-fill)', color: 'var(--cam-accent-fill-text)', borderRadius: 999 }
                    : { color: 'var(--text-muted)', borderRadius: 999 }
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Pending snap thumbnails */}
          {pendingSnapIds.map(pid => (
            <div key={pid} className="w-10 h-7 rounded shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'color-mix(in oklab, var(--text-primary) 25%, transparent)', borderTopColor: 'var(--text-primary)' }} />
            </div>
          ))}

          {/* Completed thumbnails */}
          {screenshots.map((s, i) => (
            <div key={s.id} className="relative group shrink-0" data-tip={s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
              {/* Text-only captures carry no image — label the chip instead of
                  rendering an empty <img src="">. */}
              {s.dataUrl ? (
                <img src={s.dataUrl} alt={`Screenshot ${i + 1}`} className="h-7 w-10 object-cover rounded" style={{ border: '1px solid var(--border-hover)' }} />
              ) : (
                <div className="h-7 w-10 rounded flex items-center justify-center text-[12px] font-bold uppercase tracking-[0.08em] font-mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)' }}>TEXT</div>
              )}
              <span className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: 'var(--cam-accent-fill)', color: 'var(--cam-accent-fill-text)' }}>{i + 1}</span>
              {onRemove && (
                <button onClick={() => onRemove(s.id)} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex" style={{ background: 'var(--danger)', color: '#ffffff' }} data-tip="Remove">
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
        </div>
      )}
    </div>
  );
}
