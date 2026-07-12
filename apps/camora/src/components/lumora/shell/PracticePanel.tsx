/**
 * Practice Mode — "Sona quizzes you".
 *
 * Fenzo-inspired active recall for the LIVE product: instead of Sona answering
 * the interviewer, Sona asks YOU a question, you answer, and it scores the
 * answer against your résumé with specific, actionable feedback + a stronger
 * model answer. Retrieval practice + a coach in one loop — the antidote to
 * passively reading prep.
 *
 * Questions come from your saved prep kit (behavioral / HR sections) merged
 * with a built-in bank, so it's useful even before you generate a kit. Grading
 * reuses the existing streaming inference pipeline with a coaching directive —
 * no new backend surface.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { prepAPI, profileAPI } from '@/lib/api-client';
import { streamResponse } from '@/lib/sse-client';

interface PracticeQuestion {
  id: string;
  prompt: string;
  category: 'behavioral' | 'system-design' | 'hr' | 'general';
  source: 'prep' | 'bank';
}

const BANK: Omit<PracticeQuestion, 'id' | 'source'>[] = [
  { prompt: 'Tell me about a time you led a project through significant ambiguity. How did you create clarity?', category: 'behavioral' },
  { prompt: 'Describe a technical decision you made that you later regretted. What did you learn?', category: 'behavioral' },
  { prompt: 'Tell me about a conflict with a teammate and how you resolved it while keeping the relationship intact.', category: 'behavioral' },
  { prompt: 'Walk me through the most complex system you have designed. What were the hardest tradeoffs?', category: 'system-design' },
  { prompt: 'Tell me about a time you improved reliability or performance. How did you measure the impact?', category: 'behavioral' },
  { prompt: 'Why do you want to leave your current role, and what are you looking for next?', category: 'hr' },
  { prompt: 'Describe a time you had to influence a decision without formal authority.', category: 'behavioral' },
  { prompt: 'Tell me about a time you disagreed with your manager. What happened?', category: 'behavioral' },
  { prompt: 'How do you prioritize when everything is "urgent" and you cannot do it all?', category: 'behavioral' },
  { prompt: 'Design a URL shortener. Start from requirements and talk me through the tradeoffs.', category: 'system-design' },
];

/** Defensively pull {question} strings out of a generated prep section. */
function extractPrepQuestions(section: any, category: PracticeQuestion['category']): PracticeQuestion[] {
  if (!section || typeof section !== 'object') return [];
  const arr: any[] = Array.isArray(section) ? section
    : Array.isArray(section.questions) ? section.questions
    : [];
  const out: PracticeQuestion[] = [];
  for (const item of arr) {
    const prompt = typeof item === 'string' ? item : (item?.question || item?.prompt);
    if (typeof prompt === 'string' && prompt.trim().length > 8) {
      out.push({ id: `prep-${category}-${out.length}`, prompt: prompt.trim(), category, source: 'prep' });
    }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    // Deterministic-enough shuffle seeded by index + a rotating salt; avoids
    // Math.random dependency concerns and is plenty for question order.
    const j = (i * 7 + a.length * 13 + 5) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GRADE_DIRECTIVE = (question: string, answer: string) =>
  `You are acting as a strict but supportive INTERVIEW COACH grading a mock-interview answer. ` +
  `Do NOT answer the question as the candidate. Evaluate the candidate's answer below.\n\n` +
  `QUESTION:\n${question}\n\n` +
  `CANDIDATE'S ANSWER:\n${answer}\n\n` +
  `Respond in plain readable prose (no JSON, no markdown symbols) in exactly this structure:\n` +
  `Score: N/100\n` +
  `What worked: two or three specific things the candidate did well.\n` +
  `What to improve: two or three specific, actionable fixes (structure, specificity, metrics, STAR, relevance).\n` +
  `Stronger version: a tight 4-6 sentence model answer in the FIRST PERSON, using the candidate's real background from the context provided.`;

export const PracticePanel = () => {
  const auth = useAuth() as any;
  const token: string | null = auth?.token || null;

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const [resumeContext, setResumeContext] = useState('');
  const [loadedFrom, setLoadedFrom] = useState<'prep+bank' | 'bank'>('bank');
  const abortRef = useRef<AbortController | null>(null);

  // Load prep-kit questions + résumé context once.
  useEffect(() => {
    let cancelled = false;
    const bank: PracticeQuestion[] = BANK.map((b, i) => ({ ...b, id: `bank-${i}`, source: 'bank' }));
    (async () => {
      let prep: PracticeQuestion[] = [];
      let resume = '';
      if (token) {
        try {
          const state: any = await prepAPI.getState(token);
          const data = state?.data || {};
          const companies = Object.values<any>(data);
          for (const doc of companies) {
            const secs = doc?.sections || {};
            prep = prep.concat(extractPrepQuestions(secs.behavioral, 'behavioral'));
            prep = prep.concat(extractPrepQuestions(secs.hr, 'hr'));
            prep = prep.concat(extractPrepQuestions(secs['system-design'], 'system-design'));
            if (typeof doc?.resume === 'string' && doc.resume.length > resume.length) resume = doc.resume;
          }
        } catch { /* no prep yet — bank only */ }
        try {
          const r: any = await profileAPI.getResume(token);
          const txt = [r?.resume_text, r?.technical_context].filter(Boolean).join('\n\n');
          if (txt.length > resume.length) resume = txt;
        } catch { /* no résumé — model answer will be generic */ }
      }
      if (cancelled) return;
      // De-dupe by prompt text; prep questions first, then bank to top up.
      const seen = new Set<string>();
      const merged: PracticeQuestion[] = [];
      for (const q of [...prep, ...bank]) {
        const k = q.prompt.trim().toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(q);
      }
      setQuestions(shuffle(merged));
      setResumeContext(resume);
      setLoadedFrom(prep.length > 0 ? 'prep+bank' : 'bank');
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const current = questions[idx] || null;

  const gradeAnswer = useCallback(async () => {
    if (!current || !token || !answer.trim() || grading) return;
    setGrading(true);
    setFeedback('');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamResponse({
        question: GRADE_DIRECTIVE(current.prompt, answer.trim()),
        token,
        systemContext: resumeContext
          ? `CANDIDATE BACKGROUND (use ONLY for the model answer, never invent):\n${resumeContext}`
          : 'No résumé on file — keep the model answer generic but strong.',
        mode: current.category === 'system-design' ? 'general' : 'behavioral',
        signal: ctrl.signal,
        onToken: (data: any) => {
          const t = typeof data === 'string' ? data : (data?.t ?? data?.token ?? data?.text ?? data?.content ?? '');
          if (t) setFeedback((prev) => prev + t);
        },
        onError: () => setFeedback((prev) => prev || 'Grading failed — please try again.'),
        onComplete: () => setGrading(false),
      } as any);
    } catch {
      setGrading(false);
      setFeedback((prev) => prev || 'Grading failed — please try again.');
    } finally {
      setGrading(false);
    }
  }, [current, token, answer, resumeContext, grading]);

  const nextQuestion = useCallback(() => {
    abortRef.current?.abort();
    setGrading(false);
    setAnswer('');
    setFeedback('');
    setIdx((i) => (questions.length ? (i + 1) % questions.length : 0));
  }, [questions.length]);

  const scoreMatch = useMemo(() => feedback.match(/score:\s*(\d{1,3})\s*\/\s*100/i), [feedback]);
  const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : null;
  const scoreHue = score == null ? 'var(--text-muted)' : score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex-1 flex flex-col min-h-0 absolute inset-0" style={{ background: 'var(--bg-app)' }}>
      {/* Hero */}
      <div className="px-6 py-4 shrink-0" style={{ background: 'var(--cam-hero-strip)', borderBottom: '3px solid var(--cam-gold-leaf)' }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] mb-0.5" style={{ color: 'var(--cam-gold-leaf-lt, var(--cam-gold-leaf))', fontFamily: 'var(--font-mono)' }}>
          Practice · Sona quizzes you
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--cam-strip-heading, #fff)' }}>Mock Practice</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--cam-strip-text, rgba(255,255,255,0.82))' }}>
          Answer out loud or type, then get scored against your résumé. {loadedFrom === 'prep+bank' ? 'Questions include your prep kit.' : 'Generate a prep kit to practice your company-specific questions.'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-5">
          {current ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--accent-subtle, rgba(0,71,171,0.12))', color: 'var(--accent, var(--cam-primary))' }}>
                  {current.category.replace('-', ' ')}
                </span>
                {current.source === 'prep' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(212,160,67,0.15)', color: 'var(--cam-gold-leaf)' }}>from your prep kit</span>
                )}
                <span className="flex-1" />
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{idx + 1} / {questions.length}</span>
              </div>

              {/* Question */}
              <div className="rounded-xl px-5 py-4 mb-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'inset 0 -3px 0 var(--cam-gold-leaf)' }}>
                <p className="text-base font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>{current.prompt}</p>
              </div>

              {/* Answer */}
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here (or speak it, then paste). Aim for STAR: situation, task, action, result — end with a metric."
                rows={6}
                className="w-full rounded-lg px-3 py-2.5 text-sm resize-y"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={gradeAnswer}
                  disabled={!answer.trim() || grading}
                  className="px-4 py-2 rounded-lg font-bold text-sm transition-transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--cam-primary-dk)', color: '#fff' }}
                >
                  {grading ? 'Grading…' : 'Grade my answer'}
                </button>
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {feedback ? 'Next question' : 'Skip'}
                </button>
                {score != null && (
                  <span className="ml-auto text-2xl font-bold" style={{ color: scoreHue }}>{score}<span className="text-sm opacity-60">/100</span></span>
                )}
              </div>

              {/* Feedback */}
              {feedback && (
                <div className="rounded-xl px-5 py-4 mt-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--cam-gold-leaf)' }}>Coach feedback</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{feedback}</p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl px-6 py-12 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Loading practice questions…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
