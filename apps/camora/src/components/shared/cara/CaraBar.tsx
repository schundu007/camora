import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { caraRegistry } from '@/lib/cara-registry';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

interface CaraAction {
  type: 'navigate';
  path: string;
  label: string;
}

interface CaraResponse {
  answer: string;
  action: CaraAction | null;
}

const VALID_PATHS = new Set([
  '/capra/prepare', '/capra/practice', '/playground', '/capra/mcq',
  '/capra/resume', '/capra/company-prep', '/capra/plan', '/capra/library',
  '/capra/achievements', '/capra/hr-library', '/lumora', '/pricing',
  '/profile', '/docs', '/jobs',
  '/capra/prepare/coding', '/capra/prepare/system-design', '/capra/prepare/behavioral',
  '/capra/prepare/devops', '/capra/prepare/linux', '/capra/prepare/sre',
  '/capra/prepare/cloud', '/capra/prepare/networking', '/capra/prepare/low-level',
  '/capra/prepare/mlops', '/capra/prepare/aiops', '/capra/prepare/observability',
  '/capra/prepare/platform', '/capra/prepare/projects', '/capra/prepare/challenges',
]);

type LocalIntent = { answer: string; action: CaraAction };

const LOCAL_INTENTS: Array<{ pattern: RegExp; result: LocalIntent }> = [
  { pattern: /\b(linux|shell script)\b/i,          result: { answer: 'Opening Linux topics.', action: { type: 'navigate', path: '/capra/prepare/linux', label: 'Open Linux' } } },
  { pattern: /\bdevops\b/i,                         result: { answer: 'Opening DevOps topics.', action: { type: 'navigate', path: '/capra/prepare/devops', label: 'Open DevOps' } } },
  { pattern: /\b(dsa|coding|algorithm|data str)/i,  result: { answer: 'Opening DSA topics.', action: { type: 'navigate', path: '/capra/prepare/coding', label: 'Open DSA' } } },
  { pattern: /\bsystem.?design\b/i,                 result: { answer: 'Opening System Design topics.', action: { type: 'navigate', path: '/capra/prepare/system-design', label: 'Open System Design' } } },
  { pattern: /\bbehavioral\b/i,                     result: { answer: 'Opening Behavioral topics.', action: { type: 'navigate', path: '/capra/prepare/behavioral', label: 'Open Behavioral' } } },
  { pattern: /\bsre\b/i,                            result: { answer: 'Opening SRE topics.', action: { type: 'navigate', path: '/capra/prepare/sre', label: 'Open SRE' } } },
  { pattern: /\bcloud\b/i,                          result: { answer: 'Opening Cloud topics.', action: { type: 'navigate', path: '/capra/prepare/cloud', label: 'Open Cloud' } } },
  { pattern: /\bnetwork/i,                          result: { answer: 'Opening Networking topics.', action: { type: 'navigate', path: '/capra/prepare/networking', label: 'Open Networking' } } },
  { pattern: /\bmlops\b/i,                          result: { answer: 'Opening MLOps topics.', action: { type: 'navigate', path: '/capra/prepare/mlops', label: 'Open MLOps' } } },
  { pattern: /\b(practice|problems?)\b/i,           result: { answer: 'Opening Practice problems.', action: { type: 'navigate', path: '/capra/practice', label: 'Go to Practice' } } },
  { pattern: /\b(lumora|live interview|attend)\b/i, result: { answer: 'Opening Lumora live interview assistant.', action: { type: 'navigate', path: '/lumora', label: 'Open Lumora' } } },
  { pattern: /\bpricing\b/i,                        result: { answer: 'Opening pricing plans.', action: { type: 'navigate', path: '/pricing', label: 'View Pricing' } } },
  { pattern: /\bdocs?\b/i,                          result: { answer: 'Opening documentation.', action: { type: 'navigate', path: '/docs', label: 'Open Docs' } } },
  { pattern: /\b(playground|run code)\b/i,          result: { answer: 'Opening the code playground.', action: { type: 'navigate', path: '/playground', label: 'Open Playground' } } },
  { pattern: /\bresume\b/i,                         result: { answer: 'Opening Resume analyzer.', action: { type: 'navigate', path: '/capra/prepare/resume', label: 'Open Resume' } } },
];

function matchLocalIntent(msg: string): LocalIntent | null {
  const isNav = /\b(go|take|open|show|navigate|bring|find|jump|switch|get|view|see)\b/i.test(msg)
    || /^(linux|devops|dsa|sre|cloud|mlops|coding|network|behavioral)\b/i.test(msg);
  if (!isNav) return null;
  for (const { pattern, result } of LOCAL_INTENTS) {
    if (pattern.test(msg)) return result;
  }
  return null;
}

export default function CaraBar() {
  const [open, setOpen] = useState(false);
  const [lumoraActive, setLumoraActive] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CaraResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { token } = useAuth();

  useEffect(() => {
    return caraRegistry.register(
      () => { setOpen(true); setResponse(null); setInput(''); },
      () => setOpen(false),
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLumoraActive(caraRegistry.isLumoraActive()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const local = matchLocalIntent(msg);
    if (local) { setResponse(local); return; }

    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/v1/cara/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ message: msg, currentPath: pathname }),
      });
      const data: CaraResponse = await res.json();
      if (data.action && !VALID_PATHS.has(data.action.path)) data.action = null;
      setResponse(data);
    } catch {
      setResponse({ answer: "I'm having trouble right now — try again in a moment.", action: null });
    } finally {
      setLoading(false);
    }
  };

  const renderAnswer = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  const handleNavigate = () => {
    if (!response?.action) return;
    navigate(response.action.path);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask Cara"
        style={{
          position: 'fixed',
          left: '50%',
          top: '22%',
          zIndex: 51,
          width: 'calc(100% - 32px)',
          maxWidth: 520,
          transform: 'translateX(-50%)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-xl)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden',
        }}
      >
        {/* Header — cam-hero-strip + gold-leaf seam (UserDropdown grammar) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--cam-hero-strip)',
            borderBottom: '2px solid var(--cam-gold-leaf)',
          }}
        >
          <span style={{ color: 'var(--cam-gold-leaf-lt)', fontSize: 14, lineHeight: 1 }}>✦</span>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--cam-strip-heading)',
          }}>
            Ask Cara
          </span>
          <div style={{ flex: 1 }} />
          <kbd style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--cam-strip-text-muted)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 5,
            padding: '1px 6px',
            lineHeight: '18px',
          }}>
            ⌘K
          </kbd>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--cam-strip-text-muted)',
              transition: 'color 120ms, background 120ms',
              padding: 0,
              marginLeft: 2,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
              e.currentTarget.style.color = 'var(--cam-strip-heading)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--cam-strip-text-muted)';
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M1.5 1.5L9.5 9.5M9.5 1.5L1.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {lumoraActive ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Cara is quiet during live sessions — Sona has you covered.
            </p>
          </div>
        ) : (
          <div style={{ padding: '14px 14px 16px' }}>
            {/* Input row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Ask anything about Camora..."
                disabled={loading}
                aria-label="Your question for Cara"
                style={{
                  flex: 1,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'border-color 150ms, opacity 150ms',
                  opacity: loading ? 0.55 : 1,
                  minWidth: 0,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                aria-label="Ask"
                style={{
                  flexShrink: 0,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '-0.01em',
                  cursor: loading || !input.trim() ? 'default' : 'pointer',
                  opacity: loading || !input.trim() ? 0.4 : 1,
                  transition: 'opacity 150ms, background 150ms',
                }}
                onMouseEnter={e => {
                  if (!loading && input.trim()) e.currentTarget.style.background = 'var(--accent-hover)';
                }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {loading ? '···' : 'Ask'}
              </button>
            </div>

            {/* Answer */}
            {response && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 0' }} />
                <div className="cara-answer-in" style={{ paddingTop: 12 }}>
                  <p style={{
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    margin: 0,
                  }}>
                    {renderAnswer(response.answer)}
                  </p>
                  {response.action && (
                    <button
                      type="button"
                      onClick={handleNavigate}
                      style={{
                        marginTop: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 30%, transparent)',
                        background: 'var(--cam-gold-leaf-50)',
                        color: 'var(--cam-gold-leaf-lt)',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.01em',
                        cursor: 'pointer',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-gold-leaf) 16%, transparent)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--cam-gold-leaf-50)';
                      }}
                    >
                      {response.action.label}
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
