/* eslint-disable react-hooks/static-components */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import mcqData from '../../data/capra/mcq-problems.json';

const CAPRA_API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface McqProblemMeta {
  id: string;
  title: string;
  domain: string;
  difficulty: string;
  tags: string[];
  durationSeconds: number;
}

interface GeneratedQuestion {
  id: string;
  question: string;
  options: { letter: string; text: string }[];
  correctLetter: string;
  explanation: string;
}

type AnswerState = 'unanswered' | 'checked';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  easy:   'var(--success)',
  medium: 'var(--warning)',
  hard:   'var(--danger)',
};

const LETTERS = ['A', 'B', 'C', 'D'];

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct     = total === 0 ? 0 : Math.round((score / total) * 100);
  const radius  = 52;
  const circ    = 2 * Math.PI * radius;
  const dash    = (pct / 100) * circ;
  const color   = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"/>
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{score}/{total}</span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function QuestionSkeleton() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 28px' }}>
      <div style={{ width: '75%', height: 22, background: 'var(--bg-elevated)', borderRadius: 6, marginBottom: 28, opacity: 0.35 }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            height: 56, borderRadius: 8, background: 'var(--bg-elevated)',
            opacity: 0.22 + i * 0.03,
          }}/>
        ))}
      </div>
    </div>
  );
}

// ─── Domain category groupings ───────────────────────────────────────────────

const DOMAIN_CATS: { label: string; value: string; domains: string[] }[] = [
  { label: 'All Topics', value: '', domains: [] },
  { label: 'DevOps', value: 'devops', domains: ['docker','kubernetes','ansible','terraform','linux','bash','git','jenkins','helm','prometheus','grafana','elastic stack','chef','puppet','nagios','vault'] },
  { label: 'Cloud', value: 'cloud', domains: ['aws','azure','gcp'] },
  { label: 'Languages', value: 'lang', domains: ['python','javascript','java','c#','c++','go','c','ruby','rust','kotlin','swift','typescript','scala','r','php','perl','flutter','dart'] },
  { label: 'Frontend', value: 'frontend', domains: ['angular 2+','angularjs','react','vue.js','html','css'] },
  { label: 'Data', value: 'data', domains: ['data science','sql','apache spark','machine learning','elasticsearch','cassandra / nosql','mongodb','redis','dataset analysis'] },
  { label: 'Backend', value: 'backend', domains: ['django','node.js','spring','express','rest api','cyber security','android'] },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizSessionPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { token, isLoading: authLoading } = useAuth();

  const domainParam   = searchParams.get('domain') || '';
  // Support comma-separated domains: ?domain=Docker,Kubernetes,Ansible
  const domainFilters = domainParam
    ? domainParam.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
    : [];
  const diffFilter   = (searchParams.get('difficulty') || '').toLowerCase() || null;
  const countParam   = Math.min(20, Math.max(1, parseInt(searchParams.get('count') || '10', 10) || 10));

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const [questions,     setQuestions]     = useState<GeneratedQuestion[]>([]);
  const [metaPool,      setMetaPool]      = useState<McqProblemMeta[]>([]);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [answers,       setAnswers]       = useState<Map<string, string>>(new Map());
  const [answerStates,  setAnswerStates]  = useState<Map<string, AnswerState>>(new Map());
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [showResults,   setShowResults]   = useState(false);

  // ── Build pool from local JSON ─────────────────────────────────────────────
  function buildPool(): McqProblemMeta[] {
    const all = Object.values(
      (mcqData as { problems: Record<string, McqProblemMeta> }).problems
    );
    return all.filter(p => {
      if (domainFilters.length > 0 && !domainFilters.includes(p.domain.toLowerCase())) return false;
      if (diffFilter && p.difficulty.toLowerCase() !== diffFilter) return false;
      return true;
    });
  }

  function pickRandom(pool: McqProblemMeta[], n: number): McqProblemMeta[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  // ── Fetch from backend ─────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async (pool: McqProblemMeta[]) => {
    setLoading(true);
    setFetchError(null);
    setQuestions([]);
    setAnswers(new Map());
    setAnswerStates(new Map());
    setCurrentIndex(0);
    setShowResults(false);

    const selected = pickRandom(pool, countParam);
    const ids      = selected.map(p => p.id);

    try {
      // /api/v1/mcq is mounted behind `authenticate` on ascend-backend, so the
      // request MUST carry credentials or every batch 401s. Bearer is the
      // primary path; credentials:'include' lets the cariara_sso cookie serve
      // as the fallback the middleware also accepts.
      const res = await fetch(`${CAPRA_API}/api/v1/mcq/batch`, {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids }),
      });

      if (res.status === 401) throw new Error('Your session expired. Please sign in again to load questions.');
      if (!res.ok) throw new Error(`Server error (${res.status})`);

      const data = await res.json();
      const generated: GeneratedQuestion[] = data.questions ?? [];

      if (generated.length === 0) {
        setFetchError('No questions were generated. Please try again.');
      } else {
        setQuestions(generated);
      }
    } catch (e: unknown) {
      setFetchError((e as Error).message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [countParam, domainParam, diffFilter, token]);

  // ── Mount / filter change ───────────────────────────────────────────────────
  // Wait for AuthContext to finish hydrating. Firing on mount raced the /me
  // round-trip that mints the bearer token, so the batch went out unauthenticated
  // and came back 401 before the token ever landed.
  useEffect(() => {
    if (authLoading) return;
    const pool = buildPool();
    setMetaPool(pool);
    fetchQuestions(pool);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainParam, diffFilter, countParam, authLoading, token]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function selectOption(qId: string, letter: string) {
    const state = answerStates.get(qId);
    if (state === 'checked') return; // locked after check
    setAnswers(prev => new Map(prev).set(qId, letter));
  }

  function checkAnswer(qId: string) {
    if (!answers.has(qId)) return;
    setAnswerStates(prev => new Map(prev).set(qId, 'checked'));
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setShowResults(true);
    }
  }

  function handleRetry() {
    fetchQuestions(metaPool);
  }

  function handleNewQuiz(catValue: string, diff: string | null) {
    const params = new URLSearchParams();
    params.set('count', String(countParam));
    if (catValue) {
      const cat = DOMAIN_CATS.find(c => c.value === catValue);
      if (cat && cat.domains.length > 0) params.set('domain', cat.domains.join(','));
    }
    if (diff) params.set('difficulty', diff);
    navigate(`/capra/quiz/session?${params.toString()}`);
  }

  // Derive active category from current domain filters
  const activeCat = (() => {
    if (domainFilters.length === 0) return '';
    for (const cat of DOMAIN_CATS) {
      if (cat.domains.length > 0 && cat.domains.some(d => domainFilters.includes(d))) return cat.value;
    }
    return '';
  })();

  // ── Derived data ─────────────────────────────────────────────────────────────
  const q       = questions[currentIndex];
  const checked = q ? answerStates.get(q.id) === 'checked' : false;
  const picked  = q ? answers.get(q.id) : undefined;
  const isLast  = currentIndex === questions.length - 1;

  // Results
  const correctCount = questions.filter(qn => {
    const userPick = answers.get(qn.id);
    return userPick === qn.correctLetter;
  }).length;

  // Domain breakdown for results
  const domainScores: Record<string, { correct: number; total: number }> = {};
  questions.forEach(qn => {
    const meta = metaPool.find(p => p.id === qn.id);
    const dom  = meta?.domain ?? 'Unknown';
    if (!domainScores[dom]) domainScores[dom] = { correct: 0, total: 0 };
    domainScores[dom].total++;
    if (answers.get(qn.id) === qn.correctLetter) domainScores[dom].correct++;
  });
  const multiDomain = Object.keys(domainScores).length > 1;

  // ── Shared filter-chip styles (used in all screens) ─────────────────────────
  const chipBase: React.CSSProperties = {
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    letterSpacing: '0.03em', border: '1px solid transparent',
    cursor: 'pointer', whiteSpace: 'nowrap' as const, transition: 'all 0.12s',
  };
  const chipActive: React.CSSProperties = {
    ...chipBase, background: 'var(--cam-gold-leaf, var(--cam-gold-leaf))', color: '#000',
    border: '1px solid var(--cam-gold-leaf, var(--cam-gold-leaf))',
  };
  const chipInactive: React.CSSProperties = {
    ...chipBase, background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  };
  const DIFF_OPTS = ['easy', 'medium', 'hard'];

  const FilterBar = () => (
    <div style={{
      borderBottom: '1px solid var(--border)', background: 'var(--bg-app)',
      padding: '10px 24px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 2 }}>Topic</span>
        {DOMAIN_CATS.map(cat => (
          <button key={cat.value} style={activeCat === cat.value ? chipActive : chipInactive} onClick={() => handleNewQuiz(cat.value, diffFilter)}>{cat.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 2 }}>Level</span>
        <button style={!diffFilter ? chipActive : chipInactive} onClick={() => handleNewQuiz(activeCat, null)}>All</button>
        {DIFF_OPTS.map(d => (
          <button key={d} style={diffFilter === d ? chipActive : chipInactive} onClick={() => handleNewQuiz(activeCat, d)}>{d.charAt(0).toUpperCase() + d.slice(1)}</button>
        ))}
      </div>
    </div>
  );

  // ── Header bar ───────────────────────────────────────────────────────────────
  const HeaderBar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-app)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Left: progress label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {!showResults && !loading && !fetchError && (
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Question{' '}
            <span style={{ color: 'var(--cam-gold-leaf, var(--cam-gold-leaf))' }}>{currentIndex + 1}</span>
            {' '}of{' '}
            <span>{questions.length || countParam}</span>
          </span>
        )}
        {showResults && (
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Results</span>
        )}

        {/* Domain chip */}
        {domainFilters.length > 0 && (
          <span style={{
            padding: '2px 10px', borderRadius: 20,
            background: 'rgba(0,71,171,0.18)', border: '1px solid rgba(0,71,171,0.3)',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
          }}>
            {domainFilters.length === 1 ? domainFilters[0] : `${domainFilters.length} domains`}
          </span>
        )}

        {/* Difficulty badge */}
        {diffFilter && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: DIFF_COLOR[diffFilter] ?? 'var(--text-muted)',
          }}>
            {diffFilter.charAt(0).toUpperCase() + diffFilter.slice(1)}
          </span>
        )}
      </div>

      {/* Right: progress bar + exit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {!showResults && questions.length > 0 && (
          <div style={{
            width: 120, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'var(--cam-gold-leaf, var(--cam-gold-leaf))',
              width: `${((currentIndex + (checked ? 1 : 0)) / questions.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}/>
          </div>
        )}
        <button
          onClick={() => navigate('/capra/library')}
          style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          Exit
        </button>
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: 'var(--bg-app)', minHeight: '100%' }}>
        <HeaderBar />
        <FilterBar />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
          <div style={{
            fontSize: 13, color: 'var(--text-muted)', marginBottom: 28,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid var(--cam-gold-leaf, var(--cam-gold-leaf))',
              borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}/>
            Generating questions…
          </div>
          <QuestionSkeleton />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div style={{ background: 'var(--bg-app)', minHeight: '100%' }}>
        <HeaderBar />
        <FilterBar />
        <div style={{
          maxWidth: 480, margin: '80px auto', padding: '0 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(219,0,0,0.12)',
            border: '1px solid rgba(219,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Failed to load questions
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
            {fetchError}
          </div>
          <button
            onClick={handleRetry}
            style={{
              padding: '9px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: 'var(--cam-gold-leaf, var(--cam-gold-leaf))', color: '#000',
              border: 'none', cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Results screen ───────────────────────────────────────────────────────────
  if (showResults) {
    const pct    = Math.round((correctCount / questions.length) * 100);
    const label  = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep practicing!';

    return (
      <div style={{ background: 'var(--bg-app)', minHeight: '100%' }}>
        <HeaderBar />
        <FilterBar />

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>

          {/* Score card */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '36px 40px',
            display: 'flex', alignItems: 'center', gap: 40,
            marginBottom: 32,
          }}>
            <ScoreRing score={correctCount} total={questions.length} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {correctCount} / {questions.length} correct
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {pct}% accuracy
              </div>
            </div>
          </div>

          {/* Domain breakdown (only if mixed domains) */}
          {multiDomain && (
            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px', marginBottom: 28,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16,
              }}>
                Domain Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(domainScores).map(([dom, s]) => {
                  const domPct = Math.round((s.correct / s.total) * 100);
                  const barColor = domPct >= 70 ? 'var(--success)' : domPct >= 40 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={dom}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 12, marginBottom: 4,
                      }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{dom}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{s.correct}/{s.total}</span>
                      </div>
                      <div style={{
                        height: 5, borderRadius: 3,
                        background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: barColor,
                          width: `${domPct}%`,
                          transition: 'width 0.5s ease',
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleRetry}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: 'var(--cam-gold-leaf, var(--cam-gold-leaf))', color: '#000',
                border: 'none', cursor: 'pointer',
              }}
            >
              Retry Quiz
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                params.set('count', String(countParam));
                if (domainParam) params.set('domain', domainParam);
                if (diffFilter) params.set('difficulty', diffFilter);
                navigate(`/capra/quiz/session?${params.toString()}`);
              }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              New Quiz
            </button>
          </div>

          {/* Per-question review */}
          <div style={{ marginTop: 40 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
              color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Question Review
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map((qn, i) => {
                const userPick = answers.get(qn.id);
                const wasRight = userPick === qn.correctLetter;
                const skipped  = !userPick;
                return (
                  <div key={qn.id} style={{
                    padding: '14px 18px', borderRadius: 10,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{
                        flexShrink: 0, width: 22, height: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        background: skipped ? 'rgba(255,255,255,0.1)' : wasRight ? 'rgba(43,181,52,0.15)' : 'rgba(219,0,0,0.15)',
                        border: `1.5px solid ${skipped ? 'rgba(255,255,255,0.15)' : wasRight ? 'var(--success)' : 'var(--danger)'}`,
                        fontSize: 12, fontWeight: 700,
                        color: skipped ? 'var(--text-muted)' : wasRight ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                          marginBottom: 4, lineHeight: 1.4,
                        }}>
                          {qn.question.length > 100 ? qn.question.slice(0, 100) + '…' : qn.question}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {skipped
                            ? 'Skipped'
                            : wasRight
                              ? `Correct — ${userPick}`
                              : `Wrong — picked ${userPick}, correct ${qn.correctLetter}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Question card ────────────────────────────────────────────────────────────
  if (!q) return null;

  const optionStyle = (letter: string): React.CSSProperties => {
    const isSelected = picked === letter;
    const isCorrect  = checked && letter === q.correctLetter;
    const isWrong    = checked && isSelected && letter !== q.correctLetter;

    let borderColor  = 'var(--border)';
    let bgColor      = 'var(--bg-elevated)';
    let badgeBg      = 'rgba(255,255,255,0.07)';
    let badgeColor   = 'var(--text-secondary)';

    if (isCorrect) {
      borderColor = 'var(--success)';
      bgColor     = 'rgba(43,181,52,0.08)';
      badgeBg     = 'rgba(43,181,52,0.2)';
      badgeColor  = 'var(--success)';
    } else if (isWrong) {
      borderColor = 'var(--danger)';
      bgColor     = 'rgba(219,0,0,0.08)';
      badgeBg     = 'rgba(219,0,0,0.2)';
      badgeColor  = 'var(--danger)';
    } else if (isSelected) {
      borderColor = 'var(--cam-gold-leaf, var(--cam-gold-leaf))';
      bgColor     = 'rgba(212,175,55,0.08)';
      badgeBg     = 'var(--cam-gold-leaf, var(--cam-gold-leaf))';
      badgeColor  = '#000';
    }

    return {
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 18px', borderRadius: 8, textAlign: 'left',
      border: `1.5px solid ${borderColor}`,
      background: bgColor,
      color: 'var(--text-primary)',
      cursor: checked ? 'default' : 'pointer',
      transition: 'all 0.12s',
      width: '100%',
    };
  };

  const badgeStyle = (letter: string): React.CSSProperties => {
    const isSelected = picked === letter;
    const isCorrect  = checked && letter === q.correctLetter;
    const isWrong    = checked && isSelected && letter !== q.correctLetter;

    let bg    = 'rgba(255,255,255,0.07)';
    let color = 'var(--text-secondary)';

    if (isCorrect) { bg = 'rgba(43,181,52,0.2)';  color = 'var(--success)'; }
    else if (isWrong)    { bg = 'rgba(219,0,0,0.2)'; color = 'var(--danger)'; }
    else if (isSelected) { bg = 'var(--cam-gold-leaf, var(--cam-gold-leaf))'; color = '#000'; }

    return {
      flexShrink: 0, width: 26, height: 26,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', background: bg, color,
      fontSize: 12, fontWeight: 700,
    };
  };

  const qMeta = metaPool.find(p => p.id === q.id);

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100%', color: 'var(--text-primary)' }}>
      <HeaderBar />
      <FilterBar />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Domain + difficulty line */}
        {qMeta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{
              padding: '2px 10px', borderRadius: 4,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
            }}>
              MCQ
            </span>
            {qMeta.domain && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{qMeta.domain}</span>
            )}
            {qMeta.difficulty && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: DIFF_COLOR[qMeta.difficulty.toLowerCase()] ?? 'var(--text-muted)',
              }}>
                {qMeta.difficulty.charAt(0).toUpperCase() + qMeta.difficulty.slice(1)}
              </span>
            )}
          </div>
        )}

        {/* Question text */}
        <h2 style={{
          margin: '0 0 28px',
          fontSize: 18, fontWeight: 700, lineHeight: 1.5,
          letterSpacing: '-0.2px', color: 'var(--text-primary)',
        }}>
          {q.question}
        </h2>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {(q.options.length > 0 ? q.options : LETTERS.map(l => ({ letter: l, text: '' }))).map(opt => (
            <button
              key={opt.letter}
              onClick={() => selectOption(q.id, opt.letter)}
              disabled={checked}
              style={optionStyle(opt.letter)}
            >
              <span style={badgeStyle(opt.letter)}>{opt.letter}</span>
              <span style={{ fontSize: 14, lineHeight: 1.6 }}>{opt.text}</span>
            </button>
          ))}
        </div>

        {/* Check / Next controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {!checked && (
            <button
              onClick={() => checkAnswer(q.id)}
              disabled={!picked}
              style={{
                padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: picked ? 'var(--cam-gold-leaf, var(--cam-gold-leaf))' : 'rgba(255,255,255,0.06)',
                color: picked ? '#000' : 'var(--text-muted)',
                border: 'none', cursor: picked ? 'pointer' : 'not-allowed',
                transition: 'all 0.12s',
              }}
            >
              Check Answer
            </button>
          )}

          {checked && (
            <button
              onClick={goNext}
              style={{
                padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: 'var(--cam-gold-leaf, var(--cam-gold-leaf))', color: '#000',
                border: 'none', cursor: 'pointer',
              }}
            >
              {isLast ? 'See Results' : 'Next Question →'}
            </button>
          )}

          {/* Skip — always available before check */}
          {!checked && (
            <button
              onClick={goNext}
              style={{
                padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'transparent', color: 'var(--text-muted)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              {isLast ? 'Skip & Finish' : 'Skip'}
            </button>
          )}
        </div>

        {/* Explanation panel (after check) */}
        {checked && (
          <div style={{
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
              {/* Correct/Wrong badge */}
              <span style={{
                marginLeft: 4,
                padding: '1px 8px', borderRadius: 10,
                background: picked === q.correctLetter ? 'rgba(43,181,52,0.15)' : 'rgba(219,0,0,0.15)',
                color: picked === q.correctLetter ? 'var(--success)' : 'var(--danger)',
                fontSize: 12, fontWeight: 700, letterSpacing: 0,
              }}>
                {picked === q.correctLetter ? 'Correct' : `Wrong — Answer: ${q.correctLetter}`}
              </span>
            </div>

            <div style={{
              fontSize: 14.5, lineHeight: 1.8, color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
            }}>
              {q.explanation || 'No explanation provided.'}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
