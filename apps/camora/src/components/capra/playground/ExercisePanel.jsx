import { useState } from 'react';
import { getStoredToken } from '@/utils/tokenStore';

const API_URL = import.meta.env.VITE_PLAYGROUND_API_URL || import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3010';

async function validateExercise(sessionId, exerciseId) {
  const token = getStoredToken();
  const res = await fetch(`${API_URL}/api/v1/playground/sessions/${sessionId}/validate-exercise`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ exerciseId }),
  });
  return res.json();
}

export default function ExercisePanel({ sessionId, exercises, onProgressUpdate }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [localPassed, setLocalPassed] = useState({});

  if (!exercises?.length) return null;

  const ex = exercises[activeIdx];
  const isPassed = localPassed[ex.id] || ex.completed;

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      const data = await validateExercise(sessionId, ex.id);
      setResult(data);
      if (data.pass) {
        setLocalPassed(prev => ({ ...prev, [ex.id]: true }));
        if (onProgressUpdate) onProgressUpdate(ex.id);
        if (activeIdx < exercises.length - 1) {
          setTimeout(() => { setActiveIdx(i => i + 1); setResult(null); }, 1200);
        }
      }
    } catch (err) {
      setResult({ pass: false, message: err.message });
    }
    setChecking(false);
  };

  const totalDone = exercises.filter(e => localPassed[e.id] || e.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.07)', width: 280, flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13 }}>⎈</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Exercises
        </span>
        <span style={{ fontSize: 12, color: totalDone === exercises.length ? 'var(--success)' : 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
          {totalDone}/{exercises.length}
        </span>
      </div>

      {/* Exercise list */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
        {exercises.map((e, i) => {
          const done = localPassed[e.id] || e.completed;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => { setActiveIdx(i); setResult(null); }}
              style={{
                width: 24, height: 24, borderRadius: 5, fontSize: 12, fontWeight: 700,
                border: `1px solid ${activeIdx === i ? '#0047AB' : done ? 'rgba(43,181,52,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: activeIdx === i ? 'rgba(0,71,171,0.25)' : done ? 'rgba(43,181,52,0.12)' : 'rgba(255,255,255,0.04)',
                color: done ? 'var(--success)' : activeIdx === i ? '#7ab3ff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}
            >
              {done ? '✓' : i + 1}
            </button>
          );
        })}
      </div>

      {/* Active exercise */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{ex.title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginBottom: 10 }}>{ex.prompt}</div>
        {ex.hint && (
          <div style={{ fontSize: 12, color: 'rgba(0,171,255,0.7)', fontFamily: 'var(--font-mono)', marginBottom: 10, padding: '6px 8px', borderRadius: 5, background: 'rgba(0,71,171,0.1)', border: '1px solid rgba(0,71,171,0.2)' }}>
            {ex.hint}
          </div>
        )}
        {result && (
          <div style={{
            fontSize: 12, padding: '7px 10px', borderRadius: 6, marginBottom: 10,
            background: result.pass ? 'rgba(43,181,52,0.12)' : 'rgba(219,0,0,0.1)',
            border: `1px solid ${result.pass ? 'rgba(43,181,52,0.3)' : 'rgba(219,0,0,0.3)'}`,
            color: result.pass ? 'var(--success)' : 'var(--danger)',
          }}>
            {result.pass ? '✓ ' : '✗ '}{result.message}
          </div>
        )}
      </div>

      {/* Check button */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          type="button"
          disabled={checking || isPassed}
          onClick={handleCheck}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 700,
            background: isPassed ? 'rgba(43,181,52,0.2)' : checking ? 'rgba(0,71,171,0.4)' : '#0047AB',
            color: isPassed ? 'var(--success)' : '#fff',
            border: `1px solid ${isPassed ? 'rgba(43,181,52,0.4)' : 'rgba(0,71,171,0.5)'}`,
            cursor: isPassed || checking ? 'default' : 'pointer',
          }}
        >
          {isPassed ? '✓ Passed' : checking ? 'Checking…' : 'Check'}
        </button>
      </div>
    </div>
  );
}
