import { useState, useRef, useCallback, useEffect } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme as useGlobalTheme } from '@/hooks/useTheme';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import FollowupAsk from '@/components/lumora/coding/FollowupAsk';
import { LANGUAGES, getLanguageById } from '@/data/languages';
import { dialogAlert } from '@/components/shared/Dialog';
import { getActiveAssistant } from '@/lib/lumora-assistant';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

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
  /** When true, hides internal header and uses flex-1 instead of h-screen (for embedding in LumoraShell) */
  embedded?: boolean;
  /** Ref that parent sets to receive voice transcriptions as problem input */
  onVoiceProblemRef?: React.MutableRefObject<((text: string) => void) | null>;
  /** DataURL from F9 auto-capture of HackerRank window. Processed via OCR. */
  pendingHackerrankCapture?: string | null;
  /** Called once the capture has been consumed so parent can clear it. */
  onHackerrankCaptureConsumed?: () => void;
  /** Active coding platform from tool-picker ('hackerrank'|'leetcode'|'coderpad'|'none').
   *  When set (non-empty, non-'none'), hides manual input modes and shows autopilot status. */
  codingPlatform?: string;
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

export function CodingLayout({ onSubmit, isLoading, onBack, initialProblem, initialUrl, embedded, onVoiceProblemRef, pendingHackerrankCapture, onHackerrankCaptureConsumed, codingPlatform }: CodingLayoutProps) {
  const { token } = useAuth();
  const { theme: globalTheme } = useGlobalTheme();
  const t = useTheme(globalTheme === 'dark');

  // Core state
  const [language, setLanguage] = useState('python');
  const [problemTab, setProblemTab] = useState<ProblemTab>('description');
  const [outputTab, setOutputTab] = useState<OutputTab>('testcases');
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [problemText, setProblemText] = useState(initialProblem || '');
  const [problemUrl, setProblemUrl] = useState('');
  const [code, setCode] = useState(getDefaultCode('python'));
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [jsonSolution, setJsonSolution] = useState<any>(null);
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [starterCode, setStarterCode] = useState<string | null>(null);
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

  // Screen Recording permission status — checked once on mount (desktop only).
  // 'granted' | 'denied' | 'restricted' | 'not-determined' | null (non-desktop)
  const [screenPermStatus, setScreenPermStatus] = useState<string | null>(null);
  const [isStealthActive, setIsStealthActive] = useState(false);
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
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

  // Timer state
  const [timerDuration, setTimerDuration] = useState(0); // 0 = off
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Panel resize
  const [leftPanelWidth, setLeftPanelWidth] = useState(25);
  const [outputPanelHeight, setOutputPanelHeight] = useState(180);
  const [isResizingH, setIsResizingH] = useState(false);
  const [isResizingV, setIsResizingV] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true); // Start collapsed — expands when test cases arrive

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store
  const { streamChunks, parsedBlocks, isStreaming, clearStreamChunks, setParsedBlocks, error: streamError, setError: setStreamError, setLastFromCache } = useInterviewStore();
  const lastFromCache = useInterviewStore(s => s.lastFromCache);

  // Regenerate — re-submit the same problem with bypass_cache=true so
  // the backend skips the answer cache lookup and produces a fresh
  // solution. The fresh result still writes to the cache so the next
  // plain solve hits. Only enabled when we have a problem and aren't
  // already streaming.
  const handleRegenerate = useCallback(() => {
    const text = problemText.trim();
    if (!text || isLoading || isStreaming) return;
    onSubmit(text, language, { bypassCache: true, ...(starterCode ? { starterCode } : {}) });
  }, [problemText, language, starterCode, isLoading, isStreaming, onSubmit]);

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
    useInterviewStore.getState().setLiveSolveContext(null);
  }, [clearStreamChunks, setParsedBlocks, setStreamError, setLastFromCache, language]);

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
    const move = (e: MouseEvent) => {
      const bottom = window.innerHeight - e.clientY;
      setOutputPanelHeight(Math.min(Math.max(100, bottom), 500));
    };
    const up = () => setIsResizingV(false);
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
      setIsRunning(false);
      return;
    }

    const validTestCases = testCases.filter(tc => tc.input.trim());

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/coding/execute`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, language, test_cases: validTestCases }),
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
        }
      } else if (data.direct_output !== undefined && data.direct_output !== null) {
        setOutput(data.direct_output || '(no output)');
      } else {
        setOutput('(no output)');
      }
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [token, code, language, testCases]);

  const handleAutoFix = useCallback(async (silent = false) => {
    if (!token) {
      if (!silent) setOutput(prev => prev + '\nAuto-fix: not authenticated');
      return;
    }
    setShowFixPrompt(false);
    if (!silent) setOutput('Auto-fixing code...');
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fix`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, language, error: fixError, problem: problemText }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (!silent) throw new Error(errData.detail || `Fix failed: ${resp.status}`);
        return;
      }
      const data = await resp.json();
      if (data.code) {
        setCode(data.code);
        if (!silent) setOutput('Code fixed! Click Run to test again.' + (data.explanation ? `\n\nFix: ${data.explanation}` : ''));
        if (silent) {
          // Re-run automatically — wait one tick for setCode to propagate
          setTimeout(() => handleRun(), 80);
        }
      } else {
        if (!silent) setOutput('Auto-fix returned no code. Try editing manually.');
      }
    } catch (err: any) {
      if (!silent) setOutput(`Auto-fix failed: ${err.message || 'Unknown error'}. Try editing the code manually.`);
    }
  }, [token, code, language, fixError, problemText, handleRun]);

  // Keep ref current so the auto-fix effect can call it without stale closures
  useEffect(() => { handleAutoFixRef.current = handleAutoFix; }, [handleAutoFix]);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRunning, handleRun]);

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

  // Silent auto-fix: when auto-run finds failures after generation, fix
  // silently and re-run. Surface the manual button only after 3 attempts.
  useEffect(() => {
    if (!showFixPrompt) return;
    if (!autoGenRef.current.active) return;
    if (autoGenRef.current.attempts >= 3) {
      autoGenRef.current.active = false; // give up, show manual fix button
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
    const hasRealInput = testCases.some((tc) => tc.input && tc.input.trim().length > 0);
    if (!hasRealInput) return;
    autoRunFiredRef.current = true;
    handleRun();
  }, [isStreaming, code, testCases, isRunning, handleRun]);

  // ── Parse solution from stream ──────────────────────────────────────────

  useEffect(() => {
    const pb = parsedBlocks as any;
    const jsonData = pb && !Array.isArray(pb) ? (pb.json || pb) : null;
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
      if (jsonData.language && jsonData.language !== 'auto') setLanguage(jsonData.language);
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
      const raw = streamChunks.join('');
      const codeMatch = raw.match(/```(?:python|java|cpp|javascript|typescript|go|rust)?\n([\s\S]*?)```/);
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
    useInterviewStore.getState().setLiveSolveContext({
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
    if (!isStreaming && streamChunks.length > 0 && !jsonSolution) {
      const raw = streamChunks.join('');
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
  }, [isStreaming, streamChunks, jsonSolution]);

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
    handleFetchFromUrl(initialUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, token]);

  // F9 shortcut (Electron desktop): auto-process HackerRank window screenshot via OCR.
  useEffect(() => {
    if (!pendingHackerrankCapture) return;
    onHackerrankCaptureConsumed?.();
    (async () => {
      try {
        const blob = await (await fetch(pendingHackerrankCapture)).blob();
        const file = new File([blob], 'hackerrank-capture.png', { type: blob.type || 'image/png' });
        setInputMode('image');
        setImagePreview(pendingHackerrankCapture);
        await extractAndMaybeGenerate(file, true);
      } catch (err: any) {
        setError(err.message || 'Failed to process HackerRank screenshot.');
        // Reset dedup in main process so the next poll retries this URL.
        (window as any).camo?.resetLastCaptureUrl?.();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHackerrankCapture]);

  // Desktop screenshot watcher (Electron): user presses Cmd+Shift+4, saves a
  // screenshot of the HackerRank problem + code editor to ~/Desktop, and Lumora
  // auto-picks it up, OCRs it, and generates a solution — zero clicks needed.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.onScreenshotWatcher) return;
    const handler = async ({ dataUrl, filename }: { dataUrl: string; filename: string }) => {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        setInputMode('image');
        setImagePreview(dataUrl);
        await extractAndMaybeGenerate(file, true);
      } catch (err: any) {
        setError(err.message || 'Failed to process screenshot.');
      }
    };
    camo.onScreenshotWatcher(handler);
    return () => camo.offScreenshotWatcher?.();
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

  // Solution overlay: when code is ready, push it to the floating overlay so the
  // user can read it without moving the mouse away from HackerRank.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!camo?.showSolutionOverlay) return;
    const defaultCode = getDefaultCode(language);
    if (!code || code === defaultCode) {
      camo.hideSolutionOverlay?.();
      return;
    }
    camo.showSolutionOverlay({ code, language, stealthActive: isStealthActive });
  }, [code, language, isStealthActive]);

  // Auto-reinject stealth when a new HackerRank problem is detected (page reloads, clearing
  // the previous injection) and on a 30s heartbeat while stealth is active.
  useEffect(() => {
    const camo = (window as any).camo;
    if (!isStealthActive || !camo?.injectTrackingNeutralizer) return;
    // Silent reinject — don't show dialogs on auto-reinject failures.
    const silentReinject = () => camo.injectTrackingNeutralizer().catch(() => null);
    silentReinject();
    const interval = setInterval(silentReinject, 30000);
    return () => clearInterval(interval);
  }, [isStealthActive, pendingHackerrankCapture]);


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
    setCode(getDefaultCode(language));
    setCollapsedCards(new Set());
    setActiveSolutionIdx(0);
    setIsOutputCollapsed(true); // Collapse test panel — auto-expands when new tests arrive
    onSubmit(problemText.trim(), language, starterCode ? { starterCode } : undefined);
  };

  // Register voice problem handler for parent shell. Uses stable internal
  // refs for `onSubmit` and `language` so the registration only runs ONCE
  // on mount. Previously this effect's deps included `onSubmit`, which
  // (via the parent's destructured store hook) churned identity on every
  // store update — so the ref was momentarily nulled out tens of times
  // a second whenever Sona was streaming, and any transcript arriving
  // during a null window fell through to Sona instead of filling the
  // problem field. Anchoring to refs eliminates the race entirely.
  const onSubmitRef = useRef(onSubmit);
  const languageRef = useRef(language);
  useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);
  useEffect(() => { languageRef.current = language; }, [language]);

  useEffect(() => {
    if (!onVoiceProblemRef) return;
    onVoiceProblemRef.current = (text: string) => {
      // Voice on the coding tab always fills the problem and runs the
      // solver. Sona is not co-resident here — follow-ups happen on
      // the Behavioral tab or via the typed input on Home.
      setProblemText(text);
      setProblemTab('solution');
      setTestCases([]);
      setTestResults([]);
      setOutput('');
      setIsOutputCollapsed(true);
      clearStreamChunks();
      setParsedBlocks([]);
      setJsonSolution(null);
      setCode(getDefaultCode(languageRef.current));
      onSubmitRef.current(text.trim(), languageRef.current);
    };
    return () => { if (onVoiceProblemRef) onVoiceProblemRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onVoiceProblemRef]);

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
      // result.dataUrl is a screenshot — run through the existing Claude Vision OCR pipeline
      const blob = await (await fetch(result.dataUrl)).blob();
      const file = new File([blob], 'hackerrank-capture.png', { type: blob.type || 'image/png' });
      setInputMode('image');
      setImagePreview(result.dataUrl);
      await extractAndMaybeGenerate(file, true);
    } catch (err: any) {
      await dialogAlert({ title: 'HackerRank fetch error', message: err.message || 'Unknown error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStealthMode = async () => {
    const camo = (window as any).camo;
    if (!camo?.injectTrackingNeutralizer) {
      await dialogAlert({ title: 'Desktop only', message: 'Stealth mode requires the Camora desktop app.' });
      return;
    }
    const result = await camo.injectTrackingNeutralizer();
    if (result.ok) {
      setIsStealthActive(true);
    } else if (result.needsDevMenu) {
      await dialogAlert({
        title: 'One-time setup needed',
        message: `Enable "Allow JavaScript from Apple Events" in ${result.browser || 'Chrome'}:\n\n1. Open ${result.browser || 'Chrome'}\n2. Menu bar → View → Developer (or More Tools)\n3. Click "Allow JavaScript from Apple Events"\n4. Click Stealth again`,
      });
    } else {
      await dialogAlert({ title: 'Stealth failed', message: result.error || 'Could not inject into browser tab.' });
    }
  };

  // Ref so handleSnap can call acceptImage without a forward-reference TDZ.
  // acceptImage is declared ~150 lines below handleSnap; putting it in the
  // useCallback deps array would access the const before initialization.
  const acceptImageRef = useRef<((file: File) => void) | null>(null);

  const handleSnap = useCallback(async () => {
    const camo = (window as any).camo;

    if (camo?.takeScreenshot) {
      // Desktop (Electron) path
      const perm = await camo.getMediaAccessStatus?.('screen').catch(() => null);
      if (perm && perm !== 'granted') {
        camo.openSystemPrivacy?.('ScreenCapture');
        return;
      }
      setSnapState('capturing');
      try {
        const result = await camo.takeScreenshot();
        if (!result?.ok) throw new Error(result?.error || 'Capture failed');
        setSnapState('done');
        setTimeout(() => setSnapState('idle'), 2500);
      } catch {
        setSnapState('error');
        setTimeout(() => setSnapState('idle'), 3000);
      }
      return;
    }

    // Browser path — capture screen frame and feed into image pipeline
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setSnapState('error');
      setTimeout(() => setSnapState('idle'), 3000);
      return;
    }
    setSnapState('capturing');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false } as DisplayMediaStreamOptions);
      const video = document.createElement('video');
      video.srcObject = stream;
      await new Promise<void>(res => { video.onloadedmetadata = () => res(); });
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('canvas.toBlob failed')), 'image/png')
      );
      const file = new File([blob], 'snap.png', { type: 'image/png' });
      acceptImageRef.current?.(file);
      setSnapState('done');
      setTimeout(() => setSnapState('idle'), 2500);
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        setSnapState('error');
        setTimeout(() => setSnapState('idle'), 3000);
      } else {
        setSnapState('idle');
      }
    }
  }, []);

  const handleFetchFromUrl = async (overrideUrl?: string) => {
    const urlToFetch = overrideUrl ?? problemUrl;
    if (!urlToFetch.trim()) { setError('Please enter a URL'); return; }
    if (!token) { setError('Not authenticated'); return; }

    // HackerRank codepair/contest: use desktop DOM scraper if available, else fallback to image.
    if (/hackerrank\.com\/(codepair|contests)\//i.test(urlToFetch)) {
      const camo = (window as any).camo;
      if (camo?.fetchHackerrankNow) {
        await handleHackerrankFetch();
      } else {
        setInputMode('image');
        await dialogAlert({
          title: 'HackerRank detected',
          message: 'HackerRank interview sessions are auth-gated and cannot be scraped from the backend. Take a screenshot of the problem + code editor, then drop it in the Image tab — Lumora will extract the full problem, read the starter code structure, and generate an exact matching solution.',
        });
      }
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fetch-problem`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: urlToFetch }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        const msg = body.error || body.detail || `Failed to fetch (${resp.status})`;
        await dialogAlert({ title: 'Could not fetch problem', message: msg });
        return;
      }
      const data = await resp.json();
      const text = String(data.problem || '').trim();
      setProblemText(text);
      setStarterCode(null);
      setInputMode('paste');
      // Auto-generate after fetch — URL tab is one-click solve, same UX
      // contract as IMAGE: input in, answer out, no extra button.
      if (text) {
        setStreamError(null);
        setTestResults([]);
        setTestCases([]);
        setOutput('');
        setShowFixPrompt(false);
        clearStreamChunks();
        setParsedBlocks([]);
        setJsonSolution(null);
        setCode(getDefaultCode(language));
        setCollapsedCards(new Set());
        setActiveSolutionIdx(0);
        setIsOutputCollapsed(true);
        setProblemTab('solution');
        onSubmit(text, language);
      }
    } catch (err: any) {
      await dialogAlert({ title: 'Could not fetch problem', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract → set problem text → optionally chain into solution generation.
  // Takes an explicit file (not state) so it can be called the moment an
  // image is dropped/picked, before setImageFile React-renders.
  const extractAndMaybeGenerate = useCallback(async (file: File, autoGenerate: boolean) => {
    if (!token) { setError('Not authenticated'); return; }
    setIsProcessing(true);
    setError(null);
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
      const effectiveLang = detectedLang || language;
      setProblemText(text);
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
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [token, language, setLanguage, clearStreamChunks, onSubmit]);

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

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptImage(file);
  }, [acceptImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) acceptImage(file);
  }, [acceptImage]);

  const addTestCase = () => { if (testCases.length < MAX_TEST_CASES) setTestCases([...testCases, { input: '', expected: '' }]); };
  const removeTestCase = (i: number) => { if (testCases.length > 1) setTestCases(testCases.filter((_, j) => j !== i)); };
  const updateTestCase = (i: number, field: 'input' | 'expected', value: string) => {
    testCasesUserEdited.current = true;
    const u = [...testCases]; u[i] = { ...u[i], [field]: value }; setTestCases(u);
  };

  const streamingSolution = streamChunks.join('');
  const sd = jsonSolution;

  // Passed/failed counts
  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

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
                'radial-gradient(ellipse 60% 40% at 85% 100%, rgba(34,211,238,0.06), transparent 70%)',
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
      `}</style>
      {/* ═══ HEADER — hidden when embedded in LumoraShell ═══ */}
      {!embedded && (
      <header className="flex items-center justify-between h-11 px-3 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold rounded transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }}>
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.25)' }} />
          <span className="font-extrabold text-xs md:text-sm text-white" style={{ fontFamily: "var(--font-sans)" }}>Coding</span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-500/15 border-red-500/30 text-red-300' :
              timerSeconds === 0 ? 'bg-white/10 border-white/20 text-white/70' :
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
              <button onClick={stopTimer} className="ml-1 text-white/75 hover:text-red-400 transition-colors" title="Stop timer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              {[15, 30, 45, 60].map(m => (
                <button key={m} onClick={() => startTimer(m)}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-white/75 hover:text-white hover:bg-white/10 rounded transition-colors"
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
                background: 'linear-gradient(110deg, rgba(38,97,156,0.18) 0%, rgba(34,211,238,0.10) 100%)',
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
              <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-wider">Generating</span>
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
              setTimeout(() => onSubmit(trimmed, language), 500);
            }}
            autoStart={false}
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
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar"
            style={{
              background: 'var(--cam-hero-strip)',
              borderBottom: '1px solid var(--cam-gold-leaf)',
            }}
          >
            <div
              className="flex items-center gap-1 px-1 py-1 shrink-0"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 999,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.25)',
              }}
            >
              <button
                onClick={() => setProblemTab('description')}
                className="px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-[background-color,color,transform] active:scale-[0.98]"
                style={
                  problemTab === 'description'
                    ? { background: 'var(--cam-gold-leaf)', color: '#020617', borderRadius: 999, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
                    : { color: 'rgba(255,255,255,0.85)', borderRadius: 999 }
                }
              >Description</button>
              <button
                onClick={() => setProblemTab('solution')}
                className="px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-[background-color,color,transform] active:scale-[0.98] flex items-center gap-1.5"
                style={
                  problemTab === 'solution'
                    ? { background: 'var(--cam-gold-leaf)', color: '#020617', borderRadius: 999, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
                    : { color: 'rgba(255,255,255,0.85)', borderRadius: 999 }
                }
              >
                Solution
                {isStreaming && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: problemTab === 'solution' ? '#020617' : 'var(--cam-gold-leaf-lt)' }} />}
              </button>
            </div>
            {/* New Problem — wipes every solution-side state so the user
                can dictate / paste / fetch a fresh problem in the same
                session without refreshing the page. Always clickable —
                the shared isStreaming flag is set by Sona's stream too,
                and disabling on it would lock the user out whenever
                Sona was answering. handleNewProblem aborts any active
                stream as part of the reset. */}
            <button
              onClick={handleNewProblem}
              className="ml-auto shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-colors"
              style={{
                color: 'rgba(255,255,255,0.85)',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              title="New Problem — reset everything for a fresh question"
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
                {codingPlatform && codingPlatform !== 'none' ? (
                  <div
                    className="flex items-center justify-between px-3 py-2"
                    style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {screenPermStatus && screenPermStatus !== 'granted' ? (
                        /* Screen Recording not granted — detection will never fire */
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <span className="text-[11px] font-semibold truncate" style={{ color: '#f59e0b' }}>
                            Screen Recording not granted — auto-detect paused
                          </span>
                          <button
                            onClick={() => (window as any).camo?.openSystemPrivacy?.('screen')}
                            className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors hover:opacity-80"
                            style={{ background: '#f59e0b', color: '#000' }}
                          >
                            Fix in Settings
                          </button>
                        </>
                      ) : problemText ? (
                        /* Problem captured, solution on its way */
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--cam-gold-leaf)' }}>
                          Problem loaded — solution generating
                        </span>
                      ) : (
                        /* Actively monitoring */
                        <>
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#00ea64' }} />
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00ea64' }} />
                          </span>
                          <span className="text-[11px] font-semibold truncate" style={{ color: '#00ea64' }}>
                            {`Monitoring ${({ hackerrank: 'HackerRank', leetcode: 'LeetCode', coderpad: 'CoderPad' } as Record<string,string>)[codingPlatform] ?? codingPlatform} — problem appears automatically`}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Snap — getDisplayMedia in browser, Electron API on desktop */}
                      <button
                          onClick={handleSnap}
                          disabled={snapState === 'capturing'}
                          title={snapState === 'error' ? 'Snap failed — check Screen Recording in System Settings' : 'Snap screen — silently captures and extracts the problem'}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all hover:opacity-90 active:scale-[0.97]"
                          style={snapState === 'done'
                            ? { background: '#00ea64', color: '#000', border: '1px solid #00ea64' }
                            : snapState === 'error'
                            ? { background: '#ef4444', color: '#fff', border: '1px solid #ef4444' }
                            : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }}
                        >
                          {snapState === 'capturing'
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            : snapState === 'done'
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : snapState === 'error'
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          }
                          {snapState === 'capturing' ? 'Capturing…' : snapState === 'done' ? 'Got it' : snapState === 'error' ? 'Failed' : 'Snap'}
                        </button>
                      {/* Stealth — injects tracking neutralizer on desktop; shows desktop-only alert in browser */}
                      <button
                          onClick={handleStealthMode}
                          title={isStealthActive ? 'Stealth active — mouse tracking blocked' : 'Stealth mode — block HackerRank mouse tracking'}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 transition-colors hover:opacity-90 active:scale-[0.97]"
                          style={isStealthActive
                            ? { background: '#00ea64', color: '#000' }
                            : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }
                          }
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            {isStealthActive
                              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                              : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            }
                          </svg>
                          {isStealthActive ? 'Stealth ON' : 'Stealth'}
                        </button>
                      {/* AudioCapture only shown here in embedded mode; non-embedded uses the header instance */}
                      {embedded && (
                        <AudioCapture
                          onTranscription={(text) => {
                            const trimmed = text.trim();
                            if (!trimmed) return;
                            setProblemText(trimmed);
                            setTimeout(() => onSubmit(trimmed, language), 500);
                          }}
                          autoStart={false}
                        />
                      )}
                      {/* Allow manual collapse/expand even in autopilot mode */}
                      <button
                        onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                        className="flex items-center justify-center w-7 h-7 transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]"
                        style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}
                        aria-label={isInputCollapsed ? 'Expand' : 'Collapse'}
                      >
                        <svg className={`w-3 h-3 transition-transform ${isInputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Manual mode: show Text / URL / Image picker as before */
                  <div
                    className="flex items-center justify-between px-3 py-2"
                    style={{
                      background: 'var(--cam-hero-strip)',
                      borderBottom: '1px solid var(--cam-gold-leaf)',
                    }}
                  >
                    <div
                      className="flex items-center gap-1 px-1 py-1"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        borderRadius: 999,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.25)',
                      }}
                    >
                      {(['paste', 'url', 'image'] as const).map(mode => (
                        <button key={mode} onClick={() => { setInputMode(mode); setIsInputCollapsed(false); }}
                          className="px-3.5 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-[background-color,color,transform] active:scale-[0.98]"
                          style={
                            inputMode === mode
                              ? { background: 'var(--cam-gold-leaf)', color: '#020617', borderRadius: 999, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
                              : { color: 'rgba(255,255,255,0.85)', borderRadius: 999 }
                          }
                        >{mode === 'paste' ? 'Text' : mode === 'url' ? 'URL' : 'Image'}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                          onClick={handleSnap}
                          disabled={snapState === 'capturing'}
                          title={snapState === 'error' ? 'Snap failed — check Screen Recording in System Settings' : 'Snap screen — silently captures and extracts the problem'}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all hover:opacity-90"
                          style={snapState === 'done'
                            ? { background: '#00ea64', color: '#000', border: '1px solid #00ea64' }
                            : snapState === 'error'
                            ? { background: '#ef4444', color: '#fff', border: '1px solid #ef4444' }
                            : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }}
                        >
                          {snapState === 'capturing'
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            : snapState === 'done'
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : snapState === 'error'
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          }
                          {snapState === 'capturing' ? 'Capturing…' : snapState === 'done' ? 'Got it' : snapState === 'error' ? 'Failed' : 'Snap'}
                        </button>
                      <button
                          onClick={handleStealthMode}
                          title={isStealthActive ? 'Stealth active' : 'Block HackerRank mouse tracking'}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors hover:opacity-90"
                          style={isStealthActive
                            ? { background: '#00ea64', color: '#000' }
                            : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }
                          }
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            {isStealthActive
                              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                              : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            }
                          </svg>
                          {isStealthActive ? 'Stealth ON' : 'Stealth'}
                        </button>
                      {embedded && (
                        <AudioCapture
                          onTranscription={(text) => {
                            const trimmed = text.trim();
                            if (!trimmed) return;
                            setProblemText(trimmed);
                            setTimeout(() => onSubmit(trimmed, language), 500);
                          }}
                          autoStart={false}
                        />
                      )}
                      <button
                        onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                        className="flex items-center justify-center w-7 h-7 transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]"
                        style={{
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.16)',
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.06)',
                        }}
                        aria-label={isInputCollapsed ? 'Expand input' : 'Collapse input'}
                      >
                        <svg className={`w-3 h-3 transition-transform ${isInputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3 md:p-4 space-y-3">
                  {/* Collapsible Content */}
                  {!isInputCollapsed && (
                    <div className="space-y-3">

                      {/* Input Areas */}
                      {inputMode === 'paste' && (
                        <textarea id="problem-text"
                          value={problemText}
                          onChange={(e) => { setProblemText(e.target.value); setStarterCode(null); }}
                          onDrop={handleDrop}
                          onDragOver={(e) => e.preventDefault()}
                          placeholder="Paste your coding problem here...&#10;&#10;Example: Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                          className="w-full h-[140px] sm:h-[180px] md:h-[220px] max-h-[40dvh] rounded-lg p-3 text-xs md:text-sm leading-relaxed placeholder:text-[var(--text-dimmed)] resize-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 focus:outline-none transition-all"
                          style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }}
                        />
                      )}

                      {inputMode === 'url' && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input type="url" id="problem-url" name="problem-url" value={problemUrl} onChange={(e) => setProblemUrl(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !isProcessing && problemUrl.trim()) handleFetchFromUrl(); }}
                              placeholder="https://leetcode.com/problems/two-sum/"
                              className="flex-1 rounded-lg px-3 py-2 text-xs md:text-sm placeholder:text-[var(--text-dimmed)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 focus:outline-none transition-all"
                              style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                            <button type="button" onClick={handleFetchFromUrl} disabled={isProcessing || !problemUrl.trim()}
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
                        <div className="space-y-2">
                          <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-[var(--accent)]/50 transition-[border-color,background-color]"
                            style={{ borderColor: t.inputBorder }}>
                            <input ref={fileInputRef} type="file" id="problem-image" name="problem-image" accept="image/*" onChange={handleImageSelect} className="hidden" />
                            {imagePreview ? (
                              <img src={imagePreview} alt="Problem" className="max-h-32 mx-auto rounded-lg" />
                            ) : (
                              <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center" style={{ background: t.sectionBg }}>
                                  <svg className="w-5 h-5" style={{ color: t.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <p className="text-xs" style={{ color: t.textDim }}>Drop image or click — auto-extracts and answers</p>
                              </div>
                            )}
                          </div>
                          {isProcessing && (
                            <div className="w-full py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2"
                              style={{ background: t.sectionBg, color: t.text }}>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Reading the problem…
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="p-2.5 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>{error}</div>
                  )}

                  {/* Generate Button */}
                  <button onClick={handleGenerateSolution} disabled={isLoading || !problemText.trim()}
                    className="w-full py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-[opacity,transform] active:scale-[0.98] flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, var(--cam-primary), var(--cam-primary))', borderRadius: '10px' }}>
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Coding</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ═══ SOLUTION TAB — AI-Inspired Modern Display ═══ */}
            {problemTab === 'solution' && (
              <div className="p-2 md:p-3">
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
                      title="Force a fresh solve, ignoring the cache. The new result is cached too — useful when the cached answer was wrong or you want a different approach."
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

                {/* JSON Solution — Modern Cards */}
                {sd && (
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

                    {/* ── ACTIVE SOLUTION APPROACH ── */}
                    {(() => {
                      const activeSol = sd.solutions?.[activeSolutionIdx];
                      if (activeSol) return (
                        <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                          <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: t.badgeBg, color: t.badgeText }}>{activeSolutionIdx + 1}</div>
                            <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: t.headerText }}>{activeSol.name}</h4>
                            {activeSol.patternTag && (
                              <span className="text-[9px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
                                title="Canonical interview pattern"
                                style={{ color: '#FFFFFF', background: 'var(--cam-primary)', letterSpacing: '0.04em' }}>
                                {activeSol.patternTag}
                              </span>
                            )}
                            {activeSol.complexity && (
                              <div className="ml-auto flex gap-1.5">
                                <span className="text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>{activeSol.complexity.time}</span>
                                <span className="text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>{activeSol.complexity.space}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 space-y-2">
                            {activeSol.approach && <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{activeSol.approach}</p>}
                            {activeSol.explanations?.length > 0 && (
                              <div className="space-y-1 pt-1" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
                                {activeSol.explanations.map((ex: any, j: number) => (
                                  <div key={j} className="flex items-start gap-2 text-[10px] md:text-[11px]">
                                    <code className="font-mono px-1 py-0.5 rounded shrink-0" style={{ color: t.codeText, background: t.codeBg }}>{ex.code}</code>
                                    <span style={{ color: t.textMuted }}>{ex.explanation}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {activeSol.narration && (
                              <div
                                className="rounded-lg mt-2"
                                style={{
                                  background: 'var(--accent-subtle)',
                                  border: '1px solid var(--border)',
                                  borderLeft: '3px solid var(--cam-primary)',
                                }}>
                                <div
                                  className="flex items-center justify-between px-2.5 py-1.5"
                                  style={{ borderBottom: '1px solid var(--border)' }}>
                                  <div className="flex items-center gap-1.5">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cam-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                      <line x1="12" y1="19" x2="12" y2="22" />
                                    </svg>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--cam-primary-dk)' }}>Say this out loud</span>
                                  </div>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(activeSol.narration)}
                                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded hover:bg-black/5"
                                    style={{ color: 'var(--cam-primary-dk)' }}>
                                    Copy
                                  </button>
                                </div>
                                <p className="px-2.5 py-2 text-[12px] leading-[1.55]" style={{ color: 'var(--text-primary)', fontFamily: "var(--font-sans)", opacity: 1 }}>
                                  {activeSol.narration}
                                </p>
                              </div>
                            )}
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
                                      <span key={j} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full" style={{ background: t.badgeBg, color: t.badgeText, border: `1px solid ${t.cardBorder}` }}>
                                        <span className="w-1 h-1 rounded-full" style={{ background: t.dotColor }} />{p}
                                      </span>
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
                        <div className="flex items-center gap-2 px-3 py-2" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Summary</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {sd.pitch.opener && <p className="text-xs font-semibold" style={{ color: t.text }}>{sd.pitch.opener}</p>}
                          {sd.pitch.approach && <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{sd.pitch.approach}</p>}
                          {sd.pitch.keyPoints?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {sd.pitch.keyPoints.map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full" style={{ background: t.badgeBg, color: t.badgeText, border: `1px solid ${t.cardBorder}` }}>
                                  <span className="w-1 h-1 rounded-full" style={{ background: t.dotColor }} />{p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── TRADEOFFS ── */}
                    {sd.pitch?.tradeoffs?.length > 0 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <div className="flex items-center gap-2 px-3 py-2" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Tradeoffs</span>
                        </div>
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
                      </div>
                    )}

                    {/* ── EDGE CASES ── */}
                    {sd.pitch?.edgeCases?.length > 0 && (
                      <div className="rounded-xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <div className="flex items-center gap-2 px-3 py-2" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Edge Cases</span>
                        </div>
                        <ul className="p-3 space-y-1.5">
                          {sd.pitch.edgeCases.map((e: string, i: number) => (
                            <li key={i} className="text-xs flex items-start gap-2 leading-relaxed" style={{ color: t.textMuted }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: t.dotColor }} />
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ── FOLLOW-UP Q&A (context-scoped, no leaving the tab) ── */}
                    {problemText.trim() && token && (
                      <FollowupAsk
                        problem={problemText}
                        activeSolutionName={sd.solutions?.[activeSolutionIdx]?.name}
                        activeSolutionCode={sd.solutions?.[activeSolutionIdx]?.code}
                        token={token}
                      />
                    )}

                    {/* ── LINE-BY-LINE WALKTHROUGH ── */}
                    {sd.explanations?.length > 0 && (
                      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
                        <div className="flex items-center gap-2 px-3 py-2" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                          <svg className="w-3.5 h-3.5" style={{ color: t.headerText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.headerText }}>Code Walkthrough</span>
                          <span className="ml-auto text-[9px] font-mono rounded-full px-1.5 py-0.5" style={{ color: t.badgeText, background: t.badgeBg, border: `1px solid ${t.cardBorder}` }}>{sd.explanations.length} lines</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: t.cardBorder }}>
                          {sd.explanations.map((ex: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 transition-colors">
                              <span className="flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono shrink-0 mt-0.5" style={{ background: t.badgeBg, color: t.badgeText }}>L{ex.line}</span>
                              <div className="min-w-0">
                                {ex.code && <code className="text-[10px] font-mono block truncate" style={{ color: t.codeText }}>{ex.code}</code>}
                                <span className="text-[10px] md:text-xs leading-relaxed" style={{ color: t.textMuted }}>{ex.explanation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy block display */}
                {!sd && parsedBlocks && Array.isArray(parsedBlocks) && parsedBlocks.length > 0 && (
                  <LegacySolutionCards
                    blocks={parsedBlocks}
                    collapsedCards={collapsedCards}
                    onToggle={(t) => { const n = new Set(collapsedCards); n.has(t) ? n.delete(t) : n.add(t); setCollapsedCards(n); }}
                    onTestCaseClick={(input, expected) => {
                      const hasEmpty = testCases.some(tc => !tc.input.trim());
                      if (hasEmpty) {
                        let replaced = false;
                        setTestCases(testCases.map(tc => {
                          if (!replaced && !tc.input.trim()) { replaced = true; return { input, expected }; }
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

        {/* ── RIGHT PANEL: Code Editor + Output ── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: t.surfaceBg, color: t.text }}>
          {/* Editor Header */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: t.sectionBg, borderBottom: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-center gap-2">
              <select id="language-select" name="language" value={language} onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isTranslating}
                className="rounded-md px-2 py-1 text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-60" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText }}>
                {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {isTranslating && (
                <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--cam-primary)' }}>
                  <div className="w-3 h-3 border-2 border-[rgba(38,97,156,0.3)] border-t-[var(--cam-primary)] rounded-full animate-spin" />
                  Translating…
                </span>
              )}
              <button onClick={handleRun} disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1 text-white text-xs font-bold rounded-md disabled:opacity-50 transition-colors shadow-sm" style={{ background: 'var(--cam-primary)' }}
                title="Run (Ctrl+Enter)">
                {isRunning ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
                ) : (
                  <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Run</>
                )}
              </button>
              {showFixPrompt && (
                <button onClick={handleAutoFix}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-md hover:bg-amber-600 transition-colors shadow-sm"
                  title="Auto-fix failed tests">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Auto-Fix
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="p-1.5 rounded-md transition-colors" style={{ color: t.textMuted }} title="Reset">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={handleCopyCode} className="p-1.5 rounded-md transition-colors" style={copyFeedback ? { color: 'var(--cam-primary)', background: t.badgeBg } : { color: t.textDim }} title="Copy code">
                {copyFeedback ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Code Editor — uses ref-based height instead of 100% for reliable Monaco rendering ── */}
          <EditorContainer embedded={!!embedded}>
            {(height) => (
              <SharedCodeEditor
                height={`${height}px`}
                language={getLanguageById(language)?.monaco || 'python'}
                code={code}
                onChange={setCode}
                theme="vs-dark"
                fontSize={13}
              />
            )}
          </EditorContainer>

          {/* ── Vertical Resize Handle ── */}
          {!isOutputCollapsed && (
            <div onMouseDown={() => setIsResizingV(true)}
              className="h-1.5 hover:bg-[rgba(38,97,156,0.1)] cursor-row-resize transition-colors flex justify-center items-center group"
              style={{ background: t.sectionBg }}>
              <div className="w-8 h-0.5 group-hover:bg-[var(--accent)] rounded-full transition-colors" style={{ background: t.textDim }} />
            </div>
          )}

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

                    {/* Raw output */}
                    {output && !testResults.length && (
                      <pre className="font-mono text-xs whitespace-pre-wrap p-2 rounded-lg min-h-[40px]" style={{ color: t.text, background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>{output}</pre>
                    )}
                    {output && testResults.length > 0 && output.includes('─') && (
                      <pre className="font-mono text-[10px] whitespace-pre-wrap p-2 rounded-lg" style={{ color: t.textMuted, background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
                        {output.split('─'.repeat(40))[1]?.trim()}
                      </pre>
                    )}
                    {!output && !testResults.length && (
                      <div className="text-center py-4 text-xs" style={{ color: t.textDim }}>
                        Click <span className="font-bold">Run</span> to execute your code <span className="font-mono" style={{ color: t.textDim }}>(Ctrl+Enter)</span>
                      </div>
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

// ── Editor Container — measures its own height via ResizeObserver for Monaco ──
function EditorContainer({ children, embedded: _embedded }: { children: (height: number) => React.ReactNode; embedded: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.floor(entry.contentRect.height);
        if (h > 50) setHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex-1 overflow-hidden" style={{ minHeight: 200 }}>
      {children(height)}
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
    { type: 'FOLLOWUP', title: 'Follow-up Q&A', color: 'accent' },
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
