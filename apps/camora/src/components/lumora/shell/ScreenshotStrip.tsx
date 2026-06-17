import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/session-store';
import { dialogAlert } from '@/components/shared/Dialog';
import { AudioCapture } from '@/components/lumora/audio/AudioCapture';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

export interface ScreenshotEntry {
  id: string;
  dataUrl: string;
  text: string;
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
}

/** Shared pill chrome — matches the LumoraShellPage tab nav exactly. */
const pillBase = 'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,opacity] active:scale-[0.97]';

export const ScreenshotStrip = ({ surface, screenshots, onSnapped, onRemove, inputMode, onInputModeChange, showInputModeSelector, onTranscription, isTabActive, codingPlatform }: ScreenshotStripProps) => {
  const { token } = useAuth();
  const isStealthActive = useSessionStore(s => s.isStealthActive);
  const setIsStealthActive = useSessionStore(s => s.setIsStealthActive);
  const answerMode = useSessionStore(s => s.answerMode);
  const setAnswerMode = useSessionStore(s => s.setAnswerMode);
  const sonaExport = useSessionStore(s => s.sonaExport);
  const sonaClear = useSessionStore(s => s.sonaClear);
  const sonaClose = useSessionStore(s => s.sonaClose);
  const sonaHasMessages = useSessionStore(s => s.sonaHasMessages);
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  // Bug 3: stale closure ref for onSnapped callback
  const onSnappedRef = useRef(onSnapped);
  useEffect(() => { onSnappedRef.current = onSnapped; }, [onSnapped]);

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
    const camo = (window as any).camo;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    try {
      let dataUrl: string;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (!result?.ok || !result.dataUrl) throw new Error(result?.error || 'Snap failed');
        const blob = await fetch(result.dataUrl).then(r => r.blob());
        dataUrl = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
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
      const tempEntry: ScreenshotEntry = { id, dataUrl, text: '' };
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
        onSnappedRef.current({ ...tempEntry, text });
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

  const showSnap = surface !== 'behavioral';

  // Input mode labels — 'paste' and 'text' both map to "Text"
  const inputModes = surface === 'design' ? (['text', 'url', 'image'] as const) : (['paste', 'url', 'image'] as const);
  const modeLabel = (m: string) => m === 'paste' || m === 'text' ? 'Text' : m === 'url' ? 'URL' : 'Image';

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar"
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
        minHeight: 36,
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
          {!['hackerrank', 'leetcode', 'coderpad'].includes(codingPlatform) && (
            <span className="text-[11px] font-semibold" style={{ color: '#00ea64' }}>{codingPlatform}</span>
          )}
        </div>
      )}

      {/* Snap button */}
      {showSnap && (
        <button
          onClick={handleSnap}
          disabled={snapState === 'capturing'}
          title={snapState === 'error' ? 'Snap failed — check Screen Recording permission' : 'Snap screen (append to problem)'}
          className={pillBase}
          style={snapState === 'error'
            ? { background: '#ef4444', color: '#fff' }
            : { background: 'var(--cam-strip-icon-bg)', color: 'var(--cam-strip-text)', border: '1px solid var(--cam-strip-icon-border)' }
          }
        >
          {snapState === 'capturing'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            : snapState === 'error'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
          }
          {snapState === 'error' ? 'Failed' : snapState === 'capturing' ? 'Capturing…' : 'Snap'}
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
        <div key={s.id} className="relative group shrink-0" title={s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
          <img
            src={s.dataUrl}
            alt={`Screenshot ${i + 1}`}
            className="h-7 w-10 object-cover rounded"
            style={{ border: '1px solid var(--cam-strip-icon-border)' }}
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
            title="Remove screenshot"
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
              className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color] active:scale-[0.98]"
              style={inputMode === mode
                ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', borderRadius: 999 }
                : { color: 'var(--cam-strip-text-muted)', borderRadius: 999 }
              }
            >
              {modeLabel(mode)}
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* SHORT / DETAILED — behavioral tab only */}
      {surface === 'behavioral' && (
        <div
          className="flex items-center gap-0.5 shrink-0"
          style={{
            padding: '2px 3px',
            background: 'rgba(3,19,46,0.88)',
            border: '1px solid rgba(201,162,39,0.50)',
            borderRadius: 8,
          }}
        >
          {(['short', 'detailed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setAnswerMode(mode)}
              className="px-2.5 py-0.5 transition-[background-color,color]"
              style={{
                borderRadius: 6,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: answerMode === mode ? '#020617' : 'var(--cam-strip-text)',
                background: answerMode === mode ? 'var(--cam-gold-leaf)' : 'transparent',
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
          className="flex items-center gap-0.5 shrink-0"
          style={{
            padding: '2px 3px',
            background: 'rgba(3,19,46,0.88)',
            border: '1px solid rgba(201,162,39,0.50)',
            borderRadius: 8,
          }}
        >
          <button
            onClick={sonaExport ?? undefined}
            disabled={!sonaHasMessages}
            title="Export session (.md)"
            className="p-1.5 rounded-md transition-colors hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ color: 'var(--cam-strip-text)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
          <button
            onClick={sonaClear ?? undefined}
            disabled={!sonaHasMessages}
            title="Clear chat history"
            className="p-1.5 rounded-md transition-colors hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ color: 'var(--cam-strip-text)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
          <button
            onClick={sonaClose ?? undefined}
            title="Close Sona"
            className="p-1.5 rounded-md transition-colors hover:bg-white/10"
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
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
          style={{ background: 'var(--cam-strip-icon-bg)', border: '1px solid var(--cam-strip-icon-border)' }}
        >
          <AudioCapture key={surface} onTranscription={onTranscription} autoStart={true} active={isTabActive} compact />
        </div>
      )}

      {onTranscription && surface === 'behavioral' && <VoiceEnrollment disabled={false} variant="light" />}

      {/* Stealth — desktop only, all tabs (global tool) */}
      {!!(window as any).camo?.isDesktop && (
        <button
          onClick={handleStealthMode}
          title={isStealthActive ? 'Stealth ON — mouse tracking blocked app-wide' : 'Block mouse tracking (app-wide)'}
          className={pillBase}
          style={isStealthActive
            ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }
            : { background: 'var(--cam-strip-icon-bg)', color: 'var(--cam-strip-text-muted)', border: '1px solid var(--cam-strip-icon-border)' }
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
  );
}
