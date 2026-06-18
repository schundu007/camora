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

  return (
    <>
      <button
        type="button"
        aria-label="Close Cara"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask Cara"
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl shadow-2xl"
        style={{ border: '1px solid rgba(212,160,67,0.2)', background: '#1D2126' }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ color: '#e8c46a', fontSize: 15 }}>✦</span>
          <span className="text-[13px] font-semibold text-white/90">Ask Cara</span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[11px] font-mono text-white/40"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            ⌘K
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="ml-2 flex items-center justify-center rounded-md w-6 h-6 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {lumoraActive ? (
          <p className="px-4 py-6 text-[13px] text-white/50 text-center">
            Cara is quiet during live sessions — Sona has you covered.
          </p>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="What should I study next?"
                disabled={loading}
                className="flex-1 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-white/30 outline-none transition-opacity"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  opacity: loading ? 0.6 : 1,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,67,0.4)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className="rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-opacity disabled:opacity-40"
                style={{ background: 'rgba(212,160,67,0.15)', border: '1px solid rgba(212,160,67,0.30)', color: '#e8c46a' }}
              >
                {loading ? '…' : '↵'}
              </button>
            </div>

            {response && (
              <div
                className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[13px] text-white/85 leading-relaxed">{response.answer}</p>
                {response.action && (
                  <button
                    type="button"
                    onClick={handleNavigate}
                    className="self-start inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                    style={{
                      background: 'rgba(212,160,67,0.12)',
                      border: '1px solid rgba(212,160,67,0.30)',
                      color: '#e8c46a',
                    }}
                  >
                    → {response.action.label}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
