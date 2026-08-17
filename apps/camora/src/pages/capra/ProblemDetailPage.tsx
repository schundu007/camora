import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import csharp from 'react-syntax-highlighter/dist/esm/languages/hljs/csharp';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import Chip from '@/components/shared/ui/Chip';
import { Icon } from '@/components/shared/Icons.jsx';
import { getProblem, CapraAPIError, type LcProblemDetail } from '@/lib/capra-api';
import { renderProblemHtml, statementBody } from '@/lib/capra/problem-html';

SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('sql', sql);

/** langSlug → (display label, highlighter language) */
const LANGS: Record<string, [string, string]> = {
  python3:    ['Python',     'python'],
  java:       ['Java',       'java'],
  cpp:        ['C++',        'cpp'],
  c:          ['C',          'cpp'],
  golang:     ['Go',         'go'],
  rust:       ['Rust',       'rust'],
  javascript: ['JavaScript', 'javascript'],
  typescript: ['TypeScript', 'typescript'],
  csharp:     ['C#',         'csharp'],
  mysql:      ['SQL',        'sql'],
  php:        ['PHP',        'javascript'],
  swift:      ['Swift',      'rust'],
  kotlin:     ['Kotlin',     'java'],
  ruby:       ['Ruby',       'python'],
  scala:      ['Scala',      'java'],
};
const LANG_ORDER = Object.keys(LANGS);

const DIFF_COLOR: Record<string, string> = {
  Easy:   'var(--success, #10b981)',
  Medium: '#eab308',
  Hard:   '#ef4444',
};

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-display)',
        }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function ProblemDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<LcProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; locked: boolean } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [approachIdx, setApproachIdx] = useState(0);
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setApproachIdx(0);
    setLang(null);

    getProblem(slug)
      .then(data => { if (!cancelled) setProblem(data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const locked = err instanceof CapraAPIError && err.status === 403;
        setError({
          message: locked
            ? 'This is a LeetCode Premium problem. Upgrade your plan to read the full statement and editorial.'
            : err instanceof CapraAPIError && err.status === 404
              ? 'We do not have this problem in the library yet.'
              : 'Could not load this problem. Please try again.',
          locked,
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  const approaches = problem?.editorial ?? [];
  const approach = approaches[approachIdx];

  /** Languages the selected approach actually ships, in a stable display order. */
  const approachLangs = useMemo(() => {
    if (!approach?.code) return [];
    return LANG_ORDER.filter(l => approach.code[l]);
  }, [approach]);

  const activeLang = lang && approach?.code[lang] ? lang : approachLangs[0] ?? null;

  /** Hand the solver the real statement — the bug this page exists to close. */
  function solveWithSona() {
    if (!problem) return;
    const parts = [`${problem.lc_id ? `${problem.lc_id}. ` : ''}${problem.title}`];
    const body = statementBody(problem.content ?? '');
    const text = (body || problem.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) parts.push(text);
    for (const [i, ex] of (problem.examples ?? []).entries()) {
      parts.push(`Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ''}`);
    }
    if (problem.constraints?.length) parts.push(`Constraints:\n${problem.constraints.map(c => `- ${c}`).join('\n')}`);
    if (problem.follow_up) parts.push(`Follow up: ${problem.follow_up}`);

    const starter = problem.code_snippets?.find(s => s.langSlug === 'python3')?.code
      ?? problem.code_snippets?.[0]?.code ?? '';
    navigate(`/lumora/coding?problem=${encodeURIComponent(parts.join('\n\n'))}`
      + (starter ? `&starter_code=${encodeURIComponent(starter)}` : ''));
  }

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', background: 'var(--bg-app)', minHeight: '100%' }}>
        Loading problem…
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div style={{ padding: 40, background: 'var(--bg-app)', minHeight: '100%', color: 'var(--text-primary)' }}>
        <Link to="/capra/library?tab=coding" style={{ color: 'var(--cam-gold-leaf)', fontSize: 13 }}>← Back to Problem Library</Link>
        <div style={{ marginTop: 24, maxWidth: 520 }}>
          <Icon name={error?.locked ? 'lock' : 'alert'} size={28} style={{ opacity: 0.5, marginBottom: 12 }} />
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
            {error?.locked ? 'Premium problem' : 'Problem unavailable'}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{error?.message}</p>
          {error?.locked && (
            <Link to="/pricing" style={{
              display: 'inline-block', marginTop: 16, padding: '9px 18px', borderRadius: 8,
              background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', fontWeight: 700, fontSize: 13,
            }}>Upgrade plan</Link>
          )}
        </div>
      </div>
    );
  }

  const statement = statementBody(problem.content ?? '');
  // Examples alone are still something to solve against; only a row with neither
  // a statement nor examples is genuinely empty.
  const hasStatement = Boolean(statement.trim()) || Boolean(problem.examples?.length);

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100%', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 28px 60px' }}>

        <Link to="/capra/library?tab=coding" style={{ color: 'var(--cam-gold-leaf)', fontSize: 13 }}>
          ← Back to Problem Library
        </Link>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{ margin: '16px 0 26px' }}>
          <h1 style={{ fontSize: 25, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 12, lineHeight: 1.25 }}>
            {problem.lc_id ? `${problem.lc_id}. ` : ''}{problem.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
              color: DIFF_COLOR[problem.difficulty], border: `1px solid ${DIFF_COLOR[problem.difficulty]}55`,
              background: `${DIFF_COLOR[problem.difficulty]}18`,
            }}>{problem.difficulty}</span>

            {problem.is_premium && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: 'var(--cam-gold-leaf)', border: '1px solid var(--cam-gold-leaf)', opacity: 0.9 }}>
                Premium
              </span>
            )}
            {problem.acceptance_rate != null && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {(problem.acceptance_rate * 100).toFixed(1)}% acceptance
              </span>
            )}
            {problem.topic_tags?.map(t => <Chip key={t.slug}>{t.name}</Chip>)}
          </div>

          {problem.content_source === 'generated' && (
            <div style={{
              marginTop: 14, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.55,
              background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.35)', color: 'var(--text-secondary)',
            }}>
              <strong style={{ color: '#eab308' }}>AI-authored statement.</strong>{' '}
              No published statement exists for this problem, so this one was generated from its title and tags.
              Treat it as practice material, not the original wording.
            </div>
          )}

          {/* No statement means the solver would receive nothing but the title —
            * the original bug. Say so plainly instead of handing Sona four words
            * and letting it invent a question. */}
          {hasStatement ? (
            <button
              onClick={solveWithSona}
              style={{
                marginTop: 18, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)', fontWeight: 700, fontSize: 13.5,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <Icon name="code" size={16} /> Solve with Sona
            </button>
          ) : (
            <div style={{
              marginTop: 18, padding: '12px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.6,
              background: 'var(--bg-elevated, rgba(255,255,255,0.04))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.10))', color: 'var(--text-secondary)',
            }}>
              We don’t have the statement for this problem yet, so there is nothing to solve
              against — asking Sona from the title alone would just produce a different problem.
              {' '}
              <Link to="/capra/library?tab=coding" style={{ color: 'var(--cam-gold-leaf)' }}>
                Browse other problems
              </Link>.
            </div>
          )}
        </header>

        {/* ── Statement ──────────────────────────────────────────────────── */}
        {statement && (
          <Section title="Problem">
            <div style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--text-primary)' }}>
              {renderProblemHtml(statement)}
            </div>
          </Section>
        )}

        {/* ── Examples ───────────────────────────────────────────────────── */}
        {!!problem.examples?.length && (
          <Section title="Examples">
            {problem.examples.map((ex, i) => (
              <div key={i} style={{
                marginBottom: 12, padding: 14, borderRadius: 10,
                background: 'var(--bg-elevated, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cam-gold-leaf)', marginBottom: 9 }}>
                  Example {i + 1}
                </div>
                {([['Input', ex.input], ['Output', ex.output], ['Explanation', ex.explanation]] as const).map(([label, value]) =>
                  value ? (
                    <div key={label} style={{ marginBottom: 7, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 84, flexShrink: 0, paddingTop: 1 }}>{label}</span>
                      <pre style={{
                        margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1,
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12.5, lineHeight: 1.6,
                      }}>{value}</pre>
                    </div>
                  ) : null
                )}
              </div>
            ))}
          </Section>
        )}

        {/* ── Constraints ────────────────────────────────────────────────── */}
        {!!problem.constraints?.length && (
          <Section title="Constraints">
            <ul style={{ paddingLeft: 20, listStyle: 'disc', fontSize: 13.5, lineHeight: 1.85, color: 'var(--text-secondary)' }}>
              {problem.constraints.map((c, i) => (
                <li key={i}><code style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12.5 }}>{c}</code></li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Follow up ──────────────────────────────────────────────────── */}
        {problem.follow_up && (
          <Section title="Follow up">
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{problem.follow_up}</p>
          </Section>
        )}

        {/* ── Hints ──────────────────────────────────────────────────────── */}
        {!!problem.hints?.length && (
          <Section
            title="Hints"
            right={
              <button
                onClick={() => setShowHints(h => !h)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cam-gold-leaf)', fontSize: 12, fontWeight: 600 }}
              >
                {showHints ? 'Hide' : `Reveal ${problem.hints.length}`}
              </button>
            }
          >
            {showHints ? (
              <ol style={{ paddingLeft: 20, listStyle: 'decimal', fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-secondary)' }}>
                {problem.hints.map((h, i) => <li key={i} style={{ marginBottom: 6 }}>{renderProblemHtml(h)}</li>)}
              </ol>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', opacity: 0.7 }}>
                Hidden so you can attempt it first.
              </p>
            )}
          </Section>
        )}

        {/* ── Editorial ──────────────────────────────────────────────────── */}
        {!!approaches.length && approach && (
          <Section title="Approach">
            {approaches.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {approaches.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => { setApproachIdx(i); setLang(null); }}
                    style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${i === approachIdx ? 'var(--cam-gold-leaf)' : 'var(--border-subtle, rgba(255,255,255,0.14))'}`,
                      background: i === approachIdx ? 'var(--cam-gold-leaf)' : 'transparent',
                      color: i === approachIdx ? 'var(--cam-primary-dk)' : 'var(--text-secondary)',
                    }}
                  >{a.title}</button>
                ))}
              </div>
            )}

            {approaches.length === 1 && (
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{approach.title}</div>
            )}

            {approach.explanation && (
              <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 14 }}>
                {approach.explanation}
              </p>
            )}

            {activeLang && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {approachLangs.map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                        border: 'none', background: l === activeLang ? 'rgba(255,255,255,0.10)' : 'transparent',
                        color: l === activeLang ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >{LANGS[l][0]}</button>
                  ))}
                </div>
                <SyntaxHighlighter
                  language={LANGS[activeLang][1]}
                  style={atomOneDark}
                  customStyle={{ borderRadius: 10, fontSize: 12.5, margin: 0, padding: 14 }}
                >
                  {approach.code[activeLang]}
                </SyntaxHighlighter>
              </>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
