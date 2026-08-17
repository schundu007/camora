import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme as useGlobalTheme } from '@/hooks/useTheme';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import { LANGUAGES, getLanguageById } from '@/data/languages';
import { dialogAlert } from '@/components/shared/Dialog';
import { snapRegion, canRegionSnap } from '@/lib/lumora/snapCapture';
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT, getActiveCompanyKey } from '@/lib/companyContext';
import { ProblemCaptureStrip } from '@/components/lumora/shared/ProblemCaptureStrip';
import { CustomInputPanel } from '@/components/shared/CustomInputPanel';
import { codingChecks } from '@/components/lumora/shared/readiness';
import { useToolReadiness } from '@/components/lumora/shared/useToolReadiness';
import { ReadinessChip } from '@/components/lumora/shared/ReadinessChip';
import { ChipSelect } from '@/components/lumora/shared/ChipSelect';
import { isProblemPageUrl } from '@/lib/problemPageUrl';
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromSolution, docFromBlocks } from '@/lib/lumora/book-model';
import { shouldDivertToCofix } from '@/lib/lumora/task-modes';
import { parseProblemExamples, buildTestCases, detectSolutionFn, mergeTestCases } from '@/lib/lumora/example-extract';
import type { ScreenMode, TaskMode } from '@/lib/lumora/task-modes';
import { getActiveProblemUrl, waitForBridge } from '@/lib/lumora/activeUrlBridge';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

// Hard cap on multi-page SNAP captures — a backstop so the page count can never
// run away even if a capture source keeps delivering new (non-duplicate) frames.
const MAX_SNAP_PAGES = 12;

// Returns true when the pasted text is itself a code template with placeholder
// bodies (return [], pass, NotImplementedError, TODO). Used to auto-promote
// problemText → starterCode so the backend completes-in-place rather than
// generating a standalone function that loses the surrounding boilerplate.
function isCodeTemplate(text: string): boolean {
  // HackerRank / CoderPad "bare-script" templates: an `if __name__ == '__main__':`
  // harness (or a top-level block with several stdin reads) that has NO function to
  // fill and NO stub marker — the candidate simply appends the solution after the
  // provided input-reading lines (e.g. HackerRank "Finding the Percentage", whose
  // starter ends at `query_name = input()`). This is pure platform boilerplate that
  // must be preserved verbatim, so promote it to starterCode even though there is no
  // def/class. Checked BEFORE hasStructure, which these templates deliberately lack.
  const mainGuard = /^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(text);
  const stdinReads = (text.match(/\binput\s*\(|\bsys\.stdin\b|\.nextInt\s*\(|\bcin\s*>>|\breadline\s*\(/g) || []).length;
  if (mainGuard || stdinReads >= 2) return true;

  const hasStructure = /\bdef\s+\w+\s*\(|\bclass\s+\w+[:(]|void\s+\w+\s*\(|public\s+\w+\s+\w+\s*\(|function\s+\w+\s*\(|^\s*\w+\s*\(\)\s*\{/m.test(text);
  if (!hasStructure) return false;
  if (/\breturn\s+\[\]\s*$|\breturn\s+\{\}\s*$|\bpass\s*$|raise\s+NotImplementedError|\/\/\s*TODO|\bTODO\b|\/\*\s*TODO/m.test(text)) return true;
  // HackerRank / CoderPad style stub markers — the platform's real placeholder
  // comments and "Complete the <fn> function below" banners. Recognizing these
  // promotes the paste to starterCode so the backend completes-in-place and
  // preserves the stdin harness instead of writing a bare from-scratch function.
  return /(?:#|\/\/)\s*write your code here|(?:#|\/\/)\s*your code goes here|complete the\b[^\n]*\b(?:function|method)\b[^\n]*below/i.test(text);
}

function detectLanguage(text: string): string {
  const t = text.toLowerCase();
  if (/^\s*FROM\s+\S+/m.test(text) || /^\s*(RUN|COPY|ENV|EXPOSE|CMD|ENTRYPOINT|ARG|LABEL)\s+/m.test(text)) return 'docker';
  if (/def\s+\w+\s*\(|class\s+\w+:|import\s+\w+|print\s*\(|\.py\b/.test(text)) return 'python';
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>\s*{/.test(text)) return 'javascript';
  if (/public\s+class\s+\w+|public\s+static\s+void\s+main|System\.out\.print/.test(text)) return 'java';
  if (/#include\s*<|int\s+main\s*\(/.test(text)) return /vector<|cout\s*<</.test(text) ? 'cpp' : 'c';
  if (/func\s+\w+\s*\(.*\)\s*(->|\{)|package\s+main/.test(text)) return 'go';
  if (/pub\s+fn\s+\w+|let\s+mut\s+\w+/.test(text)) return 'rust';
  if (/#!/.test(text) && /bash|sh\b/.test(t)) return 'bash';
  if (/SELECT\s|INSERT\s|UPDATE\s|CREATE\s+TABLE/i.test(text)) return 'sql';
  if (/\bpython\b/.test(t)) return 'python';
  if (/\bbash\b|\bshell\b/.test(t)) return 'bash';
  if (/\bjava\b/.test(t) && !/javascript/.test(t)) return 'java';
  if (/\bjavascript\b|\bjs\b/.test(t)) return 'javascript';
  if (/\btypescript\b|\bts\b/.test(t)) return 'typescript';
  if (/\bc\+\+\b|\bcpp\b/.test(t)) return 'cpp';
  return 'python';
}

/**
 * Detect language from a problem description (rather than code).
 * Only returns non-null when there is an unambiguous, explicit signal —
 * avoids false positives from common English words like "go" or "c".
 */
function detectLangFromDescription(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bpython\s*3?\b/.test(t)) return 'python';
  if (/\btypescript\b/.test(t)) return 'typescript';
  if (/\bjavascript\b/.test(t)) return 'javascript';
  if (/\bjava\b/.test(t) && !/javascript/.test(t)) return 'java';
  if (/\bc\+\+\b|\bcpp\b/.test(t)) return 'cpp';
  if (/\bgolang\b/.test(t)) return 'go';
  if (/\brust\b/.test(t)) return 'rust';
  if (/\bsql\b/.test(t)) return 'sql';
  return null;
}

type ProblemTab = 'description' | 'solution';
type OutputTab = 'testcases' | 'output';
type InputMode = 'paste' | 'url' | 'image';

// Analysis views, as icons. These were four uppercase text chips spanning the
// full panel width; the label now lives in the tooltip, where it costs nothing
// until asked for. Module scope so the JSX isn't rebuilt on every render.
/**
 * The rendered scale, printed next to the build id.
 *
 * "The desktop app's fonts are bigger than the browser's" is not answerable
 * from a screenshot — px are px, and the multiplier sits below the page in the
 * OS display scaling and the shell's zoom factor. devicePixelRatio is the
 * product of both, so reading this same line in the browser and in the desktop
 * app on the SAME machine says which of the two is off, instead of guessing.
 *
 * Zoom changes fire a resize, which is what keeps this honest after Ctrl +/-.
 */
const RenderScale = () => {
  const [dpr, setDpr] = useState(() => (typeof window === 'undefined' ? 1 : window.devicePixelRatio));
  useEffect(() => {
    const onResize = () => setDpr(window.devicePixelRatio);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return <span data-tip="Rendered scale — OS display scaling x app zoom. Compare this number in your browser and in the desktop app: if they differ, that is the size difference. Ctrl and minus zooms the desktop app out, and it is remembered.">scale {dpr.toFixed(2)}x</span>;
};

const ANALYSIS_VIEWS = [
  {
    id: 'code' as const,
    label: 'Code',
    tip: 'The solution',
    icon: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  },
  {
    id: 'explain' as const,
    label: 'Explain',
    tip: 'Explain — what you say when asked to walk through it',
    icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  },
  {
    id: 'issues' as const,
    label: 'Issues',
    tip: 'Issues — what an interviewer would stop you on',
    icon: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  },
  {
    id: 'deepdive' as const,
    label: 'Deep Dive',
    tip: 'Deep Dive — the follow-ups most likely to come next',
    icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  },
];

const MAX_TEST_CASES = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTestCases(content: string): Array<{ input: string; expected: string }> {
  const testCases: Array<{ input: string; expected: string }> = [];
  const lines = content.split('\n').filter(l => l.trim());

  for (const line of lines) {
    if (testCases.length >= MAX_TEST_CASES) break;
    const cleaned = line.replace(/^[-*•]\s*/, '').trim();
    if (!cleaned || cleaned.startsWith('(') || cleaned.toLowerCase().startsWith('must')) continue;

    const arrowMatch = cleaned.match(/^(.+?)\s*[-=]+>\s*(.+)$/);
    if (arrowMatch) {
      const input = arrowMatch[1].trim().replace(/^Input[:\s]*/i, '').trim();
      const expected = arrowMatch[2].trim().replace(/^(Output|Expected)[:\s]*/i, '').trim();
      if (input && expected) testCases.push({ input, expected });
    }
  }

  return testCases;
}


function getDefaultCode(lang: string): string {
  const found = getLanguageById(lang);
  if (found?.template) return found.template;
  // Fallback to python template
  const python = getLanguageById('python');
  return python?.template || `class Solution:\n    def solve(self, nums, target):\n        pass`;
}

/**
 * Extract the `code` field from a partial JSON stream so the user
 * sees code being typed live instead of staring at a skeleton spinner
 * for 25–30s. Walks the string after `"code"` past the opening quote
 * and decodes simple escape sequences. Returns null if the field
 * hasn't started streaming yet, or the (possibly partial) string.
 */
function extractStreamingCode(raw: string): string | null {
  if (!raw) return null;
  // Try first solution's code first; fall back to top-level code.
  const idx = raw.indexOf('"code"');
  if (idx < 0) return null;
  const colonIdx = raw.indexOf(':', idx + 6);
  if (colonIdx < 0) return null;
  const openQuote = raw.indexOf('"', colonIdx + 1);
  if (openQuote < 0) return null;
  let i = openQuote + 1;
  let result = '';
  while (i < raw.length) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else if (next === 'r') result += '\r';
      else if (next === '"') result += '"';
      else if (next === '\\') result += '\\';
      else if (next === '/') result += '/';
      else if (next === 'u' && i + 5 < raw.length) {
        const hex = raw.slice(i + 2, i + 6);
        const code = parseInt(hex, 16);
        if (!isNaN(code)) result += String.fromCharCode(code);
        i += 6;
        continue;
      } else result += next;
      i += 2;
    } else if (c === '"') {
      return result;
    } else {
      result += c;
      i++;
    }
  }
  return result; // partial — generation still in progress
}

/** Format seconds as MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  input: string;
  expected: string;
  output: string;
  passed: boolean;
  error?: string;
}

interface CodingLayoutProps {
  onSubmit: (problem: string, language: string, options?: { bypassCache?: boolean; starterCode?: string; task?: TaskMode }) => void;
  isLoading?: boolean;
  onBack: () => void;
  initialProblem?: string;
  /** Pre-fill the URL input and auto-fetch the problem on mount (e.g. from ?url= query param) */
  initialUrl?: string;
  initialStarterCode?: string | null;
  /** When true, hides internal header and uses flex-1 instead of h-screen (for embedding in LumoraShell) */
  embedded?: boolean;
  /** Called when user clicks "→ CoFix" chip; receives current editor code + language */
  onSendToCofix?: (code: string, lang: string, opts?: { mode?: TaskMode; hint?: string }) => void;
  /** Capture controls (Snap + input-mode icons) rendered inline in the
      Description/Solution toolbar row, so coding shows one toolbar instead of
      a separate strip above. Supplied by LumoraShell as an <ScreenshotStrip inline/>. */
  captureControls?: React.ReactNode;
  /** Ref that parent sets to receive voice transcriptions as problem input */
  onVoiceProblemRef?: React.MutableRefObject<((text: string) => void) | null>;
  /** DataURL from F9 auto-capture of HackerRank window. Processed via OCR. */
  pendingHackerrankCapture?: string | null;
  /** Called once the capture has been consumed so parent can clear it. */
  onHackerrankCaptureConsumed?: () => void;
  /** Full problem text extracted directly from the browser DOM (bypasses OCR). */
  pendingHackerrankText?: string | null;
  /** Called once the text has been consumed so parent can clear it. */
  onHackerrankTextConsumed?: () => void;
  /** Starter/template code extracted from the platform's code editor alongside the problem text.
   *  Passed to the backend so it preserves the exact input-reading boilerplate (readarray, Scanner, etc.). */
  pendingHackerrankStarterCode?: string | null;
  /** Called once the starter code has been consumed so parent can clear it. */
  onHackerrankStarterCodeConsumed?: () => void;
  /** Array of screenshot dataUrls from multi-page SNAP auto-scroll capture.
   *  Each image is OCR'd and the extracted texts are concatenated. */
  pendingHackerrankDataUrls?: string[] | null;
  /** Called once the multi-page capture has been consumed so parent can clear it. */
  onHackerrankDataUrlsConsumed?: () => void;
  /** Active coding platform from tool-picker ('hackerrank'|'leetcode'|'coderpad'|'none').
   *  When set (non-empty, non-'none'), hides manual input modes and shows autopilot status. */
  codingPlatform?: string;
  /** When embedded, caller supplies this to route voice through dispatchTranscript for Sona Q&A */
  onEmbeddedTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  /** When false, AudioCapture releases the mic immediately and ignores keyboard shortcuts.
   *  Used by LumoraShellPage so coding's mic doesn't conflict with behavioral's. */
  isTabActive?: boolean;
  /** Ref that parent sets to receive screenshot OCR text — appended to problem textarea. */
  onScreenshotAppendRef?: React.MutableRefObject<((text: string, starterCode?: string) => void) | null>;
  /** Preselect the language, e.g. when the caller also supplies a matching
   *  starter template — a Java template with a Python answer is a mismatch. */
  initialLanguage?: string;
  /** Called when user clicks New Problem — parent uses this to clear the screenshot strip. */
  onNewProblemCallback?: () => void;
  /** Input mode controlled from global strip in LumoraShellPage. When provided, internal
   *  auto-switches (URL detected, image pasted) are propagated back via onExternalInputModeChange. */
  externalInputMode?: 'paste' | 'url' | 'image';
  onExternalInputModeChange?: (mode: 'paste' | 'url' | 'image') => void;
}

// ── Main Component ───────────────────────────────────────────────────────────

// ── Theme tokens — return CSS-var references that auto-flip when the global
// [data-theme="dark"] attribute is set on <html>. The `dark` arg is kept for
// API stability but is no longer read — the underlying tokens in globals.css
// flip in lockstep with the user's chosen theme so a single token map works
// for both light and dark surfaces.
function useTheme(_dark: boolean) {
  return {
    cardBg: 'var(--bg-surface)', cardBorder: 'var(--border)',
    headerBg: 'var(--accent-subtle)', headerBorder: 'var(--border)',
    headerText: 'var(--cam-primary)', badgeBg: 'var(--accent-subtle)', badgeText: 'var(--cam-primary)',
    text: 'var(--text-primary)', textMuted: 'var(--text-muted)', textDim: 'var(--text-dimmed)',
    codeBg: 'var(--bg-elevated)', codeText: 'var(--text-primary)',
    inputBg: 'var(--bg-surface)', inputBorder: 'var(--border)', inputText: 'var(--text-primary)',
    sectionBg: 'var(--bg-elevated)', surfaceBg: 'var(--bg-surface)',
    tabActive: 'var(--cam-primary)', tabActiveBg: 'var(--bg-surface)', tabText: 'var(--text-muted)',
    dotColor: 'var(--cam-primary)',
    // Pass/fail status — success maps to navy in this design system, danger
    // stays red. Backgrounds use elevated surface so they're legible in both
    // light and dark modes; the semantic colored borders carry the meaning.
    passedBg: 'var(--accent-subtle)', passedBorder: 'var(--success)', passedText: 'var(--success)',
    failedBg: 'var(--bg-elevated)', failedBorder: 'var(--danger)', failedText: 'var(--danger)',
  };
}

// Normalized signature of a problem statement, used to dedupe AUTO solution
// generation. Whitespace-collapsed + lowercased so the SAME problem delivered
// twice (a source re-arming its pending prop, an idle timer re-firing, an
// identical re-capture) produces an identical key and never regenerates.
// Text, URL and image captures all funnel through this, so one source can't
// retrigger a solve for content another source already generated.
const genSignature = (t: string) => (t || '').replace(/\s+/g, ' ').trim().toLowerCase();

export function CodingLayout({ onSubmit, isLoading, onBack, initialProblem, initialUrl, initialStarterCode, initialLanguage, embedded, onVoiceProblemRef, pendingHackerrankCapture, onHackerrankCaptureConsumed, pendingHackerrankText, onHackerrankTextConsumed, pendingHackerrankStarterCode, onHackerrankStarterCodeConsumed, pendingHackerrankDataUrls, onHackerrankDataUrlsConsumed, codingPlatform, onEmbeddedTranscription, isTabActive, onScreenshotAppendRef, onNewProblemCallback, externalInputMode, onExternalInputModeChange, onSendToCofix, captureControls }: CodingLayoutProps) {
  const { token } = useAuth();
  const { theme: globalTheme } = useGlobalTheme();
  const t = useTheme(globalTheme === 'dark');

  // Core state
  const [language, setLanguage] = useState(initialLanguage || 'python');
  const [problemTab, setProblemTab] = useState<ProblemTab>('description');
  const [outputTab, setOutputTab] = useState<OutputTab>('testcases');
  const [inputMode, _setInputModeLocal] = useState<InputMode>(externalInputMode ?? 'paste');
  // Sync external (global strip pill click) → internal without triggering a loop
  useEffect(() => {
    if (externalInputMode !== undefined) _setInputModeLocal(externalInputMode);
  }, [externalInputMode]);
  const setInputMode = useCallback((mode: InputMode) => {
    _setInputModeLocal(mode);
    onExternalInputModeChange?.(mode);
  }, [onExternalInputModeChange]);
  const [problemText, setProblemText] = useState(initialProblem || '');
  const [problemUrl, setProblemUrl] = useState('');
  // Why auto-detect didn't fill the field. Null when it worked or hasn't run.
  const [urlDetectNote, setUrlDetectNote] = useState<string | null>(null);
  const [code, setCode] = useState(getDefaultCode('python'));
  const [output, setOutput] = useState('');
  const [outputLog, setOutputLog] = useState<Array<{ts: Date; text: string}>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customInputEnabled, setCustomInputEnabled] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [jsonSolution, setJsonSolution] = useState<any>(null);
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Thumbnails for IMAGE chip collection (upload + screenshot accumulation)
  const [snapImageUrls, setSnapImageUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [starterCode, setStarterCode] = useState<string | null>(initialStarterCode ?? null);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<Array<{ input: string; expected: string }>>([{ input: '', expected: '' }]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [fixError, setFixError] = useState('');

  // Silent auto-fix loop: after solution generation, auto-run fires. If tests
  // fail we silently call fix → re-run up to 3 times before surfacing the
  // manual Fix button. The user never sees intermediate failures.
  const autoGenRef = useRef<{ active: boolean; attempts: number }>({ active: false, attempts: 0 });
  const handleAutoFixRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);
  const handleRunRef = useRef<(() => Promise<void>) | null>(null);

  // Screen Recording permission status — checked once on mount (desktop only).
  // 'granted' | 'denied' | 'restricted' | 'not-determined' | null (non-desktop)
  const [screenPermStatus, setScreenPermStatus] = useState<string | null>(null);
  // Extracted code from the last image snap — drives quick-action chips.
  const [snapChipCode, setSnapChipCode] = useState<string | null>(null);
  // Analysis tabs — Explain / Issues / Deep Dive generated from the active solution code
  const [analysisTab, setAnalysisTab] = useState<'code' | 'explain' | 'issues' | 'deepdive'>('code');
  const [analysisCache, setAnalysisCache] = useState<Record<string, string>>({});
  const analysisCacheRef = useRef(analysisCache);
  useEffect(() => { analysisCacheRef.current = analysisCache; }, [analysisCache]);
  // In-flight analyses, keyed `${solutionIdx}_${tab}`. A single abort slot was
  // enough while these only ran on click; now that all three are prefetched,
  // several stream at once and each needs its own controller — and the key set
  // is what stops a click from firing a SECOND request for a cell that is
  // already streaming in from the prefetch.
  const analysisInFlightRef = useRef<Map<string, AbortController>>(new Map());
  const [analysisInFlight, setAnalysisInFlight] = useState<string[]>([]);
  const abortAllAnalysis = useCallback(() => {
    for (const c of analysisInFlightRef.current.values()) c.abort();
    analysisInFlightRef.current.clear();
    setAnalysisInFlight([]);
  }, []);

  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.getMediaAccessStatus || !codingPlatform || codingPlatform === 'none') return;
    let cancelled = false;
    const check = async () => {
      const status = await camo.getMediaAccessStatus('screen').catch(() => null);
      if (!cancelled) setScreenPermStatus(status);
    };
    check();
    const interval = setInterval(check, 10000); // re-check every 10s in case user grants mid-session
    return () => { cancelled = true; clearInterval(interval); };
  }, [codingPlatform]);
  const [activeSolutionIdx, setActiveSolutionIdx] = useState(0);

  // ── Line-binding: Code Walkthrough row → Monaco editor line (row → editor only) ──
  const editorRef = useRef<any>(null);
  const decoColRef = useRef<any>(null); // Monaco decorations collection
  // The editor owns its internal scroll; reveal lines with Monaco's own API.
  const editorColRef = useRef<HTMLDivElement>(null);
  const highlightLine = useCallback((line: number) => {
    const ed = editorRef.current;
    if (!ed || !line || line < 1) return;
    // Editor owns its internal scroll — reveal the line centered when it's
    // outside the current viewport (0 = smooth scroll).
    try { ed.revealLineInCenterIfOutsideViewport(line, 0); } catch { /* ignore */ }
    if (!decoColRef.current) decoColRef.current = ed.createDecorationsCollection([]);
    decoColRef.current.set([{
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: { isWholeLine: true, className: 'cam-line-highlight', linesDecorationsClassName: 'cam-line-highlight-gutter' },
    }]);
  }, []);
  const clearHighlight = useCallback(() => {
    decoColRef.current?.clear();
  }, []);
  // The approach card's inline explanations lack a `line` field. Resolve the editor
  // line by matching the row's code text against the current editor content; fall
  // back to 1-based row order when there's no exact match.
  const lineForCode = useCallback((exCode: string, fallbackIdx: number): number => {
    const target = (exCode || '').trim();
    if (!target) return fallbackIdx + 1;
    const idx = code.split('\n').findIndex(l => l.trim() === target);
    return idx >= 0 ? idx + 1 : fallbackIdx + 1;
  }, [code]);
  // Stale-decoration guard: a highlight from solution A must not linger after
  // switching solutions or regenerating.
  useEffect(() => { clearHighlight(); }, [activeSolutionIdx, jsonSolution, clearHighlight]);
  useEffect(() => () => { decoColRef.current?.clear(); }, []);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(0); // 0 = off
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Panel resize. Default 40% (was 25%) so the dense solution content —
  // approach, tradeoffs, the 3-column dry-run trace table, walkthrough —
  // isn't cramped; users can still drag it to 25–70%.
  const [leftPanelWidth, setLeftPanelWidth] = useState(40);
  // The split auto-fits to the code's longest line until the user drags it —
  // after that their choice sticks for the rest of the session.
  const splitRowRef = useRef<HTMLDivElement>(null);
  const userSizedSplitRef = useRef(false);
  // null = AUTO-FIT: the output panel grows to show its full content (no internal
  // top-to-bottom scroll) up to a 75vh cap. A manual drag sets a fixed px height.
  const [outputPanelHeight, setOutputPanelHeight] = useState<number | null>(null);
  const outputPanelRef = useRef<HTMLDivElement | null>(null);
  const [isResizingH, setIsResizingH] = useState(false);
  const [isResizingV, setIsResizingV] = useState(false);
  const vResizeRef = useRef<{ startY: number; startH: number } | null>(null);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true); // Start collapsed — expands when test cases arrive
  const [multiPageCapturing, setMultiPageCapturing] = useState(false);
  const [multiPageCount, setMultiPageCount] = useState(0);
  const multiPageCountRef = useRef(0);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const multiPageCapturingRef = useRef(false);
  const captureAutoGenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Accumulated screenshot dataUrls — filled synchronously on each snap,
  // processed all-at-once when the idle timer fires or Coding is clicked.
  const pendingSnapUrlsRef = useRef<string[]>([]);
  // True once the "looks cut off" nudge has fired for the current capture.
  // The next Coding click solves with whatever was captured — the heuristic is
  // a hint, never a wall the user can get stuck behind mid-interview.
  const cutoffPromptedRef = useRef(false);

  // Signature of the problem the solver last AUTO-generated for. Every
  // automatic path (URL scrape, DOM text, image OCR, voice, idle timer)
  // calls claimAutoGen() before wiping state + submitting; a duplicate is
  // skipped so the solution never regenerates on its own. Explicit user
  // actions (Generate / Regenerate buttons) bypass the guard and refresh
  // this signature so a trailing auto-fire can't immediately re-solve.
  const lastAutoGenSigRef = useRef<string>('');
  // Returns true (and records the signature) when `text` is a genuinely new
  // problem; false when it matches the last auto-generated one — caller skips.
  // Only touches stable refs, so it is safe to call from long-lived effects.
  const claimAutoGen = (text: string): boolean => {
    const sig = genSignature(text);
    if (!sig || sig === lastAutoGenSigRef.current) return false;
    lastAutoGenSigRef.current = sig;
    return true;
  };

  // Store
  const { streamText, parsedBlocks, isStreaming, clearStreamChunks, setParsedBlocks, error: streamError, setError: setStreamError, setLastFromCache } = useSessionStore();
  const lastFromCache = useSessionStore(s => s.lastFromCache);

  // Stable refs for language + problem text — used by resolveLanguage so
  // it always reads the latest value without being in any deps array.
  // Declared here (before handleRegenerate) to avoid TDZ: handleRegenerate
  // references resolveLanguage in its deps array which is evaluated
  // immediately when useCallback runs, so resolveLanguage must exist first.
  const languageRef = useRef(language);
  const problemTextRef = useRef(problemText);
  // Mirrored for the auto-detect probe, which runs from a window 'focus' listener
  // and would otherwise close over the URL as it was when the listener attached.
  const problemUrlRef = useRef(problemUrl);
  // Mirror starterCode into a ref so the auto-generate timer reads the LATEST
  // captured template (a snap sets starterCode, then the timer fires 8s later —
  // a plain closure would capture the stale null and drop the HackerRank harness).
  const starterCodeRef = useRef(starterCode);

  // Re-render when company context changes. LumoraShellPage lazy-mounts this
  // component once and hides it with display:none on tab switch — it never
  // remounts — so an empty dep array would pin `company` for the whole session
  // and the readiness chip would keep warning about a company the user has since set.
  const [assistantVersion, setAssistantVersion] = useState(0);
  useEffect(() => {
    const handler = () => setAssistantVersion(v => v + 1);
    window.addEventListener(ASSISTANT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_UPDATED_EVENT, handler);
  }, []);
  const activeAssistant = useMemo(() => getActiveAssistant(), [assistantVersion]);
  // A company can be SELECTED (Prep Kit activeCompany, shown in the sidebar)
  // before any JD/resume is uploaded — at which point the assistant is still
  // null. Fall back to the selected key so the readiness check matches the
  // sidebar rather than warning "no company" for a selected workspace.
  const activeCompany = useMemo(
    () => activeAssistant?.company ?? getActiveCompanyKey(),
    [activeAssistant, assistantVersion],
  );

  // The submitter promotes a pasted template to starter code (handleGenerateSolution).
  // The chip MUST read the same value, or it warns about a template the backend will
  // happily detect — the textarea's onChange nulls `starterCode` on every keystroke.
  const effectiveStarterCode = starterCode || (isCodeTemplate(problemText) ? problemText : null);

  const readinessChecks = codingChecks({
    problemText,
    starterCode: effectiveStarterCode,
    company: activeCompany,
    captureInFlight: multiPageCapturing,
  });
  const { blocking, degrading, dismiss } = useToolReadiness(readinessChecks);

  const resolveLanguage = useCallback((text?: string) => {
    const lang = languageRef.current;
    if (lang !== 'auto') return lang;
    return detectLanguage(text ?? problemTextRef.current);
  }, []);

  // Auto-detect language from problem description when a problem is loaded.
  // Only fires when problemText changes; only overrides if there is a clear
  // unambiguous signal so generic LeetCode prompts stay on the Python default.
  const lastAutoDetectedForRef = useRef('');
  useEffect(() => {
    const trimmed = problemText.trim();
    if (!trimmed || trimmed === lastAutoDetectedForRef.current) return;
    lastAutoDetectedForRef.current = trimmed;
    const detected = detectLangFromDescription(trimmed);
    if (detected) setLanguage(detected);
  }, [problemText]);

  // Analysis tabs — declared here (before the useEffect at ~line 666 that lists it
  // as a dependency) to prevent TDZ: Rolldown converts const to actual const, so the
  // deps-array reference must come AFTER the const is initialized.
  // `silent` is the prefetch path: generate into the cache without stealing the
  // tab the user is looking at.
  const runAnalysis = useCallback(async (tab: 'explain' | 'issues' | 'deepdive', opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const sd = jsonSolution;
    const solCode = sd?.solutions?.[activeSolutionIdx]?.code
      || sd?.solutions?.[0]?.code
      || sd?.code
      || code;
    if (!solCode?.trim() || !token) return;
    const cacheKey = `${activeSolutionIdx}_${tab}`;
    if (!silent) setAnalysisTab(tab);
    // Already generated, or already streaming in from the prefetch — showing it
    // is the whole job. Re-requesting would pay for the same answer twice and
    // restart the text under the user's eyes.
    if (analysisCacheRef.current[cacheKey] || analysisInFlightRef.current.has(cacheKey)) return;
    const abort = new AbortController();
    analysisInFlightRef.current.set(cacheKey, abort);
    setAnalysisInFlight(keys => [...keys, cacheKey]);
    const lang = resolveLanguage();
    // These three chips are read mid-interview, with 30–45 minutes on the clock
    // for the whole problem. An essay is worse than useless there — the user
    // can't skim it, can't say it, and loses the room while reading. Every
    // prompt below is budgeted in SPEAKING TIME, which constrains the model far
    // more reliably than "be concise", and asks for the candidate's own voice
    // so the text can be said out loud verbatim.
    const VOICE = `You are feeding a candidate lines during a live coding interview. They have 30-45 minutes for the whole problem and are reading this while the interviewer watches.

Rules:
- Write what the candidate SAYS, first person, plain spoken English. Not documentation.
- No headings, no preamble, no "This function...", no restating the code back.
- Short sentences. A sentence they can't say in one breath is too long.
- Cut anything the interviewer already knows from reading the code.`;
    const prompts: Record<string, string> = {
      // ~45 seconds of talking — the answer to "walk me through your solution".
      explain: `${VOICE}

The interviewer just said "walk me through your solution." Give the answer, out loud, in under 45 seconds of speech (about 100 words):
- One line on the core idea — the trick, not the restatement.
- 3-4 short beats of how it runs, in order.
- One line on time and space complexity, with the reason in half a sentence.

Nothing else. No numbered walkthrough of every line.

\`\`\`${lang}
${solCode}
\`\`\``,
      // Only what a real interviewer would stop them on. Ranked, one line each.
      issues: `${VOICE}

List only what THIS interviewer would actually stop and ask about. At most 4, worst first. Skip style, naming, and anything that isn't a real risk — an empty-ish list is a fine answer if the code is sound.

One line each, exactly this shape:
CRITICAL|HIGH|MEDIUM — <where> — <what breaks, and the input that breaks it> → <the fix, in a few words>

Only add a code snippet if the fix is a single line. No explanations under the lines.

\`\`\`${lang}
${solCode}
\`\`\``,
      // The follow-ups that are actually coming, with sayable answers.
      deepdive: `${VOICE}

Name the 3 follow-up questions this interviewer is most likely to ask next about this solution — the ones that actually get asked, not trivia. For each, give the spoken answer in 2-3 sentences the candidate can say as-is (~25 seconds each).

Format each as:
Q: <the question, as they'd ask it>
<the spoken answer>

Lead with the answer, not the setup. No essays, no bullet lists inside the answers.

\`\`\`${lang}
${solCode}
\`\`\``,
    };
    let accumulated = '';
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/inference/stream`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question: prompts[tab], mode: 'general', bypass_cache: true }),
        signal: abort.signal,
      });
      if (!resp.ok || !resp.body) throw new Error('Request failed');
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.t && !abort.signal.aborted) { accumulated += d.t; setAnalysisCache(prev => ({ ...prev, [cacheKey]: accumulated })); }
              else if (d.raw && !abort.signal.aborted) { accumulated = d.raw; setAnalysisCache(prev => ({ ...prev, [cacheKey]: accumulated })); }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      // A failed prefetch stays invisible — it leaves no cache entry, so the
      // tab simply generates on click the way it always did. Writing the error
      // in would show the user a failure for something they never asked for.
      if (err?.name !== 'AbortError' && !silent) {
        setAnalysisCache(prev => ({ ...prev, [cacheKey]: `Error: ${err.message}` }));
      }
    } finally {
      analysisInFlightRef.current.delete(cacheKey);
      setAnalysisInFlight(keys => keys.filter(k => k !== cacheKey));
    }
  }, [jsonSolution, activeSolutionIdx, code, token, resolveLanguage]);

  const handleAnalysis = useCallback(
    (tab: 'explain' | 'issues' | 'deepdive') => { void runAnalysis(tab); },
    [runAnalysis],
  );

  // Prefetch. These three are what the user reaches for the moment the answer
  // lands, and each cost a 3-5s wait at exactly the point they had none to
  // spare. They are generated up front instead, one at a time so a solve does
  // not fire four concurrent LLM streams, and only for the approach on screen —
  // prefetching all three views of all three solutions would be nine calls for
  // the two or three anyone reads.
  //
  // Held in a ref rather than a dep: runAnalysis closes over `code`, which
  // changes on every keystroke in the editor, and a dep would restart the queue
  // each time.
  const runAnalysisRef = useRef(runAnalysis);
  useEffect(() => { runAnalysisRef.current = runAnalysis; }, [runAnalysis]);
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!jsonSolution || isStreaming || isLoading || !token) return;
    let cancelled = false;
    // Let the answer paint first — the solution itself is what the user is
    // reading in the first second, and it shares the connection.
    const timer = setTimeout(async () => {
      for (const tab of ['explain', 'issues', 'deepdive'] as const) {
        if (cancelled) return;
        const key = `${activeSolutionIdx}_${tab}`;
        if (prefetchedRef.current.has(key)) continue;
        prefetchedRef.current.add(key);
        await runAnalysisRef.current(tab, { silent: true });
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [jsonSolution, activeSolutionIdx, isStreaming, isLoading, token]);

  // Emptying the cache is no longer enough on its own: a prefetch still in
  // flight would finish and write the OLD problem's analysis into the new
  // problem's cell, which is keyed by index and looks legitimate.
  const resetAnalysis = useCallback(() => {
    abortAllAnalysis();
    prefetchedRef.current.clear();
    setAnalysisCache({});
    setAnalysisTab('code');
  }, [abortAllAnalysis]);

  // Restore last coding answer from sessionStorage on mount (refresh or chip-switch back).
  // Intentionally runs even when initialProblem is set — if the user refreshes a
  // ?problem= URL we still want to show the sessionStorage answer instantly rather
  // than re-triggering the LLM. The server-side cache will hit anyway (v8 keys are
  // question-scoped), so worst case is a no-op duplicate render.
  useEffect(() => {
    if (parsedBlocks.length === 0 && !isStreaming) {
      try {
        const raw = sessionStorage.getItem('lumora:lastCodingAnswer');
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.ts && Date.now() - saved.ts < 4 * 60 * 60 * 1000 && saved.parsed) {
            const store = useSessionStore.getState();
            store.setParsedBlocks(saved.parsed);
            if (saved.question) store.setQuestion(saved.question);
            store.setIsCodingQuestion(true);
            store.setIsDesignQuestion(false);
          }
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate — re-submit the same problem. Backend will serve from
  // cache (Redis → DB) so no LLM call unless this is a genuinely new problem.
  const handleRegenerate = useCallback(() => {
    const text = problemText.trim();
    if (!text || isLoading || isStreaming) return;
    resetAnalysis();
    lastAutoGenSigRef.current = genSignature(text); // explicit regenerate — bypass dedup, refresh signature
    onSubmit(text, resolveLanguage(text), { ...(effectiveStarterCode ? { starterCode: effectiveStarterCode } : {}) });
  }, [problemText, language, effectiveStarterCode, isLoading, isStreaming, onSubmit, resolveLanguage, resetAnalysis]);

  // Auto-switch to the Solution tab when a stream error fires. The
  // error card lives in the Solution tab — without this, a user who
  // clicked Coding from the Description tab sees nothing happen
  // because the rejection (e.g. "Unsupported language: tcl") only
  // surfaces on a tab they aren't looking at.
  useEffect(() => {
    if (streamError && !isStreaming) {
      setProblemTab('solution');
    }
  }, [streamError, isStreaming]);

  // Wipe every piece of solution state so the user can ask a brand-new
  // problem without refreshing the page. Also flips the voice route
  // back to 'problem' so the next dictated utterance fills the textarea
  // and fires a fresh solve. Called from the "New Problem" toolbar
  // button — and from the parent if it ever needs to reset us via ref.
  const handleNewProblem = useCallback(() => {
    setProblemText('');
    setProblemUrl('');
    setProblemTab('description');
    setInputMode('paste');
    setOutput('');
    setOutputLog([]);
    setIsRunning(false);
    setJsonSolution(null);
    setImageFile(null);
    setImagePreview(null);
    setIsProcessing(false);
    setError(null);
    setStreamError(null);
    setTestCases([{ input: '', expected: '' }]);
    setTestResults([]);
    setShowFixPrompt(false);
    setFixError('');
    setIsOutputCollapsed(true);
    setActiveSolutionIdx(0);
    setCode(getDefaultCode(language));
    clearStreamChunks();
    setParsedBlocks([]);
    setLastFromCache(null);
    setSnapChipCode(null);
    resetAnalysis();
    useSessionStore.getState().setLiveSolveContext(null);
    lastAutoGenSigRef.current = ''; // clear dedup so re-entering the same problem solves again
    onNewProblemCallback?.();
  }, [clearStreamChunks, setParsedBlocks, setStreamError, setLastFromCache, language, onNewProblemCallback, resetAnalysis]);

  // ── Timer Logic ──────────────────────────────────────────────────────────

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
  const timerUrgent = timerDuration > 0 && timerSeconds < 300 && timerSeconds > 0; // < 5 min

  // ── Auto-fit: editor column width follows the code, not a fixed ratio ────
  // Monaco runs with wordWrap:'off', so the editor never needs more width than
  // its longest line. Everything past that is dead space while the solution
  // panel — dense prose, a 3-column dry-run table, follow-up Q&A — is starved.
  // Measure the code, give the editor what it needs, hand the rest to the left.
  const codeMaxLineLen = useMemo(
    () => code.split('\n').reduce((m, l) => (l.length > m ? l.length : m), 0),
    [code],
  );

  useEffect(() => {
    if (userSizedSplitRef.current) return;
    const fit = () => {
      const total = splitRowRef.current?.clientWidth ?? 0;
      if (total < 900) return; // stacked or narrow — the CSS floor governs
      // 11px IBM Plex Mono ≈ 6.6px/char, + line-number gutter, padding, scrollbar.
      // Floor of 430px keeps the editor toolbar (Lang / Run / → CoFix) on one row.
      const wanted = Math.min(Math.max(codeMaxLineLen * 6.6 + 96, 430), total * 0.5);
      const next = Math.min(Math.max(100 - (wanted / total) * 100, 40), 65);
      setLeftPanelWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [codeMaxLineLen]);

  // Editor height tracks its line count so the leftover vertical space goes to
  // the test/output panel instead of becoming blank canvas under the last line
  // (scrollBeyondLastLine is off, so line count × lineHeight is exact).
  const editorContentH = useMemo(
    () => code.split('\n').length * 19 + 26, // 19px lineHeight + padding/h-scrollbar
    [code],
  );
  // Auto-fit is off while the output panel is collapsed (editor should fill) or
  // once the user has dragged the vertical handle to a height of their own.
  const autoFitEditorHeight = !isOutputCollapsed && outputPanelHeight == null;

  // ── Resize Handlers ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isResizingH) return;
    const move = (e: MouseEvent) => {
      setLeftPanelWidth(Math.min(Math.max(25, (e.clientX / window.innerWidth) * 100), 70));
    };
    const up = () => setIsResizingH(false);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingH]);

  useEffect(() => {
    if (!isResizingV) return;
    // Delta from drag start — robust to the CustomInputPanel row that sits
    // between the handle and the panel, and to embedded mode where the panel
    // bottom is not the viewport bottom. Dragging up grows the panel.
    const move = (e: MouseEvent) => {
      if (!vResizeRef.current) return;
      const delta = vResizeRef.current.startY - e.clientY;
      setOutputPanelHeight(Math.min(Math.max(100, vResizeRef.current.startH + delta), 500));
    };
    const up = () => { setIsResizingV(false); vResizeRef.current = null; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingV]);

  // ── Code Execution ─────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutputTab('output');
    setIsOutputCollapsed(false);
    setOutput('Executing...');
    setTestResults([]);
    setShowFixPrompt(false);

    if (!token) {
      setOutput('ERROR: Not authenticated.');
      setOutputLog(prev => [...prev, { ts: new Date(), text: 'ERROR: Not authenticated.' }]);
      setIsRunning(false);
      return;
    }

    const validTestCases = testCases.filter(tc => String(tc.input ?? '').trim());

    // If the code has its own embedded test runner (if __name__ == '__main__',
    // Java main, Node.js top-level calls), the builder would strip __main__ and
    // try to call the solution function with extracted text inputs — which breaks
    // for problems that use complex objects, not stdin. Force direct execution so
    // the code's own assertions/prints are what the user sees.
    const hasSelfContainedRunner =
      /if\s+__name__\s*==\s*['"]__main__['"]/.test(code) ||   // Python
      /public\s+static\s+void\s+main\s*\(\s*String/.test(code) || // Java
      /^func\s+main\s*\(\s*\)/m.test(code);                   // Go
    const testCasesToSend = hasSelfContainedRunner ? [] : validTestCases;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/coding/execute`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          code,
          language: resolveLanguage(),
          // Custom-input mode runs once against the user's stdin, bypassing test cases.
          test_cases: customInputEnabled ? [] : testCasesToSend,
          ...(customInputEnabled ? { stdin: customInput } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || `Execution failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setTestResults(data.results);
        const passed = data.results.filter((r: TestResult) => r.passed).length;
        let outputStr = `${passed}/${data.results.length} Passed`;
        if (data.direct_output) outputStr += `\n\n${'─'.repeat(40)}\n${data.direct_output}`;
        setOutput(outputStr);
        setOutputLog(prev => [...prev, { ts: new Date(), text: outputStr }]);

        // Offer auto-fix instead of doing it silently
        const allPassed = data.results.every((r: TestResult) => r.passed);
        if (!allPassed) {
          // Collect ALL failing test details so the AI can diagnose every issue
          const failingDetails = data.results
            .map((r: TestResult, i: number) => {
              if (r.passed) return null;
              const tc = testCases[i];
              const parts = [`Test ${i + 1}`];
              if (tc?.input) parts.push(`Input: ${tc.input}`);
              if (tc?.expected) parts.push(`Expected: ${tc.expected}`);
              if (r.output) parts.push(`Got: ${r.output}`);
              if (r.error) parts.push(`Error: ${r.error}`);
              return parts.join(' | ');
            })
            .filter(Boolean)
            .join('\n');
          setFixError(failingDetails);
          setShowFixPrompt(true);
        } else {
          // Tests passed — disarm the silent-fix loop. Otherwise `active` stayed
          // true after a first-try pass and any LATER manual Run that failed
          // silently overwrote the candidate's hand-edited code (the visible
          // Auto-Fix button never showing).
          autoGenRef.current.active = false;
        }
      } else if (data.direct_output !== undefined && data.direct_output !== null) {
        const directOut = data.direct_output || '(no output)';
        setOutput(directOut);
        setOutputLog(prev => [...prev, { ts: new Date(), text: directOut }]);
        // A runtime error / traceback on a direct run (no test cases) must ALSO
        // arm auto-fix — otherwise the Auto-Fix button never shows and the fix
        // request has no error to read. Feed the traceback in as fixError.
        const isRunErr =
          /^error:/i.test(directOut) || directOut.startsWith('Traceback') ||
          /\b(SyntaxError|NameError|TypeError|ValueError|IndexError|KeyError|AttributeError|RuntimeError|ZeroDivisionError|ImportError|ModuleNotFoundError|IndentationError|RecursionError|StopIteration|AssertionError)\b/.test(directOut) ||
          /\b(Exception in thread|panic:|segmentation fault|core dumped|compilation (error|failed))\b/i.test(directOut);
        if (isRunErr) {
          setFixError(`The code produced this runtime error when run — read it and fix the code so it runs cleanly:\n\n${directOut}`);
          setShowFixPrompt(true);
        } else {
          autoGenRef.current.active = false;
        }
      } else {
        autoGenRef.current.active = false;
        setOutput('(no output)');
        setOutputLog(prev => [...prev, { ts: new Date(), text: '(no output)' }]);
      }
    } catch (err: any) {
      autoGenRef.current.active = false;
      setOutput(`Error: ${err.message}`);
      setOutputLog(prev => [...prev, { ts: new Date(), text: `Error: ${err.message}` }]);
    } finally {
      setIsRunning(false);
    }
  }, [token, code, language, testCases, customInputEnabled, customInput]);

  const handleAutoFix = useCallback(async (silent = false) => {
    if (!token) {
      if (!silent) {
        setOutput(prev => prev + '\nAuto-fix: not authenticated');
        setOutputLog(prev => [...prev, { ts: new Date(), text: 'Auto-fix: not authenticated' }]);
      }
      return;
    }
    setShowFixPrompt(false);
    if (!silent) setOutput('Auto-fixing code...');
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fix`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, language: resolveLanguage(), error: fixError, problem: problemText }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (!silent) throw new Error(errData.detail || `Fix failed: ${resp.status}`);
        // Silent auto-fix failed — restore the Fix button so the user isn't stuck.
        setShowFixPrompt(true);
        return;
      }
      const data = await resp.json();
      if (data.code) {
        setCode(data.code);
        if (!silent) {
          const fixMsg = 'Code fixed! Click Run to test again.' + (data.explanation ? `\n\nFix: ${data.explanation}` : '');
          setOutput(fixMsg);
          setOutputLog(prev => [...prev, { ts: new Date(), text: fixMsg }]);
        }
        if (silent) {
          // Re-run via ref so we get the handleRun that has the just-set code
          setTimeout(() => handleRunRef.current?.(), 80);
        }
      } else {
        if (!silent) {
          setOutput('Auto-fix returned no code. Try editing manually.');
          setOutputLog(prev => [...prev, { ts: new Date(), text: 'Auto-fix returned no code. Try editing manually.' }]);
        }
      }
    } catch (err: any) {
      if (!silent) {
        setOutput(`Auto-fix failed: ${err.message || 'Unknown error'}. Try editing the code manually.`);
        setOutputLog(prev => [...prev, { ts: new Date(), text: `Auto-fix failed: ${err.message || 'Unknown error'}. Try editing the code manually.` }]);
      }
    }
  }, [token, code, language, fixError, problemText, handleRun]);

  // Keep refs current so the auto-fix loop can call the latest versions without stale closures
  useEffect(() => { handleAutoFixRef.current = handleAutoFix; }, [handleAutoFix]);
  useEffect(() => { handleRunRef.current = handleRun; }, [handleRun]);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // isTabActive===false means this mounted-but-hidden coding tab isn't the
      // visible one — don't run code from a background tab. undefined = the
      // standalone CodingPage (no shell), which is always active.
      if (isTabActive === false) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRunning, handleRun, isTabActive]);

  // ── Copy ────────────────────────────────────────────────────────────────

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopyFeedback(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyFeedback(false), 1500);
  };
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  // ── Auto-switch to solution tab on streaming ────────────────────────────

  useEffect(() => {
    if (isStreaming) setProblemTab('solution');
  }, [isStreaming]);

  // Mark auto-gen active when a new solution starts streaming so the silent
  // fix loop knows to intercept test failures instead of surfacing the button.
  useEffect(() => {
    if (isStreaming) autoGenRef.current = { active: true, attempts: 0 };
  }, [isStreaming]);

  // Silent auto-fix: iterate until all tests pass or we exhaust attempts.
  // Loop stops naturally when handleRun finds allPassed (never sets showFixPrompt=true).
  useEffect(() => {
    if (!showFixPrompt) return;
    if (!autoGenRef.current.active) return;
    if (autoGenRef.current.attempts >= 7) {
      autoGenRef.current.active = false; // give up after 7 tries, show manual button
      return;
    }
    autoGenRef.current.attempts++;
    handleAutoFixRef.current?.(true); // silent=true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFixPrompt]);

  // ── Auto-run after solution completes ───────────────────────────────────
  // User asked for "instant working answers — don't ask me to add test
  // cases manually." When the model returns examples and the solve
  // stream completes, fire handleRun automatically so the user lands on
  // a Solution + Output panel that already shows passing/failing tests.
  // The autoRunFiredRef guard prevents the effect from re-firing on
  // every state change after the run completes.
  const autoRunFiredRef = useRef(false);
  useEffect(() => {
    if (isStreaming) {
      autoRunFiredRef.current = false; // reset for the next solution
      return;
    }
    if (autoRunFiredRef.current) return;
    if (isRunning) return;
    if (!code || !code.trim()) return;
    if (!testCases || testCases.length === 0) return;
    // Only fire if at least one test case has a real input — empty
    // placeholders shouldn't trigger a useless empty run.
    const hasRealInput = testCases.some((tc) => tc.input && String(tc.input ?? '').trim().length > 0);
    if (!hasRealInput) return;
    autoRunFiredRef.current = true;
    handleRun();
  }, [isStreaming, code, testCases, isRunning, handleRun]);

  // Analysis tabs load lazily on first click and are cached per solution.
  // (Auto-firing all 3 on every solve wasted tokens and caused abort conflicts
  // when manual clicks raced with the sequential auto-fetch.)

  // ── Parse solution from stream ──────────────────────────────────────────

  useEffect(() => {
    const pb = parsedBlocks as any;
    const jsonData = pb && !Array.isArray(pb) ? (pb.json || pb) : null;
    // MCQ answer — store it and stop. No code/testcases to extract, so the
    // Monaco editor and auto-run stay untouched.
    if (jsonData && jsonData.type === 'mcq' && jsonData.mcq) {
      setJsonSolution(jsonData);
      return;
    }
    if (jsonData && (jsonData.code || jsonData.solutions)) {
      setJsonSolution(jsonData);
      // New multi-solution format
      if (jsonData.solutions?.length > 0) {
        setActiveSolutionIdx(0);
        const firstSol = jsonData.solutions[0];
        const solCode = firstSol.code || firstSol.implementation
          || (firstSol.explanations?.length > 0 ? firstSol.explanations.map((ex: any) => ex.code).filter(Boolean).join('\n') : null);
        if (solCode) setCode(solCode);
      } else if (jsonData.code) {
        setCode(jsonData.code);
      }
      // Only apply backend-detected language when the user hasn't explicitly chosen one.
      if (jsonData.language && jsonData.language !== 'auto' && language === 'auto') setLanguage(jsonData.language);
      if (jsonData.examples?.length > 0) {
        setTestCases(jsonData.examples.map((ex: any) => ({ input: ex.input || '', expected: ex.expected || '' })));
        setOutputTab('testcases');
        setIsOutputCollapsed(false);
      }
      return;
    }

    if (parsedBlocks && Array.isArray(parsedBlocks) && parsedBlocks.length > 0) {
      const codeBlock = parsedBlocks.find((b: any) => b.type === 'CODE');
      if (codeBlock?.content) setCode(codeBlock.content);
      const tcBlock = parsedBlocks.find((b: any) => b.type === 'TESTCASES');
      if (tcBlock?.content) {
        const extracted = extractTestCases(tcBlock.content);
        if (extracted.length > 0) {
          setTestCases(extracted);
          setOutputTab('testcases');
          setIsOutputCollapsed(false);
        }
      }
    }
  }, [parsedBlocks]);

  // Sync code from jsonSolution — reconstruct from explanations if sol.code missing
  useEffect(() => {
    if (!jsonSolution) return;

    const idx = activeSolutionIdx || 0;
    const sol = jsonSolution.solutions?.[idx] || jsonSolution.solutions?.[0];
    if (!sol) return;

    // Try direct code field first
    let extracted = sol.code || sol.implementation || sol.solution
      || jsonSolution.code || jsonSolution.implementation;

    // If no direct code field, reconstruct from explanations (the actual format)
    if (!extracted && sol.explanations?.length > 0) {
      extracted = sol.explanations.map((ex: any) => ex.code).filter(Boolean).join('\n');
    }

    // Last resort: extract from raw stream
    if (!extracted) {
      const codeMatch = streamText.match(/```(?:python|java|cpp|javascript|typescript|go|rust)?\n([\s\S]*?)```/);
      if (codeMatch?.[1]?.trim()) extracted = codeMatch[1].trim();
    }

    if (extracted && extracted.trim().length > 5) {
      setCode(extracted);
    }
  }, [jsonSolution, activeSolutionIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Publish the active solution to the store as live-solve context so
  // Sona's follow-up Q&A is grounded in this exact problem + code.
  // Without this, asking Sona "what's the time complexity?" yields a
  // generic answer because Sona has no idea which problem was solved.
  // Re-runs whenever the user flips between Solutions 1/2/3 so the
  // context tracks the currently-displayed approach.
  useEffect(() => {
    if (!jsonSolution || !problemText.trim()) return;
    const idx = activeSolutionIdx || 0;
    const sol = jsonSolution.solutions?.[idx] || jsonSolution.solutions?.[0];
    if (!sol) return;
    let solCode = sol.code || sol.implementation || sol.solution || '';
    if (!solCode && sol.explanations?.length) {
      solCode = sol.explanations.map((ex: any) => ex.code).filter(Boolean).join('\n');
    }
    useSessionStore.getState().setLiveSolveContext({
      surface: 'coding',
      problem: problemText.trim().slice(0, 4000),
      approach: (sol.approach || sol.name || '').slice(0, 800),
      complexity: `TIME=${sol.complexity?.time || 'n/a'}, SPACE=${sol.complexity?.space || 'n/a'}`,
      code: (solCode || '').slice(0, 4000),
      language,
      solvedAt: Date.now(),
    });
  }, [jsonSolution, activeSolutionIdx, problemText, language]);

  // JSON repair from stream
  useEffect(() => {
    if (!isStreaming && streamText.length > 0 && !jsonSolution) {
      const raw = streamText;
      try {
        let text = raw.trim();
        if (text.startsWith('```')) {
          const nl = text.indexOf('\n');
          const last = text.lastIndexOf('```');
          text = text.substring(nl + 1, last > nl ? last : undefined).trim();
        }
        const brace = text.indexOf('{');
        if (brace >= 0) text = text.substring(brace);
        const openB = (text.match(/\{/g) || []).length - (text.match(/\}/g) || []).length;
        const openA = (text.match(/\[/g) || []).length - (text.match(/\]/g) || []).length;
        let repaired = text.replace(/,\s*$/, '');
        repaired += ']'.repeat(Math.max(0, openA));
        repaired += '}'.repeat(Math.max(0, openB));
        const json = JSON.parse(repaired);
        if (json.code || json.solutions) {
          setJsonSolution(json);
          if (json.solutions?.length > 0) {
            setActiveSolutionIdx(0);
            // Some streamed multi-section formats omit a top-level `code`
            // on solutions[0] (only `explanations: [{code, ...}]`). Calling
            // setCode(undefined) flashed an empty editor for one paint
            // frame before the reconstruct effect (line ~547) re-filled
            // from explanations. Fall back to the same shape inline so
            // the editor never goes blank.
            const sol0 = json.solutions[0];
            const fallback = sol0?.code
              || sol0?.implementation
              || (Array.isArray(sol0?.explanations)
                ? sol0.explanations.map((e: any) => e?.code).filter(Boolean).join('\n')
                : null);
            if (fallback) setCode(fallback);
          } else if (json.code) {
            setCode(json.code);
          }
          if (json.language && json.language !== 'auto') setLanguage(json.language);
          if (json.examples?.length > 0) {
            setTestCases(json.examples.map((ex: any) => ({ input: ex.input || '', expected: ex.expected || '' })));
            setOutputTab('testcases');
            setIsOutputCollapsed(false);
          }
        }
      } catch { /* not JSON */ }
    }
  }, [isStreaming, streamText, jsonSolution]);

  // Turn the statement's worked examples into RUNNABLE cases — only if the user
  // hasn't hand-edited any.
  //
  // A call-style example ("Input: nums = [2,7,11,15], target = 9") cannot be
  // emitted until there is code to call, so this deliberately re-runs when the
  // detected signature appears. It keys on the signature rather than on `code`
  // so typing inside a function body doesn't rebuild the list on every stroke.
  const testCasesUserEdited = useRef(false);
  const problemExamples = useMemo(() => parseProblemExamples(problemText || ''), [problemText]);
  const solutionFn = useMemo(
    () => detectSolutionFn(code || '', problemExamples.find(e => e.kind === 'call')?.args.length),
    [code, problemExamples],
  );
  useEffect(() => {
    if (!problemText || testCasesUserEdited.current) return;
    const fromProblem = buildTestCases(problemExamples, { code, language });
    if (fromProblem.length === 0) return;
    // Ground truth first, generated edge cases after. Merging (rather than
    // replacing) matters because the generated cases usually land first: the
    // model returns code and tests together, and only then does a call example
    // become emittable.
    setTestCases(prev => {
      const kept = prev.filter(t => String(t.input ?? '').trim() || String(t.expected ?? '').trim());
      const merged = mergeTestCases(fromProblem, kept, MAX_TEST_CASES);
      return merged.length > 0 ? merged : [{ input: '', expected: '' }];
    });
    setOutputTab('testcases');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemText, language, solutionFn?.name, solutionFn?.arity, solutionFn?.isMethod]);

  // Pre-fill from URL param
  useEffect(() => {
    if (initialProblem) {
      setProblemText(initialProblem);
      setProblemTab('description');
      setInputMode('paste');
    }
  }, [initialProblem]);

  // Auto-fetch when ?url= query param is present (e.g. opened from HackerRank/LeetCode)
  const autoUrlFetchDone = useRef(false);
  useEffect(() => {
    if (!initialUrl || !token || autoUrlFetchDone.current) return;
    autoUrlFetchDone.current = true;
    setInputMode('url');
    setProblemUrl(initialUrl);
    // Only AUTO-fetch a single-problem page — never a landing/list page. Prefill the
    // URL either way so the user can still fetch manually if they know it's a problem.
    if (isProblemPageUrl(initialUrl)) handleFetchFromUrl(initialUrl, { auto: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, token]);

  /* Auto-fetch the problem you already have open.
   *
   * This is what "auto fetch" means outside the Electron shell. A web page cannot
   * read another window's address bar, so it asks a bridge — the desktop IPC probe
   * or the Camora Problem Bridge extension — and fetches whatever problem page is
   * open. Runs on mount and again whenever the tab regains focus, because the usual
   * sequence is: open the problem, come back here.
   *
   * Guards, in order of how badly each would misbehave without them:
   *  - never overwrite a URL or problem the user has already put in;
   *  - never re-fetch the same URL twice (focus fires often);
   *  - only fetch pages isProblemPageUrl() accepts, same as every other entry point.
   */
  const autoDetectedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const probe = async () => {
      if (cancelled || isProcessing) return;
      // The user is mid-thought — do not yank the field out from under them.
      if (problemUrlRef.current.trim() || problemTextRef.current.trim()) return;
      if (!(await waitForBridge())) return;

      const res = await getActiveProblemUrl();
      if (cancelled || !res.ok || !res.url) return;
      if (!isProblemPageUrl(res.url)) return;
      if (autoDetectedUrlRef.current === res.url) return;
      if (problemUrlRef.current.trim() || problemTextRef.current.trim()) return;

      autoDetectedUrlRef.current = res.url;
      setInputMode('url');
      setProblemUrl(res.url);
      handleFetchFromUrl(res.url, { auto: true });
    };

    probe();
    window.addEventListener('focus', probe);
    return () => { cancelled = true; window.removeEventListener('focus', probe); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Starts/resets the 8-second auto-generate timer used after multi-page captures.
  // Each new page resets the clock; when it fires the combined text is submitted.
  const scheduleAutoGenerate = useCallback(() => {
    if (captureAutoGenTimerRef.current) clearTimeout(captureAutoGenTimerRef.current);
    captureAutoGenTimerRef.current = setTimeout(() => {
      const text = problemTextRef.current;
      if (!text.trim()) return;
      multiPageCapturingRef.current = false;
      setMultiPageCapturing(false);
      setMultiPageCount(0);
      if (!claimAutoGen(text)) return; // same problem — don't regenerate
      const lang = resolveLanguage(text);
      setStreamError(null);
      setTestResults([]);
      setTestCases([]);
      setOutput('');
      setShowFixPrompt(false);
      clearStreamChunks();
      setParsedBlocks([]);
      setJsonSolution(null);
      setCode(getDefaultCode(lang));
      setActiveSolutionIdx(0);
      setIsOutputCollapsed(true);
      setProblemTab('solution');
      // Thread the captured platform template so the backend FILLS the locked
      // HackerRank harness instead of writing a from-scratch stdin script. This
      // path (fired after every snap/capture) previously passed undefined and
      // dropped the starter code — the root cause of "not matching HackerRank".
      const sc = starterCodeRef.current || (isCodeTemplate(text) ? text : null);
      onSubmit(text, lang, sc ? { starterCode: sc } : undefined);
    }, 8000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveLanguage, clearStreamChunks, onSubmit]);

  // F9 shortcut (Electron desktop): multi-page aware, URL-first on first capture.
  // Page 1: try active URL via backend scraper (generates immediately on success).
  //         On OCR fallback: extract text, start multi-page session, start 8s timer.
  // Page 2+: skip URL check, OCR and append, reset timer.
  // Timer fires after 8s of no new captures → auto-generates combined problem.
  useEffect(() => {
    if (!pendingHackerrankCapture) return;
    onHackerrankCaptureConsumed?.();
    (async () => {
      try {
        // Subsequent page in a multi-page session: append and reset timer.
        if (multiPageCapturingRef.current) {
          // Hard backstop: once we've collected the max pages, stop appending and let
          // the pending idle timer generate — never keep growing.
          if (multiPageCountRef.current >= MAX_SNAP_PAGES) return;
          const blob = await (await fetch(pendingHackerrankCapture)).blob();
          const file = new File([blob], 'hackerrank-capture.png', { type: blob.type || 'image/png' });
          const added = await extractAndAppend(file);
          // Only count the page + extend the capture window when new content arrived.
          // A duplicate (same screen re-snapped) is ignored, so the existing 8s idle
          // timer fires and generates instead of the count climbing forever.
          if (added) {
            setMultiPageCount(c => c + 1);
            scheduleAutoGenerate();
          }
          return;
        }

        // First capture: try URL-first (full problem via backend scraper).
        // Desktop IPC or the browser-extension bridge, whichever is present.
        const activeInfo = await getActiveProblemUrl();
        const activeUrl: string | null = activeInfo.ok && activeInfo.url ? activeInfo.url : null;
        if (activeUrl && token && isProblemPageUrl(activeUrl)) {
          try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fetch-problem`, {
              credentials: 'include',
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ url: activeUrl }),
            });
            if (resp.ok) {
              const data = await resp.json();
              const text = String(data.problem || '').trim();
              if (text) {
                // Full problem from URL — generate immediately, no multi-page needed.
                setProblemText(text);
                setSnapChipCode(text);
                setStarterCode(null);
                setInputMode('paste');
                if (!claimAutoGen(text)) return; // same problem — show it, don't regenerate
                setStreamError(null);
                setTestResults([]);
                setTestCases([]);
                setOutput('');
                setShowFixPrompt(false);
                clearStreamChunks();
                setParsedBlocks([]);
                setJsonSolution(null);
                setCode(getDefaultCode(resolveLanguage(text)));
                setActiveSolutionIdx(0);
                setIsOutputCollapsed(true);
                setProblemTab('solution');
                onSubmit(text, resolveLanguage(text), undefined);
                return;
              }
            }
          } catch {
            // URL fetch failed — fall through to OCR
          }
        }

        // OCR first page: extract, start multi-page session, wait for more pages.
        const blob = await (await fetch(pendingHackerrankCapture)).blob();
        const file = new File([blob], 'hackerrank-capture.png', { type: blob.type || 'image/png' });
        setInputMode('image');
        setImagePreview(pendingHackerrankCapture);
        await extractAndMaybeGenerate(file, false); // false = don't auto-generate yet
        multiPageCapturingRef.current = true;
        setMultiPageCapturing(true);
        setMultiPageCount(1);
        scheduleAutoGenerate();
      } catch (err: any) {
        setError(err.message || 'Failed to process HackerRank screenshot.');
        // Reset dedup in main process so the next poll retries this URL.
        (window as any).camo?.resetLastCaptureUrl?.();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHackerrankCapture]);

  // DOM text path (Electron): main process extracted the full problem text directly
  // from the browser DOM — no OCR needed. Skips the image pipeline entirely.
  useEffect(() => {
    if (!pendingHackerrankText) return;
    onHackerrankTextConsumed?.();
    const trimmed = pendingHackerrankText.trim();
    // Consume starter code extracted from the platform's code editor alongside the problem.
    // This ensures the backend preserves input-reading boilerplate (readarray, Scanner, etc.)
    // instead of generating its own — the root cause of HackerRank format mismatches.
    const sc = pendingHackerrankStarterCode?.trim() || null;
    onHackerrankStarterCodeConsumed?.();
    if (sc) setStarterCode(sc);
    setProblemText(trimmed);
    setSnapChipCode(trimmed);
    setInputMode('paste');
    if (!claimAutoGen(trimmed)) return; // same problem — show it, don't regenerate
    setStreamError(null);
    setTestResults([]);
    setTestCases([]);
    setOutput('');
    setShowFixPrompt(false);
    clearStreamChunks();
    setParsedBlocks([]);
    setJsonSolution(null);
    setActiveSolutionIdx(0);
    setIsOutputCollapsed(true);
    setProblemTab('solution');
    const effectiveLang = language === 'auto' ? detectLanguage(trimmed) : language;
    setCode(getDefaultCode(effectiveLang));
    onSubmit(trimmed, effectiveLang, sc ? { starterCode: sc } : undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHackerrankText]);

  // Multi-page SNAP: parent passes an array of screenshot dataUrls captured via
  // auto-scroll injection. Extract and concatenate all pages then generate.
  useEffect(() => {
    if (!pendingHackerrankDataUrls?.length) return;
    onHackerrankDataUrlsConsumed?.();
    void extractAndGenerateFromDataUrls(pendingHackerrankDataUrls);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHackerrankDataUrls]);

  // Desktop screenshot watcher (Electron): user presses Cmd+Shift+4, saves a
  // screenshot of the HackerRank problem + code editor to ~/Desktop, and Lumora
  // auto-picks it up, OCRs it, and generates a solution — zero clicks needed.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.onScreenshotWatcher) return;
    // Collect dataUrls synchronously — no per-screenshot OCR.
    // Processing happens all-at-once when the idle timer fires or Coding is clicked.
    const handler = ({ dataUrl }: { dataUrl: string }) => {
      if (pendingSnapUrlsRef.current.length === 0) cutoffPromptedRef.current = false;
      pendingSnapUrlsRef.current = [...pendingSnapUrlsRef.current, dataUrl];
      const count = pendingSnapUrlsRef.current.length;
      setInputMode('image');
      setImagePreview(dataUrl);
      multiPageCapturingRef.current = true;
      setMultiPageCapturing(true);
      setMultiPageCount(count);
      // Reset idle timer — fires 6s after the LAST screenshot
      if (captureAutoGenTimerRef.current) clearTimeout(captureAutoGenTimerRef.current);
      captureAutoGenTimerRef.current = setTimeout(() => {
        const urls = pendingSnapUrlsRef.current;
        pendingSnapUrlsRef.current = [];
        multiPageCapturingRef.current = false;
        setMultiPageCapturing(false);
        setMultiPageCount(0);
        // fromImageSnap=true → completeness check before generating
        if (urls.length) void extractAndGenerateFromDataUrls(urls, true);
      }, 6000);
    };
    const unwatch = camo.onScreenshotWatcher(handler);
    return () => camo.offScreenshotWatcher?.(unwatch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session folder: route screenshots to ~/Documents/Camora/{company}/screenshots/
  // so captures are isolated per interview and never confused with Desktop clutter.
  // Cleared on unmount so the watcher reverts to ~/Desktop between sessions.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.setSessionFolder) return;
    const company = getActiveAssistant()?.company || getActiveAssistant()?.name || '';
    camo.setSessionFolder(company || null);
    return () => { camo.setSessionFolder(null); };
  }, []);

  // Turn off content protection when leaving the coding page so the app
  // Stealth is now a GLOBAL, persistent setting (rail toggle) — do NOT force it
  // off on unmount, or navigating between tabs would silently drop the user's
  // app-wide stealth choice.


  // ── Actions ─────────────────────────────────────────────────────────────

  const [isTranslating, setIsTranslating] = useState(false);
  const translateAbortRef = useRef<AbortController | null>(null);

  const handleLanguageChange = async (newLang: string) => {
    const prevLang = language;
    setLanguage(newLang);
    // No solution yet → fall back to language template
    if (!jsonSolution || !code || code === getDefaultCode(prevLang)) {
      if (!code || code === getDefaultCode(prevLang)) setCode(getDefaultCode(newLang));
      return;
    }
    // Translate the active solution to the new language instead of regenerating all 3
    translateAbortRef.current?.abort();
    const controller = new AbortController();
    translateAbortRef.current = controller;
    setIsTranslating(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/v1/coding/translate`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: controller.signal,
        body: JSON.stringify({
          code,
          fromLanguage: prevLang,
          toLanguage: newLang,
          problem: problemText,
        }),
      });
      const data = await r.json();
      if (r.ok && data.code) {
        setCode(data.code);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReset = useCallback(() => {
    setCode(getDefaultCode(language));
    setOutput('');
    setError(null);
    setTestResults([]);
    setShowFixPrompt(false);
    clearStreamChunks();
    setParsedBlocks([]);
    setJsonSolution(null);
    setProblemTab('description');
    setTestCases([{ input: '', expected: '' }]);
    testCasesUserEdited.current = false;
  }, [language, clearStreamChunks, setParsedBlocks]);

  /** Is the box holding CODE the user wants AUDITED, rather than a problem to
   *  solve? Solving rewrites the program — wraps loose statements in a function,
   *  turns print() into a return — which is precisely what a "list the issues,
   *  don't change my code" request must never get. Reviewing is CoFix's job.
   *  Deliberately conservative: an explicit review instruction, or code with no
   *  problem-statement markers at all. */
  const reviewRequest = (text: string): { isReview: boolean; code: string; instruction: string } => {
    const lines = text.split('\n');
    const INSTRUCTION = /\b(list|show|find|identify)\b.{0,30}\b(issue|issues|bug|bugs|problem with|error|errors|wrong)\b|\bwhat(?:'s| is) wrong\b|\bdo ?n[o']?t (add|change|modify|rewrite|alter)\b|\bwithout (adding|changing|modifying)\b|\bdebug this\b|\bfix (the |this )?code\b/i;
    const instructionLines = lines.filter(l => INSTRUCTION.test(l));
    const hasInstruction = instructionLines.length > 0;
    // Problem statements announce themselves. If any of these are present it is
    // a problem to solve, never a review — bail out even with an instruction.
    const STATEMENT = /^\s*(input|output|constraints?|examples?|sample input|sample output|note)\s*:/im;
    const PROMPT = /\b(given an?|return the|write a (function|program)|you are given|implement a)\b/i;
    if (STATEMENT.test(text) || PROMPT.test(text)) return { isReview: false, code: '', instruction: '' };
    const codeLines = lines.filter(l => /^\s*(def |class |for |while |if |elif |else|import |from |return |print\(|\w+\s*=[^=]|\w+\s*\+=|\w+\.\w+\()/.test(l));
    const nonEmpty = lines.filter(l => l.trim()).length;
    // Either they asked for a review, or the box is essentially all code.
    const isReview = nonEmpty > 0 && codeLines.length >= 2 && (hasInstruction || codeLines.length / nonEmpty >= 0.7);
    if (!isReview) return { isReview: false, code: '', instruction: '' };
    const code = lines.filter(l => !INSTRUCTION.test(l)).join('\n').trim();
    return { isReview: true, code, instruction: instructionLines.join(' ').trim() };
  };

  const handleGenerateSolution = () => {
    if (!problemText.trim()) { setError('Please enter a problem first'); return; }
    // Code to audit goes to CoFix in review mode — solving it would rewrite it.
    const review = reviewRequest(problemText);
    if (review.isReview && review.code.trim().length >= 5 && onSendToCofix) {
      onSendToCofix(review.code, language, { mode: 'review', hint: review.instruction || undefined });
      return;
    }
    // Clear any pending multi-page auto-generate timer.
    if (captureAutoGenTimerRef.current) clearTimeout(captureAutoGenTimerRef.current);
    multiPageCapturingRef.current = false;
    setMultiPageCapturing(false);
    setMultiPageCount(0);
    // Clear live-solve context so Sona sidebar resets to the new problem.
    useSessionStore.getState().setLiveSolveContext(null);
    // Wipe previous solution state, fire the solver. No Sona on this
    // tab — every click runs the solver on the current problem text.
    setError(null);
    setStreamError(null);
    setTestResults([]);
    setTestCases([]);
    setOutput('');
    setShowFixPrompt(false);
    clearStreamChunks();
    setParsedBlocks([]);
    setJsonSolution(null);
    resetAnalysis();
    const effectiveLang = language === 'auto' ? detectLanguage(problemText) : language;
    setCode(getDefaultCode(effectiveLang));
    setActiveSolutionIdx(0);
    setIsOutputCollapsed(true); // Collapse test panel — auto-expands when new tests arrive
    // If the user pasted a code file with placeholder bodies (return [], pass,
    // TODO) but didn't go through OCR/extract, promote problemText to starterCode
    // so the backend completes-in-place and preserves the surrounding boilerplate.
    // (effectiveStarterCode is hoisted to the component body — see readinessChecks —
    // so the readiness chip and this submit path always agree.)
    const company = getActiveAssistant()?.company || getActiveAssistant()?.name || '';
    const problemWithContext = company ? `[Company: ${company}]\n\n${problemText.trim()}` : problemText.trim();
    lastAutoGenSigRef.current = genSignature(problemText); // explicit generate — refresh signature so autos don't re-solve
    onSubmit(problemWithContext, effectiveLang, effectiveStarterCode ? { starterCode: effectiveStarterCode } : undefined);
  };

  // Register voice problem handler for parent shell. Uses stable internal
  // refs for `onSubmit` and `language` so the registration only runs ONCE
  // on mount. Previously this effect's deps included `onSubmit`, which
  // (via the parent's destructured store hook) churned identity on every
  // store update — so the ref was momentarily nulled out tens of times
  // a second whenever Sona was streaming, and any transcript arriving
  // during a null window fell through to Sona instead of filling the
  // problem field. Anchoring to refs eliminates the race entirely.
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { problemTextRef.current = problemText; }, [problemText]);
  useEffect(() => { problemUrlRef.current = problemUrl; }, [problemUrl]);
  useEffect(() => { starterCodeRef.current = starterCode; }, [starterCode]);
  useEffect(() => { multiPageCountRef.current = multiPageCount; }, [multiPageCount]);

  useEffect(() => {
    if (!onVoiceProblemRef) return;
    // Voice is NOT a coding-problem source. The problem must come from a
    // deliberate input — pasted text, a fetched URL, or an added screenshot —
    // so ambient interviewer speech can never be turned into a "problem" and
    // solved into a nonsense solution. The voice-router already stops routing
    // transcripts here; this handler is a no-op as belt-and-suspenders so no
    // future caller can accidentally fill/solve from voice.
    onVoiceProblemRef.current = () => {};
    return () => { if (onVoiceProblemRef) onVoiceProblemRef.current = null; };
  }, [onVoiceProblemRef]);

  useEffect(() => {
    if (!onScreenshotAppendRef) return;
    onScreenshotAppendRef.current = (text: string, starter?: string) => {
      const clean = typeof starter === 'string' && starter.trim() ? starter : null;
      // Set the captured editor template as the authoritative starter code so the
      // backend FILLS it (function stub + locked harness) instead of writing a
      // from-scratch solution HackerRank rejects.
      if (clean) setStarterCode(clean);
      setProblemText(prev => {
        const base = text ? (prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text) : prev;
        // Also surface the answer block IN the box so the user can see it was captured
        // (their explicit ask: the box must show problem statement AND the starter block).
        if (!clean) return base;
        return base ? `${base}\n\n--- Starter code (template to complete) ---\n${clean}` : `--- Starter code (template to complete) ---\n${clean}`;
      });
      setInputMode('paste');
      scheduleAutoGenerate();
    };
    return () => { onScreenshotAppendRef.current = null; };
  }, [onScreenshotAppendRef, scheduleAutoGenerate]);

  // Heuristic: does this OCR'd text look like a complete coding problem?
  // Checks for input/output sections, examples, constraints, or sufficient length.
  const looksComplete = (text: string): boolean => {
    if (!text || text.length < 150) return false;
    const t = text.toLowerCase();
    if (t.includes('constraint') || t.includes('sample input') || t.includes('sample output')) return true;
    if ((t.includes('input') && t.includes('output')) || t.includes('example')) return true;
    return text.length > 700; // long enough to probably be complete
  };

  // Multi-page screenshot OCR: extracts each page, concatenates, generates.
  // fromImageSnap=true → check completeness and prompt for more if cut off.
  // fromImageSnap=false (URL flow) → trust the screenshots, always generate.
  const extractAndGenerateFromDataUrls = useCallback(async (urls: string[], fromImageSnap = false) => {
    if (!token) { setError('Not authenticated'); return; }
    setIsProcessing(true);
    setError(null);
    const prevProblemText = problemTextRef.current;
    setProblemText('');
    try {
      const results = await Promise.all(urls.map(async (dataUrl, idx) => {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `snap-page-${idx + 1}.png`, { type: blob.type || 'image/png' });
        const formData = new FormData();
        formData.append('image', file);
        const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (!resp.ok) return null;
        return resp.json();
      }));
      const valid = results.filter(Boolean);
      if (!valid.length) {
        // fromImageSnap distinguishes the real Image tab (user chose a screenshot)
        // from the URL/auto fallback (backend couldn't scrape, so we silently
        // screenshotted the browser). "Try a clearer screenshot" is nonsense to
        // someone who typed a URL — give them the action that actually works.
        throw new Error(
          fromImageSnap
            ? 'Could not extract problem from screenshots — try a clearer screenshot'
            : "Couldn't read the problem from that page automatically. Paste the problem text into the box above, or make sure the coding tab is open and fully visible, then Fetch again.",
        );
      }
      const combinedText = valid.map(r => String(r.problem || '').trim()).filter(Boolean).join('\n\n');
      const extractedStarterCode = valid.map(r => r.starter_code).find(Boolean) || null;
      // What the screen is ASKING for. The extractor has always returned this and
      // this component has always thrown it away — so a screenshot of buggy code
      // with "what's wrong with this?" went to /solve, which treats starter_code
      // as a LOCKED TEMPLATE to reproduce byte-for-byte. The interviewer's bugs
      // were faithfully preserved and code was filled in around them.
      const screenTask: ScreenMode | null =
        valid.map(r => r.task).find(Boolean) || null;
      const detectedLang: string | null = valid.map(r => r.detected_language).find(Boolean) || null;
      const effectiveLang = detectedLang || resolveLanguage(combinedText);

      // Image flow completeness check: if the extracted text looks cut off,
      // re-enter the multi-page session and ask the user for more screenshots.
      // Two things this MUST get right, or the user is trapped mid-interview:
      //   1. Put the already-captured pages BACK into the pending collection.
      //      The Coding click drained pendingSnapUrlsRef before calling us, so
      //      without this a follow-up snap starts a fresh 1-page collection and
      //      silently discards page 1 — "snap more" could never accumulate.
      //   2. Nudge at most once per capture. looksComplete() is a heuristic and
      //      false-positives on short, self-contained problems; a second Coding
      //      click must always solve rather than re-block.
      // A 'review' / 'explain' screen is a CoFix job, not a solve job: the
      // deliverable is the defect list, not a new program. CoFix already owns the
      // tuned diagnose situation and the changes/walkthrough UI, so hand off
      // rather than growing a second reviewer here.
      //
      // This MUST run before the cut-off check below. A buggy five-line snippet
      // can never satisfy looksComplete() — it has no "constraints", no "sample
      // input", and is far under 700 chars — so the nudge fired first and the
      // review never happened. For a review there is nothing to be cut off in
      // the first place: the code on screen IS the whole artifact.
      //
      // TWO conditions, both load-bearing:
      //
      // fromImageSnap — the URL flow lands here too. HackerRank and Glider
      // assessments are auth-walled and JS-rendered, so /fetch-problem gives up
      // and we screenshot the browser instead, arriving with fromImageSnap
      // false. Typing a problem URL is an explicit "fetch this and solve it";
      // diverting it to CoFix because the OCR called the page a review reads as
      // "the URL stopped fetching". Only a deliberate snap can divert.
      //
      // extractedStarterCode — the divert is a UX upgrade (CoFix owns the diff
      // view), not the correctness guarantee. /solve resolves the situation
      // itself now, so a bare code screenshot with no editor panel is repaired
      // in place there rather than needing to be caught here. Requiring real
      // editor content keeps this narrow enough that it cannot misfire on a
      // problem statement.
      if (shouldDivertToCofix({ fromImageSnap, task: screenTask, starterCode: extractedStarterCode, problem: combinedText })) {
        cutoffPromptedRef.current = false;
        setIsProcessing(false);
        onSendToCofix?.(extractedStarterCode!, effectiveLang, {
          mode: screenTask!,
          // Only pass the statement as a hint when it is genuinely separate from
          // the code — echoing the code back as its own instruction confuses the
          // refine path into treating it as an edit request.
          hint: combinedText.trim() ? combinedText.slice(0, 500) : undefined,
        });
        return;
      }

      if (fromImageSnap && !cutoffPromptedRef.current && !looksComplete(combinedText)) {
        cutoffPromptedRef.current = true;
        pendingSnapUrlsRef.current = urls;
        setSnapImageUrls(urls);
        setImagePreview(urls[urls.length - 1] ?? null);
        setProblemText(combinedText);
        setInputMode('image');
        multiPageCapturingRef.current = true;
        setMultiPageCapturing(true);
        setMultiPageCount(urls.length);
        setError('Problem may be cut off — snap the rest and click Coding, or click Coding again to solve with what\'s captured.');
        setIsProcessing(false);
        return;
      }

      cutoffPromptedRef.current = false;
      setProblemText(combinedText);
      setSnapChipCode(combinedText);
      setStarterCode(extractedStarterCode);
      if (detectedLang) setLanguage(detectedLang);
      setInputMode('paste');
      // Show the extracted problem, but only solve if it's new (same capture
      // re-processed → skip). claimAutoGen keys on the combined OCR text.
      if (combinedText && claimAutoGen(combinedText)) {
        setStreamError(null); setTestResults([]); setTestCases([]); setOutput('');
        setShowFixPrompt(false); clearStreamChunks(); setParsedBlocks([]); setJsonSolution(null);
        setCode(getDefaultCode(effectiveLang));
        setActiveSolutionIdx(0); setIsOutputCollapsed(true);
        setProblemTab('solution');
        // Thread the classifier's verdict on the solve path so a bare code
        // screenshot is repaired in place instead of rewritten. Snap only, for
        // the same reason as the divert above: a fetched problem URL is a solve
        // request, and labelling it a review because the page happened to OCR
        // that way would answer a question the candidate did not ask.
        onSubmit(combinedText, effectiveLang, {
          ...(extractedStarterCode ? { starterCode: extractedStarterCode } : {}),
          ...(fromImageSnap && screenTask ? { task: screenTask } : {}),
        });
      }
    } catch (err: any) {
      setProblemText(prevProblemText);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, resolveLanguage, setLanguage, clearStreamChunks, setParsedBlocks, setStreamError, onSubmit, getDefaultCode]);

  const handleHackerrankFetch = async () => {
    const camo = (window as any).camo;
    if (!camo?.fetchHackerrankNow) {
      await dialogAlert({ title: 'Desktop only', message: 'HackerRank auto-fetch requires the Camora desktop app.' });
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await camo.fetchHackerrankNow();
      if (!result.ok) {
        await dialogAlert({ title: 'HackerRank fetch failed', message: result.error || 'Unknown error. Make sure Chrome/Brave is open on the HackerRank tab.' });
        if (result.needsScreenPermission) camo.openSystemPrivacy?.('screen');
        return;
      }
      // Windows / Linux cannot scrape the browser DOM, so the desktop side
      // returns the URL it read from the address bar instead. Route it through
      // the backend scraper, which handles HackerRank from a URL alone — this
      // is what makes "capture my open tab" work off macOS.
      if (result.url && !result.text) {
        // UI Automation also exposes the platform's editor as an accessible
        // control, so a Windows capture usually carries the real starter code
        // too. Seed it BEFORE fetching: the backend scraper does not always
        // return a template (word-order has none), and the verbatim editor
        // contents beat anything reconstructed from the statement.
        if (typeof result.starterCode === 'string' && result.starterCode.trim().length >= 5) {
          setStarterCode(result.starterCode);
          setLanguage(resolveLanguage(result.starterCode));
        }
        setProblemUrl(result.url);
        setInputMode('url');
        await handleFetchFromUrl(result.url, { auto: true });
        return;
      }
      if (result.text) {
        // DOM injection got the full problem text — use directly, no screenshot needed
        const lang = resolveLanguage(result.text);
        setProblemText(result.text);
        if (result.starterCode) setStarterCode(result.starterCode);
        setInputMode('paste');
        lastAutoGenSigRef.current = genSignature(result.text); // explicit fetch — suppress trailing auto re-solve
        setStreamError(null); setTestResults([]); setTestCases([]); setOutput('');
        setShowFixPrompt(false); clearStreamChunks(); setParsedBlocks([]); setJsonSolution(null);
        setCode(getDefaultCode(lang));
        setActiveSolutionIdx(0); setIsOutputCollapsed(true);
        setProblemTab('solution');
        onSubmit(result.text, lang, result.starterCode ? { starterCode: result.starterCode } : undefined);
      } else if (result.dataUrls) {
        // URL flow: keyboard-scroll captured all pages — OCR and generate.
        // fromImageSnap=false → skip completeness check, always generate.
        await extractAndGenerateFromDataUrls(result.dataUrls, false);
      } else if (result.dataUrl) {
        // URL flow single-page fallback — treat as complete, generate directly.
        await extractAndGenerateFromDataUrls([result.dataUrl], false);
      }
    } catch (err: any) {
      await dialogAlert({ title: 'HackerRank fetch error', message: err.message || 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };



  const handleFetchFromUrl = async (overrideUrl?: string, opts?: { auto?: boolean }) => {
    const urlToFetch = overrideUrl ?? problemUrl;
    if (!urlToFetch.trim()) { setError('Please enter a URL'); return; }
    if (!token) { setError('Not authenticated'); return; }

    setIsProcessing(true);
    setError(null);

    // Step 1: try backend scraper (works for LeetCode via GraphQL, static pages via HTML).
    // Step 2: if backend returns a non-2xx (auth-gated, JS-rendered, codepair, etc.),
    //         fall back to the desktop OCR pipeline — no dialog, no parallel path.
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fetch-problem`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: urlToFetch, language }),
      });

      if (!resp.ok) {
        // Say WHY. This used to fall through to the screenshot path without a
        // word, so an expired token (401) and a genuinely unscrapable platform
        // (422) were indistinguishable from the outside — both looked like "the
        // URL just doesn't fetch any more".
        const detail = await resp.json().catch(() => null);
        const reason = detail?.detail || detail?.error || `HTTP ${resp.status}`;
        const camo = (window as any).camo;
        setIsProcessing(false);
        if (resp.status === 401) {
          setError('Session expired — sign in again, then Fetch.');
          return;
        }
        if (camo?.fetchHackerrankNow) {
          setError(`Couldn't scrape the page (${reason}) — capturing your open tab instead…`);
          await handleHackerrankFetch();
        } else {
          setInputMode('image');
          await dialogAlert({
            title: 'Cannot scrape this URL',
            message: `${reason}\n\nTake a screenshot of the problem + code editor and drop it in the Image tab — Lumora will OCR it and generate a matching solution.`,
          });
        }
        return;
      }

      const data = await resp.json();
      const text = String(data.problem || '').trim();
      // Backend now returns the platform's editor stub (HackerRank `<lang>_template`,
      // LeetCode codeSnippets). Keep it so the solve preserves the harness verbatim
      // instead of writing from scratch — matches the screenshot/OCR path.
      const fetchedStarter = typeof data.starter_code === 'string' && data.starter_code.trim()
        ? data.starter_code
        : null;
      // Solve in the SAME language the template is in (detect from the concrete
      // starter code when present, so template-language and solve-language can't
      // diverge). resolveLanguage still honors an explicit dropdown choice.
      const effectiveLang = resolveLanguage(fetchedStarter || text);
      if (!text) {
        // A 200 with nothing in it. Silent before, which is the worst possible
        // shape for this: the request succeeded, so nothing looked wrong.
        const camo = (window as any).camo;
        setIsProcessing(false);
        if (camo?.fetchHackerrankNow) {
          setError('The page returned no problem text — capturing your open tab instead…');
          await handleHackerrankFetch();
        } else {
          setError('That page returned no problem text. Open the problem itself (not the list), or use the Image tab.');
        }
        return;
      }
      setProblemText(text);
      setStarterCode(fetchedStarter);
      setInputMode('paste');
      // Auto URL-mode fetch (mode switch / initialUrl) dedupes so re-entering
      // URL mode on the same problem can't re-solve. An explicit Fetch click
      // always solves, but records the signature so a trailing auto path won't.
      if (opts?.auto) {
        if (!claimAutoGen(text)) { setIsProcessing(false); return; }
      } else {
        lastAutoGenSigRef.current = genSignature(text);
      }
      setStreamError(null);
      setTestResults([]);
      setTestCases([]);
      setOutput('');
      setShowFixPrompt(false);
      clearStreamChunks();
      setParsedBlocks([]);
      setJsonSolution(null);
      setCode(getDefaultCode(effectiveLang));
      setActiveSolutionIdx(0);
      setIsOutputCollapsed(true);
      setProblemTab('solution');
      onSubmit(text, effectiveLang, fetchedStarter ? { starterCode: fetchedStarter } : undefined);
    } catch (err: any) {
      // The worst of the three: a thrown fetch (offline, CORS, DNS, the backend
      // unreachable) showed the user literally nothing on web and jumped
      // straight to screenshotting on desktop. "Nothing happens when I click
      // Fetch" was this branch.
      const camo = (window as any).camo;
      const reason = err?.message || 'network error';
      setIsProcessing(false);
      if (camo?.fetchHackerrankNow) {
        setError(`Couldn't reach the server (${reason}) — capturing your open tab instead…`);
        await handleHackerrankFetch();
      } else {
        setError(`Couldn't reach the server (${reason}). Check your connection and try Fetch again.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // When the user switches to URL mode, auto-detect Chrome's active tab URL (desktop only)
  // and immediately fetch the problem — same one-click-solve UX as IMAGE.
  // Only fires for known coding platforms; ignores GitHub, YouTube, etc.
  // Read the browser's active tab and, when it is a problem page, fetch it.
  //
  // Every branch here used to `return` with no trace, so a failure was
  // indistinguishable from the feature not existing: the field just sat on its
  // placeholder. Each exit now says what happened. The platform dropdown no
  // longer VETOES a detected URL either — it is a capture hint, and a URL that
  // isProblemPageUrl() accepts has already identified its own platform, so
  // rejecting a real leetcode.com/problems/... page because the chip still said
  // "hackerrank" discarded the exact thing the user was asking for.
  const detectBrowserUrl = useCallback(async (opts?: { manual?: boolean }) => {
    if (!(await waitForBridge())) {
      if (opts?.manual) {
        setError('Detecting the open tab needs either the Camora desktop app or the Camora Problem Bridge extension — otherwise paste the URL here.');
      }
      return;
    }
    setUrlDetectNote(null);
    try {
      const result = await getActiveProblemUrl();
      if (!result?.ok || !result.url) {
        // The common cause on macOS is Automation permission: reading Chrome's
        // address bar is an Apple Event, and a denied grant throws in main.js.
        setUrlDetectNote(
          result?.error
            ? `Couldn't read your browser tab: ${result.error}`
            : "Couldn't read your browser tab. On macOS, allow Camora under System Settings → Privacy & Security → Automation, then try Detect.",
        );
        return;
      }
      const url: string = result.url;
      if (!isProblemPageUrl(url)) {
        setUrlDetectNote(`Your active tab isn't a problem page — paste the URL instead.\n${url}`);
        return;
      }
      setProblemUrl(url);
      handleFetchFromUrl(url, { auto: true });
    } catch (err: any) {
      setUrlDetectNote(`Couldn't read your browser tab: ${err?.message || 'unknown error'}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inputMode !== 'url') return;
    detectBrowserUrl();
  }, [inputMode, detectBrowserUrl]);

  const extractAndMaybeGenerate = useCallback(async (file: File, autoGenerate: boolean) => {
    if (!token) { setError('Not authenticated'); return; }
    setIsProcessing(true);
    setError(null);
    const prevProblemText = problemTextRef.current;
    setProblemText('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || 'Failed to extract');
      const data = await resp.json();
      const text = String(data.problem || '').trim();
      const extractedStarterCode = data.starter_code || null;
      const detectedLang: string | null = data.detected_language || null;
      const effectiveLang = detectedLang || resolveLanguage(text);
      setProblemText(text);
      setSnapChipCode(text); // power quick-action chips after snap
      setStarterCode(extractedStarterCode);
      if (detectedLang) setLanguage(detectedLang);
      setInputMode('paste');
      if (autoGenerate && text) {
        // Mirror handleGenerateSolution's reset-then-submit pattern.
        setStreamError(null);
        setTestResults([]);
        setTestCases([]);
        setOutput('');
        setShowFixPrompt(false);
        clearStreamChunks();
        setParsedBlocks([]);
        setJsonSolution(null);
        setCode(getDefaultCode(effectiveLang));
        setActiveSolutionIdx(0);
        setIsOutputCollapsed(true);
        setProblemTab('solution');
        onSubmit(text, effectiveLang, extractedStarterCode ? { starterCode: extractedStarterCode } : undefined);
      }
    } catch (err: any) {
      setProblemText(prevProblemText); // restore previous text on OCR failure
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [token, setLanguage, clearStreamChunks, onSubmit]);

  // OCR a supplemental screenshot and APPEND its text to the existing problem.
  // Used for multi-page problems: take a 2nd/3rd screenshot and add to current
  // problem text without replacing it or triggering a new solution generation.
  // Returns true only when the capture added NEW problem text. Duplicate captures
  // (e.g. the desktop auto-poll re-snapping the same static screen) are skipped so
  // they neither inflate the page count nor keep resetting the auto-generate timer.
  const extractAndAppend = useCallback(async (file: File): Promise<boolean> => {
    if (!token) { setError('Not authenticated'); return false; }
    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || 'Failed to extract');
      const data = await resp.json();
      const text = String(data.problem || '').trim();
      // Capture the platform's editor template too — this path (F9/desktop
      // capture) previously read only the problem and dropped the starter code,
      // so generation had no HackerRank harness to fill. Set it so the auto-gen
      // timer threads it through as starterCode.
      const ocrStarter = typeof data.starter_code === 'string' && data.starter_code.trim()
        ? data.starter_code
        : null;
      if (ocrStarter) setStarterCode(ocrStarter);
      if (!text) return !!ocrStarter;
      // Skip duplicates: if this OCR text is already present in what we've captured,
      // it's the same screen re-snapped — don't append it again.
      const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const prev = problemTextRef.current;
      if (prev && norm(prev).includes(norm(text))) return false;
      const combined = (prev ? prev + '\n\n' + text : text).trim();
      setProblemText(combined);
      setSnapChipCode(combined);
      setInputMode('paste');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [token]);


  // Add a dataUrl to the IMAGE chip collection and update display state.
  const addToSnapCollection = useCallback((dataUrl: string) => {
    // Empty → first page means a brand-new capture, so the cut-off nudge is
    // owed again. Appending to an existing collection is the same capture and
    // must NOT re-arm it, or the user bounces off the warning a second time.
    if (pendingSnapUrlsRef.current.length === 0) cutoffPromptedRef.current = false;
    const newUrls = [...pendingSnapUrlsRef.current, dataUrl];
    pendingSnapUrlsRef.current = newUrls;
    setSnapImageUrls(newUrls);
    setImagePreview(dataUrl);
    multiPageCapturingRef.current = true;
    setMultiPageCapturing(true);
    setMultiPageCount(newUrls.length);
  }, []);

  // Remove one screenshot from the collection by index.
  const removeSnapImage = useCallback((idx: number) => {
    const newUrls = pendingSnapUrlsRef.current.filter((_, i) => i !== idx);
    pendingSnapUrlsRef.current = newUrls;
    setSnapImageUrls(newUrls);
    setMultiPageCount(newUrls.length);
    if (newUrls.length === 0) {
      multiPageCapturingRef.current = false;
      setMultiPageCapturing(false);
      setImagePreview(null);
    } else {
      setImagePreview(newUrls[newUrls.length - 1]);
    }
  }, []);

  // + Screenshot button in IMAGE chip — captures active browser window.
  const handleAddScreenshot = useCallback(async () => {
    if (!canRegionSnap()) {
      fileInputRef.current?.click(); // web fallback: open file picker
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      // Drag-to-select the problem area — works on a shared screen or a PDF,
      // not just a front browser window.
      const snap = await snapRegion();
      if (snap.cancelled) return;
      if (snap.error || !snap.dataUrl) throw new Error(snap.error || 'Screenshot failed.');
      addToSnapCollection(snap.dataUrl);
    } catch (err: any) {
      setError(err.message || 'Screenshot failed');
    } finally {
      setIsProcessing(false);
    }
  }, [addToSnapCollection]);

  // File input — add uploaded file to collection (don't OCR immediately).
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { addToSnapCollection(reader.result as string); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [addToSnapCollection]);

  // Drag-and-drop — same as file input.
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { addToSnapCollection(reader.result as string); };
    reader.readAsDataURL(file);
  }, [addToSnapCollection]);

  const addTestCase = () => { if (testCases.length < MAX_TEST_CASES) setTestCases([...testCases, { input: '', expected: '' }]); };
  // Marks the list user-owned so the extractor above does not re-add a case the
  // candidate deliberately deleted.
  const removeTestCase = (i: number) => {
    if (testCases.length > 1) { testCasesUserEdited.current = true; setTestCases(testCases.filter((_, j) => j !== i)); }
  };
  const updateTestCase = (i: number, field: 'input' | 'expected', value: string) => {
    testCasesUserEdited.current = true;
    const u = [...testCases]; u[i] = { ...u[i], [field]: value }; setTestCases(u);
  };

  const streamingSolution = streamText;
  const sd = jsonSolution;
  // MCQ answers reuse the `sd` channel but carry type:'mcq' + an `mcq` block
  // instead of solutions/code. They render an answer card, not code cards.
  const isMcqAnswer = !!(sd && sd.type === 'mcq' && sd.mcq);
  const mcq = isMcqAnswer ? sd.mcq : null;

  // Passed/failed counts
  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  // ── Analysis content renderers (const, not module-level, to avoid TDZ in bundler) ──

  const SEV_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    // Urgency ramp within the sanctioned palette (danger -> gold -> navy ->
    // neutral), not a rainbow. Tints via the Surface-Wash rule.
    CRITICAL: { bg: 'color-mix(in oklab, var(--danger) 12%, transparent)',        border: 'var(--danger)',        text: 'var(--danger)' },
    HIGH:     { bg: 'color-mix(in oklab, var(--cam-gold-leaf) 14%, transparent)', border: 'var(--cam-gold-leaf)',  text: 'var(--cam-gold-leaf-lt)' },
    MEDIUM:   { bg: 'color-mix(in oklab, var(--cam-primary) 12%, transparent)',   border: 'var(--cam-primary)',    text: 'var(--cam-primary)' },
    LOW:      { bg: 'color-mix(in oklab, var(--text-muted) 10%, transparent)',    border: 'var(--border-hover)',  text: 'var(--text-muted)' },
  };

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\b(?:CRITICAL|HIGH|MEDIUM|LOW)\b)/g);
    return parts.map((p, i) => {
      if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
        return <code key={i} style={{ background: 'rgba(38,97,156,0.15)', color: 'var(--cam-gold-leaf-lt)', border: '1px solid rgba(38,97,156,0.35)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 0 }}>{p.slice(1, -1)}</code>;
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
        return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
        return <em key={i} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{p.slice(1, -1)}</em>;
      if (SEV_COLORS[p]) {
        const s = SEV_COLORS[p];
        return <span key={i} style={{ display: 'inline-flex', alignItems: 'center', background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 4, padding: '0 6px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', lineHeight: '18px', verticalAlign: 'middle' }}>{p}</span>;
      }
      return p;
    });
  };

  const renderAnalysisContent = (content: string): React.ReactNode => {
    // Normalize section tags before segment splitting.
    //
    // The LLM produces code in two patterns:
    //   A) [CODE lang=x]\ncode\n[/CODE]          — code wrapped inside (correct)
    //   B) [CODE lang=x]\n[/CODE]\ncode lines    — code placed AFTER closing tag
    //
    // Pattern B produces an empty block header + orphaned plain text without this.
    // Absorb non-bracketed lines following [/CODE] into the preceding code block.
    // Also strip remaining unpaired [CODE] openers and all closing [/TAG] forms.
    const normalized = content
      .replace(
        /\[CODE(?:\s+lang=([\w-]+))?\]\s*([\s\S]*?)\s*\[\/CODE\]((?:\n[^[\n][^\n]*)*)/gi,
        (_: string, lang: string | undefined, inner: string, after: string) => {
          const raw = (inner + after).trim();
          if (!raw) return '';
          // Strip first line if the LLM echoed the language name inside the block
          const lines = raw.split('\n');
          const code = lines.length > 1 && lines[0].trim().toLowerCase() === (lang || '').toLowerCase()
            ? lines.slice(1).join('\n').trim()
            : raw;
          return code ? `\n\`\`\`${lang || ''}\n${code}\n\`\`\`\n` : '';
        }
      )
      .replace(/\[CODE(?:\s+lang=[\w-]+)?\]/gi, '')  // strip unpaired [CODE...] openers
      .replace(/\[\/[A-Z][A-Z0-9_\s-]*\]/g, '');     // strip all closing [/TAG] forms
    const segments = normalized.split(/(```[\w-]*\n[\s\S]*?```)/g);
    let questionCounter = 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {segments.map((seg, si) => {
          // ── Fenced code block ────────────────────────────────────────────
          const cm = seg.match(/^```([\w-]*)\n([\s\S]*)```$/);
          if (cm) {
            const lang = cm[1];
            const codeText = cm[2].replace(/\n$/, '');
            if (!codeText.trim()) return null; // skip empty blocks from pattern B mismatch
            return (
              <div key={si} style={{ borderRadius: 8, overflow: 'hidden', margin: '6px 0', border: '1px solid rgba(38,97,156,0.4)', boxShadow: '0 2px 8px rgba(3,19,46,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)', padding: '3px 10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--cam-gold-leaf-lt)' }}>{lang || 'code'}</span>
                </div>
                <pre style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#CBD5E1', background: '#03132E', whiteSpace: 'pre' as const, overflowX: 'auto' as const, margin: 0, lineHeight: 1.6 }}>{codeText}</pre>
              </div>
            );
          }
          // ── Text segment — line-by-line ──────────────────────────────────
          return (
            <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {seg.split('\n').map((line, li) => {
                const trimmed = line.trim();

                // Horizontal rule
                if (/^---+$/.test(trimmed))
                  return <div key={li} style={{ margin: '10px 0', borderTop: '1px solid var(--cam-gold-leaf)', opacity: 0.25 }} />;

                // [BRACKET LABEL] — section chip
                const bracketLabel = trimmed.match(/^\[([A-Z][A-Z\s/_-]{1,30})\]$/);
                if (bracketLabel)
                  return (
                    <div key={li} style={{ display: 'inline-flex', marginTop: 10, marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--cam-hero-strip)', border: '1px solid var(--cam-gold-leaf)', borderRadius: 5, padding: '2px 10px', fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--cam-gold-leaf-lt)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cam-gold-leaf)', flexShrink: 0 }} />
                        {bracketLabel[1]}
                      </span>
                    </div>
                  );

                // ### H3
                const h3 = trimmed.match(/^###\s+(.*)/);
                if (h3)
                  return <div key={li} style={{ fontWeight: 600, fontSize: 11.5, color: 'var(--cam-gold-leaf-lt)', marginTop: 8, marginBottom: 2 }}>{renderInline(h3[1])}</div>;

                // ## H2
                const h2 = trimmed.match(/^##\s+(.*)/);
                if (h2)
                  return <div key={li} style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--cam-gold-leaf-lt)', marginTop: 12, marginBottom: 3, paddingBottom: 3, borderBottom: '1px solid rgba(201,162,39,0.30)' }}>{renderInline(h2[1])}</div>;

                // # H1
                const h1 = trimmed.match(/^#\s+(.*)/);
                if (h1)
                  return <div key={li} style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--cam-gold-leaf-lt)', marginTop: 14, marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid rgba(201,162,39,0.45)' }}>{renderInline(h1[1])}</div>;

                // Question N: ... pattern
                const qMatch = trimmed.match(/^Question\s+(\d+)[:.]\s*(.*)/i);
                if (qMatch) {
                  questionCounter++;
                  return (
                    <div key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: 'var(--cam-primary-dk)', color: '#fff', fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: 1 }}>{qMatch[1]}</span>
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--cam-gold-leaf-lt)', lineHeight: 1.4, flex: 1 }}>{renderInline(qMatch[2])}</span>
                    </div>
                  );
                }

                // Answer: label
                const answerMatch = trimmed.match(/^Answer[:.]\s*(.*)/i);
                if (answerMatch)
                  return (
                    <div key={li} style={{ marginLeft: 28, marginTop: 2, paddingLeft: 10, paddingTop: 3, paddingBottom: 3, borderRadius: 4, background: 'rgba(38,97,156,0.08)' }}>
                      {answerMatch[1] ? <span style={{ color: 'var(--text-primary)', fontSize: 11.5 }}>{renderInline(answerMatch[1])}</span> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--cam-primary)', letterSpacing: '0.06em' }}>Answer</span>}
                    </div>
                  );

                // Severity line: "- Severity: CRITICAL"
                const sevLine = trimmed.match(/^[-•]?\s*Severity[:\s]+(\w+)/i);
                if (sevLine) {
                  const key = sevLine[1].toUpperCase() as keyof typeof SEV_COLORS;
                  const s = SEV_COLORS[key];
                  return s ? (
                    <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 2px', paddingLeft: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Severity</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 4, padding: '0 7px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', lineHeight: '18px' }}>{key}</span>
                    </div>
                  ) : <div key={li} style={{ margin: '2px 0' }}>{renderInline(line)}</div>;
                }

                // Bullet
                const bl = trimmed.match(/^[-*•]\s+(.*)/);
                if (bl)
                  return (
                    <div key={li} style={{ display: 'flex', gap: 8, margin: '3px 0', paddingLeft: 6 }}>
                      <span style={{ color: 'var(--cam-primary)', flexShrink: 0, marginTop: 3, width: 5, height: 5, borderRadius: '50%', background: 'var(--cam-primary)', display: 'inline-block' }} />
                      <span style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--text-primary)' }}>{renderInline(bl[1])}</span>
                    </div>
                  );

                // Numbered list
                const nl = trimmed.match(/^(\d+)\.\s+(.*)/);
                if (nl)
                  return (
                    <div key={li} style={{ display: 'flex', gap: 8, margin: '3px 0', paddingLeft: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 4, background: 'rgba(38,97,156,0.2)', border: '1px solid rgba(38,97,156,0.4)', color: 'var(--cam-primary-lt)', fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: 1 }}>{nl[1]}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--text-primary)' }}>{renderInline(nl[2])}</span>
                    </div>
                  );

                // Location / Fix / Problem field lines (Issues tab)
                const fieldMatch = trimmed.match(/^[-•]?\s*(Location|Problem|Fix|Note)[:\s]+(.*)/i);
                if (fieldMatch)
                  return (
                    <div key={li} style={{ display: 'flex', gap: 6, margin: '2px 0', paddingLeft: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--cam-primary)', flexShrink: 0, paddingTop: 1, minWidth: 52 }}>{fieldMatch[1]}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-primary)' }}>{renderInline(fieldMatch[2])}</span>
                    </div>
                  );

                if (!trimmed) return <div key={li} style={{ height: 5 }} />;
                return <div key={li} style={{ margin: '2px 0', fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-primary)' }}>{renderInline(line)}</div>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className={embedded ? 'flex-1 flex flex-col min-h-0 relative' : 'h-dvh w-full flex flex-col lumora-app-bg relative'}
      style={
        embedded
          ? {
              // Subtle atmospheric backdrop layered behind the panels —
              // navy spotlight at top-left + cyan wash at bottom-right,
              // doesn't compete with the editor or answer surfaces.
              background:
                'radial-gradient(ellipse 50% 40% at 15% 0%, rgba(38,97,156,0.08), transparent 70%),' +
                'radial-gradient(ellipse 60% 40% at 85% 100%, rgba(38,97,156,0.10), transparent 70%)',
            }
          : undefined
      }
    >
      <style>{`
        @keyframes coding-pulse-ring {
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
        .cam-line-highlight { background: color-mix(in oklab, var(--cam-primary) 16%, transparent); }
        .cam-line-highlight-gutter { border-left: 2px solid var(--cam-primary); }
      `}</style>
      {/* ═══ HEADER — hidden when embedded in LumoraShell ═══ */}
      {!embedded && (
      <header className="flex items-center justify-between h-11 px-3 shrink-0 relative z-20 lumora-winctl-safe" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold rounded transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)]" style={{ color: 'var(--cam-strip-text)' }}>
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px" style={{ background: 'var(--cam-strip-icon-border)' }} />
          <span className="font-extrabold text-xs md:text-sm" style={{ fontFamily: "var(--font-sans)", color: 'var(--cam-strip-heading)' }}>Coding</span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-500/15 border-red-500/30 text-red-300' :
              timerSeconds === 0 ? 'opacity-70' :
              'bg-[rgba(38,97,156,0.15)] border-[rgba(38,97,156,0.3)] text-[var(--accent-text)]'
            }`}>
              <div className="relative w-4 h-4">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeDasharray={`${timerPercent * 0.5} 50`} strokeLinecap="round" />
                </svg>
              </div>
              <span>{formatTime(timerSeconds)}</span>
              <button onClick={stopTimer} className="ml-1 opacity-75 hover:text-red-400 transition-colors" style={{ color: 'var(--cam-strip-text)' }} data-tip="Stop timer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => startTimer(m)}
                  className="px-1.5 py-0.5 text-[10px] font-mono opacity-75 hover:opacity-100 hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)] rounded transition-colors" style={{ color: 'var(--cam-strip-text)' }}
                  data-tip={`${m} min timer`}>
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
                  animation: 'coding-pulse-ring 1.4s ease-out infinite',
                }}
              />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cam-strip-heading)' }}>Generating</span>
            </div>
          )}

          <AudioCapture
            onTranscription={(text) => {
              const trimmed = text.trim();
              if (!trimmed) return;
              // On the Coding tab any spoken utterance is treated as a
              // problem statement — the candidate doesn't need to phrase
              // it like a question. Always fill the box AND auto-fire
              // the LLM so they don't have to click "Coding" after every
              // dictation.
              setProblemText(trimmed);
              setTimeout(() => onSubmit(trimmed, resolveLanguage(trimmed)), 500);
            }}
            autoStart={false}
            active={isTabActive}
            compact
          />
        </div>
      </header>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div ref={splitRowRef} className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── LEFT PANEL: Problem / Solution ── */}
        <div className={`w-full md:w-auto flex flex-col min-w-0 md:border-r border-b md:border-b-0 coding-left-panel max-h-[45dvh] md:max-h-none overflow-auto ${embedded ? 'border-[var(--border)]' : 'lumora-light-panel'}`} style={{ ['--left-w' as any]: `${leftPanelWidth}%`, background: t.surfaceBg, borderColor: t.cardBorder }}>
          {/* Tabs — LeetCode-style sharp pill toolbar matching the Lumora
              top bar grammar. Navy band + gold underline + bezelled pill
              container holding the Description / Solution toggles. */}
          <div
            // data-overlay-keep: exempt from the overlay's background-strip rule
            // (globals.css). Without it this navy band goes transparent in overlay
            // mode and the toolbar icons float loose on the meeting behind, leaving
            // only the gold underline to suggest a header.
            data-overlay-keep
            className="flex items-center gap-2 px-2 py-1 overflow-x-auto no-scrollbar"
            style={{
              background: 'var(--cam-hero-strip)',
              borderBottom: '1px solid var(--cam-gold-leaf)',
            }}
          >
            <div
              className="flex items-center gap-1 px-0.5 py-0.5 shrink-0"
              style={{
                background: 'var(--cam-strip-icon-bg)',
                border: '1px solid var(--cam-strip-icon-border)',
                borderRadius: 999,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.25)',
              }}
            >
              {/* Description — icon-only (document) */}
              <button
                onClick={() => setProblemTab('description')}
                data-tip="Description"
                aria-label="Description"
                className="flex items-center justify-center w-7 h-6 transition-[background-color,color,transform] active:scale-[0.98]"
                style={
                  problemTab === 'description'
                    ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)', borderRadius: 999, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
                    : { color: 'var(--cam-strip-text)', borderRadius: 999 }
                }
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
              </button>
              {/* Solution — icon-only (lightbulb) */}
              <button
                onClick={() => setProblemTab('solution')}
                data-tip="Solution"
                aria-label="Solution"
                className="flex items-center justify-center gap-1 w-7 h-6 transition-[background-color,color,transform] active:scale-[0.98]"
                style={
                  problemTab === 'solution'
                    ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)', borderRadius: 999, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
                    : { color: 'var(--cam-strip-text)', borderRadius: 999 }
                }
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0012 2z"/></svg>
                {isStreaming && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: problemTab === 'solution' ? '#020617' : 'var(--cam-gold-leaf-lt)' }} />}
              </button>
            </div>

            {/* Merged capture controls (Snap + input-mode icons) — supplied by
                LumoraShell as an inline <ScreenshotStrip/>. Renders in THIS
                row so coding shows a single toolbar instead of a separate
                strip above. Divider separates the tab pills from capture. */}
            {captureControls && (
              <>
                <div className="w-px h-4 shrink-0" style={{ background: 'var(--cam-strip-icon-border)' }} />
                {captureControls}
              </>
            )}

            {/* Reset — icon-only. Wipes every solution-side state so the user
                can dictate / paste / fetch a fresh problem in the same session
                without refreshing. handleNewProblem aborts any active stream. */}
            <button
              onClick={handleNewProblem}
              className="ml-auto shrink-0 flex items-center justify-center w-7 h-6 rounded-md transition-colors"
              style={{
                color: 'var(--cam-strip-text)',
                background: 'var(--cam-strip-icon-bg)',
                border: '1px solid var(--cam-strip-icon-border)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cam-strip-icon-border)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cam-strip-icon-bg)'; }}
              data-tip="Reset — clear everything for a fresh problem"
              aria-label="Reset"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {problemTab === 'description' && (
              <div>
                {/* Autopilot mode: when a coding platform is selected the user
                    never needs to manually input a problem. Replace the entire
                    Text/URL/Image picker with a single monitoring status bar. */}
                {/* Screen permission warning — autopilot mode, desktop only */}
                {codingPlatform && codingPlatform !== 'none' && screenPermStatus && screenPermStatus !== 'granted' && (
                  <div className="flex items-center gap-2 px-3 py-2 min-w-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span className="text-[11px] font-semibold truncate" style={{ color: '#f59e0b' }}>Screen Recording not granted — auto-detect paused</span>
                    <button onClick={() => (window as any).camo?.openSystemPrivacy?.('screen')} className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors hover:opacity-80" style={{ background: '#f59e0b', color: '#000' }}>Fix in Settings</button>
                  </div>
                )}

                <div className="p-3 md:p-4 space-y-3">
                  <div className="space-y-3">

                      {/* Input Areas */}
                      {inputMode === 'paste' && (
                        <div className="space-y-2">
                          <textarea id="problem-text"
                            value={problemText}
                            onChange={(e) => {
                              setProblemText(e.target.value);
                              setStarterCode(null);
                              // The "No problem captured yet…" banner is answered the
                              // moment there IS a problem. Leaving it up meant a red
                              // error sat over a filled-in box for the rest of the
                              // session, duplicating the readiness chip that already
                              // reports the same thing.
                              if (e.target.value.trim()) setError(null);
                            }}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            placeholder="Paste your coding problem here...&#10;&#10;Example: Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                            className="w-full h-[140px] sm:h-[180px] md:h-[220px] max-h-[40dvh] rounded-lg p-3 text-xs md:text-sm leading-relaxed placeholder:text-[var(--text-primary)] resize-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 focus:outline-none transition-all"
                            style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }}
                          />
                          {/* Multi-page capture session: auto-capture appending pages, generate after 8s idle */}
                          {multiPageCapturing && (
                            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                              style={{ background: t.sectionBg, border: '1px solid var(--cam-gold-leaf)' }}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-[var(--cam-gold-leaf)] animate-pulse shrink-0" />
                                <span className="text-xs font-semibold truncate" style={{ color: t.text }}>
                                  {multiPageCount} page{multiPageCount > 1 ? 's' : ''} captured — scroll for more
                                </span>
                              </div>
                              <button type="button"
                                onClick={() => {
                                  if (captureAutoGenTimerRef.current) clearTimeout(captureAutoGenTimerRef.current);
                                  multiPageCapturingRef.current = false;
                                  setMultiPageCapturing(false);
                                  setMultiPageCount(0);
                                  handleGenerateSolution();
                                }}
                                className="px-2 py-1 text-xs font-bold rounded shrink-0 transition-opacity hover:opacity-80"
                                style={{ background: 'var(--cam-primary-dk)', color: 'white' }}>
                                Generate Now
                              </button>
                            </div>
                          )}
                          {/* Manual add-page for web / non-auto flows */}
                          {problemText.trim() && !multiPageCapturing && (
                            <>
                              <input ref={appendFileInputRef} type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void extractAndAppend(f); e.target.value = ''; }} />
                              <button type="button" onClick={() => appendFileInputRef.current?.click()} disabled={isProcessing}
                                className="w-full py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50"
                                style={{ borderColor: t.inputBorder, color: t.textDim, background: t.sectionBg }}>
                                {isProcessing ? 'Appending…' : '+ Add Page'}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {inputMode === 'url' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input type="url" id="problem-url" name="problem-url" value={problemUrl} onChange={(e) => setProblemUrl(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !isProcessing && problemUrl.trim()) handleFetchFromUrl(); }}
                              placeholder="https://leetcode.com/problems/two-sum/"
                              className="flex-1 rounded-lg px-3 py-2 text-xs md:text-sm placeholder:text-[var(--text-dimmed)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 focus:outline-none transition-all"
                              style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                            {/* Auto-detect fires once when this mode opens, so a
                                tab switched afterwards had no way to be picked
                                up. This re-runs it on demand. */}
                            {(window as any).camo?.getActiveBrowserUrl && (
                              <button type="button" onClick={() => detectBrowserUrl({ manual: true })} disabled={isProcessing}
                                title="Read the URL from your open browser tab"
                                className="px-3 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                                style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }}>
                                Detect
                              </button>
                            )}
                            <button type="button" onClick={() => handleFetchFromUrl()} disabled={isProcessing || !problemUrl.trim()}
                              className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
                              {isProcessing ? 'Loading...' : 'Fetch'}
                            </button>
                          </div>
                          {urlDetectNote && (
                            <p className="text-[11px] leading-snug whitespace-pre-wrap break-all" style={{ color: 'var(--text-dimmed)' }}>
                              {urlDetectNote}
                            </p>
                          )}
                          <p className="text-center text-[10px] font-mono py-0.5 select-text" style={{ color: 'var(--text-dimmed)' }}>
                            build {__BUILD_ID__} · <RenderScale />
                          </p>
                        </div>
                      )}

                      {inputMode === 'image' && (
                        <div className="space-y-3">
                          {/* Multi-page window capture — desktop only */}
                          <ProblemCaptureStrip
                            kind="coding"
                            onProblemBuilt={(problem, starterCode, lang) => {
                              setProblemText(problem);
                              if (starterCode) setStarterCode(starterCode);
                              if (lang) setLanguage(lang);
                            }}
                          />

                          <div className="w-full h-px" style={{ background: 'var(--border)', opacity: 0.5 }} />

                          {/* Hidden file input */}
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                          {/* Two action buttons */}
                          <div className="flex gap-2">
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50"
                              style={{ borderColor: t.inputBorder, color: t.textDim, background: t.sectionBg }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                              Upload from Storage
                            </button>
                            <button type="button" onClick={handleAddScreenshot} disabled={isProcessing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
                              style={{ background: 'var(--accent)', color: 'white' }}>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                              {isProcessing ? 'Capturing…' : 'Screenshot'}
                            </button>
                          </div>

                          {/* Thumbnail grid — one tile per added screenshot */}
                          {snapImageUrls.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {snapImageUrls.map((url, i) => (
                                  <div key={i} className="relative group w-20 h-14 rounded overflow-hidden flex-shrink-0"
                                    style={{ border: '1px solid var(--border)' }}>
                                    <img src={url} alt={`Page ${i+1}`} className="w-full h-full object-cover" />
                                    <span className="absolute top-0.5 left-0.5 text-[9px] font-bold px-1 rounded leading-4"
                                      style={{ background: 'var(--accent)', color: '#fff' }}>{i + 1}</span>
                                    <button type="button" onClick={() => removeSnapImage(i)}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ background: 'var(--danger)' }}>×</button>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[11px]" style={{ color: t.textDim }}>
                                {snapImageUrls.length} screenshot{snapImageUrls.length > 1 ? 's' : ''} — click <strong>Coding</strong> when all pages are captured
                              </p>
                            </div>
                          ) : (
                            /* Drop zone when empty */
                            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                              className="border-2 border-dashed rounded-lg py-4 text-center"
                              style={{ borderColor: t.inputBorder }}>
                              <p className="text-xs" style={{ color: t.textDim }}>or drag & drop an image here</p>
                            </div>
                          )}

                          {isProcessing && (
                            <div className="flex items-center justify-center gap-2 py-1 text-xs" style={{ color: t.text }}>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Capturing screenshot…
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  {error && (
                    <div className="p-2.5 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>
                  )}

                  {/* Generate Button */}
                  <div className="flex items-center gap-2 w-full">
                    <ReadinessChip
                      blocking={blocking}
                      degrading={degrading}
                      onDismiss={dismiss}
                      actions={{
                        'io-contract': [{ label: 'Paste problem', primary: true, onClick: () => setProblemTab('description') }],
                        starter: [{ label: 'Paste template', onClick: () => setProblemTab('description') }],
                      }}
                    />
                    <button
                      onClick={() => {
                        if (captureAutoGenTimerRef.current) clearTimeout(captureAutoGenTimerRef.current);
                        const snapUrls = pendingSnapUrlsRef.current;
                        // Never be a silent dead button in a live interview. If there's
                        // nothing to solve — no pending snaps, no text, no capture running —
                        // say exactly what to do and jump to the paste box instead of
                        // swallowing the click (the old `disabled` guard did nothing here,
                        // and also wrongly blocked generating from pending screenshots).
                        if (!snapUrls.length && !problemText.trim() && !multiPageCapturing) {
                          setInputMode('paste');
                          setProblemTab('description');
                          setError('No problem captured yet. Paste it into the box above, or Snap with your coding tab open in Chrome, Brave, Edge, Arc, or Safari.');
                          setTimeout(() => document.getElementById('problem-text')?.focus(), 0);
                          return;
                        }
                        multiPageCapturingRef.current = false;
                        setMultiPageCapturing(false);
                        setMultiPageCount(0);
                        pendingSnapUrlsRef.current = [];
                        setSnapImageUrls([]);
                        setImagePreview(null);
                        if (snapUrls.length) {
                          void extractAndGenerateFromDataUrls(snapUrls, true);
                        } else {
                          handleGenerateSolution();
                        }
                      }}
                      disabled={isLoading}
                      className="flex-1 py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-[opacity,transform] active:scale-[0.98] flex items-center justify-center gap-2"
                      style={
                        degrading.length > 0
                          ? { background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning-text)', borderRadius: '10px' }
                          : { background: 'linear-gradient(135deg, var(--cam-primary-dk), var(--cam-primary-dk))', borderRadius: '10px' }
                      }>
                      {isLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                      ) : multiPageCapturing ? (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Coding ({multiPageCount} page{multiPageCount > 1 ? 's' : ''})</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Coding</>
                      )}
                      {degrading.length > 0 && !isLoading && <span aria-hidden="true">▲</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SOLUTION TAB — AI-Inspired Modern Display ═══ */}
            {problemTab === 'solution' && (
              <div className="p-2 md:p-3">
                {/* ── ONE TOOLBAR ROW ──
                    This was three stacked rows — analysis tabs, a cache banner
                    carrying a full sentence of prose, and the approach ladder —
                    costing ~110px above the answer that is the point of the
                    screen. Every text chip is now an icon or a dropdown, and the
                    prose moved into tooltips where it is available on demand
                    rather than permanently. */}
                {sd && !isStreaming && !isMcqAnswer && (
                  <div className="flex items-center gap-1 mb-3 px-1.5 py-1 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>

                    {/* Approach — one dropdown instead of N full-width tabs.
                        Hoisted out of the Code tab on purpose: the analysis
                        views are cached per solution (`${idx}_${tab}`), so
                        switching approach while reading Explain should retarget
                        it rather than be unreachable. */}
                    {sd.solutions?.length > 1 && (
                      <>
                        <ChipSelect
                          label="Approach"
                          value={String(activeSolutionIdx)}
                          options={sd.solutions.map((s: any, i: number) => ({
                            value: String(i),
                            label: `${s.name || `Solution ${i + 1}`}${s.complexity?.time ? ` · ${s.complexity.time}` : ''}`,
                          }))}
                          onChange={(v) => {
                            const i = Number(v);
                            const sol = sd.solutions[i];
                            if (!sol) return;
                            setActiveSolutionIdx(i);
                            const solCode = sol.code || sol.implementation || sol.solution
                              || (sol.explanations?.length > 0 ? sol.explanations.map((ex: any) => ex.code).filter(Boolean).join('\n') : null);
                            if (solCode) setCode(solCode);
                          }}
                        />
                        <div className="w-px h-4 shrink-0" style={{ background: 'var(--border)' }} />
                      </>
                    )}

                    {ANALYSIS_VIEWS.map(view => {
                      const active = analysisTab === view.id;
                      // Prefetching counts as loading: the spinner is what says
                      // "this is coming", and it is the honest state whether the
                      // request was fired by a click or by the prefetch queue.
                      const loading = analysisInFlight.includes(`${activeSolutionIdx}_${view.id}`);
                      const ready = !loading && view.id !== 'code' && !!analysisCache[`${activeSolutionIdx}_${view.id}`];
                      return (
                        <button
                          key={view.id}
                          onClick={() => view.id === 'code' ? setAnalysisTab('code') : handleAnalysis(view.id)}
                          className="relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0"
                          style={active
                            ? { background: 'var(--cam-hero-strip)', color: 'var(--cam-gold-leaf-lt)', border: '1px solid var(--cam-gold-leaf)' }
                            : { color: 'var(--text-muted)', border: '1px solid transparent' }}
                          data-tip={view.tip}
                          aria-label={view.label}
                          aria-pressed={active}
                        >
                          {loading ? (
                            <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {view.icon}
                            </svg>
                          )}
                          {/* Already-generated marker — the dot the text chips carried. */}
                          {ready && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                          )}
                        </button>
                      );
                    })}

                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      {/* Cache state — the icon alone. The sentence that used to
                          sit beside it is the tooltip now; it is the same
                          information, read once and never needed again. */}
                      {lastFromCache !== null && (
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-lg"
                          style={{ color: lastFromCache ? 'var(--cam-primary-dk)' : 'var(--text-muted)' }}
                          data-tip={lastFromCache
                            ? 'Loaded from cache — identical problem, served instantly from Redis. Regenerate for a fresh take.'
                            : 'Fresh solve — now cached, so repeat solves on this exact problem hit the cache.'}
                          aria-label={lastFromCache ? 'Loaded from cache' : 'Fresh solve'}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {lastFromCache ? (
                              <><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><polyline points="9 12 12 15 16 9" /></>
                            ) : (
                              <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>
                            )}
                          </svg>
                        </span>
                      )}
                      <button
                        onClick={handleRegenerate}
                        disabled={isStreaming || isLoading}
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'var(--cam-primary)', color: '#FFFFFF', border: '1px solid var(--cam-primary-dk)' }}
                        data-tip="Regenerate — force a fresh solve, ignoring the cache. The new result is cached too."
                        aria-label="Regenerate solution"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {/* Analysis content for active tab */}
                {sd && analysisTab !== 'code' && (
                  <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--cam-gold-leaf)', background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(38,97,156,0.07), transparent 70%), var(--bg-elevated)', boxShadow: '0 4px 20px rgba(3,19,46,0.18)' }}>
                    {/* Header strip */}
                    <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cam-gold-leaf)', display: 'inline-block' }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cam-gold-leaf-lt)', fontFamily: 'var(--font-mono)' }}>
                          {({ explain: 'Explain', issues: 'Issues', deepdive: 'Deep Dive' } as Record<string, string>)[analysisTab]}
                        </span>
                      </div>
                      {analysisInFlight.includes(`${activeSolutionIdx}_${analysisTab}`) && <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />}
                    </div>
                    {/* Content */}
                    <div className="p-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                      {(() => {
                        const key = `${activeSolutionIdx}_${analysisTab}`;
                        const content = analysisCache[key];
                        if (content) return renderAnalysisContent(content);
                        return (
                          <div className="flex items-center gap-2 py-2" style={{ color: 'var(--text-muted)' }}>
                            <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cam-primary)', borderTopColor: 'transparent' }} />
                            <span style={{ fontSize: 11, fontStyle: 'italic' }}>Generating analysis…</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {/* Stream/parse error — visible retry card instead of blank state.
                    Backend emits `error` events for 529/overloaded, parse failures,
                    and empty responses. We surface those here with a retry button. */}
                {streamError && !isStreaming && !sd && (
                  <div className="p-3 rounded-xl mb-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)' }}>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--danger)' }}>Couldn't generate solution</div>
                        <div className="text-[11px] leading-relaxed" style={{ color: t.textMuted }}>{streamError}</div>
                        <button
                          onClick={() => { setStreamError(null); handleGenerateSolution(); }}
                          disabled={!problemText.trim() || isLoading}
                          className="mt-2 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50"
                          style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF' }}
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Streaming state. As soon as the model starts emitting
                    the `code` field we show it character-by-character so
                    the user sees the answer being typed live (target:
                    ~1–2s to first visible character). Until the code
                    field begins, fall back to a thin skeleton row. */}
                {(isStreaming || (isLoading && !sd && !parsedBlocks?.length)) && !sd && (() => {
                  const liveCode = extractStreamingCode(streamingSolution);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--accent-subtle)', border: `1px solid ${t.cardBorder}` }}>
                        <div className="relative w-4 h-4 shrink-0">
                          <div className="absolute inset-0 border-2 border-transparent border-t-[var(--accent)] rounded-full animate-spin" />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: t.headerText }}>
                          {liveCode ? 'Streaming code…' : 'Generating solution…'}
                        </span>
                      </div>
                      {liveCode && liveCode.length > 0 ? (
                        <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                          <div className="h-8 px-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ background: t.headerBg, color: t.headerText, borderBottom: `1px solid ${t.cardBorder}` }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                            Live · Solution
                          </div>
                          <pre className="p-3 text-[12px] leading-[1.55] overflow-x-auto whitespace-pre" style={{ background: t.cardBg, color: t.headerText, fontFamily: 'var(--font-mono)' }}>
                            <code>{liveCode}</code>
                            <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm align-middle" style={{ background: 'var(--accent)' }} />
                          </pre>
                        </div>
                      ) : (
                        <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                          <div className="h-8 px-3 flex items-center gap-2" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                            <div className="w-5 h-5 rounded-md animate-pulse" style={{ background: t.badgeBg }} />
                            <div className="h-3 rounded animate-pulse" style={{ width: '55%', background: t.surfaceBg }} />
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="h-2.5 rounded animate-pulse" style={{ width: '85%', background: t.surfaceBg }} />
                            <div className="h-2.5 rounded animate-pulse" style={{ width: '70%', background: t.surfaceBg }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── MCQ ANSWER CARD ── */}
                {isMcqAnswer && mcq && (
                  <div className="space-y-3 solution-cards-appear">
                    {/* Answer banner */}
                    <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid var(--cam-primary)` }}>
                      <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap" style={{ background: 'var(--cam-hero-strip)', borderBottom: `1px solid var(--cam-primary)` }}>
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
                          {mcq.multiSelect ? 'Correct answers' : 'Correct answer'}
                        </span>
                        <span className="text-sm font-bold rounded-md px-2 py-0.5" style={{ color: '#FFFFFF', background: 'var(--cam-primary)' }}>
                          {Array.isArray(mcq.answer) ? mcq.answer.join(', ') : String(mcq.answer ?? '')}
                        </span>
                        {mcq.confidence && (
                          <span className="ml-auto text-[9px] font-mono uppercase tracking-wider rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>
                            {mcq.confidence} confidence
                          </span>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        {mcq.question && <p className="text-xs md:text-[13px] font-semibold leading-relaxed" style={{ color: t.text }}>{mcq.question}</p>}
                        {/* Options list */}
                        {Array.isArray(mcq.options) && (
                          <div className="space-y-1.5 pt-1">
                            {mcq.options.map((opt: any, i: number) => (
                              <div key={opt.key ?? i} className="flex items-start gap-2 rounded-lg px-2.5 py-1.5"
                                style={opt.correct
                                  ? { background: 'var(--accent-subtle)', border: '1px solid var(--cam-primary)' }
                                  : { background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
                                <span className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5"
                                  style={opt.correct
                                    ? { background: 'var(--cam-primary-dk)', color: '#fff' }
                                    : { background: t.badgeBg, color: t.badgeText }}>
                                  {opt.correct ? '✓' : (opt.key ?? String.fromCharCode(65 + i))}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[11px] md:text-xs leading-relaxed" style={{ color: opt.correct ? t.text : t.textMuted }}>
                                    <span className="font-bold">{opt.key ?? String.fromCharCode(65 + i)})</span> {opt.text}
                                  </span>
                                  {opt.reason && <span className="block text-[10px] leading-snug mt-0.5" style={{ color: t.textDim }}>{opt.reason}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Explanation */}
                    {mcq.explanation && (
                      <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: t.headerText }}>Why</span>
                        </div>
                        <p className="px-3 py-2.5 text-[11px] md:text-xs leading-relaxed" style={{ color: t.textMuted }}>{mcq.explanation}</p>
                      </div>
                    )}

                    {/* Say this out loud */}
                    {mcq.narration && (
                      <div className="rounded-lg" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(38,97,156,0.35)' }}>
                        <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-1.5">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-primary-dk)' }}>Say this out loud</span>
                          </div>
                          <button onClick={() => navigator.clipboard.writeText(mcq.narration)}
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded hover:bg-black/5" style={{ color: 'var(--cam-primary-dk)' }}>
                            Copy
                          </button>
                        </div>
                        <p className="px-2.5 py-2 text-[12px] leading-[1.55]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{mcq.narration}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* JSON Solution — Modern Cards */}
                {analysisTab === 'code' && sd && !isMcqAnswer && (
                  <div className="space-y-3 solution-cards-appear">


                    <AnswerBook
                      doc={docFromSolution(sd, activeSolutionIdx)}
                      onLineHover={(line, code, idx) => {
                        const resolved = line ?? (code ? lineForCode(code, idx ?? 0) : 0);
                        if (resolved) highlightLine(resolved); else clearHighlight();
                      }}
                      onLineClick={(line, code, idx) => {
                        const resolved = line ?? (code ? lineForCode(code, idx ?? 0) : 0);
                        if (resolved) highlightLine(resolved);
                      }}
                    />
                  </div>
                )}

                {/* Legacy block display */}
                {!sd && parsedBlocks && Array.isArray(parsedBlocks) && parsedBlocks.length > 0 && (
                  <AnswerBook doc={docFromBlocks(parsedBlocks)} />
                )}

                {/* Empty state */}
                {!sd && !(parsedBlocks && Array.isArray(parsedBlocks) && parsedBlocks.length > 0) && !streamingSolution && !isLoading && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: t.sectionBg }}>
                      <svg className="w-6 h-6" style={{ color: t.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-xs" style={{ color: t.textDim }}>Enter a problem and generate a solution</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal Resize Handle (desktop only) ── */}
        <div onMouseDown={() => { userSizedSplitRef.current = true; setIsResizingH(true); }}
          className="hidden md:flex w-1.5 bg-[var(--bg-elevated)] hover:bg-[rgba(38,97,156,0.1)] cursor-col-resize transition-colors items-center justify-center group shrink-0">
          <div className="w-0.5 h-8 bg-[var(--border)] group-hover:bg-[var(--accent)] rounded-full transition-colors" />
        </div>

        {/* ── RIGHT PANEL: Code Editor + Output ──
            The editable editor fills the space between the sticky header and the
            output panel and OWNS its scroll (see editor note below). The output
            panel is pinned beneath it. The column itself does not scroll — that
            auto-height + ancestor-scroll combo swallowed the wheel in docked /
            overlay windows, so nothing scrolled. */}
        <div ref={editorColRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden" style={{ background: t.surfaceBg, color: t.text }}>
          {/* Editor Header — sticky so Run / language / reset stay reachable while the column scrolls */}
          {/* data-overlay-keep — see the left panel's band: keeps this header a real
              surface in overlay mode instead of transparent chrome over the meeting. */}
          <div data-overlay-keep className="flex items-center justify-between px-2 py-1 lumora-winctl-safe sticky top-0 z-10" style={{ background: t.sectionBg, borderBottom: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-center gap-1.5">
              <ChipSelect
                label="Lang"
                value={language}
                disabled={isTranslating}
                options={[{ value: 'auto', label: 'Auto-detect' }, ...LANGUAGES.map(l => ({ value: l.id, label: l.label }))]}
                onChange={handleLanguageChange}
              />
              {isTranslating && (
                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--cam-primary)' }}>
                  <div className="w-3 h-3 border-2 border-[rgba(38,97,156,0.3)] border-t-[var(--cam-primary)] rounded-full animate-spin" />
                  Translating…
                </span>
              )}
              <button onClick={handleRun} disabled={isRunning}
                className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded disabled:opacity-50 transition-colors shadow-sm" style={{ background: 'var(--accent)', color: 'var(--cam-on-accent)' }}
                data-tip="Run (Ctrl+Enter)">
                {isRunning ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
                ) : (
                  <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Run</>
                )}
              </button>
              {showFixPrompt && (
                <button onClick={() => handleAutoFix(false)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-[#1B1D22] text-xs font-bold rounded-md hover:bg-amber-600 transition-colors shadow-sm"
                  data-tip="Auto-fix failed tests">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Auto-Fix
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onSendToCofix && (
                <button
                  onClick={() => onSendToCofix(code, language)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={{ color: 'var(--cam-gold-leaf-lt)', background: 'color-mix(in oklab, var(--cam-gold-leaf) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 28%, transparent)' }}
                  data-tip="Send solution to CoFix"
                >
                  → CoFix
                </button>
              )}
              <button onClick={handleReset} className="p-1.5 rounded-md transition-colors" style={{ color: t.textMuted }} data-tip="Reset">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={handleCopyCode} className="p-1.5 rounded-md transition-colors" style={copyFeedback ? { color: 'var(--cam-primary)', background: t.badgeBg } : { color: t.textDim }} data-tip="Copy code">
                {copyFeedback ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Code Editor — an EDITABLE editor MUST own its scrolling so the
              caret and click-to-place land on the correct line. Auto-height
              handed scrolling to the ancestor column, which both desynced the
              caret AND (in docked/overlay windows) let Monaco swallow the wheel
              so the user could scroll neither up nor down. It now fills the
              space between the header and the output panel and scrolls
              internally. ── */}
          <div
            className="min-h-0"
            style={autoFitEditorHeight
              // flex-shrink stays on: a long file still yields space rather than
              // pushing the output panel off the bottom of the column.
              ? { flex: '0 1 auto', height: editorContentH, minHeight: 160 }
              : { flex: '1 1 0%' }}
          >
          <SharedCodeEditor
            height="100%"
            language={getLanguageById(language)?.monaco || 'python'}
            code={code}
            onChange={setCode}
            theme="vs-dark"
            fontSize={11}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.updateOptions({
                fontFamily: "'IBM Plex Mono', 'Cascadia Code', monospace",
                // Ligatures + negative letter-spacing desync Monaco's per-char
                // width measurement from the rendering, drifting the caret/click
                // toward the line end. Plain metrics = accurate hit-testing.
                fontLigatures: false,
                letterSpacing: 0,
                lineHeight: 19,
              });
            }}
          />
          </div>

          {/* ── Vertical Resize Handle ── */}
          {!isOutputCollapsed && (
            <div onMouseDown={(e) => { vResizeRef.current = { startY: e.clientY, startH: outputPanelHeight ?? (outputPanelRef.current?.offsetHeight ?? 180) }; setIsResizingV(true); }}
              className="h-1.5 hover:bg-[rgba(38,97,156,0.1)] cursor-row-resize transition-colors flex justify-center items-center group"
              style={{ background: t.sectionBg }}>
              <div className="w-8 h-0.5 group-hover:bg-[var(--accent)] rounded-full transition-colors" style={{ background: t.textDim }} />
            </div>
          )}

          {/* Custom input (stdin) — "Test against custom input" */}
          <div className="border-t px-3 py-2 shrink-0" style={{ borderColor: t.cardBorder, background: t.sectionBg }}>
            <CustomInputPanel
              enabled={customInputEnabled}
              value={customInput}
              onToggle={setCustomInputEnabled}
              onChange={setCustomInput}
              disabled={isRunning}
            />
          </div>

          {/* ═══ BOTTOM PANEL: Test Cases / Output ═══ */}
          <div ref={outputPanelRef} className={`border-t flex flex-col ${autoFitEditorHeight ? 'flex-1 min-h-0' : 'shrink-0'}`} style={{ borderColor: t.cardBorder, background: t.surfaceBg, height: isOutputCollapsed ? 36 : (autoFitEditorHeight ? undefined : (outputPanelHeight ?? undefined)), minHeight: autoFitEditorHeight ? 180 : undefined, maxHeight: isOutputCollapsed || autoFitEditorHeight ? undefined : (outputPanelHeight != null ? undefined : '75vh') }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1 border-b shrink-0" style={{ background: t.sectionBg, borderColor: t.cardBorder }}>
              <div className="flex items-center gap-1">
                <button onClick={() => { setOutputTab('testcases'); setIsOutputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-colors ${
                    outputTab === 'testcases' && !isOutputCollapsed ? 'bg-[var(--accent)] text-white' : ''
                  }`}
                  style={!(outputTab === 'testcases' && !isOutputCollapsed) ? { color: t.tabText } : undefined}>Test Cases</button>
                <button onClick={() => { setOutputTab('output'); setIsOutputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    outputTab === 'output' && !isOutputCollapsed ? 'bg-[var(--accent)] text-white' : ''
                  }`}
                  style={!(outputTab === 'output' && !isOutputCollapsed) ? { color: t.tabText } : undefined}>
                  Output
                  {totalTests > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={passedCount === totalTests
                        ? { background: t.passedBg, color: t.passedText }
                        : { background: t.failedBg, color: t.failedText }
                      }>{passedCount}/{totalTests}</span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {outputLog.length > 0 && (
                  <button
                    onClick={() => { setOutputLog([]); setOutput(''); }}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-opacity opacity-50 hover:opacity-90"
                    style={{ color: t.textMuted }}
                  >Clear</button>
                )}
                <button onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                  className="p-1 rounded transition-colors" style={{ color: t.textMuted }}>
                  <svg className={`w-3 h-3 transition-transform ${isOutputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            {!isOutputCollapsed && (
              <div className={`${outputPanelHeight != null || autoFitEditorHeight ? 'flex-1 min-h-0' : ''} overflow-y-auto p-2 md:p-3`}>
                {outputTab === 'testcases' && (
                  <div className="space-y-2">
                    {testCases.map((tc, i) => (
                      <div key={i} className="rounded-lg p-2" style={{ border: `1px solid ${t.cardBorder}`, background: t.sectionBg }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>Case {i + 1}</span>
                          {testCases.length > 1 && (
                            <button onClick={() => removeTestCase(i)} className="text-[10px] transition-colors" style={{ color: t.textDim }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')} onMouseLeave={(e) => (e.currentTarget.style.color = t.textDim)}>Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-medium mb-0.5 uppercase" style={{ color: t.textDim }}>Input</label>
                            <textarea value={tc.input} onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                              placeholder="nums = [2,7], target = 9"
                              className="w-full h-10 rounded-md p-1.5 text-xs placeholder:text-[var(--text-dimmed)] resize-none focus:border-[var(--accent)] focus:outline-none font-mono"
                              style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                          </div>
                          <div>
                            <label className="block text-[9px] font-medium mb-0.5 uppercase" style={{ color: t.textDim }}>Expected</label>
                            <textarea value={tc.expected} onChange={(e) => updateTestCase(i, 'expected', e.target.value)}
                              placeholder="[0, 1]"
                              className="w-full h-10 rounded-md p-1.5 text-xs placeholder:text-[var(--text-dimmed)] resize-none focus:border-[var(--accent)] focus:outline-none font-mono"
                              style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {testCases.length < MAX_TEST_CASES && (
                      <button onClick={addTestCase}
                        className="w-full py-1.5 border border-dashed text-[10px] font-semibold rounded-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                        style={{ borderColor: t.inputBorder, color: t.textDim }}>
                        + Add Test Case ({testCases.length}/{MAX_TEST_CASES})
                      </button>
                    )}
                  </div>
                )}

                {outputTab === 'output' && (
                  <div className="space-y-2">
                    {/* Structured test results */}
                    {testResults.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {testResults.map((r, i) => (
                          <div key={i} className="rounded-lg border p-2 text-xs transition-[border-color,background-color]"
                            style={r.passed
                              ? { borderColor: t.passedBorder, background: t.passedBg }
                              : { borderColor: t.failedBorder, background: t.failedBg }
                            }>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {r.passed ? (
                                <div className="w-4 h-4 rounded-full bg-[var(--success)] flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--danger)' }}>
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              )}
                              <span className="font-bold" style={{ color: r.passed ? t.passedText : t.failedText }}>Test {i + 1}</span>
                            </div>
                            <div className="space-y-0.5 font-mono text-[10px]">
                              <div><span style={{ color: t.textDim }}>In:</span> <span style={{ color: t.text }}>{r.input}</span></div>
                              <div><span style={{ color: t.textDim }}>Exp:</span> <span style={{ color: t.text }}>{r.expected}</span></div>
                              <div><span style={{ color: t.textDim }}>Out:</span> <span style={{ color: r.passed ? t.passedText : t.failedText }}>{r.output}</span></div>
                              {r.error && <div className="mt-1" style={{ color: 'var(--danger)' }}>{r.error}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Auto-fix prompt — moved to header next to Run button */}

                    {/* Output log */}
                    {outputLog.length > 0 ? (
                      outputLog.map((entry, i) => {
                        const hasDivider = entry.text.includes('─'.repeat(40));
                        const displayText = hasDivider ? entry.text.split('─'.repeat(40))[1]?.trim() : entry.text;
                        const isErrEntry = !hasDivider && (entry.text.startsWith('Error:') || entry.text.startsWith('ERROR:') || entry.text.startsWith('Traceback') || /^error:/i.test(entry.text));
                        return (
                          <div key={i}>
                            <div className="flex items-center gap-2 py-1">
                              <span className="font-mono text-[9px] tabular-nums shrink-0" style={{ color: t.textDim }}>
                                {entry.ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                              </span>
                              <div className="flex-1 h-px" style={{ background: t.cardBorder }} />
                            </div>
                            {displayText && (
                              <pre className="font-mono text-xs whitespace-pre-wrap p-2 rounded-lg" style={{ color: isErrEntry ? 'var(--danger)' : hasDivider ? t.textMuted : t.text, background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
                                {displayText}
                              </pre>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {isRunning && (
                          <div className="flex items-center gap-2 py-2 text-xs italic" style={{ color: t.textDim }}>
                            <span className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                            Executing…
                          </div>
                        )}
                        {!isRunning && !testResults.length && (
                          <div className="text-center py-4 text-xs" style={{ color: t.textDim }}>
                            Click <span className="font-bold">Run</span> to execute your code <span className="font-mono" style={{ color: t.textDim }}>(Ctrl+Enter)</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
