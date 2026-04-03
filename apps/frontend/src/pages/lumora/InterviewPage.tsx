import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/lumora/interview/Header';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';

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
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Pre-Interview Check</h2>
        <p className="text-sm text-gray-500 mb-6">Make sure your microphone is working before the interview starts.</p>

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
          <button onClick={onReady} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25">
            {micOk ? "I'm Ready" : 'Skip Check'}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Hotkeys: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Cmd+M</kbd> mic &nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Cmd+B</kbd> blank &nbsp;
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">Cmd+K</kbd> focus
        </p>
      </div>
    </div>
  );
}

export function InterviewPage() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [blanked, setBlanked] = useState(false);
  const [micChecked, setMicChecked] = useState(() => {
    return sessionStorage.getItem('lumora_mic_checked') === '1';
  });
  const { handleSubmit, resetState } = useStreamingInterview();
  const { clearStreamChunks, setParsedBlocks, setQuestion, setError, setIsStreaming, setStatus, isStreaming, history } = useInterviewStore();

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
      <div className="hidden sm:flex items-center justify-between h-7 px-3 bg-gray-950 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="text-[10px] font-mono text-gray-400">
            {isStreaming ? 'Generating...' : 'Ready'}
          </span>
          {history.length > 0 && (
            <span className="text-[10px] font-mono text-gray-500 border-l border-gray-700 pl-2">
              {history.length} Q&A{history.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
          <span>
            <kbd className="px-1 py-0.5 rounded border border-gray-700 text-gray-400 text-[9px]">Cmd+M</kbd> mic
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded border border-gray-700 text-gray-400 text-[9px]">Cmd+K</kbd> focus
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded border border-gray-700 text-gray-400 text-[9px]">Cmd+S</kbd> search
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded border border-gray-700 text-gray-400 text-[9px]">Cmd+B</kbd> blank
          </span>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
