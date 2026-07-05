import { useSearchParams, useNavigate } from 'react-router-dom';
import ResumeOptimizerBase from '../../components/capra/features/ResumeOptimizer';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResumeOptimizer = ResumeOptimizerBase as any;
import { HeroBand, HeroAccent } from '../../components/capra/ui';

export default function ResumePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const company = params.get('company') || undefined;
  const role = params.get('role') || undefined;

  // Prefer going back to where the user came from; fall back to the prep
  // hub if this was a direct/deep link (history has no in-app entry).
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/capra/prepare');
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero band — shared HeroBand primitive matches every Capra surface */}
      <HeroBand
        title={
          <>
            Resume <HeroAccent>Optimizer</HeroAccent>
            {company && <HeroAccent> for {company}</HeroAccent>}
          </>
        }
        subtitle={
          role
            ? `Tailor your resume for the ${role} position. AI-optimized for ATS systems and hiring managers.`
            : 'Optimize your resume, generate cover letters, and score ATS compatibility — all powered by AI.'
        }
        actions={null}
      />

      {/* Optimizer component */}
      <div className="page-wrap pt-6 pb-16">
        {/* In-page Back — independent of the global header Back so the user
            can return to the prep flow from inside the optimizer. */}
        <button
          type="button"
          onClick={goBack}
          className="btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <ResumeOptimizer
          initialCompany={company}
          initialRole={role}
          initialJobDescription={params.get('jd') || undefined}
          initialJobUrl={params.get('url') || undefined}
        />
      </div>
    </div>
  );
}
