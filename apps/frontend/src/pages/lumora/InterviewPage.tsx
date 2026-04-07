import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../../components/lumora/interview/Header';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';
import CamoraLogo from '../../components/shared/CamoraLogo';
import SiteFooter from '../../components/shared/SiteFooter';
import { useAuth } from '../../contexts/AuthContext';

function MicCheck({ onReady }: { onReady: () => void }) {
  const [micLevel, setMicLevel] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [backendOk, setBackendOk] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    // Test backend connectivity
    fetch(`${import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com'}/health`)
      .then(r => { if (r.ok && active) setBackendOk(true); })
      .catch(() => {});
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!active) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
          setMicLevel(avg);
          if (avg > 0.05) setMicOk(true);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError('Microphone not accessible. Check browser permissions.');
      }
    })();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center lumora-app-bg">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Pre-Interview Check</h2>
        <p className="text-sm font-display text-gray-500 mb-6">Make sure your microphone is working before the interview starts.</p>

        {error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">{error}</div>
        ) : (
          <>
            {/* Audio level bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Mic Level</span>
                <span>{micOk ? 'Detected' : 'Speak to test...'}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${micOk ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(micLevel * 300, 100)}%` }}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="text-left space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${micOk ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  {micOk ? '\u2713' : '\u00b7'}
                </span>
                <span className={micOk ? 'text-gray-900' : 'text-gray-400'}>Microphone detected</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${backendOk ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  {backendOk ? '\u2713' : '\u00b7'}
                </span>
                <span className={backendOk ? 'text-gray-900' : 'text-gray-400'}>AI engine ready</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${backendOk ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  {backendOk ? '\u2713' : '\u00b7'}
                </span>
                <span className="text-gray-900">Streaming connected</span>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onReady} className="font-display flex-1 py-3 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:opacity-90" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
            {micOk ? "I'm Ready" : 'Skip Check'}
          </button>
        </div>

        <p className="mt-3 text-xs font-code text-gray-400">
          Hotkeys: <kbd className="px-1 py-0.5 bg-gray-100 rounded-md text-gray-500 font-code">Cmd+M</kbd> mic &nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 rounded-md text-gray-500 font-code">Cmd+B</kbd> blank &nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 rounded-md text-gray-500 font-code">Cmd+K</kbd> focus
        </p>
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];

export function InterviewPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [blanked, setBlanked] = useState(false);
  const [micChecked, setMicChecked] = useState(() => {
    return sessionStorage.getItem('lumora_mic_checked') === '1';
  });
  const { handleSubmit, resetState } = useStreamingInterview();
  const { clearStreamChunks, setParsedBlocks, setQuestion, setError, setIsStreaming, setStatus, isStreaming, history, question, parsedBlocks } = useInterviewStore();

  // Hide the full tool header on the empty/landing state
  const isEmptyState = !question && !isStreaming && parsedBlocks.length === 0 && history.length === 0;

  // Emergency blank: Cmd+B or Ctrl+B to hide/show everything
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        const el = e.target as HTMLElement;
        if (el.closest('.monaco-editor') || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setBlanked(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleInputSubmit = useCallback(() => {
    if (inputValue.trim()) {
      handleSubmit(inputValue);
      setInputValue('');
    }
  }, [inputValue, handleSubmit]);

  const handleTranscription = useCallback((text: string) => {
    if (text.trim()) {
      handleSubmit(text);
    }
  }, [handleSubmit]);

  if (!micChecked) {
    return <MicCheck onReady={() => { setMicChecked(true); sessionStorage.setItem('lumora_mic_checked', '1'); }} />;
  }

  if (blanked) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center cursor-pointer" onClick={() => setBlanked(false)}>
        <p className="text-gray-300 text-sm font-mono">Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-400">Cmd+B</kbd> to resume</p>
      </div>
    );
  }

  if (isEmptyState) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Site Nav */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.7) 0%, rgba(179,198,231,0.7) 30%, rgba(197,179,227,0.7) 55%, rgba(212,184,232,0.7) 80%, rgba(225,190,231,0.7) 100%)' }}>
          <div className="max-w-[70%] mx-auto flex items-center justify-between px-6 h-14">
            <Link to="/" className="flex items-center gap-2.5">
              <CamoraLogo size={36} />
              <span className="text-sm font-bold tracking-tight text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link key={link.label} to={link.href} className="px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors">{link.label}</Link>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link to="/capra/prepare" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                {user?.image ? (
                  <img src={user.image} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">{user?.name?.[0] || '?'}</div>
                )}
                <span className="text-[13px] text-gray-700 font-medium">{user?.name?.split(' ')[0] || 'Dashboard'}</span>
              </Link>
              <button onClick={logout} className="text-[13px] text-gray-400 hover:text-red-500 transition-colors font-medium">Sign out</button>
            </div>
          </div>
        </nav>

        <ErrorBoundary>
          <InterviewPanel
            onAskQuestion={handleSubmit}
            onSwitchToCoding={(problem) => {
              navigate(problem ? `/lumora/coding?problem=${encodeURIComponent(problem)}` : '/lumora/coding');
            }}
            onSwitchToDesign={(problem) => {
              navigate(problem ? `/lumora/design?problem=${encodeURIComponent(problem)}` : '/lumora/design');
            }}
          />
        </ErrorBoundary>

        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden lumora-app-bg">
      <Header
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSubmit={handleInputSubmit}
        onTranscription={handleTranscription}
        showInputBar={true}
      />

      <ErrorBoundary>
        <InterviewPanel
          onAskQuestion={handleSubmit}
          onSwitchToCoding={(problem) => {
            navigate(problem ? `/lumora/coding?problem=${encodeURIComponent(problem)}` : '/lumora/coding');
          }}
          onSwitchToDesign={(problem) => {
            navigate(problem ? `/lumora/design?problem=${encodeURIComponent(problem)}` : '/lumora/design');
          }}
        />
      </ErrorBoundary>

      {/* Enterprise Status Bar */}
      <div className="hidden sm:flex items-center justify-between h-7 px-3 bg-gray-900/80 backdrop-blur-xl border-t border-gray-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} style={!isStreaming ? { boxShadow: '0 0 6px rgba(52, 211, 153, 0.4)' } : {}} />
          <span className="text-[10px] font-code text-gray-200">
            {isStreaming ? 'Generating...' : 'Ready'}
          </span>
          {history.length > 0 && (
            <span className="text-[10px] font-code text-gray-300 border-l border-gray-700/50 pl-2">
              {history.length} Q&A{history.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-code text-gray-300">
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-gray-700/50 text-gray-200 text-[9px] bg-white/5">Cmd+M</kbd> mic
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-gray-700/50 text-gray-200 text-[9px] bg-white/5">Cmd+K</kbd> focus
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-gray-700/50 text-gray-200 text-[9px] bg-white/5">Cmd+S</kbd> search
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-gray-700/50 text-gray-200 text-[9px] bg-white/5">Cmd+B</kbd> blank
          </span>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
