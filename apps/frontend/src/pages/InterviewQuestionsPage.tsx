import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import SiteNav from '@/components/shared/SiteNav';
import SEO from '@/components/shared/SEO';
import SiteFooter from '@/components/shared/SiteFooter';
import { COMPANY_SEO_DATA, COMPANY_SLUGS } from '@/data/capra/companies/companyData';

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  coding: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Coding' },
  'system-design': { bg: 'bg-purple-50', text: 'text-purple-700', label: 'System Design' },
  behavioral: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Behavioral' },
};

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Medium: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  Hard: { bg: 'bg-red-50', text: 'text-red-700' },
};

function getRelatedCompanies(currentSlug: string, count = 4): string[] {
  const others = COMPANY_SLUGS.filter((s) => s !== currentSlug);
  const shuffled = others.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function InterviewQuestionsPage() {
  const { company: slug } = useParams<{ company: string }>();
  const company = slug ? COMPANY_SEO_DATA[slug] : undefined;
  const related = useMemo(() => getRelatedCompanies(slug ?? ''), [slug]);

  useEffect(() => {
    if (!company) return;
    document.title = `${company.name} Interview Questions 2026 | Camora`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        `Practice ${company.name} interview questions. ${company.description} Prepare with real coding, system design, and behavioral questions.`,
      );
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = `Practice ${company.name} interview questions. ${company.description}`;
      document.head.appendChild(newMeta);
    }
    return () => {
      document.title = 'Camora';
    };
  }, [company]);

  if (!company) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)]">
        <SiteNav />
        <div className="pt-20 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Company not found</h1>
          <p className="mt-2 text-[var(--text-muted)]">We don't have interview data for this company yet.</p>
          <Link to="/" className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-medium">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const diffColor = DIFF_COLORS[company.difficulty] ?? DIFF_COLORS.Medium;

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      <SiteNav />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pt-24 pb-12 px-4" style={{ background: 'linear-gradient(135deg, rgba(178,235,242,0.3) 0%, rgba(179,198,231,0.3) 50%, rgba(197,179,227,0.3) 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <img src={company.logo} alt={`${company.name} logo`} className="w-16 h-16 rounded-xl object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {company.name} Interview Questions
          </h1>
          <p className="mt-2 text-lg text-[var(--text-secondary)]">{company.tagline}</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${diffColor.bg} ${diffColor.text}`}>
              {company.difficulty}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              {company.avgSalary}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              {company.interviewRounds} rounds
            </span>
          </div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-12">

        {/* Description */}
        <section>
          <p className="text-[var(--text-secondary)] leading-relaxed">{company.description}</p>
        </section>

        {/* Interview Process */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5">Interview Process</h2>
          <ol className="space-y-3">
            {company.interviewProcess.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[var(--text-secondary)] pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Sample Questions */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5">Sample Interview Questions</h2>
          <div className="space-y-3">
            {company.sampleQuestions.map((question, i) => {
              const typeStyle = TYPE_COLORS[question.type] ?? TYPE_COLORS.coding;
              const qDiffColor = DIFF_COLORS[question.difficulty] ?? DIFF_COLORS.Medium;
              const isBlurred = i >= 3;

              return (
                <div
                  key={i}
                  className={`relative bg-[var(--bg-surface)] border-0 rounded-xl p-5 shadow-[0_4px_24px_rgba(118,185,0,0.12)] ${isBlurred ? 'select-none' : ''}`}
                >
                  {isBlurred && (
                    <div className="absolute inset-0 backdrop-blur-sm bg-[var(--bg-surface)]/60 rounded-xl z-10 flex items-center justify-center">
                      <Link
                        to="/signup"
                        className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        Sign up to see all questions
                      </Link>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                      {typeStyle.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${qDiffColor.bg} ${qDiffColor.text}`}>
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)] font-medium">{question.q}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tips */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5">Interview Tips</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {company.tips.map((tip, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border-0 rounded-xl p-5 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 text-sm font-bold mb-3">
                  {i + 1}
                </span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-[var(--bg-surface)] border-0 rounded-2xl p-8 shadow-[0_4px_24px_rgba(118,185,0,0.12)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Start preparing for {company.name} interviews
          </h2>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            Practice with AI-powered mock interviews, coding problems, and system design exercises.
          </p>
          <Link
            to="/signup"
            className="mt-5 inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Get started free
          </Link>
        </section>

        {/* Related Companies */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-5">Explore Other Companies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {related.map((relSlug) => {
              const rel = COMPANY_SEO_DATA[relSlug];
              if (!rel) return null;
              return (
                <Link
                  key={relSlug}
                  to={`/interview-questions/${relSlug}`}
                  className="bg-[var(--bg-surface)] border-0 rounded-xl p-4 text-center shadow-[0_4px_24px_rgba(118,185,0,0.12)] hover:shadow-[0_20px_60px_rgba(118,185,0,0.28)] transition-all"
                >
                  <img src={rel.logo} alt={rel.name} className="w-10 h-10 rounded-lg object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">{rel.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{rel.difficulty} &middot; {rel.interviewRounds} rounds</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
