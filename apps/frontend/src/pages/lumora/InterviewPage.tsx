import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/lumora/interview/Header';
import { InterviewPanel } from '../../components/lumora/interview/InterviewPanel';
import { SessionSidebar } from '../../components/lumora/interview/SessionSidebar';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';
import { useInterviewStore } from '../../stores/interview-store';
import { useLumoraTour } from '../../hooks/useLumoraTour';
import CamoraLogo from '../../components/shared/CamoraLogo';

export function InterviewPage() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [blanked, setBlanked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<number | null>(null);
  const { handleSubmit } = useStreamingInterview();
  const { isStreaming, history, question, parsedBlocks } = useInterviewStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useLumoraTour();

  useEffect(() => {
    document.title = 'Live Interview | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  // Emergency blank: Cmd+B
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        const el = e.target as HTMLElement;
        if (el.closest('.monaco-editor') || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setBlanked(prev => !prev);
      }
      // Cmd+K to focus composer
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isExpanded) textareaRef.current?.focus();
        else inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded]);

  const handleInputSubmit = useCallback(() => {
    if (inputValue.trim()) {
      handleSubmit(inputValue);
      setInputValue('');
      setIsExpanded(false);
    }
  }, [inputValue, handleSubmit]);

  const handleTranscription = useCallback((text: string) => {
    if (text.trim()) handleSubmit(text);
  }, [handleSubmit]);

  if (blanked) {
    return (
      <div className="h-screen w-full flex items-center justify-center cursor-pointer" style={{ background: '#000' }} onClick={() => setBlanked(false)}>
        <div className="opacity-10"><CamoraLogo size={24} /></div>
      </div>
    );
  }

  const showEmptyState = !question && !isStreaming && parsedBlocks.length === 0 && history.length === 0;

  return (
    <div className="h-screen w-full flex flex-col overflow-y-auto md:overflow-hidden lumora-app-bg">
      <div className="lumora-grid-overlay" />

      {/* Header — shared component with tabs, audio, controls */}
      <Header
        inputValue=""
        onInputChange={() => {}}
        onSubmit={() => {}}
        onTranscription={handleTranscription}
        showInputBar={false}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {/* Sidebar + Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <SessionSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectEntry={(idx) => setFocusedEntry(idx)}
        />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <ErrorBoundary>
            <InterviewPanel
              onAskQuestion={handleSubmit}
              focusedEntry={focusedEntry}
              onClearFocus={() => setFocusedEntry(null)}
              onSwitchToCoding={(problem) => {
                navigate(problem ? `/lumora/coding?problem=${encodeURIComponent(problem)}` : '/lumora/coding');
              }}
              onSwitchToDesign={(problem) => {
                navigate(problem ? `/lumora/design?problem=${encodeURIComponent(problem)}` : '/lumora/design');
              }}
            />
          </ErrorBoundary>

          {/* ═══ BOTTOM COMPOSER ═══ */}
          <div className="shrink-0 relative z-20">
            <div className="absolute -top-8 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(to top, #ffffff, transparent)' }} />
            <div className="px-3 sm:px-4 pb-3 pt-1">
              <div className="mx-auto" style={{ maxWidth: 'min(90%, 100% - 16px)' }}>
                {isExpanded ? (
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleInputSubmit(); }}
                      placeholder="Paste a coding problem, system design question, or multi-line prompt..."
                      className="w-full bg-transparent text-slate-900 text-sm placeholder:text-slate-400 px-4 py-3 resize-none focus:outline-none font-code"
                      rows={4}
                      style={{ minHeight: 80, maxHeight: 240 }}
                      autoFocus
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200">
                      <span className="text-[10px] font-code text-slate-400">{inputValue.length > 0 ? `${inputValue.length} chars` : 'Cmd+Enter to send'}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsExpanded(false)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1">Collapse</button>
                        <button onClick={handleInputSubmit} disabled={!inputValue.trim() || isStreaming}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-30 transition-all"
                          style={{ background: inputValue.trim() ? 'linear-gradient(135deg, #F97316, #F97316)' : '#e2e8f0' }}>
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl px-3 sm:px-4 h-12 sm:h-12 transition-all focus-within:shadow-[0_0_0_2px_rgba(249,115,22,0.3)]"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
                    {isStreaming && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" style={{ boxShadow: '0 0 8px rgba(249,115,22,0.4)' }} />
                    )}
                    <input
                      ref={inputRef}
                      data-tour="input"
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleInputSubmit(); }}
                      placeholder={isStreaming ? 'AI is generating...' : showEmptyState ? 'Ask an interview question...' : 'Ask a follow-up question...'}
                      className="flex-1 bg-transparent text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none min-w-0"
                      disabled={isStreaming}
                    />
                    <button onClick={() => { setIsExpanded(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                      title="Expand for multi-line input">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                    {inputValue.trim() && !isStreaming && (
                      <button onClick={handleInputSubmit}
                        className="p-1.5 rounded-lg transition-all shrink-0"
                        style={{ background: 'linear-gradient(135deg, #F97316, #F97316)', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                    {!inputValue && !isStreaming && (
                      <kbd className="hidden sm:inline text-[10px] font-code text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">Cmd+K</kbd>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center justify-between h-6 px-3 lumora-status-bar">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`} style={!isStreaming ? { boxShadow: '0 0 4px rgba(16,185,129,0.4)' } : {}} />
                <span className="text-[10px] font-code text-slate-400">{isStreaming ? 'Generating...' : 'Ready'}</span>
                {history.length > 0 && (
                  <span className="text-[10px] font-code text-slate-400 border-l border-slate-200 pl-2">{history.length} Q&A</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-code text-slate-400">
                <span><kbd className="px-1 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">⌘M</kbd> mic</span>
                <span><kbd className="px-1 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">⌘K</kbd> focus</span>
                <span><kbd className="px-1 py-0.5 rounded border border-slate-200 text-slate-500 bg-slate-50">⌘B</kbd> blank</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
