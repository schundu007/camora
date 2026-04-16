import { useSearchParams } from 'react-router-dom';
import ResumeOptimizer from '../../components/capra/features/ResumeOptimizer';

export default function ResumePage() {
  const [params] = useSearchParams();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ResumeOptimizer
        initialCompany={params.get('company') || undefined}
        initialRole={params.get('role') || undefined}
        initialJobDescription={params.get('jd') || undefined}
        initialJobUrl={params.get('url') || undefined}
      />
    </div>
  );
}
