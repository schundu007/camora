import CloudArchitectureDiagram from '../../components/capra/docs/CloudArchitectureDiagram.jsx';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

// Core components (always needed)
import ProblemInput from '../../components/capra/features/ProblemInput';
import CodeDisplay from '../../components/capra/features/CodeDisplay';
import ExplanationPanel from '../../components/capra/features/ExplanationPanel';
import AscendModeSelector from '../../components/capra/features/AscendModeSelector';
import { useAppShell } from '../../components/capra/layout/AppShellContext';
import MobileBottomNav from '../../components/capra/layout/MobileBottomNav';
import MobileTabView from '../../components/capra/layout/MobileTabView';
import ErrorBoundary from '../../components/shared/ErrorBoundaryCapra';

// Lazy-loaded components (modals, panels rendered on demand)
const OnboardingModal = lazy(() => import('../../components/capra/onboarding/OnboardingModal'));
const AdminPanel = lazy(() => import('../../components/capra/AdminPanel'));
const SettingsPanel = lazy(() => import('../../components/capra/settings/SettingsPanel'));
const SetupWizard = lazy(() => import('../../components/capra/settings/SetupWizard'));
const AscendAssistantPanel = lazy(() => import('../../components/capra/features/AscendAssistantPanel'));
const SystemDesignPanel = lazy(() => import('../../components/capra/features/SystemDesignPanel'));
const PrepTab = lazy(() => import('../../components/capra/features/PrepTab'));
const AscendPrepModal = lazy(() => import('../../components/capra/features/AscendPrepModal'));
const SavedSystemDesignsModal = lazy(() => import('../../components/capra/features/SavedSystemDesignsModal'));

// Hooks
import { useIsMobile } from '../../hooks/capra/useIsMobile';
import useKeyboardShortcuts from '../../hooks/capra/useKeyboardShortcuts';
import { useSystemDesignStorage } from '../../hooks/capra/useSystemDesignStorage';
import { useCodingHistory } from '../../hooks/capra/useCodingHistory';
import { useSolve, useAutoTestFix } from '../../hooks/capra/useSolve';

// Context & Utils
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/authHeaders.js';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

// Storage keys
const STORAGE_KEYS = {
  ssoToken: 'cariara_sso', // SSO cookie name (read via document.cookie, not localStorage)
  codingHistory: 'chundu_coding_history',
  systemDesignSessions: 'chundu_system_design_sessions',
  autoSwitch: 'chundu_auto_switch',
  sidebarCollapsed: 'chundu_sidebar_collapsed',
  editorSettings: 'chundu_editor_settings',
};

// ============================================================================
// Helper Hooks
// ============================================================================

function useLocalState(initialValue) {
  const [state, setState] = useState(initialValue);
  return [state, setState];
}

function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {}
    return initialValue;
  });

  const setStateAndStorage = useCallback((value) => {
    setState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch {}
      return newValue;
    });
  }, [key]);

  return [state, setStateAndStorage];
}

// ============================================================================
// Helpers
// ============================================================================

function getToken() {
  // Read from SSO cookie (same source as AuthContext)
  const match = document.cookie.match(/(^| )cariara_sso=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

function buildEraserDescription(sd) {
  const techStack = sd.techJustifications?.map(t => `${t.tech}: ${t.why}`).join('\n') || '';
  const scalability = sd.scalability?.join(', ') || '';
  const funcReqs = sd.requirements?.functional?.join(', ') || '';
  const nonFuncReqs = sd.requirements?.nonFunctional?.join(', ') || '';

  return `DETAILED CLOUD ARCHITECTURE DIAGRAM:

SYSTEM: ${sd.overview || ''}

COMPONENTS: ${sd.architecture?.components?.join(', ') || ''}

ARCHITECTURE: ${sd.architecture?.description || ''}

TECHNOLOGY STACK:
${techStack}

SCALABILITY: ${scalability}

FUNCTIONAL REQUIREMENTS: ${funcReqs}
NON-FUNCTIONAL REQUIREMENTS: ${nonFuncReqs}

INCLUDE: VPC, DNS, Load Balancers, CDN, API Gateway, Application servers, Caches, Database with replicas, Message queues, Worker services, Object storage, Monitoring stack.

SECURITY: IAM, KMS, Secrets Manager, WAF, Security Groups, VPC endpoints.

MONITORING: CloudWatch, X-Ray, Centralized logging, Alerting.`;
}

// ============================================================================
// Main App Component
// ============================================================================
export default function DashboardPage() {
  // ---------------------------------------------------------------------------
  // Responsive
  // ---------------------------------------------------------------------------
  const { isMobile } = useIsMobile();

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  const auth = useAuth();
  const isAuthenticated = true;
  const user = auth.user;
  // OAuth disabled — allow all users to access without auth
  const authRequired = false;
  const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin');

  // ---------------------------------------------------------------------------
  // URL-based mode detection (reactive to React Router navigation)
  // ---------------------------------------------------------------------------
  const routerLocation = useLocation();
  const currentPath = routerLocation.pathname;
  const appModeFromPath = currentPath === '/capra/design' ? 'system-design'
    : currentPath === '/capra/prep' ? 'behavioral'
    : 'coding';

  // ---------------------------------------------------------------------------
  // Provider State
  // ---------------------------------------------------------------------------
  const [provider, setProvider] = useLocalStorage('ascend_provider', 'claude');
  const [model, setModel] = useLocalStorage('ascend_model', 'claude-sonnet-4-20250514');
  const [autoSwitch, setAutoSwitch] = useLocalStorage('ascend_auto_switch', false);

  // ---------------------------------------------------------------------------
  // Mode State — URL is source of truth, no localStorage persistence
  // ---------------------------------------------------------------------------
  const [ascendMode, setAscendMode] = useState(appModeFromPath || 'coding');
  const [designDetailLevel, setDesignDetailLevel] = useLocalState('basic');
  const [codingDetailLevel, setCodingDetailLevel] = useLocalState('basic');
  const [codingLanguage, setCodingLanguage] = useLocalState('auto');
  const [autoGenerateEraser, setAutoGenerateEraser] = useLocalState(false);

  // ---------------------------------------------------------------------------
  // Problem State
  // ---------------------------------------------------------------------------
  const [extractedText, setExtractedText] = useLocalState('');
  const [currentProblem, setCurrentProblem] = useLocalState('');
  const [loadedProblem, setLoadedProblem] = useLocalState('');
  const [currentLanguage, setCurrentLanguage] = useLocalState('auto');
  const [problemExpanded, setProblemExpanded] = useLocalState(true);
  const [clearScreenshot, setClearScreenshot] = useLocalState(0);

  // ---------------------------------------------------------------------------
  // Solution State
  // ---------------------------------------------------------------------------
  const [solution, setSolution] = useLocalState(null);
  const [autoRunOutput, setAutoRunOutput] = useLocalState(null);
  const [eraserDiagram, setEraserDiagram] = useLocalState(null);
  const [highlightedLine, setHighlightedLine] = useLocalState(null);

  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------
  const [authChecked, setAuthChecked] = useLocalState(false);
  const [error, setError] = useLocalState(null);
  const [errorType, setErrorType] = useLocalState('default');
  const [switchNotification, setSwitchNotification] = useLocalState(null);
  const [copyToast, setCopyToast] = useLocalState(false);
  const [isProcessingFollowUp, setIsProcessingFollowUp] = useLocalState(false);
  const [platformStatus, setPlatformStatus] = useLocalState({});

  // ---------------------------------------------------------------------------
  // Modal State
  // ---------------------------------------------------------------------------
  const [showSettings, setShowSettings] = useLocalState(false);
  const [showSetupWizard, setShowSetupWizard] = useLocalState(false);
  const [showAscendAssistant, setShowAscendAssistant] = useLocalState(false);
  const [showPrepTab, setShowPrepTab] = useLocalState(false);
  const [showSavedDesigns, setShowSavedDesigns] = useLocalState(false);
  const [showAdminPanel, setShowAdminPanel] = useLocalState(false);
  const [showPricingPlans, setShowPricingPlans] = useLocalState(false);
  const [showOnboarding, setShowOnboarding] = useLocalState(false);

  // ---------------------------------------------------------------------------
  // Sidebar State
  // ---------------------------------------------------------------------------
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    STORAGE_KEYS.sidebarCollapsed,
    true
  );

  // ---------------------------------------------------------------------------
  // Editor Settings
  // ---------------------------------------------------------------------------
  const [editorSettings, setEditorSettings] = useLocalStorage(STORAGE_KEYS.editorSettings, {
    theme: 'dark',
    keyBindings: 'standard',
    fontSize: 12,
    tabSpacing: 4,
    intelliSense: true,
    autoCloseBrackets: true,
  });

  const updateEditorSettings = useCallback((updates) => {
    setEditorSettings(prev => ({ ...prev, ...updates }));
  }, [setEditorSettings]);

  // ---------------------------------------------------------------------------
  // Storage Hooks
  // ---------------------------------------------------------------------------
  const systemDesignStorage = useSystemDesignStorage();
  const codingHistory = useCodingHistory();

  // ---------------------------------------------------------------------------
  // Solve Hook
  // ---------------------------------------------------------------------------
  const {
    isLoading,
    loadingType,
    streamingContent,
    solve,
    reset: resetSolve,
    abort: abortSolve,
    setIsLoading,
    setLoadingType,
  } = useSolve({ provider, model, autoSwitch, ascendMode, designDetailLevel });

  const { autoTestAndFix } = useAutoTestFix({ provider, model });

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const codeDisplayRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Apply theme to document
  // ---------------------------------------------------------------------------
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', editorSettings.theme || 'dark');
  }, [editorSettings.theme]);

  // ---------------------------------------------------------------------------
  // Auth check on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!auth.loading) {
      setAuthChecked(true);
    }
  }, [auth.loading]);

  // ---------------------------------------------------------------------------
  // Handle incoming problem from docs page
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const problemParam = urlParams.get('problem');
    const fetchUrlParam = urlParams.get('fetchUrl');
    const autosolve = urlParams.get('autosolve') === 'true';
    const modeParam = urlParams.get('mode');

    if (problemParam) {
      const decodedProblem = decodeURIComponent(problemParam);
      if (modeParam === 'system-design') {
        setAscendMode('system-design');
      } else {
        setAscendMode('coding');
      }
      setExtractedText(decodedProblem);
      window.history.replaceState({}, '', window.location.pathname);
      if (autosolve) {
        setTimeout(() => {
          handleSolve(decodedProblem, 'auto', 'detailed');
        }, 300);
      }
    }

    if (fetchUrlParam) {
      const decodedUrl = decodeURIComponent(fetchUrlParam);
      window.history.replaceState({}, '', window.location.pathname);
      setAscendMode('coding');
      (async () => {
        setLoadingType('fetch');
        try {
          const response = await fetch(API_URL + '/api/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ url: decodedUrl }),
          });
          if (!response.ok) throw new Error('Failed to fetch problem from LeetCode');
          const data = await response.json();
          setCurrentProblem(data.problemText);
          setExtractedText(data.problemText);
          setProblemExpanded(true);
          setLoadingType(null);
        } catch (err) {
          setError(err.message);
          setErrorType('fetch');
          setLoadingType(null);
        }
      })();
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Extension SSE Listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;

    function connect() {
      eventSource = new EventSource(`${API_URL}/api/extension/events`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'problem' && data.url) {
            setError(null);
            setSwitchNotification({ from: 'Extension', to: data.platform, reason: 'Problem detected' });
            setTimeout(() => setSwitchNotification(null), 3000);
            setAscendMode(data.problemType === 'system_design' ? 'system-design' : 'coding');
            if (data.problemText && data.problemText.length > 50) {
              setExtractedText(data.problemText);
              handleSolve(data.problemText, 'auto', 'detailed');
            } else {
              setExtractedText('');
              handleFetchUrl(data.url, 'auto', 'detailed');
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        reconnectAttempts++;
        eventSource?.close();
        if (reconnectAttempts < 5) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
      eventSource.onopen = () => { reconnectAttempts = 0; };
    }
    connect();
    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [isAuthenticated]);

  // ---------------------------------------------------------------------------
  // Reset Functions
  // ---------------------------------------------------------------------------
  const resetState = useCallback(() => {
    setSolution(null);
    setError(null);
    setErrorType('default');
    setAutoRunOutput(null);
  }, []);

  const handleClearAll = useCallback(() => {
    abortSolve();
    resetSolve();
    setSolution(null);
    setError(null);
    setErrorType('default');
    setExtractedText('');
    setLoadedProblem('');
    setAutoRunOutput(null);
    setProblemExpanded(true);
    setClearScreenshot(c => c + 1);
    setEraserDiagram(null);
  }, [abortSolve, resetSolve]);

  // ---------------------------------------------------------------------------
  // Mode Change Handler
  // ---------------------------------------------------------------------------
  const handleModeChange = useCallback((newMode) => {
    if (newMode !== ascendMode) {
      abortSolve();
      handleClearAll();
      setAscendMode(newMode);
      const modePath = newMode === 'system-design' ? '/capra/design' : newMode === 'behavioral' ? '/capra/prep' : '/capra/coding';
      window.history.replaceState({}, '', modePath);
    }
  }, [ascendMode, abortSolve, handleClearAll]);

  // Sync mode from URL path (reactive to sidebar navigation)
  useEffect(() => {
    if (appModeFromPath && appModeFromPath !== ascendMode) {
      setAscendMode(appModeFromPath);
    }
  }, [appModeFromPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Main Solve Handler
  // ---------------------------------------------------------------------------
  const handleSolve = useCallback(async (problem, language, detailLevel = 'detailed') => {
    if (!problem || !problem.trim()) {
      setError('Please enter a problem before solving.');
      return;
    }

    resetState();
    setProblemExpanded(false);
    setCurrentProblem(problem);
    setCurrentLanguage(language);
    setEraserDiagram(null);

    try {
      const result = await solve(problem, language, detailLevel);

      if (result) {
        if (ascendMode !== 'system-design' && result.code) {
          const { code: fixedCode, fixed, attempts, output } = await autoTestAndFix(
            result.code, result.language, result.examples, problem, setLoadingType
          );
          setAutoRunOutput(output);
          // Sync fixed code into approaches[0] so tab switching shows the fixed version
          const updatedApproaches = result.approaches ? [...result.approaches] : [];
          if (updatedApproaches.length > 0) {
            updatedApproaches[0] = { ...updatedApproaches[0], code: fixedCode };
          }
          setSolution({ ...result, code: fixedCode, approaches: updatedApproaches, autoFixed: fixed, fixAttempts: attempts });
          if (ascendMode === 'coding' && fixedCode) {
            codingHistory.addEntry({
              problem, language: result.language || language, code: fixedCode,
              complexity: result.complexity, source: 'text', pitch: result.pitch,
              explanations: result.explanations,
            });
          }
        } else {
          setSolution(result);
          if (ascendMode === 'system-design' && result?.systemDesign?.included) {
            systemDesignStorage.saveSession({
              problem, source: 'text', systemDesign: result.systemDesign, detailLevel: designDetailLevel,
            });
            if (autoGenerateEraser) {
              generateEraserDiagram(result.systemDesign);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err.needCredits || err.freeTrialExhausted || err.subscriptionRequired) {
        window.location.href = '/pricing';
        return;
      } else {
        setError(err.message);
        setErrorType('solve');
      }
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  }, [solve, ascendMode, designDetailLevel, autoGenerateEraser, autoTestAndFix, codingHistory, systemDesignStorage]);

  // ---------------------------------------------------------------------------
  // URL Fetch Handler
  // ---------------------------------------------------------------------------
  const handleFetchUrl = useCallback(async (url, language, detailLevel = 'detailed') => {
    resetState();
    setLoadingType('fetch');
    try {
      const fetchResponse = await fetch(API_URL + '/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url }),
      });
      if (!fetchResponse.ok) throw new Error('Failed to fetch problem');
      const fetchData = await fetchResponse.json();
      setCurrentProblem(fetchData.problemText);
      setExtractedText(fetchData.problemText);
      setProblemExpanded(true);
      await handleSolve(fetchData.problemText, language, detailLevel);
    } catch (err) {
      setError(err.message);
      setErrorType('fetch');
      setIsLoading(false);
      setLoadingType(null);
    }
  }, [handleSolve]);

  // ---------------------------------------------------------------------------
  // Screenshot Handler
  // ---------------------------------------------------------------------------
  const handleScreenshot = useCallback(async (file, language = 'auto', detailLevel = 'basic') => {
    resetState();
    setLoadingType('screenshot');
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('provider', provider);
      formData.append('mode', 'extract');
      formData.append('model', model);
      const response = await fetch(API_URL + '/api/analyze', {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to extract text');
      const data = await response.json();
      const extractedProblem = data.text || '';
      setExtractedText(extractedProblem);
      setProblemExpanded(true);
      if (extractedProblem.trim()) {
        await handleSolve(extractedProblem, language, detailLevel);
      }
    } catch (err) {
      setError(err.message);
      setErrorType('screenshot');
      setIsLoading(false);
      setLoadingType(null);
    }
  }, [provider, model, handleSolve]);

  // ---------------------------------------------------------------------------
  // Follow-up Question Handler
  // ---------------------------------------------------------------------------
  const handleFollowUpQuestion = useCallback(async (question) => {
    const currentCode = solution?.code || streamingContent.code;
    const currentPitch = solution?.pitch || streamingContent.pitch;
    const currentDesign = solution?.systemDesign || streamingContent.systemDesign;
    if (!currentCode && !currentPitch && !currentDesign?.included) {
      return { answer: 'Please solve a problem first.' };
    }
    setIsProcessingFollowUp(true);
    try {
      const response = await fetch(API_URL + '/api/solve/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          question, problem: currentProblem, code: currentCode, pitch: currentPitch,
          currentDesign: currentDesign?.included ? currentDesign : null, provider, model,
        }),
      });
      if (!response.ok) throw new Error('Failed to process follow-up');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done && data.result) result = data.result;
              if (data.error) throw new Error(data.error);
            } catch {}
          }
        }
      }
      if (result?.updatedDesign) {
        setSolution(prev => ({ ...prev, systemDesign: result.updatedDesign }));
      }
      return result;
    } catch (err) {
      return null;
    } finally {
      setIsProcessingFollowUp(false);
    }
  }, [solution, streamingContent, currentProblem, provider, model]);

  // ---------------------------------------------------------------------------
  // Eraser Diagram Generation
  // ---------------------------------------------------------------------------
  const generateEraserDiagram = useCallback(async (sd) => {
    if (!sd?.included) return;
    const description = buildEraserDescription(sd);
    try {
      const response = await fetch(API_URL + '/api/diagram/eraser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ description }),
      });
      if (response.ok) {
        const data = await response.json();
        setEraserDiagram(data);
        if (systemDesignStorage.currentSessionId) {
          systemDesignStorage.updateEraserDiagram(systemDesignStorage.currentSessionId, data);
        }
      }
    } catch (err) {
      // Eraser diagram generation failed silently
    }
  }, [systemDesignStorage]);

  // ---------------------------------------------------------------------------
  // Load Saved Session Handlers
  // ---------------------------------------------------------------------------
  const handleLoadSavedSession = useCallback((sessionId) => {
    const session = systemDesignStorage.loadSession(sessionId);
    if (!session) return;
    if (ascendMode !== 'system-design') setAscendMode('system-design');
    setDesignDetailLevel(session.detailLevel || 'full');
    setCurrentProblem(session.problem || '');
    setExtractedText(session.problem || '');
    setProblemExpanded(true);
    setSolution({
      systemDesign: session.systemDesign, code: null, language: null,
      pitch: null, explanations: null, complexity: null,
    });
    if (session.eraserDiagram) setEraserDiagram(session.eraserDiagram);
    setError(null);
  }, [ascendMode, systemDesignStorage]);

  const handleLoadHistoryEntry = useCallback((entryId) => {
    const entry = codingHistory.getEntry(entryId);
    if (!entry) return;
    if (ascendMode !== 'coding') setAscendMode('coding');
    setCurrentProblem(entry.problem || '');
    setLoadedProblem(entry.problem || '');
    setProblemExpanded(true);
    setCurrentLanguage(entry.language || 'auto');
    setSolution({
      code: entry.code, language: entry.language, complexity: entry.complexity,
      pitch: entry.pitch || null, explanations: entry.explanations || null, systemDesign: null,
    });
    setError(null);
  }, [ascendMode, codingHistory]);

  // ---------------------------------------------------------------------------
  // Keyboard Shortcuts
  // ---------------------------------------------------------------------------
  const handleKeyboardSolve = useCallback(() => {
    if (currentProblem || extractedText) {
      handleSolve(currentProblem || extractedText, currentLanguage, 'detailed');
    }
  }, [currentProblem, extractedText, currentLanguage, handleSolve]);

  const handleKeyboardRun = useCallback(() => {
    codeDisplayRef.current?.runCode?.();
  }, []);

  const handleKeyboardCopy = useCallback(async () => {
    const code = solution?.code || streamingContent.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
    } catch {}
  }, [solution, streamingContent]);

  const isModalOpen = showSettings || showSetupWizard ||
                      showPrepTab || showAdminPanel || showSavedDesigns;

  useKeyboardShortcuts({
    onSolve: handleKeyboardSolve,
    onRun: handleKeyboardRun,
    onClear: handleClearAll,
    onCopyCode: handleKeyboardCopy,
    onToggleProblem: () => setProblemExpanded(prev => !prev),
    onToggleAscend: () => setShowAscendAssistant(prev => !prev),
    isLoading,
    hasProblem: !!(currentProblem || extractedText),
    hasCode: !!(solution?.code || streamingContent.code),
    disabled: isModalOpen,
  });

  // ---------------------------------------------------------------------------
  // Utility Handlers
  // ---------------------------------------------------------------------------
  const { toggleSidebar: toggleAppShellSidebar } = useAppShell();

  const toggleSidebar = useCallback(() => {
    toggleAppShellSidebar();
  }, [toggleAppShellSidebar]);

  // Listen for settings open event from ShellSidebar
  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('ascend:open-settings', handler);
    return () => window.removeEventListener('ascend:open-settings', handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Render: Loading State
  // ---------------------------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-white landing-root">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main App Render
  // ---------------------------------------------------------------------------
  return (
    <div className={`h-screen flex overflow-hidden landing-root text-gray-900`} style={{ background: '#f7f8f9', ...(isMobile ? { paddingBottom: 'calc(52px + env(safe-area-inset-bottom, 0px))' } : {}) }}>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          ascendMode={ascendMode}
          onModeChange={handleModeChange}
          showSidebar={false}
          onToggleSidebar={toggleSidebar}
          isLoading={isLoading}
          isMobile={isMobile}
          onSettingsClick={() => setShowSettings(true)}
          onPricingClick={() => setShowPricingPlans(true)}
          onAssistantClick={() => setShowAscendAssistant(!showAscendAssistant)}
          showAscendAssistant={showAscendAssistant}
        />

        {/* Error Banner */}
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

        {/* Switch Notification */}
        {switchNotification && (
          <SwitchNotificationBanner notification={switchNotification} onDismiss={() => setSwitchNotification(null)} />
        )}

        {/* Loading Progress */}
        {isLoading && <LoadingProgress />}

        {/* Main Layout */}
        <ErrorBoundary>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>}>
          <main className="flex-1 overflow-hidden relative z-10">
            {ascendMode === 'behavioral' ? (
              <div className="h-full" style={{ background: '#f7f8f9' }}>
                <AscendPrepModal isOpen={true} onClose={() => {}} provider={provider} model={model} embedded={true} />
              </div>
            ) : (
              <CodingLayout
                extractedText={extractedText}
                onExtractedTextClear={() => setExtractedText('')}
                clearScreenshot={clearScreenshot}
                problemExpanded={problemExpanded}
                onToggleExpand={() => setProblemExpanded(prev => !prev)}
                loadedProblem={loadedProblem}
                ascendMode={ascendMode}
                designDetailLevel={designDetailLevel}
                onDetailLevelChange={setDesignDetailLevel}
                codingDetailLevel={codingDetailLevel}
                onCodingDetailLevelChange={setCodingDetailLevel}
                codingLanguage={codingLanguage}
                onLanguageChange={setCodingLanguage}
                autoGenerateEraser={autoGenerateEraser}
                onAutoGenerateEraserChange={setAutoGenerateEraser}
                solution={solution}
                streamingContent={streamingContent}
                highlightedLine={highlightedLine}
                onLineHover={setHighlightedLine}
                autoRunOutput={autoRunOutput}
                eraserDiagram={eraserDiagram}
                isLoading={isLoading}
                loadingType={loadingType}
                hasSolution={!!solution}
                savedDesignsCount={systemDesignStorage.getAllSessions().length}
                onSavedDesignsClick={() => setShowSavedDesigns(true)}
                currentProblem={currentProblem}
                onSolve={handleSolve}
                onFetchUrl={handleFetchUrl}
                onScreenshot={handleScreenshot}
                onClear={handleClearAll}
                onFollowUpQuestion={handleFollowUpQuestion}
                isProcessingFollowUp={isProcessingFollowUp}
                onExpandSystemDesign={() => handleSolve(currentProblem + '\n\nProvide a DETAILED system design.', currentLanguage, 'detailed')}
                onGenerateEraserDiagram={() => generateEraserDiagram(solution?.systemDesign || streamingContent.systemDesign)}
                onExplanationsUpdate={(explanations) => setSolution(prev => prev ? { ...prev, explanations } : null)}
                codeDisplayRef={codeDisplayRef}
                editorSettings={editorSettings}
                showAscendAssistant={showAscendAssistant}
                onCloseAscendAssistant={() => setShowAscendAssistant(false)}
                provider={provider}
                model={model}
                isMobile={isMobile}
              />
            )}
          </main>
          </Suspense>
        </ErrorBoundary>

        {/* Footer — hidden on mobile (bottom nav replaces it) */}
        {!isMobile && <Footer isLoading={isLoading} ascendMode={ascendMode} />}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav
          ascendMode={ascendMode}
          onModeChange={handleModeChange}
          showAscendAssistant={showAscendAssistant}
          onAssistantClick={() => setShowAscendAssistant(!showAscendAssistant)}
          onSettingsClick={() => setShowSettings(true)}
        />
      )}

      {/* Modals (lazy-loaded) */}
      <Suspense fallback={null}>
        {showAdminPanel && <AdminPanel token={getToken()} onClose={() => setShowAdminPanel(false)} />}
        {showOnboarding && <OnboardingModal isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} onOpenPricing={() => setShowPricingPlans(true)} />}
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
            onOpenPlatforms={() => setShowPrepTab(true)}
            autoSwitch={autoSwitch}
            onAutoSwitchChange={setAutoSwitch}
            editorSettings={editorSettings}
            onEditorSettingsChange={updateEditorSettings}
          />
        )}
        {showSetupWizard && <SetupWizard onComplete={() => setShowSetupWizard(false)} />}
        {showPrepTab && <PrepTab isOpen={showPrepTab} onClose={() => setShowPrepTab(false)} />}

        {showSavedDesigns && (
          <SavedSystemDesignsModal
            isOpen={showSavedDesigns}
            onClose={() => setShowSavedDesigns(false)}
            sessions={systemDesignStorage.getAllSessions()}
            onLoadSession={handleLoadSavedSession}
            onDeleteSession={systemDesignStorage.deleteSession}
            onClearAll={systemDesignStorage.clearAllSessions}
          />
        )}
      </Suspense>

      {/* Copy Toast */}
      {copyToast && <CopyToast />}
    </div>
  );
}

// ============================================================================
// Sub-Components (kept co-located for now)
// ============================================================================

function Header({ ascendMode, onModeChange, showSidebar, onToggleSidebar, isLoading, isMobile, onSettingsClick, onPricingClick, onAssistantClick, showAscendAssistant }) {
  // ---- Mobile Header ----
  if (isMobile) {
    return (
      <header className="flex items-center justify-between gap-3 px-3 border-b border-[#e3e8ee] safe-top" style={{ height: '52px', background: '#ffffff' }}>
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-600 active:bg-gray-100 transition-colors" aria-label="Open menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">Capra</span>
            {isLoading && <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Credits placeholder */}
        </div>
      </header>
    );
  }

  // ---- Desktop Header — with APPA nav tabs ----
  const modeConfig = {
    coding: { label: 'Coding', color: '#10b981' },
    'system-design': { label: 'System Design', color: '#3b82f6' },
    behavioral: { label: 'Interview Prep', color: '#f59e0b' },
  };
  const currentMode = modeConfig[ascendMode] || modeConfig.coding;

  const APPA_TABS = [
    { label: 'Apply', href: '/jobs' },
    { label: 'Prepare', href: '/capra/prepare' },
    { label: 'Practice', href: '/capra/practice' },
    { label: 'Attend', href: '/lumora' },
    { label: 'Pricing', href: '/pricing' },
  ];

  // Determine which APPA tab is active based on mode
  const activeAppaTab = ascendMode === 'behavioral' ? 'Prepare' : 'Practice';

  return (
    <header
      className="flex items-center justify-between gap-4 px-5 relative"
      style={{
        height: '52px',
        background: '#ffffff',
        borderBottom: '1px solid #e3e8ee',
      }}
    >
      {/* Left: Camora logo + brand */}
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 flex items-center justify-center rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900 hidden sm:inline">Camora</span>
        </a>
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: currentMode.color }} />
          <span className="text-sm font-semibold text-gray-700">{currentMode.label}</span>
        </div>
      </div>

      {/* Center: APPA tabs */}
      <div className="hidden md:flex items-center gap-1">
        {APPA_TABS.map((tab) => (
          <a
            key={tab.label}
            href={tab.href}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              tab.label === activeAppaTab
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={onAssistantClick} aria-label="Toggle interview assistant" className={`flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[36px] min-h-[36px] justify-center ${showAscendAssistant ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="hidden sm:inline">Assistant</span>
        </button>
        <a href="/capra/prepare" className="hidden sm:inline text-sm text-gray-400 hover:text-gray-700 font-medium px-2">Dashboard</a>
      </div>
    </header>
  );
}

function ErrorBanner({ error, onDismiss }) {
  return (
    <div className="mx-5 mt-3 p-4 rounded-lg animate-fade-in-down bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <span className="text-sm font-medium text-error-700 dark:text-error-300 flex-1">{error}</span>
        <button onClick={onDismiss} aria-label="Dismiss error" className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-error-100 dark:hover:bg-error-900/30 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

function SwitchNotificationBanner({ notification, onDismiss }) {
  return (
    <div className="mx-5 mt-3 p-4 rounded-lg animate-fade-in-down bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <span className="text-sm font-medium text-warning-700 dark:text-warning-300 flex-1">
          Switched from <strong className="font-semibold">{notification.from}</strong> to <strong className="font-semibold">{notification.to}</strong>
          {notification.reason && <span className="text-warning-500 ml-1.5">({notification.reason})</span>}
        </span>
        <button onClick={onDismiss} aria-label="Dismiss notification" className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-900/30 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

function LoadingProgress() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="h-1 overflow-hidden bg-gray-200">
        <div className="h-full w-1/3 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-400 rounded-full" style={{ animation: 'progress-indeterminate 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

function Footer({ isLoading, ascendMode }) {
  return (
    <footer className="relative z-10 px-5 py-3 flex items-center justify-between text-xs border-t border-[#e3e8ee] bg-[#f7f8f9]">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLoading ? 'animate-pulse bg-emerald-500' : 'bg-emerald-500'}`} />
          <span className={`text-sm font-medium ${isLoading ? 'text-emerald-600' : 'text-gray-500'}`}>
            {isLoading ? 'Processing...' : 'Ready'}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-5 font-mono text-xs text-gray-400">
        {[
          { key: '^1', label: ascendMode === 'system-design' ? 'design' : 'code' },
          { key: '^2', label: 'run' },
          { key: '^3', label: 'copy' },
          { key: 'Esc', label: 'clear' },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 rounded-md text-xs font-semibold bg-white border border-[#e3e8ee] text-gray-500">{key}</kbd>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </footer>
  );
}

function CopyToast() {
  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-scale-in">
      <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-emerald-500 shadow-lg">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <span className="text-sm font-semibold text-white" aria-live="polite">Code copied to clipboard!</span>
      </div>
    </div>
  );
}

function CodingLayout({
  extractedText, onExtractedTextClear, clearScreenshot, problemExpanded, onToggleExpand, loadedProblem,
  ascendMode, designDetailLevel, onDetailLevelChange, codingDetailLevel, onCodingDetailLevelChange,
  codingLanguage, onLanguageChange, autoGenerateEraser, onAutoGenerateEraserChange,
  solution, streamingContent, highlightedLine, onLineHover, autoRunOutput, eraserDiagram,
  isLoading, loadingType, hasSolution, savedDesignsCount, onSavedDesignsClick, currentProblem,
  onSolve, onFetchUrl, onScreenshot, onClear, onFollowUpQuestion, isProcessingFollowUp,
  onExpandSystemDesign, onGenerateEraserDiagram, onExplanationsUpdate,
  codeDisplayRef, editorSettings, showAscendAssistant, onCloseAscendAssistant, provider, model,
  qaHistory, isMobile,
}) {
  const [mobileTab, setMobileTab] = useState('problem');
  const [activeApproach, setActiveApproach] = useState(0);
  const systemDesign = solution?.systemDesign || streamingContent.systemDesign;
  const hasSystemDesign = systemDesign && systemDesign.included;
  const approaches = solution?.approaches;

  // Auto-switch to code/design tab when solution arrives
  useEffect(() => {
    if (!isMobile) return;
    if (solution && !isLoading) {
      setMobileTab(ascendMode === 'system-design' ? 'design' : 'code');
    }
  }, [solution, isLoading, isMobile, ascendMode]);

  // Reset approach selection when solution changes
  useEffect(() => {
    setActiveApproach(0);
  }, [solution]);

  // ===========================================================================
  // Shared sub-panels (used by both mobile and desktop)
  // ===========================================================================
  const problemInputProps = { onSubmit: onSolve, onFetchUrl, onScreenshot, onClear, isLoading, extractedText, onExtractedTextClear, shouldClear: clearScreenshot, hasSolution, expanded: problemExpanded, onToggleExpand, ascendMode, loadedProblem, detailLevel: codingDetailLevel, language: codingLanguage };
  const modeSelectorProps = { ascendMode, designDetailLevel, onDetailLevelChange, autoGenerateEraser, onAutoGenerateEraserChange, codingLanguage, onLanguageChange, codingDetailLevel, onCodingDetailLevelChange };

  // Derive active approach data from lifted state
  const currentApproachData = approaches?.[activeApproach];
  const activeCode = currentApproachData?.code || solution?.code || streamingContent.code;
  const activePitch = currentApproachData?.pitch || solution?.pitch || streamingContent.pitch;
  const activeExplanations = currentApproachData?.explanations || solution?.explanations;
  const activeComplexity = currentApproachData?.complexity || solution?.complexity || streamingContent.complexity;

  const ProblemPane = () => (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: '#f7f8f9' }}>
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#e3e8ee] gap-2 min-h-[48px] flex-wrap" style={{ background: '#ffffff' }}>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: ascendMode === 'system-design' ? '#3b82f6' : '#10b981' }} />
            <h2 className="landing-display text-sm font-bold truncate text-gray-900">{ascendMode === 'system-design' ? 'System Design' : 'Problem'}</h2>
            {ascendMode === 'system-design' && (
              <button onClick={onSavedDesignsClick} aria-label="View saved designs" className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${savedDesignsCount > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#f7f8f9] text-gray-500 hover:text-gray-700 border border-[#e3e8ee] hover:border-[#d0d5dd]'}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                Saved ({savedDesignsCount})
              </button>
            )}
          </div>
          <AscendModeSelector {...modeSelectorProps} />
        </div>
        <div className="p-4">
          <ProblemInput {...problemInputProps} />
        </div>
      </div>
      {ascendMode !== 'system-design' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ExplanationPanel explanations={activeExplanations} highlightedLine={highlightedLine} pitch={activePitch} systemDesign={solution?.systemDesign || streamingContent.systemDesign} isStreaming={isLoading && loadingType === 'solve' && !solution} onExpandSystemDesign={onExpandSystemDesign} canExpandSystemDesign={!!currentProblem && !isLoading} onFollowUpQuestion={onFollowUpQuestion} isProcessingFollowUp={isProcessingFollowUp} />
        </div>
      )}
    </div>
  );

  const DesignPane = () => (
    <div className="h-full overflow-auto p-4" style={{ background: '#f7f8f9' }}>
      {hasSystemDesign ? (
        <SystemDesignPanel systemDesign={systemDesign} eraserDiagram={eraserDiagram} autoGenerateEraser={autoGenerateEraser} onGenerateEraserDiagram={onGenerateEraserDiagram} question={currentProblem || loadedProblem} cloudProvider="auto" qaHistory={qaHistory || []} onFollowUpQuestion={onFollowUpQuestion} isProcessingFollowUp={isProcessingFollowUp} />
      ) : isLoading && loadingType === 'solve' ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex gap-1.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="landing-body text-sm font-medium text-gray-500">Generating system design...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <span className="landing-body text-sm font-medium text-gray-400">Enter a system design question</span>
          <span className="landing-body text-xs text-gray-300 mt-1">e.g. "Design a URL shortener like bit.ly"</span>
        </div>
      )}
    </div>
  );

  const CodePane = () => (
    <div className="h-full" style={{ background: '#f7f8f9' }}>
      <CodeDisplay ref={codeDisplayRef} code={activeCode} language={solution?.language || streamingContent.language} complexity={activeComplexity} onLineHover={onLineHover} examples={solution?.examples} isStreaming={isLoading && loadingType === 'solve' && !solution} autoRunOutput={autoRunOutput} onExplanationsUpdate={onExplanationsUpdate} ascendMode={ascendMode} codingLanguage={codingLanguage} onLanguageChange={ascendMode === 'coding' ? onLanguageChange : undefined} detailLevel={codingDetailLevel} onDetailLevelChange={ascendMode === 'coding' ? onCodingDetailLevelChange : undefined} editorSettings={editorSettings} systemDesign={solution?.systemDesign || streamingContent.systemDesign} eraserDiagram={eraserDiagram} autoGenerateEraser={autoGenerateEraser} question={currentProblem || loadedProblem} cloudProvider="auto" onGenerateEraserDiagram={onGenerateEraserDiagram} approaches={approaches} activeApproach={activeApproach} onApproachChange={setActiveApproach} />
    </div>
  );

  const ExplainPane = () => (
    <div className="h-full overflow-hidden bg-white">
      <ExplanationPanel explanations={activeExplanations} highlightedLine={highlightedLine} pitch={activePitch} systemDesign={solution?.systemDesign || streamingContent.systemDesign} isStreaming={isLoading && loadingType === 'solve' && !solution} onExpandSystemDesign={onExpandSystemDesign} canExpandSystemDesign={!!currentProblem && !isLoading} onFollowUpQuestion={onFollowUpQuestion} isProcessingFollowUp={isProcessingFollowUp} />
    </div>
  );

  // ===========================================================================
  // MOBILE LAYOUT — tabbed view
  // ===========================================================================
  if (isMobile) {
    const tabs = ascendMode === 'system-design'
      ? [{ id: 'problem', label: 'Problem' }, { id: 'design', label: 'Design' }]
      : [{ id: 'problem', label: 'Problem' }, { id: 'code', label: 'Code' }, { id: 'explain', label: 'Explain' }];

    return (
      <div className="h-full bg-white">
        <MobileTabView tabs={tabs} activeTab={mobileTab} onTabChange={setMobileTab} loadingTabId={isLoading ? (ascendMode === 'system-design' ? 'design' : 'code') : null}>
          {(activeId) => (
            <>
              {activeId === 'problem' && <ProblemPane />}
              {activeId === 'code' && <CodePane />}
              {activeId === 'explain' && <ExplainPane />}
              {activeId === 'design' && <DesignPane />}
            </>
          )}
        </MobileTabView>

        {/* AscendAssistant as bottom sheet on mobile */}
        {showAscendAssistant && (
          <div className="fixed inset-0 z-modal flex flex-col">
            <div className="flex-1 bg-black/50" onClick={onCloseAscendAssistant} />
            <div className="h-[75dvh] bg-white rounded-t-2xl border-t border-[#e3e8ee] overflow-hidden animate-slide-in-up shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e8ee]">
                <span className="text-sm font-semibold text-gray-900">Assistant</span>
                <button onClick={onCloseAscendAssistant} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 active:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="h-full overflow-hidden">
                <AscendAssistantPanel onClose={onCloseAscendAssistant} provider={provider} model={model} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // DESKTOP LAYOUT — Allotment split panes (light theme)
  // ===========================================================================
  if (ascendMode === 'system-design') {
    return (
      <div className="h-full bg-white">
        <Allotment defaultSizes={showAscendAssistant ? [50, 50] : [40, 60]}>
          {/* LEFT PANEL — Problem input + Architecture diagram */}
          <Allotment.Pane minSize={250}>
            <div className="h-full flex flex-col overflow-hidden bg-white border-r border-[#e3e8ee]">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-[#e3e8ee]">
                <div className="flex items-center justify-between px-3 py-2 bg-[#f7f8f9]">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ background: '#10b981' }} />
                    <h2 className="text-sm font-semibold text-gray-900">System Design</h2>
                    <button onClick={onSavedDesignsClick} aria-label="View saved designs" className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg transition-all duration-200 ${savedDesignsCount > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#f7f8f9] text-gray-500 hover:text-gray-700 border border-[#e3e8ee] hover:border-[#d0d5dd]'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      Saved ({savedDesignsCount})
                    </button>
                  </div>
                  <AscendModeSelector {...modeSelectorProps} />
                </div>
              </div>
              {/* Problem input */}
              <div className="flex-shrink-0 px-3 py-2 border-b border-[#e3e8ee]">
                <ProblemInput {...problemInputProps} />
              </div>
              {/* Cloud Architecture Diagram fills remaining space */}
              <div className="flex-1 min-h-0 overflow-auto">
                {hasSystemDesign ? (
                  <Suspense fallback={null}>
                    <SystemDesignPanel
                      systemDesign={systemDesign}
                      eraserDiagram={eraserDiagram}
                      autoGenerateEraser={autoGenerateEraser}
                      onGenerateEraserDiagram={onGenerateEraserDiagram}
                      question={currentProblem || loadedProblem}
                      cloudProvider="auto"
                      diagramOnly={true}
                    />
                  </Suspense>
                ) : isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="flex gap-1 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">Generating system design...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <span className="text-sm">Enter a system design question</span>
                  </div>
                )}
              </div>
            </div>
          </Allotment.Pane>

          {/* RIGHT PANEL — Design details (requirements, tradeoffs, components, etc.) */}
          <Allotment.Pane minSize={300}>
            {showAscendAssistant ? (
              <Allotment defaultSizes={[60, 40]}>
                <Allotment.Pane minSize={220}>
                  <DesignPane />
                </Allotment.Pane>
                <Allotment.Pane minSize={220}>
                  <AscendAssistantPanel onClose={onCloseAscendAssistant} provider={provider} model={model} />
                </Allotment.Pane>
              </Allotment>
            ) : (
              <DesignPane />
            )}
          </Allotment.Pane>
        </Allotment>
      </div>
    );
  }

  return (
    <div className="h-full bg-white">
      <Allotment defaultSizes={showAscendAssistant ? [30, 40, 30] : [30, 70]}>
        <Allotment.Pane minSize={220}>
          <ProblemPane />
        </Allotment.Pane>
        <Allotment.Pane minSize={300}>
          <div className="h-full bg-[#f7f8f9] border-l border-[#e3e8ee]">
            <CodePane />
          </div>
        </Allotment.Pane>
        {showAscendAssistant && (
          <Allotment.Pane minSize={300}>
            <AscendAssistantPanel onClose={onCloseAscendAssistant} provider={provider} model={model} />
          </Allotment.Pane>
        )}
      </Allotment>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        .landing-root { -webkit-font-smoothing: antialiased; font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-body { font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif; }
        .landing-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>
    </div>
  );
}
