import { useState, useRef, useCallback, useEffect } from 'react';
import { useInterviewStore } from '@/stores/interview-store';
import { useAuth } from '@/contexts/AuthContext';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import { LANGUAGES, getLanguageById } from '@/data/languages';

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
      let input = arrowMatch[1].trim().replace(/^Input[:\s]*/i, '').trim();
      let expected = arrowMatch[2].trim().replace(/^(Output|Expected)[:\s]*/i, '').trim();
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

/** Format seconds as MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Color-code complexity notation from best (green) to worst (red) */
function getComplexityColor(notation: string): string {
  const n = notation.toLowerCase().replace(/\s+/g, '');
  if (/o\(1\)/.test(n)) return '#059669';           // O(1) - best
  if (/o\(log/.test(n) && !/o\(n/.test(n)) return '#0891b2'; // O(log n) - great
  if (/o\(n\)$/.test(n)) return '#2563eb';           // O(n) - good
  if (/o\(n\s*log\s*n\)|o\(nlogn\)/.test(notation.toLowerCase())) return '#7c3aed'; // O(n log n)
  if (/o\(n[\^²]2?\)/.test(n)) return '#d97706';     // O(n²) - fair
  if (/o\(n[\^]3\)|o\(n³\)/.test(n)) return '#ea580c'; // O(n³) - poor
  if (/o\(2[\^]n\)|o\(n!\)|o\(n\^n\)/.test(n)) return '#dc2626'; // exponential - bad
  return '#6b7280';
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
  onSubmit: (problem: string, language: string) => void;
  isLoading?: boolean;
  onBack: () => void;
  initialProblem?: string;
  /** When true, hides internal header and uses flex-1 instead of h-screen (for embedding in LumoraShell) */
  embedded?: boolean;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CodingLayout({ onSubmit, isLoading, onBack, initialProblem, embedded }: CodingLayoutProps) {
  const { token } = useAuth();

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<Array<{ input: string; expected: string }>>([{ input: '', expected: '' }]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [fixError, setFixError] = useState('');
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [activeSolutionIdx, setActiveSolutionIdx] = useState(0);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(0); // 0 = off
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Panel resize
  const [leftPanelWidth, setLeftPanelWidth] = useState(42);
  const [outputPanelHeight, setOutputPanelHeight] = useState(220);
  const [isResizingH, setIsResizingH] = useState(false);
  const [isResizingV, setIsResizingV] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);

  // Expanded follow-up
  const [expandedFollowup, setExpandedFollowup] = useState<number | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store
  const { streamChunks, parsedBlocks, isStreaming, clearStreamChunks, setParsedBlocks } = useInterviewStore();

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
          const firstError = data.results.find((r: TestResult) => r.error)?.error ||
                             data.results.find((r: TestResult) => !r.passed)?.output || 'Test failed';
          setFixError(firstError);
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

  const handleAutoFix = useCallback(async () => {
    if (!token) {
      setOutput(prev => prev + '\nAuto-fix: not authenticated');
      return;
    }
    setShowFixPrompt(false);
    setOutput('Auto-fixing code...');
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, language, error: fixError, problem: problemText }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `Fix failed: ${resp.status}`);
      }
      const data = await resp.json();
      if (data.code) {
        setCode(data.code);
        setOutput('Code fixed! Click Run to test again.' + (data.explanation ? `\n\nFix: ${data.explanation}` : ''));
      } else {
        setOutput('Auto-fix returned no code. Try editing manually.');
      }
    } catch (err: any) {
      setOutput(`Auto-fix failed: ${err.message || 'Unknown error'}. Try editing the code manually.`);
    }
  }, [token, code, language, fixError, problemText]);

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

  // ── Parse solution from stream ──────────────────────────────────────────

  useEffect(() => {
    const pb = parsedBlocks as any;
    const jsonData = pb && !Array.isArray(pb) ? (pb.json || pb) : null;
    if (jsonData && (jsonData.code || jsonData.solutions)) {
      setJsonSolution(jsonData);
      // New multi-solution format
      if (jsonData.solutions?.length > 0) {
        setActiveSolutionIdx(0);
        setCode(jsonData.solutions[0].code);
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

  // Sync code from jsonSolution when it's set but code is still default
  useEffect(() => {
    if (jsonSolution && code === getDefaultCode(language)) {
      if (jsonSolution.solutions?.length > 0) {
        setCode(jsonSolution.solutions[activeSolutionIdx || 0]?.code || jsonSolution.solutions[0].code);
      } else if (jsonSolution.code) {
        setCode(jsonSolution.code);
      }
    }
  }, [jsonSolution]); // eslint-disable-line react-hooks/exhaustive-deps

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
            setCode(json.solutions[0].code);
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

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (!code || code === getDefaultCode(language)) setCode(getDefaultCode(newLang));
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
    setError(null);
    setTestResults([]);
    setShowFixPrompt(false);
    clearStreamChunks();
    setParsedBlocks([]);
    setJsonSolution(null);
    setCode(getDefaultCode(language));
    setCollapsedCards(new Set());
    setActiveSolutionIdx(0);
    onSubmit(problemText.trim(), language);
  };

  const handleFetchFromUrl = async () => {
    if (!problemUrl.trim()) { setError('Please enter a URL'); return; }
    if (!token) { setError('Not authenticated'); return; }
    setIsProcessing(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/fetch-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: problemUrl }),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || 'Failed to fetch');
      const data = await resp.json();
      setProblemText(data.problem);
      setInputMode('paste');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractFromImage = async () => {
    if (!imageFile) { setError('Select an image first'); return; }
    if (!token) { setError('Not authenticated'); return; }
    setIsProcessing(true);
    setError(null);
    setProblemText('');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || 'Failed to extract');
      const data = await resp.json();
      setProblemText(data.problem);
      setInputMode('paste');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

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
    <div className={embedded ? 'flex-1 flex flex-col min-h-0' : 'h-screen w-full flex flex-col lumora-app-bg'}>
      {/* ═══ HEADER — hidden when embedded in LumoraShell ═══ */}
      {!embedded && (
      <header className="flex items-center justify-between h-11 px-3 shrink-0" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,27,75,0.96) 50%, rgba(15,23,42,0.98) 100%)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
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
            <span className="text-white font-extrabold text-xs md:text-sm" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Coding</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-50 border-red-200 text-red-600' :
              timerSeconds === 0 ? 'bg-white/10 border-white/20 text-white/70' :
              'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
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

          <AudioCapture
            onTranscription={(text) => {
              if (text.trim()) {
                setProblemText(text.trim());
                // Auto-submit after voice input
                setTimeout(() => onSubmit(text.trim(), language), 500);
              }
            }}
            autoStart={false}
          />
        </div>
      </header>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── LEFT PANEL: Problem / Solution ── */}
        <div className={`w-full md:w-auto flex flex-col md:border-r border-b md:border-b-0 coding-left-panel max-h-[40vh] md:max-h-none overflow-auto ${embedded ? 'border-[var(--border)]' : 'bg-white border-gray-200 lumora-light-panel'}`} style={{ ['--left-w' as any]: `${leftPanelWidth}%` }}>
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50/50 border-b border-gray-100">
            <button
              onClick={() => setProblemTab('description')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                problemTab === 'description' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >Description</button>
            <button
              onClick={() => setProblemTab('solution')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                problemTab === 'solution' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              Solution
              {isStreaming && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {problemTab === 'description' && (
              <div className="p-3 md:p-4 space-y-3">
                {/* Collapsible Input Section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Collapse/Expand Header */}
                  <button
                    onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isInputCollapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-700">Problem Input</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">{inputMode === 'paste' ? 'Paste' : inputMode === 'url' ? 'URL' : 'Image'}</span>
                    </div>
                    {problemText && isInputCollapsed && (
                      <span className="text-[10px] text-indigo-600 font-medium truncate max-w-[200px]">
                        {problemText.slice(0, 50)}{problemText.length > 50 ? '...' : ''}
                      </span>
                    )}
                  </button>

                  {/* Collapsible Content */}
                  {!isInputCollapsed && (
                    <div className="p-3 space-y-3 border-t border-gray-100">
                      {/* Input Mode Toggle */}
                      <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg w-fit">
                        {(['paste', 'url', 'image'] as const).map(mode => (
                          <button key={mode} onClick={() => setInputMode(mode)}
                            className={`px-3 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-all ${
                              inputMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >{mode === 'paste' ? 'Paste' : mode === 'url' ? 'URL' : 'Image'}</button>
                        ))}
                      </div>

                      {/* Input Areas */}
                      {inputMode === 'paste' && (
                        <textarea
                          value={problemText}
                          onChange={(e) => setProblemText(e.target.value)}
                          onDrop={handleDrop}
                          onDragOver={(e) => e.preventDefault()}
                          placeholder="Paste your coding problem here...&#10;&#10;Example: Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                          className="w-full h-[180px] md:h-[220px] bg-white border border-gray-200 rounded-lg p-3 text-gray-900 text-xs md:text-sm leading-relaxed placeholder:text-gray-400 resize-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 focus:outline-none transition-all"
                        />
                      )}

                      {inputMode === 'url' && (
                        <div className="flex gap-2">
                          <input type="url" value={problemUrl} onChange={(e) => setProblemUrl(e.target.value)}
                            placeholder="https://leetcode.com/problems/two-sum/"
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs md:text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 focus:outline-none transition-all" />
                          <button onClick={handleFetchFromUrl} disabled={isProcessing || !problemUrl.trim()}
                            className="px-4 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                            {isProcessing ? 'Loading...' : 'Fetch'}
                          </button>
                        </div>
                      )}

                      {inputMode === 'image' && (
                        <div className="space-y-2">
                          <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-50/30 transition-all">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                            {imagePreview ? (
                              <img src={imagePreview} alt="Problem" className="max-h-32 mx-auto rounded-lg" />
                            ) : (
                              <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <p className="text-gray-400 text-xs">Drop image or click to upload</p>
                              </div>
                            )}
                          </div>
                          {imageFile && (
                            <button onClick={handleExtractFromImage} disabled={isProcessing}
                              className="w-full py-2 bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 transition-all">
                              {isProcessing ? 'Extracting...' : 'Extract Text'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{error}</div>
                )}

                {/* Generate Button */}
                <button onClick={handleGenerateSolution} disabled={isLoading || !problemText.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold rounded-lg hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm">
                  {isLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate Solution</>
                  )}
                </button>
              </div>
            )}

            {/* ═══ SOLUTION TAB — AI-Inspired Modern Display ═══ */}
            {problemTab === 'solution' && (
              <div className="p-2 md:p-3">
                {/* Streaming state */}
                {(isStreaming || (isLoading && !sd && !parsedBlocks?.length)) && !sd && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <div className="relative w-5 h-5 shrink-0">
                        <div className="absolute inset-0 border-2 border-indigo-400/30 rounded-full" />
                        <div className="absolute inset-0 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-indigo-300">Analyzing problem & generating solution...</span>
                        <div className="flex gap-1 mt-2">
                          {['Problem', 'Approach', 'Code', 'Tests'].map((step, i) => (
                            <span key={step} className="text-[9px] px-2 py-0.5 rounded-full font-medium animate-pulse" style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,180,252,0.6)', animationDelay: `${i * 200}ms` }}>{step}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* JSON Solution — Modern Cards */}
                {sd && (
                  <div className="space-y-3 solution-cards-appear">

                    {/* ── SOLUTION TABS (when multiple solutions) ── */}
                    {sd.solutions?.length > 1 && (
                      <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                        {sd.solutions.map((sol: any, i: number) => {
                          const solColors = ['indigo', 'blue', 'violet', 'amber', 'cyan'];
                          const c = solColors[i % solColors.length];
                          return (
                            <button key={i}
                              onClick={() => { setActiveSolutionIdx(i); setCode(sol.code); }}
                              className={`flex-1 px-2 py-1.5 text-[10px] md:text-xs font-semibold rounded-md transition-all text-center ${
                                activeSolutionIdx === i
                                  ? `bg-white text-gray-900 shadow-sm`
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <div className="truncate">{sol.name || `Solution ${i + 1}`}</div>
                              {sol.complexity && (
                                <div className={`text-[9px] font-mono mt-0.5 ${activeSolutionIdx === i ? 'text-gray-400' : 'text-gray-400'}`}>
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
                      const solColors = [
                        { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-600' },
                        { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-600' },
                        { bg: 'bg-violet-50/50', border: 'border-violet-100', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-600' },
                      ];
                      const sc = solColors[activeSolutionIdx % solColors.length];

                      if (activeSol) return (
                        <div className={`rounded-xl border ${sc.border} bg-white overflow-hidden shadow-sm`}>
                          <div className={`flex items-center gap-2 px-3 py-2.5 ${sc.bg} border-b ${sc.border}`}>
                            <div className={`w-5 h-5 rounded-md ${sc.badge} flex items-center justify-center text-[10px] font-bold`}>{activeSolutionIdx + 1}</div>
                            <h4 className={`text-[10px] md:text-xs font-bold ${sc.text} uppercase tracking-wider`}>{activeSol.name}</h4>
                            {activeSol.complexity && (
                              <div className="ml-auto flex gap-1.5">
                                <span className="text-[9px] font-mono text-cyan-600 bg-cyan-50 border border-cyan-200 rounded-full px-1.5 py-0.5">{activeSol.complexity.time}</span>
                                <span className="text-[9px] font-mono text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">{activeSol.complexity.space}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 space-y-2">
                            {activeSol.approach && <p className="text-xs text-gray-600 leading-relaxed">{activeSol.approach}</p>}
                            {activeSol.explanations?.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-gray-100">
                                {activeSol.explanations.map((ex: any, j: number) => (
                                  <div key={j} className="flex items-start gap-2 text-[10px] md:text-[11px]">
                                    <code className="font-mono text-gray-800 bg-gray-50 px-1 py-0.5 rounded shrink-0">{ex.code}</code>
                                    <span className="text-gray-500">{ex.explanation}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );

                      // Fallback: old single-solution format
                      if (sd.pitch) return (
                        <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden shadow-sm">
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50/50 border-b border-indigo-100">
                            <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            </div>
                            <h4 className="text-[10px] md:text-xs font-bold text-indigo-700 uppercase tracking-wider">Approach</h4>
                          </div>
                          <div className="p-3 space-y-2">
                            {typeof sd.pitch === 'string' ? (
                              <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{sd.pitch}</p>
                            ) : (
                              <>
                                {sd.pitch.opener && <p className="text-xs md:text-sm font-semibold text-gray-900">{sd.pitch.opener}</p>}
                                {sd.pitch.approach && <p className="text-xs text-gray-600 leading-relaxed">{sd.pitch.approach}</p>}
                                {sd.pitch.keyPoints?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {sd.pitch.keyPoints.map((p: string, j: number) => (
                                      <span key={j} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                                        <span className="w-1 h-1 rounded-full bg-indigo-400" />{p}
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
                      <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 border-b border-indigo-100">
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Summary</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {sd.pitch.opener && <p className="text-xs font-semibold text-gray-900">{sd.pitch.opener}</p>}
                          {sd.pitch.approach && <p className="text-xs text-gray-600 leading-relaxed">{sd.pitch.approach}</p>}
                          {sd.pitch.keyPoints?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {sd.pitch.keyPoints.map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                                  <span className="w-1 h-1 rounded-full bg-indigo-400" />{p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── TRADEOFFS ── */}
                    {sd.pitch?.tradeoffs?.length > 0 && (
                      <div className="rounded-xl border border-amber-100 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50 border-b border-amber-100">
                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Tradeoffs</span>
                        </div>
                        <ul className="p-3 space-y-1.5">
                          {sd.pitch.tradeoffs.map((t: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                              <svg className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ── EDGE CASES ── */}
                    {sd.pitch?.edgeCases?.length > 0 && (
                      <div className="rounded-xl border border-rose-100 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50/50 border-b border-rose-100">
                          <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Edge Cases</span>
                        </div>
                        <ul className="p-3 space-y-1.5">
                          {sd.pitch.edgeCases.map((e: string, i: number) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0 mt-1.5" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ── LINE-BY-LINE WALKTHROUGH ── */}
                    {sd.explanations?.length > 0 && (
                      <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/50 border-b border-indigo-100">
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Code Walkthrough</span>
                          <span className="ml-auto text-[9px] font-mono text-indigo-500 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5">{sd.explanations.length} lines</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {sd.explanations.map((ex: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 hover:bg-indigo-50/30 transition-colors">
                              <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold font-mono shrink-0 mt-0.5">L{ex.line}</span>
                              <div className="min-w-0">
                                {ex.code && <code className="text-[10px] font-mono text-gray-800 block truncate">{ex.code}</code>}
                                <span className="text-[10px] md:text-xs text-gray-500 leading-relaxed">{ex.explanation}</span>
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
                    <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-xs">Enter a problem and generate a solution</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal Resize Handle (desktop only) ── */}
        <div onMouseDown={() => setIsResizingH(true)}
          className="hidden md:flex w-1.5 bg-[var(--bg-elevated)] hover:bg-indigo-200 cursor-col-resize transition-colors items-center justify-center group shrink-0">
          <div className="w-0.5 h-8 bg-[var(--border)] group-hover:bg-indigo-500 rounded-full transition-colors" />
        </div>

        {/* ── RIGHT PANEL: Code Editor + Output ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${embedded ? '' : 'bg-white lumora-light-panel'}`}>
          {/* Editor Header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-900 text-xs font-mono focus:border-indigo-400 focus:outline-none cursor-pointer">
                {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" title="Reset">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={handleCopyCode} className={`p-1.5 rounded-md transition-colors ${copyFeedback ? 'text-indigo-500 bg-indigo-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`} title="Copy code">
                {copyFeedback ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Code Editor ── */}
          <div className="flex-1 overflow-hidden min-h-0">
            <SharedCodeEditor
              height="100%"
              language={getLanguageById(language)?.monaco || 'python'}
              code={code}
              onChange={setCode}
              theme={embedded ? 'vs-dark' : 'light'}
              fontSize={13}
            />
          </div>

          {/* ── Vertical Resize Handle ── */}
          {!isOutputCollapsed && (
            <div onMouseDown={() => setIsResizingV(true)}
              className="h-1.5 bg-gray-100 hover:bg-indigo-200 cursor-row-resize transition-colors flex justify-center items-center group">
              <div className="w-8 h-0.5 bg-gray-300 group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>
          )}

          {/* ═══ BOTTOM PANEL: Test Cases / Output ═══ */}
          <div className="border-t border-gray-200 flex flex-col bg-white shrink-0" style={{ height: isOutputCollapsed ? 36 : outputPanelHeight }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1 bg-gray-50 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={() => { setOutputTab('testcases'); setIsOutputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-colors ${
                    outputTab === 'testcases' && !isOutputCollapsed ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}>Test Cases</button>
                <button onClick={() => { setOutputTab('output'); setIsOutputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    outputTab === 'output' && !isOutputCollapsed ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  Output
                  {totalTests > 0 && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                      passedCount === totalTests ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{passedCount}/{totalTests}</span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  <svg className={`w-3 h-3 transition-transform ${isOutputCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button onClick={handleRun} disabled={isRunning}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500 text-white text-[10px] md:text-xs font-bold rounded-md hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-sm"
                  title="Run (Ctrl+Enter)">
                  {isRunning ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
                  ) : (
                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Run</>
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            {!isOutputCollapsed && (
              <div className="flex-1 overflow-y-auto p-2 md:p-3">
                {outputTab === 'testcases' && (
                  <div className="space-y-2">
                    {testCases.map((tc, i) => (
                      <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Case {i + 1}</span>
                          {testCases.length > 1 && (
                            <button onClick={() => removeTestCase(i)} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-medium text-gray-400 mb-0.5 uppercase">Input</label>
                            <textarea value={tc.input} onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                              placeholder="nums = [2,7], target = 9"
                              className="w-full h-10 bg-white border border-gray-200 rounded-md p-1.5 text-xs text-gray-900 placeholder:text-gray-300 resize-none focus:border-indigo-400 focus:outline-none font-mono" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-medium text-gray-400 mb-0.5 uppercase">Expected</label>
                            <textarea value={tc.expected} onChange={(e) => updateTestCase(i, 'expected', e.target.value)}
                              placeholder="[0, 1]"
                              className="w-full h-10 bg-white border border-gray-200 rounded-md p-1.5 text-xs text-gray-900 placeholder:text-gray-300 resize-none focus:border-indigo-400 focus:outline-none font-mono" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {testCases.length < MAX_TEST_CASES && (
                      <button onClick={addTestCase}
                        className="w-full py-1.5 border border-dashed border-gray-200 text-gray-400 text-[10px] font-semibold rounded-lg hover:border-indigo-300 hover:text-indigo-500 transition-colors">
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
                          <div key={i} className={`rounded-lg border p-2 text-xs transition-all ${
                            r.passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {r.passed ? (
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                              )}
                              <span className={`font-bold ${r.passed ? 'text-emerald-700' : 'text-red-700'}`}>Test {i + 1}</span>
                            </div>
                            <div className="space-y-0.5 font-mono text-[10px]">
                              <div><span className="text-gray-400">In:</span> <span className="text-gray-700">{r.input}</span></div>
                              <div><span className="text-gray-400">Exp:</span> <span className="text-gray-700">{r.expected}</span></div>
                              <div><span className="text-gray-400">Out:</span> <span className={r.passed ? 'text-emerald-700' : 'text-red-700'}>{r.output}</span></div>
                              {r.error && <div className="text-red-500 mt-1">{r.error}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Auto-fix prompt */}
                    {showFixPrompt && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-xs text-amber-700">Some tests failed.</span>
                        <button onClick={handleAutoFix}
                          className="ml-auto px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-md hover:bg-amber-600 transition-colors">
                          Auto-Fix
                        </button>
                        <button onClick={() => setShowFixPrompt(false)}
                          className="text-amber-400 hover:text-amber-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Raw output */}
                    {output && !testResults.length && (
                      <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded-lg border border-gray-100 min-h-[40px]">{output}</pre>
                    )}
                    {output && testResults.length > 0 && output.includes('─') && (
                      <pre className="font-mono text-[10px] text-gray-500 whitespace-pre-wrap bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {output.split('─'.repeat(40))[1]?.trim()}
                      </pre>
                    )}
                    {!output && !testResults.length && (
                      <div className="text-center py-4 text-gray-400 text-xs">
                        Click <span className="font-bold">Run</span> to execute your code <span className="text-gray-300 font-mono">(Ctrl+Enter)</span>
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
    { type: 'APPROACH', title: 'Approach', color: 'indigo' },
    { type: 'COMPLEXITY', title: 'Complexity', color: 'cyan' },
    { type: 'WALKTHROUGH', title: 'Walkthrough', color: 'indigo' },
    { type: 'EDGECASES', title: 'Edge Cases', color: 'rose' },
    { type: 'TESTCASES', title: 'Test Cases', color: 'amber' },
    { type: 'FOLLOWUP', title: 'Follow-up Q&A', color: 'violet' },
  ];

  const colorMap: Record<string, { header: string; border: string; bg: string; text: string }> = {
    indigo: { header: 'bg-indigo-50/50', border: 'border-indigo-100', bg: 'bg-white', text: 'text-indigo-700' },
    cyan: { header: 'bg-cyan-50/50', border: 'border-cyan-100', bg: 'bg-white', text: 'text-cyan-700' },
    rose: { header: 'bg-rose-50/50', border: 'border-rose-100', bg: 'bg-white', text: 'text-rose-700' },
    amber: { header: 'bg-amber-50/50', border: 'border-amber-100', bg: 'bg-white', text: 'text-amber-700' },
    violet: { header: 'bg-violet-50/50', border: 'border-violet-100', bg: 'bg-white', text: 'text-violet-700' },
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
              <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className="w-full text-left px-2 py-1 bg-amber-50 border border-amber-100 rounded-md hover:border-indigo-300 text-[10px] text-gray-600 font-mono hover:text-indigo-600 transition-colors">
                            {line}
                          </button>
                        );
                      }
                      return <div key={i} className="text-[10px] text-gray-500 font-mono">{line}</div>;
                    })}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {lines.map((line: string, i: number) => (
                      <div key={i} className="text-xs text-gray-600 leading-relaxed">{line}</div>
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
