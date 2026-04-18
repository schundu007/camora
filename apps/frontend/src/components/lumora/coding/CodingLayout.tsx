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
  if (/o\(1\)/.test(n)) return '#76B900';           // O(1) - best
  if (/o\(log/.test(n) && !/o\(n/.test(n)) return '#0891b2'; // O(log n) - great
  if (/o\(n\)$/.test(n)) return '#2563eb';           // O(n) - good
  if (/o\(n\s*log\s*n\)|o\(nlogn\)/.test(notation.toLowerCase())) return '#7c3aed'; // O(n log n)
  if (/o\(n[\^²]2?\)/.test(n)) return '#d97706';     // O(n²) - fair
  if (/o\(n[\^]3\)|o\(n³\)/.test(n)) return '#ea580c'; // O(n³) - poor
  if (/o\(2[\^]n\)|o\(n!\)|o\(n\^n\)/.test(n)) return '#5E9400'; // exponential - bad
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
  /** Ref that parent sets to receive voice transcriptions as problem input */
  onVoiceProblemRef?: React.MutableRefObject<((text: string) => void) | null>;
}

// ── Main Component ───────────────────────────────────────────────────────────

// ── Theme tokens — dark when embedded, light when standalone ──
function useTheme(_dark: boolean) {
  return {
    cardBg: '#ffffff', cardBorder: '#e5e7eb',
    headerBg: 'rgba(118,185,0,0.05)', headerBorder: '#D4F0A0',
    headerText: '#76B900', badgeBg: '#76B90010', badgeText: '#76B900',
    text: '#111827', textMuted: '#6b7280', textDim: '#9ca3af',
    codeBg: '#f9fafb', codeText: '#1f2937',
    inputBg: '#ffffff', inputBorder: '#e5e7eb', inputText: '#111827',
    sectionBg: '#f9fafb', surfaceBg: '#ffffff',
    tabActive: '#76B900', tabActiveBg: '#ffffff', tabText: '#6b7280',
    dotColor: '#76B900',
    passedBg: '#f0fdf4', passedBorder: '#bbf7d0', passedText: '#16a34a',
    failedBg: '#fef2f2', failedBorder: '#fecaca', failedText: '#5E9400',
  };
}

export function CodingLayout({ onSubmit, isLoading, onBack, initialProblem, embedded, onVoiceProblemRef }: CodingLayoutProps) {
  const { token } = useAuth();
  const t = useTheme(!!embedded);

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
  const [leftPanelWidth, setLeftPanelWidth] = useState(25);
  const [outputPanelHeight, setOutputPanelHeight] = useState(180);
  const [isResizingH, setIsResizingH] = useState(false);
  const [isResizingV, setIsResizingV] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true); // Start collapsed — expands when test cases arrive

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
    // Clear entire previous session
    setError(null);
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
    onSubmit(problemText.trim(), language);
  };

  // Register voice problem handler for parent shell
  useEffect(() => {
    if (onVoiceProblemRef) {
      onVoiceProblemRef.current = (text: string) => {
        setProblemText(text);
        setProblemTab('solution');
        setTestCases([]);
        setTestResults([]);
        setOutput('');
        setIsOutputCollapsed(true);
        clearStreamChunks();
        setParsedBlocks([]);
        setJsonSolution(null);
        setCode(getDefaultCode(language));
        onSubmit(text.trim(), language);
      };
    }
    return () => { if (onVoiceProblemRef) onVoiceProblemRef.current = null; };
  }, [onVoiceProblemRef, language, onSubmit, clearStreamChunks, setParsedBlocks]);

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
      <header className="flex items-center justify-between h-11 px-3 shrink-0" style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1e3a8a 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 px-1.5 py-1 text-xs md:text-sm font-bold text-white/70 hover:text-white rounded transition-colors">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-white font-extrabold text-xs md:text-sm" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Coding</span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Timer */}
          {timerDuration > 0 ? (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-colors ${
              timerUrgent ? 'bg-red-500/15 border-red-500/30 text-red-300' :
              timerSeconds === 0 ? 'bg-white/10 border-white/20 text-white/70' :
              'bg-emerald-600/15 border-emerald-500/30 text-emerald-300'
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
                  className="px-1.5 py-0.5 text-[10px] font-mono text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title={`${m} min timer`}>
                  {m}m
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
              <span className="text-emerald-600 text-[10px] md:text-xs font-medium">Generating...</span>
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
        <div className={`w-full md:w-auto flex flex-col md:border-r border-b md:border-b-0 coding-left-panel max-h-[40vh] md:max-h-none overflow-auto ${embedded ? 'border-[var(--border)]' : 'lumora-light-panel'}`} style={{ ['--left-w' as any]: `${leftPanelWidth}%`, background: t.surfaceBg, borderColor: t.cardBorder }}>
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b" style={{ background: t.sectionBg, borderColor: t.cardBorder }}>
            <button
              onClick={() => setProblemTab('description')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                problemTab === 'description' ? 'bg-emerald-600 text-white shadow-sm' : ''
              }`}
              style={problemTab !== 'description' ? { color: t.tabText } : undefined}
            >Description</button>
            <button
              onClick={() => setProblemTab('solution')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                problemTab === 'solution' ? 'bg-emerald-600 text-white shadow-sm' : ''
              }`}
              style={problemTab !== 'solution' ? { color: t.tabText } : undefined}
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
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${t.inputBorder}` }}>
                  {/* Collapse/Expand Header */}
                  <button
                    onClick={() => setIsInputCollapsed(!isInputCollapsed)}
                    className="w-full flex items-center justify-between px-3 py-2 transition-colors"
                    style={{ background: t.sectionBg }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isInputCollapsed ? '' : 'rotate-90'}`} style={{ color: t.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: t.text }}>Problem Input</span>
                      <span className="text-[10px] font-medium uppercase" style={{ color: t.textDim }}>{inputMode === 'paste' ? 'Paste' : inputMode === 'url' ? 'URL' : 'Image'}</span>
                    </div>
                    {problemText && isInputCollapsed && (
                      <span className="text-[10px] font-medium truncate max-w-[200px]" style={{ color: t.headerText }}>
                        {problemText.slice(0, 50)}{problemText.length > 50 ? '...' : ''}
                      </span>
                    )}
                  </button>

                  {/* Collapsible Content */}
                  {!isInputCollapsed && (
                    <div className="p-3 space-y-3 border-t" style={{ borderColor: t.cardBorder }}>
                      {/* Input Mode Toggle */}
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg w-fit" style={{ background: t.sectionBg }}>
                        {(['paste', 'url', 'image'] as const).map(mode => (
                          <button key={mode} onClick={() => setInputMode(mode)}
                            className={`px-3 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-all ${
                              inputMode === mode ? 'shadow-sm' : ''
                            }`}
                            style={inputMode === mode ? { background: t.inputBg, color: t.text } : { color: t.textMuted }}
                          >{mode === 'paste' ? 'Paste' : mode === 'url' ? 'URL' : 'Image'}</button>
                        ))}
                      </div>

                      {/* Input Areas */}
                      {inputMode === 'paste' && (
                        <textarea id="problem-text"
                          value={problemText}
                          onChange={(e) => setProblemText(e.target.value)}
                          onDrop={handleDrop}
                          onDragOver={(e) => e.preventDefault()}
                          placeholder="Paste your coding problem here...&#10;&#10;Example: Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                          className="w-full h-[180px] md:h-[220px] rounded-lg p-3 text-xs md:text-sm leading-relaxed placeholder:text-gray-400 resize-none focus:border-emerald-400 focus:ring-1 focus:ring-indigo-400/20 focus:outline-none transition-all"
                          style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }}
                        />
                      )}

                      {inputMode === 'url' && (
                        <div className="flex gap-2">
                          <input type="url" id="problem-url" name="problem-url" value={problemUrl} onChange={(e) => setProblemUrl(e.target.value)}
                            placeholder="https://leetcode.com/problems/two-sum/"
                            className="flex-1 rounded-lg px-3 py-2 text-xs md:text-sm placeholder:text-gray-400 focus:border-emerald-400 focus:ring-1 focus:ring-indigo-400/20 focus:outline-none transition-all"
                            style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                          <button onClick={handleFetchFromUrl} disabled={isProcessing || !problemUrl.trim()}
                            className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                            {isProcessing ? 'Loading...' : 'Fetch'}
                          </button>
                        </div>
                      )}

                      {inputMode === 'image' && (
                        <div className="space-y-2">
                          <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400/50 transition-all"
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
                                <p className="text-xs" style={{ color: t.textDim }}>Drop image or click to upload</p>
                              </div>
                            )}
                          </div>
                          {imageFile && (
                            <button onClick={handleExtractFromImage} disabled={isProcessing}
                              className="w-full py-2 text-xs font-medium rounded-lg border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 transition-all"
                              style={{ background: t.sectionBg, color: t.text }}>
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
                  className="w-full py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #76B900, #76B900)', borderRadius: '10px' }}>
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
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(118,185,0,0.06)', border: '1px solid #D4F0A0' }}>
                      <div className="relative w-4 h-4 shrink-0">
                        <div className="absolute inset-0 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">Generating solution...</span>
                    </div>
                    {/* Live streaming preview */}
                    {streamingSolution && (
                      <div className="rounded-xl p-4 overflow-auto max-h-[60vh] text-xs leading-relaxed font-mono whitespace-pre-wrap" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}>
                        {streamingSolution}
                        <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5" />
                      </div>
                    )}
                  </div>
                )}

                {/* JSON Solution — Modern Cards */}
                {sd && (
                  <div className="space-y-3 solution-cards-appear">

                    {/* ── SOLUTION TABS (when multiple solutions) ── */}
                    {sd.solutions?.length > 1 && (
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: t.sectionBg }}>
                        {sd.solutions.map((sol: any, i: number) => {
                          const solColors = ['indigo', 'blue', 'violet', 'amber', 'cyan'];
                          const c = solColors[i % solColors.length];
                          return (
                            <button key={i}
                              onClick={() => {
                                setActiveSolutionIdx(i);
                                const solCode = sol.code || sol.implementation || sol.solution
                                  || (sol.explanations?.length > 0 ? sol.explanations.map((ex: any) => ex.code).filter(Boolean).join('\n') : null);
                                if (solCode) setCode(solCode);
                              }}
                              className={`flex-1 px-2 py-1.5 text-[10px] md:text-xs font-semibold rounded-md transition-all text-center ${
                                activeSolutionIdx === i ? 'shadow-sm' : ''
                              }`}
                              style={activeSolutionIdx === i ? { background: t.inputBg, color: t.text } : { color: t.textMuted }}
                            >
                              <div className="truncate">{sol.name || `Solution ${i + 1}`}</div>
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
                          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: t.headerBg, borderBottom: `1px solid ${t.cardBorder}` }}>
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: t.badgeBg, color: t.badgeText }}>{activeSolutionIdx + 1}</div>
                            <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: t.headerText }}>{activeSol.name}</h4>
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
          className="hidden md:flex w-1.5 bg-[var(--bg-elevated)] hover:bg-indigo-200 cursor-col-resize transition-colors items-center justify-center group shrink-0">
          <div className="w-0.5 h-8 bg-[var(--border)] group-hover:bg-emerald-600 rounded-full transition-colors" />
        </div>

        {/* ── RIGHT PANEL: Code Editor + Output ── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: t.surfaceBg, color: t.text }}>
          {/* Editor Header */}
          <div className="flex items-center justify-between px-3 py-1.5" style={{ background: t.sectionBg, borderBottom: `1px solid ${t.cardBorder}` }}>
            <div className="flex items-center gap-2">
              <select id="language-select" name="language" value={language} onChange={(e) => handleLanguageChange(e.target.value)}
                className="rounded-md px-2 py-1 text-xs font-mono focus:outline-none cursor-pointer" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText }}>
                {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <button onClick={handleRun} disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1 text-white text-xs font-bold rounded-md disabled:opacity-50 transition-colors shadow-sm" style={{ background: '#76B900' }}
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
              <button onClick={handleCopyCode} className="p-1.5 rounded-md transition-colors" style={copyFeedback ? { color: '#76B900', background: t.badgeBg } : { color: t.textDim }} title="Copy code">
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
              className="h-1.5 hover:bg-indigo-200 cursor-row-resize transition-colors flex justify-center items-center group"
              style={{ background: t.sectionBg }}>
              <div className="w-8 h-0.5 group-hover:bg-emerald-600 rounded-full transition-colors" style={{ background: t.textDim }} />
            </div>
          )}

          {/* ═══ BOTTOM PANEL: Test Cases / Output ═══ */}
          <div className="border-t flex flex-col shrink-0" style={{ borderColor: t.cardBorder, background: t.surfaceBg, height: isOutputCollapsed ? 36 : outputPanelHeight }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1 border-b shrink-0" style={{ background: t.sectionBg, borderColor: t.cardBorder }}>
              <div className="flex items-center gap-1">
                <button onClick={() => { setOutputTab('testcases'); setIsOutputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-colors ${
                    outputTab === 'testcases' && !isOutputCollapsed ? 'bg-emerald-600 text-white' : ''
                  }`}
                  style={!(outputTab === 'testcases' && !isOutputCollapsed) ? { color: t.tabText } : undefined}>Test Cases</button>
                <button onClick={() => { setOutputTab('output'); setIsOutputCollapsed(false); }}
                  className={`px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    outputTab === 'output' && !isOutputCollapsed ? 'bg-emerald-600 text-white' : ''
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
                            <button onClick={() => removeTestCase(i)} className="text-[10px] hover:text-red-500 transition-colors" style={{ color: t.textDim }}>Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-medium mb-0.5 uppercase" style={{ color: t.textDim }}>Input</label>
                            <textarea value={tc.input} onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                              placeholder="nums = [2,7], target = 9"
                              className="w-full h-10 rounded-md p-1.5 text-xs placeholder:text-gray-300 resize-none focus:border-emerald-400 focus:outline-none font-mono"
                              style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                          </div>
                          <div>
                            <label className="block text-[9px] font-medium mb-0.5 uppercase" style={{ color: t.textDim }}>Expected</label>
                            <textarea value={tc.expected} onChange={(e) => updateTestCase(i, 'expected', e.target.value)}
                              placeholder="[0, 1]"
                              className="w-full h-10 rounded-md p-1.5 text-xs placeholder:text-gray-300 resize-none focus:border-emerald-400 focus:outline-none font-mono"
                              style={{ background: t.inputBg, borderWidth: 1, borderStyle: 'solid', borderColor: t.inputBorder, color: t.inputText }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {testCases.length < MAX_TEST_CASES && (
                      <button onClick={addTestCase}
                        className="w-full py-1.5 border border-dashed text-[10px] font-semibold rounded-lg hover:border-indigo-300 hover:text-indigo-500 transition-colors"
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
                          <div key={i} className="rounded-lg border p-2 text-xs transition-all"
                            style={r.passed
                              ? { borderColor: t.passedBorder, background: t.passedBg }
                              : { borderColor: t.failedBorder, background: t.failedBg }
                            }>
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
                              <span className="font-bold" style={{ color: r.passed ? t.passedText : t.failedText }}>Test {i + 1}</span>
                            </div>
                            <div className="space-y-0.5 font-mono text-[10px]">
                              <div><span style={{ color: t.textDim }}>In:</span> <span style={{ color: t.text }}>{r.input}</span></div>
                              <div><span style={{ color: t.textDim }}>Exp:</span> <span style={{ color: t.text }}>{r.expected}</span></div>
                              <div><span style={{ color: t.textDim }}>Out:</span> <span style={{ color: r.passed ? t.passedText : t.failedText }}>{r.output}</span></div>
                              {r.error && <div className="text-red-500 mt-1">{r.error}</div>}
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
function EditorContainer({ children, embedded }: { children: (height: number) => React.ReactNode; embedded: boolean }) {
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
                            className="w-full text-left px-2 py-1 bg-amber-50 border border-amber-100 rounded-md hover:border-indigo-300 text-[10px] text-gray-600 font-mono hover:text-emerald-600 transition-colors">
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
