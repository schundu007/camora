import { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodingLayout } from '../../components/lumora/coding/CodingLayout';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';

function CodingPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCodingSubmit, isStreaming } = useStreamingInterview();

  const initialProblem = searchParams.get('problem') || '';

  return (
    <CodingLayout
      onSubmit={handleCodingSubmit}
      isLoading={isStreaming}
      onBack={() => navigate('/app')}
      initialProblem={initialProblem}
    />
  );
}

export function CodingPage() {
  return (
    <PaywallGate feature="Coding Solutions">
      <ErrorBoundary>
        <Suspense>
          <CodingPageContent />
        </Suspense>
      </ErrorBoundary>
    </PaywallGate>
  );
}

export default CodingPage;
