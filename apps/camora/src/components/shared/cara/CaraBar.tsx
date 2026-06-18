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
  '/capra/prepare', '/capra/practice', '/capra/playground', '/capra/mcq',
  '/capra/resume', '/capra/company-prep', '/capra/plan', '/capra/library',
  '/capra/achievements', '/capra/hr-library', '/lumora', '/pricing',
  '/profile', '/docs', '/jobs',
]);

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

  const handleNavigate = () => {
    if (!response?.action) return;
    navigate(response.action.path);
    setOpen(false);
  };

  if (!open) return null;

  const hasResponse = response !== null;

  return (
    <>
      {/* Overlay — plain dark, no blur */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.72)',
          cursor: 'default',
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
          top: '20%',
          zIndex: 51,
          width: '100%',
          maxWidth: 540,
          transform: 'translateX(-50%)',
          background: 'var(--bg-app)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-xl)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden',
        }}
      >
        {/* Input bar — Spotlight-style: icon + input + send + close in one row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
          }}
        >
          {/* Cara spark icon */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            style={{ flexShrink: 0, color: 'var(--accent)' }}
            aria-hidden="true"
          >
            <path
              d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3.4 3.4l1.4 1.4M10.2 10.2l1.4 1.4M10.2 4.8l1.4-1.4M3.4 11.6l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>

          {/* Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Ask Camora anything..."
            disabled={loading}
            aria-label="Ask Cara"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              opacity: loading ? 0.55 : 1,
              transition: 'opacity 120ms',
              minWidth: 0,
            }}
          />

          {/* Send button — icon only */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            aria-label="Submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              background: 'none',
              border: 'none',
              borderRadius: 6,
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              color: input.trim() && !loading ? 'var(--accent)' : 'var(--text-dimmed)',
              opacity: loading ? 0.45 : 1,
              transition: 'color 120ms, opacity 120ms',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path
                d="M2 7.5h11M8.5 3.5l5 4-5 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'none',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              color: 'var(--text-dimmed)',
              transition: 'color 120ms',
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dimmed)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path
                d="M1.5 1.5L9.5 9.5M9.5 1.5L1.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Lumora active state */}
        {lumoraActive && (
          <div style={{ padding: '12px 16px 16px', textAlign: 'center' }}>
            <p style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              lineHeight: 1.55,
              margin: 0,
            }}>
              Cara is quiet during live sessions — Sona has you covered.
            </p>
          </div>
        )}

        {/* Separator — only when answer is present */}
        {!lumoraActive && hasResponse && (
          <div style={{ height: 1, background: 'var(--border)' }} />
        )}

        {/* Answer section */}
        {!lumoraActive && hasResponse && (
          <div
            className="cara-answer-in"
            style={{ padding: '12px 16px 16px' }}
          >
            <p style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              margin: 0,
            }}>
              {response!.answer}
            </p>

            {response!.action && (
              <button
                type="button"
                onClick={handleNavigate}
                style={{
                  marginTop: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 20,
                  border: '1px solid color-mix(in oklab, var(--cam-gold-leaf) 28%, transparent)',
                  background: 'var(--cam-gold-leaf-50)',
                  color: 'var(--cam-gold-leaf-lt)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'color-mix(in oklab, var(--cam-gold-leaf) 15%, transparent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--cam-gold-leaf-50)';
                }}
              >
                {response!.action.label}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path
                    d="M2 5h6M5.5 2.5l3 2.5-3 2.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Placeholder style for input — can't be done inline */}
      <style>{`
        [aria-label="Ask Cara"]::placeholder {
          color: var(--text-dimmed);
        }
      `}</style>
    </>
  );
}
