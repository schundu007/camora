import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { SqlProblem } from '@/data/capra/sqlProblems';
import { SQL_PROBLEMS, SQL_CATEGORIES } from '@/data/capra/sqlProblems';
// Load sql.js from CDN — bypasses Vite bundling entirely
const SQL_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3';
const loadSqlJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).initSqlJs) { resolve((window as any).initSqlJs); return; }
    const script = document.createElement('script');
    script.src = `${SQL_CDN}/sql-wasm.js`;
    script.onload = () => resolve((window as any).initSqlJs);
    script.onerror = () => reject(new Error('Failed to load sql.js'));
    document.head.appendChild(script);
  });
};

const SharedCodeEditor = lazy(
  () => import('@/components/shared/code/SharedCodeEditor')
);

// sql.js types (not provided by the package)
interface SqlJsDatabase {
  run(sql: string): void;
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  close(): void;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SQLPlaygroundProps {
  onClose?: () => void;
}

interface QueryResult {
  columns: string[];
  values: (string | number | null)[][];
}

type OutputTab = 'output' | 'expected';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Hard: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const c = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Easy;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${c.bg} ${c.text} ${c.border}`}
    >
      {difficulty}
    </span>
  );
}

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  return String(v).trim().toLowerCase();
}

function rowToKey(row: (string | number | null)[]): string {
  return row.map(normalizeValue).join('|');
}

function rowsMatch(
  actual: (string | number | null)[][],
  expected: (string | number | null)[][]
): boolean {
  if (actual.length !== expected.length) return false;
  // Sort both by stringified row to ignore ORDER BY differences
  const sortedActual = [...actual].sort((a, b) => rowToKey(a).localeCompare(rowToKey(b)));
  const sortedExpected = [...expected].sort((a, b) => rowToKey(a).localeCompare(rowToKey(b)));
  for (let i = 0; i < sortedActual.length; i++) {
    if (sortedActual[i].length !== sortedExpected[i].length) return false;
    for (let j = 0; j < sortedActual[i].length; j++) {
      if (normalizeValue(sortedActual[i][j]) !== normalizeValue(sortedExpected[i][j])) return false;
    }
  }
  return true;
}

function columnsMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i].trim().toLowerCase() !== expected[i].trim().toLowerCase()) return false;
  }
  return true;
}

// ─── Result Table ───────────────────────────────────────────────────────────

function ResultTable({
  columns,
  rows,
  maxRows = 50,
}: {
  columns: string[];
  rows: (string | number | null)[][];
  maxRows?: number;
}) {
  const displayRows = rows.slice(0, maxRows);
  return (
    <div className="overflow-auto max-h-[260px] rounded-lg border border-slate-200">
      <table className="w-full text-sm border-collapse" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <thead>
          <tr className="bg-slate-50 sticky top-0">
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 border-b border-slate-100 text-slate-700 whitespace-nowrap">
                  {cell === null || cell === undefined ? (
                    <span className="text-slate-400 italic">NULL</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400 italic">
                No rows returned
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <div className="px-3 py-1.5 text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}

// ─── Schema Display ─────────────────────────────────────────────────────────

function SchemaTable({ table }: { table: SqlProblem['tables'][0] }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {table.name}
        </span>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm border-collapse" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr className="bg-slate-50">
              {table.columns.map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1 border-b border-slate-100 text-slate-700 whitespace-nowrap">
                    {cell === null || cell === undefined ? (
                      <span className="text-slate-400 italic">NULL</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SQLPlayground({ onClose }: SQLPlaygroundProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [db, setDb] = useState<SqlJsDatabase | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<number>(SQL_PROBLEMS[0]?.id ?? 1);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>('output');
  const [solved, setSolved] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('sql_playground_solved');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [submitResult, setSubmitResult] = useState<'correct' | 'wrong' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(SQL_CATEGORIES[0]?.id ?? 'basic-joins');
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const dbRef = useRef<SqlJsDatabase | null>(null);
  const problem = SQL_PROBLEMS.find((p) => p.id === selectedProblemId) || SQL_PROBLEMS[0];

  // ── Persist solved state ────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem('sql_playground_solved', JSON.stringify([...solved]));
    } catch { /* ignore */ }
  }, [solved]);

  // ── Initialize sql.js WASM ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    loadSqlJs().then((initFn: any) => {
      return initFn({ locateFile: () => `${SQL_CDN}/sql-wasm.wasm` });
    }).then((SQL: { Database: new () => SqlJsDatabase }) => {
      if (cancelled) return;
      const database = new SQL.Database();
      dbRef.current = database;
      setDb(database);
      setDbReady(true);
    }).catch((err: Error) => {
      console.error('sql.js init failed:', err);
    });

    return () => {
      cancelled = true;
      dbRef.current?.close();
    };
  }, []);

  // ── Initialize problem database tables ──────────────────────────────────
  const initProblemDb = useCallback(
    (p: SqlProblem) => {
      if (!db) return;
      // Collect existing table names and drop them
      try {
        const tables = db.exec(
          "SELECT name FROM sqlite_master WHERE type='table';"
        );
        if (tables.length > 0) {
          for (const row of tables[0].values) {
            db.run(`DROP TABLE IF EXISTS "${row[0]}";`);
          }
        }
      } catch { /* ignore */ }
      // Create and populate tables for this problem
      for (const t of p.tables) {
        db.run(t.createSql);
        db.run(t.insertSql);
      }
    },
    [db]
  );

  // Re-init DB when problem or db changes
  useEffect(() => {
    if (dbReady && problem) {
      initProblemDb(problem);
      setCode(problem.starterCode);
      setOutput(null);
      setError(null);
      setSubmitResult(null);
      setShowHints(false);
      setShowSolution(false);
    }
  }, [dbReady, selectedProblemId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Run query ───────────────────────────────────────────────────────────
  const runQuery = useCallback(() => {
    if (!db || !code.trim()) return;
    // Reset DB tables before each run so mutations (DELETE/UPDATE) don't persist
    initProblemDb(problem);
    try {
      const results = db.exec(code);
      if (results.length > 0) {
        // Take the last result (for multi-statement queries like DELETE + SELECT)
        const last = results[results.length - 1];
        setOutput({ columns: last.columns, values: last.values as (string | number | null)[][] });
      } else {
        setOutput({ columns: [], values: [] });
      }
      setError(null);
      setOutputTab('output');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOutput(null);
    }
    setSubmitResult(null);
  }, [db, code, problem, initProblemDb]);

  // ── Submit (check correctness) ──────────────────────────────────────────
  const submitQuery = useCallback(() => {
    if (!db || !code.trim()) return;
    // Reset DB tables
    initProblemDb(problem);
    try {
      const results = db.exec(code);
      if (results.length > 0) {
        const last = results[results.length - 1];
        const qr: QueryResult = { columns: last.columns, values: last.values as (string | number | null)[][] };
        setOutput(qr);
        setError(null);
        const colOk = columnsMatch(qr.columns, problem.expectedOutput.columns);
        const rowOk = rowsMatch(qr.values, problem.expectedOutput.rows);
        if (colOk && rowOk) {
          setSubmitResult('correct');
          setSolved((prev) => new Set([...prev, problem.id]));
        } else {
          setSubmitResult('wrong');
        }
      } else {
        setOutput({ columns: [], values: [] });
        setSubmitResult('wrong');
        setError(null);
      }
      setOutputTab('output');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setOutput(null);
      setSubmitResult('wrong');
    }
  }, [db, code, problem, initProblemDb]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const currentIndex = SQL_PROBLEMS.findIndex((p) => p.id === selectedProblemId);
  const goPrev = () => {
    if (currentIndex > 0) setSelectedProblemId(SQL_PROBLEMS[currentIndex - 1].id);
  };
  const goNext = () => {
    if (currentIndex < SQL_PROBLEMS.length - 1) setSelectedProblemId(SQL_PROBLEMS[currentIndex + 1].id);
  };

  // ── Keyboard shortcut: Ctrl/Cmd+Enter to run ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runQuery();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runQuery]);

  // ── Grouped problems by category ───────────────────────────────────────
  const grouped = SQL_CATEGORIES.map((cat) => ({
    ...cat,
    problems: SQL_PROBLEMS.filter((p) => p.category === cat.id),
  }));

  // ── Category problems ───────────────────────────────────────────────────
  const categoryProblems = SQL_PROBLEMS.filter((p) => p.category === selectedCategory);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* ── Tab Row 1: Categories ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        {SQL_CATEGORIES.map((cat) => {
          const catProblems = SQL_PROBLEMS.filter((p) => p.category === cat.id);
          const catSolved = catProblems.filter((p) => solved.has(p.id)).length;
          return (
            <button key={cat.id} onClick={() => {
              setSelectedCategory(cat.id);
              const first = SQL_PROBLEMS.find((p) => p.category === cat.id);
              if (first) setSelectedProblemId(first.id);
            }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5"
              style={selectedCategory === cat.id
                ? { background: '#F97316', color: '#fff' }
                : { color: 'var(--text-secondary)' }
              }>
              {cat.label}
              <span className="text-[9px] opacity-70">{catSolved}/{catProblems.length}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Row 2: Problems in selected category ──────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        {categoryProblems.map((p) => (
          <button key={p.id} onClick={() => setSelectedProblemId(p.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap"
            style={p.id === selectedProblemId
              ? { background: 'var(--accent-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
              : { color: 'var(--text-muted)' }
            }>
            {solved.has(p.id) ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>
            ) : (
              <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />
            )}
            {p.id}. {p.title.length > 20 ? p.title.slice(0, 20) + '...' : p.title}
            <DifficultyBadge difficulty={p.difficulty} />
          </button>
        ))}
      </div>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
        {/* ── Top: Problem Description ─────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-slate-200 overflow-y-auto" style={{ maxHeight: '36%' }}>
          <div className="p-5">
            {/* Title + navigation */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-colors"
                title="Previous problem"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2
                className="text-lg font-bold text-slate-900 flex-1"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                {problem.id}. {problem.title}
              </h2>
              <DifficultyBadge difficulty={problem.difficulty} />
              <button
                onClick={goNext}
                disabled={currentIndex === SQL_PROBLEMS.length - 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 transition-colors"
                title="Next problem"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {solved.has(problem.id) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Solved
                </span>
              )}
            </div>

            {/* Description */}
            <p
              className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-line"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              {problem.description}
            </p>

            {/* Table schemas */}
            <div className="mb-3">
              {problem.tables.map((t, i) => (
                <SchemaTable key={i} table={t} />
              ))}
            </div>

            {/* Expected output preview */}
            <div className="mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Expected Output
              </div>
              <ResultTable columns={problem.expectedOutput.columns} rows={problem.expectedOutput.rows} />
            </div>

            {/* Hints */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowHints(!showHints)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {showHints ? 'Hide Hints' : 'Show Hints'}
              </button>
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showSolution ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
                {showSolution ? 'Hide Solution' : 'Show Solution'}
              </button>
            </div>
            {showHints && (
              <div className="mt-2 space-y-1">
                {problem.hints.map((hint, i) => (
                  <div
                    key={i}
                    className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2"
                  >
                    <span className="text-amber-500 font-bold mt-px">{i + 1}.</span>
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            )}
            {showSolution && (
              <div className="mt-2">
                <pre
                  className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {problem.solution}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* ── Middle: Code Editor ──────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-slate-200" style={{ height: '220px' }}>
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SQL Editor</span>
              <span className="text-[10px] text-slate-500">
                Ctrl+Enter to run
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCode(problem.starterCode);
                  setOutput(null);
                  setError(null);
                  setSubmitResult(null);
                }}
                className="px-2.5 py-1 rounded text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                title="Reset to starter code"
              >
                Reset
              </button>
              <button
                onClick={runQuery}
                disabled={!dbReady}
                className="px-3 py-1 rounded text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run
              </button>
              <button
                onClick={submitQuery}
                disabled={!dbReady}
                className="px-3 py-1 rounded text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="h-full bg-[#1e1e1e] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-slate-500 text-xs">Loading editor...</span>
                </div>
              </div>
            }
          >
            <SharedCodeEditor
              language="sql"
              code={code}
              onChange={setCode}
              theme="vs-dark"
              fontSize={13}
              height="180px"
              showLineNumbers
            />
          </Suspense>
        </div>

        {/* ── Bottom: Output / Expected ────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col bg-white">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50/50">
            <button
              onClick={() => setOutputTab('output')}
              className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wide transition-colors ${
                outputTab === 'output'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setOutputTab('expected')}
              className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wide transition-colors ${
                outputTab === 'expected'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Expected
            </button>

            {/* Submit result badge */}
            {submitResult && (
              <div className="ml-auto flex items-center gap-1.5">
                {submitResult === 'correct' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    Accepted
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Wrong Answer
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-4">
            {outputTab === 'output' ? (
              <>
                {!dbReady && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    Loading SQL engine...
                  </div>
                )}
                {dbReady && !output && !error && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-40">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span className="text-sm">Run your query to see results</span>
                    <span className="text-xs mt-1 text-slate-300">Ctrl+Enter or click Run</span>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">Error</div>
                    <pre
                      className="text-sm text-red-700 whitespace-pre-wrap"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {error}
                    </pre>
                  </div>
                )}
                {output && (
                  <ResultTable columns={output.columns} rows={output.values} />
                )}
              </>
            ) : (
              <ResultTable columns={problem.expectedOutput.columns} rows={problem.expectedOutput.rows} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SQLPlayground;
