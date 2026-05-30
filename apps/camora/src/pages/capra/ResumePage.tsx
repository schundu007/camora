import { useSearchParams } from 'react-router-dom';
import ResumeOptimizerBase from '../../components/capra/features/ResumeOptimizer';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResumeOptimizer = ResumeOptimizerBase as any;
import { HeroBand, HeroAccent } from '../../components/capra/ui';

export default function ResumePage() {
  const [params] = useSearchParams();
  const company = params.get('company') || undefined;
  const role = params.get('role') || undefined;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero band — shared HeroBand primitive matches every Capra surface */}
      <HeroBand
        eyebrow="AI-Powered"
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
