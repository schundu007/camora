import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Option { letter: string; text: string }

interface ParsedQuestion {
  name: string;
  body: string;
  options: Option[];
  isMultiSelect: boolean;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseQuestion(raw: string): ParsedQuestion {
  // Strip markdown bold/headers for parsing, keep original for display
  const clean = raw.replace(/\*\*/g, '').replace(/^#+\s*/gm, '');
  const lines  = clean.split('\n');

  const name = raw.split('\n').find(l => l.trim())
    ?.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() || 'Question';

  const options: Option[] = [];
  const bodyLines: string[] = [];
  let optionsStarted = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Option line: "A) ..." or "A) ..."
    const m = trimmed.match(/^([A-E])\)\s+([\s\S]+)/);
    if (m) {
      options.push({ letter: m[1], text: m[2].trim() });
      optionsStarted = true;
      continue;
    }
    // Skip options section header and markdown section labels
    if (/^Options(\s*\(.*?\))?:/i.test(trimmed)) { optionsStarted = true; continue; }
    if (/^(Scenario|Question|Description|Options|Constraints|Input Format|Output Format):/i.test(trimmed)) continue;
    if (!optionsStarted) bodyLines.push(line);
  }

  // Remove the first line (name) from body and clean
  const body = bodyLines.slice(1).join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').trim();
  const isMultiSelect = raw.toLowerCase().includes('choose all that apply')
    || raw.toLowerCase().includes('select all that apply');

  return { name, body, options, isMultiSelect };
}

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function streamExplanation(
  prompt: string,
  questionName: string,
  token: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  abortSignal: AbortSignal
) {
  try {
    const res = await fetch(`${CAPRA_API}/api/solve/followup`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question: prompt, problem: questionName }),
      signal: abortSignal,
    });

    if (!res.ok) { onError(`Server error (${res.status})`); return; }
    const reader = res.body?.getReader();
    if (!reader) { onError('No stream'); return; }

    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const ev = JSON.parse(data);
          // Handle various chunk formats the backend may emit
          const chunk = ev.chunk ?? ev.text ?? ev.token ?? ev.content
            ?? ev.result?.text ?? ev.result?.answer ?? '';
          if (chunk) onChunk(chunk);
        } catch {
          // Raw text line fallback
          if (data && data !== '[DONE]') onChunk(data);
        }
      }
    }
    onDone();
  } catch (e: unknown) {
    if ((e as Error).name !== 'AbortError') onError((e as Error).message);
  }
}

// ─── MCQ Page ─────────────────────────────────────────────────────────────────

export default function MCQPage() {
  const [searchParams]            = useSearchParams();
  const navigate                  = useNavigate();
  const { token }                 = useAuth();
  const abortRef                  = useRef<AbortController | null>(null);

  const raw  = decodeURIComponent(searchParams.get('problem') || '');
  const meta = searchParams.get('meta') || '';  // JSON with type/difficulty/skills
  const parsed                    = parseQuestion(raw);

  // Parse optional meta passed as JSON query param
  let difficulty: string | null = null;
  let skills: string[] = [];
  let type: string = 'mcq';
  try {
    const m = JSON.parse(decodeURIComponent(meta));
    difficulty = m.difficulty ?? null;
    skills     = m.skills    ?? [];
    type       = m.type      ?? 'mcq';
  } catch { /* meta not provided */ }

  const [selected,    setSelected]    = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [streaming,   setStreaming]   = useState(false);
  const [error,       setError]       = useState('');
  const explanationRef                = useRef<HTMLDivElement>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (explanation && explanationRef.current) {
      explanationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [explanation.length > 0]);

  function pickOption(opt: Option) {
    if (streaming) return;
    setSelected(opt.letter);
    setExplanation('');
    setError('');
    setStreaming(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const fullQuestion = parsed.body + '\n\n' +
      parsed.options.map(o => `${o.letter}) ${o.text}`).join('\n');

    const prompt = [
      `Multiple-choice question for interview preparation:`,
      ``,
      `${parsed.name}`,
      ``,
      fullQuestion,
      ``,
      `The candidate selected option ${opt.letter}: "${opt.text}"`,
      ``,
      `Is this correct? Identify the correct answer, explain the reasoning clearly, ` +
      `and note what makes the other options right or wrong. Be concise and direct.`,
    ].join('\n');

    streamExplanation(
      prompt, parsed.name, token,
      (chunk) => setExplanation(prev => prev + chunk),
      ()      => setStreaming(false),
      (msg)   => { setError(msg); setStreaming(false); },
      abortRef.current.signal,
    );
  }

  const DIFF_COLOR: Record<string, string> = {
    Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444',
  };

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100%', color: 'var(--text-primary)', fontFamily: 'var(--font-sans, sans-serif)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 28px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => navigate('/capra/library')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 12L4 7l5-5"/>
            </svg>
            Library
          </button>

          {/* type badge */}
          <span style={{
            padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)', letterSpacing: '0.04em',
          }}>
            {type === 'multiple_mcq' ? 'MULTI-MCQ' : 'MCQ'}
          </span>

          {difficulty && (
            <span style={{ fontSize: 13, fontWeight: 600, color: DIFF_COLOR[difficulty] ?? 'var(--text-muted)' }}>
              {difficulty}
            </span>
          )}

          {skills.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {skills.slice(0, 3).join(' · ')}
            </span>
          )}
        </div>

        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.2px', lineHeight: 1.3 }}>
          {parsed.name}
        </h1>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 820, padding: '28px 28px 60px' }}>

        {/* Question text */}
        {parsed.body && (
          <div style={{
            fontSize: 14.5, lineHeight: 1.75, color: 'var(--text-secondary)',
            marginBottom: 28, whiteSpace: 'pre-wrap',
          }}>
            {parsed.body}
          </div>
        )}

        {/* Multi-select hint */}
        {parsed.isMultiSelect && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontStyle: 'italic' }}>
            Select all that apply — click any option to see the explanation.
          </p>
        )}

        {/* Options */}
        {parsed.options.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {parsed.options.map(opt => {
              const isSelected = selected === opt.letter;
              return (
                <button
                  key={opt.letter}
                  onClick={() => pickOption(opt)}
                  disabled={streaming}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 18px', borderRadius: 8, textAlign: 'left',
                    border: `1.5px solid ${isSelected ? 'var(--cam-gold-leaf, #d4af37)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(212,175,55,0.08)' : 'var(--bg-elevated)',
                    color: 'var(--text-primary)', cursor: streaming ? 'not-allowed' : 'pointer',
                    opacity: streaming && !isSelected ? 0.6 : 1,
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--cam-gold-leaf, #d4af37)' : 'rgba(255,255,255,0.07)',
                    color: isSelected ? '#000' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {opt.letter}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.6 }}>{opt.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* No options parsed — show raw body and a prompt to type an answer */
          <div style={{
            padding: 20, borderRadius: 8, background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', marginBottom: 28,
            fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            {raw}
          </div>
        )}

        {/* Explanation panel */}
        {(explanation || streaming || error) && (
          <div ref={explanationRef} style={{
            borderTop: '1px solid var(--border)', paddingTop: 24,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 14, fontSize: 12, fontWeight: 700,
              color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5h.01" strokeLinecap="round"/>
              </svg>
              Explanation
              {streaming && (
                <span style={{ fontSize: 11, color: 'var(--cam-gold-leaf, #d4af37)', fontWeight: 400 }}>
                  · generating…
                </span>
              )}
            </div>

            {error ? (
              <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
            ) : (
              <div style={{
                fontSize: 14.5, lineHeight: 1.8, color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}>
                {explanation}
                {streaming && (
                  <span style={{
                    display: 'inline-block', width: 8, height: 14,
                    background: 'var(--cam-gold-leaf, #d4af37)',
                    marginLeft: 2, borderRadius: 1,
                    animation: 'blink 0.9s step-start infinite',
                  }}/>
                )}
              </div>
            )}
          </div>
        )}

        {/* Try another */}
        {selected && !streaming && !error && (
          <div style={{ marginTop: 32, display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setSelected(null); setExplanation(''); }}
              style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              Try another option
            </button>
            <button
              onClick={() => navigate('/capra/library')}
              style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                border: '1px solid var(--cam-gold-leaf, #d4af37)',
                background: 'transparent', color: 'var(--cam-gold-leaf, #d4af37)',
              }}
            >
              Back to Library
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
