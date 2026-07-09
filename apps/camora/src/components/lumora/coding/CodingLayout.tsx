import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme as useGlobalTheme } from '@/hooks/useTheme';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import { LANGUAGES, getLanguageById } from '@/data/languages';
import { dialogAlert } from '@/components/shared/Dialog';
import Chip from '@/components/shared/ui/Chip';
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT } from '@/lib/companyContext';
import { ProblemCaptureStrip } from '@/components/lumora/shared/ProblemCaptureStrip';
import { CustomInputPanel } from '@/components/shared/CustomInputPanel';
import { codingChecks } from '@/components/lumora/shared/readiness';
import { useToolReadiness } from '@/components/lumora/shared/useToolReadiness';
import { ReadinessChip } from '@/components/lumora/shared/ReadinessChip';
import { ChipSelect } from '@/components/lumora/shared/ChipSelect';
import { isProblemPageUrl } from '@/lib/problemPageUrl';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const SNAP_CHIPS = [
  { label: 'Find Issues', prompt: 'Find all bugs, security vulnerabilities, and issues in this code. For each issue explain what is wrong and provide a specific fix with corrected code.' },
  { label: 'Explain', prompt: 'Explain what this code does step by step. Describe the purpose of each key section.' },
  { label: 'Optimize', prompt: 'Suggest concrete performance and quality improvements for this code with specific examples.' },
  { label: 'Write Tests', prompt: 'Write comprehensive unit tests covering happy paths, edge cases, and error conditions for this code.' },
] as const;

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

const MAX_TEST_CASES = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTestCasesFromProblem(text: string): Array<{ input: string; expected: string }> {
  const testCases: Array<{ input: string; expected: string }> = [];
  let match;

  const examplePattern = /Example\s*\d*[:\s]*\n?Input[:\s]*([^\n]+(?:\n(?!Output)[^\n]+)*)\n?Output[:\s]*([^\n]+)/gi;
  while ((match = examplePattern.exec(text)) !== null) {
    testCases.push({ input: match[1].trim(), expected: match[2].trim() });
  }

  if (testCases.length === 0) {
    const arrowPattern = /Input[:\s]*(.+?)\s*[-=]>\s*Output[:\s]*(.+)/gi;
    while ((match = arrowPattern.exec(text)) !== null) {
      testCases.push({ input: match[1].trim(), expected: match[2].trim() });
    }
  }

  if (testCases.length === 0) {
    const assignPattern = /(\w+\s*=\s*\[[^\]]+\](?:,\s*\w+\s*=\s*[^\n,]+)*)\s*\n?\s*Output[:\s]*(\[[^\]]+\]|[^\n]+)/gi;
    while ((match = assignPattern.exec(text)) !== null) {
      testCases.push({ input: match[1].trim(), expected: match[2].trim() });
    }
  }

  return testCases.length > 0 ? testCases.slice(0, MAX_TEST_CASES) : [{ input: '', expected: '' }];
}

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
  onSubmit: (problem: string, language: string, options?: { bypassCache?: boolean; starterCode?: string }) => void;
  isLoading?: boolean;
  onBack: () => void;
  initialProblem?: string;
  /** Pre-fill the URL input and auto-fetch the problem on mount (e.g. from ?url= query param) */
  initialUrl?: string;
  initialStarterCode?: string | null;
  /** When true, hides internal header and uses flex-1 instead of h-screen (for embedding in LumoraShell) */
  embedded?: boolean;
  /** Called when user clicks "→ CoFix" chip; receives current editor code + language */
  onSendToCofix?: (code: string, lang: string) => void;
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

export function CodingLayout({ onSubmit, isLoading, onBack, initialProblem, initialUrl, initialStarterCode, embedded, onVoiceProblemRef, pendingHackerrankCapture, onHackerrankCaptureConsumed, pendingHackerrankText, onHackerrankTextConsumed, pendingHackerrankStarterCode, onHackerrankStarterCodeConsumed, pendingHackerrankDataUrls, onHackerrankDataUrlsConsumed, codingPlatform, onEmbeddedTranscription, isTabActive, onScreenshotAppendRef, onNewProblemCallback, externalInputMode, onExternalInputModeChange, onSendToCofix, captureControls }: CodingLayoutProps) {
  const { token } = useAuth();
  const { theme: globalTheme } = useGlobalTheme();
  const t = useTheme(globalTheme === 'dark');

  // Core state
  const [language, setLanguage] = useState('python');
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
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [fixError, setFixError] = useState('');
  // Auto-collapse input panel in autopilot mode (platform selected) so solution fills the screen.
  const [isInputCollapsed, setIsInputCollapsed] = useState(() => !!(codingPlatform && codingPlatform !== 'none'));

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
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const autoAnalysisFiredForRef = useRef<number>(-1);

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
  const [openSection, setOpenSection] = useState<string>('approach');

  // ── Line-binding: Code Walkthrough row → Monaco editor line (row → editor only) ──
  const editorRef = useRef<any>(null);
  const decoColRef = useRef<any>(null); // Monaco decorations collection
  // The editor auto-heights, so it has no internal scroll — its scrolling
  // ancestor (the right column) must scroll to bring a line into view.
  const editorColRef = useRef<HTMLDivElement>(null);
  const highlightLine = useCallback((line: number) => {
    const ed = editorRef.current;
    if (!ed || !line || line < 1) return;
    // Scroll the editor's column so the target line is centered. getTopForLineNumber
    // gives the line's y within the (fully-expanded) editor content; translate that
    // to the scroll container via bounding rects.
    const col = editorColRef.current;
    if (col) {
      try {
        const node = ed.getDomNode();
        if (node) {
          const top = ed.getTopForLineNumber(line);
          const delta = (node.getBoundingClientRect().top + top) - (col.getBoundingClientRect().top + col.clientHeight / 2);
          col.scrollTo({ top: col.scrollTop + delta, behavior: 'smooth' });
        }
      } catch { /* ignore */ }
    }
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
  const [outputPanelHeight, setOutputPanelHeight] = useState(180);
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

  // The submitter promotes a pasted template to starter code (handleGenerateSolution).
  // The chip MUST read the same value, or it warns about a template the backend will
  // happily detect — the textarea's onChange nulls `starterCode` on every keystroke.
  const effectiveStarterCode = starterCode || (isCodeTemplate(problemText) ? problemText : null);

  const readinessChecks = codingChecks({
    problemText,
    starterCode: effectiveStarterCode,
    company: activeAssistant?.company ?? null,
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
  const handleAnalysis = useCallback(async (tab: 'explain' | 'issues' | 'deepdive') => {
    const sd = jsonSolution;
    const solCode = sd?.solutions?.[activeSolutionIdx]?.code
      || sd?.solutions?.[0]?.code
      || sd?.code
      || code;
    if (!solCode?.trim() || !token) return;
    const cacheKey = `${activeSolutionIdx}_${tab}`;
    if (analysisCacheRef.current[cacheKey]) { setAnalysisTab(tab); return; }
    analysisAbortRef.current?.abort();
    const abort = new AbortController();
    analysisAbortRef.current = abort;
    setAnalysisTab(tab);
    setAnalysisLoading(tab);
    const lang = resolveLanguage();
    const prompts: Record<string, string> = {
      explain: `Analyze this ${lang} solution and provide:\n1. One sentence summary of what it does.\n2. Step-by-step numbered walkthrough of the algorithm.\n3. The key insight that makes this approach work.\n\nCode:\n\`\`\`${lang}\n${solCode}\n\`\`\``,
      issues: `Review this ${lang} code and list all bugs, edge cases, and quality issues. For each issue:\n- Severity: CRITICAL / HIGH / MEDIUM / LOW\n- Location: line or function name\n- Problem: what is wrong\n- Fix: corrected code snippet\n\nCode:\n\`\`\`${lang}\n${solCode}\n\`\`\``,
      deepdive: `Generate 3 deep-dive questions about this ${lang} solution. For each question provide a thorough answer. Focus on: why this approach, edge cases, and how to extend it.\n\nCode:\n\`\`\`${lang}\n${solCode}\n\`\`\``,
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
      if (err?.name !== 'AbortError') setAnalysisCache(prev => ({ ...prev, [cacheKey]: `Error: ${err.message}` }));
    } finally {
      setAnalysisLoading(null);
    }
  }, [jsonSolution, activeSolutionIdx, code, token, resolveLanguage]);

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
    setAnalysisCache({});
    setAnalysisTab('code');
    lastAutoGenSigRef.current = genSignature(text); // explicit regenerate — bypass dedup, refresh signature
    onSubmit(text, resolveLanguage(text), { ...(effectiveStarterCode ? { starterCode: effectiveStarterCode } : {}) });
  }, [problemText, language, effectiveStarterCode, isLoading, isStreaming, onSubmit, resolveLanguage]);

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
    setCollapsedCards(new Set());
    setCode(getDefaultCode(language));
    clearStreamChunks();
    setParsedBlocks([]);
    setLastFromCache(null);
    setSnapChipCode(null);
    analysisAbortRef.current?.abort();
    setAnalysisCache({});
    setAnalysisTab('code');
    autoAnalysisFiredForRef.current = -1;
    useSessionStore.getState().setLiveSolveContext(null);
    lastAutoGenSigRef.current = ''; // clear dedup so re-entering the same problem solves again
    onNewProblemCallback?.();
  }, [clearStreamChunks, setParsedBlocks, setStreamError, setLastFromCache, language, onNewProblemCallback]);

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
        autoGenRef.current.active = false;
        const directOut = data.direct_output || '(no output)';
        setOutput(directOut);
        setOutputLog(prev => [...prev, { ts: new Date(), text: directOut }]);
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

  // Extract test cases from problem text — only if user hasn't manually edited any
  const testCasesUserEdited = useRef(false);
  useEffect(() => {
    if (problemText && !testCasesUserEdited.current) {
      const extracted = extractTestCasesFromProblem(problemText);
      if (extracted.length > 0) setTestCases(extracted);
    }
  }, [problemText]);

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
      setCollapsedCards(new Set());
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
        const camo = (window as any).camo;
        // getActiveBrowserUrl resolves to { ok, url, browser } (or { ok:false, error }),
        // never a bare string — extract .url before using it.
        const activeInfo = camo?.getActiveBrowserUrl ? await camo.getActiveBrowserUrl() : null;
        const activeUrl: string | null = activeInfo?.ok && activeInfo.url ? activeInfo.url : null;
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
                setCollapsedCards(new Set());
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
    setCollapsedCards(new Set());
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
    setCollapsedCards(new Set());
    setTestCases([{ input: '', expected: '' }]);
    testCasesUserEdited.current = false;
  }, [language, clearStreamChunks, setParsedBlocks]);

  const handleGenerateSolution = () => {
    if (!problemText.trim()) { setError('Please enter a problem first'); return; }
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
    setAnalysisCache({});
    setAnalysisTab('code');
    const effectiveLang = language === 'auto' ? detectLanguage(problemText) : language;
    setCode(getDefaultCode(effectiveLang));
    setCollapsedCards(new Set());
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
      setIsInputCollapsed(false);
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
      if (!valid.length) throw new Error('Could not extract problem from screenshots — try a clearer screenshot');
      const combinedText = valid.map(r => String(r.problem || '').trim()).filter(Boolean).join('\n\n');
      const extractedStarterCode = valid.map(r => r.starter_code).find(Boolean) || null;
      const detectedLang: string | null = valid.map(r => r.detected_language).find(Boolean) || null;
      const effectiveLang = detectedLang || resolveLanguage(combinedText);

      // Image flow completeness check: if the extracted text looks cut off,
      // re-enter the multi-page session and ask the user for more screenshots.
      if (fromImageSnap && !looksComplete(combinedText)) {
        setProblemText(combinedText);
        setInputMode('image');
        multiPageCapturingRef.current = true;
        setMultiPageCapturing(true);
        setMultiPageCount(urls.length);
        setError('Problem appears cut off — snap more screenshots to capture the rest, then click Coding.');
        setIsProcessing(false);
        return;
      }

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
        setCollapsedCards(new Set()); setActiveSolutionIdx(0); setIsOutputCollapsed(true);
        setProblemTab('solution');
        onSubmit(combinedText, effectiveLang, extractedStarterCode ? { starterCode: extractedStarterCode } : undefined);
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
        setCollapsedCards(new Set()); setActiveSolutionIdx(0); setIsOutputCollapsed(true);
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


  // Ref so acceptImage can be called without a forward-reference TDZ.
  // acceptImage is declared ~150 lines below; putting it in the
  // useCallback deps array would access the const before initialization.
  const acceptImageRef = useRef<((file: File) => void) | null>(null);

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
        // Backend can't scrape this URL — silently fall back to screenshot OCR.
        const camo = (window as any).camo;
        setIsProcessing(false);
        if (camo?.fetchHackerrankNow) {
          await handleHackerrankFetch();
        } else {
          // Web-only: tell the user to use the Image tab.
          setInputMode('image');
          await dialogAlert({
            title: 'Cannot scrape this URL',
            message: 'This platform is auth-gated or JS-rendered and cannot be scraped directly. Take a screenshot of the problem + code editor and drop it in the Image tab — Lumora will OCR it and generate a matching solution.',
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
        // Empty response — same fallback
        const camo = (window as any).camo;
        setIsProcessing(false);
        if (camo?.fetchHackerrankNow) { await handleHackerrankFetch(); }
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
      setCollapsedCards(new Set());
      setActiveSolutionIdx(0);
      setIsOutputCollapsed(true);
      setProblemTab('solution');
      onSubmit(text, effectiveLang, fetchedStarter ? { starterCode: fetchedStarter } : undefined);
    } catch {
      // Network error — fall back to OCR on desktop, show nothing on web.
      const camo = (window as any).camo;
      setIsProcessing(false);
      if (camo?.fetchHackerrankNow) { await handleHackerrankFetch(); }
    } finally {
      setIsProcessing(false);
    }
  };

  // When the user switches to URL mode, auto-detect Chrome's active tab URL (desktop only)
  // and immediately fetch the problem — same one-click-solve UX as IMAGE.
  // Only fires for known coding platforms; ignores GitHub, YouTube, etc.
  useEffect(() => {
    if (inputMode !== 'url') return;
    const camo = (window as any).camo;
    if (!camo?.getActiveBrowserUrl) return;
    const platformDomain: Record<string, string> = {
      hackerrank: 'hackerrank.com',
      leetcode: 'leetcode.com',
      coderpad: 'coderpad.io',
      codesignal: 'codesignal.com',
      glider: 'glider.ai',
    };
    camo.getActiveBrowserUrl().then((result: any) => {
      if (!result?.ok || !result.url) return;
      const url: string = result.url;
      if (!isProblemPageUrl(url)) return;   // was: isCodingUrl domain check
      if (codingPlatform && codingPlatform !== 'auto' && codingPlatform !== 'none') {
        const expected = platformDomain[codingPlatform];
        if (expected && !url.includes(expected)) return;
      }
      setProblemUrl(url);
      handleFetchFromUrl(url, { auto: true });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode]);

  // Extract → set problem text → optionally chain into solution generation.
  // Takes an explicit file (not state) so it can be called the moment an
  // image is dropped/picked, before setImageFile React-renders.
  const handleSnapChip = useCallback((prompt: string) => {
    // Source priority: snapped screen code > editor code (if non-default) > problem text
    const defaultCode = getDefaultCode(language);
    const editorHasCode = code.trim() && code.trim() !== defaultCode.trim();
    const source = snapChipCode
      || (editorHasCode ? `\`\`\`${language}\n${code.trim()}\n\`\`\`` : null)
      || problemText;
    if (!source?.trim()) return;
    if (snapChipCode) setSnapChipCode(null);
    const combined = `${prompt}\n\n${source}`;
    setProblemText(combined);
    setStreamError(null);
    setTestResults([]);
    setTestCases([{ input: '', expected: '' }]);
    setOutput('');
    setShowFixPrompt(false);
    clearStreamChunks();
    setParsedBlocks([]);
    setJsonSolution(null);
    setCode(defaultCode);
    setCollapsedCards(new Set());
    setActiveSolutionIdx(0);
    setIsOutputCollapsed(true);
    setProblemTab('solution');
    onSubmit(combined, language, {});
  }, [snapChipCode, code, problemText, language, clearStreamChunks, setParsedBlocks, setStreamError, onSubmit, getDefaultCode]);

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
        setCollapsedCards(new Set());
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

  // Drop/select an image → preview + auto-extract + auto-generate solution.
  // No more manual click chain: image in, answer out.
  const acceptImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setError(null);
    void extractAndMaybeGenerate(file, true);
  }, [extractAndMaybeGenerate]);
  // Keep ref in sync so handleSnap (defined above) always calls the latest version
  acceptImageRef.current = acceptImage;

  // Add a dataUrl to the IMAGE chip collection and update display state.
  const addToSnapCollection = useCallback((dataUrl: string) => {
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
    const camo = (window as any).camo;
    if (!camo?.snapActiveBrowser) {
      fileInputRef.current?.click(); // web fallback: open file picker
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await camo.snapActiveBrowser();
      if (!result?.ok || !result.dataUrl) throw new Error(result?.error || 'Could not capture screenshot. Make sure Chrome/Brave is open on the problem page.');
      addToSnapCollection(result.dataUrl);
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
  const removeTestCase = (i: number) => { if (testCases.length > 1) setTestCases(testCases.filter((_, j) => j !== i)); };
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: '50%', background: 'var(--cam-primary)', color: '#fff', fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: 1 }}>{qMatch[1]}</span>
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
      <header className="flex items-center justify-between h-11 px-3 shrink-0 relative z-20" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold rounded transition-colors hover:bg-white/10" style={{ color: 'var(--cam-strip-text)' }}>
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
                  className="px-1.5 py-0.5 text-[10px] font-mono opacity-75 hover:opacity-100 hover:bg-white/10 rounded transition-colors" style={{ color: 'var(--cam-strip-text)' }}
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
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── LEFT PANEL: Problem / Solution ── */}
        <div className={`w-full md:w-auto flex flex-col min-w-0 md:border-r border-b md:border-b-0 coding-left-panel max-h-[45dvh] md:max-h-none overflow-auto ${embedded ? 'border-[var(--border)]' : 'lumora-light-panel'}`} style={{ ['--left-w' as any]: `${leftPanelWidth}%`, background: t.surfaceBg, borderColor: t.cardBorder }}>
          {/* Tabs — LeetCode-style sharp pill toolbar matching the Lumora
              top bar grammar. Navy band + gold underline + bezelled pill
              container holding the Description / Solution toggles. */}
          <div
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
                            onChange={(e) => { setProblemText(e.target.value); setStarterCode(null); }}
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
                                style={{ background: 'var(--cam-primary)', color: 'white' }}>
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
                            <button type="button" onClick={() => handleFetchFromUrl()} disabled={isProcessing || !problemUrl.trim()}
                              className="px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
                              {isProcessing ? 'Loading...' : 'Fetch'}
                            </button>
                          </div>
                          {(window as any).camo?.fetchHackerrankNow && (
                            <p className="text-center text-xs opacity-50 py-1">
                              HackerRank detected automatically — no action needed
                            </p>
                          )}
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
                              setIsInputCollapsed(false);
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
                        multiPageCapturingRef.current = false;
                        setMultiPageCapturing(false);
                        setMultiPageCount(0);
                        const snapUrls = pendingSnapUrlsRef.current;
                        pendingSnapUrlsRef.current = [];
                        setSnapImageUrls([]);
                        setImagePreview(null);
                        if (snapUrls.length) {
                          void extractAndGenerateFromDataUrls(snapUrls, true);
                        } else {
                          handleGenerateSolution();
                        }
                      }}
                      disabled={isLoading || (!problemText.trim() && !multiPageCapturing)}
                      className="flex-1 py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-[opacity,transform] active:scale-[0.98] flex items-center justify-center gap-2"
                      style={
                        degrading.length > 0
                          ? { background: 'transparent', border: '1px solid var(--warning)', color: 'var(--warning-text)', borderRadius: '10px' }
                          : { background: 'linear-gradient(135deg, var(--cam-primary), var(--cam-primary))', borderRadius: '10px' }
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
                {/* ── Analysis tabs (Code | Explain | Issues | Deep Dive) ── */}
                {sd && !isStreaming && !isMcqAnswer && (
                  <div className="flex items-center gap-0.5 mb-3 p-1 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    {(['code', 'explain', 'issues', 'deepdive'] as const).map(tab => {
                      const labels: Record<string, string> = { code: 'Code', explain: 'Explain', issues: 'Issues', deepdive: 'Deep Dive' };
                      const active = analysisTab === tab;
                      const loading = analysisLoading === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => tab === 'code' ? setAnalysisTab('code') : handleAnalysis(tab)}
                          className="flex items-center gap-1.5 flex-1 justify-center py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                          style={active
                            ? { background: 'var(--cam-hero-strip)', color: 'var(--cam-gold-leaf-lt)', border: '1px solid var(--cam-gold-leaf)' }
                            : { color: 'var(--text-muted)', border: '1px solid transparent' }}
                        >
                          {loading && <div className="w-2.5 h-2.5 border border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />}
                          {labels[tab]}
                          {!loading && analysisCache[`${activeSolutionIdx}_${tab}`] && tab !== 'code' && (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cam-primary)' }} />
                          )}
                        </button>
                      );
                    })}
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
                      {analysisLoading === analysisTab && <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cam-gold-leaf)', borderTopColor: 'transparent' }} />}
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
                {/* Cache status row — surfaces whether the current
                    solution came from the answer cache (Redis) and
                    offers a one-click Regenerate that bypasses the
                    cache. Without this, repeat solves looked
                    identical to fresh solves and users couldn't tell
                    when caching was actually working. Only renders
                    when a solution exists; hidden during streaming
                    and when there's nothing to cache yet. */}
                {sd && !isStreaming && lastFromCache !== null && (
                  <div
                    className="mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
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
                        {lastFromCache ? 'Loaded from cache' : 'Fresh solve'}
                      </span>
                      <span className="hidden md:inline text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {lastFromCache
                          ? '· Identical problem — served instantly from Redis. Click Regenerate for a fresh take.'
                          : '· Now cached — repeat solves on this exact problem hit the cache.'}
                      </span>
                    </div>
                    <button
                      onClick={handleRegenerate}
                      disabled={isStreaming || isLoading}
                      className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'var(--cam-primary)',
                        color: '#FFFFFF',
                        border: '1px solid var(--cam-primary-dk)',
                        fontFamily: 'var(--font-mono)',
                      }}
                      data-tip="Force a fresh solve, ignoring the cache. The new result is cached too — useful when the cached answer was wrong or you want a different approach."
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
                          style={{ background: 'var(--cam-primary)', color: '#FFFFFF' }}
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
                                    ? { background: 'var(--cam-primary)', color: '#fff' }
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

                    {/* ── SOLUTION TABS (when multiple solutions) ── */}
                    {sd.solutions?.length > 1 && (
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: t.sectionBg }}>
                        {sd.solutions.map((sol: any, i: number) => {
                          // Brute → Optimized → Most Optimal difficulty progression.
                          // Same brand-color family, stepped intensity so the tabs read as a
                          // progression (not rainbow — single-hue palette stays coherent).
                          const tierAccents = ['var(--text-dimmed)', 'var(--cam-primary)', 'var(--cam-primary-dk)'];
                          const accentColor = tierAccents[i] || 'var(--cam-primary)';
                          return (
                            <button key={i}
                              onClick={() => {
                                setActiveSolutionIdx(i);
                                const solCode = sol.code || sol.implementation || sol.solution
                                  || (sol.explanations?.length > 0 ? sol.explanations.map((ex: any) => ex.code).filter(Boolean).join('\n') : null);
                                if (solCode) setCode(solCode);
                              }}
                              className={`flex-1 px-2 py-1.5 text-[10px] md:text-xs font-semibold rounded-md transition-[background-color,color,border-color] active:scale-[0.98] text-center ${
                                activeSolutionIdx === i ? 'shadow-sm' : ''
                              }`}
                              style={activeSolutionIdx === i
                                ? { background: t.inputBg, color: t.text, borderTop: `2px solid ${accentColor}` }
                                : { color: t.textMuted, borderTop: `2px solid transparent` }}
                            >
                              <div className="truncate flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                                {sol.name || `Solution ${i + 1}`}
                              </div>
                              {sol.complexity && (
                                <div className="text-[9px] font-mono mt-0.5" style={{ color: t.textDim }}>
                                  {sol.complexity.time}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* ── END-TO-END APPROACH (always visible) ──
                       The direct answer to "walk me through your approach".
                       Promotes the spoken narration to a standalone top card so
                       it's readable at a glance without expanding anything. */}
                    {(() => {
                      const activeSol = sd.solutions?.[activeSolutionIdx];
                      const script = activeSol?.narration || activeSol?.approach;
                      if (!script) return null;
                      return (
                        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(38,97,156,0.35)' }}>
                          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                              </svg>
                              <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-primary-dk)' }}>End-to-End Approach</span>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(script)}
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded hover:bg-black/5"
                              style={{ color: 'var(--cam-primary-dk)' }}>
                              Copy
                            </button>
                          </div>
                          <p className="px-3 py-2.5 text-[13px] leading-[1.6]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                            {script}
                          </p>
                        </div>
                      );
                    })()}

                    {/* ── ACTIVE SOLUTION APPROACH ── */}
                    {(() => {
                      const activeSol = sd.solutions?.[activeSolutionIdx];
                      if (activeSol) return (
                        <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                          <button type="button" onClick={() => setOpenSection(s => s === 'approach' ? '' : 'approach')}
                            className="w-full flex items-center gap-2 px-3 py-2.5 flex-wrap text-left" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: t.badgeBg, color: t.badgeText }}>{activeSolutionIdx + 1}</div>
                            <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: t.headerText }}>{activeSol.name}</h4>
                            {activeSol.patternTag && (
                              <span className="text-[9px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
                                data-tip="Canonical pattern"
                                style={{ color: '#FFFFFF', background: 'var(--cam-primary)', letterSpacing: '0.04em' }}>
                                {activeSol.patternTag}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                              {activeSol.complexity && (
                                <>
                                  <span className="text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>{activeSol.complexity.time}</span>
                                  <span className="text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>{activeSol.complexity.space}</span>
                                </>
                              )}
                              <svg className="w-3 h-3 shrink-0 transition-transform" style={{ color: t.headerText, transform: openSection === 'approach' ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          {openSection === 'approach' && (
                          <div className="p-3 space-y-2">
                            {activeSol.approach && <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{activeSol.approach}</p>}
                            {activeSol.explanations?.length > 0 && (
                              <div className="space-y-2 pt-1" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                                {activeSol.explanations.map((ex: any, j: number) => (
                                  <div
                                    key={j}
                                    className="flex flex-col gap-0.5 text-[10px] md:text-[11px] rounded cursor-pointer"
                                    onMouseEnter={() => highlightLine(lineForCode(ex.code, j))}
                                    onMouseLeave={clearHighlight}
                                    onClick={() => highlightLine(lineForCode(ex.code, j))}
                                  >
                                    {ex.code && <code className="font-mono px-1.5 py-1 rounded block overflow-x-auto whitespace-pre max-w-full" style={{ color: t.codeText, background: t.codeBg }}>{ex.code}</code>}
                                    {ex.explanation && <span className="leading-relaxed pl-0.5" style={{ color: t.textMuted }}>{ex.explanation}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Narration promoted to the always-visible
                                End-to-End Approach card above — not duplicated here. */}
                            {Array.isArray(activeSol.trace) && activeSol.trace.length > 0 && (
                              <div className="rounded-lg mt-2 overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.headerText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                  </svg>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: t.headerText }}>Dry-run trace</span>
                                  <span className="ml-auto text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg }}>{activeSol.trace.length} steps</span>
                                </div>
                                <table className="w-full text-[10px] md:text-[11px]" style={{ borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                                      <th className="text-left font-mono font-bold uppercase tracking-wider px-2 py-1" style={{ color: t.textDim, width: '32px' }}>#</th>
                                      <th className="text-left font-mono font-bold uppercase tracking-wider px-2 py-1" style={{ color: t.textDim }}>Action</th>
                                      <th className="text-left font-mono font-bold uppercase tracking-wider px-2 py-1" style={{ color: t.textDim }}>State</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeSol.trace.map((tr: any, j: number) => (
                                      <tr key={j} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                                        <td className="px-2 py-1 font-mono font-bold" style={{ color: t.headerText }}>{tr.step ?? j + 1}</td>
                                        <td className="px-2 py-1" style={{ color: t.text }}>{tr.action}</td>
                                        <td className="px-2 py-1 font-mono" style={{ color: t.textMuted }}>{tr.state}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                      );

                      // Fallback: old single-solution format
                      if (sd.pitch) return (
                        <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: t.badgeBg, color: t.badgeText }}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            </div>
                            <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Approach</h4>
                          </div>
                          <div className="p-3 space-y-2">
                            {typeof sd.pitch === 'string' ? (
                              <p className="text-xs md:text-sm leading-relaxed" style={{ color: t.textMuted }}>{sd.pitch}</p>
                            ) : (
                              <>
                                {sd.pitch.opener && <p className="text-xs md:text-sm font-semibold" style={{ color: t.text }}>{sd.pitch.opener}</p>}
                                {sd.pitch.approach && <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{sd.pitch.approach}</p>}
                                {sd.pitch.keyPoints?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {sd.pitch.keyPoints.map((p: string, j: number) => (
                                      <Chip key={j} variant="default" className="gap-1">
                                        <span className="w-1 h-1 rounded-full" style={{ background: t.dotColor }} />{p}
                                      </Chip>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                      return null;
                    })()}

                    {/* ── OVERALL PITCH (key points, tradeoffs, edge cases) ── */}
                    {sd.pitch && typeof sd.pitch !== 'string' && sd.solutions?.length > 1 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <button type="button" onClick={() => setOpenSection(s => s === 'summary' ? '' : 'summary')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Summary</span>
                          <svg className="w-3 h-3 shrink-0 ml-auto transition-transform" style={{ color: t.headerText, transform: openSection === 'summary' ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openSection === 'summary' && (
                        <div className="p-3 space-y-2">
                          {sd.pitch.opener && <p className="text-xs font-semibold" style={{ color: t.text }}>{sd.pitch.opener}</p>}
                          {sd.pitch.approach && <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{sd.pitch.approach}</p>}
                          {sd.pitch.keyPoints?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {sd.pitch.keyPoints.map((p: string, i: number) => (
                                <Chip key={i} variant="default" className="gap-1">
                                  <span className="w-1 h-1 rounded-full" style={{ background: t.dotColor }} />{p}
                                </Chip>
                              ))}
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    )}

                    {/* ── TRADEOFFS ── */}
                    {sd.pitch?.tradeoffs?.length > 0 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <button type="button" onClick={() => setOpenSection(s => s === 'tradeoffs' ? '' : 'tradeoffs')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Tradeoffs</span>
                          <svg className="w-3 h-3 shrink-0 ml-auto transition-transform" style={{ color: t.headerText, transform: openSection === 'tradeoffs' ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openSection === 'tradeoffs' && (
                        <ul className="p-3 space-y-1.5">
                          {sd.pitch.tradeoffs.map((tr: string, i: number) => (
                            <li key={i} className="text-xs flex items-start gap-2 leading-relaxed" style={{ color: t.textMuted }}>
                              <svg className="w-3 h-3 shrink-0 mt-0.5" style={{ color: t.dotColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              {tr}
                            </li>
                          ))}
                        </ul>
                        )}
                      </div>
                    )}

                    {/* ── EDGE CASES ── */}
                    {sd.pitch?.edgeCases?.length > 0 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <button type="button" onClick={() => setOpenSection(s => s === 'edge' ? '' : 'edge')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Edge Cases</span>
                          <svg className="w-3 h-3 shrink-0 ml-auto transition-transform" style={{ color: t.headerText, transform: openSection === 'edge' ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openSection === 'edge' && (
                        <ul className="p-3 space-y-1.5">
                          {sd.pitch.edgeCases.map((e: string, i: number) => (
                            <li key={i} className="text-xs flex items-start gap-2 leading-relaxed" style={{ color: t.textMuted }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: t.dotColor }} />
                              {e}
                            </li>
                          ))}
                        </ul>
                        )}
                      </div>
                    )}

                    {/* ── LINE-BY-LINE WALKTHROUGH ── */}
                    {sd.explanations?.length > 0 && (
                      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <button type="button" onClick={() => setOpenSection(s => s === 'walkthrough' ? '' : 'walkthrough')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Code Walkthrough</span>
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>{sd.explanations.length} lines</span>
                            <svg className="w-3 h-3 shrink-0 transition-transform" style={{ color: t.headerText, transform: openSection === 'walkthrough' ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {openSection === 'walkthrough' && (
                        <div className="divide-y" style={{ borderColor: t.cardBorder }}>
                          {sd.explanations.map((ex: any, i: number) => (
                            <div key={i} className="flex flex-col gap-1 px-3 py-2 transition-colors"
                              onMouseEnter={() => highlightLine(ex.line)}
                              onMouseLeave={clearHighlight}
                              onClick={() => highlightLine(ex.line)}
                              style={{ cursor: 'pointer' }}>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono shrink-0" style={{ background: t.badgeBg, color: t.badgeText }}>L{ex.line}</span>
                                {ex.code && <code className="text-[10px] font-mono overflow-x-auto whitespace-pre flex-1 min-w-0 block" style={{ color: t.codeText }}>{ex.code}</code>}
                              </div>
                              {ex.explanation && <span className="text-[10px] md:text-xs leading-relaxed pl-7" style={{ color: t.textMuted }}>{ex.explanation}</span>}
                            </div>
                          ))}
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy block display */}
                {!sd && parsedBlocks && Array.isArray(parsedBlocks) && parsedBlocks.length > 0 && (
                  <LegacySolutionCards
                    blocks={parsedBlocks}
                    collapsedCards={collapsedCards}
                    onToggle={(t) => { const n = new Set(collapsedCards); if (n.has(t)) n.delete(t); else n.add(t); setCollapsedCards(n); }}
                    onTestCaseClick={(input, expected) => {
                      const hasEmpty = testCases.some(tc => !String(tc.input ?? '').trim());
                      if (hasEmpty) {
                        let replaced = false;
                        setTestCases(testCases.map(tc => {
                          if (!replaced && !String(tc.input ?? '').trim()) { replaced = true; return { input, expected }; }
                          return tc;
                        }));
                      } else if (testCases.length < MAX_TEST_CASES) {
                        setTestCases([...testCases, { input, expected }]);
                      }
                      setOutputTab('testcases');
                      setIsOutputCollapsed(false);
                    }}
                  />
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
        <div onMouseDown={() => setIsResizingH(true)}
          className="hidden md:flex w-1.5 bg-[var(--bg-elevated)] hover:bg-[rgba(38,97,156,0.1)] cursor-col-resize transition-colors items-center justify-center group shrink-0">
          <div className="w-0.5 h-8 bg-[var(--border)] group-hover:bg-[var(--accent)] rounded-full transition-colors" />
        </div>

        {/* ── RIGHT PANEL: Code Editor + Output ──
            Scrolls as a whole: the editor auto-heights to the code (grows
            downward with the line count) and the output panel flows beneath it,
            so both are reached by scrolling this column when the code is long. */}
        <div ref={editorColRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto" style={{ background: t.surfaceBg, color: t.text }}>
          {/* Editor Header — sticky so Run / language / reset stay reachable while the column scrolls */}
          <div className="flex items-center justify-between px-2 py-1 lumora-winctl-safe sticky top-0 z-10" style={{ background: t.sectionBg, borderBottom: `1px solid ${t.cardBorder}` }}>
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
                className="flex items-center gap-1 px-2.5 py-0.5 text-white text-[11px] font-bold rounded disabled:opacity-50 transition-colors shadow-sm" style={{ background: 'var(--cam-primary)' }}
                data-tip="Run (Ctrl+Enter)">
                {isRunning ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
                ) : (
                  <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Run</>
                )}
              </button>
              {showFixPrompt && (
                <button onClick={() => handleAutoFix(false)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-md hover:bg-amber-600 transition-colors shadow-sm"
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

          {/* ── Code Editor — auto-heights to the code so it grows downward with
              the line count (no fixed box, no wasted empty space). The column
              above scrolls when the code exceeds the viewport. ── */}
          <SharedCodeEditor
            autoHeight
            minHeight={160}
            language={getLanguageById(language)?.monaco || 'python'}
            code={code}
            onChange={setCode}
            theme="vs-dark"
            fontSize={11}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.updateOptions({
                fontFamily: "'IBM Plex Mono', 'Cascadia Code', monospace",
                fontLigatures: true,
                letterSpacing: -0.3,
                lineHeight: 19,
              });
            }}
          />

          {/* ── Vertical Resize Handle ── */}
          {!isOutputCollapsed && (
            <div onMouseDown={(e) => { vResizeRef.current = { startY: e.clientY, startH: outputPanelHeight }; setIsResizingV(true); }}
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
          <div className="border-t flex flex-col shrink-0" style={{ borderColor: t.cardBorder, background: t.surfaceBg, height: isOutputCollapsed ? 36 : outputPanelHeight }}>
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
              <div className="flex-1 overflow-y-auto p-2 md:p-3">
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

// ── Legacy Solution Cards (for tag-based responses) ──────────────────────────

function LegacySolutionCards({ blocks, collapsedCards, onToggle, onTestCaseClick }: {
  blocks: any[];
  collapsedCards: Set<string>;
  onToggle: (type: string) => void;
  onTestCaseClick?: (input: string, expected: string) => void;
}) {
  const byType: Record<string, any> = {};
  blocks.forEach(b => { byType[b.type] = b; });

  const cards = [
    { type: 'APPROACH', title: 'Approach', color: 'accent' },
    { type: 'COMPLEXITY', title: 'Complexity', color: 'accent' },
    { type: 'WALKTHROUGH', title: 'Walkthrough', color: 'accent' },
    { type: 'EDGECASES', title: 'Edge Cases', color: 'warning' },
    { type: 'TESTCASES', title: 'Test Cases', color: 'accent' },
  ];

  const colorMap: Record<string, { header: string; border: string; bg: string; text: string }> = {
    accent: { header: 'bg-[var(--accent-subtle)]', border: 'border-[var(--border)]', bg: 'bg-[var(--bg-surface)]', text: 'text-[var(--accent)]' },
    warning: { header: 'bg-[rgba(201,162,39,0.06)]', border: 'border-[rgba(201,162,39,0.25)]', bg: 'bg-[var(--bg-surface)]', text: 'text-[var(--warning-text)]' },
  };

  return (
    <div className="space-y-2 solution-cards-appear">
      {cards.map(({ type, title, color }) => {
        if (!byType[type]) return null;
        const c = colorMap[color];
        const isCollapsed = collapsedCards.has(type);
        const lines = byType[type].content.split('\n').map((l: string) => l.replace(/\*\*/g, '').replace(/\*/g, '').trim()).filter(Boolean);

        return (
          <div key={type} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden shadow-sm`}>
            <button onClick={() => onToggle(type)}
              className={`w-full flex items-center justify-between px-3 py-2 ${c.header} border-b ${c.border} transition-colors`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>{title}</span>
              <svg className={`w-3 h-3 text-[var(--text-dimmed)] transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="p-3">
                {type === 'TESTCASES' && onTestCaseClick ? (
                  <div className="space-y-1">
                    {lines.map((line: string, i: number) => {
                      const arrowMatch = line.match(/(.+?)\s*(?:->|=>|→)\s*(.+)/);
                      if (arrowMatch) {
                        return (
                          <button key={i} onClick={() => onTestCaseClick(arrowMatch[1].trim(), arrowMatch[2].trim())}
                            className="w-full text-left px-2 py-1 bg-[rgba(38,97,156,0.04)] border border-[rgba(38,97,156,0.1)] rounded-md hover:border-[var(--accent)] text-[10px] text-[var(--text-muted)] font-mono hover:text-[var(--accent)] transition-colors">
                            {line}
                          </button>
                        );
                      }
                      return <div key={i} className="text-[10px] text-[var(--text-secondary)] font-mono">{line}</div>;
                    })}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {lines.map((line: string, i: number) => (
                      <div key={i} className="text-xs text-[var(--text-muted)] leading-relaxed">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
