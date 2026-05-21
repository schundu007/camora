import { Suspense, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodingLayout } from '../../components/lumora/coding/CodingLayout';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';
import { useStreamingSession } from '../../hooks/useStreamingSession';

const CodingPageContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCodingSubmit, isStreaming } = useStreamingSession();

  const initialProblem = searchParams.get('problem') || '';
  const initialUrl = searchParams.get('url') || '';

  return (
    <CodingLayout
      onSubmit={handleCodingSubmit}
      isLoading={isStreaming}
      onBack={() => navigate('/lumora')}
      initialProblem={initialProblem}
      initialUrl={initialUrl}
    />
  );
}

export const CodingPage = () => {
  useEffect(() => {
    document.title = 'Coding Interview | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

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
