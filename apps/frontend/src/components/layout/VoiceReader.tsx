import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceReaderProps {
  text: string;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
const STORAGE_KEY = 'camora-voice-speed';

function getStoredSpeed(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (SPEED_OPTIONS.includes(parsed as typeof SPEED_OPTIONS[number])) return parsed;
    }
  } catch {}
  return 1;
}

export default function VoiceReader({ text }: VoiceReaderProps) {
  const [status, setStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [speed, setSpeed] = useState(getStoredSpeed);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const synth = window.speechSynthesis;

  const stop = useCallback(() => {
    synth.cancel();
    utteranceRef.current = null;
    setStatus('stopped');
  }, []);

  const play = useCallback(() => {
    if (status === 'paused') {
      synth.resume();
      setStatus('playing');
      return;
    }

    // Stop any existing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.onend = () => {
      utteranceRef.current = null;
      setStatus('stopped');
    };
    utterance.onerror = (e) => {
      if (e.error !== 'canceled') {
        utteranceRef.current = null;
        setStatus('stopped');
      }
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
    setStatus('playing');
  }, [text, speed, status]);

  const pause = useCallback(() => {
    synth.pause();
    setStatus('paused');
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    try {
      localStorage.setItem(STORAGE_KEY, String(newSpeed));
    } catch {}

    // If currently playing, restart with new speed
    if (status === 'playing' || status === 'paused') {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = newSpeed;
      utterance.onend = () => {
        utteranceRef.current = null;
        setStatus('stopped');
      };
      utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
          utteranceRef.current = null;
          setStatus('stopped');
        }
      };
      utteranceRef.current = utterance;
      synth.speak(utterance);
      setStatus('playing');
    }
  }, [text, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synth.cancel();
    };
  }, []);

  // Stop when text changes
  useEffect(() => {
    stop();
  }, [text]);

  if (status === 'stopped') {
    return (
      <button
        onClick={play}
        title="Read aloud"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '28px',
          padding: '0 10px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'none';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Listen
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '3px 4px',
        height: '34px',
      }}
    >
      {/* Playing indicator dot */}
      {status === 'playing' && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            marginLeft: '6px',
            flexShrink: 0,
            animation: 'voice-pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      {status === 'paused' && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--text-muted)',
            marginLeft: '6px',
            flexShrink: 0,
          }}
        />
      )}

      {/* Play/Pause */}
      <button
        onClick={status === 'playing' ? pause : play}
        title={status === 'playing' ? 'Pause' : 'Resume'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--accent-subtle)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'none';
        }}
      >
        {status === 'playing' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Stop */}
      <button
        onClick={stop}
        title="Stop"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--accent-subtle)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'none';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 2px' }} />

      {/* Speed pills */}
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          onClick={() => handleSpeedChange(s)}
          style={{
            height: '22px',
            padding: '0 6px',
            fontSize: '11px',
            fontWeight: speed === s ? 700 : 500,
            color: speed === s ? 'var(--accent)' : 'var(--text-muted)',
            background: speed === s ? 'var(--accent-subtle)' : 'none',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            lineHeight: 1,
          }}
        >
          {s}x
        </button>
      ))}

      <style>{`
        @keyframes voice-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
