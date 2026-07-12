import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session-store';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

export interface ScreenshotEntry {
  id: string;
  dataUrl: string;
  text: string;
  filePath?: string;
  /** The editor's locked starter/answer block (HackerRank function stub + __main__
      harness, LeetCode class stub, etc.), extracted verbatim from the page DOM or OCR.
      Threaded to the Coding/CoFix layouts so generation FILLS this template instead of
      writing a from-scratch solution the platform won't accept. */
  starterCode?: string;
}

interface ScreenshotStripProps {
  surface: 'coding' | 'design' | 'behavioral';
  screenshots: ScreenshotEntry[];
  onSnapped: (entry: ScreenshotEntry) => void;
  onRemove: (id: string) => void;
  /** Current input mode ('paste'|'url'|'image' for coding; 'text'|'url'|'image' for design) */
  inputMode?: string;
  onInputModeChange?: (mode: string) => void;
  /** Show TEXT/URL/IMAGE pills — true on coding and design tabs */
  showInputModeSelector?: boolean;
  /** Forwarded to AudioCapture for all AI tabs */
  onTranscription?: (text: string, opts?: { manual?: boolean }) => void;
  isTabActive?: boolean;
  /** Coding tab only — shows platform chip (hackerrank/leetcode/coderpad) at left of strip */
  codingPlatform?: string;
  /** When true, drops the full-width bar chrome (bg/border/min-height) so the
      controls can be embedded inside another toolbar row (e.g. CodingLayout's
      Description/Solution row) instead of rendering as a standalone strip. */
  inline?: boolean;
}

/** Icon per input mode — replaces the TEXT/URL/IMAGE text labels. */
const modeIcon = (m: string) => {
  if (m === 'url') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
  if (m === 'image') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
  // paste / text
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V5h16v2M9 20h6M12 5v15"/></svg>;
};

/** Shared pill chrome — matches the LumoraShellPage tab nav exactly. */
const pillBase = 'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.1em] font-mono transition-[background-color,color,opacity] active:scale-[0.97]';

export const ScreenshotStrip = ({ surface, screenshots, onSnapped, onRemove, inputMode, onInputModeChange, showInputModeSelector, onTranscription, isTabActive, codingPlatform, inline }: ScreenshotStripProps) => {
  const { token } = useAuth();
  const answerMode = useSessionStore(s => s.answerMode);
  const setAnswerMode = useSessionStore(s => s.setAnswerMode);
  const sonaExport = useSessionStore(s => s.sonaExport);
  const sonaClear = useSessionStore(s => s.sonaClear);
  const sonaClose = useSessionStore(s => s.sonaClose);
  const sonaHasMessages = useSessionStore(s => s.sonaHasMessages);
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [snapArmed, setSnapArmed] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const onSnappedRef = useRef(onSnapped);
  useEffect(() => { onSnappedRef.current = onSnapped; }, [onSnapped]);
  const handleSnapRef = useRef<() => Promise<void>>(async () => {});

  const handleSnap = useCallback(async () => {
    const camo = (window as any).camo;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    try {
      let dataUrl: string;
      let filePath: string | undefined;
      // When the desktop returns EXACT DOM-extracted problem text (a coding-platform
      // tab was open), use it verbatim and skip fragile screenshot OCR.
      let domText: string | null = null;
      // The locked editor template (answer block) that MUST be filled, not rewritten.
      let domStarter: string | null = null;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (!result?.ok || (!result.dataUrl && !result.text && !result.starterCode)) throw new Error(result?.error || 'Snap failed');
        filePath = result.filePath ?? undefined;
        domText = typeof result?.text === 'string' && result.text.trim() ? result.text : null;
        domStarter = typeof result?.starterCode === 'string' && result.starterCode.trim() ? result.starterCode : null;
        if (result.dataUrl) {
          const blob = await fetch(result.dataUrl).then(r => r.blob());
          dataUrl = await new Promise<string>(res => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } else {
          dataUrl = '';
        }
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas 2d context unavailable');
          ctx.drawImage(bitmap, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
        } finally {
          track.stop();
        }
      }
      // Show loading spinner for this snap
      const tempEntry: ScreenshotEntry = { id, dataUrl, text: '', filePath };
      // Exact DOM extraction present (problem text and/or the editor's starter
      // template) — no OCR needed. Pass BOTH through so the layout shows the problem
      // AND loads the answer block to complete.
      if (domText || domStarter) {
        onSnappedRef.current({ ...tempEntry, text: domText || '', ...(domStarter ? { starterCode: domStarter } : {}) });
        setSnapState('idle');
        return;
      }
      setPendingIds(prev => [...prev, id]);
      setSnapState('idle');
      // OCR
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', new File([blob], 'snap.png', { type: 'image/png' }));
        const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!resp.ok) throw new Error(`OCR failed: ${resp.status}`);
        const data = await resp.json();
        const text = data.problem || data.text || data.problem_text || '';
        // OCR also returns the recognized editor template under starter_code — thread it.
        const ocrStarter = typeof data.starter_code === 'string' && data.starter_code.trim() ? data.starter_code : null;
        onSnappedRef.current({ ...tempEntry, text, ...(ocrStarter ? { starterCode: ocrStarter } : {}) });
      } catch {
        setSnapState('error');
        setTimeout(() => setSnapState('idle'), 3000);
        onSnappedRef.current({ ...tempEntry, text: '' });
      } finally {
        setPendingIds(prev => prev.filter(pid => pid !== id));
      }
    } catch {
      setSnapState('error');
      setTimeout(() => setSnapState('idle'), 3000);
      setPendingIds(prev => prev.filter(pid => pid !== id));
    }
  }, [token, onSnapped]);

  // Keep ref in sync so the blur handler never captures a stale handleSnap.
  useEffect(() => { handleSnapRef.current = handleSnap; }, [handleSnap]);

  // Armed mode: when armed, the first time the Camora window loses focus
  // (user clicked another window) we fire the snap, then disarm.
  useEffect(() => {
    if (!snapArmed) return;
    const onBlur = () => {
      setSnapArmed(false);
      setTimeout(() => handleSnapRef.current(), 200);
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [snapArmed]);

  const showSnap = surface !== 'behavioral';

  // Input mode labels — 'paste' and 'text' both map to "Text"
  const inputModes = surface === 'design' ? (['text', 'url', 'image'] as const) : (['paste', 'url', 'image'] as const);
  const modeLabel = (m: string) => m === 'paste' || m === 'text' ? 'Text' : m === 'url' ? 'URL' : 'Image';

  return (
    <div
      className={`flex items-center shrink-0 ${inline ? 'gap-1 overflow-x-auto no-scrollbar' : 'gap-2 px-3 py-1.5 flex-nowrap overflow-x-auto no-scrollbar lumora-winctl-safe'}`}
      style={inline
        ? {}
        : {
            background: 'var(--cam-hero-strip)',
            borderBottom: '1px solid var(--cam-gold-leaf)',
            minHeight: 40,
          }}
    >
      {/* Platform identifier — coding tab autopilot mode */}
      {codingPlatform && codingPlatform !== 'none' && (
        <div className="flex items-center gap-1.5 shrink-0 pr-2 mr-0.5" style={{ borderRight: '1px solid var(--cam-strip-icon-border)' }}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#00ea64' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#00ea64' }} />
          </span>
          {codingPlatform === 'hackerrank' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="HackerRank">
              <path d="M4 3L10 12L4 21" stroke="#1ba94c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 3L14 12L20 21" stroke="#1ba94c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="10" y1="12" x2="14" y2="12" stroke="#1ba94c" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          )}
          {codingPlatform === 'leetcode' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="LeetCode">
              <path d="M5 4h9l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#ffa116" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M14 4v5h5M8 13h8" stroke="#ffa116" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {codingPlatform === 'coderpad' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="CoderPad">
              <path d="M17 8H7a5 5 0 000 10h10" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="17" cy="13" r="3" stroke="#6366f1" strokeWidth="2"/>
            </svg>
          )}
          {codingPlatform === 'codesignal' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="CodeSignal">
              <path d="M2 17 Q6 7 12 12 Q18 17 22 7" stroke="#5B6ED4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="12" cy="12" r="2" fill="#5B6ED4"/>
            </svg>
          )}
          {codingPlatform === 'glider' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Glider">
              <path d="M3 20L21 4M21 4H13M21 4V12" stroke="#00b4d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {!['hackerrank', 'leetcode', 'coderpad', 'codesignal', 'glider'].includes(codingPlatform) && (
            <span className="text-[11px] font-semibold" style={{ color: '#00ea64' }}>{codingPlatform}</span>
          )}
        </div>
      )}

      {/* Snap button — click to arm, then click any other window to capture */}
      {showSnap && (
        <button
          onClick={snapState === 'capturing' ? undefined : snapArmed ? () => setSnapArmed(false) : () => setSnapArmed(true)}
          disabled={snapState === 'capturing'}
          data-tip={
            snapArmed ? 'Armed — click another window to capture (click here to cancel)'
            : snapState === 'error' ? 'Snap failed — check Screen Recording permission'
            : 'Click to arm, then click the window you want to capture'
          }
          className={pillBase}
          style={
            snapArmed
              ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', border: '1px solid var(--cam-gold-leaf)' }
              : snapState === 'error'
              ? { background: '#ef4444', color: '#fff' }
              : { background: 'var(--cam-strip-icon-bg)', color: 'var(--cam-strip-text)', border: '1px solid var(--cam-strip-icon-border)' }
          }
        >
          {snapState === 'capturing'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            : snapState === 'error'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            : snapArmed
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
          }
        </button>
      )}

      {/* Pending (OCR in flight) thumbnails */}
      {showSnap && pendingIds.map(pid => (
        <div
          key={pid}
          className="relative w-10 h-7 rounded shrink-0 flex items-center justify-center"
          style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)' }}
        >
          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      ))}

      {/* Completed screenshot thumbnails */}
      {showSnap && screenshots.map((s, i) => (
        <div key={s.id} className="relative group shrink-0" data-tip={s.filePath ? `Click to open • Page ${i + 1}${s.text ? ': ' + s.text.slice(0, 60) + '…' : ''}` : s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
          <img
            src={s.dataUrl}
            alt={`Screenshot ${i + 1}`}
            className={`h-7 w-10 object-cover rounded${s.filePath ? ' cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            style={{ border: '1px solid var(--cam-strip-icon-border)' }}
            onClick={s.filePath ? () => (window as any).camo?.openFile?.(s.filePath) : undefined}
          />
          <span
            className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}
          >
            {i + 1}
          </span>
          <button
            onClick={() => onRemove(s.id)}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex"
            style={{ background: '#ef4444', color: '#fff' }}
            data-tip="Remove screenshot"
          >
            <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ))}

      {/* Screenshot count label when >0 */}
      {showSnap && screenshots.length > 0 && (
        <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
          {screenshots.length} page{screenshots.length > 1 ? 's' : ''}
        </span>
      )}

      {/* Input mode selector — TEXT / URL / IMAGE (coding + design tabs only) */}
      {showInputModeSelector && onInputModeChange && (
        <div
          className="flex items-center gap-0.5 px-0.5 py-0.5 shrink-0"
          style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)', borderRadius: 999 }}
        >
          {inputModes.map(mode => (
            <button
              key={mode}
              onClick={() => onInputModeChange(mode)}
              data-tip={modeLabel(mode)}
              aria-label={modeLabel(mode)}
              className="flex items-center justify-center w-6 h-5 transition-[background-color,color] active:scale-[0.98]"
              style={inputMode === mode
                ? { background: 'var(--cam-chip-active-bg)', color: 'var(--cam-chip-active-text)', borderRadius: 999 }
                : { color: 'var(--cam-strip-text-muted)', borderRadius: 999 }
              }
            >
              {modeIcon(mode)}
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* SHORT / DETAILED — behavioral tab only */}
      {surface === 'behavioral' && (
        <div
          className="flex items-center gap-0.5 shrink-0 h-8 px-1 rounded-lg"
          style={{
            background: 'var(--cam-strip-icon-bg)',
            border: '1px solid var(--cam-strip-icon-border)',
          }}
        >
          {(['short', 'detailed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setAnswerMode(mode)}
              className="h-6 px-2.5 rounded-md transition-[background-color,color]"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: answerMode === mode ? 'var(--cam-chip-active-text)' : 'var(--cam-strip-text)',
                background: answerMode === mode ? 'var(--cam-chip-active-bg)' : 'transparent',
              }}
            >
              {mode === 'short' ? 'Short' : 'Detailed'}
            </button>
          ))}
        </div>
      )}

      {/* Sona panel actions — behavioral only, lifted from AICompanionPanel header */}
      {surface === 'behavioral' && (sonaExport || sonaClear || sonaClose) && (
        <div
          className="flex items-center gap-0.5 shrink-0 h-8 px-1 rounded-lg"
          style={{
            background: 'var(--cam-strip-icon-bg)',
            border: '1px solid var(--cam-strip-icon-border)',
          }}
        >
          <button
            onClick={sonaExport ?? undefined}
            disabled={!sonaHasMessages}
            data-tip="Export session (.md)"
            className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)] disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ color: 'var(--cam-strip-text)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
          <button
            onClick={sonaClear ?? undefined}
            disabled={!sonaHasMessages}
            data-tip="Reset — clear this interview's Q&A"
            aria-label="Reset interview"
            className="flex items-center gap-1 px-2 h-6 rounded-md transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)] disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ color: 'var(--cam-strip-text)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
          </button>
          <button
            onClick={sonaClose ?? undefined}
            data-tip="Close Sona"
            className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_12%,transparent)]"
            style={{ color: 'var(--cam-strip-text)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* AudioCapture + VoiceEnrollment — behavioral only.
          Coding and Design already have Sona; mic controls don't belong there. */}
      {onTranscription && surface === 'behavioral' && (
        <div
          className="flex items-center gap-1.5 px-1.5 h-8 rounded-lg shrink-0"
          style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)' }}
        >
          <AudioCapture key={surface} onTranscription={onTranscription} autoStart={true} active={isTabActive} compact locked={surface === 'behavioral'} />
        </div>
      )}

      {onTranscription && surface === 'behavioral' && <VoiceEnrollment disabled={false} variant="light" />}
      {/* Trailing spacer — pairs with the flex-1 above so the behavioral chip
          cluster sits CENTERED in the strip instead of pinned under the fixed
          top-right window controls (Dock/−/✕). lumora-winctl-safe on the root
          keeps a hard reserve for that cluster on narrow windows. */}
      {surface === 'behavioral' && <div className="flex-1" />}
      {/* Stealth toggle intentionally NOT here — it's a single GLOBAL control in the
          left rail (LumoraIconRail) that applies to the whole window/all tabs. A
          per-page chip was a duplicate that could drift out of sync. */}
    </div>
  );
}
