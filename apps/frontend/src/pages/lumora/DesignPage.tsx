import { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DesignLayout } from '../../components/lumora/design/DesignLayout';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';

function DesignPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialProblem = searchParams.get('problem') || '';

  return (
    <DesignLayout
      onBack={() => navigate('/lumora')}
      initialProblem={initialProblem}
    />
  );
}

export function DesignPage() {
  return (
    <PaywallGate feature="System Design">
      <ErrorBoundary>
        <Suspense>
          <DesignPageContent />
        </Suspense>
      </ErrorBoundary>
    </PaywallGate>
  );
}

export default DesignPage;
