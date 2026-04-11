import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/lumora/interview/Header';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';
import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import { useLumoraTour } from '../../hooks/useLumoraTour';

function MicCheck({ onReady }: { onReady: () => void }) {
  const [micLevel, setMicLevel] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [backendOk, setBackendOk] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
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

  const allReady = micOk && backendOk;

  return (
    <div className="h-screen w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Subtle grid */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative max-w-5xl w-full mx-6 grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Left — What is Lumora */}
        <div className="p-10 lg:p-12 flex flex-col justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            Your AI co-pilot for{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4, #818cf8)' }}>live interviews</span>
          </h1>
          <p className="text-base text-white/40 mb-8">Get structured answers in 3 seconds. System design, coding, behavioral — all formats.</p>

          <div className="space-y-4">
            {[
              { num: '1', label: 'Speak, type, or paste', desc: 'Mic transcribes your interviewer. Or paste the question directly.', color: '#10b981' },
              { num: '2', label: 'Get instant answers', desc: 'Architecture diagrams, STAR format, multi-approach code solutions.', color: '#06b6d4' },
              { num: '3', label: 'Switch modes', desc: 'Interview, Coding (50+ langs), and Design tabs for every question type.', color: '#818cf8' },
            ].map(s => (
              <div key={s.num} className="flex items-start gap-4">
                <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: s.color }}>
                  {s.num}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{s.label}</p>
                  <p className="text-sm text-white/40 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/30 text-xs font-mono">Cmd+M mic</kbd>
            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/30 text-xs font-mono">Cmd+B blank</kbd>
            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/30 text-xs font-mono">Cmd+K focus</kbd>
          </div>
        </div>

        {/* Right — System Check + Start */}
        <div className="p-10 lg:p-12 flex flex-col justify-center" style={{ background: 'rgba(16,185,129,0.03)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>System Check</h2>
            <p className="text-sm text-white/30">Everything checks out automatically</p>
          </div>

          {error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
          ) : (
            <>
              {/* Mic level */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-white/30 mb-2">
                  <span>Mic Level</span>
                  <span className={micOk ? 'text-emerald-400 font-semibold' : ''}>{micOk ? 'Detected' : 'Speak to test...'}</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-75 ${micOk ? 'bg-emerald-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(micLevel * 300, 100)}%`, boxShadow: micOk ? '0 0 12px rgba(16,185,129,0.4)' : '' }} />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3 mb-8">
                {[
                  { ok: micOk, label: 'Microphone detected' },
                  { ok: backendOk, label: 'AI engine ready' },
                  { ok: backendOk, label: 'Streaming connected' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${c.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/20'}`}>
                      {c.ok ? '\u2713' : '\u00b7'}
                    </div>
                    <span className={`text-base ${c.ok ? 'text-white' : 'text-white/30'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button onClick={onReady}
            className="w-full py-4 text-white font-bold text-lg rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: allReady ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255,255,255,0.06)', boxShadow: allReady ? '0 4px 20px rgba(16,185,129,0.3)' : 'none' }}>
            {allReady ? "Start Interview" : 'Skip Check & Start'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InterviewPage() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [blanked, setBlanked] = useState(false);
  const { handleSubmit, resetState } = useStreamingInterview();
  const { clearStreamChunks, setParsedBlocks, setQuestion, setError, setIsStreaming, setStatus, isStreaming, history, question, parsedBlocks } = useInterviewStore();

  // Guided tour on fresh session
  useLumoraTour();

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

  if (blanked) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center cursor-pointer" onClick={() => setBlanked(false)}>
        <p className="text-gray-300 text-sm font-mono">Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-400">Cmd+B</kbd> to resume</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden lumora-app-bg">
      {/* Subtle grid texture */}
      <div className="lumora-grid-overlay" />

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
      <div className="hidden sm:flex items-center justify-between h-7 px-3 backdrop-blur-xl shrink-0 lumora-status-bar">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} style={!isStreaming ? { boxShadow: '0 0 6px rgba(52, 211, 153, 0.4)' } : {}} />
          <span className="text-[11px] font-code text-white/60">
            {isStreaming ? 'Generating...' : 'Ready'}
          </span>
          {history.length > 0 && (
            <span className="text-[11px] font-code text-white/40 border-l border-white/10 pl-2">
              {history.length} Q&A{history.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-code text-white/40">
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-white/10 text-white/50 text-[10px] bg-white/5">Cmd+M</kbd> mic
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-white/10 text-white/50 text-[10px] bg-white/5">Cmd+K</kbd> focus
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-white/10 text-white/50 text-[10px] bg-white/5">Cmd+S</kbd> search
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded-md border border-white/10 text-white/50 text-[10px] bg-white/5">Cmd+B</kbd> blank
          </span>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
