import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Editor, useMonaco } from '@monaco-editor/react';
import SharedCodeEditor from '@/components/shared/code/SharedCodeEditor';
import { AnnotationPanel } from './AnnotationPanel';
import { streamCoFixResponse } from '@/lib/sse-client';
import { playgroundAPI } from '@/lib/capra-api';
import type { CoFixAnswer, CoFixChange } from '@/lib/sse-client';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveAssistant } from '@/lib/lumora-assistant';
import { ASSISTANT_UPDATED_EVENT } from '@/lib/companyContext';
import { dialogAlert } from '@/components/shared/Dialog';
import type { ScreenshotEntry } from '@/components/lumora/shell/ScreenshotStrip';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { useSessionStore } from '@/stores/session-store';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

const detectLanguage = (text: string): string => {
  if (/^FROM\s+\S+/m.test(text)) return 'dockerfile';
  if (/^services:\s*$/m.test(text) && /image:|build:/.test(text)) return 'docker-compose';
  if (/^resource\s+"[\w_]+"\s+"[\w_]+"\s*\{/m.test(text) || /^provider\s+"[\w_]+"\s*\{/m.test(text)) return 'terraform';
  if (/^---\s*$|^\s[\w_-]+:\s/m.test(text) && !/def\s+\w+|class\s+\w+/.test(text)) return 'yaml';
  if (/^#!.*\b(bash|sh)\b|^\s*(echo|export|source|chmod)\s/.test(text)) return 'bash';
  if (/def\s+\w+\s*\(|class\s+\w+:|import\s+\w+|print\s*\(/.test(text)) return 'python';
  if (/function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|=>\s*{/.test(text)) return 'javascript';
  if (/public\s+class\s+\w+|System\.out\.print/.test(text)) return 'java';
  if (/#include\s*<|int\s+main\s*\(/.test(text)) return /vector<|cout/.test(text) ? 'cpp' : 'c';
  if (/func\s+\w+\s*\(.*\)\s*(->|\{)|package\s+main/.test(text)) return 'go';
  if (/pub\s+fn\s+\w+|let\s+mut\s+\w+/.test(text)) return 'rust';
  return 'python';
};

// Maps CoFix language IDs → Monaco editor language tokens
const MONACO_LANG: Record<string, string> = {
  bash: 'shell',
  'docker-compose': 'yaml',
  terraform: 'hcl',
};
const toMonacoLang = (lang: string): string => MONACO_LANG[lang] ?? lang;

const LANGUAGES = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'bash', label: 'Bash' },
  { id: 'dockerfile', label: 'Dockerfile' },
  { id: 'yaml', label: 'YAML' },
  { id: 'docker-compose', label: 'Docker Compose' },
  { id: 'terraform', label: 'Terraform' },
];

interface CoFixLayoutProps {
  onScreenshotAppendRef?: { current: ((text: string) => void) | null };
  screenshots?: ScreenshotEntry[];
  onSnapped?: (entry: ScreenshotEntry) => void;
  onRemove?: (id: string) => void;
  onTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  isTabActive?: boolean;
}

const pillBase = 'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,opacity] active:scale-[0.97]';

export const CoFixLayout = ({ onScreenshotAppendRef, screenshots = [], onSnapped, onRemove, onTranscription, isTabActive }: CoFixLayoutProps) => {
  const { token } = useAuth();
  const isStealthActive = useSessionStore(s => s.isStealthActive);
  const setIsStealthActive = useSessionStore(s => s.setIsStealthActive);
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [pendingSnapIds, setPendingSnapIds] = useState<string[]>([]);
  const onSnappedRef = useRef(onSnapped);
  useEffect(() => { onSnappedRef.current = onSnapped; }, [onSnapped]);
  const navigate = useNavigate();
  const monaco = useMonaco();

  const [inputCode, setInputCode] = useState('');
  const [hint, setHint] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [fixedCode, setFixedCode] = useState('');
  const [changes, setChanges] = useState<CoFixChange[]>([]);
  const [complexity, setComplexity] = useState<{ time: string; space: string } | null>(null);
  const [hackerrankCompatible, setHackerrankCompatible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [explainMode, setExplainMode] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const cofixHoverDisposable = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const decorationCollectionRef = useRef<any>(null);

  // Re-render when company context changes
  const [assistantVersion, setAssistantVersion] = useState(0);
  useEffect(() => {
    const handler = () => setAssistantVersion(v => v + 1);
    window.addEventListener(ASSISTANT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_UPDATED_EVENT, handler);
  }, []);
  const activeAssistant = useMemo(() => getActiveAssistant(), [assistantVersion]);

  useEffect(() => {
    cofixHoverDisposable.current?.dispose();
    cofixHoverDisposable.current = null;
    if (!monaco || !explainMode) return;

    const monacoLang = toMonacoLang(effectiveLang);
    cofixHoverDisposable.current = monaco.languages.registerHoverProvider(monacoLang, {
      provideHover: async (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber).trim();
        if (!lineContent) return null;
        try {
          const result = await playgroundAPI.explain(
            model.getValue(),
            position.lineNumber,
            effectiveLang
          );
          if (!result.explanation) return null;
          return {
            contents: [
              { value: `**Line ${position.lineNumber}** — *Gemini*` },
              { value: result.explanation },
            ],
          };
        } catch {
          return null;
        }
      },
    });

    return () => { cofixHoverDisposable.current?.dispose(); };
  }, [monaco, explainMode, effectiveLang]);

  // Screenshot append ref — appends OCR text to the left pane input
  useEffect(() => {
    if (!onScreenshotAppendRef) return;
    onScreenshotAppendRef.current = (text: string) => {
      setInputCode(prev => prev ? `${prev}\n\n--- Page Break ---\n\n${text}` : text);
    };
    return () => { onScreenshotAppendRef.current = null; };
  }, [onScreenshotAppendRef]);

  const effectiveLang = language === 'auto' ? detectLanguage(inputCode) : language;
  const lineCount = inputCode.split('\n').length;

  useEffect(() => {
    const editor = rightEditorRef.current;
    if (!editor || !monaco || changes.length === 0) return;

    const newDecorations = changes.map(change => ({
      range: new monaco.Range(change.line, 1, change.line, 1),
      options: {
        isWholeLine: true,
        className: change.type === 'fix' ? 'cofix-line-fix' : 'cofix-line-added',
      },
    }));

    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.set(newDecorations);
    } else {
      decorationCollectionRef.current = editor.createDecorationsCollection(newDecorations);
    }
  }, [changes, monaco, fixedCode]);

  const handleStealthMode = useCallback(async () => {
    const camo = (window as any).camo;
    if (!camo?.setStealthMode) {
      await dialogAlert({ title: 'Desktop only', message: 'Stealth mode requires the Camora desktop app.' });
      return;
    }
    const next = !isStealthActive;
    await camo.setStealthMode(next);
    setIsStealthActive(next);
  }, [isStealthActive, setIsStealthActive]);

  const handleSnap = useCallback(async () => {
    if (!onSnappedRef.current) return;
    const camo = (window as any).camo;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    try {
      let dataUrl: string;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (result?.error) throw new Error(result.error);
        const blob = await fetch(result.dataUrl || result).then(r => r.blob());
        dataUrl = await new Promise<string>(res => { const reader = new FileReader(); reader.onloadend = () => res(reader.result as string); reader.readAsDataURL(blob); });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no 2d context');
          ctx.drawImage(bitmap, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
        } finally { track.stop(); }
      }
      const tempEntry: ScreenshotEntry = { id, dataUrl, text: '' };
      setPendingSnapIds(prev => [...prev, id]);
      setSnapState('idle');
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', new File([blob], 'snap.png', { type: 'image/png' }));
        const resp = await fetch(`${API_URL}/api/v1/coding/extract-from-image`, {
          method: 'POST', credentials: 'include',
          headers: { Authorization: `Bearer ${token}` }, body: formData,
        });
        if (!resp.ok) throw new Error(`OCR ${resp.status}`);
        const data = await resp.json();
        onSnappedRef.current?.({ ...tempEntry, text: data.text || data.problem_text || '' });
      } catch { onSnappedRef.current?.({ ...tempEntry, text: '' }); }
      finally { setPendingSnapIds(prev => prev.filter(p => p !== id)); }
    } catch {
      setSnapState('error');
      setTimeout(() => setSnapState('idle'), 3000);
      setPendingSnapIds(prev => prev.filter(p => p !== id));
    }
  }, [token]);

  const handleFix = useCallback(async () => {
    if (inputCode.trim().length < 5 || isLoading) return;

    abortRef.current?.abort();
    setIsLoading(true);
    setFixedCode('');
    setChanges([]);
    setComplexity(null);
    setHackerrankCompatible(null);
    setError(null);
    setRunOutput(null);
    decorationCollectionRef.current = null;

    const controller = await streamCoFixResponse({
      code: inputCode,
      hint: hint.trim() || undefined,
      company: activeAssistant?.company || undefined,
      language: effectiveLang,
      token: token!,
      onAnswer: (data: CoFixAnswer) => {
        setFixedCode(data.fixed_code);
        setChanges(data.changes);
        setComplexity(data.complexity);
        setHackerrankCompatible(data.hackerrank_compatible);
      },
      onError: ({ msg }) => {
        setError(msg);
        setIsLoading(false);
      },
      onComplete: () => setIsLoading(false),
    });
    abortRef.current = controller;
  }, [inputCode, hint, effectiveLang, token, isLoading, activeAssistant]);

  const handleRun = useCallback(async () => {
    if (!fixedCode || isRunning) return;
    setIsRunning(true);
    setRunOutput('Running…');
    try {
      const response = await fetch(`${API_URL}/api/v1/coding/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: fixedCode, language: effectiveLang, test_cases: [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `Error ${response.status}`);
      setRunOutput(data.direct_output || data.output || '(no output)');
    } catch (err: any) {
      setRunOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [fixedCode, effectiveLang, token, isRunning]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(fixedCode);
  }, [fixedCode]);

  const handleSendToCoding = useCallback(() => {
    navigate('/lumora/coding', { state: { cofixCode: fixedCode } });
  }, [fixedCode, navigate]);

  const isErr = runOutput !== null && (runOutput.startsWith('Error:') || runOutput.startsWith('Traceback') || /^error:/i.test(runOutput));

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar — single combined row ── */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar" style={{ background: 'var(--cam-hero-strip)', borderBottom: '1px solid var(--cam-gold-leaf)' }}>
        {/* Language */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--cam-gold-leaf)' }}>Lang</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="text-[12px] rounded px-2 py-1 cursor-pointer focus:outline-none"
            style={{
              background: 'linear-gradient(135deg, rgba(0,47,120,0.55) 0%, rgba(10,14,26,0.85) 100%)',
              border: '1px solid var(--cam-gold-leaf-dk)',
              color: 'var(--cam-gold-leaf)',
            }}
          >
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* Explain chip */}
        <button
          onClick={() => setExplainMode(v => !v)}
          className="text-[11px] font-semibold px-3 py-1 rounded-md transition-opacity hover:opacity-90 shrink-0"
          style={explainMode ? {
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 100%)',
            border: '1px solid var(--cam-gold-leaf)',
            color: '#0a0e1a',
          } : {
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: 'linear-gradient(135deg, rgba(0,47,120,0.35) 0%, rgba(10,14,26,0.75) 100%)',
            border: '1px solid var(--cam-gold-leaf-dk)',
            color: 'var(--cam-gold-leaf-dk)',
          }}
        >
          Explain
        </button>

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* Status */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
              <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: 'var(--cam-gold-leaf-lt)', borderTopColor: 'transparent' }} />
              Analyzing…
            </span>
          )}
          {!isLoading && fixedCode && changes.length > 0 && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--cam-gold-leaf)' }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--cam-gold-leaf)' }} />
              {changes.length} fix{changes.length !== 1 ? 'es' : ''} applied
            </span>
          )}
          {!isLoading && fixedCode && changes.length === 0 && (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              No issues found
            </span>
          )}
          {!isLoading && !fixedCode && (
            <span className="text-[12px]" style={{ color: 'var(--cam-gold-leaf-dk)' }}>Paste broken code on the left, then click Fix</span>
          )}
        </div>

        {/* Action buttons — only when fixed code is ready */}
        {fixedCode && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSendToCoding}
              className="text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, rgba(0,47,120,0.55) 0%, rgba(10,14,26,0.85) 100%)',
                border: '1px solid var(--cam-gold-leaf-dk)',
                color: 'var(--cam-gold-leaf-dk)',
              }}
            >
              → Coding
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: 'var(--cam-gold-leaf-dk)', opacity: 0.4 }} />

        {/* SNAP */}
        {onSnapped && (
          <button
            onClick={handleSnap}
            disabled={snapState === 'capturing'}
            title={snapState === 'error' ? 'Snap failed' : 'Snap screen'}
            className={pillBase}
            style={snapState === 'error'
              ? { background: '#ef4444', color: '#fff' }
              : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)' }
            }
          >
            {snapState === 'capturing'
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              : snapState === 'error'
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
            }
            {snapState === 'error' ? 'Failed' : snapState === 'capturing' ? '…' : 'Snap'}
          </button>
        )}

        {/* Pending snap thumbnails */}
        {pendingSnapIds.map(pid => (
          <div key={pid} className="w-10 h-7 rounded shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        ))}

        {/* Completed thumbnails */}
        {screenshots.map((s, i) => (
          <div key={s.id} className="relative group shrink-0" title={s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
            <img src={s.dataUrl} alt={`Screenshot ${i + 1}`} className="h-7 w-10 object-cover rounded" style={{ border: '1px solid rgba(255,255,255,0.20)' }} />
            <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}>{i + 1}</span>
            {onRemove && (
              <button onClick={() => onRemove(s.id)} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex" style={{ background: '#ef4444', color: '#fff' }} title="Remove">
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        ))}

        {/* AudioCapture */}
        {onTranscription && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <AudioCapture onTranscription={onTranscription} autoStart={false} active={isTabActive} compact />
          </div>
        )}

        {/* VoiceEnrollment */}
        {onTranscription && <VoiceEnrollment disabled={false} variant="light" />}

        {/* Stealth — desktop only */}
        {!!(window as any).camo?.isDesktop && (
          <button
            onClick={handleStealthMode}
            title={isStealthActive ? 'Stealth ON' : 'Block mouse tracking'}
            className={pillBase}
            style={isStealthActive
              ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }
            }
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {isStealthActive
                ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
              }
            </svg>
            {isStealthActive ? 'Stealth ON' : 'Stealth'}
          </button>
        )}
      </div>

      {/* ── Split pane ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT — broken code input */}
        <div className="flex flex-col w-1/2 border-r border-[var(--border)]">
          <div className="h-8 flex items-center px-4 border-b border-[var(--cam-gold-leaf-dk)] bg-[var(--bg-secondary)] shrink-0">
            <span className="text-[10px] font-semibold tracking-wider text-[var(--cam-gold-leaf-dk)] uppercase">Input — Broken Code</span>
          </div>

          {lineCount > 500 && (
            <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-400">
              Large paste — CoFix works best on focused snippets.
            </div>
          )}

          <div className="flex-1 min-h-0">
            <SharedCodeEditor
              code={inputCode}
              onChange={setInputCode}
              language={toMonacoLang(effectiveLang)}
              readOnly={false}
              height="100%"
              showLineNumbers
            />
          </div>

          <div className="border-t border-[var(--border)] px-3 pt-2 pb-1 bg-[var(--bg-secondary)]">
            <textarea
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Optional: describe what's wrong or what you expect"
              rows={2}
              className="w-full resize-none bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#0047AB]"
            />
          </div>

          <div className="px-3 pb-3 pt-2 bg-[var(--bg-secondary)]">
            <button
              onClick={handleFix}
              disabled={inputCode.trim().length < 5 || isLoading}
              className="w-full py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'var(--cam-hero-strip)', border: '1px solid var(--cam-gold-leaf)' }}
            >
              {isLoading ? 'Analyzing…' : '⚡ Fix with CoFix'}
            </button>
          </div>
        </div>

        {/* RIGHT — fixed code output */}
        <div className="flex w-1/2">
          {/* Code editor column */}
          <div className="flex flex-col flex-1 min-w-0">
          <div className="h-8 flex items-center justify-between px-4 border-b border-[var(--cam-gold-leaf-dk)] bg-[var(--bg-secondary)] shrink-0">
            <span className={`text-[10px] font-semibold tracking-wider uppercase ${fixedCode ? 'text-[var(--cam-gold-leaf)]' : 'text-[var(--cam-gold-leaf-dk)]'}`}>
              {fixedCode ? '✓ Fixed Code' : 'Output — Fixed Code'}
            </span>
            {fixedCode && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-lg transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,47,120,0.55) 0%, rgba(10,14,26,0.85) 100%)',
                    border: '1px solid var(--cam-gold-leaf)',
                    color: 'var(--cam-gold-leaf)',
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, var(--cam-gold-leaf-lt) 0%, var(--cam-gold-leaf) 60%, var(--cam-gold-leaf-dk) 100%)',
                    color: '#0a0e1a',
                  }}
                >
                  {isRunning ? <><span className="w-3 h-3 border-2 border-[#0a0e1a]/40 border-t-[#0a0e1a] rounded-full animate-spin" />Running</> : <>▶ Run</>}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Monaco editor — read-only with line decorations */}
            <div className="flex-1 min-w-0 relative">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg-primary)]/90 backdrop-blur-sm">
                  <div className="w-8 h-8 border-2 border-[#0047AB] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px] font-medium text-[var(--text-muted)]">Analyzing and fixing…</span>
                </div>
              )}
              {error && !isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg-primary)]">
                  <p className="text-[12px] text-red-400 text-center px-6">{error}</p>
                  <button
                    onClick={handleFix}
                    className="text-[12px] px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[#0047AB] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              <Editor
                value={fixedCode}
                language={toMonacoLang(effectiveLang)}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  glyphMargin: false,
                  folding: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
                onMount={editor => { rightEditorRef.current = editor; }}
              />
            </div>

          </div>

          {/* Complexity strip */}
          {complexity && (
            <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)] text-[11px] flex-wrap shrink-0">
              <span className="text-[var(--text-muted)]">
                Time: <span className="text-[var(--text-primary)] font-mono">{complexity.time}</span>
              </span>
              <span className="text-[var(--text-muted)]">
                Space: <span className="text-[var(--text-primary)] font-mono">{complexity.space}</span>
              </span>
              {hackerrankCompatible !== null && (
                <span className={hackerrankCompatible ? 'text-emerald-400' : 'text-amber-400'}>
                  {hackerrankCompatible ? '✓ HackerRank Compatible' : '⚠ Strip I/O boilerplate before submitting'}
                </span>
              )}
            </div>
          )}

          {/* Run output */}
          {runOutput !== null && (
            <div className="border-t border-[var(--border)] shrink-0" style={{ background: isErr ? 'rgba(239,68,68,0.05)' : 'var(--bg-primary)' }}>
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                <span className={`text-[10px] font-bold tracking-wider uppercase ${isErr ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isErr ? '✕ Runtime Error' : '✓ Output'}
                </span>
                <button onClick={() => setRunOutput(null)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  ✕
                </button>
              </div>
              <pre className={`px-4 py-3 text-[12px] font-mono whitespace-pre-wrap max-h-44 overflow-y-auto ${isErr ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                {runOutput}
              </pre>
            </div>
          )}
          </div>
          {changes.length > 0 && <AnnotationPanel changes={changes} />}
        </div>
      </div>
    </div>
  );
}
